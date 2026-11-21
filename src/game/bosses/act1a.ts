// Boss brains, Stages 1–3: headwaiter, bigfoot, sweep, ironheel, sandcastle, clownking.
// Shared helpers and the heat scaling live in ./kit.ts.

import Phaser from 'phaser';
import { HOVER_Y, W } from '../../config';
import { FOOT_BY_ID } from '../../data/feet';
import type { Arena } from '../arena';
import type { Foot } from '../Foot';
import type { Pizza } from '../Pizza';
import { type Brain, Every, auraFor, hitWindup, mark, rnd, screenSplat, throwAtPeel, windup } from './kit';

/** King Honk and his decoys during a shuffle, relative to his full size. */
const SHUFFLE_SIZE = 0.62;

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
            // a locked valve stops taking smacks (it used to soak up every smack aimed near it)
            alive: () => f.alive && pistons.includes(s) && s.lockT <= 0,
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
          // rockets only reach pizzas a piston has raised: locked valves really do protect them
          const targets = pistons.filter((s) => s.lift > 0 && !s.p.dead).map((s) => s.p).slice(0, 2);
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


export const brains: Record<string, () => Brain> = { headwaiter, bigfoot, sweep, ironheel, sandcastle, clownking };
