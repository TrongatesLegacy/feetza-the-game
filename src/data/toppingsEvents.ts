// Event toppings: 20 that change wave events, rare event drops, shiny feet and hero sightings (5 per rarity).
// Each rarity has one trade-off that cuts or removes events for raw power. The scene reads the stats in
// src/game/toppingKit.ts (event rolls, flyer time, chests, drops, shinies).

import type { Upgrade } from './upgrades';
import { NeedsMeter } from './itemKinds';
import { Rarity } from './rarity';
import { Effect, Op, Stat, Trick, Unit } from '../effects';
import { eventName, type EventId } from '../game/events';
import { Topping } from './toppingDefs';

/** The hero sighting event is being built separately: its toppings switch on once it exists. */
const sightings = () => !!eventName('sighting' as EventId);

export const EVENT_TOPPINGS: Upgrade[] = [
  // ——— Common ———
  Topping({
    id: 'rubberneck', name: 'Rubberneck', icon: '👀',
    rarity: Rarity.Common,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.EventMult,
        Op.Add(Unit.Percent(25)),
      ),
    ],
    needsEvents: true,
  }),
  Topping({
    id: 'tipmagnet', name: 'Tip Jar Magnet', icon: '💰',
    rarity: Rarity.Common,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.EventTips,
        Op.Add(Unit.Percent(50)),
      ),
    ],
    needsEvents: true,
  }),
  Topping({
    id: 'slowflyers', name: 'Slow Flyers', icon: '🐌',
    rarity: Rarity.Common,
    maxLevel: 2,
    effects: [
      Effect.Stat(
        Stat.FlyerSec,
        Op.Add(Unit.Seconds(1.5)),
      ),
    ],
    needsEvents: true,
  }),
  Topping({
    id: 'luckypenny', name: 'Lucky Penny', icon: '🥉',
    rarity: Rarity.Common,
    maxLevel: 3,
    effects: [
      Effect.Stat(
        Stat.DropAdd,
        Op.Add(Unit.Percent(25)),
      ),
    ],
    needsEvents: true,
  }),
  Topping({
    id: 'earplugs', name: 'Earplugs', icon: '🔇',
    rarity: Rarity.Common,
    maxLevel: 2,
    effects: [
      Effect.Stat(
        Stat.Damage,
        Op.Mul(Unit.Mult(1.05)),
      ),
      Effect.Stat(
        Stat.EventMult,
        Op.Sub(Unit.Percent(50)),
      ),
    ],
  }),

  // ——— Rare ———
  Topping({
    id: 'birdfeeder', name: 'Bird Feeder', icon: '🪺',
    rarity: Rarity.Rare,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.FlyerBias,
        Op.On(),
      ),
      Effect.Stat(
        Stat.SeagullCrust,
        Op.Add(Unit.Amount(1)),
      ),
    ],
    needsEvents: true,
  }),
  Topping({
    id: 'skeletonkey', name: 'Skeleton Key', icon: '🗝️',
    rarity: Rarity.Rare,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.ChestLess,
        Op.Add(Unit.Count(1)),
      ),
      Effect.Stat(
        Stat.MimicMult,
        Op.Mul(Unit.Mult(0.5)),
      ),
    ],
    needsEvents: true,
  }),
  Topping({
    id: 'shinyradar', name: 'Shiny Radar', icon: '📡',
    rarity: Rarity.Rare,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.ShinyMult,
        Op.Mul(Unit.Mult(2)),
      ),
    ],
  }),
  Topping({
    id: 'secondlook', name: 'Second Look', icon: '🔁',
    rarity: Rarity.Rare,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.EventRetry,
        Op.On(),
      ),
    ],
    needsEvents: true,
  }),
  Topping({
    id: 'donotdisturb', name: 'Do Not Disturb', icon: '🚫',
    rarity: Rarity.Rare,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.Damage,
        Op.Mul(Unit.Mult(1.1)),
      ),
      Effect.Stat(
        Stat.CoinMult,
        Op.Add(Unit.Percent(10)),
      ),
      Effect.Stat(
        Stat.NoEvents,
        Op.On(),
      ),
    ],
  }),

  // ——— Epic ———
  Topping({
    id: 'eventhorizon', name: 'Event Horizon', icon: '🎪',
    rarity: Rarity.Epic,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.EventAlways,
        Op.On(),
      ),
    ],
    needsEvents: true,
  }),
  Topping({
    id: 'treasuremap', name: 'Treasure Map', icon: '🗺️',
    rarity: Rarity.Epic,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.DropMult,
        Op.Mul(Unit.Mult(3)),
      ),
    ],
    needsEvents: true,
  }),
  Topping({
    id: 'shinyhunter', name: 'Shiny Hunter', icon: '🔦',
    rarity: Rarity.Epic,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.ShinyMult,
        Op.Mul(Unit.Mult(3)),
      ),
      Effect.Stat(
        Stat.ShinyCrusts,
        Op.Add(Unit.Amount(10)),
      ),
    ],
  }),
  // the hero sighting event reads sightingMult and sightingHits
  Topping({
    id: 'herohotline', name: 'Hero Hotline', icon: '☎️',
    rarity: Rarity.Epic,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.SightingMult,
        Op.Mul(Unit.Mult(3)),
      ),
      Effect.Stat(
        Stat.SightingHits,
        Op.Set(Unit.Count(1)),
      ),
    ],
    needsEvents: true,
    offerIf: sightings,
  }),
  Topping({
    id: 'tunnelvision', name: 'Tunnel Vision', icon: '🔭',
    rarity: Rarity.Epic,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.SuperGain,
        Op.Add(Unit.Percent(25)),
      ),
      Effect.Stat(
        Stat.NoEvents,
        Op.On(),
      ),
    ],
    needsMeter: NeedsMeter.Meter,
  }),

  // ——— Legendary ———
  Topping({
    id: 'grandparade', name: 'Grand Parade', icon: '🎺',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.EventMult,
        Op.Add(Unit.Percent(200)),
      ),
      Effect.Stat(
        Stat.EventCount,
        Op.Set(Unit.Count(2)),
      ),
    ],
    needsEvents: true,
  }),
  Topping({
    id: 'mimicwhisperer', name: 'Mimic Whisperer', icon: '🤫',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.MimicDrop,
        Op.Set(Unit.Mult(5)),
      ),
    ],
    needsEvents: true,
  }),
  Topping({
    id: 'rainbowroad', name: 'Rainbow Road', icon: '🌈',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    // (the scene: toppingKit's rainbow shiny before wave 20)
    text: { up: (_l, auto) => `${auto}; one turns up before wave 20`, scene: [20] },
    effects: [
      Effect.Stat(
        Stat.ShinyMult,
        Op.Mul(Unit.Mult(5)),
      ),
      Effect.Trick(Trick.RainbowRoad),
    ],
  }),
  // the hero sighting event reads sightingEvery
  Topping({
    id: 'herosummit', name: 'Hero Summit', icon: '🦸',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.SightingEvery,
        Op.Set(Unit.Count(10)),
      ),
    ],
    needsEvents: true,
    offerIf: sightings,
  }),
  Topping({
    id: 'vowfocus', name: 'Vow of Focus', icon: '🧘',
    rarity: Rarity.Legendary,
    maxLevel: 1,
    effects: [
      Effect.Stat(
        Stat.Damage,
        Op.Mul(Unit.Mult(1.25)),
      ),
      Effect.Stat(
        Stat.EndCrustMult,
        Op.Add(Unit.Percent(20)),
      ),
      Effect.Stat(
        Stat.NoEvents,
        Op.On(),
      ),
      Effect.Stat(
        Stat.NoGolden,
        Op.On(),
      ),
    ],
  }),
];
