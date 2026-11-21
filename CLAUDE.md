# Feetza: project rules

## Every new foot, boss, pizza, location or event gets a peel

Peels are the game's collection. Anything new a player can meet must come with its peel, in the same change:

- **Feet, bosses and mini-bosses** (`src/content/feet/`), **pizzas** (`src/data/pizzas.ts`), **locations** (`STAGES` in `src/data/stages.ts`) and **wave events** (`src/game/events.ts`) get their peel automatically from `buildDefs()` in `src/game/peels.ts`. Check that it shows in the Peel Locker with a sensible unlock goal.
- **Write its ability by hand** in `ABILITIES` (`src/game/abilities.ts`). Without one, the peel quietly falls back to the Classic's Peel Slam, and only the Classic Peel may have the Peel Slam. The dev build prints a `[peels] … have no ability` error in the console at boot when any peel is missing one.
- **Give it a look that fits:** foot and boss peels use the foot's art; locations need a `PLACE_LOOK` entry; events need `EVENT_LABEL`, `EVENT_NEED` and `EVENT_LOOK` entries. Check the thumbnail in the locker: centred on the handle, nothing cut off.
- New peel groups (heroes, the God Peel, and so on) follow the same rules: their own ability, an unlock, and a look in the game's style.

To test peels without earning them, open the game with `?dev` and press **🔓 Peels** (in the floating dev buttons on the left). Press **🔒 Peels** to put back the peels that were really unlocked.

## Quality bar for new content

- **Every stage (5 waves) is a place:** its own backdrop with depth and ambient motion, its own music loop and ambience, and its own effects. A new stage never reuses another stage's music or backdrop.
- **Every boss and mini-boss** has its own music and its own sound for every move, plus a proper entrance and death.
- **Fidelity first:** match or beat the best existing art. Push animation where it helps: anticipation, squash and stretch, follow-through, and screen-level moments for big moves.
- **Review every batch** before calling it done, with a separate reviewer for each pass:
  - **Visual:** real screenshots at desktop and phone size, plus `F.contrast()` and `F.layout()`.
  - **Audio:** measure loudness with ffmpeg, check loops for gaps, and make sure every move has a sound. New audio must be CC0 or CC-BY and credited in `public/audio/CREDITS.md` and `credits.json`.
  - **Gameplay:** auto-player runs on several seeds and heats, plus a fairness check on Mild.
  - **Code:** an independent review of the diff.
- **Feet style:** new feet should move towards one continuous silhouette, with materials, one shared light direction and a simple rig, rather than shapes stacked on shapes. This is being piloted on new content; see "Looking ahead: redesigning the feet" in the plan doc. Until a pilot is approved, match the existing style.
