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
import { laneObscured } from '../laneShade';

const BRONZE = 0xc9873a;
/** How far a shield fades in an obscured lane (to 18%). */
const SHADED = 0.82;
const SPEAR: ThrowFx = { e: 'throw', prop: 'spear', how: 'pierce', x: 3, at: { to: 'front', n: 1 } };

/** The phalanx's war chant (OOOOH... OOH! OOH!, spears on shields), on every raise and renewal of the wall. It runs
 *  about 2.1 s, so the throttle keeps a spammed raise or renewal from stacking copies; Hot Gates sings it a touch
 *  deeper. */
function chant(volume: number, rate = 1): void {
  audio.sfx('sfx_hero_spartanchant', { volume, rate, jitter: 0.02, throttle: 1600 });
}

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
/** The wall renewed while it stands: re-forged in place. The whole line comes up glowing with forge heat (a red-hot
 *  glow behind every shield and a hot tint), then a ripple runs out from the middle slamming each shield back down
 *  into the line: it lifts, drops hard, and the impact shakes sparks off its glowing rim. The heat then cools off
 *  over a few seconds. */
function reforge(k: HeroKit, shields: Phaser.GameObjects.Image[]): void {
  k.shout('HOLD FAST!', BRONZE, 92);
  chant(0.85, k.wv.lineShove ? 0.95 : 1);
  const mid = W / 2;
  const HEAT_MS = 3200;
  for (const s of shields) {
    if (!s.active) continue;
    // the forge heat, all at once: each shield glows in its own shape (an additive copy of the shield, red-hot, a
    // touch larger so it rims the bronze) and takes a hot tint that cools from white-gold through orange
    const glow = k.img(s.texture.key, s.x, s.y, s.scale * 1.08).setTint(0xff6a18).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    k.sc.tweens.add({ targets: glow, alpha: 0.85, duration: 160 });
    k.sc.tweens.add({ targets: glow, alpha: 0, delay: 900, duration: HEAT_MS - 900, ease: 'Quad.In', onComplete: () => glow.destroy() });
    const follow = k.sc.time.addEvent({ delay: 16, loop: true, callback: () => (s.active ? glow.setPosition(s.x, s.y).setScale(s.scaleX * 1.08, s.scaleY * 1.08).setVisible(laneObscured(k.sc, s.x) < 0.5) : follow.remove()) });
    k.sc.time.delayedCall(HEAT_MS, () => follow.remove());
    const heat = { k: 0 };
    k.sc.tweens.add({
      targets: heat,
      k: 1,
      duration: HEAT_MS,
      ease: 'Sine.In',
      onUpdate: () => {
        if (!s.active) return;
        const from = Phaser.Display.Color.ValueToColor(heat.k < 0.35 ? 0xfff0b0 : 0xff9a50);
        const to = Phaser.Display.Color.ValueToColor(heat.k < 0.35 ? 0xff9a50 : 0xffffff);
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, heat.k < 0.35 ? (heat.k / 0.35) * 100 : ((heat.k - 0.35) / 0.65) * 100);
        s.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
      },
      onComplete: () => s.active && s.clearTint(),
    });
    // the ripple: from the middle out, each shield lifts and slams back down into the line
    const delay = 250 + Math.abs(s.x - mid) * 0.55;
    k.sc.time.delayedCall(delay, () => {
      if (!s.active) return;
      const y0 = s.y;
      s.setData('slam', 1);
      k.sc.tweens.add({
        targets: s,
        y: y0 - 34,
        duration: 140,
        ease: 'Quad.Out',
        onComplete: () =>
          k.sc.tweens.add({
            targets: s,
            y: y0,
            duration: 110,
            ease: 'Quad.In',
            onComplete: () => {
              if (!s.active) return;
              s.setData('slam', 0);
              // the slam: a squash, a thud, and sparks shaken off the hot rim, arcing up and falling as embers
              k.sc.tweens.add({ targets: s, scaleY: { from: s.scaleX * 0.86, to: s.scaleX }, duration: 200, ease: 'Back.Out' });
              k.host.fx.ring(s.x, s.y + s.displayHeight * 0.4, 0xffa040, 0.45, 0.35);
              audio.sfx('sfx_hero_shieldblock', { volume: 0.35, rate: 1.2, throttle: 40 });
              const rim = s.y - s.displayHeight * 0.45;
              // a hot flash in the shield's shape on impact
              const flash = k.img(s.texture.key, s.x, s.y, s.scaleX * 1.04).setTint(0xfff0c0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.9 * (1 - SHADED * laneObscured(k.sc, s.x)));
              k.sc.tweens.add({ targets: flash, alpha: 0, duration: 260, onComplete: () => flash.destroy() });
              for (let i = 0; i < 16; i++) {
                const ang = (crand() - 0.5) * 2.2;
                const sx = s.x + Math.sin(ang) * s.displayWidth * 0.48;
                const sp = k.img('soft', sx, rim + (1 - Math.cos(ang)) * s.displayHeight * 0.3, 0.07 + crand() * 0.07)
                  .setTint(crand() < 0.5 ? 0xffe8a0 : 0xff8a30)
                  .setBlendMode(Phaser.BlendModes.ADD);
                const vx = Math.sin(ang) * (120 + crand() * 200);
                const up = 90 + crand() * 170;
                const dur = 650 + crand() * 550;
                k.sc.tweens.add({ targets: sp, x: sp.x + vx, duration: dur });
                k.sc.tweens.add({
                  targets: sp,
                  y: sp.y - up,
                  duration: dur * 0.35,
                  ease: 'Quad.Out',
                  onComplete: () => k.sc.tweens.add({ targets: sp, y: sp.y + up * 1.8, alpha: 0, scale: sp.scale * 0.5, duration: dur * 0.65, ease: 'Quad.In', onComplete: () => sp.destroy() }),
                });
              }
            },
          }),
      });
    });
  }
  k.sc.time.delayedCall(250 + (W / 2) * 0.55 + 260, () => k.host.shake(220, 0.006));
}

function shieldWall(k: HeroKit, sec: number, shove: boolean): void {
  const slam = () => {
    audio.sfx('sfx_hero_shieldblock', { volume: 0.55, rate: 0.9, throttle: 300 }); // the wall lands under the chant's swell
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
  // (Hot Gates opens with the king's THIS IS SPARTA!: the phalanx answers it a beat later)
  if (shove) k.sc.time.delayedCall(1500, () => chant(1, 0.95));
  else chant(1);
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
      if (landed) shields.forEach((s, i) => !s.getData('slam') && (s.y += (wallY(k, s.x) + (i % 2) * 10 - s.y) * Math.min(1, dt * 8)));
      // a shield in a lane a boss's colossal prop has taken (Kronos's Titan head) steps back to a ghost of itself, so
      // what's behind it stays clear to see and hit, and comes back when the lane is clear (src/game/laneShade.ts)
      if (landed) shields.forEach((s) => s.setAlpha(1 - SHADED * laneObscured(k.sc, s.x)));
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
    k.shout('HOLD THE LINE!', BRONZE, 110);
    shieldWall(k, 10, false);
  },
  holdHotGates: (k) => {
    // the king's own line (it was the Kratos Peel's by mistake: Kratos roars his Spartan Rage now)
    k.shout('THIS IS SPARTA!', 0xff6a2a, 104);
    audio.sfx('sfx_hero_spartaaa', { volume: 0.9, throttle: 1600 });
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
