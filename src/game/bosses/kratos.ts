// Boss brains for Kratos's nemesis bosses (src/game/nemesis.ts): Kronos the Titan King (mini, wave 88) and Zeus
// (wave 90), met in Tartarus only with the Kratos Peel (or Kratos, Ghost of Sparta) equipped. Shared helpers are in
// ./nzkit.ts and ./kit.ts; props are drawn in src/content/props/kratos.ts and the arenas in
// src/content/art/scenes-kratos.ts. Hades's Kronos phase (act9.ts) is a smaller Titan with one move; this one is
// the Titan king himself, with his own fight.
//
// Kronos's fight is in ./titanking.ts (its brain is registered from here).
//
// Choices the spec left open (numbers are Regular; heat() scales them):
// - Zeus's phases, one Olympian each: POSEIDON'S WAVE, ARES'S WAR CRY and HERA'S CROWN (Mild has Poseidon and Hera;
//   Extra Hot and up open with KING OF THE SKY, all lightning). Throughout, storm clouds crackle over pizzas (2
//   smacks in 3.2 s scatters one, or it strikes for a slice) and he hurls a thunderbolt at your peel every 9 s
//   (smack it back for 2.5% of his health and a stun; let it land and your peel is stunned 1.2 s).
// - Poseidon: his trident plunges in at one edge of the table and a wave rears behind it. Knock the trident out (4
//   smacks in 5.5 s) and it flies back into Zeus (5% and a 1.5 s stun); leave it and the wave sweeps across, washing
//   the feet in its path back up but taking a slice from the two pizzas nearest that side.
// - Ares: his war helmet lands roaring: every foot hurries ×1.3 while it does. Smash it (5 smacks in 6.5 s) to
//   silence it and stun every foot for 1.5 s; leave it and the war cry lands (×1.5 for 6 s).
// - Hera: her crown settles on Zeus and makes him untouchable while three peacock-eye gems circle him (2 smacks
//   each). Break all three and the crown shatters: he's stunned 2.5 s and takes 4%. While crowned, his clouds come
//   twice as often. The crown comes back every 18 s.

import Phaser from 'phaser';
import { W } from '../../config';
import { HEAT_BY_ID } from '../../data/difficulty';
import { save } from '../../systems/save';
import type { Arena } from '../arena';
import type { Foot } from '../Foot';
import { type Brain, type Prop, Every, heat, hitProp, rnd, shield, throwAtPeel } from './kit';
import { brains as titankingBrains } from './titanking';
import { Bin, SAFE_TOP, cameo, enterArena, entrance, hitSoft, once, scatter, shatter, timerRing } from './nzkit';

/** A thunderbolt from the sky down to (x, y). */
function strikeAt(a: Arena, x: number, y: number): void {
  a.fx.lightning(x + (Math.random() - 0.5) * 80, -20, x, y);
  a.fx.lightning(x + (Math.random() - 0.5) * 120, -20, x, y);
  a.fx.ring(x, y, 0x9fd8ff, 1.2, 0.4);
  a.flash(90, 220, 236, 255);
  a.shake(180, 0.008);
}

// ——— ZEUS (boss, wave 90) ———

type ZMove = 'sky' | 'poseidon' | 'ares' | 'hera';

const ZINFO: Record<ZMove, [string, string]> = {
  sky: ['KING OF THE SKY', 'Storm clouds gather two at a time and his bolts come faster · Smack each crackling cloud away before it strikes'],
  poseidon: ['POSEIDON’S WAVE', 'Poseidon’s trident plunges in and a wave rears behind it · Knock the trident out before the wave sweeps the table'],
  ares: ['ARES’S WAR CRY', 'Ares’s war helmet roars and every foot hurries · Smash the helmet to silence it and stun every foot'],
  hera: ['HERA’S CROWN', 'Hera crowns him and he can’t be hurt while three peacock gems circle him · Break every gem to shatter the crown'],
};

const ZPLAN: Record<number, ZMove[]> = {
  2: ['poseidon', 'hera'],
  3: ['poseidon', 'ares', 'hera'],
  4: ['sky', 'poseidon', 'ares', 'hera'],
};
const zplan = (n: number): ZMove[] => ZPLAN[Math.max(2, Math.min(4, n))];

const zeus = (): Brain => {
  const bin = new Bin();
  const start = once();
  // the heat picked for this run (the first tick re-checks it with the arena)
  let order = zplan(HEAT_BY_ID[save.heat]?.bossPhases ?? 3);
  let ready = false;
  const cloudT = new Every(7.5, 2.5);
  const boltT = new Every(9, 6);
  const giftT = new Every(14, 4);
  let clouds = 0;
  let gift: (() => void) | null = null;
  let crowned: { gems: Prop[]; crown: Phaser.GameObjects.Image; end: (broken: boolean) => void } | null = null;
  let quipT = 10;

  const names = order.map((m) => ZINFO[m][0]);
  const info = order.map((m) => ZINFO[m][1]);
  const setPlan = (n: number) => {
    order = zplan(n);
    names.splice(0, names.length, ...order.map((m) => ZINFO[m][0]));
    info.splice(0, info.length, ...order.map((m) => ZINFO[m][1]));
  };
  const moveOf = (f: Foot): ZMove => order[Math.min(order.length, f.phase) - 1] ?? 'hera';

  // ——— storm clouds over a pizza: smack them away before they strike ———
  const cloud = (f: Foot, a: Arena) => {
    const h = heat(a);
    const ps = a.alivePizzas();
    const p = rnd(ps);
    if (!p) return;
    clouds++;
    const sec = h.windup(3.2);
    const x = p.x;
    const y = SAFE_TOP + 150;
    a.sfx('sfx_zeus_charge', { throttle: 200 });
    const col = a.sc.add.graphics();
    a.underLayer.add(col);
    col.fillStyle(0x9fd8ff, 0.12).fillRoundedRect(x - 60, y, 120, p.surfaceY - y, 30);
    col.lineStyle(4, 0x9fd8ff, 0.5).strokeRoundedRect(x - 60, y, 120, p.surfaceY - y, 30);
    a.sc.tweens.add({ targets: col, alpha: { from: 0.4, to: 1 }, duration: 220, yoyo: true, repeat: -1 });
    const forget = bin.add(() => {
      col.destroy();
      prop.destroy();
    });
    const done = () => {
      clouds--;
      col.destroy();
      forget();
    };
    const prop = hitProp(a, {
      key: 'p_nz_cloud',
      x,
      y,
      scale: 0.62,
      hits: h.hits(2),
      r: 110,
      sec,
      badgeDy: -80,
      label: 'SCATTERED!',
      hitSfx: 'sfx_zeus_scatter',
      clearSfx: 'sfx_zeus_scatter',
      onClear: done,
      onFail: () => {
        done();
        if (!a.inWave() || p.dead || !f.alive) return;
        strikeAt(a, p.x, p.surfaceY - 30);
        a.sfx('sfx_zeus_bolt');
        hitSoft(a, p, h.slices(1), 'ZAPPED!', '#9fd8ff');
      },
    });
    a.sc.tweens.add({ targets: prop.img, x: { from: x - 6, to: x + 6 }, duration: 90, yoyo: true, repeat: -1 });
  };

  // ——— a thunderbolt hurled at the peel: smack it back at him ———
  const hurl = (f: Foot, a: Arena) => {
    const h = heat(a);
    a.sfx('sfx_zeus_hurl');
    a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 190), rnd(['KNEEL!', 'FEEL MY WRATH!', 'CATCH!'])!, '#9fd8ff', 36);
    throwAtPeel(
      a,
      'p_nz_bolt',
      { x: f.x, y: Math.max(SAFE_TOP, f.cy - 120) },
      h.windup(1.4),
      () => {
        a.sfx('sfx_zeus_bolt');
        const pp = a.peelPoint();
        strikeAt(a, pp.x, pp.y);
        a.stunPeel(h.stun(1.2), 'ZAPPED!');
      },
      () => {
        a.sfx('sfx_zeus_deflect');
        if (!f.alive) return;
        a.sc.time.delayedCall(220, () => {
          if (!f.alive) return;
          strikeAt(a, f.cx, f.cy);
          a.damageFoot(f, f.maxHp * 0.025);
          f.stun(0.8);
          a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 170), 'RIGHT BACK AT YOU!', '#7dff9a', 40);
        });
      },
      8,
      { scale: 0.6 },
    );
  };

  // ——— Poseidon's trident and his wave ———
  const poseidon = (f: Foot, a: Arena) => {
    const h = heat(a);
    const side: 1 | -1 = f.x < W / 2 ? 1 : -1;
    cameo(a, 'p_nz_medal_poseidon', side, SAFE_TOP + 120, 'POSEIDON!', '#7fe0ff', 'sfx_zeus_poseidon');
    a.sc.time.delayedCall(800, () => {
      if (!f.alive || !a.inWave()) return;
      const x = side > 0 ? W - 250 : 250;
      const sec = h.windup(5.5);
      const t0 = a.now();
      const wave = a.sc.add.image(x + side * 60, 760, 'p_nz_wave').setOrigin(0.5, 1).setScale(0.3).setFlipX(side > 0).setAlpha(0.95);
      a.fxLayer.addAt(wave, 0);
      a.sc.tweens.add({ targets: wave, scale: 0.9, duration: sec * 1000, ease: 'Sine.In' });
      a.sc.tweens.add({ targets: wave, angle: { from: -2, to: 2 }, duration: 260, yoyo: true, repeat: -1 });
      let live = true;
      const end = () => {
        live = false;
        ring();
        forget();
      };
      const prop = hitProp(a, {
        key: 'p_nz_trident',
        x,
        y: 600,
        scale: 0.62,
        hits: h.hits(4),
        r: 110,
        sec,
        badgeDy: -170,
        label: 'TRIDENT DOWN!',
        hitSfx: 'sfx_zeus_trident',
        clearSfx: 'sfx_zeus_trident',
        onClear: () => {
          end();
          a.sc.tweens.add({ targets: wave, scaleY: 0, alpha: 0, duration: 500, onComplete: () => wave.destroy() });
          if (!f.alive) return;
          // the trident flies back into Zeus
          const t = a.sc.add.image(x, 600, 'p_nz_trident').setScale(0.5);
          a.fxLayer.add(t);
          a.sc.tweens.add({
            targets: t,
            x: f.cx,
            y: f.cy,
            angle: side * -540,
            duration: 380,
            ease: 'Quad.In',
            onComplete: () => {
              t.destroy();
              if (!f.alive) return;
              a.fx.explosion(f.cx, f.cy, 120);
              a.damageFoot(f, f.maxHp * 0.05);
              f.stun(h.stun(1.5));
              a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 170), 'RETURN TO SENDER!', '#7dff9a', 40);
            },
          });
        },
        onFail: () => {
          end();
          if (!a.inWave()) return void wave.destroy();
          // the wave sweeps across the table, washing feet back up
          a.sfx('sfx_zeus_wave');
          a.shake(700, 0.012);
          a.sc.tweens.killTweensOf(wave);
          const hit = new Set<Foot>();
          const st = { u: 0 };
          a.sc.tweens.add({
            targets: st,
            u: 1,
            duration: 1100,
            ease: 'Sine.InOut',
            onUpdate: () => {
              const wx = x - side * st.u * (W - 300);
              wave.setPosition(wx, 820).setScale(1.1);
              for (const o of a.allFeet()) {
                if (!o.alive || o.isBossLike || hit.has(o) || Math.abs(o.x - wx) > 160) continue;
                hit.add(o);
                o.knock(520);
              }
            },
            onComplete: () => a.sc.tweens.add({ targets: wave, alpha: 0, duration: 300, onComplete: () => wave.destroy() }),
          });
          const near = [...a.alivePizzas()].sort((p, q) => Math.abs(p.x - x) - Math.abs(q.x - x)).slice(0, 2);
          near.forEach((p, i) => a.sc.time.delayedCall(250 + i * 260, () => !p.dead && hitSoft(a, p, 1, 'SOAKED!', '#7fe0ff')));
        },
      });
      const ring = timerRing(a, () => (live ? { x, y: 600 } : null), 130, 0x7fe0ff, () => 1 - (a.now() - t0) / sec);
      const forget = bin.add(() => {
        live = false;
        ring();
        prop.destroy();
        wave.destroy();
      });
      gift = forget;
    });
  };

  // ——— Ares's war helmet ———
  const ares = (f: Foot, a: Arena) => {
    const h = heat(a);
    const side: 1 | -1 = f.x < W / 2 ? 1 : -1;
    cameo(a, 'p_nz_medal_ares', side, SAFE_TOP + 120, 'ARES!', '#ff6a4a', 'sfx_zeus_ares');
    a.sc.time.delayedCall(800, () => {
      if (!f.alive || !a.inWave()) return;
      const x = Phaser.Math.Clamp(f.x + side * 520, 260, W - 260);
      const y = SAFE_TOP + 230;
      const sec = h.windup(6.5);
      const t0 = a.now();
      a.sfx('sfx_zeus_warcry');
      a.hurry(1.3, sec);
      a.quip(W / 2, SAFE_TOP + 70, 'WAR!', '#ff6a4a', 60);
      let live = true;
      const roar = a.sc.time.addEvent({ delay: 1600, loop: true, callback: () => live && a.fx.ring(x, y, 0xff4a2a, 1.4, 0.5) });
      const end = () => {
        live = false;
        roar.remove();
        ring();
        forget();
      };
      const prop = hitProp(a, {
        key: 'p_nz_helm',
        x,
        y,
        scale: 0.6,
        hits: h.hits(5),
        r: 100,
        sec,
        badgeDy: -110,
        label: 'SILENCED!',
        hitSfx: 'sfx_zeus_silence',
        clearSfx: 'sfx_zeus_silence',
        onClear: () => {
          end();
          a.cancelHurry();
          for (const o of a.allFeet()) if (o.alive && !o.isBossLike) o.stun(1.5);
          scatter(a, x, y, 'shard', 8, { scale: 0.7, tints: [0xc9873a, 0xffd890] });
        },
        onFail: () => {
          end();
          if (!a.inWave()) return;
          a.sfx('sfx_zeus_warcry');
          a.flash(260, 255, 90, 60);
          a.hurry(1.5, h.stun(6));
          a.quip(W / 2, SAFE_TOP + 90, 'THE WAR CRY LANDS!', '#ff6a4a', 46);
        },
      });
      a.sc.tweens.add({ targets: prop.img, scale: { from: 0.6, to: 0.66 }, duration: 200, yoyo: true, repeat: -1 });
      const ring = timerRing(a, () => (live ? { x, y } : null), 120, 0xff6a4a, () => 1 - (a.now() - t0) / sec);
      const forget = bin.add(() => {
        live = false;
        roar.remove();
        ring();
        prop.destroy();
      });
      gift = forget;
    });
  };

  // ——— Hera's crown: untouchable until every peacock gem is broken ———
  const hera = (f: Foot, a: Arena) => {
    if (crowned) return;
    const h = heat(a);
    const side: 1 | -1 = f.x < W / 2 ? 1 : -1;
    cameo(a, 'p_nz_medal_hera', side, SAFE_TOP + 120, 'HERA!', '#5fd0c0', 'sfx_zeus_hera');
    a.sc.time.delayedCall(700, () => {
      if (!f.alive || !a.inWave() || crowned) return;
      shield(a, f, true);
      const top = () => ({ x: f.x, y: Math.max(SAFE_TOP + 40, f.y - f.meta.footHeight * f.type.scale * f.root.scaleY - 30) });
      const crown = a.sc.add.image(top().x, -200, 'p_nz_crown').setScale(0.5);
      a.fxLayer.add(crown);
      a.sc.tweens.add({ targets: crown, y: top().y, duration: 600, ease: 'Bounce.Out' });
      let ang = 0;
      const follow = a.sc.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => {
          ang += 0.03;
          if (crown.active && !a.sc.tweens.isTweening(crown)) crown.setPosition(top().x, top().y);
        },
      });
      const gems: Prop[] = [];
      const c = {
        gems,
        crown,
        end: (broken: boolean) => {
          if (crowned !== c) return;
          crowned = null;
          follow.remove();
          forget();
          for (const g of gems) g.destroy();
          shield(a, f, false);
          if (broken) {
            a.sfx('sfx_zeus_crown');
            scatter(a, crown.x, crown.y, 'shard', 12, { scale: 0.8, tints: [0xffd23f, 0x5fd0c0, 0x7a5aff] });
            crown.destroy();
            if (!f.alive) return;
            f.stun(h.stun(2.5));
            a.damageFoot(f, f.maxHp * 0.04);
            a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 170), 'DETHRONED!', '#7dff9a', 46);
          } else a.sc.tweens.add({ targets: crown, alpha: 0, duration: 300, onComplete: () => crown.destroy() });
        },
      };
      crowned = c;
      const forget = bin.add(() => c.end(false));
      let left = 3;
      for (let i = 0; i < 3; i++) {
        const g = hitProp(a, {
          key: 'p_nz_peacock',
          x: f.cx,
          y: f.cy,
          scale: 0.5,
          hits: h.hits(2),
          r: 70,
          badgeDy: -70,
          hitSfx: 'sfx_zeus_peacock',
          clearSfx: 'sfx_zeus_peacock',
          follow: () => {
            if (crowned !== c) return null;
            const t = ang + (i / 3) * Math.PI * 2;
            return { x: Phaser.Math.Clamp(f.x + Math.cos(t) * 260, 120, W - 120), y: Math.max(SAFE_TOP + 70, f.cy + Math.sin(t) * 110) };
          },
          onClear: () => {
            left--;
            if (left <= 0) c.end(true);
          },
        });
        gems.push(g);
      }
    });
  };

  const special = (f: Foot, a: Arena, m: ZMove) => {
    if (m === 'poseidon') poseidon(f, a);
    else if (m === 'ares') ares(f, a);
    else if (m === 'hera') hera(f, a);
  };

  return {
    names,
    info,
    upkeep(f, _dt, a) {
      start(() => {
        setPlan(a.bossPhases());
        a.bossMove(f, names[0], info[0]);
        enterArena(a, 'zeus');
        a.flash(500, 200, 220, 255);
        entrance(a, f, {
          sfx: 'sfx_zeus_enter',
          quip: 'KNEEL, SPARTAN.',
          color: '#9fd8ff',
          flash: [220, 236, 255],
          ring: 0x9fd8ff,
          delay: 500,
          onLanded: () => {
            strikeAt(a, f.x, f.y);
            a.sc.time.delayedCall(900, () => {
              ready = true;
              giftT.t = 3;
            });
          },
        });
      });
    },
    onPhase(f, _ph, a) {
      a.sfx('sfx_zeus_thunder');
      strikeAt(a, f.cx, f.cy);
      gift?.();
      gift = null;
      crowned?.end(false);
      giftT.t = 2.5;
    },
    update(f, dt, a) {
      if (!ready) return;
      const h = heat(a);
      const m = moveOf(f);
      // storm clouds all fight long; twice as many under the crown or in King of the Sky
      const fast = m === 'sky' || !!crowned;
      cloudT.every = h.cooldown(fast ? 4.2 : 7.5);
      if (clouds < (fast ? 3 : 2) && cloudT.tick(dt)) {
        cloud(f, a);
        if (m === 'sky' && h.rank >= 3) a.sc.time.delayedCall(400, () => f.alive && a.inWave() && cloud(f, a));
      }
      boltT.every = h.cooldown(m === 'sky' ? 6 : 9);
      if (boltT.tick(dt)) hurl(f, a);
      if (m !== 'sky') {
        giftT.every = h.cooldown(m === 'hera' ? 18 : m === 'ares' ? 16 : 13);
        if (giftT.tick(dt)) special(f, a, m);
      }
      quipT -= dt;
      if (quipT <= 0) {
        quipT = 12 + Math.random() * 6;
        a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 190), rnd(['I AM THE STORM.', 'YOU WERE ALWAYS MY PAWN.', 'OLYMPUS, TO ME!'])!, '#9fd8ff', 34);
      }
    },
    onDeath(f, a) {
      bin.flush();
      crowned = null;
      // the king of the gods falls: lightning flickers out of him, marble shards and gold fly
      for (let i = 0; i < 6; i++) a.sc.time.delayedCall(i * 120, () => strikeAt(a, f.cx + (Math.random() - 0.5) * 300, f.cy + (Math.random() - 0.5) * 200));
      shatter(a, f, { burst: 0x9fd8ff, tint: 0xf4f0e8, sfx: 'sfx_zeus_death', n: 12 });
      scatter(a, f.cx, f.cy, 'shard', 14, { scale: 0.8, tints: [0xffd23f, 0xf4f0e8] });
      a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 170), 'OLYMPUS… FALLS…', '#9fd8ff', 44);
    },
  };
};

export const brains: Record<string, () => Brain> = { ...titankingBrains, zeus };
