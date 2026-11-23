// Act 7 · Comics (waves 61–70): the act's effect layer and its villain feet.
//
// The layer prints the act as a pulp comic: a halftone dot screen over the backdrop, speech-bubble quips, and
// KRAK! / POW! impact words on big hits. It also runs each place's moving parts and changes the weather and
// light from wave to wave:
//   Metropizza Rooftops  61 golden hour · 62 dusk · 63 night, searchlights · 64 thunderstorm and rain (its backdrop,
//                        scene-metropizza.ts, runs the blimp, searchlights, light and bolts; the act keeps the rain
//                        and the bolts' flash and thunder)
//   Downtown Ruins       65 smoke and drifting embers under lightning (Doomstomp; its backdrop, scene-doomstomp.ts,
//                        runs its fires, smoke and bolts when animated; the act keeps the bolts' flash and thunder)
//   The Doom Lab         66 lab hum, Tesla arcs · 67 alarm beacons · 68 red alert (Ultoe) · 69 power surges (its
//                        backdrop, scene-doomlab.ts, runs its vats, arcs, beacons, light and surges when animated;
//                        the act plays the arcs' zaps and the surges' sound)
//   Titan's Throne       70 a pulsing nebula and falling stars (Thanfoot)
//
// Feet: Henchman Spats arrive in numbered gangs of four and dive in order; Jetpack Jackboots fly in from the
// side; Goon Galoshes light a bomb and drop it on their pizza (smack it mid-air). Doomstomp's last life is
// spared from every blow except a signature move (see src/game/bosses/act7.ts).

import Phaser from 'phaser';
import { H, HOVER_Y, W } from '../../config';
import { FOOT_BY_ID, type FootType } from '../../data/feet';
import { backdropsAnimated } from '../../systems/graphics';
import { save } from '../../systems/save';
import { ui } from '../../ui/ui';
import type { Arena } from '../arena';
import { heat } from '../bosses/kit';
import { doomSpare } from '../bosses/act7';
import type { ActFx, FootFx } from '../contentFx';
import type { Foot } from '../Foot';
import type { Pizza } from '../Pizza';
import { nemesisOf } from '../nemesis';
import { bossFor, locationFor, miniFor, waveInStage, isBossWave, isMiniWave } from '../Run';
import { DL } from '../../content/art/scene-doomlab';

const FONT = 'Lilita One, Fredoka, sans-serif';
const INK = 0x2a1810;

/** The scene's own spawn and targeting, for gangs that bring their own members. */
type SceneBits = { spawnFoot(t: FootType, p: Pizza | null, elite?: boolean, x?: number): Foot; pickTarget(f: Foot | null): Pizza | null; allFeet(): Foot[] };
const bits = (a: Arena) => a as unknown as SceneBits;

const reduced = () => save.settings.reducedMotion;

// ——— Speech bubbles ———

let bubbles = 0;

/** A white comic speech bubble with a tail, over a foot (it follows it) or a point. */
export function bubble(a: Arena, text: string, at: Foot | { x: number; y: number }, ms = 1700): void {
  if (bubbles >= 3) return;
  // a centre banner (PHASE 2 …) is up: speak once it has gone, rather than sit behind its title
  const wait = ui.hud.bannerLeft();
  if (wait > 0) {
    a.sc.time.delayedCall(wait + 100, () => (!('type' in at) || at.alive) && bubble(a, text, at, ms));
    return;
  }
  const sc = a.sc;
  const t = sc.add.text(0, 0, text, { fontFamily: FONT, fontSize: '30px', color: '#2a1810', align: 'center', wordWrap: { width: 360 } }).setOrigin(0.5);
  const w = t.width + 44;
  const h = t.height + 28;
  const gfx = sc.add.graphics();
  const draw = () => {
    gfx.clear();
    gfx.fillStyle(0x000000, 0.25).fillRoundedRect(-w / 2 + 6, -h / 2 + 6, w, h, 22);
    gfx.fillStyle(0xffffff, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 22);
    gfx.lineStyle(6, INK, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 22);
    // tail pointing down at the speaker
    gfx.fillStyle(0xffffff, 1).fillTriangle(-18, h / 2 - 4, 14, h / 2 - 4, -26, h / 2 + 34);
    gfx.lineStyle(6, INK, 1).lineBetween(-18, h / 2, -26, h / 2 + 34).lineBetween(-26, h / 2 + 34, 14, h / 2);
  };
  draw();
  const box = sc.add.container(0, 0, [gfx, t]);
  a.fxLayer.add(box);
  bubbles++;
  const place = () => {
    const foot = 'type' in at ? at : null;
    let x = foot ? foot.x + 70 : at.x;
    let y = foot ? foot.cy - foot.meta.footHeight * foot.scale * 0.6 - h / 2 - 40 : at.y;
    // keep it on screen and under the HUD
    x = Phaser.Math.Clamp(x, w / 2 + 16, W - w / 2 - 16);
    y = Phaser.Math.Clamp(y, 250 + h / 2, H - 200);
    box.setPosition(x, y);
  };
  place();
  box.setScale(0.2).setAngle(-4 + Math.random() * 8);
  sc.tweens.add({ targets: box, scale: 1, duration: reduced() ? 1 : 220, ease: 'Back.Out' });
  const ticker = sc.time.addEvent({ delay: 16, loop: true, callback: () => 'type' in at && at.alive && place() });
  sc.time.delayedCall(ms, () => {
    ticker.remove();
    sc.tweens.add({
      targets: box,
      scale: 0.3,
      alpha: 0,
      duration: 180,
      onComplete: () => {
        box.destroy();
        bubbles = Math.max(0, bubbles - 1);
      },
    });
  });
}

// ——— Impact words ———

const WORDS = ['POW!', 'KRAK!', 'BAM!', 'WHAM!', 'THWACK!', 'KAPOW!', 'BLAM!', 'ZOK!'];
/** Burst tint and letter colour. The letters always carry a thick dark outline, so they're never dark themselves
 * (dark letters in a dark outline fill in and turn to a blob). */
const PALETTE: [number, string][] = [
  [0xffd23f, '#e0202a'],
  [0xff4a3a, '#ffe44a'],
  [0x5fd8ff, '#ffffff'],
  [0xffffff, '#e0202a'],
];
let lastWord = -9;

/** A comic starburst with an impact word, popped at a hit. */
export function impactWord(a: Arena, x: number, y: number, size = 1, word?: string): void {
  const now = a.now();
  if (size < 1.4 && now - lastWord < 0.3) return;
  lastWord = now;
  const sc = a.sc;
  const [tint, col] = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  const w = word ?? WORDS[Math.floor(Math.random() * WORDS.length)];
  const burst = sc.add.image(0, 0, 'p_a7_burst').setTint(tint);
  const t = sc.add
    .text(0, -4, w, { fontFamily: FONT, fontSize: '78px', color: col, stroke: '#2a1810', strokeThickness: 12 })
    .setOrigin(0.5);
  burst.setScale(Math.max(0.5, (t.width + 120) / 420), 0.62);
  const c = sc.add.container(Phaser.Math.Clamp(x, 200, W - 200), Phaser.Math.Clamp(y, 300, 980), [burst, t]);
  a.fxLayer.add(c);
  const s = 0.55 * size;
  c.setScale(s * 0.3).setAngle(-12 + Math.random() * 24);
  if (reduced()) {
    c.setScale(s);
    sc.tweens.add({ targets: c, alpha: 0, delay: 380, duration: 200, onComplete: () => c.destroy() });
    return;
  }
  sc.tweens.add({ targets: c, scale: s, duration: 140, ease: 'Back.Out' });
  sc.tweens.add({ targets: c, y: c.y - 30, alpha: 0, scale: s * 1.12, delay: 420, duration: 240, onComplete: () => c.destroy() });
}

// ——— The act layer ———

interface Layer {
  /** Over the backdrop (under the pizzas): print screen, light grade, place props. */
  back: Phaser.GameObjects.Container;
  /** Over the feet: rain, lightning flashes. */
  front: Phaser.GameObjects.Container;
  grade: Phaser.GameObjects.Rectangle;
  dots: Phaser.GameObjects.TileSprite;
  flash: Phaser.GameObjects.Rectangle;
  place: string;
  wave: number;
  /** Things the place animates every frame. */
  tickers: ((dt: number, t: number) => void)[];
  rain: Phaser.GameObjects.Particles.ParticleEmitter | null;
  /** Stops listening to the place's backdrop (Metropizza's and the Downtown Ruins' bolts, the Doom Lab's arcs). */
  unhook: (() => void) | null;
  t: number;
  nextFlash: number;
  lastSlam: number;
  stage: number;
}

let L: Layer | null = null;

function clearPlace(layer: Layer): void {
  layer.back.each((o: Phaser.GameObjects.GameObject) => {
    if (o !== layer.grade && o !== layer.dots) o.destroy();
  });
  layer.back.removeAll(false);
  layer.back.add([layer.dots, layer.grade]);
  layer.front.removeAll(true);
  layer.flash = layer.front.scene.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0).setBlendMode(Phaser.BlendModes.ADD);
  layer.front.add(layer.flash);
  layer.tickers = [];
  layer.rain = null;
  layer.unhook?.();
  layer.unhook = null;
}

function build(a: Arena): Layer {
  const sc = a.sc;
  const back = sc.add.container(0, 0);
  const front = sc.add.container(0, 0);
  // the print layer sits over the backdrop and its ambient particles, but under the pizzas
  sc.children.moveBelow(back, a.underLayer);
  sc.children.moveBelow(front, a.fxLayer);
  const dots = sc.add.tileSprite(W / 2, H / 2, W, H, 'p_a7_halftone').setTint(0x1a0a20).setAlpha(0.1);
  const grade = sc.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 1).setBlendMode(Phaser.BlendModes.MULTIPLY).setAlpha(0);
  back.add([dots, grade]);
  const flash = sc.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0).setBlendMode(Phaser.BlendModes.ADD);
  front.add(flash);
  return { back, front, grade, dots, flash, place: '', wave: 0, tickers: [], rain: null, unhook: null, t: 0, nextFlash: 0, lastSlam: a.slammedAt(), stage: 0 };
}

/** Light for the place and its wave within the stage: [multiply colour, strength]. */
const LIGHT: Record<string, [number, number][]> = {
  metropizza: [
    [0xffd8b0, 0.08],
    [0x9a86d8, 0.26],
    [0x4a5aa8, 0.44],
    [0x3a4870, 0.52],
  ],
  doomlab: [
    [0xffffff, 0],
    [0xe0c8d0, 0.12],
    [0xff8080, 0.2],
    [0x6a7a90, 0.34],
  ],
  thanfoot: [[0xc8a0ff, 0.14]],
};

function setLight(layer: Layer, col: number, k: number, ms = 1800): void {
  const sc = layer.back.scene;
  sc.tweens.killTweensOf(layer.grade);
  layer.grade.setFillStyle(col, 1);
  sc.tweens.add({ targets: layer.grade, alpha: k, duration: ms });
}

function rain(a: Arena, layer: Layer): void {
  const sc = a.sc;
  const e = sc.add.particles(0, 0, 'p_a7_rain', {
    x: { min: -200, max: W + 100 },
    y: -80,
    lifespan: 1100,
    speedY: { min: 1500, max: 1900 },
    speedX: { min: 240, max: 320 },
    rotate: -10,
    scale: { min: 0.7, max: 1.2 },
    alpha: { min: 0.35, max: 0.7 },
    frequency: reduced() ? 40 : 10,
  });
  e.fastForward(1200);
  layer.front.add(e);
  layer.rain = e;
}

/** Tesla arcs from the Doom Lab's coils to the vault's horns (the backdrop's DL layout; still backdrops only). */
function arcs(a: Arena, layer: Layer, every: number): void {
  let t = 1;
  layer.tickers.push((dt) => {
    t -= dt;
    if (t > 0) return;
    t = every * (0.6 + Math.random() * 0.8);
    const i = Math.random() < 0.5 ? 0 : 1;
    const c = DL.coils[i];
    const h = DL.horns[i];
    a.fx.lightning(c.x + (i ? -1 : 1) * DL.toroid.rx * 0.8, c.y, h.x, h.y);
    if (Math.random() < 0.5) a.sfx('sfx_zap', { volume: 0.18, rate: 1.4, throttle: 400 });
  });
}

/** The alarm beacons' red light on the lab walls (the painted beacons are the lamps; still backdrops only). */
function beacons(a: Arena, layer: Layer): void {
  const sc = a.sc;
  for (const b of DL.beacons) {
    const glow = sc.add.image(b.x, b.y, 'glow').setTint(0xff2a2a).setBlendMode(Phaser.BlendModes.ADD).setScale(2.4, 1);
    layer.back.add(glow);
    layer.tickers.push((_dt, t) => {
      const k = Math.max(0, Math.sin(t * 5 + b.x));
      glow.setAlpha(0.15 + k * 0.6);
      glow.scaleX = 2.4 * (0.4 + Math.abs(Math.cos(t * 5 + b.x)));
    });
  }
}

/** Bubbles rising in the glowing vats, from the foot of the glass to under the surface (still backdrops only). */
function vatBubbles(a: Arena, layer: Layer): void {
  const sc = a.sc;
  for (const [i, tint] of [
    [0, 0xb0ffc8],
    [1, 0xffb0f0],
  ] as const) {
    const x = DL.vats[i].x;
    const e = sc.add.particles(0, 0, 'soft', {
      x: { min: x - 60, max: x + 60 },
      y: DL.vat.bottom - 10,
      lifespan: 2000,
      speedY: { min: -140, max: -90 },
      speedX: { min: -8, max: 8 },
      scale: { min: 0.05, max: 0.12 },
      alpha: { values: [0, 0.8, 0] },
      tint,
      blendMode: 'ADD',
      frequency: 120,
    });
    e.fastForward(2000);
    layer.back.add(e);
  }
}

/** Smoke plumes drifting across the ruined street. */
function smoke(a: Arena, layer: Layer): void {
  const sc = a.sc;
  const e = sc.add.particles(0, 0, 'soft', {
    x: { min: 0, max: W },
    y: { min: 380, max: 620 },
    lifespan: 9000,
    speedX: { min: 10, max: 34 },
    speedY: { min: -18, max: -6 },
    scale: { min: 3, max: 6 },
    alpha: { values: [0, 0.16, 0] },
    tint: [0x2a1a1a, 0x3a2a2a],
    frequency: 380,
  });
  e.fastForward(8000);
  layer.back.add(e);
}

/** A slow nebula pulse and shooting stars over Titan's Throne. */
function cosmos(a: Arena, layer: Layer): void {
  const sc = a.sc;
  const neb = sc.add.image(960, 260, 'glow').setTint(0xb04dff).setBlendMode(Phaser.BlendModes.ADD).setScale(9, 3.4).setAlpha(0.15);
  layer.back.add(neb);
  let next = 1.5;
  layer.tickers.push((dt, t) => {
    neb.setAlpha(0.12 + Math.sin(t * 0.7) * 0.07);
    next -= dt;
    if (next > 0) return;
    next = 2 + Math.random() * 3;
    const x = 200 + Math.random() * 1500;
    const star = sc.add.image(x, 60, 'star').setScale(0.3).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0c0);
    layer.back.add(star);
    sc.tweens.add({ targets: star, x: x + 380, y: 330, alpha: 0, duration: 900, ease: 'Quad.In', onComplete: () => star.destroy() });
  });
}

/** Thunder and lightning: a white flash over everything and a rumble. */
function lightning(a: Arena, layer: Layer, strong: boolean): void {
  const sc = a.sc;
  sc.tweens.killTweensOf(layer.flash);
  layer.flash.setAlpha(reduced() ? 0.12 : strong ? 0.45 : 0.25);
  sc.tweens.add({ targets: layer.flash, alpha: 0, duration: 420, ease: 'Quad.Out' });
  if (!reduced()) sc.time.delayedCall(120, () => layer.flash.active && layer.flash.setAlpha(0.18) && sc.tweens.add({ targets: layer.flash, alpha: 0, duration: 300 }));
  sc.time.delayedCall(220 + Math.random() * 500, () => a.sfx('sfx_thunder', { volume: strong ? 0.8 : 0.5 }));
}

function setup(a: Arena, layer: Layer, n: number): void {
  // the wave's own arena or place (a nemesis stage, like Batpeel's Gotham, brings its own: src/game/nemesis.ts)
  // (a nemesis mini-boss's wave is in its own arena too: the place's weather and machinery stay out of it)
  const place = isBossWave(n) ? bossFor(n) : isMiniWave(n) && nemesisOf(miniFor(n)) ? miniFor(n) : locationFor(n);
  const ws = waveInStage(n);
  const changed = place !== layer.place;
  layer.wave = n;
  // the redrawn backdrops (src/content/art/scene-metropizza.ts, scene-doomlab.ts, scene-doomstomp.ts) light
  // themselves when animated
  const live = (place === 'metropizza' || place === 'doomlab' || place === 'doomstomp') && backdropsAnimated();
  const light = live ? ([0xffffff, 0] as [number, number]) : (LIGHT[place]?.[Math.min(ws, LIGHT[place].length) - 1] ?? [0xffffff, 0]);
  setLight(layer, light[0], light[1], changed ? 1 : 2000);
  // rebuild the moving parts when the place or the weather changes
  clearPlace(layer);
  layer.place = place;
  layer.nextFlash = 3 + Math.random() * 3;
  if (place === 'metropizza') {
    // the backdrop runs its own blimp, searchlights and bolts; the act keeps the rain over the feet, and flashes
    // the screen and thunders when one of the backdrop's bolts strikes
    if (ws >= 4) rain(a, layer);
    if (live) {
      const onBolt = (strong: boolean) => lightning(a, layer, strong);
      a.sc.events.on('metropizza:bolt', onBolt);
      layer.unhook = () => a.sc.events.off('metropizza:bolt', onBolt);
    }
  } else if (place === 'doomstomp') {
    // animated, the backdrop runs its own smoke columns and bolts: the act flashes and thunders when a bolt strikes;
    // still, the act drifts its smoke over the painted ruins and flashes now and then
    if (live) {
      const onBolt = (strong: boolean) => lightning(a, layer, strong);
      a.sc.events.on('doomstomp:bolt', onBolt);
      layer.unhook = () => a.sc.events.off('doomstomp:bolt', onBolt);
    } else smoke(a, layer);
  } else if (place === 'doomlab') {
    if (live) {
      // animated, the backdrop runs its vats, arcs, beacons and light, and its own power surges: the act plays them
      const onArc = (strong: boolean) => (strong || Math.random() < 0.5) && a.sfx('sfx_zap', { volume: strong ? 0.3 : 0.18, rate: strong ? 1.1 : 1.4, throttle: 400 });
      const onSurge = () => a.sfx('sfx_zap', { volume: 0.35, rate: 0.7, throttle: 500 });
      a.sc.events.on('doomlab:arc', onArc);
      a.sc.events.on('doomlab:surge', onSurge);
      layer.unhook = () => {
        a.sc.events.off('doomlab:arc', onArc);
        a.sc.events.off('doomlab:surge', onSurge);
      };
    } else {
      vatBubbles(a, layer);
      arcs(a, layer, ws >= 4 ? 1.4 : 3.2);
      if (ws >= 2) beacons(a, layer);
    }
  } else if (place === 'thanfoot') {
    cosmos(a, layer);
  }
}

function weatherTick(a: Arena, layer: Layer, dt: number): void {
  const ws = waveInStage(layer.wave);
  layer.nextFlash -= dt;
  if (layer.nextFlash > 0) return;
  if (layer.place === 'metropizza' && ws >= 4 && !layer.unhook) {
    layer.nextFlash = 5 + Math.random() * 5;
    lightning(a, layer, Math.random() < 0.4);
  } else if (layer.place === 'doomstomp' && !layer.unhook) {
    layer.nextFlash = 8 + Math.random() * 6;
    lightning(a, layer, false);
  } else if (layer.place === 'doomlab' && ws >= 4 && !layer.unhook) {
    // power surge: the lights dip and come back (an animated backdrop runs its own)
    layer.nextFlash = 6 + Math.random() * 5;
    const sc = a.sc;
    sc.tweens.add({ targets: layer.grade, alpha: { from: 0.75, to: LIGHT.doomlab[3][1] }, duration: 700, ease: 'Stepped', easeParams: [5] });
    a.sfx('sfx_zap', { volume: 0.35, rate: 0.7, throttle: 500 });
  } else layer.nextFlash = 3;
}

export const actFx: Record<number, ActFx> = {
  7: {
    enter(a, n) {
      if (!L || !L.back.active) L = build(a);
      setup(a, L, n);
    },
    leave() {
      L?.unhook?.();
      if (L?.back.active) {
        L.back.destroy(true);
        L.front.destroy(true);
      }
      L = null;
      bubbles = 0;
    },
    tick(a, dt) {
      if (!L || !L.back.active) return;
      L.t += dt;
      // the print screen drifts very slightly, like a page under a lamp
      L.dots.tilePositionX += dt * 2;
      for (const fn of L.tickers) fn(dt, L.t);
      weatherTick(a, L, dt);
      // in an Act 7 wave, any foot with lines may say one as it arrives (in a speech bubble)
      for (const f of a.allFeet()) {
        if (f.brain.a7seen || !f.alive || f.y < 60) continue;
        f.brain.a7seen = true;
        if (!f.isBossLike && !['henchman', 'goon', 'jetpack'].includes(f.type.id)) maybeQuip(a, f, 0.1);
      }
      // a Peel Slam or a big ability: the act's own KRAK!
      const s = a.slammedAt();
      if (s !== L.lastSlam) {
        L.lastSlam = s;
        impactWord(a, W / 2, 520, 1.8, 'KRAK!');
      }
    },
    hit(a, f, x, y, dealt, crit, source) {
      if (source === 'burn' || source === 'garlic' || dealt <= 0) return;
      // crits always get a word; bosses on a big hit; everything else now and then
      if (crit) impactWord(a, x, y - 60, f.isBossLike ? 1.25 : 1);
      else if (f.isBossLike && dealt > f.maxHp * 0.03) impactWord(a, x, y - 60, 1);
      else if (source === 'smack' && Math.random() < 0.06) impactWord(a, x, y - 60, 0.8);
    },
    kill(a, f) {
      if (f.isBossLike) impactWord(a, f.cx, f.cy - 40, 2, f.type.boss ? 'KRA-KOOM!' : 'KAPOW!');
      else if (f.elite || f.shiny) impactWord(a, f.cx, f.cy - 40, 1.1);
    },
  },
};

// ——— Villain feet ———

/** Any foot in an Act 7 wave may say one of its lines as it arrives (the villains more often). */
function maybeQuip(a: Arena, f: Foot, chance: number): void {
  const q = f.type.quips;
  if (!q?.length || Math.random() > chance) return;
  a.sc.time.delayedCall(400, () => f.alive && bubble(a, q[Math.floor(Math.random() * q.length)], f));
}

const bossOnField = (a: Arena) => a.allFeet().some((o) => o.alive && o.isBossLike);

/** A number badge on a henchman's spats (1–4: the order they dive in). */
function gangBadge(a: Arena, f: Foot, no: number): void {
  const sc = a.sc;
  const y = -f.meta.footHeight * f.type.scale * 0.62;
  const disc = sc.add.circle(0, y, 24, 0xffd23f).setStrokeStyle(5, INK);
  const t = sc.add.text(0, y + 1, String(no), { fontFamily: FONT, fontSize: '34px', color: '#2a1810' }).setOrigin(0.5);
  f.root.add([disc, t]);
  badges.set(f, { disc, t, y });
}

const badges = new WeakMap<Foot, { disc: Phaser.GameObjects.Arc; t: Phaser.GameObjects.Text; y: number }>();

/** Keeps the badge on screen: a gang waiting high up the lane slides it down its leg instead of off the top. */
function keepBadge(f: Foot): void {
  const b = badges.get(f);
  if (!b) return;
  const top = 44 - f.root.y;
  const y = Math.max(b.y, Math.min(top, -40));
  b.disc.y = y;
  b.t.y = y + 1;
}

const henchman: FootFx = {
  spawn(a, f) {
    const no = Number(f.brain.gangNo ?? 1);
    gangBadge(a, f, no);
    // dive in numbered order: each member hovers a beat longer than the one before
    f.hoverTime += (no - 1) * 0.75;
    if (no !== 1 || bossOnField(a)) return;
    // the leader brings the rest of the gang (none during a boss fight, where they come one at a time)
    const type = FOOT_BY_ID.henchman;
    for (let i = 2; i <= 4; i++) {
      const m = bits(a).spawnFoot(type, bits(a).pickTarget(null));
      m.brain.gangNo = i;
      m.y -= (i - 1) * 70;
    }
    a.sc.time.delayedCall(350, () => f.alive && bubble(a, f.type.quips?.[0] ?? 'GET THE PIZZA, BOYS!', f));
    a.sfx('sfx_gang', { volume: 0.8, throttle: 600 });
  },
  tick(_a, f) {
    keepBadge(f);
  },
};

const jetpack: FootFx = {
  spawn(a, f) {
    maybeQuip(a, f, 0.25);
  },
  tick(a, f, dt) {
    // fly in from the side the moment it has a lane (not straight down from the top)
    if (!f.brain.jetIn && !f.held && f.state === 'enter' && f.laneX !== null) {
      f.brain.jetIn = true;
      const left = f.laneX < W / 2;
      f.x = left ? -220 : W + 220;
      f.y = (f.hoverY ?? HOVER_Y) - 20;
      f.brain.jetDir = left ? 1 : -1;
      a.sfx('sfx_jetpack', { volume: 0.7, throttle: 250 });
    }
    // exhaust: a vapour trail while cruising in, little flames while hovering, a sputter before the dive
    const cruising = f.state === 'enter' && Math.abs((f.laneX ?? f.x) - f.x) > 60;
    if (cruising && Math.random() < dt * 40) a.fx.trail(f.x - Number(f.brain.jetDir ?? 1) * 90, f.cy + 30, 0xffe0b0);
    if (f.state === 'hover' || f.state === 'enter') {
      const k = f.scale;
      if (Math.random() < dt * 12) a.fx.burn(f.x + (Math.random() < 0.5 ? -1 : 1) * 112 * k, f.y - 70 * k);
      if (f.state === 'hover' && f.stateT > f.hoverTime - 0.45 && !f.brain.sputter) {
        f.brain.sputter = true;
        a.fx.puff(f.x - 112 * k, f.y - 60 * k, 4);
        a.fx.puff(f.x + 112 * k, f.y - 60 * k, 4);
      }
    }
    if (f.state === 'descend') f.brain.sputter = false;
  },
};

/** A goon's bomb: drops from the goon onto its pizza. Smack it mid-air to defuse it; if it lands, the pizza loses a slice. */
function dropBomb(a: Arena, f: Foot, img: Phaser.GameObjects.Image): void {
  const p = f.target && !f.target.dead ? f.target : bits(a).pickTarget(f);
  const sc = a.sc;
  // swap the bomb from the foot's rig to the fx layer at the same spot
  const m = img.getWorldTransformMatrix();
  const x0 = m.tx;
  const y0 = m.ty;
  img.destroy();
  const bomb = sc.add.image(x0, y0, 'p_a7_bomb').setScale(0.75);
  a.fxLayer.add(bomb);
  if (!p) {
    sc.tweens.add({ targets: bomb, alpha: 0, duration: 300, onComplete: () => bomb.destroy() });
    return;
  }
  const h = heat(a);
  const fall = h.windup(1.25);
  const tx = p.x + (Math.random() - 0.5) * 60;
  const ty = p.surfaceY - 30;
  let done = false;
  const ret = sc.add.image(tx, ty, 'p_reticle').setScale(0.55).setAlpha(0.9);
  a.fxLayer.add(ret);
  sc.tweens.add({ targets: ret, scale: 0.7, duration: 260, yoyo: true, repeat: -1 });
  const st = { k: 0 };
  const tw = sc.tweens.add({
    targets: st,
    k: 1,
    duration: fall * 1000,
    ease: 'Quad.In',
    onUpdate: () => {
      bomb.x = x0 + (tx - x0) * st.k;
      bomb.y = y0 + (ty - y0) * st.k;
      bomb.rotation += 0.12;
      if (Math.random() < 0.4) a.fx.burn(bomb.x + 30, bomb.y - 40);
    },
    onComplete: () => {
      if (done) return;
      done = true;
      ret.destroy();
      bomb.destroy();
      if (!a.inWave() || p.dead) return;
      a.fx.explosion(tx, ty, 120);
      a.shake(220, 0.007);
      a.sfx('sfx_bombboom');
      impactWord(a, tx, ty - 120, 1.2, 'KA-BOOM!');
      a.hitPizza(p, 1, 'BOMBED!', '#ff8a3a');
    },
  });
  a.addClickable({
    get x() {
      return bomb.x;
    },
    get y() {
      return bomb.y;
    },
    r: 95,
    priority: 2,
    alive: () => !done,
    hit: () => {
      if (done) return;
      done = true;
      tw.remove();
      ret.destroy();
      a.fx.impact(bomb.x, bomb.y, true);
      a.sfx('sfx_slap_2', { volume: 0.8 });
      a.sfx('sfx_bombfuse', { volume: 0.4, rate: 0.6 });
      impactWord(a, bomb.x, bomb.y - 60, 1, 'POW!');
      a.quip(bomb.x, bomb.y - 140, 'DEFUSED!', '#7dff9a', 36);
      sc.tweens.add({ targets: bomb, y: bomb.y - 420, x: bomb.x + (Math.random() - 0.5) * 500, angle: 540, alpha: 0, duration: 600, onComplete: () => bomb.destroy() });
    },
  });
}

const bombs = new WeakMap<Foot, Phaser.GameObjects.Image>();

const goon: FootFx = {
  spawn(a, f) {
    // the bomb hangs from the clamp on the toe
    const img = a.sc.add.image(8, -18 * f.type.scale, 'p_a7_bomb').setScale(0.58);
    f.root.add(img);
    bombs.set(f, img);
    maybeQuip(a, f, 0.3);
  },
  tick(a, f, dt) {
    const img = bombs.get(f);
    if (!img || !img.active) return;
    img.rotation = Math.sin(f.age * 4) * 0.25;
    if (f.brain.fuse === undefined) {
      // light the fuse a moment into its hover (or as soon as it starts its dive)
      if ((f.state === 'hover' && f.stateT > Math.min(0.5, f.hoverTime * 0.4)) || f.state === 'descend') {
        f.brain.fuse = heat(a).windup(0.75);
        a.sfx('sfx_bombfuse', { volume: 0.7, throttle: 200 });
        a.quip(f.x, f.cy - 150, 'FUSE LIT!', '#ffb03a', 32);
        a.sc.tweens.add({ targets: img, scale: img.scale * 1.15, duration: 120, yoyo: true, repeat: 3 });
      }
      return;
    }
    // the fizzing spark is the tell
    if (Math.random() < dt * 30) {
      const m = img.getWorldTransformMatrix();
      a.fx.burn(m.tx + 26, m.ty - 44);
    }
    f.brain.fuse = Number(f.brain.fuse) - dt;
    if (Number(f.brain.fuse) <= 0) {
      bombs.delete(f);
      dropBomb(a, f, img);
    }
  },
  kill(a, f) {
    // smacked down before it let go: the bomb falls off as a dud
    const img = bombs.get(f);
    if (!img?.active) return;
    bombs.delete(f);
    const m = img.getWorldTransformMatrix();
    const dud = a.sc.add.image(m.tx, m.ty, 'p_a7_bomb').setScale(0.6);
    a.fxLayer.add(dud);
    img.destroy();
    a.quip(m.tx, m.ty - 80, 'DUD!', '#c7ccd4', 30);
    a.sc.tweens.add({ targets: dud, y: m.ty + 500, angle: 200, alpha: 0, duration: 800, ease: 'Quad.In', onComplete: () => dud.destroy() });
  },
};

const ultodrone: FootFx = {
  kill(a, f) {
    a.fx.lightning(f.cx - 40, f.cy - 30, f.cx + 40, f.cy + 30);
  },
};

export const footFx: Record<string, FootFx> = {
  henchman,
  jetpack,
  goon,
  ultodrone,
  doomstomp: { spare: (a, f, source) => doomSpare(a, f, source) },
};
