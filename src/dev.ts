// Dev-only tooling (tree-shaken out of production builds): screenshots + a simple auto-player.
import type Phaser from 'phaser';

type AnyScene = Phaser.Scene & Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function installDevTools(game: Phaser.Game): void {
  let botOn = false;
  const api = {
    game,
    scene: (k: string) => game.scene.getScene(k) as AnyScene,
    /** Save a screenshot of the game canvas (no DOM) to the dev shot folder. */
    shot(name = 'shot'): Promise<string> {
      return new Promise((resolve) => {
        game.renderer.snapshot((img) => {
          const src = (img as HTMLImageElement).src;
          fetch(`/__shot?name=${encodeURIComponent(name)}`, { method: 'POST', body: src }).then(() => resolve(name));
        });
      });
    },
    async boot(): Promise<void> {
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      for (let i = 0; i < 80 && !document.querySelector('.splash-hint'); i++) await sleep(150);
      document.querySelector('.screen')?.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      await sleep(800);
    },
    startGame(lineup?: string[]): void {
      document.querySelectorAll('.screen').forEach((e) => e.remove());
      game.scene.getScenes(true).forEach((s) => s.scene.stop());
      game.scene.start('Game', { lineup });
    },
    bot(on = true, accuracy = 0.9, rate = 260): void {
      botOn = on;
      const loop = () => {
        if (!botOn) return;
        const g = game.scene.getScene('Game') as AnyScene;
        if (g && game.scene.isActive('Game') && g.feet) {
          const t = g.feet.filter((f: any) => f.hittable).sort((a: any, b: any) => b.y - a.y)[0]; // eslint-disable-line @typescript-eslint/no-explicit-any
          if (t && Math.random() < accuracy) {
            g.pointer.x = t.cx;
            g.pointer.y = t.cy;
            g.smack(t.cx, t.cy);
          }
          const card = document.querySelector('.card') as HTMLElement | null;
          if (card && g.inUpgrade) card.click();
        }
        setTimeout(loop, rate);
      };
      loop();
    },
  };
  const trailer = (prefix = 'f_') => import('./trailer').then((m) => m.recordTrailer(game, { prefix }));
  (window as unknown as { F: typeof api & { contrast: typeof contrastAudit; trailer: typeof trailer } }).F = Object.assign(api, { contrast: contrastAudit, trailer });
}

// ——— Contrast audit ———
type RGBA = [number, number, number, number];

function parseColors(str: string): RGBA[] {
  const out: RGBA[] = [];
  for (const m of str.matchAll(/rgba?\(([^)]+)\)/g)) {
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    out.push([p[0], p[1], p[2], p.length > 3 ? p[3] : 1]);
  }
  return out;
}

function lum([r, g, b]: RGBA): number {
  const f = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(a: RGBA, b: RGBA): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

function blend(top: RGBA, under: RGBA): RGBA {
  const a = top[3];
  return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1];
}

/** Background colours behind an element: solid colour or every stop of a gradient. null = drawn over the game canvas. */
function backgroundsOf(el: Element): RGBA[] | null {
  let node: Element | null = el;
  while (node && node.id !== 'stage') {
    const cs = getComputedStyle(node);
    const stops = parseColors(cs.backgroundImage).filter((c) => c[3] > 0.5);
    if (stops.length) return stops.map((c) => blend(c, [255, 255, 255, 1]));
    const bg = parseColors(cs.backgroundColor)[0];
    if (bg && bg[3] > 0.5) return [blend(bg, [255, 255, 255, 1])];
    node = node.parentElement;
  }
  return null;
}

/** Check every visible text element in the overlay. Returns the failures. */
function contrastAudit(): { text: string; fg: string; ratio: number; need: number; note?: string }[] {
  const fails: { text: string; fg: string; ratio: number; need: number; note?: string }[] = [];
  const root = document.getElementById('ui');
  if (!root) return fails;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const seen = new Set<Element>();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || seen.has(el) || !(n.textContent ?? '').trim()) continue;
    if (el.closest('svg')) continue; // SVG text uses its own fill/stroke (the logo is outlined)
    seen.add(el);
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || Number(cs.opacity) < 0.3) continue;
    const fg = parseColors(cs.color)[0];
    if (!fg || fg[3] === 0) continue; // e.g. background-clip text
    const size = parseFloat(cs.fontSize);
    const bold = Number(cs.fontWeight) >= 600 || /Lilita/.test(cs.fontFamily);
    const large = size >= 24 || (bold && size >= 18.66);
    const need = large ? 3 : 4.5;
    const strokeW = parseFloat(cs.getPropertyValue('-webkit-text-stroke-width')) || 0;
    const text = (n.textContent ?? '').trim().slice(0, 40);
    if (strokeW > 0) {
      // outlined text: the outline carries the contrast
      const stroke = parseColors(cs.getPropertyValue('-webkit-text-stroke-color'))[0];
      const rr = stroke ? ratio(fg, stroke) : 21;
      if (rr < 3) fails.push({ text, fg: cs.color, ratio: +rr.toFixed(2), need: 3, note: 'fill vs outline' });
      continue;
    }
    const bgs = backgroundsOf(el);
    if (!bgs) {
      const shadow = cs.textShadow && cs.textShadow !== 'none';
      if (!shadow) fails.push({ text, fg: cs.color, ratio: 0, need, note: 'over game art with no outline or shadow' });
      continue;
    }
    const worst = Math.min(...bgs.map((b) => ratio(blend(fg, b), b)));
    if (worst < need) fails.push({ text, fg: cs.color, ratio: +worst.toFixed(2), need });
  }
  return fails;
}
