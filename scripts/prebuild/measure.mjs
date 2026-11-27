#!/usr/bin/env node
// Before/after timings for the art packs (docs/prebuild.md): for each mode (packs, then ?noPacks), a fresh Chrome
// profile (nothing in the art cache, nothing in the HTTP cache) on the dev server:
//   boot     page load → the title's art built (performance mark feetza:art), and its main-thread long tasks;
//   locker   the Peel Locker opened cold → every tile on screen showing its thumbnail; then scrolled through to the
//            end (a screen every 150 ms) → every tile filled;
//   run      a new run → its first stage's still art all in (the warmer idle);
//   stage    the shop after wave 5 opened → the rooftop's live layer built (stage 2's backdrop) while it's up.
// Long tasks (main thread blocked over 50 ms) are summed for each window: the hitches a player feels.
//
//   node scripts/prebuild/measure.mjs [--modes packs,noPacks] [--cache-dir DIR] [--cdp-port N]

import { resolve } from 'node:path';
import { sleep, startChrome, startVite } from './harness.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);
const modes = String(arg('modes', 'packs,noPacks')).split(',');
const { vite, url } = await startVite({ cacheDir: arg('cache-dir') ? resolve(arg('cache-dir')) : undefined });

const PAGE_HELPERS = `
  window.__lt = window.__lt || [];
  if (!window.__ltObs) { window.__ltObs = new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([e.startTime, e.duration]); }); window.__ltObs.observe({ type: 'longtask', buffered: true }); }
  window.__ltSum = (a, b) => Math.round(window.__lt.filter(([t]) => t >= a && t <= b).reduce((n, [, d]) => n + d, 0));
`;

const out = {};
for (const mode of modes) {
  const browser = await startChrome({ port: arg('cdp-port') ? Number(arg('cdp-port')) : undefined, size: '1600,900' });
  try {
    const tab = await browser.open();
    // the long-task observer from the first moment
    await tab.send('Page.addScriptToEvaluateOnNewDocument', { source: PAGE_HELPERS });
    await tab.go(`${url}?dev${mode === 'noPacks' ? '&noPacks' : ''}`);
    const boot = await tab.until(`performance.getEntriesByName('feetza:art')[0] && window.__assetMs !== undefined && { at: Math.round(performance.getEntriesByName('feetza:art')[0].startTime), assetMs: window.__assetMs, lt: __ltSum(0, performance.now()) }`, 180_000, 100);
    await tab.until('window.F && F.boot', 60_000);
    await tab.eval('await F.boot()');
    await sleep(1500);

    // the Peel Locker, cold
    const locker = await tab.eval(`
      const { ui } = await import('/src/ui/ui.ts');
      const t0 = performance.now();
      ui.closeAll();
      ui.locker(() => {});
      const vis = () => [...document.querySelectorAll('img[data-peel]')].filter((i) => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; });
      let n = 0;
      for (let i = 0; i < 1200; i++) {
        const v = vis();
        n = v.length;
        if (n >= 8 && v.every((im) => im.getAttribute('src') && im.complete)) break;
        await new Promise((r) => setTimeout(r, 25));
      }
      const ms = Math.round(performance.now() - t0);
      // then scrolled through, a screen every 150 ms, to the last tile filled
      const sc = [...document.querySelectorAll('.scroll')].find((e) => e.querySelector('img[data-peel]'));
      const all = () => [...document.querySelectorAll('img[data-peel]')];
      const t1 = performance.now();
      for (let i = 0; i < 2000; i++) {
        if (sc) sc.scrollTop += sc.clientHeight;
        await new Promise((r) => setTimeout(r, 150));
        if (sc && sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2 && all().every((im) => im.getAttribute('src'))) break;
      }
      const res = { ms, tiles: n, lt: __ltSum(t0, t1), scrollMs: Math.round(performance.now() - t1), filled: all().filter((im) => im.getAttribute('src')).length + '/' + all().length, scrollLt: __ltSum(t1, performance.now()) };
      ui.closeAll();
      return res;`, 120_000);

    // a new run: its first stage's art
    const run = await tab.eval(`
      const t0 = performance.now();
      F.startGame({ intros: false });
      await new Promise((r) => setTimeout(r, 300));
      for (let i = 0; i < 2400; i++) { if ((await F.artCache.pending()) === 0) break; await new Promise((r) => setTimeout(r, 25)); }
      return { ms: Math.round(performance.now() - t0), lt: __ltSum(t0, performance.now()) };`, 120_000);

    // a stage change: a run at the shop after wave 5 (the boss) opens the shop before wave 6, which builds the
    // rooftop's live layer while it's up (as a real run does)
    const stage = await tab.eval(`
      F.startGame({ wave: 5, kit: true, intros: false });
      await new Promise((r) => setTimeout(r, 5000));
      const g = F.game.scene.getScene('Game');
      if (window.ui?.closeAll) ui.closeAll();
      const { ui: u } = await import('/src/ui/ui.ts');
      u.closeAll();
      g.run.wave = 5;
      const t0 = performance.now();
      g.openUpgrades(true);
      const has = () => F.game.textures.exists('bgk_rooftop_base');
      for (let i = 0; i < 2400 && !has(); i++) await new Promise((r) => setTimeout(r, 20));
      await new Promise((r) => setTimeout(r, 300));
      return { ms: Math.round(performance.now() - t0), ok: has(), lt: __ltSum(t0, performance.now()) };`, 120_000);
    const packs = await tab.eval('return await F.packs()');
    const errors = tab.logs.filter((l) => l.type === 'error' || l.type === 'exception').map((l) => l.text.slice(0, 200));
    out[mode] = { boot, locker, run, stage, fetchedMb: packs.mb, decodes: packs.decodes, decodeMs: packs.decodeMs, hits: packs.hits, misses: packs.misses, errors };
    console.log(mode, JSON.stringify(out[mode]));
  } finally {
    await browser.close();
  }
  await sleep(1000);
}
await vite.close();
console.log(JSON.stringify(out, null, 2));
