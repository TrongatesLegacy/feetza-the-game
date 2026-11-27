// Pre-built art packs: the game's fixed art painted at build time (scripts/prebuild/run.mjs runs the same painters
// in a headless Chrome) and shipped as lossless WebP atlases, so a first visit downloads and decodes the art instead
// of painting it. See docs/prebuild.md.
//
// - The manifest (packs/manifest.json) maps each key the painters use to its pack, its atlas frames and any data the
//   painter returns. Packs: 'shared' (sprites, pizzas, everyday feet), 'peels' (the Peel Locker's thumbnails and the
//   peel art they're drawn from), one per act ('act1' … : its locations, arenas, themed feet and bosses) and 'extra'
//   (places outside the journey).
// - Never stale: the manifest records the pack version it was painted under (vite.config.ts: virtual:pack-version, a
//   hash of every source file the packed art is painted by). Any other version and the packs are ignored: everything
//   is painted, exactly as without packs.
// - Two ways in. Art the art cache keeps (feet, pizzas, sprites, peel thumbnails, crops: src/game/artCache.ts) is
//   read from a pack as from the cache (packHas / readPacked: fetched on first need, decoded off the main thread).
//   Backdrop textures (stills, live bases and pieces, frame sheets) are made synchronously by their painters, so a
//   backdrop's frames are decoded ahead (prepareBackdrop: while loading, during the shop before a stage) and its
//   painters take them (packedCanvas) instead of painting.
// - Anything not in a pack (dev edits, dynamic art), or a pack that fails to load, is painted as before.

import PACK_VERSION from 'virtual:pack-version';
import { crandCount } from '../systems/cosmeticRandom';

/** Bump when the manifest's layout changes. */
const FORMAT = 1;

/** A frame: [atlas index in its pack, x, y, w, h]. */
type Frame = [number, number, number, number, number];

export interface PackEntry {
  /** Its images, in the painter's order. */
  f: Frame[];
  /** Data the painter returned beside them (cache-backed art). */
  d?: unknown;
  /** Backdrop textures: the backdrop they belong to, and 's' (the still) or 'l' (the live layer's). */
  b?: string;
  m?: 's' | 'l';
}

export interface PackInfo {
  /** `lossy`: an atlas of opaque backdrop layers, lossy WebP (the rest are lossless). */
  atlases: { file: string; w: number; h: number; bytes: number; lossy?: boolean }[];
  entries: Record<string, PackEntry>;
}

export interface PackManifest {
  format: number;
  v: string;
  packs: Record<string, PackInfo>;
}

const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
/** ?noPacks: paint everything (before/after timings, the prebuild itself). */
const off = q.has('noPacks') || q.has('prebuild');

let manifest: PackManifest | null = null;
/** key → its pack's name. */
const where = new Map<string, string>();
/** backdrop id → its texture keys. */
const byBackdrop = new Map<string, string[]>();
let ready: Promise<boolean> | null = null;

/** Fetched atlases (compressed), by `pack/index`. */
const blobs = new Map<string, Promise<Blob | null>>();
/** Decoded atlases kept a moment (several frames of one are often wanted together), by `pack/index`. */
const decoded = new Map<string, { p: Promise<ImageBitmap | null>; t: number; busy: number }>();
const KEEP_DECODED = 3;
/** Backdrop frames decoded ahead, waiting for their painter. */
const ahead = new Map<string, ImageBitmap>();
const stats = { hits: 0, misses: 0, fetched: 0, bytes: 0, decodes: 0, decodeMs: 0, taken: 0 };

const base = (): string => (import.meta.env.BASE_URL || './').replace(/\/?$/, '/');

/** Load the manifest (once). False when there are no packs for this version. */
export function initPacks(ms = 2000): Promise<boolean> {
  if (ready) return ready;
  if (off || typeof fetch === 'undefined') return (ready = Promise.resolve(false));
  const load = (async () => {
    const r = await fetch(`${base()}packs/manifest.json`, { cache: 'no-cache' });
    if (!r.ok) return false;
    const m = (await r.json()) as PackManifest;
    if (m.format !== FORMAT || m.v !== PACK_VERSION) {
      if (import.meta.env.DEV) console.info(`[packs] built for ${m.v}, this is ${PACK_VERSION}: painting instead`);
      return false;
    }
    manifest = m;
    for (const [name, p] of Object.entries(m.packs))
      for (const [key, e] of Object.entries(p.entries)) {
        where.set(key, name);
        if (e.b) {
          const l = byBackdrop.get(e.b) ?? [];
          l.push(key);
          byBackdrop.set(e.b, l);
        }
      }
    return true;
  })().catch(() => false);
  ready = Promise.race([load, new Promise<boolean>((r) => setTimeout(() => r(false), ms))]).then((ok) => {
    if (!ok) {
      manifest = null;
      where.clear();
      byBackdrop.clear();
    }
    return ok;
  });
  return ready;
}

/** Is this key in a pack (manifest loaded)? */
export function packHas(key: string): boolean {
  return where.has(key);
}

const entryOf = (key: string): [string, PackEntry] | null => {
  const name = where.get(key);
  const e = name ? manifest?.packs[name]?.entries[key] : undefined;
  return name && e ? [name, e] : null;
};

function atlasBlob(name: string, i: number, low = false): Promise<Blob | null> {
  const id = `${name}/${i}`;
  let p = blobs.get(id);
  if (!p) {
    const a = manifest?.packs[name]?.atlases[i];
    if (!a) return Promise.resolve(null);
    p = fetch(`${base()}packs/${a.file}`, { priority: low ? 'low' : 'auto' } as RequestInit)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (b) {
          stats.fetched++;
          stats.bytes += b.size;
        }
        return b;
      })
      .catch(() => null);
    // a failed fetch can be tried again later
    void p.then((b) => b || blobs.delete(id));
    blobs.set(id, p);
  }
  return p;
}

/** A decoded atlas, held (busy) until `release`: one in use is never let go under a reader's feet. */
function decodeAtlas(name: string, i: number): Promise<ImageBitmap | null> {
  const id = `${name}/${i}`;
  const hit = decoded.get(id);
  if (hit) {
    hit.t = performance.now();
    hit.busy++;
    return hit.p;
  }
  const p = atlasBlob(name, i).then(async (b) => {
    if (!b) return null;
    const t0 = performance.now();
    // (straight alpha: a lossless WebP decoded premultiplied rounds faint edges its own way; drawn from straight
    // alpha, the frames read back exactly as painted)
    const bm = await createImageBitmap(b, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    stats.decodes++;
    stats.decodeMs += performance.now() - t0;
    return bm;
  }).catch(() => null);
  decoded.set(id, { p, t: performance.now(), busy: 1 });
  void p.then((bm) => (bm ? trimDecoded() : decoded.delete(id)));
  return p;
}

function releaseAtlas(name: string, i: number): void {
  const d = decoded.get(`${name}/${i}`);
  if (d) d.busy = Math.max(0, d.busy - 1);
  trimDecoded();
}

/** Keep only the few most recently used decoded atlases (they're big). */
function trimDecoded(): void {
  if (decoded.size <= KEEP_DECODED) return;
  const old = [...decoded.entries()].filter(([, d]) => !d.busy).sort((a, b) => a[1].t - b[1].t).slice(0, decoded.size - KEEP_DECODED);
  for (const [id, d] of old) {
    decoded.delete(id);
    void d.p.then((bm) => bm?.close());
  }
}

const crop = (bm: ImageBitmap, [, x, y, w, h]: Frame): Promise<ImageBitmap> => createImageBitmap(bm, x, y, w, h, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });

async function frames(name: string, e: PackEntry): Promise<ImageBitmap[] | null> {
  const ids = [...new Set(e.f.map((f) => f[0]))];
  try {
    const atl = await Promise.all(ids.map(async (i) => [i, await decodeAtlas(name, i)] as const));
    const by = new Map(atl);
    if (atl.some(([, bm]) => !bm)) return null;
    return await Promise.all(e.f.map((f) => crop(by.get(f[0])!, f)));
  } finally {
    for (const i of ids) releaseAtlas(name, i);
  }
}

/** A packed entry's images (decoded off the main thread) and data, as the art cache gives them; null if it isn't in
 * a pack or can't be had. */
export async function readPacked(key: string): Promise<{ bitmaps: ImageBitmap[]; data: unknown } | null> {
  const got = entryOf(key);
  if (!got) return null;
  try {
    const bitmaps = await frames(got[0], got[1]);
    if (!bitmaps) {
      stats.misses++;
      return null;
    }
    stats.hits++;
    return { bitmaps, data: got[1].d ?? null };
  } catch {
    stats.misses++;
    return null;
  }
}

/** A packed entry's first image as a PNG (a peel thumbnail served as a blob URL). */
export async function readPackedBlob(key: string): Promise<Blob | null> {
  const r = await readPacked(key);
  if (!r) return null;
  const [b, ...rest] = r.bitmaps;
  for (const x of rest) x.close();
  try {
    const c = new OffscreenCanvas(b.width, b.height);
    c.getContext('2d')!.drawImage(b, 0, 0);
    return await c.convertToBlob({ type: 'image/png' });
  } finally {
    b.close();
  }
}

/** Fetch a pack's atlases ahead of need (`low`: quietly, the next act's a few waves in). Resolves when they're in. */
export function prefetchPack(name: string, low = true): Promise<void> {
  const p = manifest?.packs[name];
  if (!p) return Promise.resolve();
  return Promise.all(p.atlases.map((_, i) => atlasBlob(name, i, low))).then(() => {});
}

/** The pack holding a backdrop's textures, if any. */
export function backdropPack(id: string): string | null {
  const k = byBackdrop.get(id)?.[0];
  return k ? (where.get(k) ?? null) : null;
}

const backdropWork = new Map<string, Promise<void>>();

/**
 * Decode a backdrop's packed textures ahead of its painters (off the main thread): its live layer's when `live`, else
 * its still. Keys already made (`have`) are skipped. Resolves when they're ready (or have failed: then they paint).
 */
export function prepareBackdrop(id: string, live: boolean, have: (key: string) => boolean = () => false): Promise<void> {
  const keys = (byBackdrop.get(id) ?? []).filter((k) => !ahead.has(k) && !have(k) && entryOf(k)?.[1].m === (live ? 'l' : 's'));
  if (!keys.length) return backdropWork.get(id) ?? Promise.resolve();
  const name = where.get(keys[0])!;
  const p = (async () => {
    const entries = keys.map((k) => [k, entryOf(k)![1]] as const);
    // each atlas decoded once, its frames cut, and let go
    const atlases = [...new Set(entries.flatMap(([, e]) => e.f.map((f) => f[0])))];
    for (const i of atlases) {
      const b = await atlasBlob(name, i);
      if (!b) continue;
      const t0 = performance.now();
      const bm = await createImageBitmap(b, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }).catch(() => null);
      if (!bm) continue;
      stats.decodes++;
      stats.decodeMs += performance.now() - t0;
      for (const [k, e] of entries) {
        if (e.f.length !== 1 || e.f[0][0] !== i || ahead.has(k)) continue;
        ahead.set(k, await crop(bm, e.f[0]));
      }
      bm.close();
    }
  })()
    .catch(() => {})
    .finally(() => backdropWork.delete(id));
  backdropWork.set(id, p);
  return p;
}

/** Are a backdrop's textures ready to show without painting (or is there nothing to wait for)? */
export function backdropReady(id: string, live: boolean, have: (key: string) => boolean = () => false): boolean {
  return !(byBackdrop.get(id) ?? []).some((k) => !ahead.has(k) && !have(k) && entryOf(k)?.[1].m === (live ? 'l' : 's'));
}

/** Let go of decoded frames nothing took (a stage left behind before its textures were made). */
export function dropBackdrop(id: string): void {
  for (const k of byBackdrop.get(id) ?? []) {
    ahead.get(k)?.close();
    ahead.delete(k);
  }
}

// ——— the painters' side ———

type Recorder = (key: string, canvas: HTMLCanvasElement, random: boolean) => void;
let recorder: Recorder | null = null;
/** Math.random calls while recording (the prebuild counts them); the cosmetic generator counts its own. */
let randomCalls = 0;
const randomNow = () => randomCalls + crandCount.n;

/** The prebuild (src/devPrebuild.ts) records what the painters make, and whether they used randomness. */
export function setPackRecorder(r: Recorder | null): void {
  recorder = r;
}

/** Counted for Math.random while recording: art painted with randomness isn't packed. */
export function countRandom(): void {
  randomCalls++;
}

/**
 * A backdrop texture's canvas: its packed frame when one was decoded ahead (prepareBackdrop), else painted. Every
 * painter of a fixed, keyed backdrop texture goes through this (assets.ensureBackdrop, sceneLive's bake and tex,
 * the frame sheets).
 */
export function packedCanvas(key: string, paint: () => HTMLCanvasElement): HTMLCanvasElement {
  const bm = ahead.get(key);
  if (bm) {
    ahead.delete(key);
    const c = document.createElement('canvas');
    c.width = bm.width;
    c.height = bm.height;
    c.getContext('2d')!.drawImage(bm, 0, 0);
    bm.close();
    stats.taken++;
    return c;
  }
  if (!recorder) return paint();
  const n0 = randomNow();
  const c = paint();
  recorder(key, c, randomNow() !== n0);
  return c;
}

/** Dev: F.packs() */
export function packsDev(): Record<string, unknown> {
  return {
    enabled: !!manifest,
    version: PACK_VERSION,
    built: manifest?.v ?? null,
    keys: where.size,
    packs: manifest ? Object.fromEntries(Object.entries(manifest.packs).map(([n, p]) => [n, { atlases: p.atlases.length, mb: +(p.atlases.reduce((s, a) => s + a.bytes, 0) / 1048576).toFixed(2), entries: Object.keys(p.entries).length }])) : {},
    ahead: ahead.size,
    ...stats,
    mb: +(stats.bytes / 1048576).toFixed(2),
    decodeMs: Math.round(stats.decodeMs),
  };
}
