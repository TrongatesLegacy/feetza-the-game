// Boss brains for the comic heroes' nemesis mini-bosses (src/game/nemesis.ts), each met only with its hero equipped:
// the Red Sole (Captain Pizzeria) and Venomnom (Spider-Pan) in place of Ultoe at wave 68, and the Cheetoe (Wonder
// Wedge) in place of Lex Lugtoe at wave 63. Shared helpers are in ./nzkit.ts and ./kit.ts; the act's comic print
// (speech bubbles, impact words) comes from src/game/acts/act7.ts; props are in src/content/props/comics.ts and the
// arenas in src/content/art/scenes-comics.ts. Phases follow the heat: 1 on Mild, 2 on Regular and Hot, 3 above.
//
// Choices the spec left open (numbers are Regular; heat() scales them):
// - The Red Sole: THE COSMIC CROUTON (every 8 s the cube floats over a lane and charges for 3.5 s; 3 smacks make its
//   beam backfire into him for 4% and a 1.5 s stun, or it vaporises a slice and freezes the pizza's perk for 4 s),
//   HAIL HYDRANT (every 16 s two hydrant turrets rise at the table's ends and spray their nearest pizza every 4.5 s
//   for a slice, until capped with 4 smacks; they rust shut after 18 s) and SKULL BLITZ (every 14 s he goose-steps
//   across up to 3 lanes, a 1.1 s heel-click before each stomp; 2 smacks on any stomp halt the march and stun him 2 s).
//   His arena answers (src/content/art/scene-redsole.ts): the brain emits 'redsole-cube' (x, y) and 'redsole-cube-end',
//   'redsole-backfire' (x, y), 'redsole-beam' (x), 'redsole-turret', 'redsole-capped' (x), 'redsole-march' and
//   'redsole-blitz' (x) on the scene's events.
// - Venomnom: WE ARE HUNGRY (every 7 s it drools, then its tongue lashes at a pizza over 1.3 s; smack the tongue to
//   cut it short for 2% and a stun, or it gulps a slice and heals 2%, not on Mild), SYMBIOTE SPREAD (every 12 s goo
//   binds a pizza: no perk, and a slice drained every 3.5 s until 4 smacks break it; two sonic emitters on the lab
//   wall take 3 smacks each to fire: the pulse dissolves all goo, stuns it 3 s and doubles the damage it takes for 4
//   s, and the emitter recharges for 12 s) and WE ARE VENOMNOM (a goo twin that shares its health; a sonic pulse
//   melts it back in). Its arena answers (src/content/art/scene-venomnom.ts): the brain emits 'venomnom-lash' (x, y),
//   'venomnom-bind' (x, y), 'venomnom-split' (x), 'venomnom-pulse' (x, y) and 'venomnom-emitter' (i, mounted) on the
//   scene's events.
// - The Cheetoe: POUNCE (every 7 s she dashes over a pizza and crouches 1.2 s; 2 smacks spoil it, or she takes a
//   slice and leaves claw marks that take another in 4 s unless smacked twice), CLAW FRENZY (every 9 s three red
//   lines flash across the screen round your peel for 0.9 s, then her claws rake them: a 1 s peel stun if it's on a
//   line, and any of her own feet on them get hurt) and THE HUNT (every 18 s she vanishes into the leaves: four
//   bushes with eyes in them, hers amber and blinking, the rest green fireflies; smack hers in 6 s and she falls out
//   stunned for 2.5 s and 4%, or she ambushes a pizza for a slice).

import Phaser from 'phaser';
import { NOM_MOUTH } from '../../content/art/comics';
import { VL } from '../../content/art/scenes-comics';
import { HOVER_Y, W } from '../../config';
import { bubble, impactWord } from '../acts/act7';
import type { Arena } from '../arena';
import type { Foot } from '../Foot';
import type { Pizza } from '../Pizza';
import { type Brain, type Prop, Every, heat, hitProp, hitWindup, rnd, twin, windup } from './kit';
import { Bin, SAFE_TOP, enterArena, entrance, hitSoft, lanePizzas, leaveArena, once, scatter, shatter, timerRing } from './nzkit';

/** Design point on a foot's art → screen. */
function onFoot(f: Foot, x: number, y: number, contactY: number): { x: number; y: number } {
  const s = f.type.scale;
  return { x: f.x + (x - 110) * s * f.root.scaleX, y: f.y + (y - contactY) * s * f.root.scaleY };
}

/** A glowing column down a pizza's lane, from y0 to the pizza (a strike's tell). Returns its remover. */
function laneColumn(a: Arena, p: Pizza, y0: number, color: number): () => void {
  const col = a.sc.add.graphics();
  a.underLayer.add(col);
  col.fillStyle(color, 0.12).fillRoundedRect(p.x - 60, y0, 120, p.surfaceY - y0, 30);
  col.lineStyle(4, color, 0.5).strokeRoundedRect(p.x - 60, y0, 120, p.surfaceY - y0, 30);
  a.sc.tweens.add({ targets: col, alpha: { from: 0.4, to: 1 }, duration: 220, yoyo: true, repeat: -1 });
  return () => col.destroy();
}

/** A straight energy beam between two points that fades out. */
function beamFx(a: Arena, x0: number, y0: number, x1: number, y1: number, color: number, width = 40): void {
  const g = a.sc.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  a.fxLayer.add(g);
  for (const [w, c, al] of [[width * 2, color, 0.3], [width, color, 0.8], [width * 0.35, 0xffffff, 1]] as const) {
    g.lineStyle(w, c, al);
    g.lineBetween(x0, y0, x1, y1);
  }
  a.sc.tweens.add({ targets: g, alpha: 0, duration: 420, ease: 'Quad.In', onComplete: () => g.destroy() });
}

// ——— THE RED SOLE (mini-boss, wave 68, with Captain Pizzeria) ———

const redsole = (): Brain => {
  const bin = new Bin();
  const start = once();
  const cubeT = new Every(8, 3);
  const turretT = new Every(16, 2);
  const blitzT = new Every(14, 4);
  let cubeUp = false;
  let turrets = 0;
  let blitzing = false;
  let quipT = 8;

  const cube = (f: Foot, a: Arena) => {
    const h = heat(a);
    const p = rnd(a.alivePizzas());
    if (!p) return;
    cubeUp = true;
    const x = p.x;
    const y = SAFE_TOP + 170;
    const sec = h.windup(3.5);
    const t0 = a.now();
    a.sfx('sfx_redsole_cube');
    a.sc.events.emit('redsole-cube', x, y);
    const unCol = laneColumn(a, p, y, 0x5fb8ff);
    let live = true;
    const done = () => {
      live = false;
      cubeUp = false;
      unCol();
      ring();
      forget();
    };
    const prop = hitProp(a, {
      key: 'p_cm_cube',
      x,
      y,
      scale: 0.6,
      hits: h.hits(3),
      r: 100,
      sec,
      badgeDy: -90,
      label: 'BACKFIRE!',
      hitSfx: 'sfx_redsole_cubehit',
      clearSfx: 'sfx_redsole_misfire',
      onClear: () => {
        done();
        if (!f.alive) return;
        a.sc.events.emit('redsole-backfire', x, y);
        // the beam backfires straight into him
        beamFx(a, x, y, f.cx, f.cy, 0x5fb8ff);
        a.fx.explosion(f.cx, f.cy, 140);
        impactWord(a, f.cx, f.cy - 60, 1.6, 'KZZAK!');
        a.damageFoot(f, f.maxHp * 0.04);
        f.stun(h.stun(1.5));
      },
      onFail: () => {
        done();
        if (!a.inWave() || p.dead || !f.alive) return;
        a.sfx('sfx_redsole_beam');
        a.sc.events.emit('redsole-beam', p.x);
        beamFx(a, x, y, p.x, p.surfaceY - 20, 0x5fb8ff, 60);
        a.shake(300, 0.01);
        hitSoft(a, p, h.slices(1), 'VAPORISED!', '#5fb8ff');
        if (!p.dead) a.freezePerk(p, h.stun(4));
      },
    });
    a.sc.tweens.add({ targets: prop.img, y: y - 12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const ring = timerRing(a, () => (live ? { x, y } : null), 110, 0x5fb8ff, () => 1 - (a.now() - t0) / sec);
    const forget = bin.add(() => {
      live = false;
      cubeUp = false;
      a.sc.events.emit('redsole-cube-end');
      unCol();
      ring();
      prop.destroy();
    });
  };

  const raiseTurrets = (f: Foot, a: Arena) => {
    const h = heat(a);
    a.quip(W / 2, SAFE_TOP + 70, 'HAIL HYDRANT!', '#ff5a4a', 50);
    bubble(a, 'CUT OFF ONE SLICE… TWO MORE SHALL TAKE ITS PLACE!', f, 2200);
    a.sc.events.emit('redsole-turret');
    for (const side of [-1, 1] as const) {
      const x = side < 0 ? 170 : W - 170;
      const y = 660;
      turrets++;
      a.sfx('sfx_redsole_turret');
      let live = true;
      let spray: Phaser.Time.TimerEvent | null = null;
      const end = () => {
        if (!live) return;
        live = false;
        turrets--;
        spray?.remove();
        forget();
      };
      const prop = hitProp(a, {
        key: 'p_cm_turret',
        x,
        y,
        scale: 0.55,
        hits: h.hits(4),
        r: 100,
        sec: 18,
        badgeDy: -110,
        label: 'CAPPED!',
        hitSfx: 'sfx_redsole_cubehit',
        clearSfx: 'sfx_redsole_cap',
        onClear: () => {
          a.sc.events.emit('redsole-capped', x);
          end();
        },
        onFail: end,
      });
      if (side > 0) prop.img.setFlipX(true);
      spray = a.sc.time.addEvent({
        delay: h.cooldown(4.5) * 1000,
        loop: true,
        callback: () => {
          if (!live || !a.inWave()) return;
          // a rattle first, then the jet arcs to the nearest pizza
          a.sc.tweens.add({ targets: prop.img, angle: { from: -6, to: 6 }, duration: 70, yoyo: true, repeat: 4 });
          a.sc.time.delayedCall(600, () => {
            if (!live || !a.inWave()) return;
            const p = [...a.alivePizzas()].sort((q, r) => Math.abs(q.x - x) - Math.abs(r.x - x))[0];
            if (!p) return;
            a.sfx('sfx_redsole_spray', { throttle: 200 });
            const jet = a.sc.add.graphics();
            a.fxLayer.add(jet);
            const nx = x - side * 50;
            const ny = y - 20;
            for (const [w, c, al] of [[22, 0x5fb8ff, 0.4], [10, 0xd8f4ff, 0.9]] as const) {
              jet.lineStyle(w, c, al);
              jet.beginPath();
              for (let i = 0; i <= 16; i++) {
                const t = i / 16;
                jet.lineTo(nx + (p.x - nx) * t, ny + (p.surfaceY - 30 - ny) * t - Math.sin(t * Math.PI) * 160);
              }
              jet.strokePath();
            }
            a.sc.tweens.add({ targets: jet, alpha: 0, duration: 500, onComplete: () => jet.destroy() });
            a.fx.puff(p.x, p.surfaceY - 30, 8);
            hitSoft(a, p, 1, 'SOAKED!', '#5fb8ff');
          });
        },
      });
      const forget = bin.add(() => {
        live = false;
        spray?.remove();
        prop.destroy();
      });
    }
  };

  const blitz = (f: Foot, a: Arena) => {
    const h = heat(a);
    const lanes = lanePizzas(a);
    if (!lanes.length) return;
    if (f.x > W / 2) lanes.reverse();
    const steps = lanes.slice(0, 3);
    blitzing = true;
    f.puppet = true;
    a.sfx('sfx_redsole_laugh');
    bubble(a, 'MARCH!', f, 1200);
    const finish = (halted: boolean) => {
      if (!blitzing) return;
      blitzing = false;
      if (!f.alive) return;
      f.puppet = false;
      a.sc.tweens.add({ targets: f, y: (f.hoverY ?? HOVER_Y) - 20, duration: 400 });
      if (halted) {
        f.stun(h.stun(2));
        a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 170), 'MARCH HALTED!', '#7dff9a', 44);
      }
    };
    bin.add(() => finish(false));
    const step = (i: number) => {
      const p = steps[i];
      if (!blitzing || !f.alive || !a.inWave()) return finish(false);
      if (!p || p.dead) return finish(false);
      a.sc.tweens.add({
        targets: f,
        x: p.x,
        y: (f.hoverY ?? HOVER_Y) + 20,
        duration: 320,
        ease: 'Quad.InOut',
        onComplete: () => {
          if (!blitzing || !f.alive) return;
          a.sfx('sfx_redsole_march');
          a.sc.events.emit('redsole-march');
          windup(a, f, '', h.windup(1.1), 'STOMP!', h.hits(2), () => {
            if (!blitzing) return;
            a.sfx('sfx_redsole_stomp');
            a.sc.events.emit('redsole-blitz', p.x);
            a.shake(300, 0.012);
            a.sc.tweens.add({ targets: f, y: p.surfaceY - 30, duration: 110, yoyo: true, ease: 'Quad.In' });
            impactWord(a, p.x, p.surfaceY - 160, 1.3, 'KRUNCH!');
            if (!p.dead) hitSoft(a, p, 1, 'STOMPED!', '#ff5a4a');
            a.sc.time.delayedCall(350, () => step(i + 1));
          });
          // a cancelled stomp halts the whole march
          const watch = a.sc.time.addEvent({
            delay: 50,
            loop: true,
            callback: () => {
              if (f.brain.windupCancelled) {
                watch.remove();
                finish(true);
              } else if (!f.brain.windup || !blitzing) watch.remove();
            },
          });
        },
      });
    };
    step(0);
  };

  return {
    names: ['THE COSMIC CROUTON', 'HAIL HYDRANT', 'SKULL BLITZ'],
    info: [
      'The Cosmic Crouton charges over a lane to blast a pizza · Smack the cube to make its beam backfire into him',
      'Hydrant turrets rise at the table’s ends and spray your pizzas · Cap each turret before it soaks them',
      'He goose-steps across the table, stomping lane after lane · Smack him twice as his heel clicks to halt the march',
    ],
    cards: [
      {
        what: 'The Cosmic Crouton floats over a lane and charges a beam',
        hit: 'Smack the cube to make its beam backfire into him',
        miss: 'The beam vaporises a slice and freezes that pizza’s perk',
        show: [{ key: 'p_cm_cube', label: 'Cosmic Crouton', hits: (h) => h.hits(3) }],
      },
      {
        what: 'Hydrant turrets rise at the table’s ends and spray pizzas',
        hit: 'Cap each turret before it soaks your pizzas',
        miss: 'Every spray takes a slice from the nearest pizza',
        show: [
          { key: 'p_cm_turret', label: 'Hydrant turret', hits: (h) => h.hits(4) },
          { key: 'p_cm_cube', label: 'Cosmic Crouton', hits: (h) => h.hits(3) },
        ],
      },
      {
        what: 'He goose-steps across the table, stomping lane after lane',
        hit: 'Smack him as his heel clicks to halt the march',
        miss: 'Each stomp lands on a pizza',
        show: [
          { key: '@boss', label: 'On the heel click', hits: (h) => h.hits(2) },
          { key: 'p_cm_turret', label: 'Hydrant turret', hits: (h) => h.hits(4) },
        ],
      },
    ],
    upkeep(f, _dt, a) {
      start(() => {
        enterArena(a, 'redsole');
        entrance(a, f, {
          sfx: 'sfx_redsole_enter',
          quip: 'HAIL HYDRANT!',
          color: '#ff5a4a',
          flash: [255, 90, 70],
          ring: 0xff3a2a,
          delay: 400,
          onLanded: () => bubble(a, 'I HAVE SEEN THE FUTURE, CAPTAIN. YOU ARE NOT IN IT.', f, 2400),
        });
      });
      if (blitzing) f.puppet = true;
    },
    onPhase(f, ph, a) {
      a.sfx('sfx_redsole_laugh');
      if (ph >= 2) turretT.t = 1.5;
      if (ph >= 3) blitzT.t = 3;
      void f;
    },
    update(f, dt, a) {
      if (blitzing) return;
      const h = heat(a);
      cubeT.every = h.cooldown(8);
      if (!cubeUp && cubeT.tick(dt)) cube(f, a);
      if (f.phase >= 2) {
        turretT.every = h.cooldown(16);
        if (turrets === 0 && turretT.tick(dt)) raiseTurrets(f, a);
      }
      if (f.phase >= 3) {
        blitzT.every = h.cooldown(14);
        if (blitzT.tick(dt)) blitz(f, a);
      }
      quipT -= dt;
      if (quipT <= 0) {
        quipT = 11 + Math.random() * 6;
        bubble(a, rnd(['THE CRUMB SHALL RISE!', 'YOU ARE A RELIC, CAPTAIN.', 'HAIL HYDRANT!'])!, f);
      }
    },
    onSmacked(f, a) {
      hitWindup(f, a, 1.5);
      return false;
    },
    onDeath(f, a) {
      bin.flush();
      blitzing = false;
      a.sfx('sfx_redsole_death');
      shatter(a, f, { burst: 0xff3a2a, tint: 0xffd8d0, n: 9 });
      scatter(a, f.cx, f.cy, 'confetti', 16, { scale: 1.1, tints: [0xc8102e, 0x1e1c20, 0xf4efe6] });
      impactWord(a, f.cx, f.cy - 80, 2.2, 'KA-BLAM!');
      a.sc.time.delayedCall(400, () => bubble(a, 'HYDRANT… WILL… RETURN…', { x: f.x, y: f.cy - 160 }, 2000));
      leaveArena(a);
    },
  };
};

// ——— VENOMNOM (mini-boss, wave 68, with Spider-Pan) ———

const venomnom = (): Brain => {
  const bin = new Bin();
  const start = once();
  const tongueT = new Every(7, 3);
  const gooT = new Every(12, 3);
  const splitT = new Every(16, 2);
  let lashing = false;
  const goos = new Map<Pizza, { prop: Prop; end: () => void }>();
  let emitters: { prop: Prop | null; i: number }[] = [];
  let copy: Foot | null = null;
  let vulnT = 0;
  let quipT = 8;

  const mouth = (f: Foot) => onFoot(f, NOM_MOUTH.x, NOM_MOUTH.y, NOM_MOUTH.contact);

  const lash = (f: Foot, a: Arena) => {
    const h = heat(a);
    const p = [...a.alivePizzas()].sort((q, r) => Math.abs(q.x - f.x) - Math.abs(r.x - f.x))[Math.random() < 0.5 ? 0 : 1] ?? rnd(a.alivePizzas());
    if (!p) return;
    lashing = true;
    a.sfx('sfx_venomnom_growl');
    a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 170), 'HUNGRY…', '#b8b8ff', 38);
    // drool: the tell
    const drool = a.sc.time.addEvent({
      delay: 120,
      repeat: 8,
      callback: () => {
        const m = mouth(f);
        const d = a.sc.add.image(m.x + (Math.random() - 0.5) * 60, m.y, 'soft').setTint(0xd8d8ff).setScale(0.05, 0.1);
        a.fxLayer.add(d);
        a.sc.tweens.add({ targets: d, y: d.y + 90, alpha: 0, duration: 500, onComplete: () => d.destroy() });
      },
    });
    bin.add(() => drool.remove());
    const g = a.sc.add.graphics();
    a.fxLayer.add(g);
    const tip = a.sc.add.image(0, 0, 'p_cm_tongue').setScale(0.6).setVisible(false);
    a.fxLayer.add(tip);
    let state: 'wait' | 'out' | 'back' | 'done' = 'wait';
    const st = { u: 0 };
    const draw = () => {
      g.clear();
      if (!f.alive || state === 'wait' || state === 'done') return void tip.setVisible(false);
      const m = mouth(f);
      const tx = m.x + (p.x - m.x) * st.u;
      const ty = m.y + (p.surfaceY - 40 - m.y) * st.u;
      const cx = (m.x + tx) / 2 + 80;
      const cy = Math.min(m.y, ty) - 60;
      for (const [w, c] of [[34, 0x2a1810], [26, 0xc8406a], [8, 0xff9ab8]] as const) {
        g.lineStyle(w, c, 1);
        g.beginPath();
        for (let i = 0; i <= 16; i++) {
          const t = i / 16;
          const x = (1 - t) * (1 - t) * m.x + 2 * (1 - t) * t * cx + t * t * tx;
          const y = (1 - t) * (1 - t) * m.y + 2 * (1 - t) * t * cy + t * t * ty;
          g.lineTo(x, y);
        }
        g.strokePath();
      }
      tip.setVisible(true).setPosition(tx, ty).setRotation(Math.atan2(ty - cy, tx - cx));
    };
    const ticker = a.sc.time.addEvent({ delay: 16, loop: true, callback: draw });
    const cleanup = () => {
      state = 'done';
      lashing = false;
      ticker.remove();
      g.destroy();
      tip.destroy();
    };
    const forget = bin.add(cleanup);
    const retract = (ms: number, after?: () => void) => {
      state = 'back';
      a.sc.tweens.killTweensOf(st);
      a.sc.tweens.add({ targets: st, u: 0, duration: ms, ease: 'Quad.In', onComplete: () => (forget(), after?.()) });
    };
    a.sc.time.delayedCall(h.windup(1.1) * 1000, () => {
      if (state !== 'wait' || !f.alive || !a.inWave() || p.dead) return void forget();
      state = 'out';
      a.sfx('sfx_venomnom_tongue');
      a.sc.events.emit('venomnom-lash', p.x, p.surfaceY);
      a.sc.tweens.add({
        targets: st,
        u: 1,
        duration: h.windup(1.3) * 1000,
        ease: 'Sine.In',
        onComplete: () => {
          if (state !== 'out') return;
          a.sfx('sfx_venomnom_snatch');
          if (!p.dead) hitSoft(a, p, 1, 'GULP!', '#c8406a');
          if (f.alive && h.rank > 0) f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.02);
          retract(300);
        },
      });
    });
    // smack the tongue to cut it short
    a.addClickable({
      get x() {
        return tip.x;
      },
      get y() {
        return tip.y;
      },
      r: 90,
      priority: 2,
      alive: () => state === 'out',
      hit: () => {
        if (state !== 'out') return;
        a.sfx('sfx_venomnom_cut');
        a.fx.impact(tip.x, tip.y, true);
        impactWord(a, tip.x, tip.y - 60, 1.2, 'THWAP!');
        retract(160, () => {
          if (!f.alive) return;
          f.stun(h.stun(1));
          a.damageFoot(f, f.maxHp * 0.02);
        });
      },
    });
  };

  const bind = (f: Foot, a: Arena) => {
    const h = heat(a);
    const p = rnd(a.alivePizzas().filter((q) => !goos.has(q)));
    if (!p) return;
    a.sfx('sfx_venomnom_goo');
    a.sc.events.emit('venomnom-bind', p.x, p.surfaceY);
    a.quip(p.x, p.surfaceY - 200, 'BOUND!', '#b8b8ff', 40);
    const drain = a.sc.time.addEvent({
      delay: h.cooldown(3.5) * 1000,
      loop: true,
      callback: () => {
        if (p.dead || !a.inWave()) return;
        a.sfx('sfx_venomnom_drain', { throttle: 200 });
        hitSoft(a, p, 1, 'DRAINED!', '#8a8aff');
      },
    });
    const perk = a.sc.time.addEvent({ delay: 2500, loop: true, callback: () => !p.dead && a.freezePerk(p, 3) });
    a.freezePerk(p, 3);
    const end = () => {
      drain.remove();
      perk.remove();
      goos.delete(p);
      forget();
    };
    const prop = hitProp(a, {
      key: 'p_cm_goo',
      x: p.x,
      y: p.surfaceY - 30,
      scale: 0.75,
      hits: h.hits(4),
      r: 130,
      badgeDy: -90,
      label: 'SHAKEN OFF!',
      hitSfx: 'sfx_venomnom_tendril',
      clearSfx: 'sfx_venomnom_tendril',
      onClear: end,
    });
    const forget = bin.add(() => {
      drain.remove();
      perk.remove();
      goos.delete(p);
      prop.destroy();
    });
    goos.set(p, { prop, end: () => (end(), prop.clear()) });
    void f;
  };

  const placeEmitter = (f: Foot, a: Arena, i: number) => {
    const h = heat(a);
    const e = VL.emitters[i];
    const slot = emitters[i] ?? { prop: null, i };
    emitters[i] = slot;
    slot.prop = hitProp(a, {
      key: 'p_cm_emitter',
      x: e.x,
      y: e.y,
      scale: 0.75,
      hits: h.hits(3),
      r: 100,
      badgeDy: -110,
      label: 'SONIC PULSE!',
      hitSfx: 'sfx_kit_prophit',
      clearSfx: 'sfx_venomnom_sonic',
      onClear: () => {
        slot.prop = null;
        a.sc.events.emit('venomnom-emitter', i, false);
        pulse(f, a, e.x, e.y);
        // it recharges
        const again = a.sc.time.delayedCall(12000, () => f.alive && a.inWave() && placeEmitter(f, a, i));
        bin.add(() => again.remove());
      },
    });
    a.sc.events.emit('venomnom-emitter', i, true);
    bin.add(() => slot.prop?.destroy());
  };

  const pulse = (f: Foot, a: Arena, x: number, y: number) => {
    const h = heat(a);
    a.sc.events.emit('venomnom-pulse', x, y);
    // rings of sound across the screen
    for (let k = 0; k < 4; k++) a.sc.time.delayedCall(k * 120, () => a.fx.ring(x, y, 0x9ff0ff, 4 + k, 0.6));
    a.flash(200, 200, 240, 255);
    a.shake(400, 0.01);
    for (const gg of [...goos.values()]) gg.end();
    if (copy?.alive) {
      a.sfx('sfx_venomnom_split');
      a.fx.puff(copy.x, copy.cy, 20);
      copy.die();
    }
    copy = null;
    if (!f.alive) return;
    a.sfx('sfx_venomnom_shriek');
    bubble(a, 'TOO LOUD! TOO LOUD!', f, 1600);
    f.stun(h.stun(3));
    f.vuln = 2;
    vulnT = 4;
    f.flash(0x9ff0ff, 300);
  };

  const split = (f: Foot, a: Arena) => {
    if (copy?.alive) return;
    a.sfx('sfx_venomnom_split');
    bubble(a, 'WE ARE VENOMNOM!', f, 1600);
    const t = twin(a, f);
    if (t) {
      copy = t;
      a.sc.events.emit('venomnom-split', f.x);
    }
  };

  return {
    names: ['WE ARE HUNGRY', 'SYMBIOTE SPREAD', 'WE ARE VENOMNOM'],
    info: [
      'It drools, then its tongue lashes out to gulp a slice · Smack the tongue before it reaches the pizza',
      'Goo binds a pizza and drains it · Break the goo, and smack a sonic emitter on the wall to make it shriek',
      'It splits into two that share one health bar · A sonic pulse melts the copy back in',
    ],
    cards: [
      {
        what: 'It drools, then its tongue lashes out at a pizza',
        hit: 'Smack the tongue before it reaches the pizza',
        miss: 'It gulps a slice and heals',
        show: [{ key: 'p_cm_tongue', label: 'Tongue', hits: 1 }],
      },
      {
        what: 'Goo binds a pizza: no perk, and it drains slices',
        hit: 'Break the goo, or fire a sonic emitter on the wall',
        miss: 'The bound pizza loses a slice every few seconds',
        show: [
          { key: 'p_cm_goo', label: 'Goo', hits: (h) => h.hits(4) },
          { key: 'p_cm_emitter', label: 'Sonic emitter', hits: (h) => h.hits(3) },
        ],
      },
      {
        what: 'It splits into two that share one health bar',
        hit: 'Fire a sonic emitter to melt the copy back in',
        miss: 'Two of it lash, drool and goo at once',
        show: [
          { key: 'p_cm_emitter', label: 'Sonic emitter', hits: (h) => h.hits(3) },
          { key: 'p_cm_goo', label: 'Goo', hits: (h) => h.hits(4) },
        ],
      },
    ],
    upkeep(f, dt, a) {
      if (f.brain.twin) return;
      start(() => {
        enterArena(a, 'venomnom');
        entrance(a, f, {
          sfx: 'sfx_venomnom_enter',
          quip: 'WE ARE HUNGRY.',
          color: '#b8b8ff',
          flash: [120, 100, 200],
          ring: 0x8a8aff,
          delay: 400,
          onLanded: () => {
            for (let i = 0; i < 6; i++) a.fx.puff(f.x + (Math.random() - 0.5) * 300, f.y, 3);
            bubble(a, 'EYES. LUNGS. PIZZA.', f, 1800);
          },
        });
      });
      if (vulnT > 0) {
        vulnT -= dt;
        if (vulnT <= 0) f.vuln = 1;
      }
    },
    onPhase(f, ph, a) {
      if (f.brain.twin) return;
      a.sfx('sfx_venomnom_growl');
      if (ph >= 2 && !emitters.length) {
        placeEmitter(f, a, 0);
        placeEmitter(f, a, 1);
        a.quip(W / 2, SAFE_TOP + 90, 'IT HATES LOUD NOISES!', '#9ff0ff', 40);
      }
      if (ph >= 3) splitT.t = 1;
    },
    update(f, dt, a) {
      // the twin just follows its own lane; the original runs the fight
      if (f.brain.twin) return;
      const h = heat(a);
      tongueT.every = h.cooldown(7);
      if (!lashing && tongueT.tick(dt)) lash(f, a);
      if (f.phase >= 2) {
        gooT.every = h.cooldown(12);
        if (goos.size < 2 && gooT.tick(dt)) bind(f, a);
      }
      if (f.phase >= 3) {
        splitT.every = h.cooldown(16);
        if (splitT.tick(dt)) split(f, a);
      }
      quipT -= dt;
      if (quipT <= 0) {
        quipT = 11 + Math.random() * 6;
        bubble(a, rnd(['TASTY LITTLE SLICES…', 'WE WANT THE SPIDER.', 'EYES. LUNGS. PIZZA.'])!, f);
      }
    },
    onDeath(f, a) {
      if (f.brain.twin) return;
      bin.flush();
      emitters = [];
      if (copy?.alive) copy.die();
      copy = null;
      f.vuln = 1;
      a.sfx('sfx_venomnom_death');
      for (let k = 0; k < 4; k++) a.sc.time.delayedCall(k * 110, () => a.fx.ring(f.cx, f.cy, 0x9ff0ff, 3 + k, 0.6));
      shatter(a, f, { burst: 0x8a8aff, tint: 0x3a3a4a, n: 9 });
      scatter(a, f.cx, f.cy, 'soft', 24, { scale: 0.3, tints: [0x14141c, 0x2a2a3a] });
      impactWord(a, f.cx, f.cy - 80, 2.2, 'SPLURCH!');
      a.sc.time.delayedCall(300, () => bubble(a, 'WE… WILL… BE… BACK…', { x: f.x, y: f.cy - 160 }, 2000));
      leaveArena(a);
    },
  };
};

// ——— THE CHEETOE (mini-boss, wave 63, with Wonder Wedge) ———

const cheetoe = (): Brain => {
  const bin = new Bin();
  const start = once();
  const pounceT = new Every(7, 3);
  const clawT = new Every(9, 4);
  const huntT = new Every(18, 3);
  let busy = false;
  let quipT = 8;

  /** Dash to over a pizza, leaving afterimage puffs. */
  const dashTo = (f: Foot, a: Arena, x: number, then: () => void) => {
    a.sfx('sfx_cheetoe_dash');
    const x0 = f.x;
    a.sc.tweens.add({
      targets: f,
      x,
      duration: 260,
      ease: 'Quad.InOut',
      onUpdate: () => a.fx.trail(f.x, f.cy, 0xf0a040),
      onComplete: () => {
        a.fx.puff(x0, f.cy, 4);
        then();
      },
    });
  };

  const pounce = (f: Foot, a: Arena, ambush = false) => {
    const h = heat(a);
    const p = rnd(a.alivePizzas());
    if (!p) return;
    busy = true;
    f.puppet = true;
    const finish = () => {
      busy = false;
      if (!f.alive) return;
      f.puppet = false;
      a.sc.tweens.add({ targets: f, y: (f.hoverY ?? HOVER_Y) - 20, duration: 300 });
    };
    const forget = bin.add(finish);
    const land = () => {
      a.sfx('sfx_cheetoe_pounce');
      a.shake(260, 0.01);
      a.sc.tweens.add({ targets: f, y: p.surfaceY - 20, duration: 120, yoyo: true, ease: 'Quad.In' });
      impactWord(a, p.x, p.surfaceY - 160, 1.3, 'RRRAWR!');
      if (!p.dead) hitSoft(a, p, 1, 'POUNCED!', '#f0a040');
      // claw marks: smack them twice or they take another slice
      if (!p.dead) {
        a.sfx('sfx_cheetoe_scratch');
        const sc = hitProp(a, {
          key: 'p_cm_scratch',
          x: p.x,
          y: p.surfaceY - 20,
          scale: 0.55,
          hits: h.hits(2),
          r: 110,
          sec: h.windup(4),
          badgeDy: -80,
          label: 'PATCHED UP!',
          hitSfx: 'sfx_kit_prophit',
          onFail: () => {
            if (!p.dead && a.inWave()) hitSoft(a, p, 1, 'SHREDDED!', '#e0402a');
          },
        });
        bin.add(() => sc.destroy());
      }
      a.sc.time.delayedCall(300, () => (forget(), finish()));
    };
    dashTo(f, a, p.x, () => {
      if (!f.alive || !a.inWave()) return void forget();
      if (ambush) return land();
      // the crouch: tail lashing, eyes glowing, a low growl
      a.sfx('sfx_cheetoe_crouch');
      a.sc.tweens.add({ targets: f, y: (f.hoverY ?? HOVER_Y) + 30, duration: 300 });
      windup(a, f, '', h.windup(1.2), 'POUNCE!', h.hits(2), land);
      const watch = a.sc.time.addEvent({
        delay: 50,
        loop: true,
        callback: () => {
          if (f.brain.windupCancelled) {
            watch.remove();
            a.sfx('sfx_cheetoe_hiss');
            a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 170), 'SPOILED!', '#7dff9a', 44);
            forget();
            finish();
          } else if (!f.brain.windup) watch.remove();
        },
      });
    });
  };

  const claws = (f: Foot, a: Arena) => {
    const h = heat(a);
    const pp = a.peelPoint();
    const tell = a.sc.add.graphics();
    a.fxLayer.add(tell);
    const lines: [number, number, number, number][] = [];
    const ang = (Math.random() - 0.5) * 1.2;
    for (let k = -1; k <= 1; k++) {
      const ox = pp.x + k * 110 + (Math.random() - 0.5) * 60;
      const oy = pp.y + (Math.random() - 0.5) * 60;
      const dx = Math.cos(ang + Math.PI / 2) * 600;
      const dy = Math.sin(ang + Math.PI / 2) * 600;
      lines.push([ox - dx, oy - dy, ox + dx, oy + dy]);
    }
    a.sfx('sfx_cheetoe_hiss');
    const draw = (al: number) => {
      tell.clear();
      for (const [x0, y0, x1, y1] of lines) {
        tell.lineStyle(10, 0xff3a2a, 0.25 * al);
        tell.lineBetween(x0, y0, x1, y1);
        tell.lineStyle(3, 0xff6a4a, 0.9 * al);
        tell.lineBetween(x0, y0, x1, y1);
      }
    };
    draw(1);
    a.sc.tweens.add({ targets: tell, alpha: { from: 0.4, to: 1 }, duration: 120, yoyo: true, repeat: -1 });
    const forget = bin.add(() => tell.destroy());
    a.sc.time.delayedCall(h.windup(0.9) * 1000, () => {
      forget();
      if (!a.inWave() || !f.alive) return;
      let hitPeel = false;
      lines.forEach(([x0, y0, x1, y1], i) =>
        a.sc.time.delayedCall(i * 90, () => {
          a.sfx('sfx_cheetoe_slash', { throttle: 60 });
          const g = a.sc.add.graphics();
          a.fxLayer.add(g);
          for (const [w, c] of [[18, 0x2a1810], [10, 0xfff6e8]] as const) {
            g.lineStyle(w, c, 1);
            g.lineBetween(x0, y0, x1, y1);
          }
          a.sc.tweens.add({ targets: g, alpha: 0, duration: 380, onComplete: () => g.destroy() });
          // her own feet on the line get raked too
          for (const o of a.allFeet()) {
            if (!o.alive || o === f || o.isBossLike) continue;
            if (Phaser.Math.Distance.BetweenPoints({ x: o.cx, y: o.cy }, nearest(x0, y0, x1, y1, o.cx, o.cy)) < 60) a.damageFoot(o, 40);
          }
          const p = a.peelPoint();
          if (!hitPeel && Phaser.Math.Distance.BetweenPoints(p, nearest(x0, y0, x1, y1, p.x, p.y)) < 70) {
            hitPeel = true;
            a.stunPeel(h.stun(1), 'SLASHED!');
          }
        }),
      );
    });
  };

  const hunt = (f: Foot, a: Arena) => {
    const h = heat(a);
    busy = true;
    f.puppet = true;
    f.shielded = true;
    a.sfx('sfx_cheetoe_rustle');
    a.quip(f.x, Math.max(SAFE_TOP + 40, f.cy - 170), 'NOW YOU SEE ME…', '#f0a040', 40);
    a.sc.tweens.add({ targets: f, y: -500, duration: 420, ease: 'Quad.In' });
    const spots = Phaser.Utils.Array.Shuffle([260, 700, 1220, 1660]).map((x, i) => ({ x: x + (Math.random() - 0.5) * 80, y: SAFE_TOP + 140 + (i % 2) * 140 }));
    const real = Math.floor(Math.random() * spots.length);
    const props: Prop[] = [];
    let over = false;
    const end = (found: boolean, at?: { x: number; y: number }) => {
      if (over) return;
      over = true;
      for (const q of props) q.destroy();
      forget();
      if (!f.alive) return;
      if (found && at) {
        a.sfx('sfx_cheetoe_flush');
        f.x = at.x;
        a.sc.tweens.add({ targets: f, y: (f.hoverY ?? HOVER_Y) - 20, duration: 360, ease: 'Bounce.Out' });
        f.shielded = false;
        f.puppet = false;
        busy = false;
        f.stun(h.stun(2.5));
        a.damageFoot(f, f.maxHp * 0.04);
        a.quip(at.x, at.y - 120, 'FOUND YOU!', '#7dff9a', 46);
      } else {
        // the ambush: she drops on a pizza from the leaves
        f.shielded = false;
        f.y = -200;
        busy = false;
        a.sfx('sfx_cheetoe_hiss');
        pounce(f, a, true);
      }
    };
    const forget = bin.add(() => {
      over = true;
      for (const q of props) q.destroy();
      f.shielded = false;
      f.puppet = false;
      busy = false;
    });
    spots.forEach((s, i) => {
      const hers = i === real;
      const q = hitProp(a, {
        key: hers ? 'p_cm_eyes' : 'p_cm_fireflies',
        x: s.x,
        y: s.y,
        scale: 1,
        hits: 1,
        r: 90,
        sec: i === real ? h.windup(6) : undefined,
        badgeDy: -70,
        hitSfx: 'sfx_cheetoe_rustle',
        clearSfx: hers ? 'sfx_cheetoe_flush' : 'sfx_cheetoe_rustle',
        onClear: () => {
          if (hers) end(true, s);
          else {
            a.fx.puff(s.x, s.y, 10);
            a.quip(s.x, s.y - 80, 'JUST FIREFLIES!', '#b8ff7a', 32);
          }
        },
        onFail: () => end(false),
      });
      // her eyes blink slowly; the fireflies' flicker fast
      a.sc.tweens.add({ targets: q.img, alpha: { from: 1, to: hers ? 0.35 : 0.6 }, duration: hers ? 900 : 260, yoyo: true, repeat: -1, delay: 300 });
      props.push(q);
    });
  };

  return {
    names: ['POUNCE', 'CLAW FRENZY', 'THE HUNT'],
    info: [
      'She dashes over a pizza and crouches to pounce · Smack her twice while she crouches, then smack away her claw marks',
      'Red lines flash round your peel before her claws rake them · Move your peel off the lines',
      'She hides in the leaves among the fireflies · Smack the amber eyes, not the green ones',
    ],
    cards: [
      {
        what: 'She dashes over a pizza and crouches to pounce',
        hit: 'Smack her while she crouches, then smack away claw marks',
        miss: 'She takes a slice, and her claw marks take another',
        show: [
          { key: '@boss', label: 'While she crouches', hits: (h) => h.hits(2) },
          { key: 'p_cm_scratch', label: 'Claw marks', hits: (h) => h.hits(2) },
        ],
      },
      {
        what: 'Red lines flash round your peel, then her claws rake them',
        hit: 'Move your peel off the red lines',
        miss: 'Caught on a line: your peel is stunned for a second',
        icon: '🐾',
      },
      {
        what: 'She hides in the leaves among the fireflies',
        hit: 'Smack her amber eyes, not the green fireflies',
        miss: 'She ambushes a pizza for a slice',
        show: [
          { key: 'p_cm_eyes', label: 'Her amber eyes', hits: 1 },
          { key: 'p_cm_fireflies', label: 'Just fireflies', watch: true },
        ],
      },
    ],
    upkeep(f, _dt, a) {
      start(() => {
        enterArena(a, 'cheetoe');
        entrance(a, f, {
          sfx: 'sfx_cheetoe_enter',
          quip: 'HERE, KITTY KITTY? I THINK NOT.',
          color: '#f0a040',
          flash: [255, 190, 90],
          ring: 0xf0a040,
          delay: 300,
          ms: 520,
        });
      });
      if (busy) f.puppet = true;
    },
    onPhase(f, ph, a) {
      a.sfx('sfx_cheetoe_hiss');
      if (ph >= 2) clawT.t = 2;
      if (ph >= 3) huntT.t = 2.5;
      void f;
    },
    update(f, dt, a) {
      if (busy) return;
      const h = heat(a);
      pounceT.every = h.cooldown(7);
      if (pounceT.tick(dt)) return pounce(f, a);
      if (f.phase >= 2) {
        clawT.every = h.cooldown(9);
        if (clawT.tick(dt)) claws(f, a);
      }
      if (f.phase >= 3) {
        huntT.every = h.cooldown(18);
        if (huntT.tick(dt)) hunt(f, a);
      }
      quipT -= dt;
      if (quipT <= 0) {
        quipT = 11 + Math.random() * 6;
        bubble(a, rnd(['NINE LIVES. HOW MANY HAVE YOU?', 'FASTER THAN YOUR PEEL, PRINCESS.', 'SSSSST!'])!, f);
      }
    },
    onSmacked(f, a) {
      hitWindup(f, a, 1.5);
      return false;
    },
    onDeath(f, a) {
      bin.flush();
      busy = false;
      a.sfx('sfx_cheetoe_death');
      shatter(a, f, { burst: 0xf0a040, tint: 0xfff0d8, n: 9 });
      scatter(a, f.cx, f.cy, 'confetti', 18, { scale: 1.1, tints: [0xf0a040, 0x2a1810, 0xfff0d8] });
      impactWord(a, f.cx, f.cy - 80, 2.2, 'MRROWW!');
      a.sc.time.delayedCall(300, () => bubble(a, 'EIGHT… LIVES… LEFT…', { x: f.x, y: f.cy - 160 }, 2000));
      leaveArena(a);
    },
  };
};

/** The nearest point on segment a→b to (px, py). */
function nearest(x0: number, y0: number, x1: number, y1: number, px: number, py: number): { x: number; y: number } {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const t = Phaser.Math.Clamp(((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return { x: x0 + dx * t, y: y0 + dy * t };
}

export const brains: Record<string, () => Brain> = { redsole, venomnom, cheetoe };
