// Dev-only: the art prebuild's page (?dev&prebuild=…, driven by scripts/prebuild/run.mjs). It runs the game's own
// painters, exactly as the game does, records what they make (src/game/packs.ts: packedCanvas; src/game/artCache.ts:
// writeArt) and packs it into atlases, which it posts to the runner's endpoint as PNGs (the runner encodes them as
// WebP). See docs/prebuild.md.
//
// The art is split into units, each painted on a fresh page of its own (so what one unit paints can't hide what
// another depends on) and versioned on its own:
// - every backdrop: its still (Animated stages off), then its live layer run through every wave of its stage with a
//   few stomps (its live base, baked pieces, shade and frame sheets);
// - the sprites; each act's feet (the everyday feet in four buckets); the pizzas in eight buckets; the Peel Locker's
//   thumbnails, by Locker group, in chunks.
//
// - ?prebuild=plan: lists the units, and who registers what (src/game/packTrace.ts);
// - ?prebuild=unit: boots, says 'ready', and paints the unit the runner then hands it (window.__prebuildGo);
// - ?prebuild=check: compares packed art with the painters' (scripts/prebuild/run.mjs --check).

import Phaser from 'phaser';
import PACK_VERSIONS from 'virtual:pack-versions';
import { BACKDROPS, type BackdropId } from './art/backdrops';
import { FEET, type FootType } from './data/feet';
import { PIZZAS } from './data/pizzas';
import { BOSS_MINION, STAGES } from './data/stages';
import { BackdropView } from './game/BackdropView';
import { setArtRecorder } from './game/artCache';
import { ensureBackdrop, ensureFootArt, ensurePizzaArt, generateAll, setGame } from './game/assets';
import { releaseLive } from './game/liveBackdrop';
import { type PackEntry, type PackManifest, countRandom, packKey, setPackRecorder } from './game/packs';
import { beginTrace, endTrace, registrants } from './game/packTrace';
import { PEELS, peelThumbAsync } from './game/peels';
import { overrideBackdropAnim } from './systems/graphics';

/** Atlas sizes: a backdrop's (its full-screen layers, 2 × 3 of them) and everything else's (small: the art cache's
 * pieces are read a few at a time, and each read decodes its whole atlas). */
const BIG = 4096;
const SMALL = 1024;
/** Buckets for the everyday feet and the pizzas (by a hash of the id: a new one only changes its own bucket), and
 * the Locker's thumbnails per chunk (in Locker order, within a group). */
const FEET_BUCKETS = 4;
const PIZZA_BUCKETS = 8;
const THUMB_CHUNK = 32;

export interface Unit {
  id: string;
  kind: 'bg' | 'sprites' | 'feet' | 'pizzas' | 'thumbs';
  pack: string;
  members: string[];
}

interface Item {
  key: string;
  canvases: HTMLCanvasElement[];
  data?: unknown;
  b?: string;
  m?: 's' | 'l';
}

interface UnitAtlas {
  ref: string;
  w: number;
  h: number;
  lossy?: boolean;
}

const state = { state: 'starting', step: '', error: '' } as Record<string, unknown>;
const say = (s: string) => {
  state.step = s;
  console.log(`[prebuild] ${s}`);
};
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

// ——— which pack ———

const actOfStage = (i: number) => `act${Math.floor(i / 2) + 1}`;
function backdropPack(id: string): string {
  const i = STAGES.findIndex((s) => s.location === id || s.boss === id);
  return i < 0 ? 'extra' : actOfStage(i);
}
function footPack(f: FootType): string {
  if (f.boss || f.mini) {
    const i = STAGES.findIndex((s) => s.boss === f.id || s.mini === f.id);
    if (i >= 0) return actOfStage(i);
  }
  // a boss's minion goes with its boss
  const boss = Object.entries(BOSS_MINION).find(([, m]) => m === f.id)?.[0];
  if (boss) {
    const i = STAGES.findIndex((s) => s.boss === boss);
    if (i >= 0) return actOfStage(i);
  }
  if (f.home) {
    const i = STAGES.findIndex((s) => s.location === f.home);
    if (i >= 0) return actOfStage(i);
  }
  return 'shared';
}

/** Every unit, in a stable order. */
function plan(): Unit[] {
  const units: Unit[] = [];
  const ids = (Object.keys(BACKDROPS) as BackdropId[]).sort();
  for (const id of ids) units.push({ id: `bg:${id}`, kind: 'bg', pack: backdropPack(id), members: [id] });
  units.push({ id: 'sprites', kind: 'sprites', pack: 'shared', members: ['sprites'] });
  const feet = new Map<string, string[]>();
  for (const f of FEET) {
    const p = footPack(f);
    const u = p === 'shared' ? `feet:shared${hash(f.id) % FEET_BUCKETS}` : `feet:${p}`;
    if (!feet.has(u)) feet.set(u, []);
    feet.get(u)!.push(f.id);
  }
  for (const [u, m] of [...feet].sort()) units.push({ id: u, kind: 'feet', pack: u.startsWith('feet:shared') ? 'shared' : u.slice(5), members: m });
  const pz = new Map<string, string[]>();
  for (const p of PIZZAS) {
    const u = `pizzas:${hash(p.id) % PIZZA_BUCKETS}`;
    if (!pz.has(u)) pz.set(u, []);
    pz.get(u)!.push(p.id);
  }
  for (const [u, m] of [...pz].sort()) units.push({ id: u, kind: 'pizzas', pack: 'shared', members: m });
  const groups = new Map<string, string[]>();
  for (const d of PEELS) {
    if (!groups.has(d.group)) groups.set(d.group, []);
    groups.get(d.group)!.push(d.id);
  }
  for (const [g, m] of groups) for (let i = 0; i < m.length; i += THUMB_CHUNK) units.push({ id: `thumbs:${g}:${i / THUMB_CHUNK}`, kind: 'thumbs', pack: 'peels', members: m.slice(i, i + THUMB_CHUNK) });
  return units;
}

// ——— atlases ———

async function post(path: string, body: Blob | string): Promise<{ ref: string }> {
  const r = await fetch(path, { method: 'POST', body });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

/** Shelf-pack items into atlases of at most max × max (an image wider or taller gets one of its own), draw and post
 * them, and enter their frames (atlas indices within the unit). */
async function packItems(out: { atlases: UnitAtlas[]; entries: Record<string, PackEntry> }, name: string, items: Item[], max: number, lossy = false): Promise<void> {
  if (!items.length) return;
  const imgs = items.flatMap((it, ii) => it.canvases.map((c, ci) => ({ ii, ci, c, w: c.width, h: c.height })));
  // (tallest first; equal heights keep their order: the Locker's thumbnails stay in the Locker's order)
  imgs.sort((a, b) => b.h - a.h);
  interface Sheet { w: number; h: number; place: { img: (typeof imgs)[number]; x: number; y: number }[] }
  const sheets: Sheet[] = [];
  let cur: Sheet | null = null;
  let x = 0;
  let y = 0;
  let row = 0;
  for (const img of imgs) {
    if (img.w > max || img.h > max) {
      sheets.push({ w: img.w, h: img.h, place: [{ img, x: 0, y: 0 }] });
      continue;
    }
    if (!cur || x + img.w > max) {
      // a new row (or a new sheet when it won't fit below)
      if (cur && y + row + img.h <= max) {
        y += row;
        x = 0;
        row = 0;
      } else {
        cur = { w: 0, h: 0, place: [] };
        sheets.push(cur);
        x = 0;
        y = 0;
        row = 0;
      }
    }
    cur.place.push({ img, x, y });
    x += img.w;
    row = Math.max(row, img.h);
    cur.w = Math.max(cur.w, x);
    cur.h = Math.max(cur.h, y + row);
  }
  const frames = new Map<string, [number, number, number, number, number]>();
  for (const [si, s] of sheets.entries()) {
    const index = out.atlases.length;
    const c = document.createElement('canvas');
    c.width = s.w;
    c.height = s.h;
    const ctx = c.getContext('2d')!;
    for (const { img, x, y } of s.place) {
      ctx.drawImage(img.c, x, y);
      frames.set(`${img.ii}/${img.ci}`, [index, x, y, img.w, img.h]);
    }
    // the pixels as getImageData reads them, encoded from a copy (as the art cache does: a GPU canvas's own toBlob
    // rounds faint edges its own way)
    const copy = new OffscreenCanvas(s.w, s.h);
    copy.getContext('2d')!.putImageData(ctx.getImageData(0, 0, s.w, s.h), 0, 0);
    c.width = c.height = 1;
    const png = await copy.convertToBlob({ type: 'image/png' });
    const got = await post(`/__prebuild/atlas?name=${encodeURIComponent(`${name}-${si}`)}`, png);
    out.atlases.push({ ref: got.ref, w: s.w, h: s.h, ...(lossy ? { lossy: true } : {}) });
  }
  items.forEach((it, ii) => {
    const e: PackEntry = { f: it.canvases.map((_, ci) => frames.get(`${ii}/${ci}`)!) };
    if (it.data !== undefined && it.data !== null) e.d = it.data;
    if (it.b) {
      e.b = it.b;
      e.m = it.m;
    }
    out.entries[it.key] = e;
  });
}

/** Is every pixel of a canvas opaque? (a large one: the full-screen layers) */
function isOpaque(c: HTMLCanvasElement): boolean {
  if (c.width * c.height < 512 * 512) return false;
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] !== 255) return false;
  return true;
}

// ——— the page ———

class Harvest extends Phaser.Scene {
  constructor() {
    super('Harvest');
  }
}

export async function runPrebuild(): Promise<void> {
  (window as unknown as { __prebuild: typeof state }).__prebuild = state;
  try {
    const mode = new URLSearchParams(location.search).get('prebuild');
    if (mode === 'check') await check();
    else if (mode === 'plan') {
      state.units = plan();
      state.registrants = Object.fromEntries([...registrants].map(([k, v]) => [k, [...v].sort()]));
    } else await unitPage();
    state.state = 'done';
  } catch (e) {
    state.error = String((e as Error)?.stack ?? e);
    state.state = 'error';
    console.error('[prebuild]', e);
  }
}

async function boot(): Promise<Phaser.Scene> {
  await Promise.all([document.fonts.load('40px "Lilita One"'), document.fonts.load('400 20px "Fredoka"'), document.fonts.load('600 20px "Fredoka"'), document.fonts.load('700 20px "Fredoka"')]);
  const game = await new Promise<Phaser.Game>((res) => {
    const g = new Phaser.Game({ type: Phaser.WEBGL, parent: 'game', width: 1920, height: 1080, backgroundColor: '#000', audio: { noAudio: true }, scene: [], banner: false });
    g.events.once(Phaser.Core.Events.READY, () => res(g));
  });
  setGame(game);
  game.scene.add('Harvest', Harvest, true);
  await frame();
  return game.scene.getScene('Harvest')!;
}

/** Run a backdrop's live layer through every wave of its stage, with a stomp in each. */
async function runLive(sc: Phaser.Scene, id: BackdropId): Promise<void> {
  const bg = sc.add.container(0, 0);
  const amb = sc.add.container(0, 0);
  const view = new BackdropView(sc, bg, amb);
  try {
    view.show(id, 0, 1);
    for (let w = 1; w <= 5; w++) {
      view.setWave(w);
      for (let i = 0; i < 12; i++) {
        view.update(1 / 20);
        if (i === 4) view.impact(960, 760, 1);
      }
      await frame();
    }
  } finally {
    view.destroy();
    bg.destroy();
    amb.destroy();
  }
}

/** Boot, wait for the runner to start its coverage and hand over a unit, paint it, pack it. */
async function unitPage(): Promise<void> {
  // art painted with any randomness (cosmetic or Math.random) is left out of the packs: it's meant to vary
  const rnd = Math.random;
  Math.random = () => (countRandom(), rnd());
  const sc = await boot();
  state.state = 'ready';
  const w = window as unknown as { __prebuildGo?: Unit };
  while (!w.__prebuildGo) await sleep(20);
  const u = w.__prebuildGo;
  state.state = 'running';
  const t0 = performance.now();
  beginTrace();

  /** Backdrop textures recorded (bg units), with the keys painted with randomness and every key seen. */
  let scope: { b: BackdropId; m: 's' | 'l' } | null = null;
  const items: Item[] = [];
  const seen = new Set<string>();
  const random: string[] = [];
  setPackRecorder((key, c, isRandom) => {
    if (seen.has(key) || !scope) return;
    seen.add(key);
    if (isRandom) return void random.push(key);
    if (c.width < 1 || c.height < 1) return;
    items.push({ key, canvases: [c], b: scope.b, m: scope.m });
  });
  const cached = new Map<string, Item>();
  setArtRecorder((key, canvases, data) => {
    if (cached.has(key) || canvases.some((c) => c.width < 1 || c.height < 1)) return;
    cached.set(key, { key, canvases: [...canvases], data: data === undefined ? null : JSON.parse(JSON.stringify(data)) });
  });
  const out = { atlases: [] as UnitAtlas[], entries: {} as Record<string, PackEntry> };
  const name = (s: string) => `${u.pack}-${s}`;

  if (u.kind === 'bg') {
    const id = u.members[0] as BackdropId;
    // the title's backdrop is first made by boot, as the game does
    if (id === 'trattoria') {
      overrideBackdropAnim(true);
      scope = { b: id, m: 'l' };
      await generateAll(sc, () => {}, [], []);
    }
    scope = { b: id, m: 's' };
    overrideBackdropAnim(false);
    ensureBackdrop(sc, id);
    scope = { b: id, m: 'l' };
    overrideBackdropAnim(true);
    try {
      await runLive(sc, id);
    } catch (e) {
      say(`${id}: live layer failed (${String(e)})`);
    }
    scope = null;
    overrideBackdropAnim(null);
    // the still and the live layer's textures in atlases of their own (only one of them is ever shown); the opaque
    // full-screen layers as lossy WebP (a seventh of the size, within a level or two of the painted pixels), the
    // rest lossless
    const live = items.filter((it) => it.m === 'l');
    const opaque = live.filter((it) => isOpaque(it.canvases[0]));
    await packItems(out, name(`${id}-still`), items.filter((it) => it.m === 's'), BIG, true);
    await packItems(out, name(`${id}-live`), opaque, BIG, true);
    await packItems(out, name(`${id}-parts`), live.filter((it) => !opaque.includes(it)), BIG);
    releaseLive(sc, id);
  } else {
    let tf = performance.now();
    const breathe = async () => {
      if (performance.now() - tf > 40) {
        await frame();
        tf = performance.now();
      }
    };
    let keep: (key: string) => string | null;
    if (u.kind === 'sprites') {
      overrideBackdropAnim(true);
      await generateAll(sc, () => {}, [], []);
      overrideBackdropAnim(null);
      keep = (k) => (k === 'sprites' ? k : null);
    } else if (u.kind === 'feet') {
      for (const id of u.members) {
        try {
          ensureFootArt(null, id);
        } catch (e) {
          say(`foot ${id} failed: ${String(e)}`);
        }
        await breathe();
      }
      const want = new Set(u.members.map((id) => `foot:${id}`));
      keep = (k) => (want.has(k) ? k : null);
    } else if (u.kind === 'pizzas') {
      for (const id of u.members) {
        ensurePizzaArt(id);
        await breathe();
      }
      const want = new Set(u.members.map((id) => `pizza:${id}`));
      keep = (k) => (want.has(k) ? k : null);
    } else {
      // the Locker's thumbnails (and the crops, rotted feet, windows and boards they're drawn from, which aren't
      // packed: they're made from the packed feet and places when a peel's full-size art is wanted)
      for (const id of u.members) {
        try {
          await peelThumbAsync(id);
        } catch (e) {
          say(`peel ${id} failed: ${String(e)}`);
        }
      }
      const want = new Set(u.members.map((id) => `thumb:${id}@180`));
      keep = (k) => (k.startsWith('thumb:') && want.has(packKey(k)) ? packKey(k) : null);
    }
    const list: Item[] = [];
    for (const it of cached.values()) {
      const k = keep(it.key);
      if (k) list.push({ ...it, key: k });
    }
    // (the Locker's order, as the peels were painted)
    await packItems(out, name(u.id.replace(/^[a-z]+:/, '').replace(/[^a-z0-9]+/gi, '-') || u.kind), list, SMALL);
  }
  const trace = endTrace();
  state.result = { ...out, keys: [...seen], random, regs: trace.regs, data: trace.data, ms: Math.round(performance.now() - t0) };
}

// ——— the check: packed art against the painters ———

/** Paint a sample of the packed keys again (no packs, no cache) and compare with the pack, pixel by pixel. */
async function check(): Promise<void> {
  const q = new URLSearchParams(location.search);
  const n = Number(q.get('sample')) || 40;
  const sc = await boot();
  const m = (await (await fetch('packs/manifest.json', { cache: 'no-cache' })).json()) as PackManifest;
  // (only entries whose unit is current: a stale one is painted by the game, not served)
  const fresh = (e: PackEntry) => !!e.u && m.units[e.u] === (PACK_VERSIONS as Record<string, string>)[e.u];
  const all = Object.entries(m.packs).flatMap(([name, p]) => Object.entries(p.entries).filter(([, e]) => fresh(e)).map(([key, e]) => ({ name, key, e })));
  if (!all.length) throw new Error('no current packs: run npm run prebuild first');
  // a spread: some of each kind, then at random (seeded: the same sample each time)
  let s = 12345;
  const r = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  const kinds = new Map<string, typeof all>();
  for (const x of all) {
    const k = x.e.b ? `bg-${x.e.m}` : x.key.split(':')[0];
    if (!kinds.has(k)) kinds.set(k, []);
    kinds.get(k)!.push(x);
  }
  const pick = new Set<(typeof all)[number]>();
  for (const l of kinds.values()) for (let i = 0; i < 3 && i < l.length; i++) pick.add(l[Math.floor(r() * l.length)]);
  while (pick.size < Math.min(n, all.length)) pick.add(all[Math.floor(r() * all.length)]);

  const atlasCache = new Map<string, ImageBitmap>();
  const atlas = async (name: string, i: number) => {
    const id = `${name}/${i}`;
    if (!atlasCache.has(id)) {
      const b = await (await fetch(`packs/${m.packs[name].atlases[i].file}`)).blob();
      atlasCache.set(id, await createImageBitmap(b, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }));
    }
    return atlasCache.get(id)!;
  };
  const pixels = (src: CanvasImageSource, w: number, h: number) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true })!;
    x.drawImage(src, 0, 0);
    return x.getImageData(0, 0, w, h).data;
  };
  // painted again: the cache-backed art through the art cache's own painters (recorded), the backdrop textures
  // through theirs
  const painted = new Map<string, HTMLCanvasElement[]>();
  setArtRecorder((key, cs) => painted.set(packKey(key), cs));
  setPackRecorder((key, c) => painted.set(key, [c]));
  const results: { key: string; ok: boolean; max: number; diff: number; px: number; note?: string }[] = [];
  overrideBackdropAnim(true);
  await generateAll(sc, () => {}, [], []);
  for (const x of pick) {
    const { key, e, name } = x;
    try {
      if (!painted.has(key)) {
        if (e.b) {
          overrideBackdropAnim(e.m === 'l');
          if (e.m === 's') ensureBackdrop(sc, e.b as BackdropId);
          else await runLive(sc, e.b as BackdropId);
          releaseLive(sc, e.b as BackdropId);
          for (const k of sc.textures.getTextureKeys()) if (k === `bg_${e.b}` || k.startsWith(`bgk_${e.b}_`)) sc.textures.remove(k);
        } else if (key.startsWith('foot:')) ensureFootArt(null, key.slice(5));
        else if (key.startsWith('pizza:')) ensurePizzaArt(key.slice(6));
        else if (key.startsWith('thumb:')) await peelThumbAsync(key.slice(6).replace(/@\d+$/, ''));
      }
      const got = painted.get(key);
      if (!got) {
        results.push({ key, ok: false, max: -1, diff: 0, px: 0, note: 'not painted again by the check' });
        continue;
      }
      let max = 0;
      let diff = 0;
      let px = 0;
      let se = 0;
      const lossy = e.f.some((f) => m.packs[name].atlases[f[0]].lossy);
      for (const [i, f] of e.f.entries()) {
        const [ai, fx, fy, w, h] = f;
        const c = got[i];
        if (!c || c.width !== w || c.height !== h) throw new Error(`size ${c?.width}×${c?.height} ≠ ${w}×${h}`);
        const bm = await createImageBitmap(await atlas(name, ai), fx, fy, w, h, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
        const a = pixels(bm, w, h);
        bm.close();
        const b = pixels(c, w, h);
        px += w * h;
        for (let j = 0; j < a.length; j++) {
          // (colour compared as shown: premultiplied by its alpha. Where a pixel is nearly transparent, its straight
          // colour is only stored to a few levels, and a level of rounding there reads as a big jump)
          const al = j % 4 === 3 ? 255 : Math.max(a[j - (j % 4) + 3], b[j - (j % 4) + 3]);
          const d = Math.round((Math.abs(a[j] - b[j]) * al) / 255);
          if (d) {
            diff++;
            se += d * d;
            if (d > max) max = d;
          }
        }
      }
      // lossless: within 1/255 everywhere (as shown); lossy (opaque backdrop layers): a PSNR of 38 dB or better
      const psnr = se ? 10 * Math.log10((255 * 255) / (se / (px * 4))) : 99;
      results.push({ key, ok: lossy ? psnr >= 38 : max <= 1, max, diff, px, note: lossy ? `lossy, PSNR ${psnr.toFixed(1)} dB` : undefined });
    } catch (err) {
      results.push({ key, ok: false, max: -1, diff: 0, px: 0, note: String(err) });
    }
    await frame();
  }
  state.results = results;
  say(`checked ${results.length}: ${results.filter((x) => x.ok).length} match`);
}
