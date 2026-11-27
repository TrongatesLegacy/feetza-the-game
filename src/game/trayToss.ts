// A waiter's silver tray flung at a pizza: Waiter Walt's when it's knocked off him (src/game/acts/trattoria.ts), the
// Head Waiter's toss (src/game/bosses/act1a.ts). The tray is the shield piece itself (its picture as dented as it was:
// guardShield.ts GuardSnap). It hangs at his side a moment (the tell: a red reticle and its shadow on the pizza), then
// tumbles down to it, face over underside, its shadow growing. Smack it to bat it back at him (a chunk of damage, a
// short stun), or it clangs down on the pizza for a slice or more.
//
// It runs on the scene's clock (it pauses with the game). Cosmetic randomness uses crand().

import Phaser from 'phaser';
import type { Arena } from './arena';
import type { Foot } from './Foot';
import type { GuardSnap } from './guardShield';
import type { Pizza } from './Pizza';
import { mark } from './bosses/kit';
import { crand } from '../systems/cosmeticRandom';

export interface TrayToss {
  /** Seconds it hangs at his side first (the tell), then its flight down to the pizza. */
  tell: number;
  flight: number;
  /** What it does him if it's batted back (damage, seconds stunned), and slices it takes if it lands. */
  bat: number;
  stun: number;
  slices: number;
  /** Its size against the shield piece's (it grows a little as it comes down towards the table's front). */
  grow?: number;
  /** Sounds: thrown, batted, landed. */
  sfx?: { toss?: string; bat?: string; land?: string };
  /** The shout as he throws it (none for a quiet one). */
  shout?: string;
  /** It's over: batted back into him (true) or landed or gone (false). */
  done?(batted: boolean): void;
}

export interface Flying {
  /** In the air (the tell included). */
  live(): boolean;
  /** Take it away now (the fight or the wave ended). */
  cancel(): void;
}

/** Fling the tray in `snap` from foot `f` at pizza `p`. */
export function tossTray(a: Arena, f: Foot, snap: GuardSnap, p: Pizza, o: TrayToss): Flying {
  const sc = a.sc;
  const img = sc.add.image(snap.x, snap.y, snap.key).setScale(snap.scale).setRotation(snap.rot);
  a.fxLayer.add(img);
  const shadow = sc.add.ellipse(p.x, p.surfaceY - 10, p.radius * 1.4, p.radius * 0.42, 0x1a0e08, 0).setScale(0.35);
  a.fxLayer.add(shadow);
  // shadow and reticle sit under the tray
  a.fxLayer.moveDown(shadow);
  const reticle = mark(a, 'p_reticle', p.x, p.surfaceY - 30, o.tell + o.flight + 0.3, 0.95);
  // (during the tell it slips straight down off him: see the tell below)
  const sx0 = snap.x - f.x;
  const sy0 = snap.y - f.y;
  let t = 0;
  let spin = 0;
  let back = false;
  let over = false;
  let from = { x: snap.x, y: snap.y };
  const grow = o.grow ?? 1.15;
  const finish = (batted: boolean) => {
    if (over) return;
    over = true;
    tick.remove();
    f.leanExtra = 0;
    reticle.destroy();
    sc.tweens.add({ targets: shadow, alpha: 0, duration: 200, onComplete: () => shadow.destroy() });
    o.done?.(batted);
  };
  /** It clatters off what it hit, spinning away, and fades. */
  const clatter = () => {
    const dir = crand() < 0.5 ? -1 : 1;
    sc.tweens.add({ targets: img, x: img.x + dir * 200, y: img.y - 150, angle: img.angle + dir * 300, duration: 420, ease: 'Quad.Out' });
    sc.tweens.add({ targets: img, scaleY: img.scaleX * 0.2, duration: 120, yoyo: true, repeat: 1 });
    sc.tweens.add({ targets: img, alpha: 0, delay: 220, duration: 260, onComplete: () => img.destroy() });
  };
  const fade = () => sc.tweens.add({ targets: img, alpha: 0, scale: img.scaleX * 0.6, duration: 220, onComplete: () => img.destroy() });
  const tick = sc.time.addEvent({
    delay: 16,
    loop: true,
    callback: () => {
      // (the frame's real time, so a tray flies as fast at 30 fps as at 120)
      const dt = Math.min(0.05, (sc.game.loop.delta / 1000) * sc.time.timeScale);
      if (over) return;
      if (!a.inWave()) {
        finish(false);
        fade();
        return;
      }
      t += dt;
      if (back) {
        // it spins back up into him, fast, and clangs off
        spin += dt * 16;
        img.scaleY = img.scaleX * (0.16 + 0.6 * Math.abs(Math.cos(spin)));
        img.setTexture(Math.cos(spin) >= 0 ? snap.key : snap.back);
        img.rotation += dt * 6;
        if (!f.alive) {
          // he's gone: it sails on off the top
          img.y -= 900 * dt;
          if (img.y < -200) {
            finish(false);
            img.destroy();
          }
          return;
        }
        img.x += (f.x - img.x) * Math.min(1, dt * 7);
        img.y += (f.cy - img.y) * Math.min(1, dt * 7);
        if (Math.hypot(f.x - img.x, f.cy - img.y) < 60) {
          a.fx.impact(img.x, img.y, true);
          a.sfx('sfx_crit');
          a.shake(120, 0.005);
          finish(true);
          clatter();
          a.damageFoot(f, o.bat, 'RETURN TO SENDER!');
          if (o.stun > 0 && f.alive) f.stun(o.stun);
        }
        return;
      }
      if (t < o.tell) {
        // he went down before he could throw it: it clatters away
        if (!f.alive) {
          finish(false);
          clatter();
          return;
        }
        // the tell: knocked loose, it slips straight down off him a little and teeters there, wobbling harder, before it
        // drops (no swing out to the side first)
        const k = t / o.tell;
        const e = Phaser.Math.Easing.Back.Out(Math.min(1, k * 1.4));
        const slip = f.meta.footHeight * f.scale * 0.12;
        img.setPosition(f.x + sx0, f.y + sy0 + slip * e);
        img.rotation = snap.rot + Math.sin(t * 22) * (0.04 + 0.1 * k);
        f.leanExtra = 0;
        shadow.setAlpha(0.08 + 0.12 * k).setScale(0.35);
        from = { x: img.x, y: img.y };
        if (t + dt >= o.tell) {
          f.leanExtra = 0;
          // it's off: the shout goes up from the tray
          a.sfx(o.sfx?.toss ?? 'sfx_whoosh', { volume: 0.7, rate: 1.1 });
          if (o.shout) a.quip(img.x, Math.max(200, img.y - 90), o.shout, '#ffffff', 40);
        }
        return;
      }
      // the flight: down the lane to the pizza, tumbling face over underside
      const k = Math.min(1, (t - o.tell) / o.flight);
      spin += dt * 6;
      const c = Math.cos(spin);
      const s = snap.scale * (1 + (grow - 1) * k);
      img.setScale(s, s * (0.14 + 0.66 * Math.abs(c)));
      img.setTexture(c >= 0 ? snap.key : snap.back);
      img.rotation = Math.sin(spin * 0.5) * 0.22;
      const ty = p.surfaceY - 30;
      img.x = from.x + (p.x - from.x) * k;
      img.y = from.y + (ty - from.y) * k - Math.sin(k * Math.PI) * 60;
      shadow.setPosition(p.x, p.surfaceY - 10).setScale(0.35 + 0.65 * k).setAlpha(0.1 + 0.35 * k);
      if (k >= 1) {
        a.fx.impact(img.x, img.y, false);
        a.sfx(o.sfx?.land ?? 'sfx_trayclatter');
        // (the room hears it: the Trattoria's oven flares and its lamps swing, src/content/art/scene-trattoria.ts)
        sc.events.emit('tray-clang', img.x, img.y, 1);
        finish(false);
        clatter();
        if (!p.dead) a.hitPizza(p, o.slices, 'TRAYED!');
      }
    },
  });
  a.addClickable({
    get x() {
      return img.x;
    },
    get y() {
      return img.y;
    },
    r: Math.max(80, 110 * snap.scale),
    priority: 2,
    label: 'tray',
    contains: (x, y) => Math.abs(x - img.x) < Math.max(90, img.displayWidth * 0.6) && Math.abs(y - img.y) < Math.max(70, img.displayWidth * 0.35),
    alive: () => !over && !back,
    hit: () => {
      if (over || back) return;
      back = true;
      reticle.destroy();
      sc.tweens.add({ targets: shadow, alpha: 0, duration: 200 });
      // a green flash: it's yours now
      img.setTintFill(0x9dffb0);
      sc.time.delayedCall(90, () => img.active && img.clearTint());
      a.fx.impact(img.x, img.y, true);
      a.sfx(o.sfx?.bat ?? 'sfx_hitclang');
      sc.events.emit('tray-clang', img.x, img.y, 0.6);
      a.quip(img.x, img.y - 70, 'BATTED!', '#7dff9a', 38);
    },
  });
  return {
    live: () => !over,
    cancel: () => {
      if (over) return;
      finish(false);
      fade();
    },
  };
}

/** A tray with nowhere to go (no pizza, the wave over): it spins up and away whole, tumbling, and drops off. */
export function spinAway(a: Arena, snap: GuardSnap, dir: number): void {
  const sc = a.sc;
  const img = sc.add.image(snap.x, snap.y, snap.key).setScale(snap.scale).setRotation(snap.rot);
  a.fxLayer.add(img);
  const vx = dir * (240 + crand() * 160);
  const vy = -620 - crand() * 160;
  const life = 1.3;
  sc.tweens.addCounter({
    from: 0,
    to: life,
    duration: life * 1000,
    onUpdate: (tw) => {
      const t = tw.getValue() ?? 0;
      const c = Math.cos(t * 14);
      img.setPosition(snap.x + vx * t, snap.y + vy * t + 0.5 * 1700 * t * t);
      img.setTexture(c >= 0 ? snap.key : snap.back);
      img.setScale(snap.scale, snap.scale * (0.12 + 0.88 * Math.abs(c)));
      img.setRotation(snap.rot + dir * t * 5);
      img.setAlpha(Math.min(1, ((life - t) / life) * 3));
    },
    onComplete: () => img.destroy(),
  });
}
