// What the Kratos Peel's two feet do (data in src/content/feet/gods.ts), through the contentFx foot hooks.
//
// - Persian Elephant Feet: when it stomps, its trunk swings down onto the pizza next to its own (the side it
//   leans to). After every blow of the player's own (a smack, the Peel Slam, a charged ability) it raises gold-rimmed
//   bronze lamellar plates over the foot for 0.7 s: nothing hurts it until they fold away. Toppings, burns and
//   passives don't raise them.
// - Spartan Sandals: march in pairs. A round bronze shield (the guard trait, on its own quicker rhythm: up for 1 s,
//   down for 1.2 s; FootType.guard) blocks smacks while it's up, and cracks under them; enough of them shatter it
//   until a new one comes (src/game/guardShield.ts). A hit while it's down slams it straight back up for 2 s.
//   Stunned, it drops its guard. At a quarter of its health it enrages: a red flash and a roar, 60% faster, it
//   stomps 40% sooner, and it hurls its shield at your peel (smack it away, or it stuns the peel); it's done with
//   shields after that.

import Phaser from 'phaser';
import type { Arena } from '../arena';
import type { FootFx } from '../contentFx';
import type { Foot } from '../Foot';
import { heat, throwAtPeel } from '../bosses/kit';
import { takeCentre } from './persians';

/** Seconds its armour stays up after a smack (0.7, was 1: with elephants common in Act 9 they outlasted the waves). */
const ELEPHANT_GUARD = 0.7;

const plates = new WeakMap<Foot, Phaser.GameObjects.Image>();

/** Its armour's texture: rows of overlapping bronze lamellar plates, gold-rimmed and riveted, in a rounded shield
 * shape that covers the front of the foot (drawn once, front-on, lit from the top left). */
const PLATE_KEY = 'fx_elephant_plates';
const PW = 340;
const PH = 320;
function plateTexture(a: Arena): string {
  if (a.sc.textures.exists(PLATE_KEY)) return PLATE_KEY;
  const cv = document.createElement('canvas');
  cv.width = PW;
  cv.height = PH;
  const g = cv.getContext('2d')!;
  // the outline: a broad rounded shield, flat-ish on top, full at the toes
  const outline = (c: CanvasRenderingContext2D) => {
    c.beginPath();
    c.moveTo(34, 26);
    c.quadraticCurveTo(PW / 2, 6, PW - 34, 26);
    c.bezierCurveTo(PW - 6, 120, PW - 10, 230, PW - 46, 282);
    c.quadraticCurveTo(PW / 2, 330, 46, 282);
    c.bezierCurveTo(10, 230, 6, 120, 34, 26);
    c.closePath();
  };
  g.save();
  outline(g);
  g.clip();
  // the backing: dark bronze in shade
  g.fillStyle = '#3a2410';
  g.fillRect(0, 0, PW, PH);
  // rows of plates on one shared spacing (offset every other row)
  const pw = 76;
  const ph = 104;
  // (bottom row first: each row hangs over the one below, so every scale's rounded foot shows, as on scale armour)
  for (let row = 3; row >= 0; row--) {
    const y = 10 + row * 74;
    const off = row % 2 ? pw / 2 : 0;
    for (let x = -pw + off; x < PW + pw; x += pw) {
      const plate = () => {
        g.beginPath();
        g.moveTo(x + 3, y);
        g.lineTo(x + pw - 3, y);
        g.lineTo(x + pw - 3, y + ph - pw / 2);
        g.arc(x + pw / 2, y + ph - pw / 2, pw / 2 - 3, 0, Math.PI);
        g.closePath();
      };
      // its drop shadow on the row beneath
      g.save();
      g.translate(0, 6);
      plate();
      g.fillStyle = 'rgba(20,10,0,0.45)';
      g.fill();
      g.restore();
      plate();
      const gr = g.createLinearGradient(x, y, x + pw, y + ph);
      gr.addColorStop(0, '#d6984a');
      gr.addColorStop(0.4, '#a2662a');
      gr.addColorStop(1, '#4e2c0e');
      g.fillStyle = gr;
      g.fill();
      // the gold rim and a bright edge on the lit side
      // a soft dome of light on each scale (lit from the top left), then the gold rim
      const dome = g.createRadialGradient(x + pw * 0.38, y + ph * 0.42, 2, x + pw * 0.45, y + ph * 0.5, pw * 0.62);
      dome.addColorStop(0, 'rgba(255,226,150,0.55)');
      dome.addColorStop(1, 'rgba(255,226,150,0)');
      g.fillStyle = dome;
      g.fill();
      g.lineWidth = 4;
      g.strokeStyle = '#d9a33a';
      g.stroke();
      g.lineWidth = 1.5;
      g.strokeStyle = 'rgba(58,34,8,0.8)';
      g.stroke();
      // the rivet that holds it
      g.beginPath();
      g.arc(x + pw / 2, y + 14, 5.5, 0, Math.PI * 2);
      g.fillStyle = '#f4d27a';
      g.fill();
      g.lineWidth = 1.5;
      g.strokeStyle = '#5a3a10';
      g.stroke();
    }
  }
  // the light falls from the top left: a soft sheen there, shade to the bottom right
  const sh = g.createLinearGradient(0, 0, PW, PH);
  sh.addColorStop(0, 'rgba(255,240,200,0.28)');
  sh.addColorStop(0.5, 'rgba(255,240,200,0)');
  sh.addColorStop(1, 'rgba(30,15,0,0.35)');
  g.fillStyle = sh;
  g.fillRect(0, 0, PW, PH);
  g.restore();
  // the heavy gold border and its ink line
  outline(g);
  g.lineWidth = 10;
  g.strokeStyle = '#e8b43a';
  g.stroke();
  g.lineWidth = 3;
  g.strokeStyle = '#3a2208';
  g.stroke();
  a.sc.textures.addCanvas(PLATE_KEY, cv);
  return PLATE_KEY;
}

/** The foot's own pizza's neighbour on the side its trunk swings to. */
function trunkTarget(a: Arena, f: Foot) {
  const row = a.alivePizzas().sort((p, q) => p.x - q.x);
  const i = f.target ? row.indexOf(f.target) : -1;
  if (i < 0) return null;
  const left = row[i - 1];
  const right = row[i + 1];
  if (left && right) return f.brain.trunkSide ? right : left;
  return left ?? right ?? null;
}

function elephantTick(a: Arena, f: Foot, dt: number): void {
  // the tell: the trunk curls up and it trumpets as it starts its dive
  if (f.state === 'descend' && !f.brain.trumpeted) {
    f.brain.trumpeted = 1;
    f.brain.trunkSide = Math.random() < 0.5 ? 1 : 0;
    a.sfx('sfx_trumpet', { volume: 0.55, throttle: 400 });
  }
  if (f.state === 'hover') f.brain.trumpeted = 0;
  // the trunk swings onto the pizza next door as the foot lands
  if (f.state === 'stomp' && !f.brain.trunked) {
    f.brain.trunked = 1;
    const q = trunkTarget(a, f);
    if (q && !f.stunT) {
      a.fx.puff(q.x, q.surfaceY, 10);
      a.shake(160, 0.006);
      a.hitPizza(q, 1, 'TRUNK SLAM!', '#d8d0c8');
    }
  }
  if (f.state !== 'stomp') f.brain.trunked = 0;
  // armour up after the player's own blow gets through (a smack, the Peel Slam, a charged ability: GameScene sets
  // brain.blow); toppings, burns, procs and passives chip it without raising it, so they never put it up in the way
  // of a smack
  const hp = Number(f.brain.lastHp ?? f.hp);
  const blow = f.brain.blow === 1;
  f.brain.blow = 0;
  if (Number(f.brain.guardCd ?? 0) > 0) f.brain.guardCd = Number(f.brain.guardCd) - dt;
  // (after a guard drops it stays open a moment: the gap to land the next smack in)
  if (blow && f.hp < hp - 0.01 && !f.shielded && f.alive && !(Number(f.brain.guardCd ?? 0) > 0)) {
    f.shielded = true;
    f.brain.guardT = ELEPHANT_GUARD;
    a.sfx('sfx_bronzeshield', { volume: 0.5, throttle: 200 });
  }
  f.brain.lastHp = f.hp;
  let g = plates.get(f);
  if (Number(f.brain.guardT ?? 0) > 0) {
    f.brain.guardT = Number(f.brain.guardT) - dt;
    const h = f.meta.footHeight * f.type.scale;
    if (!g) {
      g = a.sc.add.image(0, 0, plateTexture(a)).setOrigin(0.5, 0);
      f.root.add(g);
      plates.set(f, g);
    }
    const left = Number(f.brain.guardT);
    const full = { w: f.meta.legWidth * f.type.scale * 1.3, h: h * 0.86 };
    if (!g.visible || f.brain.platesUp !== 1) {
      // they snap up from the ankle over the foot, with a flash and a ring of light
      f.brain.platesUp = 1;
      a.sc.tweens.killTweensOf(g);
      g.setVisible(true).setAlpha(1).setPosition(0, -h * 0.88).setDisplaySize(full.w, full.h * 0.25);
      g.setTintFill(0xfff2c0);
      a.sc.tweens.add({ targets: g, displayHeight: full.h, duration: 130, ease: 'Back.Out' });
      a.sc.time.delayedCall(70, () => g?.active && g.clearTint());
      a.fx.ring(f.cx, f.cy, 0xe8b43a, 0.7, 0.8);
    }
    if (left <= 0) {
      f.shielded = false;
      f.brain.guardCd = 0.8;
      f.brain.platesUp = 0;
      // they fold back down to the ankle
      const img = g;
      a.sc.tweens.killTweensOf(img);
      a.sc.tweens.add({ targets: img, displayHeight: full.h * 0.15, alpha: 0, duration: 160, ease: 'Quad.In', onComplete: () => img.setVisible(false) });
    }
  }
}

function spartanSpawn(a: Arena, f: Foot): void {
  // they march in pairs: the first of a pair brings its partner
  if (f.brain.pair) return;
  f.brain.pair = 1;
  const mate = a.spawn('spartan');
  if (mate) mate.brain.pair = 2;
}

/** Seconds the raging Spartan rears back before it throws its shield. */
const THROW_WINDUP = 0.35;

/** The raging Spartan hurls its shield at the peel: smack it in flight to deflect it, or it stuns the peel. Either
 * way the shield is gone for good. Flight 1.2 s on Mild, 0.9 on Regular and Hot, 0.8 from Extra Hot; the stun 0.6,
 * 1 and 1.3 s. */
function throwShield(a: Arena, f: Foot): void {
  const from = f.guardFx?.throwOff();
  if (!from) {
    // (nothing left to throw: broken in the wind-up, or no shield piece)
    f.guardFx?.rage();
    return;
  }
  const r = heat(a).rank;
  const flight = r <= 0 ? 1.2 : r >= 3 ? 0.8 : 0.9;
  const stun = r <= 0 ? 0.6 : r >= 3 ? 1.3 : 1;
  a.sfx('sfx_whoosh', { volume: 0.9, rate: 0.75 });
  // (a throw that misses a peel that's moved lands nowhere: the badge settles on RAGE either way)
  a.sc.time.delayedCall((flight + 0.1) * 1000, () => f.guardFx?.rage());
  throwAtPeel(
    a,
    from.key,
    from,
    flight,
    () => {
      f.guardFx?.rage();
      a.sfx('sfx_shield', { volume: 1, rate: 0.7 });
      a.sfx('sfx_bronzeshield', { volume: 0.7, rate: 0.8 });
      a.shake(160, 0.006);
      a.stunPeel(stun, 'SHIELD BASH!');
    },
    () => {
      f.guardFx?.rage();
      a.sfx('sfx_bronzeshield', { volume: 0.9, rate: 1.15 });
      const p = a.peelPoint();
      a.quip(p.x, p.y - 120, 'DEFLECTED!', '#ffd23f', 40);
    },
    9,
    { scale: from.scale },
  );
}

function spartanTick(a: Arena, f: Foot, dt: number): void {
  // (its shield is the guard trait's, with its own rhythm: FootType.guard, the piece in src/game/guardShield.ts)
  // rearing back with the shield, then the throw
  if (Number(f.brain.throwT ?? 0) > 0) {
    f.brain.throwT = Number(f.brain.throwT) - dt;
    // it holds the shield up as it rears back (its beat stops)
    f.guardOpen = 0;
    f.guardT = 0;
    f.guardWarned = false;
    if (Number(f.brain.throwT) <= 0) {
      if (f.alive) throwShield(a, f);
      f.guardDone = true;
    }
  }
  // the rage at a quarter health: it roars and throws its shield aside, at your peel (done with shields for good)
  if (!f.brain.raged && f.alive && f.hp > 0 && f.hp <= f.maxHp * 0.25) {
    f.brain.raged = 1;
    if (f.guardBroken || f.guardDone || !f.guardFx) {
      // nothing to throw: no new shield either
      f.guardDone = true;
      f.guardFx?.rage();
    } else {
      f.guardFx.windup();
      f.brain.throwT = THROW_WINDUP;
    }
    f.speedMul *= 1.6;
    f.hoverMul *= 0.6;
    f.flash(0xff2a1a, 260);
    a.sc.time.delayedCall(280, () => f.alive && f.tint(0xff7a6a));
    a.quip(f.x, f.cy - 150, 'RAAAGH!', '#ff4d3d', 46);
    a.sfx('sfx_spartanroar', { volume: 0.8, throttle: 300 });
    a.fx.puff(f.cx, f.cy - 60, 8);
    a.shake(140, 0.005);
  }
  if (f.brain.raged && Math.random() < dt * 6) a.fx.burn(f.cx + (Math.random() - 0.5) * 60, f.cy - 40);
}

export const footFx: Record<string, FootFx> = {
  // (in a war band it takes the middle of the line)
  elephant: { spawn: takeCentre, tick: elephantTick },
  spartan: { spawn: spartanSpawn, tick: spartanTick },
};
