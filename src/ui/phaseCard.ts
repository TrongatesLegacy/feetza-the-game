// The phase intro card (src/game/phaseCards.ts): the boss and its phase, a picture row (the boss's portrait, then
// each thing to hit in a gold HIT THIS ring with its hit count, and anything to watch out for in red), and three
// short lines: what's happening, what to hit, and what happens if you don't. Pictures are drawn from the game's
// own textures, so they match what's on the table.

import { FOOT_BY_ID } from '../data/feet';
import { footPortraitURL, textureCanvas } from '../game/assets';
import type { CardShow, ResolvedPhaseCard } from '../game/phaseCards';
import { btn, h } from './ui';
import './phaseCard.css';

/** Canvas pixels per picture (shown at about 9 em: crisp on a 2× screen at desktop size). */
const PIC = 220;

/** A foot's portrait; tinted as the fight tints it (a glowing jellyfish, a red-hot heel) on a canvas. */
function portrait(url: string, tint?: number): HTMLElement {
  if (tint === undefined) return h('img', { src: url, alt: '' });
  const c = h('canvas', { width: String(PIC), height: String(PIC) });
  const img = new Image();
  img.onload = () => {
    const ctx = c.getContext('2d')!;
    const k = Math.min(PIC / img.width, PIC / img.height);
    const at = [(PIC - img.width * k) / 2, (PIC - img.height * k) / 2, img.width * k, img.height * k] as const;
    ctx.drawImage(img, ...at);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `#${tint.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, PIC, PIC);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(img, ...at);
  };
  img.src = url;
  return c;
}

function picture(c: ResolvedPhaseCard, s: CardShow, i: number): HTMLElement | null {
  // '@boss': the boss itself; '@foot:<id>': a foot it brings (its portrait)
  const foot = s.key === '@boss' ? c.id : s.key.startsWith('@foot:') ? s.key.slice(6) : null;
  if (foot && !FOOT_BY_ID[foot]) return null;
  const art = foot ? portrait(footPortraitURL(foot), s.tint) : textureCanvas(s.key, PIC, PIC, c.art[s.key], s.tint);
  if (!art) return null;
  const kind = s.watch ? 'watch' : 'hit';
  return h(
    'figure',
    { class: `pc-pic ${kind}`, style: `--i:${i}` },
    h('span', { class: 'pc-flag' }, s.watch ? 'WATCH OUT' : 'HIT THIS'),
    h('div', { class: 'pc-well' }, h('i', { class: 'pc-ring' }), art, s.hits && s.hits > 1 && !s.watch ? h('b', { class: 'pc-count', 'aria-label': `${s.hits} hits` }, `×${s.hits}`) : null),
    h('figcaption', {}, s.label),
  );
}

/** The card's panel. `ok` closes it; `off` closes it and turns phase cards off. */
export function phaseCardPanel(c: ResolvedPhaseCard, ok: () => void, off: () => void): HTMLElement {
  const pics = c.show.slice(0, 3).map((s, i) => picture(c, s, i + 1)).filter((e): e is HTMLElement => !!e);
  // nothing to point at (or its art is missing): the boss and a big icon
  if (!pics.length) pics.push(h('figure', { class: 'pc-pic icon', style: '--i:1' }, h('span', { class: 'pc-flag' }, 'THIS PHASE'), h('div', { class: 'pc-well' }, h('span', { class: 'pc-emoji', 'aria-hidden': 'true' }, c.icon)), h('figcaption', {}, c.name.toLowerCase())));
  const portrait = h(
    'figure',
    { class: 'pc-pic boss', style: '--i:0' },
    h('span', { class: 'pc-flag' }, c.mini ? 'MINI-BOSS' : 'BOSS'),
    h('div', { class: 'pc-well' }, h('img', { src: footPortraitURL(c.id), alt: '' })),
    h('figcaption', {}, c.bossName),
  );
  const okBtn = btn('OK', 'green big pc-ok', ok, { 'data-pad': 'back', 'data-pad-default': '', 'data-no-x': '' });
  const line = (cls: string, tag: string, text: string) => h('li', { class: cls }, h('i', {}, tag), h('span', {}, text));
  const panel = h(
    'div',
    { class: 'panel modal phasecard', 'data-phase': String(Math.min(4, c.phase)), role: 'dialog', 'aria-label': `${c.bossName}, phase ${c.phase}: ${c.name}` },
    h(
      'div',
      { class: 'pc-head' },
      h('span', { class: 'pc-tag' }, c.phases > 1 ? `PHASE ${c.phase} / ${c.phases}` : c.mini ? 'MINI-BOSS' : 'BOSS FIGHT'),
      h('div', { class: 'pc-who' }, h('span', { class: 'pc-boss' }, c.bossName), h('span', { class: 'title pc-name' }, c.name)),
    ),
    h(
      'div',
      { class: 'pc-body' },
      h('div', { class: `pc-stage n${pics.length + 1}` }, portrait, h('span', { class: 'pc-arrow', 'aria-hidden': 'true' }), ...pics),
      h('ul', { class: 'pc-lines' }, line('what', 'WHAT', c.what), line('hit', 'HIT', c.hit), c.miss ? line('miss', 'IF NOT', c.miss) : null),
    ),
    h('div', { class: 'row pc-row' }, okBtn, btn("OK, DON'T SHOW PHASE CARDS AGAIN", 'cream small pc-off', off)),
    h('div', { class: 'hint' }, 'Shown the first time you reach each phase. Bring them back with Reset intro cards in Settings.'),
  );
  return panel;
}
