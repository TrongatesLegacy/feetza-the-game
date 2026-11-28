// The pizza perks' behaviours as trigger effects (docs/effects-plan.md, step 2): what fires them, when, how often and
// what it does, declared once per perk and run by the trigger bus (src/game/perkBus.ts). The perk's numbers are in
// src/game/perkStats.ts; what's drawn when one fires lives in PizzaPerkKit (its LOOKS and its one-offs, CUSTOM).
//
// The order matters and is kept: on each moment the triggers run in the order they're listed here (the order the
// old hooks ran them in), so the seeded game draws its random numbers in the same order.
//
// Still in PizzaPerkKit's hooks, not yet triggers (listed in docs/effects-plan.md, "Step 2: what was built"): the
// stomp defences (preStomp, stoneStomp, guardStomp, stompDmg), the per-foot auras in update() (Chicken Pesto, Chorizo,
// Inferno, Tikka's freeze, Burrata), the table loop at a wave's start (Bufala, Arcobaleno, Mystery Meat, Kitchen
// Sink), the rings, the Legendaries (src/game/pizzaLegends*.ts) and every damage, tips and knockback multiplier.

import type { PizzaPerk } from '../data/pizzas';
import { Action, Ally, At, Cond, Dps, Effect, Enh, Nth, Pay, Pick, Reset, Scope, Status, Unit, Who, type EffectData } from '../effects';

/** The one-offs a perk does that aren't shared actions (yet): each is PizzaPerkKit's own (src/game/pizzaPerks.ts). */
export const Custom = {
  Meteor: 'meteor',
  DanceBeat: 'danceBeat',
  SteamVents: 'steamVents',
  Comet: 'comet',
  SirenSong: 'sirenSong',
  PieSplat: 'pieSplat',
  Embers: 'embers',
  Fleece: 'fleece',
  SpreadFire: 'spreadFire',
  SagaVerse: 'sagaVerse',
  KillRush: 'killRush',
  Meatball: 'meatball',
  FireLane: 'fireLane',
  InkSpray: 'inkSpray',
  Snowball: 'snowball',
  Whirlpool: 'whirlpool',
  TripleBite: 'tripleBite',
  Quake: 'quake',
  Lose: 'lose',
  FrostFire: 'frostFire',
  ForgeStrike: 'forgeStrike',
  LossTipsQuip: 'lossTipsQuip',
  Chest: 'chest',
} as const;
export type CustomId = (typeof Custom)[keyof typeof Custom];

/** What's shown when a perk fires (a quip, a sound, the pizza's moment): PizzaPerkKit's LOOKS. */
export const Look = {
  Pinata: 'pinata',
  FreeReroll: 'freeReroll',
  Feast: 'feast',
  GarlicMeter: 'garlicMeter',
  Sticky: 'sticky',
  Fondue: 'fondue',
  Slipped: 'slipped',
  HotHoney: 'hotHoney',
  ColdSmoked: 'coldSmoked',
  OldTown: 'oldTown',
  MoonCheese: 'moonCheese',
  VictoryLap: 'victoryLap',
  Tuna: 'tuna',
  PerfectPie: 'perfectPie',
  GoldenCrust: 'goldenCrust',
  /** The pizza's own moment, with its usual quip. */
  Fired: 'fired',
} as const;
export type LookId = (typeof Look)[keyof typeof Look];

const C = <T extends CustomId>(id: T) => Action.Custom(id);
const S = <T extends LookId>(id: T) => Action.Show(id);

/** A foot that's on the table, not still coming in. */
const InPlay = Cond.All(Cond.Hittable, Cond.Down(Unit.Px(120)));
const Standing = Cond.All(Cond.Alive, Cond.Hittable);
/** Some foot is out on the table (Siren's Song only counts its time then). */
const FeetOn = Cond.AnyFoot(Cond.All(Cond.Alive, Cond.Hittable, Cond.Down(Unit.Px(60))));

/** Every ported perk's trigger effects, in the order they run on each moment. */
export const PERK_EFFECTS: [PizzaPerk, EffectData[]][] = [
  // ——— timers (the old update(): Meteorite Margherita, Disco Diner Pie, Steam Bun Pie, Comet Calzone, Siren's Song) ———
  ['meteor', [Effect.Every(Unit.Seconds(15), Action.Seq(C(Custom.Meteor), S(Look.Fired)), { at: Pick.Random(InPlay), reset: Reset.Wave })]],
  ['danceBeat', [Effect.Every(Unit.Seconds(30), C(Custom.DanceBeat), { fireIf: Cond.AnyFoot(Standing) })]],
  ['steamVent', [Effect.Every(Unit.Seconds(20), C(Custom.SteamVents), { fireIf: Cond.AnyFoot(Cond.All(Standing, Cond.Diving, Cond.Down(Unit.Px(300)))) })]],
  ['comet', [Effect.Every(Unit.Seconds(12), C(Custom.Comet), { at: Pick.Toughest(InPlay), reset: Reset.Wave })]],
  ['sirenSong', [Effect.Every(Unit.Seconds(25), C(Custom.SirenSong), { tickIf: FeetOn, fireIf: FeetOn })]],

  // ——— on a kill (the old killed()) ———
  // Cream Pie Supreme leaves a splat where it fell; Phantom Waltz may raise a friendly ghost (15%, up to 60%)
  ['pieSplat', [Effect.OnKill(C(Custom.PieSplat))]],
  ['ghostAlly', [Effect.OnKill(Action.Summon(Ally.FriendlyGhost), { chance: Unit.Chance(15), cap: Unit.Chance(60) })]],
  // Ember Shade, Golden Fleece, Surtr's Ember Crust, Skald's Saga: never for a boss's Ghost echo or its twins
  ['emberTrail', [Effect.OnKill(C(Custom.Embers), { when: Cond.NotEcho })]],
  ['goldenFleece', [Effect.OnKill(C(Custom.Fleece), { when: Cond.All(Cond.Boss, Cond.NotEcho) })]],
  ['surtrSpread', [Effect.OnKill(C(Custom.SpreadFire), { when: Cond.All(Cond.NotEcho, Cond.Burning) })]],
  // (a boss beaten is on the run's list once its banner is up)
  ['skaldSaga', [Effect.OnKill(Action.Later(Unit.Seconds(1.6), C(Custom.SagaVerse)), { when: Cond.All(Cond.NotEcho, Cond.Not(Cond.Decoy), Cond.TrueBoss) })]],
  ['killRush', [Effect.OnKill(C(Custom.KillRush))]],
  // the pizza the foot was over: Calzone's tip, Bolognese's meatball, Rubber Duck's reroll, Piñata
  ['tipsAbove', [Effect.OnKill(Action.Tips(Pay.Fixed(Unit.Amount(1)), At.Foot(-40)), { scope: Scope.Target })]],
  ['meatball', [Effect.OnKill(C(Custom.Meatball), { scope: Scope.Target })]],
  ['killReroll', [Effect.OnKill(Action.Seq(Action.Reroll(), S(Look.FreeReroll)), { scope: Scope.Target, nth: Nth(Enh(Unit.Count(10), Unit.Count(7)), 'duckKills') })]],
  ['pinata', [Effect.OnKill(Action.Seq(S(Look.Pinata), Action.Tips(Pay.Kill(Unit.Mult(3), Unit.Amount(6)))), { scope: Scope.Target, chance: Unit.Chance(20) })]],
  // Thousand-Foot Feast: every 100th kill while it's out (enhanced 70th), a slice for every pizza
  ['killSlices', [Effect.OnKill(Action.Seq(Action.Heal(Who.Table, Unit.Count(1)), S(Look.Feast)), { scope: Scope.Each, nth: Nth(Enh(Unit.Count(100), Unit.Count(70)), 'feastKills') })]],

  // ——— on a smack (the old smacked(), swung() and crit()) ———
  // Dragon Fruit Flambé: 10% a pie that the smack breathes fire up the lane
  ['fireLane', [Effect.OnSmack(C(Custom.FireLane), { scope: Scope.Sum, chance: Unit.Chance(10) })]],
  ['inkSpray', [Effect.OnSmack(C(Custom.InkSpray), { scope: Scope.Sum, when: Cond.Alive })]],
  // Snowball Pie: every 8th smack (enhanced 5th) throws a snowball (the count waits when there's no one to hit)
  ['snowball', [Effect.OnSmack(C(Custom.Snowball), { scope: Scope.Each, nth: Nth(Enh(Unit.Count(8), Unit.Count(5)), 'snowN') })]],
  // Charybdis Swirl: 10% of smacks (enhanced 15%), up to 40%
  ['whirlpool', [Effect.OnSmack(C(Custom.Whirlpool), { when: Cond.Alive, chance: Unit.Chance(10), cap: Unit.Chance(40) })]],
  // Three-Headed Hound: every 3rd swing (enhanced 2nd) bites three times
  ['tripleBite', [Effect.OnSwing(C(Custom.TripleBite), { scope: Scope.Each, nth: Nth(Enh(Unit.Count(3), Unit.Count(2)), 'biteN'), when: Cond.Alive })]],
  // T-Rex Ribs: a crit shakes the table
  ['critQuake', [Effect.OnCrit(C(Custom.Quake))]],

  // ——— on a stomp landing (the old afterStomp(); the stomper must still be standing) ———
  ['stompMeter', [Effect.OnStomp(Action.Seq(Action.Meter(Unit.Percent(5)), S(Look.GarlicMeter)), { scope: Scope.Target })]],
  ['stickyStomp', [Effect.OnStomp(Action.Seq(Action.Apply(Status.Slow(Unit.Seconds(3), Unit.Percent(40))), S(Look.Sticky)), { scope: Scope.Target, when: Cond.Slowable })]],
  ['mazeLost', [Effect.OnStomp(C(Custom.Lose), { scope: Scope.Target, when: Cond.All(Cond.Not(Cond.Boss), Cond.Not(Cond.Puppet), Cond.Not(Cond.Free), Cond.NotPossessed) })]],
  ['fondueStick', [Effect.OnStomp(Action.Seq(Action.Apply(Status.Stun(Enh(Unit.Seconds(0.3), Unit.Seconds(0.5)))), S(Look.Fondue)), { scope: Scope.Target, when: Cond.All(Cond.Not(Cond.Boss), Cond.NotPossessed) })]],
  ['slipStomp', [Effect.OnStomp(Action.Seq(Action.Apply(Status.Stun(Enh(Unit.Seconds(0.5), Unit.Seconds(0.8)))), S(Look.Slipped)), { scope: Scope.Target, when: Cond.Not(Cond.Boss) })]],
  ['honeyStomp', [Effect.OnStomp(Action.Seq(Action.Apply(Status.Slow(Unit.Seconds(3), Unit.Percent(40))), Action.Apply(Status.Burn(Unit.Seconds(3), Dps.Smack(Unit.Mult(1)))), S(Look.HotHoney)), { scope: Scope.Target })]],
  ['firstFreeze', [Effect.OnStomp(Action.Seq(Action.Apply(Status.Freeze(Enh(Unit.Seconds(2), Unit.Seconds(3)))), S(Look.ColdSmoked)), { scope: Scope.Target, when: Cond.Not(Cond.Boss), oncePerWave: 'salmonWave' })]],
  ['frostFire', [Effect.OnStomp(C(Custom.FrostFire), { scope: Scope.Target })]],

  // ——— a wave begins (the old waveStart(), after the table loop and the walls) ———
  // Colossus Forge: the waves it has hammered in so far
  ['forgeWaves', [Effect.WaveStart(Action.Later(Unit.Seconds(2.5), C(Custom.ForgeStrike)), { scope: Scope.Each })]],
  ['waveTips', [Effect.WaveStart(Action.Later(Unit.Seconds(0.7), Action.Seq(Action.Tips(Pay.Fixed(Unit.Amount(6)), At.Pizza(-80)), S(Look.OldTown))), { scope: Scope.Each })]],
  // Seaside Fritto: a slice went last wave, so this one pays more (its quip, once the banner's gone)
  ['lossTips', [Effect.WaveStart(C(Custom.LossTipsQuip))]],
  ['postBoss', [Effect.WaveStart(Action.Later(Unit.Seconds(1.4), S(Look.MoonCheese)), { when: Cond.AfterBoss })]],
  ['actStart', [Effect.WaveStart(Action.Later(Unit.Seconds(1.4), S(Look.VictoryLap)), { when: Cond.ActStart })]],
  // Pirate's Treasure: a chest on the 4th wave of every stage
  ['treasure', [Effect.WaveStart(Action.Later(Unit.Seconds(4.5), C(Custom.Chest)), { when: Cond.WaveInStage(4) })]],

  // ——— the wave is clear (the old waveClear(), after the Forge and Kitchen Sink's next pick) ———
  ['wave5Tips', [Effect.WaveClear(Action.Seq(Action.Tips(Pay.Tuna(), At.Pizza(-80)), S(Look.Tuna)), { scope: Scope.Sum })]],
  ['perfectTips', [Effect.WaveClear(Action.Seq(Action.Tips(Pay.Earned(Unit.Percent(50)), At.Pizza(-80)), S(Look.PerfectPie)), { when: Cond.All(Cond.Perfect, Cond.Earned) })]],
  // (one pass over the table, the Ghost's pizza too: Supreme's neighbours, then Caviar's crust, pizza by pizza)
  ['neighbourRegrow', [Effect.WaveClear(Action.Heal(Who.Neighbours, Unit.Count(1)), { scope: Scope.Alive, nth: Nth(Enh(Unit.Count(3), Unit.Count(2)), 'supremeWaves') })]],
  ['crustWaves', [Effect.WaveClear(Action.Seq(Action.Crust(Unit.Count(1)), S(Look.GoldenCrust)), { scope: Scope.Alive, nth: Nth(Enh(Unit.Count(10), Unit.Count(7)), 'caviarWaves') })]],
];

/** The perks whose behaviour runs on the trigger bus. */
export const BUS_PERKS = new Set<PizzaPerk>(PERK_EFFECTS.map(([p]) => p));
