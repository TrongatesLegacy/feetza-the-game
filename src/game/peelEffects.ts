// The peels' abilities and the topping procs as declared effects (docs/effects-plan.md, step 3): an ability's trigger
// is the same trigger kind the perks use (on a smack, a kill, a stomp, a wave's start, a timer, the meter), its fx the
// shared Action.Ability, and an always-on ability's stats are Effect.Stat on the ledger's Peel phase.
//
// - The always-on stats are applied through these declarations (Run.buildLedger, from GameScene.computeStats).
// - The triggers are declared for the audit (F.effectsAudit), searches, tags and words; the scene still times them
//   itself (GameScene.fireAbility, fireProcs, abilityTick, procTick): see docs/effects-plan.md, "Step 3: what was
//   built", for why and what step 4 does with them.
// - What an ability's effects show is the ability visuals' (src/game/abilityFx.ts), reacting to PeelFx events.

import { Action, Cond, Effect, Op, Phase, Reset, Unit, UnitKind, type EffectData } from '../effects';
import { STAT_DEFS, type StatKey } from '../effects/stats';
import type { Ability, Effect as AbilityFx, Proc, Trigger } from './abilities';

/** When an ability on a wave's start fires (after the banner), and a kill's (after the kill lands), in seconds. */
const WAVE_DELAY = Unit.Seconds(0.6);
const PROC_WAVE_DELAY = Unit.Seconds(0.7);
const KILL_DELAY = Unit.Seconds(0.04);

/** One trigger and its effects as declared effects. `proc`: a topping proc's (its wave delay is a beat later). */
function triggerEffects(t: Trigger, fx: AbilityFx[], proc = false): EffectData[] {
  const act = Action.Ability(fx);
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
        Effect.Every(
          Unit.Seconds(t.sec),
          act,
          { fireIf: Cond.AnyFoot(Cond.Hittable), reset: Reset.Run },
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
        Effect.WaveStart(Action.Later(proc ? PROC_WAVE_DELAY : WAVE_DELAY, act)),
      ];
    case 'always':
      return statEffects(fx);
  }
}

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

/** A peel's ability (and its passive part, `also`) as declared effects. */
export function abilityEffects(a: Ability): EffectData[] {
  return [...triggerEffects(a.trigger, a.fx), ...(a.also ? triggerEffects(a.also.trigger, a.also.fx) : [])];
}

/** A topping proc as declared effects. */
export function procEffects(p: Proc): EffectData[] {
  return triggerEffects(p.trigger, p.fx, true);
}
