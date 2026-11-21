// Boss brains, Stages 4–6: shortorder, trex, iceskate, colossus, ufotoe, cosmiccroc.
// Shared helpers and the heat scaling live in ./kit.ts.

import Phaser from 'phaser';
import { type Brain, Every, dropOn, hitWindup, laneOf, mark, rnd, windup } from './kit';

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

const iceskate = (): Brain => ({
  names: ['ICE TRAILS', 'TRIPLE AXEL'],
  info: ['Feet near it skate in faster · take it out first', 'Spins into bursts of speed · hit it between bursts'],
  update: (f, dt, a) => {
    for (const o of a.allFeet()) if (o !== f && o.alive && Math.abs(o.x - f.x) < 220) o.hurry = Math.max(o.hurry, 1.3);
    if (f.phase >= 2) f.hurry = 1 + Math.abs(Math.sin(a.now() * 1.3)) * 0.8;
    void dt;
  },
});

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

const cosmiccroc = (): Brain => {
  const flip = new Every(8, 3);
  const hole = new Every(11, 5);
  const meteor = new Every(5.5, 3);
  return {
    names: ['METEOR', 'GRAVITY FLIP', 'BLACK HOLE'],
    info: ['Calls meteors onto the pizza below it · smack the meteor before it lands', 'A pizza glows purple, then it stomps up through the table · watch for the glow and hit it as it surfaces', 'Opens a black hole that pulls every foot to one pizza · smack the black hole 3 times to close it'],
    update: (f, dt, a) => {
      if (f.phase === 1 && meteor.tick(dt)) {
        const p = laneOf(a, f);
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


export const brains: Record<string, () => Brain> = { shortorder, trex, iceskate, colossus, ufotoe, cosmiccroc };
