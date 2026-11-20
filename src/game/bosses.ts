// Boss phases. Every main boss changes phase at 66% and 33% health (mini-bosses at 50%), with a
// banner, a camera hit and new moves. Every move has a visible tell and a skill answer; stomps can
// still be blocked by pizza defences, other moves cannot.

import Phaser from 'phaser';
import { HOVER_Y, W } from '../config';
import { FOOT_BY_ID } from '../data/feet';
import type { Arena } from './arena';
import type { Foot } from './Foot';
import type { Pizza } from './Pizza';

export interface Brain {
  /** Phase names, index 0 = phase 1. Longer than the boss's phase count is fine. */
  names: string[];
  /** Per phase: what the move does · what to do about it. Shown on the phase banner and under the boss bar. */
  info: string[];
  onPhase?(f: Foot, phase: number, a: Arena): void;
  update?(f: Foot, dt: number, a: Arena): void;
  /** Return true to cancel the smack's damage (parry, decoy, stone, sting). */
  onSmacked?(f: Foot, a: Arena, x: number, y: number, dmg: number): boolean;
  onStomp?(f: Foot, p: Pizza, a: Arena): void;
  /** Stomps from this boss ignore pizza defences right now. */
  pierce?(f: Foot): boolean;
  onDeath?(f: Foot, a: Arena): void;
}

class Every {
  t: number;
  constructor(
    public every: number,
    start = every,
  ) {
    this.t = start;
  }
  tick(dt: number): boolean {
    this.t -= dt;
    if (this.t <= 0) {
      this.t += this.every;
      return true;
    }
    return false;
  }
}

const rnd = <T>(a: T[]): T | undefined => a[Math.floor(Math.random() * a.length)];

/** A slow projectile thrown at the peel. Smack it to bat it away; let it land and it hits the peel. */
function throwAtPeel(a: Arena, key: string, from: { x: number; y: number }, sec: number, onLand: () => void, onSmack: () => void, spin = 6, look: { scale?: number; tint?: number } = {}): void {
  const to = { ...a.peelPoint() };
  const img = a.sc.add.image(from.x, from.y, key).setScale(look.scale ?? 1);
  if (look.tint !== undefined) img.setTint(look.tint);
  a.fxLayer.add(img);
  let done = false;
  const st = { t: 0 };
  a.sc.tweens.add({
    targets: st,
    t: 1,
    duration: sec * 1000,
    ease: 'Sine.In',
    onUpdate: () => {
      const k = st.t;
      img.x = from.x + (to.x - from.x) * k;
      img.y = from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 160;
      img.rotation += spin * 0.016;
    },
    onComplete: () => {
      if (done) return;
      done = true;
      img.destroy();
      const p = a.peelPoint();
      if (Math.hypot(p.x - to.x, p.y - to.y) < 220) onLand();
    },
  });
  a.addClickable({
    get x() {
      return img.x;
    },
    get y() {
      return img.y;
    },
    r: 70,
    priority: 2,
    alive: () => !done,
    hit: () => {
      if (done) return;
      done = true;
      a.fx.impact(img.x, img.y, true);
      a.sfx('sfx_slap_2', { volume: 0.8 });
      a.sc.tweens.add({ targets: img, y: img.y - 500, x: img.x + (Math.random() - 0.5) * 300, angle: 720, alpha: 0, duration: 500, onComplete: () => img.destroy() });
      onSmack();
    },
  });
}

/** A marker that sits on the screen for `sec`. */
function mark(a: Arena, key: string, x: number, y: number, sec: number, scale = 1): Phaser.GameObjects.Image {
  const img = a.sc.add.image(x, y, key).setScale(scale).setAlpha(0);
  a.fxLayer.add(img);
  a.sc.tweens.add({ targets: img, alpha: 1, duration: 150 });
  a.sc.tweens.add({ targets: img, scale: scale * 1.12, duration: 300, yoyo: true, repeat: -1 });
  a.sc.time.delayedCall(sec * 1000, () => img.destroy());
  return img;
}

/** Something falls onto a marked pizza: a reticle appears first, then the drop takes `sec` to land.
 * Smack it in the air to destroy it; let it land and the pizza loses a slice. */
function dropOn(a: Arena, f: Foot, p: Pizza, key: string, sec: number, label: string, look: { scale?: number; tint?: number; color?: string } = {}): void {
  const tx = p.x;
  const ty = p.surfaceY - 30;
  mark(a, 'p_reticle', tx, ty, sec + 0.3, 0.7);
  // it starts on screen and falls at a steady speed, so it's catchable for the whole drop
  // (it used to start above the screen and accelerate, which left a split second to react)
  const img = a.sc.add.image(tx, 70, key).setScale(look.scale ?? 0.8);
  if (look.tint !== undefined) img.setTint(look.tint);
  a.fxLayer.add(img);
  a.sfx('sfx_whoosh', { volume: 0.5, rate: 0.7 });
  let done = false;
  a.sc.tweens.add({
    targets: img,
    y: ty,
    angle: 200,
    duration: (sec + 0.3) * 1000,
    ease: 'Linear',
    onComplete: () => {
      if (done) return;
      done = true;
      img.destroy();
      if (!f.alive || p.dead) return;
      a.fx.explosion(tx, ty, 110);
      a.hitPizza(p, 1, label, look.color ?? '#ff8a6a');
    },
  });
  a.addClickable({
    get x() {
      return img.x;
    },
    get y() {
      return img.y;
    },
    r: 120,
    priority: 2,
    // a forgiving box around the falling object: taller than wide, since it's moving down
    contains: (x, y) => Math.abs(x - img.x) < 110 && Math.abs(y - img.y) < 140,
    alive: () => !done,
    hit: () => {
      if (done) return;
      done = true;
      a.fx.impact(img.x, img.y, true);
      a.sfx('sfx_slap_2', { volume: 0.8 });
      a.quip(img.x, img.y - 70, 'SMASHED!', '#7dff9a', 34);
      a.sc.tweens.add({ targets: img, alpha: 0, scale: 0.2, duration: 220, onComplete: () => img.destroy() });
    },
  });
}

/** A splat on the screen that hides what's behind it until smacked `hits` times. */
function screenSplat(a: Arena, key: string, x: number, y: number, hits: number, label: string): void {
  const img = a.sc.add.image(x, y, key).setScale(0.2).setAlpha(0.95);
  a.fxLayer.add(img);
  a.sc.tweens.add({ targets: img, scale: 1, duration: 260, ease: 'Back.Out' });
  let left = hits;
  a.addClickable({
    x,
    y,
    r: 230,
    priority: 1,
    alive: () => left > 0,
    hit: () => {
      left--;
      a.fx.puff(x + (Math.random() - 0.5) * 160, y + (Math.random() - 0.5) * 120, 8);
      a.sfx('sfx_squish', { volume: 0.6, rate: 1.2 });
      img.setScale(img.scale * 0.8);
      if (left <= 0) {
        a.quip(x, y - 80, label, '#ffffff', 40);
        a.sc.tweens.add({ targets: img, alpha: 0, scale: 0.2, duration: 200, onComplete: () => img.destroy() });
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

/** A wind-up over a pizza: smack the boss `need` times before it lands to cancel. */
function windup(a: Arena, f: Foot, key: string, sec: number, label: string, need: number, land: () => void): void {
  f.brain.windup = need;
  f.brain.windupCancelled = false;
  a.quip(f.x, f.cy - 160, label, '#ffd23f', 44);
  f.tint(0xffb0a0);
  a.sc.tweens.add({ targets: f.root, scaleY: f.root.scaleY * 0.88, duration: sec * 500, yoyo: true });
  a.sc.time.delayedCall(sec * 1000, () => {
    f.tint(null);
    const cancelled = !!f.brain.windupCancelled;
    f.brain.windup = 0;
    if (!f.alive || cancelled) return;
    land();
  });
  void key;
}

/** Called from onSmacked: counts a hit against an active wind-up. Returns true if it just got cancelled. */
function hitWindup(f: Foot, a: Arena, stun = 1.5): boolean {
  const left = Number(f.brain.windup ?? 0);
  if (left <= 0) return false;
  f.brain.windup = left - 1;
  if (left - 1 <= 0) {
    f.brain.windupCancelled = true;
    f.tint(null);
    a.quip(f.x, f.cy - 140, 'INTERRUPTED!', '#7dff9a', 46);
    a.sfx('sfx_crit');
    f.stun(stun);
    return true;
  }
  return false;
}

// ——— Main bosses ———

const bigfoot = (): Brain => {
  const pound = new Every(7, 3);
  const step = new Every(7, 4);
  return {
    names: ['BIG STEP', 'GROUND POUND', 'RAMPAGE'],
    info: ['Winds up a crushing stomp on one pizza · smack it twice to interrupt', 'Shakes every pizza and your peel · smack it twice during the wind-up', 'Enraged and faster, calling in more feet · keep hitting, it is nearly down'],
    onPhase: (f, ph, a) => {
      if (ph === 3) {
        f.enraged = true;
        f.brain.summonFast = true;
        a.quip(f.x, f.cy - 160, 'RAAAAH!', '#ff4d3d', 60);
      }
    },
    update: (f, dt, a) => {
      if (f.phase === 1 && step.tick(dt) && !f.brain.windup) {
        const p = f.target && !f.target.dead ? f.target : rnd(a.alivePizzas());
        if (!p) return;
        mark(a, 'p_reticle', p.x, p.surfaceY - 30, 1.4, 0.7);
        windup(a, f, '', 1.4, 'BIG STEP!', 2, () => {
          a.shake(300, 0.012);
          a.sfx('sfx_stomp');
          a.hitPizza(p, 1, 'CRUSHED!');
        });
      }
      if (f.phase < 2 || !pound.tick(dt)) return;
      windup(a, f, '', 1.3, 'GROUND POUND!', 2, () => {
        a.shake(500, 0.016);
        a.rumble(0.9, 400);
        a.sfx('sfx_stomp');
        for (const p of a.alivePizzas()) p.hurt();
        a.stunPeel(0.8, 'SHAKEN!');
      });
    },
    onSmacked: (f, a) => {
      hitWindup(f, a);
      return false;
    },
  };
};

const ironheel = (): Brain => {
  const vent = new Every(4.5, 2);
  const press = new Every(4.2, 1.5);
  const rockets = new Every(6.5, 4);
  const rivet = new Every(4.5, 3);
  let pistons: { p: Pizza; col: Phaser.GameObjects.Image; valve: Phaser.GameObjects.Image; lift: number; lockT: number }[] = [];
  const clearPistons = () => {
    for (const s of pistons) {
      s.col.destroy();
      s.valve.destroy();
      s.p.setLift(0);
    }
    pistons = [];
  };
  return {
    names: ['RIVET SHOT', 'OVERHEAT', 'PRESS LINE'],
    info: ['Fires rivets at your peel · smack them back for damage', 'Vents heat: armour drops to 0 while it glows red · pile on hits while it glows', 'Pistons lift pizzas into rocket fire · smack the glowing valves to lock them'],
    onPhase: (f, ph, a) => {
      if (ph === 3) {
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
            alive: () => f.alive && pistons.includes(s),
            hit: () => {
              s.lockT = 4;
              s.lift = 0;
              s.p.setLift(0);
              valve.setTint(0x8a909a);
              a.quip(valve.x, valve.y - 60, 'LOCKED!', '#7dff9a', 36);
              a.sfx('sfx_shield');
            },
          });
        }
      }
    },
    update: (f, dt, a) => {
      if (f.phase === 1 && rivet.tick(dt)) {
        throwAtPeel(a, 'p_valve', { x: f.x, y: f.cy }, 1.3, () => a.stunPeel(0.8, 'RIVETED!'), () => a.damageFoot(f, Math.round(f.maxHp * 0.025), 'RETURN TO SENDER!'), 8, { scale: 0.7, tint: 0xc0c6cf });
        a.sfx('sfx_piston', { volume: 0.5, rate: 1.6 });
      }
      if (f.phase === 2 || f.phase >= 3) {
        if (vent.tick(dt)) {
          // overheat window: armour off, glowing red
          f.brain.armorWas = f.armor;
          f.armor = 0;
          f.vuln = 1.3;
          f.tint(0xff8060);
          a.quip(f.x, f.cy - 150, 'OVERHEATED: ARMOUR 0', '#ffd23f', 38);
          a.sfx('sfx_fire', { volume: 0.6 });
          a.sc.time.delayedCall(3000, () => {
            if (!f.alive) return;
            f.armor = Number(f.brain.armorWas ?? 6);
            f.vuln = 1;
            f.tint(null);
          });
        }
      }
      if (f.phase >= 3) {
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
            const steam = a.sc.add.image(s.p.x, s.p.y + 40, 'p_steam').setAlpha(0.8).setScale(0.6);
            a.fxLayer.add(steam);
            a.sc.tweens.add({ targets: steam, y: steam.y - 120, alpha: 0, scale: 1, duration: 1000, onComplete: () => steam.destroy() });
            a.sfx('sfx_piston', { volume: 0.8 });
            a.sc.time.delayedCall(1000, () => {
              if (!f.alive || s.lockT > 0) return;
              s.lift = s.lift > 0 ? -30 : Math.random() < 0.7 ? 130 : -30;
              s.p.setLift(s.lift);
              a.quip(s.p.x, s.p.y - 120, s.lift > 0 ? 'RAISED!' : 'LOWERED', s.lift > 0 ? '#ff8a6a' : '#9ad8ff', 34);
            });
          }
        }
        if (rockets.tick(dt)) {
          const raised = pistons.filter((s) => s.lift > 0 && !s.p.dead).map((s) => s.p);
          const targets = (raised.length ? raised : a.alivePizzas()).slice(0, 2);
          for (const p of targets) {
            mark(a, 'p_reticle', p.x, p.surfaceY - 30, 2);
            a.sc.time.delayedCall(2000, () => {
              if (!f.alive || f.stunT > 0) return;
              a.fx.explosion(p.x, p.surfaceY, 160);
              a.sfx('sfx_explosion', { volume: 0.7 });
              a.hitPizza(p, 1, 'ROCKET!');
            });
          }
        }
      }
    },
    onDeath: () => clearPistons(),
  };
};

/** King Honk and his decoys during a shuffle, relative to his full size. */
const SHUFFLE_SIZE = 0.62;

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
    a.sfx('sfx_boing', { rate: 0.7 });
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
          d.setPhaseAura(BossDirector.auraFor(f.phase));
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
            a.sfx('sfx_whoosh', { volume: 0.5, rate: 0.9 + k * 0.1 });
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
    info: ['Winds up a horn blast that stuns your peel · smack it twice to stop it', 'Leaps away and drops back with two decoys in random lanes · decoys pop in one hit: find the real one', 'Throws cream pies that cover the screen · smack the pie in flight, or wipe the splat'],
    onSmacked: (f, a) => {
      hitWindup(f, a, 1);
      return false;
    },
    update: (f, dt, a) => {
      // the shuffle holds while the King is off screen
      if (shuffling) return;
      if (f.phase === 1 && honk.tick(dt) && !f.brain.windup) {
        windup(a, f, '', 1.3, 'HONK…', 2, () => {
          if (f.y < 100 || shuffling) return; // phase 2 began mid wind-up and he's leapt away
          a.sfx('sfx_warning', { rate: 1.4 });
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
        const x = 300 + Math.random() * 1320;
        const y = 260 + Math.random() * 340;
        const img = a.sc.add.image(f.x, f.cy, 'p_pie');
        a.fxLayer.add(img);
        a.sfx('sfx_whoosh');
        a.quip(f.x, f.cy - 160, 'PIE!', '#ffffff', 44);
        let blocked = false;
        // a slower lob than before: there's time to smack it out of the air
        a.sc.tweens.add({
          targets: img,
          x,
          y,
          angle: 540,
          duration: 1150,
          ease: 'Quad.In',
          onComplete: () => {
            if (blocked) return;
            blocked = true;
            img.destroy();
            if (!f.alive || !a.inWave()) return;
            a.sfx('sfx_squish', { rate: 0.7 });
            screenSplat(a, 'p_cream', x, y, 2, 'WIPED!');
          },
        });
        a.addClickable({
          get x() {
            return img.x;
          },
          get y() {
            return img.y;
          },
          r: 80,
          priority: 2,
          alive: () => !blocked,
          hit: () => {
            if (blocked) return;
            blocked = true;
            a.fx.impact(img.x, img.y, true);
            a.quip(img.x, img.y - 60, 'BLOCKED!', '#7dff9a', 36);
            a.sc.tweens.add({ targets: img, alpha: 0, y: img.y - 300, duration: 300, onComplete: () => img.destroy() });
          },
        });
      }
    },
  };
};

const trex = (): Brain => {
  const roar = new Every(9, 4);
  const swipe = new Every(7, 4);
  let roaring = 0;
  return {
    names: ['TAIL SWIPE', 'DOUBLE STOMP', 'ROAR'],
    info: ['Marks two pizzas, then swipes them both · smack it twice to interrupt', 'Every stomp lands twice · stop it before it lands', 'Takes a deep breath, then roars to speed up every foot · Peel Slam during the roar to stop it'],
    onSmacked: (f, a) => {
      hitWindup(f, a, 1.2);
      return false;
    },
    onStomp: (f, p, a) => {
      if (f.phase >= 2 && !f.brain.second) {
        f.brain.second = true;
        a.sc.time.delayedCall(220, () => {
          if (f.alive && !p.dead) a.hitPizza(p, 1, 'AGAIN!');
          f.brain.second = false;
        });
      }
    },
    update: (f, dt, a) => {
      if (roaring > 0) {
        roaring -= dt;
        // a slam during the roar cancels it
        if (a.now() - a.slammedAt() < 0.2) {
          roaring = 0;
          a.cancelHurry();
          f.vuln = 1;
          a.quip(f.x, f.cy - 150, 'ROAR STOPPED!', '#7dff9a', 46);
        }
        if (roaring <= 0) f.vuln = 1;
      }
      if (f.phase === 1 && swipe.tick(dt) && !f.brain.windup) {
        const ps = a.alivePizzas().sort((p, q) => p.x - q.x);
        const i = Math.floor(Math.random() * Math.max(1, ps.length - 1));
        const pair = ps.slice(i, i + 2);
        for (const p of pair) mark(a, 'p_reticle', p.x, p.surfaceY - 30, 1.5, 0.7);
        windup(a, f, '', 1.5, 'TAIL SWIPE!', 2, () => {
          a.sfx('sfx_whoosh', { volume: 1, rate: 0.7 });
          for (const [k, p] of pair.entries()) a.sc.time.delayedCall(k * 160, () => !p.dead && a.hitPizza(p, 1, 'SWIPED!'));
        });
      }
      if (f.phase >= 3 && roar.tick(dt)) {
        // tell: a deep breath first, so there's time to get the slam ready
        a.quip(f.x, f.cy - 170, 'DEEP BREATH…', '#ffb0a0', 46);
        a.sfx('sfx_whoosh', { rate: 0.5, volume: 0.6 });
        a.sc.time.delayedCall(1000, () => {
          if (!f.alive) return;
          a.quip(f.x, f.cy - 170, 'ROOOOAR!', '#ff4d3d', 64);
          a.shake(600, 0.01);
          a.rumble(0.6, 600);
          a.sfx('sfx_warning');
          a.hurry(1.4, 3.5);
          roaring = 3.5;
          f.vuln = 1.6; // wide open while it roars
        });
      }
    },
  };
};

const colossus = (): Brain => {
  let parryCount = 0;
  return {
    names: ['IRON SHELL', 'PARRY', 'SHATTERED'],
    info: ['Thick armour soaks small hits · big hits (crits, slams) crack it', 'Parries every third smack · when it glints, hold your next smack', 'Armour gone, but its stomps pierce shields · hit hard and fast'],
    onPhase: (f, ph, a) => {
      if (ph === 3) {
        f.armor = 0;
        f.enraged = true;
        a.fx.explosion(f.cx, f.cy, 260);
      }
    },
    onSmacked: (f, a, x, y, dmg) => {
      if (f.phase === 1 && dmg >= 15 && f.armor > 2) {
        f.armor--;
        a.quip(f.x + 70, f.cy - 70, 'CRACK!', '#c7ccd4', 34);
      }
      if (f.phase === 2) {
        parryCount++;
        if (parryCount % 3 === 0) {
          a.fx.ring(x, y, 0xffd34d, 0.8, 1);
          a.quip(f.x, f.cy - 120, 'PARRIED!', '#ffd34d', 44);
          a.sfx('sfx_shield');
          return true;
        }
        if (parryCount % 3 === 2) a.quip(f.x, f.cy - 100, 'glint…', '#ffe680', 28);
      }
      return false;
    },
    pierce: (f) => f.phase >= 3,
  };
};

const phantomking = (): Brain => {
  const echo = new Every(9, 2);
  const hop = new Every(8, 8);
  let hopping = false;
  return {
    names: ['FADE', 'ECHOES', 'POSSESSION'],
    info: ['Fades out between stomps · hit it while it is solid', 'Summons faint echoes of past bosses · echoes are weak: clear them fast', 'Possesses a pizza, then hops to another every 8 s · Peel Slam while the Ghost is solid'],
    onPhase: (_f, ph, a) => {
      if (ph === 3) {
        const p = rnd(a.alivePizzas());
        if (p) a.possess(p);
        a.sfx('sfx_possess');
      }
    },
    update: (f, dt, a) => {
      if (f.phase === 2 && echo.tick(dt)) {
        const ids = ['bigfoot', 'ironheel', 'clownking', 'trex', 'colossus'];
        const id = rnd(ids)!;
        const e = a.spawn(id, rnd(a.alivePizzas()) ?? null);
        if (e) {
          e.brain.echo = true;
          e.maxHp = e.hp = Math.round(f.maxHp * 0.06);
          e.root.setScale(0.62);
          e.setVisualAlpha(0.55);
          e.tint(0x9ad8ff);
          a.quip(e.x, 220, `ECHO OF ${FOOT_BY_ID[id].name}`, '#9ad8ff', 34);
        }
      }
      if (f.phase >= 3) {
        if (a.possessed() && !hopping && hop.tick(dt)) {
          const others = a.alivePizzas().filter((p) => p !== a.possessed());
          const next = rnd(others);
          if (next) {
            // tell: the next pizza glows for a second before the curse moves
            hopping = true;
            const glow = a.sc.add.image(next.x, next.surfaceY + 20, 'glow').setTint(0xc9a8ff).setBlendMode(Phaser.BlendModes.ADD).setScale(2.2, 1.1).setAlpha(0.8);
            a.fxLayer.add(glow);
            a.quip(next.x, next.surfaceY - 160, 'THE CURSE STIRS…', '#c9a8ff', 34);
            a.sc.time.delayedCall(1000, () => {
              glow.destroy();
              hopping = false;
              if (!f.alive || !a.possessed() || next.dead) return;
              a.possess(next);
              a.quip(next.x, next.surfaceY - 160, 'THE CURSE MOVES!', '#c9a8ff', 38);
              a.sfx('sfx_possess', { volume: 0.7 });
            });
          }
        }
        // a slam while the ghost is solid breaks the possession
        if (a.possessed() && !f.phased && a.now() - a.slammedAt() < 0.2) {
          a.possess(null);
          f.stun(2.5);
          a.banner('EXORCISED!', 'The curse is broken', 'clear');
          a.sfx('sfx_levelup');
          a.sc.time.delayedCall(9000, () => {
            if (!f.alive) return;
            const p = rnd(a.alivePizzas());
            if (p) a.possess(p);
          });
        }
      }
    },
    onDeath: (_f, a) => a.possess(null),
  };
};

const cosmiccroc = (): Brain => {
  const flip = new Every(8, 3);
  const hole = new Every(11, 5);
  const meteor = new Every(5.5, 3);
  return {
    names: ['METEOR', 'GRAVITY FLIP', 'BLACK HOLE'],
    info: ['Calls meteors onto marked pizzas · smack the meteor before it lands', 'A pizza glows purple, then it stomps up through the table · watch for the glow and hit it as it surfaces', 'Opens a black hole that pulls every foot to one pizza · smack the black hole 3 times to close it'],
    update: (f, dt, a) => {
      if (f.phase === 1 && meteor.tick(dt)) {
        const p = rnd(a.alivePizzas());
        if (p) dropOn(a, f, p, 'p_snowball', 1.6, 'METEOR!', { scale: 0.75, tint: 0xff8a3d });
      }
      if (f.phase >= 2 && !f.puppet && f.state === 'hover' && flip.tick(dt)) {
        // tell: the pizza glows from beneath for a second, then the croc stomps UP from under the table
        const p = rnd(a.alivePizzas());
        if (!p) return;
        const glow = a.sc.add.image(p.x, p.surfaceY + 40, 'glow').setTint(0x9a6bff).setBlendMode(Phaser.BlendModes.ADD).setScale(2.4, 1.2).setAlpha(0.8);
        a.fxLayer.add(glow);
        a.quip(p.x, p.surfaceY - 140, 'GRAVITY FLIP!', '#b06bff', 42);
        f.puppet = true;
        f.root.setVisible(false);
        a.sc.time.delayedCall(1100, () => {
          glow.destroy();
          if (!f.alive) return;
          f.root.setVisible(true).setRotation(Math.PI);
          f.x = p.x;
          f.y = 1250;
          a.sc.tweens.add({
            targets: f,
            y: p.surfaceY + f.meta.footHeight * f.scale,
            duration: 380,
            ease: 'Quad.Out',
            onComplete: () => {
              if (!f.alive) return;
              a.hitPizza(p, 1, 'FROM BELOW!');
              a.shake(300, 0.01);
              a.sc.tweens.add({
                targets: f,
                y: 1250,
                duration: 600,
                delay: 400,
                ease: 'Quad.In',
                onComplete: () => {
                  if (!f.alive) return;
                  f.root.setRotation(0);
                  f.y = 200;
                  f.puppet = false;
                  f.setState('hover');
                },
              });
            },
          });
        });
      }
      if (f.phase >= 3 && hole.tick(dt)) {
        const p = rnd(a.alivePizzas());
        if (!p) return;
        const bh = a.sc.add.image(p.x, 330, 'p_blackhole').setScale(0.2);
        a.fxLayer.add(bh);
        a.sc.tweens.add({ targets: bh, scale: 1, duration: 400, ease: 'Back.Out' });
        a.sc.tweens.add({ targets: bh, angle: 360, duration: 2000, repeat: -1 });
        a.sfx('sfx_zap', { rate: 0.5 });
        a.quip(p.x, 200, 'BLACK HOLE!', '#b06bff', 44);
        let left = 3;
        let open = true;
        const close = () => {
          open = false;
          a.sc.tweens.add({ targets: bh, scale: 0, duration: 300, onComplete: () => bh.destroy() });
        };
        a.addClickable({ x: p.x, y: 330, r: 110, priority: 2, alive: () => open, hit: () => {
          left--;
          a.fx.impact(p.x, 330, true);
          if (left <= 0) {
            a.quip(p.x, 260, 'CLOSED!', '#7dff9a', 40);
            close();
          }
        } });
        const pull = a.sc.time.addEvent({ delay: 250, repeat: 23, callback: () => {
          if (!open) return;
          for (const o of a.allFeet()) if (o.alive && !o.isBossLike) o.target = p;
        } });
        a.sc.time.delayedCall(6000, () => {
          pull.remove();
          if (open) close();
        });
      }
    },
  };
};

const nonna = (): Brain => {
  const slipper = new Every(4, 2);
  const pin = new Every(6.5, 3);
  let n = 0;
  return {
    names: ['ROLLING PIN', 'FLYING SLIPPERS', 'WOODEN SPOON'],
    info: ['Winds up a rolling-pin whack on one pizza · smack her twice to interrupt', 'Throws slippers at your peel · smack them back at her', 'Her spoon blocks every second smack · Peel Slams and burns get through'],
    update: (f, dt, a) => {
      if (f.phase === 1 && pin.tick(dt) && !f.brain.windup) {
        const p = f.target && !f.target.dead ? f.target : rnd(a.alivePizzas());
        if (!p) return;
        mark(a, 'p_reticle', p.x, p.surfaceY - 30, 1.4, 0.7);
        windup(a, f, '', 1.4, 'ROLLING PIN!', 2, () => a.hitPizza(p, 1, 'WHACKED!', '#e0a868'));
      }
      if (f.phase >= 2 && slipper.tick(dt)) {
        throwAtPeel(a, 'p_slipper', { x: f.x, y: f.cy }, 1.5, () => a.stunPeel(1, 'SLIPPERED!'), () => {
          a.damageFoot(f, Math.round(f.maxHp * 0.03), 'RETURN TO SENDER!');
        });
        a.sfx('sfx_whoosh', { rate: 0.8 });
      }
      if (f.phase >= 3) f.brain.spoonReady = n % 2 === 1;
    },
    onSmacked: (f, a, x, y) => {
      if (hitWindup(f, a, 1)) return false;
      if (f.phase < 3) return false;
      n++;
      if (n % 2 === 0) {
        a.fx.ring(x, y, 0xe0a868, 0.8, 1);
        a.quip(f.x, f.cy - 120, 'SPOON PARRY!', '#e0a868', 42);
        a.sfx('sfx_shield', { rate: 0.8 });
        return true;
      }
      a.quip(f.x + 80, f.cy - 60, 'spoon up!', '#ffe680', 26);
      return false;
    },
  };
};

const gargoyle = (): Brain => {
  const swoop = new Every(3, 3);
  const stone = new Every(9, 3);
  let stoneT = 0;
  let cracks = 0;
  // phase 3+: it hides behind a flock of pigeons, can't be hurt until every one is gone,
  // then is exposed for a few seconds before calling the next (bigger at higher heats)
  let flock: Foot[] = [];
  let warded = false;
  let exposedT = 0;
  const flockSize = (f: Foot, a: Arena) => Math.ceil(3 * a.heatCount()) + (f.phase >= 4 ? 1 : 0);
  const callFlock = (f: Foot, a: Arena) => {
    flock = [];
    const n = flockSize(f, a);
    for (let i = 0; i < n; i++) {
      const pg = a.spawn('pigeon', rnd(a.alivePizzas()) ?? null, f.x + (i - (n - 1) / 2) * 110);
      if (pg) {
        pg.y -= (i % 3) * 60;
        flock.push(pg);
      }
    }
    if (!flock.length) {
      exposedT = 1; // nothing could spawn: try again shortly rather than every frame
      return;
    }
    warded = true;
    f.shielded = true;
    f.tint(0xa9b8d0);
    a.quip(f.x, f.cy - 150, `PIGEON STORM ×${flock.length}`, '#c7ccd4', 44);
    a.sfx('sfx_boing', { rate: 1.6 });
  };
  return {
    names: ['SWOOP', 'STONE FORM', 'PIGEON STORM'],
    info: ['Swoops between pizzas while it hovers · strike when it settles over one', 'Turns to stone: smacks do no damage · crack it 6 times to break it and stun it', "Hides behind a flock of pigeons and can't be hurt · clear every pigeon, then hit it while it's exposed"],
    onPhase: (f, phase, a) => {
      if (phase < 3) return;
      // leaving stone form behind: the transform beat's end drops the stone shield too
      stoneT = 0;
      f.brain.wasShielded = false;
      f.tint(null);
      if (phase === 3) exposedT = 0;
      a.fx.puff(f.cx, f.cy, 6);
    },
    update: (f, dt, a) => {
      if (swoop.tick(dt) && f.state === 'hover') {
        const p = rnd(a.alivePizzas().filter((q) => q !== f.target));
        if (p) {
          f.target = p;
          a.sfx('sfx_whoosh', { rate: 0.7 });
        }
      }
      if (stoneT > 0) {
        stoneT -= dt;
        if (stoneT <= 0) {
          f.shielded = false;
          f.tint(null);
        }
      } else if (f.phase === 2 && stone.tick(dt)) {
        stoneT = 4.5;
        cracks = 0;
        f.shielded = true;
        f.tint(0x8a8a8a);
        a.quip(f.x, f.cy - 150, 'STONE FORM!', '#c7ccd4', 44);
        a.sfx('sfx_shield', { rate: 0.6 });
      }
      if (f.phase >= 3) {
        if (warded) {
          f.shielded = true; // keep the ward through the transform beat restoring it
          flock = flock.filter((pg) => pg.alive);
          if (!flock.length) {
            warded = false;
            f.shielded = false;
            f.tint(null);
            exposedT = f.phase >= 4 ? 4 : 5;
            a.quip(f.x, f.cy - 150, 'EXPOSED! HIT IT!', '#7dff9a', 46);
            a.sfx('sfx_crit');
          }
        } else if (exposedT > 0) {
          exposedT -= dt;
        } else if (a.inWave()) callFlock(f, a);
      }
    },
    onSmacked: (f, a) => {
      if (warded) {
        a.quip(f.x + 60, f.cy - 60, `CLEAR THE PIGEONS · ${flock.filter((pg) => pg.alive).length} LEFT`, '#c7ccd4', 30);
        return true;
      }
      if (!f.shielded) return false;
      cracks++;
      a.quip(f.x + 60, f.cy - 60, `CRACK ${cracks}/6`, '#c7ccd4', 30);
      if (cracks >= 6) {
        stoneT = 0;
        f.shielded = false;
        f.tint(null);
        f.stun(1.5);
        a.quip(f.x, f.cy - 150, 'STONE BROKEN!', '#7dff9a', 46);
        a.sfx('sfx_crit');
      }
      return true;
    },
  };
};

const kraken = (): Brain => {
  const grab = new Every(8, 2);
  const ink = new Every(8, 4);
  const splash = new Every(5.5, 3);
  return {
    names: ['SPLASH', 'TENTACLE GRAB', 'INK CLOUD'],
    info: ['Hurls water at marked pizzas · smack the splash before it lands', 'Grabs a pizza to drag it under · smack the tentacle 3 times to free it', 'Squirts ink across the screen · smack the ink twice to clear it'],
    update: (f, dt, a) => {
      if (f.phase === 1 && splash.tick(dt)) {
        const p = rnd(a.alivePizzas());
        if (p) dropOn(a, f, p, 'p_snowball', 1.6, 'SPLASH!', { scale: 0.7, tint: 0x5ab8ff, color: '#7fd0ff' });
      }
      if (f.phase >= 2 && grab.tick(dt)) {
        const p = rnd(a.alivePizzas().filter((q) => !q.flags.grabbed));
        if (!p) return;
        p.flags.grabbed = true;
        const t = a.sc.add.image(p.x + p.radius * 0.9, p.y + 260, 'p_tentacle').setOrigin(0.5, 1).setScale(0.9);
        a.underLayer.add(t);
        a.sc.tweens.add({ targets: t, y: p.y + 60, duration: 500, ease: 'Back.Out' });
        a.quip(p.x, p.surfaceY - 150, 'GRABBED!', '#b46ad8', 44);
        a.sfx('sfx_squish', { rate: 0.6 });
        let left = 3;
        let freed = false;
        a.addClickable({ get x() { return t.x; }, get y() { return t.y - 120; }, r: 90, priority: 2, alive: () => !freed && f.alive, hit: () => {
          left--;
          a.fx.impact(t.x, t.y - 120, false);
          a.sfx('sfx_slap_1');
          if (left <= 0) {
            freed = true;
            p.flags.grabbed = false;
            a.quip(p.x, p.surfaceY - 150, 'FREED!', '#7dff9a', 42);
            a.sc.tweens.add({ targets: t, y: p.y + 400, duration: 400, onComplete: () => t.destroy() });
          }
        } });
        a.sc.time.delayedCall(4500, () => {
          if (freed) return;
          freed = true;
          p.flags.grabbed = false;
          if (f.alive) a.hitPizza(p, 2, 'DRAGGED UNDER!', '#b46ad8');
          a.sc.tweens.add({ targets: t, y: p.y + 400, duration: 400, onComplete: () => t.destroy() });
        });
      }
      if (f.phase >= 3 && ink.tick(dt)) {
        const x = 300 + Math.random() * 1320;
        const y = 300 + Math.random() * 280;
        // tell: a squirt flies out of the kraken first
        a.quip(f.x, f.cy - 150, 'SQUIRT!', '#b46ad8', 38);
        const blob = a.sc.add.image(f.x, f.cy, 'p_ink').setScale(0.2);
        a.fxLayer.add(blob);
        a.sc.tweens.add({ targets: blob, x, y, duration: 700, ease: 'Quad.Out', onComplete: () => {
          blob.destroy();
          if (!f.alive || !a.inWave()) return;
          screenSplat(a, 'p_ink', x, y, 2, 'INK CLEARED!');
        } });
        a.sfx('sfx_squish', { rate: 0.5 });
      }
    },
  };
};

const rinkqueen = (): Brain => {
  const shuffle = new Every(7, 2);
  const dash = new Every(6.5, 3);
  const puck = new Every(4.5, 3);
  return {
    names: ['PUCK SHOT', 'ROLLING PIZZAS', 'SPEED DASH'],
    info: ['Shoots pucks at your peel · smack them back for damage', 'Whistles, then shuffles the pizzas around · follow the pizzas as they roll', 'Marks a line of pizzas and dashes through them · smack her 3 times during the wind-up'],
    update: (f, dt, a) => {
      if (f.phase === 1 && puck.tick(dt)) {
        throwAtPeel(a, 'p_plate', { x: f.x, y: f.cy }, 1.2, () => a.stunPeel(0.8, 'PUCKED!'), () => a.damageFoot(f, Math.round(f.maxHp * 0.025), 'SLAPSHOT!'), 12, { scale: 0.55, tint: 0x2a2a34 });
        a.sfx('sfx_whistle', { rate: 1.6, volume: 0.5 });
      }
      if (f.phase >= 2 && shuffle.tick(dt)) {
        a.sfx('sfx_whistle');
        a.quip(960, 300, 'SHUFFLE!', '#4cf0e0', 56);
        for (const p of a.alivePizzas()) {
          for (let i = 0; i < 3; i++) a.fx.puff(p.x + (i - 1) * 80, p.y + 30, 2);
        }
        a.sc.time.delayedCall(1000, () => {
          if (!f.alive) return;
          const ps = a.allPizzas();
          const xs = ps.map((p) => p.x);
          for (let i = xs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [xs[i], xs[j]] = [xs[j], xs[i]];
          }
          ps.forEach((p, i) => p.rollTo(xs[i]));
          ps.sort((p, q) => p.x - q.x);
        });
      }
      if (f.phase >= 3 && dash.tick(dt)) {
        const ps = a.alivePizzas().sort((p, q) => p.x - q.x);
        const start = Math.floor(Math.random() * Math.max(1, ps.length - 2));
        const line = ps.slice(start, start + 3);
        if (!line.length) return;
        for (const p of line) mark(a, 'p_reticle', p.x, p.surfaceY - 20, 1.3, 0.7);
        a.sfx('sfx_whistle', { rate: 1.3 });
        windup(a, f, '', 1.3, 'SPEED DASH!', 3, () => {
          for (const [i, p] of line.entries()) a.sc.time.delayedCall(i * 140, () => !p.dead && a.hitPizza(p, 1, 'DASHED!', '#ff4fd8'));
          a.sfx('sfx_whoosh', { volume: 1, rate: 1.2 });
        });
      }
    },
    onSmacked: (f, a) => {
      hitWindup(f, a, 1);
      return false;
    },
  };
};

const yeti = (): Brain => {
  const ball = new Every(4, 2);
  const slide = new Every(10, 5);
  const icicle = new Every(5.5, 3);
  let avalanche = 0;
  return {
    names: ['ICICLES', 'SNOWBALLS', 'AVALANCHE'],
    info: ['Drops icicles on marked pizzas · smack them as they fall', 'Throws snowballs at your peel · smack them out of the air', 'Rumbles, then an avalanche speeds up every foot · Peel Slam to stop it'],
    update: (f, dt, a) => {
      if (f.phase === 1 && icicle.tick(dt)) {
        const p = rnd(a.alivePizzas());
        if (p) dropOn(a, f, p, 'p_snowball', 1.6, 'ICICLE!', { scale: 0.7, tint: 0xbfe8ff, color: '#a8dcff' });
      }
      if (f.phase >= 2 && ball.tick(dt)) {
        throwAtPeel(a, 'p_snowball', { x: f.x, y: f.cy }, 1.3, () => a.stunPeel(1, 'FROZEN PEEL!'), () => a.quip(a.peelPoint().x, a.peelPoint().y - 60, 'SHATTERED!', '#a8dcff', 32), 3);
        a.sfx('sfx_whoosh', { rate: 0.9 });
      }
      if (avalanche > 0) {
        avalanche -= dt;
        if (a.now() - a.slammedAt() < 0.2) {
          avalanche = 0;
          a.cancelHurry();
          a.quip(960, 320, 'AVALANCHE STOPPED!', '#7dff9a', 50);
        }
      }
      if (f.phase >= 3 && slide.tick(dt)) {
        a.quip(960, 300, 'RUMBLE…', '#cfe0ff', 50);
        a.rumble(0.5, 900);
        a.shake(900, 0.004);
        a.sc.time.delayedCall(1000, () => {
          if (!f.alive) return;
          a.quip(960, 340, 'AVALANCHE! Slam to stop it', '#ffffff', 46);
          a.hurry(1.5, 4);
          avalanche = 4;
        });
      }
    },
  };
};

// ——— Mini-bosses (two phases) ———

const headwaiter = (): Brain => {
  const serve = new Every(5, 2);
  const tray = new Every(4.5, 2.5);
  return {
    names: ['TRAY TOSS', 'SERVICE!'],
    info: ['Flings silver trays at your peel · smack them back at him', 'Calls waiters to the table · clear them before they stomp'],
    update: (f, dt, a) => {
      if (f.phase === 1 && tray.tick(dt)) {
        throwAtPeel(a, 'p_tray', { x: f.x, y: f.cy }, 1.3, () => a.stunPeel(0.7, 'TRAYED!'), () => a.damageFoot(f, Math.round(f.maxHp * 0.04), 'RETURN TO SENDER!'), 9, { scale: 0.6 });
        a.sfx('sfx_whoosh', { rate: 1.2 });
      }
      if (f.phase >= 2 && serve.tick(dt)) {
        for (let i = 0; i < 2; i++) a.spawn(FOOT_BY_ID.waiter ? 'waiter' : 'bob', rnd(a.alivePizzas()) ?? null, f.x + (i ? 160 : -160));
        a.quip(f.x, f.cy - 150, 'TABLE FOR TWO!', '#ffffff', 40);
      }
    },
  };
};

const doughboy = (): Brain => {
  let since = 0;
  let puffT = 0;
  const balls = new Every(5, 2.5);
  return {
    names: ['DOUGH BALLS', 'RISING'],
    info: ['Lobs dough balls onto marked pizzas · smack them as they fall', 'Rises back to health if you leave it alone · keep hitting it'],
    update: (f, dt, a) => {
      since += dt;
      if (f.phase === 1 && balls.tick(dt)) {
        const p = rnd(a.alivePizzas());
        if (p) dropOn(a, f, p, 'p_dough', 1.5, 'DOUGHED!', { scale: 0.45, color: '#f6e6c4' });
      }
      if (f.phase >= 2 && since > 1.5 && f.hp < f.maxHp) {
        f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.03 * dt);
        // visible: it swells and sparkles green while it heals
        puffT -= dt;
        if (puffT <= 0) {
          puffT = 0.9;
          a.fx.healBurst(f.cx, f.cy);
          a.quip(f.x, f.cy - 140, 'rising…', '#7dff9a', 30);
        }
      }
    },
    onSmacked: () => {
      since = 0;
      return false;
    },
  };
};

const sweep = (): Brain => {
  let soot: Phaser.GameObjects.Image | null = null;
  let clearT = 0;
  return {
    names: ['SOOT CLOUD', 'CHIMNEY HOP'],
    info: ['Hides inside a soot cloud · a smack clears the soot for 3 s', 'A puff of soot marks where it hops next · follow the puff'],
    update: (f, dt, a) => {
      if (!soot) {
        soot = a.sc.add.image(f.x, f.cy, 'p_soot').setScale(2.2).setAlpha(0.75);
        a.fxLayer.add(soot);
      }
      clearT -= dt;
      soot.setPosition(f.x, f.cy + 40).setAlpha(clearT > 0 ? 0 : 0.75);
      if (f.phase >= 2 && !f.brain.hopping && Math.random() < dt / 3 && f.state === 'hover') {
        const p = rnd(a.alivePizzas().filter((q) => q !== f.target));
        if (p) {
          // tell: soot puffs where it's about to pop out
          f.brain.hopping = true;
          a.fx.puff(p.x, f.cy, 10);
          a.sc.time.delayedCall(650, () => {
            f.brain.hopping = false;
            if (!f.alive || p.dead || f.state !== 'hover') return;
            f.target = p;
            f.x = p.x;
            a.fx.puff(f.x, f.cy, 10);
            a.quip(f.x, f.cy - 150, 'POP!', '#cfcfcf', 36);
          });
        }
      }
    },
    onSmacked: () => {
      clearT = 3;
      return false;
    },
    onDeath: () => {
      soot?.destroy();
    },
  };
};

const pigeonking = (): Brain => {
  const flock = new Every(6, 1);
  const bomb = new Every(5, 2.5);
  return {
    names: ['BIRD BOMB', 'FLOCK CALL'],
    info: ['Drops bombs on marked pizzas · smack them as they fall', 'Calls three pigeons at a time · clear the flock fast'],
    update: (f, dt, a) => {
      if (f.phase === 1 && bomb.tick(dt)) {
        const p = rnd(a.alivePizzas());
        if (p) dropOn(a, f, p, 'p_cream', 1.5, 'SPLAT!', { scale: 0.3, color: '#ffffff' });
      }
      if (f.phase >= 2 && flock.tick(dt)) {
        for (let i = 0; i < 3; i++) a.spawn('pigeon', rnd(a.alivePizzas()) ?? null, f.x + (i - 1) * 110);
        a.quip(f.x, f.cy - 150, 'COO COO!', '#c7ccd4', 44);
      }
    },
  };
};

const sandcastle = (): Brain => {
  const build = new Every(6, 2);
  let wall: Phaser.GameObjects.Image | null = null;
  let hits = 0;
  return {
    names: ['SAND WALLS', 'HIGH TIDE BUILDER'],
    info: ['Builds a sand wall that blocks damage · smack it 3 times to smash it', 'Rebuilds every 4 s · smash each wall straight away'],
    onPhase: (_f, ph) => {
      if (ph === 2) build.every = 4;
    },
    update: (f, dt, a) => {
      wall?.setPosition(f.x, f.cy + 40);
      if (!wall && build.tick(dt)) {
        wall = a.sc.add.image(f.x, f.cy + 40, 'p_sand').setScale(1.3);
        a.fxLayer.add(wall);
        f.shielded = true;
        hits = 0;
        a.quip(f.x, f.cy - 150, 'SAND WALL!', '#f8dca0', 40);
      }
    },
    onSmacked: (f, a) => {
      if (!f.shielded) return false;
      hits++;
      a.fx.puff(f.x, f.cy + 40, 6);
      if (hits >= 3) {
        f.shielded = false;
        wall?.destroy();
        wall = null;
        a.quip(f.x, f.cy - 150, 'SMASHED!', '#7dff9a', 40);
      }
      return true;
    },
    onDeath: () => wall?.destroy(),
  };
};

const jellyfish = (): Brain => {
  let t = 0;
  return {
    names: ['GLOW', 'BRIGHT GLOW'],
    info: ['Stings your peel while it glows pink · hit it only when it dims', 'Glows for longer · wait for the dim, then strike'],
    update: (f, dt) => {
      t += dt;
      const cycle = f.phase >= 2 ? 4 : 4;
      const glowFor = f.phase >= 2 ? 2.5 : 2;
      const glowing = t % cycle < glowFor;
      f.brain.glowing = glowing;
      f.tint(glowing ? 0xff9ae0 : null);
    },
    onSmacked: (f, a) => {
      if (!f.brain.glowing) return false;
      a.stunPeel(0.6, 'STUNG! Hit it when it dims');
      a.sfx('sfx_zap');
      return true;
    },
  };
};

const shortorder = (): Brain => {
  const order = new Every(7, 2);
  return {
    names: ['ORDER UP', 'RUSH HOUR'],
    info: ['Tickets a pizza: the next feet all go for it · guard the ticketed pizza', 'Tickets two pizzas at once · guard both'],
    update: (f, dt, a) => {
      if (!order.tick(dt)) return;
      const n = f.phase >= 2 ? 2 : 1;
      const ps = [...a.alivePizzas()].sort(() => Math.random() - 0.5).slice(0, n);
      for (const p of ps) {
        a.order(p, 3);
        mark(a, 'p_ticket', p.x, p.surfaceY - 190, 3);
        a.quip(p.x, p.surfaceY - 120, 'ORDER UP!', '#ffffff', 36);
      }
    },
  };
};

const milkshake = (): Brain => {
  const freeze = new Every(6, 3);
  const straw = new Every(7, 4);
  return {
    names: ['BRAIN FREEZE', 'BOTTOMS UP'],
    info: ['Winds up a brain freeze that slows your peel · smack it during the wind-up', 'Slurps a marked pizza · smack it twice to interrupt'],
    update: (f, dt, a) => {
      if (freeze.tick(dt) && !f.brain.windup) {
        windup(a, f, '', 1.1, 'BRAIN FREEZE…', 1, () => {
          a.slowPeel(2);
          a.quip(a.peelPoint().x, a.peelPoint().y - 70, 'BRAIN FREEZE!', '#a8dcff', 36);
          a.sfx('sfx_freeze', { volume: 0.7 });
        });
      }
      if (f.phase >= 2 && straw.tick(dt) && !f.brain.windup) {
        const p = rnd(a.alivePizzas());
        if (!p) return;
        mark(a, 'p_reticle', p.x, p.surfaceY - 30, 3, 0.6);
        a.quip(p.x, p.surfaceY - 150, 'SLURP INCOMING', '#ff9ad8', 34);
        windup(a, f, '', 3, 'SLUUURP…', 2, () => a.hitPizza(p, 1, 'SLURPED!', '#ff9ad8'));
      }
    },
    onSmacked: (f, a) => {
      hitWindup(f, a, 0.8);
      return false;
    },
  };
};

const iceskate = (): Brain => ({
  names: ['ICE TRAILS', 'TRIPLE AXEL'],
  info: ['Feet near it skate in faster · take it out first', 'Spins into bursts of speed · hit it between bursts'],
  update: (f, dt, a) => {
    for (const o of a.allFeet()) if (o !== f && o.alive && Math.abs(o.x - f.x) < 220) o.hurry = Math.max(o.hurry, 1.3);
    if (f.phase >= 2) f.hurry = 1 + Math.abs(Math.sin(a.now() * 1.3)) * 0.8;
    void dt;
  },
});

const lumberjack = (): Brain => {
  const chop = new Every(6, 3);
  return {
    names: ['TIMBER', 'DOUBLE CHOP'],
    info: ['Marks a pizza, then chops it · smack it once during the wind-up', 'Faster chops that take 2 slices · react quicker'],
    update: (f, dt, a) => {
      if (!chop.tick(dt) || f.brain.windup) return;
      const p = f.target && !f.target.dead ? f.target : rnd(a.alivePizzas());
      if (!p) return;
      const sec = f.phase >= 2 ? 0.9 : 1.3;
      mark(a, 'p_reticle', p.x, p.surfaceY - 30, sec, 0.7);
      windup(a, f, '', sec, 'TIMBER!', 1, () => {
        a.hitPizza(p, f.phase >= 2 ? 2 : 1, 'CHOPPED!', '#e0a868');
        a.shake(250, 0.008);
      });
    },
    onSmacked: (f, a) => {
      hitWindup(f, a, 1);
      return false;
    },
  };
};

const ufotoe = (): Brain => {
  const beam = new Every(6, 2);
  return {
    names: ['TRACTOR BEAM', 'DOUBLE ABDUCTION'],
    info: ['Beams a slice off a pizza after 3 s · smack the beam to break it', 'Beams two pizzas at once · break both beams'],
    update: (f, dt, a) => {
      if (!beam.tick(dt)) return;
      const n = f.phase >= 2 ? 2 : 1;
      for (const p of [...a.alivePizzas()].sort(() => Math.random() - 0.5).slice(0, n)) {
        const b = a.sc.add.image(p.x, p.surfaceY - 30, 'p_beam').setOrigin(0.5, 1).setScale(1, 1.3).setAlpha(0.8);
        a.fxLayer.add(b);
        a.sfx('sfx_zap', { rate: 1.4, volume: 0.6 });
        let live = true;
        // the whole beam is the target, and it wins over the UFO foot hovering right above it
        const box = b.getBounds();
        Phaser.Geom.Rectangle.Inflate(box, 30, 10);
        a.addClickable({ x: p.x, y: box.centerY, r: 110, priority: 2, contains: (x, y) => box.contains(x, y), alive: () => live, hit: () => {
          live = false;
          a.quip(p.x, p.surfaceY - 200, 'BEAM BROKEN!', '#7dff9a', 38);
          b.destroy();
        } });
        a.sc.time.delayedCall(3000, () => {
          if (!live) return;
          live = false;
          b.destroy();
          if (f.alive) a.hitPizza(p, 1, 'ABDUCTED!', '#a0ff8c');
        });
      }
    },
  };
};

const poltergeist = (): Brain => {
  const fling = new Every(4, 2);
  let visibleT = 0;
  return {
    names: ['FLYING PLATES', 'NOW YOU SEE ME'],
    info: ['Flings plates at your peel · smack them out of the air', 'Invisible except right after a throw · hit it the moment a plate flies'],
    update: (f, dt, a) => {
      visibleT -= dt;
      if (f.phase >= 2) {
        const show = visibleT > 0;
        f.shielded = !show;
        f.setVisualAlpha(show ? 0.85 : 0.08);
      }
      if (fling.tick(dt)) {
        visibleT = 1.6;
        throwAtPeel(a, 'p_plate', { x: f.x, y: f.cy }, 1.4, () => a.stunPeel(0.6, 'PLATE TO THE FACE!'), () => a.quip(a.peelPoint().x, a.peelPoint().y - 60, 'SMASH!', '#ffffff', 32), 10);
        a.sfx('sfx_possess', { volume: 0.4, rate: 1.4 });
      }
    },
    onSmacked: (f) => f.shielded,
  };
};

const BRAINS: Record<string, () => Brain> = {
  bigfoot, ironheel, clownking, trex, colossus, phantomking, cosmiccroc, nonna, gargoyle, kraken, rinkqueen, yeti,
  headwaiter, doughboy, sweep, pigeonking, sandcastle, jellyfish, shortorder, milkshake, iceskate, lumberjack, ufotoe, poltergeist,
};

/** Runs every boss and mini-boss on the field: phases, moves and smack/stomp hooks. */
const ENRAGED_INFO = 'Everything it does comes faster · finish it off';

export class BossDirector {
  private brains = new Map<Foot, Brain>();
  private phases = new Map<Foot, number>();

  constructor(private a: Arena) {}

  attach(f: Foot): void {
    const make = BRAINS[f.type.id];
    if (!make) return;
    const b = make();
    this.brains.set(f, b);
    const n = f.type.mini ? Math.max(1, this.a.bossPhases() - 1) : this.a.bossPhases();
    this.phases.set(f, n);
    f.phase = 1;
    f.brain.baseSX = f.root.scaleX;
    f.brain.baseSY = f.root.scaleY;
    this.a.bossMove(f, b.names[0], b.info[0]);
  }

  /** Phase colours: amber, red, violet. Every shoe in the fight wears its phase (decoys too). */
  static auraFor(phase: number): number | null {
    return phase <= 1 ? null : phase === 2 ? 0xffa53d : phase === 3 ? 0xff3d3d : 0xc04dff;
  }

  /** The current move's name and its answer, e.g. for the boss bar. */
  moveOf(f: Foot): { name: string; info: string } | null {
    const b = this.brains.get(f);
    if (!b) return null;
    return { name: b.names[f.phase - 1] || 'ENRAGED', info: b.info[f.phase - 1] || ENRAGED_INFO };
  }

  brainOf(f: Foot): Brain | undefined {
    return this.brains.get(f);
  }

  phaseCount(f: Foot): number {
    return this.phases.get(f) ?? 1;
  }

  update(dt: number): void {
    for (const [f, b] of this.brains) {
      if (!f.alive) {
        b.onDeath?.(f, this.a);
        this.brains.delete(f);
        continue;
      }
      // phase 3 and up: embers rise off the boss
      if (f.phase >= 3 && f.root.visible && Math.random() < dt * 6) this.a.fx.burn(f.x + (Math.random() - 0.5) * 120 * f.scale, f.cy + (Math.random() - 0.5) * 80 * f.scale);
      // the transform beat: the boss holds still, then gets on with its new moves
      const tr = Number(f.brain.transformT ?? 0);
      if (tr > 0) {
        f.brain.transformT = tr - dt;
        if (tr - dt <= 0) {
          f.puppet = false;
          if (!f.brain.wasShielded) f.shielded = false;
        }
        continue;
      }
      if (f.stunT > 0 && !f.puppet) continue;
      b.update?.(f, dt, this.a);
    }
  }

  /** Check phase thresholds after damage. */
  afterDamage(f: Foot, jump = false): void {
    const b = this.brains.get(f);
    if (!b || !f.alive) return;
    const n = this.phaseCount(f);
    const frac = f.hp / f.maxHp;
    const want = Math.min(n, 1 + Math.floor((1 - frac) * n + 1e-6));
    if (f.phase >= want) return;
    // dev starts at a given health go straight to the matching phase, without clamping
    if (jump) {
      while (f.phase < want - 1) {
        f.phase++;
        b.onPhase?.(f, f.phase, this.a);
      }
      f.hp = Math.max(f.hp, 1);
    }
    // one phase at a time: a huge hit can't skip a phase (or kill the boss) before you've seen it
    f.phase++;
    if (f.phase < n) {
      const floor = (1 - f.phase / n) * f.maxHp;
      if (f.hp <= floor) f.hp = Math.floor(floor) + 1;
    } else if (f.hp <= 0) f.hp = Math.max(1, Math.round(f.maxHp * 0.05)); // the final phase still gets its moment
    const name = b.names[f.phase - 1] || 'ENRAGED';
    const info = b.info[f.phase - 1] || ENRAGED_INFO;
    this.a.banner(`PHASE ${f.phase}`, name, 'phase', info);
    this.a.bossMove(f, name, info);
    this.a.sfx('sfx_phase');
    this.a.flash(220, 255, 220, 160);
    this.a.shake(500, 0.012);
    this.a.rumble(0.8, 350);
    this.a.dramatic(0.7);
    f.setPhaseAura(BossDirector.auraFor(f.phase));
    // transform: it rears up, can't be hurt for a moment, and holds still (unless a move is moving it)
    if (!f.puppet) {
      f.brain.wasShielded = f.shielded;
      f.brain.transformT = 1.1;
      f.puppet = true;
      f.shielded = true;
      // restore to the boss's real size, never a mid-wind-up squash
      const sx = Number(f.brain.baseSX ?? f.root.scaleX);
      const sy = Number(f.brain.baseSY ?? f.root.scaleY);
      this.a.sc.tweens.killTweensOf(f.root);
      f.root.setScale(sx, sy);
      this.a.sc.tweens.add({ targets: f.root, scaleX: sx * 1.14, scaleY: sy * 1.14, duration: 260, yoyo: true, repeat: 1, ease: 'Sine.InOut', onComplete: () => f.root.setScale(sx, sy) });
    }
    this.a.fx.ring(f.cx, f.cy, BossDirector.auraFor(f.phase) ?? 0xffffff, 2, 0.6);
    // the 4th phase (Extra Hot, or the second time through) makes everything faster
    if (f.phase >= 4) f.hurry = 1.25;
    b.onPhase?.(f, f.phase, this.a);
  }

  onSmacked(f: Foot, x: number, y: number, dmg: number): boolean {
    if (f.brain.decoy) return false;
    // during the transform beat the boss is simply untouchable: no stone cracks, wall hits or parries count
    if (Number(f.brain.transformT ?? 0) > 0) {
      hitWindup(f, this.a);
      return true;
    }
    return this.brains.get(f)?.onSmacked?.(f, this.a, x, y, dmg) ?? false;
  }

  onStomp(f: Foot, p: Pizza): void {
    this.brains.get(f)?.onStomp?.(f, p, this.a);
  }

  pierces(f: Foot): boolean {
    return this.brains.get(f)?.pierce?.(f) ?? false;
  }

  /** Drop every brain. `tidy` runs their cleanup (pistons, possession); skip it when the scene is shutting down. */
  clear(tidy = true): void {
    if (tidy) for (const [f, b] of this.brains) b.onDeath?.(f, this.a);
    this.brains.clear();
  }
}
