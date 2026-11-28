// Random numbers for things that are only for show (a sound's pitch wobble, which take plays, a slot reel's blur).
// They come from their own generator, not Math.random, so whether a sound happened to play (it may still be loading,
// or be throttled) never shifts the game's own random sequence: a seeded run (the balance simulator) plays the same.
let s = (Date.now() ^ 0x9e3779b9) >>> 0 || 1;

/** How many cosmetic numbers have been drawn (the art prebuild leaves out art painted with any: src/game/packs.ts). */
export const crandCount = { n: 0 };

/** A number in [0, 1), like Math.random, from the cosmetic generator. */
export function crand(): number {
  crandCount.n++;
  s ^= s << 13;
  s >>>= 0;
  s ^= s >>> 17;
  s ^= s << 5;
  s >>>= 0;
  return s / 4294967296;
}

/** The balance sim (src/devSim.ts) starts every run's cosmetic sequence from the same seed. Cosmetic numbers can still
 *  reach play through what's drawn where (a waiter's tray is flung from where his swaying arm holds it), so a seeded
 *  run must not start from the page's clock. */
export function seedCosmetic(n: number): void {
  s = (n ^ 0x9e3779b9) >>> 0 || 1;
}

/** One of `a`, picked by the cosmetic generator (a quip's words, a prop's look). */
export function cpick<T>(a: readonly T[]): T {
  return a[Math.floor(crand() * a.length)];
}

/** Run `fn` with Math.random drawing from the cosmetic generator: for looks that Phaser draws randomness for
 *  itself (a particle burst's ranges, a tile sprite's texture key), so they never move the game's own sequence on. */
export function cosmetic<T>(fn: () => T): T {
  const was = Math.random;
  Math.random = crand;
  try {
    return fn();
  } finally {
    Math.random = was;
  }
}
