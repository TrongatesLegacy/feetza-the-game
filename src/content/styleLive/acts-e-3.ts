// How the Act 10 finale fights move in play (src/game/liveKit.ts). Their art is in src/content/style/acts-e-3.ts.
// All four overheat in their later phases: the heat layer glows from the sole up (automatic for bosses and
// mini-bosses) and steam pours off them (overheat()).

import Phaser from 'phaser';
import { CX } from '../../art/feetCommon';
import { footRes } from '../../art/feetArt';
import { type LiveFoot, registerLive } from '../../game/liveKit';
import { crand } from '../../systems/cosmeticRandom';
import { save } from '../../systems/save';
import { landDust, overheat } from './bosses';
import { GF_CLOCK, MP_CRACKS, MP_SHEEN_BOX, UNBOUND_CRACKS, ghostHand, ghostSilPaths, mirrorSheen } from '../style/acts-e-3';

const R = () => crand();
const pm = () => crand() - 0.5;
const calm = () => (save.settings.reducedMotion ? 0.35 : 1);

const steamEm = (k: LiveFoot) => k.emitter({ frame: 'soft', curl: 60, drag: 1.1, max: 160 });

/** An image of the live layer at a design point, on the rig (it swings and squashes with the foot). Its texture is
 * drawn at `res` texels per design unit. */
function rigImg(k: LiveFoot, key: string, dx: number, dy: number, ox: number, oy: number, texRes: number): Phaser.GameObjects.Image {
  const f = k.f;
  const ts = f.type.scale;
  const img = k.sc.add.image((dx - CX) * ts, (dy - f.meta.footHeight) * ts, key, 0).setOrigin(ox, oy).setScale(1 / texRes);
  f.addLiveArt(img, false);
  return img;
}

/** A texture sheet painted in design units (box x0, y0, w, h) at `res` texels per unit of the foot's scale. */
function designSheet(k: LiveFoot, key: string, box: [number, number, number, number], n: number, res: number, draw: (g: CanvasRenderingContext2D, i: number) => void): string {
  const s = k.f.type.scale * res;
  const [x0, y0, w, h] = box;
  return k.sheet(key, Math.ceil(w * s), Math.ceil(h * s), n, (g, i) => {
    g.scale(s, s);
    g.translate(-x0, -y0);
    draw(g, i);
  });
}

/** A random point along a polyline. */
function onLine(pts: [number, number][]): [number, number] {
  const i = Math.floor(R() * (pts.length - 1));
  const t = R();
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t];
}

// THE MIRROR PEEL: its eyes blink and follow your peel, the violet glow round the glass pulses, a glint sweeps across
// the mirror every few seconds, the cracks glint, glass shards flake off it and a stomp throws a spray of them.
const SHEEN_N = 8;
registerLive('mirrorpeel', {
  rig: { swing: 0.7, squash: 0.6, breath: 1 },
  blink: { eyes: { every: 3, look: 3 } },
  glow: { rate: 0.5, depth: 0.4, base: 0.5 },
  heat: {},
  setup(k) {
    const res = 0.8;
    const key = designSheet(k, 'lk_mirrorpeel_sheen', MP_SHEEN_BOX, SHEEN_N, res, (g, i) => mirrorSheen(g, i, SHEEN_N));
    const sheen = rigImg(k, key, MP_SHEEN_BOX[0], MP_SHEEN_BOX[1], 0, 0, res).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    return {
      sheen,
      sw: { t: -1, next: 1 + R() * 2 },
      steam: steamEm(k),
      glints: k.emitter({ frame: 'spark', add: true, drag: 0, max: 24 }),
      shards: k.emitter({ frame: 'flake', drag: 0.5, max: 80 }),
      sparks: k.emitter({ frame: 'mote', add: true, curl: 40, drag: 0.8, max: 40 }),
    };
  },
  tick(k, dt, s) {
    const sc = k.f.type.scale;
    // the sweep: a glint crosses the glass, faster as it winds up
    const sw = s.sw;
    sw.next -= dt * (k.windingUp ? 3 : 1);
    if (sw.t < 0 && sw.next <= 0) {
      sw.t = 0;
      sw.next = 2.8 + R() * 2.4;
    }
    if (sw.t >= 0) {
      sw.t += dt / 0.65;
      if (sw.t >= 1) {
        sw.t = -1;
        s.sheen.setAlpha(0);
      } else {
        s.sheen.setFrame(Math.min(SHEEN_N - 1, Math.floor(sw.t * SHEEN_N)));
        s.sheen.setAlpha(Math.sin(sw.t * Math.PI) * calm());
      }
    }
    s.glints.rate('crack', 1.6, dt, () => {
      const [x, y] = onLine(MP_CRACKS[Math.floor(R() * MP_CRACKS.length)]);
      s.glints.emit(x, y, { life: 0.35, r0: 10 * sc, r1: 1 * sc, a: 0.95, tint: R() < 0.6 ? 0xffffff : 0xd8b8ff, spin: 2, fade: 0.3 });
    });
    // violet motes drift up off the glass
    s.sparks.rate('motes', 3, dt, () => {
      const a = R() * Math.PI * 2;
      s.sparks.emit(CX + Math.cos(a) * 96, 196 + Math.sin(a) * 100, { vx: pm() * 20, vy: -20 - R() * 30, life: 1.2 + R(), r0: 3 * sc, r1: 1 * sc, a: 0.8, tint: 0xb06bff, fade: 0.2 });
    });
    // a sliver of glass now and then from the cracked side, and a spray of them when it lands
    s.shards.rate('flake', 0.5, dt, () => {
      const [x, y] = onLine(MP_CRACKS[Math.floor(R() * MP_CRACKS.length)]);
      s.shards.emit(x, y, { vx: pm() * 40, vy: 10, life: 1.3, r0: 3 * sc, r1: 2.5 * sc, a: 0.9, tint: R() < 0.5 ? 0x3a2c5c : 0xc8b0ff, grav: 500, spin: 9, fade: 0.05 });
    });
    if (k.landed)
      for (let i = 0, n = k.burst(14); i < n; i++)
        s.shards.emit(CX + pm() * 180, 290, { vx: pm() * 420, vy: -160 - R() * 260, life: 0.9, r0: 4 * sc, r1: 3 * sc, a: 1, tint: R() < 0.5 ? 0x241a3e : 0xd8c8ff, grav: 1000, spin: 12, fade: 0.02 });
    overheat(k, s.steam, dt, [CX - 90, 110, 180, 170], 0xeee4ff);
  },
});

// THE SOLE PROPRIETOR: the stars in him twinkle and the nebula breathes (glow layer), light glints off his gold, and a
// few gold coins orbit him, passing in front of and behind his foot: he owns everything, the table included.
registerLive('soleprop', {
  wiggle: true,
  rig: { swing: 0.5, squash: 0.6, breath: 1.2 },
  glow: { rate: 0.35, depth: 0.4, base: 0.45 },
  heat: { boost: 0 },
  setup(k) {
    const key = k.sheet('lk_soleprop_coin', 44, 44, 8, (g, i) => {
      const w = Math.max(0.12, Math.abs(Math.cos((i / 8) * Math.PI)));
      g.translate(22, 22);
      g.scale(w, 1);
      const rg = g.createLinearGradient(-18, -18, 18, 18);
      rg.addColorStop(0, '#fff4b0');
      rg.addColorStop(0.4, '#ffd23f');
      rg.addColorStop(1, '#8a5a10');
      g.fillStyle = '#5a3a08';
      g.beginPath();
      g.arc(0, 0, 19, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = rg;
      g.beginPath();
      g.arc(0, 0, 17, 0, Math.PI * 2);
      g.fill();
      if (w > 0.4) {
        g.strokeStyle = 'rgba(90,58,8,0.7)';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(0, 0, 12.5, 0, Math.PI * 2);
        g.stroke();
        // the slice on the face
        g.fillStyle = 'rgba(122,74,10,0.85)';
        g.beginPath();
        g.moveTo(-7, -6);
        g.quadraticCurveTo(0, -10, 7, -6);
        g.lineTo(0, 8);
        g.closePath();
        g.fill();
      }
      g.fillStyle = 'rgba(255,255,255,0.8)';
      g.beginPath();
      g.ellipse(-7, -8, 5, 2.4, -0.6, 0, Math.PI * 2);
      g.fill();
    });
    return {
      coins: k.swarm({ key, frames: 8, count: 4, at: [CX, 120], rx: 150, ry: 90, speed: 0.55, jitter: 5, scale: 0.5 }),
      steam: steamEm(k),
      stars: k.emitter({ frame: 'spark', add: true, drag: 0, max: 30 }),
      motes: k.emitter({ frame: 'mote', add: true, curl: 30, drag: 0.6, max: 40 }),
      dust: k.emitter({ frame: 'puff', curl: 30, drag: 1.5, below: true, max: 80 }),
    };
  },
  tick(k, dt, s) {
    const sc = k.f.type.scale;
    s.stars.rate('twinkle', 5, dt, () => {
      s.stars.emit(CX - 80 + R() * 170, 4 + R() * 150, { life: 0.5, r0: 2, r1: 9 * sc, a: 0.9, tint: R() < 0.7 ? 0xffffff : 0xcfe0ff, spin: 1.5, fade: 0.45 });
    });
    s.stars.rate('gold', 1.4, dt, () => {
      const onCuff = R() < 0.5;
      s.stars.emit(onCuff ? CX - 50 + R() * 100 : CX - 80 + R() * 170, onCuff ? 4 + R() * 20 : 200 + R() * 24, { life: 0.4, r0: 12 * sc, r1: 1 * sc, a: 1, tint: 0xfff4c0, spin: 2, fade: 0.3 });
    });
    // star dust drifts off the nebula
    s.motes.rate('dust', 3, dt, () => {
      s.motes.emit(CX + pm() * 180, 40 + R() * 160, { vx: pm() * 20, vy: -20 - R() * 25, life: 1.5 + R(), r0: 2.4 * sc, r1: 1 * sc, a: 0.75, tint: [0xff4fd8, 0x36e0ff, 0xb06bff, 0xffffff][Math.floor(R() * 4)], fade: 0.25 });
    });
    s.coins.pace = k.windingUp ? 2.4 : 1;
    landDust(k, s.dust, 14, [0x6a4bb8, 0x3a2a70, 0xffd23f], 262, 100);
    overheat(k, s.steam, dt, [CX - 90, 20, 180, 200], 0xf4ecff);
  },
});

// GHOST OF FEET FUTURE: its clock runs backwards (the minute hand ticks back a notch a second, the hour hand creeps back
// with it, both racing once it overheats), a scan band sweeps down it, the hologram flickers (glow layer) and it leaves
// afterimages hanging in the air behind it. Its live images fade with whatever alpha the foot's art has (it's a ghost,
// and its fight shimmers it out of reach when it's foreseen your move).
const SCAN_N = 10;
const SCAN_BOX: [number, number, number, number] = [CX - 110, -6, 220, 176];
registerLive('ghostfuture', {
  wiggle: true,
  rig: { swing: 1.1, squash: 0.8, breath: 1.4 },
  glow: { rate: 2.4, depth: 0.25, base: 0.55 },
  heat: { boost: 0 },
  setup(k) {
    const res = footRes(k.f.type);
    const { x, y, r } = GF_CLOCK;
    const hand = (name: string, len: number, w: number) => {
      const L = len + 6;
      const key = designSheet(k, `lk_ghostfuture_${name}`, [x - L, y - L, L * 2, L * 2], 1, res, (g) => ghostHand(g, len, w));
      return rigImg(k, key, x, y, 0.5, 0.5, res);
    };
    const hour = hand('hour', r * 0.5, 3.4);
    const min = hand('min', r * 0.78, 2.4);
    const sres = 0.6;
    const scanKey = designSheet(k, 'lk_ghostfuture_scan', SCAN_BOX, SCAN_N, sres, (g, i) => {
      const yy = SCAN_BOX[1] + (i / (SCAN_N - 1)) * SCAN_BOX[3];
      const gr = g.createLinearGradient(0, yy - 16, 0, yy + 16);
      gr.addColorStop(0, 'rgba(125,249,255,0)');
      gr.addColorStop(0.5, 'rgba(200,255,255,0.75)');
      gr.addColorStop(1, 'rgba(125,249,255,0)');
      g.fillStyle = gr;
      g.fillRect(SCAN_BOX[0], yy - 16, SCAN_BOX[2], 32);
      g.globalCompositeOperation = 'destination-in';
      g.fillStyle = '#fff';
      for (const p of ghostSilPaths()) {
        p(g);
        g.fill();
      }
    });
    const scan = rigImg(k, scanKey, SCAN_BOX[0], SCAN_BOX[1], 0, 0, sres).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    return {
      hour,
      min,
      scan,
      ang: { to: -Math.PI * 0.3, v: 0, at: -Math.PI * 0.3, next: 1, hour: -Math.PI * 0.25, scanT: 0 },
      steam: steamEm(k),
      after: k.emitter({ frame: 'soft', add: true, curl: 20, drag: 2.2, below: true, max: 90 }),
      pix: k.emitter({ frame: 'mote', add: true, drag: 1, max: 40 }),
    };
  },
  tick(k, dt, s) {
    const f = k.f;
    const sc = f.type.scale;
    const a = s.ang;
    const pace = 1 + k.heat * 7;
    a.next -= dt * pace;
    if (a.next <= 0) {
      a.next += 1;
      a.to -= Math.PI / 30;
      a.hour -= Math.PI / 360;
    }
    a.v += ((a.to - a.at) * 900 - a.v * 26) * Math.min(dt, 1 / 30);
    a.at += a.v * Math.min(dt, 1 / 30);
    s.min.rotation = a.at;
    s.hour.rotation = a.hour;
    // the scan band: a pass down it every couple of seconds
    a.scanT = (a.scanT + dt / 2.4) % 1;
    const u = a.scanT / 0.45;
    let scanA = 0;
    if (u < 1) {
      s.scan.setFrame(Math.min(SCAN_N - 1, Math.floor(u * SCAN_N)));
      scanA = Math.sin(u * Math.PI) * 0.8 * calm();
    }
    // afterimages: soft cyan ghosts of its outline left hanging where it was, thicker the faster it moves
    const speed = Math.min(1, Math.hypot(k.vx, k.vy) / 900);
    s.after.rate('after', (4 + speed * 30) * calm(), dt, () => {
      const side = R() < 0.5 ? -1 : 1;
      const yy = 20 + R() * 220;
      s.after.emit(CX + side * (80 + R() * 20), yy, { vx: pm() * 10, vy: -6, life: 0.6 + R() * 0.4, r0: 16 * sc, r1: 30 * sc, a: 0.18 + speed * 0.2, tint: R() < 0.7 ? 0x7df9ff : 0xbfe6ff, fade: 0.1 });
    });
    // glitch pixels
    s.pix.rate('pix', 2.5, dt, () => {
      s.pix.emit(CX + pm() * 200, 20 + R() * 220, { vx: pm() * 60, vy: 0, life: 0.25, r0: 4 * sc, r1: 2 * sc, a: 1, tint: R() < 0.5 ? 0x7df9ff : 0xffffff, fade: 0.1 });
    });
    overheat(k, s.steam, dt, [CX - 90, 20, 180, 200], 0xdff8ff);
    // fade the live images with the art: the ghost's own alpha, and its fight shimmering it out of reach
    const art = (f as unknown as { img: Phaser.GameObjects.Image }).img.alpha;
    s.scan.setAlpha(scanA);
    for (const img of (f as unknown as { liveImgs: Phaser.GameObjects.Image[] }).liveImgs) {
      if (img.blendMode === Phaser.BlendModes.ADD) img.setAlpha(img.alpha * art);
      else img.setAlpha(art);
    }
  },
});

// THE SOLE PROPRIETOR UNBOUND: light pours out of the cracks (glow layer, pulsing), glints run along them, flames of
// light lick up round him in gold and pink, embers and stars spill off him, the broken chains swing from his cuff, and
// every stomp throws a ring of gold light. His overheat burns from the sole up in gold and pink.
const FLAME_TINTS = [0xffd23f, 0xffb03a, 0xff8ad8, 0xff4fd8, 0xfff4b0];
registerLive('soleunbound', {
  wiggle: true,
  rig: { swing: 0.6, squash: 0.8, breath: 1.4 },
  glow: { rate: 0.8, depth: 0.45, base: 0.6 },
  heat: { boost: 0 },
  sway: {
    chainL: { k: 30, c: 3, gain: 1.4, idle: 0.12, flop: 1, below: true },
    chainR: { k: 34, c: 3.2, gain: 1.4, idle: 0.12, flop: -1, below: true },
  },
  setup: (k) => ({
    steam: steamEm(k),
    back: k.emitter({ frame: 'soft', add: true, curl: 90, drag: 0.9, below: true, max: 160 }),
    front: k.emitter({ frame: 'soft', add: true, curl: 80, drag: 1, max: 80 }),
    embers: k.emitter({ frame: 'ember', add: true, curl: 60, drag: 0.6, max: 60 }),
    glints: k.emitter({ frame: 'spark', add: true, drag: 0, max: 30 }),
    ring: k.emitter({ frame: 'soft', add: true, drag: 2.4, below: true, max: 60 }),
  }),
  tick(k, dt, s) {
    const sc = k.f.type.scale;
    const hot = 1 + k.heat * 0.8 + (k.windingUp ? 0.6 : 0);
    // flames of light: up the sides and over the toes, behind him, with fewer, smaller ones in front
    const flame = (em: typeof s.back, big: number) => {
      const t = R();
      // round the outline: up either side, or along the toes' tips (just outside the silhouette, so they show)
      let x: number;
      let y: number;
      let vx = pm() * 40;
      if (t < 0.35 || t > 0.65) {
        const side = t < 0.35 ? -1 : 1;
        y = 30 + R() * 200;
        x = CX + 4 + side * (104 + (y > 120 ? 4 : -(120 - y) * 0.35) + R() * 8);
        vx += side * 30;
      } else {
        x = CX - 100 + R() * 204;
        y = 236 + R() * 18;
      }
      em.emit(x, y, { vx, vy: -90 - R() * 110 * hot, life: 0.6 + R() * 0.45, r0: 12 * sc * big, r1: (26 + R() * 14) * sc * big, a: 0.42, tint: FLAME_TINTS[Math.floor(R() * FLAME_TINTS.length)], fade: 0.12 });
    };
    s.back.rate('flame', 20 * hot * calm(), dt, () => flame(s.back, 1));
    s.front.rate('flame', 5 * hot * calm(), dt, () => flame(s.front, 0.6));
    s.embers.rate('ember', 6 * hot, dt, () => {
      s.embers.emit(CX + pm() * 200, 60 + R() * 180, { vx: pm() * 60, vy: -60 - R() * 80, life: 1 + R() * 0.8, r0: 3 * sc, r1: 1 * sc, a: 1, tint: R() < 0.5 ? 0xffd23f : 0xff8ad8, fade: 0.1 });
    });
    s.glints.rate('crack', 3, dt, () => {
      const [x, y] = onLine(UNBOUND_CRACKS[Math.floor(R() * UNBOUND_CRACKS.length)]);
      s.glints.emit(x, y, { life: 0.35, r0: 12 * sc, r1: 1 * sc, a: 1, tint: R() < 0.6 ? 0xfffbe0 : 0xffd23f, spin: 2, fade: 0.3 });
    });
    if (k.landed)
      for (let i = 0, n = k.burst(22); i < n; i++) {
        const side = R() < 0.5 ? -1 : 1;
        s.ring.emit(CX + side * R() * 100, 258, { vx: side * (160 + R() * 320), vy: -10 - R() * 50, life: 0.6 + R() * 0.4, r0: 10 * sc, r1: 34 * sc, a: 0.55, tint: R() < 0.6 ? 0xffd23f : 0xff8ad8, fade: 0.05 });
      }
    overheat(k, s.steam, dt, [CX - 90, 20, 180, 200], 0xfff0f8);
  },
});

