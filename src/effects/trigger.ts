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
import type { Chance, Count } from './units';
import type { MaybeEnh } from './status';
import { Tag, type TagId, type TriggerKindId } from './tags';
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
} as const;
export type ScopeId = (typeof Scope)[keyof typeof Scope];

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
  grants(scope: ScopeId, ev: AnyEvent, chance?: number): Grant[];
  feet(): Foot[];
  cond(ev: AnyEvent): CondCtx;
  /** Run-long state kept by the bus (a timer's seconds), by key. */
  state: Record<string, number>;
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
}

export interface TriggerData extends TriggerOpts {
  action: ActionData;
}

/** A moment came: fire for every grant that passes. */
export function fireTrigger(e: TriggerData, ctx: PlayCtx, ev: AnyEvent): void {
  const foot = footOf(ev);
  const scope = e.scope ?? Scope.Table;
  const cc = () => ctx.cond(ev);
  // (a count or a once-a-wave mark lives on a pizza: a table-wide trigger can't have one)
  if (import.meta.env?.DEV && (e.nth || e.oncePerWave) && (scope === Scope.Table || scope === Scope.Sum)) console.error(`[effects] ${ctx.perk}: a counted or once-a-wave trigger needs a per-pizza scope`);
  if (!e.nth && e.when && !holdsCond(e.when, { ...cc(), pizza: pizzaOf(ev) })) return;
  for (const g of ctx.grants(scope, ev, e.chance)) {
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
  }
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
  return `${pre}${once}: ${describeAction(e.action)}`;
}

export function triggerTags(kind: TriggerKindId, e: TriggerData): TagId[] {
  return [Tag.Trigger(kind), Tag.Scope(e.scope ?? Scope.Table), ...condTags(e.when), ...actionTags(e.action)];
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
      const full: TriggerData = need ? { ...e, when: e.when ? { c: 'all', of: [need, e.when] } : need } : e;
      play.on(event, (ev) => fireTrigger(full, play, ev), e.scope);
    },
    describe: (e: D) => describeTrigger(what, e),
    scale: (e: D, k: number) => scaleTrigger(e, k),
    tags: (e: D) => triggerTags(e.kind, e),
  };
}
