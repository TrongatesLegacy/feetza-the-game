// Act 10 · Finale runtime layers (the painted backdrops are in src/content/art/scenes-act10.ts):
// - a real glitch pass (a WebGL post pipeline: torn slices, RGB split, scanlines, dead blocks) used by
//   the memory-lane flicker, the echo feet and the finale's big moments
// - memory lane: in the Oven Between Worlds each wave shows a different earlier stage through a glitch warp
// - the First Pizzeria's wall of peels (every peel the player owns, drawn from their thumbnails) and its dawn
// - the Sole Proprietor's buyout of the next shop
// - the ending: the table becomes the First Pizzeria's, every foot fought marches past waving with the
//   credits, then the Pizza Legend title and Endless+

import Phaser from 'phaser';
import type { BackdropId, LocationId } from '../art/backdrops';
import { BACKDROPS } from '../art/backdrops';
import { makeCanvas, rgba } from '../art/util';
import { FIN } from '../content/art/scenes-act10';
import { FOOT_BY_ID, type FootType } from '../data/feet';
import { STAGES } from '../data/stages';
import { save, persist } from '../systems/save';
import { audio, bossSfx } from '../systems/audio';
import { ui } from '../ui/ui';
import { addCanvas, ensureBackdrop, footMeta } from './assets';
import type { Foot } from './Foot';
import { PEEL_BY_ID, hasPeel, peelCanvas } from './peels';
import { PEEL_H, PEEL_W } from '../art/peelArt';
import { isBossWave, locationFor, waveInStage } from './Run';

const W = 1920;
const H = 1080;

// ——— The glitch pass ———

const FRAG = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform float uTime;
uniform float uAmount;
varying vec2 outTexCoord;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec2 uv = outTexCoord;
  float a = uAmount;
  float tick = floor(uTime * 14.0);
  // torn slices: bands of rows jump sideways
  float row = floor(uv.y * 28.0);
  float j = hash(vec2(row, tick));
  if (j > 1.0 - 0.45 * a) uv.x += (hash(vec2(row, tick + 3.0)) - 0.5) * 0.14 * a;
  // RGB split
  float sp = 0.014 * a;
  vec4 c = texture2D(uMainSampler, uv);
  vec4 cr = texture2D(uMainSampler, uv + vec2(sp, 0.0));
  vec4 cb = texture2D(uMainSampler, uv - vec2(sp, 0.0));
  vec4 col = vec4(cr.r, c.g, cb.b, max(c.a, max(cr.a, cb.a)));
  // scanlines
  col.rgb *= 1.0 - 0.16 * a * step(0.5, fract(uv.y * 220.0));
  // dead blocks
  vec2 blk = floor(uv * vec2(36.0, 20.0));
  float n = hash(blk + tick);
  if (n > 1.0 - 0.05 * a && col.a > 0.0) col.rgb = mix(col.rgb, vec3(hash(blk), hash(blk + 1.0), hash(blk + 2.0)) * col.a, 0.7);
  gl_FragColor = col;
}`;

export class GlitchFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  amount = 0;
  constructor(game: Phaser.Game) {
    super({ game, name: 'FeetzaGlitch', fragShader: FRAG });
  }
  onPreRender(): void {
    this.set1f('uTime', this.game.loop.time / 1000);
    this.set1f('uAmount', this.amount);
  }
}

function webgl(sc: Phaser.Scene): Phaser.Renderer.WebGL.WebGLRenderer | null {
  return sc.renderer.type === Phaser.WEBGL ? (sc.renderer as Phaser.Renderer.WebGL.WebGLRenderer) : null;
}

/** Register the glitch pass once per game (WebGL only). */
function ensureGlitch(sc: Phaser.Scene): boolean {
  const r = webgl(sc);
  if (!r) return false;
  if (!r.pipelines.getPostPipeline('FeetzaGlitch')) r.pipelines.addPostPipeline('FeetzaGlitch', GlitchFX);
  return true;
}

type Piped = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.PostPipeline;

/** Put the glitch pass on an object (or the camera) and return it, so its amount can be driven. */
export function glitchOn(sc: Phaser.Scene, o: Piped | Phaser.Cameras.Scene2D.Camera): GlitchFX | null {
  if (!ensureGlitch(sc) || save.settings.reducedMotion) return null;
  let p = o.getPostPipeline('FeetzaGlitch') as GlitchFX | GlitchFX[] | undefined;
  if (Array.isArray(p)) p = p[0];
  if (!p) {
    o.setPostPipeline('FeetzaGlitch');
    p = o.getPostPipeline('FeetzaGlitch') as GlitchFX;
    if (Array.isArray(p)) p = p[0];
  }
  return (p as GlitchFX) ?? null;
}

/** A short burst of glitch over the whole screen (warps, big boss moments). */
export function screenGlitch(sc: Phaser.Scene, ms = 600, peak = 1): void {
  const cam = sc.cameras.main;
  const p = glitchOn(sc, cam);
  if (!p) return;
  sc.tweens.killTweensOf(p);
  p.amount = peak;
  sc.tweens.add({
    targets: p,
    amount: 0,
    duration: ms,
    ease: 'Quad.In',
    onComplete: () => {
      if (p.amount <= 0.001) cam.removePostPipeline('FeetzaGlitch');
    },
  });
}

// ——— Shared state ———

/** The Sole Proprietor bought out the next shop: its prices are doubled (taken once by the shop). */
export const finaleState = { buyout: false };

/** The scene's own parts this module reaches into (all private on GameScene). */
interface SceneBits {
  feet: Foot[];
  backdrop: { bgA: Phaser.GameObjects.Image; glowLayer: Phaser.GameObjects.Container };
  peelId: string;
}

const bits = (sc: Phaser.Scene) => sc as unknown as SceneBits;

/** Earlier stages, in journey order, for memory lane (no stand-ins, nothing from the finale). */
function memories(): LocationId[] {
  const end = STAGES.findIndex((s) => s.location === 'oven');
  const out: LocationId[] = [];
  for (const s of STAGES.slice(0, end < 0 ? STAGES.length : end)) if (!s.dev && !out.includes(s.location)) out.push(s.location);
  return out;
}

/** The cosmic frame over a memory: void and stars at the edges, the memory clear in the middle. */
function memFrame(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(W, H);
  const g = ctx.createRadialGradient(W / 2, 520, 360, W / 2, 520, 1150);
  g.addColorStop(0, 'rgba(10,4,24,0)');
  g.addColorStop(0.55, 'rgba(18,8,40,0.55)');
  g.addColorStop(1, 'rgba(8,2,18,0.95)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  let s = 77;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 260; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    if (Math.hypot(x - W / 2, (y - 520) * 1.5) < 620) continue;
    ctx.fillStyle = rgba('#ffffff', 0.4 + rnd() * 0.6);
    ctx.fillRect(x, y, 2, 2);
  }
  // nebula fringes in the finale's colours
  for (const [x, y, col] of [[120, 160, '#ff4fd8'], [1800, 200, '#36e0ff'], [140, 900, '#b06bff'], [1780, 880, '#ff9a3a']] as [number, number, string][]) {
    const n = ctx.createRadialGradient(x, y, 10, x, y, 420);
    n.addColorStop(0, rgba(col, 0.35));
    n.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = n;
    ctx.fillRect(0, 0, W, H);
  }
  return c;
}

/** The dawn creeping up the First Pizzeria's sky, wave by wave. */
function dawnGlow(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(W, 780);
  const g = ctx.createLinearGradient(0, 0, 0, 780);
  g.addColorStop(0, 'rgba(90,120,220,0)');
  g.addColorStop(0.45, 'rgba(140,120,220,0.25)');
  g.addColorStop(0.75, 'rgba(255,150,100,0.75)');
  g.addColorStop(1, 'rgba(255,210,140,0.9)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 780);
  return c;
}

/** Peels for the wall: the equipped one first, then bosses, acts, places, feet and the rest. */
function wallPeels(equipped: string): string[] {
  const order = ['boss', 'act', 'place', 'jewel', 'golden', 'master', 'foot', 'pizza', 'event', 'shinyFoot', 'shinyEvent', 'classic'];
  const ids = ['classic', ...save.peels].filter((id, i, a) => a.indexOf(id) === i && PEEL_BY_ID[id] && hasPeel(id));
  ids.sort((a, b) => order.indexOf(PEEL_BY_ID[a].group) - order.indexOf(PEEL_BY_ID[b].group));
  return [equipped, ...ids.filter((id) => id !== equipped)];
}

/** A small texture of a peel, for the wall and the Last Slice montage. */
export function peelThumbKey(sc: Phaser.Scene, id: string, h: number): string {
  const key = `fin_peel_${id}_${h}`;
  if (sc.textures.exists(key)) return key;
  const big = peelCanvas(id);
  const w = Math.round((PEEL_W * h) / PEEL_H);
  const [c, ctx] = makeCanvas(w, h);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(big, 0, 0, w, h);
  addCanvas(sc, key, c);
  return key;
}

export interface WallPeel {
  id: string;
  img: Phaser.GameObjects.Image;
}

const live = new WeakMap<Phaser.Scene, Finale>();

/** The finale layers of a running game scene. */
export function finaleOf(sc: Phaser.Scene): Finale | undefined {
  return live.get(sc);
}

export class Finale {
  private sc: Phaser.Scene;
  private bg: Phaser.GameObjects.Container | null = null;
  // memory lane
  private memImg: Phaser.GameObjects.Image | null = null;
  private memFrameImg: Phaser.GameObjects.Image | null = null;
  private memFx: GlitchFX | null = null;
  private memNow: LocationId | null = null;
  private memAlpha = 0;
  private flickerT = 4;
  private flickerOut = 0;
  // the First Pizzeria
  private dawn: Phaser.GameObjects.Image | null = null;
  private wall: Phaser.GameObjects.Container | null = null;
  private wallQueue: { id: string; x: number; y: number; h: number }[] = [];
  readonly wallImgs: WallPeel[] = [];
  private wallFor = '';
  // echoes
  private echoFx = new WeakMap<Foot, { fx: GlitchFX | null; t: number; burst: number }>();
  private t = 0;

  constructor(sc: Phaser.Scene) {
    this.sc = sc;
    live.set(sc, this);
    sc.events.once('shutdown', () => live.delete(sc));
  }

  private layer(): Phaser.GameObjects.Container | null {
    if (this.bg) return this.bg;
    const bv = bits(this.sc).backdrop;
    this.bg = bv?.bgA?.parentContainer ?? null;
    return this.bg;
  }

  /** Keep a layer of ours just above the backdrop images (and under its light glows). */
  private place(o: Phaser.GameObjects.GameObject): void {
    const bg = this.layer();
    if (!bg) return;
    if (!bg.exists(o)) bg.add(o);
    bg.moveBelow(o as never, bits(this.sc).backdrop.glowLayer as never);
  }

  /** Called when each wave begins (after the backdrop is set). */
  onWave(n: number): void {
    const loc = locationFor(n);
    const boss = isBossWave(n);
    const finale = loc === 'oven' || loc === 'firstpizzeria';
    if (finale) audio.preload(this.sc, bossSfx('finale'));
    // ——— memory lane ———
    if (loc === 'oven' && !boss) this.remember(n);
    else this.forget();
    // ——— the First Pizzeria: its dawn and its wall of peels ———
    const atFirst = loc === 'firstpizzeria';
    if (atFirst && !boss) this.setDawn((waveInStage(n) - 1) / 3);
    else this.setDawn(-1);
    if (atFirst) this.buildWall();
    else this.clearWall();
  }

  private remember(n: number): void {
    const all = memories();
    if (!all.length) return;
    // waves 1–4 of the stage walk down memory lane: one place from each quarter of the journey
    const k = waveInStage(n) - 1;
    const q0 = Math.floor((k / 4) * all.length);
    const q1 = Math.max(q0 + 1, Math.floor(((k + 1) / 4) * all.length));
    let pick = all[q0 + Math.floor(Math.random() * (q1 - q0))];
    if (pick === this.memNow) pick = all[(all.indexOf(pick) + 1) % all.length];
    const first = !this.memImg;
    if (!this.memImg) {
      this.memImg = this.sc.add.image(W / 2, H / 2, '__DEFAULT').setAlpha(0);
      if (!this.sc.textures.exists('fin_memframe')) addCanvas(this.sc, 'fin_memframe', memFrame());
      this.memFrameImg = this.sc.add.image(W / 2, H / 2, 'fin_memframe').setAlpha(0);
      this.place(this.memImg);
      this.place(this.memFrameImg);
      this.memFx = glitchOn(this.sc, this.memImg);
    }
    const img = this.memImg;
    const key = ensureBackdrop(this.sc, pick as BackdropId);
    this.memNow = pick;
    audio.sfx('sfx_finale_warp', { volume: 0.9 });
    screenGlitch(this.sc, 750, 1);
    this.sc.time.delayedCall(first ? 120 : 260, () => {
      if (!img.active) return;
      img.setTexture(key).setDisplaySize(W, H);
      this.memAlpha = 0.9;
      this.sc.tweens.add({ targets: [img], alpha: this.memAlpha, duration: 500 });
      if (this.memFrameImg) this.sc.tweens.add({ targets: this.memFrameImg, alpha: 1, duration: 500 });
      const name = BACKDROPS[pick as BackdropId]?.name ?? '';
      this.caption(`MEMORY · ${name.toUpperCase()}`);
    });
    this.flickerT = 3 + Math.random() * 3;
  }

  private forget(): void {
    if (!this.memImg) return;
    const imgs = [this.memImg, this.memFrameImg].filter((o): o is Phaser.GameObjects.Image => !!o);
    this.memImg = null;
    this.memFrameImg = null;
    this.memFx = null;
    this.memNow = null;
    screenGlitch(this.sc, 500, 0.8);
    this.sc.tweens.add({ targets: imgs, alpha: 0, duration: 600, onComplete: () => imgs.forEach((o) => o.destroy()) });
  }

  /** A short caption under the HUD (which memory this is). */
  private caption(msg: string): void {
    const t = this.sc.add.text(W / 2, 232, msg, { fontFamily: 'Lilita One, Fredoka, sans-serif', fontSize: '40px', color: '#e8d8ff', stroke: '#1a0a30', strokeThickness: 10 }).setOrigin(0.5).setAlpha(0).setDepth(5);
    this.sc.tweens.add({ targets: t, alpha: 1, y: 222, duration: 300, yoyo: true, hold: 2200, onComplete: () => t.destroy() });
  }

  private setDawn(k: number): void {
    if (k < 0) {
      if (this.dawn) {
        const d = this.dawn;
        this.dawn = null;
        this.sc.tweens.add({ targets: d, alpha: 0, duration: 1200, onComplete: () => d.destroy() });
      }
      return;
    }
    if (!this.dawn) {
      if (!this.sc.textures.exists('fin_dawn')) addCanvas(this.sc, 'fin_dawn', dawnGlow());
      this.dawn = this.sc.add.image(W / 2, 0, 'fin_dawn').setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.SCREEN).setAlpha(0);
      this.place(this.dawn);
      if (this.wall) this.place(this.wall);
    }
    // the sky lightens over the stage: dark at wave 96, the first sunrise by 99
    this.sc.tweens.add({ targets: this.dawn, alpha: 0.12 + k * 0.5, duration: 2500 });
  }

  /** Hang every peel the player owns on the wall (built a couple a frame, each one popping onto its peg). */
  private buildWall(): void {
    const eq = bits(this.sc).peelId;
    if (this.wall && this.wallFor === eq) return;
    this.clearWall(true);
    this.wallFor = eq;
    const ids = wallPeels(eq);
    const { x0, x1, y0 } = FIN.wall;
    // as many rows as it takes (smaller peels for big collections), up to 4 rows
    const layouts = [
      { rows: 2, cols: 12, h: 104 },
      { rows: 3, cols: 17, h: 80 },
      { rows: 4, cols: 23, h: 62 },
    ];
    const lay = layouts.find((l) => l.rows * l.cols >= ids.length) ?? layouts[2];
    const shown = ids.slice(0, lay.rows * lay.cols);
    const wall = this.sc.add.container(0, 0);
    this.wall = wall;
    this.place(wall);
    const rowH = (FIN.wall.y1 - 6 - (y0 + 34)) / lay.rows;
    shown.forEach((id, i) => {
      const row = Math.floor(i / lay.cols);
      const col = i % lay.cols;
      const inRow = Math.min(lay.cols, shown.length - row * lay.cols);
      // each row is centred on the wall
      const span = (x1 - x0 - 100) * (inRow / lay.cols);
      const x = (x0 + x1) / 2 - span / 2 + (inRow > 1 ? (col * span) / (inRow - 1) : span / 2);
      const y = y0 + 40 + row * rowH;
      const peg = this.sc.add.circle(x, y, Math.max(5, lay.h * 0.08), 0x7a4a22).setStrokeStyle(3, 0x2a1810);
      wall.add(peg);
      this.wallQueue.push({ id, x, y, h: lay.h });
    });
    if (ids.length > shown.length) {
      // on the capstones, above the rows (the peels hang down over anything lower)
      const more = this.sc.add.text((x0 + x1) / 2, y0 - 26, `+${ids.length - shown.length} MORE IN THE LOCKER`, { fontFamily: 'Lilita One, Fredoka, sans-serif', fontSize: '24px', color: '#fff0c8', stroke: '#2a1810', strokeThickness: 7 }).setOrigin(0.5);
      wall.add(more);
    }
  }

  private clearWall(now = false): void {
    this.wallQueue = [];
    this.wallImgs.length = 0;
    this.wallFor = '';
    if (!this.wall) return;
    const w = this.wall;
    this.wall = null;
    if (now) w.destroy();
    else this.sc.tweens.add({ targets: w, alpha: 0, duration: 600, onComplete: () => w.destroy() });
  }

  /** The run left the finale (or the scene is ending): take the layers down. */
  clear(): void {
    if (!this.sc.sys.isActive()) return;
    this.forget();
    this.setDawn(-1);
    this.clearWall();
  }

  update(dt: number): void {
    this.t += dt;
    // the wall fills a peel at a time
    for (let i = 0; i < 2 && this.wallQueue.length && this.wall; i++) {
      const q = this.wallQueue.shift()!;
      const key = peelThumbKey(this.sc, q.id, q.h);
      // hung from the top of its handle, so it swings on the peg
      const img = this.sc.add.image(q.x, q.y - q.h * 0.04, key).setOrigin(0.5, 0.04).setScale(0).setAngle((Math.random() - 0.5) * 8);
      this.wall.add(img);
      this.wallImgs.push({ id: q.id, img });
      this.sc.tweens.add({ targets: img, scale: 1, duration: 320, ease: 'Back.Out' });
      this.sc.tweens.add({ targets: img, angle: { from: img.angle - 3, to: img.angle + 3 }, duration: 1800 + Math.random() * 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      audio.sfx('sfx_finale_peelwall', { volume: 0.5, throttle: 140, rate: 0.9 + Math.random() * 0.3 });
    }
    // memory lane flickers back to the cosmic kitchen now and then
    if (this.memImg && this.memAlpha > 0) {
      this.flickerT -= dt;
      if (this.flickerOut > 0) {
        this.flickerOut -= dt;
        if (this.flickerOut <= 0) {
          this.memImg.setAlpha(this.memAlpha);
          this.memFrameImg?.setAlpha(1);
        }
      } else if (this.flickerT <= 0) {
        this.flickerT = 4 + Math.random() * 4;
        this.flickerOut = 0.14 + Math.random() * 0.12;
        this.memImg.setAlpha(0.12);
        this.memFrameImg?.setAlpha(0.3);
        audio.sfx('sfx_finale_glitch', { volume: 0.55, throttle: 300 });
      }
      if (this.memFx) this.memFx.amount = this.flickerOut > 0 ? 1 : 0.06 + Math.max(0, Math.sin(this.t * 1.7)) * 0.08;
    }
    // echoes glitch: a low hum of it all the time, with bursts
    for (const f of bits(this.sc).feet) {
      if (!f.alive || !f.type.art.kind.startsWith('echo')) continue;
      let st = this.echoFx.get(f);
      if (!st) {
        const img = (f as unknown as { img: Piped }).img;
        st = { fx: glitchOn(this.sc, img), t: 0.5 + Math.random() * 2, burst: 0 };
        this.echoFx.set(f, st);
      }
      st.t -= dt;
      if (st.t <= 0) {
        st.t = 1.2 + Math.random() * 2.4;
        st.burst = 0.18;
        audio.sfx('sfx_finale_glitch', { volume: 0.35, throttle: 450 });
      }
      st.burst = Math.max(0, st.burst - dt);
      if (st.fx) st.fx.amount = st.burst > 0 ? 0.9 : 0.14;
    }
  }
}

// ——— The ending ———

/** The credits' own band in the sky (top and bottom edges), clear of the parade on the floor below. */
const CREDITS_TOP = 70;
const CREDITS_BOTTOM = 470;
/** Where the parade's soles land: on the floor, under the credits. */
const PARADE_LANE = 905;
/** Tallest a marching foot may stand, so its toes never reach up into the credits. */
const PARADE_MAX_H = 330;

/** A soft dark plate behind the credits: feathered on every edge, so it never reads as a box. */
function creditsPlate(): HTMLCanvasElement {
  const w = 1240;
  const h = CREDITS_BOTTOM - CREDITS_TOP + 80;
  const [c, ctx] = makeCanvas(w, h);
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, rgba('#05040c', 0));
  g.addColorStop(0.22, rgba('#05040c', 0.5));
  g.addColorStop(0.78, rgba('#05040c', 0.5));
  g.addColorStop(1, rgba('#05040c', 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // feather top and bottom too
  ctx.globalCompositeOperation = 'destination-in';
  const v = ctx.createLinearGradient(0, 0, 0, h);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(0.2, 'rgba(0,0,0,1)');
  v.addColorStop(0.8, 'rgba(0,0,0,1)');
  v.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  return c;
}

/** Every foot fought so far: regular feet you've smacked, and every boss you've beaten. */
function foughtFeet(): FootType[] {
  const ids = new Set<string>([...Object.keys(save.kills).filter((k) => (save.kills[k] ?? 0) > 0), ...save.bossesBeaten]);
  return [...ids]
    .map((id) => FOOT_BY_ID[id])
    .filter((f): f is FootType => !!f && !!footMeta[f.id] && f.id !== 'soleunbound')
    .sort((a, b) => a.minWave - b.minWave || Number(!!a.boss || !!a.mini) - Number(!!b.boss || !!b.mini));
}

/** The credits, in lines: the game, the cast, the music (from credits.json) and you. */
async function creditLines(): Promise<[string, number][]> {
  const lines: [string, number][] = [['FEETZA', 96], ['', 30], ['Design, code and every piece of art', 34], ['made for Feetza, by hand and by canvas', 34], ['', 40], ['STARRING', 40], ['Every foot you ever smacked', 34], ['', 40]];
  try {
    const items = (await (await fetch('audio/credits.json')).json()) as { file: string; title: string; author: string }[];
    const music = items.filter((c) => c.file.startsWith('music_') && /MacLeod/.test(c.author)).map((c) => c.title);
    lines.push(['MUSIC', 40], ['Kevin MacLeod (incompetech.com)', 34], ['Creative Commons: By Attribution 4.0', 26]);
    for (const t of [...new Set(music)].slice(0, 40)) lines.push([`“${t}”`, 28]);
    lines.push(['', 40]);
  } catch {
    lines.push(['MUSIC', 40], ['Kevin MacLeod (incompetech.com) · CC-BY 4.0', 30], ['', 40]);
  }
  lines.push(['SOUND', 40], ['Kenney (kenney.nl) · CC0', 30], ['freesound.org contributors · CC0', 30], ['and sounds made for Feetza', 30], ['', 40]);
  lines.push(['FONTS', 40], ['Lilita One & Fredoka · SIL Open Font License', 30], ['', 40]);
  lines.push(['AND STARRING', 40], ['YOU', 72], ['', 30], ['Thanks for playing', 40]);
  return lines;
}

/**
 * The ending, after the Sole Proprietor Unbound: the light from his cracked sole fades into the First
 * Pizzeria at sunrise (the table is the First Pizzeria's now), every foot fought marches past waving with
 * the credits rolling, then the Pizza Legend title and Endless+. `done` opens the victory screen.
 */
export function playEnding(sc: Phaser.Scene, done: () => void): void {
  const firstTime = !save.legend;
  save.legend = true;
  save.endlessPlus = true;
  persist();
  ui.showHud(false);
  const root = sc.add.container(0, 0).setDepth(9000);
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    sc.tweens.add({
      targets: root,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        root.destroy(true);
        ui.showHud(true);
        done();
      },
    });
  };
  // the First Pizzeria at sunrise, with its table
  const key = ensureBackdrop(sc, 'firstpizzeria');
  const scene = sc.add.image(W / 2, H / 2, key).setDisplaySize(W, H);
  if (!sc.textures.exists('fin_dawn')) addCanvas(sc, 'fin_dawn', dawnGlow());
  const sun = sc.add.image(W / 2, 0, 'fin_dawn').setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.SCREEN).setAlpha(0.85);
  const shade = sc.add.rectangle(W / 2, H / 2, W, H, 0x05040c, 0.35);
  root.add([scene, sun, shade]);
  // rays of the new sun from the oven's mouth
  const rays = sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  root.add(rays);
  const white = sc.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 1);
  root.add(white);
  sc.tweens.add({ targets: white, alpha: 0, duration: 1800, ease: 'Sine.Out' });
  const title = (txt: string, y: number, size: number, color: string) =>
    sc.add.text(W / 2, y, txt, { fontFamily: 'Lilita One, Fredoka, sans-serif', fontSize: `${size}px`, color, stroke: '#2a1810', strokeThickness: Math.round(size / 6), align: 'center' }).setOrigin(0.5);
  const t1 = title('THE FIRST PIZZERIA', 380, 110, '#ffe28a').setAlpha(0);
  const t2 = title('IS YOURS NOW', 490, 64, '#ffffff').setAlpha(0);
  root.add([t1, t2]);
  sc.tweens.add({ targets: [t1, t2], alpha: 1, duration: 700, delay: 900, hold: 2200, yoyo: true });
  audio.stop('music', 800);
  sc.time.delayedCall(600, () => void audio.music(sc, ['music_ending', 'music_victory'], 1500));
  // skip (any time after the first beat)
  const skip = title('SKIP ▸', H - 60, 34, '#fff6e2').setPosition(W - 120, H - 60).setAlpha(0).setInteractive({ useHandCursor: true });
  skip.on('pointerdown', () => finish());
  root.add(skip);
  sc.tweens.add({ targets: skip, alpha: 0.85, duration: 400, delay: 2000 });
  // the parade: every foot fought marches past along the back of the table, waving
  const cast = foughtFeet().slice(-48);
  const spacing = 240;
  const speed = 360;
  const lane = PARADE_LANE;
  const parade = sc.add.container(0, 0);
  root.addAt(parade, 3);
  cast.forEach((f, i) => {
    const m = footMeta[f.id];
    const big = f.boss || f.mini;
    const img = sc.add.image(0, 0, m.footKey).setOrigin(0.5, m.originY);
    // tall feet (and bosses) are scaled down to the lane's height, so none reaches the credits
    const s = Math.min((big ? 0.42 : 0.6) * Math.min(1.25, 1 / Math.max(0.7, f.scale)), PARADE_MAX_H / (img.height * m.originY), (spacing * 1.3) / img.width);
    img.setScale(s);
    const c = sc.add.container(W + 160 + i * spacing, lane);
    // names wrap onto two lines within the foot's own spacing, so neighbours never run together
    const name = sc.add.text(0, 22, f.name, { fontFamily: 'Fredoka, sans-serif', fontStyle: '700', fontSize: '21px', color: '#fff6e2', stroke: '#2a1810', strokeThickness: 6, align: 'center', wordWrap: { width: spacing - 30 } }).setOrigin(0.5, 0);
    c.add([img, name]);
    parade.add(c);
    // a march: a step every 0.36 s, a lean and a little wave
    sc.tweens.add({ targets: img, y: { from: 0, to: -26 }, duration: 180, yoyo: true, repeat: -1, ease: 'Sine.Out', delay: (i * 70) % 360 });
    sc.tweens.add({ targets: img, angle: { from: -12, to: 12 }, duration: 360, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: (i * 110) % 720 });
  });
  const marchMs = ((W + 320 + cast.length * spacing) / speed) * 1000;
  sc.tweens.add({ targets: parade, x: -(W + 320 + cast.length * spacing), duration: marchMs, delay: 3600 });
  // feet waiting off stage (or already gone) are hidden, so only the ones on screen draw
  const cull = () => {
    if (!parade.active) return sc.events.off('update', cull);
    for (const c of parade.list as Phaser.GameObjects.Container[]) {
      const on = Math.abs(parade.x + c.x - W / 2) < W / 2 + 200;
      if (c.visible !== on) for (const o of [c, ...c.list] as Phaser.GameObjects.Image[]) o.setVisible(on);
    }
  };
  sc.events.on('update', cull);
  // credits roll up the sky, in their own band above the parade
  void creditLines().then((lines) => {
    if (finished) return;
    const roll = sc.add.container(0, 0);
    root.add(roll);
    let y = 0;
    const rows: Phaser.GameObjects.Text[] = [];
    for (const [txt, size] of lines) {
      if (txt) rows.push(title(txt, y, size, size >= 60 ? '#ffe28a' : size >= 40 ? '#ffd8a8' : '#fff6e2').setPosition(W / 2, y + size * 0.5));
      y += size * 1.35;
    }
    roll.add(rows);
    if (!sc.textures.exists('fin_creditsplate')) addCanvas(sc, 'fin_creditsplate', creditsPlate());
    const band = sc.add.image(W / 2, (CREDITS_TOP + CREDITS_BOTTOM) / 2, 'fin_creditsplate').setAlpha(0);
    root.addAt(band, 3);
    sc.tweens.add({ targets: band, alpha: 1, duration: 900, delay: 3200 });
    // lines fade in at the bottom of the band and out at the top, instead of being cut by a hard edge
    const FADE = 70;
    const fade = () => {
      for (const t of rows) {
        const ty = roll.y + t.y;
        const k = Math.min(1, Math.max(0, (ty - CREDITS_TOP) / FADE), Math.max(0, (CREDITS_BOTTOM - ty) / FADE));
        t.setAlpha(k).setVisible(k > 0.01);
      }
    };
    sc.events.on('update', fade);
    roll.once('destroy', () => sc.events.off('update', fade));
    roll.y = CREDITS_BOTTOM + 20;
    fade();
    const rollMs = Math.max(marchMs, 18000);
    sc.tweens.add({ targets: roll, y: -y - 40, duration: rollMs, delay: 3800, ease: 'Linear' });
    sc.time.delayedCall(3800 + Math.max(rollMs, marchMs) - 1500, () => {
      if (finished) return;
      sc.tweens.add({ targets: band, alpha: 0, duration: 600 });
      legendCard(sc, root, firstTime, finish);
    });
  });
  // sun rays turn slowly
  const tick = sc.time.addEvent({
    delay: 33,
    loop: true,
    callback: () => {
      if (!rays.active) return tick.remove();
      rays.clear();
      const t = sc.time.now / 1000;
      for (let i = 0; i < 14; i++) {
        const a = -Math.PI + (i / 13) * Math.PI + Math.sin(t * 0.3) * 0.05;
        rays.fillStyle(0xffd890, 0.05 + 0.03 * Math.sin(t * 1.3 + i));
        rays.beginPath();
        rays.moveTo(FIN.hive.x, FIN.hive.y + 120);
        rays.lineTo(FIN.hive.x + Math.cos(a - 0.05) * 2400, FIN.hive.y + 120 + Math.sin(a - 0.05) * 2400);
        rays.lineTo(FIN.hive.x + Math.cos(a + 0.05) * 2400, FIN.hive.y + 120 + Math.sin(a + 0.05) * 2400);
        rays.closePath();
        rays.fillPath();
      }
    },
  });
}

/** The title card: PIZZA LEGEND in a gold frame, and Endless+ unlocked. */
function legendCard(sc: Phaser.Scene, root: Phaser.GameObjects.Container, firstTime: boolean, finish: () => void): void {
  const card = sc.add.container(W / 2, 470).setScale(0.2).setAlpha(0);
  const glow = sc.add.image(0, 0, 'glow').setTint(0xffd23f).setBlendMode(Phaser.BlendModes.ADD).setScale(5.5, 3.2).setAlpha(0.7);
  const frame = sc.add.graphics();
  frame.fillStyle(0x2a1810, 0.92).fillRoundedRect(-520, -200, 1040, 400, 40);
  frame.lineStyle(26, 0x8a5a10, 1).strokeRoundedRect(-520, -200, 1040, 400, 40);
  frame.lineStyle(14, 0xffd23f, 1).strokeRoundedRect(-520, -200, 1040, 400, 40);
  frame.lineStyle(4, 0xfff4b0, 1).strokeRoundedRect(-506, -186, 1012, 372, 30);
  const style = (size: number, color: string) => ({ fontFamily: 'Lilita One, Fredoka, sans-serif', fontSize: `${size}px`, color, stroke: '#2a1810', strokeThickness: Math.round(size / 6), align: 'center' as const });
  const kick = sc.add.text(0, -130, firstTime ? 'NEW TITLE' : 'STILL THE', style(40, '#fff6e2')).setOrigin(0.5);
  const big = sc.add.text(0, -30, 'PIZZA LEGEND', style(124, '#ffd23f')).setOrigin(0.5);
  const sub = sc.add.text(0, 80, 'ENDLESS+ UNLOCKED', style(48, '#7dff9a')).setOrigin(0.5);
  const note = sc.add.text(0, 140, 'From wave 101 every place, boss and foot is shuffled', style(30, '#fff6e2')).setOrigin(0.5);
  card.add([glow, frame, kick, big, sub, note]);
  root.add(card);
  sc.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 700, ease: 'Back.Out' });
  audio.sting('music_act', 0.9);
  const confetti = sc.add.particles(0, 0, 'confetti', {
    x: { min: 0, max: W }, y: -20, lifespan: 5000, frequency: 30, quantity: 2,
    speedY: { min: 160, max: 320 }, speedX: { min: -60, max: 60 }, rotate: { min: 0, max: 360 },
    scaleX: { min: 0.6, max: 1.2 }, scaleY: { min: 0.4, max: 1 },
    tint: [0xffd23f, 0xfff4b0, 0xff4d6d, 0x3ddc97, 0x4cc9f0], alpha: 0.9,
  });
  root.add(confetti);
  sc.time.delayedCall(2500, () => confetti.stop());
  sc.time.delayedCall(4200, finish);
}
