// Boss brains for Kratos's nemesis bosses (src/game/nemesis.ts): Kronos the Titan King (mini, wave 88) and Zeus
// (wave 90), met in Tartarus only with the Kratos Peel (or Kratos, Ghost of Sparta) equipped. Shared helpers are in
// ./nzkit.ts and ./kit.ts; props are drawn in src/content/props/kratos.ts and the arenas in
// src/content/art/scenes-kratos.ts. Hades's Kronos phase (act9.ts) is a smaller Titan with one move; this one is
// the Titan king himself, with his own fight.
//
// Choices the spec left open (numbers are Regular; heat() scales them):
// - Kronos's phases: TIME EATER, DEVOUR and, on Hot and hotter, REIGN OF THE TITANS (2 phases on Mild and
//   Regular, 3 from Hot). His hourglass keeps coming back in every phase.
// - Time Eater: every 11 s (14 once he's devouring) the great hourglass flips at the back of the table. Smash it
//   (4 smacks) in 6 s, or he eats the time: your peel slows for 4 s, every foot hurries ×1.35 and he heals 3%
//   (not on Mild). Smashed, he's stunned for 1.8 s and takes 4% of his health.
// - Devour: every 13 s he claims a pizza's lane, bends down and grabs it in his stone jaw; it lifts off the table
//   while he chews. Smack the jaw 5 times in 6.5 s and he spits it out (stunned 2 s, 5% of his health), or he
//   swallows half its slices (never its last on Mild).
// - Reign of the Titans: every 15 s two chains crash down across lanes (three on Extra Hot and up). A chained lane
//   is locked: every smack in it hits the chain, so its feet can't be touched until you break the shackle on it (4
//   smacks). Chains rust away after 14 s.
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
import { HOVER_Y, W } from '../../config';
import { HEAT_BY_ID } from '../../data/difficulty';
import { save } from '../../systems/save';
import type { Arena } from '../arena';
import type { Foot } from '../Foot';
import type { Pizza } from '../Pizza';
import { type Brain, type Prop, type Takeover, Every, heat, hitProp, rnd, shield, takeLane, throwAtPeel } from './kit';
import { Bin, SAFE_TOP, cameo, enterArena, entrance, hitSoft, lanePizzas, leaveArena, once, scatter, shatter, timerRing } from './nzkit';

/** A sand burst: golden grains fly up and fall. */
function sandBurst(a: Arena, x: number, y: number, n = 22): void {
  for (let i = 0; i < n; i++) {
    const d = a.sc.add.image(x, y, 'soft').setTint(Phaser.Utils.Array.GetRandom([0xffd27a, 0xf0c860, 0xffe8a8])).setScale(0.05 + Math.random() * 0.06).setBlendMode(Phaser.BlendModes.ADD);
    a.fxLayer.add(d);
    const vx = (Math.random() - 0.5) * 700;
    const vy = -200 - Math.random() * 500;
    const st = { t: 0 };
    a.sc.tweens.add({
      targets: st,
      t: 1,
      duration: 900 + Math.random() * 400,
      onUpdate: () => {
        d.setPosition(x + vx * st.t, y + vy * st.t + 900 * st.t * st.t);
        d.setAlpha(1 - st.t);
      },
      onComplete: () => d.destroy(),
    });
  }
}

/** A thunderbolt from the sky down to (x, y). */
function strikeAt(a: Arena, x: number, y: number): void {
  a.fx.lightning(x + (Math.random() - 0.5) * 80, -20, x, y);
  a.fx.lightning(x + (Math.random() - 0.5) * 120, -20, x, y);
  a.fx.ring(x, y, 0x9fd8ff, 1.2, 0.4);
  a.flash(90, 220, 236, 255);
  a.shake(180, 0.008);
}

// ——— KRONOS THE TITAN KING (mini-boss, wave 88) ———

type KMove = 'time' | 'devour' | 'reign';

interface Chain {
  p: Pizza;
  img: Phaser.GameObjects.Image;
  lock: Prop;
  live: boolean;
  end: (broken: boolean) => void;
}

const titanking = (): Brain => {
  const bin = new Bin();
  const start = once();
  const hourT = new Every(11, 3.5);
  const devourT = new Every(13, 3);
  const reignT = new Every(15, 2.5);
  let glass: { prop: Prop; end: () => void } | null = null;
  let bite: { p: Pizza; hold: Takeover | null; prop: Prop | null; end: (freed: boolean) => void } | null = null;
  const chains: Chain[] = [];
  let quipT = 9;

  // ——— Time Eater ———
  const flipGlass = (f: Foot, a: Arena) => {
    const h = heat(a);
    const sec = h.windup(6);
    const x = Phaser.Math.Clamp(f.x < W / 2 ? f.x + 420 : f.x - 420, 240, W - 240);
    const y = SAFE_TOP + 190;
    a.sfx('sfx_titanking_flip');
    a.quip(x, y - 150, 'TICK… TOCK…', '#ffd27a', 42);
    const t0 = a.now();
    let done = false;
    const prop = hitProp(a, {
      key: 'p_nz_hourglass',
      x,
      y,
      scale: 0.72,
      hits: h.hits(4),
      r: 120,
      sec,
      badgeDy: -140,
      label: 'TIME SHATTERED!',
      hitSfx: 'sfx_titanking_jawhit',
      clearSfx: 'sfx_titanking_shatter',
      onClear: () => {
        finish();
        sandBurst(a, x, y, 30);
        scatter(a, x, y, 'shard', 8, { scale: 0.7, tints: [0xdff0ff, 0xffd27a] });
        if (!f.alive) return;
        f.stun(h.stun(1.8));
        a.damageFoot(f, f.maxHp * 0.04);
        a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 170), 'MY TIME!', '#ff8a6a', 40);
      },
      onFail: () => {
        finish();
        if (!a.inWave() || !f.alive) return;
        const s = h.stun(4);
        a.slowPeel(s);
        a.hurry(1.35, s);
        a.sfx('sfx_titanking_slow');
        a.flash(320, 240, 200, 120);
        sandBurst(a, x, y, 18);
        const pp = a.peelPoint();
        a.quip(pp.x, pp.y - 90, 'TIME EATEN!', '#ffd27a', 46);
        if (h.rank > 0) f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.03);
      },
    });
    // it flips over as it arrives, then ticks; a ring of sand counts the time down
    prop.img.setAngle(180);
    a.sc.tweens.add({ targets: prop.img, angle: 0, duration: 520, ease: 'Back.Out' });
    const ticks = a.sc.time.addEvent({ delay: 500, loop: true, callback: () => a.sfx('sfx_titanking_tick', { volume: 0.8, throttle: 100 }) });
    const ring = timerRing(a, () => (done ? null : { x, y }), 140, 0xffd27a, () => 1 - (a.now() - t0) / sec);
    const forget = bin.add(() => {
      done = true;
      ticks.remove();
      ring();
      prop.destroy();
    });
    const finish = () => {
      done = true;
      ticks.remove();
      ring();
      forget();
      glass = null;
    };
    glass = { prop, end: forget };
  };

  // ——— Devour ———
  const startBite = (f: Foot, a: Arena) => {
    const h = heat(a);
    const ps = a.alivePizzas();
    const p = rnd(ps.filter((q) => !chains.some((c) => c.live && c.p === q))) ?? rnd(ps);
    if (!p) return;
    // (with one pizza left he doesn't claim its lane: the other feet must still be able to reach it)
    const hold = ps.length > 1 ? takeLane(a, f, p) : null;
    f.target = p;
    a.sfx('sfx_titanking_chomp', { volume: 0.7 });
    a.quip(p.x, p.surfaceY - 220, 'DEVOUR!', '#ff8a6a', 50);
    let chew: Phaser.Time.TimerEvent | null = null;
    const b = {
      p,
      hold,
      prop: null as Prop | null,
      end: (freed: boolean) => {
        if (bite !== b) return;
        bite = null;
        chew?.remove();
        b.prop?.destroy();
        hold?.release();
        if (!p.dead) p.setLift(0, 300);
        if (f.alive) {
          f.puppet = false;
          a.sc.tweens.add({ targets: f, y: (f.hoverY ?? HOVER_Y) - 20, duration: 500, ease: 'Quad.Out' });
          if (freed) {
            f.stun(h.stun(2));
            a.damageFoot(f, f.maxHp * 0.05);
          }
        }
      },
    };
    bite = b;
    const forget = bin.add(() => b.end(false));
    // he glides over the pizza, then bends down and grabs it: it lifts towards his mouth while he chews
    a.sc.time.delayedCall(900, () => {
      if (bite !== b || !f.alive || p.dead) return void (forget(), b.end(false));
      f.puppet = true;
      a.sc.tweens.add({ targets: f, x: p.x, y: (f.hoverY ?? HOVER_Y) + 70, duration: 420, ease: 'Quad.In' });
      p.setLift(-70, 420);
      a.sfx('sfx_titanking_chomp');
      a.shake(260, 0.01);
      const sec = h.windup(6.5);
      const t0 = a.now();
      b.prop = hitProp(a, {
        key: 'p_nz_jaw',
        x: p.x,
        y: p.surfaceY - 40,
        scale: 0.7,
        hits: h.hits(5),
        r: 120,
        sec,
        badgeDy: -110,
        label: 'SPAT OUT!',
        hitSfx: 'sfx_titanking_jawhit',
        clearSfx: 'sfx_titanking_freed',
        follow: () => (bite === b ? { x: p.x, y: p.surfaceY - 40 + Math.sin(a.now() * 9) * 6 } : null),
        onClear: () => {
          forget();
          b.end(true);
          a.fx.party(p.x, p.surfaceY - 60, 16);
          a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 170), 'PTOO!', '#ffd27a', 40);
        },
        onFail: () => {
          forget();
          b.end(false);
          if (!a.inWave() || p.dead) return;
          a.sfx('sfx_titanking_chomp');
          hitSoft(a, p, Math.ceil(p.slices / 2) + h.slices(0), 'DEVOURED!', '#ff8a6a');
          a.shake(360, 0.012);
        },
      });
      const ring = timerRing(a, () => (bite === b ? { x: p.x, y: p.surfaceY - 40 } : null), 128, 0xff8a6a, () => 1 - (a.now() - t0) / sec);
      bin.add(ring);
      chew = a.sc.time.addEvent({
        delay: 650,
        loop: true,
        callback: () => {
          if (bite !== b) return;
          a.sfx('sfx_titanking_chew', { volume: 0.8, throttle: 200 });
          a.fx.puff(p.x + (Math.random() - 0.5) * 80, p.surfaceY - 20, 3);
          a.sc.tweens.add({ targets: f.root, angle: { from: -2, to: 2 }, duration: 110, yoyo: true });
        },
      });
    });
  };

  // ——— Reign of the Titans ———
  const dropChains = (_f: Foot, a: Arena) => {
    const h = heat(a);
    const free = lanePizzas(a).filter((p) => !chains.some((c) => c.live && c.p === p) && p !== bite?.p);
    const n = Math.min(free.length, h.rank >= 3 ? 3 : 2);
    const picks = Phaser.Utils.Array.Shuffle([...free]).slice(0, n);
    if (!picks.length) return;
    a.sfx('sfx_titanking_chain');
    a.quip(W / 2, SAFE_TOP + 70, 'REIGN OF THE TITANS!', '#ffd27a', 46);
    picks.forEach((p, i) => a.sc.time.delayedCall(i * 260, () => p.dead || !a.inWave() || chainLane(a, p)));
  };

  const chainLane = (a: Arena, p: Pizza) => {
    const h = heat(a);
    const bottom = p.surfaceY - 30;
    const img = a.sc.add.image(p.x, -800, 'p_nz_chain').setOrigin(0.5, 1).setScale(0.9, 1);
    a.fxLayer.add(img);
    const c: Chain = { p, img, lock: null as unknown as Prop, live: true, end: () => {} };
    a.sc.tweens.add({
      targets: img,
      y: bottom,
      duration: 380,
      ease: 'Quad.In',
      onComplete: () => {
        a.sfx('sfx_titanking_chainhit');
        a.shake(240, 0.01);
        a.fx.puff(p.x, bottom, 8);
      },
    });
    // the lock on the chain: break it to break the chain
    c.lock = hitProp(a, {
      key: 'p_nz_shackle',
      x: p.x,
      y: Math.max(SAFE_TOP + 200, bottom - 300),
      scale: 0.6,
      hits: h.hits(4),
      r: 80,
      sec: 14,
      badgeDy: -80,
      label: 'UNCHAINED!',
      hitSfx: 'sfx_titanking_chainhit',
      clearSfx: 'sfx_titanking_chainbreak',
      onClear: () => c.end(true),
      onFail: () => c.end(false),
    });
    // every other smack in the lane hits the chain: its feet are locked away from you
    a.addClickable({
      x: p.x,
      y: 500,
      r: 0,
      priority: 2,
      contains: (x, y) => c.live && Math.abs(x - p.x) < 95 && y > 0 && y < bottom + 40,
      alive: () => c.live,
      hit: () => {
        a.sfx('sfx_titanking_chainhit', { volume: 0.6, throttle: 120 });
        a.quip(p.x, SAFE_TOP + 120, 'LOCKED!', '#c8bca8', 30);
        a.sc.tweens.add({ targets: img, angle: { from: -2, to: 2 }, duration: 70, yoyo: true });
      },
    });
    const forget = bin.add(() => c.end(false));
    c.end = (broken) => {
      if (!c.live) return;
      c.live = false;
      forget();
      c.lock.destroy();
      if (broken) {
        scatter(a, img.x, img.y - 300, 'shard', 10, { scale: 0.8, tints: [0x8a7e6e, 0xc8bca8] });
        a.sc.tweens.add({ targets: img, y: -100, alpha: 0, duration: 600, ease: 'Quad.In', onComplete: () => img.destroy() });
      } else a.sc.tweens.add({ targets: img, alpha: 0, duration: 500, onComplete: () => img.destroy() });
      const i = chains.indexOf(c);
      if (i >= 0) chains.splice(i, 1);
    };
    chains.push(c);
  };

  const plan = (phase: number): KMove[] => (['time', 'devour', 'reign'] as KMove[]).slice(0, phase);

  return {
    names: ['TIME EATER', 'DEVOUR', 'REIGN OF THE TITANS'],
    info: [
      'The great hourglass flips: if its sand runs out he eats the time, slowing your peel and hurrying every foot · Smash the hourglass',
      'He grabs a pizza in his stone jaw and chews · Smack the jaw again and again to make him spit it out',
      'Titan chains crash down and lock lanes: smacks there hit the chain · Break the shackle on each chain',
    ],
    // 2 phases on Mild and Regular, 3 from Hot (the chains are a Hot-and-hotter move)
    phases: (a) => (a ? (heat(a).rank >= 2 ? 3 : 2) : 0),
    upkeep(f, _dt, a) {
      start(() => {
        enterArena(a, 'titanking');
        entrance(a, f, {
          sfx: 'sfx_titanking_enter',
          quip: 'THE AGE OF TITANS RETURNS!',
          color: '#ffd27a',
          flash: [255, 200, 120],
          ring: 0xffd27a,
          delay: 400,
          ms: 900,
          onLanded: () => {
            sandBurst(a, f.x, f.y - 40, 26);
            scatter(a, f.x, f.y - 120, 'shard', 8, { scale: 0.7, tints: [0x8a7e6e] });
          },
        });
      });
      if (bite) f.puppet = true;
    },
    onPhase(f, ph, a) {
      // a new phase drops what he's holding (the transform beat would let go of him anyway)
      bite?.end(false);
      a.sfx('sfx_titanking_roar');
      if (ph >= 2) devourT.t = 4;
      if (ph >= 3) reignT.t = 2;
      void f;
    },
    update(f, dt, a) {
      const h = heat(a);
      const moves = plan(f.phase);
      if (bite) return;
      hourT.every = h.cooldown(f.phase >= 2 ? 14 : 11);
      if (!glass && hourT.tick(dt)) flipGlass(f, a);
      if (moves.includes('devour')) {
        devourT.every = h.cooldown(13);
        if (devourT.tick(dt)) startBite(f, a);
      }
      if (moves.includes('reign')) {
        reignT.every = h.cooldown(15);
        if (reignT.tick(dt)) dropChains(f, a);
      }
      quipT -= dt;
      if (quipT <= 0) {
        quipT = 11 + Math.random() * 6;
        a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 180), rnd(['TIME IS MY FOOD.', 'SPARTAN. HOW SMALL YOU ARE.', 'EVERY AGE ENDS IN MY MOUTH.'])!, '#ffd27a', 34);
      }
    },
    onSmacked(f, a) {
      // while he chews, smacks on him rattle his jaw a little too (the jaw itself is the real target)
      if (bite?.prop?.alive()) {
        a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 150), 'HIT THE JAW!', '#ffd27a', 32);
      }
      return false;
    },
    onDeath(f, a) {
      bin.flush();
      for (const c of [...chains]) c.end(true);
      // the Titan king crumbles: stone shards, a flood of golden sand and his chains falling away
      shatter(a, f, { burst: 0xffd27a, tint: 0xe8dcc8, sfx: 'sfx_titanking_death', n: 12 });
      sandBurst(a, f.cx, f.cy, 40);
      for (let i = 0; i < 4; i++) a.sc.time.delayedCall(i * 160, () => sandBurst(a, f.cx + (Math.random() - 0.5) * 300, f.cy + (Math.random() - 0.5) * 200, 14));
      a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 170), 'MY… TIME… IS… UP…', '#ffd27a', 40);
      leaveArena(a);
    },
  };
};

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

export const brains: Record<string, () => Brain> = { titanking, zeus };
