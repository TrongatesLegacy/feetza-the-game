// How an effect reads on a card: the card text is generated from the effects (docs/effects-plan.md, "Card text").
//
// Each stat's definition says how its change reads (`words` in src/effects/stats.ts); this turns one stat effect's op
// into a phrase, sorts it into an upside or a downside by the stat's `Better` (a change is a downside when it moves the
// stat the worse way), and joins a side's phrases into one line, the way the cards read: short phrases, commas, the
// first letter capitalised, and phrases about the same subject joined ("Feet have 20% more health and move 10% faster").
//
// The game's card text (src/game/cardText.ts) reads these with the run's words (the peel's meter); Effect.Stat's
// describe() reads them with plain ones.

import { isGrowing, type OpData } from './ledger';
import { opAt, type StatData } from './stat';
import { Better, Fold, STAT_DEFS, type Change, type StatKey, type WordsCtx } from './stats';
import { UnitKind } from './units';

/** One phrase of a card's text. */
export interface Phrase {
  /** The phrase, without its subject ("move 6% faster" when the subject is "feet"). */
  text: string;
  subject?: string;
  /** The fuller line for when it's the only phrase on its side. */
  alone?: string;
  /** An upside (true) or a downside. */
  good: boolean;
}

/** Words outside a run (describe(), searches): the meter as "meter". */
export const PLAIN_WORDS: WordsCtx = {
  meterBoost: (p) => `+${p}% meter charge`,
  meterCut: (p) => `−${p}% meter charge`,
  superStart: (p) => `start each wave ${p}% charged`,
  freeze: () => 'the Peel Slam also freezes every foot',
  slamStun: () => 'the Peel Slam stuns every foot',
};

const round = (n: number, dp = 1) => {
  const k = 10 ** dp;
  return Math.round(n * k) / k;
};

/** A stat's change by one op, ready for its words (null: nothing to say, a growing value). */
export function changeOf(stat: StatKey, o: OpData): Change | null {
  const d = STAT_DEFS[stat];
  if (o.op === 'on') return { signed: '', size: '', n: 1, times: '', dir: 1, value: 1, set: false };
  const v = o.value;
  if (isGrowing(v)) return null;
  const pct = d.unit === UnitKind.Chance || d.unit === UnitKind.Percent;
  const sized = (n: number) => (d.unit === UnitKind.Seconds ? `${n}s` : `${n}`);
  if (o.op === 'add') {
    // (a multiplier stat adds percentages: +25% tips)
    const asPct = pct || d.unit === UnitKind.Mult;
    const n = round(Math.abs(v) * (asPct ? 100 : 1));
    const size = asPct ? `${n}%` : sized(n);
    const dir = v < 0 ? -1 : 1;
    return { signed: `${dir < 0 ? '−' : '+'}${size}`, size, n, times: '', dir, value: v, set: false };
  }
  if (o.op === 'mul') {
    const n = round(Math.abs(v - 1) * 100);
    const dir = v < 1 ? -1 : 1;
    const times = `${round(v, 2)}×`;
    // (a whole multiplier of 2 or more reads as times: ×2 smack damage)
    const whole = v >= 2 && Number.isInteger(v);
    return { signed: whole ? `×${v}` : `${dir < 0 ? '−' : '+'}${n}%`, size: `${n}%`, n, times, dir, value: v, set: false };
  }
  // a Set (or a bound): the stat's new value, which way from its base
  const base = typeof d.base === 'number' ? d.base : 0;
  const dir = v < base ? -1 : 1;
  const n = pct ? round(v * 100) : d.unit === UnitKind.Rate ? round(1 / v, 2) : round(v, 2);
  const size = pct ? `${n}%` : d.unit === UnitKind.Rate ? `${n}s` : d.unit === UnitKind.Mult ? `${n}×` : sized(n);
  return { signed: size, size, n, times: `${round(v, 2)}×`, dir, value: v, set: true };
}

/** One op on a stat as a phrase. */
export function phraseOf(stat: StatKey, o: OpData, w: WordsCtx = PLAIN_WORDS): Phrase | null {
  const c = changeOf(stat, o);
  if (!c) return null;
  const d = STAT_DEFS[stat];
  const words = d.words;
  const good = o.op === 'on' ? d.better === Better.Up : d.better === Better.Up ? c.dir > 0 : c.dir < 0;
  // (a cut on a stat whose cuts apply to its base says so: −15% base smack reach)
  const base = o.op === 'mul' && c.dir < 0 && d.fold === Fold.CutsOnBase ? 'base ' : '';
  const text = words.say ? words.say(c, w) : `${c.signed} ${base}${words.noun ?? d.label.toLowerCase()}`;
  return { text, subject: words.subject, alone: words.alone?.(c, w), good };
}

/** A stat effect's phrase at a level (what taking that level does): null when it does nothing there. */
export function statPhrase(e: StatData, level: number, w: WordsCtx = PLAIN_WORDS): Phrase | null {
  if (e.atLevel !== undefined && e.atLevel !== level) return null;
  const o = opAt(e.op, level);
  return o ? phraseOf(e.stat, o, w) : null;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A side's phrases as one line ("" when none): a lone phrase reads its fuller line; phrases about the same subject
 *  next to each other join with "and". */
export function joinPhrases(list: readonly Phrase[]): string {
  if (!list.length) return '';
  if (list.length === 1 && list[0].alone) return cap(list[0].alone);
  const parts: string[] = [];
  let last: string | undefined;
  for (const p of list) {
    if (p.subject && p.subject === last) parts[parts.length - 1] += ` and ${p.text}`;
    else parts.push(p.subject ? `${p.subject} ${p.text}` : p.text);
    last = p.subject;
  }
  return cap(parts.join(', '));
}

/** A stat effect in words, all its levels: "+18% chain lightning chance, +10% each level-up". */
export function describeStatEffect(e: StatData, w: WordsCtx = PLAIN_WORDS): string {
  const first = opAt(e.op, 1);
  const head = first ? phraseOf(e.stat, first, w) : null;
  const each = e.op.each ? changeOf(e.stat, e.op.each) : null;
  let s: string;
  if (!head) s = e.op.each ? `${joinPhrases([phraseOf(e.stat, e.op.each, w)!].filter(Boolean))} each level-up` : '';
  else s = joinPhrases([head]) + (each ? `, ${each.signed} each level-up` : '');
  return e.atLevel !== undefined ? `${s} at LV ${e.atLevel}` : s;
}
