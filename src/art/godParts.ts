// Painting a god's head a part at a time, for the living god peels (src/art/peelGod.ts). The heads' own drawing code
// (src/art/godShapes.ts, src/art/godHeads.ts, the Leonidas and variant looks) asks `want(key)` before each piece that
// moves on its own (a peacock's feather, Hermes's wing, the lyre's strings, Kratos's crest): painting the still, every
// key is wanted, so the still is exactly as before; painting a rig, the head is painted once without its moving
// pieces and once for each piece alone. While a rig paints, the runes and gems the head draws are noted too (where
// they are, their colour), so the motion can light them.

let only: string | null = null;
let skip: ReadonlySet<string> = new Set();

/** A rune cut into a Norse head: its glyph, where, its turn and size, its glow. */
export interface RuneMark {
  idx: number;
  x: number;
  y: number;
  ang: number;
  s: number;
  col: string;
}
/** A gem set into a head. */
export interface GemMark {
  x: number;
  y: number;
  r: number;
  col: string;
}
export interface PartsSeen {
  runes: RuneMark[];
  gems: GemMark[];
}
let seen: PartsSeen | null = null;

/** Should the piece called `key` be painted now? (Pieces that don't move are 'base'.) */
export function want(key = 'base'): boolean {
  return only !== null ? only === key : !skip.has(key);
}

/** Paint with `fn`: only the piece `part` (null: everything but the pieces in `without`), noting the runes and gems
 *  painted into `note`. */
export function paintPart(part: string | null, without: Iterable<string>, fn: () => void, note?: PartsSeen): void {
  only = part;
  skip = new Set(without);
  seen = note ?? null;
  try {
    fn();
  } finally {
    only = null;
    skip = new Set();
    seen = null;
  }
}

export function noteRune(m: RuneMark): void {
  seen?.runes.push(m);
}
export function noteGem(m: GemMark): void {
  seen?.gems.push(m);
}
