// Boss brains, Stages 1–3: headwaiter, bigfoot, sweep, ironheel, sandcastle, clownking.
// Shared helpers and the heat scaling live in ./kit.ts; the helpers below are only used by these six.

import Phaser from 'phaser';
import { HOVER_Y, W } from '../../config';
import { FOOT_BY_ID } from '../../data/feet';
import type { Arena } from '../arena';
import type { Foot } from '../Foot';
import type { Pizza } from '../Pizza';
import { type Brain, type Prop, Every, auraFor, heat, hitProp, hitWindup, laneOf, mark, rnd, shield, takeLane, twin, windup } from './kit';

/** King Honk and his decoys during a shuffle, relative to his full size. */
const SHUFFLE_SIZE = 0.62;

// ——— Lane hold: the boss claims a lane and is moved by hand, so a move can lower, shake or slam it ———

interface Hold {
  p: Pizza;
  /** Contact y the boss eases to (a miss can lower it). */
  y: number;
  /** Shake strength in px. */
  shake: number;
  arrived(): boolean;
  /** Call every frame from the brain's update (it runs after the feet have drawn, so the shake shows). */
  tick(dt: number): void;
  /** Give the lane back: the boss hovers again, or lifts off after a slam. */
  release(to?: 'hover' | 'lift'): void;
  live(): boolean;
}

/** takeLane, then puppet the boss: it eases over the pizza at height `y` and doesn't dive until released.
 * (The kit's pinned hold sits it under the boss bar, and a pinned foot can't be lowered.) */
function hold(a: Arena, f: Foot, p: Pizza | null | undefined, y = HOVER_Y): Hold | null {
  const t = takeLane(a, f, p);
  if (!t) return null;
  f.pinned = false;
  f.puppet = true;
  f.vy = 0;
  if (f.state !== 'hover') f.setState('hover');
  // feet diving in the lane back off (now and while it's held), so the boss really has it to itself
  const clearLane = () => {
    for (const o of a.allFeet()) {
      if (!o.alive || o.isBossLike || o.target !== t.p) continue;
      if (o.state === 'descend' || o.state === 'stomp') {
        o.setState('lift');
        o.vy = -650;
      }
    }
  };
  clearLane();
  let live = true;
  const h: Hold = {
    p: t.p,
    y,
    shake: 0,
    arrived: () => Math.abs(f.x - h.p.x) < 24 && Math.abs(f.y - h.y) < 24,
    tick: (dt) => {
      if (!live || !f.alive) return;
      clearLane();
      f.x += (h.p.x - f.x) * Math.min(1, dt * 4);
      f.y += (h.y - f.y) * Math.min(1, dt * 5);
      const s = h.shake;
      f.root.setPosition(f.x + (Math.random() - 0.5) * s * 2, f.y + (Math.random() - 0.5) * s);
    },
    release: (to = 'hover') => {
      if (!live) return;
      live = false;
      t.release();
      f.puppet = false;
      if (!f.alive) return;
      f.root.setPosition(f.x, f.y);
      if (to === 'lift') {
        f.setState('lift');
        f.vy = -560;
      } else f.setState('hover');
    },
    live: () => live,
  };
  return h;
}

/** Slam a held boss down onto y, then call `land`. */
function slam(a: Arena, f: Foot, y: number, ms: number, land: () => void): void {
  a.sc.tweens.add({
    targets: f,
    y,
    duration: ms,
    ease: 'Quad.In',
    onUpdate: () => f.root.setPosition(f.x, f.y),
    onComplete: () => {
      if (f.alive) land();
    },
  });
}

/** Like Every.tick, but a move that comes due waits for `ready` instead of being skipped. */
function due(e: Every, dt: number, ready: boolean): boolean {
  if (e.t > 0) e.t -= dt;
  if (e.t > 0 || !ready) return false;
  e.t = e.every;
  return true;
}

/** Stun seconds by heat (Mild longest). */
const stunFor = (a: Arena, base: number) => base * [1.4, 1.15, 1, 0.85, 0.75][heat(a).rank];

// ——— Covers: soot and sand columns that hide a lane. Feet under one can't be hurt until it's cleared ———

interface Cover {
  p: Pizza;
  prop: Prop;
  half: number;
  bottom: number;
  slow: boolean;
}

class Covers {
  list: Cover[] = [];
  private under = new Map<Foot, boolean>();

  /** Covers still standing. */
  live(): Cover[] {
    for (const c of this.list) if (c.p.dead) c.prop.destroy();
    this.list = this.list.filter((c) => c.prop.alive() && !c.p.dead);
    return this.list;
  }

  has(p: Pizza): boolean {
    return this.live().some((c) => c.p === p);
  }

  /** A tall column over a pizza's lanes, cleared by `hits` smacks (counter near the bottom). */
  add(a: Arena, p: Pizza, o: { key: string; hits: number; slow: boolean; reset: boolean; label: string; sec: number; raise?: number }): void {
    const half = p.radius * 1.05;
    const sc = Phaser.Math.Clamp((half * 2 + 30) / 340, 0.7, 1.15);
    const bottom = p.surfaceY + 10;
    // the art can sit a little higher than the lane's bottom (the sandcastle rests on the pizza's far rim)
    const y = bottom - (o.raise ?? 0) - 410 * sc;
    const prop = hitProp(a, {
      key: o.key,
      x: p.x,
      y,
      scale: sc,
      hits: o.hits,
      contains: (x, yy) => Math.abs(x - p.x) < half && yy > y - 410 * sc && yy < bottom,
      label: o.label,
      badgeDy: 300,
      // it settles on its own after a while (the feet it held go back to diving)
      sec: o.sec,
    });
    this.list.push({ p, prop, half, bottom, slow: o.slow });
    if (!o.reset) return;
    // feet already in the lane are blown back to the top
    for (const f of a.allFeet()) {
      if (!f.alive || f.isBossLike || Math.abs(f.x - p.x) >= half) continue;
      if (f.state === 'descend' || f.state === 'stomp') {
        f.setState('lift');
        f.vy = -650;
      } else f.stateT = 0;
    }
  }

  /** Every frame: feet under a cover can't be hit (and soot slows them 10%). */
  tick(a: Arena): void {
    const live = this.live();
    for (const f of [...this.under.keys()]) if (!f.alive) this.under.delete(f);
    for (const f of a.allFeet()) {
      if (!f.alive || f.isBossLike) continue;
      const c = live.find((k) => Math.abs(f.x - k.p.x) < k.half && f.y < k.bottom + 20);
      const was = this.under.get(f);
      if (c) {
        f.buried = true;
        // feet under a cover wait at the top: a diver backs off, a hoverer never starts its dive
        if (f.state === 'descend' || f.state === 'stomp') {
          f.setState('lift');
          f.vy = -650;
        } else if (f.state === 'hover') f.stateT = 0;
        if (was === undefined) {
          this.under.set(f, c.slow);
          if (c.slow) f.speedMul *= 0.9;
        }
      } else if (was !== undefined) this.free(f, was);
    }
  }

  private free(f: Foot, slow: boolean): void {
    if (slow) f.speedMul /= 0.9;
    if (!f.type.traits.includes('bury')) f.buried = false;
    this.under.delete(f);
  }

  clear(): void {
    for (const c of this.list) c.prop.destroy();
    this.list = [];
    for (const [f, slow] of [...this.under]) this.free(f, slow);
  }
}

// ——— 1. The Head Waiter ———

const headwaiter = (): Brain => {
  let h: Hold | null = null;
  /** The tray in flight: an update-driven spin down the lane. */
  let tray: {
    img: Phaser.GameObjects.Image;
    /** Its shadow on the pizza, growing as it comes down. */
    shadow: Phaser.GameObjects.Ellipse;
    reticle: Phaser.GameObjects.Image;
    p: Pizza;
    k: number;
    dur: number;
    /** Tumble angle: the tray flips end over end, so it shows its face, its edge and its underside. */
    spin: number;
    back: boolean;
    done: boolean;
  } | null = null;
  /** Tray display size (the texture is 440 px across). */
  const TRAY = 0.9;
  let t = 1.2;
  let throws = 0;
  /** Phase 3 alternates: a couple of trays, then a round of waiters. */
  let mode: 'toss' | 'service' = 'toss';
  let waiters: Foot[] = [];
  let serving = false;
  let serveT = 0;
  let slowed = false;

  /** Take the tray away: `clang` bounces it off what it hit and fades it out, otherwise it just fades. */
  const endTray = (a?: Arena, clang = false) => {
    if (!tray) return;
    const tr = tray;
    tr.done = true;
    tray = null;
    const { img, shadow, reticle } = tr;
    reticle.destroy();
    if (!a) {
      img.destroy();
      shadow.destroy();
      return;
    }
    a.sc.tweens.killTweensOf([img, shadow]);
    a.sc.tweens.add({ targets: shadow, alpha: 0, duration: 200, onComplete: () => shadow.destroy() });
    if (clang) {
      // it clatters off and spins away
      const dir = Math.random() < 0.5 ? -1 : 1;
      a.sc.tweens.add({ targets: img, x: img.x + dir * 220, y: img.y - 170, angle: dir * 300, duration: 420, ease: 'Quad.Out' });
      a.sc.tweens.add({ targets: img, scaleY: img.scaleX * 0.2, duration: 120, yoyo: true, repeat: 1 });
      a.sc.tweens.add({ targets: img, alpha: 0, delay: 220, duration: 260, onComplete: () => img.destroy() });
    } else a.sc.tweens.add({ targets: img, alpha: 0, scale: img.scaleX * 0.6, duration: 220, onComplete: () => img.destroy() });
  };
  const endHold = () => {
    h?.release();
    h = null;
  };
  const setSlow = (f: Foot, on: boolean) => {
    if (on === slowed) return;
    slowed = on;
    f.speedMul *= on ? 0.55 : 1 / 0.55;
  };

  const throwTray = (f: Foot, a: Arena) => {
    if (!h) return;
    const p = h.p;
    // where it will land: a shadow that darkens and grows, and the red reticle
    const shadow = a.sc.add.ellipse(p.x, p.surfaceY - 10, p.radius * 1.5, p.radius * 0.45, 0x1a0e08, 0).setScale(0.4);
    a.fxLayer.add(shadow);
    const dur = heat(a).windup(2.6);
    const reticle = mark(a, 'p_reticle', p.x, p.surfaceY - 30, dur + 0.3, 1.1);
    const img = a.sc.add.image(f.x, f.y + 30, 'p_silvertray').setScale(0);
    a.fxLayer.add(img);
    a.sc.tweens.add({ targets: img, scaleX: TRAY, duration: 260, ease: 'Back.Out' });
    const tr = { img, shadow, reticle, p, k: 0, dur, spin: 0, back: false, done: false };
    tray = tr;
    a.quip(f.x, f.y - 40, 'TRAY!', '#ffffff', 44);
    a.sfx('sfx_headwaiter_traytoss');
    a.addClickable({
      get x() {
        return img.x;
      },
      get y() {
        return img.y;
      },
      r: 150,
      priority: 2,
      contains: (x, y) => Math.abs(x - img.x) < 200 && Math.abs(y - img.y) < 90,
      alive: () => !tr.done && !tr.back,
      hit: () => {
        if (tr.done || tr.back) return;
        tr.back = true;
        tr.reticle.destroy();
        a.sc.tweens.add({ targets: tr.shadow, alpha: 0, duration: 200 });
        // a green flash: it's yours now
        img.setTintFill(0x9dffb0);
        a.sc.time.delayedCall(90, () => img.active && img.clearTint());
        a.fx.impact(img.x, img.y, true);
        a.sfx('sfx_headwaiter_traybat');
        a.quip(img.x, img.y - 70, 'BATTED!', '#7dff9a', 38);
      },
    });
  };

  const tickTray = (f: Foot, dt: number, a: Arena) => {
    if (!tray) return;
    const tr = tray;
    const img = tr.img;
    // it tumbles end over end (faster once batted): squash it through face, edge and underside
    tr.spin += dt * (tr.back ? 16 : 5.5);
    const c = Math.cos(tr.spin);
    if (img.scaleX >= TRAY * 0.99 || tr.k > 0.05) {
      img.scaleY = img.scaleX * (0.14 + 0.62 * Math.abs(c));
      img.setTexture(c >= 0 ? 'p_silvertray' : 'p_silvertray_b');
    } else img.scaleY = img.scaleX * 0.76;
    // and wobbles on its axis
    img.rotation = Math.sin(tr.spin * 0.5) * 0.22 + (tr.back ? Math.sin(tr.spin) * 0.3 : 0);
    if (tr.back) {
      // spins back up to the waiter and clangs off him
      img.x += (f.x - img.x) * Math.min(1, dt * 7);
      img.y += (f.cy - img.y) * Math.min(1, dt * 7);
      if (Math.hypot(f.x - img.x, f.cy - img.y) < 60) {
        a.fx.impact(img.x, img.y, true);
        a.sfx('sfx_crit');
        endTray(a, true);
        a.damageFoot(f, Math.round(f.maxHp * 0.1), 'RETURN TO SENDER!');
        afterThrow(f, a);
      }
      return;
    }
    tr.k += dt / tr.dur;
    const sx = f.x;
    const sy = f.y + 30;
    const ty = tr.p.surfaceY - 30;
    img.x = sx + (tr.p.x - sx) * tr.k;
    img.y = sy + (ty - sy) * tr.k;
    tr.shadow.setPosition(tr.p.x, tr.p.surfaceY - 10).setScale(0.4 + 0.6 * tr.k).setAlpha(0.1 + 0.35 * tr.k);
    if (tr.k >= 1) {
      const p = tr.p;
      a.fx.impact(img.x, img.y, false);
      a.sfx('sfx_headwaiter_trayclang');
      endTray(a, true);
      if (!p.dead) a.hitPizza(p, heat(a).slices(1), 'TRAYED!');
      afterThrow(f, a);
    }
  };

  const afterThrow = (f: Foot, a: Arena) => {
    throws++;
    t = heat(a).cooldown(2.2);
    // now and then he gives up the lane and strolls to another table between throws
    if (f.phase === 1 && Math.random() < 0.35) {
      const p = rnd(a.alivePizzas().filter((q) => q !== h?.p));
      endHold();
      h = p ? hold(a, f, p) : null;
    }
  };

  const startService = (f: Foot, a: Arena) => {
    endTray(a);
    endHold();
    serving = true;
    serveT = 0;
    shield(a, f, true);
    setSlow(f, true);
    const n = heat(a).adds(1) + (f.phase >= 3 ? 1 : 0);
    a.quip(f.x, f.cy - 150, 'SERVICE!', '#ffffff', 46);
    a.sfx('sfx_headwaiter_service');
    waiters = [];
    for (let i = 0; i < n; i++) {
      a.sc.time.delayedCall(i * 380, () => {
        if (!f.alive || !a.inWave() || !serving) return;
        // they come in from his side of the table and fan out to their lanes
        const side = f.x < W / 2 ? 1 : -1;
        const w = a.spawn(FOOT_BY_ID.waiter ? 'waiter' : 'bob', null, f.x + side * (120 + i * 70));
        if (!w) return;
        waiters.push(w);
        flourish(w, a);
      });
    }
  };

  /** A waiter spins a tray on his toe for a moment ("your order!") before he dives. */
  const flourish = (w: Foot, a: Arena) => {
    w.hoverTime += 1.6;
    const img = a.sc.add.image(w.x, w.y, 'p_silvertray').setScale(0.3, 0.12);
    a.fxLayer.add(img);
    const at = () => ({ x: w.x + w.meta.halfWidth * w.scale * 0.7, y: w.y - 40 });
    const tick = a.sc.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        const p = at();
        img.setPosition(p.x, p.y);
        // spun on his toe: a tilted disc whose sheen flickers as it turns
        const c = Math.cos(a.now() * 9);
        img.scaleX = 0.3 * (0.8 + 0.2 * Math.abs(c));
        img.setTexture(c >= -0.6 ? 'p_silvertray' : 'p_silvertray_b');
        if (!w.alive) {
          tick.remove();
          img.destroy();
        }
      },
    });
    a.sc.time.delayedCall(1500, () => {
      tick.remove();
      if (!img.active) return;
      if (w.alive) {
        a.quip(w.x, w.y - 40, 'BON APPÉTIT!', '#ffffff', 30);
        a.sfx('sfx_headwaiter_service', { volume: 0.5 });
      }
      a.sc.tweens.add({ targets: img, y: img.y - 120, angle: 360, alpha: 0, duration: 450, onComplete: () => img.destroy() });
    });
  };

  return {
    names: ['TRAY TOSS', 'SERVICE!', 'ENRAGED'],
    info: [
      'Holds a lane and spins a giant tray down at the pizza · smack the tray to send it back at him',
      'Shielded while his waiters are out · clear the waiters to drop his shield',
      'Waiters come faster and the trays are back · clear the waiters, bat the trays',
    ],
    onPhase: (f, ph, a) => {
      if (ph === 2) {
        endTray(a);
        endHold();
        mode = 'service';
        t = 1.2;
      }
      if (ph === 3) {
        f.enraged = true;
        a.quip(f.x, f.cy - 160, 'MORE STAFF!', '#ff4d3d', 50);
      }
    },
    update: (f, dt, a) => {
      h?.tick(dt);
      tickTray(f, dt, a);
      if (!a.inWave()) {
        endTray(a);
        endHold();
        return;
      }
      if (h && h.p.dead) {
        endTray(a);
        endHold();
      }
      if (serving) {
        serveT += dt;
        waiters = waiters.filter((w) => w.alive);
        // spawns are staggered: wait for the first before counting them out (and never shield for ever)
        if ((serveT > 1.5 && !waiters.length) || serveT > 30) {
          serving = false;
          shield(a, f, false);
          setSlow(f, false);
          a.quip(f.x, f.cy - 150, 'SHORT-STAFFED!', '#7dff9a', 42);
          t = heat(a).cooldown(f.phase >= 3 ? 3 : 6);
          if (f.phase >= 3) {
            mode = 'toss';
            throws = 0;
          }
        }
        return;
      }
      t -= dt;
      if (f.phase === 2 || (f.phase >= 3 && mode === 'service')) {
        if (t <= 0 && f.state === 'hover') startService(f, a);
        return;
      }
      // Tray Toss: hold a lane and throw on a cooldown
      if (!h) {
        if (t <= 0 && f.state === 'hover') {
          h = hold(a, f, rnd(a.alivePizzas()));
          t = 0.8;
        }
        return;
      }
      if (!tray && t <= 0 && h.arrived()) {
        if (f.phase >= 3 && throws >= 2) {
          endHold();
          mode = 'service';
          t = 0.6;
          return;
        }
        throwTray(f, a);
      }
    },
    onDeath: (f, a) => {
      endTray(a);
      endHold();
      if (slowed) setSlow(f, false);
    },
  };
};

// ——— 2. Bigfoot ———

const bigfoot = (): Brain => {
  let tw: Foot | null = null;
  /** The move in progress (only one at a time across both feet, so the answers never overlap). */
  let move: { tick(dt: number): void; end(): void } | null = null;
  let t = 3;
  let n = 0;

  /** Pizzas the other foot isn't over (both feet never crowd one pizza). */
  const others = (a: Arena, g: Foot) => {
    const o = g === tw ? f0 : tw;
    const ps = a.alivePizzas().filter((p) => !o || o.target !== p);
    return ps.length ? ps : a.alivePizzas();
  };

  /** Big Step: a ring closes on a target over his foot; click while it's green. */
  const bigStep = (g: Foot, a: Arena, done: () => void) => {
    const hz = heat(a);
    const h = hold(a, g, rnd(others(a, g)), 380);
    if (!h) return done();
    shield(a, g, true);
    a.quip(g.x, 380, 'BIG STEP!', '#ffd23f', 50);
    a.sfx('sfx_warning', { volume: 0.4 });
    mark(a, 'p_reticle', h.p.x, h.p.surfaceY - 30, 1.2, 0.7);
    const need = [2, 2, 3, 3, 4][hz.rank];
    const retries = 1;
    let got = 0;
    let missed = 0;
    const R = 118;
    const win = [0.26, 0.22, 0.18, 0.16, 0.14][hz.rank];
    const T = hz.windup(1.25);
    const base = a.sc.add.graphics();
    const target = a.sc.add.image(0, 0, 'p_qte_target').setScale(0);
    const ring = a.sc.add.graphics();
    const tally = a.sc.add.text(0, 0, 'CLICK ON GREEN!', { fontFamily: 'Lilita One, Fredoka, sans-serif', fontSize: '38px', color: '#7dff9a', stroke: '#2a1810', strokeThickness: 9 }).setOrigin(0.5);
    const parts = [base, target, ring, tally];
    a.fxLayer.add(parts);
    base.setAlpha(0);
    tally.setAlpha(0);
    a.sc.tweens.add({ targets: target, scale: 1, duration: 260, ease: 'Back.Out' });
    a.sc.tweens.add({ targets: [base, tally], alpha: 1, duration: 260 });
    let rt = -0.6; // ring time (negative = the pause before the next ring)
    let started = false;
    let clicked = false;
    let over = false;
    // under his toes, in the open air between the boss bar and the pizzas
    const at = () => ({ x: g.x, y: Math.min(g.y + 150, h.p.surfaceY - 250) });
    const radius = () => R * (2.7 - 2.4 * Phaser.Math.Clamp(rt / T, 0, 1));
    const green = () => rt >= 0 && Math.abs(radius() - R) < R * win;
    const cleanup = () => {
      over = true;
      ring.destroy();
      a.sc.tweens.add({ targets: parts.filter((o) => o !== ring), alpha: 0, duration: 220, onComplete: () => parts.forEach((o) => o.destroy()) });
      a.sc.tweens.add({ targets: target, scale: 0.4, duration: 220 });
    };
    const result = (ok: boolean) => {
      clicked = true;
      const p = at();
      if (ok) {
        got++;
        a.fx.ring(p.x, p.y, 0x7dff9a, 1, 1);
        a.quip(p.x + (p.x < W / 2 ? 1 : -1) * R * 2.2, p.y, 'NICE!', '#7dff9a', 50);
        a.sfx('sfx_bigfoot_ringok');
      } else {
        missed++;
        // he shakes harder and steps lower for every miss
        h.shake += 4;
        h.y += 70;
        a.quip(p.x + (p.x < W / 2 ? 1 : -1) * R * 2.2, p.y, 'MISS!', '#ff8a6a', 50);
        a.sfx('sfx_bigfoot_bigstep', { volume: 0.45, rate: 1.4 });
        a.shake(160, 0.004);
      }
      if (got >= need) return success();
      if (missed > retries) return fail();
      rt = -0.45;
    };
    const success = () => {
      cleanup();
      shield(a, g, false);
      h.release();
      a.quip(g.x, g.y - 60, 'STUMBLED!', '#7dff9a', 48);
      g.stun(stunFor(a, 1.6));
      move = null;
      a.damageFoot(f0!, Math.round(f0!.maxHp * 0.05));
      done();
    };
    const fail = () => {
      cleanup();
      h.shake = 0;
      slam(a, g, h.p.surfaceY + 4, 220, () => {
        a.shake(400, 0.014);
        a.sfx('sfx_bigfoot_bigstep');
        if (!h.p.dead) a.hitPizza(h.p, hz.slices(1), 'CRUSHED!');
        shield(a, g, false);
        h.release('lift');
        move = null;
        done();
      });
    };
    a.addClickable({
      get x() {
        return at().x;
      },
      get y() {
        return at().y;
      },
      r: R * 1.7,
      priority: 3,
      alive: () => !over,
      hit: () => {
        if (over || rt < 0 || clicked) return;
        result(green());
      },
    });
    move = {
      tick: (dt) => {
        h.tick(dt);
        if (over) return;
        if (h.p.dead) {
          cleanup();
          shield(a, g, false);
          h.release();
          move = null;
          return done();
        }
        const p = at();
        target.setPosition(p.x, p.y);
        tally.setPosition(p.x, p.y - R * (1 + win) - 34);
        // the stage: a dark backing for contrast, the green window to close the ring on, and a pip per answer
        base.clear();
        base.fillStyle(0x2a1810, 0.5).fillCircle(p.x, p.y, R * (1 + win) + 14);
        base.fillStyle(0x3ddc6a, 0.9).fillCircle(p.x, p.y, R * (1 + win));
        base.fillStyle(0x1a3a22, 0.85).fillCircle(p.x, p.y, R * (1 - win));
        base.lineStyle(6, 0x2a1810, 1).strokeCircle(p.x, p.y, R * (1 + win)).strokeCircle(p.x, p.y, R * (1 - win));
        base.lineStyle(3, 0xc8ffd4, 0.9).strokeCircle(p.x, p.y, R * (1 + win) - 5);
        const pipY = p.y + R * (1 + win) + 36;
        for (let i = 0; i < need; i++) {
          const px = p.x + (i - (need - 1) / 2) * 44;
          base.fillStyle(i < got ? 0x7dff9a : 0x2a1810, i < got ? 1 : 0.75).fillCircle(px, pipY, 14);
          base.lineStyle(5, i < got ? 0x2a1810 : 0xfff6e2, 1).strokeCircle(px, pipY, 14);
        }
        // let him reach the lane first
        if (!started && !h.arrived()) return;
        started = true;
        if (rt < 0) {
          rt += dt;
          if (rt >= 0) {
            clicked = false;
            a.sfx('sfx_bigfoot_ring');
          }
          ring.clear();
          target.setTint(0xffffff);
          return;
        }
        rt += dt;
        const r = radius();
        const late = r < R * (1 - win);
        const col = green() ? 0x7dff9a : late ? 0xff4d3d : 0xffffff;
        ring.clear();
        // a glow while it's in the window: now!
        if (green()) ring.lineStyle(34, 0x7dff9a, 0.35).strokeCircle(p.x, p.y, r);
        ring.lineStyle(20, 0x2a1810, 1).strokeCircle(p.x, p.y, r);
        ring.lineStyle(11, col, 1).strokeCircle(p.x, p.y, r);
        target.setTint(green() ? 0x9dffb0 : 0xffffff);
        target.setScale(green() ? 1.12 : 1);
        // the ring closed without a click
        if (rt >= T && !clicked) result(false);
      },
      end: () => {
        if (!over) cleanup();
        shield(a, g, false);
        h.release();
      },
    };
  };

  /** Ground Pound: build the bear trap under him before he slams. */
  const groundPound = (g: Foot, a: Arena, done: () => void) => {
    const hz = heat(a);
    const h = hold(a, g, rnd(others(a, g)), 330);
    if (!h) return done();
    const p = h.p;
    shield(a, g, true);
    h.shake = 3;
    a.quip(g.x, 380, 'GROUND POUND!', '#ffd23f', 48);
    a.sfx('sfx_warning', { volume: 0.45, rate: 0.8 });
    const total = hz.hits(4);
    let over = false;
    let trap: Phaser.GameObjects.Image | null = null;
    const ty = p.surfaceY - 50;
    // runs once, whichever of the slam, the miss or the timeout gets there first
    let finished = false;
    const finish = () => {
      over = true;
      if (finished) return;
      finished = true;
      move = null;
      done();
    };
    const prop = hitProp(a, {
      key: 'p_trap0',
      x: p.x,
      y: ty,
      scale: 0.95,
      hits: total,
      r: 130,
      sec: hz.windup(5.5),
      label: 'TRAP SET!',
      badgeDy: -120,
      hitSfx: 'sfx_bigfoot_trapbuild',
      onHit: (left) => {
        // blueprint until the last smack: it only looks built (stage 3) once it really is
        const stage = Math.min(2, Math.ceil(((total - left) / total) * 3));
        prop.img.setTexture(`p_trap${stage}`);
        a.fx.glint(p.x, ty, 2);
      },
      onClear: () => {
        // built in time: he slams into it
        trap = a.sc.add.image(p.x, ty, 'p_trap3').setScale(0.95);
        a.fx.ring(p.x, ty, 0x7dff9a, 1.2, 1);
        a.fxLayer.add(trap);
        h.shake = 0;
        slam(a, g, ty + 30, 240, () => {
          trap?.setTexture('p_trap_shut');
          a.shake(500, 0.016);
          a.rumble(0.9, 400);
          a.sfx('sfx_crit');
          a.sfx('sfx_bigfoot_trapsnap');
          a.quip(g.x, g.y - 160, 'OUCH!', '#ff4d3d', 72);
          shield(a, g, false);
          // back up to the top, stunned
          a.sc.tweens.add({
            targets: g,
            y: HOVER_Y,
            duration: 500,
            ease: 'Back.Out',
            delay: 350,
            onUpdate: () => g.root.setPosition(g.x, g.y),
            onComplete: () => {
              h.release();
              g.stun(stunFor(a, 2.4));
              const im = trap;
              trap = null;
              if (im) a.sc.tweens.add({ targets: im, alpha: 0, delay: 400, duration: 400, onComplete: () => im.destroy() });
              a.damageFoot(f0!, Math.round(f0!.maxHp * 0.1));
              finish();
            },
          });
        });
      },
      onFail: () => {
        h.shake = 0;
        slam(a, g, p.surfaceY + 4, 200, () => {
          a.shake(600, 0.02);
          a.rumble(1, 450);
          a.sfx('sfx_bigfoot_pound');
          a.fx.explosion(p.x, p.surfaceY, 170);
          if (!p.dead) a.hitPizza(p, hz.slices(2), 'GROUND POUND!');
          shield(a, g, false);
          h.release('lift');
          finish();
        });
      },
    });
    move = {
      tick: (dt) => {
        h.tick(dt);
        if (!over && p.dead) {
          prop.destroy();
          shield(a, g, false);
          h.release();
          finish();
        }
      },
      end: () => {
        over = true;
        prop.destroy();
        trap?.destroy();
        shield(a, g, false);
        h.release();
      },
    };
  };

  let f0: Foot | null = null;

  return {
    names: ['BIG STEP', 'GROUND POUND', 'RAMPAGE', 'ENRAGED'],
    info: [
      'Holds a lane, shielded, for a quick-time stomp · click when the closing ring is on the green',
      'Shielded over a pizza while a bear trap waits to be built · smack the trap to build it before he slams',
      'A second Bigfoot joins, sharing his health · they take turns: answer each move as it comes',
      'Both feet, every move, faster · keep answering, it is nearly down',
    ],
    onPhase: (f, ph, a) => {
      f0 = f;
      if (ph === 3 && !tw) {
        tw = twin(a, f);
        if (tw) a.sfx('sfx_bigfoot_rampage');
        t = 2.5;
      }
      if (ph >= 4) f.enraged = true;
    },
    update: (f, dt, a) => {
      f0 = f;
      if (tw && !tw.alive) tw = null;
      if (!a.inWave()) {
        move?.end();
        move = null;
        return;
      }
      if (move) return move.tick(dt);
      t -= dt;
      if (t > 0) return;
      const hz = heat(a);
      const actors = tw ? [f, tw] : [f];
      const g = actors[n % actors.length];
      if (g.state !== 'hover' || g.stunT > 0) return;
      // phase 1 only steps, phase 2 only pounds; from phase 3 both feet take turns at both moves
      const kind = f.phase === 1 ? 'step' : f.phase === 2 ? 'pound' : (['step', 'pound', 'pound', 'step'] as const)[n % 4];
      n++;
      const gap = f.phase >= 4 ? 2.2 : f.phase === 3 ? 3.2 : 6;
      const done = () => (t = hz.cooldown(gap));
      if (kind === 'step') bigStep(g, a, done);
      else groundPound(g, a, done);
    },
    onSmacked: (_f, a, x, y) => {
      // a hit on the shielded twin lands on the boss: block it like the bubble would
      if (tw && tw.shielded && tw.distanceTo(x, y) < 40) {
        a.quip(tw.x, tw.cy - 110, 'BLOCKED', '#c7ccd4', 32);
        a.sfx('sfx_kit_shieldblock', { throttle: 150 });
        return true;
      }
      return false;
    },
    onDeath: () => {
      move?.end();
      move = null;
      if (tw?.alive) tw.die(true);
      tw = null;
    },
  };
};

// ——— 3. Chimney Sweep ———

const sweep = (): Brain => {
  const covers = new Covers();
  const soot = new Every(7, 2.5);
  const hop = new Every(4.5, 3);
  const brick = new Every(3.5, 2);
  let pending = false;
  let chimneys: { p: Pizza; img: Phaser.GameObjects.Image; bricks: number }[] = [];
  const BRICK = 30;
  const MAX_BRICKS = 5;
  const clearChimneys = () => {
    for (const c of chimneys) {
      c.img.destroy();
      if (!c.p.dead) c.p.setLift(0);
    }
    chimneys = [];
  };
  return {
    names: ['SOOT CLOUD', 'CHIMNEY HOP', 'ENRAGED'],
    info: [
      'Soots a lane: feet inside wait at the top, safe · smack the soot to clear it, or wait it out',
      'Hops lanes without warning and keeps sooting · keep the lanes clear',
      'Faster, and chimneys push the pizzas up at the feet · clear the soot, smack the chimneys down',
    ],
    onPhase: (f, ph, a) => {
      if (ph < 3) return;
      f.enraged = true;
      // a chimney under every pizza, growing a brick at a time
      for (const p of a.alivePizzas()) {
        const img = a.sc.add.image(p.x, p.y + 30, 'p_chimney').setOrigin(0.5, 0).setScale(p.radius / 154);
        a.underLayer.add(img);
        const c = { p, img, bricks: 0 };
        chimneys.push(c);
        a.addClickable({
          get x() {
            return img.x;
          },
          get y() {
            return img.y + 60;
          },
          r: 90,
          priority: 1,
          alive: () => f.alive && chimneys.includes(c) && c.bricks > 0,
          hit: () => {
            c.bricks--;
            c.p.setLift(c.bricks * BRICK);
            a.fx.puff(img.x, img.y + 40, 6);
            a.sfx('sfx_slap_1', { volume: 0.7 });
            a.quip(img.x, img.y + 20, 'KNOCKED DOWN!', '#7dff9a', 30);
          },
        });
      }
    },
    upkeep: (_f, _dt, a) => covers.tick(a),
    update: (f, dt, a) => {
      if (!a.inWave()) return;
      const hz = heat(a);
      const fast = f.phase >= 3 ? 0.7 : 1;
      soot.every = hz.cooldown(7) * fast;
      if (!pending && soot.tick(dt) && covers.live().length < (hz.rank >= 2 ? 2 : 1)) {
        const mine = laneOf(a, f);
        const p = rnd(a.alivePizzas().filter((q) => q !== mine && !covers.has(q)));
        if (p) {
          // the tell: he shakes his brush and soot puffs at the top of the lane
          pending = true;
          a.quip(f.x, f.cy - 150, 'SOOT CLOUD!', '#cfcfcf', 42);
          a.sfx('sfx_sweep_brush');
          for (let i = 0; i < 4; i++) a.sc.time.delayedCall(i * 150, () => a.fx.puff(p.x + (Math.random() - 0.5) * 120, 140 + i * 60, 10));
          a.sc.time.delayedCall(700, () => {
            pending = false;
            if (!f.alive || p.dead || !a.inWave()) return;
            a.sfx('sfx_sweep_soot');
            covers.add(a, p, { key: 'p_sootcol', hits: hz.hits(4), slow: true, reset: true, label: 'CLEARED!', sec: hz.windup(7) });
          });
        }
      }
      if (f.phase >= 2) {
        hop.every = hz.cooldown(4.5) * fast;
        // no warning: he just pops out of another chimney
        if (due(hop, dt, f.state === 'hover' || f.state === 'lift')) {
          const p = rnd(a.alivePizzas().filter((q) => q !== f.target));
          if (p) {
            a.fx.puff(f.x, f.cy, 10);
            f.target = p;
            f.x = p.x;
            a.fx.puff(f.x, f.cy, 10);
            a.quip(f.x, f.cy - 150, 'POP!', '#cfcfcf', 36);
            a.sfx('sfx_sweep_hop');
          }
        }
      }
      if (f.phase >= 3) {
        chimneys = chimneys.filter((c) => {
          if (!c.p.dead) return true;
          c.img.destroy();
          return false;
        });
        for (const c of chimneys) c.img.setPosition(c.p.x, c.p.y + 30);
        brick.every = hz.cooldown(3.5);
        if (brick.tick(dt)) {
          for (const c of chimneys) {
            if (c.bricks >= MAX_BRICKS) continue;
            c.bricks++;
            c.p.setLift(c.bricks * BRICK);
          }
          a.sfx('sfx_sweep_brick', { throttle: 120 });
        }
      }
    },
    onDeath: () => {
      covers.clear();
      clearChimneys();
    },
  };
};

// ——— 4. The Iron Heel ———

const ironheel = (): Brain => {
  const vent = new Every(4.5, 2);
  const press = new Every(4.2, 1.5);
  const rockets = new Every(6.5, 4);
  const steam = new Every(7, 4);
  let blastT = 2.5;
  let rocketBusyUntil = 0;
  let blast: { end(): void; tick(dt: number): void } | null = null;
  let pistons: { p: Pizza; col: Phaser.GameObjects.Image; valve: Phaser.GameObjects.Image; lift: number; lockT: number }[] = [];
  const clearPistons = () => {
    for (const s of pistons) {
      s.col.destroy();
      s.valve.destroy();
      if (!s.p.dead) s.p.setLift(0);
    }
    pistons = [];
  };

  /** Power Blast: he charges a beam over one pizza; a rocket launcher slides along the table. */
  const powerBlast = (f: Foot, a: Arena) => {
    const hz = heat(a);
    const h = hold(a, f, rnd(a.alivePizzas()));
    if (!h) return;
    const p = h.p;
    shield(a, f, true);
    a.quip(f.x, 360, 'POWER BLAST!', '#9ad8ff', 50);
    a.sfx('sfx_warning', { volume: 0.45, rate: 0.7 });
    const ps = a.alivePizzas();
    // the launcher sweeps a stretch of table around his lane (his lane and its neighbours), so the
    // passes come round quickly wherever he stands
    const lo = Math.max(150, Math.min(...ps.map((q) => q.x)) - 200, p.x - 560);
    const hi = Math.min(W - 150, Math.max(...ps.map((q) => q.x)) + 200, p.x + 560);
    const ly = p.surfaceY - 150;
    const half = p.radius * 0.75;
    let lx = p.x - lo > hi - p.x ? lo : hi;
    let dir = lx === lo ? 1 : -1;
    let speed = [620, 700, 780, 860, 940][hz.rank];
    const need = 4;
    let passes = 0;
    let inLane = false;
    let reload = 0;
    let fireIn = -1;
    let over = false;
    // his lane glows, with arrows down to the launcher's rail, so you know where it has to be
    const top = HOVER_Y + 40;
    const railY = ly + 92;
    const col = a.sc.add.graphics();
    col.fillStyle(0x6ad0ff, 0.16).fillRoundedRect(p.x - half, top, half * 2, railY - top + 20, 30);
    col.lineStyle(10, 0x0a2a40, 0.5).strokeRoundedRect(p.x - half, top, half * 2, railY - top + 20, 30);
    col.lineStyle(5, 0x9ae8ff, 0.95).strokeRoundedRect(p.x - half, top, half * 2, railY - top + 20, 30);
    for (let y = top + 70; y < ly - 120; y += 90) {
      col.fillStyle(0x0a2a40, 0.5).fillTriangle(p.x - 44, y - 4, p.x + 44, y - 4, p.x, y + 44);
      col.fillStyle(0x9ae8ff, 0.85).fillTriangle(p.x - 34, y, p.x + 34, y, p.x, y + 34);
    }
    // the rail it rides on, with the firing zone under his lane lit up
    const rail = a.sc.add.graphics();
    rail.lineStyle(18, 0x2a1810, 1).lineBetween(lo - 130, railY, hi + 130, railY);
    rail.lineStyle(9, 0x9aa2ae, 1).lineBetween(lo - 130, railY, hi + 130, railY);
    rail.lineStyle(3, 0xffffff, 0.6).lineBetween(lo - 130, railY - 2, hi + 130, railY - 2);
    rail.fillStyle(0x2a1810, 1).fillRoundedRect(p.x - half - 6, railY - 15, half * 2 + 12, 30, 12);
    rail.fillStyle(0x6ad0ff, 1).fillRoundedRect(p.x - half, railY - 9, half * 2, 18, 8);
    for (const x of [lo - 130, hi + 130]) rail.fillStyle(0x2a1810, 1).fillCircle(x, railY, 16).fillStyle(0x9aa2ae, 1).fillCircle(x, railY, 10);
    const pips = a.sc.add.graphics();
    a.fxLayer.add([col, rail, pips]);
    col.setAlpha(0);
    rail.setAlpha(0);
    a.sc.tweens.add({ targets: rail, alpha: 1, duration: 250 });
    a.sc.tweens.add({ targets: col, alpha: { from: 0.55, to: 1 }, duration: 320, yoyo: true, repeat: -1 });
    const orb = a.sc.add.image(f.x, f.y + 40, 'p_blastorb').setScale(0.2).setBlendMode(Phaser.BlendModes.ADD);
    const lnc = a.sc.add.image(lx, ly, 'p_launcher').setScale(0);
    a.fxLayer.add([orb, lnc]);
    a.sc.tweens.add({ targets: lnc, scale: 0.85, duration: 260, ease: 'Back.Out' });
    a.sfx('sfx_ironheel_charge');
    a.sfx('sfx_ironheel_launcher');
    const cleanup = () => {
      over = true;
      a.sc.tweens.killTweensOf(col);
      a.sc.tweens.add({ targets: [orb, lnc, col, rail, pips], alpha: 0, duration: 250, onComplete: () => [orb, lnc, col, rail, pips].forEach((o) => o.destroy()) });
    };
    const end = (to: 'hover' | 'stun') => {
      cleanup();
      shield(a, f, false);
      h.release();
      if (to === 'stun') f.stun(stunFor(a, 1.6));
      blast = null;
      blastT = hz.cooldown(5);
    };
    const rocket = (x: number, toY: number, onHit: () => void) => {
      const r = a.sc.add.image(x, ly - 40, 'p_rocket');
      a.fxLayer.add(r);
      a.sfx('sfx_ironheel_rocket');
      a.sc.tweens.add({ targets: r, y: toY, duration: 380, ease: 'Quad.In', onComplete: () => (r.destroy(), onHit()) });
    };
    a.addClickable({
      get x() {
        return lnc.x;
      },
      get y() {
        return lnc.y;
      },
      r: 120,
      // a foot right on top of it still takes the smack, so it never eats a save
      priority: 1,
      alive: () => !over && fireIn < 0,
      hit: () => {
        if (over || reload > 0 || fireIn >= 0) return;
        a.fx.impact(lnc.x, lnc.y, true);
        if (inLane) {
          // under his lane: it fires straight up at him and the blast fizzles
          over = true;
          rocket(lnc.x, f.cy, () => {
            a.fx.explosion(f.x, f.y, 160);
            a.sfx('sfx_ironheel_blast', { volume: 0.7, rate: 1.2 });
            a.sfx('sfx_crit');
            a.quip(f.x, f.y - 40, 'BACKFIRE!', '#7dff9a', 54);
            end('stun');
            a.damageFoot(f, Math.round(f.maxHp * 0.06));
          });
          return;
        }
        // another lane: it clears the feet in that lane
        reload = 0.8;
        lnc.setTint(0x8a909a);
        const x = lnc.x;
        rocket(x, 0, () => {
          a.fx.explosion(x, 240, 90);
          for (const o of a.allFeet()) {
            if (!o.alive || o.isBossLike || Math.abs(o.x - x) > 120 || !o.hittable) continue;
            a.damageFoot(o, Math.max(30, Math.ceil(o.maxHp * 0.6)));
          }
        });
        a.quip(x, ly - 120, 'WRONG LANE!', '#ffd23f', 32);
      },
    });
    blast = {
      end: () => {
        if (!over) cleanup();
        shield(a, f, false);
        h.release();
        blast = null;
      },
      tick: (dt) => {
        h.tick(dt);
        if (over) return;
        if (p.dead) return end('hover');
        if (reload > 0) {
          reload -= dt;
          if (reload <= 0) lnc.clearTint();
        }
        // the launcher slides from side to side, a little slower each time it passes his lane
        lx += dir * speed * dt;
        if (lx > hi) (lx = hi), (dir = -1);
        if (lx < lo) (lx = lo), (dir = 1);
        lnc.setPosition(lx, ly);
        const now = Math.abs(lx - p.x) < half;
        if (inLane && !now) {
          passes++;
          speed *= 0.92;
          if (passes >= need && fireIn < 0) fireIn = 0.35;
        }
        inLane = now;
        if (reload <= 0) lnc.setTint(inLane ? 0x9dffb0 : 0xffffff);
        // the charge: a growing glow, harder shaking and sparks drawn in
        const k = Math.min(1, (passes + (inLane ? 0.5 : 0)) / need);
        // the charge, on the firing zone: a light per pass, and the blast comes when all four are lit
        pips.clear();
        for (let i = 0; i < need; i++) {
          const px = p.x + (i - (need - 1) / 2) * Math.min(40, (half * 2) / need);
          pips.fillStyle(0x2a1810, 1).fillCircle(px, railY, 11);
          pips.fillStyle(i < passes ? 0xffa53d : 0x0a2a40, 1).fillCircle(px, railY, 7);
        }
        orb.setPosition(f.x, f.y + 40).setScale(0.3 + k * 1.1 + Math.sin(a.now() * 20) * 0.05);
        h.shake = 2 + k * 6;
        if (Math.random() < dt * 14) {
          const ang = Math.random() * Math.PI * 2;
          const s = a.sc.add.circle(f.x + Math.cos(ang) * 220, f.y + 40 + Math.sin(ang) * 160, 7, 0x9ae8ff).setBlendMode(Phaser.BlendModes.ADD);
          a.fxLayer.add(s);
          a.sc.tweens.add({ targets: s, x: f.x, y: f.y + 40, scale: 0.3, duration: 380, ease: 'Quad.In', onComplete: () => s.destroy() });
        }
        if (fireIn >= 0) {
          fireIn -= dt;
          if (fireIn <= 0) {
            // the blast lands
            over = true;
            // the texture is a horizontal gradient: stretch it down the lane
            const beam = a.sc.add.image(p.x, f.y + 30, 'p_blastbeam').setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.ADD);
            beam.setDisplaySize(190, p.surfaceY - f.y - 30);
            a.fxLayer.add(beam);
            a.sc.tweens.add({ targets: beam, alpha: 0, duration: 650, delay: 200, onComplete: () => beam.destroy() });
            a.flash(200, 160, 230, 255);
            a.shake(500, 0.016);
            a.sfx('sfx_ironheel_blast');
            a.fx.explosion(p.x, p.surfaceY, 170);
            a.hitPizza(p, hz.slices(1), 'POWER BLAST!');
            end('hover');
          }
        }
      },
    };
  };

  /** Overheat steam: a vent marked under the peel, then a scalding burst there. */
  const steamBurst = (f: Foot, a: Arena) => {
    const hz = heat(a);
    const pp = a.peelPoint();
    const x = Phaser.Math.Clamp(pp.x + (Math.random() - 0.5) * 120, 200, W - 200);
    const y = Phaser.Math.Clamp(pp.y + (Math.random() - 0.5) * 80, 320, 980);
    const R = 170;
    const warn = hz.windup(1.1);
    const ring = a.sc.add.image(x, y, 'p_ventwarn').setScale(0).setAlpha(0.9);
    a.fxLayer.add(ring);
    a.sc.tweens.add({ targets: ring, scale: (R * 2) / 360, duration: 220, ease: 'Back.Out' });
    a.sc.tweens.add({ targets: ring, alpha: { from: 0.55, to: 1 }, duration: 160, yoyo: true, repeat: -1 });
    a.quip(x, y - R - 30, 'HISS…', '#ffe8c0', 34);
    a.sfx('sfx_ironheel_hiss');
    const wisps = a.sc.time.addEvent({
      delay: 140,
      loop: true,
      callback: () => {
        const s = a.sc.add.image(x + (Math.random() - 0.5) * 60, y, 'p_steam').setScale(0.25).setAlpha(0.7);
        a.fxLayer.add(s);
        a.sc.tweens.add({ targets: s, y: y - 70, alpha: 0, duration: 500, onComplete: () => s.destroy() });
      },
    });
    a.sc.time.delayedCall(warn * 1000, () => {
      wisps.remove();
      a.sc.tweens.killTweensOf(ring);
      ring.destroy();
      if (!a.inWave() || !f.alive) return;
      a.sfx('sfx_ironheel_steam');
      for (let i = 0; i < 7; i++) {
        const s = a.sc.add.image(x + (Math.random() - 0.5) * R, y + (Math.random() - 0.5) * 60, 'p_steam').setScale(0.6).setAlpha(0.95);
        a.fxLayer.add(s);
        a.sc.tweens.add({ targets: s, y: s.y - 220 - Math.random() * 80, scale: 1.4, alpha: 0, duration: 800, onComplete: () => s.destroy() });
      }
      const q = a.peelPoint();
      if (Math.hypot(q.x - x, q.y - y) < R + 10) a.stunPeel(hz.stun(1.2), 'SCALDED!');
    });
  };

  return {
    names: ['POWER BLAST', 'OVERHEAT', 'PRESS LINE', 'ENRAGED'],
    info: [
      'Charges a beam over one pizza, shielded · smack the rocket launcher while it is under his lane',
      'Vents heat (armour 0 while red) and bursts steam under your peel · pile on hits, move off the vents',
      'Pistons lift pizzas into rocket fire · smack the glowing valves to lower them',
      'Everything faster · keep the valves down, dodge the steam',
    ],
    onPhase: (f, ph, a) => {
      if (ph >= 2) {
        blast?.end();
        blast = null;
      }
      if (ph >= 4) f.enraged = true;
      if (ph === 3) {
        const deep = heat(a).rank >= 3;
        // a piston under every pizza
        for (const p of a.alivePizzas()) {
          const col = a.sc.add.image(p.x, p.baseY + 220, 'p_piston').setScale(1, 1).setOrigin(0.5, 0);
          a.underLayer.add(col);
          const valve = a.sc.add.image(p.x + p.radius * 0.95, p.baseY + 40, 'p_valve');
          a.fxLayer.add(valve);
          const s = { p, col, valve, lift: 0, lockT: 0 };
          pistons.push(s);
          a.addClickable({
            get x() {
              return valve.x;
            },
            get y() {
              return valve.y;
            },
            r: 60,
            priority: 2,
            // a locked valve stops taking smacks (it used to soak up every smack aimed near it)
            alive: () => f.alive && pistons.includes(s) && s.lockT <= 0,
            hit: () => {
              // Mild–Hot: one smack resets the piston; Extra Hot and up: it drops one step and glows again soon
              s.lift = deep ? Math.max(0, s.lift - 65) : 0;
              s.lockT = deep ? 2 : 4;
              s.p.setLift(s.lift);
              valve.setTint(0x8a909a);
              a.quip(valve.x, valve.y - 60, deep && s.lift > 0 ? 'ONE STEP DOWN!' : 'LOCKED!', '#7dff9a', 36);
              a.sfx('sfx_ironheel_valve', { throttle: 120 });
            },
          });
        }
      }
    },
    update: (f, dt, a) => {
      if (!a.inWave()) {
        blast?.end();
        return;
      }
      const hz = heat(a);
      if (blast) return blast.tick(dt);
      if (f.phase === 1) {
        blastT -= dt;
        if (blastT <= 0 && f.state === 'hover') powerBlast(f, a);
        return;
      }
      if (vent.tick(dt)) {
        // overheat window: armour off, glowing red
        f.brain.armorWas = f.armor;
        f.armor = 0;
        f.vuln = 1.3;
        f.tint(0xff8060);
        a.quip(f.x, f.cy - 150, 'OVERHEATED: ARMOUR 0', '#ffd23f', 38);
        a.sfx('sfx_ironheel_vent');
        a.sc.time.delayedCall(3000, () => {
          if (!f.alive) return;
          f.armor = Number(f.brain.armorWas ?? 6);
          f.vuln = 1;
          f.tint(null);
        });
      }
      // steam bursts (less often once the press line is running, and never on top of a rocket warning)
      steam.every = hz.cooldown(7) * (f.phase >= 3 ? 1.4 : 1);
      if (steam.tick(dt)) {
        if (a.now() < rocketBusyUntil) steam.t = 1;
        else steamBurst(f, a);
      }
      if (f.phase < 3) return;
      const deep = hz.rank >= 3;
      for (const s of pistons) {
        if (s.lockT > 0) {
          s.lockT -= dt;
          if (s.lockT <= 0) s.valve.clearTint();
        }
        s.col.setPosition(s.p.x, s.p.y + 30);
        s.valve.setPosition(s.p.x + s.p.radius * 0.95, s.p.y + 40);
      }
      if (press.tick(dt)) {
        const free = pistons.filter((s) => s.lockT <= 0 && !s.p.dead);
        const s = rnd(free);
        if (s) {
          // hiss + steam one second before it moves
          const puff = a.sc.add.image(s.p.x, s.p.y + 40, 'p_steam').setAlpha(0.8).setScale(0.6);
          a.fxLayer.add(puff);
          a.sc.tweens.add({ targets: puff, y: puff.y - 120, alpha: 0, scale: 1, duration: 1000, onComplete: () => puff.destroy() });
          a.sfx('sfx_ironheel_press');
          a.sc.time.delayedCall(1000, () => {
            if (!f.alive || s.lockT > 0) return;
            // Extra Hot and up raise in two steps of 65
            s.lift = deep ? Math.min(130, s.lift + 65) : s.lift > 0 ? -30 : Math.random() < 0.7 ? 130 : -30;
            s.p.setLift(s.lift);
            a.quip(s.p.x, s.p.y - 120, s.lift > 0 ? 'RAISED!' : 'LOWERED', s.lift > 0 ? '#ff8a6a' : '#9ad8ff', 34);
          });
        }
      }
      if (rockets.tick(dt)) {
        // rockets only reach pizzas a piston has raised: locked valves really do protect them
        const targets = pistons.filter((s) => s.lift > 0 && !s.p.dead).map((s) => s.p).slice(0, 2);
        if (targets.length) {
          rocketBusyUntil = a.now() + 2.5;
          a.sfx('sfx_ironheel_rocket', { volume: 0.6 });
        }
        for (const p of targets) {
          mark(a, 'p_reticle', p.x, p.surfaceY - 30, 2);
          a.sc.time.delayedCall(2000, () => {
            if (!f.alive || f.stunT > 0 || !a.inWave()) return;
            a.fx.explosion(p.x, p.surfaceY, 160);
            a.sfx('sfx_explosion', { volume: 0.7 });
            a.hitPizza(p, 1, 'ROCKET!');
          });
        }
      }
    },
    onDeath: () => {
      blast?.end();
      blast = null;
      clearPistons();
    },
  };
};

// ——— 5. Sandcastle Sam ———

const sandcastle = (): Brain => {
  const covers = new Covers();
  const walls = new Every(8, 2);
  const lane = new Every(3.5, 3);
  const drop = new Every(5, 2.5);
  let pending = false;
  /** He holds still over the pizza while he shakes the sand loose. */
  let h: Hold | null = null;
  const endHold = () => {
    h?.release();
    h = null;
  };
  return {
    names: ['SAND WALLS', 'HIGH TIDE BUILDER', 'ENRAGED'],
    info: [
      'Sand walls cover every lane but his: feet behind them wait, safe · smack the walls to wash them away',
      'Walls, and between them he drops sand that freezes a pizza\'s perk · smack him twice while he shakes',
      'Everything faster · clear the walls, interrupt the sand',
    ],
    onPhase: (f, ph) => {
      if (ph >= 3) f.enraged = true;
    },
    upkeep: (_f, _dt, a) => covers.tick(a),
    update: (f, dt, a) => {
      h?.tick(dt);
      if (!a.inWave()) return endHold();
      const hz = heat(a);
      // the next walls only come once the last ones are down
      walls.every = hz.cooldown(8);
      if (!pending && !covers.live().length && !f.brain.windup && walls.tick(dt)) {
        pending = true;
        a.quip(f.x, f.cy - 150, 'SAND WALLS!', '#f8dca0', 44);
        a.sfx('sfx_sandcastle_shovel');
        f.tint(0xffe0a0);
        const sy = Number(f.brain.baseSY ?? f.root.scaleY);
        a.sc.tweens.add({ targets: f.root, scaleY: { from: sy, to: sy * 0.9 }, duration: 220, yoyo: true, repeat: 1, onComplete: () => f.root.setScale(f.root.scaleX, sy) });
        a.sc.time.delayedCall(800, () => {
          pending = false;
          f.tint(null);
          if (!f.alive || !a.inWave()) return;
          const mine = laneOf(a, f);
          a.sfx('sfx_sandcastle_walls');
          for (const p of a.alivePizzas()) if (p !== mine) covers.add(a, p, { key: 'p_sandcol', hits: hz.hits(3), slow: false, reset: false, label: 'WASHED AWAY!', sec: hz.windup(7), raise: p.radius * 0.36 });
        });
      }
      if (f.phase < 2) return;
      // he changes lanes often
      lane.every = hz.cooldown(3.5);
      if (due(lane, dt, f.state === 'hover' && !f.brain.windup && !h)) {
        const p = rnd(a.alivePizzas().filter((q) => q !== f.target));
        if (p) f.target = p;
      }
      // between walls: shake, then pour sand on the pizza below to freeze its perk
      drop.every = hz.cooldown(5);
      if (due(drop, dt, !pending && !covers.live().length && f.state === 'hover' && !f.brain.windup && !h)) {
        // he scoots over to another table to pour (another of his frequent lane changes)
        h = hold(a, f, rnd(a.alivePizzas().filter((q) => q !== laneOf(a, f))) ?? laneOf(a, f));
        if (!h) return;
        h.shake = 4;
        const p = h.p;
        const wu = hz.windup(1.3);
        mark(a, 'p_reticle', p.x, p.surfaceY - 30, wu, 0.7);
        // smacked out of it or not, he lets the lane go once the pour is over
        a.sc.time.delayedCall(wu * 1000 + 450, endHold);
        windup(a, f, '', wu, 'HIGH TIDE!', 2, () => {
          if (p.dead || !a.inWave()) return;
          const s = a.sc.add.image(f.x, f.y, 'p_dough').setTint(0xf0d090).setScale(0.3);
          a.fxLayer.add(s);
          a.sfx('sfx_sandcastle_pour');
          a.sc.tweens.add({
            targets: s,
            x: p.x,
            y: p.surfaceY - 20,
            scale: 0.75,
            duration: 380,
            ease: 'Quad.In',
            onComplete: () => {
              a.fx.puff(p.x, p.surfaceY - 20, 14);
              a.sfx('sfx_sandcastle_sandland');
              a.sc.tweens.add({ targets: s, alpha: 0, delay: 500, duration: 500, onComplete: () => s.destroy() });
              if (!p.dead && f.alive && a.inWave()) a.freezePerk(p, hz.stun(6));
            },
          });
        });
      }
    },
    onSmacked: (f, a) => {
      hitWindup(f, a);
      return false;
    },
    onDeath: () => {
      covers.clear();
      endHold();
    },
  };
};

// ——— 6. King Honk ———

/** A cream splat on the screen, bigger than the kit's (King Honk's new pies). */
function bigSplat(a: Arena, x: number, y: number, hits: number): void {
  const img = a.sc.add.image(x, y, 'p_creamsplat').setScale(0.3).setAlpha(0.97).setAngle((Math.random() - 0.5) * 30);
  a.fxLayer.add(img);
  // it lands with a squash, then the cream slowly slides down the screen
  a.sc.tweens.add({ targets: img, scaleX: 1.08, scaleY: 1.0, duration: 260, ease: 'Back.Out' });
  a.sc.tweens.add({ targets: img, y: y + 60, duration: 9000, ease: 'Sine.In' });
  let left = hits;
  a.addClickable({
    x,
    y,
    r: 330,
    priority: 1,
    alive: () => left > 0,
    hit: () => {
      left--;
      a.fx.puff(x + (Math.random() - 0.5) * 220, y + (Math.random() - 0.5) * 160, 8);
      a.sfx('sfx_squish', { volume: 0.6, rate: 1.2 });
      if (left <= 0) {
        a.quip(x, y - 80, 'WIPED!', '#7dff9a', 44);
        a.sc.tweens.killTweensOf(img);
        a.sc.tweens.add({ targets: img, alpha: 0, scaleX: img.scaleX * 1.2, scaleY: 0.1, y: img.y + 120, duration: 260, ease: 'Quad.In', onComplete: () => img.destroy() });
      } else {
        // a wipe smears it thinner and paler
        a.sc.tweens.add({ targets: img, scaleX: img.scaleX * 0.85, scaleY: img.scaleY * 0.78, alpha: 0.8, duration: 140, ease: 'Quad.Out' });
      }
    },
  });
  a.sc.time.delayedCall(9000, () => {
    if (left > 0) {
      left = 0;
      a.sc.tweens.add({ targets: img, alpha: 0, duration: 600, onComplete: () => img.destroy() });
    }
  });
}

const clownking = (): Brain => {
  const decoys = new Every(9, 1);
  const pie = new Every(6, 3);
  const honk = new Every(6.5, 3);
  /** The real King and his decoys, while a shuffle is on the table. */
  let trio: Foot[] = [];
  let shuffling = false;
  /** Three lanes as far apart as the table allows (the outer pizzas and the middle one), so the big
   * shoes never overlap; with fewer than three pizzas, spread evenly across the table. */
  const lanes = (a: Arena): number[] => {
    const ps = [...a.alivePizzas()].sort((p, q) => p.x - q.x);
    if (ps.length < 3) return [W * 0.24, W * 0.5, W * 0.76];
    const inner = ps.slice(1, -1).sort((p, q) => Math.abs(p.x - W / 2) - Math.abs(q.x - W / 2))[0];
    return [ps[0].x, inner.x, ps[ps.length - 1].x];
  };
  /** Each shoe aims at the pizza under its lane, and no two share one while there are enough. */
  const assign = (a: Arena) => {
    const taken = new Set<Pizza>();
    for (const o of trio) {
      if (o.laneX === null || o.state === 'stomp') {
        if (o.target) taken.add(o.target);
        continue;
      }
      const lx = o.laneX;
      const ps = [...a.alivePizzas()].sort((p, q) => Math.abs(p.x - lx) - Math.abs(q.x - lx));
      const t = ps.find((p) => !taken.has(p)) ?? ps[0] ?? null;
      if (t) taken.add(t);
      // mid-dive shoes keep their pizza unless it's gone
      if (o.state === 'descend' && o.target && !o.target.dead) continue;
      o.target = t;
    }
  };
  const shuffle = (f: Foot, a: Arena) => {
    shuffling = true;
    // old decoys vanish in a puff as the King leaps off the top of the screen
    for (const o of a.allFeet()) {
      if (o.alive && o.brain.decoy) {
        a.fx.puff(o.cx, o.cy, 10);
        o.die();
      }
    }
    f.puppet = true;
    f.shielded = true;
    a.quip(f.x, f.cy - 160, 'WHICH ONE IS REAL?', '#b06bff', 42);
    a.sfx('sfx_clownking_leap');
    a.sc.tweens.add({
      targets: f,
      y: -420,
      duration: 450,
      ease: 'Back.In',
      onComplete: () => {
        if (!f.alive) return (shuffling = false);
        const team: Foot[] = [f];
        for (let i = 0; i < 2; i++) {
          const d = a.spawn(f.type.id, null, f.x);
          if (!d) continue;
          d.brain.decoy = true;
          d.maxHp = d.hp = 1;
          d.armor = 0;
          // identical in every visible way: same phase speed, same hurry
          d.phase = f.phase;
          d.hurry = f.hurry;
          d.speedMul = f.speedMul;
          d.setPhaseAura(auraFor(f.phase));
          d.puppet = true;
          d.y = -420;
          team.push(d);
        }
        const xs = lanes(a);
        const order = Phaser.Utils.Array.Shuffle([...team]);
        order.forEach((o, i) => {
          o.laneX = xs[i];
          o.x = xs[i];
          o.y = -420;
          // smaller and lower than the King's usual hover, so three whole shoes fit side by side
          o.setSize(SHUFFLE_SIZE, 0);
          o.hoverY = HOVER_Y + 130;
        });
        // feet already diving under the three shoes back off (the lanes are the shoes' now)
        for (const o of a.allFeet()) {
          if (!o.alive || o.isBossLike || (o.state !== 'descend' && o.state !== 'stomp')) continue;
          if (xs.some((x) => Math.abs(o.x - x) < f.meta.halfWidth * f.scale + 40)) {
            o.setState('lift');
            o.vy = -650;
          }
        }
        f.brain.baseSX = f.root.scaleX;
        f.brain.baseSY = f.root.scaleY;
        trio = team;
        // they drop back in a random order, so the first one down tells you nothing
        Phaser.Utils.Array.Shuffle([...order]).forEach((o, k) => {
          a.sc.time.delayedCall(250 + k * 330, () => {
            if (!o.alive) return;
            o.puppet = false;
            assign(a);
            o.setState('enter');
            a.sfx('sfx_clownking_decoydrop', { rate: 0.9 + k * 0.1 });
            if (o === f) {
              f.shielded = false;
              shuffling = false;
            }
          });
        });
      },
    });
  };
  return {
    names: ['HONK', 'DECOY SHOES', 'CREAM PIE'],
    info: ['Winds up a horn blast that stuns your peel · smack it twice to stop it', 'Leaps away and drops back with two decoys in random lanes · decoys pop in one hit: find the real one', 'Throws big cream pies that cover the screen · smack the pie in flight, or wipe the splat'],
    onSmacked: (f, a) => {
      hitWindup(f, a, 1);
      return false;
    },
    update: (f, dt, a) => {
      // the shuffle holds while the King is off screen
      if (shuffling) return;
      if (f.phase === 1 && honk.tick(dt) && !f.brain.windup) {
        a.sfx('sfx_clownking_honkwind');
        windup(a, f, '', 1.3, 'HONK…', 2, () => {
          if (f.y < 100 || shuffling) return; // phase 2 began mid wind-up and he's leapt away
          a.sfx('sfx_clownking_honk');
          a.fx.ring(f.x, f.cy, 0xff3d7f, 1.4, 1);
          a.stunPeel(1, 'HONKED!');
        });
      }
      trio = trio.filter((o) => o.alive);
      if (trio.length && !trio.some((o) => o !== f)) {
        // all decoys popped: the King is free to roam again, back to full size
        f.laneX = null;
        f.hoverY = null;
        f.setSize(1);
        a.sc.time.delayedCall(300, () => {
          f.brain.baseSX = f.root.scaleX;
          f.brain.baseSY = f.root.scaleY;
        });
        trio = [];
      }
      // each shoe keeps to its own lane, aiming at the pizza under it
      if (trio.length) assign(a);
      // due every 9 s; it waits for the King to be hovering, never yanking him out of a stomp
      if (f.phase >= 2) decoys.t -= dt;
      if (f.phase >= 2 && decoys.t <= 0 && f.state === 'hover') {
        decoys.t = decoys.every;
        shuffle(f, a);
      }
      if (f.phase >= 3 && pie.tick(dt)) {
        const x = 340 + Math.random() * 1240;
        const y = 300 + Math.random() * 300;
        // it leaves from his toe, in view even while he hovers high
        const img = a.sc.add.image(f.x, Math.max(f.cy, 240), 'p_pie2').setScale(0.45);
        a.fxLayer.add(img);
        a.sfx('sfx_clownking_pie');
        a.quip(f.x, f.cy - 160, 'PIE!', '#ffffff', 44);
        let blocked = false;
        // a slow lob that grows as it comes at the screen: there's time to smack it out of the air
        a.sc.tweens.add({
          targets: img,
          x,
          y,
          angle: 360,
          scale: 1.05,
          duration: 1150,
          ease: 'Quad.In',
          onComplete: () => {
            if (blocked) return;
            blocked = true;
            img.destroy();
            if (!f.alive || !a.inWave()) return;
            a.sfx('sfx_clownking_piesplat');
            a.shake(200, 0.006);
            bigSplat(a, x, y, 2);
          },
        });
        a.addClickable({
          get x() {
            return img.x;
          },
          get y() {
            return img.y;
          },
          r: 150,
          priority: 2,
          alive: () => !blocked,
          hit: () => {
            if (blocked) return;
            blocked = true;
            a.fx.impact(img.x, img.y, true);
            a.quip(img.x, img.y - 60, 'BLOCKED!', '#7dff9a', 36);
            a.sfx('sfx_clownking_piesplat', { volume: 0.6, rate: 1.3 });
            a.sc.tweens.add({ targets: img, alpha: 0, y: img.y - 300, duration: 300, onComplete: () => img.destroy() });
          },
        });
      }
    },
  };
};

export const brains: Record<string, () => Brain> = { headwaiter, bigfoot, sweep, ironheel, sandcastle, clownking };
