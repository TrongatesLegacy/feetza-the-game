// Dev-only tooling (tree-shaken out of production builds): screenshots + a simple auto-player.
import type Phaser from 'phaser';

type AnyScene = Phaser.Scene & Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function installDevTools(game: Phaser.Game): void {
  let botOn = false;
  const api = {
    game,
    scene: (k: string) => game.scene.getScene(k) as AnyScene,
    /** Save a screenshot of the game canvas (no DOM) to the dev shot folder. */
    shot(name = 'shot'): Promise<string> {
      return new Promise((resolve) => {
        game.renderer.snapshot((img) => {
          const src = (img as HTMLImageElement).src;
          fetch(`/__shot?name=${encodeURIComponent(name)}`, { method: 'POST', body: src }).then(() => resolve(name));
        });
      });
    },
    async boot(): Promise<void> {
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      for (let i = 0; i < 80 && !document.querySelector('.splash-hint'); i++) await sleep(150);
      document.querySelector('.screen')?.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      await sleep(800);
    },
    startGame(lineup?: string[]): void {
      document.querySelectorAll('.screen').forEach((e) => e.remove());
      game.scene.getScenes(true).forEach((s) => s.scene.stop());
      game.scene.start('Game', { lineup });
    },
    bot(on = true, accuracy = 0.9, rate = 260): void {
      botOn = on;
      const loop = () => {
        if (!botOn) return;
        const g = game.scene.getScene('Game') as AnyScene;
        if (g && game.scene.isActive('Game') && g.feet) {
          const t = g.feet.filter((f: any) => f.hittable).sort((a: any, b: any) => b.y - a.y)[0]; // eslint-disable-line @typescript-eslint/no-explicit-any
          if (t && Math.random() < accuracy) {
            g.pointer.x = t.cx;
            g.pointer.y = t.cy;
            g.smack(t.cx, t.cy);
          }
          const card = document.querySelector('.card') as HTMLElement | null;
          if (card && g.inUpgrade) card.click();
        }
        setTimeout(loop, rate);
      };
      loop();
    },
  };
  (window as unknown as { F: typeof api }).F = api;
}
