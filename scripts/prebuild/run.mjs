#!/usr/bin/env node
// The art prebuild: paints the game's fixed art at build time and writes it as packs of lossless WebP atlases with
// a manifest, into public/packs/ (git-ignored; Vite serves it in dev and copies it into dist). See docs/prebuild.md.
//
//   npm run prebuild                 (also run by npm run build first; skipped when the packs match the source)
//   npm run prebuild -- --force      (paint again even if they match)
//   npm run prebuild -- --check      (compare a sample of packed art with the painters, pixel by pixel)
//   options: --sample N (check), --out DIR, --cdp-port N, --vite-port N, --cache-dir DIR, --z 0-9 (lossless effort),
//            --q 0-100 (lossy quality, opaque backdrop layers),
//            --require (fail instead of skipping when there's no Chrome)
//
// It starts its own Vite dev server and one headless Chrome (muted, a throwaway profile), opens ?dev&prebuild, and
// the page (src/devPrebuild.ts) runs the painters and posts each atlas here as a PNG; cwebp encodes it as lossless
// WebP (kept as PNG when cwebp isn't installed). Files are named by a hash of their contents, so a pack that didn't
// change keeps its name and stays in the players' browser caches.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ROOT, findChrome, sleep, startChrome, startVite } from './harness.mjs';

const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const check = !!arg('check', false);
const force = !!arg('force', false);
const require_ = !!arg('require', false) || process.env.PREBUILD_REQUIRED === '1';
const OUT = resolve(ROOT, String(arg('out', 'public/packs')));
const Z = Number(arg('z', 6));
const Q = Number(arg('q', 90));
const sample = Number(arg('sample', 40));

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
const stage = mkdtempSync(join(tmpdir(), 'feetza-packs-'));
const posted = { atlases: 0, bytes: 0, encodeMs: 0 };

/** The page's endpoints: an atlas (PNG body) and, last, the manifest. */
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
          const lossy = sp.get('lossy') === '1';
          const png = await body(req);
          const te = Date.now();
          let data = png;
          let ext = 'png';
          if (cwebp) {
            const src = join(stage, `${name}.png`);
            const dst = join(stage, `${name}.webp`);
            writeFileSync(src, png);
            // opaque backdrop layers: lossy, sharp colour; everything else lossless, transparent pixels kept exactly
            const opts = lossy ? ['-q', String(Q), '-sharp_yuv', '-m', '5'] : ['-lossless', '-exact', '-z', String(Z)];
            const r = spawnSync(cwebp, ['-quiet', ...opts, src, '-o', dst]);
            if (r.status === 0 && existsSync(dst)) {
              data = readFileSync(dst);
              ext = 'webp';
            }
            rmSync(src, { force: true });
            rmSync(dst, { force: true });
          }
          posted.encodeMs += Date.now() - te;
          const file = `${name}.${createHash('sha256').update(data).digest('hex').slice(0, 10)}.${ext}`;
          writeFileSync(join(stage, file), data);
          posted.atlases++;
          posted.bytes += data.length;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ file, bytes: data.length }));
        } catch (e) {
          res.statusCode = 500;
          res.end(String(e));
        }
      });
      server.middlewares.use('/__prebuild/manifest', async (req, res) => {
        writeFileSync(join(stage, 'manifest.json'), await body(req));
        res.end('{}');
      });
    },
  };
}

const { vite, url } = await startVite({ port: arg('vite-port') ? Number(arg('vite-port')) : undefined, cacheDir: arg('cache-dir') ? resolve(String(arg('cache-dir'))) : undefined, plugins: check ? [] : [endpoints()] });
let browser = null;
const shutdown = async () => {
  await browser?.close().catch(() => {});
  await vite.close().catch(() => {});
  rmSync(stage, { recursive: true, force: true });
};
process.on('SIGINT', async () => {
  console.log('\n[prebuild] stopping…');
  await shutdown();
  process.exit(130);
});

try {
  const version = (await vite.ssrLoadModule('virtual:pack-version')).default;
  const manifestPath = join(OUT, 'manifest.json');
  const built = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')).v : null;
  if (!check && !force && built === version) {
    console.log(`[prebuild] packs match the source (${version}): nothing to do (--force paints them again)`);
    await shutdown();
    process.exit(0);
  }
  if (check && built !== version) throw new Error(`packs are for ${built ?? 'nothing'}, the source is ${version}: run npm run prebuild first`);

  browser = await startChrome({ chrome, port: arg('cdp-port') ? Number(arg('cdp-port')) : undefined });
  const tab = await browser.open();
  tab.onLog = (type, text) => {
    if (text.startsWith('[prebuild]')) console.log(text);
    else if (type === 'error' || type === 'exception') console.log(`[page ${type}] ${text.slice(0, 400)}`);
  };
  await tab.go(`${url}?dev&noArtCache&prebuild${check ? `=check&sample=${sample}` : ''}`);
  const st = await tab.until(`window.__prebuild && window.__prebuild.state !== 'starting' && window.__prebuild.state !== 'running' && window.__prebuild.state`, 60 * 60_000, 1000).catch(async (e) => {
    throw new Error(`${e.message}: ${JSON.stringify(await tab.eval('return window.__prebuild', 5000).catch(() => null))}`);
  });
  const info = await tab.eval('return window.__prebuild');
  if (st === 'error') throw new Error(info.error);

  if (check) {
    const res = info.results;
    const bad = res.filter((r) => !r.ok);
    for (const r of res) console.log(`  ${r.ok ? 'ok  ' : 'DIFF'} ${r.key}  max ${r.max}  ${r.diff}/${r.px * 4} channels${r.note ? `  (${r.note})` : ''}`);
    console.log(`[prebuild] check: ${res.length - bad.length}/${res.length} match (lossless within 1/255 of the colour shown, lossy at 38 dB or better)`);
    await shutdown();
    process.exit(bad.length ? 1 : 0);
  }

  if (info.random.length) console.log(`[prebuild] left out (painted with randomness): ${info.random.length}`);
  if (info.unscoped.length) console.log(`[prebuild] left out (painted outside a backdrop's harvest): ${info.unscoped.length}`);
  // the new packs replace the old ones in one go
  mkdirSync(OUT, { recursive: true });
  for (const f of readdirSync(OUT)) rmSync(join(OUT, f), { recursive: true, force: true });
  for (const f of readdirSync(stage)) renameSync(join(stage, f), join(OUT, f));
  const total = readdirSync(OUT).reduce((n, f) => n + statSync(join(OUT, f)).size, 0);
  const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
  for (const [name, p] of Object.entries(m.packs)) console.log(`  ${name.padEnd(8)} ${String(p.atlases.length).padStart(3)} atlases  ${(p.atlases.reduce((n, a) => n + a.bytes, 0) / 1048576).toFixed(2).padStart(7)} MB  ${Object.keys(p.entries).length} entries`);
  console.log(`[prebuild] ${posted.atlases} atlases, ${(total / 1048576).toFixed(1)} MB in ${OUT} (encoding ${Math.round(posted.encodeMs / 1000)} s); ${Math.round((Date.now() - t0) / 1000)} s in all`);
} catch (e) {
  console.error(`[prebuild] failed: ${e.stack ?? e}`);
  await shutdown();
  process.exit(require_ || check ? 1 : 0);
}
await shutdown();
await sleep(50);
