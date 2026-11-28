// Generates the procedural textures and registers them with Phaser.
//
// Boot draws only what the title screen needs: the sprites, the demo foot and the first backdrop. Every other foot
// and every pizza is drawn ahead of need in idle time (warmFootArt: the title screen, the shop and the gaps between
// waves), or on the spot by whatever asks for it first (ensureFootArt / ensurePizzaArt; reading footMeta or pizzaTops
// does it too, so nothing ever finds art missing). The art cache (src/game/artCache.ts) keeps what was drawn, so the
// next visit decodes it off the main thread instead of drawing it again.

import Phaser from 'phaser';
import '../content/art';
import '../content/style';
import '../content/styleLive';
import { drawBackdrop, type BackdropId } from '../art/backdrops';
import { ART_RES, drawFoot, footPortrait, type FootTextures } from '../art/feetArt';
import { drawPizzaTop, drawSliceSprite, pizzaPortrait } from '../art/pizzaArt';
import { buildEventSprites } from '../art/eventArt';
import { buildSprites } from '../art/sprites';
import { legacyArt } from '../art/style/registry';
import { scrollingNow } from '../art/scrolling';
import { FOOT_BY_ID } from '../data/feet';
import { PIZZA_BY_ID } from '../data/pizzas';
import { bitmapCanvas, cachedArt, openArtCache, readArt, writeArt } from './artCache';
import { initPacks, packedCanvas, prefetchPack } from './packs';
import { prepareLive, preparePacked } from './liveBackdrop';

export interface FootMeta {
  footKey: string;
  legKey: string;
  cuffKey?: string;
  originY: number;
  footHeight: number;
  halfWidth: number;
  legWidth: number;
  textures: FootTextures;
}

const drawnFeet: Record<string, FootMeta> = {};
const drawnTops: Record<string, HTMLCanvasElement> = {};

/** Every foot's textures and metrics. Reading a foot that isn't drawn yet draws it there and then (ensureFootArt). */
export const footMeta: Record<string, FootMeta> = new Proxy(drawnFeet, {
  get(t, k, r) {
    if (typeof k === 'string' && !Object.hasOwn(t, k) && Object.hasOwn(FOOT_BY_ID, k)) ensureFootArt(null, k);
    return Reflect.get(t, k, r);
  },
});
/** Every pizza's top (its slice sprite is the texture slice_<id>). Reading one not drawn yet draws it (ensurePizzaArt). */
export const pizzaTops: Record<string, HTMLCanvasElement> = new Proxy(drawnTops, {
  get(t, k, r) {
    if (typeof k === 'string' && !Object.hasOwn(t, k) && Object.hasOwn(PIZZA_BY_ID, k)) ensurePizzaArt(k);
    return Reflect.get(t, k, r);
  },
});
/** Event sprites (balloon, drone, …) kept for DOM art such as peel emblems. */
export const eventCanvases: Record<string, HTMLCanvasElement> = {};
const portraitCache = new Map<string, string>();

export { ART_RES };

export function addCanvas(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

/** Feet in the dev legacy mode (?legacyFeet) are drawn every time: never saved to the cache or read from it. */
const cacheable = (): boolean => !legacyArt();
/** Is this piece of art to be had from the cache? */
const inCache = (k: string): boolean => (cacheable() || !k.startsWith('foot:')) && cachedArt(k);

/** Dev: art drawn on the spot because nothing warmed it first (in play, each one a frame's hitch). */
const syncDraws: { key: string; ms: number; t: number }[] = [];

// ——— feet ———

function metaOf(id: string, t: FootTextures): FootMeta {
  return {
    footKey: `foot_${id}`,
    legKey: `leg_${id}`,
    cuffKey: t.cuff ? `cuff_${id}` : undefined,
    originY: t.originY,
    footHeight: t.footHeight,
    halfWidth: t.footHalfWidth,
    legWidth: t.legWidth,
    textures: t,
  };
}

/** A foot's canvas as a plain texture: addCanvas makes a CanvasTexture, which reads every pixel back as it's made
 * (getImageData, a GPU readback: 10–30 ms a foot, most of a cold Peel Locker's hitches). Nothing reads a foot
 * texture's pixels through Phaser or redraws it (code that needs them reads the source canvas). */
function addFootTex(tm: Phaser.Textures.TextureManager, key: string, c: HTMLCanvasElement): void {
  if (!tm.exists(key)) tm.addImage(key, c as unknown as HTMLImageElement);
}

function registerFoot(tm: Phaser.Textures.TextureManager | undefined, m: FootMeta): void {
  if (!tm) return;
  const t = m.textures;
  addFootTex(tm, m.footKey, t.foot);
  addFootTex(tm, m.legKey, t.leg);
  if (m.cuffKey && t.cuff) addFootTex(tm, m.cuffKey, t.cuff);
}

/** What a foot's cache entry keeps besides its images. */
type FootData = Omit<FootTextures, 'foot' | 'leg' | 'cuff'> & { cuff: boolean };

function drawFootNow(id: string): void {
  const t = drawFoot(FOOT_BY_ID[id]);
  const m = metaOf(id, t);
  drawnFeet[id] = m;
  registerFoot(gameRef?.textures, m);
  if (cacheable()) {
    const data: FootData = { res: t.res, legEnd: t.legEnd, cuffTop: t.cuffTop, originY: t.originY, footHeight: t.footHeight, footHalfWidth: t.footHalfWidth, legWidth: t.legWidth, cuff: !!t.cuff };
    // (its pixels read back in idle time, never in the frame that drew it: a foot drawn on the spot is a busy frame
    // already, in play or in the Peel Locker)
    writeArt(`foot:${id}`, t.cuff ? [t.foot, t.leg, t.cuff] : [t.foot, t.leg], data, true);
  }
}

function footFromCache(id: string, bitmaps: ImageBitmap[], data: unknown): boolean {
  const d = data as FootData | null;
  if (!d || typeof d.originY !== 'number' || typeof d.res !== 'number' || bitmaps.length !== (d.cuff ? 3 : 2)) return false;
  const [foot, leg, cuff] = bitmaps.map(bitmapCanvas);
  const t: FootTextures = { res: d.res, legEnd: d.legEnd, cuffTop: d.cuffTop, originY: d.originY, footHeight: d.footHeight, footHalfWidth: d.footHalfWidth, legWidth: d.legWidth, foot, leg, cuff };
  const m = metaOf(id, t);
  drawnFeet[id] = m;
  registerFoot(gameRef?.textures, m);
  return true;
}

/**
 * A foot's textures and metrics, drawn now if they aren't yet, and registered with the game's texture manager (and
 * the scene's, when it's another game's: a dev page). Undefined only for an id that isn't a foot.
 */
export function ensureFootArt(scene: Phaser.Scene | null, id: string): FootMeta | undefined {
  if (!drawnFeet[id]) {
    if (!Object.hasOwn(FOOT_BY_ID, id)) return undefined;
    syncDraw(`foot:${id}`, () => drawFootNow(id));
  }
  const m = drawnFeet[id];
  if (scene?.textures) registerFoot(scene.textures, m);
  return m;
}

/** Has this foot been drawn (or loaded from the cache)? */
export function footArtReady(id: string): boolean {
  return Object.hasOwn(drawnFeet, id);
}

// ——— pizzas ———

function drawPizzaNow(id: string): void {
  const p = PIZZA_BY_ID[id];
  const top = drawPizzaTop(p);
  const slice = drawSliceSprite(p, top);
  drawnTops[id] = top;
  if (gameRef && !gameRef.textures.exists(`slice_${id}`)) gameRef.textures.addCanvas(`slice_${id}`, slice);
  writeArt(`pizza:${id}`, [top, slice], null, true);
}

function pizzaFromCache(id: string, bitmaps: ImageBitmap[]): boolean {
  if (bitmaps.length !== 2 || !gameRef) return false;
  const [top, slice] = bitmaps.map(bitmapCanvas);
  drawnTops[id] = top;
  if (!gameRef.textures.exists(`slice_${id}`)) gameRef.textures.addCanvas(`slice_${id}`, slice);
  return true;
}

/** A pizza's top (and its slice texture), drawn now if they aren't yet. */
export function ensurePizzaArt(id: string): HTMLCanvasElement | undefined {
  if (!drawnTops[id]) {
    if (!Object.hasOwn(PIZZA_BY_ID, id)) return undefined;
    syncDraw(`pizza:${id}`, () => drawPizzaNow(id));
  }
  return drawnTops[id];
}

// ——— drawing ahead of need, in idle time ———

/** A piece of art the warmer draws or loads: 'foot:<id>' or 'pizza:<id>' (also its cache key). */
type ArtKey = string;

function artDrawn(k: ArtKey): boolean {
  const id = k.slice(k.indexOf(':') + 1);
  return k.startsWith('foot:') ? Object.hasOwn(drawnFeet, id) : Object.hasOwn(drawnTops, id);
}

function drawArt(k: ArtKey): void {
  const id = k.slice(k.indexOf(':') + 1);
  if (k.startsWith('foot:')) drawFootNow(id);
  else drawPizzaNow(id);
}

function syncDraw(k: ArtKey, draw: () => void): void {
  const t0 = performance.now();
  draw();
  if (import.meta.env.DEV) syncDraws.push({ key: k, ms: Math.round(performance.now() - t0), t: Math.round(t0) });
}

/** Art being read from the cache. */
const loading = new Map<ArtKey, Promise<boolean>>();

/** Load a piece of art from the cache (decoded off the main thread); false if it isn't there or can't be read. */
function loadArt(k: ArtKey, ms?: number): Promise<boolean> {
  if (artDrawn(k)) return Promise.resolve(true);
  if (!inCache(k)) return Promise.resolve(false);
  let p = loading.get(k);
  if (p) return p;
  p = readArt(k, ms)
    .then((r) => {
      if (!r) return false;
      // drawn on the spot while it loaded?
      let ok = artDrawn(k);
      if (!ok) {
        const id = k.slice(k.indexOf(':') + 1);
        ok = k.startsWith('foot:') ? footFromCache(id, r.bitmaps, r.data) : pizzaFromCache(id, r.bitmaps);
      }
      for (const b of r.bitmaps) b.close();
      return ok;
    })
    .catch(() => false)
    .finally(() => loading.delete(k));
  loading.set(k, p);
  return p;
}

/** Art wanted soon (a wave's pool), then everything else, in the order it turns up in a run. */
const soonQ: ArtKey[] = [];
const laterQ: ArtKey[] = [];
let pumping = false;
/** When the warmer last drew something (starved for long, it draws anyway out of play). */
let lastArtStep = 0;
let busyNow: () => boolean = () => false;
/** Loads from the cache in flight at once. */
const LOADS = 4;

/** Tell the art warmer when play is busy (a wave running): it then only draws the art wanted soon, and only in idle
 * time a frame has to spare (cached art still loads: decoding is off the main thread). */
export function setArtWarmBusy(fn: () => boolean): void {
  busyNow = fn;
}

function queueSoon(keys: ArtKey[]): void {
  const fresh = [...new Set(keys)].filter((k) => !artDrawn(k));
  if (!fresh.length) return;
  const set = new Set(fresh);
  for (let i = soonQ.length - 1; i >= 0; i--) if (set.has(soonQ[i])) soonQ.splice(i, 1);
  soonQ.unshift(...fresh);
  pumpArt();
}

/** Draw (or load from the cache) these feet in idle time before they're needed, ahead of anything already queued. */
export function warmFootArt(ids: Iterable<string>): void {
  queueSoon([...ids].filter((id) => Object.hasOwn(FOOT_BY_ID, id)).map((id) => `foot:${id}`));
}

/** The same for pizzas (a run's lineup). */
export function warmPizzaArt(ids: Iterable<string>): void {
  queueSoon([...ids].filter((id) => Object.hasOwn(PIZZA_BY_ID, id)).map((id) => `pizza:${id}`));
}

/** Queue art to make in idle time behind anything wanted sooner (boot queues the first stage's feet and the
 * unlocked pizzas once the title is up). Every other foot is made when something first asks for it. */
export function warmLaterArt(feet: Iterable<string>, pizzas: Iterable<string>): void {
  const keys = [...[...feet].filter((id) => Object.hasOwn(FOOT_BY_ID, id)).map((id) => `foot:${id}`), ...[...pizzas].filter((id) => Object.hasOwn(PIZZA_BY_ID, id)).map((id) => `pizza:${id}`)];
  laterQ.push(...keys.filter((k) => !artDrawn(k) && !laterQ.includes(k)));
  pumpArt();
}

/** A foot's art, from the cache when it has it (decoded off the main thread), drawn otherwise: for DOM pages that
 * can wait a moment (the Pizzapedia, the Peel Locker) rather than stall a frame. */
export async function footArtAsync(id: string): Promise<void> {
  if (!Object.hasOwn(FOOT_BY_ID, id) || drawnFeet[id]) return;
  if (inCache(`foot:${id}`) && (await loadArt(`foot:${id}`))) return;
  ensureFootArt(null, id);
}

// ——— letting art go ———

/** Every texture key a game object of any running scene shows (images, sprites, tile sprites, inside containers). */
export function texturesInUse(game: Phaser.Game | null = gameRef): Set<string> {
  const out = new Set<string>();
  const walk = (list: Phaser.GameObjects.GameObject[]) => {
    for (const o of list) {
      const key = (o as Partial<Phaser.GameObjects.Image>).texture?.key;
      if (key) out.add(key);
      // (a tile sprite draws its displayTexture: its own texture is a scratch canvas)
      const shown = (o as { displayTexture?: Phaser.Textures.Texture }).displayTexture?.key;
      if (shown) out.add(shown);
      const kids = (o as Partial<Phaser.GameObjects.Container>).list;
      if (Array.isArray(kids)) walk(kids);
    }
  };
  for (const sc of game?.scene.scenes ?? []) if (sc.sys.displayList) walk(sc.sys.displayList.list);
  return out;
}

/**
 * Drop the still art (textures and canvases) of drawn feet not in `keep` that nothing on screen shows. They come
 * back through ensureFootArt / warmFootArt (from the cache: a decode, not a redraw). Returns the ids let go.
 */
export function evictFootArt(keep: Set<string>, inUse: Set<string> = texturesInUse()): string[] {
  const out: string[] = [];
  for (const id of Object.keys(drawnFeet)) {
    if (keep.has(id) || !Object.hasOwn(FOOT_BY_ID, id)) continue;
    const m = drawnFeet[id];
    const keys = [m.footKey, m.legKey, m.cuffKey].filter((k): k is string => !!k);
    if (keys.some((k) => inUse.has(k))) continue;
    for (const k of keys) if (gameRef?.textures.exists(k)) gameRef.textures.remove(k);
    delete drawnFeet[id];
    out.push(id);
  }
  // and the warmer forgets feet it was asked for earlier that this stage won't use (it would only draw them again)
  const wanted = (k: ArtKey) => !k.startsWith('foot:') || keep.has(k.slice(5));
  for (const q of [soonQ, laterQ]) q.splice(0, q.length, ...q.filter(wanted));
  return out;
}

/** Dev: texture memory (width × height × 4 of each source) by key prefix, in MB. */
export function textureMemory(game: Phaser.Game | null = gameRef): Record<string, number> {
  const out: Record<string, number> = {};
  if (!game) return out;
  for (const key of game.textures.getTextureKeys()) {
    let bytes = 0;
    for (const s of game.textures.get(key).source) bytes += (s.width || 0) * (s.height || 0) * 4;
    const m = /^(lk|still_glow|zb|foot|leg|cuff|slice|bg|p|ev|trait)_/.exec(key);
    const k = m ? m[1] : 'other';
    out[k] = (out[k] ?? 0) + bytes / 1048576;
    out.total = (out.total ?? 0) + bytes / 1048576;
  }
  for (const k of Object.keys(out)) out[k] = Math.round(out[k]);
  return out;
}

/** Dev: art still waiting to be drawn or loaded. */
export function artPending(): number {
  return new Set([...soonQ, ...laterQ].filter((k) => !artDrawn(k))).size + loading.size;
}

// (the warmer holds back while the player scrolls a page, the Peel Locker's grid: src/art/scrolling.ts)
const idleArt = (fn: (d?: IdleDeadline) => void): void => {
  const go = (d?: IdleDeadline) => (scrollingNow() ? setTimeout(() => idleArt(fn), 120) : fn(d));
  if (typeof requestIdleCallback === 'function') requestIdleCallback(go, { timeout: 500 });
  else setTimeout(() => go(), 40);
};

/** The balance sim (?sim) draws no art in idle time: how much a page had drawn before a seeded run began depended
 *  on real time (a background tab gets few idle slots), and a run that met a foot not yet drawn played out
 *  differently. In the sim every piece is drawn when it's first wanted, at the same moment of every run. */
const NO_WARMER = typeof location !== 'undefined' && new URLSearchParams(location.search).has('sim');

function pumpArt(): void {
  if (pumping || NO_WARMER) return;
  pumping = true;
  idleArt(artStep);
}

function artStep(d?: IdleDeadline): void {
  const t0 = performance.now();
  let drew = false;
  for (;;) {
    while (soonQ.length && artDrawn(soonQ[0])) soonQ.shift();
    while (laterQ.length && artDrawn(laterQ[0])) laterQ.shift();
    const q = soonQ.length ? soonQ : laterQ;
    const k = q[0];
    if (!k) break;
    if (loading.has(k)) {
      q.shift();
      continue;
    }
    if (inCache(k)) {
      if (loading.size >= LOADS) break;
      q.shift();
      // art the cache can't give back is drawn instead
      void loadArt(k).then((ok) => {
        if (!ok && !artDrawn(k)) {
          (q === soonQ ? soonQ : laterQ).unshift(k);
          pumpArt();
        }
      });
      continue;
    }
    // a foot costs tens of ms to draw, a pizza about ten: draw while the slot has room (always one when forced). In
    // play only the art wanted soon, in a frame's spare time. Out of play also when the idle wait ran out, there are
    // no idle callbacks (Safari), or the queue has been starved for 250 ms (a page drawing a smooth 60 fps only
    // hands out idle slots of a few ms, before the timeout)
    const busy = busyNow();
    const room = d ? d.timeRemaining() : 0;
    const forced = !drew && !busy && (!d || d.didTimeout || performance.now() - lastArtStep > 250);
    const spare = room > 8 && (q === soonQ || !busy) && performance.now() - t0 < 12;
    if (!forced && !spare) break;
    q.shift();
    try {
      drawArt(k);
    } catch (e) {
      if (import.meta.env.DEV) console.error('[assets] drawing', k, e);
    }
    drew = true;
    lastArtStep = performance.now();
    if (!d) break;
  }
  if (soonQ.length || laterQ.length || loading.size) idleArt(artStep);
  else pumping = false;
}

// ——— boot ———

function installSprites(scene: Phaser.Scene, sprites: Record<string, HTMLCanvasElement>, events: Record<string, HTMLCanvasElement>): void {
  for (const [k, c] of Object.entries(sprites)) addCanvas(scene, k, c);
  for (const [k, c] of Object.entries(events)) {
    addCanvas(scene, k, c);
    eventCanvases[k] = c;
  }
}

async function spritesFromCache(scene: Phaser.Scene): Promise<boolean> {
  const r = await readArt('sprites');
  if (!r) return false;
  const d = r.data as { sprites: string[]; events: string[] } | null;
  if (!d || !Array.isArray(d.sprites) || !Array.isArray(d.events) || d.sprites.length + d.events.length !== r.bitmaps.length) {
    for (const b of r.bitmaps) b.close();
    return false;
  }
  const cs = r.bitmaps.map(bitmapCanvas);
  for (const b of r.bitmaps) b.close();
  installSprites(scene, Object.fromEntries(d.sprites.map((k, i) => [k, cs[i]])), Object.fromEntries(d.events.map((k, i) => [k, cs[d.sprites.length + i]])));
  return true;
}

function drawSprites(scene: Phaser.Scene): void {
  const sprites = buildSprites();
  const events = buildEventSprites();
  installSprites(scene, sprites, events);
  writeArt('sprites', [...Object.values(sprites), ...Object.values(events)], { sprites: Object.keys(sprites), events: Object.keys(events) });
}

async function backdropFromCache(scene: Phaser.Scene, id: BackdropId): Promise<boolean> {
  const r = await readArt(`bg:${id}`);
  if (!r) return false;
  const ok = r.bitmaps.length === 1;
  if (ok) addCanvas(scene, backdropKey(id), bitmapCanvas(r.bitmaps[0]));
  for (const b of r.bitmaps) b.close();
  return ok;
}

let booted = false;
/** Has boot built the title screen's art? */
export function artBooted(): boolean {
  return booted;
}

/**
 * Build what the title screen needs, in small async chunks so the loading bar can animate: from the art cache when
 * it has them (read in parallel, each read raced against a timeout), drawn otherwise. `feet` and `pizzas` are made
 * now too (the menu's demo foot, the menu's pizzas); everything else comes later (warmLaterArt, warmFootArt).
 */
export async function generateAll(scene: Phaser.Scene, progress: (p: number, label: string) => void, feet: string[] = [], pizzas: string[] = []): Promise<void> {
  const t0 = performance.now();
  // the art cache, and the pre-built packs' manifest (then the title's backdrop decoded from its pack)
  const [, packed] = await Promise.all([openArtCache(), initPacks()]);
  if (packed) await preparePacked(scene, 'trattoria', 4000);
  const timing: [string, number][] = [];
  // with Animated stages on the room is shown live (its live base and moving parts: src/game/liveBackdrop.ts), not
  // the still
  const liveBg = prepareLive(scene, 'trattoria');
  // the cache first, all at once (decoding runs off the main thread)
  const [spritesHit, bgHit] = await Promise.all([spritesFromCache(scene), liveBg || backdropFromCache(scene, 'trattoria'), ...feet.map((id) => loadArt(`foot:${id}`, 2500)), ...pizzas.map((id) => loadArt(`pizza:${id}`, 2500))]);
  timing.push(['cache', Math.round(performance.now() - t0)]);
  const jobs: [string, () => void][] = [];
  if (!spritesHit) jobs.push(['Polishing plates', () => drawSprites(scene)]);
  for (const id of pizzas) if (!drawnTops[id] && PIZZA_BY_ID[id]) jobs.push([`Baking ${PIZZA_BY_ID[id].name}`, () => drawPizzaNow(id)]);
  for (const id of feet) if (!drawnFeet[id] && FOOT_BY_ID[id]) jobs.push([`Washing ${FOOT_BY_ID[id].name}`, () => drawFootNow(id)]);
  if (!bgHit)
    jobs.push([
      'Lighting the oven',
      () => {
        const key = ensureBackdrop(scene, 'trattoria');
        writeArt('bg:trattoria', [scene.textures.get(key).getSourceImage() as HTMLCanvasElement], null);
      },
    ]);
  let last = performance.now();
  for (let i = 0; i < jobs.length; i++) {
    const [label, fn] = jobs[i];
    const tj = performance.now();
    fn();
    timing.push([label, Math.round(performance.now() - tj)]);
    if (performance.now() - last > 30) {
      progress((i + 1) / jobs.length, label);
      await new Promise((r) => setTimeout(r, 0));
      last = performance.now();
    }
  }
  progress(1, 'Ready!');
  booted = true;
  // the Peel Locker's thumbnails, quietly (the rest of the shared pack comes an atlas at a time, as it's asked for)
  if (packed) setTimeout(() => void prefetchPack('peels', true), 3000);
  // how long the art took to build (load-time budget checks), and in dev each job's share
  const ms = Math.round(performance.now() - t0);
  performance.mark('feetza:art', { detail: ms });
  if (import.meta.env.DEV) Object.assign(window, { __assetMs: ms, __assetJobs: timing, __artSync: syncDraws });
}

export function backdropKey(id: BackdropId): string {
  return `bg_${id}`;
}

export function ensureBackdrop(scene: Phaser.Scene, id: BackdropId): string {
  const key = backdropKey(id);
  if (!scene.textures.exists(key)) addCanvas(scene, key, packedCanvas(key, () => drawBackdrop(id)));
  return key;
}

export function footPortraitURL(id: string): string {
  const k = `foot:${id}`;
  let url = portraitCache.get(k);
  if (!url) {
    const f = FOOT_BY_ID[id];
    url = footPortrait(f, ensureFootArt(null, id)!.textures, 220);
    portraitCache.set(k, url);
  }
  return url;
}

export function pizzaPortraitURL(id: string): string {
  const k = `pizza:${id}`;
  let url = portraitCache.get(k);
  if (!url) {
    url = pizzaPortrait(PIZZA_BY_ID[id], pizzaTops[id], 200);
    portraitCache.set(k, url);
  }
  return url;
}

/** Portrait showing how many slices are left: eaten slices are missing from the drawing. */
export function pizzaStateURL(id: string, slices: number, max: number, size = 200): string {
  const k = `pizza:${id}:${slices}/${max}:${size}`;
  let url = portraitCache.get(k);
  if (!url) {
    const alive = Array.from({ length: Math.max(1, max) }, (_, i) => i < slices);
    url = pizzaPortrait(PIZZA_BY_ID[id], pizzaTops[id], size, alive);
    portraitCache.set(k, url);
  }
  return url;
}

let gameRef: Phaser.Game | null = null;
export function setGame(g: Phaser.Game): void {
  gameRef = g;
}

/** A registered texture (or one drawn on demand by `lazy`), trimmed to what's drawn and fitted into a w × h
 *  canvas, for DOM cards (phase cards). Null when there's no such texture. */
export function textureCanvas(key: string, w: number, h: number, lazy?: () => HTMLCanvasElement, tint?: number): HTMLCanvasElement | null {
  let src: CanvasImageSource | null = null;
  let sx = 0;
  let sy = 0;
  let sw = 0;
  let sh = 0;
  if (gameRef?.textures.exists(key)) {
    const tex = gameRef.textures.get(key);
    const fr = tex.get();
    src = tex.getSourceImage() as CanvasImageSource;
    [sx, sy, sw, sh] = [fr.cutX, fr.cutY, fr.cutWidth, fr.cutHeight];
  } else if (lazy) {
    const c = lazy();
    src = c;
    [sw, sh] = [c.width, c.height];
  }
  if (!src || sw < 1 || sh < 1) return null;
  // trim the empty margin: find what's drawn on a small copy
  const k = Math.min(1, 256 / Math.max(sw, sh));
  const tw = Math.max(1, Math.round(sw * k));
  const th = Math.max(1, Math.round(sh * k));
  const tmp = document.createElement('canvas');
  tmp.width = tw;
  tmp.height = th;
  const tc = tmp.getContext('2d', { willReadFrequently: true })!;
  tc.drawImage(src, sx, sy, sw, sh, 0, 0, tw, th);
  const px = tc.getImageData(0, 0, tw, th).data;
  let [x0, y0, x1, y1] = [tw, th, -1, -1];
  for (let y = 0; y < th; y++)
    for (let x = 0; x < tw; x++)
      if (px[(y * tw + x) * 4 + 3] > 10) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 >= x0 && y1 >= y0) {
    const nx = sx + Math.max(0, x0 - 1) / k;
    const ny = sy + Math.max(0, y0 - 1) / k;
    sw = Math.min(sx + sw, sx + (x1 + 2) / k) - nx;
    sh = Math.min(sy + sh, sy + (y1 + 2) / k) - ny;
    sx = nx;
    sy = ny;
  }
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d')!;
  const f = Math.min(w / sw, h / sh);
  const dw = sw * f;
  const dh = sh * f;
  const at = [sx, sy, sw, sh, (w - dw) / 2, (h - dh) / 2, dw, dh] as const;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, ...at);
  if (tint !== undefined) {
    // multiply the drawing by the tint, as Phaser's setTint does, keeping its alpha
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `#${tint.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(src, ...at);
    ctx.globalCompositeOperation = 'source-over';
  }
  return out;
}

/** A registered canvas texture as a data URL (for DOM menus such as the Pizzapedia). */
export function textureURL(key: string): string {
  const k = `tex:${key}`;
  let url = portraitCache.get(k);
  if (!url && gameRef?.textures.exists(key)) {
    const src = gameRef.textures.get(key).getSourceImage() as HTMLCanvasElement;
    url = src.toDataURL('image/png');
    portraitCache.set(k, url);
  }
  return url ?? '';
}
