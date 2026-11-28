// Event toppings: 20 that change wave events, rare event drops, shiny feet and hero sightings (5 per rarity).
// Each rarity has one trade-off that cuts or removes events for raw power. The scene reads the stats in
// src/game/toppingKit.ts (event rolls, flyer time, chests, drops, shinies).

import type { Rarity, Upgrade } from './upgrades';
import { Effect, Op, Stat, Unit, type EffectData } from '../effects';
import { meterBoostText } from '../game/slamMode';
import { eventName, type EventId } from '../game/events';

/** The hero sighting event is being built separately: its toppings switch on once it exists. */
const sightings = () => !!eventName('sighting' as EventId);

function ev(id: string, name: string, icon: string, rarity: Rarity, max: number, desc: string, effects: EffectData[], extra: Partial<Upgrade> = {}): Upgrade {
  return { id, name, icon, rarity, max, desc: () => desc, effects, needsEvents: true, ...extra };
}

/** A trade-off that cuts events: shown with its cost in red, and never needs events to be useful. */
function quiet(id: string, name: string, icon: string, rarity: Rarity, max: number, up: string, down: string, effects: EffectData[], extra: Partial<Upgrade> = {}): Upgrade {
  return { id, name, icon, rarity, max, desc: () => up, downside: down, effects, ...extra };
}

export const EVENT_TOPPINGS: Upgrade[] = [
  // ——— Common ———
  ev('rubberneck', 'Rubberneck', '👀', 'common', 3, '+25% chance of a wave event', [
    Effect.Stat(
      Stat.EventMult,
      Op.Add(Unit.Percent(25)),
    ),
  ]),
  ev('tipmagnet', 'Tip Jar Magnet', '💰', 'common', 3, 'Wave events pay +50% tips', [
    Effect.Stat(
      Stat.EventTips,
      Op.Add(Unit.Percent(50)),
    ),
  ]),
  ev('slowflyers', 'Slow Flyers', '🐌', 'common', 2, 'Flyers stay on screen 1.5s longer', [
    Effect.Stat(
      Stat.FlyerSec,
      Op.Add(Unit.Seconds(1.5)),
    ),
  ]),
  ev('luckypenny', 'Lucky Penny', '🥉', 'common', 3, '+25% chance of a rare event drop', [
    Effect.Stat(
      Stat.DropAdd,
      Op.Add(Unit.Percent(25)),
    ),
  ]),
  quiet('earplugs', 'Earplugs', '🔇', 'common', 2, '+5% smack damage', '−50% chance of a wave event', [
    Effect.Stat(
      Stat.Damage,
      Op.Mul(Unit.Mult(1.05)),
    ),
    Effect.Stat(
      Stat.EventMult,
      Op.Sub(Unit.Percent(50)),
    ),
  ]),

  // ——— Rare ———
  ev('birdfeeder', 'Bird Feeder', '🪺', 'rare', 1, 'Events lean to flyers; golden seagulls give +1 crust', [
    Effect.Stat(
      Stat.FlyerBias,
      Op.On(),
    ),
    Effect.Stat(
      Stat.SeagullCrust,
      Op.Add(Unit.Amount(1)),
    ),
  ]),
  ev('skeletonkey', 'Skeleton Key', '🗝️', 'rare', 1, 'Chests open with 1 fewer smack; mimics half as likely', [
    Effect.Stat(
      Stat.ChestLess,
      Op.Add(Unit.Count(1)),
    ),
    Effect.Stat(
      Stat.MimicMult,
      Op.Mul(Unit.Mult(0.5)),
    ),
  ]),
  { id: 'shinyradar', name: 'Shiny Radar', icon: '📡', rarity: 'rare', max: 1, desc: () => 'Shiny feet are twice as common', effects: [
    Effect.Stat(
      Stat.ShinyMult,
      Op.Mul(Unit.Mult(2)),
    ),
  ] },
  ev('secondlook', 'Second Look', '🔁', 'rare', 1, 'A missed wave event comes back once, the next wave', [
    Effect.Stat(
      Stat.EventRetry,
      Op.On(),
    ),
  ]),
  quiet('donotdisturb', 'Do Not Disturb', '🚫', 'rare', 1, '+10% smack damage, +10% tips', 'No wave events this run', [
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
  ]),

  // ——— Epic ———
  ev('eventhorizon', 'Event Horizon', '🎪', 'epic', 1, 'Every normal wave has a wave event', [
    Effect.Stat(
      Stat.EventAlways,
      Op.On(),
    ),
  ]),
  ev('treasuremap', 'Treasure Map', '🗺️', 'epic', 1, 'Rare event drops are 3× as likely', [
    Effect.Stat(
      Stat.DropMult,
      Op.Mul(Unit.Mult(3)),
    ),
  ]),
  { id: 'shinyhunter', name: 'Shiny Hunter', icon: '🔦', rarity: 'epic', max: 1, desc: () => 'Shiny feet 3× as common; each pays 10 Golden Crusts', effects: [
    Effect.Stat(
      Stat.ShinyMult,
      Op.Mul(Unit.Mult(3)),
    ),
    Effect.Stat(
      Stat.ShinyCrusts,
      Op.Add(Unit.Amount(10)),
    ),
  ] },
  // the hero sighting event reads sightingMult and sightingHits
  { id: 'herohotline', name: 'Hero Hotline', icon: '☎️', rarity: 'epic', max: 1, desc: () => 'Hero sightings 3× as likely; one smack catches them', effects: [
    Effect.Stat(
      Stat.SightingMult,
      Op.Mul(Unit.Mult(3)),
    ),
    Effect.Stat(
      Stat.SightingHits,
      Op.Set(Unit.Count(1)),
    ),
  ], needsEvents: true, offerIf: sightings },
  quiet('tunnelvision', 'Tunnel Vision', '🔭', 'epic', 1, 'Meter charges 25% faster', 'No wave events this run', [
    Effect.Stat(
      Stat.SuperGain,
      Op.Add(Unit.Percent(25)),
    ),
    Effect.Stat(
      Stat.NoEvents,
      Op.On(),
    ),
  ], { needsMeter: 'meter', desc: () => meterBoostText(25) }),

  // ——— Legendary ———
  ev('grandparade', 'Grand Parade', '🎺', 'legendary', 1, '+200% wave event chance, and up to two events a wave', [
    Effect.Stat(
      Stat.EventMult,
      Op.Add(Unit.Percent(200)),
    ),
    Effect.Stat(
      Stat.EventCount,
      Op.Set(Unit.Count(2)),
    ),
  ]),
  ev('mimicwhisperer', 'Mimic Whisperer', '🤫', 'legendary', 1, 'Beaten mimics always roll their drop, at 5× the chance', [
    Effect.Stat(
      Stat.MimicDrop,
      Op.Set(Unit.Mult(5)),
    ),
  ]),
  { id: 'rainbowroad', name: 'Rainbow Road', icon: '🌈', rarity: 'legendary', max: 1, desc: () => 'Shiny feet 5× as common; one turns up before wave 20', effects: [
    Effect.Stat(
      Stat.ShinyMult,
      Op.Mul(Unit.Mult(5)),
    ),
  ] },
  // the hero sighting event reads sightingEvery
  { id: 'herosummit', name: 'Hero Summit', icon: '🦸', rarity: 'legendary', max: 1, desc: () => 'A hero sighting every 10 waves, guaranteed', effects: [
    Effect.Stat(
      Stat.SightingEvery,
      Op.Set(Unit.Count(10)),
    ),
  ], needsEvents: true, offerIf: sightings },
  quiet('vowfocus', 'Vow of Focus', '🧘', 'legendary', 1, '+25% damage, +20% end-of-run crusts', 'No wave events or golden feet', [
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
  ]),
];
