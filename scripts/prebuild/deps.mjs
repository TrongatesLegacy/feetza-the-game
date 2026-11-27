// The art packs' per-unit versions (docs/prebuild.md, "Per-unit versions"). Shared by the prebuild's runner
// (scripts/prebuild/run.mjs: which units to paint again) and vite.config.ts (virtual:pack-versions: which packed
// units this build may serve).
//
// A unit's version is a hash over the files it depends on (`unitVersion`), plus the base: the rule's own version, the
// prebuild's page, and the packages drawn into the art (Phaser, the fonts). Which files a unit depends on is worked
// out when it's painted (`unitDeps`), from what its painting did:
// - T: the modules any of whose code ran while it was painted (the DevTools protocol's precise coverage);
// - the files that registered what it looked up in a registry, and the content files whose data it read
//   (src/game/packTrace.ts);
// - and, from those, through the static imports: a module imported for anything but functions (a constant, a table,
//   a namespace, the default, a side effect, a re-export) is in, and so is everything it imports in turn; a module
//   imported only for functions is in only if they ran (it's in T) or if one of those functions ran while the page
//   loaded (L: it may have made load-time state that's read later). For a module in T, only the imports mentioned by
//   its code that ran (in the unit or at load) and by the top-level declarations that code refers to count
//   (`usedIdentifiers`). import.meta.glob folders of data (`const mods = import.meta.glob(…)`) are always followed
//   (traceData only adds what's read to the seeds); side-effect globs
//   (`import.meta.glob('./art/*.ts', { eager: true })`, the plug-in folders) are not: a plug-in reaches a unit by
//   its code running (T) or by registering what the unit looks up.
// A change to any file in the list changes the version; a change to how the files import each other is a change
// to some file in the list, so the list stays sound until then. Who registers a key can change in a file outside
// the list (a registration added elsewhere): the runner checks that against a fresh page (and dev's loader, against
// its own registries).

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';

const ts = createRequire(import.meta.url)('typescript');

/** Bump when the rule changes (every unit is painted again). */
export const RULE = 2;
/** Files every unit depends on as they are, whose imports aren't followed: the prebuild's own page (what it
 * harvests, and how; what it calls shows up in T). */
export const BASE_FILES = ['src/devPrebuild.ts'];
/** Modules whose imports aren't followed from T (they're the harness: whatever they call that matters runs). */
const NO_FOLLOW = new Set(['src/devPrebuild.ts', 'src/main.ts']);

const sha = (s) => createHash('sha256').update(s).digest('hex');

/** What every unit's version includes besides its files. */
export function baseHash(root) {
  const lockPath = join(root, 'package-lock.json');
  const lock = existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, 'utf8')) : {};
  const pk = Object.entries(lock.packages ?? {})
    .filter(([k]) => k === 'node_modules/phaser' || k.startsWith('node_modules/@fontsource/'))
    .map(([k, v]) => `${k.slice(13)}@${v.version}`)
    .sort();
  const h = createHash('sha256').update(`rule ${RULE}\0${pk.join(' ')}\0`);
  for (const f of BASE_FILES) h.update(f).update('\0').update(existsSync(join(root, f)) ? readFileSync(join(root, f)) : '<missing>').update('\0');
  return h.digest('hex');
}

/** A unit's version: the base and its files' contents (`read`: a file's contents, or null when it's gone). */
export function unitVersion(base, files, read) {
  const h = createHash('sha256').update(base).update('\0');
  for (const f of [...files].sort()) {
    const c = read(f);
    h.update(f).update('\0').update(c ?? '<missing>').update('\0');
  }
  return h.digest('hex').slice(0, 16);
}

/** Read files from disk (relative to root), each once. */
export function fileReader(root) {
  const cache = new Map();
  return (f) => {
    if (!cache.has(f)) {
      const p = join(root, f);
      cache.set(f, existsSync(p) && statSync(p).isFile() ? readFileSync(p) : null);
    }
    return cache.get(f);
  };
}

/** One hash over a snapshot (the prebuild records the source it last checked the registrations against; a production
 * build serves the packs only for that source). */
export function snapshotHash(snap) {
  const h = createHash('sha256');
  for (const [f, x] of [...snap].sort(([a], [b]) => (a < b ? -1 : 1))) h.update(f).update('\0').update(x).update('\0');
  return h.digest('hex').slice(0, 16);
}

/** Every file under src/, hashed (to notice the source changing while the prebuild runs). */
export function snapshotSrc(root) {
  const out = new Map();
  const walk = (d) => {
    for (const n of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, n.name);
      if (n.isDirectory()) walk(p);
      else out.set(relative(root, p), sha(readFileSync(p)));
    }
  };
  walk(join(root, 'src'));
  return out;
}

// ——— the static import graph ———

const IMPORT_RE = /\bimport\s+(type\s+)?([^'";]*?)\s+from\s+['"](\.[^'"]+)['"]/g;
const SIDE_RE = /\bimport\s+['"](\.[^'"]+)['"]/g;
const REEXPORT_RE = /\bexport\s+(type\s+)?(?:\*|\{[^}]*\})\s*(?:as\s+[\w$]+\s+)?from\s+['"](\.[^'"]+)['"]/g;
const DYN_RE = /\bimport\(\s*['"](\.[^'"]+)['"]\s*\)/g;
// (a glob may carry a type argument: import.meta.glob<{ … }>('./dir/*.ts', …)); bound: its result is used
const GLOB_RE = /(=\s*)?import\.meta\.glob\b[\s\S]{0,300}?\(\s*['"](\.[^'"]*?)\/\*\.ts['"]/g;

/** The names a module exports that are plain functions: top-level `function f` and `const f = (…) => …` /
 * `const f = function …` (never a class: its static fields are data), exported directly or by an export list. */
export function functionExports(src) {
  const sf = ts.createSourceFile('m.ts', src, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const local = new Set();
  const out = new Set();
  const exported = (st) => !!st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  const isDefault = (st) => !!st.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.body) {
      if (st.name) local.add(st.name.text);
      if (exported(st)) out.add(isDefault(st) ? 'default' : st.name?.text);
    } else if (ts.isVariableStatement(st) && st.declarationList.flags & ts.NodeFlags.Const) {
      for (const d of st.declarationList.declarations) {
        let init = d.initializer;
        while (init && (ts.isParenthesizedExpression(init) || ts.isAsExpression(init) || ts.isSatisfiesExpression?.(init))) init = init.expression;
        if (ts.isIdentifier(d.name) && init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
          local.add(d.name.text);
          if (exported(st)) out.add(d.name.text);
        }
      }
    }
  }
  for (const st of sf.statements)
    if (ts.isExportDeclaration(st) && !st.moduleSpecifier && !st.isTypeOnly && st.exportClause && ts.isNamedExports(st.exportClause))
      for (const el of st.exportClause.elements) {
        const name = (el.propertyName ?? el.name).text;
        if (!el.isTypeOnly && local.has(name)) out.add(el.name.text);
      }
  out.delete(undefined);
  return out;
}

export class Graph {
  constructor(root) {
    this.root = root;
    this.parsed = new Map();
  }

  resolve(fromRel, spec) {
    const b = resolve(this.root, dirname(fromRel), spec);
    for (const c of [b, `${b}.ts`, join(b, 'index.ts')]) if (existsSync(c) && statSync(c).isFile()) return relative(this.root, c);
    return null;
  }

  /** A module's imports ({ to, data }: `data` unless only functions are imported) and its function exports. */
  parse(f) {
    if (this.parsed.has(f)) return this.parsed.get(f);
    const p = { edges: [], fns: new Set() };
    this.parsed.set(f, p);
    const path = join(this.root, f);
    if (!f.endsWith('.ts') || !existsSync(path)) return p;
    const src = readFileSync(path, 'utf8');
    p.fns = functionExports(src);
    const add = (spec, names, kind) => {
      const to = this.resolve(f, spec);
      if (to) p.edges.push({ to, names, kind });
    };
    for (const m of src.matchAll(IMPORT_RE)) {
      if (m[1]) continue;
      // the bindings: { imported, local } ('default', '*' for a namespace)
      const clause = m[2].trim();
      const names = [];
      const brace = clause.match(/\{([^}]*)\}/);
      for (const part of clause.replace(/\{[^}]*\}/, '').split(',')) {
        const t = part.trim();
        if (!t) continue;
        const ns = t.match(/^\*\s*as\s+([\w$]+)/);
        names.push(ns ? { imported: '*', local: ns[1] } : { imported: 'default', local: t });
      }
      if (brace)
        for (const part of brace[1].split(',')) {
          const t = part.trim();
          if (!t || t.startsWith('type ')) continue;
          const [imported, local] = t.split(/\s+as\s+/);
          names.push({ imported, local: local ?? imported });
        }
      if (!names.length) continue; // (only types)
      add(m[3], names, 'import');
    }
    for (const m of src.matchAll(SIDE_RE)) add(m[1], null, 'side');
    for (const m of src.matchAll(REEXPORT_RE)) if (!m[1]) add(m[2], null, 'reexport');
    for (const m of src.matchAll(DYN_RE)) add(m[1], null, 'dynamic');
    // (data folders are followed even when traced: a value copied out of the data at load, a closure built from it,
    // keeps no trace of where it came from)
    for (const m of src.matchAll(GLOB_RE)) {
      if (!m[1]) continue;
      const d = resolve(this.root, dirname(f), m[2]);
      if (existsSync(d)) for (const n of readdirSync(d).sort()) if (n.endsWith('.ts')) p.edges.push({ to: relative(this.root, join(d, n)), names: null, kind: 'glob' });
    }
    return p;
  }

  /** Does this edge bring in anything but functions (of the bindings in `names`, all of them by default)? */
  dataEdge(e, names = e.names) {
    if (!names) return true;
    const fns = this.parse(e.to).fns;
    return names.some((n) => n.imported === '*' || !fns.has(n.imported));
  }
}

/** Could any of these functions of a module have run while the page loaded (`L`: per module, the names of its
 * functions that did, and of all it has)? A name the coverage doesn't know counts if anything of it ran. */
function atLoad(L, to, names) {
  const l = L.get(to);
  if (!l?.any) return false;
  if (!names) return true;
  return names.some((n) => l.ran.has(n.imported) || !l.all.has(n.imported));
}

/**
 * The files a unit depends on: `seeds` (T, the registrants and the data files it read) and what they import, by
 * the rule above. `T` is a set of src/ paths; `L` maps src/ paths to { any, ran, all }: did any of its functions run while the page
 * loaded, the names of those that did, and of all its functions. `used` (optional), for modules in T: the identifiers in the
 * code of theirs that ran in the unit, and in their top level (it ran at load: anything it made may be read later);
 * an import none of whose bindings appear there can't have mattered, and isn't followed.
 */
export function unitDeps(graph, seeds, T, L, used = new Map(), via = null) {
  const inc = new Set();
  const todo = [];
  const put = (f, why) => {
    if (!inc.has(f)) {
      inc.add(f);
      todo.push(f);
      via?.set(f, why);
    }
  };
  for (const f of seeds) put(f, T.has(f) ? 'ran' : 'registered or read');
  while (todo.length) {
    const f = todo.pop();
    if (NO_FOLLOW.has(f)) continue;
    const U = used.get(f);
    for (const e of graph.parse(f).edges) {
      if (inc.has(e.to)) continue;
      const names = U && e.kind === 'import' ? e.names.filter((n) => U.has(n.local)) : e.names;
      if (names && !names.length) continue;
      const load = atLoad(L, e.to, names);
      if (T.has(e.to) || load || graph.dataEdge(e, names)) put(e.to, `${f} (${names ? names.map((n) => n.local).join(' ') : e.kind}${load ? '; ran at load' : ''})`);
    }
  }
  for (const f of BASE_FILES) inc.add(f);
  return [...inc].sort();
}

/**
 * The identifiers a module's code can have used in a unit: those in its functions that ran while the unit was painted
 * (`ran`: that coverage, which lists only those) or while the page loaded (`all`: the load's coverage, listing every
 * function; a function run at load may have built state the unit reads), with what's nested in them; and from its top
 * level, every statement that isn't a declaration, plus the declarations of the top-level names those refer to, in
 * turn. Import and export-list statements don't count. Identifiers are taken from the parsed code (TypeScript's
 * parser: regular expressions and template strings are read as such). Null when the coverage doesn't fit the source
 * (then the whole module counts).
 */
export function usedIdentifiers(code, all, ran) {
  const top = all.find((f) => f.functionName === '' && f.ranges[0].startOffset === 0);
  if (!top || top.ranges[0].endOffset !== code.length) return null;
  const sf = ts.createSourceFile('m.js', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (sf.parseDiagnostics?.length) return null;
  /** every identifier, by position */
  const idents = [];
  const walk = (n) => {
    if (ts.isIdentifier(n)) idents.push([n.getStart(sf), n.text]);
    else if (ts.isPrivateIdentifier?.(n)) idents.push([n.getStart(sf), n.text]);
    ts.forEachChild(n, walk);
  };
  walk(sf);
  const fnRanges = [...all, ...ran].map((f) => f.ranges[0]).filter((r) => !(r.startOffset === 0 && r.endOffset === code.length));
  const inFn = (pos) => fnRanges.some((r) => pos >= r.startOffset && pos < r.endOffset);
  const within = (a, b, skipFns) => idents.filter(([p]) => p >= a && p < b && !(skipFns && inFn(p))).map(([, t]) => t);
  const out = new Set();
  for (const f of [...ran, ...all]) {
    const r = f.ranges[0];
    if (r.count > 0 && !(r.startOffset === 0 && r.endOffset === code.length)) for (const x of within(r.startOffset, r.endOffset, false)) out.add(x);
  }
  // the top level, statement by statement (what's inside functions only through the functions that ran, above)
  const decl = new Map();
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) || (ts.isExportDeclaration(st) && !st.moduleSpecifier)) continue;
    const refs = within(st.getStart(sf), st.end, true);
    const names = [];
    if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) names.push(...bindingNames(d.name));
    else if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && st.name) names.push(st.name.text);
    if (!names.length) for (const x of refs) out.add(x);
    else for (const n of names) decl.set(n, refs);
  }
  // the declarations what's used refers to, and theirs
  const todo = [...out];
  while (todo.length) {
    const refs = decl.get(todo.pop());
    if (!refs) continue;
    for (const x of refs)
      if (!out.has(x)) {
        out.add(x);
        todo.push(x);
      }
  }
  return out;
}

function bindingNames(n) {
  if (ts.isIdentifier(n)) return [n.text];
  const out = [];
  for (const e of n.elements ?? []) if (!ts.isOmittedExpression(e)) out.push(...bindingNames(e.name));
  return out;
}

/** Who registers each lookup, from a page's registrant dump (as src/game/packTrace.ts regSig does). */
export function regSig(ids, registrants) {
  const out = {};
  for (const id of [...ids].sort()) {
    if (id.endsWith('/*')) {
      const pre = id.slice(0, -1);
      const s = new Set();
      for (const [k, v] of Object.entries(registrants)) if (k.startsWith(pre)) for (const f of v) s.add(f);
      out[id] = [...s].sort();
    } else out[id] = [...(registrants[id] ?? [])].sort();
  }
  return out;
}

/** This source's version of every unit recorded in a build file (vite.config.ts). `checked`: only if the prebuild
 * last ran on exactly this source (who registers what is checked only there): a production build. */
export function currentVersions(root, buildFile, checked = false) {
  if (!existsSync(buildFile)) return {};
  let b;
  try {
    b = JSON.parse(readFileSync(buildFile, 'utf8'));
  } catch {
    return {};
  }
  if (checked && b.checked !== snapshotHash(snapshotSrc(root))) {
    console.warn('[packs] the art packs were last checked against other source (run npm run prebuild): this build serves none of them');
    return {};
  }
  const base = baseHash(root);
  const read = fileReader(root);
  const out = {};
  for (const [id, u] of Object.entries(b.units ?? {})) out[id] = unitVersion(base, u.deps, read);
  return out;
}
