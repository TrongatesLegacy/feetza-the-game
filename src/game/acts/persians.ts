// What the Persian army does (data in src/content/feet/persians.ts), through the contentFx foot hooks.
//
// - Immortal Sandals: when one falls, another steps out of black smoke to take its place, once. A burning
//   Immortal stays down. Its smoke body, and the Immortal Brute's watching eye, are live art (src/game/footLive.ts).
// - Archer Slippers: hover high and loose arrows at the peel (two a hover, one on Mild). An arrow that lands where
//   the peel is pins it (a short peel stun). Smack an arrow to bat it back: the peel fires it at the archer
//   through the projectile system (src/game/projectiles.ts).
// - Cavalry Hooves: rear, gallop sideways along the top to another pizza's lane, then charge straight down.
//   Any hit mid-gallop trips it (stunned, no charge). In a war band they ride in from the flanks.
// - Chariot Wheel: every so often it rides to one end of the table, revs, then rolls the whole row, chipping a
//   slice off each pizza it passes. The gold hub is a prop: smack it while it revs or rolls and the wheel breaks.
// - Satrap's Slipper: every other Persian foot within AURA_R of a living Satrap has +1 armour (it doesn't stack),
//   shown by a gold pip on the foot and a faint gold line back to the Satrap.
//
// War bands (planWave in src/game/Run.ts) tag their feet with brain.band: elephants and the Satrap take the
// middle lanes, cavalry the outer ones.

import Phaser from 'phaser';
import { HOVER_Y, W } from '../../config';
import type { ThrowFx } from '../abilities';
import type { Arena } from '../arena';
import { heat } from '../bosses/kit';
import type { FootFx } from '../contentFx';
import type { Foot } from '../Foot';
import type { Pizza } from '../Pizza';
import { WHEEL_AT } from '../../content/art/persianFeet';
import { CHARIOT_HUB, WHEEL_R } from '../../content/style/chariot-wheel';
import { styleFor } from '../../art/style/registry';
import { bruteLive, immortalLive } from '../footLive';

/** The scene behind the Arena: the projectiles (for batted arrows), the smack damage and the lane hooks. */
interface SceneBits {
  run: { stats: { damage: number } };
  throws: { launch(e: ThrowFx, picks: Foot[], color: number, onHit: (f: Foot, smacks: number) => void): void };
  assignLane(f: Foot, prefer?: Pizza | null): boolean;
  laneCache: { key: string };
}
const bits = (a: Arena) => a as unknown as SceneBits;
const persian = (f: Foot) => !!f.type.persian;
const footH = (f: Foot) => f.meta.footHeight * f.type.scale;
const tex = (a: Arena, key: string) => (a.sc.textures.exists(key) ? key : 'soft');
const free = (a: Arena, f: Foot) => f.alive && !f.held && !f.pinned && !a.isRetreating() && a.inWave();

/** Move a foot to a lane over pizza p (if one is free there). True if its pizza changed. */
function relaneTo(a: Arena, f: Foot, p: Pizza): boolean {
  const sc = bits(a);
  const before = f.target;
  if (!sc.assignLane || !sc.assignLane(f, p)) return false;
  f.laneKey = sc.laneCache.key;
  return f.target !== before;
}

/** Alive pizzas, left to right. */
const row = (a: Arena) => a.alivePizzas().sort((p, q) => p.x - q.x);

/** A war band's elephants and Satrap take the middle of the line: the lane of a pizza nearest the centre. */
export function takeCentre(a: Arena, f: Foot): void {
  if (!f.brain.band || f.held) return;
  const ps = a.alivePizzas().sort((p, q) => Math.abs(p.x - W / 2) - Math.abs(q.x - W / 2));
  if (ps.length >= 3) relaneTo(a, f, ps[Math.random() < 0.6 ? 0 : 1]);
}

// ——— Immortal Sandals ———

/** Seconds the replacement takes to step out of the smoke. */
const RETURN_FADE = 0.45;

const immortal: FootFx = {
  tick: (a, f, dt) => {
    immortalLive(f, dt);
    // light catches the chrome mask now and then
    if (f.state === 'hover' && Math.random() < dt * 0.8) a.fx.glint(f.cx + (Math.random() - 0.5) * 60, f.cy - footH(f) * 0.3);
    // burning: tell the player the return is off
    if (f.burnT > 0 && !f.brain.returned && !f.brain.burnTold) {
      f.brain.burnTold = 1;
      a.quip(f.x, Math.max(220, f.cy - 140), 'NO RETURN!', '#ff9a4a', 32);
    }
    if (f.burnT <= 0) f.brain.burnTold = 0;
  },
  kill: (a, f) => {
    if (f.brain.returned) return;
    if (f.burnT > 0) {
      a.quip(f.x, Math.max(240, f.cy - 150), 'THE FLAMES TAKE IT!', '#ff9a4a', 36);
      a.sfx('sfx_immortalfall', { volume: 0.8, throttle: 200 });
      a.fx.burn(f.cx, f.cy);
      return;
    }
    // another steps into its place: spawned now, so a wave can't end in the gap
    const t = f.target && !f.target.dead ? f.target : null;
    const n = a.spawn('immortal', t, f.x);
    if (!n) return;
    n.brain.returned = 1;
    n.y = Math.min(f.y, HOVER_Y) - 40;
    n.brain.smokeIn = 1;
    n.setVisualAlpha(0);
    a.sc.tweens.addCounter({ from: 0, to: 1, duration: RETURN_FADE * 1000, onUpdate: (tw) => n.alive && n.setVisualAlpha(tw.getValue() ?? 1) });
    // it steps out of a cloud of its own black smoke (footLive.ts boils it up on its first frame)
    a.fx.ring(n.x, n.cy, 0x2a2630, 1.1, 0.7);
    a.quip(n.x, Math.max(240, n.cy - 160), 'THE IMMORTALS RETURN!', '#d8dce4', 38);
    a.sfx('sfx_immortalreturn', { volume: 0.85, throttle: 200 });
  },
};

/** The Immortal Brute (its fight is in src/game/bosses/leonidas.ts): only its live eye and smoke here. */
const immortalbrute: FootFx = {
  tick: (_a, f, dt) => bruteLive(f, dt),
};

// ——— Archer Slippers ———

const archer: FootFx = {
  spawn: (_a, f) => {
    // hangs back near the top
    f.hoverY = HOVER_Y - 60;
    f.brain.shots = 0;
    f.brain.drawT = 0.8;
  },
  tick: (a, f, dt) => {
    const h = heat(a);
    let bow = bows.get(f);
    if (!bow) {
      bow = a.sc.add.image(0, 0, tex(a, 'pa_bow'));
      f.root.add(bow);
      bows.set(f, bow);
    }
    const H = footH(f);
    bow.setDisplaySize(H * 0.24, H * 0.6);
    const draw = Number(f.brain.drawK ?? 0);
    bow.setPosition(f.meta.legWidth * f.type.scale * 0.62 + draw * 10, -H * 0.4).setAngle(-12 - draw * 16);
    if (f.state === 'lift') f.brain.shots = 0;
    const per = h.rank === 0 ? 1 : 2;
    if (f.state !== 'hover' || !free(a, f) || f.stunT > 0 || f.y < 120) {
      f.brain.drawK = Math.max(0, draw - dt * 4);
      f.brain.drawing = 0;
      return;
    }
    // it stays up until it has loosed its arrows
    if (Number(f.brain.shots) < per) f.stateT = Math.min(f.stateT, f.hoverTime - 0.05);
    else return;
    const t = (f.brain.drawT = Number(f.brain.drawT ?? 0.8) - dt);
    const wind = h.windup(0.7);
    // the tell: the bow bends back and glints
    if (t < wind) {
      if (!f.brain.drawing) {
        f.brain.drawing = 1;
        a.sfx('sfx_bowdraw', { volume: 0.6, throttle: 150 });
      }
      f.brain.drawK = Math.min(1, 1 - t / wind);
      if (Math.random() < dt * 8) a.fx.glint(f.x + f.meta.legWidth * f.type.scale * 0.7, f.cy - H * 0.2);
    }
    if (t <= 0) {
      f.brain.drawing = 0;
      f.brain.drawK = 0;
      f.brain.shots = Number(f.brain.shots) + 1;
      f.brain.drawT = h.cooldown(1.4);
      loose(a, f);
    }
  },
};
const bows = new WeakMap<Foot, Phaser.GameObjects.Image>();

/** An arrow at where the peel is now. It lands after a moment: if the peel is still there, it's pinned. */
function loose(a: Arena, f: Foot): void {
  const h = heat(a);
  const from = { x: f.x + f.meta.legWidth * f.type.scale * 0.7, y: f.cy - footH(f) * 0.2 };
  const to = { ...a.peelPoint() };
  const img = a.sc.add.image(from.x, from.y, tex(a, 'pa_arrow')).setDisplaySize(120, 37);
  a.fxLayer.add(img);
  a.sfx('sfx_arrowloose', { volume: 0.7, throttle: 80 });
  const st = { k: 0, done: false };
  const arc = 70;
  const pos = (k: number) => ({ x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * arc });
  const tw = a.sc.tweens.add({
    targets: st,
    k: 1,
    duration: h.windup(0.9) * 1000,
    ease: 'Linear',
    onUpdate: () => {
      const p = pos(st.k);
      const q = pos(Math.min(1, st.k + 0.02));
      img.setPosition(p.x, p.y).setRotation(Math.atan2(q.y - p.y, q.x - p.x));
    },
    onComplete: () => {
      if (st.done) return;
      st.done = true;
      const pp = a.peelPoint();
      if (a.inWave() && Math.hypot(pp.x - to.x, pp.y - to.y) < 190) {
        a.stunPeel(h.stun(0.6), 'PINNED!');
        a.sfx('sfx_arrowthunk', { volume: 0.8, throttle: 100 });
        a.fx.impact(img.x, img.y, false);
      } else a.sfx('sfx_arrowthunk', { volume: 0.4, rate: 1.2, throttle: 100 });
      // it sticks a moment where it struck, then fades
      a.sc.tweens.add({ targets: img, alpha: 0, delay: 250, duration: 300, onComplete: () => img.destroy() });
    },
  });
  a.addClickable({
    get x() {
      return img.x;
    },
    get y() {
      return img.y;
    },
    r: 72,
    priority: 2,
    alive: () => !st.done,
    hit: () => {
      if (st.done) return;
      st.done = true;
      tw.remove();
      a.fx.impact(img.x, img.y, true);
      a.sfx('sfx_slap_2', { volume: 0.8 });
      a.quip(img.x, img.y - 60, 'BATTED BACK!', '#7dff9a', 34);
      a.sc.tweens.add({ targets: img, alpha: 0, scale: img.scale * 0.6, angle: img.angle + 180, duration: 160, onComplete: () => img.destroy() });
      // the peel sends it home: an arrow through the projectile system, at the archer if it can be hit
      const dmg = bits(a).run.stats.damage;
      bits(a).throws.launch({ e: 'throw', prop: 'arrow', how: 'straight', x: 2, at: { to: 'hit' } }, f.alive ? [f] : [], 0xe8402f, (ft, smacks) => {
        if (ft.alive) a.damageFoot(ft, smacks * dmg, ft === f ? 'RETURN TO SENDER!' : undefined);
      });
    },
  });
}

// ——— Cavalry Hooves ———

let flankSide = 1;

const cavalry: FootFx = {
  spawn: (a, f) => {
    // a war band's cavalry rides in from the flanks, to the outer pizzas
    if (!f.brain.band || f.held) return;
    const ps = row(a);
    if (!ps.length) return;
    flankSide = -flankSide;
    const p = flankSide < 0 ? ps[0] : ps[ps.length - 1];
    relaneTo(a, f, p);
    f.x = flankSide < 0 ? -90 : W + 90;
    f.y = HOVER_Y;
    f.brain.flank = 1;
  },
  tick: (a, f, dt) => {
    const h = heat(a);
    if (f.state === 'lift') f.brain.galloped = 0;
    // a charge ends at the stomp
    if (f.brain.charging && f.state !== 'descend') {
      f.brain.charging = 0;
      f.speedMul /= CHARGE;
      if (f.state === 'stomp') {
        a.shake(140, 0.005);
        a.fx.puff(f.x, f.y, 10);
      }
    }
    const g = Number(f.brain.gallop ?? 0);
    if (!g) {
      const ready = (f.state === 'hover' || (f.state === 'enter' && f.brain.flank)) && !f.brain.galloped && f.stunT <= 0 && free(a, f);
      if (!ready) return;
      f.brain.galloped = 1;
      if (!f.brain.flank) {
        // pick another pizza and gallop over to its lane
        const others = a.alivePizzas().filter((p) => p !== f.target);
        const p = others.length ? Phaser.Utils.Array.GetRandom(others) : null;
        if (p) relaneTo(a, f, p);
      }
      f.brain.flank = 0;
      const dest = f.laneX ?? f.target?.x ?? f.x;
      if (Math.abs(dest - f.x) < 140) return;
      f.brain.destX = dest;
      f.brain.gHp = f.hp;
      f.brain.gallop = 1;
      f.brain.gT = h.windup(0.45);
      f.puppet = true;
      // the tell: it rears (a crouch and spring) and whinnies
      a.sc.tweens.add({ targets: f.root, scaleY: f.root.scaleY * 0.84, duration: 150, yoyo: true, ease: 'Sine.InOut' });
      a.sfx('sfx_neigh', { volume: 0.7, throttle: 300 });
      if (Math.random() < 0.4 && f.x > 0 && f.x < W) a.quip(f.x, Math.max(200, f.cy - 140), Phaser.Utils.Array.GetRandom(f.type.quips ?? ['CHARGE!']), '#ffd23f', 32);
      return;
    }
    // a hit (or a stun) mid-gallop trips it
    if (f.hp < Number(f.brain.gHp) - 0.01 || f.stunT > 0 || !f.alive) {
      endGallop(f);
      if (!f.alive) return;
      f.setState('hover');
      f.stateT = 0;
      f.stun(h.stun(1.4));
      a.quip(f.x, Math.max(220, f.cy - 140), 'UNHORSED!', '#7dff9a', 36);
      a.sfx('sfx_neigh', { volume: 0.6, rate: 1.3, throttle: 200 });
      a.fx.puff(f.x, f.y, 12);
      return;
    }
    if (!a.inWave() || a.isRetreating() || f.pinned) {
      endGallop(f);
      return;
    }
    if (g === 1) {
      f.brain.gT = Number(f.brain.gT) - dt;
      if (Number(f.brain.gT) <= 0) {
        f.brain.gallop = 2;
        f.brain.gAge = 0;
        a.sfx('sfx_gallop', { volume: 0.75, throttle: 300 });
      }
      return;
    }
    // galloping: a steady run with a bounce in it, kicking up dust
    const dest = Number(f.brain.destX);
    const sp = (h.rank === 0 ? 600 : 760) * dt;
    const age = (f.brain.gAge = Number(f.brain.gAge) + dt);
    const dx = dest - f.x;
    f.x += Math.sign(dx) * Math.min(Math.abs(dx), sp);
    const base = f.hoverY ?? HOVER_Y;
    f.y += (base - Math.abs(Math.sin(age * 15)) * 26 - f.y) * Math.min(1, dt * 12);
    if (Math.random() < dt * 14) a.fx.puff(f.x - Math.sign(dx) * 40, f.y, 2);
    if (Math.abs(dest - f.x) < 2) {
      // the charge: straight down, no hover
      endGallop(f);
      f.setState('descend');
      f.vy = 900;
      f.brain.charging = 1;
      f.speedMul *= CHARGE;
    }
  },
};
/** Speed multiplier for the dive at the end of a gallop. */
const CHARGE = 2.2;

function endGallop(f: Foot): void {
  f.brain.gallop = 0;
  f.puppet = false;
}

// ——— Chariot Wheel ———

const wheels = new WeakMap<Foot, Phaser.GameObjects.Image>();

/** Where the wheel sits in the foot's root (its sole at y 0), its display size and its rim radius. Redrawn, the wheel
 * is the foot's own live art (CHARIOT_HUB in src/content/style/chariot-wheel.ts, spun by its live def); with the old
 * art it's the pa_wheel prop over the wheel the art paints (WHEEL_AT in src/content/art/persianFeet.ts: centre
 * (176, 190) in design space, the boot's centre x 110, its sole at y 254). */
function wheelSpot(f: Foot): { x: number; y: number; size: number; r: number } {
  const k = f.type.scale;
  if (styleFor(f.type.id)) return { x: (CHARIOT_HUB[0] - 110) * k, y: (CHARIOT_HUB[1] - 254) * k, size: WHEEL_R * 2 * k, r: WHEEL_R * k };
  return { x: (WHEEL_AT.x + 80 - 110) * k, y: (WHEEL_AT.y + 80 - 254) * k, size: 160 * k, r: 62 * k };
}

/** The hub in the world, where it's drawn now (redrawn, it rides the foot's rig: its swing and squash). */
function hubWorld(f: Foot): { x: number; y: number; r: number } {
  const w = wheelSpot(f);
  const s = f.root.scaleX || 1;
  if (styleFor(f.type.id)) {
    const [x, y] = f.styleWorld(...CHARIOT_HUB);
    return { x, y, r: w.r * s };
  }
  return { x: f.x + w.x * s, y: f.y + w.y * s, r: w.r * s };
}

const chariot: FootFx = {
  spawn: (_a, f) => {
    f.brain.rollCd = 0.6;
  },
  tick: (a, f, dt) => {
    const h = heat(a);
    const ws = wheelSpot(f);
    const s = f.root.scaleX || 1;
    // the old art's wheel is a prop spun here; the redrawn one is live art that spins itself (src/content/styleLive)
    let img = wheels.get(f);
    if (!img && !styleFor(f.type.id)) {
      img = a.sc.add.image(ws.x, ws.y, tex(a, 'pa_wheel'));
      f.root.add(img);
      wheels.set(f, img);
    }
    const lastX = Number(f.brain.lastX ?? f.x);
    f.brain.lastX = f.x;
    if (img) {
      img.setDisplaySize(ws.size, ws.size).setPosition(ws.x, ws.y);
      // the wheel turns with the ground it covers (and idles slowly in the air)
      img.rotation += (f.x - lastX) / Math.max(1, ws.r * s) + (f.brain.roll ? 0 : dt * 0.6);
    }
    const phase = Number(f.brain.roll ?? 0);
    if (!phase) {
      f.brain.rollCd = Number(f.brain.rollCd ?? 0) - dt;
      if (f.state !== 'hover' || Number(f.brain.rollCd) > 0 || f.stunT > 0 || !free(a, f) || a.alivePizzas().length < 2) return;
      startRoll(a, f);
      return;
    }
    if (!a.inWave() || a.isRetreating() || f.pinned) {
      endRoll(a, f, false);
      return;
    }
    // stunned or frozen: the wheel stops where it is
    if (f.stunT > 0) return;
    const ps = row(a);
    const y = ps.length ? ps.reduce((n, p) => n + p.surfaceY, 0) / ps.length + 12 : 760;
    const fromX = Number(f.brain.fromX);
    const toX = Number(f.brain.toX);
    if (phase === 1) {
      // ride to the end of the row, at hover height
      f.x += (fromX - f.x) * Math.min(1, dt * 5);
      f.y += ((f.hoverY ?? HOVER_Y) - f.y) * Math.min(1, dt * 5);
      if (Math.abs(fromX - f.x) < 6) {
        f.brain.roll = 2;
        f.brain.rT = h.windup(1.2);
      }
    } else if (phase === 2) {
      // drop to the table and rev: dust, a rumble and a red line along the row
      f.y += (y - f.y) * Math.min(1, dt * 8);
      if (img) img.rotation += dt * 18 * Math.sign(toX - fromX);
      if (Math.random() < dt * 16) a.fx.puff(f.x - Math.sign(toX - fromX) * 60, f.y, 2);
      f.brain.rT = Number(f.brain.rT) - dt;
      drawLine(a, f, y, Number(f.brain.rT));
      if (Number(f.brain.rT) <= 0) {
        f.brain.roll = 3;
        line.get(f)?.clear();
        a.sfx('sfx_chariotroll', { volume: 0.8, throttle: 300 });
      }
    } else {
      // roll the row, chipping each pizza once
      const sp = [300, 380, 380, 420, 460][h.rank] * dt;
      const dir = Math.sign(toX - fromX);
      f.x += dir * sp;
      f.y = y + Math.abs(Math.sin(f.x / 40)) * -4;
      if (Math.random() < dt * 20) a.fx.puff(f.x - dir * 50, f.y, 2);
      const hit = chipped.get(f) ?? new Set<Pizza>();
      chipped.set(f, hit);
      for (const p of ps) {
        if (hit.has(p) || Math.abs(p.x - hubWorld(f).x) > 24) continue;
        hit.add(p);
        a.hitPizza(p, 1, 'CHIPPED!', '#ffb070');
        a.sfx('sfx_chariotchip', { volume: 0.8, throttle: 80 });
        a.shake(90, 0.004);
      }
      if ((dir > 0 && f.x >= toX) || (dir < 0 && f.x <= toX)) endRoll(a, f, true);
    }
  },
  kill: (_a, f) => {
    line.get(f)?.clear();
    f.brain.roll = 0;
    f.puppet = false;
  },
};

/** The pizzas this roll has already chipped. */
const chipped = new WeakMap<Foot, Set<Pizza>>();
const line = new WeakMap<Foot, Phaser.GameObjects.Graphics>();
function drawLine(a: Arena, f: Foot, y: number, left: number): void {
  let g = line.get(f);
  if (!g) {
    g = a.sc.add.graphics();
    a.underLayer.add(g);
    line.set(f, g);
  }
  const x0 = Number(f.brain.fromX);
  const x1 = Number(f.brain.toX);
  g.clear();
  const pulse = 0.35 + 0.25 * Math.abs(Math.sin(left * 9));
  g.fillStyle(0xff4d3d, pulse * 0.5).fillRoundedRect(Math.min(x0, x1) - 40, y - 30, Math.abs(x1 - x0) + 80, 40, 20);
  g.lineStyle(4, 0xff4d3d, pulse + 0.2).strokeRoundedRect(Math.min(x0, x1) - 40, y - 30, Math.abs(x1 - x0) + 80, 40, 20);
}

function startRoll(a: Arena, f: Foot): void {
  // from the nearer end of the table to the far one
  const left = f.x < W / 2;
  f.brain.fromX = left ? 170 : W - 170;
  f.brain.toX = left ? W - 110 : 110;
  f.brain.roll = 1;
  chipped.delete(f);
  f.puppet = true;
  a.sfx('sfx_chariotrev', { volume: 0.8, throttle: 300 });
  a.quip(f.x, Math.max(220, f.cy - 150), Phaser.Utils.Array.GetRandom(f.type.quips ?? ['ROLL OUT!']), '#ffb070', 34);
  // the hub is the weak point: one smack breaks the wheel (a prop, so it beats a foot at the same spot)
  const ws = () => hubWorld(f);
  a.addClickable({
    get x() {
      return ws().x;
    },
    get y() {
      return ws().y;
    },
    r: 60,
    priority: 2,
    contains: (x, y) => {
      const w = ws();
      return Math.hypot(x - w.x, y - w.y) < Math.max(56, w.r * 0.6);
    },
    alive: () => f.alive && Number(f.brain.roll ?? 0) >= 1,
    hit: () => {
      if (!f.alive) return;
      const w = ws();
      a.fx.impact(w.x, w.y, true);
      a.fx.ring(w.x, w.y, 0xf0c040, 1, 0.8);
      a.shake(160, 0.006);
      a.sfx('sfx_hubbreak', { volume: 0.9, throttle: 100 });
      a.quip(w.x, Math.max(220, w.y - 140), 'WHEEL BROKEN!', '#7dff9a', 42);
      // splinters and bronze fly off the hub
      a.fx.propBurst(w.x, w.y, 0xb07a44, 1.3);
      a.fx.propBurst(w.x, w.y, 0xf0c040, 0.8);
      a.fx.puff(w.x, w.y, 10);
      endRoll(a, f, false);
      a.damageFoot(f, f.hp + f.maxHp + f.armor * 4);
    },
  });
}

function endRoll(a: Arena, f: Foot, rolled: boolean): void {
  line.get(f)?.clear();
  if (!f.brain.roll) return;
  f.brain.roll = 0;
  f.brain.rollCd = heat(a).cooldown(11);
  f.puppet = false;
  if (!f.alive) return;
  // up off the table, into the lane nearest where it stopped
  f.vy = -560;
  f.setState('lift');
  if (rolled) {
    const ps = row(a);
    if (ps.length) relaneTo(a, f, ps.reduce((b, p) => (Math.abs(p.x - f.x) < Math.abs(b.x - f.x) ? p : b)));
  }
}

// ——— Satrap's Slipper ———

/** How far a Satrap's command reaches (px). */
const AURA_R = 460;
const pips = new WeakMap<Foot, Phaser.GameObjects.Image>();
const links = new WeakMap<Foot, Phaser.GameObjects.Graphics>();

/** Give every Persian foot near a living Satrap its +1 armour, and take it back from the rest. */
function refreshAura(a: Arena, gone?: Foot): void {
  const feet = a.allFeet();
  const sats = feet.filter((s) => s !== gone && s.alive && s.type.id === 'satrap' && s.y > 0);
  for (const f of feet) {
    if (!persian(f)) continue;
    const want = f.alive && persian(f) && sats.some((s) => s !== f && Math.hypot(s.x - f.x, s.cy - f.cy) < AURA_R);
    const has = !!f.brain.satrap;
    if (want === has) continue;
    f.brain.satrap = want ? 1 : 0;
    // (never below 0: a smack that strips armour may have taken it already)
    f.armor = want ? f.armor + 1 : Math.max(0, f.armor - 1);
    let pip = pips.get(f);
    if (want) {
      if (!pip) {
        pip = a.sc.add.image(0, 0, tex(a, 'pa_crest'));
        f.root.add(pip);
        pips.set(f, pip);
      }
      const H = footH(f);
      pip.setDisplaySize(50, 57).setPosition(-f.meta.legWidth * f.type.scale * 0.62, -H * 0.3).setVisible(true).setScale(pip.scaleX * 0.2, pip.scaleY * 0.2);
      a.sc.tweens.add({ targets: pip, scaleX: pip.scaleX * 5, scaleY: pip.scaleY * 5, duration: 260, ease: 'Back.Out' });
      a.fx.glint(f.cx, f.cy - H * 0.3, 3);
      a.sfx('sfx_satrapbuff', { volume: 0.45, throttle: 400 });
    } else pip?.setVisible(false);
  }
}

const satrap: FootFx = {
  spawn: takeCentre,
  tick: (a, f) => {
    refreshAura(a);
    // faint gold lines to the feet it armours
    let g = links.get(f);
    if (!g) {
      g = a.sc.add.graphics();
      a.fxLayer.add(g);
      links.set(f, g);
    }
    g.clear();
    if (f.y < 0) return;
    const t = a.now() / 1000;
    for (const o of a.allFeet()) {
      if (o === f || !o.alive || !o.brain.satrap || Math.hypot(o.x - f.x, o.cy - f.cy) >= AURA_R) continue;
      g.lineStyle(8, 0x2a1810, 0.35).lineBetween(f.cx, f.cy, o.cx, o.cy);
      g.lineStyle(4, 0xf0c040, 0.6 + 0.25 * Math.sin(t * 6)).lineBetween(f.cx, f.cy, o.cx, o.cy);
    }
    if (Math.random() < 0.05) a.fx.glint(f.cx + (Math.random() - 0.5) * 80, f.cy + (Math.random() - 0.5) * 80);
  },
  kill: (a, f) => {
    links.get(f)?.destroy();
    links.delete(f);
    refreshAura(a, f);
    a.quip(f.x, Math.max(220, f.cy - 150), 'THE SATRAP FALLS!', '#f0c040', 38);
  },
};

export const footFx: Record<string, FootFx> = { immortal, immortalbrute, archer, cavalry, chariot, satrap };
