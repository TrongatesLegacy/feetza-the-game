// Act 4's Legendaries' rules (docs/pizza-plan.md, section 15), run by the Legendary kit (src/game/pizzaLegends.ts),
// which calls in at each moment declared in src/game/perkEffects.ts (their numbers: ACT4) and lends its helpers. What
// they look and sound like is src/game/legendView4.ts: this file decides who, when and how hard; the view only draws
// what it's told, from the plain state objects here (gameplay never reads a picture).
//
// - Pigeon King's Catch (pigeonCatch): every 10 s of feet on the table (enhanced 7; two copies twice as often) the
//   Pigeon King's pigeon swoops on the diving (or stomping) foot nearest a pizza and carries it off the table: a kill,
//   paid and counted like any (tips, kill counts, the meter, milestones; combo counts smacks, so none). Only an
//   ordinary foot: never a boss, a mini-boss, their Ghost echoes or twins, a friendly zombie, a foot a fight moves by
//   hand or one pinned by a set-piece. The foot is held while the pigeon swoops; one that slips out of reach (phased,
//   buried, turned friendly) before the talons close is let go, and one that shrugs off the killing blow (Not Dead
//   Yet) is dropped.
// - Second Rise (doughRise): a beaten foot rises again as a dough copy of itself for 6 s and bites the nearest foot
//   every second for ×0.5 (a Legendary hit, × the strength it rose at: enhanced ×0.75, copies add). At most 3 are up
//   at once. They're sprites, never feet (nothing zombifies them; smacks and stomps pass them by). A boss or
//   mini-boss, its echoes and twins, a friendly zombie, or a foot carried off or taken through a portal never rises.
//   They bite bosses too, never a friendly zombie or a foot being carried off. They sink as the wave closes.
// - Cathedral Crust (stoneFirst): as each wave starts every pizza is set in stone for its first stomp (enhanced two;
//   copies add). That stomp is blocked whatever it is (piercing too: it's checked early, after Nonna's ladle) and the
//   stone shatters on it; the foot is turned to stone, stunned 1.5 s (Status.Stone: bosses, mini-bosses and feet a
//   fight moves by hand are only blocked). Never the Ghost's pizza.
//
// Gameplay randomness is Math.random (none is needed here), cosmetic crand (the view's); gameplay timing is on the
// game clock (clockOf), never a Phaser tween.

import { clockOf } from '../core/clock';
import { W } from '../config';
import type { PizzaPerk } from '../data/pizzas';
import { Action, Hit, Status, Unit } from '../effects';
import { pickEnh, stoneable } from '../effects/status';
import { grantsPerk } from '../effects/trigger';
import type { Arena } from './arena';
import type { Foot } from './Foot';
import type { Pizza } from './Pizza';
import { ACT4 } from './perkEffects';
import type { LegendHost } from './pizzaLegends';
import { Legends4View, LEGEND4_SFX } from './legendView4';

export { LEGEND4_SFX };

/** The Pigeon King's pigeon on its way to a foot: tweened on the game clock (u: 0 → 1 over its swoop). */
export interface Swoop {
  f: Foot;
  src: Pizza;
  /** The side it comes in from (−1 left, 1 right), where it starts and where it grips the foot. */
  side: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  u: number;
  light: boolean;
}

/** A risen dough foot. `ax`/`ay`: where it is as far as the rules go (it rose there, then each foot it bites): the
 *  nearest foot is found from there, never from its drawn place (the view's, which bobs). */
export interface Risen {
  perk: PizzaPerk;
  k: number;
  key: string;
  originY: number;
  scale: number;
  ax: number;
  ay: number;
  age: number;
  biteT: number;
  /** A bite on its way (its lunge, 150 ms on the game clock). */
  lunging: boolean;
  light: boolean;
  gone: boolean;
  /** The pizzas it rose for: it bites only while one of them still grants the perk (the off-switch, as a prop asks
   *  its owner). */
  owners: Pizza[];
}

export class Act4Legends {
  private a: Arena;
  private h: LegendHost;
  readonly view: Legends4View;
  private risen: Risen[] = [];

  constructor(arena: Arena, host: LegendHost, view: Legends4View) {
    this.a = arena;
    this.h = host;
    this.view = view;
  }

  private get clock() {
    return clockOf(this.a.sc);
  }

  /** A foot the pigeon may carry off now: on the table and reachable, not a friendly zombie or one a fight moves by
   *  hand (the declaration's Catchable, checked again as the talons close). */
  private reachable(f: Foot): boolean {
    return f.alive && f.hittable && !f.zombieHold && !f.puppet && !f.brain.free && !f.pinned && f.y > 0;
  }

  runStart(): void {
    this.clear();
  }

  // ════════════════════════════ Pigeon King's Catch ════════════════════════════

  /** The timer came round (Effect.Every, at the front diving foot): the pigeon swoops on f. */
  catchFoot(f: Foot, pies: Pizza[]): boolean {
    const src = pies.reduce<Pizza | null>((b, q) => (!b || Math.abs(q.x - f.x) < Math.abs(b.x - f.x) ? q : b), null);
    if (!src) return false;
    // (held while the pigeon comes: it can't dive on or stomp; marked as in its talons, so no other pigeon takes it)
    f.brain.pigeon = 1;
    f.stunT = Math.max(f.stunT, 0.6);
    if (f.state === 'descend' || f.state === 'stomp' || f.state === 'lift') f.vy = 0;
    for (const p of pies) p.perkFired({ quip: false });
    const side = f.x < W / 2 ? -1 : 1;
    // (it grips the foot by the ankle: the top of the foot, where the leg comes out)
    const ankle = f.y - f.meta.footHeight * f.scale * 0.92;
    const s: Swoop = { f, src, side, x0: side < 0 ? -140 : W + 140, y0: Math.max(120, ankle - 300), x1: f.x, y1: ankle, u: 0, light: this.h.bossFight() };
    this.view.swoopIn(s);
    this.clock.tween({
      targets: s,
      u: 1,
      duration: 460,
      ease: 'Sine.In',
      onUpdate: () => {
        // (it follows the foot, should anything nudge it while it's held)
        if (f.alive) {
          s.x1 = f.x;
          s.y1 = f.y - f.meta.footHeight * f.scale * 0.92;
        }
        this.view.swoopAt(s);
      },
      onComplete: () => this.grab(s),
    });
    return true;
  }

  /** The talons close: the foot is carried off (a kill), unless it slipped out of reach or shrugged off the blow. */
  private grab(s: Swoop): void {
    const f = s.f;
    f.brain.pigeon = 0;
    if (!f.alive || !this.reachable(f)) {
      this.view.swoopMiss(s);
      return;
    }
    // (being taken: nothing bites it, takes it again or raises it)
    f.brain.portal = 1;
    this.h.kill(f);
    if (f.alive) {
      // (back from a killing blow: dropped)
      f.brain.portal = 0;
      f.knock(900);
      this.view.swoopMiss(s);
      return;
    }
    this.view.carryOff(s);
  }

  // ════════════════════════════ Second Rise ════════════════════════════

  /** A foot was beaten (Effect.OnKill, Action.Summon(Ally.RisenDough)): it rises again as dough, if there's room. */
  rise(f: Foot, perk: PizzaPerk, k: number, pies: Pizza[]): void {
    if (this.risen.length >= ACT4.risenMax) return;
    // (a foot that was in the pigeon's talons as it fell is let go: it can rise)
    f.brain.pigeon = 0;
    const r: Risen = {
      perk,
      k,
      key: f.meta.footKey,
      originY: f.meta.originY,
      scale: f.scale / f.type.scale / f.meta.textures.res,
      ax: f.cx,
      ay: f.cy,
      age: 0,
      // (its first bite once it's up)
      biteT: 0.7,
      lunging: false,
      light: this.h.bossFight(),
      gone: false,
      owners: pies,
    };
    this.risen.push(r);
    this.view.rise(r, f, pies);
  }

  /** Every frame: the risen bite the nearest foot every second, and sink when their time is up. */
  doughTick(dt: number): void {
    // (the dough copies of the feet on the table are made ahead, one a frame, not as each one falls mid-fight)
    this.view.warmDough(this.a.allFeet());
    if (!this.risen.length) return;
    for (const r of [...this.risen]) {
      r.age += dt;
      if (r.age >= ACT4.riseFor) {
        this.sink(r, false);
        continue;
      }
      r.biteT -= dt;
      if (r.lunging || r.biteT > 0) continue;
      // (it bites only while a pizza it rose for still grants the perk; it waits out its time otherwise)
      if (!r.owners.some((p) => grantsPerk(p, r.perk))) {
        r.biteT = 0.2;
        continue;
      }
      const t = this.nearest(r);
      if (!t) {
        // (nothing to bite: it looks again shortly)
        r.biteT = 0.2;
        continue;
      }
      r.biteT = ACT4.biteEvery;
      r.lunging = true;
      this.view.lunge(r, t);
      this.clock.after(150, () => this.bite(r, t));
    }
    this.view.risenStep(this.risen, dt);
  }

  /** The foot nearest a risen one (from where the rules have it): alive, on the table, not a friendly zombie or a foot
   *  being carried off. Bosses too. */
  private nearest(r: Risen): Foot | null {
    let best: Foot | null = null;
    let bd = Infinity;
    for (const f of this.a.allFeet()) {
      if (!f.alive || !f.hittable || f.zombieHold || f.brain.portal || f.brain.pigeon || f.y < 60) continue;
      const d = Math.hypot(f.cx - r.ax, f.cy - r.ay);
      if (d < bd) {
        bd = d;
        best = f;
      }
    }
    return best;
  }

  private bite(r: Risen, f: Foot): void {
    r.lunging = false;
    if (r.gone || !f.alive || !f.hittable || f.zombieHold || f.brain.portal || f.y < 60) return;
    if (!r.owners.some((p) => grantsPerk(p, r.perk))) return;
    r.ax = f.cx;
    r.ay = f.cy;
    this.view.chomp(r, f);
    this.h.strike(f, r.perk, Action.Damage(Hit.Legend(ACT4.bite), { knock: Unit.Amount(80) }), r.k);
  }

  private sink(r: Risen, quick: boolean): void {
    r.gone = true;
    this.risen.splice(this.risen.indexOf(r), 1);
    this.view.sink(r, quick);
  }

  /** The wave closes: the risen sink back into dough. */
  doughDown(): void {
    for (const r of [...this.risen]) this.sink(r, true);
  }

  /** Risen dough feet up now (the STATS tab). */
  risenCount(): number {
    return this.risen.length;
  }

  // ════════════════════════════ Cathedral Crust ════════════════════════════

  /** A wave starts: every pizza is set in stone for its first stomp (one for each Cathedral Crust, an enhanced one two;
   *  never the Ghost's pizza). */
  stoneUp(perk: PizzaPerk): void {
    const n = this.h.granting(perk).reduce((k, p) => k + pickEnh(ACT4.stones, p.enhanced), 0);
    const set: Pizza[] = [];
    for (const p of this.a.alivePizzas()) {
      p.flags.stoneLeft = p.haunted ? 0 : n;
      if (n > 0 && !p.haunted) set.push(p);
    }
    if (set.length) this.view.stoneSettle(set, this.h.bossFight());
  }

  /** A stomp is coming down on p (Effect.Defend, Guard.Early): its stone takes it. True when it's blocked. */
  stoneStomp(f: Foot, p: Pizza, perk: PizzaPerk, pies: Pizza[]): boolean {
    const left = Number(p.flags.stoneLeft ?? 0);
    if (left <= 0) return false;
    p.flags.stoneLeft = left - 1;
    const src = pies.includes(p) ? p : pies.reduce((b, q) => (Math.abs(q.x - p.x) < Math.abs(b.x - p.x) ? q : b), pies[0]);
    const stoned = stoneable(f);
    this.view.stoneBlock(f, p, src, left - 1, stoned, this.h.bossFight());
    // (turned to stone: an ordinary foot, stunned and knocked off it; a boss is only blocked)
    this.h.strike(f, perk, Action.Apply(Status.Stone(ACT4.stoned)));
    if (stoned && f.alive) f.knock(700);
    return true;
  }

  /** Every frame: the stone under each pizza (the view's), dimmed while no Cathedral Crust grants. */
  stoneTick(perk: PizzaPerk): void {
    this.view.stoneShells(this.a.alivePizzas(), this.h.granting(perk).length > 0);
  }

  /** The wave closes: the stone comes off every pizza. */
  stoneDown(): void {
    for (const p of this.a.allPizzas()) if (p.flags.stoneLeft) p.flags.stoneLeft = 0;
    this.view.stoneOff();
  }

  // ——— the scene ———

  clear(): void {
    this.risen = [];
    this.view.clear();
  }
}
