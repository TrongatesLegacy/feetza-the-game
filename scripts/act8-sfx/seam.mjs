// Refine a music loop's end point by waveform correlation (node + ffmpeg, no packages).
// usage: node seam.mjs IN.mp3 t0 t1 [searchSec=1.5]
// Correlates 3 s of audio from t0 with 3 s from t1+lag (8 kHz mono, 60 Hz–3 kHz) for every lag in
// ±searchSec, and prints the best end point and its normalised correlation (≈0.9+ = the same bars repeat).
import { execFileSync } from 'node:child_process';
const [inp, t0s, t1s, ss = '1.5'] = process.argv.slice(2);
const SR = 8000;
const buf = execFileSync('/opt/homebrew/bin/ffmpeg', ['-v', 'error', '-i', inp, '-af', 'highpass=f=60,lowpass=f=3000', '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
const x = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
const t0 = Number(t0s), t1 = Number(t1s), S = Number(ss);
const W = 3 * SR;
const a0 = Math.round(t0 * SR);
let ea = 0;
for (let i = 0; i < W; i++) ea += x[a0 + i] ** 2;
let best = [-2, 0];
const R = Math.round(S * SR);
for (let lag = -R; lag <= R; lag++) {
  const b0 = Math.round(t1 * SR) + lag;
  if (b0 < 0 || b0 + W > x.length) continue;
  let num = 0, eb = 0;
  for (let i = 0; i < W; i++) {
    const b = x[b0 + i];
    num += x[a0 + i] * b;
    eb += b * b;
  }
  const c = num / Math.sqrt(ea * eb || 1);
  if (c > best[0]) best = [c, lag];
}
console.log(JSON.stringify({ t0, t1: +(t1 + best[1] / SR).toFixed(4), shiftMs: Math.round((best[1] / SR) * 1000), corr: +best[0].toFixed(3), period: +(t1 + best[1] / SR - t0).toFixed(3) }));
