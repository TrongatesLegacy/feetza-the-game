// Pizza perks whose text counts with the run's wave (Tuna & Sweetcorn). The game scene says which wave the
// next payout is for (the wave being played, or the next one while in the shop); outside a run there's none,
// so the text gives the rule without the numbers (the Pizzeria, the lineup, the guide).

let wave: number | null = null;

/** Set by the game scene: the wave the next payout counts (null: not in a run). */
export function setPerkWave(n: number | null): void {
  wave = n;
}

export function perkWave(): number | null {
  return wave;
}

/** Tuna & Sweetcorn: tips per wave number, paid when each wave ends (enhanced pays double). */
export const TUNA_TIPS = 5;

/** Tuna & Sweetcorn's payout for one pizza at the end of wave n (before Napoletana's boost). */
export function tunaTips(n: number, enhanced: boolean): number {
  return TUNA_TIPS * (enhanced ? 2 : 1) * n;
}

/** "Every wave: 5 tips × wave (5 × 50 = 250)", or the rule alone outside a run. */
export function tunaText(enhanced: boolean): string {
  const k = TUNA_TIPS * (enhanced ? 2 : 1);
  if (wave === null) return `Every wave: ${k} tips × the wave number`;
  return `Every wave: ${k} tips × wave (${k} × ${wave} = ${tunaTips(wave, enhanced).toLocaleString('en-US')})`;
}
