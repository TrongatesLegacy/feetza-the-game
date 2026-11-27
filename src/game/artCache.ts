// The art cache: canvases the game draws in code (feet, pizzas, sprites), saved in IndexedDB as lossless PNGs so the
// next visit decodes them (createImageBitmap, off the main thread) instead of drawing them again.
//
// Never stale: every entry carries the version it was drawn under, and only entries of this page's version are
// read. The version is a hash of all the source the art is drawn by (vite.config.ts: artVersion), so editing any
// file the art imports (in dev, or a new build) misses the cache until the art is drawn again; entries of other
// versions are swept. Never in the way: if IndexedDB is missing (private mode), slow, full or corrupt, every read
// misses and the art is drawn as before. Reads race a timeout, a bad entry is deleted, and writes go in idle time.
//
// Art pre-built at build time (src/game/packs.ts) reads as if it were cached: a key in a pack of this version is
// "cached", and read from the pack when the browser's own cache doesn't have it.

import ART_VERSION from 'virtual:art-version';
import { scrollingNow } from '../art/scrolling';
import { packHas, readPacked, readPackedBlob } from './packs';

/** Bump when the stored layout changes. */
const FORMAT = 1;
const DB_NAME = 'feetza-art';
const META = 'meta';
const BLOBS = 'blobs';
/** Keep the cache under this, oldest entries first (every foot, pizza and sprite is about 170 MB of PNG). */
const CAP_BYTES = 320 * 1024 * 1024;
/** Opening the database may take this long before the session gives up on the cache. */
const OPEN_MS = 1500;

export interface CacheMeta {
  key: string;
  /** The art version it was drawn under. */
  v: string;
  /** Last written (ms since epoch). */
  t: number;
  bytes: number;
  /** Each image's size, checked on read. */
  dims: [number, number][];
  /** Anything else the drawer returns (origins, sizes, names). */
  data: unknown;
}

const version = (): string => `${FORMAT}:${ART_VERSION}`;

let dbp: Promise<IDBDatabase | null> | null = null;
let disabled = typeof indexedDB === 'undefined' || (typeof location !== 'undefined' && new URLSearchParams(location.search).has('noArtCache'));
/** Current-version entries by key (filled when the database opens). */
const index = new Map<string, CacheMeta>();
const stats = { hits: 0, misses: 0, writes: 0, errors: 0, readMs: 0 };
/** Dev: the first reads, how long each took and how it went. */
const readLog: [string, number, string][] = [];
const logRead = (key: string, t0: number, how: string) => {
  if (import.meta.env.DEV && readLog.length < 40) readLog.push([key, Math.round(performance.now() - t0), how]);
};

const req = <T>(r: IDBRequest<T>): Promise<T> =>
  new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
const done = (tx: IDBTransaction): Promise<void> =>
  new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error ?? new Error('aborted'));
  });
export const timeout = <T>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

function fail(e: unknown): void {
  stats.errors++;
  if (import.meta.env.DEV) console.warn('[artCache]', e);
}

/** Open the database and read the index of this version's entries (null: no cache this session). */
export function openArtCache(): Promise<IDBDatabase | null> {
  if (dbp) return dbp;
  if (disabled) return (dbp = Promise.resolve(null));
  const open = new Promise<IDBDatabase | null>((res) => {
    let r: IDBOpenDBRequest;
    try {
      r = indexedDB.open(DB_NAME, 1);
    } catch (e) {
      fail(e);
      res(null);
      return;
    }
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(BLOBS)) db.createObjectStore(BLOBS);
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => (fail(r.error), res(null));
    r.onblocked = () => res(null);
  }).then(async (db) => {
    if (!db) return null;
    const all = (await req(db.transaction(META).objectStore(META).getAll())) as CacheMeta[];
    const v = version();
    for (const m of all) if (m.v === v) index.set(m.key, m);
    // other versions' entries go in idle time
    if (all.some((m) => m.v !== v)) setTimeout(() => void sweep(db), 8000);
    return db;
  });
  dbp = timeout(open, OPEN_MS, null)
    .catch((e) => (fail(e), null))
    .then((db) => {
      if (!db) disabled = true;
      return db;
    });
  return dbp;
}

/** Is this key cached for this version (index read when the database opened), or in a pre-built pack? */
export function cachedArt(key: string): boolean {
  return (!disabled && index.has(key)) || packHas(key);
}

/** A packed entry, raced against a timeout (a pack still downloading on a slow line: the art is drawn instead). */
async function fromPack<T>(key: string, read: (k: string) => Promise<T | null>, ms: number, drop: (v: T) => void): Promise<T | null> {
  const t0 = performance.now();
  const work = read(key);
  const out = await timeout(work, Math.max(ms, 6000), null);
  if (!out) void work.then((v) => v && drop(v)).catch(() => {});
  logRead(key, t0, out ? 'pack' : 'pack miss');
  return out;
}

/** Read an entry's images (decoded off the main thread) and its data; null on a miss, an error or a slow read. */
export async function readArt(key: string, ms = 4000): Promise<{ bitmaps: ImageBitmap[]; data: unknown } | null> {
  const meta = disabled ? undefined : index.get(key);
  if (!meta) return packHas(key) ? fromPack(key, readPacked, ms, (r) => r.bitmaps.forEach((b) => b.close())) : null;
  const db = await openArtCache();
  if (!db) return null;
  const t0 = performance.now();
  const work = (async () => {
    const blobs = (await req(db.transaction(BLOBS).objectStore(BLOBS).get(key))) as Blob[] | undefined;
    if (!blobs || blobs.length !== meta.dims.length) throw new Error(`entry ${key} is incomplete`);
    const bitmaps = await Promise.all(blobs.map((b) => createImageBitmap(b, { premultiplyAlpha: 'default', colorSpaceConversion: 'none' })));
    bitmaps.forEach((b, i) => {
      if (b.width !== meta.dims[i][0] || b.height !== meta.dims[i][1]) throw new Error(`entry ${key} has the wrong size`);
    });
    return { bitmaps, data: meta.data };
  })();
  try {
    const out = await timeout(work, ms, null);
    if (!out) {
      // too slow: draw instead (a late result is let go), and don't ask for this entry again this session (the
      // warmer would otherwise queue it for another read, and another)
      void work.then((r) => r.bitmaps.forEach((b) => b.close())).catch(() => {});
      index.delete(key);
      stats.misses++;
      logRead(key, t0, 'slow');
      return null;
    }
    stats.hits++;
    stats.readMs += performance.now() - t0;
    logRead(key, t0, 'hit');
    return out;
  } catch (e) {
    fail(e);
    stats.misses++;
    logRead(key, t0, 'bad');
    void deleteArt(key);
    return null;
  }
}

/** An entry's stored PNGs as they are (no decode): for images shown as they were saved (a peel's thumbnail, served
 * as a blob URL: decoding it to redraw and re-encode it as a data URL was a 40–90 ms task per batch of tiles). Null on
 * a miss, an error or a slow read. */
export async function readArtBlobs(key: string, ms = 1500): Promise<Blob[] | null> {
  const meta = disabled ? undefined : index.get(key);
  if (!meta) {
    if (!packHas(key)) return null;
    const b = await fromPack(key, readPackedBlob, ms, () => {});
    return b ? [b] : null;
  }
  const db = await openArtCache();
  if (!db) return null;
  try {
    const blobs = await timeout(req(db.transaction(BLOBS).objectStore(BLOBS).get(key)) as Promise<Blob[] | undefined>, ms, undefined);
    if (!blobs || blobs.length !== meta.dims.length) return null;
    stats.hits++;
    return blobs;
  } catch (e) {
    fail(e);
    return null;
  }
}

/** A decoded image back as a canvas (the game reads its pixels and draws it as any other texture). */
export function bitmapCanvas(b: ImageBitmap): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = b.width;
  c.height = b.height;
  c.getContext('2d')!.drawImage(b, 0, 0);
  b.close();
  return c;
}

/** Are the game's fonts in? Art with text drawn before they load is never saved (it would keep the fallback font).
 * The faces must really have loaded (document.fonts.check() also says yes for a face that failed to load). */
function fontsReady(): boolean {
  try {
    const loaded = (family: string) => [...document.fonts].some((f) => f.family.replace(/["']/g, '') === family && f.status === 'loaded');
    return loaded('Lilita One') && loaded('Fredoka');
  } catch {
    return false;
  }
}

/** The prebuild (src/devPrebuild.ts) records every piece of art the cache would keep, to pack it. */
let artRecorder: ((key: string, canvases: HTMLCanvasElement[], data: unknown) => void) | null = null;
export function setArtRecorder(r: typeof artRecorder): void {
  artRecorder = r;
}

const writes: (() => Promise<void>)[] = [];
let writing = false;

/** Save canvases (and their data) under a key, in idle time. The pixels are taken now, so later drawing on the
 * canvases doesn't reach the cache. */
export function writeArt(key: string, canvases: HTMLCanvasElement[], data: unknown, later = false): void {
  if (artRecorder && fontsReady()) artRecorder(key, canvases, data);
  if (disabled || !dbp || !fontsReady()) return;
  const v = version();
  // the pixels as getImageData reads them (the way the game reads them too), encoded from a copy: a GPU canvas's
  // own toBlob unpremultiplies faint edge pixels with a rounding of its own (±1 where alpha is low), so a canvas
  // decoded from it wouldn't read back exactly as the one drawn. `later`: read them in idle time instead of now
  // (art drawn in a busy frame; the game never draws on these canvases once made)
  const capture = () => Promise.all(
    canvases.map((c) => {
      try {
        const img = c.getContext('2d')!.getImageData(0, 0, c.width, c.height);
        const copy = new OffscreenCanvas(c.width, c.height);
        copy.getContext('2d')!.putImageData(img, 0, 0);
        return copy.convertToBlob({ type: 'image/png' }).catch(() => null);
      } catch {
        return Promise.resolve(null);
      }
    }),
  );
  const now = later ? null : capture();
  const dims = canvases.map((c) => [c.width, c.height] as [number, number]);
  writes.push(async () => {
    const db = await dbp;
    const bs = await (now ?? capture());
    if (!db || bs.some((b) => !b)) return;
    const meta: CacheMeta = { key, v, t: Date.now(), bytes: bs.reduce((n, b) => n + b!.size, 0), dims, data };
    const tx = db.transaction([META, BLOBS], 'readwrite');
    tx.objectStore(BLOBS).put(bs, key);
    tx.objectStore(META).put(meta);
    await done(tx);
    if (meta.v === version()) index.set(key, meta);
    stats.writes++;
  });
  pumpWrites();
}

function pumpWrites(): void {
  if (writing) return;
  writing = true;
  const step = async () => {
    const job = writes.shift();
    if (!job) {
      writing = false;
      void trim();
      return;
    }
    try {
      await job();
    } catch (e) {
      fail(e);
    }
    idle(step);
  };
  idle(step);
}

// (writes wait while the player scrolls a page: reading a canvas back for its PNG can stall a frame)
const idle = (fn: () => void): void => {
  const go = () => (scrollingNow() ? setTimeout(() => idle(fn), 150) : fn());
  if (typeof requestIdleCallback === 'function') requestIdleCallback(go, { timeout: 2000 });
  else setTimeout(go, 50);
};

async function deleteArt(key: string): Promise<void> {
  index.delete(key);
  const db = await dbp;
  if (!db) return;
  try {
    const tx = db.transaction([META, BLOBS], 'readwrite');
    tx.objectStore(META).delete(key);
    tx.objectStore(BLOBS).delete(key);
    await done(tx);
  } catch (e) {
    fail(e);
  }
}

/** Drop every entry of another version. */
async function sweep(db: IDBDatabase): Promise<void> {
  try {
    const v = version();
    const all = (await req(db.transaction(META).objectStore(META).getAll())) as CacheMeta[];
    const old = all.filter((m) => m.v !== v);
    if (!old.length) return;
    const tx = db.transaction([META, BLOBS], 'readwrite');
    for (const m of old) {
      tx.objectStore(META).delete(m.key);
      tx.objectStore(BLOBS).delete(m.key);
    }
    await done(tx);
  } catch (e) {
    fail(e);
  }
}

/** Keep the cache under its cap, oldest entries first. */
async function trim(): Promise<void> {
  const db = await dbp;
  if (!db) return;
  try {
    const all = ((await req(db.transaction(META).objectStore(META).getAll())) as CacheMeta[]).sort((a, b) => a.t - b.t);
    let total = all.reduce((n, m) => n + m.bytes, 0);
    const out: CacheMeta[] = [];
    for (const m of all) {
      if (total <= CAP_BYTES) break;
      out.push(m);
      total -= m.bytes;
    }
    if (!out.length) return;
    const tx = db.transaction([META, BLOBS], 'readwrite');
    for (const m of out) {
      tx.objectStore(META).delete(m.key);
      tx.objectStore(BLOBS).delete(m.key);
      index.delete(m.key);
    }
    await done(tx);
  } catch (e) {
    fail(e);
  }
}

/** Dev: F.artCache.stats() and F.artCache.clear(). */
export const artCacheDev = {
  async stats(): Promise<Record<string, unknown>> {
    const db = await openArtCache();
    let entries = 0;
    let bytes = 0;
    let stale = 0;
    if (db) {
      const all = (await req(db.transaction(META).objectStore(META).getAll())) as CacheMeta[];
      entries = all.length;
      bytes = all.reduce((n, m) => n + m.bytes, 0);
      stale = all.filter((m) => m.v !== version()).length;
    }
    return { enabled: !!db, version: version(), entries, current: index.size, stale, mb: +(bytes / 1048576).toFixed(1), capMb: CAP_BYTES / 1048576, pendingWrites: writes.length, ...stats, readMs: Math.round(stats.readMs), reads: readLog };
  },
  /** Empty the cache (the art in this page stays; the next load draws it all again). */
  async clear(): Promise<void> {
    index.clear();
    writes.length = 0;
    const db = await openArtCache();
    if (!db) return;
    const tx = db.transaction([META, BLOBS], 'readwrite');
    tx.objectStore(META).clear();
    tx.objectStore(BLOBS).clear();
    await done(tx);
  },
  version,
};
