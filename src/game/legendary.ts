// The Legendary groundwork (docs/pizza-plan.md, section 2's "Legendary unlock gates", section 3's heat note and
// section 12): what every Legendary shares, whatever its act.
//
// - Gates, by route: a Pizzeria Legendary is sold once its act's boss (the boss of the act's last stage) has been
//   beaten on Hot or hotter, and shows locked with the reason until then; a Milestone Legendary is won by its feat
//   (MILESTONES in src/data/meta.ts); a Chef's Special Legendary is only dealt at the counter in its act's stages, from
//   the act's second stage on (Act 1: from the wave 5 shop), at the Legendary odds (2 of the 100) and its Legendary tip price; a Rare Find Legendary can turn up on
//   the new-run screen once its act has been cleared on any heat.
// - Damage: every Legendary's damage goes through legendDmg(), set on Mild and scaled up with the heat in step with
//   the feet's health (×1 Mild … ×3.1 Inferno), so it hits as hard at every heat.
// - Its colours: each Legendary's look (LEGEND_LOOK), shared by its aura, its moments and its cards.
//
// Later batches add their pizzas to src/content/pizzas/ with `act` set, a LEGEND_LOOK entry, an aura and signature
// (src/game/legendAuras.ts), their perk in src/game/pizzaLegends.ts and their peel's look (LEGEND_PEEL, src/content/art/legend-peels-p8.ts):
// the gates, the counter's and the reveal's moments and the card borders come for free.

import { HEAT_BY_ID, type HeatId } from '../data/difficulty';
import { FOOT_BY_ID } from '../data/feet';
import type { PizzaType } from '../data/pizzas';
import { STAGES, STAGES_PER_ACT, WAVES_PER_ACT, WAVES_PER_STAGE, actOf, waveInJourney } from '../data/stages';
import { save } from '../systems/save';

/** A Legendary's damage multiplier on this heat (×1 on Mild): its damage is set on Mild and scales with the feet's
 *  health (Mild 0.7 … Inferno 2.2), so a ×5 hits as hard at every heat (×1, ≈1.43, ≈1.86, ≈2.43, ≈3.14). */
export function legendHeat(heat: HeatId): number {
  return (HEAT_BY_ID[heat]?.hp ?? 1) / HEAT_BY_ID.mild.hp;
}

/** `mult` smacks of damage from a Legendary, scaled by heat: legendDmg(5, damage, heat) is its ×5. */
export function legendDmg(mult: number, smack: number, heat: HeatId): number {
  return mult * smack * legendHeat(heat);
}

/** The boss whose fall completes an act: the boss of its last stage (Act 1: Iron Heel). */
export function actBoss(act: number): string {
  return STAGES[Math.min(STAGES.length, act * STAGES_PER_ACT) - 1]?.boss ?? STAGES[STAGES.length - 1].boss;
}

export function actBossName(act: number): string {
  const n = FOOT_BY_ID[actBoss(act)]?.name;
  if (!n) return 'the act’s boss';
  // (bosses' names are written in capitals: shown in a sentence, in title case, a leading "the" kept small)
  const t = n === n.toUpperCase() ? n.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_m, a: string, b: string) => a + b.toUpperCase()) : n;
  return t.replace(/^The /, 'the ');
}

/** A Legendary's gate right now: open, and when it's shut, why (shown on its locked card). */
export function legendGate(p: PizzaType): { open: boolean; why: string } {
  if (p.rarity !== 'legendary' || !p.act) return { open: true, why: '' };
  const act = p.act;
  switch (p.route) {
    case 'pizzeria': {
      const open = (save.bossesBeatenHot ?? []).includes(actBoss(act));
      return { open, why: `Beat ${actBossName(act)} (Act ${act}’s boss) on Hot or hotter` };
    }
    case 'rare': {
      const open = save.actsCleared.includes(act);
      return { open, why: `Clear Act ${act} on any heat` };
    }
    case 'special':
      return { open: true, why: `Chef’s Special, rarely, in Act ${act}’s shops from wave ${(act - 1) * WAVES_PER_ACT + WAVES_PER_STAGE}` };
    default:
      return { open: true, why: '' };
  }
}

/** Can the counter deal this Legendary Chef's Special in the shop after `wave`? Only in its act's stages (the shop's
 *  stages are the next wave's), from the act's second stage on: Act 1's in the shops after waves 5–9 (the wave 5 boss
 *  shop on), Act 2's after waves 15–19, and so on, on every endless loop too. */
export function legendSpecialOpen(p: PizzaType, wave: number): boolean {
  const next = wave + 1;
  return p.rarity === 'legendary' && p.act === actOf(next) && (waveInJourney(next) - 1) % WAVES_PER_ACT >= WAVES_PER_STAGE;
}

/** Hot or hotter (the Legendaries' feats and the Pizzeria gate). */
export const legendHeatOk = (heat: HeatId): boolean => heat === 'hot' || heat === 'extrahot' || heat === 'inferno';

/** Each Legendary's colours: its aura's (col, col2), its confetti and its sting's light. */
export interface LegendLook {
  col: number;
  col2: number;
  /** CSS colours: the reveal's light and the card's glow. */
  css: string;
  css2: string;
  confetti: string[];
  /** Its title on the reveal, under its name. */
  line: string;
}

export const LEGEND_LOOK: Record<string, LegendLook> = {
  nonnasmasterpiece: { col: 0xff8a3a, col2: 0xfff0d8, css: '#ff9a4a', css2: '#ffe6c0', confetti: ['#d8321e', '#3f9a3a', '#fff6e2', '#ffb070', '#ffd23f'], line: 'From Trattoria Nonna, Act 1' },
  silverservice: { col: 0xcfe0f4, col2: 0xffffff, css: '#d8e6f6', css2: '#ffffff', confetti: ['#e8f0fa', '#9fb4cc', '#ffffff', '#ffd23f', '#1c2430'], line: 'The Head Waiter’s, Act 1' },
  firstbake: { col: 0xffc23a, col2: 0xfff0b0, css: '#ffc23a', css2: '#fff2c0', confetti: ['#ffc23a', '#fff2c0', '#e0a050', '#d8321e', '#ffffff'], line: 'Opening Night’s first pie, Act 1' },
  // Act 2 (batch 2): King Honk's circus, Sandcastle Sam's fortress, the Beach's tide
  bigtoppie: { col: 0xff4a5a, col2: 0xfff2b0, css: '#ff5a68', css2: '#fff2b0', confetti: ['#e2322a', '#ffd23f', '#2a7ae0', '#ffffff', '#3fc060', '#ff6ab0'], line: 'King Honk’s circus, Act 2' },
  sandcastlecitadel: { col: 0xf2c070, col2: 0xfff4d8, css: '#f2c070', css2: '#fff2d0', confetti: ['#e4b468', '#fff0c8', '#e2322a', '#2a7ae0', '#ffffff'], line: 'Sandcastle Sam’s fortress, Act 2' },
  tidaltiki: { col: 0x3ad0d8, col2: 0xe8fff8, css: '#4ad8e0', css2: '#e8fffa', confetti: ['#1a9ab8', '#5ad8d8', '#ffffff', '#e8306a', '#ffc83a', '#3fa040'], line: 'The Beach’s tide, Act 2' },
};

const GOLD: LegendLook = { col: 0xffc83a, col2: 0xfff2a0, css: '#ffc83a', css2: '#fff2a0', confetti: ['#ffc83a', '#fff2a0', '#d08a08', '#ffffff'], line: 'Legendary' };

export function legendLook(id: string): LegendLook {
  return LEGEND_LOOK[id] ?? GOLD;
}
