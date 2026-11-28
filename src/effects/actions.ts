// Shared actions (docs/effects-plan.md): what a trigger does when it fires, as plain data. They run through the
// ActionHost (the game's side: the scene's tips, heals and clock), so an action never reaches into the scene, and
// never draws: Action.Show fires a look the game plays (src/game/perkEffects.ts LOOKS), Action.Summon an ally the
// game raises, Action.Custom a one-off the game keeps (the meteor's flight, the dance beat's lights).
//
//   Action.Tips(Pay.Fixed(Unit.Amount(6)), At.Pizza(Unit.Px(80)))  Old Town Tarte: 6 tips × strength, from the pie
//   Action.Seq(Action.Apply(Status.Freeze(…)), Action.Show(Look.ColdSmoked))
//   Action.Later(Unit.Seconds(0.7), …)                              on the scene's clock; skipped if its pizza's gone

import type { Foot } from '../game/Foot';
import type { Pizza } from '../game/Pizza';
import type { AnyEvent } from './events';
import { applyStatus, describeStatus, type StatusData } from './status';
import { Tag, type TagId } from './tags';
import type { Amount, Count, Mult, Percent, Px, Seconds } from './units';

/** How many tips: n × strength (rounded), the kill's own tips × m (at least `min`), or a share of the wave's. */
export type PayData = { p: 'fixed'; n: Amount } | { p: 'kill'; m: Mult; min: Amount } | { p: 'earned'; share: Percent } | { p: 'tuna' };
export const Pay = {
  Fixed: (n: Amount): PayData => ({ p: 'fixed', n }),
  Kill: (m: Mult, min: Amount): PayData => ({ p: 'kill', m, min }),
  /** A share of the tips earned this wave, × strength. */
  Earned: (share: Percent): PayData => ({ p: 'earned', share }),
  /** Tuna & Sweetcorn's: its wave's tips for each pie (src/data/perkWave.ts), × Napoletana's boost. */
  Tuna: (): PayData => ({ p: 'tuna' }),
} as const;

/** Where tips fly from: the foot (so many px above its middle) or the pizza (above its top). The data keeps the
 *  screen's offset, dy (up is negative): At.Foot(Unit.Px(40)) is dy −40. */
export type AtData = { at: 'foot' | 'pizza'; dy: number };
const up = (px: Px | undefined) => (px ? 0 - px : 0);
export const At = {
  Foot: (above?: Px): AtData => ({ at: 'foot', dy: up(above) }),
  Pizza: (above?: Px): AtData => ({ at: 'pizza', dy: up(above) }),
} as const;

/** Whose slices a heal grows: every pizza on the table, or the firing pizza's neighbours. */
export const Who = { Table: 'table', Neighbours: 'neighbours' } as const;
export type WhoId = (typeof Who)[keyof typeof Who];

/** Allies an action can summon (each raised by the game). */
export const Ally = {
  /** Phantom Waltz's friendly ghost: a sprite guarding a pizza (never a foot, so nothing can zombify it). */
  FriendlyGhost: 'friendlyGhost',
} as const;
export type AllyId = (typeof Ally)[keyof typeof Ally];
/** An ally as a card names it. */
const ALLY_NAME: Record<AllyId, string> = { friendlyGhost: 'friendly ghost' };

export type ActionData =
  | { a: 'tips'; pay: PayData; at: AtData }
  | { a: 'reroll' }
  | { a: 'heal'; who: WhoId; n: Count }
  | { a: 'meter'; add: Percent }
  | { a: 'crust'; n: Count }
  | { a: 'apply'; status: StatusData }
  | { a: 'summon'; ally: AllyId }
  | { a: 'show'; look: string }
  | { a: 'custom'; id: string }
  | { a: 'later'; sec: Seconds; act: ActionData }
  | { a: 'seq'; list: ActionData[] };

export const Action = {
  Tips: (pay: PayData, at: AtData = At.Foot()): ActionData => ({ a: 'tips', pay, at }),
  /** One more free reroll in the next shop. */
  Reroll: (): ActionData => ({ a: 'reroll' }),
  Heal: (who: WhoId, n: Count): ActionData => ({ a: 'heal', who, n }),
  /** Fill the Peel Slam's meter by a share (× strength), never past full. */
  Meter: (add: Percent): ActionData => ({ a: 'meter', add }),
  /** Bank Golden Crusts now. */
  Crust: (n: Count): ActionData => ({ a: 'crust', n }),
  /** Put a status on the moment's foot (src/effects/status.ts). */
  Apply: (status: StatusData): ActionData => ({ a: 'apply', status }),
  Summon: (ally: AllyId): ActionData => ({ a: 'summon', ally }),
  /** A look the game plays (a quip, a sound, the pizza's moment). Typed names: src/game/perkEffects.ts Look. */
  Show: <L extends string>(look: L): ActionData => ({ a: 'show', look }),
  /** A one-off the game keeps. Typed names: src/game/perkEffects.ts Custom. */
  Custom: <C extends string>(id: C): ActionData => ({ a: 'custom', id }),
  /** Later on the scene's clock (skipped if the firing pizza is gone by then). */
  Later: (sec: Seconds, act: ActionData): ActionData => ({ a: 'later', sec, act }),
  Seq: (...list: ActionData[]): ActionData => ({ a: 'seq', list }),
} as const;

/** One firing: who fired (the pizza, or the table's pizzas for a table-wide perk), at what strength, at what. */
export interface Fire {
  perk: string;
  ev: AnyEvent;
  foot: Foot | null;
  /** The pizza that fired (per-pizza perks), or null for a table-wide one. */
  pizza: Pizza | null;
  /** The pizzas granting it (table-wide perks: every one, read when it's used; per-pizza: just it). */
  readonly pizzas: Pizza[];
  /** Its strength, read when it's used (a delayed action reads it then, as the old code did). */
  k(): number;
}

/** The game's side of an action. */
export interface ActionHost {
  tips(n: number, at: AtData, fire: Fire): void;
  reroll(): void;
  heal(p: Pizza, n: number): void;
  table(): Pizza[];
  neighbours(p: Pizza): Pizza[];
  meter(add: number): void;
  crust(n: number): void;
  damage(): number;
  wave(): number;
  boost(): number;
  later(ms: number, fn: () => void): void;
  summon(ally: AllyId, fire: Fire): void;
  show(look: string, fire: Fire): void;
  /** A one-off: false when it didn't happen (a counted trigger then keeps its count). */
  custom(id: string, fire: Fire): boolean | void;
  /** Tuna & Sweetcorn's tips for a wave (src/data/perkWave.ts). */
  tunaTips(wave: number, enhanced: boolean): number;
}

const enhancedOf = (fire: Fire) => !!fire.pizza?.enhanced;

/** Run an action: false when it didn't happen (only a one-off can say so). */
export function runAction(a: ActionData, host: ActionHost, fire: Fire): boolean {
  switch (a.a) {
    case 'tips': {
      const ev = fire.ev;
      const p = a.pay;
      const n =
        p.p === 'fixed'
          ? Math.round(p.n * fire.k())
          : p.p === 'kill'
            ? Math.max(p.min, ('coins' in ev ? ev.coins : 0) * p.m)
            : p.p === 'earned'
              ? Math.round(('earned' in ev ? ev.earned : 0) * p.share * fire.k())
              : Math.round(fire.pizzas.reduce((t, q) => t + host.tunaTips('wave' in ev ? ev.wave : host.wave(), q.enhanced), 0) * host.boost());
      host.tips(n, a.at, fire);
      return true;
    }
    case 'reroll':
      host.reroll();
      return true;
    case 'heal': {
      const n = a.n;
      if (a.who === 'table') for (const q of host.table()) host.heal(q, n);
      else if (fire.pizza) for (const q of host.neighbours(fire.pizza)) host.heal(q, n);
      return true;
    }
    case 'meter':
      host.meter(a.add * fire.k());
      return true;
    case 'crust':
      host.crust(a.n);
      return true;
    case 'apply':
      if (!fire.foot) return false;
      return applyStatus(a.status, fire.foot, { k: fire.k(), enhanced: enhancedOf(fire), damage: host.damage() });
    case 'summon':
      host.summon(a.ally, fire);
      return true;
    case 'show':
      host.show(a.look, fire);
      return true;
    case 'custom':
      return host.custom(a.id, fire) !== false;
    case 'later': {
      const p = fire.pizza;
      host.later(Math.round(a.sec * 1000), () => {
        if (p?.dead) return;
        runAction(a.act, host, fire);
      });
      return true;
    }
    case 'seq': {
      let ok = true;
      for (const x of a.list) ok = runAction(x, host, fire) && ok;
      return ok;
    }
  }
}

export function describeAction(a: ActionData): string {
  switch (a.a) {
    case 'tips':
      return a.pay.p === 'fixed' ? `+${a.pay.n} tips` : a.pay.p === 'kill' ? `its tips ×${a.pay.m} (at least ${a.pay.min})` : a.pay.p === 'earned' ? `+${Math.round(a.pay.share * 100)}% of the wave's tips` : 'tips for the wave';
    case 'reroll':
      return 'a free reroll';
    case 'heal':
      return `${a.who === 'table' ? 'every pizza regrows' : 'its neighbours regrow'} +${a.n} slice${a.n === 1 ? '' : 's'}`;
    case 'meter':
      return `+${Math.round(a.add * 100)}% meter`;
    case 'crust':
      return `+${a.n} Golden Crust${a.n === 1 ? '' : 's'}`;
    case 'apply':
      return describeStatus(a.status);
    case 'summon':
      return `summon a ${ALLY_NAME[a.ally]}`;
    case 'show':
      return '';
    case 'custom':
      // (a one-off by its name: danceBeat → "dance beat")
      return a.id.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
    case 'later':
      return describeAction(a.act);
    case 'seq':
      return a.list.map(describeAction).filter(Boolean).join(', ');
  }
}

export function actionTags(a: ActionData): TagId[] {
  switch (a.a) {
    case 'apply':
      return [Tag.Status(a.status.s)];
    case 'later':
      return actionTags(a.act);
    case 'seq':
      return a.list.flatMap(actionTags);
    case 'show':
      return [];
    case 'custom':
      return [Tag.Custom(a.id)];
    case 'summon':
      return [Tag.Summons, Tag.Ally(a.ally)];
    default:
      return [Tag.Action(a.a)];
  }
}
