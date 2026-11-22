// Helpers for the bosses' and mini-bosses' styled art (src/content/style/bosses*.ts): gradients, lit sub-panels,
// a fur coat, the overheat layer (hot glow from the sole up) and the glow-only finish. Built on the shared kit
// (kit.ts, sil.ts, materials.ts, details.ts); nothing here changes them.

import { type Ctx, mix, rgba, shade } from '../util';
import { type Box, LIGHT, type PathFn, inside } from './kit';
import { type MaterialId, paint } from './materials';
import type { Sil } from './sil';
import { blotches, contact } from './details';

export const [LX, LY] = LIGHT.dir;

export type Stops = [number, string][];

/** A linear gradient from stops. */
export function lin(g: Ctx, x0: number, y0: number, x1: number, y1: number, stops: Stops): CanvasGradient {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}

/** A radial gradient from stops. */
export function rad(g: Ctx, x0: number, y0: number, r0: number, x1: number, y1: number, r1: number, stops: Stops): CanvasGradient {
  const gr = g.createRadialGradient(x0, y0, r0, x1, y1, r1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}

/** Fill a path. */
export function fill(g: Ctx, path: PathFn, f: string | CanvasGradient | CanvasPattern): void {
  path(g);
  g.fillStyle = f;
  g.fill();
}

/** A raised sub-panel inside a silhouette (a strap, a plate, a cuff): its contact shadow on what's under it, then
 * the material lit by the one light, clipped to its path. */
export function panel(g: Ctx, path: PathFn, box: Box, mat: MaterialId, base: string, o: { shadow?: number; texA?: number; spec?: boolean } = {}): void {
  if ((o.shadow ?? 0.45) > 0)
    contact(g, (c) => {
      path(c);
      c.fill();
    }, o.shadow ?? 0.45, 2.4, 3);
  paint(g, path, box, mat, base, { texA: o.texA, spec: o.spec });
}

/** Run fn clipped to a path. */
export const clip = inside;

/** The one light over the whole silhouette, then its cool rim (call before finish). */
export function lightAll(sil: Sil, a = 0.42, size = 20, rim = 0.55): void {
  sil.edge(rgba('#06060e', a), size, LX * size * 0.55, LY * size * 0.55);
  sil.edge(rgba(LIGHT.rim, rim), 2.5, LX * 3, LY * 3);
}

/** Finish a glow-only layer (emissive or heat): clip to the silhouette, no outline. */
export function glowFinish(sil: Sil): void {
  sil.finish('rgba(0,0,0,0)', { w: 0.01, inner: 0 });
}

export interface HeatOpts {
  /** Sole (hottest) and top (cool) design y. */
  y0?: number;
  y1?: number;
  /** Hot core, mid and deep colours (default: yellow-white, orange, dull red). */
  hot?: string;
  mid?: string;
  deep?: string;
  seed: number;
  /** Strength 0…1 (default 1). */
  a?: number;
  /** Patchiness: how much of the glow the noise eats (0…1, default 0.6). */
  patch?: number;
}

/**
 * The overheat layer every boss gets in its later phases (drawn additively over the foot): heat rising from the sole,
 * patchy like real heat, a hot rim just inside the silhouette's edge, then the glow-only finish. Draw any seams that
 * run hotter on sil.g before calling it.
 */
export function heatLayer(sil: Sil, box: Box, o: HeatOpts): void {
  const g = sil.g;
  const y0 = o.y0 ?? box.y + box.h;
  const y1 = o.y1 ?? box.y + 20;
  const a = o.a ?? 1;
  const hot = o.hot ?? '#ffc050';
  const mid = o.mid ?? '#ff6a1a';
  const deep = o.deep ?? '#b01a08';
  g.fillStyle = lin(g, 0, y0, 0, y1, [
    [0, rgba(hot, 0.78 * a)],
    [0.16, rgba(mid, 0.62 * a)],
    [0.45, rgba(deep, 0.4 * a)],
    [0.8, rgba(deep, 0.14 * a)],
    [1, rgba(deep, 0)],
  ]);
  g.fillRect(box.x, box.y, box.w, box.h);
  blotches(g, box, '#000000', o.patch ?? 0.6, 26, 0.42, 0.3, o.seed, 'destination-out');
  sil.edge(rgba(mix(mid, hot, 0.4), 0.85 * a), 9, 0, 0);
  glowFinish(sil);
}

/** A fur coat: strands flowing along flow(x, y), in passes from the dark undercoat to lit tips, lit from the top
 * left and falling into shadow at the bottom right. Paint it clipped to the furry part. */
export function furCoat(g: Ctx, r: () => number, area: Box, flow: (x: number, y: number) => number, fur: string, deep: string, o: { n?: number; len?: number; w?: number } = {}): void {
  const n = o.n ?? 1;
  const L = o.len ?? 16;
  const lw = o.w ?? 1;
  const passes: [number, number, { dark: string; mid: string; light: string }][] = [
    [Math.round(1300 * n), L, { dark: deep, mid: shade(fur, -0.38), light: shade(fur, -0.16) }],
    [Math.round(1100 * n), L * 0.9, { dark: shade(fur, -0.3), mid: fur, light: shade(fur, 0.2) }],
    [Math.round(520 * n), L * 0.75, { dark: fur, mid: shade(fur, 0.25), light: mix(shade(fur, 0.5), LIGHT.key, 0.2) }],
  ];
  g.save();
  g.lineCap = 'round';
  for (const [count, len, t] of passes) {
    for (let i = 0; i < count; i++) {
      const x = area.x + r() * area.w;
      const y = area.y + r() * area.h;
      const a = flow(x, y) + (r() - 0.5) * 0.42;
      const l = len * (0.6 + r() * 0.7);
      const k = r();
      const col = k < 0.33 ? t.dark : k < 0.8 ? t.mid : t.light;
      const shadeK = Math.max(0, Math.min(1, ((x - area.x) / area.w - 0.5 + (y - area.y) / area.h - 0.5) * 0.7 + 0.5));
      g.strokeStyle = rgba(col, (0.35 + r() * 0.45) * (col === t.light ? 1 - shadeK * 0.8 : 1));
      g.lineWidth = (1 + r() * 1.6) * lw;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a + 0.3) * l * 0.5, y + Math.sin(a + 0.3) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
  }
  g.restore();
}

/** A glossy wet/patent highlight streak: a long soft band along a curve. */
export function streak(g: Ctx, draw: (c: Ctx) => void, w: number, a: number, col = '#ffffff'): void {
  g.save();
  g.lineCap = 'round';
  g.beginPath();
  draw(g);
  g.strokeStyle = rgba(col, a * 0.35);
  g.lineWidth = w * 2.2;
  g.stroke();
  g.beginPath();
  draw(g);
  g.strokeStyle = rgba(col, a);
  g.lineWidth = w;
  g.stroke();
  g.restore();
}

/** A gold or brass ramp for trims. */
export function goldRamp(g: Ctx, x0: number, y0: number, x1: number, y1: number, gold = '#f2c14e'): CanvasGradient {
  return lin(g, x0, y0, x1, y1, [
    [0, mix(gold, '#fffbe0', 0.6)],
    [0.3, gold],
    [0.55, shade(gold, -0.35)],
    [0.75, shade(gold, 0.15)],
    [1, shade(gold, -0.55)],
  ]);
}

/** A soft glow blob (emissive layers and lit gems). */
export function glowDot(g: Ctx, x: number, y: number, r: number, col: string, a = 1): void {
  g.fillStyle = rad(g, x, y, 0, x, y, r, [
    [0, rgba(mix(col, '#ffffff', 0.6), a)],
    [0.35, rgba(col, a * 0.7)],
    [1, rgba(col, 0)],
  ]);
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}
