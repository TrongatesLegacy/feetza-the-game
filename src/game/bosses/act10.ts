// Boss brains, Act 10 · Finale: the Mirror Peel (mini, wave 93), the Sole Proprietor's first meeting
// (wave 95), the Ghost of Feet Future (mini, wave 98) and the Sole Proprietor Unbound (wave 100, five
// phases on every heat). Shared helpers and the heat scaling live in ./kit.ts; this act's props are drawn
// in src/content/props/act10.ts, its runtime layers (glitch, wall of peels, ending) in src/game/finale.ts.

import Phaser from 'phaser';
import { BOSS_MINION } from '../../data/stages';
import { FOOT_BY_ID } from '../../data/feet';
import { audio } from '../../systems/audio';
import { ui } from '../../ui/ui';
import { ABILITIES, abilityFor, type Ability } from '../abilities';
import type { Arena } from '../arena';
import type { Foot } from '../Foot';
import type { Pizza } from '../Pizza';
import { finaleOf, finaleState, peelThumbKey, screenGlitch } from '../finale';
import { LOCATION_MUSIC, locationFor } from '../Run';
import { type Brain, type Prop, Every, heat, hitProp, hitWindup, mark, retreat, rnd, shield } from './kit';

// ——— Act helpers ———

/** Things a fight has put on the table, cleared together (at a phase change or when the boss goes down). */
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

/** The scene's private parts these fights read (the scene is the Arena). */
interface Bits {
  ability: Ability | null;
  peelId: string;
  pointer: { x: number; y: number };
  peelPos: { x: number; y: number };
  run: { wave: number };
  smack(x: number, y: number): void;
  peelSlam(): void;
  /** Stats from the pizzas on the table (eaten ones drop out). */
  recompute(): void;
}
const bits = (a: Arena) => a as unknown as Bits;

/** The private sprite inside a foot or pizza. */
const imgOf = (o: Foot | Pizza) => (o as unknown as { img: Phaser.GameObjects.Image }).img;

const hexStr = (c: number) => '#' + c.toString(16).padStart(6, '0');

/** The ability the player is using (the Classic's Peel Slam when the peel has none). */
function playerAbility(a: Arena): Ability {
  return bits(a).ability ?? ABILITIES.classic;
}

/** Game y below the boss bar and its move line: anything the player must hit starts below this. */
const SAFE_TOP = 260;

/** A fight's own music; the stage loop comes back when a mini-boss goes down. */
function fightMusic(a: Arena, key: string): void {
  void audio.music(a.sc, [key, 'music_boss'], 900);
}
function stageMusic(a: Arena): void {
  void audio.music(a.sc, LOCATION_MUSIC[locationFor(bits(a).run.wave)], 1400);
}

/** A comic-book impact word over a starburst (the Comics act's look). */
function comic(a: Arena, x: number, y: number, word: string, color = '#e5242f'): void {
  const burst = a.sc.add.image(x, y, 'p_comicburst').setScale(0.2).setAngle((Math.random() - 0.5) * 30);
  const t = a.sc.add.text(x, y, word, { fontFamily: 'Lilita One, Fredoka, sans-serif', fontSize: '76px', color, stroke: '#2a1810', strokeThickness: 12 }).setOrigin(0.5).setScale(0.2).setAngle(burst.angle * 0.5);
  a.fxLayer.add([burst, t]);
  a.sc.tweens.add({ targets: [burst, t], scale: 1, duration: 200, ease: 'Back.Out' });
  a.sc.tweens.add({ targets: [burst, t], alpha: 0, duration: 300, delay: 650, onComplete: () => { burst.destroy(); t.destroy(); } });
}

interface DropOpts {
  key: string;
  scale: number;
  /** Seconds it wobbles in place under the boss bar before it falls (it can already be smacked). */
  warn: number;
  /** Seconds to fall to the pizza. */
  fall: number;
  hits: number;
  halfW: number;
  halfH: number;
  color: number;
  label: string;
  hitSfx?: string;
  clearSfx?: string;
  onLand(p: Pizza): void;
  onClear?(): void;
}

/** Something comes down a pizza's lane: a reticle and a glowing lane column warn, it wobbles under the
 * boss bar, then falls at a steady speed while its shadow grows. Smack it `hits` times before it lands. */
function laneDrop(a: Arena, p: Pizza, o: DropOpts, bin: Bin): void {
  const top = SAFE_TOP + o.halfH;
  const total = o.warn + o.fall;
  const endY = () => p.surfaceY - 40;
  const ret = mark(a, 'p_reticle', p.x, p.surfaceY - 30, total, 0.6);
  const col = a.sc.add.graphics();
  a.fxLayer.add(col);
  a.sfx('sfx_warning', { volume: 0.35, rate: 1.3, throttle: 200 });
  const st = { t: 0 };
  const yAt = () => {
    const s = st.t * total;
    if (s < o.warn) return top - 120 * Math.pow(1 - Math.min(1, s / 0.3), 3);
    return top + (endY() - top) * ((s - o.warn) / o.fall);
  };
  let ended = false;
  let tw: Phaser.Tweens.Tween | null = null;
  const finish = (smashed: boolean) => {
    if (ended) return;
    ended = true;
    tw?.remove();
    a.sc.tweens.add({ targets: col, alpha: 0, duration: 200, onComplete: () => col.destroy() });
    if (ret.active) ret.destroy();
    if (!smashed) prop.destroy();
  };
  const prop: Prop = hitProp(a, {
    key: o.key,
    x: p.x,
    y: top - 120,
    scale: o.scale,
    hits: o.hits,
    contains: (px, py) => Math.abs(px - prop.img.x) < o.halfW && Math.abs(py - prop.img.y) < o.halfH,
    follow: () => ({ x: p.x, y: yAt() }),
    label: o.label,
    badgeDy: 0,
    hitSfx: o.hitSfx,
    clearSfx: o.clearSfx,
    onClear: () => {
      finish(true);
      o.onClear?.();
    },
  });
  const forget = bin.add(() => finish(false));
  tw = a.sc.tweens.add({
    targets: st,
    t: 1,
    duration: total * 1000,
    ease: 'Linear',
    onUpdate: () => {
      const s = st.t * total;
      const k = s < o.warn ? 0 : (s - o.warn) / o.fall;
      const y0 = top - o.halfH - 20;
      const y1 = endY() + 30;
      const pulse = 0.75 + Math.sin(a.now() * 10) * 0.25;
      col.clear();
      col.fillStyle(o.color, 0.14 * pulse).fillRoundedRect(p.x - 74, y0, 148, y1 - y0, 36);
      col.lineStyle(9, 0x2a1810, 0.35).strokeRoundedRect(p.x - 74, y0, 148, y1 - y0, 36);
      col.lineStyle(5, o.color, 0.6 + 0.35 * pulse).strokeRoundedRect(p.x - 74, y0, 148, y1 - y0, 36);
      col.fillStyle(0x000000, 0.12 + 0.33 * k).fillEllipse(p.x, p.surfaceY - 6, o.halfW * (0.9 + 0.9 * k), o.halfW * (0.3 + 0.32 * k));
      if (s < o.warn) prop.img.angle = Math.sin(s * 18) * 10;
    },
    onComplete: () => {
      tw = null;
      if (ended) return;
      const x = prop.img.x;
      const y = prop.img.y;
      forget();
      if (!a.inWave() || p.dead) return;
      a.fx.explosion(x, y, 100);
      a.shake(220, 0.007);
      o.onLand(p);
    },
  });
}

/** Shards of dark glass bursting out (the Mirror Peel breaking, echo peels shattering). */
function shatter(a: Arena, x: number, y: number, n: number, tint = 0xb06bff): void {
  for (let i = 0; i < n; i++) {
    const s = a.sc.add.triangle(x, y, 0, 0, 18 + Math.random() * 20, 4, 6, 22 + Math.random() * 18, i % 3 ? 0x1d1a2c : tint).setStrokeStyle(2, 0xe0c8ff, 0.8);
    a.fxLayer.add(s);
    const ang = Math.random() * Math.PI * 2;
    const d = 120 + Math.random() * 260;
    a.sc.tweens.add({ targets: s, x: x + Math.cos(ang) * d, y: y + Math.sin(ang) * d + 160, angle: (Math.random() - 0.5) * 720, alpha: 0, duration: 700 + Math.random() * 400, ease: 'Quad.Out', onComplete: () => s.destroy() });
  }
}

// ——— 37. THE MIRROR PEEL (mini-boss, wave 93) ———

/** What kind of harm a mirrored ability does to your table, from its effects. */
function mirrorKinds(ab: Ability): { slices: boolean; stun: boolean; slow: boolean; heal: boolean } {
  const fx = [...ab.fx, ...(ab.also?.fx ?? [])];
  const has = (...k: string[]) => fx.some((e) => k.includes(e.e));
  const out = { slices: has('dmg', 'burn', 'chain', 'execute', 'throw', 'mark', 'knock', 'stat'), stun: has('stun'), slow: has('slow'), heal: has('heal', 'shield', 'fresh', 'tips') };
  if (!out.slices && !out.stun && !out.slow) out.slices = true;
  return out;
}

const mirrorpeel = (): Brain => {
  const bin = new Bin();
  const phaseBin = new Bin();
  let ready = false;
  const cast = new Every(8, 4.5);
  const copyCd = new Every(2.2, 1);
  let charging = false;
  let copying = false;
  let overlay: Phaser.GameObjects.Image | null = null;
  let eyes: Phaser.GameObjects.Image | null = null;
  let ring: Phaser.GameObjects.Graphics | null = null;
  let orig: ((x: number, y: number) => void) | null = null;
  let pending: { x: number; y: number }[] = [];

  const setup = (f: Foot, a: Arena) => {
    ready = true;
    const h = heat(a);
    cast.every = h.cooldown(8);
    copyCd.every = h.cooldown(2.2);
    // its look is your own peel, mirrored and darkened, with the mirror's angry eyes over it
    const k = f.type.scale;
    overlay = a.sc.add.image(0, -112 * k, 'peel').setOrigin(0.5, 100 / 360).setAngle(180).setFlipX(true).setScale(1.06 * k).setTint(0x8a70c8).setAlpha(0.92);
    eyes = a.sc.add.image(0, -118 * k, 'p_mirroreyes').setScale(0.9 * k);
    f.root.add([overlay, eyes]);
    ring = a.sc.add.graphics();
    a.fxLayer.add(ring);
    fightMusic(a, 'music_boss_mirrorpeel');
    // the entrance: it steps out of a mirror
    screenGlitch(a.sc, 900, 1);
    a.flash(260, 176, 107, 255);
    a.sfx('sfx_mirrorpeel_enter');
    a.quip(f.x, 300, 'YOU, BUT BETTER.', '#c8a8ff', 46);
    const ab = playerAbility(a);
    a.sc.time.delayedCall(1400, () => f.alive && a.quip(f.x, 340, `IT KNOWS ${ab.name.toUpperCase()}!`, hexStr(ab.color), 38));
    // copycat: every smack of yours is noted (misses too) and copied back at your pizzas
    const sc = bits(a);
    orig = sc.smack;
    sc.smack = (x: number, y: number) => {
      orig!.call(a, x, y);
      if (copying && f.alive && a.inWave()) pending.push({ x, y });
    };
    bin.add(() => {
      if (orig) sc.smack = orig;
      orig = null;
      ring?.destroy();
      ring = null;
    });
  };

  /** It charges your own ability, then fires it at your pizzas unless you smack it enough first. */
  const castMirror = (f: Foot, a: Arena) => {
    const h = heat(a);
    const ab = playerAbility(a);
    const kinds = mirrorKinds(ab);
    const wide = ab.fx.some((e) => 'at' in e && (e.at.to === 'all' || e.at.to === 'blast'));
    const n = h.rank === 0 ? 1 : wide ? 2 : 1;
    const targets = [...a.alivePizzas()].sort(() => Math.random() - 0.5).slice(0, n);
    const sec = h.windup(2.6);
    const need = h.hits(3);
    charging = true;
    f.brain.windup = need;
    f.brain.windupCancelled = false;
    a.quip(f.x, Math.max(SAFE_TOP + 30, f.cy - 170), `MIRROR ${ab.name.toUpperCase()}!`, hexStr(ab.color), 44);
    a.sfx('sfx_mirrorpeel_charge');
    for (const p of targets) mark(a, 'p_reticle', p.x, p.surfaceY - 30, sec, 0.7);
    const t0 = a.now();
    const tick = a.sc.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!ring || !f.alive) return;
        const k = Math.min(1, (a.now() - t0) / sec);
        const left = Number(f.brain.windup ?? 0);
        ring.clear();
        ring.lineStyle(22, 0x08060c, 0.7).beginPath().arc(f.cx, f.cy, 150 * f.scale * 0.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k).strokePath();
        ring.lineStyle(14, ab.color, 1).beginPath().arc(f.cx, f.cy, 150 * f.scale * 0.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k).strokePath();
        // pips: smacks still needed to cancel it
        for (let i = 0; i < need; i++) {
          const on = i < need - left;
          const py = Math.max(SAFE_TOP + 30, f.cy - 150 * f.scale * 0.55 - 34);
          ring.fillStyle(0x2a1810, 0.8).fillCircle(f.cx - (need - 1) * 22 + i * 44, py, 16);
          ring.fillStyle(on ? 0x7dff9a : 0xffffff, on ? 1 : 0.6).fillCircle(f.cx - (need - 1) * 22 + i * 44, py, 11);
        }
      },
    });
    f.tint(ab.color);
    const end = phaseBin.add(() => {
      tick.remove();
      ring?.clear();
      charging = false;
      f.tint(null);
    });
    a.sc.time.delayedCall(sec * 1000, () => {
      const cancelled = !!f.brain.windupCancelled;
      f.brain.windup = 0;
      end();
      if (!f.alive || !a.inWave()) return;
      if (cancelled) {
        a.sfx('sfx_mirrorpeel_interrupt');
        shatter(a, f.cx, f.cy, 8);
        return;
      }
      // your ability, turned on you
      a.sfx('sfx_mirrorpeel_fire');
      a.flash(160, (ab.color >> 16) & 255, (ab.color >> 8) & 255, ab.color & 255);
      a.shake(300, 0.008);
      a.quip(960, 380, `${ab.name.toUpperCase()}… REFLECTED!`, hexStr(ab.color), 52);
      for (const p of targets) {
        if (p.dead) continue;
        a.fx.lightning(f.cx, f.cy, p.x, p.surfaceY - 20);
        a.fx.ring(p.x, p.surfaceY - 10, ab.color, 1, 0.4);
        if (ab.vfx === 'frost') a.fx.frost(p.x, p.surfaceY - 30);
        else if (ab.vfx === 'fire') a.fx.burn(p.x, p.surfaceY - 30);
        if (kinds.slices) a.hitPizza(p, h.slices(1), 'MIRRORED!', hexStr(ab.color));
      }
      if (kinds.stun) a.stunPeel(h.stun(1.3), 'YOUR OWN STUN!');
      if (kinds.slow) a.slowPeel(h.stun(3));
      if (kinds.heal) {
        f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.05);
        a.fx.healBurst(f.cx, f.cy);
        a.quip(f.x, f.cy - 160, 'IT HEALS ITSELF!', '#7dff9a', 34);
      }
    });
  };

  /** A dark peel copies a smack of yours, falling on the pizza in that lane. */
  const copySmack = (a: Arena, at: { x: number }) => {
    const h = heat(a);
    const ps = a.alivePizzas();
    if (!ps.length) return;
    const p = ps.reduce((b, q) => (Math.abs(q.x - at.x) < Math.abs(b.x - at.x) ? q : b));
    a.sfx('sfx_mirrorpeel_echo');
    laneDrop(a, p, {
      key: 'p_echopeel', scale: 0.72, warn: h.windup(0.7), fall: h.windup(1.3), hits: 1, halfW: 90, halfH: 110, color: 0xb06bff, label: 'SHATTERED!',
      hitSfx: 'sfx_mirrorpeel_shatter', clearSfx: 'sfx_mirrorpeel_shatter',
      onClear: () => shatter(a, p.x, p.surfaceY - 200, 6),
      onLand: (q) => {
        a.sfx('sfx_mirrorpeel_land');
        a.hitPizza(q, 1, 'COPIED!', '#c8a8ff');
      },
    }, phaseBin);
  };

  return {
    names: ['MIRRORED ABILITY', 'COPYCAT', 'SHATTERED SELF'],
    info: [
      'It charges your own ability and fires it at your pizzas · smack it while its ring fills to cancel it',
      'Every smack you make, a dark peel copies onto a pizza · smash the falling copies, and keep cancelling its ability',
      'Both at once, faster, two copies a smack · cancel the ability first, then smash the copies',
    ],
    upkeep: (f, _dt, a) => {
      if (!ready) setup(f, a);
    },
    update: (f, dt, a) => {
      const h = heat(a);
      if (f.phase >= 2) copying = true;
      const fast = f.phase >= 3 ? 0.7 : f.phase >= 2 ? 1.25 : 1;
      if (!charging && cast.tick(dt / fast)) castMirror(f, a);
      if (copying && pending.length) {
        const at = pending.pop()!;
        pending = [];
        if (copyCd.t <= 0 || copyCd.tick(0)) {
          copyCd.t = copyCd.every;
          copySmack(a, at);
          if (f.phase >= 3 && h.rank >= 2) a.sc.time.delayedCall(350, () => f.alive && copySmack(a, { x: at.x + (Math.random() < 0.5 ? -400 : 400) }));
        }
      } else copyCd.t = Math.max(0, copyCd.t - dt);
    },
    onSmacked: (f, a) => {
      if (hitWindup(f, a, 1.2)) {
        a.sfx('sfx_mirrorpeel_interrupt');
        a.quip(f.x, f.cy - 190, 'YOU BEAT YOURSELF!', '#7dff9a', 40);
      }
      return false;
    },
    onPhase: (f, phase, a) => {
      phaseBin.flush();
      screenGlitch(a.sc, 500, 0.8);
      if (phase === 2) a.quip(960, 420, 'EVERY MOVE YOU MAKE…', '#c8a8ff', 48);
      void f;
    },
    onDeath: (f, a) => {
      phaseBin.flush();
      bin.flush();
      if (!ready) return;
      ready = false;
      // the mirror breaks
      a.sfx('sfx_mirrorpeel_death');
      screenGlitch(a.sc, 700, 1);
      shatter(a, f.cx, f.cy, 26);
      a.flash(240, 220, 200, 255);
      overlay?.destroy();
      eyes?.destroy();
      if (a.inWave()) stageMusic(a);
    },
  };
};

// ——— 38. THE SOLE PROPRIETOR (wave 95: the first meeting) ———

/** Survive his collection agents this long. */
const SURVIVE_SEC = 60;

/** One foot from each boss's minions (every act that's built), never his own finale feet. (GameScene keeps and warms
 * their art while his stage is near.) */
export function agents(): string[] {
  const out: string[] = [];
  for (const [boss, id] of Object.entries(BOSS_MINION)) {
    if (boss === 'soleprop' || boss === 'soleunbound' || out.includes(id) || !FOOT_BY_ID[id]) continue;
    out.push(id);
  }
  return out;
}

const soleprop = (): Brain => {
  const bin = new Bin();
  let t = 0;
  let stage = 0;
  let surviveT = 0;
  let spawnT = 1;
  let watch: Phaser.GameObjects.Container | null = null;
  let hands: Phaser.GameObjects.Graphics | null = null;
  let secs: Phaser.GameObjects.Text | null = null;
  let lastSec = -1;
  let pool: string[] = [];
  let met = new Set<string>();

  const say = (a: Arena, f: Foot, msg: string) => {
    a.sfx('sfx_soleprop_voice');
    // beside him (left of centre when he's on the right), so he stays in view while he talks
    const side = f.x > 960 ? -1 : 1;
    const bubble = a.sc.add.container(f.x + side * 470, Math.max(SAFE_TOP + 90, f.cy - 120));
    const txt = a.sc.add.text(0, 0, msg, { fontFamily: 'Lilita One, Fredoka, sans-serif', fontSize: '40px', color: '#2a1810', align: 'center', wordWrap: { width: 620 } }).setOrigin(0.5);
    const g = a.sc.add.graphics();
    const w = txt.width + 60;
    const hh = txt.height + 40;
    g.fillStyle(0xfff6e2, 1).fillRoundedRect(-w / 2, -hh / 2, w, hh, 26);
    g.lineStyle(7, 0x2a1810, 1).strokeRoundedRect(-w / 2, -hh / 2, w, hh, 26);
    // the tail points back at him
    const tx = -side * (w / 2);
    g.lineStyle(7, 0x2a1810, 1).strokeTriangle(tx, -18, tx, 18, tx - side * 44, 30);
    g.fillStyle(0xfff6e2, 1).fillTriangle(tx + side * 6, -16, tx + side * 6, 16, tx - side * 40, 28);
    bubble.add([g, txt]);
    bubble.setScale(0.3);
    a.fxLayer.add(bubble);
    a.sc.tweens.add({ targets: bubble, scale: 1, duration: 220, ease: 'Back.Out' });
    a.sc.tweens.add({ targets: bubble, alpha: 0, duration: 250, delay: 2100, onComplete: () => bubble.destroy() });
  };

  const buildWatch = (a: Arena) => {
    // his gold pocket watch hangs top right, counting down your shift
    watch = a.sc.add.container(1790, 330).setScale(0);
    const img = a.sc.add.image(0, 0, 'p_watch').setScale(0.6);
    hands = a.sc.add.graphics();
    secs = a.sc.add.text(0, 118, '60', { fontFamily: 'Lilita One, Fredoka, sans-serif', fontSize: '46px', color: '#ffe28a', stroke: '#2a1810', strokeThickness: 10 }).setOrigin(0.5);
    const lbl = a.sc.add.text(0, -122, 'SURVIVE', { fontFamily: 'Lilita One, Fredoka, sans-serif', fontSize: '30px', color: '#fff6e2', stroke: '#2a1810', strokeThickness: 8 }).setOrigin(0.5);
    watch.add([img, hands, secs, lbl]);
    a.fxLayer.add(watch);
    a.sc.tweens.add({ targets: watch, scale: 1, duration: 400, ease: 'Back.Out' });
    a.sc.tweens.add({ targets: watch, angle: { from: -6, to: 6 }, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    bin.add(() => {
      if (!watch) return;
      const w = watch;
      watch = null;
      a.sc.tweens.add({ targets: w, scale: 0, alpha: 0, duration: 300, onComplete: () => w.destroy(true) });
    });
  };

  return {
    names: ['HOSTILE TAKEOVER'],
    info: ['He bought out your next shop (double prices) and sent his collection agents · survive 60 seconds and keep your table'],
    phases: () => 1,
    upkeep: (f, dt, a) => {
      t += dt;
      // ——— the meeting: he comes down, talks, buys, stamps and leaves ———
      if (stage === 0) {
        stage = 1;
        f.puppet = true;
        f.shielded = true;
        f.brain.wasShielded = true;
        f.laneX = 960;
        f.x = 960;
        f.y = -500;
        fightMusic(a, 'music_boss_soleprop');
        a.sfx('sfx_soleprop_enter');
        a.flash(500, 255, 210, 63);
        a.shake(900, 0.008);
        const r = retreat(a);
        bin.add(r);
        a.sc.tweens.add({ targets: f, y: 560, duration: 1800, ease: 'Back.Out' });
        // he talks once the phase banner has gone
        a.sc.time.delayedCall(4900, () => f.alive && say(a, f, 'SO. YOU\'RE THE ONE SMACKING MY STAFF.'));
        a.sc.time.delayedCall(7100, () => f.alive && say(a, f, 'I OWN EVERY PIZZERIA IN EVERY WORLD. NOW I OWN YOUR SHOP.'));
        a.sc.time.delayedCall(9200, () => {
          if (!f.alive) return;
          // the deed of sale, then the stamp
          const deed = a.sc.add.image(960, 560, 'p_contract').setScale(0).setAngle(-4);
          a.fxLayer.add(deed);
          a.sfx('sfx_soleprop_cash');
          a.sc.tweens.add({ targets: deed, scale: 1, duration: 360, ease: 'Back.Out' });
          a.sc.time.delayedCall(900, () => {
            const stamp = a.sc.add.image(960, 600, 'p_sold').setScale(2.4).setAlpha(0);
            a.fxLayer.add(stamp);
            a.sc.tweens.add({
              targets: stamp, scale: 1, alpha: 1, duration: 180, ease: 'Quad.In',
              onComplete: () => {
                a.sfx('sfx_soleprop_stamp');
                a.shake(400, 0.014);
                a.rumble(1, 300);
                a.banner('SHOP BOUGHT OUT!', 'The next shop: every price doubled', 'boss');
                finaleState.buyout = true;
              },
            });
            a.sc.tweens.add({ targets: [deed, stamp], alpha: 0, duration: 400, delay: 2000, onComplete: () => { deed.destroy(); stamp.destroy(); } });
          });
        });
        a.sc.time.delayedCall(12300, () => f.alive && say(a, f, 'MY AGENTS WILL BE IN TOUCH.'));
        a.sc.time.delayedCall(14200, () => {
          if (!f.alive) return;
          a.sfx('sfx_soleprop_leave');
          screenGlitch(a.sc, 700, 0.9);
          a.fx.ring(f.cx, f.cy, 0xffd23f, 3, 0.5);
          a.sc.tweens.add({
            targets: f, y: -700, duration: 900, ease: 'Back.In',
            onComplete: () => {
              // gone (off screen and out of every lane) until the shift is over
              f.laneX = -5000;
              stage = 2;
              r();
              pool = agents();
              a.setMinions(pool);
              buildWatch(a);
              a.banner('COLLECTION AGENTS!', `Survive ${SURVIVE_SEC} seconds`, 'boss');
            },
          });
        });
      }
      // the meeting is staged by hand (the phase-change beat would hand him back his own AI)
      if (stage < 3) f.puppet = true;
      if (stage !== 2 || !a.inWave()) return;
      // ——— the shift: agents from every boss you've met, until the watch runs out ———
      const h = heat(a);
      surviveT += dt;
      const left = Math.max(0, SURVIVE_SEC - surviveT);
      const s = Math.ceil(left);
      if (s !== lastSec) {
        lastSec = s;
        secs?.setText(String(s));
        if (s <= 10 && s > 0) {
          a.sfx('sfx_soleprop_clock', { volume: 0.9 });
          if (secs) a.sc.tweens.add({ targets: secs, scale: { from: 1.4, to: 1 }, duration: 200 });
        }
      }
      if (hands) {
        const k = surviveT / SURVIVE_SEC;
        hands.clear();
        hands.lineStyle(7, 0x2a1810, 1).lineBetween(0, 7, Math.sin(k * Math.PI * 2) * 40, 7 - Math.cos(k * Math.PI * 2) * 40);
        hands.lineStyle(4, 0xe5242f, 1).lineBetween(0, 7, Math.sin(k * Math.PI * 24) * 52, 7 - Math.cos(k * Math.PI * 24) * 52);
      }
      // the boss bar is the clock
      f.hp = Math.max(1, f.maxHp * (left / SURVIVE_SEC));
      ui.hud.setBoss(f.type.name, left / SURVIVE_SEC, 1, 1);
      ui.hud.setBossMove('SURVIVE', `${s}s left · his agents are after your slices`);
      spawnT -= dt;
      const alive = a.allFeet().filter((o) => o.alive && !o.isBossLike).length;
      const cap = [4, 5, 6, 7, 8][h.rank];
      if (spawnT <= 0 && alive < cap && pool.length) {
        spawnT = [2.6, 2.0, 1.7, 1.4, 1.2][h.rank];
        const id = rnd(pool)!;
        const agent = a.spawn(id);
        if (agent) {
          agent.setPhaseAura(0xffd23f);
          a.sfx('sfx_soleprop_agent', { throttle: 400 });
          if (!met.has(id)) {
            met.add(id);
            a.quip(Phaser.Math.Clamp(agent.x, 300, 1620), SAFE_TOP + 60, `AGENT: ${FOOT_BY_ID[id].name.toUpperCase()}`, '#ffd23f', 30);
          }
        }
      }
      if (left <= 0) {
        // shift over: the agents clock off with him
        stage = 3;
        a.sfx('sfx_soleprop_bell');
        a.banner('SHIFT OVER!', 'He\'ll see you at the First Pizzeria', 'clear');
        f.shielded = false;
        f.brain.wasShielded = false;
        f.hp = 1;
        a.damageFoot(f, 10);
      }
    },
    onSmacked: (f, a) => {
      if (f.shielded) {
        a.quip(f.x, f.cy - 140, 'YOU CAN\'T AFFORD ME.', '#ffd23f', 34);
        return true;
      }
      return false;
    },
    onDeath: (_f, a) => {
      bin.flush();
      a.setMinions(null);
      met = new Set();
    },
  };
};

// ——— 39. THE GHOST OF FEET FUTURE (mini-boss, wave 98) ———

const ghostfuture = (): Brain => {
  const bin = new Bin();
  let ready = false;
  const vel = { x: 0, y: 0 };
  const last = { x: 0, y: 0 };
  const pred = { x: 0, y: 0 };
  let future: Phaser.GameObjects.Image | null = null;
  let line: Phaser.GameObjects.Graphics | null = null;
  let foreseen = false;
  let blocks = 0;
  let overload = 0;
  const stomp = new Every(4, 2.5);
  const loop = new Every(11, 6);
  const history: { x: number; y: number }[] = [];

  const look = (a: Arena) => [0.42, 0.48, 0.52, 0.58, 0.62][heat(a).rank];

  const setup = (f: Foot, a: Arena) => {
    ready = true;
    const h = heat(a);
    stomp.every = h.cooldown(4);
    loop.every = h.cooldown(11);
    const p = a.peelPoint();
    last.x = p.x;
    last.y = p.y;
    future = a.sc.add.image(p.x, p.y, 'peel').setOrigin(0.5, 100 / 360).setScale(0.55).setAngle(-28).setTintFill(0xdff4ff).setAlpha(0);
    line = a.sc.add.graphics();
    a.fxLayer.add([line, future]);
    fightMusic(a, 'music_boss_ghostfuture');
    a.sfx('sfx_ghostfuture_enter');
    screenGlitch(a.sc, 700, 0.7);
    // it arrives as a smear of afterimages, the future catching up with the present
    for (let i = 1; i <= 4; i++) {
      const ghost = a.sc.add.image(f.x + i * 120, 360, `foot_${f.type.id}`).setScale(f.scale / (f.type.scale * f.meta.textures.res)).setAlpha(0.35 / i).setTint(0xbfe6ff);
      a.fxLayer.add(ghost);
      a.sc.tweens.add({ targets: ghost, x: f.x, alpha: 0, duration: 700 + i * 120, onComplete: () => ghost.destroy() });
    }
    a.quip(f.x, 300, 'I\'VE SEEN HOW THIS ENDS.', '#bfe6ff', 44);
    bin.add(() => {
      future?.destroy();
      line?.destroy();
      future = null;
      line = null;
    });
  };

  /** A pale footprint where you're heading; a pale foot slams down there a moment later. */
  const futureStomp = (f: Foot, a: Arena, at: { x: number; y: number }, delay = 0) => {
    const h = heat(a);
    const x = Phaser.Math.Clamp(at.x, 140, 1780);
    const y = Phaser.Math.Clamp(at.y, SAFE_TOP + 80, 900);
    a.sc.time.delayedCall(delay * 1000, () => {
      if (!f.alive || !a.inWave()) return;
      const tell = h.windup(1.05);
      const print = a.sc.add.image(x, y, 'p_futureprint').setScale(0.2).setAlpha(0);
      const ringG = a.sc.add.graphics();
      a.fxLayer.add([ringG, print]);
      a.sfx('sfx_ghostfuture_mark', { throttle: 120 });
      a.sc.tweens.add({ targets: print, scale: 0.75, alpha: 0.9, duration: 260, ease: 'Back.Out' });
      const t0 = a.now();
      const R = 120;
      const tick = a.sc.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => {
          const k = Math.min(1, (a.now() - t0) / tell);
          ringG.clear();
          ringG.lineStyle(8, 0x2a1810, 0.5).strokeCircle(x, y, R + 4);
          ringG.lineStyle(5, 0xbfe6ff, 0.9).strokeCircle(x, y, R);
          ringG.fillStyle(0xbfe6ff, 0.12 + 0.2 * k).fillCircle(x, y, R * k);
        },
      });
      const done = bin.add(() => {
        tick.remove();
        ringG.destroy();
        print.destroy();
      });
      a.sc.time.delayedCall(tell * 1000, () => {
        done();
        if (!f.alive || !a.inWave()) return;
        // the pale foot from the future lands
        const foot = a.sc.add.image(x, y - 420, `foot_${f.type.id}`).setOrigin(0.5, 0.85).setScale((0.7 * f.scale) / (f.type.scale * f.meta.textures.res)).setAlpha(0.75).setTint(0xdff4ff);
        a.fxLayer.add(foot);
        a.sc.tweens.add({
          targets: foot, y, duration: 140, ease: 'Quad.In',
          onComplete: () => {
            a.sfx('sfx_ghostfuture_stomp');
            a.fx.ring(x, y, 0xbfe6ff, 1.4, 0.5);
            a.shake(160, 0.006);
            a.sc.tweens.add({ targets: foot, alpha: 0, scaleX: 0.7, scaleY: 0.4, duration: 300, onComplete: () => foot.destroy() });
            const pp = a.peelPoint();
            if (Math.hypot(pp.x - x, pp.y - y) < R) {
              a.sfx('sfx_ghostfuture_paradox');
              a.stunPeel(h.stun(1.4), 'PREDICTED!');
            }
            const p = a.alivePizzas().find((q) => Math.abs(q.x - x) < 120 && y > q.surfaceY - 200);
            if (p) a.hitPizza(p, 1, 'FUTURE STOMP!', '#bfe6ff');
          },
        });
      });
    });
  };

  return {
    names: ['FORESIGHT', 'TIME LOOP', 'EVERY FUTURE'],
    info: [
      'It can\'t be hit where your peel is heading (the pale peel) and stomps where you\'re about to be · swing through it, never stop on it, and step off the footprints',
      'It rewinds and stamps its old footprints again · watch the replays and keep moving',
      'Footprints come three at a time · keep the pale peel away from it and swing',
    ],
    upkeep: (f, dt, a) => {
      if (!ready) setup(f, a);
      // the peel's motion, smoothed, and where it'll be a moment from now
      const p = a.peelPoint();
      if (dt > 0) {
        const vx = (p.x - last.x) / dt;
        const vy = (p.y - last.y) / dt;
        const k = Math.min(1, dt * 9);
        vel.x += (Phaser.Math.Clamp(vx, -4000, 4000) - vel.x) * k;
        vel.y += (Phaser.Math.Clamp(vy, -4000, 4000) - vel.y) * k;
      }
      last.x = p.x;
      last.y = p.y;
      const L = look(a);
      pred.x = Phaser.Math.Clamp(p.x + vel.x * L, 40, 1880);
      pred.y = Phaser.Math.Clamp(p.y + vel.y * L, 120, 1040);
      overload = Math.max(0, overload - dt);
      const near = Math.hypot(pred.x - f.cx, pred.y - f.cy) < f.meta.halfWidth * f.scale * 0.9 + 70;
      foreseen = near && overload <= 0 && f.alive;
      // the future peel: where it thinks you're going
      if (future && line) {
        const show = Math.hypot(pred.x - p.x, pred.y - p.y) > 30 || foreseen;
        future.setPosition(pred.x, pred.y).setAlpha(show ? (foreseen ? 0.8 : 0.5) : 0.15);
        line.clear();
        if (show) {
          line.lineStyle(4, 0xbfe6ff, 0.5);
          const n = 8;
          for (let i = 0; i < n; i += 2) line.lineBetween(p.x + ((pred.x - p.x) * i) / n, p.y + ((pred.y - p.y) * i) / n, p.x + ((pred.x - p.x) * (i + 1)) / n, p.y + ((pred.y - p.y) * (i + 1)) / n);
        }
      }
      // foreseen: it shimmers out of reach
      const img = imgOf(f);
      img.setAlpha(foreseen ? 0.32 + Math.sin(a.now() * 30) * 0.08 : 0.88);
      if (Math.random() < dt * 4) history.push({ x: f.cx, y: f.cy + 80 });
      if (history.length > 6) history.shift();
    },
    update: (f, dt, a) => {
      const h = heat(a);
      if (stomp.tick(dt)) {
        futureStomp(f, a, pred);
        if (f.phase >= 3) {
          futureStomp(f, a, { x: pred.x - 260, y: pred.y }, 0.15);
          futureStomp(f, a, { x: pred.x + 260, y: pred.y }, 0.3);
        } else if (f.phase >= 2 && h.rank >= 2) futureStomp(f, a, { x: pred.x + (Math.random() < 0.5 ? -300 : 300), y: pred.y }, 0.25);
      }
      // the time loop: its old footprints come round again
      if (f.phase >= 2 && loop.tick(dt)) {
        a.sfx('sfx_ghostfuture_rewind');
        screenGlitch(a.sc, 500, 0.6);
        a.quip(960, SAFE_TOP + 90, 'REWIND!', '#bfe6ff', 46);
        const old = history.slice(-3);
        old.forEach((o, i) => futureStomp(f, a, o, 0.4 + i * 0.45));
      }
    },
    onSmacked: (f, a) => {
      if (!foreseen) {
        blocks = 0;
        return false;
      }
      // it saw that coming; but it can only see so many futures at once
      blocks++;
      a.sfx('sfx_ghostfuture_foresee', { throttle: 120 });
      a.quip(f.x, f.cy - 150, 'FORESEEN!', '#bfe6ff', 36);
      a.fx.ring(f.cx, f.cy, 0xbfe6ff, 0.8, 0.8);
      const cap = heat(a).rank === 0 ? 2 : 3;
      if (blocks >= cap) {
        blocks = 0;
        overload = 1.6;
        a.quip(f.x, f.cy - 200, 'TOO MANY FUTURES!', '#7dff9a', 40);
        f.stun(0.8);
      }
      return true;
    },
    onDeath: (f, a) => {
      bin.flush();
      if (!ready) return;
      ready = false;
      a.sfx('sfx_ghostfuture_death');
      screenGlitch(a.sc, 600, 0.8);
      for (let i = 0; i < 14; i++) a.fx.glint(f.cx + (Math.random() - 0.5) * 200, f.cy + (Math.random() - 0.5) * 200, 2);
      a.fx.puff(f.cx, f.cy, 16);
      if (a.inWave()) stageMusic(a);
    },
  };
};

// ——— 40. THE SOLE PROPRIETOR UNBOUND (wave 100) ———

/** Most peels in the Last Slice montage, and seconds between them. */
const MONTAGE_MAX = 12;
const MONTAGE_GAP = 0.26;

const soleunbound = (): Brain => {
  const bin = new Bin();
  const phaseBin = new Bin();
  let ready = false;
  const fist = new Every(6, 3);
  const elements = new Every(9, 4);
  const gaze = new Every(8, 3);
  const holeCd = new Every(7, 2);
  let gazing = false;
  let hole: { x: number; y: number; prop: Prop; img: Phaser.GameObjects.Image; swallowT: number } | null = null;
  // the Last Slice
  let eaten: Pizza[] = [];
  const homeY = new Map<Pizza, number>();
  let lastOne: Pizza | null = null;
  let finale: 'none' | 'eating' | 'gather' | 'montage' | 'smack' = 'none';
  let chewT = 0;
  let chewRing: Phaser.GameObjects.Graphics | null = null;
  let gold: Prop | null = null;
  let slamOrig: (() => void) | null = null;

  const setup = (f: Foot, a: Arena) => {
    ready = true;
    const h = heat(a);
    fist.every = h.cooldown(6);
    elements.every = h.cooldown(9);
    gaze.every = h.cooldown(8);
    holeCd.every = h.cooldown(7);
    a.sfx('sfx_soleunbound_enter');
    a.flash(600, 255, 120, 220);
    a.shake(1200, 0.014);
    a.rumble(1, 800);
    screenGlitch(a.sc, 1000, 1);
    a.quip(960, 300, 'YOUR TABLE IS MINE.', '#ffd23f', 60);
    a.sc.time.delayedCall(1200, () => f.alive && comic(a, 760, 420, 'ACT I: COMICS', '#ffd23f'));
  };

  // ——— Phase 1: the gauntlet ———
  const throwFist = (f: Foot, a: Arena) => {
    const h = heat(a);
    const ps = a.alivePizzas();
    const n = h.rank >= 3 ? 2 : 1;
    const picks = [...ps].sort(() => Math.random() - 0.5).slice(0, n);
    a.sfx('sfx_soleunbound_fist');
    for (const p of picks) {
      laneDrop(a, p, {
        key: 'p_gauntlet', scale: 0.62, warn: h.windup(1.0), fall: h.windup(1.5), hits: h.hits(2), halfW: 110, halfH: 120, color: 0xffd23f, label: 'POW!',
        onClear: () => comic(a, p.x, p.surfaceY - 260, 'POW!', '#7dff9a'),
        onLand: (q) => {
          a.sfx('sfx_soleunbound_krak');
          comic(a, q.x, q.surfaceY - 180, 'KRAK!');
          a.hitPizza(q, h.slices(1), 'PUNCHED!', '#ffd23f');
        },
      }, phaseBin);
    }
    void f;
  };

  // ——— Phase 2: frost and fire ———
  const frostAndFire = (a: Arena) => {
    const h = heat(a);
    const ps = [...a.alivePizzas()].sort(() => Math.random() - 0.5);
    const icy = ps[0];
    const hot = ps[1] ?? null;
    if (icy) {
      a.sfx('sfx_soleunbound_frost');
      const sec = h.windup(6);
      a.freezePerk(icy, sec);
      const prop = hitProp(a, {
        key: 'p_frost', x: icy.x, y: icy.surfaceY - 70, scale: 0.8, hits: h.hits(3), sec, r: 110, label: 'THAWED!',
        follow: () => ({ x: icy.x, y: icy.surfaceY - 70 }),
        hitSfx: 'sfx_soleunbound_frost',
        onClear: () => {
          icy.freezePerk(0.01);
          a.fx.ring(icy.x, icy.surfaceY - 40, 0x9ad8ff, 1, 0.4);
        },
        onFail: () => {
          if (!icy.dead && a.inWave()) a.hitPizza(icy, h.slices(1), 'FROZEN SOLID!', '#9ad8ff');
        },
      });
      phaseBin.add(() => prop.destroy());
    }
    if (hot) {
      a.sfx('sfx_soleunbound_fire');
      const every = [5, 4, 4, 3.5, 3][h.rank];
      let burns = 0;
      const prop = hitProp(a, {
        key: 'p_pizzaflame', x: hot.x, y: hot.surfaceY - 80, scale: 0.8, hits: h.hits(3), r: 110, label: 'PUT OUT!',
        follow: () => ({ x: hot.x, y: hot.surfaceY - 80 }),
        clearSfx: 'sfx_soleunbound_douse',
        onClear: () => a.fx.puff(hot.x, hot.surfaceY - 60, 12),
      });
      const tick = a.sc.time.addEvent({
        delay: every * 1000,
        loop: true,
        callback: () => {
          if (!prop.alive() || hot.dead || !a.inWave()) return tick.remove();
          a.fx.burn(hot.x, hot.surfaceY - 30);
          a.hitPizza(hot, 1, 'BURNING!', '#ff7a2a');
          if (++burns >= 3) {
            prop.clear();
            tick.remove();
          }
        },
      });
      phaseBin.add(() => {
        tick.remove();
        prop.destroy();
      });
    }
  };

  // ——— Phase 3: the stone gaze ———
  const stoneGaze = (f: Foot, a: Arena) => {
    const h = heat(a);
    const p = rnd(a.alivePizzas());
    if (!p) return;
    gazing = true;
    const tell = h.windup(2.6);
    a.sfx('sfx_soleunbound_gaze');
    a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 200), 'HIS EYES GLOW…', '#9affd0', 40);
    const eyes = [-1, 1].map((s) => {
      const e = a.sc.add.image(f.cx + s * 44, f.cy - 40, 'glow').setTint(0x9affd0).setBlendMode(Phaser.BlendModes.ADD).setScale(0.5).setAlpha(0);
      a.fxLayer.add(e);
      a.sc.tweens.add({ targets: e, alpha: 1, scale: 0.9, duration: 500, yoyo: true, repeat: -1 });
      return e;
    });
    const beam = a.sc.add.graphics();
    a.fxLayer.addAt(beam, 0);
    let reflected = false;
    const shieldX = Phaser.Math.Clamp(p.x + (p.x > 960 ? -230 : 230), 200, 1720);
    const mirror = hitProp(a, {
      key: 'p_mirrorshield', x: shieldX, y: 560, scale: 0.75, hits: h.hits(3), sec: tell, r: 100, label: 'REFLECTED!',
      hitSfx: 'sfx_kit_prophit', clearSfx: 'sfx_soleunbound_reflect',
      onClear: () => {
        reflected = true;
      },
    });
    const t0 = a.now();
    const tick = a.sc.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        const k = Math.min(1, (a.now() - t0) / tell);
        beam.clear();
        beam.lineStyle(10 + 26 * k, 0x9affd0, 0.15 + 0.35 * k).lineBetween(f.cx, f.cy - 40, p.x, p.surfaceY - 20);
        beam.lineStyle(4, 0xffffff, 0.4 + 0.5 * k).lineBetween(f.cx, f.cy - 40, p.x, p.surfaceY - 20);
        for (const e of eyes) e.setPosition(f.cx + (e.x > f.cx ? 44 : -44), f.cy - 40);
      },
    });
    const end = phaseBin.add(() => {
      tick.remove();
      beam.destroy();
      eyes.forEach((e) => e.destroy());
      mirror.destroy();
      gazing = false;
    });
    a.sc.time.delayedCall(tell * 1000, () => {
      end();
      if (!f.alive || !a.inWave()) return;
      if (reflected) {
        // the gaze bounces off the shield and back into him
        a.fx.lightning(shieldX, 560, f.cx, f.cy);
        a.damageFoot(f, f.maxHp * 0.04, 'TURNED TO STONE!');
        f.stun(2);
        f.tint(0xa0a0a0);
        a.sc.time.delayedCall(1600, () => f.alive && f.tint(null));
        return;
      }
      a.sfx('sfx_soleunbound_stone');
      a.freezePerk(p, h.stun(10));
      const img = imgOf(p);
      img.setTint(0x9a9a9a);
      a.sc.time.delayedCall(h.stun(10) * 1000, () => img.active && img.clearTint());
      a.hitPizza(p, 1, 'PETRIFIED!', '#c7ccd4');
      // anyone caught in the gaze turns to stone too
      const pp = a.peelPoint();
      const [nx, ny] = nearest(new Phaser.Geom.Line(f.cx, f.cy - 40, p.x, p.surfaceY - 20), pp);
      if (Math.hypot(pp.x - nx, pp.y - ny) < 70) a.stunPeel(h.stun(1.5), 'STONED!');
    });
  };

  // ——— Phase 4: the black hole ———
  const openHole = (a: Arena) => {
    const h = heat(a);
    const x = 520 + Math.random() * 880;
    const y = 520;
    a.sfx('sfx_soleunbound_hole');
    screenGlitch(a.sc, 500, 0.6);
    const img = a.sc.add.image(x, y, 'p_blackhole').setScale(0).setAlpha(0.95);
    a.underLayer.add(img);
    a.sc.tweens.add({ targets: img, scale: 0.85, duration: 500, ease: 'Back.Out' });
    a.sc.tweens.add({ targets: img, angle: 360, duration: 3000, repeat: -1 });
    const prop = hitProp(a, {
      key: 'p_reticle', x, y, scale: 0.01, hits: h.hits(5), r: 150, label: 'COLLAPSED!', badgeDy: -170,
      clearSfx: 'sfx_soleunbound_collapse',
      onClear: () => closeHole(a, true),
    });
    hole = { x, y, prop, img, swallowT: [5, 4, 4, 3.5, 3][h.rank] };
    phaseBin.add(() => closeHole(a, false));
  };
  const closeHole = (a: Arena, collapsed: boolean) => {
    if (!hole) return;
    const o = hole;
    hole = null;
    o.prop.destroy();
    a.sc.tweens.killTweensOf(o.img);
    a.sc.tweens.add({ targets: o.img, scale: 0, angle: o.img.angle + 540, duration: 400, ease: 'Back.In', onComplete: () => o.img.destroy() });
    if (collapsed) {
      a.fx.ring(o.x, o.y, 0xb06bff, 2, 0.6);
      a.shake(300, 0.01);
    }
    holeCd.t = holeCd.every;
  };

  // ——— Phase 5: the Last Slice ———
  const lastSlice = (f: Foot, a: Arena) => {
    finale = 'eating';
    phaseBin.flush();
    const end = retreat(a);
    bin.add(end);
    shield(a, f, true);
    f.puppet = true;
    void audio.music(a.sc, ['music_heartbeat', 'music_boss'], 1800);
    a.dramatic(1.2);
    const ps = [...a.alivePizzas()].sort((p, q) => q.slices - p.slices);
    lastOne = ps[0] ?? null;
    eaten = ps.slice(1);
    a.sc.tweens.add({ targets: f, x: lastOne ? lastOne.x : 960, y: 420, duration: 900, ease: 'Sine.InOut' });
    // he eats every pizza but one, one gulp at a time
    eaten.forEach((p, i) => {
      a.sc.time.delayedCall(1000 + i * 650, () => {
        if (!f.alive) return;
        p.flags.eaten = true;
        bits(a).recompute();
        homeY.set(p, p.root.y);
        a.sfx('sfx_soleunbound_eat');
        a.shake(250, 0.01);
        a.quip(p.x, p.surfaceY - 160, 'GULP!', '#ff4fd8', 48);
        a.sc.tweens.add({ targets: p.root, x: f.cx, y: f.cy, scaleX: 0.1, scaleY: 0.1, alpha: 0, duration: 420, ease: 'Back.In', onComplete: () => p.root.setVisible(false) });
      });
    });
    a.sc.time.delayedCall(1300 + eaten.length * 650, () => {
      if (!f.alive) return;
      a.banner('THE LAST SLICE', 'Every peel on the wall lends you its power', 'phase');
      gather(f, a);
    });
  };

  /** The wall's peels light up and pour their power into one golden peel; smack it (or press Space). */
  const gather = (f: Foot, a: Arena) => {
    finale = 'gather';
    const h = heat(a);
    a.sfx('sfx_soleunbound_gather');
    const wall = finaleOf(a.sc)?.wallImgs ?? [];
    wall.forEach((w, i) => {
      a.sc.time.delayedCall(i * 40, () => {
        if (!w.img.active) return;
        w.img.setTint(0xfff2a0);
        a.sc.tweens.add({ targets: w.img, scale: 1.25, duration: 160, yoyo: true });
      });
    });
    gold = hitProp(a, {
      key: 'p_goldpeel', x: 960, y: 560, scale: 0.75, hits: 1, r: 150, label: 'UNLEASHED!',
      clearSfx: 'sfx_soleunbound_final',
      onClear: () => montage(f, a),
    });
    a.quip(960, 330, 'SMACK THE GOLDEN PEEL!', '#ffd23f', 50);
    // Space (or the slam button) unleashes it too
    const sc = bits(a);
    slamOrig = sc.peelSlam;
    sc.peelSlam = () => {
      if (finale === 'gather' && gold?.alive()) gold.clear();
      if (finale === 'gather') montage(f, a);
      else slamOrig?.call(a);
    };
    bin.add(() => {
      if (slamOrig) sc.peelSlam = slamOrig;
      slamOrig = null;
      gold?.destroy();
    });
    // meanwhile he chews his way towards the last pizza (it never drops below a slice on Mild)
    chewT = [14, 10, 8, 7, 6][h.rank];
    chewRing = a.sc.add.graphics();
    a.fxLayer.add(chewRing);
    bin.add(() => chewRing?.destroy());
  };

  const montage = (f: Foot, a: Arena) => {
    if (finale !== 'gather') return;
    finale = 'montage';
    chewRing?.clear();
    gold?.destroy();
    const wall = finaleOf(a.sc)?.wallImgs ?? [];
    // the equipped peel first, then the rest of the wall (capped so it stays a quick burst)
    const ids = wall.length ? wall.map((w) => w.id) : [bits(a).peelId];
    const picks = ids.slice(0, MONTAGE_MAX);
    a.dramatic(0.4);
    picks.forEach((id, i) => {
      a.sc.time.delayedCall(i * MONTAGE_GAP * 1000, () => {
        if (!f.alive) return;
        const ab = abilityFor(id);
        const from = wall.find((w) => w.id === id)?.img;
        const fx0 = from ? from.parentContainer.x + from.x : 960;
        const fy0 = from ? from.parentContainer.y + from.y : 600;
        const key = peelThumbKey(a.sc, id, 104);
        const flyer = a.sc.add.image(fx0, fy0, key).setScale(0.9);
        a.fxLayer.add(flyer);
        a.sfx('sfx_soleunbound_montage', { throttle: 60 });
        a.sc.tweens.add({
          targets: flyer, x: f.cx + (Math.random() - 0.5) * 120, y: f.cy + (Math.random() - 0.5) * 80, angle: 360, scale: 1.3, duration: 220, ease: 'Quad.In',
          onComplete: () => {
            flyer.destroy();
            burstOf(a, f, ab);
            // the names fan out across five columns and three rows, so a quick burst still reads (they piled up)
            a.quip(f.cx + ((i % 5) - 2) * 250, f.cy - 150 - (Math.floor(i / 5) % 3) * 56, ab.name.toUpperCase(), hexStr(ab.color), 30);
          },
        });
      });
    });
    a.sc.time.delayedCall(picks.length * MONTAGE_GAP * 1000 + 500, () => {
      if (!f.alive) return;
      finale = 'smack';
      shield(a, f, false);
      // only your smack finishes him (burns and passives do nothing now)
      f.vuln = 0;
      f.hp = Math.min(f.hp, Math.max(1, f.maxHp * 0.01));
      f.stun(999);
      f.tint(0xfff2a0);
      a.flash(300, 255, 242, 160);
      a.banner('SMACK HIM FOR GOOD!', 'One smack. Make it count.', 'clear');
      mark(a, 'p_reticle', f.cx, f.cy, 30, 1.2);
      for (const w of wall) if (w.img.active) w.img.clearTint();
    });
  };

  return {
    names: ['THE GAUNTLET', 'FROST AND FIRE', 'THE STONE GAZE', 'THE BLACK HOLE', 'THE LAST SLICE'],
    info: [
      'Comics: a giant fist comes down a lane · smack the fist before it lands',
      'Norse: he freezes one pizza and sets another alight · smack the ice and the flames',
      'Greek: his eyes glow and he stares down a pizza · smack the mirror shield to throw the gaze back, and keep your peel out of the beam',
      'Cosmic: a black hole opens, pulls your peel and swallows slices · smack its rim until it collapses',
      'He eats every pizza but one · smack the golden peel (or press Space) to unleash every peel you own, then smack him for good',
    ],
    phases: () => 5,
    upkeep: (f, dt, a) => {
      if (!ready) setup(f, a);
      // the Last Slice is staged by hand (the phase-change beat would hand him back his own AI)
      if (finale !== 'none') f.puppet = true;
      // the black hole pulls the peel and the feet, and swallows slices
      if (hole && a.inWave()) {
        const o = hole;
        const sc = bits(a);
        const dx = o.x - sc.pointer.x;
        const dy = o.y - sc.pointer.y;
        const d = Math.hypot(dx, dy);
        if (d > 40 && d < 900) {
          const pull = [70, 90, 110, 130, 150][heat(a).rank] * dt;
          sc.pointer.x += (dx / d) * pull;
          sc.pointer.y += (dy / d) * pull;
        }
        for (const ft of a.allFeet()) if (ft.alive && !ft.isBossLike && Math.abs(ft.x - o.x) < 600) ft.x += Math.sign(o.x - ft.x) * 30 * dt;
        o.swallowT -= dt;
        if (o.swallowT <= 0) {
          // (a slice every 5 s on Regular, was 4: the black hole came fourth of five phases and ended runs)
          o.swallowT = [5, 5, 4, 3.5, 3][heat(a).rank];
          const ps = a.alivePizzas();
          const p = ps.length ? ps.reduce((b, q) => (Math.abs(q.x - o.x) < Math.abs(b.x - o.x) ? q : b)) : null;
          if (p) {
            a.hitPizza(p, 1, 'SWALLOWED!', '#b06bff');
            const sl = a.sc.add.image(p.x, p.surfaceY - 20, `slice_${p.type.id}`).setScale(0.5);
            a.fxLayer.add(sl);
            a.sc.tweens.add({ targets: sl, x: o.x, y: o.y, scale: 0, angle: 540, duration: 600, ease: 'Quad.In', onComplete: () => sl.destroy() });
          }
        }
      }
      // the Last Slice: his chewing clock around the one pizza left
      if (finale === 'gather' && lastOne && chewRing) {
        chewT -= dt;
        const h = heat(a);
        const total = [14, 10, 8, 7, 6][h.rank];
        const k = 1 - Math.max(0, chewT) / total;
        chewRing.clear();
        chewRing.lineStyle(16, 0x2a1810, 0.6).beginPath().arc(lastOne.x, lastOne.surfaceY - 10, 150, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k).strokePath();
        chewRing.lineStyle(9, 0xff4fd8, 1).beginPath().arc(lastOne.x, lastOne.surfaceY - 10, 150, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k).strokePath();
        if (chewT <= 0) {
          chewT = total;
          a.sfx('sfx_soleunbound_eat');
          if (!lastOne.dead) {
            const bite = h.rank === 0 ? Math.min(1, lastOne.slices - 1) : h.slices(1);
            if (bite > 0) a.hitPizza(lastOne, bite, 'NIBBLE!', '#ff4fd8');
            else a.quip(lastOne.x, lastOne.surfaceY - 160, 'HOLD ON!', '#7dff9a', 44);
          }
        }
      }
    },
    update: (f, dt, a) => {
      if (finale !== 'none') return;
      if (f.phase === 1 && fist.tick(dt)) throwFist(f, a);
      if (f.phase === 2 && elements.tick(dt)) frostAndFire(a);
      if (f.phase === 3 && !gazing && gaze.tick(dt)) stoneGaze(f, a);
      if (f.phase === 4 && !hole && holeCd.tick(dt)) openHole(a);
    },
    onSmacked: (f, a) => {
      if (finale === 'smack') {
        // the one that counts
        a.sfx('sfx_soleunbound_final');
        a.dramatic(1.4);
        a.shake(900, 0.02);
        a.rumble(1, 900);
        a.flash(400, 255, 255, 255);
        comic(a, f.cx, f.cy - 120, 'FOR GOOD!', '#ffd23f');
        f.hp = Math.min(f.hp, 0.5);
        f.vuln = 1;
        return false;
      }
      if (finale !== 'none') return true;
      // comic-book hits in the first act
      if (f.phase === 1 && Math.random() < 0.18) comic(a, f.cx + (Math.random() - 0.5) * 200, f.cy - 100, rnd(['BAM!', 'POW!', 'WHAM!', 'ZOK!'])!, '#ffd23f');
      return false;
    },
    onPhase: (f, phase, a) => {
      phaseBin.flush();
      closeHole(a, false);
      if (phase === 2) {
        a.flash(300, 160, 220, 255);
        comic(a, 960, 420, 'ACT II: FROST AND FIRE', '#9ad8ff');
      } else if (phase === 3) {
        a.flash(300, 230, 230, 220);
        comic(a, 960, 420, 'ACT III: THE GAZE', '#e8e0c8');
      } else if (phase === 4) {
        screenGlitch(a.sc, 900, 1);
        comic(a, 960, 420, 'ACT IV: THE VOID', '#c8a8ff');
      } else if (phase === 5) lastSlice(f, a);
    },
    onDeath: (f, a) => {
      phaseBin.flush();
      bin.flush();
      closeHole(a, false);
      if (!ready) return;
      ready = false;
      // the sole cracks open into light, and the pizzas he ate come flying back out
      a.sfx('sfx_soleunbound_crack');
      audio.stop('music', 1500);
      const x = f.cx;
      const y = f.cy;
      const rays = a.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
      a.fxLayer.add(rays);
      const st = { k: 0 };
      a.sc.tweens.add({
        targets: st, k: 1, duration: 1800, ease: 'Quad.In',
        onUpdate: () => {
          rays.clear();
          for (let i = 0; i < 18; i++) {
            const ang = (i / 18) * Math.PI * 2 + st.k * 0.6;
            const len = 200 + st.k * 1800;
            rays.fillStyle(i % 2 ? 0xfff2a0 : 0xffffff, 0.25 + st.k * 0.4);
            rays.beginPath();
            rays.moveTo(x, y);
            rays.lineTo(x + Math.cos(ang - 0.06) * len, y + Math.sin(ang - 0.06) * len);
            rays.lineTo(x + Math.cos(ang + 0.06) * len, y + Math.sin(ang + 0.06) * len);
            rays.closePath();
            rays.fillPath();
          }
        },
        onComplete: () => a.sc.tweens.add({ targets: rays, alpha: 0, duration: 900, onComplete: () => rays.destroy() }),
      });
      // jagged cracks of light across the sole
      const cracks = a.sc.add.graphics();
      a.fxLayer.add(cracks);
      for (let i = 0; i < 6; i++) {
        let cx = x;
        let cy = y;
        const ang0 = Math.random() * Math.PI * 2;
        cracks.lineStyle(10, 0xfff2a0, 1).beginPath().moveTo(cx, cy);
        for (let k = 0; k < 5; k++) {
          const ang = ang0 + (Math.random() - 0.5) * 0.9;
          cx += Math.cos(ang) * 50;
          cy += Math.sin(ang) * 50;
          cracks.lineTo(cx, cy);
        }
        cracks.strokePath();
      }
      a.sc.tweens.add({ targets: cracks, alpha: 0, duration: 1600, delay: 600, onComplete: () => cracks.destroy() });
      a.flash(900, 255, 255, 240);
      screenGlitch(a.sc, 1200, 1);
      for (const p of eaten) {
        p.flags.eaten = false;
        a.sc.tweens.killTweensOf(p.root);
        p.root.setVisible(true).setPosition(x, y);
        a.sc.tweens.add({ targets: p.root, x: p.x, y: homeY.get(p) ?? p.root.y, alpha: 1, scaleX: 1, scaleY: 1, duration: 700, delay: 500, ease: 'Back.Out' });
      }
      eaten = [];
      bits(a).recompute();
      a.sc.time.delayedCall(1300, () => {
        a.layoutPizzas();
        a.quip(960, 380, 'THE PIZZAS ARE FREE!', '#ffd23f', 60);
      });
    },
  };
};

/** The point on a line nearest p, as [x, y]. */
function nearest(line: Phaser.Geom.Line, p: { x: number; y: number }): [number, number] {
  const q = Phaser.Geom.Line.GetNearestPoint(line, new Phaser.Geom.Point(p.x, p.y));
  // GetNearestPoint works on the infinite line: clamp to the segment
  const minX = Math.min(line.x1, line.x2);
  const maxX = Math.max(line.x1, line.x2);
  const minY = Math.min(line.y1, line.y2);
  const maxY = Math.max(line.y1, line.y2);
  return [Phaser.Math.Clamp(q.x, minX, maxX), Phaser.Math.Clamp(q.y, minY, maxY)];
}

/** One peel's ability, as a quick burst on the boss (the Last Slice montage). */
function burstOf(a: Arena, f: Foot, ab: Ability): void {
  const x = f.cx + (Math.random() - 0.5) * 140;
  const y = f.cy + (Math.random() - 0.5) * 100;
  switch (ab.vfx) {
    case 'frost':
      a.fx.frost(x, y);
      break;
    case 'fire':
      for (let i = 0; i < 3; i++) a.fx.burn(x + (Math.random() - 0.5) * 80, y);
      break;
    case 'zap':
      a.fx.lightning(x - 300, y - 400, x, y);
      break;
    case 'gold':
      a.fx.glint(x, y, 6);
      break;
    case 'heal':
      a.fx.healBurst(x, y);
      break;
    case 'wind':
      a.fx.ring(x, y, ab.color, 1.2, 0.4);
      break;
    case 'ink':
      a.fx.splat(x, y, true);
      break;
    case 'rain':
      a.fx.explosion(x, y, 80);
      break;
    case 'slam':
      a.fx.explosion(x, y, 160);
      break;
    default:
      a.fx.impact(x, y, true);
  }
  a.fx.ring(x, y, ab.color, 0.8, 0.8);
  a.flash(90, (ab.color >> 16) & 255, (ab.color >> 8) & 255, ab.color & 255);
  a.shake(100, 0.006);
  f.flash(0xffffff, 60);
}


export const brains: Record<string, () => Brain> = { mirrorpeel, soleprop, ghostfuture, soleunbound };
