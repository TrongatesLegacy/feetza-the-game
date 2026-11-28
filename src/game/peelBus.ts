// The peel's trigger bus (docs/effects-plan.md, step 4): the peel's ability, the toppings' procs and Zombie Outbreak's
// moments, declared as effects (src/game/peelEffects.ts) and run on the same trigger kinds and shared actions as the
// pizza perks (src/game/perkBus.ts). The scene sends each moment (a landed smack, a kill, a stomp, a wave's start, a
// frame, a slam, charge for the ability's clock) and the bus decides what fires, when, and how often:
//
// - a chance is rolled here, at its source's strength (the peel's meter boosts raise its chances: PeelSource.k);
// - a kill's ability is rolled at the kill and played a beat later (Action.Later); a proc's kill roll comes a beat after
//   the kill (TriggerOpts.delay);
// - a timed ability runs on a charged clock (Effect.Charged), fed by time (× PeelSource.rate) and the charge the scene
//   sends (PeelBus.charge); the HUD reads how full it is from the clock (PeelBus.clockFill).
//
// The sources sit in groups the scene sends a moment to in turn, in the order the game always ran them: the peel's
// ability, then the toppings' procs (the peel's passive part, `also`, last of them), then Zombie Outbreak. A group is
// set again when what's in it changes (a new peel, the toppings owned), keeping the clocks of the sources it keeps.
//
// Off-switches, as the game always had them: a delayed moment or action (a proc's kill roll, a wave's ability) lands
// only while the run is on (PeelBusHost.live: not over, not in the shop); the peel's ability itself never goes off
// then (the scene's runner checks, after its roll); the scene sends a smack or a stomp to the procs only while the
// run is on (they were checked before their rolls).

import { effects, Phase, type ActionHost, type EventData, type GameEventId, type Grant, type PlayCtx } from '../effects';
import { chargedKey, ChargeFrom, type ChargeFromId } from '../effects/charged';
import type { CondCtx } from '../effects/cond';
import type { AnyEvent } from '../effects/events';
import { pizzaOf } from '../effects/events';
import type { HitQuery, HitStatId } from '../effects/perHit';
import type { ScopeId } from '../effects/trigger';
import { isActStart } from '../data/stages';
import type { EffectData } from '../effects';
import type { Effect as AbilityFx } from './abilities';
import type { Fire } from '../effects/actions';
import type { Foot } from './Foot';
import { isNight } from './perkEffects';
import { isBossWave, waveInStage } from './Run';

/** Where a source sits: each moment goes to the groups in this order. */
export const PeelGroup = {
  /** The peel's own ability. */
  Peel: 'peel',
  /** The toppings' procs, then the peel's passive part (`also`). */
  Procs: 'procs',
  /** Zombie Outbreak's moments. */
  Outbreak: 'outbreak',
} as const;
export type PeelGroupId = (typeof PeelGroup)[keyof typeof PeelGroup];
const ORDER: PeelGroupId[] = [PeelGroup.Peel, PeelGroup.Procs, PeelGroup.Outbreak];

/** One source on the bus: the peel's ability, a topping's proc, the outbreak. */
export interface PeelSource {
  /** Its name on the bus (its clocks' state keys): 'peel', a topping's id, 'peel:also', 'outbreak'. */
  key: string;
  effects: EffectData[];
  /** Run an ability's effects (Action.Ability) for this source. */
  run(fx: AbilityFx[], fire: Fire): void;
  /** The strength its chances are rolled at (the peel's: its meter boosts' chance; a proc's: 1). */
  k(): number;
  /** How fast its charged clock fills with time (the peel's meter boosts' timer). */
  rate?(): number;
}

/** What the bus needs from the scene: the shared actions' game side, the field, and whether the run is on. */
export interface PeelBusHost extends ActionHost {
  feet(): Foot[];
  /** The run is on: not over, not in the shop. */
  live(): boolean;
  /** A flag the scene keeps (Cond.Flag: src/game/peelEffects.ts PeelFlag). */
  flag(id: string): boolean;
}

interface Sub {
  key: string;
  fn: (d: AnyEvent) => void;
}

export class PeelBus {
  private subs: Record<PeelGroupId, Map<GameEventId, Sub[]>> = { peel: new Map(), procs: new Map(), outbreak: new Map() };
  private sources: Record<PeelGroupId, PeelSource[]> = { peel: [], procs: [], outbreak: [] };
  /** Each group's run-long state (its sources' clocks), by key. A group set again gets a state of its own (with the
   *  clocks it keeps copied in), so what the replaced sources still do in a moment under way (a proc's kill can work the
   *  table's stats out again mid-frame, and the toppings' procs with it) lands on the old one, as it always did. */
  private state: Record<PeelGroupId, Record<string, number>> = { peel: {}, procs: {}, outbreak: {} };

  constructor(private h: PeelBusHost) {}

  /** Put a group's sources on the bus (in the order they fire), replacing what was there. A source kept from before
   *  (the same key) keeps its clocks; a new one starts from nothing. `fresh`: every clock starts again. */
  set(group: PeelGroupId, sources: PeelSource[], fresh = false): void {
    const kept = this.state[group];
    const state: Record<string, number> = {};
    this.state[group] = state;
    this.subs[group] = new Map();
    this.sources[group] = sources;
    for (const s of sources) {
      const play = this.ctxFor(group, s, state);
      for (const e of s.effects) effects.apply(e, { source: 'peel', phase: Phase.Peel, level: 1, play });
    }
    if (!fresh) for (const k of Object.keys(state)) if (k in kept) state[k] = kept[k];
  }

  /** A moment: to each group in turn (or just those named), each source's triggers in the order they're listed. */
  emit<E extends GameEventId>(event: E, data: EventData[E], groups: readonly PeelGroupId[] = ORDER): void {
    for (const g of groups) {
      const list = this.subs[g].get(event);
      if (list) for (const s of list) s.fn(data);
    }
  }

  /** Charge for a charged clock (Effect.Charged) from one of its sources: true when a clock took it (else the scene
   *  fills the meter, or does what it does instead). */
  charge(from: Exclude<ChargeFromId, typeof ChargeFrom.Time>, share = 1): boolean {
    const ev: EventData['charge'] = { from, share, taken: false };
    for (const g of ORDER) for (const s of this.subs[g].get('charge') ?? []) s.fn(ev);
    return ev.taken;
  }

  /** How full the peel's charged clock is (0–1, past 1 while it waits for a foot), or null when it has none. */
  clockFill(): number | null {
    const src = this.sources.peel[0];
    const e = src?.effects.find((x) => x.kind === 'charged');
    if (!src || !e || e.kind !== 'charged') return null;
    return (this.state.peel[chargedKey(src.key)] ?? 0) / e.seconds;
  }

  private ctxFor(group: PeelGroupId, src: PeelSource, state: Record<string, number>): PlayCtx {
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
      isNight,
      flag: (id) => h.flag(id),
    });
    // (a peel's source is the whole run's: one grant, at its strength, with no pizza behind it)
    const grant: Grant = { pizza: null, pizzas: [], k: () => src.k() };
    return Object.assign(Object.create(h) as PeelBusHost, {
      perk: src.key,
      on: <E extends GameEventId>(ev: E, fn: (d: EventData[E]) => void, _scope?: ScopeId) => {
        const subs = bus.subs[group];
        const list = subs.get(ev) ?? [];
        list.push({ key: src.key, fn: fn as (d: AnyEvent) => void });
        subs.set(ev, list);
      },
      roll: (c: number) => Math.random() < c,
      grants: () => [grant],
      feet: () => h.feet(),
      cond,
      state,
      per: (_stat: HitStatId, _fold: (q: HitQuery, m: number) => number) => {},
      factor: () => 1,
      rate: () => src.rate?.() ?? 1,
      // (a delayed moment, or the rest of an action, lands only while the run is still on)
      later: (ms: number, fn: () => void) => h.later(ms, () => h.live() && fn()),
      ability: (fx: AbilityFx[], fire: Fire) => src.run(fx, fire),
    }) as unknown as PlayCtx;
  }
}
