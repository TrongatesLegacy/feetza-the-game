// Kronos the Titan King (mini-boss, wave 88, Tartarus; met with the Kratos peel: src/game/nemesis.ts). His foot is
// src/content/feet/kratos.ts (art src/content/style/acts-f-3.ts, live art src/content/styleLive/acts-f.ts with his
// chains to the sky, src/game/skyChains.ts); this fight's own art is src/content/art/titanFight.ts. Zeus's fight and
// the rest of the Tartarus set are in ./kratos.ts.
//
// Three phases on every heat (numbers are Regular; Mild is gentler, Hot and up harsher):
// - TIME EATER: every 11 s (14 once he's devouring) the great hourglass flips. Smash it (4 smacks) in 6 s, or he eats
//   the time: your peel slows for 4 s, every foot hurries ×1.35 and he heals 3% (not on Mild). Smashed, he's
//   stunned 1.8 s and takes 4% of his health. It keeps coming in phase 2 and in his shield (phase 3, part B).
// - DEVOUR (phase 2): every 13 s his one enormous stone Titan HEAD rises out of the lava pit behind a pizza (he claims
//   its lane and holds himself over at the far side), opens its mouth at the table's back edge and inhales: the pizza
//   slides back along the table into its mouth (./titanDevour.ts). Whack the head 6 times (Mild 4, Extra Hot and up 8)
//   in the 6.5 s (heat-scaled) from its first breath to the gulp and it chokes: the pizza springs back, he's stunned
//   2 s and takes 5% of his health (not through his forcefield). Too slow and it gulps half the pizza's slices (never
//   the last on Mild) and spits the rest back.
// - TITAN UNCHAINED (phase 3), part A, THE CHAIN PULL: the moment it starts no other feet come and those on the
//   table flee. He plants himself in the middle of the table and hauls on two of his sky chains for 30 s (Mild 40,
//   Hot 27, Extra Hot and up 24), no other moves, while Tartarus crumbles round him: the walls shake and crack, dust
//   falls, and every 3.5 s (heat-scaled) a rock breaks off the roof over a random pizza (its shadow grows on the
//   pizza ~2 s before it lands; 3 smacks break it in the air; landing it takes a slice, 2 from Extra Hot, never the
//   last on Mild). Each chain has a red-hot weak link in its middle: 25 smacks (Mild 16, Hot 28, Extra Hot and up 32)
//   snap it. He can't be hurt meanwhile. Both still whole when time runs out: he rips a chain out of the wall and
//   drags it along the table, crushing every pizza (the run ends the normal way, unless a perk brings pizzas back;
//   then the pull starts over with the links as damaged as they were).
// - Part B, THE SHIELD: both chains broken, he roars and raises a forcefield. He sits in the middle, untouchable;
//   only Skeleton Hoplites come; TIME EATER and DEVOUR come back. Every ~9 s a broken chain swings down beside him,
//   left and right in turn, a forged blade on its end. Smack the blade 5 times (Mild 4, Extra Hot and up 6) in the
//   4 s it hangs there and it's driven through the shield: 6% of his health, and the shield is down for 6 s (hit him
//   normally), then it comes back. Until he dies.
//
// Gameplay rolls use the game's seeded Math.random (rnd()); everything only for show uses crand().

import { FOOT_BY_ID } from '../../data/feet';
import { warmLive } from '../liveKit';
import Phaser from 'phaser';
import { H, W } from '../../config';
import { TF, titanFightArt } from '../../content/art/titanFight';
import { buildHeadTextures } from '../../content/art/titanHead';
import { LINK_LEN, SKY_LINK_K, TITAN_SKY_RING } from '../../content/style/acts-f-3';
import { crand } from '../../systems/cosmeticRandom';
import type { Arena } from '../arena';
import { addCanvas } from '../assets';
import type { Foot } from '../Foot';
import type { Pizza } from '../Pizza';
import { skyChainsOf } from '../skyChains';
import { type Brain, type Prop, Every, heat, hitProp, rnd } from './kit';
import { HEAD_HALF, HEAD_X, startDevour, type Devour } from './titanDevour';
import { Bin, SAFE_TOP, enterArena, entrance, hitSoft, leaveArena, once, shatter, timerRing } from './nzkit';

type Pt = [number, number];
type Img = Phaser.GameObjects.Image;

const pm = () => crand() * 2 - 1;
const TAU = Math.PI * 2;
/** Where he plants himself for TITAN UNCHAINED (his sole). */
const SEAT: Pt = [W / 2, 800];
/** The chains he hauls on are hauled out sideways to the walls, off the sides of the screen. */
const PULL_ANCHOR = (s: number): Pt => [W / 2 + s * (W / 2 + 260), 320];
/** Each chain's weak link sits where the chain crosses this x (its middle on screen). */
const WEAK_X = (s: number) => W / 2 + s * (W / 2 - 420);
/** The broken chains swing from here (above the screen) and hang with their blades beside him. */
const SWING_ANCHOR = (s: number): Pt => [W / 2 + s * 630, -420];
const SWING_LEN = 1000;
/** His forcefield's radius and how far above his middle it's centred: sized to his foot (255 and 60 at scale 1.5). */
const domeR = (f: Foot) => 255 * (f.type.scale / 1.5);
const domeDy = (f: Foot) => 60 * (f.type.scale / 1.5);
/** Where he holds himself (phase 2) while his head is up: over at the far side of the table. */
const HELD_X = 430;
/** …and how low (his hover point: his sole sits just above the table's back edge). */
const HELD_Y = 690;

// ——— per-heat numbers (index: Mild, Regular, Hot, Extra Hot, Inferno) ———
const PULL_SEC = [40, 30, 27, 24, 24];
const WEAK_HP = [16, 25, 28, 32, 32];
const HEAD_HITS = [4, 6, 6, 8, 8];
const BLADE_HITS = [4, 5, 5, 6, 6];
const BLADE_WINDOW = [5, 4, 4, 3.6, 3.4];
const SWING_EVERY = [11, 9, 8.5, 8, 7.5];
/** Seconds to pierce his raised shield before he slams the table (Mild … Inferno): about three blades' worth. */
const SHIELD_WINDOW = [40, 32, 30, 28, 26];
/** A blade missed (it swung away untouched): the next one comes this soon. */
const MISS_NEXT = 2.5;
const HOPLITES = [2, 3, 3, 4, 4];

/** The Regular-normalised heat scaling: heat()'s tables put Regular at ×1.2 on cooldowns and wind-ups, so the
 * spec's Regular numbers go through these. */
const cool = (a: Arena, sec: number) => (heat(a).cooldown(sec) / 1.2);
const wind = (a: Arena, sec: number) => (heat(a).windup(sec) / 1.2);

/** The fight's textures, drawn the first time they're needed (one per frame from the fight's start, or all at once). */
function ensureArt(a: Arena, one = false): boolean {
  for (const [k, draw] of Object.entries(titanFightArt()))
    if (!a.sc.textures.exists(k)) {
      addCanvas(a.sc, k, draw());
      if (one) return false;
    }
  return true;
}

/** A sand burst: golden grains fly up and fall. */
function sandBurst(a: Arena, x: number, y: number, n = 22): void {
  for (let i = 0; i < n; i++) {
    const d = a.sc.add.image(x, y, 'soft').setTint([0xffd27a, 0xf0c860, 0xffe8a8][Math.floor(crand() * 3)]).setScale(0.05 + crand() * 0.06).setBlendMode(Phaser.BlendModes.ADD);
    a.fxLayer.add(d);
    const vx = pm() * 350;
    const vy = -200 - crand() * 500;
    const st = { t: 0 };
    a.sc.tweens.add({
      targets: st,
      t: 1,
      duration: 900 + crand() * 400,
      onUpdate: () => d.setPosition(x + vx * st.t, y + vy * st.t + 900 * st.t * st.t).setAlpha(1 - st.t),
      onComplete: () => d.destroy(),
    });
  }
}

/** Bits fly off and tumble (stone chips, iron, shards of the shield). */
function debris(a: Arena, x: number, y: number, key: string, n: number, o: { tints?: number[]; scale?: number; spread?: number; up?: number; layer?: Phaser.GameObjects.Container } = {}): void {
  for (let i = 0; i < n; i++) {
    const img = a.sc.add.image(x, y, key).setScale((o.scale ?? 0.5) * (0.6 + crand() * 0.7)).setAngle(crand() * 360);
    if (o.tints) img.setTint(o.tints[i % o.tints.length]);
    (o.layer ?? a.fxLayer).add(img);
    const vx = pm() * (o.spread ?? 650);
    const vy = -(o.up ?? 320) - crand() * 600;
    const spin = pm() * 600;
    const st = { t: 0 };
    a.sc.tweens.add({
      targets: st,
      t: 1.4,
      duration: 1400,
      onUpdate: () => {
        img.setPosition(x + vx * st.t, y + vy * st.t + 1000 * st.t * st.t);
        img.angle += spin * 0.016;
        img.setAlpha(Math.min(1, (1.4 - st.t) * 2));
      },
      onComplete: () => img.destroy(),
    });
  }
}

/** A hit counter (the kit's badge style): a dark disc with the number and a pulsing ring, kept clear of the HUD. */
function counter(a: Arena, at: () => Pt | null, n: number, color = 0xffd23f) {
  const badge = a.sc.add.container(0, 0);
  const pulse = a.sc.add.circle(0, 0, 36, color, 0).setStrokeStyle(5, color, 0.9);
  const disc = a.sc.add.circle(0, 0, 36, 0x2a1810, 0.94).setStrokeStyle(5, 0xfff6e2);
  const txt = a.sc.add.text(0, 1, String(n), { fontFamily: 'Lilita One, Fredoka, sans-serif', fontSize: '44px', color: '#fff6e2' }).setOrigin(0.5);
  badge.add([pulse, disc, txt]);
  a.sc.tweens.add({ targets: pulse, scale: { from: 1, to: 1.6 }, alpha: { from: 0.9, to: 0 }, duration: 900, repeat: -1 });
  a.fxLayer.add(badge);
  const place = () => {
    const p = at();
    if (!p) return;
    const bx = Phaser.Math.Clamp(p[0], 50, W - 50);
    badge.setPosition(bx, Math.max(p[1], bx > 470 && bx < 1450 ? 250 : 165));
  };
  place();
  const ev = a.sc.time.addEvent({ delay: 16, loop: true, callback: place });
  return {
    set(v: number) {
      txt.setText(String(Math.max(0, v)));
      a.sc.tweens.add({ targets: badge, scale: { from: 1.35, to: 1 }, duration: 160 });
    },
    destroy() {
      ev.remove();
      badge.destroy();
    },
  };
}

/** Points along a quadratic curve from p0 through control c to p1, laid out by arc length. */
function curve(p0: Pt, c: Pt, p1: Pt, n = 24): { pts: Pt[]; cum: number[] } {
  const pts: Pt[] = [];
  const cum: number[] = [0];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]);
    if (i) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  return { pts, cum };
}

/** A point at arc length s along a laid curve, and the direction there. */
function along(cv: { pts: Pt[]; cum: number[] }, s: number): { x: number; y: number; ang: number } {
  const { pts, cum } = cv;
  let i = 1;
  while (i < pts.length - 1 && cum[i] < s) i++;
  const a = pts[i - 1];
  const b = pts[i];
  const l = cum[i] - cum[i - 1] || 1;
  const t = Phaser.Math.Clamp((s - cum[i - 1]) / l, 0, 1);
  return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}

/** A chain the fight draws itself (the same links as his sky chains, so it doesn't need his live art): links laid
 * along a curve, face-on and edge-on in turn. */
class LinkRun {
  readonly box: Phaser.GameObjects.Container;
  private faces: Phaser.GameObjects.Container;
  private edges: Phaser.GameObjects.Container;
  private links: Img[] = [];
  private cv: { pts: Pt[]; cum: number[] } = { pts: [[0, 0], [0, 0]], cum: [0, 0] };
  constructor(
    private a: Arena,
    /** World px per design unit (the foot's size). */
    private k: number,
    layer: Phaser.GameObjects.Container,
    front = true,
  ) {
    this.box = a.sc.add.container(0, 0);
    this.faces = a.sc.add.container(0, 0);
    this.edges = a.sc.add.container(0, 0);
    this.box.add([this.faces, this.edges]);
    if (front) layer.add(this.box);
    else layer.addAt(this.box, 0);
  }
  get pitch(): number {
    return LINK_LEN * SKY_LINK_K * 0.78 * this.k;
  }
  get length(): number {
    return this.cv.cum[this.cv.cum.length - 1];
  }
  /** Lay it from p0 to p1, sagging by `sag` px (perpendicular, down) and shaken by `shake` px. */
  lay(p0: Pt, p1: Pt, sag = 0, shake = 0): void {
    const mx = (p0[0] + p1[0]) / 2;
    const my = (p0[1] + p1[1]) / 2;
    this.cv = curve(p0, [mx + (shake ? pm() * shake : 0), my + sag + (shake ? pm() * shake : 0)], p1);
    const total = this.length;
    const count = Math.max(1, Math.floor(total / this.pitch));
    const step = total / count;
    while (this.links.length < count) {
      const face = this.links.length % 2 === 0;
      const img = this.a.sc.add.image(0, 0, face ? 'tk_linkF' : 'tk_linkE');
      (face ? this.faces : this.edges).add(img);
      this.links.push(img);
    }
    const sc = (this.k / 2) * (step / this.pitch);
    for (let j = 0; j < this.links.length; j++) {
      const img = this.links[j];
      if (j >= count) {
        img.setVisible(false);
        continue;
      }
      const p = along(this.cv, (j + 0.5) * step);
      img.setVisible(true).setPosition(p.x, p.y).setRotation(p.ang).setScale(sc);
    }
  }
  /** The point at arc fraction t (0 at p0) of the last lay. */
  at(t: number): { x: number; y: number; ang: number } {
    return along(this.cv, t * this.length);
  }
  /** The fraction along it closest to x. */
  tAtX(x: number): number {
    const { pts, cum } = this.cv;
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const d = Math.abs(pts[i][0] - x);
      if (d < bd) {
        bd = d;
        best = cum[i];
      }
    }
    return best / (this.length || 1);
  }
  /** Distance from a point to the chain. */
  dist(x: number, y: number): number {
    let d = Infinity;
    const { pts } = this.cv;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      const l2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1;
      const t = Phaser.Math.Clamp(((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / l2, 0, 1);
      d = Math.min(d, Math.hypot(x - ax - (bx - ax) * t, y - ay - (by - ay) * t));
    }
    return d;
  }
  destroy(): void {
    this.box.destroy();
  }
}

// ——— the brain ———

type PartA = {
  part: 'A';
  /** Seconds left on the pull, and the full pull. */
  left: number;
  total: number;
  rockT: number;
  heaveT: number;
  heaveSide: number;
  failing: boolean;
};
type PartB = { part: 'B'; shield: boolean; downT: number; swingT: number; nextSide: number; hopT: number; win: number };
type P3 = { part: 'enter' } | PartA | PartB;

interface Pull {
  s: number;
  run: LinkRun;
  anchor: Pt;
  hp: number;
  max: number;
  broken: boolean;
  /** Where the weak link is now, and its look. */
  wx: number;
  wy: number;
  weak: Img;
  glow: Img;
  /** An additive copy of the link: it burns molten, pulsing. */
  hot: Img;
  ring: Phaser.GameObjects.Graphics;
  badge: ReturnType<typeof counter>;
  shake: number;
  /** The broken stub hanging from his shackle: a pendulum. */
  stub: { run: LinkRun; th: number; w: number } | null;
  /** Dropping away with him as he dies (it destroys itself). */
  fading?: boolean;
}

interface Head {
  dev: Devour;
  p: Pizza;
  /** Break it off (the head sinks, the pizza goes back). */
  end: () => void;
}

const titanking = (): Brain => {
  const bin = new Bin();
  const start = once();
  const hourT = new Every(11, 3.5);
  const devourT = new Every(13, 3);
  let glass: { prop: Prop; x: number; end: () => void } | null = null;
  let bite: Head | null = null;
  let quipT = 9;
  let landed = false;
  let artReady = false;
  /** Our own damage (a spat-out pizza, a pierce): let it through the shield and his invulnerability. */
  let letThrough = false;
  let p3: P3 | null = null;
  let wantP3 = false;
  let spawnsHeld = false;
  let hopT = 3;
  const pulls: Pull[] = [];
  let swing: { end: (quiet?: boolean) => void } | null = null;
  let dome: { img: Img; sheen: Img; ring: Phaser.GameObjects.Graphics; up: boolean; destroy: () => void } | null = null;
  let crumble: { stop: (fade: boolean) => void } | null = null;
  let timerUi: { update: (left: number, total: number) => void; destroy: () => void } | null = null;
  /** The shield's countdown (part B): pierce it before it runs out or he slams the table. */
  let shieldUi: { update: (left: number, total: number) => void; destroy: () => void } | null = null;
  let blockQuipAt = 0;
  /** Laid the pull chains over his live sky chains (hidden while the fight draws them). */
  let hidSky = false;

  const hurt = (f: Foot, a: Arena, frac: number) => {
    if (!f.alive) return;
    const was = f.shielded;
    letThrough = true;
    f.shielded = false;
    a.damageFoot(f, f.maxHp * frac);
    letThrough = false;
    if (f.alive && Number(f.brain.transformT ?? 0) <= 0) f.shielded = was;
  };
  /** His forcefield is up (the shield part of TITAN UNCHAINED): only a pierced shield lets damage through. */
  const domeUp = () => p3?.part === 'B' && p3.shield;
  const bigQuip = (a: Arena, f: Foot, msg: string, color = '#ffd27a', size = 40) => a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 190), msg, color, size);
  const scene = (a: Arena) => a as unknown as { backdrop?: { quake?(px: number, kick?: number): void } };
  const quake = (a: Arena, px: number, kick = 0) => scene(a).backdrop?.quake?.(px, kick);
  const linkK = (f: Foot) => f.type.scale * Math.max(0.2, f.root.scaleX);
  const ringAt = (f: Foot, s: number): Pt => {
    const [dx, dy] = TITAN_SKY_RING(s);
    return f.styleWorld(dx, dy);
  };

  // ——— TIME EATER ———
  const flipGlass = (f: Foot, a: Arena) => {
    const h = heat(a);
    const sec = h.windup(6);
    // beside him, on the side with room (in the middle of the table, either side)
    const side = f.x < W / 2 - 40 ? 1 : f.x > W / 2 + 40 ? -1 : Math.random() < 0.5 ? -1 : 1;
    const x = Phaser.Math.Clamp(f.x + side * 420, 240, W - 240);
    const y = SAFE_TOP + 190;
    a.sfx('sfx_titanking_flip');
    a.quip(x, y - 150, 'TICK… TOCK…', '#ffd27a', 42);
    const t0 = a.now();
    let done = false;
    const prop = hitProp(a, {
      key: 'p_nz_hourglass',
      x,
      y,
      scale: 0.72,
      hits: h.hits(4),
      // (the whole timer ring, radius 140, counts)
      r: 160,
      sec,
      badgeDy: -140,
      label: 'TIME SHATTERED!',
      hitSfx: 'sfx_titanking_jawhit',
      clearSfx: 'sfx_titanking_shatter',
      onClear: () => {
        finish();
        sandBurst(a, x, y, 30);
        debris(a, x, y, 'shard', 8, { scale: 0.7, tints: [0xdff0ff, 0xffd27a] });
        if (!f.alive) return;
        f.stun(h.stun(1.8));
        // (behind his forcefield he's only stunned: no damage gets through the dome)
        if (domeUp()) a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 140), 'THE SHIELD HOLDS!', '#9ad8ff', 34);
        else hurt(f, a, 0.04);
        bigQuip(a, f, 'MY TIME!', '#ff8a6a');
      },
      onFail: () => {
        finish();
        if (!a.inWave() || !f.alive) return;
        const s = h.stun(4);
        a.slowPeel(s);
        a.hurry(1.35, s);
        a.sfx('sfx_titanking_slow');
        a.flash(320, 240, 200, 120);
        sandBurst(a, x, y, 18);
        const pp = a.peelPoint();
        a.quip(pp.x, pp.y - 90, 'TIME EATEN!', '#ffd27a', 46);
        if (h.rank > 0) f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.03);
      },
    });
    // it flips over as it arrives, then ticks; a ring of sand counts the time down
    prop.img.setAngle(180);
    a.sc.tweens.add({ targets: prop.img, angle: 0, duration: 520, ease: 'Back.Out' });
    const ticks = a.sc.time.addEvent({ delay: 500, loop: true, callback: () => a.sfx('sfx_titanking_tick', { volume: 0.8, throttle: 100 }) });
    const ring = timerRing(a, () => (done ? null : { x, y }), 140, 0xffd27a, () => 1 - (a.now() - t0) / sec);
    const forget = bin.add(() => {
      done = true;
      ticks.remove();
      ring();
      prop.destroy();
      glass = null;
    });
    const finish = () => {
      done = true;
      ticks.remove();
      ring();
      forget();
      glass = null;
    };
    glass = { prop, x, end: forget };
  };

  // ——— DEVOUR: his Titan head rises out of the lava behind a pizza and inhales it (./titanDevour.ts) ———
  const startBite = (f: Foot, a: Arena) => {
    const h = heat(a);
    const ps = a.alivePizzas();
    // not under the hourglass; in his shield, not in the middle (he sits there)
    // (the head is ~1200 px wide: keep it clear of an hourglass that's already up)
    let pool = ps.filter((q) => !glass || Math.abs(HEAD_X(q.x) - glass.x) > HEAD_HALF + 120);
    if (p3) pool = pool.filter((q) => Math.abs(q.x - SEAT[0]) > 280);
    const p = rnd(pool.length ? pool : ps);
    if (!p) return;
    // he claims its lane (not the last pizza's: other feet must still be able to reach it)
    const claim = ps.length > 1;
    if (claim) a.lockLane(p, true);
    // his head owns that lane: any foot already in it is gone in a puff (and none are sent there while it's up)
    for (const o of a.allFeet())
      if (o !== f && o.alive && !o.isBossLike && (o.target === p || Math.abs((o.laneX ?? o.x) - p.x) < 170)) {
        a.fx.puff(o.x, o.cy, 6);
        o.die();
      }
    // in phase 2 he holds back at the top of the far side while his head does the eating
    const held = !p3;
    const prevLane = f.laneX;
    const prevHover = f.hoverY;
    if (held) {
      f.pinned = true;
      f.laneX = p.x > W / 2 ? HELD_X : W - HELD_X;
      // (held low enough that the whole of his big foot shows, shackle and all, under the HUD)
      f.hoverY = HELD_Y;
    }
    let unlist = () => {};
    const b: Head = {
      p,
      end: () => b.dev.abort(),
      dev: startDevour(a, {
        p,
        boss: f,
        hits: HEAD_HITS[h.rank],
        sec: wind(a, 6.5),
        take: () => (h.rank === 0 ? Math.min(Math.ceil(p.slices / 2) + h.slices(0), p.slices - 1) : Math.ceil(p.slices / 2) + h.slices(0)),
        onChoked: () => {
          if (!f.alive) return;
          f.stun(h.stun(2));
          // (behind his forcefield he's only stunned: no damage gets through the dome)
          if (domeUp()) a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 140), 'THE SHIELD HOLDS!', '#9ad8ff', 34);
          else hurt(f, a, 0.05);
          bigQuip(a, f, 'HKKK… PTOO!');
        },
        onGulp: (n) => hitSoft(a, p, n, 'DEVOURED!', '#ff8a6a'),
        onDone: () => {
          unlist();
          if (bite === b) bite = null;
          if (claim) a.lockLane(p, false);
          if (held && f.alive) {
            f.pinned = false;
            f.laneX = prevLane;
            f.hoverY = prevHover;
          }
        },
        counter: (at, n) => counter(a, at, n),
        debris: (x, y) => debris(a, x, y, 'shard', 4, { scale: 0.55, tints: [0x8e8a84, 0x5c5852], layer: a.fxLayer }),
        quake: (px, kick) => quake(a, px, kick),
      }),
    };
    bite = b;
    unlist = bin.add(() => b.end());
  };

  // ——— TITAN UNCHAINED, part A: the chain pull ———
  const enterP3 = (f: Foot, a: Arena) => {
    p3 = { part: 'enter' };
    ensureArt(a);
    bite?.end();
    glass?.end();
    f.target = null;
    f.pinned = false;
    f.puppet = true;
    f.brain.wasShielded = true;
    f.shielded = true;
    // every other foot flees the Titan; none come while he's unchained
    let fled = 0;
    for (const o of a.allFeet())
      if (o !== f && o.alive && !o.isBossLike) {
        a.fx.puff(o.x, o.cy, 6);
        o.die();
        fled++;
      }
    if (fled) a.quip(W / 2, SAFE_TOP + 90, 'THEY FLEE THE TITAN!', '#ffd27a', 40);
    // he strides to the middle of the table and plants himself
    a.sc.tweens.killTweensOf(f);
    a.sc.tweens.add({ targets: f, x: SEAT[0], y: SEAT[1], duration: 1300, ease: 'Sine.InOut' });
    a.sfx('sfx_titanking_chain');
    bigQuip(a, f, 'I WILL TEAR TARTARUS DOWN!', '#ffd27a', 42);
    // his two front sky chains: the fight draws them from here on (his live art's are hidden)
    const sky = skyChainsOf(f);
    for (const s of [-1, 1]) {
      const run = new LinkRun(a, linkK(f), a.fxLayer, false);
      const r0 = ringAt(f, s);
      // they start where his sky chains hang (straight up out of the screen) and are hauled out to the sides
      const anchor: Pt = [r0[0] + s * 220, -320];
      const weak = a.sc.add.image(0, 0, 'tk_weak0').setScale(TF.weak.px / TF.RES).setAlpha(0);
      const glow = a.sc.add.image(0, 0, 'glow').setTint(0xff5a1a).setBlendMode(Phaser.BlendModes.ADD).setScale(1.3).setAlpha(0);
      const hot = a.sc.add.image(0, 0, 'tk_weak0').setScale(TF.weak.px / TF.RES).setBlendMode(Phaser.BlendModes.ADD).setTint(0xff8a3a).setAlpha(0);
      const ring = a.sc.add.graphics();
      a.fxLayer.add([glow, weak, hot, ring]);
      const hp = WEAK_HP[heat(a).rank];
      const pull: Pull = { s, run, anchor, hp, max: hp, broken: false, wx: 0, wy: 0, weak, glow, hot, ring, badge: null as never, shake: 0, stub: null };
      pulls.push(pull);
      const to = PULL_ANCHOR(s);
      const st = { x: anchor[0], y: anchor[1] };
      a.sc.tweens.add({ targets: st, x: to[0], y: to[1], duration: 1300, ease: 'Quad.InOut', onUpdate: () => ((pull.anchor[0] = st.x), (pull.anchor[1] = st.y)) });
    }
    if (sky) {
      sky.setHidden(0, true);
      sky.setHidden(1, true);
      sky.setTension(1);
      hidSky = true;
    }
    bin.add(() => {
      for (const p of pulls) {
        if (!p.fading) p.run.destroy();
        p.weak.destroy();
        p.glow.destroy();
        p.hot.destroy();
        p.ring.destroy();
        p.badge?.destroy();
        if (!p.fading) p.stub?.run.destroy();
      }
      pulls.length = 0;
    });
    a.sc.time.delayedCall(1400, () => f.alive && p3?.part === 'enter' && beginPull(f, a));
  };

  const beginPull = (f: Foot, a: Arena) => {
    const h = heat(a);
    const total = PULL_SEC[h.rank];
    p3 = { part: 'A', left: total, total, rockT: 2, heaveT: 0.4, heaveSide: -1, failing: false };
    a.bossMove(f, 'THE CHAIN PULL', PULL_INFO);
    a.sfx('sfx_titanking_strain');
    a.shake(400, 0.008);
    // the weak links light up, with their counters
    for (const p of pulls) {
      if (p.broken) continue;
      a.sc.tweens.add({ targets: [p.weak, p.glow], alpha: 1, duration: 300 });
      p.hot.setAlpha(0);
      p.badge = counter(a, () => (p.broken ? null : [p.wx, p.wy + 128]), p.hp, 0xff8a3a);
      a.quip(p.wx, p.wy - 80, 'SMASH THE LINK!', '#ffb070', 34);
    }
    startCrumble(a);
    timerUi = pullTimer(a);
    bin.add(() => {
      timerUi?.destroy();
      timerUi = null;
    });
    if (!pullsHit) wirePulls(f, a);
  };

  /** The smacks on the chains: the weak link counts down, anywhere else on the chain just clanks. */
  let pullsHit = false;
  const wirePulls = (f: Foot, a: Arena) => {
    pullsHit = true;
    for (const p of pulls) {
      a.addClickable({
        get x() {
          return p.wx;
        },
        get y() {
          return p.wy;
        },
        r: 105,
        priority: 2,
        alive: () => !p.broken && p3?.part === 'A' && !p3.failing,
        hit: () => hitWeak(f, a, p),
      });
      let clankAt = 0;
      a.addClickable({
        get x() {
          return p.run.at(0.5).x;
        },
        get y() {
          return p.run.at(0.5).y;
        },
        r: 0,
        priority: 1,
        contains: (x, y) => p.run.dist(x, y) < 44,
        alive: () => !p.broken && p3?.part === 'A' && !p3.failing,
        hit: () => {
          a.sfx('sfx_titanking_chainhit', { volume: 0.6, throttle: 100 });
          p.shake = Math.max(p.shake, 0.4);
          if (a.now() - clankAt > 1.2) {
            clankAt = a.now();
            a.quip(p.wx, p.wy - 90, 'HIT THE GLOWING LINK!', '#ffb070', 30);
          }
        },
      });
    }
  };

  const hitWeak = (f: Foot, a: Arena, p: Pull) => {
    if (p.broken || p3?.part !== 'A' || p3.failing) return;
    p.hp--;
    p.badge?.set(p.hp);
    p.shake = 1;
    const k = p.hp / p.max;
    p.weak.setTexture(k > 0.75 ? 'tk_weak0' : k > 0.5 ? 'tk_weak1' : k > 0.25 ? 'tk_weak2' : 'tk_weak3');
    p.hot.setTexture(p.weak.texture.key);
    p.weak.setTintFill(0xffffff);
    a.sc.time.delayedCall(60, () => p.weak.active && p.weak.clearTint());
    a.sc.tweens.add({ targets: p.weak, scale: { from: (TF.weak.px / TF.RES) * 1.25, to: TF.weak.px / TF.RES }, duration: 160, ease: 'Quad.Out' });
    a.fx.impact(p.wx, p.wy, p.hp <= 0);
    debris(a, p.wx, p.wy, 'soft', 5, { tints: [0xffb040, 0xff6a1a], scale: 0.12, spread: 500, up: 200 });
    if (p.hp > 0) return void a.sfx('sfx_titanking_weakhit', { throttle: 50 });
    breakChain(f, a, p);
  };

  const breakChain = (f: Foot, a: Arena, p: Pull) => {
    p.broken = true;
    p.badge?.destroy();
    p.ring.clear();
    a.sfx('sfx_titanking_weakbreak');
    a.flash(160, 255, 200, 140);
    a.shake(420, 0.014);
    a.rumble(0.9, 300);
    a.fx.explosion(p.wx, p.wy, 110);
    debris(a, p.wx, p.wy, 'tk_linkE', 6, { scale: 0.6, spread: 900 });
    a.quip(p.wx, p.wy - 90, 'SNAPPED!', '#7dff9a', 50);
    p.weak.destroy();
    p.glow.destroy();
    p.hot.destroy();
    // the far end whips away into the wall; the near end swings down and dangles from his shackle
    const k = linkK(f);
    const whip = new LinkRun(a, k, a.fxLayer, false);
    const from: Pt = [p.wx, p.wy];
    const anc = p.anchor;
    const st = { t: 0 };
    a.sc.tweens.add({
      targets: st,
      t: 1,
      duration: 520,
      ease: 'Quad.In',
      onUpdate: () => {
        const e: Pt = [from[0] + (anc[0] - from[0]) * st.t, from[1] + (anc[1] - from[1]) * st.t - Math.sin(st.t * Math.PI) * 160];
        whip.lay(e, anc, 30 * (1 - st.t), 6);
      },
      onComplete: () => whip.destroy(),
    });
    const r0 = ringAt(f, p.s);
    const th0 = Math.atan2(p.wx - r0[0], p.wy - r0[1]);
    p.run.destroy();
    p.stub = { run: new LinkRun(a, k, a.fxLayer, false), th: th0, w: 0 };
    // he lurches as it gives
    a.sc.tweens.killTweensOf(f);
    a.sc.tweens.add({ targets: f, x: SEAT[0] - p.s * 46, duration: 160, yoyo: true, ease: 'Quad.Out', onComplete: () => (f.x = SEAT[0]) });
    bigQuip(a, f, pulls.every((q) => q.broken) ? 'NO! NOOO!' : 'GRRRAAH!', '#ff8a6a', 44);
    if (pulls.every((q) => q.broken)) a.sc.time.delayedCall(700, () => f.alive && beginShield(f, a));
  };

  // ——— the walls crumble ———
  const startCrumble = (a: Arena) => {
    if (crumble) return;
    quake(a, 2.5, 6);
    const g = a.sc.add.graphics();
    a.underLayer.addAt(g, 0);
    const motes = a.sc.add.container(0, 0);
    a.underLayer.addAt(motes, 1);
    // cracks: they start at a few places on the walls and branch out as he pulls
    type Crack = { x: number; y: number; ang: number; w: number; n: number };
    const cracks: Crack[] = [];
    const seedCrack = () => {
      const s = crand() < 0.5 ? -1 : 1;
      cracks.push({ x: W / 2 + s * (240 + crand() * 680), y: 60 + crand() * 440, ang: crand() * TAU, w: 9, n: 0 });
    };
    for (let i = 0; i < 6; i++) seedCrack();
    let crackT = 0;
    let moteT = 0;
    let pebT = 0;
    let rumbleT = 0;
    const tick = (_t: number, delta: number) => {
      const dt = Math.min(0.05, delta / 1000);
      crackT -= dt;
      if (crackT <= 0 && p3?.part === 'A') {
        crackT = 0.12;
        if (crand() < 0.08 && cracks.length < 18) seedCrack();
        const c = cracks[Math.floor(crand() * cracks.length)];
        if (c && c.n < 16) {
          const len = 14 + crand() * 22;
          c.ang += pm() * 0.7;
          const x1 = c.x + Math.cos(c.ang) * len;
          const y1 = Phaser.Math.Clamp(c.y + Math.sin(c.ang) * len, 20, 540);
          // a dark groove split into the stone, a lit lip on its top edge, the glow deep inside
          g.lineStyle(c.w + 6, 0x050203, 0.95).lineBetween(c.x, c.y, x1, y1);
          g.lineStyle(2, 0x8a7a6a, 0.45).lineBetween(c.x - 1, c.y - (c.w + 4) / 2, x1 - 1, y1 - (c.w + 4) / 2);
          g.lineStyle(Math.max(1.2, c.w * 0.35), 0xff7a1a, 0.9).lineBetween(c.x, c.y, x1, y1);
          if (c.n % 5 === 0) {
            g.fillStyle(0xffb050, 0.6).fillCircle(x1, y1, c.w * 0.4);
            a.fx.puff(x1, y1, 1);
          }
          c.x = x1;
          c.y = y1;
          c.n++;
          c.w = Math.max(2, c.w - 0.2);
          if (crand() < 0.15) cracks.push({ x: x1, y: y1, ang: c.ang + pm() * 1.6, w: c.w * 0.7, n: c.n });
        }
      }
      // dust sifting down everywhere, pebbles now and then
      moteT -= dt;
      while (moteT <= 0) {
        moteT += 0.045;
        const m = a.sc.add.image(crand() * W, -10, 'soft').setTint(crand() < 0.5 ? 0xb8a890 : 0x8a7a68).setScale(0.03 + crand() * 0.05).setAlpha(0.5 + crand() * 0.4);
        motes.add(m);
        a.sc.tweens.add({ targets: m, y: 600 + crand() * 300, x: m.x + pm() * 60, alpha: 0, duration: 2400 + crand() * 1600, onComplete: () => m.destroy() });
      }
      pebT -= dt;
      if (pebT <= 0) {
        pebT = 0.25 + crand() * 0.4;
        const x = crand() * W;
        const pb = a.sc.add.image(x, -10, 'shard').setTint(0x4a4448).setScale(0.3 + crand() * 0.4).setAngle(crand() * 360);
        motes.add(pb);
        a.sc.tweens.add({ targets: pb, y: 700 + crand() * 80, angle: pb.angle + pm() * 400, duration: 900 + crand() * 400, ease: 'Quad.In', onComplete: () => pb.destroy() });
      }
      rumbleT -= dt;
      if (rumbleT <= 0 && p3?.part === 'A') {
        rumbleT = 3.6 + crand() * 1.4;
        a.sfx('sfx_titanking_crumble', { volume: 0.85, throttle: 800 });
        quake(a, 2.5, 7);
      }
    };
    a.sc.events.on('update', tick);
    const stop = (fade: boolean) => {
      a.sc.events.off('update', tick);
      a.sc.events.off('shutdown', halt);
      quake(a, 0);
      crumble = null;
      const done = () => {
        g.destroy();
        motes.destroy();
      };
      if (fade) a.sc.tweens.add({ targets: [g, motes], alpha: 0, duration: 1600, onComplete: done });
      else done();
    };
    crumble = { stop };
    // (a scene shutting down mid-pull skips the fight's cleanup: don't leave the tick on the reused scene)
    const halt = () => crumble?.stop(false);
    a.sc.events.once('shutdown', halt);
    bin.add(() => crumble?.stop(false));
  };

  /** The pull's countdown: a stone tablet under the boss bar, a draining bar and big seconds, red near the end. */
  const pullTimer = (a: Arena, title = 'BREAK THE CHAINS') => {
    const c = a.sc.add.container(W / 2, 300);
    const w = 420;
    const plate = a.sc.add.graphics();
    const bar = a.sc.add.graphics();
    const label = a.sc.add.text(-w / 2 + 22, -2, title, { fontFamily: 'Lilita One, Fredoka, sans-serif', fontSize: '28px', color: '#ffe8c0', stroke: '#2a1810', strokeThickness: 6 }).setOrigin(0, 0.5);
    const num = a.sc.add.text(w / 2 - 22, -2, '30', { fontFamily: 'Lilita One, Fredoka, sans-serif', fontSize: '54px', color: '#ffd27a', stroke: '#2a1810', strokeThickness: 8 }).setOrigin(1, 0.5);
    plate.fillStyle(0x1a1210, 0.9).fillRoundedRect(-w / 2, -38, w, 76, 18).lineStyle(4, 0xc9873a, 1).strokeRoundedRect(-w / 2, -38, w, 76, 18);
    c.add([plate, bar, label, num]);
    a.fxLayer.add(c);
    c.setScale(0.4).setAlpha(0);
    a.sc.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 300, ease: 'Back.Out' });
    let lastWhole = -1;
    return {
      update(left: number, total: number) {
        const k = Phaser.Math.Clamp(left / total, 0, 1);
        const hot = left <= 10;
        bar.clear();
        bar.fillStyle(0x3a2418, 1).fillRoundedRect(-w / 2 + 16, 24, w - 32, 8, 4);
        bar.fillStyle(hot ? 0xff4a2a : 0xffc04a, 1).fillRoundedRect(-w / 2 + 16, 24, Math.max(8, (w - 32) * k), 8, 4);
        const whole = Math.ceil(left);
        if (whole !== lastWhole) {
          lastWhole = whole;
          num.setText(String(whole)).setColor(hot ? '#ff6a4a' : '#ffd27a');
          if (hot) {
            a.sc.tweens.add({ targets: num, scale: { from: 1.35, to: 1 }, duration: 220, ease: 'Quad.Out' });
            a.sfx('sfx_titanking_tick', { volume: left <= 5 ? 1.1 : 0.8, rate: left <= 5 ? 1.25 : 1 });
          }
        }
      },
      destroy() {
        a.sc.tweens.add({ targets: c, alpha: 0, scale: 0.6, duration: 260, onComplete: () => c.destroy() });
      },
    };
  };

  // ——— the rocks ———
  const dropRock = (a: Arena) => {
    const p = rnd(a.alivePizzas());
    if (!p) return;
    const h = heat(a);
    const x = p.x + pm() * 40;
    const ty = p.surfaceY - 46;
    const warn = 0.7;
    const fall = 2.1 * wind(a, 1);
    const RS = TF.rock.px / TF.RES;
    // it cracks loose out of the roof's dark just under the HUD band, a hot rim round it
    const top = x > 440 && x < 1480 ? 300 : 210;
    const img = a.sc.add.image(x, top - 90, 'tk_rock0').setScale(RS * 0.5).setAngle(pm() * 30).setAlpha(0);
    const rim = a.sc.add.image(x, top - 90, 'glow').setTint(0xff7a2a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.9).setAlpha(0);
    a.fxLayer.add([rim, img]);
    a.sc.tweens.add({ targets: img, alpha: 1, scale: RS, duration: 260, ease: 'Back.Out' });
    a.sc.tweens.add({ targets: rim, alpha: 0.75, duration: 260 });
    const rimEv = a.sc.time.addEvent({ delay: 16, loop: true, callback: () => rim.setPosition(img.x, img.y) });
    // its shadow on the pizza grows and darkens as it comes
    const sh = a.sc.add.ellipse(x, p.surfaceY + 6, 200, 70, 0x0a0406, 0.25).setScale(0.35).setStrokeStyle(5, 0xff6a3a, 0.95);
    a.fxLayer.addAt(sh, 0);
    a.sc.tweens.add({ targets: sh, scale: 1, fillAlpha: 0.65, duration: (warn + fall) * 1000, ease: 'Quad.In' });
    a.sfx('sfx_titanking_rockcrack', { throttle: 150 });
    debris(a, x, top - 90, 'shard', 4, { tints: [0x4a4448], scale: 0.4, spread: 200, up: 50 });
    // 2 hits (1 on Mild, 3 from Extra Hot); each one holds it in the air a moment
    let left = h.rank === 0 ? 1 : h.rank >= 3 ? 3 : 2;
    let live = true;
    let fallTw: Phaser.Tweens.Tween | null = null;
    const end = () => {
      live = false;
      rimEv.remove();
      rim.destroy();
      a.sc.tweens.killTweensOf(img);
      a.sc.tweens.killTweensOf(sh);
      a.sc.tweens.add({ targets: sh, alpha: 0, duration: 200, onComplete: () => sh.destroy() });
      forget();
    };
    const forget = bin.add(() => {
      if (!live) return;
      live = false;
      rimEv.remove();
      rim.destroy();
      img.destroy();
      sh.destroy();
    });
    // it breaks loose (wobbling down out of the roof), then drops
    a.sc.tweens.add({ targets: img, y: top, duration: warn * 1000, ease: 'Back.Out' });
    a.sc.tweens.add({ targets: img, angle: img.angle + 8, duration: 90, yoyo: true, repeat: 2 });
    a.sc.time.delayedCall(warn * 1000, () => {
      if (!live) return;
      a.sfx('sfx_titanking_rockfall', { throttle: 150 });
      a.sc.tweens.add({ targets: img, angle: img.angle + pm() * 160, duration: fall * 1000 });
      fallTw = a.sc.tweens.add({
        targets: img,
        y: ty,
        duration: fall * 1000,
        ease: 'Quad.In',
        onComplete: () => {
          if (!live) return;
          end();
          img.destroy();
          if (!a.inWave()) return;
          a.sfx('sfx_titanking_rockland');
          a.fx.explosion(x, ty + 20, 110);
          debris(a, x, ty, 'shard', 8, { tints: [0x5a5258, 0x3a3438], scale: 0.6 });
          a.shake(260, 0.01);
          quake(a, p3?.part === 'A' ? 2.5 : 0, 8);
          if (p.dead) return;
          if (h.rank === 0) hitSoft(a, p, 1, 'CRUSHED!', '#ff8a6a');
          else a.hitPizza(p, h.rank >= 3 ? 2 : 1, 'CRUSHED!', '#ff8a6a');
        },
      });
    });
    a.addClickable({
      get x() {
        return img.x;
      },
      get y() {
        return img.y;
      },
      r: 0,
      priority: 2,
      label: 'falling rock',
      // a generous target: it's moving, and it's the point of the moment
      contains: (px, py) => Math.abs(px - img.x) < 150 && Math.abs(py - img.y) < 160,
      alive: () => live,
      hit: () => {
        if (!live) return;
        left--;
        a.fx.impact(img.x, img.y, left <= 0);
        debris(a, img.x, img.y, 'shard', 3, { tints: [0x5a5258], scale: 0.4, spread: 400 });
        if (left > 0) {
          img.setTexture(left >= 2 ? 'tk_rock1' : 'tk_rock2');
          a.sfx('sfx_titanking_jawhit', { throttle: 50 });
          // the blow holds it up for a moment (the fall tween owns its y, so pause it rather than nudge it)
          if (fallTw?.isPlaying()) {
            fallTw.pause();
            a.sc.tweens.add({ targets: img, scale: { from: RS * 1.12, to: RS }, duration: 180 });
            a.sc.time.delayedCall(450, () => live && fallTw?.resume());
          }
          return;
        }
        end();
        a.sfx('sfx_titanking_rocksmash');
        a.quip(img.x, img.y - 70, 'SMASHED!', '#7dff9a', 36);
        debris(a, img.x, img.y, 'tk_rock2', 5, { scale: RS * 0.35, spread: 800 });
        debris(a, img.x, img.y, 'shard', 8, { tints: [0x5a5258, 0x3a3438, 0xff7a1a], scale: 0.5, spread: 900 });
        a.fx.puff(img.x, img.y, 8);
        img.destroy();
      },
    });
  };

  // ——— the pull runs out: he rips a chain out of the wall and drags it across the table ———
  const failPull = (f: Foot, a: Arena) => {
    if (p3?.part !== 'A') return;
    p3.failing = true;
    timerUi?.destroy();
    timerUi = null;
    const p = pulls.find((q) => !q.broken && q.s < 0) ?? pulls.find((q) => !q.broken);
    if (!p) return;
    a.dramatic(0.5);
    a.banner('TIME’S UP!', 'The Titan rips his chain from the wall', 'boss');
    a.sfx('sfx_titanking_rip');
    a.flash(140, 255, 70, 40);
    a.shake(900, 0.018);
    a.rumble(1, 700);
    quake(a, 4, 14);
    bigQuip(a, f, 'ALL TIME IS MINE!', '#ff6a4a', 52);
    // every target goes: there's nothing left to hit
    for (const q of pulls) {
      q.badge?.destroy();
      q.badge = null as never;
      q.ring.clear();
      q.weak.setVisible(false);
      q.glow.setVisible(false);
      q.hot.setVisible(false);
    }
    // the ripped chain runs behind him (it leaves from his side, not across his foot)
    a.underLayer.add(p.run.box);
    // the anchor tears out of the wall in a burst of rock
    const anc: Pt = [...p.anchor];
    debris(a, Phaser.Math.Clamp(anc[0], 20, W - 20), anc[1] + 40, 'tk_rock1', 6, { scale: (TF.rock.px / TF.RES) * 0.6, spread: 700 });
    // the ripped end (a chunk of the wall still on it) whips down off the side, then drags along the table, left to right
    const chunk = a.sc.add.image(anc[0], anc[1], 'tk_rock2').setScale((TF.rock.px / TF.RES) * 2.1);
    a.fxLayer.add(chunk);
    const e = { x: anc[0], y: anc[1] };
    const y0 = H - 70;
    const sx = p.s < 0 ? -200 : W + 200;
    const sx1 = p.s < 0 ? W + 260 : -260;
    const tick = () => {
      if (!chunk.active) return;
      chunk.setPosition(e.x, e.y);
      const r0 = ringAt(f, p.s);
      p.run.lay(r0, [e.x, e.y], Math.max(0, 260 - Math.abs(e.y - r0[1]) * 0.2), 4);
    };
    const ev = a.sc.time.addEvent({ delay: 16, loop: true, callback: tick });
    const forget = bin.add(() => {
      ev.remove();
      chunk.destroy();
    });
    a.sc.tweens.add({
      targets: e,
      x: sx,
      y: y0,
      duration: 700,
      delay: 500,
      ease: 'Quad.In',
      onComplete: () => {
        if (!a.inWave()) return;
        a.sfx('sfx_titanking_scrape');
        a.shake(1800, 0.012);
        const hitDone = new Set<Pizza>();
        let sparkT = 0;
        let lastX = e.x;
        a.sc.tweens.add({
          targets: e,
          x: sx1,
          duration: 2600,
          ease: 'Linear',
          onUpdate: () => {
            chunk.angle += (p.s < 0 ? 1 : -1) * 9;
            sparkT++;
            if (sparkT % 3 === 0) {
              a.fx.ring(e.x, y0 + 30, 0xffb040, 0.5, 0.3);
              debris(a, e.x, y0 + 20, 'soft', 3, { tints: [0xffd27a, 0xff7a1a], scale: 0.08, spread: 500, up: 250 });
            }
            // (everything between last frame's x and this one's: a hitch can't skip a pizza)
            const lo = Math.min(lastX, e.x) - 1;
            const hi = Math.max(lastX, e.x) + 1;
            lastX = e.x;
            for (const q of a.alivePizzas()) {
              if (hitDone.has(q) || q.x + q.radius * 0.6 < lo || q.x - q.radius * 0.6 > hi) continue;
              hitDone.add(q);
              a.fx.explosion(q.x, q.surfaceY, 150);
              a.shake(300, 0.016);
              a.hitPizza(q, q.slices, 'CRUSHED!', '#ff4a2a');
            }
          },
          onComplete: () => {
            forget();
            a.sc.time.delayedCall(2600, () => {
              // a perk brought pizzas back: he takes up the chain and pulls again
              if (!f.alive || !a.inWave() || !a.alivePizzas().length || p3?.part !== 'A') return;
              a.quip(W / 2, SAFE_TOP + 120, 'AGAIN!', '#ffd27a', 50);
              a.fxLayer.addAt(p.run.box, 0);
              for (const q of pulls) {
                if (q.broken) continue;
                q.weak.setVisible(true);
                q.glow.setVisible(true);
                q.hot.setVisible(true);
                if (q !== p) q.badge = counter(a, () => (q.broken ? null : [q.wx, q.wy + 128]), q.hp, 0xff8a3a);
              }
              p.badge = counter(a, () => (p.broken ? null : [p.wx, p.wy + 128]), p.hp, 0xff8a3a);
              p3.failing = false;
              p3.left = p3.total;
              p3.rockT = 2.5;
              timerUi = pullTimer(a);
            });
          },
        });
      },
    });
  };

  // ——— part B: the shield ———
  const beginShield = (f: Foot, a: Arena) => {
    if (p3?.part !== 'A') return;
    timerUi?.destroy();
    timerUi = null;
    crumble?.stop(true);
    p3 = { part: 'B', shield: false, downT: 0, swingT: 4, nextSide: Math.random() < 0.5 ? -1 : 1, hopT: 2.5, win: 0 };
    // the screen moment: he shakes, roars, the whole pit shakes with him
    a.dramatic(0.8);
    a.sfx('sfx_titanking_unchained');
    a.flash(300, 255, 220, 140);
    a.shake(1200, 0.02);
    a.rumble(1, 900);
    quake(a, 0, 16);
    a.fx.ring(f.cx, f.cy, 0xffd27a, 3, 0.6);
    sandBurst(a, f.cx, f.cy, 40);
    bigQuip(a, f, 'I AM UNCHAINED!', '#ffd27a', 56);
    const x0 = SEAT[0];
    a.sc.tweens.killTweensOf(f);
    a.sc.tweens.add({ targets: f, x: { from: x0 - 14, to: x0 + 14 }, duration: 60, yoyo: true, repeat: 9, onComplete: () => (f.x = x0) });
    a.sc.time.delayedCall(1000, () => {
      if (!f.alive || p3?.part !== 'B') return;
      // the dome forms first (the moment to see), then the banner says what to do about it
      raiseShield(f, a);
      a.bossMove(f, 'THE TITAN’S SHIELD', SHIELD_INFO);
      a.sc.time.delayedCall(1100, () => f.alive && p3?.part === 'B' && a.banner('UNCHAINED!', 'He raises his shield', 'phase', SHIELD_INFO));
      hourT.t = 6;
      devourT.t = 9;
    });
  };

  const raiseShield = (f: Foot, a: Arena) => {
    if (p3?.part !== 'B') return;
    p3.shield = true;
    p3.win = SHIELD_WINDOW[heat(a).rank];
    shieldUi?.destroy();
    shieldUi = pullTimer(a, 'PIERCE THE SHIELD');
    bin.add(() => {
      shieldUi?.destroy();
      shieldUi = null;
    });
    f.shielded = true;
    f.brain.wasShielded = true;
    a.sfx('sfx_titanking_shieldup');
    const R = domeR(f);
    const DY = domeDy(f);
    if (!dome) {
      const DS = (R / 140) / 1.8;
      const img = a.sc.add.image(f.x, f.cy, 'tk_dome').setBlendMode(Phaser.BlendModes.ADD).setScale(DS * 0.4).setAlpha(0);
      const sheen = a.sc.add.image(f.x, f.cy, 'tk_dome').setBlendMode(Phaser.BlendModes.ADD).setScale(DS).setAlpha(0).setAngle(30);
      const ring = a.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
      a.fxLayer.addAt(ring, 0);
      a.fxLayer.addAt(sheen, 0);
      a.fxLayer.addAt(img, 0);
      let t = 0;
      const follow = a.sc.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => {
          t += 0.016;
          img.setPosition(f.x, f.cy - DY);
          sheen.setPosition(f.x, f.cy - DY).setAngle(30 + t * 14);
          ring.clear();
          if (!dome?.up) return;
          // a band of light sweeping up the shell
          const yy = ((t * 0.5) % 1) * 2 - 1;
          const half = Math.sqrt(Math.max(0, 1 - yy * yy)) * R;
          ring.lineStyle(4, 0xffe8b0, 0.3 * (1 - Math.abs(yy))).lineBetween(f.x - half, f.cy - DY - yy * R, f.x + half, f.cy - DY - yy * R);
        },
      });
      dome = {
        img,
        sheen,
        ring,
        up: false,
        destroy: () => {
          follow.remove();
          img.destroy();
          sheen.destroy();
          ring.destroy();
        },
      };
      bin.add(() => {
        dome?.destroy();
        dome = null;
      });
    }
    const d = dome;
    d.up = true;
    const DS = (R / 140) / 1.8;
    a.sc.tweens.killTweensOf([d.img, d.sheen]);
    d.img.setScale(DS * 0.4).setAlpha(0);
    a.sc.tweens.add({ targets: d.img, scale: DS, alpha: 0.5, duration: 520, ease: 'Back.Out' });
    a.sc.tweens.add({ targets: d.sheen, alpha: 0.1, duration: 520 });
    a.sc.tweens.add({ targets: d.img, alpha: { from: 0.5, to: 0.34 }, scaleX: DS * 1.02, scaleY: DS * 0.985, duration: 900, delay: 520, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  };

  const dropShield = (f: Foot, a: Arena, at: Pt) => {
    if (p3?.part !== 'B' || !dome) return;
    p3.shield = false;
    p3.downT = 6;
    f.shielded = false;
    f.brain.wasShielded = false;
    const d = dome;
    d.up = false;
    a.sc.tweens.killTweensOf([d.img, d.sheen]);
    a.sfx('sfx_titanking_shielddown');
    // it shatters out from where the blade went in
    for (let i = 0; i < 22; i++) {
      const ang = (i / 22) * TAU;
      const x = f.x + Math.cos(ang) * domeR(f);
      const y = f.cy - domeDy(f) + Math.sin(ang) * domeR(f);
      const sh = a.sc.add.image(x, y, 'tk_domeshard').setBlendMode(Phaser.BlendModes.ADD).setScale(0.8 + crand() * 0.8).setAngle(crand() * 360);
      a.fxLayer.add(sh);
      a.sc.tweens.add({ targets: sh, x: x + Math.cos(ang) * (120 + crand() * 160) + (x - at[0]) * 0.2, y: y + Math.sin(ang) * 120 + 260, angle: sh.angle + pm() * 300, alpha: 0, duration: 900 + crand() * 400, ease: 'Quad.Out', onComplete: () => sh.destroy() });
    }
    a.sc.tweens.add({ targets: d.img, alpha: 0, scale: d.img.scale * 1.15, duration: 260 });
    a.sc.tweens.add({ targets: d.sheen, alpha: 0, duration: 260 });
    // the window: a ring round him counts it down
    const t0 = a.now();
    const ring = timerRing(a, () => (p3?.part === 'B' && !p3.shield && f.alive ? { x: f.x, y: f.cy } : null), 300, 0x7dff9a, () => 1 - (a.now() - t0) / 6);
    const forget = bin.add(ring);
    a.sc.time.delayedCall(6000, forget);
    a.sc.time.delayedCall(550, () => f.alive && p3?.part === 'B' && !p3.shield && a.quip(f.x, f.cy + 40, 'HIT HIM NOW!', '#7dff9a', 46));
  };

  /** A broken chain swings down beside him, a blade on its end. */
  const swingChain = (f: Foot, a: Arena, s: number) => {
    const h = heat(a);
    const anc = SWING_ANCHOR(s);
    const k = linkK(f);
    const run = new LinkRun(a, k, a.fxLayer, false);
    const BS = TF.blade.px / TF.RES;
    const bl = a.sc.add.image(0, 0, 'tk_blade').setOrigin(0.5, 14 / TF.blade.h).setScale(BS);
    a.fxLayer.add(bl);
    // the angle from straight down (+ swings towards +x); it comes in from off the side
    const OUT = -s * 1.45;
    const st = { th: OUT, push: 0 };
    let phase: 'in' | 'hold' | 'pierce' | 'out' | 'done' = 'in';
    let holdT = 0;
    const hits = BLADE_HITS[h.rank];
    let left = hits;
    let badge: ReturnType<typeof counter> | null = null;
    let ring: (() => void) | null = null;
    const bladeLen = (TF.blade.h - 14) * TF.blade.px;
    const pos = (th: number): Pt => [anc[0] + Math.sin(th) * SWING_LEN, anc[1] + Math.cos(th) * SWING_LEN];
    const tip = (): Pt => {
      const [x, y] = pos(st.th);
      return [x + Math.sin(st.th) * bladeLen, y + Math.cos(st.th) * bladeLen];
    };
    const mid = (): Pt => {
      const [x, y] = pos(st.th);
      return [x + Math.sin(st.th) * bladeLen * 0.5, y + Math.cos(st.th) * bladeLen * 0.5];
    };
    const draw = () => {
      const e = pos(st.th);
      run.lay(anc, e, 0, phase === 'hold' ? 1.5 : 0);
      bl.setPosition(e[0], e[1]).setRotation(-st.th);
      // over a hero's shield wall raised after it (King Leonidas's Hold the Line hid the blade)
      const fx = a.fxLayer;
      let top = -1;
      fx.list.forEach((o, i) => {
        if (o instanceof Phaser.GameObjects.Image && o.texture.key === 'p_lx_shield') top = i;
      });
      if (top > fx.getIndex(bl)) {
        if (run.box.parentContainer === fx) fx.moveTo(run.box, top);
        fx.moveTo(bl, top);
      }
    };
    let tEv = 0;
    const ev = a.sc.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        tEv += 0.016;
        if (phase === 'hold') {
          holdT += 0.016;
          // hanging there, swaying, nudged further in by each blow
          st.th = st.push + Math.sin(holdT * 2.6) * 0.05 * Math.exp(-holdT * 0.5) + Math.sin(holdT * 1.3) * 0.012;
        }
        draw();
      },
    });
    draw();
    a.sfx('sfx_titanking_swing');
    a.quip(W / 2 + s * 560, SAFE_TOP + 80, 'A BROKEN CHAIN!', '#ffb070', 36);
    a.sc.tweens.add({
      targets: st,
      th: s * 0.1,
      duration: 900,
      ease: 'Sine.Out',
      onComplete: () => {
        if (phase !== 'in') return;
        phase = 'hold';
        holdT = 0;
        st.push = 0;
        a.sfx('sfx_titanking_chainhit', { volume: 0.7 });
        badge = counter(a, () => (phase === 'hold' ? [mid()[0], mid()[1] - 150] : null), left, 0xffb070);
        const win = BLADE_WINDOW[h.rank];
        const t0 = a.now();
        ring = timerRing(a, () => (phase === 'hold' ? { x: mid()[0], y: mid()[1] } : null), 110, 0xffb070, () => 1 - (a.now() - t0) / win);
        a.sc.time.delayedCall(win * 1000, () => {
          if (phase !== 'hold') return;
          a.quip(mid()[0], mid()[1] - 100, 'TOO SLOW!', '#ffb0a0', 34);
          // missed: another comes round soon, so a miss doesn't cost the whole window
          if (p3?.part === 'B') p3.swingT = Math.min(p3.swingT, MISS_NEXT);
          out();
        });
      },
    });
    const out = () => {
      if (phase === 'done') return;
      phase = 'out';
      badge?.destroy();
      ring?.();
      a.sfx('sfx_titanking_swing', { volume: 0.6, rate: 1.15 });
      a.sc.tweens.add({ targets: st, th: OUT, duration: 800, ease: 'Sine.In', onComplete: () => finish() });
    };
    const finish = (quiet = false) => {
      if (!run.box.active) return;
      phase = 'done';
      ev.remove();
      badge?.destroy();
      ring?.();
      a.sc.tweens.killTweensOf(st);
      run.destroy();
      bl.destroy();
      if (swing === me) swing = null;
      if (!quiet) unlist();
    };
    const unlist = bin.add(() => finish(true));
    const me = { end: (quiet?: boolean) => finish(quiet) };
    swing = me;
    a.addClickable({
      get x() {
        return mid()[0];
      },
      get y() {
        return mid()[1];
      },
      label: 'chain blade',
      // the whole timer ring and a margin round it (a swinging target: the ring is what you aim at)
      r: 150,
      priority: 3,
      alive: () => phase === 'hold',
      hit: () => {
        if (phase !== 'hold') return;
        left--;
        badge?.set(left);
        const [mx, my] = mid();
        a.fx.impact(mx, my, left <= 0);
        debris(a, mx, my, 'soft', 4, { tints: [0xffffff, 0xffd27a], scale: 0.1, spread: 500, up: 150 });
        // each blow drives it a little closer to the shield
        st.push += s * 0.035;
        if (left > 0) return void a.sfx('sfx_titanking_bladehit', { throttle: 50 });
        a.sfx('sfx_titanking_bladehit');
        pierce();
      },
    });
    const pierce = () => {
      phase = 'pierce';
      badge?.destroy();
      ring?.();
      // it swings hard into the shield, point first
      const into = Math.asin(Phaser.Math.Clamp((f.x - s * 150 - anc[0]) / (SWING_LEN + bladeLen * 0.6), -0.9, 0.9));
      a.sc.tweens.add({
        targets: st,
        th: into,
        duration: 200,
        ease: 'Quad.In',
        onComplete: () => {
          const at = tip();
          a.sfx('sfx_titanking_pierce');
          a.dramatic(0.35);
          a.flash(200, 255, 236, 180);
          a.shake(500, 0.016);
          a.rumble(1, 300);
          a.fx.explosion(at[0], at[1], 140);
          a.quip(at[0], at[1] - 120, 'PIERCED!', '#7dff9a', 54);
          if (f.alive) {
            f.flash(0xff6a4a, 160);
            hurt(f, a, 0.06);
            dropShield(f, a, at);
          }
          // it's stuck for a moment, then wrenched back out
          a.sc.time.delayedCall(650, () => phase === 'pierce' && out());
        },
      });
    };
  };

  const brain: Brain & { dev: Record<string, (f: Foot, a: Arena, n?: number) => void> } = {
    // dev hooks for scripted playtests (window.F, the boss lab): force a move or a branch now
    dev: {
      devour: (f, a) => !bite && startBite(f, a),
      glass: (f, a) => !glass && flipGlass(f, a),
      rock: (_f, a) => dropRock(a),
      /** Knock n hits off each weak link (all of them with no n). */
      weak: (f, a, n) => {
        for (const p of pulls) for (let i = 0, m = n ?? p.hp; i < m && !p.broken; i++) hitWeak(f, a, p);
      },
      timeUp: (f, a) => {
        if (p3?.part === 'A') p3.left = Math.min(p3.left, 0.05);
        void f;
        void a;
      },
      swing: (f, a) => {
        if (p3?.part === 'B' && !swing) swingChain(f, a, p3.nextSide);
      },
    },
    names: ['TIME EATER', 'DEVOUR', 'TITAN UNCHAINED'],
    info: [
      'The great hourglass flips: if its sand runs out he eats the time, slowing your peel and hurrying every foot · Smash the hourglass',
      'His giant Titan head rises out of the lava and inhales a pizza · Whack the head before it inhales the pizza!',
      PULL_INFO,
    ],
    cards: [
      {
        what: 'The great hourglass flips over beside him',
        hit: 'Smash the hourglass before its sand runs out',
        miss: 'He eats the time: your peel slows and every foot hurries',
        show: [{ key: 'p_nz_hourglass', label: 'Hourglass', hits: (h) => h.hits(4) }],
      },
      {
        what: 'His giant Titan head rises out of the lava and inhales a pizza',
        hit: 'Whack the head until it chokes and lets the pizza go',
        miss: 'He gulps half of that pizza’s slices',
        show: [{ key: 'tk_bighead', label: 'Titan head', hits: (h) => HEAD_HITS[h.rank] }],
      },
      {
        what: 'He hauls on two chains and Tartarus crumbles',
        hit: 'Snap the red-hot link on each chain, and break falling rocks',
        miss: 'Time runs out: he drags a chain across every pizza',
        show: [
          { key: 'tk_weak0', label: 'Red-hot link', hits: (h) => WEAK_HP[h.rank] },
          { key: 'tk_rock0', label: 'Falling rock', hits: (h) => (h.rank === 0 ? 1 : h.rank >= 3 ? 3 : 2) },
          { key: 'tk_blade', label: 'Then: chain blade', hits: (h) => BLADE_HITS[h.rank] },
        ],
      },
    ],
    cardArt: titanFightArt,
    // three phases on every heat: the chain pull and his shield are the climax
    phases: () => 3,
    upkeep(f, dt, a) {
      start(() => {
        enterArena(a, 'titanking');
        entrance(a, f, {
          sfx: 'sfx_titanking_enter',
          quip: 'THE AGE OF TITANS RETURNS!',
          color: '#ffd27a',
          flash: [255, 200, 120],
          ring: 0xffd27a,
          delay: 400,
          ms: 900,
          onLanded: () => {
            landed = true;
            sandBurst(a, f.x, f.y - 40, 26);
            debris(a, f.x, f.y - 120, 'shard', 8, { scale: 0.7, tints: [0x8a7e6e] });
          },
        });
      });
      // the fight's art, a texture a frame (it's big)
      if (!artReady) artReady = buildHeadTextures() && ensureArt(a, true);
      // his own fight: the wave's feet never come, only his Skeleton Hoplites (and none while his head is up)
      if (!spawnsHeld) {
        spawnsHeld = true;
        a.pauseSpawns(true);
        // build the Hoplites' live art now, in idle time, so the first one doesn't build on its spawn frame
        warmLive(a.sc, ['hoplite'], FOOT_BY_ID);
      }
      if (!p3 && landed) {
        hopT -= dt;
        if (hopT <= 0) {
          hopT = cool(a, 4);
          const n = a.allFeet().filter((o) => o.alive && o.type.id === 'hoplite').length;
          // (never in a lane his body covers, not even over the last pizza: they'd hide behind him and pop out in
          // front as they dive; with no lane free they wait off screen, and still count towards the cap)
          if (!bite?.dev.pulling && n < HOPLITES[heat(a).rank]) a.spawn('hoplite', rnd(a.alivePizzas().filter((q) => q !== bite?.p)) ?? null, undefined, { offBoss: true });
        }
      }
      if (wantP3 && landed && !p3) enterP3(f, a);
      if (!p3) return;
      // he holds his seat in the middle of the table
      f.puppet = true;
      if (p3.part === 'enter') return;
      if (p3.part === 'A') updatePull(f, dt, a, p3);
      else updateShield(f, dt, a, p3);
      updateChains(f, dt, a);
    },
    onPhase(f, ph, a) {
      // a new phase drops what he's holding (the transform beat would let go of him anyway)
      bite?.end();
      a.sfx('sfx_titanking_roar');
      if (ph === 2) devourT.t = 4;
      if (ph >= 3 && !wantP3) {
        wantP3 = true;
        a.pauseSpawns(true);
        glass?.end();
        void f;
      }
    },
    update(f, dt, a) {
      const h = heat(a);
      // the chain pull is all he does
      if (p3 && p3.part !== 'B') return;
      // (only while it's pulling: the head sinking away doesn't hold up his other moves)
      if (bite?.dev.pulling) return;
      hourT.every = h.cooldown(f.phase >= 2 ? 14 : 11);
      if (!glass && hourT.tick(dt)) {
        // (not over his head as it sinks away: it flips the moment the head is gone)
        if (bite) hourT.t = 0.5;
        else flipGlass(f, a);
      }
      if (f.phase >= 2) {
        devourT.every = h.cooldown(13);
        // (not while a broken chain hangs beside him: one thing to whack at a time there)
        if (!swing && !bite && devourT.tick(dt)) startBite(f, a);
      }
      quipT -= dt;
      if (quipT <= 0) {
        quipT = 11 + crand() * 6;
        bigQuip(a, f, ['TIME IS MY FOOD.', 'SPARTAN. HOW SMALL YOU ARE.', 'EVERY AGE ENDS IN MY MOUTH.'][Math.floor(crand() * 3)], '#ffd27a', 34);
      }
    },
    onSmacked(f, a) {
      if (letThrough) return false;
      const t = a.now();
      // (in part B, before the shield first rises he's still untouchable)
      if (p3 && (p3.part !== 'B' || p3.shield || p3.downT <= 0)) {
        if (t - blockQuipAt > 1.4) {
          blockQuipAt = t;
          const msg = p3.part === 'B' ? 'HIS SHIELD! PIERCE IT!' : 'BREAK HIS CHAINS!';
          a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 150), msg, '#ffd27a', 34);
        }
        if (p3.part === 'B' && dome) {
          a.sfx('sfx_kit_shieldblock', { throttle: 150 });
          a.sc.tweens.add({ targets: dome.sheen, alpha: { from: 0.6, to: 0.16 }, duration: 220 });
        }
        return true;
      }
      if (bite?.dev.pulling && t - blockQuipAt > 1.4) {
        blockQuipAt = t;
        a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 150), 'HIT THE HEAD!', '#ffd27a', 32);
      }
      return false;
    },
    onDeath(f, a) {
      a.pauseSpawns(false);
      shieldUi?.destroy();
      shieldUi = null;
      crumble?.stop(true);
      // his broken chains drop away with him
      for (const p of pulls) {
        const box = p.stub?.run.box ?? (p.broken ? null : p.run.box);
        if (box?.active) {
          p.fading = true;
          a.sc.tweens.add({ targets: box, y: 700, alpha: 0, duration: 900, ease: 'Quad.In', onComplete: () => box.destroy() });
        }
      }
      bin.flush();
      if (hidSky) skyChainsOf(f)?.setTension(0);
      // the run was lost under him (the scene clears the field): no victory crumble
      if (!a.alivePizzas().length) return;
      // the Titan king crumbles: stone shards, a flood of golden sand and his chains falling away
      shatter(a, f, { burst: 0xffd27a, tint: 0xe8dcc8, sfx: 'sfx_titanking_death', n: 12 });
      sandBurst(a, f.cx, f.cy, 40);
      for (let i = 0; i < 4; i++) a.sc.time.delayedCall(i * 160, () => sandBurst(a, f.cx + pm() * 150, f.cy + pm() * 100, 14));
      a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 170), 'MY… TIME… IS… UP…', '#ffd27a', 40);
      leaveArena(a);
    },
  };
  return brain;

  // ——— the pull, frame by frame ———
  function updatePull(f: Foot, dt: number, a: Arena, s: PartA): void {
    if (!s.failing) {
      s.left -= dt;
      timerUi?.update(s.left, s.total);
      // rocks break off the roof
      s.rockT -= dt;
      if (s.rockT <= 0) {
        s.rockT = Math.max(2.8, cool(a, 3.5));
        dropRock(a);
      }
      if (s.left <= 10 && s.left + dt > 10) a.quip(W / 2, SAFE_TOP + 110, 'HURRY! BREAK THE CHAINS!', '#ff8a6a', 42);
      if (s.left <= 0) failPull(f, a);
    }
    // he heaves on one chain, then the other
    s.heaveT -= dt;
    if (s.heaveT <= 0 && !s.failing) {
      s.heaveT = 1.6;
      s.heaveSide = -s.heaveSide;
      const p = pulls.find((q) => q.s === s.heaveSide && !q.broken) ?? pulls.find((q) => !q.broken);
      if (p) {
        a.sfx('sfx_titanking_strain', { volume: 0.9, throttle: 600 });
        p.shake = Math.max(p.shake, 0.7);
        quake(a, 2.5, 5);
        a.sc.tweens.killTweensOf(f);
        a.sc.tweens.add({ targets: f, x: SEAT[0] + p.s * 22, duration: 520, yoyo: true, ease: 'Sine.InOut', onComplete: () => (f.x = SEAT[0]) });
        a.fx.puff(p.s < 0 ? 30 : W - 30, PULL_ANCHOR(p.s)[1] + 40, 4);
      }
    }
  }

  /** The shield window ran out: he brings both fists down on the table. A slice off every pizza (never the last on
   * Mild), a big shake, and a fresh window. */
  function titanSlam(f: Foot, a: Arena): void {
    const h = heat(a);
    bigQuip(a, f, 'KNEEL!', '#ff8a6a');
    a.sfx('sfx_titanking_roar');
    a.shake(600, 0.02);
    a.rumble(1, 400);
    a.flash(260, 255, 150, 90);
    quake(a, 4, 10);
    for (const p of a.alivePizzas()) {
      a.fx.explosion(p.x, p.surfaceY, 90);
      if (h.rank === 0) hitSoft(a, p, 1, 'SLAMMED!', '#ff8a6a');
      else a.hitPizza(p, 1, 'SLAMMED!', '#ff8a6a');
    }
  }

  function updateShield(f: Foot, dt: number, a: Arena, s: PartB): void {
    const h = heat(a);
    if (!s.shield && s.downT > 0) {
      s.downT -= dt;
      if (s.downT <= 0 && f.alive) {
        bigQuip(a, f, 'BACK, SPARTAN!');
        raiseShield(f, a);
      }
    }
    // only his Skeleton Hoplites march in now
    s.hopT -= dt;
    if (s.hopT <= 0) {
      s.hopT = cool(a, 4);
      const n = a.allFeet().filter((o) => o.alive && o.type.id === 'hoplite').length;
      if (!bite?.dev.pulling && n < HOPLITES[h.rank]) a.spawn('hoplite', rnd(a.alivePizzas().filter((q) => q !== bite?.p)) ?? null, undefined, { offBoss: true });
    }
    // the shield's window: it counts down while it's up (held while his head is up, the one thing to hit then);
    // run out and he slams the table, then the window starts again
    if (s.shield) {
      if (!bite?.dev.pulling) s.win -= dt;
      shieldUi?.update(Math.max(0, s.win), SHIELD_WINDOW[h.rank]);
      if (s.win <= 0) {
        s.win = SHIELD_WINDOW[h.rank];
        titanSlam(f, a);
      }
    } else if (shieldUi) {
      shieldUi.destroy();
      shieldUi = null;
    }
    // a broken chain swings in, left and right in turn (not while his head is up, and not with his shield down)
    if (!swing && !bite && s.shield) {
      s.swingT -= dt;
      if (s.swingT <= 0) {
        s.swingT = SWING_EVERY[h.rank];
        swingChain(f, a, s.nextSide);
        s.nextSide = -s.nextSide;
      }
    }
  }

  /** Lay the pull chains (and the broken stubs) every frame. */
  function updateChains(f: Foot, dt: number, a: Arena): void {
    const k = linkK(f);
    for (const p of pulls) {
      const r0 = ringAt(f, p.s);
      p.shake = Math.max(0, p.shake - dt * 2.5);
      if (!p.broken) {
        if (p3?.part === 'A' && p3.failing) continue;
        const sag = p3?.part === 'enter' ? 60 : 14;
        p.run.lay(r0, p.anchor, sag, p.shake * 7 + 1.2);
        const t = p.run.tAtX(WEAK_X(p.s));
        const w = p.run.at(t);
        p.wx = w.x;
        p.wy = w.y;
        p.weak.setPosition(w.x, w.y).setRotation(w.ang + Math.PI / 2);
        p.hot.setPosition(w.x, w.y).setRotation(w.ang + Math.PI / 2).setScale(p.weak.scale).setAlpha(p.weak.alpha * (0.45 + 0.3 * Math.sin(a.now() * 7 + p.s)));
        p.glow.setPosition(w.x, w.y).setAlpha(p.weak.alpha * (0.55 + 0.25 * Math.sin(a.now() * 6 + p.s) + (1 - p.hp / p.max) * 0.2));
        // the link's health: an arc round it
        p.ring.clear();
        if (p3?.part === 'A') {
          const kk = p.hp / p.max;
          p.ring.lineStyle(16, 0x2a1810, 0.85).strokeCircle(w.x, w.y, 88);
          p.ring.lineStyle(10, kk < 0.3 ? 0xff5a3c : 0xffb040, 1).beginPath().arc(w.x, w.y, 88, -Math.PI / 2, -Math.PI / 2 + TAU * kk).strokePath();
        }
      } else if (p.stub) {
        // a pendulum: it swings down and settles, dangling from his shackle
        const st = p.stub;
        st.w += (-9 * Math.sin(st.th) - st.w * 1.6) * dt;
        st.th += st.w * dt;
        const L = 6 * LINK_LEN * SKY_LINK_K * 0.78 * k;
        st.run.lay(r0, [r0[0] + Math.sin(st.th) * L, r0[1] + Math.cos(st.th) * L], 0, 0);
      }
    }
  }
};

const PULL_INFO = 'He hauls on two chains and Tartarus crumbles · Smash the glowing link on each chain before time runs out, and break the falling rocks';
const SHIELD_INFO = 'Shielded, he swings his broken chains in · Smack a chain’s blade until it pierces the shield, then hit him hard';

export const brains: Record<string, () => Brain> = { titanking };
