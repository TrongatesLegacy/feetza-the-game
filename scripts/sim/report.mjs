// The balance simulator's report: one self-contained HTML page from a run's results (scripts/sim/run.mjs).
// Also usable on its own: `node scripts/sim/report.mjs .sim/<folder>` rebuilds report.html from results.json.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SERIES_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const SERIES_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#0ca30c', '#9085e9', '#e66767'];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : '–');
const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const quart = (xs, q) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1) + 0.5))];
};
const HEAT_ORDER = ['mild', 'regular', 'hot', 'extrahot', 'inferno'];
const HEAT_NAME = { mild: 'Mild', regular: 'Regular', hot: 'Hot', extrahot: 'Extra Hot', inferno: 'Inferno' };

function groups(results) {
  const by = new Map();
  for (const r of results) {
    if (r.repeat) continue;
    const bot = r.opts.bot ?? 'full';
    const k = `${r.opts.heat}|${r.opts.peel}|${bot}`;
    if (!by.has(k)) by.set(k, { heat: r.opts.heat, peel: r.opts.peel, bot, runs: [] });
    by.get(k).runs.push(r);
  }
  return [...by.values()].sort((a, b) => HEAT_ORDER.indexOf(a.heat) - HEAT_ORDER.indexOf(b.heat) || a.peel.localeCompare(b.peel) || BOT_ORDER.indexOf(a.bot) - BOT_ORDER.indexOf(b.bot));
}
const BOT_ORDER = ['full', 'light', 'idle'];
const BOT_NAME = { full: 'busy bot', light: 'light bot', idle: 'idle bot' };
const nameOf = (g, many, bots) => `${HEAT_NAME[g.heat] ?? g.heat}${many ? ` · ${g.peel}` : ''}${bots ? ` · ${BOT_NAME[g.bot] ?? g.bot}` : ''}`;

/** A line chart: x = wave, one line per series (≤ 8), y from 0 to yMax. */
function lineChart({ id, series, xMax, yMax, yFmt, yLabel, height = 260 }) {
  const W = 760;
  const H = height;
  const L = 48;
  const R = 110;
  const T = 14;
  const B = 34;
  const x = (w) => L + ((w - 1) / Math.max(1, xMax - 1)) * (W - L - R);
  const y = (v) => T + (1 - v / yMax) * (H - T - B);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);
  const xt = [];
  for (let w = 1; w <= xMax; w += xMax > 40 ? 10 : 5) xt.push(w);
  let s = `<svg class="chart" id="${id}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(yLabel)} by wave">`;
  for (const t of ticks) s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/><text class="tick" x="${L - 8}" y="${y(t) + 4}" text-anchor="end">${esc(yFmt(t))}</text>`;
  for (const w of xt) s += `<text class="tick" x="${x(w)}" y="${H - B + 18}" text-anchor="middle">${w}</text>`;
  s += `<text class="tick" x="${W - R}" y="${H - 4}" text-anchor="end">wave</text>`;
  series.forEach((ser, i) => {
    const pts = ser.points.filter((p) => p[1] !== null);
    if (!pts.length) return;
    s += `<path class="line" style="stroke:var(--s${i + 1})" d="${pts.map((p, k) => `${k ? 'L' : 'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join('')}"/>`;
    const last = pts[pts.length - 1];
    if (series.length <= 4) s += `<text class="dlabel" x="${x(last[0]) + 6}" y="${y(last[1]) + 4}">${esc(ser.name)}</text>`;
  });
  // the hover layer: one column per wave
  for (let w = 1; w <= xMax; w++) {
    const tip = series.map((ser) => `${ser.name}: ${ser.points.find((p) => p[0] === w)?.[1] != null ? yFmt(ser.points.find((p) => p[0] === w)[1]) : '–'}`).join('\n');
    const cw = (W - L - R) / Math.max(1, xMax - 1);
    s += `<rect class="hit" x="${x(w) - cw / 2}" y="${T}" width="${cw}" height="${H - T - B}" data-tip="Wave ${w}\n${esc(tip)}" data-x="${x(w)}"/>`;
  }
  s += `<line class="cross" x1="0" x2="0" y1="${T}" y2="${H - B}"/></svg>`;
  return s;
}

/** Bars: how many runs ended at each wave (one hue). */
function barChart({ id, counts, xMax, height = 170 }) {
  const W = 760;
  const H = height;
  const L = 36;
  const R = 12;
  const T = 10;
  const B = 28;
  const max = Math.max(1, ...counts.values());
  const bw = (W - L - R) / xMax;
  let s = `<svg class="chart" id="${id}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Runs ending at each wave">`;
  for (const f of [0, 0.5, 1]) {
    const yy = T + (1 - f) * (H - T - B);
    s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/><text class="tick" x="${L - 6}" y="${yy + 4}" text-anchor="end">${Math.round(f * max)}</text>`;
  }
  for (let w = 1; w <= xMax; w++) {
    const c = counts.get(w) ?? 0;
    const x = L + (w - 1) * bw;
    if (w === 1 || w % (xMax > 40 ? 10 : 5) === 0) s += `<text class="tick" x="${x + bw / 2}" y="${H - B + 16}" text-anchor="middle">${w}</text>`;
    if (c) {
      const hgt = (c / max) * (H - T - B);
      s += `<rect class="bar" x="${x + 1}" y="${H - B - hgt}" width="${Math.max(1, bw - 2)}" height="${hgt}" rx="${Math.min(4, (bw - 2) / 2)}"/>`;
    }
    s += `<rect class="hit" x="${x}" y="${T}" width="${bw}" height="${H - T - B}" data-tip="Wave ${w}: ${c} run${c === 1 ? '' : 's'} ended here"/>`;
  }
  return `${s}</svg>`;
}

export function writeReport(dir, meta, results) {
  const gs = groups(results);
  const many = new Set(gs.map((g) => g.peel)).size > 1;
  // (with more than one bot, or a light or idle one, every name says which)
  const bots = new Set(gs.map((g) => g.bot)).size > 1 || gs.some((g) => g.bot !== 'full');
  const nm = (g, m = many) => nameOf(g, m, bots);
  const xMax = meta.waves;
  const bad = results.filter((r) => r.outcome === 'stalled' || r.outcome === 'error');
  const shown = gs.slice(0, 8);

  // the summary table
  const rows = gs.map((g) => {
    const deaths = g.runs.filter((r) => r.outcome === 'dead').map((r) => r.wave);
    const ended = g.runs.map((r) => (r.outcome === 'reached' ? xMax + 1 : r.wave));
    const reached = g.runs.filter((r) => r.outcome === 'reached').length;
    const broken = g.runs.filter((r) => r.outcome === 'stalled' || r.outcome === 'error').length;
    const secs = g.runs.map((r) => r.gameSec);
    return `<tr><td>${esc(nm(g, true))}</td><td class="n">${g.runs.length}</td><td class="n">${pct(reached, g.runs.length)}</td><td class="n">${median(ended) > xMax ? `past ${xMax}` : (median(ended) ?? '–')}</td><td class="n">${deaths.length ? `${quart(deaths, 0.25)}–${quart(deaths, 0.75)}` : '–'}</td><td class="n">${Math.round(median(secs) / 60) || '–'} min</td><td class="n">${broken ? `<b class="warn">${broken}</b>` : 0}</td></tr>`;
  });

  // survival: share of runs still going at the start of each wave
  const survival = shown.map((g) => ({
    name: nm(g),
    points: Array.from({ length: xMax }, (_, i) => {
      const w = i + 1;
      const n = g.runs.filter((r) => r.outcome !== 'stalled' && r.outcome !== 'error').length;
      const alive = g.runs.filter((r) => (r.outcome === 'reached' || r.wave >= w) && r.outcome !== 'stalled' && r.outcome !== 'error').length;
      return [w, n ? (alive / n) * 100 : null];
    }),
  }));
  // economy: averages over the runs that cleared each wave
  const avgBy = (g, key) =>
    Array.from({ length: xMax }, (_, i) => {
      const w = i + 1;
      const vals = g.runs.map((r) => r.waves.find((x) => x.wave === w)?.[key]).filter((v) => v !== undefined);
      return [w, vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null];
    });
  const coins = shown.map((g) => ({ name: nm(g), points: avgBy(g, 'coins') }));
  const slices = shown.map((g) => ({ name: nm(g), points: avgBy(g, 'slices') }));
  const lost = shown.map((g) => ({ name: nm(g), points: avgBy(g, 'lost') }));
  // smacks vs automatic damage (momentum): shares over the run, waves cleared with no smacks, momentum held
  const shareOf = (r, k) => {
    const s = r.split;
    const t = s ? s.smack + s.auto + s.slam + s.other : 0;
    return t ? s[k] / t : null;
  };
  const dmgRows = gs.map((g) => {
    const ok = g.runs.filter((r) => r.split);
    const med = (f) => median(ok.map(f).filter((v) => v !== null && v !== undefined));
    const mo = ok.flatMap((r) => r.waves.map((w) => w.momentum).filter((v) => v !== undefined));
    const f = (v) => (v === null ? '–' : `${Math.round(v * 100)}%`);
    return `<tr><td>${esc(nm(g, true))}</td><td class="n">${f(med((r) => shareOf(r, 'smack')))}</td><td class="n">${f(med((r) => shareOf(r, 'auto')))}</td><td class="n">${f(med((r) => shareOf(r, 'slam')))}</td><td class="n">${f(med((r) => shareOf(r, 'other')))}</td><td class="n">${med((r) => r.noSmackWaves) ?? '–'}</td><td class="n">${mo.length ? `${Math.round((mo.reduce((a, b) => a + b, 0) / mo.length) * 100)}%` : '–'}</td></tr>`;
  });
  const autoShare = shown.map((g) => ({
    name: nm(g),
    points: Array.from({ length: xMax }, (_, i) => {
      const w = i + 1;
      const rs = g.runs.map((r) => r.waves.find((x) => x.wave === w)).filter((x) => x && x.autoDmg !== undefined && x.autoDmg + x.smackDmg > 0);
      return [w, rs.length ? (rs.reduce((n, x) => n + x.autoDmg / (x.autoDmg + x.smackDmg), 0) / rs.length) * 100 : null];
    }),
  }));
  const hasSplit = results.some((r) => r.split);
  const maxOf = (ser) => Math.max(1, ...ser.flatMap((s) => s.points.map((p) => p[1] ?? 0)));
  const nice = (v) => {
    const p = 10 ** Math.floor(Math.log10(v));
    return Math.ceil(v / p) * p;
  };

  // where runs end: per group, the wave counts, and the bosses on the field
  const endings = gs.map((g) => {
    const counts = new Map();
    for (const r of g.runs) if (r.outcome === 'dead') counts.set(r.wave, (counts.get(r.wave) ?? 0) + 1);
    return `<h3>${esc(nm(g, true))}</h3>${barChart({ id: `end-${g.heat}-${g.peel}`.replace(/[^a-z0-9-]/gi, ''), counts, xMax })}`;
  });
  const killers = new Map();
  for (const r of results) {
    if (r.repeat || r.outcome !== 'dead') continue;
    const k = r.boss ? `${r.boss} (boss fight)` : `wave ${r.wave}`;
    const e = killers.get(k) ?? { n: 0, heats: new Set() };
    e.n++;
    e.heats.add(HEAT_NAME[r.opts.heat] ?? r.opts.heat);
    killers.set(k, e);
  }
  const killerRows = [...killers.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 15).map(([k, e]) => `<tr><td>${esc(k)}</td><td class="n">${e.n}</td><td>${esc([...e.heats].join(', '))}</td></tr>`);

  // toppings: how often each was owned, in runs that went furthest vs the rest
  const deep = results.filter((r) => !r.repeat && (r.outcome === 'reached' || r.wave >= median(results.filter((x) => !x.repeat).map((x) => x.wave))));
  const top = new Map();
  for (const r of deep) for (const id of Object.keys(r.owned ?? {})) top.set(id, (top.get(id) ?? 0) + 1);
  const topRows = [...top.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([id, n]) => `<tr><td>${esc(id)}</td><td class="n">${pct(n, deep.length)}</td></tr>`);

  const badRows = bad.map((r) => `<tr><td>${esc(r.outcome)}</td><td>${esc(HEAT_NAME[r.opts.heat] ?? r.opts.heat)} · ${esc(r.opts.peel)}</td><td class="n">${r.opts.seed}</td><td class="n">${r.wave}</td><td>${esc(r.stall?.screen ?? r.error ?? '')}${r.stall ? `<details><summary>details</summary><pre>${esc(JSON.stringify({ ...r.stall.detail, snapshot: r.stall.detail.snapshot ? '(saved run)' : null }, null, 1))}</pre></details>` : ''}</td></tr>`);

  const legend = (ser) => (ser.length > 1 ? `<div class="legend">${ser.map((s, i) => `<span><i style="background:var(--s${i + 1})"></i>${esc(s.name)}</span>`).join('')}</div>` : '');
  const vars = (arr) => arr.map((c, i) => `--s${i + 1}:${c};`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Feetza balance report</title>
<style>
:root{color-scheme:light;--surface:#fcfcfb;--panel:#f3f2ef;--ink:#0b0b0b;--ink2:#52514e;--muted:#8a8984;--grid:#e4e3de;--bar:#2a78d6;--warn:#b54708;${vars(SERIES_LIGHT)}}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){color-scheme:dark;--surface:#1a1a19;--panel:#232321;--ink:#f0efec;--ink2:#c3c2b7;--muted:#8f8e88;--grid:#33332f;--bar:#3987e5;--warn:#f5a35c;${vars(SERIES_DARK)}}}
:root[data-theme=dark]{color-scheme:dark;--surface:#1a1a19;--panel:#232321;--ink:#f0efec;--ink2:#c3c2b7;--muted:#8f8e88;--grid:#33332f;--bar:#3987e5;--warn:#f5a35c;${vars(SERIES_DARK)}}
body{margin:0;background:var(--surface);color:var(--ink);font:15px/1.45 system-ui,-apple-system,sans-serif}
main{max-width:860px;margin:0 auto;padding:24px 16px 60px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:32px 0 8px}h3{font-size:14px;margin:16px 0 4px;color:var(--ink2)}
p.sub{color:var(--ink2);margin:0 0 16px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:16px 0}
.tile{background:var(--panel);border-radius:10px;padding:12px}.tile b{display:block;font-size:24px}.tile span{color:var(--ink2);font-size:13px}
table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--grid);vertical-align:top}th{color:var(--ink2);font-weight:600}td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}
.warn{color:var(--warn)}.alert{border-left:4px solid var(--warn);background:var(--panel);padding:10px 12px;border-radius:6px;margin:12px 0}
.chart{width:100%;height:auto;display:block;overflow:visible}.grid{stroke:var(--grid);stroke-width:1}.tick{fill:var(--muted);font-size:11px}
.line{fill:none;stroke-width:2;stroke-linejoin:round;stroke-linecap:round}.dlabel{fill:var(--ink2);font-size:12px}
.bar{fill:var(--bar)}.hit{fill:transparent}.cross{stroke:var(--muted);stroke-width:1;opacity:0;pointer-events:none}
.legend{display:flex;flex-wrap:wrap;gap:12px;font-size:13px;color:var(--ink2);margin:4px 0 6px}.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
#tip{position:fixed;pointer-events:none;background:var(--ink);color:var(--surface);font-size:12px;padding:6px 8px;border-radius:6px;white-space:pre;opacity:0;transition:opacity .08s;z-index:9}
details pre{font-size:11px;white-space:pre-wrap;max-height:240px;overflow:auto}
.scroll{overflow-x:auto}
</style></head><body><main>
<h1>Feetza balance report</h1>
<p class="sub">${results.filter((r) => !r.repeat).length} runs to wave ${xMax} · ${esc(meta.heats.map((h) => HEAT_NAME[h] ?? h).join(', '))} · peels: ${esc(meta.peels.join(', '))} · bot accuracy ${Math.round(meta.accuracy * 100)}%${meta.bots ? ` · bots: ${esc(meta.bots.join(', '))}${meta.bots.includes('light') ? ` (light: a smack every ${meta.lightRate} ms)` : ''}` : ''} · ${esc(meta.profile)} save · ${new Date(meta.when).toLocaleString('en-GB')}</p>
<div class="tiles"><div class="tile"><b>${meta.seconds} s</b><span>real time</span></div><div class="tile"><b>${(meta.gameSeconds / 3600).toFixed(1)} h</b><span>of play simulated</span></div><div class="tile"><b>${Math.round(meta.gameSeconds / Math.max(1, meta.seconds))}×</b><span>real time, overall</span></div><div class="tile"><b class="${bad.length ? 'warn' : ''}">${bad.length}</b><span>stalled or errored</span></div></div>
${bad.length ? `<div class="alert"><b>${bad.length} run${bad.length === 1 ? '' : 's'} stalled or hit an error.</b> These are bot or game bugs, not balance: fix them before trusting the numbers. They're left out of the survival curves.</div><div class="scroll"><table><thead><tr><th>What</th><th>Run</th><th class="n">Seed</th><th class="n">Wave</th><th>Where</th></tr></thead><tbody>${badRows.join('')}</tbody></table></div>` : ''}
<h2>Summary</h2>
<div class="scroll"><table><thead><tr><th>Heat · peel</th><th class="n">Runs</th><th class="n">Reached ${xMax}</th><th class="n">Median end</th><th class="n">Deaths (middle half)</th><th class="n">Median length</th><th class="n">Stalls/errors</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>
<h2>Survival</h2><p class="sub">Share of runs still going at each wave.</p>${legend(survival)}${lineChart({ id: 'survival', series: survival, xMax, yMax: 100, yFmt: (v) => `${Math.round(v)}%`, yLabel: 'Runs still going' })}
<h2>Where runs end</h2><p class="sub">Game overs by wave.</p>${endings.join('')}
${killerRows.length ? `<h3>Most deadly</h3><div class="scroll"><table><thead><tr><th>Ended during</th><th class="n">Runs</th><th>Heats</th></tr></thead><tbody>${killerRows.join('')}</tbody></table></div>` : ''}
${hasSplit ? `<h2>Smacks vs automatic damage</h2><p class="sub">Medians over each group's runs: shares of all damage dealt, waves cleared with no smack hits, and the average momentum multiplier on automatic damage while waves were in play.${meta.momentum && Object.keys(meta.momentum).length ? ` Momentum overrides: ${esc(Object.entries(meta.momentum).map(([k, v]) => `${k}=${v}`).join(', '))}.` : ''}</p><div class="scroll"><table><thead><tr><th>Heat · peel · bot</th><th class="n">Smacks</th><th class="n">Automatic</th><th class="n">Slam</th><th class="n">Other</th><th class="n">No-smack waves</th><th class="n">Momentum</th></tr></thead><tbody>${dmgRows.join('')}</tbody></table></div>
<h3>Automatic share of smack + automatic damage, by wave</h3>${legend(autoShare)}${lineChart({ id: 'autoshare', series: autoShare, xMax, yMax: 100, yFmt: (v) => `${Math.round(v)}%`, yLabel: 'Automatic share', height: 220 })}` : ''}
<h2>Tips in hand</h2><p class="sub">Average tips after each wave's clear bonus, before shopping, over the runs that cleared it.</p>${legend(coins)}${lineChart({ id: 'coins', series: coins, xMax, yMax: nice(maxOf(coins)), yFmt: (v) => String(Math.round(v)), yLabel: 'Tips' })}
<h2>Slices on the table</h2><p class="sub">Average slices left across all pizzas at the end of each wave.</p>${legend(slices)}${lineChart({ id: 'slices', series: slices, xMax, yMax: nice(maxOf(slices)), yFmt: (v) => String(Math.round(v)), yLabel: 'Slices' })}
<h2>Slices lost per wave</h2>${legend(lost)}${lineChart({ id: 'lost', series: lost, xMax, yMax: nice(maxOf(lost)), yFmt: (v) => v.toFixed(v < 10 ? 1 : 0), yLabel: 'Slices lost', height: 200 })}
${topRows.length ? `<h2>Toppings in the deepest runs</h2><p class="sub">How often each topping was owned in the runs that went furthest (the top half).</p><div class="scroll"><table><thead><tr><th>Topping</th><th class="n">Owned in</th></tr></thead><tbody>${topRows.join('')}</tbody></table></div>` : ''}
</main><div id="tip"></div>
<script>
const tip=document.getElementById('tip');
document.querySelectorAll('.chart').forEach(svg=>{const cross=svg.querySelector('.cross');
 svg.addEventListener('pointermove',e=>{const h=e.target.closest('.hit');if(!h){tip.style.opacity=0;if(cross)cross.style.opacity=0;return;}
  tip.textContent=h.dataset.tip;tip.style.opacity=1;const x=Math.min(innerWidth-tip.offsetWidth-8,e.clientX+14);tip.style.left=x+'px';tip.style.top=(e.clientY+14)+'px';
  if(cross&&h.dataset.x){cross.setAttribute('x1',h.dataset.x);cross.setAttribute('x2',h.dataset.x);cross.style.opacity=.6;}});
 svg.addEventListener('pointerleave',()=>{tip.style.opacity=0;if(cross)cross.style.opacity=0;});});
</script></body></html>`;
  const file = join(dir, 'report.html');
  writeFileSync(file, html);
  return file;
}

// on its own: rebuild a report from a results folder
if (process.argv[1] && import.meta.filename === process.argv[1]) {
  const dir = process.argv[2];
  const data = JSON.parse(readFileSync(join(dir, 'results.json'), 'utf8'));
  console.log(writeReport(dir, data.meta, data.results));
}
