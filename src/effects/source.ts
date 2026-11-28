// Sources: who a modifier (or a trigger) comes from, as typed keys (docs/effects-plan.md). This one module builds them
// and reads them back; nothing else spells a key by hand, and a misspelt one doesn't compile.
//
//   Source.Topping('heavy')          'top:heavy'
//   Source.Pizza('colossusforge', 7) 'pizza:colossusforge#7'   (its own id while it's on the table)
//   Source.Perk('meteor')            'perk:meteor'             (a perk's trigger effects on the bus)
//   Source.Meta, Source.Peel, Source.Hero, Source.Ghost, Source.Cap
//
// Keys stay plain strings underneath, so the ledger's maps and the golden check read them as they always did. A
// modifier several pizzas share is a SourceShare: each source's weight.

import type { PizzaPerk } from '../data/pizzas';

export type ToppingSource = `top:${string}`;
export type PizzaSource = `pizza:${string}#${number}`;
export type PerkSource = `perk:${PizzaPerk}`;
export type SourceKey = ToppingSource | PizzaSource | PerkSource | 'meta' | 'peel' | 'hero' | 'ghost' | 'cap';
/** Several sources sharing one modifier, by weight (two Peel Collectors on the table). */
export type SourceShare = Partial<Record<SourceKey, number>>;
export type SourceRef = SourceKey | SourceShare;

export const Source = {
  Topping: (id: string): ToppingSource => `top:${id}`,
  Pizza: (type: string, n: number): PizzaSource => `pizza:${type}#${n}`,
  Perk: (perk: PizzaPerk): PerkSource => `perk:${perk}`,
  /** The Pizzeria's upgrades. */
  Meta: 'meta',
  /** The peel's always-on stats (a hero's passive among them). */
  Peel: 'peel',
  Hero: 'hero',
  /** The Ghost's possession. */
  Ghost: 'ghost',
  /** A stat's cap (its share in the breakdown). */
  Cap: 'cap',
} as const;

export type SourceInfo =
  | { s: 'topping'; id: string }
  | { s: 'pizza'; type: string; n: number }
  | { s: 'perk'; perk: PizzaPerk }
  | { s: 'meta' | 'peel' | 'hero' | 'ghost' | 'cap' };

/** What a key names. */
export function readSource(k: SourceKey): SourceInfo {
  if (k.startsWith('top:')) return { s: 'topping', id: k.slice(4) };
  if (k.startsWith('perk:')) return { s: 'perk', perk: k.slice(5) as PizzaPerk };
  if (k.startsWith('pizza:')) {
    const [type, n] = k.slice(6).split('#');
    return { s: 'pizza', type, n: Number(n) };
  }
  return { s: k as 'meta' | 'peel' | 'hero' | 'ghost' | 'cap' };
}

/** The sources in a shared modifier, with their weights. */
export function shareEntries(s: SourceShare): [SourceKey, number][] {
  return Object.entries(s) as [SourceKey, number][];
}
