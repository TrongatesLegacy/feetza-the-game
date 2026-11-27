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
import { ui } from './ui/ui';

// Dev-only: the art prebuild's page (scripts/prebuild/run.mjs) runs the painters on a game of its own
const prebuild = import.meta.env.DEV && new URLSearchParams(location.search).has('prebuild');
if (prebuild) void import('./devPrebuild').then((m) => m.runPrebuild());
else startGame();

function startGame(): void {
  ui.init();
  applyA11y();
  pad.init();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
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
