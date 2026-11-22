// Boss brains, Stages 7–9: doughboy, nonna, pigeonking, gargoyle, jellyfish, kraken.
// Shared helpers and the heat scaling live in ./kit.ts. Props are drawn in src/content/props/act2a.ts.

import Phaser from 'phaser';
import type { Arena } from '../arena';
import type { Foot } from '../Foot';
import type { Pizza } from '../Pizza';
import { type Brain, type Prop, type Takeover, Every, heat, hitProp, laneOf, mark, retreat, rnd, shield, takeLane } from './kit';

// ——— Local helpers ———

/** The kit's dropOn with a hook for what else a landing does (the Kraken's splash also costs freshness).
 * Broadcast first (reticle on the pizza, a lit lane, the object wobbling at the top), then a steady fall.
 * Smack it any time before it lands; if it lands, the pizza loses a slice and `onLand` runs. */
function drop(a: Arena, f: Foot, p: Pizza, key: string, sec: number, label: string, look: { scale?: number; tint?: number; color?: string; top?: number; startSfx?: [string, { throttle?: number }?]; landSfx?: string } = {}, onLand?: () => void): void {
  const tx = p.x;
  const ty = p.surfaceY - 30;
  const warn = 0.9;
  const fall = sec + 1.1;
  const top = look.top ?? 240; // below the boss bar, which sits over the top of the screen
  const ret = mark(a, 'p_reticle', tx, ty, warn + fall, 0.75);
  // the lane lights up from the drop point down to the pizza, in front of the boss but translucent
  const col = a.sc.add.graphics();
  a.fxLayer.add(col);
  const tint = look.tint ?? 0xffd23f;
  col.fillStyle(tint, 0.13).fillRoundedRect(tx - 60, top - 40, 120, ty - top + 60, 30);
  col.lineStyle(5, tint, 0.6).strokeRoundedRect(tx - 60, top - 40, 120, ty - top + 60, 30);
  a.sc.tweens.add({ targets: col, alpha: { from: 0.5, to: 1 }, duration: 300, yoyo: true, repeat: -1 });
  a.quip(tx, ty - 150, '!', look.color ?? '#ff8a6a', 60);
  const scale = look.scale ?? 0.8;
  const img = a.sc.add.image(tx, top, key).setScale(0);
  if (look.tint !== undefined && key === 'p_snowball') img.setTint(look.tint);
  a.fxLayer.add(img);
  a.sfx('sfx_warning', { volume: 0.35, rate: 1.3, throttle: 200 });
  if (look.startSfx) a.sfx(look.startSfx[0], look.startSfx[1]);
  let done = false;
  const finish = () => {
    done = true;
    col.destroy();
    // the target marker goes with it (it used to linger on the pizza after a smash)
    if (ret.active) {
      a.sc.tweens.killTweensOf(ret);
      a.sc.tweens.add({ targets: ret, alpha: 0, scale: ret.scale * 1.3, duration: 180, onComplete: () => ret.destroy() });
    }
  };
  a.sc.tweens.add({ targets: img, scale, duration: 220, ease: 'Back.Out' });
  a.sc.tweens.add({ targets: img, angle: { from: -14, to: 14 }, duration: 110, yoyo: true, repeat: Math.max(1, Math.round((warn * 1000) / 220) - 1) });
  a.sc.time.delayedCall(warn * 1000, () => {
    if (done) return;
    if (!f.alive || !a.inWave()) {
      finish();
      img.destroy();
      return;
    }
    a.sfx('sfx_whoosh', { volume: 0.5, rate: 0.7 });
    a.sc.tweens.add({
      targets: img,
      y: ty,
      angle: 200,
      duration: fall * 1000,
      ease: 'Linear',
      // the boss went down (or the wave ended) mid-fall: it goes too, instead of hanging over the pizza
      onUpdate: (tw) => {
        if (done || (f.alive && a.inWave())) return;
        finish();
        tw.stop();
        a.sc.tweens.add({ targets: img, alpha: 0, scale: img.scale * 0.6, duration: 200, onComplete: () => img.destroy() });
      },
      onComplete: () => {
        if (done) return;
        finish();
        img.destroy();
        if (!f.alive || p.dead || !a.inWave()) return;
        a.fx.explosion(tx, ty, 110);
        if (look.landSfx) a.sfx(look.landSfx, { throttle: 120 });
        a.hitPizza(p, 1, label, look.color ?? '#ff8a6a');
        onLand?.();
      },
    });
  });
  a.addClickable({
    get x() {
      return img.x;
    },
    get y() {
      return img.y;
    },
    r: 120,
    priority: 2,
    contains: (x, y) => Math.abs(x - img.x) < 110 && Math.abs(y - img.y) < 140,
    alive: () => !done,
    hit: () => {
      if (done) return;
      finish();
      a.sc.tweens.killTweensOf(img);
      a.fx.impact(img.x, img.y, true);
      a.sfx('sfx_slap_2', { volume: 0.8 });
      a.quip(img.x, img.y - 70, 'SMASHED!', '#7dff9a', 34);
      a.sc.tweens.add({ targets: img, alpha: 0, scale: 0.2, y: img.y - 120, duration: 260, onComplete: () => img.destroy() });
    },
  });
  a.sc.time.delayedCall((warn + fall) * 1000 + 50, () => {
    if (!done) finish();
  });
}

/** Take a point of freshness (only when freshness is on; never below 1, so a hit can't make a pizza stale). */
function sour(a: Arena, p: Pizza): void {
  if (!p.freshOn || p.dead || p.fresh <= 1) return;
  p.setFresh(p.fresh - 1);
  a.quip(p.x + 130, p.surfaceY - 40, '-1 FRESH', '#9ad0ff', 30);
}

/** A quip kept clear of the boss bar's move line (the Fx clamp stops at y 230, which still touches it). */
function say(a: Arena, x: number, y: number, msg: string, color: string, size: number): void {
  a.quip(x, Math.max(300, y), msg, color, size);
}

/** Stops the kit's ±6° hit wobble on a prop (very visible on wide or tall ones) and puts it back square. */
function steady(a: Arena, img: Phaser.GameObjects.Image, scale: number): void {
  a.sc.tweens.killTweensOf(img);
  img.setAngle(0).setScale(scale);
}

const FONT = 'Lilita One, Fredoka, sans-serif';

/** A counter in the kit's badge style (dark disc, cream ring, big number) with a small caption under it,
 * following `at` each frame: the flock left, the cracks left. Same look as the hit counters on props. */
function counter(a: Arena, at: () => { x: number; y: number }, caption: string): { set(n: number): void; destroy(): void } {
  const box = a.sc.add.container(0, 0).setAlpha(0);
  const disc = a.sc.add.circle(0, 0, 30, 0x2a1810, 0.92).setStrokeStyle(4, 0xfff6e2);
  const num = a.sc.add.text(0, 1, '', { fontFamily: FONT, fontSize: '38px', color: '#fff6e2' }).setOrigin(0.5);
  const cap = a.sc.add.text(0, 44, caption, { fontFamily: FONT, fontSize: '20px', color: '#fff6e2', stroke: '#2a1810', strokeThickness: 6 }).setOrigin(0.5);
  box.add([disc, num, cap]);
  a.fxLayer.add(box);
  a.sc.tweens.add({ targets: box, alpha: 1, duration: 200 });
  let live = true;
  const place = () => {
    const p = at();
    box.setPosition(Phaser.Math.Clamp(p.x, 120, 1800), Phaser.Math.Clamp(p.y, 300, 940));
  };
  place();
  const ev = a.sc.time.addEvent({ delay: 16, loop: true, callback: () => live && place() });
  let last = -1;
  return {
    set: (n) => {
      if (!live || n === last) return;
      if (last >= 0) a.sc.tweens.add({ targets: box, scale: { from: 1.35, to: 1 }, duration: 180 });
      last = n;
      num.setText(String(n));
    },
    destroy: () => {
      if (!live) return;
      live = false;
      ev.remove();
      a.sc.tweens.add({ targets: box, alpha: 0, scale: 0.6, duration: 200, onComplete: () => box.destroy() });
    },
  };
}

/** The pizza nearest the middle of the table. */
function middlePizza(a: Arena): Pizza | null {
  const ps = a.alivePizzas();
  if (!ps.length) return null;
  return ps.reduce((b, p) => (Math.abs(p.x - 960) < Math.abs(b.x - 960) ? p : b));
}

/** A frame ticker on the scene clock (keeps running while the boss is stunned or mid phase change). */
function ticker(a: Arena, fn: (dt: number) => boolean | void): Phaser.Time.TimerEvent {
  let last = a.now();
  const ev = a.sc.time.addEvent({
    delay: 16,
    loop: true,
    callback: () => {
      const now = a.now();
      const dt = Math.min(0.05, now - last);
      last = now;
      if (fn(dt) === false) ev.remove();
    },
  });
  return ev;
}

// ——— 13. Dough Boy ———

const doughboy = (): Brain => {
  let since = 0;
  let puffT = 0;
  let riseN = 0;
  let next = 2.5;
  return {
    names: ['DOUGH BALLS', 'RISING'],
    info: ['Lobs dough balls onto the pizza below it · smack each ball as it falls', 'Rises back to health if you leave it alone · keep hitting it'],
    update: (f, dt, a) => {
      since += dt;
      if (f.phase === 1) {
        next -= dt;
        const p = laneOf(a, f);
        if (next <= 0 && p) {
          next = heat(a).cooldown(3.6);
          // a golden, outlined ball that pops out just under his sole, so it's never lost against his cream body
          drop(a, f, p, 'p_doughball', 1.5, 'DOUGHED!', { scale: 0.8, tint: 0xffc46a, color: '#ffd9a0', startSfx: ['sfx_doughboy_ball'], landSfx: 'sfx_doughboy_splat', top: Math.max(300, Math.min(f.y + 80, p.surfaceY - 260)) });
        }
      }
      if (f.phase >= 2 && since > 1.5 && f.hp < f.maxHp) {
        f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.03 * dt);
        // visible: it swells like proving dough and sparkles green while it heals
        puffT -= dt;
        if (puffT <= 0) {
          puffT = 0.9;
          a.fx.healBurst(f.cx, f.cy);
          a.sfx('sfx_doughboy_rise', { throttle: 800 });
          const sx = f.root.scaleX;
          const sy = f.root.scaleY;
          a.sc.tweens.add({ targets: f.root, scaleX: sx * 1.05, scaleY: sy * 1.08, duration: 240, yoyo: true, ease: 'Sine.InOut' });
          // the call-out sits under its sole, where the peel is (above it is behind the boss bar)
          if ((riseN++ & 1) === 0) say(a, f.x, f.y + 50, 'RISING! KEEP HITTING', '#7dff9a', 34);
        }
      }
    },
    onSmacked: () => {
      since = 0;
      return false;
    },
  };
};

// ——— 14. Nonna's Slipper ———

const nonna = (): Brain => {
  let busy = false;
  let next = 2.5; // a moment after she lands
  let cycle = 0;
  let endRetreat: (() => void) | null = null;
  let pin: Prop | null = null;
  let lane: Takeover | null = null;
  /** Ends a running peel snatch quietly (the fight ended). */
  let stopSnatch: (() => void) | null = null;

  const done = (f: Foot, cool: number) => {
    endRetreat?.();
    endRetreat = null;
    lane?.release();
    lane = null;
    f.pinned = false;
    busy = false;
    next = cool;
  };

  // Phase 1: feet back off and a huge rolling pin rolls down the table. Stop it before it reaches the bottom.
  const rollingPin = (f: Foot, a: Arena) => {
    const h = heat(a);
    const ps = a.alivePizzas();
    if (!ps.length) return;
    busy = true;
    f.pinned = true;
    endRetreat = retreat(a);
    const left = Math.min(...ps.map((p) => p.x - p.radius));
    const right = Math.max(...ps.map((p) => p.x + p.radius));
    const scale = Phaser.Math.Clamp((right - left + 240) / 1560, 0.6, 1.15);
    const cx = (left + right) / 2;
    const top = 250 + 110 * scale; // its top edge starts just under the boss bar's move line
    const bottom = Math.max(...ps.map((p) => p.surfaceY)) + 40;
    const warn = 1;
    const travel = h.windup(5);
    const st = { y: top };
    say(a, cx, top + 200, 'ROLLING PIN!', '#ffd9a0', 56);
    a.sfx('sfx_warning', { volume: 0.6 });
    a.shake(250, 0.006);
    // six frames of the barrel turning: it visibly rolls as it comes down (and back up when knocked)
    const frames = ['p_rollpin', 'p_rollpin1', 'p_rollpin2', 'p_rollpin3', 'p_rollpin4', 'p_rollpin5'];
    const perFrame = 28 * scale; // px of travel per frame (a third of the barrel's turn over six frames)
    let rolled = 0;
    let shown = 0;
    let back = 0; // knock-back still to apply, eased out over a few frames rather than snapping
    const ghost = (img: Phaser.GameObjects.Image) => {
      const g = a.sc.add.image(img.x, img.y, img.texture.key).setScale(scale);
      a.fxLayer.add(g);
      img.setVisible(false);
      return g;
    };
    pin = hitProp(a, {
      key: 'p_rollpin',
      x: cx,
      y: top,
      scale,
      hits: h.hits(4),
      sec: warn + travel,
      follow: () => ({ x: cx, y: st.y }),
      contains: (x, y) => !!pin && Math.abs(x - pin.img.x) < 760 * scale && Math.abs(y - pin.img.y) < 110 * scale + 30,
      // the counter sits on the middle of the barrel (above it is the boss bar)
      badgeDy: 0,
      label: 'STOPPED!',
      // each smack knocks it back up the table a little, with a squash instead of the kit's tilt
      onHit: () => {
        if (!pin) return;
        steady(a, pin.img, scale);
        a.sc.tweens.add({ targets: pin.img, scaleY: scale * 0.86, scaleX: scale * 1.015, duration: 70, yoyo: true, ease: 'Quad.Out' });
        back += 40;
        a.fx.puff(cx + (Math.random() - 0.5) * 900 * scale, st.y + 60, 4);
      },
      onClear: () => {
        // it bounces back up the table and fades
        if (pin) {
          const g = ghost(pin.img);
          a.sc.tweens.add({ targets: g, y: g.y - 70, scaleY: scale * 0.8, alpha: 0, duration: 420, ease: 'Quad.Out', onComplete: () => g.destroy() });
        }
        pin = null;
        a.sfx('sfx_crit');
        done(f, h.cooldown(9));
      },
      onFail: () => {
        // it keeps rolling, right over the pizzas and off the front of the table
        if (pin) {
          const g = ghost(pin.img);
          a.sc.tweens.add({ targets: g, y: 1300, duration: 520, ease: 'Quad.In', onUpdate: () => g.setTexture(frames[Math.floor(g.y / perFrame) % 6]), onComplete: () => g.destroy() });
        }
        pin = null;
        a.shake(400, 0.014);
        a.sfx('sfx_nonna_pinsmash');
        if (f.alive && a.inWave()) for (const p of a.alivePizzas()) a.hitPizza(p, h.slices(1), 'FLATTENED!', '#e0a868');
        done(f, h.cooldown(9));
      },
    });
    const speed = (bottom - top) / travel;
    let wait = warn;
    let rolling = false;
    let dust = 0;
    ticker(a, (dt) => {
      if (!pin || !pin.alive()) return false;
      if (back > 0) {
        const k = Math.min(back, back * dt * 14 + 1);
        back -= k;
        const was = st.y;
        st.y = Math.max(top, st.y - k);
        rolled -= was - st.y;
      }
      if (wait > 0) wait -= dt;
      else {
        if (!rolling) {
          rolling = true;
          a.sfx('sfx_nonna_pin');
        }
        const was = st.y;
        st.y = Math.min(bottom, st.y + speed * dt);
        rolled += st.y - was;
        dust -= dt;
        if (dust <= 0) {
          dust = 0.25;
          a.fx.puff(cx + (Math.random() - 0.5) * 1300 * scale, st.y + 70 * scale, 3);
        }
      }
      const fr = ((Math.floor(rolled / perFrame) % 6) + 6) % 6;
      if (fr !== shown) {
        shown = fr;
        pin.img.setTexture(frames[fr]);
      }
    });
  };

  // Phase 2: feet back off and big slippers rain down, one onto each pizza, staggered.
  const slippers = (f: Foot, a: Arena) => {
    const h = heat(a);
    const ps = Phaser.Utils.Array.Shuffle([...a.alivePizzas()]);
    if (!ps.length) return;
    busy = true;
    f.pinned = true;
    endRetreat = retreat(a);
    say(a, 960, 420, 'FLYING SLIPPERS!', '#ff9ad8', 52);
    a.sfx('sfx_nonna_slippers');
    const gap = h.windup(0.85);
    ps.forEach((p, i) => {
      a.sc.time.delayedCall(500 + i * gap * 1000, () => {
        if (!f.alive || !a.inWave() || p.dead) return;
        // starts under the boss bar's move line so the whole slipper is in view while it wobbles
        drop(a, f, p, 'p_bigslipper', 1.1, 'SLIPPERED!', { scale: 0.72, tint: 0xff9ad8, color: '#ff9ad8', top: 320, landSfx: 'sfx_nonna_slipper' });
      });
    });
    // the last slipper's warning and fall, then feet carry on
    a.sc.time.delayedCall((0.5 + (ps.length - 1) * gap + 0.9 + 2.2 + 0.4) * 1000, () => {
      if (busy) done(f, h.cooldown(9));
    });
  };

  // Phase 3: she moves to an edge lane and hooks your peel with her spoon. Pull away to get it back.
  const snatch = (f: Foot, a: Arena) => {
    const h = heat(a);
    const ps = [...a.alivePizzas()].sort((p, q) => p.x - q.x);
    if (!ps.length) return;
    const edge = Math.random() < 0.5 ? ps[0] : ps[ps.length - 1];
    // Oven Mitts: she can't get a grip on it
    if (a.peelGuarded?.()) {
      say(a, f.x, f.y + 60, 'OVEN MITTS! NO SNATCHING', '#ffd23f', 44);
      done(f, h.cooldown(12));
      return;
    }
    busy = true;
    lane = takeLane(a, f, edge);
    endRetreat = retreat(a);
    say(a, f.x, f.y + 60, 'PEEL SNATCH!', '#ffd23f', 56);
    a.sfx('sfx_warning', { volume: 0.6 });
    const handle = a.sc.add.graphics();
    a.fxLayer.add(handle);
    // the bowl is added to the scene itself, after the cursor layer, so it clamps down ON TOP of the peel
    const bowl = a.sc.add.image(0, 0, 'p_spoonbowl').setScale(0.85).setVisible(false);
    // the direction arrows also sit above the peel, so it never hides them
    const arrows = a.sc.add.graphics();
    // the panel: "PULL AWAY!", the tug meter and the time left, all in one place above the peel
    const panel = a.sc.add.container(0, 0).setVisible(false);
    const meter = a.sc.add.graphics();
    const txt = (x: number, y: number, s: string, size: number, color = '#fff6e2') =>
      a.sc.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#2a1810', strokeThickness: 6 }).setOrigin(0.5);
    const title = txt(0, -44, 'PULL AWAY!', 36, '#ffd23f');
    const tugL = txt(-128, 8, 'TUG', 20);
    const timeL = txt(-128, 42, 'TIME', 20);
    panel.add([meter, title, tugL, timeL]);
    a.fxLayer.add(panel);
    const grabFor = Math.max(1.5, h.windup(1.8));
    const need = 1000 + 150 * h.rank; // px of movement away from her
    const pull = 240 + 30 * h.rank;
    const reach = 1.1; // she slides over to the edge lane
    const swing = 0.45; // the spoon swings out to the peel
    let t = 0;
    let fill = 0;
    let lastD = -1;
    let lastP = -1;
    let grabbedAt = -1;
    let over = false;
    const hand = () => ({ x: f.x, y: f.cy + 30 });
    const drawHandle = (x0: number, y0: number, x1: number, y1: number) => {
      handle.clear().lineStyle(32, 0x2a1810, 1).lineBetween(x0, y0, x1, y1).lineStyle(22, 0xc8884a, 1).lineBetween(x0, y0, x1, y1);
      // a highlight along the top of the handle
      const l = Math.hypot(x1 - x0, y1 - y0) || 1;
      const ox = ((y1 - y0) / l) * -5;
      const oy = ((x0 - x1) / l) * -5;
      handle.lineStyle(5, 0xf6d29a, 0.8).lineBetween(x0 + ox, y0 + oy, x1 + ox, y1 + oy);
    };
    const tidy = (fade = false) => {
      over = true;
      for (const o of [handle, arrows, panel]) {
        if (fade) a.sc.tweens.add({ targets: o, alpha: 0, duration: 220, onComplete: () => o.destroy() });
        else o.destroy();
      }
      if (fade) {
        // the spoon lets go and springs back towards her
        const me = hand();
        a.sc.tweens.add({ targets: bowl, x: me.x, y: Math.max(200, me.y), alpha: 0, scale: 0.6, duration: 300, ease: 'Quad.In', onComplete: () => bowl.destroy() });
      } else bowl.destroy();
    };
    stopSnatch = () => {
      if (!over) tidy();
    };
    const finish = (ok: boolean) => {
      if (over) return;
      const at = { x: bowl.x, y: bowl.y };
      tidy(true);
      stopSnatch = null;
      if (ok) {
        say(a, at.x, at.y - 100, 'GOT IT BACK!', '#7dff9a', 46);
        a.sfx('sfx_crit');
        if (f.alive) f.stun(1.2);
      } else if (f.alive && a.inWave()) {
        // she flings the peel at a pizza
        const p = rnd(a.alivePizzas());
        a.stunPeel(0.7, 'THROWN!');
        if (p) {
          const fly = a.sc.add.image(at.x, at.y, 'peel').setScale(0.6);
          a.fxLayer.add(fly);
          a.sfx('sfx_whoosh', { rate: 0.8 });
          a.sc.tweens.add({ targets: fly, x: p.x, y: p.surfaceY - 20, angle: 540, duration: 450, ease: 'Quad.In', onComplete: () => {
            fly.destroy();
            if (!p.dead && a.inWave()) {
              a.fx.impact(p.x, p.surfaceY - 20, true);
              a.hitPizza(p, h.slices(1), 'PEEL TOSSED!', '#ffd23f');
            }
          } });
        }
      }
      done(f, h.cooldown(18));
    };
    // while she has it, smacks do nothing (and say why)
    a.addClickable({ x: 0, y: 0, r: 0, priority: 9, contains: () => true, alive: () => grabbedAt >= 0 && !over, hit: () => a.quip(a.peelPoint().x, a.peelPoint().y + 90, 'PULL AWAY!', '#ffd23f', 30) });
    ticker(a, (dt) => {
      if (over) return false;
      if (!f.alive || !a.inWave()) {
        tidy();
        stopSnatch = null;
        return false;
      }
      t += dt;
      const me = hand();
      const pp = a.peelPoint();
      if (t < reach) return;
      if (t < reach + swing) {
        // the spoon swings out to where the peel is
        const k = Phaser.Math.Easing.Back.Out((t - reach) / swing);
        const ex = me.x + (pp.x - me.x) * k;
        const ey = me.y + (pp.y - me.y) * k;
        drawHandle(me.x, me.y, ex, ey);
        bowl.setVisible(true).setPosition(ex, ey).setRotation(Math.atan2(ey - me.y, ex - me.x) - Math.PI / 2);
        return;
      }
      if (grabbedAt < 0) {
        grabbedAt = a.now();
        a.sfx('sfx_nonna_spoon');
        a.sfx('sfx_nonna_tug');
        say(a, me.x, me.y + 80, 'GOTCHA!', '#ff8a6a', 44);
        a.sc.tweens.add({ targets: bowl, scale: { from: 1.1, to: 0.85 }, duration: 200, ease: 'Back.Out' });
        panel.setVisible(true).setAlpha(0);
        a.sc.tweens.add({ targets: panel, alpha: 1, duration: 150 });
      }
      // a Peel Slam knocks her off it
      if (a.slammedAt() >= grabbedAt) {
        finish(true);
        return false;
      }
      // tug of war: she drags the peel towards her and the peel trails the mouse; every bit of mouse (or peel)
      // movement away from her fills the meter, so long drags and quick repeated yanks both work
      a.slowPeel(0.12);
      const ptr = a.sc.input.activePointer;
      const dp = Math.hypot(ptr.worldX - me.x, ptr.worldY - me.y);
      const d = Math.hypot(pp.x - me.x, pp.y - me.y);
      if (lastD >= 0) fill += Math.max(0, dp - lastP, d - lastD) / need;
      fill = Math.max(0, fill - 0.12 * dt);
      lastP = dp;
      lastD = d;
      if (d > 170) {
        pp.x += ((me.x - pp.x) / d) * pull * dt;
        pp.y += ((me.y - pp.y) / d) * pull * dt;
      }
      const held = a.now() - grabbedAt;
      const left = Math.max(0, 1 - held / grabFor);
      // spoon handle from her to the peel, the bowl clamped over it and straining (it shakes)
      const ux = d ? (pp.x - me.x) / d : 1;
      const uy = d ? (pp.y - me.y) / d : 0;
      // the bowl hooks the near edge of the peel's head, so the peel itself stays in view under it
      const bx = pp.x - ux * 105;
      const by = pp.y - uy * 105;
      drawHandle(me.x, me.y, bx, by);
      const jig = 2 + 3 * (1 - left);
      bowl.setPosition(bx + (Math.random() - 0.5) * jig, by + (Math.random() - 0.5) * jig).setRotation(Math.atan2(uy, ux) - Math.PI / 2);
      // chevrons from the peel pointing away from her: which way to pull
      arrows.clear();
      const now = a.now();
      for (let i = 0; i < 3; i++) {
        const dist = 150 + i * 56;
        const ax = pp.x + ux * dist;
        const ay = pp.y + uy * dist;
        const s = 28;
        const alpha = 0.35 + 0.65 * Math.max(0, Math.sin(now * 9 - i * 1.2));
        const pts = [ax - ux * s - uy * s, ay - uy * s + ux * s, ax, ay, ax - ux * s + uy * s, ay - uy * s - ux * s];
        arrows.lineStyle(20, 0x2a1810, alpha).beginPath().moveTo(pts[0], pts[1]).lineTo(pts[2], pts[3]).lineTo(pts[4], pts[5]).strokePath();
        arrows.lineStyle(10, 0xffd23f, alpha).beginPath().moveTo(pts[0], pts[1]).lineTo(pts[2], pts[3]).lineTo(pts[4], pts[5]).strokePath();
      }
      // the panel sits above the peel (below it when the peel is near the top), always fully on screen
      const above = pp.y - 210;
      panel.setPosition(Phaser.Math.Clamp(pp.x, 190, 1730), above >= 330 ? above : Math.min(960, pp.y + 220));
      meter.clear();
      meter.fillStyle(0x2a1810, 0.92).fillRoundedRect(-170, -78, 340, 140, 18);
      meter.lineStyle(4, 0xfff6e2, 1).strokeRoundedRect(-170, -78, 340, 140, 18);
      // tug meter, yellow → green near the end, with quarter ticks
      meter.fillStyle(0x4a3a30, 1).fillRoundedRect(-92, -6, 240, 28, 10);
      meter.fillStyle(fill > 0.7 ? 0x7dff9a : 0xffd23f, 1).fillRoundedRect(-92, -6, Math.max(10, 240 * Math.min(1, fill)), 28, 10);
      meter.lineStyle(2, 0x2a1810, 0.6);
      for (const q of [0.25, 0.5, 0.75]) meter.lineBetween(-92 + 240 * q, -4, -92 + 240 * q, 20);
      // time left drains red; it flashes in the last third
      const flash = left < 0.34 && Math.sin(now * 20) > 0;
      meter.fillStyle(0x4a3a30, 1).fillRoundedRect(-92, 34, 240, 16, 7);
      meter.fillStyle(flash ? 0xffffff : left < 0.34 ? 0xff4a3a : 0xff8a3a, 1).fillRoundedRect(-92, 34, Math.max(8, 240 * left), 16, 7);
      if (fill >= 1) {
        finish(true);
        return false;
      }
      if (held >= grabFor) {
        finish(false);
        return false;
      }
    });
  };

  return {
    names: ['ROLLING PIN', 'FLYING SLIPPERS', 'PEEL SNATCH'],
    info: [
      'Rolls a giant rolling pin down the table · smack it to stop it before it reaches the bottom',
      'Rains a big slipper onto every pizza · smack each one before it lands',
      'Hooks your peel with her spoon · pull the mouse away from her fast (or Peel Slam)',
    ],
    onPhase: () => {
      if (!busy) next = 2.5;
    },
    update: (f, dt, a) => {
      if (busy || !a.inWave()) return;
      next -= dt;
      if (next > 0) return;
      const moves = [rollingPin, slippers, snatch];
      const move = f.phase <= 3 ? moves[f.phase - 1] : moves[cycle++ % 3];
      next = 2;
      move(f, a);
    },
    onDeath: (f) => {
      pin?.destroy();
      pin = null;
      stopSnatch?.();
      stopSnatch = null;
      done(f, 0);
    },
  };
};

// ——— 15. The Pigeon King ———

const pigeonking = (): Brain => {
  const bomb = new Every(5, 2.5);
  let flock: Foot[] = [];
  let warded = false;
  let wardT = 0;
  let gap = 1.5;
  let nagT = 0;
  let count: ReturnType<typeof counter> | null = null;
  return {
    names: ['BIRD BOMB', 'FLOCK CALL'],
    info: ['Drops bombs on the pizza below it · smack them as they fall', 'Shielded while his flock is out · clear every pigeon, then hit him'],
    update: (f, dt, a) => {
      nagT -= dt;
      if (f.phase === 1 && bomb.tick(dt)) {
        const p = laneOf(a, f);
        if (p) drop(a, f, p, 'p_cream', 1.5, 'SPLAT!', { scale: 0.3, color: '#ffffff', startSfx: ['sfx_pigeonking_coo', { throttle: 300 }], landSfx: 'sfx_pigeonking_splat' });
      }
      if (f.phase < 2) return;
      if (warded) {
        shield(a, f, true);
        flock = flock.filter((pg) => pg.alive);
        count?.set(flock.length);
        // a safety net: the ward never outlasts 25 s, even if a pigeon can't be reached
        wardT += dt;
        if (!flock.length || wardT > 25) {
          wardT = 0;
          warded = false;
          shield(a, f, false);
          a.setMinions(null);
          count?.destroy();
          count = null;
          gap = heat(a).cooldown(6);
          say(a, f.x, f.y + 70, 'EXPOSED! HIT HIM!', '#7dff9a', 46);
          a.sfx('sfx_crit');
        }
        return;
      }
      gap -= dt;
      if (gap > 0 || !a.inWave()) return;
      // Mild 4, Regular 5, one more per heat above
      const n = 4 + heat(a).rank;
      a.setMinions(['pigeon']);
      flock = [];
      for (let i = 0; i < n; i++) {
        const pg = a.spawn('pigeon', rnd(a.alivePizzas()) ?? null, f.x + (i - (n - 1) / 2) * 110);
        if (pg) {
          pg.y -= (i % 3) * 60;
          flock.push(pg);
        }
      }
      if (!flock.length) {
        a.setMinions(null);
        gap = 1;
        return;
      }
      warded = true;
      shield(a, f, true);
      say(a, f.x, f.y + 190, `FLOCK CALL ×${flock.length}`, '#c7ccd4', 44);
      // how many pigeons are left, under his sole for as long as the shield is up
      count = counter(a, () => ({ x: f.x, y: f.y + 60 }), 'PIGEONS LEFT');
      count.set(flock.length);
      a.sfx('sfx_pigeonking_flock');
    },
    onSmacked: (f, a) => {
      if (!warded) return false;
      a.sfx('sfx_kit_shieldblock', { throttle: 150 });
      if (nagT <= 0) {
        nagT = 0.6;
        say(a, f.x, f.y + 190, `CLEAR THE FLOCK · ${flock.filter((pg) => pg.alive).length} LEFT`, '#c7ccd4', 30);
      }
      return true;
    },
    onDeath: (f, a) => {
      shield(a, f, false);
      a.setMinions(null);
      count?.destroy();
      count = null;
    },
  };
};

// ——— 16. The Gargoyle ———

/** Where the Gargoyle's statue sits (contact y): well below its usual hover, so most of the statue is in plain
 * view under the boss bar (at 450 only its toes showed and every call-out above it was hidden). */
const STONE_Y = 600;
const CRACKS = 6;

const gargoyle = (): Brain => {
  let started = false;
  const swoop = new Every(3, 3);
  let stoneNext = 3;
  let stoneT = 0;
  let cracks = 0;
  let lane: Takeover | null = null;
  // the statue look: fissures drawn on the foot itself, one more per smack, and the cracks-left counter
  let fissures: Phaser.GameObjects.Graphics | null = null;
  let paths: { x: number; y: number }[][] = [];
  let count: ReturnType<typeof counter> | null = null;
  // phase 3+: it hides behind a flock of little gargoyles, can't be hurt until every one is gone,
  // then is exposed for a few seconds before calling the next (bigger at higher heats)
  let flock: Foot[] = [];
  let warded = false;
  let wardT = 0;
  let exposedT = 0;
  let nagT = 0;
  const flockSize = (f: Foot, a: Arena) => Math.ceil(3 * a.heatCount()) + (f.phase >= 4 ? 1 : 0);
  const under = (f: Foot) => () => ({ x: f.x, y: f.y + 60 });
  const dropCount = () => {
    count?.destroy();
    count = null;
  };
  const endStone = (f: Foot, a: Arena) => {
    stoneT = 0;
    f.shielded = false;
    f.brain.wasShielded = false;
    f.tint(null);
    if (lane) f.puppet = false;
    lane?.release();
    lane = null;
    dropCount();
    if (fissures) {
      const g = fissures;
      fissures = null;
      a.sc.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => g.destroy() });
    }
  };
  /** Fissure k: a jagged line down the lower body (the top of the statue is behind the boss bar). */
  const drawCracks = () => {
    if (!fissures) return;
    const g = fissures.clear();
    for (const pts of paths.slice(0, cracks)) {
      g.lineStyle(9, 0x1e1c22, 0.9).beginPath().moveTo(pts[0].x, pts[0].y);
      for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
      g.strokePath();
      g.lineStyle(3, 0xeef2fa, 0.75).beginPath().moveTo(pts[0].x + 3, pts[0].y + 2);
      for (const p of pts.slice(1)) g.lineTo(p.x + 3, p.y + 2);
      g.strokePath();
    }
  };
  const startStone = (f: Foot, a: Arena) => {
    stoneT = 5;
    cracks = 0;
    f.shielded = true;
    f.brain.wasShielded = true;
    // cold slate blue: reads as a carved statue next to its usual warm grey
    f.tint(0x9fb2d0);
    const hw = f.meta.halfWidth * f.type.scale;
    const fh = f.meta.footHeight * f.type.scale;
    paths = [];
    for (let k = 0; k < CRACKS; k++) {
      let x = (((k * 0.37) % 1) - 0.5) * hw * 1.3;
      let y = -fh * (0.62 - 0.07 * (k % 3));
      const pts = [{ x, y }];
      for (let i = 0; i < 5; i++) {
        x += (Math.random() - 0.5) * hw * 0.35;
        y += fh * (0.06 + Math.random() * 0.04);
        pts.push({ x, y });
      }
      paths.push(pts);
    }
    fissures = a.sc.add.graphics();
    f.root.add(fissures);
    count = counter(a, under(f), 'CRACKS LEFT');
    count.set(CRACKS);
    a.fx.puff(f.cx, f.cy, 8);
    say(a, f.x, f.y + 190, 'STONE FORM!', '#c7ccd4', 44);
  };
  const callFlock = (f: Foot, a: Arena) => {
    flock = [];
    const n = flockSize(f, a);
    for (let i = 0; i < n; i++) {
      const g = a.spawn('gargoylet', rnd(a.alivePizzas()) ?? null, f.x + (i - (n - 1) / 2) * 110);
      if (g) {
        g.y -= (i % 3) * 60;
        flock.push(g);
      }
    }
    if (!flock.length) {
      exposedT = 1; // nothing could spawn: try again shortly rather than every frame
      return;
    }
    warded = true;
    shield(a, f, true);
    say(a, f.x, f.y + 190, `GARGOYLE STORM ×${flock.length}`, '#c7ccd4', 44);
    dropCount();
    count = counter(a, under(f), 'GARGOYLES LEFT');
    count.set(flock.length);
    a.sfx('sfx_gargoyle_storm');
  };
  return {
    names: ['SWOOP', 'STONE FORM', 'GARGOYLE STORM'],
    info: [
      'Swoops between pizzas while it hovers · strike when it settles over one',
      'Turns to stone over the middle pizza: smacks do no damage · crack it 6 times to break it and stun it',
      "Hides behind a flock of little gargoyles and can't be hurt · clear the flock, then hit it while it's exposed",
    ],
    onPhase: (f, phase, a) => {
      if (phase < 3) return;
      // leaving stone form behind
      endStone(f, a);
      if (phase === 3) exposedT = 0;
      a.fx.puff(f.cx, f.cy, 6);
    },
    update: (f, dt, a) => {
      nagT -= dt;
      // the only other feet in this fight are pigeons
      if (!started) {
        started = true;
        a.setMinions(['pigeon']);
      }
      if (!lane && swoop.tick(dt) && f.state === 'hover') {
        const p = rnd(a.alivePizzas().filter((q) => q !== f.target));
        if (p) {
          f.target = p;
          a.sfx('sfx_gargoyle_swoop');
        }
      }
      if (stoneT > 0) {
        f.shielded = true;
        // the statue settles over the middle pizza, low enough to see (a held lane would park it off the top)
        if (lane) {
          f.x += (lane.p.x - f.x) * Math.min(1, dt * 3);
          f.y += (STONE_Y - f.y) * Math.min(1, dt * 3);
        }
        stoneT -= dt;
        if (stoneT <= 0) {
          endStone(f, a);
          stoneNext = heat(a).cooldown(7);
        }
      } else if (f.phase === 2 && a.inWave()) {
        stoneNext -= dt;
        if (stoneNext <= 0) {
          // a statue in the middle lane: it settles low over it and holds still
          lane = takeLane(a, f, middlePizza(a));
          if (!lane) {
            stoneNext = 1;
            return;
          }
          f.puppet = true;
          f.setState('hover');
          startStone(f, a);
          a.sfx('sfx_gargoyle_stone');
        }
      }
      if (f.phase >= 3) {
        if (warded) {
          shield(a, f, true); // keep the ward through the transform beat
          flock = flock.filter((g) => g.alive);
          count?.set(flock.length);
          wardT += dt;
          if (!flock.length || wardT > 25) {
            wardT = 0;
            warded = false;
            shield(a, f, false);
            dropCount();
            exposedT = f.phase >= 4 ? 4 : 5;
            say(a, f.x, f.y + 70, 'EXPOSED! HIT IT!', '#7dff9a', 46);
            a.sfx('sfx_crit');
          }
        } else if (exposedT > 0) {
          exposedT -= dt;
        } else if (a.inWave()) callFlock(f, a);
      }
    },
    onSmacked: (f, a) => {
      if (warded) {
        a.sfx('sfx_kit_shieldblock', { throttle: 150 });
        if (nagT <= 0) {
          nagT = 0.6;
          say(a, f.x, f.y + 190, `CLEAR THE GARGOYLES · ${flock.filter((g) => g.alive).length} LEFT`, '#c7ccd4', 30);
        }
        return true;
      }
      if (stoneT <= 0) return false;
      cracks++;
      drawCracks();
      count?.set(CRACKS - cracks);
      if (cracks < CRACKS) a.sfx('sfx_gargoyle_stonecrack', { throttle: 80 });
      a.fx.puff(f.cx + (Math.random() - 0.5) * 80, f.y - 60, 5);
      if (cracks >= CRACKS) {
        endStone(f, a);
        stoneNext = heat(a).cooldown(7);
        f.stun(1.5);
        a.fx.explosion(f.cx, f.y - 80, 160);
        a.shake(250, 0.008);
        say(a, f.x, f.y + 70, 'STONE BROKEN!', '#7dff9a', 46);
        a.sfx('sfx_gargoyle_stonebreak');
      }
      return true;
    },
    onDeath: (f, a) => {
      endStone(f, a);
      shield(a, f, false);
      a.setMinions(null);
    },
  };
};

// ——— 17. Jellyfish Flip-Flop ———

const jellyfish = (): Brain => {
  // dim → (charge) → glow → dim. Phase 1 holds still from the charge to the end of the glow.
  let mode: 'dim' | 'charge' | 'glow' = 'dim';
  let t = 2;
  const CHARGE = 0.7;
  let halo: { g: Phaser.GameObjects.Graphics; sign: Phaser.GameObjects.Container } | null = null;
  const still = (f: Foot) => f.phase === 1;
  const hide = (a: Arena) => {
    if (!halo) return;
    const { g, sign } = halo;
    halo = null;
    a.sc.tweens.killTweensOf(sign);
    a.sc.tweens.add({ targets: [g, sign], alpha: 0, duration: 160, onComplete: () => (g.destroy(), sign.destroy()) });
  };
  const show = (a: Arena) => {
    if (halo) return;
    const g = a.sc.add.graphics();
    // a "don't hit" sign under the sole, where the peel is (above the foot is off the top of the screen):
    // the same dark pill as the hit counters, in the sting's pink, so it can't be mistaken for "hit this"
    const sign = a.sc.add.container(0, 0);
    const label = a.sc.add.text(0, 0, "⚡ DON'T HIT! ⚡", { fontFamily: FONT, fontSize: '34px', color: '#ff8ae0', stroke: '#2a1810', strokeThickness: 6 }).setOrigin(0.5);
    const w = label.width + 36;
    const bg = a.sc.add.graphics();
    bg.fillStyle(0x2a1810, 0.92).fillRoundedRect(-w / 2, -30, w, 60, 30);
    bg.lineStyle(4, 0xff8ae0, 1).strokeRoundedRect(-w / 2, -30, w, 60, 30);
    sign.add([bg, label]);
    a.fxLayer.add([g, sign]);
    sign.setScale(0.4);
    a.sc.tweens.add({ targets: sign, scale: 1, duration: 200, ease: 'Back.Out' });
    halo = { g, sign };
  };
  const draw = (f: Foot, a: Arena) => {
    if (!halo) return;
    const r = f.meta.halfWidth * f.scale * 0.9;
    const now = a.now();
    const pulse = 0.5 + 0.5 * Math.sin(now * 14);
    const g = halo.g.clear();
    if (mode === 'charge') {
      // the wind-up: a ring closes in on it and brightens, with sparks along it
      const k = Phaser.Math.Clamp(1 - t / CHARGE, 0, 1);
      const rr = r * (2 - 0.9 * k);
      g.fillStyle(0xff5ad0, 0.06 + 0.12 * k).fillCircle(f.cx, f.cy, rr);
      g.lineStyle(4 + 6 * k, 0xffb0ee, 0.4 + 0.55 * k).strokeCircle(f.cx, f.cy, rr);
      g.lineStyle(4, 0xffffff, 0.8 * k);
      for (let i = 0; i < 6; i++) {
        const ang = Math.random() * Math.PI * 2;
        g.lineBetween(f.cx + Math.cos(ang) * rr, f.cy + Math.sin(ang) * rr, f.cx + Math.cos(ang + 0.15) * (rr - 26), f.cy + Math.sin(ang + 0.15) * (rr - 26));
      }
    } else if (mode === 'glow') {
      g.fillStyle(0xff5ad0, 0.12 + pulse * 0.1).fillCircle(f.cx, f.cy, r);
      g.lineStyle(8, 0xffb0ee, 0.95).strokeCircle(f.cx, f.cy, r * (0.96 + pulse * 0.06));
      // a crackling ring: jagged zigzag that re-rolls every frame
      g.lineStyle(5, 0xffffff, 0.9);
      g.beginPath();
      const n = 28;
      for (let i = 0; i <= n; i++) {
        const ang = (i / n) * Math.PI * 2;
        const rr = r * 1.12 + (i % 2 ? 1 : -1) * (10 + Math.random() * 14);
        const x = f.cx + Math.cos(ang) * rr;
        const y = f.cy + Math.sin(ang) * rr;
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.strokePath();
    }
    halo.sign.setPosition(Phaser.Math.Clamp(f.x, 200, 1720), Phaser.Math.Clamp(f.y + 40, 320, 900)).setAlpha(mode === 'glow' ? 0.75 + 0.25 * pulse : 1);
  };
  return {
    names: ['GLOW', 'BRIGHT GLOW'],
    info: ['Stops and glows pink before it stings your peel · never hit it while it glows, strike when it dims', 'Keeps moving while it glows · wait for the dim, then strike'],
    update: (f, dt, a) => {
      t -= dt;
      if (mode === 'dim' && t <= 0 && (!still(f) || f.state === 'hover')) {
        mode = still(f) ? 'charge' : 'glow';
        t = still(f) ? CHARGE : 2.5;
        if (still(f)) f.puppet = true;
        show(a);
        a.sfx(still(f) ? 'sfx_jellyfish_charge' : 'sfx_jellyfish_bright');
      } else if (mode === 'charge' && t <= 0) {
        mode = 'glow';
        t = 2;
      } else if (mode === 'glow' && t <= 0) {
        mode = 'dim';
        t = f.phase >= 2 ? 1.5 : 2;
        if (f.puppet && !Number(f.brain.transformT ?? 0)) f.puppet = false;
        hide(a);
        // the all-clear, in the same green as every "hit it now" call-out
        if (f.alive) say(a, f.x, f.y + 40, 'HIT NOW!', '#7dff9a', 40);
      }
      f.brain.glowing = mode === 'glow';
      // only retint when the colour changes, so hit flashes and status tints aren't wiped every frame
      const want = mode === 'glow' ? 0xff5ad0 : mode === 'charge' ? (Math.sin(a.now() * 30) > 0 ? 0xffb0ee : null) : null;
      if ((want ?? false) !== f.brain.jellyTint) {
        f.brain.jellyTint = want ?? false;
        f.tint(want);
      }
      draw(f, a);
    },
    onPhase: (f, _p, a) => {
      // Bright Glow doesn't hold still: drop any hold from phase 1 (a held foot skipped the transform beat)
      if (mode !== 'dim' && !Number(f.brain.transformT ?? 0)) f.puppet = false;
      mode = 'dim';
      t = 1;
      f.tint(null);
      f.brain.jellyTint = false;
      hide(a);
    },
    onSmacked: (f, a) => {
      if (!f.brain.glowing) return false;
      a.stunPeel(0.6, 'STUNG! Hit it when it dims');
      a.fx.lightning(f.cx, f.cy, a.peelPoint().x, a.peelPoint().y);
      a.sfx('sfx_jellyfish_sting', { throttle: 150 });
      return true;
    },
    onDeath: (f, a) => {
      f.brain.glowing = false;
      hide(a);
    },
  };
};

// ——— 18. Kraken Toes ———

const kraken = (): Brain => {
  let next = 3;
  let busy = false;
  let turn = 0;
  const props: { prop: Prop; p: Pizza; wrap: Phaser.GameObjects.Image }[] = [];

  const grab = (f: Foot, a: Arena) => {
    const h = heat(a);
    const p = rnd(a.alivePizzas().filter((q) => !q.flags.grabbed));
    if (!p) return;
    busy = true;
    p.flags.grabbed = true;
    // feet clear out of its lanes: the lock moves hovering feet, and any already diving get swatted back up
    a.lockLane(p, true);
    for (const o of a.allFeet()) if (o.alive && !o.isBossLike && o.target === p && (o.state === 'descend' || o.state === 'stomp')) o.knock(700);
    const k = p.radius / 154; // drawn for a 154 px pizza
    const scale = 0.95 * k;
    // it comes up from behind the pizza on its outer side (so it never covers the next pizza) and curls over it
    const left = p.x < 960;
    const baseX = p.x + (left ? -1 : 1) * p.radius * 0.62;
    const baseY = p.y + 30; // hidden behind the plate
    say(a, p.x, p.surfaceY - 340, 'GRABBED!', '#d9a0ff', 44);
    a.sfx('sfx_kraken_tentacle');
    a.shake(200, 0.006);
    // the coil round the front of the plate, in front of the pizza (the body is behind it)
    const wrap = a.sc.add.image(p.x, p.y, 'p_tentwrap').setOrigin(230 / 470, 40 / 200).setFlipX(left).setScale(p.radius * 1.12 / 200, 0).setAlpha(0);
    a.fxLayer.add(wrap);
    a.sc.tweens.add({ targets: wrap, scaleY: p.radius * 1.12 / 200, alpha: 1, delay: 250, duration: 300, ease: 'Back.Out' });
    const release = () => {
      p.flags.grabbed = false;
      a.lockLane(p, false);
      busy = false;
      next = h.cooldown(f.phase >= 3 ? 4 : 6);
      const i = props.findIndex((o) => o.prop === prop);
      if (i >= 0) props.splice(i, 1);
    };
    // the whole tentacle is whackable (un-rotate the click into the image's frame and test its box), and so is the coil
    const inside = (x: number, y: number) => {
      const img = prop.img;
      const s = img.scaleY || scale;
      const r = -img.rotation;
      const dx = x - img.x;
      const dy = y - img.y;
      const lx = dx * Math.cos(r) - dy * Math.sin(r);
      const ly = dx * Math.sin(r) + dy * Math.cos(r);
      if (Math.abs(lx) < 150 * s && ly < 20 && ly > -800 * s) return true;
      const ex = (x - p.x) / (p.radius * 1.4);
      const ey = (y - p.y) / (p.radius * 0.95);
      return y > p.y - 20 && ex * ex + ey * ey < 1;
    };
    // a slow sway from its base, driven here so a smack's wobble can't fight it
    const t0 = a.now();
    const prop: Prop = hitProp(a, {
      key: 'p_bigtentacle',
      x: baseX,
      y: baseY,
      scale,
      under: true,
      hits: h.hits(3),
      sec: h.windup(4),
      contains: inside,
      follow: () => {
        if (prop) prop.img.setAngle(Math.sin((a.now() - t0) * 3.2) * 4);
        return { x: baseX, y: baseY };
      },
      // the counter sits on the middle of the tentacle
      badgeDy: -330,
      label: 'FREED!',
      clearSfx: 'sfx_kit_propclear',
      onHit: () => {
        // a squeeze instead of the kit's tilt: it flinches down into itself
        steady(a, prop.img, scale);
        a.sc.tweens.add({ targets: prop.img, scaleY: scale * 0.88, scaleX: scale * 1.08, duration: 80, yoyo: true, ease: 'Quad.Out' });
        a.sc.tweens.add({ targets: wrap, scaleX: wrap.scaleX * 1.04, duration: 80, yoyo: true });
      },
      onClear: () => {
        release();
        a.sfx('sfx_kraken_drag', { volume: 0.5, rate: 1.3 });
        // it lets go and sinks back down behind the table
        const ghost = a.sc.add.image(prop.img.x, prop.img.y, 'p_bigtentacle').setOrigin(0.5, 1).setScale(scale).setRotation(prop.img.rotation).setFlipX(!left);
        prop.img.setVisible(false);
        a.underLayer.add(ghost);
        a.sc.tweens.add({ targets: ghost, scaleY: 0.02, duration: 380, ease: 'Back.In', onComplete: () => ghost.destroy() });
        a.sc.tweens.add({ targets: wrap, alpha: 0, scaleY: 0, duration: 260, onComplete: () => wrap.destroy() });
      },
      onFail: () => {
        release();
        // it yanks hard: the tentacle snaps down and the coil tightens before it lets go
        const ghost = a.sc.add.image(prop.img.x, prop.img.y, 'p_bigtentacle').setOrigin(0.5, 1).setScale(scale).setRotation(prop.img.rotation).setFlipX(!left);
        prop.img.setVisible(false);
        a.underLayer.add(ghost);
        a.sc.tweens.add({ targets: ghost, scaleY: 0.02, duration: 220, ease: 'Quad.In', onComplete: () => ghost.destroy() });
        a.sc.tweens.add({ targets: wrap, scaleX: wrap.scaleX * 0.9, y: wrap.y + 30, duration: 160, yoyo: true, onComplete: () => a.sc.tweens.add({ targets: wrap, alpha: 0, duration: 200, onComplete: () => wrap.destroy() }) });
        a.shake(300, 0.012);
        if (f.alive && a.inWave() && !p.dead) {
          a.sfx('sfx_kraken_drag');
          a.hitPizza(p, h.slices(2), 'DRAGGED UNDER!', '#d9a0ff');
        }
      },
    });
    // the art leans right; mirror it on the left so the tip always curls over the pizza
    prop.img.setOrigin(0.5, 1).setFlipX(!left);
    // it rises out from behind the pizza (the kit's pop-in, but growing upwards from the base)
    a.sc.tweens.killTweensOf(prop.img);
    prop.img.setScale(scale, scale * 0.05);
    a.sc.tweens.add({ targets: prop.img, scaleY: scale, duration: 520, ease: 'Back.Out' });
    props.push({ prop, p, wrap });
  };

  const ink = (f: Foot, a: Arena) => {
    const h = heat(a);
    const p = rnd(a.alivePizzas().filter((q) => !q.perkFrozen)) ?? rnd(a.alivePizzas());
    if (!p) return;
    busy = true;
    const tx = p.x;
    const ty = p.surfaceY - 10;
    const ret = mark(a, 'p_reticle', tx, ty, h.windup(1.3) + 0.2, 0.75);
    say(a, tx, p.surfaceY - 250, 'SQUIRT!', '#d9a0ff', 48);
    a.sfx('sfx_kraken_squirt');
    // squirted from under its toes (from its middle it was lost against its own purple)
    const from = { x: f.x, y: Math.max(300, f.y - 20) };
    const blob = a.sc.add.image(from.x, from.y, 'p_inkblob').setScale(0.42);
    a.fxLayer.add(blob);
    let blocked = false;
    let landed = false;
    let dripT = 0;
    const end = () => {
      busy = false;
      next = h.cooldown(f.phase >= 3 ? 4 : 6);
      if (ret.active) {
        a.sc.tweens.killTweensOf(ret);
        a.sc.tweens.add({ targets: ret, alpha: 0, duration: 160, onComplete: () => ret.destroy() });
      }
    };
    const pos = (t: number) => ({ x: from.x + (tx - from.x) * t, y: from.y + (ty - from.y) * t - Math.sin(t * Math.PI) * 160 });
    // a slow arc down to the pizza; smack the blob on the way to block it
    const k = { t: 0 };
    a.sc.tweens.add({
      targets: k,
      t: 1,
      duration: h.windup(1.3) * 1000,
      ease: 'Sine.In',
      onUpdate: () => {
        const at = pos(k.t);
        const ahead = pos(Math.min(1, k.t + 0.02));
        blob.setPosition(at.x, at.y).setScale(0.42 + k.t * 0.2);
        // the drop's point trails behind it along the arc
        if (Math.hypot(ahead.x - at.x, ahead.y - at.y) > 0.5) blob.setRotation(Math.atan2(-(ahead.x - at.x), ahead.y - at.y));
        // a dribble of ink drops behind it
        if (a.now() >= dripT) {
          dripT = a.now() + 0.06;
          const d = a.sc.add.circle(at.x, at.y, 9 + Math.random() * 6, 0x24143e).setStrokeStyle(3, 0x2a1810);
          a.fxLayer.add(d);
          a.sc.tweens.add({ targets: d, alpha: 0, scale: 0.3, y: d.y + 30, duration: 420, onComplete: () => d.destroy() });
        }
      },
      onComplete: () => {
        if (blocked) return;
        landed = true;
        blob.destroy();
        end();
        if (!f.alive || !a.inWave() || p.dead) return;
        const sec = h.stun(6);
        a.sfx('sfx_kraken_inked');
        a.fx.puff(tx, ty, 8);
        say(a, tx, p.surfaceY - 230, 'INKED!', '#d9a0ff', 44);
        sour(a, p);
        a.freezePerk(p, sec);
        // the ink splashes onto the pizza and fades as the freeze wears off
        const s = (p.radius * 1.6) / 360;
        const splat = a.sc.add.image(tx, p.y - p.radius * 0.12, 'p_inkpizza').setScale(s * 0.5).setAlpha(0);
        a.fxLayer.add(splat);
        a.sc.tweens.add({ targets: splat, alpha: 0.94, scale: s, duration: 220, ease: 'Back.Out' });
        a.sc.tweens.add({ targets: splat, alpha: 0, delay: 220 + sec * 600, duration: sec * 400 - 220, ease: 'Quad.In', onComplete: () => splat.destroy() });
      },
    });
    a.addClickable({
      get x() {
        return blob.x;
      },
      get y() {
        return blob.y;
      },
      r: 90,
      priority: 2,
      alive: () => !blocked && !landed,
      hit: () => {
        blocked = true;
        a.sc.tweens.killTweensOf(k);
        a.fx.impact(blob.x, blob.y, true);
        a.sfx('sfx_slap_2', { volume: 0.8 });
        say(a, blob.x, blob.y - 70, 'BLOCKED!', '#7dff9a', 36);
        a.sc.tweens.add({ targets: blob, alpha: 0, scale: 0.05, duration: 200, onComplete: () => blob.destroy() });
        end();
      },
    });
  };

  return {
    names: ['SPLASH', 'TENTACLE GRAB', 'INK CLOUD'],
    info: [
      'Hurls water at the pizza below it · smack the splash before it lands',
      'A tentacle grabs a pizza to drag it under · smack the tentacle anywhere to free it',
      'Squirts ink onto a pizza, freezing its perk · smack the ink blob before it lands',
    ],
    onPhase: () => {
      if (!busy) next = 2.5;
    },
    update: (f, dt, a) => {
      if (busy || !a.inWave()) return;
      next -= dt;
      if (next > 0) return;
      const h = heat(a);
      if (f.phase === 1) {
        next = h.cooldown(3.8);
        const p = laneOf(a, f);
        if (p) drop(a, f, p, 'p_snowball', 1.6, 'SPLASH!', { scale: 0.7, tint: 0x5ab8ff, color: '#7fd0ff', landSfx: 'sfx_kraken_splash' }, () => sour(a, p));
        return;
      }
      next = 1;
      // phase 3 on: grabs and ink take turns, never both at once
      if (f.phase >= 3 && turn++ % 2 === 1) ink(f, a);
      else grab(f, a);
    },
    onDeath: (_f, a) => {
      for (const { prop, p, wrap } of props) {
        prop.destroy();
        wrap.destroy();
        p.flags.grabbed = false;
        a.lockLane(p, false);
      }
      props.length = 0;
    },
  };
};

export const brains: Record<string, () => Brain> = { doughboy, nonna, pigeonking, gargoyle, jellyfish, kraken };
