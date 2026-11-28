// The peels' abilities and the topping procs as declared effects (docs/effects-plan.md, steps 3 and 4): an ability's
// trigger is the same trigger kind the perks use (on a smack, a kill, a stomp, a wave's start, the meter), a timed one
// a charged clock (Effect.Charged), its fx the shared Action.Ability, and an always-on ability's stats are Effect.Stat
// on the ledger's Peel phase.
//
// - The always-on stats are applied through these declarations (Run.buildLedger, from GameScene.computeStats).
// - The triggers run on the peel's trigger bus (src/game/peelBus.ts): the scene sends it each moment and the bus
//   decides what fires, when and in what order, with the same rolls as before.
// - What an ability's effects show is the ability visuals' (src/game/abilityFx.ts), reacting to PeelFx events.

import { Action, ChargeFrom, Cond, Effect, Op, Phase, Unit, UnitKind, type ChargeFromId, type EffectData } from '../effects';
import { STAT_DEFS, type StatKey } from '../effects/stats';
import type { Ability, Effect as AbilityFx, Proc, Trigger } from './abilities';

/** When an ability on a wave's start fires (after the banner), and a kill's (after the kill lands), in seconds. */
const WAVE_DELAY = Unit.Seconds(0.6);
const PROC_WAVE_DELAY = Unit.Seconds(0.7);
const KILL_DELAY = Unit.Seconds(0.04);

/** Every source of charge a timed ability's clock takes: time, the meter's top-ups, an event's slam prize, the
 *  meter's head start as a wave begins, Pizza Slots' slam. */
const CHARGE: ChargeFromId[] = [ChargeFrom.Time, ChargeFrom.Meter, ChargeFrom.Event, ChargeFrom.HeadStart, ChargeFrom.Slots];

/** The one-offs the peels' own perks do (the peel bus's host runs each: src/scenes/GameScene.ts). */
export const PeelCustom = {
  /** Zombie Outbreak: a landed smack may turn its foot into a friendly zombie (src/game/zombiePeel.ts). */
  ZombieTurn: 'zombieTurn',
  /** Zombie Outbreak: a kill may heal a slice. */
  ZombieHeal: 'zombieHeal',
} as const;
export type PeelCustomId = (typeof PeelCustom)[keyof typeof PeelCustom];

/** What the scene keeps that a peel's condition asks about (Cond.Flag). */
export const PeelFlag = {
  /** A wave is on (not over, not in the shop). */
  InWave: 'inWave',
} as const;
export type PeelFlagId = (typeof PeelFlag)[keyof typeof PeelFlag];

const C = <T extends PeelCustomId>(id: T) => Action.Custom(id);
const F = <T extends PeelFlagId>(id: T) => Cond.Flag(id);

/** The peel's own ability's trigger as it runs: a chance rolled at the peel's strength (its meter boosts), a kill's
 *  ability rolled at the kill and played a beat later, a timer on a charged clock. */
function peelTrigger(a: Ability): EffectData[] {
  const t = a.trigger;
  const act = Action.Ability(a.fx);
  switch (t.t) {
    case 'active':
      return [
        Effect.OnSlam(act),
      ];
    case 'auto':
      return [
        Effect.OnSlam(
          act,
          { when: Cond.AutoSlam },
        ),
      ];
    case 'every':
      return [
        Effect.Charged(
          Unit.Seconds(t.sec),
          act,
          { fireIf: Cond.AnyFoot(Cond.Hittable), from: CHARGE },
        ),
      ];
    case 'smack':
      return [
        Effect.OnSmack(
          act,
          { chance: Unit.of(UnitKind.Chance, t.p) },
        ),
      ];
    case 'kill':
      return [
        Effect.OnKill(
          Action.Later(KILL_DELAY, act),
          { chance: Unit.of(UnitKind.Chance, t.p), when: Cond.NotByAbility },
        ),
      ];
    case 'stomp':
      return [
        Effect.OnStomp(act),
      ];
    case 'wave':
      return [
        Effect.WaveStart(Action.Later(WAVE_DELAY, act)),
      ];
    case 'always':
      return [...statEffects(a.fx), ...lossEffects(a)];
  }
}

/** A hero with no button (the Incredible Bulk): his move, once a wave, when that many slices have gone. */
function lossEffects(a: Ability): EffectData[] {
  if (!a.losses) return [];
  return [
    Effect.OnLosses(
      Unit.Count(a.losses),
      Action.Ability(a.fx),
      { when: F(PeelFlag.InWave) },
    ),
  ];
}

/** A topping proc's trigger (and a peel's passive part, `also`, which runs as one): at its own chance, its kill roll a
 *  beat after the kill, its timer looking at the field once a frame for every proc (Cond.Ready). */
function procTrigger(t: Trigger, fx: AbilityFx[]): EffectData[] {
  const act = Action.Ability(fx);
  switch (t.t) {
    case 'every':
      return [
        Effect.Every(
          Unit.Seconds(t.sec),
          act,
          { fireIf: Cond.Ready },
        ),
      ];
    case 'smack':
      return [
        Effect.OnSmack(
          act,
          { chance: Unit.of(UnitKind.Chance, t.p) },
        ),
      ];
    case 'kill':
      return [
        Effect.OnKill(
          act,
          { chance: Unit.of(UnitKind.Chance, t.p), when: Cond.NotByAbility, delay: KILL_DELAY },
        ),
      ];
    case 'stomp':
      return [
        Effect.OnStomp(act),
      ];
    case 'wave':
      return [
        Effect.WaveStart(Action.Later(PROC_WAVE_DELAY, act)),
      ];
    case 'always':
      return statEffects(fx);
    // (a proc is never pressed)
    case 'active':
    case 'auto':
      return [];
  }
}

/** Zombie Outbreak's moments (the Zombie Toes and every zombified foot peel): a landed smack may turn its foot, a kill
 *  may heal a slice. Its zombies' own lives (their bites and bursts, the wave's heal cap) are the outbreak's
 *  (src/game/zombiePeel.ts): links already going finish whatever the peel. */
const OUTBREAK: EffectData[] = [
  Effect.OnSmack(C(PeelCustom.ZombieTurn)),
  Effect.OnKill(C(PeelCustom.ZombieHeal)),
];

/** An always-on ability's stat changes (its `stat` fx, written in the stats' own stored units) as Effect.Stat on the
 *  Peel phase, summed stat by stat over every part given (the ability and a hero's always-on passive, its `also`). */
export function peelStatEffects(parts: readonly ({ trigger: Trigger; fx: AbilityFx[] } | null | undefined)[]): EffectData[] {
  const mods: Record<string, number> = {};
  for (const a of parts) if (a?.trigger.t === 'always') for (const e of a.fx) if (e.e === 'stat') for (const [k, v] of Object.entries(e.mods)) mods[k] = (mods[k] ?? 0) + (v as number);
  const out: EffectData[] = [];
  for (const [k, v] of Object.entries(mods)) {
    const def = STAT_DEFS[k as StatKey];
    // (numbers only, and only a real change)
    if (typeof def?.base !== 'number' || !v) continue;
    out.push(
      Effect.Stat(
        k as StatKey,
        Op.Add(Unit.of(def.unit as typeof UnitKind.Amount, v)) as never,
        { phase: Phase.Peel },
      ),
    );
  }
  return out;
}

function statEffects(fx: AbilityFx[]): EffectData[] {
  return peelStatEffects([{ trigger: { t: 'always' }, fx }]);
}

/** A peel's effects by where they run on the peel's bus (src/game/peelBus.ts): its ability, its passive part (run as
 *  a proc, after the toppings' procs), Zombie Outbreak's moments (after both). */
export interface PeelParts {
  peel: EffectData[];
  also: EffectData[];
  outbreak: EffectData[];
}

export function peelParts(a: Ability): PeelParts {
  return {
    peel: peelTrigger(a),
    also: a.also ? procTrigger(a.also.trigger, a.also.fx) : [],
    outbreak: a.zombie ? OUTBREAK : [],
  };
}

/** A peel's ability as declared effects: all of its parts. */
export function abilityEffects(a: Ability): EffectData[] {
  const p = peelParts(a);
  return [...p.peel, ...p.also, ...p.outbreak];
}

/** A topping proc as declared effects. */
export function procEffects(p: Proc): EffectData[] {
  return procTrigger(p.trigger, p.fx);
}
