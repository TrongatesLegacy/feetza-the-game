// Dev-only smack recorder: why a click did or didn't land. Every pointer press in play is logged with where the
// pointer and the peel were, what blocked it (a modal, a stun, a pause), what it hit, and every live clickable
// target near it (its centre, radius or custom shape, priority, label and whether the point was inside). Presses
// that never reached the game canvas (a DOM element on top) are logged too. The log goes to the dev server
// (.dev-logs/smacks.json, see vite.config.ts) every couple of seconds, and to window.__smacks.
//
// The overlay (the floating 🎯 Hitboxes button, or ?dev&hitboxes) draws every live target's hit area each frame and
// marks each smack: green where it landed on something, red where it missed.

import Phaser from 'phaser';
import type { Clickable } from './arena';

export interface SmackEntry {
  t: number;
  wave: number;
  /** The pointer and the peel when pressed (they differ while the peel is slowed). */
  pointer: [number, number];
  peel: [number, number];
  /** Why the smack didn't happen at all (modal, paused, stunned, upgrade, over, dom:<element>). */
  blocked?: string;
  result?: string;
  near: { label: string; at: [number, number]; r: number; shape: boolean; prio: number; inside: boolean; dist: number }[];
  feet: { id: string; d: number }[];
  state: { slowT: number; stunT: number; modal: boolean };
}

export const smackLog = {
  on: false,
  overlay: false,
  entries: [] as SmackEntry[],
  pending: [] as SmackEntry[],
};

export function labelOf(c: Clickable): string {
  const l = c.label;
  if (l) return l;
  // unlabelled: the first words of its hit handler are usually telling (a quip, a sound name)
  const src = String(c.hit);
  const m = src.match(/'([A-Z][A-Z !]{3,})'|sfx_[a-z_]+/);
  return m ? m[0].replace(/'/g, '') : 'target';
}

export function describeNear(clickables: Clickable[], x: number, y: number): SmackEntry['near'] {
  return clickables
    .filter((c) => c.alive())
    .map((c) => {
      const inside = c.contains ? c.contains(x, y) : Math.hypot(c.x - x, c.y - y) <= c.r;
      return { label: labelOf(c), at: [Math.round(c.x), Math.round(c.y)] as [number, number], r: Math.round(c.r), shape: !!c.contains, prio: c.priority ?? 0, inside, dist: Math.round(Math.hypot(c.x - x, c.y - y)) };
    })
    .filter((o) => o.inside || o.dist < 600)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 8);
}

export function record(e: SmackEntry): void {
  if (!smackLog.on) return;
  smackLog.entries.push(e);
  if (smackLog.entries.length > 400) smackLog.entries.shift();
  smackLog.pending.push(e);
  (window as unknown as { __smacks?: SmackEntry[] }).__smacks = smackLog.entries;
}

let flushT = 0;
export function startSmackLog(): void {
  if (smackLog.on) return;
  smackLog.on = true;
  flushT = window.setInterval(() => {
    if (!smackLog.pending.length) return;
    const batch = smackLog.pending.splice(0);
    fetch('/__smacklog', { method: 'POST', body: JSON.stringify(batch) }).catch(() => {});
  }, 2000);
  // presses that never reach the canvas: something in the DOM is on top of the game there
  window.addEventListener(
    'pointerdown',
    (ev) => {
      const t = ev.target as HTMLElement | null;
      if (!t || t.tagName === 'CANVAS' || t.closest('.bl-fab,.panel,.screen,button,input,select,textarea')) return;
      record({ t: performance.now(), wave: 0, pointer: [ev.clientX, ev.clientY], peel: [0, 0], blocked: `dom:${(t.className || t.tagName).toString().slice(0, 60)}`, near: [], feet: [], state: { slowT: 0, stunT: 0, modal: false } });
    },
    true,
  );
}

export function stopSmackLog(): void {
  smackLog.on = false;
  clearInterval(flushT);
}

/** The overlay: every live target's hit area, and where recent smacks landed. */
export class HitboxOverlay {
  private g: Phaser.GameObjects.Graphics;
  private marks: { x: number; y: number; ok: boolean; t: number }[] = [];
  constructor(private sc: Phaser.Scene) {
    this.g = sc.add.graphics().setDepth(100000);
  }
  mark(x: number, y: number, ok: boolean): void {
    this.marks.push({ x, y, ok, t: this.sc.time.now });
    if (this.marks.length > 30) this.marks.shift();
  }
  draw(clickables: Clickable[]): void {
    const g = this.g;
    g.clear();
    if (!smackLog.overlay) return;
    for (const c of clickables) {
      if (!c.alive()) continue;
      const col = (c.priority ?? 0) >= 2 ? 0x39ff7a : 0x4ad8ff;
      if (c.contains) {
        // sample the custom shape on a coarse grid round its centre
        const step = 18;
        g.fillStyle(col, 0.22);
        for (let y = c.y - 420; y <= c.y + 420; y += step) for (let x = c.x - 420; x <= c.x + 420; x += step) if (c.contains(x, y)) g.fillRect(x - step / 2, y - step / 2, step, step);
      } else {
        g.fillStyle(col, 0.18).fillCircle(c.x, c.y, c.r);
        g.lineStyle(3, col, 0.9).strokeCircle(c.x, c.y, c.r);
      }
      g.fillStyle(col, 1).fillCircle(c.x, c.y, 5);
    }
    const now = this.sc.time.now;
    for (const m of this.marks) {
      const a = Math.max(0, 1 - (now - m.t) / 4000);
      if (a <= 0) continue;
      g.lineStyle(5, m.ok ? 0x39ff7a : 0xff3a3a, a);
      g.strokeCircle(m.x, m.y, 16);
      g.lineBetween(m.x - 22, m.y, m.x + 22, m.y);
      g.lineBetween(m.x, m.y - 22, m.x, m.y + 22);
    }
  }
  destroy(): void {
    this.g.destroy();
  }
}
