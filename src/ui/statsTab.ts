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
function show(n: number, f: NumFmt): string {
  switch (f) {
    case 'int':
      return Math.abs(n) < 10 && Math.round(n) !== n ? r1(n) : fmt(Math.round(n));
    case 'dec':
      return r1(n);
    case 'pct':
      return `${fmt(Math.round(n))}%`;
    case 'x':
      return `×${r2(n)}`;
    case 'sec':
      return `${r1(n)}s`;
    default:
      return '';
  }
}

/** DPS: a decimal under 10, whole numbers above. */
const dps = (n: number) => (n < 10 ? r1(n) : fmt(Math.round(n)));

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
    { class: `st-src ${s.tone}`, title: s.tip ? `${s.name}: ${s.tip}` : s.name },
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
function popBtn(kind: 'from' | 'info', label: (Node | string)[], aria: string, content: HTMLElement): HTMLElement {
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
  return h(
    'div',
    { class: `st-tile ${t.tone}${t.big ? ' big' : ''}${t.from.length ? ' has-from' : ''}`, style: `--i:${i}` },
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
    h('b', { class: 'st-aname' }, t.label),
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
      : h('div', { class: 'st-big' }, h('span', { class: 'st-big-k' }, 'PER SMACK'), h('span', { class: 'st-big-v' }, counter(v.perSmack + v.smackExtras, (n) => fmt(Math.round(n)), 'huge'), h('small', {}, `+ ${dps(auto)}/s automatic`)));
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
    h('span', { class: 'au' }, h('b', {}, `${dps(auto)}/s`), ' automatic', v.autoWaiting ? h('small', {}, ` (+${v.autoWaiting} after a wave)`) : null),
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
  return h(
    'div',
    { class: 'st-last' },
    h('b', {}, title),
    h('div', { class: 'st-stack', role: 'img', 'aria-label': parts.map((p) => `${p.label} ${Math.round((p.value / sum) * 100)}%`).join(', ') }, ...parts.map((p) => h('i', { style: `width:${(p.value / sum) * 100}%;background:${p.color}`, title: `${p.label}: ${fmt(Math.round(p.value))} damage` }))),
    h(
      'div',
      { class: 'st-keys' },
      ...parts.map((p) => h('span', {}, h('i', { style: `background:${p.color}` }), p.key === 'other' ? '' : `${sourceInfo(p.key).icon} `, p.label, h('b', {}, `${Math.round((p.value / sum) * 100)}%`))),
    ),
    hint ? h('span', { class: 'st-hint' }, hint) : null,
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

/** The whole STATS tab for a view. */
export function statsBody(v: BuildView): HTMLElement {
  counters = [];
  const body = h(
    'div',
    { class: `st-body${still() ? ' still' : ''}` },
    heroCard(v),
    h('div', { class: 'st-grid' }, ...v.sections.map(sectionCard), pizzaCard(v)),
    h('p', { class: 'st-foot' }, `Worked out from your toppings, pizzas and peel on ${v.heat}, for the foot you're smacking with ${v.feetMeasured ? `about ${r1(v.feet)} feet on the table (as you played)` : 'about 3 feet on the table'}: area hits count once. Measured numbers are what really happened.`),
  );
  body.addEventListener('click', () => closePops(body));
  body.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && body.querySelector('.st-pw.open')) {
      e.stopPropagation();
      closePops(body);
    }
  });
  requestAnimationFrame(runCounters);
  return body;
}
