// The trigger bus (docs/effects-plan.md, step 2): the pizza perks' trigger effects (src/game/perkEffects.ts)
// subscribe here once, and PizzaPerkKit fires each moment on it (a kill, a smack, a stomp, a wave's start…). The bus
// gives each effect its PlayCtx: who grants the perk now and how strongly (the scopes), the conditions' view of the
// field, the one gameplay roll, and the shared actions through the kit (ActionHost).
//
// The off-switch is one rule, Pizza.perk, which every scope reads: an eaten, stale, frozen-perk or possessed pizza
// grants no perk, so none of its triggers fire (table-wide, per-pizza, the pizza a foot was over, the end-of-wave
// pass), and neither do its old code paths, auras and defences. Its stats are the Ghost's possession's (the Haunt
// phase), as before.

import type { PizzaPerk } from '../data/pizzas';
import { isActStart } from '../data/stages';
import { effects, Phase, type ActionHost, type EventData, type GameEventId, type Grant, type PlayCtx } from '../effects';
import type { CondCtx } from '../effects/cond';
import { Source } from '../effects/source';
import type { AnyEvent } from '../effects/events';
import { pizzaOf } from '../effects/events';
import { Scope, type ScopeId } from '../effects/trigger';
import type { Foot } from './Foot';
import type { Pizza } from './Pizza';
import { PERK_EFFECTS } from './perkEffects';
import { isBossWave, waveInStage } from './Run';

/** What the bus needs from the kit: the table and its strengths, the field, and the actions' game side. */
export interface BusHost extends ActionHost {
  /** The table-wide strength of a perk (0 when no pizza has it). */
  c(perk: PizzaPerk): number;
  /** One pizza's strength. */
  pk(p: Pizza): number;
  /** The pizzas granting a perk now (not stale, frozen, dead or the Ghost's). */
  granting(perk: PizzaPerk): Pizza[];
  feet(): Foot[];
  possessed(): Pizza | null;
}

interface Sub {
  perk: PizzaPerk;
  scope: ScopeId;
  fn: (d: AnyEvent) => void;
}

export class PerkBus {
  private subs = new Map<GameEventId, Sub[]>();
  /** Run-long state the effects keep (the timers' seconds). */
  private state: Record<string, number> = {};
  /** Scope.Alive's pass over the table: the pizza being visited. */
  private visiting: Pizza | null = null;

  constructor(private h: BusHost) {
    for (const [perk, list] of PERK_EFFECTS) {
      const play = this.ctxFor(perk);
      for (const e of list) effects.apply(e, { source: Source.Perk(perk), phase: Phase.Table, level: 1, play });
    }
  }

  /** A new run: the timers start over. */
  resetRun(): void {
    for (const k of Object.keys(this.state)) this.state[k] = 0;
  }

  /** A moment: every trigger on it, in the order they're listed. Scope.Alive triggers that sit together go pizza by
   *  pizza in table order (one pass over the table, as the old loop did). */
  emit<E extends GameEventId>(event: E, data: EventData[E]): void {
    const list = this.subs.get(event);
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
      if (list[i].scope !== Scope.Alive) {
        list[i].fn(data);
        continue;
      }
      let j = i;
      while (j + 1 < list.length && list[j + 1].scope === Scope.Alive) j++;
      const group = list.slice(i, j + 1);
      for (const p of this.h.table())
        for (const s of group) {
          if (p.perk !== s.perk) continue;
          this.visiting = p;
          try {
            s.fn(data);
          } finally {
            this.visiting = null;
          }
        }
      i = j;
    }
  }

  private ctxFor(perk: PizzaPerk): PlayCtx {
    const h = this.h;
    const bus = this;
    const cond = (ev: AnyEvent): CondCtx => ({
      foot: 'foot' in ev ? ev.foot : null,
      pizza: pizzaOf(ev),
      ev,
      feet: () => h.feet(),
      wave: () => ('wave' in ev ? ev.wave : h.wave()),
      isBossWave,
      isActStart,
      waveInStage,
    });
    const grants = (scope: ScopeId, ev: AnyEvent, chance?: number): Grant[] => {
      switch (scope) {
        case Scope.Table: {
          if (h.c(perk) <= 0) return [];
          // (who's granting it is read when it's used: a delayed look names the pizzas granting it then)
          return [{ pizza: null, get pizzas() { return h.granting(perk); }, k: () => h.c(perk) }];
        }
        case Scope.Each:
          return h.granting(perk).map((p) => ({ pizza: p, pizzas: [p], k: () => h.pk(p) }));
        case Scope.Sum: {
          const ps = h.granting(perk);
          if (!ps.length) return [];
          let sum: number | undefined;
          if (chance !== undefined) {
            sum = 0;
            for (const p of ps) sum += chance * h.pk(p);
          }
          return [{ pizza: null, pizzas: ps, k: () => ps.reduce((t, p) => t + h.pk(p), 0), chance: sum }];
        }
        case Scope.Target: {
          const t = pizzaOf(ev);
          return t && !t.dead && t.perk === perk ? [{ pizza: t, pizzas: [t], k: () => h.pk(t) }] : [];
        }
        case Scope.Alive: {
          const p = bus.visiting;
          return p && p.perk === perk ? [{ pizza: p, pizzas: [p], k: () => h.pk(p) }] : [];
        }
      }
    };
    return Object.assign(Object.create(h) as BusHost, {
      perk,
      on: <E extends GameEventId>(ev: E, fn: (d: EventData[E]) => void, scope: ScopeId = Scope.Table) => {
        const list = bus.subs.get(ev) ?? [];
        list.push({ perk, scope, fn: fn as (d: AnyEvent) => void });
        bus.subs.set(ev, list);
      },
      roll: (c: number) => Math.random() < c,
      grants,
      feet: () => h.feet(),
      cond,
      state: bus.state,
    }) as unknown as PlayCtx;
  }
}
