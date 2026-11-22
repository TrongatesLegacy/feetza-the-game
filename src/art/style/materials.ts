// Materials for the foot style kit: how a surface takes the one light. Each is a ramp (how far the lit and shaded
// sides swing), a shadow tint, a texture, a specular response and a rim. paint() fills a silhouette with one.

import { type Ctx, mix, shade } from '../util';
import { type Box, type PathFn, type TextureKind, formFill, inside, spec, texture } from './kit';

export interface Material {
  name: string;
  /** Default base colour (swatches use it; feet pass their own). */
  base: string;
  /** Where shadows go (hue shift). */
  shadowTint: string;
  ramp: number;
  form: number;
  bevel: number;
  rim: number;
  tex?: TextureKind;
  texA?: number;
  texScale?: number;
  texOp?: GlobalCompositeOperation;
  /** Broad specular on the lit side: strength and size (fraction of the box). */
  specA: number;
  specSize: number;
}

const M = (m: Material) => m;

export const MATERIALS = {
  /** Warm subsurface: shadows go red, a soft broad sheen, fine pores. */
  skin: M({ name: 'Skin', base: '#efc0a0', shadowTint: '#a8321e', ramp: 0.55, form: 0.5, bevel: 0.3, rim: 0.35, tex: 'pores', texA: 0.22, specA: 0.22, specSize: 0.28 }),
  /** Pebbled, a tight warm sheen. */
  leather: M({ name: 'Leather', base: '#8a5a2b', shadowTint: '#2a1020', ramp: 0.7, form: 0.6, bevel: 0.35, rim: 0.4, tex: 'leather', texA: 0.35, texScale: 1.4, specA: 0.3, specSize: 0.18 }),
  /** Matte, soft broad highlight. */
  rubber: M({ name: 'Rubber', base: '#f2f0ea', shadowTint: '#3a3a5a', ramp: 0.45, form: 0.45, bevel: 0.25, rim: 0.3, tex: 'rubber', texA: 0.25, specA: 0.16, specSize: 0.4 }),
  /** Woven cloth: no gloss, a visible weave. */
  canvas: M({ name: 'Canvas', base: '#ff5a36', shadowTint: '#3a1030', ramp: 0.55, form: 0.5, bevel: 0.2, rim: 0.3, tex: 'canvas', texA: 0.4, texScale: 1.2, specA: 0.06, specSize: 0.3 }),
  /** Knitted wool: stitches, fuzzy edges, no gloss. */
  knit: M({ name: 'Knit', base: '#f4f1ea', shadowTint: '#4a4070', ramp: 0.5, form: 0.5, bevel: 0.2, rim: 0.35, tex: 'knit', texA: 0.5, texScale: 1.6, specA: 0, specSize: 0 }),
  /** Polished chrome: big contrast swings and hard glints (paint chrome bands on top). */
  chrome: M({ name: 'Chrome', base: '#c9d0da', shadowTint: '#141828', ramp: 1, form: 0.7, bevel: 0.6, rim: 0.7, tex: 'brushed', texA: 0.18, specA: 0.7, specSize: 0.16 }),
  /** Cast iron: dark, pitted, a dull cold sheen. */
  iron: M({ name: 'Cast iron', base: '#5f6670', shadowTint: '#0e1020', ramp: 0.75, form: 0.65, bevel: 0.4, rim: 0.55, tex: 'cast', texA: 0.45, texScale: 1.2, specA: 0.25, specSize: 0.16 }),
  /** Fur: drawn as strands (fur.ts); the base is the undercoat. */
  fur: M({ name: 'Fur', base: '#7a7a86', shadowTint: '#1a1830', ramp: 0.6, form: 0.6, bevel: 0.15, rim: 0.5, tex: 'grain', texA: 0.3, specA: 0, specSize: 0 }),
  /** Scales: a tiled scale pattern with a slight sheen. */
  scales: M({ name: 'Scales', base: '#5fae4a', shadowTint: '#102838', ramp: 0.6, form: 0.55, bevel: 0.35, rim: 0.45, tex: 'scales', texA: 0.5, texScale: 1.5, specA: 0.25, specSize: 0.15 }),
  /** Stone: speckled, veined, no gloss. */
  stone: M({ name: 'Stone', base: '#8b8a90', shadowTint: '#1a1a2a', ramp: 0.6, form: 0.6, bevel: 0.4, rim: 0.4, tex: 'stone', texA: 0.5, texScale: 1.3, specA: 0.05, specSize: 0.2 }),
  /** Slime: translucent, glossy, bubbles (feet paint the bubbles). */
  slime: M({ name: 'Slime', base: '#7be04a', shadowTint: '#0a3a30', ramp: 0.7, form: 0.4, bevel: 0.6, rim: 0.8, specA: 0.75, specSize: 0.14 }),
  /** Wood: grain, a dull sheen. */
  wood: M({ name: 'Wood', base: '#a0703e', shadowTint: '#2a1008', ramp: 0.6, form: 0.55, bevel: 0.35, rim: 0.35, tex: 'wood', texA: 0.45, texScale: 1.4, specA: 0.12, specSize: 0.25 }),
  /** Plastic: smooth, a crisp bright highlight. */
  plastic: M({ name: 'Plastic', base: '#2fa3ff', shadowTint: '#101848', ramp: 0.6, form: 0.5, bevel: 0.5, rim: 0.5, specA: 0.6, specSize: 0.12 }),
  /** Plush fleece: soft curls, very soft light. */
  plush: M({ name: 'Plush', base: '#fff3f7', shadowTint: '#7a4a8a', ramp: 0.45, form: 0.45, bevel: 0.15, rim: 0.35, tex: 'fleece', texA: 0.35, texScale: 1.3, specA: 0.04, specSize: 0.3 }),
  /** Enamel paint on metal: glossy, a crisp highlight. */
  enamel: M({ name: 'Enamel', base: '#b33a3a', shadowTint: '#200818', ramp: 0.7, form: 0.6, bevel: 0.5, rim: 0.5, tex: 'grain', texA: 0.12, specA: 0.5, specSize: 0.12 }),
  /** Soot: matte black, smudgy, a faint grey rim so it reads on dark backdrops. */
  soot: M({ name: 'Soot', base: '#3a3638', shadowTint: '#08060c', ramp: 0.5, form: 0.5, bevel: 0.18, rim: 0.55, tex: 'speckle', texA: 0.3, specA: 0.04, specSize: 0.3 }),
};

export type MaterialId = keyof typeof MATERIALS;

/** Fill a silhouette with a material lit by the one light (no outline: the foot strokes its silhouette once). */
export function paint(ctx: Ctx, path: PathFn, box: Box, mat: Material | MaterialId, base?: string, o: { spec?: boolean; texA?: number } = {}): void {
  const m = typeof mat === 'string' ? MATERIALS[mat] : mat;
  const b = base ?? m.base;
  formFill(ctx, path, box, { base: b, shadowTint: m.shadowTint, ramp: m.ramp, form: m.form, bevel: m.bevel, rim: m.rim });
  inside(ctx, path, () => {
    if (m.tex) texture(ctx, m.tex, box, o.texA ?? m.texA ?? 0.3, m.texScale ?? 1, m.texOp ?? 'overlay');
    if (o.spec !== false && m.specA > 0) {
      const r = Math.max(box.w, box.h) * m.specSize;
      spec(ctx, box.x + box.w * 0.34, box.y + box.h * 0.3, r, r * 0.6, m.specA, -0.7);
    }
  });
}

/** A ramp of three tones for a base colour, shadow shifted towards the material's tint. */
export function tones(m: Material | MaterialId, base?: string): { hi: string; mid: string; lo: string } {
  const mm = typeof m === 'string' ? MATERIALS[m] : m;
  const b = base ?? mm.base;
  return { hi: shade(b, 0.25 * mm.ramp + 0.05), mid: b, lo: mix(shade(b, -0.45 * mm.ramp - 0.05), mm.shadowTint, 0.3) };
}
