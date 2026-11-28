// What every trigger kind shares (docs/effects-plan.md): who fires (the scope), the off-switches, counted and
// once-a-wave triggers, the chance, and running the action. Each kind (onKill.ts, onSmack.ts…) is a few lines on top.
//
// The off-switch is one rule that every scope (PlayCtx.grants) reads: Pizza.perk, which is null for an eaten, stale,
// frozen-perk or possessed pizza, so none of its triggers fire, whatever the scope.

import { actionTags, describeAction, runAction, type ActionData, type ActionHost, type Fire } from './actions';
import { condTags, holdsCond, type CondCtx, type CondData } from './cond';
import { footOf, pizzaOf, type AnyEvent, type EventData, type GameEventId } from './events';
import type { Pizza } from '../game/Pizza';
import type { Foot } from '../game/Foot';
import type { Chance, Count, Seconds } from './units';
import type { MaybeEnh } from './status';
import { Tag, type TagId, type TriggerKindId } from './tags';
import type { HitQuery, HitStatId } from './perHit';
import { pickEnh } from './status';

export const Scope = {
  /** Once, for the whole table, at the table's strength (every pizza granting it, Napoletana's boost included). */
  Table: 'table',
  /** Once for each pizza granting it, at its own strength, in table order. */
  Each: 'each',
  /** Once, if any pizza grants it: their strengths summed one by one (a chance sums each pizza's share). */
  Sum: 'sum',
  /** The pizza the moment is about (the one stomped, or the one the foot was over), if it grants it. */
  Target: 'target',
  /** Each pizza on the table granting the perk, in table order. Triggers of this scope that sit
   *  together on a moment go pizza by pizza, as one pass over the table. */
  Alive: 'alive',
  /** The field's: once, for the table, not tied to one pizza (a set-up, a prop's clock). The bus's off-switch holds it
   *  while no pizza grants the perk, unless it declares that it outlives its pizzas (`outlives`: props left on the
   *  field, a tidy-up). A prop tied to an owner pizza asks the same rule of its owner (grantsPerk). */
  Field: 'field',
  /** The pizza by its own perk, whatever it grants now (a borrower that has borrowed another's, a Mystery Meat still
   *  hidden): the moment's pizza, or each one in a pass over the table. The bus's off-switch holds it while that
   *  pizza's perk is off (at its end: unless it was on as it went), unless it declares `outlives`. */
  Own: 'own',
} as const;
export type ScopeId = (typeof Scope)[keyof typeof Scope];

/** Why a trigger runs whatever its pizzas' state (the bus's off-switch doesn't hold it): declared, never assumed. */
export const Outlives = {
  /** Its props stay on the field after the moment that made them (a splat, a ghost, a wall, a stone foot) and play
   *  out or tidy themselves up when their pizza goes; anything new they start asks its owner (grantsPerk). */
  Props: 'props',
  /** A set-up or a tidy-up for the wave: it clears or resets what's left, so it runs with nothing on the table too. */
  TidyUp: 'tidyUp',
  /** It's the pizza's own moment (placed, enhanced, its first reveal, its own loss): it runs whatever its perk's state. */
  OwnMoment: 'ownMoment',
  /** It follows the field for its pizzas (a boss's phases, a clock shared by several perks), each part reading its
   *  own strength. */
  Follows: 'follows',
} as const;
export type OutlivesId = (typeof Outlives)[keyof typeof Outlives];

/** The off-switch, one rule for every source: a pizza grants a perk while it's its Pizza.perk, never while it's
 *  eaten, stale, frozen or possessed. Every scope reads it, and so does a prop tied to an owner pizza. */
export const grantsPerk = (p: Pizza | null | undefined, perk: string): p is Pizza => !!p && !p.dead && p.perk === perk;

/** One grant of a trigger: the pizza firing it (null for the whole table), the pizzas behind it, its strength. */
export interface Grant {
  pizza: Pizza | null;
  pizzas: Pizza[];
  k(): number;
  /** Sum: the chance already summed pizza by pizza. */
  chance?: number;
}

/** What a trigger effect may touch in play: the trigger bus's view of the game. */
export interface PlayCtx extends ActionHost {
  /** The perk this effect belongs to. */
  perk: string;
  on<E extends GameEventId>(ev: E, fn: (d: EventData[E]) => void, scope?: ScopeId): void;
  /** The one place a gameplay chance is rolled (Math.random: seeded in the balance sim). */
  roll(c: number): boolean;
  /** Who fires (the scopes, each under the bus's off-switch; `outlives`: a Field or Own trigger that runs whatever). */
  grants(scope: ScopeId, ev: AnyEvent, chance?: number, outlives?: OutlivesId): Grant[];
  feet(): Foot[];
  cond(ev: AnyEvent): CondCtx;
  /** Run-long state kept by the bus (a timer's seconds), by key. */
  state: Record<string, number>;
  /** Fold into a per-hit number (Effect.PerHit): called in the order effects are listed. */
  per(stat: HitStatId, fold: (q: HitQuery, m: number) => number): void;
  /** A one-off's own per-hit factor (Grow.By). */
  factor(id: string, q: HitQuery): number;
  /** How fast a charged clock fills with time (Effect.Charged: the peel's meter boosts run its timer faster); 1 if unsaid. */
  rate?(): number;
}

/** A counted trigger: every n-th moment fires (n enhanced on an enhanced pizza), counted in the pizza's flags under
 *  `flag` (saved with the run). The conditions are checked on the n-th, after counting; a one-off that says it didn't
 *  happen keeps the count. */
export interface NthData {
  n: MaybeEnh<Count>;
  flag: string;
}
/** Every n-th (Enh(n, m) for an enhanced pizza's count). */
export const Nth = (n: MaybeEnh<Count>, flag: string): NthData => ({ n, flag });

export interface TriggerOpts {
  scope?: ScopeId;
  when?: CondData;
  /** Rolled each time (× strength), never above cap. */
  chance?: Chance;
  cap?: Chance;
  nth?: NthData;
  /** Once a wave per pizza, marked in its flags under this name. */
  oncePerWave?: string;
  /** The whole trigger waits this long after its moment, its roll and conditions too, on the scene's clock (a topping
   *  proc's kill roll comes 40 ms after the kill). Action.Later is the other way round: rolled now, done later. */
  delay?: Seconds;
  /** A Field or Own trigger that runs whatever its pizzas' state, and why (Outlives). Without it, the bus's
   *  off-switch holds it (Scope.Field, Scope.Own). */
  outlives?: OutlivesId;
  /** It fires even when the moment's foot is already down (a peel's stomp ability or proc: the kind's own check that
   *  the stomper still stands is skipped, as the scene always fired them). */
  evenIfDown?: boolean;
}

export interface TriggerData extends TriggerOpts {
  action: ActionData;
}

/** A moment came: fire for every grant that passes (`once`: stop at the first that fires, as a defence does). True
 *  when an action happened. */
export function fireTrigger(e: TriggerData, ctx: PlayCtx, ev: AnyEvent, once = false): boolean {
  let any = false;
  const foot = footOf(ev);
  const scope = e.scope ?? Scope.Table;
  const cc = () => ctx.cond(ev);
  // (a count or a once-a-wave mark lives on a pizza: a table-wide trigger can't have one)
  if (import.meta.env?.DEV && (e.nth || e.oncePerWave) && (scope === Scope.Table || scope === Scope.Sum)) console.error(`[effects] ${ctx.perk}: a counted or once-a-wave trigger needs a per-pizza scope`);
  if (!e.nth && e.when && !holdsCond(e.when, { ...cc(), pizza: pizzaOf(ev) })) return false;
  for (const g of ctx.grants(scope, ev, e.chance, e.outlives)) {
    const pizza = g.pizza ?? (scope === Scope.Target ? pizzaOf(ev) : null);
    if (e.oncePerWave && pizza) {
      if (pizza.flags[e.oncePerWave] === ctx.wave()) continue;
    }
    if (e.nth && pizza) {
      const f = e.nth.flag;
      pizza.flags[f] = Number(pizza.flags[f] ?? 0) + 1;
      if (Number(pizza.flags[f]) < pickEnh(e.nth.n, pizza.enhanced)) continue;
      if (e.when && !holdsCond(e.when, { ...cc(), pizza })) continue;
    }
    if (e.chance !== undefined) {
      const raw = g.chance ?? e.chance * g.k();
      const c = e.cap !== undefined ? Math.min(e.cap, raw) : raw;
      if (!(c > 0 && ctx.roll(c))) continue;
    }
    if (e.oncePerWave && pizza) pizza.flags[e.oncePerWave] = ctx.wave();
    const fire: Fire = { perk: ctx.perk, ev, foot, pizza, get pizzas() { return g.pizzas; }, k: g.k };
    // a counted trigger starts its count again when it fires (unless a one-off said it didn't happen)
    const done = runActionCounted(e, ctx, fire);
    if (e.nth && pizza && done) pizza.flags[e.nth.flag] = 0;
    any ||= done;
    if (once && done) break;
  }
  return any;
}

function runActionCounted(e: TriggerData, ctx: PlayCtx, fire: Fire): boolean {
  return runAction(e.action, ctx, fire);
}

/** "3rd", "10th" */
const nth = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;

/** A trigger in words, as a card reads: "15% chance on a kill: summon a friendly ghost", "Every 10th kill: …",
 *  "On a stomp: …" (`what` is the moment, singular: "kill"). */
export function describeTrigger(what: string, e: TriggerData): string {
  const n = e.nth ? (typeof e.nth.n === 'number' ? e.nth.n : e.nth.n.plain) : 0;
  const a = /^[aeiou]/.test(what) ? 'an' : 'a';
  const pre = e.chance !== undefined ? `${Math.round(e.chance * 100)}% chance on ${a} ${what}` : e.nth ? `Every ${nth(n)} ${what}` : `On ${a} ${what}`;
  const once = e.oncePerWave ? ' (once a wave)' : '';
  const later = e.delay ? ' (a beat later)' : '';
  return `${pre}${once}${later}: ${describeAction(e.action)}`;
}

export function triggerTags(kind: TriggerKindId, e: TriggerData): TagId[] {
  return [Tag.Trigger(kind), Tag.Scope(e.scope ?? Scope.Table), ...(e.outlives ? [Tag.Outlives(e.outlives)] : []), ...condTags(e.when), ...actionTags(e.action)];
}

/** A trigger scaled (enhanced, Napoletana, Echo Slice): its chance, never past its cap. */
export function scaleTrigger<T extends TriggerData>(e: T, k: number): T {
  if (e.chance === undefined) return e;
  return { ...e, chance: Math.min(e.cap ?? 1, e.chance * k) as Chance };
}

/** The spec a moment's trigger kind shares: subscribe on the bus, words, scale, tags. `need` is a condition every one
 *  of the kind checks first (OnStomp: the stomper still standing). */
export function triggerSpec<D extends TriggerData & { readonly kind: TriggerKindId }>(event: GameEventId, what: string, need?: CondData) {
  return {
    apply(e: D, ctx: { play?: PlayCtx }) {
      const play = ctx.play;
      if (!play) return;
      const full: TriggerData = need && !e.evenIfDown ? { ...e, when: e.when ? { c: 'all', of: [need, e.when] } : need } : e;
      const delay = e.delay;
      play.on(
        event,
        (ev) => {
          if (delay === undefined) fireTrigger(full, play, ev);
          else play.later(Math.round(delay * 1000), () => fireTrigger(full, play, ev));
        },
        e.scope,
      );
    },
    describe: (e: D) => describeTrigger(what, e),
    scale: (e: D, k: number) => scaleTrigger(e, k),
    tags: (e: D) => triggerTags(e.kind, e),
  };
}
