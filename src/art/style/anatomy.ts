// The shared foot anatomy for the style kit: one continuous silhouette from the ankle down the outer side, round
// all five toes (little toe on the left, big toe on the right, like toesFor in feetCommon.ts) and back up the inner
// side. Toes are lobes of the one outline, split by clefts, not balls stacked on a body. Poses (curl, splay,
// wiggle) move the lobes; the rig draws a few poses as frames (src/game/footRig.ts).

import { CX } from '../feetCommon';
import type { Ctx } from '../util';
import type { Box, PathFn, Pose } from './kit';

export interface StyleToe {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Tilt (radians, + turns the tip to the left). */
  rot: number;
}

export interface BareOpts {
  /** Extra width (chubby feet). */
  w?: number;
  /** Ankle half width at the top. */
  ankle?: number;
  /** Toe size multiplier. */
  toe?: number;
  /** Toe length multiplier. */
  toeLen?: number;
  /** Ball width multiplier (spreads the toes and the sides). */
  ball?: number;
  /** Top of the silhouette (design y). */
  top?: number;
  /** How far the clefts reach up between the toes (fraction of a toe's half length, default 0.62). */
  cleft?: number;
}

/** Rest toes (like toesFor), little toe first. */
export function restToes(o: BareOpts = {}): StyleToe[] {
  const k = o.toe ?? 1;
  const L = o.toeLen ?? 1;
  const b = o.ball ?? 1;
  const base: [number, number, number, number, number][] = [
    [33, 212, 17.5, 24, 0.28],
    [68, 223, 19.5, 29, 0.14],
    [105, 229, 21, 31, 0.04],
    [144, 231, 23, 33, -0.03],
    [189, 226, 29.5, 38, -0.1],
  ];
  return base.map(([cx, cy, rx, ry, rot]) => ({ cx: CX + (cx - CX) * b, cy: cy - (1 - L) * ry * 0.5, rx: rx * k, ry: ry * k * L, rot }));
}

/** Toes moved by a pose: curl pulls them up and shortens them, splay spreads them, wiggle bobs each one. */
export function poseToes(toes: StyleToe[], p: Pose): StyleToe[] {
  const c = Math.max(0, p.curl);
  const s = Math.max(0, -p.curl);
  return toes.map((t, i) => {
    const w = p.wiggle[i] ?? 0;
    const ry = t.ry * (1 - 0.3 * c + 0.03 * s + 0.06 * w);
    return {
      cx: t.cx + (t.cx - CX) * 0.09 * s,
      cy: t.cy - t.ry * 0.32 * c + 5 * w + 2 * s,
      rx: t.rx * (1 + 0.08 * c + 0.04 * s),
      ry,
      rot: t.rot + ((t.cx - CX) / 100) * 0.2 * s - w * 0.08,
    };
  });
}

/** A point on a toe's ellipse at angle a (0 = its right side, π/2 = its tip, −π/2 = its root). */
export function onToe(t: StyleToe, a: number): [number, number] {
  const x = Math.cos(a) * t.rx;
  const y = Math.sin(a) * t.ry;
  const c = Math.cos(t.rot);
  const s = Math.sin(t.rot);
  return [t.cx + x * c - y * s, t.cy + x * s + y * c];
}

/** Is (x, y) inside a toe's ellipse? */
export function inToe(t: StyleToe, x: number, y: number, grow = 0): boolean {
  const c = Math.cos(-t.rot);
  const s = Math.sin(-t.rot);
  const dx = x - t.cx;
  const dy = y - t.cy;
  const u = dx * c - dy * s;
  const v = dx * s + dy * c;
  return (u / (t.rx + grow)) ** 2 + (v / (t.ry + grow)) ** 2 <= 1;
}

/** Where two neighbouring toes part: the lowest point where their outlines still overlap. */
export function cleft(a: StyleToe, b: StyleToe): [number, number] {
  let best: [number, number] = [(a.cx + a.rx + b.cx - b.rx) / 2, Math.max(a.cy, b.cy)];
  for (let y = Math.min(a.cy, b.cy) - 10; y < Math.max(a.cy + a.ry, b.cy + b.ry); y += 0.5) {
    let hit = -1;
    for (let x = a.cx; x <= b.cx; x += 0.5) if (inToe(a, x, y) && inToe(b, x, y)) hit = x;
    if (hit >= 0) best = [hit, y];
    else if (y > Math.max(a.cy, b.cy)) break;
  }
  return best;
}

/** The bare foot as parts: the body (ankle to the ball, its bottom edge hidden under the toes) and the five toes.
 * Painted as one silhouette (Sil), their union gets one outline with a notch where each pair of toes parts. */
export function bareParts(toes: StyleToe[], o: BareOpts = {}): PathFn[] {
  const w = o.w ?? 0;
  const an = o.ankle ?? 50;
  const top = o.top ?? -6;
  const b = o.ball ?? 1;
  const L = CX - 93 * b - w;
  const R = CX + 102 * b + w;
  const ballY = Math.min(...toes.map((t) => t.cy)) - 4;
  const body: PathFn = (ctx: Ctx) => {
    ctx.beginPath();
    ctx.moveTo(CX - an, top);
    // outer side: down the ankle, then the bulb out to the ball
    ctx.bezierCurveTo(CX - an - 1, top + 34, CX - an - 4, top + 56, L + 22, top + 104);
    ctx.bezierCurveTo(L + 6, top + 134, L - 1, top + 160, L + 1, ballY - 4);
    // the bottom edge runs under the toes
    ctx.lineTo(toes[0].cx, ballY + 4);
    for (const t of toes) ctx.lineTo(t.cx, t.cy);
    ctx.lineTo(R, ballY - 8);
    // inner side: up the arch to the ankle
    ctx.bezierCurveTo(R + 1, top + 120, CX + an + 10, top + 64, CX + an + 2, top + 34);
    ctx.quadraticCurveTo(CX + an, top + 14, CX + an, top);
    ctx.closePath();
  };
  const toe = (t: StyleToe): PathFn => (ctx: Ctx) => {
    ctx.beginPath();
    ctx.ellipse(t.cx, t.cy, t.rx, t.ry, t.rot, 0, Math.PI * 2);
  };
  return [body, ...toes.map(toe)];
}

/** The bare foot's bounds. */
export function bareBox(o: BareOpts = {}): Box {
  const w = o.w ?? 0;
  const b = o.ball ?? 1;
  return { x: CX - 93 * b - w - 14, y: (o.top ?? -6) - 2, w: 195 * b + 2 * w + 34, h: 280 };
}
