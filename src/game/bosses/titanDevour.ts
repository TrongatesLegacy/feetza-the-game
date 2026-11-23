// Kronos the Titan King's DEVOUR (phase 2, and again in his shield; the brain is ./titanking.ts): his ONE enormous
// stone Titan head (src/content/art/titanHead.ts) rises out of the lava pit behind the table, lava draining off it,
// opens its mouth at the table's back edge and INHALES. The chosen pizza, plate and all, slides back along the table
// into its mouth, shrinking with the perspective, wobbling and scared, its toppings and crumbs peeling off and
// streaming in on the rushing air.
// - Whack the head enough (HEAD_HITS) and it chokes (CHOKED!): the suction breaks, the pizza springs back to its spot
//   (SAVED!) and the brain stuns and hurts Kronos (onChoked).
// - Too slow: it chomps, gulps the bite (the brain's onGulp takes the slices), spits the leftover back onto its spot,
//   chews and sinks back into the lava.
// Timing (Regular): ~1.8 s to rise, then `sec` (6.5 s, heat-scaled) from the first breath to the gulp.
//
// How it's drawn: the head is painted live into one canvas texture each frame (clipped at the pit's edge, so its lower
// half is hidden behind the ledge and the table), with the lava drops, drips and bubbles that fall back into the pit.
// It sits in the arena's overFeetLayer: in front of every other foot (the neighbouring lanes' feet pass behind it)
// and under the scene light. The pizza it pulls, Kronos's own foot, and the rushing air, steam, embers, toppings and
// crumbs go over it in the same layer. While it's up, the lane is marked obscured (src/game/laneShade.ts) so King
// Leonidas's shield wall fades out of the way.
// Gameplay rolls use the game's seeded Math.random only through the brain; everything here is for show (crand()).

import Phaser from 'phaser';
import { W } from '../../config';
import { HEAD_S, buildHeadTextures, clamp, crPath, drawHead, lerp, mouthGeom, onHead, ramp, rampColor, sat, STREAMS, streamFront, type HeadState, type Mouth } from '../../content/art/titanHead';
import { makeCanvas, type Ctx } from '../../art/util';
import { audio } from '../../systems/audio';
import { crand } from '../../systems/cosmeticRandom';
import type { Arena } from '../arena';
import type { Foot } from '../Foot';
import { clearLane, obscureLane } from '../laneShade';
import type { Pizza } from '../Pizza';

type P2 = [number, number];

/** The edge of the lava pit in Tartarus's backdrop (bg_titanking, world px): the head is hidden below it. */
const RIDGE: P2[] = [[0, 712], [40, 682], [80, 692], [120, 692], [160, 692], [200, 686], [240, 684], [280, 680], [320, 676], [360, 676], [400, 676], [440, 670], [480, 668], [520, 669], [560, 672], [600, 676], [640, 680], [680, 686], [720, 692], [760, 692], [800, 688], [840, 684], [880, 682], [920, 678], [960, 674], [1000, 672], [1040, 672], [1080, 670], [1120, 672], [1160, 672], [1200, 670], [1240, 674], [1280, 678], [1320, 684], [1360, 692], [1400, 692], [1440, 692], [1480, 684], [1520, 680], [1560, 678], [1600, 678], [1640, 673], [1680, 668], [1720, 670], [1760, 672], [1800, 672], [1840, 676], [1880, 678], [1920, 712]];
export const ridgeAt = (x: number): number => {
  const i = clamp(Math.floor(x / 40), 0, RIDGE.length - 2);
  return lerp(RIDGE[i][1], RIDGE[i + 1][1], (x - RIDGE[i][0]) / 40);
};

const S = HEAD_S;
/** The head's centre at rest (world y), and how far below that it starts. */
const REST = 441;
const DROP = 1000;
/** The head's canvas: this many canvas px per world px, covering CW world px across (centred on the head) × CH down. */
const RES_K = 1;
const CW = 1460;
const CH = 730;
/** The target ring: centre (relative to the head's centre) and radius. */
const RING_DY = -49;
const RING_R = 340;
/** The pizza's size when it reaches the mouth (× its own), and at the table's back edge. */
const S_MOUTH = 0.44;
const S_EDGE = 0.7;
/** Where the head stands: over its pizza, but never more than a bit off screen. */
export const HEAD_X = (x: number) => clamp(x, 560, W - 560);
/** About half the head's width on screen (with its ears). */
export const HEAD_HALF = 600;
/** The head's canvas texture (one, reused). */
const KEY = 'tk_devour_head';

export interface DevourOpts {
  /** The pizza it eats. */
  p: Pizza;
  /** Kronos, drawn in front of the head while it's up (null: leave him be). */
  boss: Foot | null;
  /** Whacks to make it choke. */
  hits: number;
  /** Seconds from the first breath to the gulp. */
  sec: number;
  /** How many slices the gulp will take (Mild never takes the last). */
  take: () => number;
  /** It choked: stun and hurt him. */
  onChoked: () => void;
  /** The leftover landed back on its spot: take the slices now. */
  onGulp: (n: number) => void;
  /** The head has sunk away: give the lane back. */
  onDone: () => void;
  /** The fight's hit counter. */
  counter: (at: () => P2 | null, n: number) => { set(v: number): void; destroy(): void };
  /** Stone chips off a hit. */
  debris: (x: number, y: number) => void;
  /** The backdrop's quake (px, kick). */
  quake: (px: number, kick?: number) => void;
}

export interface Devour {
  p: Pizza;
  /** Still pulling (not choked, not gulped). */
  readonly pulling: boolean;
  /** Break off now (phase change, his death, the wave's end): the pizza goes back and the head sinks. */
  abort(): void;
}

/** The topping bits that peel off a pizza (four kinds, three of each), drawn once. */
function topSprites(sc: Phaser.Scene): string[] {
  const keys: string[] = [];
  let seed = 3;
  const r = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (const kind of ['mozz', 'basil', 'tomato', 'crust'])
    for (let i = 0; i < 3; i++) {
      const key = `tk_top_${kind}${i}`;
      keys.push(key);
      if (sc.textures.exists(key)) continue;
      const [c, x] = makeCanvas(64, 64);
      x.translate(32, 32);
      x.lineJoin = 'round';
      if (kind === 'mozz') {
        const pts: P2[] = [];
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * 6.283;
          pts.push([Math.cos(a) * (14 + r() * 7), Math.sin(a) * (11 + r() * 6)]);
        }
        x.beginPath();
        crPath(x, pts, true);
        const g = x.createRadialGradient(-5, -6, 2, 0, 0, 22);
        g.addColorStop(0, '#fffdf2');
        g.addColorStop(0.7, '#f4ead0');
        g.addColorStop(1, '#d8c69a');
        x.fillStyle = g;
        x.fill();
        x.lineWidth = 2.5;
        x.strokeStyle = '#8a6a3a';
        x.stroke();
      } else if (kind === 'basil') {
        x.rotate(r() * 6);
        x.beginPath();
        x.moveTo(-18, 0);
        x.quadraticCurveTo(0, -14, 18, 0);
        x.quadraticCurveTo(0, 14, -18, 0);
        const g = x.createLinearGradient(0, -12, 0, 12);
        g.addColorStop(0, '#6ac24a');
        g.addColorStop(1, '#2a7a2a');
        x.fillStyle = g;
        x.fill();
        x.lineWidth = 2.5;
        x.strokeStyle = '#1a3a14';
        x.stroke();
        x.beginPath();
        x.moveTo(-14, 0);
        x.lineTo(14, 0);
        x.strokeStyle = 'rgba(200,255,160,0.6)';
        x.lineWidth = 1.5;
        x.stroke();
      } else if (kind === 'tomato') {
        x.beginPath();
        x.arc(0, 0, 12 + r() * 4, 0, 7);
        const g = x.createRadialGradient(-4, -4, 1, 0, 0, 16);
        g.addColorStop(0, '#ff6a5a');
        g.addColorStop(1, '#b8201a');
        x.fillStyle = g;
        x.fill();
        x.lineWidth = 2.5;
        x.strokeStyle = '#5a0a06';
        x.stroke();
      } else {
        const pts: P2[] = [];
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * 6.283;
          pts.push([Math.cos(a) * (9 + r() * 6), Math.sin(a) * (8 + r() * 5)]);
        }
        x.beginPath();
        crPath(x, pts, true);
        const g = x.createLinearGradient(0, -12, 0, 12);
        g.addColorStop(0, '#f0c070');
        g.addColorStop(1, '#b07028');
        x.fillStyle = g;
        x.fill();
        x.lineWidth = 2.5;
        x.strokeStyle = '#5a3010';
        x.stroke();
      }
      sc.textures.addCanvas(key, c);
    }
  return keys;
}

/** Paint a container's images (not its text or bars) into a 2D context, in its parent's space. */
function paintGO(c: Ctx, o: Phaser.GameObjects.GameObject): void {
  const t = o as unknown as Phaser.GameObjects.Components.Transform & Phaser.GameObjects.Components.Visible & Phaser.GameObjects.Components.AlphaSingle;
  if (!t.visible) return;
  if (o instanceof Phaser.GameObjects.Container) {
    c.save();
    c.translate(t.x, t.y);
    c.rotate(t.rotation);
    c.scale(t.scaleX, t.scaleY);
    c.globalAlpha *= t.alpha;
    for (const ch of o.list) paintGO(c, ch);
    c.restore();
  } else if (o instanceof Phaser.GameObjects.Image) {
    const fr = o.frame;
    const src = fr.source.image as CanvasImageSource;
    c.save();
    c.translate(o.x, o.y);
    c.rotate(o.rotation);
    c.scale(o.scaleX * (o.flipX ? -1 : 1), o.scaleY * (o.flipY ? -1 : 1));
    c.globalAlpha *= o.alpha;
    c.drawImage(src, fr.cutX, fr.cutY, fr.cutWidth, fr.cutHeight, -o.displayOriginX, -o.displayOriginY, fr.cutWidth, fr.cutHeight);
    c.restore();
  }
}

interface Bit {
  kind: 'streak' | 'top' | 'crumb' | 'steam' | 'dust' | 'ember' | 'sauce' | 'drop' | 'drip' | 'spark' | 'bubble';
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  s: number;
  g?: number;
  rot?: number;
  vr?: number;
  /** Pulled into the mouth. */
  sucked?: boolean;
  /** Width and alpha (streaks), warm tint. */
  w?: number;
  a?: number;
  warm?: boolean;
  ph?: number;
  /** Its sprite (toppings, crumbs, steam, dust). */
  img?: Phaser.GameObjects.Image;
  /** Scale it had when it left the pizza, and its first distance from the mouth (it shrinks into the distance). */
  s0?: number;
  d0?: number;
  depth?: number;
}

const eOut = (x: number) => 1 - (1 - x) * (1 - x);
const eIn = (x: number) => x * x;
const eIn3 = (x: number) => x * x * x;
const backOut = (x: number, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
const pm = () => crand() * 2 - 1;

export function startDevour(a: Arena, o: DevourOpts): Devour {
  const sc = a.sc;
  const p = o.p;
  buildHeadTextures();
  const hx = HEAD_X(p.x);
  const x0 = hx - CW / 2;
  const ridge = ridgeAt(hx);
  const L = a.overFeetLayer;

  // ——— the timeline (seconds since it started) ———
  const T = { rumble: 0, riseA: 0.45, riseB: 1.8, ignite: 1.1, prep: 1.8, suck: 2.25, slide: 2.37, win: 2.25 + o.sec, sinkA: Infinity, sinkB: Infinity, end: Infinity };
  const setSink = (at: number) => {
    T.sinkA = at;
    T.sinkB = at + 1.15;
    T.end = T.sinkB + 0.85;
  };
  setSink(T.win + 1.75);
  const st = {
    t: 0,
    u: 0,
    hicc: 0,
    left: o.hits,
    flash: 0,
    rotV: 0,
    rot: 0,
    jolt: 0,
    joltV: 0,
    clack: 0,
    freedAt: -1,
    fromU: 0,
    /** Broken off (aborted) rather than choked: no CHOKED!, no daze. */
    quiet: false,
    eaten: false,
    spitAt: -1,
    landed: false,
    emerged: false,
    sunk: false,
    chewT: 0,
    splashed: false,
    take: 0,
    bitten: [] as number[],
  };

  // ——— its pieces ———
  let tex = sc.textures.exists(KEY) ? (sc.textures.get(KEY) as Phaser.Textures.CanvasTexture) : null;
  if (!tex || !(tex instanceof Phaser.Textures.CanvasTexture)) {
    if (tex) sc.textures.remove(KEY);
    tex = sc.textures.createCanvas(KEY, Math.round(CW * RES_K), Math.round(CH * RES_K))!;
  }
  const ctx = tex.getContext();
  const head = sc.add.image(x0, 0, KEY).setOrigin(0, 0).setScale(1 / RES_K);
  // the pit's glow surges in his lane before he comes (behind him) and a heat haze where he meets the lava (over him)
  const surge = sc.add.image(hx, ridge, 'soft').setCrop(0, 0, 64, 32).setDisplaySize(1120, 520).setTint(0xff9632).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  const haze = sc.add.image(hx, ridge + 2, 'soft').setCrop(0, 0, 64, 32).setDisplaySize(1800, 250).setTint(0xff7828).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  const front = sc.add.container(0, 0);
  const gNorm = sc.add.graphics();
  const gAdd = sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  L.add([surge, head, haze, front, gNorm, gAdd]);
  // the target ring, under the fight's other markers
  const ringG = sc.add.graphics();
  a.fxLayer.addAt(ringG, 0);
  let badge: ReturnType<DevourOpts['counter']> | null = null;
  const tops = topSprites(sc);

  // Kronos stands in front of his own head
  const boss = o.boss;
  const bossHome = boss?.root.parentContainer ?? null;
  if (boss && bossHome) L.add(boss.root);

  // the pizza: taken into our layer (over the head) while it's away from its spot
  const root = p.root;
  let rootHome: Phaser.GameObjects.Container | null = null;
  let rootIdx = 0;
  let extras: { o: Phaser.GameObjects.Components.AlphaSingle; a: number }[] = [];
  const takePizza = () => {
    if (rootHome || !root.active) return;
    rootHome = root.parentContainer;
    if (!rootHome) return;
    rootIdx = rootHome.getIndex(root);
    sc.tweens.killTweensOf(root);
    // its name, perk line and freshness bar stay behind (they fade while it's away)
    extras = root.list.filter((c) => c instanceof Phaser.GameObjects.Text || c instanceof Phaser.GameObjects.Graphics).map((c) => ({ o: c as unknown as Phaser.GameObjects.Components.AlphaSingle, a: (c as unknown as Phaser.GameObjects.Components.AlphaSingle).alpha }));
    L.addAt(root, L.getIndex(front));
  };
  const homePizza = () => {
    if (!rootHome) return;
    if (root.active) {
      rootHome.addAt(root, Math.min(rootIdx, rootHome.length));
      root.setPosition(p.x, p.y).setScale(1).setRotation(0).setVisible(true);
      for (const e of extras) e.o.setAlpha(e.a);
      // (and its own look again: a stale or dead pizza's caption, the slices it really has)
      p.redraw();
    }
    rootHome = null;
  };

  // ——— sound ———
  let inhale: ReturnType<typeof audio.loopSfx> = null;
  let inhaleVol = 0;
  const onPause = () => inhale?.pause();
  const onResume = () => inhale?.resume();
  sc.events.on('pause', onPause);
  sc.events.on('resume', onResume);
  a.sfx('sfx_titanking_rise');
  a.shake(300, 0.005);
  o.quake(0, 6);

  // ——— particles ———
  const bits: Bit[] = [];
  const add = (b: Partial<Bit> & Pick<Bit, 'kind' | 'x' | 'y'>): Bit => {
    const bit: Bit = { vx: 0, vy: 0, age: 0, life: 1, s: 1, ...b };
    if (bit.kind === 'top' || bit.kind === 'crumb' || bit.kind === 'steam' || bit.kind === 'dust') {
      const key = bit.kind === 'steam' || bit.kind === 'dust' ? 'soft' : bit.kind === 'crumb' ? (crand() < 0.5 ? 'crumb' : 'crumb2') : tops[Math.floor(crand() * tops.length)];
      bit.img = sc.add.image(bit.x, bit.y, key);
      if (bit.kind === 'steam') bit.img.setTint(0xe8ddd4);
      if (bit.kind === 'dust') bit.img.setTint(0x7a6a5a);
      front.add(bit.img);
    }
    bits.push(bit);
    return bit;
  };

  // ——— the head's motion ———
  const suckAmt = (t: number) => {
    let s = ramp(t, T.suck, T.suck + 0.35);
    if (st.freedAt > 0) s *= 1 - ramp(t, st.freedAt, st.freedAt + 0.12);
    if (st.eaten) s *= 1 - ramp(t, T.win, T.win + 0.1);
    return s;
  };
  const headY = (t: number) => {
    let y = REST + DROP;
    if (t >= T.riseA) y = REST + DROP * (1 - backOut(eOut(ramp(t, T.riseA, T.riseB)), 0.9));
    // it draws itself up for the breath, and heaves with it
    y -= 14 * S * ramp(t, T.prep, T.suck) * (1 - ramp(t, T.suck, T.suck + 0.4) * 0.5);
    if (t > T.suck) y += Math.sin((t - T.suck) * 7) * 3 * S * suckAmt(t);
    if (st.freedAt > 0 && !st.quiet) {
      const k = t - st.freedAt;
      if (k < 0.45) y -= 34 * S * Math.sin((k / 0.45) * Math.PI);
    }
    if (t >= T.sinkA) y += (DROP + 80) * eIn3(ramp(t, T.sinkA, T.sinkB));
    return y + st.jolt;
  };
  const openAmt = (t: number) => {
    let op = 0.3 * eOut(ramp(t, T.prep, T.suck)) + 0.62 * eOut(ramp(t, T.suck, T.suck + 0.22));
    op -= st.clack;
    if (st.freedAt > 0) {
      const k = t - st.freedAt;
      op = Math.max(0, lerp(op, 0, ramp(k, 0, 0.1))) + (k > 0.1 && k < 0.5 && !st.quiet ? 0.12 * Math.sin(((k - 0.1) / 0.4) * Math.PI) : 0);
    }
    if (st.eaten) {
      const k = t - T.win;
      // chomp shut; then spit the leftover back; then a satisfied chew
      if (k < 0.1) op = lerp(0.92, 0, k / 0.1);
      else if (k < 0.32) op = 0.04;
      else if (k < 0.5) op = lerp(0.04, 0.55, eOut((k - 0.32) / 0.18));
      else if (k < 0.72) op = lerp(0.55, 0, eIn((k - 0.5) / 0.22));
      else op = 0.08 + 0.1 * Math.max(0, Math.sin((k - 0.72) * 10));
    }
    if (t > T.sinkA) op *= 1 - ramp(t, T.sinkA, T.sinkA + 0.3);
    return clamp(op, 0, 1);
  };
  const puffAmt = (t: number) => {
    let pf = Math.sin(ramp(t, T.prep - 0.05, T.suck + 0.05) * Math.PI) * 0.9;
    if (st.eaten && t > T.win + 0.72 && t < T.sinkA + 0.3) pf += 0.5 * Math.max(0, Math.sin((t - T.win - 0.72) * 10));
    return pf;
  };
  const glowAmt = (t: number) => {
    let g = 0;
    if (t > T.ignite) g = 0.55 + 0.6 * Math.exp(-(t - T.ignite) * 3.5);
    g += 0.45 * suckAmt(t);
    if (st.freedAt > 0 && t > st.freedAt && !st.quiet) {
      const k = t - st.freedAt;
      g *= 0.35 + (k < 0.6 ? 0.25 * Math.abs(Math.sin(k * 30)) : 0.25);
    }
    if (t > T.sinkB - 0.3) g *= 1 - ramp(t, T.sinkB - 0.3, T.sinkB + 0.2);
    return g;
  };

  // ——— the pizza's path: along the table to its back edge (shrinking with the perspective), then into the mouth ———
  let mouth: P2 = [hx, ridge - 18];
  const pathAt = (u: number): { x: number; y: number; s: number } => {
    const uEdge = 0.6;
    const P1: P2 = [lerp(p.x, hx, 0.12), 772];
    if (u <= uEdge) {
      const f = u / uEdge;
      return { x: lerp(p.x, P1[0], f), y: lerp(p.y, P1[1], f), s: lerp(1, S_EDGE, f) };
    }
    const f = (u - uEdge) / (1 - uEdge);
    return { x: lerp(P1[0], mouth[0], f), y: lerp(P1[1], mouth[1], f), s: lerp(S_EDGE, S_MOUTH, f) };
  };

  // ——— the hit area: the head itself, above the pit's edge ———
  let hy = REST + DROP;
  let curJ = 0;
  let rot = 0;
  const live = { on: true };
  const canHit = () => live.on && st.freedAt < 0 && !st.eaten && st.t > T.riseA + 0.55;
  a.addClickable({
    get x() {
      return hx;
    },
    get y() {
      return clamp(hy - 40, 120, ridge - 80);
    },
    r: 0,
    // (over every other prop: the head is the one thing to hit while it's up)
    priority: 3,
    label: 'kronos head',
    contains: (x, y) => {
      if (y > ridgeAt(x) - 4) return false;
      // (Kronos stands in front of his head: a click on him is his, not the head's)
      if (boss?.alive && Math.abs(x - boss.x) < boss.meta.halfWidth * boss.scale * 0.9 && y < boss.y && y > boss.y - boss.meta.footHeight * boss.scale) return false;
      const dx = x - hx;
      const dy = y - hy;
      const c = Math.cos(-rot);
      const s = Math.sin(-rot);
      return onHead((dx * c - dy * s) / S, (dx * s + dy * c) / S, curJ);
    },
    alive: canHit,
    hit: () => {
      if (!canHit()) return;
      const t = st.t;
      st.left--;
      badge?.set(st.left);
      st.flash = 1;
      st.rotV += (st.left % 2 ? 1 : -1) * 0.9;
      st.joltV -= 260 * S * 0.5;
      st.clack = 0.22;
      st.hicc = 0.14;
      const pp = a.peelPoint();
      const hxp = clamp(pp.x, hx - 480, hx + 480);
      const hyp = Math.min(pp.y, ridgeAt(hxp) - 30);
      const crit = st.left <= 0;
      a.fx.impact(hxp, hyp, crit);
      o.debris(hxp, hyp);
      for (let k = 0; k < 3; k++) add({ kind: 'dust', x: hxp + pm() * 20, y: hyp + pm() * 20, vx: pm() * 40, vy: -40 - crand() * 60, life: 0.7, s: 0.5 + crand() * 0.5 });
      a.shake(120, crit ? 0.012 : 0.004);
      if (!crit) return void a.sfx('sfx_titanking_jawhit', { throttle: 60 });
      // it chokes on its breath: the suction breaks and the pizza springs back
      a.sfx('sfx_titanking_choke');
      release(t, false);
      st.rotV += -2.4;
      a.quip(hx, Math.max(300, hy - 40 * S), 'CHOKED!', '#7dff9a', 54);
      sc.time.delayedCall(300, () => {
        a.quip(p.x, 760, 'SAVED!', '#7dff9a', 44);
        a.sfx('sfx_titanking_freed', { volume: 0.8 });
      });
      a.rumble(0.8, 260);
      o.onChoked();
    },
  });

  /** The suction breaks (choked, or broken off): what's in the air drops, the pizza springs back, the head sinks. */
  const release = (t: number, quiet: boolean) => {
    if (st.freedAt > 0 || st.eaten) return;
    // (never 0: -1 is "not freed")
    st.freedAt = Math.max(t, 1e-4);
    st.quiet = quiet;
    st.fromU = st.u;
    setSink(t + (quiet ? 0.35 : 0.95));
    badge?.destroy();
    badge = null;
    for (const b of bits)
      if (b.kind === 'top' || b.kind === 'crumb') {
        b.sucked = false;
        b.g = 1600;
        b.vx *= -0.3;
        b.vy = -200 - crand() * 200;
      }
  };

  const chomp = () => {
    st.eaten = true;
    st.take = Math.max(0, Math.min(p.slices, o.take()));
    // the bite shows on the leftover as it's spat back (the brain takes the slices for real when it lands)
    const alive = p.alive.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
    st.bitten = alive.slice(0, Math.min(st.take, alive.length - 1));
    // (drawn only: its real slices are untouched until the leftover lands)
    if (st.bitten.length) {
      const real = p.alive;
      p.alive = real.map((v, i) => v && !st.bitten.includes(i));
      p.redraw();
      p.alive = real;
    }
    root.setVisible(false);
    badge?.destroy();
    badge = null;
    a.sfx('sfx_titanking_chomp');
    sc.time.delayedCall(150, () => a.sfx('sfx_titanking_gulp'));
    a.shake(360, 0.012);
    o.quake(3, 6);
    a.quip(hx, Math.max(300, hy - 60 * S), 'CHOMP!', '#ff8a6a', 60);
    const [mx, my] = mouth;
    for (let k = 0; k < 26; k++) {
      const an = -Math.PI / 2 + pm() * 1.4;
      const v = 250 + crand() * 650;
      add({ kind: 'crumb', x: mx + pm() * 30, y: my, vx: Math.cos(an) * v, vy: Math.sin(an) * v, g: 2000, life: 1.2, s: (0.5 + crand() * 0.6) * S * 0.7, rot: crand() * 6, vr: pm() * 10 });
    }
    for (let k = 0; k < 12; k++) {
      const an = -Math.PI / 2 + pm() * 1.2;
      const v = 200 + crand() * 500;
      add({ kind: 'sauce', x: mx + pm() * 25, y: my, vx: Math.cos(an) * v, vy: Math.sin(an) * v, g: 2000, life: 0.9, s: 4 + crand() * 6 });
    }
  };

  const land = () => {
    st.landed = true;
    // (home, it's redrawn as it really is) and the brain takes the bite for real (its fx, its rules)
    homePizza();
    if (!p.dead && a.inWave()) {
      o.onGulp(st.take);
      if (st.take > 0) a.quip(p.x + 120, 840, `−${st.take} SLICE${st.take > 1 ? 'S' : ''}`, '#ffd23f', 34);
    }
    a.shake(220, 0.007);
    for (let q = 0; q < 10; q++) add({ kind: 'dust', x: p.x + pm() * 110, y: p.y + 30, vx: pm() * 150, vy: -60 - crand() * 120, life: 0.8, s: 0.6 + crand() * 0.6 });
  };

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    live.on = false;
    sc.events.off('postupdate', tick);
    sc.events.off('pause', onPause);
    sc.events.off('resume', onResume);
    sc.events.off('shutdown', finish);
    inhale?.stop();
    inhale?.destroy();
    inhale = null;
    badge?.destroy();
    for (const b of bits) b.img?.destroy();
    bits.length = 0;
    homePizza();
    if (!st.landed && st.eaten && st.bitten.length && root.active) p.redraw();
    if (boss && bossHome && boss.root.active && boss.root.parentContainer === L) bossHome.add(boss.root);
    clearLane(sc, dev);
    for (const g of [surge, head, haze, front, gNorm, gAdd, ringG]) g.destroy();
    o.onDone();
  };
  sc.events.once('shutdown', finish);

  // ——— each frame ———
  const t0 = a.now();
  let last = t0;
  let painted = true;
  const tick = () => {
    const now = a.now();
    // (the timeline runs on game time, so the window is the same however choppy the frames; the motion steps are
    // capped so a long frame doesn't fling things)
    const dt = Math.min(0.05, Math.max(0, now - last));
    last = now;
    if (now - t0 <= st.t && st.t > 0) return;
    st.t = now - t0;
    const t = st.t;
    if (t >= T.end) return finish();
    // its pizza can go (another's stomp, a perk): it lets go
    if (p.dead && st.freedAt < 0 && !st.eaten) release(t, true);

    const suck = suckAmt(t);
    // the pull: steady, tightening, reaching the mouth at the gulp; each whack jerks it back a little
    if (st.freedAt < 0 && !st.eaten && t > T.slide) {
      const target = Math.pow(sat((t - T.slide) / (T.win - T.slide)), 1.45);
      st.u += (target - st.u) * Math.min(1, dt * 14);
      if (st.hicc > 0) {
        st.u -= (0.05 * dt) / 0.14;
        st.hicc -= dt;
      }
      st.u = clamp(st.u, 0, 1);
      if (st.u > 0.002) takePizza();
    }
    if (!st.eaten && st.freedAt < 0 && t >= T.win) chomp();
    // springs
    st.rotV += -st.rot * 120 * dt - st.rotV * 9 * dt;
    st.rot += st.rotV * dt;
    st.joltV += -st.jolt * 180 * dt - st.joltV * 14 * dt;
    st.jolt += st.joltV * dt;
    st.clack = Math.max(0, st.clack - dt * 1.4);
    st.flash = Math.max(0, st.flash - dt * 6);

    hy = headY(t);
    const op = openAmt(t);
    const m0 = mouthGeom(op, suck, 0);
    curJ = m0.J;
    mouth = [hx, Math.min(hy + (m0.cy + m0.J * 0.15) * S, ridge - 18)];
    rot = st.rot * 0.06 + (st.freedAt > 0 && !st.quiet ? -0.14 * Math.sin(Math.min(1, (t - st.freedAt) / 0.9) * Math.PI) : 0);
    const surgeK = ramp(t, T.rumble, T.riseA) * (1 - ramp(t, T.riseB, T.riseB + 1)) + ramp(t, T.sinkA, T.sinkB) * (1 - ramp(t, T.sinkB, T.sinkB + 0.8)) * 0.8;
    const upK = ramp(t, T.rumble, T.riseA) * (1 - ramp(t, T.sinkB, T.end));
    const headTop = hy - 440 * S;
    // the lane steps back for it (Hold the Line's shields fade)
    obscureLane(sc, dev, Math.min(p.x - 230, hx - HEAD_HALF), Math.max(p.x + 230, hx + HEAD_HALF), ramp(t, T.rumble, T.riseA) * (1 - ramp(t, T.sinkB, T.sinkB + 0.4)));

    // ——— sound ———
    if (suck > 0.01 && !inhale && st.freedAt < 0 && !st.eaten) {
      inhale = audio.loopSfx('sfx_titanking_inhale', 0);
      inhaleVol = 0;
    }
    if (inhale) {
      const want = st.freedAt < 0 && !st.eaten ? suck * (0.75 + 0.35 * st.u) : 0;
      inhaleVol += (want - inhaleVol) * Math.min(1, dt * (want > inhaleVol ? 4 : 14));
      inhale.volume = inhaleVol * audio.sfxGain('sfx_titanking_inhale');
      if (want === 0 && inhaleVol < 0.01) {
        inhale.stop();
        inhale.destroy();
        inhale = null;
      }
    }
    if (st.eaten && t > T.win + 0.72 && t < T.sinkA) {
      st.chewT -= dt;
      if (st.chewT <= 0) {
        st.chewT = 0.63;
        a.sfx('sfx_titanking_headchew', { throttle: 200 });
      }
    }

    // ——— spawners ———
    // the pit stirs before he comes
    if (t < T.riseA + 0.5 && crand() < dt * 30) add({ kind: 'bubble', x: hx + pm() * 380, y: ridge - 2, life: 0.35 + crand() * 0.3, s: 6 + crand() * 16 });
    // the crown breaks the surface: a burst of lava and steam
    if (!st.emerged && headTop < ridge) {
      st.emerged = true;
      a.sfx('sfx_titanking_lavaburst');
      a.shake(420, 0.008);
      a.rumble(0.7, 300);
      for (let k = 0; k < 60; k++) {
        const x = hx + pm() * 300 * S;
        add({ kind: 'drop', x, y: ridge - 4, vx: (x - hx) * (0.5 + crand() * 0.8) + pm() * 100, vy: -(500 + crand() * 900), g: 2300, life: 1.6, s: 2 + crand() * 3.5 });
      }
      for (let k = 0; k < 18; k++) add({ kind: 'steam', x: hx + pm() * 350 * S, y: ridge - 10, vx: pm() * 30, vy: -80 - crand() * 120, life: 2 + crand(), s: 1.2 + crand() * 1.6 });
    }
    // lava drips off him while it drains
    const te = t - T.riseA - 0.12;
    if (te > 0 && te < 3.2 && t < T.sinkA)
      for (const s of STREAMS) {
        const front0 = streamFront(s, te);
        if (front0 === null || crand() > dt / 0.14) continue;
        const lx = s.x0 + Math.sin(front0 * 0.022 + s.ph) * 14;
        const edge = Math.abs(lx) > 240;
        if (front0 > 300 || edge || crand() < 0.25) {
          const ly = edge ? front0 : Math.max(front0, -40);
          const cs = Math.cos(rot);
          const sn = Math.sin(rot);
          add({ kind: 'drip', x: hx + (lx * cs - ly * sn) * S + (edge ? Math.sign(lx) * 14 * S : 0), y: hy + (lx * sn + ly * cs) * S, vx: edge ? Math.sign(lx) * (60 + crand() * 120) : pm() * 15, vy: 120 + crand() * 160, g: 2100, life: 1.5, s: (4 + crand() * 6) * S * 0.8 });
        }
      }
    // steam off the cooling stone
    if (te > 0 && t < T.sinkB && crand() < dt * (te < 2.5 ? 9 : 3)) add({ kind: 'steam', x: hx + pm() * 280 * S, y: hy + (-300 + crand() * 380) * S, vx: pm() * 20, vy: -60 - crand() * 70, life: 1.6 + crand() * 1.2, s: (0.8 + crand() * 1.1) * S * 0.7 });
    // embers drifting up off the pit along his lane
    if (upK > 0 && crand() < dt * 14) add({ kind: 'ember', x: hx + pm() * 700, y: 700 + crand() * 120, vx: pm() * 15, vy: -60 - crand() * 90, life: 3 + crand() * 2, s: 1.5 + crand() * 2.5, ph: crand() * 6 });
    // the pizza's place this frame
    let pz = pathAt(st.u);
    let land0 = 0;
    if (st.freedAt > 0) {
      const k = t - st.freedAt;
      const f = sat(k / 0.6);
      const u = lerp(st.fromU, 0, f < 1 ? backOut(f, 2.2) : 1);
      pz = pathAt(Math.max(0, u));
      if (u < 0) pz.y += -u * 60;
      land0 = k > 0.45 ? sat(1 - (k - 0.45) / 0.35) : 0;
      if (k > 0.8 && rootHome) homePizza();
    }
    const rs = p.s * pz.s;
    // the inhale: streaks of air and heat rush in; toppings and crumbs peel off the pizza
    if (suck > 0.05) {
      const nS = dt * 110 * suck;
      const n = Math.floor(nS) + (crand() < nS - Math.floor(nS) ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const an = (crand() < 0.75 ? 0.15 + crand() * 0.7 : -0.15 + crand() * 1.3) * Math.PI;
        const d = 260 + crand() * 820 * 0.88;
        add({ kind: 'streak', x: mouth[0] + Math.cos(an) * d * 1.3, y: mouth[1] + Math.sin(an) * d * 0.75, life: 1.4, w: 1.5 + crand() * 3.5, a: 0.18 + crand() * 0.32, warm: crand() < 0.35, sucked: true });
      }
      if (st.freedAt < 0 && !st.eaten && t > T.slide - 0.1 && !p.dead) {
        const rate = 26 * suck * (0.5 + st.u);
        const R = p.radius * pz.s;
        const topY = pz.y + (p.surfaceY - p.y) * pz.s;
        if (crand() < dt * rate) {
          const an = crand() * 6.28;
          const rr = Math.sqrt(crand());
          add({ kind: 'top', x: pz.x + Math.cos(an) * rr * R * 0.95, y: topY + Math.sin(an) * rr * R * 0.45, vx: pm() * 30, vy: -80 - crand() * 120, life: 4, s: (0.55 + crand() * 0.45) * rs * 1.3, s0: rs, rot: crand() * 6, vr: pm() * 8, sucked: true });
        }
        if (crand() < dt * rate * 0.9) add({ kind: 'crumb', x: pz.x + pm() * R, y: topY + pm() * 0.3 * R, vy: -60, life: 4, s: (0.6 + crand() * 0.6) * rs * 1.4, s0: rs, rot: crand() * 6, vr: pm() * 10, sucked: true });
        if (crand() < dt * 14 * suck) add({ kind: 'dust', x: pz.x + pm() * R * 1.4, y: pz.y + 30 * pz.s, vy: -20, life: 1.4, s: 0.5 + crand() * 0.7, sucked: true });
      }
    }
    // sinking: the lava closes over him
    if (t > T.sinkA && t < T.sinkB + 0.2 && crand() < dt * 26) add({ kind: 'bubble', x: hx + pm() * 330, y: ridge - 2, life: 0.3 + crand() * 0.3, s: 8 + crand() * 18 });
    if (!st.sunk && t > T.sinkA) {
      st.sunk = true;
      a.sfx('sfx_titanking_sink');
    }
    if (st.sunk && headTop > ridge - 60 && !st.splashed) {
      st.splashed = true;
      a.shake(300, 0.006);
      a.sfx('sfx_titanking_lavaburst', { volume: 0.7, rate: 0.9 });
      for (let k = 0; k < 60; k++) add({ kind: 'drop', x: hx + pm() * 260 * S, y: ridge - 4, vx: pm() * 250, vy: -(400 + crand() * 800), g: 2300, life: 1.4, s: 2 + crand() * 3.5 });
      for (let k = 0; k < 14; k++) add({ kind: 'steam', x: hx + pm() * 250 * S, y: ridge - 12, vx: pm() * 30, vy: -90 - crand() * 110, life: 2 + crand(), s: 1.3 + crand() * 1.5 });
    }

    // ——— integrate ———
    const [mx, my] = mouth;
    for (const b of bits) {
      b.age += dt;
      if (b.sucked && suck > 0.01) {
        const dx = mx - b.x;
        const dy = my - b.y;
        const d = Math.hypot(dx, dy) + 1;
        const pull = (b.kind === 'streak' ? 5200 : 2600) * suck * (0.35 + 260 / d);
        b.vx += ((dx / d) * pull + (-dy / d) * pull * 0.22) * dt;
        b.vy += ((dy / d) * pull + (dx / d) * pull * 0.22) * dt;
        const drag = b.kind === 'streak' ? 2.2 : 1.6;
        b.vx -= b.vx * drag * dt;
        b.vy -= b.vy * drag * dt;
        if (d < (b.kind === 'streak' ? 30 : 22 + 30 * S * 0.5)) b.age = b.life + 1;
        if (b.s0) {
          if (!b.d0) b.d0 = d;
          b.depth = sat(1 - d / b.d0);
        }
      } else if (b.sucked && b.kind === 'streak') {
        b.vx *= 1 - 3 * dt;
        b.vy *= 1 - 3 * dt;
        b.age += dt * 2;
      }
      if (b.g) b.vy += b.g * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.vr) b.rot = (b.rot ?? 0) + b.vr * dt;
      if ((b.kind === 'drop' || b.kind === 'drip') && b.vy > 0 && b.y > ridgeAt(b.x) - 2) {
        b.age = b.life + 1;
        if (crand() < 0.5) for (let k = 0; k < 2; k++) add({ kind: 'spark', x: b.x, y: ridgeAt(b.x) - 4, vx: pm() * 80, vy: -120 - crand() * 200, g: 1400, life: 0.4, s: 2 + crand() * 2 });
      }
      if ((b.kind === 'top' || b.kind === 'crumb') && !b.sucked && b.g && b.y > p.y + 40) b.age = b.life + 1;
      if (b.kind === 'steam' && suck > 0.1 && b.age > 0.2) b.sucked = true;
      if (b.kind === 'ember' && suck > 0.1 && Math.hypot(b.x - mx, b.y - my) < 700) b.sucked = true;
    }
    for (let i = bits.length - 1; i >= 0; i--)
      if (bits[i].age > bits[i].life) {
        bits[i].img?.destroy();
        bits.splice(i, 1);
      }

    // ——— the pizza ———
    const threat = sat((t - T.riseA) / 0.8) * (st.freedAt > 0 ? 1 - sat((t - st.freedAt - 0.5) / 0.5) : 1);
    let inMouth: ((c: Ctx, m: Mouth) => void) | undefined;
    if (rootHome && root.active) {
      let x = pz.x;
      let y = pz.y;
      let s = pz.s;
      let rr = 0;
      let sx = 1;
      let sy = 1;
      let show = true;
      if (st.eaten) {
        const k = t - T.win;
        const ts0 = 0.36;
        const ts1 = 0.98;
        show = k >= ts0;
        if (show && st.spitAt < 0) {
          st.spitAt = t;
          p.hurt();
          a.sfx('sfx_titanking_chomp', { volume: 0.55, rate: 1.45 });
        }
        const f = sat((k - ts0) / (ts1 - ts0));
        x = lerp(mx, p.x, f);
        y = lerp(my, p.y, f) - Math.sin(f * Math.PI) * 300;
        s = lerp(S_MOUTH, 1, eIn(f) * 0.5 + f * 0.5);
        rr = (1 - f) * 4.5;
        if (k >= ts1 && !st.landed) land();
      } else {
        const wob = suck * (st.freedAt > 0 ? 0 : 1);
        rr = Math.sin(t * 17) * 0.06 * wob + Math.sin(t * 6.1) * 0.05 * wob * st.u;
        y += -Math.abs(Math.sin(t * 13)) * 6 * wob * s;
        // stretched toward the mouth
        const str = wob * (0.06 + 0.22 * st.u);
        sx = 1 - str * 0.5;
        sy = 1 + str * 0.3;
        if (land0) {
          sx = 1 + 0.18 * land0 * Math.sin(land0 * 10);
          sy = 1 - 0.18 * land0 * Math.sin(land0 * 10);
        }
        // the last stretch: it's inside the mouth, behind the teeth
        if (st.u > 0.9 && st.freedAt < 0) {
          show = false;
          const f = sat((st.u - 0.9) / 0.1);
          const ix = x;
          const iy = y;
          const is = s;
          inMouth = (c) => {
            c.save();
            c.setTransform(RES_K, 0, 0, RES_K, -x0 * RES_K, 0);
            c.translate(ix, iy);
            c.rotate(Math.sin(t * 20) * 0.12);
            c.scale(is * (1 - 0.3 * f) * (1 - 0.25 * f), is * (1 - 0.3 * f) * (1 + 0.3 * f));
            for (const ch of root.list) paintGO(c, ch);
            c.restore();
          };
        }
      }
      if (rootHome) {
        root.setPosition(x, y).setRotation(rr).setScale(s * sx, s * sy).setVisible(show && !(st.eaten && st.landed));
        // (its caption stays behind, hidden, until it's home)
        const away = st.eaten ? 1 : sat(1 - s) * 3;
        for (const e of extras) e.o.setAlpha(e.a * sat(1 - away));
      }
    }
    if (!p.dead && root.active && (rootHome || st.freedAt < 0)) p.update(0, hx, st.eaten ? 0.4 : threat);

    // ——— draw the head ———
    const vis = hy - 460 * S < ridge + 10;
    head.setVisible(vis);
    // (the canvas is only repainted and re-uploaded while there's something on it, and once more to clear it)
    const paint = vis || bits.some((b) => b.kind === 'drop' || b.kind === 'drip' || b.kind === 'bubble' || b.kind === 'spark');
    if (paint || painted) {
      painted = paint;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, tex.width, tex.height);
      ctx.save();
      ctx.setTransform(RES_K, 0, 0, RES_K, -x0 * RES_K, 0);
      // (everything here is behind the pit's edge)
      ctx.beginPath();
      ctx.moveTo(x0 - 10, -10);
      ctx.lineTo(x0 + CW + 10, -10);
      for (let x = Math.ceil((x0 + CW) / 40) * 40; x >= Math.floor(x0 / 40) * 40; x -= 40) ctx.lineTo(x, ridgeAt(x) - 3);
      ctx.closePath();
      ctx.clip();
      if (vis) {
        const H: HeadState = {
          x: hx,
          y: hy,
          S,
          rot,
          open: op,
          suck,
          puff: puffAmt(t),
          glow: glowAmt(t),
          snarl: ramp(t, T.ignite, T.ignite + 0.3) * (1 - suck) * 0.6 + (st.freedAt > 0 && !st.quiet ? 0.5 : 0),
          crack: sat(0.35 + 0.25 * Math.sin(t * 4) + 0.55 * suck * (0.7 + 0.3 * Math.sin(t * 11)) + st.flash * 0.6 + (t > T.ignite ? 0.15 : 0)) * (t > T.ignite - 0.2 ? 1 : 0.5),
          flash: st.flash,
          daze: st.freedAt > 0 && !st.quiet ? sat((t - st.freedAt) / 0.2) * (0.6 + 0.4 * Math.sin((t - st.freedAt) * 12)) : 0,
          ridgeY: ridge,
          t,
          under: 0.6 + 0.4 * sat(1 - (ridge - hy) / (500 * S)) + 0.3 * surgeK,
          lavaT: te,
          inMouth,
        };
        drawHead(ctx, H);
      }
      // what falls back into the pit
      for (const b of bits) {
        const k = b.age / b.life;
        if (b.kind === 'drop' || b.kind === 'drip') {
          const sp = Math.hypot(b.vx, b.vy) + 1;
          const ln = Math.min(3.2, 1 + sp / 500);
          const heat = 1 - k * 0.7;
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(Math.atan2(b.vy, b.vx));
          ctx.fillStyle = 'rgba(60,10,4,0.55)';
          ctx.beginPath();
          ctx.ellipse(0, 0, b.s * ln + 1.2, b.s + 1.2, 0, 0, 7);
          ctx.fill();
          ctx.fillStyle = rampColor([[0, '#c8300a'], [0.6, '#ff8a1a'], [1, '#ffe08a']], heat);
          ctx.beginPath();
          ctx.ellipse(0, 0, b.s * ln, b.s, 0, 0, 7);
          ctx.fill();
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = `rgba(255,140,40,${0.22 * heat})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, b.s * ln * 1.8, b.s * 2, 0, 0, 7);
          ctx.fill();
          ctx.restore();
        } else if (b.kind === 'bubble') {
          const r0 = b.s * (0.4 + k);
          ctx.save();
          ctx.beginPath();
          ctx.arc(b.x, b.y, r0, Math.PI, 0);
          ctx.fillStyle = rampColor([[0, '#ffb040'], [1, '#c8400a']], k);
          ctx.globalAlpha = 1 - k * 0.6;
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(60,10,4,0.8)';
          ctx.stroke();
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = `rgba(255,140,40,${0.35 * (1 - k)})`;
          ctx.beginPath();
          ctx.arc(b.x, b.y, r0 * 2.2, 0, 7);
          ctx.fill();
          ctx.restore();
        } else if (b.kind === 'spark') {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = `rgba(255,200,90,${1 - k})`;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.s, 0, 7);
          ctx.fill();
          ctx.restore();
        }
      }
      ctx.restore();
      tex.refresh();
    }
    surge.setAlpha(0.55 * surgeK);
    haze.setAlpha((0.32 + 0.2 * surgeK) * upK * (vis ? 1 : 0.4));

    // ——— what flies in front ———
    gNorm.clear();
    gAdd.clear();
    // the pull: a faint cone of heat down the lane, rippling (the heat shimmer)
    if (suck > 0.02 && st.freedAt < 0 && !st.eaten) {
      gAdd.fillStyle(0xffaa5a, 0.05 * suck);
      gAdd.fillPoints([new Phaser.Math.Vector2(mx - 24, my), new Phaser.Math.Vector2(p.x - 260, p.y + 60), new Phaser.Math.Vector2(p.x + 260, p.y + 60), new Phaser.Math.Vector2(mx + 24, my)], true);
      for (let i = 0; i < 9; i++) {
        const f = ((i / 9 + t * 0.9) % 1) ** 1.3;
        const yy = lerp(p.y + 20, my + 6, f);
        const half = lerp(240, 30, f);
        const cx = lerp(p.x, mx, f);
        gAdd.lineStyle(2 + 3 * (1 - f), 0xffd0a0, 0.12 * suck * Math.sin(f * Math.PI));
        gAdd.beginPath();
        for (let k = 0; k <= 12; k++) {
          const xx = cx - half + (k / 12) * half * 2;
          const yv = yy + Math.sin(k * 1.3 + t * 16 + i) * 3;
          if (k) gAdd.lineTo(xx, yv);
          else gAdd.moveTo(xx, yv);
        }
        gAdd.strokePath();
      }
    }
    for (const b of bits) {
      const k = b.age / b.life;
      switch (b.kind) {
        case 'streak': {
          const sp = Math.hypot(b.vx, b.vy);
          if (sp < 20) break;
          const ln = Math.min(260, sp * 0.06);
          const al = (b.a ?? 0.3) * Math.min(1, b.age / 0.15) * (1 - k);
          const ux = b.vx / sp;
          const uy = b.vy / sp;
          const col = b.warm ? 0xffbe78 : 0xfff8eb;
          gAdd.lineStyle(b.w ?? 2, col, al);
          gAdd.lineBetween(b.x, b.y, b.x - ux * ln * 0.5, b.y - uy * ln * 0.5);
          gAdd.lineStyle((b.w ?? 2) * 0.8, col, al * 0.45);
          gAdd.lineBetween(b.x - ux * ln * 0.5, b.y - uy * ln * 0.5, b.x - ux * ln, b.y - uy * ln);
          break;
        }
        case 'ember': {
          const al = Math.sin(Math.PI * k) * (0.6 + 0.4 * Math.sin(t * 12 + (b.ph ?? 0)));
          gAdd.fillStyle(0xffaa3c, 0.9 * al);
          gAdd.fillCircle(b.x, b.y, b.s);
          gAdd.fillStyle(0xff781e, 0.25 * al);
          gAdd.fillCircle(b.x, b.y, b.s * 3.2);
          break;
        }
        case 'sauce':
          gNorm.fillStyle(0xbe2818, 1 - k);
          gNorm.fillCircle(b.x, b.y, b.s);
          break;
        case 'top':
        case 'crumb': {
          const img = b.img!;
          const dsc = b.s0 ? lerp(1, (S_MOUTH / Math.max(0.3, b.s0 / p.s)) * 0.8 * (b.s0 / p.s), b.depth ?? 0) : 1;
          const sp = Math.hypot(b.vx, b.vy);
          const stretch = sp > 300 ? Math.min(0.6, sp / 3000) : 0;
          img.setPosition(b.x, b.y).setRotation(b.rot ?? 0).setScale(b.s * dsc * (1 + stretch) * (b.kind === 'crumb' ? 1 : 0.85), b.s * dsc * (1 - stretch * 0.4) * (b.kind === 'crumb' ? 1 : 0.85)).setAlpha(b.sucked ? 1 : 1 - ramp(k, 0.6, 1));
          break;
        }
        case 'steam':
          b.img!.setPosition(b.x, b.y).setDisplaySize(b.s * (1 + k * 1.6) * 120, b.s * (1 + k * 1.6) * 120).setAlpha(sat(0.11 * Math.sin(Math.PI * Math.min(1, k * 1.2))) * 1.6);
          break;
        case 'dust':
          b.img!.setPosition(b.x, b.y).setDisplaySize(b.s * (1 + k * 1.5) * 90, b.s * (1 + k * 1.5) * 90).setAlpha(0.28 * (1 - k));
          break;
        default:
          break;
      }
    }

    // ——— the ring and its counter ———
    ringG.clear();
    const ringOn = t > T.prep + 0.1 && st.freedAt < 0 && !st.eaten;
    if (ringOn) {
      const k = sat(1 - (t - T.suck) / (T.win - T.suck));
      const pop = sat((t - T.prep - 0.1) / 0.25);
      const rcx = hx;
      const rcy = hy + RING_DY;
      const R = RING_R * backOut(pop);
      ringG.lineStyle(12, 0x2a1810, 0.85).strokeCircle(rcx, rcy, R);
      ringG.lineStyle(7, k < 0.3 ? 0xff5a3c : 0xff8a6a, 1).beginPath().arc(rcx, rcy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k).strokePath();
      // (its hit counter rides the ring on the side towards the screen's edge, a little below its middle: clear of
      // the boss bar and his shield's timer over the top of the ring, and of Kronos in the middle)
      const side = hx < W / 2 ? -1 : 1;
      if (!badge) badge = o.counter(() => (live.on && st.freedAt < 0 && !st.eaten ? [clamp(hx + side * RING_R * 0.94, 150, W - 60), hy + RING_DY + RING_R * 0.34] : null), st.left);
    }
  };
  // (also the owner of the lane flag)
  const dev: Devour = {
    p,
    get pulling() {
      return st.freedAt < 0 && !st.eaten;
    },
    abort: () => {
      if (done) return;
      if (st.freedAt < 0 && !st.eaten) release(st.t, true);
      else if (st.eaten && !st.landed) {
        land();
        setSink(Math.min(T.sinkA, st.t));
      } else setSink(Math.min(T.sinkA, st.t));
    },
  };
  sc.events.on('postupdate', tick);
  return dev;
}
