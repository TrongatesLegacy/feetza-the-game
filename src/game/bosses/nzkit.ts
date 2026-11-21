// Shared helpers for the nemesis bosses (Kratos's, the Doom Lab's and Metropizza's: src/game/bosses/kratos.ts,
// doomlab.ts, metro.ts). The arena swap, the bin a fight's props go in, an entrance that drops the boss in, a death
// that breaks it into pieces of itself, a Mild-friendly pizza hit, and a timer ring for countdown props. The kit
// itself (hitProp, takeLane, shield…) is in ./kit.ts.

import Phaser from 'phaser';
import { BACKDROPS, type ArenaId, type BackdropId } from '../../art/backdrops';
import { HOVER_Y } from '../../config';
import { audio } from '../../systems/audio';
import type { Arena } from '../arena';
import { ART_RES, addCanvas } from '../assets';
import type { Foot } from '../Foot';
import type { Pizza } from '../Pizza';
import { LOCATION_MUSIC, bossMusic, locationFor } from '../Run';
import { heat } from './kit';

/** Game y below the boss bar and its move line: anything the player must hit sits below this. */
export const SAFE_TOP = 260;

/** Things a fight has put on the table, cleared together when the boss goes down. */
export class Bin {
  private items = new Set<() => void>();
  add(fn: () => void): () => void {
    this.items.add(fn);
    return () => {
      if (!this.items.delete(fn)) return;
      fn();
    };
  }
  flush(): void {
    const all = [...this.items];
    this.items.clear();
    for (const fn of all) fn();
  }
}

/** Scene internals the set-pieces reach for (the Arena has no call for them). */
interface SceneBits {
  backdrop?: { show(id: BackdropId, fadeMs?: number): void };
  tintGrade(hex: string, ms: number): void;
  currentBackdrop: BackdropId | null;
  run: { wave: number };
}
const bits = (a: Arena) => a as unknown as SceneBits;

/** A mini-boss takes the stage: its arena and music crossfade in over the location (a main boss's are already up). */
export function enterArena(a: Arena, id: ArenaId): void {
  const sc = bits(a);
  if (!sc.backdrop || !BACKDROPS[id]) return;
  if (sc.currentBackdrop !== id) {
    sc.backdrop.show(id, 1400);
    sc.tintGrade(BACKDROPS[id].light, 1400);
    sc.currentBackdrop = id;
  }
  void audio.music(a.sc, bossMusic(id), 1200);
}

/** …and gives the location back when it goes down. */
export function leaveArena(a: Arena): void {
  const sc = bits(a);
  if (!a.inWave() || !sc.backdrop) return;
  const loc = locationFor(sc.run.wave);
  sc.backdrop.show(loc, 1800);
  sc.tintGrade(BACKDROPS[loc].light, 1800);
  sc.currentBackdrop = loc;
  void audio.music(a.sc, LOCATION_MUSIC[loc], 1800);
}

/** Run something once, the first frame the brain ticks. */
export const once = () => {
  let done = false;
  return (fn: () => void) => {
    if (done) return;
    done = true;
    fn();
  };
};

/** Hit a pizza, but on Mild never take its last slice. */
export function hitSoft(a: Arena, p: Pizza, n: number, label: string, color: string): void {
  if (p.dead) return;
  const take = heat(a).rank === 0 ? Math.min(n, p.slices - 1) : n;
  if (take <= 0) {
    a.quip(p.x, p.surfaceY - 150, 'HANGING ON!', '#ffd23f', 34);
    return;
  }
  a.hitPizza(p, take, label, color);
}

/** The boss drops in from above (or rises, with `from: 'below'`), lands with a crash and can't be hurt until it has. */
export function entrance(a: Arena, f: Foot, o: { sfx: string; quip: string; color: string; flash: [number, number, number]; ring?: number; delay?: number; ms?: number; onLanded?: () => void }): void {
  f.puppet = true;
  const was = f.shielded;
  f.shielded = true;
  const hy = (f.hoverY ?? HOVER_Y) - 20;
  f.y = -480;
  a.sc.tweens.add({
    targets: f,
    y: hy,
    delay: o.delay ?? 250,
    duration: o.ms ?? 700,
    ease: 'Quad.In',
    onComplete: () => {
      if (!f.alive) return;
      a.sfx(o.sfx);
      a.shake(620, 0.014);
      a.rumble(1, 380);
      a.flash(240, ...o.flash);
      a.fx.ring(f.x, f.y, o.ring ?? 0xffffff, 2, 0.4);
      for (let i = 0; i < 10; i++) a.fx.puff(f.x + (Math.random() - 0.5) * 260, f.y + (Math.random() - 0.5) * 60, 2);
      a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 170), o.quip, o.color, 50);
      const sx = f.root.scaleX;
      const sy = f.root.scaleY;
      a.sc.tweens.add({ targets: f.root, scaleY: sy * 0.8, scaleX: sx * 1.14, duration: 120, yoyo: true, ease: 'Quad.Out', onComplete: () => f.root.setScale(sx, sy) });
      a.sc.time.delayedCall(500, () => {
        f.puppet = false;
        f.shielded = was;
        o.onLanded?.();
      });
    },
  });
}

const shardKeys = new Map<string, string[]>();

/** Break a foot's art into jagged pieces (canvas cut-outs, made once per foot type). */
function shardsOf(a: Arena, f: Foot, n: number): string[] {
  const have = shardKeys.get(f.type.id);
  if (have) return have;
  const src = a.sc.textures.get(f.meta.footKey).getSourceImage() as HTMLCanvasElement;
  const keys: string[] = [];
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const cw = src.width / cols;
  const ch = src.height / rows;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const c = document.createElement('canvas');
      c.width = Math.ceil(cw);
      c.height = Math.ceil(ch);
      const ctx = c.getContext('2d')!;
      ctx.beginPath();
      for (let k = 0; k < 7; k++) {
        const ang = (k / 7) * Math.PI * 2;
        const rr = 0.42 + Math.random() * 0.16;
        const px = cw / 2 + Math.cos(ang) * cw * rr;
        const py = ch / 2 + Math.sin(ang) * ch * rr;
        if (k) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(src, i * cw, j * ch, cw, ch, 0, 0, cw, ch);
      const key = `shardnz_${f.type.id}_${keys.length}`;
      addCanvas(a.sc, key, c);
      keys.push(key);
    }
  shardKeys.set(f.type.id, keys);
  return keys;
}

/** A death that lands: a slow-mo beat, a flash, and the boss bursting into pieces of itself. */
export function shatter(a: Arena, f: Foot, o: { tint?: number; burst?: number; n?: number; sfx?: string } = {}): void {
  const keys = shardsOf(a, f, o.n ?? 9);
  const s = f.root.scaleX / ART_RES;
  const src = a.sc.textures.get(f.meta.footKey).getSourceImage() as HTMLCanvasElement;
  const cols = Math.ceil(Math.sqrt(keys.length));
  const rows = Math.ceil(keys.length / cols);
  const x0 = f.x - (src.width * s) / 2;
  const y0 = f.y - src.height * s * f.meta.originY;
  a.dramatic(1);
  if (o.sfx) a.sfx(o.sfx);
  a.shake(700, 0.016);
  a.rumble(1, 480);
  keys.forEach((k, i) => {
    const cx = x0 + ((i % cols) + 0.5) * (src.width / cols) * s;
    const cy = y0 + (Math.floor(i / cols) + 0.5) * (src.height / rows) * s;
    const img = a.sc.add.image(cx, cy, k).setScale(s);
    if (o.tint !== undefined) img.setTint(o.tint);
    a.fxLayer.add(img);
    const dx = (cx - f.x) * 2.2 + (Math.random() - 0.5) * 300;
    a.sc.tweens.add({ targets: img, x: cx + dx, duration: 1300, ease: 'Quad.Out' });
    a.sc.tweens.add({ targets: img, y: cy - 260 - Math.random() * 200, duration: 450, ease: 'Quad.Out', yoyo: true, hold: 60, onComplete: () => a.sc.tweens.add({ targets: img, y: 1200, duration: 700, ease: 'Quad.In', onComplete: () => img.destroy() }) });
    a.sc.tweens.add({ targets: img, angle: (Math.random() - 0.5) * 720, duration: 1800 });
  });
  a.fx.party(f.cx, f.cy, 70);
  if (o.burst !== undefined) {
    const gl = a.sc.add.image(f.cx, f.cy, 'glow').setTint(o.burst).setBlendMode(Phaser.BlendModes.ADD).setScale(0.5).setAlpha(0.9);
    a.fxLayer.add(gl);
    a.sc.tweens.add({ targets: gl, scale: 6, alpha: 0, duration: 900, ease: 'Quad.Out', onComplete: () => gl.destroy() });
  }
}

/** Bits fly off and tumble (sand, links, shards). */
export function scatter(a: Arena, x: number, y: number, key: string, n: number, look: { scale?: number; tints?: number[]; spread?: number } = {}): void {
  for (let i = 0; i < n; i++) {
    const img = a.sc.add.image(x, y, key).setScale((look.scale ?? 0.5) * (0.6 + Math.random() * 0.7)).setAngle(Math.random() * 360);
    if (look.tints) img.setTint(look.tints[i % look.tints.length]);
    a.fxLayer.add(img);
    const vx = (Math.random() - 0.5) * (look.spread ?? 1300);
    const vy = -320 - Math.random() * 700;
    const spin = (Math.random() - 0.5) * 900;
    const st = { t: 0 };
    a.sc.tweens.add({
      targets: st,
      t: 1.6,
      duration: 1600,
      onUpdate: () => {
        img.setPosition(x + vx * st.t, y + vy * st.t + 900 * st.t * st.t);
        img.angle += spin * 0.016;
        img.setAlpha(Math.min(1, (1.6 - st.t) * 2));
      },
      onComplete: () => img.destroy(),
    });
  }
}

/** A countdown ring round a prop: it drains as `left()` falls from 1 to 0 (redrawn each frame, removed with `end`). */
export function timerRing(a: Arena, at: () => { x: number; y: number } | null, r: number, color: number, left: () => number): () => void {
  const g = a.sc.add.graphics();
  a.fxLayer.add(g);
  const ev = a.sc.time.addEvent({
    delay: 16,
    loop: true,
    callback: () => {
      const p = at();
      g.clear();
      if (!p) return;
      const k = Phaser.Math.Clamp(left(), 0, 1);
      g.lineStyle(12, 0x2a1810, 0.85);
      g.strokeCircle(p.x, p.y, r);
      g.lineStyle(7, k < 0.3 ? 0xff5a3c : color, 1);
      g.beginPath();
      g.arc(p.x, p.y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
      g.strokePath();
    },
  });
  return () => {
    ev.remove();
    g.destroy();
  };
}

/** The pizzas left to right. */
export const lanePizzas = (a: Arena) => [...a.alivePizzas()].sort((p, q) => p.x - q.x);

/** A medallion or banner flies in from the side, holds and flies off (an Olympian answering the call). */
export function cameo(a: Arena, key: string, from: 1 | -1, y: number, text: string, color: string, sfx?: string): void {
  const img = a.sc.add.image(from > 0 ? 2160 : -240, y, key).setScale(0.9);
  a.fxLayer.add(img);
  if (sfx) a.sfx(sfx);
  a.sc.tweens.add({
    targets: img,
    x: 960 + from * 300,
    angle: from * -360,
    duration: 520,
    ease: 'Back.Out',
    onComplete: () => {
      a.quip(img.x, y + 130, text, color, 40);
      a.fx.ring(img.x, img.y, 0xffd23f, 1.2, 0.4);
      a.sc.tweens.add({ targets: img, scale: 1.05, duration: 160, yoyo: true, repeat: 2 });
      a.sc.tweens.add({ targets: img, x: from > 0 ? 2200 : -280, alpha: 0.4, delay: 1300, duration: 420, ease: 'Quad.In', onComplete: () => img.destroy() });
    },
  });
}
