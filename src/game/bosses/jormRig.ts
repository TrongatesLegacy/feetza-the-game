// Jörmungandr's body in his fight (the brain is `jormungandr` in ./act8.ts; the art is src/content/art/jormungandr.ts):
// the coils along the table's back edge, and the head on its neck rising out of the sea at a gap between them.
//
// - Painted frames, built a few at a time on the fight's first frames (build()): the coils' roll (each hump heaving,
//   its plates rolling forward and back, water sheeting off it, foam churning), the maw at seven openings, the eye
//   (glaring, drawing breath, rolled up dazed), the stone lids' blink, three strands of kelp swaying, the foam collar
//   round the neck, a splash, and the water pouring off the head as it surfaces.
// - The head is a rig, in three-quarter view, turned towards the pizza it means to bite (flipped to face right): the
//   maw, the lower jaw swinging round its hinge (the tusk riding on it, its near teeth standing in front of the upper
//   lip), the eye under the skull so the brow and lids of stone overhang it, the skull, the kelp (hanging straight down
//   whichever way the head points), the embers' glow. A smack knocks the snout up and it swings back on its neck.
// - The body is ONE tube (a Rope: the hide strip laid along a spine, by arc length) from inside the back of the skull,
//   through the neck's S, down into the sea behind the coils. Its last stretch runs along the head's own axis, so the
//   head always carries straight on out of it and points the way the body goes (a snake, not a head on a column). It
//   is slimmest just behind the jaw and thickens into the body; its back is on the outside of the curves and its belly
//   on the inside; where it bends tighter than it's thick its inner side is gathered in so it never folds. It comes
//   out of the water behind the head, wherever the head has swum to, with a foam ring where it breaks the surface.
//   Under the waterline the head and body are masked off, so they rise out of and sink into the sea. (Without WebGL,
//   which a Rope needs, slices of the neck's tile are laid along the same spine.)
// - Particles (steam from the nostrils, drawn in as he inhales; drips off the kelp and the chin) are its own.
//
// Cosmetic randomness only through crand(); the fight's rules stay in the brain.

import Phaser from 'phaser';
import { CASCADE, COIL, COLLAR, EYE, FAR_EYE, HEAD_O, HINGE, JAW_MAX, KELP, KELP_F, MAW, MAW_N, BODY, MOUTH_PT, NECK, NECK_AT_HEAD, NOSES, SK, SOCKET, SPLASH, TUSK, WRAP, coilHit, headHit, jawTurn, lowLipY, paintCascade, paintChip, paintCoil, paintCollar, paintEye, paintGlow, paintKelp, paintLid, paintLowerJaw, paintLowerTeeth, paintMaw, paintNape, paintNeck, paintBodyStrip, paintSkull, paintSplash, paintTusk, paintWrap, wrapHit } from '../../content/art/jormungandr';
import { makeCanvas, type Ctx } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import type { Arena } from '../arena';
import { fxAtlas } from '../liveKit';
import { texturesInUse } from '../assets';

type Img = Phaser.GameObjects.Image;

/** The head on screen: its scale. */
export const HEAD_S = 1.68;
/** The head's resting tilt (snout down towards the table). */
export const HEAD_TILT = 0.35;
const KELP_N = 8;
/** Slices of the neck along its curve (only without WebGL: with it the body is one tube, a Rope of BODY_N points). */
const NECK_N = 32;
const BODY_N = 96;
/** How thick the body is (against its tile) where it's thickest, low down towards the water. */
const BODY_W = 1.8;

/** Where the mouth is from the head's middle (screen px) for a head facing `face`, tilted by `tilt`, at extra scale
 * `scale`: so the brain can aim the bite and spit from the mouth. */
export function mouthOffset(face: number, tilt: number, scale = 1): [number, number] {
  const k = HEAD_S * scale;
  const side = face > 0 ? -1 : 1;
  const rot = -tilt * side;
  const dx = (MOUTH_PT[0] - HEAD_O.x) * k * side;
  const dy = (MOUTH_PT[1] - HEAD_O.y) * k;
  return [dx * Math.cos(rot) - dy * Math.sin(rot), dx * Math.sin(rot) + dy * Math.cos(rot)];
}

/** The tilt that points the snout from (x, y) at (tx, ty) for a head facing `face` (radians, + snout down). */
export function aimTilt(face: number, x: number, y: number, tx: number, ty: number): number {
  return Math.atan2(ty - y, Math.max(1, face * (tx - x)));
}

/** Coil centres along the back edge: midway between the gaps (330, 760, 1160, 1590) and out at the ends. */
export const COIL_XS = [96, 545, 960, 1375, 1824];

/** A frame loop played by cross-fading two images. */
class Fade {
  readonly a: Img;
  readonly b: Img;
  constructor(sc: Phaser.Scene, key: string, into: Phaser.GameObjects.Container, x: number, y: number, ox: number, oy: number) {
    this.a = sc.add.image(x, y, key, 0).setOrigin(ox, oy);
    this.b = sc.add.image(x, y, key, 0).setOrigin(ox, oy);
    into.add([this.a, this.b]);
  }
  /** Show fractional frame f of n (wrapping when loop). */
  show(f: number, n: number, loop = true, alpha = 1): void {
    const ff = loop ? ((f % n) + n) % n : Math.max(0, Math.min(n - 1, f));
    const i = Math.floor(ff);
    const j = loop ? (i + 1) % n : Math.min(n - 1, i + 1);
    const t = ff - i;
    this.a.setFrame(i).setAlpha(alpha);
    this.b.setFrame(j).setAlpha(alpha * t);
  }
  each(fn: (im: Img) => void): void {
    fn(this.a);
    fn(this.b);
  }
}

interface Part {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  age: number;
  s0: number;
  s1: number;
  a: number;
  grav: number;
  drag: number;
  img: Img;
  water: boolean;
}

/** What the brain asks of the head each frame. */
export interface HeadPose {
  x: number;
  y: number;
  gap: number;
  /** Which way the snout points: −1 left, 1 right. */
  face: number;
  /** Shown at all (false: under the sea, waiting). */
  shown: boolean;
  /** Masked at the waterline (rising, diving, the tell); false while up, biting, dazed. */
  masked: boolean;
  /** Jaw opening 0…1. */
  jaw: number;
  /** Drawing breath 0…1 (the tell before a bite). */
  inhale: number;
  /** Dazed 0…1 (eyes rolled, sagging). */
  daze: number;
  /** Extra scale (the lunge comes at us), tilt (radians, + snout down). */
  scale: number;
  tilt: number;
  /** The water at the gap boiling (the tell before it surfaces) 0…1. */
  boil: number;
}

export class SerpentRig {
  private sc: Phaser.Scene;
  private steps: (() => void)[] = [];
  private stepI = 0;
  ready = false;
  private coilsUp = false;
  coils: { f: Fade; ph: number; spd: number; flip: boolean; s: number; x: number }[] = [];
  private coilRoot!: Phaser.GameObjects.Container;
  private neck: Phaser.GameObjects.TileSprite[] = [];
  /** The body: one tube from inside the back of the skull, through the neck's curve, down under the sea (WebGL). */
  private tube: Phaser.GameObjects.Rope | null = null;
  private collar: Fade | null = null;
  private head: Phaser.GameObjects.Container | null = null;
  private maw!: Fade;
  private jaw!: Img;
  private lteeth!: Img;
  private tusk!: Img;
  private eye!: Img;
  private lid!: Img;
  private glows: Img[] = [];
  private kelp: { f: Fade; ph: number }[] = [];
  private cascade: Img | null = null;
  private stars: Img[] = [];
  private splashes: { img: Img; t: number; spd: number }[] = [];
  private parts: Part[] = [];
  private partRoot!: Phaser.GameObjects.Container;
  private maskG: Phaser.GameObjects.Graphics;
  private mask: Phaser.Display.Masks.GeometryMask;
  private masked = false;
  private blinkT = 2 + crand() * 3;
  private blink = -1;
  private cascadeT = -1;
  private steamT = 0;
  private dripT = 0;
  private flashT = 0;
  private t = 0;
  private lastX = 0;
  private pose: HeadPose | null = null;
  private fx: string;

  constructor(private a: Arena, private edgeY: number) {
    SerpentRig.alive++;
    this.sc = a.sc;
    this.fx = fxAtlas(this.sc);
    this.maskG = this.sc.make.graphics({}, false);
    this.maskG.fillStyle(0xffffff);
    this.maskG.fillRect(-200, -2000, 2320, 2000 + edgeY - 4);
    this.mask = this.maskG.createGeometryMask();
    this.coilRoot = this.sc.add.container(0, 0);
    a.underLayer.add(this.coilRoot);
    this.queue();
  }

  // ——— building the art ———

  /** A sheet of n frames painted a step at a time, laid out in rows (kept within 2048 px across). */
  private sheet(key: string, fw: number, fh: number, n: number, paint: (g: Ctx, i: number) => void, perStep = 1): void {
    if (this.sc.textures.exists(key)) return;
    const cols = Math.max(1, Math.min(n, Math.floor(2048 / fw)));
    const rows = Math.ceil(n / cols);
    const [c, g] = makeCanvas(fw * cols, fh * rows);
    const at = (k: number): [number, number] => [(k % cols) * fw, Math.floor(k / cols) * fh];
    for (let i = 0; i < n; i += perStep)
      this.steps.push(() => {
        for (let k = i; k < Math.min(n, i + perStep); k++) {
          const [x, y] = at(k);
          g.save();
          g.beginPath();
          g.rect(x, y, fw, fh);
          g.clip();
          g.translate(x, y);
          paint(g, k);
          g.restore();
        }
      });
    this.steps.push(() => {
      const tex = this.sc.textures.addCanvas(key, c)!;
      for (let k = 0; k < n; k++) tex.add(k, 0, ...at(k), fw, fh);
    });
  }

  private still(key: string, make: () => HTMLCanvasElement): void {
    if (this.sc.textures.exists(key)) return;
    this.steps.push(() => {
      const src = make();
      // (a copy: a texture's canvas belongs to its game, the art module caches its own)
      const [c, g] = makeCanvas(src.width, src.height);
      g.drawImage(src, 0, 0);
      this.sc.textures.addCanvas(key, c);
    });
  }

  private queue(): void {
    // the coils first: they come up as the fight opens
    this.sheet('jsr_coil', COIL.w, COIL.h, COIL.n, (g, i) => paintCoil(g, i / COIL.n));
    this.steps.push(() => this.raiseCoils());
    this.still('jsr_skull', paintSkull);
    this.still('jsr_ljaw', paintLowerJaw);
    this.still('jsr_lteeth', paintLowerTeeth);
    this.sheet('jsr_maw', MAW.w, MAW.h, MAW_N, (g, i) => {
      g.translate(-MAW.x, -MAW.y);
      paintMaw(g, i / (MAW_N - 1));
    }, 2);
    this.sheet('jsr_eye', EYE.fw, EYE.fh, 4, (g, i) => paintEye(g, i), 4);
    this.sheet('jsr_lid', EYE.fw, EYE.fh, 4, (g, i) => paintLid(g, i), 4);
    this.still('jsr_tusk', () => {
      const [c, g] = makeCanvas(TUSK.fw, TUSK.fh);
      paintTusk(g);
      return c;
    });
    this.still('jsr_glow', () => {
      const [c, g] = makeCanvas(128, 128);
      paintGlow(g, 128);
      return c;
    });
    for (let k = 0; k < 3; k++) this.sheet(`jsr_kelp${k}`, KELP_F[k].w, KELP_F[k].h, KELP_N, (g, i) => paintKelp(g, k, i / KELP_N), KELP_N);
    this.still('jsr_neck', paintNeck);
    this.still('jsr_body', paintBodyStrip);
    this.still('jsr_nape', () => {
      const [c, g] = makeCanvas(SK.w, SK.h);
      paintNape(g);
      return c;
    });
    this.sheet('jsr_collar', COLLAR.w, COLLAR.h, COLLAR.n, (g, i) => paintCollar(g, i / COLLAR.n), 4);
    this.sheet('jsr_splash', SPLASH.w, SPLASH.h, SPLASH.n, (g, i) => paintSplash(g, i / (SPLASH.n - 1)), 4);
    const cw = Math.ceil(SK.w * CASCADE.k);
    const ch = Math.ceil((SK.h + 60) * CASCADE.k);
    this.sheet('jsr_cascade', cw, ch, CASCADE.n, (g, i) => paintCascade(g, i / (CASCADE.n - 1)), 3);
    this.still('jsr_wrap', paintWrap);
    this.still('jsr_chip', () => {
      const [c, g] = makeCanvas(48, 36);
      paintChip(g, 48, 36, 7);
      return c;
    });
    this.steps.push(() => this.makeHead());
  }

  /** Build the next piece (call every frame until ready); a piece is a frame or two, a few tens of ms. */
  build(): boolean {
    if (this.ready) return true;
    const t0 = performance.now();
    while (this.stepI < this.steps.length) {
      this.steps[this.stepI++]();
      if (performance.now() - t0 > 12) break;
    }
    if (this.stepI >= this.steps.length) this.ready = true;
    return this.ready;
  }

  /** The coils come up out of the sea along the back edge. */
  private raiseCoils(): void {
    if (this.coilsUp) return;
    this.coilsUp = true;
    COIL_XS.forEach((x, i) => {
      const flip = i % 2 === 1;
      const s = 0.9 + (i % 3) * 0.04;
      const f = new Fade(this.sc, 'jsr_coil', this.coilRoot, x, this.edgeY + 200, COIL.cx / COIL.w, COIL.base / COIL.h);
      f.each((im) => im.setScale(flip ? -s : s, s).setAlpha(0));
      const c = { f, ph: crand() * COIL.n, spd: 2.6 + crand() * 0.8, flip, s, x };
      this.coils.push(c);
      // they heave up out of the water one after another
      f.each((im) => this.sc.tweens.add({ targets: im, y: this.edgeY + 4, duration: 900, delay: 130 * i, ease: 'Back.Out' }));
      this.sc.time.delayedCall(130 * i, () => this.splash(x, 1.1, 0.9));
    });
  }

  private makeHead(): void {
    const sc = this.sc;
    const root = this.a.underLayer;
    const ox = -HEAD_O.x;
    const oy = -HEAD_O.y;
    // the body: one tube along its spine, behind the head and behind the coils (it rises out of the sea beyond them);
    // without WebGL, slices of the neck's tile along it
    const behind = root.getIndex(this.coilRoot);
    if (sc.sys.renderer.type === Phaser.WEBGL) {
      // (a count of points is a valid argument at run time, though the typings only allow an array)
      const tube = sc.add.rope(0, 0, 'jsr_body', undefined, BODY_N as unknown as Phaser.Types.Math.Vector2Like[]).setVisible(false);
      tube.setMask(this.mask);
      root.addAt(tube, behind);
      this.tube = tube;
    } else
      for (let i = 0; i < NECK_N; i++) {
        const n = sc.add.tileSprite(0, 0, NECK.w, 10, 'jsr_neck').setOrigin(NECK.cx / NECK.w, 0).setVisible(false);
        n.setMask(this.mask);
        root.addAt(n, behind + i);
        this.neck.push(n);
      }
    this.collar = new Fade(sc, 'jsr_collar', root, 0, 0, 0.5, COLLAR.y / COLLAR.h);
    // (its foam ring is behind the coils too)
    this.collar.each((im) => root.moveTo(im, root.getIndex(this.coilRoot)));
    this.collar.each((im) => im.setVisible(false));
    const head = sc.add.container(0, 0).setVisible(false);
    this.head = head;
    root.add(head);
    // the shadow the back of the skull throws on the neck running in under it
    head.add(sc.add.image(ox, oy, 'jsr_nape').setOrigin(0, 0).setAlpha(0.7));
    this.maw = new Fade(sc, 'jsr_maw', head, ox + MAW.x, oy + MAW.y, 0, 0);
    this.jaw = sc.add.image(ox + HINGE.x, oy + HINGE.y, 'jsr_ljaw').setOrigin(HINGE.x / SK.w, HINGE.y / SK.h);
    head.add(this.jaw);
    this.eye = sc.add.image(ox + EYE.x, oy + EYE.y, 'jsr_eye', 0);
    this.lid = sc.add.image(ox + EYE.x, oy + EYE.y, 'jsr_lid', 0);
    head.add([this.eye, this.lid]);
    head.add(sc.add.image(ox, oy, 'jsr_skull').setOrigin(0, 0));
    // the near lower teeth ride on the jaw but stand in front of the upper lip
    this.lteeth = sc.add.image(ox + HINGE.x, oy + HINGE.y, 'jsr_lteeth').setOrigin(HINGE.x / SK.w, HINGE.y / SK.h);
    head.add(this.lteeth);
    this.tusk = sc.add.image(0, 0, 'jsr_tusk').setOrigin(0.5, (TUSK.fh - 14) / TUSK.fh);
    head.add(this.tusk);
    KELP.forEach((k) => {
      const F = KELP_F[k.kind];
      const f = new Fade(sc, `jsr_kelp${k.kind}`, head, ox + k.x, oy + k.y, F.ax / F.w, F.ay / F.h);
      f.each((im) => im.setFlipX(k.flip));
      this.kelp.push({ f, ph: crand() * KELP_N });
    });
    this.glows = [
      sc.add.image(ox + EYE.x, oy + EYE.y, 'jsr_glow').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.45),
      sc.add.image(ox + FAR_EYE.x, oy + FAR_EYE.y, 'jsr_glow').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3).setScale(0.5),
    ];
    head.add(this.glows);
    this.cascade = sc.add.image(ox, oy, 'jsr_cascade', 0).setOrigin(0, 0).setScale(1 / CASCADE.k).setAlpha(0);
    head.add(this.cascade);
    for (let i = 0; i < 4; i++) {
      const st = sc.add.image(0, 0, this.fx, 'spark').setTint(0xffe27a).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
      this.stars.push(st);
      head.add(st);
    }
    this.partRoot = sc.add.container(0, 0);
    root.add(this.partRoot);
  }

  // ——— the head's transform ———

  /** Screen point → skull units of the head as it stands now. */
  private local(px: number, py: number): [number, number] | null {
    const p = this.pose;
    if (!p || !p.shown || !this.head) return null;
    const k = HEAD_S * p.scale;
    const rot = this.head.rotation;
    const c = Math.cos(-rot);
    const s = Math.sin(-rot);
    const dx = px - p.x;
    const dy = py - p.y;
    const lx = (dx * c - dy * s) / k;
    const ly = (dx * s + dy * c) / k;
    return [HEAD_O.x + (p.face > 0 ? -lx : lx), HEAD_O.y + ly];
  }

  /** A point of the head (skull units) on screen. */
  private world(lx: number, ly: number): [number, number] {
    const p = this.pose!;
    const k = HEAD_S * p.scale;
    const rot = this.head?.rotation ?? 0;
    const dx = (lx - HEAD_O.x) * k * (p.face > 0 ? -1 : 1);
    const dy = (ly - HEAD_O.y) * k;
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    return [p.x + dx * c - dy * s, p.y + dx * s + dy * c];
  }

  // ——— hit shapes ———

  /** Is a screen point on the head (its skull, its swung jaw, the open mouth between)? */
  headContains(px: number, py: number): boolean {
    const l = this.local(px, py);
    if (!l || !this.pose) return false;
    // (under the waterline the sea hides it)
    if (this.pose.masked && py > this.edgeY - 4) return false;
    return headHit(l[0], l[1], this.pose.jaw);
  }

  /** How far a screen point is from the head (0 on it; a rough distance off it). */
  headDistance(px: number, py: number): number {
    if (this.headContains(px, py)) return 0;
    const l = this.local(px, py);
    if (!l || !this.pose) return 1e6;
    const k = HEAD_S * this.pose.scale;
    const ex = (l[0] - 410) / 380;
    const ey = (l[1] - (290 + this.pose.jaw * 110)) / (170 + this.pose.jaw * 110);
    return Math.max(1, (Math.hypot(ex, ey) - 1) * 200 * k);
  }

  /** Is a screen point on a coil's body (and not on the head in front of it; the body rises behind the coils)? */
  coilContains(px: number, py: number): boolean {
    if (this.headContains(px, py)) return false;
    return this.coils.some((c) => {
      const im = c.f.a;
      if (!im.visible || im.alpha < 0.3) return false;
      const lx = COIL.cx + (px - im.x) / (c.flip ? -c.s : c.s);
      const ly = COIL.base + (py - im.y) / c.s;
      return coilHit(lx, ly);
    });
  }

  /** Is a screen point on a wrap image (it shows the frame WRAP)? */
  wrapContains(img: Img, px: number, py: number): boolean {
    if (this.headContains(px, py)) return false;
    const k = img.scaleX;
    return wrapHit(WRAP.cx + (px - img.x) / k, WRAP.cy + (py - img.y) / k);
  }

  // ——— effects ———

  /** A splash at the waterline at x. */
  splash(x: number, scale = 2, speed = 1): void {
    if (!this.sc.textures.exists('jsr_splash')) return;
    const img = this.sc.add.image(x, this.edgeY + 2, 'jsr_splash', 0).setOrigin(0.5, SPLASH.y / SPLASH.h).setScale(scale);
    this.a.underLayer.add(img);
    this.splashes.push({ img, t: 0, spd: speed });
    for (let i = 0; i < 14 * scale; i++) this.part('drop', x + (crand() - 0.5) * 120 * scale, this.edgeY - 10, (crand() - 0.5) * 420, -260 - crand() * 520, 0.9 + crand() * 0.5, 5, 3, 0.9, 1300, 0.2, 0xe8f0ff, true);
  }

  /** The head breaks the surface: a splash, and the water starts pouring off it. */
  surface(x: number): void {
    this.splash(x, 2.3);
    this.cascadeT = 0;
  }

  /** The head plunges back in. */
  plunge(x: number): void {
    this.splash(x, 2.5);
    this.cascadeT = -1;
    if (this.cascade) this.cascade.setAlpha(0);
  }

  private front = false;
  private headIdx = 0;
  /** Bring the head in front of the pizzas (its bite), or back behind them. */
  setFront(on: boolean): void {
    const h = this.head;
    if (!h || on === this.front) return;
    this.front = on;
    if (on) {
      this.headIdx = this.a.underLayer.getIndex(h);
      this.a.underLayer.remove(h);
      this.a.overFeetLayer.add(h);
    } else {
      this.a.overFeetLayer.remove(h);
      this.a.underLayer.addAt(h, this.headIdx);
    }
  }

  /** A smack landed on the head: it flashes pale and its snout is knocked up, swinging back on its neck. */
  flash(): void {
    this.flashT = 0.12;
    this.kickT = 0;
  }
  private kickT = -1;

  private part(frame: string, x: number, y: number, vx: number, vy: number, life: number, s0: number, s1: number, a: number, grav: number, drag: number, tint: number, water: boolean): void {
    if (this.parts.length > 160 || !this.partRoot) return;
    const img = this.sc.add.image(x, y, this.fx, frame).setTint(tint).setAlpha(0);
    this.partRoot.add(img);
    this.parts.push({ x, y, vx, vy, life, age: 0, s0, s1, a, grav, drag, img, water });
  }

  // ——— every frame ———

  update(dt: number, p: HeadPose): void {
    this.t += dt;
    this.pose = p;
    // the coils: rolling, each at its own pace, breathing
    for (const c of this.coils) {
      c.ph += dt * c.spd;
      c.f.show(c.ph, COIL.n, true, this.dying ? 1 : Math.min(1, c.f.a.alpha + dt * 3));
      const br = 1 + 0.025 * Math.sin(this.t * 1.7 + c.x * 0.01);
      c.f.each((im) => im.setScale((c.flip ? -c.s : c.s) * (1 + (br - 1) * 0.4), c.s * br));
    }
    this.stepParts(dt);
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      s.t += dt * 1.3 * s.spd;
      if (s.t >= 1) {
        s.img.destroy();
        this.splashes.splice(i, 1);
      } else s.img.setFrame(Math.min(SPLASH.n - 1, Math.floor(s.t * SPLASH.n)));
    }
    const head = this.head;
    if (!head || !this.collar) return;
    head.setVisible(p.shown);
    if (p.masked !== this.masked) {
      this.masked = p.masked;
      if (p.masked) head.setMask(this.mask);
      else head.clearMask();
    }
    const k = HEAD_S * p.scale;
    const side = p.face > 0 ? -1 : 1;
    // a smack knocks the snout up, and it swings back on its neck
    let kick = 0;
    if (this.kickT >= 0) {
      this.kickT += dt;
      kick = Math.exp(-5 * this.kickT) * Math.cos(11 * this.kickT);
      if (this.kickT > 1.2) this.kickT = -1;
    }
    head.setPosition(p.x, p.y).setScale(k * side, k).setRotation(-(p.tilt - 0.24 * kick) * side);
    const vx = (p.x - this.lastX) / Math.max(dt, 1e-3);
    this.lastX = p.x;
    // the body: one spine from under the sea at the gap, up through the neck's curve and on into the back of the skull.
    // Its last stretch runs along the head's own axis, so the head carries straight on out of it (no kink at the join)
    // and always points the way the body is going. It rises out of the water leaning, swings back, arches over and
    // comes forward into the skull: one S. The tube is thickest low down, slimmest just behind the jaw (the skull
    // swells again past it), and runs on in under the skull's last plates.
    const [sx, sy] = this.world(SOCKET.x, SOCKET.y);
    const rot = head.rotation;
    const ax = side * Math.cos(rot);
    const ay = side * Math.sin(rot);
    const back = -p.face;
    // (it comes out of the water behind its head: where it surfaced, and then wherever it has swum to, to strike)
    const bx = Math.max(40, Math.min(1880, sx + back * 250));
    const by = this.edgeY + 90;
    const breath = Math.sin(this.t * 1.7);
    // (low down, as it surfaces or dives, the curve shrinks with it, so it never bends tighter than it's thick)
    const high = Math.max(0, by - sy);
    const reach = Math.min((290 + 12 * breath) * HEAD_S * p.scale, Math.max(40, high * 0.7));
    const rise = Math.max(Math.min(200, high * 0.5), high * 0.6);
    // (it leans forward as it leaves the water, an S up to the head; under the surface it runs back, the way the body
    // lies)
    const P = [sx, sy, sx + ax * reach, sy + ay * reach, bx - back * 40, by - rise, bx + back * 60, by];
    const at = (t: number): [number, number] => {
      const u = 1 - t;
      const a0 = u * u * u;
      const a1 = 3 * u * u * t;
      const a2 = 3 * u * t * t;
      const a3 = t * t * t;
      return [a0 * P[0] + a1 * P[2] + a2 * P[4] + a3 * P[6], a0 * P[1] + a1 * P[3] + a2 * P[5] + a3 * P[7]];
    };
    // (by arc length along it, so the plates never stretch where it bends)
    const SAMP = 60;
    const arc: number[] = [0];
    const pts: [number, number][] = [at(0)];
    for (let i = 1; i <= SAMP; i++) {
      pts.push(at(i / SAMP));
      arc.push(arc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const L = arc[SAMP];
    /** A point d along the spine from the socket: x, y and the way it runs (towards the water). Before the socket it
     * carries straight on into the skull. */
    const along = (d: number): [number, number, number, number] => {
      if (d < 0) {
        const [x0, y0] = pts[0];
        const [x1, y1] = pts[1];
        const l = Math.hypot(x1 - x0, y1 - y0) || 1;
        return [x0 + ((x1 - x0) / l) * d, y0 + ((y1 - y0) / l) * d, (x1 - x0) / l, (y1 - y0) / l];
      }
      const dd = Math.max(0, Math.min(L - 0.01, d));
      let j = 0;
      while (j < SAMP - 1 && arc[j + 1] < dd) j++;
      const f = (dd - arc[j]) / Math.max(1e-3, arc[j + 1] - arc[j]);
      const [x0, y0] = pts[j];
      const [x1, y1] = pts[j + 1];
      const l = Math.hypot(x1 - x0, y1 - y0) || 1;
      return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, (x1 - x0) / l, (y1 - y0) / l];
    };
    const show = p.shown && sy < this.edgeY + 20;
    const w0 = NECK_AT_HEAD * p.scale;
    const widthAt = (d: number) => (w0 + (BODY_W - w0) * Math.min(1, Math.max(0, d / (520 * HEAD_S))) ** 1.2) * (1 + 0.012 * breath);
    const lead = 100 * HEAD_S * p.scale;
    // where it leaves the water (for the foam collar)
    let wx = show ? bx : p.gap;
    let ww = BODY_W;
    if (this.tube) {
      const tube = this.tube;
      tube.setVisible(show);
      const vt = tube.vertices;
      const uv = tube.uv;
      const fr = tube.frame;
      const total = lead + L;
      let found = false;
      const ds = total / (BODY_N - 1);
      for (let i = 0; i < BODY_N; i++) {
        const d = -lead + ds * i;
        const [x, y, tx, ty] = along(d);
        const w = widthAt(d);
        const kw = HEAD_S * w;
        // its back on the outside of the crown's curve (mirrored with the head)
        const nx = side * ty;
        const ny = -side * tx;
        let up = BODY.yc * kw;
        let dn = (BODY.h - BODY.yc) * kw;
        // where it bends tighter than it's thick, its inner side is gathered in (it never folds over itself)
        const [, , ux0, uy0] = along(d - ds);
        const [, , ux1, uy1] = along(d + ds);
        const kx = ux1 - ux0;
        const ky = uy1 - uy0;
        const curv = Math.hypot(kx, ky) / (2 * ds);
        if (curv > 1e-4) {
          const lim = 0.92 / curv;
          if (kx * nx + ky * ny > 0) up = Math.min(up, lim);
          else dn = Math.min(dn, lim);
        }
        vt[i * 4] = x + nx * up;
        vt[i * 4 + 1] = y + ny * up;
        vt[i * 4 + 2] = x - nx * dn;
        vt[i * 4 + 3] = y - ny * dn;
        const u = fr.u0 + (fr.u1 - fr.u0) * Math.min(1, (d + lead) / HEAD_S / BODY.len);
        uv[i * 4] = u;
        uv[i * 4 + 1] = fr.v0;
        uv[i * 4 + 2] = u;
        uv[i * 4 + 3] = fr.v1;
        if (!found && d > 0 && y > this.edgeY - 4) {
          found = true;
          wx = x;
          ww = w;
        }
      }
      tube.dirty = false;
    } else {
      // (no WebGL: slices of the neck's tile along the spine, overlapping more where it bends)
      const seg = L / NECK_N;
      for (let i = 0; i < NECK_N; i++) {
        const n = this.neck[i];
        const d0 = i * seg;
        const [, , ax0, ay0] = along(d0);
        const [, , ax1, ay1] = along(d0 + seg);
        const dr = Math.abs(Math.atan2(ax0 * ay1 - ay0 * ax1, ax0 * ax1 + ay0 * ay1));
        const w = widthAt(d0);
        const extra = dr * NECK.r * HEAD_S * w + 8;
        const start = i === 0 ? -lead : d0 - extra / 2;
        const [x, y, tx, ty] = along(start);
        n.setVisible(show).setPosition(x, y).setScale(HEAD_S * side * w, HEAD_S).setRotation(Math.atan2(-tx, ty));
        n.setSize(NECK.w, Math.max(4, (d0 + seg + extra / 2 - start) / HEAD_S));
        n.tilePositionY = start / HEAD_S;
      }
    }
    // the foam collar where it leaves the water, or the sea boiling there before it comes
    const cAlpha = Math.max(show ? 1 : 0, p.boil);
    this.collar.each((im) => im.setVisible(cAlpha > 0.01).setPosition(show ? wx : bx, this.edgeY - 4).setScale(HEAD_S * (show ? ww * 0.95 : 0.85 + 0.25 * p.boil)));
    this.collar.show(this.t * 9, COLLAR.n, true, cAlpha);
    if (p.boil > 0.05 && crand() < dt * 30 * p.boil) this.part('bubble', bx + (crand() - 0.5) * 200, this.edgeY - 6, (crand() - 0.5) * 30, -40 - crand() * 60, 0.6, 6, 12, 0.8, 0, 0.5, 0xd8e4ff, true);
    if (!p.shown) return;
    // the jaw swings round its hinge, the tusk riding on it; the maw opens behind it
    const jawRot = -JAW_MAX * p.jaw;
    this.jaw.setRotation(jawRot);
    this.lteeth.setRotation(jawRot);
    const [tx, ty] = jawTurn(TUSK.x, lowLipY(TUSK.x) + 6, p.jaw);
    this.tusk.setPosition(tx - HEAD_O.x, ty - HEAD_O.y).setRotation(jawRot);
    const mf = p.jaw * (MAW_N - 1);
    this.maw.each((im) => im.setVisible(p.jaw > 0.02));
    this.maw.show(mf, MAW_N, false);
    // the eye: a glare; wide as he draws breath; rolled up when dazed; the stone lids blink
    this.blinkT -= dt;
    if (this.blinkT <= 0 && this.blink < 0) {
      this.blink = 0;
      this.blinkT = 2.2 + crand() * 3.5;
    }
    let lid = 0;
    if (this.blink >= 0) {
      this.blink += dt / 0.2;
      lid = Math.round(3 * Math.sin(Math.min(1, this.blink) * Math.PI));
      if (this.blink >= 1) this.blink = -1;
    }
    if (p.daze > 0.3) lid = Math.max(lid, 1);
    this.eye.setFrame(p.daze > 0.3 ? (Math.floor(this.t * 3) % 2 ? 2 : 3) : p.inhale > 0.4 ? 1 : 0);
    this.lid.setFrame(lid).setVisible(lid > 0);
    const glow = (0.42 + 0.1 * Math.sin(this.t * 2.3)) * (1 + p.inhale * 0.9) * (1 - p.daze * 0.75);
    this.glows[0].setAlpha(Math.min(1, glow)).setScale(1 + p.inhale * 0.35);
    this.glows[1].setAlpha(Math.min(1, glow * 0.6)).setScale(0.5 + p.inhale * 0.2);
    // dazed: stars wheel round its crown
    this.stars.forEach((st, i) => {
      const a = this.t * 3.2 + (i / this.stars.length) * Math.PI * 2;
      st.setVisible(p.daze > 0.05).setAlpha(p.daze * (0.6 + 0.4 * Math.sin(a))).setPosition(140 + Math.cos(a) * 150, -150 + Math.sin(a) * 30).setScale(0.55 + 0.25 * Math.sin(a));
    });
    // the kelp hangs straight down from where it's caught, whichever way the head points, and sways, harder (and
    // trailing) as the head swings
    const hang = p.tilt - 0.24 * kick - Math.max(-0.3, Math.min(0.3, vx * 0.0006)) * side;
    for (const kl of this.kelp) {
      kl.ph += dt * (2.4 + Math.min(6, Math.abs(vx) * 0.012));
      kl.f.show(kl.ph, KELP_N);
      kl.f.each((im) => im.setRotation(hang));
    }
    // the water pouring off it after it surfaces
    if (this.cascade) {
      if (this.cascadeT >= 0) {
        this.cascadeT += dt / 1.5;
        const u = Math.min(1, this.cascadeT);
        this.cascade.setFrame(Math.min(CASCADE.n - 1, Math.floor(u * CASCADE.n))).setAlpha(0.72 * (u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25));
        if (this.cascadeT >= 1) this.cascadeT = -1;
      } else this.cascade.setAlpha(0);
    }
    // a smack: the head flashes pale
    if (this.flashT > 0) {
      this.flashT -= dt;
      const on = this.flashT > 0;
      head.each((o: Phaser.GameObjects.GameObject) => {
        const im = o as Img;
        if (im.blendMode !== Phaser.BlendModes.ADD) {
          if (on) im.setTint(0xffe8e0);
          else im.clearTint();
        }
      });
    }
    // steam from the nostrils (drawn in while he inhales), drips off the kelp and the chin
    this.steamT -= dt;
    if (this.steamT <= 0 && p.y < this.edgeY - 100) {
      this.steamT = p.inhale > 0.2 ? 0.05 : 0.2;
      for (const [nx, ny] of NOSES) {
        const [wx, wy] = this.world(nx, ny);
        if (p.inhale > 0.2) {
          const a = crand() * Math.PI * 2;
          const d = 50 + crand() * 40;
          this.part('soft', wx + Math.cos(a) * d, wy + Math.sin(a) * d * 0.6, -Math.cos(a) * d * 2.4, -Math.sin(a) * d * 1.4, 0.4, 22, 4, 0.22, 0, 0, 0xeef2ff, false);
        } else this.part('soft', wx, wy, p.face * (16 + crand() * 24), -24 - crand() * 30, 1.6, 8, 42, 0.2 * (1 - p.daze * 0.5), -10, 0.6, 0xe8eef8, false);
      }
    }
    this.dripT -= dt;
    if (this.dripT <= 0) {
      this.dripT = this.cascadeT >= 0 ? 0.03 : 0.16;
      const src = crand() < 0.5 ? KELP[Math.floor(crand() * KELP.length)] : null;
      const [lx, ly] = src ? [src.x, src.y + KELP_F[src.kind].h - KELP_F[src.kind].ay - 20] : jawTurn(120 + crand() * 400, 420, p.jaw);
      const [dx, dy] = this.world(lx, ly);
      this.part('drop', dx, dy, (crand() - 0.5) * 20, 40, 1.2, 4, 3, 0.85, 1100, 0.1, 0xdde8ff, true);
    }
  }

  private stepParts(dt: number): void {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const q = this.parts[i];
      q.age += dt;
      const u = q.age / q.life;
      // water falls back into the sea at the waterline
      if (u >= 1 || (q.water && q.vy > 0 && q.y > this.edgeY + 4 && (this.pose?.masked ?? true))) {
        q.img.destroy();
        this.parts.splice(i, 1);
        continue;
      }
      q.vy += q.grav * dt;
      const dr = Math.exp(-q.drag * dt);
      q.vx *= dr;
      q.vy *= dr;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      const s = q.s0 + (q.s1 - q.s0) * u;
      q.img.setPosition(q.x, q.y).setScale(s / 32).setAlpha(q.a * Math.min(1, u * 6) * (1 - u));
      if (q.water) q.img.setRotation(Math.atan2(q.vy, q.vx) - Math.PI / 2);
    }
  }

  private dying = false;

  /** He's beaten: the head (if it's up) crashes back into the sea, jaws gaping, with a great splash, the coils sink
   * away one after another; then it all goes. Runs on its own (the brain is gone). */
  die(): void {
    if (this.dying) return;
    this.dying = true;
    const p: HeadPose = this.pose ? { ...this.pose } : { x: 960, y: this.edgeY + 400, gap: 960, face: -1, shown: false, masked: true, jaw: 0, inhale: 0, daze: 0, scale: 1, tilt: HEAD_TILT, boil: 0 };
    const t0 = this.t;
    let fell = false;
    this.coils.forEach((c, i) =>
      c.f.each((im) => this.sc.tweens.add({ targets: im, y: this.edgeY + 280, duration: 1000, delay: 250 + i * 110, ease: 'Sine.In', onStart: () => i % 2 || this.splash(c.x, 1.2, 0.9) })),
    );
    const tick = (_t: number, ms: number) => {
      const dt = Math.min(0.05, ms / 1000);
      const u = this.t - t0;
      if (p.shown) {
        p.masked = true;
        p.daze = 1;
        p.jaw = Math.min(1, p.jaw + dt * 3);
        p.tilt += dt * 0.6;
        p.x += (p.gap - p.x) * Math.min(1, dt * 4);
        p.y += dt * (120 + u * 1400);
        if (!fell && p.y > this.edgeY - 60) {
          fell = true;
          this.splash(p.gap, 3, 0.8);
        }
      }
      p.boil = 0;
      this.update(dt, p);
      if (u > 2.2) end();
    };
    const end = () => {
      this.sc.events.off('update', tick);
      this.sc.events.off('shutdown', end);
      this.destroy();
    };
    this.sc.events.on('update', tick);
    this.sc.events.once('shutdown', end);
  }

  private destroyed = false;

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const c of this.coils) c.f.each((im) => im.destroy());
    this.coils = [];
    this.coilRoot.destroy();
    for (const s of this.splashes) s.img.destroy();
    this.splashes = [];
    for (const q of this.parts) q.img.destroy();
    this.parts = [];
    this.head?.destroy();
    for (const n of this.neck) n.destroy();
    this.neck = [];
    this.tube?.destroy();
    this.tube = null;
    this.collar?.each((im) => im.destroy());
    this.partRoot?.destroy();
    this.maskG.destroy();
    this.head = null;
    SerpentRig.alive--;
    // his textures (about 25 MB) go with him: a later meeting paints them again
    SerpentRig.dropTextures(this.sc.game);
  }

  /** Rigs alive now: their textures are never dropped from under them. */
  private static alive = 0;

  /** Remove the jsr_ textures nothing shows any more. Some outlive the rig (the stone chips its death throws into the
   * fx layer fly on under the death's slow motion; removing their texture under them crashed the renderer), so the
   * ones still on screen are retried a moment later, unless a new rig has come along and taken them over. */
  private static dropTextures(game: Phaser.Game, tries = 10): void {
    if (SerpentRig.alive > 0) return;
    const inUse = texturesInUse(game);
    let left = false;
    for (const key of game.textures.getTextureKeys()) {
      if (!key.startsWith('jsr_')) continue;
      if (inUse.has(key)) left = true;
      else game.textures.remove(key);
    }
    if (left && tries > 0) setTimeout(() => SerpentRig.dropTextures(game, tries - 1), 1000);
  }
}
