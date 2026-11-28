// Boss brains for Batpeel's Gotham (a nemesis stage, src/game/nemesis.ts): Bunion (mini, wave 63) and the Jokester
// (wave 65), met only with Batpeel equipped. Shared helpers and heat scaling live in ./kit.ts; the act's comic print
// (speech bubbles, impact words) comes from src/game/acts/act7.ts; props are drawn in src/content/props/gotham.ts.
//
// Choices the spec left open (numbers are Regular; heat() scales them):
// - Bunion has three Venom vials (left, toe, right). Each fills in 12 s, staggered; a full one glows and takes
//   2 smacks to drain (he's winded: 1 s stun and a chunk of damage). Every full vial speeds him up 15%; with two
//   or more his stomps take a slice more. All three full: VENOM SURGE, a 2 s roar (drain a vial to stop it), then
//   he rampages across 2 pizzas and the vials empty. Phases: 1 on Mild, 2 on every other heat.
// - At half health he grabs a pizza: THE BREAK. Feet back off, a strain bar fills over 7 s and every smack on him
//   pushes it back; empty it and he lets go (stunned), fill it and the pizza loses half its slices (never its
//   last on Mild). After the break his vials fill twice as fast.
// - The Jokester's phases: JOKE'S ON YOU (boxes), LAUGHING GAS (gas and boxes), THE BIG TOP (both, Extra Hot and
//   up) and always last THE PUNCHLINE (the gauntlet); Mild skips the gas. Boxes: 2 every 9.6 s (3 in the Big
//   Top), half bombs. A bomb ticks for 4.8 s and takes 2 smacks to defuse, or it takes a slice. A gift opens by
//   itself after 2.6 s (a slice back, or a shield on a full pizza, and 5 tips); smack it and you break it.
// - Laughing gas: a cloud over a pizza's lane for 7 s (two clouds in the Big Top). Feet inside dance: they can't
//   be hit and move 40% slower. Two smacks on the cloud blow it away and leave them giggling (stunned 1.5 s).
// - The Punchline: he's guarded and the feet back off while a round of 4 trick props comes at you, about 2 s
//   apart: a jack-in-the-box (3 smacks before it springs), a cream pie at your peel (smack it back at him), wind-up
//   teeth that run at a pizza (2 smacks), a 10-ton weight (smack it before it lands) and a BANG! flag gun aimed at
//   your peel (1 smack or a 1 s peel stun). When the round is over his guard drops for 6.5 s, dizzy (2 s more and
//   a big hit if you beat every prop). Mild: 3 props, slower, never a pizza's last slice.

import { clockOf } from '../../core/clock';
import Phaser from 'phaser';
import { BACKDROPS, type ArenaId, type BackdropId } from '../../art/backdrops';
import { H, HOVER_Y, TABLE_Y, W } from '../../config';
import { BUNION_CONTACT, FLOWER, VIALS } from '../../content/art/gotham';
import { audio } from '../../systems/audio';
import { bubble, impactWord } from '../acts/act7';
import type { Arena } from '../arena';
import type { Foot } from '../Foot';
import type { Pizza } from '../Pizza';
import { LOCATION_MUSIC, bossMusic, locationFor } from '../Run';
import { type Brain, type PhaseCard, type Prop, Every, auraFor, dropOn, heat, hitProp, mark, retreat, rnd, screenSplat, shield, takeLane, throwAtPeel, type Takeover } from './kit';
import { cpick, crand } from '../../systems/cosmeticRandom';

// ——— Helpers ———

/** Things a fight has put on the table, cleared together when the boss goes down. */
class Bin {
  private items = new Set<() => void>();
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

/** Scene internals a few set-pieces reach for (the Arena has no call for them). */
interface SceneBits {
  backdrop: { show(id: BackdropId, fadeMs?: number): void };
  tintGrade(hex: string, ms: number): void;
  currentBackdrop: BackdropId | null;
  run: { wave: number; super: number };
  director: { phases: Map<Foot, number> };
  giveTips?(n: number, x: number, y: number): void;
}
const bits = (a: Arena) => a as unknown as SceneBits;

/** The mini-boss takes the stage: its arena and music crossfade in over the location. */
function enterArena(a: Arena, id: ArenaId): void {
  const sc = bits(a);
  if (!sc.backdrop || !BACKDROPS[id]) return;
  sc.backdrop.show(id, 1400);
  sc.tintGrade(BACKDROPS[id].light, 1400);
  sc.currentBackdrop = id;
  void audio.music(a.sc, bossMusic(id), 1200);
}

/** …and gives it back when it goes down. */
function leaveArena(a: Arena): void {
  const sc = bits(a);
  if (!a.inWave() || !sc.backdrop) return;
  const loc = locationFor(sc.run.wave);
  sc.backdrop.show(loc, 1800);
  sc.tintGrade(BACKDROPS[loc].light, 1800);
  sc.currentBackdrop = loc;
  void audio.music(a.sc, LOCATION_MUSIC[loc], 1800);
}

/** Design point (x, y) on a foot's art → screen (props that ride on the foot). */
function onFoot(f: Foot, x: number, y: number, contactY: number): { x: number; y: number } {
  const s = f.type.scale;
  return { x: f.x + (x - 110) * s * f.root.scaleX, y: f.y + (y - contactY) * s * f.root.scaleY };
}

/** Hit a pizza, but on Mild never take its last slice. */
function hitSoft(a: Arena, p: Pizza, n: number, label: string, color: string): void {
  if (p.dead) return;
  const take = heat(a).rank === 0 ? Math.min(n, p.slices - 1) : n;
  if (take <= 0) {
    a.quip(p.x, p.surfaceY - 150, 'HANGING ON!', '#ffd23f', 34);
    return;
  }
  a.hitPizza(p, take, label, color);
}

/** Pieces fly off and tumble (a death that lands). */
function scatter(a: Arena, x: number, y: number, key: string, n: number, look: { scale?: number; tints?: number[]; spread?: number } = {}): void {
  for (let i = 0; i < n; i++) {
    const img = a.sc.add.image(x, y, key).setScale((look.scale ?? 0.5) * (0.6 + crand() * 0.7)).setAngle(crand() * 360);
    if (look.tints) img.setTint(look.tints[i % look.tints.length]);
    a.fxLayer.add(img);
    const vx = (crand() - 0.5) * (look.spread ?? 1300);
    const vy = -320 - crand() * 700;
    const spin = (crand() - 0.5) * 900;
    const st = { t: 0 };
    a.sc.tweens.add({
      targets: st,
      t: 1.6,
      duration: 1600,
      onUpdate: () => {
        img.setPosition(x + vx * st.t, y + vy * st.t + 900 * st.t * st.t);
        img.angle += spin * 0.016;
        img.setAlpha(Math.min(1, (1.6 - st.t) * 2));
      },
      onComplete: () => img.destroy(),
    });
  }
}

/** Gentle follow towards a point (bosses moved by hand). */
function glide(f: Foot, x: number, y: number, dt: number, k = 3): void {
  f.x += (x - f.x) * Math.min(1, dt * k);
  f.y += (y - f.y) * Math.min(1, dt * k);
}

// ——— BUNION (mini-boss, wave 63) ———

interface Vial {
  level: number;
  glass: Phaser.GameObjects.Image;
  liquid: Phaser.GameObjects.Rectangle;
  prop: Prop | null;
}

const VIAL_SCALE = 0.5;

const bunion = (): Brain => {
  const bin = new Bin();
  let started = false;
  let baseSpeed = 1;
  let broke = false;
  let breaking = false;
  let surging = false;
  let rampaging = false;
  let after = false;
  let quipT = 8;
  const vials: Vial[] = [];
  let strain: { bar: Phaser.GameObjects.Graphics; crack: Phaser.GameObjects.Image; p: Pizza; v: number; hold: Takeover | null; end: () => void; tick: number } | null = null;

  const full = () => vials.filter((v) => v.prop?.alive()).length;

  const place = (f: Foot) => {
    const s = f.type.scale * f.root.scaleX * VIAL_SCALE;
    vials.forEach((v, i) => {
      const at = onFoot(f, VIALS[i][0], VIALS[i][1], BUNION_CONTACT);
      v.glass.setPosition(at.x, at.y).setScale(s);
      v.liquid.setPosition(at.x, at.y + 57 * s).setSize(46 * s, Math.max(0.5, 114 * s * v.level));
    });
  };

  const drain = (a: Arena, f: Foot, v: Vial, winded: boolean) => {
    v.level = 0;
    v.prop?.clear();
    v.prop = null;
    // (the Pit, src/content/art/scene-bunion.ts, listens: its Venom glow gutters)
    a.sc.events.emit('bunion-drain', full());
    a.sfx('sfx_bunion_drain', { throttle: 120 });
    a.fx.puff(v.glass.x, v.glass.y, 10);
    for (let i = 0; i < 6; i++) {
      const d = a.sc.add.image(v.glass.x, v.glass.y, 'soft').setTint(0x7dff6a).setScale(0.12).setBlendMode(Phaser.BlendModes.ADD);
      a.fxLayer.add(d);
      a.sc.tweens.add({ targets: d, x: d.x + (crand() - 0.5) * 200, y: d.y + 120 + crand() * 120, alpha: 0, duration: 600, onComplete: () => d.destroy() });
    }
    if (winded && f.alive) {
      impactWord(a, v.glass.x, v.glass.y - 80, 1.1, 'GLUG!');
      a.damageFoot(f, f.maxHp * 0.03);
      if (f.alive && !breaking) {
        f.stun(1);
        a.quip(f.x, f.cy - 200, 'WINDED!', '#7dff9a', 40);
      }
    }
  };

  const fillUp = (a: Arena, f: Foot, v: Vial) => {
    const h = heat(a);
    a.sfx('sfx_bunion_pump', { throttle: 200 });
    a.quip(v.glass.x, v.glass.y - 110, 'PUMPED!', '#7dff6a', 30);
    v.prop = hitProp(a, {
      key: 'p_gt_vial',
      x: v.glass.x,
      y: v.glass.y,
      scale: f.type.scale * f.root.scaleX * VIAL_SCALE,
      hits: h.hits(2),
      r: 80,
      badgeDy: -110,
      hitSfx: 'sfx_bunion_tubehit',
      clearSfx: 'sfx_bunion_tubehit',
      label: 'DRAINED!',
      follow: () => (f.alive ? { x: v.glass.x, y: v.glass.y } : null),
      onClear: () => {
        v.prop = null;
        drain(a, f, v, true);
      },
    });
    const prop = v.prop;
    bin.add(() => prop.destroy());
    // the Pit's tanks boil hard, their glow flares and the tubes pulse
    a.sc.events.emit('bunion-pump', full());
  };

  /** All three vials full: he roars, then rampages (unless a vial is drained first). */
  const surge = (a: Arena, f: Foot) => {
    const h = heat(a);
    surging = true;
    a.sc.events.emit('bunion-surge');
    a.sfx('sfx_bunion_surge');
    a.banner('VENOM SURGE!', 'Drain a vial to stop it', 'phase');
    bubble(a, 'THE OVEN RISES!', f, 1600);
    f.tint(0xa8ff90);
    a.flash(180, 120, 255, 90);
    a.shake(500, 0.008);
    const sx = f.root.scaleX;
    const sy = f.root.scaleY;
    a.sc.tweens.add({ targets: f.root, scaleX: sx * 1.12, scaleY: sy * 1.12, duration: 300, yoyo: true, repeat: 2, ease: 'Sine.InOut' });
    a.sc.time.delayedCall(h.windup(2) * 1000, () => {
      surging = false;
      f.tint(null);
      a.sc.tweens.killTweensOf(f.root);
      f.root.setScale(sx, sy);
      if (!f.alive || breaking || !a.inWave()) return;
      if (full() < 3) {
        a.quip(f.x, f.cy - 200, 'SURGE STOPPED!', '#7dff9a', 44);
        a.sfx('sfx_bunion_saved');
        f.stun(1.2);
        return;
      }
      rampage(a, f);
    });
  };

  const rampage = (a: Arena, f: Foot) => {
    const h = heat(a);
    rampaging = true;
    f.puppet = true;
    const order = [...a.alivePizzas()].sort(() => Math.random() - 0.5).slice(0, h.rank >= 2 ? 3 : 2);
    let i = 0;
    const done = () => {
      rampaging = false;
      f.puppet = false;
      // the Venom is spent
      for (const v of vials) if (v.prop?.alive() || v.level > 0) {
        v.prop?.destroy();
        v.prop = null;
        v.level = 0;
      }
      a.quip(f.x, f.cy - 200, 'VENOM SPENT', '#c8ffb0', 36);
      a.sc.events.emit('bunion-spent');
    };
    const hop = () => {
      if (!f.alive || !a.inWave()) return done();
      const p = order[i++];
      if (!p || p.dead) {
        clockOf(a.sc).tween({ targets: f, y: (f.hoverY ?? HOVER_Y) - 20, duration: 380, ease: 'Quad.Out', onComplete: done });
        return;
      }
      mark(a, 'p_reticle', p.x, p.surfaceY - 30, h.windup(0.6), 0.8);
      clockOf(a.sc).tween({ targets: f, x: p.x, y: (f.hoverY ?? HOVER_Y) - 70, duration: h.windup(340), ease: 'Sine.InOut', onComplete: () => {
        if (!f.alive) return done();
        clockOf(a.sc).tween({ targets: f, y: p.surfaceY + 4, duration: 200, ease: 'Quad.In', onComplete: () => {
          if (f.alive && !p.dead) {
            a.sfx('sfx_bunion_smash');
            a.shake(300, 0.012);
            a.fx.ring(p.x, p.surfaceY, 0x7dff6a, 1.3, 0.35);
            impactWord(a, p.x, p.surfaceY - 200, 1.2, 'CRUNCH!');
            hitSoft(a, p, h.slices(1), 'VENOM SURGE!', '#7dff6a');
          }
          f.target = p;
          a.sc.time.delayedCall(160, hop);
        } });
      } });
    };
    hop();
  };

  const drawStrain = (f: Foot) => {
    if (!strain) return;
    const { bar, p, v } = strain;
    const w = 220;
    const x = p.x - w / 2;
    // over his cuff: he sits on the pizza, so the bar rides above him (clear of the boss bar)
    const y = Math.max(240, f.y - f.meta.footHeight * f.scale - 60);
    bar.clear();
    bar.fillStyle(0x2a1810, 0.9).fillRoundedRect(x - 6, y - 6, w + 12, 34, 12);
    bar.fillStyle(v > 0.7 ? 0xff3a2a : v > 0.4 ? 0xffb030 : 0x7dff6a, 1).fillRoundedRect(x, y, Math.max(8, w * v), 22, 8);
    bar.lineStyle(4, 0xfff6e2, 1).strokeRoundedRect(x - 6, y - 6, w + 12, 34, 12);
  };

  const startBreak = (a: Arena, f: Foot) => {
    const h = heat(a);
    const p = [...a.alivePizzas()].sort((x, y) => y.slices - x.slices)[0];
    if (!p) return;
    broke = true;
    breaking = true;
    // whatever move he was in the middle of gives way to the grab
    a.sc.tweens.killTweensOf(f);
    f.shielded = false;
    for (const v of vials) v.prop?.destroy();
    for (const v of vials) v.prop = null;
    a.sc.events.emit('bunion-break');
    a.sfx('sfx_bunion_grab');
    a.bossMove(f, 'THE BREAK', 'He grabs a pizza to break it · Smack him again and again to make him let go');
    a.banner('THE BREAK!', 'Smack him to make him let go', 'phase');
    bubble(a, 'I WILL BREAK YOUR PIZZA.', f, 2000);
    const end = retreat(a);
    const hold = takeLane(a, f, p);
    f.puppet = true;
    const bar = a.sc.add.graphics();
    a.fxLayer.add(bar);
    const crack = a.sc.add.image(p.x, p.surfaceY - p.radius * 0.2, 'p_gt_crack').setScale((p.radius * 1.6) / 260).setAlpha(0);
    a.fxLayer.add(crack);
    strain = { bar, crack, p, v: 0.2, hold, end, tick: 0 };
    // he plants himself on the pizza
    clockOf(a.sc).tween({ targets: f, x: p.x, y: p.surfaceY - 30, duration: 500, ease: 'Quad.In', onComplete: () => {
      a.shake(240, 0.008);
      a.sfx('sfx_bunion_smash', { volume: 0.6 });
    } });
    void h;
  };

  const endBreak = (a: Arena, f: Foot, saved: boolean) => {
    if (!strain) return;
    const s = strain;
    strain = null;
    breaking = false;
    after = true;
    s.bar.destroy();
    s.hold?.release();
    s.end();
    if (saved) {
      a.sfx('sfx_bunion_saved');
      impactWord(a, f.cx, f.cy - 80, 1.6, 'LET GO!');
      a.sc.tweens.add({ targets: s.crack, alpha: 0, duration: 400, onComplete: () => s.crack.destroy() });
      clockOf(a.sc).tween({ targets: f, y: (f.hoverY ?? HOVER_Y) - 20, duration: 420, ease: 'Back.Out', onComplete: () => {
        f.puppet = false;
        if (f.alive) f.stun(2);
      } });
    } else {
      const h = heat(a);
      a.sfx('sfx_bunion_break');
      a.shake(500, 0.016);
      a.flash(200, 255, 255, 255);
      impactWord(a, s.p.x, s.p.surfaceY - 180, 2, 'SNAP!');
      const half = Math.ceil(s.p.slices / 2) + [0, 0, 0, 1, 1][h.rank];
      hitSoft(a, s.p, half, 'BROKEN!', '#ff6a4a');
      a.sc.tweens.add({ targets: s.crack, alpha: 0, delay: 600, duration: 400, onComplete: () => s.crack.destroy() });
      bubble(a, 'YOUR PIZZA... IS BROKEN.', f, 1800);
      clockOf(a.sc).tween({ targets: f, y: (f.hoverY ?? HOVER_Y) - 20, duration: 500, ease: 'Quad.Out', onComplete: () => (f.puppet = false) });
    }
    if (f.phase >= 2 || heat(a).rank === 0) a.bossMove(f, 'OVERDOSE', 'His vials fill twice as fast now · Keep draining them before all three fill');
  };

  return {
    names: ['VENOM', 'THE BREAK'],
    info: [
      'His Venom vials fill and make him faster and harder-hitting; all three full and he surges · Smack a glowing vial to drain it',
      'He grabs a pizza to break it, then his vials fill twice as fast · Smack him again and again to make him let go',
    ],
    cards: [
      {
        what: 'His three Venom vials fill up and glow, making him faster',
        hit: 'Smack a glowing vial to drain it and wind him',
        miss: 'All three full: he surges and stomps across your pizzas',
        show: [{ key: 'p_gt_vial', label: 'Venom vial', hits: (h) => h.hits(2) }],
      },
      {
        what: 'He grabs your fullest pizza and strains to break it',
        hit: 'Smack him again and again to make him let go',
        miss: 'It snaps: that pizza loses half its slices',
        show: [
          { key: '@boss', label: 'Him' },
          { key: 'p_gt_vial', label: 'Then: vials', hits: (h) => h.hits(2) },
        ],
      },
    ],
    // one phase on Mild, two on every other heat: the second starts with the break at half health
    phases: (a) => (a ? (heat(a).rank === 0 ? 1 : 2) : 0),
    update(f, dt, a) {
      const h = heat(a);
      if (!started) {
        started = true;
        baseSpeed = f.speedMul;
        enterArena(a, 'bunion');
        // a heavy drop from above: a thud, a shockwave and his line
        f.puppet = true;
        f.shielded = true;
        f.y = -440;
        clockOf(a.sc).tween({
          targets: f,
          y: (f.hoverY ?? HOVER_Y) - 20,
          duration: 760,
          ease: 'Quad.In',
          onComplete: () => {
            if (!f.alive) return;
            a.sfx('sfx_bunion_enter');
            a.shake(600, 0.016);
            a.rumble(1, 420);
            a.flash(160, 200, 255, 180);
            a.fx.ring(f.cx, f.cy + 60, 0x7dff6a, 2.2, 0.35);
            a.fx.puff(f.x, f.y, 20);
            impactWord(a, f.x, f.cy - 60, 1.8, 'CRUNCH!');
            const sx = f.root.scaleX;
            const sy = f.root.scaleY;
            a.sc.tweens.add({ targets: f.root, scaleX: sx * 1.15, scaleY: sy * 0.82, duration: 120, yoyo: true, ease: 'Quad.Out' });
            a.sc.time.delayedCall(450, () => f.alive && bubble(a, 'NOBODY CARED WHO I WAS UNTIL I PUT ON THE BOOT.', f, 2600));
            a.sc.time.delayedCall(700, () => {
              f.puppet = false;
              f.shielded = false;
            });
          },
        });
        for (let i = 0; i < 3; i++) {
          const glass = a.sc.add.image(0, 0, 'p_gt_glass');
          const liquid = a.sc.add.rectangle(0, 0, 10, 10, 0x5de83a, 0.92).setOrigin(0.5, 1);
          a.fxLayer.add([liquid, glass]);
          vials.push({ level: i * 0.3, glass, liquid, prop: null });
          bin.add(() => {
            glass.destroy();
            liquid.destroy();
          });
        }
      }
      // the break: a strain bar fills; smacks (onSmacked) push it back
      if (strain) {
        const sec = h.windup(6);
        strain.v += dt / sec;
        strain.tick -= dt;
        if (strain.tick <= 0) {
          strain.tick = 0.6;
          a.sfx('sfx_bunion_strain', { volume: 0.7, throttle: 300 });
          strain.crack.setAlpha(Math.min(1, strain.v * 1.2));
          a.sc.tweens.add({ targets: f.root, angle: { from: -3, to: 3 }, duration: 120, yoyo: true });
        }
        drawStrain(f);
        if (strain.v >= 1) endBreak(a, f, false);
        return;
      }
      if (!broke && f.hp <= f.maxHp * 0.5 && !rampaging && !surging) {
        startBreak(a, f);
        return;
      }
      if (rampaging || surging) return;
      // vials fill one after another (twice as fast after the break)
      const fillSec = h.cooldown(after ? 6 : 12) / (h.rank === 0 ? 1 : 1);
      for (const v of vials) {
        if (v.prop) continue;
        v.level = Math.min(1, v.level + dt / fillSec);
        if (v.level >= 1) fillUp(a, f, v);
      }
      const n = full();
      f.speedMul = baseSpeed * (1 + 0.15 * n);
      f.setPhaseAura(n >= 2 ? 0x7dff6a : auraFor(f.phase));
      if (n >= 3 && !f.puppet) surge(a, f);
      quipT -= dt;
      if (quipT <= 0) {
        quipT = 11 + crand() * 6;
        bubble(a, cpick(['YOU MERELY ADOPTED THE CRUST.', 'NOW IS NOT THE TIME FOR SNACKS.', 'PEACE HAS COST YOU YOUR TOPPINGS.'])!, f);
      }
    },
    upkeep(f) {
      if (vials.length) place(f);
      if (strain) f.puppet = true;
    },
    onSmacked(f, a) {
      if (strain) {
        const h = heat(a);
        strain.v -= h.rank === 0 ? 0.12 : 0.09;
        a.fx.impact(f.cx + (crand() - 0.5) * 80, f.cy, false);
        if (crand() < 0.35) impactWord(a, f.cx, f.cy - 60, 0.9, cpick(['POW!', 'BIFF!', 'WHAM!']));
        if (strain.v <= 0) endBreak(a, f, true);
        return false;
      }
      // smacks during the surge's roar also count against his guard: hit the vials to stop it
      return false;
    },
    onStomp(f, p, a) {
      // two or more full vials: his stomps hit harder
      if (full() >= 2 && !p.dead) {
        a.sfx('sfx_bunion_smash', { volume: 0.5 });
        hitSoft(a, p, 1, 'VENOM!', '#7dff6a');
      }
      void f;
    },
    onDeath(f, a) {
      const at = vials.map((v) => ({ x: v.glass.x, y: v.glass.y }));
      if (strain) {
        strain.bar.destroy();
        strain.crack.destroy();
        strain.hold?.release();
        strain.end();
        strain = null;
      }
      bin.flush();
      vials.length = 0;
      f.speedMul = baseSpeed;
      // the vials burst, he deflates and topples
      a.dramatic(1.1);
      a.sfx('sfx_bunion_death');
      a.flash(240, 200, 255, 180);
      a.shake(700, 0.016);
      a.rumble(1, 500);
      for (const p of at) {
        a.fx.explosion(p.x, p.y, 90);
        scatter(a, p.x, p.y, 'shard', 6, { scale: 0.7, tints: [0x7dff6a, 0xd8f2ff] });
        for (let i = 0; i < 8; i++) {
          const d = a.sc.add.image(p.x, p.y, 'soft').setTint(0x7dff6a).setScale(0.18).setBlendMode(Phaser.BlendModes.ADD);
          a.fxLayer.add(d);
          a.sc.tweens.add({ targets: d, x: d.x + (crand() - 0.5) * 400, y: d.y + (crand() - 0.7) * 300, alpha: 0, scale: 0.05, duration: 900, onComplete: () => d.destroy() });
        }
      }
      scatter(a, f.cx, f.cy, 'confetti', 18, { scale: 1.2, tints: [0x2c2e36, 0x7dff6a, 0xc9cfd8, 0x3a3c46] });
      impactWord(a, f.cx, f.cy - 80, 2.2, 'DEFLATED!');
      a.fx.party(f.cx, f.cy, 30);
      a.sc.time.delayedCall(300, () => bubble(a, 'YOU... MERELY... ADOPTED... THE CRUST...', { x: f.x, y: f.cy - 160 }, 2000));
      leaveArena(a);
    },
  };
};

// ——— THE JOKESTER (boss, wave 65) ———

type Move = 'boxes' | 'gas' | 'both' | 'gauntlet';

const NAMES: Record<Move, [string, string]> = {
  boxes: ['JOKE\'S ON YOU', 'Joke boxes land on your pizzas: ticking bombs blow, gifts with bows give a slice or a shield · Smack the bombs, leave the gifts'],
  gas: ['LAUGHING GAS', 'Gas clouds over a lane make feet dance out of reach, and the boxes keep coming · Smack a cloud twice to blow it away'],
  both: ['THE BIG TOP', 'Three boxes at a time and two gas clouds · Defuse the bombs first, then clear the gas'],
  gauntlet: ['THE PUNCHLINE', 'Guarded, he sends a round of trick props at you · Beat each prop, then hit him while he\'s dizzy'],
};

const CARDS: Record<Move, PhaseCard> = {
  boxes: {
    what: 'He tosses joke boxes onto your pizzas: ticking bombs and gifts',
    hit: 'Smack the bombs to defuse them, and leave the gifts alone',
    miss: 'A bomb that blows takes a slice; a smacked gift breaks',
    show: [
      { key: 'p_gt_bomb', label: 'Bomb', hits: (h) => h.hits(2) },
      { key: 'p_gt_gift', label: 'Gift: leave it', watch: true },
    ],
  },
  gas: {
    what: 'Laughing gas over a lane makes the feet dance out of reach',
    hit: 'Smack a gas cloud twice to blow it away',
    miss: 'Dancing feet can’t be hit, and the bombs keep coming',
    show: [
      { key: 'p_gt_gas', label: 'Gas cloud', hits: 2 },
      { key: 'p_gt_bomb', label: 'Bomb', hits: (h) => h.hits(2) },
      { key: 'p_gt_gift', label: 'Gift: leave it', watch: true },
    ],
  },
  both: {
    what: 'Three joke boxes at a time and two gas clouds',
    hit: 'Defuse the bombs first, then clear the gas',
    miss: 'Each bomb that blows takes a slice',
    show: [
      { key: 'p_gt_bomb', label: 'Bomb', hits: (h) => h.hits(2) },
      { key: 'p_gt_gas', label: 'Gas cloud', hits: 2 },
      { key: 'p_gt_gift', label: 'Gift: leave it', watch: true },
    ],
  },
  gauntlet: {
    what: 'He hides behind his guard and sends a round of trick props',
    hit: 'Beat each prop, then hit him while he’s dizzy',
    miss: 'Slices lost, a stunned or slowed peel, and less time to hit him',
    show: [
      { key: 'p_gt_jack', label: 'Jack-in-the-box', hits: (h) => h.hits(3) },
      { key: 'p_gt_teeth', label: 'Wind-up teeth', hits: (h) => h.hits(2) },
      { key: 'p_gt_pie', label: 'Cream pie', hits: 1 },
    ],
  },
};

const PLAN: Record<number, Move[]> = {
  2: ['boxes', 'gauntlet'],
  3: ['boxes', 'gas', 'gauntlet'],
  4: ['boxes', 'gas', 'both', 'gauntlet'],
};

interface Cloud {
  x: number;
  prop: Prop;
  dancers: Set<Foot>;
}

const jokester = (): Brain => {
  const bin = new Bin();
  let started = false;
  let plan: Move[] = PLAN[4];
  const boxT = new Every(9.6, 4);
  const gasT = new Every(10, 3);
  const clouds: Cloud[] = [];
  let quipT = 7;
  // the gauntlet
  let gauntlet = false;
  let round: { left: number; fails: number; endRetreat: () => void } | null = null;
  let windowT = 0;
  let nextRound = 0;
  let stars: Phaser.GameObjects.Image | null = null;

  const names = Object.values(NAMES).map((n) => n[0]);
  const info = Object.values(NAMES).map((n) => n[1]);
  const cards = (Object.keys(NAMES) as Move[]).map((m) => CARDS[m]);
  const move = (f: Foot): Move => plan[Math.min(plan.length, f.phase) - 1] ?? 'boxes';
  const setPlan = (n: number) => {
    plan = PLAN[Math.max(2, Math.min(4, n))];
    names.splice(0, names.length, ...plan.map((m) => NAMES[m][0]));
    info.splice(0, info.length, ...plan.map((m) => NAMES[m][1]));
    cards.splice(0, cards.length, ...plan.map((m) => CARDS[m]));
  };

  // ——— joke boxes ———
  const toss = (a: Arena, f: Foot, p: Pizza, bomb: boolean) => {
    a.sfx('sfx_jokester_toss', { throttle: 120 });
    const key = bomb ? 'p_gt_bomb' : 'p_gt_gift';
    const s = (p.radius * 1.15) / 200;
    const img = a.sc.add.image(f.x, f.cy, key).setScale(s * 0.6);
    a.fxLayer.add(img);
    const to = { x: p.x, y: p.surfaceY - p.radius * 0.45 };
    const st = { t: 0 };
    const from = { x: f.x, y: f.cy };
    let gone = false;
    const kill = () => {
      gone = true;
      img.destroy();
    };
    bin.add(() => !gone && kill());
    clockOf(a.sc).tween({
      targets: st,
      t: 1,
      duration: 700,
      onUpdate: () => {
        img.setPosition(from.x + (to.x - from.x) * st.t, from.y + (to.y - from.y) * st.t - Math.sin(st.t * Math.PI) * 260);
        img.setScale(s * (0.6 + 0.4 * st.t));
        img.angle = st.t * 360;
      },
      onComplete: () => {
        if (gone) return;
        img.angle = 0;
        if (!f.alive || p.dead || !a.inWave()) return kill();
        a.sfx('sfx_jokester_land', { throttle: 100 });
        a.sc.tweens.add({ targets: img, scaleY: s * 0.8, scaleX: s * 1.12, duration: 90, yoyo: true });
        if (bomb) armBomb(a, f, p, img, s);
        else armGift(a, p, img, s);
      },
    });
  };

  const armBomb = (a: Arena, f: Foot, p: Pizza, img: Phaser.GameObjects.Image, s: number) => {
    const h = heat(a);
    const sec = h.windup(4);
    const shake = a.sc.tweens.add({ targets: img, angle: { from: -6, to: 6 }, duration: 90, yoyo: true, repeat: -1 });
    const tick = a.sc.time.addEvent({ delay: 1000, loop: true, callback: () => img.active && a.sfx('sfx_jokester_tick', { volume: 0.7, throttle: 400 }) });
    a.sfx('sfx_jokester_tick', { volume: 0.7, throttle: 300 });
    img.setVisible(false);
    const prop = hitProp(a, {
      key: 'p_gt_bomb',
      x: img.x,
      y: img.y,
      scale: s,
      hits: h.hits(2),
      r: 90,
      sec,
      badgeDy: -100,
      hitSfx: 'sfx_kit_prophit',
      clearSfx: 'sfx_jokester_defuse',
      label: 'DEFUSED!',
      follow: () => (p.dead ? null : { x: p.x, y: p.surfaceY - p.radius * 0.45 }),
      onClear: () => {
        cleanup();
      },
      onFail: () => {
        cleanup();
        if (!f.alive || p.dead) return;
        // (Ha-Ha Funhouse, src/content/art/scene-jokester.ts, listens: the face's eyes flare, the laugh box lights)
        a.sc.events.emit('jokester-bomb', p.x);
        a.sfx('sfx_jokester_boom');
        a.fx.explosion(p.x, p.surfaceY - 30, 140);
        a.fx.party(p.x, p.surfaceY - 40, 20);
        impactWord(a, p.x, p.surfaceY - 200, 1.2, 'KA-BOOM!');
        hitSoft(a, p, h.slices(1), 'GOTCHA!', '#ff4a6a');
      },
    });
    const cleanup = () => {
      shake.remove();
      tick.remove();
      img.destroy();
    };
    bin.add(() => {
      prop.destroy();
      cleanup();
    });
  };

  const armGift = (a: Arena, p: Pizza, img: Phaser.GameObjects.Image, s: number) => {
    let done = false;
    const sparkle = a.sc.time.addEvent({ delay: 260, loop: true, callback: () => img.active && a.fx.glint(img.x + (crand() - 0.5) * 80 * s * 5, img.y - 30) });
    a.sc.tweens.add({ targets: img, y: img.y - 10, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const finish = () => {
      done = true;
      sparkle.remove();
      a.sc.tweens.killTweensOf(img);
    };
    a.addClickable({
      get x() {
        return img.x;
      },
      get y() {
        return img.y;
      },
      r: 80,
      priority: 2,
      alive: () => !done && img.active,
      hit: () => {
        if (done) return;
        finish();
        // smacked: the gift breaks and the treat is lost
        a.sfx('sfx_kit_prophit');
        a.quip(img.x, img.y - 90, 'YOU BROKE IT!', '#ff8a6a', 34);
        a.fx.puff(img.x, img.y, 10);
        a.sc.tweens.add({ targets: img, alpha: 0, scaleY: s * 0.2, duration: 220, onComplete: () => img.destroy() });
      },
    });
    a.sc.time.delayedCall(2600, () => {
      if (done || !img.active) return;
      finish();
      a.sfx('sfx_jokester_gift');
      a.fx.party(img.x, img.y - 20, 26);
      a.sc.tweens.add({ targets: img, alpha: 0, scale: s * 1.4, duration: 300, onComplete: () => img.destroy() });
      if (p.dead) return;
      if (p.slices < p.maxSlices) {
        p.heal(1);
        a.fx.healBurst(p.x, p.surfaceY - 40);
        a.quip(p.x, p.surfaceY - 150, 'A SLICE BACK!', '#7dff9a', 34);
      } else {
        p.setShield(p.shieldCharges + 1);
        a.quip(p.x, p.surfaceY - 150, 'A SHIELD!', '#5fd8ff', 34);
      }
      bits(a).giveTips?.(5, p.x, p.surfaceY - 60);
    });
    bin.add(() => {
      if (!done) finish();
      if (img.active) img.destroy();
    });
  };

  const boxes = (a: Arena, f: Foot, n: number) => {
    const ps = [...a.alivePizzas()].sort(() => Math.random() - 0.5).slice(0, n);
    if (!ps.length) return;
    a.sfx('sfx_jokester_laugh', { volume: 0.8, throttle: 1500 });
    bubble(a, rnd(['PRESENTS!', 'I GOT YOU SOMETHING!', 'OPEN IT! OPEN IT!', 'GUESS WHICH ONE!'])!, f, 1300);
    // at least one bomb, at least one gift when there are two or more
    const bombs = ps.map((_, i) => (ps.length === 1 ? true : i === 0 ? true : i === 1 ? false : Math.random() < 0.5));
    bombs.sort(() => Math.random() - 0.5);
    ps.forEach((p, i) => a.sc.time.delayedCall(i * 260, () => f.alive && a.inWave() && toss(a, f, p, bombs[i])));
  };

  // ——— laughing gas ———
  const gas = (a: Arena, f: Foot, n: number) => {
    const h = heat(a);
    const free = a.alivePizzas().filter((p) => !clouds.some((c) => Math.abs(c.x - p.x) < 200));
    const ps = [...free].sort(() => Math.random() - 0.5).slice(0, n);
    if (!ps.length) return;
    // the tell: his lapel flower swells and hisses
    const fl = onFoot(f, FLOWER.x, FLOWER.y, FLOWER.contact);
    const glow = a.sc.add.image(fl.x, fl.y, 'glow').setTint(0xb88ae8).setBlendMode(Phaser.BlendModes.ADD).setScale(0.4);
    a.fxLayer.add(glow);
    a.sc.tweens.add({ targets: glow, scale: 1.2, alpha: 0, duration: h.windup(800), onComplete: () => glow.destroy() });
    a.sfx('sfx_jokester_gas');
    a.quip(f.x, f.cy - 190, 'SMELL THE FLOWER!', '#c8a8ff', 36);
    for (const p of ps) {
      mark(a, 'p_reticle', p.x, p.surfaceY - 30, h.windup(0.8), 0.7);
      a.sc.time.delayedCall(h.windup(800), () => {
        if (!f.alive || !a.inWave()) return;
        const x = p.x;
        const y = 520;
        const dancers = new Set<Foot>();
        const prop = hitProp(a, {
          key: 'p_gt_gas',
          x,
          y,
          scale: 1.15,
          hits: 2,
          r: 170,
          sec: 7,
          badgeDy: -150,
          contains: (px, py) => Math.abs(px - x) < 190 && py > y - 160 && py < y + 180,
          hitSfx: 'sfx_jokester_clear',
          clearSfx: 'sfx_jokester_clear',
          label: 'CLEARED!',
          onClear: () => endCloud(a, c, true),
          onFail: () => endCloud(a, c, false),
        });
        prop.img.setAlpha(0.88);
        a.sc.tweens.add({ targets: prop.img, scaleX: 1.25, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        const c: Cloud = { x, prop, dancers };
        clouds.push(c);
        bin.add(() => {
          prop.destroy();
          endCloud(a, c, false);
        });
      });
    }
  };

  const unDance = (d: Foot) => {
    d.phased = false;
    d.brain.dancing = false;
    const sx = Number(d.brain.danceSX ?? 0);
    if (sx) d.root.setScale(sx, Number(d.brain.danceSY));
    d.tint(null);
  };

  const endCloud = (a: Arena, c: Cloud, cleared: boolean) => {
    const i = clouds.indexOf(c);
    if (i < 0) return;
    clouds.splice(i, 1);
    for (const d of c.dancers) {
      if (!d.alive) continue;
      unDance(d);
      if (cleared) {
        d.stun(1.5);
        a.quip(d.x, d.cy - 110, 'HEE HEE!', '#c8a8ff', 30);
      }
    }
    if (cleared) a.sfx('sfx_jokester_giggle', { throttle: 300 });
    c.dancers.clear();
  };

  const danceTick = (a: Arena, dt: number) => {
    for (const c of clouds) {
      for (const d of a.allFeet()) {
        if (!d.alive || d.isBossLike) continue;
        const inside = Math.abs(d.cx - c.x) < 180 && d.y > 160;
        if (inside && !c.dancers.has(d) && !d.brain.dancing) {
          c.dancers.add(d);
          d.brain.dancing = true;
          d.brain.danceSX = d.root.scaleX;
          d.brain.danceSY = d.root.scaleY;
          d.tint(0xd8c0ff);
          if (crand() < 0.5) a.sfx('sfx_jokester_giggle', { volume: 0.6, throttle: 700 });
        } else if (!inside && c.dancers.has(d)) {
          c.dancers.delete(d);
          unDance(d);
        }
      }
      for (const d of c.dancers) {
        if (!d.alive) continue;
        // dancing: out of reach, slower, bouncing to the beat
        d.phased = true;
        d.slowT = Math.max(d.slowT, 0.2);
        d.slowPct = Math.max(d.slowPct, 0.4);
        const b = Math.sin(a.now() * 12 + d.x);
        d.root.setScale(Number(d.brain.danceSX) * (1 + b * 0.08), Number(d.brain.danceSY) * (1 - b * 0.08));
        if (crand() < dt * 1.5) {
          const n = a.sc.add.image(d.cx + (crand() - 0.5) * 60, d.cy - 80, 'p_gt_note').setScale(0.5);
          a.fxLayer.add(n);
          a.sc.tweens.add({ targets: n, y: n.y - 90, x: n.x + (crand() - 0.5) * 60, alpha: 0, angle: (crand() - 0.5) * 60, duration: 900, onComplete: () => n.destroy() });
        }
      }
    }
  };

  // ——— the gauntlet ———
  type Trick = (a: Arena, f: Foot, done: (ok: boolean) => void) => void;

  const jack: Trick = (a, _f, done) => {
    const h = heat(a);
    const p = rnd(a.alivePizzas());
    if (!p) return done(true);
    const x = p.x + p.radius * 0.6;
    const y = p.surfaceY - 90;
    a.sfx('sfx_jokester_jack');
    const prop = hitProp(a, {
      key: 'p_gt_jack',
      x,
      y,
      scale: 0.7,
      hits: h.hits(3),
      r: 90,
      sec: h.windup(3.4),
      badgeDy: -90,
      label: 'SHUSHED!',
      onClear: () => done(true),
      onFail: () => {
        a.sfx('sfx_jokester_spring');
        const out = a.sc.add.image(x, y + 50, 'p_gt_jackout').setOrigin(0.5, 0.95).setScale(0.6, 0.1);
        a.fxLayer.add(out);
        a.sc.tweens.add({ targets: out, scaleY: 0.6, duration: 260, ease: 'Back.Out' });
        a.sc.tweens.add({ targets: out, alpha: 0, delay: 1000, duration: 300, onComplete: () => out.destroy() });
        impactWord(a, x, y - 160, 1.2, 'BOING!');
        hitSoft(a, p, heat(a).slices(1), 'SURPRISE!', '#ffd23f');
        done(false);
      },
    });
    // the crank turns as it winds up
    a.sc.tweens.add({ targets: prop.img, angle: { from: -4, to: 4 }, duration: 160, yoyo: true, repeat: -1 });
    bin.add(() => prop.destroy());
  };

  const pie: Trick = (a, f, done) => {
    const h = heat(a);
    a.sfx('sfx_jokester_pie');
    a.quip(f.x, f.cy - 190, 'CATCH!', '#ffffff', 40);
    throwAtPeel(
      a,
      'p_gt_pie',
      { x: f.x, y: f.cy },
      h.windup(1.8),
      () => {
        a.sfx('sfx_jokester_splat');
        const p = a.peelPoint();
        screenSplat(a, 'p_gt_cream', Phaser.Math.Clamp(p.x, 300, W - 300), Phaser.Math.Clamp(p.y, 300, H - 300), 3, 'WIPED!');
        a.slowPeel(h.stun(1.2));
        done(false);
      },
      () => {
        // batted back: it flies home and splats him
        const img = a.sc.add.image(a.peelPoint().x, a.peelPoint().y, 'p_gt_pie').setScale(0.8);
        a.fxLayer.add(img);
        a.sc.tweens.add({ targets: img, x: f.x, y: f.cy, angle: 540, duration: 420, ease: 'Quad.In', onComplete: () => {
          img.destroy();
          if (!f.alive) return;
          a.sfx('sfx_jokester_splat');
          impactWord(a, f.cx, f.cy - 60, 1.3, 'SPLAT!');
          a.fx.splat(f.cx, f.cy, true);
          f.flash(0xffffff, 200);
        } });
        done(true);
      },
      8,
      { scale: 0.8 },
    );
  };

  const teeth: Trick = (a, _f, done) => {
    const h = heat(a);
    const p = rnd(a.alivePizzas());
    if (!p) return done(true);
    const left = p.x > W / 2;
    const pos = { x: left ? -80 : W + 80, y: p.surfaceY + 20 };
    const sec = h.windup(3.2);
    a.sfx('sfx_jokester_teeth');
    const chatter = a.sc.time.addEvent({ delay: 1100, loop: true, callback: () => a.sfx('sfx_jokester_teeth', { volume: 0.7, throttle: 500 }) });
    const mover = a.sc.tweens.add({ targets: pos, x: p.x + (left ? -p.radius * 0.7 : p.radius * 0.7), duration: sec * 1000, ease: 'Linear' });
    const prop = hitProp(a, {
      key: 'p_gt_teeth',
      x: pos.x,
      y: pos.y,
      scale: 0.75,
      hits: h.hits(2),
      r: 80,
      sec,
      badgeDy: -80,
      label: 'WOUND DOWN!',
      follow: () => pos,
      onClear: () => {
        chatter.remove();
        mover.remove();
        done(true);
      },
      onFail: () => {
        chatter.remove();
        if (!p.dead) {
          impactWord(a, p.x, p.surfaceY - 160, 1, 'CHOMP!');
          hitSoft(a, p, 1, 'CHOMPED!', '#ff7a9a');
        }
        done(false);
      },
    });
    prop.img.setFlipX(!left);
    a.sc.tweens.add({ targets: prop.img, scaleY: 0.68, duration: 70, yoyo: true, repeat: -1 });
    bin.add(() => {
      chatter.remove();
      mover.remove();
      prop.destroy();
    });
  };

  const weight: Trick = (a, f, done) => {
    const h = heat(a);
    const p = rnd(a.alivePizzas());
    if (!p) return done(true);
    const before = p.slices;
    const sec = h.windup(1.6);
    dropOn(a, f, p, 'p_gt_weight', sec, 'SQUASHED!', { scale: 0.75, color: '#c9cfd8', fallSfx: 'sfx_jokester_weight', landSfx: 'sfx_jokester_thud' });
    // dropOn reports nothing back: the pizza keeping its slices means it was smacked in time
    a.sc.time.delayedCall((0.9 + sec + 1.1) * 1000 + 120, () => done(p.dead ? false : p.slices >= before));
  };

  const gun: Trick = (a, _f, done) => {
    const h = heat(a);
    const pp = a.peelPoint();
    const x = Phaser.Math.Clamp(pp.x + (pp.x > W / 2 ? -280 : 280), 160, W - 160);
    const y = Phaser.Math.Clamp(pp.y - 60, 300, TABLE_Y - 80);
    a.sfx('sfx_warning', { volume: 0.4, rate: 1.4 });
    const prop = hitProp(a, {
      key: 'p_gt_gun',
      x,
      y,
      scale: 0.8,
      hits: h.hits(1),
      r: 90,
      sec: h.windup(1.8),
      badgeDy: -80,
      label: 'DISARMED!',
      onClear: () => done(true),
      onFail: () => {
        a.sfx('sfx_jokester_bang');
        const flag = a.sc.add.image(x + (pp.x > x ? 120 : -120), y - 10, 'p_gt_bang').setScale(0.1);
        if (pp.x < x) flag.setFlipX(false);
        a.fxLayer.add(flag);
        a.sc.tweens.add({ targets: flag, scale: 0.8, duration: 160, ease: 'Back.Out' });
        a.sc.tweens.add({ targets: flag, alpha: 0, delay: 900, duration: 300, onComplete: () => flag.destroy() });
        a.stunPeel(h.stun(1.2), 'BANG!');
        done(false);
      },
    });
    if (pp.x < x) prop.img.setFlipX(false);
    else prop.img.setFlipX(true);
    bin.add(() => prop.destroy());
  };

  const TRICKS: Trick[] = [jack, pie, teeth, weight, gun];

  const startRound = (a: Arena, f: Foot) => {
    const h = heat(a);
    const n = [3, 4, 4, 5, 5][h.rank];
    const list = [...TRICKS].sort(() => Math.random() - 0.5);
    while (list.length < n) list.push(rnd(TRICKS)!);
    shield(a, f, true);
    const endRetreat = retreat(a);
    round = { left: n, fails: 0, endRetreat };
    a.sfx('sfx_jokester_laugh');
    bubble(a, rnd(['HERE COMES THE PUNCHLINE!', 'TRICK OR TREAT? TRICK!', 'AND FOR MY NEXT TRICK…'])!, f, 1600);
    list.slice(0, n).forEach((trick, i) =>
      a.sc.time.delayedCall(800 + i * h.windup(2.2) * 1000, () => {
        if (!f.alive || !a.inWave() || !round) return;
        trick(a, f, (ok) => {
          if (!round) return;
          if (!ok) round.fails++;
          round.left--;
          if (round.left <= 0) openWindow(a, f);
        });
      }),
    );
  };

  const openWindow = (a: Arena, f: Foot) => {
    if (!round) return;
    const flawless = round.fails === 0;
    round.endRetreat();
    round = null;
    if (!f.alive) return;
    const h = heat(a);
    windowT = (h.rank === 0 ? 8 : 6.5) + (flawless ? 2 : 0);
    shield(a, f, false);
    a.sfx('sfx_jokester_window');
    a.banner(flawless ? 'FLAWLESS!' : 'HE\'S DIZZY!', 'Hit him now', 'phase');
    if (flawless) {
      impactWord(a, f.cx, f.cy - 80, 1.8, 'KAPOW!');
      a.damageFoot(f, f.maxHp * 0.04);
    }
    stars?.destroy();
    stars = a.sc.add.image(f.x, f.cy - 140, 'star').setScale(0.7).setTint(0x9be23a);
    a.fxLayer.add(stars);
    a.sc.tweens.add({ targets: stars, angle: 360, duration: 900, repeat: -1 });
    a.sc.tweens.add({ targets: f.root, angle: { from: -10, to: 10 }, duration: 380, yoyo: true, repeat: Math.ceil(windowT / 0.76), ease: 'Sine.InOut' });
  };

  const endGauntlet = (a: Arena, f: Foot) => {
    gauntlet = false;
    if (round) {
      round.endRetreat();
      round = null;
    }
    stars?.destroy();
    stars = null;
    if (f.shielded) shield(a, f, false);
  };

  return {
    names,
    info,
    cards,
    setPhases: setPlan,
    update(f, dt, a) {
      const h = heat(a);
      if (!started) {
        started = true;
        const n = bits(a).director.phases.get(f) ?? a.bossPhases();
        // the banners follow this heat's plan (the gauntlet is always last)
        setPlan(n);
        a.bossMove(f, names[f.phase - 1] ?? names[0], info[f.phase - 1] ?? info[0]);
        // the entrance: a jack-in-the-box lands, winds up and he springs out of it
        f.puppet = true;
        f.shielded = true;
        f.x = W / 2;
        f.y = TABLE_Y + 120;
        f.root.setVisible(false);
        const box = a.sc.add.image(W / 2, -200, 'p_gt_jack').setScale(1.4);
        a.fxLayer.add(box);
        a.sc.tweens.add({ targets: box, y: TABLE_Y - 110, duration: 600, ease: 'Bounce.Out', onComplete: () => {
          a.sfx('sfx_jokester_jack');
          a.shake(200, 0.006);
          a.sc.tweens.add({ targets: box, angle: { from: -5, to: 5 }, duration: 120, yoyo: true, repeat: 6 });
        } });
        a.sc.time.delayedCall(2000, () => {
          a.sfx('sfx_jokester_enter');
          a.sc.events.emit('jokester-phase', 1);
          a.flash(180, 220, 200, 255);
          a.fx.party(W / 2, TABLE_Y - 160, 50);
          scatter(a, W / 2, TABLE_Y - 160, 'p_gt_card', 10, { scale: 0.6, spread: 1600 });
          a.sc.tweens.add({ targets: box, alpha: 0, scaleY: 0.4, duration: 300, onComplete: () => box.destroy() });
          if (!f.alive) return;
          f.root.setVisible(true);
          impactWord(a, W / 2, TABLE_Y - 260, 1.8, 'SURPRISE!');
          clockOf(a.sc).tween({ targets: f, y: (f.hoverY ?? HOVER_Y) - 20, duration: 700, ease: 'Back.Out', onComplete: () => {
            f.puppet = false;
            f.shielded = false;
          } });
          a.sc.time.delayedCall(500, () => {
            if (!f.alive) return;
            a.sfx('sfx_jokester_laugh');
            bubble(a, 'WHY SO SOLEMN?', f, 2200);
          });
        });
        bin.add(() => box.active && box.destroy());
        return;
      }
      danceTick(a, dt);
      if (stars) stars.setPosition(f.x, f.cy - 150);
      const m = move(f);
      if (m === 'gauntlet') {
        if (!gauntlet) {
          gauntlet = true;
          nextRound = 1.2;
          // the old tricks clear away for the finale
          for (const c of [...clouds]) {
            c.prop.destroy();
            endCloud(a, c, false);
          }
        }
        // he holds centre stage while the props come, and sinks lower while he's dizzy
        f.puppet = true;
        if (windowT > 0) {
          windowT -= dt;
          glide(f, W / 2, 610, dt, 2);
          if (windowT <= 0) {
            stars?.destroy();
            stars = null;
            a.sc.tweens.killTweensOf(f.root);
            f.root.angle = 0;
            nextRound = 1;
            a.sfx('sfx_jokester_laugh', { volume: 0.8 });
            bubble(a, 'AGAIN! AGAIN!', f, 1400);
          }
          return;
        }
        glide(f, W / 2, 520, dt, 2);
        if (!round) {
          nextRound -= dt;
          if (nextRound <= 0) startRound(a, f);
        }
        return;
      }
      const n = m === 'both' ? 3 : 2;
      boxT.every = h.cooldown(m === 'both' ? 8.5 : 8);
      if (boxT.tick(dt) && a.inWave()) boxes(a, f, n);
      if (m === 'gas' || m === 'both') {
        gasT.every = h.cooldown(m === 'both' ? 9 : 10);
        if (gasT.tick(dt) && a.inWave()) gas(a, f, m === 'both' ? 2 : 1);
      }
      quipT -= dt;
      if (quipT <= 0) {
        quipT = 10 + crand() * 6;
        bubble(a, cpick(['HA! HA! HA-HA-HA!', 'HERE\'S MY CARD.', 'JUST A LITTLE PRANK!', 'LET\'S PUT A SMILE ON THAT PIZZA.'])!, f);
        a.sfx('sfx_jokester_laugh', { volume: 0.6, throttle: 2000 });
      }
    },
    upkeep(f) {
      if (gauntlet) f.puppet = true;
    },
    onPhase(f, phase, a) {
      // the transform beat restores the shield state; the gauntlet sets its own
      if (move(f) === 'gauntlet') a.sfx('sfx_jokester_laugh');
      // the funhouse goes wild: its bulbs strobe, the carousel lurches, the coaster car is sent round
      a.sc.events.emit('jokester-phase', phase);
    },
    onDeath(f, a) {
      for (const c of [...clouds]) endCloud(a, c, false);
      bin.flush();
      endGauntlet(a, f);
      for (const d of a.allFeet()) if (d.brain.dancing) unDance(d);
      // he laughs himself to pieces: cards, confetti and a BANG! flag
      a.dramatic(1.2);
      a.sfx('sfx_jokester_death');
      a.flash(260, 255, 255, 255);
      a.shake(700, 0.016);
      a.rumble(1, 500);
      impactWord(a, f.cx, f.cy - 80, 2.2, 'KA-BLAM!');
      scatter(a, f.cx, f.cy, 'p_gt_card', 16, { scale: 0.7, spread: 1500 });
      scatter(a, f.cx, f.cy, 'confetti', 22, { scale: 1.2, tints: [0x5b2a86, 0x9be23a, 0xe0202a, 0xffd23f] });
      a.fx.party(f.cx, f.cy, 50);
      const flag = a.sc.add.image(f.cx, f.cy - 40, 'p_gt_bang').setScale(0.1);
      a.fxLayer.add(flag);
      a.sc.tweens.add({ targets: flag, scale: 1, y: f.cy - 200, duration: 300, ease: 'Back.Out' });
      a.sc.tweens.add({ targets: flag, alpha: 0, delay: 1400, duration: 400, onComplete: () => flag.destroy() });
      a.sc.time.delayedCall(400, () => bubble(a, 'HA... HA... HA...', { x: f.x, y: f.cy - 160 }, 2000));
    },
  };
};

export const brains: Record<string, () => Brain> = { bunion, jokester };
