// The game clock: the world's own time, the one the feet move on (GameScene.update's `dt`: real time slowed by
// hit-stop, slow-mo and Speed Force). Gameplay that happens later, or over time, runs on it: a flying hit landing, a
// boss's lunge, a foot being taken off the table at the end of its death. Phaser's tweens and timers run on clocks of
// their own (tweens at `tweens.timeScale`, scene timers at none of the world's slow-downs), so nothing a player's run
// depends on waits on them (docs/core-split-plan.md, stage 1; the lint rule `effects/no-gameplay-in-tweens`).
//
// Pure TypeScript, no Phaser: the game core (docs/core-split-plan.md) runs it in Node as it is. Its tweens take the
// same config as Phaser's (targets, numeric props, duration, delay, ease, yoyo, hold, repeat, onStart / onUpdate /
// onYoyo / onRepeat / onComplete), so a gameplay tween moves onto it by changing where it's added. A tween on the clock
// may also move a look along with the hit it carries (a meteor's image): the look then keeps the world's pace, and the
// hit and the picture stay together. Splitting the look from the state (the view reading the core's flights) is the
// view stage's job.

export type Ease = (v: number) => number;

// Phaser's ease functions, copied formula for formula (phaser/src/math/easing), so a tween moved here eases the same.
const backIn: Ease = (v) => v * v * ((1.70158 + 1) * v - 1.70158);
const backOut: Ease = (v) => --v * v * ((1.70158 + 1) * v + 1.70158) + 1;
const backInOut: Ease = (v) => {
  const s = 1.70158 * 1.525;
  if ((v *= 2) < 1) return 0.5 * (v * v * ((s + 1) * v - s));
  return 0.5 * ((v -= 2) * v * ((s + 1) * v + s) + 2);
};
const bounceOut: Ease = (v) => {
  if (v < 1 / 2.75) return 7.5625 * v * v;
  if (v < 2 / 2.75) return 7.5625 * (v -= 1.5 / 2.75) * v + 0.75;
  if (v < 2.5 / 2.75) return 7.5625 * (v -= 2.25 / 2.75) * v + 0.9375;
  return 7.5625 * (v -= 2.625 / 2.75) * v + 0.984375;
};
const bounceIn: Ease = (v) => 1 - bounceOut(1 - v);
const bounceInOut: Ease = (v) => (v < 0.5 ? (1 - bounceOut(1 - v * 2)) * 0.5 : bounceOut(v * 2 - 1) * 0.5 + 0.5);
const elastic = (kind: 'in' | 'out' | 'inout'): Ease => (v) => {
  if (v === 0) return 0;
  if (v === 1) return 1;
  const s = 0.1 / 4;
  const p = 0.1;
  if (kind === 'in') return -(Math.pow(2, 10 * (v -= 1)) * Math.sin(((v - s) * (2 * Math.PI)) / p));
  if (kind === 'out') return Math.pow(2, -10 * v) * Math.sin(((v - s) * (2 * Math.PI)) / p) + 1;
  if ((v *= 2) < 1) return -0.5 * (Math.pow(2, 10 * (v -= 1)) * Math.sin(((v - s) * (2 * Math.PI)) / p));
  return Math.pow(2, -10 * (v -= 1)) * Math.sin(((v - s) * (2 * Math.PI)) / p) * 0.5 + 1;
};
const power = (n: number) => ({
  in: ((v) => v ** n) as Ease,
  out: ((v) => 1 - (1 - v) ** n) as Ease,
  inout: ((v) => ((v *= 2) < 1 ? 0.5 * v ** n : n % 2 ? 0.5 * ((v -= 2) ** n + 2) : -0.5 * ((v -= 2) ** n - 2))) as Ease,
});
// (Phaser writes the powers out by hand: v * v * v. `**` with a whole exponent gives the same doubles.)
const quad: Record<'in' | 'out' | 'inout', Ease> = {
  in: (v) => v * v,
  out: (v) => v * (2 - v),
  inout: (v) => ((v *= 2) < 1 ? 0.5 * v * v : -0.5 * (--v * (v - 2) - 1)),
};
const cubic: Record<'in' | 'out' | 'inout', Ease> = {
  in: (v) => v * v * v,
  out: (v) => --v * v * v + 1,
  inout: (v) => ((v *= 2) < 1 ? 0.5 * v * v * v : 0.5 * ((v -= 2) * v * v + 2)),
};
const sine: Record<'in' | 'out' | 'inout', Ease> = {
  in: (v) => (v === 0 ? 0 : v === 1 ? 1 : 1 - Math.cos((v * Math.PI) / 2)),
  out: (v) => (v === 0 ? 0 : v === 1 ? 1 : Math.sin((v * Math.PI) / 2)),
  inout: (v) => (v === 0 ? 0 : v === 1 ? 1 : 0.5 * (1 - Math.cos(Math.PI * v))),
};
const expo: Record<'in' | 'out' | 'inout', Ease> = {
  in: (v) => Math.pow(2, 10 * (v - 1)) - 0.001,
  out: (v) => 1 - Math.pow(2, -10 * v),
  inout: (v) => ((v *= 2) < 1 ? 0.5 * Math.pow(2, 10 * (v - 1)) : 0.5 * (2 - Math.pow(2, -10 * (v - 1)))),
};
const circ: Record<'in' | 'out' | 'inout', Ease> = {
  in: (v) => 1 - Math.sqrt(1 - v * v),
  out: (v) => Math.sqrt(1 - --v * v),
  inout: (v) => ((v *= 2) < 1 ? -0.5 * (Math.sqrt(1 - v * v) - 1) : 0.5 * (Math.sqrt(1 - (v -= 2) * v) + 1)),
};
const FAMILIES: Record<string, Record<'in' | 'out' | 'inout', Ease>> = {
  quad,
  cubic,
  quart: power(4),
  quint: power(5),
  sine,
  expo,
  circ,
  back: { in: backIn, out: backOut, inout: backInOut },
  bounce: { in: bounceIn, out: bounceOut, inout: bounceInOut },
  elastic: { in: elastic('in'), out: elastic('out'), inout: elastic('inout') },
};
const linear: Ease = (v) => v;
const POWERS = ['quad', 'cubic', 'quart', 'quint'];

/** An ease by Phaser's name for it ('Quad.In', 'Back.Out', 'Sine.InOut', 'Linear', 'Power2'…); Phaser's default
 *  (linear) when none is given. */
export function easeOf(e: string | Ease | undefined): Ease {
  if (typeof e === 'function') return e;
  if (!e || e === 'Linear' || e === 'Power0') return linear;
  const pw = /^Power([1-4])$/.exec(e);
  if (pw) return FAMILIES[POWERS[Number(pw[1]) - 1]].out;
  const [fam, dir = 'Out'] = e.split('.');
  const f = FAMILIES[fam.toLowerCase()];
  const d = dir.toLowerCase().replace(/^ease/, '') as 'in' | 'out' | 'inout';
  if (!f || !f[d]) throw new Error(`[clock] no ease called ${e}`);
  return f[d];
}

type Target = Record<string, unknown>;
type PropEnd = number | string | { from: number; to: number } | { getStart?: () => number; getEnd: () => number };
type Callback = (tw: ClockTween) => void;

const KEYS = new Set(['from', 'to', 'targets', 'duration', 'delay', 'ease', 'yoyo', 'hold', 'repeat', 'onStart', 'onUpdate', 'onYoyo', 'onRepeat', 'onComplete']);

export interface ClockTweenConfig {
  /** What it moves: an object, or several (each prop on each). None for a plain timer or a counter. */
  targets?: object | readonly object[];
  /** Milliseconds of game time (one leg: a yoyo takes twice this). */
  duration: number;
  delay?: number;
  ease?: string | Ease;
  yoyo?: boolean;
  /** Milliseconds it holds at the end of a leg before it yoyos back. */
  hold?: number;
  /** Times it plays again after the first (a yoyo's out-and-back counts as one play); -1 for ever. */
  repeat?: number;
  onStart?: Callback;
  onUpdate?: Callback;
  onYoyo?: Callback;
  onRepeat?: Callback;
  onComplete?: Callback;
  /** A counter (no targets): getValue() goes from `from` to `to`, as Phaser's addCounter. */
  from?: number;
  to?: number;
  /** Numeric props: a value to go to, '+=n' / '-=n', { from, to }, or { getEnd } (worked out as it starts). */
  [prop: string]: unknown;
}

interface Data {
  t: Target;
  key: string;
  end: PropEnd;
  from: number;
  to: number;
}

/** One tween (or timer) on the game clock. */
export class ClockTween {
  /** Milliseconds of game time it has run (its delay included). */
  elapsed = 0;
  /** How far through the current leg, 0..1 (before easing). */
  progress = 0;
  private started = false;
  private data: Data[] = [];
  private ease: Ease;
  private legs: number;
  private leg = 0;
  private legT = 0;
  private holdT = 0;
  paused = false;
  /** Finished, or stopped: it does nothing more. */
  done = false;
  readonly targets: Target[];

  constructor(readonly cfg: ClockTweenConfig) {
    const t = cfg.targets;
    this.targets = (t === undefined ? [] : Array.isArray(t) ? [...t] : [t]) as Target[];
    this.ease = easeOf(cfg.ease);
    this.legs = cfg.yoyo ? 2 : 1;
    for (const key of Object.keys(cfg)) {
      if (KEYS.has(key)) continue;
      const end = cfg[key];
      if (typeof end !== 'number' && typeof end !== 'string' && !(end && typeof end === 'object' && ('to' in end || 'getEnd' in end))) throw new Error(`[clock] can't tween ${key}`);
      for (const tg of this.targets) this.data.push({ t: tg, key, end: end as PropEnd, from: 0, to: 0 });
    }
  }

  /** A counter's value (from `from` to `to`, eased); with neither, the eased progress of the current leg. */
  getValue(): number {
    const v = this.ease(this.leg === 1 ? 1 - this.progress : this.progress);
    const from = this.cfg.from ?? 0;
    const to = this.cfg.to ?? 1;
    return from + (to - from) * v;
  }

  isPlaying(): boolean {
    return !this.done && !this.paused;
  }

  pause(): this {
    this.paused = true;
    return this;
  }

  resume(): this {
    this.paused = false;
    return this;
  }

  /** Stop where it is: no onComplete. */
  stop(): this {
    this.done = true;
    return this;
  }

  remove(): this {
    return this.stop();
  }

  private begin(): void {
    this.started = true;
    for (const d of this.data) {
      const cur = Number(d.t[d.key] ?? 0);
      const e = d.end;
      if (typeof e === 'number') {
        d.from = cur;
        d.to = e;
      } else if (typeof e === 'string') {
        const m = /^([+-])=(-?[\d.]+)$/.exec(e);
        if (!m) throw new Error(`[clock] can't read ${d.key}: ${e}`);
        d.from = cur;
        d.to = cur + (m[1] === '+' ? 1 : -1) * Number(m[2]);
      } else if ('getEnd' in e) {
        // (as Phaser: worked out once, as the tween starts)
        d.from = e.getStart ? e.getStart() : cur;
        d.to = e.getEnd();
      } else {
        d.from = e.from;
        d.to = e.to;
      }
    }
    this.cfg.onStart?.(this);
  }

  private apply(): void {
    const v = this.ease(this.leg === 1 ? 1 - this.progress : this.progress);
    for (const d of this.data) d.t[d.key] = d.from + (d.to - d.from) * v;
  }

  /** Move on `ms` of game time. Returns true once it's done. */
  step(ms: number): boolean {
    if (this.done) return true;
    if (this.paused) return false;
    this.elapsed += ms;
    const delay = this.cfg.delay ?? 0;
    if (!this.started) {
      if (this.elapsed < delay) return false;
      ms = this.elapsed - delay;
      this.begin();
      if (this.done) return true;
    }
    const dur = Math.max(1e-6, this.cfg.duration);
    let left = ms;
    // a big step can run through a whole leg (or several): each leg's end still happens, in order
    for (let guard = 0; guard < 1000; guard++) {
      if (this.holdT > 0) {
        const h = Math.min(this.holdT, left);
        this.holdT -= h;
        left -= h;
        if (this.holdT > 0) return false;
        this.startLeg(1);
        continue;
      }
      this.legT += left;
      left = 0;
      if (this.legT < dur) {
        this.progress = this.legT / dur;
        this.apply();
        this.cfg.onUpdate?.(this);
        return this.done;
      }
      // the leg ends
      left = this.legT - dur;
      this.progress = 1;
      this.apply();
      this.cfg.onUpdate?.(this);
      if (this.done) return true;
      if (this.leg === 0 && this.legs === 2) {
        if (this.cfg.hold) {
          this.holdT = this.cfg.hold;
          this.legT = dur;
          if (left <= 0) return false;
          continue;
        }
        this.startLeg(1);
        continue;
      }
      const rep = this.cfg.repeat ?? 0;
      if (rep !== 0) {
        // (-1: for ever, until it's stopped)
        if (rep > 0) this.cfg.repeat = rep - 1;
        this.cfg.onRepeat?.(this);
        if (this.done) return true;
        this.startLeg(0);
        continue;
      }
      this.done = true;
      this.cfg.onComplete?.(this);
      return true;
    }
    return false;
  }

  private startLeg(leg: number): void {
    this.leg = leg;
    this.legT = 0;
    this.progress = 0;
    if (leg === 1) this.cfg.onYoyo?.(this);
  }
}

/** The game clock: tweens and timers on the world's time. */
export class GameClock {
  /** Game seconds since the clock began. */
  now = 0;
  private list: ClockTween[] = [];

  /** A tween on the game clock (the same config as Phaser's). */
  tween(cfg: ClockTweenConfig): ClockTween {
    const tw = new ClockTween(cfg);
    this.list.push(tw);
    return tw;
  }

  /** Run `fn` after `ms` milliseconds of game time. */
  after(ms: number, fn: () => void): ClockTween {
    return this.tween({ duration: Math.max(0, ms), onComplete: () => fn() });
  }

  /** Stop every tween moving `target` (or any of `targets`), as Phaser's killTweensOf. */
  killTweensOf(targets: object | readonly object[]): void {
    const set = new Set<unknown>(Array.isArray(targets) ? targets : [targets]);
    for (const tw of this.list) if (tw.targets.some((t) => set.has(t))) tw.stop();
  }

  isTweening(target: object): boolean {
    return this.list.some((tw) => !tw.done && tw.targets.includes(target as Target));
  }

  /** Move the clock on by `sec` game seconds: every tween in the order it was added. One added meanwhile starts on
   *  the next tick. */
  tick(sec: number): void {
    if (sec <= 0) return;
    this.now += sec;
    const ms = sec * 1000;
    const n = this.list.length;
    let finished = false;
    for (let i = 0; i < n; i++) if (this.list[i].step(ms)) finished = true;
    if (finished) this.list = this.list.filter((tw) => !tw.done);
  }

  /** Drop everything (a new run). */
  clear(): void {
    for (const tw of this.list) tw.stop();
    this.list = [];
    this.now = 0;
  }

  get size(): number {
    return this.list.length;
  }
}

// The scene's clock, for code that reaches the game through its Phaser scene (the feet, the fights, the kits): the
// game scene binds its clock as it's created and ticks it with the world's step. The core's own modules get it from
// their host instead.
const CLOCKS = new WeakMap<object, GameClock>();

export function bindClock(scene: object, clock: GameClock): void {
  CLOCKS.set(scene, clock);
}

interface FrameSource {
  events?: { on(ev: string, fn: (time: number, delta: number) => void): unknown; once(ev: string, fn: () => void): unknown };
}

/** The game clock of `scene`. A scene that binds none (the title screen's demo feet, a cutscene) gets one ticked by
 *  its own frames, in real time: nothing there is a run's gameplay. */
export function clockOf(scene: object): GameClock {
  let c = CLOCKS.get(scene);
  if (!c) {
    const clock = new GameClock();
    c = clock;
    CLOCKS.set(scene, clock);
    const ev = (scene as FrameSource).events;
    if (ev) {
      const tick = (_t: number, delta: number) => clock.tick(Math.min(0.05, delta / 1000));
      ev.on('update', tick);
      ev.once('shutdown', () => {
        (ev as unknown as { off(e: string, f: unknown): void }).off('update', tick);
        clock.clear();
        CLOCKS.delete(scene);
      });
    }
  }
  return c;
}
