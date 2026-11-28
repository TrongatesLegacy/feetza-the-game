// Act 4's Legendaries' auras and signatures on the table (docs/pizza-plan.md, section 15), plugged into the living
// pizzas' hooks (AURAS and SIGNATURES in src/game/pizzaAlive.ts) like the earlier acts' (src/game/legendAuras*.ts).
// Each stays round and under the pie: glows under the plate, what circles or rises round it between the plate and
// the pie (passing behind it), so the face, slices, labels, freshness bar and shield always draw over it. Calm
// (reduced motion) and basic (low graphics) still show it, quieter; a stale or perk-frozen pie's aura dims.
// Cosmetic: crand().
//
// - Pigeon King's Catch: Old Town's gas-lamp light pooled under it on the night-blue cobbles, the King's pigeon
//   strutting round its plate (head bobbing, stopping to peck now and then), a feather drifting down.
// - Second Rise: a warm proving glow breathing under it, bubbles swelling in the dough round its plate and popping in a
//   puff of flour, flour hanging in the air.
// - Cathedral Crust: the rose window's coloured light cast on the table under it, turning slowly, shafts of it slanting
//   down behind the pie, stone dust drifting down through them.

import Phaser from 'phaser';
import { drawFlour } from '../art/perkPropsLegend';
import { drawDoughBubble, drawPigeonWalk } from '../art/perkPropsLegend4';
import { audio } from '../systems/audio';
import { crand } from '../systems/cosmeticRandom';
import { legendLook } from './legendary';
import { ensure4 } from './legendView4';
import { AURAS, SIGNATURES, type Aura, type AuraCtx, type AuraFrame, type SigCtx } from './pizzaAlive';

const ADD = Phaser.BlendModes.ADD;

function ensureAura4(sc: Phaser.Scene): void {
  ensure4(sc);
  const tex: [string, () => HTMLCanvasElement][] = [
    ['pk_pigeonwalk0', () => drawPigeonWalk(0)],
    ['pk_pigeonwalk1', () => drawPigeonWalk(1)],
    ['pk_doughbubble', drawDoughBubble],
    ['pk_flour', drawFlour],
  ];
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
  spin: number;
}

const mote = (img: Phaser.GameObjects.Image): Mote => ({ img: img.setVisible(false), t: 1, life: 0, x: 0, y: 0, vx: 0, vy: 0, s0: 0, s1: 0, a: 0, ph: 0, spin: 0 });
const free = (ms: Mote[]) => ms.find((m) => m.t >= m.life);

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
      .setRotation(m.img.rotation + m.spin * dt)
      .setAlpha(q * m.a * Math.sin(Math.PI * Math.min(1, u * 1.1)));
  }
}

// ════════════════════════════ Pigeon King's Catch ════════════════════════════

AURAS.pigeoncatch = (c: AuraCtx): Aura => {
  const sc = c.scene;
  ensureAura4(sc);
  const look = legendLook('pigeoncatch');
  // the gas lamp's warm pool on the night's blue
  const night = sc.add.image(0, 0, 'glow').setTint(0x3a4a8a).setBlendMode(ADD).setAlpha(0.22);
  const lamp = sc.add.image(0, 0, c.square ? 'pza_glowSq' : 'glow').setTint(look.col).setBlendMode(ADD).setAlpha(0.35);
  const rim = sc.add.image(0, 0, c.square ? 'pza_rimSq' : 'pza_auraRing').setTint(0xffd08a).setBlendMode(ADD).setAlpha(0.18);
  const shadow = sc.add.image(0, 0, 'glow').setTint(0x000000).setAlpha(0.25);
  const bird = sc.add.image(0, 0, 'pk_pigeonwalk0').setOrigin(0.5, 0.94);
  const feathers: Mote[] = Array.from({ length: 4 }, () => mote(sc.add.image(0, 0, 'pk_feather')));
  c.under.add([night, lamp, rim]);
  c.mid.add([shadow, bird, ...feathers.map((m) => m.img)]);
  let t = crand() * 10;
  let ang = crand() * Math.PI * 2;
  let flare = 0;
  let peck = 0;
  let nextPeck = 2 + crand() * 3;
  let step = 0;
  let accF = crand() * 0.5;
  let hop = 0;
  let lastF: AuraFrame | null = null;
  const drop = (f: AuraFrame, burst: boolean) => {
    const m = free(feathers);
    if (!m) return;
    const s = c.s();
    const a = burst ? ang : crand() * Math.PI * 2;
    m.x = Math.cos(a) * f.prx * (1 + crand() * 0.2);
    m.y = f.cy - f.ry * (0.6 + crand() * 0.8);
    m.vx = (crand() - 0.5) * 20 * s;
    m.vy = (burst ? 50 : 24) * s;
    m.t = 0;
    m.life = burst ? 1.2 : 2.6 + crand();
    m.s0 = (0.45 + crand() * 0.2) * s;
    m.s1 = m.s0;
    m.a = 0.85;
    m.ph = crand() * 6;
    m.spin = (crand() - 0.5) * 2;
    m.img.setRotation(crand() * 6);
  };
  return {
    update(dt, f) {
      lastF = f;
      const calm = f.calm || f.basic;
      const s = c.s();
      t += dt;
      flare = Math.max(0, flare - dt * 1.4);
      hop = Math.max(0, hop - dt * 2.2);
      const q = f.quiet ? 0.5 : 1;
      // (a gas lamp's slow, soft flicker)
      const fl = calm ? 0 : 0.6 * Math.sin(t * 1.3) + 0.4 * Math.sin(t * 3.7 + 1);
      night.setPosition(0, -2).setScale((f.prx * 3.1) / 256, (f.pry * 3.2) / 256).setAlpha(q * 0.22);
      lamp.setPosition(0, -4).setScale((f.prx * 2.6) / 256, (f.pry * 2.9) / 256).setAlpha(q * (0.42 + 0.05 * fl + 0.3 * flare));
      rim.setPosition(0, -4).setScale((f.prx * 2.2) / 256, (f.pry * 2.25) / 256).setAlpha(q * (0.18 + 0.2 * flare));
      // the pigeon struts round the plate (flatter at the front, clear of the labels), stopping now and then to peck
      nextPeck -= dt;
      if (nextPeck <= 0 && peck <= 0) {
        peck = 1.1;
        nextPeck = 3 + crand() * 4;
      }
      const walking = peck <= 0;
      peck = Math.max(0, peck - dt);
      if (walking) ang += dt * (calm ? 0.12 : 0.32 + 2.5 * flare);
      step += dt * (walking ? (calm ? 3 : 6) : 12);
      const r = 1.22;
      const sn = Math.sin(ang);
      const x = Math.cos(ang) * f.rx * r;
      const y = f.cy + 6 * s + sn * f.ry * (sn > 0 ? 1.04 : r);
      const fr = calm ? 0 : Math.floor(step) % 2;
      // (it faces the way it walks: anticlockwise on screen)
      const faceRight = -Math.sin(ang) > 0;
      const k = (0.58 + 0.06 * sn) * s;
      bird.setTexture(`pk_pigeonwalk${fr}`).setPosition(x, y - hop * 26 * s).setScale(k).setFlipX(!faceRight).setAlpha(q).setRotation(walking ? 0 : (faceRight ? 0.15 : -0.15) * (fr ? 1 : 0.3));
      shadow.setPosition(x, y + 2 * s).setScale((56 * s) / 256, (16 * s) / 256).setAlpha(0.25 * q * (1 - hop * 0.5));
      accF += dt * (calm ? 0.08 : 0.22) * q;
      while (accF >= 1) {
        accF -= 1;
        drop(f, false);
      }
      stepMotes(feathers, dt, calm ? 4 : 14, q);
    },
    flare(k) {
      flare = Math.max(flare, k);
      hop = Math.max(hop, k);
      if (lastF && !lastF.calm) for (let i = 0; i < Math.round(3 * k); i++) drop(lastF, true);
    },
    setVisible(on) {
      for (const o of [night, lamp, rim, shadow, bird]) o.setVisible(on);
      if (!on) for (const m of feathers) m.img.setVisible(false);
    },
    destroy() {},
  };
};

// ════════════════════════════ Second Rise ════════════════════════════

AURAS.secondrise = (c: AuraCtx): Aura => {
  const sc = c.scene;
  ensureAura4(sc);
  const look = legendLook('secondrise');
  // the proving glow, and the dough's ring breathing round the plate
  const glow = sc.add.image(0, 0, c.square ? 'pza_glowSq' : 'glow').setTint(look.col).setBlendMode(ADD).setAlpha(0.3);
  const warm = sc.add.image(0, 0, 'glow').setTint(0xff9a3a).setBlendMode(ADD).setAlpha(0.12);
  const ring = sc.add.image(0, 0, c.square ? 'pza_rimSq' : 'pza_auraRing').setTint(0xfff0d0).setBlendMode(ADD).setAlpha(0.2);
  // bubbles round the rim: each swells, then pops in a puff of flour
  const bubbles = Array.from({ length: 10 }, (_, i) => ({ img: sc.add.image(0, 0, 'pk_doughbubble'), a: (i / 10) * Math.PI * 2 + crand() * 0.3, t: crand() * 3, life: 2 + crand() * 1.6, k: 0.5 + crand() * 0.5 }));
  const flour: Mote[] = Array.from({ length: 12 }, () => mote(sc.add.image(0, 0, 'pk_flour').setBlendMode(ADD)));
  c.under.add([warm, glow, ring]);
  c.mid.add([...bubbles.map((b) => b.img), ...flour.map((m) => m.img)]);
  let t = crand() * 10;
  let flare = 0;
  let acc = 0;
  let lastF: AuraFrame | null = null;
  const puff = (f: AuraFrame, x: number, y: number, n: number) => {
    const s = c.s();
    for (let i = 0; i < n; i++) {
      const m = free(flour);
      if (!m) return;
      m.x = x + (crand() - 0.5) * 10 * s;
      m.y = y;
      m.vx = (crand() - 0.5) * 30 * s;
      m.vy = (-20 - crand() * 30) * s;
      m.t = 0;
      m.life = 0.8 + crand() * 0.6;
      m.s0 = 0.8 * s;
      m.s1 = 2.2 * s;
      m.a = 0.55;
      m.ph = crand() * 6;
      m.spin = 0;
    }
    void f;
  };
  const drift = (f: AuraFrame) => {
    const m = free(flour);
    if (!m) return;
    const s = c.s();
    const a = crand() * Math.PI * 2;
    m.x = Math.cos(a) * f.prx * (0.9 + crand() * 0.4);
    m.y = -4 + Math.sin(a) * f.pry * (0.9 + crand() * 0.4) - 20 * s;
    m.vx = (crand() - 0.5) * 8 * s;
    m.vy = -6 * s;
    m.t = 0;
    m.life = 2.2 + crand();
    m.s0 = 0.6 * s;
    m.s1 = 1.2 * s;
    m.a = 0.35;
    m.ph = crand() * 6;
    m.spin = 0;
  };
  return {
    update(dt, f) {
      lastF = f;
      const calm = f.calm || f.basic;
      const s = c.s();
      t += dt;
      flare = Math.max(0, flare - dt * 1.3);
      const q = f.quiet ? 0.45 : 1;
      // (dough proving: a slow breath)
      const br = calm ? 0 : Math.sin(t * 0.9);
      glow.setPosition(0, -4).setScale((f.prx * 2.6 * (1 + 0.03 * br)) / 256, (f.pry * 2.9 * (1 + 0.03 * br)) / 256).setAlpha(q * (0.4 + 0.06 * br + 0.3 * flare));
      warm.setPosition(0, -2).setScale((f.prx * 2.1) / 256, (f.pry * 2.1) / 256).setAlpha(q * (0.14 + 0.04 * br + 0.2 * flare));
      ring.setPosition(0, -4).setScale((f.prx * 2.2 * (1 + 0.025 * br)) / 256, (f.pry * 2.25 * (1 + 0.025 * br)) / 256).setAlpha(q * (0.22 + 0.25 * flare));
      for (const b of bubbles) {
        b.t += dt * (calm ? 0.35 : 1) * (1 + 2.5 * flare);
        const x = Math.cos(b.a) * f.prx * 1.04;
        const y = -4 + Math.sin(b.a) * f.pry * 1.04;
        if (b.t >= b.life) {
          b.t = 0;
          b.life = 2 + crand() * 1.6;
          b.a += (crand() - 0.5) * 0.4;
          if (!calm) puff(f, x, y - 6 * s, 2);
        }
        const u = b.t / b.life;
        // (it swells slowly, quickest at the end, and pops)
        const sw = Math.pow(u, 1.6);
        b.img.setPosition(x, y - 6 * s * sw).setScale(b.k * s * (0.15 + 0.55 * sw)).setAlpha(q * Math.min(1, u * 6));
      }
      acc += dt * (calm ? 0.6 : 1.8) * q;
      while (acc >= 1) {
        acc -= 1;
        drift(f);
      }
      stepMotes(flour, dt, calm ? 2 : 6, q);
    },
    flare(k) {
      flare = Math.max(flare, k);
      // every bubble swells and pops at once
      if (lastF && !lastF.calm) for (const b of bubbles) b.t = Math.max(b.t, b.life * (0.75 + 0.2 * k));
    },
    setVisible(on) {
      for (const o of [glow, warm, ring, ...bubbles.map((b) => b.img)]) o.setVisible(on);
      if (!on) for (const m of flour) m.img.setVisible(false);
    },
    destroy() {},
  };
};

// ════════════════════════════ Cathedral Crust ════════════════════════════

AURAS.cathedralcrust = (c: AuraCtx): Aura => {
  const sc = c.scene;
  ensureAura4(sc);
  const look = legendLook('cathedralcrust');
  // the rose window's light on the table, turning slowly; a violet and gold glow; shafts of it behind the pie
  const glow = sc.add.image(0, 0, c.square ? 'pza_glowSq' : 'glow').setTint(look.col).setBlendMode(ADD).setAlpha(0.25);
  const gold = sc.add.image(0, 0, 'glow').setTint(0xffd27a).setBlendMode(ADD).setAlpha(0.12);
  const rose = sc.add.image(0, 0, 'pk_rosewindow').setBlendMode(ADD).setAlpha(0.3);
  const roseBox = sc.add.container(0, 0, [rose]);
  const shafts = Array.from({ length: 3 }, (_, i) => ({ img: sc.add.image(0, 0, 'pk_lightshaft').setOrigin(0.5, 1).setBlendMode(ADD), ph: i * 2.1 + crand(), dx: (i - 1) * 0.55 }));
  const dust: Mote[] = Array.from({ length: 14 }, () => mote(sc.add.image(0, 0, 'pza_mote').setTint(0xf2ead8)));
  c.under.add([gold, glow, roseBox]);
  c.mid.add([...shafts.map((o) => o.img), ...dust.map((m) => m.img)]);
  let t = crand() * 10;
  let flare = 0;
  let acc = 0;
  let lastF: AuraFrame | null = null;
  const fall = (f: AuraFrame, burst: boolean) => {
    const m = free(dust);
    if (!m) return;
    const s = c.s();
    // through the shafts, behind the pie, drifting down
    const sh = shafts[Math.floor(crand() * shafts.length)];
    m.x = sh.dx * f.prx + (crand() - 0.5) * 30 * s - 40 * s;
    m.y = f.cy - f.ry * 0.4 - (60 + crand() * 160) * s;
    m.vx = (burst ? (crand() - 0.5) * 80 : 6 + crand() * 6) * s;
    m.vy = (burst ? -40 + crand() * 60 : 14 + crand() * 10) * s;
    m.t = 0;
    m.life = burst ? 1 : 2.6 + crand() * 1.4;
    m.s0 = (0.3 + crand() * 0.3) * s;
    m.s1 = m.s0 * 0.7;
    m.a = 0.7;
    m.ph = crand() * 6;
    m.spin = 0;
  };
  return {
    update(dt, f) {
      lastF = f;
      const calm = f.calm || f.basic;
      const s = c.s();
      t += dt;
      flare = Math.max(0, flare - dt * 1.2);
      const q = f.quiet ? 0.45 : 1;
      const br = calm ? 0 : Math.sin(t * 0.7);
      glow.setPosition(0, -4).setScale((f.prx * 2.6) / 256, (f.pry * 2.9) / 256).setAlpha(q * (0.32 + 0.05 * br + 0.3 * flare));
      gold.setPosition(-f.prx * 0.2, -6).setScale((f.prx * 2) / 256, (f.pry * 2) / 256).setAlpha(q * (0.14 + 0.05 * br + 0.2 * flare));
      // (the window cast flat on the table: a box tilts it, the window turns inside it)
      roseBox.setPosition(0, -2).setScale((f.prx * 2.5) / 220, (f.pry * 2.6) / 220);
      rose.setRotation(t * (calm ? 0.02 : 0.06)).setAlpha(q * (0.3 + 0.06 * br + 0.35 * flare));
      for (const o of shafts) {
        const sway = calm ? 0 : Math.sin(t * 0.5 + o.ph);
        o.img.setPosition(o.dx * f.prx - 30 * s, f.cy - f.ry * 0.2).setRotation(0.32 + 0.02 * sway).setScale(0.9 * s, (0.9 + 0.1 * sway) * s).setAlpha(q * (0.32 + 0.12 * Math.max(0, Math.sin(t * 0.8 + o.ph)) + 0.4 * flare));
      }
      acc += dt * (calm ? 0.8 : 2.4 + 6 * flare) * q;
      while (acc >= 1) {
        acc -= 1;
        fall(f, false);
      }
      stepMotes(dust, dt, calm ? 2 : 5, q);
    },
    flare(k) {
      flare = Math.max(flare, k);
      if (lastF && !lastF.calm) for (let i = 0; i < Math.round(6 * k); i++) fall(lastF, true);
    },
    setVisible(on) {
      for (const o of [glow, gold, roseBox, ...shafts.map((x) => x.img)]) o.setVisible(on);
      if (!on) for (const m of dust) m.img.setVisible(false);
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

/** Cathedral Crust's stomp: the rose window flashes up on the table and fades. */
function roseFlash(c: SigCtx, k = 1): void {
  const u = c.under;
  if (!u || !u.active) return;
  const sc = c.scene;
  const r = sc.add.image(0, 0, 'pk_rosewindow').setBlendMode(ADD).setAlpha(0.6 * k).setScale((200 * c.s) / 220, (90 * c.s) / 220);
  u.add(r);
  sc.tweens.add({ targets: r, scaleX: (620 * c.s) / 220, scaleY: (280 * c.s) / 220, alpha: 0, duration: 560, ease: 'Quad.Out', onComplete: () => r.destroy() });
}

SIGNATURES.pigeoncatch = {
  stomp(c) {
    pulse(c, legendLook('pigeoncatch').col, c.light ? 0.6 : 1);
    // the King's pigeon takes offence
    audio.sfx('sfx_pigeonking_coo', { volume: c.light ? 0.3 : 0.45, throttle: 400 });
  },
  fire(c) {
    pulse(c, 0xdfe2ff, 0.8);
  },
};

SIGNATURES.secondrise = {
  stomp(c) {
    pulse(c, legendLook('secondrise').col, c.light ? 0.6 : 1);
    // a soft thump of dough
    audio.sfx('sfx_smack_dough_heavy', { volume: c.light ? 0.3 : 0.45, throttle: 400 });
  },
  fire(c) {
    pulse(c, 0xfff6e0, 0.8);
  },
};

SIGNATURES.cathedralcrust = {
  stomp(c) {
    roseFlash(c, c.light ? 0.6 : 1);
    // a bell, far off
    audio.sfx('sfx_smack_tail_bell', { volume: c.light ? 0.3 : 0.45, throttle: 400 });
  },
  fire(c) {
    roseFlash(c, 0.9);
  },
};
