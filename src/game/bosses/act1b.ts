// Boss brains, Stages 4–6: shortorder, trex, iceskate, colossus, ufotoe, cosmiccroc.
// Shared helpers and the heat scaling live in ./kit.ts.

import Phaser from 'phaser';
import { ui } from '../../ui/ui';
import type { Arena } from '../arena';
import type { Foot } from '../Foot';
import type { Pizza } from '../Pizza';
import { type Brain, type Prop, Every, dropOn, heat, hitProp, laneOf, mark, retreat, rnd, twin } from './kit';

// ——— Helpers for this batch ———

/** Temporary speed-ups on regular feet. The scene resets `hurry` every frame, so these go on speedMul
 * and are put back when they run out (or the fight ends). */
class Boosts {
  private m = new Map<Foot, { base: number; until: number }>();
  add(a: Arena, o: Foot, mult: number, sec: number): boolean {
    const e = this.m.get(o);
    if (e) {
      e.until = Math.max(e.until, a.now() + sec);
      o.speedMul = e.base * mult;
      return false;
    }
    this.m.set(o, { base: o.speedMul, until: a.now() + sec });
    o.speedMul *= mult;
    return true;
  }
  tick(a: Arena): void {
    for (const [o, e] of this.m) {
      if (o.alive && a.now() < e.until) continue;
      if (o.alive) o.speedMul = e.base;
      this.m.delete(o);
    }
  }
  clear(): void {
    for (const [o, e] of this.m) if (o.alive) o.speedMul = e.base;
    this.m.clear();
  }
}

/** Regular feet that are on the table (not waiting off screen, not a boss, not being eaten). */
const regulars = (a: Arena): Foot[] => a.allFeet().filter((o) => o.alive && !o.isBossLike && !o.held && !o.puppet && o.y > 0);

/** The run's base smack damage: anything well above it is a critical hit. */
function bigHit(a: Arena, dmg: number): boolean {
  const base = (a.sc as unknown as { run?: { stats?: { damage?: number } } }).run?.stats?.damage ?? 10;
  return dmg >= base * 1.6;
}

/** Refresh the boss bar after a heal (it only refreshes on damage otherwise). */
function syncBar(a: Arena, f: Foot): void {
  ui.hud.setBoss(f.type.name, f.hp / f.maxHp, f.type.mini ? Math.max(1, a.bossPhases() - 1) : a.bossPhases(), f.phase);
}

// ——— Stage 4 mini-boss: SHORT-ORDER SHOE ———

const shortorder = (): Brain => {
  let next = 3;
  let busy = false;
  let hand: Prop | null = null;
  let arm: Phaser.GameObjects.Graphics | null = null;
  let endRetreat: (() => void) | null = null;
  const finish = (f: Foot) => {
    busy = false;
    endRetreat?.();
    endRetreat = null;
    f.pinned = false;
  };
  /** Every other foot steps back, and a fast hand lunges in from the side for a marked pizza. */
  const orderUp = (f: Foot, a: Arena) => {
    const h = heat(a);
    const p = rnd(a.alivePizzas());
    if (!p) return;
    busy = true;
    f.pinned = true;
    endRetreat = retreat(a);
    const warn = h.windup(0.8);
    const slices = h.slices(f.phase >= 2 ? 2 : 1);
    const hits = h.hits(3);
    // edge pizzas get reached from their own side; the middle one from either
    const fromLeft = p.x < 700 ? true : p.x > 1220 ? false : Math.random() < 0.5;
    const dir = fromLeft ? 1 : -1;
    const lunge = 0.35;
    // more hits needed = more time: it creeps the last stretch so it's always catchable
    const creep = 2.4 + hits * 0.45;
    const gy = p.surfaceY - 70;
    const start = { x: fromLeft ? -180 : 2100, y: gy - 40 };
    const hold = { x: p.x - dir * 300, y: gy - 30 };
    const grab = { x: p.x - dir * 70, y: gy };
    mark(a, 'p_reticle', p.x, p.surfaceY - 30, warn + lunge + creep, 0.75);
    mark(a, 'p_ticket', p.x, p.surfaceY - 200, warn + 0.6);
    a.quip(p.x, p.surfaceY - 130, slices > 1 ? 'RUSH ORDER!' : 'ORDER UP!', '#ffffff', 40);
    a.sfx('sfx_warning', { volume: 0.4, rate: 1.2 });
    a.sc.time.delayedCall(warn * 1000, () => {
      if (!f.alive || !a.inWave() || p.dead) {
        finish(f);
        return;
      }
      a.sfx('sfx_whoosh', { volume: 0.8, rate: 1.3 });
      const t0 = a.sc.time.now;
      arm = a.sc.add.graphics();
      a.fxLayer.add(arm);
      const at = () => {
        const t = (a.sc.time.now - t0) / 1000;
        if (t < lunge) {
          const k = 1 - (1 - t / lunge) ** 2;
          return { x: start.x + (hold.x - start.x) * k, y: start.y + (hold.y - start.y) * k };
        }
        const k = Math.min(1, (t - lunge) / creep);
        // grabby fingers: a little twitch as it creeps in
        return { x: hold.x + (grab.x - hold.x) * k, y: hold.y + (grab.y - hold.y) * k + Math.sin(t * 18) * 4 };
      };
      const drawArm = (x: number, y: number) => {
        if (!arm) return;
        const wx = x - dir * 80;
        arm.clear();
        arm.lineStyle(52, 0x2a1810, 1).lineBetween(start.x - dir * 200, start.y, wx, y);
        arm.lineStyle(40, 0xf6f3ee, 1).lineBetween(start.x - dir * 200, start.y, wx, y);
        arm.lineStyle(6, 0xd8343f, 1).lineBetween(start.x - dir * 200, start.y - 8, wx, y - 8);
      };
      const done = (got: boolean) => {
        const img = hand?.img;
        hand = null;
        const g = arm;
        arm = null;
        // the arm whips back out the way it came (with a slice, if it got one)
        const back = { x: start.x - dir * 200, y: start.y };
        if (got && img) {
          const ghost = a.sc.add.image(img.x, img.y, 'p_order_hand').setScale(0.85).setFlipX(!fromLeft);
          a.fxLayer.add(ghost);
          a.sc.tweens.add({ targets: ghost, x: back.x, y: back.y, duration: 380, ease: 'Quad.In', onComplete: () => ghost.destroy() });
        }
        if (g) a.sc.tweens.add({ targets: g, alpha: 0, duration: 250, onComplete: () => g.destroy() });
        finish(f);
      };
      hand = hitProp(a, {
        key: 'p_order_hand',
        x: start.x,
        y: start.y,
        scale: 0.85,
        hits,
        r: 110,
        sec: lunge + creep,
        follow: () => {
          const q = at();
          drawArm(q.x, q.y);
          return q;
        },
        label: 'ORDER CANCELLED!',
        onClear: () => done(false),
        onFail: () => {
          if (f.alive && !p.dead && a.inWave()) a.hitPizza(p, slices, slices > 1 ? 'TWO TO GO!' : 'TO GO!');
          done(true);
        },
      });
      hand.img.setFlipX(!fromLeft);
    });
  };
  return {
    names: ['ORDER UP', 'RUSH HOUR'],
    info: ['The feet step back and a grabbing hand reaches for the marked pizza · whack the hand before it grabs a slice', 'Same hand, but it grabs two slices · whack it before it reaches the pizza'],
    update: (f, dt, a) => {
      if (busy || !a.inWave()) return;
      next -= dt;
      if (next > 0 || f.puppet) return;
      next = heat(a).cooldown(f.phase >= 2 ? 6.5 : 8);
      orderUp(f, a);
    },
    onDeath: (f) => {
      hand?.destroy();
      hand = null;
      arm?.destroy();
      arm = null;
      finish(f);
    },
  };
};

// ——— Stage 4 boss: T-REX TOES ———

const trex = (): Brain => {
  const roar = new Every(9, 4);
  let dinoT = 3;
  let snackT = 4;
  let roaring = 0;
  let snacking = false;
  let started = false;
  let lastSlam = -1;
  const dinos: Prop[] = [];
  const extra = new Set<Foot>();
  /** Set when the T-Rex goes down: queued dinos stay home. */
  let dead = false;
  let marks: Phaser.GameObjects.Image[] = [];
  const keep = (m: Phaser.GameObjects.Image) => {
    marks = marks.filter((o) => o.active);
    marks.push(m);
  };

  /** Baby dinos dash along the front of the table for marked pizzas, each from the far side. */
  const hungryDinos = (a: Arena) => {
    const h = heat(a);
    const n = [1, 1, 2, 2, 3][h.rank];
    const speed = [330, 380, 430, 480, 540][h.rank];
    const pause = h.windup(1);
    const y = 1000;
    const ps = [...a.alivePizzas()].sort(() => Math.random() - 0.5).slice(0, n);
    ps.forEach((p, i) => {
      // start as far from its pizza as the screen allows
      const fromLeft = p.x > 960;
      const sx = fromLeft ? 90 : 1830;
      const run = Math.abs(p.x - sx) / speed;
      const delay = i * 0.7;
      a.sc.time.delayedCall(delay * 1000, () => {
        if (!a.inWave() || p.dead || dead) return;
        // broadcast: the target first, then the dino pops in, flashes and pauses before it runs
        const ret = mark(a, 'p_reticle', p.x, p.surfaceY - 30, 0.5 + pause + run, 0.75);
        keep(ret);
        a.quip(p.x, p.surfaceY - 150, 'HUNGRY!', '#9cff6a', 38);
        a.sc.time.delayedCall(500, () => {
          if (!a.inWave() || p.dead || dead) return;
          const t0 = a.sc.time.now;
          a.sfx('sfx_warning', { volume: 0.35, rate: 1.6, throttle: 200 });
          const prop = hitProp(a, {
            key: 'p_babydino',
            x: sx,
            y,
            scale: 0.8,
            hits: 1,
            r: 95,
            badgeDy: -95,
            sec: pause + run,
            follow: () => {
              const t = (a.sc.time.now - t0) / 1000;
              if (t < pause) return { x: sx, y };
              const k = Math.min(1, (t - pause) / run);
              return { x: sx + (p.x - sx) * k, y: y - Math.abs(Math.sin(t * 14)) * 14 };
            },
            label: 'BONK!',
            onFail: () => {
              if (!p.dead && a.inWave() && !dead) a.hitPizza(p, h.slices(1), 'CHOMPED!', '#9cff6a');
            },
          });
          prop.img.setFlipX(!fromLeft);
          dinos.push(prop);
          // flash white while it waits, then it's off
          const blink = a.sc.time.addEvent({
            delay: 120,
            repeat: Math.max(1, Math.floor((pause * 1000) / 120) - 1),
            callback: () => {
              if (!prop.alive()) return;
              if (prop.img.isTinted) prop.img.clearTint();
              else prop.img.setTintFill(0xffffff);
            },
          });
          a.sc.time.delayedCall(pause * 1000, () => {
            blink.remove();
            if (prop.alive()) {
              prop.img.clearTint();
              a.sfx('sfx_whoosh', { volume: 0.5, rate: 1.5 });
            }
          });
        });
      });
    });
  };

  /** He shakes, swings over to the furthest foot and eats it to heal. Can't be stopped. */
  const snackTime = (f: Foot, a: Arena): boolean => {
    const pool = regulars(a);
    if (!pool.length) return false;
    const v = pool.reduce((best, o) => (Math.abs(o.x - f.x) > Math.abs(best.x - f.x) ? o : best));
    snacking = true;
    f.puppet = true;
    v.puppet = true;
    v.shielded = true;
    v.tint(0xffd0a0);
    const tell = 1.2;
    const home = { x: f.x, y: f.y };
    a.quip(f.x, f.cy - 190, 'SNACK TIME!', '#ffb03d', 54);
    a.quip(v.x, Math.max(140, v.cy - 140), 'UH OH…', '#ffffff', 34);
    keep(mark(a, 'p_reticle', v.cx, v.cy, tell + 0.6, 0.9));
    a.sfx('sfx_warning', { volume: 0.5, rate: 0.8 });
    // the shake
    const shake = a.sc.time.addEvent({ delay: 40, repeat: Math.floor((tell * 1000) / 40), callback: () => f.alive && (f.x = home.x + (Math.random() - 0.5) * 30) });
    a.sc.time.delayedCall(tell * 1000, () => {
      shake.remove();
      if (!f.alive) return;
      if (!v.alive) {
        snacking = false;
        f.puppet = false;
        return;
      }
      a.sfx('sfx_whoosh', { volume: 1, rate: 0.6 });
      a.sc.tweens.add({
        targets: f,
        x: v.x,
        y: Math.max(v.y, 220),
        duration: 550,
        ease: 'Back.In',
        onComplete: () => {
          if (!f.alive) return;
          a.shake(250, 0.008);
          a.quip(v.x, Math.max(160, v.cy - 120), 'CHOMP!', '#ff4d3d', 58);
          a.sfx('sfx_squish', { volume: 1, rate: 0.7 });
          if (v.alive) {
            v.setState('dying');
            v.shadow.setVisible(false);
            a.sc.tweens.add({ targets: v.root, scaleX: 0, scaleY: 0, y: f.cy, duration: 260, ease: 'Quad.In', onComplete: () => v.destroy() });
          }
          const heal = Math.round(f.maxHp * [0.03, 0.04, 0.05, 0.06, 0.07][heat(a).rank]);
          f.hp = Math.min(f.maxHp, f.hp + heal);
          a.fx.ring(f.cx, f.cy, 0x7dff9a, 1.6, 0.5);
          a.quip(f.x + 170, f.cy + 40, `+${heal} HP`, '#7dff9a', 46);
          syncBar(a, f);
          // he stays over this lane: the move swung him across the table
          f.target = laneOf(a, f);
          a.sc.time.delayedCall(350, () => {
            snacking = false;
            if (!f.alive) return;
            f.puppet = false;
            f.setState('hover');
          });
        },
      });
    });
    return true;
  };

  return {
    names: ['HUNGRY DINOS', 'SNACK TIME', 'ROAR'],
    info: [
      'Baby dinos run along the table for the marked pizzas · one whack each before they reach it',
      'Shakes, then swings over and eats one of his own feet to heal · it can\'t be stopped: clear the feet to starve him',
      'A deep breath, then a roar: every foot hurries and stomps twice · Peel Slam during the roar to stop it',
    ],
    update: (f, dt, a) => {
      if (!started) {
        started = true;
        // only dinos join this fight: anything else already on the table runs for it
        a.setMinions(['dino']);
        for (const o of a.allFeet()) {
          if (!o.alive || o.isBossLike || o.type.id === 'dino') continue;
          a.quip(o.x, Math.max(140, o.cy - 120), 'EEK!', '#ffffff', 34);
          o.setState('dying');
          o.shadow.setVisible(false);
          a.sc.tweens.add({ targets: o.root, y: -600, duration: 600, delay: Math.random() * 300, ease: 'Back.In', onComplete: () => o.destroy() });
        }
      }
      if (!a.inWave()) return;
      if (roaring > 0) {
        roaring -= dt;
        // a slam during the roar cancels it
        if (a.slammedAt() !== lastSlam && a.now() - a.slammedAt() < 0.25) {
          lastSlam = a.slammedAt();
          roaring = 0;
          a.cancelHurry();
          a.quip(f.x, f.cy - 150, 'ROAR STOPPED!', '#7dff9a', 46);
        }
        // every foot's stomp lands twice while the roar lasts
        for (const o of a.allFeet()) {
          if (!o.alive || o.state !== 'stomp') {
            extra.delete(o);
            continue;
          }
          if (extra.has(o)) continue;
          extra.add(o);
          const p = o.target;
          a.sc.time.delayedCall(240, () => {
            if (!o.alive || !f.alive || !p || p.dead || !a.inWave()) return;
            a.sc.tweens.add({ targets: o, y: o.y - 50, duration: 80, yoyo: true, ease: 'Quad.Out' });
            a.hitPizza(p, 1, 'AGAIN!');
          });
        }
        if (roaring <= 0) {
          f.vuln = 1;
          extra.clear();
        }
      }
      if (snacking) return;
      // hungry dinos run in every phase
      dinoT -= dt;
      if (dinoT <= 0) {
        dinoT = heat(a).cooldown(7);
        hungryDinos(a);
      }
      if (f.phase >= 2) snackT -= dt;
      if (f.phase >= 2 && !f.puppet && f.state === 'hover') {
        // never on top of a dino run that's just starting
        if (snackT <= 0 && dinoT > 2.5) {
          snackT = snackTime(f, a) ? heat(a).cooldown(13) : 2;
        }
      }
      if (f.phase >= 3 && roaring <= 0 && roar.tick(dt)) {
        // tell: a deep breath first, so there's time to get the slam ready
        a.quip(f.x, f.cy - 170, 'DEEP BREATH…', '#ffb0a0', 46);
        a.sfx('sfx_whoosh', { rate: 0.5, volume: 0.6 });
        a.sc.time.delayedCall(1000, () => {
          if (!f.alive || !a.inWave()) return;
          a.quip(f.x, f.cy - 170, 'ROOOOAR!', '#ff4d3d', 64);
          a.quip(960, 260, 'EVERY STOMP LANDS TWICE!', '#ffb0a0', 40);
          a.shake(600, 0.01);
          a.rumble(0.6, 600);
          a.sfx('sfx_warning');
          a.hurry(1.4, 3.5);
          roaring = 3.5;
          f.vuln = 1.6; // wide open while it roars
        });
      }
    },
    onDeath: (f, a) => {
      dead = true;
      a.setMinions(null);
      for (const d of dinos) d.destroy();
      dinos.length = 0;
      for (const m of marks) if (m.active) m.destroy();
      marks = [];
      extra.clear();
      f.vuln = 1;
      // a foot mid-snack goes back to normal
      for (const o of a.allFeet()) {
        if (o.alive && !o.isBossLike && o.puppet && o.shielded) {
          o.puppet = false;
          o.shielded = false;
          o.tint(null);
        }
      }
    },
  };
};

// ——— Stage 5 mini-boss: ICE SKATE IVY ———

const iceskate = (): Brain => {
  let snowT = 3;
  let swingT = 2;
  let swinging = 0;
  let snowy: Pizza | null = null;
  const boosts = new Boosts();
  const cleanup: (() => void)[] = [];

  /** Snow on one lane (never hers): a warning, then it freezes the feet in it, and smacking in it stuns the peel. */
  const snow = (f: Foot, a: Arena) => {
    const h = heat(a);
    const mine = laneOf(a, f);
    const p = rnd(a.alivePizzas().filter((q) => q !== mine && q !== f.target));
    if (!p) return;
    snowy = p;
    const half = p.radius * 1.05;
    const top = 70;
    const bottom = p.surfaceY + 50;
    const warn = h.windup(1.3);
    const dur = 4.5;
    const col = a.sc.add.graphics();
    a.fxLayer.add(col);
    col.fillStyle(0xbfe6ff, 0.16).fillRoundedRect(p.x - half, top, half * 2, bottom - top, 34);
    col.lineStyle(6, 0xbfe6ff, 0.85).strokeRoundedRect(p.x - half, top, half * 2, bottom - top, 34);
    const blink = a.sc.tweens.add({ targets: col, alpha: { from: 0.35, to: 1 }, duration: 260, yoyo: true, repeat: -1 });
    const cloud = a.sc.add.image(p.x, -80, 'p_ivy_cloud').setScale(0.95);
    a.fxLayer.add(cloud);
    a.sc.tweens.add({ targets: cloud, y: 90, duration: 500, ease: 'Back.Out' });
    a.quip(p.x, 260, 'SNOW INCOMING!', '#bfe6ff', 42);
    a.sfx('sfx_warning', { volume: 0.35, rate: 1.4 });
    let live = false;
    let over = false;
    let flakes: Phaser.Time.TimerEvent | null = null;
    const end = () => {
      if (over) return;
      over = true;
      live = false;
      if (snowy === p) snowy = null;
      flakes?.remove();
      blink.remove();
      a.sc.tweens.add({ targets: [col, cloud], alpha: 0, duration: 400, onComplete: () => {
        col.destroy();
        cloud.destroy();
      } });
    };
    cleanup.push(end);
    a.sc.time.delayedCall(warn * 1000, () => {
      if (over) return;
      if (!f.alive || !a.inWave() || p.dead) {
        end();
        return;
      }
      live = true;
      blink.remove();
      col.setAlpha(1);
      a.quip(p.x, 300, 'FROZEN LANE!', '#ffffff', 44);
      a.sfx('sfx_whoosh', { volume: 0.6, rate: 0.6 });
      const t0 = a.now();
      flakes = a.sc.time.addEvent({
        delay: 70,
        loop: true,
        callback: () => {
          if (!live) return;
          const fl = a.sc.add.image(p.x + (Math.random() - 0.5) * half * 1.8, 120, 'p_ivy_flake').setScale(0.6 + Math.random() * 0.5);
          a.fxLayer.add(fl);
          a.sc.tweens.add({ targets: fl, y: bottom - 20, x: fl.x + (Math.random() - 0.5) * 60, angle: 180, duration: 1300 + Math.random() * 500, onComplete: () => fl.destroy() });
          // everything in the lane freezes (and stays frozen until just after the snow stops)
          const left = dur - (a.now() - t0);
          for (const o of a.allFeet()) {
            if (!o.alive || o.isBossLike || o.held || Math.abs(o.x - p.x) > half) continue;
            if (!o.frozen) a.fx.frost(o.cx, o.cy);
            o.stun(Math.max(0.3, left + 0.4), true);
          }
        },
      });
      a.addClickable({
        x: p.x,
        y: (top + bottom) / 2,
        r: half,
        priority: 2,
        contains: (x, y) => Math.abs(x - p.x) < half && y > top && y < bottom,
        alive: () => live,
        hit: () => {
          a.stunPeel(h.stun(1.2), 'FROSTBITE!');
          a.fx.puff(a.peelPoint().x, a.peelPoint().y, 6);
          a.sfx('sfx_shield', { volume: 0.5, rate: 1.4 });
        },
      });
      a.sc.time.delayedCall(dur * 1000, end);
    });
  };

  return {
    names: ['ICE TRAILS', 'TRIPLE AXEL'],
    info: ['Snow falls on one lane and freezes the feet in it · don\'t smack inside the snow or your peel freezes', 'Skates from lane to lane, speeding up the feet she passes · smack the fast ones first'],
    upkeep: (_f, _dt, a) => boosts.tick(a),
    update: (f, dt, a) => {
      if (!a.inWave()) return;
      snowT -= dt;
      if (snowT <= 0 && !snowy) {
        snowT = heat(a).cooldown(6) + 6;
        snow(f, a);
      }
      if (f.phase < 2) return;
      // triple axel: glide over to another lane every few seconds
      if (swinging > 0) {
        swinging -= dt;
        if (Math.random() < dt * 20) a.fx.glint(f.x + (Math.random() - 0.5) * 80, f.y - 20, 1);
        for (const o of a.allFeet()) {
          if (!o.alive || o.isBossLike || o.frozen || Math.abs(o.x - f.x) > 150) continue;
          if (boosts.add(a, o, 1.5, 4)) {
            a.quip(o.x, Math.max(140, o.cy - 110), 'FASTER!', '#d9c8ff', 30);
            o.flash(0xd9c8ff, 160);
          }
        }
      }
      swingT -= dt;
      if (swingT <= 0 && f.state === 'hover' && !f.puppet) {
        swingT = heat(a).cooldown(3.4);
        const cur = f.target;
        const others = a.alivePizzas().filter((q) => q !== cur && q !== snowy);
        // swing to the far side when she can: she crosses more lanes on the way
        const to = others.sort((p, q) => Math.abs(q.x - f.x) - Math.abs(p.x - f.x))[Math.random() < 0.6 ? 0 : others.length - 1];
        if (!to) return;
        f.target = to;
        f.stateT = 0;
        swinging = 1.3;
        a.quip(f.x, f.cy - 150, 'TRIPLE AXEL!', '#d9c8ff', 40);
        a.sfx('sfx_whoosh', { volume: 0.6, rate: 1.4 });
      }
    },
    onDeath: () => {
      for (const c of cleanup) c();
      cleanup.length = 0;
      boosts.clear();
    },
  };
};

// ——— Stage 5 boss: THE COLOSSUS ———

const colossus = (): Brain => {
  /** Phase 1 shell: armour pieces still on. */
  let pieces = 5;
  let chips = 0;
  let clangT = 0;
  const cracks: Phaser.GameObjects.Image[] = [];
  /** Phase 2 parry. */
  let parryT = 6;
  let stance = 0;
  let glintImg: Phaser.GameObjects.Image | null = null;
  let shieldImg: Phaser.GameObjects.Image | null = null;
  /** Phase 3: plates rebuilt by blacksmiths. */
  const plates: Phaser.GameObjects.Image[] = [];
  let smith: Foot | null = null;
  let smithT = 2.5;
  let smithAge = 0;
  let smithStage: 'come' | 'swing' = 'come';
  let smithWarned = false;
  let lastSlam = -1;
  const MAX_PLATES = 4;

  /** A spot on his armour, in the foot's local space. */
  const spot = (f: Foot, i: number) => {
    const w = f.meta.halfWidth * f.type.scale;
    const h = f.meta.footHeight * f.type.scale;
    const xs = [-0.35, 0.3, -0.05, 0.42, -0.45, 0.1];
    const ys = [-0.55, -0.38, -0.72, -0.62, -0.3, -0.25];
    return { x: xs[i % xs.length] * w, y: ys[i % ys.length] * h };
  };
  /** Where the glint and parry shield sit: over the toe cap, the part that's always on screen. */
  const guardY = (f: Foot) => f.y - f.meta.footHeight * f.scale * 0.32;
  /** Local foot point → world. */
  const world = (f: Foot, lx: number, ly: number) => ({ x: f.root.x + lx * f.root.scaleX, y: f.root.y + ly * f.root.scaleY });
  const shards = (a: Arena, x: number, y: number, n: number, burst = false) => {
    for (let i = 0; i < n; i++) {
      const s = a.sc.add.image(x, y, 'p_colossus_shard').setScale(0.6 + Math.random() * 0.6).setAngle(Math.random() * 360);
      a.fxLayer.add(s);
      const dx = (Math.random() - 0.5) * (burst ? 900 : 260);
      const up = burst ? 200 + Math.random() * 300 : 40 + Math.random() * 80;
      a.sc.tweens.add({ targets: s, x: x + dx, duration: burst ? 1100 : 900, ease: 'Linear' });
      a.sc.tweens.add({ targets: s, y: y - up, duration: burst ? 300 : 200, ease: 'Quad.Out', onComplete: () => {
        a.sc.tweens.add({ targets: s, y: 1150, angle: s.angle + (Math.random() - 0.5) * 720, duration: burst ? 900 : 800, ease: 'Quad.In', onComplete: () => s.destroy() });
      } });
    }
  };
  const crack = (f: Foot, a: Arena) => {
    pieces--;
    f.armor = Math.max(2, f.armor - 2);
    const at = spot(f, cracks.length);
    const img = a.sc.add.image(at.x, at.y, 'p_colossus_crack').setScale(0.75 + Math.random() * 0.25).setAngle(Math.random() * 360).setAlpha(0);
    f.root.add(img);
    cracks.push(img);
    a.sc.tweens.add({ targets: img, alpha: 1, scale: img.scale * 1.15, duration: 120, yoyo: false });
    const w = world(f, at.x, at.y);
    shards(a, w.x, w.y, 3);
    a.fx.impact(w.x, w.y, true);
    a.shake(160, 0.006);
    a.sfx('sfx_crit');
    if (pieces > 0) a.quip(f.x + 70, f.cy - 90, `CRACK! (${pieces} LEFT)`, '#e6ebf2', 40);
    else {
      a.quip(f.x, f.cy - 160, 'SHELL BROKEN!', '#7dff9a', 54);
      shards(a, f.cx, f.cy, 8, true);
    }
  };
  const addPlate = (f: Foot, a: Arena) => {
    const at = spot(f, plates.length + 1);
    const img = a.sc.add.image(at.x, at.y, 'p_colossus_plate').setScale(0);
    f.root.add(img);
    plates.push(img);
    a.sc.tweens.add({ targets: img, scale: 1.25, duration: 220, ease: 'Back.Out' });
    a.bossMove(f, 'IRON SHELL', 'Rebuilt armour: small hits do nothing · a crit or a Peel Slam knocks each plate off');
  };
  const dropPlate = (f: Foot, a: Arena) => {
    const img = plates.pop();
    if (!img) return;
    const w = world(f, img.x, img.y);
    img.destroy();
    shards(a, w.x, w.y, 4);
    a.fx.impact(w.x, w.y, true);
    a.sfx('sfx_crit');
    a.quip(f.x, f.cy - 150, plates.length ? `PLATE OFF! (${plates.length} LEFT)` : 'ARMOUR OFF!', '#7dff9a', 42);
    if (!plates.length) a.bossMove(f, 'SHATTERED', 'Blacksmiths come to rebuild his armour · smack them before they reach him');
  };
  const clearParry = () => {
    stance = 0;
    glintImg?.destroy();
    glintImg = null;
    shieldImg?.destroy();
    shieldImg = null;
  };
  /** The glint grows over his toe, then a shield snaps up: smacks while it's up are parried. */
  const glint = (f: Foot, a: Arena) => {
    const warn = heat(a).windup(1.1);
    glintImg = a.sc.add.image(f.x, guardY(f), 'p_colossus_glint').setScale(0.3).setAlpha(0.95);
    a.fxLayer.add(glintImg);
    a.sc.tweens.add({ targets: glintImg, scale: 1.7, angle: 90, duration: warn * 1000, ease: 'Sine.In' });
    a.quip(f.x, f.cy - 200, 'GLINT!', '#ffe14d', 50);
    a.sfx('sfx_combo', { volume: 0.6, rate: 1.8 });
    a.sc.time.delayedCall(warn * 1000, () => {
      glintImg?.destroy();
      glintImg = null;
      if (!f.alive || f.phase !== 2) return;
      stance = 1.5;
      shieldImg = a.sc.add.image(f.x, guardY(f), 'p_colossus_shield').setScale(0.2).setAlpha(0.95);
      a.fxLayer.add(shieldImg);
      a.sc.tweens.add({ targets: shieldImg, scale: 1.05, duration: 180, ease: 'Back.Out' });
      a.sfx('sfx_shield');
    });
  };
  const sendSmith = (f: Foot, a: Arena) => {
    // the pizza furthest from him, so the blacksmith has a long way to swing
    const ps = a.alivePizzas().sort((p, q) => Math.abs(q.x - f.x) - Math.abs(p.x - f.x));
    const s = ps[0] ? a.spawn('blacksmith', ps[0]) : null;
    if (!s) {
      smithT = 1;
      return;
    }
    smith = s;
    s.puppet = true;
    s.y = -200;
    smithAge = 0;
    smithStage = 'come';
    smithWarned = false;
    a.quip(s.x, 200, 'BLACKSMITH!', '#ff9a3d', 42);
  };
  const smithTick = (f: Foot, a: Arena, dt: number) => {
    const s = smith;
    if (!s) {
      smithT -= dt;
      if (smithT <= 0 && plates.length < MAX_PLATES) sendSmith(f, a);
      return;
    }
    if (!s.alive) {
      // killed: another one is on the way, quickly
      smith = null;
      smithT = 1.6;
      return;
    }
    smithAge += dt;
    const wait = heat(a).windup(3.2);
    if (smithStage === 'come') {
      // no free lane yet: it waits off the top like any other foot (never on top of one)
      if (s.held || s.laneX === null) {
        smithAge = 0;
        s.y += (-260 - s.y) * Math.min(1, dt * 4);
        return;
      }
      s.x += (s.laneX - s.x) * Math.min(1, dt * 3);
      s.y += (370 - s.y) * Math.min(1, dt * 3);
      if (!smithWarned && smithAge > wait - 1) {
        smithWarned = true;
        a.quip(s.x, Math.max(140, s.cy - 120), 'HAMMER TIME!', '#ff9a3d', 38);
        s.flash(0xff9a3d, 900);
      }
      if (smithAge > wait) {
        smithStage = 'swing';
        a.sfx('sfx_whoosh', { volume: 0.7, rate: 0.9 });
      }
      return;
    }
    // swing over until it touches him
    const side = Math.sign(s.x - f.x) || 1;
    const tx = f.x + side * (f.meta.halfWidth * f.scale * 0.7 + s.meta.halfWidth * s.scale * 0.5);
    // beside his sole, so the whole blacksmith is on screen when it lands the blow
    const ty = Math.max(f.y - 20, 380);
    const dx = tx - s.x;
    const dy = ty - s.y;
    const d = Math.hypot(dx, dy);
    const step = 1100 * dt;
    s.root.rotation = -side * 0.25;
    if (d > step + 10) {
      s.x += (dx / d) * step;
      s.y += (dy / d) * step;
      return;
    }
    s.x = tx;
    s.y = ty;
    // contact: hammer a fresh plate on, then head back up
    smith = null;
    smithT = heat(a).cooldown(7);
    a.fx.impact(f.x + side * f.meta.halfWidth * f.scale * 0.6, s.cy, true);
    a.sfx('sfx_shield', { volume: 0.9, rate: 0.8 });
    a.shake(150, 0.005);
    a.quip(s.x, Math.max(140, s.cy - 130), 'FRESH PLATE!', '#ff9a3d', 42);
    addPlate(f, a);
    s.setState('dying');
    s.shadow.setVisible(false);
    a.sc.tweens.add({ targets: s.root, y: -500, rotation: 0, duration: 700, delay: 250, ease: 'Back.In', onComplete: () => s.destroy() });
  };

  return {
    names: ['IRON SHELL', 'PARRY', 'SHATTERED'],
    info: [
      'Small hits only chip his shell · keep smacking (crits crack it at once) until it breaks, then pile on',
      'A big glint, then a shield snaps up · stop smacking while the shield is up',
      'Blacksmiths swing in to rebuild his armour · smack them first; a crit or Peel Slam knocks each plate off',
    ],
    onPhase: (f, ph, a) => {
      if (ph === 2) {
        // whatever shell is left falls away; the parry takes over
        if (pieces > 0) shards(a, f.cx, f.cy, 5, true);
        pieces = 0;
        f.armor = 2;
        parryT = 2.5;
      }
      if (ph === 3) {
        clearParry();
        // the armour shatters for good
        f.armor = 0;
        f.enraged = true;
        for (const c of cracks) c.destroy();
        cracks.length = 0;
        a.fx.explosion(f.cx, f.cy, 260);
        shards(a, f.cx, f.cy, 18, true);
        a.quip(f.x, f.cy - 200, 'SHATTERED!', '#ffffff', 60);
        a.setMinions(['stompalot']);
        smithT = 2.5;
      }
    },
    onSmacked: (f, a, x, y, dmg) => {
      if (f.phase === 1 && pieces > 0) {
        if (bigHit(a, dmg)) {
          crack(f, a);
          return false;
        }
        chips++;
        a.fx.puff(x, y, 3);
        if (chips >= [3, 4, 5, 5, 6][heat(a).rank]) {
          chips = 0;
          crack(f, a);
        } else if (a.now() > clangT) {
          clangT = a.now() + 0.5;
          a.quip(x, y - 50, 'CLANG!', '#c7ccd4', 30);
        }
        return true;
      }
      if (f.phase === 2 && stance > 0) {
        a.fx.ring(x, y, 0xffd34d, 0.9, 1);
        a.quip(f.x, f.y + 40, 'PARRIED!', '#ffd34d', 48);
        a.sfx('sfx_shield');
        if (shieldImg) a.sc.tweens.add({ targets: shieldImg, scale: { from: 1.2, to: 1.05 }, duration: 140 });
        return true;
      }
      if (f.phase >= 3 && plates.length) {
        if (bigHit(a, dmg)) {
          dropPlate(f, a);
          return false;
        }
        if (a.now() > clangT) {
          clangT = a.now() + 0.5;
          a.quip(x, y - 50, 'CLANG! (crit or slam)', '#c7ccd4', 28);
        }
        return true;
      }
      return false;
    },
    update: (f, dt, a) => {
      if (!a.inWave()) {
        clearParry();
        return;
      }
      if (f.phase === 2) {
        if (stance > 0) {
          stance -= dt;
          shieldImg?.setPosition(f.x, guardY(f));
          if (stance <= 0) {
            const s = shieldImg;
            shieldImg = null;
            if (s) a.sc.tweens.add({ targets: s, alpha: 0, scale: 0.6, duration: 200, onComplete: () => s.destroy() });
          }
        } else if (!glintImg) {
          parryT -= dt;
          if (parryT <= 0) {
            parryT = heat(a).cooldown(7);
            glint(f, a);
          }
        }
        glintImg?.setPosition(f.x, guardY(f));
      }
      if (f.phase >= 3) {
        // a Peel Slam knocks a plate off
        if (a.slammedAt() !== lastSlam && a.now() - a.slammedAt() < 0.25) {
          lastSlam = a.slammedAt();
          if (plates.length) dropPlate(f, a);
        }
        smithTick(f, a, dt);
      }
    },
    pierce: (f) => f.phase >= 3,
    onDeath: (_f, a) => {
      clearParry();
      a.setMinions(null);
      if (smith?.alive) smith.die();
      smith = null;
    },
  };
};

// ——— Stage 6 mini-boss: UFO TOE ———

const ufotoe = (): Brain => {
  interface Saucer {
    f: Foot;
    /** The pizza whose lanes it holds alone. */
    hold: Pizza | null;
    /** Seconds until its next lane hop. */
    t: number;
    beam: (() => void) | null;
  }
  // it hovers high over its lane, but low enough that the whole saucer is on screen to smack
  const HOLD_Y = 400;
  const saucers: Saucer[] = [];
  let twinFoot: Foot | null = null;

  /** The beam drops from the saucer onto the pizza in its own lane. Smack it to break it. */
  const fire = (s: Saucer, a: Arena, p: Pizza, sec: number) => {
    const f = s.f;
    const top = f.y + 30;
    const bottom = p.surfaceY - 20;
    const b = a.sc.add.image(p.x, bottom, 'p_beam').setOrigin(0.5, 1).setAlpha(0);
    b.setScale(1, (bottom - top) / b.height);
    a.fxLayer.add(b);
    a.sc.tweens.add({ targets: b, alpha: 0.85, duration: 200 });
    a.sfx('sfx_zap', { rate: 1.4, volume: 0.6 });
    a.quip(p.x, p.surfaceY - 160, 'TRACTOR BEAM!', '#a0ff8c', 36);
    let live = true;
    const end = () => {
      if (!live) return;
      live = false;
      s.beam = null;
      a.sc.tweens.add({ targets: b, alpha: 0, duration: 160, onComplete: () => b.destroy() });
    };
    s.beam = end;
    // the whole beam below the saucer is the target (the saucer itself stays smackable)
    const box = new Phaser.Geom.Rectangle(p.x - 75, top, 150, bottom - top);
    a.addClickable({ x: p.x, y: box.centerY, r: 110, priority: 2, contains: (x, y) => box.contains(x, y), alive: () => live, hit: () => {
      a.quip(p.x, p.surfaceY - 200, 'BEAM BROKEN!', '#7dff9a', 38);
      a.fx.impact(a.peelPoint().x, a.peelPoint().y, false);
      end();
    } });
    a.sc.time.delayedCall(sec * 1000, () => {
      if (!live) return;
      end();
      if (f.alive && !p.dead && a.inWave()) a.hitPizza(p, heat(a).slices(1), 'ABDUCTED!', '#a0ff8c');
    });
  };

  const release = (a: Arena, s: Saucer) => {
    if (s.hold) a.lockLane(s.hold, false);
    s.hold = null;
  };

  /** Hop to a pizza no other saucer holds: the feet there move out, and it hovers over that lane alone. */
  const hop = (s: Saucer, a: Arena) => {
    const held = saucers.filter((o) => o !== s && o.hold).map((o) => o.hold!);
    const cur = s.hold;
    const choices = a.alivePizzas().filter((p) => p !== cur && !held.includes(p));
    const p = rnd(choices) ?? (cur && !cur.dead ? cur : null);
    if (!p) return;
    release(a, s);
    s.hold = p;
    s.f.target = p;
    a.lockLane(p, true);
    const h = heat(a);
    const beam = h.windup(2.6);
    const settle = 0.9;
    s.t = settle + beam + 0.6;
    a.sc.time.delayedCall(settle * 1000, () => {
      if (s.f.alive && a.inWave() && s.hold === p && !p.dead) fire(s, a, p, beam);
    });
  };

  return {
    names: ['TRACTOR BEAM', 'DOUBLE ABDUCTION'],
    info: ['Holds a lane to itself and beams a slice off the pizza below · smack the beam to break it', 'A twin saucer (same health bar) beams a second lane · break both beams'],
    onPhase: (f, ph, a) => {
      if (ph === 2 && !twinFoot) {
        const t = twin(a, f);
        if (t) {
          twinFoot = t;
          // the twin's first beam lands a beat after the boss's, never at the same moment
          saucers.push({ f: t, hold: null, t: 1.6, beam: null });
        }
      }
    },
    update: (f, dt, a) => {
      if (!saucers.length) saucers.push({ f, hold: null, t: 0.5, beam: null });
      for (const s of saucers) {
        const u = s.f;
        if (!u.alive) continue;
        // the saucers never dive: they're moved by hand over the lane they hold
        u.puppet = true;
        if (u.state !== 'hover') u.setState('hover');
        const tx = s.hold && !s.hold.dead ? s.hold.x : u.x;
        u.x += (tx - u.x) * Math.min(1, dt * 4);
        u.y += (HOLD_Y + Math.sin(a.now() * 2 + (u === f ? 0 : 1.5)) * 12 - u.y) * Math.min(1, dt * 4);
        if (u !== f) {
          u.phase = f.phase;
          u.hp = f.hp;
        }
        if (!a.inWave()) continue;
        // the lane went away (its pizza died): find another straight away
        if (s.hold && s.hold.dead) s.t = Math.min(s.t, 0.2);
        s.t -= dt;
        if (s.t <= 0 && !s.beam) hop(s, a);
      }
    },
    onDeath: (_f, a) => {
      for (const s of saucers) {
        s.beam?.();
        release(a, s);
        if (s.f.alive) s.f.puppet = false;
      }
      saucers.length = 0;
      if (twinFoot?.alive) twinFoot.die();
      twinFoot = null;
    },
  };
};

// ——— Stage 6 boss: COSMIC CROC ———

/** Re-read the mouse's world point (the camera moved under a still mouse) and hand it to the scene's pointer. */
function refreshPointer(a: Arena): void {
  const ptr = a.sc.input.activePointer;
  if (!ptr || ptr.wasTouch || !ptr.moveTime) return;
  ptr.updateWorldPoint(a.sc.cameras.main);
  (a.sc as unknown as { movePointer?: (p: Phaser.Input.Pointer) => void }).movePointer?.(ptr);
}

const cosmiccroc = (): Brain => {
  const hole = new Every(11, 5);
  const meteor = new Every(5.5, 3);
  const boosts = new Boosts();
  let flipped = false;
  let holeEnd: (() => void) | null = null;

  /** Turn the whole world (not the DOM HUD) upside down, or back. */
  const flip = (a: Arena, on: boolean) => {
    if (flipped === on) return;
    flipped = on;
    const cam = a.sc.cameras.main;
    a.sc.tweens.killTweensOf(cam);
    // smacks land where the peel is drawn: keep the pointer's world point fresh while the camera turns
    a.sc.tweens.add({ targets: cam, rotation: on ? Math.PI : 0, duration: 1200, ease: 'Sine.InOut', onUpdate: () => refreshPointer(a), onComplete: () => refreshPointer(a) });
    if (on) {
      a.sfx('sfx_whoosh', { volume: 0.9, rate: 0.5 });
      a.rumble(0.5, 500);
    }
  };

  /** A black hole over one pizza: the feet over that pizza's lanes get pulled down onto it faster. */
  const blackHole = (f: Foot, a: Arena) => {
    // over a pizza the croc isn't on, so there are feet there to pull
    const mine = laneOf(a, f);
    const p = rnd(a.alivePizzas().filter((q) => q !== mine)) ?? rnd(a.alivePizzas());
    if (!p) return;
    const bh = a.sc.add.image(p.x, 330, 'p_blackhole').setScale(0.2);
    a.fxLayer.add(bh);
    a.sc.tweens.add({ targets: bh, scale: 1, duration: 400, ease: 'Back.Out' });
    a.sc.tweens.add({ targets: bh, angle: 360, duration: 2000, repeat: -1 });
    a.sfx('sfx_zap', { rate: 0.5 });
    a.quip(p.x, 200, 'BLACK HOLE!', '#b06bff', 44);
    let left = heat(a).hits(3);
    let open = true;
    const pulled = new Set<Foot>();
    const close = () => {
      if (!open) return;
      open = false;
      holeEnd = null;
      pull.remove();
      for (const o of pulled) if (o.alive) o.tint(null);
      a.sc.tweens.add({ targets: bh, scale: 0, duration: 300, onComplete: () => bh.destroy() });
    };
    holeEnd = close;
    a.addClickable({ x: p.x, y: 330, r: 110, priority: 2, alive: () => open, hit: () => {
      left--;
      a.fx.impact(p.x, 330, true);
      if (left <= 0) {
        a.quip(p.x, 260, 'CLOSED!', '#7dff9a', 40);
        close();
      }
    } });
    const pull = a.sc.time.addEvent({ delay: 100, loop: true, callback: () => {
      if (!open || p.dead) return;
      a.fx.ring(p.x, 330, 0xb06bff, 0.5, 0.6);
      for (const o of a.allFeet()) {
        if (!o.alive || o.isBossLike || o.target !== p) continue;
        // pulled: dive now, and faster
        boosts.add(a, o, 1.8, 0.5);
        if (o.state === 'hover') o.stateT = Math.max(o.stateT, o.hoverTime);
        if (!pulled.has(o)) {
          pulled.add(o);
          o.tint(0xc9a8ff);
        }
      }
    } });
    a.sc.time.delayedCall(6000, close);
  };

  return {
    names: ['METEOR', 'GRAVITY FLIP', 'BLACK HOLE'],
    info: [
      'Calls meteors onto the pizza below it · smack the meteor before it lands',
      'Turns the whole table upside down · keep smacking: your peel still hits what it\'s over',
      'Opens a black hole: the feet over that pizza get pulled down faster · smack the black hole 3 times to close it',
    ],
    onPhase: (_f, ph, a) => {
      if (ph === 2) {
        a.quip(960, 300, 'GRAVITY FLIP!', '#b06bff', 60);
        flip(a, true);
      } else flip(a, false);
    },
    upkeep: (_f, _dt, a) => boosts.tick(a),
    update: (f, dt, a) => {
      if (!a.inWave()) {
        flip(a, false);
        holeEnd?.();
        return;
      }
      // meteors keep coming while the table is upside down
      if (f.phase <= 2 && meteor.tick(dt)) {
        const p = laneOf(a, f);
        if (p) dropOn(a, f, p, 'p_snowball', 1.6, 'METEOR!', { scale: 0.75, tint: 0xff8a3d });
      }
      if (f.phase >= 3 && hole.tick(dt)) blackHole(f, a);
    },
    onDeath: (_f, a) => {
      holeEnd?.();
      boosts.clear();
      flip(a, false);
    },
  };
};

export const brains: Record<string, () => Brain> = { shortorder, trex, iceskate, colossus, ufotoe, cosmiccroc };
