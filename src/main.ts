import '@fontsource/lilita-one/latin-400.css';
import '@fontsource/fredoka/latin-400.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import './style.css';
import Phaser from 'phaser';
import { H, W } from './config';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';
import { setGame } from './game/assets';
import { pad } from './systems/gamepad';
import { applyA11y } from './ui/a11y';
import { previewCard, ui } from './ui/ui';
import { installTips, setTipCards } from './ui/tips';

/** The balance sim (?sim) always draws with Phaser's canvas renderer. With AUTO a sim page got WebGL only while the
 *  browser would give it a context: with two worker tabs and a fresh page every run, contexts ran out part way
 *  through a table, and later pages fell back to the canvas renderer. Some looks are made only under WebGL (the
 *  zombie wipe's bands of light: each tile sprite made draws cosmetic numbers for its key), and cosmetic numbers can
 *  reach play, so a seeded run depended on how many pages the browser had opened before it. The sim shows nothing
 *  anyway: the canvas renderer is always there, and uses no GPU. */
const SIM = import.meta.env.DEV && new URLSearchParams(location.search).has('sim');

// Dev-only: the art prebuild's page (scripts/prebuild/run.mjs) runs the painters on a game of its own
if (import.meta.env.DEV && new URLSearchParams(location.search).has('prebuild')) void import('./devPrebuild').then((m) => m.runPrebuild());
else startGame();

function startGame(): void {
  ui.init();
  installTips();
  setTipCards(previewCard);
  applyA11y();
  pad.init();

  const game = new Phaser.Game({
    type: SIM ? Phaser.CANVAS : Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: '#120a06',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
      roundPixels: false,
      powerPreference: 'high-performance',
    },
    audio: { disableWebAudio: false },
    input: { activePointers: 3 },
    fps: { target: 60, smoothStep: true },
    scene: [BootScene, MenuScene, GameScene],
  });

  setGame(game);

  // Development-only helpers for debugging and automated visual review.
  if (import.meta.env.DEV) {
    void import('./dev').then((m) => m.installDevTools(game));
  }
}
