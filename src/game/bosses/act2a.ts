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
function drop(a: Arena, f: Foot, p: Pizza, key: string, sec: number, label: string, look: { scale?: number; tint?: number; color?: string; top?: number } = {}, onLand?: () => void): void {
  const tx = p.x;
  const ty = p.surfaceY - 30;
  const warn = 0.9;
  const fall = sec + 1.1;
  const top = look.top ?? 240; // below the boss bar, which sits over the top of the screen
  mark(a, 'p_reticle', tx, ty, warn + fall, 0.75);
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
  let done = false;
  const finish = () => {
    done = true;
    col.destroy();
  };
  a.sc.tweens.add({ targets: img, scale, duration: 220, ease: 'Back.Out' });
  a.sc.tweens.add({ targets: img, angle: { from: -14, to: 14 }, duration: 110, yoyo: true, repeat: Math.max(1, Math.round((warn * 1000) / 220) - 1) });
  a.sc.time.delayedCall(warn * 1000, () => {
    if (done) return;
    a.sfx('sfx_whoosh', { volume: 0.5, rate: 0.7 });
    a.sc.tweens.add({
      targets: img,
      y: ty,
      angle: 200,
      duration: fall * 1000,
      ease: 'Linear',
      onComplete: () => {
        if (done) return;
        finish();
        img.destroy();
        if (!f.alive || p.dead || !a.inWave()) return;
        a.fx.explosion(tx, ty, 110);
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
  a.quip(p.x + 90, p.surfaceY - 90, '-1 FRESH', '#9ad0ff', 30);
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
          drop(a, f, p, 'p_doughball', 1.5, 'DOUGHED!', { scale: 0.75, tint: 0xffc46a, color: '#ffd9a0', top: Math.max(90, Math.min(f.y + 80, p.surfaceY - 260)) });
        }
      }
      if (f.phase >= 2 && since > 1.5 && f.hp < f.maxHp) {
        f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.03 * dt);
        // visible: it swells and sparkles green while it heals
        puffT -= dt;
        if (puffT <= 0) {
          puffT = 0.9;
          a.fx.healBurst(f.cx, f.cy);
          a.quip(f.x, f.cy - 140, 'rising…', '#7dff9a', 30);
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
  let next = 5; // after the phase banner has been read
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
    const top = 300; // starts below the boss bar
    const bottom = Math.max(...ps.map((p) => p.surfaceY)) + 40;
    const warn = 1;
    const travel = h.windup(5);
    const st = { y: top };
    a.quip(cx, top + 120, 'ROLLING PIN!', '#ffd9a0', 56);
    a.sfx('sfx_warning', { volume: 0.6 });
    a.shake(250, 0.006);
    pin = hitProp(a, {
      key: 'p_rollpin',
      x: cx,
      y: top,
      scale,
      hits: h.hits(4),
      sec: warn + travel,
      follow: () => ({ x: cx + Math.sin(a.now() * 9) * 3, y: st.y }),
      contains: (x, y) => !!pin && Math.abs(x - pin.img.x) < 760 * scale && Math.abs(y - pin.img.y) < 110 * scale + 30,
      badgeDy: -130,
      label: 'STOPPED!',
      // each smack knocks it back up the table a little
      onHit: () => {
        st.y = Math.max(top, st.y - 35);
        a.fx.puff(cx + (Math.random() - 0.5) * 900 * scale, st.y + 60, 4);
      },
      onClear: () => {
        pin = null;
        a.sfx('sfx_crit');
        done(f, h.cooldown(9));
      },
      onFail: () => {
        pin = null;
        a.shake(400, 0.014);
        a.sfx('sfx_stomp');
        if (f.alive && a.inWave()) for (const p of a.alivePizzas()) a.hitPizza(p, h.slices(1), 'FLATTENED!', '#e0a868');
        done(f, h.cooldown(9));
      },
    });
    const speed = (bottom - top) / travel;
    let wait = warn;
    let dust = 0;
    ticker(a, (dt) => {
      if (!pin || !pin.alive()) return false;
      if (wait > 0) {
        wait -= dt;
        return;
      }
      st.y = Math.min(bottom, st.y + speed * dt);
      dust -= dt;
      if (dust <= 0) {
        dust = 0.25;
        a.fx.puff(cx + (Math.random() - 0.5) * 1300 * scale, st.y + 70 * scale, 3);
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
    a.quip(f.x, f.cy - 160, 'FLYING SLIPPERS!', '#ff9ad8', 52);
    const gap = h.windup(0.85);
    ps.forEach((p, i) => {
      a.sc.time.delayedCall(500 + i * gap * 1000, () => {
        if (!f.alive || !a.inWave() || p.dead) return;
        drop(a, f, p, 'p_bigslipper', 1.1, 'SLIPPERED!', { scale: 0.62, tint: 0xff9ad8, color: '#ff9ad8' });
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
    busy = true;
    lane = takeLane(a, f, edge);
    endRetreat = retreat(a);
    a.quip(f.x, f.cy - 170, 'PEEL SNATCH!', '#ffd23f', 56);
    a.sfx('sfx_warning', { volume: 0.6 });
    const handle = a.sc.add.graphics();
    a.fxLayer.add(handle);
    const bowl = a.sc.add.image(0, 0, 'p_spoonbowl').setScale(1.15).setVisible(false);
    a.fxLayer.add(bowl);
    const meter = a.sc.add.graphics();
    a.fxLayer.add(meter);
    const tip = a.sc.add.text(0, 0, 'PULL AWAY!', { fontFamily: 'Lilita One, Fredoka, sans-serif', fontSize: '34px', color: '#fff6e2', stroke: '#2a1810', strokeThickness: 8 }).setOrigin(0.5).setVisible(false);
    a.fxLayer.add(tip);
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
    const tidy = () => {
      over = true;
      handle.destroy();
      bowl.destroy();
      meter.destroy();
      tip.destroy();
    };
    stopSnatch = () => {
      if (!over) tidy();
    };
    const finish = (ok: boolean) => {
      if (over) return;
      const at = { x: bowl.x, y: bowl.y };
      tidy();
      stopSnatch = null;
      if (ok) {
        a.quip(at.x, at.y - 90, 'GOT IT BACK!', '#7dff9a', 46);
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
    a.addClickable({ x: 0, y: 0, r: 0, priority: 9, contains: () => true, alive: () => grabbedAt >= 0 && !over, hit: () => a.quip(a.peelPoint().x, a.peelPoint().y - 70, 'PULL AWAY!', '#ffd23f', 30) });
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
        handle.clear().lineStyle(26, 0x2a1810, 1).lineBetween(me.x, me.y, ex, ey).lineStyle(16, 0xc8884a, 1).lineBetween(me.x, me.y, ex, ey);
        bowl.setVisible(true).setPosition(ex, ey).setRotation(Math.atan2(ey - me.y, ex - me.x) + Math.PI / 2);
        return;
      }
      if (grabbedAt < 0) {
        grabbedAt = a.now();
        a.sfx('sfx_squish', { rate: 0.8 });
        a.quip(pp.x, pp.y - 120, 'GOTCHA!', '#ff8a6a', 44);
        tip.setVisible(true);
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
      // draw: spoon handle from her to the peel, bowl clamped on it, tug meter and time left above
      handle.clear().lineStyle(26, 0x2a1810, 1).lineBetween(me.x, me.y, pp.x, pp.y).lineStyle(16, 0xc8884a, 1).lineBetween(me.x, me.y, pp.x, pp.y);
      bowl.setPosition(pp.x, pp.y).setRotation(Math.atan2(pp.y - me.y, pp.x - me.x) + Math.PI / 2);
      const mx = pp.x - 110;
      const my = pp.y - 150;
      meter.clear();
      meter.fillStyle(0x2a1810, 0.92).fillRoundedRect(mx - 6, my - 6, 232, 38, 14);
      meter.fillStyle(0x4a3a30, 1).fillRoundedRect(mx, my, 220, 26, 10);
      meter.fillStyle(fill > 0.7 ? 0x7dff9a : 0xffd23f, 1).fillRoundedRect(mx, my, Math.max(8, 220 * Math.min(1, fill)), 26, 10);
      meter.fillStyle(0xff5a4a, 1).fillRect(mx, my + 34, 220 * Math.max(0, 1 - held / grabFor), 6);
      tip.setPosition(pp.x, my - 30);
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
  let gap = 1.5;
  let nagT = 0;
  return {
    names: ['BIRD BOMB', 'FLOCK CALL'],
    info: ['Drops bombs on the pizza below it · smack them as they fall', 'Shielded while his flock is out · clear every pigeon, then hit him'],
    update: (f, dt, a) => {
      nagT -= dt;
      if (f.phase === 1 && bomb.tick(dt)) {
        const p = laneOf(a, f);
        if (p) drop(a, f, p, 'p_cream', 1.5, 'SPLAT!', { scale: 0.3, color: '#ffffff' });
      }
      if (f.phase < 2) return;
      if (warded) {
        shield(a, f, true);
        flock = flock.filter((pg) => pg.alive);
        if (!flock.length) {
          warded = false;
          shield(a, f, false);
          a.setMinions(null);
          gap = heat(a).cooldown(6);
          a.quip(f.x, f.cy - 150, 'EXPOSED! HIT HIM!', '#7dff9a', 46);
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
      a.quip(f.x, f.cy - 150, `FLOCK CALL ×${flock.length}`, '#c7ccd4', 44);
      a.sfx('sfx_boing', { rate: 1.6 });
    },
    onSmacked: (f, a) => {
      if (!warded) return false;
      if (nagT <= 0) {
        nagT = 0.6;
        a.quip(f.x + 60, f.cy - 60, `CLEAR THE FLOCK · ${flock.filter((pg) => pg.alive).length} LEFT`, '#c7ccd4', 30);
      }
      return true;
    },
    onDeath: (f, a) => {
      shield(a, f, false);
      a.setMinions(null);
    },
  };
};

// ——— 16. The Gargoyle ———

/** Where the Gargoyle's statue sits (contact y): lower than its usual hover, so it is in plain view under the boss bar. */
const STONE_Y = 450;

const gargoyle = (): Brain => {
  let started = false;
  const swoop = new Every(3, 3);
  let stoneNext = 3;
  let stoneT = 0;
  let cracks = 0;
  let lane: Takeover | null = null;
  // phase 3+: it hides behind a flock of little gargoyles, can't be hurt until every one is gone,
  // then is exposed for a few seconds before calling the next (bigger at higher heats)
  let flock: Foot[] = [];
  let warded = false;
  let exposedT = 0;
  let nagT = 0;
  const flockSize = (f: Foot, a: Arena) => Math.ceil(3 * a.heatCount()) + (f.phase >= 4 ? 1 : 0);
  const endStone = (f: Foot) => {
    stoneT = 0;
    f.shielded = false;
    f.brain.wasShielded = false;
    f.tint(null);
    if (lane) f.puppet = false;
    lane?.release();
    lane = null;
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
    a.quip(f.x, f.cy - 150, `GARGOYLE STORM ×${flock.length}`, '#c7ccd4', 44);
    a.sfx('sfx_boing', { rate: 0.8 });
  };
  return {
    names: ['SWOOP', 'STONE FORM', 'GARGOYLE STORM'],
    info: [
      'Swoops between pizzas while it hovers · strike when it settles over one',
      'Sits in the middle lane as a statue: smacks do no damage · crack it 6 times to break it and stun it',
      "Hides behind a flock of little gargoyles and can't be hurt · clear the flock, then hit it while it's exposed",
    ],
    onPhase: (f, phase, a) => {
      if (phase < 3) return;
      // leaving stone form behind
      endStone(f);
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
          a.sfx('sfx_whoosh', { rate: 0.7 });
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
          endStone(f);
          stoneNext = heat(a).cooldown(7);
        }
      } else if (f.phase === 2 && a.inWave()) {
        stoneNext -= dt;
        if (stoneNext <= 0) {
          // a statue in the middle lane: it rises to the top of it and holds still
          lane = takeLane(a, f, middlePizza(a));
          if (!lane) {
            stoneNext = 1;
            return;
          }
          f.puppet = true;
          f.setState('hover');
          stoneT = 5;
          cracks = 0;
          f.shielded = true;
          f.brain.wasShielded = true;
          f.tint(0x8a8a8a);
          a.quip(f.x, f.cy - 150, 'STONE FORM!', '#c7ccd4', 44);
          a.sfx('sfx_shield', { rate: 0.6 });
        }
      }
      if (f.phase >= 3) {
        if (warded) {
          shield(a, f, true); // keep the ward through the transform beat
          flock = flock.filter((g) => g.alive);
          if (!flock.length) {
            warded = false;
            shield(a, f, false);
            exposedT = f.phase >= 4 ? 4 : 5;
            a.quip(f.x, f.cy - 150, 'EXPOSED! HIT IT!', '#7dff9a', 46);
            a.sfx('sfx_crit');
          }
        } else if (exposedT > 0) {
          exposedT -= dt;
        } else if (a.inWave()) callFlock(f, a);
      }
    },
    onSmacked: (f, a) => {
      if (warded) {
        if (nagT <= 0) {
          nagT = 0.6;
          a.quip(f.x + 60, f.cy - 60, `CLEAR THE GARGOYLES · ${flock.filter((g) => g.alive).length} LEFT`, '#c7ccd4', 30);
        }
        return true;
      }
      if (stoneT <= 0) return false;
      cracks++;
      a.quip(f.x + 60, f.cy - 60, `CRACK ${cracks}/6`, '#c7ccd4', 30);
      a.fx.puff(f.cx + (Math.random() - 0.5) * 80, f.cy, 4);
      if (cracks >= 6) {
        endStone(f);
        stoneNext = heat(a).cooldown(7);
        f.stun(1.5);
        a.quip(f.x, f.cy - 150, 'STONE BROKEN!', '#7dff9a', 46);
        a.sfx('sfx_crit');
      }
      return true;
    },
    onDeath: (f, a) => {
      endStone(f);
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
  let halo: { g: Phaser.GameObjects.Graphics; bang: Phaser.GameObjects.Text } | null = null;
  const still = (f: Foot) => f.phase === 1;
  const hide = (a: Arena) => {
    if (!halo) return;
    a.sc.tweens.killTweensOf(halo.bang);
    halo.g.destroy();
    halo.bang.destroy();
    halo = null;
  };
  const show = (a: Arena) => {
    if (halo) return;
    const g = a.sc.add.graphics();
    const bang = a.sc.add.text(0, 0, '!', { fontFamily: 'Lilita One, Fredoka, sans-serif', fontSize: '96px', color: '#ff5ad0', stroke: '#2a1810', strokeThickness: 12 }).setOrigin(0.5);
    a.fxLayer.add([g, bang]);
    a.sc.tweens.add({ targets: bang, scale: { from: 0.85, to: 1.2 }, duration: 260, yoyo: true, repeat: -1 });
    halo = { g, bang };
  };
  const draw = (f: Foot, a: Arena) => {
    if (!halo) return;
    const r = f.meta.halfWidth * f.scale * 0.9;
    const now = a.now();
    const pulse = 0.5 + 0.5 * Math.sin(now * 14);
    const g = halo.g.clear();
    const live = mode === 'glow';
    g.fillStyle(0xff5ad0, live ? 0.18 + pulse * 0.16 : 0.08 + pulse * 0.08).fillCircle(f.cx, f.cy, r);
    g.lineStyle(live ? 8 : 4, 0xffb0ee, live ? 0.95 : 0.6).strokeCircle(f.cx, f.cy, r * (0.96 + pulse * 0.06));
    if (live) {
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
    // under the sole, where the peel is aiming (above the foot is off the top of the screen)
    halo.bang.setPosition(f.cx, f.y + 150).setAlpha(live ? 1 : 0.4 + pulse * 0.6);
  };
  return {
    names: ['GLOW', 'BRIGHT GLOW'],
    info: ['Stops and glows pink before it stings your peel · never hit it while it glows, strike when it dims', 'Keeps moving while it glows · wait for the dim, then strike'],
    update: (f, dt, a) => {
      t -= dt;
      if (mode === 'dim' && t <= 0 && (!still(f) || f.state === 'hover')) {
        mode = still(f) ? 'charge' : 'glow';
        t = still(f) ? 0.7 : 2.5;
        if (still(f)) f.puppet = true;
        show(a);
        a.sfx('sfx_zap', { volume: 0.4, rate: 1.6 });
      } else if (mode === 'charge' && t <= 0) {
        mode = 'glow';
        t = 2;
      } else if (mode === 'glow' && t <= 0) {
        mode = 'dim';
        t = f.phase >= 2 ? 1.5 : 2;
        if (f.puppet && !Number(f.brain.transformT ?? 0)) f.puppet = false;
        hide(a);
      }
      f.brain.glowing = mode === 'glow';
      f.tint(mode === 'glow' ? 0xff5ad0 : mode === 'charge' ? (Math.sin(a.now() * 30) > 0 ? 0xffb0ee : null) : null);
      draw(f, a);
    },
    onPhase: (f, _p, a) => {
      // Bright Glow doesn't hold still: drop any hold from phase 1 (a held foot skipped the transform beat)
      if (mode !== 'dim' && !Number(f.brain.transformT ?? 0)) f.puppet = false;
      mode = 'dim';
      t = 1;
      f.tint(null);
      hide(a);
    },
    onSmacked: (f, a) => {
      if (!f.brain.glowing) return false;
      a.stunPeel(0.6, 'STUNG! Hit it when it dims');
      a.fx.lightning(f.cx, f.cy, a.peelPoint().x, a.peelPoint().y);
      a.sfx('sfx_zap');
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
  const props: { prop: Prop; p: Pizza }[] = [];

  const grab = (f: Foot, a: Arena) => {
    const h = heat(a);
    const p = rnd(a.alivePizzas().filter((q) => !q.flags.grabbed));
    if (!p) return;
    busy = true;
    p.flags.grabbed = true;
    // feet clear out of its lanes: the lock moves hovering feet, and any already diving get swatted back up
    a.lockLane(p, true);
    for (const o of a.allFeet()) if (o.alive && !o.isBossLike && o.target === p && (o.state === 'descend' || o.state === 'stomp')) o.knock(700);
    const scale = 0.95;
    const baseX = p.x + p.radius * 0.75;
    const baseY = p.y + 150;
    const st = { y: baseY + 700 };
    a.sc.tweens.add({ targets: st, y: baseY, duration: 550, ease: 'Back.Out' });
    a.quip(p.x, p.surfaceY - 150, 'GRABBED!', '#b46ad8', 44);
    a.sfx('sfx_squish', { rate: 0.6 });
    a.shake(200, 0.006);
    const release = () => {
      p.flags.grabbed = false;
      a.lockLane(p, false);
      busy = false;
      next = h.cooldown(f.phase >= 3 ? 4 : 6);
      const i = props.findIndex((o) => o.prop === prop);
      if (i >= 0) props.splice(i, 1);
    };
    // the whole visible tentacle is whackable: un-rotate the click into the image's frame and test its box
    const inside = (x: number, y: number) => {
      const img = prop.img;
      const s = img.scale || scale;
      const r = -img.rotation;
      const dx = x - img.x;
      const dy = y - img.y;
      const lx = dx * Math.cos(r) - dy * Math.sin(r);
      const ly = dx * Math.sin(r) + dy * Math.cos(r);
      return Math.abs(lx) < 140 * s && ly < 20 && ly > -700 * s;
    };
    const prop: Prop = hitProp(a, {
      key: 'p_bigtentacle',
      x: baseX,
      y: st.y,
      scale,
      hits: h.hits(3),
      sec: h.windup(4),
      contains: inside,
      follow: () => ({ x: baseX, y: st.y }),
      badgeDy: -420,
      label: 'FREED!',
      onClear: () => {
        release();
        // it slides back under the table
        const ghost = a.sc.add.image(prop.img.x, prop.img.y, 'p_bigtentacle').setOrigin(0.5, 1).setScale(scale).setRotation(prop.img.rotation);
        a.fxLayer.add(ghost);
        a.sc.tweens.add({ targets: ghost, y: ghost.y + 750, duration: 420, ease: 'Quad.In', onComplete: () => ghost.destroy() });
      },
      onFail: () => {
        release();
        if (f.alive && a.inWave() && !p.dead) a.hitPizza(p, h.slices(2), 'DRAGGED UNDER!', '#b46ad8');
      },
    });
    prop.img.setOrigin(0.5, 1);
    // a gentle sway from its base
    a.sc.tweens.add({ targets: prop.img, angle: { from: -5, to: 5 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    props.push({ prop, p });
  };

  const ink = (f: Foot, a: Arena) => {
    const h = heat(a);
    const p = rnd(a.alivePizzas().filter((q) => !q.perkFrozen)) ?? rnd(a.alivePizzas());
    if (!p) return;
    busy = true;
    const tx = p.x;
    const ty = p.surfaceY - 10;
    mark(a, 'p_reticle', tx, ty, 1.9, 0.75);
    a.quip(tx, p.surfaceY - 190, 'SQUIRT!', '#d9a0ff', 48);
    a.sfx('sfx_squish', { rate: 0.5 });
    const blob = a.sc.add.image(f.cx, f.cy, 'p_ink').setScale(0.2);
    a.fxLayer.add(blob);
    let blocked = false;
    let landed = false;
    const end = () => {
      busy = false;
      next = h.cooldown(f.phase >= 3 ? 4 : 6);
    };
    // a slow arc down to the pizza; smack the blob on the way to block it
    const from = { x: f.cx, y: f.cy };
    const k = { t: 0 };
    a.sc.tweens.add({
      targets: k,
      t: 1,
      duration: h.windup(1.3) * 1000,
      ease: 'Sine.In',
      onUpdate: () => {
        blob.setPosition(from.x + (tx - from.x) * k.t, from.y + (ty - from.y) * k.t - Math.sin(k.t * Math.PI) * 140);
        blob.setScale(0.2 + k.t * 0.12);
        blob.rotation += 0.12;
      },
      onComplete: () => {
        if (blocked) return;
        landed = true;
        blob.destroy();
        end();
        if (!f.alive || !a.inWave() || p.dead) return;
        const sec = h.stun(6);
        a.sfx('sfx_squish', { rate: 0.7 });
        a.fx.puff(tx, ty, 8);
        a.quip(tx, p.surfaceY - 160, 'INKED!', '#b46ad8', 44);
        sour(a, p);
        a.freezePerk(p, sec);
        // the ink sits on the pizza and fades as the freeze wears off
        const splat = a.sc.add.image(tx, p.y - p.radius * 0.15, 'p_inkpizza').setScale((p.radius * 1.5) / 300).setAlpha(0);
        a.fxLayer.add(splat);
        a.sc.tweens.add({ targets: splat, alpha: 0.88, duration: 160 });
        a.sc.tweens.add({ targets: splat, alpha: 0, delay: 160, duration: sec * 1000 - 160, ease: 'Quad.In', onComplete: () => splat.destroy() });
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
        a.quip(blob.x, blob.y - 70, 'BLOCKED!', '#7dff9a', 36);
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
        if (p) drop(a, f, p, 'p_snowball', 1.6, 'SPLASH!', { scale: 0.7, tint: 0x5ab8ff, color: '#7fd0ff' }, () => sour(a, p));
        return;
      }
      next = 1;
      // phase 3 on: grabs and ink take turns, never both at once
      if (f.phase >= 3 && turn++ % 2 === 1) ink(f, a);
      else grab(f, a);
    },
    onDeath: (_f, a) => {
      for (const { prop, p } of props) {
        prop.destroy();
        p.flags.grabbed = false;
        a.lockLane(p, false);
      }
      props.length = 0;
    },
  };
};

export const brains: Record<string, () => Brain> = { doughboy, nonna, pigeonking, gargoyle, jellyfish, kraken };
