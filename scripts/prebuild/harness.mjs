// A dev server and one headless Chrome for the art prebuild (scripts/prebuild/run.mjs) and its check: Vite's own dev
// server (so the painters run exactly as in the game) with its own cache dir, and Chrome over the DevTools protocol
// with a throwaway profile, muted. Nothing here touches the player's browser or save.

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer as netServer } from 'node:net';

export const ROOT = resolve(import.meta.dirname, '../..');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const portFree = (port) =>
  new Promise((res) => {
    const s = netServer();
    s.once('error', () => res(false));
    s.listen(port, '127.0.0.1', () => s.close(() => res(true)));
  });

/** A free port: `want` if given, else one picked at random in 9400–9800 (never 9444), else any. */
export async function freePort(want) {
  if (want) return want;
  for (let i = 0; i < 40; i++) {
    const p = 9400 + Math.floor(Math.random() * 400);
    if (p !== 9444 && (await portFree(p))) return p;
  }
  return new Promise((res) => {
    const s = netServer();
    s.listen(0, () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });
}

/** Where Chrome is: $CHROME, then the usual places. Null when there's none. */
export function findChrome() {
  const c = [
    process.env.CHROME,
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  return c.find((p) => existsSync(p)) ?? null;
}

/** Start Vite's dev server (extra plugins for the prebuild's endpoints). */
export async function startVite({ port, cacheDir, plugins = [] } = {}) {
  const { createServer } = await import(join(ROOT, 'node_modules/vite/dist/node/index.js'));
  process.env.NO_HMR = '1';
  const vite = await createServer({
    root: ROOT,
    logLevel: 'error',
    cacheDir: cacheDir ?? mkdtempSync(join(tmpdir(), 'feetza-prebuild-vite-')),
    plugins,
    server: { port: port ?? (await freePort()), strictPort: false, host: '127.0.0.1', fs: { strict: false } },
  });
  await vite.listen();
  return { vite, url: vite.resolvedUrls.local[0] };
}

/** Start one headless Chrome; returns { open(url), close() }. */
export async function startChrome({ chrome = findChrome(), port, size = '1600,900' } = {}) {
  if (!chrome) throw new Error('no Chrome found (set CHROME=/path/to/chrome)');
  const cdpPort = await freePort(port);
  const profileDir = mkdtempSync(join(tmpdir(), 'feetza-prebuild-chrome-'));
  const proc = spawn(
    chrome,
    [
      '--headless=new',
      '--mute-audio',
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      `--window-size=${size}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  for (let i = 0; i < 150; i++) {
    try {
      await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
      break;
    } catch {
      await sleep(100);
    }
  }
  const tabs = [];
  return {
    cdpPort,
    async open(url) {
      const t = new Tab(cdpPort);
      await t.open(url);
      tabs.push(t);
      return t;
    },
    async close() {
      for (const t of tabs) t.ws?.close();
      try {
        proc.kill('SIGTERM');
      } catch {
        /* gone */
      }
      await sleep(400);
      try {
        rmSync(profileDir, { recursive: true, force: true });
      } catch {
        /* Chrome may still hold a file */
      }
    },
  };
}

export class Tab {
  constructor(cdpPort) {
    this.cdpPort = cdpPort;
    this.n = 0;
    this.pend = new Map();
    this.logs = [];
  }
  async open(url) {
    const t = await (await fetch(`http://127.0.0.1:${this.cdpPort}/json/new?about:blank`, { method: 'PUT' })).json();
    this.ws = new WebSocket(t.webSocketDebuggerUrl);
    this.ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && this.pend.has(d.id)) {
        this.pend.get(d.id)(d);
        this.pend.delete(d.id);
      } else if (d.method === 'Runtime.consoleAPICalled') {
        const text = d.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
        this.logs.push({ type: d.params.type, text });
        this.onLog?.(d.params.type, text);
      } else if (d.method === 'Runtime.exceptionThrown') {
        const text = d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text;
        this.logs.push({ type: 'exception', text });
        this.onLog?.('exception', text);
      }
    };
    await new Promise((r) => (this.ws.onopen = r));
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    if (url) await this.go(url);
  }
  send(method, params = {}) {
    return new Promise((r) => {
      const i = ++this.n;
      this.pend.set(i, r);
      this.ws.send(JSON.stringify({ id: i, method, params }));
    });
  }
  go(url) {
    return this.send('Page.navigate', { url });
  }
  async eval(expr, timeout = 30 * 60_000) {
    const r = await this.send('Runtime.evaluate', { expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true, timeout });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text);
    return r.result?.result?.value;
  }
  /** Wait until an expression is truthy (returns its value). */
  async until(expr, ms = 120_000, every = 200) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const v = await this.eval(`return ${expr}`, 10_000).catch(() => null);
      if (v) return v;
      await sleep(every);
    }
    throw new Error(`timed out waiting for ${expr}`);
  }
}
