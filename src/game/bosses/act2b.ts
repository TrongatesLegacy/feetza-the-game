// Boss brains, Stages 10–12: milkshake, rinkqueen, lumberjack, yeti, poltergeist (the Zombie Loafer),
// phantomking. Shared helpers and the heat scaling live in ./kit.ts; this batch's props are drawn in
// src/content/props/act2b.ts.

import Phaser from 'phaser';
import { FOOT_BY_ID } from '../../data/feet';
import type { Arena } from '../arena';
import type { Foot } from '../Foot';
import type { Pizza } from '../Pizza';
import { type Brain, type Prop, type Takeover, Every, dropOn, heat, hitProp, hitWindup, laneOf, mark, retreat, rnd, screenSplat, shield, takeLane, throwAtPeel, windup } from './kit';

// ——— Batch helpers ———

/** Things a fight has put on the table, cleared together when the boss goes down. */
class Bin {
  private items = new Set<() => void>();
  /** Track a cleanup; returns a function that runs it now and forgets it. */
  add(fn: () => void): () => void {
    this.items.add(fn);
    return () => {
      if (!this.items.delete(fn)) return;
      fn();
    };
  }
  flush(): void {
    const all = [...this.items];
    this.items.clear();
    for (const fn of all) fn();
  }
}

/** The private sprite inside a foot or pizza, for tints its own redraws would otherwise wipe. */
const imgOf = (o: Foot | Pizza) => (o as unknown as { img: Phaser.GameObjects.Image }).img;

/** The scene is the Arena; the Arena has no call to end a brain freeze early, so the hot-water bowl
 * shortens the scene's peel-slow timer directly (it clears its own tint on the next tick). */
const peelSlow = (a: Arena) => a as unknown as { peelSlowT: number };

/** One lane per pizza, left to right (set-pieces sweep the table in this order). */
const lanePizzas = (a: Arena) => [...a.alivePizzas()].sort((p, q) => p.x - q.x);

const shuffled = <T>(xs: T[]): T[] => {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

interface FallOpts {
  key: string;
  scale: number;
  /** Seconds it wobbles at the top before it starts to fall (it can already be smacked). */
  warn: number;
  /** Seconds to fall from the top to the pizza. */
  fall: number;
  hits?: number;
  /** Degrees per frame while it falls. */
  spin?: number;
  /** Side-to-side buzz in px (chainsaws). */
  jitter?: number;
  /** Where it starts (screen y). */
  fromY?: number;
  /** Half the hit box (px). */
  halfW: number;
  halfH: number;
  /** Lane glow colour. */
  color: number;
  label?: string;
  onLand(p: Pizza): void;
  /** Called once it's gone either way (smashed, landed or cleared). */
  onEnd?(): void;
}

/** Something comes down a pizza's lane: a reticle on the pizza and a glowing lane column warn first,
 * then it falls at a steady speed. Smack it (once, unless `hits` says more) before it lands. */
function laneFall(a: Arena, p: Pizza, o: FallOpts, bin: Bin): void {
  const x0 = p.x;
  const top = o.fromY ?? 230;
  const total = o.warn + o.fall;
  const endY = () => p.surfaceY - 40;
  const ret = mark(a, 'p_reticle', x0, p.surfaceY - 30, total, 0.6);
  const col = a.sc.add.graphics();
  a.fxLayer.add(col);
  col.fillStyle(o.color, 0.12).fillRoundedRect(x0 - 70, top - 40, 140, endY() - top + 70, 34);
  col.lineStyle(5, o.color, 0.55).strokeRoundedRect(x0 - 70, top - 40, 140, endY() - top + 70, 34);
  a.sc.tweens.add({ targets: col, alpha: { from: 0.45, to: 1 }, duration: 300, yoyo: true, repeat: -1 });
  a.sfx('sfx_warning', { volume: 0.35, rate: 1.3, throttle: 200 });
  const st = { t: 0 };
  const yAt = () => {
    const s = st.t * total;
    return s < o.warn ? top : top + (endY() - top) * ((s - o.warn) / o.fall);
  };
  let ended = false;
  let tw: Phaser.Tweens.Tween | null = null;
  const finish = (smashed: boolean) => {
    if (ended) return;
    ended = true;
    tw?.remove();
    a.sc.tweens.killTweensOf(col);
    col.destroy();
    ret.destroy();
    if (!smashed) prop.destroy();
    o.onEnd?.();
  };
  const prop: Prop = hitProp(a, {
    key: o.key,
    x: x0,
    y: top,
    scale: o.scale,
    hits: o.hits ?? 1,
    contains: (px, py) => Math.abs(px - prop.img.x) < o.halfW && Math.abs(py - prop.img.y) < o.halfH,
    follow: () => ({ x: p.x + (o.jitter ? (Math.random() - 0.5) * o.jitter : 0), y: yAt() }),
    label: o.label ?? 'SMASHED!',
    badgeDy: -o.halfH - 20,
    onClear: () => finish(true),
  });
  const forget = bin.add(() => finish(false));
  tw = a.sc.tweens.add({
    targets: st,
    t: 1,
    duration: total * 1000,
    ease: 'Linear',
    onUpdate: () => {
      // the lane column follows its pizza if the table re-lays out mid-fall
      col.x = p.x - x0;
      if (st.t * total < o.warn) prop.img.angle = Math.sin(st.t * total * 18) * 12;
      else if (o.spin) prop.img.angle += o.spin;
    },
    onComplete: () => {
      tw = null;
      if (ended) return;
      const x = prop.img.x;
      const y = prop.img.y;
      forget();
      if (!a.inWave() || p.dead) return;
      a.fx.explosion(x, y, 100);
      a.shake(200, 0.006);
      o.onLand(p);
    },
  });
}

// ——— 19. MILKSHAKE MAX (mini-boss) ———

/** Where the hot-water bowl sits: the right-hand end of the table, clear of the pizzas. */
const BOWL = { x: 1815, y: 690, r: 115 };
/** Seconds the peel must hover over the bowl to warm up. */
const WARM_HOLD = 0.6;
/** Seconds the warm-up keeps the next brain freeze off. */
const WARM_SEC = 7;

const milkshake = (): Brain => {
  const bin = new Bin();
  let ready = false;
  const freeze = new Every(7, 4);
  const straw = new Every(9, 3);
  let freezing = false;
  let hold = 0;
  let warm = 0;
  let bowl: Phaser.GameObjects.Image | null = null;
  let ring: Phaser.GameObjects.Graphics | null = null;
  let glow: Phaser.GameObjects.Image | null = null;
  let steamT = 0;
  let sucking: { lane: Takeover; prop: Prop; p: Pizza; wobble: Phaser.Tweens.Tween; dripT: number } | null = null;

  const setup = (a: Arena) => {
    ready = true;
    const h = heat(a);
    freeze.every = h.cooldown(7);
    straw.every = h.cooldown(9);
    bowl = a.sc.add.image(BOWL.x, BOWL.y, 'p_hotbowl').setScale(0);
    a.underLayer.add(bowl);
    a.sc.tweens.add({ targets: bowl, scale: 0.75, duration: 300, ease: 'Back.Out' });
    const label = a.sc.add.text(BOWL.x, BOWL.y + 100, 'HOT WATER', { fontFamily: 'Lilita One, Fredoka, sans-serif', fontSize: '28px', color: '#fff6e2', stroke: '#2a1810', strokeThickness: 7 }).setOrigin(0.5);
    a.underLayer.add(label);
    ring = a.sc.add.graphics();
    a.fxLayer.add(ring);
    glow = a.sc.add.image(0, 0, 'glow').setTint(0xffa040).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setScale(0.9);
    a.fxLayer.add(glow);
    a.quip(BOWL.x - 60, BOWL.y - 150, 'HOT WATER!', '#ffb24a', 40);
    bin.add(() => {
      bowl?.destroy();
      label.destroy();
      ring?.destroy();
      glow?.destroy();
      bowl = ring = glow = null;
    });
  };

  const endStraw = (f: Foot, a: Arena) => {
    if (!sucking) return;
    const s = sucking;
    sucking = null;
    s.wobble.remove();
    if (s.p.root.active) a.sc.tweens.add({ targets: s.p.root, scaleX: 1, scaleY: 1, duration: 200 });
    s.lane.release();
    shield(a, f, false);
    straw.t = straw.every;
  };

  return {
    names: ['BRAIN FREEZE', 'BOTTOMS UP'],
    info: ['Winds up a brain freeze that slows your peel · hold the peel over the hot water to melt it or stop it', 'Shielded at the top of a lane, it slurps a pizza through a straw · smack the straw before the pizza loses a slice'],
    // the bowl keeps working while the boss is stunned (its freeze timer still runs)
    upkeep: (_f, dt, a) => {
      if (!ready) setup(a);
      // ——— the hot-water bowl: hover the peel over it to warm up (melts a freeze, or stops the next one) ———
      const pp = a.peelPoint();
      const over = Math.hypot(pp.x - BOWL.x, pp.y - BOWL.y) < BOWL.r;
      hold = over ? hold + dt : 0;
      if (hold >= WARM_HOLD) {
        hold = 0;
        const slowed = peelSlow(a).peelSlowT > 0;
        if (slowed) peelSlow(a).peelSlowT = 0.001;
        if (slowed || warm <= 0) {
          a.quip(BOWL.x - 40, BOWL.y - 140, slowed ? 'MELTED!' : 'WARMED UP!', '#ffb24a', 40);
          a.sfx('sfx_heal', { volume: 0.6 });
          a.fx.ring(BOWL.x, BOWL.y - 20, 0xffa040, 1, 0.5);
        }
        warm = WARM_SEC;
      }
      warm = Math.max(0, warm - dt);
      if (ring) {
        ring.clear();
        if (hold > 0) ring.lineStyle(10, 0xffa040, 0.9).beginPath().arc(BOWL.x, BOWL.y - 10, 100, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (hold / WARM_HOLD)).strokePath();
      }
      glow?.setPosition(pp.x, pp.y).setAlpha(warm > 0 ? 0.45 + Math.sin(a.now() * 6) * 0.15 : 0);
      steamT -= dt;
      if (bowl && steamT <= 0) {
        steamT = 0.5;
        a.fx.puff(BOWL.x + (Math.random() - 0.5) * 60, BOWL.y - 70, 1);
      }
    },
    update: (f, dt, a) => {
      const h = heat(a);

      // ——— Brain freeze: a long, readable wind-up (time to reach the bowl); hitting the boss doesn't stop it ———
      if (!freezing && !sucking && freeze.tick(dt)) {
        freezing = true;
        const sec = h.windup(2);
        a.quip(f.x, Math.max(280, f.cy - 160), 'BRAIN FREEZE…', '#a8dcff', 44);
        a.quip(BOWL.x - 60, BOWL.y - 160, 'WARM UP!', '#ffb24a', 40);
        a.sfx('sfx_freeze', { volume: 0.5, rate: 0.7 });
        f.tint(0xa8dcff);
        if (bowl) a.sc.tweens.add({ targets: bowl, scale: 0.85, duration: 220, yoyo: true, repeat: Math.max(1, Math.round((sec * 1000) / 440) - 1) });
        a.sc.time.delayedCall(sec * 1000, () => {
          freezing = false;
          f.tint(null);
          if (!f.alive || !a.inWave()) return;
          const at = a.peelPoint();
          if (warm > 0) {
            warm = 0;
            a.quip(at.x, at.y - 80, 'TOO WARM TO FREEZE!', '#7dff9a', 36);
            a.sfx('sfx_shield', { volume: 0.5 });
            return;
          }
          a.slowPeel(h.stun(4));
          a.quip(at.x, at.y - 70, 'BRAIN FREEZE!', '#a8dcff', 36);
          a.sfx('sfx_freeze', { volume: 0.7 });
        });
      }

      // ——— Bottoms up: it takes a lane, shields up, and a big straw slurps the pizza below ———
      if (f.phase >= 2 && !sucking && !freezing && straw.tick(dt)) {
        const lane = takeLane(a, f);
        if (!lane) return;
        const p = lane.p;
        shield(a, f, true);
        a.quip(p.x, 230, 'BOTTOMS UP!', '#ff9ad8', 48);
        a.sfx('sfx_whoosh', { volume: 0.6, rate: 0.8 });
        const s = 0.95;
        const bottom = () => p.surfaceY + 10;
        const st = { k: 0 };
        a.sc.tweens.add({ targets: st, k: 1, duration: 450, ease: 'Bounce.Out', delay: 500 });
        const prop = hitProp(a, {
          key: 'p_straw',
          x: p.x,
          y: -400,
          scale: s,
          hits: h.hits(4),
          sec: h.windup(6) + 0.5,
          // it drops from above the boss down into the pizza, then stays planted in it
          follow: () => ({ x: p.x + 30 * s, y: bottom() - 380 * s - (1 - st.k) * 800 }),
          contains: (px, py) => Math.abs(px - p.x) < 100 && py > bottom() - 700 && py < bottom() + 10,
          badgeDy: 210,
          label: 'STRAW SNAPPED!',
          onClear: () => {
            endStraw(f, a);
            f.stun(1.5);
            a.sfx('sfx_crit');
          },
          onFail: () => {
            endStraw(f, a);
            if (!p.dead && a.inWave()) a.hitPizza(p, h.slices(1), 'SLURPED!', '#ff9ad8');
          },
        });
        const wobble = a.sc.tweens.add({ targets: p.root, scaleX: 0.93, scaleY: 0.88, duration: 230, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 900 });
        sucking = { lane, prop, p, wobble, dripT: 0.9 };
        bin.add(() => {
          prop.destroy();
          endStraw(f, a);
        });
        return;
      }
      // slurp: pink drops ride up the straw while it sucks
      if (sucking) {
        const s = sucking;
        if (s.p.dead) {
          s.prop.destroy();
          endStraw(f, a);
          return;
        }
        s.dripT -= dt;
        if (s.dripT <= 0) {
          s.dripT = 0.16;
          const d = a.sc.add.image(s.p.x + 28 + (Math.random() - 0.5) * 60, s.p.surfaceY - 10, 'p_slurp').setScale(0.7);
          a.fxLayer.add(d);
          a.sc.tweens.add({ targets: d, x: s.p.x + 28, y: s.p.surfaceY - 420, scale: 0.35, alpha: 0, duration: 600, ease: 'Quad.In', onComplete: () => d.destroy() });
          a.sfx('sfx_squish', { volume: 0.3, rate: 0.6, throttle: 450 });
        }
      }
    },
    onDeath: (f, a) => {
      bin.flush();
      endStraw(f, a);
    },
  };
};

// ——— 20. QUEEN OF THE RINK (boss) ———

const rinkqueen = (): Brain => {
  const shuffle = new Every(7, 2);
  const dash = new Every(6.5, 3);
  const puck = new Every(4.5, 3);
  // never a shuffle and a dash wind-up at the same moment
  let busy = 0;
  return {
    names: ['PUCK SHOT', 'ROLLING PIZZAS', 'SPEED DASH'],
    info: ['Shoots pucks at your peel · smack them back for damage', 'Whistles, then shuffles the pizzas around · follow the pizzas as they roll', 'Marks a line of pizzas and dashes through them · smack her 3 times during the wind-up'],
    update: (f, dt, a) => {
      const h = heat(a);
      busy -= dt;
      // her moves come round faster on hotter heats
      const cd = h.cooldown(1);
      puck.every = 4.5 * cd;
      shuffle.every = 7 * cd;
      dash.every = 6.5 * cd;
      if (f.phase === 1 && puck.tick(dt)) {
        throwAtPeel(a, 'p_plate', { x: f.x, y: f.cy }, 1.2, () => a.stunPeel(0.8, 'PUCKED!'), () => a.damageFoot(f, Math.round(f.maxHp * 0.025), 'SLAPSHOT!'), 12, { scale: 0.55, tint: 0x2a2a34 });
        a.sfx('sfx_whistle', { rate: 1.6, volume: 0.5 });
      }
      if (f.phase >= 2 && busy <= 0 && !f.brain.windup && shuffle.tick(dt)) {
        busy = 2.4;
        a.sfx('sfx_whistle');
        a.quip(960, 300, 'SHUFFLE!', '#4cf0e0', 56);
        for (const p of a.alivePizzas()) {
          for (let i = 0; i < 3; i++) a.fx.puff(p.x + (i - 1) * 80, p.y + 30, 2);
        }
        a.sc.time.delayedCall(1000, () => {
          if (!f.alive || !a.inWave()) return;
          // the pizzas trade places; lanes re-place themselves on the new x positions
          const ps = a.allPizzas();
          const xs = shuffled(ps.map((p) => p.x));
          ps.forEach((p, i) => p.rollTo(xs[i]));
          ps.sort((p, q) => p.x - q.x);
        });
      }
      if (f.phase >= 3 && busy <= 0 && dash.tick(dt)) {
        const ps = lanePizzas(a);
        const start = Math.floor(Math.random() * Math.max(1, ps.length - 2));
        const line = ps.slice(start, start + 3);
        if (!line.length) return;
        const sec = h.windup(1.3);
        busy = sec + 0.6;
        for (const p of line) mark(a, 'p_reticle', p.x, p.surfaceY - 20, sec, 0.7);
        a.sfx('sfx_whistle', { rate: 1.3 });
        windup(a, f, '', sec, 'SPEED DASH!', 3, () => {
          for (const [i, p] of line.entries()) a.sc.time.delayedCall(i * 140, () => !p.dead && f.alive && a.inWave() && a.hitPizza(p, 1, 'DASHED!', '#ff4fd8'));
          a.sfx('sfx_whoosh', { volume: 1, rate: 1.2 });
        });
      }
    },
    onSmacked: (f, a) => {
      hitWindup(f, a, 1);
      return false;
    },
  };
};

// ——— 21. THE LUMBERJACK (mini-boss) ———

const lumberjack = (): Brain => {
  const bin = new Bin();
  const next = new Every(9, 3);
  let end: (() => void) | null = null;
  const stop = (f: Foot) => {
    end?.();
    end = null;
    f.pinned = false;
  };
  return {
    names: ['TIMBER', 'DOUBLE CHOP'],
    info: ['Feet back off and a chainsaw comes down each lane in turn · smack each saw once before it reaches the pizza', 'Feet back off and he drops two axes in each lane he visits · smack every axe once'],
    update: (f, dt, a) => {
      const h = heat(a);
      if (end || !next.tick(dt)) return;
      next.every = h.cooldown(9);
      const lanes = lanePizzas(a);
      if (!lanes.length) return;
      // the set-piece: every foot (the boss too) waits at the top while the blades come down
      end = retreat(a);
      f.pinned = true;
      let left = 0;
      const done = () => {
        left--;
        if (left <= 0) {
          stop(f);
          next.t = next.every;
        }
      };
      if (f.phase === 1) {
        // Timber: a chainsaw down each lane in turn; one that gets through takes half the pizza
        a.quip(960, 300, 'TIMBER!', '#e0a868', 56);
        a.sfx('sfx_warning', { volume: 0.5, rate: 0.8 });
        left = lanes.length;
        lanes.forEach((p, i) => {
          a.sc.time.delayedCall((0.6 + i * h.windup(1.1)) * 1000, () => {
            if (!end) return;
            if (p.dead) return done();
            laneFall(a, p, {
              key: 'p_chainsaw',
              scale: 0.85,
              warn: h.windup(0.8),
              fall: h.windup(2.4),
              jitter: 6,
              halfW: 90,
              halfH: 150,
              color: 0xff8a2a,
              label: 'SAW STOPPED!',
              onLand: (q) => {
                a.hitPizza(q, Math.max(1, Math.floor(q.slices / 2)), 'SAWN IN HALF!', '#ff8a2a');
                a.sfx('sfx_explosion', { volume: 0.5 });
              },
              onEnd: done,
            }, bin);
            a.sfx('sfx_whoosh', { volume: 0.5, rate: 0.6 });
          });
        });
        return;
      }
      // Double Chop: he visits lanes at random and drops two axes in each, one after the other
      a.quip(960, 300, 'DOUBLE CHOP!', '#e0a868', 56);
      const visits = shuffled(lanes);
      left = visits.length * 2;
      const gap = h.windup(0.6);
      // he glides over to the lane first (about a second), then lets go
      const stay = h.windup(1.4) + gap + 0.5;
      visits.forEach((p, i) => {
        const at = (0.4 + i * stay) * 1000;
        a.sc.time.delayedCall(at, () => {
          if (!end || p.dead) return;
          // move over the lane (he waits at the top of it), then let go
          f.target = p;
          a.quip(p.x, 250, 'CHOP CHOP!', '#e0a868', 36);
        });
        for (const k of [0, 1]) {
          a.sc.time.delayedCall(at + (1.2 + k * gap) * 1000, () => {
            if (!end) return;
            if (p.dead || !f.alive) return done();
            laneFall(a, p, {
              key: 'p_axe',
              scale: 0.8,
              warn: h.windup(0.5),
              fall: h.windup(1.8),
              spin: 9,
              fromY: 260,
              halfW: 80,
              halfH: 100,
              color: 0xe0a868,
              label: 'BLOCKED!',
              onLand: (q) => a.hitPizza(q, h.slices(1), 'CHOPPED!', '#e0a868'),
              onEnd: done,
            }, bin);
            a.sfx('sfx_whoosh', { volume: 0.6, rate: 0.9 });
          });
        }
      });
    },
    onDeath: (f) => {
      bin.flush();
      stop(f);
    },
  };
};

// ——— 22. THE YETI SKI BOOT (boss) ———

const yeti = (): Brain => {
  const bin = new Bin();
  const ball = new Every(4, 2);
  const icicle = new Every(5.5, 3);
  const avalanche = new Every(13, 3);
  let end: (() => void) | null = null;
  const stop = (f: Foot) => {
    end?.();
    end = null;
    f.pinned = false;
  };
  return {
    names: ['ICICLES', 'SNOWBALLS', 'AVALANCHE'],
    info: ["Drops icicles on the pizza below it: a hit freezes the pizza's perk · smack them as they fall", 'Throws snowballs at your peel · smack them out of the air', 'Feet back off and big snowballs roll down every lane twice · smack each one before it lands'],
    update: (f, dt, a) => {
      const h = heat(a);
      if (f.phase === 1 && icicle.tick(dt)) {
        icicle.every = h.cooldown(4.5);
        const p = laneOf(a, f);
        if (p) {
          laneFall(a, p, {
            key: 'p_icicle',
            scale: 0.8,
            warn: h.windup(0.7),
            fall: h.windup(1.6),
            halfW: 80,
            halfH: 110,
            color: 0x9ad8ff,
            label: 'SHATTERED!',
            // no slices: it ices the perk instead
            onLand: (q) => {
              a.freezePerk(q, h.stun(6));
              a.quip(q.x, q.surfaceY - 170, 'ICED!', '#a8dcff', 44);
              a.sfx('sfx_freeze', { volume: 0.7 });
            },
          }, bin);
        }
      }
      // snowballs at the peel (paused while an avalanche is coming down)
      if (f.phase >= 2 && !end && ball.tick(dt)) {
        throwAtPeel(a, 'p_snowball', { x: f.x, y: f.cy }, 1.3, () => a.stunPeel(1, 'FROZEN PEEL!'), () => a.quip(a.peelPoint().x, a.peelPoint().y - 60, 'SHATTERED!', '#a8dcff', 32), 3);
        a.sfx('sfx_whoosh', { rate: 0.9 });
      }
      if (f.phase >= 3 && !end && avalanche.tick(dt)) {
        avalanche.every = h.cooldown(13);
        const lanes = lanePizzas(a);
        if (!lanes.length) return;
        end = retreat(a);
        f.pinned = true;
        a.quip(960, 300, 'AVALANCHE!', '#cfe0ff', 60);
        a.rumble(0.5, 900);
        a.shake(900, 0.004);
        a.sfx('sfx_warning', { volume: 0.5, rate: 0.7 });
        // two passes over every lane, left to right (so a lane's second ball never stacks on its first)
        const order = [...lanes, ...lanes];
        let left = order.length;
        const done = () => {
          left--;
          if (left <= 0) {
            stop(f);
            avalanche.t = avalanche.every;
            ball.t = Math.max(ball.t, 1.5);
          }
        };
        order.forEach((p, i) => {
          a.sc.time.delayedCall((1 + i * h.windup(0.8)) * 1000, () => {
            if (!end) return;
            if (p.dead) return done();
            laneFall(a, p, {
              key: 'p_bigsnow',
              scale: 0.85,
              warn: h.windup(0.6),
              fall: h.windup(2),
              spin: 5,
              halfW: 105,
              halfH: 105,
              color: 0xcfe0ff,
              label: 'SMASHED!',
              onLand: (q) => {
                a.hitPizza(q, h.slices(1), 'BURIED!', '#cfe0ff');
                // a fresh freeze, or more time on one already running
                if (!q.dead) a.freezePerk(q, h.stun(5));
                a.sfx('sfx_freeze', { volume: 0.6 });
              },
              onEnd: done,
            }, bin);
            a.sfx('sfx_whoosh', { volume: 0.5, rate: 0.7 });
          });
        });
      }
    },
    onDeath: (f) => {
      bin.flush();
      stop(f);
    },
  };
};

// ——— 23. THE ZOMBIE LOAFER (mini-boss, id poltergeist) ———

const ZOMBIE_TINT = 0xa8d48a;
const ZOMBIE_GLOW = 0x8adf4a;
const GROANS = ['URRRGH…', 'BRAAAINS…', 'MMMNNGH…', 'HNNNGH…'];

interface Zombie {
  /** Armed while it dives: a landed stomp takes one more slice. */
  armed: boolean;
  p: Pizza | null;
  slices: number;
}

const poltergeist = (): Brain => {
  const bin = new Bin();
  const bite = new Every(5, 3);
  const cough = new Every(11, 3);
  const zombies = new Map<Foot, Zombie>();
  let biting: { o: Foot; reticle: Phaser.GameObjects.Image } | null = null;
  let coughing = false;
  let sick: { p: Pizza; prop: Prop; glow: Phaser.GameObjects.Image; munch: Every } | null = null;

  const zombify = (o: Foot) => {
    zombies.set(o, { armed: false, p: null, slices: 0 });
    // tougher and slower, with a sickly glow
    o.maxHp = Math.round(o.maxHp * 1.5);
    o.hp = Math.round(o.hp * 1.5);
    o.speedMul *= 0.7;
    o.setPhaseAura(ZOMBIE_GLOW);
  };
  const unzombify = (o: Foot) => {
    if (!o.alive) return;
    o.speedMul /= 0.7;
    o.maxHp = Math.round(o.maxHp / 1.5);
    o.hp = Math.min(o.hp, o.maxHp);
    o.setPhaseAura(null);
    o.tint(null);
  };
  const cure = (a: Arena, quiet = false) => {
    if (!sick) return;
    const s = sick;
    sick = null;
    s.prop.destroy();
    s.glow.destroy();
    if (s.p.perkFrozenT > 0) s.p.perkFrozenT = 0.01;
    if (s.p.root.active) s.p.redraw();
    if (!quiet && !s.p.dead) {
      a.quip(s.p.x, s.p.surfaceY - 170, 'CURED!', '#7dff9a', 46);
      a.sfx('sfx_heal', { volume: 0.7 });
      a.fx.healBurst(s.p.x, s.p.surfaceY - 30);
    }
    cough.t = cough.every;
  };

  return {
    names: ['BITE', 'COUGH'],
    info: ['Marks a foot, then bites it: zombie feet are tougher and stomp harder, and each bite heals it · smack the marked foot first', 'Coughs on a pizza: it eats its own slices and its perk stops · click the pizza to cure it'],
    upkeep: (_f, _dt, a) => {
      // ——— zombie upkeep: keep the green tint, and a landed zombie stomp bites off one more slice ———
      for (const [o, z] of zombies) {
        if (!o.alive) {
          zombies.delete(o);
          continue;
        }
        if (!imgOf(o).tintFill) o.tint(ZOMBIE_TINT);
        if (o.state === 'descend') {
          z.armed = true;
          z.p = o.target;
          z.slices = o.target?.slices ?? 0;
        } else if (z.armed && (o.state === 'stomp' || o.state === 'lift')) {
          z.armed = false;
          const p = z.p;
          if (p && !p.dead && p.slices < z.slices) {
            a.sc.time.delayedCall(150, () => !p.dead && a.inWave() && a.hitPizza(p, 1, 'ZOMBIE BITE!', '#9be36a'));
          }
        }
      }
      if (biting) biting.reticle.setPosition(biting.o.cx, biting.o.cy);
    },
    update: (f, dt, a) => {
      const h = heat(a);

      // ——— Bite: mark a regular foot, then swing over and bite it ———
      if (!biting && !coughing && bite.tick(dt)) {
        bite.every = h.cooldown(5);
        const prey = a.allFeet().filter((o) => o.alive && !o.isBossLike && !zombies.has(o) && o.y > 120 && o.x > 100 && o.x < 1820);
        const o = prey.sort((p, q) => Math.abs(p.x - f.x) - Math.abs(q.x - f.x))[0];
        if (!o) bite.t = 1;
        else {
          const reticle = a.sc.add.image(o.cx, o.cy, 'p_reticle').setScale(0.6).setTint(ZOMBIE_GLOW);
          a.fxLayer.add(reticle);
          a.sc.tweens.add({ targets: reticle, scale: 0.7, duration: 260, yoyo: true, repeat: -1 });
          biting = { o, reticle };
          const forget = bin.add(() => {
            reticle.destroy();
            biting = null;
          });
          a.quip(o.x, Math.max(150, o.cy - 140), 'BITE INCOMING!', '#9be36a', 36);
          a.quip(f.x, Math.max(280, f.cy - 170), 'BRAAAINS…', '#9be36a', 40);
          a.sfx('sfx_warning', { volume: 0.4, rate: 0.9 });
          a.sc.time.delayedCall(h.windup(1.4) * 1000, () => {
            forget();
            if (!f.alive || !a.inWave()) return;
            if (!o.alive) {
              a.quip(f.x, Math.max(280, f.cy - 160), 'NO SNACK!', '#7dff9a', 38);
              return;
            }
            // the phase-change beat holds it still; skip this bite
            if (Number(f.brain.transformT ?? 0) > 0 || f.stunT > 0 || f.puppet) return;
            const home = { x: f.x, y: f.y };
            const side = Math.sign(f.x - o.x) || 1;
            const gap = (f.meta.halfWidth * f.scale + o.meta.halfWidth * o.scale) * 0.55;
            f.puppet = true;
            a.sc.tweens.add({
              targets: f,
              x: o.x + side * gap,
              y: o.y,
              duration: 220,
              ease: 'Back.In',
              onComplete: () => {
                if (f.alive && o.alive && a.inWave()) {
                  zombify(o);
                  a.fx.impact(o.cx, o.cy, true);
                  a.quip(o.x, Math.max(150, o.cy - 150), 'CHOMP! ZOMBIE!', '#9be36a', 42);
                  a.sfx('sfx_squish', { volume: 0.9, rate: 0.7 });
                  // each bite heals the boss a little
                  const heal = Math.min(f.maxHp - f.hp, Math.round(f.maxHp * (h.rank === 0 ? 0.03 : 0.04)));
                  if (heal > 0) {
                    f.hp += heal;
                    a.fx.number(f.cx, f.cy - 120, heal, 'heal');
                    a.fx.healBurst(f.cx, f.cy);
                  }
                }
                a.sc.tweens.add({
                  targets: f,
                  x: home.x,
                  y: home.y,
                  duration: 320,
                  delay: 180,
                  ease: 'Sine.Out',
                  onComplete: () => {
                    if (Number(f.brain.transformT ?? 0) <= 0) f.puppet = false;
                  },
                });
              },
            });
          });
        }
      }

      // ——— Cough: a green cloud turns a pizza zombie; it eats itself until it's clicked better ———
      if (f.phase >= 2 && !sick && !coughing && !biting && cough.tick(dt)) {
        cough.every = h.cooldown(11);
        const p = rnd(a.alivePizzas());
        if (p) {
          coughing = true;
          const sec = h.windup(1.2);
          mark(a, 'p_reticle', p.x, p.surfaceY - 30, sec, 0.7).setTint(ZOMBIE_GLOW);
          a.quip(f.x, Math.max(280, f.cy - 170), 'COUGH… COUGH…', '#9be36a', 42);
          f.tint(ZOMBIE_TINT);
          a.sc.time.delayedCall(sec * 1000, () => {
            coughing = false;
            f.tint(null);
            if (!f.alive || !a.inWave() || p.dead) return;
            a.sfx('sfx_squish', { volume: 0.8, rate: 0.5 });
            const puff = a.sc.add.image(f.x, f.cy, 'p_cough').setScale(0.3).setAlpha(0.9);
            a.fxLayer.add(puff);
            a.sc.tweens.add({
              targets: puff,
              x: p.x,
              y: p.surfaceY - 60,
              scale: 0.9,
              duration: 500,
              ease: 'Quad.Out',
              onComplete: () => {
                a.sc.tweens.add({ targets: puff, alpha: 0, scale: 1.2, duration: 300, onComplete: () => puff.destroy() });
                if (p.dead || !f.alive || !a.inWave()) return;
                const glow = a.sc.add.image(p.x, p.surfaceY - 10, 'glow').setTint(ZOMBIE_GLOW).setBlendMode(Phaser.BlendModes.ADD).setScale(2.4, 1.2).setAlpha(0.5);
                a.fxLayer.add(glow);
                a.sc.tweens.add({ targets: glow, alpha: 0.25, duration: 500, yoyo: true, repeat: -1 });
                a.freezePerk(p, 9999);
                a.quip(p.x, p.surfaceY - 190, rnd(GROANS)!, '#9be36a', 46);
                const prop = hitProp(a, {
                  key: 'p_cough',
                  x: p.x,
                  y: p.surfaceY - 90,
                  scale: 0.55,
                  hits: h.hits(4),
                  follow: () => ({ x: p.x, y: p.surfaceY - 90 }),
                  contains: (px, py) => Math.abs(px - p.x) < p.radius && py > p.surfaceY - 170 && py < p.surfaceY + p.radius * 0.6,
                  badgeDy: -70,
                  onHit: () => a.fx.healBurst(p.x, p.surfaceY - 20),
                  onClear: () => cure(a),
                });
                prop.img.setAlpha(0.8);
                sick = { p, prop, glow, munch: new Every(h.cooldown(3.5), h.cooldown(3.5)) };
                bin.add(() => cure(a, true));
              },
            });
          });
        }
      }
      if (sick) {
        const s = sick;
        if (s.p.dead) cure(a, true);
        else {
          // a sickly green pizza (its own redraws clear tints, so keep it on)
          imgOf(s.p).setTint(ZOMBIE_TINT);
          s.glow.setPosition(s.p.x, s.p.surfaceY - 10);
          // it eats its own slices, but never the last one
          if (s.munch.tick(dt) && s.p.slices > 1) {
            a.hitPizza(s.p, 1, 'MUNCH!', '#9be36a');
            a.sfx('sfx_squish', { volume: 0.6, rate: 0.8 });
            if (Math.random() < 0.5) a.quip(s.p.x + 90, s.p.surfaceY - 120, rnd(GROANS)!, '#9be36a', 30);
          }
        }
      }
    },
    onDeath: (_f, a) => {
      bin.flush();
      cure(a, true);
      // the zombies come round when it goes down
      for (const o of zombies.keys()) {
        unzombify(o);
        if (o.alive) a.fx.healBurst(o.cx, o.cy);
      }
      zombies.clear();
    },
  };
};

// ——— 24. PHANTOM KING (boss) ———

/** Each echo uses one weak version of its boss's signature move. */
type EchoMove = (e: Foot, a: Arena, f: Foot) => void;

/** A short wind-up over the pizza below the echo: smack the echo once before it lands to stop it. */
const echoWindup = (label: string, landLabel: string): EchoMove => (e, a) => {
  const p = e.target && !e.target.dead ? e.target : laneOf(a, e);
  if (!p) return;
  const h = heat(a);
  const sec = h.windup(1.6);
  const hp0 = e.hp;
  mark(a, 'p_reticle', p.x, p.surfaceY - 30, sec, 0.6);
  a.quip(e.x, Math.max(150, e.cy - 140), label, '#9ad8ff', 34);
  a.sc.tweens.add({ targets: e.root, scaleY: e.root.scaleY * 0.88, duration: sec * 500, yoyo: true });
  a.sc.time.delayedCall(sec * 1000, () => {
    if (!e.alive || p.dead || !a.inWave()) return;
    if (e.hp < hp0) {
      a.quip(e.x, Math.max(150, e.cy - 140), 'INTERRUPTED!', '#7dff9a', 36);
      e.stun(1.2);
      return;
    }
    a.hitPizza(p, 1, landLabel, '#9ad8ff');
  });
};

/** One projectile at the peel: bat it away (it hurts the echo), or it lands. */
const echoThrow = (key: string, onLand: (a: Arena) => void, look: { scale?: number; tint?: number } = {}): EchoMove => (e, a) => {
  throwAtPeel(a, key, { x: e.x, y: e.cy }, 1.4, () => onLand(a), () => e.alive && a.damageFoot(e, Math.ceil(e.maxHp * 0.5), 'RETURN TO SENDER!'), 8, look);
  a.sfx('sfx_whoosh', { rate: 1.1, volume: 0.6 });
};

const ECHOES: Record<string, { move: string; act: EchoMove }> = {
  bigfoot: { move: 'BIG STEP', act: echoWindup('BIG STEP…', 'BIG STEP!') },
  trex: { move: 'TAIL SWIPE', act: echoWindup('TAIL SWIPE…', 'SWIPED!') },
  ironheel: { move: 'RIVET SHOT', act: echoThrow('p_valve', (a) => a.stunPeel(0.5, 'RIVETED!'), { scale: 0.6, tint: 0xc0c6cf }) },
  nonna: { move: 'FLYING SLIPPER', act: echoThrow('p_slipper', (a) => a.stunPeel(0.5, 'SLIPPERED!'), { scale: 0.6 }) },
  clownking: { move: 'CREAM PIE', act: echoThrow('p_pie', (a) => screenSplat(a, 'p_cream', a.peelPoint().x, a.peelPoint().y, 1, 'WIPED!'), { scale: 0.6 }) },
  cosmiccroc: {
    move: 'METEOR',
    act: (e, a) => {
      const p = e.target && !e.target.dead ? e.target : laneOf(a, e);
      if (p) dropOn(a, e, p, 'p_snowball', heat(a).windup(1.4), 'METEOR!', { scale: 0.6, tint: 0xff8a3d });
    },
  },
};

const ECHO_TINT = 0x9ad8ff;

const phantomking = (): Brain => {
  const summon = new Every(7, 1.5);
  const hop = new Every(8, 8);
  let hopping = false;
  let end: (() => void) | null = null;
  // each echo's next move (seconds), and a gap so two echoes never act at once
  const echoes = new Map<Foot, number>();
  let gapT = 0;
  const banish = (a: Arena) => {
    for (const e of echoes.keys()) {
      if (!e.alive) continue;
      a.fx.puff(e.cx, e.cy, 10);
      e.die();
    }
    echoes.clear();
  };
  const stopEchoes = (a: Arena) => {
    banish(a);
    end?.();
    end = null;
  };
  return {
    names: ['FADE', 'ECHOES', 'POSSESSION'],
    info: ['Fades out between stomps · hit it while it is solid', 'Only echoes of past bosses join it, each with one weak move · clear them fast and stop their moves', 'Possesses a pizza, then hops to another every 8 s · Peel Slam while the Ghost is solid'],
    onPhase: (_f, ph, a) => {
      if (ph === 2) {
        // the living feet back away: the only other feet this phase are the echoes
        end = retreat(a);
        summon.t = 1.5;
      }
      if (ph === 3) {
        stopEchoes(a);
        const p = rnd(a.alivePizzas());
        if (p) a.possess(p);
        a.sfx('sfx_possess');
      }
    },
    update: (f, dt, a) => {
      const h = heat(a);
      if (f.phase === 2) {
        gapT -= dt;
        for (const [e, t] of echoes) {
          if (!e.alive) {
            echoes.delete(e);
            continue;
          }
          if (!imgOf(e).tintFill) e.tint(ECHO_TINT);
          // it acts once it has settled into its lane, then every few seconds
          if (e.state !== 'hover' && e.state !== 'descend') continue;
          const left = t - dt;
          echoes.set(e, left);
          if (left > 0 || gapT > 0 || e.stunT > 0) continue;
          echoes.set(e, h.cooldown(6));
          gapT = 1.8;
          const kind = ECHOES[e.type.id];
          if (kind) kind.act(e, a, f);
        }
        const most = h.rank >= 2 ? 3 : 2;
        // each echo gets a pizza of its own, never the one under the king (they'd stack on top of each other)
        const taken = [f, ...echoes.keys()].map((o) => o.target);
        const free = a.alivePizzas().filter((p) => !taken.includes(p));
        if (summon.tick(dt) && echoes.size < most && free.length) {
          summon.every = h.cooldown(6);
          const id = rnd(Object.keys(ECHOES))!;
          const e = a.spawn(id, rnd(free)!);
          if (e) {
            e.brain.echo = true;
            e.maxHp = e.hp = Math.round(f.maxHp * 0.06);
            // smaller and see-through (setSize keeps the hit area and lane width in step with the art)
            e.setSize(0.62, 0);
            e.setVisualAlpha(0.55);
            e.tint(ECHO_TINT);
            echoes.set(e, 1.4);
            a.quip(e.x, 220, `ECHO OF ${FOOT_BY_ID[id].name}: ${ECHOES[id].move}`, '#9ad8ff', 32);
          }
        }
      }
      if (f.phase >= 3) {
        if (a.possessed() && !hopping && hop.tick(dt)) {
          const others = a.alivePizzas().filter((p) => p !== a.possessed());
          const next = rnd(others);
          if (next) {
            // tell: the next pizza glows for a second before the curse moves
            hopping = true;
            const glow = a.sc.add.image(next.x, next.surfaceY + 20, 'glow').setTint(0xc9a8ff).setBlendMode(Phaser.BlendModes.ADD).setScale(2.2, 1.1).setAlpha(0.8);
            a.fxLayer.add(glow);
            a.quip(next.x, next.surfaceY - 160, 'THE CURSE STIRS…', '#c9a8ff', 34);
            a.sc.time.delayedCall(1000, () => {
              glow.destroy();
              hopping = false;
              if (!f.alive || !a.possessed() || next.dead) return;
              a.possess(next);
              a.quip(next.x, next.surfaceY - 160, 'THE CURSE MOVES!', '#c9a8ff', 38);
              a.sfx('sfx_possess', { volume: 0.7 });
            });
          }
        }
        // a slam while the ghost is solid breaks the possession
        if (a.possessed() && !f.phased && a.now() - a.slammedAt() < 0.2) {
          a.possess(null);
          f.stun(2.5);
          a.banner('EXORCISED!', 'The curse is broken', 'clear');
          a.sfx('sfx_levelup');
          a.sc.time.delayedCall(9000, () => {
            if (!f.alive || !a.inWave()) return;
            const p = rnd(a.alivePizzas());
            if (p) a.possess(p);
          });
        }
      }
    },
    onDeath: (_f, a) => {
      stopEchoes(a);
      a.possess(null);
    },
  };
};

export const brains: Record<string, () => Brain> = { milkshake, rinkqueen, lumberjack, yeti, poltergeist, phantomking };
