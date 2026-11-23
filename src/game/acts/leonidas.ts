// King Leonidas's moves and passives (the peels are in src/content/peels/leonidas.ts).
// - Hold the Line: a wall of bronze lambda shields slams down across the table for 10 s and blocks every stomp (the
//   foot is shoved back up). Passive, The Spear: every 6 s a spear (the projectile system's pierce) flies at the front
//   foot of the busiest lane and on through everything behind it (×3).
// - Leonidas, Hot Gates: the wall holds 14 s, shoves forward as it lands (×2 and knockback to every foot) and every
//   stomp it blocks costs the foot ×2; two spears every 4 s, at the two busiest lanes.

import Phaser from 'phaser';
import { TABLE_Y, W } from '../../config';
import { audio } from '../../systems/audio';
import { crand } from '../../systems/cosmeticRandom';
import type { ThrowFx } from '../abilities';
import type { ActFx } from '../contentFx';
import type { Foot } from '../Foot';
import { registerMoves, registerPassives, type HeroKit, type Passive } from '../heroKit';

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

/** The wall standing now (per hero kit): a second call while it stands renews it rather than raising another. */
const walls = new WeakMap<HeroKit, { renew: (sec: number, shove: boolean) => void }>();

/** The shield wall: a row of lambda shields that slams down just over the pizzas, then drops away. Raised again
 *  while it stands, it holds for the new full time (it used to raise a second wall, and the first one's end let
 *  feet through while the second still stood). */
/** The wall renewed while it stands: the bronze is re-forged in place. A wave of heat runs along the line from the
 *  middle out, each shield flaring white-gold and cooling back through orange, with sparks spraying off its rim
 *  and falling as embers. */
function reforge(k: HeroKit, shields: Phaser.GameObjects.Image[]): void {
  k.shout('HOLD FAST!', BRONZE, 92);
  audio.sfx('sfx_hero_holdline', { volume: 0.7, rate: 1.15 });
  const mid = W / 2;
  for (const s of shields) {
    const delay = Math.abs(s.x - mid) * 0.45;
    k.sc.time.delayedCall(delay, () => {
      if (!s.active) return;
      // the heat: a hot glow behind it and a white-hot tint that cools
      const glow = k.img('glow', s.x, s.y - 8, 1.1).setTint(0xffa040).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      k.sc.tweens.add({ targets: glow, alpha: { from: 0.95, to: 0 }, scale: { from: 0.7, to: 1.5 }, duration: 1300, ease: 'Quad.Out', onComplete: () => glow.destroy() });
      const heat = { k: 0 };
      k.sc.tweens.add({
        targets: heat,
        k: 1,
        duration: 1400,
        ease: 'Quad.In',
        onUpdate: () => {
          if (!s.active) return;
          // white-gold → orange → back to its own bronze
          const c = Phaser.Display.Color.Interpolate.ColorWithColor(
            Phaser.Display.Color.ValueToColor(heat.k < 0.4 ? 0xfff2c0 : 0xffa050),
            Phaser.Display.Color.ValueToColor(heat.k < 0.4 ? 0xffa050 : 0xffffff),
            100,
            heat.k < 0.4 ? (heat.k / 0.4) * 100 : ((heat.k - 0.4) / 0.6) * 100,
          );
          s.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
        },
        onComplete: () => s.active && s.clearTint(),
      });
      k.sc.tweens.add({ targets: s, scale: { from: s.scale * 1.12, to: s.scale }, duration: 320, ease: 'Back.Out' });
      // sparks off the rim: they leap up, arc and fall as dimming embers
      const top = s.y - s.displayHeight * 0.42;
      for (let i = 0; i < 7; i++) {
        const sp = k.img('soft', s.x + (crand() - 0.5) * s.displayWidth * 0.7, top, 0.05 + crand() * 0.05).setTint(crand() < 0.5 ? 0xffe08a : 0xff8a3a).setBlendMode(Phaser.BlendModes.ADD);
        const vx = (crand() - 0.5) * 260;
        const up = 120 + crand() * 160;
        const dur = 700 + crand() * 500;
        k.sc.tweens.add({ targets: sp, x: sp.x + vx, duration: dur, ease: 'Linear' });
        k.sc.tweens.add({ targets: sp, y: sp.y - up, duration: dur * 0.4, ease: 'Quad.Out', yoyo: false, onComplete: () => k.sc.tweens.add({ targets: sp, y: sp.y + up * 1.6, alpha: 0, duration: dur * 0.6, ease: 'Quad.In', onComplete: () => sp.destroy() }) });
      }
    });
  }
}

function shieldWall(k: HeroKit, sec: number, shove: boolean): void {
  const slam = () => {
    k.host.shake(260, 0.01);
    k.host.rumble(0.8, 260);
    if (!shove || !k.host.inWave()) return;
    for (const f of k.host.live()) k.host.hurt(f, 2, { knock: 600 });
  };
  const cur = walls.get(k);
  if (cur) {
    cur.renew(sec, shove);
    k.sc.time.delayedCall(120, slam);
    return;
  }
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
  k.sc.time.delayedCall(380, slam);
  let total = sec;
  let t = 0;
  let done = false;
  k.wv.lineUntil = k.host.now() + sec;
  k.wv.lineShove = shove;
  const finish = () => {
    if (done) return;
    done = true;
    walls.delete(k);
    k.wv.lineUntil = 0;
    shields.forEach((s, i) => k.sc.tweens.add({ targets: s, y: s.y + 300, alpha: 0, delay: i * 20, duration: 300, ease: 'Quad.In', onComplete: () => s.destroy() }));
  };
  walls.set(k, {
    renew: (more, sh) => {
      total = t + more;
      k.wv.lineUntil = k.host.now() + more;
      k.wv.lineShove = !!k.wv.lineShove || sh;
      shields.forEach((s) => s.setAngle(0));
      reforge(k, shields);
    },
  });
  k.effect({
    update: (dt) => {
      if (done) return false;
      t += dt;
      // the wall rides up and down with the pizzas under it (a lifted pizza takes its shield with it)
      if (landed) shields.forEach((s, i) => (s.y += (wallY(k, s.x) + (i % 2) * 10 - s.y) * Math.min(1, dt * 8)));
      // the last second, the shields shudder before they drop
      if (total - t < 1) shields.forEach((s, i) => s.setAngle(Math.sin(t * 40 + i) * 3));
      if (t >= total) {
        finish();
        return false;
      }
      return true;
    },
    stop: finish,
  });
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
