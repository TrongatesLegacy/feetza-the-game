// DOM overlay UI: HUD, menus and modal screens. Rendered over the Phaser canvas and scaled with
// container query units (1em = 1% of the stage width) so it stays crisp at any size.

import { FEET, FOOT_BY_ID, TRAIT_INFO } from '../data/feet';
import { META } from '../data/meta';
import { PIZZAS, PIZZA_BY_ID } from '../data/pizzas';
import { RARITY_COLOR, UPGRADE_BY_ID, type Upgrade } from '../data/upgrades';
import { footPortraitURL, pizzaPortraitURL } from '../game/assets';
import { audio } from '../systems/audio';
import { persist, resetProgress, save, updateSettings, type Settings } from '../systems/save';

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

export const COIN_SVG =
  '<svg class="coin" viewBox="0 0 24 24"><circle cx="12" cy="13" r="10" fill="#9a6a00"/><circle cx="12" cy="12" r="10" fill="#ffcf3a" stroke="#7a4a00" stroke-width="1.5"/><circle cx="12" cy="12" r="7" fill="none" stroke="#a86a00" stroke-width="1"/><path d="M12 17l-3.6-7.4q3.6-2 7.2 0z" fill="#c47a00"/><ellipse cx="8.5" cy="7.5" rx="2.5" ry="1.2" fill="#fff" opacity=".7" transform="rotate(-30 8.5 7.5)"/></svg>';

const CRUST_SVG =
  '<svg class="coin" viewBox="0 0 24 24"><path d="M3 9c3-5 15-5 18 0l-9 13z" fill="#ffd23f" stroke="#2a1810" stroke-width="1.6" stroke-linejoin="round"/><path d="M3 9c3-5 15-5 18 0" fill="none" stroke="#d9963f" stroke-width="3.2" stroke-linecap="round"/><circle cx="10" cy="12" r="1.6" fill="#e5402a"/><circle cx="14" cy="15" r="1.4" fill="#e5402a"/></svg>';

function btn(label: string, cls: string, onClick: () => void, attrs: Attrs = {}): HTMLButtonElement {
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
    this.boss.append(this.bossName, h('div', { class: 'track' }, this.bossTrail, this.bossHp));
    this.slam.innerHTML = '<span>PEEL<br>SLAM<small>SPACE</small></span>';
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
      h('div', { class: 'tr' }, this.coinPill, this.muteBtn, pause),
      this.toasts,
      this.owned,
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

  setBoss(name: string | null, frac = 1): void {
    this.boss.classList.toggle('on', !!name);
    if (!name) return;
    this.bossName.textContent = name;
    const w = `${Math.max(0, frac) * 100}%`;
    this.bossHp.style.width = w;
    this.bossTrail.style.width = w;
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

  setFps(n: number): void {
    if (save.settings.showFps) this.fpsEl.textContent = `${Math.round(n)} FPS`;
  }

  banner(big: string, small = '', kind: '' | 'boss' | 'loc' | 'clear' = ''): void {
    const b = h('div', { class: `banner ${kind}` }, h('div', { class: 'big' }, big), small ? h('div', { class: 'small' }, small) : null);
    this.root.append(b);
    setTimeout(() => b.remove(), 2300);
  }

  toast(img: string | null, title: string, text: string): void {
    const t = h('div', { class: 'toast panel' }, img ? h('img', { src: img, alt: '' }) : null, h('div', {}, h('b', {}, title), text));
    this.toasts.append(t);
    setTimeout(() => t.remove(), 4100);
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

  closeAll(): void {
    for (const s of [...this.stack]) this.close(s);
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
  menu(h_: { play: () => void; pizzeria: () => void; pedia: () => void; settings: () => void; credits: () => void }): HTMLElement {
    const seen = save.seenFeet.length;
    const stats = h(
      'div',
      { class: 'menu-stats' },
      h('span', { html: `Best <b>${fmt(save.bestScore)}</b>` }),
      h('span', { html: `Wave <b>${save.bestWave}</b>` }),
      h('span', { html: `Crusts <b>${fmt(save.crusts)}</b>` }),
    );
    stats.classList.add('corner');
    const content = h(
      'div',
      { class: 'menu main' },
      logo(),
      h('div', { class: 'tagline' }, 'Stop the feet. Save the pizza.'),
      btn('PLAY', 'big', h_.play),
      h(
        'div',
        { class: 'menu-buttons' },
        btn(`PIZZERIA`, 'yellow', h_.pizzeria),
        btn(`PIZZAPEDIA <small style="font-size:.7em">${seen}/${FEET.length}</small>`, 'green', h_.pedia),
        btn('SETTINGS', 'cream', h_.settings),
        btn('CREDITS', 'cream', h_.credits),
      ),
    );
    const s = this.open(content, false);
    s.append(stats);
    return s;
  }

  // ——— Pre-run lineup ———
  lineup(ids: string[], onShuffle: () => void, onStart: () => void, onBack: () => void): HTMLElement {
    const tiles = ids.map((id) => {
      const p = PIZZA_BY_ID[id];
      return h('div', { class: 'tile pop' }, h('img', { src: pizzaPortraitURL(id), alt: p.name }), h('div', { class: 'nm' }, p.name), h('div', { class: 'ds' }, p.perkText));
    });
    const panel = h(
      'div',
      { class: 'panel modal' },
      h('div', { class: 'title' }, "TONIGHT'S MENU"),
      h('div', { class: 'subtitle' }, 'Each pizza grants its perk for as long as it survives.'),
      h('div', { class: 'lineup' }, ...tiles),
      h('div', { class: 'row' }, btn('BACK', 'cream', onBack), btn('SHUFFLE', 'yellow', onShuffle), btn('OPEN FOR BUSINESS!', 'green', onStart)),
      h('div', { class: 'hint', html: 'Unlock more pizzas in the <b>Pizzeria</b> with Golden Crusts.' }),
    );
    return this.open(panel);
  }

  // ——— Upgrade picker ———
  upgrade(o: {
    title: string;
    sub: string;
    choices: Upgrade[];
    levels: Record<string, number>;
    coins: number;
    rerollCost: number;
    freeRerolls: number;
    healCost: number;
    canHeal: boolean;
    reviveCost: number;
    canRevive: boolean;
    onPick: (id: string) => void;
    onReroll: () => void;
    onHeal: () => void;
    onRevive: () => void;
  }): HTMLElement {
    const cards = o.choices.map((u, i) => {
      const lvl = o.levels[u.id] ?? 0;
      const pips = h('div', { class: 'pips' });
      for (let k = 0; k < u.max; k++) pips.append(h('i', { class: k < lvl ? 'on' : k === lvl ? 'new' : '' }));
      const c = h(
        'div',
        { class: `card ${u.rarity}`, tabindex: 0, role: 'button' },
        h('div', { class: 'key' }, String(i + 1)),
        h('div', { class: 'rarity' }, u.rarity),
        h('div', { class: 'icon' }, u.icon),
        h('div', { class: 'name' }, u.name),
        h('div', { class: 'desc' }, u.desc(lvl + 1)),
        h('div', { class: 'lvl' }, lvl ? `LV ${lvl} → ${lvl + 1}` : 'NEW', pips),
      );
      c.addEventListener('pointerenter', () => audio.sfx('sfx_hover', { throttle: 60 }));
      c.addEventListener('click', () => choose(u.id));
      return c;
    });
    let done = false;
    const choose = (id: string) => {
      if (done) return;
      done = true;
      window.removeEventListener('keydown', onKey);
      o.onPick(id);
    };
    const onKey = (e: KeyboardEvent) => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= o.choices.length) choose(o.choices[n - 1].id);
      if (e.key.toLowerCase() === 'r' && (o.freeRerolls > 0 || o.coins >= o.rerollCost)) {
        window.removeEventListener('keydown', onKey);
        o.onReroll();
      }
    };
    window.addEventListener('keydown', onKey);
    const coinPill = h('div', { class: 'pill', html: `${COIN_SVG}<span>${fmt(o.coins)}</span>` });
    const rerollLabel = o.freeRerolls > 0 ? `REROLL <small>(${o.freeRerolls} free)</small>` : `REROLL ${COIN_SVG.replace('class="coin"', 'class="coin-ico"')}${o.rerollCost}`;
    const reroll = btn(rerollLabel, 'yellow small', () => {
      window.removeEventListener('keydown', onKey);
      o.onReroll();
    });
    reroll.disabled = o.freeRerolls <= 0 && o.coins < o.rerollCost;
    const heal = btn(`HEAL ALL +2 ${COIN_SVG.replace('class="coin"', 'class="coin-ico"')}${o.healCost}`, 'green small', () => {
      window.removeEventListener('keydown', onKey);
      o.onHeal();
    });
    heal.disabled = !o.canHeal || o.coins < o.healCost;
    const revive = btn(`REBAKE A PIZZA ${COIN_SVG.replace('class="coin"', 'class="coin-ico"')}${o.reviveCost}`, 'small', () => {
      window.removeEventListener('keydown', onKey);
      o.onRevive();
    });
    revive.disabled = !o.canRevive || o.coins < o.reviveCost;
    const wrap = h(
      'div',
      { class: 'upgrade-wrap' },
      h('div', { class: 'title' }, o.title),
      h('div', { class: 'tagline', style: 'font-size:2em' }, o.sub),
      h('div', { class: 'cards' }, ...cards),
      h('div', { class: 'panel shopbar' }, coinPill, reroll, heal, o.canRevive ? revive : null),
      h('div', { class: 'hint kbd-hint', style: 'color:#fff6e2;text-shadow:0 .1em 0 #2a1810', html: `Press <span class="kbd">1</span>–<span class="kbd">${o.choices.length}</span> to pick · <span class="kbd">R</span> to reroll` }),
    );
    const s = this.open(wrap);
    this.onClose(s, () => window.removeEventListener('keydown', onKey));
    return s;
  }

  // ——— Pause ———
  pause(o: { resume: () => void; settings: () => void; quit: () => void; owned: Record<string, number>; wave: number; score: number }): HTMLElement {
    const list = h('div', { class: 'chips', style: 'justify-content:center;max-width:44em' });
    for (const [id, lvl] of Object.entries(o.owned)) {
      const u = UPGRADE_BY_ID[id];
      list.append(h('span', { class: 'chip', style: `border-color:${RARITY_COLOR[u.rarity]}` }, `${u.icon} ${u.name}${lvl > 1 ? ` ×${lvl}` : ''}`));
    }
    if (!Object.keys(o.owned).length) list.append(h('span', { class: 'hint' }, 'No upgrades yet. Clear a wave to choose one!'));
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
      list,
      h('div', { class: 'row' }, btn('RESUME', 'green big', o.resume), btn('SETTINGS', 'yellow', o.settings), quit),
      h('div', { class: 'hint kbd-hint', html: '<span class="kbd">ESC</span> resume · <span class="kbd">M</span> mute · <span class="kbd">SPACE</span> Peel Slam' }),
    );
    return this.open(panel);
  }

  // ——— Settings ———
  settings(onClose: () => void): HTMLElement {
    const slider = (key: keyof Settings & ('master' | 'music' | 'sfx' | 'ambience'), label: string) => {
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
    const toggle = (key: 'muted' | 'screenShake' | 'damageNumbers' | 'flashes' | 'showFps', label: string) => {
      const input = h('input', { type: 'checkbox' }) as HTMLInputElement;
      input.checked = save.settings[key];
      input.addEventListener('change', () => {
        updateSettings({ [key]: input.checked } as Partial<Settings>);
        this.hud.syncMute();
        audio.sfx('sfx_click');
      });
      return h('label', { class: 'toggle' }, h('span', {}, label), input, h('span', { class: 'sw' }));
    };
    let resetArmed = false;
    const reset = btn('RESET PROGRESS', 'cream small', () => {
      if (!resetArmed) {
        resetArmed = true;
        reset.innerHTML = 'TAP AGAIN TO WIPE EVERYTHING';
        reset.classList.remove('cream');
        return;
      }
      resetProgress();
      reset.innerHTML = 'PROGRESS RESET';
      reset.disabled = true;
    });
    let s: HTMLElement;
    const panel = h(
      'div',
      { class: 'panel modal' },
      h('div', { class: 'title' }, 'SETTINGS'),
      h(
        'div',
        { class: 'settings' },
        h('div', { class: 'section-title' }, 'VOLUME'),
        slider('master', 'Master'),
        slider('music', 'Music'),
        slider('sfx', 'Sound FX'),
        slider('ambience', 'Ambience'),
        h('div', { class: 'section-title' }, 'OPTIONS'),
        h('div', { class: 'toggles' }, toggle('muted', 'Mute all'), toggle('screenShake', 'Screen shake'), toggle('damageNumbers', 'Damage numbers'), toggle('flashes', 'Screen flashes'), toggle('showFps', 'Show FPS')),
      ),
      h(
        'div',
        { class: 'row' },
        btn(`${ICONS.full.replace('<svg', '<svg style="width:1em;height:1em;vertical-align:-.12em"')} FULLSCREEN`, 'yellow small', () => {
          const el = document.getElementById('stage')!;
          if (document.fullscreenElement) void document.exitFullscreen();
          else void el.requestFullscreen?.().catch(() => {});
        }),
        reset,
        btn('DONE', 'green', () => {
          this.close(s);
          onClose();
        }),
      ),
    );
    s = this.open(panel);
    return s;
  }

  // ——— Game over ———
  gameOver(o: { score: number; wave: number; feet: number; combo: number; bosses: number; crusts: number; newBest: boolean; time: string; again: () => void; menu: () => void; pizzeria: () => void }): HTMLElement {
    const crustsEl = h('span', {}, '0');
    const panel = h(
      'div',
      { class: 'panel modal pop' },
      h('div', { class: 'title', style: 'font-size:5em;color:#ff6a4d' }, 'THE PIZZA IS TOAST'),
      o.newBest ? h('div', { class: 'newbest' }, 'NEW BEST SCORE!') : null,
      h(
        'div',
        { class: 'stats' },
        stat(fmt(o.score), 'Score'),
        stat(String(o.wave), 'Wave reached'),
        stat(fmt(o.feet), 'Feet smacked'),
        stat(String(o.combo), 'Best combo'),
        stat(String(o.bosses), 'Bosses beaten'),
        stat(o.time, 'Time'),
      ),
      h('div', { class: 'crusts', html: `${CRUST_SVG.replace('class="coin"', 'style="width:1.2em;height:1.2em"')} +` }, crustsEl, h('span', { style: 'font-size:.6em' }, ' Golden Crusts')),
      h('div', { class: 'row' }, btn('PLAY AGAIN', 'green big', o.again), btn('PIZZERIA', 'yellow', o.pizzeria), btn('MENU', 'cream', o.menu)),
    );
    const s = this.open(panel);
    // count-up
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
        body.replaceChildren(
          h(
            'div',
            { class: 'meta-list' },
            ...META.map((m) => {
              const lvl = save.meta[m.id] ?? 0;
              const maxed = lvl >= m.costs.length;
              const cost = m.costs[lvl];
              const pips = h('div', { class: 'pips', style: '--rc:var(--tomato)' });
              for (let i = 0; i < m.costs.length; i++) pips.append(h('i', { class: i < lvl ? 'on' : '' }));
              const b = btn(maxed ? 'MAXED' : `${CRUST_SVG.replace('class="coin"', 'class="coin-ico"')} ${cost}`, maxed ? 'cream' : 'green', () => {
                if (maxed || save.crusts < cost) return;
                save.crusts -= cost;
                save.meta[m.id] = lvl + 1;
                persist();
                audio.sfx('sfx_upgrade');
                render();
              });
              b.disabled = maxed || save.crusts < cost;
              return h('div', { class: 'meta' }, h('div', { class: 'ic' }, m.icon), h('div', {}, h('div', { class: 'nm' }, m.name), h('div', { class: 'ds' }, m.desc), pips), b);
            }),
          ),
        );
      } else {
        body.replaceChildren(
          h(
            'div',
            { class: 'grid' },
            ...PIZZAS.map((p) => {
              const owned = save.unlockedPizzas.includes(p.id);
              const b = owned
                ? h('div', { class: 'chip', style: 'background:var(--basil-d);color:#fff' }, 'ON THE MENU')
                : btn(`${CRUST_SVG.replace('class="coin"', 'class="coin-ico"')} ${p.cost}`, 'green small', () => {
                    if (save.crusts < p.cost) return;
                    save.crusts -= p.cost;
                    save.unlockedPizzas.push(p.id);
                    persist();
                    audio.sfx('sfx_levelup');
                    render();
                  });
              if (!owned) (b as HTMLButtonElement).disabled = save.crusts < p.cost;
              return h('div', { class: `tile${owned ? '' : ''}` }, h('img', { src: pizzaPortraitURL(p.id), alt: p.name, loading: 'lazy' }), h('div', { class: 'nm' }, p.name), h('div', { class: 'ds' }, p.perkText), b);
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
      }),
    );
    s = this.open(panel);
    return s;
  }

  // ——— Pizzapedia ———
  pedia(onClose: () => void): HTMLElement {
    let tab: 'feet' | 'pizzas' = 'feet';
    const tabs = h('div', { class: 'tabs' });
    const detail = h('div', { class: 'detail' });
    const body = h('div', { class: 'scroll', style: 'max-height:44cqh' });
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
      detail.replaceChildren(
        h('img', { src: footPortraitURL(id), alt: '', style: seen ? '' : 'filter:brightness(0) opacity(.35)' }),
        h('div', {}, h('h3', {}, seen ? f.name : '???'), h('p', {}, seen ? f.desc : f.boss ? `A boss lurks at wave ${f.minWave}…` : `Appears from wave ${f.minWave}. Smack one to learn more.`), chips),
      );
    };
    const showPizza = (id: string) => {
      const p = PIZZA_BY_ID[id];
      const owned = save.unlockedPizzas.includes(id);
      detail.replaceChildren(h('img', { src: pizzaPortraitURL(id), alt: '' }), h('div', {}, h('h3', {}, p.name), h('p', {}, `Perk: ${p.perkText}`), h('div', { class: 'chips' }, h('span', { class: 'chip' }, owned ? '✅ Unlocked' : `🔒 ${p.cost} Golden Crusts`))));
    };
    const render = () => {
      tabs.replaceChildren(
        btn(`FEET ${save.seenFeet.length}/${FEET.length}`, `small ${tab === 'feet' ? 'active' : ''}`, () => ((tab = 'feet'), render())),
        btn(`PIZZAS ${PIZZAS.length}`, `small ${tab === 'pizzas' ? 'active' : ''}`, () => ((tab = 'pizzas'), render())),
      );
      if (tab === 'feet') {
        const tiles = FEET.map((f) => {
          const seen = save.seenFeet.includes(f.id);
          const t = h('div', { class: `tile${seen ? '' : ' locked'}${f.boss ? ' boss' : ''}` }, h('img', { src: footPortraitURL(f.id), alt: '', loading: 'lazy' }), h('div', { class: 'nm' }, seen ? f.name : '???'), f.boss ? h('span', { class: 'tag' }, 'BOSS') : null);
          t.addEventListener('click', () => {
            audio.sfx('sfx_click');
            showFoot(f.id);
          });
          return t;
        });
        body.replaceChildren(h('div', { class: 'grid' }, ...tiles));
        showFoot(save.seenFeet[save.seenFeet.length - 1] ?? FEET[0].id);
      } else {
        const tiles = PIZZAS.map((p) => {
          const owned = save.unlockedPizzas.includes(p.id);
          const t = h('div', { class: 'tile' }, h('img', { src: pizzaPortraitURL(p.id), alt: '', loading: 'lazy' }), h('div', { class: 'nm' }, p.name), owned ? null : h('span', { class: 'tag' }, '🔒'));
          t.addEventListener('click', () => {
            audio.sfx('sfx_click');
            showPizza(p.id);
          });
          return t;
        });
        body.replaceChildren(h('div', { class: 'grid' }, ...tiles));
        showPizza(PIZZAS[0].id);
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
      }),
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
      }),
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
