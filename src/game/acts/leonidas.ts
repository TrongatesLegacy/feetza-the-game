// King Leonidas's moves and passives (the peels are in src/content/peels/leonidas.ts).
// - Hold the Line: a wall of bronze lambda shields slams down across the table for 10 s and blocks every stomp (the
//   foot is shoved back up). Passive, The Spear: every 6 s a spear (the projectile system's pierce) flies at the front
//   foot of the busiest lane and on through everything behind it (×3).
// - Leonidas, Hot Gates: the wall holds 14 s, shoves forward as it lands (×2 and knockback to every foot) and every
//   stomp it blocks costs the foot ×2; two spears every 4 s, at the two busiest lanes.

import Phaser from 'phaser';
import { TABLE_Y, W } from '../../config';
import { audio } from '../../systems/audio';
import type { ThrowFx } from '../abilities';
import type { ActFx } from '../contentFx';
import type { Foot } from '../Foot';
import { registerMoves, registerPassives, type HeroKit, type Passive } from '../heroKit';
import { timed } from './variants';

const BRONZE = 0xc9873a;
const SPEAR: ThrowFx = { e: 'throw', prop: 'spear', how: 'pierce', x: 3, at: { to: 'front', n: 1 } };

/** The live feet grouped by the pizza lane they're over, busiest first; the front foot of each lane. */
function busiestLanes(k: HeroKit, n: number): Foot[] {
  const ps = k.host.pizzas().filter((p) => !p.dead);
  if (!ps.length) return k.front(n);
  const lanes = new Map<number, Foot[]>();
  for (const f of k.host.live()) {
    const i = ps.reduce((b, p, j) => (Math.abs(p.x - f.x) < Math.abs(ps[b].x - f.x) ? j : b), 0);
    lanes.set(i, [...(lanes.get(i) ?? []), f]);
  }
  return [...lanes.values()]
    .sort((a, b) => b.length - a.length)
    .slice(0, n)
    .map((l) => l.sort((a, b) => b.y - a.y)[0]);
}

function throwSpears(k: HeroKit, n: number): void {
  const pick = busiestLanes(k, n);
  if (!pick.length) return;
  audio.sfx('sfx_hero_spear', { volume: 0.8, throttle: 80 });
  pick.forEach((f, i) => k.sc.time.delayedCall(i * 140, () => f.alive && k.host.inWave() && k.host.throwAt(SPEAR, [f], BRONZE)));
}

/** Where a shield of the wall stands at x: just above the pizza under it (following it up when a pizza is lifted),
 *  or just above the table between pizzas. */
function wallY(k: HeroKit, x: number): number {
  let y = TABLE_Y - 70;
  for (const p of k.host.pizzas()) if (!p.dead && Math.abs(p.x - x) < p.radius * 1.15) y = Math.min(y, p.surfaceY - 15);
  return y - 42;
}

/** The shield wall: a row of lambda shields that slams down just over the pizzas, then drops away. */
function shieldWall(k: HeroKit, sec: number, shove: boolean): void {
  const shields: Phaser.GameObjects.Image[] = [];
  let landed = false;
  for (let x = 90, i = 0; x < W; x += 130, i++) {
    const y = wallY(k, x) + (i % 2) * 10;
    const s = k.img('p_lx_shield', x, y + 260, 0.62);
    s.setAlpha(0);
    k.sc.tweens.add({ targets: s, y, alpha: 1, duration: 220, delay: i * 30, ease: 'Back.Out' });
    shields.push(s);
  }
  k.sc.time.delayedCall(220 + shields.length * 30, () => (landed = true));
  k.sc.time.delayedCall(380, () => {
    k.host.shake(260, 0.01);
    k.host.rumble(0.8, 260);
    if (!shove || !k.host.inWave()) return;
    for (const f of k.host.live()) k.host.hurt(f, 2, { knock: 600 });
  });
  k.wv.lineUntil = k.host.now() + sec;
  k.wv.lineShove = shove;
  timed(
    k,
    sec,
    (_dt, t) => {
      // the wall rides up and down with the pizzas under it (a lifted pizza takes its shield with it)
      if (landed) shields.forEach((s, i) => (s.y += (wallY(k, s.x) + (i % 2) * 10 - s.y) * Math.min(1, _dt * 8)));
      // the last second, the shields shudder before they drop
      if (sec - t < 1) shields.forEach((s, i) => s.setAngle(Math.sin(t * 40 + i) * 3));
    },
    () => {
      k.wv.lineUntil = 0;
      shields.forEach((s, i) => k.sc.tweens.add({ targets: s, y: s.y + 300, alpha: 0, delay: i * 20, duration: 300, ease: 'Quad.In', onComplete: () => s.destroy() }));
    },
  );
}

registerMoves({
  holdTheLine: (k) => {
    audio.sfx('sfx_hero_holdline', { volume: 1 });
    k.shout('HOLD THE LINE!', BRONZE, 110);
    shieldWall(k, 10, false);
  },
  holdHotGates: (k) => {
    audio.sfx('sfx_hero_hotgates', { volume: 1 });
    audio.sfx('sfx_hero_holdline', { volume: 0.8 });
    k.shout('THIS IS WHERE WE HOLD!', 0xff6a2a, 96);
    k.flashC(0xff6a2a, 220);
    shieldWall(k, 14, true);
  },
});

/** A foot meets the shield wall: HELD!, thrown back up (Hot Gates also hurts it). */
function block(k: HeroKit, f: Foot): void {
  audio.sfx('sfx_hero_shieldblock', { volume: 0.8, throttle: 80 });
  k.host.quip(f.x, f.cy - 120, 'HELD!', '#ffd890', 38);
  k.host.fx.ring(f.x, wallY(k, f.x), BRONZE, 0.8, 0.6);
  const hurt = Number(k.st.blockX ?? 0);
  if (hurt > 0) k.host.hurt(f, hurt, { quiet: true });
  if (f.alive) {
    f.setState('lift');
    f.knock(700);
  }
}

/** Both kings' passive: the spear, and the wall's block. */
function king(every: number, spears: number, blockX: number): Passive {
  return {
    tick: (k, dt) => {
      k.st.blockX = blockX;
      // the wall holds: a foot coming down meets the shields and is thrown back, it never gets through to the pizza
      if (Number(k.wv.lineUntil ?? 0) > k.host.now())
        for (const f of k.host.live()) if ((f.state === 'descend' || f.state === 'stomp') && f.y >= wallY(k, f.x) - 20) block(k, f);
      k.st.spearT = Number(k.st.spearT ?? 0) + dt;
      if (Number(k.st.spearT) < every || !k.host.inWave()) return;
      k.st.spearT = 0;
      throwSpears(k, spears);
    },
    stomp: (k, f) => {
      if (Number(k.wv.lineUntil ?? 0) <= k.host.now()) return false;
      block(k, f);
      return true;
    },
  };
}

registerPassives({
  'hero:leonidas': king(6, 1, 0),
  'hero:hotgates': king(4, 2, 2),
});

export const actFx: Record<number, ActFx> = {};
