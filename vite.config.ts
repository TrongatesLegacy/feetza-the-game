import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, existsSync, mkdirSync, statSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

// Exposes the list of audio files in public/audio so the game knows what exists
// (optional tracks fall back gracefully) without 404 probing at runtime.
function audioManifest(): Plugin {
  const id = 'virtual:audio-manifest';
  const resolved = '\0' + id;
  const dir = resolve(__dirname, 'public/audio');
  return {
    name: 'audio-manifest',
    resolveId(source) {
      return source === id ? resolved : null;
    },
    load(source) {
      if (source !== resolved) return null;
      const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.mp3')).map((f) => f.replace(/\.mp3$/, '')) : [];
      return `export default ${JSON.stringify(files.sort())};`;
    },
    configureServer(server) {
      server.watcher.add(dir);
      server.watcher.on('all', (_e, file) => {
        if (!file.startsWith(dir)) return;
        const mod = server.moduleGraph.getModuleById(resolved);
        if (mod) server.moduleGraph.invalidateModule(mod);
      });
    },
  };
}

// The art cache's version (src/game/artCache.ts): a hash of every source file the drawn art can depend on, so art
// saved in the browser is never used after any of them changes. It follows the static imports (and the folders
// import.meta.glob loads) from src/game/assets.ts, which draws everything the cache keeps; `import type` lines are
// skipped (no runtime code). Dev recomputes it after any change under src/ (the next page load picks it up); a
// build bakes it in. `from` may list several entry files (the art packs' version follows everything they hold).
function artVersion(id = 'virtual:art-version', from: string | string[] = 'game/assets.ts'): Plugin {
  const resolved = '\0' + id;
  const root = resolve(__dirname, 'src');
  const entries = (Array.isArray(from) ? from : [from]).map((f) => resolve(root, f));
  const importRe = /\b(?:import|export)\s+(type\s+)?(?:[\w*{}\s,$]*?\s+from\s+)?['"](\.[^'"]+)['"]|\bimport\(\s*['"](\.[^'"]+)['"]\s*\)/g;
  // (a glob may carry a type argument: import.meta.glob<{ … }>('./dir/*.ts', …))
  const globRe = /import\.meta\.glob\b[\s\S]{0,300}?\(\s*['"](\.[^'"]*?)\/\*\.ts['"]/g;
  const resolveFile = (from: string, spec: string): string | null => {
    const b = resolve(dirname(from), spec);
    for (const c of [b, `${b}.ts`, resolve(b, 'index.ts')]) if (existsSync(c) && statSync(c).isFile()) return c;
    return null;
  };
  let cached: string | null = null;
  const compute = (): string => {
    const seen = new Set<string>();
    const walk = (f: string) => {
      if (seen.has(f)) return;
      seen.add(f);
      const src = readFileSync(f, 'utf8');
      for (const g of src.matchAll(globRe)) {
        const d = resolve(dirname(f), g[1]);
        if (existsSync(d)) for (const n of readdirSync(d).sort()) if (n.endsWith('.ts')) walk(resolve(d, n));
      }
      for (const m of src.matchAll(importRe)) {
        if (m[1]) continue;
        const r = resolveFile(f, m[2] ?? m[3]);
        if (r) walk(r);
      }
    };
    for (const e of entries) walk(e);
    const h = createHash('sha256');
    for (const f of [...seen].sort()) h.update(relative(root, f)).update('\0').update(readFileSync(f)).update('\0');
    return h.digest('hex').slice(0, 16);
  };
  return {
    name: id.replace('virtual:', ''),
    resolveId(source) {
      return source === id ? resolved : null;
    },
    load(source) {
      if (source !== resolved) return null;
      cached ??= compute();
      return `export default ${JSON.stringify(cached)};`;
    },
    configureServer(server) {
      server.watcher.on('all', (_e, file) => {
        if (!file.startsWith(root)) return;
        cached = null;
        const mod = server.moduleGraph.getModuleById(resolved);
        if (mod) server.moduleGraph.invalidateModule(mod);
      });
    },
  };
}

// The pre-built art packs' version (src/game/packs.ts, scripts/prebuild): everything the packed art is painted by,
// the backdrops' live layers (src/game/BackdropView.ts pulls in src/content/live) and the peels included. A pack
// built under another version is never used.
const PACK_SOURCES = ['game/assets.ts', 'game/BackdropView.ts', 'game/peels.ts'];

// Dev-only: lets the running game POST canvas screenshots for automated visual review.
function devShots(): Plugin {
  return {
    name: 'dev-shots',
    apply: 'serve',
    configureServer(server) {
      const dir = process.env.FEETZA_SHOT_DIR;
      if (!dir) return;
      mkdirSync(dir, { recursive: true });
      server.middlewares.use('/__shot', (req, res) => {
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          const body = Buffer.concat(chunks).toString();
          const name = (new URL(req.url ?? '', 'http://x').searchParams.get('name') ?? 'shot').replace(/[^a-z0-9_-]/gi, '');
          writeFileSync(`${dir}/${name}.png`, Buffer.from(body.replace(/^data:image\/\w+;base64,/, ''), 'base64'));
          res.end('ok');
        });
      });
      // raw binary upload (e.g. a recorded trailer)
      server.middlewares.use('/__file', (req, res) => {
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          const name = (new URL(req.url ?? '', 'http://x').searchParams.get('name') ?? 'file').replace(/[^a-z0-9_.-]/gi, '');
          writeFileSync(`${dir}/${name}`, Buffer.concat(chunks));
          res.end('ok');
        });
      });
    },
  };
}

// Dev-only: the smack recorder (src/game/smackLog.ts) appends what each click did to .dev-logs/smacks.jsonl.
function devSmackLog(): Plugin {
  return {
    name: 'dev-smacklog',
    apply: 'serve',
    configureServer(server) {
      const dir = resolve(__dirname, '.dev-logs');
      server.middlewares.use('/__smacklog', (req, res) => {
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          try {
            mkdirSync(dir, { recursive: true });
            const batch = JSON.parse(Buffer.concat(chunks).toString()) as unknown[];
            appendFileSync(`${dir}/smacks.jsonl`, batch.map((e) => JSON.stringify(e)).join('\n') + '\n');
          } catch {
            /* a bad batch is dropped */
          }
          res.end('ok');
        });
      });
    },
  };
}

// Dev-only: the boss lab's playtest notes, saved to FEETZA_NOTES (a .json path; a .md copy sits beside it).
function devNotes(): Plugin {
  return {
    name: 'dev-notes',
    apply: 'serve',
    configureServer(server) {
      const base = process.env.FEETZA_NOTES;
      server.middlewares.use('/__notes', (req, res) => {
        // ?name=looks keeps another lab's notes in a file beside the boss notes (…-looks.json)
        const name = new URL(req.url ?? '/', 'http://x').searchParams.get('name');
        const file = base && name && /^[a-z]+$/.test(name) ? base.replace(/\.json$/, '') + `-${name}.json` : base;
        // without a notes file the lab keeps its notes in the browser: an empty answer, not a 404 in the console
        if (!file && req.method === 'GET') {
          res.setHeader('content-type', 'application/json');
          res.end('{}');
          return;
        }
        if (!file) {
          res.statusCode = 404;
          res.end('FEETZA_NOTES not set');
          return;
        }
        if (req.method === 'GET') {
          res.setHeader('content-type', 'application/json');
          res.end(existsSync(file) ? readFileSync(file, 'utf8') : '{}');
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          let body: { notes: unknown; md: string };
          try {
            body = JSON.parse(Buffer.concat(chunks).toString());
          } catch {
            res.statusCode = 400;
            res.end('bad json');
            return;
          }
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, JSON.stringify(body.notes, null, 2));
          writeFileSync(file.replace(/\.json$/, '') + '.md', body.md);
          res.end('ok');
        });
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [audioManifest(), artVersion(), artVersion('virtual:peel-version', 'game/peels.ts'), artVersion('virtual:pack-version', PACK_SOURCES), devShots(), devNotes(), devSmackLog()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
  server: { host: true, hmr: process.env.NO_HMR ? false : undefined },
});
