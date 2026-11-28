// Boss brains, Act 8 · Norse (stages 15–16, waves 71–80): Fenrir's Paw (mini), Thrym the Frost King,
// Jörmungandr (mini) and Surtr. Shared helpers and the heat scaling live in ./kit.ts (laneFall and Bin
// come from ./act2b.ts); this act's props are drawn in src/content/props/act8.ts, except Jörmungandr's body, which
// is painted in src/content/art/jormungandr.ts and rigged in ./jormRig.ts.
// The two mini-bosses take the stage over: their arena backdrop and music crossfade in when they
// arrive and the location comes back when they go down.

import { clockOf } from '../../core/clock';
import Phaser from 'phaser';
import { BACKDROPS, type ArenaId, type BackdropId } from '../../art/backdrops';
import { HOVER_Y } from '../../config';
import { audio } from '../../systems/audio';
import type { Arena } from '../arena';
import type { Foot } from '../Foot';
import type { Pizza } from '../Pizza';
import { LOCATION_MUSIC, bossMusic, locationFor } from '../Run';
import { Bin, laneFall } from './act2b';
import { COIL, KELP, NECK_AT_HEAD, SK, SOCKET, WRAP, drawNeckAlong, paintCoil, paintHeadStill, paintKelpAt, paintWrap } from '../../content/art/jormungandr';
import { HEAD_TILT, SerpentRig, aimTilt, mouthOffset } from './jormRig';
import { type Brain, type PhaseCard, type Prop, Every, heat, hitProp, mark, rnd, shield, takeLane, throwAtPeel } from './kit';
import { crand } from '../../systems/cosmeticRandom';

// ——— Act helpers ———

/** Scene internals a few set-pieces reach for (the Arena has no call for them). */
interface SceneBits {
  backdrop: { show(id: BackdropId, fadeMs?: number): void };
  tintGrade(hex: string, ms: number): void;
  currentBackdrop: BackdropId | null;
  run: { wave: number; super: number };
  ability: { trigger: { t: string } } | null;
  /** the one-time "PEEL SLAM READY!" toast has been shown */
  slamHinted: boolean;
}
const bits = (a: Arena) => a as unknown as SceneBits;

/** A mini-boss takes the stage: its arena and music crossfade in over the location. */
function enterArena(a: Arena, id: ArenaId): void {
  const sc = bits(a);
  if (!sc.backdrop || !BACKDROPS[id]) return;
  sc.backdrop.show(id, 1400);
  sc.tintGrade(BACKDROPS[id].light, 1400);
  sc.currentBackdrop = id;
  void audio.music(a.sc, bossMusic(id), 1200);
}

/** …and gives it back when it goes down. */
function leaveArena(a: Arena): void {
  const sc = bits(a);
  if (!a.inWave() || !sc.backdrop) return;
  const loc = locationFor(sc.run.wave);
  sc.backdrop.show(loc, 1800);
  sc.tintGrade(BACKDROPS[loc].light, 1800);
  sc.currentBackdrop = loc;
  void audio.music(a.sc, LOCATION_MUSIC[loc], 1800);
}

/** Pieces fly off and tumble (a death that lands): ice shards, embers, scales. */
function shatter(a: Arena, x: number, y: number, key: string, n: number, look: { scale?: number; tint?: number; spread?: number } = {}): void {
  for (let i = 0; i < n; i++) {
    const img = a.sc.add.image(x, y, key).setScale((look.scale ?? 0.45) * (0.5 + crand() * 0.7)).setAngle(crand() * 360);
    if (look.tint !== undefined) img.setTint(look.tint);
    a.fxLayer.add(img);
    const vx = (crand() - 0.5) * (look.spread ?? 1300);
    const vy = -300 - crand() * 700;
    const spin = (crand() - 0.5) * 900;
    const st = { t: 0 };
    a.sc.tweens.add({
      targets: st,
      t: 1.5,
      duration: 1500,
      onUpdate: () => {
        img.setPosition(x + vx * st.t, y + vy * st.t + 900 * st.t * st.t);
        img.angle += spin * 0.016;
        img.setAlpha(Math.min(1, (1.5 - st.t) * 2));
      },
      onComplete: () => img.destroy(),
    });
  }
}

/** Gentle follow towards a point (bosses moved by hand). */
function glide(f: Foot, x: number, y: number, dt: number, k = 3): void {
  f.x += (x - f.x) * Math.min(1, dt * k);
  f.y += (y - f.y) * Math.min(1, dt * k);
}

const lanePizzas = (a: Arena) => [...a.alivePizzas()].sort((p, q) => p.x - q.x);

/** Y of the boss's ankle (where a chain or shackle sits). */
const ankleOf = (f: Foot) => f.y - f.meta.footHeight * f.scale;

/** Hit a pizza, but on Mild never take its last slice (a fallback that keeps a big miss from ending the run). */
function hitSoft(a: Arena, p: Pizza, n: number, label: string, color: string, spareLast: boolean): void {
  if (p.dead) return;
  const take = spareLast ? Math.min(n, p.slices - 1) : n;
  if (take <= 0) {
    a.quip(p.x, p.surfaceY - 150, 'HANGING ON!', '#ffd23f', 34);
    return;
  }
  a.hitPizza(p, take, label, color);
}

// ——— 29. FENRIR'S PAW (mini-boss) ———

const CHAIN_W = 72;

const fenrir = (): Brain => {
  const bin = new Bin();
  let ready = false;
  let strain = 0;
  let breaks = 0;
  let loose = false;
  let chain: Phaser.GameObjects.TileSprite | null = null;
  let shackle: Phaser.GameObjects.Image | null = null;
  let pips: Phaser.GameObjects.Graphics | null = null;
  let anchorX = 0;
  let links: Prop[] = [];
  let vulnT = 0;
  // the race while it's loose: crouch over a pizza, pounce, spring to the next
  let race: { p: Pizza; t: number; stage: 'move' | 'crouch' | 'pounce' | 'rest'; hits: number; mark?: Phaser.GameObjects.Image } | null = null;

  const perBreak = (a: Arena, f: Foot) => Math.max(3, [5, 4, 4, 3, 3][heat(a).rank] - (f.phase >= 2 ? 1 : 0));

  const setup = (f: Foot, a: Arena) => {
    ready = true;
    enterArena(a, 'fenrir');
    anchorX = f.x < 960 ? Math.min(1880, f.x + 560) : Math.max(40, f.x - 560);
    chain = a.sc.add.tileSprite(f.x, ankleOf(f), CHAIN_W, 400, 'p_gleipnir').setOrigin(0.5, 1).setScale(0.85);
    shackle = a.sc.add.image(f.x, ankleOf(f), 'p_shackle').setScale(0.75);
    pips = a.sc.add.graphics();
    a.fxLayer.addAt([chain, shackle, pips], 0);
    a.quip(960, 300, 'THE WOLF IS BOUND… FOR NOW', '#d8d0f0', 40);
    a.sfx('sfx_fenrir_howl');
    a.shake(500, 0.006);
    a.flash(300, 200, 200, 255);
    bin.add(() => {
      for (const o of [chain, shackle, pips]) o?.destroy();
      chain = shackle = null;
      pips = null;
    });
  };

  const drawChain = (f: Foot, a: Arena) => {
    if (!chain || !shackle || !pips) return;
    const ax = f.x;
    const ay = ankleOf(f) + 20;
    shackle.setPosition(ax, ay).setVisible(!loose);
    const dx = anchorX - ax;
    const dy = -60 - ay;
    const len = Math.hypot(dx, dy);
    chain.setVisible(!loose).setPosition(ax, ay).setRotation(Math.atan2(dy, dx) + Math.PI / 2);
    chain.setSize(CHAIN_W, len / chain.scaleY);
    // strain shows as red heat creeping into the chain, and it shivers near breaking
    const k = strain / perBreak(a, f);
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(new Phaser.Display.Color(255, 255, 255), new Phaser.Display.Color(255, 80, 60), 100, k * 100);
    chain.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
    chain.x += k > 0.6 ? (crand() - 0.5) * 6 * k : 0;
    // three pips by the shackle: the chain's breaks so far
    pips.clear();
    if (loose) return;
    for (let i = 0; i < 3; i++) {
      const px = ax - 50 + i * 50;
      const py = ay + 62;
      pips.fillStyle(0x2a1810, 0.9).fillCircle(px, py, 17);
      pips.fillStyle(i < breaks ? 0xff5a3c : 0xd8d0f0, 1).fillCircle(px, py, 12);
    }
  };

  const goLoose = (f: Foot, a: Arena) => {
    loose = true;
    strain = 0;
    const h = heat(a);
    a.banner('FENRIR IS LOOSE!', 'Smack the fallen links to bind it again', 'phase');
    a.sfx('sfx_fenrir_snap');
    a.sfx('sfx_fenrir_howl');
    a.shake(600, 0.01);
    a.flash(240, 255, 120, 90);
    shatter(a, f.x, ankleOf(f), 'p_chainlink', 6, { scale: 0.35 });
    f.puppet = true;
    f.setState('hover');
    // the links fall onto the table in front of the pizzas
    const n = [2, 3, 3, 4, 4][h.rank];
    const xs = Array.from({ length: n }, (_, i) => 330 + ((1620 - 330) * (i + 0.5)) / n + (Math.random() - 0.5) * 80);
    links = xs.map((x, i) => {
      const fall = { y: -120 };
      const restY = 1000 + (i % 2) * 18;
      a.sc.tweens.add({ targets: fall, y: restY, duration: 650, delay: 120 * i, ease: 'Bounce.Out' });
      const prop = hitProp(a, {
        key: 'p_chainlink',
        x,
        y: -120,
        scale: 0.8,
        hits: h.hits(1),
        r: 95,
        follow: () => ({ x, y: fall.y }),
        badgeDy: -70,
        label: 'LINKED!',
        hitSfx: 'sfx_fenrir_link',
        clearSfx: 'sfx_fenrir_link',
        onClear: () => {
          if (links.every((l) => !l.alive())) rebind(f, a);
        },
      });
      bin.add(() => prop.destroy());
      return prop;
    });
    race = null;
  };

  const rebind = (f: Foot, a: Arena) => {
    if (!loose || !f.alive) return;
    loose = false;
    breaks = 0;
    strain = 0;
    links = [];
    race?.mark?.destroy();
    race = null;
    const h = heat(a);
    a.sfx('sfx_fenrir_bind');
    a.banner('BOUND AGAIN!', 'It’s stunned: hit it now', 'clear');
    a.fx.ring(f.cx, f.cy, 0xd8d0f0, 2, 0.6);
    a.flash(200, 220, 210, 255);
    f.puppet = false;
    f.vy = -200;
    f.setState('lift');
    f.stun(h.stun(3) + 0.6);
    f.vuln = 1.5;
    vulnT = 4;
  };

  const pickNext = (a: Arena, from: Pizza | null): Pizza | null => {
    const ps = a.alivePizzas().filter((p) => p !== from);
    return rnd(ps.length ? ps : a.alivePizzas()) ?? null;
  };

  return {
    names: ['GLEIPNIR', 'THE WOLF RUNS', 'RAGNARÖK HOWL'],
    info: [
      'Every smack strains the chain; at 3 breaks it gets loose and pounces lane to lane · smack the fallen links to bind it, then hit it while stunned',
      'Breaks free sooner, races faster and its claws freeze the perk it pounces on · bind it fast',
      'More links fall, each needs more hits · keep the links in sight',
    ],
    cards: [
      {
        what: 'Each smack strains Gleipnir; at 3 breaks the wolf runs loose',
        hit: 'Smack the fallen links to bind it, then hit it while stunned',
        miss: 'Loose, it pounces lane to lane, a slice off each pizza',
        show: [
          { key: 'p_chainlink', label: 'Fallen link', hits: (h) => h.hits(1) },
          { key: '@boss', label: 'Then the wolf' },
        ],
      },
      {
        what: 'It breaks free sooner and races faster',
        hit: 'Bind it fast: smack every fallen link',
        miss: 'Its claws freeze the perk of each pizza it pounces on',
        show: [
          { key: 'p_chainlink', label: 'Fallen link', hits: (h) => h.hits(1) },
          { key: '@boss', label: 'Then the wolf' },
        ],
      },
      {
        what: 'The Ragnarök howl: it breaks loose and pounces hard',
        hit: 'Keep the links in sight and bind it again',
        miss: 'Each pounce takes a slice and freezes that pizza’s perk',
        show: [
          { key: 'p_chainlink', label: 'Fallen link', hits: (h) => h.hits(1) },
          { key: '@boss', label: 'Then the wolf' },
        ],
      },
    ],
    upkeep: (f, dt, a) => {
      if (!ready) setup(f, a);
      drawChain(f, a);
      if (vulnT > 0) {
        vulnT -= dt;
        if (vulnT <= 0) f.vuln = 1;
      }
      if (race?.mark) race.mark.setPosition(race.p.x, race.p.surfaceY - 30);
    },
    update: (f, dt, a) => {
      if (!loose) return;
      const h = heat(a);
      if (f.stunT > 0) return;
      if (!race) {
        const p = pickNext(a, null);
        if (!p) return;
        race = { p, t: 0, stage: 'move', hits: 0 };
      }
      const r = race;
      if (r.p.dead) {
        r.mark?.destroy();
        race = null;
        return;
      }
      r.t += dt;
      const hoverY = HOVER_Y - 30;
      if (r.stage === 'move') {
        // a fast lope over to the next pizza
        glide(f, r.p.x, hoverY, dt, 7);
        if (Math.abs(f.x - r.p.x) < 24 || r.t > 0.9) {
          r.stage = 'crouch';
          r.t = 0;
          r.mark = mark(a, 'p_reticle', r.p.x, r.p.surfaceY - 30, 3, 0.7);
          a.quip(r.p.x, Math.max(280, f.cy - 150), 'POUNCE…', '#d8d0f0', 34);
          a.sfx('sfx_fenrir_claw', { volume: 0.5, rate: 0.8 });
          a.sc.tweens.add({ targets: f.root, scaleY: f.root.scaleY * 0.86, duration: 220, yoyo: true });
        }
      } else if (r.stage === 'crouch') {
        glide(f, r.p.x, hoverY - 20, dt, 6);
        if (r.t > h.windup(f.phase >= 2 ? 0.8 : 1.05)) {
          r.stage = 'pounce';
          r.t = 0;
          r.mark?.destroy();
          r.mark = undefined;
        }
      } else if (r.stage === 'pounce') {
        f.x = r.p.x;
        f.y = hoverY + (r.p.surfaceY + 4 - hoverY) * Math.min(1, r.t / 0.16);
        if (r.t >= 0.16) {
          r.stage = 'rest';
          r.t = 0;
          if (!r.p.dead && a.inWave()) {
            a.hitPizza(r.p, 1, 'POUNCED!', '#d8d0f0');
            a.sfx('sfx_fenrir_pounce');
            a.shake(240, 0.008);
            a.fx.puff(r.p.x, r.p.surfaceY, 10);
            if (f.phase >= 2 && !r.p.dead) {
              a.freezePerk(r.p, h.stun(4));
              a.sfx('sfx_fenrir_claw');
            }
          }
        }
      } else {
        glide(f, f.x, hoverY, dt, 5);
        if (r.t > h.cooldown(f.phase >= 2 ? 0.9 : 1.3)) {
          const next = pickNext(a, r.p);
          race = next ? { p: next, t: 0, stage: 'move', hits: 0 } : null;
        }
      }
    },
    onSmacked: (f, a) => {
      // loose: two smacks during the crouch knock the pounce off
      if (loose) {
        if (race?.stage === 'crouch') {
          race.hits++;
          if (race.hits >= 2) {
            race.mark?.destroy();
            race.mark = undefined;
            race.stage = 'rest';
            race.t = 0;
            f.stun(0.8);
            a.quip(f.x, Math.max(280, f.cy - 140), 'KNOCKED OFF!', '#7dff9a', 38);
          }
        }
        return false;
      }
      strain++;
      a.sfx('sfx_fenrir_strain', { throttle: 90 });
      if (strain >= perBreak(a, f)) {
        strain = 0;
        breaks++;
        a.sfx('sfx_fenrir_snap');
        a.quip(f.x, Math.max(280, f.cy - 170), `GLEIPNIR STRAINS! ${breaks}/3`, '#ff8a6a', 40);
        a.shake(200, 0.006);
        if (chain) shatter(a, chain.x, ankleOf(f) - 80, 'p_chainlink', 2, { scale: 0.3 });
        if (breaks >= 3) goLoose(f, a);
      }
      return false;
    },
    onDeath: (f, a) => {
      race?.mark?.destroy();
      race = null;
      bin.flush();
      if (!a.inWave()) return;
      a.dramatic(1);
      a.sfx('sfx_fenrir_death');
      shatter(a, f.cx, f.cy, 'p_chainlink', 8, { scale: 0.4 });
      a.fx.ring(f.cx, f.cy, 0xd8d0f0, 2.4, 0.6);
      leaveArena(a);
    },
  };
};

// ——— 30. THRYM THE FROST KING (boss) ———

/** A pizza frozen solid: no perk, no healing, until the ice thaws or is smacked off. */
interface Ice {
  p: Pizza;
  t: number;
  prop: Prop;
  heal: Pizza['heal'];
}

const thrym = (): Brain => {
  const bin = new Bin();
  let ready = false;
  const ices = new Map<Pizza, Ice>();
  // the fortress: wall slots from the table's outer edges in towards the middle
  let slots: { x: number; side: -1 | 1; block: Prop | null; crack?: Phaser.GameObjects.Image }[] = [];
  const build = new Every(3, 3);
  const hail = new Every(4.5, 2);
  const spread = new Every(7, 5);
  let pause = 0;
  let sealed: { key: Prop; healT: number } | null = null;
  let vulnT = 0;

  const melt = (a: Arena, p: Pizza, quiet = false) => {
    const ice = ices.get(p);
    if (!ice) return;
    ices.delete(p);
    ice.prop.destroy();
    // give healing back (the instance override goes; the prototype's heal shows through)
    delete (p as unknown as { heal?: unknown }).heal;
    if (p.perkFrozenT > 0) p.perkFrozenT = 0.01;
    if (!quiet && !p.dead) {
      a.quip(p.x, p.surfaceY - 170, 'THAWED!', '#bfe8ff', 40);
      a.sfx('sfx_thrym_thaw');
      shatter(a, p.x, p.surfaceY, 'p_hail', 6, { scale: 0.3 });
    }
  };

  const freezeSolid = (a: Arena, p: Pizza, sec: number) => {
    if (p.dead) return;
    const old = ices.get(p);
    if (old) {
      old.t = Math.max(old.t, sec);
      return;
    }
    const h = heat(a);
    a.freezePerk(p, Math.min(15, sec));
    const heal = p.heal;
    // frozen solid: it can't be healed while the ice holds
    (p as unknown as { heal: Pizza['heal'] }).heal = () => 0;
    const prop = hitProp(a, {
      key: 'p_icecase',
      x: p.x,
      y: p.surfaceY + 6,
      scale: (p.radius * 2.3) / 420,
      // 2 smacks (was 3): with blocks, hail and spreading ice all wanting smacks the fight ran 4–6 minutes
      hits: h.hits(2),
      follow: () => ({ x: p.x, y: p.surfaceY + 6 }),
      // only the front of the pizza: feet stomping on top of it still take the smack
      contains: (px, py) => Math.abs(px - p.x) < p.radius * 1.05 && py > p.surfaceY - 8 && py < p.surfaceY + p.radius * 0.75,
      badgeDy: 70,
      hitSfx: 'sfx_thrym_crack',
      clearSfx: 'sfx_thrym_thaw',
      onClear: () => melt(a, p),
    });
    prop.img.setAlpha(0.92);
    ices.set(p, { p, t: sec, prop, heal });
    a.quip(p.x, p.surfaceY - 190, 'FROZEN SOLID!', '#bfe8ff', 42);
    a.sfx('sfx_thrym_freeze');
    a.fx.frost(p.x, p.surfaceY - 20);
  };

  const layoutSlots = (a: Arena) => {
    const n = heat(a).rank === 0 ? 3 : 4;
    const L = 250;
    const R = 1670;
    const inner = 150;
    slots = [];
    for (let i = 0; i < n; i++) {
      const k = i / n;
      slots.push({ x: L + (960 - inner - L) * k + 20, side: -1, block: null });
      slots.push({ x: R - (R - 960 - inner) * k - 20, side: 1, block: null });
    }
  };

  const filled = (side: -1 | 1) => slots.filter((s) => s.side === side && s.block?.alive()).length;

  const BLOCK_Y = 1000;

  const addBlock = (f: Foot, a: Arena, side: -1 | 1) => {
    const slot = slots.find((s) => s.side === side && !s.block?.alive());
    if (!slot) return;
    const h = heat(a);
    // frost runs along the table edge to the slot, then the block grows
    const streak = a.sc.add.graphics();
    a.fxLayer.add(streak);
    const from = side < 0 ? 60 : 1860;
    const st = { k: 0 };
    a.sc.tweens.add({
      targets: st,
      k: 1,
      duration: 450,
      onUpdate: () => {
        streak.clear();
        const x = from + (slot.x - from) * st.k;
        streak.lineStyle(14, 0x2a1810, 0.35).lineBetween(from, BLOCK_Y + 50, x, BLOCK_Y + 50);
        streak.lineStyle(8, 0xbfe8ff, 0.9).lineBetween(from, BLOCK_Y + 50, x, BLOCK_Y + 50);
      },
      onComplete: () => a.sc.tweens.add({ targets: streak, alpha: 0, duration: 300, onComplete: () => streak.destroy() }),
    });
    a.sc.time.delayedCall(450, () => {
      if (!f.alive || !a.inWave() || sealed) return;
      const block = hitProp(a, {
        key: 'p_iceblock',
        x: slot.x,
        y: BLOCK_Y,
        scale: 0.82,
        hits: h.hits(2),
        r: 80,
        badgeDy: -66,
        label: 'SMASHED!',
        hitSfx: 'sfx_thrym_crack',
        clearSfx: 'sfx_thrym_shatter',
        onHit: () => {
          if (!slot.crack) {
            slot.crack = a.sc.add.image(slot.x, BLOCK_Y, 'p_icecrack').setScale(0.82);
            a.fxLayer.add(slot.crack);
          }
        },
        onClear: () => {
          slot.crack?.destroy();
          slot.crack = undefined;
          shatter(a, slot.x, BLOCK_Y, 'p_hail', 5, { scale: 0.28 });
        },
      });
      slot.block = block;
      a.sfx('sfx_thrym_block', { throttle: 120 });
      a.fx.frost(slot.x, BLOCK_Y - 30);
      bin.add(() => {
        block.destroy();
        slot.crack?.destroy();
        slot.crack = undefined;
      });
      // both walls reach the middle: the fortress is sealed
      if (slots.every((s) => s.block?.alive())) seal(f, a);
    });
  };

  const seal = (f: Foot, a: Arena) => {
    if (sealed) return;
    const h = heat(a);
    a.banner('THE FORTRESS IS SEALED!', 'Smash the keystone to break it', 'phase');
    a.sfx('sfx_thrym_close');
    a.shake(700, 0.012);
    a.flash(300, 190, 230, 255);
    // the blocks lock into a wall (no longer smackable one by one)
    for (const s of slots) {
      const img = s.block?.img;
      if (img && s.block) {
        const x = img.x;
        s.block.destroy();
        const wall = a.sc.add.image(x, BLOCK_Y, 'p_iceblock').setScale(0.82);
        a.fxLayer.add(wall);
        s.block = null;
        bin.add(() => wall.destroy());
        s.crack?.destroy();
        s.crack = (wall as unknown) as Phaser.GameObjects.Image;
      }
    }
    for (const p of a.alivePizzas()) freezeSolid(a, p, 30);
    shield(a, f, true);
    const key = hitProp(a, {
      key: 'p_keystone',
      x: 960,
      y: 960,
      scale: 0.72,
      hits: h.hits(6),
      r: 110,
      badgeDy: -120,
      label: 'FORTRESS BROKEN!',
      hitSfx: 'sfx_thrym_keystone',
      clearSfx: 'sfx_thrym_shatter',
      onClear: () => unseal(f, a, true),
    });
    sealed = { key, healT: 0 };
    bin.add(() => key.destroy());
  };

  const unseal = (f: Foot, a: Arena, broken: boolean) => {
    if (!sealed) return;
    sealed = null;
    for (const s of slots) {
      if (s.crack) shatter(a, s.x, BLOCK_Y, 'p_hail', 4, { scale: 0.3 });
      s.crack?.destroy();
      s.crack = undefined;
      s.block?.destroy();
      s.block = null;
    }
    for (const p of [...ices.keys()]) melt(a, p, true);
    shield(a, f, false);
    pause = 4;
    if (!broken || !f.alive) return;
    const h = heat(a);
    a.shake(500, 0.01);
    a.sfx('sfx_crit');
    f.stun(h.stun(2.5) + 0.5);
    f.vuln = 1.5;
    vulnT = 4;
    a.quip(960, 420, 'THE KING IS EXPOSED!', '#7dff9a', 48);
  };

  return {
    names: ['FROST STOMP', 'HAILSTORM', 'FIMBULWINTER'],
    info: [
      'His stomp freezes a pizza solid (no perk, no healing) while he builds an ice fortress · smash the ice blocks before the walls meet, and smack the ice off a frozen pizza',
      'Hail falls on the pizzas that aren’t frozen · smack each shard as it falls',
      'The ice spreads from pizza to pizza and the walls grow two at a time · smack the ice off and keep the walls down',
    ],
    cards: [
      {
        what: 'His stomp freezes pizzas while he builds an ice fortress',
        hit: 'Smash the ice blocks before the walls meet',
        miss: 'Sealed in, he heals and every pizza freezes: smash the keystone',
        show: [
          { key: 'p_iceblock', label: 'Ice block', hits: (h) => h.hits(2) },
          { key: 'p_icecase', label: 'Frozen pizza', hits: (h) => h.hits(2) },
          { key: 'p_keystone', label: 'Keystone', hits: (h) => h.hits(6) },
        ],
      },
      {
        what: 'Hail falls on the pizzas that aren’t frozen',
        hit: 'Smack each hailstone before it lands',
        miss: 'Hail takes a slice from that pizza',
        show: [
          { key: 'p_hail', label: 'Hailstone', hits: 1 },
          { key: 'p_iceblock', label: 'Ice block', hits: (h) => h.hits(2) },
        ],
      },
      {
        what: 'The ice spreads and the walls grow two blocks at a time',
        hit: 'Smack the ice off pizzas and keep the walls down',
        miss: 'Frozen pizzas lose their perk and can’t be healed',
        show: [
          { key: 'p_icecase', label: 'Frozen pizza', hits: (h) => h.hits(2) },
          { key: 'p_iceblock', label: 'Ice block', hits: (h) => h.hits(2) },
          { key: 'p_hail', label: 'Hailstone', hits: 1 },
        ],
      },
    ],
    upkeep: (f, dt, a) => {
      if (!ready) {
        ready = true;
        layoutSlots(a);
        a.sfx('sfx_thrym_enter');
        a.flash(400, 190, 230, 255);
        a.shake(800, 0.01);
        for (const p of a.alivePizzas()) a.fx.frost(p.x, p.surfaceY - 30);
        a.quip(960, 330, 'KNEEL BEFORE THE FROST KING!', '#bfe8ff', 46);
      }
      // the ice on frozen pizzas: keeps the perk off until it thaws
      for (const [p, ice] of ices) {
        if (p.dead) {
          melt(a, p, true);
          continue;
        }
        ice.t -= dt;
        if (p.perkFrozenT < 0.4) p.perkFrozenT = 0.4;
        if (ice.t <= 0 && !sealed) melt(a, p);
      }
      if (vulnT > 0) {
        vulnT -= dt;
        if (vulnT <= 0) f.vuln = 1;
      }
      // sealed in: he heals slowly behind the walls
      if (sealed && f.alive) {
        sealed.healT += dt;
        if (sealed.healT >= 1) {
          sealed.healT -= 1;
          const heal = Math.min(f.maxHp - f.hp, Math.round(f.maxHp * [0.006, 0.009, 0.01, 0.012, 0.014][heat(a).rank]));
          if (heal > 0) {
            f.hp += heal;
            a.fx.number(f.cx, f.cy - 120, heal, 'heal');
          }
        }
      }
    },
    update: (f, dt, a) => {
      const h = heat(a);
      if (pause > 0) pause -= dt;

      // ——— the fortress: a block every few seconds (two at a time in Fimbulwinter) ———
      // (a block every 3.6 s on Regular, 4.7 s two at a time in Fimbulwinter; was 3.1 s and 4.1 s)
      build.every = h.cooldown(f.phase >= 3 ? 3.9 : 3);
      if (!sealed && pause <= 0 && build.tick(dt)) {
        const l = filled(-1);
        const r = filled(1);
        if (f.phase >= 3) {
          addBlock(f, a, -1);
          addBlock(f, a, 1);
        } else addBlock(f, a, l < r ? -1 : r < l ? 1 : Math.random() < 0.5 ? -1 : 1);
      }

      // ——— hailstorm: shards fall on pizzas that aren't frozen (ice shrugs them off) ———
      hail.every = h.cooldown(4.2);
      if (f.phase >= 2 && !sealed && hail.tick(dt)) {
        const p = rnd(a.alivePizzas().filter((q) => !ices.has(q))) ?? rnd(a.alivePizzas());
        if (p) {
          a.sfx('sfx_thrym_hail');
          laneFall(a, p, {
            key: 'p_hail',
            scale: 0.85,
            warn: h.windup(0.6),
            fall: h.windup(1.5),
            halfW: 75,
            halfH: 105,
            color: 0x9ad8ff,
            label: 'SHATTERED!',
            onLand: (q) => {
              if (ices.has(q)) {
                a.quip(q.x, q.surfaceY - 160, 'THE ICE HOLDS!', '#bfe8ff', 36);
                return;
              }
              a.hitPizza(q, h.slices(1), 'HAIL!', '#bfe8ff');
              a.sfx('sfx_thrym_shatter', { volume: 0.7 });
            },
          }, bin);
        }
      }

      // ——— Fimbulwinter: the ice creeps to a neighbour ———
      spread.every = h.cooldown(7);
      if (f.phase >= 3 && !sealed && ices.size && spread.tick(dt)) {
        const from = rnd([...ices.keys()]);
        const ps = lanePizzas(a);
        const i = from ? ps.indexOf(from) : -1;
        const to = rnd([ps[i - 1], ps[i + 1]].filter((q): q is Pizza => !!q && !ices.has(q)));
        if (from && to) {
          a.quip(to.x, to.surfaceY - 200, 'THE ICE SPREADS…', '#bfe8ff', 34);
          a.sfx('sfx_thrym_spread');
          const line = a.sc.add.graphics();
          a.fxLayer.add(line);
          const st = { k: 0 };
          clockOf(a.sc).tween({
            targets: st,
            k: 1,
            duration: 1400,
            onUpdate: () => {
              line.clear();
              const x = from.x + (to.x - from.x) * st.k;
              line.lineStyle(12, 0xbfe8ff, 0.8).lineBetween(from.x, from.surfaceY + 30, x, to.surfaceY + 30);
            },
            onComplete: () => {
              line.destroy();
              if (f.alive && a.inWave() && !to.dead && ices.has(from)) freezeSolid(a, to, h.stun(7));
            },
          });
        }
      }
    },
    // his stomp freezes instead of taking slices: the stomp's slice loss is skipped once, right now
    onStomp: (_f, p, a) => {
      if (p.dead) return;
      freezeSolid(a, p, heat(a).stun(9));
      a.fx.ring(p.x, p.surfaceY - 10, 0xbfe8ff, 1.6, 0.45);
      const own = p as unknown as { takeSlices?: Pizza['takeSlices'] };
      own.takeSlices = () => {
        delete own.takeSlices;
        return [];
      };
      a.sc.time.delayedCall(0, () => delete own.takeSlices);
    },
    onDeath: (f, a) => {
      unseal(f, a, false);
      bin.flush();
      for (const p of [...ices.keys()]) melt(a, p, true);
      if (!a.inWave()) return;
      a.dramatic(1.4);
      a.flash(500, 220, 245, 255);
      a.shake(900, 0.014);
      a.sfx('sfx_thrym_death');
      shatter(a, f.cx, f.cy, 'p_hail', 22, { scale: 0.5, spread: 1800 });
      shatter(a, f.cx, f.cy, 'p_iceblock', 6, { scale: 0.35, spread: 1400 });
      a.quip(960, 380, 'THE ICE MELTS!', '#bfe8ff', 56);
    },
  };
};

// ——— 31. JÖRMUNGANDR (mini-boss) ———

/** The back edge of the table, where the serpent's body lies and its head surfaces. */
const EDGE_Y = 772;
/** Gaps in the coils, where the head can surface. */
const GAPS = [330, 760, 1160, 1590];
/** Where the head stands when it's up (its middle, between the eyes and the nose), and where it waits under the sea. */
const HEAD_UP = 480;
const HEAD_DOWN = EDGE_Y + 420;
/** The tell: only the crown of the head breaks the surface. */
const HEAD_TELL = EDGE_Y + 100;
/** How far the head stands out in front of its gap (towards the way it faces) as it surfaces. */
const HEAD_FWD = 150;
/** Once up, how far back from its pizza the head poises (so the line it strikes along runs down through the pizza),
 * and how far in from the screen's edges it keeps (so its body, arching behind it, stays in view). */
const STRIKE_DX = 330;
const HEAD_X_MIN = 420;
const HEAD_X_MAX = 1500;

/** The serpent's art for the phase cards (the fight's own textures are built in the fight: ./jormRig.ts). */
function jormCardArt(): Record<string, () => HTMLCanvasElement> {
  const card = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => () => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d')!);
    return c;
  };
  return {
    // the head poised on its neck, aimed down, jaws parted on the inside of its mouth
    p_serpenthead: card(440, 400, (g) => {
      const k = 0.46;
      const rot = -0.38;
      const sx = 330;
      const sy = 168;
      const reach = 110 * k;
      drawNeckAlong(g, [sx, sy, sx + Math.cos(rot) * reach, sy + Math.sin(rot) * reach, 420, 300, 410, 430], k, k * NECK_AT_HEAD, k * 1.05);
      const [c, hg] = (() => {
        const cv = document.createElement('canvas');
        cv.width = SK.w;
        cv.height = SK.h + 200;
        return [cv, cv.getContext('2d')!];
      })();
      paintHeadStill(hg, { open: 0.55, kelp: false });
      g.save();
      g.translate(sx, sy);
      g.rotate(rot);
      g.scale(k, k);
      g.translate(-SOCKET.x, -SOCKET.y);
      g.drawImage(c, 0, 0);
      g.restore();
      // the kelp hangs straight down from where it's caught
      KELP.forEach((kl, i) => {
        const dx = (kl.x - SOCKET.x) * k;
        const dy = (kl.y - SOCKET.y) * k;
        g.save();
        g.translate(sx + dx * Math.cos(rot) - dy * Math.sin(rot), sy + dx * Math.sin(rot) + dy * Math.cos(rot));
        g.scale(k, k);
        g.translate(-kl.x, -kl.y);
        paintKelpAt(g, i, 0.3);
        g.restore();
      });
    }),
    p_coil: card(COIL.w, COIL.h, (g) => paintCoil(g, 0.2)),
    // the wrap round a pizza (a plain one, so the coil is what reads)
    p_constrict: card(WRAP.w, WRAP.h, (g) => {
      const ring = (rx: number, ry: number, fill: string) => {
        g.beginPath();
        g.ellipse(WRAP.cx, WRAP.cy + 8, rx, ry, 0, 0, Math.PI * 2);
        g.fillStyle = fill;
        g.fill();
      };
      ring(WRAP.A + 4, WRAP.B * 0.62, '#8a4e22');
      ring(WRAP.A, WRAP.B * 0.58, '#d08a40');
      ring(WRAP.A - 18, WRAP.B * 0.5, '#c8402a');
      ring(WRAP.A - 34, WRAP.B * 0.42, '#f2cf6a');
      for (const [dx, dy] of [[-90, -10], [-30, -26], [40, -6], [100, -20], [-20, 18], [70, 22], [-120, 14]]) {
        g.beginPath();
        g.ellipse(WRAP.cx + dx, WRAP.cy + 8 + dy, 15, 9, 0, 0, Math.PI * 2);
        g.fillStyle = '#b3261e';
        g.fill();
      }
      g.drawImage(paintWrap(), 0, 0);
    }),
  };
}

const jormungandr = (): Brain => {
  const bin = new Bin();
  let ready = false;
  let rig: SerpentRig | null = null;
  // the head: where it is (its middle), the gap it rises from, and how it looks
  const H = { x: 960, y: HEAD_DOWN, gap: 960, face: -1, up: false, jaw: 0, inhale: 0, daze: 0, scale: 1, tilt: HEAD_TILT, boil: 0, plunged: true };
  /** Where the head stands over its gap (in front of its neck). */
  const homeX = () => H.gap + H.face * HEAD_FWD;
  // (the bite's strike: where the head starts, its line (tilt), and where it ends with its mouth on the pizza)
  let cycle: { stage: 'wait' | 'tell' | 'rise' | 'up' | 'dazed' | 'bite' | 'dive'; t: number; p: Pizza | null; hits: number; venom: boolean; t0?: number; hx?: number; strike?: { x: number; y: number; tilt: number; tx: number; ty: number } } = { stage: 'wait', t: 2.2, p: null, hits: 0, venom: false };
  let lastGap = -1;
  let squeeze: { p: Pizza; img: Phaser.GameObjects.Image; t: number; tw: Phaser.Tweens.Tween } | null = null;
  const constrict = new Every(9, 6);

  const need = (a: Arena) => [2, 3, 3, 4, 4][heat(a).rank];

  const coilHit = (a: Arena) => {
    const h = heat(a);
    a.stunPeel(h.stun(1.2), 'REFLECTED!');
    a.sfx('sfx_jormungandr_reflect');
    const pp = a.peelPoint();
    a.fx.ring(pp.x, pp.y, 0x7dffb0, 0.8, 0.8);
  };

  const setup = (f: Foot, a: Arena) => {
    ready = true;
    enterArena(a, 'jormungandr');
    f.puppet = true;
    f.phased = true;
    f.setVisualAlpha(0);
    f.x = 960;
    f.y = EDGE_Y + 200;
    const r = new SerpentRig(a, EDGE_Y);
    rig = r;
    // the foot's hit area is the head as drawn (its skull, or its jaw as far as it's dropped)
    (f as unknown as { distanceTo: Foot['distanceTo'] }).distanceTo = (px, py) => r.headDistance(px, py);
    // the coils: anywhere on a hump's body (not the gaps, the hollow under an arch, or the head and neck in front)
    a.addClickable({
      x: 960,
      y: EDGE_Y - 100,
      r: 0,
      priority: 2,
      contains: (px, py) => r.coilContains(px, py),
      alive: () => f.alive && ready,
      hit: () => coilHit(a),
      label: 'coil',
    });
    a.sfx('sfx_jormungandr_enter');
    a.shake(900, 0.008);
    a.rumble(0.6, 600);
    a.quip(960, 330, 'THE WORLD SERPENT RISES!', '#7dffb0', 44);
    bin.add(() => {
      r.die();
      rig = null;
    });
  };

  /** Put the head (and the foot's hit box) at H. */
  const place = (f: Foot, dt: number) => {
    if (!rig) return;
    const shown = H.up || cycle.stage === 'tell' || cycle.stage === 'rise' || cycle.stage === 'dive' || cycle.stage === 'bite' || cycle.stage === 'dazed';
    const masked = cycle.stage === 'tell' || cycle.stage === 'rise' || (cycle.stage === 'dive' && H.plunged) || cycle.stage === 'wait';
    rig.setFront(cycle.stage === 'bite');
    rig.update(dt, { x: H.x, y: H.y, gap: H.gap, face: H.face, shown, masked, jaw: H.jaw, inhale: H.inhale, daze: H.daze, scale: H.scale, tilt: H.tilt, boil: H.boil });
    const fh = f.meta.footHeight * f.scale;
    f.x = H.x;
    f.y = H.y + fh * 0.5;
  };

  const releaseSqueeze = (a: Arena, quiet = false) => {
    if (!squeeze) return;
    const s = squeeze;
    squeeze = null;
    s.tw.remove();
    if (s.p.root.active) a.sc.tweens.add({ targets: s.p.root, scaleX: 1, scaleY: 1, duration: 200 });
    a.sc.tweens.add({ targets: s.img, alpha: 0, y: s.img.y + 60, duration: 400, onComplete: () => s.img.destroy() });
    if (!quiet && !s.p.dead) a.quip(s.p.x, s.p.surfaceY - 180, 'RELEASED!', '#7dff9a', 40);
  };

  const recoil = (f: Foot, a: Arena) => {
    a.quip(H.x, Math.max(280, H.y - 230), 'RECOILS!', '#7dff9a', 44);
    a.sfx('sfx_crit');
    releaseSqueeze(a);
    // reeling, it stays up for a moment before it dives: a window to pile on hits (without it the head took only
    // 2–4 smacks a surfacing and the fight ran three or four minutes)
    const t = [2, 1.6, 1.4, 1.2, 1][heat(a).rank];
    cycle = { stage: 'dazed', t, t0: t, hx: H.x, p: null, hits: 0, venom: true };
    f.stun(0.4);
  };

  /** Ease v towards target at rate k (per second). */
  const ease = (v: number, target: number, k: number, dt: number) => v + (target - v) * Math.min(1, dt * k);

  return {
    names: ['THE WORLD SERPENT', 'CONSTRICT', 'VENOM'],
    info: [
      'Its head surfaces at a gap in the coils and bites a pizza · smack the head before it bites, never the coils (they stun your peel)',
      'A coil wraps a pizza and squeezes a slice off every few seconds · make the head recoil to free it',
      'It spits venom at your peel while it’s up · bat the venom away',
    ],
    cards: [
      {
        what: 'Its head rises from a gap in the coils to bite a pizza',
        hit: 'Smack the head before it bites, never the coils',
        miss: 'The bite takes a slice; a coil smack stuns your peel',
        show: [
          { key: 'p_serpenthead', label: 'Its head', hits: (h) => [2, 3, 3, 4, 4][h.rank] },
          { key: 'p_coil', label: 'Coils', watch: true },
        ],
      },
      {
        what: 'A coil wraps a pizza and squeezes slices off it',
        hit: 'Make the head recoil to set the pizza free',
        miss: 'The wrapped pizza loses a slice every few seconds',
        show: [
          { key: 'p_serpenthead', label: 'Its head', hits: (h) => [2, 3, 3, 4, 4][h.rank] },
          { key: 'p_constrict', label: 'Wrapped coil', watch: true },
        ],
      },
      {
        what: 'It spits venom at your peel while its head is up',
        hit: 'Bat the venom back at it, then smack the head',
        miss: 'Venom slows your peel for a moment',
        show: [
          { key: 'p_venom', label: 'Venom', hits: 1 },
          { key: 'p_serpenthead', label: 'Its head', hits: (h) => [2, 3, 3, 4, 4][h.rank] },
          { key: 'p_coil', label: 'Coils', watch: true },
        ],
      },
    ],
    cardArt: jormCardArt,
    upkeep: (f, dt, a) => {
      if (!ready) setup(f, a);
      // its art is painted over the fight's first frames
      rig?.build();
      place(f, dt);
      // squeezed pizza loses a slice every few seconds (Mild never takes its last)
      if (squeeze) {
        const s = squeeze;
        if (s.p.dead) releaseSqueeze(a, true);
        else {
          s.img.setPosition(s.p.x, s.p.surfaceY - 22);
          s.t -= dt;
          if (s.t <= 0) {
            const h = heat(a);
            s.t = h.rank === 0 ? 4 : h.rank >= 3 ? 2.6 : 3.2;
            hitSoft(a, s.p, 1, 'SQUEEZED!', '#7dffb0', h.rank === 0);
            a.sfx('sfx_jormungandr_constrict', { throttle: 300 });
          }
        }
      }
    },
    update: (f, dt, a) => {
      // (nothing happens until its art is ready: the coils are rising meanwhile)
      if (!rig?.ready) return;
      const h = heat(a);
      const c = cycle;
      c.t -= dt;
      // the head's look eases towards what each stage wants
      let jaw = 0;
      let inhale = 0;
      let daze = 0;
      let scale = 1;
      let boil = 0;
      let tilt = HEAD_TILT;
      let tiltRate = 6;
      if (c.stage === 'wait' && c.t <= 0) {
        // bubbles at the next gap, then the head rises there
        const choices = GAPS.filter((_g, i) => i !== lastGap);
        const g = rnd(choices) ?? 960;
        lastGap = GAPS.indexOf(g);
        H.gap = g;
        // it turns towards the pizza nearest its gap (the one it will bite)
        const near = a.alivePizzas().reduce<Pizza | null>((b, p) => (!b || Math.abs(p.x - g) < Math.abs(b.x - g) ? p : b), null);
        H.face = near && near.x > g ? 1 : -1;
        // (if poising on that side of it would put the head, or the body arching behind it, off the screen, it comes
        // at the pizza from the other side)
        if (near && Math.abs(near.x - H.face * STRIKE_DX - (HEAD_X_MIN + HEAD_X_MAX) / 2) > (HEAD_X_MAX - HEAD_X_MIN) / 2) H.face = -H.face;
        H.x = homeX();
        H.y = HEAD_DOWN;
        c.stage = 'tell';
        c.t = h.windup(0.9);
        c.t0 = c.t;
        for (let i = 0; i < 5; i++) a.sc.time.delayedCall(i * 150, () => a.fx.puff(g + (crand() - 0.5) * 90, EDGE_Y - 10, 3));
        a.quip(g, EDGE_Y - 160, 'HISSS…', '#7dffb0', 36);
        a.sfx('sfx_jormungandr_hiss');
      } else if (c.stage === 'tell') {
        // the sea boils at the gap and the crown of its head breaks the surface
        const u = 1 - c.t / (c.t0 ?? 1);
        boil = Math.min(1, u * 2);
        // (snout up, the way it will burst out)
        tilt = -0.35;
        H.y = ease(H.y, HEAD_TELL + Math.sin(a.now() * 20) * 3, 6, dt);
        H.x = homeX() + Math.sin(a.now() * 13) * 3;
        if (c.t <= 0) {
          c.stage = 'rise';
          c.t = 0.45;
          f.phased = false;
          H.plunged = false;
          a.sfx('sfx_jormungandr_surface');
          a.fx.puff(H.gap, EDGE_Y, 10);
          rig.surface(H.gap);
          a.shake(300, 0.006);
        }
      } else if (c.stage === 'rise') {
        // it bursts up out of the sea, water pouring off it
        H.y = ease(H.y, HEAD_UP, 9, dt);
        boil = 0.6;
        jaw = 0.12;
        tilt = -0.15;
        if (c.t <= 0) {
          c.stage = 'up';
          H.up = true;
          c.t = [3.2, 2.6, 2.2, 1.9, 1.7][h.rank];
          c.t0 = c.t;
          c.hits = 0;
          // it eyes the nearest pizza: that's the one it'll bite
          const ps = a.alivePizzas();
          c.p = ps.length ? ps.reduce((b, p) => (Math.abs(p.x - H.gap) < Math.abs(b.x - H.gap) ? p : b)) : null;
          if (c.p) mark(a, 'p_reticle', c.p.x, c.p.surfaceY - 30, c.t, 0.7).setTint(0x7dffb0);
          // phase 3: venom at the peel
          if (f.phase >= 3 && !c.venom) {
            c.venom = true;
            a.sc.time.delayedCall(500, () => {
              if (!f.alive || cycle.stage !== 'up') return;
              a.sfx('sfx_jormungandr_venom');
              const [mx, my] = mouthOffset(H.face, H.tilt, H.scale);
              throwAtPeel(a, 'p_venom', { x: H.x + mx, y: H.y + my }, 1.2, () => {
                a.slowPeel(h.stun(2.2));
                a.quip(a.peelPoint().x, a.peelPoint().y - 70, 'VENOM!', '#7dffb0', 36);
              }, () => a.damageFoot(f, Math.round(f.maxHp * 0.02), 'BATTED BACK!'), 8, { scale: 0.75 });
            });
          }
        }
      } else if (c.stage === 'up') {
        // poised over the curve of its neck, swaying, its snout aimed down at the pizza it means to bite; at the end it
        // draws a deep breath and cocks its head back (still aimed), its jaws gaping wide
        const breath = Math.min(0.8, (c.t0 ?? 1) * 0.4);
        const u = Math.max(0, 1 - c.t / breath);
        inhale = u;
        jaw = 0.08 + Math.pow(u, 1.4) * 0.68;
        scale = 1 + u * 0.04;
        // (from where it surfaced it glides back and up from its pizza, its body swimming round behind it, until the
        // line it will strike along runs down through the pizza; it keeps its aim on it as it sways)
        const want = c.p && !c.p.dead ? Math.max(HEAD_X_MIN, Math.min(HEAD_X_MAX, c.p.x - H.face * STRIKE_DX)) : homeX();
        c.hx = ease(c.hx ?? H.x, want, 3, dt);
        H.x = c.hx + Math.sin(a.now() * 2.6) * 30 * (1 - u * 0.7) - H.face * u * 60;
        H.y = HEAD_UP + Math.sin(a.now() * 3.3) * 10 - u * 30;
        const [amx, amy] = mouthOffset(H.face, H.tilt, H.scale);
        const aim = c.p && !c.p.dead ? Math.max(0.35, Math.min(1.1, aimTilt(H.face, H.x + amx, H.y + amy, c.p.x, c.p.surfaceY))) : HEAD_TILT;
        tilt = aim + Math.sin(a.now() * 2.1) * 0.03;
        if (c.t <= 0) {
          if (!c.p || c.p.dead || !a.inWave()) {
            cycle = { stage: 'dive', t: 0.3, p: null, hits: 0, venom: false };
            return;
          }
          // it strikes along the line from its mouth to the pizza, the neck uncoiling behind it
          const [mx, my] = mouthOffset(H.face, H.tilt, H.scale);
          const st = Math.max(0.3, Math.min(1, aimTilt(H.face, H.x + mx, H.y + my, c.p.x, c.p.surfaceY - 20)));
          const [ex, ey] = mouthOffset(H.face, st, 1.06);
          c.strike = { x: H.x, y: H.y, tilt: st, tx: c.p.x - ex, ty: c.p.surfaceY - 20 - ey };
          c.stage = 'bite';
          c.t = 0.22;
          a.sfx('sfx_jormungandr_bite');
        }
      } else if (c.stage === 'dazed') {
        // reeling: it wobbles where it is, eyes rolling, the head sagging, the jaw slack; then dives
        daze = 1;
        jaw = 0.42 + Math.sin(a.now() * 5) * 0.07;
        // (the smack throws its head back and up, the neck kinking back behind it; then it sags)
        const jolt = Math.exp(-5 * ((c.t0 ?? c.t) - c.t));
        tilt += 0.15 - 0.55 * jolt + Math.sin(a.now() * 4.2) * 0.1;
        tiltRate = 14;
        H.x = (c.hx ?? homeX()) - H.face * 90 * jolt + Math.sin(a.now() * 9) * 20;
        H.y = HEAD_UP + 70 - 80 * jolt + Math.sin(a.now() * 7) * 10;
        if (c.t <= 0) {
          cycle = { stage: 'dive', t: 0.3, p: null, hits: 0, venom: false };
          a.sfx('sfx_jormungandr_dive');
        }
      } else if (c.stage === 'bite') {
        // the strike: along its line, faster and faster, jaws flung wide, snapping shut on the pizza
        const p = c.p!;
        const u = Math.min(1, 1 - c.t / 0.22);
        jaw = u < 0.7 ? 1 : Math.max(0, 1 - (u - 0.7) / 0.25);
        scale = 1 + u * 0.06;
        inhale = 0.6;
        const s = c.strike!;
        const e = Math.min(1, u / 0.75) ** 2;
        H.x = s.x + (s.tx - s.x) * e;
        H.y = s.y + (s.ty - s.y) * e;
        tilt = s.tilt;
        tiltRate = 30;
        if (c.t <= 0) {
          if (!p.dead && a.inWave()) {
            a.hitPizza(p, 1, 'BITTEN!', '#7dffb0');
            a.shake(260, 0.008);
          }
          cycle = { stage: 'dive', t: 0.3, p: null, hits: 0, venom: false };
          a.sfx('sfx_jormungandr_dive', { volume: 0.7 });
        }
      } else if (c.stage === 'dive') {
        // it pulls back up from the table, then plunges into its gap with a splash
        H.up = false;
        if (c.t > 0) {
          H.x = ease(H.x, Math.max(HEAD_X_MIN - 100, Math.min(HEAD_X_MAX + 100, homeX())), 8, dt);
          H.y = ease(H.y, Math.min(H.y, HEAD_UP + 40), 12, dt);
          tilt = 0.25;
        } else {
          // snout first into the sea in front of its gap, the neck arching over after it
          H.x = ease(H.x, H.gap + H.face * 120, 6, dt);
          tilt = 1.25;
          if (!H.plunged) {
            H.plunged = true;
            rig.plunge(H.gap);
            a.fx.puff(H.gap, EDGE_Y, 8);
          }
          H.y = ease(H.y, HEAD_DOWN, 6, dt);
          if (H.y > EDGE_Y + 260) {
            f.phased = true;
            cycle = { stage: 'wait', t: h.cooldown(1.6), p: null, hits: 0, venom: false };
          }
        }
      }
      H.jaw = ease(H.jaw, jaw, cycle.stage === 'bite' ? 40 : 10, dt);
      H.inhale = ease(H.inhale, inhale, 8, dt);
      H.daze = ease(H.daze, daze, 6, dt);
      H.scale = ease(H.scale, scale, 12, dt);
      H.tilt = ease(H.tilt, tilt, tiltRate, dt);
      H.boil = ease(H.boil, boil, 4, dt);

      // ——— Constrict: a coil wraps a pizza until the head recoils ———
      constrict.every = h.cooldown(10);
      if (f.phase >= 2 && !squeeze && constrict.tick(dt)) {
        const p = rnd(a.alivePizzas());
        const r = rig;
        if (p) {
          const img = a.sc.add.image(p.x, p.surfaceY - 22, 'jsr_wrap').setOrigin(0.5, WRAP.cy / WRAP.h).setScale(p.radius / WRAP.A).setAlpha(0);
          a.fxLayer.add(img);
          a.sc.tweens.add({ targets: img, alpha: 1, duration: 300 });
          a.sc.tweens.add({ targets: img, scaleY: img.scaleY * 0.94, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
          const tw = a.sc.tweens.add({ targets: p.root, scaleX: 0.92, scaleY: 0.9, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
          squeeze = { p, img, t: 1.4, tw };
          a.quip(p.x, p.surfaceY - 200, 'CONSTRICT!', '#7dffb0', 44);
          a.sfx('sfx_jormungandr_constrict');
          // the wrapped coil is still a coil: smacking it reflects
          a.addClickable({
            x: p.x,
            y: p.surfaceY + 34,
            r: 0,
            priority: 2,
            contains: (px, py) => squeeze?.img === img && r.wrapContains(img, px, py),
            alive: () => squeeze?.img === img,
            hit: () => coilHit(a),
            label: 'wrapped coil',
          });
          bin.add(() => releaseSqueeze(a, true));
        }
      }
    },
    onSmacked: (f, a) => {
      // only the head counts, and only while it's up
      if (!H.up && cycle.stage !== 'bite' && cycle.stage !== 'dazed') return true;
      rig?.flash();
      cycle.hits++;
      if (cycle.stage === 'up' && cycle.hits >= need(a)) recoil(f, a);
      return false;
    },
    onDeath: (f, a) => {
      releaseSqueeze(a, true);
      if (a.inWave()) {
        a.dramatic(1.2);
        a.sfx('sfx_jormungandr_death');
        a.shake(900, 0.012);
        for (let i = 0; i < 12; i++) a.fx.puff(100 + crand() * 1720, EDGE_Y - crand() * 30, 6);
        // plates of stone hide fly off the head (it crashes back into the sea and the coils sink: SerpentRig.die)
        if (rig && H.up) shatter(a, H.x, H.y, 'jsr_chip', 9, { scale: 1, spread: 1000 });
      }
      bin.flush();
      void f;
      leaveArena(a);
    },
  };
};

// ——— 32. SURTR THE FIRE GIANT (boss) ———

/** Phase names by how many phases this heat gives him: the sword is always the last. */
function surtrNames(n: number): string[] {
  const mid = ['THE BRIDGE BURNS', 'TWILIGHT OF THE GODS', 'TWILIGHT OF THE GODS'];
  return ['MUSPEL FIRE', ...mid.slice(0, Math.max(0, n - 2)), 'SWORD OF RAGNARÖK'];
}

const SURTR_INFO: Record<string, string> = {
  'MUSPEL FIRE': 'Sets a pizza alight (it loses a slice every 4 s) and hurls fireballs · smack out the flames and the fireballs as they fall',
  'THE BRIDGE BURNS': 'Fire runs along the bridge towards a pizza and sets it alight · smack the running flame before it gets there',
  'TWILIGHT OF THE GODS': 'Fire and fireballs come faster · keep the flames out',
  'SWORD OF RAGNARÖK': 'He raises his sword to sweep the table · fire your signature move (or Peel Slam) the moment the sword flashes',
};

/** Each phase's intro card, by phase name (as the names above, so the sword is always the last card). */
const SURTR_CARDS: Record<string, PhaseCard> = {
  'MUSPEL FIRE': {
    what: 'He sets a pizza alight and hurls fireballs',
    hit: 'Smack out the flames and each fireball as it falls',
    miss: 'A burning pizza loses a slice every 4 s; fireballs scorch one',
    show: [
      { key: 'p_pizzaflame', label: 'Flames', hits: (h) => h.hits(3) },
      { key: 'p_fireball', label: 'Fireball', hits: 1 },
    ],
  },
  'THE BRIDGE BURNS': {
    what: 'Fire runs along the bridge towards a pizza',
    hit: 'Stamp out the running flame before it gets there',
    miss: 'It sets that pizza alight too',
    show: [
      { key: 'p_fuse', label: 'Running flame', hits: 1 },
      { key: 'p_pizzaflame', label: 'Flames', hits: (h) => h.hits(3) },
      { key: 'p_fireball', label: 'Fireball', hits: 1 },
    ],
  },
  'TWILIGHT OF THE GODS': {
    what: 'Fire and fireballs come faster',
    hit: 'Keep the flames out and the fireballs off',
    miss: 'Burning pizzas lose a slice every 4 s',
    show: [
      { key: 'p_fireball', label: 'Fireball', hits: 1 },
      { key: 'p_fuse', label: 'Running flame', hits: 1 },
      { key: 'p_pizzaflame', label: 'Flames', hits: (h) => h.hits(3) },
    ],
  },
  'SWORD OF RAGNARÖK': {
    what: 'He raises his sword to sweep the whole table',
    hit: 'Fire your peel (or Peel Slam) the moment the sword flashes',
    miss: 'The sweep takes slices from every pizza',
    show: [
      { key: 'p_sword', label: 'Wait for the flash', watch: true },
      { key: 'p_pizzaflame', label: 'Flames', hits: (h) => h.hits(3) },
    ],
  },
};

/** Seconds the counter window stays open, by heat (Mild … Inferno). */
const WINDOW = [1.0, 0.72, 0.56, 0.46, 0.38];
/** Slices the sweep takes from every pizza, by heat; Mild and Regular never take the last one. */
const SWEEP = [1, 2, 2, 3, 3];

/** Where the sword rises: its hilt, in the middle of the table; the ring and rune sit on the blade. */
const SWORD_X = 960;
const SWORD_Y = 790;

const surtr = (): Brain => {
  const bin = new Bin();
  let ready = false;
  let n = 4;
  const burning = new Map<Pizza, { prop: Prop; t: number; glow: Phaser.GameObjects.Image }>();
  const fireball = new Every(4, 2.5);
  const fuse = new Every(8, 4);
  const swordT = new Every(12, 4);
  let sword: {
    stage: 'raise' | 'window' | 'done';
    t: number;
    img: Phaser.GameObjects.Image;
    ring: Phaser.GameObjects.Graphics;
    rune: Phaser.GameObjects.Image;
    /** the sword's one caption: what to do, then NOW! (one place, so nothing piles up) */
    cap: Phaser.GameObjects.Container;
    open: number;
    early: boolean;
    countered: boolean;
    lane: { release(): void } | null;
  } | null = null;
  let vulnT = 0;

  const douse = (a: Arena, p: Pizza, quiet = false) => {
    const b = burning.get(p);
    if (!b) return;
    burning.delete(p);
    b.prop.destroy();
    a.sc.tweens.add({ targets: b.glow, alpha: 0, duration: 300, onComplete: () => b.glow.destroy() });
    if (!quiet && !p.dead) {
      a.quip(p.x, p.surfaceY - 170, 'FLAMES OUT!', '#7dff9a', 40);
      a.sfx('sfx_surtr_douse');
      for (let i = 0; i < 6; i++) a.fx.puff(p.x + (crand() - 0.5) * 160, p.surfaceY - 20, 2);
    }
  };

  const ignite = (a: Arena, p: Pizza) => {
    if (p.dead || burning.has(p)) return;
    const h = heat(a);
    const glow = a.sc.add.image(p.x, p.surfaceY, 'glow').setTint(0xff7a1a).setBlendMode(Phaser.BlendModes.ADD).setScale(2.4, 1.2).setAlpha(0.5);
    a.fxLayer.add(glow);
    a.sc.tweens.add({ targets: glow, alpha: 0.25, duration: 300, yoyo: true, repeat: -1 });
    const prop = hitProp(a, {
      key: 'p_pizzaflame',
      x: p.x,
      y: p.surfaceY + 10,
      scale: (p.radius * 2.1) / 360,
      hits: h.hits(3),
      follow: () => ({ x: p.x, y: p.surfaceY - 20 }),
      contains: (px, py) => Math.abs(px - p.x) < p.radius * 1.05 && py > p.surfaceY - 150 && py < p.surfaceY + p.radius * 0.7,
      badgeDy: -150,
      hitSfx: 'sfx_surtr_douse',
      clearSfx: 'sfx_surtr_douse',
      onHit: () => a.fx.puff(p.x + (crand() - 0.5) * 120, p.surfaceY - 40, 3),
      onClear: () => douse(a, p),
    });
    prop.img.setOrigin(0.5, 0.85);
    burning.set(p, { prop, t: 4, glow });
    a.quip(p.x, p.surfaceY - 220, 'ALIGHT!', '#ffb24a', 48);
    a.sfx('sfx_surtr_ignite');
    bin.add(() => douse(a, p, true));
  };

  /** Each phase sets one pizza alight (the one with the most slices, so it has the most to lose). */
  const lightOne = (f: Foot, a: Arena) => {
    const ps = a.alivePizzas().filter((p) => !burning.has(p));
    if (!ps.length) return;
    const p = ps.reduce((b, q) => (q.slices > b.slices ? q : b));
    // embers gather first
    mark(a, 'p_reticle', p.x, p.surfaceY - 30, 0.9, 0.75).setTint(0xff7a1a);
    for (let i = 0; i < 6; i++) a.sc.time.delayedCall(i * 120, () => a.fx.burn(p.x + (crand() - 0.5) * 180, p.surfaceY - 10));
    a.sc.time.delayedCall(900, () => f.alive && a.inWave() && ignite(a, p));
  };

  const finishSword = (a: Arena) => {
    for (const o of a.allFeet()) if (o.type.id === 'surtr') o.brain.swordWindow = false;
    if (!sword) return;
    const s = sword;
    sword = null;
    s.lane?.release();
    a.sc.tweens.add({ targets: [s.img, s.rune, s.cap], alpha: 0, duration: 300, onComplete: () => { s.img.destroy(); s.rune.destroy(); s.cap.destroy(); } });
    s.ring.destroy();
  };

  /** Sets the sword's caption: a big line and an optional small one, popping in. */
  const caption = (a: Arena, cap: Phaser.GameObjects.Container, big: string, color: string, small = '', size = 56) => {
    const [bigT, smallT] = cap.list as Phaser.GameObjects.Text[];
    bigT.setText(big).setColor(color).setFontSize(size);
    smallT.setText(small).setY(size * 0.5 + 22);
    a.sc.tweens.killTweensOf(cap);
    cap.setScale(0.4).setAlpha(1);
    a.sc.tweens.add({ targets: cap, scale: 1, duration: 260, ease: 'Back.Out' });
  };

  const startSword = (f: Foot, a: Arena) => {
    const h = heat(a);
    const lane = takeLane(a, f, lanePizzas(a)[Math.floor(lanePizzas(a).length / 2)] ?? null);
    // the sword rises up through the target circle, so the flash and the ring are one tell
    const img = a.sc.add.image(SWORD_X, SWORD_Y + 260, 'p_sword').setOrigin(0.5, 0.85).setScale(0.52).setAngle(0).setAlpha(0);
    a.fxLayer.add(img);
    a.sc.tweens.add({ targets: img, alpha: 1, y: SWORD_Y, duration: 700, ease: 'Back.Out' });
    const ring = a.sc.add.graphics();
    a.fxLayer.add(ring);
    const rune = a.sc.add.image(SWORD_X, SWORD_Y - 190, 'p_rune').setScale(0.6).setAlpha(0.35);
    a.fxLayer.add(rune);
    // the caption sits under the boss bar, above the ring: everything else stays clear of the middle
    const style = { fontFamily: 'Lilita One, Fredoka, sans-serif', color: '#fff6e2', stroke: '#2a1810', align: 'center' };
    const cap = a.sc.add.container(SWORD_X, 268, [
      a.sc.add.text(0, 0, '', { ...style, fontSize: '56px', strokeThickness: 12 }).setOrigin(0.5),
      a.sc.add.text(0, 50, '', { ...style, fontSize: '30px', strokeThickness: 8 }).setOrigin(0.5),
    ]);
    a.fxLayer.add(cap);
    sword = { stage: 'raise', t: h.windup(2.2), img, ring, rune, cap, open: 0, early: false, countered: false, lane };
    bin.add(() => finishSword(a));
    a.sfx('sfx_surtr_raise');
    // the runes charge the peel, so the counter is always in hand (abilities that fire themselves can't
    // be timed: those peels strike the rune instead)
    const sc = bits(a);
    const t = sc.ability?.trigger.t;
    const pressable = !sc.ability || t === 'active';
    const charged = pressable && sc.run.super < 1;
    if (charged) sc.run.super = 1;
    // the caption says what the meter's for, so the one-time "PEEL SLAM READY!" toast would only pile on
    if (pressable) sc.slamHinted = true;
    const how = !pressable ? 'STRIKE THE RUNE WHEN THE SWORD FLASHES' : charged ? 'THE RUNES CHARGE YOUR PEEL: FIRE IT ON THE FLASH' : 'FIRE YOUR PEEL ON THE FLASH';
    caption(a, cap, 'THE SWORD RISES!', '#ffb24a', how);
    sword.rune.setVisible(!pressable);
    // passive peels: the rune can be struck only while the window is open
    a.addClickable({
      x: SWORD_X,
      y: SWORD_Y - 190,
      r: 110,
      priority: 3,
      alive: () => !!sword && sword.img === img && sword.stage === 'window' && !pressable,
      hit: () => {
        if (sword && sword.img === img) counter(f, a);
      },
    });
  };

  const counter = (f: Foot, a: Arena) => {
    if (!sword || sword.countered) return;
    sword.countered = true;
    const h = heat(a);
    a.sfx('sfx_surtr_parry');
    a.banner('PARRIED!', 'The sword shatters', 'clear');
    a.flash(300, 255, 255, 255);
    a.shake(700, 0.014);
    a.dramatic(0.8);
    shatter(a, sword.img.x, sword.img.y - 200, 'p_fireball', 10, { scale: 0.35 });
    finishSword(a);
    if (f.alive) {
      a.damageFoot(f, Math.round(f.maxHp * 0.06), 'SWORD BROKEN!');
      f.stun(h.stun(3) + 0.5);
      f.vuln = 1.5;
      vulnT = 4;
    }
  };

  const sweep = (f: Foot, a: Arena) => {
    const h = heat(a);
    const arc = a.sc.add.image(-500, 820, 'p_swordarc').setScale(1.4, 1.1).setAlpha(0.95);
    a.fxLayer.add(arc);
    a.sc.tweens.add({ targets: arc, x: 2400, duration: 650, ease: 'Sine.InOut', onComplete: () => arc.destroy() });
    a.sfx('sfx_surtr_sweep');
    a.flash(300, 255, 120, 40);
    a.shake(700, 0.016);
    a.rumble(1, 500);
    const spare = h.rank <= 1;
    lanePizzas(a).forEach((p, i) => a.sc.time.delayedCall(80 + i * 110, () => f.alive && a.inWave() && hitSoft(a, p, SWEEP[h.rank], 'SWEPT!', '#ff7a1a', spare)));
  };

  return {
    get names() {
      return surtrNames(n);
    },
    get info() {
      return surtrNames(n).map((k) => SURTR_INFO[k]);
    },
    get cards() {
      return surtrNames(n).map((k) => SURTR_CARDS[k]);
    },
    setPhases: (k) => {
      n = k;
    },
    onPhase: (f, ph, a) => {
      n = a.bossPhases();
      // each phase sets another pizza alight
      lightOne(f, a);
      if (ph === n) {
        // the first raise waits for the phase banner to go, so the banner never sits over the ring
        swordT.t = heat(a).rank === 0 ? 5.2 : 4.2;
        a.sfx('sfx_surtr_roar');
      }
    },
    upkeep: (f, dt, a) => {
      if (!ready) {
        ready = true;
        n = a.bossPhases();
        a.sfx('sfx_surtr_enter');
        a.flash(400, 255, 140, 40);
        a.shake(900, 0.012);
        for (let i = 0; i < 24; i++) a.sc.time.delayedCall(i * 40, () => a.fx.burn(crand() * 1920, 760 + crand() * 60));
        a.quip(960, 330, 'RAGNARÖK HAS COME!', '#ffb24a', 50);
        a.sc.time.delayedCall(1200, () => f.alive && lightOne(f, a));
      }
      if (vulnT > 0) {
        vulnT -= dt;
        if (vulnT <= 0) f.vuln = 1;
      }
      // burning pizzas lose a slice every 4 s until the flames are smacked out (Mild spares the last one)
      for (const [p, b] of burning) {
        if (p.dead) {
          douse(a, p, true);
          continue;
        }
        b.glow.setPosition(p.x, p.surfaceY);
        b.t -= dt;
        if (crand() < dt * 6) a.fx.burn(p.x + (crand() - 0.5) * p.radius * 1.4, p.surfaceY - 10);
        if (b.t <= 0) {
          b.t = 4;
          hitSoft(a, p, 1, 'BURNING!', '#ff8a3d', heat(a).rank === 0);
          a.sfx('sfx_fire', { volume: 0.7, throttle: 200 });
        }
      }
      // the sword's ring and its window run even if he's stunned mid-raise
      if (sword) {
        const s = sword;
        s.t -= dt;
        const h = heat(a);
        const cx = SWORD_X;
        const cy = SWORD_Y - 190;
        s.ring.clear();
        if (s.stage === 'raise') {
          // a ring closes on the target circle: when it lands, the sword flashes and the window opens
          const total = h.windup(2.2);
          const k = Phaser.Math.Clamp(1 - s.t / total, 0, 1);
          // (starts small enough to stay under the boss bar and the caption)
          const r = 110 + 150 * (1 - k);
          s.ring.lineStyle(14, 0x2a1810, 0.5).strokeCircle(cx, cy, 110);
          s.ring.lineStyle(8, 0xffd23f, 0.9).strokeCircle(cx, cy, 110);
          s.ring.lineStyle(10, 0x2a1810, 0.5).strokeCircle(cx, cy, r);
          s.ring.lineStyle(6, 0xff7a1a, 1).strokeCircle(cx, cy, r);
          s.img.setAngle(Math.sin(a.now() * 30) * 1.5 * k);
          // fired too soon: the meter's spent and the sweep comes anyway
          if (a.now() - a.slammedAt() < 0.05 && !s.early && s.t < total - 0.2) {
            s.early = true;
            caption(a, s.cap, 'TOO EARLY!', '#ff8a6a', 'THE METER’S SPENT: BRACE FOR THE SWEEP');
          }
          if (s.t <= 0) {
            s.stage = 'window';
            s.t = WINDOW[h.rank];
            // the window is open (the dev bot and tests read this)
            f.brain.swordWindow = true;
            s.open = a.now();
            a.sfx('sfx_surtr_window');
            a.flash(140, 255, 255, 230);
            s.img.setTintFill(0xffffff).setAngle(0);
            if (!s.early) caption(a, s.cap, 'NOW!', '#ffffff', '', 84);
          }
        } else if (s.stage === 'window') {
          s.ring.fillStyle(0x7dff9a, 0.25).fillCircle(cx, cy, 110);
          s.ring.lineStyle(14, 0x2a1810, 0.5).strokeCircle(cx, cy, 110);
          s.ring.lineStyle(10, 0x7dff9a, 1).strokeCircle(cx, cy, 110);
          s.rune.setAlpha(1).setScale(0.6 + Math.sin(a.now() * 20) * 0.04);
          if (!s.early && a.slammedAt() >= s.open - 0.02) counter(f, a);
          else if (s.t <= 0) {
            s.stage = 'done';
            finishSword(a);
            if (f.alive && a.inWave()) sweep(f, a);
          }
        }
      }
    },
    update: (f, dt, a) => {
      const h = heat(a);
      // fireballs: all phases (slower once the sword's out)
      // (phase 1: every 5 s, was 4: with a pizza already burning, Regular tables ran dry before phase 2)
      fireball.every = h.cooldown(f.phase >= n ? 6 : f.phase >= 3 ? 3.2 : 5);
      if (!sword && fireball.tick(dt)) {
        const p = rnd(a.alivePizzas());
        if (p) {
          a.sfx('sfx_surtr_fireball');
          laneFall(a, p, {
            key: 'p_fireball',
            scale: 0.8,
            warn: h.windup(0.6),
            fall: h.windup(1.5),
            halfW: 75,
            halfH: 100,
            spin: 0,
            color: 0xff7a1a,
            label: 'PUT OUT!',
            onLand: (q) => {
              a.hitPizza(q, h.slices(1), 'SCORCHED!', '#ff8a3d');
              a.sfx('sfx_surtr_impact');
            },
          }, bin);
        }
      }
      // the bridge burns: a running flame heads for a pizza (middle phases)
      fuse.every = h.cooldown(f.phase >= 3 && f.phase < n ? 6.5 : 8);
      if (f.phase >= 2 && f.phase < n && fuse.tick(dt)) {
        const p = rnd(a.alivePizzas().filter((q) => !burning.has(q)));
        if (p) {
          const fromX = p.x < 960 ? -60 : 1980;
          const st = { x: fromX };
          const speed = [240, 300, 340, 380, 420][h.rank];
          const dur = (Math.abs(p.x - fromX) / speed) * 1000;
          const y = 760;
          let done = false;
          const trail = a.sc.add.graphics();
          a.fxLayer.add(trail);
          const tw = clockOf(a.sc).tween({
            targets: st,
            x: p.x,
            duration: dur,
            onUpdate: () => {
              trail.clear();
              trail.lineStyle(16, 0x2a1810, 0.3).lineBetween(fromX, y + 20, st.x, y + 20);
              trail.lineStyle(9, 0xff7a1a, 0.8).lineBetween(fromX, y + 20, st.x, y + 20);
              if (crand() < 0.5) a.fx.burn(st.x + (crand() - 0.5) * 40, y);
            },
            onComplete: () => {
              if (done) return;
              done = true;
              prop.destroy();
              a.sc.tweens.add({ targets: trail, alpha: 0, duration: 400, onComplete: () => trail.destroy() });
              if (f.alive && a.inWave() && !p.dead) ignite(a, p);
            },
          });
          const prop = hitProp(a, {
            key: 'p_fuse',
            x: fromX,
            y,
            scale: 0.8,
            hits: 1,
            r: 85,
            follow: () => ({ x: st.x, y: y - 10 }),
            badgeDy: -80,
            label: 'STAMPED OUT!',
            clearSfx: 'sfx_surtr_douse',
            onClear: () => {
              done = true;
              tw.remove();
              a.sc.tweens.add({ targets: trail, alpha: 0, duration: 300, onComplete: () => trail.destroy() });
            },
          });
          a.quip(p.x, p.surfaceY - 200, 'THE BRIDGE BURNS!', '#ffb24a', 38);
          a.sfx('sfx_surtr_fuse');
          bin.add(() => {
            done = true;
            tw.remove();
            prop.destroy();
            trail.destroy();
          });
        }
      }
      // the sword: last phase
      swordT.every = h.cooldown(12);
      if (f.phase >= n && !sword && swordT.tick(dt)) startSword(f, a);
    },
    onDeath: (f, a) => {
      finishSword(a);
      bin.flush();
      for (const p of [...burning.keys()]) douse(a, p, true);
      if (!a.inWave()) return;
      a.dramatic(1.5);
      a.flash(500, 255, 160, 60);
      a.shake(1000, 0.016);
      a.sfx('sfx_surtr_death');
      shatter(a, f.cx, f.cy, 'p_fireball', 16, { scale: 0.4, spread: 1800 });
      for (let i = 0; i < 30; i++) a.sc.time.delayedCall(i * 30, () => a.fx.puff(f.cx + (crand() - 0.5) * 300, f.cy + (crand() - 0.5) * 200, 2));
      a.quip(960, 380, 'THE FIRE GOES OUT!', '#ffd23f', 56);
    },
  };
};

export const brains: Record<string, () => Brain> = { fenrir, thrym, jormungandr, surtr };
