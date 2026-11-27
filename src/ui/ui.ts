// DOM overlay UI: HUD, menus and modal screens. Rendered over the Phaser canvas and scaled with
// container query units (1em = 1% of the stage width) so it stays crisp at any size.

import { FEET, FOOT_BY_ID, TRAIT_INFO, howToFor, tellFor, type FootType } from '../data/feet';
import { crand } from '../systems/cosmeticRandom';
import { META, MILESTONE_BY_PIZZA } from '../data/meta';
import { PIZZAS, PIZZA_BY_ID, type PizzaRoute, type PizzaType } from '../data/pizzas';
import { awardMilestones, milestoneProgress } from '../game/Run';
import { AUTO_TOPPING_NOTE, RARITY_COLOR, UPGRADES, UPGRADE_BY_ID, isAutoTopping, kindOf, type Rarity } from '../data/upgrades';
import { glyph, slamPrompt } from '../systems/gamepad';
import type { RunSummary, ShopActions, ShopPizza, ShopState, SlotSymbol, YourTopping } from './shopTypes';
import { INTROS, freshBar, freshForever, pizzaThumb } from './bits';
import { tierAttrs, tierFrame, tierGem, tierLabel } from './pizzaTier';
import { boughtCard, dealCard } from './pizzaDeal';
import { pickByTier, type PizzaRarity } from '../data/pizzaRarity';
import { statsBody } from './statsTab';
import type { BuildView } from '../game/buildStats';
import { phaseCardPanel } from './phaseCard';
import type { ResolvedPhaseCard } from '../game/phaseCards';
import { footArtAsync, footArtReady, footPortraitURL, pizzaPortraitURL, textureURL } from '../game/assets';
import { audio } from '../systems/audio';
import { previewSmack } from '../game/smacks';
import { bestFor, metaRefundValue, persist, resetEverything, resetMeta, resetProgress, save, unlockPizza, updateSettings, type Settings } from '../systems/save';
import { applyPreset, currentPreset } from '../systems/graphics';
import { HEATS, HEAT_BY_ID, type HeatId } from '../data/difficulty';
import { ACT_COUNT, JOURNEY_WAVES, STAGES, actLabel, actName, actOf } from '../data/stages';
import { BACKDROPS } from '../art/backdrops';
import { applyA11y } from './a11y';
import { abilityFor, abilityKindLabel, describeAbility } from '../game/abilities';
import { animateLookImg, hasAnimatedLook, smackLookImg, stopLookOverlays } from '../art/animatedLooks';
import { GOD_PEEL, PEELS, PEEL_BY_ID, buyPeel, checkPeelAchievements, equipPeel, equippedPeel, hasPeel, peelThumbAsync, peelThumbReady, peelThumbURL, wearSkin, wornSkin, type PeelDef, type PeelGroup } from '../game/peels';
import { HERO_SUBS } from '../content/heroPeels';
import './gods.css';

type Attrs = Record<string, string | number | boolean | undefined>;

/** Golden Crusts for the next lineup shuffle after `n` this time round: 10, 20, 35, 55, 80… */
export function shuffleCrusts(n: number): number {
  return 10 + (5 * n * (n + 3)) / 2;
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: (Node | string | null | undefined | false)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === 'class') e.className = String(v);
    else if (k === 'html') e.innerHTML = String(v);
    else if (k === 'style') e.setAttribute('style', String(v));
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) e.append(c);
  return e;
}

const ICONS = {
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1.5"/><rect x="14" y="4" width="5" height="16" rx="1.5"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

/** "Made by TrongatesLegacy" credit (title screens), opens the website in a new tab. */
function madeBy(): HTMLElement {
  const a = h('a', { class: 'made-by', href: 'https://trongateslegacy.com', target: '_blank', rel: 'noopener', 'aria-label': 'Made by TrongatesLegacy (opens trongateslegacy.com in a new tab)' }, 'Made by ', h('b', {}, 'TrongatesLegacy'), h('span', { class: 'ext', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>' }));
  // the splash starts the game on any click: keep the link's click to itself
  for (const ev of ['pointerdown', 'pointerup', 'click'] as const) a.addEventListener(ev, (e) => e.stopPropagation());
  return a;
}

/** The close cross for window corners. */
const X_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/></svg>';

/** A chunky cog for the shop's pause-menu button (centred in its box, unlike the ⚙ glyph). */
/** The empty counter: a chalk SOLD OUT board hanging over an empty plate with a few crumbs (the game's plate). */
/** A topping card's tier frame (the pizza tiers' cousin, in the topping's own rarity colour): its ring, and for the
 *  rarer ones a little seasoning on the move (herb flecks drifting up on an Epic, gold flakes falling on a Legendary). */
const toppingFrame = (rarity: string): HTMLElement => {
  const fx = h('span', { class: 'tfx', 'aria-hidden': 'true' });
  const n = rarity === 'legendary' ? 6 : rarity === 'epic' ? 5 : 0;
  for (let i = 0; i < n; i++) fx.append(h('i', { class: `seas s${i}` }));
  return fx;
};

/** A counter tab's label: its full wording, and a short one for a phone's narrow cards (style.css swaps them). */
const tabText = (full: string, short: string): HTMLElement[] => [h('span', { class: 'tl' }, full), h('span', { class: 'ts' }, short)];

const SOLD_OUT_SVG = `<svg viewBox="0 0 220 150" xmlns="http://www.w3.org/2000/svg">
<g class="ce-sign"><g stroke="#5a3a1e" stroke-width="2.2" stroke-linecap="round"><path d="M62 4 L80 34"/><path d="M158 4 L140 34"/></g>
<circle cx="62" cy="4" r="3.2" fill="#8a5a2e"/><circle cx="158" cy="4" r="3.2" fill="#8a5a2e"/>
<g transform="rotate(-3 110 52)">
<rect x="52" y="30" width="116" height="46" rx="7" fill="#8a5a2e" stroke="#2a1810" stroke-width="2.6"/>
<rect x="58" y="36" width="104" height="34" rx="4" fill="#2f3d35"/>
<path d="M64 42 l24 1 M120 64 l34 -1" stroke="rgba(255,255,255,0.08)" stroke-width="5" stroke-linecap="round"/>
<text x="110" y="61" text-anchor="middle" font-family="Lilita One, Fredoka, sans-serif" font-size="21" letter-spacing="1.5" fill="#f4f1e6">SOLD OUT</text>
<path d="M70 66 q40 4 80 -1" stroke="#ff9a7a" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.85"/>
</g></g>
<ellipse cx="116" cy="134" rx="80" ry="13" fill="rgba(0,0,0,0.22)"/>
<ellipse cx="110" cy="128" rx="78" ry="19" fill="#b9bec8"/>
<ellipse cx="110" cy="124" rx="78" ry="19" fill="#f4f6f9" stroke="#7d8592" stroke-width="2"/>
<ellipse cx="110" cy="124" rx="73" ry="17" fill="none" stroke="rgba(59,111,214,0.35)" stroke-width="2"/>
<ellipse cx="110" cy="124" rx="60" ry="13" fill="none" stroke="#aab0ba" stroke-width="2.5" opacity="0.7"/>
<path d="M60 118 a50 11 0 0 1 40 -6" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>
<g fill="#d39646" stroke="#8a5a20" stroke-width="0.8"><path d="M92 124 l7 -3 l3 5 l-8 2z"/><circle cx="121" cy="127" r="2.2"/><circle cx="132" cy="121" r="1.6"/><circle cx="104" cy="130" r="1.4"/></g>
<circle cx="113" cy="121" r="2" fill="#c8402a"/>
<path d="M140 127 q5 -6 10 -1 q-5 4 -10 1z" fill="#3f8a3a"/>
</svg>`;

const GEAR_SVG =
  '<svg class="gear" viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor">' +
  Array.from({ length: 8 }, (_, i) => `<rect x="10" y="1.2" width="4" height="5" rx="1" transform="rotate(${i * 45} 12 12)"/>`).join('') +
  '</g><circle cx="12" cy="12" r="5.3" fill="none" stroke="currentColor" stroke-width="4.6"/></svg>';

export const COIN_SVG =
  '<svg class="coin" viewBox="0 0 24 24"><circle cx="12" cy="13" r="10" fill="#9a6a00"/><circle cx="12" cy="12" r="10" fill="#ffcf3a" stroke="#7a4a00" stroke-width="1.5"/><circle cx="12" cy="12" r="7" fill="none" stroke="#a86a00" stroke-width="1"/><path d="M12 17l-3.6-7.4q3.6-2 7.2 0z" fill="#c47a00"/><ellipse cx="8.5" cy="7.5" rx="2.5" ry="1.2" fill="#fff" opacity=".7" transform="rotate(-30 8.5 7.5)"/></svg>';

const CRUST_SVG =
  '<svg class="coin" viewBox="0 0 24 24"><path d="M3 9c3-5 15-5 18 0l-9 13z" fill="#ffd23f" stroke="#2a1810" stroke-width="1.6" stroke-linejoin="round"/><path d="M3 9c3-5 15-5 18 0" fill="none" stroke="#d9963f" stroke-width="3.2" stroke-linecap="round"/><circle cx="10" cy="12" r="1.6" fill="#e5402a"/><circle cx="14" cy="15" r="1.4" fill="#e5402a"/></svg>';

export function btn(label: string, cls: string, onClick: () => void, attrs: Attrs = {}): HTMLButtonElement {
  const b = h('button', { class: `btn ${cls}`, type: 'button', ...attrs });
  b.innerHTML = label;
  b.addEventListener('pointerenter', () => audio.sfx('sfx_hover', { throttle: 60 }));
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (b.disabled) return;
    audio.sfx('sfx_click');
    onClick();
  });
  return b;
}

export const fmt = (n: number) => Math.floor(n).toLocaleString('en-US');

/** Chance each lineup deal puts a Rare Find in one slot. */
const RARE_FIND_CHANCE = 1 / 20;
/** Dev: the next lineup deal shows this pizza as a Rare Find (any locked pizza, for testing). */
let forcedRare: string | null = null;
/** Re-deal the open new-run screen (so a forced Rare Find shows straight away). */
let redealLineup: (() => void) | null = null;

/** Dev: force a Rare Find on the next lineup deal (and re-deal the open new-run screen). */
export function forceRareFind(id: string): void {
  forcedRare = id;
  redealLineup?.();
}

/** A run time to the millisecond: m:ss.mmm, or h:mm:ss.mmm past an hour (the clock itself keeps microseconds). */
export function fmtTime(secs: number): string {
  const ms = Math.max(0, Math.floor(secs * 1000));
  const s = Math.floor(ms / 1000);
  const hrs = Math.floor(s / 3600);
  const mm = Math.floor(s / 60) % 60;
  const ss = String(s % 60).padStart(2, '0');
  const mmm = String(ms % 1000).padStart(3, '0');
  return hrs ? `${hrs}:${String(mm).padStart(2, '0')}:${ss}.${mmm}` : `${mm}:${ss}.${mmm}`;
}

/** Enter/Space on a focusable tile acts like a click (keyboard and gamepad). */
function activatable<T extends HTMLElement>(el: T): T {
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      el.click();
    }
  });
  return el;
}

/** Re-render without losing focus: refocus the element with the same data-fk afterwards. */
function keepFocus(root: HTMLElement, render: () => void): void {
  const fk = (document.activeElement as HTMLElement | null)?.dataset?.fk;
  render();
  if (fk) root.querySelector<HTMLElement>(`[data-fk="${CSS.escape(fk)}"]`)?.focus();
}

/**
 * An enhanced perk: the whole line in gold, with each changed number struck through next to its
 * new one (e.g. ~~+10%~~ +15% smack damage). Words that change are shown in their new form.
 */
function perkDiff(base: string, now: string): HTMLElement {
  const a = base.split(' ');
  const b = now.split(' ');
  // longest common run of words, so only what changed is marked
  const L = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = h('span', { class: 'perk-gold' });
  const word = (el: Node | string) => {
    if (out.childNodes.length) out.append(' ');
    out.append(el);
  };
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      word(a[i++]);
      j++;
    } else if (i < a.length && (j >= b.length || L[i + 1][j] >= L[i][j + 1])) {
      // a dropped number stays visible, struck through; dropped words just go
      if (/\d/.test(a[i])) word(h('s', {}, a[i]));
      i++;
    } else word(h('b', {}, b[j++]));
  }
  return out;
}

/** A peel's ability as a line for the locker: kind pill, name and what it does. */
function abilityLine(peelId: string): HTMLElement {
  const [chip, name, desc] = abilityBits(peelId);
  return h('div', { class: 'abl' }, chip, name, h('span', {}, desc));
}

/** A peel's ability as parts: its kind pill, its name and what it does (for layouts that split them up). */
function abilityBits(peelId: string): [HTMLElement, HTMLElement, string] {
  if (peelId === 'classic') return [h('span', { class: 'chip' }, 'ACTIVE'), h('b', { class: 'abl-name' }, 'Peel Slam'), `${slamPrompt()} when the meter is full: smack every foot at once.`];
  const a = abilityFor(peelId);
  return [h('span', { class: `chip ${abilityKindLabel(a).toLowerCase()}` }, abilityKindLabel(a)), h('b', { class: 'abl-name' }, a.name), describeAbility(a)];
}

export interface CounterOffer {
  id: string;
  name: string;
  perk: string;
  cost: number;
  trial: boolean;
}

/** The slam button's furnace: a fire with a wavy top (two layers drifting opposite ways), sparks over it, a glowing
 *  bed of embers and a small flame at its base. Its level is --m (0..1), set by Hud.setMomentum. */
let furnaces = 0;
function furnaceEl(): HTMLElement {
  const el = h('div', { class: 'furnace', 'aria-hidden': 'true' });
  // (its gradients' ids are unique, so a second furnace, a copy of the button, can't borrow this one's)
  const id = `fz${++furnaces}`;
  // a wave two tiles wide (each tile 100 wide), drifting by one tile: the top never runs out
  const wave = (amp: number, y: number) => {
    let d = `M0 ${y}`;
    for (let i = 0; i < 4; i++) d += ` q 12.5 ${-amp} 25 0 t 25 0`;
    return `${d} V140 H0 Z`;
  };
  el.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none">
<defs>
<linearGradient id="${id}-fire" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset="0.22" stop-color="#ffb12e"/><stop offset="0.55" stop-color="#f2591b"/><stop offset="1" stop-color="#9c1a0c"/></linearGradient>
<linearGradient id="${id}-back" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a2a"/><stop offset="1" stop-color="#7a120a"/></linearGradient>
<radialGradient id="${id}-bed" cx="0.5" cy="1" r="0.75"><stop offset="0" stop-color="#ff6a1f" stop-opacity="0.95"/><stop offset="0.5" stop-color="#c2260f" stop-opacity="0.55"/><stop offset="1" stop-color="#5a0d06" stop-opacity="0"/></radialGradient>
</defs>
<rect class="fz-bed" x="0" y="40" width="100" height="60" fill="url(#${id}-bed)"/>
<g class="fz-level">
<g class="fz-back"><path d="${wave(14, 10)}" fill="url(#${id}-back)"/></g>
<g class="fz-front"><path d="${wave(10, 16)}" fill="url(#${id}-fire)"/></g>
<g class="fz-sparks"><circle cx="24" cy="6" r="1.6"/><circle cx="58" cy="2" r="1.3"/><circle cx="78" cy="8" r="1.5"/><circle cx="40" cy="12" r="1.1"/></g>
</g>
<g class="fz-embers"><circle cx="22" cy="93" r="2"/><circle cx="38" cy="96" r="1.6"/><circle cx="63" cy="95" r="1.8"/><circle cx="80" cy="92" r="1.5"/></g>
</svg><i class="fz-icon"><svg viewBox="0 0 20 24"><path d="M10 1c1.5 4.2 6.5 6.6 6.5 12.4A6.5 6.5 0 0 1 3.5 13.4c0-2.6 1.3-4.4 2.8-5.6-.1 2 .7 3.4 2 4.1C8 8.6 8.6 4.4 10 1z"/><path class="in" d="M10 11.5c.9 1.9 3.1 3 3.1 5.4a3.1 3.1 0 0 1-6.2 0c0-1.2.6-2 1.3-2.6 0 .9.4 1.5 1 1.8-.2-1.6.1-3.4.8-4.6z"/></svg></i>`;
  return el;
}

/** The Pizza Slots machine's symbols and what three of each pays. */
const SLOT_ICON: Record<SlotSymbol, string> = { tips: '🪙', slices: '🍕', slam: '⚡', topping: '🧀', epic: '💎', crust: '🥖', chef: '👨‍🍳' };
function slotsRow(sl: NonNullable<ShopState['slots']>, pull: (pay: 'tips' | 'crusts') => void, take: (c: 'add' | 'sell') => void): HTMLElement {
  const syms = Object.keys(SLOT_ICON) as SlotSymbol[];
  const rnd = () => syms[Math.floor(crand() * syms.length)];
  const res = sl.result;
  const spinning = !!res?.fresh;
  const won = !!res?.win && !res.fresh;
  // each reel shows three symbols; only the middle row (the payline) counts
  const reels = [0, 1, 2].map((i) => {
    const mid = res?.reels[i] ?? syms[(i * 3 + 1) % syms.length];
    const above = res ? rnd() : syms[(i * 3) % syms.length];
    const below = res ? rnd() : syms[(i * 3 + 2) % syms.length];
    // spinning: a long strip that lands with `mid` on the payline, each reel a beat after the last
    const strip = spinning ? [...Array.from({ length: 12 + i * 5 }, rnd), above, mid, below] : [above, mid, below];
    return h(
      'div',
      { class: 'reel' },
      h('div', { class: `sl-strip${spinning ? ' spin' : ''}`, style: `--n:${strip.length - 3};--d:${0.8 + i * 0.38}s` }, ...strip.map((x, k) => h('span', { class: !spinning && k === 1 ? 'mid' : '' }, SLOT_ICON[x]))),
    );
  });
  const machine = h(
    'div',
    { class: 'machine', 'aria-hidden': 'true' },
    h('div', { class: 'marquee' }, h('span', {}, 'PIZZA SLOTS')),
    h('div', { class: 'window' }, ...reels, h('i', { class: 'payline' }), h('i', { class: 'pl-l' }), h('i', { class: 'pl-r' }), h('i', { class: 'glass' })),
  );
  // pay with tips or with Golden Crusts; once pulled, one wide button says how it went
  let b: HTMLElement;
  const offer = res && !res.fresh ? res.offer : undefined;
  if (offer && !offer.taken) {
    // a topping won: keep it or sell it
    b = h('div', { class: 'pulls' }, btn('ADD IT', 'green small pull', () => take('add'), { 'aria-label': `Add ${offer.name} to your toppings` }), btn(`SELL · ${fmt(offer.sell)}`, 'yellow small pull', () => take('sell'), { 'aria-label': `Sell ${offer.name} for ${offer.sell} tips` }));
  } else if (sl.used) {
    // pulled: the result as a badge, not a greyed-out button (a win looked switched off)
    const word = !res ? 'PULLED' : res.fresh ? 'SPINNING…' : res.win ? 'WINNER!' : 'NO LUCK';
    b = h('div', { class: `pull-result${res && !res.fresh ? (res.win ? ' win' : ' lose') : ''}`, role: 'status', 'aria-label': `Pizza Slots: ${word.toLowerCase()}` }, word);
  } else {
    const tips = btn(`PULL · ${fmt(sl.cost)}`, `${sl.can ? 'green' : ''} small pull`, () => pull('tips'), { 'aria-label': `Pull Pizza Slots for ${sl.cost} tips` });
    tips.disabled = !sl.can;
    const crusts = btn(`PULL · ${CRUST_SVG.replace('class="coin"', 'class="coin-ico"')} ${sl.crustCost}`, `${sl.canCrusts ? 'yellow' : ''} small pull`, () => pull('crusts'), { 'aria-label': `Pull Pizza Slots for ${sl.crustCost} Golden Crusts` });
    crusts.disabled = !sl.canCrusts;
    b = h('div', { class: 'pulls' }, tips, crusts);
  }
  const headline = res && !res.fresh ? (res.win ? res.prize : 'So close! Not this time') : 'Three of a kind on the line wins';
  const sub = sl.used ? 'One pull a shop' : 'One pull a shop · tap ? for the prizes';
  // the prize list sits behind a [?] button
  const info = h(
    'div',
    { class: 'slots-info', role: 'dialog', 'aria-label': 'Pizza Slots prizes' },
    h('b', {}, 'THREE OF A KIND ON THE LINE WINS'),
    ...sl.pays.map(([k, t]) => h('div', { class: 'sp' }, h('span', { class: 'sp-ic' }, `${SLOT_ICON[k]}${SLOT_ICON[k]}${SLOT_ICON[k]}`), h('span', {}, t))),
    h('small', {}, 'Only the middle row counts · this machine’s prizes change each shop · a prize that would do nothing pays you back'),
  );
  const q = h('button', { class: 'slots-q', type: 'button', 'aria-label': 'What can Pizza Slots win?', 'aria-expanded': 'false' }, '?');
  const row = h(
    'div',
    { class: `offer slots${won ? ' won' : ''}${spinning ? ' spinning' : ''}${sl.used && !spinning && !won ? ' spent' : ''}` },
    machine,
    h('div', { class: 'side' }, h('div', { class: 'side-head' }, h('span', { class: 'tag' }, 'FEELING LUCKY?'), q), h('b', { class: 'headline' }, headline), h('span', { class: 'sub' }, sub), b),
    info,
  );
  q.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = row.classList.toggle('show-info');
    q.setAttribute('aria-expanded', String(open));
    // a tap anywhere else closes it
    if (open) setTimeout(() => document.addEventListener('click', () => (row.classList.remove('show-info'), q.setAttribute('aria-expanded', 'false')), { once: true }), 0);
  });
  return row;
}

class Hud {
  root: HTMLElement;
  private score = h('div', { class: 'score' }, '0');
  private wave = h('div', { class: 'wave' });
  private clock = h('div', { class: 'runclock', 'aria-label': 'Run time' });
  private lastSec = -1;
  private coins = h('span', {}, '0');
  private coinPill = h('div', { class: 'pill' });
  private combo = h('div', { class: 'combo' });
  private comboLabel = h('div', { class: 'label' });
  private comboMult = h('div', { class: 'mult' });
  private comboTimer = h('i');
  private boss = h('div', { class: 'bossbar' });
  private bossName = h('div', { class: 'name' });
  private bossHp = h('div', { class: 'hp' });
  private bossTrail = h('div', { class: 'trail' });
  private bossPhase = h('span', { class: 'phase' });
  private bossNotches = h('div', { class: 'notches' });
  /** A second boss of the fight (a second Zombie Loafer): a slim bar under the main one. */
  private boss2 = h('div', { class: 'boss2' });
  private boss2Name = h('span', { class: 'n' });
  private boss2Phase = h('span', { class: 'phase' });
  private boss2Hp = h('div', { class: 'hp' });
  private boss2Trail = h('div', { class: 'trail' });
  private bossMove = h('div', { class: 'move' });
  private newFootEl: HTMLElement | null = null;
  /** When the current centre banner disappears (performance.now() ms). */
  private bannerUntil = 0;
  /** Milliseconds until the centre banner on screen goes (0: none). */
  bannerLeft(): number {
    return Math.max(0, this.bannerUntil - performance.now());
  }
  private slam = h('div', { class: 'slam', role: 'button', 'aria-label': 'Peel Slam' });
  /** Momentum, inside the slam button: a fire that rises while the player keeps smacking and sinks to embers when
   *  they stop (src/game/momentum.ts). No ring and no numbers: the slam's own charge is the yellow ring outside. */
  private furnace = furnaceEl();
  private lastMomentum = -1;
  private owned = h('div', { class: 'owned' });
  private toasts = h('div', { class: 'toasts' });
  private tutorialEl: HTMLElement | null = null;
  private fpsEl = h('div', { class: 'fps' });
  private muteBtn: HTMLButtonElement;
  private lastScore = -1;
  private lastCoins = -1;
  onPause: () => void = () => {};
  onSlam: () => void = () => {};

  constructor() {
    window.addEventListener('resize', () => this.fitBossMove());
    this.coinPill.innerHTML = COIN_SVG;
    this.coinPill.append(this.coins);
    this.combo.append(this.comboLabel, this.comboMult, h('div', { class: 'timer' }, this.comboTimer));
    this.boss2.append(h('div', { class: 'b2name' }, this.boss2Name, this.boss2Phase), h('div', { class: 'track' }, this.boss2Trail, this.boss2Hp));
    this.boss.append(h('div', { class: 'bossname' }, this.bossName, this.bossPhase), h('div', { class: 'track' }, this.bossTrail, this.bossHp, this.bossNotches), this.boss2, this.bossMove);
    this.slam.innerHTML = '<span>PEEL<br>SLAM<small class="kb">SPACE</small><small class="pd" data-glyph="X">X</small></span>';
    this.slam.prepend(this.furnace);
    this.slam.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.onSlam();
    });
    const pause = btn(ICONS.pause, 'cream icon-btn interactive', () => this.onPause(), { 'aria-label': 'Pause' });
    this.muteBtn = btn(save.settings.muted ? ICONS.mute : ICONS.sound, 'cream icon-btn interactive', () => {
      updateSettings({ muted: !save.settings.muted });
      this.syncMute();
    }, { 'aria-label': 'Mute' });
    this.root = h(
      'div',
      { class: 'hud' },
      h('div', { class: 'tl' }, this.score, this.wave, this.clock),
      this.combo,
      this.boss,
      h('div', { class: 'tr' }, this.coinPill),
      this.toasts,
      // pause and mute live in the bottom strip, which feet never reach
      h('div', { class: 'bl' }, this.muteBtn, pause, this.owned),
      this.slam,
      this.fpsEl,
    );
    this.fpsEl.style.display = save.settings.showFps ? '' : 'none';
    this.clock.style.display = save.settings.showTimer ? '' : 'none';
  }

  syncMute(): void {
    this.muteBtn.innerHTML = save.settings.muted ? ICONS.mute : ICONS.sound;
    this.fpsEl.style.display = save.settings.showFps ? '' : 'none';
    this.clock.style.display = save.settings.showTimer ? '' : 'none';
  }

  /** The run clock under the wave: m:ss, or h:mm:ss past an hour. */
  setTime(secs: number): void {
    const n = Math.floor(secs * 1000);
    if (n === this.lastSec) return;
    this.lastSec = n;
    this.clock.textContent = fmtTime(secs);
  }

  setScore(n: number): void {
    if (n === this.lastScore) return;
    this.lastScore = n;
    this.score.textContent = fmt(n);
    this.score.classList.remove('bump');
    void this.score.offsetWidth;
    this.score.classList.add('bump');
  }

  setWave(n: number, loc: string): void {
    this.wave.innerHTML = `WAVE ${n} <small>· ${loc}</small>`;
  }

  setCoins(n: number): void {
    if (n === this.lastCoins) return;
    this.lastCoins = n;
    this.coins.textContent = fmt(n);
    this.coinPill.classList.remove('bump');
    void this.coinPill.offsetWidth;
    this.coinPill.classList.add('bump');
  }

  setCombo(combo: number, mult: number, frac: number): void {
    const on = combo >= 3;
    this.combo.classList.toggle('on', on);
    this.combo.classList.toggle('hot', mult >= 2);
    if (!on) return;
    this.comboLabel.innerHTML = `COMBO <b>${combo}</b>`;
    this.comboMult.textContent = `x${mult.toFixed(2).replace(/\.?0+$/, '')} SCORE`;
    this.comboTimer.style.width = `${Math.max(0, frac) * 100}%`;
  }

  setBoss(name: string | null, frac = 1, phases = 1, phase = 1): void {
    const wasOn = this.boss.classList.contains('on');
    this.boss.classList.toggle('on', !!name);
    // the combo sits in one row above the boss bar, so its score pill doesn't cover the boss's name
    this.combo.classList.toggle('beside-boss', !!name);
    if (!name) {
      this.setBossMove(null);
      this.setBoss2(null);
      return;
    }
    this.boss.dataset.phase = String(phase);
    if (this.bossName.textContent !== name || this.bossNotches.childElementCount !== Math.max(0, phases - 1)) {
      this.bossNotches.replaceChildren();
      for (let i = 1; i < phases; i++) this.bossNotches.append(h('i', { style: `left:${(1 - i / phases) * 100}%` }));
    }
    this.bossName.textContent = name;
    this.bossPhase.textContent = phases > 1 ? `PHASE ${phase} / ${phases}` : '';
    const w = `${Math.max(0, frac) * 100}%`;
    this.bossHp.style.width = w;
    this.bossTrail.style.width = w;
    if (!wasOn) requestAnimationFrame(() => this.fitBossMove());
  }

  /** The second boss's slim bar under the main one (null hides it). */
  setBoss2(name: string | null, frac = 1, phases = 1, phase = 1): void {
    this.boss2.classList.toggle('on', !!name);
    if (!name) return;
    this.boss2.dataset.phase = String(phase);
    this.boss2Name.textContent = name;
    this.boss2Phase.textContent = phases > 1 ? `PHASE ${phase} / ${phases}` : '';
    const w = `${Math.max(0, frac) * 100}%`;
    this.boss2Hp.style.width = w;
    this.boss2Trail.style.width = w;
  }

  /** The slam button: the Peel Slam, or the peel ability that replaces it this run. */
  setSlamLabel(name: string | null, kind: string | null): void {
    if (!name) {
      this.slam.innerHTML = '<span>PEEL<br>SLAM<small class="kb">SPACE</small><small class="pd" data-glyph="X">X</small></span>';
      this.slam.prepend(this.furnace);
      this.slam.classList.remove('ability', 'passive');
      this.slam.setAttribute('aria-label', 'Peel Slam');
      return;
    }
    const passive = kind !== 'ACTIVE';
    // one word per line, like PEEL / SLAM; long words shrink to fit the circle
    const words = name.toUpperCase().split(/\s+/);
    const longest = Math.max(...words.map((w) => w.length));
    const size = Math.min(1, 5 / longest, 2.4 / words.length);
    this.slam.innerHTML = `<span><b class="an" style="font-size:${size.toFixed(2)}em">${words.join('<br>')}</b>${passive ? `<small class="pk">${kind}</small>` : '<small class="kb">SPACE</small><small class="pd" data-glyph="X">X</small>'}</span>`;
    this.slam.prepend(this.furnace);
    this.slam.classList.add('ability');
    this.slam.classList.toggle('passive', passive);
    this.slam.setAttribute('aria-label', name);
  }

  setSuper(frac: number): void {
    this.slam.style.setProperty('--p', String(Math.min(1, frac)));
    this.slam.classList.toggle('ready', frac >= 1);
  }

  /** Momentum (0 cold .. 1 hot): the furnace's fire level (only touched when it moves visibly). */
  setMomentum(m: number): void {
    const v = Math.round(Math.max(0, Math.min(1, m)) * 100) / 100;
    if (v === this.lastMomentum) return;
    this.lastMomentum = v;
    this.furnace.style.setProperty('--m', String(v));
    this.furnace.classList.toggle('cold', v < 0.2);
  }

  setOwned(owned: Record<string, number>): void {
    this.owned.replaceChildren(
      ...Object.entries(owned).map(([id, lvl]) => {
        const u = UPGRADE_BY_ID[id];
        const e = h('div', { class: 'u', title: `${u.name}: ${u.desc(1)}`, style: `--rc:${RARITY_COLOR[u.rarity]}` }, u.icon);
        if (lvl > 1) e.append(h('b', {}, String(lvl)));
        return e;
      }),
    );
  }

  /** The tips counter fades while a foot passes behind it. */
  setCoinFade(on: boolean): void {
    this.coinPill.classList.toggle('faded', on);
  }

  /** The NEW FOOT card fades while a foot is coming down through its corner. */
  /** The boss bar (and its move line) fades while the peel works up near it, so it never hides a fight.
   *  x, y: the peel in page pixels. */
  setBossFade(x: number, y: number): void {
    if (!this.boss.classList.contains('on')) return;
    const r = this.boss.getBoundingClientRect();
    const m = 70;
    const near = x > r.left - m && x < r.right + m && y > r.top - m && y < r.bottom + m;
    // it stays faded a moment after the peel leaves, so darting in and out doesn't make it flicker
    const now = performance.now();
    if (near) this.bossFadeUntil = now + 1400;
    this.boss.classList.toggle('faded', now < this.bossFadeUntil);
  }
  private bossFadeUntil = 0;

  setNewFootFade(on: boolean): void {
    // the whole notification stack fades while a foot passes behind it
    this.toasts.classList.toggle('faded', on);
  }

  /** NEW FOOT card on first sighting: name, abilities and how to beat it. */
  /** Returns how long (ms) until the card actually shows. */
  newFoot(img: string, f: FootType, label: string): number {
    this.newFootEl?.remove();
    const chips = h('div', { class: 'nf-traits' }, ...f.traits.filter((t) => t !== 'tiny').slice(0, 3).map((t) => h('span', { class: 'chip' }, TRAIT_INFO[t])));
    const el = h(
      'div',
      { class: 'newfoot panel' },
      h('span', { class: 'nf-tag' }, label),
      h('div', { class: 'nf-row' }, h('img', { src: img, alt: '' }), h('div', {}, h('b', {}, f.name), chips)),
      howToFor(f) ? h('div', { class: 'nf-how' }, h('b', {}, 'How to beat it: '), howToFor(f)!) : null,
      tellFor(f) ? h('div', { class: 'nf-tell' }, h('b', {}, 'Watch for: '), tellFor(f)!) : null,
    );
    this.newFootEl = el;
    // it waits for a centre banner (WAVE N · New: …) to finish, so the two never overlap
    const wait = Math.max(0, this.bannerUntil - performance.now());
    setTimeout(() => {
      if (this.newFootEl !== el) return;
      // the new-foot card joins the one notification stack (bottom left), at its foot
      this.toasts.prepend(el);
      setTimeout(() => {
        el.classList.add('leaving');
        setTimeout(() => el.remove(), 300);
      }, 5200);
    }, wait);
    return wait;
  }

  setFps(n: number): void {
    if (save.settings.showFps) this.fpsEl.textContent = `${Math.round(n)} FPS`;
  }

  banner(big: string, small = '', kind: '' | 'boss' | 'loc' | 'clear' | 'phase' = '', desc?: string, ms = 2300): void {
    for (const old of this.root.querySelectorAll('.banner')) old.remove();
    // a description line ("what it does · what to do") splits at the dot into two lines
    const descEl = desc
      ? h('div', { class: 'desc' }, ...desc.split(' · ').map((part, i) => h('span', { class: i ? 'answer' : 'does' }, part)))
      : null;
    const b = h('div', { class: `banner ${kind}${desc ? ' explained' : ''}` }, h('div', { class: 'big' }, big), small ? h('div', { class: 'small' }, small) : null, descEl);
    b.style.animationDuration = `${ms - 100}ms`;
    this.bannerUntil = performance.now() + ms;
    this.root.append(b);
    // long titles shrink to fit the screen instead of running off it (with a little room for the outline,
    // which draws outside the measured width), and again once the fonts are in: measured in a fallback
    // font, "PERSIAN WAR BAND!" ran to the edge of a phone
    const fit = () => {
      const descPad = descEl ? parseFloat(getComputedStyle(descEl).paddingLeft) * 2 + parseFloat(getComputedStyle(descEl).borderLeftWidth) * 2 : 0;
      for (const el of b.querySelectorAll<HTMLElement>('.big, .small, .desc span')) {
        el.style.fontSize = '';
        const room = (b.clientWidth - (descEl?.contains(el) ? descPad : 0)) * 0.96;
        if (el.scrollWidth > room) el.style.fontSize = `${(parseFloat(getComputedStyle(el).fontSize) * room) / el.scrollWidth}px`;
      }
    };
    fit();
    if (document.fonts.status !== 'loaded') document.fonts.ready.then(() => b.isConnected && fit());
    setTimeout(() => b.remove(), ms);
  }

  /** The boss's current move, under its health bar: name, then what to do about it. */
  setBossMove(name: string | null, info = ''): void {
    const was = this.bossMoveName;
    this.bossMoveName = name;
    if (!name) {
      this.bossMove.replaceChildren();
      return;
    }
    const answer = (info.split(' · ')[1] ?? info).trim();
    const text = h('span', {}, answer.charAt(0).toUpperCase() + answer.slice(1));
    this.bossMove.replaceChildren(h('b', {}, name), text);
    // a new move (a phase change) pulses, so the eye goes to it
    if (name !== was) {
      this.bossMove.classList.remove('pulse');
      void this.bossMove.offsetWidth;
      this.bossMove.classList.add('pulse');
    }
    requestAnimationFrame(() => this.fitBossMove());
    if (document.fonts.status !== 'loaded') document.fonts.ready.then(() => this.fitBossMove());
  }
  private bossMoveName: string | null = null;

  /** A long answer shrinks to the boss bar's width instead of running under the HUD on either side. */
  private fitBossMove(): void {
    const text = this.bossMove.querySelector<HTMLElement>('span');
    const name = this.bossMove.querySelector<HTMLElement>('b');
    const room = this.boss.clientWidth * 1.04;
    if (!text || !name || room <= 0) return;
    text.style.fontSize = '';
    // (a centred flex row spills both ways, so measure its parts rather than its scroll width)
    const over = name.offsetWidth + parseFloat(getComputedStyle(this.bossMove).columnGap || '0') + text.offsetWidth - room;
    if (over > 0 && text.offsetWidth > 0) text.style.fontSize = `${(Math.max(0.6, (text.offsetWidth - over) / text.offsetWidth) * parseFloat(getComputedStyle(text).fontSize)).toFixed(1)}px`;
  }

  private toastQueue: HTMLElement[] = [];

  /** Toasts stack two at a time; more wait their turn so the column never runs into the centre banner. */
  toast(img: string | null, title: string, text: string): void {
    const t = h('div', { class: 'toast panel' }, img ? h('img', { src: img, alt: '' }) : null, h('div', {}, h('b', {}, title), text));
    this.toastQueue.push(t);
    this.pumpToasts();
  }

  private pumpToasts(): void {
    while (this.toastQueue.length && this.toasts.querySelectorAll('.toast').length < 2) {
      const t = this.toastQueue.shift()!;
      this.toasts.append(t);
      setTimeout(() => {
        t.remove();
        this.pumpToasts();
      }, 4100);
    }
  }

  tutorial(show: boolean): void {
    if (show && !this.tutorialEl) {
      this.tutorialEl = h('div', { class: 'tutorial' }, 'SMACK THE FEET!', h('small', {}, 'Click or tap them before they stomp the pizza'));
      this.root.append(this.tutorialEl);
    } else if (!show && this.tutorialEl) {
      this.tutorialEl.remove();
      this.tutorialEl = null;
    }
  }

  /** Centre of the coin counter in game-world coordinates (1920x1080). */
  coinTarget(): { x: number; y: number } {
    const stage = document.getElementById('stage')!.getBoundingClientRect();
    const r = this.coinPill.getBoundingClientRect();
    if (!r.width) return { x: 1640, y: 50 };
    return { x: ((r.left + r.height * 0.6 - stage.left) / stage.width) * 1920, y: ((r.top + r.height / 2 - stage.top) / stage.height) * 1080 };
  }
}

class UI {
  root!: HTMLElement;
  hud = new Hud();
  private layer!: HTMLElement;
  private stack: HTMLElement[] = [];
  private cleanups = new WeakMap<HTMLElement, () => void>();

  /** Run fn when this screen closes (however it closes). */
  onClose(screen: HTMLElement, fn: () => void): void {
    this.cleanups.set(screen, fn);
  }

  init(): void {
    this.root = document.getElementById('ui')!;
    this.layer = h('div', { class: 'layer' });
    this.root.append(this.layer);
  }

  setPlaying(on: boolean): void {
    document.getElementById('stage')!.classList.toggle('playing', on);
  }

  showHud(on: boolean): void {
    if (on && !this.hud.root.isConnected) this.root.prepend(this.hud.root);
    if (!on) this.hud.root.remove();
  }

  /** Open a window on top (public for the topping windows in pickWindows.ts). */
  open(content: HTMLElement, dim = true): HTMLElement {
    // a window that a Back / Cancel / Done button dismisses also gets an X in its top-right corner
    const back = content.classList.contains('panel') ? content.querySelector<HTMLButtonElement>('[data-pad="back"]:not([data-no-x])') : null;
    if (back) {
      const x = h('button', { class: 'x-close', type: 'button', 'aria-label': 'Close', title: 'Close', html: X_SVG }) as HTMLButtonElement;
      x.addEventListener('click', (e) => {
        e.stopPropagation();
        back.click();
      });
      content.append(x);
    }
    const s = h('div', { class: `screen${dim ? ' dim' : ''}` }, content);
    s.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.layer.append(s);
    this.stack.push(s);
    return s;
  }

  close(s?: HTMLElement): void {
    const el = s ?? this.stack[this.stack.length - 1];
    if (!el) return;
    this.stack = this.stack.filter((x) => x !== el);
    this.cleanups.get(el)?.();
    this.cleanups.delete(el);
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 200);
  }

  /** Close every screen (except `keep`, e.g. the shop under the pause menu). */
  closeAll(keep?: HTMLElement | null): void {
    for (const s of [...this.stack]) if (s !== keep) this.close(s);
  }

  /** Is this screen the one on top (nothing open over it)? */
  isTop(s: HTMLElement | null | undefined): boolean {
    return !!s && this.stack[this.stack.length - 1] === s;
  }

  get modalOpen(): boolean {
    return this.stack.length > 0;
  }

  // ——— Loading & splash ———
  loading(): { set: (p: number, label: string) => void; done: () => void } {
    const fill = h('div', { class: 'fill' });
    const label = h('div', { class: 'label' }, 'Preheating the oven…');
    const wrap = h('div', { class: 'loading' }, logo(), h('div', { class: 'bar' }, fill), label);
    const s = this.open(wrap, false);
    return {
      set: (p, l) => {
        fill.style.width = `${Math.round(p * 100)}%`;
        label.textContent = l;
      },
      done: () => this.close(s),
    };
  }

  splash(onStart: () => void): void {
    const s = this.open(
      h('div', { class: 'menu' }, logo(), h('div', { class: 'tagline' }, 'Stop the feet. Save the pizza.'), h('div', { class: 'splash-hint' }, 'Click to open the pizzeria')),
      false,
    );
    s.append(madeBy());
    s.style.cursor = 'pointer';
    const go = () => {
      window.removeEventListener('keydown', go);
      this.close(s);
      onStart();
    };
    s.addEventListener('pointerup', go, { once: true });
    window.addEventListener('keydown', go, { once: true });
  }

  // ——— Main menu ———
  menu(h_: { play: () => void; resume: (() => void) | null; pizzeria: () => void; pedia: () => void; locker: () => void; settings: () => void; credits: () => void }): HTMLElement {
    const seen = save.seenFeet.length;
    const best = bestFor(save.heat);
    const stats = h(
      'div',
      { class: 'menu-stats' },
      h('span', { html: `Best <b>${fmt(best.score)}</b>` }),
      h('span', { html: `Wave <b>${best.wave}</b> <small>${HEAT_BY_ID[save.heat].name}</small>`, title: best.wave ? `Best wave on ${HEAT_BY_ID[save.heat].name}: ${actLabel(actOf(best.wave))}` : '' }),
      h('span', { html: `Crusts <b>${fmt(save.crusts)}</b>` }),
    );
    stats.classList.add('corner');
    // beat wave 100: the Pizza Legend title, in a gold frame
    if (save.legend) {
      stats.classList.add('legend');
      stats.prepend(h('span', { class: 'legend-title', title: 'You beat the Sole Proprietor Unbound at wave 100' }, 'PIZZA LEGEND'));
    }
    const r = save.run;
    const cont = r && h_.resume
      ? h(
          'div',
          { class: 'continue panel' },
          h('div', { class: 'cont-text' }, h('span', { class: 'cont-tag' }, 'RUN IN PROGRESS'), h('b', {}, `Wave ${r.wave} · ${HEAT_BY_ID[r.heat].name} · ${r.actPending ? `${actName(actOf(r.wave))} complete` : actLabel(actOf(r.wave + 1))}`), h('span', {}, `${fmt(r.score)} points · ${r.pizzas.filter((p) => !p.dead).length} pizzas · saved ${r.actPending ? 'at the end of the act' : 'at the shop'}`)),
          btn('CONTINUE', 'green big', h_.resume, { 'data-pad-default': '' }),
        )
      : null;
    const content = h(
      'div',
      { class: 'menu main' },
      logo(),
      h('div', { class: 'tagline' }, 'Stop the feet. Save the pizza.'),
      cont,
      btn(r ? 'NEW RUN' : 'PLAY', cont ? '' : 'big', h_.play, cont ? {} : { 'data-pad-default': '' }),
      h(
        'div',
        { class: 'menu-buttons' },
        btn(`PIZZERIA${save.pizzasNew.length || save.toppingsNew.length || PIZZAS.some((p) => p.route === 'pizzeria' && !save.unlockedPizzas.includes(p.id) && p.cost <= save.crusts) ? ' <span class="badge">NEW</span>' : ''}`, 'yellow', h_.pizzeria),
        btn(`PIZZAPEDIA <small style="font-size:.7em">${seen}/${FEET.length}</small>`, 'green', h_.pedia),
        btn(`PEELS${save.peelsNew.length ? ' <span class="badge">NEW</span>' : ''}`, 'yellow', h_.locker),
        btn('SETTINGS', 'cream', h_.settings),
        btn('CREDITS', 'cream', h_.credits),
      ),
    );
    const s = this.open(content, false);
    s.append(stats, madeBy());
    this.godReveal();
    return s;
  }

  /** The God Peel's first unlock: light floods in, the halo descends, a choir sting, and it's equipped.
   * Plays once, at the next calm screen (the title or the locker); `force` replays it (dev). */
  godReveal(after?: () => void, force = false): void {
    if (!force && save.goals.godReveal !== 1) return;
    save.goals.godReveal = 2;
    equipPeel(GOD_PEEL);
    persist();
    audio.sfx('sfx_godreveal', { volume: 1 });
    audio.duck(0.3, 300);
    let s: HTMLElement;
    const done = () => {
      audio.duck(1, 800);
      this.close(s);
      after?.();
    };
    const panel = h(
      'div',
      { class: 'god-reveal' },
      h('i', { class: 'gr-light' }),
      h('i', { class: 'gr-rays' }),
      h('div', { class: 'gr-stage' }, h('i', { class: 'gr-halo' }), h('img', { class: 'gr-peel', src: peelThumbURL(GOD_PEEL, 360), alt: '' })),
      h('div', { class: 'gr-kicker' }, 'EVERY PEEL IS YOURS'),
      h('div', { class: 'gr-title' }, 'PEEL OF THE PIZZA GODS'),
      h('div', { class: 'gr-sub' }, 'Divine Feast, and the Pantheon at your side. It’s equipped.'),
      btn('PRAISE BE', 'yellow big', done, { 'data-pad': 'back', 'data-pad-default': '', 'data-no-x': '' }),
    );
    s = this.open(panel);
  }

  /** One-time welcome for players coming from the old version. */
  welcome(o: { keep: () => void; fresh: () => void }): HTMLElement {
    const news: [string, string][] = [
      ['Five heat levels', 'Mild to Inferno. Your bests move to Regular.'],
      ['Toppings now cost tips', 'Buy as many as you can afford between waves.'],
      ['Bosses fight in phases', 'Each one changes up at 66% and 33% health.'],
      ['Mini-bosses and wave events', 'Flyers and chests worth smacking.'],
      ['Pizzas go stale', 'Reheat them before they run out, or lose them.'],
      [`A ${JOURNEY_WAVES}-wave journey`, `${ACT_COUNT} acts, ${STAGES.length * 2} bosses, an ending, then endless.`],
      ['Controller support', 'Plug in and play, menus included.'],
      ['Saves mid-run', 'Close the tab and continue from the shop.'],
    ];
    let s: HTMLElement;
    let armed = false;
    const freshBtn = btn('FRESH START', 'cream', () => {
      if (!armed) {
        armed = true;
        freshBtn.innerHTML = 'TAP AGAIN TO WIPE';
        freshBtn.classList.remove('cream');
        return;
      }
      this.close(s);
      o.fresh();
    });
    const panel = h(
      'div',
      { class: 'panel modal welcome' },
      h('span', { class: 'intro-tag' }, "WHAT'S NEW"),
      h('div', { class: 'title' }, 'FEETZA HAS A NEW MENU'),
      h('div', { class: 'subtitle' }, 'Your progress is safe. Here is what changed:'),
      h('div', { class: 'news' }, ...news.map(([t, d]) => h('div', { class: 'news-item' }, h('b', {}, t), h('span', {}, d)))),
      h('div', { class: 'callout good' }, welcomeKeep()),
      h('div', { class: 'row' }, freshBtn, btn('KEEP MY PROGRESS', 'green', () => {
        this.close(s);
        o.keep();
      }, { 'data-pad-default': '' })),
      h('div', { class: 'hint' }, 'Fresh start wipes progress but keeps settings. Old best scores stay as an Old Version record.'),
    );
    s = this.open(panel);
    return s;
  }

  // ——— Pre-run setup: heat, act, your peel and the lineup ———
  /** shuffle returns a new lineup; it's swapped in place (re-opening the screen made the backdrop flicker). */
  lineup(ids: string[], shuffle: () => string[], onStart: (heat: HeatId, endless: boolean, ids: string[]) => void, onBack: () => void): HTMLElement {
    let cur = ids;
    let heat: HeatId = save.heat;
    // run length: end at the journey's end (JOURNEY_WAVES), or endless (remembered)
    let endless = save.endless;
    // Endless+ (Act 10): unlocked by beating wave 100
    let plus = save.endlessPlus && save.endlessPlusPick && endless;
    const unlocked = (hd: (typeof HEATS)[number]) => !hd.unlockAfter || save.act1Cleared.includes(hd.unlockAfter);
    const heatRow = h('div', { class: 'heats', 'data-pad-section': '' });
    const actRow = h('div', { class: 'acts', 'data-pad-section': '' });
    const startBtn = btn('', 'green big', () => {
      save.heat = heat;
      save.endless = endless;
      save.endlessPlusPick = plus;
      persist();
      redealLineup = null;
      // starting a run puts the lineup shuffle back to its first price
      save.shuffles = 0;
      save.rareTrial = rare && !rare.bought && !save.unlockedPizzas.includes(rare.id) ? rare.id : null;
      persist();
      onStart(heat, endless, startIds());
    });
    const render = () => {
      heatRow.replaceChildren(
        ...HEATS.map((hd) => {
          const ok = unlocked(hd);
          const b = h(
            'button',
            { class: `heat${hd.id === heat ? ' on' : ''}${ok ? '' : ' locked'}`, type: 'button', 'aria-pressed': hd.id === heat ? 'true' : 'false' },
            h('span', { class: 'chilis', html: '🌶️'.repeat(hd.chilis) }),
            h('b', {}, hd.name),
            h('span', {}, hd.desc),
            h('small', {}, ok ? `Crusts ${hd.crusts}×${hd.id === 'regular' ? ' · default' : ''}` : `Beat wave 30 on ${HEAT_BY_ID[hd.unlockAfter!].name}`),
          ) as HTMLButtonElement;
          b.disabled = !ok;
          b.addEventListener('click', () => {
            if (!ok) return;
            audio.sfx('sfx_click');
            heat = hd.id;
            render();
          });
          return b;
        }),
      );
      const mk = (on: boolean, title: string, desc: string, val: boolean, isPlus = false) => {
        const b = h('button', { class: `act${on ? ' on' : ''}${isPlus ? ' plus' : ''}`, type: 'button', 'aria-pressed': on ? 'true' : 'false' }, h('b', {}, title), h('span', {}, desc)) as HTMLButtonElement;
        b.addEventListener('click', () => {
          audio.sfx('sfx_click');
          endless = val;
          plus = isPlus;
          render();
        });
        return b;
      };
      actRow.replaceChildren(
        mk(!endless, `End at wave ${JOURNEY_WAVES}`, `${ACT_COUNT} acts, ${STAGES.length * 2} bosses. Bank at any act's end`, false),
        mk(endless && !plus, 'Endless', `Past wave ${JOURNEY_WAVES} the journey starts again, harder`, true),
        ...(save.endlessPlus ? [mk(endless && plus, 'Endless+', `From wave ${JOURNEY_WAVES + 1} every place, boss and foot is shuffled`, true, true)] : []),
      );
      startBtn.innerHTML = `START · ${HEAT_BY_ID[heat].name.toUpperCase()}`;
    };
    render();
    // your peel, as two boxes: the peel you play with (its ability) and the look you wear over it
    const peelCard = h('div', { class: 'peelboxes', 'data-pad-section': '' });
    const renderPeel = () => {
      const d = equippedPeel();
      const worn = wornSkin();
      const look = worn ?? d;
      const pic = (pd: PeelDef) => h('div', { class: `pk-img${pd.shiny ? ' shiny' : ''}` }, h('img', { src: peelThumbURL(pd.id, 200), alt: '' }));
      const reset = worn
        ? Object.assign(h('button', { class: 'linkish', type: 'button', 'data-fk': 'pk:look' }, 'match my peel'), {
            onclick: () => {
              audio.sfx('sfx_click');
              wearSkin(null);
              keepFocus(peelCard, renderPeel);
            },
          })
        : null;
      peelCard.replaceChildren(
        h(
          'div',
          { class: `peelbox${d.id === GOD_PEEL ? ' god' : ''}` },
          pic(d),
          h(
            'div',
            { class: 'pk-body' },
            h('div', { class: 'pk-head' }, h('span', { class: 'pk-kind' }, 'ABILITY'), btn('CHANGE', 'cream small', () => this.peelPicker(renderPeel, 'ability'), { 'data-fk': 'pk:ability' })),
            h('b', { class: 'pk-name' }, d.name),
            abilityLine(d.id),
          ),
        ),
        h(
          'div',
          { class: `peelbox look${worn ? '' : ' matching'}` },
          pic(look),
          h(
            'div',
            { class: 'pk-body' },
            h('div', { class: 'pk-head' }, h('span', { class: 'pk-kind' }, 'LOOK'), btn('CHANGE', 'cream small', () => this.peelPicker(renderPeel, 'look'), { 'data-fk': 'pk:lookpick' })),
            h('b', { class: 'pk-name' }, look.name),
            h('span', { class: 'pk-desc' }, worn ? 'Worn over your peel: looks only, no ability. ' : 'Matches your peel. Wear any unlocked peel’s look instead.', reset),
          ),
        ),
      );
    };
    renderPeel();
    const lineupRow = h('div', { class: 'lineup2' });
    // a Rare Find: now and then (1 in 20 deals) a locked rare pizza takes a slot, to buy with crusts
    let rare: { id: string; slot: number; was: string; bought: boolean } | null = null;
    const deal = () => {
      rare = null;
      const forced = forcedRare && PIZZA_BY_ID[forcedRare] && !save.unlockedPizzas.includes(forcedRare) ? forcedRare : null;
      forcedRare = null;
      const pool = PIZZAS.filter((p) => p.route === 'rare' && !save.unlockedPizzas.includes(p.id));
      // (by rarity, as the counter deals: the tier first, then a pizza of it)
      const id = forced ?? (pool.length && Math.random() < RARE_FIND_CHANCE ? pickByTier(pool, (p) => p.rarity)?.id ?? null : null);
      if (!id || !cur.length) return;
      const slot = Math.floor(Math.random() * cur.length);
      rare = { id, slot, was: cur[slot], bought: false };
      if (!save.rareSeen.includes(id)) {
        save.rareSeen.push(id);
        persist();
      }
    };
    const renderLineup = () =>
      lineupRow.replaceChildren(
        ...cur.map((id, i) => {
          const r = rare && rare.slot === i ? rare : null;
          if (r) {
            const p = PIZZA_BY_ID[r.id];
            const buy = btn(r.bought ? 'YOURS' : `KEEP ${CRUST_SVG.replace('class="coin"', 'class="coin-ico"')} ${fmt(p.cost)}`, r.bought ? 'cream small' : 'yellow small', () => {
              if (r.bought || save.crusts < p.cost) return;
              save.crusts -= p.cost;
              unlockPizza(p.id);
              r.bought = true;
              audio.sfx('sfx_levelup');
              renderLineup();
            });
            buy.disabled = r.bought || save.crusts < p.cost;
            const tier = tierAttrs(p.rarity);
            return h(
              'div',
              { class: `lu rare ${tier.cls}${r.bought ? ' bought' : ''}`, style: tier.style },
              ...tierFrame(p.rarity, false),
              h('span', { class: 'tag new' }, r.bought ? 'YOURS' : 'FREE TRIAL'),
              h('img', { src: pizzaPortraitURL(p.id), alt: p.name }),
              h('div', {}, h('span', { class: 'rf' }, r.bought ? 'RARE FIND' : 'RARE FIND · TRY IT', ' ', tierLabel(p.rarity)), h('b', {}, p.name), h('span', { title: r.bought ? p.perkText : `${p.perkText} · plays this run for free; keep it now or when the run ends (gone if you shuffle)` }, p.perkText), buy),
            );
          }
          const p = PIZZA_BY_ID[id];
          const tier = tierAttrs(p.rarity);
          return h('div', { class: `lu ${tier.cls}`, style: tier.style }, ...tierFrame(p.rarity, false), h('img', { src: pizzaPortraitURL(id), alt: p.name }), h('div', {}, tierLabel(p.rarity), h('b', {}, p.name), h('span', {}, p.perkText)));
        }),
      );
    // the lineup that actually starts: a Rare Find plays this run whether it's bought or not (unbought, it's a free trial,
    // offered to keep when the run ends)
    const startIds = () => cur.map((id, i) => (rare && rare.slot === i ? rare.id : id));
    deal();
    if (rare) cur = cur.map((id, i) => (i === rare!.slot ? rare!.id : id));
    renderLineup();
    redealLineup = () => {
      cur = cur.map((id, i) => (rare && rare.slot === i && !rare.bought ? rare.was : id));
      deal();
      if (rare) cur = cur.map((id, i) => (i === rare!.slot ? rare!.id : id));
      renderLineup();
    };
    // shuffling the lineup costs Golden Crusts, more each time, back to the first price when a run starts
    const shuffleCost = () => shuffleCrusts(save.shuffles);
    const shuffleBtn = btn('', 'yellow small', () => {
      const cost = shuffleCost();
      if (save.crusts < cost) return;
      save.crusts -= cost;
      save.shuffles++;
      persist();
      // a bought Rare Find is unlocked already; an unbought one is gone
      cur = shuffle();
      deal();
      if (rare) cur = cur.map((id, i) => (i === rare!.slot ? rare!.id : id));
      renderLineup();
      renderShuffle();
    }, { 'data-pad': 'y' });
    const renderShuffle = () => {
      const cost = shuffleCost();
      shuffleBtn.innerHTML = `SHUFFLE · ${CRUST_SVG.replace('class="coin"', 'class="coin-ico"')} ${fmt(cost)}`;
      shuffleBtn.disabled = save.crusts < cost;
    };
    renderShuffle();
    const panel = h(
      'div',
      { class: 'panel modal wide prerun' },
      h('div', { class: 'title' }, 'NEW RUN'),
      h('div', { class: 'section-title' }, 'HEAT'),
      heatRow,
      h('div', { class: 'prerun-mid' }, h('div', {}, h('div', { class: 'section-title' }, 'RUN LENGTH'), actRow), h('div', { class: 'peel-wrap' }, h('div', { class: 'section-title' }, 'YOUR PEEL'), peelCard)),
      // the shuffle sits on the lineup's own header line: it's what it acts on
      h('div', { class: 'prerun-bottom' }, h('div', { class: 'lineup-head' }, h('div', { class: 'section-title' }, "TONIGHT'S LINEUP"), shuffleBtn), lineupRow),
      h('div', { class: 'row' }, btn('BACK', 'cream', () => {
        redealLineup = null;
        onBack();
      }, { 'data-pad': 'back' }), startBtn),
    );
    return this.open(panel);
  }

  // ——— Between-wave shop ———
  private shops = new WeakMap<HTMLElement, (st: ShopState) => void>();

  shop(st0: ShopState, act: ShopActions): HTMLElement {
    let st = st0;
    /** Topping ids already dealt onto the counter (they don't replay their entrance). */
    const dealt = new Set<string>();
    /** Counter offers already dealt (kind:id): only new ones play their tier's entrance. */
    const dealtOffers = new Set<string>();
    const wrap = h('div', { class: 'shop2' });
    let screen: HTMLElement;
    const onKey = (e: KeyboardEvent) => {
      if (this.stack[this.stack.length - 1] !== screen) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= st.cards.length) act.buy(st.cards[n - 1].id);
      const k = e.key.toLowerCase();
      if (k === 'r' && st.canReroll) act.reroll();
      // Enter on a focused card or button presses that control, not Next Wave
      const fe = document.activeElement as HTMLElement | null;
      const onControl = !!fe && fe !== document.body && screen.contains(fe) && !fe.classList.contains('next');
      if (k === 'n' || (k === 'enter' && !onControl)) act.next();
    };
    window.addEventListener('keydown', onKey);
    // (a dead pizza: every slice eaten, its plate empty but for crumbs)
    const sliceArt = (p: ShopPizza, size: number) => pizzaThumb(p.id, p.slices, p.max, size, p.stale, p.dead);
    const render = () => {
      const coin = (n: number) => `${COIN_SVG.replace('class="coin"', 'class="coin-ico"')}${fmt(n)}`;
      const crust = (n: number) => `${CRUST_SVG.replace('class="coin"', 'class="coin-ico"')}${fmt(n)}`;
      // header
      const head = h(
        'div',
        { class: 'shop-head' },
        h('div', {}, h('div', { class: 'title' }, st.title), h('div', { class: 'shop-sub' }, st.sub)),
        h('div', { class: 'shop-purses' }, h('div', { class: 'purse', html: `${coin(st.coins)} <small>tips</small>` }), h('div', { class: 'purse gold', html: `${crust(st.crusts)} <small>Golden Crusts</small>` })),
      );
      // topping cards
      // cards already on the table don't deal in again when the shop redraws after a purchase;
      // only new ones (after a reroll) animate
      const cards = st.cards.map((c, i) => {
        // shop toppings: a struck-through usual price when it's cheaper today
        // a deal's chip (HALF PRICE…) says it's cheaper today: the button shows just today's price
        const was = '';
        const b = btn(c.sold ? 'BOUGHT' : c.free ? 'FREE' : st.coins >= c.price ? `BUY · ${was}${fmt(c.price)}` : `NEED ${was}${fmt(c.price)}`, c.sold ? 'cream small' : c.free || st.coins >= c.price ? 'green small' : 'small', () => act.buy(c.id));
        b.disabled = c.sold || (!c.free && st.coins < c.price);
        const el = h(
          'div',
          { class: `card tframed ${c.rarity}${c.sold ? ' sold' : ''}${dealt.has(c.id) ? ' dealt' : ''}`, tabindex: 0, role: 'button', 'aria-label': `${c.name}: ${c.desc}` },
          toppingFrame(c.rarity),
          // its rarity, a tab of its frame
          h('div', { class: 'rarity ttab' }, c.rarity),
          h('div', { class: 'key' }, String(i + 1)),
          h('span', { class: `kind ${c.kind}` }, c.kind === 'permanent' ? 'PERMANENT' : c.kind === 'unique' ? 'ONCE PER RUN' : 'ONE USE'),
          h('div', { class: 'icon' }, c.icon),
          h('div', { class: 'name' }, c.name),
          // a long description is set smaller (and at most three lines, the full text on hover), so it never makes the card
          // (and the whole shop) taller
          h('div', { class: `desc${c.desc.length > 105 ? ' xlong' : c.desc.length > 75 ? ' long' : ''}`, title: c.desc }, h('span', { class: 'dt' }, c.desc)),
          c.downside ? h('div', { class: 'down' }, `▼ ${c.downside}`) : null,
          // a deal (FREE, HALF PRICE…) rides on the level line, clear of everything else
          h('div', { class: 'lvl' }, c.lvl, !c.sold && (c.free || c.tag) ? h('span', { class: `ptag ${c.free ? 'free' : c.tag!.kind}` }, c.free ? 'FREE' : c.tag!.text) : null),
          b,
        );
        el.addEventListener('click', () => !c.sold && act.buy(c.id));
        el.addEventListener('keydown', (e) => e.key === 'Enter' && !c.sold && act.buy(c.id));
        return el;
      });
      const reroll = btn(st.rerollLabel, 'yellow small', () => act.reroll(), { 'data-pad': 'y' });
      reroll.disabled = !st.canReroll;
      const toppings = h(
        'section',
        { class: 'shop-sec toppings', 'data-pad-section': '' },
        h('div', { class: 'sec-head' }, h('h2', {}, 'TOPPINGS'), h('span', { class: 'sec-note' }, 'Buy as many as you can afford'), reroll),
        h('div', { class: `cards${cards.length > 4 ? ' row' : ''}${cards.length > 5 ? ' many' : ''}` }, ...cards),
      );
      // table strip
      const table = h(
        'section',
        { class: 'shop-sec table', 'data-pad-section': '' },
        h('div', { class: 'sec-head' }, h('h2', {}, 'YOUR TABLE'), h('span', { class: `sec-chip${st.tableFull ? ' full' : ''}` }, `${st.table.length} / 5${st.tableFull ? ' FULL' : ''}`)),
        h(
          'div',
          { class: 'strip' },
          ...st.table.map((p, i) => {
            // each pizza that isn't fully fresh gets its own Reheat button
            // every tile has the same rows, so they line up: slices, freshness (∞ for a pizza that never goes stale; no row on
            // any tile when freshness is off), then HEAL and REHEAT side by side, greyed when not needed
            const heal = btn(p.heal.need ? `HEAL +2 · ${fmt(p.heal.cost)}` : 'FULL', 'green small heal', () => act.healPizza(i), { 'aria-label': `Heal ${p.name} 2 slices for ${p.heal.cost} tips` });
            heal.disabled = !p.heal.can;
            const reheat = p.reheat ? btn(p.reheat.need ? `REHEAT · ${fmt(p.reheat.cost)}` : p.neverStale ? 'NEVER STALE' : 'FRESH', 'yellow small reheat', () => act.reheat(i), { 'aria-label': `Reheat ${p.name} for ${p.reheat.cost} tips` }) : null;
            if (reheat && p.reheat) reheat.disabled = !p.reheat.can;
            // a dead pizza (all eaten): one REBAKE button where HEAL and REHEAT sit (back with half its slices, fully fresh)
            let rebake: HTMLElement | null = null;
            if (p.dead && p.rebake) {
              const rb = p.rebake;
              rebake = btn(`REBAKE · ${fmt(rb.cost)}`, 'small rebake', () => act.rebake(i), { 'aria-label': `Rebake ${p.name} for ${rb.cost} tips: back with half its slices, fully fresh`, title: 'Back with half its slices, fully fresh' });
              (rebake as HTMLButtonElement).disabled = !rb.can;
            } else if (p.dead) {
              rebake = btn('NO REBAKE ON INFERNO', 'small rebake', () => {}, { title: 'No rebakes on Inferno' });
              (rebake as HTMLButtonElement).disabled = true;
            }
            const actions = p.dead ? h('div', { class: 'pacts' }, rebake) : h('div', { class: 'pacts' }, heal, reheat);
            const tier = tierAttrs(p.rarity);
            return h(
              'div',
              { class: `ptile ${tier.cls}${p.stale ? ' stale' : ''}${p.dead ? ' dead' : ''}${p.enhanced ? ' enhanced' : ''}`, style: tier.style },
              ...tierFrame(p.rarity),
              p.stale ? h('span', { class: 'flag' }, 'STALE') : p.dead ? h('span', { class: 'flag dead' }, 'EATEN') : null,
              p.enhanced ? h('span', { class: 'star-badge', title: 'Enhanced: its perk is stronger this run', 'aria-label': 'Enhanced' }, '★') : null,
              h('div', { class: 'pt-pic' }, sliceArt(p, 120)),
              h('div', { class: 'nm' }, p.name),
              // (a stale or dead pizza's perk crossed out: what reheating or rebaking brings back)
              h('div', { class: `ds${p.stale || p.dead ? ' off' : ''}` }, p.enhanced && !p.stale && !p.dead ? perkDiff(p.basePerk, p.perk) : p.perk),
              h('div', { class: 'sl' }, `${p.slices} / ${p.max} slices`),
              p.freshness ? (p.dead ? h('div', { class: 'fresh blank' }) : p.neverStale ? freshForever() : freshBar(p.fresh, p.maxFresh)) : null,
              actions,
            );
          }),
        ),
      );
      // counter + services
      const offers: HTMLElement[] = st.offers.map((o) => {
        const was = o.cost < o.fullCost ? `<s>${fmt(o.fullCost)}</s> ` : '';
        const b = btn(o.cost === 0 ? 'FREE' : `BUY · ${was}${fmt(o.cost)}`, `${st.coins >= o.cost ? 'green' : ''} small`, () => act.buyPizza(o.id));
        b.disabled = st.coins < o.cost;
        const pic = h('div', { class: 'offer-pic' }, h('img', { src: pizzaPortraitURL(o.id), alt: '' }), o.kind === 'enhanced' ? h('span', { class: 'star-badge' }, '★') : null);
        // every offer in its tier's frame
        const tier = tierAttrs(o.rarity);
        // its tabs in one row along the frame's top: its kind on the left, its tier in the middle, NEW PIZZA on the right;
        // the row keeps them apart however narrow the card (the tier moves over rather than running into a long kind)
        const card = (cls: string, kind: HTMLElement | null, isNew: HTMLElement | null, ...kids: (HTMLElement | null)[]) =>
          h('div', { class: `offer ${tier.cls}${cls}`, style: tier.style, 'data-offer': o.id }, ...tierFrame(o.rarity, false), h('div', { class: 'tabs' }, kind ?? h('span', { class: 'tab-gap' }), tierLabel(o.rarity), isNew ?? h('span', { class: 'tab-gap' })), ...kids);
        if (o.kind === 'special')
          return card(
            ' special',
            h('span', { class: `kind-tab k-special${o.fromPizzeria ? ' k-pizzeria' : ''}` }, ...(o.fromPizzeria ? tabText('PIZZERIA SPECIAL', 'PIZZERIA') : tabText('CHEF’S SPECIAL', 'SPECIAL'))),
            // what makes a Chef's Special worth it (the rest on hover)
            h('span', { class: 'new-tab', title: 'A new pizza: buy it once and it’s yours forever', 'aria-label': 'New pizza: buy it once and it’s yours forever' }, ...tabText('✦ NEW PIZZA', 'NEW')),
            pic,
            h('div', { class: 'offer-text' }, h('b', {}, o.name), h('span', { title: o.perk }, o.perk)),
            b,
          );
        if (o.kind === 'enhanced')
          return card(' enhanced', h('span', { class: 'kind-tab k-enhanced' }, '★ ENHANCED'), null, pic, h('div', { class: 'offer-text' }, h('b', {}, o.name), h('span', {}, perkDiff(o.basePerk ?? o.perk, o.perk))), b);
        return card(o.cost === 0 ? ' free' : '', o.cost === 0 ? h('span', { class: 'kind-tab k-free' }, ...tabText('ON THE HOUSE', 'FREE')) : null, null, pic, h('div', { class: 'offer-text' }, h('b', {}, o.name), h('span', { title: o.perk }, o.perk)), b);
      });
      // each offer new to the counter plays its tier's entrance (a Rare's chime, an Epic's flip and sparkles)
      let order = 0;
      st.offers.forEach((o, i) => {
        const key = `${o.kind}:${o.id}`;
        if (dealtOffers.has(key)) return;
        dealtOffers.add(key);
        if (o.rarity !== 'common') dealCard(offers[i], o.rarity, o.id, order++);
      });
      // Pizza Slots: in the third slot when no Chef's Special turned up
      if (st.slots) offers.push(slotsRow(st.slots, act.slots, act.slotsTake));
      const services = h(
        'div',
        { class: 'services' },
        btn('YOUR TOPPINGS', 'yellow small', () => act.toppings(), { title: 'Every topping you have, its level, and when used ones come back', 'aria-label': `Your toppings: ${st.yours.filter((y) => y.back === null).length}` }),
      );
      const counter = h(
        'section',
        // (with fewer than three offers each has room to spare: a roomy layout, a bigger picture with its text stacked; not
        // at last pizza standing, where the banner takes that room)
        { class: `shop-sec counter2${st.lastStand ? ' last-stand' : ''}${offers.length < 3 && !st.lastStand ? ` roomy${offers.length === 1 ? ' single' : ''}` : ''}`, 'data-pad-section': '' },
        h('div', { class: 'sec-head' }, h('h2', {}, 'PIZZA COUNTER'), st.tableFull ? h('span', { class: 'sec-note' }, 'Full: you pick one to swap') : null),
        st.lastStand ? h('div', { class: 'ls-banner', role: 'status' }, h('b', {}, 'ONE PIZZA LEFT'), h('span', {}, 'PICK ANOTHER ONE, ON THE HOUSE')) : null,
        ...(offers.length
          ? offers
          : // nothing left to sell: an empty plate under a SOLD OUT board, filling the counter
            [
              h(
                'div',
                { class: 'counter-empty' },
                h('div', { class: 'ce-art', 'aria-hidden': 'true', html: SOLD_OUT_SVG }),
                h('b', {}, 'SOLD OUT'),
                h('span', {}, 'Nothing more at the counter this time. Fresh pizzas at the next shop.'),
              ),
            ]),
        services,
      );
      const golden = h(
        'section',
        { class: 'shop-sec golden', 'data-pad-section': '' },
        h('div', { class: 'sec-head' }, h('h2', {}, 'GOLDEN MENU'), h('span', { class: 'sec-note' }, 'One per shop · banked crusts')),
        h(
          'div',
          { class: 'gitems' },
          ...st.golden.map((g) => {
            const el = h('button', { class: `gitem${g.available ? ' on' : ''}`, type: 'button', title: `${g.desc}${g.note ? ` · ${g.note}` : ''}` }, h('b', {}, g.name), h('span', { html: g.available ? `${CRUST_SVG.replace('class="coin"', 'class="coin-ico"')} ${g.cost}` : g.note || 'Not now' })) as HTMLButtonElement;
            el.disabled = !g.available;
            el.addEventListener('click', () => g.available && act.golden(g.id));
            return el;
          }),
        ),
      );
      // last pizza standing: Next Wave waits until a pizza is added
      const next = st.lastStand
        ? btn('🔒 NEXT WAVE<small>Add a pizza from the counter first</small>', 'big next locked', () => act.next(), { 'data-pad': 'hold', 'aria-label': 'Next wave is locked: add a pizza from the counter first' })
        : btn('NEXT WAVE', 'big next', () => act.next(), { 'data-pad': 'hold' });
      next.addEventListener('padhold', () => act.next());
      // the pause menu from the shop: settings, save and leave, or quit
      const gear = btn(GEAR_SVG, 'shop-pause cream', () => act.pause(), { 'aria-label': 'Pause menu', title: 'Pause menu (Esc)' });
      const pr = st.progress;
      const prog = h('div', { class: 'crust-progress', html: `${CRUST_SVG.replace('class="coin"', 'class="coin-ico"')} <b>+${pr.runCrusts}</b> crusts this run${pr.next ? (pr.bank + pr.runCrusts >= pr.next.cost ? ` · ${pr.next.name} ready to unlock` : ` · next: ${pr.next.name} ${pr.bank + pr.runCrusts}/${pr.next.cost}`) : ''}` });
      wrap.replaceChildren(
        head,
        h('div', { class: 'shop-body' }, h('div', { class: 'shop-left' }, toppings, table), h('div', { class: 'shop-right' }, counter, golden, h('div', { class: 'next-row' }, gear, next))),
        h('div', { class: 'shop-foot' }, prog, h('span', { class: 'hint kbd-hint', html: `<span class="kbd">1</span>–<span class="kbd">${st.cards.length}</span> buy · <span class="kbd">R</span> reroll · <span class="kbd">Enter</span> next wave · <span class="kbd">Esc</span> menu` }), h('span', { class: 'hint pad-hint', html: `<span class="glyph">${glyph('A')}</span> buy · <span class="glyph">${glyph('Y')}</span> reroll · <span class="glyph">${glyph('LB')}</span><span class="glyph">${glyph('RB')}</span> sections · hold <span class="glyph">${glyph('MENU')}</span> next wave` })),
      );
    };
    render();
    for (const c of st.cards) dealt.add(c.id);
    screen = this.open(wrap);
    this.shops.set(screen, (s) => {
      st = s;
      const focusIdx = [...wrap.querySelectorAll('button, [tabindex="0"]')].indexOf(document.activeElement as Element);
      render();
      for (const c of st.cards) dealt.add(c.id);
      if (focusIdx >= 0) (wrap.querySelectorAll<HTMLElement>('button, [tabindex="0"]')[focusIdx] ?? null)?.focus();
    });
    this.onClose(screen, () => window.removeEventListener('keydown', onKey));
    return screen;
  }

  updateShop(screen: HTMLElement, st: ShopState): void {
    this.shops.get(screen)?.(st);
  }

  /** A pizza just bought from the counter (before the shop redraws without it): its tier's moment at its card. */
  pizzaBought(id: string, rarity: PizzaRarity): void {
    const card = document.querySelector<HTMLElement>(`.shop2 .offer[data-offer="${CSS.escape(id)}"]`);
    // (centred on its picture, so the burst stays off the cards round it)
    boughtCard((card?.querySelector('.offer-pic') ?? card)?.getBoundingClientRect() ?? null, rarity, id);
  }

  /** Next Wave pressed while it's locked: shake the counter so the eye goes there. */
  nudgeCounter(screen: HTMLElement): void {
    const c = screen.querySelector<HTMLElement>('.counter2');
    if (!c) return;
    c.classList.remove('nudge');
    void c.offsetWidth;
    c.classList.add('nudge');
  }

  // ——— Your Toppings: everything you own, searchable; and the STATS tab, the build in numbers ———
  yourToppings(list: YourTopping[], wave: number, stats?: () => BuildView, tab: 'toppings' | 'stats' = 'toppings'): HTMLElement {
    let s: HTMLElement;
    const search = h('input', { class: 'yt-search', type: 'search', placeholder: 'Search your toppings', 'aria-label': 'Search your toppings' }) as HTMLInputElement;
    const body = h('div', { class: 'scroll yt-list' });
    // rarest first, then by name; a row of rarity tabs filters them
    const RANK: Record<string, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };
    list = [...list].sort((a, b) => (RANK[UPGRADE_BY_ID[a.id]?.rarity] ?? 9) - (RANK[UPGRADE_BY_ID[b.id]?.rarity] ?? 9) || (UPGRADE_BY_ID[a.id]?.name ?? '').localeCompare(UPGRADE_BY_ID[b.id]?.name ?? ''));
    let rarity: string | null = null;
    const rarTabs = h('div', { class: 'tabs locker-tabs yt-rar' });
    const rows = list.map((y) => {
      const u = UPGRADE_BY_ID[y.id];
      const k = kindOf(u);
      // what it does at the level you have (level 1 for one-use and used ones), and what the next level brings
      const lvl = k === 'permanent' ? Math.max(1, y.lvl) : 1;
      const now = u.desc(lvl);
      const cap = y.max ?? u.max;
      const next = k === 'permanent' && y.back === null && lvl < cap ? u.desc(lvl + 1) : '';
      // cooldowns hold the first wave a used consumable may be dealt again: it's back in that wave's shop
      const status =
        y.back !== null
          ? h('span', { class: 'yt-st back' }, `Used · back in the shop after wave ${y.back}${y.back > wave ? ` (${y.back - wave} to go)` : ''}`)
          : y.armed
            ? h('span', { class: 'yt-st ready' }, 'READY · waiting to trigger')
            : k === 'permanent'
              ? h('span', { class: 'yt-st' }, `LV ${y.lvl} / ${y.max ?? u.max}`)
              : h('span', { class: 'yt-st' }, k === 'unique' ? 'Once per run' : 'One use');
      const row = h(
        'div',
        { class: `ytop${y.back !== null ? ' used' : ''}`, style: `--rc:${RARITY_COLOR[u.rarity]}` },
        h('div', { class: 'ic' }, u.icon),
        h('div', { class: 'tx' }, h('div', { class: 'yt-head' }, h('b', {}, u.name), h('span', { class: `rar ${u.rarity}` }, u.rarity), status), h('span', {}, now), next ? h('small', { class: 'next' }, `Next level: ${next}`) : null, isAutoTopping(u) ? h('small', { class: 'next auto' }, AUTO_TOPPING_NOTE) : null, u.downside ? h('em', { class: 'down' }, `▼ ${u.downside}`) : null),
      );
      return { row, rarity: u.rarity as string, text: `${u.name} ${now} ${u.rarity} ${u.downside ?? ''}`.toLowerCase() };
    });
    const empty = h('div', { class: 'hint' }, list.length ? 'No toppings match that.' : 'No toppings yet. Buy some from the cards!');
    const filter = () => {
      const q = search.value.trim().toLowerCase();
      const shown = rows.filter((r) => (!q || r.text.includes(q)) && (!rarity || r.rarity === rarity));
      body.replaceChildren(...shown.map((r) => r.row), ...(shown.length ? [] : [empty]));
      const tabs: [string | null, string][] = [[null, 'ALL'], ['legendary', 'LEGENDARY'], ['epic', 'EPIC'], ['rare', 'RARE'], ['common', 'COMMON']];
      rarTabs.replaceChildren(
        ...tabs
          .filter(([r]) => !r || rows.some((x) => x.rarity === r))
          .map(([r, l]) => btn(`${l} <small>${rows.filter((x) => !r || x.rarity === r).length}</small>`, `small ${rarity === r ? 'active' : ''}`, () => ((rarity = r), filter()))),
      );
    };
    search.addEventListener('input', filter);
    // typing in the box mustn't trigger the shop's keys (1-4 buy, R reroll, N next wave)
    search.addEventListener('keydown', (e) => e.stopPropagation());
    filter();
    const owned = list.filter((y) => y.back === null).length;
    const topsPane = h(
      'div',
      { class: 'yt-pane', id: 'yt-pane-tops', role: 'tabpanel', 'aria-labelledby': 'yt-tab-tops' },
      h('div', { class: 'subtitle' }, `${owned} topping${owned === 1 ? '' : 's'} on your pizzas${list.length > owned ? ` · ${list.length - owned} coming back` : ''}`),
      rarTabs,
      search,
      body,
    );
    // STATS: worked out when the tab opens (and again each time), so it always shows the build as it is
    const statsScroll = h('div', { class: 'scroll st-scroll' });
    const statsPane = h('div', { class: 'yt-pane', id: 'yt-pane-stats', role: 'tabpanel', 'aria-labelledby': 'yt-tab-stats', hidden: true }, statsScroll);
    const tabTops = btn(`TOPPINGS <small>${owned}</small>`, 'small', () => show('toppings'), { role: 'tab', id: 'yt-tab-tops', 'aria-controls': 'yt-pane-tops' });
    const tabStats = btn('📊 STATS', 'small', () => show('stats'), { role: 'tab', id: 'yt-tab-stats', 'aria-controls': 'yt-pane-stats' });
    const show = (t: 'toppings' | 'stats') => {
      const st = t === 'stats' && !!stats;
      tabTops.classList.toggle('active', !st);
      tabStats.classList.toggle('active', st);
      tabTops.setAttribute('aria-selected', String(!st));
      tabStats.setAttribute('aria-selected', String(st));
      topsPane.hidden = st;
      statsPane.hidden = !st;
      if (st) {
        let body: HTMLElement;
        try {
          body = statsBody(stats());
        } catch (e) {
          console.error('[stats]', e);
          body = h('div', { class: 'hint' }, 'The stats could not be worked out just now.');
        }
        statsScroll.replaceChildren(body);
        statsScroll.scrollTop = 0;
      }
    };
    // left and right on a tab switch tabs (keyboard; the controller moves between them as buttons)
    for (const b of [tabTops, tabStats])
      b.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const to = b === tabTops ? tabStats : tabTops;
        to.click();
        to.focus();
      });
    const tabs = stats ? h('div', { class: 'tabs yt-tabs', role: 'tablist', 'aria-label': 'Your toppings or your stats' }, tabTops, tabStats) : null;
    const panel = h(
      'div',
      { class: 'panel modal wide yourtops' },
      // the title with the TOPPINGS / STATS tabs beside it, in one row
      h('div', { class: 'yt-head' }, h('div', { class: 'title' }, 'YOUR TOPPINGS'), tabs),
      topsPane,
      statsPane,
      btn('DONE', 'green', () => this.close(s), { 'data-pad': 'back' }),
    );
    s = this.open(panel);
    show(tab);
    if (tab === 'toppings') setTimeout(() => search.focus({ preventScroll: true }), 50);
    else setTimeout(() => tabStats.focus({ preventScroll: true }), 50);
    return s;
  }

  // ——— Enhance a Pizza (Golden Menu): pick a pizza on the table ———
  enhancePicker(o: { cost: number; pizzas: ShopPizza[]; onPick: (index: number) => void }): HTMLElement {
    let s: HTMLElement;
    let picked = o.pizzas.findIndex((p) => !p.dead && !p.enhanced);
    const confirm = btn('', 'yellow big', () => {
      if (picked < 0) return;
      this.close(s);
      o.onPick(picked);
    });
    const tiles: HTMLButtonElement[] = [];
    const sync = () => {
      tiles.forEach((t) => t.classList.toggle('picked', Number(t.dataset.i) === picked));
      const p = o.pizzas[picked];
      confirm.innerHTML = p ? `${CRUST_SVG.replace('class="coin"', 'class="coin-ico"')} ENHANCE · ${o.cost}` : 'ENHANCE';
      confirm.disabled = !p;
    };
    o.pizzas.forEach((p, i) => {
      const off = p.dead || p.enhanced;
      const t = h(
        'button',
        { class: `swaptile enh${p.dead ? ' dead' : ''}${p.enhanced ? ' done' : ''}`, type: 'button', 'data-i': i },
        p.enhanced ? h('span', { class: 'flag gold' }, '★ ENHANCED') : p.dead ? h('span', { class: 'flag dead' }, 'EATEN') : null,
        pizzaThumb(p.id, p.slices, p.max, 200, p.stale, p.dead),
        h('span', { class: 'nm' }, p.name),
        p.dead ? h('span', { class: 'ds' }, 'Destroyed') : h('span', { class: 'ds' }, perkDiff(p.basePerk, p.enhanced ? p.perk : p.enhancedPerk)),
      ) as HTMLButtonElement;
      t.disabled = off;
      t.addEventListener('click', () => {
        if (off) return;
        audio.sfx('sfx_click');
        picked = i;
        sync();
      });
      tiles.push(t);
    });
    const panel = h(
      'div',
      { class: 'swap2 enhance2' },
      h('div', { class: 'incoming' }, h('div', { class: 'in-star' }, '★'), h('div', { class: 'in-text' }, h('span', { class: 'tag' }, 'GOLDEN MENU · ENHANCE A PIZZA'), h('b', {}, 'Make one perk stronger'), h('span', {}, 'About +50% for the rest of the run, or a better effect. One per pizza.')), h('div', { class: 'in-ask' }, h('b', {}, 'WHICH PIZZA?'), h('span', {}, `${o.cost} crusts · the price doubles each time`))),
      h('div', { class: 'swaprow' }, ...tiles),
      h('div', { class: 'swapfoot' }, btn('CANCEL', 'cream', () => this.close(s), { 'data-pad': 'back' }), confirm),
    );
    sync();
    s = this.open(panel);
    return s;
  }

  // ——— Swap picker: the incoming pizza on top, your pizzas drawn big below ———
  swapPicker(o: {
    id: string;
    name: string;
    perk: string;
    cost: number;
    coins: number;
    canAdd: boolean;
    current: { id: string; name: string; perk: string; slices: number; max: number; dead: boolean; stale: boolean; fresh: number; freshOn: boolean }[];
    onChoose: (index: number) => void; // -1 = new plate
  }): HTMLElement {
    let s: HTMLElement;
    // left to right as on the table (and the shop's), the first eaten or stale pizza picked to start: the obvious swap
    const order = o.current.map((p, i) => ({ p, i }));
    let picked = (order.find(({ p }) => p.dead || p.stale) ?? order[0])?.i ?? -1;
    const lose = h('div', { class: 'diff lose' });
    const confirm = btn('', 'green big', () => {
      if (picked === -2) return;
      this.close(s);
      o.onChoose(picked);
    });
    const tiles: HTMLElement[] = [];
    const sync = () => {
      tiles.forEach((t) => t.classList.toggle('picked', Number(t.dataset.i) === picked));
      const p = o.current[picked];
      if (picked === -1) lose.replaceChildren(h('span', { class: 'lbl' }, 'YOU LOSE'), h('b', {}, 'Nothing'), h('span', {}, 'It goes on a new plate'));
      else if (p) lose.replaceChildren(h('span', { class: 'lbl' }, 'YOU LOSE'), h('b', {}, p.name), h('span', {}, p.dead ? `Already eaten: ${p.perk}` : `${p.stale ? `Stale (perk off): ${p.perk}` : p.perk} · ${p.slices}/${p.max} slices left`));
      confirm.innerHTML = picked === -1 ? `ADD · ${fmt(o.cost)}` : `SWAP · ${fmt(o.cost)}`;
    };
    for (const { p, i } of order) {
      const t = h(
        'button',
        { class: `swaptile${p.stale ? ' stale' : ''}${p.dead ? ' dead' : ''}`, type: 'button', 'data-i': i },
        h('span', { class: 'flag out' }, 'SWAPPING OUT'),
        p.stale ? h('span', { class: 'flag' }, 'STALE') : p.dead ? h('span', { class: 'flag dead' }, 'EATEN') : null,
        pizzaThumb(p.id, p.slices, p.max, 200, p.stale, p.dead),
        h('span', { class: 'nm' }, p.name),
        h('span', { class: `ds${p.stale || p.dead ? ' off' : ''}` }, p.perk),
        h('span', { class: 'sl' }, `${p.slices} / ${p.max} slices`),
      );
      t.addEventListener('click', () => {
        audio.sfx('sfx_click');
        picked = i;
        sync();
      });
      tiles.push(t);
    }
    if (o.canAdd) {
      const t = h('button', { class: 'swaptile add', type: 'button', 'data-i': -1 }, h('span', { class: 'plus' }, '+'), h('span', { class: 'nm' }, 'New plate'), h('span', { class: 'ds' }, 'Keep everything'));
      t.addEventListener('click', () => {
        picked = -1;
        sync();
      });
      tiles.unshift(t);
      picked = -1;
    }
    const panel = h(
      'div',
      { class: 'swap2' },
      h(
        'div',
        { class: 'incoming' },
        h('img', { src: pizzaPortraitURL(o.id), alt: '' }),
        h('div', { class: 'in-text' }, h('span', { class: 'tag' }, `COMING IN · ${fmt(o.cost)} TIPS`), h('b', {}, o.name), h('span', {}, `${o.perk} · arrives whole`)),
        h('div', { class: 'in-ask' }, h('b', {}, 'WHERE DOES IT GO?'), h('span', {}, o.canAdd ? 'Add a plate or swap one out' : 'Table full: pick a pizza to swap out')),
      ),
      h('div', { class: 'swaprow' }, ...tiles),
      h('div', { class: 'swapfoot' }, lose, h('div', { class: 'diff gain' }, h('span', { class: 'lbl' }, 'YOU GAIN'), h('b', {}, o.name), h('span', { title: o.perk }, o.perk)), btn('CANCEL', 'cream', () => this.close(s), { 'data-pad': 'back' }), confirm),
    );
    sync();
    s = this.open(panel);
    return s;
  }

  // ——— One-time intro cards for each new system ———
  intro(id: string, onClose: () => void): HTMLElement {
    const c = INTROS[id] ?? { tag: 'NEW', title: 'Something new', lines: [] };
    let s: HTMLElement;
    const panel = h(
      'div',
      { class: 'panel modal intro' },
      h('span', { class: 'intro-tag' }, c.tag),
      h('div', { class: 'title' }, c.title),
      ...c.lines.map((l) => h('p', {}, l)),
      h('div', { class: 'row' }, btn('GOT IT', 'green', () => {
        this.close(s);
        onClose();
      }, { 'data-pad': 'back', 'data-pad-default': '' })),
      h('div', { class: 'hint' }, 'Shown once. Intro cards can be reset in Settings.'),
    );
    s = this.open(panel);
    return s;
  }

  /** A boss phase's first-time card (src/ui/phaseCard.ts). `done(off)` runs once it's closed; off: the player
   *  turned phase cards off. Returns `ok`, which closes it as OK does (Esc in the game). */
  phaseCard(c: ResolvedPhaseCard, done: (off: boolean) => void): { el: HTMLElement; ok: () => void } {
    let s: HTMLElement;
    let closed = false;
    // a player mashing smacks when the card pops up doesn't dismiss it unread
    const opened = performance.now();
    const finish = (off: boolean) => {
      if (closed || performance.now() - opened < 450) return;
      closed = true;
      this.close(s);
      done(off);
    };
    const panel = phaseCardPanel(c, () => finish(false), () => finish(true));
    s = this.open(panel);
    // (Enter and Esc press OK through the game's keys; a gamepad starts on OK, its data-pad-default)
    return { el: s, ok: () => finish(false) };
  }

  // ——— Second Chance (Golden menu) on game over ———
  secondChance(o: { wave: number; cost: number; bank: number; nextCost: number; use: () => void; decline: () => void }): HTMLElement {
    const panel = h(
      'div',
      { class: 'panel modal second' },
      h('div', { class: 'title' }, 'ALL PIZZAS STOMPED'),
      h('div', { class: 'gold-card' }, h('span', { class: 'intro-tag' }, 'GOLDEN MENU'), h('b', {}, 'Second Chance'), h('p', {}, `Replay wave ${o.wave} with 3 pizzas at half slices. The run is marked as a second-chance run.`), h('span', { class: 'hint' }, `You have ${fmt(o.bank)} crusts banked · next use costs ${fmt(o.nextCost)}`)),
      h('div', { class: 'row' }, btn('NO THANKS', 'cream', o.decline, { 'data-pad': 'back', 'data-no-x': '' }), btn(`${CRUST_SVG.replace('class="coin"', 'class="coin-ico"')} USE ${o.cost} CRUSTS`, 'yellow big', o.use)),
    );
    return this.open(panel);
  }

  // ——— Victory at the journey's end ———
  /** keepGoing: endless runs carry on from here (the journey again, harder). */
  victory(o: { kicker: string; acts: number; score: number; time: string; feet: number; bosses: number; heat: string; crusts: number; bank: () => void; keepGoing: (() => void) | null; legend?: boolean }): HTMLElement {
    const panel = h(
      'div',
      { class: `victory${o.legend ? ' legend' : ''}` },
      h('div', { class: 'v-kicker' }, o.kicker),
      h('div', { class: 'v-title' }, 'PIZZA SAVED!'),
      o.legend ? h('div', { class: 'v-legend' }, h('b', {}, 'PIZZA LEGEND'), h('span', {}, 'Endless+ is unlocked on the new-run screen')) : null,
      h('div', { class: 'v-sub' }, `All ${o.acts} acts, every boss, smacked. The table is yours.`),
      actTrack(o.acts, o.acts),
      h('div', { class: 'stats' }, stat(fmt(o.score), 'Score'), stat(o.time, 'Run time'), stat(fmt(o.feet), 'Feet smacked'), stat(String(o.bosses), 'Bosses beaten'), stat(o.heat, 'Heat')),
      h('div', { class: 'crusts', html: `${CRUST_SVG.replace('class="coin"', 'style="width:1.2em;height:1.2em"')} +${fmt(o.crusts)} <span style="font-size:.55em">Golden Crusts</span>` }),
      h(
        'div',
        { class: 'row' },
        o.keepGoing ? h('div', { class: 'v-choice' }, btn('KEEP GOING', 'green big', o.keepGoing, { 'data-pad-default': '' }), h('span', {}, 'Endless: the journey again, harder')) : null,
        h('div', { class: 'v-choice' }, btn('BANK IT', o.keepGoing ? 'yellow big' : 'green big', o.bank, o.keepGoing ? {} : { 'data-pad-default': '' }), h('span', {}, 'End the run and collect your crusts')),
      ),
    );
    return this.open(panel);
  }

  // ——— ACT COMPLETE: after the boss that ends each act ———
  actComplete(o: { act: number; name: string; acts: number; loop: number; kicker: string; time: string; feet: number; slices: number; crusts: number; nextLabel: string; keepGoing: () => void; bank: () => void; pause: () => void }): HTMLElement {
    const gear = btn(GEAR_SVG, 'act-pause cream', o.pause, { 'aria-label': 'Pause menu', title: 'Pause menu (Esc)' });
    const panel = h(
      'div',
      { class: 'victory actdone' },
      gear,
      h('div', { class: 'v-kicker' }, o.kicker),
      h('div', { class: 'v-title' }, 'ACT COMPLETE!'),
      h('div', { class: 'v-sub' }, `Act ${o.act} · ${o.name}${o.loop ? ` · Endless loop ${o.loop + 1}` : ''}`),
      actTrack(o.acts, o.act),
      h('div', { class: 'stats' }, stat(o.time, 'Act time'), stat(fmt(o.feet), 'Feet smacked'), stat(fmt(o.slices), 'Slices lost'), stat(fmt(o.crusts), 'Crusts so far')),
      h(
        'div',
        { class: 'row' },
        h('div', { class: 'v-choice' }, btn('KEEP GOING', 'green big', o.keepGoing, { 'data-pad-default': '' }), h('span', {}, `On to ${o.nextLabel}`)),
        h('div', { class: 'v-choice' }, btn('BANK IT', 'yellow big', o.bank), h('span', {}, 'End the run and collect your crusts')),
      ),
    );
    return this.open(panel);
  }

  // ——— Pause ———
  pause(o: { resume: () => void; settings: () => void; quit: () => void; leave: (() => void) | null; leaveNote: string; inShop?: boolean; backLabel?: string; act?: string; toppings: () => void; toppingCount: number; wave: number; score: number }): HTMLElement {
    // your toppings open the same window as the shop's (the full list sat here and made the menu long)
    const tops = btn(`YOUR TOPPINGS · ${o.toppingCount}`, 'yellow', o.toppings, { title: 'Every topping you have, its level, and when used ones come back' });
    let confirmQuit = false;
    const quit = btn('QUIT RUN', 'cream', () => {
      if (!confirmQuit) {
        confirmQuit = true;
        quit.innerHTML = 'REALLY QUIT?';
        quit.classList.remove('cream');
        return;
      }
      o.quit();
    });
    const panel = h(
      'div',
      { class: 'panel modal' },
      h('div', { class: 'title' }, 'PAUSED'),
      h('div', { class: 'subtitle' }, `Wave ${o.wave}${o.act ? ` · ${o.act}` : ''} · ${fmt(o.score)} points`),
      h('div', { class: 'row' }, btn(o.backLabel ?? (o.inShop ? 'BACK TO SHOP' : 'RESUME'), 'green big', o.resume, { 'data-pad': 'menu', 'data-pad-default': '' }), btn('SETTINGS', 'yellow', o.settings), tops),
      // leave keeps the run saved (Resume on the title screen); quit ends it
      h('div', { class: 'row' }, o.leave ? btn('SAVE &amp; MENU', 'cream', o.leave) : null, quit),
      h('div', { class: 'hint pause-note' }, o.leaveNote),
      h('div', { class: 'hint kbd-hint', html: o.backLabel ? '<span class="kbd">ESC</span> back · <span class="kbd">M</span> mute' : o.inShop ? '<span class="kbd">ESC</span> back to the shop · <span class="kbd">M</span> mute' : '<span class="kbd">ESC</span> resume · <span class="kbd">M</span> mute · <span class="kbd">SPACE</span> Peel Slam' }),
    );
    return this.open(panel);
  }

  // ——— Settings ———
  settings(onClose: () => void, inRun = false): HTMLElement {
    let tab: 'audio' | 'graphics' | 'controls' | 'access' | 'progress' = 'audio';
    const slider = (key: 'master' | 'music' | 'sfx' | 'ambience' | 'stickSensitivity' | 'aimAssist', label: string) => {
      const v = save.settings[key];
      const out = h('output', {}, `${Math.round(v * 100)}`);
      const input = h('input', { type: 'range', min: 0, max: 100, value: Math.round(v * 100), 'aria-label': label }) as HTMLInputElement;
      input.style.setProperty('--v', `${v * 100}%`);
      input.addEventListener('input', () => {
        const nv = Number(input.value) / 100;
        out.textContent = input.value;
        input.style.setProperty('--v', `${input.value}%`);
        updateSettings({ [key]: nv } as Partial<Settings>);
      });
      input.addEventListener('change', () => {
        if (key === 'sfx' || key === 'master') audio.slap(0.6);
      });
      return h('label', { class: 'setting' }, h('span', {}, label), input, out);
    };
    const toggle = (key: 'muted' | 'screenShake' | 'damageNumbers' | 'flashes' | 'showFps' | 'showTimer' | 'traitIcons' | 'reducedMotion' | 'slowNewCards' | 'vibration' | 'animFeet' | 'animBackdrops' | 'animPeels', label: string) => {
      const input = h('input', { type: 'checkbox' }) as HTMLInputElement;
      input.checked = save.settings[key];
      input.addEventListener('change', () => {
        updateSettings({ [key]: input.checked } as Partial<Settings>);
        // the graphics switches move the preset (to Custom, or to the one they now match)
        if (key.startsWith('anim')) render();
        this.hud.syncMute();
        applyA11y();
        audio.sfx('sfx_click');
      });
      return h('label', { class: 'toggle' }, h('span', {}, label), input, h('span', { class: 'sw' }));
    };
    const choice = <K extends 'aimScheme' | 'prompts' | 'colorBlind' | 'peelSmacks'>(key: K, label: string, opts: [Settings[K], string][]) => {
      const row = h('div', { class: 'choice' }, h('span', {}, label));
      const seg = h('div', { class: 'seg' });
      const draw = () =>
        seg.replaceChildren(
          ...opts.map(([v, l]) =>
            btn(l, `small ${save.settings[key] === v ? 'active' : 'cream'}`, () => {
              updateSettings({ [key]: v } as Partial<Settings>);
              applyA11y();
              // let the new smack setting be heard
              if (key === 'peelSmacks') audio.slap(0.6);
              draw();
            }),
          ),
        );
      draw();
      row.append(seg);
      return row;
    };
    const holdReset = (label: string, note: string, wipes: string[], run: () => void) => {
      const b = btn(label, 'danger small', () => {
        let sHold: HTMLElement;
        const hold = h('button', { class: 'btn hold', type: 'button', 'data-pad': 'hold' }, h('i', {}), h('span', {}, 'HOLD TO RESET · 2 s')) as HTMLButtonElement;
        let t0 = 0;
        let raf = 0;
        const stop = () => {
          cancelAnimationFrame(raf);
          hold.style.setProperty('--hold', '0');
        };
        const go = () => {
          stop();
          this.close(sHold);
          run();
          audio.sfx('sfx_boing', { rate: 0.6 });
          render();
        };
        const step = () => {
          const k = Math.min(1, (performance.now() - t0) / 2000);
          hold.style.setProperty('--hold', String(k));
          if (k >= 1) go();
          else raf = requestAnimationFrame(step);
        };
        const begin = () => {
          t0 = performance.now();
          audio.sfx('sfx_hold', { volume: 0.5 });
          raf = requestAnimationFrame(step);
        };
        hold.addEventListener('pointerdown', begin);
        hold.addEventListener('pointerup', stop);
        hold.addEventListener('pointerleave', stop);
        hold.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && !e.repeat && begin());
        hold.addEventListener('keyup', stop);
        hold.addEventListener('padhold', go);
        const conf = h(
          'div',
          { class: 'panel modal confirm' },
          h('div', { class: 'title', style: 'color:var(--tomato-d)' }, `${label}?`),
          h('div', { class: 'subtitle' }, 'This wipes:'),
          h('ul', { class: 'wipes' }, ...wipes.map((w) => h('li', {}, w))),
          h('div', { class: 'hint' }, note),
          h('div', { class: 'row' }, btn('CANCEL', 'cream', () => this.close(sHold), { 'data-pad': 'back', 'data-pad-default': '' }), hold),
        );
        sHold = this.open(conf);
      });
      return h('div', { class: 'reset-row' }, b, h('span', {}, note));
    };
    const body = h('div', { class: 'settings' });
    const tabs = h('div', { class: 'tabs' });
    const render = () => {
      tabs.replaceChildren(
        ...(['audio', 'graphics', 'controls', 'access', 'progress'] as const).map((t) => btn({ audio: 'AUDIO', graphics: 'GRAPHICS', controls: 'CONTROLS', access: 'ACCESSIBILITY', progress: 'PROGRESS' }[t], `small ${tab === t ? 'active' : ''}`, () => ((tab = t), render()))),
      );
      if (tab === 'audio')
        body.replaceChildren(
          h('div', { class: 'section-title' }, 'VOLUME'),
          slider('master', 'Master'),
          slider('music', 'Music'),
          slider('sfx', 'Sound FX'),
          slider('ambience', 'Ambience'),
          Object.assign(choice('peelSmacks', 'Peel smack sounds', [['peel', 'PEEL SOUNDS'], ['classic', 'CLASSIC SMACK'], ['off', 'OFF']]), {
            title: 'Peel sounds: every peel smacks like what it’s made of (a worn look brings its own). Classic smack: the original slap for every peel.',
          }),
          h('div', { class: 'toggles' }, toggle('muted', 'Mute all'), toggle('showFps', 'Show FPS'), toggle('damageNumbers', 'Damage numbers'), toggle('showTimer', 'Run timer')),
        );
      else if (tab === 'graphics') {
        const cur = currentPreset();
        const seg = h(
          'div',
          { class: 'seg' },
          ...(['low', 'medium', 'high'] as const).map((p) =>
            btn(p.toUpperCase(), `small ${cur === p ? 'active' : 'cream'}`, () => {
              applyPreset(p);
              applyA11y();
              audio.sfx('sfx_click');
              render();
            }),
          ),
          cur === 'custom' ? btn('CUSTOM', 'small active', () => {}) : '',
        );
        body.replaceChildren(
          h('div', { class: 'section-title' }, 'QUALITY'),
          h('div', { class: 'choice' }, h('span', {}, 'Preset'), seg),
          h('div', { class: 'hint' }, 'Low: everything still. Medium: animated feet only. High: everything animated. Lower settings run smoother on older phones and laptops.'),
          h('div', { class: 'section-title' }, 'ANIMATION'),
          h('div', { class: 'toggles' }, toggle('animFeet', 'Animated feet'), toggle('animBackdrops', 'Animated stages'), toggle('animPeels', 'Animated peels')),
          h('div', { class: 'hint' }, 'Animated feet: still feet show their full art and only move as a whole. Changes apply to feet that arrive after the change. Animated peels: foot peels come alive and looks glow, burn and spark; off, each peel keeps a still of its look.'),
        );
      } else if (tab === 'controls')
        body.replaceChildren(
          h('div', { class: 'section-title' }, 'CONTROLLER'),
          choice('aimScheme', 'Aiming', [['free', 'FREE AIM'], ['lane', 'LANE MODE']]),
          h('div', { class: 'hint' }, 'Lane mode: pick a pizza with left and right; Smack hits the lowest foot above it.'),
          slider('stickSensitivity', 'Stick sensitivity'),
          slider('aimAssist', 'Aim assist'),
          choice('prompts', 'Button prompts', [['auto', 'AUTO'], ['xbox', 'XBOX'], ['playstation', 'PLAYSTATION'], ['switch', 'SWITCH']]),
          h('div', { class: 'toggles' }, toggle('vibration', 'Vibration')),
        );
      else if (tab === 'access')
        body.replaceChildren(
          h('div', { class: 'section-title' }, 'ACCESSIBILITY'),
          choice('colorBlind', 'Colour-blind palette', [['off', 'OFF'], ['redgreen', 'RED-GREEN'], ['blueyellow', 'BLUE-YELLOW']]),
          h('div', { class: 'toggles' }, toggle('traitIcons', 'Trait icons on feet'), toggle('reducedMotion', 'Reduced motion'), toggle('screenShake', 'Screen shake'), toggle('flashes', 'Screen flashes'), toggle('slowNewCards', 'Slow time on NEW cards')),
        );
      else
        body.replaceChildren(
          h('div', { class: 'section-title' }, 'PROGRESS'),
          h('div', { class: 'reset-row' }, btn('RESET INTRO CARDS', 'cream small', () => {
            save.seenIntros = [];
            persist();
            audio.sfx('sfx_click');
          }), h('span', {}, 'Show every how-it-works card and boss phase card again')),
          h('div', { class: 'reset-row' }, btn(`RESET PIZZERIA UPGRADES · +${fmt(metaRefundValue())}`, 'cream small', () => {
            const n = resetMeta();
            this.hud.toast(null, 'PIZZERIA RESET', `+${fmt(n)} Golden Crusts refunded`);
            render();
          }), h('span', {}, 'Full refund of every crust spent on upgrades')),
          inRun
            ? h('div', { class: 'hint' }, 'The full resets are hidden during a run.')
            : holdReset('RESET PROGRESS', 'Wipes all progress, keeps settings', ['Golden Crusts and Pizzeria upgrades', 'Unlocked pizzas and the Pizzapedia', 'Best scores on every heat', 'Bosses beaten, milestones and any saved run', 'Peels and achievement progress'], () => resetProgress()),
          inRun ? '' : holdReset('RESET EVERYTHING', 'Factory reset, settings included', ['Everything in Reset progress', 'All settings, controls and accessibility options'], () => {
            resetEverything();
            applyA11y();
          }),
        );
    };
    render();
    let s: HTMLElement;
    const panel = h(
      'div',
      { class: 'panel modal' },
      h('div', { class: 'title' }, 'SETTINGS'),
      tabs,
      body,
      h(
        'div',
        { class: 'row' },
        btn(`${ICONS.full.replace('<svg', '<svg style="width:1em;height:1em;vertical-align:-.12em"')} FULLSCREEN`, 'yellow small', () => {
          const el = document.getElementById('stage')!;
          if (document.fullscreenElement) void document.exitFullscreen();
          else void el.requestFullscreen?.().catch(() => {});
        }),
        btn('DONE', 'green', () => {
          this.close(s);
          onClose();
        }, { 'data-pad': 'back' }),
      ),
    );
    s = this.open(panel);
    return s;
  }

  // ——— Game over ———
  gameOver(o: { score: number; wave: number; feet: number; combo: number; bosses: number; crusts: number; newBest: boolean; heat: string; location: string; act: string; banked: boolean; secondChanceRun: boolean; time: string; affordable: string[]; next: { name: string; cost: number } | null; victory: boolean; again: () => void; menu: () => void; pizzeria: () => void }): HTMLElement {
    const shopBtn = btn('PIZZERIA', `yellow${o.affordable.length ? ' attention' : ''}`, o.pizzeria);
    const callouts = h('div', { class: 'callouts' });
    if (o.affordable.length) callouts.append(h('div', { class: 'callout', html: `🍕 You can now unlock <b>${o.affordable.slice(0, 3).map((id) => PIZZA_BY_ID[id].name).join(', ')}${o.affordable.length > 3 ? ` +${o.affordable.length - 3} more` : ''}</b> in the Pizzeria!` }));
    else if (o.next) callouts.append(h('div', { class: 'callout', html: `Next unlock: <b>${o.next.name}</b> · ${fmt(Math.min(save.crusts, o.next.cost))} / ${fmt(o.next.cost)} crusts` }));
    if (o.secondChanceRun) callouts.append(h('div', { class: 'callout' }, 'Second-chance run'));
    // the Rare Find played on trial this run: one chance to keep it
    const trial = save.rareTrial && PIZZA_BY_ID[save.rareTrial] && !save.unlockedPizzas.includes(save.rareTrial) ? PIZZA_BY_ID[save.rareTrial] : null;
    save.rareTrial = null;
    persist();
    if (trial) {
      const keep = btn(`KEEP IT ${CRUST_SVG.replace('class="coin"', 'class="coin-ico"')} ${fmt(trial.cost)}`, 'yellow small', () => {
        if (save.crusts < trial.cost) return;
        save.crusts -= trial.cost;
        unlockPizza(trial.id);
        persist();
        audio.sfx('sfx_levelup');
        row.replaceChildren(h('span', {}, `🍕 ${trial.name} is yours!`));
      });
      // (the run's crusts are already banked when this opens)
      keep.disabled = save.crusts < trial.cost;
      const row = h('div', { class: 'callout trial' }, h('span', { html: `🍕 You tried <b>${trial.name}</b> this run. Keep it?` }), keep);
      callouts.append(row);
    }
    const crustsEl = h('span', {}, '0');
    const panel = h(
      'div',
      { class: 'panel modal pop' },
      h('div', { class: 'title', style: `font-size:4.6em;color:${o.victory || o.banked ? 'var(--cheese-d)' : '#ff6a4d'}` }, o.victory ? 'JOURNEY COMPLETE' : o.banked ? 'BANKED!' : 'THE PIZZA IS TOAST'),
      h('div', { class: 'subtitle' }, `Wave ${o.wave} · ${o.act} · ${o.location} · ${o.heat}`),
      o.newBest ? h('div', { class: 'newbest' }, `NEW BEST ON ${o.heat.toUpperCase()}!`) : null,
      h('div', { class: 'stats' }, stat(fmt(o.score), 'Score'), stat(String(o.wave), 'Wave reached'), stat(fmt(o.feet), 'Feet smacked'), stat(String(o.combo), 'Best combo'), stat(String(o.bosses), 'Bosses beaten'), stat(o.time, 'Time')),
      h('div', { class: 'crusts', html: `${CRUST_SVG.replace('class="coin"', 'style="width:1.2em;height:1.2em"')} +` }, crustsEl, h('span', { style: 'font-size:.6em' }, ' Golden Crusts')),
      callouts.childElementCount ? callouts : null,
      h('div', { class: 'row' }, btn('PLAY AGAIN', 'green big', o.again, { 'data-pad-default': '' }), shopBtn, btn('MENU', 'cream', o.menu, { 'data-pad': 'back', 'data-no-x': '' })),
    );
    const s = this.open(panel);
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / 1200);
      crustsEl.textContent = String(Math.round(o.crusts * (1 - (1 - k) ** 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    setTimeout(step, 500);
    return s;
  }

  // ——— Pizzeria (meta shop): upgrades, every pizza and how it unlocks, and the toppings collection ———
  pizzeria(onClose: () => void, openOn: { tab?: 'upgrades' | 'pizzas' | 'toppings'; pizza?: string } = {}): HTMLElement {
    type Tab = 'upgrades' | 'pizzas' | 'toppings';
    // catch up on milestones met before they named their pizza
    awardMilestones(null);
    // NEW badges stay for this visit; looking at a tab clears them for next time
    const newPizzas = new Set(save.pizzasNew);
    const newTops = new Set(save.toppingsNew);
    let tab: Tab = openOn.tab ?? 'upgrades';
    let rarity: 'all' | Rarity = 'all';
    let seenFilter: 'all' | 'seen' | 'unseen' = 'all';
    // pizzas tab: which group, and whether to show only unlocked ones
    type PzGroup = 'all' | 'pizzeria' | 'milestone' | 'special' | 'rare';
    let pzGroup: PzGroup = openOn.pizza ? 'pizzeria' : 'all';
    let pzUnlockedOnly = false;
    const balance = h('div', { class: 'crusts' });
    const body = h('div', { class: 'scroll' });
    const tabs = h('div', { class: 'tabs' });
    const crustIco = CRUST_SVG.replace('class="coin"', 'class="coin-ico"');
    const bar = (have: number, need: number) => h('div', { class: 'pbar' }, h('i', { style: `width:${Math.round((100 * Math.min(have, need)) / need)}%` }), h('span', {}, `${fmt(have)}/${fmt(need)}`));
    const badge = (on: boolean) => (on ? ' <span class="badge">NEW</span>' : '');
    const render = () => {
      balance.innerHTML = `${CRUST_SVG.replace('class="coin"', 'style="width:1.2em;height:1.2em"')} ${fmt(save.crusts)} <span style="font-size:.55em">Golden Crusts</span>`;
      if (tab === 'pizzas' && save.pizzasNew.length) {
        save.pizzasNew = [];
        persist();
      }
      if (tab === 'toppings' && save.toppingsNew.length) {
        save.toppingsNew = [];
        persist();
      }
      const seenCount = UPGRADES.filter((u) => save.seenToppings.includes(u.id)).length;
      tabs.replaceChildren(
        btn('UPGRADES', `small ${tab === 'upgrades' ? 'active' : ''}`, () => ((tab = 'upgrades'), render())),
        btn(`PIZZAS ${save.unlockedPizzas.filter((id) => PIZZA_BY_ID[id]).length}/${PIZZAS.length}${badge(tab !== 'pizzas' && save.pizzasNew.length > 0)}`, `small ${tab === 'pizzas' ? 'active' : ''}`, () => ((tab = 'pizzas'), render())),
        btn(`TOPPINGS ${seenCount}/${UPGRADES.length}${badge(tab !== 'toppings' && save.toppingsNew.length > 0)}`, `small ${tab === 'toppings' ? 'active' : ''}`, () => ((tab = 'toppings'), render())),
      );
      body.scrollTop = 0;
      if (tab === 'upgrades') body.replaceChildren(...upgradesTab());
      else if (tab === 'pizzas') body.replaceChildren(...pizzasTab());
      else body.replaceChildren(...toppingsTab());
    };
    const upgradesTab = (): HTMLElement[] => {
      const refund = metaRefundValue();
      const resetBtn = btn(refund > 0 ? `RESET UPGRADES · REFUND ${fmt(refund)}` : 'RESET UPGRADES', 'cream small', () => {
        resetMeta();
        audio.sfx('sfx_coin');
        render();
      });
      resetBtn.disabled = refund <= 0;
      return [
        h('div', { class: 'reset-row meta-reset' }, resetBtn, h('span', {}, 'Full refund, any time. Pizza unlocks stay unlocked.')),
        h(
          'div',
          { class: 'meta-list' },
          ...META.map((m) => {
            const lvl = save.meta[m.id] ?? 0;
            const maxed = lvl >= m.costs.length;
            const cost = m.costs[lvl];
            const pips = h('div', { class: 'pips', style: '--rc:var(--tomato)' });
            for (let i = 0; i < m.costs.length; i++) pips.append(h('i', { class: i < lvl ? 'on' : '' }));
            const b = btn(maxed ? 'MAXED' : `${crustIco} ${fmt(cost)}`, maxed ? 'cream' : 'green', () => {
              if (maxed || save.crusts < cost) return;
              save.crusts -= cost;
              save.meta[m.id] = lvl + 1;
              save.metaSpent[m.id] = (save.metaSpent[m.id] ?? 0) + cost;
              persist();
              audio.sfx('sfx_upgrade');
              render();
            });
            b.disabled = maxed || save.crusts < cost;
            // icon | name + level pips | price, with the description across the full width underneath
            return h('div', { class: 'meta' }, h('div', { class: 'ic' }, m.icon), h('div', { class: 'nmrow' }, h('div', { class: 'nm' }, m.name), pips), b, h('div', { class: 'ds' }, m.desc));
          }),
        ),
      ];
    };
    // every pizza, grouped by how it unlocks
    const pizzasTab = (): HTMLElement[] => {
      const has = (id: string) => save.unlockedPizzas.includes(id);
      const tile = (p: PizzaType, cls: string, ...rest: (HTMLElement | null)[]) => {
        const tier = tierAttrs(p.rarity);
        return h('div', { class: `tile pz-tile ${tier.cls} ${cls}`, style: tier.style }, ...tierFrame(p.rarity), h('img', { src: pizzaPortraitURL(p.id), alt: p.name, loading: 'lazy' }), h('div', { class: 'nm' }, p.name), h('div', { class: 'ds' }, p.perkText), ...rest, newPizzas.has(p.id) ? h('span', { class: 'tag new' }, 'NEW') : null);
      };
      const section = (title: string, note: string, tiles: HTMLElement[]) => (tiles.length ? [h('div', { class: 'pz-sec' }, h('b', {}, title), h('span', {}, note)), h('div', { class: 'grid' }, ...tiles)] : []);
      const owned = PIZZAS.filter((p) => has(p.id)).sort((a, b) => Number(newPizzas.has(b.id)) - Number(newPizzas.has(a.id)) || a.cost - b.cost);
      const locked = (r: PizzaRoute) => PIZZAS.filter((p) => p.route === r && !has(p.id));
      const shop = locked('pizzeria')
        .sort((a, b) => a.cost - b.cost)
        .map((p) => {
          const b = btn(`${crustIco} ${fmt(p.cost)}`, 'green small', () => {
            if (save.crusts < p.cost) return;
            save.crusts -= p.cost;
            unlockPizza(p.id);
            newPizzas.add(p.id);
            save.pizzasNew = save.pizzasNew.filter((x) => x !== p.id);
            persist();
            audio.sfx('sfx_levelup');
            render();
          });
          b.disabled = save.crusts < p.cost;
          const t = tile(p, `unowned${openOn.pizza === p.id ? ' selected' : ''}`, b);
          t.dataset.pz = p.id;
          return t;
        });
      const prizes = locked('milestone')
        .map((p) => ({ p, m: MILESTONE_BY_PIZZA[p.id], pr: MILESTONE_BY_PIZZA[p.id] ? milestoneProgress(MILESTONE_BY_PIZZA[p.id].id) : ([0, 1] as [number, number]) }))
        .sort((a, b) => b.pr[0] / b.pr[1] - a.pr[0] / a.pr[1])
        .map(({ p, m, pr }) => tile(p, 'unowned pz-goal', h('div', { class: 'route' }, m ? m.name : 'A milestone prize'), bar(pr[0], pr[1])));
      const specials = locked('special')
        .sort((a, b) => a.cost - b.cost)
        .map((p) => {
          const n = save.specialSeen[p.id] ?? 0;
          return tile(p, 'unowned', h('div', { class: 'route' }, 'Turns up as a Chef’s Special in the shop'), h('div', { class: 'seen' }, n ? `Seen ${n} time${n === 1 ? '' : 's'}` : 'Not seen yet'));
        });
      const rare = locked('rare').map((p) => {
        // a silhouette until it's turned up once
        const seen = save.rareSeen.includes(p.id);
        const tier = tierAttrs(p.rarity);
        return h(
          'div',
          { class: `tile pz-tile unowned rare${seen ? ` ${tier.cls}` : ' unseen'}`, style: seen ? tier.style : undefined },
          // (its tier shows once it has turned up)
          ...(seen ? tierFrame(p.rarity) : []),
          h('img', { src: pizzaPortraitURL(p.id), alt: seen ? p.name : 'Unknown pizza', loading: 'lazy' }),
          h('div', { class: 'nm' }, seen ? p.name : '???'),
          h('div', { class: 'ds' }, seen ? p.perkText : 'A Rare Find'),
          h('div', { class: 'route' }, 'Turns up rarely on the new-run screen'),
          seen ? h('div', { class: 'seen' }, `${fmt(p.cost)} crusts when it turns up`) : null,
        );
      });
      // the ones you can act on first (buy with crusts, chase a goal), then what you own
      // filters: each unlock group (with unlocked/total), and an Unlocked only toggle
      const inGroup = (g: PzGroup) => PIZZAS.filter((p) => g === 'all' || p.route === g);
      const gCount = (g: PzGroup) => `${inGroup(g).filter((p) => has(p.id)).length}/${inGroup(g).length}`;
      const GROUPS: [PzGroup, string][] = [['all', 'ALL'], ['pizzeria', 'GOLDEN CRUSTS'], ['milestone', 'MILESTONES'], ['special', 'CHEF’S SPECIALS'], ['rare', 'RARE FINDS']];
      const gTabs = h('div', { class: 'tabs locker-tabs' }, ...GROUPS.map(([g, l]) => btn(`${l} <small>${gCount(g)}</small>`, `small ${pzGroup === g ? 'active' : ''}`, () => ((pzGroup = g), render()))));
      const gSelect = h('select', { class: 'locker-select', 'aria-label': 'How it unlocks' }) as HTMLSelectElement;
      for (const [g, l] of GROUPS) gSelect.append(h('option', { value: g, selected: g === pzGroup }, `${l === 'ALL' ? 'All pizzas' : l} · ${gCount(g)}`));
      gSelect.addEventListener('change', () => ((pzGroup = gSelect.value as PzGroup), render()));
      const filter = h('button', { class: `locker-filter${pzUnlockedOnly ? ' on' : ''}`, type: 'button', 'aria-pressed': pzUnlockedOnly ? 'true' : 'false', html: `<i>${pzUnlockedOnly ? '✔' : ''}</i>Unlocked only` });
      filter.addEventListener('click', () => {
        audio.sfx('sfx_click');
        pzUnlockedOnly = !pzUnlockedOnly;
        render();
      });
      const show = (g: Exclude<PzGroup, 'all'>) => pzGroup === 'all' || pzGroup === g;
      const ownedHere = owned.filter((p) => pzGroup === 'all' || p.route === pzGroup);
      const parts = pzUnlockedOnly
        ? []
        : [
            ...(show('pizzeria') ? section(`BUY WITH GOLDEN CRUSTS · ${shop.length}`, 'Unlock them here. Commons and Rares turn up now and then as a Chef’s Special too', shop) : []),
            ...(show('milestone') ? section(`MILESTONE PRIZES · ${prizes.length}`, 'Reach the goal and the pizza is yours', prizes) : []),
            ...(show('special') ? section(`CHEF’S SPECIALS · ${specials.length}`, 'Buy one in the shop with tips to unlock it for good', specials) : []),
            ...(show('rare') ? section(`RARE FINDS · ${rare.length}`, 'Only by luck, on the new-run screen', rare) : []),
          ];
      parts.push(...section(`ON THE MENU · ${ownedHere.length}`, 'Unlocked: these can turn up at the shop counter', ownedHere.map((p) => tile(p, '', h('div', { class: 'chip', style: 'background:var(--basil-d);color:#fff' }, 'ON THE MENU')))));
      return [
        h('div', { class: 'locker-bar pz-bar' }, gTabs, gSelect, filter),
        ...(parts.length ? parts : [h('p', { class: 'hint' }, 'Nothing here yet.')]),
      ];
    };
    // every topping in the game: seen ones in full, the rest as ??? in their rarity colour
    const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
    const toppingsTab = (): HTMLElement[] => {
      const seen = new Set(save.seenToppings);
      const rTabs = h('div', { class: 'tabs locker-tabs' });
      const rSelect = h('select', { class: 'locker-select', 'aria-label': 'Rarity' }) as HTMLSelectElement;
      const sTabs = h('div', { class: 'tabs locker-tabs' });
      const sSelect = h('select', { class: 'locker-select', 'aria-label': 'Seen or not' }) as HTMLSelectElement;
      const rOpts: ['all' | Rarity, string][] = [['all', 'ALL'], ...RARITIES.map((r) => [r, r.toUpperCase()] as [Rarity, string])];
      const sOpts: ['all' | 'seen' | 'unseen', string][] = [['all', 'ALL'], ['seen', 'SEEN'], ['unseen', 'NOT SEEN']];
      // seen/total on every rarity button (and how many each seen filter holds)
      const ofRarity = (v: 'all' | Rarity) => UPGRADES.filter((u) => v === 'all' || u.rarity === v);
      const rCount = (v: 'all' | Rarity) => `${ofRarity(v).filter((u) => seen.has(u.id)).length}/${ofRarity(v).length}`;
      const inRarity = ofRarity(rarity);
      const sCount = (v: 'all' | 'seen' | 'unseen') => String(v === 'all' ? inRarity.length : inRarity.filter((u) => (v === 'seen') === seen.has(u.id)).length);
      rTabs.append(...rOpts.map(([v, l]) => btn(`${l} <small>${rCount(v)}</small>`, `small ${rarity === v ? 'active' : ''}`, () => ((rarity = v), render()))));
      sTabs.append(...sOpts.map(([v, l]) => btn(`${l} <small>${sCount(v)}</small>`, `small ${seenFilter === v ? 'active' : ''}`, () => ((seenFilter = v), render()))));
      for (const [v, l] of rOpts) rSelect.append(h('option', { value: v, selected: v === rarity }, `${l === 'ALL' ? 'All rarities' : l} · ${rCount(v)}`));
      for (const [v, l] of sOpts) sSelect.append(h('option', { value: v, selected: v === seenFilter }, `${l === 'ALL' ? 'Seen and not seen' : l} · ${sCount(v)}`));
      rSelect.addEventListener('change', () => ((rarity = rSelect.value as typeof rarity), render()));
      sSelect.addEventListener('change', () => ((seenFilter = sSelect.value as typeof seenFilter), render()));
      const list = UPGRADES.filter((u) => (rarity === 'all' || u.rarity === rarity) && (seenFilter === 'all' || (seenFilter === 'seen') === seen.has(u.id))).sort(
        (a, b) => RARITIES.indexOf(a.rarity) - RARITIES.indexOf(b.rarity) || Number(seen.has(b.id)) - Number(seen.has(a.id)) || Number(newTops.has(b.id)) - Number(newTops.has(a.id)) || a.name.localeCompare(b.name),
      );
      const card = (u: (typeof UPGRADES)[number]) => {
        if (!seen.has(u.id)) return h('div', { class: `tcard unseen ${u.rarity}`, style: `--rc:${RARITY_COLOR[u.rarity]}`, 'aria-label': `Not seen yet: a ${u.rarity} topping` }, h('div', { class: 'q' }, '???'), h('div', { class: 'rarity' }, u.rarity));
        const k = kindOf(u);
        const runs = save.toppingRuns[u.id] ?? 0;
        return h(
          'div',
          { class: `tcard tframed ${u.rarity}${runs ? ' bought' : ''}`, style: `--rc:${RARITY_COLOR[u.rarity]}` },
          toppingFrame(u.rarity),
          h('div', { class: 'rarity ttab' }, u.rarity),
          h('div', { class: 'tc-top' }, h('span', { class: 'ic' }, u.icon), h('span', { class: `kind ${k}` }, k === 'permanent' ? 'PERMANENT' : k === 'unique' ? 'ONCE PER RUN' : 'ONE USE')),
          h('div', { class: 'nm' }, u.name),
          h('div', { class: 'ds' }, u.desc(1)),
          u.downside ? h('div', { class: 'down' }, `▼ ${u.downside}`) : null,
          runs ? h('div', { class: 'runs' }, h('span', { class: 'tick', 'aria-hidden': 'true' }, '✔'), `Bought in ${runs} run${runs === 1 ? '' : 's'}`) : null,
          newTops.has(u.id) ? h('span', { class: 'tag new' }, 'NEW') : null,
        );
      };
      return [
        h('div', { class: 'locker-bar tops-bar' }, rTabs, rSelect, sTabs, sSelect),
        h('div', { class: 'tops-note' }, `${seen.size ? `${UPGRADES.filter((u) => seen.has(u.id)).length} seen of ${UPGRADES.length}` : 'Nothing seen yet'} · a topping shows here once it's dealt in a shop`),
        list.length ? h('div', { class: 'tgrid' }, ...list.map(card)) : h('div', { class: 'hint' }, 'Nothing here yet.'),
      ];
    };
    render();
    let s: HTMLElement;
    const panel = h(
      'div',
      { class: 'panel modal wide pizzeria' },
      h('div', { class: 'win-head' }, h('div', { class: 'title' }, 'THE PIZZERIA'), balance),
      tabs,
      body,
      btn('DONE', 'green win-done', () => {
        this.close(s);
        onClose();
      }, { 'data-pad': 'back' }),
    );
    s = this.open(panel);
    // opened on a pizza (from the Pizzapedia): bring its card into view
    if (openOn.pizza) {
      requestAnimationFrame(() => {
        const t = body.querySelector<HTMLElement>(`[data-pz="${CSS.escape(openOn.pizza!)}"]`);
        if (t) body.scrollTop = t.offsetTop - body.offsetTop - 20;
      });
    }
    return s;
  }

  // ——— Unlocked this run: after every run (win, bank or loss), before its stats ———
  runSummary(o: RunSummary, onContinue: () => void): HTMLElement {
    let s: HTMLElement;
    const item = (art: HTMLElement, title: string, line: string, cls = '', isNew = false, extra: HTMLElement | null = null) =>
      h('div', { class: `rs-item ${cls}` }, art, h('div', { class: 'rs-tx' }, h('b', {}, title), h('span', {}, line), extra), isNew ? h('span', { class: 'tag new' }, 'NEW') : null);
    const img = (src: string, cls = '') => h('div', { class: `rs-art ${cls}` }, h('img', { src, alt: '' }));
    const ico = (t: string) => h('div', { class: 'rs-art ic' }, t);
    const sec = (title: string, items: HTMLElement[]) => (items.length ? [h('div', { class: 'section-title' }, title), h('div', { class: 'rs-grid' }, ...items)] : []);
    const bar = (have: number, need: number) => h('div', { class: 'pbar' }, h('i', { style: `width:${Math.round((100 * Math.min(have, need)) / need)}%` }), h('span', {}, `${fmt(have)}/${fmt(need)}`));
    const nothing = !o.pizzas.length && !o.peels.length && !o.milestones.length;
    const panel = h(
      'div',
      { class: 'panel modal wide runsum' },
      h('div', { class: 'rs-kicker' }, o.victory ? 'JOURNEY COMPLETE' : 'RUN OVER'),
      h('div', { class: 'title' }, 'UNLOCKED THIS RUN'),
      h('div', { class: 'crusts', html: `${CRUST_SVG.replace('class="coin"', 'style="width:1.2em;height:1.2em"')} +${fmt(o.crusts)} <span style="font-size:.55em">Golden Crusts earned</span>` }),
      h(
        'div',
        { class: 'scroll rs-body' },
        ...sec('NEW PIZZAS', o.pizzas.map((p) => item(img(pizzaPortraitURL(p.id)), p.name, p.why, 'pizza', true))),
        ...sec('NEW PEELS', o.peels.map((p) => item(img(peelThumbURL(p.id, 160), `peel${p.shiny ? ' shiny' : ''}`), p.name, p.shiny ? 'A shiny! Rare as anything' : p.how, p.shiny ? 'shiny' : '', true))),
        ...sec('MILESTONES', o.milestones.map((m) => item(ico('🏁'), m.name, m.pizza ? `Won ${m.pizza}` : '+50 Golden Crusts'))),
        nothing ? h('div', { class: 'rs-none' }, 'Nothing new unlocked this time, but every run counts towards your goals.') : null,
        ...sec('GETTING CLOSER', o.goals.map((g) => item(g.kind === 'pizza' ? img(pizzaPortraitURL(g.id)) : img(peelThumbURL(g.id, 160), 'peel'), g.name, '', 'goal', false, bar(g.have, g.need)))),
      ),
      h('div', { class: 'row' }, btn('CONTINUE', 'green big', () => {
        this.close(s);
        onContinue();
      }, { 'data-pad-default': '', 'data-pad': 'back', 'data-no-x': '' })),
    );
    s = this.open(panel);
    return s;
  }

  // ——— Pizzapedia ———
  pedia(onClose: () => void): HTMLElement {
    let tab: 'feet' | 'bosses' | 'pizzas' | 'places' | 'events' = 'feet';
    const tabs = h('div', { class: 'tabs' });
    const detail = h('div', { class: 'detail' });
    const body = h('div', { class: 'scroll', style: 'max-height:40cqh' });
    // a tile's portrait is made as it scrolls into view when its foot isn't drawn yet (feet are drawn in idle time
    // after boot: src/game/assets.ts), so opening the book never waits on every foot at once
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const img = e.target as HTMLImageElement;
          io.unobserve(img);
          const id = img.dataset.foot!;
          void footArtAsync(id).then(() => (img.src = footPortraitURL(id)));
        }
      },
      { root: body, rootMargin: '200px' },
    );
    const footImg = (id: string) => {
      const img = h('img', { alt: '', 'data-foot': id }) as HTMLImageElement;
      if (footArtReady(id)) img.src = footPortraitURL(id);
      else io.observe(img);
      return img;
    };
    const showFoot = (id: string) => {
      const f = FOOT_BY_ID[id];
      const seen = save.seenFeet.includes(id);
      const chips = h('div', { class: 'chips' });
      if (seen) {
        chips.append(h('span', { class: 'chip' }, `❤️ ${f.hp} HP`), h('span', { class: 'chip' }, `💨 ${Math.round(f.speed * 100)}% speed`));
        if (f.armor) chips.append(h('span', { class: 'chip' }, `🛡️ ${f.armor} armour`));
        chips.append(h('span', { class: 'chip' }, `🍕 ${f.stompDmg} slice stomp`));
        for (const t of f.traits) chips.append(h('span', { class: 'chip', style: 'background:var(--cheese)' }, TRAIT_INFO[t]));
      }
      const home = f.home ? BACKDROPS[f.home as keyof typeof BACKDROPS]?.name : null;
      detail.replaceChildren(
        h('img', { src: footPortraitURL(id), alt: '', style: seen ? '' : 'filter:brightness(0) opacity(.35)' }),
        h(
          'div',
          {},
          h('div', { class: 'dt-head' }, h('h3', {}, seen ? f.name : '???'), seen && home ? h('span', { class: 'chip home-chip' }, `🏠 ${home}`) : null),
          h('p', {}, seen ? f.desc : f.boss || f.mini ? `A ${f.mini ? 'mini-boss' : 'boss'} lurks at wave ${f.minWave}…` : `Appears from wave ${f.minWave}. Spot one to learn more.`),
          seen && (howToFor(f) || tellFor(f))
            ? h(
                'div',
                { class: 'ht' },
                howToFor(f) ? h('div', { class: 'howto' }, h('b', {}, 'HOW TO BEAT IT'), h('span', {}, howToFor(f)!)) : null,
                tellFor(f) ? h('div', { class: 'tell' }, h('b', {}, 'THE TELL'), h('span', {}, tellFor(f)!)) : null,
              )
            : null,
          chips,
        ),
      );
    };
    // a Rare Find stays a mystery until it has turned up once
    const hiddenRare = (p: PizzaType) => p.route === 'rare' && !save.unlockedPizzas.includes(p.id) && !save.rareSeen.includes(p.id);
    const showPizza = (id: string) => {
      const p = PIZZA_BY_ID[id];
      const owned = save.unlockedPizzas.includes(id);
      const ms = MILESTONE_BY_PIZZA[id];
      // how a locked pizza unlocks, by its route
      const how = p.route === 'special' ? '🔒 Chef’s Special in the shop' : p.route === 'milestone' ? `🔒 Milestone: ${ms?.name ?? 'a milestone'}` : p.route === 'rare' ? '🔒 Rare Find on the new-run screen' : `🔒 ${p.cost} Golden Crusts`;
      if (hiddenRare(p)) {
        detail.replaceChildren(h('img', { src: pizzaPortraitURL(id), alt: '', style: 'filter:brightness(0) opacity(0.35)' }), h('div', {}, h('div', { class: 'dt-head' }, h('h3', {}, '???'), h('span', { class: 'chip' }, how)), h('p', {}, 'A Rare Find. It turns up only by luck, in a lineup on the new-run screen.')));
        return;
      }
      // a crust pizza can be unlocked straight from here: the Pizzeria opens on it
      const go = !owned && p.route === 'pizzeria'
        ? btn(`UNLOCK IN THE PIZZERIA`, 'green small', () => {
            this.close(s);
            this.pizzeria(() => this.pedia(onClose), { tab: 'pizzas', pizza: id });
          })
        : null;
      const tier = tierAttrs(p.rarity);
      detail.replaceChildren(h('img', { src: pizzaPortraitURL(id), alt: '' }), h('div', {}, h('div', { class: 'dt-head' }, h('h3', {}, p.name), h('span', { class: `${tier.cls} pzr-inline`, style: tier.style }, tierLabel(p.rarity)), h('span', { class: 'chip' }, owned ? '✅ Unlocked' : how), go ? h('span', { class: 'dt-act' }, go) : null), h('p', {}, `Perk: ${p.perkText}`)));
    };
    const EVENTS: [string, string, string, string][] = [
      ['balloon', 'ev_balloon', 'Tip Balloon', 'Drifts across the top. One smack: 10 to 25 tips.'],
      ['drone', 'ev_drone', 'Delivery Drone', 'Zips across. Three smacks: a slice for your weakest pizza.'],
      ['moth', 'ev_moth', 'Pepper Moth', 'Flutters about. Two smacks: half a meter (Peel Slam or ability).'],
      ['seagull', 'ev_seagull', 'Golden Seagull', 'Very rare and fast. Two smacks: a Golden Crust.'],
      ['chest', 'ev_chest', 'Pizza Box Chest', 'Smash it open for tips, a free topping, slices or a crust.'],
      ['mimic', 'ev_mimic', 'Mimic Box', 'It wobbles. Smack it fast or it turns into a foot.'],
      ['sighting', 'ev_sighting', 'Hero Sighting', 'A hero streaks across the top. Smack it twice to catch it: tips, and a step towards that hero’s peel.'],
      ['charybdis', 'ev_charybdis', 'Charybdis', 'A whirlpool in Tartarus drags feet and your peel in. Smack its maw 5 times to close it.'],
    ];
    // places: a stage counts as seen once a run has reached it
    const placeSeen = (st: (typeof STAGES)[number]) => save.bestWave >= STAGES.indexOf(st) * 5 + 1 || (save.stageWaves[st.location] ?? 0) > 0;
    const showPlace = (st: (typeof STAGES)[number]) => {
      const i = STAGES.indexOf(st);
      const seen = placeSeen(st);
      const name = BACKDROPS[st.location as keyof typeof BACKDROPS]?.name ?? st.location;
      const boss = FOOT_BY_ID[st.boss];
      const mini = FOOT_BY_ID[st.mini];
      const locals = FEET.filter((f) => f.home === st.location && !f.boss && !f.mini);
      if (!seen) {
        detail.replaceChildren(h('img', { src: footPortraitURL(st.boss), alt: '', style: 'filter:brightness(0) opacity(.35)' }), h('div', {}, h('div', { class: 'dt-head' }, h('h3', {}, '???'), h('span', { class: 'chip' }, `Stage ${i + 1} · waves ${i * 5 + 1}–${i * 5 + 5}`)), h('p', {}, `Somewhere in ${actLabel(actOf(i * 5 + 1))}. Reach wave ${i * 5 + 1} to find out.`)));
        return;
      }
      detail.replaceChildren(
        h('img', { src: footPortraitURL(st.boss), alt: '' }),
        h(
          'div',
          {},
          h('div', { class: 'dt-head' }, h('h3', {}, name), h('span', { class: 'chip' }, `${actLabel(actOf(i * 5 + 1))} · stage ${i + 1} · waves ${i * 5 + 1}–${i * 5 + 5}`)),
          h('p', {}, `Mini-boss on wave ${i * 5 + 3}: ${save.seenFeet.includes(st.mini) ? mini?.name ?? '???' : '???'}. Boss on wave ${i * 5 + 5}: ${save.seenFeet.includes(st.boss) ? boss?.name ?? '???' : '???'}.`),
          locals.length ? h('p', {}, `Locals: ${locals.map((f) => (save.seenFeet.includes(f.id) ? f.name : '???')).join(', ')}.`) : null,
        ),
      );
    };
    const render = () => {
      io.disconnect();
      const feet = FEET.filter((f) => !f.boss && !f.mini);
      const bosses = FEET.filter((f) => f.boss || f.mini);
      tabs.replaceChildren(
        btn(`FEET ${feet.filter((f) => save.seenFeet.includes(f.id)).length}/${feet.length}`, `small ${tab === 'feet' ? 'active' : ''}`, () => ((tab = 'feet'), render())),
        btn(`BOSSES ${bosses.filter((f) => save.seenFeet.includes(f.id)).length}/${bosses.length}`, `small ${tab === 'bosses' ? 'active' : ''}`, () => ((tab = 'bosses'), render())),
        btn(`PIZZAS ${PIZZAS.filter((p) => save.unlockedPizzas.includes(p.id)).length}/${PIZZAS.length}`, `small ${tab === 'pizzas' ? 'active' : ''}`, () => ((tab = 'pizzas'), render())),
        btn(`PLACES ${STAGES.filter(placeSeen).length}/${STAGES.length}`, `small ${tab === 'places' ? 'active' : ''}`, () => ((tab = 'places'), render())),
        btn(`EVENTS ${EVENTS.filter(([id]) => save.seenEvents.includes(id)).length}/${EVENTS.length}`, `small ${tab === 'events' ? 'active' : ''}`, () => ((tab = 'events'), render())),
      );
      if (tab === 'feet' || tab === 'bosses') {
        const list = tab === 'feet' ? feet : bosses;
        const tiles = list.map((f) => {
          const seen = save.seenFeet.includes(f.id);
          const t = h('div', { class: `tile${seen ? '' : ' locked'}${f.boss ? ' boss' : ''}`, tabindex: 0 }, footImg(f.id), h('div', { class: 'nm' }, seen ? f.name : '???'), f.boss ? h('span', { class: 'tag' }, 'BOSS') : f.mini ? h('span', { class: 'tag' }, 'MINI') : null);
          t.addEventListener('click', () => {
            audio.sfx('sfx_click');
            showFoot(f.id);
          });
          return t;
        });
        body.replaceChildren(h('div', { class: 'grid' }, ...tiles));
        const lastSeen = [...save.seenFeet].reverse().find((id) => list.some((f) => f.id === id));
        showFoot(lastSeen ?? list[0].id);
      } else if (tab === 'pizzas') {
        const pTile = (p: PizzaType) => {
          const owned = save.unlockedPizzas.includes(p.id);
          const hide = hiddenRare(p);
          // locked pizzas are dimmed, with how they unlock under the name
          const route = owned ? null : p.route === 'pizzeria' ? `${fmt(p.cost)} crusts` : p.route === 'milestone' ? 'Milestone' : p.route === 'special' ? 'Chef’s Special' : 'Rare Find';
          const tier = tierAttrs(p.rarity);
          const t = h('div', { class: `tile pz-tile${hide ? ' locked' : ` ${tier.cls}`}${hide || owned ? '' : ' unowned'}`, style: hide ? undefined : tier.style, tabindex: 0 }, ...(hide ? [] : tierFrame(p.rarity)), h('img', { src: pizzaPortraitURL(p.id), alt: '', loading: 'lazy' }), h('div', { class: 'nm' }, hide ? '???' : p.name), route ? h('div', { class: 'ds' }, route) : null, owned ? null : h('span', { class: 'tag' }, '🔒'));
          t.addEventListener('click', () => {
            audio.sfx('sfx_click');
            showPizza(p.id);
          });
          return t;
        };
        const group = (title: string, list: PizzaType[]) => (list.length ? [h('div', { class: 'pz-sec' }, h('b', {}, `${title} · ${list.length}`)), h('div', { class: 'grid' }, ...list.map(pTile))] : []);
        const has = (p: PizzaType) => save.unlockedPizzas.includes(p.id);
        const lockedBy = (r: PizzaType['route']) => PIZZAS.filter((p) => !has(p) && p.route === r);
        body.replaceChildren(
          ...group('UNLOCKED', PIZZAS.filter(has)),
          ...group('BUY WITH GOLDEN CRUSTS (IN THE PIZZERIA)', lockedBy('pizzeria').sort((a, b) => a.cost - b.cost)),
          ...group('MILESTONE PRIZES', lockedBy('milestone')),
          ...group('CHEF’S SPECIALS', lockedBy('special')),
          ...group('RARE FINDS', lockedBy('rare')),
        );
        showPizza((PIZZAS.find(has) ?? PIZZAS[0]).id);
      } else if (tab === 'places') {
        const tiles = STAGES.map((st, i) => {
          const seen = placeSeen(st);
          const t = h('div', { class: `tile${seen ? '' : ' locked'}`, tabindex: 0 }, footImg(st.boss), h('div', { class: 'nm' }, seen ? BACKDROPS[st.location as keyof typeof BACKDROPS]?.name ?? st.location : '???'), h('div', { class: 'ds' }, `Act ${actOf(i * 5 + 1)} · W${i * 5 + 1}–${i * 5 + 5}`));
          t.addEventListener('click', () => {
            audio.sfx('sfx_click');
            showPlace(st);
          });
          return t;
        });
        body.replaceChildren(h('div', { class: 'grid' }, ...tiles));
        showPlace(STAGES.find(placeSeen) ?? STAGES[0]);
      } else {
        body.replaceChildren(
          h(
            'div',
            { class: 'grid events' },
            ...EVENTS.map(([id, key, name, desc]) => {
              const seen = save.seenEvents.includes(id);
              return h('div', { class: `tile${seen ? '' : ' locked'}` }, h('img', { src: textureURL(key), alt: '' }), h('div', { class: 'nm' }, seen ? name : '???'), h('div', { class: 'ds' }, seen ? desc : 'Not spotted yet'));
            }),
          ),
        );
        detail.replaceChildren(h('div', { class: 'span' }, h('h3', {}, 'Wave events'), h('p', {}, 'About one wave in four, something flies in or lands on the table. Smacks only go to it when no foot is closer.')));
      }
    };
    render();
    let s: HTMLElement;
    const panel = h(
      'div',
      { class: 'panel modal wide pedia' },
      h('div', { class: 'win-head' }, h('div', { class: 'title' }, 'PIZZAPEDIA')),
      tabs,
      detail,
      body,
      btn('DONE', 'green win-done', () => {
        this.close(s);
        onClose();
      }, { 'data-pad': 'back' }),
    );
    s = this.open(panel);
    return s;
  }

  /** Peel picker (from the run-start screen): the Peel Locker on unlocked peels, picking the peel you play with
   * ('ability') or the look you wear over it ('look'); picking one closes it. */
  peelPicker(onDone: () => void, mode: 'ability' | 'look' = 'ability'): HTMLElement {
    return this.locker(onDone, mode);
  }

  // ——— Peel Locker: every peel, the achievements that unlock them, and what you equip and wear ———
  locker(onClose: () => void, pickMode: 'ability' | 'look' | null = null): HTMLElement {
    const pick = !!pickMode;
    type Tab = 'all' | 'goals' | 'crusts' | 'feet' | 'bosses' | 'pizzas' | 'places' | 'acts' | 'events' | 'shiny' | 'zombies' | 'heroes';
    const TAB_GROUPS: Record<Exclude<Tab, 'goals'>, PeelGroup[]> = {
      all: [...new Set(PEELS.map((d) => d.group))].filter((g) => g !== 'god'),
      crusts: ['classic', 'golden', 'jewel', 'master'],
      feet: ['foot'],
      bosses: ['boss'],
      pizzas: ['pizza'],
      places: ['place'],
      acts: ['act'],
      events: ['event'],
      shiny: ['shinyFoot', 'shinyEvent'],
      zombies: ['zombieFoot'],
      heroes: ['hero'],
    };
    const NAMES: Record<Tab, string> = { all: 'ALL', goals: 'GOALS', crusts: 'CRUSTS', feet: 'FEET', bosses: 'BOSSES', pizzas: 'PIZZAS', places: 'PLACES', acts: 'ACTS', events: 'EVENTS', shiny: 'SHINY', zombies: 'ZOMBIES', heroes: 'HEROES' };
    // catch up on goals already met (older saves, bosses beaten before peels existed)
    checkPeelAchievements();
    const fresh = new Set(save.peelsNew);
    save.peelsNew = [];
    persist();
    let tab: Tab = 'all';
    // the picker opens on what you can use right now; the locker on everything
    let unlockedOnly = pick;
    let selected: PeelDef = pickMode === 'look' ? wornSkin() ?? equippedPeel() : equippedPeel();
    let s: HTMLElement;
    const finish = () => {
      this.close(s);
      onClose();
    };
    const tabs = h('div', { class: 'tabs locker-tabs' });
    const tabSelect = h('select', { class: 'locker-select', 'aria-label': 'Peel type' }) as HTMLSelectElement;
    const filter = h('button', { class: 'locker-filter', type: 'button', 'data-fk': 'filter:unlocked' }) as HTMLButtonElement;
    const toolbar = h('div', { class: 'locker-bar' }, tabs, tabSelect, filter);
    const detail = h('div', { class: 'detail peel-detail' });
    const body = h('div', { class: 'scroll' });
    // the God Peel's gold slot, pinned above the tabs
    const godSlot = h('div', { class: 'god-slot', tabindex: 0, role: 'button', 'data-fk': 'god-slot' });
    const crustLine = h('div', { class: 'crusts' });
    // undiscovered shinies stay a mystery
    const hidden = (d: PeelDef) => !!d.shiny && (d.group === 'shinyFoot' || d.group === 'shinyEvent') && !hasPeel(d.id);
    const shownName = (d: PeelDef) => (hidden(d) && d.ultra ? '???' : d.name);
    const inTab = (t: Exclude<Tab, 'goals'>) => PEELS.filter((d) => TAB_GROUPS[t].includes(d.group));
    const shown = (list: PeelDef[]) => (unlockedOnly ? list.filter((d) => hasPeel(d.id)) : list);
    const tabsShown = () => (Object.keys(NAMES) as Tab[]).filter((t) => !(t === 'goals' && unlockedOnly));
    // thumbnails are made lazily as tiles scroll into view, a few per frame (from the art cache where it has them,
    // drawn otherwise), so the window keeps scrolling while they fill in; tiles on screen go first
    const thumbQ: HTMLImageElement[] = [];
    let pumping = false;
    const onScreen = (img: HTMLImageElement) => {
      const b = body.getBoundingClientRect();
      const r = img.getBoundingClientRect();
      return r.bottom > b.top && r.top < b.bottom;
    };
    const fillThumb = async (img: HTMLImageElement) => {
      const id = img.dataset.peel!;
      img.src = await peelThumbAsync(id);
      // a living peel plays over its tile (asked only now: it needs the foot's art)
      if (img.isConnected && hasPeel(id) && hasAnimatedLook(id)) animateLookImg(img, id);
    };
    const pumpThumbs = async () => {
      if (pumping) return;
      pumping = true;
      let t0 = performance.now();
      while (thumbQ.length) {
        // (a re-render drops the old tiles)
        for (let i = thumbQ.length - 1; i >= 0; i--) if (!thumbQ[i].isConnected) thumbQ.splice(i, 1);
        if (!thumbQ.length) break;
        // thumbnails already made or in the art cache are only decodes: ask for them all at once
        for (let i = thumbQ.length - 1; i >= 0; i--) if (peelThumbReady(thumbQ[i].dataset.peel!)) void fillThumb(thumbQ.splice(i, 1)[0]);
        if (!thumbQ.length) break;
        // the rest are drawn, one at a time
        const at = thumbQ.findIndex(onScreen);
        await fillThumb(thumbQ.splice(Math.max(0, at), 1)[0]);
        // give the frame back once this one has had ~8 ms of thumbnail work
        if (performance.now() - t0 > 8) {
          await new Promise<void>((r) => requestAnimationFrame(() => r()));
          t0 = performance.now();
        }
      }
      pumping = false;
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const img = e.target as HTMLImageElement;
          io.unobserve(img);
          thumbQ.push(img);
        }
        void pumpThumbs();
      },
      { root: body, rootMargin: '200px' },
    );
    const bar = (have: number, need: number) =>
      h('div', { class: 'pbar' }, h('i', { style: `width:${Math.round((100 * have) / need)}%` }), h('span', {}, `${fmt(have)}/${fmt(need)}`));
    // re-render in place: keep the scroll position and the focused tile
    const refresh = (focusId?: string) => {
      const sc = body.scrollTop;
      render();
      body.scrollTop = sc;
      if (focusId) body.querySelector<HTMLElement>(`[data-fk="${CSS.escape(focusId)}"]`)?.focus();
    };
    const showDetail = () => {
      const d = selected;
      const owned = hasPeel(d.id);
      const equipped = equippedPeel().id === d.id;
      const worn = wornSkin()?.id === d.id;
      const pr = d.progress?.();
      const actions: HTMLElement[] = [];
      if (owned) {
        // equip: the peel's ability (and its look, unless another look is worn)
        const eq = btn(equipped ? 'EQUIPPED' : 'EQUIP', equipped ? 'cream small' : 'green small', () => {
          equipPeel(d.id);
          audio.sfx('sfx_upgrade');
          if (pick) return finish();
          refresh(d.id);
        });
        (eq as HTMLButtonElement).disabled = equipped;
        eq.title = 'Use this peel and its ability';
        // picking a look only offers the look, and wearing one closes the picker
        // wear: only the look, over whichever peel is equipped
        const look = btn(worn ? 'TAKE OFF LOOK' : 'WEAR LOOK', worn ? 'cream small' : 'yellow small', () => {
          wearSkin(worn ? null : d.id);
          audio.sfx('sfx_click');
          if (pickMode === 'look') return finish();
          refresh(d.id);
        });
        look.title = worn ? 'Go back to the equipped peel’s own look' : 'Look like this peel, whatever peel is equipped';
        if (pickMode !== 'look') actions.push(eq);
        if (pickMode !== 'ability') actions.push(look);
      } else if (d.cost) {
        const buy = btn(`BUY ${CRUST_SVG.replace('class="coin"', 'class="coin-ico"')} ${fmt(d.cost)}`, 'green small', () => {
          if (!buyPeel(d.id)) return;
          audio.sfx('sfx_coin');
          refresh(d.id);
        });
        (buy as HTMLButtonElement).disabled = save.crusts < d.cost;
        actions.push(buy);
      }
      const img = h('img', { src: peelThumbURL(d.id, 300), alt: '' });
      const chips = [
        h('span', { class: 'chip' }, owned ? '✅ Unlocked' : '🔒 Locked'),
        d.shiny ? h('span', { class: 'chip shiny-chip' }, d.ultra ? '💎 Ultra rare' : '✨ Shiny') : null,
        worn ? h('span', { class: 'chip look-chip' }, '👕 Worn look') : null,
      ];
      // hear its smack (alternate presses play the heavy, crit version)
      let hear: HTMLElement | null = null;
      if (!hidden(d)) {
        hear = h('button', { class: 'btn cream small smack-play', type: 'button', title: 'Hear its smack (press again for a crit)', 'aria-label': `Hear the ${shownName(d)} smack` }, '▶');
        hear.addEventListener('click', (e) => {
          e.stopPropagation();
          void previewSmack(d.id);
          // a living peel answers its smack (toes splay, wood flexes and throws flour, copper rings)
          smackLookImg(img as HTMLImageElement);
        });
      }
      detail.replaceChildren(
        h('div', { class: 'peel-big-wrap' }, h('div', { class: `peel-big${d.shiny ? ' shiny' : ''}${hidden(d) ? ' hidden' : ''}` }, img), hear),
        h(
          'div',
          {},
          // one row: name, status pills, then the ability's kind and name; the actions sit on the right
          h('div', { class: 'dt-head' }, h('h3', {}, shownName(d)), ...chips, ...(hidden(d) && d.ultra ? [] : abilityBits(d.id).slice(0, 2)), actions.length ? h('span', { class: 'dt-act' }, ...actions) : null),
          h('div', { class: 'dt-how' }, h('p', d.tip ? { title: d.tip, class: 'has-tip' } : {}, d.how), pr && !owned ? bar(pr[0], pr[1]) : null),
          hidden(d) && d.ultra ? null : h('p', { class: 'dt-desc' }, abilityBits(d.id)[2]),
        ),
      );
      // peels with a live look (Zeus's lightning) play it over the big preview
      if (!hidden(d)) animateLookImg(img as HTMLImageElement, d.id);
    };
    const tile = (d: PeelDef) => {
      const owned = hasPeel(d.id);
      const pr = d.progress?.();
      const img = h('img', { alt: '', 'data-peel': d.id });
      io.observe(img);
      const equipped = equippedPeel().id === d.id;
      const worn = wornSkin()?.id === d.id;
      const t = h(
        'div',
        { class: `tile peel-tile${owned ? '' : ' locked'}${hidden(d) ? ' hidden' : ''}${d.shiny && owned ? ' shiny' : ''}${selected.id === d.id ? ' selected' : ''}`, tabindex: 0, 'data-fk': d.id },
        img,
        h('div', { class: 'nm' }, shownName(d).replace(/ Peel$/, '')),
        pick && owned ? h('div', { class: 'ab' }, d.id === 'classic' ? 'Peel Slam' : abilityFor(d.id).name) : null,
        !owned && pr ? bar(pr[0], pr[1]) : null,
        !owned && d.cost ? h('div', { class: 'cost' }, `${fmt(d.cost)} crusts`) : null,
        equipped ? h('span', { class: 'tag' }, 'ON') : fresh.has(d.id) ? h('span', { class: 'tag new' }, 'NEW') : null,
        worn ? h('span', { class: 'tag look', title: 'Worn look' }, 'LOOK') : null,
        // a pizza peel: its pizza's tier
        d.group === 'pizza' && PIZZA_BY_ID[d.id.slice(6)] ? tierGem(PIZZA_BY_ID[d.id.slice(6)].rarity) : null,
      );
      activatable(t);
      // (its living look starts once the thumbnail is in: the observer above)
      t.addEventListener('click', () => {
        audio.sfx('sfx_click');
        selected = d;
        body.querySelectorAll('.tile.selected').forEach((e) => e.classList.remove('selected'));
        t.classList.add('selected');
        showDetail();
      });
      return t;
    };
    const grid = (list: PeelDef[]) => h('div', { class: 'grid peel-grid' }, ...shown(list).map(tile));
    const section = (title: string, groups: PeelGroup[], note: string, list: PeelDef[]) => {
      const mine = shown(list.filter((d) => groups.includes(d.group)));
      return mine.length ? [h('div', { class: 'sec-head' }, `${title} · ${count(groups)}`, h('span', {}, note)), grid(mine)] : [];
    };
    const count = (groups: PeelGroup[]) => {
      const list = PEELS.filter((d) => groups.includes(d.group));
      return `${list.filter((d) => hasPeel(d.id)).length}/${list.length}`;
    };
    // a tab's count: ALL counts the God Peel too (pinned in its slot above the tabs rather than on the grid), so it
    // agrees with the header's count of every peel
    const tabCount = (t: Exclude<Tab, 'goals'>) => count(t === 'all' ? [...TAB_GROUPS.all, 'god'] : TAB_GROUPS[t]);
    const setTab = (t: Tab) => {
      tab = t;
      // keep the selected peel if it's on this tab, otherwise show the equipped one or the tab's first
      if (t !== 'goals') {
        const list = shown(inTab(t));
        if (!list.some((d) => d.id === selected.id)) selected = list.find((d) => d.id === equippedPeel().id) ?? list[0] ?? selected;
      }
    };
    const render = () => {
      if (!tabsShown().includes(tab)) setTab('all');
      const label = (t: Tab) => (t === 'goals' ? NAMES[t] : `${NAMES[t]} <small>${tabCount(t)}</small>`);
      tabs.replaceChildren(
        ...tabsShown().map((t) =>
          btn(label(t), `small ${tab === t ? 'active' : ''}`, () => {
            setTab(t);
            keepFocus(tabs, render);
          }, { 'data-fk': `tab:${t}`, 'aria-pressed': tab === t ? 'true' : 'false' }),
        ),
      );
      // narrow screens: the same tabs as a dropdown
      tabSelect.replaceChildren(
        ...tabsShown().map((t) => {
          const o = h('option', { value: t }, t === 'goals' ? 'Goals' : `${NAMES[t][0]}${NAMES[t].slice(1).toLowerCase()} · ${tabCount(t)}`) as HTMLOptionElement;
          o.selected = tab === t;
          return o;
        }),
      );
      filter.classList.toggle('on', unlockedOnly);
      filter.setAttribute('aria-pressed', unlockedOnly ? 'true' : 'false');
      filter.innerHTML = `<i>${unlockedOnly ? '✔' : ''}</i>Unlocked only`;
      crustLine.innerHTML = `${CRUST_SVG} <b>${fmt(save.crusts)}</b> Golden Crusts · ${PEELS.filter((d) => hasPeel(d.id)).length}/${PEELS.length} peels`;
      renderGodSlot();
      if (tab === 'goals') {
        // the achievements closest to done
        const goals = PEELS.filter((d) => d.progress && !hasPeel(d.id))
          .map((d) => ({ d, p: d.progress!() }))
          .sort((a, b) => b.p[0] / b.p[1] - a.p[0] / a.p[1] || a.p[1] - b.p[1])
          .slice(0, 40);
        body.replaceChildren(
          goals.length
            ? h(
                'div',
                { class: 'goals' },
                ...goals.map(({ d, p }) => {
                  const img = h('img', { alt: '', 'data-peel': d.id });
                  io.observe(img);
                  const row = activatable(h('div', { class: 'goal', tabindex: 0, 'data-fk': `goal:${d.id}` }, img, h('div', { class: 'gt' }, h('b', {}, d.name), h('span', {}, d.how)), bar(p[0], p[1])));
                  row.addEventListener('click', () => {
                    audio.sfx('sfx_click');
                    selected = d;
                    showDetail();
                  });
                  return row;
                }),
              )
            : h('p', { class: 'hint' }, 'Every achievement peel is unlocked. Shinies are still out there…'),
        );
      } else {
        const list = inTab(tab);
        let parts: HTMLElement[];
        if (tab === 'shiny') {
          parts = [
            ...section('SHINY FEET', ['shinyFoot'], 'Any foot can rarely turn up shiny. Defeat it for its shiny peel.', list),
            ...section('EVENT SHINIES', ['shinyEvent'], 'Rare drops from wave events, and a few extremely rare jewels.', list),
          ];
        } else if (tab === 'heroes') {
          // heroes, then the Greek and Norse gods, each with its own count
          parts = HERO_SUBS.flatMap(([sub, title, note]) => {
            const mine = list.filter((d) => d.sub === sub);
            const shownHere = shown(mine);
            return shownHere.length ? [h('div', { class: 'sec-head' }, `${title} · ${mine.filter((d) => hasPeel(d.id)).length}/${mine.length}`, h('span', {}, note)), grid(mine)] : [];
          });
        } else if (tab === 'zombies') {
          parts = section('ZOMBIFIED FEET', ['zombieFoot'], 'Defeat a zombified foot for its peel: its own ability plus Zombie Outbreak.', list);
        } else if (tab === 'crusts') {
          parts = [grid(list.filter((d) => d.group !== 'jewel')), ...section('THE JEWELLERY BOX', ['jewel'], 'Shiny peels for serious crust savers.', list)];
        } else parts = [grid(list)];
        const any = parts.some((p) => p.querySelector('.tile'));
        body.replaceChildren(...(any ? parts : [h('p', { class: 'hint' }, 'None unlocked here yet. Turn off “Unlocked only” to see how to get them.')]));
      }
      showDetail();
    };
    const renderGodSlot = () => {
      const g = PEEL_BY_ID[GOD_PEEL];
      const owned = hasPeel(GOD_PEEL);
      const [have, need] = g.progress!();
      godSlot.className = `god-slot${owned ? ' owned' : ' sealed'}${selected.id === GOD_PEEL ? ' selected' : ''}${pick && !owned ? ' hide' : ''}`;
      godSlot.title = owned ? g.name : 'The God Peel: sealed until every other peel is yours, the shinies and the ultra-rare jewels included.';
      godSlot.replaceChildren(
        h('div', { class: 'gs-pic' }, h('i', { class: 'gs-halo' }), h('img', { src: peelThumbURL(GOD_PEEL, 200), alt: '' }), owned ? null : h('span', { class: 'gs-seal', 'aria-hidden': 'true' }, '🔒')),
        h(
          'div',
          { class: 'gs-body' },
          h('b', {}, owned ? g.name.toUpperCase() : 'THE GOD PEEL'),
          h('span', {}, owned ? (equippedPeel().id === GOD_PEEL ? 'Equipped. The gods are pleased.' : 'Yours. Pick it to equip it.') : 'Sealed until every other peel is yours, the shinies and the ultra-rare jewels included.'),
          owned ? null : bar(have, need),
        ),
        ...(equippedPeel().id === GOD_PEEL ? [h('span', { class: 'tag' }, 'ON')] : []),
      );
    };
    activatable(godSlot);
    godSlot.addEventListener('click', () => {
      audio.sfx('sfx_click');
      selected = PEEL_BY_ID[GOD_PEEL];
      body.querySelectorAll('.tile.selected').forEach((e) => e.classList.remove('selected'));
      renderGodSlot();
      showDetail();
    });
    tabSelect.addEventListener('change', () => {
      audio.sfx('sfx_click');
      setTab(tabSelect.value as Tab);
      body.scrollTop = 0;
      render();
    });
    filter.addEventListener('click', () => {
      audio.sfx('sfx_click');
      unlockedOnly = !unlockedOnly;
      if (unlockedOnly && !hasPeel(selected.id)) selected = equippedPeel();
      body.scrollTop = 0;
      keepFocus(toolbar, render);
    });
    render();
    const panel = h(
      'div',
      { class: `panel modal wide locker${pick ? ' picking' : ''}` },
      // the title and the crust count share one row, and the X closes (the Done button stays for controllers)
      // the God Peel sits in the header as a compact gold pill (its full story shows in the detail panel when picked)
      h('div', { class: 'win-head' }, h('div', { class: 'title' }, pickMode === 'look' ? 'PICK A LOOK' : pick ? 'PICK A PEEL' : 'PEEL LOCKER'), crustLine, godSlot),
      toolbar,
      detail,
      body,
      btn(pick ? 'BACK' : 'DONE', `${pick ? 'cream' : 'green'} win-done`, finish, { 'data-pad': 'back' }),
    );
    s = this.open(panel);
    this.onClose(s, () => {
      io.disconnect();
      stopLookOverlays();
    });
    this.godReveal(() => refresh());
    // start with the equipped peel in view
    // (scroll the grid only: scrollIntoView would also scroll the screen behind it)
    requestAnimationFrame(() => {
      const t = body.querySelector<HTMLElement>('.tile.selected');
      if (t) body.scrollTop = t.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - (body.clientHeight - t.offsetHeight) / 2;
    });
    return s;
  }
  /** A plain yes/no confirm. */
  confirm(title: string, text: string, yes: string, onYes: () => void, onNo: () => void): HTMLElement {
    let s: HTMLElement;
    const panel = h(
      'div',
      { class: 'panel modal confirm' },
      h('div', { class: 'title', style: 'font-size:3.2em' }, title),
      h('div', { class: 'subtitle' }, text),
      h('div', { class: 'row' }, btn('CANCEL', 'cream', () => {
        this.close(s);
        onNo();
      }, { 'data-pad': 'back', 'data-pad-default': '' }), btn(yes, 'danger', () => {
        this.close(s);
        onYes();
      })),
    );
    s = this.open(panel);
    return s;
  }

  // ——— Credits ———
  credits(onClose: () => void): HTMLElement {
    const list = h('div', { class: 'credits scroll', style: 'max-height:56cqh' }, h('p', {}, 'Loading credits…'));
    fetch('audio/credits.json')
      .then((r) => r.json())
      .then((items: { file: string; title: string; author: string; license: string; url: string; attribution?: string }[]) => {
        list.replaceChildren(
          h('div', { class: 'section-title' }, 'GAME'),
          h('p', {}, 'Design, code and all procedural art: made for Feetza. Fonts: Lilita One & Fredoka (SIL Open Font License).'),
          h('div', { class: 'section-title' }, 'MUSIC & SOUND'),
          ...items.map((c) =>
            h('p', {}, h('b', {}, `${c.title}`), ` by ${c.author} · ${c.license} · `, h('a', { href: c.url, target: '_blank', rel: 'noopener' }, 'source'), c.attribution ? h('div', { style: 'font-size:.85em;opacity:.8' }, c.attribution) : null),
          ),
        );
      })
      .catch(() => list.replaceChildren(h('p', {}, 'Credits unavailable offline.')));
    let s: HTMLElement;
    const panel = h(
      'div',
      { class: 'panel modal' },
      h('div', { class: 'title' }, 'CREDITS'),
      list,
      btn('DONE', 'green', () => {
        this.close(s);
        onClose();
      }, { 'data-pad': 'back' }),
    );
    s = this.open(panel);
    return s;
  }
}

let logoId = 0;
function logo(): HTMLElement {
  const id = `lg${logoId++}`;
  return h('div', {
    class: 'logo',
    html: `<svg viewBox="0 0 1000 270" aria-label="Feetza"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6b8"/><stop offset=".38" stop-color="#ffd23f"/><stop offset=".72" stop-color="#ff9f1c"/><stop offset="1" stop-color="#e5402a"/></linearGradient></defs>
<g font-family="Lilita One, Fredoka, sans-serif" font-size="236" text-anchor="middle" letter-spacing="6">
<text x="500" y="228" fill="#2a1810" stroke="#2a1810" stroke-width="30" stroke-linejoin="round">FEET<tspan rotate="-9">Z</tspan>A</text>
<text x="500" y="212" fill="url(#${id})" stroke="#2a1810" stroke-width="22" stroke-linejoin="round" paint-order="stroke fill">FEET<tspan rotate="-9">Z</tspan>A</text>
<text x="500" y="212" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="4" transform="translate(-3 -5)">FEET<tspan rotate="-9">Z</tspan>A</text>
</g></svg>`,
  });
}

/** The journey's acts as a row of medals: done ones gold, the one just finished (cur) glowing. */
function actTrack(acts: number, cur: number): HTMLElement {
  return h(
    'div',
    { class: 'act-track', 'aria-label': `Act ${cur} of ${acts}` },
    ...Array.from({ length: acts }, (_, i) => h('span', { class: i + 1 < cur ? 'done' : i + 1 === cur ? 'done cur' : '' }, String(i + 1))),
  );
}

function stat(v: string, label: string): HTMLElement {
  return h('div', { class: 'stat' }, h('b', {}, v), h('span', {}, label));
}

export const ui = new UI();

/** What a returning player keeps, listing only the things they have. */
function welcomeKeep(): string {
  const metaLevels = Object.values(save.meta).reduce((n, l) => n + (l ?? 0), 0);
  const parts = [`${fmt(save.crusts)} Golden Crusts`];
  if (metaLevels) parts.push(`${metaLevels} Pizzeria upgrade${metaLevels === 1 ? '' : 's'}`);
  parts.push(`${save.unlockedPizzas.length} unlocked pizzas`);
  const list = parts.length > 2 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts.join(' and ');
  const bonus = save.welcomeBonus ? ` That includes +${fmt(save.welcomeBonus)} for the bosses you'd already beaten.` : '';
  return `You keep your ${list}.${bonus}`;
}
