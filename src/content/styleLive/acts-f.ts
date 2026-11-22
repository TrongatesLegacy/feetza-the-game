// How batch F's feet move in play (src/game/liveKit.ts): Gotham, comics, heroes, Kratos, Leonidas and the Persians.
// Their art is in src/content/style/acts-f*.ts. Bosses and mini-bosses overheat in their later phases (the heat
// layer glows from the sole up and steam pours off them). Cosmetic randomness only through crand().

import Phaser from 'phaser';
import { CX } from '../../art/feetCommon';
import { footRes } from '../../art/feetArt';
import { FLOWER, VIALS } from '../art/gotham';
import { type LiveFoot, registerLive } from '../../game/liveKit';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import { landDust, overheat } from './bosses';
import { LX, LY } from '../style/acts-f-kit';
import { CHAIN_LINKS, LINK_LEN, TITAN_CUT_GEO, ironLink, kickChain, linkShadow, onTitan, paintCutGlow, paintMagma, restChain, stepChain, titanChainEnds } from '../style/acts-f-3';

const R = () => crand();
const pm = () => crand() - 0.5;
const steamEm = (k: LiveFoot) => k.emitter({ frame: 'soft', curl: 60, drag: 1.1, max: 160 });

/** The art holds still for feet whose fight or act places props on it by the foot's own coordinates (Bunion's vials
 * in their clamps, the Chariot Wheel's spinning wheel): their life comes from everything else. */
const STILL = { swing: 0, squash: 0, breath: 0 };

// ——— Gotham ———

// BUNION (art held still: the fight's vials sit in its clamps): the Venom veins pulse like a heartbeat, green vapour hisses from the hose couplings, venom drips off the
// empty clamps, and every stomp throws dust and a green splash.
registerLive('bunion', {
  rig: STILL,
  glow: { rate: 1.1, depth: 0.55, base: 0.4 },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    vapour: k.emitter({ frame: 'puff', curl: 30, drag: 1.2, max: 60 }),
    drops: k.emitter({ frame: 'drop', drag: 0.3, max: 40 }),
    dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.5, below: true, max: 80 }),
  }),
  tick(k, dt, { steam, vapour, drops, dust }) {
    const s = k.f.type.scale;
    vapour.rate('hiss', 2.2, dt, () => {
      const x = [CX - 50, CX + 50, CX + 34][Math.floor(R() * 3)];
      vapour.emit(x, 20, { vx: pm() * 30, vy: -30 - R() * 30, life: 1.1, r0: 4 * s, r1: 20 * s, a: 0.3, tint: 0x9dff8a, fade: 0.15 });
    });
    drops.rate('drip', 0.9, dt, () => {
      const [vx, vy] = VIALS[Math.floor(R() * 3)];
      drops.emit(vx + pm() * 10, vy + 48, { vy: 30, life: 0.9, r0: 4 * s, r1: 3 * s, a: 0.9, tint: 0x7dff6a, grav: 700, fade: 0.04 });
    });
    if (k.landed) for (let i = 0, n = k.burst(10); i < n; i++) drops.emit(CX + pm() * 200, 262, { vx: pm() * 300, vy: -120 - R() * 200, life: 0.7, r0: 4 * s, r1: 2.5 * s, a: 0.9, tint: 0x7dff6a, grav: 900, fade: 0.03 });
    landDust(k, dust, 14, [0x8a8a90, 0x6a6a70], 268, 110, 1.2);
    overheat(k, steam, dt, [CX - 90, 20, 180, 200]);
  },
});

// THE JOKESTER: his eyes follow your peel and blink, the pompom bobs on the curled toe, a wisp of green gas curls
// out of the lapel flower now and then, and confetti spills off him (a shower of it on every stomp).
const CONFETTI = [0x9be23a, 0x8a4ad0, 0xe0202a, 0xf2c14e, 0xffffff];
registerLive('jokester', {
  rig: { swing: 1.2, squash: 1.1 },
  sway: { pom: { k: 40, c: 3.2, gain: 1.6, idle: 0.2, flop: 1.4 } },
  blink: { eyes: { every: 2.6, look: 2.2 } },
  glow: { rate: 0.8, depth: 0.5, base: 0.3 },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    gas: k.emitter({ frame: 'puff', curl: 50, drag: 1, max: 40 }),
    confetti: k.emitter({ frame: 'flake', drag: 0.9, max: 90 }),
  }),
  tick(k, dt, { steam, gas, confetti }) {
    const s = k.f.type.scale;
    gas.rate('wisp', 0.9, dt, () => {
      gas.emit(FLOWER.x + 6, FLOWER.y - 6, { vx: 20 + R() * 30, vy: -20 - R() * 20, life: 1.6, r0: 4 * s, r1: 22 * s, a: 0.28, tint: R() < 0.6 ? 0xb6f07a : 0xc8a0f0, fade: 0.2 });
    });
    const bit = (x: number, y: number, p: number) =>
      confetti.emit(x, y, { vx: pm() * 260 * p, vy: -60 - R() * 220 * p, life: 1.4, r0: 4 * s, r1: 3.5 * s, a: 1, tint: CONFETTI[Math.floor(R() * CONFETTI.length)], grav: 260, spin: 12, fade: 0.02 });
    confetti.rate('spill', 1.2, dt, () => bit(CX + pm() * 160, 120 + R() * 120, 0.3));
    if (k.landed) for (let i = 0, n = k.burst(22); i < n; i++) bit(CX + pm() * 220, 250, 1.3);
    overheat(k, steam, dt, [CX - 80, 20, 200, 220]);
  },
});

// ——— The comic heroes' nemeses ———

// THE RED SOLE: a stiff military march (little swing), the skull's sockets smoulder, a glint runs down the mirror
// patent now and then, and his hobnailed heels strike sparks on every stomp.
registerLive('redsole', {
  rig: { swing: 0.45, squash: 0.9 },
  glow: { rate: 0.7, depth: 0.6, base: 0.35 },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    sparks: k.emitter({ frame: 'spark', add: true, drag: 1.2, max: 40 }),
    shine: k.emitter({ frame: 'spark', add: true, drag: 0.2, max: 10 }),
    dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.5, below: true, max: 60 }),
  }),
  tick(k, dt, { steam, sparks, shine, dust }) {
    const s = k.f.type.scale;
    shine.rate('glint', 0.7, dt, () => shine.emit(CX - 46 + R() * 8, 50 + R() * 70, { vy: 40, life: 0.5, r0: 2, r1: 16 * s, a: 0.9, tint: 0xe8eeff, fade: 0.4 }));
    if (k.landed)
      for (let i = 0, n = k.burst(14); i < n; i++) {
        const side = R() < 0.5 ? -1 : 1;
        sparks.emit(CX + side * (60 + R() * 40), 266, { vx: side * (120 + R() * 300), vy: -80 - R() * 200, life: 0.35 + R() * 0.25, r0: 3, r1: 10 * s, a: 1, tint: R() < 0.5 ? 0xffd27a : 0xfff4d0, grav: 900, fade: 0.05 });
      }
    landDust(k, dust, 10, [0x8a8a90, 0x6a6a70], 266, 100);
    overheat(k, steam, dt, [CX - 70, 20, 140, 200]);
  },
});

// VENOMNOM: the goo never stops moving: its tendrils whip, its eyes narrow and follow your peel, its tongue licks
// out (its tell), drool strings off its teeth and black goo drips from the lobes under it.
registerLive('venomnom', {
  // a gentle swing: the fight's tongue lashes out of the mouth at NOM_MOUTH
  rig: { swing: 0.45, squash: 1.1, breath: 1.8 },
  sway: {
    tendL: { k: 26, c: 2.6, gain: 1.6, idle: 0.3, flop: 1.2 },
    tendR: { k: 24, c: 2.4, gain: 1.6, idle: 0.3, flop: 1.2 },
  },
  blink: { eyes: { every: 2.4, look: 2.6 } },
  twitch: { tongue: { every: 1.8 } },
  glow: { rate: 0.9, depth: 0.5, base: 0.35 },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    goo: k.emitter({ frame: 'drop', drag: 0.3, max: 40 }),
    drool: k.emitter({ frame: 'drop', drag: 0.4, max: 30 }),
  }),
  tick(k, dt, { steam, goo, drool }) {
    const s = k.f.type.scale;
    goo.rate('drip', 1.6, dt, () => {
      const x = [CX - 54, CX + 36, CX - 84, CX + 80][Math.floor(R() * 4)];
      goo.emit(x, 268, { vy: 20, life: 1, r0: 6 * s, r1: 4 * s, a: 0.95, tint: 0x2a2840, grav: 650, fade: 0.04 });
    });
    drool.rate('drool', 1.2, dt, () => drool.emit(CX + pm() * 120, 214, { vy: 10, life: 0.9, r0: 3.5 * s, r1: 2.5 * s, a: 0.8, tint: 0xe8d8f0, grav: 500, fade: 0.05 }));
    if (k.landed) for (let i = 0, n = k.burst(12); i < n; i++) goo.emit(CX + pm() * 220, 262, { vx: pm() * 360, vy: -100 - R() * 220, life: 0.8, r0: 6 * s, r1: 4 * s, a: 0.95, tint: 0x24223a, grav: 900, fade: 0.03 });
    overheat(k, steam, dt, [CX - 80, 20, 160, 200], 0xf0d8f0);
  },
});

// ——— Hero feet ———

// Bat Feet: the wings beat (and flare as it winds up to swoop), the toes flex their claws, and a pair of little bats
// flit round it.
registerLive('batfeet', {
  wiggle: true,
  rig: { swing: 1.4 },
  sway: {
    wingL: { k: 30, c: 2.2, gain: 1.4, idle: 0.22, below: true, flop: 1.4 },
    wingR: { k: 30, c: 2.2, gain: -1.4, idle: 0.22, below: true, flop: -1.4 },
  },
  setup(k) {
    const key = k.sheet('lk_af_bat', 64, 40, 3, (ctx, i) => {
      ctx.translate(32, 20);
      const up = [-10, 2, 10][i];
      ctx.fillStyle = '#1a1022';
      ctx.beginPath();
      for (const s of [-1, 1]) {
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(s * 14, up - 6, s * 28, up);
        ctx.quadraticCurveTo(s * 20, up * 0.3 + 6, s * 14, 4);
        ctx.quadraticCurveTo(s * 8, 8, 0, 4);
      }
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 2, 4, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff6a8a';
      ctx.fillRect(-2.5, -1, 1.6, 1.6);
      ctx.fillRect(1, -1, 1.6, 1.6);
    });
    return { bats: k.swarm({ key, frames: 3, count: 2, at: [CX, 90], rx: 150, ry: 110, speed: 1.8, jitter: 18, scale: 0.7 }), beat: { t: 0 }, wl: k.swayImg('wingL'), wr: k.swayImg('wingR') };
  },
  tick(k, dt, { bats, beat, wl, wr }) {
    const fast = k.windingUp || k.f.state === 'descend';
    bats.pace = fast ? 1.8 : 1;
    // the wings beat: slow and lazy while it hangs, hard and fast in a swoop (the springs still add the drag)
    beat.t += dt * (fast ? 16 : 5);
    const amp = (fast ? 0.32 : 0.12) * (save.settings.reducedMotion ? 0.3 : 1);
    const w = Math.sin(beat.t) * amp;
    if (wl) wl.rotation += w;
    if (wr) wr.rotation -= w;
  },
});

// Spider Socks: the spider legs skitter, the toes wiggle, and dew glints run along the web.
registerLive('spidersocks', {
  wiggle: true,
  rig: { swing: 1.1 },
  sway: {
    legsL: { k: 70, c: 4, gain: 1, idle: 0.16, below: true },
    legsR: { k: 70, c: 4, gain: -1, idle: 0.16, below: true },
  },
  setup: (k) => ({ dew: k.emitter({ frame: 'spark', add: true, drag: 0.2, max: 10 }) }),
  tick(k, dt, { dew }) {
    dew.rate('dew', 1.4, dt, () => {
      const a = R() * Math.PI * 2;
      const r = 16 + R() * 54;
      dew.emit(CX + 4 + Math.cos(a) * r, 112 + Math.sin(a) * r * 0.87, { life: 0.4, r0: 2, r1: 10 * k.f.type.scale, a: 0.9, tint: 0xf4f0ff, fade: 0.4 });
    });
  },
});

// ——— Kratos's nemeses ———

// KRONOS THE TITAN KING (art: src/content/style/acts-f-3.ts). His chains are real chains: each one a verlet rope
// pinned to the shackle's eye and to the iron cuff on its toe (following the toe as it curls), pulled by gravity and
// by the foot's own moves, so they swing out behind a dash, float up as he dives, slam down and bounce when he lands
// and draw taut and rattle as he winds up. The magma in his three gashes flows (looping frames, cross-faded), glows
// on the rig's light twin, and every few seconds a gash swells bright and spits a spurt of molten droplets and
// embers that arc up and fall; a landing makes all three erupt. Gold sand trickles from the hourglass, grit crumbles
// off him, stone dust flies when he lands; overheated he steams and the gashes spit more often.
const TITAN_FLOW_N = 10;

registerLive('titanking', {
  rig: { swing: 0.6, squash: 1.2, breath: 1.4 },
  glow: { rate: 0.5, depth: 0.4, base: 0.4 },
  heat: {},
  setup(k) {
    const f = k.f;
    const ts = f.type.scale;
    const res = footRes(f.type);
    const tex = ts * res;
    const at = (dx: number, dy: number): [number, number] => [(dx - CX) * ts, (dy - f.meta.footHeight) * ts];
    const sheet = (key: string, b: { x: number; y: number; w: number; h: number }, n: number, draw: (g: CanvasRenderingContext2D, i: number) => void) =>
      k.sheet(key, Math.ceil(b.w * tex), Math.ceil(b.h * tex), n, (g, i) => {
        g.scale(tex, tex);
        g.translate(-b.x, -b.y);
        draw(g, i);
      });
    const img = (key: string, dx: number, dy: number, ox: number, oy: number, additive = false) => {
      const [x, y] = at(dx, dy);
      const o = k.sc.add.image(x, y, key, 0).setOrigin(ox, oy).setScale(1 / res);
      if (additive) o.setBlendMode(Phaser.BlendModes.ADD);
      f.addLiveArt(o, false, additive);
      return o;
    };
    // the gashes: the melt's flow frames (two images cross-fading), and the light each one throws
    const cuts = TITAN_CUT_GEO.map((c, i) => {
      const flowKey = sheet(`lk_titanking_flow${i}`, c.box, TITAN_FLOW_N, (g, j) => paintMagma(g, c, j / TITAN_FLOW_N));
      const glowKey = sheet(`lk_titanking_cutglow${i}`, c.glowBox, 1, (g) => paintCutGlow(g, c));
      const a = img(flowKey, c.box.x, c.box.y, 0, 0);
      const b = img(flowKey, c.box.x, c.box.y, 0, 0);
      const glow = img(glowKey, c.glowBox.x, c.glowBox.y, 0, 0, true);
      return { c, a, b, glow, flow: R() * 10, speed: 0.8 + R() * 0.4, surge: 0, spitT: 1.2 + i * 1.3 + R() * 2.5 };
    });
    // the chains: baked links (face-on rings, edge-on bars) and their shadows, turned to lie along the rope
    const pad = LINK_LEN / 2 + 4;
    const linkBox = { x: -pad, y: -pad, w: pad * 2, h: pad * 2 };
    const faceKey = sheet('lk_titanking_linkF', linkBox, 1, (g) => ironLink(g, 0, 0, 0, true, Math.PI / 2));
    const edgeKey = sheet('lk_titanking_linkE', linkBox, 1, (g) => ironLink(g, 0, 0, 0, false, Math.PI / 2));
    const shadowKey = sheet('lk_titanking_linkS', linkBox, 1, (g) => linkShadow(g, 0, 0, 0));
    const sims = [-1, 1].map((s) => restChain(s, 0));
    const shadows = sims.map((c) => c.p.slice(1).map(() => img(shadowKey, CX, 0, 0.5, 0.5)));
    // face-on links under the edge-on ones, so they read as threaded through each other
    const linkImgs = sims.map(() => [] as Phaser.GameObjects.Image[]);
    for (const face of [true, false])
      for (const ls of linkImgs)
        for (let i = 0; i < CHAIN_LINKS; i++) if ((i % 2 === 0) === face) ls[i] = img(face ? faceKey : edgeKey, CX, 0, 0.5, 0.5);
    return {
      at,
      cuts,
      sims,
      shadows,
      linkImgs,
      lvx: 0,
      lvy: 0,
      ax: 0,
      ay: 0,
      steam: steamEm(k),
      // molten droplets: painted (they hold their colour over a bright backdrop), each with a halo of light
      melt: k.emitter({ frame: 'puff', drag: 0.15, max: 160 }),
      halo: k.emitter({ frame: 'soft', add: true, drag: 0.15, max: 120 }),
      jet: k.emitter({ frame: 'soft', add: true, curl: 30, drag: 1.4, max: 60 }),
      embers: k.emitter({ frame: 'ember', add: true, curl: 50, drag: 0.7, max: 80 }),
      smoke: k.emitter({ frame: 'puff', curl: 40, drag: 0.9, below: true, max: 60 }),
      sparks: k.emitter({ frame: 'spark', add: true, drag: 0.8, max: 40 }),
      sand: k.emitter({ frame: 'mote', add: true, drag: 0.3, max: 40 }),
      grit: k.emitter({ frame: 'flake', drag: 0.3, max: 40 }),
      dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.5, below: true, max: 80 }),
    };
  },
  tick(k, dt, st) {
    const f = k.f;
    const s = f.type.scale;
    const calm = save.settings.reducedMotion ? 0.35 : 1;
    const vis = f.visualAlpha;
    const winding = k.windingUp;
    // ——— the chains ———
    // the foot's acceleration (world px/s², from the kit's already smoothed velocity, smoothed again) in design
    // units: the chains feel it reversed. A teleport spikes it for a frame; the clamp keeps that sane
    const step = Math.max(dt, 1 / 240);
    const k2 = s * Math.max(0.2, f.root.scaleX);
    st.ax += ((k.vx - st.lvx) / step / k2 - st.ax) * 0.5;
    st.ay += ((k.vy - st.lvy) / step / k2 - st.ay) * 0.5;
    st.lvx = k.vx;
    st.lvy = k.vy;
    const cl = (v: number) => Phaser.Math.Clamp(v, -5000, 5000);
    for (const c of st.sims) {
      const [a, b] = titanChainEnds(c.s, k.toeCurl);
      // he stops dead; the chains keep falling, slam onto the foot and bounce
      if (k.landed) kickChain(c, () => c.s * 0.8 * calm, (t) => (2.2 + Math.sin(t * Math.PI) * 2.6) * calm);
      // winding up he strains: the chains draw taut and the links rattle
      stepChain(c, a, b, -cl(st.ax) * calm, -cl(st.ay) * calm, dt, 0.985, winding ? 0.92 : 1, winding ? () => pm() * 0.18 * calm : undefined);
    }
    st.sims.forEach((c, ci) => {
      for (let i = 0; i < c.p.length - 1; i++) {
        const [x0, y0] = c.p[i];
        const [x1, y1] = c.p[i + 1];
        const mx = (x0 + x1) / 2;
        const my = (y0 + y1) / 2;
        const ang = Math.atan2(y1 - y0, x1 - x0);
        const [lx, ly] = st.at(mx, my);
        st.linkImgs[ci][i].setPosition(lx, ly).setRotation(ang);
        const [sx, sy] = st.at(mx - LX * 4, my - LY * 4);
        st.shadows[ci][i].setPosition(sx, sy).setRotation(ang).setAlpha(onTitan(mx, my) * vis);
      }
    });
    if (k.landed)
      for (const c of st.sims) {
        const e = c.p[c.p.length - 1];
        for (let i = 0, m = k.burst(6); i < m; i++) st.sparks.emit(e[0] + pm() * 8, e[1] - 4, { vx: pm() * 360, vy: -80 - R() * 200, life: 0.25 + R() * 0.2, r0: 6 * s, r1: 1 * s, a: 1, tint: R() < 0.5 ? 0xfff0c0 : 0xffb050, spin: 4, grav: 600, fade: 0.02 });
      }
    // ——— the magma ———
    const spurt = (cut: (typeof st.cuts)[number], big: number) => {
      const c = cut.c;
      for (let j = 0, m = Math.max(1, Math.round(big)); j < m; j++) {
        // somewhere in the wide middle of the gash
        const t = 0.22 + R() * 0.56;
        const i = Math.min(c.mid.length - 1, Math.round(t * (c.mid.length - 1)));
        const [x, y] = c.mid[i];
        const [nx] = c.nrm[i];
        const lean = nx * 160 + pm() * 120;
        for (let q = 0, n = k.burst(11 + Math.round(big * 4)); q < n; q++) {
          const pw = 0.55 + R() * 0.6;
          const d = { vx: lean + pm() * 420 * pw, vy: -(420 + R() * 360) * pw * (0.8 + big * 0.2), life: 1.3 + R() * 0.6, grav: 1150, fade: 0.02 };
          const r0 = (6 + R() * 5) * s;
          // a droplet cools as it flies: yellow-white, orange, then dull red
          st.melt.emit(x + pm() * 6, y, { ...d, r0, r1: r0 * 0.5, a: 1, tint: R() < 0.3 ? 0xffe890 : R() < 0.75 ? 0xff9a20 : 0xff5a10 });
          if (q % 2 === 0) st.halo.emit(x + pm() * 6, y, { ...d, r0: r0 * 2.6, r1: r0 * 1.4, a: 0.5, tint: 0xff7a1a });
        }
        // a short fiery jet straight up out of the gash
        for (let q = 0, n = k.burst(5); q < n; q++) st.jet.emit(x + pm() * 8, y - 2, { vx: lean * 0.3 + pm() * 40, vy: -(220 + R() * 160) * (0.8 + big * 0.2), life: 0.35 + R() * 0.2, r0: 12 * s, r1: 30 * s, a: 0.75, tint: R() < 0.5 ? 0xffc040 : 0xff6a14, fade: 0.05 });
        for (let q = 0, n = k.burst(6); q < n; q++) st.embers.emit(x + pm() * 10, y - 2, { vx: pm() * 70, vy: -90 - R() * 120, life: 1 + R() * 0.8, r0: 2.6 * s, r1: 0.8 * s, a: 1, tint: R() < 0.5 ? 0xffc060 : 0xff7a2a, grav: -50, fade: 0.05 });
        st.smoke.emit(x, y - 6, { vx: pm() * 20, vy: -50 - R() * 30, life: 1.4 + R() * 0.6, r0: 8 * s, r1: 30 * s, a: 0.28, tint: 0x2a2224, grav: -20, fade: 0.2 });
      }
      cut.surge = 1;
    };
    st.cuts.forEach((cut, i) => {
      const c = cut.c;
      // the melt flows (faster when he's hot), one loop frame cross-fading into the next
      cut.flow += dt * cut.speed * (1 + k.heat * 1.2) * (0.5 + 0.5 * calm) * 6;
      const fi = Math.floor(cut.flow) % TITAN_FLOW_N;
      cut.a.setFrame(fi);
      cut.b.setFrame((fi + 1) % TITAN_FLOW_N).setAlpha((cut.flow - Math.floor(cut.flow)) * vis);
      // a spit: the gash swells and bubbles for a moment first, then throws its spurt
      cut.spitT -= dt * (1 + k.heat * 1.5);
      const swell = cut.spitT < 0.45 ? 1 - Math.max(0, cut.spitT) / 0.45 : 0;
      if (swell > 0) st.sparks.rate(`bub${i}`, 14 * swell, dt, () => {
        const p = c.mid[Math.floor((0.25 + R() * 0.5) * (c.mid.length - 1))];
        st.sparks.emit(p[0] + pm() * 6, p[1], { vx: pm() * 50, vy: -40 - R() * 60, life: 0.25, r0: 3 * s, r1: 0.5 * s, a: 1, tint: 0xffe08a, grav: 300, fade: 0.1 });
      });
      if (cut.spitT <= 0) {
        cut.spitT = 2.6 + R() * 3.4;
        spurt(cut, 1);
      }
      if (k.landed) spurt(cut, 1.8);
      cut.surge = Math.max(0, cut.surge - dt * 1.6);
      const pulse = 0.5 + 0.5 * Math.sin(k.t * (1.6 + i * 0.37) + i * 2);
      const glow = 0.3 + pulse * 0.16 * calm + swell * 0.35 + cut.surge * 0.5 + (winding ? 0.3 : 0) + k.heat * 0.3;
      cut.glow.setAlpha(Math.min(1, glow) * vis);
      // a thin rain of embers off it, and now and then a drip off its lower lip
      st.embers.rate(`e${i}`, (1.4 + k.heat * 3) * calm, dt, () => {
        const p = c.mid[Math.floor((0.15 + R() * 0.7) * (c.mid.length - 1))];
        st.embers.emit(p[0] + pm() * 4, p[1] - 2, { vx: pm() * 30, vy: -40 - R() * 50, life: 1.1, r0: 2.6 * s, r1: 1 * s, a: 1, tint: R() < 0.5 ? 0xff8a20 : 0xffc040, grav: -20, fade: 0.1 });
      });
      st.melt.rate(`d${i}`, 0.5 + k.heat, dt, () => {
        const j = Math.floor((0.3 + R() * 0.4) * (c.mid.length - 1));
        const [x, y] = c.mid[j];
        st.melt.emit(x + pm() * 4, y + c.half[j] * 0.8, { vy: 30, life: 0.9, r0: 2.6 * s, r1: 1.8 * s, a: 1, tint: 0xff8a1a, grav: 800, fade: 0.02 });
      });
    });
    // ——— the rest ———
    st.sand.rate('sand', 6, dt, () => st.sand.emit(CX + pm() * 3, 64, { vy: 40, life: 0.8, r0: 2 * s, r1: 1.5 * s, a: 0.9, tint: 0xf0c860, grav: 300, fade: 0.05 }));
    st.grit.rate('grit', 1.2 + Math.abs(k.vx) / 60, dt, () => st.grit.emit(CX + pm() * 190, 60 + R() * 180, { vx: pm() * 30, life: 0.9, r0: 3 * s, r1: 2.5 * s, a: 1, tint: R() < 0.5 ? 0x8e8a84 : 0x6a665e, grav: 800, spin: 8, fade: 0.02 }));
    landDust(k, st.dust, 16, [0x9a968e, 0x7a766e], 266, 110, 1.2);
    overheat(k, st.steam, dt, [CX - 90, 30, 180, 200]);
  },
});

// ZEUS: static crackles over the marble and arcs between the gold straps, the bolt on his medallion flickers like a
// live wire, his anklet's wings flutter and his toes curl; every stomp throws a crack of lightning sparks.
registerLive('zeus', {
  wiggle: true,
  rig: { swing: 0.7, squash: 1, breath: 1.2 },
  sway: {
    wingL: { k: 50, c: 3, gain: 1, idle: 0.25 },
    wingR: { k: 50, c: 3, gain: -1, idle: 0.25 },
  },
  glow: { rate: 2.6, depth: 0.6, base: 0.5 },
  heat: { boost: 0 },
  setup: (k) => ({
    steam: steamEm(k),
    arcs: k.emitter({ frame: 'spark', add: true, drag: 1.4, max: 60 }),
    motes: k.emitter({ frame: 'mote', add: true, curl: 60, drag: 1, max: 40 }),
  }),
  tick(k, dt, { steam, arcs, motes }) {
    const s = k.f.type.scale;
    const zap = (x: number, y: number, p: number) => arcs.emit(x, y, { vx: pm() * 400 * p, vy: pm() * 400 * p, life: 0.12 + R() * 0.12, r0: 2, r1: 14 * s, a: 1, tint: R() < 0.5 ? 0x9fd8ff : 0xffffff, spin: 30, fade: 0.1 });
    arcs.rate('static', 6 + k.heat * 10, dt, () => zap(CX + pm() * 180, 40 + R() * 200, 0.4));
    motes.rate('motes', 2, dt, () => motes.emit(CX + pm() * 160, 60 + R() * 160, { vy: -20, life: 1.4, r0: 2 * s, r1: 4 * s, a: 0.8, tint: 0xbfe6ff, fade: 0.3 }));
    if (k.landed) for (let i = 0, n = k.burst(20); i < n; i++) zap(CX + pm() * 200, 262, 1.4);
    overheat(k, steam, dt, [CX - 90, 30, 180, 200]);
  },
});

// THE CHEETOE: her tail lashes, her eyes follow your peel and her whiskers twitch, cheese dust sparkles off her coat
// and streams behind her when she runs; her claws glint before a pounce.
registerLive('cheetoe', {
  rig: { swing: 1.4, squash: 1.2 },
  sway: { tail: { k: 22, c: 2.2, gain: 2, idle: 0.32, below: true, flop: 1.2 } },
  blink: { eyes: { every: 3, look: 2.4 } },
  twitch: { whiskers: { every: 1.4 } },
  glow: { rate: 0.5, depth: 0.4, base: 0.25 },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    dust: k.emitter({ frame: 'mote', add: true, curl: 40, drag: 1, max: 80 }),
    glint: k.emitter({ frame: 'spark', add: true, drag: 0.2, max: 12 }),
  }),
  tick(k, dt, { steam, dust, glint }) {
    const s = k.f.type.scale;
    const fast = Math.min(30, Math.abs(k.vx) / 18);
    dust.rate('cheese', 3 + fast, dt, () =>
      dust.emit(CX + pm() * 180, 20 + R() * 220, { vx: -Math.sign(k.vx) * fast * 6 + pm() * 30, vy: -10 - R() * 20, life: 1.2, r0: 3 * s, r1: 6 * s, a: 0.7, tint: R() < 0.5 ? 0xffb030 : 0xffe080, fade: 0.2 }),
    );
    if (k.windingUp) glint.rate('claw', 6, dt, () => glint.emit(CX + pm() * 100, 268, { life: 0.3, r0: 2, r1: 14 * s, a: 1, tint: 0xffffff, fade: 0.4 }));
    overheat(k, steam, dt, [CX - 80, 20, 160, 200]);
  },
});

// ——— The Hot Gates and the Persian army (the Immortals keep their own live art in src/game/footLive.ts) ———

// XERXES: his gold chains swing across the instep, glints chase over the gold, gold dust drifts off him like incense,
// the ruby pulses and the toes curl in their gold caps.
registerLive('xerxes', {
  wiggle: true,
  rig: { swing: 0.6, squash: 0.9, breath: 1.2 },
  sway: { drape: { k: 22, c: 2, gain: 1.4, idle: 0.14, flop: 1.2 } },
  glow: { rate: 0.6, depth: 0.5, base: 0.45 },
  heat: {},
  setup: (k) => ({
    steam: steamEm(k),
    glint: k.emitter({ frame: 'spark', add: true, drag: 0.2, max: 20 }),
    dust: k.emitter({ frame: 'mote', add: true, curl: 30, drag: 0.8, max: 60 }),
  }),
  tick(k, dt, { steam, glint, dust }) {
    const s = k.f.type.scale;
    glint.rate('gold', 3.5, dt, () => {
      const spots: [number, number][] = [[CX, 22], [CX + 4, 126], [CX - 60, 236], [CX + 80, 236], [CX - 30, 150], [CX + 40, 170]];
      const [x, y] = spots[Math.floor(R() * spots.length)];
      glint.emit(x + pm() * 20, y + pm() * 14, { life: 0.4, r0: 2, r1: 14 * s, a: 1, tint: 0xfff0b0, fade: 0.4 });
    });
    dust.rate('incense', 3, dt, () => dust.emit(CX + pm() * 200, 80 + R() * 180, { vx: pm() * 20, vy: -14 - R() * 16, life: 1.8, r0: 2 * s, r1: 3.5 * s, a: 0.7, tint: R() < 0.5 ? 0xffd870 : 0xfff4c8, fade: 0.3 }));
    overheat(k, steam, dt, [CX - 90, 30, 180, 200]);
  },
});

// Archer Slippers: the quiver swings at its strap and a puff of dust lifts off the soft soles.
registerLive('archer', {
  rig: { swing: 1.2 },
  sway: { quiver: { k: 30, c: 2.6, gain: 1.4, idle: 0.1, below: true, flop: 1 } },
  setup: (k) => ({ dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.5, below: true, max: 40 }) }),
  tick(k, _dt, { dust }) {
    landDust(k, dust, 6, [0xc8a878, 0xa88a60], 254, 70, 0.7);
  },
});

// Cavalry Hooves: the saddle-cloth tassels swing one by one, dust streams off the hoof as it gallops sideways and
// the bronze shoe strikes sparks when it lands.
registerLive('cavalry', {
  rig: { swing: 1.6, squash: 1.2 },
  sway: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((i) => [`t${i}`, { k: 40 + i * 3, c: 2.4, gain: 1.6, idle: 0.2 }])),
  setup: (k) => ({
    dust: k.emitter({ frame: 'puff', curl: 40, drag: 1.4, below: true, max: 80 }),
    sparks: k.emitter({ frame: 'spark', add: true, drag: 1.2, max: 20 }),
  }),
  tick(k, dt, { dust, sparks }) {
    const s = k.f.type.scale;
    const run = Math.abs(k.vx);
    if (run > 120) dust.rate('gallop', Math.min(30, run / 20), dt, () => dust.emit(CX + pm() * 120, 260, { vx: -Math.sign(k.vx) * (60 + R() * 120), vy: -20 - R() * 60, life: 0.8, r0: 8 * s, r1: 26 * s, a: 0.4, tint: R() < 0.5 ? 0xc8a878 : 0xa88a60, fade: 0.08 }));
    if (k.landed) for (let i = 0, n = k.burst(8); i < n; i++) sparks.emit(CX + pm() * 160, 262, { vx: pm() * 400, vy: -60 - R() * 160, life: 0.3, r0: 2, r1: 9 * s, a: 1, tint: 0xffd27a, grav: 800, fade: 0.05 });
    landDust(k, dust, 10, [0xc8a878, 0xa88a60], 262, 90);
  },
});

// Chariot Wheel (art held still under the act's spinning wheel prop): glints run over the bronze greave and road dust drifts off the boot (its wheel is the game's prop,
// which spins and kicks up its own dust).
registerLive('chariot', {
  rig: STILL,
  setup: (k) => ({
    glint: k.emitter({ frame: 'spark', add: true, drag: 0.2, max: 10 }),
    dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.5, below: true, max: 40 }),
  }),
  tick(k, dt, { glint, dust }) {
    glint.rate('bronze', 1.4, dt, () => glint.emit(40 + R() * 140, 4 + R() * 80, { life: 0.4, r0: 2, r1: 14 * k.f.type.scale, a: 0.9, tint: 0xfff0c0, fade: 0.4 }));
    landDust(k, dust, 8, [0xc8a878, 0xa88a60], 254, 80);
  },
});

// Satrap's Slipper: the ruby glows and pulses, and gold glints run over the brocade, pearls and embroidery.
registerLive('satrap', {
  rig: { swing: 1 },
  glow: { rate: 0.8, depth: 0.5, base: 0.4 },
  setup: (k) => ({ glint: k.emitter({ frame: 'spark', add: true, drag: 0.2, max: 16 }) }),
  tick(k, dt, { glint }) {
    glint.rate('gold', 2.5, dt, () => glint.emit(30 + R() * 160, 30 + R() * 190, { life: 0.4, r0: 2, r1: 12 * k.f.type.scale, a: 0.9, tint: R() < 0.6 ? 0xfff0b0 : 0xffffff, fade: 0.4 }));
  },
});
