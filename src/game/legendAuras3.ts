// Act 3's Legendaries' auras and signatures on the table (docs/pizza-plan.md, section 14), plugged into the living
// pizzas' hooks (AURAS and SIGNATURES in src/game/pizzaAlive.ts) like Acts 1 and 2's (src/game/legendAuras.ts). Each
// stays round and under the pie: glows under the plate, what circles or rises round it between the plate and the pie
// (passing behind it), so the face, slices, labels, freshness bar and shield always draw over it. Calm (reduced
// motion) and basic (low graphics) still show it, quieter; a stale or perk-frozen pie's aura dims. Cosmetic: crand().
//
// - Cosmic Crouton Supreme: a violet nebula glow, a faint orbit ring, and the crouton moon tumbling round the crust on
//   it, a trail of stardust behind it, stars twinkling round the plate.
// - Roar Roast: the Lodge's firelight flickering under it, a ring of coals breathing round the plate, heat shimmer
//   rising off its back either side of the freshness bar, embers drifting up.
// - Black Olive Hole: a void darkening the table under it, the accretion disc turning round the plate (glowing white
//   hot at its inner edge), its far side bent up behind the pie (the lensing), stars streaking in towards it.

import Phaser from 'phaser';
import { CROUTON_FRAMES, drawAccretionDisc, drawCoal, drawCroutonFrame, drawHeatShimmer, drawStarStreak } from '../art/perkPropsLegend3';
import { audio } from '../systems/audio';
import { crand } from '../systems/cosmeticRandom';
import { legendLook } from './legendary';
import { AURAS, SIGNATURES, type Aura, type AuraCtx, type AuraFrame, type SigCtx } from './pizzaAlive';

const ADD = Phaser.BlendModes.ADD;

function ensure3(sc: Phaser.Scene): void {
  const tex: [string, () => HTMLCanvasElement][] = [
    ['pk_coal', drawCoal],
    ['pk_shimmer', drawHeatShimmer],
    ['pk_starstreak', drawStarStreak],
    ['pk_disc', drawAccretionDisc],
    ['pk_discwide', () => drawAccretionDisc(150)],
  ];
  for (let i = 0; i < CROUTON_FRAMES; i++) tex.push([`pk_crouton${i}`, () => drawCroutonFrame(i)]);
  for (const [k, d] of tex) if (!sc.textures.exists(k)) sc.textures.addCanvas(k, d());
}

interface Mote {
  img: Phaser.GameObjects.Image;
  t: number;
  life: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  s0: number;
  s1: number;
  a: number;
  ph: number;
}

const mote = (img: Phaser.GameObjects.Image): Mote => ({ img: img.setVisible(false), t: 1, life: 0, x: 0, y: 0, vx: 0, vy: 0, s0: 0, s1: 0, a: 0, ph: 0 });

function stepMotes(ms: Mote[], dt: number, sway = 0, q = 1): void {
  for (const m of ms) {
    if (m.t >= m.life) {
      m.img.setVisible(false);
      continue;
    }
    m.t += dt;
    const u = Math.min(1, m.t / m.life);
    m.x += (m.vx + Math.sin(m.t * 2.2 + m.ph) * sway) * dt;
    m.y += m.vy * dt;
    m.img
      .setVisible(true)
      .setPosition(m.x, m.y)
      .setScale(m.s0 + (m.s1 - m.s0) * u)
      .setAlpha(q * m.a * Math.sin(Math.PI * Math.min(1, u * 1.1)));
  }
}

// ════════════════════════════ Cosmic Crouton Supreme ════════════════════════════

AURAS.cosmiccrouton = (c: AuraCtx): Aura => {
  const sc = c.scene;
  ensure3(sc);
  const look = legendLook('cosmiccrouton');
  const glow = sc.add.image(0, 0, c.square ? 'pza_glowSq' : 'glow').setTint(look.col).setBlendMode(ADD).setAlpha(0.25);
  const neb = sc.add.image(0, 0, 'glow').setTint(0x2b3d8f).setBlendMode(ADD).setAlpha(0.3);
  const orbit = sc.add.image(0, 0, c.square ? 'pza_rimSq' : 'pza_auraRing').setTint(0x7df9ff).setBlendMode(ADD).setAlpha(0.14);
  const shadow = sc.add.image(0, 0, 'glow').setTint(0x000000).setAlpha(0.22);
  const cr = sc.add.image(0, 0, 'pk_crouton0');
  const trail = Array.from({ length: 5 }, () => sc.add.image(0, 0, 'pza_mote').setTint(0xffe2a0).setBlendMode(ADD).setAlpha(0));
  // stars twinkling round the plate
  const stars = Array.from({ length: 10 }, (_, i) => ({ img: sc.add.image(0, 0, 'pza_glint').setBlendMode(ADD).setTint(i % 3 ? 0xffffff : 0x7df9ff), a: (i / 10) * Math.PI * 2 + crand() * 0.4, r: 1.05 + crand() * 0.25, ph: crand() * 6, sp: 1.2 + crand() * 1.6 }));
  c.under.add([neb, glow, orbit]);
  c.mid.add([...stars.map((s) => s.img), shadow, ...trail, cr]);
  let t = crand() * 10;
  let ang = crand() * Math.PI * 2;
  let flare = 0;
  let frame = 0;
  return {
    update(dt, f) {
      const calm = f.calm || f.basic;
      const s = c.s();
      t += dt;
      flare = Math.max(0, flare - dt * 1.4);
      const q = f.quiet ? 0.5 : 1;
      const br = calm ? 0 : Math.sin(t * 1.1);
      glow.setPosition(0, -4).setScale((f.prx * 2.6) / 256, (f.pry * 2.9) / 256).setAlpha(q * (0.4 + 0.06 * br + 0.3 * flare));
      neb.setPosition(f.prx * 0.15 * Math.sin(t * 0.3), -2).setScale((f.prx * 2.3) / 256, (f.pry * 2.4) / 256).setAlpha(q * (0.3 + 0.08 * Math.sin(t * 0.7 + 1)));
      orbit.setPosition(0, f.cy + 2 * s).setScale((f.rx * 2.5) / 256, (f.ry * 2.2) / 256).setAlpha(q * (0.16 + 0.25 * flare));
      // the crouton moon: round the crust on a tilted loop (flatter at the front, clear of the labels under the plate)
      ang += dt * (calm ? 0.25 : 0.7 + 4 * flare);
      const r = 1.25;
      const x = Math.cos(ang) * f.rx * r;
      const y = f.cy + 4 * s + Math.sin(ang) * f.ry * (Math.sin(ang) > 0 ? 1.04 : r);
      frame = calm ? 0 : (frame + dt * (8 + 20 * flare)) % CROUTON_FRAMES;
      const k = (0.52 + 0.06 * Math.sin(ang)) * s * (1 + 0.2 * flare);
      cr.setTexture(`pk_crouton${Math.floor(frame)}`).setPosition(x, y - 10 * s).setScale(k).setAlpha(q);
      shadow.setPosition(x + 3 * s, y + 8 * s).setScale((70 * s) / 256, (22 * s) / 256).setAlpha(0.22 * q);
      trail.forEach((m, i) => {
        const a2 = ang - (i + 1) * 0.11;
        m.setPosition(Math.cos(a2) * f.rx * r, f.cy - 6 * s + Math.sin(a2) * f.ry * (Math.sin(a2) > 0 ? 1.04 : r))
          .setScale((0.8 - i * 0.12) * s)
          .setAlpha(calm ? 0 : q * (0.4 - i * 0.07));
      });
      for (const st of stars) {
        const tw = calm ? 0.5 : Math.max(0, Math.sin(t * st.sp + st.ph));
        st.img.setPosition(Math.cos(st.a) * f.prx * st.r, -4 + Math.sin(st.a) * f.pry * st.r).setScale((0.35 + 0.5 * tw + 0.4 * flare) * s).setAlpha(q * (0.25 + 0.7 * tw)).setRotation(t * 0.6);
      }
    },
    flare(k) {
      flare = Math.max(flare, k);
    },
    setVisible(on) {
      for (const o of [glow, neb, orbit, shadow, cr, ...trail, ...stars.map((s) => s.img)]) o.setVisible(on);
    },
    destroy() {},
  };
};

// ════════════════════════════ Roar Roast ════════════════════════════

AURAS.roarroast = (c: AuraCtx): Aura => {
  const sc = c.scene;
  ensure3(sc);
  const look = legendLook('roarroast');
  // the Lodge's firelight under it, a ring of coals breathing round the plate, heat shimmer rising off its back
  const glow = sc.add.image(0, 0, c.square ? 'pza_glowSq' : 'glow').setTint(look.col).setBlendMode(ADD).setAlpha(0.3);
  const ember = sc.add.image(0, 0, 'glow').setTint(0xff3a0a).setBlendMode(ADD).setAlpha(0.2);
  // the bed of coals glowing round the plate's rim
  const bed = sc.add.image(0, 0, c.square ? 'pza_rimSq' : 'pza_auraRing').setTint(0xff5a1a).setBlendMode(ADD).setAlpha(0.3);
  const coals = Array.from({ length: 14 }, (_, i) => ({ img: sc.add.image(0, 0, 'pk_coal'), a: (i / 14) * Math.PI * 2 + crand() * 0.15, ph: crand() * 6, k: 0.7 + crand() * 0.4, rot: crand() * 6 }));
  const coalGlow = coals.map(() => sc.add.image(0, 0, 'glow').setTint(0xff6a1a).setBlendMode(ADD).setAlpha(0));
  const shimmer: Mote[] = Array.from({ length: 8 }, () => mote(sc.add.image(0, 0, 'pk_shimmer').setOrigin(0.5, 1).setBlendMode(ADD)));
  const embers: Mote[] = Array.from({ length: 16 }, () => mote(sc.add.image(0, 0, 'pza_ember').setBlendMode(ADD)));
  c.under.add([glow, ember, bed, ...coalGlow]);
  c.mid.add([...coals.map((o) => o.img), ...shimmer.map((m) => m.img), ...embers.map((m) => m.img)]);
  let t = crand() * 10;
  let flare = 0;
  let accS = 0;
  let accE = 0;
  let lastF: AuraFrame | null = null;
  const rise = (f: AuraFrame) => {
    const m = shimmer.find((q) => q.t >= q.life);
    if (!m) return;
    const s = c.s();
    // off its back, either side of the freshness bar
    const side = crand() < 0.5 ? -1 : 1;
    const u = 0.45 + crand() * 0.45;
    m.x = side * f.rx * u;
    m.y = f.cy - f.ry * Math.sqrt(Math.max(0, 1 - u * u)) * 0.9;
    m.vx = side * 3 * s;
    m.vy = -22 * s;
    m.t = 0;
    m.life = 1.6 + crand() * 0.8;
    m.s0 = 0.5 * s;
    m.s1 = 0.75 * s;
    m.a = 0.4;
    m.ph = crand() * 6;
  };
  const spark = (f: AuraFrame, burst: boolean) => {
    const m = embers.find((q) => q.t >= q.life);
    if (!m) return;
    const s = c.s();
    const a = crand() * Math.PI * 2;
    m.x = Math.cos(a) * f.prx * (0.95 + crand() * 0.1);
    m.y = -4 + Math.sin(a) * f.pry * (0.95 + crand() * 0.1);
    m.vx = (burst ? Math.cos(a) * 60 : (crand() - 0.5) * 12) * s;
    m.vy = (burst ? -90 - crand() * 60 : -40 - crand() * 30) * s;
    m.t = 0;
    m.life = burst ? 0.9 : 1.4 + crand() * 0.8;
    m.s0 = (0.8 + crand() * 0.5) * s;
    m.s1 = 0.2 * s;
    m.a = 0.95;
    m.ph = crand() * 6;
  };
  return {
    update(dt, f) {
      lastF = f;
      const calm = f.calm || f.basic;
      const s = c.s();
      t += dt;
      flare = Math.max(0, flare - dt * 1.2);
      const q = f.quiet ? 0.4 : 1;
      // (a fire's flicker: a few sines)
      const fl = calm ? 0 : 0.5 * Math.sin(t * 2.3) + 0.3 * Math.sin(t * 6.1 + 1) + 0.2 * Math.sin(t * 13.3 + 2);
      glow.setPosition(0, -4).setScale((f.prx * 2.7) / 256, (f.pry * 3) / 256).setAlpha(q * (0.5 + 0.1 * fl + 0.35 * flare));
      ember.setPosition(0, -2).setScale((f.prx * 2.1) / 256, (f.pry * 2) / 256).setAlpha(q * (0.3 + 0.12 * fl + 0.25 * flare));
      bed.setPosition(0, -4).setScale((f.prx * 2.18) / 256, (f.pry * 2.22) / 256).setAlpha(q * (0.4 + 0.12 * fl + 0.4 * flare));
      coals.forEach((o, i) => {
        const x = Math.cos(o.a) * f.prx * 1.02;
        const y = -4 + Math.sin(o.a) * f.pry * 1.02;
        // each breathes on its own
        const br = calm ? 0.5 : (Math.sin(t * 1.7 + o.ph) + 1) / 2;
        o.img.setPosition(x, y).setScale(o.k * s * 0.95).setRotation(o.rot).setAlpha(q);
        coalGlow[i].setPosition(x, y).setScale((60 * s * (1 + 0.3 * br + 0.6 * flare)) / 256).setAlpha(q * (0.5 + 0.4 * br + 0.3 * flare));
      });
      accS += dt * (calm ? 0.8 : 2.4) * (f.quiet ? 0.3 : 1);
      while (accS >= 1) {
        accS -= 1;
        rise(f);
      }
      accE += dt * (calm ? 1.2 : 3.6 + 10 * flare) * q;
      while (accE >= 1) {
        accE -= 1;
        spark(f, false);
      }
      for (const m of shimmer) {
        if (m.t < m.life) m.img.setScale(m.s0 * (1 + 0.15 * Math.sin(m.t * 9 + m.ph)), m.s0 + (m.s1 - m.s0) * (m.t / m.life));
      }
      stepMotes(shimmer, dt, calm ? 2 : 6, q);
      // (the shimmer's own scale wobble, kept after the step)
      for (const m of shimmer) if (m.t < m.life) m.img.setScale(m.img.scaleX * (1 + 0.12 * Math.sin(m.t * 11 + m.ph)), m.img.scaleY);
      stepMotes(embers, dt, calm ? 4 : 14, q);
    },
    flare(k) {
      flare = Math.max(flare, k);
      if (lastF && !lastF.calm) for (let i = 0; i < Math.round(8 * k); i++) spark(lastF, true);
    },
    setVisible(on) {
      for (const o of [glow, ember, bed, ...coals.map((x) => x.img), ...coalGlow]) o.setVisible(on);
      if (!on) for (const m of [...shimmer, ...embers]) m.img.setVisible(false);
    },
    destroy() {},
  };
};

// ════════════════════════════ Black Olive Hole ════════════════════════════

AURAS.blackolivehole = (c: AuraCtx): Aura => {
  const sc = c.scene;
  ensure3(sc);
  const look = legendLook('blackolivehole');
  // the void under it (the table darkened, its light bent away), a warm glow at the disc's inner edge
  const voidG = sc.add.image(0, 0, 'glow').setTint(0x000000).setAlpha(0.35);
  const glow = sc.add.image(0, 0, c.square ? 'pza_glowSq' : 'glow').setTint(look.col).setBlendMode(ADD).setAlpha(0.22);
  const violet = sc.add.image(0, 0, 'glow').setTint(0x6a4aff).setBlendMode(ADD).setAlpha(0.15);
  // the disc turning round the plate, and its far side bent up behind the pie (the lensing)
  // (each spun flat inside a box that tilts it: a squashed sprite turned would turn its squash with it)
  const disc = sc.add.image(0, 0, 'pk_discwide').setBlendMode(ADD);
  const lensed = sc.add.image(0, 0, 'pk_discwide').setBlendMode(ADD);
  const discBox = sc.add.container(0, 0, [disc]);
  const lensBox = sc.add.container(0, 0, [lensed]);
  const streaks: Mote[] = Array.from({ length: 10 }, () => mote(sc.add.image(0, 0, 'pk_starstreak').setBlendMode(ADD)));
  c.under.add([voidG, violet, glow]);
  c.mid.add([lensBox, discBox, ...streaks.map((m) => m.img)]);
  let t = crand() * 10;
  let flare = 0;
  let acc = 0;
  let lastF: AuraFrame | null = null;
  const fall = (f: AuraFrame, burst: boolean) => {
    const m = streaks.find((q) => q.t >= q.life);
    if (!m) return;
    const s = c.s();
    // from outside the plate, falling in towards the pie's rim (they're under the pie: gone as they reach it)
    const a = crand() * Math.PI * 2;
    const r0 = 1.5 + crand() * 0.5;
    m.x = Math.cos(a) * f.prx * r0;
    m.y = f.cy + Math.sin(a) * f.pry * r0;
    const sp = (burst ? 2.4 : 1.1) * (0.8 + crand() * 0.4);
    m.vx = -Math.cos(a) * f.prx * sp;
    m.vy = -Math.sin(a) * f.pry * sp;
    m.t = 0;
    m.life = (r0 - 0.95) / sp;
    m.s0 = (0.7 + crand() * 0.4) * s;
    m.s1 = 0.2 * s;
    m.a = 0.9;
    m.ph = 0;
    m.img.setRotation(Math.atan2(m.vy, m.vx));
  };
  return {
    update(dt, f) {
      lastF = f;
      const calm = f.calm || f.basic;
      t += dt;
      flare = Math.max(0, flare - dt * 1.2);
      const q = f.quiet ? 0.45 : 1;
      const br = calm ? 0 : Math.sin(t * 1.3);
      voidG.setPosition(0, -2).setScale((f.prx * 3.1) / 256, (f.pry * 3.3) / 256).setAlpha(q * (0.32 + 0.1 * flare));
      violet.setPosition(0, -4).setScale((f.prx * 2.9) / 256, (f.pry * 3.1) / 256).setAlpha(q * (0.18 + 0.05 * br));
      glow.setPosition(0, -4).setScale((f.prx * 2.4) / 256, (f.pry * 2.6) / 256).setAlpha(q * (0.36 + 0.06 * br + 0.35 * flare));
      // the disc: round the plate, tilted with the table, turning (faster when it flares)
      const spin = t * (calm ? 0.12 : 0.45 + 2.5 * flare);
      // (its hot inner edge, 150 of 256, just outside the plate's rim)
      discBox.setPosition(0, -4).setScale((f.prx * 1.02 * 256) / 150 / 256, (f.pry * 1.04 * 256) / 150 / 256);
      disc.setRotation(-spin).setAlpha(q * (0.85 + 0.08 * br + 0.15 * flare));
      // the lensed far side: the same disc stood up behind the pie, only its top showing over the back of the pie
      lensBox.setPosition(0, f.cy - f.ry * 0.25).setScale((f.rx * 1.05) / 150, (f.ry * 0.62) / 150);
      lensed.setRotation(spin * 0.7).setAlpha(q * (0.4 + 0.25 * flare));
      acc += dt * (calm ? 1 : 3.2 + 8 * flare) * q;
      while (acc >= 1) {
        acc -= 1;
        fall(f, false);
      }
      stepMotes(streaks, dt, 0, q);
    },
    flare(k) {
      flare = Math.max(flare, k);
      if (lastF && !lastF.calm) for (let i = 0; i < Math.round(6 * k); i++) fall(lastF, true);
    },
    setVisible(on) {
      for (const o of [voidG, violet, glow, discBox, lensBox]) o.setVisible(on);
      if (!on) for (const m of streaks) m.img.setVisible(false);
    },
    destroy() {},
  };
};

// ════════════════════════════ signatures ════════════════════════════

/** A soft pulse of its light spreading over the table round it, under the plate. */
function pulse(c: SigCtx, col: number, k = 1): void {
  const u = c.under;
  if (!u || !u.active) return;
  const sc = c.scene;
  const g = sc.add.image(0, -4 * c.s, 'glow').setTint(col).setBlendMode(ADD).setAlpha(0.5 * k).setScale((300 * c.s) / 256, (150 * c.s) / 256);
  const r = sc.add.image(0, 0, 'ring').setTint(col).setBlendMode(ADD).setAlpha(0.7 * k).setScale((240 * c.s) / 256, (120 * c.s) / 256);
  u.add([g, r]);
  sc.tweens.add({ targets: g, scaleX: (720 * c.s) / 256, scaleY: (330 * c.s) / 256, alpha: 0, duration: 520, ease: 'Quad.Out', onComplete: () => g.destroy() });
  sc.tweens.add({ targets: r, scaleX: (820 * c.s) / 256, scaleY: (380 * c.s) / 256, alpha: 0, duration: 600, ease: 'Quad.Out', onComplete: () => r.destroy() });
}

/** The Black Olive Hole's stomp: a pulse that falls inwards (the ring shrinking to the pie). */
function implode(c: SigCtx, col: number, k = 1): void {
  const u = c.under;
  if (!u || !u.active) return;
  const sc = c.scene;
  const r = sc.add.image(0, 0, 'ring').setTint(col).setBlendMode(ADD).setAlpha(0).setScale((760 * c.s) / 256, (350 * c.s) / 256);
  u.add(r);
  sc.tweens.add({ targets: r, scaleX: (200 * c.s) / 256, scaleY: (90 * c.s) / 256, alpha: { from: 0.75 * k, to: 0 }, duration: 480, ease: 'Quad.In', onComplete: () => r.destroy() });
}

SIGNATURES.cosmiccrouton = {
  stomp(c) {
    pulse(c, legendLook('cosmiccrouton').col, c.light ? 0.6 : 1);
    // a crunch from beyond the stars
    audio.sfx('sfx_smack_cosmic_2', { volume: c.light ? 0.3 : 0.45, throttle: 400 });
  },
  fire(c) {
    pulse(c, 0x7df9ff, 0.8);
  },
};

SIGNATURES.roarroast = {
  stomp(c) {
    pulse(c, legendLook('roarroast').col, c.light ? 0.6 : 1);
    // the coals flare with a whoomph
    audio.sfx('sfx_smack_fire_1', { volume: c.light ? 0.3 : 0.45, throttle: 400 });
  },
  fire(c) {
    pulse(c, 0xffd27a, 0.9);
  },
};

SIGNATURES.blackolivehole = {
  stomp(c) {
    implode(c, legendLook('blackolivehole').col, c.light ? 0.6 : 1);
    // it swallows the blow
    audio.sfx('sfx_cosmiccroc_holeclose', { volume: c.light ? 0.25 : 0.4, throttle: 400 });
  },
  fire(c) {
    implode(c, 0xffe0b0, 0.9);
  },
};
