import Phaser from 'phaser';
import { FEET } from '../data/feet';
import { BOSS_MINION, WAVES_PER_STAGE } from '../data/stages';
import { generateAll, warmLaterArt } from '../game/assets';
import { bossFor, isMiniWave, miniFor } from '../game/Run';
import { save } from '../systems/save';
import { peekDemoFoot, peekMenuLineup } from './MenuScene';
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
    // the title screen's art (its demo foot and pizzas among it). The first stage's feet and the pizzas you own are
    // drawn from here on in idle time (a run's later feet are warmed as it goes: GameScene.warmFeet)
    await generateAll(this, (p, label) => bar.set(0.35 + p * 0.65, label), [peekDemoFoot()], peekMenuLineup());
    bar.done();
    ui.splash(() => {
      this.scene.start('Menu');
    });
    const boss = bossFor(WAVES_PER_STAGE);
    const stage1 = [...FEET.filter((f) => !f.boss && !f.mini && f.weight > 0 && f.minWave <= WAVES_PER_STAGE).map((f) => f.id), boss, ...(BOSS_MINION[boss] ? [BOSS_MINION[boss]] : [])];
    for (let w = 1; w <= WAVES_PER_STAGE; w++) if (isMiniWave(w)) stage1.push(miniFor(w));
    warmLaterArt(stage1, save.unlockedPizzas);
  }
}
