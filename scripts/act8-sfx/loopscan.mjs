// Find a music loop by rhythm: autocorrelation of a detrended loudness envelope (node + ffmpeg, no packages).
// usage: node loopscan.mjs IN.mp3 minSec maxSec [from=0.06] [to=0.92]
// Envelope: 10 ms RMS (60 Hz–6 kHz) in dB, minus its 0.6 s moving average, so beats and accents remain.
// The loop length is the lag (minSec…maxSec) whose envelope correlation over the allowed region is highest
// (the music's repeat); the start is where a 6 s window either side of the seam correlates best at that lag.
// Prints t0/t1 for loopfind.py --t0 --t1, the global correlation and the seam's local correlation.
import { execFileSync } from 'node:child_process';
const [inp, mn, mx, fr = '0.06', to = '0.92'] = process.argv.slice(2);
const SR = 8000, HOP = 80, FPS = SR / HOP;
const buf = execFileSync('/opt/homebrew/bin/ffmpeg', ['-v', 'error', '-i', inp, '-af', 'highpass=f=60,lowpass=f=6000', '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
const x = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
const n = Math.floor(x.length / HOP) - 1;
const e = new Float64Array(n);
for (let i = 0; i < n; i++) {
  let s = 0;
  for (let j = 0; j < HOP; j++) s += x[i * HOP + j] ** 2;
  e[i] = 10 * Math.log10(s / HOP + 1e-9);
}
const M = Math.round(0.6 * FPS);
const d = new Float64Array(n);
let acc = 0;
for (let i = 0; i < n; i++) {
  acc += e[i];
  if (i >= M) acc -= e[i - M];
  const avg = acc / Math.min(i + 1, M);
  d[i] = e[Math.max(0, i - (M >> 1))] - avg;
}
const lo = Math.floor(n * Number(fr)), hi = Math.floor(n * Number(to));
const corr = (a, b, len) => {
  let num = 0, ea = 0, eb = 0;
  for (let i = 0; i < len; i++) {
    num += d[a + i] * d[b + i];
    ea += d[a + i] ** 2;
    eb += d[b + i] ** 2;
  }
  return num / Math.sqrt(ea * eb || 1);
};
let best = [-2, 0];
for (let L = Math.round(Number(mn) * FPS); L <= Math.round(Number(mx) * FPS); L++) {
  if (lo + L >= hi) break;
  const c = corr(lo, lo + L, hi - lo - L);
  if (c > best[0]) best = [c, L];
}
const L = best[1];
const W = Math.round(6 * FPS);
let bs = [-2, 0];
for (let s = lo + W; s < hi - L - W; s++) {
  const c = corr(s - W / 2, s + L - W / 2, W);
  if (c > bs[0]) bs = [c, s];
}
const t0 = bs[1] / FPS;
// beat: the strongest short lag (0.3–1.2 s) over the same region
let bt = [-2, 0];
for (let l = Math.round(0.3 * FPS); l <= Math.round(1.2 * FPS); l++) {
  const c = corr(lo, lo + l, hi - lo - l);
  if (c > bt[0]) bt = [c, l];
}
const beat = bt[1] / FPS;
console.log(JSON.stringify({ period: L / FPS, globalCorr: +best[0].toFixed(3), t0: +t0.toFixed(3), t1: +(t0 + L / FPS).toFixed(3), seamCorr: +bs[0].toFixed(3), beat: +beat.toFixed(3), beatsInLoop: +(L / FPS / beat).toFixed(2) }));
