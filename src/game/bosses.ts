// Boss phases. Every main boss changes phase at 66% and 33% health (mini-bosses at 50%), with a
// banner, a camera hit and new moves. Every move has a visible tell and a skill answer.
// The fights themselves live in src/game/bosses/ (one file per three stages, plus the shared kit).

import type { Arena } from './arena';
import type { Foot } from './Foot';
import type { Pizza } from './Pizza';
import { brains as act1a } from './bosses/act1a';
import { brains as act1b } from './bosses/act1b';
import { brains as act2a } from './bosses/act2a';
import { brains as act2b } from './bosses/act2b';
// ——— Act 7 · Comics ———
import { brains as act7 } from './bosses/act7';
// ——— Act 8 · Norse ———
import { brains as act8 } from './bosses/act8';
// ——— Act 9 · Greek myths ———
import { brains as act9 } from './bosses/act9';
// ——— Act 10 · Finale ———
import { brains as act10 } from './bosses/act10';
// ——— Nemesis stages: Batpeel's Gotham (src/game/nemesis.ts) ———
import { brains as gotham } from './bosses/gotham';
// ——— Nemesis bosses: Kratos in Tartarus ———
import { brains as kratos } from './bosses/kratos';
// ——— Nemesis bosses: the comic heroes' minis ———
import { brains as comics } from './bosses/comics';
// ——— Nemesis bosses: King Leonidas at the Hot Gates ———
import { brains as leonidas } from './bosses/leonidas';
import { type Brain, auraFor, hitWindup } from './bosses/kit';

export type { Brain };

const BRAINS: Record<string, () => Brain> = { ...act1a, ...act1b, ...act2a, ...act2b };
// ——— Act 7 · Comics ———
Object.assign(BRAINS, act7);
// ——— Act 8 · Norse ———
Object.assign(BRAINS, act8);
// ——— Act 9 · Greek myths ———
Object.assign(BRAINS, act9);
// ——— Act 10 · Finale ———
Object.assign(BRAINS, act10);
// ——— Nemesis stages: Batpeel's Gotham ———
Object.assign(BRAINS, gotham);
// ——— Nemesis bosses: Kratos in Tartarus ———
Object.assign(BRAINS, kratos);
// ——— Nemesis bosses: the comic heroes' minis ———
Object.assign(BRAINS, comics);
// ——— Nemesis bosses: King Leonidas at the Hot Gates ———
Object.assign(BRAINS, leonidas);

/** Dev boss lab: a boss's phase names and move info, without spawning it. */
export function bossPhaseInfo(id: string): { names: string[]; info: string[]; fixed?: number } | null {
  const make = BRAINS[id];
  if (!make) return null;
  const b = make();
  // a fixed phase count (Act 10's Sole Proprietor) doesn't read the arena
  return { names: b.names, info: b.info, fixed: b.phases?.(null as never) };
}

/** Runs every boss and mini-boss on the field: phases, moves and smack/stomp hooks. */
const ENRAGED_INFO = 'Everything it does comes faster · finish it off';

export class BossDirector {
  private brains = new Map<Foot, Brain>();
  private phases = new Map<Foot, number>();

  constructor(private a: Arena) {}

  attach(f: Foot): void {
    const make = BRAINS[f.type.id];
    if (!make) return;
    const b = make();
    this.brains.set(f, b);
    const n = b.phases?.(this.a) ?? (f.type.mini ? Math.max(1, this.a.bossPhases() - 1) : this.a.bossPhases());
    this.phases.set(f, n);
    f.phase = 1;
    f.brain.baseSX = f.root.scaleX;
    f.brain.baseSY = f.root.scaleY;
    this.a.bossMove(f, b.names[0], b.info[0]);
  }

  /** Phase colours: amber, red, violet. Every shoe in the fight wears its phase (decoys too). */
  static auraFor(phase: number): number | null {
    return auraFor(phase);
  }

  /** The current move's name and its answer, e.g. for the boss bar. */
  moveOf(f: Foot): { name: string; info: string } | null {
    const b = this.brains.get(f);
    if (!b) return null;
    return { name: b.names[f.phase - 1] || 'ENRAGED', info: b.info[f.phase - 1] || ENRAGED_INFO };
  }

  brainOf(f: Foot): Brain | undefined {
    return this.brains.get(f);
  }

  phaseCount(f: Foot): number {
    return this.phases.get(f) ?? 1;
  }

  update(dt: number): void {
    for (const [f, b] of this.brains) {
      if (!f.alive) {
        b.onDeath?.(f, this.a);
        this.brains.delete(f);
        continue;
      }
      b.upkeep?.(f, dt, this.a);
      // phase 3 and up: embers rise off the boss
      if (f.phase >= 3 && f.root.visible && Math.random() < dt * 6) this.a.fx.burn(f.x + (Math.random() - 0.5) * 120 * f.scale, f.cy + (Math.random() - 0.5) * 80 * f.scale);
      // the transform beat: the boss holds still, then gets on with its new moves
      const tr = Number(f.brain.transformT ?? 0);
      if (tr > 0) {
        f.brain.transformT = tr - dt;
        if (tr - dt <= 0) {
          f.puppet = false;
          if (!f.brain.wasShielded) f.shielded = false;
        }
        continue;
      }
      if (f.stunT > 0 && !f.puppet) continue;
      b.update?.(f, dt, this.a);
    }
  }

  /** Check phase thresholds after damage. */
  afterDamage(f: Foot, jump = false): void {
    const b = this.brains.get(f);
    if (!b || !f.alive) return;
    const n = this.phaseCount(f);
    const frac = f.hp / f.maxHp;
    const want = Math.min(n, 1 + Math.floor((1 - frac) * n + 1e-6));
    if (f.phase >= want) return;
    // dev starts at a given health go straight to the matching phase, without clamping
    if (jump) {
      while (f.phase < want - 1) {
        f.phase++;
        b.onPhase?.(f, f.phase, this.a);
      }
      f.hp = Math.max(f.hp, 1);
    }
    // one phase at a time: a huge hit can't skip a phase (or kill the boss) before you've seen it
    f.phase++;
    if (f.phase < n) {
      const floor = (1 - f.phase / n) * f.maxHp;
      if (f.hp <= floor) f.hp = Math.floor(floor) + 1;
    } else if (f.hp <= 0) f.hp = Math.max(1, Math.round(f.maxHp * 0.05)); // the final phase still gets its moment
    const name = b.names[f.phase - 1] || 'ENRAGED';
    const info = b.info[f.phase - 1] || ENRAGED_INFO;
    this.a.banner(`PHASE ${f.phase}`, name, 'phase', info);
    this.a.bossMove(f, name, info);
    this.a.sfx('sfx_phase');
    this.a.flash(220, 255, 220, 160);
    this.a.shake(500, 0.012);
    this.a.rumble(0.8, 350);
    this.a.dramatic(0.7);
    f.setPhaseAura(BossDirector.auraFor(f.phase));
    // transform: it rears up, can't be hurt for a moment, and holds still (unless a move is moving it)
    if (!f.puppet) {
      f.brain.wasShielded = f.shielded;
      f.brain.transformT = 1.1;
      f.puppet = true;
      f.shielded = true;
      // restore to the boss's real size, never a mid-wind-up squash
      const sx = Number(f.brain.baseSX ?? f.root.scaleX);
      const sy = Number(f.brain.baseSY ?? f.root.scaleY);
      this.a.sc.tweens.killTweensOf(f.root);
      f.root.setScale(sx, sy);
      this.a.sc.tweens.add({ targets: f.root, scaleX: sx * 1.14, scaleY: sy * 1.14, duration: 260, yoyo: true, repeat: 1, ease: 'Sine.InOut', onComplete: () => f.root.setScale(sx, sy) });
    }
    this.a.fx.ring(f.cx, f.cy, BossDirector.auraFor(f.phase) ?? 0xffffff, 2, 0.6);
    // the 4th phase (Extra Hot, or the second time through) makes everything faster
    if (f.phase >= 4) f.hurry = 1.25;
    b.onPhase?.(f, f.phase, this.a);
  }

  onSmacked(f: Foot, x: number, y: number, dmg: number): boolean {
    if (f.brain.decoy) return false;
    // during the transform beat the boss is simply untouchable: no stone cracks, wall hits or parries count
    if (Number(f.brain.transformT ?? 0) > 0) {
      hitWindup(f, this.a);
      return true;
    }
    return this.brains.get(f)?.onSmacked?.(f, this.a, x, y, dmg) ?? false;
  }

  onStomp(f: Foot, p: Pizza): void {
    this.brains.get(f)?.onStomp?.(f, p, this.a);
  }

  pierces(f: Foot): boolean {
    return this.brains.get(f)?.pierce?.(f) ?? false;
  }

  /** Drop every brain. `tidy` runs their cleanup (pistons, possession); skip it when the scene is shutting down. */
  clear(tidy = true): void {
    if (tidy) for (const [f, b] of this.brains) b.onDeath?.(f, this.a);
    this.brains.clear();
  }
}
