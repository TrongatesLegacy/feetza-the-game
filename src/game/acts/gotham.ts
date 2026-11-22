// Batpeel's Gotham (a nemesis stage, src/game/nemesis.ts): the game-side extras that ride along with it.
// - Goth-Ham Rooftops and its two arenas are night stages: Batpeel's Signal shows there and Moon Knife's Moonlit
//   counts them (their NIGHT set is built from the journey's stages, so the nemesis ones are added here).
// - The Dark Kneader (src/content/peels/nemesis.ts): Batpeel's upgraded variant. Night Falls lasts 18 s (Batpeel:
//   12), the dark slows feet 35% (30%), a wing-boomerang flies every 1.6 s (2 s) and splits in two on impact, each
//   half flying at the next foot for ×1.5. Its passive is Batpeel's Utility Belt.
// The rooftop's weather and the comic print come from src/content/live/gotham.ts and the Act 7 layer.

import { W } from '../../config';
import { audio } from '../../systems/audio';
import type { ThrowFx } from '../abilities';
import type { ActFx } from '../contentFx';
import type { Foot } from '../Foot';
import { PASSIVES, registerMoves, registerPassives, type HeroKit } from '../heroKit';
import { NIGHT } from '../heroMoves';
import { NEMESES } from '../nemesis';

const GOLD = 0xffd23f;

for (const n of NEMESES) if (n.peels.includes('hero:batpeel')) for (const id of [n.location, n.mini, n.boss]) if (id) NIGHT.add(id);

/** A half of a split wing-boomerang, from where it burst to the next foot. */
function half(k: HeroKit, from: { x: number; y: number }, f: Foot, delay: number): void {
  const img = k.img('t_wingrang', from.x, from.y, 0.32).setTint(0xfff0b0);
  img.setAlpha(0);
  k.sc.time.delayedCall(delay, () => {
    if (!img.active) return;
    img.setAlpha(1);
    const st = { t: 0 };
    const x0 = from.x;
    const y0 = from.y;
    const bow = (Math.random() < 0.5 ? -1 : 1) * 120;
    k.sc.tweens.add({
      targets: st,
      t: 1,
      duration: 320,
      ease: 'Sine.In',
      onUpdate: () => {
        const tx = f.cx;
        const ty = f.cy;
        img.setPosition(x0 + (tx - x0) * st.t, y0 + (ty - y0) * st.t - Math.sin(st.t * Math.PI) * bow);
        img.rotation += 0.6;
        if (Math.random() < 0.5) k.host.fx.propTrail(img.x, img.y, GOLD, 0.3);
      },
      onComplete: () => {
        img.destroy();
        if (!f.alive || !k.host.inWave()) return;
        k.host.hurt(f, 1.5, { knock: 160 });
        k.host.fx.propBurst(f.cx, f.cy, GOLD, 0.7);
      },
    });
  });
}

registerMoves({
  darkFalls: (k) => {
    let dark: ReturnType<HeroKit['overlay']> | null = null;
    let throwT = 0;
    k.transform({
      label: 'NIGHT FALLS',
      sec: 18,
      color: GOLD,
      sfx: 'sfx_hero_darkfalls',
      start: () => {
        dark = k.overlay({ kind: 'dark', alpha: 0.88, spot: 260, color: 0x020309 }, 500);
        k.host.quip(W / 2, 300, 'THE NIGHT IS DARKEST', '#ffd23f', 60);
        k.host.shake(260, 0.006);
        if (!k.sc.cache.audio.exists('sfx_hero_darkfalls')) audio.sfx('sfx_hero_nightfalls', { rate: 0.85 });
      },
      tick: (dt) => {
        const p = k.host.peelPos();
        for (const f of k.host.live()) if (Math.hypot(f.cx - p.x, f.cy - p.y) > 260) k.slow(f, 0.35, 0.15);
        throwT += dt;
        if (throwT < 1.6) return;
        throwT = 0;
        const pick = k.random(1);
        if (!pick.length) return;
        const wing: ThrowFx = { e: 'throw', prop: 'wingrang', how: 'boomerang', x: 2.5, more: [2.5], at: { to: 'random', n: 1 } };
        let split = false;
        k.host.throwAt(wing, pick, GOLD, (f, x) => {
          k.host.hurt(f, x, { knock: 200 });
          k.host.fx.explosion(f.cx, f.cy, 140);
          audio.sfx('sfx_explosion', { volume: 0.4, throttle: 90 });
          for (const o of k.host.live()) if (o !== f && Math.hypot(o.cx - f.cx, o.cy - f.cy) < 140) k.host.hurt(o, 1, { quiet: true });
          // the first impact splits it: two halves fly on to the nearest other feet
          if (split) return;
          split = true;
          const next = k.host
            .live()
            .filter((o) => o !== f)
            .sort((a, b) => Math.hypot(a.cx - f.cx, a.cy - f.cy) - Math.hypot(b.cx - f.cx, b.cy - f.cy))
            .slice(0, 2);
          if (!next.length) return;
          audio.sfx(k.sc.cache.audio.exists('sfx_hero_split') ? 'sfx_hero_split' : 'sfx_hittink', { volume: 0.7, throttle: 80 });
          k.host.fx.glint(f.cx, f.cy, 3);
          next.forEach((o, i) => half(k, { x: f.cx, y: f.cy }, o, i * 60));
        });
      },
      end: () => dark?.end(600),
    });
  },
});

// the Dark Kneader keeps Batpeel's Utility Belt
const belt = PASSIVES['hero:batpeel'];
if (belt) registerPassives({ 'hero:darkkneader': belt });

// no act layer of its own: Gotham shares the Act 7 print (src/game/acts/act7.ts)
export const actFx: Record<number, ActFx> = {};

