// Hero variants' moves and passives (the peels are in src/content/peels/variants.ts). A variant keeps its base
// hero's passive and fires its base move with a twist on top, so the base move stays the single source of truth.
// - Kratos, Ghost of Sparta: This Is Spartaaa, but the rage leaves a fire trail on the table that burns feet
//   (1×/s for 2 s, at most every 0.5 s a foot); three blades from the start; an ember aura all the time.
// - Superpeel Prime: Heat Vision rakes the whole screen top to bottom (×12, 1.5 s stun, burn) over 2 s.
// - Iron Pan Mark Infinity: Suit Up, plus a second repulsor at the next-nearest foot and, as the suit ends, a
//   six-coloured beam that sweeps every lane (×15).
// - Thor, Thunder Unleashed: Thunder God, then 4 s of storm (a ×2 chaining bolt every 0.35 s); Mjölnir every 5 s.
// - Odin Allfather Ascended: Allfather, plus the eye's light stuns every foot 1.5 s and Gungnir strikes 8, not 4.
// - Zeus, King Unbound: Wrath of Olympus, then one colossal bolt through every foot (×8, 2 s stun).
// - Endgame variants: the hero's own move, then a ring of 5 portals strikes the 5 toughest feet (×3 each).
// - Shield of Liberty: 16 ricochets (×3), then a stomp shield on the weakest pizza.
// - Symbiote Pan: Web Ceiling, plus a tendril every 0.7 s that drags the nearest foot below up into the web.
// - Amazon Queen: the lasso ropes the 3 toughest (×3 weak spot for 8 s, a 1.5 s stun, pulled together); Royal
//   Bracers glance off 25% of stomps (Wonder Wedge: 15%).
// Also adds the Kratos nemesis arenas to the night stages (Moon Knife's Moonlit, Batpeel's Signal).

import Phaser from 'phaser';
import { TABLE_Y, W } from '../../config';
import { audio } from '../../systems/audio';
import type { ActFx } from '../contentFx';
import type { Foot } from '../Foot';
import '../godMoves';
import { MOVES, PASSIVES, registerMoves, registerPassives, type HeroKit, type MoveCtx, type Passive } from '../heroKit';
import { NIGHT } from '../heroMoves';

// the nemesis arenas on night stages (Tartarus, Metropizza Rooftops)
for (const id of ['titanking', 'zeus', 'cheetoe']) NIGHT.add(id);

/** Something that ticks for `sec` seconds then cleans up (stops with the wave). */
export function timed(k: HeroKit, sec: number, tick: (dt: number, t: number) => void, stop: () => void = () => {}): void {
  let t = 0;
  let done = false;
  k.effect({
    update: (dt) => {
      if (done) return false;
      t += dt;
      tick(dt, t);
      if (t >= sec) {
        done = true;
        stop();
        return false;
      }
      return true;
    },
    stop: () => {
      if (done) return;
      done = true;
      stop();
    },
  });
}

/** A variant fires its base move, then its own twist. */
export function withBase(base: string, twist: (k: HeroKit, ctx: MoveCtx) => void): (k: HeroKit, ctx: MoveCtx) => void {
  return (k, ctx) => {
    MOVES[base]?.(k, ctx);
    twist(k, ctx);
  };
}

/** A variant keeps its base's passive, with some hooks changed or added on top. */
export function passiveFrom(base: string, extra: Partial<Passive> = {}): Passive {
  const p = PASSIVES[base] ?? {};
  const out: Passive = { ...p, ...extra };
  // hooks both sides define run one after the other
  for (const key of ['tick', 'waveStart', 'waveClear', 'hit', 'kill', 'lost', 'blocked'] as const) {
    const a = p[key] as ((...args: unknown[]) => void) | undefined;
    const b = extra[key] as ((...args: unknown[]) => void) | undefined;
    if (a && b) (out as Record<string, unknown>)[key] = (...args: unknown[]) => (a(...args), b(...args));
  }
  return out;
}

// ——— Kratos, Ghost of Sparta ———

interface Flame {
  x: number;
  y: number;
  t: number;
}

registerMoves({
  ghostSparta: withBase('spartaaa', (k) => {
    audio.sfx('sfx_hero_ghostsparta', { volume: 0.9 });
    const g = k.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    k.host.layers.under.add(g);
    const flames: Flame[] = [];
    const last = new WeakMap<Foot, number>();
    let lay = 0;
    let at = k.host.peelPos();
    timed(
      k,
      30,
      (dt) => {
        const raging = k.running?.label === 'ENRAGED';
        const p = k.host.peelPos();
        // the rage drops a patch of fire wherever the peel has moved
        lay -= dt;
        if (raging && lay <= 0 && Math.hypot(p.x - at.x, p.y - at.y) > 46) {
          lay = 0.05;
          at = p;
          flames.push({ x: p.x, y: p.y, t: 2.4 });
          if (Math.random() < 0.15) audio.sfx('sfx_hero_firetrail', { volume: 0.35, throttle: 220 });
        }
        g.clear();
        for (const f of flames) f.t -= dt;
        while (flames.length && flames[0].t <= 0) flames.shift();
        for (const fl of flames) {
          const a = Math.min(1, fl.t / 0.8);
          const w = 1 + Math.sin(k.host.now() * 18 + fl.x) * 0.12;
          g.fillStyle(0xd8201a, 0.32 * a).fillEllipse(fl.x, fl.y, 92 * w, 40 * w);
          g.fillStyle(0xff8a1a, 0.5 * a).fillEllipse(fl.x, fl.y - 4, 60 * w, 26 * w);
          g.fillStyle(0xfff0c0, 0.55 * a).fillEllipse(fl.x, fl.y - 6, 24, 10);
          if (Math.random() < 0.05 * a) k.host.fx.burn(fl.x + (Math.random() - 0.5) * 50, fl.y - 10);
        }
        if (!k.host.inWave()) return;
        const now = k.host.now();
        for (const f of k.host.live()) {
          if (now - (last.get(f) ?? -9) < 0.5) continue;
          if (!flames.some((fl) => Math.abs(f.cx - fl.x) < 60 && Math.abs(f.cy - fl.y) < 70)) continue;
          last.set(f, now);
          k.burn(f, 1, 2);
          k.host.hurt(f, 0.3, { quiet: true });
        }
      },
      () => g.destroy(),
    );
  }),
});

/** The ember aura: a soft fire glow round the peel and embers drifting off it, all the time. */
function emberAura(k: HeroKit): void {
  let glow = k.st.auraG as unknown as Phaser.GameObjects.Image | undefined;
  if (!glow || !glow.active) {
    glow = k.sc.add.image(0, 0, 'glow').setTint(0xff5a1a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35);
    k.host.layers.cursor.addAt(glow, 0);
    (k.st as Record<string, unknown>).auraG = glow;
  }
  const p = k.host.peelPos();
  glow.setPosition(p.x, p.y - 20).setScale(0.75 + Math.sin(k.host.now() * 5) * 0.06).setVisible(true);
  if (Math.random() < 0.35) k.host.fx.burn(p.x + (Math.random() - 0.5) * 90, p.y - 40 + (Math.random() - 0.5) * 60);
}

// (passiveFrom runs the Kratos Peel's own hooks first: the blades, one more each new act)
registerPassives({
  'hero:ghostofsparta': passiveFrom('hero:kratos', {
    // three blades from the start
    waveStart: (k) => void (k.st.blades = Math.max(3, Number(k.st.blades ?? 1))),
    tick: (k) => emberAura(k),
    waveClear: (k) => void (k.st.auraG as unknown as Phaser.GameObjects.Image | undefined)?.setVisible(false),
  }),
});

// ——— shared: the Endgame portals ———

/** A ring of golden portals opens over the table and each sends a strike at one of the 5 toughest feet (×3). */
function portals(k: HeroKit): void {
  if (!k.host.inWave()) return;
  audio.sfx('sfx_hero_endgame', { volume: 0.9 });
  k.host.quip(W / 2, 230, 'ASSEMBLE!', '#ffd23f', 64);
  const targets = k.toughest(5);
  for (let i = 0; i < 5; i++) {
    const x = 260 + i * 350;
    const y = 200 + (i % 2) * 70;
    const ring = k.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    k.host.layers.fx.add(ring);
    const o = { r: 0, a: 1 };
    const draw = () => {
      ring.clear();
      // a spinning ring of gold sparks round an amber rim
      for (let s = 0; s < 14; s++) {
        const a = (s / 14) * Math.PI * 2 + k.host.now() * 6;
        ring.fillStyle(0xffd23f, 0.9 * o.a).fillCircle(x + Math.cos(a) * o.r, y + Math.sin(a) * o.r * 0.45, 5);
      }
      ring.lineStyle(6, 0xffb040, 0.7 * o.a).strokeEllipse(x, y, o.r * 2, o.r * 0.9);
    };
    k.sc.tweens.add({ targets: o, r: 70, duration: 300, delay: i * 90, ease: 'Back.Out', onUpdate: draw });
    k.sc.time.delayedCall(420 + i * 110, () => {
      const f = targets[i];
      if (f?.alive && k.host.inWave()) {
        k.beam(x, y, f.cx, f.cy, 0xffd23f, 16, 300);
        k.host.hurt(f, 3, { knock: 300 });
        k.host.fx.propBurst(f.cx, f.cy, 0xffd23f, 1);
      }
      k.sc.tweens.add({ targets: o, a: 0, duration: 400, onUpdate: draw, onComplete: () => ring.destroy() });
    });
  }
}

registerMoves({
  // ——— Superpeel Prime: Heat Vision rakes the whole screen ———
  heatVisionPrime: (k) => {
    audio.sfx('sfx_hero_primebeam', { volume: 1 });
    const peel = k.host.peel();
    const eyes = [-1, 1].map((s) => {
      const p = k.host.peelPos();
      const e = k.img('glow', p.x + s * 14, p.y - 12, 0.05).setTint(0xff3a2a).setBlendMode(Phaser.BlendModes.ADD);
      k.sc.tweens.add({ targets: e, scale: 0.7, duration: 450, ease: 'Quad.In' });
      return e;
    });
    k.flashC(0xff3a2a, 200);
    const g = k.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    k.host.layers.fx.add(g);
    const hit = new Set<Foot>();
    timed(
      k,
      2.6,
      (_dt, t) => {
        const p = k.host.peelPos();
        eyes.forEach((e, i) => e.setPosition(p.x + (i ? 14 : -14) + Math.sin(peel.rotation) * 6, p.y - 12));
        g.clear();
        if (t < 0.5) return;
        // the beams' aim rakes left and right as it falls from the top of the screen to the table
        const u = Math.min(1, (t - 0.5) / 2);
        const ty = 80 + (TABLE_Y - 80) * u;
        const sx = W / 2 + Math.sin(u * Math.PI * 3.5) * (W / 2 + 80);
        for (const s of [-1, 1]) {
          const ex = p.x + s * 14;
          const ey = p.y - 12;
          const dx = sx + s * 60 - ex;
          const dy = ty - ey;
          const len = Math.hypot(dx, dy) || 1;
          const fx = ex + (dx / len) * 2600;
          const fy = ey + (dy / len) * 2600;
          for (const [w, c, a] of [[52, 0xff2a1a, 0.25], [22, 0xff4a2a, 0.8], [8, 0xfff0e0, 1]] as const) {
            g.lineStyle(w, c, a);
            g.lineBetween(ex, ey, fx, fy);
          }
          for (const f of k.feetOnLine(ex, ey, fx, fy, 50)) {
            if (hit.has(f)) continue;
            hit.add(f);
            k.host.hurt(f, 12, { knock: 320 });
            if (f.alive) {
              k.stun(f, 1.5);
              k.burn(f, 1, 3);
            }
            k.host.fx.explosion(f.cx, f.cy, 100);
          }
          if (Math.random() < 0.7) k.host.fx.burn(sx + s * 60, ty);
        }
        if (Math.random() < 0.4) k.host.shake(60, 0.004);
      },
      () => {
        g.destroy();
        eyes.forEach((e) => e.destroy());
      },
    );
  },

  // ——— Iron Pan Mark Infinity: twin repulsors, then the Infinity Beam sweeps every lane ———
  suitUpInfinity: withBase('suitUp', (k) => {
    audio.sfx('sfx_hero_infinity', { volume: 0.7 });
    let fire = 0.35;
    timed(
      k,
      20,
      (dt) => {
        fire += dt;
        if (fire < 0.7 || k.running?.label !== 'SUIT UP') return;
        fire = 0;
        // the second repulsor: the next-nearest foot
        const p = k.host.peelPos();
        const f = [...k.host.live()].sort((a, b) => Math.hypot(a.cx - p.x, a.cy - p.y) - Math.hypot(b.cx - p.x, b.cy - p.y))[1];
        if (!f) return;
        k.beam(p.x, p.y, f.cx, f.cy, 0xffd23f, 12, 180);
        k.host.hurt(f, 2, { knock: 300 });
      },
      () => {
        if (!k.host.inWave() || k.closing) return;
        // the Infinity Beam: six colours, sweeping across every lane once
        audio.sfx('sfx_hero_infinity', { volume: 1 });
        const g = k.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
        k.host.layers.fx.add(g);
        const cols = [0x7a5aff, 0xff3a3a, 0x3a8aff, 0xffd23f, 0xff8a1c, 0x3acf6a];
        const hit = new Set<Foot>();
        const o = { u: 0 };
        k.sc.tweens.add({
          targets: o,
          u: 1,
          delay: 500,
          duration: 1300,
          ease: 'Sine.InOut',
          onUpdate: () => {
            const x = 80 + (W - 160) * o.u;
            g.clear();
            cols.forEach((c, i) => {
              g.lineStyle(26, c, 0.55);
              g.lineBetween(x + (i - 2.5) * 16, -40, x + (i - 2.5) * 16, TABLE_Y);
            });
            g.lineStyle(20, 0xffffff, 0.9);
            g.lineBetween(x, -40, x, TABLE_Y);
            if (!k.host.inWave()) return;
            for (const f of k.host.live()) {
              if (hit.has(f) || Math.abs(f.cx - x) > 90) continue;
              hit.add(f);
              k.host.hurt(f, 15, { knock: 900 });
              k.host.fx.explosion(f.cx, f.cy, 110);
            }
            k.host.shake(40, 0.004);
          },
          onComplete: () => k.sc.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => g.destroy() }),
        });
      },
    );
  }),

  // ——— Thor, Thunder Unleashed: the storm stays ———
  thunderUnleashed: withBase('thunderGod', (k) => {
    audio.sfx('sfx_hero_unleashed', { volume: 0.9 });
    let beat = 0;
    timed(k, 5, (dt, t) => {
      if (t < 1) return;
      beat -= dt;
      if (beat > 0) return;
      beat = 0.35;
      const f = k.random(1)[0];
      if (!f) return;
      k.strike(f.cx, f.cy, 0xffe680);
      k.host.hurt(f, 2, { knock: 200 });
      k.host.runFx([{ e: 'chain', x: 1, jumps: 2, at: { to: 'hit' } }], { foot: f, x: f.cx, y: f.cy }, 0xffe680);
      audio.sfx('sfx_hero_thunder', { volume: 0.35, throttle: 160 });
    });
  }),

  // ——— Odin Allfather Ascended: the eye's light stuns, and Gungnir strikes four more ———
  allfatherAscended: withBase('allfather', (k) => {
    audio.sfx('sfx_hero_ascended', { volume: 0.9 });
    k.sc.time.delayedCall(500, () => {
      if (!k.host.inWave()) return;
      k.flashC(0xffe680, 260);
      for (const f of k.host.live()) {
        k.stun(f, 1.5);
        k.host.fx.glint(f.cx, f.cy - 30);
      }
    });
    k.sc.time.delayedCall(2500, () => {
      if (!k.host.inWave()) return;
      for (const [i, f] of k.toughest(8).slice(4).entries()) {
        k.sc.time.delayedCall(i * 160, () => {
          if (!f.alive) return;
          const sp = k.img('g_spear', f.cx, -200, 0.8).setAngle(90).setTint(0xffe680);
          k.sc.tweens.add({
            targets: sp,
            y: f.cy - 40,
            duration: 160,
            ease: 'Quad.In',
            onComplete: () => {
              k.host.hurt(f, 6, { knock: 500 });
              k.strike(f.cx, f.cy, 0xffe680);
              k.host.shake(140, 0.008);
              k.sc.tweens.add({ targets: sp, alpha: 0, duration: 300, onComplete: () => sp.destroy() });
            },
          });
        });
      }
    });
  }),

  // ——— Zeus, King Unbound: after the storm, one colossal bolt through every foot ———
  wrathUnbound: withBase('wrathOlympus', (k) => {
    k.sc.time.delayedCall(3300, () => {
      if (!k.host.inWave()) return;
      audio.sfx('sfx_hero_unbound', { volume: 1 });
      k.shout('UNBOUND!', 0xc8a0ff, 120);
      k.flashC(0xffffff, 300);
      k.host.shake(600, 0.016);
      k.host.rumble(1, 500);
      for (const f of k.host.live()) {
        k.strike(f.cx, f.cy, 0xe0c8ff);
        k.host.hurt(f, 8, { knock: 600 });
        if (f.alive) k.stun(f, 2);
      }
    });
  }),
});

// ——— the comic nemeses' variants ———

registerMoves({
  // Shield of Liberty: 16 ricochets (Captain Pizzeria: 8), and the shield lands on the weakest pizza as a stomp shield
  shieldLiberty: (k) => {
    audio.sfx('sfx_hero_liberty', { volume: 0.9 });
    const t = k.front(1);
    if (!t.length) return;
    k.host.throwAt({ e: 'throw', prop: 'shield', how: 'ricochet', x: 3, more: Array(15).fill(3), at: { to: 'front', n: 1 } }, t, 0xffd23f);
    k.sc.time.delayedCall(2600, () => {
      if (!k.host.inWave()) return;
      const p = [...k.host.pizzas()].filter((q) => !q.dead).sort((a, b) => a.slices / a.maxSlices - b.slices / b.maxSlices)[0];
      if (!p) return;
      k.host.runFx([{ e: 'shield', n: 1, who: 'weakest' }], { x: p.x, y: p.surfaceY }, 0xffd23f);
      k.host.quip(p.x, p.surfaceY - 140, 'LIBERTY!', '#ffd23f', 40);
      audio.sfx('sfx_hero_liberty', { volume: 0.6 });
    });
  },

  // Symbiote Pan: Web Ceiling, plus tendrils that drag the feet below up into the web
  webSymbiote: withBase('webCeiling', (k) => {
    let grab = 0.4;
    const grabbed = new WeakSet<Foot>();
    timed(k, 10, (dt) => {
      grab -= dt;
      if (grab > 0 || !k.host.inWave()) return;
      grab = 0.7;
      // the nearest foot below the web that isn't already stuck
      const p = k.host.peelPos();
      const f = k.host
        .live()
        .filter((o) => o.cy > 300 && !o.brain.webbed && !grabbed.has(o))
        .sort((a, b) => Math.hypot(a.cx - p.x, a.cy - p.y) - Math.hypot(b.cx - p.x, b.cy - p.y))[0];
      if (!f) return;
      grabbed.add(f);
      audio.sfx('sfx_hero_tendril', { volume: 0.7, throttle: 120 });
      const ax = f.cx + (Math.random() - 0.5) * 120;
      const g = k.sc.add.graphics();
      k.host.layers.fx.add(g);
      const o = { u: 0 };
      const draw = () => {
        g.clear();
        const tx = ax + (f.cx - ax) * Math.min(1, o.u * 2);
        const ty = 200 + (f.cy - 200) * Math.min(1, o.u * 2);
        for (const [w, c] of [[16, 0x2a1810], [10, 0x16161e], [3, 0x6a6aff]] as const) {
          g.lineStyle(w, c, 1);
          g.beginPath();
          g.moveTo(ax, 200);
          g.lineTo((ax + tx) / 2 + Math.sin(o.u * 20) * 18, (200 + ty) / 2);
          g.lineTo(tx, ty);
          g.strokePath();
        }
      };
      k.sc.tweens.add({
        targets: o,
        u: 1,
        duration: 520,
        onUpdate: draw,
        onComplete: () => {
          g.destroy();
          if (!f.alive || !k.host.inWave()) return;
          // yanked up into the web and stuck there
          f.knock(320);
          f.brain.webbed = 1;
          k.stun(f, 2);
          k.host.hurt(f, 1, { quiet: true });
          k.host.fx.propBurst(f.cx, f.cy, 0x6a6aff, 0.8);
          k.sc.time.delayedCall(2000, () => (f.brain.webbed = 0));
        },
      });
    });
  }),

  // Amazon Queen: the lasso ropes the 3 toughest and yanks them together
  lassoQueen: (k) => {
    const feet = k.toughest(3);
    if (!feet.length) return;
    audio.sfx('sfx_hero_amazon', { volume: 0.9 });
    const cx = feet.reduce((s, f) => s + f.cx, 0) / feet.length;
    for (const f of feet) {
      k.host.throwAt({ e: 'throw', prop: 'lasso', how: 'stick', x: 0, stick: 8, at: { to: 'toughest', n: 1 } }, [f], 0xffd23f, (t) => {
        t.brain.lassoed = 1;
        t.brain.lassoStomp = 1;
        k.mark(t, 3, 8);
        k.stun(t, 1.5);
        if (!t.isBossLike) k.sc.tweens.add({ targets: t, x: t.x + (cx - t.x) * 0.5, duration: 260, ease: 'Quad.Out' });
        k.host.quip(t.x, t.cy - 140, 'ROPED!', '#ffd23f', 36);
        const ring = k.img('glow', t.cx, t.cy, 0.5).setTint(0xffd23f).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.8);
        timed(
          k,
          8,
          (_dt, tt) => {
            ring.setPosition(t.cx, t.cy).setScale(0.45 + Math.sin(tt * 8) * 0.08);
            if (!t.alive) ring.setVisible(false);
          },
          () => {
            ring.destroy();
            t.brain.lassoed = 0;
          },
        );
      });
    }
  },
});

// ——— Endgame: each Avengers-style hero's own move, then the portals ———
for (const base of ['binaryMode', 'awesomeMix', 'redLedger', 'trickQuiver', 'kinetic', 'timeStone', 'chaosHex', 'giantSize', 'stingSwarm', 'bigGun', 'iAmCrust']) {
  registerMoves({ [`endgame_${base}`]: withBase(base, (k) => void k.sc.time.delayedCall(400, () => portals(k))) });
}

// ——— the variants' passives: their base hero's, with a twist or two ———

const thor = PASSIVES['hero:thor'];
registerPassives({
  'hero:superpeelprime': passiveFrom('hero:superpeel'),
  'hero:ironpaninfinity': passiveFrom('hero:ironpan'),
  // Mjölnir every 5 s (Thor: 7)
  'hero:thorunleashed': {
    ...thor,
    tick: (k, dt) => {
      k.st.mjolnir = Number(k.st.mjolnir ?? 0) + dt;
      if (Number(k.st.mjolnir) < 5) return;
      k.st.mjolnir = 0;
      const pick = k.toughest(1);
      if (!pick.length) return;
      audio.sfx('sfx_hero_mjolnir', { volume: 0.7, throttle: 60 });
      k.host.throwAt({ e: 'throw', prop: 'hammer', how: 'boomerang', x: 4, more: [4], at: { to: 'random', n: 1 } }, pick, 0xffe680, (f, x) => {
        k.host.hurt(f, x, { knock: 500 });
        k.strike(f.cx, f.cy, 0xffe680);
      });
    },
  },
  'hero:odinascended': passiveFrom('hero:odin'),
  'hero:shieldofliberty': passiveFrom('hero:captainpizzeria'),
  'hero:symbiotepan': passiveFrom('hero:spiderpan'),
  // Royal Bracers: 25% of stomps glance off (Wonder Wedge: 15%); a roped foot's stomp is still cancelled
  'hero:amazonqueen': {
    ...PASSIVES['hero:wonderwedge'],
    stomp: (k, f, p) => {
      if (PASSIVES['hero:wonderwedge']?.stomp?.(k, f, p)) return true;
      if (f.isBossLike || Math.random() >= 0.1 / 0.85) return false;
      k.host.quip(f.x, f.cy - 120, 'PING!', '#ffe680', 38);
      audio.sfx('sfx_hero_ping', { volume: 0.7, throttle: 60 });
      f.knock(600);
      return true;
    },
  },
  'hero:zeusunbound': passiveFrom('hero:zeus'),
  // the Bulk hulks out on his own: the portals open the first time he does each wave
  'hero:incrediblebulkendgame': passiveFrom('hero:incrediblebulk', {
    lost: (k) => {
      if (!k.wv.raged || k.wv.endgamed) return;
      k.wv.endgamed = true;
      portals(k);
    },
  }),
});
for (const id of ['captainmarvellous', 'starlard', 'blackwindow', 'hawkeyetalian', 'blackpanther', 'strangeloaf', 'scarletpitch', 'antpan', 'wasabiwasp', 'rocketrucola', 'iamcrust']) {
  registerPassives({ [`hero:${id}endgame`]: passiveFrom(`hero:${id}`) });
}

export const actFx: Record<number, ActFx> = {};
