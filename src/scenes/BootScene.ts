import Phaser from 'phaser';
import { generateAll } from '../game/assets';
import { BOOT_AUDIO, audio } from '../systems/audio';
import { ui } from '../ui/ui';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    const bar = ui.loading();
    this.registry.set('loadingBar', bar);
    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => bar.set(p * 0.35, 'Tuning the jukebox…'));
    for (const key of BOOT_AUDIO) this.load.audio(key, `audio/${key}.mp3`);
  }

  async create(): Promise<void> {
    const bar = this.registry.get('loadingBar') as ReturnType<typeof ui.loading>;
    audio.init(this.game);
    try {
      await Promise.race([
        Promise.all([document.fonts.load('40px "Lilita One"'), document.fonts.load('600 20px "Fredoka"'), document.fonts.load('400 20px "Fredoka"')]),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    } catch {
      /* fonts are a nicety */
    }
    await generateAll(this, (p, label) => bar.set(0.35 + p * 0.65, label));
    bar.done();
    ui.splash(() => {
      this.scene.start('Menu');
    });
  }
}
