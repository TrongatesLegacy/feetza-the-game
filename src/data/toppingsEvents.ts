// Event toppings: 20 that change wave events, rare event drops, shiny feet and hero sightings (5 per rarity).
// Each rarity has one trade-off that cuts or removes events for raw power. The scene reads the stats in
// src/game/toppingKit.ts (event rolls, flyer time, chests, drops, shinies).

import type { Rarity, Stats, Upgrade } from './upgrades';
import { meterBoostText } from '../game/slamMode';
import { eventName, type EventId } from '../game/events';

/** The hero sighting event is being built separately: its toppings switch on once it exists. */
const sightings = () => !!eventName('sighting' as EventId);

function ev(id: string, name: string, icon: string, rarity: Rarity, max: number, desc: string, apply: (s: Stats) => void, extra: Partial<Upgrade> = {}): Upgrade {
  return { id, name, icon, rarity, max, desc: () => desc, apply, needsEvents: true, ...extra };
}

/** A trade-off that cuts events: shown with its cost in red, and never needs events to be useful. */
function quiet(id: string, name: string, icon: string, rarity: Rarity, max: number, up: string, down: string, apply: (s: Stats) => void, extra: Partial<Upgrade> = {}): Upgrade {
  return { id, name, icon, rarity, max, desc: () => up, downside: down, apply, ...extra };
}

export const EVENT_TOPPINGS: Upgrade[] = [
  // ——— Common ———
  ev('rubberneck', 'Rubberneck', '👀', 'common', 3, '+25% chance of a wave event', (s) => { s.eventMult += 0.25; }),
  ev('tipmagnet', 'Tip Jar Magnet', '💰', 'common', 3, 'Wave events pay +50% tips', (s) => { s.eventTips += 0.5; }),
  ev('slowflyers', 'Slow Flyers', '🐌', 'common', 2, 'Flyers stay on screen 1.5s longer', (s) => { s.flyerSec += 1.5; }),
  ev('luckypenny', 'Lucky Penny', '🥉', 'common', 3, '+25% chance of a rare event drop', (s) => { s.dropAdd += 0.25; }),
  quiet('earplugs', 'Earplugs', '🔇', 'common', 2, '+5% smack damage', '−50% chance of a wave event (and of each Grand Parade event)', (s) => { s.damage *= 1.05; s.eventMult -= 0.5; }),

  // ——— Rare ———
  ev('birdfeeder', 'Bird Feeder', '🪺', 'rare', 1, 'Events lean to flyers; golden seagulls give +1 crust', (s) => { s.flyerBias = true; s.seagullCrust += 1; }),
  ev('skeletonkey', 'Skeleton Key', '🗝️', 'rare', 1, 'Chests open with 1 fewer smack; mimics half as likely', (s) => { s.chestLess += 1; s.mimicMult *= 0.5; }),
  { id: 'shinyradar', name: 'Shiny Radar', icon: '📡', rarity: 'rare', max: 1, desc: () => 'Shiny feet are twice as common', apply: (s) => { s.shinyMult *= 2; } },
  ev('secondlook', 'Second Look', '🔁', 'rare', 1, 'A missed wave event comes back once, the next wave', (s) => { s.eventRetry = true; }),
  quiet('donotdisturb', 'Do Not Disturb', '🚫', 'rare', 1, '+10% smack damage, +10% tips', 'No wave events this run', (s) => { s.damage *= 1.1; s.coinMult += 0.1; s.noEvents = true; }),

  // ——— Epic ———
  ev('eventhorizon', 'Event Horizon', '🎪', 'epic', 1, 'Every normal wave has a wave event', (s) => { s.eventAlways = true; }),
  ev('treasuremap', 'Treasure Map', '🗺️', 'epic', 1, 'Rare event drops are 3× as likely', (s) => { s.dropMult *= 3; }),
  { id: 'shinyhunter', name: 'Shiny Hunter', icon: '🔦', rarity: 'epic', max: 1, desc: () => 'Shiny feet 3× as common; each pays 10 Golden Crusts', apply: (s) => { s.shinyMult *= 3; s.shinyCrusts += 10; } },
  // the hero sighting event reads sightingMult and sightingHits
  { id: 'herohotline', name: 'Hero Hotline', icon: '☎️', rarity: 'epic', max: 1, desc: () => 'Hero sightings 3× as likely; one smack catches them', apply: (s) => { s.sightingMult *= 3; s.sightingHits = 1; }, needsEvents: true, offerIf: sightings },
  quiet('tunnelvision', 'Tunnel Vision', '🔭', 'epic', 1, 'Meter charges 25% faster', 'No wave events this run', (s) => { s.superGain += 0.25; s.noEvents = true; }, { needsMeter: 'meter', desc: () => meterBoostText(25) }),

  // ——— Legendary ———
  ev('grandparade', 'Grand Parade', '🎺', 'legendary', 1, 'Two wave events every normal wave', (s) => { s.eventAlways = true; s.eventCount = 2; }),
  ev('mimicwhisperer', 'Mimic Whisperer', '🤫', 'legendary', 1, 'Beaten mimics always roll their drop, at 5× the chance', (s) => { s.mimicDrop = 5; }),
  { id: 'rainbowroad', name: 'Rainbow Road', icon: '🌈', rarity: 'legendary', max: 1, desc: () => 'Shiny feet 5× as common; one turns up before wave 20', apply: (s) => { s.shinyMult *= 5; } },
  // the hero sighting event reads sightingEvery
  { id: 'herosummit', name: 'Hero Summit', icon: '🦸', rarity: 'legendary', max: 1, desc: () => 'A hero sighting every 10 waves, guaranteed', apply: (s) => { s.sightingEvery = 10; }, needsEvents: true, offerIf: sightings },
  quiet('vowfocus', 'Vow of Focus', '🧘', 'legendary', 1, '+25% damage, +20% end-of-run crusts', 'No wave events or golden feet', (s) => { s.damage *= 1.25; s.endCrustMult += 0.2; s.noEvents = true; s.noGolden = true; }),
];
