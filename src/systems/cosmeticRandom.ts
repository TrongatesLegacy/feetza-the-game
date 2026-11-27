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
