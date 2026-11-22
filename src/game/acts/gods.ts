// What the Kratos Peel's two feet do (data in src/content/feet/gods.ts), through the contentFx foot hooks.
//
// - Persian Elephant Feet: when it stomps, its trunk swings down onto the pizza next to its own (the side it
//   leans to). After every smack it raises gold-edged armour for 0.7 s: nothing hurts it until it drops.
// - Spartan Sandals: march in pairs. A round bronze shield (the guard trait, on its own quicker rhythm: up for 1 s,
//   down for 1.2 s; FootType.guard) blocks smacks while it's up, and cracks under them; enough of them shatter it
//   until a new one comes (src/game/guardShield.ts). A hit while it's down slams it straight back up for 2 s.
//   Stunned, it drops its guard. At a quarter of its health it enrages: a red flash and a roar, 60% faster, it
//   stomps 40% sooner, and it hurls its shield at your peel (smack it away, or it stuns the peel); it's done with
//   shields after that.

import Phaser from 'phaser';
import type { Arena } from '../arena';
import type { FootFx } from '../contentFx';
import type { Foot } from '../Foot';
import { heat, throwAtPeel } from '../bosses/kit';
import { takeCentre } from './persians';

/** Seconds its armour stays up after a smack (0.7, was 1: with elephants common in Act 9 they outlasted the waves). */
const ELEPHANT_GUARD = 0.7;

const plates = new WeakMap<Foot, Phaser.GameObjects.Graphics>();

/** The foot's own pizza's neighbour on the side its trunk swings to. */
function trunkTarget(a: Arena, f: Foot) {
  const row = a.alivePizzas().sort((p, q) => p.x - q.x);
  const i = f.target ? row.indexOf(f.target) : -1;
  if (i < 0) return null;
  const left = row[i - 1];
  const right = row[i + 1];
  if (left && right) return f.brain.trunkSide ? right : left;
  return left ?? right ?? null;
}

function elephantTick(a: Arena, f: Foot, dt: number): void {
  // the tell: the trunk curls up and it trumpets as it starts its dive
  if (f.state === 'descend' && !f.brain.trumpeted) {
    f.brain.trumpeted = 1;
    f.brain.trunkSide = Math.random() < 0.5 ? 1 : 0;
    a.sfx('sfx_trumpet', { volume: 0.55, throttle: 400 });
  }
  if (f.state === 'hover') f.brain.trumpeted = 0;
  // the trunk swings onto the pizza next door as the foot lands
  if (f.state === 'stomp' && !f.brain.trunked) {
    f.brain.trunked = 1;
    const q = trunkTarget(a, f);
    if (q && !f.stunT) {
      a.fx.puff(q.x, q.surfaceY, 10);
      a.shake(160, 0.006);
      a.hitPizza(q, 1, 'TRUNK SLAM!', '#d8d0c8');
    }
  }
  if (f.state !== 'stomp') f.brain.trunked = 0;
  // shields up for a second after every smack (any damage that got through)
  const hp = Number(f.brain.lastHp ?? f.hp);
  if (Number(f.brain.guardCd ?? 0) > 0) f.brain.guardCd = Number(f.brain.guardCd) - dt;
  // (after a guard drops it stays open a moment: the gap to land the next smack in)
  if (f.hp < hp - 0.01 && !f.shielded && f.alive && !(Number(f.brain.guardCd ?? 0) > 0)) {
    f.shielded = true;
    f.brain.guardT = ELEPHANT_GUARD;
    a.sfx('sfx_bronzeshield', { volume: 0.5, throttle: 200 });
  }
  f.brain.lastHp = f.hp;
  let g = plates.get(f);
  if (Number(f.brain.guardT ?? 0) > 0) {
    f.brain.guardT = Number(f.brain.guardT) - dt;
    if (!g) {
      g = a.sc.add.graphics();
      f.root.add(g);
      plates.set(f, g);
    }
    // gold-edged plates ring the foot while its guard is up
    const s = f.root.scaleX || 1;
    const h = f.meta.footHeight * f.type.scale;
    const left = Number(f.brain.guardT);
    g.clear();
    g.setAlpha(left < 0.25 ? left / 0.25 : 1);
    g.lineStyle(10 / s, 0xe8b43a, 0.9);
    g.strokeEllipse(0, -h * 0.45, f.meta.legWidth * f.type.scale * 1.25, h * 0.8);
    g.lineStyle(4 / s, 0xfff2c0, 0.9);
    g.strokeEllipse(0, -h * 0.45, f.meta.legWidth * f.type.scale * 1.25, h * 0.8);
    if (left <= 0) {
      f.shielded = false;
      f.brain.guardCd = 0.8;
      g.clear();
    }
  }
}

function spartanSpawn(a: Arena, f: Foot): void {
  // they march in pairs: the first of a pair brings its partner
  if (f.brain.pair) return;
  f.brain.pair = 1;
  const mate = a.spawn('spartan');
  if (mate) mate.brain.pair = 2;
}

/** Seconds the raging Spartan rears back before it throws its shield. */
const THROW_WINDUP = 0.35;

/** The raging Spartan hurls its shield at the peel: smack it in flight to deflect it, or it stuns the peel. Either
 * way the shield is gone for good. Flight 1.2 s on Mild, 0.9 on Regular and Hot, 0.8 from Extra Hot; the stun 0.6,
 * 1 and 1.3 s. */
function throwShield(a: Arena, f: Foot): void {
  const from = f.guardFx?.throwOff();
  if (!from) {
    // (nothing left to throw: broken in the wind-up, or no shield piece)
    f.guardFx?.rage();
    return;
  }
  const r = heat(a).rank;
  const flight = r <= 0 ? 1.2 : r >= 3 ? 0.8 : 0.9;
  const stun = r <= 0 ? 0.6 : r >= 3 ? 1.3 : 1;
  a.sfx('sfx_whoosh', { volume: 0.9, rate: 0.75 });
  // (a throw that misses a peel that's moved lands nowhere: the badge settles on RAGE either way)
  a.sc.time.delayedCall((flight + 0.1) * 1000, () => f.guardFx?.rage());
  throwAtPeel(
    a,
    from.key,
    from,
    flight,
    () => {
      f.guardFx?.rage();
      a.sfx('sfx_shield', { volume: 1, rate: 0.7 });
      a.sfx('sfx_bronzeshield', { volume: 0.7, rate: 0.8 });
      a.shake(160, 0.006);
      a.stunPeel(stun, 'SHIELD BASH!');
    },
    () => {
      f.guardFx?.rage();
      a.sfx('sfx_bronzeshield', { volume: 0.9, rate: 1.15 });
      const p = a.peelPoint();
      a.quip(p.x, p.y - 120, 'DEFLECTED!', '#ffd23f', 40);
    },
    9,
    { scale: from.scale },
  );
}

function spartanTick(a: Arena, f: Foot, dt: number): void {
  // (its shield is the guard trait's, with its own rhythm: FootType.guard, the piece in src/game/guardShield.ts)
  // rearing back with the shield, then the throw
  if (Number(f.brain.throwT ?? 0) > 0) {
    f.brain.throwT = Number(f.brain.throwT) - dt;
    // it holds the shield up as it rears back (its beat stops)
    f.guardOpen = 0;
    f.guardT = 0;
    f.guardWarned = false;
    if (Number(f.brain.throwT) <= 0) {
      if (f.alive) throwShield(a, f);
      f.guardDone = true;
    }
  }
  // the rage at a quarter health: it roars and throws its shield aside, at your peel (done with shields for good)
  if (!f.brain.raged && f.alive && f.hp > 0 && f.hp <= f.maxHp * 0.25) {
    f.brain.raged = 1;
    if (f.guardBroken || f.guardDone || !f.guardFx) {
      // nothing to throw: no new shield either
      f.guardDone = true;
      f.guardFx?.rage();
    } else {
      f.guardFx.windup();
      f.brain.throwT = THROW_WINDUP;
    }
    f.speedMul *= 1.6;
    f.hoverMul *= 0.6;
    f.flash(0xff2a1a, 260);
    a.sc.time.delayedCall(280, () => f.alive && f.tint(0xff7a6a));
    a.quip(f.x, f.cy - 150, 'RAAAGH!', '#ff4d3d', 46);
    a.sfx('sfx_spartanroar', { volume: 0.8, throttle: 300 });
    a.fx.puff(f.cx, f.cy - 60, 8);
    a.shake(140, 0.005);
  }
  if (f.brain.raged && Math.random() < dt * 6) a.fx.burn(f.cx + (Math.random() - 0.5) * 60, f.cy - 40);
}

export const footFx: Record<string, FootFx> = {
  // (in a war band it takes the middle of the line)
  elephant: { spawn: takeCentre, tick: elephantTick },
  spartan: { spawn: spartanSpawn, tick: spartanTick },
};
