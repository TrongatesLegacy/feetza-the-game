# 🍕 Feetza

[![Feetza trailer: click to watch it with sound](media/trailer.webp)](https://trongateslegacy.github.io/feetza-the-game/trailer.mp4)

**Stop the feet. Save the pizza.** A browser arcade roguelike: cartoon feet descend on a table of pizzas and you smack them away with a pizza peel before they stomp. Build a run from roguelike upgrades, travel through six pizzerias, beat six bosses, and spend Golden Crusts on permanent upgrades between runs.

**Play it: https://trongateslegacy.github.io/feetza-the-game/**

**▶ Watch the 30s trailer with sound: https://trongateslegacy.github.io/feetza-the-game/trailer.mp4**

- **52 feet** (46 regular + 6 bosses), each with its own art, stats and traits (dodging, feinting, phasing, teleporting, reviving, splitting, rocket bursts, stink clouds…)
- **28 pizzas**, each granting a perk while it survives (lose the pizza, lose the perk)
- **30 in-run upgrades** across 4 rarities, plus rerolls, healing and rebaking between waves
- **9 permanent Pizzeria upgrades** and 25 unlockable pizzas: buy them with Golden Crusts earned each run, or get them free from 8 milestones (first boss, wave 10, 600 feet smacked…)
- **Pizza counter** between waves: spend tips to add a pizza to the table for the run, swap out a destroyed one, or rent a locked "Chef's Special". Beating your first boss of a run also brings a bonus pizza to a small table
- **12 hand-painted locations**: six pizzerias (one every 5 waves) and a unique arena per boss, each with its own lighting, ambient particles, music and ambience
- **Pizzapedia** collection of every foot you've smacked
- Full audio: 11 music tracks, 6 location ambiences, 23 SFX, with Master / Music / SFX / Ambience volume, mute, screen shake, damage numbers, flashes and FPS toggles

All art (feet, pizzas, toppings, backdrops, UI sprites) is drawn procedurally with Canvas 2D at load time, so there are no image assets to download and everything stays sharp at any resolution.

## Controls

| Action | Mouse / touch | Keyboard |
|---|---|---|
| Smack a foot | Click / tap it | — |
| Peel Slam (screen-wide smack when charged) | Tap the SLAM button | `Space` |
| Pause | Pause button | `Esc` / `P` |
| Mute | Speaker button | `M` |
| Pick an upgrade / reroll | Click a card / Reroll | `1`–`4` / `R` |

## Play / develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build into dist/
npm run preview  # serve the production build
```

Requires Node 20+.

## Hosting

Every push to `main` deploys to GitHub Pages through `.github/workflows/pages.yml`.

`dist/` is a plain static folder with relative paths, so it can also go anywhere else:

- **Netlify**: `netlify.toml` is already set up (build `npm run build`, publish `dist`, plus long-cache headers for assets and audio, which GitHub Pages can't set). Import the repo in Netlify, or run `npx netlify-cli deploy --build --prod`.
- **itch.io**: zip the *contents* of `dist/`, upload it as an HTML game, and tick "Mobile friendly".
- **Vercel / Cloudflare Pages**: build command `npm run build`, publish directory `dist`.

## Stack choice

| Option | Verdict |
|---|---|
| **Phaser 3.90 + Vite + TypeScript** ✅ | Mature 2D engine: WebGL batching, particles, tweens, cameras, a Web Audio sound manager, scale manager. Vite gives instant dev reloads and an optimised static build that suits Netlify. 3.90 is the final, battle-tested v3 release. |
| Phaser 4 | Newer renderer, but a younger API with breaking changes. No benefit for a 2D sprite game. |
| PixiJS + Howler | Great renderer, but you'd hand-roll scenes, tweens, input and audio categories. |
| Three.js / Babylon | 3D engines, overkill for a 2D arcade game. |
| React/Canvas from scratch | Maximum control, but slower to reach this level of polish. |

UI (HUD, menus, upgrade cards, settings) is a DOM overlay scaled with CSS container-query units, which gives crisp text, real range sliders and accessibility for free while Phaser renders the game.

## Project layout

```
src/
  art/        procedural Canvas2D art: feet, pizzas, toppings, backdrops, sprites
  data/       feet, pizzas, upgrades, meta upgrades (all the content tables)
  game/       Foot, Pizza, Run (stats + wave planning), Fx, BackdropView, assets
  scenes/     Boot (generation + loading), Menu, Game
  systems/    audio (category volumes, crossfades, lazy loading), save (localStorage)
  ui/         DOM overlay: HUD, menus, modals
public/audio/ music, ambience and SFX (+ CREDITS.md / credits.json)
```

## Dev tools

`npm run dev` exposes a `F` helper in the browser console (development builds only):

- `F.contrast()` audits every visible piece of overlay text for WCAG contrast (4.5:1, or 3:1 for large text). It reads the real background behind each element, including every gradient stop, and flags text drawn over the game without an outline. Run it on each screen after UI changes.
- `F.trailer()` renders the trailer: it steps the real game frame by frame at 60 fps on a virtual clock (with a scripted shot list in `src/trailer.ts`), uploads each frame, and logs every sound effect with its frame time. The soundtrack is then mixed in sync with ffmpeg. Start the dev server with `FEETZA_SHOT_DIR=<dir>` to receive the frames. Nothing plays through the speakers while it renders.
- `F.bot(true, accuracy, reactionMs)` plays the game automatically (useful for balance checks), and `F.shot(name)` saves a canvas screenshot when the server is started with `FEETZA_SHOT_DIR`.

## Audio mix

- Music and ambience are loudness-normalised to about -16 LUFS. Ambience is mixed about 8 dB under music.
- SFX gains are calibrated from measured 50 ms RMS peaks so slaps, crits, stomps and UI sounds sit at deliberate relative levels (see `TRIM` in `src/systems/audio.ts`). Slaps round-robin through three recordings with pitch variation.
- Loops are made gapless at runtime by trimming MP3 encoder padding from the decoded buffer.
- Larger tracks stream in lazily, and the next location's and boss's tracks are preloaded one wave ahead.

## Credits

Music by Kevin MacLeod (incompetech.com), licensed CC-BY 4.0. SFX and ambiences are CC0 from Kenney.nl and Freesound contributors. Full per-file credits are in [`public/audio/CREDITS.md`](public/audio/CREDITS.md) and in-game under **Credits**. Fonts: Lilita One and Fredoka (SIL OFL).
