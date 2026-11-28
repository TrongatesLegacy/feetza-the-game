// Wave events: about one wave in four, a flyer crosses the screen or a chest lands on the table.
// Dealing with it pays out, but every smack spent on it is a smack not spent on feet.

import { clockOf } from '../core/clock';
import Phaser from 'phaser';
import { W } from '../config';
import type { Arena } from './arena';
import { slamMode } from './slamMode';
import { heroSighting } from './sightings';
// ——— Act 9 · Greek myths: Charybdis, Tartarus's whirlpool ———
import { charybdis } from './acts/act9';
import { crand } from '../systems/cosmeticRandom';

export type EventId = 'balloon' | 'drone' | 'moth' | 'seagull' | 'chest' | 'mimic' | 'sighting'
  // Act 9 · Greek myths
  | 'charybdis';

export interface EventRewards {
  tips(n: number, x: number, y: number): void;
  heal(slices: number): void;
  /** Some pizza on the table is missing slices (slice rewards only come when one is). */
  hurt(): boolean;
  slam(frac: number): void;
  /** Golden Crusts, capped per run; returns how many were actually granted. */
  crust(n: number, x: number, y: number): number;
  consumable(): void;
  spawnMimic(x: number): void;
  firstSighting(id: EventId): void;
  /** The event was dealt with (popped, caught, opened, a mimic beaten in time): achievements and drops. */
  done(id: EventId, x: number, y: number): void;
  /** Event toppings: seconds flyers stay longer, smacks fewer a chest needs, smacks a hero sighting needs (0: the usual 2), and a callback when one is missed (hero goals count streaks). */
  flyerSec?: number;
  chestLess?: number;
  sightingHits?: number;
  missed?(id: EventId): void;
}

const EVENT_NAMES: Record<EventId, string> = {
  balloon: 'TIP BALLOON',
  drone: 'DELIVERY DRONE',
  moth: 'PEPPER MOTH',
  seagull: 'GOLDEN SEAGULL',
  chest: 'PIZZA BOX CHEST',
  mimic: 'PIZZA BOX CHEST',
  sighting: 'HERO SIGHTING',
  // Act 9 · Greek myths
  charybdis: 'CHARYBDIS',
};

export function eventName(id: EventId): string {
  return EVENT_NAMES[id];
}

/** Pick an event for this wave, or null. Never on boss or mini-boss waves.
 * sighting: this wave's chance of a hero sighting (src/game/sightings.ts), rolled first.
 * (Tartarus swaps some for Charybdis: src/game/acts/act9.ts.) */
export function rollEvent(rate: number, sighting = 0): EventId | null {
  if (sighting > 0 && Math.random() < sighting) return 'sighting';
  if (Math.random() > rate) return null;
  const r = Math.random();
  if (r < 0.26) return 'balloon';
  if (r < 0.46) return 'drone';
  if (r < 0.62) return 'moth';
  if (r < 0.67) return 'seagull';
  if (r < 0.92) return 'chest';
  return 'mimic';
}

/** Start an event; it runs itself (flight path, clicks, rewards) until it leaves or pays out. */
export function startEvent(a: Arena, id: EventId, rw: EventRewards): void {
  rw.firstSighting(id);
  if (id === 'sighting') return heroSighting(a, rw);
  if (id === 'chest' || id === 'mimic') return chest(a, id === 'mimic', rw);
  if (id === 'charybdis') return charybdis(a, rw);
  const cfg = {
    balloon: { key: 'ev_balloon', hits: 1, sec: 9, y: 170, sfx: 'sfx_pop' },
    drone: { key: 'ev_drone', hits: 3, sec: 4.2, y: 210, sfx: 'sfx_drone' },
    moth: { key: 'ev_moth', hits: 2, sec: 6, y: 260, sfx: 'sfx_boing' },
    seagull: { key: 'ev_seagull', hits: 2, sec: 3.6, y: 140, sfx: 'sfx_seagull' },
  }[id as 'balloon' | 'drone' | 'moth' | 'seagull'];
  const fromLeft = Math.random() < 0.5;
  const x0 = fromLeft ? -150 : W + 150;
  const x1 = fromLeft ? W + 150 : -150;
  const img = a.sc.add.image(x0, cfg.y, cfg.key).setFlipX(!fromLeft && id !== 'balloon');
  a.fxLayer.add(img);
  a.sfx(cfg.sfx, { volume: 0.6 });
  // its shadow on the table warns you it's coming
  const sh = a.sc.add.image(x0, 740, 'shadow').setAlpha(0.25).setScale(0.6, 0.4);
  a.underLayer.add(sh);
  let hits = 0;
  let done = false;
  const st = { t: 0 };
  clockOf(a.sc).tween({
    targets: st,
    t: 1,
    duration: (cfg.sec + (rw.flyerSec ?? 0)) * 1000,
    onUpdate: () => {
      const k = st.t;
      img.x = x0 + (x1 - x0) * k;
      const wob = id === 'moth' ? Math.sin(k * 40) * 60 : id === 'balloon' ? Math.sin(k * 8) * 20 : Math.sin(k * 14) * 12;
      img.y = cfg.y + wob;
      sh.x = img.x;
      if (id === 'drone') img.rotation = Math.sin(k * 30) * 0.05;
    },
    onComplete: () => {
      if (!done) {
        done = true;
        rw.missed?.(id);
        a.sc.tweens.add({ targets: [img, sh], alpha: 0, duration: 300, onComplete: () => (img.destroy(), sh.destroy()) });
      }
    },
  });
  a.addClickable({
    get x() {
      return img.x;
    },
    get y() {
      return img.y;
    },
    r: 90,
    event: true,
    alive: () => !done,
    hit: () => {
      if (done) return;
      hits++;
      a.fx.impact(img.x, img.y, hits >= cfg.hits);
      a.sfx('sfx_slap_3', { volume: 0.7, rate: 1.2 });
      img.setTint(0xffffff);
      a.sc.time.delayedCall(60, () => img.clearTint());
      if (hits < cfg.hits) {
        a.quip(img.x, img.y - 80, `${hits}/${cfg.hits}`, '#ffffff', 32);
        return;
      }
      done = true;
      const { x, y } = img;
      rw.done(id, x, y);
      if (id === 'balloon') {
        a.sfx('sfx_pop');
        rw.tips(10 + Math.floor(Math.random() * 16), x, y);
      } else if (id === 'drone') {
        // a slice only when some pizza is missing one (it can be healed back up while the drone flies)
        if (rw.hurt()) {
          rw.heal(1);
          a.quip(x, y - 80, 'DELIVERY: +1 SLICE', '#7dff9a', 40);
        } else {
          rw.tips(15, x, y);
          a.quip(x, y - 80, 'DELIVERY: +15 TIPS', '#ffd23f', 40);
        }
      } else if (id === 'moth') {
        rw.slam(0.5);
        const m = slamMode();
        const label = m.kind !== 'passive' ? `+50% ${m.name.toUpperCase()}` : m.trigger === 'every' ? `${m.name.toUpperCase()} SOONER` : '+15 TIPS';
        a.quip(x, y - 80, label, '#ffd23f', 40);
      } else if (id === 'seagull') {
        const got = rw.crust(1, x, y);
        a.quip(x, y - 80, got ? '+1 GOLDEN CRUST' : 'CRUST CAP REACHED', '#ffd23f', 40);
      }
      a.fx.party(x, y, 30);
      a.sc.tweens.add({ targets: img, y: y - 400, alpha: 0, angle: 180, duration: 600, onComplete: () => img.destroy() });
      sh.destroy();
    },
  });
}

function chest(a: Arena, mimic: boolean, rw: EventRewards): void {
  // lands on the table edge between two pizzas
  const ps = [...a.allPizzas()].sort((p, q) => p.x - q.x);
  let x = W / 2;
  if (ps.length >= 2) {
    const i = Math.floor(Math.random() * (ps.length - 1));
    x = (ps[i].x + ps[i + 1].x) / 2;
  }
  const y = 640;
  const img = a.sc.add.image(x, -200, 'ev_chest').setScale(0.9);
  a.fxLayer.add(img);
  a.sc.tweens.add({ targets: img, y, duration: 700, ease: 'Bounce.Out', onComplete: () => {
    a.sfx('sfx_stomp', { volume: 0.5, rate: 1.4 });
    a.shake(120, 0.004);
  } });
  const need = Math.max(2, 6 + Math.floor(Math.random() * 5) - (rw.chestLess ?? 0));
  let hits = 0;
  let done = false;
  // mimic tell: it wobbles
  if (mimic) a.sc.tweens.add({ targets: img, angle: { from: -3, to: 3 }, duration: 160, yoyo: true, repeat: -1, delay: 800 });
  const bar = a.sc.add.graphics();
  a.fxLayer.add(bar);
  const drawBar = () => {
    bar.clear();
    if (done) return;
    bar.fillStyle(0x2a1810, 0.85).fillRoundedRect(x - 70, y - 100, 140, 18, 9);
    bar.fillStyle(0xffd23f, 1).fillRoundedRect(x - 66, y - 96, Math.max(8, 132 * (hits / need)), 10, 5);
  };
  drawBar();
  a.addClickable({
    x,
    y,
    r: 110,
    event: true,
    alive: () => !done,
    hit: () => {
      if (done) return;
      hits++;
      a.fx.impact(x + (crand() - 0.5) * 60, y - 20, false);
      a.sfx('sfx_slap_2', { volume: 0.6, rate: 0.9 });
      a.sc.tweens.add({ targets: img, scaleY: { from: 0.8, to: 0.9 }, duration: 120 });
      drawBar();
      if (mimic && hits >= Math.ceil(need / 2)) {
        // beaten before it opened: double tips
        done = true;
        bar.destroy();
        img.setTexture('ev_mimic');
        a.quip(x, y - 140, 'MIMIC! Beaten in time', '#ffd23f', 40);
        rw.done('mimic', x, y);
        rw.tips(40 + Math.floor(Math.random() * 30), x, y);
        a.sc.tweens.add({ targets: img, alpha: 0, y: y - 120, duration: 500, delay: 300, onComplete: () => img.destroy() });
        return;
      }
      if (hits < need) return;
      done = true;
      bar.destroy();
      img.setTexture('ev_chest_open');
      a.sfx('sfx_chest');
      rw.done('chest', x, y);
      a.fx.party(x, y - 40, 50);
      const roll = Math.random();
      if (roll < 0.45) rw.tips(25 + Math.floor(Math.random() * 30), x, y);
      else if (roll < 0.7) rw.consumable();
      // slices only when some pizza is missing them; otherwise that share of the loot is tips
      else if (roll < 0.93 && !rw.hurt()) rw.tips(25 + Math.floor(Math.random() * 30), x, y);
      else if (roll < 0.93) {
        rw.heal(2);
        a.quip(x, y - 140, '+2 SLICES', '#7dff9a', 44);
      } else {
        const got = rw.crust(1, x, y);
        a.quip(x, y - 140, got ? '+1 GOLDEN CRUST' : 'TIPS INSTEAD', '#ffd23f', 44);
        if (!got) rw.tips(30, x, y);
      }
      a.sc.tweens.add({ targets: img, alpha: 0, duration: 500, delay: 700, onComplete: () => img.destroy() });
    },
  });
  if (mimic) {
    a.sc.time.delayedCall(7000, () => {
      if (done) return;
      done = true;
      bar.destroy();
      if (!a.inWave()) {
        // the wave ended first: it slinks away rather than chasing you into the shop
        a.sc.tweens.add({ targets: img, alpha: 0, duration: 300, onComplete: () => img.destroy() });
        return;
      }
      img.setTexture('ev_mimic');
      a.quip(x, y - 140, 'IT WAS A MIMIC!', '#ff4d3d', 46);
      a.sfx('sfx_warning');
      a.sc.tweens.add({ targets: img, alpha: 0, duration: 300, onComplete: () => img.destroy() });
      rw.spawnMimic(x);
    });
  } else {
    a.sc.time.delayedCall(14000, () => {
      if (done) return;
      done = true;
      rw.missed?.('chest');
      bar.destroy();
      a.sc.tweens.add({ targets: img, alpha: 0, duration: 500, onComplete: () => img.destroy() });
    });
  }
  void Phaser;
}
