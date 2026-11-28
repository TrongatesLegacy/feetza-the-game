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
import { condTags, holdsCond, type CondCtx, type CondData } from './cond';
import { Tag, type TagId } from './tags';
import type { Amount, Count, Mult, Percent, Px, Seconds } from './units';
import type { Effect as AbilityFx } from '../game/abilities';

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

/** How hard a hit is: m × your smack damage, or a Legendary's m (× your smack damage × the heat's Legendary scale,
 *  legendDmg in src/game/legendary.ts). Either way × the firing's strength, unless it's a plain hit (Hit.Plain: the
 *  strength already went into its chance). */
export type HitData = { h: 'smack' | 'legend' | 'plain'; m: Mult };
export const Hit = {
  Smack: (m: Mult): HitData => ({ h: 'smack', m }),
  Legend: (m: Mult): HitData => ({ h: 'legend', m }),
  /** m × your smack damage, whatever the strength. */
  Plain: (m: Mult): HitData => ({ h: 'plain', m }),
} as const;

/** Where an area action reaches (Action.Area): the feet matching `of`, in the field's order, and of those either all
 *  (Area.Field) or those within `half` px across of the moment's foot (Area.Column: a lane up the table). */
export type AreaData = { at: 'field'; of: CondData } | { at: 'column'; half: Px; of: CondData };
export const Area = {
  /** Every foot on the field that matches. */
  Field: (of: CondData): AreaData => ({ at: 'field', of }),
  /** The feet that match within `half` px across of the moment's foot (or its x): a lane up the table. */
  Column: (half: Px, of: CondData): AreaData => ({ at: 'column', half, of }),
} as const;
/** A hit's extras: how hard it knocks (its hit's knock), and a push back up first. */
export interface DamageOpts {
  knock?: Amount;
  push?: Amount;
}

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
  | { a: 'knock'; n: Amount }
  | { a: 'damage'; hit: HitData; o: DamageOpts }
  | { a: 'ability'; fx: AbilityFx[] }
  | { a: 'area'; area: AreaData; act: ActionData }
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
  /** A peel ability's or a topping proc's own effects (the ability vocabulary, src/game/abilities.ts: targets, throws,
   *  marks, chains), run by the scene (GameScene.runEffects). */
  Ability: (fx: AbilityFx[]): ActionData => ({ a: 'ability', fx }),
  /** Hit the moment's foot (if it's still standing): filed on the STATS tab under the firing perk. */
  Damage: (hit: HitData, o: DamageOpts = {}): ActionData => ({ a: 'damage', hit, o }),
  /** Knock the moment's foot back up (its knock speed). */
  Knock: (n: Amount): ActionData => ({ a: 'knock', n }),
  /** Do `act` to every foot in an area, one by one, each as the moment's foot (area damage, a field-wide slow). */
  Area: (area: AreaData, act: ActionData): ActionData => ({ a: 'area', area, act }),
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
  /** A Legendary's hit: m × your smack damage × the heat's Legendary scale (legendDmg). */
  legendDmg(m: number): number;
  /** Deal a hit to a foot (Action.Damage), filed under the firing perk. */
  hurt(f: Foot, amount: number, o: DamageOpts, fire: Fire): void;
  /** Run an ability's own effects (Action.Ability): only the scene's peel side has it. */
  ability?(fx: AbilityFx[], fire: Fire): void;
  /** The feet on the field, and the conditions' view of a moment (Action.Area). */
  feet?(): Foot[];
  cond?(ev: AnyEvent): CondCtx;
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
    case 'knock':
      if (!fire.foot) return false;
      fire.foot.knock(a.n);
      return true;
    case 'ability':
      if (!host.ability) return false;
      host.ability(a.fx, fire);
      return true;
    case 'area': {
      const feet = host.feet?.() ?? [];
      const cc = host.cond?.(fire.ev);
      if (!cc) return false;
      const ev = fire.ev;
      // (a column is centred on the moment's foot, or where the moment was)
      const cx = fire.foot?.cx || ('x' in ev ? ev.x : 0);
      for (const f of feet) {
        if (!holdsCond(a.area.of, cc, f)) continue;
        if (a.area.at === 'column' && Math.abs(f.cx - cx) > a.area.half) continue;
        runAction(a.act, host, { perk: fire.perk, ev, foot: f, pizza: fire.pizza, pizzas: fire.pizzas, k: fire.k });
      }
      return true;
    }
    case 'damage': {
      const f = fire.foot;
      if (!f || !f.alive) return false;
      const m = a.hit.h === 'plain' ? a.hit.m : a.hit.m * fire.k();
      host.hurt(f, a.hit.h === 'legend' ? host.legendDmg(m) : m * host.damage(), a.o, fire);
      return true;
    }
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
    case 'knock':
      return 'knock it back';
    case 'ability':
      return a.fx.map((x) => x.e).join(', ');
    case 'damage':
      return `hit it for ×${a.hit.m}${a.hit.h === 'legend' ? ' (a Legendary hit)' : ''}`;
    case 'area':
      return `${a.area.at === 'column' ? 'every foot in its lane' : 'every foot'}: ${describeAction(a.act)}`;
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
    case 'ability':
      return [Tag.Action('ability'), ...a.fx.map((x) => Tag.ProcFx(x.e))];
    case 'area':
      return [Tag.Action('area'), ...condTags(a.area.of), ...actionTags(a.act)];
    default:
      return [Tag.Action(a.a)];
  }
}
