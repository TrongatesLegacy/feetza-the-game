// Bat Feet and Spider Socks (src/content/feet/heroes.ts): what they do, beyond their traits.
//
// - Bat Feet hang high with their wings folded, then swoop in bursts (the 'burst' and 'zigzag' traits). A smack
//   at the bottom of a swoop (when it hangs for a moment) does double damage; mid-swoop it does half.
// - Spider Socks drop in on a silk thread that runs up to the top of the screen. Smacking the thread cuts it:
//   the sock tumbles, stunned and hurt. When one lands, it webs the pizza: its perk stops for a few seconds.

import Phaser from 'phaser';
import type { Arena } from './arena';
import type { Foot } from './Foot';
import type { Pizza } from './Pizza';

/** How long a Spider Sock's web stops a pizza's perk (the spec's "−50% for 5 s", as half the time fully off). */
const WEB_SEC = 2.5;

const threads = new WeakMap<Foot, Phaser.GameObjects.Graphics>();

export function heroFootTick(a: Arena, f: Foot, _dt: number): void {
  if (f.type.id === 'batfeet') batTick(f);
  else if (f.type.id === 'spidersocks') spiderTick(a, f);
}

/** Damage multiplier for a hero foot (1 for everything else). */
export function heroFootDmg(f: Foot, smack: boolean): number {
  if (f.type.id !== 'batfeet' || !smack || f.state !== 'descend') return 1;
  return f.brain.batLow ? 2 : 0.5;
}

/** A hero foot's stomp landed. */
export function heroFootStomp(a: Arena, f: Foot, p: Pizza): void {
  if (f.type.id !== 'spidersocks' || p.dead) return;
  a.freezePerk(p, WEB_SEC);
  a.quip(p.x, p.surfaceY - 190, 'WEBBED!', '#f4f8ff', 40);
  a.sfx('sfx_hero_web', { volume: 0.7 });
  // a web over the pizza while its perk is stopped
  const g = a.sc.add.graphics();
  a.fxLayer.add(g);
  const r = p.radius * 0.9;
  g.lineStyle(3, 0xf4f8ff, 0.8);
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    g.lineBetween(p.x, p.surfaceY - 20, p.x + Math.cos(ang) * r, p.surfaceY - 20 + Math.sin(ang) * r * 0.45);
  }
  for (let k = 1; k <= 3; k++) g.strokeEllipse(p.x, p.surfaceY - 20, (r * 2 * k) / 3, (r * 0.9 * k) / 3);
  a.sc.tweens.add({ targets: g, alpha: 0, delay: WEB_SEC * 1000 - 400, duration: 400, onComplete: () => g.destroy() });
}

function batTick(f: Foot): void {
  // it hangs higher than other feet before it swoops
  if (f.hoverY === null && !f.isBossLike) f.hoverY = 210;
  // the bottom of a swoop: the burst has spent itself and it hangs for a beat
  f.brain.batLow = f.state === 'descend' && f.vy < 140 ? 1 : 0;
  // the tell: its wings snap open (a flash) just before each swoop
  if (f.state === 'hover' && f.stateT > f.hoverTime - 0.35 && !f.brain.batTold) {
    f.brain.batTold = 1;
    f.flash(0xc84a6a, 140);
  }
  if (f.state !== 'hover') f.brain.batTold = 0;
}

function spiderTick(a: Arena, f: Foot): void {
  if (f.brain.cut) return;
  const s = f.root.scaleX || 1;
  const off = f.meta.legWidth * f.scale * 0.45 + 26;
  let g = threads.get(f);
  if (!g) {
    g = a.sc.add.graphics();
    f.root.add(g);
    threads.set(f, g);
    a.addClickable({
      get x() {
        return f.x + off;
      },
      get y() {
        return Math.max(40, f.y - f.meta.footHeight * f.scale - 200);
      },
      r: 40,
      contains: (x, y) => !f.brain.cut && f.alive && Math.abs(x - (f.x + off)) < 34 && y > 0 && y < f.y - f.meta.footHeight * f.scale * 0.6,
      alive: () => f.alive && !f.brain.cut && f.y > 40,
      hit: () => cut(a, f),
    });
  }
  // the silk thread, from beside the ankle up past the top of the screen (local to the foot, which is scaled)
  g.clear();
  const top = -f.meta.footHeight * f.type.scale * 0.6;
  g.lineStyle(5 / s, 0x2a1810, 0.55);
  g.lineBetween(off / s, top, off / s, -(f.y + 40) / s);
  g.lineStyle(2.5 / s, 0xf4f8ff, 0.95);
  g.lineBetween(off / s, top, off / s, -(f.y + 40) / s);
  // where it's tied on
  g.fillStyle(0xf4f8ff, 1);
  g.fillCircle(off / s, top, 5 / s);
}

function cut(a: Arena, f: Foot): void {
  if (f.brain.cut || !f.alive) return;
  f.brain.cut = 1;
  threads.get(f)?.clear();
  a.sfx('sfx_hero_snip', { volume: 0.8 });
  a.fx.puff(f.x, f.cy - 80, 6);
  a.damageFoot(f, f.maxHp * 0.4, 'SNIP!');
  if (f.alive) {
    f.stun(1.2);
    f.knock(300);
  }
}
