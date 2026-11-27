// The living table pizzas (docs/pizza-plan.md, "The rarer, the more impressive"): one shared motion system for every
// pizza on the table, a step up from the pizza peels' (src/art/peelPizza.ts, whose painted layers and traits it reads),
// with its tier deciding how much of it runs.
//
// - Common: cheese bubbling (or the sauce, or a calzone's vents), steam, the oil glistening, the fat sizzling.
// - Rare: plus a richer bake (a browned, leopard-spotted crust and a glossier finish) and a soft light sweep now and then.
// - Epic: plus its own idle effect tied to its perk (embers, frost, stardust, wisps…: PERK_ELEMENT, else a default by
//   the perk's element) and a faint glow in its colour under the plate.
// - Legendary: plus an animated aura (AURAS, filled in by step 5; a test aura stands in) and signature hooks.
// Stomped: crumbs (the squash is the Pizza's own); Rare plus toppings hopping with the cheese stretching after them;
// Epic plus its element bursting out; Legendary its aura flaring and its signature hook. Its perk firing: a small pop of
// its colour; Rare plus a ring of light and a sound; Epic plus its named effect and a quip; Legendary a hook.
//
// Everything sits round and under the pie: three layers in the pizza's container, under the plate, between the plate
// and the pie, and between the pie and its face, so the face, slices, labels, freshness and shield always draw over
// it. Visuals only (no gameplay reads any of it), cosmetic randomness only (crand). Reduced motion calms it; with the
// peels' animation off (the Low and Medium graphics presets) only the basics run. Textures are drawn once and shared;
// each pizza keeps a small pool of images.

import Phaser from 'phaser';
import { CALZONE_CY, CALZONE_VENTS, PIZZA_R, PIZZA_SIZE, TILT, sideFor, slicePath } from '../art/pizzaArt';
import { frostArt, pizzaPaintAsync, pizzaPaintData, pizzaTraits, type PizzaTraits } from '../art/peelPizza';
import { hashStr, makeCanvas, rng, type Ctx } from '../art/util';
import type { PizzaPerk, PizzaType } from '../data/pizzas';
import type { PizzaRarity } from '../data/pizzaRarity';
import { audio } from '../systems/audio';
import { crand } from '../systems/cosmeticRandom';
import { peelsAnimated } from '../systems/graphics';
import { save } from '../systems/save';

// ════════════════════════════ tiers ════════════════════════════

export interface TierSet {
  /** How lively the basics are (bubbles, steam, sizzle, glints): a rate multiplier. */
  life: number;
  /** The light map over the pie (its oil and cheese shining): base alpha. */
  gloss: number;
  /** A richer bake: the crust browned and leopard-spotted. */
  bake: boolean;
  /** A soft light sweeping across it now and then. */
  sweep: boolean;
  /** Its perk's own idle effect, and a glow under the plate. */
  idle: boolean;
  /** An animated aura. */
  aura: boolean;
  /** Stomped: toppings hop (cheese stretching), its element bursts out, its signature. */
  hop: boolean;
  burst: boolean;
  signature: boolean;
  /** Perk fired: a ring of light and a sound; its named effect and a quip; its signature. */
  ring: boolean;
  named: boolean;
}

export const TIER_SET: Record<PizzaRarity, TierSet> = {
  common: { life: 1, gloss: 0.22, bake: false, sweep: false, idle: false, aura: false, hop: false, burst: false, signature: false, ring: false, named: false },
  rare: { life: 1.15, gloss: 0.34, bake: true, sweep: true, idle: false, aura: false, hop: true, burst: false, signature: false, ring: true, named: false },
  epic: { life: 1.25, gloss: 0.38, bake: true, sweep: true, idle: true, aura: false, hop: true, burst: true, signature: false, ring: true, named: true },
  legendary: { life: 1.3, gloss: 0.42, bake: true, sweep: true, idle: true, aura: true, hop: true, burst: true, signature: true, ring: true, named: true },
};

/** Dev: show every table pizza at this tier (F.pizzaFx.tier('epic')); null follows each pizza's own. off: none of it
 *  (to time the frame without it). */
export const aliveDev: { tier: PizzaRarity | null; off: boolean } = { tier: null, off: false };

// ════════════════════════════ a perk's element ════════════════════════════

export type Element = 'fire' | 'frost' | 'frostfire' | 'cosmic' | 'moon' | 'ghost' | 'ink' | 'life' | 'gold' | 'holy' | 'time' | 'rainbow' | 'heal' | 'power';

interface ElementLook {
  /** Its colour (a pizza's Rare Find glow, if it has one, takes over), and a second one for its motes. */
  col: number;
  col2: number;
  /** What its idle motes are (a texture), how they move, and how many a second. */
  mote: string;
  move: 'rise' | 'orbit' | 'fall' | 'drift';
  rate: number;
  /** Blend: glowing (ADD) or solid (ink). */
  add: boolean;
  /** Its sound when it bursts or fires (quiet), and the words of its named effect if its perk has none. */
  sfx: string;
  quip: string;
}

const EL: Record<Element, ElementLook> = {
  fire: { col: 0xff6a1a, col2: 0xffc23a, mote: 'pza_ember', move: 'rise', rate: 5, add: true, sfx: 'sfx_fire', quip: 'IT BURNS!' },
  frost: { col: 0x9ad8ff, col2: 0xffffff, mote: 'pza_flake', move: 'drift', rate: 2.4, add: true, sfx: 'sfx_freeze', quip: 'FROZEN SOLID!' },
  frostfire: { col: 0xa8dcff, col2: 0xff7a2a, mote: 'pza_ember', move: 'rise', rate: 3.5, add: true, sfx: 'sfx_freeze', quip: 'FROZEN, THEN BURNED!' },
  cosmic: { col: 0xffa04a, col2: 0xfff0c0, mote: 'pza_star', move: 'orbit', rate: 7, add: true, sfx: 'sfx_smack_magic_1', quip: 'COSMIC!' },
  moon: { col: 0xcfe4ff, col2: 0xffffff, mote: 'pza_star', move: 'orbit', rate: 6, add: true, sfx: 'sfx_smack_magic_2', quip: 'MOONLIGHT!' },
  ghost: { col: 0xa8e0ff, col2: 0xe8f8ff, mote: 'pza_wispy', move: 'orbit', rate: 5, add: true, sfx: 'sfx_smack_magic_3', quip: 'BOO!' },
  ink: { col: 0x3a1a5a, col2: 0x7a4aa8, mote: 'pza_ink', move: 'orbit', rate: 6, add: false, sfx: 'sfx_smack_magic_1', quip: 'INKED!' },
  life: { col: 0x7dff7a, col2: 0xd8ffb0, mote: 'pza_leaf', move: 'rise', rate: 2.2, add: false, sfx: 'sfx_heal', quip: 'GROWING BACK!' },
  gold: { col: 0xffc83a, col2: 0xfff2a0, mote: 'pza_star', move: 'orbit', rate: 6, add: true, sfx: 'sfx_hitcoin', quip: 'JACKPOT!' },
  holy: { col: 0xfff2c0, col2: 0xffffff, mote: 'pza_mote', move: 'rise', rate: 3, add: true, sfx: 'sfx_smack_tail_bell', quip: 'BLESSED!' },
  time: { col: 0x7ad8ff, col2: 0xffe6a0, mote: 'pza_mote', move: 'orbit', rate: 8, add: true, sfx: 'sfx_smack_tail_bell', quip: 'TIME STOP!' },
  rainbow: { col: 0xff9ae6, col2: 0xffffff, mote: 'pza_mote', move: 'orbit', rate: 8, add: true, sfx: 'sfx_smack_magic_2', quip: 'RAINBOW!' },
  heal: { col: 0xffb0c8, col2: 0xffffff, mote: 'pza_heart', move: 'rise', rate: 1.6, add: false, sfx: 'sfx_heal', quip: 'HEALED!' },
  power: { col: 0xffd23f, col2: 0xffffff, mote: 'pza_star', move: 'orbit', rate: 6, add: true, sfx: 'sfx_smack_magic_1', quip: 'POWER UP!' },
};

/** The sounds it plays that aren't loaded at boot (the scene loads them with the run). */
export const ALIVE_SFX = ['sfx_smack_tail_glint', 'sfx_smack_tail_bell', 'sfx_smack_magic_1', 'sfx_smack_magic_2', 'sfx_smack_magic_3'];

/** The perks with an element (and a named effect) of their own; any other perk gets one by its name or its pizza. */
const PERK_ELEMENT: Partial<Record<PizzaPerk, { el: Element; quip?: string }>> = {
  frostFire: { el: 'frostfire' },
  fireLane: { el: 'fire', quip: 'DRAGON BREATH!' },
  erupt: { el: 'fire', quip: 'ERUPTION!' },
  burnStomper: { el: 'fire', quip: 'HOT HOT HOT!' },
  meteor: { el: 'cosmic', quip: 'METEOR STRIKE!' },
  postBoss: { el: 'moon', quip: 'MOON CHEESE!' },
  timeStop: { el: 'time', quip: 'TIME STOP!' },
  ghostPass: { el: 'ghost', quip: 'PASSED THROUGH!' },
  rainbow: { el: 'rainbow', quip: 'RAINBOW SWAP!' },
  mystery: { el: 'ink', quip: 'MYSTERY!' },
  luck: { el: 'gold', quip: 'GOLDEN LUCK!' },
  regenAll: { el: 'life', quip: 'EVERYONE REGROWS!' },
  nonna: { el: 'heal', quip: "NONNA'S HUG!" },
  firstBack: { el: 'holy', quip: 'UNTOUCHABLE!' },
  varietyDmg: { el: 'power', quip: 'VARIETY!' },
  peelDmg: { el: 'power', quip: 'PEEL POWER!' },
  slowHits: { el: 'frost' },
  firstFreeze: { el: 'frost' },
  regen: { el: 'life' },
};

/** A perk's element: its own, else by its name, else by its pizza (a hot pie fire, a cold one frost), else power. */
export function elementOf(p: PizzaType, tr: PizzaTraits): Element {
  const own = PERK_ELEMENT[p.perk];
  if (own) return own.el;
  const k = p.perk.toLowerCase();
  if (/burn|fire|heat|erupt|flame/.test(k)) return 'fire';
  if (/frost|freeze|slow|chill|ice/.test(k)) return 'frost';
  if (/ghost|haunt/.test(k)) return 'ghost';
  if (/regen|heal|grow|slices|feast/.test(k)) return 'life';
  if (/coin|tip|gold|crust|treasure|luck|discount|refund|reroll/.test(k)) return 'gold';
  if (/shield|block|thick|sturdy|immune|survive|back|rise/.test(k)) return 'holy';
  if (/time|stop|wait/.test(k)) return 'time';
  if (/meteor|star|moon|orbit|night/.test(k)) return 'cosmic';
  if (/ink|mystery/.test(k)) return 'ink';
  if (tr.hot > 0) return 'fire';
  if (tr.cold) return 'frost';
  return 'power';
}

/** Its colour: a Rare Find's glow if it has one, else its element's. */
function colourOf(p: PizzaType, el: Element): number {
  return p.finish?.glow ?? EL[el].col;
}

// ════════════════════════════ legendary hooks (step 5 fills these in) ════════════════════════════

/** Where an aura draws: under the plate, between the plate and the pie (round it), and the pie's ellipse now. */
export interface AuraCtx {
  scene: Phaser.Scene;
  under: Phaser.GameObjects.Container;
  mid: Phaser.GameObjects.Container;
  col: number;
  /** A square pie (its rings and glow are rounded squares). */
  square: boolean;
}
export interface AuraFrame {
  /** The pie's middle (local), its radii, and the plate's. */
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  prx: number;
  pry: number;
  /** Calm (reduced motion) and basics-only (graphics). */
  calm: boolean;
  basic: boolean;
}
export interface Aura {
  update(dt: number, f: AuraFrame): void;
  /** Stomped (the aura flares) or its perk fired. */
  flare(strength: number): void;
  setVisible(on: boolean): void;
  destroy(): void;
}
/** A legendary's aura, by pizza id (step 5). Without one, a legendary shows the test aura. */
export const AURAS: Record<string, (c: AuraCtx) => Aura> = {};
/** A legendary's signature reactions, by pizza id (step 5): stomped (the screen pulse, its own sound) and its perk's
 *  full moment. Each gets the pizza's world position. */
export const SIGNATURES: Record<string, { stomp?: (x: number, y: number) => void; fire?: (x: number, y: number) => void }> = {};

// ════════════════════════════ shared textures ════════════════════════════

function soft(ctx: Ctx, x: number, y: number, r: number, inner: string, outer: string): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

const TEX: Record<string, () => HTMLCanvasElement> = {
  // a popped bubble's ring
  pza_pop: () => {
    const [c, x] = makeCanvas(40, 40);
    x.beginPath();
    x.arc(20, 20, 15, 0, Math.PI * 2);
    x.strokeStyle = 'rgba(255,255,255,0.95)';
    x.lineWidth = 2.5;
    x.stroke();
    return c;
  },
  // steam: a soft wisp, taller than wide
  pza_steam: () => {
    const [c, x] = makeCanvas(48, 80);
    x.save();
    x.scale(1, 80 / 48);
    soft(x, 24, 24, 24, 'rgba(255,255,255,0.85)', 'rgba(255,255,255,0)');
    x.restore();
    return c;
  },
  // a glint of light (sizzle, glisten)
  pza_glint: () => {
    const [c, x] = makeCanvas(32, 32);
    soft(x, 16, 16, 16, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    x.fillStyle = '#fff';
    x.beginPath();
    x.moveTo(16, 1);
    x.quadraticCurveTo(17, 15, 31, 16);
    x.quadraticCurveTo(17, 17, 16, 31);
    x.quadraticCurveTo(15, 17, 1, 16);
    x.quadraticCurveTo(15, 15, 16, 1);
    x.fill();
    return c;
  },
  pza_star: () => {
    const [c, x] = makeCanvas(24, 24);
    soft(x, 12, 12, 12, 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0)');
    x.fillStyle = '#fff';
    x.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 ? 2.6 : 10;
      x.lineTo(12 + Math.cos(a) * r, 12 + Math.sin(a) * r);
    }
    x.fill();
    return c;
  },
  pza_mote: () => {
    const [c, x] = makeCanvas(20, 20);
    soft(x, 10, 10, 10, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    soft(x, 10, 10, 3.5, 'rgba(255,255,255,1)', 'rgba(255,255,255,0.6)');
    return c;
  },
  pza_ember: () => {
    const [c, x] = makeCanvas(20, 20);
    soft(x, 10, 10, 10, 'rgba(255,180,90,0.9)', 'rgba(255,90,20,0)');
    soft(x, 10, 10, 3.2, 'rgba(255,250,220,1)', 'rgba(255,200,120,0.8)');
    return c;
  },
  pza_flake: () => {
    const [c, x] = makeCanvas(24, 24);
    soft(x, 12, 12, 12, 'rgba(220,240,255,0.5)', 'rgba(220,240,255,0)');
    x.strokeStyle = '#ffffff';
    x.lineWidth = 1.8;
    x.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      x.beginPath();
      x.moveTo(12 - Math.cos(a) * 9, 12 - Math.sin(a) * 9);
      x.lineTo(12 + Math.cos(a) * 9, 12 + Math.sin(a) * 9);
      x.stroke();
    }
    return c;
  },
  pza_wispy: () => {
    const [c, x] = makeCanvas(40, 28);
    x.save();
    x.scale(1, 28 / 40);
    soft(x, 20, 20, 20, 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0)');
    x.restore();
    return c;
  },
  pza_ink: () => {
    const [c, x] = makeCanvas(32, 32);
    const r = rng(7);
    soft(x, 16, 16, 15, 'rgba(255,255,255,0.75)', 'rgba(255,255,255,0)');
    for (let i = 0; i < 4; i++) soft(x, 8 + r() * 16, 8 + r() * 16, 5 + r() * 4, 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0)');
    return c;
  },
  pza_leaf: () => {
    const [c, x] = makeCanvas(22, 22);
    x.translate(11, 11);
    x.rotate(-0.6);
    x.beginPath();
    x.moveTo(-9, 0);
    x.quadraticCurveTo(0, -8, 9, 0);
    x.quadraticCurveTo(0, 8, -9, 0);
    x.fillStyle = '#5fcf4a';
    x.fill();
    x.strokeStyle = '#1e5a14';
    x.lineWidth = 1.6;
    x.stroke();
    x.beginPath();
    x.moveTo(-8, 0);
    x.lineTo(7, 0);
    x.strokeStyle = 'rgba(220,255,190,0.9)';
    x.lineWidth = 1;
    x.stroke();
    return c;
  },
  pza_heart: () => {
    const [c, x] = makeCanvas(22, 20);
    x.beginPath();
    x.moveTo(11, 18);
    x.bezierCurveTo(-4, 8, 3, -3, 11, 5);
    x.bezierCurveTo(19, -3, 26, 8, 11, 18);
    x.fillStyle = '#ff7aa8';
    x.fill();
    x.strokeStyle = '#7a1a3a';
    x.lineWidth = 1.6;
    x.stroke();
    x.beginPath();
    x.arc(7, 7, 2, 0, Math.PI * 2);
    x.fillStyle = 'rgba(255,255,255,0.85)';
    x.fill();
    return c;
  },
  // a crack of frost on the plate (white, tinted)
  pza_crack: () => {
    const [c, x] = makeCanvas(160, 160);
    const r = rng(31);
    x.lineCap = 'round';
    const branch = (px: number, py: number, a: number, len: number, w: number, d: number) => {
      const ex = px + Math.cos(a) * len;
      const ey = py + Math.sin(a) * len;
      x.beginPath();
      x.moveTo(px, py);
      x.lineTo((px + ex) / 2 + (r() - 0.5) * 6, (py + ey) / 2 + (r() - 0.5) * 6);
      x.lineTo(ex, ey);
      x.strokeStyle = `rgba(255,255,255,${0.5 + d * 0.15})`;
      x.lineWidth = w;
      x.stroke();
      if (d > 0) for (let i = 0; i < 2; i++) branch(ex, ey, a + (r() - 0.5) * 1.4, len * 0.6, w * 0.65, d - 1);
    };
    for (let i = 0; i < 7; i++) branch(80, 80, (i / 7) * Math.PI * 2 + r() * 0.5, 26 + r() * 14, 3, 2);
    return c;
  },
  // a rim of light round the pie (an elliptical band: squashed by TILT where it's drawn)
  pza_rim: () => {
    const [c, x] = makeCanvas(256, 256);
    const g = x.createRadialGradient(128, 128, 96, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    return c;
  },
  // a square pie's rim of light and its glow (rounded squares, the same sizes as pza_rim and glow)
  pza_rimSq: () => {
    const [c, x] = makeCanvas(256, 256);
    for (let i = 0; i < 6; i++) {
      x.beginPath();
      x.roundRect(128 - 113, 128 - 113, 226, 226, 26);
      x.strokeStyle = `rgba(255,255,255,${0.16 + i * 0.05})`;
      x.lineWidth = 26 - i * 4;
      x.stroke();
    }
    return c;
  },
  pza_glowSq: () => {
    const [c, x] = makeCanvas(256, 256);
    for (let i = 0; i < 22; i++) {
      const h = 124 - i * 4.4;
      x.beginPath();
      x.roundRect(128 - h, 128 - h, h * 2, h * 2, h * 0.3);
      x.fillStyle = 'rgba(255,255,255,0.045)';
      x.fill();
    }
    return c;
  },
  // an aura's ring: a band of light with gaps, to turn
  pza_auraRing: () => {
    const [c, x] = makeCanvas(256, 256);
    x.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const a0 = (i / 12) * Math.PI * 2;
      x.beginPath();
      x.arc(128, 128, 112, a0, a0 + Math.PI * 2 * 0.055);
      x.strokeStyle = 'rgba(255,255,255,0.9)';
      x.lineWidth = i % 3 ? 4 : 8;
      x.stroke();
    }
    x.beginPath();
    x.arc(128, 128, 120, 0, Math.PI * 2);
    x.strokeStyle = 'rgba(255,255,255,0.35)';
    x.lineWidth = 2;
    x.stroke();
    return c;
  },
  // a soft shaft of light rising
  pza_ray: () => {
    const [c, x] = makeCanvas(48, 256);
    const g = x.createLinearGradient(0, 256, 0, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    const h = x.createLinearGradient(0, 0, 48, 0);
    h.addColorStop(0, 'rgba(0,0,0,1)');
    h.addColorStop(0.5, 'rgba(0,0,0,0)');
    h.addColorStop(1, 'rgba(0,0,0,1)');
    x.fillStyle = g;
    x.fillRect(0, 0, 48, 256);
    x.globalCompositeOperation = 'destination-out';
    x.fillStyle = h;
    x.fillRect(0, 0, 48, 256);
    return c;
  },
};

/** A bubble in its colours: a dome lit on its top left, its shadow on its bottom right, a glint. */
function bubbleTex(scene: Phaser.Scene, col: [string, string, string]): string {
  const key = `pza_bub_${col.join('')}`;
  if (scene.textures.exists(key)) return key;
  const [dk, body, lt] = col;
  const [c, x] = makeCanvas(40, 40);
  // its shadow down and to the right
  const sg = x.createRadialGradient(23, 24, 6, 23, 24, 18);
  sg.addColorStop(0, hexA(dk, 0.55));
  sg.addColorStop(1, hexA(dk, 0));
  x.fillStyle = sg;
  x.fillRect(0, 0, 40, 40);
  // the dome, its edge a touch darker, lit from the top left
  x.beginPath();
  x.arc(20, 20, 13, 0, Math.PI * 2);
  const g = x.createRadialGradient(15, 14, 1, 20, 20, 13);
  g.addColorStop(0, hexA(lt, 1));
  g.addColorStop(0.55, hexA(body, 1));
  g.addColorStop(1, hexA(dk, 0.55));
  x.fillStyle = g;
  x.fill();
  x.strokeStyle = hexA(dk, 0.45);
  x.lineWidth = 1.2;
  x.stroke();
  x.beginPath();
  x.ellipse(14.5, 13.5, 4.2, 2.6, -0.6, 0, Math.PI * 2);
  x.fillStyle = 'rgba(255,255,255,0.9)';
  x.fill();
  scene.textures.addCanvas(key, c);
  return key;
}

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function ensureTextures(scene: Phaser.Scene): void {
  for (const [k, draw] of Object.entries(TEX)) if (!scene.textures.exists(k)) scene.textures.addCanvas(k, draw());
}

// ════════════════════════════ a pizza's bake, hop pieces and points ════════════════════════════

/** A pizza's top with a richer bake (Rare and up): the crust browned deeper at its edge and leopard-spotted, the pie
 *  given a glossier sheen. Drawn once per pizza onto a copy of its top, only where the top is painted. */
const baked = new Map<string, HTMLCanvasElement>();
export function bakedTop(p: PizzaType, top: HTMLCanvasElement): HTMLCanvasElement {
  const have = baked.get(p.id);
  if (have) return have;
  const S = PIZZA_SIZE;
  const C = S / 2;
  const R = PIZZA_R;
  const [c, x] = makeCanvas(S, S);
  x.drawImage(top, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  const r = rng(hashStr(`bake:${p.id}`));
  const cy = p.shape === 'calzone' ? CALZONE_CY : C;
  // a point on the crust: u round it, d in from its edge (a square's along its sides)
  const crust = (u: number, d: number): [number, number] => {
    const a = u * Math.PI * 2;
    const cx = Math.cos(a);
    const sy = Math.sin(a);
    if (p.shape === 'square') {
      const m = Math.max(Math.abs(cx), Math.abs(sy));
      return [C + (cx / m) * (R - d), C + (sy / m) * (R - d)];
    }
    if (p.shape === 'calzone') return [C + cx * (R - d), cy + Math.abs(sy) * (R - d) * (sy < 0 ? 0.25 : 1)];
    return [C + cx * (R - d), C + sy * (R - d)];
  };
  // the edge browned: soft dark rings, deepest at the very edge
  for (let i = 0; i < 4; i++) {
    x.beginPath();
    if (p.shape === 'square') x.roundRect(C - R + 2, C - R + 2, R * 2 - 4, R * 2 - 4, R * 0.12);
    else if (p.shape === 'calzone') {
      x.moveTo(C + R, cy);
      x.arc(C, cy, R - 2, 0, Math.PI);
      x.quadraticCurveTo(C, cy - R * 0.22, C + R, cy);
    } else x.arc(C, C, R - 2, 0, Math.PI * 2);
    x.strokeStyle = `rgba(92,40,10,${0.13 + i * 0.03})`;
    x.lineWidth = 34 - i * 8;
    x.stroke();
  }
  // leopard spots: charred blisters on the cornicione, each with a lighter puff beside it
  const n = p.shape === 'calzone' ? 30 : 26;
  for (let i = 0; i < n; i++) {
    const [sx, sy] = p.shape === 'calzone' ? [C + (r() - 0.5) * R * 1.7, cy + r() * R * 0.8] : crust(r(), 4 + r() * 18);
    const sr = 3 + r() * 6;
    const g = x.createRadialGradient(sx, sy, 0, sx, sy, sr);
    g.addColorStop(0, 'rgba(40,16,4,0.6)');
    g.addColorStop(0.6, 'rgba(60,24,6,0.3)');
    g.addColorStop(1, 'rgba(60,24,6,0)');
    x.fillStyle = g;
    x.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    const lx = sx - sr * 0.9;
    const ly = sy - sr * 0.8;
    const lg = x.createRadialGradient(lx, ly, 0, lx, ly, sr * 0.8);
    lg.addColorStop(0, 'rgba(255,230,170,0.35)');
    lg.addColorStop(1, 'rgba(255,230,170,0)');
    x.fillStyle = lg;
    x.fillRect(lx - sr, ly - sr, sr * 2, sr * 2);
  }
  // a glossier finish: a broad soft sheen from the top left
  const sg = x.createRadialGradient(C - R * 0.35, cy - R * 0.4, 0, C - R * 0.35, cy - R * 0.4, R * 0.9);
  sg.addColorStop(0, 'rgba(255,248,225,0.16)');
  sg.addColorStop(1, 'rgba(255,248,225,0)');
  x.fillStyle = sg;
  x.fillRect(0, 0, S, S);
  baked.set(p.id, c);
  return c;
}

/** A pizza's top with its hopping pieces taken out (shown while they're in the air), at full size. */
const holed = new Map<string, HTMLCanvasElement>();
function holedTop(p: PizzaType, pie: HTMLCanvasElement, bake: boolean): HTMLCanvasElement {
  const key = `${p.id}:${bake}`;
  const have = holed.get(key);
  if (have) return have;
  const [c, x] = makeCanvas(PIZZA_SIZE, PIZZA_SIZE);
  x.imageSmoothingQuality = 'high';
  x.drawImage(pie, 0, 0, PIZZA_SIZE, PIZZA_SIZE);
  const out = bake ? bakedTop({ ...p, id: `${p.id}#holed` }, c) : c;
  holed.set(key, out);
  return out;
}

/** Which slice (of n) a point in top-down art space is on. */
function sliceAt(shape: PizzaType['shape'], n: number, ax: number, ay: number): number {
  const C = PIZZA_SIZE / 2;
  const R = PIZZA_R + 6;
  if (shape === 'calzone') return Phaser.Math.Clamp(Math.floor((ax - (C - R)) / ((R * 2) / n)), 0, n - 1);
  if (shape === 'square') {
    const top = Math.ceil(n / 2);
    const row = ay < C ? 0 : 1;
    const cols = row === 0 ? top : n - top;
    const col = Phaser.Math.Clamp(Math.floor((ax - (C - R)) / ((R * 2) / cols)), 0, cols - 1);
    return row === 0 ? col : top + col;
  }
  let a = Math.atan2(ay - C, ax - C) + Math.PI / 2;
  if (a < 0) a += Math.PI * 2;
  return Math.min(n - 1, Math.floor((a / (Math.PI * 2)) * n));
}

/** Points to use before the peel's paint is ready: scattered over the pie (seeded, so they don't jump). */
function fallbackPts(p: PizzaType, n: number, seed: string): number[] {
  const r = rng(hashStr(p.id + seed));
  const out: number[] = [];
  const C = PIZZA_SIZE / 2;
  for (let i = 0; i < n; i++) {
    if (p.shape === 'square') out.push(C + (r() - 0.5) * PIZZA_R * 1.5, C + (r() - 0.5) * PIZZA_R * 1.5);
    else {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * PIZZA_R * 0.66;
      out.push(C + Math.cos(a) * d, C + Math.sin(a) * d);
    }
  }
  return out;
}

// ════════════════════════════ a living pizza ════════════════════════════

interface Part {
  img: Phaser.GameObjects.Image;
  layer: Phaser.GameObjects.Container;
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  life: number;
  s0: number;
  s1: number;
  a: number;
  grav: number;
  drag: number;
  spin: number;
  /** 'out' fades as it goes, 'inout' swells in and out; sway wobbles it sideways (steam). */
  fade: 'out' | 'inout';
  sway: number;
  /** A bubble: swells, then pops into a ring. */
  bubble?: boolean;
  /** Scale y relative to x (tilted onto the table). */
  sy: number;
}

interface Orbiter {
  img: Phaser.GameObjects.Image;
  a: number;
  speed: number;
  r: number;
  h: number;
  ph: number;
}

interface Hop {
  img: Phaser.GameObjects.Image;
  /** Its rest position (local, at scale 1 of the pie: multiplied by s). */
  ax: number;
  ay: number;
  delay: number;
  h: number;
  dur: number;
  dx: number;
  spin: number;
}

/** What the pizza tells its living layer each frame. */
export interface AliveHost {
  scene: Phaser.Scene;
  type: PizzaType;
  root: Phaser.GameObjects.Container;
  s: number;
  dead: boolean;
  stale: boolean;
  perkFrozen: boolean;
  alive: boolean[];
  /** The face's middle (local) and its scale. */
  faceY: number;
  faceS: number;
  /** World position for quips and signatures. */
  x: number;
  surfaceY: number;
  /** Redraw the pie with another top (the holed one while pieces hop), or its own (null). */
  setTop(top: HTMLCanvasElement | null): void;
}

/** Quips from the scene (set by GameScene; the menu has none). */
export const aliveHooks: { quip?: (x: number, y: number, text: string, color: string, size: number, angle: number) => void } = {};

const reduced = () => !!save.settings.reducedMotion;

export class PizzaAlive {
  readonly tier: PizzaRarity;
  readonly set: TierSet;
  readonly tr: PizzaTraits;
  readonly el: Element;
  readonly col: number;
  private sc: Phaser.Scene;
  private under: Phaser.GameObjects.Container;
  private mid: Phaser.GameObjects.Container;
  private top: Phaser.GameObjects.Container;
  private parts: Part[] = [];
  private pool = new Map<Phaser.GameObjects.Container, Phaser.GameObjects.Image[]>();
  private t = crand() * 20;
  private acc: Record<string, number> = {};
  private bubTex: string;
  /** Points (art px, flattened): where it bubbles, its oily pieces, its gold. */
  private bub: number[];
  private oil: number[];
  private gold: number[];
  private gloss?: { img: Phaser.GameObjects.Image; tex: Phaser.Textures.CanvasTexture; c: HTMLCanvasElement; x: Ctx; key: string };
  private sweep?: { img: Phaser.GameObjects.Image; tex: Phaser.Textures.CanvasTexture; c: HTMLCanvasElement; x: Ctx; key: string; u: number; next: number };
  private frost?: { outer: Phaser.GameObjects.Image; key: string };
  private glow?: Phaser.GameObjects.Image;
  private rimGlow?: Phaser.GameObjects.Image;
  private orbit: Orbiter[] = [];
  private aura: Aura | null = null;
  private hops: Hop[] = [];
  private hopT = -1;
  private strings?: Phaser.GameObjects.Graphics;
  private painted = false;
  private lastPop = -9;
  private lastRing = -9;
  private lastQuip = -9;
  private lastBurst = -9;
  private flareT = 0;
  private destroyed = false;
  private hue = crand();
  private cutSig = '';
  /** A square pie's rings and glows are rounded squares. */
  private readonly sq: boolean;
  private get ringTex(): string {
    return this.sq ? 'pza_rimSq' : 'ring';
  }
  private get rimTex(): string {
    return this.sq ? 'pza_rimSq' : 'pza_rim';
  }
  private get glowTex(): string {
    return this.sq ? 'pza_glowSq' : 'glow';
  }

  constructor(private host: AliveHost, plate: Phaser.GameObjects.Image, _pie: Phaser.GameObjects.Image, face: Phaser.GameObjects.Container) {
    const p = host.type;
    this.sc = host.scene;
    ensureTextures(this.sc);
    this.tier = aliveDev.tier ?? p.rarity ?? 'common';
    this.set = TIER_SET[this.tier];
    this.tr = pizzaTraits(p);
    this.el = elementOf(p, this.tr);
    this.col = colourOf(p, this.el);
    this.sq = p.shape === 'square';
    this.bubTex = bubbleTex(this.sc, this.tr.bubbleCol);
    const root = host.root;
    this.under = this.sc.add.container(0, 0);
    this.mid = this.sc.add.container(0, 0);
    this.top = this.sc.add.container(0, 0);
    root.addAt(this.under, 0);
    root.addAt(this.mid, root.getIndex(plate) + 1);
    // (right under the face: the face, its labels and everything after them stay over all of it)
    root.addAt(this.top, root.getIndex(face));
    this.bub = this.tr.calzone ? CALZONE_VENTS.flatMap(([x, y]) => [x, y]) : fallbackPts(p, 20, 'b');
    this.oil = this.tr.oil > 0 ? fallbackPts(p, 10, 'o') : [];
    this.gold = [];
    if (this.set.idle) {
      this.glow = this.sc.add.image(0, 0, this.glowTex).setTint(this.col).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3);
      this.under.add(this.glow);
      if (this.el === 'fire' || this.el === 'frostfire') {
        this.rimGlow = this.sc.add.image(0, 0, this.rimTex).setTint(0xff7a2a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3);
        this.mid.add(this.rimGlow);
      }
      if (EL[this.el].move === 'orbit') {
        const n = 10;
        for (let i = 0; i < n; i++) {
          const img = this.sc.add.image(0, 0, EL[this.el].mote).setBlendMode(EL[this.el].add ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
          this.mid.add(img);
          this.orbit.push({ img, a: (i / n) * Math.PI * 2 + crand() * 0.4, speed: (0.32 + crand() * 0.18) * (this.el === 'time' ? 0.6 : 1), r: 1.04 + crand() * 0.12, h: crand() * 0.5, ph: crand() * 6 });
        }
      }
    }
    if (this.set.aura) {
      const make = AURAS[p.id] ?? testAura;
      this.aura = make({ scene: this.sc, under: this.under, mid: this.mid, col: p.finish?.glow ?? 0xffc83a, square: this.sq });
    }
    // the peel's painted layers (from the art cache, else painted in idle time): its real points, light map and
    // hopping pieces
    void pizzaPaintAsync(p.id, () => !this.destroyed && host.root.active).then(() => {
      if (!this.destroyed && host.root.active) this.onPaint();
    });
    this.place();
  }

  private onPaint(): void {
    const data = pizzaPaintData(this.host.type.id);
    if (!data) return;
    this.painted = true;
    const d = data.d;
    if (!this.tr.calzone) {
      const pts = this.tr.bubbles === 'cheese' ? d.cheese : d.sauce;
      if (pts.length >= 6) this.bub = pts;
    }
    if (d.oil.length) this.oil = d.oil;
    this.gold = d.gold;
    // the light map, cut to the slices left (redone when slices change)
    const key = `pza_gloss_${uidN++}`;
    const [c, x] = makeCanvas(data.spec.width, data.spec.height);
    const tex = this.sc.textures.addCanvas(key, c)!;
    const img = this.sc.add.image(0, 0, key).setBlendMode(Phaser.BlendModes.ADD).setAlpha(this.set.gloss);
    this.top.addAt(img, 0);
    this.gloss = { img, tex, c, x, key };
    if (this.set.sweep) {
      const skey = `pza_sweep_${uidN++}`;
      const [sc2, sx] = makeCanvas(128, 128);
      const stex = this.sc.textures.addCanvas(skey, sc2)!;
      const simg = this.sc.add.image(0, 0, skey).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
      this.top.addAt(simg, 1);
      this.sweep = { img: simg, tex: stex, c: sc2, x: sx, key: skey, u: -1, next: 2 + crand() * 5 };
    }
    // frost rimed on the crust, breathing in and back (Epic and up, a frosty perk; kept to the rim so the pie keeps
    // its colour)
    if (this.set.idle && (this.el === 'frost' || this.el === 'frostfire') && !this.tr.calzone) {
      const key = `pza_frost_${uidN++}`;
      const outer = this.sc.add.image(0, 0, this.cutTex(key, frostArt(this.host.type)[0])).setAlpha(0.65);
      this.top.addAt(outer, 0);
      this.frost = { outer, key };
    }
    // the pieces that hop, each its own frame on a sheet
    if (this.set.hop && data.sheet && d.hops.length) {
      const hk = `pza_hop_${this.host.type.id}`;
      if (!this.sc.textures.exists(hk)) {
        const t = this.sc.textures.addCanvas(hk, data.sheet)!;
        for (let i = 0; i < d.hops.length / 2; i++) t.add(i, 0, i * data.cell, 0, data.cell, data.cell);
      }
      for (let i = 0; i < d.hops.length / 2; i++) {
        const img = this.sc.add.image(0, 0, hk, i).setVisible(false);
        this.top.add(img);
        this.hops.push({ img, ax: d.hops[i * 2], ay: d.hops[i * 2 + 1], delay: 0, h: 0, dur: 0.34, dx: 0, spin: 0 });
      }
      this.strings = this.sc.add.graphics();
      this.top.add(this.strings);
    }
    this.cutSig = '';
    this.slicesChanged();
    this.place();
  }

  /** A 200 px canvas texture of `src` (art space) cut to the slices left. */
  private cutTex(key: string, src: HTMLCanvasElement): string {
    const [c] = makeCanvas(200, 200);
    this.sc.textures.addCanvas(key, c);
    this.drawCut(c, src);
    return key;
  }

  private drawCut(c: HTMLCanvasElement, src: HTMLCanvasElement): void {
    const x = c.getContext('2d')!;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, c.width, c.height);
    const k = c.width / PIZZA_SIZE;
    const al = this.host.alive;
    const n = al.length;
    if (al.every(Boolean)) {
      x.drawImage(src, 0, 0, c.width, c.height);
      return;
    }
    for (let i = 0; i < n; i++) {
      if (!al[i]) continue;
      x.save();
      x.setTransform(k, 0, 0, k, 0, 0);
      slicePath(x, this.host.type.shape, i, n, -1);
      x.clip();
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.drawImage(src, 0, 0, c.width, c.height);
      x.restore();
    }
  }

  /** Slices came or went (or it went stale, or died): the light map and frost follow the slices left. */
  slicesChanged(): void {
    if (this.destroyed) return;
    const sig = this.host.alive.map(Number).join('');
    if (sig === this.cutSig) return;
    this.cutSig = sig;
    const data = this.painted ? pizzaPaintData(this.host.type.id) : null;
    if (this.gloss && data) {
      this.drawCut(this.gloss.c, data.spec);
      this.gloss.tex.refresh();
    }
    if (this.frost) {
      const t = this.sc.textures.get(this.frost.key) as Phaser.Textures.CanvasTexture;
      this.drawCut(t.getSourceImage() as HTMLCanvasElement, frostArt(this.host.type)[0]);
      t.refresh();
    }
  }

  /** Where the pie is now (local): its middle, radii; the plate's. */
  private frame(): AuraFrame {
    const s = this.host.s;
    const lift = sideFor(this.host.type.shape) * s;
    const calz = this.host.type.shape === 'calzone';
    const cy = -lift + (calz ? (CALZONE_CY + PIZZA_R * 0.3 - PIZZA_SIZE / 2) * TILT * s : 0);
    return { cx: 0, cy, rx: PIZZA_R * s * (calz ? 1 : 1), ry: PIZZA_R * TILT * s * (calz ? 0.75 : 1), prx: (PIZZA_R + 40) * s, pry: (PIZZA_R + 40) * TILT * s, calm: reduced(), basic: !peelsAnimated() };
  }

  /** Art space (top-down px) to local. */
  private toLocal(ax: number, ay: number): [number, number] {
    const s = this.host.s;
    return [(ax - PIZZA_SIZE / 2) * s, -sideFor(this.host.type.shape) * s + (ay - PIZZA_SIZE / 2) * TILT * s];
  }

  /** Is a local point over the face (kept clear)? */
  private onFace(x: number, y: number, pad = 0): boolean {
    const fs = this.host.faceS;
    const fy = this.host.faceY;
    return Math.abs(x) < 56 * fs + pad && y > fy - 26 * fs - pad && y < fy + 54 * fs + pad;
  }

  /** Lay the fixed pieces out for the pizza's size now (after a layout). */
  place(): void {
    const s = this.host.s;
    const f = this.frame();
    const lift = sideFor(this.host.type.shape) * s;
    const k = (PIZZA_SIZE * s) / 200;
    this.gloss?.img.setPosition(0, -lift).setScale(k, k * TILT);
    if (this.sweep) this.sweep.img.setPosition(0, -lift).setScale((PIZZA_SIZE * s) / 128, ((PIZZA_SIZE * s) / 128) * TILT);
    this.frost?.outer.setPosition(0, -lift).setScale(k, k * TILT);
    if (this.sq) this.glow?.setPosition(0, -4 * s).setScale((f.prx * 2.5) / 256, (f.pry * 2.9) / 256);
    else this.glow?.setPosition(0, -4 * s).setScale((f.prx * 3.3) / 256, (f.pry * 3.9) / 256);
    this.rimGlow?.setPosition(0, f.cy).setScale((f.rx * 2.3) / 256, (f.ry * 2.3) / 256);
  }

  /** Living: the bake, motion and its tier's layers this frame. */
  update(dt: number): void {
    if (this.destroyed) return;
    const h = this.host;
    const on = !h.dead && !aliveDev.off;
    this.under.setVisible(on);
    this.mid.setVisible(on);
    this.top.setVisible(on);
    this.aura?.setVisible(on);
    if (!this.sc.sys.settings.visible || aliveDev.off) return;
    this.t += dt;
    const f = this.frame();
    const calm = f.calm;
    const basic = f.basic;
    // a stale pie has gone cold: no steam, no bubbling; a frozen perk stills its own effect
    const warm = !h.stale;
    const idle = this.set.idle && !h.perkFrozen && !h.stale && !basic;
    const life = this.set.life * (calm ? 0.45 : 1) * (basic ? 0.6 : 1);
    if (on) {
      if (warm) this.living(dt, life, basic, f);
      this.glisten(dt, f, basic, calm);
      if (idle) this.idle(dt, f, calm);
      for (const o of this.orbit) o.img.setVisible(idle);
      if (this.frost) {
        // (kept to the rim: it creeps in and back as it breathes, never greying the pie)
        this.frost.outer.setVisible(idle).setAlpha(calm ? 0.7 : 0.6 + 0.25 * Math.sin(this.t * 0.42));
      }
      if (this.glow) this.glow.setVisible(!h.stale).setAlpha((h.perkFrozen ? 0.15 : calm || basic ? 0.4 : 0.36 + 0.1 * Math.sin(this.t * 1.7)) + 0.35 * this.flareT);
      if (this.rimGlow) this.rimGlow.setVisible(idle).setAlpha((calm ? 0.26 : 0.22 + 0.1 * Math.sin(this.t * 2.6 + 1)) + 0.4 * this.flareT);
      this.aura?.update(dt, f);
    }
    this.flareT = Math.max(0, this.flareT - dt * 1.6);
    this.stepHops(dt);
    this.stepParts(dt);
  }

  // ——— the basics ———

  private every(key: string, perSec: number, dt: number): number {
    const n = (this.acc[key] ?? crand()) + perSec * dt;
    const whole = Math.floor(n);
    this.acc[key] = n - whole;
    return whole;
  }

  private living(dt: number, life: number, basic: boolean, f: AuraFrame): void {
    const tr = this.tr;
    const s = this.host.s;
    // bubbles: blisters swell and pop on the cheese (or the sauce; a calzone's vents)
    if (tr.bubbles || tr.calzone) {
      const live = this.parts.filter((p) => p.bubble).length;
      for (let i = this.every('bub', (tr.calzone ? 1.4 : 2.6) * life, dt); i > 0 && live < (tr.calzone ? 3 : 6); i--) {
        const j = Math.floor(crand() * (this.bub.length / 2));
        const [x, y] = this.toLocal(this.bub[j * 2] + (crand() - 0.5) * 6, this.bub[j * 2 + 1] + (crand() - 0.5) * 6);
        if (this.onFace(x, y, 4) || !this.onSlice(this.bub[j * 2], this.bub[j * 2 + 1])) continue;
        const r = ((tr.calzone ? 10 : tr.bubbles === 'cheese' ? 12 : 9) + crand() * 9) * s;
        this.spawn(this.top, this.bubTex, x, y, { life: 0.9 + crand() * 1.3, s0: 0, s1: r / 20, bubble: true, sy: 0.8, fade: 'out' });
      }
    }
    // steam curling up off its back half (or a calzone's vents): it rises clear of the face
    if (tr.steam > 0) {
      for (let i = this.every('steam', tr.steam * 2.1 * life, dt); i > 0; i--) {
        let x: number;
        let y: number;
        if (tr.calzone) {
          const v = CALZONE_VENTS[Math.floor(crand() * CALZONE_VENTS.length)];
          [x, y] = this.toLocal(v[0], v[1]);
          y -= 8 * s;
        } else {
          x = (crand() - 0.5) * f.rx * 1.3;
          y = f.cy - f.ry * (0.3 + crand() * 0.55);
        }
        const k = tr.calzone ? 0.6 : 1;
        this.spawn(this.top, 'pza_steam', x, y, { vx: (crand() - 0.5) * 8, vy: -30 * s - crand() * 16, life: (1.9 + crand() * 0.8) * k, s0: 1 * s * k, s1: (2.6 + crand() * 0.8) * s * k, a: 0.36 + crand() * 0.12, fade: 'inout', grav: -10, drag: 0.4, sway: 9 * s });
      }
    }
    if (basic) return;
    // the fat on the cured meats sizzling: flashes, and a spit of oil now and then
    if (tr.oil > 0 && this.oil.length) {
      for (let i = this.every('siz', 4 * tr.oil * life, dt); i > 0; i--) {
        const j = Math.floor(crand() * (this.oil.length / 2));
        if (!this.onSlice(this.oil[j * 2], this.oil[j * 2 + 1])) continue;
        const [x, y] = this.toLocal(this.oil[j * 2] + (crand() - 0.5) * 10, this.oil[j * 2 + 1] + (crand() - 0.5) * 10);
        if (this.onFace(x, y)) continue;
        this.spawn(this.top, 'pza_glint', x, y, { life: 0.22 + crand() * 0.15, s0: 0.1, s1: (0.55 + crand() * 0.3) * s, a: 0.9, fade: 'inout', add: true, tint: 0xfff0c8 });
        if (crand() < 0.25) this.spawn(this.top, 'pza_mote', x, y, { vx: (crand() - 0.5) * 50 * s, vy: -(60 + crand() * 50) * s, life: 0.35, s0: 0.25 * s, s1: 0.12 * s, a: 0.8, grav: 420 * s, add: true, tint: 0xffe2a0 });
      }
    }
  }

  /** The light on it: its light map breathing, glints on its oil and gold, a light sweep (Rare and up). */
  private glisten(dt: number, _f: AuraFrame, basic: boolean, calm: boolean): void {
    const g = this.gloss;
    if (g) g.img.setAlpha(this.set.gloss * (calm || basic ? 1 : 0.85 + 0.25 * Math.sin(this.t * 0.7)) * (this.host.stale ? 0.4 : 1));
    if (basic) return;
    const pts = this.gold.length ? this.gold.concat(this.oil) : this.oil;
    if (pts.length)
      for (let i = this.every('gl', (this.gold.length ? 1.6 : 0.8) * this.set.life, dt); i > 0; i--) {
        const j = Math.floor(crand() * (pts.length / 2));
        if (!this.onSlice(pts[j * 2], pts[j * 2 + 1])) continue;
        const [x, y] = this.toLocal(pts[j * 2], pts[j * 2 + 1]);
        if (this.onFace(x, y)) continue;
        this.spawn(this.top, 'pza_glint', x, y, { life: 0.5 + crand() * 0.3, s0: 0.05, s1: (0.75 + crand() * 0.4) * this.host.s, a: 1, fade: 'inout', add: true, spin: 1.2 });
      }
    const sw = this.sweep;
    if (!sw || !g || calm) return;
    if (sw.u < 0) {
      if ((sw.next -= dt) <= 0 && !this.host.stale) sw.u = 0;
      sw.img.setVisible(false);
      return;
    }
    sw.u += dt / 1.2;
    if (sw.u >= 1) {
      sw.u = -1;
      sw.next = 6 + crand() * 5;
      sw.img.setVisible(false);
      return;
    }
    // the light map, cut to a soft band crossing it top left to bottom right
    const x = sw.x;
    const N = sw.c.width;
    x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, N, N);
    x.drawImage(g.c, 0, 0, N, N);
    x.globalCompositeOperation = 'destination-in';
    const b = (-1.3 + 2.6 * sw.u) * N * 0.5;
    const cx = N / 2 + Math.SQRT1_2 * b;
    const cy = N / 2 + Math.SQRT1_2 * b;
    const w = N * 0.2;
    const lg = x.createLinearGradient(cx - w, cy - w, cx + w, cy + w);
    lg.addColorStop(0, 'rgba(0,0,0,0)');
    lg.addColorStop(0.5, 'rgba(0,0,0,1)');
    lg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = lg;
    x.fillRect(0, 0, N, N);
    sw.tex.refresh();
    sw.img.setVisible(true).setAlpha(0.95 * Math.sin(Math.PI * sw.u));
  }

  // ——— Epic: its perk's own idle effect ———

  private idle(dt: number, f: AuraFrame, calm: boolean): void {
    const L = EL[this.el];
    const s = this.host.s;
    const k = calm ? 0.4 : 1;
    // orbiting motes, round the crust (behind the pie where they pass behind it)
    for (const o of this.orbit) {
      o.a += dt * o.speed * (calm ? 0.4 : 1);
      const x = Math.cos(o.a) * f.rx * o.r;
      const y = f.cy + Math.sin(o.a) * f.ry * o.r - o.h * 14 * s - Math.sin(this.t * 1.3 + o.ph) * 4 * s;
      const tw = 0.55 + 0.45 * Math.sin(this.t * 3 + o.ph);
      o.img.setPosition(x, y).setScale((this.el === 'ink' || this.el === 'ghost' ? 1.15 : 0.85) * s * (0.8 + 0.4 * tw)).setAlpha((this.el === 'ink' ? 0.7 : 0.65 + 0.35 * tw) * (Math.sin(o.a) > 0 ? 1 : 0.7));
      if (this.el === 'rainbow') o.img.setTint(Phaser.Display.Color.HSVToRGB((this.hue + o.a / (Math.PI * 2) + this.t * 0.1) % 1, 0.55, 1).color);
      else o.img.setTint(o.ph > 3 ? L.col2 : this.el === 'ink' ? L.col : this.col);
      if (this.el === 'ink' || this.el === 'ghost') o.img.setRotation(o.a + Math.PI / 2);
    }
    if (L.move === 'orbit' && this.el !== 'time') return;
    if (this.el === 'time') {
      // a tick of light round the crust every second
      if (this.every('tick', 1, dt) > 0) this.spawn(this.mid, this.rimTex, 0, f.cy, { life: 0.6, s0: (f.rx * 2.05) / 256, s1: (f.rx * 2.35) / 256, a: 0.35 * k, add: true, tint: this.col, sy: TILT * (f.ry / (f.rx * TILT)) });
      return;
    }
    for (let i = this.every('idle', L.rate * 1.5 * k, dt); i > 0; i--) {
      const a = crand() * Math.PI * 2;
      const x = Math.cos(a) * f.rx * (0.9 + crand() * 0.2);
      const y = f.cy + Math.sin(a) * f.ry * (0.9 + crand() * 0.2);
      const layer = Math.sin(a) < 0 ? this.top : this.mid;
      if (this.el === 'fire' || this.el === 'frostfire') this.spawn(layer, 'pza_ember', x, y, { vx: (crand() - 0.5) * 20 * s, vy: -(50 + crand() * 50) * s, life: 1 + crand() * 0.7, s0: (0.8 + crand() * 0.4) * s, s1: 0.15 * s, a: 1, grav: -20 * s, drag: 0.6, add: true, tint: crand() < 0.4 ? L.col2 : 0xff8a3a, sway: 6 * s });
      if (this.el === 'frost' || (this.el === 'frostfire' && crand() < 0.5)) {
        // a cold mist rolling off its front edge, and flakes glinting round it
        if (Math.sin(a) > 0.3) this.spawn(this.mid, 'pza_steam', x, y + 6 * s, { vx: (crand() - 0.5) * 10, vy: 10 * s, life: 1.6, s0: 0.7 * s, s1: 1.4 * s, a: 0.18, fade: 'inout', grav: 8 * s, drag: 0.6, tint: 0xdff2ff, sy: 0.45 });
        else this.spawn(layer, 'pza_flake', x, y - 6 * s, { vx: (crand() - 0.5) * 16 * s, vy: (crand() - 0.6) * 20 * s, life: 1 + crand() * 0.6, s0: 0.2 * s, s1: (0.55 + crand() * 0.3) * s, a: 0.9, fade: 'inout', spin: (crand() - 0.5) * 2, add: true });
      }
      if (this.el === 'life' || this.el === 'heal' || this.el === 'holy') this.spawn(layer, L.mote, x, y, { vx: (crand() - 0.5) * 24 * s, vy: -(26 + crand() * 22) * s, life: 1.6 + crand() * 0.8, s0: 0.4 * s, s1: (this.el === 'holy' ? 0.4 : 0.85) * s, a: this.el === 'holy' ? 0.85 : 0.95, fade: 'inout', grav: -6 * s, drag: 0.3, spin: this.el === 'life' ? (crand() - 0.5) * 2 : 0, add: L.add, tint: this.el === 'holy' ? this.col : undefined, sway: 10 * s });
    }
  }

  // ——— reactions ———

  /** Stomped (slices just taken): crumbs; Rare toppings hop; Epic its element bursts out; Legendary its signature. */
  stomp(worldX: number): void {
    if (this.destroyed || !this.sc.sys.settings.visible || aliveDev.off) return;
    const f = this.frame();
    const s = this.host.s;
    const calm = f.calm;
    const basic = f.basic;
    const n = calm ? 0.4 : basic ? 0.6 : 1;
    const lx = Phaser.Math.Clamp((worldX - this.host.x) / Math.max(0.01, this.host.root.scaleX), -f.rx * 0.6, f.rx * 0.6);
    // crumbs off the crust, flying up and out
    for (let i = 0; i < Math.round(9 * n); i++) {
      const a = -Math.PI / 2 + (crand() - 0.5) * Math.PI * 1.6;
      const v = (160 + crand() * 200) * s;
      const x = Math.cos(a) * f.rx * 0.95;
      const y = f.cy + Math.sin(a) * f.ry * 0.92;
      this.spawn(this.top, crand() < 0.6 ? 'crumb' : 'crumb2', x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 - 160 * s, life: 0.45 + crand() * 0.25, s0: (0.7 + crand() * 0.5) * s, s1: 0.6 * s, a: 1, grav: 900 * s, drag: 0.5, spin: (crand() - 0.5) * 12, fade: 'out' });
    }
    if (!this.host.stale && this.tr.steam > 0 && !basic)
      for (let i = 0; i < Math.round(3 * n); i++) this.spawn(this.top, 'pza_steam', lx + (crand() - 0.5) * f.rx * 0.8, f.cy - f.ry * 0.5, { vx: (crand() - 0.5) * 30, vy: -90 * s, life: 0.55, s0: 0.6 * s, s1: 1.2 * s, a: 0.35, fade: 'out', grav: -40, drag: 2 });
    if (basic) return;
    if (this.set.hop && !calm) this.startHop();
    if (this.set.burst && !this.host.perkFrozen && this.t - this.lastBurst > 0.25) {
      this.lastBurst = this.t;
      this.burst(lx, f, n, 1);
      audio.sfx(EL[this.el].sfx, { volume: 0.32, throttle: 260 });
    }
    if (this.set.signature) {
      this.flareT = 1;
      this.aura?.flare(1);
      SIGNATURES[this.host.type.id]?.stomp?.(this.host.x, this.host.surfaceY);
    }
  }

  /** The toppings hop, each its own height and moment, the cheese stretching after them. */
  private startHop(): void {
    const data = pizzaPaintData(this.host.type.id);
    if (!this.hops.length || !data) return;
    const al = this.host.alive;
    let any = false;
    const s = this.host.s;
    for (const h of this.hops) {
      const ok = al[sliceAt(this.host.type.shape, al.length, h.ax, h.ay)];
      // (pieces by the face stay put: one hopping would pass over it)
      const [rx, ry] = this.toLocal(h.ax, h.ay);
      const clear = !this.onFace(rx, ry, 34 * s) && !this.onFace(rx, ry - 60 * s, 34 * s);
      h.h = ok && clear ? 0.75 + crand() * 0.5 : 0;
      h.delay = 0.02 + crand() * 0.06;
      h.dur = 0.3 + crand() * 0.08;
      h.dx = (crand() - 0.5) * 8;
      h.spin = (crand() - 0.5) * 2.4;
      h.img.setVisible(ok);
      any ||= ok && h.h > 0;
    }
    if (!any) {
      // (nothing to hop: the pie stays whole, as drawn)
      if (this.hopT < 0) for (const h of this.hops) h.img.setVisible(false);
      return;
    }
    if (this.hopT < 0) this.host.setTop(holedTop(this.host.type, data.pie, this.set.bake));
    this.hopT = 0;
  }

  private stepHops(dt: number): void {
    if (this.hopT < 0) return;
    this.hopT += dt;
    const s = this.host.s;
    const g = this.strings!;
    g.clear();
    const stringy = this.tr.cheese >= 0.45;
    let busy = false;
    for (const h of this.hops) {
      if (!h.img.visible) continue;
      const t = this.hopT - h.delay;
      const z = arcs(t, [h.dur, 0.12], [h.h, h.h * 0.16]);
      if (t < h.dur + 0.12) busy = true;
      const [rx, ry] = this.toLocal(h.ax, h.ay);
      const x = rx + h.dx * z * s;
      const y = ry - 46 * z * s;
      // the cheese stretching after it, then snapping
      if (stringy && t > 0 && t < h.dur * 0.7) {
        const k = t / (h.dur * 0.7);
        const a = k < 0.75 ? 0.95 : 0.95 * (1 - (k - 0.75) / 0.25);
        for (const sd of [-1, 1]) {
          const x0 = rx + sd * 5 * s;
          const y0 = ry + 3 * s;
          const x1 = x + sd * 4 * s;
          const y1 = y + 6 * s;
          const mx = (x0 + x1) / 2 + sd * 3 * s;
          const my = (y0 + y1) / 2 + 8 * s * (1 - z);
          const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(x0, y0), new Phaser.Math.Vector2(mx, my), new Phaser.Math.Vector2(x1, y1));
          const pts = curve.getPoints(6);
          g.lineStyle(Math.max(1.2, 4.2 * s * (1 - z * 0.5)), 0xd69c34, a * 0.85);
          g.strokePoints(pts);
          g.lineStyle(Math.max(0.8, 2.2 * s * (1 - z * 0.5)), 0xffeca8, a);
          g.strokePoints(pts);
        }
      }
      const sc = (this.hops.length ? 1 : 1) * s * (1 + 0.3 * z);
      h.img.setPosition(x, y).setScale(sc, sc * (TILT + (1 - TILT) * Math.min(1, z * 1.6))).setRotation(h.spin * z);
    }
    if (!busy) {
      this.hopT = -1;
      g.clear();
      for (const h of this.hops) h.img.setVisible(false);
      this.host.setTop(null);
    }
  }

  /** Its element bursting out (stomped, Epic and up) or its named effect (its perk firing). */
  private burst(lx: number, f: AuraFrame, n: number, power: number): void {
    const s = this.host.s;
    const L = EL[this.el];
    const el = this.el;
    // a ring of its colour on the table round it
    this.spawn(this.mid, this.ringTex, 0, f.cy + f.ry * 0.1, { life: 0.5, s0: (f.rx * 1.6) / 256, s1: (f.rx * (2.6 + power * 0.6)) / 256, a: 0.7, add: true, tint: this.col, sy: TILT });
    if (el === 'frost' || el === 'frostfire') {
      // a frost crack across the plate, and shards of ice
      this.spawn(this.mid, 'pza_crack', lx * 0.5, f.cy + f.ry * 0.55, { life: 0.9, s0: (f.rx * 1.1) / 160, s1: (f.rx * 1.25) / 160, a: 0.9, add: true, tint: 0xbfe8ff, sy: TILT, fade: 'out' });
    }
    const count = Math.round(14 * n * power);
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (crand() - 0.5) * Math.PI * 1.5;
      const v = (140 + crand() * 220) * s * power;
      const x = lx + (crand() - 0.5) * f.rx * 0.4;
      const y = f.cy - f.ry * 0.2;
      const tint = crand() < 0.35 ? L.col2 : this.col;
      if (el === 'fire' || (el === 'frostfire' && i % 2)) this.spawn(this.top, crand() < 0.3 ? 'flame' : 'pza_ember', x, y, { vx: Math.cos(a) * v * 0.7, vy: Math.sin(a) * v - 40 * s, life: 0.6 + crand() * 0.4, s0: 0.7 * s, s1: 0.15 * s, a: 1, grav: -60 * s, drag: 1.4, add: true, tint: crand() < 0.5 ? 0xffc23a : 0xff6a1a });
      else if (el === 'frost' || el === 'frostfire') this.spawn(this.top, crand() < 0.5 ? 'shard' : 'pza_flake', x, y, { vx: Math.cos(a) * v * 0.8, vy: Math.sin(a) * v - 60 * s, life: 0.6 + crand() * 0.3, s0: 0.7 * s, s1: 0.4 * s, a: 1, grav: 700 * s, drag: 0.6, spin: (crand() - 0.5) * 10, tint: 0xd8f2ff, add: true });
      else if (el === 'ink') this.spawn(this.top, 'pza_ink', x, y, { vx: Math.cos(a) * v * 0.6, vy: Math.sin(a) * v * 0.6 - 30 * s, life: 0.7 + crand() * 0.3, s0: 0.6 * s, s1: 1.2 * s, a: 0.8, grav: 300 * s, drag: 1.2, tint: crand() < 0.5 ? L.col : L.col2 });
      else if (el === 'life' || el === 'heal') this.spawn(this.top, L.mote, x, y, { vx: Math.cos(a) * v * 0.6, vy: Math.sin(a) * v * 0.7 - 50 * s, life: 0.8 + crand() * 0.4, s0: 0.5 * s, s1: 0.9 * s, a: 1, grav: 160 * s, drag: 1, spin: (crand() - 0.5) * 6 });
      else if (el === 'gold') this.spawn(this.top, crand() < 0.4 ? 'coin' : 'pza_star', x, y, { vx: Math.cos(a) * v * 0.7, vy: Math.sin(a) * v - 60 * s, life: 0.7 + crand() * 0.3, s0: 0.45 * s, s1: 0.35 * s, a: 1, grav: 800 * s, drag: 0.5, spin: (crand() - 0.5) * 8 });
      else if (el === 'ghost') this.spawn(this.top, 'pza_wispy', x, y, { vx: Math.cos(a) * v * 0.5, vy: Math.sin(a) * v * 0.5 - 60 * s, life: 0.9, s0: 0.6 * s, s1: 1.3 * s, a: 0.7, grav: -40 * s, drag: 1.2, add: true, tint });
      else if (el === 'rainbow') this.spawn(this.top, crand() < 0.5 ? 'confetti' : 'pza_star', x, y, { vx: Math.cos(a) * v * 0.7, vy: Math.sin(a) * v - 60 * s, life: 0.8, s0: 0.7 * s, s1: 0.5 * s, a: 1, grav: 600 * s, drag: 0.6, spin: (crand() - 0.5) * 12, tint: Phaser.Display.Color.HSVToRGB(crand(), 0.6, 1).color });
      else this.spawn(this.top, el === 'time' || el === 'holy' ? 'pza_mote' : 'pza_star', x, y, { vx: Math.cos(a) * v * 0.7, vy: Math.sin(a) * v - 50 * s, life: 0.6 + crand() * 0.3, s0: 0.7 * s, s1: 0.2 * s, a: 1, grav: 200 * s, drag: 1.2, add: true, tint, spin: (crand() - 0.5) * 4 });
    }
  }

  /** Its perk fired: a pop of its colour; Rare a ring of light and a sound; Epic its named effect and a quip (unless the
   *  caller says its own quip); Legendary its signature. */
  fire(o: { quip?: boolean; text?: string } = {}): void {
    if (this.destroyed || this.host.dead || !this.sc.sys.settings.visible || aliveDev.off) return;
    if (this.t - this.lastPop < 0.5) return;
    this.lastPop = this.t;
    const f = this.frame();
    const s = this.host.s;
    const calm = f.calm;
    const basic = f.basic;
    // a small pop of its colour: a ring on the table and a few motes
    this.spawn(this.mid, this.ringTex, 0, f.cy, { life: 0.42, s0: (f.rx * 1.5) / 256, s1: (f.rx * 2.4) / 256, a: 0.85, add: true, tint: this.col, sy: TILT });
    if (!basic)
      for (let i = 0; i < (calm ? 3 : 7); i++) {
        const a = crand() * Math.PI * 2;
        this.spawn(this.mid, 'pza_mote', Math.cos(a) * f.rx * 1.02, f.cy + Math.sin(a) * f.ry * 1.02, { vx: Math.cos(a) * 60 * s, vy: Math.sin(a) * 30 * s - 30 * s, life: 0.5, s0: 0.7 * s, s1: 0.2 * s, a: 1, add: true, tint: this.col, drag: 1.5 });
      }
    if (!this.set.ring) return;
    // a ring of light, wider, and a soft flash under it, with a chime
    if (this.t - this.lastRing > 1.2) {
      this.lastRing = this.t;
      this.spawn(this.under, this.glowTex, 0, -6 * s, { life: 0.6, s0: (f.prx * 2.2) / 256, s1: (f.prx * 3) / 256, a: 0.55, add: true, tint: this.col, sy: (f.pry * 3) / (f.prx * 2.7), fade: 'out' });
      this.spawn(this.mid, this.rimTex, 0, f.cy, { life: 0.7, s0: (f.rx * 2.1) / 256, s1: (f.rx * 3.4) / 256, a: 0.9, add: true, tint: 0xffffff, sy: TILT });
      audio.sfx('sfx_smack_tail_glint', { volume: 0.42, throttle: 300 });
    }
    if (!this.set.named || basic) return;
    this.flareT = 1;
    this.burst(0, f, calm ? 0.4 : 1, 1.15);
    audio.sfx(EL[this.el].sfx, { volume: 0.4, throttle: 300 });
    if (o.quip !== false && this.t - this.lastQuip > 4) {
      this.lastQuip = this.t;
      const text = o.text ?? PERK_ELEMENT[this.host.type.perk]?.quip ?? EL[this.el].quip;
      aliveHooks.quip?.(this.host.x, this.host.surfaceY - 175, text, `#${(this.col | 0x404040).toString(16).padStart(6, '0')}`, 34, (crand() - 0.5) * 10);
    }
    if (this.set.signature) {
      this.aura?.flare(0.8);
      SIGNATURES[this.host.type.id]?.fire?.(this.host.x, this.host.surfaceY);
    }
  }

  /** Is an art-space point on a slice that's still there? */
  private onSlice(ax: number, ay: number): boolean {
    const al = this.host.alive;
    return !!al[sliceAt(this.host.type.shape, al.length, ax, ay)];
  }

  // ——— the image pool ———

  private spawn(
    layer: Phaser.GameObjects.Container,
    tex: string,
    x: number,
    y: number,
    o: { vx?: number; vy?: number; life: number; s0: number; s1: number; a?: number; grav?: number; drag?: number; spin?: number; fade?: 'out' | 'inout'; add?: boolean; tint?: number; sway?: number; bubble?: boolean; sy?: number },
  ): void {
    if (this.parts.length >= 90) return;
    const free = this.pool.get(layer);
    const img = free?.pop() ?? this.sc.add.image(0, 0, tex);
    if (img.parentContainer !== layer) layer.add(img);
    img.setTexture(tex).setVisible(true).setRotation(o.spin ? crand() * Math.PI * 2 : 0).setBlendMode(o.add ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
    if (o.tint !== undefined) img.setTint(o.tint);
    else img.clearTint();
    this.parts.push({ img, layer, x, y, vx: o.vx ?? 0, vy: o.vy ?? 0, t: 0, life: o.life, s0: o.s0, s1: o.s1, a: o.a ?? 1, grav: o.grav ?? 0, drag: o.drag ?? 0, spin: o.spin ?? 0, fade: o.fade ?? 'out', sway: o.sway ?? 0, bubble: o.bubble, sy: o.sy ?? 1 });
    this.stepPart(this.parts[this.parts.length - 1], 0);
  }

  private stepParts(dt: number): void {
    let w = 0;
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i];
      if (this.stepPart(p, dt)) this.parts[w++] = p;
      else {
        p.img.setVisible(false);
        let free = this.pool.get(p.layer);
        if (!free) this.pool.set(p.layer, (free = []));
        free.push(p.img);
      }
    }
    this.parts.length = w;
  }

  /** Move one; false when it's done. */
  private stepPart(p: Part, dt: number): boolean {
    p.t += dt;
    if (p.bubble) {
      // swelling, then popped: a ring that spreads and fades
      const popT = p.t - p.life;
      if (popT >= 0.32) return false;
      if (popT < 0) {
        const u = p.t / p.life;
        const k = 1 - (1 - u) * (1 - u);
        p.img.setPosition(p.x, p.y).setScale(p.s1 * k, p.s1 * k * p.sy).setAlpha(0.95);
      } else {
        if (p.img.texture.key !== 'pza_pop') p.img.setTexture('pza_pop').setTint(Phaser.Display.Color.HexStringToColor(this.tr.bubbleCol[0]).color);
        const k = popT / 0.32;
        p.img.setScale(p.s1 * (0.9 + 0.6 * k), p.s1 * (0.9 + 0.6 * k) * p.sy).setAlpha(0.6 * (1 - k));
      }
      return true;
    }
    if (p.t >= p.life) return false;
    const u = p.t / p.life;
    if (dt > 0) {
      p.vy += p.grav * dt;
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d;
      p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    const sc = p.s0 + (p.s1 - p.s0) * u;
    const a = p.fade === 'inout' ? p.a * Math.sin(Math.PI * u) : p.a * (1 - u * u);
    const sway = p.sway ? Math.sin(p.t * 2.4 + p.life * 7) * p.sway * u : 0;
    // (over the pie, nothing shows over its face)
    const hide = p.layer === this.top && this.onFace(p.x + sway, p.y, 8 * sc);
    p.img.setPosition(p.x + sway, p.y).setScale(sc, sc * p.sy).setAlpha(hide ? 0 : a);
    if (p.spin) p.img.rotation += p.spin * dt;
    return true;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.aura?.destroy();
    if (this.hopT >= 0) this.host.setTop(null);
    for (const c of [this.under, this.mid, this.top]) if (c.active) c.destroy();
    for (const k of [this.gloss?.key, this.sweep?.key, this.frost?.key]) if (k && this.sc.textures.exists(k)) this.sc.textures.remove(k);
  }
}

let uidN = 0;

/** Up and down in arcs (durations, heights): a bounce. */
function arcs(t: number, d: readonly number[], h: readonly number[]): number {
  if (t <= 0) return 0;
  let a = 0;
  for (let i = 0; i < d.length; i++) {
    if (t < a + d[i]) return h[i] * Math.sin((Math.PI * (t - a)) / d[i]);
    a += d[i];
  }
  return 0;
}

// ════════════════════════════ the test aura (until the legendaries' own) ════════════════════════════

/** A legendary's aura stand-in: a glow under the plate, a turning ring of light round it, shafts of light rising
 *  behind the pie, and motes circling and rising, all in its colour; it flares when stomped. */
export function testAura(c: AuraCtx): Aura {
  const sc = c.scene;
  const glow = sc.add.image(0, 0, c.square ? 'pza_glowSq' : 'glow').setTint(c.col).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.28);
  // (each ring turns inside a box squashed onto the table, so it turns in the table's plane)
  // (a square pie's rings are rounded squares, and breathe rather than turn)
  const ringKey = c.square ? 'pza_rimSq' : 'pza_auraRing';
  const ring = sc.add.image(0, 0, ringKey).setTint(c.col).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.4);
  const ring2 = sc.add.image(0, 0, ringKey).setTint(0xffffff).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.2);
  const box = sc.add.container(0, 0, [ring]);
  const box2 = sc.add.container(0, 0, [ring2]);
  const rays = Array.from({ length: 5 }, () => sc.add.image(0, 0, 'pza_ray').setTint(c.col).setBlendMode(Phaser.BlendModes.ADD).setOrigin(0.5, 1).setAlpha(0));
  const motes = Array.from({ length: 9 }, (_, i) => ({ img: sc.add.image(0, 0, 'pza_mote').setTint(i % 3 ? c.col : 0xffffff).setBlendMode(Phaser.BlendModes.ADD), a: (i / 9) * Math.PI * 2, rise: crand(), sp: 0.4 + crand() * 0.3 }));
  c.under.add([glow, ...rays, box]);
  c.mid.add([box2, ...motes.map((m) => m.img)]);
  let t = crand() * 10;
  let flare = 0;
  let spin = 0;
  return {
    update(dt, f) {
      const calm = f.calm || f.basic;
      t += dt;
      spin += dt * (calm ? 0 : 0.35);
      flare = Math.max(0, flare - dt * 1.4);
      const br = calm ? 0 : Math.sin(t * 1.6);
      // the glow keeps to the plate's footprint, so it lights the table round it without flooding the next pizza
      glow.setPosition(0, -4).setScale((f.prx * 2.2 * (1 + 0.08 * flare)) / 256, (f.pry * 2.5 * (1 + 0.08 * flare)) / 256).setAlpha(0.26 + 0.04 * br + 0.25 * flare);
      // the ring lies on the table round the plate, turning
      box.setPosition(0, -4).setScale((f.prx * 2.12) / 256, (f.pry * 2.12) / 256);
      ring.setRotation(c.square ? 0 : spin).setAlpha(0.32 + 0.08 * br + 0.3 * flare);
      box2.setPosition(0, f.cy).setScale((f.rx * 2.25) / 256, (f.ry * 2.25) / 256);
      ring2.setRotation(c.square ? 0 : -spin * 1.6).setAlpha(0.16 + 0.06 * br + 0.35 * flare);
      rays.forEach((r, i) => {
        const a = -0.55 + (i / (rays.length - 1)) * 1.1 + Math.sin(t * 0.4 + i) * 0.06;
        // (short: they end below the freshness bar)
        r.setPosition(Math.sin(a) * f.rx * 0.6, f.cy).setRotation(a).setScale((f.rx * 0.5) / 48, (f.ry * (0.95 + 0.1 * Math.sin(t * 0.9 + i * 1.7))) / 256).setAlpha((calm ? 0.12 : 0.1 + 0.05 * Math.sin(t * 1.1 + i * 2)) + 0.2 * flare);
      });
      for (const m of motes) {
        m.a += dt * m.sp * (calm ? 0.3 : 1);
        m.rise = (m.rise + dt * (calm ? 0.05 : 0.25)) % 1;
        const r = 1.12 - m.rise * 0.2;
        m.img
          .setPosition(Math.cos(m.a) * f.rx * r, f.cy + Math.sin(m.a) * f.ry * r - m.rise * f.ry * 1.2)
          .setScale(0.9 + 0.35 * Math.sin(t * 3 + m.a))
          .setAlpha(Math.sin(Math.PI * m.rise) * (Math.sin(m.a) > 0 ? 1 : 0.6));
      }
    },
    flare(k) {
      flare = Math.max(flare, k);
    },
    setVisible(on) {
      for (const o of [glow, box, box2, ...rays, ...motes.map((m) => m.img)]) o.setVisible(on);
    },
    destroy() {},
  };
}
