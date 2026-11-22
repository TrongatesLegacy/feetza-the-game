// How dough moves in play, shared by Dough Boy (bosses.ts) and Dough Toes (roster.ts); their art is in
// src/content/style/dough-kit.ts. A blob of dough on soft, under-damped springs of its own (the def's pose): it
// jiggles and oozes all the time (its width breathes out of step with its height); before a dive it sags and
// spreads, then gathers itself up and in; it lands with a wide, flat splat and pulls back with an overshooting wobble
// (the width lags the height, and the mass rocks to its heavy side); as it lifts off, a strand of dough stretches
// from its sole to the ground, necks and snaps, the halves springing back. Flour drifts off its top and puffs out
// when it lands. Dough Toes also tears in two when it's smacked to death (its 'split' trait spawns two little feet
// where the halves fly). Cosmetic randomness only through crand().

import Phaser from 'phaser';
import { CX } from '../../art/feetCommon';
import { type LiveDef, type LiveFoot, Spring, type WorldEmitter } from '../../game/liveKit';
import { save } from '../../systems/save';
import { crand } from '../../systems/cosmeticRandom';

const R = () => crand();
const pm = () => crand() - 0.5;

interface DoughStrand {
  /** The ground end (world px) and the time since it lifted off (s). */
  gx: number;
  gy: number;
  t: number;
  /** How long it stretches before it snaps (design units), and when it did (s). */
  reach: number;
  snapAt: number;
  /** Snapped: its length and direction then, in the foot's own frame (measured on the first frame drawn after). */
  snap?: { len: number; ux: number; uy: number; measured: boolean };
}

export interface DoughLive {
  flour: WorldEmitter;
  dust: WorldEmitter;
  sy: Spring;
  sx: Spring;
  rock: Spring;
  curl: number;
  ground: [number, number] | null;
  strand: DoughStrand | null;
  gfx: Phaser.GameObjects.Graphics;
  last: string;
}

export interface DoughOpts {
  /** Where its sole meets the ground and where the strand leaves it (design units). */
  contact: number;
  strand: [number, number];
  /** The strand's thickness at the sole and on the ground, and how far it stretches (design units). */
  strandW: [number, number];
  reach: number;
  /** How hard it sags, gathers and splats (1 = Dough Boy). */
  give?: number;
  /** Where flour drifts off its top (design x, y, w, h), and the landing puff's count and spread. */
  flourArea: [number, number, number, number];
  puff: [number, number];
  /** Tear in two when it's killed (a 'split' foot), the halves flying this far apart (world px, each way). */
  split?: number;
}

const DOUGH_FILL = 0xefd3a0;
const DOUGH_SHADE = 0xcf9f62;
const DOUGH_LIT = 0xfff4dc;
const DOUGH_LINE = 0x4a2610;
const calm = () => (save.settings.reducedMotion ? 0.35 : 1);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

type Pt = Phaser.Math.Vector2;

/** A tapered rope from a to b on g: half widths wa at a, wb at b, `neck` at its thinnest (u = at), bowed sideways
 * by `bow`, its thickness lumpy (`lump` 0…1, seeded by `ph`); lit down its near side, shaded on the far one,
 * outlined `lw` thick. */
function rope(g: Phaser.GameObjects.Graphics, ax: number, ay: number, bx: number, by: number, wa: number, wb: number, neck: number, at: number, bow: number, alpha: number, lw: number, lump = 0, ph = 0): void {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const n = 18;
  const left: Pt[] = [];
  const right: Pt[] = [];
  const lit: Pt[] = [];
  const shaded: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const b = Math.sin(u * Math.PI) * bow;
    const cx = ax + dx * u + nx * b;
    const cy = ay + dy * u + ny * b;
    // thick where it pulls out of the dough at each end, necking in between, lumpy along its length (more on one
    // side than the other)
    const w = neck + (wa - neck) * Math.exp(-(u / Math.max(0.05, at)) * 3) + (wb - neck) * Math.exp(-((1 - u) / Math.max(0.05, 1 - at)) * 3);
    const k = Math.sin(u * Math.PI) * lump;
    const wl = w * (1 + k * (0.26 * Math.sin(u * 11 + ph) + 0.12 * Math.sin(u * 27 + ph * 2.3)));
    const wr = w * (1 + k * (0.2 * Math.sin(u * 13 + ph * 1.7 + 1) + 0.14 * Math.sin(u * 23 + ph)));
    left.push(new Phaser.Math.Vector2(cx + nx * wl, cy + ny * wl));
    right.push(new Phaser.Math.Vector2(cx - nx * wr, cy - ny * wr));
    lit.push(new Phaser.Math.Vector2(cx + nx * wl * 0.5, cy + ny * wl * 0.5));
    shaded.push(new Phaser.Math.Vector2(cx - nx * wr * 0.55, cy - ny * wr * 0.55));
  }
  const poly = [...left, ...right.reverse()];
  g.fillStyle(DOUGH_FILL, alpha).fillPoints(poly, true);
  g.lineStyle(Math.max(1, lw * 0.6), DOUGH_SHADE, 0.7 * alpha).strokePoints(shaded);
  g.lineStyle(Math.max(1, lw * 0.42), DOUGH_LIT, 0.75 * alpha).strokePoints(lit);
  g.lineStyle(lw, DOUGH_LINE, alpha).strokePoints(poly, true);
}

/** A soft lump of dough on g, lit at its top left. */
function blob(g: Phaser.GameObjects.Graphics, x: number, y: number, rx: number, ry: number, alpha: number, lw: number): void {
  g.fillStyle(DOUGH_SHADE, alpha * 0.9).fillEllipse(x + rx * 0.08, y + ry * 0.1, rx * 2, ry * 2);
  g.fillStyle(DOUGH_FILL, alpha).fillEllipse(x - rx * 0.05, y - ry * 0.06, rx * 1.86, ry * 1.8);
  g.fillStyle(DOUGH_LIT, 0.7 * alpha).fillEllipse(x - rx * 0.3, y - ry * 0.35, rx * 0.8, ry * 0.5);
  g.lineStyle(lw, DOUGH_LINE, alpha).strokeEllipse(x, y, rx * 2, ry * 2);
}

/** An irregular lump of torn dough on g: a lumpy outline (seeded), and on the side it tore from (`torn` −1 left,
 * 1 right) a ragged, pulled face. Lit inside, shaded just inside its lower right, so it fades by alpha without
 * muddying. */
function tornLump(g: Phaser.GameObjects.Graphics, x: number, y: number, rx: number, ry: number, torn: number, rag: number, seed: number, alpha: number, lw: number): void {
  const n = 26;
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    let r = 1 + 0.11 * Math.sin(a * 3 + seed) + 0.07 * Math.sin(a * 5 + seed * 2.1);
    // the torn face: pulled out into ragged points
    const face = Math.max(0, Math.cos(a) * torn);
    if (face > 0.45) r += rag * (i % 2 ? 0.2 : -0.06) * (face - 0.45) * 2.2;
    pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r));
  }
  g.fillStyle(DOUGH_FILL, alpha).fillPoints(pts, true);
  g.fillStyle(DOUGH_SHADE, alpha * 0.55).fillEllipse(x + rx * 0.22, y + ry * 0.3, rx * 1.1, ry * 0.8);
  g.fillStyle(DOUGH_LIT, 0.75 * alpha).fillEllipse(x - rx * 0.3, y - ry * 0.35, rx * 0.8, ry * 0.45);
  g.lineStyle(lw, DOUGH_LINE, alpha).strokePoints(pts, true);
}
/** Draw the dough strand (or its two snapped halves) in the foot's own frame. */
function drawStrand(k: LiveFoot, st: DoughLive, o: DoughOpts): void {
  const g = st.gfx;
  g.clear();
  const s = st.strand;
  if (!s) return;
  const f = k.f;
  const r = f.root;
  const ci = Math.cos(-r.rotation);
  const si = Math.sin(-r.rotation);
  // world → the root's frame
  const loc = (wx: number, wy: number): [number, number] => {
    const lx = wx - r.x;
    const ly = wy - r.y;
    return [(ci * lx - si * ly) / r.scaleX, (si * lx + ci * ly) / r.scaleY];
  };
  // one design unit in the root's frame
  const du = f.type.scale;
  const lw = du * 2.6;
  const [wa, wb] = o.strandW;
  const [tx, ty] = loc(...f.styleWorld(o.strand[0], o.strand[1]));
  const [gx, gy] = loc(s.gx, s.gy);
  if (!s.snap) {
    // stretching: it necks as it gets longer
    const u = clamp01(Math.hypot(gx - tx, gy - ty) / du / s.reach);
    // (never thinner than its outline, so it stays one piece until it snaps)
    const neck = Math.max(3.4, wa * 0.54 * Math.pow(1 - u, 0.9)) * du;
    rope(g, tx, ty, gx, gy, wa * du, wb * du, neck, 0.55, Math.sin(s.t * 9) * 5 * du * (1 - u), 1, lw, 1, s.reach);
    return;
  }
  // snapped: the top half springs back up into the sole, the bottom half slumps into a little puddle that fades
  const t2 = s.t - s.snapAt;
  const sn = s.snap;
  if (!sn.measured) {
    const len = Math.hypot(gx - tx, gy - ty) || 1;
    Object.assign(sn, { len, ux: (gx - tx) / len, uy: (gy - ty) / len, measured: true });
  }
  const q = wa / 24;
  const up = Math.max(0, 1 - t2 / 0.14);
  if (up > 0) {
    const len = sn.len * 0.55 * up * up;
    const ex = tx + sn.ux * len;
    const ey = ty + sn.uy * len;
    rope(g, tx, ty, ex, ey, 20 * q * du, 5 * q * du, 3.5 * du, 0.6, 0, 1, lw, 0.6, s.reach);
    blob(g, ex, ey, 6 * q * du, 7 * q * du, 1, lw);
  }
  const down = Math.max(0, 1 - t2 / 0.24);
  const fade = Math.max(0, 1 - Math.max(0, t2 - 0.3) / 0.45);
  if (down > 0) {
    const len = sn.len * 0.45 * down;
    rope(g, gx, gy, gx - sn.ux * len, gy - sn.uy * len, 24 * q * du, 4.5 * q * du, 3.5 * du, 0.55, 0, fade, lw, 0.6, s.reach + 3);
    blob(g, gx - sn.ux * len, gy - sn.uy * len, 5.5 * q * du, 6.5 * q * du, fade, lw);
  }
  // the puddle it leaves on the ground
  if (fade > 0) blob(g, gx, gy - 3 * du, (18 + 10 * (1 - down)) * q * du, (6 + 3 * down) * q * du, fade, lw);
}

/** A ring of flour thrown out along the sole on landing. */
function landPuff(k: LiveFoot, em: WorldEmitter, n: number, y: number, spread: number, power: number): void {
  const s = k.f.type.scale;
  const tints = [0xffffff, 0xfff6e4, 0xf3e2c0];
  for (let i = 0, m = k.burst(n); i < m; i++) {
    const side = R() < 0.5 ? -1 : 1;
    em.emit(CX + side * R() * spread, y, { vx: side * (80 + R() * 260) * power, vy: -20 - R() * 80 * power, life: 0.7 + R() * 0.6, r0: 8 * s, r1: 30 * s, a: 0.45, tint: tints[Math.floor(R() * tints.length)], fade: 0.06 });
  }
}

/**
 * The tear (a 'split' foot's death): where it was, the dough stretches sideways into two unequal lobes, the strand
 * between them necks and snaps, and the two halves (ragged where they tore) fly out and up to where its two little
 * feet appear, the snapped ends springing back into them and flour bursting from the tear. Drawn in the feet layer
 * (the foot itself fades as it goes).
 */
function tear(k: LiveFoot, apart: number): void {
  const f = k.f;
  const layer = f.root.parentContainer;
  if (!layer) return;
  const sc = k.sc;
  const ts = f.type.scale;
  const [cx, cy] = f.styleWorld(CX, 170);
  // (the game spawns the two little feet at its x ± apart, hovering 100 px above it: their bodies sit about here)
  const ty = Math.max(140, f.y - 100) - 70 * ts;
  const rx0 = 92 * ts;
  const ry0 = 64 * ts;
  const lw = 2.6 * ts;
  const g = sc.add.graphics();
  layer.add(g);
  // (the live kit's particle atlas: this foot's own emitters made it)
  let aim = 0;
  let spd = 0;
  const flour = !sc.textures.exists('livekit_fx') ? null : sc.add.particles(0, 0, 'livekit_fx', {
    frame: 'puff',
    emitting: false,
    // (every spread from crand(), not Phaser's own random)
    lifespan: { onEmit: () => 450 + R() * 350 },
    speedX: { onEmit: () => ((aim = R() * Math.PI * 2), (spd = 80 + R() * 180), Math.cos(aim) * spd) },
    speedY: { onEmit: () => Math.sin(aim) * spd },
    scale: { start: 0.25 * ts, end: 0.9 * ts },
    alpha: { start: 0.45, end: 0 },
    tint: { onEmit: () => (R() < 0.5 ? 0xffffff : 0xfff6e4) },
  });
  if (flour) layer.add(flour);
  // fade the foot itself as the dough becomes the tear
  sc.tweens.addCounter({ from: 1, to: 0, duration: 110, onUpdate: (tw) => f.root.active && f.setVisualAlpha(tw.getValue() ?? 0) });
  // the halves: unequal (the bigger one on a random side), each with its own lumps
  const big = R() < 0.5 ? -1 : 1;
  const halves = ([-1, 1] as const).map((side) => ({ side, size: side === big ? 1 : 0.78, seed: R() * 10, spin: pm() * 0.6 }));
  const ph = R() * 10;
  const c = calm();
  let burst = false;
  sc.tweens.addCounter({
    from: 0,
    to: 1,
    duration: 680,
    onUpdate: (tw) => {
      const t = tw.getValue() ?? 0;
      g.clear();
      // 0…0.32 stretch and neck; then it snaps and the halves fly and fade
      const T = 0.32;
      if (t < T) {
        const st = t / T;
        const e = st * st * (3 - 2 * st);
        const pull = rx0 * (0.3 + e * 0.75 * c);
        const ry = ry0 * (1 - e * 0.25);
        // the strand between them first, so the lobes overlap its ends
        const [l, r] = halves.map((h) => cx + h.side * pull * (0.7 + 0.3 * h.size));
        rope(g, l, cy + 3 * ts, r, cy - 2 * ts, ry * 0.7, ry * 0.6, Math.max(3 * ts, ry * 0.7 * (1 - e)), big < 0 ? 0.6 : 0.4, Math.sin(t * 50) * 3 * ts, 1, lw, 1, ph);
        for (const h of halves) tornLump(g, cx + h.side * pull * (0.7 + 0.3 * h.size), cy + (h.side < 0 ? 3 : -2) * ts, rx0 * 0.55 * h.size, ry * h.size, 0, 0, h.seed, 1, lw);
        return;
      }
      if (!burst) {
        burst = true;
        flour?.explode(Math.round(10 * c) + 2, cx, cy);
      }
      const u = (t - T) / (1 - T);
      const fly = 1 - (1 - u) * (1 - u);
      const a = 1 - Math.max(0, (u - 0.6) / 0.4);
      for (const h of halves) {
        const x0 = cx + h.side * rx0 * (0.3 + 0.75 * c) * (0.7 + 0.3 * h.size);
        const x = x0 + (f.x + h.side * apart - x0) * fly;
        // up in an arc, a little high, settling onto the little foot
        const y = cy + (ty - cy) * fly - Math.sin(u * Math.PI) * 40 * ts;
        // round out from the stretch, wobbling (squash and stretch as it flies)
        const wob = Math.sin(u * 18) * 0.14 * (1 - u);
        const rx = rx0 * 0.56 * h.size * (1 - u * 0.2);
        // the snapped end of the strand, springing back into its torn face
        const back = Math.max(0, 1 - u / 0.35);
        if (back > 0) rope(g, x - h.side * rx * 0.6, y, x - h.side * rx * (0.6 + 1.1 * back), y + 3 * ts, rx * 0.4, 2.5 * ts, 3 * ts, 0.5, h.spin * 6 * ts, a, lw, 0.8, h.seed);
        tornLump(g, x, y, rx * (1 + wob), rx * 0.78 * (1 - wob), -h.side, 1, h.seed, a, lw);
      }
    },
    onComplete: () => {
      g.destroy();
      sc.time.delayedCall(900, () => flour?.active && flour.destroy());
    },
  });
}
/** A live def for a blob of dough (see the top of this file). */
export function doughLive(o: DoughOpts): LiveDef<DoughLive> {
  const give = o.give ?? 1;
  return {
    wiggle: true,
    rig: { swing: 1, squash: 1, breath: 1 },
    setup(k): DoughLive {
      const gfx = k.sc.add.graphics();
      k.f.addLiveFx(gfx, true);
      return {
        flour: k.emitter({ frame: 'puff', curl: 40, drag: 1.4, max: 140 }),
        dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.6, below: true, max: 80 }),
        // soft and under-damped: every move wobbles on after it
        sy: new Spring(1, 150, 7),
        sx: new Spring(1, 240, 12),
        rock: new Spring(0, 80, 5),
        curl: 0,
        ground: null,
        strand: null,
        gfx,
        last: '',
      };
    },
    pose(k, dt, p, st) {
      const f = k.f;
      const c = calm() * give;
      // the constant jiggle, and the ooze: the width breathes out of step with the height
      let syTo = 1 + (Math.sin(k.t * 1.25) * 0.016 + Math.sin(k.t * 2.9 + 1) * 0.007) * c;
      let ooze = Math.sin(k.t * 1.05 + 2) * 0.014 * c;
      let curlTo = 0;
      if (k.windingUp) {
        const u = clamp01((f.stateT - (f.hoverTime - 0.45)) / 0.45);
        if (u < 0.5) {
          // it sags, slumping down and out over its sole…
          syTo = 1 - 0.2 * c;
          ooze += 0.04 * c;
          curlTo = -0.5;
        } else {
          // …then gathers itself up and in
          syTo = 1 + 0.15 * c;
          ooze -= 0.05 * c;
          curlTo = 1;
        }
      } else if (f.state === 'descend') {
        syTo = 1 + Math.min(0.1, Math.max(0, f.vy) / 4200) * c;
        curlTo = 0.5;
      } else if (f.state === 'stomp') curlTo = k.sinceLand < 0.3 ? -1 : 0;
      else if (f.state === 'lift') {
        // the sole sticks for a moment as it pulls away
        syTo = 1 + (st.strand && !st.strand.snap ? 0.1 : 0.03) * c;
        curlTo = 0.3;
      }
      if (k.landed) {
        // splat: wide and flat, then the springs pull it back with an overshooting wobble
        st.sy.v -= 7 * c;
        st.rock.v += 0.9 * c;
        st.curl = -1;
      }
      const sy = Phaser.Math.Clamp(st.sy.step(syTo, dt), 0.66, 1.22);
      const sx = Phaser.Math.Clamp(st.sx.step(1 + (1 - sy) * 0.95 + ooze, dt), 0.85, 1.6);
      const rock = st.rock.step(0, dt);
      st.curl += Math.sign(curlTo - st.curl) * Math.min(Math.abs(curlTo - st.curl), (curlTo > st.curl ? 6 : 4) * dt);
      return { swing: p.swing + rock * 0.08, sx, sy, curl: st.curl };
    },
    tick(k, dt, st) {
      const f = k.f;
      const s = f.type.scale;
      const [fx, fy, fw, fh] = o.flourArea;
      // flour drifting off its floury top
      st.flour.rate('dust', 1.6, dt, () => {
        st.flour.emit(fx + R() * fw, fy + R() * fh, { vx: pm() * 20, vy: 8 + R() * 12, life: 1.6, r0: 3 * s, r1: 12 * s, a: 0.28, tint: 0xffffff, fade: 0.2 });
      });
      if (k.landed) {
        // a puff of flour off the sole, and flour shaken off its top
        landPuff(k, st.dust, o.puff[0], o.contact, o.puff[1], 1.15);
        for (let i = 0, n = k.burst(Math.round(o.puff[0] * 0.45)); i < n; i++) st.flour.emit(fx + 10 + R() * (fw - 20), fy + R() * fh * 0.8, { vx: pm() * 160, vy: -50 - R() * 70, life: 1 + R() * 0.5, r0: 5 * s, r1: 24 * s, a: 0.34, tint: R() < 0.5 ? 0xffffff : 0xfff6e4, fade: 0.08 });
        st.ground = f.styleWorld(o.strand[0], o.contact);
        st.strand = null;
      }
      // lifting off: a strand of dough stretches from the sole to where it stood, and snaps
      if (f.state === 'lift' && st.last !== 'lift' && st.ground) {
        st.strand = { gx: st.ground[0], gy: st.ground[1], t: 0, reach: o.reach * (0.88 + R() * 0.24), snapAt: 0 };
        st.ground = null;
      }
      if (f.state === 'descend' || f.state === 'hover') st.ground = null;
      st.last = f.state;
      const sd = st.strand;
      if (sd) {
        sd.t += dt;
        const [tx, ty] = f.styleWorld(o.strand[0], o.strand[1]);
        const len = Math.hypot(sd.gx - tx, sd.gy - ty) || 1;
        // it snaps once it's stretched as far as it goes (or it's been knocked well clear)
        if (!sd.snap && (len / (s * f.root.scaleX) >= sd.reach || sd.t > 0.7)) {
          sd.snapAt = sd.t;
          sd.snap = { len: 0, ux: 0, uy: 1, measured: false };
          // a little puff of flour where it parts (about halfway down: design units below the sole)
          const below = (len * 0.55) / (s * f.root.scaleY);
          for (let i = 0, n = k.burst(5); i < n; i++) st.dust.emit(o.strand[0] + pm() * 30, o.strand[1] + below, { vx: pm() * 90, vy: -10 - R() * 30, life: 0.6, r0: 3 * s, r1: 12 * s, a: 0.3, tint: 0xfff6e4, fade: 0.1 });
        }
        if (sd.snap && sd.t - sd.snapAt > 0.8) st.strand = null;
      }
      drawStrand(k, st, o);
    },
    die(k, st) {
      st.strand = null;
      st.gfx.clear();
      // torn in two by a killing smack (not when it escapes)
      if (o.split && k.f.hp <= 0) tear(k, o.split);
    },
  };
}
