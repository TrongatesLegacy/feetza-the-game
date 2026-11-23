// Shared helpers for batch D of the feet redesign (Acts 1b, 2a, 7 and 8: src/content/style/acts-d-*.ts): the
// overheat layer every boss gets, fur coats, Norse runes, ice, frost and a few extra materials (ice, bone, hide,
// sandstone, glossy rubber, brass). Nothing here registers a foot.

import { LIGHT, type Box, type PathFn, ao, softStroke, spec } from '../../art/style/kit';
import type { Material } from '../../art/style/materials';
import { Sil } from '../../art/style/sil';
import { blotches } from '../../art/style/details';
import { type Ctx, mix, rgba, shade } from '../../art/util';
import { CX, RMAT } from './roster-kit';

export const [LX, LY] = LIGHT.dir;

const M = (m: Material) => m;
/** Extra materials for batch D. */
export const DMAT = {
  ...RMAT,
  /** Glacier ice: translucent, cold, hard glints (paint the inner cracks on top). */
  ice: M({ name: 'Ice', base: '#9fd0ee', shadowTint: '#103a6a', ramp: 0.8, form: 0.4, bevel: 0.7, rim: 0.95, tex: 'speckle', texA: 0.08, specA: 0.8, specSize: 0.12 }),
  /** Bone and horn: chalky, a soft sheen. */
  bone: M({ name: 'Bone', base: '#efe6cf', shadowTint: '#5a3a20', ramp: 0.7, form: 0.55, bevel: 0.4, rim: 0.4, tex: 'pores', texA: 0.25, specA: 0.3, specSize: 0.18 }),
  /** Monster hide: thick, pebbled, a greasy sheen. */
  hide: M({ name: 'Hide', base: '#5d6b4a', shadowTint: '#101a10', ramp: 0.75, form: 0.6, bevel: 0.35, rim: 0.5, tex: 'leather', texA: 0.45, texScale: 1.8, specA: 0.2, specSize: 0.2 }),
  /** Sandstone: warm, gritty, no gloss. */
  sandstone: M({ name: 'Sandstone', base: '#d8bf8e', shadowTint: '#5a2a10', ramp: 0.65, form: 0.6, bevel: 0.4, rim: 0.4, tex: 'stone', texA: 0.4, texScale: 1.1, specA: 0.04, specSize: 0.2 }),
  /** Glossy wet rubber (galoshes). */
  gloss: M({ name: 'Gloss rubber', base: '#f2c230', shadowTint: '#5a2a08', ramp: 0.75, form: 0.55, bevel: 0.55, rim: 0.6, tex: 'rubber', texA: 0.15, specA: 0.7, specSize: 0.13 }),
  /** Brass: warm, a softer sheen than gold. */
  brass: M({ name: 'Brass', base: '#c89a3a', shadowTint: '#4a2a08', ramp: 0.9, form: 0.6, bevel: 0.5, rim: 0.5, tex: 'brushed', texA: 0.12, specA: 0.6, specSize: 0.14 }),
};
export type DMatId = keyof typeof DMAT;

/** Paint an overheat (or emissive) layer: `draw` paints on a layer kept inside `parts`, no outline. */
export function glowOnly(ctx: Ctx, parts: PathFn[], box: Box, draw: (g: Ctx, sil: Sil) => void): void {
  const s = new Sil(ctx, parts, box);
  draw(s.g, s);
  s.finish('rgba(0,0,0,0)', { w: 0.01, inner: 0 });
}

/** The standard boss overheat: heat climbing from the sole (y1) up to y0, patchy like real heat, hottest at the
 * bottom. `hot` is the hot colour (default forge orange). */
export function heatRise(g: Ctx, box: Box, y0: number, y1: number, seed: number, hot = '#ff6a1a', a = 1): void {
  const hg = g.createLinearGradient(0, y1, 0, y0);
  hg.addColorStop(0, rgba(mix(hot, '#ffe08a', 0.55), 0.78 * a));
  hg.addColorStop(0.18, rgba(hot, 0.62 * a));
  hg.addColorStop(0.48, rgba(mix(hot, '#b8100a', 0.6), 0.4 * a));
  hg.addColorStop(0.85, rgba('#6a0804', 0.14 * a));
  hg.addColorStop(1, rgba('#6a0804', 0));
  g.fillStyle = hg;
  g.fillRect(box.x, box.y, box.w, box.h);
  blotches(g, box, '#000000', 0.55, 24, 0.44, 0.3, seed, 'destination-out');
}

/** A seam or crack that runs hot (for heat and glow layers): a soft wide glow with a bright core. */
export function hotLine(g: Ctx, draw: (c: Ctx) => void, col: string, w: number, a = 0.85): void {
  softStroke(g, draw, rgba(col, a * 0.7), w * 2.6, w * 1.4);
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  draw(g);
  g.strokeStyle = rgba(mix(col, '#fff6d0', 0.55), a);
  g.lineWidth = w * 0.6;
  g.stroke();
  g.restore();
}

/** Fur strands over an area, flowing along flow(x, y), lit from the top left (three passes: undercoat, mid, tips). */
export function furCoat(g: Ctx, r: () => number, area: Box, fur: string, n: number, len: number, flow: (x: number, y: number) => number, tint = '#141428'): void {
  const deep = mix(shade(fur, -0.6), tint, 0.3);
  const passes: [number, number, { dark: string; mid: string; light: string }][] = [
    [n, len, { dark: deep, mid: shade(fur, -0.35), light: shade(fur, -0.15) }],
    [n * 0.8, len * 0.9, { dark: shade(fur, -0.3), mid: fur, light: shade(fur, 0.2) }],
    [n * 0.4, len * 0.75, { dark: fur, mid: shade(fur, 0.25), light: shade(fur, 0.5) }],
  ];
  g.save();
  g.lineCap = 'round';
  for (const [m, l0, tn] of passes) {
    for (let i = 0; i < m; i++) {
      const x = area.x + r() * area.w;
      const y = area.y + r() * area.h;
      const a = flow(x, y) + (r() - 0.5) * 0.4;
      const l = l0 * (0.6 + r() * 0.7);
      const t = r();
      const col = t < 0.33 ? tn.dark : t < 0.8 ? tn.mid : tn.light;
      const sk = Math.max(0, Math.min(1, ((x - CX) / 110 + (y - 100) / 160) * 0.5 + 0.5));
      g.strokeStyle = rgba(col, (0.35 + r() * 0.45) * (col === tn.light ? 1 - sk * 0.8 : 1));
      g.lineWidth = 1 + r() * 1.6;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a + 0.3) * l * 0.5, y + Math.sin(a + 0.3) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
  }
  g.restore();
}

/** Elder Futhark-ish rune glyphs as strokes in a cell (w × h) at (x, y): index picks the rune. */
export function runeGlyph(c: Ctx, i: number, x: number, y: number, w: number, h: number): void {
  const L = (x0: number, y0: number, x1: number, y1: number) => {
    c.moveTo(x + x0 * w, y + y0 * h);
    c.lineTo(x + x1 * w, y + y1 * h);
  };
  switch (((i % 8) + 8) % 8) {
    case 0: // fehu
      L(0.3, 0, 0.3, 1);
      L(0.3, 0.15, 0.8, 0);
      L(0.3, 0.45, 0.8, 0.28);
      break;
    case 1: // thurisaz
      L(0.3, 0, 0.3, 1);
      L(0.3, 0.25, 0.75, 0.5);
      L(0.75, 0.5, 0.3, 0.75);
      break;
    case 2: // algiz
      L(0.5, 0, 0.5, 1);
      L(0.5, 0.45, 0.12, 0.05);
      L(0.5, 0.45, 0.88, 0.05);
      break;
    case 3: // tiwaz
      L(0.5, 0, 0.5, 1);
      L(0.5, 0, 0.15, 0.32);
      L(0.5, 0, 0.85, 0.32);
      break;
    case 4: // sowilo
      L(0.7, 0, 0.3, 0.4);
      L(0.3, 0.4, 0.7, 0.6);
      L(0.7, 0.6, 0.3, 1);
      break;
    case 5: // kenaz
      L(0.75, 0, 0.25, 0.5);
      L(0.25, 0.5, 0.75, 1);
      break;
    case 6: // ingwaz
      L(0.5, 0, 0.15, 0.5);
      L(0.15, 0.5, 0.5, 1);
      L(0.5, 1, 0.85, 0.5);
      L(0.85, 0.5, 0.5, 0);
      break;
    case 7: // othala
      L(0.5, 0, 0.18, 0.35);
      L(0.18, 0.35, 0.5, 0.7);
      L(0.5, 0.7, 0.82, 0.35);
      L(0.82, 0.35, 0.5, 0);
      L(0.5, 0.7, 0.15, 1);
      L(0.5, 0.7, 0.85, 1);
      break;
  }
}

/** A carved rune: a dark groove with a lit lip (or, with `glow`, a glowing cut). */
export function carvedRune(g: Ctx, i: number, x: number, y: number, w: number, h: number, dark: string, glow?: string): void {
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (glow) {
    hotLine(g, (c) => runeGlyph(c, i, x, y, w, h), glow, Math.max(2, w * 0.16));
    g.restore();
    return;
  }
  g.translate(-LX * 1.2, -LY * 1.2);
  g.beginPath();
  runeGlyph(g, i, x, y, w, h);
  g.strokeStyle = rgba(LIGHT.key, 0.35);
  g.lineWidth = Math.max(1.4, w * 0.12);
  g.stroke();
  g.restore();
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  runeGlyph(g, i, x, y, w, h);
  g.strokeStyle = rgba(dark, 0.75);
  g.lineWidth = Math.max(1.6, w * 0.14);
  g.stroke();
  g.restore();
}

/** Hoarfrost over an area: patchy white rime and tiny feathered crystals, fading out softly towards the area's top
 * and bottom (fadeTop/fadeBottom: fractions of its height), so it never shows the box it was laid in. */
export function hoarfrost(g: Ctx, box: Box, r: () => number, a: number, seed: number, n = 60, fadeTop = 0.45, fadeBottom = 0.2): void {
  const c = document.createElement('canvas');
  c.width = g.canvas.width;
  c.height = g.canvas.height;
  const x = c.getContext('2d')!;
  x.setTransform(g.getTransform());
  blotches(x, box, '#f4fbff', 0.55 * a, 20, 0.5, 0.18, seed);
  blotches(x, box, '#ffffff', 0.5 * a, 8, 0.62, 0.08, seed + 7);
  x.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const px = box.x + r() * box.w;
    const py = box.y + r() * box.h;
    const s = 2 + r() * 4;
    x.strokeStyle = rgba('#ffffff', (0.4 + r() * 0.5) * a);
    x.lineWidth = 0.8;
    x.beginPath();
    for (let k = 0; k < 3; k++) {
      const an = (k / 3) * Math.PI + r() * 0.3;
      x.moveTo(px - Math.cos(an) * s, py - Math.sin(an) * s);
      x.lineTo(px + Math.cos(an) * s, py + Math.sin(an) * s);
    }
    x.stroke();
  }
  // soft edges: fade in from the top, out at the bottom, and in from the sides
  x.globalCompositeOperation = 'destination-in';
  const fy = x.createLinearGradient(0, box.y, 0, box.y + box.h);
  fy.addColorStop(0, 'rgba(0,0,0,0)');
  fy.addColorStop(fadeTop, 'rgba(0,0,0,1)');
  fy.addColorStop(1 - fadeBottom, 'rgba(0,0,0,1)');
  fy.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = fy;
  x.fillRect(box.x, box.y, box.w, box.h);
  const fx = x.createLinearGradient(box.x, 0, box.x + box.w, 0);
  fx.addColorStop(0, 'rgba(0,0,0,0)');
  fx.addColorStop(0.15, 'rgba(0,0,0,1)');
  fx.addColorStop(0.85, 'rgba(0,0,0,1)');
  fx.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = fx;
  x.fillRect(box.x, box.y, box.w, box.h);
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(c, 0, 0);
  g.restore();
}

/** An icicle hanging from (x, y): a tapering spike, as a path. */
export const iciclePath = (x: number, y: number, len: number, w: number, lean = 0): PathFn => (c) => {
  c.beginPath();
  c.moveTo(x - w / 2, y - 3);
  c.quadraticCurveTo(x - w * 0.35 + lean * 0.3, y + len * 0.5, x + lean, y + len);
  c.quadraticCurveTo(x + w * 0.35 + lean * 0.3, y + len * 0.5, x + w / 2, y - 3);
  c.closePath();
};

/** Paint an icicle (inside a silhouette): cold translucent body, a bright edge, a drip of light at the tip. */
export function paintIcicle(g: Ctx, x: number, y: number, len: number, w: number, lean = 0, ice = '#bfe6ff'): void {
  const p = iciclePath(x, y, len, w, lean);
  g.save();
  p(g);
  g.clip();
  const gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  gr.addColorStop(0, mix(ice, '#ffffff', 0.6));
  gr.addColorStop(0.4, ice);
  gr.addColorStop(1, mix(shade(ice, -0.4), '#1a4a8a', 0.4));
  g.fillStyle = gr;
  g.fillRect(x - w, y - 4, w * 2 + Math.abs(lean) * 2, len + 6);
  g.strokeStyle = rgba('#ffffff', 0.85);
  g.lineWidth = Math.max(0.8, w * 0.14);
  g.beginPath();
  g.moveTo(x - w * 0.22, y);
  g.quadraticCurveTo(x - w * 0.14 + lean * 0.3, y + len * 0.5, x + lean * 0.9, y + len * 0.92);
  g.stroke();
  g.restore();
  spec(g, x + lean - 0.5, y + len - 3, 2.2, 3, 0.9, 0);
}

/** A soft cold mist band (frozen air pooling round a form). */
export function coldMist(g: Ctx, x: number, y: number, rx: number, ry: number, a: number): void {
  ao(g, x, y, rx, ry, a, 0, '#e8f6ff');
}

/** The finishing light for any silhouette: a broad form shadow and the cool rim. */
export function oneLight(sil: Sil, dark = '#06080e', form = 0.45, size = 20): void {
  sil.edge(rgba(dark, form), size, LX * size * 0.55, LY * size * 0.55);
  sil.edge(rgba(LIGHT.rim, 0.55), 2.5, LX * 3, LY * 3);
}

/** A glowing eye (monsters): a hot iris with a slit, a bloom, lit from inside. `lid` 0 open … 1 shut. */
export function hotEye(g: Ctx, x: number, y: number, rx: number, ry: number, rot: number, iris: string, lid = 0, skin = '#3a3a2a'): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  const eye: PathFn = (c) => {
    c.beginPath();
    c.moveTo(-rx, 0);
    c.quadraticCurveTo(0, -ry * 1.6, rx, 0);
    c.quadraticCurveTo(0, ry * 1.1, -rx, 0);
    c.closePath();
  };
  // the socket's shadow
  ao(g, 0, 2, rx * 1.5, ry * 1.6, 0.6, 0, '#000000');
  eye(g);
  g.save();
  g.clip();
  const ig = g.createRadialGradient(-rx * 0.1, -ry * 0.1, 0.5, 0, 0, rx);
  ig.addColorStop(0, mix(iris, '#ffffff', 0.7));
  ig.addColorStop(0.45, iris);
  ig.addColorStop(1, shade(iris, -0.45));
  g.fillStyle = ig;
  g.fillRect(-rx - 2, -ry * 2, rx * 2 + 4, ry * 4);
  g.fillStyle = '#140804';
  g.beginPath();
  g.ellipse(0, 0, rx * 0.12, ry * 0.85, 0, 0, Math.PI * 2);
  g.fill();
  if (lid > 0) {
    g.fillStyle = skin;
    g.fillRect(-rx - 2, -ry * 2, rx * 2 + 4, ry * 3.1 * lid);
  }
  g.restore();
  g.strokeStyle = rgba('#000000', 0.7);
  g.lineWidth = 1.6;
  eye(g);
  g.stroke();
  if (lid < 0.6) spec(g, -rx * 0.35, -ry * 0.3, rx * 0.3, ry * 0.2, 0.9, -0.4);
  g.restore();
}

export { CX };
