// Always-aflame peels: one flame engine, styled per peel. The head burns with three rings of tongues (an
// outlined outer ring in the game's cartoon style, a body and a hot core) licking up whichever way the peel
// leans, over a soft normal-blended glow, with loose licks breaking off the top, embers shed as it moves and a
// fire ribbon behind it. Each style is data (colour ramp, tongue height, count, flicker, ember kind, trail) plus
// a few special touches: facets, colour shift, lava cracks and drips, campfire crackle, a white-hot core, soul
// wisps, a solar corona, ash, devil horns and an orange flare. Calmer than Kratos's 30 s rage (src/game/godMoves.ts):
// shorter tongues, a smaller glow, fewer embers.

import { Bit, Bits, HEAD_R, INK, Rings, Trail, TrailKind, cycleC, lerpC, rand, shadeC, toWorld, upAngle, type Frame, type LookCore, type Pen, type TrailStyle } from './lookKit';
import { crand } from '../systems/cosmeticRandom';

export interface FireStyle {
  /** Tongue colours: outer (outlined), body, core. */
  ramp: readonly [number, number, number];
  /** The outer tongues' outline. */
  outline: number;
  /** Tongue length on the upper side, in the peel's frame (the head's radius is 86). */
  height: number;
  /** How much of that length the underside keeps, 0–1. */
  under: number;
  /** Below this (the dot of a tongue's spot with up, -1…1) nothing burns: tongues rising up from the bottom of a
   *  narrow head (a foot) would show across it like teeth. -1 burns all round. */
  cut?: number;
  /** Tongues in the outer ring. */
  count: number;
  /** Flicker speed (rad/s). */
  flicker: number;
  /** Sway, as a share of a tongue's length. */
  sway: number;
  /** The soft glow behind it, and how strong. */
  glow: number;
  glowA: number;
  /** Embers shed off the top: their kind, colours (hot → cool), per second when still, size in px. */
  ember: { kind: Bit; c0: number; c1: number; rate: number; size: number; life: number; rise: number };
  /** A hot rim hugging the top of the head, over the art. */
  rim?: number;
  trail: TrailStyle;
  // ——— special touches ———
  /** Angular, gem-cut tongues with a light facet line (Ruby). */
  facets?: boolean;
  /** Tongue colours cycle round this palette (Fire Opal). */
  shift?: readonly number[];
  /** Glowing cracks over the head (Magma Toes). */
  cracks?: boolean;
  /** Molten drips off the underside, per second. */
  drips?: number;
  /** Crackling spark bursts, per second (a campfire, a forge). */
  crackle?: number;
  /** A white-hot core glowing through the head. */
  core?: number;
  /** Soul wisps drifting up, per second. */
  wisps?: number;
  /** Rotating solar rays behind the flames, in this colour. */
  corona?: number;
  /** Ash flakes, per second. */
  ash?: number;
  /** Two tall horn-like tongues. */
  horns?: boolean;
  /** Now and then the flame flares to this ramp (and grows). */
  flare?: readonly [number, number, number];
  /** Shiny variants: twinkles on the head, per second. */
  glints?: number;
}

const ribbon = (edge: number, body: number, core: number, w = 30, life = 0.38, a = 0.85): TrailStyle => ({ kind: TrailKind.Ribbon, c: [edge, body, core], w, life, a });

const BASE: Omit<FireStyle, 'ramp' | 'outline' | 'ember' | 'trail'> = { height: 118, under: 0.34, count: 13, flicker: 7, sway: 0.3, glow: 0xff7a1a, glowA: 0.34 };
const ember = (c0: number, c1: number, rate = 5, size = 3.6, life = 0.8, kind = Bit.Ember, rise = 70) => ({ kind, c0, c1, rate, size, life, rise });

export const FIRE: Record<string, FireStyle> = {
  // Ruby Crown: crimson, gem-like facets of flame, with pink glints
  ruby: { ...BASE, ramp: [0x9a0a24, 0xe8183e, 0xff8aa0], outline: 0x3a0612, glow: 0xe8183e, height: 104, count: 11, flicker: 5.5, facets: true, rim: 0xffb0c0, ember: ember(0xffd0dc, 0xff3d6e, 4, 5, 0.7, Bit.Glint, 55), trail: ribbon(0x8a0a20, 0xe8183e, 0xffd0dc) },
  // Fire Opal: iridescent flame whose colours shift round the opal's play of colour
  opal: { ...BASE, ramp: [0xff7a3a, 0xffb070, 0xfff0d8], outline: 0x4a1a2a, glow: 0xff9a5a, glowA: 0.36, height: 120, shift: [0xff6a3a, 0xff4d9a, 0xa77dff, 0x3ad0ff, 0x5fe8a0, 0xffd23f], rim: 0xfff4e0, ember: ember(0xffffff, 0x5fd8ff, 5, 4.2, 0.8, Bit.Glint, 60), trail: { kind: TrailKind.Prism, c: [0, 0, 0], w: 34, life: 0.42, a: 0.85 } },
  // Magma Toes: molten cracks, dripping lava, slow embers
  lava: { ...BASE, ramp: [0x8a1a06, 0xff5a14, 0xffc040], outline: 0x2a0a04, glow: 0xff5a14, height: 86, under: 0.5, flicker: 4, sway: 0.14, cracks: true, drips: 1.6, ember: ember(0xffe08a, 0xd8361a, 2.2, 4.2, 1.5, Bit.Ember, 34), trail: ribbon(0x6a1004, 0xff5a14, 0xffd070, 32, 0.5) },
  // Fireside Fay: a cosy campfire, crackling sparks and a warm glow
  fireside: { ...BASE, ramp: [0xc8401a, 0xff8a2a, 0xffe080], outline: INK, glow: 0xffa040, glowA: 0.4, height: 96, under: 0.22, flicker: 8, crackle: 1.3, ember: ember(0xfff2b0, 0xff6a1a, 3, 3, 0.9), trail: ribbon(0xa8300e, 0xff8a2a, 0xfff0c0, 26) },
  // Human Scorch: the whole head ablaze, a bright white-hot core
  humanscorch: { ...BASE, ramp: [0xe8401a, 0xffa030, 0xfff6c0], outline: 0x5a1a0a, glow: 0xffb040, glowA: 0.4, height: 128, under: 0.78, cut: -1.1, count: 15, flicker: 9, sway: 0.24, core: 0xfff8e0, rim: 0xffffff, ember: ember(0xffffff, 0xff8a1a, 7, 3.6, 0.7), trail: ribbon(0xc8301a, 0xffa030, 0xffffff, 36, 0.42) },
  // Ghost Roaster: ghostly blue-green hellfire with soul wisps
  ghostroaster: { ...BASE, ramp: [0x0a7a7a, 0x3ae0c0, 0xd8fff4], outline: 0x06302e, glow: 0x3ae0c0, glowA: 0.34, height: 120, flicker: 6, sway: 0.3, wisps: 0.9, rim: 0xd8fff4, ember: ember(0xe8fff8, 0x2ab8a0, 3.5, 3.2, 1), trail: ribbon(0x065a58, 0x2ad0b0, 0xe8fff8, 30, 0.45) },
  // Hyperion: a solar corona with rotating rays
  hyperion: { ...BASE, ramp: [0xe8742a, 0xffb030, 0xfff2a8], outline: 0x6a2a08, glow: 0xffc040, glowA: 0.38, height: 70, under: 0.85, cut: -1.1, count: 16, flicker: 6, corona: 0xffd23f, ember: ember(0xfff8c0, 0xffb030, 3, 3, 1, Bit.Mote, 40), trail: ribbon(0xd8741a, 0xffd23f, 0xffffff, 34) },
  // Surtr: black-red Ragnarök fire with ash
  surtr: { ...BASE, ramp: [0x2a0806, 0xb81a0c, 0xff6a1a], outline: 0x000000, glow: 0xb81a0c, glowA: 0.36, height: 132, count: 14, flicker: 6.5, sway: 0.26, ash: 3.5, rim: 0xff8a3a, ember: ember(0xffb040, 0xb81a0c, 3, 3.4, 0.9), trail: ribbon(0x1a0604, 0xa8160c, 0xff8a3a, 36, 0.45) },
  // Diavola: devil-red, with flickering horn-like tongues
  diavola: { ...BASE, ramp: [0xa80a12, 0xe8281a, 0xffa040], outline: 0x3a0606, glow: 0xe8281a, height: 92, count: 12, flicker: 10, sway: 0.16, horns: true, ember: ember(0xffd080, 0xd8201a, 4), trail: ribbon(0x8a0a0a, 0xe8281a, 0xffc080) },
  // Tarte Flambée: a blue alcohol flame that flares orange now and then
  flambee: { ...BASE, ramp: [0x1a4ad8, 0x4aa0ff, 0xdff4ff], outline: 0x0a1a5a, glow: 0x4a9aff, glowA: 0.3, height: 98, under: 0.3, flicker: 5, sway: 0.28, flare: [0xd8401a, 0xff8a2a, 0xffe8a0], ember: ember(0xdff4ff, 0x4a9aff, 2.5, 3, 0.7, Bit.Mote, 60), trail: ribbon(0x1a3ab8, 0x4aa0ff, 0xffffff, 28) },
  // ——— other fiery peels ———
  // Inferno Calzone: a big, roaring orange fire
  inferno: { ...BASE, ramp: [0xd8261a, 0xff7a1a, 0xffd23f], outline: INK, height: 126, count: 14, flicker: 8, ember: ember(0xffe08a, 0xd8261a, 6), trail: ribbon(0xa8160c, 0xff7a1a, 0xfff0c0, 34) },
  // Volcano Pizza: an eruption: lava drips and spitting sparks
  volcano: { ...BASE, ramp: [0x9a1a06, 0xff5014, 0xffc040], outline: 0x2a0a04, glow: 0xff5014, height: 104, under: 0.4, flicker: 6, drips: 1.2, crackle: 0.8, ember: ember(0xffe08a, 0xd8361a, 3, 4, 1.1), trail: ribbon(0x6a1004, 0xff5a14, 0xffd070, 32, 0.45) },
  // Dragon Fruit Flambé: hot-pink dragon fire with green sparks
  dragonfruit: { ...BASE, ramp: [0xb0106a, 0xff3da0, 0xffd0ec], outline: 0x3a0626, glow: 0xff3da0, glowA: 0.3, height: 108, flicker: 7.5, ember: ember(0xd8ffb0, 0x5fc83a, 4, 3.4, 0.8), trail: ribbon(0x8a0a52, 0xff3da0, 0xffe0f2) },
  // Hestia: the hearth: a low, steady golden fire
  hestia: { ...BASE, ramp: [0xd8601a, 0xffa83a, 0xfff0b0], outline: 0x5a2a0a, glow: 0xffb040, glowA: 0.36, height: 80, under: 0.28, flicker: 4.5, sway: 0.12, ember: ember(0xfff2c0, 0xff9a3a, 2, 3, 1.1, Bit.Mote, 40), trail: ribbon(0xc8601a, 0xffb040, 0xfff6d8, 26) },
  // Hephaestus: the forge: orange fire and showers of anvil sparks
  hephaestus: { ...BASE, ramp: [0xc8401a, 0xff8a2a, 0xffe080], outline: INK, height: 90, under: 0.3, flicker: 7, crackle: 2, ember: ember(0xfff2b0, 0xff6a1a, 2.5, 3), trail: ribbon(0x8a2a0a, 0xff8a2a, 0xfff0c0, 28) },
};

/** Shiny and mastered variants burn the same, a touch brighter, with twinkles. */
const bright = (st: FireStyle): FireStyle => ({ ...st, glowA: st.glowA + 0.06, glints: 2.2 });
/** Peel id → its fire. */
export const FIRE_PEELS: Record<string, FireStyle> = {
  ruby: FIRE.ruby,
  'master:ruby': { ...bright(FIRE.ruby), height: 118 },
  'ultra:opal': FIRE.opal,
  'foot:lava': FIRE.lava,
  'shiny:lava': bright(FIRE.lava),
  'foot:fireside': FIRE.fireside,
  'shiny:fireside': bright(FIRE.fireside),
  'hero:humanscorch': FIRE.humanscorch,
  'hero:ghostroaster': FIRE.ghostroaster,
  'foot:hyperion': FIRE.hyperion,
  'shiny:hyperion': bright(FIRE.hyperion),
  'boss:surtr': FIRE.surtr,
  'pizza:diavola': FIRE.diavola,
  'pizza:flambee': FIRE.flambee,
  'pizza:infernocalzone': FIRE.inferno,
  'pizza:volcano': FIRE.volcano,
  'pizza:dragonfruit': FIRE.dragonfruit,
  'hero:hestia': FIRE.hestia,
  'hero:hephaestus': FIRE.hephaestus,
};

// px in play at the default peel size (0.62) → the frame's units
const PX = 1 / 0.62;
const LICKS = 6;

class FireCore implements LookCore {
  private bits = new Bits(72);
  private trail = new Trail();
  private rings = new Rings();
  private pts = new Float32Array(24);
  private ramp = new Float32Array(3);
  private t = crand() * 10;
  private emberAcc = 0;
  private extraAcc = new Float32Array(6);
  private crackleT = 0.5;
  // loose licks (in the peel's frame): angle off up, distance risen, age, life, size
  private la = new Float32Array(LICKS);
  private ld = new Float32Array(LICKS);
  private lt = new Float32Array(LICKS).fill(9);
  private ll = new Float32Array(LICKS).fill(1);
  private ls = new Float32Array(LICKS);
  private lnext = 0;
  private lickAcc = 0;
  // flare: time to the next one, and its age
  private flareIn = rand(2, 4);
  private flareAge = 9;
  private amt = 0;
  // the lava cracks: three short jagged lines across the head
  private cracks = new Float32Array(30);

  constructor(private st: FireStyle) {
    if (st.cracks) {
      const c = this.cracks;
      for (let k = 0; k < 3; k++) {
        let x = -46 + k * 40 + rand(-8, 8);
        let y = -50 + rand(-10, 30);
        for (let q = 0; q < 5; q++) {
          c[k * 10 + q * 2] = x;
          c[k * 10 + q * 2 + 1] = y;
          x += rand(-12, 14);
          y += rand(14, 24);
        }
      }
    }
  }

  reset(): void {
    this.bits.clear();
    this.trail.reset();
    this.lt.fill(9);
  }

  /** How hot the flare is right now (0–1). */
  private flareAmt(): number {
    const a = this.flareAge;
    if (a < 0.15) return a / 0.15;
    if (a < 0.5) return 1;
    return Math.max(0, 1 - (a - 0.5) / 0.45);
  }

  private col(k: 0 | 1 | 2, i: number, n: number): number {
    const st = this.st;
    if (st.shift) {
      const c = cycleC(st.shift, i / n + this.t * 0.11 + k * 0.17);
      return k === 0 ? c : shadeC(c, k * 0.3);
    }
    return this.ramp[k];
  }

  tick(dt: number, f: Frame): void {
    const st = this.st;
    this.t += dt * (f.calm ? 0.55 : 1);
    // flare timing
    if (st.flare) {
      this.flareAge += dt;
      this.flareIn -= dt;
      if (this.flareIn <= 0) {
        this.flareIn = rand(2.8, 5.5);
        this.flareAge = 0;
      }
      this.amt = this.flareAmt();
      for (let k = 0; k < 3; k++) this.ramp[k] = lerpC(st.ramp[k], st.flare[k], this.amt);
    } else for (let k = 0; k < 3; k++) this.ramp[k] = st.ramp[k];
    this.bits.tick(dt);
    // licks rise and fade
    for (let i = 0; i < LICKS; i++) {
      if (this.lt[i] >= this.ll[i]) continue;
      this.lt[i] += dt;
      this.ld[i] += dt * 150;
    }
    if (f.calm) return;
    if (!f.menu) this.trail.push(f.x, f.y, dt);
    const S = f.s * PX;
    const up = upAngle(f);
    const moving = Math.min(3, f.moved / 14);
    // loose licks break off the top
    this.lickAcc += dt * (2.2 + moving * 1.5) * (1 + this.amt);
    while (this.lickAcc >= 1) {
      this.lickAcc -= 1;
      const i = this.lnext;
      this.lnext = (i + 1) % LICKS;
      this.la[i] = rand(-0.7, 0.7);
      this.ld[i] = 0;
      this.lt[i] = 0;
      this.ll[i] = rand(0.25, 0.4);
      this.ls[i] = rand(10, 18) * (st.height / 118);
    }
    // embers off the top, more as it moves
    const e = st.ember;
    this.emberAcc += dt * e.rate * (1 + moving) * (1 + this.amt * 2);
    while (this.emberAcc >= 1) {
      this.emberAcc -= 1;
      const ang = up + rand(-1.1, 1.1);
      const rr = HEAD_R * rand(0.7, 1.05);
      const p = toWorld(f, Math.cos(ang) * rr, Math.sin(ang) * rr);
      this.bits.emit(e.kind, p.x, p.y, rand(-26, 26) * S - f.vx * 0.12, -rand(0.6, 1.2) * e.rise * S - f.vy * 0.12, e.size * S * rand(0.75, 1.2), e.life * rand(0.75, 1.25), e.c0, e.c1, -e.rise * 0.25 * S, 0.6);
    }
    const acc = this.extraAcc;
    // molten drips off the underside (in play: on a peel standing still in a menu they'd only run down its handle)
    if (st.drips && !f.menu) {
      acc[0] += dt * st.drips * (1 + moving * 0.5);
      while (acc[0] >= 1) {
        acc[0] -= 1;
        const ang = up + Math.PI + rand(-0.9, 0.9);
        const p = toWorld(f, Math.cos(ang) * HEAD_R * 0.82, Math.sin(ang) * HEAD_R * 0.82);
        this.bits.emit(Bit.Lava, p.x, p.y, rand(-10, 10) * S, rand(10, 40) * S, 3.6 * S, rand(0.7, 1), 0xffc040, 0xd8361a, 620 * S, 0.3);
      }
    }
    // the campfire's crackle: little bursts of sparks spat up
    if (st.crackle) {
      this.crackleT -= dt * st.crackle * (1 + moving * 0.4);
      if (this.crackleT <= 0) {
        this.crackleT = rand(0.6, 1.4);
        const n = 3 + Math.floor(crand() * 3);
        const ang = up + rand(-0.6, 0.6);
        const p = toWorld(f, Math.cos(ang) * HEAD_R * 0.9, Math.sin(ang) * HEAD_R * 0.9);
        const px = p.x;
        const py = p.y;
        for (let q = 0; q < n; q++) {
          const a2 = -Math.PI / 2 + rand(-0.9, 0.9);
          const sp = rand(180, 330) * S;
          this.bits.emit(Bit.Spark, px, py, Math.cos(a2) * sp, Math.sin(a2) * sp, 1.8 * S, rand(0.3, 0.5), 0xfff4c0, 0xff7a1a, 760 * S, 0.4);
        }
      }
    }
    // soul wisps drift up off the hellfire
    if (st.wisps) {
      acc[1] += dt * st.wisps * (1 + moving * 0.5);
      while (acc[1] >= 1) {
        acc[1] -= 1;
        const ang = up + rand(-0.9, 0.9);
        const p = toWorld(f, Math.cos(ang) * HEAD_R, Math.sin(ang) * HEAD_R);
        this.bits.emit(Bit.Wisp, p.x, p.y, rand(-18, 18) * S, -rand(40, 65) * S, 4.2 * S, rand(1.2, 1.7), 0xd8fff4, 0x3ae0c0, -10 * S, 0.3);
      }
    }
    // ash flakes tumble up and away
    if (st.ash) {
      acc[2] += dt * st.ash * (1 + moving * 0.5);
      while (acc[2] >= 1) {
        acc[2] -= 1;
        const ang = up + rand(-1.2, 1.2);
        const p = toWorld(f, Math.cos(ang) * HEAD_R * 1.1, Math.sin(ang) * HEAD_R * 1.1);
        this.bits.emit(Bit.Ash, p.x, p.y, rand(-30, 30) * S - f.vx * 0.1, -rand(30, 60) * S - f.vy * 0.1, rand(3, 4.6) * S, rand(1, 1.6), 0x2a2220, 0xff6a1a, -8 * S, 0.5);
      }
    }
    // shiny twinkles on the head
    if (st.glints) {
      acc[3] += dt * st.glints;
      while (acc[3] >= 1) {
        acc[3] -= 1;
        const ang = crand() * Math.PI * 2;
        const rr = HEAD_R * rand(0.2, 0.85);
        const p = toWorld(f, Math.cos(ang) * rr, Math.sin(ang) * rr);
        this.bits.emit(Bit.Glint, p.x, p.y, 0, 0, 6 * S, rand(0.45, 0.7), 0xffffff, 0xffe080);
      }
    }
    // a flare throws a puff of embers
    if (st.flare && this.flareAge < dt * 1.5) {
      for (let q = 0; q < 6; q++) {
        const ang = up + rand(-0.8, 0.8);
        const p = toWorld(f, Math.cos(ang) * HEAD_R, Math.sin(ang) * HEAD_R);
        this.bits.emit(Bit.Ember, p.x, p.y, rand(-60, 60) * S, -rand(80, 150) * S, 3.4 * S, rand(0.5, 0.8), 0xffe8a0, 0xff6a1a, -20 * S, 0.8);
      }
    }
  }

  /** A curved, tapering tongue from (bx, by) heading (dx, dy), swaying more towards its tip. */
  private tongue(pen: Pen, bx: number, by: number, dx: number, dy: number, l: number, w: number, sway: number, col: number, outline: boolean): void {
    const p = this.pts;
    const nx = -dy;
    const ny = dx;
    const facets = this.st.facets;
    // gem-cut: three stations (base, shoulder, tip), widest at the shoulder; else five, tapering
    const U = facets ? FACET_U : TONGUE_U;
    const m = U.length;
    for (let q = 0; q < m; q++) {
      const u = U[q];
      const off = sway * u * u;
      const cx = bx + dx * l * u + nx * off;
      const cy = by + dy * l * u + ny * off;
      const hw = (w / 2) * (facets ? FACET_W[q] : TONGUE_W[q]);
      p[q * 2] = cx - nx * hw;
      p[q * 2 + 1] = cy - ny * hw;
      // the right side, written backwards after the left (the tip is shared)
      const j = 2 * m - 2 - q;
      p[j * 2] = cx + nx * hw;
      p[j * 2 + 1] = cy + ny * hw;
    }
    const n = 2 * m - 1;
    pen.poly(p, n, col, 1, outline ? 4.5 : 0, this.st.outline, 0.9);
    if (facets && !outline) {
      // a light facet line from base to tip
      pen.seg(bx, by, p[(m - 1) * 2], p[(m - 1) * 2 + 1], 2.4, 0xffffff, 0.45);
    }
  }

  private ringOf(pen: Pen, k: 0 | 1 | 2, rad: number, n: number, len: number, speed: number, spin: number, f: Frame): void {
    const st = this.st;
    const up = upAngle(f);
    const ux = Math.cos(up);
    const uy = Math.sin(up);
    const t = this.t;
    const calm = f.calm ? 0.5 : 1;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + spin + Math.sin(t * 0.7 + i) * 0.12;
      const cx = Math.cos(ang);
      const cy = Math.sin(ang);
      const dot = cx * ux + cy * uy;
      const cut = st.cut ?? -0.25;
      if (dot < cut) continue;
      const lean = Math.max(0, dot);
      // tongues near the cut die down to nothing rather than stopping short
      const fade = Math.min(1, (dot - cut) / 0.4);
      const flick = 0.78 + calm * (0.22 * Math.sin(t * speed + i * 1.7) + 0.12 * Math.sin(t * speed * 2.3 + i * 3.1));
      // a slow wander in each tongue's height, so the fire is ragged rather than an even crown
      const tall = 0.7 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 2.7 + k)) * (0.6 + 0.4 * Math.sin(t * 0.6 + i * 4.1));
      const l = len * (st.under + (1 - st.under) * lean) * flick * tall * fade;
      let dx = ux * 0.7 + cx * 0.55;
      let dy = uy * 0.7 + cy * 0.55;
      const m = Math.hypot(dx, dy) || 1;
      dx /= m;
      dy /= m;
      // wide enough to overlap: one body of fire, not a ring of spikes
      const w = ((Math.PI * 2 * rad) / n) * (st.facets ? 0.95 : 1.15);
      this.tongue(pen, cx * rad, cy * rad, dx, dy, l, w, Math.sin(t * 7 + i * 2.1) * l * st.sway * calm, this.col(k, i, n), k === 0);
    }
  }

  back(pen: Pen, f: Frame): void {
    const st = this.st;
    const up = upAngle(f);
    const ux = Math.cos(up);
    const uy = Math.sin(up);
    const t = this.t;
    const pulse = 0.88 + 0.1 * Math.sin(t * 5) + 0.05 * Math.sin(t * 13) + 0.25 * this.amt;
    const glowC = st.flare ? lerpC(st.glow, st.flare[1], this.amt) : st.shift ? cycleC(st.shift, t * 0.11) : st.glow;
    // the glow: a broad soft one, pushed up where the flames rise, and a hotter one close in
    // (a glow's radius is where it fades out, so they reach well past the head)
    pen.glow(ux * 34, uy * 34, HEAD_R * 2.5, HEAD_R * 2.65, 0, shadeC(glowC, -0.25), st.glowA * 1.25 * pulse);
    pen.glow(ux * 20, uy * 20, HEAD_R * 1.8, HEAD_R * 1.9, 0, glowC, st.glowA * 1.5 * pulse);
    if (st.core) pen.glow(0, 0, HEAD_R * 1.6, HEAD_R * 1.6, 0, st.core, 0.75 * pulse);
    if (st.corona) this.drawCorona(pen, st.corona);
    // in the locker the flames stay inside the image's margin (and clear of the tile's edge)
    const H = st.height * (f.menu ? 0.6 : 1.15) * (1 + 0.45 * this.amt);
    this.ringOf(pen, 0, 78, st.count, H, st.flicker, 0, f);
    this.ringOf(pen, 1, 75, st.count - 1, H * 0.72, st.flicker * 1.3, 0.2, f);
    this.ringOf(pen, 2, 70, st.count - 3, H * 0.44, st.flicker * 1.7, 0.45, f);
    // the horns stand out of the fire, darker than it
    if (st.horns) this.drawHorns(pen, f, H);
    // loose licks breaking away
    for (let i = 0; i < LICKS; i++) {
      if (this.lt[i] >= this.ll[i]) continue;
      const k = 1 - this.lt[i] / this.ll[i];
      const a = up + this.la[i];
      const base = H * 0.82 + this.ld[i];
      const ax = Math.cos(a);
      const ay = Math.sin(a);
      this.tongue(pen, ax * (HEAD_R * 0.6 + base * 0.5), ay * (HEAD_R * 0.6 + base * 0.5), ux, uy, this.ls[i] * 2.2 * k, this.ls[i] * k, Math.sin(t * 9 + i) * 5, this.col(k > 0.5 ? 1 : 0, i, LICKS), true);
    }
  }

  private drawCorona(pen: Pen, c: number): void {
    const p = this.pts;
    const n = 14;
    const spin = this.t * 0.35;
    for (let i = 0; i < n; i++) {
      const ang = spin + (i / n) * Math.PI * 2;
      const long = i % 2 === 0;
      const r1 = HEAD_R * (long ? 1.55 : 1.3) + Math.sin(this.t * 3 + i * 1.9) * 8;
      const r0 = HEAD_R * 0.8;
      const hw = long ? 0.13 : 0.1;
      p[0] = Math.cos(ang - hw) * r0;
      p[1] = Math.sin(ang - hw) * r0;
      p[2] = Math.cos(ang) * r1;
      p[3] = Math.sin(ang) * r1;
      p[4] = Math.cos(ang + hw) * r0;
      p[5] = Math.sin(ang + hw) * r0;
      pen.poly(p, 3, long ? c : shadeC(c, 0.35), 0.85, 3.5, 0x8a4a08, 0.75);
    }
    pen.ring(0, 0, HEAD_R * 1.02, HEAD_R * 1.02, 10, 0xfff2a8, 0.55);
  }

  private drawHorns(pen: Pen, f: Frame, H: number): void {
    const up = upAngle(f);
    const t = this.t;
    for (const side of HORN_SIDES) {
      const ang = up + side * 0.7;
      const bx = Math.cos(ang) * HEAD_R * 0.72;
      const by = Math.sin(ang) * HEAD_R * 0.72;
      // horns lean out a little and curl back in at the tip
      const da = up + side * 0.5;
      const flick = 0.9 + 0.1 * Math.sin(t * 11 + side * 2) + (f.calm ? 0 : 0.06 * Math.sin(t * 23 + side));
      const l = H * 1.35 * flick;
      this.tongue(pen, bx, by, Math.cos(da), Math.sin(da), l, 52, -side * l * 0.42, HORN, true);
      this.tongue(pen, bx, by, Math.cos(da), Math.sin(da), l * 0.8, 30, -side * l * 0.34, this.ramp[0], false);
      this.tongue(pen, bx, by, Math.cos(da), Math.sin(da), l * 0.45, 14, -side * l * 0.18, this.ramp[1], false);
    }
  }

  front(pen: Pen, f: Frame): void {
    const st = this.st;
    const t = this.t;
    const pulse = 0.8 + 0.2 * Math.sin(t * 4.2);
    if (st.core) pen.glow(0, -8, HEAD_R * 1.05, HEAD_R * 1.1, 0, st.core, 0.42 * pulse);
    if (st.cracks) {
      const c = this.cracks;
      for (let k = 0; k < 3; k++) {
        const a = 0.55 + 0.35 * Math.sin(t * 2.4 + k * 2.1);
        for (let q = 0; q < 4; q++) {
          const i = k * 10 + q * 2;
          pen.seg(c[i], c[i + 1], c[i + 2], c[i + 3], 7, 0x2a0a04, 0.55 * a);
          pen.seg(c[i], c[i + 1], c[i + 2], c[i + 3], 4.2, 0xff6a1a, 0.85 * a);
          pen.seg(c[i], c[i + 1], c[i + 2], c[i + 3], 1.6, 0xffe08a, a);
        }
      }
    }
    if (st.rim) {
      // a hot rim along the top of the head
      const up = upAngle(f);
      const p = this.pts;
      for (let q = 0; q <= 8; q++) {
        const ang = up - 1.15 + (q / 8) * 2.3;
        p[q * 2] = Math.cos(ang) * (HEAD_R - 4);
        p[q * 2 + 1] = Math.sin(ang) * (HEAD_R - 4);
      }
      pen.line(p, 9, 5, st.rim, (f.menu ? 0.35 : 0.5) * pulse);
    }
  }

  under(pen: Pen, f: Frame): void {
    if (f.calm || f.menu) return;
    this.trail.draw(pen, this.st.trail, f.s * PX, this.t);
  }

  over(pen: Pen, f: Frame, dt: number): void {
    if (!f.calm) this.bits.draw(pen, this.t);
    this.rings.draw(pen, dt, this.ramp[0], this.st.shift ? cycleC(this.st.shift, this.t * 0.2) : this.ramp[2], f.s / 0.62);
  }

  smack(x: number, y: number, f: Frame): void {
    this.rings.fire(x, y);
    if (f.calm) return;
    const S = f.s * PX;
    const e = this.st.ember;
    for (let q = 0; q < 8; q++) {
      const a = -Math.PI / 2 + rand(-1.3, 1.3);
      const sp = rand(140, 300) * S;
      this.bits.emit(e.kind === Bit.Mote ? Bit.Ember : e.kind, x, y, Math.cos(a) * sp, Math.sin(a) * sp, e.size * S, rand(0.4, 0.7), e.c0, e.c1, 500 * S, 0.5);
    }
  }
}

const TONGUE_U = [0, 0.3, 0.55, 0.78, 1];
// a flame's belly: full low down, pinching to the tip
const TONGUE_W = [0.8, 1, 0.78, 0.42, 0];
const FACET_U = [0, 0.42, 1];
const FACET_W = [0.55, 1, 0];
const HORN_SIDES = [-1, 1];
/** Diavola's horns: a deep blood red, darker than the fire round them. */
const HORN = 0x6a0610;

export function fireCore(st: FireStyle): LookCore {
  return new FireCore(st);
}
