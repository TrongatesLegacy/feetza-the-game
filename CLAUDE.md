# Feetza: project rules

## Every new foot, boss, pizza, location or event gets a peel

Peels are the game's collection. Anything new a player can meet must come with its peel, in the same change:

- **Feet, bosses and mini-bosses** (`src/content/feet/`), **pizzas** (`src/data/pizzas.ts`), **locations** (`STAGES` in `src/data/stages.ts`) and **wave events** (`src/game/events.ts`) get their peel automatically from `buildDefs()` in `src/game/peels.ts`. Check that it shows in the Peel Locker with a sensible unlock goal.
- **Write its ability by hand** in `ABILITIES` (`src/game/abilities.ts`). Without one, the peel quietly falls back to the Classic's Peel Slam, and only the Classic Peel may have the Peel Slam. The dev build prints a `[peels] … have no ability` error in the console at boot when any peel is missing one.
- **Give it a look that fits:** foot and boss peels use the foot's art; locations need a `PLACE_LOOK` entry; events need `EVENT_LABEL`, `EVENT_NEED` and `EVENT_LOOK` entries. Check the thumbnail in the locker: centred on the handle, nothing cut off.
- New peel groups (heroes, the God Peel, and so on) follow the same rules: their own ability, an unlock, and a look in the game's style.

To test peels without earning them, open the game with `?dev` and press **🔓 Peels** (in the floating dev buttons on the left). Press **🔒 Peels** to put back the peels that were really unlocked.
