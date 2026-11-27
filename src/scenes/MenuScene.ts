import { immortalLive } from '../game/footLive';
import { liveDefOf, liveWarm, styleLive, warmLive } from '../game/liveKit';
import Phaser from 'phaser';
import { H, PIZZA_Y, W } from '../config';
import { HEAT_BY_ID } from '../data/difficulty';
import { FEET, FOOT_BY_ID } from '../data/feet';
import { PIZZA_BY_ID } from '../data/pizzas';
import { BackdropView } from '../game/BackdropView';
import { Foot } from '../game/Foot';
import { warmFootArt } from '../game/assets';
import { Fx } from '../game/Fx';
import { Pizza } from '../game/Pizza';
import { backdropFor, endCrustsFor } from '../game/Run';
import { preparePacked } from '../game/liveBackdrop';
import { audio } from '../systems/audio';
import { freshStart, persist, save } from '../systems/save';
import { ui } from '../ui/ui';
import { lokiPeek } from '../game/lokiSecret';
import { lookPeel } from '../game/peels';
import { preloadSmack } from '../game/smacks';

export function randomLineup(n: number): string[] {
  const pool = [...save.unlockedPizzas];
  const out: string[] = [];
  while (out.length < n) {
    if (!pool.length) pool.push(...save.unlockedPizzas);
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

/** The title screen's demo foot is picked a foot ahead, so its art can be drawn before it comes on (boot draws the
 * first one). */
let nextDemo: string | null = null;

function pickDemoFoot(): string {
  const ok = (f: (typeof FEET)[number]) => !f.boss && !f.mini && !f.traits.includes('flee') && !f.traits.includes('invisible') && !f.traits.includes('bury');
  const pool = save.seenFeet.length ? FEET.filter((f) => save.seenFeet.includes(f.id) && ok(f)) : FEET.filter((f) => f.minWave <= 2 && f.weight > 0);
  return Phaser.Utils.Array.GetRandom(pool.length ? pool : FEET.slice(0, 3)).id;
}

/** The next demo foot (picked now if it isn't yet). */
export function peekDemoFoot(): string {
  return (nextDemo ??= pickDemoFoot());
}

/** The title screen's pizzas, picked ahead the same way (boot makes them). */
let nextLineup: string[] | null = null;
export function peekMenuLineup(): string[] {
  return (nextLineup ??= randomLineup(3));
}
function takeMenuLineup(): string[] {
  const ids = peekMenuLineup();
  nextLineup = null;
  return ids;
}

function takeDemoFoot(): string {
  const id = peekDemoFoot();
  nextDemo = null;
  return id;
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
    // a Pizza Legend's table is the First Pizzeria's (Act 10's ending)
    this.backdrop.show(save.legend ? 'firstpizzeria' : 'trattoria');
    this.fx = new Fx(this, fxLayer);
    // Loki's secret: he sometimes peeks out from behind the chalkboard (the Trattoria's)
    if (!save.legend) lokiPeek(this, fxLayer, () => this.showMenu());
    const ids = takeMenuLineup();
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
    // and the cursor look's smack (the title screen has a foot to smack)
    preloadSmack(this, lookPeel().id);
    ui.setPlaying(false);
    ui.showHud(false);
    this.showMenu();
    this.cameras.main.fadeIn(500, 18, 10, 6);
  }

  private showMenu(): void {
    ui.closeAll();
    // veterans coming from the old version get a one-time welcome card first
    if (save.welcomePending) {
      ui.welcome({
        keep: () => {
          save.welcomePending = false;
          persist();
          this.showMenu();
        },
        fresh: () => {
          freshStart();
          save.welcomePending = false;
          persist();
          this.showMenu();
        },
      });
      return;
    }
    this.menuEl = ui.menu({
      play: () => {
        if (save.run) {
          // starting a new run abandons the saved one: ask first
          const r = save.run;
          const owed = endCrustsFor(r.score, r.wave, r.act2Start, r.heat);
          ui.confirm('END YOUR SAVED RUN?', `Wave ${r.wave} on ${HEAT_BY_ID[r.heat].name}. Starting a new run ends it${owed ? `: you keep the ${owed} Golden Crusts it earned` : ''}.`, 'NEW RUN', () => {
            // an abandoned run still pays what it earned (bosses were already banked)
            save.crusts += owed;
            save.run = null;
            persist();
            this.lineup(randomLineup(save.meta.table ? 4 : 3));
          }, () => this.showMenu());
          return;
        }
        this.lineup(randomLineup(save.meta.table ? 4 : 3));
      },
      resume: save.run
        ? () => {
            const snapshot = save.run!;
            ui.closeAll();
            this.cameras.main.fadeOut(400, 18, 10, 6);
            // the saved wave's backdrop from its pre-built pack, while the screen fades (a few seconds at most)
            const bd = preparePacked(this, backdropFor(snapshot.wave), 5000);
            this.cameras.main.once('camerafadeoutcomplete', () => void bd.then(() => this.scene.start('Game', { snapshot })));
          }
        : null,
      pizzeria: () => {
        ui.close(this.menuEl!);
        ui.pizzeria(() => this.showMenu());
      },
      pedia: () => {
        ui.close(this.menuEl!);
        ui.pedia(() => this.showMenu());
      },
      locker: () => {
        ui.close(this.menuEl!);
        ui.locker(() => this.showMenu());
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

  private lastLineup: string[] | null = null;

  private lineup(ids: string[]): void {
    this.lastLineup = ids;
    ui.closeAll();
    ui.lineup(
      ids,
      () => {
        // never the same three again (unless that's all you own)
        const key = (l: string[]) => [...l].sort().join();
        const was = key(this.lastLineup ?? ids);
        let next = randomLineup(ids.length);
        for (let i = 0; i < 8 && key(next) === was && save.unlockedPizzas.length > ids.length; i++) next = randomLineup(ids.length);
        this.lastLineup = next;
        return next;
      },
      (heat, endless, lineup) => {
        ui.closeAll();
        audio.sfx('sfx_levelup', { volume: 0.7 });
        this.cameras.main.fadeOut(400, 18, 10, 6);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game', { lineup, heat, endless, endlessPlus: endless && save.endlessPlus && save.endlessPlusPick }));
      },
      () => this.showMenu(),
    );
  }

  private spawnFoot(): void {
    const type = FOOT_BY_ID[takeDemoFoot()];
    // the one after it is drawn in idle time while this one plays
    warmFootArt([peekDemoFoot()]);
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
    // its live art (built in idle time; update() starts it once ready, while it's still coming down)
    warmLive(this, [type.id], FOOT_BY_ID);
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
      // alive like in play: the redrawn feet's live layer, the Immortals' smoke
      const id = this.foot.type.id;
      if (id === 'immortal') immortalLive(this.foot, dt);
      else if (liveWarm(this, id) || !liveDefOf(id)) styleLive(this.foot, dt);
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
