// Boss brains for King Leonidas's nemesis at the Hot Gates (src/game/nemesis.ts): the Immortal Brute (mini, wave 83)
// and Xerxes (wave 85), met only with King Leonidas (or Leonidas, Hot Gates) equipped. Shared helpers are in ./nzkit.ts
// and ./kit.ts; props are in src/content/props/leonidas.ts and the arenas in src/content/art/scenes-leonidas.ts. The
// horde's adds are the Persian army's own Immortal Sandals and the war elephants are Persian Elephant Feet.
//
// Choices the spec left open (numbers are Regular; heat() scales them):
// - The Immortal Brute: THE IMMORTAL HORDE (every 11 s a war horn and 4 Immortal Sandals march in; while two or more
//   stand he can't be hurt, for 12 s at most), BLADE ON A CHAIN (from phase 2, every 9 s he whirls his blade over a
//   pair of neighbouring pizzas for 2.6 s; 3 smacks snag the chain, stunning him 2 s for 5% of his health, or it slams
//   a slice off both) and NO RETREAT (phase 3: both, a quarter faster). 1 phase on Mild, 2 on Regular and Hot, 3 above.
// - Xerxes: ARROW STORM (the sky goes dark and volleys fall on 3 pizzas in turn; bat each away or it takes a slice),
//   WAR RHINO (every 11 s a rhino paws the ground at the top of a lane for 2.8 s; 3 smacks turn it, or it charges
//   down the lane for 2 slices and scatters the feet in its way) and WAR ELEPHANTS (every 18 s two Persian Elephant
//   Feet stomp in and a golden ward makes him untouchable while they stand, 14 s at most). Mild: arrows, elephants;
//   Regular and Hot: arrows, rhino, elephants; Extra Hot and up add THE GOD-KING (all three in turn, faster).

import Phaser from 'phaser';
import { HEAT_BY_ID } from '../../data/difficulty';
import { save } from '../../systems/save';
import type { Arena } from '../arena';
import type { Foot } from '../Foot';
import type { Pizza } from '../Pizza';
import { type Brain, Every, dropOn, heat, hitProp, rnd, shield } from './kit';
import { Bin, SAFE_TOP, enterArena, entrance, hitSoft, lanePizzas, leaveArena, once, scatter, shatter, timerRing } from './nzkit';

/** A glowing column down a pizza's lane (a charge's tell). Returns its remover. */
function laneColumn(a: Arena, p: Pizza, y0: number, color: number): () => void {
  const col = a.sc.add.graphics();
  a.underLayer.add(col);
  col.fillStyle(color, 0.14).fillRoundedRect(p.x - 70, y0, 140, p.surfaceY - y0, 30);
  col.lineStyle(5, color, 0.6).strokeRoundedRect(p.x - 70, y0, 140, p.surfaceY - y0, 30);
  a.sc.tweens.add({ targets: col, alpha: { from: 0.4, to: 1 }, duration: 200, yoyo: true, repeat: -1 });
  return () => col.destroy();
}

// ——— THE IMMORTAL BRUTE (mini-boss, wave 83) ———

const immortalbrute = (): Brain => {
  const bin = new Bin();
  const start = once();
  const hordeT = new Every(11, 1.5);
  const bladeT = new Every(9, 3);
  let horde: Foot[] = [];
  let guardFor = 0;
  let whirling = false;

  const march = (f: Foot, a: Arena) => {
    const h = heat(a);
    a.sfx('sfx_immortalbrute_horde');
    a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 180), 'THE HORDE MARCHES!', '#e8e4dc', 44);
    const n = f.phase >= 2 ? h.adds(2) : h.adds(3);
    for (let i = 0; i < n; i++) {
      a.sc.time.delayedCall(i * 350, () => {
        if (!f.alive || !a.inWave()) return;
        const t = a.spawn('immortal', rnd(a.alivePizzas()) ?? null);
        if (t) horde.push(t);
      });
    }
    guardFor = 12;
  };

  const whirl = (f: Foot, a: Arena) => {
    const h = heat(a);
    const ps = lanePizzas(a);
    if (!ps.length) return;
    const i = Math.floor(Math.random() * Math.max(1, ps.length - 1));
    const pair = ps.slice(i, i + 2);
    const x = pair.reduce((s, p) => s + p.x, 0) / pair.length;
    const y = SAFE_TOP + 200;
    const sec = h.windup(f.phase >= 3 ? 2.1 : 2.6);
    const t0 = a.now();
    whirling = true;
    a.sfx('sfx_immortalbrute_whirl');
    a.quip(x, y - 140, 'WHIRL!', '#c9c4bc', 40);
    const chain = a.sc.add.graphics();
    a.fxLayer.add(chain);
    let live = true;
    const prop = hitProp(a, {
      key: 'p_lx_blade',
      x,
      y,
      scale: 0.55,
      hits: h.hits(3),
      r: 110,
      sec,
      badgeDy: -100,
      label: 'SNAGGED!',
      hitSfx: 'sfx_immortalbrute_snag',
      clearSfx: 'sfx_immortalbrute_snag',
      onClear: () => {
        end();
        if (!f.alive) return;
        f.stun(h.stun(2));
        a.damageFoot(f, f.maxHp * 0.05);
        a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 170), 'CHAIN SNAGGED!', '#7dff9a', 44);
      },
      onFail: () => {
        end();
        if (!a.inWave() || !f.alive) return;
        a.sfx('sfx_immortalbrute_slam');
        a.shake(420, 0.014);
        a.fx.explosion(x, pair[0].surfaceY - 30, 160);
        for (const p of pair) if (!p.dead) hitSoft(a, p, 1, 'CLEAVED!', '#c9c4bc');
      },
    });
    const spin = a.sc.tweens.add({ targets: prop.img, angle: 360, duration: 420, repeat: -1 });
    const draw = a.sc.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        chain.clear();
        if (!live || !f.alive) return;
        for (const [w, c] of [[12, 0x2a1810], [6, 0x9aa3ad]] as const) {
          chain.lineStyle(w, c, 1);
          chain.lineBetween(f.x, f.cy, prop.img.x, prop.img.y);
        }
      },
    });
    const ring = timerRing(a, () => (live ? { x, y } : null), 120, 0xc9c4bc, () => 1 - (a.now() - t0) / sec);
    const end = () => {
      live = false;
      whirling = false;
      spin.stop();
      draw.remove();
      chain.destroy();
      ring();
      forget();
    };
    const forget = bin.add(() => {
      live = false;
      whirling = false;
      draw.remove();
      chain.destroy();
      ring();
      prop.destroy();
    });
  };

  return {
    names: ['THE IMMORTAL HORDE', 'BLADE ON A CHAIN', 'NO RETREAT'],
    info: [
      'Waves of Immortals march in, and he can’t be hurt while two or more stand · Beat his Immortals, then hit him',
      'He whirls his blade on a chain over two pizzas · Smack the blade to snag the chain before it slams down',
      'The horde and the blade both come faster · Thin the horde and snag every whirl',
    ],
    upkeep(f, dt, a) {
      start(() => {
        enterArena(a, 'immortalbrute');
        entrance(a, f, { sfx: 'sfx_immortalbrute_enter', quip: 'NO ONE LEAVES THE PASS.', color: '#e8e4dc', flash: [255, 150, 90], ring: 0xc9c4bc, delay: 400, ms: 800 });
      });
      // the horde guards him while two or more of them stand (for a while)
      horde = horde.filter((o) => o.alive);
      guardFor = Math.max(0, guardFor - dt);
      const want = horde.length >= 2 && guardFor > 0;
      if (want !== f.shielded && !f.puppet) shield(a, f, want);
    },
    onPhase(f, ph, a) {
      a.sfx('sfx_immortalbrute_roar');
      if (ph >= 2) bladeT.t = 2;
      void f;
    },
    update(f, dt, a) {
      const h = heat(a);
      const fast = f.phase >= 3 ? 0.75 : 1;
      hordeT.every = h.cooldown((f.phase >= 2 ? 16 : 11) * fast);
      if (hordeT.tick(dt)) march(f, a);
      if (f.phase >= 2 && !whirling) {
        bladeT.every = h.cooldown(9 * fast);
        if (bladeT.tick(dt)) whirl(f, a);
      }
    },
    onDeath(f, a) {
      bin.flush();
      for (const o of horde) if (o.alive) o.die();
      horde = [];
      shatter(a, f, { burst: 0xffb070, tint: 0xd8d0c8, sfx: 'sfx_immortalbrute_death', n: 9 });
      scatter(a, f.cx, f.cy, 'shard', 12, { scale: 0.8, tints: [0x9aa3ad, 0x3a3440, 0xe8e4dc] });
      a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 170), 'THE HORDE… BREAKS…', '#e8e4dc', 42);
      leaveArena(a);
    },
  };
};

// ——— XERXES (boss, wave 85) ———

type XMove = 'arrows' | 'rhino' | 'elephants' | 'godking';

const XINFO: Record<XMove, [string, string]> = {
  arrows: ['ARROW STORM', 'The sky goes dark and volleys of arrows fall on your pizzas · Smack each volley away before it lands'],
  rhino: ['WAR RHINO', 'A war rhino paws the ground at the top of a lane, then charges · Smack it until it turns'],
  elephants: ['WAR ELEPHANTS', 'War elephants stomp in and a golden ward guards him while they stand · Beat the elephants, then hit him'],
  godking: ['THE GOD-KING', 'Arrows, the rhino and the elephants in turn, faster · Answer each one as it comes'],
};

const XPLAN: Record<number, XMove[]> = {
  2: ['arrows', 'elephants'],
  3: ['arrows', 'rhino', 'elephants'],
  4: ['arrows', 'rhino', 'elephants', 'godking'],
};
const xplan = (n: number): XMove[] => XPLAN[Math.max(2, Math.min(4, n))];

const xerxes = (): Brain => {
  const bin = new Bin();
  const start = once();
  let order = xplan(HEAT_BY_ID[save.heat]?.bossPhases ?? 3);
  const names = order.map((m) => XINFO[m][0]);
  const info = order.map((m) => XINFO[m][1]);
  const moveT = new Every(12, 2);
  let ready = false;
  let elephants: Foot[] = [];
  let wardFor = 0;
  let ward: Phaser.GameObjects.Image | null = null;
  let cycle = 0;
  let quipT = 9;

  const arrows = (f: Foot, a: Arena) => {
    const h = heat(a);
    a.sfx('sfx_xerxes_arrows');
    a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 190), 'MY ARROWS WILL BLOT OUT THE SUN!', '#ffd23f', 36);
    // the sky goes dark
    const dark = a.sc.add.rectangle(960, 540, 1920, 1080, 0x0a0610, 0).setDepth(-1);
    a.underLayer.addAt(dark, 0);
    a.sc.tweens.add({ targets: dark, fillAlpha: 0.45, duration: 500, yoyo: true, hold: 4200, onComplete: () => dark.destroy() });
    bin.add(() => dark.destroy());
    const n = h.adds(2);
    for (let i = 0; i < n; i++) {
      a.sc.time.delayedCall(700 + i * 900, () => {
        const p = rnd(a.alivePizzas());
        if (!p || !f.alive || !a.inWave()) return;
        dropOn(a, f, p, 'p_lx_volley', h.windup(1.1), 'ARROWED!', { scale: 0.55, color: '#ffd23f', tint: 0xffffff, fallSfx: 'sfx_xerxes_volley' });
      });
    }
  };

  const rhino = (f: Foot, a: Arena) => {
    const h = heat(a);
    const p = rnd(a.alivePizzas());
    if (!p) return;
    const x = p.x;
    const y = SAFE_TOP + 130;
    const sec = h.windup(2.8);
    const t0 = a.now();
    a.sfx('sfx_xerxes_rhino');
    const unCol = laneColumn(a, p, y, 0xff5a3a);
    let live = true;
    const prop = hitProp(a, {
      key: 'p_lx_rhino',
      x,
      y,
      scale: 0.6,
      hits: h.hits(3),
      r: 110,
      sec,
      badgeDy: -110,
      label: 'TURNED!',
      hitSfx: 'sfx_kit_prophit',
      clearSfx: 'sfx_xerxes_turn',
      onClear: () => {
        end();
        // it bolts off the way it came
        const img = a.sc.add.image(x, y, 'p_lx_rhino').setScale(0.6);
        a.fxLayer.add(img);
        a.sc.tweens.add({ targets: img, y: -200, scale: 0.3, angle: 180, duration: 500, ease: 'Quad.In', onComplete: () => img.destroy() });
        if (f.alive) f.stun(h.stun(1));
      },
      onFail: () => {
        end();
        if (!a.inWave()) return;
        a.sfx('sfx_xerxes_charge');
        const img = a.sc.add.image(x, y, 'p_lx_rhino').setScale(0.6);
        a.fxLayer.add(img);
        a.shake(700, 0.016);
        a.rumble(1, 500);
        // the charge: down the lane, scattering the feet in its way, through the pizza and off the bottom
        for (const o of a.allFeet()) if (o.alive && !o.isBossLike && Math.abs(o.x - x) < 120) o.knock(520);
        a.sc.tweens.add({
          targets: img,
          y: p.surfaceY - 30,
          scale: 0.9,
          duration: 380,
          ease: 'Quad.In',
          onComplete: () => {
            a.fx.explosion(x, p.surfaceY - 30, 160);
            if (!p.dead) hitSoft(a, p, h.slices(2), 'TRAMPLED!', '#ff5a3a');
            a.sc.tweens.add({ targets: img, y: 1300, duration: 300, ease: 'Quad.In', onComplete: () => img.destroy() });
          },
        });
      },
    });
    a.sc.tweens.add({ targets: prop.img, y: y + 10, angle: { from: -4, to: 4 }, duration: 140, yoyo: true, repeat: -1 });
    const ring = timerRing(a, () => (live ? { x, y } : null), 130, 0xff5a3a, () => 1 - (a.now() - t0) / sec);
    const end = () => {
      live = false;
      unCol();
      ring();
      forget();
    };
    const forget = bin.add(() => {
      live = false;
      unCol();
      ring();
      prop.destroy();
    });
  };

  const callElephants = (f: Foot, a: Arena) => {
    const h = heat(a);
    a.sfx('sfx_xerxes_elephants');
    a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 190), 'BRING THE ELEPHANTS!', '#ffd23f', 40);
    const n = h.rank >= 3 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      a.sc.time.delayedCall(i * 500, () => {
        if (!f.alive || !a.inWave()) return;
        const t = a.spawn('elephant', rnd(a.alivePizzas()) ?? null);
        if (t) elephants.push(t);
      });
    }
    wardFor = 14;
    a.sc.time.delayedCall(600, () => f.alive && a.sfx('sfx_xerxes_guard'));
  };

  const special = (f: Foot, a: Arena, m: XMove) => {
    if (m === 'arrows') arrows(f, a);
    else if (m === 'rhino') rhino(f, a);
    else if (m === 'elephants') callElephants(f, a);
    else {
      const seq: XMove[] = ['arrows', 'rhino', 'elephants'];
      special(f, a, seq[cycle++ % 3]);
    }
  };

  return {
    names,
    info,
    upkeep(f, dt, a) {
      start(() => {
        order = xplan(a.bossPhases());
        names.splice(0, names.length, ...order.map((m) => XINFO[m][0]));
        info.splice(0, info.length, ...order.map((m) => XINFO[m][1]));
        a.bossMove(f, names[0], info[0]);
        enterArena(a, 'xerxes');
        entrance(a, f, {
          sfx: 'sfx_xerxes_enter',
          quip: 'I AM GENEROUS.',
          color: '#ffd23f',
          flash: [255, 210, 120],
          ring: 0xffd23f,
          delay: 500,
          ms: 900,
          onLanded: () => {
            scatter(a, f.x, f.y - 60, 'confetti', 20, { scale: 1, tints: [0xffd23f, 0xc8102e, 0x7a1a3a] });
            a.sc.time.delayedCall(900, () => (ready = true));
          },
        });
      });
      // the war elephants' golden ward
      elephants = elephants.filter((o) => o.alive);
      wardFor = Math.max(0, wardFor - dt);
      const guarded = elephants.length > 0 && wardFor > 0;
      if (guarded !== f.shielded && !f.puppet) shield(a, f, guarded);
      if (guarded && !ward) {
        ward = a.sc.add.image(f.x, f.cy, 'p_lx_ward').setScale(1.6).setAlpha(0.9);
        a.underLayer.add(ward);
        a.sc.tweens.add({ targets: ward, angle: 360, duration: 6000, repeat: -1 });
      } else if (!guarded && ward) {
        const w = ward;
        ward = null;
        a.sc.tweens.add({ targets: w, alpha: 0, scale: 2.2, duration: 300, onComplete: () => w.destroy() });
      }
      ward?.setPosition(f.x, f.cy);
    },
    onPhase(f, ph, a) {
      a.sfx('sfx_xerxes_laugh');
      moveT.t = 2;
      void f;
      void ph;
    },
    update(f, dt, a) {
      if (!ready) return;
      const h = heat(a);
      const m = order[Math.min(order.length, f.phase) - 1] ?? 'godking';
      moveT.every = h.cooldown(m === 'godking' ? 7 : m === 'elephants' ? 18 : m === 'rhino' ? 11 : 12);
      if (moveT.tick(dt)) special(f, a, m);
      quipT -= dt;
      if (quipT <= 0) {
        quipT = 12 + Math.random() * 6;
        a.sfx('sfx_xerxes_laugh', { volume: 0.7 });
        a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 190), rnd(['KNEEL, AND YOU MAY KEEP YOUR PIZZA.', 'A GOD-KING DOES NOT BLEED.', 'I AM GENEROUS.'])!, '#ffd23f', 34);
      }
    },
    onDeath(f, a) {
      bin.flush();
      for (const o of elephants) if (o.alive) o.die();
      elephants = [];
      ward?.destroy();
      ward = null;
      shatter(a, f, { burst: 0xffd23f, tint: 0xfff0d0, sfx: 'sfx_xerxes_death', n: 12 });
      scatter(a, f.cx, f.cy, 'confetti', 26, { scale: 1.2, tints: [0xffd23f, 0xc8102e, 0xe8b23a] });
      a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 170), 'A GOD-KING… BLEEDS…', '#ffd23f', 46);
    },
  };
};

export const brains: Record<string, () => Brain> = { immortalbrute, xerxes };
