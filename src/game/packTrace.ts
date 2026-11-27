// Dev-only: what the art prebuild needs to know about each pack unit's dependencies beyond the code that runs while
// it's painted (the prebuild's runner sees that through the DevTools protocol's coverage). See docs/prebuild.md,
// "Per-unit versions".
//
// - Registries (`traced`, `tracedMap`): content modules register drawers, styles, scene specs and so on at load
//   time, and painters look them up by key. In dev, each registration notes the source files on its call stack
//   (the content module that registered it, and any helper between); while a unit is painted (beginTrace … endTrace)
//   each lookup notes its registry and key. A unit then depends on the files that registered what it looked up
//   (even data nobody's code ran for), and is painted again when who registers it changes.
// - Plain data in content files (`traceData`: the feet, pizzas and hero peels collected by import.meta.glob): while
//   a unit is painted, reading any field of one of those objects notes the file it came from (prebuild only).
//
// Outside dev it's all a no-op: `traced` returns the object itself.

const DEV = import.meta.env?.DEV && typeof location !== 'undefined';
const RECORD = DEV && new URLSearchParams(location.search).has('prebuild');
const E = Error as unknown as { stackTraceLimit?: number };
if (DEV) E.stackTraceLimit = Math.max(E.stackTraceLimit ?? 10, 40);

/** `registry/key` → the source files that registered it (dev). */
export const registrants = new Map<string, Set<string>>();

let open: { regs: Set<string>; data: Set<string> } | null = null;

/** The /src/… files on the current call stack (this file left out). */
function stackFiles(): string[] {
  const out: string[] = [];
  for (const m of (new Error().stack ?? '').matchAll(/\/(src\/[^?:\s)]+\.ts)/g)) if (m[1] !== 'src/game/packTrace.ts' && !out.includes(m[1])) out.push(m[1]);
  return out;
}

function noteSet(name: string, key: PropertyKey): void {
  if (typeof key !== 'string') return;
  const id = `${name}/${key}`;
  let s = registrants.get(id);
  if (!s) registrants.set(id, (s = new Set()));
  for (const f of stackFiles()) s.add(f);
}

function noteGet(name: string, key: PropertyKey | '*'): void {
  if (open && typeof key === 'string') open.regs.add(`${name}/${key}`);
}

/** A registry object, traced in dev (registrations and, while a unit is painted, lookups). */
export function traced<T extends object>(name: string, obj: T): T {
  if (!DEV) return obj;
  for (const k of Object.keys(obj)) noteSet(name, k);
  return new Proxy(obj, {
    get(t, k, r) {
      noteGet(name, k);
      return Reflect.get(t, k, r);
    },
    has(t, k) {
      noteGet(name, k);
      return Reflect.has(t, k);
    },
    getOwnPropertyDescriptor(t, k) {
      noteGet(name, k);
      return Reflect.getOwnPropertyDescriptor(t, k);
    },
    ownKeys(t) {
      noteGet(name, '*');
      return Reflect.ownKeys(t);
    },
    set(t, k, v, r) {
      noteSet(name, k);
      return Reflect.set(t, k, v, r);
    },
    defineProperty(t, k, d) {
      noteSet(name, k);
      return Reflect.defineProperty(t, k, d);
    },
    deleteProperty(t, k) {
      noteSet(name, k);
      return Reflect.deleteProperty(t, k);
    },
  });
}

/** A registry Map, traced in dev as `traced` does. */
export function tracedMap<K, V>(name: string, m: Map<K, V>): Map<K, V> {
  if (!DEV) return m;
  const P = Map.prototype;
  const all = () => noteGet(name, '*');
  Object.assign(m, {
    get: (k: K) => (noteGet(name, String(k)), P.get.call(m, k)),
    has: (k: K) => (noteGet(name, String(k)), P.has.call(m, k)),
    set: (k: K, v: V) => (noteSet(name, String(k)), P.set.call(m, k, v)),
    delete: (k: K) => (noteSet(name, String(k)), P.delete.call(m, k)),
    keys: () => (all(), P.keys.call(m)),
    values: () => (all(), P.values.call(m)),
    entries: () => (all(), P.entries.call(m)),
    forEach: (fn: (v: V, k: K, mm: Map<K, V>) => void, self?: unknown) => (all(), P.forEach.call(m, fn, self)),
    [Symbol.iterator]: () => (all(), P.entries.call(m)),
  });
  return m;
}

/** Plain data objects from a content file (`dir` + the glob's './name.ts'), traced while the prebuild paints. */
export function traceData<T extends object>(dir: string, globKey: string, list: T[]): T[] {
  if (!RECORD) return list;
  const file = `${dir}/${globKey.replace(/^\.\//, '')}`;
  for (const o of list) {
    for (const k of Object.keys(o)) {
      let v = (o as Record<string, unknown>)[k];
      Object.defineProperty(o, k, {
        enumerable: true,
        configurable: true,
        get() {
          if (open) open.data.add(file);
          return v;
        },
        set(nv) {
          v = nv;
        },
      });
    }
  }
  return list;
}

/** The prebuild: start noting lookups and data reads for a unit. */
export function beginTrace(): void {
  open = { regs: new Set(), data: new Set() };
}

/** The prebuild: stop, and say what was looked up (`registry/key`, with who registered it) and read. */
export function endTrace(): { regs: Record<string, string[]>; data: string[] } {
  const o = open ?? { regs: new Set<string>(), data: new Set<string>() };
  open = null;
  return { regs: regSig([...o.regs]), data: [...o.data].sort() };
}

/** Who registers each of these lookups now (a `registry/*` lookup: everyone who registered anything there). */
export function regSig(ids: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const id of [...ids].sort()) {
    if (id.endsWith('/*')) {
      const pre = id.slice(0, -1);
      const s = new Set<string>();
      for (const [k, v] of registrants) if (k.startsWith(pre)) for (const f of v) s.add(f);
      out[id] = [...s].sort();
    } else out[id] = [...(registrants.get(id) ?? [])].sort();
  }
  return out;
}
