// Dev-only tooling (tree-shaken out of production builds): screenshots + a simple auto-player.
import type Phaser from 'phaser';
import type { HeatId } from './data/difficulty';
import type { RunSnapshot } from './game/snapshot';
import { save } from './systems/save';

type AnyScene = Phaser.Scene & Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

let realRandom = Math.random;

/** Replace Math.random with a seeded generator (mulberry32). seed(null) restores it. */
function seed(n: number | null): void {
  if (n === null) {
    Math.random = realRandom;
    return;
  }
  realRandom = realRandom ?? Math.random;
  let a = n >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function skipIntros(): void {
  save.seenIntros = ['shop', 'kinds', 'swap', 'freshness', 'phases', 'mini', 'events', 'golden'];
  save.tutorialDone = true;
}

function scenarioSnapshot(o: { wave: number; heat: HeatId; lineup?: string[]; owned: Record<string, number>; coins: number }): RunSnapshot {
  const ids = o.lineup ?? ['margherita', 'pepperoni', 'funghi'];
  return {
    version: 1, heat: o.heat, act2Start: false, wave: o.wave, score: 0, coins: o.coins, owned: o.owned, cooldowns: {}, armed: [], super: 0,
    rerollCost: 10, healCost: 30, reviveCost: 120, reheatUses: 0, bestCombo: 0, feetSmacked: 0, bossesBeaten: [], firstKills: 0, slicesLost: 0,
    pizzasBought: 0, eventCrusts: 0, goldenUsed: {}, newUnlocks: [], elapsed: 0, secondChances: 0, rentedSpecial: null,
    pizzas: ids.map((id, i) => ({ id, slices: 8, max: 8, fresh: [10, 8, 6, 9, 7][i % 5], dead: false })), counter: [], bossBonusGiven: false,
  };
}

/** Bot shopping: heal when hurt, reheat stale pizzas, buy the best affordable card, then next wave. */
function botShop(g: AnyScene): void {
  const st = g.shop?.state;
  if (!st || g.__botBusy) return;
  g.__botBusy = true;
  setTimeout(() => (g.__botBusy = false), 250);
  // a Pick or Peel Roulette window: take the first choice
  const pick = document.querySelector<HTMLElement>('.pickwin .card, .pickwin .roul-tile');
  if (pick) return pick.click();
  const hurt = st.table.some((p: any) => !p.dead && p.slices <= p.max / 2); // eslint-disable-line @typescript-eslint/no-explicit-any
  if (hurt && st.heal.can && st.coins >= st.heal.cost + 20) return g.shopHeal();
  const stale = st.table.findIndex((p: any) => p.reheat?.can && p.fresh <= 2); // eslint-disable-line @typescript-eslint/no-explicit-any
  if (stale >= 0) return g.shopReheat(stale);
  // last pizza standing: take the free pizza before moving on
  if (st.lastStand) {
    const free = st.offers.find((o: any) => o.cost <= st.coins); // eslint-disable-line @typescript-eslint/no-explicit-any
    if (free) {
      g.shopBuyPizza(free.id);
      // a full table asks where it goes: take the default (a toast pizza first)
      setTimeout(() => document.querySelector<HTMLElement>('.swap2 .swapfoot .btn.green')?.click(), 60);
      return;
    }
  }
  if (st.rebake.can && st.rebake.shown) return g.shopRebake();
  const rank: Record<string, number> = { legendary: 4, epic: 3, rare: 2, common: 1 };
  const card = st.cards.filter((c: any) => !c.sold && (c.free || st.coins >= c.price)).sort((a: any, b: any) => rank[b.rarity] - rank[a.rarity])[0]; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (card) return g.shopBuy(card.id);
  const dev = (window as unknown as { F: { log: Record<string, unknown>[] } }).F;
  dev.log.push({ wave: st.wave, coins: st.coins, slices: st.table.reduce((n: number, p: any) => n + p.slices, 0), pizzas: st.table.filter((p: any) => !p.dead).length, owned: Object.keys(g.run.owned).length, crusts: st.progress.runCrusts, t: Math.round(g.run.elapsed) }); // eslint-disable-line @typescript-eslint/no-explicit-any
  g.shopNext();
}

export function installDevTools(game: Phaser.Game): void {
  let botOn = false;
  /** The dev bot draws the game scene (off for fast balance runs). */
  let botRender = true;
  void import('./devBossLab').then((m) => m.installBossLab(game));
  void import('./devLookLab').then((m) => m.installLookLab());
  // ?dev&show=welcome opens a screen straight away, for headless screenshots of DOM screens
  const showParam = new URLSearchParams(location.search).get('show');
  if (showParam) {
    setTimeout(async () => {
      await (window as unknown as { F: { boot(): Promise<void> } }).F.boot();
      const { ui } = await import('./ui/ui');
      document.querySelectorAll('.screen').forEach((e) => e.remove());
      if (showParam === 'welcome') ui.welcome({ keep: () => {}, fresh: () => {} });
    }, 0);
  }
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
      for (let i = 0; i < 400 && !document.querySelector('.splash-hint'); i++) await sleep(150);
      document.querySelector('.screen')?.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      await sleep(800);
    },
    /**
     * Start a run from any point. Pass a lineup array (old form) or a scenario:
     * { lineup, heat, wave, tips, boss: { id, hp }, snapshot, act2, kit, endless, seed, upgrades: { heavy: 3 }, intros: false }.
     * kit: true starts in the shop before `wave` with 5 pizzas, toppings and tips sized for that wave,
     * e.g. F.startGame({ wave: 61, kit: true }). For acts 7–10 before their stages exist, see fakeStages.
     */
    /** The balance simulator: one whole run as fast as the CPU allows (see src/devSim.ts, scripts/sim/run.mjs). */
    sim: {
      run: async (o: import('./devSim').SimOpts) => (await import('./devSim')).simRun(game, o, (opts) => api.startGame(opts)),
      ready: async () => (await import('./devSim')).simReady(),
    },
    startGame(opts?: string[] | Record<string, any>): void { // eslint-disable-line @typescript-eslint/no-explicit-any
      const o = Array.isArray(opts) ? { lineup: opts } : (opts ?? {});
      if (o.seed !== undefined) seed(Number(o.seed));
      if (o.intros === false) skipIntros();
      document.querySelectorAll('.screen').forEach((e) => e.remove());
      const data = { ...o };
      if (o.upgrades || o.coins !== undefined) {
        // a scenario with upgrades starts from a snapshot in the shop of wave-1
        const wave = Math.max(0, (o.wave ?? 1) - 1);
        data.snapshot = scenarioSnapshot({ wave, heat: o.heat ?? 'regular', lineup: o.lineup, owned: o.upgrades ?? {}, coins: o.coins ?? o.tips ?? 0 });
      }
      const g = game.scene.getScene('Game');
      if (g && (g.sys.isActive() || g.sys.isPaused())) {
        if (g.sys.isPaused()) g.scene.resume();
        g.scene.restart(data);
        return;
      }
      game.scene.getScenes(true).forEach((s) => s.scene.stop());
      game.scene.start('Game', data);
    },
    /** Dev: reload with n stand-in stages added to the journey (repeats of real ones), so acts past the
     * real ones and wave 100 can be tested end to end: F.fakeStages(8) → a 100-wave journey. 0 removes them. */
    fakeStages(n = 8): void {
      const q = new URLSearchParams(location.search);
      if (n > 0) q.set('fakeStages', String(n));
      else q.delete('fakeStages');
      location.search = q.toString().replace(/=(&|$)/g, '$1');
    },
    /** The journey as built (with any fake stages): waves, acts and stages. */
    async journey(): Promise<{ waves: number; acts: number; stages: number }> {
      const m = await import('./data/stages');
      return { waves: m.JOURNEY_WAVES, acts: m.ACT_COUNT, stages: m.STAGES.length };
    },
    /** Save the current run as a scenario (same shape as the run save). */
    saveScenario(): unknown {
      const g = game.scene.getScene('Game') as AnyScene;
      return g?.snapshot?.();
    },
    /** Show this pizza as a Rare Find on the new-run screen (now if it's open, else on its next deal). */
    async rareFind(id: string): Promise<void> {
      const { forceRareFind } = await import('./ui/ui');
      forceRareFind(id);
    },
    /** Deterministic randomness for fair before/after comparisons. */
    seed,
    skipIntros,
    /** Peels: unlock everything, or make shiny feet common (n = chance multiplier) for testing. */
    peels: {
      unlockAll: async () => {
        const { PEELS } = await import('./game/peels');
        const { save, persist } = await import('./systems/save');
        save.peels = PEELS.map((p) => p.id);
        persist();
      },
      shinyBoost: (n: number) => {
        const g = game.scene.getScene('Game') as AnyScene;
        if (g) g.shinyBoost = n;
      },
    },
    /**
     * The auto-player: smacks the lowest foot, wipes boss props, and shops with a simple strategy
     * (heal when hurt, reheat stale pizzas, buy the best affordable topping, then next wave).
     * Balance runs: warp steps the game several times a frame; `{ render: false }` also stops drawing the
     * game scene (the logic, timers and DOM keep running), which lets a high warp run at full speed.
     */
    bot(on = true, accuracy = 0.9, rate = 260, warp = 1, opts: { render?: boolean } = {}): void {
      botOn = on;
      botRender = opts.render ?? true;
      skipIntros();
      if (!on) {
        // undo any time warp
        const g0 = game.scene.getScene('Game') as AnyScene;
        const sys0 = g0?.sys as unknown as { sceneUpdate?: ((t: number, d: number) => void) & { orig?: (t: number, d: number) => void } } | undefined;
        if (g0 && sys0?.sceneUpdate?.orig) {
          sys0.sceneUpdate = sys0.sceneUpdate.orig;
          g0.time.timeScale = 1;
          g0.tweens.timeScale = 1;
          g0.tweenBase = 1;
        }
        g0?.scene.setVisible(true);
        return;
      }
      // the bot acts every `rate` ms of game time: inside the warped steps when warping (so a high warp doesn't
      // make it react less often), otherwise on a timer
      let gameMs = 0;
      const loop = () => {
        if (!botOn) return;
        const g = game.scene.getScene('Game') as AnyScene;
        // time warp for balance runs: the scene steps several times a frame, timers and tweens keep pace
        type Step = ((t: number, d: number) => void) & { warped?: number; orig?: (t: number, d: number) => void };
        const sys = g?.sys as unknown as { sceneUpdate?: Step } | undefined;
        // Phaser calls the bound copy it keeps on sys (re-bound on every scene start), not scene.update
        if (g && sys?.sceneUpdate && warp > 1 && sys.sceneUpdate.warped !== warp) {
          const step = sys.sceneUpdate.orig ?? sys.sceneUpdate;
          const warped: Step = (t: number, d: number) => {
            for (let i = 0; i < warp; i++) {
              step.call(g, t, d);
              gameMs += Math.min(50, d);
              if (botOn && gameMs >= rate) {
                gameMs = 0;
                act(g);
              }
            }
          };
          warped.warped = warp;
          warped.orig = step;
          sys.sceneUpdate = warped;
          g.time.timeScale = warp;
          g.tweens.timeScale = warp;
          g.tweenBase = warp;
        }

        // warping: the steps drive the bot; otherwise (or in the shop, where the scene may be paused) the timer does
        if (warp <= 1 || !g || g.inUpgrade || g.over || !game.scene.isActive('Game')) act(g);
        else if (g && !botRender && g.sys.settings.visible) g.scene.setVisible(false);
        setTimeout(loop, warp > 1 ? 100 : rate);
      };
      const act = (g: AnyScene | undefined): void => {
        // no drawing while a balance run warps (set again each tick: a restart makes the scene visible)
        if (g && !botRender && g.sys.settings.visible) g.scene.setVisible(false);

        if (g && (game.scene.isActive('Game') || game.scene.isPaused('Game'))) {
          const intro = document.querySelector<HTMLElement>('.intro .btn, .second .btn.cream');
          if (intro) intro.click();
          if (g.feet && !g.inUpgrade && !g.over) {
            const prop = (g.clickables ?? []).find((c: any) => c.alive() && (c.priority ?? 0) >= 2); // eslint-disable-line @typescript-eslint/no-explicit-any
            // the lowest foot, skipping any with a guard up (as a player would) unless that's all there is
            const ts = g.feet.filter((f: any) => f.hittable).sort((a: any, b: any) => b.y - a.y); // eslint-disable-line @typescript-eslint/no-explicit-any
            const t = ts.find((f: any) => !f.shielded) ?? ts[0]; // eslint-disable-line @typescript-eslint/no-explicit-any
            if (prop && Math.random() < accuracy) {
              g.pointer.x = prop.x;
              g.pointer.y = prop.y;
              g.smack(prop.x, prop.y);
            } else if (t && Math.random() < accuracy) {
              g.pointer.x = t.cx;
              g.pointer.y = t.cy;
              g.peelPos.x = t.cx;
              g.peelPos.y = t.cy;
              g.smack(t.cx, t.cy);
            }
            // (and straight away when Surtr's sword window opens, as a player would)
            if (g.run?.super >= 1 && (Math.random() < 0.05 || g.feet.some((f: any) => f.alive && f.brain?.swordWindow))) g.peelSlam(); // eslint-disable-line @typescript-eslint/no-explicit-any
          }
          if (g.inUpgrade && g.shop) botShop(g);
          // ACT COMPLETE (and an endless victory): keep going
          else if (g.inUpgrade && g.actEl && !g.paused && !g.__botBusy) {
            g.__botBusy = true;
            setTimeout(() => (g.__botBusy = false), 400);
            api.log.push({ act: true, wave: g.run.wave, t: Math.round(g.run.elapsed), slices: g.run.slicesLost });
            g.actEl.querySelector('.v-choice .btn.green')?.click();
          }
        }
      };
      loop();
    },
    /**
     * Layout audit: on-screen text that runs off the stage, is cut off (overflowing a fixed box),
     * or in-game callouts drawn outside the 1920x1080 view. Run it during play and on every screen.
     */
    layout(): { where: string; text: string; issue: string }[] {
      const out: { where: string; text: string; issue: string }[] = [];
      const stage = document.getElementById('stage')?.getBoundingClientRect();
      if (stage) {
        const els = document.querySelectorAll<HTMLElement>('#ui *');
        for (const el of els) {
          if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim())) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none') continue;
          // skip text that is faded out or mid entrance/exit animation (banners zoom in from 2.4x)
          let op = 1;
          let animating = false;
          for (let n: HTMLElement | null = el; n && n.id !== 'ui'; n = n.parentElement) {
            op *= Number(getComputedStyle(n).opacity);
            // entrances (first 700 ms) and anything a running animation is moving (toasts sliding out)
            // (and ones parked off screen by a finished exit animation, waiting to be removed)
            const anims = n.getAnimations?.() ?? [];
            const running = anims.filter((an) => an.playState === 'running');
            const tf = getComputedStyle(n).transform;
            const moved = tf !== 'none' && tf !== 'matrix(1, 0, 0, 1, 0, 0)';
            if (running.some((an) => Number(an.currentTime ?? 0) < 700) || (anims.length && moved)) animating = true;
          }
          if (op < 0.3 || animating) continue;
          const r = el.getBoundingClientRect();
          if (!r.width) continue;
          const text = (el.textContent ?? '').trim().slice(0, 50);
          // items further down a scrolling list are reachable by scrolling, not off screen
          let inScroller = false;
          for (let n = el.parentElement; n && n.id !== 'ui'; n = n.parentElement) {
            const o = getComputedStyle(n).overflowY;
            if ((o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight) {
              inScroller = true;
              break;
            }
          }
          if (!inScroller && (r.left < stage.left - 2 || r.right > stage.right + 2 || r.top < stage.top - 2 || r.bottom > stage.bottom + 2)) out.push({ where: 'dom', text, issue: 'off screen' });
          // text spilling out of its own card (a nowrap row or a long title wider than the panel)
          const card = el.parentElement?.closest<HTMLElement>('.panel, .shop-sec, .card, .callout, .btn');
          if (card && card !== el) {
            const c = card.getBoundingClientRect();
            if (r.left < c.left - 2 || r.right > c.right + 2) out.push({ where: 'dom', text, issue: 'outside its card' });
          }
          if (el.scrollWidth > el.clientWidth + 2 && (cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis' || cs.whiteSpace === 'nowrap') && el.clientWidth > 0) out.push({ where: 'dom', text, issue: 'cut off' });
        }
      }
      const g = game.scene.getScene('Game') as AnyScene;
      if (g?.sys?.isActive()) {
        const walk = (o: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          // a hidden container hides its text too (Nonna's parked tug panel, an eaten pizza's label)
          if (o.visible === false) return;
          if (o.list) o.list.forEach(walk);
          if (o.type === 'Text' && o.visible && o.alpha > 0.2 && o.text) {
            const b = o.getBounds();
            if (b.left < -2 || b.right > 1922 || b.top < -2 || b.bottom > 1082) out.push({ where: 'canvas', text: o.text.slice(0, 50), issue: 'off screen' });
          }
        };
        g.children.list.forEach(walk);
      }
      return out;
    },
    /** Sample the layout audit for `ms` milliseconds; returns every distinct problem seen. */
    watchLayout(ms = 10000): Promise<{ where: string; text: string; issue: string }[]> {
      const seen = new Map<string, { where: string; text: string; issue: string }>();
      return new Promise((resolve) => {
        const t = setInterval(() => {
          for (const i of (window as unknown as { F: { layout(): { where: string; text: string; issue: string }[] } }).F.layout()) seen.set(i.where + i.issue + i.text, i);
        }, 120);
        setTimeout(() => {
          clearInterval(t);
          resolve([...seen.values()]);
        }, ms);
      });
    },
    /** Per-wave log the bot fills in: tips earned/spent, slices lost, upgrades owned. */
    log: [] as Record<string, unknown>[],
  };
  const trailer = (prefix = 'f_', vertical = false) => import('./trailer').then((m) => m.recordTrailer(game, { prefix, vertical }));
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
