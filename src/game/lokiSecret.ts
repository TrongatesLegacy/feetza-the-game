// Loki's secret (src/content/peels/gods.ts): now and then a shadowy horned figure peeks out from behind the
// chalkboard on the title screen's backdrop (The Trattoria's board, top right). Smack him before he ducks back
// and Loki's peel unlocks. He only turns up while that peel is still locked.

import Phaser from 'phaser';
import { audio } from '../systems/audio';
import { bumpGoal, openSecrets } from './heroGoals';
import { checkPeelAchievements } from './peels';

/** The chalkboard on the Trattoria backdrop (src/art/backdrops.ts, TR.board). */
const BOARD = { x: 1478, y: 196, w: 360, h: 360 };

export function lokiPeek(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, found: () => void): void {
  if (!openSecrets().includes('loki') || !scene.textures.exists('g_loki')) return;
  const img = scene.add.image(BOARD.x + 70, BOARD.y + BOARD.h * 0.55, 'g_loki').setScale(0.5).setAngle(-12);
  layer.add(img);
  // only what's left of the board's edge shows: he's behind it
  const shape = scene.make.graphics({}, false);
  shape.fillRect(0, 0, BOARD.x, scene.scale.height);
  img.setMask(shape.createGeometryMask());
  let out = false;
  let caught = false;
  const peek = () => {
    if (caught || !img.active) return;
    out = true;
    const y = BOARD.y + 90 + Math.random() * (BOARD.h - 160);
    img.setY(y).setX(BOARD.x + 70);
    scene.tweens.add({
      targets: img,
      x: BOARD.x - 26,
      angle: -16,
      duration: 380,
      ease: 'Back.Out',
      onComplete: () => {
        // a sly look either way, then he ducks back
        scene.tweens.add({ targets: img, angle: -6, duration: 300, yoyo: true, repeat: 1 });
        scene.time.delayedCall(1900, () => {
          if (caught || !img.active) return;
          scene.tweens.add({ targets: img, x: BOARD.x + 70, duration: 260, ease: 'Quad.In', onComplete: () => (out = false) });
        });
      },
    });
    scene.time.delayedCall(9000 + Math.random() * 14000, peek);
  };
  scene.time.delayedCall(4000 + Math.random() * 8000, peek);
  img.setInteractive({ useHandCursor: false });
  img.on('pointerdown', () => {
    if (!out || caught) return;
    caught = true;
    scene.tweens.killTweensOf(img);
    audio.sfx('sfx_hero_secret');
    audio.sfx('sfx_slap_1', { volume: 0.8 });
    scene.cameras.main.shake(160, 0.004);
    const t = scene.add.text(BOARD.x - 40, img.y - 90, 'CAUGHT YOU, LOKI!', { fontFamily: '"Lilita One", sans-serif', fontSize: '44px', color: '#b8ff8a', stroke: '#2a1810', strokeThickness: 10 }).setOrigin(1, 0.5);
    layer.add(t);
    scene.tweens.add({ targets: t, y: t.y - 50, alpha: 0, delay: 1400, duration: 500, onComplete: () => t.destroy() });
    scene.tweens.add({ targets: img, x: BOARD.x + 90, angle: 30, alpha: 0, duration: 320, onComplete: () => img.destroy() });
    bumpGoal('secret:loki');
    if (checkPeelAchievements().length) found();
  });
}
