#!/usr/bin/env node
// Freesound helper: search for CC0 / CC-BY sounds and download their high-quality previews, with the credits we
// need. The API key lives in .env.local (git-ignored) as FREESOUND_API_KEY=... (get one free at
// https://freesound.org/apiv2/apply after signing in).
//
//   node scripts/sfx-fetch/freesound.mjs search "war chant crowd" [--max 12] [--min 0.5] [--maxdur 8]
//   node scripts/sfx-fetch/freesound.mjs info <id> [<id> ...]   (description, tags, format)
//   node scripts/sfx-fetch/freesound.mjs get <id> [<id> ...] --out DIR
//
// search prints matches (id, name, author, licence, duration, downloads, rating, page). get downloads each sound's
// HQ preview (192 kbps ogg, or 128 kbps mp3) into DIR as <id>-<slug>.ogg plus a credits.json beside it (title,
// author, licence, page URL), ready to edit with ffmpeg and credit in public/audio/CREDITS.md and credits.json.
// Only CC0 and CC-BY sounds are ever returned (no NonCommercial, no Sampling+).
//
// (Downloading a sound's original file needs Freesound's OAuth2 login; the previews need only the key.)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
function key() {
  if (process.env.FREESOUND_API_KEY) return process.env.FREESOUND_API_KEY;
  const f = join(ROOT, '.env.local');
  if (existsSync(f)) {
    const m = readFileSync(f, 'utf8').match(/^\s*FREESOUND_API_KEY\s*=\s*"?([^"\s#]+)"?/m);
    if (m && !m[1].startsWith('paste')) return m[1];
  }
  console.error('No Freesound API key: put FREESOUND_API_KEY=... in .env.local (see https://freesound.org/apiv2/apply).');
  process.exit(2);
}

const API = 'https://freesound.org/apiv2';
const LICENCE = '(license:"Creative Commons 0" OR license:"Attribution")';
const FIELDS = 'id,name,username,license,duration,num_downloads,avg_rating,url,previews,tags';

async function call(path, params = {}) {
  const u = new URL(API + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  u.searchParams.set('token', key());
  for (let tries = 0; ; tries++) {
    const r = await fetch(u);
    // the API allows 60 requests a minute: wait and try again rather than fail half way through a batch
    if (r.status === 429 && tries < 6) {
      await new Promise((ok) => setTimeout(ok, 10000));
      continue;
    }
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    return r.json();
  }
}

const licName = (l) => (/zero|publicdomain/.test(l) ? 'CC0 1.0' : /by\/4/.test(l) ? 'CC BY 4.0' : /by\/3/.test(l) ? 'CC BY 3.0' : l);
const slug = (s) => s.toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i < 0 ? d : argv[i + 1];
};
const cmd = argv[0];

if (cmd === 'search') {
  const q = argv[1];
  const min = Number(opt('min', 0.2));
  const maxdur = Number(opt('maxdur', 12));
  const res = await call('/search/text/', { query: q, filter: `${LICENCE} duration:[${min} TO ${maxdur}]`, fields: FIELDS, page_size: Number(opt('max', 12)), sort: opt('sort', 'score') });
  for (const s of res.results) console.log(`${s.id}\t${s.duration.toFixed(1)}s\t${licName(s.license)}\t↓${s.num_downloads}\t★${(s.avg_rating ?? 0).toFixed(1)}\t${s.username}\t${s.name}`);
  console.log(`(${res.count} matches)`);
} else if (cmd === 'info') {
  // what a sound is before you fetch it: its description, tags and how it was recorded
  for (const id of argv.slice(1)) {
    const s = await call(`/sounds/${id}/`, { fields: `${FIELDS},description,samplerate,channels,type` });
    const desc = (s.description ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    console.log(`${s.id}\t${s.name}\t${s.username}\t${licName(s.license)}\t${s.duration.toFixed(2)}s\t${s.type} ${s.samplerate} Hz ${s.channels}ch\t↓${s.num_downloads}\t★${(s.avg_rating ?? 0).toFixed(1)}`);
    console.log(`  tags: ${(s.tags ?? []).join(' ')}`);
    console.log(`  ${desc.slice(0, 400)}`);
  }
} else if (cmd === 'get') {
  const out = resolve(opt('out', '.'));
  mkdirSync(out, { recursive: true });
  const ids = argv.slice(1).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--out');
  const credits = existsSync(join(out, 'credits.json')) ? JSON.parse(readFileSync(join(out, 'credits.json'), 'utf8')) : [];
  for (const id of ids) {
    const s = await call(`/sounds/${id}/`, { fields: FIELDS });
    if (!/zero|publicdomain|\/by\//.test(s.license) || /-nc|nc-|sampling/.test(s.license)) {
      console.log(`skip ${id}: licence ${s.license}`);
      continue;
    }
    const src = s.previews['preview-hq-ogg'] ?? s.previews['preview-hq-mp3'];
    const ext = src.endsWith('.mp3') ? 'mp3' : 'ogg';
    const file = `${s.id}-${slug(s.name)}.${ext}`;
    const r = await fetch(src);
    writeFileSync(join(out, file), Buffer.from(await r.arrayBuffer()));
    credits.push({ file, id: s.id, title: s.name, author: s.username, license: licName(s.license), url: s.url, duration: s.duration });
    console.log(`got ${file} (${licName(s.license)}, ${s.username})`);
  }
  writeFileSync(join(out, 'credits.json'), JSON.stringify(credits, null, 2));
} else {
  console.log('usage: freesound.mjs search "<query>" [--max N] [--min s] [--maxdur s] | get <id> ... --out DIR');
}
