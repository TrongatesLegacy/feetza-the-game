// The Legendaries' auras and signatures on the table (docs/pizza-plan.md, section 1's Legendary column), plugged into
// the living pizzas' hooks (AURAS and SIGNATURES in src/game/pizzaAlive.ts). Each aura is its own, layered and always
// moving, and stays round and under the pie: the glows under the plate, what circles or rises round it between the
// plate and the pie (passing behind it), and only the crust's edge between the pie and its face, so the face, slices,
// labels, freshness bar and shield always draw over all of it. Calm (reduced motion) and basic (low graphics) still
// show it, quieter. A stale or perk-frozen pie's aura dims. Cosmetic only: crand(), never Math.random.
//
// - Nonna's Masterpiece: the warm glow of a wood oven, flickering under the plate and lighting it from behind, flour
//   drifting down round it, now and then a puff of it off the rim.
// - Silver Service: a cool silver light under it and the Head Waiter's tray circling the crust on the table, catching
//   the light as it comes round.
// - The First Bake: a golden glow, steam rising in plumes off its back either side of the freshness bar, and a golden
//   shimmer running round its crust.
// - Big Top Pie: King Honk's circus: a warm glow, a spotlight sweeping across the plate with its beam rising behind
//   the pie, marquee bulbs chasing round the plate, confetti fluttering down round it.
// - Sandcastle Citadel: Sandcastle Sam's: a sandy glow, sand swirling round the plate and lifting off it, and his keep
//   standing on the plate's back right, just clear of the pie, flying a pennant for each stomp the citadel can still
//   take this wave (its perk tears them off).
// - Tidal Tiki: the Beach's sea under the plate and the surf lapping round it on the tide's slow beat, foam riding
//   its edge.
//
// Signatures: stomped, the aura flares (pizzaAlive), a soft pulse of its light spreads over the table round it under
// the plate, and its own sound plays (lighter in a boss fight); its perk firing adds a flourish to its perk's moment.

import Phaser from 'phaser';
import { drawFlour, drawSilverTray } from '../art/perkPropsLegend';
import { drawBulb, drawConfetti, drawFoam, drawKeep, drawPennant, drawSandGrain, keepPennant } from '../art/perkPropsLegend2';
import { audio } from '../systems/audio';
import { crand } from '../systems/cosmeticRandom';
import { legendLook } from './legendary';
import { AURAS, SIGNATURES, type Aura, type AuraCtx, type AuraFrame, type SigCtx } from './pizzaAlive';

function ensure(sc: Phaser.Scene): void {
  if (!sc.textures.exists('pk_flour')) sc.textures.addCanvas('pk_flour', drawFlour());
  if (!sc.textures.exists('pk_tray')) sc.textures.addCanvas('pk_tray', drawSilverTray());
}

const ADD = Phaser.BlendModes.ADD;

/** A pool of drifting sprites (cosmetic). */
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

function stepMotes(ms: Mote[], dt: number, sway = 0): void {
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
      .setAlpha(m.a * Math.sin(Math.PI * Math.min(1, u * 1.1)));
  }
}

function freeMote(ms: Mote[]): Mote | undefined {
  return ms.find((m) => m.t >= m.life);
}

// ════════════════════════════ Nonna's Masterpiece ════════════════════════════

AURAS.nonnasmasterpiece = (c: AuraCtx): Aura => {
  const sc = c.scene;
  ensure(sc);
  const look = legendLook('nonnasmasterpiece');
  // the oven's glow under the plate, and its light from behind the pie (a low warm crescent at its back)
  const glow = sc.add.image(0, 0, c.square ? 'pza_glowSq' : 'glow').setTint(look.col).setBlendMode(ADD).setAlpha(0.3);
  const ember = sc.add.image(0, 0, 'glow').setTint(0xff5a1a).setBlendMode(ADD).setAlpha(0.2);
  const back = sc.add.image(0, 0, 'glow').setTint(0xffb060).setBlendMode(ADD).setAlpha(0.25);
  const ring = sc.add.image(0, 0, c.square ? 'pza_rimSq' : 'pza_rim').setTint(0xffc890).setBlendMode(ADD).setAlpha(0.18);
  c.under.add([glow, ember, back]);
  c.mid.add(ring);
  const flour: Mote[] = Array.from({ length: 22 }, () => ({ img: sc.add.image(0, 0, 'pk_flour').setVisible(false), t: 1, life: 0, x: 0, y: 0, vx: 0, vy: 0, s0: 0, s1: 0, a: 0, ph: 0 }));
  c.mid.add(flour.map((m) => m.img));
  let t = crand() * 10;
  let flare = 0;
  let acc = 0;
  let puffT = 2 + crand() * 3;
  let lastF: AuraFrame | null = null;
  const drift = (f: AuraFrame, burst: boolean) => {
    const m = freeMote(flour);
    if (!m) return;
    const s = c.s();
    const ang = crand() * Math.PI * 2;
    const r = burst ? 1 + crand() * 0.1 : 0.95 + crand() * 0.4;
    m.x = Math.cos(ang) * f.rx * r;
    m.y = f.cy + Math.sin(ang) * f.ry * r - (burst ? 0 : f.ry * (0.6 + crand() * 0.9));
    m.vx = burst ? Math.cos(ang) * (60 + crand() * 70) * s : (crand() - 0.5) * 10 * s;
    m.vy = burst ? (-30 - crand() * 40) * s : (14 + crand() * 12) * s;
    m.t = 0;
    m.life = burst ? 0.9 + crand() * 0.5 : 2.6 + crand() * 1.6;
    m.s0 = (0.8 + crand() * 0.5) * s;
    m.s1 = (burst ? 1.4 : 0.8) * s;
    m.a = burst ? 0.75 : 0.55 + crand() * 0.3;
    m.ph = crand() * 6;
  };
  return {
    update(dt, f) {
      lastF = f;
      const calm = f.calm || f.basic;
      t += dt;
      flare = Math.max(0, flare - dt * 1.3);
      const q = f.quiet ? 0.45 : 1;
      // (an oven's flicker: a few slow sines and a little shimmer on top)
      const fl = calm ? 0 : 0.5 * Math.sin(t * 2.1) + 0.3 * Math.sin(t * 5.3 + 1) + 0.2 * Math.sin(t * 11.7 + 2);
      glow.setPosition(0, -4).setScale((f.prx * 2.7) / 256, (f.pry * 3) / 256).setAlpha(q * (0.5 + 0.08 * fl + 0.3 * flare));
      ember.setPosition(0, -2).setScale((f.prx * 2) / 256, (f.pry * 1.9) / 256).setAlpha(q * (0.3 + 0.1 * fl + 0.2 * flare));
      back.setPosition(0, f.cy - f.ry * 0.75).setScale((f.rx * 2.8) / 256, (f.ry * 1.7) / 256).setAlpha(q * (0.36 + 0.08 * fl + 0.25 * flare));
      ring.setPosition(0, f.cy).setScale((f.rx * 2.35) / 256, (f.ry * 2.35) / 256).setAlpha(q * (0.28 + 0.08 * fl + 0.3 * flare));
      // the flour drifting down round it
      acc += dt * (calm ? 1.5 : 4.5) * q;
      while (acc >= 1) {
        acc -= 1;
        drift(f, false);
      }
      if (!calm && (puffT -= dt) <= 0) {
        puffT = 3 + crand() * 3;
        for (let i = 0; i < 5; i++) drift(f, true);
      }
      stepMotes(flour, dt, calm ? 4 : 12);
    },
    flare(k) {
      flare = Math.max(flare, k);
      if (lastF && !lastF.calm) for (let i = 0; i < Math.round(8 * k); i++) drift(lastF, true);
    },
    setVisible(on) {
      for (const o of [glow, ember, back, ring]) o.setVisible(on);
      if (!on) for (const m of flour) m.img.setVisible(false);
    },
    destroy() {},
  };
};

// ════════════════════════════ Silver Service ════════════════════════════

AURAS.silverservice = (c: AuraCtx): Aura => {
  const sc = c.scene;
  ensure(sc);
  const look = legendLook('silverservice');
  const glow = sc.add.image(0, 0, c.square ? 'pza_glowSq' : 'glow').setTint(look.col).setBlendMode(ADD).setAlpha(0.22);
  const sheen = sc.add.image(0, 0, c.square ? 'pza_rimSq' : 'pza_auraRing').setTint(0xffffff).setBlendMode(ADD).setAlpha(0.16);
  const sheenBox = sc.add.container(0, 0, [sheen]);
  // the tray and its shadow on the table, and a few glints trailing behind it
  const shadow = sc.add.image(0, 0, 'glow').setTint(0x000000).setAlpha(0.22);
  const tray = sc.add.image(0, 0, 'pk_tray');
  const star = sc.add.image(0, 0, 'pza_glint').setBlendMode(ADD).setAlpha(0);
  const trail = Array.from({ length: 4 }, () => sc.add.image(0, 0, 'pza_mote').setTint(0xe8f0fa).setBlendMode(ADD).setAlpha(0));
  c.under.add([glow, sheenBox]);
  c.mid.add([shadow, ...trail, tray, star]);
  let t = crand() * 10;
  let ang = crand() * Math.PI * 2;
  let flare = 0;
  let spin = 0;
  return {
    update(dt, f) {
      const calm = f.calm || f.basic;
      const s = c.s();
      t += dt;
      flare = Math.max(0, flare - dt * 1.5);
      const q = f.quiet ? 0.5 : 1;
      ang += dt * (calm ? 0.2 : 0.55 + 3.2 * flare);
      spin = calm ? 0 : spin + dt * 0.4;
      const br = calm ? 0 : Math.sin(t * 1.4);
      glow.setPosition(0, -4).setScale((f.prx * 2.6) / 256, (f.pry * 2.9) / 256).setAlpha(q * (0.42 + 0.06 * br + 0.3 * flare));
      sheenBox.setPosition(0, -4).setScale((f.prx * 2.1) / 256, (f.pry * 2.1) / 256);
      sheen.setRotation(c.square ? 0 : -spin).setAlpha(q * (0.3 + 0.08 * br + 0.35 * flare));
      // round the crust on the table, just outside the pie (behind it at the back)
      const r = 1.22;
      const x = Math.cos(ang) * f.rx * r;
      // (a flatter loop than the pie: at the front it stays clear of the name and perk lines under the plate)
      const y = f.cy + 4 * s + Math.sin(ang) * f.ry * (Math.sin(ang) > 0 ? 1.02 : r);
      const k = (0.3 + 0.03 * Math.sin(ang)) * s * (1 + 0.15 * flare);
      tray.setPosition(x, y - 6 * s).setScale(k, k * (0.9 + 0.1 * Math.cos(t * 2))).setRotation(Math.cos(ang) * 0.12).setAlpha(q);
      shadow.setPosition(x + 4 * s, y + 4 * s).setScale((70 * s) / 256, (26 * s) / 256).setAlpha(0.2 * q);
      trail.forEach((m, i) => {
        const a2 = ang - (i + 1) * 0.12;
        m.setPosition(Math.cos(a2) * f.rx * r, f.cy + Math.sin(a2) * f.ry * r)
          .setScale((0.9 - i * 0.15) * s)
          .setAlpha(calm ? 0 : q * (0.32 - i * 0.07));
      });
      // it catches the light as it comes round the top left
      const facing = Math.max(0, Math.cos(ang + 2.3));
      const glint = Math.pow(facing, 8) + flare * 0.8;
      star.setPosition(x - 16 * s, y - 12 * s).setScale((0.7 + glint) * s).setAlpha(Math.min(1, glint) * q).setRotation(t * 2);
    },
    flare(k) {
      flare = Math.max(flare, k);
    },
    setVisible(on) {
      for (const o of [glow, sheenBox, shadow, tray, star, ...trail]) o.setVisible(on);
    },
    destroy() {},
  };
};

// ════════════════════════════ The First Bake ════════════════════════════

AURAS.firstbake = (c: AuraCtx): Aura => {
  const sc = c.scene;
  const look = legendLook('firstbake');
  const glow = sc.add.image(0, 0, c.square ? 'pza_glowSq' : 'glow').setTint(look.col).setBlendMode(ADD).setAlpha(0.3);
  const heat = sc.add.image(0, 0, 'glow').setTint(0xff9a2a).setBlendMode(ADD).setAlpha(0.15);
  const rim = sc.add.image(0, 0, c.square ? 'pza_rimSq' : 'pza_rim').setTint(look.col).setBlendMode(ADD).setAlpha(0.2);
  // the shimmer: three glints running round the crust (its top two-thirds: never by the face), and their trails
  const glints = Array.from({ length: 3 }, (_, i) => ({ img: sc.add.image(0, 0, 'pza_glint').setTint(0xfff2c0).setBlendMode(ADD), a: (i / 3) * Math.PI * 2 }));
  const steam: Mote[] = Array.from({ length: 16 }, () => ({ img: sc.add.image(0, 0, 'pza_steam').setVisible(false), t: 1, life: 0, x: 0, y: 0, vx: 0, vy: 0, s0: 0, s1: 0, a: 0, ph: 0 }));
  c.under.add([glow, heat]);
  c.mid.add(steam.map((m) => m.img));
  c.top.add([rim, ...glints.map((g) => g.img)]);
  let t = crand() * 10;
  let flare = 0;
  let acc = 0;
  let lastF: AuraFrame | null = null;
  const plume = (f: AuraFrame, burst: boolean) => {
    const m = freeMote(steam);
    if (!m) return;
    const s = c.s();
    // off its back, either side of the freshness bar
    const side = crand() < 0.5 ? -1 : 1;
    const u = 0.5 + crand() * 0.4;
    m.x = side * f.rx * u;
    m.y = f.cy - f.ry * Math.sqrt(Math.max(0, 1 - u * u)) * 0.95;
    m.vx = side * (4 + crand() * 8) * s;
    m.vy = (burst ? -70 : -34 - crand() * 16) * s;
    m.t = 0;
    m.life = burst ? 0.9 : 1.8 + crand() * 0.9;
    m.s0 = 0.55 * s;
    m.s1 = (burst ? 1.4 : 1.2 + crand() * 0.3) * s;
    m.a = burst ? 0.55 : 0.4 + crand() * 0.12;
    m.ph = crand() * 6;
  };
  return {
    update(dt, f) {
      lastF = f;
      const calm = f.calm || f.basic;
      const s = c.s();
      t += dt;
      flare = Math.max(0, flare - dt * 1.3);
      const q = f.quiet ? 0.4 : 1;
      const br = calm ? 0 : Math.sin(t * 1.2);
      glow.setPosition(0, -4).setScale((f.prx * 2.7) / 256, (f.pry * 3) / 256).setAlpha(q * (0.48 + 0.07 * br + 0.3 * flare));
      heat.setPosition(0, f.cy).setScale((f.rx * 2.4) / 256, (f.ry * 2.2) / 256).setAlpha(q * (0.22 + 0.06 * Math.sin(t * 2.7) + 0.2 * flare));
      rim.setPosition(0, f.cy).setScale((f.rx * 2.06) / 256, (f.ry * 2.06) / 256).setAlpha(q * (0.34 + 0.1 * br + 0.35 * flare));
      for (const g of glints) {
        g.a += dt * (calm ? 0.25 : 0.9 + 2 * flare);
        // (along the crust, skipping its front third: the face sits there)
        const a = Math.PI * 0.85 + (((g.a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) * (1.3 / 2);
        const e = Math.sin(((a - Math.PI * 0.85) / (Math.PI * 1.3)) * Math.PI);
        g.img.setPosition(Math.cos(a) * f.rx * 0.97, f.cy + Math.sin(a) * f.ry * 0.97).setScale((0.9 + 0.7 * e + 0.6 * flare) * s).setAlpha(q * (0.45 + 0.55 * e));
      }
      // the steam rising in plumes off its back (a stale pie has gone cold: barely any)
      acc += dt * (calm ? 1.2 : 3.2) * (f.quiet ? 0.2 : 1);
      while (acc >= 1) {
        acc -= 1;
        plume(f, false);
      }
      stepMotes(steam, dt, calm ? 3 : 9);
    },
    flare(k) {
      flare = Math.max(flare, k);
      if (lastF && !lastF.calm) for (let i = 0; i < Math.round(6 * k); i++) plume(lastF, true);
    },
    setVisible(on) {
      for (const o of [glow, heat, rim, ...glints.map((g) => g.img)]) o.setVisible(on);
      if (!on) for (const m of steam) m.img.setVisible(false);
    },
    destroy() {},
  };
};

// ════════════════════════════ Act 2 (batch 2) ════════════════════════════

function ensure2(sc: Phaser.Scene): void {
  const tex: [string, () => HTMLCanvasElement][] = [
    ['pk_confetti', drawConfetti],
    ['pk_bulb', drawBulb],
    ['pk_keep', drawKeep],
    ['pk_pennant', drawPennant],
    ['pk_sand', drawSandGrain],
    ['pk_foam', drawFoam],
  ];
  for (const [k, d] of tex) if (!sc.textures.exists(k)) sc.textures.addCanvas(k, d());
}

// ——— Big Top Pie ———

AURAS.bigtoppie = (c: AuraCtx): Aura => {
  const sc = c.scene;
  ensure2(sc);
  const look = legendLook('bigtoppie');
  const cols = look.confetti.map((h) => parseInt(h.slice(1), 16));
  // a warm glow under the plate, the spotlight sweeping across it with its beam, and marquee bulbs round the plate
  // chasing each other
  const glow = sc.add.image(0, 0, c.square ? 'pza_glowSq' : 'glow').setTint(look.col).setBlendMode(ADD).setAlpha(0.22);
  const spot = sc.add.image(0, 0, 'glow').setTint(0xfff2c8).setBlendMode(ADD).setAlpha(0.5);
  const beam = sc.add.image(0, 0, 'glow').setOrigin(0.5, 0.92).setTint(0xfff2c8).setBlendMode(ADD).setAlpha(0.1);
  const bulbs = Array.from({ length: 18 }, () => sc.add.image(0, 0, 'pk_bulb'));
  // (the spotlight's pool spills over the table round the plate; the bulbs sit on the plate's rim, under the pie)
  c.under.add([glow, beam, spot]);
  c.mid.add(bulbs);
  // confetti fluttering down round it
  const conf: (Mote & { spin: number })[] = Array.from({ length: 16 }, (_, i) => ({ img: sc.add.image(0, 0, 'pk_confetti').setTint(cols[i % cols.length]).setVisible(false), t: 1, life: 0, x: 0, y: 0, vx: 0, vy: 0, s0: 0, s1: 0, a: 0, ph: 0, spin: 0 }));
  c.mid.add(conf.map((m) => m.img));
  let t = crand() * 10;
  let flare = 0;
  let acc = 0;
  let lastF: AuraFrame | null = null;
  const drop = (f: AuraFrame, burst: boolean) => {
    const m = conf.find((q) => q.t >= q.life);
    if (!m) return;
    const s = c.s();
    const ang = crand() * Math.PI * 2;
    const r = burst ? 0.9 : 0.95 + crand() * 0.35;
    m.x = Math.cos(ang) * f.rx * r;
    m.y = f.cy + Math.sin(ang) * f.ry * r - (burst ? f.ry * 0.3 : f.ry * (0.9 + crand() * 1.1));
    m.vx = burst ? Math.cos(ang) * (70 + crand() * 60) * s : (crand() - 0.5) * 14 * s;
    m.vy = burst ? (-60 - crand() * 60) * s : (22 + crand() * 16) * s;
    m.t = 0;
    m.life = burst ? 1.1 + crand() * 0.4 : 2.4 + crand() * 1.4;
    m.s0 = (1.1 + crand() * 0.4) * s;
    m.s1 = m.s0;
    m.a = 0.9;
    m.ph = crand() * 6;
    m.spin = (crand() - 0.5) * 8;
  };
  return {
    update(dt, f) {
      lastF = f;
      const calm = f.calm || f.basic;
      const s = c.s();
      t += dt;
      flare = Math.max(0, flare - dt * 1.3);
      const q = f.quiet ? 0.45 : 1;
      glow.setPosition(0, -4).setScale((f.prx * 2.6) / 256, (f.pry * 2.9) / 256).setAlpha(q * (0.38 + 0.3 * flare));
      // the spotlight's sweep: slow, side to side across the plate, brightening at the middle
      const sw = calm ? 0 : Math.sin(t * 0.7);
      const sx = sw * f.prx * 0.55;
      spot.setPosition(sx, -2).setScale((f.prx * 2.3) / 256, (f.pry * 2.6) / 256).setAlpha(q * (0.5 + 0.12 * (1 - Math.abs(sw)) + 0.35 * flare));
      beam.setPosition(sx, 0).setScale((f.prx * 0.9) / 256, (300 * s) / 256).setRotation(sw * 0.18).setAlpha(q * (calm ? 0.06 : 0.09 + 0.2 * flare));
      // the bulbs: a chase running round the plate (every third lit), all lit while it flares
      const n = bulbs.length;
      const step = calm ? 0 : Math.floor(t * 6);
      bulbs.forEach((b, i) => {
        const a = (i / n) * Math.PI * 2;
        const on = flare > 0.3 || (i + step) % 3 === 0;
        b.setPosition(Math.cos(a) * f.prx * 0.97, -4 + Math.sin(a) * f.pry * 0.98)
          .setScale((on ? 0.95 : 0.8) * s)
          .setAlpha(q * (on ? 1 : 0.45));
      });
      acc += dt * (calm ? 1.2 : 3.2) * q;
      while (acc >= 1) {
        acc -= 1;
        drop(f, false);
      }
      // (the confetti tumbles: it flips as it turns)
      for (const m of conf) {
        if (m.t >= m.life) {
          m.img.setVisible(false);
          continue;
        }
        m.t += dt;
        m.vy += (m.vy < 26 * s ? 120 : 0) * s * dt;
        m.x += (m.vx + Math.sin(m.t * 3 + m.ph) * 16 * s) * dt;
        m.y += m.vy * dt;
        m.vx *= 1 - dt * 1.5;
        const u = m.t / m.life;
        m.img.setVisible(true).setPosition(m.x, m.y).setRotation(m.ph + m.t * m.spin).setScale(m.s0, m.s0 * Math.cos(m.t * 7 + m.ph)).setAlpha(m.a * Math.min(1, (1 - u) * 3) * q);
      }
    },
    flare(k) {
      flare = Math.max(flare, k);
      if (lastF && !lastF.calm) for (let i = 0; i < Math.round(8 * k); i++) drop(lastF, true);
    },
    setVisible(on) {
      for (const o of [glow, spot, beam, ...bulbs]) o.setVisible(on);
      if (!on) for (const m of conf) m.img.setVisible(false);
    },
    destroy() {},
  };
};

// ——— Sandcastle Citadel ———

AURAS.sandcastlecitadel = (c: AuraCtx): Aura => {
  const sc = c.scene;
  ensure2(sc);
  const look = legendLook('sandcastlecitadel');
  // a sandy glow under the plate, sand swirling round it, and Sam's keep on its back right with a pennant for each
  // stomp the citadel can still take, fluttering
  const glow = sc.add.image(0, 0, c.square ? 'pza_glowSq' : 'glow').setTint(look.col).setBlendMode(ADD).setAlpha(0.24);
  const shadow = sc.add.image(0, 0, 'glow').setTint(0x000000).setAlpha(0.22);
  const keep = sc.add.image(0, 0, 'pk_keep').setOrigin(0.5, 1);
  const flags = Array.from({ length: 5 }, () => sc.add.image(0, 0, 'pk_pennant').setOrigin(0.04, 0.5).setVisible(false));
  const sand = Array.from({ length: 22 }, (_, i) => ({ img: sc.add.image(0, 0, 'pk_sand'), a: (i / 22) * Math.PI * 2 + crand() * 0.3, r: 1.02 + crand() * 0.14, h: crand(), sp: 0.5 + crand() * 0.4, ph: crand() * 6 }));
  c.under.add(glow);
  c.mid.add([...sand.map((g) => g.img), shadow, keep, ...flags]);
  let t = crand() * 10;
  let flare = 0;
  const shown = flags.map(() => 0);
  return {
    update(dt, f) {
      const calm = f.calm || f.basic;
      const s = c.s();
      t += dt;
      flare = Math.max(0, flare - dt * 1.3);
      const q = f.quiet ? 0.5 : 1;
      glow.setPosition(0, -4).setScale((f.prx * 2.6) / 256, (f.pry * 2.9) / 256).setAlpha(q * (0.4 + 0.05 * Math.sin(t * 1.3) + 0.3 * flare));
      // the sand swirling round the plate, a few grains lifting off it in a spiral and settling
      for (const g of sand) {
        g.a += dt * (calm ? 0.15 : g.sp + 2.5 * flare);
        const lift = calm ? 0 : Math.max(0, Math.sin(t * 0.9 + g.ph)) * g.h;
        const x = Math.cos(g.a) * f.prx * g.r;
        const y = -4 + Math.sin(g.a) * f.pry * g.r - lift * 40 * s;
        g.img.setPosition(x, y).setScale((0.7 + 0.4 * g.h) * s).setAlpha(q * (0.55 + 0.35 * (1 - lift)));
      }
      // the keep on the back right of the plate, just clear of the pie
      const kx = f.rx * 1.02;
      const ky = f.cy - f.ry * 0.62;
      const k = 0.5 * s;
      keep.setPosition(kx, ky).setScale(k).setAlpha(q < 1 ? 0.8 : 1);
      shadow.setPosition(kx + 6 * s, ky).setScale((90 * s) / 256, (20 * s) / 256);
      const own = Number(c.flags().citadelLeft ?? (c.flags().enhanced ? 4 : 3));
      flags.forEach((fl, i) => {
        const want = i < own ? 1 : 0;
        // (a new pennant pops up its pole; a lost one is torn away by the perk's moment)
        shown[i] = want ? Math.min(1, shown[i] + dt * 4) : 0;
        if (!shown[i]) {
          fl.setVisible(false);
          return;
        }
        const [px, py] = keepPennant(i);
        const flut = calm ? 1 : 0.86 + 0.14 * Math.sin(t * 7 + i * 1.7);
        const pop = Phaser.Math.Easing.Back.Out(shown[i]);
        fl.setVisible(true)
          .setPosition(kx + (px - 0.5) * 200 * k, ky - (1 - py) * 170 * k + 9 * k)
          .setScale(0.62 * k * 2 * flut * pop, 0.62 * k * 2 * pop * (calm ? 1 : 1 + 0.06 * Math.sin(t * 9 + i)))
          .setRotation(calm ? 0 : 0.06 * Math.sin(t * 5 + i))
          .setAlpha(q);
      });
    },
    flare(k) {
      flare = Math.max(flare, k);
    },
    setVisible(on) {
      for (const o of [glow, shadow, keep, ...sand.map((g) => g.img)]) o.setVisible(on);
      if (!on) for (const fl of flags) fl.setVisible(false);
    },
    destroy() {},
  };
};

// ——— Tidal Tiki ———

AURAS.tidaltiki = (c: AuraCtx): Aura => {
  const sc = c.scene;
  ensure2(sc);
  const look = legendLook('tidaltiki');
  // the sea under the plate and the surf lapping round it: two rings of water breathing in and out on the tide's slow
  // beat, foam riding their edge and bursting off it as each laps in
  const glow = sc.add.image(0, 0, c.square ? 'pza_glowSq' : 'glow').setTint(look.col).setBlendMode(ADD).setAlpha(0.25);
  const sea = sc.add.image(0, 0, 'glow').setTint(0x1a9ab8).setAlpha(0.22);
  const lapA = sc.add.image(0, 0, c.square ? 'pza_rimSq' : 'pza_auraRing').setTint(0x8af0f0).setBlendMode(ADD);
  const lapB = sc.add.image(0, 0, c.square ? 'pza_rimSq' : 'pza_auraRing').setTint(0xffffff).setBlendMode(ADD);
  const foam = Array.from({ length: 20 }, (_, i) => ({ img: sc.add.image(0, 0, 'pk_foam'), a: (i / 20) * Math.PI * 2 + crand() * 0.2, ph: crand() * 6, k: 0.6 + crand() * 0.5 }));
  c.under.add([sea, glow]);
  c.mid.add([lapA, lapB]);
  c.mid.add(foam.map((m) => m.img));
  let t = crand() * 10;
  let flare = 0;
  return {
    update(dt, f) {
      const calm = f.calm || f.basic;
      const s = c.s();
      t += dt;
      flare = Math.max(0, flare - dt * 1.2);
      const q = f.quiet ? 0.5 : 1;
      // the tide's beat: a lap every ~2.6 s, rushing in, easing out
      const beat = calm ? 0.5 : (Math.sin(t * 2.4) + 1) / 2;
      const beat2 = calm ? 0.5 : (Math.sin(t * 2.4 - 1.6) + 1) / 2;
      glow.setPosition(0, -4).setScale((f.prx * 2.6) / 256, (f.pry * 2.9) / 256).setAlpha(q * (0.36 + 0.08 * beat + 0.3 * flare));
      sea.setPosition(0, -2).setScale((f.prx * 2.5) / 256, (f.pry * 2.6) / 256).setAlpha(q * 0.25);
      lapA.setPosition(0, -4).setScale((f.prx * (2.05 + 0.18 * beat + 0.3 * flare)) / 256, (f.pry * (2.1 + 0.2 * beat + 0.3 * flare)) / 256).setAlpha(q * (0.22 + 0.25 * (1 - beat) + 0.3 * flare));
      lapB.setPosition(0, -4).setScale((f.prx * (2.0 + 0.16 * beat2)) / 256, (f.pry * (2.05 + 0.18 * beat2)) / 256).setAlpha(q * (0.12 + 0.2 * (1 - beat2)));
      // the foam riding the lap's edge, slowly drifting round
      for (const m of foam) {
        m.a += dt * (calm ? 0.05 : 0.12 + 1.5 * flare);
        const r = 1.0 + 0.09 * beat + 0.05 * Math.sin(t * 1.7 + m.ph);
        const x = Math.cos(m.a) * f.prx * r;
        const y = -4 + Math.sin(m.a) * f.pry * r;
        m.img.setPosition(x, y).setScale(m.k * s * (0.8 + 0.4 * (1 - beat))).setAlpha(q * (0.7 + 0.3 * (1 - beat) * (0.6 + 0.4 * Math.sin(t * 3 + m.ph))));
      }
    },
    flare(k) {
      flare = Math.max(flare, k);
    },
    setVisible(on) {
      for (const o of [glow, sea, lapA, lapB, ...foam.map((m) => m.img)]) o.setVisible(on);
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

SIGNATURES.nonnasmasterpiece = {
  stomp(c) {
    pulse(c, legendLook('nonnasmasterpiece').col, c.light ? 0.6 : 1);
    // Nonna's not having it: her rolling pin raps the table
    audio.sfx('sfx_nonna_pin', { volume: c.light ? 0.3 : 0.45, throttle: 400 });
  },
  fire(c) {
    pulse(c, 0xffe0b0, 0.8);
  },
};

SIGNATURES.silverservice = {
  stomp(c) {
    pulse(c, legendLook('silverservice').col, c.light ? 0.6 : 1);
    audio.sfx('sfx_headwaiter_trayclang', { volume: c.light ? 0.25 : 0.4, throttle: 400 });
  },
  fire(c) {
    pulse(c, 0xffffff, 0.8);
  },
};

SIGNATURES.firstbake = {
  stomp(c) {
    pulse(c, legendLook('firstbake').col, c.light ? 0.6 : 1);
    audio.sfx('sfx_legendpuff', { volume: c.light ? 0.3 : 0.45, throttle: 400 });
  },
  fire(c) {
    pulse(c, 0xfff2c0, 0.9);
  },
};

SIGNATURES.bigtoppie = {
  stomp(c) {
    pulse(c, legendLook('bigtoppie').col, c.light ? 0.6 : 1);
    // King Honk's horn, offended
    audio.sfx('sfx_smack_tail_kinghonk', { volume: c.light ? 0.25 : 0.4, throttle: 400 });
  },
  fire(c) {
    pulse(c, 0xfff2b0, 0.9);
  },
};

SIGNATURES.sandcastlecitadel = {
  stomp(c) {
    pulse(c, legendLook('sandcastlecitadel').col, c.light ? 0.6 : 1);
    audio.sfx('sfx_smack_sand_heavy', { volume: c.light ? 0.3 : 0.45, throttle: 400 });
  },
  fire(c) {
    pulse(c, 0xfff2d0, 0.8);
  },
};

SIGNATURES.tidaltiki = {
  stomp(c) {
    pulse(c, legendLook('tidaltiki').col, c.light ? 0.6 : 1);
    audio.sfx('sfx_smack_water_heavy', { volume: c.light ? 0.3 : 0.45, throttle: 400 });
  },
  fire(c) {
    pulse(c, 0xe8fffa, 0.9);
  },
};
