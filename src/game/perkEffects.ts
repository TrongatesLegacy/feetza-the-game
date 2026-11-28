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
import { Action, Ally, At, Cond, Dps, Effect, Enh, Grow, Guard, HitStat, Nth, Pay, Pick, Reset, Scope, Status, Unit, Who, type EffectData } from '../effects';
import { locationFor } from './Run';

/** The night locations (Night Shift's +20%). */
const NIGHT = new Set(['space', 'oldtown', 'cellar']);
/** Is wave n at a night location? (Cond.Night) */
export const isNight = (n: number): boolean => NIGHT.has(locationFor(n));

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
  // ——— step 3: the stomp defences ———
  Slip: 'slip',
  ShellShut: 'shellShut',
  Ladle: 'ladle',
  Stone: 'stone',
  GhostGuard: 'ghostGuard',
  SandWall: 'sandWall',
  CitadelWall: 'citadelWall',
  HalfStomp: 'halfStomp',
  // ——— step 3: the per-foot auras ———
  TimeStopArrive: 'timeStopArrive',
  PestoSlow: 'pestoSlow',
  PestoLetGo: 'pestoLetGo',
  ChorizoFlare: 'chorizoFlare',
  TimeStopHold: 'timeStopHold',
  PhaseHeal: 'phaseHeal',
  // ——— step 3: a wave opening, and the walls going up ———
  GhostsBack: 'ghostsBack',
  BossShield: 'bossShield',
  RainbowShift: 'rainbowShift',
  MysteryReveal: 'mysteryReveal',
  SinkWave: 'sinkWave',
  SandUp: 'sandUp',
  BridgeUp: 'bridgeUp',
  HarpyReset: 'harpyReset',
  TimeStopSet: 'timeStopSet',
  // ——— step 3: placed, enhanced, destroyed ———
  CenturyStart: 'centuryStart',
  BorrowFirst: 'borrowFirst',
  MysteryFirst: 'mysteryFirst',
  SinkFirst: 'sinkFirst',
  CenturyGrow: 'centuryGrow',
  CitadelPennant: 'citadelPennant',
  Erupt: 'erupt',
  Olympian: 'olympian',
  FenrirHowl: 'fenrirHowl',
  Untouchable: 'untouchable',
  // ——— step 3: the ticking props ———
  HarpyTick: 'harpyTick',
  BridgeTick: 'bridgeTick',
  CoilTick: 'coilTick',
  GorgonTick: 'gorgonTick',
  MazeTick: 'mazeTick',
  EmberTick: 'emberTick',
  WhirlTick: 'whirlTick',
  InkTick: 'inkTick',
  SootTick: 'sootTick',
  GhostTick: 'ghostTick',
  RingsTick: 'ringsTick',
  NonnaSecret: 'nonnaSecret',
  // ——— step 3: the wave closing, and Kitchen Sink's next pick ———
  RingsDown: 'ringsDown',
  EpicsAway: 'epicsAway',
  SinkNext: 'sinkNext',
  // ——— step 3: the Legendaries (src/game/pizzaLegends*.ts) ———
  BridgeSparks: 'bridgeSparks',
  FrostSparks: 'frostSparks',
  RoarSparks: 'roarSparks',
  Portal: 'portal',
  RoarEnd: 'roarEnd',
  HoleEnd: 'holeEnd',
  CitadelDown: 'citadelDown',
  TideOff: 'tideOff',
  BakeFreshen: 'bakeFreshen',
  LadleReady: 'ladleReady',
  CitadelUp: 'citadelUp',
  TideReady: 'tideReady',
  FirstBake: 'firstBake',
  Act3Timers: 'act3Timers',
  HoleStep: 'holeStep',
  RippleStep: 'rippleStep',
  TideTick: 'tideTick',
  Cannon: 'cannon',
  Tray: 'tray',
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
  GhostPass: 'ghostPass',
} as const;
export type LookId = (typeof Look)[keyof typeof Look];

/** The one-offs' own per-hit factors (Grow.By): PizzaPerkKit's FACTORS. */
export const Factor = {
  /** Gorgon's Gaze: a foot turned to stone takes double. */
  Stone: 'stone',
  /** Rainbow Bridge: a foot in a bridged lane (the best bridge it's under). */
  Bridge: 'bridge',
  /** The Legendaries' boost now (Roar Roast's +30% for 4 s after its roar). */
  LegendRoar: 'legendRoar',
} as const;
export type FactorId = (typeof Factor)[keyof typeof Factor];

/** What the kit keeps that a condition can ask about (Cond.Flag): PizzaPerkKit's FLAGS. */
export const Flag = {
  /** T-Rex Ribs: the table is shaking after a crit. */
  Quaking: 'quaking',
  /** Rinkside Pretzel Pie: the rush after a kill. */
  Rushing: 'rushing',
  /** Seaside Fritto: a slice was lost last wave. */
  LostLastWave: 'lostLastWave',
} as const;
export type FlagId = (typeof Flag)[keyof typeof Flag];

const C = <T extends CustomId>(id: T) => Action.Custom(id);
const By = <T extends FactorId>(id: T) => Grow.By(id);
const F = <T extends FlagId>(id: T) => Cond.Flag(id);
const S = <T extends LookId>(id: T) => Action.Show(id);

/** A foot that's on the table, not still coming in. */
const InPlay = Cond.All(Cond.Hittable, Cond.Down(Unit.Px(120)));
const Standing = Cond.All(Cond.Alive, Cond.Hittable);
/** Some foot is out on the table (Siren's Song only counts its time then). */
const FeetOn = Cond.AnyFoot(Cond.All(Cond.Alive, Cond.Hittable, Cond.Down(Unit.Px(60))));

/** A foot standing on the table (past the top). */
const FeetUp = Cond.All(Cond.Alive, Cond.Hittable, Cond.Down(Unit.Px(60)));
/** A foot a Legendary may move: not a friendly zombie, a puppet or a free foot. */
const Movable = Cond.All(Cond.Not(Cond.Friendly), Cond.Not(Cond.Puppet), Cond.Not(Cond.Free));
/** A foot Silver Service's tray bats: diving or stomping, and movable. */
const Batable = Cond.All(Cond.Alive, Cond.Hittable, Movable, Cond.Any(Cond.Diving, Cond.Stomping));
/** A foot Cosmic Crouton Supreme's portal can open on. */
const PortalReady = Cond.All(Cond.Alive, Cond.Hittable, Movable, Cond.Not(Cond.InPortal));

/** Every ported perk's trigger effects, in the order they run on each moment. */
export const PERK_EFFECTS: [PizzaPerk, EffectData[]][] = [
  // ——— timers (the old update(): Meteorite Margherita, Disco Diner Pie, Steam Bun Pie, Comet Calzone, Siren's Song) ———
  ['meteor', [
    Effect.Every(
      Unit.Seconds(15),
      Action.Seq(C(Custom.Meteor), S(Look.Fired)),
      { at: Pick.Random(InPlay), reset: Reset.Wave },
    ),
  ]],
  ['danceBeat', [
    Effect.Every(
      Unit.Seconds(30),
      C(Custom.DanceBeat),
      { fireIf: Cond.AnyFoot(Standing) },
    ),
  ]],
  ['steamVent', [
    Effect.Every(
      Unit.Seconds(20),
      C(Custom.SteamVents),
      { fireIf: Cond.AnyFoot(Cond.All(Standing, Cond.Diving, Cond.Down(Unit.Px(300)))) },
    ),
  ]],
  ['comet', [
    Effect.Every(
      Unit.Seconds(12),
      C(Custom.Comet),
      { at: Pick.Toughest(InPlay), reset: Reset.Wave },
    ),
  ]],
  ['sirenSong', [
    Effect.Every(
      Unit.Seconds(25),
      C(Custom.SirenSong),
      { tickIf: FeetOn, fireIf: FeetOn },
    ),
  ]],

  // ——— on a kill (the old killed()) ———
  // Cream Pie Supreme leaves a splat where it fell; Phantom Waltz may raise a friendly ghost (15%, up to 60%)
  ['pieSplat', [
    Effect.OnKill(C(Custom.PieSplat)),
  ]],
  ['ghostAlly', [
    Effect.OnKill(
      Action.Summon(Ally.FriendlyGhost),
      { chance: Unit.Chance(15), cap: Unit.Chance(60) },
    ),
  ]],
  // Ember Shade, Golden Fleece, Surtr's Ember Crust, Skald's Saga: never for a boss's Ghost echo or its twins
  ['emberTrail', [
    Effect.OnKill(
      C(Custom.Embers),
      { when: Cond.NotEcho },
    ),
  ]],
  ['goldenFleece', [
    Effect.OnKill(
      C(Custom.Fleece),
      { when: Cond.All(Cond.Boss, Cond.NotEcho) },
    ),
  ]],
  ['surtrSpread', [
    Effect.OnKill(
      C(Custom.SpreadFire),
      { when: Cond.All(Cond.NotEcho, Cond.Burning) },
    ),
  ]],
  // (a boss beaten is on the run's list once its banner is up)
  ['skaldSaga', [
    Effect.OnKill(
      Action.Later(Unit.Seconds(1.6), C(Custom.SagaVerse)),
      { when: Cond.All(Cond.NotEcho, Cond.Not(Cond.Decoy), Cond.TrueBoss) },
    ),
  ]],
  ['killRush', [
    Effect.OnKill(C(Custom.KillRush)),
  ]],
  // the pizza the foot was over: Calzone's tip, Bolognese's meatball, Rubber Duck's reroll, Piñata
  ['tipsAbove', [
    Effect.OnKill(
      Action.Tips(Pay.Fixed(Unit.Amount(1)), At.Foot(Unit.Px(40))),
      { scope: Scope.Target },
    ),
  ]],
  ['meatball', [
    Effect.OnKill(
      C(Custom.Meatball),
      { scope: Scope.Target },
    ),
  ]],
  ['killReroll', [
    Effect.OnKill(
      Action.Seq(Action.Reroll(), S(Look.FreeReroll)),
      { scope: Scope.Target, nth: Nth(Enh(Unit.Count(10), Unit.Count(7)), 'duckKills') },
    ),
  ]],
  ['pinata', [
    Effect.OnKill(
      Action.Seq(S(Look.Pinata), Action.Tips(Pay.Kill(Unit.Mult(3), Unit.Amount(6)))),
      { scope: Scope.Target, chance: Unit.Chance(20) },
    ),
  ]],
  // Thousand-Foot Feast: every 100th kill while it's out (enhanced 70th), a slice for every pizza
  ['killSlices', [
    Effect.OnKill(
      Action.Seq(Action.Heal(Who.Table, Unit.Count(1)), S(Look.Feast)),
      { scope: Scope.Each, nth: Nth(Enh(Unit.Count(100), Unit.Count(70)), 'feastKills') },
    ),
  ]],

  // ——— on a smack (the old smacked(), swung() and crit()) ———
  // Dragon Fruit Flambé: 10% a pie that the smack breathes fire up the lane
  ['fireLane', [
    Effect.OnSmack(
      C(Custom.FireLane),
      { scope: Scope.Sum, chance: Unit.Chance(10) },
    ),
  ]],
  ['inkSpray', [
    Effect.OnSmack(
      C(Custom.InkSpray),
      { scope: Scope.Sum, when: Cond.Alive },
    ),
  ]],
  // Snowball Pie: every 8th smack (enhanced 5th) throws a snowball (the count waits when there's no one to hit)
  ['snowball', [
    Effect.OnSmack(
      C(Custom.Snowball),
      { scope: Scope.Each, nth: Nth(Enh(Unit.Count(8), Unit.Count(5)), 'snowN') },
    ),
  ]],
  // Charybdis Swirl: 10% of smacks (enhanced 15%), up to 40%
  ['whirlpool', [
    Effect.OnSmack(
      C(Custom.Whirlpool),
      { when: Cond.Alive, chance: Unit.Chance(10), cap: Unit.Chance(40) },
    ),
  ]],
  // Three-Headed Hound: every 3rd swing (enhanced 2nd) bites three times
  ['tripleBite', [
    Effect.OnSwing(
      C(Custom.TripleBite),
      { scope: Scope.Each, nth: Nth(Enh(Unit.Count(3), Unit.Count(2)), 'biteN'), when: Cond.Alive },
    ),
  ]],
  // T-Rex Ribs: a crit shakes the table
  ['critQuake', [
    Effect.OnCrit(C(Custom.Quake)),
  ]],

  // ——— on a stomp landing (the old afterStomp(); the stomper must still be standing) ———
  ['stompMeter', [
    Effect.OnStomp(
      Action.Seq(Action.Meter(Unit.Percent(5)), S(Look.GarlicMeter)),
      { scope: Scope.Target },
    ),
  ]],
  ['stickyStomp', [
    Effect.OnStomp(
      Action.Seq(Action.Apply(Status.Slow(Unit.Seconds(3), Unit.Percent(40))), S(Look.Sticky)),
      { scope: Scope.Target, when: Cond.Slowable },
    ),
  ]],
  ['mazeLost', [
    Effect.OnStomp(
      C(Custom.Lose),
      { scope: Scope.Target, when: Cond.All(Cond.Not(Cond.Boss), Cond.Not(Cond.Puppet), Cond.Not(Cond.Free)) },
    ),
  ]],
  ['fondueStick', [
    Effect.OnStomp(
      Action.Seq(Action.Apply(Status.Stun(Enh(Unit.Seconds(0.3), Unit.Seconds(0.5)))), S(Look.Fondue)),
      { scope: Scope.Target, when: Cond.Not(Cond.Boss) },
    ),
  ]],
  ['slipStomp', [
    Effect.OnStomp(
      Action.Seq(Action.Apply(Status.Stun(Enh(Unit.Seconds(0.5), Unit.Seconds(0.8)))), S(Look.Slipped)),
      { scope: Scope.Target, when: Cond.Not(Cond.Boss) },
    ),
  ]],
  ['honeyStomp', [
    Effect.OnStomp(
      Action.Seq(Action.Apply(Status.Slow(Unit.Seconds(3), Unit.Percent(40))), Action.Apply(Status.Burn(Unit.Seconds(3), Dps.Smack(Unit.Mult(1)))), S(Look.HotHoney)),
      { scope: Scope.Target },
    ),
  ]],
  ['firstFreeze', [
    Effect.OnStomp(
      Action.Seq(Action.Apply(Status.Freeze(Enh(Unit.Seconds(2), Unit.Seconds(3)))), S(Look.ColdSmoked)),
      { scope: Scope.Target, when: Cond.Not(Cond.Boss), oncePerWave: 'salmonWave' },
    ),
  ]],
  ['frostFire', [
    Effect.OnStomp(
      C(Custom.FrostFire),
      { scope: Scope.Target },
    ),
  ]],

  // ——— a wave opens (step 3; the old waveStart()'s table loop): Phantom Waltz's ghosts come back out (one whose pizza
  // left the table goes with it), then pizza by pizza Bufala's shields for a boss, Arcobaleno's new colour, Mystery
  // Meat's reveal on its first wave, then Kitchen Sink's pick. The kit works the stats out again after, if a colour or
  // a pick changed ———
  ['ghostAlly', [
    Effect.WaveOpen(
      C(Custom.GhostsBack),
      { scope: Scope.Field },
    ),
  ]],
  ['bossShield', [
    Effect.WaveOpen(
      C(Custom.BossShield),
      { scope: Scope.Alive, when: Cond.BossWave },
    ),
  ]],
  ['rainbow', [
    Effect.WaveOpen(
      C(Custom.RainbowShift),
      { scope: Scope.Own },
    ),
  ]],
  ['mystery', [
    Effect.WaveOpen(
      C(Custom.MysteryReveal),
      { scope: Scope.Own },
    ),
  ]],
  ['kitchenSink', [
    Effect.WaveOpen(
      C(Custom.SinkWave),
      { scope: Scope.Each },
    ),
  ]],

  // ——— a wave begins: the walls and the lanes first (Sandcastle Sundae's wall after Arcobaleno's new colour, which
  // may be it; the Bifröst; the harpies' gusts start over; Tikka's clock waits for the first feet) ———
  ['sandWall', [
    Effect.WaveStart(
      C(Custom.SandUp),
      { scope: Scope.Field },
    ),
  ]],
  ['bridgeLane', [
    Effect.WaveStart(
      C(Custom.BridgeUp),
      { scope: Scope.Field },
    ),
  ]],
  ['harpyGust', [
    Effect.WaveStart(
      C(Custom.HarpyReset),
      { scope: Scope.Field },
    ),
  ]],
  ['timeStop', [
    Effect.WaveStart(
      C(Custom.TimeStopSet),
      { scope: Scope.Field },
    ),
  ]],

  // ——— a wave begins (the old waveStart(), after the table loop and the walls) ———
  // Colossus Forge: the waves it has hammered in so far
  ['forgeWaves', [
    Effect.WaveStart(
      Action.Later(Unit.Seconds(2.5), C(Custom.ForgeStrike)),
      { scope: Scope.Each },
    ),
  ]],
  ['waveTips', [
    Effect.WaveStart(
      Action.Later(Unit.Seconds(0.7), Action.Seq(Action.Tips(Pay.Fixed(Unit.Amount(6)), At.Pizza(Unit.Px(80))), S(Look.OldTown))),
      { scope: Scope.Each },
    ),
  ]],
  // Seaside Fritto: a slice went last wave, so this one pays more (its quip, once the banner's gone)
  ['lossTips', [
    Effect.WaveStart(C(Custom.LossTipsQuip)),
  ]],
  ['postBoss', [
    Effect.WaveStart(
      Action.Later(Unit.Seconds(1.4), S(Look.MoonCheese)),
      { when: Cond.AfterBoss },
    ),
  ]],
  ['actStart', [
    Effect.WaveStart(
      Action.Later(Unit.Seconds(1.4), S(Look.VictoryLap)),
      { when: Cond.ActStart },
    ),
  ]],
  // Pirate's Treasure: a chest on the 4th wave of every stage
  ['treasure', [
    Effect.WaveStart(
      Action.Later(Unit.Seconds(4.5), C(Custom.Chest)),
      { when: Cond.WaveInStage(4) },
    ),
  ]],

  // ——— the wave is clear (the old waveClear(), after the Forge) ———
  // Kitchen Sink picks the next wave's bonus now, so the shop shows the one you'll get (a random draw, pizza by pizza)
  ['kitchenSink', [
    Effect.WaveClear(
      C(Custom.SinkNext),
      { scope: Scope.Alive },
    ),
  ]],
  ['wave5Tips', [
    Effect.WaveClear(
      Action.Seq(Action.Tips(Pay.Tuna(), At.Pizza(Unit.Px(80))), S(Look.Tuna)),
      { scope: Scope.Sum },
    ),
  ]],
  ['perfectTips', [
    Effect.WaveClear(
      Action.Seq(Action.Tips(Pay.Earned(Unit.Percent(50)), At.Pizza(Unit.Px(80))), S(Look.PerfectPie)),
      { when: Cond.All(Cond.Perfect, Cond.Earned) },
    ),
  ]],
  // (one pass over the table, the Ghost's pizza too: Supreme's neighbours, then Caviar's crust, pizza by pizza)
  ['neighbourRegrow', [
    Effect.WaveClear(
      Action.Heal(Who.Neighbours, Unit.Count(1)),
      { scope: Scope.Alive, nth: Nth(Enh(Unit.Count(3), Unit.Count(2)), 'supremeWaves') },
    ),
  ]],
  ['crustWaves', [
    Effect.WaveClear(
      Action.Seq(Action.Crust(Unit.Count(1)), S(Look.GoldenCrust)),
      { scope: Scope.Alive, nth: Nth(Enh(Unit.Count(10), Unit.Count(7)), 'caviarWaves') },
    ),
  ]],

  // ——— a stomp's defences (step 3; the old preStomp, ladleStomp, stoneStomp, guardStomp, stompDmg) ———
  // Early, before anything else, piercing stomps too: the cream pie's slip (a piercing foot goes through it), Pizza
  // Fantasma's ghost pass (25% a pie), Oyster Rockefeller's shell (shut for 2 s after a stomp, enhanced 3), Nonna's ladle
  ['pieSplat', [
    Effect.Defend(
      Guard.Early,
      C(Custom.Slip),
      { scope: Scope.Field, when: Cond.Not(Cond.Pierces) },
    ),
  ]],
  ['ghostPass', [
    Effect.Defend(
      Guard.Early,
      Action.Seq(S(Look.GhostPass), Action.Knock(Unit.Amount(420))),
      { scope: Scope.Target, chance: Unit.Chance(25) },
    ),
  ]],
  ['stompCooldown', [
    Effect.Defend(
      Guard.Early,
      C(Custom.ShellShut),
      { scope: Scope.Target },
    ),
  ]],
  ['nonnaLadle', [
    Effect.Defend(
      Guard.Early,
      C(Custom.Ladle),
      { scope: Scope.Field },
    ),
  ]],
  // At the walls (a piercing stomp never gets here): Granite Crust once a wave, then (never on the Ghost's pizza)
  // Phantom Waltz's ghost, Sandcastle Sundae's wall, Sandcastle Citadel's
  ['stoneStomp', [
    Effect.Defend(
      Guard.Wall,
      C(Custom.Stone),
      { scope: Scope.Target, oncePerWave: 'stoneWave' },
    ),
  ]],
  ['ghostAlly', [
    Effect.Defend(
      Guard.Wall,
      C(Custom.GhostGuard),
      { scope: Scope.Field, when: Cond.Not(Cond.Haunted) },
    ),
  ]],
  ['sandWall', [
    Effect.Defend(
      Guard.Wall,
      C(Custom.SandWall),
      { scope: Scope.Field, when: Cond.Not(Cond.Haunted) },
    ),
  ]],
  ['citadelWall', [
    Effect.Defend(
      Guard.Wall,
      C(Custom.CitadelWall),
      { scope: Scope.Field, when: Cond.Not(Cond.Haunted) },
    ),
  ]],
  // ——— the per-foot auras (step 3; the old update()'s loop over the feet), every frame for each foot standing ———
  // Tikka Time Machine: the clock stops once the wave's first feet are on the table (before the feet are looked at)
  ['timeStop', [
    Effect.FrameStart(
      C(Custom.TimeStopArrive),
      { scope: Scope.Field },
    ),
  ]],
  // over the pizza a foot hovers above or comes down on: Chicken Pesto's slow grows the longer it waits (and lets go
  // when it's not over one), Chorizo & Pepper's flare after a long hover, Inferno Calzone's smoulder
  ['slowWait', [
    Effect.Aura(
      C(Custom.PestoSlow),
      { scope: Scope.Target, when: Cond.Over, off: C(Custom.PestoLetGo) },
    ),
  ]],
  ['hoverFire', [
    Effect.Aura(
      C(Custom.ChorizoFlare),
      { scope: Scope.Target, when: Cond.All(Cond.Hovering, Cond.Burnable) },
    ),
  ]],
  ['burnAbove', [
    Effect.Aura(
      Action.Apply(Status.Burn(Unit.Seconds(0.6), Dps.Flat(6))),
      { scope: Scope.Target, when: Cond.Over },
    ),
  ]],
  // across the field: Tikka's freeze holds every foot but a boss while its clock runs; Burrata & Heirloom heals when
  // a boss changes phase (the phases are followed whatever's on the table)
  ['timeStop', [
    Effect.Aura(
      C(Custom.TimeStopHold),
      { scope: Scope.Field },
    ),
  ]],
  ['phaseHeal', [
    Effect.Aura(
      C(Custom.PhaseHeal),
      { scope: Scope.Field, when: Cond.Boss },
    ),
  ]],

  // ——— the ticking props (step 3; the old update()'s ticks), every frame after the timers, in this order. Each prop
  // outlives the moment that made it and tidies itself up when its pizza goes, so it runs whatever's on the table ———
  // Harpy Feather Pie's gusts
  ['harpyGust', [
    Effect.EachFrame(
      C(Custom.HarpyTick),
      { scope: Scope.Field },
    ),
  ]],
  // the Bifröst shimmers, and goes when its pizza stops bridging
  ['bridgeLane', [
    Effect.EachFrame(
      C(Custom.BridgeTick),
      { scope: Scope.Field },
    ),
  ]],
  // Serpent's Coil holds
  ['serpentCoil', [
    Effect.EachFrame(
      C(Custom.CoilTick),
      { scope: Scope.Field },
    ),
  ]],
  // Gorgon's Gaze turns feet to stone
  ['gorgonGaze', [
    Effect.EachFrame(
      C(Custom.GorgonTick),
      { scope: Scope.Field },
    ),
  ]],
  // Labyrinth Lasagne's lost feet find their way back
  ['mazeLost', [
    Effect.EachFrame(
      C(Custom.MazeTick),
      { scope: Scope.Field },
    ),
  ]],
  // Ember Shade's embers wait for the next foot
  ['emberTrail', [
    Effect.EachFrame(
      C(Custom.EmberTick),
      { scope: Scope.Field },
    ),
  ]],
  // Charybdis Swirl's whirlpools
  ['whirlpool', [
    Effect.EachFrame(
      C(Custom.WhirlTick),
      { scope: Scope.Field },
    ),
  ]],
  // Squid Ink Nero's ink
  ['inkSpray', [
    Effect.EachFrame(
      C(Custom.InkTick),
      { scope: Scope.Field },
    ),
  ]],
  // Chimney Soot Pie's soot
  ['sootAbove', [
    Effect.EachFrame(
      C(Custom.SootTick),
      { scope: Scope.Field },
    ),
  ]],
  // Phantom Waltz's ghosts drift by their pizzas
  ['ghostAlly', [
    Effect.EachFrame(
      C(Custom.GhostTick),
      { scope: Scope.Field },
    ),
  ]],
  // Haunted Hawaiian's rings orbit
  ['orbitRing', [
    Effect.EachFrame(
      C(Custom.RingsTick),
      { scope: Scope.Field },
    ),
  ]],
  // Nonna's Secret, once an act
  ['nonna', [
    Effect.EachFrame(
      C(Custom.NonnaSecret),
      { scope: Scope.Field },
    ),
  ]],

  // ——— a pizza placed, enhanced, destroyed (step 3; the old placed(), enhanced(), destroyed()) ———
  // placed: Century Crust's 2 extra slices (bought now, not a saved run coming back); the borrowers' first picks
  // (Arcobaleno's colour, Mystery Meat's hidden perk, Kitchen Sink's bonus), each a random draw, in this order
  ['bigStart', [
    Effect.OnPlaced(
      C(Custom.CenturyStart),
      { scope: Scope.Own, when: Cond.Fresh },
    ),
    Effect.OnEnhanced(
      C(Custom.CenturyGrow),
      { scope: Scope.Own },
    ),
  ]],
  ['rainbow', [
    Effect.OnPlaced(
      C(Custom.BorrowFirst),
      { scope: Scope.Own },
    ),
  ]],
  ['mystery', [
    Effect.OnPlaced(
      C(Custom.MysteryFirst),
      { scope: Scope.Own },
    ),
  ]],
  ['kitchenSink', [
    Effect.OnPlaced(
      C(Custom.SinkFirst),
      { scope: Scope.Target },
    ),
  ]],
  // enhanced: Sandcastle Citadel's keep flies its fourth pennant at once
  ['citadelWall', [
    Effect.OnEnhanced(
      C(Custom.CitadelPennant),
      { scope: Scope.Own },
    ),
  ]],
  // destroyed with its perk on (not stale, and not the Ghost's): Volcano Calzone erupts; Olympian Feast keeps it once
  ['erupt', [
    Effect.OnDestroyed(
      C(Custom.Erupt),
      { scope: Scope.Own, when: Cond.Fresh },
    ),
  ]],
  ['surviveOnce', [
    Effect.OnDestroyed(
      C(Custom.Olympian),
      { scope: Scope.Own, when: Cond.Fresh },
    ),
  ]],
  // lost: Fenrir's wolf howls for it (its own loss too, a last howl); Untouchable brings the run's first loss back
  ['fenrirHowl', [
    Effect.OnLost(
      C(Custom.FenrirHowl),
      { scope: Scope.Field },
    ),
  ]],
  ['firstBack', [
    Effect.OnLost(
      C(Custom.Untouchable),
      { scope: Scope.Field },
    ),
  ]],

  // ——— the per-hit numbers (step 3; the old damageMult, waveDmgMult, tipMult, scoreMult, knockMult, extraDouble and the
  // event, shiny and Golden Menu multipliers). Each folds in the order listed here: the order the old code multiplied
  // and added them in, so every number is the same to the last bit ———
  // a hit's damage: Ham & Mushroom near it (smacks), Jerk Chicken on fast feet, Saffron Lobster on bosses while it's
  // whole, Slayer on bosses, Thermidor on mini-bosses, Cellar Mushroom Medley on the undead, T-Rex Ribs while the table
  // shakes, the Gorgon's stone, the Bifröst, Frostbite on cold feet, Roar Roast's roar (then the wave's own, below)
  ['nearDmg', [
    Effect.PerHit(
      HitStat.Damage,
      Grow.Mul(Unit.Percent(10)),
      { scope: Scope.Each, when: Cond.All(Cond.Smack, Cond.Near) },
    ),
  ]],
  ['fastDmg', [
    Effect.PerHit(
      HitStat.Damage,
      Grow.Mul(Unit.Percent(15)),
      { when: Cond.Fast },
    ),
  ]],
  ['fullBoss', [
    Effect.PerHit(
      HitStat.Damage,
      Grow.Mul(Unit.Percent(15)),
      { scope: Scope.Each, when: Cond.All(Cond.BossKind, Cond.Full) },
    ),
  ]],
  ['slayer', [
    Effect.PerHit(
      HitStat.Damage,
      Grow.Mul(Unit.Percent(20)),
      { when: Cond.BossKind },
    ),
  ]],
  ['miniDmg', [
    Effect.PerHit(
      HitStat.Damage,
      Grow.Mul(Unit.Percent(25)),
      { when: Cond.Mini },
    ),
  ]],
  ['undeadDmg', [
    Effect.PerHit(
      HitStat.Damage,
      Grow.Mul(Unit.Percent(10)),
      { when: Cond.Undead },
    ),
  ]],
  ['critQuake', [
    Effect.PerHit(
      HitStat.Damage,
      Grow.Mul(Unit.Percent(10)),
      { when: F(Flag.Quaking) },
    ),
  ]],
  ['gorgonGaze', [
    Effect.PerHit(
      HitStat.Damage,
      By(Factor.Stone),
      { scope: Scope.Field },
    ),
  ]],
  ['bridgeLane', [
    Effect.PerHit(
      HitStat.Damage,
      By(Factor.Bridge),
      { scope: Scope.Field },
    ),
  ]],
  ['frostbite', [
    Effect.PerHit(
      HitStat.Damage,
      Grow.Mul(Unit.Percent(25)),
      { when: Cond.Cold },
    ),
  ]],
  ['hearthRoar', [
    Effect.PerHit(
      HitStat.Damage,
      By(Factor.LegendRoar),
      { scope: Scope.Field },
    ),
  ]],
  // every hit in a wave, whatever the foot: Victory Lap on an act's first wave, Night Shift at night, Moon Cheese
  // doubles the wave after a boss
  ['actStart', [
    Effect.PerHit(
      HitStat.WaveDamage,
      Grow.Mul(Unit.Percent(10)),
      { when: Cond.ActStart },
    ),
  ]],
  ['nightDmg', [
    Effect.PerHit(
      HitStat.WaveDamage,
      Grow.Mul(Unit.Percent(20)),
      { when: Cond.Night },
    ),
  ]],
  ['postBoss', [
    Effect.PerHit(
      HitStat.WaveDamage,
      Grow.Mul(Unit.Percent(100)),
      { when: Cond.AfterBoss },
    ),
  ]],
  // a kill's tips: Mediterranean while it's fully fresh, Champagne in boss waves, Victory Lap, Seaside Fritto after a
  // lost slice, Golden Margherita on golden kills, Golden Fleece on bosses
  ['freshTips', [
    Effect.PerHit(
      HitStat.Tips,
      Grow.Add(Unit.Percent(10)),
      { scope: Scope.Each, when: Cond.FullFresh },
    ),
  ]],
  ['bossTips', [
    Effect.PerHit(
      HitStat.Tips,
      Grow.Add(Unit.Percent(20)),
      { when: Cond.BossWave },
    ),
  ]],
  ['actStart', [
    Effect.PerHit(
      HitStat.Tips,
      Grow.Add(Unit.Percent(10)),
      { when: Cond.ActStart },
    ),
  ]],
  ['lossTips', [
    Effect.PerHit(
      HitStat.Tips,
      Grow.Add(Unit.Percent(12)),
      { when: F(Flag.LostLastWave) },
    ),
  ]],
  ['goldenDouble', [
    Effect.PerHit(
      HitStat.Tips,
      Grow.Mul(Unit.Percent(100)),
      { when: Cond.Golden },
    ),
  ]],
  ['goldenFleece', [
    Effect.PerHit(
      HitStat.Tips,
      Grow.Add(Unit.Percent(50)),
      { when: Cond.Boss },
    ),
  ]],
  // the pizza a foot was over: Wagyu's score, Marrow's and Rooftop Rosemary's knockback
  ['scoreAbove', [
    Effect.PerHit(
      HitStat.Score,
      Grow.Mul(Unit.Percent(30)),
      { scope: Scope.Target },
    ),
  ]],
  ['knockAbove', [
    Effect.PerHit(
      HitStat.Knock,
      Grow.Mul(Unit.Percent(40)),
      { scope: Scope.Target },
    ),
  ]],
  ['roofKnock', [
    Effect.PerHit(
      HitStat.Knock,
      Grow.Mul(Unit.Percent(8)),
      { scope: Scope.Target },
    ),
  ]],
  // follow-up smacks: Pizza Romana while it's whole, Rinkside Pretzel Pie's rush
  ['fullSpeed', [
    Effect.PerHit(
      HitStat.ExtraDouble,
      Grow.Add(Unit.Percent(10)),
      { scope: Scope.Each, when: Cond.Full },
    ),
  ]],
  ['killRush', [
    Effect.PerHit(
      HitStat.ExtraDouble,
      Grow.Add(Unit.Percent(5)),
      { scope: Scope.Each, when: F(Flag.Rushing) },
    ),
  ]],
  // the table's: Porcini's shiny feet, Four-Leaf Clover's events, Fig & Rose's drops, Royal Wedding's Golden Menu
  ['shinyDouble', [
    Effect.PerHit(
      HitStat.ShinyRate,
      Grow.Add(Unit.Percent(100)),
    ),
  ]],
  ['eventChance', [
    Effect.PerHit(
      HitStat.EventRate,
      Grow.Add(Unit.Percent(25)),
    ),
  ]],
  ['eventDrops', [
    Effect.PerHit(
      HitStat.EventDrops,
      Grow.Add(Unit.Percent(25)),
    ),
  ]],
  ['goldenDiscount', [
    Effect.PerHit(
      HitStat.GoldenPrice,
      Grow.Cut(Unit.Percent(25)),
    ),
  ]],

  // Raclette Run: its first stomp each wave (enhanced two) takes half a slice
  ['halfStomp', [
    Effect.Soften(
      C(Custom.HalfStomp),
      { scope: Scope.Target },
    ),
  ]],

  // ——— the wave closes (step 3; before anything is paid): the rings off the table (they'd hang frozen over the
  // shop), the splats, the soot, the ink and the sand wall go (the ghosts wait out the shop unseen), then the
  // Legendaries': Roar Roast's boost ends, an open hole closes, the Citadel's pennants fly again, no tide still to
  // come, The First Bake tops every pizza up ———
  ['orbitRing', [
    Effect.WaveClose(
      C(Custom.RingsDown),
      { scope: Scope.Field },
    ),
  ]],
  ['pieSplat', [
    Effect.WaveClose(
      C(Custom.EpicsAway),
      { scope: Scope.Field },
    ),
  ]],
  ['hearthRoar', [
    Effect.WaveClose(
      C(Custom.RoarEnd),
      { scope: Scope.Field },
    ),
  ]],
  ['blackHole', [
    Effect.WaveClose(
      C(Custom.HoleEnd),
      { scope: Scope.Field },
    ),
  ]],
  ['citadelWall', [
    Effect.WaveClose(
      C(Custom.CitadelDown),
      { scope: Scope.Field },
    ),
  ]],
  ['tidalWash', [
    Effect.WaveClose(
      C(Custom.TideOff),
      { scope: Scope.Field },
    ),
  ]],
  ['firstBake', [
    Effect.WaveClose(
      C(Custom.BakeFreshen),
      { scope: Scope.Field },
    ),
  ]],

  // ——— the Legendaries L1–L9 (step 3; src/game/pizzaLegends*.ts runs each one-off). Keep their lessons
  // (docs/pizza-plan.md): never move a friendly zombie, a puppet or a free foot; a boss's own slow is never made
  // worse; a hit is Action.Damage with Hit.Legend (legendDmg, scaled with the heat) ———
  // a smack: the Bifröst's and Frostbite's sparks on the smacks they strengthen (their looks, in their old place),
  // Roar Roast's embers, then Cosmic Crouton Supreme's portal (1% a pie, enhanced 1.5%, at most 5%; never a friendly
  // zombie, a puppet, a free foot or one already through)
  ['bridgeLane', [
    Effect.OnSmack(
      C(Custom.BridgeSparks),
      { scope: Scope.Field },
    ),
  ]],
  ['frostbite', [
    Effect.OnSmack(
      C(Custom.FrostSparks),
      { when: Cond.Cold },
    ),
  ]],
  ['hearthRoar', [
    Effect.OnSmack(
      C(Custom.RoarSparks),
      { scope: Scope.Field },
    ),
  ]],
  ['croutonPortal', [
    Effect.OnSmack(
      C(Custom.Portal),
      { chance: Unit.Chance(1), cap: Unit.Chance(5), when: PortalReady },
    ),
  ]],
  // a wave starts (after every other perk's): Nonna's swats come back, the Citadel goes up, the tide is due every
  // 4th wave (enhanced 3rd), The First Bake freshens the table and bakes a slice over the top
  ['nonnaLadle', [
    Effect.WaveStart(
      C(Custom.LadleReady),
      { scope: Scope.Field },
    ),
  ]],
  ['citadelWall', [
    Effect.WaveStart(
      C(Custom.CitadelUp),
      { scope: Scope.Field },
    ),
  ]],
  ['tidalWash', [
    Effect.WaveStart(
      C(Custom.TideReady),
      { scope: Scope.Field },
    ),
  ]],
  ['firstBake', [
    Effect.WaveStart(
      C(Custom.FirstBake),
      { scope: Scope.Field },
    ),
  ]],
  // every frame (after the props): Roar Roast's and Black Olive Hole's clocks, the hole's pull, the roar's ripple, the
  // tide rolling in, then Big Top Pie's cannon every 20 s of feet on the table (at the toughest) and Silver Service's
  // tray every 15 s once a foot is diving
  ['hearthRoar', [
    Effect.EachFrame(
      C(Custom.Act3Timers),
      { scope: Scope.Field },
    ),
  ]],
  ['blackHole', [
    Effect.EachFrame(
      C(Custom.HoleStep),
      { scope: Scope.Field },
    ),
  ]],
  ['hearthRoar', [
    Effect.EachFrame(
      C(Custom.RippleStep),
      { scope: Scope.Field },
    ),
  ]],
  ['tidalWash', [
    Effect.EachFrame(
      C(Custom.TideTick),
      { scope: Scope.Field },
    ),
  ]],
  ['bigTopCannon', [
    Effect.Every(
      Unit.Seconds(20),
      C(Custom.Cannon),
      { tickIf: Cond.AnyFoot(FeetUp), at: Pick.Toughest(Cond.All(FeetUp, Cond.Down(Unit.Px(120)))) },
    ),
  ]],
  ['silverTray', [
    Effect.Every(
      Unit.Seconds(15),
      C(Custom.Tray),
      { fireIf: Cond.AnyFoot(Cond.All(Batable, Cond.Down(Unit.Px(300)))) },
    ),
  ]],
];

/** The perks whose behaviour runs on the trigger bus. */
export const BUS_PERKS = new Set<PizzaPerk>(PERK_EFFECTS.map(([p]) => p));
