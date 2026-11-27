# Pizza rarity plan (draft for Tron, 2026-11-26)

Goal: four rarity tiers, with **60 Common, 50 Rare, 40 Epic and 30 Legendary** pizzas (180 in all, 67 of them new), and the four ways to unlock spread evenly across every tier.

Status: **approved by Tron (2026-11-27); step 1 (the foundation) built 2026-11-27, see section 6; step 2 (the table pizzas come alive) built 2026-11-27, see section 7; step 3 (the 10 new Commons and 2 new Rares) built 2026-11-27, see section 8; step 4's first batch (the 9 Epic Chef's Specials) built 2026-11-27, see section 9; step 4's second batch (the 9 Epic Pizzeria pizzas) built 2026-11-27, see section 10; step 4's third batch (the 6 Epic milestones and Echo Slice) built 2026-11-27, see section 11, so step 4 is done; step 5's first batch (Act 1's three Legendaries and the Legendary groundwork) built 2026-11-27, see section 12.** Decisions: no limit on legendaries at the table; Pizzeria and milestone legendaries gated on beating that act's boss on Hot or hotter; counter odds Common 60 / Rare 28 / Epic 10 / Legendary 2. Perks, names and numbers are proposals; the balance sim sets the final numbers. The act each legendary belongs to gets checked against `src/data/stages.ts` when it's built.

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
- **Special legendaries:** turn up at the counter only in that act's stages, from its second stage on (step 5: Act 1's from the wave 5 shop), 2% of deals, at a high tip price.

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
3. **New Commons and Rares (12) (done, 2026-11-27; see section 8):** quick.
4. **New Epics (25):** in batches of about 8. Batch 1, the 9 Chef's Specials (E1–E9), done 2026-11-27 (see section 9); batch 2, the 9 Pizzeria Epics (E10–E18), done 2026-11-27 (see section 10); batch 3, the 6 milestones (E19–E24) and the Rare Find (E25), done 2026-11-27 (see section 11). **Step 4 is done.**
5. **Legendaries (30):** in batches of 3–4, each with its mechanic, sounds, aura, peel, ability and review. Batch 1, Act 1's three (L1–L3) and the groundwork every Legendary shares (gates, heat-scaled damage, auras, signatures, the counter's and the reveal's moments, living card borders, show-piece peels), done 2026-11-27 (see section 12).
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

**The moved milestones' goals** (a decision of the build): the seven milestones whose pizzas moved off milestones (Combo King, Boss Slayer Supreme, Pizza Fritta, Okonomiyaki, Birthday Cake Pizza, Quattro Stagioni, Thousand-Foot Feast) keep pointing at their old pizza for now, so each of those pizzas has a second way in (its new route, or its old goal), and no goal shows a broken reward. The Pizzeria, the Pizzapedia and the shop say so ("Or win it: …"). When the new Epic and Legendary milestone pizzas come (steps 4 and 5), they take these goals over. A goal reached for a pizza that's already yours is ticked off quietly, with no toast. *(Done in step 4's batch 3: six of the goals went to the Epic milestones and the "Or win it" lines are gone; the seventh waits for a Legendary. See section 11.)*

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

## 8. Step 3, as built (2026-11-27)

The 12 new pizzas of section 3 (C1–C10, R1–R2), all Rare Finds, in `src/content/pizzas/p4.ts`. The table now has 125 pizzas: Common 60 (Rare Find 15), Rare 50 (Rare Find 12), Epic 15. Their perks run in `src/game/pizzaPerks.ts` (the two plain stat bumps in `src/game/Run.ts`), their new toppings are drawn in `src/content/art/toppings-p4.ts`, and every one has its peel (from `buildDefs()`, unlocked by 20 waves on the table like every pizza peel) with a hand-written ability in `ABILITIES`.

| # | Pizza (id) | Crusts | Toppings (new ones in bold) | Perk, as built | Enhanced | Its moment |
|---|---|---|---|---|---|---|
| C1 | Seaside Fritto (`seasidefritto`) | 190 | **fried calamari** (rings and the odd crispy tentacle), lemon, parsley | +12% tips the wave after a slice is lost (anywhere on the table; saved with the run) | +18% | "SEASIDE FRITTO: +12% TIPS" as such a wave starts |
| C2 | Blue Plate Special (`blueplate`) | 260 | beef, cheddar, **crinkle-cut fries**, pickle on BBQ | +5% smack damage and +5% tips | +8% each | (a stat: none) |
| C3 | Lodge Fondue Pie (`lodgefondue`) | 210 | potato, **a swirled pool of fondue** with cheese strings, **dipped bread cubes**, cornichons | Feet that stomp it stick for 0.3 s (not bosses or mini-bosses) | 0.5 s | "STUCK IN THE FONDUE!", the foot goes cheese-yellow, a sticky squelch |
| C4 | Rooftop Rosemary (`rooftoprosemary`) | 170 | rosemary, ricotta, **honeycomb** from the rooftop hives, honey | +8% knockback on feet above it | +12% | (a stat: none) |
| C5 | Stargazer Calzone (`stargazer`) | 290 | a calzone glazed dusk-blue, **star-cut vents** glowing with cheese, a constellation scored in the dough | +3% crit chance, +10% crit damage | +5%, +15% | (a stat: none) |
| C6 | Rinkside Pretzel Pie (`rinkpretzel`) | 220 | sausage, **pretzel bites**, **a mustard zigzag** | Smacks 5% faster for 3 s after a kill (5% more follow-up smacks, as Speed Slice's "faster" is) | 8% | its pop when a rush starts |
| C7 | Raclette Run (`raclette`) | 240 | potato, **draped raclette sheets**, cornichons, onion | Each wave's first stomp on it takes half a slice; the half left over waits on the pizza, so two such stomps make one slice | first 2 stomps | "HALF A SLICE: SAVED!" / "ONLY HALF A SLICE!" |
| C8 | Cellar Mushroom Medley (`cellarmushroom`) | 200 | mushroom, porcini, **chanterelles**, sage | +10% damage to the undead (the `undead` marking: ghosts, zombies, mummies, the Immortals, the echo ghost…) and to any foot zombified in play | +15% | (a stat: none) |
| C9 | Old Town Tarte (`oldtowntarte`) | 160 | square: **jammy caramelised onion**, bacon, sage | +6 tips at the start of every wave | +9 | "OLD TOWN: +6 TIPS" |
| C10 | Kitchen Sink (`kitchensink`) | 270 | pepperoni, ham, mushroom, pepper, pineapple, olive, sweetcorn: everything | Each wave: +5% to one of smack damage, tips or crit chance, at random (tips within the ×2.5 cap); the pick is made when it's placed and as each wave clears, so the shop and its card line show the one the next wave gets | +8% | "KITCHEN SINK: +5% TIPS" (and so on) each wave |
| R1 | Granite Crust (`granite`) | 520 | a stone-grey crust **speckled like granite** (sesame, charcoal salt, pepper), mozzarella, olives, black garlic, basil | Once a wave a stomp on it turns to stone: blocked (checked where Pizza Stone is, so a piercing stomp goes through); the foot is knocked up and stunned 1 s, greyed (a boss is only blocked) | 1.5 s | the pie goes grey with a crack across it for the stun, a pale flash, stone chips and dust, "TURNED TO STONE!", the Gargoyle's stone grind |
| R2 | Disco Diner Pie (`discodiner`) | 450 | **vinyl-record pepperoni** with jukebox-coloured labels, peppers, basil | Every 30 s of wave (with feet on the table; the count carries between waves) a dance beat slows every foot 30% for 2 s | every 20 s | "DANCE BREAK!": a mirror ball drops in over the pie, four coloured beams swing across the table, notes bounce over every foot, the jukebox sting |

**Living pizzas (step 2).** Each runs its tier's settings from `TIER_SET`. The Rares have a Rare Find finish (Granite a pale stone glow, Disco a pink one) and elements in `PERK_ELEMENT` (Granite holy, its quip "TURNED TO STONE!"; Disco rainbow, "DANCE BREAK!"); the Commons' elements only colour their pop. Every moment above calls `perkFired()`.

**STATS tab.** The stat bumps (C2, C5, C10) show as chips on Smack damage, Crit chance, Crit damage and Tips, like the other stat perks (Kitchen Sink's pick is left out when the STATS tab works out what each pizza adds). The rest have tiles: "vs ghosts and undead" and "After a kill" (Damage); "Stuck in fondue", "Knockback above", "Turned to stone" and "Dance beat" (Crowd control); "After a lost slice" and "Wave start" (Economy); "Half-slice stomps" (Sustain).

**Peel abilities** (in the pizza peels' style; the four meter ones have their own visuals in `src/game/abilityFxSpecs.ts`): Seaside Fritto **High Tide** (meter: every foot knocked back, ×5; the fritto at the edge and the sea flooding in), Blue Plate **Daily Special** (always: +1 damage, +8% tips), Lodge Fondue **Fondue Dip** (on a stomp: slows round it 50%, stuns the stomper), Rooftop **Rooftop Breeze** (every 6 s: the 3 front feet knocked back and hit ×1.5), Stargazer **Shooting Stars** (meter: three blasts ×3 and every foot marked ×1.3; stars streaking down), Rinkside **Slapshot** (20% of smacks: ×1.5 round it and a knock), Raclette **Scrape and Melt** (every 7 s: the 3 front feet slowed and melted), Cellar **Cellar Spores** (every 6 s: 3 feet marked ×1.4 and hit), Old Town **Market Day** (each wave: +8 tips, +1 freshness), Kitchen Sink **Everything but the Sink** (every 5 s: clutter ricocheting through 3 feet), Granite **Stone Skin** (meter: every foot frozen 2 s, a shield on every pizza; the pie slams down like a slab), Disco **Saturday Night** (meter: every foot slowed 40%, ×5 and stunned; the mirror ball drops in at the top).

**Sounds.** All reused, already credited: the Gargoyle's stone grind (`sfx_gargoyle_stone`), the jukebox tail (`sfx_smack_tail_jukebox`) and Venom-Nom's goo (`sfx_venomnom_goo`), loaded with the run (`PERK_SFX`).

**A possessed pizza** (the Ghost) grants none of these: the perk kit leaves it out, as it does Tuna & Sweetcorn.

**Not done here.** Calzone peels (this one too) show the half-moon pie on the handle with no board, as the Calzone's always has. The Phantom King and the other ghost bosses aren't marked `undead` (CLAUDE.md keeps bosses out of the marking), so Cellar Mushroom Medley doesn't count them. The balance sim's runs don't put Rare Finds on the table, so its light check only shows nothing broke; the numbers wait on step 6.

## 9. Step 4, batch 1, as built (2026-11-27)

The 9 Epic Chef's Specials of section 3 (E1–E9), in `src/content/pizzas/p5.ts`. The table now has 134 pizzas: Common 60, Rare 50, Epic 24 (Chef's Special 10). Each is inspired by a boss and built from its props and sounds: their perks run in `src/game/pizzaPerks.ts`, their new toppings are drawn in `src/content/art/toppings-p5.ts`, and every one has its peel (from `buildDefs()`, unlocked by 20 waves on the table like every pizza peel, its Epic gem in the locker) with a hand-written ability in `ABILITIES`.

**Dealt.** Route `special`, tier `epic`: the counter's Chef's Special slot deals them at the Epic odds from the wave 5 boss shop on (sampled: no Epic before it; 9.9% of specials after it, the 9 new ones 9.1%, spread evenly); bought with tips, each is yours for good. Their tips sit in the Epic band (210–320 before wave scaling; about 700 at wave 5).

| # | Pizza (id) | Tips | Toppings (new ones in bold) | Perk, as built | Enhanced | What you see and hear |
|---|---|---|---|---|---|---|
| E1 | Squid Ink Nero (`squidinknero`) | 260 | squid-ink base, **glossy ink pools with the Kraken's swirls**, squid, **curled baby-octopus tentacles**, lemon, parsley | Every landed smack sprays ink: an ordinary foot loses its lane (it's given a free one over another pizza if there is one) and wanders off towards it, weaving, unable to dive, for 1.5 s (a smack on an inked foot tops its ink up). Bosses, mini-bosses and feet a fight moves by hand are only splattered | 2.5 s | ink drops flung off the foot, the Kraken's ink blobs riding on it, the foot inky violet, "INKED! LOST ITS LANE", the Kraken's squirt and inked sounds |
| E2 | Snowball Pie (`snowballpie`) | 230 | white base, **bocconcini rolled into snowballs**, rosemary, white onion, **the Yeti's frost creeping in off the crust** | Each pie counts the landed smacks; every 8th (the count waits if there's no foot to hit), it lobs the Yeti's snowball at the ordinary foot nearest the table (not one already frozen) and freezes it 2 s; with only bosses left it chills one 30% for 2 s | every 5th | the snowball arcs from the pie, frost and packed snow burst off the foot, "SNOWBALL! FROZEN", the Yeti's throw and a snow thud |
| E3 | Cream Pie Supreme (`creampie`) | 220 | pink base, **whipped-cream splats**, strawberry, **King Honk's little cream pies with a cherry**, sprinkles | A foot smacked down drops one of King Honk's pies on the pizza it was over: the splat lies on the back half of the pie (one a pizza; it goes with the wave; none on a possessed pizza). The next ordinary foot to come down on it slips: its stomp misses, it bounces up and is stunned 1 s. Bosses don't slip and a piercing stomp goes through (the splat waits) | 1.5 s | the pie falls and splats (King Honk's splat), cream flecks; on the slip the splat smears away, cream flies, "SLIPPED ON THE PIE!", a honk and a boing |
| E4 | Sandcastle Sundae (`sandcastlesundae`) | 250 | **a biscuit-crumb beach with a blue-raspberry sea and foam**, **Sandcastle Sam's sandcastles**, **white-chocolate shells**, strawberry | As each wave starts Sandcastle Sam's wall goes up: it blocks the first 2 stomps on any pizza (2 a pie; checked where Pizza Stone is, so a piercing stomp goes through; bosses are blocked too; once up, it lasts the wave even if its pie is lost) | 3 stomps | a little sandcastle for each stomp rises on the table beside the pie, "SAND WALL: 2 STOMPS"; a block raises Sam's rampart (drawn new, `pk_sandwall`: towers, pennants, a gate) from the back of the pie under the foot, sand sprays, a castle crumbles, "SAND WALL!", Sam's wall sound |
| E5 | T-Rex Ribs (`trexribs`) | 240 | BBQ base, **T-Rex Toes' three-toed prints pressed into the sauce**, **sticky BBQ ribs with their bones**, onion, spring onion | A crit shakes the table: every foot takes +10% damage for 3 s (each crit restarts the 3 s) | +15% | a light camera shake, dust jumping off the table round every pie, a ring on the foot, "TABLE SHAKE! +10% DAMAGE" when it starts, T-Rex Toes' growl |
| E6 | Steam Bun Pie (`steambun`) | 270 | hoisin (BBQ) base, **steamed buns with twisted pleats**, **carrot cogs from Iron Heel's works**, spring onion, chilli | Every 20 s of wave (two pies: 10; the count carries between waves), once a foot is diving, Iron Heel's vents blow every diving foot back up the lane (a 1,100 knock: bosses and heavy feet move less, as with any knock) | every 13 s | a jet of steam rushing up each diving foot's lane from the table, puffs, rings; "STEAM VENTS!", Iron Heel's vent and steam |
| E7 | Chimney Soot Pie (`chimneysoot`) | 210 | tomato, **chorizo cut into chimney bricks with a mortar of cheese**, black pepper, **the Chimney Sweep's soot: smudges, charcoal flakes, a blackened rim** | A foot arriving over it (once each time it comes to the pie) is lost in soot for 2 s: it can't dive and gropes about its lane. Bosses, mini-bosses, friendly zombies and feet a fight moves by hand see through it | 3 s | a gust of soot up from the pie (the Sweep's soot column), soot clouds wrapping the foot, the foot sooty grey, "LOST IN SOOT!", the Sweep's soot sound |
| E8 | Comet Calzone (`cometcalzone`) | 320 | a calzone glazed deep-space violet with **nebulae and a field of stars**, **an icy comet of mozzarella streaming its tail across the belly** and a little one by the fold, its vents glowing craters | Every 12 s of wave a comet hits the toughest foot on the table (the most health; bosses too) for ×4, as the card says (not scaled by heat, like the Meteorite's ×3; decided in review: section 3's heat scaling waits for the legendaries) | every 8 s | an icy blue comet (drawn new, `pk_comet`) streaks in from the far side with a trail, an explosion and a blue ring, "COMET! ×4", the Cosmic Croc's meteor and impact |
| E9 | Phantom Waltz (`phantomwaltz`) | 300 | white base, the Fantasma's ghost mozzarella, **ghostly radicchio roses**, black garlic | 15% of kills rise as a friendly ghost (a little ghost of the Phantom King's court, drawn new: `pk_waltzghost`). It waltzes a turn, then glides to a pizza with no ghost (the one the foot fell over, else the most hurt) and guards it: the next stomp on that pizza is blocked, the foot bounced up and stunned 0.5 s. One ghost a pizza (none for a possessed pizza); they wait out the shop and come back for the next wave; a ghost whose pizza dies or leaves the table goes | 22% | the ghost rises out of the fallen foot, twirls and floats by its pie, bobbing; "A FRIENDLY GHOST!", the Phantom King's stir; a block: it swoops into the foot, "BOO! BLOCKED!", a ghostly thud and fade |

**Holding a dive.** Ink and soot hold the foot's hover with `holdHoverT` (as a boss holds its own), never its `hoverTime`, so a mole doesn't bury itself again; a diving foot pulled back joins its hover at the end of its wait. Their tint goes back on after every smack's flash. The drift of an inked or sooted foot is gameplay, so it's `Math.random`.

**Two copies.** Two Squid Ink Neros don't ink longer (an enhanced one sets 2.5 s), and two Cream Pie Supremes don't make more splats (one a pizza); two Snowball Pies throw their own snowballs, two Sandcastle Sundaes add their walls, two Steam Bun Pies or Comet Calzones fire twice as often, and two T-Rex Ribs or Phantom Waltzes add up.

**The friendly ghost and the undead rules (CLAUDE.md).** The ghost is a sprite of the perk, never a foot: it isn't in the feet list, smacks pass through it, and no zombify path (the Zombie Loafer's bite, Zombie Outbreak, the zombie peels) can reach it.

**Living pizzas (step 2).** Each is an Epic and runs its tier's settings. Five new elements (`pizzaAlive.ts`), each with its idle effect and stomp burst: sand (grains trickling off the crust; a burst of sand), steam (puffs rising off the pie; steam bursting up), soot (dark smoke and flakes drifting up; a soot cloud), cream (cream bubbles rising; cream flecks), quake (dust jumping off the table round the plate; chips and dust). The rest use existing ones: ink (Squid Ink Nero, violet), frost (Snowball Pie, which also counts as cold: no steam), cosmic (Comet Calzone, blue), ghost (Phantom Waltz, lavender). `PERK_ELEMENT` can now give a perk its own colour. Each perk's moment calls `perkFired({ quip: false })` (it has its own quip), throttled where it could fire on every smack.

**Restrained.** Effects land on the feet or pies involved; nothing stays over the table (the sand wall rises from the back of the pie for half a second; the splat lies on the pie's back half, clear of its face). In a boss or mini-boss fight they play lighter (fewer pieces, a softer shake). Cosmetic randomness is `crand()`.

**STATS tab.** "Table shake" and "Comet" (×4, Damage); "Ink spray", "Snowball", "Pie splat", "Steam vents" and "Lost in soot" (Crowd control); "Sand wall" and "Friendly ghosts" (Sustain, with the ghosts on guard now).

**Peel abilities** (the four meter ones with their own visuals in `src/game/abilityFxSpecs.ts`): Squid Ink Nero **Ink Cloud** (meter: every foot slowed 50% and marked ×1.4 for 4 s, ×4; the Kraken's tentacle at the edge, its ink flooding in), Snowball Pie **Snowball Fight** (every 5 s: 2 feet frozen 1.5 s, ×1.5), Cream Pie Supreme **Pie in the Face** (every 5 s: a cream pie lobbed at the front foot, ×2.5 and stunned 1.2 s), Sandcastle Sundae **Sand Rampart** (meter: a shield on every pizza, every foot knocked back, ×4; walls of sand coming down on the feet), T-Rex Ribs **Big Stomp** (meter: ×7 to every foot and knocked back, stunned 1.5 s; the rib pie slams the table), Steam Bun Pie **Pressure Release** (every 8 s: the 3 front feet knocked back, ×2), Chimney Soot Pie **Soot Cloud** (20% of smacks: stunned 0.8 s and marked ×1.3 round the foot), Comet Calzone **Comet Tail** (meter: ×6 round the 3 toughest feet, every foot burning; icy comets raining down), Phantom Waltz **Last Waltz** (30% of kills: stunned 1 s and ×1.5 round the foot).

**Sounds.** All reused and credited already, from the bosses each pizza comes from: the Kraken's squirt and inked, the Yeti's snowball and a snow thud, King Honk's pie splat and honk, Sandcastle Sam's walls and sand landing, T-Rex Toes' growl, Iron Heel's vent and steam, the Chimney Sweep's soot, the Cosmic Croc's meteor and impact, the Phantom King's stir and fade, a ghost thud; loaded with the run (`PERK_SFX`).

**A fix on the way.** The scene's lane cache was kept across a restart, so a new run whose pizzas sat where the last run's did reused the old run's lanes (feet aimed at the old pizzas). `resetState` now clears it.

**Not done here.** A possessed pizza (the Ghost) grants none of these, as with the others. Ghosts, splats and the sand wall aren't saved with a run (a continued run starts its wave without them). The balance sim's light check only shows nothing broke; the numbers wait on step 6.

## 10. Step 4, batch 2, as built (2026-11-27)

The 9 Epic Pizzeria pizzas of section 3 (E10–E18), in `src/content/pizzas/p6.ts`. The table now has 143 pizzas: Common 60, Rare 50, Epic 33 (Pizzeria 10). Each comes from Act 9's myths and is built from its boss's props and sounds: their perks run in `src/game/pizzaPerks.ts`, their new toppings are drawn in `src/content/art/toppings-p6.ts`, and every one has its peel (from `buildDefs()`, unlocked by 20 waves on the table like every pizza peel, its Epic gem in the locker) with a hand-written ability in `ABILITIES`.

**Bought.** Route `pizzeria`, tier `epic`: they're listed in the Pizzeria's pizzas tab in its Epic frame, at 720–1,050 Golden Crusts (the Epic band); buying one unlocks it for good (it then shows as unlocked in the Pizzapedia). As step 1 set, they're never dealt as Pizzeria Specials on the counter (that's Common and Rare only).

| # | Pizza (id) | Crusts | Toppings (new ones in bold) | Perk, as built | Enhanced | What you see and hear |
|---|---|---|---|---|---|---|
| E10 | Colossus Forge (`colossusforge`) | 950 | tomato, **the forge's glow: molten seams and a white-hot heart**, **pepperoni seared into the Colossus's riveted bronze plates**, chilli | +1% damage for every wave survived this run, up to +40% (smack damage, through the stats like any damage perk; it counts every wave cleared this run, whether or not the Forge was out yet; saved with the run) | +1.5% a wave, up to +60% | 2.5 s into each wave (after its banner): the Colossus's anvil and clang, sparks thrown off the pie, a bronze glint, "THE FORGE: +12% DAMAGE" |
| E11 | Gorgon's Gaze (`gorgonsgaze`) | 880 | pesto, **mozzarella turned to cracked statue stone**, **courgette hair snakes with gold eyes**, olive, basil | The first ordinary foot to hover over it each wave meets Medusa's eyes: it's stunned 3 s as a statue and takes ×2 from everything while it lasts. Bosses, mini-bosses and feet a fight moves by hand are left alone | 5 s | two green eyes open on the pie and a green glare beams up to the foot, Medusa's gaze and petrify, the foot greys over with a crack on it, "TURNED TO STONE! ×2"; it crumbles off at the end (Medusa's crumble) |
| E12 | Three-Headed Hound (`threeheaded`) | 1,000 | **the pie in Cerberus's three tempers** (fire, ice, poison thirds), meatballs | Every 3rd landed smack (counted per pie, once a swing however many feet it hits; on the first foot it hit) bites three times: the smack and two more hits of a smack's damage (no crit) 0.12 s apart | every 2nd | Cerberus's fire, ice and poison heads snap in at the foot one after another with a bark each, rings in their colours, "THREE BITES!" |
| E13 | Labyrinth Lasagne (`labyrinthlasagne`) | 820 | square: **a lasagne baked as the Minotaur's maze** (pasta walls on a ragù floor, béchamel in the dead ends), parmesan | A foot that stomps it is lost: it's sent to a free lane over another pizza (if there is one), and once it's back in its hover it waits 2 s on top of its usual wait there before its next dive (held with `holdHoverT`). Not bosses, mini-bosses or feet a fight moves by hand | 3 s | the Minotaur's walls jut up either side of the foot, a little labyrinth turns over its head while it's lost, "LOST IN THE LABYRINTH!", the Minotaur's walls sound |
| E14 | Ember Shade (`embershade`) | 760 | squid-ink base, **shades of the underworld drifting over it**, **coals split and glowing, with Hades' blue flame**, chilli | A killed foot leaves embers where it fell (at most 6 at once; they go with the wave; not a boss's Ghost echo, or one of several of a boss while another stands, which pay a tenth). The next foot through them catches fire: 6 damage a second for 3 s (a stronger burn keeps its own; burn-proof and insulated feet pass through) | 9 a second | glowing coals with a blue flame hang flickering where the foot fell (Hades' flare), and leap onto the next foot through: flames, "EMBERS! 6/s" |
| E15 | Siren's Song (`sirenssong`) | 1,050 | white base, **a siren's tail of pearly teal scales with a fin of dill**, shrimp, pearls | Every 25 s of wave (with a foot on the table; two pies: 12.5 s; the count carries between waves) every foot is enchanted and stands still 1.5 s. Bosses, mini-bosses and feet a fight moves by hand are only lulled: 40% slower for 1.5 s | every 17 s | the Sirens' song, rings rolling out off the pie, notes drifting from it to every foot and swaying over it, the feet sea-green, "SIREN'S SONG!" |
| E16 | Harpy Feather Pie (`harpyfeather`) | 720 | BBQ base, fried chicken, **harpy feathers in violet barred with gold**, chilli | Every 5 s (counting only with a foot on the table; it waits for a foot over it) a gust blows the feet over it 100 px back up (heavy feet and bosses less, as with any knock; a diving foot stops its dive; never down, for a foot already near the top) | 150 px | the Harpies' screech and a whoosh, feathers whirled up from the pie past each foot, streaks of wind, "HARPY GUST!" |
| E17 | Golden Fleece (`goldenfleece`) | 780 | white base, **the Golden Fleece: a pile of golden stracciatella curls**, gold leaf, rosemary | Bosses and mini-bosses pay 50% more tips (their kill's tips; two Fleeces add up; the Fleece doesn't show over a Ghost echo or a twin that pays a tenth) | +75% | the Fleece (drawn new, `pk_fleece`) shines over the fallen boss, gold glints and coins, "GOLDEN FLEECE: +50% TIPS" |
| E18 | Charybdis Swirl (`charybdisswirl`) | 900 | **the sauce dragged into Charybdis's whirlpool** (spiral arms of cream, a dark eye ringed with teeth), mussels, squid | 10% of landed smacks drag an ordinary foot into a whirlpool: stunned 1.5 s, a hovering one pulled down a little (bosses, mini-bosses and feet a fight moves by hand don't go under) | 15% | Charybdis's whirlpool turning under the foot's sole, bubbles drawn in, the foot sea-blue, the whirlpool and a splash, "WHIRLPOOL!" |

**Checked in a `?dev` game** (each perk by script, `scratchpad/js/tests.js`): the Forge ×1.12 after 12 waves and ×1.40 capped; the gaze stones the first foot (3 s, ×2) and not a second one that wave; smacks 1–6 on a 10-damage peel took 10, 10, 30, 10, 10, 30; a lost foot hovered 3.05 s (its usual wait plus 2 s), over another pizza; with an area smack hitting two feet, 6 swings made 2 triple bites; a kill left embers and the next foot through burned 6/s for 3 s; the song stunned both feet 1.5 s; the gust queued 100 px; boss tips ×1.5, ordinary ×1; 2,000 smacks made 187 whirlpools (9.4%).

**Living pizzas (step 2).** Each is an Epic and runs its tier's settings. Six new elements (`pizzaAlive.ts`): forge (sparks flicking off a hot crust and falling back, its rim glowing; a shower of sparks and bronze chips), stone (statue grit crumbling off the crust and a green glint of the gaze; stone chips), tempers (motes circling in Cerberus's three colours; fire, frost and poison bits), song (the Sirens' notes rising off it; notes thrown out), feather (harpy feathers drifting down round it, `pza_feather`; a burst of feathers), water (foam circling it; spray and foam). Labyrinth Lasagne uses quake (dust jumping off the table, sandstone-coloured), Ember Shade fire (with a blue shade glow) and Golden Fleece gold. Every moment above calls `perkFired({ quip: false })`, throttled where it could fire on every smack.

**Restrained.** Effects land on the feet or pies involved and go in under a second (the eyes and glare 0.8 s, the walls 0.8 s, the heads 0.5 s); the stone crack, maze, embers and whirl ride on their foot only while they last. In a boss or mini-boss fight they play lighter (fewer sparks, notes and feathers). Cosmetic randomness is `crand()`; the whirlpool's chance and the rest of the gameplay use `Math.random`.

**STATS tab.** "The Forge" (+% now, the waves so far), "Three bites", "Stone gaze" (×2) and "Embers" (/s) under Damage; "Lost in the maze", "Siren's song", "Harpy gust" and "Whirlpool" under Crowd control; "Boss tips" under Economy. The Forge's bonus is also a chip on Smack damage. The extra bites are their own damage source ("Three-headed bites").

**Peel abilities** (the four meter ones with their own visuals in `src/game/abilityFxSpecs.ts`): Colossus Forge **Bronze Hammer** (meter: ×7 round the 3 toughest feet, every foot stunned 1.2 s; the pie slams the table, bronze shards rain on them, the anvil), Gorgon's Gaze **Petrifying Glare** (meter: every foot frozen 2.5 s and marked ×1.5; the pie rises at the edge and its green glare beams down), Three-Headed Hound **Three Heads Bite** (every 6 s: ×2 to 3 feet, one burning), Labyrinth Lasagne **Dead End** (on a stomp: the stomper stunned 1.5 s and marked ×1.4), Ember Shade **Embers of Hades** (35% of kills: burns round the foot), Siren's Song **Sirens' Chorus** (meter: every foot stunned 2 s, marked ×1.3, ×3; the pie at the edge, notes swooping onto the feet, a sea-green wash), Harpy Feather Pie **Harpy Swoop** (every 6 s: the 3 front feet knocked back, ×1.5), Golden Fleece **Fleece of Gold** (always: +10% tips, +10% boss damage), Charybdis Swirl **Maelstrom** (meter: ×5 to every foot, slowed 50%, the 2 front stunned; water at the sides and a whirl under every foot).

**Sounds.** All reused and credited already, from the bosses each pizza comes from: the Colossus's anvil and clang, Medusa's gaze, petrify and crumble, Cerberus's barks and growl, the Minotaur's walls, Hades' flare, the Siren's song, the Harpy's screech, Charybdis's whirlpool, the Kraken's splash, the hero coins and the gold smack; loaded with the run (`PERK_SFX`).

**Frozen feet stay frozen.** The song, the gaze and the whirlpool leave a foot that's already frozen (a snowball, Time Stop) as it is: a plain stun would thaw it.

**Two copies.** Two Forges, Hounds, Harpy pies or Gaze pies each work on their own (two Gaze pies stone the first foot over each); two Siren's Songs sing twice as often; two Fleeces and two Charybdis Swirls add up (the whirlpool capped at 40%); two Labyrinths, Ember Shades don't make longer waits or hotter embers (an enhanced one sets them).

**The undead rules (CLAUDE.md).** No new foot: the embers, the maze, the whirl and the Fleece are sprites of the perks; nothing here zombifies anything.

**Balance.** One light sim (`--heat mild,regular --runs 2 --waves 40 --shop auto --workers 2`): all 4 runs reached wave 40, nothing broke. The sim's runs only put owned pizzas on the table, so these perks aren't in its numbers; they wait on step 6.

**Not done here.** A possessed pizza (the Ghost) grants none of these, as with the others. Lost feet, stone, embers and whirls aren't saved with a run (a continued run starts its wave without them); the Forge's wave count is. A hovering foot blown up by the Harpy gust drifts back to its hover height as usual, so it shows as about 75 px; a diving foot goes the full 100.

## 11. Step 4, batch 3, as built (2026-11-27)

The 6 Epic milestone pizzas of section 3 (E19–E24), from Act 8's Norse bosses, and the Epic Rare Find E25 Echo Slice (the Echo Phantom), in `src/content/pizzas/p7.ts`. The table now has 150 pizzas: Common 60, Rare 50, Epic 40 (Special 10, Pizzeria 10, Milestone 10, Rare Find 10). **Step 4 is done.** Each is built from its boss's props and sounds: their perks run in `src/game/pizzaPerks.ts`, their new toppings are drawn in `src/content/art/toppings-p7.ts`, three new props in `src/art/perkPropsNorse.ts`, and every one has its peel (from `buildDefs()`, unlocked by 20 waves on the table like every pizza peel, its Epic gem in the locker) with a hand-written ability in `ABILITIES`.

**Won or found.** E19–E24 are route `milestone`, tier `epic`: each is won by its goal (below), shows its goal and progress in the Pizzeria's Milestones group, the Pizzapedia ("🔒 Milestone: …") and the end-of-run GETTING CLOSER list, and winning it gives the milestone toast ("MILESTONE: REACH A 200 COMBO · Surtr's Ember Crust unlocked for free!") and unlocks it for good. Their cost (750–1,000, the Epic band) only sorts them. Echo Slice is route `rare`, tier `epic`, 1,050 crusts: the new-run screen deals it at the Epic odds among the locked Rare Finds (it's in that pool like any Rare Find), as a free trial or to keep.

### The milestone goals

The seven milestones whose Rare pizzas moved off milestones in step 1 (section 6) no longer win those pizzas: six became the Epics' goals, each made an Epic's goal, and the seventh waits for a Legendary. The old pizzas keep only their new routes, so the "Or win it: …" lines in the Pizzeria, the Pizzapedia and the shop are gone (`legacyMilestone` is removed).

| Old goal (its old pizza) | Now | Goal, as built | Counted from |
|---|---|---|---|
| Reach wave 20 (Pizza Fritta) | **Fenrir's Howl** | Reach wave 20 on Hot or hotter (`hot20`) | the best wave on Hot, Extra Hot or Inferno |
| Reach wave 45 (Quattro Stagioni) | **Rainbow Bridge** | Reach the Bifröst (wave 76) (`bifrost76`) | the best wave |
| Beat all 24 original bosses (Boss Slayer Supreme) | **Skald's Saga** | Beat 32 different bosses (`bosses32`) | bosses and mini-bosses beaten (32 is every one through Act 8) |
| Beat 6 different bosses (Okonomiyaki) | **Frostbite** | Beat 6 different bosses on Hot or hotter (`hotBosses6`) | `bossesBeatenHot` (kept since the boss peels) |
| Reach a 150 combo (Combo King) | **Surtr's Ember Crust** | Reach a 200 combo (`combo200`) | the best combo |
| Defeat 5,000 feet (Thousand-Foot Feast) | **Serpent's Coil** | Defeat 8,000 feet (`feet8000`) | feet defeated |
| Beat your first boss (Birthday Cake Pizza) | *(left for step 5)* | for **L2 Silver Service** (beat the Head Waiter, the first boss a run meets, on Hot without losing a slice) | `firstBoss` was kept here for it, out of `MILESTONES`; step 5 gave Silver Service its own feat (`waiterHot`, section 12) and dropped `firstBoss` |

**Who gets what (a decision of the build).** The new goals have new ids, so a goal ticked off under its old wording (`combo150` and the rest, still in old saves) never wins an Epic, and players keep the old pizzas they won. The new goals are counted from records the save already keeps, so a player who has really met one under its new wording (a 200 combo already, 8,000 feet, 32 bosses, wave 20 on Hot) is awarded it at the next check (the menu catches up on milestones, a run checks after each wave): that's the goal met, not a free Epic.

### The pizzas

| # | Pizza (id) | Cost | Toppings (new ones in bold) | Perk, as built | Enhanced | What you see and hear |
|---|---|---|---|---|---|---|
| E19 | Fenrir's Howl (`fenrirshowl`) | 800 (sorts) | **Fenrir's paw prints pressed into the sauce** (heel and toes sunk in, claw marks), sausage, **Gleipnir: a chain of glowing silver-blue silk links, snapped at the middle** with frayed threads, black pepper | When a pizza is lost (destroyed: not one Olympian Feast saves; one Untouchable brings back counts, it was lost), every foot flees: a diving or stomping one turns tail and flies back up to the hover line (`lift`, picking a new target there), a hovering one starts its wait over and backs off a little (never down: a foot waiting high stays there). Bosses and mini-bosses are only knocked back (1,400); feet a fight moves by hand and friendly zombies stay put. Its own loss counts too (a last howl). One howl however many copies | the feet are also stunned 1 s once they're up | The wolf rises behind the Howl pie and throws back its head (drawn new, `pk_wolf`: a side-on howling head with tall ears and its muzzle to the moon, in Fenrir's grey, a broken link of Gleipnir at its throat, its neck fading out behind the pie), the howl rolls out in rings, Gleipnir's links fly off the pie, a streak of wind behind each fleeing foot, "FENRIR'S HOWL! THE FEET FLEE", Fenrir's howl and snap |
| E20 | Rainbow Bridge (`rainbowbridge`) | 900 (sorts) | **the Bifröst: seven roasted pepper ribbons arching across a crystal deck, frost glittering on its edge, its far end burning**, star dust, basil | As each wave starts each pie bridges a lane (a pizza's, chosen at random with `Math.random`; two pies take different lanes while there are lanes to spare). A foot in a bridged lane (within its width either side of that pizza) takes +40% from everything; bridges don't stack on one foot. A bridge lasts the wave while its own pie keeps bridging: if the Rainbow Bridge pie is lost, goes stale, has its perk frozen or is possessed (or an Echo Slice stops copying it), its bridge goes at once (the lane's pizza being lost doesn't end it) | +60% | The Bifröst comes down over the lane (drawn new, `pk_bifrost`: a soft band of seven colours fading as it rises, glittering), faint and behind the pizzas and the feet, shimmering; "RAINBOW BRIDGE: +40% HERE", the parting clouds and a glint; a smack on a foot in it throws rainbow sparks, "BIFRÖST! +40%" |
| E21 | Skald's Saga (`skaldssaga`) | 850 (sorts) | **a honey-mead glaze in a Norse knot**, **rye crispbread burnt with the Skald's runes** (some painted in his red and blue), salami, onion | +3% smack damage for every boss beaten this run (not mini-bosses; a boss's Ghost echoes and twins never count). It counts every boss this run whether or not the Saga was out yet, from the run's own list (saved with the run) | +4.5% a boss | When a boss falls (1.6 s on, after its banner; not King Honk's decoys): the Skald's song, three rune stones (drawn new, `pk_rune0–2`: standing stones with a rune cut and painted in his red, blue or gold) and notes in his colours rise off the pie, "SKALD'S SAGA: +12% DAMAGE" |
| E22 | Frostbite (`frostbite`) | 750 (sorts) | a pale frosted (moon) base, **mozzarella frozen into Thrym's ice blocks** (blue cubes outlined dark, a crack, frosted edges), **pearl onions rimed like hailstones**, rosemary | Chilled or frozen feet take +25% from everything. Chilled is the game's one slow state (`slowT` with a `slowPct`: the smack chill, Freeze Frame, snowballs, the ability slows, the Siren's lull; the game draws every slowed foot frosted), frozen is a freezing stun (`stunT` with `frozen`: Time Stop, snowballs, freezes). Insulated and slow-proof feet are never chilled. Two Frostbites add up | +38% | A smack on a cold foot cracks its frost: Thrym's hail chips off it, a frost ring, Thrym's crack; "FROSTBITE! +25%" (at most every 2.5 s) |
| E23 | Surtr's Ember Crust (`surtrsember`) | 950 (sorts) | **nduja baked to Muspelheim's coals** (black lava rock split by molten seams), **Surtr's flaming sword laid across the pie** (a fire-roasted pepper blade glowing white-hot at its edge, flames streaming off it, a gold guard), chilli | A burning foot that dies spreads its fire to the nearest foot (within 700 px; not burn-proof or insulated feet): it burns as hot and as long (3 s at least). Not from a boss's Ghost echo or a twin. A foot that catches and dies spreads it on | to the 2 nearest (two pies add up, to 3) | Surtr's fireball (his own prop) arcs from the fallen foot to the next, trailing flames, and bursts into fire on it; "SURTR'S FIRE SPREADS!", Surtr's fireball and ignite |
| E24 | Serpent's Coil (`serpentscoil`) | 1,000 (sorts) | pesto, **Jörmungandr coiled round the pie biting its own tail** (a scaled courgette serpent, gold belly, gold eye), **drops of venom**, shrimp | Once a wave, the first ordinary foot to dive on it is caught well into its dive (low enough that the coils show clear of the top of the screen) and held where it is for 3 s (a stun), then carries on. Bosses, mini-bosses, feet a fight moves by hand, friendly zombies and a foot already frozen aren't caught: the coil waits for the next | 4.5 s | The serpent's body lashes up out of the pie and its coils wrap the foot (drawn new, `pk_coil`: two loops round its middle, its head reared and hissing), squeezing while it's held, the foot sea-green; "COILED! HELD 3s", Jörmungandr's constrict and hiss |
| E25 | Echo Slice (`echoslice`) | 1,050 crusts | **pepperoni with a cyan and a magenta echo slipped either side**, **basil and its echo**, **the Echo Phantom's glitch: bands of the pie slipped sideways, fringed cyan and magenta, faint scanlines**; drawn see-through (the Fantasma's ghost finish) with a cyan glow | Copies the perk of the pizza beside it (below) | it copies the perk at its enhanced strength | The table label and its card name the pizza it copies, "Echoing Frostbite" (that pizza sits right beside it, its perk in full; the label fits the normal font), and the STATS tab spells the copy out ("Echoing Frostbite: Chilled or frozen feet take +25% damage"); when it copies something new mid-wave, "ECHOING FROSTBITE!" rings out from it with the Mirror Peel's echo (only while the Echo Slice itself is live) |

### Echo Slice's rules (decisions of the build)

- **Beside it** is the pizza on its **right** in table order (by position on the table, left to right); if that one has nothing it can copy, the one on its **left**; if neither, it echoes nothing ("Echoing nothing") and grants nothing.
- **Nothing to copy:** an empty seat (it's at the end of the table), another Echo Slice (it looks the other way; two side by side can't copy each other), a dead pizza, a stale or perk-frozen one (no perk right now), the pizza the Ghost has possessed, a Mystery Meat not yet revealed, or a perk it won't copy (below). It copies what the neighbour grants **now**: Arcobaleno's borrowed perk, Quattro Stagioni's season, Mystery Meat's (from the moment it's revealed, as its first wave starts).
- **It re-copies whenever the table changes:** the copy is worked out again on every recompute of the run's stats (a swap or reorder in the shop, a pizza lost or rebaked, one going stale or reheated, a perk frozen or thawed, a new wave). Its label redraws, the STATS tab shows the copy, and mid-wave the change is announced.
- **It counts as a second copy** of the perk, doing exactly what two of that pizza would (two Frostbites add up: +50%; two Harpy pies each gust over their own pie; a second Forge multiplies). Its own enhancement sets the copy's strength.
- **What it won't copy** (`ECHO_SKIP`, the same as Arcobaleno's list plus itself), checked perk family by perk family: perks set up when a pizza is placed or tied to its own type (Meat Feast's 12 slices, Lahmacun, Pumpkin Spice's never stale, Carbonara's rise, Pizza al Taglio's refund, Century Crust's slices), the once-a-run saves (Olympian Feast, Untouchable, Volcano Calzone's eruption, Pizza Fritta's stale heal), the crust earners (Caviar Bianca, Fig & Gorgonzola, Golden Anniversary) and the other borrowers (Arcobaleno, Mystery Meat; Quattro Stagioni's own rotation, though its season is copied). Everything else was checked as a second copy: stat perks (counted through the perk counts, with the usual caps), timers (two copies fire twice as often: Disco, Steam, Siren, Comet, Meteor; Time Stop is capped at 5 s), on-kill perks (per pie, as the target), on-stomp perks (the echo pie is stomped like any pie), shields (its own shield) and the once-a-wave and once-an-act ones (Nonna's Secret stays once an act whoever holds it; Gorgon's Gaze, Serpent's Coil and Granite Crust each once a wave per pie, as with two copies). None broke.
- **Saved:** the copy and the pizza it comes from are kept in the pizza's flags (as indexes), and a continued run works them out again at once.

**Checked in a `?dev` game** (each perk by script, `scratchpad/js/tests3.js`, log in `pizza-epics3/perk-tests.json`): a pizza lost with two feet diving at y 520 → both `lift` and back at the hover line 0.9 s later, the hovering one starting over; the bridge ×1.4 in its lane and ×1 in another; the Saga ×1.03 with one boss and ×1.12 with four (mini-bosses not counted), and nothing for a decoy; Frostbite ×1 plain, ×1.25 chilled, ×1.25 frozen, ×1 merely stunned; a burning foot killed → its neighbour burning 7/s (its own rate) for 3 s, the far one not; an unburnt kill spreads nothing; the coil held a diver 3 s in place (`descend`, not moving, at y 529) and not the second diver that wave; the bridge ×1.4 in its lane fell to ×1 and came down the moment its pie was lost; a foot waiting at y 130 stayed there through a howl; Echo Slice beside Frostbite, Rainbow Bridge, Skald's Saga and the Harpy (through another Echo Slice) copied each, beside Mystery Meat it copied its revealed perk in its first wave, beside Meat Feast (12 slices) and the Volcano it copied nothing, and with its right neighbour lost it re-copied its left one (Margherita); with Frostbite beside it, Frostbite counted twice (+50%).

**Living pizzas (step 2).** Each is an Epic and runs its tier's settings. One new element (`pizzaAlive.ts`), **echo**: cyan and magenta wisps circling, and every couple of seconds an echo of its rim rippling out over the table, alternating cyan and magenta; its burst throws wisps and stars in both colours with the Mirror Peel's echo. The rest use existing ones in their bosses' colours: Fenrir's Howl moon (moonlit grey), Rainbow Bridge rainbow, Skald's Saga song (gold notes), Frostbite frost (it counts as cold: no steam, rimed crust), Surtr's Ember Crust fire (and it counts as hot), Serpent's Coil water (sea-green foam). Every moment above calls `perkFired({ quip: false })`, throttled where it could fire on every smack.

**Restrained.** Effects land on the feet or pies involved and go in about a second (the wolf 1.4 s, the coils while the foot's held); the Bifröst is faint (about 30%) and sits behind the pizzas and the feet, in its lane only. In a boss or mini-boss fight they play lighter (fewer links, sparks, chips and notes, a softer shake). Cosmetic randomness is `crand()`; which lane is bridged, and the rest of the gameplay, `Math.random`.

**STATS tab.** "Rainbow bridge" (+40%), "Skald's saga" (+% now, the bosses so far), "vs chilled or frozen" (×1.25) and "Burning spreads" (to 1 foot) under Damage; "Fenrir's howl" (ON A LOSS) and "Serpent's coil" (3 s) under Crowd control. The Saga's bonus is also a chip on Smack damage. Each Echo Slice has an "ECHOING" tile with its copy spelled out, in the section its copy belongs to (Damage, Crowd control, Economy or Sustain, from the copied perk's text), and its copy shows in that perk's own tile, with the Echo Slice as one of its sources.

**Peel abilities** (the three meter ones with their own visuals in `src/game/abilityFxSpecs.ts`): Fenrir's Howl **Fenrir Unbound** (meter: every foot knocked back 1,600, stunned 1.2 s, ×5; the wolf rises howling at the corner, Gleipnir's links flung off the feet), Rainbow Bridge **Bifröst Opens** (meter: every foot marked ×1.5 for 5 s, ×5; the bridge pie at the edge, a beam of the rainbow down on each foot), Skald's Saga **Saga of Heroes** (always: +20% damage to bosses), Frostbite **Rime of Thrym** (20% of smacks: chilled 40% for 2 s and marked ×1.25 round the foot), Surtr's Ember Crust **Sword of Surtr** (meter: every foot burning 5 s, ×6 round the 2 toughest; the pie slams the table and Surtr's fireballs rain on the feet), Serpent's Coil **Coils of the Deep** (on a stomp: the stomper stunned 2.5 s, ×2), Echo Slice **Echo Smack** (25% of smacks: the foot hit again, and an echo of it hits another foot).

**Sounds.** All reused and credited already: Fenrir's howl and snap, the Bifröst's parting clouds (`sfx_sungap`) and a glint, the Skald's song, Thrym's crack, Surtr's fireball, ignite and impact, Jörmungandr's constrict and hiss, the Mirror Peel's echo; loaded with the run (`PERK_SFX`).

**Two copies.** Two Rainbow Bridges bridge two lanes; two Sagas, two Frostbites and two Surtr's Ember Crusts add up (the fire to at most 3 feet); two Serpent's Coils each catch their own diver; two Fenrir's Howls make one howl (an enhanced one stuns).

**The undead rules (CLAUDE.md).** No new foot: the wolf, the Bifröst, the coils and the fireballs are sprites of the perks; nothing here zombifies anything. A friendly zombie is left alone by the howl and the coil.

**Balance.** One light sim (`--heat mild,regular --runs 2 --waves 40 --shop auto --workers 2`): all 4 runs reached wave 40, nothing broke. The sim's runs only put owned pizzas on the table, so these perks aren't in its numbers; they wait on step 6.

**Reviewed** (one independent code and visual review). Fixed from it: Skald's Saga played on King Honk's boss-typed decoys; Fenrir's Howl could pull a foot waiting high back down; an Echo Slice beside an unrevealed Mystery Meat stayed stale through its first wave (the reveal now recomputes); Rainbow Bridge outlived its pie; Echo Slice announced a new copy while stale or frozen; Surtr's spread now carries whose fire it is (an ability's or the table's) to a foot that wasn't burning; the coil's tint now shows (a stun skips the usual tint keeper). Visuals: the wolf redrawn so it reads as a wolf, the Saga's runes are rune stones (the Act 8 rune disc read as a lightning coin), the portraits carry little or no cheese so their boss toppings read (Frostbite on a pale frosted base with outlined ice blocks), the coil catches lower in the dive, the Rare Find tile's header no longer wraps ("RARE FIND · TRY IT", running the full width above its button, so the tier tag isn't under it), and the Echo Slice's line fits at the normal font. The far-left and far-right lanes' longest captions running under the corner buttons is a game-wide layout issue, left for a separate fix.

**Not done here.** A possessed pizza (the Ghost) grants none of these, as with the others (its Echo Slice's copy is the Ghost's). The bridges and coils aren't saved with a run (a continued run's next wave bridges anew); the Saga's count is (the run's boss list). The `firstBoss` goal waits for Silver Service in step 5.

## 12. Step 5, batch 1, as built (2026-11-27)

The first three Legendaries of section 3, Act 1's (L1–L3), in `src/content/pizzas/p8.ts`, and the groundwork every later Legendary reuses. The table now has 153 pizzas: Common 60, Rare 50, Epic 40, Legendary 3.

**The act mapping.** Checked against `src/data/stages.ts`: Act 1 is stages 1–2, Trattoria Nonna (mini-boss the Head Waiter, boss Bigfoot) and the Rooftop (the Chimney Sweep, the Iron Heel), waves 1–10. All three fit as drafted, so nothing moved. Nonna herself is Act 4's boss (the Kitchen); her Masterpiece is her dish served at her Trattoria, and borrows her ladle and her sounds. "That act's boss" (the Pizzeria gate) is taken to be the boss of the act's last stage, the one whose fall completes it: for Act 1, the Iron Heel.

### The pizzas

| # | Pizza (id) | Route, price | Toppings (all new) | Perk, as built | Enhanced | What you see and hear |
|---|---|---|---|---|---|---|
| L1 | Nonna's Masterpiece (`nonnasmasterpiece`) | Pizzeria, 2,400 crusts, once the Iron Heel is beaten on Hot or hotter | Nonna's ragù in glossy dollops (minced meat, carrot and celery, its oil), hand-torn fior di latte, curls of parmigiano, basil, **her wooden ladle laid across the pie, its bowl full of ragù and a drip off its lip**, flour on the crust | Once a wave Nonna's ladle swats the first foot to stomp any pizza: the stomp is blocked and the foot takes ×5 (a smack's damage, Legendary-scaled by heat). It's checked before every other defence, so it takes piercing stomps too (not on the possessed pizza). One swat per copy (an enhanced one two) | twice a wave | Her ladle (drawn new, `pk_ladle`) comes up beside the stomped pie, winds back and swats the foot: a wooden THWACK, ragù flecks and flour flying, the foot knocked away, "NONNA'S LADLE! ×5"; Nonna's spoon, a heavy wood smack and a sauce splat |
| L2 | Silver Service (`silverservice`) | Milestone: **beat the Head Waiter on Hot or hotter without losing a slice in his wave** (`waiterHot`, a new id); 2,000 (sorts) | a crème fraîche base piped in a spiral, **smoked salmon roses, crème fraîche rosettes, caviar, edible silver leaf**, dill, **the crust brushed with silver and beaded like his tray** | Every 15 s of wave (the count carries between waves; two copies twice as often), once a foot is diving, the Head Waiter's silver tray skims the table and bats every diving or stomping foot back up to the top (as Fenrir's Howl's lift: it picks a new target there). Bosses and mini-bosses are only knocked back; feet a fight moves by hand and friendly zombies are left alone | every 10 s | The tray (drawn new, `pk_tray`) sweeps across the table from its pie's side just over the pies, lifting and tilting, a silver trail behind it; each foot it passes rings and glints, a silver streak as it flies up, "SILVER SERVICE!", "BATTED!"; the Head Waiter's tray toss, bat and clang and his service bell |
| L3 | The First Bake (`firstbake`) | Chef's Special, 650 tips (the Legendary tip price: about 1,050 in the wave 5 shop, 1,300 in the shop before wave 10, with nothing bought yet) | olive oil pools, **blistered San Marzano halves**, fior di latte, basil, **sea salt flakes**, **a sprig of the first wheat**, **a wood-fired cornicione, puffed and leopard-spotted** | Every pizza starts each wave fully fresh (topped up quietly as each wave clears, so the shop shows it fresh, and again as the next starts for one bought in the shop; on Mild, where freshness is off, only the slice), and once a run each kind of pizza gets one slice over its maximum, the first time it starts a wave whole (tracked by pizza type for the run, saved with it: swapping a pie out and back doesn't earn another). A slice over is eaten first and never grows back (`Pizza.overSlices`, in its flags); the shop's tiles and the swap window show it over the top, "9 / 8 slices" | 2 slices over | When a pie was really low (half fresh or less, or stale) as a wave clears, at most once a stage: the wood oven (drawn new, `pk_oven`) rises beside the pie, a warm wave rolls out over the table, steam puffs off every pie it freshened, "THE FIRST BAKE: ALL FRESH!"; a slice over: a gold ring and "+1 SLICE OVER!" on each pie; its oven roar and bell (new, `sfx_legendbake`) |

Checked in a `?dev` game by script (`scratchpad/pizza-legends1/tests.js`, log `perk-tests.json`): the ladle blocked the first stomp on Pepperoni (8 → 8 slices) and the foot took 55 on Mild, 79 on Regular and 102 on Hot from an 11-damage smack (×5 × 1, 1.43, 1.86), then the second stomp that wave landed (8 → 7); the tray batted two divers at y 421 (`lift`, back at the hover line 0.9 s later) and left a hovering foot alone; The First Bake gave every pie 9/9 slices as the wave started, a Pepperoni at freshness 3 went to 10/10 as the wave cleared, its next lost slice was the one over (back to 8/8), healing never took it over again and the next wave start gave nothing more; the Pizzeria gate shut without the Iron Heel on Hot and open with it; the Head Waiter goal stayed 0 when he fell with a slice lost and went to 1/1 with none lost.

### The Legendary groundwork (later batches plug into it)

- **Gates** (`src/game/legendary.ts`, `legendGate`): a Pizzeria Legendary is listed in the Pizzeria in its gold frame but locked ("🔒 Beat the Iron Heel (Act 1’s boss) on Hot or hotter", a locked price button) until its act's boss (`actBoss(act)`: the last stage's boss) is in `bossesBeatenHot`; the Pizzeria's NEW badge and the end-of-run "affordable" list skip a shut one. A Milestone Legendary is an ordinary `MILESTONES` entry whose goal is its feat (recorded as it happens in `save.pizzaGoals`, read by `milestoneProgress`). A Chef's Special Legendary is dealt only by `legendSpecialOpen` (Tron's call, 2026-11-27): in any shop within its act's stages from the act's second stage on (the shop's stages are the next wave's): Act 1's in the shops after waves 5–9, Act 2's after 15–19, and so on, on every endless loop too. (Section 2's "from wave 10" would have left Act 1's one shop a run.) It's rolled at the Legendary odds (2 in 100 of the tier roll) and priced by the usual special formula from its tips. A Rare Find Legendary (none yet) only enters the new-run screen's pool once its act is in `actsCleared`. The Pizzapedia says how each unlocks, with the gate.
- **Heat-scaled damage:** `legendDmg(mult, smack, heat)` = mult × smack × the heat's foot health over Mild's (×1, ≈1.43, ≈1.86, ≈2.43, ≈3.14). Every Legendary's damage goes through it; the card and STATS show the Mild number (×5). The Epics stay unscaled, as section 9 decided.
- **Looks:** each Legendary has its colours in `LEGEND_LOOK` (its aura, its moments, its card's glow and border light, its confetti and its reveal's line).
- **On the table** (`src/game/legendAuras.ts`, plugging into `AURAS` and `SIGNATURES` in `pizzaAlive.ts`): each aura is its own, layered and always moving: glows under the plate, what circles or rises round it between the plate and the pie, and only the crust's edge between the pie and its face (`AuraCtx.top`); it dims while the pie is stale or its perk frozen (`AuraFrame.quiet`). Nonna's: a wood oven's flickering glow under and behind the pie, a warm rim, flour drifting down round it and puffing off now and then. Silver Service's: a cool silver glow and a turning sheen ring under it, the Head Waiter's tray circling the crust on the table with its shadow and a trail, catching the light as it comes round. The First Bake's: a golden glow and heat, steam rising in plumes off its back either side of the freshness bar, three glints running round the top of its crust. Signatures (`SigCtx`): stomped, the aura flares, a pulse of its light spreads over the table under the plate and its own sound plays (Nonna's rolling pin, the Head Waiter's tray clang, the oven's puff, new `sfx_legendpuff`), lighter in a boss fight; its perk firing adds a pulse to its perk's moment.
- **The counter and the reveal** (`src/ui/legendDeal.ts`, filling `LEGENDARY_COUNTER`): dealt, the counter section dims round the card (one dim however many are dealt), the card flips in under a shaft of light in its colours with the fanfare (new `sfx_legendfanfare`), and "LEGENDARY!" stamps in over it (`sfx_legendstamp`) with a burst of gold; then the light lifts. Bought at the counter or in the Pizzeria, or won as a milestone (in a run, as the wave clears; on the menu, as the Pizzeria catches up), `legendReveal` shows the full-screen reveal: the pie rising in rays and a halo in its colours, YOURS FOR GOOD! (or the milestone), LEGENDARY, its name, its line and perk, confetti in its colours and its sting (`sfx_legendreveal`); a tap, a key or 5 s closes it. Reveals queue: several won at once show one after another, and a milestone's waits on the browser's clock, not the scene's, so a run ending or pausing can't lose it. Reduced motion keeps the light and sound, without the flip, rise, turning rays or confetti.
- **Cards everywhere:** the gold frame's living border (step 1) turns through the pizza's own colours (`tierAttrs(r, id)` adds `--la`/`--lb`) and its pie breathes and glows in them, on the counter, the shop table, the Pizzeria, the Pizzapedia, the new-run screen, and now the swap window (its tiles and the incoming pizza are framed by tier, every tier).
- **Peels:** `LEGEND_PEEL` in `src/art/peelPizza.ts` (filled by `src/content/art/legend-peels-p8.ts`): the aura drawn on the peel behind the pie and over its rim, what it sheds each frame, and a show-piece smack (Nonna's ladle swinging across the board with ragù and flour; the tray spinning round the pie, flashing; the oven's breath, a gold flash, steam and embers).
- **Echo and borrowing:** Arcobaleno never borrows a Legendary's perk. Echo Slice copies Nonna's ladle (one more swat a wave) and Silver Service (the tray twice as often); The First Bake is once a run, so it's in `ECHO_SKIP` (and `BORROW_SKIP`). The possessed pizza grants none (`with()`), as always.
- **To add a Legendary:** its pizza with `rarity: 'legendary'`, `act` and its route; a `LEGEND_LOOK` entry; `AURAS[id]` and `SIGNATURES[id]`; its perk in `pizzaLegends.ts` (hooked from the Epics' kit), its `ENHANCED_PERK` text and STATS tile; its `LEGEND_PEEL[id]`; its ability (and spec if meter-fired); a milestone Legendary its `MILESTONES` entry and `milestoneProgress` case. Gates, counter and reveal moments, card borders and odds come with `rarity` and `act`.

**STATS tab.** "Nonna's ladle" (1 stomp a wave; the foot takes ×5, with what that comes to on this heat, ×9.3 smacks on Hot) and "The First Bake" (+1 slice over max, once a run; every pizza starts each wave fresh) under Sustain; "Silver service" (every 15 s) under Crowd control.

**Peel abilities** (the two meter ones with visuals in `src/game/abilityFxSpecs.ts`): Nonna's Masterpiece **Nonna's Wooden Ladle** (meter: every foot knocked back, ×7, stunned 1.5 s, every pizza +1 slice; her ladle coming down on the feet, ragù flying), Silver Service **Tray Service** (every 7 s: the 3 front feet knocked back, ×2.5, stunned 0.8 s), The First Bake **Fresh from the Oven** (meter: every pizza fresh and +1 slice, every foot burning and ×5; the oven rising at the corner, embers raining).

**Sounds.** New, synthesized and CC0 (`scripts/pizza-sfx/legends.py`, credited): `sfx_legendfanfare`, `sfx_legendstamp`, `sfx_legendreveal`, `sfx_legendbake`, `sfx_legendpuff`, measured against the shop's and the bosses' (50 ms RMS peak −10 to −13.6 dB, like `sfx_tiersting` −11.8 and `sfx_upgrade` −11.4). Reused, credited already: Nonna's spoon and rolling pin, the Head Waiter's tray toss, bat and clang and service bell, wood, sauce and metal smacks (`LEGEND_SFX`, loaded with the run).

**Cost.** 3 Legendaries and 2 Epics (Surtr's Ember Crust, Frostbite) on the table in a busy Hot wave (wave 24, the auto-player, up to 6 feet): 60 fps throughout (mean frame 16.66 ms, p95 16.8, worst 16.8, none over 33 ms).

**Balance.** One light sim (`--heat mild,regular --runs 2 --waves 40 --shop auto --workers 2`): all 4 runs reached wave 40, nothing broke. The sim's runs only put owned pizzas on the table, so these perks aren't in its numbers; they wait on step 6.

**Not done here.** A Legendary Chef's Special is rare by design (2 in 100 of the special slot's tier roll, in its act's second stage). The ladle, the tray in flight and the oven aren't saved with a run (the slices over and their once-a-run flag are). The gold platter under a Legendary's portrait isn't on the table plate (all table plates are the same), as before.

---

## Appendix: today's 113 pizzas, re-tiered

Tiered by perk strength from the perk text and numbers (not yet the sim). Format: name (route, current price): perk.

**Epic (15):** The Golden Pie, Peel Collector, Untouchable, Ragnarök Roast, Napoli DOC, Mystery Meat, Arcobaleno, Pizza Fantasma, Moon Cheese, Dragon Fruit Flambé, Tikka Time Machine, Volcano Calzone, Meteorite Margherita, Nonna's Secret, Spinach & Feta.

**Rare (48):** Choco-Berry, Detroit Red Top, Chicago Deep Dish, S'mores, Unicorn Dream, Pizza Fritta, Okonomiyaki, Mac & Cheese, Birthday Cake Pizza, Carbonara, Cajun Shrimp, Pumpkin Spice, Quattro Stagioni, Speed Slice, Combo King, Inferno Calzone, Boss Slayer Supreme, Thousand-Foot Feast, Olympian Feast, Pesto Genovese, Sicilian Square, Grandma Square, Calabrese, Lahmacun, Fig & Gorgonzola, Duck à l'Orange, Philly Cheesesteak, Burrata & Heirloom, Napoletana, Oyster Rockefeller, Caviar Bianca, Four-Leaf Clover, Pizza Piñata, Haunted Hawaiian, Pirate's Treasure, Royal Wedding, Garden Veggie, Capricciosa, Calzone, Veggie Supreme, Hot Honey Chicken, Buffalo Hot, Meat Feast, Frutti di Mare, Taco Fiesta, New York Slice, Kebab Pizza, Greek.

**Common (50):** everything else: the three starters, the small stat bumps and the situational and score-only perks (Black Truffle, Mallow Mountain, Victory Lap, Golden Anniversary, Night Shift, Perfect Pie, Century Crust, and so on). In full: Margherita, Pepperoni, Funghi, Hawaiian, Quattro Formaggi, Diavola, BBQ Chicken, Black Truffle, Marinara, Prosciutto e Rucola, Breakfast Club, Patate e Rosmarino, Nduja, Hot Honey Pepperoni, Puttanesca, Stromboli, Pizza Bianca, Tarte Flambée, Pizza al Taglio, Pickle Pie, Tandoori, Salsiccia e Friarielli, Mallow Mountain, Pugliese, Ham & Mushroom, Chicken Pesto, Tuna & Sweetcorn, Pizza Romana, Garlic Bread Pizza, Bolognese, Jerk Chicken, Bufala, Chorizo & Pepper, Mediterranean, Sloppy Joe, Quattro Pomodori, Saffron & Lobster, Wagyu & Truffle, Smoked Salmon & Dill, Porcini Tartufata, Champagne Brunch, Lobster Thermidor, Fig & Prosciutto Rose, Bone Marrow & Black Garlic, Gold Leaf Margherita, Victory Lap, Century Crust, Perfect Pie, Golden Anniversary, Night Shift. Each pizza's `rarity` in the data is the source now.
