# Pizza rarity plan (draft for Tron, 2026-11-26)

Goal: four rarity tiers, with **60 Common, 50 Rare, 40 Epic and 30 Legendary** pizzas (180 in all, 67 of them new), and the four ways to unlock spread evenly across every tier.

Status: **approved by Tron (2026-11-27); step 1 (the foundation) built 2026-11-27, see section 6; step 2 (the table pizzas come alive) built 2026-11-27, see section 7.** Decisions: no limit on legendaries at the table; Pizzeria and milestone legendaries gated on beating that act's boss on Hot or hotter; counter odds Common 60 / Rare 28 / Epic 10 / Legendary 2. Perks, names and numbers are proposals; the balance sim sets the final numbers. The act each legendary belongs to gets checked against `src/data/stages.ts` when it's built.

---

## 1. The tiers

Each existing pizza is tiered by how strong its perk is, not by its price. The full list of the 113 is in the appendix.

| Tier | What it means | Frame and shine |
|---|---|---|
| **Common** | Small stat bumps; situational or score-only perks | Plain wood frame |
| **Rare** | Solid, general perks | Silver frame, a soft sheen |
| **Epic** | Run-shaping or rule-bending perks | Purple-gold frame, sparkles |
| **Legendary** | A centrepiece with its own mechanic, its own sound and an animated aura on the table | Gold frame, a living aura, a fanfare when it's dealt |

The frame shows everywhere a pizza card appears: the shop counter, the Pizzeria, the new-run screen, the locker and the Pizzapedia.

### The rarer, the more impressive

Each tier steps up how the pizza looks, moves and sounds, on the table and everywhere it's shown. Every tier keeps everything from the tiers below it. The table pizzas' faces, slice count, perk label and freshness must stay readable at every tier, so the effects sit round and under the pie, never over the face.

| | Common | Rare | Epic | Legendary |
|---|---|---|---|---|
| **On the table, at rest** | The living-pizza basics: cheese bubbling, steam, oil glisten, meat sizzle | Plus a richer bake: deeper browning, a glossier finish, a soft light sweep now and then | Plus its own idle effect tied to its perk (frost creeping, embers rising, ink swirling), and a faint coloured glow under the plate | Plus a full **animated aura** of its own (see the legendary list): layered, always moving, lighting the table round it; the pie itself is painted at a higher detail with its own signature toppings |
| **When it's stomped** | Crumbs and a squash | Plus a topping hop and a cheese stretch | Plus its perk's effect bursting out (a frost crack, a spark shower) | Plus a signature reaction: the aura flares, the screen pulses lightly, its own sound |
| **When its perk fires** | A small pop of its colour | A ring of light and a sound | A clear named effect with a quip | A full moment: its mechanic animated at screen level (the ladle swat, the comet, the black hole), its own sound and quip, a camera nudge on the big ones |
| **On its card** (counter, Pizzeria, new-run screen) | Plain wood frame | Silver frame, a sheen sweeping across | Purple-gold frame, sparkles drifting, the pie gently animated | Gold frame with a living border, the pie fully animated in its aura |
| **When it's dealt** | Normal | A soft chime | The card flips in with a sparkle burst and a rising note | The counter dims, the card flips in with a light shaft and a fanfare, and "LEGENDARY!" stamps in |
| **When it's bought or unlocked** | A pop | A sparkle burst | A burst and a short sting | A full-screen reveal: the pie rises in its aura with its name, its own music sting, confetti in its colours |
| **Its peel** | The living pizza peel | Plus a richer sheen | Plus its idle effect | Plus its aura on the peel and a show-piece smack in its style |

**How it's built:** the motion comes from one shared system, a step up from the pizza peels' motion code (bubbles, steam, glisten, hops), with tier settings controlling how much of it runs. Epics and legendaries add their own effect layers on top. The cost stays small, because the table only ever has 3–5 pizzas.

## 2. Evening out the unlock routes

Today each pizza has exactly one way to unlock, and the routes are lopsided: Rare Finds are mostly Epic, Commons are never found, and Milestones are mostly Rare. The plan gives every tier an even share of all four routes.

| Route | How it unlocks |
|---|---|
| **Chef's Special** | Turns up at the shop counter during a run; buy it with tips and it's yours for good |
| **Pizzeria** | Bought with Golden Crusts between runs |
| **Milestone** | Won by a goal |
| **Rare Find** | Turns up on the new-run screen; bought there with crusts |

Target split (180 pizzas):

| Tier | Special | Pizzeria | Milestone | Rare Find | Total |
|---|---|---|---|---|---|
| Common | 15 | 15 | 15 | 15 | 60 |
| Rare | 13 | 13 | 12 | 12 | 50 |
| Epic | 10 | 10 | 10 | 10 | 40 |
| Legendary | 7 | 8 | 8 | 7 | 30 |
| **Total** | **45** | **46** | **45** | **44** | **180** |

How we get there from today (re-tiered):

| Tier | Today: S / P / M / R | Change |
|---|---|---|
| Common | 20 / 23 / 7 / 0 | **5 Specials → Rare Find**, **8 Pizzeria → Milestone**, **+10 new**, all Rare Finds |
| Rare | 12 / 12 / 19 / 5 | **7 Milestones move**: 1 → Special, 1 → Pizzeria, 5 → Rare Find; **+2 new**, both Rare Finds |
| Epic | 1 / 1 / 4 / 9 | **+25 new**: 9 Special, 9 Pizzeria, 6 Milestone, 1 Rare Find |
| Legendary | — | **+30 new**: 7 Special, 8 Pizzeria, 8 Milestone, 7 Rare Find, three per act |

Existing pizzas that move route (players who own them keep them):

- **Common, Special → Rare Find (5):** Tuna & Sweetcorn, Pugliese, Garlic Bread Pizza, Quattro Pomodori, Mediterranean.
- **Common, Pizzeria → Milestone (8):** Stromboli, Pizza Bianca, Saffron & Lobster, Lobster Thermidor, Wagyu & Truffle, Bone Marrow & Black Garlic, Gold Leaf Margherita, Fig & Prosciutto Rose. Each gets a new goal that fits it (e.g. Lobster Thermidor: beat 25 mini-bosses).
- **Rare, Milestone → elsewhere (7):** Combo King → Special; Boss Slayer Supreme → Pizzeria; Pizza Fritta, Okonomiyaki, Birthday Cake Pizza, Quattro Stagioni, Thousand-Foot Feast → Rare Find. Their goals pass to the new Epic and Legendary milestone pizzas.

### Second chances (so no pizza is behind a single wall)

- **Rarity sets how often things are dealt.** At the shop counter, specials roll Common 60%, Rare 28%, Epic 10%, Legendary 2%. Legendary specials only turn up in their own act's stages. The same odds apply on the new-run screen for Rare Finds.
- **Pizzeria pizzas can also turn up as a Chef's Special,** rarely (Common/Rare only) and at a high tip price. Crusts stay the reliable way.
- **Legendaries keep their one route each,** so they always feel earned.

### Prices by tier

| Tier | Pizzeria and Rare Find (crusts) | Chef's Special (tips, before wave scaling) |
|---|---|---|
| Common | 150–300 | 40–80 |
| Rare | 350–600 | 90–160 |
| Epic | 700–1,100 | 200–350 |
| Legendary | 1,500–3,000 | 500–800 |

Existing pizzas are re-priced into their tier's band. A few weak but expensive Pizzeria pizzas (Wagyu & Truffle, Gold Leaf Margherita, Lobster Thermidor) drop in price, or get a small buff if they feel bad at their new tier.

### Rebake and reheat, on the pizza itself

- **Rebake is an overlay on the dead pizza** in the shop's table view: it shows charred and cracked, with a glowing oven door and its price over it; tap it to rebake that pizza (back at half its slices, fully fresh, with a puff of oven heat). You choose which dead pizza to save.
- **Its price comes from the pizza:** 1.5× what that pizza costs at the counter right now (its tier's price, at this wave) for the first rebake in a run, and 2× for every rebake after. A dead legendary is a real decision; a dead common is cheap to bring back. Still off on Inferno.
- **Reheat** is a small "REHEAT · price" chip on each stale pizza, in the same place.
- **Heal moves onto each pizza too (Tron, 2026-11-27):** a small "HEAL +2 · price" chip on each damaged pizza instead of the one table-wide button. It keeps today's pricing: a base that grows a little with the wave (+3 tips a wave), stepping up each time you use it in the run (×1.45 + 10).

### Legendary unlock gates

- **Pizzeria legendaries:** buyable once you've beaten that act's boss on **Hot or hotter**.
- **Milestone legendaries:** a feat in that act (named per pizza below).
- **Rare Find legendaries:** can appear on the new-run screen once that act is cleared on any heat.
- **Special legendaries:** turn up at the counter only in that act's stages, 2% of deals, at a high tip price.

---

## 3. The 67 new pizzas

### Common (10, all Rare Finds)

| # | Pizza | Inspired by | Perk |
|---|---|---|---|
| C1 | Seaside Fritto | the Pier | +12% tips on the wave after a slice is lost |
| C2 | Blue Plate Special | the Diner | +5% smack damage and +5% tips |
| C3 | Lodge Fondue Pie | the Lodge | Feet that stomp it stick for 0.3 s |
| C4 | Rooftop Rosemary | the Rooftop | +8% knockback on feet above it |
| C5 | Stargazer Calzone | Space | +3% crit chance and +10% crit damage |
| C6 | Rinkside Pretzel Pie | the Rink | Smacks 5% faster for 3 s after a kill |
| C7 | Raclette Run | the Slopes | The first stomp on it each wave takes only half a slice |
| C8 | Cellar Mushroom Medley | the Cellar | +10% damage to ghosts and the undead |
| C9 | Old Town Tarte | Old Town | +6 tips at the start of every wave |
| C10 | Kitchen Sink | the Kitchen | Each wave: +5% to one of damage, tips or crit chance, at random |

### Rare (2, both Rare Finds)

| # | Pizza | Inspired by | Perk |
|---|---|---|---|
| R1 | Granite Crust | the Gargoyle | Once a wave, a stomp on it turns to stone: blocked, and the foot is stunned 1 s |
| R2 | Disco Diner Pie | the Diner's jukebox | Every 30 s a dance beat slows every foot 30% for 2 s |

### Epic (25)

**Chef's Specials (9)**

| # | Pizza | Inspired by | Perk |
|---|---|---|---|
| E1 | Squid Ink Nero | the Kraken | Smacks spray ink: the foot loses its lane and wanders for 1.5 s |
| E2 | Snowball Pie | the Yeti | Every 8th smack throws a snowball that freezes a foot for 2 s |
| E3 | Cream Pie Supreme | King Honk | Smacked-down feet leave a pie splat; the next foot to dive there slips (1 s stun) |
| E4 | Sandcastle Sundae | Sandcastle Sam | Each wave starts with a sand wall that blocks the first 2 stomps anywhere |
| E5 | T-Rex Ribs | T-Rex Toes | Crits shake the table: +10% damage to every foot for 3 s |
| E6 | Steam Bun Pie | Iron Heel | Every 20 s steam vents blow every diving foot back up |
| E7 | Chimney Soot Pie | the Chimney Sweep | Feet above it are lost in soot for 2 s after they arrive |
| E8 | Comet Calzone | the Cosmic Croc | Every 12 s a comet hits the toughest foot for ×4 |
| E9 | Phantom Waltz | the Phantom King | 15% of kills rise as a friendly ghost that blocks one stomp |

**Pizzeria (9)**

| # | Pizza | Inspired by | Perk |
|---|---|---|---|
| E10 | Colossus Forge | the Colossus | +1% damage for every wave survived this run (up to +40%) |
| E11 | Gorgon's Gaze | Medusa | The first foot above it each wave turns to stone for 3 s and takes ×2 |
| E12 | Three-Headed Hound | Cerberus | Every 3rd smack hits three times |
| E13 | Labyrinth Lasagne | the Minotaur | Feet that stomp it get lost: their next dive comes 2 s later, in another lane |
| E14 | Ember Shade | Hades | Killed feet leave embers that burn the next foot through (6 dmg/s) |
| E15 | Siren's Song | the Sirens | Every 25 s every foot is enchanted and freezes for 1.5 s |
| E16 | Harpy Feather Pie | the Harpies | Every 5 s feet above it are blown 100 px back up |
| E17 | Golden Fleece | Act 9's myths | Bosses and mini-bosses drop 50% more tips |
| E18 | Charybdis Swirl | Charybdis | 10% of smacks drag the foot into a whirlpool (1.5 s stun) |

**Milestones (6)** (these take over the goals of the moved Rare milestones)

| # | Pizza | Inspired by | Perk |
|---|---|---|---|
| E19 | Fenrir's Howl | Fenrir | When a pizza is lost, every foot flees to the top |
| E20 | Rainbow Bridge | Bifröst | Each wave one lane is bridged: feet in it take +40% damage |
| E21 | Skald's Saga | the Skald | +3% damage for every boss beaten this run |
| E22 | Frostbite | Thrym | Chilled or frozen feet take +25% damage |
| E23 | Surtr's Ember Crust | Surtr | Burning feet spread their fire to a neighbour when they die |
| E24 | Serpent's Coil | Jörmungandr | Once a wave, the first foot to dive on it is coiled and held for 3 s |

**Rare Find (1)**

| # | Pizza | Inspired by | Perk |
|---|---|---|---|
| E25 | Echo Slice | the Echo Phantom | Copies the perk of the pizza beside it |

### Legendary (30, three per act)

Each legendary has its own mechanic, its own sound for every move, an animated aura on the table, a show-piece living peel and a hand-written peel ability. Any number can be on the table at once (Tron's call): price and rarity keep them scarce, and the balance sim checks stacked legendaries.

**Damage scales with heat.** Feet get tougher on hotter heats (health ×0.7 on Mild, ×1 Regular, ×1.3 Hot, ×1.7 Extra Hot, ×2.2 Inferno), so a legendary's damage (the Black Olive Hole's ×5, the comet's ×4, the cannon's ×8 and the rest) is set on Mild and scales up in step, so it hits just as hard at every heat:

| Heat | Mild | Regular | Hot | Extra Hot | Inferno |
|---|---|---|---|---|---|
| Legendary damage | 1× | ≈1.4× | ≈1.85× | ≈2.4× | ≈3.1× |

Thresholds set as a share of health (the Black Olive Hole swallowing feet under 30%) already scale, so they don't change. Epics' damage scales the same way. Automatic topping damage keeps its own heat cut (`autoDmg`), which is separate.

| # | Pizza | Act / inspired by | Route and gate | Perk | Aura |
|---|---|---|---|---|---|
| L1 | Nonna's Masterpiece | Act 1, Trattoria Nonna | Pizzeria | Once a wave Nonna's ladle swats the first foot to reach any pizza: the stomp is blocked and the foot takes ×5 | Warm oven glow, drifting flour |
| L2 | Silver Service | Act 1, the Head Waiter | Milestone: beat the Head Waiter on Hot without losing a slice | Every 15 s a silver tray skims the table, batting every diving foot back to the top | A silver tray circling the crust |
| L3 | The First Bake | Act 1 | Special | Every pizza starts each wave fully fresh, and once a run each gets one slice over its maximum | Rising steam and a golden crust shimmer |
| L4 | Big Top Pie | Act 2, King Honk | Rare Find | Every 20 s a circus cannon fires a pie at the toughest foot (×8) and every foot laughs (1 s stun) | A sweeping spotlight and confetti |
| L5 | Sandcastle Citadel | Act 2, Sandcastle Sam | Pizzeria | Each wave a sandcastle wall rises that soaks up 3 stomps on any pizza | Swirling sand and a fluttering pennant |
| L6 | Tidal Tiki | Act 2, the Beach | Milestone: clear the Beach on Hot with all pizzas alive | Every 4th wave a wave washes the table: every foot back to the top, every pizza +1 slice | Lapping surf and foam |
| L7 | Cosmic Crouton Supreme | Act 3, the Cosmic Croc | Special | Each smack has a 1% chance to open a portal that removes a non-boss foot; bosses take ×10 | A crouton cube orbiting the pie |
| L8 | Roar Roast | Act 3, T-Rex Toes | Pizzeria | Every 25 s a roar stuns every foot 2 s and gives +30% damage for 4 s | Heat shimmer and stamping footprints |
| L9 | Black Olive Hole | Act 3, Space | Rare Find | Every 20 s the olive at its centre opens an event horizon for 2 s. Every foot on the table is pulled towards it, hardest in its own lane and weaker with distance (neighbouring lanes feel a strong tug, the far side a slight drift). Non-boss feet in its own lane under 30% health are swallowed whole; every other foot caught in the pull takes ×5 near it (less further out) and is flung back to the top | A spinning accretion disc that bends the table and pizzas round it (gravitational lensing), with stars streaking in |
| L10 | Kraken's Catch | Act 4, the Kraken | Milestone: beat the Kraken on Hot | Every 10 s a tentacle drags one diving non-boss foot off the table | Rippling water round the crust |
| L11 | Phantom Banquet | Act 4, the Phantom King | Pizzeria | Beaten feet come back as ghost allies for 6 s that bite the nearest foot every second | Candles and drifting wisps |
| L12 | Cathedral Crust | Act 4, the Gargoyle | Special | Each wave the first stomp on every pizza turns to stone | Falling stone dust and a stained-glass glow |
| L13 | Queen's Glide | Act 5, the Rink Queen | Rare Find | Every smack glides on to the next foot in its lane (×0.5) | A mirror-ball sparkle sweep |
| L14 | Avalanche Pie | Act 5, the Yeti | Milestone: survive an avalanche wave on Hot | When any pizza drops to 3 slices, an avalanche buries every foot (frozen 4 s), once a wave | Swirling snow |
| L15 | Cellar Reserve | Act 5, the Cellar | Pizzeria | +5% damage for every wave it goes unstomped (up to +50%; resets when stomped) | Candlelight and a slow wine-dark shimmer |
| L16 | Doom Gauntlet | Act 7, Doomstomp | Special | Your Peel Slam also sends a shockwave through every foot for ×20 | Crackling green energy |
| L17 | Star-Spangled Crust | Act 7, Captain Pizzeria's world | Milestone: beat the Red Sole | Every 10 s your peel throws a shield that ricochets between 5 feet | A spinning shield rim |
| L18 | Midnight Slice | Act 7, Goth-Ham | Rare Find | On night stages every foot is marked and takes ×1.5 | Rain streaks and a searchlight beam |
| L19 | Bifröst Rainbow | Act 8, Bifröst | Pizzeria | Each wave a rainbow bridge links two pizzas: a stomp on one is split across both | An arcing rainbow shimmer |
| L20 | Hammer Feast | Act 8, Thor's world | Milestone: land 500 crits in Act 8 | Every 12th smack calls lightning that chains through 6 feet (×3) | Crackling blue sparks |
| L21 | Valhalla Feast | Act 8 | Special | Once a run, when a pizza is destroyed, every other pizza regrows to full | Golden mead light and drifting runes |
| L22 | Ambrosia | Act 9, Olympus | Pizzeria | On boss waves every pizza gets a divine shield that blocks 2 stomps | A soft white-gold halo |
| L23 | Gorgon's Last Look | Act 9, Medusa | Rare Find | Feet that stomp it turn to stone for 5 s and take ×3 | Hissing snake-shadow swirls |
| L24 | Ariadne's Thread | Act 9, the Labyrinth | Milestone: clear the Labyrinth on Hot | Feet that dive on it have a 50% chance to lose their way and wander off the table | A glowing golden thread circling it |
| L25 | Triple Crown | Act 9, Cerberus | Special | Every 9 s three heads bark: three random feet stunned 2 s and hit for ×4 | Three ember eyes glowing in smoke |
| L26 | Hourglass of Kronos | Act 9, Kronos | Pizzeria | Once a wave it rewinds the last stomp on any pizza: the slice comes back and the foot goes back up | Falling sand and a turning clock dial |
| L27 | Hammy Ha | Act 6 | Rare Find | Every 20 s it charges ("Oy… Kame… Hammy…" builds on screen as the crust crackles and the ham glows), then "HA!": a pink-gold beam fires up its lane, hitting every foot in it ×6 and knocking them back to the top | An energy ring round the pie that brightens with the charge, sparks drifting up; its peel's smack fires a mini "HA!" beam |
| L28 | The Proprietor's Deed | Act 10, the Sole Proprietor | Milestone: beat the Sole Proprietor on Hot | +50% tips, and every shop has one free item | Floating gold coins and a ledger glow |
| L29 | Oven Between Worlds | Act 10, the Oven | Special | Each wave it borrows the power of a random other legendary | A swirling portal |
| L30 | The Very First Slice | Act 10, the First Pizzeria | Rare Find | Every other pizza's perk is +25% stronger, and once a run the table survives a loss that would end it | A sunrise glow and rising embers |

The act mapping gets checked against `src/data/stages.ts` when each is built, and themes move to match. As drafted, Act 6 has one (Hammy Ha) and Act 9 has five; two more for Act 6 get swapped in from Act 9's list or designed fresh when the legendaries are built.

---

## 4. Build order

1. **Foundation (done, 2026-11-27; see section 6):** tiers and frames everywhere, re-pricing, the counter's and new-run screen's rarity odds, the second route for Pizzeria pizzas, and the route moves above (with new goals for the moved milestones).
2. **The table pizzas come alive (done, 2026-11-27; see section 7):** bubbling, steam, sizzle and stomp reactions on the table, reusing the pizza peels' motion code. Legendary auras build on this.
3. **New Commons and Rares (12):** quick.
4. **New Epics (25):** in batches of about 8.
5. **Legendaries (30):** in batches of 3–4, each with its mechanic, sounds, aura, peel, ability and review.
6. **Balance:** the sim on Mild, Regular and Hot after each batch, run when Tron isn't playing.

Every new pizza gets its peel automatically (`buildDefs()`), a hand-written ability in `ABILITIES`, a look, and a check in the Peel Locker, per CLAUDE.md.

## 5. Decisions (Tron, 2026-11-27)

1. **Legendaries at the table:** no limit.
2. **Legendary gates:** Hot or hotter for the Pizzeria and milestone ones.
3. **Counter odds:** Common 60 / Rare 28 / Epic 10 / Legendary 2.
4. **The 67:** as drafted, with the Black Olive Hole and Hammy Ha.

## 6. Step 1, as built (2026-11-27)

Everything here is in the code; numbers wait on the balance sim (step 6), which hasn't been run on them yet.

**Tiers.** Every pizza has a `rarity` (`PizzaType`), as in the appendix: Epic 15, Rare 48, Common 50. Each tier's colours, deal odds and price bands live in one place, `src/data/pizzaRarity.ts`; the frames read them (`src/ui/pizzaTier.ts`), and so do the portraits' plates (`src/art/pizzaArt.ts`).

**Routes now** (all 113): Common 15 Special / 15 Pizzeria (3 of them the starters) / 15 Milestone / 5 Rare Find; Rare 13 / 13 / 12 / 10; Epic 1 / 1 / 4 / 9. The moves are the ones in section 2.

**The moved milestones' goals** (a decision of the build): the seven milestones whose pizzas moved off milestones (Combo King, Boss Slayer Supreme, Pizza Fritta, Okonomiyaki, Birthday Cake Pizza, Quattro Stagioni, Thousand-Foot Feast) keep pointing at their old pizza for now, so each of those pizzas has a second way in (its new route, or its old goal), and no goal shows a broken reward. The Pizzeria, the Pizzapedia and the shop say so ("Or win it: …"). When the new Epic and Legendary milestone pizzas come (steps 4 and 5), they take these goals over. A goal reached for a pizza that's already yours is ticked off quietly, with no toast.

**New goals for the eight new milestone prizes** (all counted from what the save already records, on any heat):

| Pizza | Goal |
|---|---|
| Stromboli | Reach wave 60 |
| Pizza Bianca | Defeat 150 feet that leave pizzas soggy or scorched |
| Saffron & Lobster | Clear 25 waves at The Pier |
| Lobster Thermidor | Beat 25 mini-bosses |
| Wagyu & Truffle | Unlock 40 pizzas |
| Bone Marrow & Black Garlic | Defeat 3,000 feet |
| Gold Leaf Margherita | Catch 25 golden feet |
| Fig & Prosciutto Rose | Deal with 40 wave events |

Players who own a pizza keep it whatever its route (the save only lists what's unlocked). A pizza moved off milestones that was unlocked stays unlocked.

**Prices.** Every pizza is re-priced into its tier's band, keeping its order inside its tier and route: crusts for the Pizzeria, Rare Finds (and, only for sorting, milestone prizes), tips for Chef's Specials. For example: Pizzeria Commons 150–300 crusts (Pizza al Taglio 150 … Porcini Tartufata 300), Pizzeria Rares 350–600 (Pesto Genovese 350 … Caviar Bianca 600, Boss Slayer Supreme 580), Napoli DOC 900; Rare Finds: Common 150–300, Rare 350–600, Epic 700–1,100 (Mystery Meat 700 … Nonna's Secret 1,100); Chef's Specials: Common 40–80 tips, Rare 90–160 (Combo King 160), Spinach & Feta 275.

**The counter.**
- A pizza you own costs the counter's base (150 + 75 a pizza bought + 12 a wave) times its tier: Common ×0.9, Rare ×1.05, Epic ×1.3, Legendary ×1.6 (about ×1 across today's 113).
- A Chef's Special costs twice its counter price plus its own tips × (0.4 + 0.035 a wave). Epic specials come out dearer than before (Spinach & Feta about 1,100 tips at wave 5, was 770): one for the sim.
- Dealing goes by rarity everywhere: the tier is rolled first (60 / 28 / 10 / 2 among the tiers there are to deal), then a pizza of it. This holds for the Chef's Special slot, the two owned pizzas, Pizza Slots' jackpot special and the new-run screen's Rare Finds.
- Epic specials are dealt from the wave 5 boss shop, as epic toppings are. A legendary special only turns up from wave 10, in its own act's stages: `act` on the pizza, unused until legendaries exist.
- **Second route:** when the slot's roll lands on Common or Rare, 12% of the time a locked Pizzeria pizza of that tier comes instead, as a "PIZZERIA SPECIAL", at 1.35 times a real special's price. Buying it unlocks it for good.

**Rebake on the pizza.** A dead pizza in the shop's table shows whole and charred, cracked, with a glowing oven door (REBAKE and its price) over it. Tap it to rebake that pizza: back with half its slices, fully fresh. The price is 1.5 times that pizza's counter price for the run's first rebake, then 2 times for every one after. It's still off on Inferno (its tile says so). Rebakes now follow the counter price, which grows with pizzas bought, so they cost more than the old flat price (a Common at wave 5 is about 490 tips, was about 160): kept as designed, one for the sim. The separate REBAKE button has gone; the Golden Menu's Golden Rebake (crusts, full slices, once a run) stays. Heal and Reheat stay on every tile, as before.

**Frames.**
- Every pizza card has a ring inside its border in its tier's material, plus a small label. Common is plain wood grain; Rare is silver with a sheen running round it; Epic is purple and gold, drifting, with sparkles; Legendary is gold with a turning, living border (ready for the legendaries).
- The cards are the shop's counter and table, the Pizzeria, the new-run lineup and its Rare Find, and the Pizzapedia (with the label in its detail too).
- Every pizza portrait sits on its tier's plate: a wooden board, a silver platter, a purple plate with a gold rim, or a gold platter.
- The Peel Locker's pizza peels carry a small tier gem: a wooden stud, or a silver, purple or gold diamond.
- The motion stops for reduced motion.

**Rare Find cards** (the new-run lineup, the Pizzeria) are now a neutral gold highlight, not purple, so they don't read as Epic; a Rare Find's tier shows by its frame like any pizza. A Rare Find that was seen on the counter as a Chef's Special before its move counts as seen.

**Not done here:** the five Commons that became Rare Finds don't get a Rare Find's glow `finish` (that's left to step 2's tier visuals on the table). There are two new intro cards, "Pizza rarity" (the first time the counter deals a Rare or better) and "Rebake" (the first shop with a dead pizza).

## 7. Step 2, as built (2026-11-27)

The pizzas on the table in play (and on the main menu) now live, by tier, from one shared system: `src/game/pizzaAlive.ts`, driven by `Pizza` (`src/game/Pizza.ts`). It reads the pizza peels' painted layers and traits (`src/art/peelPizza.ts`: where the cheese bubbles, the oily pieces, the gold, the light map, the pieces that hop, the frost), so a pizza bubbles and glistens where its peel does. Everything is cosmetic: no gameplay reads it, its randomness is `crand()`, and the balance sim (which hides the scene) skips it.

**What each tier gets** (`TIER_SET`; each keeps everything below it):

| | At rest | Stomped | Its perk fires |
|---|---|---|---|
| **Common** | Cheese (or sauce) blisters swelling and popping, a calzone's vents bubbling; steam curling off its back half; its light map breathing (the oil and cheese shine); the fat on cured meats sizzling and spitting | Crumbs off the crust and a puff of steam (the squash is the pizza's own) | A small pop of its colour: a ring on the table and a few motes |
| **Rare** | Plus a richer bake (the crust browned deeper at its edge, leopard-spotted, a broad sheen: `bakedTop`, drawn once per pizza) and a glossier light map; a soft light sweeping across it every 6–11 s | Plus its toppings hopping (the peel's lifted pieces, the pie drawn without them while they're up), the cheese stretching after them and snapping | Plus a ring of light round it, a soft flash under the plate, and a chime |
| **Epic** | Plus its perk's own idle effect and a faint glow in its colour under the plate | Plus its element bursting out (a frost crack across the plate and ice shards, embers and flame licks, stardust, wisps, ink, leaves, coins…) with its sound | Plus its named effect (the burst, bigger) and a quip in its colour, at most every 4 s |
| **Legendary** | Plus an animated aura: `AURAS[id]` (step 5), else the test aura (a gold glow kept to the plate's footprint, a ring of light turning on the table, short shafts of light rising behind the pie and ending below its freshness bar, motes circling and rising), kept calm so it doesn't flood the neighbours or the labels | Plus the aura flaring and `SIGNATURES[id].stomp` | Plus the aura flaring and `SIGNATURES[id].fire` |

**Elements.** An Epic's idle effect and burst come from its perk's element: a small table for the perks that have their own (`PERK_ELEMENT`: Ragnarök Roast frost-and-fire, Dragon Fruit and Volcano fire, Meteorite cosmic, Moon Cheese moonlight, Tikka time, Fantasma ghost, Arcobaleno rainbow, Mystery Meat ink, The Golden Pie gold, Spinach & Feta life, Nonna's Secret hearts, Untouchable holy…), else one by the perk's name, else by the pizza (a hot pie fire, a cold one frost), else "power". Its colour is its Rare Find glow if it has one, else its element's. The elements: fire (embers rising, the crust glowing hot), frost (rime on the crust, breathing in and back, kept to the rim so the pie keeps its colour; a cold mist rolling off its front; flakes), frost-and-fire (both), cosmic and moon (stars circling), ghost (wisps circling), ink (ink swirls circling), life (leaves rising), heal (hearts rising), gold (glints circling), holy (motes rising), time (motes circling slowly, a tick of light round the crust each second), rainbow (motes cycling through the colours), power (sparks circling).

**Where its perk fires** (`Pizza.perkFired()`; `{ quip: false }` where the moment has its own quip already): Quattro Formaggi's and Bufala's shield taking a stomp, the thick crust and Stromboli holding, Diavola setting its stomper alight, Garden Veggie regrowing, Spinach & Feta and the Calzone healing at the wave's end, Dragon Fruit's fire lane, Ragnarök's freeze, Meteorite's meteor, Tikka's time stop, Moon Cheese's double damage, Arcobaleno's new colour, Mystery Meat's reveal, Nonna's Secret, Untouchable, the Volcano's eruption, and the moments in `src/game/pizzaPerks.ts` that already quip (free reroll, feast, passing through, shell shut, garlic butter, the gods, tuna time, golden crust, burrata balm). Perks that are only a stat (+10% damage and the like) have no moment and don't fire.

**Readable at every tier.** The system draws in three layers inside the pizza's container: under the plate (the glow, the aura), between the plate and the pie (rings on the table, things circling it, which pass behind the pie), and between the pie and its face (bubbles, glints, steam, hops, bursts). The face, slice lines, labels, freshness bar and shield dome draw over all of it, and nothing shows over the face (`onFace`): bubbles and glints aren't spawned there, anything flying over the pie fades out over it, and pieces by the face don't hop. Every shape is handled: a square pie bakes and frosts along its sides on its square platter, and its glow, rings and aura are rounded squares, a calzone bubbles and steams from its vents, a deep dish sits higher. Effects only appear on the slices still there.

**Settings.** Reduced motion: about half the bubbling and steam, no hops, no light sweep, the glows still, slower circling. Peel animation off (the Low and Medium presets): the basics only (bubbles and steam, thinner; the bake and glow stay still; crumbs when stomped; the pop and ring when a perk fires). A stale pizza has gone cold (no steam or bubbling); a frozen perk stills its own effect.

**The counter** (`src/ui/pizzaDeal.ts`, `.pzd-*` in `src/style.css`). Dealt (each offer new to the shop, one after another): a Rare's silver catches a bright sweep of cool light, with a soft chime; an Epic flips in face up, its frame flaring, a burst of sparkles in purple and gold and a rising run of notes; a Legendary calls `LEGENDARY_COUNTER.dealt` (step 5), else shows the Epic's in gold. Bought (the burst centred on its picture, so it stays off the cards round it): a Rare bursts into sparkles with a glint; an Epic bursts bigger with a short sting (standing in for the usual fanfare); a Legendary calls `LEGENDARY_COUNTER.bought`, else the Epic's in gold. Reduced motion keeps the light and sounds, without the flip or the bursts. Three new sounds, synthesized and CC0 (`scripts/pizza-sfx/tiers.py`): `sfx_tierchime`, `sfx_tierrise`, `sfx_tiersting`, levelled with the shop's other sounds (about −12 to −14 dB 50 ms RMS peak, like `sfx_upgrade`); the rest reuse the game's (`sfx_smack_tail_glint`, `sfx_fire`, `sfx_freeze`, `sfx_heal`, the magic smack takes…).

**Cost.** With 5 Epic pizzas (forced) in a busy Hot wave at wave 24 (6 feet on the table): 60 fps throughout (mean frame 16.65 ms, p95 16.8, worst 16.8, none over 33 ms, the same with the system off); the system itself takes 0.13–0.17 ms a frame on average (p99 0.5 ms, worst 0.9 ms); with 5 Legendaries (the test aura) 0.19 ms (worst 0.7 ms), still 60 fps. Textures are drawn once and shared (the bubbles per colour, the hop pieces per pizza); each pizza keeps a pool of images (at most 90 at once) and three small canvases (its light map, its sweep, its frost) redrawn only when its slices change (the sweep while it runs).

**Testing.** `?dev`, then `F.pizzaFx.tier('epic')` shows every table pizza at a tier (null: their own), `F.pizzaFx.stomp(i)` and `F.pizzaFx.fire(i)` play pizza i's reactions (all with no i), `F.pizzaFx.calm()` clears the feet and holds the wave for still shots, `F.pizzaFx.off()` turns the system off to time a frame without it.

**After a buy** the counter's remaining offers grow taller: that's the counter's own roomy layout for fewer than three offers (step 1), not this step.

**Left for later.** The cards' "pie gently animated" (Epic) and living border (Legendary) rows of section 1, and Pizzeria and milestone unlocks' moments, are not part of this step: the counter's are. The legendaries' own auras, signatures and counter moments plug into `AURAS`, `SIGNATURES` and `LEGENDARY_COUNTER` in step 5.

---

## Appendix: today's 113 pizzas, re-tiered

Tiered by perk strength from the perk text and numbers (not yet the sim). Format: name (route, current price): perk.

**Epic (15):** The Golden Pie, Peel Collector, Untouchable, Ragnarök Roast, Napoli DOC, Mystery Meat, Arcobaleno, Pizza Fantasma, Moon Cheese, Dragon Fruit Flambé, Tikka Time Machine, Volcano Calzone, Meteorite Margherita, Nonna's Secret, Spinach & Feta.

**Rare (48):** Choco-Berry, Detroit Red Top, Chicago Deep Dish, S'mores, Unicorn Dream, Pizza Fritta, Okonomiyaki, Mac & Cheese, Birthday Cake Pizza, Carbonara, Cajun Shrimp, Pumpkin Spice, Quattro Stagioni, Speed Slice, Combo King, Inferno Calzone, Boss Slayer Supreme, Thousand-Foot Feast, Olympian Feast, Pesto Genovese, Sicilian Square, Grandma Square, Calabrese, Lahmacun, Fig & Gorgonzola, Duck à l'Orange, Philly Cheesesteak, Burrata & Heirloom, Napoletana, Oyster Rockefeller, Caviar Bianca, Four-Leaf Clover, Pizza Piñata, Haunted Hawaiian, Pirate's Treasure, Royal Wedding, Garden Veggie, Capricciosa, Calzone, Veggie Supreme, Hot Honey Chicken, Buffalo Hot, Meat Feast, Frutti di Mare, Taco Fiesta, New York Slice, Kebab Pizza, Greek.

**Common (50):** everything else: the three starters, the small stat bumps and the situational and score-only perks (Black Truffle, Mallow Mountain, Victory Lap, Golden Anniversary, Night Shift, Perfect Pie, Century Crust, and so on). In full: Margherita, Pepperoni, Funghi, Hawaiian, Quattro Formaggi, Diavola, BBQ Chicken, Black Truffle, Marinara, Prosciutto e Rucola, Breakfast Club, Patate e Rosmarino, Nduja, Hot Honey Pepperoni, Puttanesca, Stromboli, Pizza Bianca, Tarte Flambée, Pizza al Taglio, Pickle Pie, Tandoori, Salsiccia e Friarielli, Mallow Mountain, Pugliese, Ham & Mushroom, Chicken Pesto, Tuna & Sweetcorn, Pizza Romana, Garlic Bread Pizza, Bolognese, Jerk Chicken, Bufala, Chorizo & Pepper, Mediterranean, Sloppy Joe, Quattro Pomodori, Saffron & Lobster, Wagyu & Truffle, Smoked Salmon & Dill, Porcini Tartufata, Champagne Brunch, Lobster Thermidor, Fig & Prosciutto Rose, Bone Marrow & Black Garlic, Gold Leaf Margherita, Victory Lap, Century Crust, Perfect Pie, Golden Anniversary, Night Shift. Each pizza's `rarity` in the data is the source now.
