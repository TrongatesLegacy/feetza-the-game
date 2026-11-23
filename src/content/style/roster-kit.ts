// Shared helpers for the roster batch of the feet redesign (src/content/style/roster-*.ts): shoe silhouettes,
// lit pieces painted inside a silhouette, props with their own outline, glow layers, drips and a few materials the
// roster needs (patent leather, glass, linen, suede, dough, crust). Nothing here registers a foot.

import { CX } from '../../art/feetCommon';
import { type BareFoot, type BareLook, bareOutline, paintBare } from '../../art/style/bare';
import { LIGHT, type Box, type PathFn, type Pose, ao, formFill, inkOf, inside, spec, texture } from '../../art/style/kit';
import { type Material, MATERIALS } from '../../art/style/materials';
import { Sil } from '../../art/style/sil';
import { contact } from '../../art/style/details';
import { type Ctx, mix, rgba, shade } from '../../art/util';

export { CX };

/** The bare foot's toe band (as the pilots). */
export const BARE_RIG = { from: 140, to: 162 };
/** A shoe's toe band: only the toe box flexes. */
export const SHOE_RIG = { from: 150, to: 172 };

const M = (m: Material) => m;
/** Extra materials for the roster. */
export const RMAT = {
  /** Patent leather: near-black, mirror gloss. */
  patent: M({ name: 'Patent', base: '#16161c', shadowTint: '#05050a', ramp: 0.9, form: 0.55, bevel: 0.55, rim: 0.75, tex: 'grain', texA: 0.06, specA: 0.85, specSize: 0.12 }),
  /** Clear glass or polycarbonate (paint what's behind it first). */
  glass: M({ name: 'Glass', base: '#bcd8f0', shadowTint: '#203048', ramp: 0.5, form: 0.25, bevel: 0.7, rim: 0.9, specA: 0.7, specSize: 0.14 }),
  /** Linen: soft cloth, faint weave. */
  linen: M({ name: 'Linen', base: '#f7f5ef', shadowTint: '#5a5a8a', ramp: 0.5, form: 0.45, bevel: 0.25, rim: 0.35, tex: 'canvas', texA: 0.18, texScale: 0.9, specA: 0.08, specSize: 0.3 }),
  /** Suede: velvety nap, no gloss. */
  suede: M({ name: 'Suede', base: '#a0743e', shadowTint: '#3a1a10', ramp: 0.6, form: 0.55, bevel: 0.2, rim: 0.45, tex: 'grain', texA: 0.5, texScale: 1.2, specA: 0.04, specSize: 0.35 }),
  /** Dough: soft, floury, a faint sheen. */
  dough: M({ name: 'Dough', base: '#f2e2c2', shadowTint: '#9a6a3a', ramp: 0.6, form: 0.5, bevel: 0.3, rim: 0.3, tex: 'pores', texA: 0.3, specA: 0.15, specSize: 0.3 }),
  /** Baked crust: golden, blistered. */
  crust: M({ name: 'Crust', base: '#d9913a', shadowTint: '#5a2008', ramp: 0.75, form: 0.6, bevel: 0.4, rim: 0.35, tex: 'cast', texA: 0.35, specA: 0.25, specSize: 0.2 }),
  /** Gold: warm metal, hard highlights. */
  gold: M({ name: 'Gold', base: '#f7c948', shadowTint: '#7a3a08', ramp: 0.95, form: 0.6, bevel: 0.55, rim: 0.6, tex: 'brushed', texA: 0.1, specA: 0.75, specSize: 0.14 }),
  /** Sauce: glossy, wet. */
  sauce: M({ name: 'Sauce', base: '#c8231b', shadowTint: '#3a0408', ramp: 0.8, form: 0.5, bevel: 0.5, rim: 0.6, tex: 'speckle', texA: 0.12, specA: 0.8, specSize: 0.1 }),
  ...MATERIALS,
};
export type RMatId = keyof typeof RMAT;

/** A lit piece inside a silhouette: its contact shadow on what's under it, then the material. */
export function piece(g: Ctx, path: PathFn, box: Box, mat: RMatId | Material, base?: string, o: { shadow?: number; spec?: boolean; texA?: number; size?: number } = {}): void {
  if ((o.shadow ?? 0.3) > 0)
    contact(g, (c) => {
      path(c);
      c.fill();
    }, o.shadow ?? 0.3, 2.4, 3);
  const m = typeof mat === 'string' ? RMAT[mat] : mat;
  const b = base ?? m.base;
  // the form shadow sized for a detail, not the box it's laid out in (thin straps stay lit)
  const fs = o.size ?? Math.min(Math.min(box.w, box.h) * 0.16, 12);
  formFill(g, path, box, { base: b, shadowTint: m.shadowTint, ramp: m.ramp, form: m.form, bevel: m.bevel, rim: m.rim, formSize: fs });
  inside(g, path, () => {
    if (m.tex) texture(g, m.tex, box, o.texA ?? m.texA ?? 0.3, m.texScale ?? 1, m.texOp ?? 'overlay');
    if (o.spec !== false && m.specA > 0) {
      const r = Math.max(box.w, box.h) * m.specSize;
      spec(g, box.x + box.w * 0.34, box.y + box.h * 0.3, r, r * 0.6, m.specA, -0.7);
    }
  });
}

/** Clip to a path and run fn. */
export function within(g: Ctx, path: PathFn, fn: () => void): void {
  g.save();
  path(g);
  g.clip();
  fn();
  g.restore();
}

export function vgrad(g: Ctx, y0: number, y1: number, stops: [number, string][]): CanvasGradient {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  for (const [t, c] of stops) gr.addColorStop(t, c);
  return gr;
}

export function hgrad(g: Ctx, x0: number, x1: number, stops: [number, string][]): CanvasGradient {
  const gr = g.createLinearGradient(x0, 0, x1, 0);
  for (const [t, c] of stops) gr.addColorStop(t, c);
  return gr;
}

/** A shoe's shape: half width at the collar, at the ball, and where the toe ends. */
export interface ShoeShape {
  topY?: number;
  topW?: number;
  ballY?: number;
  ballW?: number;
  toeY?: number;
}

/** A shoe upper (collar at the top, round toe at the bottom); `flex` (the rig's curl) lifts the toe. */
export function upperPath(o: ShoeShape, flex: number): PathFn {
  const top = o.topY ?? 8;
  const tw = o.topW ?? 60;
  const by = o.ballY ?? 168;
  const bw = o.ballW ?? 99;
  const b = (o.toeY ?? 244) - flex * 6;
  return (c) => {
    c.beginPath();
    c.moveTo(CX - tw, top);
    c.bezierCurveTo(CX - tw - 6, top + 52, CX - bw + 1, by - 68, CX - bw, by);
    c.bezierCurveTo(CX - bw - 1, b - 14, CX - bw * 0.56, b, CX, b);
    c.bezierCurveTo(CX + bw * 0.56, b, CX + bw + 2, b - 14, CX + bw + 1, by);
    c.bezierCurveTo(CX + bw, by - 68, CX + tw + 6, top + 52, CX + tw, top);
    c.closePath();
  };
}

/** A sole under an upper: wraps up the sides from `from` and runs `thick` below the toe. */
export function solePath(o: ShoeShape, flex: number, thick = 20, from = 160, flare = 3): PathFn {
  const bw = (o.ballW ?? 99) + flare;
  const b = (o.toeY ?? 244) + thick - flex * 5;
  return (c) => {
    c.beginPath();
    c.moveTo(CX - bw, from);
    c.bezierCurveTo(CX - bw - 6, from + 50, CX - bw - 2, b - 6, CX - bw * 0.6, b);
    c.lineTo(CX + bw * 0.6, b);
    c.bezierCurveTo(CX + bw + 2, b - 6, CX + bw + 6, from + 50, CX + bw, from);
    c.closePath();
  };
}

/** The finishing light every shoe gets over its whole silhouette: a broad form shadow and the cool rim. */
export function finishLight(sil: Sil, base: string, tint = '#2a1030', form = 0.4): void {
  const [lx, ly] = LIGHT.dir;
  sil.edge(rgba(mix(shade(base, -0.7), tint, 0.4), form), 18, lx * 10, ly * 10);
  sil.edge(rgba(LIGHT.rim, 0.5), 2.5, lx * 3, ly * 3);
}

/** A prop with its own silhouette and outline, drawn straight onto ctx. */
export function prop(ctx: Ctx, parts: PathFn[], box: Box, draw: (g: Ctx, sil: Sil) => void, ink: string, o: { w?: number; inner?: number } = {}): void {
  const s = new Sil(ctx, parts, box);
  draw(s.g, s);
  s.finish(ink, { w: o.w, inner: o.inner });
}

/** The glowing layer of a foot (emissive or heat): paint on g, kept inside `parts`, no outline. */
export function glowLayer(ctx: Ctx, parts: PathFn[], box: Box, draw: (g: Ctx) => void): void {
  const s = new Sil(ctx, parts, box);
  draw(s.g);
  s.finish('rgba(0,0,0,0)', { w: 0.01, inner: 0 });
}

/** A glow blob (radial), for emissive layers and lamps. */
export function glowDot(g: Ctx, x: number, y: number, r: number, col: string, a = 1): void {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(mix(col, '#ffffff', 0.5), a));
  gr.addColorStop(0.35, rgba(col, a * 0.7));
  gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

/** A liquid drip hanging from (x, y): `len` long, `w` wide, with a round bead and a wet highlight. */
export function dripPath(x: number, y: number, len: number, w: number): PathFn {
  return (c) => {
    c.beginPath();
    c.moveTo(x - w, y - 2);
    c.bezierCurveTo(x - w * 0.7, y + len * 0.4, x - w * 0.5, y + len * 0.7, x - w * 0.9, y + len);
    c.arc(x, y + len, w * 0.95, Math.PI, 0, true);
    c.bezierCurveTo(x + w * 0.5, y + len * 0.7, x + w * 0.7, y + len * 0.4, x + w, y - 2);
    c.closePath();
  };
}

/** A wet glossy blob highlight along a drip or bead. */
export function wet(g: Ctx, x: number, y: number, rx: number, ry: number, a = 0.85): void {
  spec(g, x, y, rx, ry, a, -0.6);
}

/** A bare foot from the kit with a story painted on it; `after` paints over its outline (props in front). */
export function bareWith(ctx: Ctx, look: BareLook, p: Pose, story?: (g: Ctx, f: BareFoot) => void, ink?: string): BareFoot {
  const f = paintBare(ctx, look, p);
  story?.(f.sil.g, f);
  bareOutline(f, ink);
  return f;
}

/** Ellipse path helper. */
export const ell = (x: number, y: number, rx: number, ry: number, rot = 0): PathFn => (c) => {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
};

/** Rounded rect path helper. */
export const rrect = (x: number, y: number, w: number, h: number, r: number): PathFn => (c) => {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
};

/** A soft ambient-occlusion band across the foot (under a strap or a cuff). */
export function band(g: Ctx, y: number, w: number, a = 0.3, col = LIGHT.ao): void {
  ao(g, CX, y, w, 7, a, 0, col);
}

/** The ink for a base colour. */
export { inkOf };

/** A loose feather (falling off a bird), at the origin, pointing down-right. */
export function drawFeather(g: Ctx, col: string): void {
  g.save();
  g.rotate(0.6);
  const vane: PathFn = (c) => {
    c.beginPath();
    c.moveTo(0, -16);
    c.bezierCurveTo(9, -10, 8, 8, 0, 16);
    c.bezierCurveTo(-8, 8, -8, -10, 0, -16);
    c.closePath();
  };
  g.fillStyle = vgrad(g, -16, 16, [[0, shade(col, 0.3)], [1, shade(col, -0.3)]]);
  vane(g);
  g.fill();
  g.strokeStyle = rgba(shade(col, -0.5), 0.8);
  g.lineWidth = 1.4;
  vane(g);
  g.stroke();
  g.strokeStyle = rgba('#ffffff', 0.8);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, -14);
  g.lineTo(0, 20);
  g.stroke();
  g.restore();
}
