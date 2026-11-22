// Glows and trails for the high-end peels: a soft aura round the head, particles in the peel's own palette, and a
// trail behind it, with a flavour per family:
// - jewellery box: sparkle glints and a prismatic trail
// - masterworks: a polished sheen sweeping the head and a gold-dust trail
// - ultra-rares: the strongest, a pulsing aura with a rainbow or star trail
// - god peels: their element (Poseidon's droplets, Hades's violet smoke, Apollo's sunlight, Hermes's wind,
//   Thor's lightning flicks …)
// - the God Peel: a gold halo, a sunburst and a radiant prismatic trail
// - heroes: a quiet signature glow in their suit colours (there are a lot of them)
// Colours come from each peel's PeelLook, so new peels in these groups get a look for free; only the
// showpieces are hand-tuned.

import type { PeelLook } from './peelArt';
import { Bit, Bits, HEAD_R, Rings, Trail, TrailKind, hex, hueC, lerpC, lum, rand, shadeC, toWorld, upAngle, type Frame, type LookCore, type Pen, type TrailStyle } from './lookKit';

/** One stream of particles. */
export interface BitSpec {
  kind: Bit;
  c0: number;
  c1: number;
  /** Per second when still, and extra per 100 px moved. */
  rate: number;
  move: number;
  /** Size in px at the default peel size. */
  size: number;
  life: number;
  /** Starting rise (negative) or fall (positive) speed, px/s, and gravity. */
  vy: number;
  grav: number;
  /** Sideways scatter, px/s. */
  spread: number;
  /** Where they start: the head's edge, on the head, a ring just outside it, or along the top. */
  where: 'rim' | 'head' | 'around' | 'above';
  /** Hues round the rainbow instead of c0. */
  rainbow?: boolean;
}

export interface GlowStyle {
  /** The aura's colour, strength (alpha), size (× the head's radius) and breathing (share, and speed). */
  aura: number;
  auraA: number;
  auraR: number;
  pulse: number;
  hz: number;
  bits: BitSpec[];
  /** Dropped along the path as it moves (gold dust, stars): per 100 px. */
  dust?: BitSpec;
  trail?: TrailStyle;
  /** Masterworks: a polished sheen sweeping the head every few seconds. */
  sheen?: number;
  /** The God Peel: a halo floating over the head. */
  halo?: number;
  /** Light rays turning slowly behind the head. */
  rays?: { c: number; n: number; a: number; len: number };
  /** The smack ring's colours. */
  ring: [number, number];
}

// ——— building blocks ———

const bit = (kind: Bit, c0: number, c1: number, o: Partial<BitSpec> = {}): BitSpec => ({ kind, c0, c1, rate: 2, move: 1, size: 5, life: 0.8, vy: -30, grav: 0, spread: 20, where: 'rim', ...o });
const ribbon = (c: number, w: number, a: number, life = 0.32): TrailStyle => ({ kind: TrailKind.Ribbon, c: [shadeC(c, -0.45), c, shadeC(c, 0.65)], w, life, a });
const prism = (w: number, a: number, life = 0.38): TrailStyle => ({ kind: TrailKind.Prism, c: [0, 0, 0], w, life, a });
/** A colour that shows as a glow: very dark colours are lifted (a black aura reads as a smudge). */
const glowable = (c: number) => (lum(c) < 0.22 ? shadeC(c, 0.45) : c);

/** Look colours: the head's light, mid and dark, the trail, the gem (or the pattern colour). */
function palette(look: PeelLook): { light: number; mid: number; trail: number; gem: number; studs: number } {
  return {
    light: hex(look.head[0]),
    mid: hex(look.head[1]),
    trail: hex(look.trail),
    gem: hex(look.gem ?? look.patternColor),
    studs: hex(look.studs ?? '#ffffff'),
  };
}

// ——— families ———

/** Heroes: a quiet glow and a slim ribbon in their colours, and a mote now and then. */
export function heroStyle(look: PeelLook): GlowStyle {
  const p = palette(look);
  const c = glowable(p.trail);
  return {
    aura: c,
    auraA: 0.25,
    auraR: 1.3,
    pulse: 0.12,
    hz: 1.6,
    bits: [bit(Bit.Mote, shadeC(c, 0.55), c, { rate: 0.7, move: 0.8, size: 3, life: 0.9, vy: -26 })],
    trail: ribbon(c, 16, 0.65, 0.26),
    ring: [shadeC(c, -0.4), shadeC(c, 0.4)],
  };
}

/** The jewellery box: sparkle glints round the head and a prismatic trail. */
export function jewelStyle(look: PeelLook): GlowStyle {
  const p = palette(look);
  const c = glowable(look.pattern === 'gems' ? p.gem : p.mid);
  return {
    aura: c,
    auraA: 0.26,
    auraR: 1.35,
    pulse: 0.14,
    hz: 1.3,
    bits: [bit(Bit.Glint, 0xffffff, c, { rate: 3, move: 1.5, size: 7, life: 0.6, vy: 0, spread: 0, where: 'head' }), bit(Bit.Glint, shadeC(c, 0.5), c, { rate: 1.2, move: 1.2, size: 5, life: 0.7, vy: -12, spread: 10 })],
    trail: prism(22, 0.6),
    ring: [shadeC(c, -0.4), 0xffffff],
  };
}

/** Masterworks: the base look's colour in the aura, a sheen sweep, a gold ribbon and gold dust. */
export function masterStyle(look: PeelLook): GlowStyle {
  const p = palette(look);
  const c = glowable(lerpC(p.mid, 0xffd23f, 0.35));
  return {
    aura: c,
    auraA: 0.28,
    auraR: 1.35,
    pulse: 0.12,
    hz: 1.2,
    sheen: 0xfff8e0,
    bits: [bit(Bit.Glint, 0xfff4c0, 0xffd23f, { rate: 1.2, move: 0.6, size: 6, life: 0.6, vy: 0, spread: 0, where: 'head' })],
    dust: bit(Bit.Mote, 0xffe27a, 0xd8a020, { move: 3.5, size: 2.6, life: 0.9, vy: 20, grav: 70, spread: 26 }),
    trail: ribbon(0xffc93a, 13, 0.7, 0.3),
    ring: [0xb07a10, 0xffe27a],
  };
}

/** Ultra-rares: the strongest, a pulsing aura, stars, and a rainbow (or starry) trail. Hand-tuned. */
export function ultraStyle(id: string, look: PeelLook): GlowStyle {
  const p = palette(look);
  const base: GlowStyle = {
    aura: glowable(p.mid),
    auraA: 0.36,
    auraR: 1.55,
    pulse: 0.28,
    hz: 2.2,
    bits: [bit(Bit.Star, 0xffffff, glowable(p.mid), { rate: 2.4, move: 1.5, size: 8, life: 0.8, vy: -18, spread: 16 })],
    dust: bit(Bit.Star, 0xffffff, 0xffd23f, { move: 2.6, size: 6, life: 0.7, vy: 10, grav: 40, spread: 30 }),
    trail: prism(32, 0.85),
    ring: [shadeC(glowable(p.mid), -0.4), 0xffffff],
  };
  switch (id) {
    case 'ultra:rosegold':
      return { ...base, aura: 0xf2a898, bits: [bit(Bit.Star, 0xfff0ea, 0xe8a090, { rate: 2.4, move: 1.5, size: 8, life: 0.8, vy: -18 }), bit(Bit.Petal, 0xffc8c0, 0xe8a090, { rate: 0.8, move: 1, size: 6, life: 1.2, vy: 30, grav: 30 })], trail: ribbon(0xf2b0a0, 30, 0.85, 0.4), dust: { ...base.dust!, c1: 0xffb0a0 } };
    case 'ultra:platinum':
      return { ...base, aura: 0xc8e0ff, bits: [bit(Bit.Glint, 0xffffff, 0x9ac8ff, { rate: 3.5, move: 2, size: 9, life: 0.5, vy: 0, spread: 0, where: 'head' }), bit(Bit.Flick, 0xffffff, 0x7ab8ff, { rate: 1.4, move: 1, size: 9, life: 0.2, vy: 0, spread: 0 })], trail: ribbon(0xd8e8ff, 30, 0.85, 0.4), dust: { ...base.dust!, c1: 0x9ac8ff } };
    case 'ultra:goldfeather':
      return { ...base, aura: 0xffd23f, bits: [bit(Bit.Petal, 0xffe27a, 0xd8a020, { rate: 1.5, move: 1.5, size: 8, life: 1.4, vy: 20, grav: 40, spread: 30 }), bit(Bit.Star, 0xffffff, 0xffd23f, { rate: 1.6, size: 7 })], trail: ribbon(0xffd23f, 32, 0.85, 0.42) };
    case 'ultra:prism':
      return { ...base, aura: 0xd8c8ff, bits: [bit(Bit.Star, 0xffffff, 0xffffff, { rate: 3, move: 2, size: 8, life: 0.8, vy: -18, rainbow: true })], dust: { ...base.dust!, rainbow: true }, trail: prism(36, 0.9, 0.45) };
    case 'ultra:blackdiamond':
      return { ...base, aura: 0x7a6ad8, bits: [bit(Bit.Glint, 0xffffff, 0x9a8ad8, { rate: 3, move: 1.5, size: 9, life: 0.55, vy: 0, spread: 0, where: 'head' }), bit(Bit.Smoke, 0x6a5aa8, 0x24202c, { rate: 1.5, move: 1, size: 16, life: 1.2, vy: -30, where: 'around' })], trail: ribbon(0x5a4aa8, 32, 0.85, 0.4), dust: { ...base.dust!, c1: 0x9a8ad8 } };
    case 'ultra:crownjewel':
      return { ...base, aura: 0xb03ad8, bits: [bit(Bit.Star, 0xffe27a, 0xffd23f, { rate: 2.4, move: 1.5, size: 8, life: 0.8, vy: -18 }), bit(Bit.Glint, 0xffffff, 0xff3d6e, { rate: 2, size: 7, vy: 0, spread: 0, where: 'head', life: 0.6 })], trail: prism(32, 0.85) };
    case 'ultra:cosmic':
      // a starry trail: no ribbon, a stream of stars and a nebula glow
      return { ...base, aura: 0x7a5aff, auraA: 0.4, bits: [bit(Bit.Star, 0xffffff, 0xa77dff, { rate: 3, move: 1, size: 7, life: 0.9, vy: -10, where: 'around' }), bit(Bit.Mote, 0xc8b8ff, 0x7a5aff, { rate: 2, move: 1, size: 3, life: 1.2, vy: -14, where: 'around' })], dust: bit(Bit.Star, 0xffffff, 0x7ad0ff, { move: 6, size: 7, life: 0.8, vy: 0, grav: 0, spread: 40 }), trail: ribbon(0x5a3ad8, 26, 0.6, 0.35) };
  }
  return base;
}

/** The God Peel: a gold halo, a turning sunburst, stars, and a radiant prismatic trail with gold dust. */
export function godPeelStyle(): GlowStyle {
  return {
    aura: 0xffd23f,
    auraA: 0.4,
    auraR: 1.6,
    pulse: 0.22,
    hz: 1.6,
    halo: 0xffd23f,
    rays: { c: 0xfff2a8, n: 16, a: 0.4, len: 1.75 },
    bits: [bit(Bit.Star, 0xffffff, 0xffd23f, { rate: 2.6, move: 1.5, size: 8, life: 0.8, vy: -20 }), bit(Bit.Glint, 0xffffff, 0xffe27a, { rate: 1.6, size: 7, vy: 0, spread: 0, where: 'head', life: 0.6 })],
    dust: bit(Bit.Mote, 0xfff2a8, 0xffc020, { move: 4, size: 3, life: 0.9, vy: 18, grav: 60, spread: 30 }),
    trail: prism(40, 0.9, 0.45),
    ring: [0xb07a10, 0xffffff],
  };
}

// ——— god peels: their element ———

const water = (c: number): Partial<GlowStyle> => ({ bits: [bit(Bit.Drop, shadeC(c, 0.45), c, { rate: 3, move: 2, size: 4.2, life: 0.8, vy: -60, grav: 520, spread: 50 }), bit(Bit.Bubble, 0xffffff, c, { rate: 0.8, move: 0.5, size: 4, life: 1, vy: -40 })] });
const smoke = (c: number, dark: number, extra?: BitSpec): Partial<GlowStyle> => ({ bits: [bit(Bit.Smoke, c, dark, { rate: 5, move: 2.5, size: 20, life: 1.4, vy: -40, spread: 22, where: 'around' }), ...(extra ? [extra] : [])] });
const sun = (c: number): Partial<GlowStyle> => ({ rays: { c: shadeC(c, 0.2), n: 12, a: 0.45, len: 2.05 }, bits: [bit(Bit.Mote, 0xfffbe0, c, { rate: 3, move: 1.5, size: 3.2, life: 1, vy: -24, where: 'around' })] });
const wind = (c: number): Partial<GlowStyle> => ({ bits: [bit(Bit.Streak, 0xffffff, c, { rate: 4, move: 3, size: 2.4, life: 0.45, vy: 0, spread: 0, where: 'around' })] });
const bolt = (c: number): Partial<GlowStyle> => ({ bits: [bit(Bit.Flick, 0xffffff, c, { rate: 10, move: 3, size: 13, life: 0.24, vy: 0, spread: 0 }), bit(Bit.Spark, 0xffffff, c, { rate: 1, move: 2, size: 1.8, life: 0.35, vy: -80, grav: 520, spread: 120 })] });
const embers = (c: number): Partial<GlowStyle> => ({ bits: [bit(Bit.Ember, shadeC(c, 0.55), c, { rate: 3, move: 2, size: 3.4, life: 0.9, vy: -50, spread: 22, where: 'above' })] });
const petals = (c: number, c2 = c): Partial<GlowStyle> => ({ bits: [bit(Bit.Petal, shadeC(c, 0.3), c2, { rate: 1.8, move: 1.5, size: 7, life: 1.4, vy: 24, grav: 26, spread: 34 })] });
const glints = (c: number): Partial<GlowStyle> => ({ bits: [bit(Bit.Glint, 0xffffff, c, { rate: 3, move: 1.5, size: 7, life: 0.6, vy: 0, spread: 0, where: 'head' }), bit(Bit.Mote, shadeC(c, 0.5), c, { rate: 1.2, size: 3, life: 1, vy: -20 })] });
const stars = (c: number): Partial<GlowStyle> => ({ bits: [bit(Bit.Star, 0xffffff, c, { rate: 2.4, move: 1.5, size: 7, life: 0.8, vy: -14, where: 'around' })] });
const both = (a: Partial<GlowStyle>, b: Partial<GlowStyle>): Partial<GlowStyle> => ({ ...a, ...b, bits: [...(a.bits ?? []), ...(b.bits ?? [])] });

const GODS: Record<string, [number, Partial<GlowStyle>]> = {
  'hero:kratos': [0xe0402a, embers(0xe0402a)],
  // King Leonidas: a bronze glint off the helm, dust kicked up from the pass, and his crimson cloak sweeping behind
  'hero:leonidas': [0xc9873a, { ...both(glints(0xe0a850), { bits: [bit(Bit.Ash, 0xd8c0a0, 0x8a6a48, { rate: 2.4, move: 2, size: 3.4, life: 1.1, vy: 26, grav: 30, spread: 34 })] }), trail: ribbon(0xb8182a, 28, 0.8, 0.36) }],
  // Leonidas, Hot Gates: the burning pass at dusk, embers and smoke, and a blood-red cloak
  'hero:hotgates': [0xff6a2a, { ...both(both(embers(0xff6a2a), smoke(0x5a3a30, 0x2a1810)), glints(0xd89040)), trail: ribbon(0x8a0a18, 30, 0.85, 0.4) }],
  'hero:ghostofsparta': [0xd8d0c8, both(embers(0xe0402a), { bits: [bit(Bit.Ash, 0x5a5450, 0xff6a3a, { rate: 1.5, move: 1, size: 3.6, life: 1.3, vy: -36 })] })],
  'hero:hera': [0x5fd0c0, glints(0x5fd0c0)],
  'hero:poseidon': [0x3ab0e0, water(0x3ab0e0)],
  'hero:demeter': [0xe8c040, petals(0xe8c040, 0x8a9a2a)],
  'hero:athena': [0x8aa8ff, glints(0x8aa8ff)],
  'hero:apollo': [0xffb020, sun(0xffb020)],
  'hero:artemis': [0xd8e4f0, both(stars(0xb8d0ff), { bits: [bit(Bit.Mote, 0xffffff, 0xb8d0ff, { rate: 1.5, size: 3, life: 1, vy: -18 })] })],
  'hero:ares': [0xe0402a, both(embers(0xe0402a), smoke(0x5a3a36, 0x2a1a18))],
  'hero:aphrodite': [0xff7ab8, petals(0xff7ab8)],
  'hero:hermes': [0x7be0a0, wind(0x7be0a0)],
  'hero:dionysus': [0x9a4ad0, { bits: [bit(Bit.Bubble, 0xe8c8ff, 0x9a4ad0, { rate: 3, move: 1.5, size: 5, life: 1.1, vy: -46, spread: 16 })] }],
  'hero:hades': [0x7a5aff, smoke(0x8a6aff, 0x3a2a7a, bit(Bit.Ember, 0xd8c8ff, 0x7a5aff, { rate: 1.2, size: 3, life: 0.9, vy: -40 }))],
  'hero:persephone': [0xff5a7a, petals(0xff5a7a)],
  'hero:nike': [0xffd23f, both(wind(0xffd23f), glints(0xffd23f))],
  'hero:nyx': [0xa08aff, smoke(0x5a4a9a, 0x1a1438, bit(Bit.Star, 0xffffff, 0xa08aff, { rate: 1.6, size: 6, life: 0.8, vy: -10, where: 'around' }))],
  'hero:odin': [0x7ab8ff, both(glints(0x7ab8ff), smoke(0x9aa8c0, 0x4a5468))],
  'hero:odinascended': [0xffd23f, both(stars(0xffd23f), glints(0x7ab8ff))],
  'hero:thor': [0x9fd8ff, bolt(0x6cc4ff)],
  'hero:thorunleashed': [0xffe680, bolt(0xffd23f)],
  'hero:loki': [0x7be04a, smoke(0x7be04a, 0x2a5a1a)],
  'hero:frigg': [0xc8b0ff, both(glints(0xc8b0ff), smoke(0xe0d4ff, 0x8a7ab8))],
  'hero:freya': [0xffb0d8, both(petals(0xffb0d8), glints(0xffb0d8))],
  'hero:freyr': [0xffd23f, sun(0xffd23f)],
  'hero:tyr': [0xff6a4a, both(embers(0xff6a4a), glints(0xc9cfd8))],
  'hero:heimdall': [0xffe680, { ...glints(0xffe680), trail: prism(24, 0.75) }],
  'hero:baldur': [0xfff2a0, sun(0xfff2a0)],
  'hero:hel': [0xa8f0d8, smoke(0xc8fff0, 0x4a7a6a)],
  'hero:njord': [0x5fd8ff, water(0x5fd8ff)],
  'hero:skadi': [0xd8f6ff, both(wind(0xa8dcff), { bits: [bit(Bit.Mote, 0xffffff, 0xa8dcff, { rate: 3, move: 2, size: 3, life: 1.3, vy: 30, grav: 10, spread: 30, where: 'around' })] })],
  'hero:idun': [0xffd23f, both(petals(0x7be04a, 0x3a8a2a), { bits: [bit(Bit.Mote, 0xfff2a8, 0xffd23f, { rate: 1.5, size: 3, life: 1, vy: -20 })] })],
  'hero:bragi': [0xffb070, both(glints(0xffb070), { bits: [bit(Bit.Mote, 0xffe0c0, 0xffb070, { rate: 2, size: 3, life: 1.1, vy: -30, spread: 30, where: 'above' })] })],
};

/** A god peel's element, or null for gods without one here (Zeus has his own look; Hestia and Hephaestus burn). */
export function godStyle(id: string): GlowStyle | null {
  const g = GODS[id];
  if (!g) return null;
  const [c, el] = g;
  const cg = glowable(c);
  return {
    aura: cg,
    auraA: 0.34,
    auraR: 1.6,
    pulse: 0.18,
    hz: 1.8,
    trail: ribbon(cg, 24, 0.75, 0.34),
    ring: [shadeC(cg, -0.45), shadeC(cg, 0.5)],
    ...el,
    bits: el.bits ?? [],
  };
}

// ——— the engine ———

const PX = 1 / 0.62;
// the God Peel's halo, in the peel's frame (70, 48 and 12 px at the default size, as godHalo draws it)
const HALO_Y = -70 * PX;
const HALO_RX = 48 * PX;
const HALO_RY = 12 * PX;

class GlowCore implements LookCore {
  private bits = new Bits(64);
  private trail = new Trail();
  private rings = new Rings();
  private acc = new Float32Array(6);
  private pts = new Float32Array(8);
  private hp = new Float32Array(42);
  private t = Math.random() * 10;
  private sheenIn = rand(0.5, 1.5);
  private sheenAge = 9;

  constructor(private st: GlowStyle) {}

  reset(): void {
    this.bits.clear();
    this.trail.reset();
  }

  private emit(b: BitSpec, f: Frame, S: number, at?: { x: number; y: number }): void {
    let lx = 0;
    let ly = 0;
    const ang = b.where === 'above' ? upAngle(f) + rand(-1, 1) : Math.random() * Math.PI * 2;
    const rr = b.where === 'head' ? HEAD_R * rand(0.15, 0.8) : b.where === 'around' ? HEAD_R * rand(1.05, 1.4) : HEAD_R * rand(0.85, 1.05);
    lx = Math.cos(ang) * rr;
    ly = Math.sin(ang) * rr;
    const p = at ?? toWorld(f, lx, ly);
    const px = p.x;
    const py = p.y;
    let vx = rand(-b.spread, b.spread) * S - f.vx * 0.1;
    let vy = b.vy * rand(0.7, 1.3) * S - f.vy * 0.1;
    let rot = Math.random() * Math.PI * 2;
    if (b.kind === Bit.Streak) {
      // wind: streams back along the path when moving, else circles the head
      const sp = Math.hypot(f.vx, f.vy);
      if (sp > 150) {
        vx = (-f.vx / sp) * 300 * S + rand(-30, 30) * S;
        vy = (-f.vy / sp) * 300 * S + rand(-30, 30) * S;
      } else {
        const wa = Math.atan2(py - f.y, px - f.x) + Math.PI / 2;
        vx = Math.cos(wa) * 150 * S;
        vy = Math.sin(wa) * 150 * S;
      }
    }
    if (b.kind === Bit.Flick) rot = ang + rand(-1.2, 1.2);
    const c0 = b.rainbow ? hueC(Math.random(), 0.35) : b.c0;
    const i = this.bits.emit(b.kind, px, py, vx, vy, b.size * S * rand(0.75, 1.2), b.life * rand(0.75, 1.25), c0, b.rainbow ? hueC(Math.random(), 0.1) : b.c1, b.grav * S, b.kind === Bit.Smoke ? 0.8 : 0.4);
    this.bits.rot[i] = rot;
  }

  tick(dt: number, f: Frame): void {
    const st = this.st;
    this.t += dt * (f.calm ? 0.5 : 1);
    this.bits.tick(dt);
    if (st.sheen) {
      this.sheenAge += dt;
      this.sheenIn -= dt;
      if (this.sheenIn <= 0) {
        this.sheenIn = rand(2.4, 3.4);
        this.sheenAge = 0;
      }
    }
    if (f.calm) return;
    if (!f.menu && st.trail) this.trail.push(f.x, f.y, dt);
    const S = f.s * PX;
    const moved = f.moved / 100;
    for (let k = 0; k < st.bits.length && k < 5; k++) {
      const b = st.bits[k];
      this.acc[k] += dt * b.rate + moved * b.move;
      while (this.acc[k] >= 1) {
        this.acc[k] -= 1;
        this.emit(b, f, S);
      }
    }
    if (st.dust && !f.menu) {
      this.acc[5] += moved * st.dust.move;
      while (this.acc[5] >= 1) {
        this.acc[5] -= 1;
        const p = toWorld(f, rand(-20, 20), rand(-20, 20));
        this.emit(st.dust, f, S, p);
      }
    }
  }

  under(pen: Pen, f: Frame): void {
    if (f.calm || f.menu || !this.st.trail) return;
    this.trail.draw(pen, this.st.trail, f.s * PX, this.t);
  }

  /** Points round the halo from angle a0 to a1, level on screen (turned back against the peel's lean). */
  private halo(f: Frame, a0: number, a1: number, steps: number): number {
    const c = Math.cos(-f.rot);
    const sn = Math.sin(-f.rot);
    for (let q = 0; q <= steps; q++) {
      const a = a0 + ((a1 - a0) * q) / steps;
      const x = Math.cos(a) * HALO_RX;
      const y = Math.sin(a) * HALO_RY;
      this.hp[q * 2] = x * c - y * sn;
      this.hp[q * 2 + 1] = HALO_Y + x * sn + y * c;
    }
    return steps + 1;
  }

  back(pen: Pen, f: Frame): void {
    const st = this.st;
    const pulse = 1 - st.pulse + st.pulse * (0.5 + 0.5 * Math.sin(this.t * st.hz * Math.PI * 2 * 0.5));
    // a glow's radius is where it fades out, so it reaches well past the head
    const R = HEAD_R * st.auraR * 1.6;
    // a darker, wider edge so the aura reads on bright backdrops, then the colour
    pen.glow(0, 0, R * 1.15, R * 1.2, 0, shadeC(st.aura, -0.35), st.auraA * 0.9 * pulse);
    pen.glow(0, 0, R, R * 1.05, 0, st.aura, st.auraA * 1.5 * pulse);
    if (st.rays) {
      const p = this.pts;
      const n = st.rays.n;
      for (let i = 0; i < n; i++) {
        const ang = this.t * 0.3 + (i / n) * Math.PI * 2;
        const long = i % 2 === 0;
        const r1 = HEAD_R * (long ? st.rays.len : st.rays.len * 0.82) + Math.sin(this.t * 2.4 + i * 1.7) * 6;
        const r0 = HEAD_R * 0.75;
        const hw = long ? 0.11 : 0.08;
        p[0] = Math.cos(ang - hw) * r0;
        p[1] = Math.sin(ang - hw) * r0;
        p[2] = Math.cos(ang) * r1;
        p[3] = Math.sin(ang) * r1;
        p[4] = Math.cos(ang + hw) * r0;
        p[5] = Math.sin(ang + hw) * r0;
        pen.poly(p, 3, st.rays.c, st.rays.a * pulse * (long ? 1 : 0.7), 0, 0, 0);
      }
    }
    if (st.halo) {
      // the halo floats over the head, where the God Peel's ability draws its turning arc of light
      // (godHalo in src/game/godMoves.ts), so worn with that ability the two make one halo
      // it stays level whichever way the peel leans, as that one does
      const n = this.halo(f, 0, Math.PI * 2, 20);
      pen.glow(0, HALO_Y, 120, 44, -f.rot, st.halo, 0.6 * pulse);
      pen.line(this.hp, n, 12, 0x8a5a08, 0.75);
      pen.line(this.hp, n, 7.5, st.halo, 1);
    }
  }

  front(pen: Pen, f: Frame): void {
    const st = this.st;
    if (st.sheen && this.sheenAge < 0.9) {
      // a band of light sweeping across the head on a slant
      const k = this.sheenAge / 0.9;
      const env = Math.sin(Math.PI * k);
      const d = (k * 2 - 1) * HEAD_R * 0.8;
      const R = HEAD_R * 0.86;
      const half = Math.sqrt(Math.max(0, R * R - d * d));
      const ca = Math.cos(0.6);
      const sa = Math.sin(0.6);
      // the chord at distance d across a 0.6 rad slant
      const x0 = d * ca - half * sa;
      const y0 = d * sa + half * ca;
      const x1 = d * ca + half * sa;
      const y1 = d * sa - half * ca;
      pen.seg(x0, y0, x1, y1, 26, st.sheen, 0.12 * env);
      pen.seg(x0, y0, x1, y1, 12, st.sheen, 0.22 * env);
      pen.seg(x0, y0, x1, y1, 4, 0xffffff, (f.menu ? 0.4 : 0.5) * env);
    }
    if (st.halo) {
      // the halo's near edge catches the light, over the peel
      const n = this.halo(f, 0.35, Math.PI - 0.35, 8);
      pen.line(this.hp, n, 3, 0xfff8d0, 0.85);
    }
  }

  over(pen: Pen, f: Frame, dt: number): void {
    if (!f.calm) this.bits.draw(pen, this.t);
    this.rings.draw(pen, dt, this.st.ring[0], this.st.ring[1], f.s / 0.62);
  }

  smack(x: number, y: number, f: Frame): void {
    this.rings.fire(x, y);
    const b = this.st.bits[0];
    if (f.calm || !b) return;
    const S = f.s * PX;
    for (let q = 0; q < 6; q++) {
      const a = Math.random() * Math.PI * 2;
      this.emit(b, f, S, { x: x + Math.cos(a) * 30 * S, y: y + Math.sin(a) * 16 * S });
    }
  }
}

export function glowCore(st: GlowStyle): LookCore {
  return new GlowCore(st);
}
