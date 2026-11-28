#!/usr/bin/env node
// The golden check (docs/effects-plan.md): the run's Stats for a large fixed set of builds (src/devGolden.ts), worked
// out by the game's own code, compared with the committed snapshot to 1e-9.
//
//   npm run golden             compare with scripts/golden/stats.json and list every difference (exit 1 if any); and
//                              the card text checks (src/devCardText.ts): overrides against the effects, and every
//                              topping's text fits a shop card at desktop and phone size (exit 1 on any problem)
//   npm run golden -- --write  write the snapshot (after a change that's meant to move numbers)
//   --cache-dir <dir>          Vite's dependency cache (default node_modules/.vite; or SIM_CACHE_DIR)
//
// It starts its own Vite dev server and one headless Chrome (muted, a throwaway profile), like the balance sim.

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer as netServer } from 'node:net';

const ROOT = resolve(import.meta.dirname, '../..');
const SNAP = join(import.meta.dirname, 'stats.json');
const argv = process.argv.slice(2);
const write = argv.includes('--write');
const ci = argv.indexOf('--cache-dir');
const cacheDir = ci >= 0 ? argv[ci + 1] : process.env.SIM_CACHE_DIR;
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TOL = 1e-9;

const freePort = () =>
  new Promise((res) => {
    const s = netServer();
    s.listen(0, () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { createServer } = await import(join(ROOT, 'node_modules/vite/dist/node/index.js'));
const vite = await createServer({ root: ROOT, logLevel: 'error', ...(cacheDir ? { cacheDir: resolve(cacheDir) } : {}), server: { port: await freePort(), host: '127.0.0.1', fs: { strict: false } } });
await vite.listen();
const url = vite.resolvedUrls.local[0];
const cdpPort = await freePort();
const profileDir = mkdtempSync(join(tmpdir(), 'feetza-golden-'));
const browser = spawn(chrome, ['--headless=new', '--mute-audio', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profileDir}`, '--no-first-run', '--no-default-browser-check', '--window-size=1280,720', 'about:blank'], { stdio: 'ignore' });
const shutdown = async () => {
  try {
    browser.kill('SIGTERM');
  } catch {
    /* gone */
  }
  await vite.close().catch(() => {});
  await sleep(300);
  rmSync(profileDir, { recursive: true, force: true });
};

let out;
const textProblems = [];
try {
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
      break;
    } catch {
      await sleep(100);
    }
  }
  const t = await (await fetch(`http://127.0.0.1:${cdpPort}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let n = 0;
  const pend = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pend.has(d.id)) {
      pend.get(d.id)(d);
      pend.delete(d.id);
    }
  };
  await new Promise((r) => (ws.onopen = r));
  const send = (method, params = {}) => new Promise((r) => { const i = ++n; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const evalJs = async (expr, timeout = 10 * 60_000) => {
    const r = await send('Runtime.evaluate', { expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true, timeout });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text);
    return r.result?.result?.value;
  };
  await send('Page.enable');
  await send('Page.navigate', { url: `${url}?dev&sim` });
  for (let i = 0; i < 400; i++) {
    await sleep(150);
    if (await evalJs('return !!(window.F && F.boot && F.golden)', 5000).catch(() => false)) break;
  }
  await evalJs('await F.boot(); return true');
  for (let i = 0; i < 900; i++) {
    if (await evalJs('return await F.sim.ready()', 5000).catch(() => false)) break;
    await sleep(200);
  }
  await evalJs(`F.startGame({ heat: 'regular', intros: false, seed: 1 });
    for (let i = 0; i < 200 && !F.scene('Game')?.run; i++) await new Promise((r) => setTimeout(r, 50));
    await new Promise((r) => setTimeout(r, 500)); return true`);
  const t0 = Date.now();
  out = await evalJs('return F.golden()');
  console.log(`Golden: ${Object.keys(out).length} builds worked out in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  // the card text checks (src/devCardText.ts): hand-written text against the effects, and every topping's text in
  // the shop card's 4-line block, at desktop and phone size
  const audit = await evalJs('return F.cardTextAudit()');
  textProblems.push(...audit.problems);
  console.log(`Card text: ${audit.generated} toppings generated, ${audit.overridden.length} with a hand-written side (${audit.overridden.join(', ')}), ${audit.scene} the scene's own`);
  await evalJs(`F.startGame({ upgrades: {}, coins: 500, wave: 12, intros: false, seed: 1 });
    for (let i = 0; i < 200 && !document.querySelector('.shop2 .cards .card'); i++) await new Promise((r) => setTimeout(r, 50));
    await new Promise((r) => setTimeout(r, 800)); return true`);
  for (const [name, width, height] of [['desktop', 1280, 720], ['phone', 844, 390]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: name === 'phone' });
    await sleep(400);
    const fails = await evalJs('return F.cardTextFit()');
    for (const f of fails) textProblems.push(`${f.id} LV${f.lvl} (${f.heat}, ${f.meter}, ${f.cards} cards, ${name}): ${f.lines} lines, more than the card's 4`);
    console.log(`Card text fit (${name} ${width}×${height}): ${fails.length ? `${fails.length} too long` : 'every topping fits'}`);
  }
} finally {
  await shutdown();
}

if (textProblems.length) {
  console.log(`${textProblems.length} card text problem(s):`);
  for (const t of textProblems.slice(0, 100)) console.log(`  ${t}`);
}
if (write || !existsSync(SNAP)) {
  writeFileSync(SNAP, JSON.stringify(out, null, 0).replace(/\},"/g, '},\n"') + '\n');
  console.log(`Wrote ${SNAP}`);
  process.exit(textProblems.length ? 1 : 0);
}
const want = JSON.parse(readFileSync(SNAP, 'utf8'));
const diffs = [];
for (const name of new Set([...Object.keys(want), ...Object.keys(out)])) {
  const a = want[name];
  const b = out[name];
  if (!a || !b) {
    diffs.push(`${name}: ${a ? 'no longer built' : 'new build'}`);
    continue;
  }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k] ?? 0;
    const y = b[k] ?? 0;
    if (Math.abs(x - y) > TOL) diffs.push(`${name}: ${k} ${x} → ${y}`);
  }
}
if (diffs.length) {
  console.log(`${diffs.length} difference(s) from the snapshot:`);
  for (const d of diffs.slice(0, 200)) console.log(`  ${d}`);
  if (diffs.length > 200) console.log(`  … and ${diffs.length - 200} more`);
  process.exit(1);
}
console.log('No differences from the snapshot.');
if (textProblems.length) process.exit(1);
