// Hero variants' moves and passives (the peels are in src/content/peels/variants.ts). A variant keeps its base
// hero's passive and fires its base move with a twist on top, so the base move stays the single source of truth.
// - Kratos, Ghost of Sparta: This Is Spartaaa, but the rage leaves a fire trail on the table that burns feet
//   (1×/s for 2 s, at most every 0.5 s a foot); three blades from the start; an ember aura all the time.
// Also adds the Kratos nemesis arenas to the night stages (Moon Knife's Moonlit, Batpeel's Signal).

import Phaser from 'phaser';
import { audio } from '../../systems/audio';
import type { ActFx } from '../contentFx';
import type { Foot } from '../Foot';
import '../godMoves';
import { MOVES, PASSIVES, registerMoves, registerPassives, type HeroKit, type MoveCtx, type Passive } from '../heroKit';
import { NIGHT } from '../heroMoves';

for (const id of ['titanking', 'zeus']) NIGHT.add(id);

/** Something that ticks for `sec` seconds then cleans up (stops with the wave). */
export function timed(k: HeroKit, sec: number, tick: (dt: number, t: number) => void, stop: () => void = () => {}): void {
  let t = 0;
  let done = false;
  k.effect({
    update: (dt) => {
      if (done) return false;
      t += dt;
      tick(dt, t);
      if (t >= sec) {
        done = true;
        stop();
        return false;
      }
      return true;
    },
    stop: () => {
      if (done) return;
      done = true;
      stop();
    },
  });
}

/** A variant fires its base move, then its own twist. */
export function withBase(base: string, twist: (k: HeroKit, ctx: MoveCtx) => void): (k: HeroKit, ctx: MoveCtx) => void {
  return (k, ctx) => {
    MOVES[base]?.(k, ctx);
    twist(k, ctx);
  };
}

/** A variant keeps its base's passive, with some hooks changed or added on top. */
export function passiveFrom(base: string, extra: Partial<Passive> = {}): Passive {
  const p = PASSIVES[base] ?? {};
  const out: Passive = { ...p, ...extra };
  // hooks both sides define run one after the other
  for (const key of ['tick', 'waveStart', 'waveClear', 'hit', 'kill'] as const) {
    const a = p[key] as ((...args: unknown[]) => void) | undefined;
    const b = extra[key] as ((...args: unknown[]) => void) | undefined;
    if (a && b) (out as Record<string, unknown>)[key] = (...args: unknown[]) => (a(...args), b(...args));
  }
  return out;
}

// ——— Kratos, Ghost of Sparta ———

interface Flame {
  x: number;
  y: number;
  t: number;
}

registerMoves({
  ghostSparta: withBase('spartaaa', (k) => {
    audio.sfx('sfx_hero_ghostsparta', { volume: 0.9 });
    const g = k.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    k.host.layers.under.add(g);
    const flames: Flame[] = [];
    const last = new WeakMap<Foot, number>();
    let lay = 0;
    let at = k.host.peelPos();
    timed(
      k,
      30,
      (dt) => {
        const raging = k.running?.label === 'ENRAGED';
        const p = k.host.peelPos();
        // the rage drops a patch of fire wherever the peel has moved
        lay -= dt;
        if (raging && lay <= 0 && Math.hypot(p.x - at.x, p.y - at.y) > 46) {
          lay = 0.05;
          at = p;
          flames.push({ x: p.x, y: p.y, t: 2.4 });
          if (Math.random() < 0.15) audio.sfx('sfx_hero_firetrail', { volume: 0.35, throttle: 220 });
        }
        g.clear();
        for (const f of flames) f.t -= dt;
        while (flames.length && flames[0].t <= 0) flames.shift();
        for (const fl of flames) {
          const a = Math.min(1, fl.t / 0.8);
          const w = 1 + Math.sin(k.host.now() * 18 + fl.x) * 0.12;
          g.fillStyle(0xd8201a, 0.32 * a).fillEllipse(fl.x, fl.y, 92 * w, 40 * w);
          g.fillStyle(0xff8a1a, 0.5 * a).fillEllipse(fl.x, fl.y - 4, 60 * w, 26 * w);
          g.fillStyle(0xfff0c0, 0.55 * a).fillEllipse(fl.x, fl.y - 6, 24, 10);
          if (Math.random() < 0.05 * a) k.host.fx.burn(fl.x + (Math.random() - 0.5) * 50, fl.y - 10);
        }
        if (!k.host.inWave()) return;
        const now = k.host.now();
        for (const f of k.host.live()) {
          if (now - (last.get(f) ?? -9) < 0.5) continue;
          if (!flames.some((fl) => Math.abs(f.cx - fl.x) < 60 && Math.abs(f.cy - fl.y) < 70)) continue;
          last.set(f, now);
          k.burn(f, 1, 2);
          k.host.hurt(f, 0.3, { quiet: true });
        }
      },
      () => g.destroy(),
    );
  }),
});

/** The ember aura: a soft fire glow round the peel and embers drifting off it, all the time. */
function emberAura(k: HeroKit): void {
  let glow = k.st.auraG as unknown as Phaser.GameObjects.Image | undefined;
  if (!glow || !glow.active) {
    glow = k.sc.add.image(0, 0, 'glow').setTint(0xff5a1a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35);
    k.host.layers.cursor.addAt(glow, 0);
    (k.st as Record<string, unknown>).auraG = glow;
  }
  const p = k.host.peelPos();
  glow.setPosition(p.x, p.y - 20).setScale(0.75 + Math.sin(k.host.now() * 5) * 0.06).setVisible(true);
  if (Math.random() < 0.35) k.host.fx.burn(p.x + (Math.random() - 0.5) * 90, p.y - 40 + (Math.random() - 0.5) * 60);
}

// (passiveFrom runs the Kratos Peel's own hooks first: the blades, one more each new act)
registerPassives({
  'hero:ghostofsparta': passiveFrom('hero:kratos', {
    // three blades from the start
    waveStart: (k) => void (k.st.blades = Math.max(3, Number(k.st.blades ?? 1))),
    tick: (k) => emberAura(k),
    waveClear: (k) => void (k.st.auraG as unknown as Phaser.GameObjects.Image | undefined)?.setVisible(false),
  }),
});

export const actFx: Record<number, ActFx> = {};
