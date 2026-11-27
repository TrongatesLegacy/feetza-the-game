// Feetza 2.0 feet: every module in src/content/feet/ exports `feet: FootType[]`.
import type { FootType } from '../data/feet';
import { traceData } from '../game/packTrace';

const mods = import.meta.glob<{ feet: FootType[] }>('./feet/*.ts', { eager: true });
export const CONTENT_FEET: FootType[] = Object.keys(mods)
  .sort()
  .flatMap((k) => traceData('src/content', k, mods[k].feet));
