// Controller support: polls the Gamepad API, drives the game (free aim or lane mode) and every DOM
// menu (focus ring, select, back), rumbles, and swaps button prompts to the last device used.

import { save } from './save';

export type PadPlayEvent =
  | { type: 'aim'; dx: number; dy: number }
  | { type: 'lane'; dir: number }
  | { type: 'smack' }
  | { type: 'slam' }
  | { type: 'pause' }
  | { type: 'mute' };

export type PadFamily = 'xbox' | 'playstation' | 'switch';

// Standard mapping button indices
const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, MENU: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

class Pad {
  /** True while the controller was the last device used (prompts show its glyphs). */
  active = false;
  family: PadFamily = 'xbox';
  onPlay: ((e: PadPlayEvent) => void) | null = null;
  /** Called on connect/disconnect (the game pauses). */
  onConnection: ((connected: boolean) => void) | null = null;
  private prev: boolean[] = [];
  private held: Record<number, number> = {};
  private repeat: Record<number, number> = {};
  private menuRaf = 0;

  init(): void {
    window.addEventListener('gamepadconnected', (e) => {
      this.family = familyOf((e as GamepadEvent).gamepad.id);
      this.setActive(true);
      this.onConnection?.(true);
      this.banner('CONTROLLER CONNECTED');
      this.loopMenus();
    });
    window.addEventListener('gamepaddisconnected', () => {
      this.onConnection?.(false);
      this.banner('CONTROLLER DISCONNECTED');
      this.setActive(false);
    });
    window.addEventListener('mousemove', () => this.usedMouse(), { passive: true });
  }

  usedMouse(): void {
    if (this.active) this.setActive(false);
  }

  private setActive(on: boolean): void {
    if (this.active === on) return;
    this.active = on;
    const fam = save.settings.prompts === 'auto' ? this.family : save.settings.prompts;
    document.body.classList.toggle('pad', on);
    document.body.dataset.pad = fam;
  }

  private banner(text: string): void {
    const el = document.createElement('div');
    el.className = 'pad-banner';
    el.textContent = text;
    document.getElementById('ui')?.append(el);
    setTimeout(() => el.remove(), 2200);
  }

  private gp(): Gamepad | null {
    const list = navigator.getGamepads?.() ?? [];
    for (const g of list) if (g && g.connected) return g;
    return null;
  }

  /** Edge-triggered press, with auto-repeat for held directions. */
  private pressed(g: Gamepad, i: number, now: number, rep = false): boolean {
    const down = !!g.buttons[i]?.pressed;
    const was = !!this.prev[i];
    if (down && !was) {
      this.held[i] = now;
      this.repeat[i] = now + 0.38;
      return true;
    }
    if (down && rep && now >= (this.repeat[i] ?? Infinity)) {
      this.repeat[i] = now + 0.11;
      return true;
    }
    return false;
  }

  heldFor(i: number, now: number): number {
    const g = this.gp();
    if (!g?.buttons[i]?.pressed) return 0;
    return now - (this.held[i] ?? now);
  }

  /** In play: called every frame by the game scene. */
  poll(dt: number): void {
    const g = this.gp();
    if (!g) return;
    const now = performance.now() / 1000;
    const anyInput = g.buttons.some((b) => b.pressed) || g.axes.some((a) => Math.abs(a) > 0.3);
    if (anyInput) this.setActive(true);
    const menuOpen = !!document.querySelector('#ui .screen:not(.leaving)');
    if (!menuOpen && this.onPlay) {
      const [ax, ay] = [g.axes[0] ?? 0, g.axes[1] ?? 0];
      const dead = 0.16;
      if (save.settings.aimScheme === 'free') {
        const mag = Math.hypot(ax, ay);
        if (mag > dead) {
          const k = ((mag - dead) / (1 - dead)) ** 1.6;
          const speed = 900 + save.settings.stickSensitivity * 1900;
          this.onPlay({ type: 'aim', dx: (ax / mag) * k * speed * dt, dy: (ay / mag) * k * speed * dt });
        }
      } else {
        if (this.pressed(g, B.LEFT, now, true) || (ax < -0.6 && !this.prev[100])) this.onPlay({ type: 'lane', dir: -1 });
        if (this.pressed(g, B.RIGHT, now, true) || (ax > 0.6 && !this.prev[101])) this.onPlay({ type: 'lane', dir: 1 });
        this.prev[100] = ax < -0.6;
        this.prev[101] = ax > 0.6;
      }
      if (this.pressed(g, B.A, now) || this.pressed(g, B.RT, now)) this.onPlay({ type: 'smack' });
      if (this.pressed(g, B.X, now) || this.pressed(g, B.LT, now)) this.onPlay({ type: 'slam' });
      if (this.pressed(g, B.VIEW, now)) this.onPlay({ type: 'mute' });
    }
    if (!menuOpen && this.pressed(g, B.MENU, now)) this.onPlay?.({ type: 'pause' });
    if (menuOpen) this.menuStep(g, now);
    this.prev = g.buttons.map((b) => b.pressed).concat(this.prev.slice(g.buttons.length));
  }

  /** Menus without a game scene running (title, Pizzeria…) are polled here. */
  private loopMenus(): void {
    if (this.menuRaf) return;
    const tick = () => {
      this.menuRaf = requestAnimationFrame(tick);
      if (this.onPlay) return; // the game scene polls during play
      const g = this.gp();
      if (!g) return;
      const now = performance.now() / 1000;
      if (g.buttons.some((b) => b.pressed) || g.axes.some((a) => Math.abs(a) > 0.5)) this.setActive(true);
      this.menuStep(g, now);
      this.prev = g.buttons.map((b) => b.pressed);
    };
    this.menuRaf = requestAnimationFrame(tick);
  }

  private stickDir = { x: 0, y: 0, t: 0 };

  private menuStep(g: Gamepad, now: number): void {
    const screens = [...document.querySelectorAll<HTMLElement>('#ui .screen:not(.leaving)')];
    const top = screens[screens.length - 1];
    if (!top) return;
    const items = [...top.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex="0"], input, select, a[href]')].filter((e) => e.offsetParent !== null);
    if (!items.length) return;
    let cur = document.activeElement as HTMLElement | null;
    if (!cur || !items.includes(cur)) {
      cur = items.find((e) => e.dataset.padDefault !== undefined) ?? items[0];
      cur.focus({ preventScroll: false });
    }
    // stick as a d-pad with repeat
    const [ax, ay] = [g.axes[0] ?? 0, g.axes[1] ?? 0];
    let sx = Math.abs(ax) > 0.55 ? Math.sign(ax) : 0;
    let sy = Math.abs(ay) > 0.55 ? Math.sign(ay) : 0;
    if (sx || sy) {
      const same = sx === this.stickDir.x && sy === this.stickDir.y;
      if (same && now < this.stickDir.t) sx = sy = 0;
      else {
        this.stickDir = { x: sx, y: sy, t: now + (same ? 0.12 : 0.36) };
      }
    } else this.stickDir = { x: 0, y: 0, t: 0 };
    const dir = this.pressed(g, B.LEFT, now, true) ? [-1, 0] : this.pressed(g, B.RIGHT, now, true) ? [1, 0] : this.pressed(g, B.UP, now, true) ? [0, -1] : this.pressed(g, B.DOWN, now, true) ? [0, 1] : sx || sy ? [sx, sy] : null;
    if (dir) {
      // range inputs take left/right as value changes
      if (cur instanceof HTMLInputElement && cur.type === 'range' && dir[0]) {
        cur.value = String(Number(cur.value) + dir[0] * 5);
        cur.dispatchEvent(new Event('input', { bubbles: true }));
        cur.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        const next = nearest(cur, items, dir[0], dir[1]);
        if (next) next.focus();
      }
    }
    if (this.pressed(g, B.LB, now) || this.pressed(g, B.RB, now)) {
      const sections = [...top.querySelectorAll<HTMLElement>('[data-pad-section]')];
      if (sections.length) {
        const i = sections.findIndex((s) => s.contains(cur));
        const d = g.buttons[B.RB]?.pressed ? 1 : -1;
        const s = sections[(i + d + sections.length) % sections.length];
        const first = items.find((e) => s.contains(e));
        first?.focus();
      }
    }
    if (this.pressed(g, B.A, now)) {
      if (cur instanceof HTMLInputElement && cur.type === 'checkbox') cur.click();
      else cur.click();
    }
    if (this.pressed(g, B.Y, now)) top.querySelector<HTMLElement>('[data-pad="y"]')?.click();
    if (this.pressed(g, B.B, now)) top.querySelector<HTMLElement>('[data-pad="back"]')?.click();
    // hold-to-confirm buttons (Next Wave, resets) listen for a held Menu / A
    const holdBtn = top.querySelector<HTMLElement>('[data-pad="hold"]');
    if (holdBtn) {
      const t = this.heldFor(B.MENU, now);
      holdBtn.style.setProperty('--hold', String(Math.min(1, t / 0.7)));
      if (t >= 0.7 && !this.prev[200]) {
        this.prev[200] = true;
        holdBtn.dispatchEvent(new CustomEvent('padhold'));
      }
      if (t === 0) this.prev[200] = false;
    }
  }

  rumble(strength: number, ms: number): void {
    if (!save.settings.vibration || !this.active) return;
    const g = this.gp() as (Gamepad & { vibrationActuator?: { playEffect(t: string, o: object): Promise<unknown> } }) | null;
    g?.vibrationActuator?.playEffect('dual-rumble', { duration: ms, strongMagnitude: Math.min(1, strength), weakMagnitude: Math.min(1, strength * 0.7) }).catch(() => {});
  }
}

function familyOf(id: string): PadFamily {
  const s = id.toLowerCase();
  if (/054c|playstation|dualshock|dualsense|sony/.test(s)) return 'playstation';
  if (/057e|nintendo|switch|joy-con|pro controller/.test(s)) return 'switch';
  return 'xbox';
}

/** The focusable element nearest in a direction (by screen position). */
function nearest(from: HTMLElement, items: HTMLElement[], dx: number, dy: number): HTMLElement | null {
  const a = from.getBoundingClientRect();
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const e of items) {
    if (e === from) continue;
    const b = e.getBoundingClientRect();
    const bx = b.left + b.width / 2;
    const by = b.top + b.height / 2;
    const vx = bx - ax;
    const vy = by - ay;
    const along = vx * dx + vy * dy;
    if (along <= 4) continue;
    const across = Math.abs(vx * dy - vy * dx);
    const score = along + across * 2.2;
    if (score < bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best;
}

/** Button glyph label for the current controller family. */
export function glyph(btn: 'A' | 'B' | 'X' | 'Y' | 'MENU' | 'LB' | 'RB'): string {
  const fam = save.settings.prompts === 'auto' ? pad.family : save.settings.prompts;
  const map: Record<PadFamily, Record<string, string>> = {
    xbox: { A: 'A', B: 'B', X: 'X', Y: 'Y', MENU: '☰', LB: 'LB', RB: 'RB' },
    playstation: { A: '✕', B: '○', X: '□', Y: '△', MENU: 'OPTIONS', LB: 'L1', RB: 'R1' },
    switch: { A: 'B', B: 'A', X: 'Y', Y: 'X', MENU: '+', LB: 'L', RB: 'R' },
  };
  return map[fam][btn];
}

export const pad = new Pad();
