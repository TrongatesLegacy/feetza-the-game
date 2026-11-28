// The STATS tab of Your Toppings: the build as big numbers (src/game/buildStats.ts works them out). A hero card
// with total DPS split into your smacks and the automatic attacks, the last wave's damage by source, then a card
// per section with stat tiles, each saying where it comes from.

import { sourceInfo, type AutoTile, type BuildView, type NumFmt, type Section, type Src, type Tile } from '../game/buildStats';
import { save } from '../systems/save';
import { pizzaThumb } from './bits';
import { fmt, h } from './ui';
import './statsTab.css';

const r1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 });
const r2 = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });

/** A number the way its tile shows it (whole numbers through the game's fmt). */
/** A big number kept short so it fits its tile: 9,950 stays, 12,400 → 12.4k, 3,127,358 → 3.13M. */
function big(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(a >= 1e10 ? 1 : 2)}B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M`;
  if (a >= 1e4) return `${(n / 1e3).toFixed(a >= 1e5 ? 0 : 1)}k`;
  return fmt(Math.round(n));
}

function show(n: number, f: NumFmt): string {
  switch (f) {
    case 'int':
      return Math.abs(n) < 10 && Math.round(n) !== n ? r1(n) : big(n);
    case 'dec':
      return r1(n);
    case 'pct':
      return `${big(Math.round(n))}%`;
    case 'x':
      return `×${r2(n)}`;
    case 'sec':
      return `${r1(n)}s`;
    default:
      return '';
  }
}

/** DPS: a decimal under 10, whole numbers above. */
const dps = (n: number) => (n < 10 ? r1(n) : big(n));

function still(): boolean {
  return save.settings.reducedMotion || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/** A number that counts up from 0 when the tab opens. */
function counter(n: number, render: (v: number) => string, cls = ''): HTMLElement {
  const el = h('span', { class: `st-num ${cls}` }, render(n));
  el.dataset.to = String(n);
  counters.push({ el, n, render });
  return el;
}

let counters: { el: HTMLElement; n: number; render: (v: number) => string }[] = [];

function runCounters(): void {
  const list = counters;
  counters = [];
  if (still() || !list.length) return;
  const t0 = performance.now();
  const ms = 700;
  for (const c of list) c.el.textContent = c.render(0);
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / ms);
    const e = 1 - (1 - k) ** 3;
    for (const c of list) if (c.el.isConnected || k === 0) c.el.textContent = c.render(c.n * e);
    if (k < 1) requestAnimationFrame(step);
    else for (const c of list) c.el.textContent = c.render(c.n);
  };
  requestAnimationFrame(step);
}

function chip(s: Src): HTMLElement {
  return h(
    'span',
    // (a topping or a pizza shows its whole card when tapped or hovered)
    { class: `st-src ${s.tone}`, title: s.tip ? `${s.name}: ${s.tip}` : s.name, 'data-tip-card': /^(top|pizza):/.test(s.key) ? s.key : undefined, 'data-tip-lvl': s.lvl },
    s.img ? h('img', { src: s.img, alt: '' }) : h('i', {}, s.icon ?? '•'),
    h('span', {}, s.name),
  );
}

/** Close every open popover in the tab. */
function closePops(root: ParentNode = document): void {
  for (const w of root.querySelectorAll('.st-pw.open')) {
    w.classList.remove('open');
    w.querySelector('button')?.setAttribute('aria-expanded', 'false');
  }
}

/** A small button that opens a popover (on a tap or a click; hover and focus show it too on a desktop). */
function popBtn(kind: 'from' | 'info' | 'key', label: (Node | string)[], aria: string, content: HTMLElement): HTMLElement {
  const b = h('button', { class: `st-pbtn ${kind}`, type: 'button', 'aria-label': aria, 'aria-expanded': 'false' }, ...label);
  const pop = h('div', { class: 'st-pop', role: 'tooltip' }, content);
  const wrap = h('span', { class: `st-pw ${kind}` }, b, pop);
  // it opens towards whichever side has room inside the scrolling panel (a phone's left-hand tiles cut it off)
  const place = () => {
    wrap.classList.remove('to-left', 'to-right');
    const box = (wrap.closest('.st-scroll') ?? document.body).getBoundingClientRect();
    const r = pop.getBoundingClientRect();
    if (!r.width) return;
    if (r.left < box.left + 4) wrap.classList.add('to-right');
    else if (r.right > box.right - 4) wrap.classList.add('to-left');
  };
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !wrap.classList.contains('open');
    closePops();
    wrap.classList.toggle('open', open);
    b.setAttribute('aria-expanded', String(open));
    if (open) place();
  });
  wrap.addEventListener('mouseenter', () => requestAnimationFrame(place));
  b.addEventListener('focus', () => requestAnimationFrame(place));
  return wrap;
}

/** Where a number comes from: a FROM tag on the tile's top-left corner that lists every source. */
function fromPop(list: Src[]): HTMLElement | null {
  if (!list.length) return null;
  return popBtn('from', ['FROM ', h('b', {}, String(list.length))], `From: ${list.map((s) => s.name).join(', ')}`, h('div', { class: 'st-from' }, ...list.map(chip)));
}

/** A longer explanation behind an i button. */
function infoPop(note: string | undefined, label: string): HTMLElement | null {
  if (!note) return null;
  return popBtn('info', ['i'], `${label}: ${note}`, h('div', { class: 'st-note' }, note));
}

function toneChip(t: Tile): HTMLElement | null {
  if (t.tone === 'up') return h('span', { class: 'st-delta up', 'aria-label': 'above base' }, '▲');
  if (t.tone === 'down') return h('span', { class: 'st-delta down', 'aria-label': 'below base' }, '▼');
  return null;
}

function tile(t: Tile, i: number): HTMLElement {
  const value =
    t.fmt === 'text'
      ? h('span', { class: 'st-num txt' }, t.text ?? '')
      : counter(t.num, (v) => `${t.pre ?? ''}${show(v, t.fmt)}${t.post ?? ''}`);
  // a longer value (+6 slices, every 20s) gets a smaller size so it fits beside its icon, clear of the i button
  const said = t.fmt === 'text' ? (t.text ?? '') : `${t.pre ?? ''}${show(t.num, t.fmt)}${t.post ?? ''}`;
  // (a word in capitals runs wider than digits: ECHOING takes the smaller size)
  const len = said.length > (t.fmt === 'text' ? 6 : 8) ? ' xlong' : said.length > 4 ? ' long' : '';
  return h(
    'div',
    { class: `st-tile ${t.tone}${t.big ? ' big' : ''}${t.from.length ? ' has-from' : ''}${len}`, style: `--i:${i}` },
    h('div', { class: 'st-ic' }, t.img ? h('img', { src: t.img, alt: '' }) : t.icon),
    h('div', { class: 'st-val' }, value, toneChip(t)),
    h('div', { class: 'st-lbl' }, t.label),
    fromPop(t.from),
    infoPop(t.note, t.label),
  );
}

function autoTile(t: AutoTile, i: number): HTMLElement {
  const per = t.dps === null ? (t.rate === 'smack' ? 'per smack' : t.rate === 'kill' ? 'per kill' : 'when it fires') : '/s';
  const value =
    t.dps !== null
      ? counter(t.dps, (v) => dps(v), 'dps')
      : h('span', { class: 'st-num txt small' }, t.rate === 'smack' || t.rate === 'kill' ? 'PLAY A WAVE' : 'ON CUE');
  return h(
    'div',
    { class: `st-auto${t.from.length ? ' has-from' : ''}`, style: `--i:${i};--ac:${t.color}` },
    h('div', { class: 'st-aic' }, t.img ? h('img', { src: t.img, alt: '' }) : t.icon),
    h('b', { class: 'st-aname', title: t.label }, t.label),
    h('span', { class: 'st-aval' }, value, h('small', {}, t.dps !== null ? per : ''), t.measured !== null ? h('span', { class: 'st-meas' }, `measured ${dps(t.measured)}/s`) : null),
    h('div', { class: 'st-abar' }, h('i', { style: `width:${Math.round(t.share * 100)}%` })),
    fromPop(t.from),
    infoPop(t.note, t.label),
  );
}

function sectionCard(s: Section, i: number): HTMLElement {
  const tiles = s.auto
    ? s.auto.length
      ? h('div', { class: 'st-autos' }, ...s.auto.map(autoTile))
      : h('div', { class: 'st-empty' }, s.empty ?? '')
    : s.tiles.length
      ? h('div', { class: 'st-tiles' }, ...s.tiles.map(tile))
      : h('div', { class: 'st-empty' }, s.empty ?? 'Nothing here yet.');
  return h(
    'section',
    { class: `st-card st-sec-${s.id}`, style: `--sc:${s.color};--i:${i}`, tabindex: 0, 'aria-label': `${s.title}${s.sub ? `: ${s.sub}` : ''}` },
    h('header', {}, h('span', { class: 'st-badge' }, s.icon), h('h3', {}, s.title), s.sub ? h('span', { class: 'st-sub' }, s.sub) : null),
    tiles,
  );
}

function heroCard(v: BuildView): HTMLElement {
  const smack = v.smackDps;
  const auto = v.autoDps;
  const sum = (smack ?? 0) + auto;
  const smackShare = sum > 0 ? (smack ?? 0) / sum : 0;
  const head =
    v.total !== null
      ? h('div', { class: 'st-big' }, h('span', { class: 'st-big-k' }, 'TOTAL DPS'), h('span', { class: 'st-big-v' }, counter(v.total, dps, 'huge'), h('small', {}, '/s')))
      : h('div', { class: 'st-big' }, h('span', { class: 'st-big-k' }, 'PER SMACK'), h('span', { class: 'st-big-v' }, counter(v.perSmack + v.smackExtras, (n) => fmt(Math.round(n)), 'huge'), h('small', { title: `At full momentum: keep smacking and automatic attacks stay at full. Idle they cool to ${Math.round(v.momentumFloor * 100)}% (${dps(auto * v.momentumFloor)}/s).` }, `+ ${dps(auto)}/s automatic`)));
  const pace =
    v.pace !== null
      ? h('span', { class: 'st-pace', title: `Measured: smacks that landed per second while feet were on the table (${v.paceFrom})` }, h('i', {}, '👋'), `${r1(v.pace)} smacks/s`, h('small', {}, v.paceFrom))
      : h('span', { class: 'st-pace wait' }, h('i', {}, '⏱️'), 'Play a wave to measure your pace');
  const split = h(
    'div',
    { class: 'st-split', role: 'img', 'aria-label': `Your smacks ${smack === null ? 'not measured yet' : `${dps(smack)} per second`}, automatic ${dps(auto)} per second` },
    h('i', { class: 'sm', style: `width:${smack === null ? 0 : Math.round(smackShare * 100)}%` }),
    h('i', { class: 'au', style: `width:${smack === null ? 100 : Math.round((1 - smackShare) * 100)}%` }),
  );
  const legend = h(
    'div',
    { class: 'st-legend' },
    h('span', { class: 'sm' }, h('b', {}, smack === null ? '?' : `${dps(smack)}/s`), ' your smacks'),
    h(
      'span',
      { class: 'au', title: `At full momentum: keep smacking and automatic attacks stay at full. Idle they cool to ${Math.round(v.momentumFloor * 100)}% (${dps(auto * v.momentumFloor)}/s).` },
      h('b', {}, `${dps(auto)}/s`),
      ' automatic',
      v.autoWaiting ? h('small', {}, ` (+${v.autoWaiting} after a wave)`) : null,
      auto > 0 ? h('small', {}, ` at full momentum · ${dps(auto * v.momentumFloor)}/s idle`) : null,
    ),
  );
  const facts = h(
    'div',
    { class: 'st-facts' },
    v.total !== null ? h('span', {}, h('b', {}, fmt(Math.round(v.perSmack))), ' a smack') : null,
    v.smackExtras > 0.5 ? h('span', {}, h('b', {}, `+${fmt(Math.round(v.smackExtras))}`), ' chain, splash and fire') : null,
    v.measured ? h('span', { class: 'meas', title: 'What really happened: all the damage dealt over the time feet were on the table' }, h('b', {}, `${dps(v.measured.dps)}/s`), ` measured ${v.measured.label}`) : null,
  );
  const lastWave = v.bars.length ? lastWaveBar(v) : plannedBar(v);
  return h(
    'div',
    { class: 'st-hero', tabindex: 0, 'aria-label': 'Damage per second' },
    h('div', { class: 'st-hero-l' }, h('div', { class: 'st-hero-top' }, head, pace), smack !== null ? split : null, smack !== null ? legend : null, facts),
    lastWave,
  );
}

/** Before any wave is measured: the automatic attacks' worked-out DPS as the same stacked bar. */
function plannedBar(v: BuildView): HTMLElement {
  const auto = v.sections.find((s) => s.auto)?.auto ?? [];
  const bars = auto.filter((a) => (a.dps ?? 0) > 0).map((a) => ({ key: a.key, label: a.label, color: a.color, value: a.dps! }));
  if (!bars.length) return h('div', { class: 'st-last empty' }, h('b', {}, 'WHAT DID THE WORK'), h('span', {}, 'Play a wave: its damage by source shows here.'));
  return stackBar('AUTOMATIC DPS, WORKED OUT', bars, 'Play a wave to see what really did the work.');
}

function lastWaveBar(v: BuildView): HTMLElement {
  return stackBar(`WHAT DID THE WORK · ${v.barsLabel.toUpperCase()}`, v.bars);
}

function stackBar(title: string, bars: { key: string; label: string; color: string; value: number }[], hint?: string): HTMLElement {
  const sum = bars.reduce((t, b) => t + b.value, 0);
  // small slivers fold into "other" so the legend stays readable
  const big = bars.filter((b) => b.value / sum >= 0.03).slice(0, 7);
  const other = sum - big.reduce((t, b) => t + b.value, 0);
  const parts = other > 0 ? [...big, { key: 'other', label: 'Other', color: '#a08a70', value: other }] : big;
  // the bar alone, with its key (and the hint) behind a KEY button: the summary stays compact
  const keys = h(
    'div',
    { class: 'st-keypop' },
    h(
      'div',
      { class: 'st-keys' },
      ...parts.map((p) => h('span', {}, h('i', { style: `background:${p.color}` }), p.key === 'other' ? '' : `${sourceInfo(p.key).icon} `, p.label, h('b', {}, `${Math.round((p.value / sum) * 100)}%`))),
    ),
    hint ? h('span', { class: 'st-hint' }, hint) : null,
  );
  const top = parts[0];
  return h(
    'div',
    { class: 'st-last' },
    h('div', { class: 'st-last-head' }, h('b', {}, title), popBtn('key', ['KEY'], `Key: ${parts.map((p) => `${p.label} ${Math.round((p.value / sum) * 100)}%`).join(', ')}`, keys)),
    h('div', { class: 'st-stack', role: 'img', 'aria-label': parts.map((p) => `${p.label} ${Math.round((p.value / sum) * 100)}%`).join(', ') }, ...parts.map((p) => h('i', { style: `width:${(p.value / sum) * 100}%;background:${p.color}`, title: `${p.label}: ${fmt(Math.round(p.value))} damage` }))),
    top ? h('span', { class: 'st-top' }, 'Most: ', h('b', {}, `${top.key === 'other' ? '' : `${sourceInfo(top.key).icon} `}${top.label} ${Math.round((top.value / sum) * 100)}%`)) : null,
  );
}

function pizzaCard(v: BuildView): HTMLElement {
  return h(
    'section',
    { class: 'st-card st-pizzas', style: `--sc:#d9963f;--i:${v.sections.length}`, tabindex: 0, 'aria-label': 'Pizza perks on the table' },
    h('header', {}, h('span', { class: 'st-badge' }, '🍕'), h('h3', {}, 'Pizza perks'), h('span', { class: 'st-sub' }, 'on the table, as they work now')),
    v.pizzas.length
      ? h(
          'div',
          { class: 'st-pzs' },
          ...v.pizzas.map((p, i) =>
            h(
              'div',
              { class: `st-pz${p.enhanced ? ' enh' : ''}${p.status ? ` ${p.status}` : ''}`, style: `--i:${i}` },
              pizzaThumb(p.id, p.slices, p.max, 120, p.stale, p.dead),
              h(
                'div',
                { class: 'st-pz-tx' },
                h('div', { class: 'st-pz-head' }, h('b', {}, p.name), p.enhanced ? h('span', { class: 'st-star' }, '★ ENHANCED') : null, p.status ? h('span', { class: `st-flag ${p.status}` }, p.status.toUpperCase()) : null),
                h('span', { class: 'st-pz-line' }, p.line),
                p.note ? h('small', {}, p.note) : null,
              ),
            ),
          ),
        )
      : h('div', { class: 'st-empty' }, 'No pizzas on the table.'),
  );
}

/** Short tab labels (the section's own header still says it in full), so the row fits without scrolling. */
const SHORT: Record<string, string> = { auto: 'Auto', cc: 'Control', peel: 'Peel' };

/** The sub-tab the player last looked at (kept while the game runs). */
let lastSub = '';

/** The sections as sub-tabs under the summary card: a row of small tabs (each with a hint: the automatic DPS, or how
 * many tiles are up on base), one pane showing at a time. Left and right on a tab, or a swipe on the pane, move along. */
function subTabs(v: BuildView): HTMLElement {
  const items: { id: string; icon: string; title: string; color: string; badge: string; pane: HTMLElement }[] = [
    ...v.sections.map((sec, i) => {
      const n = sec.auto ? sec.auto.length : sec.tiles.length;
      const up = sec.tiles.filter((t) => t.tone === 'up').length;
      const badge = sec.auto ? (v.autoDps > 0 ? `${dps(v.autoDps)}/s` : String(n)) : up ? `${up}▲` : String(n);
      return { id: sec.id, icon: sec.icon, title: SHORT[sec.id] ?? sec.title, color: sec.color, badge, pane: sectionCard(sec, i) };
    }),
    { id: 'pizzas', icon: '🍕', title: 'Pizzas', color: '#d9963f', badge: String(v.pizzas.length), pane: pizzaCard(v) },
  ];
  if (!items.some((it) => it.id === lastSub)) lastSub = items[0].id;
  const tabs: HTMLButtonElement[] = [];
  const panes = h('div', { class: 'st-panes' });
  const select = (id: string, focus = false) => {
    lastSub = id;
    items.forEach((it, i) => {
      const on = it.id === id;
      tabs[i].classList.toggle('active', on);
      tabs[i].setAttribute('aria-selected', String(on));
      tabs[i].tabIndex = on ? 0 : -1;
      it.pane.hidden = !on;
      if (on && focus) tabs[i].focus();
      // (a sideways-scrolling row on a phone keeps the chosen tab in view)
      if (on) tabs[i].scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    });
    closePops(panes);
  };
  const step = (d: number, focus = false) => {
    const i = items.findIndex((it) => it.id === lastSub);
    select(items[(i + d + items.length) % items.length].id, focus);
  };
  items.forEach((it) => {
    const b = h(
      'button',
      { class: 'st-subtab', type: 'button', role: 'tab', id: `st-tab-${it.id}`, 'aria-controls': `st-pane-${it.id}`, style: `--sc:${it.color}` },
      h('i', {}, it.icon),
      h('span', {}, it.title),
      h('b', {}, it.badge),
    );
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      select(it.id);
    });
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      e.stopPropagation();
      step(e.key === 'ArrowLeft' ? -1 : 1, true);
    });
    tabs.push(b);
    it.pane.id = `st-pane-${it.id}`;
    it.pane.setAttribute('role', 'tabpanel');
    it.pane.setAttribute('aria-labelledby', `st-tab-${it.id}`);
    panes.append(it.pane);
  });
  // a sideways swipe on the pane moves to the next or previous tab (a phone)
  let sx = 0;
  let sy = 0;
  let st = 0;
  panes.addEventListener('pointerdown', (e) => {
    sx = e.clientX;
    sy = e.clientY;
    st = performance.now();
  });
  panes.addEventListener('pointerup', (e) => {
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (e.pointerType !== 'mouse' && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6 && performance.now() - st < 600) step(dx < 0 ? 1 : -1);
  });
  select(lastSub);
  return h('div', { class: 'st-subs' }, h('div', { class: 'st-subtabs', role: 'tablist', 'aria-label': 'Stat sections' }, ...tabs), panes);
}

/** The whole STATS tab for a view. */
export function statsBody(v: BuildView): HTMLElement {
  counters = [];
  const body = h(
    'div',
    { class: `st-body${still() ? ' still' : ''}` },
    heroCard(v),
    subTabs(v),
    h('p', { class: 'st-foot' }, `Worked out from your toppings, pizzas and peel on ${v.heat}, for the foot you're smacking with ${v.feetMeasured ? `about ${r1(v.feet)} feet on the table (as you played)` : 'about 3 feet on the table'}: area hits count once. Measured numbers are what really happened.`),
  );
  body.addEventListener('click', (e) => !(e.target as Element | null)?.closest('.st-pop') && closePops(body));
  body.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && body.querySelector('.st-pw.open')) {
      e.stopPropagation();
      closePops(body);
    }
  });
  requestAnimationFrame(runCounters);
  return body;
}
