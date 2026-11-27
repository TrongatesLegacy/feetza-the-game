// Units: branded numbers, so a number carries what it measures (docs/effects-plan.md).
//
// At typecheck each unit is its own type: a Seconds can't go where a Chance belongs, and neither can a bare 20.
// At run time each is an ordinary number (the maths works on it directly, saves store it as is, it costs nothing).
// Each maker checks its range. Chance and Percent are written the way people say them (15) and stored as fractions
// (0.15), so the maths is the same everywhere. The units hold no maths of their own: what can be done with each
// lives beside it here (roll, boost, cut, scale, tick, show). Totals (stacking, order, caps) belong to the ledger
// (src/effects/ledger.ts).

declare const unit: unique symbol;
type Branded<B extends string> = number & { readonly [unit]: B };

/** A probability, 0–100% (stored 0..1). It gets rolled. */
export type Chance = Branded<'chance'>;
/** A size: +10% damage, 30% slower (stored as a fraction; may be negative down to −100%). */
export type Percent = Branded<'percent'>;
export type Seconds = Branded<'seconds'>;
/** So many a wave: slices regrown, tips paid, shields. */
export type PerWave = Branded<'perWave'>;
/** Screen pixels: smack reach, knockback. */
export type Px = Branded<'px'>;
/** A multiplier: ×1.5. */
export type Mult = Branded<'mult'>;
/** Whole things: blades, cards, rerolls, levels. */
export type Count = Branded<'count'>;
/** A plain amount: damage, damage a second, tips, crusts. */
export type Amount = Branded<'amount'>;
/** So many a second (olives fired). */
export type Rate = Branded<'rate'>;

/** Every unit by name (the stat definitions say which one each stat is in). */
export interface Units {
  chance: Chance;
  percent: Percent;
  seconds: Seconds;
  perWave: PerWave;
  px: Px;
  mult: Mult;
  count: Count;
  amount: Amount;
  rate: Rate;
  flag: boolean;
}
export type UnitName = keyof Units;
export type NumUnit = Exclude<UnitName, 'flag'>;

const DEV = typeof import.meta !== 'undefined' && !!import.meta.env?.DEV;

function check(ok: boolean, what: string, n: number): void {
  if (ok) return;
  const msg = `[units] ${what}: ${n} is out of range`;
  if (DEV) throw new RangeError(msg);
  console.error(msg);
}

const finite = (n: number) => Number.isFinite(n);

// ——— makers ———

/** A chance as people say it: Unit.Chance(15) is 15% (0.15). 0–100. */
function Chance(n: number): Chance {
  check(finite(n) && n >= 0 && n <= 100, 'Chance', n);
  return (n / 100) as Chance;
}
/** A percentage as people say it: Unit.Percent(10) is +10% (0.1). −100 up. */
function Percent(n: number): Percent {
  check(finite(n) && n >= -100, 'Percent', n);
  return (n / 100) as Percent;
}
function Seconds(n: number): Seconds {
  check(finite(n) && n >= 0, 'Seconds', n);
  return n as Seconds;
}
function PerWave(n: number): PerWave {
  check(finite(n) && n >= 0, 'PerWave', n);
  return n as PerWave;
}
function Px(n: number): Px {
  check(finite(n) && n >= 0, 'Px', n);
  return n as Px;
}
function Mult(n: number): Mult {
  check(finite(n) && n > 0, 'Mult', n);
  return n as Mult;
}
function Count(n: number): Count {
  check(Number.isInteger(n) && n >= 0, 'Count', n);
  return n as Count;
}
function Amount(n: number): Amount {
  check(finite(n) && n >= 0, 'Amount', n);
  return n as Amount;
}
function Rate(n: number): Rate {
  check(finite(n) && n >= 0, 'Rate', n);
  return n as Rate;
}

// ——— maths ———

/** The one place gameplay rolls a chance (Math.random: seeded in the balance sim). */
function roll(c: Chance, rnd: () => number = Math.random): boolean {
  return rnd() < c;
}
/** A number grown by a percentage: boost(10, Percent(20)) is 12. */
function boost<T extends number>(v: T, p: Percent): T {
  return (v * (1 + p)) as T;
}
/** A number shrunk by a percentage: cut(10, Percent(20)) is 8. */
function cut<T extends number>(v: T, p: Percent): T {
  return (v * (1 - p)) as T;
}
/** Any unit times a plain factor (a perk's strength, a level): still the same unit. */
function scale<T extends number>(v: T, k: number): T {
  return (v * k) as T;
}
/** A chance times a factor, never past certainty. */
function scaleChance(c: Chance, k: number): Chance {
  return Math.max(0, Math.min(1, c * k)) as Chance;
}
/** A timer run down by dt seconds (never below 0). */
function tick(left: Seconds, dt: number): Seconds {
  return Math.max(0, left - dt) as Seconds;
}

/** Any unit from a fraction already worked out elsewhere (the ledger's totals, a perk's strength × its size). */
function of<U extends NumUnit>(_u: U, n: number): Units[U] {
  return n as Units[U];
}

// ——— words ———

const trim = (n: number, dp = 1) => {
  const k = 10 ** dp;
  return String(Math.round(n * k) / k);
};

const show = {
  /** 0.15 → "15%" */
  chance: (c: number) => `${trim(c * 100)}%`,
  /** 0.1 → "+10%", −0.15 → "−15%" */
  percent: (p: number) => `${p < 0 ? '−' : '+'}${trim(Math.abs(p) * 100)}%`,
  seconds: (s: number) => `${trim(s)}s`,
  perWave: (n: number) => `+${trim(n)} a wave`,
  px: (n: number) => `${trim(n, 0)}`,
  /** 1.5 → "×1.5" */
  mult: (m: number) => `×${trim(m, 2)}`,
  count: (n: number) => `${n < 0 ? '−' : '+'}${Math.abs(Math.round(n))}`,
  amount: (n: number) => trim(n),
  rate: (n: number) => `${trim(n, 2)}/s`,
  flag: (b: boolean) => (b ? 'ON' : 'OFF'),
};

/** Every unit's maker and its maths, under one name: Unit.Chance(15), Unit.roll(c), Unit.show.percent(p). */
export const Unit = { Chance, Percent, Seconds, PerWave, Px, Mult, Count, Amount, Rate, roll, boost, cut, scale, scaleChance, tick, of, show } as const;
