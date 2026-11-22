// Base roster, creature feet (style kit): Quackfoot, Xeno Toes and Dino Stomper. Each is built from digits (long
// toes on rays from a root) joined into one silhouette with the leg's trunk, webbing and claws; poses curl, splay and
// wiggle the digits. How they move in play: src/content/styleLive/base.ts.

import { CX } from '../../art/feetCommon';
import { LIGHT, type PathFn, type Pose, ao, crease, glint, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil, lobe } from '../../art/style/sil';
import { registerStyle } from '../../art/style/registry';
import { clawPath, contact, paintClaw } from '../../art/style/details';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';
import { LX, LY, clipTo } from './base-kit';

/** A digit: a tapered toe on a ray from its root. */
export interface Digit {
  x: number;
  y: number;
  /** Direction (radians, π/2 = straight down). */
  a: number;
  len: number;
  /** Half widths at the root and the tip. */
  wr: number;
  wt: number;
}

export function digitTip(d: Digit): [number, number] {
  return [d.x + Math.cos(d.a) * d.len, d.y + Math.sin(d.a) * d.len];
}

/** A point along a digit (u 0 root … 1 tip), offset sideways by s half widths (+ to its left as it points). */
export function onDigit(d: Digit, u: number, s = 0): [number, number] {
  const w = d.wr + (d.wt - d.wr) * u;
  const nx = Math.sin(d.a);
  const ny = -Math.cos(d.a);
  return [d.x + Math.cos(d.a) * d.len * u + nx * w * s, d.y + Math.sin(d.a) * d.len * u + ny * w * s];
}

/** A digit's path: tapered sides with a knuckle swell, a round tip. */
export function digitPath(d: Digit, knuckle = 0.12): PathFn {
  return (c: Ctx) => {
    const ux = Math.cos(d.a);
    const uy = Math.sin(d.a);
    const nx = -uy;
    const ny = ux;
    const [tx, ty] = digitTip(d);
    const mid = (s: number): [number, number] => {
      const w = (d.wr + d.wt) / 2 + d.wr * knuckle;
      return [d.x + ux * d.len * 0.5 + nx * w * s, d.y + uy * d.len * 0.5 + ny * w * s];
    };
    c.beginPath();
    c.moveTo(d.x + nx * d.wr, d.y + ny * d.wr);
    const [m1x, m1y] = mid(1);
    c.quadraticCurveTo(m1x, m1y, tx + nx * d.wt, ty + ny * d.wt);
    c.arc(tx, ty, d.wt, d.a + Math.PI / 2, d.a - Math.PI / 2, true);
    const [m2x, m2y] = mid(-1);
    c.quadraticCurveTo(m2x, m2y, d.x - nx * d.wr, d.y - ny * d.wr);
    c.closePath();
  };
}

/** Pose three (or more) digits: curl draws them in and shortens them, splay spreads them, wiggle bobs each one. */
export function poseDigits(rest: Digit[], p: Pose, o: { spread?: number; root?: [number, number] } = {}): Digit[] {
  const c = Math.max(0, p.curl);
  const s = Math.max(0, -p.curl);
  const mid = (rest.length - 1) / 2;
  return rest.map((d, i) => {
    const w = p.wiggle[Math.round((i / Math.max(1, rest.length - 1)) * 4)] ?? 0;
    const off = (i - mid) / Math.max(1, mid);
    return { ...d, a: d.a + off * ((o.spread ?? 0.12) * s - 0.16 * c) - w * 0.05, len: d.len * (1 - 0.16 * c + 0.03 * s + 0.05 * w) };
  });
}

/** Paint scutes (overlapping horn plates) across a digit, from u0 to u1. */
function scutes(g: Ctx, d: Digit, u0: number, u1: number, n: number, dark: string, a = 0.5): void {
  for (let i = 0; i < n; i++) {
    const u = u0 + ((u1 - u0) * (i + 0.5)) / n;
    const [lx, ly] = onDigit(d, u, 0.9);
    const [rx, ry] = onDigit(d, u, -0.9);
    const [mx, my] = onDigit(d, u + 0.035, 0);
    crease(g, (c) => {
      c.moveTo(lx, ly);
      c.quadraticCurveTo(mx, my, rx, ry);
    }, 1.6, dark, a, 0.4);
  }
}

// ════════════════════════════ QUACKFOOT ════════════════════════════
// A big orange duck's foot: three long scaly toes fanned out, rubbery webbing stretched between them, little dark
// claws. In play the toes paddle, water drips off the webs and a feather drifts down now and then.

const QUACK_ROOT: [number, number] = [CX, 46];
const QUACK_REST: Digit[] = [
  { x: CX - 8, y: 46, a: Math.PI / 2 + 0.58, len: 212, wr: 25, wt: 14 },
  { x: CX, y: 46, a: Math.PI / 2, len: 220, wr: 27, wt: 15 },
  { x: CX + 8, y: 46, a: Math.PI / 2 - 0.58, len: 212, wr: 25, wt: 14 },
];

function quackParts(ds: Digit[]): { trunk: PathFn; webs: PathFn[]; toes: PathFn[] } {
  const trunk: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 36, -8);
    c.lineTo(CX + 36, -8);
    c.bezierCurveTo(CX + 36, 20, CX + 30, 40, CX + 34, 70);
    c.lineTo(CX - 34, 70);
    c.bezierCurveTo(CX - 30, 40, CX - 36, 20, CX - 36, -8);
    c.closePath();
  };
  const webs: PathFn[] = [];
  for (let i = 0; i < ds.length - 1; i++) {
    const a = ds[i];
    const b = ds[i + 1];
    webs.push((c) => {
      const [a0x, a0y] = onDigit(a, 0.1, i === 0 ? -0.6 : -0.6);
      const [a1x, a1y] = onDigit(a, 0.9, -0.4);
      const [b1x, b1y] = onDigit(b, 0.9, 0.4);
      const [b0x, b0y] = onDigit(b, 0.1, 0.6);
      // the web's free edge sags in a scallop between the tips
      const mx = (a1x + b1x) / 2;
      const my = (a1y + b1y) / 2 - 12;
      c.beginPath();
      c.moveTo(a0x, a0y);
      c.lineTo(a1x, a1y);
      c.quadraticCurveTo(mx, my, b1x, b1y);
      c.lineTo(b0x, b0y);
      c.closePath();
    });
  }
  return { trunk, webs, toes: ds.map((d) => digitPath(d, 0.1)) };
}

function quackClaws(ds: Digit[]): { x: number; y: number; a: number }[] {
  return ds.map((d) => {
    const [x, y] = onDigit(d, 1 - d.wt * 0.3 / d.len, 0);
    return { x, y, a: d.a };
  });
}

registerStyle('quack', {
  contactY: 268,
  halfWidth: 108,
  rig: { from: 56, to: 86 },
  leg: { kind: 'skin', hw: 36, join: 'blend', fade: 22 },
  draw(ctx, art, p) {
    const orange = art.primary ?? '#ff9f1c';
    const deepO = art.secondary ?? '#c96a00';
    const ds = poseDigits(QUACK_REST, p, { spread: 0.14 });
    const { trunk, webs, toes } = quackParts(ds);
    const claws = quackClaws(ds);
    const clawPaths = claws.map((k) => clawPath(k.x, k.y, k.a, 18, 11, 0));
    const box = { x: CX - 140, y: -10, w: 280, h: 300 };
    const sil = new Sil(ctx, [trunk, ...webs, ...toes, ...clawPaths], box);
    const g = sil.g;
    sil.form({ base: orange, shadowTint: '#6a1a00', ramp: 0.8, form: 0.5, formSize: 26, bevel: 0.3, rim: 0.5 });
    // the webbing: thinner, darker, a little translucent, veined and stretched taut
    webs.forEach((w) => {
      clipTo(g, w, () => {
        g.fillStyle = rgba(mix(deepO, '#8a3a00', 0.35), 0.72);
        g.fillRect(box.x, box.y, box.w, box.h);
        texture(g, 'pores', box, 0.25, 1.4);
      });
    });
    for (let i = 0; i < ds.length - 1; i++) {
      for (let k = 1; k <= 3; k++) {
        const [ax, ay] = onDigit(ds[i], 0.15 + k * 0.2, -0.7);
        const [bx, by] = onDigit(ds[i + 1], 0.15 + k * 0.2, 0.7);
        softStroke(g, (c) => {
          c.moveTo(ax, ay);
          c.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 - 8, bx, by);
        }, rgba(shade(deepO, -0.4), 0.3), 1.6, 0.8);
      }
      // the web's free edge catches the light
      const [a1x, a1y] = onDigit(ds[i], 0.9, -0.4);
      const [b1x, b1y] = onDigit(ds[i + 1], 0.9, 0.4);
      softStroke(g, (c) => {
        c.moveTo(a1x, a1y - 3);
        c.quadraticCurveTo((a1x + b1x) / 2, (a1y + b1y) / 2 - 15, b1x, b1y - 3);
      }, rgba('#ffd8a0', 0.5), 2.2, 1);
    }
    // each toe its own rounded volume, raised over the webs, with scutes down its top
    ds.forEach((d, i) => {
      contact(g, (c) => {
        toes[i](c);
        c.fill();
      }, 0.45, 3, 4);
      clipTo(g, toes[i], () => {
        const [tx, ty] = digitTip(d);
        const tg = g.createLinearGradient(...onDigit(d, 0.5, 1), ...onDigit(d, 0.5, -1));
        tg.addColorStop(0, shade(orange, 0.25));
        tg.addColorStop(0.5, orange);
        tg.addColorStop(1, shade(orange, -0.3));
        g.fillStyle = tg;
        g.fillRect(Math.min(d.x, tx) - 40, Math.min(d.y, ty) - 40, Math.abs(tx - d.x) + 80, Math.abs(ty - d.y) + 80);
        texture(g, 'leather', box, 0.25, 1);
      });
      lobe(g, toes[i], { x: box.x, y: box.y, w: box.w, h: box.h }, d.y, d.y + 30, shade(deepO, -0.5), 0.55, 9, 0.35);
      scutes(g, d, 0.12, 0.9, 11, shade(deepO, -0.45), 0.55);
      spec(g, ...onDigit(d, 0.5, 0.35), d.len * 0.25, d.wr * 0.25, 0.3, d.a);
    });
    // the scaly trunk (the duck's leg runs into the foot) and the knuckle where the toes meet
    clipTo(g, trunk, () => texture(g, 'scales', box, 0.35, 1.1));
    ao(g, QUACK_ROOT[0], QUACK_ROOT[1] + 18, 30, 12, 0.35, 0, shade(deepO, -0.6));
    spec(g, QUACK_ROOT[0] - 10, QUACK_ROOT[1] + 6, 16, 8, 0.4, -0.6);
    for (const k of claws) paintClaw(g, k.x, k.y, k.a, 18, 11, 0, '#5a4030', '#120a06');
    sil.edge(rgba('#4a1000', 0.35), 18, LX * 10, LY * 10);
    sil.edge(rgba(LIGHT.rim, 0.5), 2.5, LX * 3, LY * 3);
    sil.finish(inkOf(deepO), { openTop: -6 });
  },
});

// ════════════════════════════ XENO TOES ════════════════════════════
// Three toes, zero manners: a glossy violet alien foot, three long jointed toes ending in glowing suction pads, dark
// spots and faintly glowing veins. In play its pads and veins pulse and green motes spark off it.

const XENO_REST: Digit[] = [
  { x: CX - 40, y: 150, a: Math.PI / 2 + 0.42, len: 104, wr: 24, wt: 13 },
  { x: CX + 4, y: 160, a: Math.PI / 2 + 0.02, len: 112, wr: 26, wt: 14 },
  { x: CX + 46, y: 150, a: Math.PI / 2 - 0.38, len: 104, wr: 24, wt: 13 },
];

const xenoBody: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 48, -8);
  c.lineTo(CX + 48, -8);
  c.bezierCurveTo(CX + 50, 40, CX + 92, 80, CX + 88, 140);
  c.bezierCurveTo(CX + 86, 170, CX + 60, 186, CX, 188);
  c.bezierCurveTo(CX - 60, 186, CX - 86, 170, CX - 88, 140);
  c.bezierCurveTo(CX - 92, 80, CX - 50, 40, CX - 48, -8);
  c.closePath();
};

function xenoPads(ds: Digit[]): { x: number; y: number; r: number }[] {
  return ds.map((d) => {
    const [x, y] = digitTip(d);
    return { x, y: y - 2, r: d.wt * 1.35 };
  });
}

const XENO_SPOTS: [number, number, number][] = [
  [CX - 40, 60, 9],
  [CX + 30, 40, 7],
  [CX - 10, 104, 11],
  [CX + 50, 112, 8],
  [CX - 60, 130, 6],
  [CX + 14, 160, 6],
];

function xenoGlow(g: Ctx, ds: Digit[], k: number, mint: string): void {
  for (const pd of xenoPads(ds)) {
    const rg = g.createRadialGradient(pd.x - 3, pd.y - 3, 1, pd.x, pd.y, pd.r * 1.6);
    rg.addColorStop(0, rgba('#ffffff', 0.95 * k));
    rg.addColorStop(0.35, rgba(mint, 0.85 * k));
    rg.addColorStop(1, rgba(mint, 0));
    g.fillStyle = rg;
    g.fillRect(pd.x - pd.r * 2, pd.y - pd.r * 2, pd.r * 4, pd.r * 4);
  }
  // veins of light from the ankle out along the toes
  softStroke(g, (c) => {
    for (const d of ds) {
      const [mx, my] = onDigit(d, 0.4, 0);
      c.moveTo(CX + (d.x - CX) * 0.2, 10);
      c.quadraticCurveTo(d.x, d.y - 30, mx, my);
    }
  }, rgba(mint, 0.55 * k), 3, 2);
}

registerStyle('xeno', {
  contactY: 284,
  rig: { from: 150, to: 172 },
  leg: { kind: 'skin', hw: 48, join: 'blend', fade: 24 },
  draw(ctx, art, p, o) {
    const violet = art.primary ?? '#9b6bff';
    const mint = art.secondary ?? '#7dffb0';
    const ds = poseDigits(XENO_REST, p, { spread: 0.18 });
    const toes = ds.map((d) => digitPath(d, 0.25));
    const pads = xenoPads(ds);
    const padPaths = pads.map((pd): PathFn => (c) => {
      c.beginPath();
      c.ellipse(pd.x, pd.y, pd.r, pd.r * 0.9, 0, 0, Math.PI * 2);
    });
    const box = { x: CX - 130, y: -10, w: 260, h: 300 };
    const sil = new Sil(ctx, [xenoBody, ...toes, ...padPaths], box);
    const g = sil.g;
    if (o.emissive) {
      xenoGlow(g, ds, 1, mint);
      sil.finish('rgba(0,0,0,0)', { w: 0.01, inner: 0 });
      return;
    }
    sil.form({ base: violet, shadowTint: '#1a0a4a', ramp: 0.9, form: 0.55, formSize: 28, bevel: 0.4, rim: 0.7 });
    texture(g, 'pores', box, 0.15, 1.2, 'soft-light');
    // spots, darker and a touch iridescent
    for (const [x, y, r] of XENO_SPOTS) {
      softFill(g, (c) => {
        c.beginPath();
        c.ellipse(x, y, r, r * 0.8, 0.3, 0, Math.PI * 2);
      }, rgba(mix(violet, '#1a0a5a', 0.55), 0.7), 1.5);
      spec(g, x - r * 0.3, y - r * 0.3, r * 0.4, r * 0.25, 0.25, -0.6, '#c8ffe8');
    }
    // the toes: jointed (two creases each), each its own form
    ds.forEach((d, i) => {
      lobe(g, toes[i], box, d.y - 10, d.y + 20, '#14063a', 0.55, 10, 0.35);
      for (const u of [0.32, 0.62]) {
        const [lx2, ly2] = onDigit(d, u, 0.85);
        const [rx2, ry2] = onDigit(d, u, -0.85);
        const [mx, my] = onDigit(d, u + 0.05, 0);
        crease(g, (c) => {
          c.moveTo(lx2, ly2);
          c.quadraticCurveTo(mx, my, rx2, ry2);
        }, 1.6, '#14063a', 0.5, 0.35);
      }
      spec(g, ...onDigit(d, 0.45, 0.4), d.len * 0.22, d.wr * 0.25, 0.5, d.a);
    });
    // the suction pads: wet, ringed, glowing from within (the glow layer pulses them in play)
    pads.forEach((pd) => {
      clipTo(g, padPaths[pads.indexOf(pd)], () => {
        const pg = g.createRadialGradient(pd.x - 3, pd.y - 3, 1, pd.x, pd.y, pd.r);
        pg.addColorStop(0, shade(mint, 0.5));
        pg.addColorStop(0.6, mint);
        pg.addColorStop(1, mix(mint, '#1a5a40', 0.6));
        g.fillStyle = pg;
        g.fillRect(pd.x - pd.r, pd.y - pd.r, pd.r * 2, pd.r * 2);
        g.strokeStyle = rgba('#1a5a40', 0.5);
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(pd.x, pd.y + 1, pd.r * 0.55, 0, Math.PI * 2);
        g.stroke();
      });
      ao(g, pd.x, pd.y - pd.r * 0.9, pd.r * 0.9, pd.r * 0.3, 0.45, 0, '#14063a');
      glint(g, pd.x - pd.r * 0.35, pd.y - pd.r * 0.35, pd.r * 0.35, 0.95);
    });
    xenoGlow(g, ds, 0.35, mint);
    // glossy alien skin
    spec(g, CX - 30, 60, 34, 12, 0.55, -1.1, '#ffffff');
    spec(g, CX - 54, 120, 16, 6, 0.4, -1.1, '#ffffff');
    sil.edge(rgba('#0a0420', 0.4), 18, LX * 10, LY * 10);
    sil.edge(rgba(mint, 0.45), 3, LX * 3, LY * 3);
    sil.finish(inkOf(violet), { openTop: -6 });
  },
});

// ════════════════════════════ DINO STOMPER ════════════════════════════
// Scaly, clawed and 65 million years hungry: a heavy green foot with three thick toes, horn scutes over the knuckles,
// a paler belly of scales and big hooked claws. In play its claws flex out before it drops, and every stomp shakes up
// dust and grit.

const DINO_REST: Digit[] = [
  { x: CX - 54, y: 126, a: Math.PI / 2 + 0.42, len: 96, wr: 31, wt: 25 },
  { x: CX + 2, y: 136, a: Math.PI / 2 + 0.01, len: 106, wr: 34, wt: 28 },
  { x: CX + 58, y: 126, a: Math.PI / 2 - 0.4, len: 96, wr: 31, wt: 25 },
];

const dinoBody: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 56, -8);
  c.lineTo(CX + 56, -8);
  c.bezierCurveTo(CX + 60, 40, CX + 104, 70, CX + 106, 130);
  c.bezierCurveTo(CX + 106, 160, CX + 80, 178, CX, 180);
  c.bezierCurveTo(CX - 80, 178, CX - 106, 160, CX - 106, 130);
  c.bezierCurveTo(CX - 104, 70, CX - 60, 40, CX - 56, -8);
  c.closePath();
};

function dinoClaws(ds: Digit[], p: Pose): { x: number; y: number; a: number; len: number; w: number; hook: number }[] {
  const c = Math.max(0, p.curl);
  return ds.map((d, i) => {
    const [x, y] = onDigit(d, 1 - d.wt * 0.6 / d.len, 0);
    return { x, y, a: d.a, len: (i === 1 ? 72 : 62) * (1 + c * 0.35), w: i === 1 ? 34 : 30, hook: (i === 0 ? 0.3 : i === 2 ? -0.3 : 0.06) * (1 + c) };
  });
}

registerStyle('dino', {
  contactY: 290,
  halfWidth: 110,
  rig: { from: 118, to: 140 },
  leg: { kind: 'skin', hw: 56, join: 'blend', fade: 26 },
  draw(ctx, art, p) {
    const green = art.primary ?? '#5fae4a';
    const horn = art.secondary ?? '#f2d36b';
    const ds = poseDigits(DINO_REST, p, { spread: 0.1 });
    const toes = ds.map((d) => digitPath(d, 0.18));
    const claws = dinoClaws(ds, p);
    const box = { x: CX - 140, y: -10, w: 280, h: 320 };
    const sil = new Sil(ctx, [dinoBody, ...toes, ...claws.map((k) => clawPath(k.x, k.y, k.a, k.len, k.w, k.hook))], box);
    const g = sil.g;
    const deep = mix(shade(green, -0.6), '#0a2030', 0.35);
    sil.form({ base: green, shadowTint: '#0a2838', ramp: 0.85, form: 0.6, formSize: 30, bevel: 0.35, rim: 0.5 });
    texture(g, 'scales', box, 0.55, 1.4);
    // a paler belly of scales down the middle, darker stripes across the back of the foot
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(CX, 120, 46, 70, 0, 0, Math.PI * 2);
    }, rgba(mix(green, '#f2e8a0', 0.45), 0.3), 14);
    for (const [y, w] of [[16, 70], [50, 84], [84, 92]] as const) {
      softFill(g, (c) => {
        c.beginPath();
        c.moveTo(CX - w, y);
        c.quadraticCurveTo(CX, y + 16, CX + w, y);
        c.quadraticCurveTo(CX, y + 26, CX - w, y + 10);
        c.closePath();
      }, rgba(deep, 0.25), 4);
    }
    // bony knobs along the top
    const r = rng(hashStr('dino-knobs'));
    for (let i = 0; i < 14; i++) {
      const x = CX - 70 + r() * 140;
      const y = 10 + r() * 140;
      const s = 3 + r() * 4;
      ao(g, x + 1.5, y + 2, s, s * 0.7, 0.35, 0, deep);
      spec(g, x - 1, y - 1, s * 0.8, s * 0.6, 0.45, -0.6, '#e8ffd0');
    }
    // deep shadow where the toes part
    for (let i = 0; i < ds.length - 1; i++) {
      const [ax, ay] = onDigit(ds[i], 0.55, -1);
      const [bx, by] = onDigit(ds[i + 1], 0.55, 1);
      softStroke(g, (c) => {
        c.moveTo((ax + bx) / 2, (ay + by) / 2 + 20);
        c.lineTo((ds[i].x + ds[i + 1].x) / 2, ds[i].y + 4);
      }, rgba(deep, 0.6), 7, 3);
    }
    // thick toes with horn scutes over the knuckles
    ds.forEach((d, i) => {
      lobe(g, toes[i], box, d.y - 6, d.y + 26, deep, 0.6, 12, 0.35);
      scutes(g, d, 0.12, 0.8, 5, deep, 0.6);
      spec(g, ...onDigit(d, 0.35, 0.35), d.len * 0.2, d.wr * 0.25, 0.3, d.a);
    });
    for (const k of claws) paintClaw(g, k.x, k.y, k.a, k.len, k.w, k.hook, horn, '#4a3410');
    sil.edge(rgba('#06141a', 0.4), 20, LX * 11, LY * 11);
    sil.edge(rgba(LIGHT.rim, 0.5), 2.5, LX * 3, LY * 3);
    sil.finish(inkOf(green), { openTop: -6 });
  },
});


