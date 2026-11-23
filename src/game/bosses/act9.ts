// Boss brains, Act 9 · Greek myths (waves 81–90): the Minotaur (mini, wave 83), Medusa (wave 85),
// Cerberus (mini, wave 88) and Hades and the Titans (wave 90). Shared helpers and heat scaling are in
// ./kit.ts; this act's props are drawn in src/content/props/act9.ts, the feet in src/content/feet/act9.ts.

import Phaser from 'phaser';
import { PIZZA_R } from '../../art/pizzaArt';
import { HOVER_Y, W } from '../../config';
import { HEAT_BY_ID } from '../../data/difficulty';
import { save } from '../../systems/save';
import { bits, enterArena, leaveArena } from '../acts/act9';
import type { Arena } from '../arena';
import { addCanvas } from '../assets';
import type { Foot } from '../Foot';
import type { Pizza } from '../Pizza';
import { type Brain, type PhaseCard, type Prop, type Takeover, Every, dropOn, heat, hitProp, laneOf, mark, rnd, shield, takeLane, throwAtPeel } from './kit';

// ——— Act helpers ———

/** Things a fight has put on the table, cleared together when the boss goes down. */
class Bin {
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

/** The private sprite inside a foot or pizza (for tints and textures). */
const imgOf = (o: Foot | Pizza) => (o as unknown as { img: Phaser.GameObjects.Image }).img;

/** Game y below the boss bar and its move line: anything the player must hit sits below this. */
const SAFE_TOP = 260;

const lanePizzas = (a: Arena) => [...a.alivePizzas()].sort((p, q) => p.x - q.x);

const shuffled = <T>(xs: T[]): T[] => {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** A glowing column down a pizza's lane (a charge path, a stare), redrawn each frame until removed. */
function laneGlow(a: Arena, at: () => number, color: number, top: number, bottom: number, w = 150): { set(k: number): void; end(): void } {
  const g = a.sc.add.graphics().setAlpha(0);
  a.fxLayer.addAt(g, 0);
  a.sc.tweens.add({ targets: g, alpha: 1, duration: 160 });
  let k = 0;
  const draw = () => {
    const x = at();
    const pulse = 0.75 + Math.sin(a.now() * 12) * 0.25;
    g.clear();
    g.fillStyle(color, (0.1 + 0.16 * k) * pulse).fillRoundedRect(x - w / 2, top, w, bottom - top, 36);
    g.lineStyle(9, 0x2a1810, 0.35).strokeRoundedRect(x - w / 2, top, w, bottom - top, 36);
    g.lineStyle(5, color, 0.55 + 0.4 * pulse).strokeRoundedRect(x - w / 2, top, w, bottom - top, 36);
    // chevrons running down the lane, faster as it gets closer
    const step = 70;
    const off = (a.now() * (140 + 260 * k)) % step;
    for (let cy = top + 40 + off; cy < bottom - 40; cy += step) {
      const pts = [new Phaser.Math.Vector2(x - 26, cy - 12), new Phaser.Math.Vector2(x, cy + 10), new Phaser.Math.Vector2(x + 26, cy - 12)];
      g.lineStyle(13, 0x2a1810, 0.45).strokePoints(pts, false);
      g.lineStyle(7, color, 0.95).strokePoints(pts, false);
    }
  };
  const ev = a.sc.time.addEvent({ delay: 16, loop: true, callback: draw });
  draw();
  let ended = false;
  return {
    set: (v) => (k = v),
    end: () => {
      if (ended) return;
      ended = true;
      ev.remove();
      a.sc.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
    },
  };
}

/** The boss's entrance: it drops in from above, lands with a crash, and can't be hurt until it has landed. */
function entrance(a: Arena, f: Foot, o: { sfx: string; quip: string; color: string; flash: [number, number, number]; delay?: number; onLanded?: () => void }): void {
  f.puppet = true;
  const was = f.shielded;
  f.shielded = true;
  const hy = (f.hoverY ?? HOVER_Y) - 20;
  f.y = -460;
  a.sc.tweens.add({
    targets: f,
    y: hy,
    delay: o.delay ?? 250,
    duration: 650,
    ease: 'Quad.In',
    onComplete: () => {
      if (!f.alive) return;
      a.sfx(o.sfx);
      a.shake(520, 0.012);
      a.rumble(0.9, 320);
      a.flash(220, ...o.flash);
      a.fx.ring(f.x, f.y, 0xffffff, 1.8, 0.4);
      for (let i = 0; i < 8; i++) a.fx.puff(f.x + (Math.random() - 0.5) * 220, f.y + (Math.random() - 0.5) * 60, 2);
      a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 170), o.quip, o.color, 52);
      const sx = f.root.scaleX;
      const sy = f.root.scaleY;
      a.sc.tweens.add({ targets: f.root, scaleY: sy * 0.82, scaleX: sx * 1.12, duration: 110, yoyo: true, ease: 'Quad.Out', onComplete: () => f.root.setScale(sx, sy) });
      a.sc.time.delayedCall(450, () => {
        f.puppet = false;
        f.shielded = was;
        o.onLanded?.();
      });
    },
  });
}

const shardKeys = new Map<string, string[]>();

/** Break a foot's art into pieces (canvas cut-outs, made once per foot type). */
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
      // a jagged cut, so the pieces read as broken rather than tiled
      ctx.beginPath();
      const pts = 7;
      for (let k = 0; k < pts; k++) {
        const ang = (k / pts) * Math.PI * 2;
        const rr = 0.42 + Math.random() * 0.16;
        const px = cw / 2 + Math.cos(ang) * cw * rr;
        const py = ch / 2 + Math.sin(ang) * ch * rr;
        if (k) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(src, i * cw, j * ch, cw, ch, 0, 0, cw, ch);
      const key = `shard9_${f.type.id}_${keys.length}`;
      addCanvas(a.sc, key, c);
      keys.push(key);
    }
  shardKeys.set(f.type.id, keys);
  return keys;
}

/** A death that lands: a slow-mo beat, a flash, and the boss bursting into pieces of itself. */
function shatter(a: Arena, f: Foot, o: { tint?: number; burst?: number; n?: number; sfx?: string } = {}): void {
  const keys = shardsOf(a, f, o.n ?? 9);
  const s = f.root.scaleX / f.meta.textures.res;
  const src = a.sc.textures.get(f.meta.footKey).getSourceImage() as HTMLCanvasElement;
  const cols = Math.ceil(Math.sqrt(keys.length));
  const rows = Math.ceil(keys.length / cols);
  const x0 = f.x - (src.width * s) / 2;
  const y0 = f.y - src.height * s * f.meta.originY;
  a.dramatic(0.9);
  if (o.sfx) a.sfx(o.sfx);
  a.shake(600, 0.014);
  a.rumble(1, 400);
  keys.forEach((k, i) => {
    const cx = x0 + ((i % cols) + 0.5) * (src.width / cols) * s;
    const cy = y0 + (Math.floor(i / cols) + 0.5) * (src.height / rows) * s;
    const img = a.sc.add.image(cx, cy, k).setScale(s);
    if (o.tint !== undefined) img.setTint(o.tint);
    a.fxLayer.add(img);
    const dx = (cx - f.x) * 2.2 + (Math.random() - 0.5) * 300;
    a.sc.tweens.add({ targets: img, x: cx + dx, duration: 1300, ease: 'Quad.Out' });
    a.sc.tweens.add({ targets: img, y: cy - 260 - Math.random() * 200, duration: 450, ease: 'Quad.Out', yoyo: true, hold: 60, onComplete: () => a.sc.tweens.add({ targets: img, y: 1200, duration: 700, ease: 'Quad.In', onComplete: () => img.destroy() }) });
    a.sc.tweens.add({ targets: img, angle: (Math.random() - 0.5) * 720, alpha: { from: 1, to: 0.85 }, duration: 1800 });
  });
  a.fx.party(f.cx, f.cy, 70);
  if (o.burst !== undefined) {
    const g = a.sc.add.image(f.cx, f.cy, 'glow').setTint(o.burst).setBlendMode(Phaser.BlendModes.ADD).setScale(0.5).setAlpha(0.9);
    a.fxLayer.add(g);
    a.sc.tweens.add({ targets: g, scale: 6, alpha: 0, duration: 900, ease: 'Quad.Out', onComplete: () => g.destroy() });
  }
}

/** Run something once, the first frame the brain ticks. */
const once = () => {
  let done = false;
  return (fn: () => void) => {
    if (done) return;
    done = true;
    fn();
  };
};

// ——— 25. THE MINOTAUR (mini-boss, wave 83) ———
// The table becomes a maze: stone walls stand behind some pizzas (feet can't get at them, and nor can
// he). He only charges where the maze is open. Smacking him while he paws the ground sends him blind
// into a wall instead. The walls shift every phase.

/** Where a maze wall's foot stands: just behind its pizza, on the table. */
const WALL_Y = 812;
const WALL_TOP = WALL_Y - 205;

interface Wall {
  p: Pizza;
  img: Phaser.GameObjects.Image;
  crack: number;
}

const minotaur = (): Brain => {
  const bin = new Bin();
  const start = once();
  const walls = new Map<Pizza, Wall>();
  const next = new Every(5.5, 3.5);
  let lane: Takeover | null = null;
  let busy = false;
  /** Charges left in this run (2 in phase 2, 3 in phase 3). */
  let run = 0;

  const raise = (a: Arena, p: Pizza, delay: number) => {
    const img = a.sc.add.image(p.x, WALL_Y + 230, 'p9_wall').setOrigin(0.5, 210 / 220).setScale(1.05, 1);
    a.underLayer.add(img);
    a.sc.tweens.add({ targets: img, y: WALL_Y, duration: 520, delay, ease: 'Back.Out', onStart: () => a.fx.puff(p.x, WALL_Y - 20, 6) });
    walls.set(p, { p, img, crack: 0 });
    a.lockLane(p, true);
  };
  const sink = (a: Arena, w: Wall) => {
    walls.delete(w.p);
    a.lockLane(w.p, false);
    a.sc.tweens.add({ targets: w.img, y: WALL_Y + 240, duration: 420, ease: 'Back.In', onComplete: () => w.img.destroy() });
  };
  /** New walls behind about half the pizzas, never all of them, never the same set twice running. */
  const shift = (a: Arena) => {
    const ps = lanePizzas(a);
    const was = new Set(walls.keys());
    for (const w of [...walls.values()]) sink(a, w);
    if (ps.length < 2) return;
    const n = Math.max(1, Math.floor(ps.length / 2));
    let pick = shuffled(ps).slice(0, n);
    for (let tries = 0; tries < 6 && pick.every((p) => was.has(p)) && was.size === n; tries++) pick = shuffled(ps).slice(0, n);
    pick.forEach((p, i) => raise(a, p, 300 + i * 120));
    a.sfx('sfx_minotaur_walls');
    a.shake(500, 0.004);
  };

  const open = (a: Arena) => lanePizzas(a).filter((p) => !walls.has(p));

  /** Paw the ground over an open pizza, then charge it. */
  const charge = (f: Foot, a: Arena, quick: boolean) => {
    const h = heat(a);
    const target = rnd(open(a)) ?? rnd(a.alivePizzas());
    if (!target) return;
    lane?.release();
    lane = takeLane(a, f, target);
    if (!lane) return;
    busy = true;
    const sec = h.windup(quick ? 1.0 : 1.7);
    const need = h.hits(quick ? 2 : 3);
    f.brain.snort = need;
    const glow = laneGlow(a, () => target.x, 0xff4d3d, SAFE_TOP, target.surfaceY + 20);
    const undo = bin.add(() => glow.end());
    a.quip(target.x, Math.max(SAFE_TOP + 60, f.cy - 160), quick ? 'AGAIN!' : 'SNORT…', '#ff8a6a', 44);
    a.sfx('sfx_minotaur_snort');
    // pawing: it rocks and steam puffs from its nostrils
    const paw = a.sc.tweens.add({ targets: f.root, angle: { from: -4, to: 4 }, duration: 120, yoyo: true, repeat: Math.max(1, Math.round((sec * 1000) / 240) - 1) });
    const steam = a.sc.time.addEvent({ delay: 220, repeat: Math.ceil(sec / 0.22), callback: () => a.fx.puff(f.x + (Math.random() - 0.5) * 80, f.y - 20, 2) });
    let t = 0;
    const tick = a.sc.time.addEvent({ delay: 16, loop: true, callback: () => glow.set(Math.min(1, (t += 0.016) / sec)) });
    a.sc.time.delayedCall(sec * 1000, () => {
      paw.remove();
      steam.remove();
      tick.remove();
      undo();
      f.root.angle = 0;
      if (!f.alive || !a.inWave()) return;
      const blind = Number(f.brain.snort ?? 0) <= 0;
      f.brain.snort = 0;
      if (blind) return crash(f, a);
      rush(f, a, target);
    });
  };

  /** Horns down, straight down the lane. */
  const rush = (f: Foot, a: Arena, p: Pizza) => {
    const h = heat(a);
    f.puppet = true;
    a.sfx('sfx_minotaur_charge');
    a.shake(300, 0.006);
    const y0 = f.y;
    a.sc.tweens.add({
      targets: f,
      y: p.surfaceY + 4,
      duration: 300,
      ease: 'Quad.In',
      onComplete: () => {
        if (!f.alive) return;
        a.sfx('sfx_minotaur_gore');
        a.shake(380, 0.012);
        a.rumble(0.9, 260);
        for (let i = 0; i < 6; i++) a.fx.puff(p.x + (Math.random() - 0.5) * 200, p.surfaceY, 2);
        if (!p.dead && a.inWave()) a.hitPizza(p, h.slices(1), 'GORED!', '#ff6a4a');
        a.sc.tweens.add({ targets: f, y: y0, duration: 520, delay: 200, ease: 'Quad.Out', onComplete: () => afterCharge(f, a) });
      },
    });
  };

  /** Interrupted: it charges blind and slams into the nearest wall (or the table edge, if there are none). */
  const crash = (f: Foot, a: Arena) => {
    const w = [...walls.values()].sort((u, v) => Math.abs(u.p.x - f.x) - Math.abs(v.p.x - f.x))[0];
    f.puppet = true;
    const x0 = f.x;
    const y0 = f.y;
    const tx = w ? w.p.x : f.x;
    a.quip(f.x, Math.max(SAFE_TOP + 60, f.cy - 160), 'CHARGING BLIND!', '#7dff9a', 44);
    a.sfx('sfx_minotaur_charge', { rate: 1.15 });
    a.sc.tweens.add({
      targets: f,
      x: tx,
      y: WALL_TOP + 10,
      duration: 340,
      ease: 'Quad.In',
      onComplete: () => {
        if (!f.alive) return;
        a.sfx('sfx_minotaur_crash');
        a.shake(600, 0.016);
        a.rumble(1, 380);
        a.flash(160, 255, 230, 180);
        a.fx.ring(tx, WALL_TOP + 20, 0xffe0a0, 1.6, 0.5);
        for (let i = 0; i < 10; i++) a.fx.puff(tx + (Math.random() - 0.5) * 220, WALL_TOP + Math.random() * 120, 2);
        if (w) {
          w.crack++;
          a.sc.tweens.add({ targets: w.img, angle: { from: -5, to: 5 }, duration: 60, yoyo: true, repeat: 3, onComplete: () => w.img.setAngle(0) });
          w.img.setTint(w.crack >= 2 ? 0xb8a890 : 0xd8ccb8);
        }
        a.quip(tx, WALL_TOP - 40, 'WHAM! HIT IT NOW!', '#ffe14d', 46);
        // dazed and soft for a moment
        const h = heat(a);
        f.vuln = 1.5;
        a.sc.time.delayedCall(h.stun(3) * 1000 + 600, () => (f.vuln = 1));
        a.sc.tweens.add({
          targets: f,
          x: x0,
          y: y0,
          duration: 500,
          delay: 250,
          ease: 'Quad.Out',
          onComplete: () => {
            f.puppet = false;
            f.stun(heat(a).stun(3));
            run = 0;
            busy = false;
            next.t = next.every;
          },
        });
      },
    });
  };

  const afterCharge = (f: Foot, a: Arena) => {
    f.puppet = false;
    run = Math.max(0, run - 1);
    if (run > 0 && f.alive && a.inWave()) {
      // the next charge of the run comes quickly; in phase 3 the walls slide between charges
      if (f.phase >= 3) shift(a);
      a.sc.time.delayedCall(450, () => f.alive && a.inWave() && charge(f, a, true));
      return;
    }
    busy = false;
    next.t = next.every;
  };

  return {
    names: ['THE MAZE', 'THE MAZE SHIFTS', 'BULL RUN'],
    info: [
      'It charges down an open lane of the maze · pizzas behind a wall are safe; smack it while it paws the ground and it rams a wall',
      'The walls slide to new places and it charges twice in a row · watch which lanes are open',
      'Three charges in a row, and the walls move between them · interrupt the snort to stun it',
    ],
    cards: [
      {
        what: 'It paws the ground, then charges down an open lane',
        hit: 'Smack it while it snorts: it charges blind into a wall',
        miss: 'It gores the pizza at the end of the lane',
        show: [{ key: '@boss', label: 'While it snorts', hits: (h) => h.hits(3) }],
      },
      {
        what: 'The maze walls slide and it charges twice in a row',
        hit: 'Interrupt the snort, and watch which lanes are open',
        miss: 'Pizzas in open lanes get gored',
        show: [
          { key: '@boss', label: 'While it snorts', hits: (h) => h.hits(3) },
          { key: 'p9_wall', label: 'Walls guard pizzas', watch: true },
        ],
      },
      {
        what: 'Three charges in a row, the walls moving between them',
        hit: 'Smack it mid-snort to send it crashing into a wall',
        miss: 'Each charge gores a pizza',
        show: [
          { key: '@boss', label: 'While it snorts', hits: (h) => h.hits(3) },
          { key: 'p9_wall', label: 'Walls guard pizzas', watch: true },
        ],
      },
    ],
    upkeep: (f, _dt, a) => {
      start(() => {
        const h = heat(a);
        next.every = h.cooldown(5.5);
        enterArena(a, 'minotaur');
        entrance(a, f, { sfx: 'sfx_minotaur_bellow', quip: 'MOOOOO!', color: '#ff8a6a', flash: [255, 120, 60], onLanded: () => shift(a) });
        bin.add(() => {
          for (const w of [...walls.values()]) sink(a, w);
          lane?.release();
          lane = null;
        });
      });
      // walls follow their pizzas (the table can re-lay out); a wall on a lost pizza sinks
      for (const w of [...walls.values()]) {
        if (w.p.dead) sink(a, w);
        else w.img.x = w.p.x;
      }
      // never every pizza walled in
      if (walls.size && !open(a).length) sink(a, [...walls.values()][0]);
    },
    onPhase: (f, ph, a) => {
      a.sfx('sfx_minotaur_bellow');
      shift(a);
      if (!busy) next.t = Math.min(next.t, 2.5);
      void f;
      void ph;
    },
    update: (f, dt, a) => {
      if (busy || f.puppet) return;
      // between charges it holds the top of a lane (it never stomps: its charge is its only attack)
      if (!lane) lane = takeLane(a, f, rnd(open(a)));
      if (next.tick(dt)) {
        run = f.phase >= 3 ? 3 : f.phase >= 2 ? 2 : 1;
        charge(f, a, false);
      }
    },
    onSmacked: (f, a) => {
      const left = Number(f.brain.snort ?? 0);
      if (left > 0) {
        f.brain.snort = left - 1;
        if (left - 1 > 0) a.quip(f.x + 60, f.cy - 120, `${left - 1}!`, '#7dff9a', 40);
      }
      return false;
    },
    onDeath: (f, a) => {
      bin.flush();
      shatter(a, f, { burst: 0xffb070 });
      a.sc.time.delayedCall(1200, () => leaveArena(a));
    },
  };
};

// ——— 26. MEDUSA (boss, wave 85) ———
// Stone gaze: every 12 s her eyes glow and she turns a pizza to stone (one at a time, never the last one
// standing). A statue has no perk; every stomp on it cracks it, and it crumbles for good at 3 cracks
// (4 on Mild, 2 on Hot and up). While her eyes glow a mirror shield appears: only her reflection can be
// hurt then, and 3 reflection hits break the curse on the newest statue. From phase 2 the stare also
// catches the peel (no smacks for 2 s). Snakes slither out as adds throughout.

interface Statue {
  p: Pizza;
  cracks: number;
  need: number;
  stone: Phaser.GameObjects.Image;
  crack: Phaser.GameObjects.Image;
  at: number;
}

/** Every pizza turned to stone (shared with the stomp hook below). */
const statues = new Map<Pizza, Statue>();

/** Medusa's eyes, as fractions of the foot's half width (x) and height (y) above the sole (art: src/content/art/act9.ts). */
export const MEDUSA_EYES = [
  { x: -0.29, y: 0.55 },
  { x: 0.29, y: 0.55 },
];

function petrify(a: Arena, p: Pizza): void {
  const r = heat(a).rank;
  const need = r === 0 ? 4 : r >= 2 ? 2 : 3;
  // the stone sits on the pizza itself (under its face and label), sized to its crust
  const img = imgOf(p);
  const k = (PIZZA_R * p.s * 2.06) / 280;
  const stone = a.sc.add.image(0, img.y, 'p9_stone').setScale(k).setAlpha(0);
  const crack = a.sc.add.image(0, img.y, 'p9_crack1').setScale(k).setAlpha(0);
  p.root.addAt([stone, crack], p.root.getIndex(img) + 1);
  a.sc.tweens.add({ targets: stone, alpha: 0.9, duration: 500 });
  imgOf(p).setTint(0xa9a69c);
  // the statue has no perk while it stands (cured, the perk comes straight back)
  p.perkFrozenT = 1e6;
  bits(a).recompute();
  statues.set(p, { p, cracks: 0, need, stone, crack, at: a.now() });
  // a statue takes no slices from a stomp: it cracks instead (the instance override goes when it's freed)
  (p as unknown as { takeSlices: Pizza['takeSlices'] }).takeSlices = () => {
    const s = statues.get(p);
    if (s) crackStatue(a, s);
    return [];
  };
  a.fx.ring(p.x, p.surfaceY - 10, 0xc8c8b8, 1.6, 0.4);
  a.quip(p.x, p.surfaceY - 170, 'TURNED TO STONE!', '#d8d8c8', 40);
  a.sfx('sfx_medusa_petrify');
}

function freeStatue(a: Arena, s: Statue, cured: boolean): void {
  statues.delete(s.p);
  delete (s.p as unknown as { takeSlices?: unknown }).takeSlices;
  const objs = [s.stone, s.crack];
  a.sc.tweens.add({ targets: objs, alpha: 0, duration: 350, onComplete: () => objs.forEach((o) => o.destroy()) });
  if (s.p.root.active) imgOf(s.p).clearTint();
  s.p.perkFrozenT = 0;
  bits(a).recompute();
  if (cured && !s.p.dead) {
    a.quip(s.p.x, s.p.surfaceY - 170, 'CURSE BROKEN!', '#7dff9a', 44);
    a.fx.healBurst(s.p.x, s.p.surfaceY - 20);
    a.sfx('sfx_medusa_cure');
  }
}

function crackStatue(a: Arena, s: Statue): void {
  s.cracks++;
  const p = s.p;
  a.fx.puff(p.x + (Math.random() - 0.5) * 100, p.surfaceY - 10, 5);
  if (s.cracks >= s.need) {
    freeStatue(a, s, false);
    a.sfx('sfx_medusa_crumble');
    a.shake(300, 0.008);
    a.hitPizza(p, p.slices, 'CRUMBLED!', '#d8d8c8');
    return;
  }
  a.sfx('sfx_medusa_crack');
  const stage = Math.min(3, Math.ceil((s.cracks / s.need) * 3));
  s.crack.setTexture(`p9_crack${stage}`).setAlpha(1);
  a.quip(p.x, p.surfaceY - 150, `CRACK! ${s.need - s.cracks} LEFT`, '#d8d8c8', 38);
  a.sc.tweens.add({ targets: p.root, x: p.root.x + 6, duration: 50, yoyo: true, repeat: 2 });
}

const medusa = (): Brain => {
  const bin = new Bin();
  const start = once();
  const gaze = new Every(12, 6);
  const strike = new Every(7, 4);
  let glowing = false;
  /** Mirror state while it's up. */
  let mirror: { img: Phaser.GameObjects.Image; refl: Phaser.GameObjects.Image; hits: number; x: number; y: number; end: () => void } | null = null;
  let reflecting = false;
  let lane: Takeover | null = null;
  const eyeGlows: Phaser.GameObjects.Image[] = [];

  const setEyes = (a: Arena, on: number) => {
    for (const g of eyeGlows) a.sc.tweens.add({ targets: g, alpha: on, duration: 220 });
  };

  const showMirror = (f: Foot, a: Arena, sec: number) => {
    mirror?.end();
    const x = f.x < W / 2 ? 1480 : 440;
    const y = 470;
    const img = a.sc.add.image(x, y, 'p9_mirror').setScale(0);
    // her reflection in the polished bronze, flipped and tinted warm
    const refl = a.sc.add.image(x, y + 10, f.meta.footKey).setScale(0).setFlipX(true).setTint(0xffd9a0).setAlpha(0.75);
    const halo = a.sc.add.image(x, y, 'glow').setTint(0xffe9a0).setBlendMode(Phaser.BlendModes.ADD).setScale(2.4).setAlpha(0);
    a.fxLayer.add([halo, img, refl]);
    const rs = 170 / Math.max(1, (a.sc.textures.get(f.meta.footKey).getSourceImage() as HTMLCanvasElement).height);
    a.sc.tweens.add({ targets: img, scale: 1, duration: 320, ease: 'Back.Out' });
    a.sc.tweens.add({ targets: refl, scale: rs, duration: 320, ease: 'Back.Out' });
    a.sc.tweens.add({ targets: halo, alpha: { from: 0, to: 0.5 }, duration: 400, yoyo: true, repeat: -1 });
    a.quip(x, y - 170, 'HIT HER REFLECTION!', '#ffe9a0', 38);
    a.sfx('sfx_medusa_mirror');
    let live = true;
    const end = () => {
      if (!live) return;
      live = false;
      mirror = null;
      a.sc.tweens.killTweensOf([img, refl, halo]);
      a.sc.tweens.add({ targets: [img, refl, halo], alpha: 0, scale: 0.2, duration: 260, onComplete: () => [img, refl, halo].forEach((o) => o.destroy()) });
    };
    const forget = bin.add(end);
    a.sc.time.delayedCall(sec * 1000, forget);
    mirror = { img, refl, hits: 0, x, y, end: forget };
    a.addClickable({
      x,
      y,
      r: 140,
      priority: 2,
      alive: () => live,
      hit: () => {
        if (!live || !f.alive) return;
        const m = mirror!;
        m.hits++;
        a.sfx('sfx_medusa_reflect');
        a.fx.impact(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 60, true);
        a.sc.tweens.add({ targets: [img, refl], angle: { from: -6, to: 6 }, duration: 60, yoyo: true });
        // the reflection hit lands on Medusa herself
        reflecting = true;
        a.damageFoot(f, bits(a).run.stats.damage * 1.5);
        reflecting = false;
        f.flash(0xffe9a0, 90);
        if (m.hits < 3) {
          a.quip(x, y - 150, `${m.hits}/3`, '#ffe9a0', 36);
          return;
        }
        // three hits: the newest statue is freed and the mirror's work is done
        const newest = [...statues.values()].sort((s, t) => t.at - s.at)[0];
        if (newest) freeStatue(a, newest, true);
        else a.quip(x, y - 150, 'BLINDED BY HER OWN STARE!', '#7dff9a', 34);
        f.stun(heat(a).stun(1.5));
        m.end();
      },
    });
  };

  /** The stare: eyes glow, a green cone sweeps to a pizza (and catches the peel from phase 2), then stone. */
  const stare = (f: Foot, a: Arena) => {
    const h = heat(a);
    const free = a.alivePizzas().filter((p) => !statues.has(p));
    // never the last one standing: at least one pizza always stays flesh and crust
    const n = f.phase >= 4 && free.length >= 3 ? 2 : 1;
    if (free.length < 2) return;
    const targets = shuffled(free).slice(0, Math.min(n, free.length - 1));
    const sec = h.windup(1.8);
    glowing = true;
    lane?.release();
    lane = takeLane(a, f, targets[0]);
    // she leans in low over the table so her glowing eyes are in plain view
    f.hoverY = 640;
    setEyes(a, 1);
    a.sfx('sfx_medusa_glow');
    a.quip(f.x, Math.max(SAFE_TOP + 50, f.cy - 170), f.phase >= 2 ? 'LOOK AWAY…' : 'LOOK AT ME…', '#9dff6a', 44);
    showMirror(f, a, sec + 4);
    const cone = a.sc.add.graphics();
    a.fxLayer.addAt(cone, 0);
    const forget = bin.add(() => cone.destroy());
    let t = 0;
    const eye = () => ({ x: f.x, y: f.y - f.meta.footHeight * f.scale * MEDUSA_EYES[0].y });
    const inCone = (px: number, py: number, p: Pizza) => {
      const e = eye();
      const tx = p.x - e.x;
      const ty = p.surfaceY - e.y;
      const len = Math.hypot(tx, ty) || 1;
      const k = ((px - e.x) * tx + (py - e.y) * ty) / (len * len);
      if (k < 0 || k > 1.15) return false;
      const d = Math.abs((px - e.x) * ty - (py - e.y) * tx) / len;
      return d < 40 + 130 * k;
    };
    const draw = a.sc.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        t += 0.016;
        const k = Math.min(1, t / sec);
        const e = eye();
        cone.clear();
        for (const p of targets) {
          if (p.dead) continue;
          const tx = p.x;
          const ty = p.surfaceY;
          const ang = Math.atan2(ty - e.y, tx - e.x) + Math.PI / 2;
          const w0 = 40;
          const w1 = 40 + 130 * k;
          const pts = [
            new Phaser.Math.Vector2(e.x + Math.cos(ang) * w0, e.y + Math.sin(ang) * w0),
            new Phaser.Math.Vector2(e.x - Math.cos(ang) * w0, e.y - Math.sin(ang) * w0),
            new Phaser.Math.Vector2(tx - Math.cos(ang) * w1, ty - Math.sin(ang) * w1),
            new Phaser.Math.Vector2(tx + Math.cos(ang) * w1, ty + Math.sin(ang) * w1),
          ];
          const pulse = 0.7 + Math.sin(a.now() * 14) * 0.3;
          cone.fillStyle(0x9dff6a, (0.08 + 0.2 * k) * pulse).fillPoints(pts, true);
          cone.lineStyle(5, 0x9dff6a, 0.4 + 0.5 * k).strokePoints(pts, true);
        }
        for (const g of eyeGlows) g.setScale(0.35 + 0.2 * k + Math.sin(a.now() * 20) * 0.04);
      },
    });
    a.sc.time.delayedCall(sec * 1000, () => {
      draw.remove();
      forget();
      glowing = false;
      f.hoverY = null;
      setEyes(a, 0.15);
      lane?.release();
      lane = null;
      if (!f.alive || !a.inWave()) return;
      for (const p of targets) {
        if (p.dead || statues.has(p)) continue;
        // one more check: never stone the last pizza that isn't already stone
        if (a.alivePizzas().filter((q) => !statues.has(q)).length < 2) break;
        if (f.phase >= 2) {
          const pp = a.peelPoint();
          if (inCone(pp.x, pp.y, p)) {
            a.stunPeel(2, 'STONED!');
            a.sfx('sfx_medusa_gaze');
          }
        }
        petrify(a, p);
      }
    });
  };

  return {
    names: ['STONE GAZE', 'GORGON GLARE', 'SNAKE STRIKE', 'TWIN GAZE'],
    info: [
      'Every 12 s her stare turns a pizza to stone: no perk, and stomps crack it until it crumbles · while her eyes glow, smack her reflection in the mirror: 3 hits free the newest statue',
      'Her stare now catches the peel too (no smacks for 2 s), and more snakes slither out · keep the peel out of the green stare',
      'The snakes in her hair strike at the pizzas · smack each snake head before it bites',
      'She turns two pizzas to stone at once · use the mirror to free them',
    ],
    cards: [
      {
        what: 'Her stare turns a pizza to stone: no perk, and it cracks',
        hit: 'While her eyes glow, smack her reflection in the mirror',
        miss: 'Stomps crack the stone pizza until it crumbles',
        show: [
          { key: 'p9_mirror', label: 'Mirror', hits: 3 },
          { key: 'p9_stone', label: 'Stone pizza', watch: true },
        ],
      },
      {
        what: 'Her green stare now catches the peel too',
        hit: 'Keep the peel out of the stare; smack the snakes',
        miss: 'Caught in the stare: no smacks for 2 seconds',
        show: [
          { key: 'p9_mirror', label: 'Mirror', hits: 3 },
          { key: '@foot:gorgonsnake', label: 'Snakes', hits: 1 },
        ],
      },
      {
        what: 'The snakes in her hair strike down at the pizzas',
        hit: 'Smack each snake head before it bites',
        miss: 'A bite takes a slice',
        show: [{ key: 'p9_snakehead', label: 'Snake head', hits: 1 }],
      },
      {
        what: 'She turns two pizzas to stone at once',
        hit: 'Use the mirror: 3 hits on her reflection free a statue',
        miss: 'Stone pizzas lose their perks and crumble',
        show: [
          { key: 'p9_mirror', label: 'Mirror', hits: 3 },
          { key: 'p9_stone', label: 'Stone pizzas', watch: true },
        ],
      },
    ],
    upkeep: (f, _dt, a) => {
      start(() => {
        // statues left by a run that ended mid-fight (Play Again, Save & Menu) belong to pizzas that are gone
        statues.clear();
        // her eyes: glows over the art's two eyes, dim until she stares
        const hgt = f.meta.footHeight * f.type.scale;
        const hw = f.meta.halfWidth * f.type.scale;
        for (const e of MEDUSA_EYES) {
          const g = a.sc.add.image(e.x * hw, -hgt * e.y, 'glow').setTint(0x9dff6a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.35).setAlpha(0.15);
          f.root.add(g);
          eyeGlows.push(g);
        }
        entrance(a, f, { sfx: 'sfx_medusa_hiss', quip: 'LOOK AT ME…', color: '#9dff6a', flash: [120, 255, 120] });
        bin.add(() => {
          mirror?.end();
          lane?.release();
          lane = null;
          for (const s of [...statues.values()]) freeStatue(a, s, true);
        });
      });
    },
    onPhase: (f, ph, a) => {
      if (ph === 2) {
        // the snakes pour out of her hair
        a.sfx('sfx_medusa_hiss');
        for (let i = 0; i < heat(a).adds(1); i++) a.sc.time.delayedCall(300 * i, () => f.alive && a.spawn('gorgonsnake'));
      }
      if (ph === 3) strike.t = 2;
    },
    update: (f, dt, a) => {
      const h = heat(a);
      if (!glowing && gaze.tick(dt)) stare(f, a);
      if (f.phase >= 3 && !glowing && strike.tick(dt)) {
        strike.every = h.cooldown(7);
        const free = shuffled(a.alivePizzas().filter((p) => !statues.has(p))).slice(0, 2);
        a.sfx('sfx_medusa_hiss');
        free.forEach((p, i) =>
          a.sc.time.delayedCall(i * 350, () => {
            if (!f.alive || p.dead) return;
            dropOn(a, f, p, 'p9_snakehead', h.windup(1.5), 'BITTEN!', { scale: 0.75, color: '#9dff6a', fallSfx: 'sfx_medusa_hiss', landSfx: 'sfx_squish' });
          }),
        );
      }
    },
    // while her eyes glow (and the mirror is up) only her reflection can be hurt
    onSmacked: (f, a) => {
      if (reflecting) return false;
      if (mirror) {
        a.quip(f.x, f.cy - 140, 'ONLY HER REFLECTION!', '#ffe9a0', 34);
        a.sfx('sfx_kit_shieldblock', { throttle: 150 });
        return true;
      }
      return false;
    },
    onDeath: (f, a) => {
      bin.flush();
      // she catches her own eye: turns to stone, then shatters
      f.tint(0xa9a69c);
      shatter(a, f, { tint: 0xb8b6ac, burst: 0x9dff6a, sfx: 'sfx_medusa_crumble' });
    },
  };
};

// ——— 27. CERBERUS (mini-boss, wave 88) ———
// Three paws at once, one health bar. Each paw has a temper: fire (fireballs at pizzas), ice (ice shards at
// the peel) and poison (puddles that spoil a pizza). Each paw holds its own third of the bar; beat one and
// the other two go wild.

type Temper = 'fire' | 'ice' | 'poison';
const TEMPER: Record<Temper, { color: number; css: string; word: string }> = {
  fire: { color: 0xff5a2a, css: '#ff8a5a', word: 'FIRE!' },
  ice: { color: 0x5fc8ff, css: '#9ad8ff', word: 'ICE!' },
  poison: { color: 0x7be04a, css: '#a8f07a', word: 'POISON!' },
};

interface Head {
  t: Foot;
  temper: Temper;
  share: number;
  every: Every;
  badge: Phaser.GameObjects.Image;
  wild: boolean;
  down: boolean;
}

const cerberus = (): Brain => {
  const bin = new Bin();
  const start = once();
  const heads: Head[] = [];
  let lastHead: Head | null = null;
  let prevHp = 0;
  const howl = new Every(11, 6);
  let bars: Phaser.GameObjects.Graphics | null = null;
  let ready = false;

  const alive = () => heads.filter((h) => !h.down);

  const spawnHead = (f: Foot, a: Arena, p: Pizza | null, temper: Temper, delay: number): void => {
    const t = a.spawn(f.type.id, p, p?.x);
    if (!t) return;
    t.link = f;
    t.brain.twin = true;
    t.maxHp = f.maxHp;
    t.hp = f.hp;
    t.speedMul = f.speedMul * 0.85;
    // three paws at once: each one waits a little longer before it dives than a lone boss would
    t.setHoverMul(t.hoverMul * 1.35);
    t.setPhaseAura(TEMPER[temper].color);
    const badge = a.sc.add.image(0, -t.meta.footHeight * t.type.scale - 70, `p9_temper_${temper}`).setScale(0.8);
    t.root.add(badge);
    const hd: Head = { t, temper, share: f.maxHp / 3, every: new Every(6, 2 + heads.length * 2), badge, wild: false, down: false };
    heads.push(hd);
    // each paw drops in with its own bark
    t.puppet = true;
    t.y = -460;
    a.sc.tweens.add({
      targets: t,
      y: (t.hoverY ?? HOVER_Y) - 20,
      delay,
      duration: 560,
      ease: 'Quad.In',
      onComplete: () => {
        a.sfx('sfx_cerberus_bark', { rate: temper === 'fire' ? 0.95 : temper === 'ice' ? 1.05 : 1.15 });
        a.shake(300, 0.008);
        a.fx.ring(t.x, t.y, TEMPER[temper].color, 1.4, 0.4);
        a.quip(t.x, Math.max(SAFE_TOP + 40, t.cy - 160), TEMPER[temper].word, TEMPER[temper].css, 40);
        t.puppet = false;
      },
    });
  };

  /** One paw's temper. */
  const act = (hd: Head, f: Foot, a: Arena) => {
    const h = heat(a);
    const t = hd.t;
    if (!t.alive || t.stunT > 0) return;
    const c = TEMPER[hd.temper];
    // tell: the paw flares in its colour and growls
    t.flash(c.color, 260);
    a.sfx('sfx_cerberus_growl', { throttle: 200 });
    a.quip(t.x, Math.max(SAFE_TOP + 40, t.cy - 150), c.word, c.css, 36);
    a.sc.time.delayedCall(650, () => {
      if (!t.alive || !f.alive || !a.inWave()) return;
      const p = (t.target && !t.target.dead ? t.target : null) ?? laneOf(a, t);
      if (hd.temper === 'fire') {
        if (!p) return;
        a.sfx('sfx_cerberus_fire');
        dropOn(a, t, p, 'p9_fireball', h.windup(hd.wild ? 1.1 : 1.4), 'SCORCHED!', { scale: 0.8, color: '#ff8a5a', landSfx: 'sfx_explosion' });
      } else if (hd.temper === 'ice') {
        a.sfx('sfx_cerberus_ice');
        throwAtPeel(
          a,
          'p9_iceshard',
          { x: t.x, y: t.cy },
          h.windup(hd.wild ? 1.2 : 1.5),
          () => {
            a.slowPeel(h.stun(3));
            const pp = a.peelPoint();
            a.quip(pp.x, pp.y - 70, 'FROZEN PEEL!', '#9ad8ff', 36);
            a.sfx('sfx_freeze');
          },
          () => f.alive && a.damageFoot(f, Math.round(f.maxHp * 0.02), 'BATTED BACK!'),
          4,
          { scale: 0.75 },
        );
      } else {
        if (!p) return;
        a.sfx('sfx_cerberus_poison');
        const fresh = p.freshOn;
        hitProp(a, {
          key: 'p9_poison',
          x: p.x,
          y: p.surfaceY - 24,
          scale: 0.85,
          hits: h.hits(2),
          r: 120,
          sec: h.windup(hd.wild ? 3 : 3.6),
          badgeDy: -70,
          label: 'CLEANED UP!',
          follow: () => (p.dead ? null : { x: p.x, y: p.surfaceY - 24 }),
          onFail: () => {
            if (p.dead || !a.inWave()) return;
            a.hitPizza(p, 1, 'POISONED!', '#a8f07a');
            if (fresh && !p.dead) p.setFresh(p.fresh - 2);
          },
        });
      }
    });
  };

  const beat = (hd: Head, f: Foot, a: Arena) => {
    hd.down = true;
    const t = hd.t;
    a.quip(t.x, Math.max(SAFE_TOP + 40, t.cy - 160), `${hd.temper.toUpperCase()} PAW DOWN!`, '#7dff9a', 44);
    a.sfx('sfx_cerberus_howl');
    a.fx.ring(t.x, t.cy, TEMPER[hd.temper].color, 1.8, 0.6);
    if (t.alive) {
      shatter(a, t, { burst: TEMPER[hd.temper].color, n: 6 });
      t.die(true);
    }
    // the other two go wild
    for (const o of alive()) {
      o.wild = true;
      o.t.hurry = 1.45;
      o.every.every *= 0.6;
      o.every.t = Math.min(o.every.t, 1.5);
      a.quip(o.t.x, Math.max(SAFE_TOP + 40, o.t.cy - 160), 'GONE WILD!', '#ff4d3d', 40);
    }
    void f;
  };

  return {
    names: ['THREE TEMPERS', 'PACK HOWL', 'HELLHOUND'],
    info: [
      'Three paws share one health bar, each with its own share and temper: fire hurls fireballs, ice throws shards at the peel, poison spoils a pizza · beat one paw and the other two go wild',
      'Every 11 s the pack howls and every paw uses its temper at once · bat the shards and smash the fireballs',
      'The paws are faster and angrier · finish one paw at a time',
    ],
    cards: [
      {
        what: 'Three paws share one health bar: fire, ice and poison',
        hit: 'Beat one paw at a time, and stop what each one throws',
        miss: 'Fireballs and poison take slices; ice slows your peel',
        show: [
          { key: 'p9_fireball', label: 'Fireball', hits: 1 },
          { key: 'p9_iceshard', label: 'Ice shard', hits: 1 },
          { key: 'p9_poison', label: 'Poison', hits: (h) => h.hits(2) },
        ],
      },
      {
        what: 'The pack howls and every paw uses its temper at once',
        hit: 'Bat the shards and smash the fireballs and poison',
        miss: 'Everything lands at once: slices lost, peel slowed',
        show: [
          { key: 'p9_fireball', label: 'Fireball', hits: 1 },
          { key: 'p9_iceshard', label: 'Ice shard', hits: 1 },
          { key: 'p9_poison', label: 'Poison', hits: (h) => h.hits(2) },
        ],
      },
      {
        what: 'The paws get faster and angrier',
        hit: 'Finish one paw at a time; keep stopping their throws',
        miss: 'Beaten paws make the others go wild',
        show: [
          { key: '@boss', label: 'One paw at a time' },
          { key: 'p9_fireball', label: 'Fireball', hits: 1 },
          { key: 'p9_iceshard', label: 'Ice shard', hits: 1 },
        ],
      },
    ],
    upkeep: (f, _dt, a) => {
      start(() => {
        // the boss itself is the shared health bar: it waits off screen while its three paws fight
        f.root.setVisible(false);
        enterArena(a, 'cerberus');
        const ps = shuffled(lanePizzas(a));
        const tempers: Temper[] = ['fire', 'ice', 'poison'];
        tempers.forEach((tp, i) => spawnHead(f, a, ps[i % Math.max(1, ps.length)] ?? null, tp, 250 + i * 380));
        prevHp = f.hp;
        bars = a.sc.add.graphics();
        a.fxLayer.add(bars);
        const h = heat(a);
        for (const hd of heads) hd.every.every = h.cooldown(6);
        howl.every = h.cooldown(11);
        ready = true;
        bin.add(() => {
          bars?.destroy();
          bars = null;
          for (const hd of heads) if (hd.t.alive) hd.t.die(true);
        });
      });
      f.puppet = true;
      f.y = -600;
      f.shadow.setVisible(false);
      if (!ready) return;
      // each paw's share of the bar follows the damage dealt near it (other hits are shared out)
      const lost = prevHp - f.hp;
      prevHp = f.hp;
      if (lost > 0) {
        const live = alive();
        const who = lastHead && !lastHead.down ? [lastHead] : live;
        let left = lost;
        for (const hd of who) hd.share -= left / who.length;
        left = 0;
        // overflow from a beaten paw goes to the others
        for (const hd of live) {
          if (hd.share <= 0 && alive().length > 1) {
            const over = -hd.share;
            hd.share = 0;
            beat(hd, f, a);
            const rest = alive();
            for (const o of rest) o.share -= over / rest.length;
          }
        }
        lastHead = null;
      } else if (lost < 0) {
        for (const hd of alive()) hd.share -= lost / alive().length;
      }
      // the three share bars, one over each paw, in its temper's colour
      if (bars) {
        bars.clear();
        for (const hd of alive()) {
          const t = hd.t;
          if (!t.alive) continue;
          const w = 120;
          const x = t.x - w / 2;
          const y = Math.max(SAFE_TOP - 20, t.y - t.meta.footHeight * t.scale - 30);
          const k = Phaser.Math.Clamp(hd.share / (f.maxHp / 3), 0, 1);
          bars.fillStyle(0x2a1810, 0.85).fillRoundedRect(x - 4, y - 4, w + 8, 20, 10);
          bars.fillStyle(TEMPER[hd.temper].color, 1).fillRoundedRect(x, y, Math.max(8, w * k), 12, 6);
        }
      }
      // a paw that left the field somehow is replaced from above, so the fight can always finish
      for (const hd of alive()) if (!hd.t.alive) beat(hd, f, a);
    },
    onPhase: (_f, ph, a) => {
      if (ph >= 2) howl.t = 2;
      if (ph >= 3) for (const hd of alive()) hd.t.hurry = Math.max(hd.t.hurry, 1.25);
      a.sfx('sfx_cerberus_howl');
    },
    update: (f, dt, a) => {
      if (!ready) return;
      for (const hd of alive()) if (hd.every.tick(dt)) act(hd, f, a);
      if (f.phase >= 2 && howl.tick(dt)) {
        a.sfx('sfx_cerberus_howl');
        a.quip(W / 2, SAFE_TOP + 60, 'THE PACK HOWLS!', '#ff8a5a', 48);
        alive().forEach((hd, i) => {
          hd.every.t = hd.every.every;
          a.sc.time.delayedCall(400 + i * 380, () => f.alive && !hd.down && act(hd, f, a));
        });
      }
    },
    onSmacked: (_f, _a, x, y) => {
      // which paw took it: the nearest one to the smack
      const live = alive().filter((hd) => hd.t.alive);
      lastHead = live.sort((p, q) => Math.hypot(p.t.cx - x, p.t.cy - y) - Math.hypot(q.t.cx - x, q.t.cy - y))[0] ?? null;
      return false;
    },
    onDeath: (_f, a) => {
      for (const hd of alive()) if (hd.t.alive) shatter(a, hd.t, { burst: TEMPER[hd.temper].color, n: 6 });
      a.sfx('sfx_cerberus_howl', { rate: 0.8 });
      bin.flush();
      a.sc.time.delayedCall(1200, () => leaveArena(a));
    },
  };
};

// ——— 28. HADES AND THE TITANS (boss, wave 90) ———
// Phase by phase Hades frees a Titan and hides behind it: Kronos slows time, Atlas tilts the table so the
// pizzas slide, Hyperion burns. Beat each Titan to send it back (Hades can't be hurt meanwhile), then hurt
// Hades to the next phase. The last phase is Hades himself, whose shadows steal slices.

type Titan = 'kronos' | 'atlas' | 'hyperion';

/** Which Titan each phase frees, by how many phases the heat gives him (the last phase is always Hades). */
const TITANS_FOR: Record<number, (Titan | null)[]> = {
  1: [null],
  2: ['kronos', null],
  3: ['kronos', 'atlas', null],
  4: ['kronos', 'atlas', 'hyperion', null],
};
const TITAN_INFO: Record<Titan | 'hades', [string, string]> = {
  kronos: ['KRONOS RISES', 'Hades hides behind Kronos, whose hourglass slows your peel · smash the hourglass, then beat Kronos to send him back'],
  atlas: ['ATLAS RISES', 'Atlas lifts one end of the table and the pizzas slide into his stomp · smack his hand under the table to drop it level, then beat him'],
  hyperion: ['HYPERION RISES', 'Hyperion sets pizzas alight with solar flares · smack out the flames, then beat him to send him back'],
  hades: ['LORD OF THE DEAD', 'Hades himself: shadows creep out of the floor to steal slices · smack each shadow before it drags a slice back to him'],
};
/** Each phase's card (src/ui/phaseCard.ts), in the plan's order. */
const TITAN_CARD: Record<Titan | 'hades', PhaseCard> = {
  kronos: {
    what: 'Hades hides behind Kronos, whose hourglass flips over',
    hit: 'Smash the hourglass, then beat Kronos to send him back',
    miss: 'Sand runs out: your peel slows and every foot hurries',
    show: [
      { key: 'p9_hourglass', label: 'Hourglass', hits: (h) => h.hits(3) },
      { key: '@foot:kronos', label: 'Then beat Kronos' },
    ],
  },
  atlas: {
    what: 'Atlas lifts one end of the table and the pizzas slide',
    hit: 'Smack his hand under the table to drop it level',
    miss: 'The lowest pizza slides into his stomp',
    show: [
      { key: 'p9_atlashand', label: 'His hand', hits: (h) => h.hits(3) },
      { key: '@foot:atlas', label: 'Then beat Atlas' },
    ],
  },
  hyperion: {
    what: 'Hyperion sets pizzas alight with solar flares',
    hit: 'Smack out the flames, then beat Hyperion',
    miss: 'A burning pizza loses a slice every 4 seconds',
    show: [
      { key: 'p9_flare', label: 'Flames', hits: (h) => h.hits(3) },
      { key: '@foot:hyperion', label: 'Then beat Hyperion' },
    ],
  },
  hades: {
    what: 'Hades himself: shadows creep out to steal slices',
    hit: 'Smack each shadow hand before it drags a slice away',
    miss: 'He eats the slice and heals',
    show: [{ key: 'p9_shadowhand', label: 'Shadow hand', hits: (h) => h.hits(2) }],
  },
};

/** A Titan's health, as a share of Hades's. */
const TITAN_HP = [0.1, 0.12, 0.13, 0.14, 0.15];

function hadesPlan(phases: number): { order: (Titan | null)[]; names: string[]; info: string[]; cards: PhaseCard[] } {
  const order = TITANS_FOR[Math.max(1, Math.min(4, phases))];
  return { order, names: order.map((t) => TITAN_INFO[t ?? 'hades'][0]), info: order.map((t) => TITAN_INFO[t ?? 'hades'][1]), cards: order.map((t) => TITAN_CARD[t ?? 'hades']) };
}

const hades = (): Brain => {
  const bin = new Bin();
  const start = once();
  // the heat picked for this run (the first tick re-checks it with the arena, before any phase change)
  const plan = hadesPlan(HEAT_BY_ID[save.heat]?.bossPhases ?? 3);
  let order = plan.order;
  let titan: { f: Foot; kind: Titan; bin: Bin; rift: Phaser.GameObjects.Image } | null = null;
  let hold: Takeover | null = null;
  const move = new Every(9, 4);
  const shadows = new Every(6, 3);
  let shadowsOut = 0;
  const burning = new Set<Pizza>();
  let tilted = false;

  const brain: Brain = {
    names: plan.names,
    info: plan.info,
    cards: plan.cards,
    setPhases: (n) => {
      const p2 = hadesPlan(n);
      order = p2.order;
      brain.names.splice(0, brain.names.length, ...p2.names);
      brain.info.splice(0, brain.info.length, ...p2.info);
      brain.cards?.splice(0, brain.cards.length, ...p2.cards);
    },
    upkeep: (f, dt, a) => {
      start(() => {
        brain.setPhases!(a.bossPhases());
        a.flash(500, 30, 50, 120);
        entrance(a, f, { sfx: 'sfx_hades_toll', quip: 'WELCOME TO THE UNDERWORLD.', color: '#8fd8ff', flash: [80, 160, 255], delay: 500, onLanded: () => a.sc.time.delayedCall(900, () => f.alive && phaseStart(f, a, 1)) });
        bin.add(() => {
          banishTitan(f, a, false);
          hold?.release();
          hold = null;
          if (tilted) level(a);
        });
      });
      if (titan) {
        if (!titan.f.alive) banishTitan(f, a, true);
        else titanTick(f, dt, a);
      }
      // down to the pizza he's holding: let its lane go, or the Titan (and every other foot) could never reach the
      // table while he hides behind his shield, and the fight would never end
      if (hold && !a.alivePizzas().some((p) => p !== hold!.p)) {
        hold.release();
        hold = null;
      }
    },
    onPhase: (f, ph, a) => {
      // a big hit can end a Titan phase early only by beating the Titan; the next phase frees the next one
      if (titan) banishTitan(f, a, true);
      a.sc.time.delayedCall(900, () => f.alive && phaseStart(f, a, ph));
    },
    update: (f, dt, a) => {
      // (a second time round the journey adds a phase past the plan: that one is Hades too)
      if ((order[f.phase - 1] ?? null) !== null || titan) return;
      // Lord of the Dead: shadows creep out to steal slices
      const h = heat(a);
      shadows.every = h.cooldown(6);
      if (shadowsOut < (h.rank >= 2 ? 3 : 2) && shadows.tick(dt)) shadow(f, a);
    },
    onDeath: (f, a) => {
      bin.flush();
      for (let i = 0; i < 14; i++) a.sc.time.delayedCall(i * 40, () => a.fx.burn(f.cx + (Math.random() - 0.5) * 260, f.cy + (Math.random() - 0.5) * 200));
      shatter(a, f, { burst: 0x4fb8ff, tint: 0xbfd8ff, sfx: 'sfx_hades_banish' });
      // the souls he held drift free
      for (let i = 0; i < 10; i++) {
        const g = a.sc.add.image(f.cx + (Math.random() - 0.5) * 400, f.cy + Math.random() * 200, 'glow').setTint(0x9fe8ff).setBlendMode(Phaser.BlendModes.ADD).setScale(0.3).setAlpha(0);
        a.fxLayer.add(g);
        a.sc.tweens.add({ targets: g, alpha: { from: 0.9, to: 0 }, y: g.y - 500 - Math.random() * 200, x: g.x + (Math.random() - 0.5) * 200, duration: 1800 + Math.random() * 800, delay: i * 90, onComplete: () => g.destroy() });
      }
    },
  };

  /** Phase N: free its Titan (Hades hides behind it), or, in the last phase, come out himself. */
  const phaseStart = (f: Foot, a: Arena, ph: number) => {
    const kind = order[ph - 1] ?? null;
    if (!kind) {
      hold?.release();
      hold = null;
      shield(a, f, false);
      a.quip(f.x, Math.max(SAFE_TOP + 50, f.cy - 170), 'EVERY SLICE ENDS UP WITH ME.', '#8fd8ff', 40);
      shadows.t = 2;
      return;
    }
    raiseTitan(f, a, kind);
  };

  const raiseTitan = (f: Foot, a: Arena, kind: Titan) => {
    const h = heat(a);
    shield(a, f, true);
    hold?.release();
    // (with one pizza left he doesn't claim its lane: the Titan has to be able to reach it)
    hold = a.alivePizzas().length > 1 ? takeLane(a, f) : null;
    const others = a.alivePizzas().filter((p) => p !== hold?.p);
    const p = rnd(others) ?? rnd(a.alivePizzas()) ?? null;
    const x = p?.x ?? W / 2;
    // the floor cracks open and the chains holding the Titan snap
    const rift = a.sc.add.image(x, 772, 'p9_rift').setScale(0, 1).setAlpha(0.95);
    a.underLayer.add(rift);
    a.sc.tweens.add({ targets: rift, scaleX: 1, duration: 500, ease: 'Back.Out' });
    const chains = [-90, 90].map((dx) => {
      const c = a.sc.add.image(x + dx, -40, 'p9_chain').setOrigin(0.5, 0);
      a.fxLayer.add(c);
      return c;
    });
    a.sfx('sfx_hades_rise');
    a.sfx('sfx_hades_chains');
    a.shake(900, 0.01);
    a.rumble(1, 600);
    // (the phase banner already names the Titan: no second banner over the action)
    a.sc.time.delayedCall(700, () => {
      for (const c of chains) {
        a.sc.tweens.add({ targets: c, y: -420, angle: (Math.random() - 0.5) * 60, alpha: 0, duration: 500, ease: 'Quad.In', onComplete: () => c.destroy() });
      }
      if (!f.alive || !a.inWave()) {
        rift.destroy();
        return;
      }
      const t = a.spawn(kind, p);
      if (!t) {
        rift.destroy();
        shield(a, f, false);
        return;
      }
      t.maxHp = t.hp = Math.round(f.maxHp * TITAN_HP[h.rank]);
      t.setPhaseAura(kind === 'kronos' ? 0xd9c27a : kind === 'atlas' ? 0x5fa8ff : 0xffb040);
      a.quip(x, SAFE_TOP + 80, `${kind.toUpperCase()} IS FREE!`, '#ffd23f', 50);
      titan = { f: t, kind, bin: new Bin(), rift };
      move.every = h.cooldown(kind === 'atlas' ? 10 : kind === 'hyperion' ? 8 : 9);
      move.t = 3.5;
    });
  };

  const banishTitan = (f: Foot, a: Arena, beaten: boolean) => {
    if (!titan) return;
    const tt = titan;
    titan = null;
    tt.bin.flush();
    for (const p of [...burning]) burning.delete(p);
    if (tilted) level(a);
    a.sc.tweens.add({ targets: tt.rift, scaleX: 0, duration: 500, ease: 'Back.In', onComplete: () => tt.rift.destroy() });
    if (tt.f.alive) tt.f.die();
    if (!beaten || !f.alive) return;
    a.sfx('sfx_hades_banish');
    a.flash(200, 255, 220, 140);
    a.quip(tt.f.x, Math.max(SAFE_TOP + 60, tt.f.cy - 160), 'SENT BACK TO TARTARUS!', '#7dff9a', 44);
    // Hades is out in the open until the next phase
    shield(a, f, false);
    hold?.release();
    hold = null;
    a.quip(f.x, Math.max(SAFE_TOP + 60, f.cy - 170), 'HIT HADES!', '#ffe14d', 46);
  };

  const titanTick = (f: Foot, dt: number, a: Arena) => {
    const tt = titan!;
    if (move.tick(dt) && tt.f.alive && tt.f.stunT <= 0) {
      if (tt.kind === 'kronos') hourglass(f, a, tt);
      else if (tt.kind === 'atlas') tilt(f, a, tt);
      else flare(f, a, tt);
    }
  };

  // Kronos: the hourglass flips; smash it before the sand runs out or time slows for you (and speeds up for them)
  const hourglass = (_f: Foot, a: Arena, tt: NonNullable<typeof titan>) => {
    const h = heat(a);
    const k = tt.f;
    const sec = h.windup(2.4);
    const ticks = a.sc.time.addEvent({ delay: 420, repeat: Math.floor(sec / 0.42), callback: () => a.sfx('sfx_hades_tick', { throttle: 100 }) });
    const forgetTicks = tt.bin.add(() => ticks.remove());
    a.quip(k.x, Math.max(SAFE_TOP + 40, k.cy - 160), 'TICK… TOCK…', '#d9c27a', 40);
    const prop = hitProp(a, {
      key: 'p9_hourglass',
      x: k.x,
      y: SAFE_TOP + 140,
      scale: 0.8,
      hits: h.hits(3),
      r: 110,
      sec,
      badgeDy: -110,
      label: 'SHATTERED!',
      clearSfx: 'sfx_hades_shatter',
      follow: () => (k.alive ? { x: Phaser.Math.Clamp(k.x + (k.x < W / 2 ? 170 : -170), 150, W - 150), y: Math.max(SAFE_TOP + 140, k.cy - 40) } : null),
      onClear: () => {
        forgetTicks();
        if (k.alive) k.stun(h.stun(1.5));
      },
      onFail: () => {
        forgetTicks();
        if (!a.inWave()) return;
        const s = h.stun(4);
        a.slowPeel(s);
        a.hurry(1.3, s);
        a.flash(300, 217, 194, 122);
        a.sfx('sfx_hades_slow');
        const pp = a.peelPoint();
        a.quip(pp.x, pp.y - 80, 'TIME SLOWS!', '#d9c27a', 44);
      },
    });
    tt.bin.add(() => prop.destroy());
    a.sc.tweens.add({ targets: prop.img, angle: 180, duration: 400, ease: 'Back.Out' });
  };

  // Atlas: one end of the table lifts and the pizzas slide towards his stomp at the other end
  const tilt = (_f: Foot, a: Arena, tt: NonNullable<typeof titan>) => {
    const h = heat(a);
    const side = Math.random() < 0.5 ? -1 : 1; // the low end
    const sec = h.windup(2.6);
    const cam = a.sc.cameras.main;
    tilted = true;
    a.sfx('sfx_hades_tilt');
    a.quip(W / 2, SAFE_TOP + 70, 'THE TABLE TILTS!', '#9ad8ff', 46);
    const lean = a.sc.tweens.add({ targets: cam, rotation: side * 0.022, duration: sec * 1000, ease: 'Sine.In' });
    // the pizzas start to slide towards the low end, the far ones furthest
    a.sc.time.delayedCall(sec * 400, () => {
      if (!tilted) return;
      a.sfx('sfx_hades_slide');
      for (const p of a.alivePizzas()) {
        const d = side > 0 ? W - 160 - p.x : p.x - 160;
        p.rollTo(p.x + side * Math.min(150, Math.max(0, d) * 0.3), sec * 600);
      }
    });
    const hand = hitProp(a, {
      key: 'p9_atlashand',
      x: side > 0 ? 190 : W - 190,
      y: 960,
      scale: 0.9,
      hits: h.hits(3),
      r: 120,
      sec,
      badgeDy: -110,
      label: 'LEVEL!',
      onClear: () => {
        lean.remove();
        level(a);
        if (tt.f.alive) tt.f.stun(h.stun(2));
      },
      onFail: () => {
        lean.remove();
        if (!a.inWave()) return level(a);
        const low = lanePizzas(a)[side > 0 ? a.alivePizzas().length - 1 : 0];
        a.shake(500, 0.014);
        a.sfx('sfx_bigfoot_pound', { volume: 0.8 });
        if (low) a.hitPizza(low, h.slices(1), 'SLID INTO HIS STOMP!', '#9ad8ff');
        a.sc.time.delayedCall(700, () => level(a));
      },
    });
    tt.bin.add(() => hand.destroy());
  };

  const level = (a: Arena) => {
    tilted = false;
    const cam = a.sc.cameras.main;
    a.sc.tweens.add({ targets: cam, rotation: 0, duration: 400, ease: 'Back.Out' });
    a.layoutPizzas();
  };

  // Hyperion: a solar flare sets a pizza alight; it loses a slice every 4 s until you smack the flames out
  const flare = (_f: Foot, a: Arena, tt: NonNullable<typeof titan>) => {
    const h = heat(a);
    const k = tt.f;
    if (burning.size >= 2) return;
    const p = rnd(a.alivePizzas().filter((q) => !burning.has(q)));
    if (!p) return;
    k.flash(0xfff2a8, 400);
    a.sfx('sfx_hades_flare');
    mark(a, 'p_reticle', p.x, p.surfaceY - 30, 1.1, 0.6);
    a.quip(p.x, p.surfaceY - 180, 'SOLAR FLARE!', '#ffb040', 40);
    a.sc.time.delayedCall(1100, () => {
      if (!titan || titan !== tt || p.dead || !a.inWave()) return;
      burning.add(p);
      a.fx.explosion(p.x, p.surfaceY - 30, 90);
      const burn = a.sc.time.addEvent({
        delay: 4000,
        loop: true,
        callback: () => {
          if (p.dead || !a.inWave()) return done();
          for (let i = 0; i < 5; i++) a.fx.burn(p.x + (Math.random() - 0.5) * 120, p.surfaceY);
          a.hitPizza(p, 1, 'BURNING!', '#ffb040');
        },
      });
      const flames = a.sc.time.addEvent({ delay: 140, loop: true, callback: () => a.fx.burn(p.x + (Math.random() - 0.5) * 150, p.surfaceY - 10) });
      let prop: Prop | null = null;
      const done = () => {
        burn.remove();
        flames.remove();
        burning.delete(p);
        prop?.destroy();
      };
      prop = hitProp(a, {
        key: 'p9_flare',
        x: p.x,
        y: p.surfaceY - 40,
        scale: 0.8,
        hits: h.hits(3),
        r: 120,
        badgeDy: -90,
        label: 'FLAMES OUT!',
        clearSfx: 'sfx_hades_douse',
        follow: () => (p.dead ? null : { x: p.x, y: p.surfaceY - 40 }),
        onClear: () => {
          prop = null;
          done();
        },
      });
      tt.bin.add(done);
    });
  };

  // Hades: a shadow pools under a pizza, grabs a slice and drags it back to him. Smack it to make it let go.
  const shadow = (f: Foot, a: Arena) => {
    const h = heat(a);
    const p = rnd(a.alivePizzas().filter((q) => q.slices > 0));
    if (!p) return;
    shadowsOut++;
    const pool = a.sc.add.ellipse(p.x, p.surfaceY - 6, 40, 14, 0x0a0618, 0.75);
    a.underLayer.add(pool);
    a.sc.tweens.add({ targets: pool, width: 300, height: 90, duration: 600, ease: 'Sine.Out' });
    a.sfx('sfx_hades_shadow');
    const tell = h.windup(1.5);
    const drag = h.windup(2.8);
    let t = 0;
    let holding = false;
    let ended = false;
    let slice: Phaser.GameObjects.Image | null = null;
    const from = { x: p.x, y: p.surfaceY - 60 };
    const pos = () => {
      if (t < tell) return { x: from.x, y: from.y + 40 * (1 - Math.min(1, t / 0.4)) };
      const k = Phaser.Math.Clamp((t - tell) / drag, 0, 1);
      const e = Math.pow(k, 1.3);
      return { x: from.x + (f.x - from.x) * e, y: from.y + (f.cy - from.y) * e - Math.sin(k * Math.PI) * 90 };
    };
    const end = () => {
      if (ended) return;
      ended = true;
      shadowsOut = Math.max(0, shadowsOut - 1);
      ev.remove();
      slice?.destroy();
      a.sc.tweens.add({ targets: pool, alpha: 0, duration: 300, onComplete: () => pool.destroy() });
    };
    const forget = bin.add(() => {
      end();
      hand.destroy();
    });
    const hand = hitProp(a, {
      key: 'p9_shadowhand',
      x: from.x,
      y: from.y,
      scale: 0.8,
      hits: h.hits(2),
      r: 105,
      badgeDy: -100,
      label: 'LET GO!',
      follow: () => (ended ? null : pos()),
      onClear: () => {
        // it drops what it was carrying, which flies home
        if (holding && !p.dead) {
          p.heal(1);
          a.fx.healBurst(p.x, p.surfaceY - 20);
          a.quip(p.x, p.surfaceY - 160, 'SLICE BACK!', '#7dff9a', 40);
          a.sfx('sfx_heal', { volume: 0.7 });
        }
        forget();
      },
    });
    const ev = a.sc.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        t += 0.016;
        if (!holding && t >= tell) {
          if (p.dead || !a.inWave()) {
            forget();
            return;
          }
          holding = true;
          a.sfx('sfx_hades_grab');
          a.hitPizza(p, 1, 'SNATCHED BY A SHADOW!', '#b8a8ff');
          slice = a.sc.add.image(from.x, from.y + 20, 'p9_slice').setScale(0.7);
          a.fxLayer.add(slice);
        }
        if (slice) {
          const at = pos();
          slice.setPosition(at.x, at.y + 30);
        }
        if (t >= tell + drag) {
          // it made it back: Hades feeds on the slice
          if (f.alive && a.inWave()) {
            f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.02);
            a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 150), 'HE FEEDS!', '#b8a8ff', 40);
            a.fx.healBurst(f.cx, f.cy);
          }
          forget();
        }
      },
    });
  };

  return brain;
};

export const brains: Record<string, () => Brain> = { minotaur, medusa, cerberus, hades };
