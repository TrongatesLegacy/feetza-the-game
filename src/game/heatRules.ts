// Heat rules that change wording and effects outside the heat data itself.
// Freshness is off on Mild, so toppings that cost freshness need a different catch there.

import { HEAT_BY_ID, type HeatId, heatRank } from '../data/difficulty';
import type { FootType } from '../data/feet';
import { save } from '../systems/save';

let current: HeatId | null = null;

/** Set by the game scene for the run in progress (null: follow the saved heat). */
export function setRunHeat(h: HeatId | null): void {
  current = h;
}

/** The run's heat as set by the scene (null outside a run). */
export function runHeat(): HeatId | null {
  return current;
}

/** The run's heat rank (0 Mild … 4 Inferno; the saved heat outside a run): for wording that depends on it. */
export function runHeatRank(): number {
  return heatRank(current ?? save.heat);
}

export function freshnessOn(): boolean {
  return (HEAT_BY_ID[current ?? save.heat]?.freshness ?? 1) > 0;
}

/** Blocked smacks a guard foot's shield takes before it shatters: 4 on Mild, 6 on Regular and Hot, 8 from Extra Hot
 * up (there are other ways through: wait for the drop, non-smack damage, a hero's bypass). A light guard has its own
 * (FootType.guardHits: Waiter Walt's tray takes 2 on Mild and Regular, 3 from Hot up). */
export function guardHits(h: HeatId | null = current, type?: FootType): number {
  const r = heatRank(h ?? save.heat);
  const own = type?.guardHits;
  if (own) return own[Math.min(4, Math.max(0, r))];
  return r <= 0 ? 4 : r >= 3 ? 8 : 6;
}

/** Steps a Peel Slam (or any peel ability's hit) knocks off a raised guard shield: 4 on Mild, 3 on Regular and Hot,
 * 2 from Extra Hot up. If that smashes it, the rest of the blow goes through (its share of the unused steps). */
export function slamSteps(h: HeatId | null = current): number {
  const r = heatRank(h ?? save.heat);
  return r <= 0 ? 4 : r >= 3 ? 2 : 3;
}

/** How much of what fires by itself (burns aside: a held shield is burn-proof) wears a raised guard shield down, a step
 * for every base smack's worth: 0.5 on Mild, 0.35 on Regular, 0.25 on Hot, 0.15 on Extra Hot, 0.1 on Inferno. It
 * never takes the last step: only the player's own blow smashes a held shield. */
export function guardAutoWear(h: HeatId | null = current): number {
  return [0.5, 0.35, 0.25, 0.15, 0.1][Math.min(4, Math.max(0, heatRank(h ?? save.heat)))];
}

/** Seconds from a guard foot's shield breaking to it raising a new one (whatever happens meanwhile): 12 on Mild, 9 on
 * Regular and Hot, 7.5 from Extra Hot up. */
export function guardRearm(h: HeatId | null = current): number {
  const r = heatRank(h ?? save.heat);
  return r <= 0 ? 12 : r >= 3 ? 7.5 : 9;
}

/** The share of its health a zombified foot gets back up with (the Zombie Loafer's zombies get back up once): half on
 * Mild, Regular and Hot, three quarters on Extra Hot, all of it on Inferno. A foot's own revive trait stays at half. */
export function zombieRevive(h: HeatId | null = current): number {
  const r = heatRank(h ?? save.heat);
  return r >= 4 ? 1 : r >= 3 ? 0.75 : 0.5;
}

/** "at half health" / "at three-quarter health" / "at full health", for the Loafer's info line and cards. */
export function zombieReviveText(h: HeatId | null = current): string {
  const k = zombieRevive(h);
  return k >= 1 ? 'at full health' : k >= 0.75 ? 'at three-quarter health' : 'at half health';
}

/** The Head Waiter's fight (src/game/bosses/act1a.ts): what a delivery waiter's dish heals him when it gets through, as a
 * share of his health: 5% on Mild, 8% on Regular, 10% on Hot, 12% on Extra Hot, 15% on Inferno. */
export function trayHeal(h: HeatId | null = current): number {
  return [0.05, 0.08, 0.1, 0.12, 0.15][Math.min(4, Math.max(0, heatRank(h ?? save.heat)))];
}

/** A delivery waiter's health against Waiter Walt's (on top of the heat's usual health): 1.3× on Mild, 1.5× on
 * Regular, 1.6× on Hot, 1.8× on Extra Hot, 2× on Inferno. */
export function deliveryHp(h: HeatId | null = current): number {
  return [1.3, 1.5, 1.6, 1.8, 2][Math.min(4, Math.max(0, heatRank(h ?? save.heat)))];
}

/** Seconds after one delivery waiter is dealt with (smacked down, or served) before the next can set off: 4 on Mild,
 * 3.5 on Regular, 3 on Hot, 2.5 on Extra Hot, 2 on Inferno. */
export function deliveryGap(h: HeatId | null = current): number {
  return [4, 3.5, 3, 2.5, 2][Math.min(4, Math.max(0, heatRank(h ?? save.heat)))];
}
