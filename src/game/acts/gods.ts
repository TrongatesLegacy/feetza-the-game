// What the Kratos Peel's two feet do (data in src/content/feet/gods.ts), through the contentFx foot hooks.
//
// - Persian Elephant Feet: when it stomps, its trunk swings down onto the pizza next to its own (the side it
//   leans to). After every smack it raises gold-edged armour for 0.7 s: nothing hurts it until it drops.
// - Spartan Sandals: march in pairs. A round bronze shield (the guard trait) is raised for 1 s, then lowered for
//   1.2 s, over and over; smacks bounce off it while it's up. At a quarter of its health it enrages: a red
//   flash and a roar, 60% faster, and it stomps 40% sooner.

import Phaser from 'phaser';
import type { Arena } from '../arena';
import type { FootFx } from '../contentFx';
import type { Foot } from '../Foot';

const SHIELD_UP = 1;
const SHIELD_DOWN = 1.2;
/** Seconds its armour stays up after a smack (0.7, was 1: with elephants common in Act 9 they outlasted the waves). */
const ELEPHANT_GUARD = 0.7;

const shields = new WeakMap<Foot, Phaser.GameObjects.Image>();
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

function spartanTick(a: Arena, f: Foot, dt: number): void {
  // the shield's rhythm: up for 1 s, down for 1.2 s (its own timer replaces the guard trait's)
  const t = (f.brain.shT = Number(f.brain.shT ?? Math.random() * 2) + dt);
  const up = t % (SHIELD_UP + SHIELD_DOWN) < SHIELD_UP && (f.state === 'hover' || f.state === 'descend') && !f.stunT;
  if (up) {
    // hold the guard trait's own timer at the start, so it never opens the shield by itself
    (f as unknown as { guardT: number }).guardT = 0;
    if (f.guardOpen > 0.06) f.guardOpen = 0;
  } else f.guardOpen = Math.max(f.guardOpen, 0.06);
  if (up && !f.brain.shUp) a.sfx('sfx_bronzeshield', { volume: 0.35, throttle: 300 });
  f.brain.shUp = up ? 1 : 0;
  // the bronze shield prop: raised in front of the foot, or lowered to its side
  let img = shields.get(f);
  if (!img) {
    img = a.sc.add.image(0, 0, a.sc.textures.exists('g_aspis') ? 'g_aspis' : 'soft');
    f.root.add(img);
    shields.set(f, img);
  }
  const h = f.meta.footHeight * f.type.scale;
  const size = h * 0.78;
  img.setDisplaySize(size, size);
  const k = up ? 1 : 0;
  const cur = Number(f.brain.shK ?? k);
  const nk = cur + (k - cur) * Math.min(1, dt * 14);
  f.brain.shK = nk;
  img.setPosition(-size * 0.1 * (1 - nk) - f.meta.legWidth * f.type.scale * 0.55 * (1 - nk), -h * (0.42 - 0.08 * (1 - nk)));
  img.setAngle(-24 * (1 - nk)).setAlpha(0.55 + 0.45 * nk);
  if (up && Math.random() < dt * 2) a.fx.glint(f.cx - 20, f.cy - 30);
  // the rage at a quarter health
  if (!f.brain.raged && f.alive && f.hp > 0 && f.hp <= f.maxHp * 0.25) {
    f.brain.raged = 1;
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
  elephant: { tick: elephantTick },
  spartan: { spawn: spartanSpawn, tick: spartanTick },
};
