// Space for the location kit: planets lit by a sun (oceans, land, weather, a terminator with city lights on the
// night side, a thin atmosphere glowing at the limb), nebulae painted as soft drifting light with dark dust lanes,
// and the airless ground of a moon (regolith, craters lit hard from one side).

import { type Ctx, makeCanvas, mix, rgba, shade } from '../util';
import { type Box, type R } from './kit';
import { drift, lay, noiseMask } from './paint';

export interface PlanetOpts {
  ocean: string;
  land: string;
  /** A second land tone (deserts, high ground) laid over part of the land. */
  land2?: string;
  cloud?: string;
  /** Cloud cover (0…1, default 0.5). */
  clouds?: number;
  /** The air at the limb (a blue for an Earth). */
  atmo: string;
  /** Direction towards the sun, as an angle (radians, screen space: 0 = right, -π/2 = up). */
  sunAng: number;
  /** How far the terminator sits across the disc towards the sun: −1 (all night) … 0 (half lit) … 1 (full). */
  phase?: number;
  /** City lights on the night side (0…1). */
  lights?: number;
  /** Paint only what shows in this box (a huge planet seen close up). */
  view?: Box;
  /** Size of the land masses relative to the disc (default 1; smaller for a close view). */
  scale?: number;
  /** Squash the land masses vertically (a close view near the limb sees them foreshortened): default 0.62. */
  flat?: number;
  seed?: number;
  /** Paint only the night side's lights (for a live layer that fades them in). */
  lightsOnly?: boolean;
}

/** A planet: a disc of ocean and land with weather over it, lit from the sun's side, night falling off across a soft
 * terminator (city lights there), the limb darkened and the atmosphere glowing as a thin rim on the lit side. */
export function planet(ctx: Ctx, r: R, x: number, y: number, rad: number, o: PlanetOpts): void {
  const seed = o.seed ?? 11;
  void r;
  const disc = { x: x - rad, y: y - rad, w: rad * 2, h: rad * 2 };
  const v = o.view ? inter(disc, o.view) : disc;
  if (!v) return;
  const sx = Math.cos(o.sunAng);
  const sy = Math.sin(o.sunAng);
  const phase = o.phase ?? 0.3;
  // the land masks are laid over a square of `side` px (so a close-up keeps continents a sensible size)
  const flat = o.flat ?? 0.62;
  const side = Math.max(rad * 2 * (o.scale ?? 1), v.w * 1.1, (v.h * 1.1) / flat);
  const mx = o.view ? v.x + v.w / 2 : x;
  const my = o.view ? v.y + v.h / 2 : y;
  const mbox = (k: number) => ({ x: mx - side / 2 + k * 37 - 40, y: my - (side * flat) / 2, w: side + 80, h: side * flat });
  const clipDisc = (c: Ctx) => {
    c.beginPath();
    c.arc(x, y, rad, 0, Math.PI * 2);
    c.clip();
  };
  // the night: a gradient across the disc along the sun's direction, from full day to night past the terminator
  const night = (c: Ctx, a: number, col = '#02040c') => {
    const g = c.createLinearGradient(x + sx * rad, y + sy * rad, x - sx * rad, y - sy * rad);
    const t = Math.max(0.05, Math.min(0.95, 0.5 + phase * 0.5));
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(Math.max(0, t - 0.12), rgba(col, 0));
    g.addColorStop(Math.min(1, t + 0.1), rgba(col, a));
    g.addColorStop(1, rgba(col, a));
    c.fillStyle = g;
    c.fillRect(v.x, v.y, v.w, v.h);
  };
  if (o.lightsOnly) {
    ctx.save();
    clipDisc(ctx);
    cityLights(ctx, v, mbox(0), seed, o, x, y, rad, sx, sy, phase);
    ctx.restore();
    return;
  }
  ctx.save();
  clipDisc(ctx);
  // ocean: deeper away from the sun, a paler shelf near the land
  const og = ctx.createRadialGradient(x + sx * rad * 0.4, y + sy * rad * 0.4, rad * 0.1, x, y, rad);
  og.addColorStop(0, shade(o.ocean, 0.18));
  og.addColorStop(0.7, o.ocean);
  og.addColorStop(1, shade(o.ocean, -0.3));
  ctx.fillStyle = og;
  ctx.fillRect(v.x, v.y, v.w, v.h);
  lay(ctx, drift(shade(o.ocean, 0.22), shade(o.ocean, -0.25), 5, seed + 1, 256, 160), mbox(0), 0.35);
  // the shelf, then land, then the second tone (masks of the same noise at rising thresholds: coasts nest)
  lay(ctx, noiseMask(5, seed, { cover: 0.42, soft: 0.06, col: mix(o.ocean, '#9ad8e0', 0.35), w: 256, h: 160 }), mbox(0), 0.5);
  lay(ctx, noiseMask(5, seed, { cover: 0.4, soft: 0.02, col: o.land, w: 256, h: 160 }), mbox(0), 1);
  if (o.land2) lay(ctx, noiseMask(5, seed, { cover: 0.2, soft: 0.07, col: o.land2, w: 256, h: 160 }), mbox(0), 0.9);
  // high ground, darker, in the middle of the masses
  lay(ctx, noiseMask(5, seed, { cover: 0.1, soft: 0.08, col: shade(o.land, -0.3), w: 256, h: 160 }), mbox(0), 0.6);
  lay(ctx, drift(shade(o.land, 0.2), shade(o.land, -0.3), 18, seed + 3, 256, 160), mbox(0), 0.18);
  // weather: banks of cloud with swirls and long streamers, softly lit (no puffs)
  const cl = o.clouds ?? 0.5;
  if (cl > 0) {
    const cc = o.cloud ?? '#f4f8ff';
    lay(ctx, noiseMask(7, seed + 7, { cover: 0.3 * cl + 0.05, soft: 0.14, col: cc, w: 256, h: 160 }), mbox(1), 0.85);
    lay(ctx, noiseMask(11, seed + 9, { cover: 0.22 * cl, soft: 0.12, col: cc, w: 256, h: 160 }), mbox(2), 0.5);
  }
  // the sun's glint on the ocean
  const gx = x + sx * rad * 0.45;
  const gy = y + sy * rad * 0.45;
  const sg = ctx.createRadialGradient(gx, gy, 0, gx, gy, rad * 0.35);
  sg.addColorStop(0, rgba('#fff8e8', 0.28));
  sg.addColorStop(1, rgba('#fff8e8', 0));
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = sg;
  ctx.fillRect(v.x, v.y, v.w, v.h);
  ctx.globalCompositeOperation = 'source-over';
  // night, with a warm band where the sun sets along the terminator
  night(ctx, 0.92);
  if (o.lights) cityLights(ctx, v, mbox(0), seed, o, x, y, rad, sx, sy, phase);
  // the limb darkens (light grazes the edge through more air), then the air itself glows
  const lg = ctx.createRadialGradient(x, y, rad * 0.75, x, y, rad);
  lg.addColorStop(0, rgba('#000008', 0));
  lg.addColorStop(1, rgba('#000008', 0.35));
  ctx.fillStyle = lg;
  ctx.fillRect(v.x, v.y, v.w, v.h);
  const ag = ctx.createRadialGradient(x, y, rad * 0.9, x, y, rad);
  ag.addColorStop(0, rgba(o.atmo, 0));
  ag.addColorStop(1, rgba(o.atmo, 0.55));
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = ag;
  ctx.fillRect(v.x, v.y, v.w, v.h);
  ctx.globalCompositeOperation = 'source-over';
  // (the atmosphere is lit only on the day side)
  night(ctx, 0.5, '#000006');
  ctx.restore();
  // the halo of air beyond the limb, on the lit side: a thin bright line fading out into space
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const hw = rad * 0.04 + 6;
  const hg = ctx.createRadialGradient(x, y, rad - 2, x, y, rad + hw);
  hg.addColorStop(0, rgba(mix(o.atmo, '#ffffff', 0.4), 0.85));
  hg.addColorStop(0.25, rgba(o.atmo, 0.45));
  hg.addColorStop(1, rgba(o.atmo, 0));
  ctx.beginPath();
  ctx.arc(x, y, rad + hw, 0, Math.PI * 2);
  ctx.arc(x, y, rad - 2, 0, Math.PI * 2, true);
  ctx.clip();
  ctx.fillStyle = hg;
  const ex = v.x - hw;
  const ey = v.y - hw;
  ctx.fillRect(ex, ey, v.w + hw * 2, v.h + hw * 2);
  // dark where the night side is
  ctx.globalCompositeOperation = 'destination-out';
  const ng = ctx.createLinearGradient(x + sx * rad, y + sy * rad, x - sx * rad, y - sy * rad);
  const t = Math.max(0.05, Math.min(0.95, 0.5 + phase * 0.5));
  ng.addColorStop(0, 'rgba(0,0,0,0)');
  ng.addColorStop(Math.min(1, t + 0.05), 'rgba(0,0,0,0)');
  ng.addColorStop(Math.min(1, t + 0.3), 'rgba(0,0,0,0.92)');
  ng.addColorStop(1, 'rgba(0,0,0,0.92)');
  ctx.fillStyle = ng;
  ctx.fillRect(ex, ey, v.w + hw * 2, v.h + hw * 2);
  ctx.restore();
}

function cityLights(ctx: Ctx, v: Box, mb: Box, seed: number, o: PlanetOpts, x: number, y: number, rad: number, sx: number, sy: number, phase: number): void {
  // speckle on the land only, on the night side only (an offscreen, cut by the land mask and the night)
  const k = 0.5;
  const [c, g] = makeCanvas(Math.max(1, v.w * k), Math.max(1, v.h * k));
  g.scale(k, k);
  g.translate(-v.x, -v.y);
  // towns: tight clusters of tiny warm points, a few cities glowing, roads of light strung between some
  let s = seed * 9301 + 49297;
  const rr = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const n = Math.round((v.w * v.h) / 700);
  for (let i = 0; i < n; i++) {
    const cx = v.x + rr() * v.w;
    const cy = v.y + rr() * v.h;
    const big = rr() < 0.08;
    const k2 = big ? 14 : 3 + Math.floor(rr() * 5);
    for (let j = 0; j < k2; j++) {
      const px = cx + (rr() - 0.5) * (big ? 26 : 10);
      const py = cy + (rr() - 0.5) * (big ? 10 : 4);
      g.fillStyle = rr() < 0.3 ? 'rgba(255,244,210,0.95)' : 'rgba(255,190,90,0.8)';
      g.fillRect(px, py, 1.6 + rr() * 1.4, 1.2 + rr());
    }
    if (big) {
      const gg = g.createRadialGradient(cx, cy, 0, cx, cy, 22);
      gg.addColorStop(0, 'rgba(255,190,90,0.45)');
      gg.addColorStop(1, 'rgba(255,190,90,0)');
      g.fillStyle = gg;
      g.fillRect(cx - 22, cy - 22, 44, 44);
    }
  }
  g.globalCompositeOperation = 'destination-in';
  lay(g, noiseMask(5, seed, { cover: 0.36, soft: 0.06, col: '#000000', w: 256, h: 160 }), mb, 1);
  const ng = g.createLinearGradient(x + sx * rad, y + sy * rad, x - sx * rad, y - sy * rad);
  const t = Math.max(0.05, Math.min(0.95, 0.5 + phase * 0.5));
  ng.addColorStop(0, 'rgba(0,0,0,0)');
  ng.addColorStop(Math.min(1, t + 0.08), 'rgba(0,0,0,0)');
  ng.addColorStop(Math.min(1, t + 0.22), 'rgba(0,0,0,1)');
  ng.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = ng;
  g.fillRect(v.x, v.y, v.w, v.h);
  ctx.save();
  ctx.globalAlpha = o.lights ?? 0;
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(c, v.x, v.y, v.w, v.h);
  ctx.restore();
}

function inter(a: Box, b: Box): Box | null {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.w, b.x + b.w);
  const y1 = Math.min(a.y + a.h, b.y + b.h);
  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}

/** A nebula: soft light drifting through a box in two or three colours (screened on), cut by dark lanes of dust,
 * a scatter of young stars in its brightest knots. */
export function nebula(ctx: Ctx, r: R, box: Box, cols: string[], a: number, seed = 5): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  cols.forEach((c, i) => {
    lay(ctx, noiseMask(3 + i, seed + i * 13, { cover: 0.4, soft: 0.35, col: c, w: 192, h: 108 }), box, a * (1 - i * 0.2));
    lay(ctx, noiseMask(8 + i * 3, seed + i * 7 + 2, { cover: 0.3, soft: 0.2, col: mix(c, '#ffffff', 0.25), w: 192, h: 108 }), box, a * 0.4);
  });
  ctx.globalCompositeOperation = 'source-over';
  // dust lanes: dark, wispy
  lay(ctx, noiseMask(6, seed + 40, { cover: 0.28, soft: 0.12, col: '#02030a', w: 192, h: 108 }), box, 0.55);
  lay(ctx, noiseMask(16, seed + 41, { cover: 0.2, soft: 0.04, kind: 'web', col: '#02030a', w: 192, h: 108 }), box, 0.35);
  ctx.restore();
  // young stars in it
  for (let i = 0; i < 14; i++) {
    const x = box.x + r() * box.w;
    const y = box.y + r() * box.h;
    const c = cols[Math.floor(r() * cols.length)];
    const g = ctx.createRadialGradient(x, y, 0, x, y, 10);
    g.addColorStop(0, rgba('#ffffff', 0.8));
    g.addColorStop(0.2, rgba(mix(c, '#ffffff', 0.5), 0.4));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - 10, y - 10, 20, 20);
  }
}

/** A bright star with diffraction spikes (seen through glass or a lens). */
export function starburst(ctx: Ctx, x: number, y: number, s: number, col = '#eaf2ff', a = 0.9): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(x, y, 0, x, y, s * 3);
  g.addColorStop(0, rgba('#ffffff', a));
  g.addColorStop(0.15, rgba(col, a * 0.5));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - s * 3, y - s * 3, s * 6, s * 6);
  for (const [dx, dy] of [[1, 0], [0, 1]]) {
    const lg = ctx.createLinearGradient(x - dx * s * 5, y - dy * s * 5, x + dx * s * 5, y + dy * s * 5);
    lg.addColorStop(0, rgba(col, 0));
    lg.addColorStop(0.5, rgba('#ffffff', a * 0.7));
    lg.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = lg;
    ctx.fillRect(x - (dx ? s * 5 : 0.6), y - (dy ? s * 5 : 0.6), dx ? s * 10 : 1.2, dy ? s * 10 : 1.2);
  }
  ctx.restore();
}

/**
 * A crater on flat ground seen at a low angle (an ellipse), lit hard by a sun from the top left: a black crescent of
 * shadow thrown by the far-left rim across the floor, the near-right inner wall blazing, a raised lip lit on its far
 * side, a darker ring of ejecta round it.
 */
export function crater(ctx: Ctx, r: R, x: number, y: number, rx: number, ry: number, base: string, o: { shadow?: string; lit?: string; ejecta?: number } = {}): void {
  const sh = o.shadow ?? '#05060c';
  const lit = o.lit ?? shade(base, 0.35);
  // ejecta: a soft paler ring and a few rays
  if (o.ejecta ?? 0.5) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    const eg = ctx.createRadialGradient(0, 0, rx * 0.9, 0, 0, rx * 1.9);
    eg.addColorStop(0, rgba(shade(base, 0.2), 0.35 * (o.ejecta ?? 0.5)));
    eg.addColorStop(1, rgba(shade(base, 0.2), 0));
    ctx.fillStyle = eg;
    ctx.fillRect(-rx * 2, -rx * 2, rx * 4, rx * 4);
    ctx.restore();
  }
  // the raised lip: its outer far-left slope lit, near-right slope in shadow
  ctx.save();
  ctx.lineWidth = Math.max(2, ry * 0.16);
  ctx.strokeStyle = rgba(lit, 0.55);
  ctx.beginPath();
  ctx.ellipse(x, y - ry * 0.04, rx * 1.06, ry * 1.1, 0, Math.PI * 0.95, Math.PI * 1.75);
  ctx.stroke();
  ctx.strokeStyle = rgba(sh, 0.3);
  ctx.beginPath();
  ctx.ellipse(x, y + ry * 0.04, rx * 1.08, ry * 1.12, 0, Math.PI * 1.9, Math.PI * 2.85);
  ctx.stroke();
  ctx.restore();
  // the bowl
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  const bg = ctx.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
  bg.addColorStop(0, shade(base, -0.4));
  bg.addColorStop(0.6, shade(base, -0.1));
  bg.addColorStop(1, lit);
  ctx.fillStyle = bg;
  ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2);
  // the shadow thrown by the far-left rim (a crescent: the bowl minus itself shifted along the light)
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.ellipse(x + rx * 0.22, y + ry * 0.3, rx * 0.96, ry * 0.92, 0, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  // the near-right inner wall catches the full sun
  const wg = ctx.createRadialGradient(x + rx * 0.5, y + ry * 0.7, 0, x + rx * 0.5, y + ry * 0.7, rx * 0.8);
  wg.addColorStop(0, rgba(lit, 0.6));
  wg.addColorStop(1, rgba(lit, 0));
  ctx.fillStyle = wg;
  ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2);
  // a few boulders on the floor
  for (let i = 0; i < Math.round(rx / 30); i++) {
    const bx = x + (r() - 0.3) * rx;
    const by = y + (r() - 0.2) * ry * 0.8;
    const s = 1.5 + r() * rx * 0.03;
    ctx.fillStyle = rgba(sh, 0.7);
    ctx.beginPath();
    ctx.ellipse(bx + s * 0.8, by + s * 0.3, s * 1.6, s * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(lit, 0.8);
    ctx.beginPath();
    ctx.ellipse(bx, by, s, s * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
