// Helpers for the base roster batch (src/content/style/base-*.ts): small things the batch's feet share. Nothing
// here registers a foot; the shared kit lives in src/art/style.

import { CX } from '../../art/feetCommon';
import { type BareFoot, type BareLook, bareFoot } from '../../art/style/bare';
import { type StyleToe, cleft, onToe } from '../../art/style/anatomy';
import { LIGHT, type PathFn, type Pose, ao, glint, softFill, spec, texture } from '../../art/style/kit';
import { contact } from '../../art/style/details';
import { type Ctx, mix, rgba, shade } from '../../art/util';

export const [LX, LY] = LIGHT.dir;

/** The bare feet's toe band (as the pilots): poses only move the toes. */
export const BARE_RIG = { from: 140, to: 162 };

/** Run fn clipped to path. */
export function clipTo(g: Ctx, path: PathFn, fn: () => void): void {
  g.save();
  path(g);
  g.clip();
  fn();
  g.restore();
}

/** A toe's ellipse as a path. */
export const toePath = (t: StyleToe): PathFn => (c: Ctx) => {
  c.beginPath();
  c.ellipse(t.cx, t.cy, t.rx, t.ry, t.rot, 0, Math.PI * 2);
};

/** The emissive layer of a bare foot: the silhouette only (no paint), `fn` paints the glowing parts, clipped to it. */
export function bareEmissive(ctx: Ctx, look: BareLook, p: Pose, fn: (g: Ctx, f: BareFoot) => void): void {
  const f = bareFoot(ctx, look, p);
  fn(f.sil.g, f);
  f.sil.finish('rgba(0,0,0,0)', { w: 0.01, inner: 0 });
}

/** The clefts between a bare foot's toes. */
export function clefts(toes: StyleToe[]): [number, number][] {
  return toes.slice(0, -1).map((t, i) => cleft(t, toes[i + 1]));
}

/** A glossy wet highlight streak (polish, sweat, slime): a soft spec with a hot core glint. */
export function wetGlint(g: Ctx, x: number, y: number, s: number, a = 0.9): void {
  spec(g, x, y, s, s * 0.45, a * 0.8, -0.6);
  glint(g, x - s * 0.1, y - s * 0.05, s * 0.45, a);
}

/** A bead of liquid sitting on a surface (sweat, water): its shadow, a tinted body, a bright lit cap. */
export function bead(g: Ctx, x: number, y: number, r: number, tint = '#e8f4ff', a = 0.7): void {
  contact(g, (c) => {
    c.beginPath();
    c.ellipse(x, y, r, r * 1.15, 0, 0, Math.PI * 2);
    c.fill();
  }, 0.25, r * 0.4, r * 0.6);
  const bg = g.createRadialGradient(x + r * 0.25, y + r * 0.35, r * 0.1, x, y, r * 1.1);
  bg.addColorStop(0, rgba(tint, a * 0.15));
  bg.addColorStop(0.7, rgba(tint, a * 0.4));
  bg.addColorStop(1, rgba(shade(tint, -0.5), a * 0.55));
  g.fillStyle = bg;
  g.beginPath();
  g.ellipse(x, y, r, r * 1.15, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = rgba('#ffffff', 0.9 * a + 0.1);
  g.beginPath();
  g.ellipse(x - r * 0.35, y - r * 0.4, r * 0.32, r * 0.22, -0.6, 0, Math.PI * 2);
  g.fill();
}

/** A strap or band across a surface (sandal straps, bandages): a lit band from a to b with a cast shadow and edges. */
export function strap(g: Ctx, pts: [number, number][], w: number, col: string, o: { tex?: 'leather' | 'canvas' | 'rubber' | 'grain'; stitch?: string; shadow?: number; gloss?: number } = {}): void {
  const draw = (c: Ctx) => {
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  };
  contact(g, (c) => {
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.lineWidth = w;
    c.strokeStyle = '#000';
    draw(c);
    c.stroke();
  }, o.shadow ?? 0.5, 2.6, 3);
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  draw(g);
  g.strokeStyle = mix(shade(col, -0.55), '#1a0e10', 0.35);
  g.lineWidth = w + 2.2;
  g.stroke();
  draw(g);
  g.strokeStyle = col;
  g.lineWidth = w;
  g.stroke();
  // the lit top edge and a darker lower half
  g.translate(-LX * w * 0.18, -LY * w * 0.18);
  draw(g);
  g.strokeStyle = rgba(shade(col, 0.45), 0.55);
  g.lineWidth = w * 0.32;
  g.stroke();
  g.restore();
  g.save();
  g.lineCap = 'round';
  g.translate(LX * w * 0.22, LY * w * 0.22);
  draw(g);
  g.strokeStyle = rgba(shade(col, -0.45), 0.35);
  g.lineWidth = w * 0.4;
  g.stroke();
  g.restore();
  if (o.stitch) {
    g.save();
    g.setLineDash([2.6, 2.4]);
    g.lineCap = 'round';
    draw(g);
    g.strokeStyle = o.stitch;
    g.lineWidth = 1.1;
    g.stroke();
    g.restore();
  }
  if (o.gloss) {
    const [x0, y0] = pts[0];
    const [x1, y1] = pts[pts.length - 1];
    spec(g, x0 + (x1 - x0) * 0.35, y0 + (y1 - y0) * 0.35, w * 1.4, w * 0.3, o.gloss, Math.atan2(y1 - y0, x1 - x0));
  }
}

/** Soft ground contact under the toes (where a sole or the toes press: used by still art only). */
export function groundHaze(ctx: Ctx, y: number, rx: number, col: string, a: number): void {
  softFill(ctx, (c) => {
    c.beginPath();
    c.ellipse(CX, y, rx, 14, 0, 0, Math.PI * 2);
  }, rgba(col, a), 8);
}

/** Paint the inside of a closed path as a lit cylinder band across x (straps, soles, cuffs): light left, rim right. */
export function bandShade(g: Ctx, x0: number, x1: number, y0: number, y1: number, a = 0.35): void {
  const sh = g.createLinearGradient(x0, 0, x1, 0);
  sh.addColorStop(0, rgba('#000000', a * 0.5));
  sh.addColorStop(0.22, rgba(LIGHT.key, a * 0.5));
  sh.addColorStop(0.55, rgba('#000000', 0));
  sh.addColorStop(0.88, rgba('#000000', a * 0.7));
  sh.addColorStop(1, rgba(LIGHT.rim, a * 0.6));
  g.fillStyle = sh;
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
}

/** The rim light and the broad shadow the pilots put over a finished silhouette, before its outline. */
export function silLight(sil: { edge(col: string, blur: number, dx: number, dy: number): void }, deep: string, a = 0.4, size = 18, rim = 0.5): void {
  sil.edge(rgba(deep, a), size, LX * size * 0.55, LY * size * 0.55);
  sil.edge(rgba(LIGHT.rim, rim), 2.5, LX * 3, LY * 3);
}

/** A texture over a whole box (convenience). */
export function tex(g: Ctx, kind: Parameters<typeof texture>[1], box: { x: number; y: number; w: number; h: number }, a: number, scale = 1, op: GlobalCompositeOperation = 'overlay'): void {
  texture(g, kind, box, a, scale, op);
}

/** A point on a toe (re-export for the batch). */
export { onToe, ao };

/** The top of a toe's nail (where polish shines). */
export function nailTop(t: StyleToe): [number, number] {
  const [x, y] = onToe(t, Math.PI / 2);
  return [x - Math.sin(t.rot) * t.ry * 0.05, y - t.ry * 0.42];
}

/** Grow a finished-painting silhouette by more parts (a sole under a bare foot, icicles, tufts): they join the mask,
 * so the one outline goes round them too. Paint them on sil.g yourself (see layerOn for parts behind the foot). */
export function extendSil(sil: { mask: HTMLCanvasElement }, parts: PathFn[]): void {
  const m = sil.mask.getContext('2d')!;
  m.fillStyle = '#fff';
  for (const p of parts) {
    p(m);
    m.fill();
  }
  // the silhouette's cached outside is stale now
  (sil as unknown as { outside: HTMLCanvasElement | null }).outside = null;
}

/** Paint on a fresh layer in g's frame, then lay it on g with `op` (destination-over puts it behind what's there). */
export function layerOn(g: Ctx, op: GlobalCompositeOperation, fn: (l: Ctx) => void): void {
  const c = document.createElement('canvas');
  c.width = g.canvas.width;
  c.height = g.canvas.height;
  const l = c.getContext('2d')!;
  l.setTransform(g.getTransform());
  l.lineJoin = 'round';
  l.lineCap = 'round';
  fn(l);
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = op;
  g.drawImage(c, 0, 0);
  g.restore();
}

/** Draw text centred at (x, y) along the current transform (tattoos, signatures). */
export function label(g: Ctx, text: string, x: number, y: number, px: number, col: string, rot = 0, font = "'Lilita One', Impact, sans-serif", weight = '400'): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.font = `${weight} ${px}px ${font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = col;
  g.fillText(text, 0, 0);
  g.restore();
}

/** Carry a leg tile's cylinder shading (src/art/style/legs.ts) down onto a blended foot's top, fading out by y1, so
 * the leg's shaded side doesn't stop in a band at the join. */
export function legShade(g: Ctx, hw: number, y1: number, k = 1): void {
  const x0 = CX - hw;
  const w = hw * 2;
  for (let y = -8; y < y1; y += 2) {
    const a = k * Math.pow(1 - (y + 8) / (y1 + 8), 1.4);
    const sh = g.createLinearGradient(x0, 0, x0 + w, 0);
    sh.addColorStop(0, rgba('#000000', 0.12 * a));
    sh.addColorStop(0.25, rgba(LIGHT.key, 0.1 * a));
    sh.addColorStop(0.55, rgba('#000000', 0));
    sh.addColorStop(0.9, rgba('#000000', 0.22 * a));
    sh.addColorStop(1, rgba('#000000', 0.08 * a));
    g.fillStyle = sh;
    g.fillRect(x0 - 30, y, w + 60, 2);
  }
}
