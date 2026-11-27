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

/** A free port: `want` if given, else one picked at random in lo–hi (never 9444 or 5288, which are in use), else
 * any. */
export async function freePort(want, lo = 9400, hi = 9800) {
  if (want) {
    if (!(await portFree(want))) throw new Error(`port ${want} is in use`);
    return want;
  }
  for (let i = 0; i < 40; i++) {
    const p = lo + Math.floor(Math.random() * (hi - lo));
    if (p !== 9444 && p !== 5288 && (await portFree(p))) return p;
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
    server: { port: await freePort(port, 5600, 5700), strictPort: true, host: '127.0.0.1', fs: { strict: false } },
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
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  // (a busy CI runner can take a while to bring Chrome up: wait up to a minute, and say why if it never comes)
  let errTail = '';
  let exited = null;
  proc.stderr.on('data', (d) => (errTail = (errTail + d).slice(-2000)));
  proc.on('exit', (code) => (exited = code));
  let up = false;
  for (let i = 0; i < 600 && exited === null; i++) {
    try {
      await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
      up = true;
      break;
    } catch {
      await sleep(100);
    }
  }
  if (!up) {
    try {
      proc.kill('SIGKILL');
    } catch {
      /* gone */
    }
    throw new Error(`Chrome didn't come up on port ${cdpPort}${exited !== null ? ` (it exited with ${exited})` : ' within 60 s'}\n${errTail}`);
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
    // (a window of its own: a background tab's requestAnimationFrame would wait)
    const ver = await (await fetch(`http://127.0.0.1:${this.cdpPort}/json/version`)).json();
    const bw = new WebSocket(ver.webSocketDebuggerUrl);
    await new Promise((r) => (bw.onopen = r));
    const targetId = await new Promise((res, rej) => {
      bw.onmessage = (m) => {
        const d = JSON.parse(m.data);
        if (d.id === 1) d.error ? rej(new Error(d.error.message)) : res(d.result.targetId);
      };
      bw.send(JSON.stringify({ id: 1, method: 'Target.createTarget', params: { url: 'about:blank', newWindow: true } }));
    });
    bw.close();
    this.targetId = targetId;
    this.ws = new WebSocket(`ws://127.0.0.1:${this.cdpPort}/devtools/page/${targetId}`);
    this.ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && this.pend.has(d.id)) {
        this.pend.get(d.id)(d);
        this.pend.delete(d.id);
      } else if (d.method === 'Runtime.consoleAPICalled') {
        const text = d.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
        this.logs.push({ type: d.params.type, text });
        this.onLog?.(d.params.type, text);
      } else if (d.method === 'Inspector.targetCrashed') {
        this.dead = 'the page crashed (out of memory?)';
      } else if (d.method === 'Runtime.exceptionThrown') {
        const text = d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text;
        this.logs.push({ type: 'exception', text });
        this.onLog?.('exception', text);
      }
    };
    await new Promise((r) => (this.ws.onopen = r));
    this.ws.onclose = () => {
      this.dead ??= 'the page closed';
      for (const r of this.pend.values()) r({ result: { exceptionDetails: { text: this.dead } } });
      this.pend.clear();
    };
    await this.send('Inspector.enable');
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    if (url) await this.go(url);
  }
  send(method, params = {}) {
    if (this.dead) return Promise.resolve({ result: { exceptionDetails: { text: this.dead } } });
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
      if (this.dead) throw new Error(this.dead);
      const v = await this.eval(`return ${expr}`, 10_000).catch(() => null);
      if (v) return v;
      await sleep(every);
    }
    throw new Error(`timed out waiting for ${expr}`);
  }
}
