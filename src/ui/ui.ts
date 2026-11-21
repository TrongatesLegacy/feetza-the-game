// DOM overlay UI: HUD, menus and modal screens. Rendered over the Phaser canvas and scaled with
// container query units (1em = 1% of the stage width) so it stays crisp at any size.

import { FEET, FOOT_BY_ID, TRAIT_INFO, howToFor, tellFor, type FootType } from '../data/feet';
import { META } from '../data/meta';
import { PIZZAS, PIZZA_BY_ID } from '../data/pizzas';
import { RARITY_COLOR, UPGRADE_BY_ID } from '../data/upgrades';
import { glyph, slamPrompt } from '../systems/gamepad';
import type { ShopActions, ShopPizza, ShopState } from './shopTypes';
import { INTROS, freshBar, pizzaThumb } from './bits';
import { footPortraitURL, pizzaPortraitURL, textureURL } from '../game/assets';
import { audio } from '../systems/audio';
import { bestFor, metaRefundValue, persist, resetEverything, resetMeta, resetProgress, save, updateSettings, type Settings } from '../systems/save';
import { HEATS, HEAT_BY_ID, type HeatId } from '../data/difficulty';
import { ACT_WAVES } from '../data/stages';
import { BACKDROPS } from '../art/backdrops';
import { applyA11y } from './a11y';
import { abilityFor, abilityKindLabel, describeAbility } from '../game/abilities';
import { PEELS, buyPeel, checkPeelAchievements, equipPeel, equippedPeel, hasPeel, peelThumbURL, wearSkin, wornSkin, type PeelDef, type PeelGroup } from '../game/peels';

type Attrs = Record<string, string | number | boolean | undefined>;

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

const fmt = (n: number) => Math.floor(n).toLocaleString('en-US');

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

/** A peel's ability as a line for the locker: kind pill, name and what it does. */
function abilityLine(peelId: string): HTMLElement {
  if (peelId === 'classic') return h('div', { class: 'abl' }, h('span', { class: 'chip' }, 'ACTIVE'), h('b', {}, 'Peel Slam'), h('span', {}, `${slamPrompt()} when the meter is full: smack every foot at once.`));
  const a = abilityFor(peelId);
  return h('div', { class: 'abl' }, h('span', { class: `chip ${abilityKindLabel(a).toLowerCase()}` }, abilityKindLabel(a)), h('b', {}, a.name), h('span', {}, describeAbility(a)));
}

export interface CounterOffer {
  id: string;
  name: string;
  perk: string;
  cost: number;
  trial: boolean;
}

class Hud {
  root: HTMLElement;
  private score = h('div', { class: 'score' }, '0');
  private wave = h('div', { class: 'wave' });
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
  private bossMove = h('div', { class: 'move' });
  private newFootEl: HTMLElement | null = null;
  /** When the current centre banner disappears (performance.now() ms). */
  private bannerUntil = 0;
  private slam = h('div', { class: 'slam', role: 'button', 'aria-label': 'Peel Slam' });
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
    this.coinPill.innerHTML = COIN_SVG;
    this.coinPill.append(this.coins);
    this.combo.append(this.comboLabel, this.comboMult, h('div', { class: 'timer' }, this.comboTimer));
    this.boss.append(h('div', { class: 'bossname' }, this.bossName, this.bossPhase), h('div', { class: 'track' }, this.bossTrail, this.bossHp, this.bossNotches), this.bossMove);
    this.slam.innerHTML = '<span>PEEL<br>SLAM<small class="kb">SPACE</small><small class="pd" data-glyph="X">X</small></span>';
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
      h('div', { class: 'tl' }, this.score, this.wave),
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
  }

  syncMute(): void {
    this.muteBtn.innerHTML = save.settings.muted ? ICONS.mute : ICONS.sound;
    this.fpsEl.style.display = save.settings.showFps ? '' : 'none';
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
    this.boss.classList.toggle('on', !!name);
    if (!name) {
      this.setBossMove(null);
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
  }

  /** The slam button: the Peel Slam, or the peel ability that replaces it this run. */
  setSlamLabel(name: string | null, kind: string | null): void {
    if (!name) {
      this.slam.innerHTML = '<span>PEEL<br>SLAM<small class="kb">SPACE</small><small class="pd" data-glyph="X">X</small></span>';
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
    this.slam.classList.add('ability');
    this.slam.classList.toggle('passive', passive);
    this.slam.setAttribute('aria-label', name);
  }

  setSuper(frac: number): void {
    this.slam.style.setProperty('--p', String(Math.min(1, frac)));
    this.slam.classList.toggle('ready', frac >= 1);
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
  setNewFootFade(on: boolean): void {
    this.newFootEl?.classList.toggle('faded', on);
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
      this.root.append(el);
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
    // long titles shrink to fit the screen instead of running off it
    const descPad = descEl ? parseFloat(getComputedStyle(descEl).paddingLeft) * 2 + parseFloat(getComputedStyle(descEl).borderLeftWidth) * 2 : 0;
    for (const el of b.querySelectorAll<HTMLElement>('.big, .small, .desc span')) {
      const room = b.clientWidth - (descEl?.contains(el) ? descPad : 0);
      if (el.scrollWidth > room) el.style.fontSize = `${(parseFloat(getComputedStyle(el).fontSize) * room) / el.scrollWidth}px`;
    }
    setTimeout(() => b.remove(), ms);
  }

  /** The boss's current move, under its health bar: name, then what to do about it. */
  setBossMove(name: string | null, info = ''): void {
    if (!name) {
      this.bossMove.replaceChildren();
      return;
    }
    const answer = info.split(' · ')[1] ?? info;
    this.bossMove.replaceChildren(h('b', {}, name), h('span', {}, answer));
  }

  private toastQueue: HTMLElement[] = [];

  /** Toasts stack two at a time; more wait their turn so the column never runs into the centre banner. */
  toast(img: string | null, title: string, text: string): void {
    const t = h('div', { class: 'toast panel' }, img ? h('img', { src: img, alt: '' }) : null, h('div', {}, h('b', {}, title), text));
    this.toastQueue.push(t);
    this.pumpToasts();
  }

  private pumpToasts(): void {
    while (this.toastQueue.length && this.toasts.childElementCount < 2) {
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

  private open(content: HTMLElement, dim = true): HTMLElement {
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
      h('span', { html: `Wave <b>${best.wave}</b> <small>${HEAT_BY_ID[save.heat].name}</small>` }),
      h('span', { html: `Crusts <b>${fmt(save.crusts)}</b>` }),
    );
    stats.classList.add('corner');
    const r = save.run;
    const cont = r && h_.resume
      ? h(
          'div',
          { class: 'continue panel' },
          h('div', { class: 'cont-text' }, h('span', { class: 'cont-tag' }, 'RUN IN PROGRESS'), h('b', {}, `Wave ${r.wave} · ${HEAT_BY_ID[r.heat].name} · ${r.wave >= ACT_WAVES ? 'Act 2' : 'Act 1'}`), h('span', {}, `${fmt(r.score)} points · ${r.pizzas.filter((p) => !p.dead).length} pizzas · saved at the shop`)),
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
        btn(`PIZZERIA${PIZZAS.some((p) => !save.unlockedPizzas.includes(p.id) && p.cost <= save.crusts) ? ' <span class="badge">NEW</span>' : ''}`, 'yellow', h_.pizzeria),
        btn(`PIZZAPEDIA <small style="font-size:.7em">${seen}/${FEET.length}</small>`, 'green', h_.pedia),
        btn(`PEELS${save.peelsNew.length ? ' <span class="badge">NEW</span>' : ''}`, 'yellow', h_.locker),
        btn('SETTINGS', 'cream', h_.settings),
        btn('CREDITS', 'cream', h_.credits),
      ),
    );
    const s = this.open(content, false);
    s.append(stats, madeBy());
    return s;
  }

  /** One-time welcome for players coming from the old version. */
  welcome(o: { keep: () => void; fresh: () => void }): HTMLElement {
    const news: [string, string][] = [
      ['Five heat levels', 'Mild to Inferno. Your bests move to Regular.'],
      ['Toppings now cost tips', 'Buy as many as you can afford between waves.'],
      ['Bosses fight in phases', 'Each one changes up at 66% and 33% health.'],
      ['Mini-bosses and wave events', 'Flyers and chests worth smacking.'],
      ['Pizzas go stale', 'Reheat them, or swap in fresh ones.'],
      ['A 60-wave journey', '12 stages, 24 bosses, an ending, then endless.'],
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
  lineup(ids: string[], shuffle: () => string[], onStart: (heat: HeatId, act2: boolean, ids: string[]) => void, onBack: () => void): HTMLElement {
    let cur = ids;
    let heat: HeatId = save.heat;
    let act2 = false;
    const unlocked = (hd: (typeof HEATS)[number]) => !hd.unlockAfter || save.act1Cleared.includes(hd.unlockAfter);
    const heatRow = h('div', { class: 'heats', 'data-pad-section': '' });
    const actRow = h('div', { class: 'acts', 'data-pad-section': '' });
    const startBtn = btn('', 'green big', () => {
      save.heat = heat;
      persist();
      onStart(heat, act2, cur);
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
            if (!save.act1Cleared.includes(heat)) act2 = false;
            render();
          });
          return b;
        }),
      );
      const act2ok = save.act1Cleared.includes(heat);
      const mk = (on: boolean, title: string, desc: string, enabled: boolean, val: boolean) => {
        const b = h('button', { class: `act${on ? ' on' : ''}`, type: 'button' }, h('b', {}, title), h('span', {}, desc)) as HTMLButtonElement;
        b.disabled = !enabled;
        b.addEventListener('click', () => {
          act2 = val;
          render();
        });
        return b;
      };
      actRow.replaceChildren(
        mk(!act2, 'Act 1 · wave 1', 'Trattoria, with your lineup below', true, false),
        mk(act2, 'Act 2 · wave 31', act2ok ? 'Starter kit: 5 pizzas, about 6 toppings and 420 tips' : `Locked: beat wave 30 on ${HEAT_BY_ID[heat].name}`, act2ok, true),
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
          { class: 'peelbox' },
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
    const renderLineup = () =>
      lineupRow.replaceChildren(
        ...cur.map((id) => {
          const p = PIZZA_BY_ID[id];
          return h('div', { class: 'lu' }, h('img', { src: pizzaPortraitURL(id), alt: p.name }), h('div', {}, h('b', {}, p.name), h('span', {}, p.perkText)));
        }),
      );
    renderLineup();
    const panel = h(
      'div',
      { class: 'panel modal wide prerun' },
      h('div', { class: 'title' }, 'NEW RUN'),
      h('div', { class: 'section-title' }, 'HEAT'),
      heatRow,
      h('div', { class: 'prerun-mid' }, h('div', {}, h('div', { class: 'section-title' }, 'START AT'), actRow), h('div', { class: 'peel-wrap' }, h('div', { class: 'section-title' }, 'YOUR PEEL'), peelCard)),
      h('div', { class: 'prerun-bottom' }, h('div', { class: 'section-title' }, "TONIGHT'S LINEUP"), lineupRow),
      h('div', { class: 'row' }, btn('BACK', 'cream', onBack, { 'data-pad': 'back' }), btn('SHUFFLE', 'yellow', () => {
        cur = shuffle();
        renderLineup();
      }, { 'data-pad': 'y' }), startBtn),
    );
    return this.open(panel);
  }

  // ——— Between-wave shop ———
  private shops = new WeakMap<HTMLElement, (st: ShopState) => void>();

  shop(st0: ShopState, act: ShopActions): HTMLElement {
    let st = st0;
    /** Topping ids already dealt onto the counter (they don't replay their entrance). */
    const dealt = new Set<string>();
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
        const b = btn(c.sold ? 'BOUGHT' : c.free ? 'FREE' : st.coins >= c.price ? `BUY · ${fmt(c.price)}` : `NEED ${fmt(c.price)}`, c.sold ? 'cream small' : c.free || st.coins >= c.price ? 'green small' : 'small', () => act.buy(c.id));
        b.disabled = c.sold || (!c.free && st.coins < c.price);
        const el = h(
          'div',
          { class: `card ${c.rarity}${c.sold ? ' sold' : ''}${dealt.has(c.id) ? ' dealt' : ''}`, tabindex: 0, role: 'button', 'aria-label': `${c.name}: ${c.desc}` },
          h('div', { class: 'key' }, String(i + 1)),
          h('span', { class: `kind ${c.kind}` }, c.kind === 'permanent' ? 'PERMANENT' : c.kind === 'unique' ? 'ONCE PER RUN' : 'ONE USE'),
          h('div', { class: 'rarity' }, c.rarity),
          h('div', { class: 'icon' }, c.icon),
          h('div', { class: 'name' }, c.name),
          h('div', { class: 'desc' }, c.desc),
          c.downside ? h('div', { class: 'down' }, `▼ ${c.downside}`) : null,
          h('div', { class: 'lvl' }, c.lvl),
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
        h('div', { class: 'cards' }, ...cards),
      );
      // table strip
      const table = h(
        'section',
        { class: 'shop-sec table', 'data-pad-section': '' },
        h('div', { class: 'sec-head' }, h('h2', {}, 'YOUR TABLE'), h('span', { class: `sec-chip${st.tableFull ? ' full' : ''}` }, `${st.table.length} / 5${st.tableFull ? ' FULL' : ''}`)),
        h(
          'div',
          { class: 'strip' },
          ...st.table.map((p) =>
            h(
              'div',
              { class: `ptile${p.stale ? ' stale' : ''}${p.dead ? ' dead' : ''}` },
              p.stale ? h('span', { class: 'flag' }, 'STALE') : p.dead ? h('span', { class: 'flag dead' }, 'TOAST') : null,
              sliceArt(p, 120),
              h('div', { class: 'nm' }, p.name),
              h('div', { class: `ds${p.stale ? ' off' : ''}` }, p.perk),
              h('div', { class: 'sl' }, `${p.slices} / ${p.max} slices`),
              p.freshOn && !p.dead ? freshBar(p.fresh, p.maxFresh) : null,
            ),
          ),
        ),
      );
      // counter + services
      const offers = st.offers.map((o) => {
        const b = btn(`${o.trial ? 'RENT' : 'BUY'} · ${fmt(o.cost)}`, `${st.coins >= o.cost ? 'green' : ''} small`, () => act.buyPizza(o.id));
        b.disabled = st.coins < o.cost;
        return h('div', { class: `offer${o.trial ? ' trial' : ''}` }, h('img', { src: pizzaPortraitURL(o.id), alt: '' }), h('div', { class: 'offer-text' }, o.trial ? h('span', { class: 'tag' }, "CHEF'S SPECIAL") : null, h('b', {}, o.name), h('span', {}, o.perk)), b);
      });
      const svc = (label: string, s: { cost: number; can: boolean }, fn: () => void, cls: string) => {
        const b = btn(`${label} · ${fmt(s.cost)}`, `${cls} small`, fn);
        b.disabled = !s.can;
        return b;
      };
      const services = h(
        'div',
        { class: 'services' },
        st.reheat.shown ? svc('REHEAT', st.reheat, act.reheat, 'yellow') : null,
        svc('HEAL ALL +2', st.heal, act.heal, 'green'),
        st.rebake.shown ? svc('REBAKE', st.rebake, act.rebake, '') : null,
      );
      const counter = h(
        'section',
        { class: 'shop-sec counter2', 'data-pad-section': '' },
        h('div', { class: 'sec-head' }, h('h2', {}, 'PIZZA COUNTER'), st.tableFull ? h('span', { class: 'sec-note' }, 'Full: you pick one to swap') : null),
        ...(offers.length ? offers : [h('div', { class: 'hint' }, 'Unlock more pizzas in the Pizzeria to see them here.')]),
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
      const next = btn('NEXT WAVE', 'big next', () => act.next(), { 'data-pad': 'hold' });
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
    // stale and destroyed pizzas first: they're the obvious ones to swap
    const order = o.current.map((p, i) => ({ p, i })).sort((a, b) => Number(b.p.dead || b.p.stale) - Number(a.p.dead || a.p.stale));
    let picked = order[0]?.i ?? -1;
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
      else if (p) lose.replaceChildren(h('span', { class: 'lbl' }, 'YOU LOSE'), h('b', {}, p.name), h('span', {}, p.dead ? 'Already toast' : `${p.stale ? `Stale (perk off): ${p.perk}` : p.perk} · ${p.slices}/${p.max} slices left`));
      confirm.innerHTML = picked === -1 ? `ADD · ${fmt(o.cost)}` : `SWAP · ${fmt(o.cost)}`;
    };
    for (const { p, i } of order) {
      const t = h(
        'button',
        { class: `swaptile${p.stale ? ' stale' : ''}${p.dead ? ' dead' : ''}`, type: 'button', 'data-i': i },
        h('span', { class: 'flag out' }, 'SWAPPING OUT'),
        p.stale ? h('span', { class: 'flag' }, 'STALE') : p.dead ? h('span', { class: 'flag dead' }, 'TOAST') : null,
        pizzaThumb(p.id, p.slices, p.max, 200, p.stale, p.dead),
        h('span', { class: 'nm' }, p.name),
        h('span', { class: `ds${p.stale ? ' off' : ''}` }, p.perk),
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
      h('div', { class: 'swapfoot' }, lose, h('div', { class: 'diff gain' }, h('span', { class: 'lbl' }, 'YOU GAIN'), h('b', {}, o.name), h('span', {}, o.perk)), btn('CANCEL', 'cream', () => this.close(s), { 'data-pad': 'back' }), confirm),
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

  // ——— Victory after the 60-wave journey ———
  victory(o: { score: number; time: string; feet: number; bosses: number; heat: string; crusts: number; keepGoing: () => void; bank: () => void }): HTMLElement {
    const panel = h(
      'div',
      { class: 'victory' },
      h('div', { class: 'v-kicker' }, 'GHOST OF FEET PAST DEFEATED'),
      h('div', { class: 'v-title' }, 'PIZZA SAVED!'),
      h('div', { class: 'v-sub' }, 'Every foot from past to present, smacked. The table is yours.'),
      h('div', { class: 'stats' }, stat(fmt(o.score), 'Score'), stat(o.time, 'Run time'), stat(fmt(o.feet), 'Feet smacked'), stat(String(o.bosses), 'Bosses beaten'), stat(o.heat, 'Heat')),
      h('div', { class: 'crusts', html: `${CRUST_SVG.replace('class="coin"', 'style="width:1.2em;height:1.2em"')} +${fmt(o.crusts)} <span style="font-size:.55em">Golden Crusts</span>` }),
      h(
        'div',
        { class: 'row' },
        h('div', { class: 'v-choice' }, btn('KEEP GOING', 'big', o.keepGoing), h('span', {}, 'Endless mode: the journey again, harder')),
        h('div', { class: 'v-choice' }, btn('BANK IT', 'green big', o.bank), h('span', {}, 'End the run and collect your crusts')),
      ),
    );
    return this.open(panel);
  }

  // ——— Pause ———
  pause(o: { resume: () => void; settings: () => void; quit: () => void; leave: (() => void) | null; leaveNote: string; inShop?: boolean; owned: Record<string, number>; armed?: string[]; wave: number; score: number }): HTMLElement {
    // your toppings live here rather than on the HUD, where they piled up over the pizzas
    const entries = Object.entries(o.owned).filter(([id]) => UPGRADE_BY_ID[id]);
    const list = h(
      'div',
      { class: 'pause-tops' },
      ...entries.map(([id, lvl]) => {
        const u = UPGRADE_BY_ID[id];
        const armed = o.armed?.includes(id);
        return h(
          'div',
          { class: 'ptop', style: `--rc:${RARITY_COLOR[u.rarity]}` },
          h('div', { class: 'ic' }, u.icon),
          h('div', { class: 'tx' }, h('b', {}, u.name, lvl > 1 ? h('span', { class: 'lv' }, `×${lvl}`) : null, armed ? h('span', { class: 'armed' }, 'READY') : null), h('span', {}, u.desc(1), u.downside ? h('em', { class: 'down' }, ` ▼ ${u.downside}`) : null)),
        );
      }),
    );
    if (!entries.length) list.append(h('span', { class: 'hint' }, 'No toppings yet. Clear a wave to buy some!'));
    const tops = h('div', { class: 'pause-sec' }, h('div', { class: 'section-title' }, `YOUR TOPPINGS · ${entries.length}`), list);
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
      h('div', { class: 'subtitle' }, `Wave ${o.wave} · ${fmt(o.score)} points`),
      tops,
      h('div', { class: 'row' }, btn(o.inShop ? 'BACK TO SHOP' : 'RESUME', 'green big', o.resume, { 'data-pad': 'menu', 'data-pad-default': '' }), btn('SETTINGS', 'yellow', o.settings)),
      // leave keeps the run saved (Resume on the title screen); quit ends it
      h('div', { class: 'row' }, o.leave ? btn('SAVE &amp; MENU', 'cream', o.leave) : null, quit),
      h('div', { class: 'hint pause-note' }, o.leaveNote),
      h('div', { class: 'hint kbd-hint', html: o.inShop ? '<span class="kbd">ESC</span> back to the shop · <span class="kbd">M</span> mute' : '<span class="kbd">ESC</span> resume · <span class="kbd">M</span> mute · <span class="kbd">SPACE</span> Peel Slam' }),
    );
    return this.open(panel);
  }

  // ——— Settings ———
  settings(onClose: () => void, inRun = false): HTMLElement {
    let tab: 'audio' | 'controls' | 'access' | 'progress' = 'audio';
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
    const toggle = (key: 'muted' | 'screenShake' | 'damageNumbers' | 'flashes' | 'showFps' | 'traitIcons' | 'reducedMotion' | 'slowNewCards' | 'vibration', label: string) => {
      const input = h('input', { type: 'checkbox' }) as HTMLInputElement;
      input.checked = save.settings[key];
      input.addEventListener('change', () => {
        updateSettings({ [key]: input.checked } as Partial<Settings>);
        this.hud.syncMute();
        applyA11y();
        audio.sfx('sfx_click');
      });
      return h('label', { class: 'toggle' }, h('span', {}, label), input, h('span', { class: 'sw' }));
    };
    const choice = <K extends 'aimScheme' | 'prompts' | 'colorBlind'>(key: K, label: string, opts: [Settings[K], string][]) => {
      const row = h('div', { class: 'choice' }, h('span', {}, label));
      const seg = h('div', { class: 'seg' });
      const draw = () =>
        seg.replaceChildren(
          ...opts.map(([v, l]) =>
            btn(l, `small ${save.settings[key] === v ? 'active' : 'cream'}`, () => {
              updateSettings({ [key]: v } as Partial<Settings>);
              applyA11y();
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
        ...(['audio', 'controls', 'access', 'progress'] as const).map((t) => btn({ audio: 'AUDIO', controls: 'CONTROLS', access: 'ACCESSIBILITY', progress: 'PROGRESS' }[t], `small ${tab === t ? 'active' : ''}`, () => ((tab = t), render()))),
      );
      if (tab === 'audio')
        body.replaceChildren(
          h('div', { class: 'section-title' }, 'VOLUME'),
          slider('master', 'Master'),
          slider('music', 'Music'),
          slider('sfx', 'Sound FX'),
          slider('ambience', 'Ambience'),
          h('div', { class: 'toggles' }, toggle('muted', 'Mute all'), toggle('showFps', 'Show FPS'), toggle('damageNumbers', 'Damage numbers')),
        );
      else if (tab === 'controls')
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
          }), h('span', {}, 'Show every how-it-works card again')),
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
  gameOver(o: { score: number; wave: number; feet: number; combo: number; bosses: number; crusts: number; newBest: boolean; heat: string; location: string; secondChanceRun: boolean; time: string; unlocked: string[]; affordable: string[]; next: { name: string; cost: number } | null; victory: boolean; again: () => void; menu: () => void; pizzeria: () => void }): HTMLElement {
    const shopBtn = btn('PIZZERIA', `yellow${o.affordable.length ? ' attention' : ''}`, o.pizzeria);
    const callouts = h('div', { class: 'callouts' });
    if (o.unlocked.length) callouts.append(h('div', { class: 'callout good', html: `🎉 Unlocked this run: <b>${o.unlocked.map((id) => PIZZA_BY_ID[id].name).join(', ')}</b>` }));
    if (o.affordable.length) callouts.append(h('div', { class: 'callout', html: `🍕 You can now unlock <b>${o.affordable.slice(0, 3).map((id) => PIZZA_BY_ID[id].name).join(', ')}${o.affordable.length > 3 ? ` +${o.affordable.length - 3} more` : ''}</b> in the Pizzeria!` }));
    else if (o.next) callouts.append(h('div', { class: 'callout', html: `Next unlock: <b>${o.next.name}</b> · ${fmt(Math.min(save.crusts, o.next.cost))} / ${fmt(o.next.cost)} crusts` }));
    if (o.secondChanceRun) callouts.append(h('div', { class: 'callout' }, 'Second-chance run'));
    const crustsEl = h('span', {}, '0');
    const panel = h(
      'div',
      { class: 'panel modal pop' },
      h('div', { class: 'title', style: `font-size:4.6em;color:${o.victory ? 'var(--cheese-d)' : '#ff6a4d'}` }, o.victory ? 'JOURNEY COMPLETE' : 'THE PIZZA IS TOAST'),
      h('div', { class: 'subtitle' }, `Wave ${o.wave} · ${o.location} · ${o.heat}`),
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

  // ——— Pizzeria (meta shop) ———
  pizzeria(onClose: () => void): HTMLElement {
    let tab: 'upgrades' | 'pizzas' = 'upgrades';
    const balance = h('div', { class: 'crusts' });
    const body = h('div', { class: 'scroll' });
    const tabs = h('div', { class: 'tabs' });
    const render = () => {
      balance.innerHTML = `${CRUST_SVG.replace('class="coin"', 'style="width:1.2em;height:1.2em"')} ${fmt(save.crusts)} <span style="font-size:.55em">Golden Crusts</span>`;
      tabs.replaceChildren(
        btn('UPGRADES', `small ${tab === 'upgrades' ? 'active' : ''}`, () => ((tab = 'upgrades'), render())),
        btn(`PIZZAS ${save.unlockedPizzas.length}/${PIZZAS.length}`, `small ${tab === 'pizzas' ? 'active' : ''}`, () => ((tab = 'pizzas'), render())),
      );
      if (tab === 'upgrades') {
        const refund = metaRefundValue();
        const resetBtn = btn(refund > 0 ? `RESET UPGRADES · REFUND ${fmt(refund)}` : 'RESET UPGRADES', 'cream small', () => {
          resetMeta();
          audio.sfx('sfx_coin');
          render();
        });
        resetBtn.disabled = refund <= 0;
        body.replaceChildren(
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
              const b = btn(maxed ? 'MAXED' : `${CRUST_SVG.replace('class="coin"', 'class="coin-ico"')} ${fmt(cost)}`, maxed ? 'cream' : 'green', () => {
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
        );
      } else {
        body.replaceChildren(
          h(
            'div',
            { class: 'grid' },
            ...[...PIZZAS].sort((a, b) => Number(save.unlockedPizzas.includes(b.id)) - Number(save.unlockedPizzas.includes(a.id)) || a.cost - b.cost).map((p) => {
              const owned = save.unlockedPizzas.includes(p.id);
              const b = owned
                ? h('div', { class: 'chip', style: 'background:var(--basil-d);color:#fff' }, 'ON THE MENU')
                : btn(`${CRUST_SVG.replace('class="coin"', 'class="coin-ico"')} ${fmt(p.cost)}`, 'green small', () => {
                    if (save.crusts < p.cost) return;
                    save.crusts -= p.cost;
                    save.unlockedPizzas.push(p.id);
                    persist();
                    audio.sfx('sfx_levelup');
                    render();
                  });
              if (!owned) (b as HTMLButtonElement).disabled = save.crusts < p.cost;
              return h('div', { class: `tile${owned ? '' : ' unowned'}` }, h('img', { src: pizzaPortraitURL(p.id), alt: p.name, loading: 'lazy' }), h('div', { class: 'nm' }, p.name), h('div', { class: 'ds' }, p.perkText), b);
            }),
          ),
        );
      }
    };
    render();
    let s: HTMLElement;
    const panel = h(
      'div',
      { class: 'panel modal wide' },
      h('div', { class: 'title' }, 'THE PIZZERIA'),
      balance,
      tabs,
      body,
      btn('DONE', 'green', () => {
        this.close(s);
        onClose();
      }, { 'data-pad': 'back' }),
    );
    s = this.open(panel);
    return s;
  }

  // ——— Pizzapedia ———
  pedia(onClose: () => void): HTMLElement {
    let tab: 'feet' | 'bosses' | 'pizzas' | 'events' = 'feet';
    const tabs = h('div', { class: 'tabs' });
    const detail = h('div', { class: 'detail' });
    const body = h('div', { class: 'scroll', style: 'max-height:40cqh' });
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
    const showPizza = (id: string) => {
      const p = PIZZA_BY_ID[id];
      const owned = save.unlockedPizzas.includes(id);
      detail.replaceChildren(h('img', { src: pizzaPortraitURL(id), alt: '' }), h('div', {}, h('div', { class: 'dt-head' }, h('h3', {}, p.name), h('span', { class: 'chip' }, owned ? '✅ Unlocked' : `🔒 ${p.cost} Golden Crusts`)), h('p', {}, `Perk: ${p.perkText}`)));
    };
    const EVENTS: [string, string, string, string][] = [
      ['balloon', 'ev_balloon', 'Tip Balloon', 'Drifts across the top. One smack: 10 to 25 tips.'],
      ['drone', 'ev_drone', 'Delivery Drone', 'Zips across. Three smacks: a slice for your weakest pizza.'],
      ['moth', 'ev_moth', 'Pepper Moth', 'Flutters about. Two smacks: half a meter (Peel Slam or ability).'],
      ['seagull', 'ev_seagull', 'Golden Seagull', 'Very rare and fast. Two smacks: a Golden Crust.'],
      ['chest', 'ev_chest', 'Pizza Box Chest', 'Smash it open for tips, a free topping, slices or a crust.'],
      ['mimic', 'ev_mimic', 'Mimic Box', 'It wobbles. Smack it fast or it turns into a foot.'],
    ];
    const render = () => {
      const feet = FEET.filter((f) => !f.boss && !f.mini);
      const bosses = FEET.filter((f) => f.boss || f.mini);
      tabs.replaceChildren(
        btn(`FEET ${feet.filter((f) => save.seenFeet.includes(f.id)).length}/${feet.length}`, `small ${tab === 'feet' ? 'active' : ''}`, () => ((tab = 'feet'), render())),
        btn(`BOSSES ${bosses.filter((f) => save.seenFeet.includes(f.id)).length}/${bosses.length}`, `small ${tab === 'bosses' ? 'active' : ''}`, () => ((tab = 'bosses'), render())),
        btn(`PIZZAS ${PIZZAS.length}`, `small ${tab === 'pizzas' ? 'active' : ''}`, () => ((tab = 'pizzas'), render())),
        btn(`EVENTS ${save.seenEvents.length}/${EVENTS.length}`, `small ${tab === 'events' ? 'active' : ''}`, () => ((tab = 'events'), render())),
      );
      if (tab === 'feet' || tab === 'bosses') {
        const list = tab === 'feet' ? feet : bosses;
        const tiles = list.map((f) => {
          const seen = save.seenFeet.includes(f.id);
          const t = h('div', { class: `tile${seen ? '' : ' locked'}${f.boss ? ' boss' : ''}`, tabindex: 0 }, h('img', { src: footPortraitURL(f.id), alt: '', loading: 'lazy' }), h('div', { class: 'nm' }, seen ? f.name : '???'), f.boss ? h('span', { class: 'tag' }, 'BOSS') : f.mini ? h('span', { class: 'tag' }, 'MINI') : null);
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
        const tiles = PIZZAS.map((p) => {
          const owned = save.unlockedPizzas.includes(p.id);
          const t = h('div', { class: 'tile', tabindex: 0 }, h('img', { src: pizzaPortraitURL(p.id), alt: '', loading: 'lazy' }), h('div', { class: 'nm' }, p.name), owned ? null : h('span', { class: 'tag' }, '🔒'));
          t.addEventListener('click', () => {
            audio.sfx('sfx_click');
            showPizza(p.id);
          });
          return t;
        });
        body.replaceChildren(h('div', { class: 'grid' }, ...tiles));
        showPizza(PIZZAS[0].id);
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
      { class: 'panel modal wide' },
      h('div', { class: 'title' }, 'PIZZAPEDIA'),
      tabs,
      detail,
      body,
      btn('DONE', 'green', () => {
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
    type Tab = 'all' | 'goals' | 'crusts' | 'feet' | 'bosses' | 'pizzas' | 'places' | 'events' | 'shiny';
    const TAB_GROUPS: Record<Exclude<Tab, 'goals'>, PeelGroup[]> = {
      all: [...new Set(PEELS.map((d) => d.group))],
      crusts: ['classic', 'golden', 'jewel', 'master'],
      feet: ['foot'],
      bosses: ['boss'],
      pizzas: ['pizza'],
      places: ['place'],
      events: ['event'],
      shiny: ['shinyFoot', 'shinyEvent'],
    };
    const NAMES: Record<Tab, string> = { all: 'ALL', goals: 'GOALS', crusts: 'CRUSTS', feet: 'FEET', bosses: 'BOSSES', pizzas: 'PIZZAS', places: 'PLACES', events: 'EVENTS', shiny: 'SHINY' };
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
    const crustLine = h('div', { class: 'crusts' });
    // undiscovered shinies stay a mystery
    const hidden = (d: PeelDef) => !!d.shiny && (d.group === 'shinyFoot' || d.group === 'shinyEvent') && !hasPeel(d.id);
    const shownName = (d: PeelDef) => (hidden(d) && d.ultra ? '???' : d.name);
    const inTab = (t: Exclude<Tab, 'goals'>) => PEELS.filter((d) => TAB_GROUPS[t].includes(d.group));
    const shown = (list: PeelDef[]) => (unlockedOnly ? list.filter((d) => hasPeel(d.id)) : list);
    const tabsShown = () => (Object.keys(NAMES) as Tab[]).filter((t) => !(t === 'goals' && unlockedOnly));
    // thumbnails are drawn lazily as tiles scroll into view
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const img = e.target as HTMLImageElement;
          io.unobserve(img);
          img.src = peelThumbURL(img.dataset.peel!);
        }
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
      detail.replaceChildren(
        h('div', { class: `peel-big${d.shiny ? ' shiny' : ''}${hidden(d) ? ' hidden' : ''}` }, img),
        h(
          'div',
          {},
          h('div', { class: 'dt-head' }, h('h3', {}, shownName(d)), ...chips, actions.length ? h('span', { class: 'dt-act' }, ...actions) : null),
          h('div', { class: 'dt-how' }, h('p', {}, d.how), pr && !owned ? bar(pr[0], pr[1]) : null),
          hidden(d) && d.ultra ? null : abilityLine(d.id),
        ),
      );
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
      );
      activatable(t);
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
      const label = (t: Tab) => (t === 'goals' ? NAMES[t] : `${NAMES[t]} <small>${count(TAB_GROUPS[t])}</small>`);
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
          const o = h('option', { value: t }, t === 'goals' ? 'Goals' : `${NAMES[t][0]}${NAMES[t].slice(1).toLowerCase()} · ${count(TAB_GROUPS[t])}`) as HTMLOptionElement;
          o.selected = tab === t;
          return o;
        }),
      );
      filter.classList.toggle('on', unlockedOnly);
      filter.setAttribute('aria-pressed', unlockedOnly ? 'true' : 'false');
      filter.innerHTML = `<i>${unlockedOnly ? '✔' : ''}</i>Unlocked only`;
      crustLine.innerHTML = `${CRUST_SVG} <b>${fmt(save.crusts)}</b> Golden Crusts · ${PEELS.filter((d) => hasPeel(d.id)).length}/${PEELS.length} peels`;
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
        } else if (tab === 'crusts') {
          parts = [grid(list.filter((d) => d.group !== 'jewel')), ...section('THE JEWELLERY BOX', ['jewel'], 'Shiny peels for serious crust savers.', list)];
        } else parts = [grid(list)];
        const any = parts.some((p) => p.querySelector('.tile'));
        body.replaceChildren(...(any ? parts : [h('p', { class: 'hint' }, 'None unlocked here yet. Turn off “Unlocked only” to see how to get them.')]));
      }
      showDetail();
    };
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
      h('div', { class: 'title' }, pickMode === 'look' ? 'PICK A LOOK' : pick ? 'PICK A PEEL' : 'PEEL LOCKER'),
      crustLine,
      toolbar,
      detail,
      body,
      btn(pick ? 'BACK' : 'DONE', pick ? 'cream' : 'green', finish, { 'data-pad': 'back' }),
    );
    s = this.open(panel);
    this.onClose(s, () => io.disconnect());
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
