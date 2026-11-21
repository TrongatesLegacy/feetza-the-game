// Boss brains, Stages 7–9: doughboy, nonna, pigeonking, gargoyle, jellyfish, kraken.
// Shared helpers and the heat scaling live in ./kit.ts.

import type { Arena } from '../arena';
import type { Foot } from '../Foot';
import { type Brain, Every, dropOn, hitWindup, laneOf, mark, rnd, screenSplat, throwAtPeel, windup } from './kit';

const doughboy = (): Brain => {
  let since = 0;
  let puffT = 0;
  const balls = new Every(5, 2.5);
  return {
    names: ['DOUGH BALLS', 'RISING'],
    info: ['Lobs dough balls onto the pizza below it · smack them as they fall', 'Rises back to health if you leave it alone · keep hitting it'],
    update: (f, dt, a) => {
      since += dt;
      if (f.phase === 1 && balls.tick(dt)) {
        const p = laneOf(a, f);
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

const pigeonking = (): Brain => {
  const flock = new Every(6, 1);
  const bomb = new Every(5, 2.5);
  return {
    names: ['BIRD BOMB', 'FLOCK CALL'],
    info: ['Drops bombs on the pizza below it · smack them as they fall', 'Calls three pigeons at a time · clear the flock fast'],
    update: (f, dt, a) => {
      if (f.phase === 1 && bomb.tick(dt)) {
        const p = laneOf(a, f);
        if (p) dropOn(a, f, p, 'p_cream', 1.5, 'SPLAT!', { scale: 0.3, color: '#ffffff' });
      }
      if (f.phase >= 2 && flock.tick(dt)) {
        for (let i = 0; i < 3; i++) a.spawn('pigeon', rnd(a.alivePizzas()) ?? null, f.x + (i - 1) * 110);
        a.quip(f.x, f.cy - 150, 'COO COO!', '#c7ccd4', 44);
      }
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

const kraken = (): Brain => {
  const grab = new Every(8, 2);
  const ink = new Every(8, 4);
  const splash = new Every(5.5, 3);
  return {
    names: ['SPLASH', 'TENTACLE GRAB', 'INK CLOUD'],
    info: ['Hurls water at the pizza below it · smack the splash before it lands', 'Grabs a pizza to drag it under · smack the tentacle 3 times to free it', 'Squirts ink across the screen · smack the ink twice to clear it'],
    update: (f, dt, a) => {
      if (f.phase === 1 && splash.tick(dt)) {
        const p = laneOf(a, f);
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


export const brains: Record<string, () => Brain> = { doughboy, nonna, pigeonking, gargoyle, jellyfish, kraken };
