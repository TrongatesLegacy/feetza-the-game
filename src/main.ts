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
import { ui } from './ui/ui';

ui.init();

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

// Development-only helpers for debugging and automated visual review.
if (import.meta.env.DEV) {
  void import('./dev').then((m) => m.installDevTools(game));
}
