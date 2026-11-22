// The Pick toppings' window (choose 1 of 3 toppings of a rarity, free) and Peel Roulette's (choose 1 of 3
// of your other peels). Both open over the shop and must be answered: the choice is the topping's effect.

import { RARITY_COLOR, kindOf, type Upgrade } from '../data/upgrades';
import { abilityFor, abilityKindLabel, describeAbility } from '../game/abilities';
import { PEEL_BY_ID, peelThumbURL } from '../game/peels';
import { audio } from '../systems/audio';
import { slamPrompt } from '../systems/gamepad';
import { btn, h, ui } from './ui';

export interface PickOption {
  u: Upgrade;
  /** The card's level line: NEW, LV 2 → 3, One use… */
  lvl: string;
  desc: string;
  downside?: string;
}

const RARITY_LABEL = { common: 'COMMON', rare: 'RARE', epic: 'EPIC', legendary: 'LEGENDARY' } as const;

/** Choose one topping, free. */
export function pickWindow(o: { title: string; rarity: Upgrade['rarity']; options: PickOption[]; onPick: (id: string) => void }): HTMLElement {
  let s: HTMLElement;
  let chosen = false;
  const take = (id: string) => {
    if (chosen) return;
    chosen = true;
    audio.sfx('sfx_click');
    ui.close(s);
    o.onPick(id);
  };
  const cards = o.options.map((p, i) => {
    const k = kindOf(p.u);
    const b = btn('TAKE IT · FREE', 'green small', () => take(p.u.id));
    const el = h(
      'div',
      { class: `card ${p.u.rarity}`, tabindex: 0, role: 'button', 'aria-label': `${p.u.name}: ${p.desc}`, 'data-fk': `pick:${p.u.id}` },
      h('div', { class: 'key' }, String(i + 1)),
      h('span', { class: `kind ${k}` }, k === 'permanent' ? 'PERMANENT' : k === 'unique' ? 'ONCE PER RUN' : 'ONE USE'),
      h('div', { class: 'rarity' }, p.u.rarity),
      h('div', { class: 'icon' }, p.u.icon),
      h('div', { class: 'name' }, p.u.name),
      h('div', { class: 'desc' }, p.desc),
      p.downside ? h('div', { class: 'down' }, `▼ ${p.downside}`) : null,
      h('div', { class: 'lvl' }, p.lvl),
      b,
    );
    el.addEventListener('click', () => take(p.u.id));
    el.addEventListener('keydown', (e) => e.key === 'Enter' && take(p.u.id));
    return el;
  });
  const onKey = (e: KeyboardEvent) => {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= o.options.length) {
      e.stopPropagation();
      take(o.options[n - 1].u.id);
    }
  };
  const panel = h(
    'div',
    { class: 'panel modal pickwin', style: `--rc:${RARITY_COLOR[o.rarity]}` },
    h('div', { class: 'pick-badge' }, `🎁 ${RARITY_LABEL[o.rarity]} PICK`),
    h('div', { class: 'title' }, o.title),
    h('div', { class: 'subtitle' }, o.options.length < 3 ? `Only ${o.options.length} left to choose from · it’s on the house` : 'Choose one · it’s on the house'),
    h('div', { class: 'cards pick-cards' }, ...cards),
  );
  s = ui.open(panel);
  window.addEventListener('keydown', onKey, true);
  ui.onClose(s, () => window.removeEventListener('keydown', onKey, true));
  setTimeout(() => cards[0]?.focus({ preventScroll: true }), 60);
  return s;
}

/** Peel Roulette: three of your other peels; the one you choose is your peel for the rest of the run. */
export function rouletteWindow(o: { current: string; options: string[]; onPick: (id: string) => void }): HTMLElement {
  let s: HTMLElement;
  let chosen = false;
  const take = (id: string) => {
    if (chosen) return;
    chosen = true;
    audio.sfx('sfx_levelup', { volume: 0.6 });
    ui.close(s);
    o.onPick(id);
  };
  const ability = (id: string) => {
    if (id === 'classic') return { kind: 'ACTIVE', name: 'Peel Slam', text: `${slamPrompt()} when the meter is full: smack every foot at once.` };
    const a = abilityFor(id);
    return { kind: abilityKindLabel(a), name: a.name, text: describeAbility(a) };
  };
  const tiles = o.options.map((id, i) => {
    const d = PEEL_BY_ID[id];
    const ab = ability(id);
    const t = h(
      'button',
      { class: `roul-tile${d.shiny ? ' shiny' : ''}`, type: 'button', 'data-fk': `roul:${id}`, 'aria-label': `${d.name}: ${ab.name}` },
      h('div', { class: 'key' }, String(i + 1)),
      h('div', { class: 'roul-pic' }, h('img', { src: peelThumbURL(id, 240), alt: '' })),
      h('b', { class: 'roul-name' }, d.name),
      h('div', { class: 'abl' }, h('span', { class: `chip ${ab.kind.toLowerCase()}` }, ab.kind), h('b', {}, ab.name), h('span', {}, ab.text)),
      h('span', { class: 'btn green small roul-go' }, 'PLAY WITH THIS'),
    ) as HTMLButtonElement;
    t.addEventListener('click', () => take(id));
    return t;
  });
  const onKey = (e: KeyboardEvent) => {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= o.options.length) {
      e.stopPropagation();
      take(o.options[n - 1]);
    }
  };
  const cur = PEEL_BY_ID[o.current];
  const panel = h(
    'div',
    { class: 'panel modal pickwin roulette' },
    h('div', { class: 'pick-badge' }, '🎡 PEEL ROULETTE'),
    h('div', { class: 'title' }, 'PICK A PEEL'),
    h('div', { class: 'subtitle' }, `Swap your ${cur?.name ?? 'peel'} for one of these for the rest of the run: its ability and its look`),
    h('div', { class: 'roul-row' }, ...tiles),
  );
  s = ui.open(panel);
  window.addEventListener('keydown', onKey, true);
  ui.onClose(s, () => window.removeEventListener('keydown', onKey, true));
  setTimeout(() => tiles[0]?.focus({ preventScroll: true }), 60);
  return s;
}

/** Pizza Slots won a topping: its full card, to add to your toppings or sell for half its usual price. */
export function slotsPrizeWindow(o: { u: Upgrade; lvl: string; desc: string; downside?: string; sell: number; onChoose: (choice: 'add' | 'sell') => void }): HTMLElement {
  let s: HTMLElement;
  let chosen = false;
  const choose = (c: 'add' | 'sell') => {
    if (chosen) return;
    chosen = true;
    audio.sfx(c === 'sell' ? 'sfx_coin' : 'sfx_click');
    ui.close(s);
    o.onChoose(c);
  };
  const k = kindOf(o.u);
  const card = h(
    'div',
    { class: `card ${o.u.rarity} slots-card`, 'aria-label': `${o.u.name}: ${o.desc}` },
    h('span', { class: `kind ${k}` }, k === 'permanent' ? 'PERMANENT' : k === 'unique' ? 'ONCE PER RUN' : 'ONE USE'),
    h('div', { class: 'rarity' }, o.u.rarity),
    h('div', { class: 'icon' }, o.u.icon),
    h('div', { class: 'name' }, o.u.name),
    h('div', { class: 'desc' }, o.desc),
    o.downside ? h('div', { class: 'down' }, `▼ ${o.downside}`) : null,
    h('div', { class: 'lvl' }, o.lvl),
  );
  const add = btn('ADD IT', 'green', () => choose('add'), { 'data-pad-default': '' });
  const sell = btn(`SELL · ${o.sell} TIPS`, 'yellow', () => choose('sell'));
  const panel = h(
    'div',
    { class: 'panel modal pickwin slotswin', style: `--rc:${RARITY_COLOR[o.u.rarity]}` },
    h('div', { class: 'pick-badge' }, '🎰 PIZZA SLOTS · THREE OF A KIND'),
    h('div', { class: 'title' }, 'YOU WON A TOPPING!'),
    h('div', { class: 'subtitle' }, 'Add it to your toppings, or sell it for half its usual price'),
    h('div', { class: 'cards pick-cards' }, card),
    h('div', { class: 'row slots-choice' }, add, sell),
  );
  s = ui.open(panel);
  setTimeout(() => add.focus({ preventScroll: true }), 60);
  return s;
}
