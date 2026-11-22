// Skies for the location kit: a sky is never a flat gradient. It is a gradient dithered with grain (no banding),
// warmer and paler near the horizon where the air is thickest, a sun that blooms into the air round it, and clouds
// painted as soft masses: lit on the side that faces the sun in its colour, shaded underneath in the sky's cool
// complement, edges eaten into wisps, a bright rim where the sun is behind them.

import { texture } from '../style/kit';
import { type Ctx, makeCanvas, mix, rgba } from '../util';
import { type Air, type Box, type R, airMix } from './kit';
import { lay, noiseMask, softly } from './paint';

/** A sky gradient over a box, dithered (fine grain hides the banding a long gradient shows on screen). */
export function skyFill(ctx: Ctx, box: Box, stops: [number, string][], grain = 0.05): void {
  const g = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
  for (const [t, c] of stops) g.addColorStop(t, c);
  ctx.fillStyle = g;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  if (grain > 0) texture(ctx, 'grain', box, grain, 1, 'soft-light');
}

/** The thick air low over a horizon: a band of pale, warm light scattered by the haze, peaking just above it. */
export function horizonGlow(ctx: Ctx, y: number, h: number, col: string, a: number, x0 = 0, x1 = 1920): void {
  const g = ctx.createLinearGradient(0, y - h, 0, y + 2);
  g.addColorStop(0, rgba(col, 0));
  g.addColorStop(0.7, rgba(col, a * 0.6));
  g.addColorStop(0.95, rgba(col, a));
  g.addColorStop(1, rgba(col, a * 0.8));
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = g;
  ctx.fillRect(x0, y - h, x1 - x0, h + 2);
  ctx.restore();
}

export interface SunOpts {
  /** Disc colour (default a near-white warm). */
  disc?: string;
  /** The bloom's colour (the air round the sun). */
  glow?: string;
  /** Bloom strength (0…1, default 0.6) and size (× the disc's radius, default 9). */
  a?: number;
  bloom?: number;
  /** Squash the outer bloom (a low sun spreads along the horizon): y scale, default 1. */
  squash?: number;
  /** Cut the disc off below this y (a sun setting into the sea). */
  clipY?: number;
}

/** A sun: a wide faint bloom, a hotter halo, and the disc with a soft limb. */
export function sun(ctx: Ctx, x: number, y: number, rad: number, o: SunOpts = {}): void {
  const glow = o.glow ?? '#ffd890';
  const a = o.a ?? 0.6;
  const bloom = o.bloom ?? 9;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  // (smooth falloffs: an exponential-ish curve, so no blob shows a ring at a knee in its gradient)
  const blob = (r: number, col: string, al: number, sy = 1) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, sy);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      g.addColorStop(t, rgba(col, al * Math.exp(-t * 4.2) * (1 - t)));
    }
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  };
  blob(rad * bloom, glow, a * 0.7, o.squash ?? 1);
  blob(rad * bloom * 0.35, glow, a * 0.8);
  blob(rad * 3, mix(glow, '#ffffff', 0.6), a);
  ctx.restore();
  ctx.save();
  if (o.clipY !== undefined) {
    ctx.beginPath();
    ctx.rect(x - rad * 2, y - rad * 2, rad * 4, o.clipY - (y - rad * 2));
    ctx.clip();
  }
  // the disc: too bright to have a hard edge, its limb melting into the halo
  const disc = o.disc ?? '#fff6dc';
  ctx.filter = `blur(${Math.max(1, rad * 0.06).toFixed(1)}px)`;
  const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.6, mix(disc, '#ffffff', 0.5));
  g.addColorStop(0.92, disc);
  g.addColorStop(1, rgba(mix(disc, glow, 0.4), 0.6));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export interface CloudOpts {
  /** Lit face (in the sun's colour), body, and shaded underside colours. */
  lit: string;
  body: string;
  shadow: string;
  /** Where the sun is (screen px): the lit faces turn to it, the rim glows when it's behind. */
  sunX: number;
  sunY: number;
  /** Rim light strength where the cloud's edge faces the sun (0…1, default 0.5). */
  rim?: number;
  /** Seen through the air at a depth (0 near … 1 far). */
  depth?: number;
  air?: Air;
  /** Cumulus (heaped, a flat base), stratus (long low bars) or a soft bank. Default cumulus. */
  kind?: 'cumulus' | 'stratus' | 'bank';
  /** Edge softness (px, default w × 0.025) and how much the edges are eaten into wisps (0…1, default 0.45). */
  soft?: number;
  wisp?: number;
  /** Overall opacity (default 1). */
  a?: number;
  /** Paint resolution (default 0.5: clouds are soft). */
  res?: number;
}

/** A cloud of width w and height h with its base centred at (x, y). */
export function cloud(ctx: Ctx, r: R, x: number, y: number, w: number, h: number, o: CloudOpts): void {
  const kind = o.kind ?? 'cumulus';
  const res = o.res ?? 0.5;
  const pad = Math.max(w * 0.25, h * 1.3);
  const bw = w + pad * 2;
  const bh = h + pad * 2;
  const [c, g] = makeCanvas(bw * res, bh * res);
  g.scale(res, res);
  // local frame: base centre at (bw/2, pad + h)
  const cx = bw / 2;
  const by = pad + h;
  const puffs: [number, number, number][] = [];
  if (kind === 'cumulus') {
    const n = 9 + Math.floor(r() * 5);
    for (let i = 0; i < n; i++) {
      const t = (i + r() * 0.6) / n;
      const dome = Math.sin(t * Math.PI);
      const rr = h * (0.22 + dome * 0.3) * (0.75 + r() * 0.5);
      puffs.push([cx - w / 2 + t * w, by - rr * 0.7 - dome * h * 0.25, rr]);
    }
    for (let i = 0; i < 5; i++) {
      const t = 0.2 + r() * 0.6;
      const rr = h * (0.18 + r() * 0.2);
      puffs.push([cx - w / 2 + t * w, by - h * (0.55 + r() * 0.3), rr]);
    }
  } else if (kind === 'stratus') {
    const n = 10 + Math.floor(r() * 6);
    for (let i = 0; i < n; i++) {
      const t = (i + r() * 0.8) / n;
      const rr = h * (0.35 + r() * 0.35) * (0.6 + Math.sin(t * Math.PI) * 0.5);
      puffs.push([cx - w / 2 + t * w, by - rr * 0.6 - r() * h * 0.15, rr]);
    }
  } else {
    const n = 14;
    for (let i = 0; i < n; i++) {
      const t = (i + r()) / n;
      const rr = h * (0.3 + r() * 0.4);
      puffs.push([cx - w / 2 + t * w, by - h * 0.25 - r() * h * 0.5, rr]);
    }
  }
  const flatBase = kind !== 'bank';
  // (stratus and banks are drawn out along the horizon: wide, flat puffs)
  const sx = kind === 'stratus' ? 2.6 : kind === 'bank' ? 1.6 : 1;
  const shapePath = (q: Ctx) => {
    q.beginPath();
    for (const [px, py, pr] of puffs) {
      q.moveTo(px + pr * sx, py);
      q.ellipse(px, py, pr * sx, pr, 0, 0, Math.PI * 2);
    }
  };
  // 1) the mass in its body colour, with a soft edge
  // (a defined edge: soft only at the base and where the wisps eat in)
  const soft = o.soft ?? Math.max(1.5, w * 0.009);
  g.save();
  if (flatBase) {
    g.beginPath();
    g.rect(0, 0, bw, by - h * 0.02);
    g.clip();
  }
  g.filter = `blur(${(soft * res).toFixed(1)}px)`;
  shapePath(g);
  g.fillStyle = o.body;
  g.fill('nonzero');
  g.filter = 'none';
  g.restore();
  // 2) light: each puff lit on its sun side, the underside in shade (painted inside the mass)
  g.save();
  g.globalCompositeOperation = 'source-atop';
  const vg = g.createLinearGradient(0, by - h, 0, by);
  vg.addColorStop(0, rgba(o.shadow, 0));
  vg.addColorStop(0.55, rgba(o.shadow, 0.35));
  vg.addColorStop(1, rgba(o.shadow, 0.9));
  g.fillStyle = vg;
  g.fillRect(0, 0, bw, bh);
  const ox0 = x - bw / 2;
  const oy0 = y - by;
  for (const [px, py, pr] of puffs) {
    const dx = o.sunX - (ox0 + px);
    const dy = o.sunY - (oy0 + py);
    const l = Math.hypot(dx, dy) || 1;
    const lx = px + (dx / l) * pr * 0.45;
    const ly = py + (dy / l) * pr * 0.45;
    g.save();
    g.translate(lx, ly);
    g.scale(sx, 1);
    const lg = g.createRadialGradient(0, 0, 0, 0, 0, pr * 1.05);
    lg.addColorStop(0, rgba(o.lit, 0.95));
    lg.addColorStop(0.55, rgba(o.lit, 0.45));
    lg.addColorStop(1, rgba(o.lit, 0));
    g.fillStyle = lg;
    g.fillRect(-pr * 1.6, -pr * 1.6, pr * 3.2, pr * 3.2);
    g.restore();
  }
  g.restore();
  // 3) the rim: the edges facing the sun glow
  const rimA = o.rim ?? 0.6;
  if (rimA > 0) {
    // the edge band facing the sun: the cloud's own mask, minus itself shifted away from the sun
    const dx = o.sunX - x;
    const dy = o.sunY - (y - h / 2);
    const l = Math.hypot(dx, dy) || 1;
    const d = soft * 2.6 * res;
    const [mc, mg] = makeCanvas(c.width, c.height);
    mg.drawImage(c, 0, 0);
    mg.globalCompositeOperation = 'source-in';
    mg.fillStyle = o.lit;
    mg.fillRect(0, 0, c.width, c.height);
    mg.globalCompositeOperation = 'destination-out';
    mg.filter = `blur(${(soft * res * 0.8).toFixed(1)}px)`;
    mg.drawImage(c, (-dx / l) * d, (-dy / l) * d);
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = rimA;
    g.drawImage(mc, 0, 0);
    g.restore();
  }
  // 4) wisps: the density breaks up (thin patches the sky shows through)
  const wisp = o.wisp ?? 0.45;
  if (wisp > 0) {
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    const m = noiseMask(6, Math.floor(r() * 1000), { cover: 0.4, soft: 0.3 });
    lay(g, m, { x: 0, y: 0, w: c.width, h: c.height }, wisp * 0.55, 'destination-out');
    g.restore();
  }
  // seen through the air
  if (o.air && o.depth) {
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = rgba(o.air.color, Math.max(0, Math.min(1, o.depth)) ** 1.25 * o.air.far);
    g.fillRect(0, 0, c.width, c.height);
    g.restore();
  }
  ctx.save();
  ctx.globalAlpha = o.a ?? 1;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(c, x - bw / 2, y - by, bw, bh);
  ctx.restore();
}

/** Crepuscular rays: soft beams fanning out from a low sun through the haze (and the clouds' gaps). */
export function rays(ctx0: Ctx, r: R, x0: number, y0: number, n: number, len: number, col: string, a: number, spread = Math.PI * 0.9, dir = Math.PI / 2): void {
  // (painted at a quarter size round the sun and drawn up: soft without a blur filter over a big area)
  const k = 0.25;
  const [c, ctx] = makeCanvas(len * 2 * k, len * 2 * k);
  ctx.scale(k, k);
  const x = len;
  const y = len;
  for (let i = 0; i < n; i++) {
    const ang = dir - spread / 2 + spread * ((i + 0.3 + r() * 0.4) / n);
    const w = 0.02 + r() * 0.05;
    const l = len * (0.5 + r() * 0.5);
    const g = ctx.createRadialGradient(x, y, 0, x, y, l);
    const al = a * (0.4 + r() * 0.6);
    g.addColorStop(0, rgba(col, al));
    g.addColorStop(0.5, rgba(col, al * 0.35));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, l, ang - w, ang + w);
    ctx.closePath();
    ctx.fill();
  }
  ctx0.save();
  ctx0.globalCompositeOperation = 'screen';
  ctx0.imageSmoothingEnabled = true;
  ctx0.drawImage(c, x0 - len, y0 - len, len * 2, len * 2);
  ctx0.restore();
}

/** Wisps of high cirrus: long, thin, soft streaks along `ang`. */
export function cirrus(ctx0: Ctx, r: R, box: Box, col: string, a: number, ang = -0.06, n = 18): void {
  // (at half size, drawn up: soft without a blur over the whole box)
  softly(ctx0, box, (ctx) => cirrusStrokes(ctx, r, box, col, a, ang, n), 0.4);
}

function cirrusStrokes(ctx: Ctx, r: R, box: Box, col: string, a: number, ang: number, n: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = box.x + r() * box.w;
    const y = box.y + r() * box.h;
    const len = 120 + r() * 320;
    ctx.strokeStyle = rgba(col, a * (0.3 + r() * 0.7));
    ctx.lineWidth = 2 + r() * 7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(ang) * len * 0.5, y + Math.sin(ang) * len * 0.5 - 6 - r() * 10, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }
  ctx.restore();
}

/** Stars: most faint, a few bright with a soft halo, thinning towards the horizon (y1). */
export function stars(ctx: Ctx, r: R, box: Box, n: number, col = '#fff6e6'): void {
  for (let i = 0; i < n; i++) {
    const x = box.x + r() * box.w;
    const t = r() ** 1.4;
    const y = box.y + t * box.h;
    const fade = 1 - t * 0.8;
    const big = r() < 0.08;
    ctx.fillStyle = rgba(col, (0.3 + r() * 0.6) * fade);
    ctx.beginPath();
    ctx.arc(x, y, big ? 1.6 : 0.6 + r() * 0.7, 0, Math.PI * 2);
    ctx.fill();
    if (big) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, 7);
      g.addColorStop(0, rgba(col, 0.35 * fade));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - 7, y - 7, 14, 14);
    }
  }
}

/** A distant landmass (an island, a headland, a far range) seen through the air: a soft silhouette in the air's
 * colour, its top edge lit by the sun's side, its foot lost in haze. */
export function farLand(ctx: Ctx, pts: [number, number][], baseY: number, col: string, depth: number, air: Air, litCol: string, litA = 0.35): void {
  const c = airMix(col, depth, air);
  ctx.save();
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = c;
  ctx.fill();
  ctx.clip();
  const ys = pts.map((p) => p[1]);
  const top = Math.min(...ys);
  // lit ridge, hazy foot
  const g = ctx.createLinearGradient(0, top, 0, baseY);
  g.addColorStop(0, rgba(litCol, litA));
  g.addColorStop(0.35, rgba(litCol, 0));
  g.addColorStop(0.7, rgba(air.color, 0));
  g.addColorStop(1, rgba(air.color, 0.55));
  ctx.fillStyle = g;
  ctx.fillRect(Math.min(...pts.map((p) => p[0])), top, 4000, baseY - top + 2);
  ctx.restore();
}
