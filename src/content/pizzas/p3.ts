// Phase 3: the 57 new pizzas (15 Chef's Specials, 14 Pizzeria, 14 milestone prizes, 14 Rare Finds).
// Their perks run in src/game/pizzaPerks.ts; their toppings are drawn in src/content/art/toppings-p3*.ts.
// perkText must stay at 40 characters or fewer (one card line).
import type { PizzaType } from '../../data/pizzas';
import { tunaText } from '../../data/perkWave';

export const pizzas: PizzaType[] = [
  // ——— Chef's Specials: simple, cheap, met early ———
  {
    id: 'pugliese', name: 'Pugliese', perk: 'tipsAbove', perkText: '+1 tip for every foot defeated above it',
    shape: 'round', base: 'tomato', cheese: 0.5, toppings: ['onion', 'kalamata', 'cherryTomato', 'oregano'], crust: '#d69a48', cost: 55, route: 'special',
  },
  {
    id: 'hammushroom', name: 'Ham & Mushroom', perk: 'nearDmg', perkText: 'Smacks near it deal +10% damage',
    shape: 'round', base: 'tomato', cheese: 1, toppings: ['ham', 'mushroom', 'parsley'], crust: '#e2ac5c', cost: 50, route: 'special',
  },
  {
    id: 'chickenpesto', name: 'Chicken Pesto', perk: 'slowWait', perkText: 'Hovering feet slow 10% more per second',
    shape: 'round', base: 'pesto', cheese: 0.7, toppings: ['chicken', 'sunDried', 'pineNut'], crust: '#d9a050', cost: 85, route: 'special',
  },
  {
    id: 'tunasweetcorn', name: 'Tuna & Sweetcorn', perk: 'wave5Tips', get perkText() { return tunaText(false); },
    shape: 'round', base: 'tomato', cheese: 0.6, toppings: ['tuna', 'sweetcorn', 'onion'], crust: '#d6a04c', cost: 45, route: 'special',
  },
  {
    id: 'romana', name: 'Pizza Romana', perk: 'fullSpeed', perkText: 'Smacks 10% faster with all slices left',
    shape: 'round', base: 'tomato', cheese: 0.35, toppings: ['mozzarella', 'anchovy', 'caper', 'oregano'], crust: '#cf9040', cost: 70, route: 'special',
  },
  {
    id: 'garlicbread', name: 'Garlic Bread Pizza', perk: 'stompMeter', perkText: 'Stomps on it charge your meter 5%',
    shape: 'round', base: 'white', cheese: 0.8, toppings: ['garlicButter', 'garlic', 'parsley'], crust: '#e0aa58', cost: 40, route: 'special',
  },
  {
    id: 'bolognese', name: 'Bolognese', perk: 'meatball', perkText: 'Kills above it roll a meatball (×1)',
    shape: 'round', base: 'tomato', cheese: 0.6, toppings: ['ragu', 'meatball', 'parmesan', 'basil'], crust: '#d0903e', cost: 110, route: 'special',
  },
  {
    id: 'jerk', name: 'Jerk Chicken', perk: 'fastDmg', perkText: '+15% damage to fast feet',
    shape: 'round', base: 'tomato', cheese: 0.9, toppings: ['jerkChicken', 'scotchBonnet', 'springOnion'], crust: '#c98638', cost: 95, route: 'special',
  },
  {
    id: 'bufala', name: 'Bufala', perk: 'bossShield', perkText: '+1 shield at the start of boss waves',
    shape: 'round', base: 'tomato', cheese: 0, toppings: ['crushedTomato', 'buffalo', 'basil', 'oliveOil'], crust: '#dcaa5c', cost: 125, route: 'special',
  },
  {
    id: 'chorizo', name: 'Chorizo & Pepper', perk: 'hoverFire', perkText: 'Feet hovering over 2s catch fire',
    shape: 'round', base: 'tomato', cheese: 0.9, toppings: ['chorizo', 'redPepper', 'greenPepper', 'onion'], crust: '#cc8a3a', cost: 120, route: 'special',
  },
  {
    id: 'mediterranean', name: 'Mediterranean', perk: 'freshTips', perkText: "+10% tips while it's fully fresh",
    shape: 'round', base: 'tomato', cheese: 0.45, toppings: ['sunDried', 'artichoke', 'kalamata', 'feta'], crust: '#d7a04e', cost: 130, route: 'special',
  },
  {
    id: 'sloppyjoe', name: 'Sloppy Joe', perk: 'stickyStomp', perkText: 'Stompers get sticky (40% slow, 3s)',
    shape: 'round', base: 'bbq', cheese: 0.6, toppings: ['sloppyMince', 'cheddar', 'pickle', 'onion'], crust: '#d29a4a', cost: 100, route: 'special',
  },
  {
    id: 'pomodori', name: 'Quattro Pomodori', perk: 'slipStomp', perkText: 'Its stomper slips (0.5s stun)',
    shape: 'round', base: 'tomato', cheese: 0.4, toppings: ['tomato', 'yellowTomato', 'cherryTomato', 'sunDried', 'basil'], crust: '#d39646', cost: 75, route: 'special',
  },
  {
    id: 'veggiesupreme', name: 'Veggie Supreme', perk: 'neighbourRegrow', perkText: 'Neighbours regrow a slice every 3 waves',
    shape: 'round', base: 'tomato', cheese: 0.9, toppings: ['broccoli', 'sweetcorn', 'redPepper', 'mushroom', 'olive'], crust: '#d59a48', cost: 140, route: 'special',
  },
  {
    id: 'honeychicken', name: 'Hot Honey Chicken', perk: 'honeyStomp', perkText: 'Stompers stick in hot honey and burn',
    shape: 'round', base: 'tomato', cheese: 1, toppings: ['friedChicken', 'chili', 'springOnion', 'honeyDrizzle'], crust: '#d28f3c', cost: 150, route: 'special',
  },

  // ——— Pizzeria: the fanciest, bought with Golden Crusts ———
  {
    id: 'saffronlobster', name: 'Saffron & Lobster', perk: 'fullBoss', perkText: 'Bosses take +15% damage at full slices',
    shape: 'round', base: 'saffron', cheese: 0.4, toppings: ['lobster', 'lemon', 'chives'], crust: '#e0a850', cost: 950, route: 'pizzeria',
  },
  {
    id: 'wagyu', name: 'Wagyu & Truffle', perk: 'scoreAbove', perkText: '+30% score from feet above it',
    shape: 'round', base: 'white', cheese: 0.5, toppings: ['wagyu', 'truffle', 'arugula', 'parmesan'], crust: '#d29848', cost: 1000, route: 'pizzeria',
  },
  {
    id: 'caviar', name: 'Caviar Bianca', perk: 'crustWaves', perkText: '+1 Golden Crust per 10 waves it survives',
    shape: 'round', base: 'white', cheese: 0.5, toppings: ['cremeFraiche', 'caviar', 'chives'], crust: '#e2b46e', cost: 1100, route: 'pizzeria',
  },
  {
    id: 'burrata', name: 'Burrata & Heirloom', perk: 'phaseHeal', perkText: 'Heals 1 slice when a boss changes phase',
    shape: 'round', base: 'pesto', cheese: 0, toppings: ['heirloom', 'burrata', 'basil', 'oliveOil'], crust: '#dcac60', cost: 900, route: 'pizzeria',
  },
  {
    id: 'salmon', name: 'Smoked Salmon & Dill', perk: 'firstFreeze', perkText: "Each wave's first stomper freezes for 2s",
    shape: 'round', base: 'white', cheese: 0.3, toppings: ['cremeFraiche', 'smokedSalmon', 'caper', 'dill'], crust: '#dcac62', cost: 850, route: 'pizzeria',
  },
  {
    id: 'duck', name: "Duck à l'Orange", perk: 'killReroll', perkText: 'Every 10 kills above it: a free reroll',
    shape: 'round', base: 'white', cheese: 0.5, toppings: ['duck', 'orange', 'rosemary'], crust: '#d39a4c', cost: 800, route: 'pizzeria',
  },
  {
    id: 'napolidoc', name: 'Napoli DOC', perk: 'varietyDmg', perkText: '+5% damage per different pizza out',
    shape: 'round', base: 'tomato', cheese: 0, toppings: ['sanMarzano', 'buffalo', 'basil', 'oliveOil'], crust: '#ecc07a', cost: 750, route: 'pizzeria',
  },
  {
    id: 'porcini', name: 'Porcini Tartufata', perk: 'shinyDouble', perkText: 'Shiny feet twice as likely',
    shape: 'round', base: 'white', cheese: 0.7, toppings: ['porcini', 'truffle', 'parsley'], crust: '#d29a50', cost: 880, route: 'pizzeria',
  },
  {
    id: 'champagne', name: 'Champagne Brunch', perk: 'bossTips', perkText: '+20% tips on boss waves',
    shape: 'round', base: 'white', cheese: 0.4, toppings: ['asparagus', 'egg', 'hollandaise', 'chives'], crust: '#e0b068', cost: 820, route: 'pizzeria',
  },
  {
    id: 'thermidor', name: 'Lobster Thermidor', perk: 'miniDmg', perkText: 'Mini-bosses take +25% damage',
    shape: 'round', base: 'white', cheese: 0, toppings: ['thermidorSauce', 'lobsterClaw', 'parsley'], crust: '#d8a052', cost: 980, route: 'pizzeria',
  },
  {
    id: 'figrose', name: 'Fig & Prosciutto Rose', perk: 'eventDrops', perkText: 'Event peel drops 25% more likely',
    shape: 'round', base: 'white', cheese: 0.4, toppings: ['prosciuttoRose', 'fig', 'ricotta', 'honeyDrizzle'], crust: '#d9a456', cost: 870, route: 'pizzeria',
  },
  {
    id: 'marrow', name: 'Bone Marrow & Black Garlic', perk: 'knockAbove', perkText: '+40% knockback above it',
    shape: 'round', base: 'white', cheese: 0.4, toppings: ['marrowBone', 'blackGarlic', 'parsley'], crust: '#c88a40', cost: 1050, route: 'pizzeria',
  },
  {
    id: 'oyster', name: 'Oyster Rockefeller', perk: 'stompCooldown', perkText: "Can't be stomped twice within 2s",
    shape: 'round', base: 'white', cheese: 0.3, toppings: ['spinach', 'oyster', 'breadcrumbs', 'lemon'], crust: '#d6a858', cost: 1000, route: 'pizzeria',
  },
  {
    id: 'goldmargherita', name: 'Gold Leaf Margherita', perk: 'goldenDouble', perkText: 'Golden feet pay double tips',
    shape: 'round', base: 'tomato', cheese: 0.55, toppings: ['mozzarella', 'basil', 'goldLeaf', 'goldRim'], crust: '#e8b84a', cost: 1200, route: 'pizzeria',
  },

  // ——— Milestone prizes (MILESTONES in src/data/meta.ts names each one's goal) ———
  {
    id: 'victorylap', name: 'Victory Lap', perk: 'actStart', perkText: "+10% dmg & tips on an act's first wave",
    shape: 'round', base: 'tomato', cheese: 0.8, toppings: ['chequerFlag', 'pepperoni', 'basil'], crust: '#d6983f', cost: 700, route: 'milestone',
  },
  {
    id: 'slayer', name: 'Boss Slayer Supreme', perk: 'slayer', perkText: '+20% damage to bosses',
    shape: 'round', base: 'tomato', cheese: 0.9, toppings: ['crossedSwords', 'pepperoni', 'sausage', 'chili'], crust: '#c68034', cost: 1000, route: 'milestone',
  },
  {
    id: 'century', name: 'Century Crust', perk: 'bigStart', perkText: 'Starts every run with 10 slices',
    shape: 'deep', base: 'tomato', cheese: 0.9, toppings: ['hundred', 'sausage', 'basil'], crust: '#c88a3e', cost: 1200, route: 'milestone',
  },
  {
    id: 'thousand', name: 'Thousand-Foot Feast', perk: 'killSlices', perkText: 'Every 100 kills: +1 slice on every pizza',
    shape: 'square', base: 'tomato', cheese: 1, toppings: ['pepperoni', 'sausage', 'bacon', 'ham', 'chicken', 'beef'], crust: '#c4843a', cost: 1100, route: 'milestone',
  },
  {
    id: 'perfectpie', name: 'Perfect Pie', perk: 'perfectTips', perkText: '+50% tips on perfect waves',
    shape: 'round', base: 'tomato', cheese: 1, toppings: ['perfectRing'], crust: '#dca04a', cost: 900, route: 'milestone',
  },
  {
    id: 'infernocalzone', name: 'Inferno Calzone', perk: 'burnAbove', perkText: "Feet above it burn; it's fireproof",
    shape: 'calzone', base: 'tomato', cheese: 0, toppings: ['infernoCracks'], crust: '#b4582c', cost: 1000, route: 'milestone',
  },
  {
    id: 'anniversary', name: 'Golden Anniversary', perk: 'crustRun', perkText: '+10% Golden Crusts if on table at end',
    shape: 'round', base: 'white', cheese: 0.6, toppings: ['anniv25', 'pearl', 'goldLeaf'], crust: '#e6b44a', cost: 800, route: 'milestone',
  },
  {
    id: 'peelcollector', name: 'Peel Collector', perk: 'peelDmg', perkText: '+1% damage for every 10 peels you own',
    shape: 'round', base: 'tomato', cheese: 0.9, toppings: ['miniPeel', 'pepperoni', 'basil'], crust: '#d39646', cost: 1000, route: 'milestone',
  },
  {
    id: 'comboking', name: 'Combo King', perk: 'comboLong', perkText: 'Combos last twice as long',
    shape: 'round', base: 'tomato', cheese: 1, toppings: ['crown', 'pepperoni', 'salami', 'olive'], crust: '#d8983c', cost: 950, route: 'milestone',
  },
  {
    id: 'untouchable', name: 'Untouchable', perk: 'firstBack', perkText: 'First pizza lost each run comes back',
    shape: 'round', base: 'white', cheese: 0.8, toppings: ['halo', 'mozzarella', 'basil'], crust: '#e0b060', cost: 1100, route: 'milestone',
  },
  {
    id: 'speedslice', name: 'Speed Slice', perk: 'smackSpeed', perkText: 'Smacks 15% faster',
    shape: 'round', base: 'tomato', cheese: 0.9, toppings: ['lightning', 'pepperoni', 'jalapeno'], crust: '#d4923c', cost: 900, route: 'milestone',
  },
  {
    id: 'nightshift', name: 'Night Shift', perk: 'nightDmg', perkText: '+20% damage on night stages',
    shape: 'round', base: 'ink', cheese: 0.15, toppings: ['moonStars', 'olive'], crust: '#9a6a3a', cost: 850, route: 'milestone',
  },
  {
    id: 'ragnarok', name: 'Ragnarök Roast', perk: 'frostFire', perkText: 'Stompers are frozen, then burned',
    shape: 'round', base: 'tomato', cheese: 0.6, toppings: ['fireIce', 'beef', 'chili'], crust: '#b8743a', cost: 1200, route: 'milestone',
  },
  {
    id: 'olympian', name: 'Olympian Feast', perk: 'surviveOnce', perkText: 'Once a run, it survives on 1 slice',
    shape: 'round', base: 'white', cheese: 0.5, toppings: ['laurel', 'feta', 'kalamata', 'grape'], crust: '#e0b25c', cost: 1200, route: 'milestone',
  },

  // ——— Rare Finds: only found by luck on the new-run screen (bought there with crusts) ———
  {
    id: 'arcobaleno', name: 'Arcobaleno', perk: 'rainbow', perkText: "Each wave: borrows another pizza's perk",
    shape: 'round', base: 'white', cheese: 0.5, toppings: ['rainbowArc', 'rainbowCrust'], crust: '#e0a860', cost: 450, route: 'rare', finish: { glow: 0xff9ae6, sparkle: true },
  },
  {
    id: 'mooncheese', name: 'Moon Cheese', perk: 'postBoss', perkText: 'Double damage the wave after a boss',
    shape: 'round', base: 'moon', cheese: 0, toppings: ['moonCraters', 'starDust'], crust: '#a8a49a', cost: 500, route: 'rare', finish: { glow: 0xcfe4ff, sparkle: true },
  },
  {
    id: 'dragonfruit', name: 'Dragon Fruit Flambé', perk: 'fireLane', perkText: '10% of smacks breathe fire down a lane',
    shape: 'round', base: 'pink', cheese: 0, toppings: ['dragonFruit', 'flambeFlames'], crust: '#c87a44', cost: 550, route: 'rare', finish: { glow: 0xff6a3a, sparkle: true },
  },
  {
    id: 'fantasma', name: 'Pizza Fantasma', perk: 'ghostPass', perkText: '25% of stomps on it pass right through',
    shape: 'round', base: 'white', cheese: 0.6, toppings: ['ghostMozz', 'ghostly'], crust: '#c8d8e8', cost: 500, route: 'rare', finish: { glow: 0xa8e0ff, ghost: true, sparkle: true },
  },
  {
    id: 'mysterymeat', name: 'Mystery Meat', perk: 'mystery', perkText: 'A random big perk, revealed on wave 1',
    shape: 'round', base: 'bbq', cheese: 0.6, toppings: ['mysteryMeat', 'questionMark'], crust: '#b07a44', cost: 400, route: 'rare', finish: { glow: 0xb48aff, sparkle: true },
  },
  {
    id: 'clover', name: 'Four-Leaf Clover', perk: 'eventChance', perkText: 'Wave events 25% more likely',
    shape: 'round', base: 'pesto', cheese: 0.6, toppings: ['clover', 'mozzarella', 'pistachio'], crust: '#d6a650', cost: 350, route: 'rare', finish: { glow: 0x7dff7a, sparkle: true },
  },
  {
    id: 'tikka', name: 'Tikka Time Machine', perk: 'timeStop', perkText: 'Each wave starts with feet frozen 3s',
    shape: 'round', base: 'tomato', cheese: 0.5, toppings: ['tandooriChicken', 'parsley', 'clockFace'], crust: '#c88a3c', cost: 600, route: 'rare', finish: { glow: 0x7ad8ff, sparkle: true },
  },
  {
    id: 'meteorite', name: 'Meteorite Margherita', perk: 'meteor', perkText: 'Every 15s a meteor hits a foot (×3)',
    shape: 'round', base: 'ink', cheese: 0.5, toppings: ['meteorRock', 'mozzarella', 'basil'], crust: '#8a6040', cost: 650, route: 'rare', finish: { glow: 0xff8a2a, sparkle: true },
  },
  {
    id: 'volcano', name: 'Volcano Calzone', perk: 'erupt', perkText: 'Its last slice lost: erupts, ×10 to all',
    shape: 'calzone', base: 'tomato', cheese: 0, toppings: ['lavaVents'], crust: '#7a4a30', cost: 600, route: 'rare', finish: { glow: 0xff5a1a, sparkle: true },
  },
  {
    id: 'pinata', name: 'Pizza Piñata', perk: 'pinata', perkText: 'Kills above it: 20% burst into tips',
    shape: 'round', base: 'white', cheese: 0.3, toppings: ['pinataCrust', 'candy', 'sprinkles'], crust: '#e8b070', cost: 450, route: 'rare', finish: { glow: 0xffd23f, sparkle: true },
  },
  {
    id: 'haunted', name: 'Haunted Hawaiian', perk: 'orbitRing', perkText: 'A ghost pineapple ring orbits it (×1)',
    shape: 'round', base: 'tomato', cheese: 0.7, toppings: ['ham', 'pineappleRing', 'hauntedGlow'], crust: '#a8b890', cost: 500, route: 'rare', finish: { glow: 0x8aff9a, sparkle: true },
  },
  {
    id: 'royalwedding', name: 'Royal Wedding', perk: 'goldenDiscount', perkText: 'Golden Menu items cost 25% less',
    shape: 'round', base: 'white', cheese: 0.4, toppings: ['rosePetal', 'pearl', 'goldLeaf'], crust: '#ecc888', cost: 550, route: 'rare', finish: { glow: 0xffe6f0, sparkle: true },
  },
  {
    id: 'pirate', name: "Pirate's Treasure", perk: 'treasure', perkText: "A treasure chest on each stage's wave 4",
    shape: 'round', base: 'tomato', cheese: 0.8, toppings: ['doubloon', 'skullMozz', 'kalamata'], crust: '#c88a3a', cost: 500, route: 'rare', finish: { glow: 0xffc83a, sparkle: true },
  },
  {
    id: 'nonnasecret', name: "Nonna's Secret", perk: 'nonna', perkText: 'Once per act, fully heals every pizza',
    shape: 'round', base: 'tomato', cheese: 0.6, toppings: ['ricotta', 'crushedTomato', 'basilHeart'], crust: '#d29848', cost: 650, route: 'rare', finish: { glow: 0xff9a9a, sparkle: true },
  },
];
