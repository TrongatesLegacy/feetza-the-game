// What the Peel Slam button does this run: the Peel Slam itself, or the peel ability replacing it.
// Toppings, pizza perks and events that talk about "the Peel Slam" read this so their wording (and
// effect) fits the ability in use. Outside a run it follows the saved peel and Slam/Ability choice.

import { save } from '../systems/save';
import { abilityFor, type Ability, type Trigger } from './abilities';

export interface SlamMode {
  /** slam: the Peel Slam · active: press Space · auto: fires when the meter fills · passive: no meter */
  kind: 'slam' | 'active' | 'auto' | 'passive';
  name: string;
  trigger: Trigger['t'];
}

let current: SlamMode | null = null;

function fromAbility(a: Ability | null): SlamMode {
  if (!a) return { kind: 'slam', name: 'Peel Slam', trigger: 'active' };
  const t = a.trigger.t;
  return { kind: t === 'active' ? 'active' : t === 'auto' ? 'auto' : 'passive', name: a.name, trigger: t };
}

/** Set by the game scene for the run in progress (null: follow the saved choice). */
export function setSlamMode(a: Ability | null | undefined): void {
  current = a === undefined ? null : fromAbility(a);
}

export function slamMode(): SlamMode {
  if (current) return current;
  const useAb = save.useAbility && save.peel !== 'classic';
  return fromAbility(useAb ? abilityFor(save.peel) : null);
}

/** Meter charge bonuses (Oregano, Choco-Berry…): faster meter, or a passive that fires more often. */
export function meterBoostText(pct: number): string {
  const m = slamMode();
  if (m.kind !== 'passive') return `+${pct}% ${m.name} charge`;
  if (m.trigger === 'every') return `${m.name} fires ${pct}% faster`;
  if (m.trigger === 'smack' || m.trigger === 'kill') return `${m.name} +${Math.round(pct / 2)}% more likely`;
  return `No effect with ${m.name}`;
}

/** Freeze Frame. */
export function freezeText(): string {
  const m = slamMode();
  if (m.kind !== 'passive') return `${m.name} also freezes every foot for 3 seconds`;
  return `${m.name}'s hits also chill feet (−40% speed for 2s)`;
}

/** Cajun Shrimp. */
export function slamStunText(): string {
  const m = slamMode();
  if (m.kind !== 'passive') return `${m.name} stuns all feet 1.5s`;
  return `${m.name} hits may stun`;
}

/** S'mores: a head start each wave. */
export function superStartText(pct: number): string {
  const m = slamMode();
  if (m.kind === 'slam') return `Start each wave with ${pct}% Peel Slam`;
  if (m.kind !== 'passive') return `Each wave: ${m.name} ${pct}% charged`;
  if (m.trigger === 'every') return `${m.name} starts ${pct}% charged`;
  return `No effect with ${m.name}`;
}

/** The passive ability's chance and timer boost from meter-charge bonuses (superGain above 1). */
export function passiveBoost(superGain: number): { timer: number; chance: number } {
  const extra = Math.max(0, superGain - 1);
  return { timer: 1 + extra, chance: 1 + extra / 2 };
}
