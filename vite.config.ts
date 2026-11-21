import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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

// Dev-only: the boss lab's playtest notes, saved to FEETZA_NOTES (a .json path; a .md copy sits beside it).
function devNotes(): Plugin {
  return {
    name: 'dev-notes',
    apply: 'serve',
    configureServer(server) {
      const file = process.env.FEETZA_NOTES;
      server.middlewares.use('/__notes', (req, res) => {
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
  plugins: [audioManifest(), devShots(), devNotes()],
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
