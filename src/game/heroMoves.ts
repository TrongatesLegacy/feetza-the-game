// The heroes' signature moves and passives, built on the hero kit (src/game/heroKit.ts) and the projectile
// system. Each move is registered by the id its ability names (`{ e: 'move', id }` in src/content/peels/heroes.ts),
// and each passive by its peel id. The scene talks to all of this through HeroDirector.
//
// The three big ones, built carefully:
// - Time Stone keeps a 5.5 s history (feet and pizzas, 10 times a second). Rewinding sends every foot that was on
//   screen back to where it was (feet that arrived since go back to the top), gives each pizza back the slices it
//   lost in that window (a pizza destroyed in it comes back), and never brings a beaten foot back.
// - Boom Tube opens a portal, takes the three front feet out of their lanes (puppets), pulls them in and defeats
//   them, so they pay their tips and free their lanes. Bosses are never swallowed: they take ×10.
// - Shape-Shift swaps the scene's ability (and the peel's look, on a separate texture) for 20 s, fires a meter
//   ability straight away, and swaps back when the transformation ends, the wave ends or the run ends. Hero peels
//   are never picked, so one transformation never starts inside another.

import Phaser from 'phaser';
import { H, HOVER_Y, TABLE_Y, W } from '../config';
import { audio } from '../systems/audio';
import { save } from '../systems/save';
import type { ThrowFx } from './abilities';
import type { Foot } from './Foot';
import { HeroKit, MOVES, PASSIVES, registerMoves, registerPassives, type DmgSource, type HeroHost, type MoveCtx, type Passive } from './heroKit';
import type { Pizza } from './Pizza';

const RED = 0xff3a2a;
const GOLD = 0xffd23f;
const GREEN = 0x7dff9a;
const CYAN = 0x5fd8ff;
const PURPLE = 0xa77dff;
const PINK = 0xff7ad9;
const ORANGE = 0xff9f1c;
const WHITE = 0xffffff;

/** Night stages (and their arenas): Batpeel's signal shows here; Moon Knife hits twice as hard. */
export const NIGHT = new Set(['diner', 'space', 'oldtown', 'cellar', 'rooftop', 'bigfoot', 'phantomking', 'cosmiccroc', 'gargoyle']);
/** Outdoor stages: Stormy Weather brings rain. */
const OUTDOOR = new Set(['rooftop', 'beach', 'oldtown', 'pier', 'slopes']);

const sfx = (key: string, volume = 1) => audio.sfx(`sfx_hero_${key}`, { volume, throttle: 60 });
const TH = (prop: ThrowFx['prop'], how: ThrowFx['how'], x: number, more: Partial<ThrowFx> = {}): ThrowFx => ({ e: 'throw', prop, how, x, at: { to: 'random', n: 1 }, ...more });

/** Something that ticks for `sec` seconds then cleans up. */
function timed(k: HeroKit, sec: number, tick: (dt: number, t: number) => void, stop: () => void = () => {}): void {
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

/** Run `fn` n times, `gap` seconds apart (stops if the wave ends). */
function volley(k: HeroKit, n: number, gap: number, fn: (i: number) => void): void {
  for (let i = 0; i < n; i++) k.sc.time.delayedCall(i * gap * 1000, () => k.host.inWave() && fn(i));
}

/** A graphic that follows the peel while a transformation runs. */
function onPeel(k: HeroKit, draw: (g: Phaser.GameObjects.Graphics, t: number) => void): { g: Phaser.GameObjects.Graphics; tick: (dt: number) => void; kill: () => void } {
  const g = k.sc.add.graphics();
  k.host.layers.cursor.add(g);
  let t = 0;
  return {
    g,
    tick: (dt) => {
      t += dt;
      const p = k.host.peelPos();
      const peel = k.host.peel();
      g.setPosition(p.x, p.y).setRotation(peel.rotation).setScale(peel.scale / 0.62);
      g.clear();
      draw(g, t);
    },
    kill: () => g.destroy(),
  };
}

// ——— Time Stone's history ———
interface FrameRec {
  t: number;
  feet: Map<Foot, { x: number; y: number; vy: number; state: Foot['state'] }>;
  pizzas: Map<Pizza, { slices: number; dead: boolean }>;
}
const history = new WeakMap<HeroKit, FrameRec[]>();

function record(k: HeroKit): void {
  const list = history.get(k) ?? [];
  history.set(k, list);
  const now = k.host.now();
  if (list.length && now - list[list.length - 1].t < 0.1) return;
  const feet = new Map<Foot, { x: number; y: number; vy: number; state: Foot['state'] }>();
  for (const f of k.host.feet()) if (f.alive) feet.set(f, { x: f.x, y: f.y, vy: f.vy, state: f.state });
  const pizzas = new Map<Pizza, { slices: number; dead: boolean }>();
  for (const p of k.host.pizzas()) pizzas.set(p, { slices: p.slices, dead: p.dead });
  list.push({ t: now, feet, pizzas });
  while (list.length && now - list[0].t > 5.6) list.shift();
}

// ——— the moves ———
registerMoves({
  // 1 · Superpeel
  heatVision: (k) => {
    sfx('heatvision');
    const peel = k.host.peel();
    // the eyes glow first: anticipation
    const eyes = [-1, 1].map((s) => {
      const p = k.host.peelPos();
      const e = k.img('glow', p.x + s * 14, p.y - 12, 0.05).setTint(0xff3a2a).setBlendMode(Phaser.BlendModes.ADD);
      k.sc.tweens.add({ targets: e, scale: 0.5, duration: 450, ease: 'Quad.In' });
      return e;
    });
    const g = k.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    k.host.layers.fx.add(g);
    const hit = new Set<Foot>();
    const ty = H * 0.3;
    const p0 = k.host.peelPos();
    const ltr = p0.x > W / 2;
    timed(
      k,
      1.75,
      (_dt, t) => {
        const p = k.host.peelPos();
        eyes.forEach((e, i) => e.setPosition(p.x + (i ? 14 : -14) + Math.sin(peel.rotation) * 6, p.y - 12));
        g.clear();
        if (t < 0.5) return;
        const u = Math.min(1, (t - 0.5) / 1.2);
        const sx = ltr ? -100 + (W + 200) * u : W + 100 - (W + 200) * u;
        for (const s of [-1, 1]) {
          const ex = p.x + s * 14;
          const ey = p.y - 12;
          const tx = sx + s * 50;
          // the beam runs on past its sweep point, to the edge of the screen
          const dx = tx - ex;
          const dy = ty - ey;
          const len = Math.hypot(dx, dy) || 1;
          const fx = ex + (dx / len) * 2400;
          const fy = ey + (dy / len) * 2400;
          for (const [w, c, a] of [[40, 0xff2a1a, 0.25], [18, 0xff4a2a, 0.75], [6, 0xfff0e0, 1]] as const) {
            g.lineStyle(w, c, a);
            g.lineBetween(ex, ey, fx, fy);
          }
          for (const f of k.feetOnLine(ex, ey, fx, fy, 40)) {
            if (hit.has(f)) continue;
            hit.add(f);
            k.host.hurt(f, 10, { knock: 300 });
            if (f.alive) {
              k.stun(f, 1.5);
              k.burn(f, 1, 3);
            }
            k.host.fx.burn(f.cx, f.cy);
            k.host.fx.explosion(f.cx, f.cy, 90);
          }
          if (Math.random() < 0.6) k.host.fx.burn(tx, ty);
        }
        if (Math.random() < 0.3) k.host.shake(60, 0.003);
      },
      () => {
        g.destroy();
        eyes.forEach((e) => e.destroy());
      },
    );
  },

  // 2 · Batpeel
  nightFalls: (k) => {
    let dark: ReturnType<HeroKit['overlay']> | null = null;
    let throwT = 0;
    k.transform({
      label: 'NIGHT FALLS',
      sec: 12,
      color: GOLD,
      sfx: 'sfx_hero_nightfalls',
      start: () => {
        dark = k.overlay({ kind: 'dark', alpha: 0.84, spot: 250, color: 0x04050c }, 500);
        k.host.quip(W / 2, 300, 'LIGHTS OUT', '#ffd23f', 64);
      },
      tick: (dt) => {
        const p = k.host.peelPos();
        for (const f of k.host.live()) if (Math.hypot(f.cx - p.x, f.cy - p.y) > 250) k.slow(f, 0.3, 0.15);
        throwT += dt;
        if (throwT >= 2) {
          throwT = 0;
          const pick = k.random(1);
          if (pick.length)
            k.host.throwAt(TH('wingrang', 'boomerang', 2.5, { more: [2.5] }), pick, GOLD, (f, x) => {
              k.host.hurt(f, x, { knock: 200 });
              // the wing-boomerang goes off as it hits: a small blast round the foot
              k.host.fx.explosion(f.cx, f.cy, 140);
              audio.sfx('sfx_explosion', { volume: 0.4, throttle: 90 });
              for (const o of k.host.live()) if (o !== f && Math.hypot(o.cx - f.cx, o.cy - f.cy) < 140) k.host.hurt(o, 1, { quiet: true });
            });
        }
      },
      end: () => dark?.end(600),
    });
  },

  // 3 · Wonder Wedge
  lasso: (k) => {
    const f = k.toughest(1)[0];
    if (!f) return;
    sfx('lasso');
    k.host.throwAt(TH('lasso', 'stick', 0, { stick: 6 }), [f], GOLD, (t) => {
      t.brain.lassoed = 1;
      t.brain.lassoStomp = 1;
      k.mark(t, 3, 6);
      k.host.quip(t.x, t.cy - 140, 'WEAK SPOT!', '#ffd23f', 40);
      // the weak spot glows for 6 s
      const ring = k.img('glow', t.cx, t.cy, 0.5).setTint(GOLD).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.8);
      timed(
        k,
        6,
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
  },

  // 4 · The Flashfoot
  speedForce: (k) => {
    let tint: ReturnType<HeroKit['overlay']> | null = null;
    let last = { ...k.host.peelPos() };
    k.transform({
      label: 'SPEED FORCE',
      sec: 6,
      color: GOLD,
      shout: 'SPEED FORCE!',
      sfx: 'sfx_hero_speedforce',
      start: () => {
        k.mods.world = 0.25;
        tint = k.overlay({ kind: 'tint', color: 0x9fc0ff, alpha: 0.22, blend: 'multiply' }, 200);
      },
      tick: () => {
        const p = k.host.peelPos();
        if (Math.hypot(p.x - last.x, p.y - last.y) > 30) {
          k.host.fx.lightning(last.x, last.y, p.x, p.y);
          last = { ...p };
        }
      },
      end: () => tint?.end(300),
    });
  },

  // 5 · Aqua-Toe
  callDeep: (k) => {
    sfx('calldeep');
    const fins = [0, 1, 2].map((i) => {
      const img = k.sc.add.image(-200, TABLE_Y + 6, k.sc.textures.exists('h_fin') ? 'h_fin' : 'soft').setScale(0.9);
      k.host.layers.under.add(img);
      return { img, ph: i * 2.1 };
    });
    const water = k.sc.add.graphics();
    k.host.layers.under.add(water);
    const bitten = new Map<Foot, number>();
    timed(
      k,
      10,
      (_dt, t) => {
        water.clear();
        water.fillStyle(0x3fb6e0, 0.28 * Math.min(1, t * 2, (10 - t) * 2));
        for (let x = 0; x < W; x += 40) water.fillRect(x, TABLE_Y - 10 + Math.sin(t * 3 + x * 0.02) * 6, 40, 40);
        for (const fin of fins) {
          const x = W / 2 + Math.sin(t * 0.9 + fin.ph) * (W * 0.48);
          fin.img.setPosition(x, TABLE_Y + 4 + Math.sin(t * 5 + fin.ph) * 4).setFlipX(Math.cos(t * 0.9 + fin.ph) < 0);
        }
        for (const f of k.host.live()) {
          if (f.y < TABLE_Y - 40 || (bitten.get(f) ?? -9) > t - 1.2) continue;
          bitten.set(f, t);
          const jaw = k.img('h_jaws', f.cx, f.y + 30, 0.3);
          k.sc.tweens.add({ targets: jaw, y: f.y - 20, scale: 0.9, duration: 140, yoyo: true, onComplete: () => jaw.destroy() });
          k.host.hurt(f, 3, { knock: 500 });
          k.host.fx.propBurst(f.cx, f.y, CYAN, 1);
          sfx('bite', 0.8);
        }
      },
      () => {
        fins.forEach((f) => f.img.destroy());
        water.destroy();
      },
    );
  },

  // 6 · Green Lampshade
  construct: (k) => {
    sfx('construct');
    const big = k.sc.add.image(W / 2, 520, 'peel').setOrigin(0.5, 100 / 360).setScale(0).setTintFill(0x7dff9a).setAlpha(0.7).setBlendMode(Phaser.BlendModes.ADD).setAngle(-90);
    k.host.layers.fx.add(big);
    k.sc.tweens.add({ targets: big, scale: 3.4, duration: 450, ease: 'Back.Out' });
    const hit = new Set<Foot>();
    let pass = 0;
    timed(
      k,
      1.9,
      (_dt, t) => {
        if (t < 0.5) return;
        const u = Math.min(1, ((t - 0.5) % 0.7) / 0.55);
        const p = Math.floor((t - 0.5) / 0.7);
        if (p !== pass) {
          pass = p;
          hit.clear();
          sfx('sweep', 0.8);
        }
        if (p > 1) return;
        const ltr = p === 0;
        const x = ltr ? -300 + (W + 600) * u : W + 300 - (W + 600) * u;
        big.setPosition(x, 560).setAngle(ltr ? -80 + u * 20 : -100 - u * 20).setFlipY(!ltr);
        for (const f of k.host.live()) {
          if (hit.has(f) || Math.abs(f.cx - x) > 140) continue;
          hit.add(f);
          k.host.hurt(f, 6, { knock: 900 });
          k.host.fx.propBurst(f.cx, f.cy, 0x7dff9a, 1.2);
        }
      },
      () => k.sc.tweens.add({ targets: big, alpha: 0, scale: 4, duration: 250, onComplete: () => big.destroy() }),
    );
  },

  // 7 · Spider-Pan
  webCeiling: (k) => {
    sfx('webceiling');
    const g = k.sc.add.graphics();
    k.host.layers.fx.add(g);
    const anchors = Array.from({ length: 9 }, (_, i) => ({ x: (i / 8) * W, y: 180 + (i % 2) * 90 }));
    const stuck = new Map<Foot, number>();
    timed(
      k,
      10,
      (_dt, t) => {
        g.clear();
        const a = Math.min(1, t * 3, (10 - t) * 2);
        g.lineStyle(3, 0xf4f8ff, 0.75 * a);
        for (let i = 0; i < anchors.length - 1; i++) {
          const p = anchors[i];
          const q = anchors[i + 1];
          g.lineBetween(p.x, p.y, q.x, q.y);
          g.lineBetween(p.x, 0, p.x, p.y);
          g.lineBetween(p.x, p.y, (p.x + q.x) / 2, 0);
        }
        g.lineStyle(2, 0xf4f8ff, 0.45 * a);
        for (let k2 = 1; k2 <= 3; k2++) {
          g.beginPath();
          anchors.forEach((p, i) => (i ? g.lineTo(p.x, p.y - k2 * 40) : g.moveTo(p.x, p.y - k2 * 40)));
          g.strokePath();
        }
        for (const f of k.host.live()) {
          if (f.state !== 'descend' || f.y < 260 || f.y > 520 || (stuck.get(f) ?? -9) > t - 3) continue;
          stuck.set(f, t);
          f.brain.webbed = 1;
          k.stun(f, 2);
          k.slow(f, 0.4, 3);
          k.host.fx.propBurst(f.cx, f.cy, 0xf4f8ff, 1);
          k.host.quip(f.x, f.cy - 110, 'STUCK!', '#f4f8ff', 32);
          k.sc.time.delayedCall(2000, () => (f.brain.webbed = 0));
          sfx('web', 0.6);
        }
      },
      () => g.destroy(),
    );
  },

  // 8 · Iron Pan
  suitUp: (k) => {
    let fire = 0;
    const plates = onPeel(k, (g) => {
      // red and gold plates over the head, and a glowing core
      g.lineStyle(5, 0x2a1810, 1);
      g.fillStyle(0xb81d24, 1);
      g.fillRoundedRect(-62, -70, 124, 60, 16);
      g.strokeRoundedRect(-62, -70, 124, 60, 16);
      g.fillStyle(0xe8b23a, 1);
      g.fillRoundedRect(-36, -58, 72, 40, 10);
      g.strokeRoundedRect(-36, -58, 72, 40, 10);
      g.fillStyle(0xd8f6ff, 1);
      g.fillRect(-26, -44, 18, 6);
      g.fillRect(8, -44, 18, 6);
      g.fillStyle(0x9ff0ff, 0.9);
      g.fillCircle(0, 30, 12);
      g.strokeCircle(0, 30, 12);
    });
    k.transform({
      label: 'SUIT UP',
      sec: 20,
      color: ORANGE,
      shout: 'SUIT UP!',
      sfx: 'sfx_hero_suitup',
      tick: (dt) => {
        plates.tick(dt);
        fire += dt;
        if (fire < 0.7) return;
        fire = 0;
        const p = k.host.peelPos();
        const f = [...k.host.live()].sort((a, b) => Math.hypot(a.cx - p.x, a.cy - p.y) - Math.hypot(b.cx - p.x, b.cy - p.y))[0];
        if (!f) return;
        k.beam(p.x, p.y, f.cx, f.cy, 0x9ff0ff, 12, 180);
        k.host.hurt(f, 2, { knock: 300 });
        sfx('repulsor', 0.55);
      },
      end: () => {
        plates.kill();
        if (!k.host.inWave() || k.quietEnd) return;
        // the Unibeam: straight down the centre lane
        sfx('unibeam');
        const x = W / 2;
        k.beam(x, -40, x, TABLE_Y, 0xd8f6ff, 120, 500);
        k.host.shake(400, 0.01);
        for (const f of k.host.live()) if (Math.abs(f.cx - x) < 170) k.host.hurt(f, 15, { knock: 900 });
      },
    });
  },

  // 9 · Captain Pizzeria
  shieldBounce: (k) => {
    sfx('shield');
    const t = k.front(1);
    if (t.length) k.host.throwAt(TH('shield', 'ricochet', 3, { more: [3, 3, 3, 3, 3, 3, 3] }), t, 0x3a6ad8);
  },

  // 12 · Black Window
  redLedger: (k) => {
    sfx('ledger');
    for (const f of k.toughest(5)) {
      f.brain.ledger = 1;
      k.mark(f, 2, 12);
      f.flash(0xff2a2a, 200);
      k.host.quip(f.x, f.cy - 120, 'MARKED', '#ff4a3a', 30);
      k.host.fx.ring(f.cx, f.cy, 0xff2a2a, 0.7, 0.9);
    }
  },

  // 13 · Hawk-Eye-Talian
  trickQuiver: (k) => {
    sfx('quiver');
    const tricks: [string, ThrowFx, ((f: Foot, x: number) => void) | undefined][] = [
      ['PIERCE', TH('arrow', 'pierce', 3), undefined],
      ['BOOM', TH('arrow', 'explode', 3, { r: 160, splash: 1.5 }), undefined],
      ['NET', TH('arrow', 'stick', 0.5, { stick: 2.5, on: [{ e: 'stun', sec: 2.5, at: { to: 'hit' } }] }), undefined],
      ['FREEZE', TH('arrow', 'straight', 2, { on: [{ e: 'stun', sec: 2, at: { to: 'hit' }, freeze: true }] }), undefined],
      [
        'MAGNET',
        TH('arrow', 'straight', 1.5),
        (f, x) => {
          k.host.hurt(f, x);
          for (const o of k.host.live()) {
            if (o === f || Math.hypot(o.cx - f.cx, o.cy - f.cy) > 360 || o.isBossLike) continue;
            k.sc.tweens.add({ targets: o, x: o.x + (f.x - o.x) * 0.5, duration: 260, ease: 'Quad.Out' });
            k.host.hurt(o, 1.5, { quiet: true });
            k.host.fx.lightning(f.cx, f.cy, o.cx, o.cy);
          }
        },
      ],
      ['SPLIT', TH('arrow', 'split', 2), undefined],
    ];
    volley(k, tricks.length, 0.17, (i) => {
      const [label, e, on] = tricks[i];
      const pick = k.random(1);
      if (!pick.length) return;
      k.host.quip(pick[0].x, pick[0].cy - 150, label, '#c9a8ff', 30);
      k.host.throwAt(e, pick, PURPLE, on);
    });
  },

  // 14 · Wolverpeel
  berserker: (k) => {
    const claws = onPeel(k, (g, t) => {
      const pop = Math.min(1, t * 6);
      for (const dx of [-20, 0, 20]) {
        g.fillStyle(0xd8dde4, 1);
        g.lineStyle(4, 0x2a1810, 1);
        g.beginPath();
        g.moveTo(dx - 5, -70);
        g.lineTo(dx, -70 - 70 * pop);
        g.lineTo(dx + 5, -70);
        g.closePath();
        g.fillPath();
        g.strokePath();
      }
    });
    k.transform({
      label: 'BERSERKER',
      sec: 15,
      color: WHITE,
      shout: 'BERSERKER!',
      sfx: 'sfx_hero_berserker',
      start: () => {
        k.onHit = (f) => {
          k.sc.time.delayedCall(70, () => {
            if (!f.alive) return;
            k.host.hurt(f, 1, { knock: 100 });
            k.host.fx.propBurst(f.cx, f.cy, 0xc8102e, 0.6);
            sfx('slash', 0.5);
          });
          if (f.alive && !f.type.traits.includes('immuneBurn')) {
            k.burn(f, 1, 3);
            f.brain.bleed = 1;
            k.sc.time.delayedCall(3000, () => (f.brain.bleed = 0));
          }
        };
      },
      tick: (dt) => {
        claws.tick(dt);
        for (const f of k.host.live()) if (f.brain.bleed && Math.random() < dt * 6) k.host.fx.propBurst(f.cx, f.cy + 20, 0xc8102e, 0.3);
      },
      end: () => claws.kill(),
    });
  },

  // 15 · Stormy Weather
  stormFront: (k) => {
    sfx('storm');
    const sky = k.overlay({ kind: 'tint', color: 0x2a3a6a, alpha: 0.42, blend: 'multiply' }, 400);
    const rain = k.overlay({ kind: 'rain', alpha: 0.5 }, 400);
    let beat = 0.4;
    timed(
      k,
      6.4,
      (dt, t) => {
        if (t < 0.4) return;
        beat += dt;
        if (beat < 1) return;
        beat = 0;
        for (const f of k.random(5)) {
          k.strike(f.cx, f.cy);
          k.host.hurt(f, 1.5, { knock: 150 });
          if (f.alive) k.stun(f, 0.3);
        }
        k.flashC(0xd8f0ff, 90);
        audio.sfx('sfx_zap', { volume: 0.8 });
        sfx('thunder', 0.7);
      },
      () => {
        sky.end(600);
        rain.end(600);
      },
    );
  },

  // 16 · Cyclopizza
  opticBlast: (k) => {
    sfx('optic');
    const g = k.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    k.host.layers.fx.add(g);
    let tickT = 0;
    timed(
      k,
      4,
      (dt, t) => {
        const p = k.host.peelPos();
        g.clear();
        const w = 70 + Math.sin(t * 30) * 6;
        for (const [ww, c, a] of [[w * 1.6, 0xff2a2a, 0.22], [w, 0xff3a2a, 0.65], [w * 0.3, 0xfff0e0, 1]] as const) {
          g.fillStyle(c, a);
          g.fillRect(p.x - ww / 2, -20, ww, p.y - 10);
        }
        tickT += dt;
        if (tickT < 0.1) return;
        tickT = 0;
        for (const f of k.host.live()) {
          if (f.cy > p.y || Math.abs(f.cx - p.x) > 60 + f.meta.halfWidth * f.scale * 0.6) continue;
          k.host.hurt(f, 0.6, { knock: 60, quiet: true });
          if (Math.random() < 0.5) k.host.fx.burn(f.cx, f.cy);
        }
      },
      () => g.destroy(),
    );
  },

  // 17 · Black Pan-ther
  kinetic: (k) => {
    const hits = Number(k.wv.hits ?? 0);
    const x = Math.min(20, 0.2 * hits);
    k.wv.hits = 0;
    sfx('kinetic');
    const p = k.host.peelPos();
    for (let i = 0; i < 3; i++) k.sc.time.delayedCall(i * 90, () => k.host.fx.ring(p.x, p.y, PURPLE, 2.6 + i, 0.8));
    k.flashC(0xa77dff, 160);
    k.host.shake(380, 0.012);
    k.host.quip(W / 2, 380, `KINETIC RELEASE ×${x.toFixed(1)}`, '#c9a8ff', 56);
    if (x <= 0) return;
    for (const f of k.host.live()) k.host.hurt(f, x, { knock: 600 });
  },

  // 18 · Doctor Strangeloaf
  timeStone: (k) => {
    const list = history.get(k) ?? [];
    const now = k.host.now();
    const then = list.find((r) => now - r.t <= 5.05) ?? list[0];
    sfx('timestone');
    k.shout('REWIND', 0x7dff9a, 96);
    const tint = k.overlay({ kind: 'tint', color: 0x7dff9a, alpha: 0.18, blend: 'add' }, 120);
    const lines = k.overlay({ kind: 'scanlines', color: 0x7dff9a, alpha: 1 }, 120);
    // a clock face spinning backwards
    const g = k.sc.add.graphics();
    k.host.layers.fx.add(g);
    timed(
      k,
      0.9,
      (_dt, t) => {
        g.clear();
        g.lineStyle(10, 0x7dff9a, 0.7 * (1 - t / 0.9));
        g.strokeCircle(W / 2, H / 2, 260 + t * 80);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 - t * 9;
          g.lineBetween(W / 2 + Math.cos(a) * 220, H / 2 + Math.sin(a) * 220, W / 2 + Math.cos(a) * 250, H / 2 + Math.sin(a) * 250);
        }
        const a = -t * 14;
        g.lineBetween(W / 2, H / 2, W / 2 + Math.cos(a) * 180, H / 2 + Math.sin(a) * 180);
      },
      () => {
        g.destroy();
        tint.end(300);
        lines.end(300);
      },
    );
    if (!then) return;
    // feet go back to where they were (feet that arrived since go back up to the top)
    for (const f of k.host.feet()) {
      if (!f.alive || f.isBossLike || f.puppet) continue;
      const was = then.feet.get(f);
      const to = was ?? { x: f.x, y: HOVER_Y - 60, vy: 0, state: 'hover' as const };
      f.puppet = true;
      k.sc.tweens.add({
        targets: f,
        x: to.x,
        y: Math.min(to.y, HOVER_Y + 40),
        duration: 650,
        ease: 'Sine.InOut',
        onComplete: () => {
          f.puppet = false;
          if (!f.alive) return;
          f.vy = 0;
          f.setState(to.state === 'descend' || to.state === 'stomp' || to.state === 'lift' ? 'hover' : to.state === 'enter' ? 'enter' : 'hover');
        },
      });
    }
    // pizzas get back what they lost in those 5 seconds
    for (const [p, was] of then.pizzas) {
      if (was.dead) continue;
      const back = was.slices - (p.dead ? 0 : p.slices);
      if (back <= 0) continue;
      if (p.dead) k.host.revive(p, back);
      else k.host.heal(p, back);
      k.host.quip(p.x, p.surfaceY - 150, `+${back} RESTORED`, '#7dff9a', 36);
    }
  },

  // 19 · Scarlet Pitch
  chaosHex: (k) => {
    sfx('hex');
    k.flashC(0xff4a8a, 160);
    const live = k.host.live();
    for (const f of live) {
      k.host.fx.propBurst(f.cx, f.cy, PINK, 1);
      f.brain.hexed = 1;
      k.sc.time.delayedCall(6000, () => (f.brain.hexed = 0));
      if (f.isBossLike) {
        k.mark(f, 2, 6);
        continue;
      }
      const roll = Math.floor(Math.random() * 6);
      const label = ['SHRUNK', 'FROZEN', 'BURNING', 'MARKED', 'SWAPPED', 'GOLDEN'][roll];
      k.host.quip(f.x, f.cy - 120, label, '#ff9ad5', 26);
      if (roll === 0) {
        const size = f.sizeMul;
        f.setSize(size * 0.65);
        k.mark(f, 1.5, 6);
        k.sc.time.delayedCall(6000, () => f.alive && f.setSize(size));
      } else if (roll === 1) k.stun(f, 2.5, true);
      else if (roll === 2) k.burn(f, 1.5, 4);
      else if (roll === 3) k.mark(f, 2, 6);
      else if (roll === 4) {
        // swap heights (and moves) with another foot: lanes stay put
        const o = Phaser.Utils.Array.GetRandom(live.filter((x) => x !== f && !x.isBossLike));
        if (o) {
          const [ay, as] = [f.y, f.state];
          const [by, bs] = [o.y, o.state];
          f.y = by;
          o.y = ay;
          if (bs === 'hover' || bs === 'descend') f.setState(bs);
          if (as === 'hover' || as === 'descend') o.setState(as);
        }
      } else {
        f.brain.goldHex = 1;
        f.tint(0xffd23f);
        k.host.fx.glint(f.cx, f.cy, 6);
      }
    }
  },

  // 20 · Ant-Pan
  giantSize: (k) => {
    k.transform({
      label: 'GIANT-SIZE',
      sec: 10,
      color: RED,
      shout: 'GIANT-SIZE!',
      sfx: 'sfx_hero_giant',
      start: () => {
        k.mods.size = 3;
        k.mods.reach = 2.5;
        k.mods.dmg = 2;
        k.syncPeel(500);
        k.host.shake(400, 0.01);
      },
    });
  },

  // 21 · Dare-Dough
  radarSense: (k) => {
    const lit = new Set<Foot>();
    let dark: ReturnType<HeroKit['overlay']> | null = null;
    let ping = 0;
    const g = k.sc.add.graphics();
    k.host.layers.fx.add(g);
    k.transform({
      label: 'RADAR SENSE',
      sec: 8,
      color: RED,
      sfx: 'sfx_hero_radar',
      start: () => {
        dark = k.overlay({ kind: 'tint', color: 0x080004, alpha: 0.86, below: 'feet' }, 300);
        k.mods.crit = true;
      },
      tick: (dt) => {
        for (const f of k.host.live()) {
          if (lit.has(f)) continue;
          lit.add(f);
          f.tint(0x3a0a0a);
          if (!f.isBossLike) f.setPhaseAura(0xff2a2a);
        }
        ping += dt;
        const p = k.host.peelPos();
        g.clear();
        const r = (ping % 1) * 900;
        g.lineStyle(4, 0xff2a2a, 0.6 * (1 - (ping % 1)));
        g.strokeCircle(p.x, p.y, r);
      },
      end: () => {
        dark?.end(300);
        g.destroy();
        for (const f of lit) {
          if (!f.alive) continue;
          f.clearTint();
          if (!f.isBossLike) f.setPhaseAura(null);
        }
      },
    });
  },

  // 22 · Deadpeel
  maxEffort: (k) => {
    sfx('coins');
    const have = k.host.coins();
    let n = Math.min(have, Math.max(10, Math.min(40, Math.round(have * 0.1))));
    const free = n <= 0;
    if (free) n = 5;
    else k.host.spend(n);
    const pill = document.querySelector('.hud .pill');
    pill?.classList.add('grabbed');
    window.setTimeout(() => pill?.classList.remove('grabbed'), 1100);
    const lines = free
      ? ['NO TIPS? RUDE.', 'IOU, FEET', 'PUT IT ON MY TAB']
      : ['KEEP THE CHANGE!', 'TIP JAR’S EMPTY!', 'WORTH EVERY PENNY', 'COIN-OPERATED HERO', 'MAKE IT RAIN!', 'IS THIS IN THE BUDGET?'];
    const from = k.host.coinPos();
    volley(k, n, 0.06, (i) => {
      const f = k.random(1)[0];
      if (!f) return;
      const c = k.img('t_coin', from.x, from.y, 0.4);
      k.sc.tweens.add({
        targets: c,
        x: f.cx,
        y: f.cy,
        angle: 720,
        duration: 380,
        ease: 'Quad.In',
        onComplete: () => {
          c.destroy();
          if (f.alive) k.host.hurt(f, 1, { knock: 80, quiet: i % 3 !== 0 });
          audio.sfx('sfx_hitcoin', { volume: 0.5, throttle: 50 });
        },
      });
      if (i % 8 === 0) {
        const p = k.host.peelPos();
        k.host.quip(p.x, p.y - 120, lines[(i / 8) % lines.length], '#ff4a5a', 34);
      }
    });
  },

  // 23 · Silver Slicer
  cosmicBoard: (k) => {
    sfx('board');
    const rows = [260, 440, 620];
    rows.forEach((y, i) => {
      k.sc.time.delayedCall(i * 520, () => {
        if (!k.host.inWave()) return;
        const ltr = i % 2 === 0;
        const b = k.img('h_board', ltr ? -200 : W + 200, y, 1).setFlipX(!ltr);
        const hit = new Set<Foot>();
        sfx('whoosh', 0.7);
        k.sc.tweens.add({
          targets: b,
          x: ltr ? W + 200 : -200,
          duration: 520,
          ease: 'Sine.InOut',
          onUpdate: () => {
            k.host.fx.trail(b.x, b.y, 0xe8edf2);
            for (const f of k.host.live()) {
              if (hit.has(f) || Math.abs(f.cx - b.x) > 90 || Math.abs(f.cy - y) > 130) continue;
              hit.add(f);
              k.host.hurt(f, 4, { knock: 500 });
              k.host.fx.glint(f.cx, f.cy, 4);
            }
          },
          onComplete: () => b.destroy(),
        });
      });
    });
  },

  // 24 · I Am Crust
  iAmCrust: (k) => {
    sfx('crust');
    k.host.quip(W / 2, 330, 'I AM CRUST!', '#7be04a', 64);
    const tree = k.sc.add.image(W / 2, TABLE_Y + 10, k.sc.textures.exists('h_tree') ? 'h_tree' : 'soft').setOrigin(0.5, 1).setScale(0, 0);
    k.host.layers.under.add(tree);
    k.sc.tweens.add({ targets: tree, scaleX: 1, scaleY: 1, duration: 600, ease: 'Back.Out' });
    const g = k.sc.add.graphics();
    k.host.layers.fx.add(g);
    const grabbed = k.front(6);
    for (const f of grabbed) {
      k.stun(f, 3);
      f.brain.rooted = 1;
    }
    timed(
      k,
      3.4,
      (_dt, t) => {
        g.clear();
        const grow = Math.min(1, t * 3);
        for (const [i, f] of grabbed.entries()) {
          if (!f.alive) continue;
          const sx = W / 2 + (i - 2.5) * 60;
          const sy = TABLE_Y - 40;
          const ex = sx + (f.cx - sx) * grow;
          const ey = sy + (f.cy - sy) * grow;
          for (const [w, c] of [[16, 0x2a1810], [9, 0x8a5a32]] as const) {
            g.lineStyle(w, c, 1);
            const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(sx, sy), new Phaser.Math.Vector2((sx + ex) / 2 + (i % 2 ? 80 : -80), (sy + ey) / 2), new Phaser.Math.Vector2(ex, ey));
            curve.draw(g, 16);
          }
        }
      },
      () => {
        g.destroy();
        for (const f of grabbed) f.brain.rooted = 0;
        k.sc.tweens.add({ targets: tree, alpha: 0, duration: 600, onComplete: () => tree.destroy() });
      },
    );
  },

  // 25 · Rocket Rucola
  bigGun: (k) => {
    sfx('biggun');
    const p = k.host.peelPos();
    const gun = k.img('h_biggun', p.x + 40, p.y - 40, 0.9);
    volley(k, 10, 0.09, (i) => {
      const q = k.host.peelPos();
      gun.setPosition(q.x + 40, q.y - 40).setAngle(i % 2 ? -8 : 4);
      k.host.throwAt(TH('rocket', 'explode', 3, { r: 150, splash: 1 }), k.random(1), ORANGE);
    });
    k.sc.time.delayedCall(1100, () => k.sc.tweens.add({ targets: gun, alpha: 0, duration: 250, onComplete: () => gun.destroy() }));
  },

  // 26 · Star-Lard
  awesomeMix: (k) => {
    let tape: Phaser.Sound.BaseSound | null = null;
    let scan: ReturnType<HeroKit['overlay']> | null = null;
    let beat = 0;
    let n = 0;
    k.transform({
      label: 'AWESOME MIX',
      sec: 12,
      color: ORANGE,
      sfx: 'sfx_hero_tapeclick',
      start: () => {
        scan = k.overlay({ kind: 'scanlines', color: 0xff9f1c, alpha: 1 }, 300);
        audio.duck(0.08, 300);
        if (k.sc.cache.audio.exists('music_tape')) {
          // the tape is mastered 3 LU under the stage music: lift it to match
          tape = k.sc.sound.add('music_tape', { volume: save.settings.music * 1.4 });
          tape.play();
        }
        k.host.quip(W / 2, 300, '♪ NOW PLAYING ♪', '#ff9f1c', 54);
      },
      tick: (dt, left) => {
        beat += dt;
        // every foot dances on the spot; bosses only every other bar
        for (const f of k.host.live()) {
          if (f.isBossLike && Math.floor(left / 2) % 2) continue;
          f.stunT = Math.max(f.stunT, 0.25);
        }
        if (beat < 0.5) return;
        beat = 0;
        n++;
        for (const f of k.host.live()) if (!f.isBossLike) k.sc.tweens.add({ targets: f, y: f.y - 26, duration: 110, yoyo: true, ease: 'Quad.Out' });
        const p = k.host.peelPos();
        k.host.fx.glint(p.x, p.y - 60, 2);
        const t = k.random(1);
        if (t.length) k.host.throwAt(TH('bolt', 'straight', 1.5), t, ORANGE);
        if (n % 4 === 0) k.host.quip(p.x + (Math.random() - 0.5) * 300, 220, '♪', '#ffd23f', 50);
      },
      end: () => {
        scan?.end(400);
        tape?.stop();
        tape?.destroy();
        audio.duck(1, 600);
      },
    });
  },

  // 27 · Captain Marvellous
  binaryMode: (k) => {
    let glow: Phaser.FX.Glow | undefined;
    k.transform({
      label: 'BINARY MODE',
      sec: 15,
      color: GOLD,
      shout: 'BINARY MODE!',
      sfx: 'sfx_hero_binary',
      start: () => {
        k.mods.dmg = 2;
        glow = k.host.peel().preFX?.addGlow(0xffd23f, 6, 0, false, 0.1, 14);
        k.onHit = (f) => {
          k.host.fx.explosion(f.cx, f.cy, 130);
          for (const o of k.host.live()) if (o !== f && Math.hypot(o.cx - f.cx, o.cy - f.cy) < 140) k.host.hurt(o, 0.5, { quiet: true });
          sfx('photon', 0.5);
        };
      },
      tick: () => {
        const p = k.host.peelPos();
        if (Math.random() < 0.5) k.host.fx.trail(p.x, p.y, GOLD);
      },
      end: () => {
        if (glow) k.host.peel().preFX?.remove(glow);
      },
    });
  },

  // 28 · Shazamozza
  shazamozza: (k) => {
    const p = k.host.peelPos();
    k.strike(p.x, p.y, 0xfff6a0);
    k.flashC(0xffffff, 200);
    k.transform({
      label: 'SHAZAMOZZA!',
      sec: 15,
      color: GOLD,
      shout: 'SHAZAMOZZA!',
      sfx: 'sfx_hero_shazamozza',
      start: () => {
        k.mods.dmg = 2;
        k.mods.size = 2;
        k.mods.reach = 1.6;
        k.syncPeel(400);
      },
      tick: () => {
        const q = k.host.peelPos();
        if (Math.random() < 0.08) k.host.fx.lightning(q.x - 40, q.y - 120, q.x + 20, q.y - 40);
      },
    });
  },

  // 29 · Cy-Pork
  boomTube: (k) => {
    sfx('boomtube');
    const px = W / 2;
    const py = 250;
    const g = k.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    k.host.layers.fx.add(g);
    const victims = k.front(3);
    timed(
      k,
      1.6,
      (_dt, t) => {
        g.clear();
        const open = Math.min(1, t * 3) * Math.min(1, (1.6 - t) * 3);
        for (let i = 0; i < 4; i++) {
          g.lineStyle(14 - i * 3, i % 2 ? 0x9ff0ff : 0xffffff, 0.8 * open);
          g.strokeEllipse(px, py, (220 - i * 26) * open, (130 - i * 16) * open);
        }
        for (let i = 0; i < 6; i++) {
          const a = t * 6 + (i / 6) * Math.PI * 2;
          g.lineStyle(4, 0x5fd8ff, 0.6 * open);
          g.lineBetween(px + Math.cos(a) * 60 * open, py + Math.sin(a) * 36 * open, px + Math.cos(a + 0.6) * 110 * open, py + Math.sin(a + 0.6) * 64 * open);
        }
      },
      () => g.destroy(),
    );
    for (const f of victims) {
      if (f.isBossLike) {
        k.sc.time.delayedCall(400, () => f.alive && k.host.hurt(f, 10, { knock: 400 }));
        continue;
      }
      if (f.puppet) continue;
      const size = f.sizeMul;
      f.puppet = true;
      k.sc.time.delayedCall(300, () => {
        if (!f.alive) return;
        k.sc.tweens.add({
          targets: f,
          x: px,
          y: py + 60,
          duration: 600,
          ease: 'Quad.In',
          onUpdate: () => f.setSize(Math.max(0.15, f.sizeMul - 0.03), 0),
          onComplete: () => {
            f.puppet = false;
            if (f.alive) k.host.kill(f);
            // a foot that gets back up (revive) comes back out of the portal at its own size
            if (f.alive) f.setSize(size);
          },
        });
      });
    }
  },

  // 30 · Robin Pizza
  sidekick: (k) => {
    // a little copy of your own peel
    const buddy = k.sc.add.image(0, 0, 'peel').setOrigin(0.5, 100 / 360).setScale(0.32).setAngle(-20);
    k.host.layers.cursor.add(buddy);
    const pos = { ...k.host.peelPos() };
    k.transform({
      label: 'SIDEKICK',
      sec: 20,
      color: GOLD,
      shout: 'SIDEKICK!',
      sfx: 'sfx_hero_sidekick',
      start: () => {
        k.onHit = (f) => {
          k.sc.time.delayedCall(120, () => {
            if (!f.alive) return;
            k.sc.tweens.add({ targets: buddy, angle: -60, duration: 60, yoyo: true });
            k.host.hurt(f, 0.5, { knock: 80 });
            k.host.fx.impact(f.cx + 20, f.cy, false);
          });
        };
      },
      tick: (dt) => {
        const p = k.host.peelPos();
        pos.x += (p.x - 90 - pos.x) * Math.min(1, dt * 6);
        pos.y += (p.y + 50 - pos.y) * Math.min(1, dt * 6);
        buddy.setPosition(pos.x, pos.y);
      },
      end: () => buddy.destroy(),
    });
  },

  // 31 · Cat-Toe-Woman
  heist: (k) => {
    let vig: ReturnType<HeroKit['overlay']> | null = null;
    k.transform({
      label: 'HEIST',
      sec: 20,
      color: PURPLE,
      shout: 'HEIST!',
      sfx: 'sfx_hero_heist',
      start: () => {
        k.st.heist = true;
        vig = k.overlay({ kind: 'tint', color: 0x6a3aa8, alpha: 0.16, blend: 'multiply' }, 300);
      },
      end: () => {
        k.st.heist = false;
        vig?.end(400);
      },
    });
  },

  // 32 · Martian Mozzarella
  shapeShift: (k) => {
    const own = save.peels.filter((id) => !id.startsWith('hero:') && id !== 'classic');
    const pick = own.length ? Phaser.Utils.Array.GetRandom(own) : 'classic';
    k.transform({
      label: 'SHAPE-SHIFT',
      sec: 20,
      color: GREEN,
      shout: 'SHAPE-SHIFT!',
      sfx: 'sfx_hero_shift',
      start: () => {
        const p = k.host.peelPos();
        k.host.fx.puff(p.x, p.y, 16);
        k.host.swapAbility(pick);
      },
      end: () => {
        const p = k.host.peelPos();
        k.host.fx.puff(p.x, p.y, 12);
        k.host.swapAbility(null);
      },
    });
  },

  // 33 · Green Pepper Arrow
  boxingArrow: (k) => {
    const f = k.front(1)[0];
    if (!f) return;
    sfx('arrow');
    k.host.throwAt(TH('arrow', 'straight', 0), [f], GREEN, (t) => {
      const glove = k.img('h_glove', t.cx, t.cy + 40, 0.2);
      k.sc.tweens.add({ targets: glove, scale: 0.8, y: t.cy, duration: 120, ease: 'Back.Out', onComplete: () => k.sc.tweens.add({ targets: glove, alpha: 0, delay: 300, duration: 200, onComplete: () => glove.destroy() }) });
      sfx('boxing');
      k.host.shake(200, 0.008);
      if (t.isBossLike || t.puppet) {
        k.host.hurt(t, 8, { knock: 1200 });
        return;
      }
      t.puppet = true;
      k.host.quip(t.x, t.cy - 140, 'OUT OF HERE!', '#7be04a', 40);
      k.sc.tweens.add({
        targets: t,
        y: -500,
        duration: 520,
        ease: 'Quad.Out',
        onComplete: () => {
          t.puppet = false;
          if (t.alive) k.host.kill(t);
        },
      });
      k.sc.tweens.add({ targets: t.root, angle: 540, duration: 520 });
    });
  },

  // 34 · Plastic Pan
  stretch: (k) => {
    k.transform({
      label: 'STRETCH',
      sec: 10,
      color: GOLD,
      shout: 'STRETCH!',
      sfx: 'sfx_hero_stretch',
      start: () => {
        k.mods.reach = 60;
        k.st.stretch = true;
        k.onHit = (f) => {
          const p = k.host.peelPos();
          const g = k.sc.add.graphics();
          k.host.layers.fx.add(g);
          for (const [w, c] of [[20, 0x2a1810], [13, 0xc8202a], [5, 0xffd23f]] as const) {
            g.lineStyle(w, c, 1);
            const mid = new Phaser.Math.Vector2((p.x + f.cx) / 2, Math.min(p.y, f.cy) - 80);
            new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(p.x, p.y), mid, new Phaser.Math.Vector2(f.cx, f.cy)).draw(g, 20);
          }
          k.sc.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
          sfx('boing', 0.4);
        };
      },
      end: () => {
        k.st.stretch = false;
      },
    });
  },

  // 35 · Hawkcrust
  dive: (k) => {
    const live = k.host.live();
    if (!live.length) return;
    // the busiest lane
    let best = live[0].cx;
    let most = 0;
    for (const f of live) {
      const n = live.filter((o) => Math.abs(o.cx - f.cx) < 140).length;
      if (n > most) {
        most = n;
        best = f.cx;
      }
    }
    sfx('dive');
    const peel = k.sc.add.image(best, -260, 'peel').setOrigin(0.5, 100 / 360).setScale(1.6).setAngle(180);
    k.host.layers.fx.add(peel);
    const hit = new Set<Foot>();
    k.sc.tweens.add({
      targets: peel,
      y: TABLE_Y - 60,
      duration: 380,
      ease: 'Quad.In',
      onUpdate: () => {
        k.host.fx.trail(peel.x, peel.y - 120, 0xffd23f);
        for (const f of k.host.live()) {
          if (hit.has(f) || Math.abs(f.cx - best) > 140 || f.cy > peel.y + 40) continue;
          hit.add(f);
          k.host.hurt(f, 8, { knock: 700 });
          k.host.fx.impact(f.cx, f.cy, true);
        }
      },
      onComplete: () => {
        k.host.shake(300, 0.012);
        k.host.fx.ring(best, TABLE_Y - 40, GOLD, 1.6, 0.4);
        k.sc.tweens.add({ targets: peel, alpha: 0, y: TABLE_Y - 120, duration: 300, onComplete: () => peel.destroy() });
      },
    });
  },

  // 36 · Blue Beetroot
  scarab: (k) => {
    let fire = 0;
    const shell = onPeel(k, (g, t) => {
      const pop = Math.min(1, t * 5);
      g.lineStyle(5, 0x2a1810, 1);
      for (const s of [-1, 1]) {
        g.fillStyle(0x2a5ad8, 1);
        g.beginPath();
        g.arc(0, -10, 96 * pop, s > 0 ? -1.4 : Math.PI + 1.4 - 1.6, s > 0 ? 0.2 : Math.PI + 1.4, false);
        g.lineTo(0, -10);
        g.closePath();
        g.fillPath();
        g.strokePath();
      }
      g.fillStyle(0x9ff0ff, 0.9);
      g.fillCircle(0, -70 * pop, 10);
    });
    k.transform({
      label: 'SCARAB ARMOUR',
      sec: 10,
      color: CYAN,
      shout: 'SCARAB!',
      sfx: 'sfx_hero_scarab',
      tick: (dt) => {
        shell.tick(dt);
        fire += dt;
        if (fire < 0.5) return;
        fire = 0;
        const f = k.random(1)[0];
        if (!f) return;
        const p = k.host.peelPos();
        k.beam(p.x, p.y - 30, f.cx, f.cy, 0x5fd8ff, 14, 200);
        k.host.hurt(f, 1.5, { knock: 200 });
        sfx('blast', 0.45);
      },
      end: () => shell.kill(),
    });
  },

  // 37 · Booster Gouda
  sponsored: (k) => {
    const spent = Math.min(50, k.host.coins());
    k.host.spend(spent);
    const x = Math.max(4, (12 * spent) / 50);
    sfx('sponsored');
    k.host.quip(W / 2, 320, spent >= 50 ? 'SPONSORED! −50 TIPS' : spent ? `SPONSORED! −${spent} TIPS` : 'SPONSOR PULLED OUT', '#ffd23f', 50);
    const p = k.host.peelPos();
    for (const f of k.host.live()) {
      k.beam(p.x, p.y - 20, f.cx, f.cy, GOLD, 22, 420);
      k.host.hurt(f, x, { knock: 400 });
      k.host.fx.glint(f.cx, f.cy, 5);
    }
    k.flashC(0xffd23f, 160);
  },

  // 38 · Static Cling
  overload: (k) => {
    k.transform({
      label: 'OVERLOAD',
      sec: 10,
      color: CYAN,
      shout: 'OVERLOAD!',
      sfx: 'sfx_hero_overload',
      start: () => {
        k.onHit = (f) => {
          const near = k.host
            .live()
            .filter((o) => o !== f)
            .sort((a, b) => Math.hypot(a.cx - f.cx, a.cy - f.cy) - Math.hypot(b.cx - f.cx, b.cy - f.cy))
            .slice(0, 3);
          for (const o of near) {
            k.host.fx.lightning(f.cx, f.cy, o.cx, o.cy);
            k.host.hurt(o, 1, { quiet: true });
            o.brain.zapped = 1;
          }
          if (near.length) audio.sfx('sfx_zap', { throttle: 60, volume: 0.6 });
        };
      },
      tick: () => {
        const p = k.host.peelPos();
        if (Math.random() < 0.25) k.host.fx.lightning(p.x + (Math.random() - 0.5) * 120, p.y - 60 - Math.random() * 60, p.x + (Math.random() - 0.5) * 60, p.y);
      },
    });
  },

  // 39 · Zatanna Panna
  backwards: (k) => {
    sfx('backwards');
    const t = k.sc.add.text(W / 2, 400, 'BACKWARDS!', { fontFamily: '"Lilita One", sans-serif', fontSize: '120px', color: '#e0c8ff', stroke: '#2a1810', strokeThickness: 18 }).setOrigin(0.5).setFlipX(true).setAlpha(0);
    k.host.layers.fx.add(t);
    k.sc.tweens.add({ targets: t, alpha: 1, scale: { from: 2, to: 1 }, duration: 220, ease: 'Back.Out' });
    k.sc.tweens.add({ targets: t, alpha: 0, delay: 1000, duration: 300, onComplete: () => t.destroy() });
    const tint = k.overlay({ kind: 'tint', color: 0x8a5ad8, alpha: 0.2, blend: 'add' }, 120);
    k.sc.time.delayedCall(700, () => tint.end(400));
    k.sc.tweens.add({ targets: k.host.peel(), angle: '+=360', duration: 500 });
    for (const f of k.host.live()) {
      k.host.fx.glint(f.cx, f.cy, 4);
      if (f.isBossLike) {
        f.knock(900);
        k.stun(f, 2);
        continue;
      }
      if (f.puppet) continue;
      f.puppet = true;
      k.sc.tweens.add({
        targets: f,
        y: HOVER_Y - 30,
        duration: 600,
        ease: 'Sine.Out',
        onComplete: () => {
          f.puppet = false;
          if (!f.alive) return;
          f.vy = 0;
          f.setState('hover');
          k.stun(f, 2);
        },
      });
    }
  },

  // 40 · Swamp Thin Crust
  bog: (k) => {
    sfx('bog');
    const g = k.sc.add.graphics();
    k.host.layers.under.add(g);
    let tickT = 0;
    timed(
      k,
      10,
      (dt, t) => {
        const a = Math.min(1, t * 2, (10 - t) * 2);
        g.clear();
        g.fillStyle(0x3a5a22, 0.75 * a);
        g.fillRect(0, TABLE_Y - 30, W, H - TABLE_Y + 30);
        g.fillStyle(0x5a7a2a, 0.6 * a);
        for (let x = 0; x < W; x += 60) g.fillEllipse(x + Math.sin(t * 2 + x) * 10, TABLE_Y - 26 + Math.sin(t * 3 + x * 0.1) * 5, 80, 22);
        if (Math.random() < dt * 12) k.host.fx.stinkPuff(Math.random() * W, TABLE_Y - 10);
        tickT += dt;
        if (tickT < 0.5) return;
        tickT = 0;
        for (const f of k.host.live()) {
          k.slow(f, 0.6, 0.7);
          k.host.hurt(f, 0.5, { quiet: true });
          if (f.y > TABLE_Y - 200) k.host.fx.stinkPuff(f.cx, f.y);
        }
      },
      () => g.destroy(),
    );
  },

  // 41 · Night Wings
  escrima: (k) => {
    k.transform({
      label: 'ESCRIMA',
      sec: 12,
      color: 0x3a8aff,
      shout: 'ESCRIMA!',
      sfx: 'sfx_hero_escrima',
      start: () => {
        k.onHit = (f) => {
          for (let i = 1; i <= 2; i++)
            k.sc.time.delayedCall(i * 90, () => {
              if (!f.alive) return;
              k.host.hurt(f, 0.7, { knock: 120 });
              k.host.fx.propBurst(f.cx + (i % 2 ? 30 : -30), f.cy - 20, 0x3a8aff, 0.6);
              sfx('stick', 0.45);
            });
        };
      },
    });
  },

  // 42 · Ghost Roaster
  penance: (k) => {
    const f = k.toughest(1)[0];
    if (!f) return;
    sfx('penance');
    const sliced = Number(f.brain.sliced ?? 0);
    const x = Math.min(40, sliced ? 10 * sliced : 4);
    const g = k.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    k.host.layers.fx.add(g);
    k.host.quip(f.x, f.cy - 160, sliced ? `${sliced} SLICE${sliced > 1 ? 'S' : ''} STOMPED` : 'PENANCE', '#ff9a2a', 40);
    timed(
      k,
      1,
      (_dt, t) => {
        g.clear();
        if (!f.alive) return;
        const p = k.host.peelPos();
        for (const s of [-1, 1]) {
          g.lineStyle(10 + t * 10, 0xff7a1a, 0.6);
          g.lineBetween(p.x + s * 12, p.y - 12, f.cx + s * 10, f.cy - 10);
          g.lineStyle(3, 0xfff0c0, 1);
          g.lineBetween(p.x + s * 12, p.y - 12, f.cx + s * 10, f.cy - 10);
        }
        if (Math.random() < 0.5) k.host.fx.burn(f.cx, f.cy);
        if (!f.isBossLike) f.stunT = Math.max(f.stunT, 0.2);
      },
      () => {
        g.destroy();
        if (!f.alive) return;
        k.host.hurt(f, x, { knock: 300 });
        k.burn(f, 1.5, 3);
        k.host.fx.explosion(f.cx, f.cy, 160);
        k.host.shake(250, 0.01);
      },
    );
  },

  // 43 · Moon Knife
  crescentStorm: (k) => {
    sfx('crescent');
    const p = k.host.peelPos();
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI + 0.12 + (i / 11) * (Math.PI - 0.24);
      const d = k.img('t_crescent', p.x, p.y - 20, 0.55);
      const hit = new Set<Foot>();
      const v = { x: Math.cos(a) * 1700, y: Math.sin(a) * 1700 };
      timed(
        k,
        1.4,
        (dt) => {
          d.x += v.x * dt;
          d.y += v.y * dt;
          d.angle += 900 * dt;
          if (Math.random() < 0.5) k.host.fx.propTrail(d.x, d.y, 0xd8f0ff, 0.4);
          for (const f of k.host.live()) {
            if (hit.has(f) || f.distanceTo(d.x, d.y) > 40) continue;
            hit.add(f);
            k.host.hurt(f, 2, { knock: 150 });
            k.host.fx.propBurst(f.cx, f.cy, 0xd8f0ff, 0.6);
          }
        },
        () => d.destroy(),
      );
    }
  },

  // 44 · She-Bulk
  objection: (k) => {
    sfx('objection');
    k.shout('OBJECTION!', 0x7be04a, 110);
    const gavel = k.img('h_gavel', W / 2 + 200, 120, 1).setAngle(-50);
    k.sc.tweens.add({
      targets: gavel,
      angle: 10,
      y: 200,
      duration: 260,
      ease: 'Back.In',
      onComplete: () => {
        k.host.shake(450, 0.016);
        k.host.rumble(1, 300);
        k.host.fx.ring(W / 2 + 160, 260, 0x7be04a, 3, 0.5);
        for (const f of k.host.live()) k.stun(f, 2, true);
        const t = k.toughest(1)[0];
        if (t) k.host.hurt(t, 10, { knock: 400 });
        k.sc.tweens.add({ targets: gavel, alpha: 0, delay: 500, duration: 300, onComplete: () => gavel.destroy() });
      },
    });
  },

  // 45 · Wasabi Wasp
  stingSwarm: (k) => {
    sfx('buzz');
    const live = k.host.live();
    if (!live.length) return;
    const order = Phaser.Utils.Array.Shuffle([...live]);
    const stops = Array.from({ length: 8 }, (_, i) => order[i % order.length]);
    const p = k.host.peelPos();
    const w = k.img('h_wasp', p.x, p.y, 0.5);
    const chain = stops.map((f) => ({ x: () => f.cx, y: () => f.cy, f }));
    let i = 0;
    const next = (): void => {
      if (i >= chain.length || !k.host.inWave()) {
        k.sc.tweens.add({ targets: w, alpha: 0, scale: 0.2, duration: 200, onComplete: () => w.destroy() });
        return;
      }
      const c = chain[i++];
      k.sc.tweens.add({
        targets: w,
        x: c.x(),
        y: c.y(),
        duration: 130,
        ease: 'Quad.InOut',
        onComplete: () => {
          if (c.f.alive) {
            k.host.hurt(c.f, 2, { knock: 120 });
            if (c.f.alive) k.stun(c.f, 0.6);
            k.host.fx.propBurst(c.f.cx, c.f.cy, 0x7be04a, 0.6);
          }
          next();
        },
      });
    };
    next();
  },

  // 46 · Gambeet
  aceHigh: (k) => {
    sfx('cards');
    volley(k, 15, 0.06, () => {
      const t = k.random(1);
      if (t.length) k.host.throwAt(TH('card', 'explode', 1.5, { r: 110, splash: 0.75 }), t, PINK);
    });
  },

  // 47 · Ice Cream Man
  iceSlide: (k) => {
    sfx('ice');
    const g = k.sc.add.graphics();
    k.host.layers.fx.add(g);
    let tickT = 0;
    timed(
      k,
      10,
      (dt, t) => {
        const a = Math.min(1, t * 3, (10 - t) * 2);
        g.clear();
        g.fillStyle(0xd8f6ff, 0.28 * a);
        g.fillRect(0, 200, W, 160);
        g.lineStyle(3, 0xffffff, 0.6 * a);
        g.lineBetween(0, 200, W, 200);
        g.lineBetween(0, 360, W, 360);
        for (let x = (t * 200) % 240; x < W; x += 240) g.lineBetween(x, 220, x + 80, 240);
        tickT += dt;
        if (tickT < 0.5) return;
        tickT = 0;
        for (const f of k.host.live()) {
          if ((f.state !== 'hover' && f.state !== 'enter') || f.isBossLike) continue;
          f.stateT = 0;
          k.sc.tweens.add({ targets: f, x: f.x + (Math.random() < 0.5 ? -50 : 50), duration: 220, yoyo: true, ease: 'Sine.InOut' });
          k.host.hurt(f, 0.5, { quiet: true });
          if (Math.random() < 0.4) k.host.fx.frost(f.cx, f.cy);
        }
      },
      () => g.destroy(),
    );
  },

  // 48 · Human Scorch
  flameOn: (k) => {
    const patches: { x: number; t: number }[] = [];
    k.transform({
      label: 'FIRED UP',
      sec: 15,
      color: ORANGE,
      shout: 'FIRED UP!',
      sfx: 'sfx_hero_firedup',
      start: () => {
        k.onHit = (f) => {
          k.burn(f, 2, 3);
          patches.push({ x: f.cx, t: 4 });
        };
      },
      tick: (dt) => {
        const p = k.host.peelPos();
        if (Math.random() < 0.7) k.host.fx.burn(p.x + (Math.random() - 0.5) * 50, p.y - 30);
        for (const pt of patches) {
          pt.t -= dt;
          if (Math.random() < dt * 14) k.host.fx.burn(pt.x + (Math.random() - 0.5) * 160, TABLE_Y + 60);
          for (const f of k.host.live()) if (Math.abs(f.cx - pt.x) < 110 && f.y > TABLE_Y - 120) k.burn(f, 1.5, 2);
        }
        for (let i = patches.length - 1; i >= 0; i--) if (patches[i].t <= 0) patches.splice(i, 1);
      },
    });
  },

  // 49 · Mr Elastic Cheese
  stretchSmack: (k) => {
    sfx('elastic');
    const feet = [...k.host.live()].sort((a, b) => a.cx - b.cx);
    const g = k.sc.add.graphics();
    k.host.layers.fx.add(g);
    feet.forEach((f, i) => {
      for (const n of [0, 1])
        k.sc.time.delayedCall(i * 110 + n * 60, () => {
          if (!f.alive) return;
          const p = k.host.peelPos();
          g.clear();
          for (const [w, c] of [[22, 0x2a1810], [14, 0x2a4ab8], [6, 0x5fa8ff]] as const) {
            g.lineStyle(w, c, 1);
            new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(p.x, p.y), new Phaser.Math.Vector2((p.x + f.cx) / 2, Math.min(p.y, f.cy) - 120), new Phaser.Math.Vector2(f.cx, f.cy)).draw(g, 20);
          }
          k.host.hurt(f, 5, { knock: 300 });
          k.host.fx.impact(f.cx, f.cy, n === 1);
          audio.slap(0.8);
        });
    });
    k.sc.time.delayedCall(feet.length * 110 + 200, () => g.destroy());
  },

  // 50 · Squirrel Gourmet
  nutParade: (k) => {
    sfx('squirrels');
    for (let i = 0; i < 20; i++) {
      k.sc.time.delayedCall(i * 90, () => {
        if (!k.host.inWave()) return;
        const f = k.random(1)[0];
        const s = k.img('h_squirrel', -80, TABLE_Y - 10, 0.5);
        const tx = f ? f.cx : W + 100;
        k.sc.tweens.add({
          targets: s,
          x: tx,
          duration: 300 + Math.abs(tx) * 0.35,
          ease: 'Linear',
          onUpdate: () => (s.y = TABLE_Y - 10 - Math.abs(Math.sin(s.x * 0.05)) * 18),
          onComplete: () => {
            if (!f || !f.alive) {
              k.sc.tweens.add({ targets: s, x: W + 120, duration: 600, onComplete: () => s.destroy() });
              return;
            }
            k.sc.tweens.add({
              targets: s,
              y: f.cy,
              duration: 220,
              ease: 'Quad.Out',
              onComplete: () => {
                if (f.alive) {
                  k.host.hurt(f, 1, { knock: 60, quiet: true });
                  k.host.fx.puff(f.cx, f.cy, 4);
                }
                k.sc.tweens.add({ targets: s, y: H + 100, x: s.x + 120, duration: 500, ease: 'Quad.In', onComplete: () => s.destroy() });
              },
            });
          },
        });
      });
    }
  },
});

// ——— Bulk: no button. Lose 3 slices in a wave and the peel turns green. ———
function bulkUp(k: HeroKit): void {
  k.transform({
    label: 'GREEN RAGE',
    sec: 15,
    color: 0x7be04a,
    shout: 'GREEN RAGE!',
    sfx: 'sfx_hero_bulk',
    start: () => {
      k.mods.dmg = 2;
      k.mods.size = 2;
      k.mods.reach = 1.5;
      k.host.peel().setTint(0x7be04a);
      k.syncPeel(400);
      k.onHit = (f) => {
        k.host.fx.ring(f.cx, f.cy + 20, 0x7be04a, 1.2, 0.4);
        k.host.shake(90, 0.005);
        for (const o of k.host.live()) if (o !== f && Math.hypot(o.cx - f.cx, o.cy - f.cy) < 220) k.host.hurt(o, 0.5, { knock: 300, quiet: true });
      };
    },
    end: () => k.host.peel().clearTint(),
  });
}

// ——— passives ———
const gadgetEl = () => document.querySelector<HTMLElement>('.hud .hero-gadget');

registerPassives({
  'hero:superpeel': { peelImmune: true },

  'hero:batpeel': {
    waveStart: (k) => {
      const g = Phaser.Utils.Array.GetRandom(['smoke', 'grapple', 'gel']);
      k.wv.gadget = ['smoke', 'grapple', 'gel'].indexOf(g);
      k.wv.used = false;
      k.wv.gelT = 0;
      gadgetEl()?.remove();
      const el = document.createElement('div');
      el.className = 'hero-gadget';
      el.textContent = { smoke: '💨 Smoke pellet', grapple: '🪝 Grapple', gel: '💥 Gel charge' }[g]!;
      document.querySelector('.hud')?.append(el);
    },
    waveClear: () => gadgetEl()?.remove(),
    tick: (k, dt) => {
      if (k.wv.used || k.wv.gadget === undefined) return;
      const use = (label: string) => {
        k.wv.used = true;
        gadgetEl()?.classList.add('used');
        const p = k.host.peelPos();
        k.host.quip(p.x, p.y - 110, label, '#ffd23f', 34);
        sfx('gadget', 0.7);
      };
      const live = k.host.live();
      if (k.wv.gadget === 0) {
        const diving = live.filter((f) => f.state === 'descend' && f.y > 480);
        if (diving.length < 2) return;
        use('SMOKE PELLET!');
        for (const f of diving) {
          k.host.fx.puff(f.cx, f.cy, 14);
          k.stun(f, 2);
        }
      } else if (k.wv.gadget === 1) {
        const f = live.find((o) => o.state === 'descend' && !o.isBossLike && o.y > o.stompY - 140);
        if (!f) return;
        use('GRAPPLE!');
        const p = k.host.peelPos();
        k.beam(p.x, p.y, f.cx, f.cy, 0x3a3d4c, 8, 300);
        f.knock(1500);
      } else {
        k.wv.gelT = Number(k.wv.gelT) + dt;
        const t = k.toughest(1)[0];
        if (Number(k.wv.gelT) < 4 || !t) return;
        use('GEL CHARGE!');
        const blob = k.img('glow', t.cx, t.cy, 0.25).setTint(0x7dff9a).setBlendMode(Phaser.BlendModes.ADD);
        timed(
          k,
          1.5,
          () => blob.setPosition(t.cx, t.cy),
          () => {
            blob.destroy();
            if (!t.alive) return;
            k.host.fx.explosion(t.cx, t.cy, 160);
            audio.sfx('sfx_explosion', { volume: 0.7 });
            k.host.hurt(t, 6, { knock: 700 });
          },
        );
      }
    },
  },

  'hero:wonderwedge': {
    stomp: (k, f) => {
      if (f.brain.lassoStomp) {
        f.brain.lassoStomp = 0;
        k.host.quip(f.x, f.cy - 120, 'ROPED!', '#ffd23f', 40);
        f.knock(700);
        return true;
      }
      if (!f.isBossLike && Math.random() < 0.15) {
        k.host.quip(f.x, f.cy - 120, 'PING!', '#ffe680', 38);
        sfx('ping', 0.7);
        f.knock(600);
        return true;
      }
      return false;
    },
  },

  'hero:flashfoot': {
    tick: (k, dt) => {
      k.st.blur = Number(k.st.blur ?? 0) + dt;
      if (Number(k.st.blur) < 4) return;
      const feet = k.front(3);
      if (!feet.length) return;
      k.st.blur = 0;
      const p = k.host.peelPos();
      for (const f of feet) {
        k.beam(p.x, p.y, f.cx, f.cy, GOLD, 10, 160);
        k.host.hurt(f, 1.5, { knock: 200 });
      }
      sfx('blur', 0.5);
    },
  },

  'hero:aquatoe': { keepFresh: (k) => k.host.location() === 'pier' || k.host.location() === 'beach' },

  'hero:greenlampshade': {
    lost: (k, n) => {
      k.wv.lost = Number(k.wv.lost ?? 0) + n;
    },
    waveClear: (k) => {
      k.st.oath = k.wv.lost ? 0 : Math.min(5, Number(k.st.oath ?? 0) + 1);
    },
    meterMult: (k) => 1 + 0.1 * Number(k.st.oath ?? 0),
  },

  'hero:spiderpan': {
    tick: (k) => {
      let g = k.st.senseG as unknown as Phaser.GameObjects.Graphics | undefined;
      if (!g || !g.active) {
        g = k.sc.add.graphics();
        k.host.layers.fx.add(g);
        (k.st as Record<string, unknown>).senseG = g;
      }
      g.clear();
      const t = k.host.now();
      for (const f of k.host.live()) {
        if (f.state !== 'descend') continue;
        const eta = (f.stompY - f.y) / Math.max(60, f.vy);
        if (eta > 0.5) continue;
        // the tingle: wavy lines over the foot
        g.lineStyle(4, 0xff3a2a, 0.9);
        for (const s of [-1, 0, 1]) {
          g.beginPath();
          const x0 = f.cx + s * 40;
          const y0 = f.cy - f.meta.footHeight * f.scale * 0.6 - 30;
          for (let i = 0; i <= 4; i++) g.lineTo(x0 + Math.sin(t * 40 + i) * 6, y0 - i * 10);
          g.strokePath();
        }
      }
    },
    waveClear: (k) => {
      (k.st.senseG as unknown as Phaser.GameObjects.Graphics | undefined)?.clear();
    },
  },

  'hero:ironpan': {
    tick: (k) => {
      for (const f of k.host.live()) f.hitOnce = true;
    },
  },

  'hero:captainpizzeria': {
    dmgMult: (k) => (k.host.pizzas().some((p) => !p.dead && p.slices === 1) ? 1.3 : 1),
  },

  'hero:incrediblebulk': {
    lost: (k, n) => {
      k.wv.lost = Number(k.wv.lost ?? 0) + n;
      if (Number(k.wv.lost) >= 3 && !k.wv.raged && k.host.inWave()) {
        k.wv.raged = true;
        bulkUp(k);
      }
    },
  },

  'hero:blackwindow': {
    hit: (k, f) => {
      if (!f.brain.ledger || !f.alive) return;
      f.brain.ledger = 0;
      k.stun(f, 2);
      k.host.quip(f.x, f.cy - 120, 'LEDGER CLOSED', '#ff4a3a', 30);
    },
  },

  'hero:stormyweather': {
    waveStart: (k) => {
      if (!OUTDOOR.has(k.host.location() ?? '')) return;
      k.overlay({ kind: 'rain', alpha: 0.28 }, 1200);
    },
    tick: (k) => {
      if (!OUTDOOR.has(k.host.location() ?? '')) return;
      for (const f of k.host.live()) k.slow(f, 0.1, 0.3);
    },
  },

  'hero:blackpanther': {
    hit: (k) => {
      k.wv.hits = Number(k.wv.hits ?? 0) + 1;
    },
    blocked: (k, _f, shield) => {
      if (!shield) return;
      k.host.setMeter(Math.min(1, k.host.meter() + 0.2));
      const p = k.host.peelPos();
      k.host.fx.ring(p.x, p.y, PURPLE, 0.6, 1);
    },
  },

  'hero:strangeloaf': {
    tick: (k) => record(k),
    waveStart: (k) => history.set(k, []),
    destroyed: (k, p) => {
      if (k.wv.mystic) return false;
      k.wv.mystic = true;
      k.host.revive(p, 1);
      k.host.fx.ring(p.x, p.surfaceY - 30, 0x7dff9a, 2.4, 0.45);
      k.host.quip(p.x, p.surfaceY - 170, 'MYSTIC SHIELD!', '#7dff9a', 42);
      sfx('mystic', 0.8);
      return true;
    },
  },

  'hero:scarletpitch': {
    kill: (k, f) => {
      if (f.brain.goldHex) k.host.tips(Math.max(1, f.type.coins * 4), f.cx, f.cy);
    },
  },

  'hero:antpan': {
    tick: (k, dt) => {
      k.st.ray = Number(k.st.ray ?? 0) + dt;
      if (Number(k.st.ray) < 7) return;
      const feet = k.random(3).filter((f) => !f.isBossLike);
      if (!feet.length) return;
      k.st.ray = 0;
      const p = k.host.peelPos();
      sfx('shrink', 0.6);
      for (const f of feet) {
        k.beam(p.x, p.y, f.cx, f.cy, 0xff6a5a, 8, 200);
        const size = f.sizeMul;
        f.setSize(size * 0.6);
        k.mark(f, 2, 5);
        k.sc.time.delayedCall(5000, () => f.alive && f.setSize(size));
      }
    },
  },

  'hero:daredough': {
    fearless: true,
    tick: (k) => {
      for (const f of k.host.feet()) if (f.alive && f.type.traits.includes('invisible')) f.reveal(0.3);
    },
  },

  'hero:deadpeel': {
    destroyed: (k, p) => {
      const q = (k.st.regen as unknown as Pizza[] | undefined) ?? [];
      q.push(p);
      (k.st as Record<string, unknown>).regen = q;
      return false;
    },
    waveStart: (k) => {
      const q = (k.st.regen as unknown as Pizza[] | undefined) ?? [];
      for (const p of q) {
        // a pizza swapped out in the shop isn't on the table any more
        if (!p.dead || !k.host.pizzas().includes(p)) continue;
        k.host.revive(p, 2);
        k.host.quip(p.x, p.surfaceY - 160, 'BACK FROM THE DEAD!', '#ff4a5a', 38);
      }
      (k.st as Record<string, unknown>).regen = [];
    },
  },

  'hero:silverslicer': {
    waveClear: (k) => {
      const names = k.host.peekWave(k.host.wave() + 1);
      if (!names.length) return;
      const counts = new Map<string, number>();
      for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
      const list = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, c]) => (c > 1 ? `${c}× ${n}` : n));
      k.host.toast(null, 'HERALD · NEXT WAVE', list.join(', '));
    },
  },

  'hero:rocketrucola': {
    kill: (k, f) => k.host.tips(1, f.cx, f.cy),
  },

  'hero:cattoewoman': {
    kill: (k, f) => {
      if (!k.st.heist) return;
      k.host.tips(3, f.cx, f.cy);
      // golden feet twice as often: an extra golden-touch roll at the same odds
      if (!f.isBossLike && Math.random() < Math.max(0.05, k.host.stats().goldenTouch)) {
        k.host.tips(Math.max(1, f.type.coins * 4), f.cx, f.cy);
        k.host.quip(f.x, f.cy - 150, 'GOLDEN HEIST!', '#ffd23f', 36);
      }
    },
    slices: (k, p, n) => {
      const used = Number(k.st.lives ?? 0);
      if (n <= 0 || used >= 9) return n;
      k.st.lives = used + 1;
      k.host.quip(p.x, p.surfaceY - 180, `NINE LIVES: ${8 - used} LEFT`, '#c9a8ff', 32);
      return n - 1;
    },
  },

  'hero:martianmozzarella': { ignoreShields: true },

  'hero:boostergouda': {
    waveStart: (k) => {
      const cards = k.host.peekShop();
      if (cards.length) k.host.toast(null, 'FROM THE FUTURE · NEXT SHOP', cards.join(', '));
    },
  },

  'hero:ghostroaster': {
    tick: (k, dt) => {
      k.st.chain = Number(k.st.chain ?? 0) + dt;
      if (Number(k.st.chain) < 6) return;
      const feet = k.random(3);
      if (!feet.length) return;
      k.st.chain = 0;
      const p = k.host.peelPos();
      sfx('chain', 0.6);
      for (const f of feet) {
        k.beam(p.x, p.y, f.cx, f.cy, 0xff7a1a, 10, 260);
        k.host.hurt(f, 1.5, { knock: 200 });
        k.burn(f, 1, 2);
      }
    },
  },

  'hero:moonknife': {
    dmgMult: (k) => (NIGHT.has(k.host.backdrop() ?? '') ? 2 : 1),
  },

  'hero:gambeet': { rerollDiscount: 1 },

  'hero:squirrelgourmet': {
    dmgMult: () => 1 + Math.min(0.2, 0.01 * save.bossesBeaten.length),
  },
});

/** The scene's side of the heroes: one per run. */
export class HeroDirector {
  readonly k: HeroKit;
  private passive: Passive | null = null;

  constructor(host: HeroHost) {
    this.k = new HeroKit(host);
  }

  /** The hero (or any peel) this run plays with. */
  setPeel(id: string, color: number): void {
    this.k.peelId = id;
    this.k.color = color;
    this.k.st = {};
    this.passive = PASSIVES[id] ?? null;
  }

  fire(id: string, ctx: MoveCtx): void {
    const m = MOVES[id];
    if (!m || !this.k.host.inWave()) return;
    m(this.k, ctx);
  }

  update(dt: number): void {
    if (this.k.host.inWave()) this.passive?.tick?.(this.k, dt);
    this.k.update(dt);
  }

  waveStart(): void {
    this.k.wv = {};
    this.passive?.waveStart?.(this.k);
  }

  waveClear(): void {
    this.passive?.waveClear?.(this.k);
    this.k.clear();
  }

  /** The run is over or the scene is going: stop everything now. */
  shutdown(): void {
    this.k.clear(true);
    document.querySelector('.hud .hero-gadget')?.remove();
  }

  // ——— hooks the scene calls ———
  hit(f: Foot, x: number, y: number): void {
    this.k.onHit?.(f, x, y);
    this.passive?.hit?.(this.k, f, x, y);
  }

  kill(f: Foot): void {
    this.passive?.kill?.(this.k, f);
  }

  /** A foot is about to stomp: true stops it. */
  stomp(f: Foot, p: Pizza): boolean {
    return !!this.passive?.stomp?.(this.k, f, p);
  }

  blocked(f: Foot, shield: boolean): void {
    this.passive?.blocked?.(this.k, f, shield);
  }

  slices(p: Pizza, n: number): number {
    return this.passive?.slices ? this.passive.slices(this.k, p, n) : n;
  }

  /** Slices a foot took (Ghost Roaster's stare remembers them). */
  stomped(f: Foot | null, n: number): void {
    if (f && n > 0) f.brain.sliced = Number(f.brain.sliced ?? 0) + n;
    if (n > 0) this.passive?.lost?.(this.k, n);
  }

  destroyed(p: Pizza): boolean {
    return !!this.passive?.destroyed?.(this.k, p);
  }

  dmgMult(f: Foot, source: DmgSource): number {
    const m = this.passive?.dmgMult?.(this.k, f, source) ?? 1;
    return m * (source === 'smack' ? this.k.mods.dmg : 1);
  }

  critAlways(): boolean {
    return this.k.mods.crit;
  }

  worldScale(): number {
    return this.k.mods.world;
  }

  peelSize(): number {
    return this.k.mods.size;
  }

  reachMult(): number {
    return this.k.mods.reach;
  }

  /** Stretch: a smack only ever takes the nearest foot. */
  smackHits<T>(hits: T[]): T[] {
    return this.k.st.stretch ? hits.slice(0, 1) : hits;
  }

  meterMult(): number {
    if (this.k.transforming) return 0;
    return this.passive?.meterMult?.(this.k) ?? 1;
  }

  peelImmune(): boolean {
    return !!this.passive?.peelImmune;
  }

  ignoreShields(): boolean {
    return !!this.passive?.ignoreShields;
  }

  fearless(): boolean {
    return !!this.passive?.fearless;
  }

  keepFresh(): boolean {
    return !!this.passive?.keepFresh?.(this.k);
  }

  rerollDiscount(): number {
    return this.passive?.rerollDiscount ?? 0;
  }
}
