// Boss brains, Stages 4–6: shortorder, trex, iceskate, colossus, ufotoe, cosmiccroc.
// Shared helpers and the heat scaling live in ./kit.ts.

import { clockOf } from '../../core/clock';
import Phaser from 'phaser';
import { ui } from '../../ui/ui';
import type { Arena } from '../arena';
import type { Foot } from '../Foot';
import type { Pizza } from '../Pizza';
import { type Brain, type Prop, Every, dropOn, heat, hitProp, laneOf, mark, retreat, rnd, twin } from './kit';
import { crand } from '../../systems/cosmeticRandom';

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
  let sleeve: Phaser.GameObjects.Image | null = null;
  let endRetreat: (() => void) | null = null;
  const finish = (f: Foot) => {
    busy = false;
    endRetreat?.();
    endRetreat = null;
    f.pinned = false;
  };
  /** Hand scale: the hand is drawn at 400×300. */
  const S = 0.72;
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
    // the hand reaches in low, at table height (clear of the NEW FOOT card on the left); the arm comes down from off screen
    const gy = p.surfaceY - 55;
    const shoulder = { x: fromLeft ? -340 : 2260, y: gy - 190 };
    const start = { x: fromLeft ? -220 : 2140, y: gy - 70 };
    // (kept on screen: with five pizzas the edge ones sit close to the side)
    const hold = { x: Phaser.Math.Clamp(p.x - dir * (p.radius + 200), 170, 1750), y: gy - 24 };
    const grab = { x: p.x - dir * (p.radius * 0.25 + 70), y: gy };
    const ret = mark(a, 'p_reticle', p.x, p.surfaceY - 30, warn + lunge + creep, 0.75);
    mark(a, 'p_ticket', p.x, p.surfaceY - 245, warn + 0.6);
    a.quip(p.x, p.surfaceY - 140, slices > 1 ? 'RUSH ORDER!' : 'ORDER UP!', '#ffffff', 40);
    a.sfx(slices > 1 ? 'sfx_shortorder_rush' : 'sfx_shortorder_bell');
    /** Stretch the sleeve from the shoulder (off screen) to the cuff of a hand at x, y. */
    const drawArm = (img: Phaser.GameObjects.Image, x: number, y: number) => {
      const wx = x - dir * 150 * S;
      const wy = y + 4;
      const dx = wx - shoulder.x;
      const dy = wy - shoulder.y;
      img.setPosition(shoulder.x, shoulder.y).setRotation(Math.atan2(dy, dx)).setDisplaySize(Math.max(1, Math.hypot(dx, dy)), 84);
    };
    a.sc.time.delayedCall(warn * 1000, () => {
      if (!f.alive || !a.inWave() || p.dead) {
        finish(f);
        return;
      }
      a.sfx('sfx_shortorder_grab');
      const t0 = a.sc.time.now;
      // the sleeve goes in first so the hand draws over its end
      sleeve = a.sc.add.image(shoulder.x, shoulder.y, 'p_order_sleeve').setOrigin(0, 0.5).setFlipY(!fromLeft);
      a.fxLayer.add(sleeve);
      /** A smack knocks the hand back a little (it recovers in a moment). */
      let jolt = 0;
      const at = () => {
        const t = (a.sc.time.now - t0) / 1000;
        jolt = Math.max(0, jolt - 0.016 / 0.2);
        const back = -dir * 46 * jolt;
        if (t < lunge) {
          const k = 1 - (1 - t / lunge) ** 2;
          return { x: start.x + (hold.x - start.x) * k + back, y: start.y + (hold.y - start.y) * k };
        }
        const k = Math.min(1, (t - lunge) / creep);
        // grabby fingers: a little twitch as it creeps in
        return { x: hold.x + (grab.x - hold.x) * k + back, y: hold.y + (grab.y - hold.y) * k + Math.sin(t * 18) * 4 };
      };
      const done = (got: boolean) => {
        if (ret.active) a.sc.tweens.add({ targets: ret, alpha: 0, duration: 200, onComplete: () => ret.destroy() });
        const img = hand?.img;
        hand = null;
        const sl = sleeve;
        sleeve = null;
        if (!img) {
          sl?.destroy();
          finish(f);
          return;
        }
        // the hand whips back out the way it came, with a slice if it got one (the prop's own fade is hidden)
        img.setVisible(false);
        const ghost = a.sc.add.image(img.x, img.y, 'p_order_hand').setScale(S).setFlipX(!fromLeft);
        a.fxLayer.add(ghost);
        const key = `slice_${p.type.id}`;
        const slice = got && a.sc.textures.exists(key) ? a.sc.add.image(img.x + dir * 70, img.y + 20, key) : null;
        if (slice) {
          slice.setScale(130 / slice.width).setAngle(dir * 20);
          a.fxLayer.add(slice);
        } else if (!got) ghost.setTintFill(0xffffff);
        const dx = slice ? dir * 70 : 0;
        a.sc.tweens.add({
          targets: ghost,
          x: start.x - dir * 120,
          y: start.y - 40,
          duration: got ? 520 : 340,
          delay: got ? 120 : 60,
          ease: got ? 'Sine.In' : 'Back.In',
          onStart: () => ghost.clearTint(),
          onUpdate: () => {
            slice?.setPosition(ghost.x + dx, ghost.y + 20);
            if (sl?.active) drawArm(sl, ghost.x, ghost.y);
          },
          onComplete: () => {
            ghost.destroy();
            slice?.destroy();
            sl?.destroy();
          },
        });
        finish(f);
      };
      hand = hitProp(a, {
        key: 'p_order_hand',
        x: start.x,
        y: start.y,
        scale: S,
        hits,
        r: 125,
        // the count sits under the hand, on the table, where nothing covers it
        badgeDy: 118,
        sec: lunge + creep,
        follow: () => {
          const q = at();
          if (sleeve) drawArm(sleeve, q.x, q.y);
          return q;
        },
        onHit: () => {
          jolt = 1;
          a.shake(80, 0.003);
        },
        label: 'ORDER CANCELLED!',
        onClear: () => done(false),
        onFail: () => {
          if (f.alive && !p.dead && a.inWave()) {
            a.sfx('sfx_shortorder_togo');
            a.hitPizza(p, slices, slices > 1 ? 'TWO TO GO!' : 'TO GO!');
          }
          done(true);
        },
      });
      hand.img.setFlipX(!fromLeft);
    });
  };
  return {
    names: ['ORDER UP', 'RUSH HOUR'],
    info: ['The feet step back and a grabbing hand reaches for the marked pizza · whack the hand before it grabs a slice', 'Same hand, but it grabs two slices · whack it before it reaches the pizza'],
    cards: [
      {
        what: 'The feet step back and a hand reaches for a pizza',
        hit: 'Whack the hand before it grabs a slice',
        miss: 'It snatches a slice to go',
        show: [{ key: 'p_order_hand', label: 'Grabbing hand', hits: (h) => h.hits(3) }],
      },
      {
        what: 'Rush hour: the hand comes back for two slices',
        hit: 'Whack the hand before it reaches the pizza',
        miss: 'It snatches two slices to go',
        show: [{ key: 'p_order_hand', label: 'Grabbing hand', hits: (h) => h.hits(3) }],
      },
    ],
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
      sleeve?.destroy();
      sleeve = null;
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
    // the dino's middle: it runs across the front of the plates, in front of the pizzas and above their labels
    const y = 948;
    const feetY = y + 62;
    const DS = 0.5;
    const ps = [...a.alivePizzas()].sort(() => Math.random() - 0.5).slice(0, n);
    ps.forEach((p, i) => {
      // start as far from its pizza as the screen allows (clear of the sound buttons and the Peel Slam button)
      const fromLeft = p.x > 960;
      const sx = fromLeft ? 170 : 1720;
      const dir = fromLeft ? 1 : -1;
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
          a.sfx('sfx_trex_dinosqueak', { throttle: 200 });
          // a ground shadow so it sits on the table on any backdrop, and a dashed run line to its pizza
          const shadow = a.sc.add.image(sx, feetY, 'p_ground_shadow').setScale(0.9).setAlpha(0);
          a.fxLayer.add(shadow);
          a.sc.tweens.add({ targets: shadow, alpha: 1, duration: 200 });
          const len = Math.abs(p.x - sx) - 150;
          const arrow = a.sc.add.image(sx + dir * 110, feetY - 8, 'p_run_arrow').setOrigin(fromLeft ? 0 : 1, 0.5).setFlipX(!fromLeft).setAlpha(0);
          arrow.setDisplaySize(Math.max(80, len), 34);
          a.fxLayer.add(arrow);
          a.sc.tweens.add({ targets: arrow, alpha: { from: 0.45, to: 1 }, duration: 180, yoyo: true, repeat: -1 });
          a.quip(sx, y - 130, '!', '#ffd23f', 64);
          let frameT = 0;
          let dustT = 0;
          let last = t0;
          let prop: Prop | null = null;
          prop = hitProp(a, {
            key: 'p_babydino',
            x: sx,
            y,
            scale: DS,
            hits: 1,
            r: 100,
            badgeDy: -112,
            sec: pause + run,
            follow: () => {
              const now = a.sc.time.now;
              const dt = (now - last) / 1000;
              last = now;
              const t = (now - t0) / 1000;
              if (t < pause) {
                shadow.setPosition(sx, feetY);
                return { x: sx, y };
              }
              // scamper: swap leg frames, kick up dust, bob
              frameT += dt;
              dustT += dt;
              if (frameT > 0.09 && prop?.alive()) {
                frameT = 0;
                prop.img.setTexture(prop.img.texture.key === 'p_babydino' ? 'p_babydino2' : 'p_babydino');
              }
              const k = Math.min(1, (t - pause) / run);
              const x = sx + (p.x - sx) * k;
              if (dustT > 0.12) {
                dustT = 0;
                a.fx.puff(x - dir * 50, feetY, 2);
              }
              shadow.setPosition(x, feetY);
              return { x, y: y - Math.abs(Math.sin(t * 14)) * 14 };
            },
            label: 'BONK!',
            onClear: () => {
              // knocked out: it flips over and tumbles off backwards
              const img = prop?.img;
              if (!img) return;
              img.setVisible(false);
              const ko = a.sc.add.image(img.x, img.y, img.texture.key).setScale(DS).setFlipX(img.flipX);
              a.fxLayer.add(ko);
              a.sc.tweens.add({ targets: ko, x: ko.x - dir * 260, angle: -dir * 540, duration: 650, ease: 'Quad.Out' });
              a.sc.tweens.add({ targets: ko, y: ko.y - 160, duration: 300, ease: 'Quad.Out', yoyo: true });
              a.sc.tweens.add({ targets: ko, alpha: 0, delay: 400, duration: 250, onComplete: () => ko.destroy() });
            },
            onFail: () => {
              if (!p.dead && a.inWave() && !dead) {
                a.sfx('sfx_trex_snack', { volume: 0.6 });
                a.hitPizza(p, h.slices(1), 'CHOMPED!', '#9cff6a');
              }
            },
          });
          const me = prop;
          me.img.setFlipX(!fromLeft);
          dinos.push(me);
          // the run line goes when the dino sets off, the shadow when the dino does
          const tidy = a.sc.time.addEvent({
            delay: 50,
            loop: true,
            callback: () => {
              const t = (a.sc.time.now - t0) / 1000;
              if (t > pause && arrow.active && arrow.alpha > 0 && !arrow.getData('going')) {
                arrow.setData('going', true);
                a.sc.tweens.killTweensOf(arrow);
                a.sc.tweens.add({ targets: arrow, alpha: 0, duration: 200, onComplete: () => arrow.destroy() });
              }
              if (!me.alive()) {
                tidy.remove();
                if (arrow.active) arrow.destroy();
                a.sc.tweens.add({ targets: shadow, alpha: 0, duration: 200, onComplete: () => shadow.destroy() });
              }
            },
          });
          // flash white while it waits, then it's off
          const blink = a.sc.time.addEvent({
            delay: 120,
            repeat: Math.max(1, Math.floor((pause * 1000) / 120) - 1),
            callback: () => {
              if (!me.alive()) return;
              if (me.img.isTinted) me.img.clearTint();
              else me.img.setTintFill(0xffffff);
            },
          });
          a.sc.time.delayedCall(pause * 1000, () => {
            blink.remove();
            if (me.alive()) {
              me.img.clearTint();
              a.sfx('sfx_trex_dinorun', { throttle: 150 });
            }
          });
        });
      });
    });
  };

  /** He shakes and hauls a foot down into view, then swings over and eats it to heal. Can't be stopped. */
  const snackTime = (f: Foot, a: Arena): boolean => {
    const pool = regulars(a);
    if (!pool.length) return false;
    const v = pool.reduce((best, o) => (Math.abs(o.x - f.x) > Math.abs(best.x - f.x) ? o : best));
    snacking = true;
    f.puppet = true;
    v.puppet = true;
    v.shielded = true;
    v.setState('hover');
    const tell = 1.2;
    const home = { x: f.x, y: f.y };
    // the snack is hauled down to where everyone can see it, trembling
    const vy = Phaser.Math.Clamp(v.y + 160, 520, 600);
    const vh = v.meta.footHeight * v.scale;
    clockOf(a.sc).tween({ targets: v, y: vy, duration: 500, ease: 'Back.Out' });
    const tremble = a.sc.time.addEvent({ delay: 50, loop: true, callback: () => v.alive && (v.root.rotation = (crand() - 0.5) * 0.12) });
    v.flash(0xffd0a0, 140);
    a.quip(Phaser.Math.Clamp(f.x, 300, 1620), Math.max(330, f.y + 40), 'SNACK TIME!', '#ffb03d', 54);
    a.sc.time.delayedCall(450, () => v.alive && a.quip(v.x, vy - vh - 30, 'UH OH…', '#ffffff', 34));
    const ret = mark(a, 'p_reticle', v.x, vy - vh * 0.45, tell + 0.6, 0.9);
    keep(ret);
    const follow = a.sc.time.addEvent({ delay: 16, loop: true, callback: () => (v.alive && ret.active ? ret.setPosition(v.x, v.y - vh * 0.45) : follow.remove()) });
    a.sfx('sfx_trex_growl');
    // the shake
    const shake = a.sc.time.addEvent({ delay: 40, repeat: Math.floor((tell * 1000) / 40), callback: () => f.alive && (f.x = home.x + (Math.random() - 0.5) * 30) });
    const release = () => {
      tremble.remove();
      snacking = false;
      if (f.alive) f.puppet = false;
      if (v.alive) {
        v.root.rotation = 0;
        v.puppet = false;
        v.shielded = false;
      }
    };
    a.sc.time.delayedCall(tell * 1000, () => {
      shake.remove();
      if (!f.alive || !v.alive) {
        release();
        return;
      }
      a.sfx('sfx_whoosh', { volume: 1, rate: 0.6 });
      // anticipation: he rears up, then lunges across and down onto the snack
      clockOf(a.sc).tween({
        targets: f,
        y: f.y - 70,
        duration: 220,
        ease: 'Quad.Out',
        onComplete: () => {
          if (!f.alive || !v.alive) return release();
          clockOf(a.sc).tween({
            targets: f,
            x: v.x,
            y: vy - 30,
            duration: 480,
            ease: 'Back.In',
            onComplete: () => {
              tremble.remove();
              if (!f.alive) return release();
              a.shake(250, 0.008);
              a.quip(v.x, vy + 60, 'CHOMP!', '#ff4d3d', 58);
              a.sfx('sfx_trex_snack');
              // squash on the bite, then spring back
              const sx = f.root.scaleX;
              const sy = f.root.scaleY;
              a.sc.tweens.add({ targets: f.root, scaleX: sx * 1.12, scaleY: sy * 0.86, duration: 110, yoyo: true, ease: 'Quad.Out', onComplete: () => f.root.setScale(sx, sy) });
              a.fx.splat(v.x, vy - 30, false);
              if (v.alive) {
                v.setState('dying');
                v.shadow.setVisible(false);
                clockOf(a.sc).tween({ targets: v.root, scaleX: 0, scaleY: 0, y: f.y - 120, duration: 260, ease: 'Quad.In', onComplete: () => v.destroy() });
              }
              const heal = Math.round(f.maxHp * [0.03, 0.04, 0.05, 0.06, 0.07][heat(a).rank]);
              f.hp = Math.min(f.maxHp, f.hp + heal);
              a.fx.ring(f.x, f.y - 60, 0x7dff9a, 1.6, 0.5);
              a.quip(Phaser.Math.Clamp(f.x + 200, 200, 1720), vy - 60, `+${heal} HP`, '#7dff9a', 46);
              syncBar(a, f);
              // he stays over this lane: the move swung him across the table (he rises back to his hover)
              f.target = laneOf(a, f);
              a.sc.time.delayedCall(350, () => {
                snacking = false;
                if (!f.alive) return;
                f.puppet = false;
                f.setState('hover');
              });
            },
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
    cards: [
      {
        what: 'Baby dinos dash along the table for marked pizzas',
        hit: 'Whack each dino once before it gets there',
        miss: 'It chomps a slice off that pizza',
        show: [{ key: 'p_babydino', label: 'Baby dino', hits: 1 }],
      },
      {
        what: 'He grabs one of his own feet to eat and heal',
        hit: 'It can’t be stopped: clear his feet to starve him',
        miss: 'Every foot he eats heals him a little',
        show: [
          { key: '@foot:dino', label: 'His dinos' },
          { key: 'p_babydino', label: 'Baby dino', hits: 1 },
        ],
      },
      {
        what: 'A deep breath, then a roar: every stomp lands twice',
        hit: 'Peel Slam during the roar to stop it',
        miss: 'Every foot hurries and stomps twice for 3.5 seconds',
        icon: '📣',
      },
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
          clockOf(a.sc).tween({ targets: o.root, y: -600, duration: 600, delay: crand() * 300, ease: 'Back.In', onComplete: () => o.destroy() });
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
            clockOf(a.sc).tween({ targets: o, y: o.y - 50, duration: 80, yoyo: true, ease: 'Quad.Out' });
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
        a.quip(f.x, Math.max(f.y + 60, 340), 'DEEP BREATH…', '#ffb0a0', 46);
        a.sfx('sfx_trex_breath');
        a.sc.time.delayedCall(1000, () => {
          if (!f.alive || !a.inWave()) return;
          a.quip(f.x, Math.max(f.y + 60, 340), 'ROOOOAR!', '#ff4d3d', 64);
          a.quip(960, 430, 'EVERY STOMP LANDS TWICE!', '#ffb0a0', 40);
          a.shake(600, 0.01);
          a.rumble(0.6, 600);
          a.sfx('sfx_trex_roar');
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
    // the column runs from just under the boss bar to below the plate
    const top = 240;
    const bottom = p.surfaceY + 60;
    const warn = h.windup(1.3);
    const dur = 4.5;
    // warning: a blinking dashed outline of the lane, and the cloud rolls in over it
    const col = a.sc.add.graphics();
    a.fxLayer.add(col);
    col.fillStyle(0xbfe6ff, 0.12).fillRoundedRect(p.x - half, top, half * 2, bottom - top, 34);
    for (let y = top + 20; y < bottom - 30; y += 46) {
      col.lineStyle(7, 0xbfe6ff, 0.95).lineBetween(p.x - half, y, p.x - half, y + 24).lineBetween(p.x + half, y, p.x + half, y + 24);
    }
    const blink = a.sc.tweens.add({ targets: col, alpha: { from: 0.3, to: 1 }, duration: 260, yoyo: true, repeat: -1 });
    const cloud = a.sc.add.image(p.x, -100, 'p_ivy_cloud').setScale(Math.min(1.1, (half * 2.3) / 320));
    a.fxLayer.add(cloud);
    a.sc.tweens.add({ targets: cloud, y: top + 10, duration: 600, ease: 'Back.Out' });
    a.sc.tweens.add({ targets: cloud, x: p.x + 10, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    a.quip(p.x, top + 120, 'SNOW INCOMING!', '#bfe6ff', 42);
    a.sfx('sfx_iceskate_snow');
    // live: frost creeps down the lane from the cloud, with a no-smack sign
    const frost = a.sc.add.image(p.x, top, 'p_ivy_frost').setOrigin(0.5, 0).setAlpha(0);
    frost.setDisplaySize(half * 2, bottom - top);
    const fullSY = frost.scaleY;
    frost.setScale(frost.scaleX, 0.01);
    a.fxLayer.addAt(frost, a.fxLayer.getIndex(cloud));
    const sign = a.sc.add.image(p.x, top + 150, 'p_ivy_nopeel').setScale(0).setAlpha(0.95);
    a.fxLayer.add(sign);
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
      a.sc.tweens.killTweensOf([cloud, sign]);
      a.sc.tweens.add({ targets: [col, frost, sign], alpha: 0, duration: 450 });
      a.sc.tweens.add({ targets: cloud, y: -120, alpha: 0, duration: 500, ease: 'Quad.In', onComplete: () => {
        col.destroy();
        cloud.destroy();
        frost.destroy();
        sign.destroy();
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
      a.sc.tweens.add({ targets: col, alpha: 0, duration: 300 });
      frost.setAlpha(1);
      a.sc.tweens.add({ targets: frost, scaleY: fullSY, duration: 420, ease: 'Quad.Out' });
      a.sc.tweens.add({ targets: sign, scale: 0.62, duration: 260, delay: 200, ease: 'Back.Out' });
      a.quip(p.x, top + 260, 'FROZEN LANE!', '#ffffff', 44);
      a.sfx('sfx_iceskate_freeze');
      const t0 = a.now();
      flakes = a.sc.time.addEvent({
        delay: 70,
        loop: true,
        callback: () => {
          if (!live) return;
          const fl = a.sc.add.image(p.x + (crand() - 0.5) * half * 1.7, top + 40, 'p_ivy_flake').setScale(0.6 + crand() * 0.5);
          a.fxLayer.add(fl);
          a.sc.tweens.add({ targets: fl, y: bottom - 30, x: fl.x + (crand() - 0.5) * 60, angle: 180, duration: 1300 + crand() * 500, onComplete: () => fl.destroy() });
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
          a.fx.frost(a.peelPoint().x, a.peelPoint().y);
          a.sc.tweens.add({ targets: sign, scale: { from: 0.85, to: 0.62 }, angle: { from: -12, to: 0 }, duration: 260, ease: 'Back.Out' });
          a.sfx('sfx_iceskate_frostbite', { throttle: 150 });
        },
      });
      a.sc.time.delayedCall(dur * 1000, end);
    });
  };

  return {
    names: ['ICE TRAILS', 'TRIPLE AXEL'],
    info: ['Snow falls on one lane and freezes the feet in it · don\'t smack inside the snow or your peel freezes', 'Skates from lane to lane, speeding up the feet she passes · smack the fast ones first'],
    cards: [
      {
        what: 'Snow falls on one lane and freezes the feet in it',
        hit: 'Smack feet anywhere but inside the snow',
        miss: 'Smack in the snow and your peel freezes',
        show: [{ key: 'p_ivy_nopeel', label: 'Snowy lane', watch: true }],
      },
      {
        what: 'She skates across the lanes, speeding up feet she passes',
        hit: 'Smack the fast, glowing feet first',
        miss: 'Sped-up feet stomp half as fast again',
        show: [{ key: 'p_ivy_nopeel', label: 'Snowy lane', watch: true }],
      },
    ],
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
        if (crand() < dt * 20) a.fx.glint(f.x + (crand() - 0.5) * 80, f.y - 20, 1);
        for (const o of a.allFeet()) {
          if (!o.alive || o.isBossLike || o.frozen || Math.abs(o.x - f.x) > 150) continue;
          if (boosts.add(a, o, 1.5, 4)) {
            a.quip(o.x, Math.max(330, o.y + 30), 'FASTER!', '#d9c8ff', 30);
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
        a.quip(f.x, Math.max(f.y + 50, 330), 'TRIPLE AXEL!', '#d9c8ff', 40);
        a.sfx('sfx_iceskate_axel');
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
  const spot = (f: Foot, i: number, side = 0) => {
    const w = f.meta.halfWidth * f.type.scale;
    const h = f.meta.footHeight * f.type.scale;
    // the lower part of his armour: that's what's on screen while he hovers
    const xs = [-0.35, 0.3, -0.05, 0.42, -0.45, 0.1];
    const ys = [-0.2, -0.3, -0.12, -0.24, -0.34, -0.16];
    const x = xs[i % xs.length] * w;
    return { x: side ? side * Math.abs(x || 0.3 * w) : x, y: ys[i % ys.length] * h };
  };
  /** Where the glint and parry shield sit: on the part of him that's on screen, clear of the boss bar. */
  const guardY = (f: Foot) => Math.max(f.y - f.meta.footHeight * f.scale * 0.3, Math.min(350, f.y - 40));
  /** Local foot point → world. */
  const world = (f: Foot, lx: number, ly: number) => ({ x: f.root.x + lx * f.root.scaleX, y: f.root.y + ly * f.root.scaleY });
  const shards = (a: Arena, x: number, y: number, n: number, burst = false) => {
    for (let i = 0; i < n; i++) {
      const s = a.sc.add.image(x, y, 'p_colossus_shard').setScale(0.45 + crand() * 0.4).setAngle(crand() * 360);
      a.fxLayer.add(s);
      const dx = (crand() - 0.5) * (burst ? 900 : 300);
      const up = burst ? 200 + crand() * 300 : 60 + crand() * 100;
      a.sc.tweens.add({ targets: s, x: x + dx, duration: burst ? 1100 : 900, ease: 'Linear' });
      a.sc.tweens.add({ targets: s, y: y - up, duration: burst ? 300 : 220, ease: 'Quad.Out', onComplete: () => {
        a.sc.tweens.add({ targets: s, y: 1150, angle: s.angle + (crand() - 0.5) * 720, duration: burst ? 900 : 800, ease: 'Quad.In', onComplete: () => s.destroy() });
      } });
    }
  };
  /** A whole slab of plating breaks away and tumbles off the table. */
  const slab = (a: Arena, x: number, y: number, kick = 0) => {
    const s = a.sc.add.image(x, y, 'p_colossus_chunk').setScale(0.7).setAngle((crand() - 0.5) * 30);
    a.fxLayer.add(s);
    const dir = kick || (crand() < 0.5 ? -1 : 1);
    a.sc.tweens.add({ targets: s, x: x + dir * (160 + crand() * 200), duration: 1000, ease: 'Linear' });
    a.sc.tweens.add({ targets: s, y: y - 90, duration: 240, ease: 'Quad.Out', onComplete: () => {
      a.sc.tweens.add({ targets: s, y: 1200, angle: s.angle + dir * (200 + crand() * 200), duration: 760, ease: 'Quad.In', onComplete: () => s.destroy() });
    } });
  };
  const crack = (f: Foot, a: Arena) => {
    pieces--;
    f.armor = Math.max(2, f.armor - 2);
    const at = spot(f, cracks.length);
    const sc = 0.55 + crand() * 0.15;
    const img = a.sc.add.image(at.x, at.y, 'p_colossus_crack').setScale(sc * 0.4).setAngle(crand() * 360).setAlpha(0);
    f.root.add(img);
    cracks.push(img);
    // the crack splits open: it snaps out past full size, then settles
    a.sc.tweens.add({ targets: img, alpha: 1, scale: sc * 1.15, duration: 110, ease: 'Quad.Out', onComplete: () => {
      a.sc.tweens.add({ targets: img, scale: sc, duration: 160, ease: 'Sine.Out' });
    } });
    const w = world(f, at.x, at.y);
    shards(a, w.x, w.y, 4);
    slab(a, w.x, w.y, Math.sign(at.x) || 1);
    a.fx.impact(w.x, w.y, true);
    a.shake(160, 0.006);
    a.sfx(pieces > 0 ? 'sfx_colossus_crack' : 'sfx_colossus_shatter');
    if (pieces > 0) a.quip(w.x, w.y - 90, `CRACK! (${pieces} LEFT)`, '#e6ebf2', 40);
    else {
      a.quip(f.x, Math.max(f.y - 140, 360), 'SHELL BROKEN!', '#7dff9a', 54);
      shatterAll(f, a);
    }
  };
  /** Every crack bursts: his plating falls away in slabs. */
  const shatterAll = (f: Foot, a: Arena) => {
    for (const c of cracks) {
      const w = world(f, c.x, c.y);
      slab(a, w.x, w.y, Math.sign(c.x) || 1);
      shards(a, w.x, w.y, 3, true);
      c.destroy();
    }
    cracks.length = 0;
    const cy = Math.max(f.y - 160, 300);
    shards(a, f.x, cy, 8, true);
    for (let i = 0; i < 3; i++) slab(a, f.x + (i - 1) * 90, cy);
  };
  const addPlate = (f: Foot, a: Arena, side = 0) => {
    const at = spot(f, plates.length + 1, side);
    const img = a.sc.add.image(at.x, at.y, 'p_colossus_plate').setScale(0);
    f.root.add(img);
    plates.push(img);
    a.sc.tweens.add({ targets: img, scale: 1.25, duration: 220, ease: 'Back.Out' });
    // fresh from the forge: it glows hot, then cools to steel
    img.setTintFill(0xffb050);
    a.sc.time.delayedCall(120, () => img.active && img.setTint(0xffc890));
    a.sc.time.delayedCall(700, () => img.active && img.clearTint());
    a.bossMove(f, 'IRON SHELL', 'Rebuilt armour: small hits do nothing · a crit or a Peel Slam knocks each plate off');
  };
  const dropPlate = (f: Foot, a: Arena) => {
    const img = plates.pop();
    if (!img) return;
    const w = world(f, img.x, img.y);
    img.destroy();
    shards(a, w.x, w.y, 3);
    slab(a, w.x, w.y, Math.sign(img.x) || 1);
    a.fx.impact(w.x, w.y, true);
    a.sfx('sfx_colossus_crack');
    a.quip(w.x, w.y - 90, plates.length ? `PLATE OFF! (${plates.length} LEFT)` : 'ARMOUR OFF!', '#7dff9a', 42);
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
    a.sc.tweens.add({ targets: glintImg, scale: 2, angle: 90, duration: warn * 1000, ease: 'Sine.In' });
    a.quip(f.x, guardY(f) + 150, 'GLINT!', '#ffe14d', 50);
    a.sfx('sfx_colossus_glint');
    a.sc.time.delayedCall(warn * 1000, () => {
      glintImg?.destroy();
      glintImg = null;
      if (!f.alive || f.phase !== 2) return;
      stance = 1.5;
      // the shield swings up from below and locks in place with a flash
      shieldImg = a.sc.add.image(f.x, guardY(f) + 80, 'p_colossus_shield').setScale(0.2).setAngle(-25).setAlpha(0.95);
      a.fxLayer.add(shieldImg);
      a.sc.tweens.add({ targets: shieldImg, scale: 0.9, angle: 0, duration: 200, ease: 'Back.Out' });
      a.fx.ring(f.x, guardY(f), 0xffd34d, 1.2, 1);
      a.sfx('sfx_kit_shieldup');
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
    a.quip(s.x, 300, 'BLACKSMITH!', '#ff9a3d', 42);
  };
  /** The blacksmith's "I'm going to him" line, from the blacksmith to The Colossus. */
  let smithLine: Phaser.GameObjects.Image | null = null;
  const dropLine = (a: Arena) => {
    const l = smithLine;
    smithLine = null;
    if (l) a.sc.tweens.add({ targets: l, alpha: 0, duration: 180, onComplete: () => l.destroy() });
  };
  /** Where the blacksmith lands its blow: beside his sole, so the whole blacksmith is on screen. */
  const smithSpot = (f: Foot, s: Foot) => {
    const side = Math.sign(s.x - f.x) || 1;
    return { side, x: f.x + side * (f.meta.halfWidth * f.scale * 0.7 + s.meta.halfWidth * s.scale * 0.5), y: Math.max(f.y - 20, 520) };
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
      dropLine(a);
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
      // it comes down to mid-screen, fully in view, and gets ready
      s.x += (s.laneX - s.x) * Math.min(1, dt * 3);
      s.y += (540 - s.y) * Math.min(1, dt * 3);
      const to = smithSpot(f, s);
      if (smithAge > 0.6) {
        // the dashed line to him, pulsing
        if (!smithLine) {
          smithLine = a.sc.add.image(s.x, s.y - 120, 'p_run_arrow').setOrigin(0, 0.5).setTint(0xffa040).setAlpha(0);
          a.fxLayer.add(smithLine);
          a.sc.tweens.add({ targets: smithLine, alpha: { from: 0.4, to: 1 }, duration: 220, yoyo: true, repeat: -1 });
        }
        const fx = s.x + Math.sign(to.x - s.x) * 120;
        const fy = s.y - 120;
        const ex = to.x - Math.sign(to.x - s.x) * 60;
        const ey = to.y - 120;
        smithLine.setPosition(fx, fy).setRotation(Math.atan2(ey - fy, ex - fx)).setDisplaySize(Math.max(60, Math.hypot(ex - fx, ey - fy)), 34);
      }
      if (!smithWarned && smithAge > wait - 1) {
        smithWarned = true;
        a.quip(s.x, s.y - s.meta.footHeight * s.scale - 30, 'HAMMER TIME!', '#ff9a3d', 38);
        // three quick orange flashes, not one long solid fill
        a.sfx('sfx_colossus_smith');
        for (let i = 0; i < 3; i++) a.sc.time.delayedCall(i * 260, () => s.alive && s.flash(0xff9a3d, 110));
      }
      // wind-up: it rocks back, hammer raised, over its last second
      const k = Phaser.Math.Clamp((smithAge - (wait - 1)) / 1, 0, 1);
      s.root.rotation = -to.side * 0.3 * Math.sin((k * Math.PI) / 2);
      if (smithAge > wait) {
        smithStage = 'swing';
        dropLine(a);
        // it swings in front of him, so you see the blow land
        s.root.parentContainer?.bringToTop(s.root);
        a.sfx('sfx_whoosh', { volume: 0.7, rate: 0.9 });
      }
      return;
    }
    // swing over until it touches him
    const to = smithSpot(f, s);
    const dx = to.x - s.x;
    const dy = to.y - s.y;
    const d = Math.hypot(dx, dy);
    const step = 1100 * dt;
    s.root.rotation = to.side * 0.25;
    if (d > step + 10) {
      s.x += (dx / d) * step;
      s.y += (dy / d) * step;
      return;
    }
    s.x = to.x;
    s.y = to.y;
    // contact: two quick hammer blows, a fresh plate goes on, then it heads back up
    smith = null;
    smithT = heat(a).cooldown(7);
    const hitX = f.x + to.side * f.meta.halfWidth * f.scale * 0.6;
    const blow = (i: number) => {
      a.sc.tweens.add({ targets: s.root, rotation: { from: to.side * 0.55, to: -to.side * 0.15 }, duration: 110, ease: 'Quad.In' });
      a.sc.time.delayedCall(110, () => {
        a.fx.impact(hitX, s.y - 80, true);
        a.shake(110, 0.004 + i * 0.002);
        if (i === 1) {
          a.sfx('sfx_colossus_anvil');
          a.quip(s.x, s.y - s.meta.footHeight * s.scale - 30, 'FRESH PLATE!', '#ff9a3d', 42);
          addPlate(f, a, to.side);
        } else a.sfx('sfx_colossus_clang', { volume: 0.7 });
      });
    };
    blow(0);
    a.sc.time.delayedCall(220, () => blow(1));
    s.setState('dying');
    s.shadow.setVisible(false);
    clockOf(a.sc).tween({ targets: s.root, y: -500, rotation: 0, duration: 700, delay: 520, ease: 'Back.In', onComplete: () => s.destroy() });
  };

  return {
    names: ['IRON SHELL', 'PARRY', 'SHATTERED'],
    info: [
      'Small hits only chip his shell · keep smacking (crits crack it at once) until it breaks, then pile on',
      'A big glint, then a shield snaps up · stop smacking while the shield is up',
      'Blacksmiths swing in to rebuild his armour · smack them first; a crit or Peel Slam knocks each plate off',
    ],
    cards: [
      {
        what: 'An iron shell: small hits only chip it',
        hit: 'Keep smacking until it breaks (crits crack it at once)',
        miss: 'His shell soaks up your damage',
        show: [{ key: '@boss', label: 'Iron shell' }],
      },
      {
        what: 'A big glint, then a shield snaps up',
        hit: 'Smack him, but stop while the shield is up',
        miss: 'Smacks into the shield are parried',
        show: [
          { key: '@boss', label: 'Bare heel' },
          { key: 'p_colossus_glint', label: 'Glint', watch: true },
          { key: 'p_colossus_shield', label: 'Shield', watch: true },
        ],
      },
      {
        what: 'Blacksmiths swing in to rebuild his armour',
        hit: 'Smack the blacksmiths before they reach him',
        miss: 'A fresh plate goes on: only a crit or Peel Slam knocks it off',
        show: [
          { key: '@foot:blacksmith', label: 'Blacksmith' },
          { key: 'p_colossus_plate', label: 'Fresh plate', watch: true },
        ],
      },
    ],
    onPhase: (f, ph, a) => {
      if (ph === 2) {
        // whatever shell is left falls away; the parry takes over
        if (pieces > 0) shatterAll(f, a);
        pieces = 0;
        f.armor = 2;
        parryT = 2.5;
      }
      if (ph === 3) {
        clearParry();
        // the armour shatters for good
        f.armor = 0;
        f.enraged = true;
        // every slab of plating bursts off him at once
        const cy = Math.max(f.y - 160, 300);
        shatterAll(f, a);
        a.fx.explosion(f.x, cy, 260);
        shards(a, f.x, cy, 14, true);
        for (let i = 0; i < 4; i++) slab(a, f.x + (i - 1.5) * 110, cy - 40 + crand() * 80);
        a.flash(160, 255, 255, 255);
        a.sfx('sfx_colossus_shatter');
        a.quip(f.x, Math.max(f.y + 60, 420), 'SHATTERED!', '#ffffff', 60);
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
          a.sfx('sfx_colossus_clang', { throttle: 120 });
        }
        return true;
      }
      if (f.phase === 2 && stance > 0) {
        a.fx.ring(x, y, 0xffd34d, 0.9, 1);
        a.quip(f.x, guardY(f) + 170, 'PARRIED!', '#ffd34d', 48);
        a.sfx('sfx_colossus_parry', { throttle: 150 });
        if (shieldImg) {
          // the shield takes the blow: a white flash, a knock and sparks off its face
          const sh = shieldImg;
          sh.setTintFill(0xffffff);
          a.sc.time.delayedCall(70, () => sh.active && sh.clearTint());
          a.sc.tweens.add({ targets: sh, scale: { from: 1.05, to: 0.9 }, angle: { from: (crand() - 0.5) * 16, to: 0 }, duration: 160, ease: 'Back.Out' });
          a.fx.impact(sh.x, sh.y, true);
        }
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
          a.sfx('sfx_colossus_clang', { throttle: 120 });
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
      dropLine(a);
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
    const bottom = p.surfaceY - 10;
    const width = p.radius * 2.15;
    // the beam shoots down from the saucer, a glow pools on the pizza, and a slice starts to lift
    const b = a.sc.add.image(p.x, top, 'p_ufo_beam').setOrigin(0.5, 0).setAlpha(0.95);
    b.setDisplaySize(width, bottom - top);
    const fullSY = b.scaleY;
    b.setScale(b.scaleX, 0.01);
    a.fxLayer.add(b);
    a.sc.tweens.add({ targets: b, scaleY: fullSY, duration: 220, ease: 'Quad.Out' });
    a.sc.tweens.add({ targets: b, alpha: { from: 0.8, to: 1 }, duration: 160, yoyo: true, repeat: -1, delay: 220 });
    const glow = a.sc.add.image(p.x, p.surfaceY, 'p_ufo_glow').setAlpha(0);
    glow.setDisplaySize(width * 1.15, width * 0.42);
    a.fxLayer.add(glow);
    a.sc.tweens.add({ targets: glow, alpha: 1, duration: 300 });
    const key = `slice_${p.type.id}`;
    const slice = a.sc.textures.exists(key) ? a.sc.add.image(p.x, p.surfaceY - 20, key) : null;
    if (slice) {
      slice.setScale(120 / slice.width);
      a.fxLayer.add(slice);
      // it rises the whole way up the beam: when it reaches the saucer, it's gone
      a.sc.tweens.add({ targets: slice, y: top + 50, duration: sec * 1000, ease: 'Sine.In' });
      a.sc.tweens.add({ targets: slice, angle: { from: -12, to: 12 }, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    // rings climb the beam, so it reads as pulling up
    const rings = a.sc.time.addEvent({
      delay: 260,
      loop: true,
      callback: () => {
        const r = a.sc.add.image(p.x, bottom - 20, 'p_ufo_ring').setAlpha(0.9);
        r.setDisplaySize(width * 0.95, width * 0.22);
        a.fxLayer.add(r);
        const sx = r.scaleX;
        const sy = r.scaleY;
        a.sc.tweens.add({ targets: r, y: top + 30, scaleX: sx * 0.32, scaleY: sy * 0.32, alpha: 0.2, duration: 1100, ease: 'Sine.In', onComplete: () => r.destroy() });
      },
    });
    a.sfx('sfx_ufotoe_beam');
    a.quip(p.x, p.surfaceY - 190, 'TRACTOR BEAM!', '#a0ff8c', 36);
    let live = true;
    const end = (broken: boolean) => {
      if (!live) return;
      live = false;
      s.beam = null;
      rings.remove();
      a.sc.tweens.killTweensOf(b);
      if (broken) {
        // it sputters out: a quick flicker, then gone; the slice drops back onto the pizza
        a.sc.tweens.add({ targets: b, alpha: { from: 0.2, to: 0.9 }, duration: 45, yoyo: true, repeat: 2, onComplete: () => {
          a.sc.tweens.add({ targets: b, alpha: 0, scaleX: b.scaleX * 0.3, duration: 160, onComplete: () => b.destroy() });
        } });
        if (slice) {
          a.sc.tweens.killTweensOf(slice);
          a.sc.tweens.add({ targets: slice, y: p.surfaceY - 10, angle: 0, duration: 320, ease: 'Bounce.Out', onComplete: () => {
            a.sc.tweens.add({ targets: slice, alpha: 0, duration: 200, onComplete: () => slice.destroy() });
          } });
        }
      } else {
        a.sc.tweens.add({ targets: b, alpha: 0, duration: 200, onComplete: () => b.destroy() });
        if (slice) {
          a.sc.tweens.killTweensOf(slice);
          a.sc.tweens.add({ targets: slice, y: top, scale: 0, duration: 200, ease: 'Quad.In', onComplete: () => slice.destroy() });
        }
      }
      a.sc.tweens.add({ targets: glow, alpha: 0, duration: 250, onComplete: () => glow.destroy() });
    };
    s.beam = () => end(true);
    // the whole beam below the saucer is the target (the saucer itself stays smackable)
    const box = new Phaser.Geom.Rectangle(p.x - 95, top, 190, bottom - top);
    a.addClickable({ x: p.x, y: box.centerY, r: 110, priority: 2, contains: (x, y) => box.contains(x, y), alive: () => live, hit: () => {
      a.quip(p.x, p.surfaceY - 230, 'BEAM BROKEN!', '#7dff9a', 38);
      a.sfx('sfx_ufotoe_beambreak');
      a.fx.impact(a.peelPoint().x, a.peelPoint().y, true);
      end(true);
    } });
    a.sc.time.delayedCall(sec * 1000, () => {
      if (!live) return;
      end(false);
      if (f.alive && !p.dead && a.inWave()) {
        a.sfx('sfx_ufotoe_abduct');
        a.hitPizza(p, heat(a).slices(1), 'ABDUCTED!', '#a0ff8c');
      }
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
    cards: [
      {
        what: 'The saucer takes a lane and beams up a slice',
        hit: 'Smack the beam to break it',
        miss: 'The slice is abducted',
        show: [{ key: 'p_ufo_beam', label: 'Tractor beam', hits: 1 }],
      },
      {
        what: 'A twin saucer joins and beams a second lane',
        hit: 'Break both beams',
        miss: 'Each beam left alone abducts a slice',
        show: [
          { key: 'p_ufo_beam', label: 'Tractor beams', hits: 1 },
          { key: '@boss', label: 'Twin saucer', watch: true },
        ],
      },
    ],
    onPhase: (f, ph, a) => {
      if (ph === 2 && !twinFoot) {
        const t = twin(a, f);
        if (t) {
          twinFoot = t;
          a.sfx('sfx_ufotoe_twin');
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

/** While the camera is turned, keep every world text readable. Centred texts (quips, hit counts) turn
 * against the camera as it rotates. Texts hung from an edge (the pizza names and perks) fade out while
 * it turns, then come back upside down in the world, which reads the right way up on screen, in the
 * same place. Returns the function that stops it (texts go back once the camera is upright again). */
function uprightTexts(a: Arena): () => void {
  interface Was {
    rot: number;
    ox: number;
    oy: number;
    alpha: number;
    /** The rotation we last set: anything else means the text was reused (a pooled quip) or reset. */
    set: number;
    flipped: boolean;
    faded: boolean;
  }
  const was = new Map<Phaser.GameObjects.Text, Was>();
  let stopping = false;
  const cam = a.sc.cameras.main as unknown as { rotation: number };
  const restore = (t: Phaser.GameObjects.Text, w: Was) => {
    if (!t.active) return;
    if (Math.abs(t.rotation - w.set) < 1e-4) t.setRotation(w.rot);
    if (w.flipped) t.setOrigin(w.ox, w.oy);
    if (w.faded && t.alpha === 0) t.setAlpha(w.alpha);
  };
  const fix = (t: Phaser.GameObjects.Text, th: number) => {
    let w = was.get(t);
    if (w && Math.abs(t.rotation - w.set) > 1e-4) {
      // reused or reset by its owner: start again from how it is now
      if (w.flipped) t.setOrigin(1 - t.originX, 1 - t.originY);
      w = undefined;
    }
    if (!w) {
      w = { rot: t.rotation, ox: t.originX, oy: t.originY, alpha: t.alpha, set: t.rotation, flipped: false, faded: false };
      was.set(t, w);
    }
    const centred = Math.abs(w.ox - 0.5) < 0.01 && Math.abs(w.oy - 0.5) < 0.01;
    if (centred) {
      t.setRotation(w.rot - th);
    } else if (Math.abs(th - Math.PI) < 0.02) {
      // fully over: flip in place (swapping the origin keeps it covering the same spot)
      if (!w.flipped) {
        w.flipped = true;
        t.setOrigin(1 - w.ox, 1 - w.oy);
      }
      if (w.faded && t.alpha === 0) t.setAlpha(w.alpha);
      w.faded = false;
      t.setRotation(w.rot + Math.PI);
    } else if (th > 0.02) {
      // mid-turn: hidden rather than spinning about its edge
      if (!w.faded) {
        w.faded = true;
        w.alpha = t.alpha;
      }
      if (w.flipped) {
        w.flipped = false;
        t.setOrigin(w.ox, w.oy);
      }
      t.setAlpha(0);
      t.setRotation(w.rot);
    }
    w.set = t.rotation;
  };
  const walk = (list: Phaser.GameObjects.GameObject[], th: number) => {
    for (const o of list) {
      if (o instanceof Phaser.GameObjects.Text) fix(o, th);
      else if (o instanceof Phaser.GameObjects.Container || o instanceof Phaser.GameObjects.Layer) walk(o.list as Phaser.GameObjects.GameObject[], th);
    }
  };
  const done = () => {
    a.sc.events.off('postupdate', tick);
    a.sc.events.off('shutdown', done);
    for (const [t, w] of was) restore(t, w);
    was.clear();
  };
  const tick = () => {
    const th = Phaser.Math.Angle.Wrap(cam.rotation);
    const turn = Math.abs(th);
    if (stopping && turn < 0.001) {
      done();
      return;
    }
    walk(a.sc.children.list, turn);
    for (const t of was.keys()) if (!t.active) was.delete(t);
  };
  a.sc.events.on('postupdate', tick);
  a.sc.events.once('shutdown', done);
  return () => {
    stopping = true;
  };
}

const cosmiccroc = (): Brain => {
  const hole = new Every(11, 5);
  const meteor = new Every(5.5, 3);
  const boosts = new Boosts();
  let flipped = false;
  let holeEnd: (() => void) | null = null;
  let stopUpright: (() => void) | null = null;

  /** Turn the whole world (not the DOM HUD) upside down, or back. */
  const flip = (a: Arena, on: boolean) => {
    if (flipped === on) return;
    flipped = on;
    const cam = a.sc.cameras.main;
    a.sc.tweens.killTweensOf(cam);
    // words in the world stay readable while it's upside down
    if (on && !stopUpright) stopUpright = uprightTexts(a);
    if (!on) {
      stopUpright?.();
      stopUpright = null;
    }
    // smacks land where the peel is drawn: keep the pointer's world point fresh while the camera turns
    clockOf(a.sc).tween({ targets: cam, rotation: on ? Math.PI : 0, duration: 1200, ease: 'Sine.InOut', onUpdate: () => refreshPointer(a), onComplete: () => refreshPointer(a) });
    a.sfx('sfx_cosmiccroc_flip');
    if (on) a.rumble(0.5, 500);
  };

  /** A black hole over one pizza: the feet over that pizza's lanes get pulled down onto it faster. */
  const blackHole = (f: Foot, a: Arena) => {
    // over a pizza the croc isn't on, so there are feet there to pull
    const mine = laneOf(a, f);
    const p = rnd(a.alivePizzas().filter((q) => q !== mine)) ?? rnd(a.alivePizzas());
    if (!p) return;
    const HY = 360;
    a.sfx('sfx_cosmiccroc_blackhole');
    a.quip(p.x, HY + 150, 'BLACK HOLE!', '#c9a0ff', 44);
    let open = true;
    const pulled = new Set<Foot>();
    let pull: Phaser.Time.TimerEvent | null = null;
    const close = () => {
      if (!open) return;
      open = false;
      holeEnd = null;
      pull?.remove();
      for (const o of pulled) if (o.alive) o.setPhaseAura(null);
      prop.clear();
    };
    holeEnd = close;
    // a hit-counter like every other "smack this": the count sits above it
    const prop = hitProp(a, {
      key: 'p_blackhole',
      x: p.x,
      y: HY,
      hits: heat(a).hits(3),
      r: 120,
      badgeDy: -120,
      sec: 6,
      follow: () => {
        if (prop?.alive()) prop.img.angle += 4;
        return null;
      },
      label: 'CLOSED!',
      onHit: () => a.fx.ring(p.x, HY, 0xffffff, 0.8, 0.6),
      clearSfx: 'sfx_cosmiccroc_holeclose',
      onClear: close,
      onFail: () => {
        a.sfx('sfx_cosmiccroc_holeclose', { volume: 0.6 });
        close();
      },
    });
    // the pull: purple rings sink into it, and each foot it has hold of glows purple (no muddy tint)
    pull = a.sc.time.addEvent({ delay: 100, loop: true, callback: () => {
      if (!open || p.dead) return;
      a.fx.ring(p.x, HY, 0xb06bff, 0.5, 0.6);
      for (const o of a.allFeet()) {
        if (!o.alive || o.isBossLike || o.target !== p) continue;
        // pulled: dive now, and faster
        boosts.add(a, o, 1.8, 0.5);
        if (o.state === 'hover') o.stateT = Math.max(o.stateT, o.hoverTime);
        if (!pulled.has(o)) {
          pulled.add(o);
          o.setPhaseAura(0xb06bff);
        }
      }
    } });
  };

  return {
    names: ['METEOR', 'GRAVITY FLIP', 'BLACK HOLE'],
    info: [
      'Calls meteors onto the pizza below it · smack the meteor before it lands',
      'Turns the whole table upside down · keep smacking: your peel still hits what it\'s over',
      'Opens a black hole: the feet over that pizza get pulled down faster · smack the black hole until it closes',
    ],
    cards: [
      {
        what: 'He calls meteors down onto the pizza below him',
        hit: 'Smack the meteor before it lands',
        miss: 'It crashes down and takes a slice',
        show: [{ key: 'p_meteor', label: 'Meteor', hits: 1 }],
      },
      {
        what: 'The whole table turns upside down',
        hit: 'Keep smacking: your peel still hits what it’s over',
        miss: 'Meteors keep falling on the pizza below him',
        show: [{ key: 'p_meteor', label: 'Meteor', hits: 1 }],
      },
      {
        what: 'A black hole opens over a pizza',
        hit: 'Smack the black hole until it closes',
        miss: 'Feet over that pizza get pulled down faster',
        show: [{ key: 'p_blackhole', label: 'Black hole', hits: (h) => h.hits(3) }],
      },
    ],
    onPhase: (_f, ph, a) => {
      if (ph === 2) {
        a.quip(960, 520, 'GRAVITY FLIP!', '#c9a0ff', 60);
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
        if (p) {
          dropOn(a, f, p, 'p_meteor', 1.6, 'METEOR!', { scale: 0.62, color: '#ffb03d', fallSfx: 'sfx_cosmiccroc_meteor', landSfx: 'sfx_cosmiccroc_impact' });
        }
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
