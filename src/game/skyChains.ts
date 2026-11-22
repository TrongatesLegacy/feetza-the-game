// Chains from the sky: heavy chains that come down from above the top of the screen and hold a foot by its ankle
// (Kronos, chained in Tartarus; his live art in src/content/styleLive/acts-f.ts owns them).
//
// Each chain is a verlet rope in the feet layer's frame (world px), pinned at an anchor above the top of the screen
// and at a point on the foot (a design point, following its rig). Its length pays out and reels in slowly behind the
// foot, so it hangs with slack while he hovers, draws straight and taut when he dives or stomps faster than it can
// pay out (and when he winds up, straining against it), and sags in a loop as he lifts. It sways with his moves,
// shudders and rattles when it snaps taut, and on landing a wave runs up it. The links are images of baked link
// textures laid along the rope, face-on and edge-on in turn.
//
// A fight can drive it (a later phase that holds him back): setTension(0 … 1) takes the slack out (1: hauled taut),
// and setAnchor() pins an anchor where the fight wants it. Cosmetic randomness only through crand().

import Phaser from 'phaser';
import { crand } from '../systems/cosmeticRandom';
import { save } from '../systems/save';
import type { Foot } from './Foot';

export interface SkyChainSpec {
  /** Where it holds the foot (a design point, src/art/style space). */
  at: [number, number];
  /** Its anchor's x, from the foot's (design units: scaled with the foot). */
  dx: number;
  /** Behind the leg and the foot (true) or over them. */
  behind: boolean;
}

export interface SkyChainLook {
  /** Baked link textures: face-on (an open ring) and edge-on (a bar), both lying along +x. */
  face: string;
  edge: string;
  /** A link's length in world px at the foot's scale 1 (its pitch along the chain). */
  pitch: number;
  /** The link images' scale (texture px → world px) at the foot's scale 1. */
  scale: number;
}

/** Rope points per chain (the links are laid along them, so they needn't be one per link). */
const NODES = 16;
/** The solver's fixed step. */
const H = 1 / 120;
/** World px above the top of the screen the anchors sit (high, so even near the top they come down from above). */
const ABOVE = 300;

interface Chain {
  spec: SkyChainSpec;
  /** Points now and one step ago (world px), node 0 at the foot, the last at the anchor. */
  p: [number, number][];
  q: [number, number][];
  /** Current length (world px). */
  len: number;
  /** The anchor (world px), following the foot slowly; `pinned` holds it where a fight put it. */
  ax: number;
  ay: number;
  pinned: boolean;
  faces: Phaser.GameObjects.Container;
  edges: Phaser.GameObjects.Container;
  links: Phaser.GameObjects.Image[];
  /** How taut it was last frame (0 slack … 1 straight), and a rattle that decays. */
  taut: number;
  rattle: number;
}

const owned = new WeakMap<Foot, SkyChains>();

/** The sky chains holding a foot, if it has any (for a fight to drive). */
export function skyChainsOf(f: Foot): SkyChains | undefined {
  return owned.get(f);
}

export class SkyChains {
  /** 0 hangs slack … 1 hauled taut (a fight holding him back). */
  tension = 0;
  private chains: Chain[];
  private back: Phaser.GameObjects.Container;
  private front: Phaser.GameObjects.Container;
  private acc = 0;
  private freed = false;
  private sc: Phaser.Scene;
  // reused every frame (no garbage)
  private mat = new Phaser.GameObjects.Components.TransformMatrix();
  private tmp = new Phaser.GameObjects.Components.TransformMatrix();
  private pt = new Phaser.Math.Vector2();
  private cum = new Float64Array(NODES);

  constructor(private f: Foot, specs: SkyChainSpec[], private look: SkyChainLook) {
    this.sc = f.scene;
    // two layers in the feet layer's frame (they undo the foot's own transform each frame): behind the leg, and over it
    this.back = this.sc.add.container(0, 0);
    this.front = this.sc.add.container(0, 0);
    f.addLiveFx(this.back, true);
    f.addLiveFx(this.front, false);
    this.follow();
    this.chains = specs.map((spec) => {
      const [fx, fy] = f.styleWorld(spec.at[0], spec.at[1]);
      const ax = fx + spec.dx * this.k();
      const ay = this.top();
      const layer = spec.behind ? this.back : this.front;
      const faces = this.sc.add.container(0, 0);
      const edges = this.sc.add.container(0, 0);
      layer.add([faces, edges]);
      const p: [number, number][] = [];
      for (let i = 0; i < NODES; i++) {
        const t = i / (NODES - 1);
        p.push([fx + (ax - fx) * t, fy + (ay - fy) * t]);
      }
      const len = Math.hypot(ax - fx, ay - fy) * 1.12;
      return { spec, p, q: p.map((v) => [v[0], v[1]] as [number, number]), len, ax, ay, pinned: false, faces, edges, links: [], taut: 0, rattle: 0 };
    });
    owned.set(f, this);
  }

  /** Take the slack out of the chains: 0 hang slack … 1 hauled taut. */
  setTension(t: number): void {
    this.tension = Phaser.Math.Clamp(t, 0, 1);
  }

  /** Pin chain i's anchor at a point (world px, the feet layer's frame); null lets it follow the foot again. */
  setAnchor(i: number, at: [number, number] | null): void {
    const c = this.chains[i];
    if (!c) return;
    c.pinned = !!at;
    if (at) [c.ax, c.ay] = at;
  }

  /** How taut chain i is now (0 slack … 1 straight). */
  tautness(i: number): number {
    return this.chains[i]?.taut ?? 0;
  }

  /** World px per design unit at the foot's size. */
  private k(): number {
    return this.f.type.scale * Math.max(0.2, this.f.root.scaleX);
  }

  /** The top of the screen in the feet layer's frame (or the top of a cropped leg, in the dev views), minus a margin:
   * where the anchors sit, out of sight. */
  private top(): number {
    const layer = this.f.root.parentContainer;
    const cam = this.sc.cameras.main;
    let y = cam.worldView.y;
    let s = 1;
    if (layer) {
      const m = layer.getWorldTransformMatrix(this.mat, this.tmp);
      s = Math.hypot(m.a, m.b) || 1;
      y = m.applyInverse(cam.worldView.centerX, cam.worldView.y, this.pt).y;
    }
    const legTop = this.f.root.y + this.f.legTopLocal * this.f.root.scaleY;
    return Math.max(y, legTop) - ABOVE / s;
  }

  /** Keep the layers on the feet layer's frame, whatever the foot's container does. */
  private follow(): void {
    const r = this.f.root;
    const c = Math.cos(-r.rotation);
    const s = Math.sin(-r.rotation);
    for (const l of [this.back, this.front]) {
      l.setRotation(-r.rotation).setScale(1 / r.scaleX, 1 / r.scaleY);
      l.setPosition((c * -r.x - s * -r.y) / r.scaleX, (s * -r.x + c * -r.y) / r.scaleY);
    }
  }

  /** A slam: every chain jolts (a wave runs up it from the foot) and rattles. */
  jolt(power = 1): void {
    const calm = save.settings.reducedMotion ? 0.35 : 1;
    for (const c of this.chains) {
      const side = Math.sign(c.ax - c.p[0][0]) || 1;
      for (let i = 1; i < NODES - 1; i++) {
        const t = i / (NODES - 1);
        const w = Math.sin(t * Math.PI) * (1 - t * 0.5);
        c.q[i][0] -= -side * 7 * w * power * calm * this.k() * 0.4;
        c.q[i][1] -= -5 * w * power * calm * this.k() * 0.4;
      }
      c.rattle = Math.max(c.rattle, 0.5 * power);
    }
  }

  /**
   * Step the chains and lay their links. `windingUp`: he strains (the chains draw taut and rattle); `landed`: he just
   * landed a stomp (a jolt).
   */
  update(dt: number, o: { windingUp?: boolean; landed?: boolean } = {}): void {
    if (dt <= 0) return;
    const f = this.f;
    const calm = save.settings.reducedMotion ? 0.35 : 1;
    const k = this.k();
    if (!this.freed) this.follow();
    if (o.landed) this.jolt(1);
    const top = this.freed ? 0 : this.top();
    for (const c of this.chains) {
      // the foot end follows the foot; the anchor drifts after it, out of sight above the screen
      if (!this.freed) {
        const [fx, fy] = f.styleWorld(c.spec.at[0], c.spec.at[1]);
        c.p[0][0] = fx;
        c.p[0][1] = fy;
        if (!c.pinned) {
          c.ax += (fx + c.spec.dx * k - c.ax) * Math.min(1, dt * 0.9);
          c.ay = top;
        }
      }
      const last = c.p[NODES - 1];
      last[0] = c.ax;
      last[1] = c.ay;
      // let go: it keeps its length and swings loose from its anchor
      if (this.freed) {
        c.rattle = Math.max(0, c.rattle - dt * 1.6);
        continue;
      }
      // the length pays out and reels in slowly behind the foot: slack at rest, taut when it outruns them
      const dist = Math.hypot(c.p[0][0] - c.ax, c.p[0][1] - c.ay);
      // (diving and standing on the table he's at the end of his chains: they draw straight)
      const reach = f.state === 'descend' || f.state === 'stomp' ? 0.03 : o.windingUp ? 0.15 : 1;
      const slack = (0.13 * (1 - this.tension) + 0.004) * reach;
      const want = dist * (1 + slack);
      if (want > c.len) c.len = Math.min(want, c.len + 240 * k * dt);
      else c.len = Math.max(want, c.len - 170 * k * dt);
      const wasTaut = c.taut;
      if (!this.freed && c.len < dist) c.len = dist;
      c.taut = Phaser.Math.Clamp(1 - (c.len - dist) / (dist * 0.05 + 1), 0, 1);
      // snapping taut: it shudders
      if (c.taut > 0.95 && wasTaut < 0.8) c.rattle = Math.max(c.rattle, 0.7);
      if (o.windingUp) c.rattle = Math.max(c.rattle, 0.35);
      c.rattle = Math.max(0, c.rattle - dt * 1.6);
    }
    // fixed steps (verlet's velocity is the last step's movement, so every step must be the same length)
    this.acc = Math.min(this.acc + dt, H * 8);
    for (; this.acc >= H; this.acc -= H) for (const c of this.chains) this.step(c, k, calm);
    this.lay();
  }

  private step(c: Chain, k: number, calm: number): void {
    const n = NODES - 1;
    const seg = c.len / n;
    const g = 1700 * k * 0.5 * H * H;
    const shake = c.rattle * 3.2 * k * 0.4 * calm;
    const first = this.freed ? 0 : 1;
    for (let i = first; i < n; i++) {
      const p = c.p[i];
      const q = c.q[i];
      const x = p[0];
      const y = p[1];
      p[0] = x + (x - q[0]) * 0.985 + (shake ? (crand() - 0.5) * shake : 0);
      p[1] = y + (y - q[1]) * 0.985 + g;
      q[0] = x;
      q[1] = y;
    }
    for (let it = 0; it < 14; it++) {
      for (let i = 0; i < n; i++) {
        const p0 = c.p[i];
        const p1 = c.p[i + 1];
        const dx = p1[0] - p0[0];
        const dy = p1[1] - p0[1];
        const d = Math.hypot(dx, dy) || 1e-6;
        const e = (d - seg) / d;
        // a chain only resists stretching (it bunches freely)
        if (e <= 0) continue;
        const w0 = i === 0 && !this.freed ? 0 : 0.5;
        const w1 = i + 1 === n ? 0 : 0.5;
        const ws = w0 + w1 || 1;
        p0[0] += (dx * e * w0) / ws;
        p0[1] += (dy * e * w0) / ws;
        p1[0] -= (dx * e * w1) / ws;
        p1[1] -= (dy * e * w1) / ws;
      }
    }
  }

  /** Lay the links along the rope from the foot up: one every pitch, face-on and edge-on in turn. */
  private lay(): void {
    const k = this.k();
    const pitch = this.look.pitch * k;
    const vis = this.freed ? 1 : this.f.visualAlpha;
    for (const c of this.chains) {
      // arc length along the rope
      const cum = this.cum;
      cum[0] = 0;
      for (let i = 1; i < NODES; i++) cum[i] = cum[i - 1] + Math.hypot(c.p[i][0] - c.p[i - 1][0], c.p[i][1] - c.p[i - 1][1]);
      const total = cum[NODES - 1];
      const count = Math.max(1, Math.floor(total / pitch));
      const step = total / count;
      while (c.links.length < count) {
        const i = c.links.length;
        const face = i % 2 === 0;
        const img = this.sc.add.image(0, 0, face ? this.look.face : this.look.edge).setOrigin(0.5, 0.5);
        (face ? c.faces : c.edges).add(img);
        c.links.push(img);
      }
      let seg = 0;
      for (let j = 0; j < c.links.length; j++) {
        const img = c.links[j];
        if (j >= count) {
          img.setVisible(false);
          continue;
        }
        const s = (j + 0.5) * step;
        while (seg < NODES - 2 && cum[seg + 1] < s) seg++;
        const a = c.p[seg];
        const b = c.p[seg + 1];
        const l = cum[seg + 1] - cum[seg] || 1;
        const t = (s - cum[seg]) / l;
        img
          .setVisible(true)
          .setPosition(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
          .setRotation(Math.atan2(b[1] - a[1], b[0] - a[0]))
          .setScale(this.look.scale * k * (step / pitch))
          .setAlpha(vis);
      }
    }
  }

  /** The foot is gone: the chains let go of it and swing from their anchors, then fade (they stay where they are in
   * the feet layer). */
  release(): void {
    if (this.freed) return;
    this.freed = true;
    owned.delete(this.f);
    const layer = this.f.root.parentContainer;
    if (!layer || !this.front.active || !this.sc.sys.isActive()) {
      this.destroy();
      return;
    }
    for (const l of [this.back, this.front]) {
      this.f.root.remove(l);
      layer.add(l);
      l.setPosition(0, 0).setRotation(0).setScale(1);
    }
    let t = 0;
    const stop = () => {
      this.sc.events.off('update', tick);
      this.sc.events.off('shutdown', stop);
      if (this.back.active) this.back.destroy();
      if (this.front.active) this.front.destroy();
    };
    const tick = (_time: number, delta: number) => {
      const dt = Math.min(0.05, delta / 1000);
      t += dt;
      if (!this.front.active || t > 1.6) return stop();
      this.update(dt);
      const a = Math.min(1, (1.6 - t) / 0.6);
      this.back.setAlpha(a);
      this.front.setAlpha(a);
    };
    this.sc.events.on('update', tick);
    this.sc.events.once('shutdown', stop);
  }

  destroy(): void {
    this.freed = true;
    owned.delete(this.f);
    if (this.back.active) this.back.destroy();
    if (this.front.active) this.front.destroy();
  }
}
