// Hero sightings: a rare wave event (about 1 wave in 40). A hero streaks across the top of the screen in 3.5 s;
// smack it twice to catch it (+25 tips), and the catch counts towards that hero's peel. Only heroes whose peel
// isn't unlocked yet turn up, so the sightings work through the roster.
//
// Also here: Batpeel's Signal, a secret. On night stages a winged shape sometimes lights up the clouds for a
// few seconds; smacking it counts towards Batpeel.

import Phaser from 'phaser';
import { W } from '../config';
import type { Stats } from '../data/upgrades';
import type { Arena } from './arena';
import type { EventRewards } from './events';
import { bumpGoal, openSecrets, openSightings, type SightingId } from './heroGoals';
import { NIGHT } from './heroMoves';

/** Base chance a wave brings a sighting. */
export const SIGHTING_CHANCE = 1 / 40;

/** This wave's chance of a sighting. Once every sighting hero is unlocked they still turn up, rarely, so the
 * event's own peel and its shiny can still be earned. */
export function sightingChance(st: Pick<Stats, 'sightingMult'>): number {
  return SIGHTING_CHANCE * (st.sightingMult ?? 1) * (openSightings().length ? 1 : 0.5);
}

/** A guaranteed sighting is due (Hero Summit: every N waves). */
export function sightingDue(st: Pick<Stats, 'sightingEvery'>, wavesSince: number): boolean {
  return (st.sightingEvery ?? 0) > 0 && wavesSince + 1 >= st.sightingEvery;
}

interface Flyby {
  key: string;
  name: string;
  y: number;
  /** Bob and weave on the way across. */
  path: (k: number) => number;
  sfx: string;
  /** Extra frames: trail, notes, a dropped card, the conga line. */
  extra?: (a: Arena, img: Phaser.GameObjects.Image, k: number, dir: number) => void;
}

const FLYBY: Record<SightingId, Flyby> = {
  bird: { key: 's_bird', name: 'IS IT A BIRD?', y: 130, path: (k) => Math.sin(k * 6) * 14, sfx: 'sfx_hero_flyby' },
  comet: { key: 's_comet', name: 'A GREEN COMET!', y: 110, path: (k) => -k * 30, sfx: 'sfx_hero_flyby', extra: (a, img) => Math.random() < 0.6 && a.fx.trail(img.x - 70 * Math.sign(img.scaleX), img.y, 0x7dff9a) },
  visor: { key: 's_visor', name: 'A VISOR GLINT!', y: 150, path: () => 0, sfx: 'sfx_hero_glint', extra: (_a, img, k) => img.setAlpha(0.55 + Math.abs(Math.sin(k * 40)) * 0.45) },
  cassette: { key: 's_cassette', name: 'A CASSETTE SHIP!', y: 140, path: (k) => Math.sin(k * 9) * 18, sfx: 'sfx_hero_flyby' },
  kid: { key: 's_kid', name: 'THE LIGHTNING KID!', y: 130, path: (k) => Math.sin(k * 14) * 10, sfx: 'sfx_hero_flyby', extra: (a, img) => Math.random() < 0.12 && a.fx.glint(img.x, img.y, 2) },
  saucer: { key: 's_saucer', name: 'A GREEN SAUCER!', y: 150, path: (k) => Math.sin(k * 5) * 22, sfx: 'sfx_hero_saucer', extra: (_a, img, k) => img.setAlpha(0.45 + 0.55 * Math.abs(Math.sin(k * 7))) },
  tophat: { key: 's_tophat', name: 'A TOP HAT?', y: 140, path: (k) => Math.sin(k * 7) * 26, sfx: 'sfx_hero_magic', extra: (a, img) => Math.random() < 0.05 && a.fx.glint(img.x, img.y + 30, 2) },
  squirrels: { key: 'h_squirrel', name: 'A SQUIRREL PARADE!', y: 170, path: (k) => -Math.abs(Math.sin(k * 30)) * 16, sfx: 'sfx_hero_squeak' },
};

/** A hero streaks across the top of the screen: two smacks catch it (Stats.sightingHits can change that). */
export function heroSighting(a: Arena, rw: EventRewards): void {
  // heroes still to unlock first; once they're all caught, any of them
  const open = openSightings();
  const id = Phaser.Utils.Array.GetRandom(open.length ? open : (Object.keys(FLYBY) as SightingId[]));
  const fb = FLYBY[id];
  const ltr = Math.random() < 0.5;
  const x0 = ltr ? -200 : W + 200;
  const x1 = ltr ? W + 200 : -200;
  const sc = a.sc;
  const key = sc.textures.exists(fb.key) ? fb.key : 'soft';
  const img = sc.add.image(x0, fb.y, key).setScale(ltr ? 0.9 : -0.9, 0.9);
  a.fxLayer.add(img);
  // the squirrels come as a conga line: four more follow the leader
  const followers =
    id === 'squirrels'
      ? [1, 2, 3, 4].map((i) => {
          const f = sc.add.image(x0, fb.y, key).setScale(ltr ? 0.75 : -0.75, 0.75);
          a.fxLayer.add(f);
          return { img: f, lag: i * 0.035 };
        })
      : [];
  a.sfx(fb.sfx, { volume: 0.8 });
  a.quip(W / 2, 250, fb.name, '#fff6c0', 40);
  let hits = 0;
  // Hero Hotline: fewer smacks to catch one
  const need = Math.max(1, rw.sightingHits || 2);
  let done = false;
  const st = { t: 0 };
  const dir = ltr ? 1 : -1;
  sc.tweens.add({
    targets: st,
    t: 1,
    duration: 3500,
    onUpdate: () => {
      const k = st.t;
      img.x = x0 + (x1 - x0) * k;
      img.y = fb.y + fb.path(k);
      fb.extra?.(a, img, k, dir);
      for (const f of followers) {
        const kk = Math.max(0, k - f.lag);
        f.img.x = x0 + (x1 - x0) * kk;
        f.img.y = fb.y + fb.path(kk + 0.5);
      }
      if (id === 'tophat' && !done && Math.abs(k - 0.5) < 0.01) dropCard(a, img.x, img.y);
    },
    onComplete: () => {
      if (!done) {
        done = true;
        rw.missed?.('sighting');
        sc.tweens.add({ targets: [img, ...followers.map((f) => f.img)], alpha: 0, duration: 250, onComplete: () => [img, ...followers.map((f) => f.img)].forEach((o) => o.destroy()) });
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
    r: id === 'squirrels' ? 150 : 100,
    priority: 1,
    alive: () => !done,
    hit: () => {
      if (done) return;
      hits++;
      a.fx.impact(img.x, img.y, hits >= need);
      a.sfx('sfx_slap_3', { volume: 0.7, rate: 1.3 });
      img.setTintFill(0xffffff);
      sc.time.delayedCall(60, () => img.clearTint());
      if (hits < need) {
        a.quip(img.x, img.y + 80, `${hits}/${need}`, '#ffffff', 32);
        return;
      }
      done = true;
      const { x, y } = img;
      bumpGoal(`sighting:${id}`);
      a.sfx('sfx_hero_catch');
      a.quip(x, y + 90, 'CAUGHT!', '#ffd23f', 50);
      a.fx.party(x, y, 40);
      rw.tips(25, x, y);
      rw.done('sighting', x, y);
      sc.tweens.add({ targets: [img, ...followers.map((f) => f.img)], y: -200, alpha: 0, duration: 600, ease: 'Back.In', onComplete: () => [img, ...followers.map((f) => f.img)].forEach((o) => o.destroy()) });
    },
  });
}

function dropCard(a: Arena, x: number, y: number): void {
  const c = a.sc.add.image(x, y + 30, a.sc.textures.exists('t_card') ? 't_card' : 'soft').setScale(0.35);
  a.fxLayer.add(c);
  a.sc.tweens.add({ targets: c, y: y + 420, angle: 540, alpha: 0, duration: 1600, ease: 'Sine.In', onComplete: () => c.destroy() });
}

/** The Signal: on night stages, sometimes, a winged shape lights up the clouds. Returns true if it showed. */
export function maybeSignal(a: Arena, backdrop: string | null, found: () => void, roll = Math.random()): boolean {
  if (!backdrop || !NIGHT.has(backdrop) || !openSecrets().includes('signal') || roll > 0.25) return false;
  const sc = a.sc;
  const x = 260 + Math.random() * (W - 520);
  const y = 110 + Math.random() * 60;
  const img = sc.add.image(x, y, sc.textures.exists('s_signal') ? 's_signal' : 'soft').setAlpha(0).setScale(0.7);
  // behind the feet, in the sky
  a.underLayer.add(img);
  let done = false;
  sc.tweens.add({ targets: img, alpha: 0.75, duration: 900, yoyo: true, hold: 4200, onComplete: () => !done && img.destroy() });
  sc.tweens.add({ targets: img, x: x + 40, duration: 6000 });
  a.addClickable({
    get x() {
      return img.x;
    },
    get y() {
      return img.y;
    },
    r: 90,
    alive: () => !done && img.alpha > 0.2,
    hit: () => {
      if (done) return;
      done = true;
      bumpGoal('secret:signal');
      found();
      a.sfx('sfx_hero_secret');
      a.quip(img.x, img.y + 90, 'THE SIGNAL!', '#ffd23f', 44);
      a.fx.glint(img.x, img.y, 12);
      sc.tweens.add({ targets: img, alpha: 0, scale: 1, duration: 500, onComplete: () => img.destroy() });
    },
  });
  return true;
}
