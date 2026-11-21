// Act 9 · Greek myths (waves 81–90): what the myth feet do beyond their traits, Charybdis (Tartarus's
// whirlpool wave event) and the Greek god peels' home-ground bonus. The feet's stats live in
// src/content/feet/act9.ts and the fights in src/game/bosses/act9.ts.

import Phaser from 'phaser';
import { BACKDROPS, type ArenaId, type BackdropId, type LocationId } from '../../art/backdrops';
import { W } from '../../config';
import { audio } from '../../systems/audio';
import type { Ability, Effect } from '../abilities';
import type { Arena } from '../arena';
import type { ActFx, FootFx } from '../contentFx';
import type { EventId, EventRewards } from '../events';
import type { Foot } from '../Foot';
import { PEEL_BY_ID, type PeelDef } from '../peels';
import type { Pizza } from '../Pizza';
import { LOCATION_MUSIC, bossMusic, isBossWave, isMiniWave, locationFor, waveInStage } from '../Run';

/** The scene behind the Arena: a few things the Arena has no call for (the pointer the peel follows,
 * the smack damage, a stat recompute, a foot's lane hooks). */
interface SceneBits {
  pointer: { x: number; y: number };
  run: { stats: { damage: number }; wave: number };
  recompute(): void;
  backdrop?: { show(id: BackdropId, fadeMs?: number): void; setWave(w: number): void };
  tintGrade(hex: string, ms: number): void;
  currentBackdrop: BackdropId | null;
  /** The projectiles' blind list: a blinded foot's next stomp misses (src/game/projectiles.ts). */
  throws: { blind: Map<Foot, number>; clock: number };
  waveEvent: EventId | null;
  eventStarted: boolean;
  ability: Ability | null;
  peelId: string;
}
export const bits = (a: Arena) => a as unknown as SceneBits;
const hooksOf = (f: Foot) => (f as unknown as { hooks: { relane?(f: Foot): Pizza | null } }).hooks;

/** A sprite stuck to a foot (it moves, scales and dies with it). */
function attach(a: Arena, f: Foot, key: string, x: number, y: number, scale = 1): Phaser.GameObjects.Image {
  const img = a.sc.add.image(x, y, key).setScale(scale);
  f.root.add(img);
  return img;
}

/** Foot height in its root's own units (the root is scaled for elites). */
const footH = (f: Foot) => f.meta.footHeight * f.type.scale;

// ——— Satyr Hooves: bound from lane to lane while they wait, as well as the trait's mid-dive hop ———

function satyrTick(f: Foot, dt: number, a: Arena): void {
  if (f.state !== 'hover' || f.held || f.pinned || f.stunT > 0) {
    f.brain.hopT = 1.2 + Math.random() * 0.8;
    return;
  }
  const t = Number(f.brain.hopT ?? 1.5) - dt;
  f.brain.hopT = t;
  // tell: it crouches on its hocks and the pipe toots
  if (t < 0.35 && !f.brain.crouched) {
    f.brain.crouched = true;
    a.sc.tweens.add({ targets: f.root, scaleY: f.root.scaleY * 0.82, duration: 160, yoyo: true, ease: 'Sine.InOut' });
    a.fx.quip(f.x, f.cy - 120, '♪', '#e8d9b0', 34);
  }
  if (t > 0) return;
  f.brain.crouched = false;
  f.brain.hopT = 1.6 + Math.random() * 1;
  // only once it has had a moment over its pizza, and only into a free lane
  if (f.stateT < 0.5) return;
  const to = hooksOf(f).relane?.(f);
  if (!to) return;
  f.y -= 130;
  f.stateT = Math.min(f.stateT, f.hoverTime * 0.5);
  a.fx.puff(f.x, f.y + 130, 5);
  a.sfx('sfx_boing', { volume: 0.5, rate: 1.5, throttle: 150 });
}

// ——— Cyclops Sandals: one big eye on the toe cap ———

/** The eye, as fractions of the foot's height above its sole (art: src/content/art/act9.ts). */
export const CYCLOPS_EYE = { y: 0.66, top: 0.84, bottom: 0.46, half: 0.62 };

function cyclopsSpawn(f: Foot, a: Arena): void {
  const h = footH(f);
  const glow = a.sc.add.image(0, -h * CYCLOPS_EYE.y, 'glow').setTint(0xff5a3a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.55).setAlpha(0);
  f.root.add(glow);
  eyes.set(f, glow);
}

const eyes = new WeakMap<Foot, Phaser.GameObjects.Image>();

function cyclopsTick(f: Foot, _dt: number, a: Arena): void {
  const glow = eyes.get(f);
  if (!glow) return;
  // tell: the eye glows and narrows as it starts its dive; a blinded eye stays dark
  const diving = f.state === 'descend' || (f.state === 'hover' && f.stateT > f.hoverTime - 0.5);
  const want = f.brain.blind ? 0 : diving ? 0.75 + Math.sin(a.now() * 18) * 0.2 : 0.12;
  glow.setAlpha(glow.alpha + (want - glow.alpha) * 0.2);
}

function cyclopsSmack(f: Foot, a: Arena, x: number, y: number, dealt: number): void {
  const h = f.meta.footHeight * f.scale;
  const half = f.meta.halfWidth * f.scale * CYCLOPS_EYE.half;
  const top = f.y - h * CYCLOPS_EYE.top;
  const bottom = f.y - h * CYCLOPS_EYE.bottom;
  if (y < top || y > bottom || Math.abs(x - f.x) > half) return;
  // a poke in the eye hurts twice as much
  if (f.alive && dealt > 0) a.damageFoot(f, dealt);
  if (!f.brain.blind) {
    f.brain.blind = true;
    // its next stomp misses (the projectiles' blind list does the missing)
    const t = bits(a).throws;
    t.blind.set(f, t.clock + 60);
    f.stun(1.2);
    a.quip(f.x, f.cy - 150, 'BLINDED!', '#ffe14d', 46);
    a.sfx('sfx_eyepoke');
    a.fx.ring(f.x, f.y - h * CYCLOPS_EYE.y, 0xffe14d, 0.8, 1);
  } else a.quip(f.x, f.cy - 130, 'RIGHT IN THE EYE!', '#ffe14d', 34);
}

// ——— Harpy Talons: snatch a slice and fly off with it ———

interface Snatch {
  p: Pizza;
  before: number;
  slice?: Phaser.GameObjects.Image;
  t: number;
  dir: number;
}
const snatches = new WeakMap<Foot, Snatch>();

function harpyTick(f: Foot, dt: number, a: Arena): void {
  const s = snatches.get(f);
  // the wings beat harder (and it screeches) as it dives
  if (f.state === 'descend' && !f.brain.screeched) {
    f.brain.screeched = true;
    a.sfx('sfx_harpy', { volume: 0.7, throttle: 300 });
    a.sc.tweens.add({ targets: f.root, scaleX: f.root.scaleX * 1.08, duration: 90, yoyo: true, repeat: 3 });
  }
  if (f.state === 'hover') f.brain.screeched = false;
  // as it dives it eyes up the slices on its pizza
  if (!s && f.state === 'descend' && f.target && !f.target.dead) snatches.set(f, { p: f.target, before: f.target.slices, t: -1, dir: f.x < W / 2 ? -1 : 1 });
  if (!s) return;
  if (s.t < 0) {
    if (f.state === 'descend' || f.state === 'enter') return;
    // back up without a slice (the stomp was blocked, or it was knocked away): nothing to carry off
    if (f.state !== 'stomp' || s.p.slices >= s.before) {
      if (f.state !== 'stomp') snatches.delete(f);
      return;
    }
    s.t = 0;
    f.puppet = true;
    s.slice = attach(a, f, 'p9_slice', 0, 30, 0.8);
    a.quip(f.x, f.cy - 140, 'SNATCHED!', '#ffd23f', 42);
    a.sfx('sfx_harpy', { rate: 1.2 });
  }
  // it flaps up and away with the slice in its talons
  s.t += dt;
  f.x += s.dir * 260 * dt * Math.min(1, s.t);
  f.y -= 230 * dt;
  f.root.angle = Math.sin(s.t * 14) * 6 + s.dir * 8;
  if (s.t > 2.6 || f.y < -120 || f.x < -150 || f.x > W + 150) {
    snatches.delete(f);
    f.escape();
  }
}

function harpySmack(f: Foot, a: Arena): void {
  const s = snatches.get(f);
  if (!s || s.t < 0) return;
  snatches.delete(f);
  f.puppet = false;
  f.root.angle = 0;
  // it drops the slice, which flies home to its pizza (or the weakest one, if that pizza is gone)
  const home = !s.p.dead ? s.p : [...a.alivePizzas()].sort((p, q) => p.slices / p.maxSlices - q.slices / q.maxSlices)[0];
  const from = { x: f.x, y: f.y + 30 };
  s.slice?.destroy();
  if (!home) return;
  const img = a.sc.add.image(from.x, from.y, 'p9_slice').setScale(0.8);
  a.fxLayer.add(img);
  a.sc.tweens.add({
    targets: img,
    x: home.x,
    y: home.surfaceY - 20,
    angle: 360,
    duration: 520,
    ease: 'Quad.In',
    onComplete: () => {
      img.destroy();
      if (home.dead) return;
      home.heal(1);
      a.fx.healBurst(home.x, home.surfaceY - 20);
      a.quip(home.x, home.surfaceY - 150, 'SLICE SAVED!', '#7dff9a', 40);
      a.sfx('sfx_heal', { volume: 0.7 });
    },
  });
}

// ——— Siren Slippers: the song pulls the peel (the magnet trait); notes drift off them as they sing ———

function sirenTick(f: Foot, dt: number, a: Arena): void {
  if (f.state !== 'hover' && f.state !== 'descend') return;
  if (f.y < 120) return;
  if (Math.random() < dt * 2.2) {
    const n = a.sc.add.image(f.x + (Math.random() - 0.5) * 90 * f.scale, f.cy - 40, 'p9_note').setScale(0.45).setAlpha(0).setTint(Math.random() < 0.5 ? 0xbff8f0 : 0xffffff);
    a.fxLayer.add(n);
    a.sc.tweens.add({ targets: n, alpha: { from: 0, to: 0.95 }, duration: 250, yoyo: true, hold: 600 });
    a.sc.tweens.add({ targets: n, y: n.y - 150, x: n.x + (Math.random() - 0.5) * 80, angle: (Math.random() - 0.5) * 40, duration: 1100, onComplete: () => n.destroy() });
  }
  if (!f.brain.sang) {
    f.brain.sang = true;
    a.sfx('sfx_sirensong', { volume: 0.6, throttle: 2500 });
  }
}

// ——— Titan Toes: the ground shakes when it rises and when it lands ———

const lastState = new WeakMap<Foot, string>();

function titanTick(f: Foot, _dt: number, a: Arena): void {
  const st = f.state;
  if (st === lastState.get(f)) return;
  lastState.set(f, st);
  if (st === 'descend') {
    a.shake(260, 0.005);
    a.rumble(0.5, 200);
    for (let i = 0; i < 5; i++) a.fx.puff(f.x + (Math.random() - 0.5) * 260, 760 + Math.random() * 40, 2);
  } else if (st === 'stomp') {
    a.shake(380, 0.011);
    a.rumble(0.9, 260);
    a.fx.ring(f.x, f.y, 0xd9a441, 1.6, 0.35);
  }
}

export const footFx: Record<string, FootFx> = {
  satyr: { tick: (a, f, dt) => satyrTick(f, dt, a) },
  cyclops: {
    spawn: (a, f) => cyclopsSpawn(f, a),
    tick: (a, f, dt) => {
      // the blind list was used up: the stomp missed and the eye opens again
      if (f.brain.blind && !bits(a).throws.blind.has(f)) f.brain.blind = false;
      cyclopsTick(f, dt, a);
    },
  },
  harpy: { tick: (a, f, dt) => harpyTick(f, dt, a), kill: (_a, f) => void snatches.delete(f) },
  siren: { tick: (a, f, dt) => sirenTick(f, dt, a) },
  titantoes: { tick: (a, f, dt) => titanTick(f, dt, a) },
  gorgonsnake: { spawn: (a) => a.sfx('sfx_medusa_hiss', { volume: 0.5, throttle: 600 }) },
};

// ——— The act's layer: the backdrop's wave, Charybdis in Tartarus, and the Greek gods' home ground ———

/** The ability the equipped peel had before the home-ground bonus (put back when the act ends). */
let homeBase: Ability | null = null;

export const actFx: Record<number, ActFx> = {
  9: {
    enter: (a, n) => {
      const sc = bits(a);
      // the live backdrops' light and weather move with the wave of the stage
      sc.backdrop?.setWave(waveInStage(n));
      // Charybdis: in Tartarus, 40% of the wave events are the whirlpool
      if (locationFor(n) === 'tartarus' && sc.waveEvent && !sc.eventStarted && !isBossWave(n) && !isMiniWave(n) && Math.random() < 0.4) sc.waveEvent = 'charybdis';
      // home ground: a Greek god peel's ability is 10% stronger in the Labyrinth and Tartarus
      if (!homeBase && sc.ability && isGreekGod(PEEL_BY_ID[sc.peelId])) {
        homeBase = sc.ability;
        sc.ability = { ...homeBase, fx: homeGroundFx(homeBase.fx, sc.peelId, locationFor(n)) };
        sc.recompute();
      }
    },
    hit: (a, f, x, y, dealt, _crit, source) => {
      if (source !== 'smack') return;
      if (f.type.id === 'cyclops') cyclopsSmack(f, a, x, y, dealt);
      if (f.type.id === 'harpy') harpySmack(f, a);
    },
    leave: (a) => {
      const sc = bits(a);
      if (homeBase && sc.ability?.name === homeBase.name) sc.ability = homeBase;
      homeBase = null;
    },
  },
};

/** A mini-boss takes the stage: its own arena and music crossfade in over the location. */
export function enterArena(a: Arena, id: ArenaId): void {
  const sc = bits(a);
  if (!sc.backdrop || !BACKDROPS[id]) return;
  sc.backdrop.show(id, 1400);
  sc.tintGrade(BACKDROPS[id].light, 1400);
  sc.currentBackdrop = id;
  void audio.music(a.sc, bossMusic(id), 1200);
}

/** …and gives the location back when it goes down. */
export function leaveArena(a: Arena): void {
  const sc = bits(a);
  if (!a.inWave() || !sc.backdrop) return;
  const loc = locationFor(sc.run.wave);
  sc.backdrop.show(loc, 1800);
  sc.tintGrade(BACKDROPS[loc].light, 1800);
  sc.currentBackdrop = loc;
  void audio.music(a.sc, LOCATION_MUSIC[loc], 1800);
}

// ——— Charybdis: the whirlpool wave event in Tartarus ———

const CH = { x: W / 2, y: 690, rx: 250, ry: 105, sec: 9, hits: 5 };

/** A whirlpool opens at the back of the table and drags every foot (and your peel) towards it. Smack its
 * maw 5 times to collapse it: it swallows the feet near it and spits out tips. Leave it and it sinks
 * with a slice from the nearest pizza. */
export function charybdis(a: Arena, rw: EventRewards): void {
  const swirl = a.sc.add.image(CH.x, CH.y, 'ev_charybdis').setScale(0, 0).setAlpha(0.95);
  const glow = a.sc.add.image(CH.x, CH.y, 'glow').setTint(0x3fb8ff).setBlendMode(Phaser.BlendModes.ADD).setScale(4, 1.6).setAlpha(0);
  a.underLayer.add([glow, swirl]);
  const full = { x: (CH.rx * 2) / 360, y: (CH.ry * 2) / 360 };
  a.sc.tweens.add({ targets: swirl, scaleX: full.x, scaleY: full.y, duration: 700, ease: 'Back.Out' });
  a.sc.tweens.add({ targets: glow, alpha: 0.5, duration: 700 });
  a.quip(CH.x, CH.y - 200, 'CHARYBDIS!', '#8fe8ff', 56);
  a.sfx('sfx_whirlpool');
  a.shake(400, 0.004);
  let hits = 0;
  let done = false;
  let t = 0;
  const bar = a.sc.add.graphics();
  a.fxLayer.add(bar);
  const ticker = a.sc.time.addEvent({
    delay: 16,
    loop: true,
    callback: () => {
      if (done) return;
      const dt = 0.016;
      t += dt;
      swirl.rotation += dt * (2.2 + hits * 0.5);
      // the pull: feet drift towards the eye and lean into it; the peel is dragged too
      const pull = Math.min(1, t / 1.2);
      for (const f of a.allFeet()) {
        if (!f.alive || f.isBossLike || f.y < 0) continue;
        const dx = CH.x - f.x;
        f.x += dx * dt * 0.9 * pull;
        f.root.angle = Phaser.Math.Clamp(dx / 40, -10, 10) * pull;
      }
      const s = bits(a);
      const px = CH.x - s.pointer.x;
      const py = CH.y - 120 - s.pointer.y;
      const d = Math.hypot(px, py);
      if (d > 40) {
        s.pointer.x += (px / d) * 95 * dt * pull;
        s.pointer.y += (py / d) * 60 * dt * pull;
      }
      bar.clear();
      bar.fillStyle(0x2a1810, 0.85).fillRoundedRect(CH.x - 90, CH.y + CH.ry + 14, 180, 20, 10);
      bar.fillStyle(0x8fe8ff, 1).fillRoundedRect(CH.x - 86, CH.y + CH.ry + 18, Math.max(10, 172 * (1 - t / CH.sec)), 12, 6);
      if (t >= CH.sec || !a.inWave()) finish(false);
    },
  });
  const straighten = () => {
    for (const f of a.allFeet()) if (f.alive && !f.isBossLike) a.sc.tweens.add({ targets: f.root, angle: 0, duration: 250 });
  };
  const finish = (closed: boolean) => {
    if (done) return;
    done = true;
    ticker.remove();
    bar.destroy();
    straighten();
    a.sc.tweens.add({ targets: swirl, scaleX: 0, scaleY: 0, rotation: swirl.rotation + 6, duration: 600, ease: 'Back.In', onComplete: () => swirl.destroy() });
    a.sc.tweens.add({ targets: glow, alpha: 0, duration: 600, onComplete: () => glow.destroy() });
    a.sfx('sfx_gulp');
    if (closed) {
      // it swallows the feet near it on the way down and spits out tips
      const dmg = bits(a).run.stats.damage * 4;
      for (const f of a.allFeet()) if (f.alive && f.hittable && !f.isBossLike && Math.abs(f.x - CH.x) < 460) a.damageFoot(f, dmg);
      a.quip(CH.x, CH.y - 200, 'SWALLOWED!', '#8fe8ff', 52);
      a.fx.party(CH.x, CH.y - 40, 40);
      rw.done('charybdis', CH.x, CH.y);
      rw.tips(20 + Math.floor(Math.random() * 15), CH.x, CH.y);
      return;
    }
    if (!a.inWave()) return;
    // left alone, it sinks with a slice from the pizza nearest the eye
    const p = [...a.alivePizzas()].sort((q, r) => Math.abs(q.x - CH.x) - Math.abs(r.x - CH.x))[0];
    if (p) a.hitPizza(p, 1, 'GULPED!', '#8fe8ff');
  };
  a.addClickable({
    x: CH.x,
    y: CH.y,
    r: CH.rx,
    priority: 1,
    contains: (x, y) => ((x - CH.x) / CH.rx) ** 2 + ((y - CH.y) / CH.ry) ** 2 <= 1,
    alive: () => !done,
    hit: () => {
      if (done) return;
      hits++;
      a.fx.impact(CH.x + (Math.random() - 0.5) * 120, CH.y, hits >= CH.hits);
      a.sfx('sfx_slap_2', { volume: 0.6, rate: 0.8 });
      a.sc.tweens.add({ targets: swirl, scaleX: full.x * 0.86, scaleY: full.y * 0.86, duration: 80, yoyo: true });
      if (hits < CH.hits) {
        a.quip(CH.x, CH.y - 150, `${hits}/${CH.hits}`, '#ffffff', 34);
        return;
      }
      finish(true);
    },
  });
}

// ——— Home ground: Greek god peels get +10% in this act ———

/** Act 9's stages, where the Greek god peels fight on home ground. */
export const GREEK_HOME: LocationId[] = ['labyrinth', 'tartarus'];
export const HOME_GROUND_BONUS = 0.1;

/** A peel is a Greek god when it's in the 'hero' group with `pantheon: 'greek'` (the hero peels are built
 * separately; this reads the field without needing it in PeelDef yet). */
export function isGreekGod(d: PeelDef | undefined): boolean {
  const x = d as (PeelDef & { pantheon?: string }) | undefined;
  return !!x && (x.group as string) === 'hero' && x.pantheon === 'greek';
}

/** The peel ability's effects with the home-ground bonus applied: +10% to every damage, burn, chain, throw,
 * heal and shield number, and to stat boosts, when a Greek god peel fights in the Labyrinth or Tartarus. */
export function homeGroundFx(fx: Effect[], peelId: string, loc: LocationId): Effect[] {
  if (!GREEK_HOME.includes(loc) || !isGreekGod(PEEL_BY_ID[peelId])) return fx;
  const k = 1 + HOME_GROUND_BONUS;
  return fx.map((e): Effect => {
    switch (e.e) {
      case 'dmg':
      case 'burn':
      case 'chain':
        return { ...e, x: e.x * k };
      case 'throw':
        return { ...e, x: e.x * k, more: e.more?.map((m) => m * k), splash: e.splash === undefined ? undefined : e.splash * k };
      case 'mark':
        return { ...e, mult: 1 + (e.mult - 1) * k };
      case 'heal':
      case 'shield':
      case 'fresh':
      case 'tips':
        return { ...e, n: Math.round(e.n * k) };
      case 'stat':
        return { ...e, mods: Object.fromEntries(Object.entries(e.mods).map(([s, v]) => [s, (v ?? 0) * k])) };
      default:
        return e;
    }
  });
}
