#!/usr/bin/env node
// The art prebuild: paints the game's fixed art at build time and writes it as packs of WebP atlases with a
// manifest, into public/packs/ (git-ignored; Vite serves it in dev and copies it into dist). See docs/prebuild.md.
//
//   npm run prebuild                 (also run by npm run build first; paints only the units whose source changed)
//   npm run prebuild -- --force      (paint every unit again)
//   npm run prebuild -- --dry        (only say which units would be painted, and why)
//   npm run prebuild -- --verify     (paint every unit again and compare with the packs: any unit whose pixels
//                                     changed though its version didn't is a dependency the versions miss; fails)
//   npm run prebuild -- --check      (compare a sample of packed art with the painters, pixel by pixel)
//   options: --jobs N (pages painting at once; default: CI 3, else half the cores, at most 4), --encode-jobs N (cwebp
//            processes at once; default: CI as many as --jobs, else 1), --only a,b (unit ids
//            or prefixes, e.g. bg:rooftop,feet:), --sample N (check), --out DIR, --cdp-port N, --vite-port N,
//            --cache-dir DIR, --z 0-9 (lossless effort), --q 0-100 (lossy quality, opaque backdrop layers),
//            --require (fail instead of skipping when there's no Chrome)
//
// It starts its own Vite dev server and one headless Chrome (muted, a throwaway profile). A plan page lists the units
// (src/devPrebuild.ts) and who registers what; every unit whose version (scripts/prebuild/deps.mjs) or members
// changed is painted on a fresh page of its own, several pages at once, while the DevTools protocol's coverage
// notes which modules ran (its dependencies). Each atlas is posted here as a PNG; one whose pixels are the same as
// last time keeps its WebP (and its name, so players' caches keep it), the rest are encoded with cwebp (kept as PNG
// when cwebp isn't installed) and named by a hash of their contents. Units that didn't change keep their atlases
// as they are. The new set is staged and swapped in whole: a failed or interrupted run leaves the old packs.

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { availableParallelism } from 'node:os';
import { copyFileSync, existsSync, linkSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ROOT, findChrome, sleep, startChrome, startVite } from './harness.mjs';
import { Graph, RULE, baseHash, fileReader, regSig, snapshotSrc, unitDeps, unitVersion, usedIdentifiers } from './deps.mjs';

const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const check = !!arg('check', false);
const verify = !!arg('verify', false);
const dry = !!arg('dry', false);
const force = !!arg('force', false) || verify;
const require_ = !!arg('require', false) || process.env.PREBUILD_REQUIRED === '1';
const OUT = resolve(ROOT, String(arg('out', 'public/packs'))).replace(/\/+$/, '');
const Z = Number(arg('z', 6));
const Q = Number(arg('q', 90));
const sample = Number(arg('sample', 40));
const cores = availableParallelism();
const JOBS = Math.max(1, Number(arg('jobs', 0)) || (process.env.CI ? Math.max(1, cores - 1) : Math.min(4, Math.max(1, Math.floor(cores / 2)))));
/** cwebp processes at once (default: as many as pages on CI, else 1: a machine in use stays usable). */
const ENC_JOBS = Math.max(1, Number(arg('encode-jobs', 0)) || (process.env.CI ? JOBS : 1));
const only = arg('only', '') ? String(arg('only')).split(',') : null;
/** Build-file format (bump when its layout or the manifest's changes). */
const FORMAT = 2;

const chrome = findChrome();
if (!chrome) {
  const msg = '[prebuild] no Chrome found (set CHROME=/path/to/chrome): the art is not pre-built, the game paints it as before';
  if (require_) {
    console.error(msg);
    process.exit(1);
  }
  console.warn(msg);
  process.exit(0);
}
const cwebp = spawnSync('cwebp', ['-version'], { encoding: 'utf8' }).status === 0 ? 'cwebp' : null;
if (!cwebp && !check) console.warn('[prebuild] cwebp not found: atlases are kept as PNG (larger). brew install webp / apt install webp');

const t0 = Date.now();
const sha = (b) => createHash('sha256').update(b).digest('hex');
// staged in .prebuild/ (git-ignored; the same disk as the packs, so the swap is a rename, and outside public/, so
// nothing half-made is ever served or copied into a build), and swapped in only when complete
const stage = join(ROOT, '.prebuild', 'new');
const pngDir = join(ROOT, '.prebuild', 'png');
rmSync(stage, { recursive: true, force: true });
rmSync(pngDir, { recursive: true, force: true });
mkdirSync(join(stage, 'a'), { recursive: true });
mkdirSync(pngDir, { recursive: true });
// what else shapes the files besides the source: the encoder and its settings (a change re-encodes everything)
const ENC = cwebp ? `${spawnSync('cwebp', ['-version'], { encoding: 'utf8' }).stdout.trim()} q${Q} z${Z}` : 'png';
const snap = snapshotSrc(ROOT);
const read = fileReader(ROOT);
const base = baseHash(ROOT);

/** Are the packs in `dir` whole: a manifest, a build file, and every atlas they name? Returns the build file. */
function whole(dir) {
  try {
    const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
    const b = JSON.parse(readFileSync(join(dir, 'build.json'), 'utf8'));
    if (b.format !== FORMAT) return null;
    for (const p of Object.values(m.packs)) for (const a of p.atlases) if (!existsSync(join(dir, a.file))) return null;
    for (const u of Object.values(b.units)) for (const a of u.atlases) if (!existsSync(join(dir, a.file))) return null;
    return b;
  } catch {
    return null;
  }
}
const old = check ? null : whole(OUT);
/** The old atlases by their pixels (and encoding), to keep instead of encoding again. */
const oldByPng = new Map();
if (old && old.enc === ENC) for (const u of Object.values(old.units)) for (const a of u.atlases) oldByPng.set(`${a.png}/${a.lossy ? 1 : 0}`, a);

// ——— encoding: as atlases come in, a few at a time ———

const enc = { encoded: 0, kept: 0, ms: 0, running: 0, queue: [], waiting: new Map() };
/** ref → its atlas (file, bytes, png), once encoded. */
const atlasOf = new Map();
function pump() {
  while (enc.running < ENC_JOBS && enc.queue.length) {
    const job = enc.queue.shift();
    enc.running++;
    void job().finally(() => {
      enc.running--;
      pump();
    });
  }
}
const run = (cmd, args) =>
  new Promise((res) => {
    const p = spawn(cmd, args, { stdio: 'ignore' });
    p.on('close', (c) => res(c));
    p.on('error', () => res(-1));
  });
/** Encode (or keep) one posted atlas; resolves with { file, bytes, png }. */
function encodeAtlas(ref, name, png, lossy) {
  const p = new Promise((resolveAtlas, rejectAtlas) => {
    enc.queue.push(async () => {
      try {
        const kept = oldByPng.get(`${png}/${lossy ? 1 : 0}`);
        if (kept) {
          enc.kept++;
          return resolveAtlas({ file: kept.file, bytes: kept.bytes, png, from: 'old' });
        }
        const te = Date.now();
        const src = join(pngDir, `${ref}.png`);
        let data = readFileSync(src);
        let ext = 'png';
        if (cwebp) {
          const dst = join(pngDir, `${ref}.webp`);
          // opaque backdrop layers: lossy, sharp colour; everything else lossless, transparent pixels kept exactly
          const opts = lossy ? ['-q', String(Q), '-sharp_yuv', '-m', '5'] : ['-lossless', '-exact', '-z', String(Z)];
          if ((await run(cwebp, ['-quiet', ...opts, src, '-o', dst])) === 0 && existsSync(dst)) {
            data = readFileSync(dst);
            ext = 'webp';
          }
          rmSync(dst, { force: true });
        }
        rmSync(src, { force: true });
        enc.ms += Date.now() - te;
        enc.encoded++;
        // (atlases in a/: named by their contents, cached for good; the manifest beside it is fetched fresh)
        const file = `a/${name}.${sha(data).slice(0, 10)}.${ext}`;
        writeFileSync(join(stage, file), data);
        resolveAtlas({ file, bytes: data.length, png });
      } catch (e) {
        rejectAtlas(e);
      }
    });
    pump();
  });
  p.catch(() => {});
  atlasOf.set(ref, p);
  return p;
}

let refs = 0;
/** The page's endpoint: an atlas (PNG body), stored until its unit says how it's used. */
function endpoints() {
  const body = (req) =>
    new Promise((res) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => res(Buffer.concat(chunks)));
    });
  return {
    name: 'prebuild-endpoints',
    configureServer(server) {
      server.middlewares.use('/__prebuild/atlas', async (req, res) => {
        try {
          const sp = new URL(req.url ?? '', 'http://x').searchParams;
          const name = (sp.get('name') ?? 'atlas').replace(/[^a-z0-9_-]/gi, '');
          const png = await body(req);
          const ref = `${name}~${++refs}`;
          writeFileSync(join(pngDir, `${ref}.png`), png);
          pngs.set(ref, { name, png: sha(png) });
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ ref }));
        } catch (e) {
          res.statusCode = 500;
          res.end(String(e));
        }
      });
    },
  };
}
const pngs = new Map();

const { vite, url } = await startVite({ port: arg('vite-port') ? Number(arg('vite-port')) : undefined, cacheDir: arg('cache-dir') ? resolve(String(arg('cache-dir'))) : undefined, plugins: check ? [] : [endpoints()] });
let browser = null;
const shutdown = async () => {
  await browser?.close().catch(() => {});
  await vite.close().catch(() => {});
  rmSync(stage, { recursive: true, force: true });
  rmSync(pngDir, { recursive: true, force: true });
};
for (const sig of ['SIGINT', 'SIGTERM'])
  process.on(sig, async () => {
    console.log('\n[prebuild] stopping…');
    await shutdown();
    process.exit(130);
  });

/** A page's state, once it has left `starting` (or the given states). */
async function pageState(tab, not = ['starting', 'running'], ms = 30 * 60_000) {
  const cond = `window.__prebuild && ${not.map((s) => `window.__prebuild.state !== '${s}'`).join(' && ')} && window.__prebuild.state`;
  const st = await tab.until(cond, ms, 100).catch(async (e) => {
    throw new Error(`${e.message}: ${JSON.stringify(await tab.eval('return window.__prebuild && { state: __prebuild.state, step: __prebuild.step, error: __prebuild.error }', 5000).catch(() => null))}`);
  });
  if (st === 'error') throw new Error(await tab.eval('return window.__prebuild.error'));
  return st;
}

/** The src/ modules any of whose functions ran since the last take (the module's own top level left out when
 * `noTop`: it ran when the page loaded). */
async function coverage(tab, noTop, used, loadFns) {
  const r = await tab.send('Profiler.takePreciseCoverage');
  if (r.error) throw new Error(`coverage: ${r.error.message}`);
  const out = new Set();
  for (const s of r.result.result) {
    const m = s.url.match(/^https?:\/\/[^/]+\/(src\/[^?#]+)/);
    if (!m) continue;
    if (noTop) loadFns?.set(s.url, s.functions);
    if (!s.functions.some((f) => f.ranges[0].count > 0 && !(noTop && f.functionName === '' && f.ranges[0].startOffset === 0))) continue;
    const f = decodeURIComponent(m[1]);
    out.add(f);
    // what its code that ran can refer to (the module as the page got it: the dev server's transform, cached)
    if (used && f.endsWith('.ts')) {
      const code = await servedCode(s.url);
      const all = loadFns?.get(s.url);
      const ids = code === null || !all ? null : usedIdentifiers(code, all, s.functions);
      if (ids) used.set(f, ids);
    }
  }
  return out;
}
const served = new Map();
function servedCode(u) {
  if (!served.has(u)) served.set(u, fetch(u).then((r) => (r.ok ? r.text() : null)).catch(() => null));
  return served.get(u);
}

const graph = new Graph(ROOT);
const logLine = (s) => console.log(`[prebuild] ${s}`);

try {
  browser = await startChrome({ chrome, port: arg('cdp-port') ? Number(arg('cdp-port')) : undefined });
  const onLog = (type, text) => {
    if (text.startsWith('[prebuild]')) {
      if (!/^\[prebuild\] (checked|backdrop)/.test(text) || check) console.log(text);
    } else if (type === 'error' || type === 'exception') console.log(`[page ${type}] ${text.slice(0, 400)}`);
  };

  if (check) {
    const tab = await browser.open();
    tab.onLog = onLog;
    await tab.go(`${url}?dev&noArtCache&prebuild=check&sample=${sample}`);
    await pageState(tab);
    const res = await tab.eval('return window.__prebuild.results');
    const bad = res.filter((r) => !r.ok);
    for (const r of res) console.log(`  ${r.ok ? 'ok  ' : 'DIFF'} ${r.key}  max ${r.max}  ${r.diff}/${r.px * 4} channels${r.note ? `  (${r.note})` : ''}`);
    console.log(`[prebuild] check: ${res.length - bad.length}/${res.length} match (lossless within 1/255 of the colour shown, lossy at 38 dB or better)`);
    await shutdown();
    process.exit(bad.length ? 1 : 0);
  }

  // the plan: every unit, and who registers what
  const planTab = await browser.open();
  planTab.onLog = onLog;
  await planTab.go(`${url}?dev&noArtCache&prebuild=plan`);
  await pageState(planTab);
  const { units, registrants } = await planTab.eval('return { units: __prebuild.units, registrants: __prebuild.registrants }');
  const sigOf = (u) => JSON.stringify([u.pack, u.members]);
  const why = new Map();
  for (const u of units) {
    const o = old?.units[u.id];
    if (only && !only.some((p) => u.id === p || u.id.startsWith(p))) {
      if (!o) why.set(u.id, null);
      continue;
    }
    let w = null;
    if (!o) w = 'new';
    else if (force) w = verify ? 'verify' : 'forced';
    else if (old.enc !== ENC) w = 'encoder changed';
    else if (o.sig !== sigOf(u)) w = 'members changed';
    else if (o.v !== unitVersion(base, o.deps, read)) w = `source changed (${o.deps.filter((f) => !o.hashes || o.hashes[f] !== (snap.get(f) ?? null)).slice(0, 3).join(', ') || 'base'})`;
    else if (JSON.stringify(regSig(Object.keys(o.regs), registrants)) !== JSON.stringify(o.regs)) w = 'registrations changed';
    if (w) why.set(u.id, w);
  }
  const todo = units.filter((u) => why.get(u.id));
  const skipped = units.filter((u) => why.has(u.id) && !why.get(u.id));
  logLine(`${units.length} units; ${todo.length} to paint (${JOBS} at once)${only ? `, ${skipped.length} new ones left out (--only)` : ''}`);
  for (const u of todo.slice(0, 40)) console.log(`  ${u.id}: ${why.get(u.id)}`);
  if (todo.length > 40) console.log(`  … and ${todo.length - 40} more`);
  const sameUnits = !!old && Object.keys(old.units).sort().join() === units.filter((u) => old.units[u.id]).map((u) => u.id).sort().join() && units.every((u) => old.units[u.id] || why.has(u.id));
  if (dry || (!todo.length && sameUnits)) {
    if (!dry) logLine('packs match the source: nothing to do (--force paints them again)');
    await shutdown();
    process.exit(0);
  }

  // ——— paint, several pages at once ———
  const done = new Map();
  let paintMs = 0;
  let next = 0;
  let painted = 0;
  const tp = Date.now();
  async function worker() {
    const tab = await browser.open();
    tab.onLog = onLog;
    await tab.send('Profiler.enable');
    while (next < todo.length) {
      const u = todo[next++];
      const tu = Date.now();
      // (coverage from the page's first script: what runs while it loads, then what runs while it paints)
      await tab.send('Profiler.startPreciseCoverage', { callCount: true, detailed: false });
      await tab.go(`${url}?dev&noArtCache&prebuild=unit`);
      await pageState(tab, ['starting'], 120_000);
      const loadFns = new Map();
      await coverage(tab, true, null, loadFns);
      const loadL = new Map();
      for (const [cu, fns] of loadFns) {
        const m = cu.match(/^https?:\/\/[^/]+\/(src\/[^?#]+)/);
        const ranFns = fns.filter((x) => x.ranges[0].count > 0 && x.ranges[0].startOffset > 0);
        loadL.set(decodeURIComponent(m[1]), { any: ranFns.length > 0, ran: new Set(ranFns.map((x) => x.functionName)), all: new Set(fns.map((x) => x.functionName)) });
      }
      await tab.eval(`window.__prebuildGo = ${JSON.stringify(u)}`);
      await pageState(tab, ['starting', 'ready', 'running']);
      const used = new Map();
      const T = await coverage(tab, false, used, loadFns);
      await tab.send('Profiler.stopPreciseCoverage');
      const r = await tab.eval('return window.__prebuild.result');
      const seeds = new Set([...T, ...r.data, ...Object.values(r.regs).flat()]);
      const via = process.env.PREBUILD_DEBUG ? new Map() : null;
      const deps = unitDeps(graph, seeds, T, loadL, used, via);
      if (via) {
        mkdirSync(join(ROOT, '.prebuild', 'debug'), { recursive: true });
        writeFileSync(join(ROOT, '.prebuild', 'debug', `${u.id.replace(/[^a-z0-9]+/gi, '-')}.json`), JSON.stringify({ T: [...T].sort(), used: [...used.keys()].sort(), L: [...loadL].filter(([, l]) => l.ran.size).map(([f, l]) => `${f}: ${[...l.ran].join(' ')}`).sort(), via: Object.fromEntries(via) }, null, 1));
      }
      const atlases = r.atlases.map((a) => {
        const p = pngs.get(a.ref);
        if (!p) throw new Error(`${u.id}: atlas ${a.ref} never arrived`);
        if (!verify) void encodeAtlas(a.ref, p.name, p.png, !!a.lossy);
        return { ...a, png: p.png };
      });
      done.set(u.id, { u, r, deps, atlases });
      paintMs += r.ms;
      painted++;
      console.log(`  ${String(painted).padStart(3)}/${todo.length} ${u.id}: ${Object.keys(r.entries).length} entries, ${atlases.length} atlases, ${deps.length} files, ${r.ms} ms paint (${Date.now() - tu} ms with its page)`);
    }
    tab.ws?.close();
  }
  await Promise.all(Array.from({ length: Math.min(JOBS, todo.length) }, () => worker()));
  const paintWall = Date.now() - tp;
  if (verify) {
    // every unit was painted again: did any whose version stayed the same come out different?
    const holes = [];
    for (const [id, d] of done) {
      const o = old?.units[id];
      if (!o || o.v !== unitVersion(base, d.deps, read) || o.sig !== sigOf(d.u)) continue;
      const a = o.atlases.map((x) => x.png).join();
      const b = d.atlases.map((x) => x.png).join();
      if (a !== b) holes.push(id);
    }
    if (!old) logLine('verify: no packs to compare with');
    else if (holes.length) {
      console.error(`[prebuild] verify: ${holes.length} unit(s) painted differently with the same version (a dependency the versions miss, or art that isn't the same twice): ${holes.join(', ')}`);
      await shutdown();
      process.exit(1);
    } else logLine(`verify: every unchanged unit painted the same (${done.size} units)`);
    await shutdown();
    process.exit(0);
  }

  await Promise.all([...atlasOf.values()]);
  const encodeWall = Date.now() - tp - paintWall;

  // the source mustn't have changed under the painting (its versions are of the files as they were at the start)
  const after = snapshotSrc(ROOT);
  const moved = [...new Set([...snap.keys(), ...after.keys()])].filter((f) => snap.get(f) !== after.get(f));
  if (moved.length) throw new Error(`the source changed while the prebuild ran (${moved.slice(0, 5).join(', ')}): run it again`);

  // ——— the units, new and kept ———
  const keepFile = (file) => {
    const dst = join(stage, file);
    if (existsSync(dst)) return;
    try {
      linkSync(join(OUT, file), dst);
    } catch {
      copyFileSync(join(OUT, file), dst);
    }
  };
  const build = { format: FORMAT, rule: RULE, enc: ENC, units: {} };
  for (const u of units) {
    const d = done.get(u.id);
    if (!d) {
      const o = old?.units[u.id];
      if (!o) continue;
      for (const a of o.atlases) keepFile(a.file);
      build.units[u.id] = o;
      continue;
    }
    const atlases = [];
    for (const a of d.atlases) {
      const got = await atlasOf.get(a.ref);
      if (got.from === 'old') keepFile(got.file);
      atlases.push({ file: got.file, w: a.w, h: a.h, bytes: got.bytes, png: got.png, ...(a.lossy ? { lossy: true } : {}) });
    }
    build.units[u.id] = {
      v: unitVersion(base, d.deps, read),
      sig: sigOf(u),
      pack: u.pack,
      deps: d.deps,
      hashes: Object.fromEntries(d.deps.map((f) => [f, snap.get(f) ?? null])),
      regs: d.r.regs,
      keys: d.r.keys,
      random: d.r.random,
      ms: d.r.ms,
      atlases,
      entries: d.r.entries,
    };
  }

  // keys painted by more than one backdrop are left out (possibly two textures under one name)
  const owners = new Map();
  for (const [id, u] of Object.entries(build.units)) if (id.startsWith('bg:')) for (const k of u.keys) owners.set(k, (owners.get(k) ?? 0) + 1);
  const shared = [...owners].filter(([, n]) => n > 1).map(([k]) => k);
  const manifest = { format: FORMAT, units: {}, packs: {} };
  for (const [id, u] of Object.entries(build.units)) {
    manifest.units[id] = u.v;
    const p = (manifest.packs[u.pack] ??= { atlases: [], entries: {} });
    const off = p.atlases.length;
    for (const a of u.atlases) p.atlases.push({ file: a.file, w: a.w, h: a.h, bytes: a.bytes, ...(a.lossy ? { lossy: true } : {}) });
    for (const [k, e] of Object.entries(u.entries)) {
      if (shared.includes(k)) continue;
      p.entries[k] = { ...e, f: e.f.map(([i, ...r]) => [i + off, ...r]), u: id };
    }
  }
  writeFileSync(join(stage, 'manifest.json'), JSON.stringify(manifest));
  writeFileSync(join(stage, 'build.json'), JSON.stringify(build));
  const random = Object.values(build.units).reduce((n, u) => n + u.random.length, 0);
  if (random) logLine(`left out (painted with randomness): ${random}`);
  if (shared.length) logLine(`left out (one key painted by several backdrops): ${shared.join(', ')}`);
  if (!whole(stage)) throw new Error('the new packs are incomplete');
  // the new packs replace the old ones in one go: old aside, new in, old gone
  const oldDir = join(ROOT, '.prebuild', 'old');
  rmSync(oldDir, { recursive: true, force: true });
  if (existsSync(OUT)) renameSync(OUT, oldDir);
  renameSync(stage, OUT);
  rmSync(oldDir, { recursive: true, force: true });
  const total = readdirSync(join(OUT, 'a')).reduce((n, f) => n + statSync(join(OUT, 'a', f)).size, 0);
  for (const [name, p] of Object.entries(manifest.packs).sort()) console.log(`  ${name.padEnd(8)} ${String(p.atlases.length).padStart(3)} atlases  ${(p.atlases.reduce((n, a) => n + a.bytes, 0) / 1048576).toFixed(2).padStart(7)} MB  ${Object.keys(p.entries).length} entries`);
  logLine(`painted ${done.size} of ${units.length} units in ${Math.round(paintWall / 1000)} s (${Math.round(paintMs / 1000)} s of painting over ${JOBS} pages); atlases: ${enc.encoded} encoded (${Math.round(enc.ms / 1000)} s of cwebp, ${Math.round(encodeWall / 1000)} s after the painting), ${enc.kept} unchanged kept; ${(total / 1048576).toFixed(1)} MB in ${OUT}; ${Math.round((Date.now() - t0) / 1000)} s in all`);
} catch (e) {
  console.error(`[prebuild] failed: ${e.stack ?? e}`);
  await shutdown();
  process.exit(require_ || check || verify ? 1 : 0);
}
await shutdown();
await sleep(50);
