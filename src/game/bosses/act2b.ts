// Boss brains, Stages 10–12: milkshake, rinkqueen, lumberjack, yeti, poltergeist, phantomking.
// Shared helpers and the heat scaling live in ./kit.ts.

import Phaser from 'phaser';
import { FOOT_BY_ID } from '../../data/feet';
import { type Brain, Every, dropOn, hitWindup, laneOf, mark, rnd, throwAtPeel, windup } from './kit';

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

const yeti = (): Brain => {
  const ball = new Every(4, 2);
  const slide = new Every(10, 5);
  const icicle = new Every(5.5, 3);
  let avalanche = 0;
  return {
    names: ['ICICLES', 'SNOWBALLS', 'AVALANCHE'],
    info: ['Drops icicles on the pizza below it · smack them as they fall', 'Throws snowballs at your peel · smack them out of the air', 'Rumbles, then an avalanche speeds up every foot · Peel Slam to stop it'],
    update: (f, dt, a) => {
      if (f.phase === 1 && icicle.tick(dt)) {
        const p = laneOf(a, f);
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


export const brains: Record<string, () => Brain> = { milkshake, rinkqueen, lumberjack, yeti, poltergeist, phantomking };
