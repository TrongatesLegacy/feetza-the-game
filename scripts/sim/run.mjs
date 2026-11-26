#!/usr/bin/env node
// The balance simulator's runner: plays many seeded runs of the real game at full CPU speed and writes a report.
//
//   npm run sim -- --heat regular,hot --runs 20 --waves 100
//   npm run sim -- --heat mild --runs 10 --waves 30 --peel classic,hero:zeus --workers 4
//   npm run sim -- --check          (same seed twice: are runs reproducible?)
//   npm run sim -- --heat mild --from 60 --waves 90 --shop auto --bot idle,light,full
//                   (momentum: toppings alone, a lazy player, a busy one; the report splits smack and automatic damage)
//   npm run sim -- --heat mild --bot idle --momentum floor=0.1,drain=4,grace=2,smackGain=0.6   (try other numbers)
//
// It starts its own Vite dev server and a headless Chrome (muted, its own throwaway profile, so the game's save in
// your browser is never touched), opens one tab per worker and hands each tab runs to play with F.sim.run
// (src/devSim.ts). Results land in .sim/<date-time>/results.json and report.html (see report.mjs).

import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer as netServer } from 'node:net';
import { writeReport } from './report.mjs';

const ROOT = resolve(import.meta.dirname, '../..');

// ——— options ———
const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const list = (v) => String(v).split(',').map((s) => s.trim()).filter(Boolean);
const check = !!arg('check', false);
const heats = list(arg('heat', 'regular'));
const peels = list(arg('peel', 'classic'));
const runs = Number(arg('runs', check ? 3 : 10));
const waves = Number(arg('waves', 30));
const workers = Math.max(1, Math.min(6, Number(arg('workers', 3))));
const seedBase = Number(arg('seed', 1));
const accuracy = Number(arg('accuracy', 0.9));
const dt = Number(arg('dt', 1000 / 60));
const profile = String(arg('profile', 'fresh'));
const chrome = String(arg('chrome', process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'));
const quiet = !!arg('quiet', false);
const trace = Number(arg('trace', 0));
const idleFrom = Number(arg('idle-from', 0));
const shopMode = String(arg('shop', 'rarity'));
// how the bot plays (src/devSim.ts SimOpts.bot): full, light (a smack every --light-rate ms) or idle (never smacks)
const bots = list(arg('bot', 'full'));
const lightRate = Number(arg('light-rate', 2000));
// momentum overrides (src/data/difficulty.ts): floor=…,drain=…,grace=… for the heat, smackGain=…,slamGain=… shared
const momentum = Object.fromEntries(
  list(arg('momentum', ''))
    .map((kv) => kv.split('='))
    .filter(([k, v]) => k && v !== undefined && Number.isFinite(Number(v)))
    .map(([k, v]) => [k, Number(v)]),
);
// start each run at this wave (from the shop, with a starter kit sized for it) instead of wave 1
const from = Number(arg('from', 0));
// a fresh page for every run (slower to start, but nothing from an earlier run can carry over)
const freshEvery = argv.includes('--reuse') ? 8 : 1;

if (argv.includes('--help')) {
  console.log(`npm run sim -- [--heat mild,regular,hot,extrahot,inferno] [--runs N] [--waves N] [--peel id,id]
                 [--workers N] [--seed N] [--accuracy 0..1] [--dt ms] [--profile fresh|veteran] [--check]
                 [--from wave] [--shop rarity|auto] [--idle-from wave] [--bot full,light,idle] [--light-rate ms]
                 [--momentum floor=0.15,drain=6,grace=2.5,smackGain=0.6,slamGain=1]`);
  process.exit(0);
}

// every heat × peel × seed (with --check, each seed twice)
const jobs = [];
for (const heat of heats)
  for (const peel of peels)
    for (const bot of bots)
      for (let i = 0; i < runs; i++) {
        const job = { seed: seedBase + i, heat, peel, waves, accuracy, dt, profile, ...(trace ? { trace } : {}), ...(idleFrom ? { idleFrom } : {}), ...(from ? { from } : {}), shop: shopMode, bot, lightRate, ...(Object.keys(momentum).length ? { momentum } : {}) };
        jobs.push(job);
        if (check) jobs.push({ ...job, repeat: true });
      }

const freePort = () =>
  new Promise((res) => {
    const s = netServer();
    s.listen(0, () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ——— the dev server and Chrome ———
const { createServer } = await import(join(ROOT, 'node_modules/vite/dist/node/index.js'));
const vite = await createServer({ root: ROOT, logLevel: 'error', server: { port: await freePort(), strictPort: false, host: '127.0.0.1' } });
await vite.listen();
const url = vite.resolvedUrls.local[0];
const cdpPort = await freePort();
const profileDir = mkdtempSync(join(tmpdir(), 'feetza-sim-'));
const browser = spawn(
  chrome,
  [
    '--headless=new',
    '--mute-audio',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    // background tabs must keep running at full speed
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--disable-features=CalculateNativeWinOcclusion',
    '--window-size=1280,720',
    'about:blank',
  ],
  { stdio: 'ignore' },
);
let closed = false;
const shutdown = async () => {
  if (closed) return;
  closed = true;
  try {
    browser.kill('SIGTERM');
  } catch {
    /* gone */
  }
  await vite.close().catch(() => {});
  await sleep(300);
  try {
    rmSync(profileDir, { recursive: true, force: true });
  } catch {
    /* Chrome may still hold a file */
  }
};
process.on('SIGINT', async () => {
  console.log('\nStopping…');
  await shutdown();
  process.exit(130);
});

for (let i = 0; i < 100; i++) {
  try {
    await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
    break;
  } catch {
    await sleep(100);
  }
}

// ——— a tab that plays runs ———
class Tab {
  async open() {
    const t = await (await fetch(`http://127.0.0.1:${cdpPort}/json/new?about:blank`, { method: 'PUT' })).json();
    this.id = t.id;
    this.ws = new WebSocket(t.webSocketDebuggerUrl);
    this.n = 0;
    this.pend = new Map();
    this.ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && this.pend.has(d.id)) {
        this.pend.get(d.id)(d);
        this.pend.delete(d.id);
      }
    };
    await new Promise((r) => (this.ws.onopen = r));
    await this.load();
  }
  send(method, params = {}) {
    return new Promise((r) => {
      const i = ++this.n;
      this.pend.set(i, r);
      this.ws.send(JSON.stringify({ id: i, method, params }));
    });
  }
  async eval(expr, timeout = 30 * 60_000) {
    const r = await this.send('Runtime.evaluate', { expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true, timeout });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text);
    return r.result?.result?.value;
  }
  /** A fresh page (also every few runs, so nothing piles up between them). */
  async load() {
    await this.send('Page.enable');
    await this.send('Page.navigate', { url: `${url}?dev&sim` });
    for (let i = 0; i < 200; i++) {
      await sleep(150);
      const ok = await this.eval('return !!(window.F && F.sim && F.boot)', 5000).catch(() => false);
      if (ok) break;
    }
    await this.eval('await F.boot(); return true');
    // the art is built in the background after boot: wait for all of it (up to 3 minutes)
    for (let i = 0; i < 900; i++) {
      if (await this.eval('return await F.sim.ready()', 5000).catch(() => false)) break;
      await sleep(200);
    }
    this.played = 0;
  }
  async play(job) {
    if (this.played >= freshEvery) await this.load();
    this.played++;
    return this.eval(`return await F.sim.run(${JSON.stringify(job)})`);
  }
}

// ——— run them ———
const out = join(ROOT, '.sim', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19));
mkdirSync(out, { recursive: true });
const results = [];
const t0 = Date.now();
let next = 0;
const label = (j) => `${j.heat} ${j.peel}${bots.length > 1 || j.bot !== 'full' ? ` ${j.bot} bot` : ''} seed ${j.seed}${j.repeat ? ' (again)' : ''}`;
console.log(`Feetza balance sim: ${jobs.length} runs (${heats.join(', ')} × ${peels.join(', ')} × ${runs} seeds, to wave ${waves}) on ${workers} tabs`);

const worker = async () => {
  const tab = new Tab();
  await tab.open();
  while (next < jobs.length) {
    const job = jobs[next++];
    const { repeat, ...opts } = job;
    let r;
    try {
      r = await tab.play(opts);
    } catch (e) {
      r = { opts, outcome: 'error', wave: 0, gameSec: 0, realMs: 0, waves: [], boss: null, field: [], table: [], owned: {}, crusts: 0, error: String(e.message ?? e).split('\n').slice(0, 6).join(' | ') };
      await tab.load().catch(() => {});
    }
    r.repeat = !!repeat;
    results.push(r);
    if (!quiet) {
      const speed = r.realMs ? Math.round((r.gameSec * 1000) / r.realMs) : 0;
      const what = r.outcome === 'dead' ? `died at wave ${r.wave}${r.boss ? ` (${r.boss})` : ''}` : r.outcome === 'reached' ? `reached wave ${waves}` : r.outcome === 'stalled' ? `STALLED at wave ${r.wave}: ${r.stall?.screen}` : `ERROR at wave ${r.wave}: ${r.error}`;
      // guard feet's shields: smacks they blocked, shields broken and replaced
      const gd = r.guard?.blocked ? ` · shields: ${r.guard.blocked} blocked, ${r.guard.broken} broken, ${r.guard.rearmed} re-armed` : '';
      // smack vs automatic damage, and the waves cleared with no smacks at all
      const sp = r.split ? r.split.smack + r.split.auto + r.split.slam + r.split.other : 0;
      const dm = sp ? ` · damage: ${Math.round((r.split.smack / sp) * 100)}% smacks, ${Math.round((r.split.auto / sp) * 100)}% automatic · ${r.noSmackWaves ?? 0} waves with no smacks` : '';
      console.log(`[${results.length}/${jobs.length}] ${label(job)}: ${what}${gd}${dm} · ${(r.realMs / 1000).toFixed(1)} s (${speed}× real time)`);
    }
    writeFileSync(join(out, 'results.json'), JSON.stringify(results));
  }
};

try {
  await Promise.all(Array.from({ length: Math.min(workers, jobs.length) }, worker));
} finally {
  await shutdown();
}

const secs = (Date.now() - t0) / 1000;
const gameSecs = results.reduce((n, r) => n + (r.gameSec ?? 0), 0);
const meta = { heats, peels, bots, lightRate, momentum, runs, waves, workers, accuracy, dt, profile, check, seconds: Math.round(secs), gameSeconds: gameSecs, when: new Date().toISOString() };
writeFileSync(join(out, 'results.json'), JSON.stringify({ meta, results }, null, 0));
const report = writeReport(out, meta, results);
const bad = results.filter((r) => r.outcome === 'stalled' || r.outcome === 'error').length;
console.log(`\nDone: ${results.length} runs in ${secs.toFixed(0)} s, ${(gameSecs / 3600).toFixed(1)} h of game time (${Math.round(gameSecs / secs)}× real time overall).`);
if (bad) console.log(`⚠ ${bad} run(s) stalled or errored: see the report before trusting the numbers.`);
if (check) {
  const pairs = new Map();
  for (const r of results) {
    const k = `${r.opts.heat}|${r.opts.peel}|${r.opts.bot ?? 'full'}|${r.opts.seed}`;
    pairs.set(k, [...(pairs.get(k) ?? []), r]);
  }
  let same = 0;
  for (const [k, [a, b]] of pairs) {
    const ok = a && b && a.outcome === b.outcome && a.wave === b.wave && a.waves.map((w) => w.coins).join() === b.waves.map((w) => w.coins).join();
    if (ok) same++;
    else console.log(`  differs: ${k}: ${a?.outcome} ${a?.wave} vs ${b?.outcome} ${b?.wave}`);
  }
  console.log(`Reproducible: ${same}/${pairs.size} seeds gave identical runs.`);
}
console.log(`Report: ${report}`);
