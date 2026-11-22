// Extra materials for batch F (Gotham, comics, heroes, Kratos, Leonidas and the Persians: src/content/style/acts-f*.ts).
// Same shape as MATERIALS in materials.ts (paint() and piece() take them directly); the shared list is untouched.

import type { Material } from './materials';

const M = (m: Material) => m;

export const MATS_F = {
  /** Polished marble: pale, cool shadows, a soft broad sheen and faint veining (feet paint the veins). */
  marble: M({ name: 'Marble', base: '#f2ede4', shadowTint: '#5a6078', ramp: 0.55, form: 0.5, bevel: 0.45, rim: 0.5, tex: 'stone', texA: 0.16, texScale: 1.6, specA: 0.3, specSize: 0.22 }),
  /** Weathered titan stone: rough, pitted, cold. */
  rock: M({ name: 'Rock', base: '#8e8a84', shadowTint: '#1a1828', ramp: 0.7, form: 0.62, bevel: 0.45, rim: 0.45, tex: 'stone', texA: 0.55, texScale: 1.2, specA: 0.04, specSize: 0.2 }),
  /** Bronze: warm metal, a strong sheen and a cast texture. */
  bronze: M({ name: 'Bronze', base: '#c9873a', shadowTint: '#2a1004', ramp: 0.9, form: 0.6, bevel: 0.55, rim: 0.55, tex: 'cast', texA: 0.22, specA: 0.55, specSize: 0.14 }),
  /** Gold: high contrast, warm, hard highlights. */
  gold: M({ name: 'Gold', base: '#e8b23a', shadowTint: '#4a1e00', ramp: 1, form: 0.6, bevel: 0.6, rim: 0.6, tex: 'brushed', texA: 0.12, specA: 0.75, specSize: 0.12 }),
  /** Silk: smooth cloth with a long soft sheen, a faint weave. */
  silk: M({ name: 'Silk', base: '#a8182e', shadowTint: '#2a0420', ramp: 0.75, form: 0.5, bevel: 0.3, rim: 0.45, tex: 'canvas', texA: 0.12, texScale: 0.8, specA: 0.32, specSize: 0.22 }),
  /** Patent leather: near-black, mirror gloss (feet paint long streaks on top). */
  patent: M({ name: 'Patent', base: '#1e1c20', shadowTint: '#06060e', ramp: 0.6, form: 0.6, bevel: 0.5, rim: 0.7, tex: 'leather', texA: 0.12, texScale: 1.3, specA: 0.55, specSize: 0.12 }),
  /** Symbiote goo: black, wet, a violet-blue rim and sharp wet highlights. */
  goo: M({ name: 'Goo', base: '#1a1a22', shadowTint: '#0a0620', ramp: 0.6, form: 0.5, bevel: 0.55, rim: 0.85, specA: 0.8, specSize: 0.1 }),
  /** Horn / hoof keratin: dense, a waxy sheen and long grain. */
  horn: M({ name: 'Horn', base: '#3a2c24', shadowTint: '#0e0606', ramp: 0.7, form: 0.55, bevel: 0.45, rim: 0.5, tex: 'wood', texA: 0.22, texScale: 1.6, specA: 0.35, specSize: 0.16 }),
  /** Soft suede / kid leather (slippers): fine nap, a velvet sheen. */
  suede: M({ name: 'Suede', base: '#e8a030', shadowTint: '#4a1a10', ramp: 0.65, form: 0.5, bevel: 0.25, rim: 0.45, tex: 'grain', texA: 0.32, specA: 0.12, specSize: 0.3 }),
};
