// The god peels' signature moves and passives (src/content/peels/gods.ts), plus the God Peel's, built on the
// hero kit (src/game/heroKit.ts). Registered by move id and peel id, like the heroes in heroMoves.ts.
//
// Every god passive goes through godPassives(), which adds two shared rules to its damage:
// - King of the Gods: wearing Zeus's look over another god peel gives it +10% damage.
// - Home ground: a Greek god deals +10% in the Labyrinth and Tartarus (Act 9). Act 9 scales an ability's
//   generic effects; the gods' moves are hand-built, so their bonus lives here.
//
// The Kratos Peel is the showpiece: a 30 s rage (Spartan Rage) with a flaming head, an ember stream, a fire
// ribbon trail, fire rings where smacks land and a flame countdown bar; and the Spinning Blade passive, chained
// blades that orbit the peel (one more each new act of the run, up to 5) and catch fire in the rage.

import Phaser from 'phaser';
import { H, HOVER_Y, TABLE_Y, W } from '../config';
import { actOf } from '../data/stages';
import { UPGRADES } from '../data/upgrades';
import { audio } from '../systems/audio';
import { save } from '../systems/save';
import type { ThrowFx } from './abilities';
import { GREEK_HOME, HOME_GROUND_BONUS } from './acts/act9';
import type { Foot } from './Foot';
import { HeroKit, registerMoves, registerPassives, type Passive } from './heroKit';
import { NIGHT } from './heroMoves';
import { GOD_PEEL, PEEL_BY_ID } from './peels';
import type { Pizza } from './Pizza';
import { cpick, crand } from '../systems/cosmeticRandom';

const FIRE = 0xff6a1a;
const GOLD = 0xffd23f;
const sfx = (key: string, volume = 1) => audio.sfx(`sfx_hero_${key}`, { volume, throttle: 60 });
const TH = (prop: ThrowFx['prop'], how: ThrowFx['how'], x: number, more: Partial<ThrowFx> = {}): ThrowFx => ({ e: 'throw', prop, how, x, at: { to: 'random', n: 1 }, ...more });
const hexS = (c: number) => '#' + c.toString(16).padStart(6, '0');

/** Something that ticks for `sec` seconds then cleans up (stops early if the wave ends). */
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


/** A god's name slammed onto the screen (the move's moment), in its colour. */
function title(k: HeroKit, text: string, color: number, size = 104): void {
  k.shout(text, color, size);
}

const alive = (k: HeroKit) => k.host.pizzas().filter((p) => !p.dead);
const now = (k: HeroKit) => k.host.now();
/** A per-wave timer: is this move still running? */
const on = (k: HeroKit, key: string) => Number(k.wv[key] ?? 0) > now(k);
const until = (k: HeroKit, key: string, sec: number) => (k.wv[key] = now(k) + sec);

/** Float a foot back up to the top (bosses are knocked back instead). */
function toTop(k: HeroKit, f: Foot, stun = 0, ms = 600): void {
  if (f.isBossLike) {
    f.knock(900);
    if (stun) k.stun(f, stun);
    return;
  }
  if (f.puppet) return;
  f.puppet = true;
  k.sc.tweens.add({
    targets: f,
    y: HOVER_Y - 30,
    duration: ms,
    ease: 'Sine.Out',
    onComplete: () => {
      f.puppet = false;
      if (!f.alive) return;
      f.vy = 0;
      f.setState('hover');
      if (stun) k.stun(f, stun);
    },
  });
}

/** A pizza's fresh-and-full restore (Hearth, Golden Apples). */
function restore(k: HeroKit, p: Pizza, slices = 99, fresh = true): void {
  k.host.heal(p, slices);
  if (fresh && p.freshOn) p.setFresh(p.maxFresh);
  k.host.fx.healBurst(p.x, p.surfaceY);
}

const weakest = (k: HeroKit) => [...alive(k)].sort((a, b) => a.slices / a.maxSlices - b.slices / b.maxSlices)[0];

// ——— shared rules for every god ———
const isGreek = (id: string) => PEEL_BY_ID[id]?.pantheon === 'greek';
const isGod = (id: string) => !!PEEL_BY_ID[id]?.pantheon;

/** King of the Gods and home ground, on top of a god's own damage rule. */
function godPassives(list: Record<string, Passive>): Record<string, Passive> {
  const out: Record<string, Passive> = {};
  for (const [id, p] of Object.entries(list)) {
    out[id] = {
      ...p,
      dmgMult: (k, f, source) => {
        let m = p.dmgMult?.(k, f, source) ?? 1;
        if (id !== 'hero:zeus' && save.skin === 'hero:zeus' && isGod(id)) m *= 1.1;
        if (isGreek(id) && GREEK_HOME.includes(k.host.location() as (typeof GREEK_HOME)[number])) m *= 1 + HOME_GROUND_BONUS;
        return m;
      },
    };
  }
  return out;
}

// ——— the Kratos Peel ———

/** The flaming head, hot glow, heat shimmer, ember stream and fire-ribbon trail, drawn every frame while the rage lasts. */
function flames(k: HeroKit): { tick: (dt: number, left: number) => void; kill: () => void } {
  // back to front: the fire ribbon (a normal-blended body with an additive hot core), a hot orange glow
  // (normal blend: an additive wash turns white and vanishes on bright backdrops), the flame tongues
  // (cartoon-solid, outlined), the peel, then a white-hot rim and the heat shimmer over it
  const ribbonBody = k.sc.add.graphics();
  const ribbon = k.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  const glow = k.sc.add.graphics();
  const head = k.sc.add.graphics();
  const rim = k.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  const haze = k.sc.add.graphics();
  const L = k.host.layers.cursor;
  const peelObj = k.host.peel() as unknown as Phaser.GameObjects.GameObject;
  L.add([ribbonBody, ribbon, glow, head, rim, haze]);
  L.sendToBack(ribbon);
  L.sendToBack(ribbonBody);
  L.moveBelow(glow as unknown as Phaser.GameObjects.GameObject, peelObj);
  L.moveBelow(head as unknown as Phaser.GameObjects.GameObject, peelObj);
  const trail: { x: number; y: number; t: number }[] = [];
  // loose flame licks that break off the top of the fire and rise away (in the peel's turned frame)
  const licks: { a: number; d: number; t: number; life: number; size: number }[] = [];
  let t = 0;
  return {
    tick: (dt, left) => {
      t += dt;
      const p = k.host.peelPos();
      const peel = k.host.peel();
      const s = peel.scale / 0.62;
      // the last 3 seconds gutter
      const life = left < 3 ? 0.35 + 0.45 * Math.abs(Math.sin(t * 22)) * (left / 3) + 0.2 : 1;
      head.clear();
      rim.clear();
      glow.clear();
      haze.clear();
      head.setPosition(p.x, p.y).setRotation(peel.rotation).setScale(s);
      rim.setPosition(p.x, p.y).setRotation(peel.rotation).setScale(s);
      // flames lick upwards whatever way the peel leans (in the peel's own turned frame)
      const up = -Math.PI / 2 - peel.rotation;
      const ux = Math.cos(up);
      const uy = Math.sin(up);

      // the hot glow: stacked soft discs, pushed up a little where the flames rise, breathing with the fire
      const pulse = (0.85 + 0.15 * Math.sin(t * 9) + 0.08 * Math.sin(t * 23)) * life;
      glow.setPosition(p.x, p.y - 18 * s).setScale(s);
      for (const [r, c, a] of [[180, 0xff4a10, 0.1], [148, 0xff5a14, 0.13], [120, 0xff7a1a, 0.17], [96, 0xff9a2a, 0.2], [74, 0xffc040, 0.24]] as const) {
        glow.fillStyle(c, a * pulse);
        glow.fillCircle(0, 0, r);
      }

      // a flame tongue: a curved, tapering lick from the helm's edge, swaying more towards its tip
      const tongue = (bx: number, by: number, dx: number, dy: number, l: number, w: number, sway: number, col: number, outline: boolean) => {
        const nx = -dy;
        const ny = dx;
        const left: [number, number][] = [];
        const right: [number, number][] = [];
        for (const u of [0, 0.3, 0.55, 0.78, 1]) {
          const off = sway * u * u;
          const cx = bx + dx * l * u + nx * off;
          const cy = by + dy * l * u + ny * off;
          const hw = (w / 2) * Math.pow(1 - u, 0.85);
          left.push([cx - nx * hw, cy - ny * hw]);
          right.push([cx + nx * hw, cy + ny * hw]);
        }
        const pts = [...left, ...right.reverse().slice(1)];
        head.fillStyle(col, 1);
        head.beginPath();
        head.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) head.lineTo(pts[i][0], pts[i][1]);
        head.closePath();
        if (outline) {
          head.lineStyle(5, 0x2a1810, 0.9);
          head.strokePath();
        }
        head.fillPath();
      };
      const layer = (rad: number, n: number, len: number, col: number, speed: number, outline: boolean, spin: number) => {
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2 + spin + Math.sin(t * 0.7 + i) * 0.12;
          const cx = Math.cos(ang);
          const cy = Math.sin(ang);
          // the whole helm burns: tall on the upper side, still a good lick underneath
          const lean = Math.max(0, cx * ux + cy * uy);
          // two beats of flicker so no two tongues pulse together
          const flick = 0.72 + 0.28 * Math.sin(t * speed + i * 1.7) + 0.14 * Math.sin(t * speed * 2.3 + i * 3.1);
          const l = len * (0.42 + 0.58 * lean) * flick * life;
          // each tongue leaves the helm outwards and bends up
          let dx = ux * 0.7 + cx * 0.55;
          let dy = uy * 0.7 + cy * 0.55;
          const m = Math.hypot(dx, dy) || 1;
          dx /= m;
          dy /= m;
          const w = ((Math.PI * 2 * rad) / n) * 0.78;
          tongue(cx * rad, cy * rad, dx, dy, l, w, Math.sin(t * 7 + i * 2.1) * l * 0.22, col, outline);
        }
      };
      // red outer tongues (outlined, the game's style), the orange body and a yellow core
      layer(50, 14, 175, 0xd8261a, 7, true, 0);
      layer(48, 13, 128, 0xff7a1a, 9, false, 0.2);
      layer(44, 11, 78, 0xffd23f, 12, false, 0.45);
      // loose licks break off the top and rise away
      if (crand() < 14 * dt * life) licks.push({ a: (crand() - 0.5) * 1.6, d: 0, t: 0, life: 0.28 + crand() * 0.2, size: 14 + crand() * 12 });
      for (let i = licks.length - 1; i >= 0; i--) {
        const q = licks[i];
        q.t += dt;
        q.d += dt * 420;
        if (q.t > q.life) {
          licks.splice(i, 1);
          continue;
        }
        const f = 1 - q.t / q.life;
        const base = 120 * life + q.d;
        const ax = ux * Math.cos(q.a) - uy * Math.sin(q.a);
        const ay = ux * Math.sin(q.a) + uy * Math.cos(q.a);
        tongue(ax * base, ay * base, ux, uy, q.size * 2.2 * f, q.size * f, Math.sin(t * 9 + i) * 6, f > 0.5 ? 0xff7a1a : 0xd8261a, true);
      }
      // the white-hot rim hugging the helm
      rim.lineStyle(7, 0xfff4d0, 0.75 * life);
      rim.strokeCircle(0, 0, 47);
      rim.lineStyle(16, 0xff9a3a, 0.35 * life);
      rim.strokeCircle(0, 0, 56);

      // heat shimmer: wavy lines of hot air wobbling up off the flames
      for (let j = 0; j < 4; j++) {
        const ph = (t * 0.9 + j / 4) % 1;
        const x0 = p.x + (j - 1.5) * 34 * s;
        const y0 = p.y - (120 + ph * 90) * s;
        haze.lineStyle(4 * s, 0xfff2d0, 0.38 * Math.sin(ph * Math.PI) * life);
        haze.beginPath();
        for (let q = 0; q <= 8; q++) {
          const yy = y0 - q * 9 * s;
          const xx = x0 + Math.sin(t * 10 + q * 0.9 + j * 1.3) * 7 * s;
          if (q) haze.lineTo(xx, yy);
          else haze.moveTo(xx, yy);
        }
        haze.strokePath();
      }

      // embers stream off it as you move
      if (crand() < 0.95 * life) k.host.fx.burn(p.x + (crand() - 0.5) * 80 * s, p.y - 60 * s);
      if (crand() < 0.5 * life) k.host.fx.burn(p.x + (crand() - 0.5) * 50 * s, p.y - 110 * s);
      const last = trail[trail.length - 1];
      const moved = last ? Math.hypot(p.x - last.x, p.y - last.y) : 99;
      // a jump (a teleport, the peel snapping back) starts a new ribbon rather than drawing a long straight bar
      if (moved > 320) trail.length = 0;
      if (moved > 6) trail.push({ x: p.x, y: p.y, t: 0 });
      if (moved > 14 && moved <= 320 && crand() < 0.9) k.host.fx.trail(p.x, p.y, FIRE);
      if (moved > 14 && moved <= 320 && crand() < 0.6) k.host.fx.burn(p.x, p.y);
      // the fire ribbon: a tapering band along the peel's recent path, with a dark-red edge that reads on
      // bright backdrops and a white-hot core
      for (const q of trail) q.t += dt;
      while (trail.length && (trail[0].t > 0.5 || trail.length > 34)) trail.shift();
      ribbonBody.clear();
      ribbon.clear();
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1];
        const b = trail[i];
        const u = i / trail.length;
        for (const [w, c, al] of [[62, 0xa8160c, 0.5], [44, 0xe8381a, 0.65], [28, 0xff8a1a, 0.75]] as const) {
          ribbonBody.lineStyle(w * u * life, c, al * u);
          ribbonBody.lineBetween(a.x, a.y, b.x, b.y);
        }
        for (const [w, c, al] of [[20, 0xffb040, 0.6], [9, 0xfff0c0, 0.85]] as const) {
          ribbon.lineStyle(w * u * life, c, al * u);
          ribbon.lineBetween(a.x, a.y, b.x, b.y);
        }
      }
    },
    kill: () => {
      for (const g of [ribbonBody, ribbon, glow, head, rim, haze]) g.destroy();
    },
  };
}

/** A ring of fire on the table where an enraged smack lands, and a burst of embers off the blow. */
function fireRing(k: HeroKit, x: number, y: number): void {
  const g = k.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  k.host.layers.fx.add(g);
  const o = { r: 30, a: 1 };
  k.sc.tweens.add({
    targets: o,
    r: 160,
    a: 0,
    duration: 520,
    ease: 'Quad.Out',
    onUpdate: () => {
      g.clear();
      for (const [w, c, al] of [[26, 0xd8201a, 0.4], [14, 0xff8a1a, 0.7], [5, 0xfff0c0, 0.9]] as const) {
        g.lineStyle(w * o.a + 2, c, al * o.a);
        g.strokeEllipse(x, y, o.r * 2, o.r * 0.9);
      }
    },
    onComplete: () => g.destroy(),
  });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    k.host.fx.burn(x + Math.cos(a) * 90, y + Math.sin(a) * 40);
  }
  // the ember burst: chunky outlined sparks thrown up and out, falling back as they cool from yellow to red
  const e = k.sc.add.graphics();
  k.host.layers.fx.add(e);
  const sparks = Array.from({ length: 26 }, () => {
    const a = -Math.PI / 2 + (crand() - 0.5) * 2.6;
    const v = 380 + crand() * 560;
    return { vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 9 + crand() * 8 };
  });
  const st = { p: 0 };
  k.sc.tweens.add({
    targets: st,
    p: 1,
    duration: 700,
    onUpdate: () => {
      e.clear();
      const sec = st.p * 0.7;
      for (const q of sparks) {
        const px = x + q.vx * sec;
        const py = y + q.vy * sec + 0.5 * 1500 * sec * sec;
        const r = q.r * (1 - st.p * 0.75);
        const col = st.p < 0.3 ? 0xfff0a0 : st.p < 0.6 ? 0xffa030 : 0xe8381a;
        // a stretched diamond along its flight, outlined like the rest of the game
        const ang = Math.atan2(q.vy + 1500 * sec, q.vx);
        const cx = Math.cos(ang);
        const cy = Math.sin(ang);
        e.fillStyle(col, 1 - st.p * 0.5);
        e.lineStyle(2.5, 0x2a1810, 0.85 * (1 - st.p * 0.5));
        e.beginPath();
        e.moveTo(px + cx * r * 2, py + cy * r * 2);
        e.lineTo(px - cy * r * 0.8, py + cx * r * 0.8);
        e.lineTo(px - cx * r * 1.2, py - cy * r * 1.2);
        e.lineTo(px + cy * r * 0.8, py - cx * r * 0.8);
        e.closePath();
        e.fillPath();
        e.strokePath();
      }
    },
    onComplete: () => e.destroy(),
  });
}

/** The Spinning Blade: chained blades orbiting the peel. */
function blades(k: HeroKit, dt: number): void {
  const n = Math.min(5, Number(k.st.blades ?? 1));
  let g = k.st.bladeG as unknown as Phaser.GameObjects.Graphics | undefined;
  if (!g || !g.active) {
    g = k.sc.add.graphics();
    k.host.layers.cursor.add(g);
    (k.st as Record<string, unknown>).bladeG = g;
  }
  // the chains meet under the peel's handle, so they're drawn on their own layer behind the peel
  let cg = k.st.chainG as unknown as Phaser.GameObjects.Graphics | undefined;
  if (!cg || !cg.active) {
    cg = k.sc.add.graphics();
    k.host.layers.cursor.add(cg);
    (k.st as Record<string, unknown>).chainG = cg;
  }
  const peelObj = k.host.peel() as unknown as Phaser.GameObjects.GameObject;
  if (peelObj && k.host.layers.cursor.exists(peelObj)) k.host.layers.cursor.moveBelow(cg as unknown as Phaser.GameObjects.GameObject, peelObj);
  const raging = !!k.st.breaker;
  // one turn every 1.2 s; twice as fast in the rage
  const spin = ((Math.PI * 2) / 1.2) * (raging ? 2 : 1);
  const ang = (k.st.bladeA = Number(k.st.bladeA ?? 0) + spin * dt);
  const p = k.host.peelPos();
  const R = 120;
  g.clear();
  cg.clear();
  const lastHit = bladeHits(k);
  for (let i = 0; i < n; i++) {
    const a = ang + (i / n) * Math.PI * 2;
    const bx = p.x + Math.cos(a) * R;
    const by = p.y + Math.sin(a) * R;
    // the chain: links from the peel out to the blade
    cg.lineStyle(5, 0x2a1810, 0.7);
    cg.lineBetween(p.x, p.y, bx, by);
    for (let j = 1; j < 7; j++) {
      const u = j / 7;
      cg.fillStyle(raging ? 0xff9a3a : 0x9aa3ad, 1);
      cg.fillEllipse(p.x + (bx - p.x) * u, p.y + (by - p.y) * u, 9, 6);
    }
    // the blade: a curved, back-swept blade facing the way it spins
    const tang = a + Math.PI / 2;
    const pts: [number, number][] = [[0, -6], [44, -18], [54, -4], [30, 10], [0, 8]];
    const rot = (x: number, y: number) => [bx + Math.cos(tang) * x - Math.sin(tang) * y, by + Math.sin(tang) * x + Math.cos(tang) * y] as const;
    if (raging) {
      g.fillStyle(0xff6a1a, 0.45);
      g.fillCircle(bx + Math.cos(tang) * 24, by + Math.sin(tang) * 24, 34);
    }
    g.fillStyle(raging ? 0xffb050 : 0xd8dde4, 1);
    g.lineStyle(4, 0x2a1810, 1);
    g.beginPath();
    pts.forEach(([x, y], j) => {
      const [rx, ry] = rot(x, y);
      if (j) g!.lineTo(rx, ry);
      else g!.moveTo(rx, ry);
    });
    g.closePath();
    g.fillPath();
    g.strokePath();
    // the glint along its edge
    const [gx0, gy0] = rot(8, -6);
    const [gx1, gy1] = rot(42, -14);
    g.lineStyle(3, 0xffffff, 0.5 + 0.5 * Math.sin(ang * 3 + i));
    g.lineBetween(gx0, gy0, gx1, gy1);
    // a bronze hub where the chain ties on
    g.fillStyle(0xc9873a, 1);
    g.fillCircle(bx, by, 9);
    g.lineStyle(3, 0x2a1810, 1);
    g.strokeCircle(bx, by, 9);
    if (raging && crand() < 0.5) k.host.fx.burn(bx, by);
    else if (crand() < 0.05) k.host.fx.glint(bx, by);
    // it hits every foot it passes through, at most once per foot every 0.5 s
    if (!k.host.inWave()) continue;
    for (const f of k.host.live()) {
      if (f.distanceTo(bx + Math.cos(tang) * 24, by + Math.sin(tang) * 24) > 46) continue;
      const t0 = lastHit.get(f) ?? -9;
      if (now(k) - t0 < 0.5) continue;
      lastHit.set(f, now(k));
      k.host.hurt(f, 1, { knock: 90, quiet: false });
      if (raging) k.burn(f, 1, 2);
      k.host.fx.propBurst(bx, by, raging ? FIRE : 0xd8dde4, 0.5);
      sfx('blade', 0.5);
    }
  }
}
const bladeMap = new WeakMap<HeroKit, WeakMap<Foot, number>>();
function bladeHits(k: HeroKit): WeakMap<Foot, number> {
  let m = bladeMap.get(k);
  if (!m) bladeMap.set(k, (m = new WeakMap()));
  return m;
}

// ——— the moves ———
registerMoves({
  // ——— the Kratos Peel ———
  spartaaa: (k) => {
    let fx: ReturnType<typeof flames> | null = null;
    let loop: Phaser.Sound.BaseSound | null = null;
    // the shout: the text slams on, the camera shakes, the music ducks
    audio.duck(0.25, 200);
    k.sc.time.delayedCall(2200, () => audio.duck(0.7, 800));
    k.flashC(0xff6a1a, 220);
    k.host.shake(700, 0.016);
    k.host.rumble(1, 600);
    const t = k.sc.add
      .text(W / 2, 420, 'SPARTAN RAGE!', { fontFamily: '"Lilita One", sans-serif', fontSize: '132px', color: '#ffb040', stroke: '#2a1810', strokeThickness: 20 })
      .setOrigin(0.5)
      .setScale(3)
      .setAlpha(0)
      .setAngle(-5);
    t.setShadow(0, 0, '#ff3a1a', 40, true, true);
    k.host.layers.fx.add(t);
    k.sc.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 200, ease: 'Back.Out' });
    k.sc.tweens.add({ targets: t, scale: 1.08, duration: 90, yoyo: true, repeat: 6, delay: 220 });
    k.sc.tweens.add({ targets: t, alpha: 0, y: 360, scale: 1.4, delay: 1500, duration: 420, onComplete: () => t.destroy() });
    k.transform({
      label: 'ENRAGED',
      sec: 30,
      color: FIRE,
      sfx: 'sfx_hero_spartanrage',
      endSfx: 'sfx_hero_ragehiss',
      start: () => {
        k.mods.dmg = 2;
        k.st.breaker = true;
        fx = flames(k);
        [...document.querySelectorAll('.hud .hero-bar:not(.out)')].pop()?.classList.add('flame');
        k.sc.time.delayedCall(900, () => {
          if (!k.running || k.running.label !== 'ENRAGED' || !k.sc.cache.audio.exists('sfx_hero_rage')) return;
          loop = k.sc.sound.add('sfx_hero_rage', { loop: true, volume: save.settings.sfx * save.settings.master * 0.55 });
          loop.play();
        });
        k.onHit = (f, x, y) => {
          // every enraged smack: the aimed foot took the boosted hit; the ones round it take a normal one
          fireRing(k, x, Math.max(y, f.cy));
          sfx('flamesmack', 0.8);
          k.burn(f, 1.5, 3);
          if (f.alive) f.knock(600);
          for (const o of k.host.live()) {
            if (o === f || o.distanceTo(x, y) > 160) continue;
            k.host.hurt(o, 1, { knock: 600, quiet: true });
            if (o.alive) k.burn(o, 1.5, 3);
          }
          k.host.shake(90, 0.005);
        };
      },
      tick: (dt, left) => fx?.tick(dt, left),
      end: () => {
        k.st.breaker = false;
        fx?.kill();
        loop?.stop();
        loop?.destroy();
        if (!k.quietEnd) {
          const p = k.host.peelPos();
          // the flames die out in a puff of smoke
          k.host.fx.puff(p.x, p.y - 20, 22);
          k.host.fx.puff(p.x, p.y - 60, 12);
        }
      },
    });
  },

  // ——— Greek gods ———
  wrathOlympus: (k) => {
    sfx('zeus');
    title(k, 'WRATH OF OLYMPUS!', 0x9fd8ff, 96);
    const sky = k.overlay({ kind: 'tint', color: 0x2a3a6a, alpha: 0.4, blend: 'multiply' }, 250);
    // the sky splits: a jagged white crack across the top
    const crack = k.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    k.host.layers.fx.add(crack);
    const pts: [number, number][] = [];
    for (let x = -20; x <= W + 20; x += 60) pts.push([x, 70 + (crand() - 0.5) * 50]);
    for (const [w, c, a] of [[26, 0x9fd8ff, 0.35], [8, 0xe8f6ff, 0.9]] as const) {
      crack.lineStyle(w, c, a);
      crack.beginPath();
      pts.forEach(([x, y], i) => (i ? crack.lineTo(x, y) : crack.moveTo(x, y)));
      crack.strokePath();
    }
    let beat = 0;
    const struck = new Set<Foot>();
    timed(
      k,
      3,
      (dt) => {
        beat -= dt;
        if (beat > 0) return;
        beat = 0.22;
        // a few bolts each beat, until every foot has been struck (then they keep coming)
        const pool = k.host.live();
        const fresh = pool.filter((f) => !struck.has(f));
        const pick = Phaser.Utils.Array.Shuffle(fresh.length ? fresh : pool).slice(0, 3);
        for (const f of pick) {
          struck.add(f);
          k.strike(f.cx, f.cy, 0xd8f0ff);
          k.host.hurt(f, 6, { knock: 260 });
          k.host.runFx([{ e: 'chain', x: 2, jumps: 2, at: { to: 'hit' } }], { foot: f, x: f.cx, y: f.cy }, 0x9fd8ff);
        }
        if (pick.length) {
          k.flashC(0xffffff, 70);
          k.host.shake(110, 0.006);
          audio.sfx('sfx_hero_thunder', { volume: 0.5, throttle: 120 });
        }
      },
      () => {
        sky.end(500);
        k.sc.tweens.add({ targets: crack, alpha: 0, duration: 500, onComplete: () => crack.destroy() });
      },
    );
  },

  queensDecree: (k) => {
    sfx('decree');
    title(k, 'QUEEN’S DECREE!', 0x5fd0c0, 96);
    until(k, 'decree', 15);
    const crowns: [Pizza, Phaser.GameObjects.Image][] = [];
    for (const p of alive(k)) {
      p.flags.heraFirst = true;
      const c = k.img('g_crown', p.x, p.surfaceY - 160, 0.1);
      k.sc.tweens.add({ targets: c, scale: 0.62, duration: 380, ease: 'Back.Out' });
      crowns.push([p, c]);
      k.host.fx.glint(p.x, p.surfaceY - 60, 6);
    }
    timed(
      k,
      15,
      (_dt, t) => {
        for (const [p, c] of crowns) {
          c.setPosition(p.x, p.surfaceY - 150 + Math.sin(t * 3 + p.x) * 6).setVisible(!p.dead);
          // a used crown dims: the pizza is still crowned (Jealous Eye), but its turn-back is spent
          c.setAlpha(p.flags.heraFirst ? 1 : 0.55);
        }
      },
      () => {
        for (const [p, c] of crowns) {
          p.flags.heraFirst = false;
          k.sc.tweens.add({ targets: c, alpha: 0, y: c.y - 40, duration: 300, onComplete: () => c.destroy() });
        }
      },
    );
  },

  earthshaker: (k) => {
    sfx('earthshaker');
    title(k, 'EARTHSHAKER!', 0x3ab0e0, 104);
    const p0 = k.host.peelPos();
    const tri = k.img('g_trident', p0.x, -120, 0.9).setAngle(0);
    k.sc.tweens.add({
      targets: tri,
      y: TABLE_Y - 60,
      duration: 260,
      ease: 'Quad.In',
      onComplete: () => {
        k.host.shake(400, 0.014);
        k.host.rumble(1, 300);
        k.host.fx.ring(tri.x, TABLE_Y, 0x5fd8ff, 1.6, 0.4);
        k.sc.tweens.add({ targets: tri, alpha: 0, delay: 500, duration: 300, onComplete: () => tri.destroy() });
        // a wall of water sweeps across from the trident's side
        const ltr = tri.x < W / 2;
        const g = k.sc.add.graphics();
        k.host.layers.fx.add(g);
        const hit = new Set<Foot>();
        let x = ltr ? -200 : W + 200;
        const dir = ltr ? 1 : -1;
        timed(
          k,
          1.3,
          (dt, t) => {
            const prevX = x;
            x += dir * (W + 400) * (dt / 1.3);
            g.clear();
            const top = H * 0.18 + Math.sin(t * 6) * 20;
            // the wave: deep blue body, a lighter face and white foam on the crest, curling forwards
            for (const [off, col, a] of [[0, 0x1f6aa8, 0.85], [-40 * dir, 0x3ab0e0, 0.7], [-70 * dir, 0x9fe8ff, 0.5]] as const) {
              g.fillStyle(col, a);
              g.beginPath();
              g.moveTo(x + off - dir * 260, H);
              g.lineTo(x + off - dir * 260, top + 120);
              g.lineTo(x + off - dir * 120, top + 20);
              g.lineTo(x + off, top);
              g.lineTo(x + off + dir * 60, top + 50);
              g.lineTo(x + off + dir * 30, top + 90);
              g.lineTo(x + off + dir * 50, H);
              g.closePath();
              g.fillPath();
            }
            g.lineStyle(5, 0x2a1810, 0.6);
            g.beginPath();
            g.moveTo(x - dir * 260, top + 120);
            g.lineTo(x - dir * 120, top + 20);
            g.lineTo(x, top);
            g.lineTo(x + dir * 60, top + 50);
            g.strokePath();
            for (let i = 0; i < 5; i++) k.host.fx.splat(x + (crand() - 0.5) * 80, top + crand() * 60);
            // everything the wave's face swept this frame (between where it was and where it is now, and the foot's
            // width): checking only ±90 px of the face each frame let feet slip through on a long frame or as they moved
            const lo = Math.min(prevX, x) - 140;
            const hi = Math.max(prevX, x) + 140;
            for (const f of k.host.live()) {
              if (hit.has(f) || f.cx < lo || f.cx > hi) continue;
              hit.add(f);
              k.host.hurt(f, 7, { knock: 1200 });
              if (f.alive) k.slow(f, 0.5, 4);
            }
          },
          () => {
            g.destroy();
            // the wave has crossed the whole table: anything still standing it hasn't touched (a foot that dodged
            // sideways through it, or came down from above as it passed) is caught in its wash
            for (const f of k.host.live()) {
              if (hit.has(f)) continue;
              hit.add(f);
              k.host.hurt(f, 7, { knock: 1200 });
              if (f.alive) k.slow(f, 0.5, 4);
            }
          },
        );
      },
    });
  },

  harvest: (k) => {
    sfx('harvest');
    title(k, 'HARVEST!', 0xe8c040, 110);
    const pz = alive(k).sort((a, b) => a.x - b.x);
    // wheat bursts up between (and either side of) the pizzas
    const spots = [pz[0] ? pz[0].x - pz[0].radius - 40 : 200, ...pz.slice(1).map((p, i) => (p.x + pz[i].x) / 2), pz.length ? pz[pz.length - 1].x + pz[pz.length - 1].radius + 40 : W - 200];
    for (const x of spots) {
      for (let j = 0; j < 3; j++) {
        const w = k.img('g_wheat', x + (j - 1) * 26, TABLE_Y + 80, 0.6).setOrigin(0.5, 1).setScale(0.6, 0.05).setAngle((j - 1) * 10);
        k.sc.tweens.add({ targets: w, scaleY: 0.6 + crand() * 0.15, duration: 380, delay: j * 70, ease: 'Back.Out' });
        k.sc.tweens.add({ targets: w, angle: w.angle + 6, duration: 600, yoyo: true, repeat: 2, ease: 'Sine.InOut' });
        k.sc.tweens.add({ targets: w, alpha: 0, delay: 2400, duration: 500, onComplete: () => w.destroy() });
      }
    }
    for (const p of pz) restore(k, p, 2, true);
  },

  aegis: (k) => {
    sfx('aegis');
    title(k, 'AEGIS!', 0x8aa8ff, 120);
    until(k, 'aegis', 8);
    const dome = k.sc.add.graphics();
    k.host.layers.fx.add(dome);
    const owl = k.img('g_owl', W / 2, TABLE_Y - 170, 0.1).setAlpha(0.9);
    k.sc.tweens.add({ targets: owl, scale: 0.9, duration: 420, ease: 'Back.Out' });
    timed(
      k,
      8,
      (_dt, t) => {
        dome.clear();
        const a = Math.min(1, t * 3) * (t > 7 ? Math.max(0, 8 - t) : 1) * (t > 6 ? 0.6 + 0.4 * Math.abs(Math.sin(t * 12)) : 1);
        const cy = TABLE_Y + 60;
        dome.fillStyle(0x8aa8ff, 0.16 * a);
        dome.fillEllipse(W / 2, cy, W * 1.05, 560);
        for (const [w, c, al] of [[18, 0x8aa8ff, 0.3], [6, 0xe8eeff, 0.85]] as const) {
          dome.lineStyle(w, c, al * a);
          dome.beginPath();
          dome.arc(W / 2, cy + 600, 1120, Math.PI * 1.18, Math.PI * 1.82);
          dome.strokePath();
        }
        // hex shimmer across the shield
        dome.lineStyle(2, 0xe8eeff, 0.25 * a);
        for (let i = 0; i < 9; i++) {
          const x = 220 + i * 185 + Math.sin(t * 2 + i) * 10;
          dome.strokeCircle(x, cy - 180 + Math.sin(i * 1.3) * 40, 40);
        }
        owl.setAlpha(0.85 * a);
      },
      () => {
        dome.destroy();
        owl.destroy();
      },
    );
  },

  sunChariot: (k) => {
    sfx('chariot');
    title(k, 'SUN CHARIOT!', 0xffb020, 104);
    const ltr = Math.random() < 0.5;
    const c = k.img('g_chariot', ltr ? -300 : W + 300, 190, 0.95).setFlipX(!ltr);
    const glow = k.img('glow', c.x, c.y, 1.6).setTint(0xffb020).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.7);
    const sky = k.overlay({ kind: 'tint', color: 0xffb020, alpha: 0.18, blend: 'add' }, 300);
    const hit = new Set<Foot>();
    timed(
      k,
      2.4,
      (_dt, t) => {
        const u = t / 2.4;
        c.x = ltr ? -300 + (W + 600) * u : W + 300 - (W + 600) * u;
        c.y = 190 + Math.sin(t * 9) * 8;
        glow.setPosition(c.x, c.y);
        for (let i = 0; i < 3; i++) k.host.fx.burn(c.x + (ltr ? -1 : 1) * (80 + crand() * 160), c.y + 30 + (crand() - 0.5) * 60);
        // the sun's heat rains down in a band below it
        for (const f of k.host.live()) {
          if (hit.has(f) || Math.abs(f.cx - c.x) > 110) continue;
          hit.add(f);
          k.burn(f, 2, 4);
          k.host.fx.burn(f.cx, f.cy);
          k.host.fx.burn(f.cx, f.cy - 40);
          k.host.hurt(f, 0.5, { knock: 120, quiet: true });
        }
      },
      () => {
        c.destroy();
        glow.destroy();
        sky.end(400);
      },
    );
  },

  huntersMoon: (k) => {
    sfx('moon');
    title(k, 'HUNTER’S MOON!', 0xd8e4f0, 100);
    until(k, 'moon', 12);
    const moon = k.img('glow', W - 260, 150, 0.2).setTint(0xd8e4f0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.45); // a soft halo: full strength washed out the moon's face
    // the moon in the game's style: outlined, softly shaded from a top-left light, with craters and a sheen
    const disc = k.sc.add.graphics();
    k.host.layers.under.add(disc);
    for (const [r, c] of [[72, 0xb8c6d6], [66, 0xcdd8e4], [58, 0xdde6ef], [46, 0xeaf0f6]] as const) {
      disc.fillStyle(c, 1);
      disc.fillCircle(-(72 - r) * 0.5, -(72 - r) * 0.5, r);
    }
    for (const [cx, cy, r] of [[-22, 14, 15], [24, -18, 10], [18, 30, 8], [-30, -26, 6], [36, 10, 5]] as const) {
      disc.fillStyle(0xb4c2d2, 1);
      disc.fillCircle(cx, cy, r);
      disc.fillStyle(0x9eadc0, 1);
      disc.fillCircle(cx + r * 0.2, cy + r * 0.2, r * 0.7);
      disc.lineStyle(2.5, 0x2a1810, 0.35);
      disc.strokeCircle(cx, cy, r);
    }
    disc.fillStyle(0xffffff, 0.55);
    disc.fillEllipse(-30, -38, 34, 16);
    disc.lineStyle(7, 0x2a1810, 1);
    disc.strokeCircle(0, 0, 72);
    disc.setPosition(W - 260, 240).setAlpha(0);
    const tint = k.overlay({ kind: 'tint', color: 0x3a4a7a, alpha: 0.25, blend: 'multiply' }, 400);
    const ring = k.img('glow', 0, 0, 0.6).setTint(0xd8e4f0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    timed(
      k,
      12,
      (_dt, t) => {
        const rise = Math.min(1, t * 1.5);
        moon.setScale(1.6 * rise).setY(240 - 90 * rise);
        disc.setY(240 - 90 * rise).setAlpha(rise);
        // the prey: a silver ring round the toughest foot
        const f = k.toughest(1)[0];
        if (f) ring.setPosition(f.cx, f.cy).setScale(0.55 + Math.sin(t * 6) * 0.05).setAlpha(0.7);
        else ring.setAlpha(0);
      },
      () => {
        moon.destroy();
        disc.destroy();
        ring.destroy();
        tint.end(500);
      },
    );
  },

  warCry: (k) => {
    sfx('warcry');
    const p = k.host.peelPos();
    const hornImg = k.img('g_horn', p.x, p.y - 140, 0.1);
    k.sc.tweens.add({ targets: hornImg, scale: 0.8, duration: 260, ease: 'Back.Out' });
    k.sc.tweens.add({ targets: hornImg, alpha: 0, delay: 1300, duration: 300, onComplete: () => hornImg.destroy() });
    k.transform({
      label: 'WAR',
      sec: 15,
      color: 0xe0402a,
      shout: 'WAR CRY!',
      start: () => {
        k.mods.dmg = 1.5;
        until(k, 'war', 15);
        for (const q of alive(k)) k.host.fx.ring(q.x, q.surfaceY, 0xe0402a, 1, 0.4);
      },
      tick: () => {
        const q = k.host.peelPos();
        if (crand() < 0.3) k.host.fx.trail(q.x, q.y, 0xe0402a);
        // the pizzas bare their teeth: a red glint now and then
        if (crand() < 0.05) {
          const z = cpick(alive(k));
          if (z) k.host.fx.glint(z.x + (crand() - 0.5) * z.radius, z.surfaceY - 20);
        }
      },
      end: () => (k.wv.war = 0),
    });
  },

  charm: (k) => {
    sfx('charm');
    title(k, 'CHARMED!', 0xff7ab8, 110);
    const pink = k.overlay({ kind: 'tint', color: 0xff7ab8, alpha: 0.14, blend: 'add' }, 200);
    const hearts: [Foot, Phaser.GameObjects.Image][] = [];
    for (const f of k.host.live()) {
      const h = k.img('g_heart', f.cx, f.cy - 140, 0.1);
      k.sc.tweens.add({ targets: h, scale: 0.5, duration: 300, ease: 'Back.Out' });
      hearts.push([f, h]);
      f.brain.charmed = 1;
      if (f.isBossLike) k.slow(f, 0.5, 6);
    }
    timed(
      k,
      6,
      (dt, t) => {
        for (const [f, h] of hearts) {
          h.setPosition(f.cx + Math.sin(t * 4 + f.x) * 10, f.cy - 150 + Math.sin(t * 3) * 8).setVisible(f.alive);
          if (!f.alive || f.isBossLike || f.puppet) continue;
          // smitten: they drift dreamily back up the screen
          k.stun(f, 0.2);
          f.y = Math.max(HOVER_Y - 30, f.y - 110 * dt);
          f.x += Math.sin(t * 2 + f.cx) * 30 * dt;
          if (crand() < dt * 2) k.host.fx.glint(f.cx, f.cy - 60);
        }
      },
      () => {
        pink.end(400);
        for (const [f, h] of hearts) {
          f.brain.charmed = 0;
          if (f.alive && !f.isBossLike && (f.state === 'descend' || f.state === 'hover')) f.setState('hover');
          k.sc.tweens.add({ targets: h, alpha: 0, y: h.y - 60, duration: 400, onComplete: () => h.destroy() });
        }
      },
    );
  },

  forge: (k) => {
    sfx('forge');
    const p0 = k.host.peelPos();
    const ax = Phaser.Math.Clamp(p0.x, 200, W - 200);
    const anvil = k.img('g_anvil', ax, -150, 0.8);
    k.sc.tweens.add({
      targets: anvil,
      y: TABLE_Y + 10,
      duration: 320,
      ease: 'Quad.In',
      onComplete: () => {
        k.host.shake(260, 0.012);
        k.host.fx.puff(ax, TABLE_Y + 50, 14);
        k.host.fx.ring(ax, TABLE_Y + 50, 0xff8a2a, 1.2, 0.4);
      },
    });
    k.transform({
      label: 'FORGE',
      sec: 20,
      color: 0xff8a2a,
      shout: 'FORGE!',
      start: () => {
        k.onHit = () => {
          // the anvil rings: sparks fly off it at two feet
          k.sc.tweens.add({ targets: anvil, scaleY: 0.72, duration: 60, yoyo: true });
          sfx('spark', 0.6);
          for (let i = 0; i < 6; i++) k.host.fx.trail(anvil.x + (crand() - 0.5) * 60, anvil.y - 40, 0xff9a2a);
          const pick = k.random(2);
          for (const f of pick) {
            k.beam(anvil.x, anvil.y - 40, f.cx, f.cy, 0xff9a2a, 8, 180);
            k.host.hurt(f, 1, { knock: 150, quiet: true });
            k.host.fx.burn(f.cx, f.cy);
          }
        };
      },
      tick: () => {
        if (crand() < 0.15) k.host.fx.burn(anvil.x + (crand() - 0.5) * 70, anvil.y - 30);
      },
      end: () => k.sc.tweens.add({ targets: anvil, alpha: 0, y: anvil.y + 40, duration: 400, onComplete: () => anvil.destroy() }),
    });
  },

  messenger: (k) => {
    const ghost = k.sc.add.image(0, 0, 'peel').setOrigin(0.5, 100 / 360).setScale(0.5).setAlpha(0);
    k.host.layers.fx.add(ghost);
    const wings = k.img('g_wings', 0, 0, 0.35).setAlpha(0);
    let gap = 0;
    k.transform({
      label: 'MESSENGER',
      sec: 10,
      color: 0x7be0a0,
      shout: 'MESSENGER!',
      sfx: 'sfx_hero_messenger',
      tick: (dt) => {
        gap -= dt;
        if (gap > 0) return;
        gap = 0.26;
        const live = k.host.live();
        if (!live.length) return;
        // in turn: the foot it smacked longest ago
        const f = live.sort((a, b) => Number(a.brain.hermesT ?? 0) - Number(b.brain.hermesT ?? 0))[0];
        f.brain.hermesT = now(k);
        const from = { x: ghost.alpha ? ghost.x : k.host.peelPos().x, y: ghost.alpha ? ghost.y : k.host.peelPos().y };
        k.beam(from.x, from.y, f.cx, f.cy, 0x7be0a0, 10, 160);
        ghost.setPosition(f.cx + 40, f.cy - 30).setAlpha(0.9).setAngle(-60);
        wings.setPosition(f.cx + 40, f.cy - 50).setAlpha(0.95);
        k.sc.tweens.add({ targets: ghost, angle: -20, duration: 140, ease: 'Back.Out' });
        k.host.hurt(f, 1.5, { knock: 200 });
        k.host.fx.glint(f.cx, f.cy, 3);
        sfx('dart', 0.5);
      },
      end: () => {
        ghost.destroy();
        wings.destroy();
      },
    });
  },

  revel: (k) => {
    sfx('revel');
    title(k, 'REVEL!', 0x9a4ad0, 120);
    until(k, 'revel', 10);
    const tint = k.overlay({ kind: 'tint', color: 0x9a4ad0, alpha: 0.14, blend: 'add' }, 300);
    k.host.fx.party(W / 2, 300, 80);
    timed(
      k,
      10,
      (dt, t) => {
        for (const f of k.host.live()) {
          k.slow(f, 0.5, 0.2);
          // they stagger about like they've had one too many
          if (!f.isBossLike && !f.puppet) f.x += Math.sin(t * 3 + f.cy * 0.01) * 70 * dt;
        }
        if (crand() < dt * 3) k.host.fx.party(crand() * W, 120, 8);
      },
      () => tint.end(400),
    );
  },

  hearth: (k) => {
    sfx('hearth');
    title(k, 'HEARTH!', 0xff9a3a, 120);
    const warm = k.overlay({ kind: 'tint', color: 0xff9a3a, alpha: 0.2, blend: 'add' }, 400);
    k.sc.time.delayedCall(1400, () => warm.end(800));
    for (const p of alive(k)) {
      restore(k, p, 99, true);
      for (let i = 0; i < 6; i++) k.host.fx.burn(p.x + (crand() - 0.5) * p.radius * 1.6, p.surfaceY + 10);
    }
  },

  underworld: (k) => {
    sfx('underworld');
    title(k, 'UNDERWORLD!', 0x7a5aff, 104);
    k.host.shake(600, 0.014);
    const crack = k.sc.add.graphics();
    k.host.layers.under.add(crack);
    // the floor cracks open below the table, glowing from beneath
    const pts: [number, number][] = [];
    for (let x = 0; x <= W; x += 70) pts.push([x, TABLE_Y + 150 + (crand() - 0.5) * 40]);
    for (const [w, c, a] of [[60, 0x3a1a6a, 0.8], [26, 0x7a5aff, 0.8], [8, 0xd8c8ff, 1]] as const) {
      crack.lineStyle(w, c, a);
      crack.beginPath();
      pts.forEach(([x, y], i) => (i ? crack.lineTo(x, y) : crack.moveTo(x, y)));
      crack.strokePath();
    }
    k.sc.tweens.add({ targets: crack, alpha: 0, delay: 1600, duration: 600, onComplete: () => crack.destroy() });
    const tint = k.overlay({ kind: 'tint', color: 0x2a1a4a, alpha: 0.35, blend: 'multiply' }, 200);
    k.sc.time.delayedCall(1300, () => tint.end(600));
    for (const f of k.host.live()) {
      if (!f.isBossLike && f.hp / f.maxHp < 0.3) {
        // dragged down: ghostly hands pull it under
        k.host.fx.puff(f.cx, f.cy + 40, 10);
        k.beam(f.cx, H + 40, f.cx, f.cy, 0x7a5aff, 30, 400);
        k.host.kill(f);
      } else {
        k.host.hurt(f, 5, { knock: 300 });
        k.host.fx.propBurst(f.cx, f.cy, 0x7a5aff, 1);
      }
    }
  },

  springReturns: (k) => {
    sfx('spring');
    title(k, 'SPRING RETURNS!', 0xff5a7a, 100);
    const dead = k.host.pizzas().filter((p) => p.dead);
    for (let i = 0; i < 26; i++) {
      const x = 120 + crand() * (W - 240);
      const fl = k.img('g_flower', x, TABLE_Y + 70 + crand() * 60, 0.05).setAngle((crand() - 0.5) * 30);
      k.sc.tweens.add({ targets: fl, scale: 0.35 + crand() * 0.2, duration: 360, delay: i * 30, ease: 'Back.Out' });
      k.sc.tweens.add({ targets: fl, alpha: 0, delay: 2600 + i * 20, duration: 600, onComplete: () => fl.destroy() });
    }
    if (dead.length && !k.st.spring) {
      // once a run: a destroyed pizza comes back on full slices
      k.st.spring = true;
      const p = dead[0];
      k.host.revive(p, p.maxSlices);
      k.host.quip(p.x, p.surfaceY - 180, 'BACK FROM THE UNDERWORLD!', '#ff9ab0', 36);
    } else for (const p of alive(k)) restore(k, p, 1, false);
  },

  victoryWings: (k) => {
    const wings = k.img('g_wings', 0, 0, 0.1);
    k.transform({
      label: 'VICTORY',
      sec: 12,
      color: 0xffd23f,
      shout: 'VICTORY WINGS!',
      sfx: 'sfx_hero_wings',
      start: () => {
        until(k, 'nike', 12);
        k.sc.tweens.add({ targets: wings, scale: 0.6, duration: 380, ease: 'Back.Out' });
      },
      tick: (_dt) => {
        const p = k.host.peelPos();
        wings.setPosition(p.x, p.y - 10).setScale(0.6 + Math.sin(now(k) * 8) * 0.04, 0.6);
      },
      end: () => {
        k.wv.nike = 0;
        wings.destroy();
      },
    });
  },

  nightfall: (k) => {
    sfx('nightfall');
    title(k, 'NIGHTFALL!', 0xa08aff, 110);
    const dark = k.overlay({ kind: 'dark', alpha: 0.95, spot: 110, color: 0x02020a }, 250);
    const glow = k.img('glow', 0, 0, 0.6).setTint(0xa08aff).setBlendMode(Phaser.BlendModes.ADD);
    for (const f of k.host.live()) {
      k.stun(f, 5);
      k.mark(f, 1.5, 6);
    }
    // stars in the dark
    const stars = k.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    k.host.layers.fx.add(stars);
    for (let i = 0; i < 60; i++) {
      stars.fillStyle(0xe8e0ff, 0.4 + crand() * 0.6);
      stars.fillCircle(crand() * W, crand() * H * 0.7, 1 + crand() * 2.5);
    }
    timed(
      k,
      5,
      () => {
        const p = k.host.peelPos();
        glow.setPosition(p.x, p.y);
      },
      () => {
        dark.end(500);
        glow.destroy();
        k.sc.tweens.add({ targets: stars, alpha: 0, duration: 500, onComplete: () => stars.destroy() });
      },
    );
  },

  // ——— Norse gods ———
  allfather: (k) => {
    sfx('allfather');
    title(k, 'ALLFATHER!', 0x7ab8ff, 110);
    const dim = k.overlay({ kind: 'tint', color: 0x1a2a4a, alpha: 0.35, blend: 'multiply' }, 300);
    // the single eye opens over the table
    const eye = k.sc.add.graphics();
    k.host.layers.fx.add(eye);
    const o = { open: 0 };
    k.sc.tweens.add({ targets: o, open: 1, duration: 500, ease: 'Back.Out' });
    const drawEye = () => {
      eye.clear();
      const cx = W / 2;
      const cy = 200;
      const h = 70 * o.open;
      eye.fillStyle(0xf4f0e8, 1);
      eye.beginPath();
      eye.moveTo(cx - 170, cy);
      for (let i = 0; i <= 20; i++) eye.lineTo(cx - 170 + i * 17, cy - Math.sin((i / 20) * Math.PI) * h);
      for (let i = 20; i >= 0; i--) eye.lineTo(cx - 170 + i * 17, cy + Math.sin((i / 20) * Math.PI) * h);
      eye.closePath();
      eye.fillPath();
      eye.lineStyle(8, 0x2a1810, 1);
      eye.strokePath();
      if (o.open > 0.3) {
        eye.fillStyle(0x7ab8ff, 1);
        eye.fillCircle(cx, cy, 52 * o.open);
        eye.fillStyle(0x0a0a14, 1);
        eye.fillCircle(cx, cy, 24 * o.open);
        eye.fillStyle(0xffffff, 0.9);
        eye.fillCircle(cx - 14, cy - 16, 9 * o.open);
      }
    };
    timed(k, 3.2, () => drawEye(), () => {
      dim.end(500);
      k.sc.tweens.add({ targets: eye, alpha: 0, duration: 400, onComplete: () => eye.destroy() });
    });
    // two ravens fly out and mark every foot
    k.sc.time.delayedCall(600, () => {
      if (!k.host.inWave()) return;
      const live = k.host.live();
      [0, 1].forEach((side) => {
        const r = k.img('g_raven', W / 2, 200, 0.55).setFlipX(side === 0);
        const mine = live.filter((_f, i) => i % 2 === side).sort((a, b) => a.cx - b.cx);
        const path = [...mine.map((f) => ({ x: f.cx, y: f.cy - 60, f })), { x: side ? W + 200 : -200, y: 120, f: null as Foot | null }];
        let i = 0;
        const hop = () => {
          const pt = path[i++];
          if (!pt) return r.destroy();
          k.sc.tweens.add({
            targets: r,
            x: pt.x,
            y: pt.y,
            duration: 220,
            ease: 'Sine.InOut',
            onComplete: () => {
              if (pt.f?.alive) {
                k.mark(pt.f, 2, 8);
                k.host.fx.propBurst(pt.f.cx, pt.f.cy - 40, 0x2a2a3a, 0.6);
              }
              hop();
            },
          });
        };
        hop();
      });
    });
    // then Gungnir strikes the 4 toughest
    k.sc.time.delayedCall(1900, () => {
      if (!k.host.inWave()) return;
      for (const [i, f] of k.toughest(4).entries()) {
        k.sc.time.delayedCall(i * 160, () => {
          if (!f.alive) return;
          const sp = k.img('g_spear', f.cx, -200, 0.8).setAngle(90);
          k.sc.tweens.add({
            targets: sp,
            y: f.cy - 40,
            duration: 160,
            ease: 'Quad.In',
            onComplete: () => {
              k.host.hurt(f, 6, { knock: 500 });
              k.strike(f.cx, f.cy, 0x9fd8ff);
              k.host.shake(140, 0.008);
              k.sc.tweens.add({ targets: sp, alpha: 0, duration: 300, onComplete: () => sp.destroy() });
            },
          });
        });
      }
    });
  },

  thunderGod: (k) => {
    sfx('thundergod');
    title(k, 'THUNDER GOD!', 0x9fd8ff, 110);
    const sky = k.overlay({ kind: 'tint', color: 0x1a2440, alpha: 0.5, blend: 'multiply' }, 300);
    // the hammer is raised over the peel, crackling
    const p = k.host.peelPos();
    const hm = k.img('t_hammer', p.x, p.y - 60, 0.2).setAngle(-30);
    k.sc.tweens.add({ targets: hm, y: p.y - 200, scale: 1.1, angle: 0, duration: 500, ease: 'Back.Out' });
    timed(
      k,
      0.9,
      () => {
        const q = k.host.peelPos();
        hm.x = q.x;
        if (crand() < 0.4) k.host.fx.lightning(hm.x - 40, hm.y - 60, hm.x + 30, hm.y + 20);
      },
      () => {
        k.flashC(0xffffff, 160);
        k.host.shake(400, 0.014);
        for (const f of k.host.live()) {
          k.strike(f.cx, f.cy, 0xd8f0ff);
          k.host.hurt(f, 6, { knock: 400 });
          k.host.runFx([{ e: 'chain', x: 2, jumps: 3, at: { to: 'hit' } }], { foot: f, x: f.cx, y: f.cy }, 0x9fd8ff);
        }
        k.sc.tweens.add({ targets: hm, alpha: 0, duration: 400, onComplete: () => hm.destroy() });
        k.sc.time.delayedCall(700, () => sky.end(500));
      },
    );
  },

  mischief: (k) => {
    sfx('mischief');
    const decoys = [0, 1, 2].map(() => k.sc.add.image(0, 0, 'peel').setOrigin(0.5, 100 / 360).setScale(k.host.peelScale()).setAlpha(0).setTint(0xb8ff9a));
    for (const d of decoys) k.host.layers.cursor.add(d);
    k.transform({
      label: 'MISCHIEF',
      sec: 10,
      color: 0x7be04a,
      shout: 'MISCHIEF!',
      start: () => {
        until(k, 'loki', 10);
        const p = k.host.peelPos();
        for (const d of decoys) {
          d.setPosition(p.x, p.y);
          k.host.fx.puff(p.x, p.y, 8);
        }
      },
      tick: (_dt) => {
        const p = k.host.peelPos();
        const t = now(k);
        decoys.forEach((d, i) => {
          // they wheel round you, mirroring and leading your moves
          const a = t * 1.4 + (i / 3) * Math.PI * 2;
          d.setPosition(Phaser.Math.Clamp(p.x + Math.cos(a) * 260 + Math.sin(t * 3 + i) * 40, 60, W - 60), Phaser.Math.Clamp(p.y + Math.sin(a) * 160, 80, H - 80));
          d.setAngle(-28 + Math.sin(t * 5 + i) * 20).setAlpha(0.6 + 0.2 * Math.sin(t * 7 + i));
        });
      },
      end: () => {
        k.wv.loki = 0;
        for (const d of decoys) {
          k.host.fx.puff(d.x, d.y, 8);
          d.destroy();
        }
      },
    });
  },

  foresight: (k) => {
    const g = k.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    k.host.layers.fx.add(g);
    const tint = k.overlay({ kind: 'tint', color: 0xc8b0ff, alpha: 0.1, blend: 'add' }, 300);
    k.transform({
      label: 'FORESIGHT',
      sec: 15,
      color: 0xc8b0ff,
      shout: 'FORESIGHT!',
      sfx: 'sfx_hero_foresight',
      start: () => until(k, 'frigg', 15),
      tick: () => {
        g.clear();
        // a ghost of each stomp, a second before it lands
        for (const f of k.host.live()) {
          if (f.state !== 'descend' || !f.target) continue;
          const eta = (f.stompY - f.y) / Math.max(1, f.vy);
          if (eta > 1) continue;
          const a = 1 - eta;
          g.fillStyle(0xc8b0ff, 0.25 * a);
          g.fillEllipse(f.x, f.target.surfaceY, 200, 70);
          g.lineStyle(4, 0xe8e0ff, 0.7 * a);
          g.strokeEllipse(f.x, f.target.surfaceY, 200 * (0.6 + 0.4 * a), 70 * (0.6 + 0.4 * a));
        }
      },
      end: () => {
        k.wv.frigg = 0;
        g.destroy();
        tint.end(400);
      },
    });
  },

  falconCloak: (k) => {
    const wings = k.img('g_falcon', 0, 0, 0.1);
    k.transform({
      label: 'FALCON CLOAK',
      sec: 10,
      color: 0xffb0d8,
      shout: 'FALCON CLOAK!',
      sfx: 'sfx_hero_falcon',
      start: () => {
        k.sc.tweens.add({ targets: wings, scale: 0.75, duration: 300, ease: 'Back.Out' });
        k.onHit = (f, x, y) => {
          // a diving strike: talons rake the two feet nearest it too
          k.beam(x, y - 220, x, y, 0xffb0d8, 14, 160);
          const near = k.host.live().filter((o) => o !== f).sort((a, b) => a.distanceTo(x, y) - b.distanceTo(x, y)).slice(0, 2);
          for (const o of near) {
            k.beam(x, y, o.cx, o.cy, 0xffb0d8, 8, 160);
            k.host.hurt(o, 1, { knock: 220, quiet: true });
          }
          sfx('dart', 0.5);
        };
      },
      tick: () => {
        const p = k.host.peelPos();
        wings.setPosition(p.x, p.y - 20).setScale(0.75, 0.75 + Math.sin(now(k) * 10) * 0.08);
        if (crand() < 0.3) k.host.fx.trail(p.x, p.y, 0xffb0d8);
      },
      end: () => wings.destroy(),
    });
  },

  goldenBoar: (k) => {
    sfx('boar');
    title(k, 'GOLDEN BOAR!', 0xffd23f, 110);
    const ltr = k.host.peelPos().x > W / 2;
    const y = TABLE_Y - 140;
    const boar = k.img('g_boar', ltr ? -200 : W + 200, y, 0.9).setFlipX(!ltr);
    const glow = k.img('glow', boar.x, boar.y, 1.2).setTint(0xffd23f).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5);
    const hit = new Set<Foot>();
    timed(
      k,
      1.6,
      (_dt, t) => {
        const u = t / 1.6;
        boar.x = ltr ? -200 + (W + 400) * u : W + 200 - (W + 400) * u;
        boar.y = y + Math.abs(Math.sin(t * 14)) * -14;
        glow.setPosition(boar.x, boar.y);
        if (crand() < 0.5) k.host.fx.puff(boar.x - (ltr ? 80 : -80), y + 60, 2);
        for (const f of k.host.live()) {
          if (hit.has(f) || Math.abs(f.cx - boar.x) > 100 || f.cy < y - 320) continue;
          hit.add(f);
          k.host.hurt(f, 6, { knock: 900 });
          // gold coins tumble out behind it
          k.host.tips(2, f.cx, f.cy);
          k.host.fx.glint(f.cx, f.cy, 5);
        }
      },
      () => {
        boar.destroy();
        glow.destroy();
      },
    );
  },

  oathTyr: (k) => {
    let phase = 0;
    k.transform({
      label: 'OATH OF TYR',
      sec: 20,
      color: 0xff6a4a,
      shout: 'OATH OF TYR!',
      sfx: 'sfx_hero_oath',
      start: () => {
        // the sacrifice: your smacks can't reach anything for 5 s
        k.mods.reach = 0.0001;
        k.host.peel().setTint(0x8a8a8a);
        const p = k.host.peelPos();
        k.host.quip(p.x, p.y - 120, 'THE HAND IS GIVEN', '#ff9a7a', 34);
      },
      tick: (_dt, left) => {
        if (phase === 0 && left <= 15) {
          phase = 1;
          k.mods.reach = 1;
          k.mods.dmg = 3;
          k.host.peel().clearTint();
          k.flashC(0xff6a4a, 160);
          k.shout('×3!', 0xff6a4a, 130);
        }
        const p = k.host.peelPos();
        if (phase && crand() < 0.3) k.host.fx.trail(p.x, p.y, 0xff6a4a);
      },
      end: () => k.host.peel().clearTint(),
    });
  },

  gjallarhorn: (k) => {
    sfx('gjallarhorn');
    title(k, 'GJALLARHORN!', 0xffe680, 104);
    const hornImg = k.img('g_horn', W / 2, 220, 0.1);
    k.sc.tweens.add({ targets: hornImg, scale: 1.1, duration: 300, ease: 'Back.Out' });
    k.sc.tweens.add({ targets: hornImg, alpha: 0, delay: 1200, duration: 400, onComplete: () => hornImg.destroy() });
    for (let i = 0; i < 3; i++) k.sc.time.delayedCall(i * 150, () => k.host.fx.ring(W / 2, 260, 0xffe680, 2 + i, 0.6));
    k.host.shake(500, 0.012);
    for (const f of k.host.live()) toTop(k, f, 0.6);
    k.wv.horn = 3;
  },

  radiance: (k) => {
    sfx('radiance');
    title(k, 'RADIANCE!', 0xfff2a0, 120);
    until(k, 'baldur', 10);
    const pillar = k.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    k.host.layers.fx.add(pillar);
    const warm = k.overlay({ kind: 'tint', color: 0xfff2a0, alpha: 0.12, blend: 'add' }, 300);
    timed(
      k,
      10,
      (_dt, t) => {
        pillar.clear();
        const a = Math.min(1, t * 2) * (t > 9 ? 10 - t : 1);
        for (const p of alive(k)) {
          // a pillar of light over every pizza
          for (const [w, al] of [[p.radius * 2.2, 0.1], [p.radius * 1.4, 0.16], [p.radius * 0.6, 0.22]] as const) {
            pillar.fillStyle(0xfff2a0, al * a);
            pillar.fillRect(p.x - w / 2, 0, w, p.surfaceY + 20);
          }
          if (crand() < 0.08) k.host.fx.glint(p.x + (crand() - 0.5) * p.radius, crand() * p.surfaceY);
        }
      },
      () => {
        pillar.destroy();
        warm.end(400);
      },
    );
  },

  halfDeath: (k) => {
    sfx('halfdeath');
    title(k, 'HALF-DEATH!', 0xa8f0d8, 110);
    const grey = k.sc.add.rectangle(W * 0.75, H / 2, W / 2, H, 0x8a8a8a).setBlendMode(Phaser.BlendModes.MULTIPLY).setAlpha(0);
    k.host.layers.fx.add(grey);
    const line = k.sc.add.rectangle(W / 2, H / 2, 8, H, 0xa8f0d8).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    k.host.layers.fx.add(line);
    k.sc.tweens.add({ targets: [grey, line], alpha: 0.8, duration: 250, yoyo: true, hold: 1100, onComplete: () => (grey.destroy(), line.destroy()) });
    for (const f of k.host.live()) {
      if (f.isBossLike) {
        k.host.hurt(f, 8, { knock: 200 });
        continue;
      }
      // half its health, gone: it can't die of it
      f.hp = Math.max(1, f.hp * 0.5);
      f.flash(0xa8f0d8, 200);
      k.host.fx.propBurst(f.cx, f.cy, 0xa8f0d8, 0.8);
      k.host.quip(f.x, f.cy - 110, 'HALF!', '#a8f0d8', 30);
    }
  },

  seaWind: (k) => {
    sfx('seawind');
    title(k, 'SEA WIND!', 0x5fd8ff, 110);
    const wind = k.sc.add.graphics();
    k.host.layers.fx.add(wind);
    const gusts = Array.from({ length: 40 }, () => ({ x: crand() * W, y: crand() * H, v: 900 + crand() * 700 }));
    timed(
      k,
      8,
      (dt, t) => {
        wind.clear();
        const a = Math.min(1, t * 2) * (t > 7 ? 8 - t : 1);
        wind.lineStyle(3, 0xe8f8ff, 0.5 * a);
        for (const g of gusts) {
          g.x += g.v * dt;
          if (g.x > W + 100) {
            g.x = -100;
            g.y = crand() * H;
          }
          wind.lineBetween(g.x, g.y, g.x - 90, g.y + Math.sin(t * 4 + g.y) * 6);
        }
        for (const f of k.host.live()) {
          if (f.isBossLike) {
            k.slow(f, 0.5, 0.2);
            continue;
          }
          if (f.puppet) continue;
          // pushed back up, and held off the dive
          if (f.state === 'descend') {
            f.vy = Math.min(f.vy, 0);
            f.y = Math.max(HOVER_Y - 20, f.y - 380 * dt);
            if (f.y <= HOVER_Y) f.setState('hover');
          } else if (f.state === 'hover') k.stun(f, 0.15);
        }
      },
      () => wind.destroy(),
    );
  },

  winterHunt: (k) => {
    const snow = k.overlay({ kind: 'rain', alpha: 0.55, color: 0xffffff }, 300);
    k.transform({
      label: 'WINTER HUNT',
      sec: 10,
      color: 0xd8f6ff,
      shout: 'WINTER HUNT!',
      sfx: 'sfx_hero_winterhunt',
      start: () => {
        k.onHit = (f) => {
          if (!f.alive) return;
          k.stun(f, 2, true);
          sfx('freeze', 0.5);
        };
      },
      end: () => snow.end(500),
    });
  },

  goldenApples: (k) => {
    sfx('apples');
    const first = !k.st.apples;
    title(k, first ? 'GOLDEN APPLES!' : 'THE TREE IS BARE', 0xffd23f, first ? 104 : 80);
    k.st.apples = true;
    for (const [i, p] of alive(k).entries()) {
      const ap = k.img('g_apple', p.x + (crand() - 0.5) * 40, -80, 0.6);
      k.sc.tweens.add({
        targets: ap,
        y: p.surfaceY - 50,
        angle: 360,
        duration: 600,
        delay: i * 120,
        ease: 'Bounce.Out',
        onComplete: () => {
          // once a run, everything comes back; after that a slice each
          restore(k, p, first ? 99 : 1, first);
          k.host.fx.glint(p.x, p.surfaceY - 40, 6);
          k.sc.tweens.add({ targets: ap, alpha: 0, scale: 0.9, duration: 400, onComplete: () => ap.destroy() });
        },
      });
    }
  },

  saga: (k) => {
    k.transform({
      label: 'SAGA',
      sec: 15,
      color: 0xffb070,
      shout: 'THE SAGA BEGINS!',
      sfx: 'sfx_hero_saga',
      start: () => until(k, 'saga', 15),
      tick: () => {
        const p = k.host.peelPos();
        // music notes drift off the peel
        if (crand() < 0.15) k.host.quip(p.x + (crand() - 0.5) * 80, p.y - 80, crand() < 0.5 ? '♪' : '♫', '#ffd8a0', 30);
      },
      end: () => (k.wv.saga = 0),
    });
  },

  // ——— the God Peel ———
  divineFeast: (k) => {
    audio.sfx('sfx_divinefeast', { volume: 1 });
    audio.duck(0.3, 200);
    k.sc.time.delayedCall(2400, () => audio.duck(1, 800));
    title(k, 'DIVINE FEAST!', GOLD, 120);
    const light = k.overlay({ kind: 'tint', color: 0xfff2a0, alpha: 0.5, blend: 'add' }, 150);
    k.sc.time.delayedCall(500, () => light.end(900));
    // a great golden peel sweeps down from the heavens
    const big = k.sc.add.image(W / 2, -500, 'peel').setOrigin(0.5, 100 / 360).setScale(3.2).setAngle(0);
    k.host.layers.fx.add(big);
    k.sc.tweens.add({ targets: big, y: TABLE_Y - 220, duration: 360, ease: 'Quad.In', onComplete: () => k.sc.tweens.add({ targets: big, alpha: 0, scale: 3.6, duration: 500, onComplete: () => big.destroy() }) });
    k.sc.time.delayedCall(360, () => {
      if (!k.host.inWave()) return;
      k.host.shake(600, 0.016);
      k.host.rumble(1, 500);
      for (let i = 0; i < 4; i++) k.sc.time.delayedCall(i * 90, () => k.host.fx.ring(W / 2, TABLE_Y - 100, GOLD, 2.5 + i, 0.5));
      k.host.runFx(
        [
          { e: 'dmg', x: 25, at: { to: 'all' }, knock: 1200 },
          { e: 'stun', sec: 3, at: { to: 'all' } },
          { e: 'burn', x: 2, sec: 4, at: { to: 'all' } },
        ],
        {},
        GOLD,
      );
      for (const f of k.host.live()) k.strike(f.cx, f.cy, 0xfff2a0);
    });
    // then the feast: a slice and tips every time, and the two shields once a wave (a fast meter used to stack them
    // up without end)
    k.sc.time.delayedCall(1100, () => {
      if (!k.host.inWave()) return;
      const shields = !k.wv.feastShields;
      k.wv.feastShields = 1;
      k.host.runFx([...(shields ? [{ e: 'shield' as const, n: 2, who: 'all' as const }] : []), { e: 'heal', n: 1, who: 'all' }, { e: 'tips', n: 50 }], {}, GOLD);
      for (const p of alive(k)) k.host.fx.healBurst(p.x, p.surfaceY);
    });
  },
});

// ——— passives ———

/** Throws the Pantheon passive borrows from the throwing peels, at ×2. */
const PANTHEON: ThrowFx[] = [
  TH('tomato', 'bounce', 4, { more: [3, 2] }),
  TH('plate', 'ricochet', 4, { more: [4, 4] }),
  TH('cannon', 'explode', 6, { r: 160, splash: 2, knock: 900 }),
  TH('wingrang', 'boomerang', 4, { more: [4] }),
  TH('football', 'ricochet', 6, { more: [3] }),
  TH('pineapple', 'roll', 3, { r: 90 }),
  TH('coconut', 'lob', 6),
  TH('bowling', 'roll', 6, { r: 100, knock: 700 }),
  TH('shield', 'ricochet', 4, { more: [4, 4] }),
  TH('rocket', 'explode', 6, { r: 140, splash: 2 }),
  TH('card', 'explode', 3, { r: 120, splash: 1 }),
  TH('duck', 'lob', 2, { on: [{ e: 'stun', sec: 1, at: { to: 'hit' } }] }),
  TH('hammer', 'boomerang', 4, { more: [4] }),
];

const UNDEAD = /zombie|mummy|ghost|skelet|hoplite|draugr|poltergeist|phantom|loafer/i;
const isUndead = (f: Foot) => !!f.type.undead || UNDEAD.test(f.type.id) || UNDEAD.test(f.type.name);

registerPassives(
  godPassives({
    'hero:zeus': {},

    'hero:kratos': {
      waveStart: (k) => {
        // one more blade at the start of each new act in the run, up to 5
        const act = actOf(k.host.wave());
        if (k.st.bladeAct === undefined) k.st.bladeAct = act;
        else if (act !== Number(k.st.bladeAct)) {
          k.st.bladeAct = act;
          const n = Math.min(5, Number(k.st.blades ?? 1) + 1);
          if (n > Number(k.st.blades ?? 1)) {
            k.st.blades = n;
            const p = k.host.peelPos();
            k.host.quip(p.x, p.y - 140, `BLADE ${n}!`, '#ffb040', 40);
            sfx('blade', 0.9);
          }
        }
        k.st.blades ??= 1;
      },
      tick: (k, dt) => blades(k, dt),
      waveClear: (k) => {
        (k.st.bladeG as unknown as Phaser.GameObjects.Graphics | undefined)?.clear();
        (k.st.chainG as unknown as Phaser.GameObjects.Graphics | undefined)?.clear();
      },
    },

    'hero:hera': {
      stomp: (k, f, p) => {
        if (!on(k, 'decree')) return false;
        // Jealous Eye: whoever stomps a crowned pizza is marked
        k.mark(f, 1.5, 4);
        if (!p.flags.heraFirst) return false;
        p.flags.heraFirst = false;
        k.host.quip(f.x, f.cy - 120, 'BY ROYAL DECREE!', '#9ff0e0', 36);
        k.host.hurt(f, 5, { knock: 900 });
        k.host.fx.ring(p.x, p.surfaceY, 0x5fd0c0, 1, 0.4);
        return true;
      },
    },

    'hero:poseidon': {},

    'hero:demeter': {
      waveClear: (k) => {
        if (Math.random() >= 0.15) return;
        const p = weakest(k);
        if (!p || p.slices >= p.maxSlices) return;
        k.host.heal(p, 1);
        k.host.quip(p.x, p.surfaceY - 150, 'BOUNTY!', '#ffe680', 34);
      },
    },

    'hero:athena': {
      waveClear: (k) => {
        // Wisdom: roll the next shop's cards now and point out the strongest one
        const names = k.host.peekShop();
        if (!names.length) return;
        const best = athenaPick(names, k.host.owned());
        k.host.toast(null, 'ATHENA ADVISES', `In the shop: ${best} fits your build best.`);
        // the owl marks that card once the shop is on screen
        let tries = 0;
        const iv = window.setInterval(() => {
          const card = [...document.querySelectorAll<HTMLElement>('.cards .card')].find((c) => c.getAttribute('aria-label')?.startsWith(`${best}:`));
          if (card) card.classList.add('athena-pick');
          if (card || ++tries > 40) window.clearInterval(iv);
        }, 250);
      },
      stomp: (k, f) => {
        if (!on(k, 'aegis')) return false;
        k.host.quip(f.x, f.cy - 120, 'AEGIS!', '#c8d8ff', 34);
        f.knock(800);
        return true;
      },
    },

    'hero:apollo': {
      hit: (k, _f) => {
        const n = (k.st.muse = Number(k.st.muse ?? 0) + 1);
        if (n % 10) return;
        const pick = k.random(1);
        if (pick.length) k.host.throwAt(TH('arrow', 'straight', 3), pick, 0xffb020, (f, x) => {
          k.host.hurt(f, x, { knock: 300 });
          k.burn(f, 1, 2);
          k.host.fx.burn(f.cx, f.cy);
        });
      },
    },

    'hero:artemis': {
      tick: (k, dt) => {
        k.st.hunt = Number(k.st.hunt ?? 0) + dt;
        if (Number(k.st.hunt) < 4) return;
        k.st.hunt = 0;
        const t = k.toughest(1);
        if (t.length) k.host.throwAt(TH('arrow', 'straight', 3), t, 0xd8e4f0);
      },
      dmgMult: (k, f, source) => {
        // Hunter's Moon: every smack on the toughest foot is a crit
        if (source !== 'smack' || !on(k, 'moon') || k.toughest(1)[0] !== f) return 1;
        k.host.quip(f.x, f.cy - 130, 'MOONSHOT!', '#eef4fa', 30);
        return k.host.stats().critMult;
      },
    },

    'hero:ares': {
      kill: (k) => {
        const list = ((k.st.ares as string) ?? '').split(',').filter(Boolean).map(Number).filter((t) => now(k) - t < 10);
        list.push(now(k));
        k.st.ares = list.slice(-40).join(',');
      },
      dmgMult: (k) => {
        const n = ((k.st.ares as string) ?? '').split(',').filter(Boolean).map(Number).filter((t) => now(k) - t < 10).length;
        return 1 + 0.02 * n;
      },
      stomp: (k, f, p) => {
        // War Cry: a pizza bites back (the stomp still lands)
        if (!on(k, 'war')) return false;
        k.host.hurt(f, 3, { knock: 400 });
        k.host.quip(p.x, p.surfaceY - 140, 'CHOMP!', '#ff8a6a', 38);
        return false;
      },
    },

    'hero:aphrodite': {},

    'hero:hephaestus': { peelImmune: true },

    'hero:hermes': {},

    'hero:dionysus': {
      waveStart: (k) => {
        for (const p of alive(k)) if (p.slices < p.maxSlices) k.host.heal(p, 1);
      },
      kill: (k) => {
        if (!on(k, 'revel')) return;
        const p = weakest(k);
        if (p && p.slices < p.maxSlices) {
          k.host.heal(p, 1);
          k.host.quip(p.x, p.surfaceY - 140, 'CHEERS!', '#d8a8ff', 32);
        }
      },
    },

    'hero:hestia': {
      waveStart: (k) => {
        // Keeper of the Flame: freshness never sits below half
        for (const p of alive(k)) if (p.freshOn && p.fresh < Math.ceil(p.maxFresh / 2)) p.setFresh(Math.ceil(p.maxFresh / 2));
      },
      waveClear: (k) => {
        for (const p of alive(k)) if (p.freshOn && p.fresh < Math.ceil(p.maxFresh / 2)) p.setFresh(Math.ceil(p.maxFresh / 2));
      },
    },

    'hero:hades': {
      kill: (k, f) => k.host.tips(1, f.cx, f.cy),
    },

    'hero:persephone': {
      // Two Seasons: even waves are summer (+10% damage), odd waves are winter (+10% tips)
      dmgMult: (k) => (k.host.wave() % 2 === 0 ? 1.1 : 1),
      kill: (k, f) => {
        if (k.host.wave() % 2 === 1) k.host.tips(Math.max(1, Math.round(f.type.coins * 0.1)), f.cx, f.cy);
      },
    },

    'hero:nike': {
      kill: (k, f) => {
        if (f.type.boss) k.st.nike = Number(k.st.nike ?? 0) + 1;
        if (!on(k, 'nike')) return;
        // after the kill's own bookkeeping, so the combo it extends is the one still running
        k.sc.time.delayedCall(0, () => k.host.holdCombo(1.5));
        k.host.tips(1, f.cx, f.cy);
        k.host.fx.glint(f.cx, f.cy, 4);
      },
      dmgMult: (k) => 1 + 0.05 * Number(k.st.nike ?? 0),
    },

    'hero:nyx': {
      dmgMult: (k) => (NIGHT.has(k.host.backdrop() ?? '') ? 1.2 : 1),
    },

    'hero:odin': {
      tick: (k) => {
        // Wisdom of Mimir: a rune glows on every foot's weak point (its toes)
        let g = k.st.mimirG as unknown as Phaser.GameObjects.Graphics | undefined;
        if (!g || !g.active) {
          g = k.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
          k.host.layers.fx.add(g);
          (k.st as Record<string, unknown>).mimirG = g;
        }
        g.clear();
        const t = now(k);
        for (const f of k.host.live()) {
          const [wx, wy] = weakPoint(f);
          g.lineStyle(4, 0x7ab8ff, 0.5 + 0.3 * Math.sin(t * 6 + f.x));
          g.strokeCircle(wx, wy, 22);
          g.fillStyle(0xbfe0ff, 0.8);
          g.fillCircle(wx, wy, 5);
        }
      },
      waveClear: (k) => (k.st.mimirG as unknown as Phaser.GameObjects.Graphics | undefined)?.clear(),
      hit: (k, f, x, y) => {
        const [wx, wy] = weakPoint(f);
        if (!f.alive || Math.hypot(x - wx, y - wy) > 60) return;
        k.host.hurt(f, 0.25, { knock: 0, quiet: true });
        k.host.quip(wx, wy - 40, 'WEAK POINT!', '#bfe0ff', 26);
      },
    },

    'hero:thor': {
      peelImmune: true,
      tick: (k, dt) => {
        k.st.mjolnir = Number(k.st.mjolnir ?? 0) + dt;
        if (Number(k.st.mjolnir) < 7) return;
        k.st.mjolnir = 0;
        const pick = k.toughest(1);
        if (!pick.length) return;
        sfx('mjolnir', 0.7);
        k.host.throwAt(TH('hammer', 'boomerang', 4, { more: [4] }), pick, 0x9fd8ff, (f, x) => {
          k.host.hurt(f, x, { knock: 500 });
          k.strike(f.cx, f.cy, 0xd8f0ff);
        });
      },
    },

    'hero:loki': {
      stomp: (k, f) => {
        if (!on(k, 'loki') || f.isBossLike || Math.random() >= 0.3) return false;
        k.host.quip(f.x, f.cy - 120, 'WRONG PEEL!', '#b8ff9a', 34);
        k.host.fx.puff(f.cx, f.cy + 40, 8);
        f.knock(600);
        return true;
      },
      tick: (k, dt) => {
        // Trickster: now and then two diving feet swap places
        k.st.trick = Number(k.st.trick ?? 0) + dt;
        if (Number(k.st.trick) < 6) return;
        k.st.trick = 0;
        const div = k.host.live().filter((f) => !f.isBossLike && !f.puppet && (f.state === 'descend' || f.state === 'hover'));
        if (div.length < 2) return;
        const [a, b] = Phaser.Utils.Array.Shuffle(div);
        const [ay, as] = [a.y, a.state];
        const [by, bs] = [b.y, b.state];
        a.y = by;
        b.y = ay;
        a.setState(bs);
        b.setState(as);
        for (const f of [a, b]) {
          k.host.fx.puff(f.cx, f.cy, 6);
          k.host.quip(f.x, f.cy - 120, 'SWAPPED!', '#b8ff9a', 26);
        }
      },
    },

    'hero:frigg': {
      waveStart: (k) => {
        for (const p of k.host.pizzas()) p.flags.weaver = false;
      },
      stomp: (k, f, p) => {
        if (on(k, 'frigg')) {
          k.host.quip(f.x, f.cy - 120, 'FORESEEN!', '#e8e0ff', 34);
          f.knock(700);
          return true;
        }
        // Weaver: the first stomp on each pizza each wave
        if (p.flags.weaver) return false;
        p.flags.weaver = true;
        k.host.quip(p.x, p.surfaceY - 140, 'WOVEN!', '#e8e0ff', 32);
        k.host.fx.ring(p.x, p.surfaceY, 0xc8b0ff, 1, 0.4);
        f.knock(600);
        return true;
      },
    },

    'hero:freya': {
      kill: (k, f) => {
        if (f.type.id !== 'golden') return;
        k.host.tips(f.type.coins, f.cx, f.cy);
        k.host.quip(f.x, f.cy - 120, 'DOUBLE GOLD!', '#ffd23f', 34);
      },
    },

    'hero:freyr': {},

    'hero:tyr': {
      dmgMult: (_k, f) => (f.isBossLike ? 1.25 : 1),
    },

    'hero:heimdall': {
      stomp: (k, f) => {
        const n = Number(k.wv.horn ?? 0);
        if (n <= 0) return false;
        k.wv.horn = n - 1;
        k.host.quip(f.x, f.cy - 120, `HORN WARD ${n}/3`, '#ffe680', 32);
        f.knock(700);
        return true;
      },
      tick: (k) => {
        // Watchman: a ring on the pizza just before a stomp lands
        for (const f of k.host.live()) {
          if (f.state !== 'descend' || !f.target || f.brain.watched) continue;
          const eta = (f.stompY - f.y) / Math.max(1, f.vy);
          if (eta > 0.6) continue;
          f.brain.watched = 1;
          k.host.fx.ring(f.target.x, f.target.surfaceY, 0xffe680, 1.1, 0.4);
        }
        for (const f of k.host.live()) if (f.state !== 'descend') f.brain.watched = 0;
      },
    },

    'hero:baldur': {
      tick: (k, dt) => {
        k.st.beloved = Number(k.st.beloved ?? 0) + dt;
        if (Number(k.st.beloved) < 6) return;
        k.st.beloved = 0;
        const p = weakest(k);
        if (p && p.slices < p.maxSlices) {
          k.host.heal(p, 1);
          k.host.fx.healBurst(p.x, p.surfaceY);
        }
      },
      stomp: (k, f) => {
        if (!on(k, 'baldur')) return false;
        k.host.quip(f.x, f.cy - 120, 'RADIANT!', '#fff2a0', 34);
        f.knock(700);
        return true;
      },
      slices: (k, _p, n) => (on(k, 'baldur') ? 0 : n),
    },

    'hero:hel': {
      dmgMult: (_k, f) => (isUndead(f) ? 2 : 1),
    },

    'hero:njord': {},

    'hero:skadi': {
      dmgMult: (k) => (['lodge', 'slopes'].includes(k.host.location() ?? '') ? 1.2 : 1),
    },

    'hero:idun': {
      keepFresh: () => true,
    },

    'hero:bragi': {
      tick: (k) => {
        // Skald: a verse at every 10-combo
        const c = k.host.combo();
        const verses = Math.floor(c / 10);
        if (c === 0) k.st.verses = 0;
        if (verses > Number(k.st.verses ?? 0)) {
          k.st.verses = verses;
          if (verses <= 5) {
            sfx('verse', 0.6);
            const p = k.host.peelPos();
            k.host.quip(p.x, p.y - 120, `VERSE ${verses}!`, '#ffd8a0', 30);
          }
        }
      },
      dmgMult: (k) => {
        const c = k.host.combo();
        let m = 1 + Math.min(0.5, 0.1 * Math.floor(c / 10));
        // Saga: +5% for every 10 of the combo, no cap
        if (on(k, 'saga')) m *= 1 + 0.05 * Math.floor(c / 10);
        return m;
      },
    },
  }),
);

// Spartan Sandals' foot peel (and its shiny): +25% damage once only a quarter of the wave's feet are left
const phalanx: Passive = { dmgMult: (k) => (k.host.inWave() && k.host.waveLeft() <= 0.25 ? 1.25 : 1) };

// the God Peel's passive isn't a god's: it skips the shared god rules
registerPassives({
  'foot:spartan': phalanx,
  'shiny:spartan': phalanx,
  [GOD_PEEL]: {
    tick: (k, dt) => {
      godHalo(k);
      // Pantheon: every 3 s, a throw borrowed from the throwing peels, at ×2
      k.st.pantheon = Number(k.st.pantheon ?? 0) + dt;
      if (Number(k.st.pantheon) < 3) return;
      k.st.pantheon = 0;
      const e = Phaser.Utils.Array.GetRandom(PANTHEON);
      const pick = k.random(1);
      if (pick.length) k.host.throwAt(e, pick, GOLD);
    },
    waveClear: (k) => (k.st.haloG as unknown as Phaser.GameObjects.Graphics | undefined)?.clear(),
  },
});

/** The God Peel in play: a slowly turning halo over the peel, and a golden ember trail. */
function godHalo(k: HeroKit): void {
  let g = k.st.haloG as unknown as Phaser.GameObjects.Graphics | undefined;
  if (!g || !g.active) {
    const halo = k.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    g = halo;
    k.host.layers.cursor.add(halo);
    (k.st as Record<string, unknown>).haloG = halo;
    // the passive stops ticking when the ability is swapped away (Peel Roulette, Shape-Shift), so the halo
    // watches for that itself and goes with it
    const watch = () => {
      if (k.peelId === GOD_PEEL && halo.active) return;
      k.sc.events.off('update', watch);
      if ((k.st as Record<string, unknown>).haloG === halo) delete (k.st as Record<string, unknown>).haloG;
      halo.destroy();
    };
    k.sc.events.on('update', watch);
    k.sc.events.once('shutdown', () => k.sc.events.off('update', watch));
  }
  const p = k.host.peelPos();
  const peel = k.host.peel();
  const s = peel.scale / 0.62;
  const t = now(k);
  g.clear();
  // the halo sits above the head; it turns slowly, so its bright arc travels round it
  const hx = p.x + Math.sin(peel.rotation) * 70 * s;
  const hy = p.y - Math.cos(peel.rotation) * 70 * s;
  g.lineStyle(10 * s, 0xffe27a, 0.35);
  g.strokeEllipse(hx, hy, 96 * s, 24 * s);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + t * 0.8;
    const bright = 0.3 + 0.7 * Math.max(0, Math.cos(a - t * 0.8 * 3));
    g.fillStyle(0xfff6c0, bright);
    g.fillCircle(hx + Math.cos(a) * 48 * s, hy + Math.sin(a) * 12 * s, 2.6 * s);
  }
  const last = (k.st.haloLast as string | undefined)?.split(',').map(Number);
  if (last && Math.hypot(p.x - last[0], p.y - last[1]) > 14) {
    k.host.fx.trail(p.x, p.y, GOLD);
    if (crand() < 0.5) k.host.fx.glint(p.x + (crand() - 0.5) * 40, p.y + (crand() - 0.5) * 40);
  }
  k.st.haloLast = `${p.x},${p.y}`;
}

/** Odin's weak point: the toes, at the bottom of the foot. */
function weakPoint(f: Foot): [number, number] {
  return [f.x, f.y - 30 * f.scale];
}

/** Athena's pick from the next shop's cards: a topping you already have (it builds on what you're doing),
 * then the rarest. */
function athenaPick(names: string[], owned: Record<string, number>): string {
  const RANK = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const score = (n: string) => {
    const u = UPGRADES.find((x) => x.name === n);
    if (!u) return 0;
    return (owned[u.id] ? 10 : 0) + RANK.indexOf(u.rarity);
  };
  return [...names].sort((a, b) => score(b) - score(a))[0];
}

export const GOD_COLOR_FIRE = hexS(FIRE);
