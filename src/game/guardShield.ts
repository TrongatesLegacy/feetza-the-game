// A guard foot's shield as a piece of its own (Riot Ryan, the Skeleton Hoplite, Spartan Sandals). The style draws the
// shield alone (StyleDef.shield) and the body without it (DrawOpts.noShield); here that becomes a gameplay layer on
// the foot (Foot.attachShield), so it works whatever the graphics settings:
//
// - it hangs in front of the foot, up until it's smashed. Spartan Sandals alone lower and raise theirs on a beat:
//   about to drop it trembles, its rim glows and a rising tick plays; it swings down on its strap to hang at the
//   side, overshoots and settles; coming back it dips first, then snaps up with a clank;
// - each smack it blocks cracks it (pre-baked crack stages) and bumps the badge; the last one it can take shatters
//   it into pieces that fall away;
// - a fixed time after it broke, a new one comes at full strength: in the last second the foot reaches back for it
//   (the aspis pulled from behind its back, the riot shield tossed in from off screen) and raises it;
// - a leg badge (src/game/legBadge.ts) says SHIELD with a stepped bar of its strength, then BROKEN, then RE-ARM
//   with the seconds left in an amber ring (glowing blue in its last second); Spartan's says OPEN! while it's down.
//
// The rules live in Foot (guardTick, guardBlock); this file only shows them. Cosmetic randomness uses crand(); the
// textures use a seeded generator, so they're the same every time.

import Phaser from 'phaser';
import { CX } from '../art/feetCommon';
import { footRes, resolvedLeg, styledCanvas } from '../art/feetArt';
import { REST } from '../art/style/kit';
import { type ShieldDef, styleFor } from '../art/style/registry';
import { type Ctx, hashStr, makeCanvas, rng } from '../art/util';
import { GUARD_FETCH } from '../config';
import type { FootType } from '../data/feet';
import { audio } from '../systems/audio';
import { crand } from '../systems/cosmeticRandom';
import type { Foot } from './Foot';
import { LegBadge, type LegBadgeShow } from './legBadge';

/** Design units of room round the shield's box (its outline, the rim glow). */
const PAD = 12;
/** Crack stages drawn on the shield (frame 0 is whole). */
export const CRACK_STAGES = 3;

/** The crack stage a shield shows with `left` of `max` blocked smacks to go: none when whole, then three stages
 * spread over its strength (on Regular, 6: a new stage every 2 hits). */
export function crackStage(left: number, max: number): number {
  if (left >= max) return 0;
  return Phaser.Math.Clamp(Math.ceil(((max - left) * CRACK_STAGES) / max), 1, CRACK_STAGES);
}

// ════════════════════════════ textures ════════════════════════════

interface Shard {
  key: string;
  /** Its centre, in the shield texture's design units (from the canvas's top left). */
  cx: number;
  cy: number;
}

interface ShieldTex {
  sheet: string;
  rim: string;
  body: string | null;
  shards: Shard[];
  /** Texture size in design units. */
  w: number;
  h: number;
  res: number;
}

const texCache = new Map<string, ShieldTex>();

/** The shield of a guard foot drawn in the style kit (none in legacy art mode). */
export function shieldDefOf(type: FootType): ShieldDef | undefined {
  return styleFor(type.id)?.shield;
}

type P = [number, number];

/** A jagged line from a out along angle a for len, bending a little at each step. */
function jag(r: () => number, x: number, y: number, a: number, len: number, steps: number, wander: number): P[] {
  const pts: P[] = [[x, y]];
  let px = x;
  let py = y;
  let ang = a;
  for (let i = 0; i < steps; i++) {
    ang += (r() - 0.5) * wander;
    const l = (len / steps) * (0.7 + r() * 0.6);
    px += Math.cos(ang) * l;
    py += Math.sin(ang) * l;
    pts.push([px, py]);
  }
  return pts;
}

function stroke(g: Ctx, pts: P[], col: string, w: number, dx = 0, dy = 0): void {
  g.strokeStyle = col;
  g.lineWidth = w;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy)));
  g.stroke();
}

/** Where each stage's blow lands (fractions of the box from its centre). */
const IMPACTS: P[] = [
  [-0.22, -0.18],
  [0.26, 0.12],
  [-0.06, 0.34],
];

/** Paint the cracks of stages 1…stage on a shield drawn in design space (they're kept to its own pixels). Each blow is
 * drawn from its own seeded generator, so a stage keeps the cracks of the ones before and adds to them. */
function paintCracks(g: Ctx, def: ShieldDef, stage: number, seed: number): void {
  const b = def.box;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const R = Math.min(b.w, b.h) / 2;
  const u = R / 80;
  const glass = def.material === 'glass';
  g.save();
  g.globalCompositeOperation = 'source-atop';
  for (let j = 0; j < stage; j++) {
    const r = rng(seed + j * 7919);
    const [fx, fy] = IMPACTS[j];
    const ix = cx + fx * b.w;
    const iy = cy + fy * b.h;
    // older blows' cracks run further with every stage
    const grow = 0.55 + 0.35 * (stage - 1 - j);
    if (glass) {
      // polycarbonate: white stress lines radiating from the blow, a web between them, a bright crushed spot
      const n = 7;
      const rays: P[][] = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r() * 0.6;
        const len = R * (0.45 + r() * 0.45) * grow;
        rays.push(jag(r, ix, iy, a, len, 5, 0.5));
      }
      for (const ray of rays) {
        stroke(g, ray, 'rgba(10,20,40,0.45)', 2.6 * u, 1.2 * u, 1.4 * u);
        stroke(g, ray, 'rgba(255,255,255,0.9)', 1.5 * u);
        stroke(g, ray.slice(0, 3), 'rgba(255,255,255,0.95)', 2.4 * u);
      }
      // the web: rings joining neighbouring rays
      for (const at of [1, 2, 3]) {
        const ring: P[] = rays.map((ray) => ray[Math.min(at, ray.length - 1)]);
        ring.push(ring[0]);
        g.globalAlpha = 0.75 - at * 0.15;
        stroke(g, ring, 'rgba(255,255,255,0.85)', 1.1 * u);
        g.globalAlpha = 1;
      }
      const sp = g.createRadialGradient(ix, iy, 0, ix, iy, 16 * u);
      sp.addColorStop(0, 'rgba(255,255,255,0.95)');
      sp.addColorStop(0.5, 'rgba(220,240,255,0.5)');
      sp.addColorStop(1, 'rgba(220,240,255,0)');
      g.fillStyle = sp;
      g.fillRect(ix - 20 * u, iy - 20 * u, 40 * u, 40 * u);
    } else {
      // bronze: a hammered dent (lit on its lower right, shadowed on its upper left: the light comes from the top
      // left), with dark splits running out of it and a lit lip along each
      const dr = 15 * u;
      const sh = g.createRadialGradient(ix - dr * 0.35, iy - dr * 0.35, dr * 0.1, ix, iy, dr * 1.2);
      sh.addColorStop(0, 'rgba(40,16,4,0.55)');
      sh.addColorStop(0.6, 'rgba(40,16,4,0.25)');
      sh.addColorStop(1, 'rgba(40,16,4,0)');
      g.fillStyle = sh;
      g.beginPath();
      g.arc(ix, iy, dr * 1.2, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(255,240,200,0.95)';
      g.lineWidth = 3 * u;
      g.beginPath();
      g.arc(ix, iy, dr, 0.1, Math.PI * 0.9);
      g.stroke();
      const n = 4;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r() * 0.9;
        const len = R * (0.4 + r() * 0.4) * grow;
        const ray = jag(r, ix + Math.cos(a) * dr * 0.6, iy + Math.sin(a) * dr * 0.6, a, len, 5, 0.7);
        stroke(g, ray, 'rgba(255,236,186,0.9)', 2.6 * u, -1.3 * u, -1.3 * u);
        stroke(g, ray, 'rgba(30,10,2,0.95)', 3 * u);
        // a branch off the middle
        const m = ray[2];
        const br = jag(r, m[0], m[1], a + (r() < 0.5 ? -0.9 : 0.9), len * 0.4, 3, 0.6);
        stroke(g, br, 'rgba(30,10,2,0.8)', 1.6 * u);
      }
      // a chip knocked out of the rim nearest the blow, its broken edge lit
      const ra = Math.atan2(iy - cy, ix - cx);
      const nx = cx + Math.cos(ra) * R;
      const ny = cy + Math.sin(ra) * R;
      const chip = () => {
        g.beginPath();
        g.moveTo(nx + Math.cos(ra + 0.5) * 11 * u, ny + Math.sin(ra + 0.5) * 11 * u);
        g.lineTo(nx - Math.cos(ra) * 9 * u, ny - Math.sin(ra) * 9 * u);
        g.lineTo(nx + Math.cos(ra - 0.45) * 12 * u, ny + Math.sin(ra - 0.45) * 12 * u);
        g.lineTo(nx + Math.cos(ra) * 8 * u, ny + Math.sin(ra) * 8 * u);
        g.closePath();
      };
      g.save();
      chip();
      g.lineWidth = 4 * u;
      g.strokeStyle = 'rgba(255,236,186,0.9)';
      g.stroke();
      g.globalCompositeOperation = 'destination-out';
      chip();
      g.fill();
      g.restore();
    }
  }
  if (stage >= CRACK_STAGES) {
    // the last stage: about to go. A split right across from the rim, and a piece of the edge gone
    const r = rng(seed + 31337);
    const a0 = Math.PI * 1.1 + r() * 0.4;
    const sx = cx + Math.cos(a0) * R * 1.05;
    const sy = cy + Math.sin(a0) * R * 1.05;
    const split = jag(r, sx, sy, a0 + Math.PI + (r() - 0.5) * 0.4, R * 1.6, 9, 0.5);
    if (glass) {
      stroke(g, split, 'rgba(10,20,40,0.55)', 4 * u, 1.5 * u, 1.8 * u);
      stroke(g, split, 'rgba(255,255,255,0.95)', 2.4 * u);
    } else {
      stroke(g, split, 'rgba(255,230,170,0.6)', 2.4 * u, -1.4 * u, -1.4 * u);
      stroke(g, split, 'rgba(20,8,2,0.95)', 4.2 * u);
    }
    // the missing piece: a notch out of the rim
    const a1 = -0.5 + r() * 0.5;
    const nx = cx + Math.cos(a1) * R;
    const ny = cy + Math.sin(a1) * R;
    g.globalCompositeOperation = 'destination-out';
    g.beginPath();
    g.moveTo(nx + Math.cos(a1) * 20 * u, ny + Math.sin(a1) * 20 * u);
    g.lineTo(nx + Math.cos(a1 + 1.7) * 18 * u, ny + Math.sin(a1 + 1.7) * 18 * u);
    g.lineTo(nx - Math.cos(a1) * 9 * u + Math.sin(a1) * 3 * u, ny - Math.sin(a1) * 9 * u);
    g.lineTo(nx + Math.cos(a1 - 1.6) * 16 * u, ny + Math.sin(a1 - 1.6) * 16 * u);
    g.closePath();
    g.fill();
  }
  g.restore();
}

function addSheet(sc: Phaser.Scene, key: string, frames: HTMLCanvasElement[]): void {
  if (sc.textures.exists(key)) return;
  const fw = frames[0].width;
  const fh = frames[0].height;
  const [c, ctx] = makeCanvas(fw * frames.length, fh);
  frames.forEach((f, i) => ctx.drawImage(f, i * fw, 0));
  const tex = sc.textures.addCanvas(key, c);
  frames.forEach((_, i) => tex?.add(i, 0, i * fw, 0, fw, fh));
}

/** Cut the most cracked shield into pieces round its centre: wedges, each split into an inner and an outer piece. */
function cutShards(sc: Phaser.Scene, id: string, src: HTMLCanvasElement, def: ShieldDef, s: number): Shard[] {
  const r = rng(hashStr(`${id}-shards`));
  const W = src.width / s;
  const H = src.height / s;
  const cx = PAD + def.box.w / 2 - def.box.w * 0.08;
  const cy = PAD + def.box.h / 2 - def.box.h * 0.06;
  const R = Math.max(W, H);
  const n = 7;
  const angs = Array.from({ length: n }, (_, i) => (i / n) * Math.PI * 2 + (r() - 0.5) * 0.5);
  const inner = angs.map(() => Math.min(def.box.w, def.box.h) * (0.2 + r() * 0.12));
  const out: Shard[] = [];
  for (let i = 0; i < n; i++) {
    const a0 = angs[i];
    const a1 = angs[(i + 1) % n] + (i === n - 1 ? Math.PI * 2 : 0);
    const r0 = inner[i];
    const r1 = inner[(i + 1) % n];
    const mid = (a0 + a1) / 2;
    const polys: P[][] = [
      [
        [cx, cy],
        [cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0],
        [cx + Math.cos(mid) * (r0 + r1) * 0.55, cy + Math.sin(mid) * (r0 + r1) * 0.55],
        [cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1],
      ],
      [
        [cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0],
        [cx + Math.cos(a0) * R, cy + Math.sin(a0) * R],
        [cx + Math.cos(mid) * R, cy + Math.sin(mid) * R],
        [cx + Math.cos(a1) * R, cy + Math.sin(a1) * R],
        [cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1],
        [cx + Math.cos(mid) * (r0 + r1) * 0.55, cy + Math.sin(mid) * (r0 + r1) * 0.55],
      ],
    ];
    polys.forEach((poly, j) => {
      const xs = poly.map((p) => Phaser.Math.Clamp(p[0], 0, W));
      const ys = poly.map((p) => Phaser.Math.Clamp(p[1], 0, H));
      const x0 = Math.min(...xs);
      const y0 = Math.min(...ys);
      const x1 = Math.max(...xs);
      const y1 = Math.max(...ys);
      if (x1 - x0 < 4 || y1 - y0 < 4) return;
      const [c, g] = makeCanvas(Math.ceil((x1 - x0) * s) + 2, Math.ceil((y1 - y0) * s) + 2);
      g.scale(s, s);
      g.translate(-x0, -y0);
      g.beginPath();
      poly.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
      g.save();
      g.clip();
      g.drawImage(src, 0, 0, W, H);
      g.restore();
      // a lit broken edge round the piece, kept to its own pixels
      g.globalCompositeOperation = 'source-atop';
      g.strokeStyle = def.material === 'glass' ? 'rgba(255,255,255,0.9)' : 'rgba(255,226,160,0.8)';
      g.lineWidth = 2.2;
      g.stroke();
      // is any of the shield in it?
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let solid = 0;
      for (let k = 3; k < d.length; k += 16) if (d[k] > 60) solid++;
      if (solid < 12) return;
      const key = `gs_${id}_shard${i}_${j}`;
      if (!sc.textures.exists(key)) sc.textures.addCanvas(key, c);
      out.push({ key, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 });
    });
  }
  return out;
}

/** Build (once) a guard foot's shield textures: the crack stages, the rim glow, the shatter's pieces, and (for a foot
 * whose still art has the shield painted on) its still body without it. */
function shieldTextures(sc: Phaser.Scene, type: FootType, def: ShieldDef, needBody: boolean): ShieldTex {
  let t = texCache.get(type.id);
  if (!t || !sc.textures.exists(t.sheet)) {
    const res = footRes(type);
    const s = type.scale * res;
    const w = def.box.w + PAD * 2;
    const h = def.box.h + PAD * 2;
    const draw = (stage: number) => {
      const [c, g] = makeCanvas(Math.ceil(w * s), Math.ceil(h * s));
      g.scale(s, s);
      g.translate(PAD - def.box.x, PAD - def.box.y);
      def.draw(g, type.art);
      if (stage > 0) paintCracks(g, def, stage, hashStr(`${type.id}-cracks`));
      return c;
    };
    const frames = Array.from({ length: CRACK_STAGES + 1 }, (_, i) => draw(i));
    const sheet = `gs_${type.id}`;
    addSheet(sc, sheet, frames);
    // the rim glow: a soft halo round the silhouette and a bright band just inside its edge
    const base = frames[0];
    const [rc, rg] = makeCanvas(base.width, base.height);
    rg.shadowColor = '#ffffff';
    rg.shadowBlur = 7 * s;
    for (let i = 0; i < 3; i++) rg.drawImage(base, 0, 0);
    rg.shadowBlur = 0;
    rg.globalCompositeOperation = 'source-in';
    rg.fillStyle = '#ffffff';
    rg.fillRect(0, 0, rc.width, rc.height);
    rg.globalCompositeOperation = 'destination-out';
    const k = 0.9;
    const ox = (PAD + def.box.w / 2) * s;
    const oy = (PAD + def.box.h / 2) * s;
    rg.globalAlpha = 0.85;
    rg.drawImage(base, ox - ox * k, oy - oy * k, base.width * k, base.height * k);
    const rim = `gs_${type.id}_rim`;
    if (!sc.textures.exists(rim)) sc.textures.addCanvas(rim, rc);
    t = { sheet, rim, body: null, shards: cutShards(sc, type.id, frames[CRACK_STAGES], def, s), w, h, res };
    texCache.set(type.id, t);
  }
  if (needBody && !t.body) {
    const key = `gs_${type.id}_body`;
    if (!sc.textures.exists(key)) sc.textures.addCanvas(key, styledCanvas(type, REST, { live: false, noShield: true }));
    t.body = key;
  }
  return t;
}

// ════════════════════════════ the piece and the badge ════════════════════════════

/** Spring a value towards a target (stiffness w rad/s, damping ratio z), in small steps. */
function spring(v: { x: number; v: number }, to: number, w: number, z: number, dt: number): void {
  const n = Math.max(1, Math.ceil(dt / (1 / 120)));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    v.v += (-(w * w) * (v.x - to) - 2 * z * w * v.v) * h;
    v.x += v.v * h;
  }
}

const SND_RATE = { glass: 1.1, bronze: 0.9 };
/** The highest the badge's face centre goes on screen (world y): room for its icon above it, clear of the HUD. */
const BADGE_TOP = 150;
/** Seconds the badge says BROKEN before it counts down to the new shield. */
const BROKEN_SHOW = 1.2;

class GuardFx {
  private readonly sc: Phaser.Scene;
  private readonly def?: ShieldDef;
  private tex?: ShieldTex;
  private piece?: Phaser.GameObjects.Container;
  private img?: Phaser.GameObjects.Image;
  private rim?: Phaser.GameObjects.Image;
  private readonly badge: LegBadge;
  /** 0 up … 1 down (springs past both). */
  private k = { x: 0, v: 0 };
  /** The hanging aspis's swing (radians). */
  private pend = { x: 0, v: 0 };
  /** 1: aside to the foot's left (as drawn), −1: to its right. */
  private side = 1;
  private wasUp = true;
  private wasWarn = false;
  private t = crand() * 10;
  private hitT = 0;
  private raiseT = 9;
  private openTotal = 1;
  private fetching = false;
  private caught = false;
  private behind = false;
  private first = true;
  private lastX = 0;
  /** A raging Spartan: rearing back with its shield, throwing it, or done with shields. */
  private mode: 'shield' | 'windup' | 'flight' | 'rage' = 'shield';
  /** The badge's wearing step flashes for this long after automatic damage soaks in. */
  private chipT = 0;
  private modeT = 0;

  constructor(readonly f: Foot) {
    this.sc = f.scene;
    this.def = shieldDefOf(f.type);
    if (this.def) {
      this.tex = shieldTextures(this.sc, f.type, this.def, false);
      const host = f.attachShield();
      const t = this.tex;
      const ox = (this.def.pivot[0] - this.def.box.x + PAD) / t.w;
      const oy = (this.def.pivot[1] - this.def.box.y + PAD) / t.h;
      this.img = this.sc.add.image(0, 0, t.sheet, 0).setOrigin(ox, oy).setScale(1 / t.res);
      this.rim = this.sc.add.image(0, 0, t.rim).setOrigin(ox, oy).setScale(1 / t.res).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd84a).setAlpha(0);
      this.piece = this.sc.add.container(0, 0, [this.img, this.rim]);
      host.add(this.piece);
      f.trackLiveImage(this.img);
    }
    // the badge: on the leg, just above the foot (clear of the health bar under it)
    const st = styleFor(f.type.id);
    const legCol = st?.leg ? resolvedLeg(f.type, st.leg).color : (f.type.art.legColor ?? f.type.art.skin);
    this.badge = new LegBadge(this.sc, f.root, 0, -f.meta.footHeight * f.type.scale - 72, {
      kind: this.def?.badge ?? 'plate',
      base: legCol,
      accent: this.def?.accent ?? '#9ad8ff',
    });
    this.lastX = f.x;
    this.pose();
    this.badgeTick(0);
  }

  /** Where the pivot sits in the foot's frame. */
  private pivotLocal(): P {
    const ts = this.f.type.scale;
    const [px, py] = this.def!.pivot;
    return [(px - CX) * ts, (py - this.f.meta.footHeight) * ts];
  }

  private sfx(key: string, vol = 1, rate = 1): void {
    // (a shield with its own sounds plays them at their own pitch, with a little of the stage's lift)
    const own = key === 'sfx_guardcrack' ? this.def?.sounds?.crack : key === 'sfx_guardshatter' ? this.def?.sounds?.shatter : undefined;
    if (own) return void audio.sfx(own, { volume: vol, rate: 1 + (rate - 1) * 0.6, throttle: 60 });
    audio.sfx(key, { volume: vol, rate: rate * (this.def ? SND_RATE[this.def.material] : 1), throttle: 60 });
  }

  update(dt: number): void {
    const f = this.f;
    if (this.first) {
      this.first = false;
      // animation off (or a still view): the still body without its painted shield. The live layer draws its own.
      // (decided as the live layer is: GameScene's footTick has run styleLive by now; other views never run it)
      const live = !!f.liveHost;
      if (this.def && !live && this.def.painted !== false) {
        this.tex = shieldTextures(this.sc, f.type, this.def, true);
        if (this.tex.body) f.setArtTexture(this.tex.body);
      }
    }
    this.t += dt;
    if (this.hitT > 0) this.hitT -= dt;
    this.raiseT += dt;
    const vx = dt > 0 ? (f.x - this.lastX) / dt : 0;
    this.lastX = f.x;
    this.modeT += dt;
    if (this.mode === 'windup') this.windupPose();
    else if (this.mode === 'flight' || this.mode === 'rage') {
      // (nothing to hold)
    } else if (f.guardBroken) this.brokenTick();
    else {
      if (this.fetching) this.endFetch();
      const up = f.guardUp;
      if (up !== this.wasUp) {
        if (up) this.onRaise();
        else this.onDrop();
        this.wasUp = up;
      }
      const warn = up && f.guardWarned;
      if (warn && !this.wasWarn) this.sfx('sfx_guardwarn', 0.85, 1);
      this.wasWarn = warn;
      let to = up ? 0 : 1;
      // anticipation: it dips a touch further before it snaps back up
      const rising = !up && f.has('guard') && f.stunT <= 0 && f.guardOpen > 0 && f.guardOpen < 0.17;
      if (rising) to = 1.16;
      if (up) spring(this.k, to, 34, 0.55, dt);
      else spring(this.k, to, rising ? 22 : 15, rising ? 0.7 : 0.45, dt);
      if (this.def?.swing) {
        // a hanging aspis swings with the foot's moves
        spring(this.pend, 0, 8, 0.14, dt);
        if (!up) this.pend.v += -vx * 0.0009 * this.side;
      } else spring(this.pend, 0, 12, 0.5, dt);
      this.pose();
    }
    this.badgeTick(dt);
  }

  private onDrop(): void {
    const f = this.f;
    // aside towards the open table: away from the screen edge it's nearest
    this.side = f.x < 380 ? -1 : 1;
    this.openTotal = Math.max(0.3, f.guardOpen);
    this.pend.v = 1.5 * this.side;
    if (this.piece?.visible) this.sfx('sfx_guarddrop', 0.8);
  }

  private onRaise(): void {
    this.raiseT = 0;
    this.pend.v = 0;
    this.pend.x *= 0.3;
    if (this.piece?.visible) this.sfx('sfx_guardraise', 0.85);
  }

  /** Pose the piece from the spring, the swing, the warning's tremble and the hits it's taken. */
  private pose(): void {
    if (!this.piece || !this.def) return;
    const f = this.f;
    const ts = f.type.scale;
    const d = this.def.down;
    const k = this.k.x;
    const kc = Phaser.Math.Clamp(k, 0, 1.2);
    let [x, y] = this.pivotLocal();
    x += d.dx * ts * k * this.side;
    y += d.dy * ts * k;
    let rot = d.rot * k * this.side + this.pend.x * Math.min(1, kc);
    let sx = 1 + (d.sx - 1) * kc;
    let sy = 1;
    // the warning before a drop: it trembles harder as the drop nears, and its rim glows
    const warn = f.guardUp && f.guardWarned;
    if (warn) {
      const a = Phaser.Math.Clamp(1 - f.guardToDrop / f.guardWarnTime, 0.25, 1);
      x += Math.sin(this.t * 63) * 2.6 * a * ts;
      y += Math.sin(this.t * 51 + 1.3) * 1.2 * a * ts;
      rot += Math.sin(this.t * 44) * 0.04 * a;
    }
    if (this.rim) this.rim.setAlpha(warn ? 0.45 + 0.55 * Math.abs(Math.sin(this.t * 13)) : Math.max(0, this.rim.alpha - 0.12));
    // a blocked smack knocks it back and it shivers
    if (this.hitT > 0) {
      const h = this.hitT / 0.2;
      rot += Math.sin(this.t * 70) * 0.06 * h;
      y -= 4 * ts * h;
      sx *= 1 - 0.05 * h;
      sy *= 1 + 0.03 * h;
    }
    // the clank as it snaps up: a squash and spring back
    if (this.raiseT < 0.25) {
      const q = Math.sin((this.raiseT / 0.25) * Math.PI) * (1 - this.raiseT / 0.25);
      sx *= 1 + 0.1 * q;
      sy *= 1 - 0.1 * q;
    }
    this.piece.setPosition(x, y).setRotation(rot).setScale(sx, sy);
  }

  /** Broken: in the wait's last second the foot reaches back and a new shield comes to its side, ready to raise. */
  private brokenTick(): void {
    const f = this.f;
    if (f.guardFetchT < 0 || !this.piece || !this.def) return;
    const u = Phaser.Math.Clamp(f.guardFetchT / GUARD_FETCH, 0, 1);
    if (!this.fetching) {
      this.fetching = true;
      this.caught = false;
      this.side = f.x < 380 ? -1 : 1;
      this.img!.setFrame(0);
      this.piece.setVisible(true).setAlpha(1);
      this.sfx('sfx_whoosh', 0.45, 0.9);
      if (this.def.swing) this.setBehind(true);
    }
    // it leans back towards where the shield comes from, and straightens up as it takes it
    f.leanExtra = -this.side * 0.2 * Math.sin(Math.min(1, u / 0.85) * Math.PI);
    const ts = f.type.scale;
    const d = this.def.down;
    const [px, py] = this.pivotLocal();
    const dx = px + d.dx * ts * this.side;
    const dy = py + d.dy * ts;
    const drot = d.rot * this.side;
    let x: number;
    let y: number;
    let rot: number;
    let sx = d.sx;
    if (this.def.swing) {
      // pulled from behind its back: it rises from behind the ankle, comes round to the side and swings out front
      const a = Phaser.Math.Clamp(u / 0.6, 0, 1);
      const e = Phaser.Math.Easing.Back.Out(a);
      const bx = px - 40 * ts * this.side;
      const by = py - 190 * ts;
      x = bx + (dx - bx) * e;
      y = by + (dy - by) * e - Math.sin(a * Math.PI) * 30 * ts;
      rot = -0.9 * this.side + (drot + 0.9 * this.side) * e;
      sx = 0.45 + (d.sx - 0.45) * e;
      if (a > 0.55 && this.behind) this.setBehind(false);
    } else {
      // tossed in from off screen: it spins in on an arc and is caught at the side with a clunk
      const a = Phaser.Math.Clamp(u / 0.65, 0, 1);
      const rs = f.root.scaleX || 1;
      const sx0 = (-this.side * 900) / rs;
      const sy0 = (-f.y - 260) / rs;
      x = sx0 + (dx - sx0) * a;
      y = sy0 + (dy - sy0) * a - Math.sin(a * Math.PI) * 260 * ts;
      rot = drot + (1 - a) * Math.PI * 3 * this.side;
      if (a >= 1 && !this.caught) {
        this.caught = true;
        this.sfx('sfx_shield', 0.55, 0.8);
      }
    }
    // a dip just before it snaps up
    // a dip and a squash just before it snaps up (caught and held from 0.65 to 0.8)
    let sy = 1;
    if (u > 0.8) {
      const d = Math.sin(((u - 0.8) / 0.2) * Math.PI * 0.5);
      y += d * 10 * ts;
      sy = 1 - 0.12 * d;
      sx *= 1 + 0.08 * d;
    }
    this.k.x = 1;
    this.k.v = 0;
    this.pend.x = 0;
    this.pend.v = 0;
    this.piece.setPosition(x, y).setRotation(rot).setScale(sx, sy);
    this.wasUp = false;
    this.wasWarn = false;
  }

  private endFetch(): void {
    this.fetching = false;
    this.f.leanExtra = 0;
    this.setBehind(false);
    this.img?.setFrame(0);
    this.piece?.setVisible(true);
  }

  private setBehind(on: boolean): void {
    if (this.behind === on) return;
    this.behind = on;
    this.f.shieldBehind(on);
  }

  /** A blow it took: a new crack stage when it's earned, a knock, the crack's sound and a bump of the badge. A smack
   * is one step; a slam several (a bigger burst); automatic damage wearing a step off is `quiet` (a small one). */
  blocked(left: number, quiet = false, steps = 1): void {
    const f = this.f;
    const stage = crackStage(left, f.guardMax);
    this.img?.setFrame(stage);
    this.hitT = quiet ? 0.1 : steps > 1 ? 0.3 : 0.2;
    this.badge.bump();
    if (quiet) this.sfx('sfx_guardcrack', 0.45, 1.25);
    else this.sfx('sfx_guardcrack', Math.min(1.3, 0.8 + 0.1 * stage + 0.15 * (steps - 1)), (1 + 0.06 * stage) * (steps > 1 ? 0.85 : 1));
    this.chips(quiet ? 2 : 3 + stage + (steps - 1) * 4);
  }

  /** Automatic damage soaking into it: the step it's wearing down flashes on the badge. */
  chipped(): void {
    this.chipT = 0.12;
  }

  /** A few small bits knocked off by a blocked smack. */
  private chips(n: number): void {
    if (!this.tex?.shards.length || !this.piece || !this.def) return;
    const m = this.piece.getWorldTransformMatrix();
    const layer = this.f.root.parentContainer;
    const ox = this.def.pivot[0] - this.def.box.x + PAD;
    const oy = this.def.pivot[1] - this.def.box.y + PAD;
    for (let i = 0; i < n; i++) {
      const sh = this.tex.shards[Math.floor(crand() * this.tex.shards.length)];
      const p = m.transformPoint((sh.cx - ox) * this.f.type.scale * 0.6, (sh.cy - oy) * this.f.type.scale * 0.6);
      this.fling(layer, sh.key, p.x, p.y, (crand() - 0.5) * 360, -160 - crand() * 220, (Math.hypot(m.a, m.b) * 0.28) / this.tex.res, 0.55);
    }
  }

  /** A piece flying off under gravity, spinning and fading. */
  private fling(layer: Phaser.GameObjects.Container | null, key: string, x: number, y: number, vx: number, vy: number, scale: number, life: number, rot = 0): void {
    const img = this.sc.add.image(x, y, key).setScale(scale).setRotation(rot);
    if (layer) layer.add(img);
    const spin = (crand() - 0.5) * 14;
    this.sc.tweens.addCounter({
      from: 0,
      to: life,
      duration: life * 1000,
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        img.setPosition(x + vx * t, y + vy * t + 0.5 * 1900 * t * t);
        img.setRotation(rot + spin * t);
        img.setAlpha(Math.min(1, ((life - t) / life) * 2.5));
      },
      onComplete: () => img.destroy(),
    });
  }

  /** It shatters: the pieces burst off the blow and fall away, and the foot is open. */
  broke(): void {
    this.sfx('sfx_guardshatter', 1, 1);
    this.badge.bump();
    if (!this.piece || !this.tex || !this.def) return;
    const m = this.piece.getWorldTransformMatrix();
    const layer = this.f.root.parentContainer;
    const ox = this.def.pivot[0] - this.def.box.x + PAD;
    const oy = this.def.pivot[1] - this.def.box.y + PAD;
    const cx = PAD + this.def.box.w / 2;
    const cy = PAD + this.def.box.h / 2;
    const ts = this.f.type.scale;
    for (const sh of this.tex.shards) {
      const p = m.transformPoint((sh.cx - ox) * ts, (sh.cy - oy) * ts);
      const ax = sh.cx - cx;
      const ay = sh.cy - cy;
      const l = Math.hypot(ax, ay) || 1;
      const sp = 160 + crand() * 260;
      this.fling(layer, sh.key, p.x, p.y, (ax / l) * sp, (ay / l) * sp * 0.5 - 260 - crand() * 200, Math.hypot(m.a, m.b) / this.tex.res, 1.1, m.rotation);
    }
    this.piece.setVisible(false);
    this.k.x = 1;
    this.k.v = 0;
  }

  // ——— a raging Spartan throws its shield ———

  windup(): void {
    if (this.fetching) this.endFetch();
    this.mode = 'windup';
    this.modeT = 0;
    this.sfx('sfx_whoosh', 0.5, 0.7);
  }

  /** Rearing back: the shield swings up and back over its shoulder, the foot leans into it. */
  private windupPose(): void {
    if (!this.piece || !this.def) return;
    const f = this.f;
    const ts = f.type.scale;
    const u = Phaser.Math.Clamp(this.modeT / 0.35, 0, 1);
    const e = Phaser.Math.Easing.Cubic.Out(u);
    const side = f.x < 960 ? -1 : 1;
    const [px, py] = this.pivotLocal();
    f.leanExtra = side * 0.14 * e;
    this.piece.setPosition(px + side * 70 * ts * e, py - 150 * ts * e).setRotation(side * 1.1 * e + Math.sin(this.t * 60) * 0.03 * e).setScale(1 - 0.25 * e, 1);
  }

  throwOff(): { key: string; x: number; y: number; scale: number } | null {
    this.mode = 'flight';
    this.modeT = 0;
    this.f.leanExtra = 0;
    if (!this.piece || !this.tex || !this.def || !this.piece.visible) return null;
    const m = this.piece.getWorldTransformMatrix();
    const ox = this.def.pivot[0] - this.def.box.x + PAD;
    const oy = this.def.pivot[1] - this.def.box.y + PAD;
    const p = m.transformPoint((this.tex.w / 2 - ox) * this.f.type.scale, (this.tex.h / 2 - oy) * this.f.type.scale);
    this.piece.setVisible(false);
    // a texture of its own for the frame it's on (as cracked as it is), for a plain image to fly
    const fr = this.img!.frame;
    const key = `${this.tex.sheet}_s${fr.name}`;
    if (!this.sc.textures.exists(key)) {
      const [c, g] = makeCanvas(fr.cutWidth, fr.cutHeight);
      g.drawImage(fr.source.image as HTMLCanvasElement, fr.cutX, fr.cutY, fr.cutWidth, fr.cutHeight, 0, 0, fr.cutWidth, fr.cutHeight);
      this.sc.textures.addCanvas(key, c);
    }
    return { key, x: p.x, y: p.y, scale: Math.hypot(m.a, m.b) / this.tex.res };
  }

  rage(): void {
    if (this.fetching) this.endFetch();
    this.piece?.setVisible(false);
    this.f.leanExtra = 0;
    this.mode = 'rage';
    this.modeT = 0;
  }

  // ——— the leg badge ———

  private badgeTick(dt: number): void {
    const f = this.f;
    if (this.chipT > 0) this.chipT -= dt;
    const steps = { steps: f.guardMax, lit: f.guardHp, chip: f.guardChipAcc / f.guardChipStep, flash: this.chipT > 0.06 };
    let show: LegBadgeShow;
    if (this.mode !== 'shield') {
      // RAGE: done with shields; it flashes while the shield is wound up and flying at the peel
      const flash = (this.mode === 'windup' || this.mode === 'flight') && Math.floor(this.modeT / 0.12) % 2 === 0;
      show = { word: 'RAGE', icon: 'rage', state: flash ? 'hot' : 'bad' };
    } else if (f.guardBroken) {
      const left = Math.max(0, f.guardRearmAfter - f.guardIdle);
      if (f.guardIdle < BROKEN_SHOW) show = { word: 'BROKEN', icon: 'shieldBroken', bar: { steps: f.guardMax, lit: 0 }, state: 'bad' };
      else show = { word: 'RE-ARM', sub: `${Math.ceil(left)}s`, icon: 'shieldBroken', ring: { frac: f.guardIdle / f.guardRearmAfter, color: '#e0902f' }, state: left <= GUARD_FETCH ? 'warn' : 'bad' };
    } else if (f.guardUp) {
      // a shield on a beat (Spartan Sandals): the ring runs down to its next drop (a long hold after a hit shows)
      const beat = f.type.guard && (f.state === 'hover' || f.state === 'descend') ? { frac: f.guardToDrop / Math.max(0.1, f.guardNext), color: '#2f9be0' } : undefined;
      show = { word: 'SHIELD', icon: 'shield', bar: steps, ring: beat, state: f.guardWarned ? 'warn' : null };
    }
    else show = { word: 'OPEN!', icon: 'shield', bar: steps, ring: f.guardOpen > 0 ? { frac: f.guardOpen / this.openTotal, color: '#2c9a3a' } : undefined, state: 'go' };
    this.badge.set(show);
    // on the leg just above the foot. A foot hovering high wears it lower down the leg; once even the ankle is off
    // the top of the screen it rides over the foot (Tron: better than floating beside it)
    const rs = f.root.scaleY || 1;
    const ankle = -f.meta.footHeight * f.type.scale;
    const want = ankle - 72;
    const minY = f.legCropped ? -Infinity : (BADGE_TOP - f.root.y) / rs;
    const lowest = ankle - 30;
    if (minY <= want) this.badge.img.setPosition(0, want);
    else if (minY <= lowest) this.badge.img.setPosition(0, minY);
    // once even the ankle is off the top of the screen it sits on the foot, just under the top edge
    else this.badge.img.setPosition(0, minY);
    this.badge.update(dt, -f.root.rotation);
  }

  setBadgeVisible(v: boolean): void {
    this.badge.setVisible(v);
  }

  destroy(): void {
    this.f.leanExtra = 0;
    this.badge.destroy();
  }
}

/** Let go of the shield art of feet not in `keep` that nothing on screen shows (GameScene's stage change; next to
 * evictLive). It's drawn again on the next spawn. */
export function evictShieldArt(sc: Phaser.Scene, keep: Set<string>, inUse: Set<string>): void {
  for (const [id, t] of texCache) {
    if (keep.has(id)) continue;
    const keys = sc.textures.getTextureKeys().filter((k) => k === t.sheet || k.startsWith(`${t.sheet}_`));
    if (keys.some((k) => inUse.has(k))) continue;
    for (const k of keys) sc.textures.remove(k);
    texCache.delete(id);
  }
}

/** A guard foot's shield piece and leg badge (Foot's constructor calls this). */
export function makeGuardFx(f: Foot): GuardFx {
  return new GuardFx(f);
}
