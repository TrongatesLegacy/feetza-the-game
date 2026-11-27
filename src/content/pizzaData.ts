// Feetza 2.0 pizzas: every module in src/content/pizzas/ exports `pizzas: PizzaType[]`.
import type { PizzaType } from '../data/pizzas';
import { traceData } from '../game/packTrace';

const mods = import.meta.glob<{ pizzas: PizzaType[] }>('./pizzas/*.ts', { eager: true });
export const CONTENT_PIZZAS: PizzaType[] = Object.keys(mods)
  .sort()
  .flatMap((k) => traceData('src/content', k, mods[k].pizzas));
