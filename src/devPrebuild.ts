// Dev-only: the art prebuild's page (?dev&prebuild, driven by scripts/prebuild/run.mjs). It runs the game's own
// painters, exactly as the game does, records what they make (src/game/packs.ts: packedCanvas; src/game/artCache.ts:
// writeArt) and packs it into atlases, which it posts to the runner's endpoint as PNGs (the runner encodes them as
// lossless WebP). See docs/prebuild.md.
//
// - every backdrop: its still (Animated stages off), then its live layer run through every wave of its stage with a
//   few stomps (its live base, baked pieces, shade and frame sheets), each backdrop in atlases of its own;
// - every foot's still art, every pizza, the sprites; every peel's Peel Locker thumbnail and the art it's drawn from.
//
// ?dev&prebuild=check instead compares packed art with the painters' (scripts/prebuild/run.mjs --check).

import Phaser from 'phaser';
import PACK_VERSION from 'virtual:pack-version';
import { BACKDROPS, type BackdropId } from './art/backdrops';
import { FEET, FOOT_BY_ID, type FootType } from './data/feet';
import { PIZZAS } from './data/pizzas';
import { BOSS_MINION, STAGES } from './data/stages';
import { BackdropView } from './game/BackdropView';
import { setArtRecorder } from './game/artCache';
import { ensureBackdrop, ensureFootArt, ensurePizzaArt, generateAll, setGame } from './game/assets';
import { releaseLive } from './game/liveBackdrop';
import { type PackEntry, type PackInfo, type PackManifest, countRandom, setPackRecorder } from './game/packs';
import { PEELS, peelThumbAsync } from './game/peels';
import { overrideBackdropAnim } from './systems/graphics';

const FORMAT = 1;
/** Atlas sizes: a backdrop's (its full-screen layers, 2 × 3 of them) and everything else's. */
const BIG = 4096;
const SMALL = 2048;

interface Item {
  key: string;
  canvases: HTMLCanvasElement[];
  data?: unknown;
  b?: string;
  m?: 's' | 'l';
}

const state = { state: 'starting', step: '', log: [] as string[], skipped: [] as string[], random: [] as string[], unscoped: [] as string[], error: '' };
const say = (s: string) => {
  state.step = s;
  state.log.push(s);
  console.log(`[prebuild] ${s}`);
};
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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
/** A cache-backed key's pack and section (things wanted together share atlases). */
function cachePlace(key: string): [string, string] | null {
  const kind = key.slice(0, key.indexOf(':') < 0 ? key.length : key.indexOf(':'));
  if (key === 'sprites') return ['shared', 'sprites'];
  if (kind === 'foot') {
    const f = FOOT_BY_ID[key.slice(5)];
    return [f ? footPack(f) : 'shared', 'feet'];
  }
  if (kind === 'pizza') return ['shared', 'pizzas'];
  if (kind === 'thumb') return ['peels', 'thumbs'];
  if (kind === 'bg') return ['act1', 'bgcache'];
  // the art peel thumbnails are drawn from (foot crops, rotted feet, place windows, pizza boards) is large and only
  // drawn again for a peel's full-size art: it's made from the packed feet and places when wanted (stage 2)
  return null;
}

// ——— atlases ———

const packs: Record<string, PackInfo> = {};
const packOf = (name: string): PackInfo => (packs[name] ??= { atlases: [], entries: {} });

async function post(path: string, body: Blob | string): Promise<{ file: string; bytes: number }> {
  const r = await fetch(path, { method: 'POST', body });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

/** Shelf-pack items into atlases of at most max × max (an image wider or taller gets one of its own), draw and post
 * them, and enter their frames in the pack. */
async function packItems(pack: string, section: string, items: Item[], max: number, lossy = false): Promise<void> {
  if (!items.length) return;
  const p = packOf(pack);
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
  for (const s of sheets) {
    const index = p.atlases.length;
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
    const name = `${pack}-${section}-${index}`;
    const got = await post(`/__prebuild/atlas?name=${encodeURIComponent(name)}${lossy ? '&lossy=1' : ''}`, png);
    p.atlases.push({ file: got.file, w: s.w, h: s.h, bytes: got.bytes, ...(lossy ? { lossy: true } : {}) });
  }
  items.forEach((it, ii) => {
    const e: PackEntry = { f: it.canvases.map((_, ci) => frames.get(`${ii}/${ci}`)!) };
    if (it.data !== undefined && it.data !== null) e.d = it.data;
    if (it.b) {
      e.b = it.b;
      e.m = it.m;
    }
    p.entries[it.key] = e;
  });
}

/** Is every pixel of a canvas opaque? (a large one: the full-screen layers) */
function isOpaque(c: HTMLCanvasElement): boolean {
  if (c.width * c.height < 512 * 512) return false;
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] !== 255) return false;
  return true;
}

// ——— the harvest ———

class Harvest extends Phaser.Scene {
  constructor() {
    super('Harvest');
  }
}

export async function runPrebuild(): Promise<void> {
  (window as unknown as { __prebuild: typeof state }).__prebuild = state;
  try {
    if (new URLSearchParams(location.search).get('prebuild') === 'check') await check();
    else await harvest();
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

async function harvest(): Promise<void> {
  // art painted with any randomness (cosmetic or Math.random) is left out of the packs: it's meant to vary
  const rnd = Math.random;
  Math.random = () => (countRandom(), rnd());
  const sc = await boot();
  /** Backdrop textures recorded for the backdrop being harvested. */
  let scope: { b: BackdropId; m: 's' | 'l'; items: Item[] } | null = null;
  const seen = new Set<string>();
  setPackRecorder((key, c, random) => {
    if (seen.has(key)) return;
    seen.add(key);
    if (!scope) return void state.unscoped.push(key);
    if (random) return void state.random.push(key);
    if (c.width < 1 || c.height < 1) return void state.skipped.push(key);
    scope.items.push({ key, canvases: [c], b: scope.b, m: scope.m });
  });
  const cached = new Map<string, Item>();
  setArtRecorder((key, canvases, data) => {
    if (cached.has(key)) return;
    if (canvases.some((c) => c.width < 1 || c.height < 1)) return void state.skipped.push(key);
    cached.set(key, { key, canvases: [...canvases], data: data === undefined ? null : JSON.parse(JSON.stringify(data)) });
  });

  // the sprites and the title's backdrop, as boot makes them
  const t0 = performance.now();
  overrideBackdropAnim(true);
  scope = { b: 'trattoria', m: 'l', items: [] };
  await generateAll(sc, () => {}, [], []);
  const firstItems = scope.items;
  scope = null;
  const baseline = new Set(sc.textures.getTextureKeys());

  // every backdrop: still, then live through its waves
  const ids = Object.keys(BACKDROPS) as BackdropId[];
  const order = [...ids].sort((a, b) => backdropPack(a).localeCompare(backdropPack(b), 'en', { numeric: true }));
  for (const [n, id] of order.entries()) {
    const tb = performance.now();
    const items: Item[] = id === 'trattoria' ? [...firstItems] : [];
    scope = { b: id, m: 's', items };
    overrideBackdropAnim(false);
    ensureBackdrop(sc, id);
    scope.m = 'l';
    overrideBackdropAnim(true);
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
    } catch (e) {
      say(`${id}: live layer failed (${String(e)})`);
    }
    view.destroy();
    bg.destroy();
    amb.destroy();
    scope = null;
    // the still and the live layer's textures in atlases of their own (only one of them is ever shown); the opaque
    // full-screen layers as lossy WebP (a seventh of the size, within a level or two of the painted pixels), the
    // rest lossless
    const pk = backdropPack(id);
    const live = items.filter((it) => it.m === 'l');
    const opaque = live.filter((it) => isOpaque(it.canvases[0]));
    await packItems(pk, `${id}-still`, items.filter((it) => it.m === 's'), BIG, true);
    await packItems(pk, `${id}-live`, opaque, BIG, true);
    await packItems(pk, `${id}-parts`, live.filter((it) => !opaque.includes(it)), BIG);
    releaseLive(sc, id);
    for (const k of sc.textures.getTextureKeys()) if (!baseline.has(k) || k === `bg_${id}` || k.startsWith(`bgk_${id}_`)) sc.textures.remove(k);
    say(`backdrop ${n + 1}/${order.length} ${id}: ${items.length} textures, ${Math.round(performance.now() - tb)} ms`);
    // (a breath between backdrops: the machine may be in use)
    await sleep(30);
  }
  overrideBackdropAnim(null);

  // every foot and pizza
  let tf = performance.now();
  for (const f of FEET) {
    try {
      ensureFootArt(null, f.id);
    } catch (e) {
      say(`foot ${f.id} failed: ${String(e)}`);
    }
    if (performance.now() - tf > 40) {
      await frame();
      tf = performance.now();
    }
  }
  for (const p of PIZZAS) ensurePizzaArt(p.id);
  say(`feet and pizzas: ${FEET.length} + ${PIZZAS.length}`);

  // every peel's locker thumbnail (and the crops, rotted feet, windows and boards it's drawn from)
  for (const [i, d] of PEELS.entries()) {
    try {
      await peelThumbAsync(d.id);
    } catch (e) {
      say(`peel ${d.id} failed: ${String(e)}`);
    }
    if (i % 50 === 49) say(`peels ${i + 1}/${PEELS.length}`);
  }
  say(`art painted in ${Math.round((performance.now() - t0) / 1000)} s; packing ${cached.size} cached pieces`);

  // cache-backed art, by pack and section
  const groups = new Map<string, Item[]>();
  for (const it of cached.values()) {
    const place = cachePlace(it.key);
    if (!place) continue;
    const [pack, section] = place;
    const g = `${pack}\0${section}`;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(it);
  }
  for (const [g, items] of groups) {
    const [pack, section] = g.split('\0');
    await packItems(pack, section, items, SMALL);
    say(`packed ${pack}/${section}: ${items.length}`);
  }

  const manifest: PackManifest = { format: FORMAT, v: PACK_VERSION, packs };
  await post('/__prebuild/manifest', JSON.stringify(manifest));
  say(`done: ${Object.keys(packs).length} packs, ${Object.values(packs).reduce((n, p) => n + Object.keys(p.entries).length, 0)} entries; left out: ${state.random.length} random, ${state.unscoped.length} unscoped, ${state.skipped.length} empty`);
}

// ——— the check: packed art against the painters ———

/** Paint a sample of the packed keys again (no packs, no cache) and compare with the pack, pixel by pixel. */
async function check(): Promise<void> {
  const q = new URLSearchParams(location.search);
  const n = Number(q.get('sample')) || 40;
  const sc = await boot();
  const m = (await (await fetch('packs/manifest.json', { cache: 'no-cache' })).json()) as PackManifest;
  if (m.v !== PACK_VERSION) throw new Error(`packs are for ${m.v}, the source is ${PACK_VERSION}: run the prebuild`);
  const all = Object.entries(m.packs).flatMap(([name, p]) => Object.entries(p.entries).map(([key, e]) => ({ name, key, e })));
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
  setArtRecorder((key, cs) => painted.set(key, cs));
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
          else {
            const bg = sc.add.container(0, 0);
            const amb = sc.add.container(0, 0);
            const view = new BackdropView(sc, bg, amb);
            view.show(e.b as BackdropId, 0, 1);
            for (let w = 1; w <= 5; w++) {
              view.setWave(w);
              for (let i = 0; i < 12; i++) {
                view.update(1 / 20);
                if (i === 4) view.impact(960, 760, 1);
              }
            }
            view.destroy();
            bg.destroy();
            amb.destroy();
          }
          releaseLive(sc, e.b as BackdropId);
          for (const k of sc.textures.getTextureKeys()) if (k === `bg_${e.b}` || k.startsWith(`bgk_${e.b}_`)) sc.textures.remove(k);
        } else if (key.startsWith('foot:')) ensureFootArt(null, key.slice(5));
        else if (key.startsWith('pizza:')) ensurePizzaArt(key.slice(6));
        else if (key.startsWith('thumb:')) await peelThumbAsync(key.slice(key.indexOf(':', 6) + 1).replace(/@\d+$/, ''));
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
  (state as unknown as { results: unknown }).results = results;
  say(`checked ${results.length}: ${results.filter((x) => x.ok).length} match`);
}
