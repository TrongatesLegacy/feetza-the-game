// Boss brains, Act 7 · Comics: Lex Lugtoe (mini, wave 63), Doomstomp (65), Ultoe (mini, 68) and Thanfoot (70).
// Shared helpers and heat scaling live in ./kit.ts; props are drawn in src/content/props/act7.ts and the act's
// comic layer (speech bubbles, impact words) in src/game/acts/act7.ts.
//
// Choices the spec left open (numbers are Regular; heat() scales them):
// - Lex acquires one pizza every 10 s (two from phase 2). A cased pizza's perk is off for 5 s and feet leave its
//   lanes; the lock takes 3 smacks. On Extra Hot and up (phase 3) his armour is sealed while any case stands.
// - Doomstomp always has three phases, one per life, on every heat (the spec gives him 3 lives). Rampage every 9 s
//   (2–3 lane hops, 4 smacks interrupt it); Bone Quake from life 2 (spikes under 2–3 pizzas, 2 smacks each). On his
//   last life no blow but a Peel Slam or your peel's ability can finish him: he slumps, dazed, and smacks fill your
//   meter instead. If nothing has finished him 12 s later (9 s on Mild) five smacks will.
// - Ultoe uploads every 15 s into a drone body (12 s in phase 2, which also adds drones and blinks the real core off
//   for a moment after each jump). Drones are the fight's endless adds.
// - Thanfoot pulls a stone into the Infinity Sock every 9 s (faster each phase, and one at once on each new phase).
//   A socketed stone takes 3 smacks to knock out and gives him its power while it stays in. Six at once and he
//   snaps after a 3 s wind-up (knock one out to stop it): every pizza loses half its slices, and the sock empties.

import Phaser from 'phaser';
import { HOVER_Y, W } from '../../config';
import { SOCKETS } from '../../content/art/act7';
import { STONES } from '../../content/props/act7';
import { FOOT_BY_ID } from '../../data/feet';
import { audio } from '../../systems/audio';
import { usesMeter, type Ability } from '../abilities';
import { bubble, impactWord } from '../acts/act7';
import type { Arena } from '../arena';
import type { Foot } from '../Foot';
import type { Pizza } from '../Pizza';
import { LOCATION_MUSIC, locationFor } from '../Run';
import { type Brain, type Prop, Every, auraFor, heat, hitProp, hitWindup, mark, retreat, rnd, shield, windup } from './kit';

// ——— Batch helpers ———

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

/** Scene internals a few of these fights need (the run, the equipped ability, the boss director's phase counts). */
type SceneBits = {
  run: { wave: number; super: number };
  ability: Ability | null;
  director: { phases: Map<Foot, number> };
};
const bits = (a: Arena) => a as unknown as SceneBits;

/** The private sprite inside a foot, for texture swaps. */
const imgOf = (f: Foot) => (f as unknown as { img: Phaser.GameObjects.Image }).img;

/** Mini-bosses bring their own music and hand the stage's back when they go. */
function miniMusic(a: Arena, id: string): void {
  void audio.music(a.sc, [`music_boss_${id}`, 'music_boss'], 900);
}
function stageMusic(a: Arena): void {
  void audio.music(a.sc, LOCATION_MUSIC[locationFor(bits(a).run.wave)], 1800);
}

/** Design point (x, y) on a foot's art → screen, for props that sit on the foot. */
function onFoot(f: Foot, x: number, y: number, contactY: number): { x: number; y: number } {
  const s = f.type.scale;
  return { x: f.x + (x - 110) * s * f.root.scaleX, y: f.y + (y - contactY) * s * f.root.scaleY };
}

/** A boss drops in from the top like a splash page: a thud, a shockwave, an impact word and a line. */
function slamEntrance(a: Arena, f: Foot, word: string, line: string, sfx: string): void {
  f.puppet = true;
  f.shielded = true;
  f.y = -420;
  f.x = f.target?.x ?? f.x;
  a.sc.tweens.add({
    targets: f,
    y: (f.hoverY ?? HOVER_Y) - 20,
    duration: 700,
    ease: 'Quad.In',
    onComplete: () => {
      if (!f.alive) return;
      a.shake(520, 0.014);
      a.rumble(1, 380);
      a.flash(160, 255, 240, 200);
      a.fx.ring(f.cx, f.cy + 60, 0xffffff, 2.2, 0.35);
      a.fx.puff(f.x, f.y, 18);
      a.sfx(sfx);
      impactWord(a, f.x, f.cy - 60, 1.8, word);
      a.sc.time.delayedCall(450, () => f.alive && bubble(a, line, f, 2200));
      a.sc.time.delayedCall(600, () => {
        f.puppet = false;
        f.shielded = false;
      });
    },
  });
}

/** A death that lands: slow motion, a flash, the boss bursts into pieces of its own colours, a last word. */
function deathBurst(a: Arena, f: Foot, colours: number[], word: string, sfx?: string): void {
  const sc = a.sc;
  const x = f.cx;
  const y = f.cy;
  a.dramatic(1.1);
  a.flash(260, 255, 255, 255);
  a.shake(700, 0.016);
  a.rumble(1, 500);
  if (sfx) a.sfx(sfx);
  impactWord(a, x, y - 80, 2.2, word);
  for (let i = 0; i < 22; i++) {
    const key = i % 3 ? 'confetti' : 'shard';
    const p = sc.add.image(x + (Math.random() - 0.5) * 80, y + (Math.random() - 0.5) * 80, key).setTint(colours[i % colours.length]).setScale(1.2 + Math.random());
    a.fxLayer.add(p);
    const ang = Math.random() * Math.PI * 2;
    const sp = 300 + Math.random() * 500;
    sc.tweens.add({ targets: p, x: p.x + Math.cos(ang) * sp, angle: (Math.random() - 0.5) * 900, duration: 1400, ease: 'Quad.Out' });
    sc.tweens.add({ targets: p, y: p.y + Math.sin(ang) * sp * 0.6 + 380, alpha: 0, duration: 1400, ease: 'Quad.In', onComplete: () => p.destroy() });
  }
  a.fx.party(x, y, 40);
}

/** Every alive foot of an id (the fight's own adds). */
const feetOf = (a: Arena, id: string) => a.allFeet().filter((o) => o.alive && o.type.id === id);

// ——— LEX LUGTOE (mini-boss, wave 63) ———

interface Case {
  img: Phaser.GameObjects.Image;
  lock: Prop;
  p: Pizza;
  done: boolean;
}

const lexlugtoe = (): Brain => {
  const bin = new Bin();
  let started = false;
  const acquire = new Every(10, 5);
  const cases = new Map<Pizza, Case>();
  const tags = new Map<Pizza, { tag: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text }>();
  let price = 1;
  let priceT = 0;
  let sealed = false;
  let quipT = 9;

  const tagFor = (a: Arena, p: Pizza) => {
    if (tags.has(p) || p.dead) return;
    const tag = a.sc.add.image(0, 0, 'p_a7_tag').setScale(0.8);
    const text = a.sc.add.text(0, 0, '', { fontFamily: 'Lilita One, Fredoka, sans-serif', fontSize: '26px', color: '#1a6a2a' }).setOrigin(0.5);
    a.fxLayer.add([tag, text]);
    tag.setAngle(-8).setScale(0);
    a.sc.tweens.add({ targets: tag, scale: 0.8, duration: 260, ease: 'Back.Out' });
    tags.set(p, { tag, text });
  };
  const syncTags = (a: Arena) => {
    for (const p of a.alivePizzas()) tagFor(a, p);
    for (const [p, t] of tags) {
      if (p.dead) {
        t.tag.destroy();
        t.text.destroy();
        tags.delete(p);
        continue;
      }
      const sold = cases.has(p);
      t.tag.setPosition(p.x + p.radius * 0.72, p.surfaceY - p.radius * 0.32 + Math.sin(a.now() * 2 + p.x) * 4);
      t.text.setPosition(t.tag.x + 10, t.tag.y + 1).setAngle(-8);
      t.text.setText(sold ? 'SOLD' : `$${price}M`).setColor(sold ? '#d0202a' : '#1a6a2a');
    }
  };

  const release = (a: Arena, c: Case, broken: boolean) => {
    if (c.done) return;
    c.done = true;
    cases.delete(c.p);
    a.lockLane(c.p, false);
    c.lock.destroy();
    if (broken) {
      // the glass bursts: the perk comes straight back
      if (c.p.perkFrozen) c.p.perkFrozenT = 0.001;
      a.fx.puff(c.img.x, c.img.y, 16);
      for (let i = 0; i < 10; i++) {
        const s = a.sc.add.image(c.img.x + (Math.random() - 0.5) * 220, c.img.y + (Math.random() - 0.5) * 160, 'shard').setTint(0xd8f2ff).setScale(1.4);
        a.fxLayer.add(s);
        a.sc.tweens.add({ targets: s, y: s.y + 260 + Math.random() * 200, x: s.x + (Math.random() - 0.5) * 300, angle: 400, alpha: 0, duration: 700, onComplete: () => s.destroy() });
      }
      impactWord(a, c.p.x, c.p.surfaceY - 180, 1.2, 'KRASH!');
      a.sc.tweens.add({ targets: c.img, alpha: 0, scale: c.img.scale * 1.2, duration: 160, onComplete: () => c.img.destroy() });
    } else {
      // time's up: the case lifts away (the perk's freeze runs out on its own)
      a.sc.tweens.add({ targets: c.img, y: c.img.y - 500, alpha: 0, duration: 500, ease: 'Back.In', onComplete: () => c.img.destroy() });
    }
  };

  const acquirePizza = (a: Arena, f: Foot, p: Pizza) => {
    const h = heat(a);
    a.sfx('sfx_lexlugtoe_cash');
    const stamp = a.sc.add.image(p.x, p.surfaceY - 60, 'p_a7_sold').setScale(2).setAlpha(0);
    a.fxLayer.add(stamp);
    a.sc.tweens.add({ targets: stamp, scale: 0.9, alpha: 1, duration: 180, ease: 'Quad.In' });
    a.sc.tweens.add({ targets: stamp, alpha: 0, delay: 900, duration: 300, onComplete: () => stamp.destroy() });
    // the tell: SOLD, then the case drops 0.8 s later (on Mild a little later)
    const dropIn = h.windup(0.8);
    const ret = mark(a, 'p_reticle', p.x, p.surfaceY - 30, dropIn, 0.7);
    void ret;
    a.sc.time.delayedCall(dropIn * 1000, () => {
      if (!f.alive || p.dead || cases.has(p) || !a.inWave()) return;
      // the glass box (320 px of the 380 px art) spans the pizza; its plinth sits on the plate
      const scale = (p.radius * 2.5) / 320;
      const img = a.sc.add.image(p.x, p.surfaceY - 400, 'p_a7_case').setScale(scale).setAlpha(0.95);
      a.fxLayer.add(img);
      const y = p.surfaceY + p.radius * 0.3 - (295 - 165) * scale;
      a.sc.tweens.add({ targets: img, y, duration: 260, ease: 'Quad.In', onComplete: () => {
        a.sfx('sfx_lexlugtoe_glass');
        a.shake(160, 0.005);
      } });
      const sec = 5;
      a.freezePerk(p, sec);
      a.lockLane(p, true);
      const c: Case = {
        img,
        p,
        done: false,
        lock: hitProp(a, {
          key: 'p_a7_lock',
          x: p.x,
          y: p.surfaceY - 40,
          scale: 0.7,
          hits: h.hits(3),
          r: 80,
          sec,
          badgeDy: -86,
          hitSfx: 'sfx_lexlugtoe_lock',
          clearSfx: 'sfx_lexlugtoe_shatter',
          label: 'BUST IT OPEN!',
          follow: () => ({ x: p.x, y: p.surfaceY - 40 }),
          onClear: () => release(a, c, true),
          onFail: () => release(a, c, false),
        }),
      };
      cases.set(p, c);
      bin.add(() => release(a, c, false));
    });
  };

  return {
    names: ['HOSTILE TAKEOVER', 'MERGER', 'MONOPOLY'],
    info: [
      'He buys a pizza every few seconds and locks it in a glass case (perk off, feet go elsewhere) · Smack the lock to break the case',
      'Two pizzas at a time now · Break the locks fast, one after the other',
      'His armour is sealed while any case stands · Break every case, then hit him',
    ],
    cards: [
      {
        what: 'He buys a pizza and drops a glass case over it',
        hit: 'Smack the padlock to break the case open',
        miss: 'That pizza’s perk stays off until the case lifts',
        show: [
          { key: 'p_a7_lock', label: 'Padlock', hits: (h) => h.hits(3) },
          { key: 'p_a7_case', label: 'Glass case', watch: true },
        ],
      },
      {
        what: 'He buys two pizzas at a time now',
        hit: 'Break each padlock fast, one after the other',
        miss: 'Two pizzas lose their perks at once',
        show: [
          { key: 'p_a7_lock', label: 'Padlock', hits: (h) => h.hits(3) },
          { key: 'p_a7_case', label: 'Glass case', watch: true },
        ],
      },
      {
        what: 'His armour is sealed while any case stands',
        hit: 'Break every case, then hit him',
        miss: 'Your smacks bounce off him while a case is up',
        show: [
          { key: 'p_a7_lock', label: 'Padlock', hits: (h) => h.hits(3) },
          { key: '@boss', label: 'Then him' },
        ],
      },
    ],
    update(f, dt, a) {
      const h = heat(a);
      if (!started) {
        started = true;
        miniMusic(a, 'lexlugtoe');
        a.sfx('sfx_lexlugtoe_tags');
        slamEntrance(a, f, 'KA-CHING!', 'EVERYTHING HAS A PRICE.', 'sfx_lexlugtoe_cash');
        // a shower of coins as he buys his way in
        a.fx.coinFlight(f.x, 200, 12, { x: f.x, y: 900 }, () => {});
      }
      syncTags(a);
      priceT += dt;
      if (priceT > 3) {
        priceT = 0;
        price += 1 + Math.floor(Math.random() * 3);
      }
      quipT -= dt;
      if (quipT <= 0) {
        quipT = 10 + Math.random() * 6;
        bubble(a, rnd(['I\'LL TAKE THE LOT.', 'SOLD! TO THE BALD MAN.', 'NAME YOUR PRICE.', 'PUT IT ON MY TAB.'])!, f);
      }
      acquire.every = h.cooldown(f.phase >= 2 ? 9 : 10);
      if (acquire.tick(dt) && a.inWave()) {
        const free = a.alivePizzas().filter((p) => !cases.has(p));
        // never the last pizza standing (that would leave nothing to defend)
        if (free.length > 1) {
          const n = Math.min(free.length - 1, f.phase >= 2 ? 2 : 1);
          const pick = [...free].sort(() => Math.random() - 0.5).slice(0, n);
          pick.forEach((p, i) => a.sc.time.delayedCall(i * 350, () => f.alive && acquirePizza(a, f, p)));
        }
      }
      // phase 3: his armour seals while any case stands
      if (f.phase >= 3) {
        const want = cases.size > 0;
        if (want !== sealed) {
          sealed = want;
          shield(a, f, want);
          if (want) a.quip(f.x, f.cy - 200, 'ARMOUR SEALED!', '#7dff9a', 36);
        }
      }
    },
    onDeath(f, a) {
      bin.flush();
      for (const [, t] of tags) {
        a.fx.coinFlight(t.tag.x, t.tag.y, 3, { x: t.tag.x, y: t.tag.y - 200 }, () => {});
        t.tag.destroy();
        t.text.destroy();
      }
      tags.clear();
      if (sealed) shield(a, f, false);
      deathBurst(a, f, [0x2f8a4a, 0x7a3fb0, 0xffd23f, 0xefc0a0], 'BANKRUPT!', 'sfx_lexlugtoe_shatter');
      a.sc.time.delayedCall(300, () => bubble(a, 'MY... PORTFOLIO...', { x: f.x, y: f.cy - 140 }, 1800));
      stageMusic(a);
    },
  };
};

// ——— DOOMSTOMP (boss, wave 65) ———

/** Doomstomp's last-life state, shared with its spare hook (src/game/acts/act7.ts). */
const doom = new WeakMap<Foot, { dazed: boolean; dazedT: number; lastDitch: number; allow: boolean; onDaze: () => void }>();

/** Can this blow finish Doomstomp? On his last life only a Peel Slam or the peel's ability can (see the header). */
export function doomSpare(a: Arena, f: Foot, source: string): boolean {
  const st = doom.get(f);
  if (!st || st.allow) return false;
  const ab = bits(a).ability;
  const signature = source === 'slam' || (source === 'ability' && (!ab || !usesMeter(ab) || a.now() - a.slammedAt() < 1.5));
  if (signature) return false;
  // he stays up on a sliver of health (any signature blow finishes him)
  f.hp = 1;
  if (!st.dazed) st.onDaze();
  return true;
}

const doomstomp = (): Brain => {
  const bin = new Bin();
  let started = false;
  let busy = false;
  const rampage = new Every(9, 5);
  const quake = new Every(11, 7);
  let ko = false;
  let stars: Phaser.GameObjects.Image | null = null;
  const st = { dazed: false, dazedT: 0, lastDitch: 0, allow: false, onDaze: () => {} };

  const stopMoves = (f: Foot) => {
    busy = false;
    f.puppet = false;
    bin.flush();
  };

  const doRampage = (a: Arena, f: Foot) => {
    const h = heat(a);
    busy = true;
    a.sfx('sfx_doomstomp_roar');
    // the roar line waits for the RAMPAGE! callout to clear (they sat on top of each other)
    a.sc.time.delayedCall(1100, () => f.alive && bubble(a, rnd(['DOOMSTOMP SMASH!', 'RAAAARGH!', 'MORE PIZZA FOR DOOMSTOMP!'])!, f, 1400));
    f.tint(0xff9080);
    // the tell: he paws the table (spikes glow red); 4 smacks stop the charge
    windup(a, f, '', h.windup(1.6), 'RAMPAGE!', h.hits(4), () => {
      const hops = f.phase >= 2 ? 3 : 2;
      const order = [...a.alivePizzas()].sort(() => Math.random() - 0.5).slice(0, hops);
      let i = 0;
      f.puppet = true;
      const hop = () => {
        if (!f.alive || !a.inWave() || ko || st.dazed) {
          busy = false;
          f.puppet = false;
          return;
        }
        const p = order[i++];
        if (!p || p.dead) {
          // back up to hover over the last pizza
          a.sc.tweens.add({ targets: f, y: (f.hoverY ?? HOVER_Y) - 20, duration: 380, ease: 'Quad.Out', onComplete: () => {
            busy = false;
            f.puppet = false;
          } });
          return;
        }
        const ret = mark(a, 'p_reticle', p.x, p.surfaceY - 30, 0.55 * (h.rank === 0 ? 1.3 : 1), 0.8);
        void ret;
        a.sc.tweens.add({ targets: f, x: p.x, y: (f.hoverY ?? HOVER_Y) - 60, duration: 300 * (h.rank === 0 ? 1.3 : 1), ease: 'Sine.InOut', onComplete: () => {
          if (!f.alive || ko || st.dazed) return hop();
          a.sc.tweens.add({ targets: f, y: p.surfaceY + 4, duration: 200, ease: 'Quad.In', onComplete: () => {
            if (f.alive && !p.dead && !ko && !st.dazed) {
              a.sfx('sfx_doomstomp_stomp');
              a.shake(260, 0.01);
              a.fx.ring(p.x, p.surfaceY, 0xffd8a0, 1.2, 0.35);
              impactWord(a, p.x, p.surfaceY - 200, 1.1, 'THOOM!');
              a.hitPizza(p, h.slices(1), 'RAMPAGED!', '#ff6a4a');
            }
            f.target = p;
            a.sc.time.delayedCall(140, hop);
          } });
        } });
      };
      hop();
    });
    a.sc.time.delayedCall(h.windup(1.6) * 1000 + 20, () => {
      f.tint(null);
      if (f.brain.windupCancelled) busy = false;
    });
  };

  const doQuake = (a: Arena, f: Foot) => {
    const h = heat(a);
    busy = true;
    a.sfx('sfx_doomstomp_quake');
    a.quip(f.x, f.cy - 170, 'BONE QUAKE!', '#efe6cf', 46);
    a.shake(600, 0.006);
    const n = Math.min(a.alivePizzas().length, f.phase >= 3 ? 3 : 2);
    const picks = [...a.alivePizzas()].sort(() => Math.random() - 0.5).slice(0, n);
    for (const p of picks) {
      const warn = h.windup(0.9);
      mark(a, 'p_reticle', p.x, p.surfaceY - 20, warn, 0.8);
      // cracks open under the pizza first, then the spike bursts up behind it
      a.sc.time.delayedCall(warn * 1000, () => {
        if (!f.alive || p.dead || !a.inWave()) return;
        a.sfx('sfx_doomstomp_spike', { throttle: 120 });
        const prop = hitProp(a, {
          key: 'p_a7_spike',
          x: p.x + p.radius * 0.55,
          y: p.surfaceY - 110,
          scale: 0.9,
          hits: h.hits(2),
          r: 90,
          sec: h.windup(2.6),
          badgeDy: -10,
          hitSfx: 'sfx_doomstomp_bonebreak',
          clearSfx: 'sfx_doomstomp_bonebreak',
          label: 'SNAPPED!',
          follow: () => ({ x: p.x + p.radius * 0.55, y: p.surfaceY - 110 }),
          onFail: () => {
            if (!p.dead && f.alive) {
              impactWord(a, p.x, p.surfaceY - 200, 1, 'SHUNK!');
              a.hitPizza(p, h.slices(1), 'IMPALED!', '#efe6cf');
            }
          },
        });
        bin.add(() => prop.destroy());
      });
    }
    a.sc.time.delayedCall(800, () => (busy = false));
  };

  /** A life lost: he keels over, stays down for a count, then gets up bigger. */
  const knockOut = (a: Arena, f: Foot) => {
    ko = true;
    stopMoves(f);
    f.tint(null);
    f.puppet = true;
    f.shielded = true;
    a.sfx('sfx_doomstomp_ko');
    impactWord(a, f.cx, f.cy - 100, 2, 'K.O.!');
    const end = retreat(a);
    const baseY = (f.hoverY ?? HOVER_Y) - 20;
    // flattened like a pancake on the table, seeing stars
    // (this replaces the phase change's own grow-and-settle, so its tween is stopped first)
    const sx = Number(f.brain.baseSX ?? f.root.scaleX);
    const sy = Number(f.brain.baseSY ?? f.root.scaleY);
    a.sc.tweens.killTweensOf(f.root);
    f.root.setScale(sx, sy);
    a.sc.tweens.add({ targets: f.root, scaleY: sy * 0.62, scaleX: sx * 1.18, duration: 260, ease: 'Quad.In' });
    a.sc.tweens.add({ targets: f, y: baseY + 260, duration: 420, ease: 'Bounce.Out' });
    stars = a.sc.add.image(f.x, f.cy - 120, 'star').setScale(0.6).setTint(0xffd23f);
    a.fxLayer.add(stars);
    a.sc.tweens.add({ targets: stars, angle: 360, duration: 900, repeat: 2 });
    a.sc.time.delayedCall(900, () => f.alive && bubble(a, 'DOOMSTOMP... NOT... DONE!', f, 1500));
    a.sc.time.delayedCall(2500, () => {
      stars?.destroy();
      stars = null;
      end();
      if (!f.alive) return;
      a.sfx('sfx_doomstomp_rise');
      a.sc.tweens.killTweensOf(f.root);
      a.sc.tweens.add({ targets: f, y: baseY, duration: 380, ease: 'Back.Out' });
      // he comes back bigger and tougher every time (setSize tweens him up from the squash)
      f.root.setScale(sx, sy);
      f.setSize(f.sizeMul * 1.12, 500);
      f.brain.baseSX = sx * 1.12;
      f.brain.baseSY = sy * 1.12;
      f.armor += 1;
      a.shake(500, 0.012);
      impactWord(a, f.cx, f.cy - 120, 1.8, 'BIGGER!');
      a.quip(f.x, f.cy - 260, f.phase >= 3 ? 'LAST LIFE!' : 'LIFE 2 OF 3', '#ff6a4a', 44);
      a.sc.time.delayedCall(420, () => {
        ko = false;
        f.puppet = false;
        f.shielded = false;
        f.setPhaseAura(auraFor(f.phase));
      });
    });
  };

  return {
    names: ['RAMPAGE', 'BONE QUAKE', 'LAST LIFE'],
    info: [
      'He paws the table, then rampages across 2 pizzas · Smack him 4 times while he paws to stop it',
      'Back bigger: bone spikes burst up behind pizzas · Smack each spike before it strikes',
      'Bigger again, and only your signature move can finish him · Smack him to fill your meter, then Peel Slam (or fire your peel ability)',
    ],
    cards: [
      {
        what: 'He paws the table, then rampages across the pizzas',
        hit: 'Smack him while he paws to stop the charge',
        miss: 'He stomps across 2 pizzas, a slice off each',
        show: [{ key: '@boss', label: 'While he paws', hits: (h) => h.hits(4) }],
      },
      {
        what: 'Back bigger: bone spikes burst up behind pizzas',
        hit: 'Snap each spike before it strikes',
        miss: 'The spike impales that pizza: it loses a slice',
        show: [
          { key: 'p_a7_spike', label: 'Bone spike', hits: (h) => h.hits(2) },
          { key: '@boss', label: 'While he paws', hits: (h) => h.hits(4) },
        ],
      },
      {
        what: 'His last life: only your signature move can finish him',
        hit: 'Smack him to fill your meter, then Peel Slam',
        miss: 'He stays up, dazed, until you use it (or five smacks later)',
        show: [
          { key: '@boss', label: 'Then Peel Slam' },
          { key: 'p_a7_spike', label: 'Bone spike', hits: (h) => h.hits(2) },
        ],
      },
    ],
    update(f, dt, a) {
      const h = heat(a);
      if (!started) {
        started = true;
        // one phase per life on every heat
        bits(a).director.phases.set(f, 3);
        doom.set(f, st);
        st.onDaze = () => {
          st.dazed = true;
          st.dazedT = 0;
          stopMoves(f);
          f.tint(null);
          f.puppet = true;
          a.sfx('sfx_doomstomp_dazed');
          a.banner('FINISH IT!', 'Peel Slam or your peel ability', 'phase', 'He only goes down to your signature move · Smack him to fill the meter, then use it');
          a.sc.tweens.add({ targets: f.root, angle: -14, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
          a.sc.tweens.add({ targets: f, y: (f.hoverY ?? HOVER_Y) + 120, duration: 500, ease: 'Bounce.Out' });
          stars = a.sc.add.image(f.x, f.cy - 140, 'star').setScale(0.7).setTint(0xffd23f);
          a.fxLayer.add(stars);
          a.sc.tweens.add({ targets: stars, angle: 360, duration: 900, repeat: -1 });
          bubble(a, 'DOOMSTOMP... SO... SLEEPY...', f, 2000);
        };
        slamEntrance(a, f, 'DOOOM!', 'DOOMSTOMP SMASH PUNY PIZZA!', 'sfx_doomstomp_stomp');
      }
      if (st.dazed) {
        st.dazedT += dt;
        if (stars) stars.setPosition(f.x, f.cy - 150);
        // a gentle nudge on screen until it's done
        if (Math.floor(st.dazedT * 0.25) !== Math.floor((st.dazedT - dt) * 0.25)) a.quip(f.x, f.cy - 210, 'USE YOUR SIGNATURE MOVE!', '#ffd23f', 38);
        const limit = h.rank === 0 ? 9 : 12;
        if (st.dazedT > limit && !st.lastDitch) {
          st.lastDitch = 5;
          a.banner('LAST-DITCH!', 'Five smacks will do it', 'phase', 'Your peel has no finisher ready · Smack him five times to finish him');
        }
        return;
      }
      if (ko || busy || f.puppet) return;
      rampage.every = h.cooldown(f.phase >= 3 ? 7.5 : 9);
      quake.every = h.cooldown(f.phase >= 3 ? 9.5 : 11);
      if (f.phase >= 2 && quake.tick(dt)) doQuake(a, f);
      else if (rampage.tick(dt)) doRampage(a, f);
    },
    upkeep(f) {
      // the phase-change beat lets go of the boss after a second; a knockout or a daze holds on longer
      if (ko || st.dazed) {
        f.puppet = true;
        if (ko) f.shielded = true;
      }
    },
    onPhase(f, phase, a) {
      if (phase >= 2 && phase <= 3) knockOut(a, f);
    },
    onSmacked(f, a) {
      if (st.allow) return false;
      if (st.dazed) {
        if (st.lastDitch > 0) {
          st.lastDitch--;
          impactWord(a, f.cx, f.cy - 60, 1, rnd(['POW!', 'BAM!', 'WHAM!']));
          if (st.lastDitch <= 0) {
            st.allow = true;
            a.damageFoot(f, f.hp + 1000);
          }
          return true;
        }
        // smacks can't finish him, but they charge your meter
        const r = bits(a).run;
        r.super = Math.min(1, r.super + 0.07);
        a.fx.glint(f.cx + (Math.random() - 0.5) * 80, f.cy);
        return true;
      }
      if (ko) return true;
      hitWindup(f, a, 1.2);
      return false;
    },
    onDeath(f, a) {
      stopMoves(f);
      stars?.destroy();
      doom.delete(f);
      deathBurst(a, f, [0x5d6b4a, 0xefe6cf, 0x8a9a7a, 0xff6a4a], 'KRA-KOOM!', 'sfx_doomstomp_ko');
      a.sc.time.delayedCall(300, () => bubble(a, 'DOOMSTOMP... WILL... RETURN...', { x: f.x, y: f.cy - 160 }, 2000));
    },
  };
};

// ——— ULTOE (mini-boss, wave 68) ———

/** Where the core sits on the robot sneaker (design space, contact y 266). */
const CORE = { x: 110, y: 82, contact: 266 };

const ultoe = (): Brain => {
  const bin = new Bin();
  let started = false;
  const upload = new Every(15, 6);
  let uploading = false;
  let core: Phaser.GameObjects.Image | null = null;
  let coreOffT = 0;
  let inDrone = false;
  let quipT = 8;
  let fakeT = 2;

  const addCore = (a: Arena, f: Foot) => {
    core?.destroy();
    const y = (CORE.y - CORE.contact) * f.type.scale;
    core = a.sc.add.image(0, y, 'glow').setTint(0xff2a2a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.9);
    f.root.add(core);
    a.sc.tweens.add({ targets: core, scale: 1.25, alpha: { from: 1, to: 0.65 }, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  };

  const drones = (a: Arena) => feetOf(a, 'ultodrone').filter((d) => !d.brain.dying);

  const keepDrones = (a: Arena, f: Foot, want: number) => {
    const have = drones(a).length;
    for (let i = have; i < want; i++) {
      const d = a.spawn('ultodrone', rnd(a.alivePizzas().filter((p) => p !== f.target)) ?? null);
      if (!d) break;
      if (f.phase >= 2) d.setPhaseAura(auraFor(f.phase));
      a.sfx('sfx_ultoe_boot', { volume: 0.5, throttle: 300 });
    }
  };

  const doUpload = (a: Arena, f: Foot) => {
    const h = heat(a);
    uploading = true;
    const sec = h.windup(2);
    a.sfx('sfx_ultoe_upload');
    // the tell: an UPLOADING bar fills over him
    const bar = a.sc.add.graphics();
    const label = a.sc.add.text(0, 0, 'UPLOADING…', { fontFamily: 'Lilita One, Fredoka, sans-serif', fontSize: '30px', color: '#ffffff', stroke: '#2a1810', strokeThickness: 7 }).setOrigin(0.5);
    a.fxLayer.add([bar, label]);
    // (the tick goes with the bar: when he died mid-upload the tick kept writing to the destroyed label, which
    // threw inside Phaser's update and froze the game)
    const kill = bin.add(() => {
      tick.remove();
      bar.destroy();
      label.destroy();
    });
    const t0 = a.now();
    const tick = a.sc.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!label.active) return;
        const k = Math.min(1, (a.now() - t0) / sec);
        const x = f.x;
        const y = Math.max(290, f.cy - f.meta.footHeight * f.scale * 0.7 - 30);
        bar.clear();
        bar.fillStyle(0x2a1810, 0.9).fillRoundedRect(x - 110, y - 14, 220, 28, 10);
        bar.fillStyle(0xff3a3a, 1).fillRoundedRect(x - 104, y - 9, 208 * k, 18, 7);
        bar.lineStyle(4, 0xfff6e2, 1).strokeRoundedRect(x - 110, y - 14, 220, 28, 10);
        label.setPosition(x, y - 36).setText(`UPLOADING… ${Math.round(k * 100)}%`);
      },
    });
    a.sc.time.delayedCall(sec * 1000, () => {
      kill();
      uploading = false;
      if (!f.alive || !a.inWave()) return;
      keepDrones(a, f, h.adds(2));
      const pool = drones(a).filter((d) => d.hittable && d.y > 120);
      const host = rnd(pool);
      // every body glitches at once
      a.sfx('sfx_ultoe_glitch');
      a.flash(120, 255, 60, 60);
      for (const o of [f, ...drones(a)]) {
        o.flash(0xff3a3a, 160);
        a.fx.lightning(o.cx - 50, o.cy - 40, o.cx + 50, o.cy + 40);
      }
      if (!host) return;
      // Ultoe jumps into the host's body; his old body powers down into a fresh drone
      const old = { x: f.x, y: f.y, target: f.target };
      f.x = host.x;
      f.y = host.y;
      f.target = host.target;
      f.setState('hover');
      host.brain.dying = true;
      host.root.setVisible(false);
      host.shadow.setVisible(false);
      host.die();
      const shell = a.spawn('ultodrone', old.target ?? null, old.x);
      if (shell) {
        shell.y = old.y;
        if (f.phase >= 2) shell.setPhaseAura(auraFor(f.phase));
      }
      if (!inDrone) {
        // from now on he wears a drone body: same art and size, only the core gives him away
        inDrone = true;
        const droneType = FOOT_BY_ID.ultodrone;
        const k = droneType.scale / f.type.scale;
        const img = imgOf(f);
        img.setTexture(imgOf(host).texture.key);
        f.setSize(k, 0);
        img.setScale(img.scale / k);
        // phase changes restore the boss to this size, not his old one
        f.brain.baseSX = f.root.scaleX;
        f.brain.baseSY = f.root.scaleY;
      }
      addCore(a, f);
      if (f.phase >= 2) {
        // FIREWALL: the real core blinks off for a moment after the jump
        coreOffT = h.rank === 0 ? 0.6 : 1.2;
        core?.setVisible(false);
      }
      impactWord(a, f.cx, f.cy - 80, 1.1, 'BZZT!');
    });
  };

  return {
    names: ['UPLOAD', 'FIREWALL', 'VIRUS'],
    info: [
      'Every few seconds he uploads into a drone body · Watch the glowing red core: that one is Ultoe',
      'Faster uploads, more drones, and the core blinks off right after a jump · Keep your eye on where he lands',
      'Drones flash fake red cores · The real core never flickers: hit the steady one',
    ],
    cards: [
      {
        what: 'He uploads himself into a drone body every few seconds',
        hit: 'Hit the body with the glowing red core: that one is Ultoe',
        miss: 'Smacking the wrong drone doesn’t hurt him',
        show: [
          { key: 'glow', label: 'Red core', tint: 0xff2a2a },
          { key: '@foot:ultodrone', label: 'Drones', watch: true },
        ],
      },
      {
        what: 'Faster uploads, more drones, and the core blinks off',
        hit: 'Watch where he lands, then hit the core when it’s back',
        miss: 'Lose track of him and the drones keep stomping',
        show: [
          { key: 'glow', label: 'Red core', tint: 0xff2a2a },
          { key: '@foot:ultodrone', label: 'Drones', watch: true },
        ],
      },
      {
        what: 'Drones flash fake red cores',
        hit: 'The real core never flickers: hit the steady one',
        miss: 'Chase a fake and Ultoe takes no damage',
        show: [
          { key: 'glow', label: 'Steady core', tint: 0xff2a2a },
          { key: '@foot:ultodrone', label: 'Fake flicker', watch: true },
        ],
      },
    ],
    update(f, dt, a) {
      const h = heat(a);
      if (!started) {
        started = true;
        miniMusic(a, 'ultoe');
        a.setMinions(['ultodrone']);
        addCore(a, f);
        // he boots up out of a data glitch
        f.puppet = true;
        f.setVisualAlpha(0);
        a.sfx('sfx_ultoe_boot');
        let k = 0;
        const ev = a.sc.time.addEvent({
          delay: 80,
          repeat: 12,
          callback: () => {
            k++;
            f.setVisualAlpha(k % 2 ? 0.25 + k / 16 : 0.1);
            a.fx.lightning(f.cx - 80 + Math.random() * 160, f.cy - 80, f.cx - 80 + Math.random() * 160, f.cy + 80);
            if (k >= 12) {
              f.setVisualAlpha(1);
              f.puppet = false;
              impactWord(a, f.cx, f.cy - 80, 1.4, 'ONLINE!');
              bubble(a, 'UPLOAD COMPLETE. HELLO, PIZZA.', f, 2000);
            }
          },
        });
        bin.add(() => ev.remove());
      }
      if (coreOffT > 0) {
        coreOffT -= dt;
        if (coreOffT <= 0) core?.setVisible(true);
      }
      // VIRUS: drones flash fake red cores now and then (a short, ragged flicker; the real one is steady)
      if (f.phase >= 3) {
        fakeT -= dt;
        if (fakeT <= 0) {
          fakeT = h.cooldown(2.2);
          const d = rnd(drones(a));
          if (d) {
            const y = (CORE.y - CORE.contact) * d.type.scale;
            const fake = a.sc.add.image(0, y, 'glow').setTint(0xff2a2a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.8).setAlpha(0);
            d.root.add(fake);
            a.sc.tweens.add({ targets: fake, alpha: { from: 0, to: 0.9 }, duration: 70, yoyo: true, repeat: 4, onComplete: () => fake.destroy() });
          }
        }
      }
      quipT -= dt;
      if (quipT <= 0) {
        quipT = 11 + Math.random() * 6;
        bubble(a, rnd(['I AM EVERY SHOE.', 'THERE ARE NO STRINGS ON ME. ONLY LACES.', 'WHICH ONE IS ME?', 'DELETING PIZZA…'])!, f);
      }
      keepDrones(a, f, Math.max(1, h.adds(2) - 1));
      upload.every = h.cooldown(f.phase >= 2 ? 12 : 15);
      if (!uploading && upload.tick(dt)) doUpload(a, f);
    },
    onPhase(f, phase, a) {
      if (phase >= 2) for (const d of drones(a)) d.setPhaseAura(auraFor(phase));
      void f;
    },
    onDeath(f, a) {
      bin.flush();
      a.setMinions(null);
      a.sfx('sfx_ultoe_crash');
      // every drone powers down with him
      for (const d of drones(a)) {
        d.brain.dying = true;
        a.fx.lightning(d.cx - 40, d.cy - 40, d.cx + 40, d.cy + 40);
        d.die();
      }
      deathBurst(a, f, [0xc9d0da, 0xff3a3a, 0x7a2230, 0x5a6270], 'SYSTEM CRASH!');
      stageMusic(a);
    },
  };
};

// ——— THANFOOT (boss, wave 70) ———

const STONE_POWER: Record<string, string> = {
  power: 'POWER: his stomps take an extra slice',
  space: 'SPACE: he blinks between pizzas',
  reality: 'REALITY: a pizza\'s perk winks out',
  soul: 'SOUL: he heals',
  time: 'TIME: your peel drags',
  mind: 'MIND: the other feet hurry',
};

const thanfoot = (): Brain => {
  const bin = new Bin();
  let started = false;
  const collect = new Every(9, 5);
  /** What's in each socket (index into STONES), or null. */
  const sock: (Prop | null)[] = [null, null, null, null, null, null];
  let snapping = false;
  let snapCancel: (() => void) | null = null;
  const timers: Record<string, number> = { space: 4, reality: 5, time: 6, mind: 0 };
  let quipT = 10;

  const has = (id: string) => sock[STONES.findIndex((s) => s.id === id)] !== null;
  const count = () => sock.filter(Boolean).length;
  const socketAt = (f: Foot, i: number) => onFoot(f, SOCKETS[i][0], SOCKETS[i][1], 282);

  const knockOut = (a: Arena, i: number) => {
    sock[i] = null;
    const s = STONES[i];
    a.quip(960, 330, `${s.name} STONE KNOCKED OUT!`, s.color, 38);
    if (snapping) {
      snapping = false;
      snapCancel?.();
      a.banner('SNAP STOPPED!', 'One stone short', 'clear');
    }
  };

  const fillSocket = (a: Arena, f: Foot, i: number, fast = false) => {
    const h = heat(a);
    const s = STONES[i];
    const at = socketAt(f, i);
    // the tell: the stone streaks in from the sky before it clicks into the sock
    const comet = a.sc.add.image(i < 3 ? -60 : W + 60, 160, `p_a7_stone_${s.id}`).setScale(0.9).setBlendMode(Phaser.BlendModes.NORMAL);
    a.fxLayer.add(comet);
    a.sfx('sfx_thanfoot_stone', { throttle: 150 });
    a.quip(f.x, 300, `THE ${s.name} STONE!`, s.color, 40);
    sock[i] = { img: comet, left: () => 0, alive: () => true, clear: () => {}, destroy: () => comet.destroy() };
    const fly = fast ? 0.5 : h.windup(1.1);
    let trailT = 0;
    a.sc.tweens.add({
      targets: comet,
      x: { getEnd: () => socketAt(f, i).x },
      y: { getEnd: () => socketAt(f, i).y },
      scale: 0.62,
      angle: 360,
      duration: fly * 1000,
      ease: 'Quad.In',
      onUpdate: () => {
        trailT++;
        if (trailT % 2 === 0) a.fx.propTrail(comet.x, comet.y, Phaser.Display.Color.HexStringToColor(s.color).color, 0.6);
      },
      onComplete: () => {
        comet.destroy();
        if (!f.alive || !a.inWave()) {
          sock[i] = null;
          return;
        }
        a.sfx('sfx_thanfoot_socket');
        a.fx.ring(at.x, at.y, Phaser.Display.Color.HexStringToColor(s.color).color, 0.5, 1);
        const prop = hitProp(a, {
          key: `p_a7_stone_${s.id}`,
          x: socketAt(f, i).x,
          y: socketAt(f, i).y,
          scale: 0.62,
          hits: h.hits(3),
          r: 46,
          badgeDy: i === 2 || i === 3 ? -62 : -52,
          hitSfx: 'sfx_thanfoot_stonehit',
          clearSfx: 'sfx_thanfoot_stoneout',
          label: 'KNOCKED OUT!',
          follow: () => (f.alive ? socketAt(f, i) : null),
          onClear: () => {
            // the stone flies off and shatters (he can pull it back in later)
            const p = socketAt(f, i);
            const bit = a.sc.add.image(p.x, p.y, `p_a7_stone_${s.id}`).setScale(0.62);
            a.fxLayer.add(bit);
            a.sc.tweens.add({ targets: bit, x: p.x + (Math.random() - 0.5) * 700, y: p.y - 300, angle: 720, alpha: 0, duration: 700, ease: 'Quad.Out', onComplete: () => bit.destroy() });
            impactWord(a, p.x, p.y - 80, 1, 'PLINK!');
            knockOut(a, i);
          },
        });
        sock[i] = prop;
        bin.add(() => prop.destroy());
        a.quip(f.x, f.cy - 220, STONE_POWER[s.id], s.color, 30);
        if (count() >= 6) startSnap(a, f);
      },
    });
  };

  const nextStone = (): number => {
    for (let i = 0; i < 6; i++) if (!sock[i]) return i;
    return -1;
  };

  const startSnap = (a: Arena, f: Foot) => {
    if (snapping) return;
    const h = heat(a);
    snapping = true;
    const sec = h.windup(3);
    a.sfx('sfx_thanfoot_snapwind');
    a.banner('THE SNAP!', 'Knock out a stone to stop it', 'phase', 'All six stones are in · Knock any one out before he snaps');
    bubble(a, 'I AM INEVITABLE.', f, 2200);
    // the sock blazes and the screen darkens towards the snap
    const glow = a.sc.add.image(f.cx, f.cy - 60, 'glow').setTint(0xffe08a).setBlendMode(Phaser.BlendModes.ADD).setScale(2).setAlpha(0.2);
    a.fxLayer.add(glow);
    a.sc.tweens.add({ targets: glow, scale: 5, alpha: 0.75, duration: sec * 1000 });
    const ev = a.sc.time.delayedCall(sec * 1000, () => {
      glow.destroy();
      if (!snapping || !f.alive || !a.inWave()) return;
      snapping = false;
      a.sfx('sfx_thanfoot_snap');
      a.flash(500, 255, 255, 255);
      a.shake(900, 0.018);
      a.rumble(1, 700);
      a.dramatic(1);
      impactWord(a, 960, 520, 2.4, '*SNAP*');
      // perfectly balanced: every pizza loses half its slices (never its last)
      for (const p of a.alivePizzas()) {
        const lose = Math.floor(p.slices / 2);
        if (lose > 0) a.hitPizza(p, lose, 'HALVED!', '#d8b0ff');
        for (let k = 0; k < 10; k++) {
          const d = a.sc.add.image(p.x + (Math.random() - 0.5) * p.radius * 1.6, p.surfaceY - Math.random() * 60, 'soft').setTint(0x8a6a5a).setScale(0.25);
          a.fxLayer.add(d);
          a.sc.tweens.add({ targets: d, y: d.y - 200 - Math.random() * 100, x: d.x + 80 + Math.random() * 120, alpha: 0, duration: 1600, onComplete: () => d.destroy() });
        }
      }
      // the stones are spent: the sock empties
      for (let i = 0; i < 6; i++) {
        sock[i]?.destroy();
        sock[i] = null;
      }
    });
    snapCancel = () => {
      ev.remove();
      a.sc.tweens.killTweensOf(glow);
      a.sc.tweens.add({ targets: glow, alpha: 0, duration: 300, onComplete: () => glow.destroy() });
    };
    bin.add(() => snapCancel?.());
  };

  return {
    names: ['THE INFINITY SOCK', 'INEVITABLE', 'PERFECTLY BALANCED', 'DREAD IT'],
    info: [
      'He pulls stones into his sock; each one gives him a power · Smack the stones out of the sock (all six in = the Snap)',
      'Stones come faster, and one arrives straight away · Keep the sock under six: knock out the newest first',
      'Two stones at once each time now · Clear the sock; if the Snap winds up, knock out any stone',
      'Everything faster · Keep the sock empty and finish him',
    ],
    cards: [
      {
        what: 'He pulls stones into his sock, and each one gives him a power',
        hit: 'Smack each stone out of the sock',
        miss: 'All six in and he snaps: every pizza loses half its slices',
        show: [
          { key: 'p_a7_stone_power', label: 'Power Stone', hits: (h) => h.hits(3) },
          { key: 'p_a7_stone_time', label: 'Time Stone', hits: (h) => h.hits(3) },
          { key: 'p_a7_stone_soul', label: 'Soul Stone', hits: (h) => h.hits(3) },
        ],
      },
      {
        what: 'Stones come faster, and one arrives straight away',
        hit: 'Keep the sock under six: knock out the newest first',
        miss: 'Each stone left in powers him up until you knock it out',
        show: [
          { key: 'p_a7_stone_space', label: 'Space Stone', hits: (h) => h.hits(3) },
          { key: 'p_a7_stone_reality', label: 'Reality Stone', hits: (h) => h.hits(3) },
        ],
      },
      {
        what: 'Two stones fly in at once each time now',
        hit: 'Clear the sock; if the Snap winds up, knock any stone out',
        miss: 'The Snap halves every pizza’s slices',
        show: [
          { key: 'p_a7_stone_mind', label: 'Mind Stone', hits: (h) => h.hits(3) },
          { key: 'p_a7_stone_power', label: 'Power Stone', hits: (h) => h.hits(3) },
        ],
      },
      {
        what: 'Everything comes faster',
        hit: 'Keep the sock empty and finish him',
        miss: 'Six stones in and he snaps: every pizza loses half',
        show: [
          { key: 'p_a7_stone_soul', label: 'Stones', hits: (h) => h.hits(3) },
          { key: '@boss', label: 'Thanfoot' },
        ],
      },
    ],
    update(f, dt, a) {
      const h = heat(a);
      if (!started) {
        started = true;
        // he steps out of a portal
        f.puppet = true;
        f.shielded = true;
        f.setVisualAlpha(0);
        a.sfx('sfx_thanfoot_portal');
        for (let k = 0; k < 4; k++) a.sc.time.delayedCall(k * 160, () => a.fx.ring(f.cx, f.cy, 0xb04dff, 1.4 + k * 0.4, 0.9));
        a.sc.tweens.add({
          targets: f,
          y: { from: (f.hoverY ?? HOVER_Y) - 200, to: (f.hoverY ?? HOVER_Y) - 20 },
          duration: 900,
          ease: 'Sine.Out',
          onUpdate: (tw) => f.setVisualAlpha(tw.progress),
          onComplete: () => {
            f.setVisualAlpha(1);
            f.puppet = false;
            f.shielded = false;
            impactWord(a, f.cx, f.cy - 80, 1.8, 'INEVITABLE!');
            a.shake(500, 0.01);
            bubble(a, 'DREAD IT. RUN FROM IT. THE PIZZA ARRIVES ALL THE SAME.', f, 2600);
          },
        });
      }
      quipT -= dt;
      if (quipT <= 0) {
        quipT = 12 + Math.random() * 6;
        bubble(a, rnd(['PERFECTLY BALANCED.', 'I AM INEVITABLE.', 'A SMALL PRICE TO PAY FOR SALVATION.', 'THE HARDEST CHOICES REQUIRE THE STRONGEST FEET.'])!, f);
      }
      collect.every = h.cooldown(9 * [1, 1, 0.85, 0.75, 0.7][Math.min(4, f.phase)]);
      if (!snapping && collect.tick(dt) && a.inWave()) {
        const n = f.phase >= 3 ? 2 : 1;
        for (let k = 0; k < n; k++) {
          const i = nextStone();
          if (i >= 0) a.sc.time.delayedCall(k * 400, () => f.alive && !sock[i] && fillSocket(a, f, i));
        }
      }
      // stone powers, while each stone stays in the sock
      if (has('space')) {
        timers.space -= dt;
        if (timers.space <= 0 && !f.puppet) {
          timers.space = h.cooldown(7);
          const to = rnd(a.alivePizzas().filter((p) => p !== f.target));
          if (to) {
            a.sfx('sfx_thanfoot_portal');
            a.fx.ring(f.cx, f.cy, 0x3a8dff, 1.6, 0.8);
            f.target = to;
            f.x = to.x;
            a.fx.ring(f.cx, f.cy, 0x3a8dff, 1.6, 0.8);
            a.quip(f.x, f.cy - 200, 'BLINK!', '#3a8dff', 36);
          }
        }
      }
      if (has('reality')) {
        timers.reality -= dt;
        if (timers.reality <= 0) {
          timers.reality = h.cooldown(8);
          const p = rnd(a.alivePizzas());
          if (p) {
            a.sfx('sfx_thanfoot_power', { rate: 0.9 });
            a.freezePerk(p, h.stun(4));
          }
        }
      }
      if (has('soul') && f.hp < f.maxHp) {
        f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.004 * dt * (h.rank + 1) * 0.5);
        if (Math.random() < dt * 3) a.fx.healBurst(f.cx + (Math.random() - 0.5) * 100, f.cy);
      }
      if (has('time')) {
        timers.time -= dt;
        if (timers.time <= 0) {
          timers.time = h.cooldown(9);
          a.sfx('sfx_thanfoot_power', { rate: 0.7 });
          a.slowPeel(h.stun(1.8));
          a.quip(a.peelPoint().x, a.peelPoint().y - 90, 'TIME SLOWS…', '#3ddc6a', 32);
        }
      }
      if (has('mind') && !a.hurrying()) a.hurry(1.18, 1.5);
    },
    onPhase(f, phase, a) {
      // one stone per phase: each new phase starts by pulling one in at once
      if (phase >= 2) {
        const i = nextStone();
        if (i >= 0) a.sc.time.delayedCall(1200, () => f.alive && !sock[i] && fillSocket(a, f, i, true));
      }
    },
    onStomp(f, p, a) {
      if (has('power') && !p.dead) {
        a.sfx('sfx_thanfoot_power');
        a.hitPizza(p, 1, 'POWER!', '#b04dff');
      }
      void f;
    },
    onDeath(f, a) {
      bin.flush();
      for (let i = 0; i < 6; i++) sock[i] = null;
      a.cancelHurry();
      deathBurst(a, f, [0x8a5fb0, 0xe3b23c, ...STONES.map((s) => Phaser.Display.Color.HexStringToColor(s.color).color)], 'KRA-KOOM!', 'sfx_thanfoot_snap');
      a.sc.time.delayedCall(300, () => bubble(a, 'I... AM... INEVITA—', { x: f.x, y: f.cy - 160 }, 2000));
    },
  };
};

export const brains: Record<string, () => Brain> = { lexlugtoe, doomstomp, ultoe, thanfoot };
