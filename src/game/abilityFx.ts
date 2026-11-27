// The peel abilities' own visuals. Every ability fired from the meter (pressed or automatic) that isn't hand-built
// (the heroes' and the God Peel's moves stage themselves) plays one here, in place of the old shared sweep: a foot
// peel brings its foot stomping in, a boss its prop or move, a pizza its pizza and toppings, a place its motif, a
// jewel its gem, a zombified foot clawing up at the edge, and so on. What each one plays is a spec
// (src/game/abilityFxSpecs.ts): a few steps from a small set of stagers here (a strike, an edge run, a rain, rings,
// beams, an element at the edges and on the feet, a whirl, an emblem, a tint, a zombie's rise) plus hand-made
// specials (the Finale Peel's Curtain Call, Act 7's KRAK!, the Lumberjack's falling trees).
//
// Restraint, so a move never gets in the way of the fight:
// - The effect lands on the feet it hit. Nothing crosses or covers the play area: showpieces sit at the screen's
//   edges (a side, a top corner, a bottom corner), elements come in at the sides, and any dim is at most 15% and only
//   darkens the backdrop (under the feet, the boss and the pizzas). No full-screen flash.
// - Short: the whole beat is about 0.6–0.9 s, its peak on the hit (~170 ms in), then follow-through.
// - It never touches input, the cursor or the peel (everything is drawn under the cursor layer, nothing is
//   interactive).
// - Lighter in boss fights, and when the meter ability played in the last few seconds: an edge flourish, the marks
//   on the feet and its sound.
// - Reduced motion: the emblem fades in at the edge and out, nothing travels, nothing shakes. Peel animation off in
//   the graphics settings: fewer pieces, no afterimages.
//
// Visuals only: the ability's effects run exactly as before, in the same frame. Cosmetic randomness only (crand), so
// a seeded run plays the same whatever is shown. Textures and sounds are made ready when the peel is equipped.

import Phaser from 'phaser';
import { H, TABLE_Y, W } from '../config';
import { audio } from '../systems/audio';
import { save } from '../systems/save';
import { crand } from '../systems/cosmeticRandom';
import { peelsAnimated } from '../systems/graphics';
import { drawAfx, isAfxKey } from '../art/abilityFxArt';
import { FOOT_BY_ID } from '../data/feet';
import { PIZZA_BY_ID } from '../data/pizzas';
import { ensureFootArt, ensurePizzaArt } from './assets';
import { ABILITIES, type Ability, type Effect } from './abilities';
import { peelCanvas } from './peels';
import { specFor, type Spec, type Step, type TexRef } from './abilityFxSpecs';

export interface AfxHost {
  sc: Phaser.Scene;
  /** Over the feet (under the cursor): the moves themselves. */
  layer: Phaser.GameObjects.Container;
  /** Under the pizzas and feet: dimming the backdrop, cracks in the table. */
  under: Phaser.GameObjects.Container;
  pizzas: () => { x: number; surfaceY: number }[];
  /** Where the feet on the table are (so an emblem picks an edge with none near it). */
  feet: () => { x: number; y: number }[];
  /** A boss or mini-boss is on the table. */
  bossFight: () => boolean;
  /** The game clock (s). */
  now: () => number;
  shake: (ms: number, k: number) => void;
  rumble: (k: number, ms: number) => void;
}

/** A foot the ability reached, where it was when it did, and what it did to it. */
export interface HitRec {
  x: number;
  y: number;
  big: boolean;
  fx: Set<Effect['e'] | 'freeze'>;
}

/** Run with Math.random drawing from the cosmetic generator (Phaser draws on it inside tile sprites and the like). */
function cosm<T>(fn: () => T): T {
  const was = Math.random;
  Math.random = crand;
  try {
    return fn();
  } finally {
    Math.random = was;
  }
}

const rnd = (a: number, b: number) => a + crand() * (b - a);
const ZOMBIE_TINT = 0xa8d48a;
/** The most any move darkens the backdrop. */
const MAX_DIM = 0.15;
/** How far in from a side an edge flourish reaches (12% of the width). */
const EDGE = Math.round(W * 0.12);
/** Where emblems may sit, in order of preference: the right and left edges (clear of the pizzas, the meter button
 * and the mute and pause buttons), then the top corners. Each move takes the first with no foot near it. */
const EMBLEM_SPOTS = [
  { x: W - 130, y: 430 },
  { x: 130, y: 430 },
  { x: W - 260, y: 150 },
  { x: 260, y: 150 },
];
/** Textures that are a move's generic sparkle (never tinted zombie green). */
const GENERIC = new Set(['burst', 'ring', 'glow', 'soft', 'afx_streak', 'star', 'star5', 'shard', 'flame', 'coin', 'crumb', 'afx_heart', 'p_reticle', 'confetti', 'vignette']);
/** A meter ability that played its full visual this recently (s) plays the light version. */
const RECENT = 4;
/** Nothing a move makes outlives this (ms). */
const LIFETIME = 2000;

/** The ability's id in ABILITIES (zombified feet have their own entries; shiny peels share their base's). */
const keyOfAbility = new WeakMap<Ability, string>();
let keysMapped = false;
function abilityKeyOf(a: Ability): string {
  if (!keysMapped && (keysMapped = true)) for (const [k, v] of Object.entries(ABILITIES)) if (!keyOfAbility.has(v)) keyOfAbility.set(v, k);
  return keyOfAbility.get(a) ?? 'classic';
}

/** The foot an ability's art comes from (foot, boss and zombified peels), or null. */
function footIdOf(key: string): string | null {
  const m = /^(?:foot|boss|zombie):(.+)$/.exec(key);
  return m && FOOT_BY_ID[m[1]] ? m[1] : null;
}

function pizzaIdOf(key: string): string | null {
  const m = /^pizza:(.+)$/.exec(key);
  return m && PIZZA_BY_ID[m[1]] ? m[1] : null;
}

/** Every texture a spec names (for preparing them, and the dev check). */
function texRefs(s: Spec): TexRef[] {
  const out: TexRef[] = [];
  for (const st of s.steps) {
    const o = st as unknown as Record<string, unknown>;
    for (const f of ['tex', 'icons']) if (typeof o[f] === 'string') out.push(o[f] as string);
    if (Array.isArray(o.tex)) out.push(...(o.tex as string[]));
    const sh = o.shatter as { tex?: string } | undefined;
    if (sh?.tex) out.push(sh.tex);
  }
  if (s.emblem) out.push(s.emblem);
  return out;
}

/** Textures the stagers use themselves. */
const STAGER_TEX: Partial<Record<Step['k'], string[]>> = {
  strike: ['afx_crack'],
  sweep: ['afx_streak'],
  rain: ['afx_streak'],
  curtain: ['afx_curtain', 'afx_valance', 'afx_spot', 'afx_rose'],
  krak: ['afx_krak'],
  timber: ['afx_tree'],
};
/** Each element: what comes in at the sides, and what splashes on each foot. */
const FLOOD: Record<string, { side: string; hit: string; tint?: number }> = {
  water: { side: 'afx_wave', hit: 'afx_bubble' },
  ink: { side: 'afx_ink', hit: 'p_inkblob' },
  sauce: { side: 'afx_sauce', hit: 'p_ketchup' },
  part: { side: 'afx_sauce', hit: 'p_ketchup' },
  snow: { side: 'afx_snow', hit: 'p_snowball' },
  fire: { side: 'flame', hit: 'flame' },
  frost: { side: 'afx_frost', hit: 'shard', tint: 0xdff6ff },
  gold: { side: 'afx_goldwall', hit: 'coin' },
  cheese: { side: 'afx_cheese', hit: 'cheese' },
};

/** One firing: its pieces, its hits and its timing. */
class Play {
  readonly objs = new Set<Phaser.GameObjects.GameObject>();
  readonly landed = new Set<HitRec>();
  private peaked = false;
  constructor(
    readonly fx: AbilityFx,
    readonly h: AfxHost,
    readonly spec: Spec,
    readonly hits: HitRec[],
    readonly color: number,
    readonly foot: string | null,
    readonly pizza: string | null,
    readonly peelKey: string,
    readonly lite: boolean,
  ) {}

  get sc(): Phaser.Scene {
    return this.h.sc;
  }

  /** Run `fn` after `ms` (cosmetic randomness inside). */
  at(ms: number, fn: () => void): void {
    if (ms <= 0) cosm(fn);
    else this.sc.time.delayedCall(ms, () => cosm(fn));
  }

  own<T extends Phaser.GameObjects.GameObject>(o: T, under = false): T {
    (under ? this.h.under : this.h.layer).add(o);
    this.objs.add(o);
    o.once(Phaser.GameObjects.Events.DESTROY, () => this.objs.delete(o));
    return o;
  }

  /** A texture key for a reference ('foot', 'pizza', 'peel' or a key), falling back to a soft glow. */
  key(ref: TexRef): string {
    if (ref === 'foot') return this.foot ? `foot_${this.foot}` : this.peelKey;
    if (ref === 'pizza') return this.pizza ? `afx_pz_${this.pizza}` : this.peelKey;
    if (ref === 'peel') return this.peelKey;
    return this.sc.textures.exists(ref) ? ref : 'soft';
  }

  /** An image of a texture reference, `size` px across its longer side (zombified feet tinted). */
  img(ref: TexRef, x: number, y: number, size: number, under = false): Phaser.GameObjects.Image {
    const k = this.key(ref);
    const i = this.own(this.sc.add.image(x, y, k), under);
    const src = this.sc.textures.get(k).getSourceImage() as { width: number; height: number };
    i.setScale(size / Math.max(1, Math.max(src.width, src.height)));
    if (this.spec.zombie && !GENERIC.has(ref)) i.setTint(ZOMBIE_TINT);
    return i;
  }

  /** The emblem spot with no foot near it (the right edge if every one has). */
  emblemSpot(): { x: number; y: number } {
    const feet = this.h.feet();
    return EMBLEM_SPOTS.find((s) => !feet.some((f) => Math.hypot(f.x - s.x, f.y - s.y) < 250)) ?? EMBLEM_SPOTS[0];
  }

  /** A whole foot, leg and all, `width` px across (bosses' huge feet brought down to size), its contact point (the
   * sole) at the container's origin. With no foot: the peel, head down, handle up. */
  footRig(x: number, y: number, width: number, usePeel = false): Phaser.GameObjects.Container {
    const id = usePeel ? null : this.foot;
    const c = this.own(this.sc.add.container(x, y));
    if (!id) {
      const src = this.sc.textures.get(this.peelKey).getSourceImage() as { width: number };
      c.add(this.sc.add.image(0, 0, this.peelKey).setOrigin(0.5, 0.28).setAngle(180).setScale(width / Math.max(1, src.width)));
      return c;
    }
    const m = ensureFootArt(this.sc, id)!;
    const type = FOOT_BY_ID[id];
    const k = 1 / m.textures.res;
    const footTop = m.footHeight * type.scale;
    const legBottom = m.textures.legEnd !== undefined ? (m.textures.legEnd - m.footHeight) * type.scale : -footTop + 16 * type.scale;
    const legTex = this.sc.textures.get(m.legKey).getSourceImage() as { width: number };
    const footTex = this.sc.textures.get(m.footKey).getSourceImage() as { width: number };
    const scale = width / Math.max(1, footTex.width * k);
    // long enough to reach off the top of the screen from wherever it lands
    const leg = cosm(() => this.sc.add.tileSprite(0, legBottom, legTex.width * k, H / scale + 200, m.legKey).setOrigin(0.5, 1).setTileScale(k, k));
    const foot = this.sc.add.image(0, 0, m.footKey).setOrigin(0.5, m.originY).setScale(k);
    c.add([leg, foot]);
    if (m.cuffKey) c.add(this.sc.add.image(0, -footTop + 4 * type.scale, m.cuffKey).setScale(k));
    if (this.spec.zombie) for (const p of c.list) (p as Phaser.GameObjects.Image).setTint(ZOMBIE_TINT);
    if (type.art.ghost) c.setAlpha(0.85);
    c.setScale(scale);
    return c;
  }

  tw(cfg: Phaser.Types.Tweens.TweenBuilderConfig): Phaser.Tweens.Tween {
    return this.sc.tweens.add(cfg);
  }

  /** Fade an object out and destroy it. */
  fade(o: Phaser.GameObjects.GameObject, delay: number, ms: number, more: Record<string, unknown> = {}): void {
    this.tw({ targets: o, alpha: 0, delay, duration: ms, ...more, onComplete: () => o.destroy() });
  }

  /** The move's big moment: a short shake and rumble (once; no flash over the screen). */
  peak(ms: number): void {
    this.at(ms, () => {
      if (this.peaked) return;
      this.peaked = true;
      const w = this.spec.weight ?? 1;
      this.h.shake(180 * w, 0.006 * w);
      this.h.rumble(Math.min(1, 0.6 * w), 180);
    });
  }

  /** A hit lands on this foot at `ms`: a burst in the ability's colour, and a mark of what it did. */
  land(r: HitRec, ms: number): void {
    if (this.landed.has(r)) return;
    this.landed.add(r);
    this.at(ms, () => this.fx.mark(this, r));
  }

  /** Feet the steps aim at: the ones the ability reached (one each). */
  targets(n = 99): HitRec[] {
    return this.hits.slice(0, n);
  }
}

export class AbilityFx {
  private ready = new Set<string>();
  /** Each ability's peel art (by ability key): its own peel's look, drawn when it was prepared. */
  private peelTex = new Map<string, string>();
  /** When a meter ability last played its full visual (game seconds). */
  private lastFull = -99;
  constructor(private h: AfxHost) {}

  private get sc(): Phaser.Scene {
    return this.h.sc;
  }

  /** Make an ability's textures and sounds ready (when the peel is equipped or borrowed: never mid-move). */
  prepare(a: Ability | null, peelId: string): void {
    if (!a || a.custom) return;
    const key = abilityKeyOf(a);
    const spec = specFor(key, a);
    const foot = footIdOf(key);
    const pizza = pizzaIdOf(key);
    if (foot) ensureFootArt(this.sc, foot);
    if (pizza) {
      const k = `afx_pz_${pizza}`;
      const top = ensurePizzaArt(pizza);
      if (top && !this.sc.textures.exists(k)) this.sc.textures.addImage(k, top as unknown as HTMLImageElement);
    }
    // the ability's own peel, drawn as a texture of its own: the scene's 'peel' texture is whatever look is worn
    // (a borrowed ability's peel isn't on it), and it's replaced when the peel changes, which would break an image
    // still showing it
    const pk = `afx_peel_${peelId.replace(/[^a-z0-9]/gi, '_')}`;
    if (!this.sc.textures.exists(pk)) this.sc.textures.addImage(pk, peelCanvas(peelId) as unknown as HTMLImageElement);
    this.peelTex.set(key, pk);
    const want = new Set<string>(texRefs(spec));
    for (const st of spec.steps) {
      for (const t of STAGER_TEX[st.k] ?? []) want.add(t);
      if (st.k === 'flood') want.add(FLOOD[st.kind].side);
    }
    for (const k of want) this.texture(k);
    // draw each once, all but invisibly, so their first upload to the GPU isn't a hitch when the move first plays
    const keys = [...want].filter((k) => k !== 'foot' && k !== 'pizza' && k !== 'peel' && this.sc.textures.exists(k));
    keys.push(pk);
    if (pizza) keys.push(`afx_pz_${pizza}`);
    if (foot) {
      const m = ensureFootArt(this.sc, foot)!;
      keys.push(m.footKey, m.legKey, ...(m.cuffKey ? [m.cuffKey] : []));
    }
    for (const k of keys) {
      if (!this.sc.textures.exists(k)) continue;
      const i = this.sc.add.image(4, 4, k).setScale(0.02).setAlpha(0.01);
      this.h.layer.add(i);
      this.sc.time.delayedCall(80, () => i.destroy());
    }
    audio.preload(this.sc, spec.sfx.map((s) => s[0]));
    this.ready.add(key);
  }

  /** Make one of our drawn textures (afx_*) if it isn't yet. */
  private texture(k: string): void {
    if (!isAfxKey(k) || this.sc.textures.exists(k)) return;
    const c = drawAfx(k);
    if (c) this.sc.textures.addImage(k, c as unknown as HTMLImageElement);
  }

  /** Play an ability's visual. hits: the feet its effects reached, as they were when they did. */
  play(a: Ability, hits: HitRec[]): void {
    const key = abilityKeyOf(a);
    if (!this.ready.has(key)) this.prepare(a, key);
    const spec = specFor(key, a);
    const lite = !peelsAnimated();
    const pk = this.peelTex.get(key) ?? 'soft';
    const p = new Play(this, this.h, spec, hits, a.color, footIdOf(key), pizzaIdOf(key), pk, lite);
    const now = this.h.now();
    const light = this.h.bossFight() || now - this.lastFull < RECENT;
    if (!light) this.lastFull = now;
    for (const [k, ms = 0, vol = 1, rate = 1] of spec.sfx) {
      // the light version keeps the move's first sounds and its hit
      if (light && ms > 250) continue;
      p.at(ms, () => audio.sfx(k, { volume: vol * (light ? 0.8 : 1), rate, throttle: 40 }));
    }
    cosm(() => {
      if (save.settings.reducedMotion) this.calm(p);
      else if (light) this.flourish(p);
      else {
        if (spec.dim) this.dim(p, spec.dim);
        for (const st of spec.steps) p.at(st.t ?? 0, () => this.step(p, st));
        this.extras(p, a);
        p.peak(170);
      }
      // anything the steps didn't reach lands with the peak
      p.at(200, () => {
        for (const r of hits) p.land(r, 0);
      });
    });
    this.sc.time.delayedCall(LIFETIME, () => {
      for (const o of [...p.objs]) o.destroy();
    });
  }

  /** Reduced motion: the move's emblem fades in at the edge and out; nothing travels, nothing shakes. */
  private calm(p: Play): void {
    const ref = p.spec.emblem ?? firstTex(p.spec) ?? 'peel';
    const at = p.emblemSpot();
    const e = p.img(ref, at.x, at.y, 180).setAlpha(0);
    p.tw({ targets: e, alpha: 0.9, duration: 200, ease: 'Sine.Out' });
    p.fade(e, 500, 300);
  }

  /** The light version (boss fights, and a move that played moments ago): its emblem flicks in at the edge (or the
   * curtains twitch), and the marks land on the feet. */
  private flourish(p: Play): void {
    if (p.spec.steps.some((s) => s.k === 'curtain')) return this.curtain(p, true);
    const ref = p.spec.emblem ?? firstTex(p.spec) ?? 'peel';
    const at = p.emblemSpot();
    const side = at.x > W / 2 ? 1 : -1;
    const e = p.img(ref, at.x + side * 250, at.y, 150);
    p.tw({ targets: e, x: at.x + side * 20, angle: -8 * side, duration: 150, ease: 'Back.Out' });
    p.tw({ targets: e, x: at.x + side * 260, alpha: 0.3, delay: 420, duration: 200, ease: 'Quad.In', onComplete: () => e.destroy() });
    const g = p.img('glow', at.x + side * 90, at.y, 260).setTint(p.color).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    p.tw({ targets: g, alpha: 0.5, duration: 140, yoyo: true, hold: 200, onComplete: () => g.destroy() });
  }

  /** Darken the backdrop only (under the feet, the boss and the pizzas), at most 15%. */
  private dim(p: Play, a: number, ms = 450, color = 0x000000): void {
    const r = p.own(this.sc.add.rectangle(W / 2, H / 2, W, H, color).setAlpha(0), true);
    p.tw({ targets: r, alpha: Math.min(MAX_DIM, a), duration: 110 });
    p.fade(r, ms, 300);
  }

  /** What every move adds whatever its steps: a few tips pop off the feet it hit, healed and shielded pizzas glow. */
  private extras(p: Play, a: Ability): void {
    const fx = a.fx;
    if (fx.some((e) => e.e === 'tips') && !p.lite) {
      p.at(220, () => {
        for (const r of p.targets(5)) {
          const c = p.img('coin', r.x, r.y, 38);
          p.tw({ targets: c, y: r.y - rnd(80, 130), x: r.x + rnd(-40, 40), angle: rnd(-200, 200), duration: 380, ease: 'Quad.Out' });
          p.fade(c, 300, 200);
        }
      });
    }
    const heal = fx.some((e) => e.e === 'heal');
    const shield = fx.some((e) => e.e === 'shield');
    if (heal || shield) {
      p.at(260, () => {
        for (const pz of this.h.pizzas()) {
          const g = p.img('glow', pz.x, pz.surfaceY - 30, 260).setTint(heal ? 0x7be04a : 0xffe38a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
          p.tw({ targets: g, alpha: 0.6, duration: 140, yoyo: true, hold: 160, onComplete: () => g.destroy() });
          if (heal && !p.lite)
            for (let i = 0; i < 2; i++) {
              const ht = p.img('afx_heart', pz.x + rnd(-50, 50), pz.surfaceY - 40, 36);
              p.tw({ targets: ht, y: ht.y - rnd(70, 110), duration: 520, delay: i * 80, ease: 'Sine.Out' });
              p.fade(ht, 320 + i * 80, 240);
            }
        }
      });
    }
  }

  /** A hit's mark: a burst in the ability's colour, and a sign of what it did (frozen, burned, marked, knocked…). */
  mark(p: Play, r: HitRec): void {
    const s = r.big ? 1.5 : 1;
    const b = p.img('burst', r.x, r.y, 90 * s).setTint(p.color).setAngle(rnd(0, 360));
    p.tw({ targets: b, scale: b.scale * 2, alpha: 0, duration: 220, ease: 'Quad.Out', onComplete: () => b.destroy() });
    const ring = p.img('ring', r.x, r.y + 40 * s, 80 * s).setTint(p.color).setBlendMode(Phaser.BlendModes.ADD);
    ring.setScale(ring.scale, ring.scale * 0.4);
    p.tw({ targets: ring, scaleX: ring.scaleX * 2.6, scaleY: ring.scaleY * 2.6, alpha: 0, duration: 340, ease: 'Quad.Out', onComplete: () => ring.destroy() });
    if (p.spec.zombie) {
      const z = p.img('soft', r.x, r.y + 20, 110 * s).setTint(0x7aa84a).setAlpha(0.7);
      p.tw({ targets: z, scale: z.scale * 1.6, alpha: 0, duration: 480, onComplete: () => z.destroy() });
    }
    if (p.lite) return;
    const f = r.fx;
    if (f.has('freeze')) {
      for (let i = 0; i < 5; i++) {
        const sh = p.img('shard', r.x, r.y, 34 * s).setTint(0xdff6ff).setAngle(rnd(0, 360));
        const a = rnd(0, Math.PI * 2);
        p.tw({ targets: sh, x: r.x + Math.cos(a) * 80 * s, y: r.y + Math.sin(a) * 60 * s, angle: sh.angle + 180, duration: 320, ease: 'Quad.Out' });
        p.fade(sh, 180, 200);
      }
    } else if (f.has('burn')) {
      for (let i = 0; i < 4; i++) {
        const fl = p.img('flame', r.x + rnd(-40, 40) * s, r.y + 30 * s, 56 * s).setBlendMode(Phaser.BlendModes.ADD);
        p.tw({ targets: fl, y: fl.y - rnd(60, 110) * s, scale: fl.scale * 0.4, duration: 440, delay: i * 50, ease: 'Sine.Out' });
        p.fade(fl, 180 + i * 50, 260);
      }
    }
    if (f.has('mark') && this.sc.textures.exists('p_reticle')) {
      const rt = p.img('p_reticle', r.x, r.y, 200 * s).setTint(p.color).setAlpha(0);
      p.tw({ targets: rt, scale: rt.scale * 0.5, alpha: 1, angle: 90, duration: 200, ease: 'Back.Out' });
      p.fade(rt, 420, 240);
    }
    if (f.has('knock')) {
      for (const dx of [-30, 30]) {
        const sl = p.img('afx_streak', r.x + dx * s, r.y - 40, 150 * s).setAngle(-90).setAlpha(0.9);
        p.tw({ targets: sl, y: sl.y - 140, alpha: 0, duration: 280, ease: 'Quad.Out', onComplete: () => sl.destroy() });
      }
    }
    if (f.has('slow')) {
      const rp = p.img('ring', r.x, r.y + 60 * s, 110 * s).setTint(0x5fd8ff);
      rp.setScale(rp.scale, rp.scale * 0.3);
      p.tw({ targets: rp, scaleX: rp.scaleX * 2.2, scaleY: rp.scaleY * 2.2, alpha: 0, delay: 100, duration: 500, onComplete: () => rp.destroy() });
    }
    if (f.has('execute')) {
      const sl = p.img('afx_streak', r.x, r.y, 280 * s).setAngle(-35).setTint(0xff3a3a).setScale(0.01, 2.5);
      p.tw({ targets: sl, scaleX: (280 * s) / 256, duration: 110, ease: 'Quad.Out' });
      p.fade(sl, 180, 260);
    }
    if (f.has('stun') && !f.has('freeze')) {
      for (let i = 0; i < 3; i++) {
        const st = p.img('star5', r.x + (i - 1) * 34 * s, r.y - 60 * s, 30 * s).setAlpha(0);
        p.tw({ targets: st, alpha: 1, y: st.y - 36, angle: 180, duration: 260, delay: 60 + i * 40, ease: 'Back.Out' });
        p.fade(st, 420 + i * 40, 220);
      }
    }
  }

  /** The Classic Peel's Peel Slam (its sweep and its hit 230 ms in are the scene's): afterimages behind the big
   * peel, and when it lands flour dust and wood chips thrown up off the table. */
  classic(big: Phaser.GameObjects.Image): void {
    if (save.settings.reducedMotion || this.h.bossFight()) return;
    const lite = !peelsAnimated();
    const p = new Play(this, this.h, { steps: [], sfx: [] }, [], 0xffd23f, null, null, 'peel', lite);
    cosm(() => {
      if (!lite)
        for (let i = 1; i <= 3; i++)
          p.at(i * 110, () => {
            if (!big.active || !this.sc.textures.exists(big.texture.key)) return;
            const g = p.own(this.sc.add.image(big.x, big.y, big.texture.key)).setOrigin(big.originX, big.originY).setScale(big.scaleX, big.scaleY).setAngle(big.angle).setTint(0xffd23f).setAlpha(0.3);
            p.fade(g, 0, 180);
          });
      p.at(230, () => {
        for (let i = 0; i < (lite ? 3 : 6); i++) this.dust(p, 200 + i * ((W - 400) / 5), TABLE_Y - 20, 0xf2e6cc, 0.7);
        if (!lite)
          for (let i = 0; i < 14; i++) {
            const c = p.img('crumb', rnd(100, W - 100), TABLE_Y - 30, rnd(22, 40)).setTint(0xb07a3a);
            p.tw({ targets: c, y: c.y - rnd(100, 260), x: c.x + rnd(-120, 120), angle: rnd(-360, 360), duration: 340, ease: 'Quad.Out' });
            p.tw({ targets: c, y: TABLE_Y + 40, delay: 340, duration: 280, ease: 'Quad.In', onComplete: () => c.destroy() });
          }
      });
    });
    this.sc.time.delayedCall(LIFETIME, () => {
      for (const o of [...p.objs]) o.destroy();
    });
  }

  // ═══════════════════════════════ the stagers ═══════════════════════════════

  private step(p: Play, st: Step): void {
    switch (st.k) {
      case 'strike':
        return this.strike(p, st);
      case 'sweep':
        return this.sweep(p, st);
      case 'rain':
        return this.rain(p, st);
      case 'rings':
        return this.rings(p, st);
      case 'beam':
        return this.beam(p, st);
      case 'flood':
        return this.flood(p, st);
      case 'spin':
        return this.spin(p, st);
      case 'show':
        return this.show(p, st);
      case 'tint':
        return this.dim(p, st.alpha ?? MAX_DIM, st.ms ?? 450, st.color);
      case 'rise':
        return this.rise(p);
      case 'vignette': {
        const v = p.own(this.sc.add.image(W / 2, H / 2, 'vignette')).setDisplaySize(W, H).setTint(st.color ?? 0x000000).setAlpha(0);
        p.tw({ targets: v, alpha: st.alpha ?? 0.8, duration: 90 });
        p.fade(v, st.ms ?? 450, 300);
        return;
      }
      case 'seek':
        return this.seek(p, st);
      case 'curtain':
        return this.curtain(p, false);
      case 'krak':
        return this.krak(p);
      case 'timber':
        return this.timber(p);
    }
  }

  /** Something comes down on each foot it hit (a foot leg and all, the peel head first, a prop): a short wind-up
   * just above it, a slam with squash, a puff of dust, a hold, then it lifts away. With nothing hit, once on the
   * table's middle. */
  private strike(p: Play, st: Extract<Step, { k: 'strike' }>): void {
    const aimed = p.targets(Math.min(3, st.n ?? 3));
    // feet past the first few get the landing's dust only
    p.at(170, () => {
      for (const r of p.targets(8).slice(aimed.length)) this.dust(p, r.x, r.y + 50, st.dust ?? 0xd9c4a0, 0.5);
    });
    const spots = aimed.length ? aimed.map((r) => ({ x: r.x, y: r.y + (r.big ? 80 : 50), r, big: r.big })) : [{ x: st.x ?? W / 2, y: st.y ?? TABLE_Y - 60, r: null as HitRec | null, big: false }];
    const size = Math.min(1.3, st.size ?? 1);
    spots.forEach((s, i) => {
      const t0 = i * (st.stagger ?? 50);
      p.at(t0, () => {
        const rig = (st.tex === 'foot' && !!p.foot) || st.tex === 'peel';
        const sc = (s.big ? 1.15 : 0.85) * size;
        const o: Phaser.GameObjects.Image | Phaser.GameObjects.Container = rig ? p.footRig(s.x, s.y, (st.tex === 'peel' ? 200 : 240) * sc, st.tex === 'peel') : p.img(st.tex, s.x, s.y, 220 * sc);
        if (!rig) (o as Phaser.GameObjects.Image).setOrigin(0.5, 0.85);
        const base = { sx: o.scaleX, sy: o.scaleY };
        const from = st.from ?? 'top';
        const dx = from === 'left' ? -260 : from === 'right' ? 260 : 0;
        o.setPosition(s.x + dx, s.y - 260).setAngle(dx / 10 + (st.spin ?? 0) * -90).setAlpha(0);
        o.setScale(base.sx * 0.96, base.sy * 1.06);
        // wind-up: it appears just above, rearing back
        p.tw({ targets: o, alpha: 1, y: s.y - 300, duration: 70, ease: 'Sine.Out' });
        p.tw({
          targets: o,
          x: s.x,
          y: s.y,
          angle: 0,
          scaleY: base.sy,
          delay: 70,
          duration: 90,
          ease: 'Quad.In',
          onComplete: () => {
            p.tw({ targets: o, scaleX: base.sx * 1.1, scaleY: base.sy * 0.88, duration: 55, yoyo: true, ease: 'Quad.Out' });
            this.dust(p, s.x, s.y, st.dust ?? 0xd9c4a0, s.big ? 0.8 : 0.55);
            if (st.crack !== false && !p.lite) {
              const ck = p.img('afx_crack', s.x, s.y + 6, 260 * (s.big ? 1.3 : 1), true).setAlpha(0.8);
              p.fade(ck, 380, 300);
            }
            if (st.bounce) p.tw({ targets: o, y: s.y - 40, duration: 110, delay: 110, yoyo: true, ease: 'Sine.Out' });
            p.tw({ targets: o, alpha: 0.5, delay: 60, duration: 80 });
            p.tw({ targets: o, y: s.y - 420, alpha: 0, delay: (st.hold ?? 60) + 60, duration: 200, ease: 'Quad.In', onComplete: () => o.destroy() });
          },
        });
        if (s.r) p.land(s.r, t0 + 160);
        else for (const r of p.hits) p.land(r, t0 + 170);
        p.peak(t0 + 160);
      });
    });
  }

  /** Dust thrown out sideways at a landing, and a small shockwave ring. */
  private dust(p: Play, x: number, y: number, color: number, k: number): void {
    const n = p.lite ? 3 : 7;
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      const d = p.img('soft', x + side * rnd(20, 60) * k, y - 10, rnd(70, 120) * k).setTint(color).setAlpha(0.8);
      p.tw({ targets: d, x: d.x + side * rnd(100, 220) * k, y: d.y - rnd(10, 60) * k, scale: d.scale * 1.8, alpha: 0, duration: rnd(380, 560), ease: 'Quad.Out', onComplete: () => d.destroy() });
    }
    const ring = p.img('ring', x, y, 110 * k).setTint(0xffffff).setBlendMode(Phaser.BlendModes.ADD);
    ring.setScale(ring.scale, ring.scale * 0.3);
    p.tw({ targets: ring, scaleX: ring.scaleX * 4, scaleY: ring.scaleY * 4, alpha: 0, duration: 340, ease: 'Quad.Out', onComplete: () => ring.destroy() });
  }

  /** A run along the bottom edge (a foot skating, a charge, a roll, a slide), under the pizzas' plates: each foot it
   * passes takes a streak up from the edge and its hit. Fast: across in about half a second. */
  private sweep(p: Play, st: Extract<Step, { k: 'sweep' }>): void {
    const n = Math.min(3, st.n ?? 1);
    for (let j = 0; j < n; j++) p.at(j * (st.gap ?? 90), () => this.sweepOne(p, st, j));
  }

  private sweepOne(p: Play, st: Extract<Step, { k: 'sweep' }>, j: number): void {
    const dir = st.dir ?? 1;
    const size = Math.min(180, (st.size ?? 220) * 0.75) * (j ? 0.85 : 1);
    const y0 = H - size * 0.32 - j * 10;
    const x0 = dir > 0 ? -size : W + size;
    const x1 = dir > 0 ? W + size : -size;
    const ms = Math.min(520, st.ms ?? 480);
    const o = p.img(st.tex, x0, y0, size);
    if (st.flip ?? dir < 0) o.setFlipX(true);
    const lean = (st.lean ?? 0) * dir;
    o.setAngle(lean);
    const prog = { t: 0 };
    let ghostAt = 0;
    p.tw({
      targets: prog,
      t: 1,
      delay: 60,
      duration: ms,
      ease: 'Sine.In',
      onUpdate: () => {
        if (!o.active) return;
        const t = prog.t;
        o.x = x0 + (x1 - x0) * t;
        o.y = y0 - (st.hop ? Math.abs(Math.sin(t * Math.PI * (st.hops ?? 4))) * Math.min(40, st.hop) : 0);
        if (st.spin) o.angle = lean + st.spin * 360 * t * dir;
        else if (st.wobble) o.angle = lean + Math.sin(t * Math.PI * 6) * st.wobble;
        if (!p.lite && st.ghosts !== false && t - ghostAt > 0.07) {
          ghostAt = t;
          const g = p.img(st.tex, o.x, o.y, size).setAngle(o.angle).setFlipX(o.flipX).setAlpha(0.4).setTint(p.color);
          p.fade(g, 0, 180);
        }
      },
      onComplete: () => o.destroy(),
    });
    if (j) return;
    // each foot it passes: a streak up from the edge to it, and its hit
    for (const r of p.targets(8)) {
      const u = Phaser.Math.Clamp((r.x - x0) / (x1 - x0), 0, 1);
      const t = 60 + Math.sqrt(u) * ms;
      p.at(t, () => {
        const sl = p.img('afx_streak', r.x, r.y + 150, 200).setOrigin(0, 0.5).setAngle(-90).setTint(st.trail ?? p.color).setBlendMode(Phaser.BlendModes.ADD);
        sl.setDisplaySize(150, 20);
        p.fade(sl, 60, 160);
        if (st.hitTex)
          for (let i = 0; i < (p.lite ? 2 : 4); i++) {
            const m = p.img(st.hitTex, r.x + rnd(-30, 30), r.y + 30, rnd(36, 60));
            p.tw({ targets: m, x: m.x + rnd(-90, 90), y: m.y - rnd(40, 110), angle: rnd(-180, 180), duration: 340, ease: 'Quad.Out' });
            p.fade(m, 160, 200);
          }
      });
      p.land(r, t + 40);
    }
    p.peak(60 + ms * 0.4);
  }

  /** Things fall onto the feet it hit (or rise from them), staggered, slanted, splashing. A few extras land on the
   * table around them; nothing crosses the middle of the screen for long. */
  private rain(p: Play, st: Extract<Step, { k: 'rain' }>): void {
    const aimed = st.at === 'spread' ? [] : p.targets(8);
    const extra = p.lite ? 1 : Math.min(6, Math.round((st.n ?? 8) / 3));
    const n = aimed.length + extra;
    const ms = Math.min(400, st.ms ?? 320);
    const slant = st.slant ?? 0;
    for (let i = 0; i < n; i++) {
      const r = aimed[i] ?? null;
      const near = aimed.length ? aimed[i % aimed.length] : null;
      const tx = r ? r.x + rnd(-20, 20) : near ? near.x + rnd(-160, 160) : rnd(160, W - 160);
      const ty = r ? r.y : near ? near.y + rnd(-60, 80) : rnd(TABLE_Y - 380, TABLE_Y - 120);
      const t0 = r ? (i / Math.max(1, aimed.length)) * ms * 0.5 : rnd(60, ms);
      p.at(t0, () => {
        const size = Math.min(130, st.size ?? 80) * (r?.big ? 1.4 : r ? 1 : 0.7) * rnd(0.85, 1.15);
        const tex = st.tex[i % st.tex.length];
        const up = !!st.up;
        const fall = up ? -260 : 420;
        const sx = tx - Math.tan((slant * Math.PI) / 180) * fall;
        const sy = ty - fall;
        const o = p.img(tex, sx, sy, size).setAlpha(0);
        if (st.add) o.setBlendMode(Phaser.BlendModes.ADD);
        if (st.tint) o.setTint(st.tint[i % st.tint.length]);
        const ang = (Math.atan2(ty - sy, tx - sx) * 180) / Math.PI - 90;
        if (st.point) o.setAngle(ang);
        let tr: Phaser.GameObjects.Image | null = null;
        if (st.trail !== undefined && !p.lite) tr = p.img('afx_streak', sx, sy, size * 2.2).setTint(st.trail).setBlendMode(Phaser.BlendModes.ADD).setAngle(ang + 90).setOrigin(1, 0.5);
        const dur = rnd(150, 200) * (up ? 1.8 : 1);
        p.tw({ targets: o, alpha: 1, duration: 60 });
        p.tw({
          targets: tr ? [o, tr] : o,
          x: tx,
          y: ty,
          duration: dur,
          ease: up ? 'Sine.Out' : 'Quad.In',
          onComplete: () => {
            tr?.destroy();
            if (!up) {
              const b = p.img('burst', tx, ty, size * 1.2).setTint(st.splash ?? p.color);
              p.tw({ targets: b, scale: b.scale * 1.7, alpha: 0, duration: 180, onComplete: () => b.destroy() });
            }
            if (st.stay) {
              p.tw({ targets: o, y: o.y + 24, angle: o.angle + rnd(-30, 30), duration: 240, ease: 'Bounce.Out' });
              p.fade(o, 300, 220);
            } else p.fade(o, 0, 220, { scale: o.scale * (up ? 1.5 : 1.3) });
          },
        });
        if (st.spin) p.tw({ targets: o, angle: rnd(-480, 480), duration: dur });
        if (r) p.land(r, dur);
        if (i === 0) p.peak(dur);
      });
    }
  }

  /** Shockwaves out from each foot it hit (with a few icons thrown off), or in onto them (implode). */
  private rings(p: Play, st: Extract<Step, { k: 'rings' }>): void {
    const aimed = p.targets(6);
    const n = Math.min(3, st.n ?? 2);
    const size = 300;
    const dur = Math.min(520, st.ms ?? 420);
    for (const r of aimed) {
      for (let i = 0; i < n; i++) {
        p.at(i * Math.min(110, st.gap ?? 90), () => {
          const ring = p.img(st.tex ?? 'ring', r.x, r.y + 20, st.implode ? size : 40).setTint(st.color).setBlendMode(Phaser.BlendModes.ADD);
          const sq = st.squash ?? 0.6;
          ring.setScale(ring.scale, ring.scale * sq);
          const to = st.implode ? 40 / size : size / 40;
          p.tw({ targets: ring, scaleX: ring.scaleX * to, scaleY: ring.scaleY * to, alpha: { from: 1, to: 0 }, angle: st.tex ? 90 : 0, duration: dur, ease: st.implode ? 'Quad.In' : 'Quad.Out', onComplete: () => ring.destroy() });
        });
      }
      if (st.icons && !p.lite) {
        const k = Math.min(4, Math.ceil((st.nIcons ?? 8) / Math.max(1, aimed.length)) + 1);
        for (let i = 0; i < k; i++) {
          const a = -Math.PI / 2 + rnd(-1.2, 1.2);
          const ic = p.img(st.icons, r.x, r.y, rnd(40, 60)).setAlpha(0);
          if (st.iconTint) ic.setTint(st.iconTint[i % st.iconTint.length]);
          const d = rnd(90, 170);
          p.tw({ targets: ic, x: r.x + Math.cos(a) * d, y: r.y + Math.sin(a) * d, alpha: { from: 1, to: 0 }, angle: rnd(-90, 90), delay: 80, duration: 520, ease: 'Quad.Out', onComplete: () => ic.destroy() });
        }
      }
      p.land(r, st.implode ? dur * 0.9 : 80);
    }
    p.peak(st.implode ? dur * 0.9 : 80);
  }

  /** Beams down from the top edge onto each foot it hit: lightning, a column of light, or a laser. */
  private beam(p: Play, st: Extract<Step, { k: 'beam' }>): void {
    const aimed = p.targets(st.n ?? 8);
    aimed.forEach((s, i) => {
      const t0 = 50 + i * Math.min(50, st.stagger ?? 40);
      const col = st.colors ? st.colors[i % st.colors.length] : st.color;
      p.at(t0, () => {
        const top = -30;
        const fx = s.x + rnd(-30, 30);
        if (st.kind === 'bolt') this.bolt(p, fx, top, s.x, s.y, col, Math.min(1.4, st.w ?? 1));
        else {
          const len = Math.hypot(s.x - fx, s.y - top);
          const ang = (Math.atan2(s.y - top, s.x - fx) * 180) / Math.PI;
          const w = Math.min(1.4, st.w ?? 1) * (st.kind === 'laser' ? 26 : 110);
          const c = p.own(this.sc.add.image(fx, top, 'glow')).setOrigin(0, 0.5).setTint(col).setBlendMode(Phaser.BlendModes.ADD);
          c.setDisplaySize(len, w).setAngle(ang).setAlpha(0);
          p.tw({ targets: c, alpha: st.kind === 'laser' ? 0.95 : 0.7, duration: 60 });
          p.fade(c, 160, 220);
        }
        const g = p.img('glow', s.x, s.y, 200).setTint(col).setBlendMode(Phaser.BlendModes.ADD);
        p.fade(g, 40, 260, { scale: g.scale * 1.5 });
      });
      p.land(s, t0 + 40);
    });
    p.peak(100);
  }

  private bolt(p: Play, x0: number, y0: number, x1: number, y1: number, color: number, w: number): void {
    const g = p.own(this.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD));
    const pts: [number, number][] = [[x0, y0]];
    const segs = 10;
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      pts.push([x0 + (x1 - x0) * t + rnd(-40, 40), y0 + (y1 - y0) * t + rnd(-18, 18)]);
    }
    pts.push([x1, y1]);
    for (const [lw, c, a] of [[20 * w, color, 0.35], [8 * w, 0xdff6ff, 0.9], [3 * w, 0xffffff, 1]] as const) {
      g.lineStyle(lw, c, a);
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (const q of pts.slice(1)) g.lineTo(q[0], q[1]);
      g.strokePath();
    }
    p.fade(g, 80, 180);
  }

  /** An element (water, ink, sauce, snow, fire, frost, gold, cheese) washes in at the screen's sides, no further than
   * 12% of the width, and back; and splashes on each foot it hit. The Red Sea (part) throws the splashes outwards. */
  private flood(p: Play, st: Extract<Step, { k: 'flood' }>): void {
    const el = FLOOD[st.kind];
    const ms = 560;
    if (st.kind === 'frost') {
      // ice growing in from each side (no further than 12% of the width), then melting back
      for (const side of [-1, 1]) {
        const o = p.own(this.sc.add.image(side < 0 ? 0 : W, H / 2, el.side)).setOrigin(side < 0 ? 0 : 1, 0.5).setDisplaySize(EDGE, H).setAlpha(0);
        if (side > 0) o.setFlipX(true);
        const sx = o.scaleX;
        o.scaleX = sx * 0.3;
        p.tw({ targets: o, alpha: 1, scaleX: sx, duration: 150, ease: 'Back.Out' });
        p.fade(o, 380, 260, { scaleX: sx * 0.5 });
      }
    } else if (st.kind === 'fire') {
      // flames licking up both sides, inside the edge band (tint: a brandy flame's blue, say)
      for (const side of [-1, 1])
        for (let i = 0; i < (p.lite ? 4 : 9); i++) {
          const x = side < 0 ? rnd(20, EDGE * 0.5) : W - rnd(20, EDGE * 0.5);
          const f = p.img('flame', x, H + 40, rnd(90, 120)).setBlendMode(Phaser.BlendModes.ADD).setOrigin(0.5, 1);
          if (st.tint) f.setTint(st.tint);
          p.tw({ targets: f, y: rnd(H * 0.35, H * 0.9), scaleY: f.scaleY * 1.6, duration: rnd(220, 340), delay: i * 30, ease: 'Quad.Out' });
          p.fade(f, 280 + i * 30, 260);
        }
    } else {
      // the element's wall, turned to face inwards from each side
      const thick = EDGE;
      for (const side of [-1, 1]) {
        const o = p.own(this.sc.add.image(side < 0 ? -thick : W + thick, H / 2, el.side)).setOrigin(0.5, 1).setDisplaySize(H * 1.1, thick).setAngle(side < 0 ? 90 : -90);
        if (st.kind === 'water' || st.kind === 'ink') o.setAlpha(0.85);
        p.tw({ targets: o, x: side < 0 ? 0 : W, duration: 150, ease: 'Back.Out' });
        p.tw({ targets: o, x: side < 0 ? -thick - 20 : W + thick + 20, delay: ms - 200, duration: 220, ease: 'Quad.In', onComplete: () => o.destroy() });
      }
    }
    // the element splashing on each foot
    for (const r of p.targets(8)) {
      const t = 120 + Math.min(Math.abs(r.x - W / 2), W / 2) * (st.kind === 'part' ? 0.12 : 0.04);
      p.at(t, () => {
        const k = p.lite ? 2 : 4;
        for (let i = 0; i < k; i++) {
          const s = p.img(el.hit, r.x + rnd(-30, 30), r.y + rnd(-10, 30), rnd(50, 90) * (r.big ? 1.4 : 1));
          if (st.tint ?? el.tint) s.setTint((st.tint ?? el.tint)!);
          if (st.kind === 'fire') s.setBlendMode(Phaser.BlendModes.ADD);
          const out = st.kind === 'part' ? Math.sign(r.x - W / 2 || 1) * rnd(80, 160) : rnd(-80, 80);
          p.tw({ targets: s, x: s.x + out, y: s.y - rnd(40, 120), angle: rnd(-120, 120), duration: 360, ease: 'Quad.Out' });
          p.fade(s, 180, 220);
        }
      });
      p.land(r, t);
    }
    p.peak(140);
  }

  /** A whirl on each foot it hit (up to four): the thing turns in (or a vortex closes), throwing off a ring. */
  private spin(p: Play, st: Extract<Step, { k: 'spin' }>): void {
    const aimed = p.targets(4);
    const spots = aimed.length ? aimed : [{ x: W / 2, y: TABLE_Y - 200, big: false } as HitRec];
    const ms = Math.min(450, st.ms ?? 450);
    spots.forEach((r, i) => {
      p.at(i * 40, () => {
        // a whirl on the floor at the foot's sole, squashed flat, half see-through: it never hides the foot
        const size = 110 * (r.big ? 1.4 : 1);
        const fy = r.y + (r.big ? 90 : 60);
        const o = p.img(st.tex, r.x, fy, size);
        if (st.tint) o.setTint(st.tint);
        if (st.add) o.setBlendMode(Phaser.BlendModes.ADD);
        const s = o.scale;
        const flat = 0.45;
        o.setScale(st.implode ? s * 1.6 : s * 0.2, (st.implode ? s * 1.6 : s * 0.2) * flat).setAlpha(0);
        p.tw({ targets: o, scaleX: s, scaleY: s * flat, alpha: 0.5, duration: 160, ease: st.implode ? 'Quad.In' : 'Back.Out' });
        p.tw({ targets: o, angle: (st.turns ?? 2) * 360, duration: ms, ease: 'Sine.InOut' });
        if (st.implode) p.tw({ targets: o, scaleX: s * 0.1, scaleY: s * 0.1 * flat, delay: ms * 0.6, duration: ms * 0.4, ease: 'Back.In', onComplete: () => o.destroy() });
        else p.fade(o, ms - 120, 200, { scaleX: s * 1.3, scaleY: s * 1.3 * flat });
        if (st.color !== undefined) {
          const ring = p.img('ring', r.x, fy, size * 0.6).setTint(st.color).setBlendMode(Phaser.BlendModes.ADD);
          ring.setScale(ring.scale, ring.scale * 0.6);
          p.tw({ targets: ring, scaleX: ring.scaleX * 2.6, scaleY: ring.scaleY * 2.6, alpha: 0, delay: 160, duration: 380, ease: 'Quad.Out', onComplete: () => ring.destroy() });
        }
        if (!p.lite && st.sparkle !== false)
          for (let k = 0; k < 4; k++) {
            const a = rnd(0, Math.PI * 2);
            const sp = p.img('star', r.x, fy, 30).setTint(st.color ?? p.color).setBlendMode(Phaser.BlendModes.ADD);
            p.tw({ targets: sp, x: r.x + Math.cos(a) * size, y: fy + Math.sin(a) * size * 0.4, alpha: 0, angle: 180, delay: 120, duration: 380, onComplete: () => sp.destroy() });
          }
        if (aimed.length) p.land(r, (st.implode ? ms * 0.9 : 160) + i * 40);
      });
    });
    p.peak(st.implode ? ms * 0.9 : 160);
  }

  /** The move's emblem at the screen's edge: it swings in from the right side (or peeks up at the bottom corner, or
   * drops in at the top corner), glowing, holds a moment and goes; shatter flings its pieces at the feet. */
  private show(p: Play, st: Extract<Step, { k: 'show' }>): void {
    const from = st.from ?? 'pop';
    const size = Math.min(240, (st.size ?? 220) * 0.6);
    const spot = p.emblemSpot();
    const right = spot.x > W / 2;
    const pos = from === 'below' ? { x: right ? W - 320 : 320, y: H - size * 0.3 } : from === 'top' ? { x: right ? W - 260 : 260, y: 150 } : spot;
    const ms = Math.min(520, st.ms ?? 480);
    if (st.glow !== undefined) {
      const g = p.img('glow', pos.x, pos.y, size * 1.8).setTint(st.glow).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      p.tw({ targets: g, alpha: 0.7, duration: 140 });
      p.fade(g, ms - 120, 260);
    }
    const o = p.img(st.tex, pos.x, pos.y, size);
    if (st.tint) o.setTint(st.tint);
    if (st.add) o.setBlendMode(Phaser.BlendModes.ADD);
    if (from === 'below') {
      o.setY(H + size * 0.6);
      p.tw({ targets: o, y: pos.y, duration: 160, ease: 'Back.Out' });
    } else if (from === 'top') {
      o.setY(-size * 0.6);
      p.tw({ targets: o, y: pos.y, duration: 160, ease: 'Back.Out' });
    } else {
      o.setX(right ? W + size * 0.6 : -size * 0.6).setAngle(right ? -20 : 20);
      p.tw({ targets: o, x: pos.x, angle: 0, duration: 160, ease: 'Back.Out' });
    }
    if (st.spin) p.tw({ targets: o, angle: st.spin * 360, duration: ms, ease: 'Sine.InOut' });
    if (st.wiggle) p.tw({ targets: o, angle: { from: -6, to: 6 }, duration: 60, delay: 160, yoyo: true, repeat: 3 });
    if (st.shatter) {
      const sh = st.shatter;
      p.at(170, () => {
        o.destroy();
        const aimed = p.targets(8);
        const pieces = Math.max(aimed.length, p.lite ? 3 : 6);
        for (let i = 0; i < pieces; i++) {
          const r = aimed[i % Math.max(1, aimed.length)];
          const tx = r ? r.x + rnd(-20, 20) : pos.x + rnd(-200, 0);
          const ty = r ? r.y + rnd(-20, 20) : pos.y + rnd(-120, 120);
          const pc = p.img(sh.tex, pos.x + rnd(-30, 30), pos.y + rnd(-30, 30), Math.min(70, sh.size ?? 60)).setAngle(rnd(0, 360));
          if (sh.tint) pc.setTint(sh.tint);
          const dur = rnd(200, 280);
          p.tw({ targets: pc, x: tx, y: ty, angle: pc.angle + rnd(-360, 360), duration: dur, ease: 'Quad.In', onComplete: () => pc.destroy() });
          if (r && i < aimed.length) p.land(r, 170 + dur);
        }
      });
    } else {
      const away = from === 'below' ? { y: H + size } : from === 'top' ? { y: -size } : { x: right ? W + size : -size };
      p.tw({ targets: o, ...away, delay: ms, duration: 200, ease: 'Quad.In', onComplete: () => o.destroy() });
    }
  }

  /** A zombified foot bursts up out of the bottom-left corner, toes first, in green mist and dirt, sways, and
   * sinks back. */
  private rise(p: Play): void {
    const x = 110;
    const o = p.img('foot', x, H + 240, 220).setOrigin(0.5, 0.15).setFlipY(true);
    o.setAngle(-10);
    p.tw({ targets: o, y: H - 300, angle: 6, duration: 200, ease: 'Back.Out' });
    p.tw({ targets: o, angle: -4, duration: 160, delay: 200, yoyo: true, ease: 'Sine.InOut' });
    p.tw({ targets: o, y: H + 240, delay: 600, duration: 240, ease: 'Quad.In', onComplete: () => o.destroy() });
    for (let i = 0; i < (p.lite ? 3 : 8); i++) {
      const c = p.img('crumb', x + rnd(-80, 80), H - 10, rnd(22, 36)).setTint(0x5a3a1a);
      p.tw({ targets: c, x: c.x + rnd(-100, 100), y: c.y - rnd(80, 200), angle: rnd(-360, 360), duration: 300, ease: 'Quad.Out' });
      p.tw({ targets: c, y: H + 40, delay: 300, duration: 260, ease: 'Quad.In', onComplete: () => c.destroy() });
    }
    const m = p.img('soft', x, H - 40, 260).setTint(0x8ac860).setAlpha(0);
    p.tw({ targets: m, alpha: 0.5, y: m.y - 60, duration: 220 });
    p.fade(m, 420, 300);
  }

  /** Copies of a thing swoop down from the top edge onto each foot it hit (ghosts, peels, cards). */
  private seek(p: Play, st: Extract<Step, { k: 'seek' }>): void {
    p.targets(st.n ?? 8).forEach((r, i) => {
      const t0 = i * 35;
      p.at(t0, () => {
        const from = { x: r.x + (i % 2 ? 260 : -260), y: -60 };
        const o = p.img(st.tex, from.x, from.y, Math.min(130, st.size ?? 110)).setAlpha(0.95);
        if (st.tint) o.setTint(st.tint);
        if (st.add) o.setBlendMode(Phaser.BlendModes.ADD);
        const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(from.x, from.y), new Phaser.Math.Vector2((from.x + r.x) / 2, r.y - 220), new Phaser.Math.Vector2(r.x, r.y));
        const prog = { t: 0 };
        const dur = 220;
        p.tw({
          targets: prog,
          t: 1,
          duration: dur,
          ease: 'Quad.In',
          onUpdate: () => {
            const q = curve.getPoint(prog.t);
            o.setPosition(q.x, q.y);
            if (st.spin) o.angle += 18;
          },
          onComplete: () => p.fade(o, 0, 180, { scale: o.scale * 1.4 }),
        });
        p.land(r, t0 + dur);
      });
    });
    p.peak(220);
  }

  // ═══════════════════════════════ the specials ═══════════════════════════════

  /** Curtain Call (the Finale Peel): translucent velvet drapes swing in from both sides to frame the table (12% of
   * the width each, the table showing through them) and a pelmet dips at the top; the hit lands as they swing in,
   * a spotlight pool on each foot and a rose landing on it; then the drapes swing back. Light: the drapes twitch. */
  private curtain(p: Play, light: boolean): void {
    const sc = this.sc;
    const reach = light ? EDGE * 0.5 : EDGE;
    const DRAPE = 0.45;
    const back = light ? 380 : 560;
    const val = p.own(sc.add.image(W / 2, -70, 'afx_valance')).setOrigin(0.5, 0).setDisplaySize(W + 40, 64).setAlpha(DRAPE);
    p.tw({ targets: val, y: -22, duration: 120, ease: 'Back.Out' });
    p.tw({ targets: val, y: -100, delay: back, duration: 220, ease: 'Quad.In', onComplete: () => val.destroy() });
    for (const side of [-1, 1]) {
      const c = p.own(sc.add.image(side < 0 ? 0 : W, -10, 'afx_curtain')).setOrigin(side < 0 ? 1 : 0, 0).setDisplaySize(EDGE * 1.6, H + 20).setAlpha(DRAPE);
      if (side > 0) c.setFlipX(true);
      // a tug outward (anticipation), the swing in, a sway, and back
      p.tw({ targets: c, x: c.x + side * 16, duration: 50, ease: 'Sine.Out' });
      p.tw({ targets: c, x: side < 0 ? reach : W - reach, delay: 50, duration: 120, ease: 'Quad.In' });
      p.tw({ targets: c, scaleX: c.scaleX * 0.92, duration: 80, delay: 170, yoyo: true, ease: 'Sine.Out' });
      p.tw({ targets: c, x: side < 0 ? -20 : W + 20, delay: back, duration: 240, ease: 'Quad.InOut', onComplete: () => c.destroy() });
    }
    p.peak(170);
    if (light) return;
    p.at(170, () => {
      for (const r of p.targets(8)) {
        // the spotlight finds each foot: a warm pool of light from the top edge (light only: it never hides it)
        const lamp = p.own(sc.add.image(r.x, -10, 'afx_spot')).setOrigin(0.5, 0).setDisplaySize(r.big ? 320 : 220, r.y + 80).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
        p.tw({ targets: lamp, alpha: 0.4, duration: 100 });
        p.fade(lamp, 300, 280);
        p.land(r, 0);
        if (!p.lite) {
          const rs = p.img('afx_rose', r.x + rnd(-120, 120), r.y - 240, 60).setAngle(rnd(-60, 60));
          p.tw({ targets: rs, x: r.x + rnd(-30, 30), y: r.y + 30, angle: rnd(-200, 200), duration: 260, ease: 'Quad.In' });
          p.fade(rs, 300, 220);
        }
      }
    });
  }

  /** KRAK! (Act 7, the comics): an inked comic burst on every foot, and the lettered panel slams in at the edge. */
  private krak(p: Play): void {
    const at = p.emblemSpot();
    const panel = p.own(this.sc.add.image(at.x, at.y, 'afx_krak')).setScale(0.06).setAngle(-14);
    p.tw({ targets: panel, scale: 0.26, angle: 4, duration: 140, ease: 'Back.Out' });
    p.tw({ targets: panel, x: panel.x + 6, duration: 40, delay: 150, yoyo: true, repeat: 2 });
    p.tw({ targets: panel, scale: 0.32, alpha: 0, delay: 560, duration: 200, ease: 'Quad.In', onComplete: () => panel.destroy() });
    p.at(150, () => {
      for (const r of p.targets(8)) {
        const b = p.img('p_a7_burst', r.x, r.y, r.big ? 240 : 160).setAngle(rnd(-20, 20));
        p.tw({ targets: b, scale: { from: b.scale * 0.3, to: b.scale }, duration: 110, ease: 'Back.Out' });
        p.fade(b, 300, 180);
        p.land(r, 0);
      }
    });
    p.peak(150);
  }

  /** Timber! (the Lumberjack): a pine falls onto each of the front feet from beside it, bouncing as it lands. */
  private timber(p: Play): void {
    const aimed = p.targets(3);
    const spots = aimed.length ? aimed : [{ x: W / 2, y: TABLE_Y - 160, big: false } as HitRec];
    spots.forEach((r, i) => {
      p.at(i * 60, () => {
        const len = 260;
        // the stump stands beside the foot, on the side away from the middle; the crown falls onto it
        const side = r.x > W / 2 ? 1 : -1;
        const t = p.own(this.sc.add.image(r.x + side * len * 0.9, r.y + 40, 'afx_tree')).setDisplaySize(len, len * 0.33);
        t.setOrigin(0, 0.5).setAngle(-90);
        // it comes down steep, crown first onto the foot (not flat across its neighbours)
        const down = side > 0 ? -155 : -25;
        p.tw({ targets: t, angle: -90 - side * 6, duration: 50 });
        p.tw({
          targets: t,
          angle: down,
          delay: 50,
          duration: 120,
          ease: 'Quad.In',
          onComplete: () => {
            p.tw({ targets: t, angle: down + side * 4, duration: 90, yoyo: true });
            this.dust(p, r.x, r.y + 40, 0x8a6a3a, 0.7);
            p.fade(t, 120, 160);
          },
        });
        if (aimed.length) p.land(r, i * 60 + 170);
      });
    });
    p.peak(170);
  }
}

/** The first texture a spec's steps show (its emblem when none is set). */
function firstTex(s: Spec): TexRef | null {
  for (const st of s.steps) {
    const o = st as unknown as { tex?: TexRef | TexRef[] };
    if (typeof o.tex === 'string') return o.tex;
    if (Array.isArray(o.tex)) return o.tex[0];
    if (st.k === 'curtain') return 'afx_curtain';
    if (st.k === 'krak') return 'afx_krak';
    if (st.k === 'timber') return 'afx_tree';
    if (st.k === 'flood') return FLOOD[st.kind].hit;
  }
  return null;
}

/** Dev: every spec's textures and sounds that don't exist (an empty list is the goal). */
export function abilityFxProblems(sc: Phaser.Scene, sounds: string[]): string[] {
  const out: string[] = [];
  for (const [key, a] of Object.entries(ABILITIES)) {
    if (a.custom || !(a.trigger.t === 'active' || a.trigger.t === 'auto')) continue;
    const s = specFor(key, a);
    const refs = [...texRefs(s), ...s.steps.flatMap((st) => (st.k === 'flood' ? [FLOOD[st.kind].side, FLOOD[st.kind].hit] : []))];
    for (const t of refs) if (t !== 'foot' && t !== 'pizza' && t !== 'peel' && !isAfxKey(t) && !sc.textures.exists(t)) out.push(`${key}: texture ${t}`);
    for (const [k] of s.sfx) if (!sounds.includes(k)) out.push(`${key}: sound ${k}`);
  }
  return out;
}
