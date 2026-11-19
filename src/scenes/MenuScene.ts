import Phaser from 'phaser';
import { H, PIZZA_Y, W } from '../config';
import { FEET } from '../data/feet';
import { PIZZA_BY_ID } from '../data/pizzas';
import { BackdropView } from '../game/BackdropView';
import { Foot } from '../game/Foot';
import { Fx } from '../game/Fx';
import { Pizza } from '../game/Pizza';
import { audio } from '../systems/audio';
import { save } from '../systems/save';
import { ui } from '../ui/ui';

export function randomLineup(n: number): string[] {
  const pool = [...save.unlockedPizzas];
  const out: string[] = [];
  while (out.length < n) {
    if (!pool.length) pool.push(...save.unlockedPizzas);
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

export class MenuScene extends Phaser.Scene {
  private backdrop!: BackdropView;
  private pizzas: Pizza[] = [];
  private foot: Foot | null = null;
  private fx!: Fx;
  private feetLayer!: Phaser.GameObjects.Container;
  private shadowLayer!: Phaser.GameObjects.Container;
  private hits = 0;
  private menuEl: HTMLElement | null = null;

  constructor() {
    super('Menu');
  }

  create(): void {
    this.pizzas = [];
    this.foot = null;
    const bg = this.add.container(0, 0);
    const ambient = this.add.container(0, 0);
    const pz = this.add.container(0, 0);
    this.shadowLayer = this.add.container(0, 0);
    this.feetLayer = this.add.container(0, 0);
    const fxLayer = this.add.container(0, 0);
    this.add.image(W / 2, H / 2, 'vignette').setDisplaySize(W, H);
    this.backdrop = new BackdropView(this, bg, ambient);
    this.backdrop.show('trattoria');
    this.fx = new Fx(this, fxLayer);
    const ids = randomLineup(3);
    ids.forEach((id, i) => {
      this.pizzas.push(new Pizza(this, pz, PIZZA_BY_ID[id], W / 2 + (i - 1) * 560, PIZZA_Y + 20, 0.78, 8).hideLabel());
    });
    this.spawnFoot();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.smack(p.worldX, p.worldY));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const p of this.pizzas) p.destroy();
      this.pizzas = [];
    });
    audio.music(this, ['music_menu']);
    audio.ambience(this, ['ambience_pizzeria']);
    audio.duck(1);
    // warm the gameplay tracks while the player browses the menu
    audio.preload(this, ['music_game', 'ambience_pizzeria']);
    ui.setPlaying(false);
    ui.showHud(false);
    this.showMenu();
    this.cameras.main.fadeIn(500, 18, 10, 6);
  }

  private showMenu(): void {
    ui.closeAll();
    this.menuEl = ui.menu({
      play: () => this.lineup(randomLineup(save.meta.table ? 4 : 3)),
      pizzeria: () => {
        ui.close(this.menuEl!);
        ui.pizzeria(() => this.showMenu());
      },
      pedia: () => {
        ui.close(this.menuEl!);
        ui.pedia(() => this.showMenu());
      },
      settings: () => {
        ui.close(this.menuEl!);
        ui.settings(() => this.showMenu());
      },
      credits: () => {
        ui.close(this.menuEl!);
        ui.credits(() => this.showMenu());
      },
    });
  }

  private lineup(ids: string[]): void {
    ui.closeAll();
    ui.lineup(
      ids,
      () => this.lineup(randomLineup(ids.length)),
      () => {
        ui.closeAll();
        audio.sfx('sfx_levelup', { volume: 0.7 });
        this.cameras.main.fadeOut(400, 18, 10, 6);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game', { lineup: ids }));
      },
      () => this.showMenu(),
    );
  }

  private spawnFoot(): void {
    const ok = (f: (typeof FEET)[number]) => !f.boss && !f.traits.includes('flee');
    const pool = save.seenFeet.length ? FEET.filter((f) => save.seenFeet.includes(f.id) && ok(f)) : FEET.filter((f) => f.minWave <= 2 && f.weight > 0);
    const type = Phaser.Utils.Array.GetRandom(pool.length ? pool : FEET.slice(0, 3));
    const target = this.sidePizza();
    this.hits = 0;
    this.foot = new Foot(this, this.feetLayer, this.shadowLayer, type, target.x, {
      hpMult: 1,
      speedMult: 0.45,
      elite: false,
      hooks: {
        onStomp: (f) => {
          audio.sfx('sfx_squish', { volume: 0.6 });
          this.fx.splat(f.x, f.stompY, false);
          f.target?.hurt();
        },
        pickTarget: () => this.sidePizza(),
        onEscape: () => this.time.delayedCall(1200, () => this.spawnFoot()),
      },
    });
    this.foot.target = target;
    this.foot.hoverTime = 2.5;
  }

  /** The demo foot works the outer pizzas so it isn't hidden behind the logo. */
  private sidePizza(): Pizza {
    return Math.random() < 0.5 ? this.pizzas[0] : this.pizzas[this.pizzas.length - 1];
  }

  private smack(x: number, y: number): void {
    const f = this.foot;
    if (!f || !f.hittable || f.distanceTo(x, y) > 30) return;
    this.hits++;
    audio.slap(0.8);
    this.fx.impact(x, y, this.hits >= 3);
    f.flash();
    f.knock(420);
    if (this.hits >= 3) {
      audio.sfx('sfx_ouch');
      this.fx.quip(f.x, f.cy - 80, 'OUCH!', '#ffd23f', 52);
      f.die();
      this.time.delayedCall(1600, () => this.spawnFoot());
    }
  }

  update(_t: number, dms: number): void {
    const dt = Math.min(0.05, dms / 1000);
    this.backdrop.update(dt);
    if (this.foot && this.foot.alive) {
      this.foot.update(dt, 1);
      // keep the menu foot from ever finishing pizzas
      if (this.foot.state === 'stomp' && this.foot.stateT > 0.3) this.foot.knock(300);
    }
    for (const p of this.pizzas) {
      const f = this.foot;
      const threat = f && f.alive && f.target === p ? Phaser.Math.Clamp((f.y - 300) / 520, 0, 1) : 0;
      p.update(dt, f && f.alive ? f.x : null, threat);
    }
  }
}
