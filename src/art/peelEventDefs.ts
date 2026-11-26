// The event peels' medallions (src/art/peelMedal.ts): each wave event in miniature, doing what it does on the table,
// and its answer to a smack. Painted in parts once per rig detail (disc units: a 120 × 120 square, centre (60, 60)),
// lit from the top left; drawn each frame from those parts, with strings, cables and trails drawn live.
//
// - Tip Balloon: bobs on its string in a summer sky, clouds drifting behind; its coin glints. Smack: it pops (shreds
//   of rubber, a spray of tip coins), the string drops, and a new one blows up from the knot.
// - Delivery Drone: hovers over the rooftops, rotors a blur, its parcel swinging on its cables as it drifts, its
//   light blinking. Smack: it lurches (sparks, a puff from a motor, the light goes red), the parcel swings wide.
// - Pepper Moth: flutters round a hanging lamp at dusk, wings beating, shedding pepper. Smack: swatted, it tumbles
//   away in a cloud of pepper and flutters back; the lamp swings.
// - Golden Seagull: wheels over the sea with a golden crust in its beak, flapping and gliding; the sea glitters.
//   Smack: it squawks and jolts, feathers fly, the crust flashes.
// - Pizza Box Chest: sits on the table; now and then its lid lifts a crack and gold light leaks out. Smack: it
//   bursts open (rays of gold, tip coins, confetti) and drops shut.
// - Mimic: a box that wobbles; its lid creaks open on two eyes and a tongue licks the rim. Smack: it chomps (teeth,
//   tongue, a red flare) and snaps shut.
// - Hero Sighting: a hero streaks across the night sky past a gold star, a trail of light behind. Smack: caught, the
//   star flares and the hero zooms through.
// - Charybdis: the whirlpool turns, foam spiralling in, the maw breathing; now and then a plank is dragged down. Smack:
//   the maw clamps shut, the water spins and spray flies.

import { ellipse, rgba, rng, roundRect, shade, type Ctx } from './util';
import { INK } from './feetCommon';
import { flyer } from '../content/props/heroes';
import { part, placePart, star, type MedalEmit, type MedalState, type Part, type Parts } from './peelMedal';

export interface EventScene {
  /** The bezel's metal. */
  bezel: string;
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

/** A soft cloud: a cluster of lit puffs, the underside shaded. */
function cloud(ctx: Ctx, x: number, y: number, w: number, h: number, seed: number, a = 1, shadow = '#9cb4cc'): void {
  const r = rng(seed);
  const puffs: [number, number, number][] = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const px = x - w / 2 + u * w + (r() - 0.5) * w * 0.1;
    const top = Math.sin(Math.PI * u);
    puffs.push([px, y - top * h * 0.35 + (r() - 0.5) * 2, h * (0.32 + 0.3 * top + r() * 0.1)]);
  }
  // the shaded underside first, then the lit body over it, then the top's light
  for (const [px, py, pr] of puffs) dab(ctx, px + 1.2, py + pr * 0.35, pr * 1.05, shadow, 0.55 * a);
  for (const [px, py, pr] of puffs) dab(ctx, px, py, pr, '#ffffff', 0.9 * a);
  for (const [px, py, pr] of puffs) dab(ctx, px - pr * 0.25, py - pr * 0.3, pr * 0.6, '#ffffff', 0.5 * a);
}

const full = (px: number, draw: (ctx: Ctx) => void): Part => part(px, 0, 0, 120, 120, draw);

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

// ════════════════════════════ skies ════════════════════════════

function sky(ctx: Ctx, stops: [number, string][], sun: string | null, sunA = 0.8): void {
  ctx.fillStyle = lin(ctx, 0, 0, 0, 120, stops);
  ctx.fillRect(0, 0, 120, 120);
  if (sun) {
    dab(ctx, 18, 12, 70, sun, sunA * 0.45);
    dab(ctx, 18, 12, 30, sun, sunA);
  }
}

// ════════════════════════════ the Tip Balloon ════════════════════════════

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

/** The balloon's size in the medallion. */
const BAL = 1.18;

const balloon: EventScene = {
  bezel: '#d4dae2',
  *paint(px) {
    const bg = full(px, (ctx) => {
      sky(ctx, [[0, '#5aa8e2'], [0.55, '#9ed2f4'], [1, '#e2f3ff']], '#fff4d0');
      cloud(ctx, 24, 106, 60, 22, 3, 0.9);
      cloud(ctx, 98, 110, 70, 24, 4, 0.9);
    });
    yield;
    const cloudA = part(px, -26, -12, 52, 24, (ctx) => cloud(ctx, 0, 2, 44, 16, 11, 0.8));
    const cloudB = part(px, -20, -9, 40, 18, (ctx) => cloud(ctx, 0, 2, 32, 12, 12, 0.7));
    yield;
    const body = part(px, -30, -35, 60, 76, paintBalloon);
    return { bg, cloudA, cloudB, body };
  },
  update() {},
  draw(g, s, P) {
    const t = s.t;
    placePart(g, P.bg, 0, 0);
    // clouds drifting by behind it
    const ca = ((t * 2.2 + 30) % 170) - 25;
    const cb = ((t * 1.4 + 120) % 160) - 20;
    placePart(g, P.cloudA, ca, 34);
    placePart(g, P.cloudB, cb, 62);
    const sm = s.still ? 9 : s.sm;
    // bobbing and swaying on the breeze
    const bx = 60 + 3 * Math.sin(t * 0.53);
    const by = 46 + 3.2 * Math.sin(t * 1.3);
    const rot = 0.07 * Math.sin(t * 0.9 + 0.4) + 0.03 * Math.sin(t * 2.1);
    const sy = 1 + 0.025 * Math.cos(t * 1.3);
    // popped: gone, then a new one blowing up from the knot
    const gone = sm < 0.42;
    const grow = sm < 0.42 ? 0 : sm < 0.95 ? (sm - 0.42) / 0.53 : 1;
    const sc = grow >= 1 ? 1 : smooth(grow) * (1 + 0.14 * Math.sin(grow * Math.PI));
    // the string: from the knot, swaying, down out of the window (dropping away after a pop)
    const kx = bx + Math.sin(rot) * -36 * BAL * sc;
    const ky = by + Math.cos(rot) * 36 * BAL * sc + (1 - sc) * 22;
    const drop = gone ? sm * 30 + sm * sm * 380 : 0;
    const sa = gone ? Math.max(0, 1 - sm * 2.6) : 1;
    if (sa > 0.01) {
      g.globalAlpha = sa;
      g.beginPath();
      g.moveTo(kx, ky + drop);
      const sw = Math.sin(t * 1.7) * 6;
      g.bezierCurveTo(kx - 6 + sw, ky + 26 + drop, kx + 8 - sw, ky + 48 + drop, kx + 2 + sw * 0.5, 126 + drop);
      g.strokeStyle = 'rgba(70,48,36,0.95)';
      g.lineWidth = 1.5;
      g.stroke();
      g.strokeStyle = 'rgba(255,246,230,0.5)';
      g.lineWidth = 0.5;
      g.stroke();
      g.globalAlpha = 1;
    }
    if (!gone && sc > 0.02) {
      g.save();
      g.translate(bx, by + (1 - sc) * 22);
      g.rotate(rot);
      g.scale(BAL * sc * (2 - sy), BAL * sc * sy);
      placePart(g, P.body, 0, 0);
      g.restore();
      // the coin's glint now and then
      const gp = (t * 0.29) % 1;
      if (gp < 0.1 && sc >= 1) star(g, bx - 6, by - 4, 6 * Math.sin((gp / 0.1) * Math.PI), Math.sin((gp / 0.1) * Math.PI));
    }
    // the pop: a ring of light
    if (sm < 0.28) {
      const u = sm / 0.28;
      const rr = 16 + u * 50;
      // a red puff where the skin was, then a ring of light running out
      const pg = g.createRadialGradient(bx, by, 0, bx, by, 30 * (0.6 + u));
      pg.addColorStop(0, `rgba(255,120,90,${(0.55 * (1 - u)).toFixed(3)})`);
      pg.addColorStop(1, 'rgba(255,90,60,0)');
      g.fillStyle = pg;
      g.fillRect(bx - 50, by - 50, 100, 100);
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
    const t = s.t;
    const bx = 60 + 3 * Math.sin(t * 0.53);
    const by = 46 + 3.2 * Math.sin(t * 1.3);
    const m = s.menu ? 0.6 : 1;
    s.flash('#fff0e6', 0.3, 0.3);
    s.shake(1.2);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + s.r() * 0.6;
      const sp = (140 + s.r() * 120) * m;
      emit('shred', bx + Math.cos(a) * 20, by + Math.sin(a) * 24, Math.cos(a) * sp, Math.sin(a) * sp - 40, 13 + s.r() * 4, 10, 0.45 + s.r() * 0.25, { grav: 260, drag: 1.4, spin: (s.r() - 0.5) * 18 });
    }
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (s.r() - 0.5) * 1.8;
      const sp = (150 + s.r() * 120) * m;
      emit('coin', bx + (s.r() - 0.5) * 12, by, Math.cos(a) * sp, Math.sin(a) * sp, 13 + s.r() * 3, 13, 0.6 + s.r() * 0.25, { grav: 520, spin: (s.r() - 0.5) * 10 });
    }
    for (let i = 0; i < 6; i++) {
      const a = s.r() * TAU;
      s.dots.spawn('spark', bx + Math.cos(a) * 10, by + Math.sin(a) * 12, Math.cos(a) * 70, Math.sin(a) * 70, 8, 3, 0.35, { drag: 3, add: true });
    }
  },
};

// ════════════════════════════ the Delivery Drone ════════════════════════════

function paintRooftops(ctx: Ctx): void {
  const r = rng(21);
  // far roofs, hazy
  ctx.fillStyle = '#a9bccc';
  let x = -4;
  while (x < 124) {
    const w = 10 + r() * 14;
    const h = 14 + r() * 16;
    ctx.fillRect(x, 120 - h - 8, w + 0.5, h + 10);
    x += w;
  }
  // near roofs, a water tower on one
  const near = ['#7f93a8', '#73879c', '#8698ac'];
  x = -6;
  let i = 0;
  while (x < 126) {
    const w = 16 + r() * 18;
    const h = 8 + r() * 12;
    const top = 120 - h;
    ctx.fillStyle = lin(ctx, 0, top, 0, 120, [[0, near[i % 3]], [1, shade(near[i % 3], -0.3)]]);
    ctx.fillRect(x, top, w + 0.5, h);
    ctx.fillStyle = 'rgba(255,240,220,0.35)';
    ctx.fillRect(x, top, w + 0.5, 1.1);
    // a few windows lit
    for (let k = 0; k < 3; k++) if (r() < 0.4) {
      ctx.fillStyle = 'rgba(255,226,150,0.55)';
      ctx.fillRect(x + 3 + r() * (w - 7), top + 4 + r() * (h - 6), 2.2, 2.6);
    }
    if (i === 2) {
      ctx.fillStyle = '#5f6f80';
      ctx.fillRect(x + 4, top - 7, 1.4, 7);
      ctx.fillRect(x + 11, top - 7, 1.4, 7);
      roundRect(ctx, x + 2.5, top - 17, 11, 11, 2);
      fs(ctx, lin(ctx, x + 2, 0, x + 14, 0, [[0, '#8a7a6a'], [1, '#5a4a3e']]), 0);
      ctx.beginPath();
      ctx.moveTo(x + 1.5, top - 17);
      ctx.lineTo(x + 8, top - 22);
      ctx.lineTo(x + 14.5, top - 17);
      ctx.closePath();
      ctx.fillStyle = '#4e4036';
      ctx.fill();
    }
    x += w;
    i++;
  }
}

/** The drone's arms reach this far each side (disc units, before it's scaled up). */
const ARM = 31;
const DRONE = 1.16;

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

const drone: EventScene = {
  bezel: '#8e9aaa',
  *paint(px) {
    const bg = full(px, (ctx) => {
      sky(ctx, [[0, '#6eaee0'], [0.6, '#b4daf2'], [1, '#f4dcc0']], '#fff2d6', 0.7);
      cloud(ctx, 92, 30, 40, 13, 5, 0.6);
      paintRooftops(ctx);
    });
    yield;
    const body = part(px * DRONE, -ARM - 8, -16, ARM * 2 + 16, 28, paintDrone);
    const rotors = [0, 1, 2].map((i) => part(px * DRONE, -19, -6, 38, 12, (ctx) => paintRotor(ctx, i)));
    yield;
    const parcel = part(px * DRONE, -18, -2, 36, 34, paintParcel);
    return { bg, body, parcel, r0: rotors[0], r1: rotors[1], r2: rotors[2] };
  },
  update(s, dt) {
    const m = s.mem;
    // the parcel on its cables: a pendulum, pushed by the drone's drift
    const ax = -1.44 * 4 * Math.sin(s.t * 0.6);
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
    placePart(g, P.bg, 0, 0);
    const x = 60 + 4 * Math.sin(t * 0.6);
    const y = 42 + 2.2 * Math.sin(t * 2.3) + (m.dip ?? 0);
    const rot = 0.06 * Math.sin(t * 0.6 + 1.2) + (m.tilt ?? 0);
    const th = s.still ? 0.05 : m.th ?? 0;
    // its shadow far below on the roofs
    ellipse(g, x + 4, 112, 22, 2.6);
    g.fillStyle = 'rgba(30,40,60,0.16)';
    g.fill();
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(DRONE, DRONE);
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
    m.tiltv = (m.tiltv ?? 0) + dir * 5.5 * s.calm;
    m.dipv = (m.dipv ?? 0) + 90 * s.calm;
    m.thv = (m.thv ?? 0) - dir * 7 * s.calm;
    s.flash('#e8fbff', 0.25, 0.3);
    s.shake(1);
    const t = s.t;
    const x = 60 + 4 * Math.sin(t * 0.6);
    const y = 40 + 2.2 * Math.sin(t * 2.3);
    const mm = s.menu ? 0.6 : 1;
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (s.r() - 0.5) * 2.8;
      const sp = (140 + s.r() * 140) * mm;
      emit('sparkN', x + Math.cos(a) * 12, y + Math.sin(a) * 6, Math.cos(a) * sp, Math.sin(a) * sp - 30, 16 + s.r() * 6, 10, 0.3 + s.r() * 0.2, { grav: 500, fin: 0.01 });
    }
    emit('smoke', x + dir * ARM * DRONE, y - 8, dir * 30 * mm, -50 * mm, 10, s.menu ? 26 : 38, 0.6, { drag: 1.6, a: 0.75 });
  },
};

// ════════════════════════════ the Pepper Moth ════════════════════════════

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

function paintLamp(ctx: Ctx): void {
  // hanging from its cord at (0, 0): a brass cap and a glowing bulb
  roundRect(ctx, -4.5, 0, 9, 7, 1.5);
  fs(ctx, lin(ctx, -4.5, 0, 4.5, 0, [[0, '#f0d08a'], [0.5, '#b08a3a'], [1, '#6a4a1a']]), 1.5);
  ctx.beginPath();
  ctx.moveTo(-5, 7);
  ctx.bezierCurveTo(-11, 12, -10, 23, 0, 24);
  ctx.bezierCurveTo(10, 23, 11, 12, 5, 7);
  ctx.closePath();
  const g = ctx.createRadialGradient(-1, 14, 0, 0, 15, 11);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, '#fff6c8');
  g.addColorStop(1, '#ffd070');
  fs(ctx, g, 1.4);
  ctx.beginPath();
  ctx.moveTo(-2.5, 11);
  ctx.quadraticCurveTo(0, 18, 2.5, 11);
  ink(ctx, 0.9, 'rgba(200,120,30,0.9)');
  spec(ctx, -4, 12, 1.6, 3.6, 0.2, 0.9);
}

/** The moth's path round the lamp (disc units). */
function mothAt(t: number): [number, number, number] {
  const x = 64 + 22 * Math.sin(t * 1.25);
  const y = 66 + 12 * Math.sin(t * 2.1 + 0.7);
  const vx = 22 * 1.25 * Math.cos(t * 1.25);
  return [x, y, clamp(vx * 0.012, -0.4, 0.4)];
}

const moth: EventScene = {
  bezel: '#b8924e',
  *paint(px) {
    const bg = full(px, (ctx) => {
      sky(ctx, [[0, '#2e2a5e'], [0.55, '#5a4680'], [1, '#8a5470']], null);
      // the lamp's light on the dusk, and dark leaves at the foot
      dab(ctx, 34, 30, 90, '#ffcf7a', 0.42);
      dab(ctx, 34, 30, 40, '#ffe0a0', 0.3);
      // the garden below in shadow, fading up into the dusk
      ctx.fillStyle = lin(ctx, 0, 92, 0, 120, [[0, 'rgba(24,18,40,0)'], [0.5, 'rgba(24,18,40,0.55)'], [1, 'rgba(18,12,30,0.85)']]);
      ctx.fillRect(0, 92, 120, 28);
    });
    yield;
    const wingR = part(px, -2, -22, 36, 56, paintMothWing);
    const wingL = part(px, -34, -22, 36, 56, (ctx) => {
      ctx.scale(-1, 1);
      paintMothWing(ctx);
    });
    yield;
    const body = part(px, -12, -24, 24, 40, paintMothBody);
    const lamp = part(px, -12, -1, 24, 27, paintLamp);
    return { bg, wingL, wingR, body, lamp };
  },
  update(s, dt) {
    const m = s.mem;
    spring(s, 'kx', 0, 30, 4, dt);
    spring(s, 'ky', 0, 30, 4, dt);
    spring(s, 'lamp', 0, 18, 1.2, dt);
    m.spin = (m.spin ?? 0) * Math.exp(-dt / 0.35);
    m.ang = ((m.ang ?? 0) + (m.spin ?? 0) * dt) % TAU;
    // pepper shaken off its wings
    m.pep = (m.pep ?? 0) + dt;
    if (m.pep > 0.32 && !s.still) {
      m.pep = 0;
      const [x, y] = mothAt(s.t);
      s.dots.spawn('pepper', x + (s.r() - 0.5) * 18, y + 4, (s.r() - 0.5) * 8, 10 + s.r() * 8, 2.6 + s.r(), 2.2, 1.4, { grav: 4, a: 0.9, spin: (s.r() - 0.5) * 6 });
    }
  },
  draw(g, s, P) {
    const t = s.t;
    const m = s.mem;
    placePart(g, P.bg, 0, 0);
    // the lamp on its cord, swinging when knocked, its glow breathing
    const la = (m.lamp ?? 0) + 0.04 * Math.sin(t * 0.9);
    const cx = 34;
    const cy = -2;
    const L = 26;
    const lx = cx + Math.sin(la) * L;
    const ly = cy + Math.cos(la) * L;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(lx, ly);
    g.strokeStyle = '#1a1208';
    g.lineWidth = 1.4;
    g.stroke();
    const fl = 0.85 + 0.1 * Math.sin(t * 13) * Math.sin(t * 7.3) + 0.3 * s.hit(0.3);
    g.save();
    g.globalCompositeOperation = 'lighter';
    const gx = lx + Math.sin(la) * 15;
    const gy = ly + Math.cos(la) * 15;
    const lg = g.createRadialGradient(gx, gy, 0, gx, gy, 46);
    lg.addColorStop(0, `rgba(255,214,130,${(0.5 * fl).toFixed(3)})`);
    lg.addColorStop(0.35, `rgba(255,170,80,${(0.18 * fl).toFixed(3)})`);
    lg.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = lg;
    g.fillRect(gx - 46, gy - 46, 92, 92);
    g.restore();
    placePart(g, P.lamp, lx, ly, -la);
    // the moth: round the lamp, wings beating (frantic after a swat), tumbling when knocked
    let [x, y, rot] = mothAt(t);
    if (s.still) [x, y, rot] = [74, 66, 0.15];
    x += m.kx ?? 0;
    y += m.ky ?? 0;
    rot += m.ang ?? 0;
    const hz = 3.4 * (1 + 1.2 * s.hit(0.9));
    const ph = t * TAU * hz;
    const open = s.still ? 1 : 0.5 + 0.5 * Math.cos(ph);
    const wsx = 0.22 + 0.78 * open;
    y += s.still ? 0 : 1.2 * Math.sin(ph);
    // its shadow? (it's flying: a faint warm rim of the lamp's light on its wings is in the paint)
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(1.06, 1.06);
    placePart(g, P.wingL, 0, 0, 0, wsx, 1);
    placePart(g, P.wingR, 0, 0, 0, wsx, 1);
    // the wings darken as they fold up away from the light
    placePart(g, P.body, 0, 0);
    g.restore();
  },
  smack(s, emit) {
    const m = s.mem;
    const [x, y] = mothAt(s.t);
    const dir = x < 64 ? -1 : 1;
    m.kxv = (m.kxv ?? 0) + dir * 150 * s.calm;
    m.kyv = (m.kyv ?? 0) + 110 * s.calm;
    m.spin = (m.spin ?? 0) + dir * 16 * s.calm;
    m.lampv = (m.lampv ?? 0) + 2.4 * s.calm;
    s.flash('#ffe8b0', 0.25, 0.3);
    s.shake(1);
    const mm = s.menu ? 0.6 : 1;
    for (let i = 0; i < 12; i++) {
      const a = s.r() * TAU;
      const sp = 20 + s.r() * 50;
      s.dots.spawn('pepper', x + Math.cos(a) * 6, y + Math.sin(a) * 6, Math.cos(a) * sp, Math.sin(a) * sp, 2.6 + s.r() * 1.4, 2, 1 + s.r() * 0.6, { grav: 20, drag: 1.5, spin: (s.r() - 0.5) * 10 });
    }
    for (let i = 0; i < 5; i++) {
      const a = s.r() * TAU;
      const sp = (90 + s.r() * 90) * mm;
      emit('pepper', x + Math.cos(a) * 10, y + Math.sin(a) * 10, Math.cos(a) * sp, Math.sin(a) * sp, 6, 5, 0.5 + s.r() * 0.3, { grav: 200, drag: 1 });
    }
    emit('smoke', x, y, dir * 30 * mm, -20, 12, s.menu ? 26 : 40, 0.55, { drag: 2, a: 0.6 });
  },
};

// ════════════════════════════ the Golden Seagull ════════════════════════════

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
  ctx.moveTo(21.5, -3);
  ctx.lineTo(35, -10);
  ctx.quadraticCurveTo(38.5, -2, 34, 6);
  ctx.closePath();
  fs(ctx, lit(ctx, 30, -3, 9, '#ffd23f', 0.65, -0.3), 1.4);
  ctx.beginPath();
  ctx.moveTo(35, -10);
  ctx.quadraticCurveTo(38.5, -2, 34, 6);
  ink(ctx, 3.4, '#c8781a');
  ctx.beginPath();
  ctx.moveTo(35.4, -8.6);
  ctx.quadraticCurveTo(37.6, -3, 35, 3);
  ink(ctx, 1, '#ffe8a0');
  // its crumb: a few pits baked into the gold
  for (const [cx, cy] of [[27, -3], [30.5, 1], [31, -6]] as const) {
    ellipse(ctx, cx, cy, 0.9, 0.7);
    fs(ctx, 'rgba(168,100,12,0.8)', 0);
  }
  spec(ctx, 28.5, -4, 1.6, 3, 0.4, 0.95);
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

const GULL = 1.3;

/** The gull's flight: wheeling over the sea, flapping in bursts and gliding between. */
function gullAt(t: number): [number, number] {
  return [58 + 14 * Math.sin(t * 0.55), 46 + 7 * Math.sin(t * 1.1)];
}

const seagull: EventScene = {
  bezel: '#e2b232',
  *paint(px) {
    const bg = full(px, (ctx) => {
      sky(ctx, [[0, '#6ab8ea'], [0.62, '#c4e6f8'], [0.72, '#e8f6ff'], [0.72, '#5ab4cc'], [1, '#1e6888']], '#fff2c8');
      // a headland on the horizon, hazy
      ctx.beginPath();
      ctx.moveTo(78, 86.4);
      ctx.quadraticCurveTo(92, 78, 104, 80);
      ctx.quadraticCurveTo(114, 82, 124, 79);
      ctx.lineTo(124, 86.4);
      ctx.closePath();
      ctx.fillStyle = 'rgba(90,130,160,0.55)';
      ctx.fill();
      // the sea: swell lines, the sun's path
      const r = rng(17);
      for (let i = 0; i < 22; i++) {
        const y = 89 + Math.pow(r(), 1.4) * 30;
        const x = r() * 120;
        const w = 3 + (y - 86) * 0.35;
        ctx.beginPath();
        ctx.moveTo(x - w, y);
        ctx.quadraticCurveTo(x, y - 1, x + w, y);
        ctx.strokeStyle = `rgba(230,250,255,${(0.18 + r() * 0.2).toFixed(3)})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      dab(ctx, 22, 96, 24, '#fff6d8', 0.28, 0.4);
    });
    yield;
    const wingNear = part(px * GULL, -4, -20, 48, 28, (ctx) => paintGullWing(ctx, false));
    const wingFar = part(px * GULL, -4, -20, 48, 28, (ctx) => paintGullWing(ctx, true));
    yield;
    const body = part(px * GULL, -24, -14, 64, 26, paintGullBody);
    return { bg, wingNear, wingFar, body };
  },
  update(s, dt) {
    spring(s, 'jy', 0, 90, 8, dt);
  },
  draw(g, s, P) {
    const t = s.t;
    placePart(g, P.bg, 0, 0);
    // the sea glitters under the sun
    if (!s.still)
      for (let i = 0; i < 6; i++) {
        const ph = (t * 0.8 + i * 0.37) % 1;
        const a = Math.sin(ph * Math.PI);
        const gx = 14 + ((i * 37) % 23) + Math.sin(i * 3.1) * 4;
        const gy = 90 + ((i * 13) % 20);
        star(g, gx, gy, 2.6 * a, 0.9 * a);
      }
    let [x, y] = gullAt(t);
    if (s.still) [x, y] = [56, 46];
    y += s.mem.jy ?? 0;
    // flaps in bursts of three beats, then a glide with its wings held up
    const cyc = (t % 2.4) / 2.4;
    const fast = s.hit(0.9);
    const flapping = cyc < 0.5 || fast > 0.05;
    const ph = t * TAU * (2.5 + 2.5 * fast);
    let wa = flapping ? 0.55 * Math.sin(ph) - 0.08 : -0.38 + 0.04 * Math.sin(t * 3);
    if (s.still) wa = -0.42;
    wa -= 0.5 * s.hit(0.25);
    y += flapping && !s.still ? -1.4 * Math.sin(ph + 0.6) : 0;
    // its shadow on the water, faint
    ellipse(g, x, 104, 16, 1.8);
    g.fillStyle = 'rgba(10,40,60,0.18)';
    g.fill();
    g.save();
    g.translate(x, y);
    g.rotate(-0.05 + 0.04 * Math.sin(t * 0.55 + 1));
    g.scale(GULL, GULL);
    // the far wing behind (reaching left, a touch shorter), the body, the near wing in front (reaching right): they
    // beat together
    g.save();
    g.scale(-0.86, 0.94);
    placePart(g, P.wingFar, 2, -3, wa);
    g.restore();
    placePart(g, P.body, 0, 0);
    placePart(g, P.wingNear, 2, -4, wa, 1, 1);
    g.restore();
    // the crust's glint
    const gp = (t * 0.4) % 1;
    if (gp < 0.12 && !s.still) star(g, x + 31 * GULL, y - 4 * GULL, 6 * Math.sin((gp / 0.12) * Math.PI), Math.sin((gp / 0.12) * Math.PI));
  },
  smack(s, emit) {
    s.mem.jyv = (s.mem.jyv ?? 0) - 120 * s.calm;
    s.flash('#fff2b8', 0.3, 0.35);
    s.shake(1);
    const [x, y] = gullAt(s.t);
    const mm = s.menu ? 0.6 : 1;
    for (let i = 0; i < 7; i++) {
      const a = s.r() * TAU;
      const sp = (60 + s.r() * 80) * mm;
      emit('feather', x + Math.cos(a) * 8, y + Math.sin(a) * 6, Math.cos(a) * sp, Math.sin(a) * sp - 30, 12, 12, 0.9 + s.r() * 0.4, { grav: 60, drag: 2.2, spin: (s.r() - 0.5) * 6 });
    }
    for (let i = 0; i < 5; i++) {
      const a = s.r() * TAU;
      const sp = (90 + s.r() * 90) * mm;
      emit('glint', x + 28, y - 3, Math.cos(a) * sp, Math.sin(a) * sp, 10 + s.r() * 4, 2, 0.4 + s.r() * 0.2, { drag: 2 });
    }
    emit('gold', x + 30 * GULL, y - 3, 0, 0, 44, 14, 0.45, { a: 1 });
    for (let i = 0; i < 6; i++) s.dots.spawn('spark', x + 30 * GULL, y - 3, (s.r() - 0.5) * 90, (s.r() - 0.5) * 90, 9, 2, 0.45, { drag: 3, add: true });
  },
};

// ════════════════════════════ the Pizza Box Chest and the Mimic ════════════════════════════

/** The table under the box (and the room's wall behind), warm or (the mimic's) gloomy. */
function paintTable(ctx: Ctx, dark: boolean): void {
  ctx.fillStyle = lin(ctx, 0, 0, 0, 72, dark ? [[0, '#1e1430'], [1, '#43284a']] : [[0, '#6a3824'], [1, '#a8643a']]);
  ctx.fillRect(0, 0, 120, 74);
  // a lamp's light pool on the wall
  dab(ctx, 60, 40, 60, dark ? '#7a3a8a' : '#ffcf8a', 0.35);
  // the tabletop: planks running away, grain, a lit front edge
  ctx.fillStyle = lin(ctx, 0, 72, 0, 120, dark ? [[0, '#5e3c26'], [1, '#342014']] : [[0, '#c88a4a'], [1, '#8a5428']]);
  ctx.fillRect(0, 72, 120, 48);
  const r = rng(dark ? 5 : 3);
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(60 + i * 10, 72);
    ctx.lineTo(60 + i * 26, 120);
    ctx.strokeStyle = dark ? 'rgba(10,4,2,0.5)' : 'rgba(90,46,16,0.45)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  for (let i = 0; i < 30; i++) {
    const y = 74 + r() * 46;
    const x = r() * 120;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 4, y + 0.4, x + 8 + r() * 6, y + (r() - 0.5));
    ctx.strokeStyle = dark ? 'rgba(0,0,0,0.25)' : 'rgba(110,60,20,0.3)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,230,190,0.22)';
  ctx.fillRect(0, 72, 120, 1);
  // the light pool on the table round the box
  dab(ctx, 60, 100, 46, dark ? '#a83a3a' : '#ffe0a0', dark ? 0.16 : 0.32, 0.45);
}

const BW = 74;
const BH = 30;

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

const BOX_X = 60;
const BOX_Y = 98;
const BOX = 1.2;

function boxDraw(g: Ctx, s: MedalState, P: Parts, mimic: boolean): void {
  const m = s.mem;
  placePart(g, P.bg, 0, 0);
  const open = s.still ? (mimic ? 0.24 : 0.2) : Math.max(0, m.lid ?? 0);
  const sq = m.sq ?? 0;
  const rot = m.rot ?? 0;
  // its shadow on the table
  ellipse(g, BOX_X + 2, BOX_Y + 1, BW * 0.56 * BOX, 4.6);
  g.fillStyle = 'rgba(20,8,2,0.35)';
  g.fill();
  g.save();
  g.translate(BOX_X, BOX_Y);
  g.rotate(rot);
  g.scale(BOX * (1 + sq * 0.5), BOX * (1 - sq));
  const top = -BH;
  // inside: the hoard or the maw
  if (open > 0.02) placePart(g, mimic ? P.maw : P.hoard, 0, top + 1);
  // the gold light leaking from the gap (the chest) or the eyes in it (the mimic)
  if (!mimic && open > 0.02) {
    const a = clamp(open * 4, 0, 1);
    g.save();
    g.globalCompositeOperation = 'lighter';
    const lg = g.createRadialGradient(6, top - 3, 0, 6, top - 3, 34 + open * 40);
    lg.addColorStop(0, `rgba(255,236,150,${(0.75 * a).toFixed(3)})`);
    lg.addColorStop(0.4, `rgba(255,200,80,${(0.3 * a).toFixed(3)})`);
    lg.addColorStop(1, 'rgba(255,180,60,0)');
    g.fillStyle = lg;
    g.fillRect(-60, top - 80, 120, 90);
    // rays fanning up from the mouth
    const rays = clamp((open - 0.2) * 1.6, 0, 1);
    if (rays > 0.01) {
      for (let i = 0; i < 7; i++) {
        const ang = -Math.PI / 2 + (i - 3) * 0.26 + Math.sin(s.t * 1.3 + i) * 0.04;
        const len = 60 + (i % 2) * 14;
        g.save();
        g.translate(4, top);
        g.rotate(ang + Math.PI / 2);
        const rg = g.createLinearGradient(0, 0, 0, -len);
        rg.addColorStop(0, `rgba(255,240,170,${(0.55 * rays).toFixed(3)})`);
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
  // the lid's teeth (the mimic's), behind the box's front
  if (mimic) {
    g.save();
    g.translate(-BW / 2, top);
    g.rotate(-open);
    placePart(g, P.teeth, 0, 0);
    g.restore();
  }
  placePart(g, P.body, 0, 0);
  if (mimic) {
    // eyes glinting in the gap, and its tongue
    const ea = clamp((open - 0.05) * 8, 0, 1);
    if (ea > 0.01) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (const ex of [6, 20]) {
        const eg = g.createRadialGradient(ex, top - 2.2, 0, ex, top - 2.2, 6);
        eg.addColorStop(0, `rgba(255,250,170,${ea.toFixed(3)})`);
        eg.addColorStop(0.3, `rgba(255,214,60,${(0.8 * ea).toFixed(3)})`);
        eg.addColorStop(1, 'rgba(255,120,20,0)');
        g.fillStyle = eg;
        g.fillRect(ex - 6, top - 8, 12, 12);
      }
      g.restore();
    }
    const tg = m.tongue ?? 0;
    if (tg > 0.02 && open > 0.08) {
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
    const bg = full(px, (ctx) => paintTable(ctx, dark));
    yield;
    const q = px * BOX;
    const body = part(q, -BW / 2 - 2, -BH - 2, BW + 4, BH + 4, (ctx) => paintBoxBody(ctx, dark));
    const lid = part(q, -3, -11, BW + 6, 13, (ctx) => paintLid(ctx, dark));
    yield;
    const out: Parts = { bg, body, lid };
    if (dark) {
      out.maw = part(q, -BW / 2, -11, BW, 18, paintMaw);
      out.teeth = part(q, 0, -2, BW, 15, paintLidTeeth);
      out.tongue = part(q, -10, -3, 20, 23, paintTongue);
    } else out.hoard = part(q, -BW / 2, -7, BW, 14, paintHoard);
    return out;
  };
}

const chest: EventScene = {
  bezel: '#a8743c',
  paint: boxPaint(false),
  update(s, dt) {
    const m = s.mem;
    // now and then the lid lifts a crack, gold light leaking out, and drops back with a bump
    const u = every(s, 'peek', dt, 1.2, [1.4, 2.4]);
    let target = 0;
    if (s.sm < 0.85) target = 0.95;
    else if (u >= 0) target = u < 0.75 ? 0.28 + 0.04 * Math.sin(u * 20) : 0;
    const was = m.lid ?? 0;
    const lid = spring(s, 'lid', target, target > was ? 260 : 420, target > was ? 13 : 9, dt);
    if (lid < 0 && (m.lidv ?? 0) < -0.5) {
      // it lands: the box squashes, a puff of dust
      m.lid = 0;
      m.sqv = (m.sqv ?? 0) + Math.min(3, -(m.lidv ?? 0) * 0.35);
      m.lidv = 0;
      if (!s.still) for (const sx of [-1, 1]) s.dots.spawn('dust', BOX_X + sx * BW * 0.5 * BOX, BOX_Y - 2, sx * 24, -6, 6, 16, 0.5, { drag: 3, a: 0.6 });
    }
    spring(s, 'sq', 0, 500, 16, dt);
    // a sparkle rising from the gap while it's open
    m.sp = (m.sp ?? 0) + dt;
    if (lid > 0.08 && m.sp > 0.12) {
      m.sp = 0;
      s.dots.spawn('spark', BOX_X - 20 + s.r() * 44, BOX_Y - BH * BOX - 2, (s.r() - 0.5) * 10, -18 - s.r() * 20, 4 + s.r() * 2, 1.5, 0.8, { add: true });
    }
  },
  draw(g, s, P) {
    boxDraw(g, s, P, false);
  },
  smack(s, emit) {
    const m = s.mem;
    m.lidv = (m.lidv ?? 0) + 14 * s.calm;
    m.sqv = (m.sqv ?? 0) + 4 * s.calm;
    s.flash('#ffe6a0', 0.35, 0.4);
    s.shake(1.2);
    const mm = s.menu ? 0.6 : 1;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (s.r() - 0.5) * 1.6;
      const sp = (170 + s.r() * 120) * mm;
      emit('coin', BOX_X - 10 + s.r() * 24, BOX_Y - BH * BOX - 4, Math.cos(a) * sp, Math.sin(a) * sp, 9 + s.r() * 2, 9, 0.65 + s.r() * 0.25, { grav: 560, spin: (s.r() - 0.5) * 10 });
    }
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (s.r() - 0.5) * 2.2;
      const sp = (120 + s.r() * 100) * mm;
      emit('confetti', BOX_X, BOX_Y - BH * BOX - 4, Math.cos(a) * sp, Math.sin(a) * sp, 8, 8, 0.8 + s.r() * 0.3, { grav: 260, drag: 1.4 });
    }
    for (let i = 0; i < 8; i++) s.dots.spawn('spark', BOX_X - 26 + s.r() * 52, BOX_Y - BH * BOX - 4, (s.r() - 0.5) * 30, -40 - s.r() * 40, 6 + s.r() * 3, 2, 0.7, { add: true });
  },
};

const mimic: EventScene = {
  bezel: '#6e4c3a',
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
    if (sm < 0.4) target = 0.95;
    else if (sm < 0.7) target = -0.05;
    else if (u >= 0) target = u < 0.8 ? 0.3 : 0;
    const was = m.lid ?? 0;
    const lid = spring(s, 'lid', target, target > was ? 380 : 900, target > was ? 16 : 14, dt);
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
      const rg = g.createRadialGradient(BOX_X, BOX_Y - BH * BOX - 6, 0, BOX_X, BOX_Y - BH * BOX - 6, 50);
      rg.addColorStop(0, `rgba(255,70,50,${(0.75 * h).toFixed(3)})`);
      rg.addColorStop(1, 'rgba(255,40,30,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, 120, 120);
      g.restore();
    }
  },
  smack(s, emit) {
    s.mem.lidv = (s.mem.lidv ?? 0) + 10 * s.calm;
    s.flash('#ff6a50', 0.25, 0.35);
    s.shake(1.4);
    const mm = s.menu ? 0.6 : 1;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (s.r() - 0.5) * 2.6;
      const sp = (110 + s.r() * 110) * mm;
      emit('crumb', BOX_X - 20 + s.r() * 40, BOX_Y - BH * BOX, Math.cos(a) * sp, Math.sin(a) * sp, 7, 6, 0.5 + s.r() * 0.3, { grav: 500 });
    }
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (s.r() - 0.5) * 1.6;
      const sp = (70 + s.r() * 60) * mm;
      emit('drop', BOX_X + 4, BOX_Y - BH * BOX + 4, Math.cos(a) * sp, Math.sin(a) * sp, 6, 5, 0.5, { grav: 420 });
    }
  },
};

// ════════════════════════════ the Hero Sighting ════════════════════════════

function paintNight(ctx: Ctx): void {
  sky(ctx, [[0, '#0e1e58'], [0.55, '#23409a'], [0.85, '#5a6ac8'], [1, '#d88a78']], null);
  const r = rng(29);
  for (let i = 0; i < 46; i++) {
    const x = r() * 120;
    const y = r() * 92;
    const b = r();
    ellipse(ctx, x, y, 0.4 + b * 0.7, 0.4 + b * 0.7);
    ctx.fillStyle = `rgba(255,250,230,${(0.35 + b * 0.55).toFixed(3)})`;
    ctx.fill();
  }
  // the city's glow and its skyline
  dab(ctx, 60, 124, 70, '#ffb070', 0.45, 0.4);
  let x = -4;
  const cols = ['#101a3a', '#0c1430', '#141e44'];
  let i = 0;
  while (x < 124) {
    const w = 8 + r() * 12;
    const h = 10 + r() * 20;
    ctx.fillStyle = cols[i++ % 3];
    ctx.fillRect(x, 120 - h, w + 0.5, h);
    for (let k = 0; k < 4; k++) if (r() < 0.5) {
      ctx.fillStyle = 'rgba(255,214,140,0.6)';
      ctx.fillRect(x + 2 + r() * (w - 4), 120 - h + 3 + r() * (h - 5), 1.4, 1.8);
    }
    x += w;
  }
}

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

function paintHero(ctx: Ctx): void {
  flyer(ctx, 0, 0, '#2a5fd0', '#e0242f', 0.46);
}

/** A pass of the hero across the sky: 0 … 1 (or less than 0, between passes). */
const PASS = 1.6;
const PASS_LEN = 1.3;

function heroAt(u: number): [number, number, number] {
  const x = -22 + u * 170;
  const y = 72 - 26 * Math.sin(Math.PI * u) + u * 6;
  return [x, y, -0.28 + 0.36 * u];
}

const sighting: EventScene = {
  bezel: '#e2b232',
  *paint(px) {
    const bg = full(px, paintNight);
    yield;
    const big = part(px, -18, -18, 36, 36, paintBigStar);
    const hero = part(px, -72, -18, 96, 34, paintHero);
    return { bg, big, hero };
  },
  init(s) {
    s.mem.pass = -s.r();
  },
  update(s, dt) {
    const m = s.mem;
    m.pass = (m.pass ?? 0) + dt / PASS;
    if (m.pass >= 1) m.pass -= 1;
    spring(s, 'pop', 0, 160, 8, dt);
    m.spin = (m.spin ?? 0) * Math.exp(-dt / 0.5);
    m.sa = ((m.sa ?? 0) + (m.spin ?? 0) * dt) % TAU;
    // a sparkle shed along the trail
    const u = (m.pass * PASS) / PASS_LEN;
    m.sp = (m.sp ?? 0) + dt;
    if (u >= 0 && u <= 1 && m.sp > 0.05) {
      m.sp = 0;
      const [x, y] = heroAt(u);
      s.dots.spawn('spark', x - 18, y + (s.r() - 0.5) * 6, -20 - s.r() * 20, 6 + s.r() * 10, 4 + s.r() * 3, 1, 0.6, { add: true });
    }
  },
  draw(g, s, P) {
    const t = s.t;
    const m = s.mem;
    placePart(g, P.bg, 0, 0);
    // stars twinkling
    if (!s.still)
      for (let i = 0; i < 5; i++) {
        const ph = (t * 0.5 + i * 0.29) % 1;
        const a = Math.sin(ph * Math.PI);
        star(g, 10 + ((i * 47) % 100), 10 + ((i * 29) % 60), 2.8 * a, a);
      }
    // the gold star: turning slowly, breathing, flaring when caught
    const pop = m.pop ?? 0;
    const sc = 1 + 0.05 * Math.sin(t * 2.2) + pop;
    const glow = 0.3 + 0.12 * Math.sin(t * 2.2) + s.hit(0.6) * 0.6;
    g.save();
    g.globalCompositeOperation = 'lighter';
    const gg = g.createRadialGradient(84, 32, 0, 84, 32, 30 * sc);
    gg.addColorStop(0, `rgba(255,226,120,${glow.toFixed(3)})`);
    gg.addColorStop(1, 'rgba(255,200,80,0)');
    g.fillStyle = gg;
    g.fillRect(50, 0, 70, 70);
    g.restore();
    placePart(g, P.big, 84, 32, 0.08 * Math.sin(t * 0.7) + (m.sa ?? 0), sc);
    // the hero streaking past, a trail of light behind
    const u = s.still ? 0.42 : ((m.pass ?? 0) * PASS) / PASS_LEN;
    if (u >= 0 && u <= 1) {
      const [x, y, rot] = heroAt(u);
      const boost = 1 + s.hit(0.8);
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        const len = (34 + k * 10) * boost;
        const dy = (k - 1) * 4.5;
        g.save();
        g.translate(x - 4, y + dy);
        g.rotate(rot);
        const tg = g.createLinearGradient(0, 0, -len, 0);
        tg.addColorStop(0, `rgba(255,246,200,${(0.55 - k * 0.12).toFixed(3)})`);
        tg.addColorStop(1, 'rgba(160,200,255,0)');
        g.fillStyle = tg;
        g.beginPath();
        g.moveTo(0, -2.2);
        g.lineTo(-len, -0.4);
        g.lineTo(-len, 0.4);
        g.lineTo(0, 2.2);
        g.closePath();
        g.fill();
        g.restore();
      }
      g.restore();
      placePart(g, P.hero, x, y, rot);
    }
  },
  smack(s, emit) {
    const m = s.mem;
    m.popv = (m.popv ?? 0) + 6 * s.calm;
    m.spin = (m.spin ?? 0) + 9 * s.calm;
    // caught: it zooms straight through again
    m.pass = 0.02;
    s.flash('#fff4c0', 0.35, 0.4);
    const mm = s.menu ? 0.6 : 1;
    for (let i = 0; i < 6; i++) {
      const a = s.r() * TAU;
      const sp = (90 + s.r() * 110) * mm;
      emit('glint', 84 + Math.cos(a) * 10, 32 + Math.sin(a) * 10, Math.cos(a) * sp, Math.sin(a) * sp, 10 + s.r() * 5, 2, 0.45 + s.r() * 0.2, { drag: 2 });
    }
    for (let i = 0; i < 6; i++) {
      const a = s.r() * TAU;
      const sp = (40 + s.r() * 80) * mm;
      emit('gold', 84 + Math.cos(a) * 8, 32 + Math.sin(a) * 8, Math.cos(a) * sp, Math.sin(a) * sp - 20, 9, 4, 0.5 + s.r() * 0.3, { drag: 1.6 });
    }
    for (let i = 0; i < 8; i++) {
      const a = s.r() * TAU;
      s.dots.spawn('spark', 84, 32, Math.cos(a) * 60, Math.sin(a) * 60, 7, 2, 0.45, { drag: 3, add: true });
    }
  },
};

// ════════════════════════════ Charybdis ════════════════════════════

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

const charybdis: EventScene = {
  bezel: '#5e8c88',
  *paint(px) {
    const bg = full(px, paintWhirl);
    yield;
    const outer = part(px, -86, -86, 172, 172, (ctx) => paintArms(ctx, 5, 22, 84, 0.62, 3.2, 0.75));
    yield;
    const inner = part(px, -46, -46, 92, 92, (ctx) => paintArms(ctx, 4, 16, 44, 0.55, 2, 0.55));
    const maw = part(px, -22, -22, 44, 44, paintMaw2);
    const plank = part(px, -9, -4, 18, 8, paintPlank);
    return { bg, outer, inner, maw, plank };
  },
  update(s, dt) {
    const m = s.mem;
    const fast = 1 + 2.4 * s.hit(1.2);
    m.a1 = ((m.a1 ?? 0) + dt * 0.55 * fast) % TAU;
    m.a2 = ((m.a2 ?? 0) + dt * 1.3 * fast) % TAU;
    // the maw clamps shut on a smack and opens again
    const target = s.sm < 0.35 ? 0.3 : 1;
    spring(s, 'maw', target, s.sm < 0.35 ? 900 : 60, s.sm < 0.35 ? 30 : 8, dt);
    m.plank = ((m.plank ?? s.r()) + dt / 4.6) % 1;
  },
  draw(g, s, P) {
    const t = s.t;
    const m = s.mem;
    placePart(g, P.bg, 0, 0);
    placePart(g, P.outer, 60, 60, m.a1 ?? 0.3);
    placePart(g, P.inner, 60, 60, (m.a2 ?? 0.8) + 0.4);
    // foam flecks spiralling in, faster as they near the middle
    if (!s.still)
      for (let i = 0; i < 16; i++) {
        const u = (t * 0.22 + i / 16) % 1;
        const rr = 56 * (1 - u) + 10;
        const ang = i * 2.4 + t * 0.5 + (1 / (rr / 56 + 0.2)) * 1.6 + (m.a1 ?? 0);
        const a = Math.sin(Math.PI * Math.min(1, u * 1.4)) * 0.9;
        const sz = 2.2 + 2.6 * (1 - u);
        g.globalAlpha = a;
        g.drawImage(foamDot(), 60 + Math.cos(ang) * rr - sz / 2, 60 + Math.sin(ang) * rr - sz / 2, sz, sz);
      }
    g.globalAlpha = 1;
    // a plank caught in it, dragged down
    const pu = s.still ? 0.3 : m.plank ?? 0;
    if (pu < 0.92) {
      const rr = 52 * (1 - pu) + 6;
      const ang = 1.2 + pu * TAU * 1.6 + (m.a1 ?? 0) * 0.5;
      const sc = 0.5 + 0.6 * (1 - pu);
      placePart(g, P.plank, 60 + Math.cos(ang) * rr, 60 + Math.sin(ang) * rr, ang + Math.PI / 2, sc, sc, Math.min(1, (0.92 - pu) * 6));
    }
    // the maw, breathing, turning against the water
    const ms = (m.maw ?? 1) * (1 + 0.05 * Math.sin(t * 2));
    placePart(g, P.maw, 60, 60, -t * 0.3, ms);
  },
  smack(s, emit) {
    s.flash('#d8faff', 0.3, 0.35);
    s.shake(1.6);
    const mm = s.menu ? 0.6 : 1;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + s.r() * 0.5;
      const sp = (120 + s.r() * 120) * mm;
      emit('drop', 60 + Math.cos(a) * 46, 60 + Math.sin(a) * 46, Math.cos(a) * sp, Math.sin(a) * sp - 50, 8 + s.r() * 3, 6, 0.5 + s.r() * 0.2, { grav: 500 });
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      s.dots.spawn('foam', 60 + Math.cos(a) * 24, 60 + Math.sin(a) * 24, Math.cos(a) * 60, Math.sin(a) * 60, 5, 2, 0.5, { drag: 2.5 });
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
