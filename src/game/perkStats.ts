// The pizza perks' stat parts, as effects: each perk's numbers for its table-wide strength c (1 a pizza, 1.5
// enhanced, half as much again for Mystery Meat, × Napoletana's boost; see PizzaPerkKit.c). Run.buildLedger applies
// them in the Build phase, shared by the pizzas that grant the perk. What the perks do in play is in
// src/game/pizzaPerks.ts (ported onto triggers in step 2 of docs/effects-plan.md).

import type { PizzaPerk } from '../data/pizzas';
import { Effect, Op, Stat, Unit, type EffectData } from '../effects';

const { scale } = Unit;
/** A whole number of things from a strength (rerolls, cutters): rounded, as it always was. */
const whole = (c: number) => Unit.Count(Math.round(c));
/** A count that may be fractional (luck from a perk's strength). */
const some = (c: number) => Unit.of('count', c);

/** The tips from Pepperoni (coins) and the luck pizzas, per strength: added as one sum, as they always were, so the
 *  total stays the same to the last bit. */
export const PERK_TIPS = { coins: Unit.Percent(20), luck: Unit.Percent(15) } as const;

/** Each perk's stat effects, in the order they have always been applied: a stat's sum or product then comes out the
 *  same to the last bit (the balance sim's rounding of tips and health can tell). */
export const PERK_STATS: Partial<Record<PizzaPerk, (c: number) => EffectData[]>> = {
  damage: (c) => [Effect.Stat(Stat.Damage, Op.Boost(scale(Unit.Percent(10), c)))],
  // (Pepperoni's and the luck pizzas' tips are one sum, added in Run.buildLedger: see PERK_TIPS)
  luck: (c) => [Effect.Stat(Stat.Luck, Op.Add(some(c)))],
  stun: (c) => [Effect.Stat(Stat.StunChance, Op.Add(scale(Unit.Chance(8), c)))],
  explode: (c) => [Effect.Stat(Stat.ExplodeDmg, Op.Add(scale(Unit.Amount(15), c)))],
  crit: (c) => [Effect.Stat(Stat.CritChance, Op.Add(scale(Unit.Chance(6), c)))],
  super: (c) => [Effect.Stat(Stat.SuperGain, Op.Add(scale(Unit.Percent(35), c)))],
  score: (c) => [Effect.Stat(Stat.ScoreMult, Op.Add(scale(Unit.Percent(25), c)))],
  reroll: (c) => [Effect.Stat(Stat.FreeRerolls, Op.Add(whole(c)))],
  healWeakest: (c) => [Effect.Stat(Stat.HealWeakest, Op.Add(Unit.PerWave(Math.round(c))))],
  knockback: (c) => [Effect.Stat(Stat.Knockback, Op.Boost(scale(Unit.Percent(35), c)))],
  burnHits: (c) => [Effect.Stat(Stat.BurnDps, Op.Add(scale(Unit.Amount(4), c)))],
  combo: (c) => [Effect.Stat(Stat.ComboBonus, Op.Add(scale(Unit.Seconds(0.6), c)))],
  slowHits: (c) => [Effect.Stat(Stat.SlowPct, Op.Add(scale(Unit.Percent(20), c)))],
  double: (c) => [Effect.Stat(Stat.DoubleChance, Op.Add(scale(Unit.Chance(10), c)))],
  regenAll: (c) => [Effect.Stat(Stat.RegenAll, Op.Add(Unit.PerWave(Math.round(c))))],
  execute: (c) => [Effect.Stat(Stat.Execute, Op.Add(scale(Unit.Percent(12), c)))],
  radius: (c) => [Effect.Stat(Stat.Radius, Op.Boost(scale(Unit.Percent(20), c)))],
  superStart: (c) => [Effect.Stat(Stat.SuperStart, Op.Add(scale(Unit.Percent(40), c)))],
  coinsWave: (c) => [Effect.Stat(Stat.CoinsPerWave, Op.Add(scale(Unit.PerWave(8), c)))],
  critDmg: (c) => [Effect.Stat(Stat.CritMult, Op.Add(scale(Unit.Percent(60), c)))],
  // Feetza 2.0 perks
  splash: (c) => [Effect.Stat(Stat.SplashDmg, Op.Add(scale(Unit.Amount(4), c)))],
  bigHurt: (c) => [Effect.Stat(Stat.BigHurt, Op.Add(scale(Unit.Percent(15), c)))],
  bossDmg: (c) => [Effect.Stat(Stat.BossDmg, Op.Add(scale(Unit.Percent(20), c)))],
  tenthCrit: () => [Effect.Stat(Stat.TenthCrit, Op.On())],
  cutter: (c) => [Effect.Stat(Stat.Cutters, Op.Add(whole(c)))],
  quickTips: (c) => [Effect.Stat(Stat.QuickTips, Op.Add(Unit.Amount(Math.round(c))))],
  counterDiscount: (c) => [Effect.Stat(Stat.CounterDiscount, Op.Add(scale(Unit.Percent(15), c)))],
  extraConsumable: (c) => [Effect.Stat(Stat.ExtraConsumable, Op.Add(whole(c)))],
  crustBonus: (c) => [Effect.Stat(Stat.CrustBonus, Op.Add(scale(Unit.Percent(15), c)))],
  slamStun: () => [Effect.Stat(Stat.SlamStun, Op.On())],
  miniWeak: (c) => [Effect.Stat(Stat.MiniWeak, Op.Add(scale(Unit.Percent(20), c)))],
  stunVuln: (c) => [Effect.Stat(Stat.StunVuln, Op.Add(scale(Unit.Percent(50), c)))],
  freeTopping: () => [Effect.Stat(Stat.FreeTopping, Op.On())],
  // the pizza plan's step 3: Blue Plate Special, Stargazer Calzone
  bluePlate: (c) => [Effect.Stat(Stat.Damage, Op.Boost(scale(Unit.Percent(5), c))), Effect.Stat(Stat.CoinMult, Op.Add(scale(Unit.Percent(5), c)))],
  stargazer: (c) => [Effect.Stat(Stat.CritChance, Op.Add(scale(Unit.Chance(3), c))), Effect.Stat(Stat.CritMult, Op.Add(scale(Unit.Percent(10), c)))],
};
