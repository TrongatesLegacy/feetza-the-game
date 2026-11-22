// Style-kit pilot: fur and plush.
// - Werewolf Wally: a shaggy grey paw-foot, fur flowing down to bare dark knuckles and hooked claws. In play the
//   long locks on its sides sway and trail when it moves, and its claws flex before it strikes.
// - Bunny Slipper: a plush fleece slipper with a bunny face. In play its ears flop on springs, its eyes blink and
//   follow your peel, and its nose twitches.

import type { FootArt } from '../../data/feet';
import { CX } from '../../art/feetCommon';
import { type StyleToe, onToe, poseToes, restToes } from '../../art/style/anatomy';
import { LIGHT, type PathFn, type Pose, ao, crease, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil, lobe } from '../../art/style/sil';
import { type PartDef, registerStyle } from '../../art/style/registry';
import { beadEye, clawPath, contact, furStrands, paintClaw } from '../../art/style/details';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';

const [LX, LY] = LIGHT.dir;

// ════════════════════════════ WEREWOLF WALLY ════════════════════════════

/** The big locks of fur on Wally's sides (play sways them): root x, y, angle, length, width, bend. */
export const WALLY_LOCKS: [number, number, number, number, number, number][] = [
  [CX - 60, 30, Math.PI * 0.8, 40, 30, -0.45],
  [CX - 86, 96, Math.PI * 0.78, 46, 34, -0.4],
  [CX - 98, 160, Math.PI * 0.7, 40, 30, -0.4],
  [CX + 62, 34, Math.PI * 0.2, 40, 30, 0.45],
  [CX + 90, 100, Math.PI * 0.22, 46, 34, 0.4],
  [CX + 104, 164, Math.PI * 0.3, 40, 30, 0.4],
];

function wallyToes(p: Pose): StyleToe[] {
  // shorter, knobblier toes than a person's, set a little wider
  return poseToes(restToes({ toe: 1.04, toeLen: 0.8, ball: 1.03 }), p);
}

/** A lock of fur: a wavy flame that splits into `n` points at its tip. Root (x, y), pointing along ang. */
export function lockPath(x: number, y: number, ang: number, len: number, w: number, bend: number, n = 3): PathFn {
  return (c: Ctx) => {
    c.save();
    c.translate(x, y);
    c.rotate(ang - Math.PI / 2);
    c.beginPath();
    c.moveTo(-w / 2, 0);
    // left edge, out to the first point, then the notches between points, back up the right edge
    const tip = (i: number) => {
      const u = n === 1 ? 0 : i / (n - 1) - 0.5;
      const l = len * (1 - Math.abs(u) * 0.45);
      return [Math.sin(bend) * l + u * w * 0.9, Math.cos(bend) * l] as const;
    };
    const [t0x, t0y] = tip(0);
    c.bezierCurveTo(-w * 0.62, len * 0.3, t0x - w * 0.15 + Math.sin(bend) * len * 0.2, t0y * 0.7, t0x, t0y);
    for (let i = 1; i < n; i++) {
      const [px, py] = tip(i - 1);
      const [tx, ty] = tip(i);
      const nx = (px + tx) / 2 - Math.sin(bend) * len * 0.12;
      const ny = Math.min(py, ty) - len * 0.22;
      c.quadraticCurveTo((px + nx) / 2 + 1, (py + ny) / 2 + 3, nx, ny);
      c.quadraticCurveTo((tx + nx) / 2 - 1, (ty + ny) / 2 + 3, tx, ty);
    }
    const [tex, tey] = tip(n - 1);
    c.bezierCurveTo(tex + w * 0.1 + Math.sin(bend) * len * 0.1, tey * 0.65, w * 0.62, len * 0.3, w / 2, 0);
    c.closePath();
    c.restore();
  };
}

/** The shaggy fringe all round Wally's sides: many small locks standing out from the body's edge. */
function wallyFringe(): { path: PathFn; x: number; y: number; ang: number; len: number }[] {
  const r = rng(hashStr('wally-fringe'));
  const out: { path: PathFn; x: number; y: number; ang: number; len: number }[] = [];
  for (const s of [-1, 1]) {
    for (let i = 0; i < 13; i++) {
      const t = i / 12;
      const y = 4 + t * 196;
      // the body's half width at y (a bulb): narrow ankle, wide ball
      const hw = 56 + Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.5) * 44 + (s > 0 ? 4 : 0);
      const ang = Math.PI / 2 - s * (0.95 - t * 0.35) + (r() - 0.5) * 0.25;
      const len = 14 + r() * 12;
      const x = CX + s * (hw - 6);
      out.push({ path: lockPath(x, y, ang, len, 14 + r() * 6, s * (0.25 + r() * 0.2), 2), x, y, ang, len });
    }
  }
  return out;
}

const wallyBody: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 54, -6);
  c.bezierCurveTo(CX - 56, 40, CX - 98, 80, CX - 100, 150);
  c.bezierCurveTo(CX - 101, 186, CX - 90, 200, CX - 70, 210);
  c.lineTo(CX + 70, 214);
  c.bezierCurveTo(CX + 94, 200, CX + 106, 186, CX + 104, 150);
  c.bezierCurveTo(CX + 102, 80, CX + 58, 40, CX + 56, -6);
  c.closePath();
};

const toePath = (t: StyleToe) => (c: Ctx) => {
  c.beginPath();
  c.ellipse(t.cx, t.cy, t.rx, t.ry, t.rot, 0, Math.PI * 2);
};

/** A claw per toe, rooted under the toe's tip; the claws reach further when the toes curl (out before a strike). */
function wallyClaws(toes: StyleToe[], p: Pose): { x: number; y: number; ang: number; len: number; w: number; hook: number }[] {
  const c = Math.max(0, p.curl);
  return toes.map((t, i) => {
    const [x, y] = onToe(t, Math.PI / 2);
    const big = i === 4;
    return { x, y: y - t.ry * 0.35, ang: Math.PI / 2 - t.rot * 1.2 + (i - 2) * 0.06, len: (big ? 46 : 36 - (i === 0 ? 5 : 0)) * (1 + c * 0.3), w: big ? 22 : 17, hook: (i < 2 ? 0.3 : i > 2 ? -0.3 : 0.08) * (1 + c * 0.8) };
  });
}

function drawWally(ctx: Ctx, art: FootArt, p: Pose, live: boolean): void {
  const fur = art.primary ?? '#7a7a86';
  const dark = art.secondary ?? '#2b2b30';
  const skin = art.skin;
  const toes = wallyToes(p);
  const claws = wallyClaws(toes, p);
  const fringe = wallyFringe();
  const locks = live ? [] : WALLY_LOCKS.map(([x, y, a, l, w, b]) => lockPath(x, y, a, l, w, b));
  const box = { x: CX - 150, y: -8, w: 300, h: 310 };
  const sil = new Sil(ctx, [...locks, ...fringe.map((f) => f.path), wallyBody, ...toes.map(toePath), ...claws.map((k) => clawPath(k.x, k.y, k.ang, k.len, k.w, k.hook))], box);
  const g = sil.g;
  const r = rng(hashStr('wally-fur'));
  const deepF = mix(shade(fur, -0.6), '#141428', 0.3);
  // the undercoat, lit by the one light
  sil.form({ base: shade(fur, -0.08), shadowTint: '#141428', ramp: 0.9, form: 0.65, formSize: 32, bevel: 0.12, rim: 0.6 });
  // the toes: bare, dark, leathery knuckles, each its own volume
  toes.forEach((t) => {
    g.save();
    toePath(t)(g);
    g.clip();
    const tg = g.createRadialGradient(t.cx - t.rx * 0.35, t.cy + t.ry * 0.1, 2, t.cx, t.cy + t.ry * 0.2, t.ry * 1.1);
    tg.addColorStop(0, shade(skin, 0.4));
    tg.addColorStop(0.5, skin);
    tg.addColorStop(1, shade(skin, -0.6));
    g.fillStyle = tg;
    g.fillRect(t.cx - t.rx - 2, t.cy - t.ry - 2, t.rx * 2 + 4, t.ry * 2 + 4);
    texture(g, 'leather', box, 0.5, 1.2);
    for (const f of [0.18, 0.4]) {
      crease(g, (c) => {
        c.moveTo(t.cx - t.rx * 0.5, t.cy + t.ry * f);
        c.quadraticCurveTo(t.cx, t.cy + t.ry * (f + 0.14), t.cx + t.rx * 0.5, t.cy + t.ry * f);
      }, 1.6, '#06060a', 0.55, 0.2);
    }
    spec(g, t.cx - t.rx * 0.32, t.cy + t.ry * 0.3, t.rx * 0.45, t.ry * 0.2, 0.45, -0.4);
    g.restore();
    lobe(g, toePath(t), { x: t.cx - t.rx - 4, y: t.cy - t.ry - 4, w: t.rx * 2 + 8, h: t.ry * 2 + 8 }, t.cy - t.ry, t.cy - t.ry * 0.5, '#000000', 0.6, 6, 0.3);
  });
  // fur: strands flowing down and out, a dark undercoat, then mid tones, then lit tips on the top-left
  const flow = (x: number) => Math.PI / 2 - ((x - CX) / 110) * 0.55;
  for (const [n, len, tones2] of [
    [1400, 16, { dark: deepF, mid: shade(fur, -0.35), light: shade(fur, -0.15) }],
    [1100, 14, { dark: shade(fur, -0.3), mid: fur, light: shade(fur, 0.2) }],
    [500, 12, { dark: fur, mid: shade(fur, 0.25), light: shade(fur, 0.5) }],
  ] as const) {
    g.save();
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = CX - 112 + r() * 224;
      const y = -6 + r() * 220;
      const a = flow(x) + (r() - 0.5) * 0.4;
      const l = len * (0.6 + r() * 0.7);
      const t = r();
      const col = t < 0.33 ? tones2.dark : t < 0.8 ? tones2.mid : tones2.light;
      // lit strands fade on the shaded side
      const shadeK = Math.max(0, Math.min(1, ((x - CX) / 110 + (y - 100) / 160) * 0.5 + 0.5));
      g.strokeStyle = rgba(col, (0.35 + r() * 0.45) * (col === tones2.light ? 1 - shadeK * 0.8 : 1));
      g.lineWidth = 1 + r() * 1.6;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a + 0.3) * l * 0.5, y + Math.sin(a + 0.3) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    g.restore();
  }
  // the fringe locks: strands running out along each lock
  for (const f of fringe) {
    g.save();
    f.path(g);
    g.clip();
    furStrands(g, r, { x: f.x - f.len, y: f.y - f.len, w: f.len * 2, h: f.len * 2 }, f.ang, 40, f.len * 0.7, { dark: deepF, mid: shade(fur, -0.1), light: shade(fur, 0.35) });
    g.restore();
  }
  // shade the fur by the light: the top-left catches it, the right falls away
  const fl = g.createLinearGradient(CX - 100, 0, CX + 110, 220);
  fl.addColorStop(0, rgba(LIGHT.key, 0.16));
  fl.addColorStop(0.45, rgba(LIGHT.key, 0));
  fl.addColorStop(1, rgba('#06061a', 0.4));
  g.fillStyle = fl;
  g.fillRect(box.x, box.y, box.w, 240);
  // fur spilling over the knuckles: a ragged fringe hanging over each toe's root
  toes.forEach((t) => {
    const [, ky] = onToe(t, -Math.PI / 2);
    const fringeY = ky + t.ry * 0.32;
    softStroke(g, (c) => {
      c.moveTo(t.cx - t.rx * 0.9, fringeY + 2);
      c.quadraticCurveTo(t.cx, fringeY + 9, t.cx + t.rx * 0.9, fringeY + 2);
    }, rgba('#000000', 0.5), 5, 3);
    g.save();
    g.lineCap = 'round';
    for (let j = 0; j < 34; j++) {
      const x = t.cx - t.rx * 0.95 + r() * t.rx * 1.9;
      const y0 = ky - 6 + r() * 6;
      const l = (fringeY - y0) * (0.7 + r() * 0.5);
      const a = Math.PI / 2 + (r() - 0.5) * 0.5;
      g.strokeStyle = rgba(r() < 0.3 ? deepF : r() < 0.8 ? shade(fur, -0.05) : shade(fur, 0.4), 0.85);
      g.lineWidth = 1.2 + r() * 1.6;
      g.beginPath();
      g.moveTo(x, y0);
      g.quadraticCurveTo(x + Math.cos(a + 0.4) * l * 0.5, y0 + l * 0.5, x + Math.cos(a) * l, y0 + Math.sin(a) * l);
      g.stroke();
    }
    g.restore();
  });
  // claws
  for (const k of claws) paintClaw(g, k.x, k.y, k.ang, k.len, k.w, k.hook, '#f4e6c0', '#5a4220');
  // the big side locks
  if (!live) for (const lk of WALLY_LOCKS) paintLock(g, rng(hashStr('wally-lock' + lk[0])), lk, fur);
  sil.edge(rgba('#06060e', 0.4), 20, LX * 11, LY * 11);
  sil.edge(rgba(LIGHT.rim, 0.6), 2.5, LX * 3, LY * 3);
  sil.finish(inkOf(dark), { openTop: -5, inner: 0.3 });
}

/** Paint one side lock (in the body's still art, or alone as a live part). */
function paintLock(g: Ctx, r: () => number, [x, y, a, l, w, b]: (typeof WALLY_LOCKS)[number], fur: string): void {
  const path = lockPath(x, y, a, l, w, b);
  g.save();
  path(g);
  g.clip();
  const lg = g.createLinearGradient(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
  lg.addColorStop(0, shade(fur, -0.3));
  lg.addColorStop(1, shade(fur, 0.05));
  g.fillStyle = lg;
  g.fillRect(x - l - w, y - l - w, (l + w) * 2, (l + w) * 2);
  g.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const u = (r() - 0.5) * w * 0.8;
    const sx = x + Math.cos(a + Math.PI / 2) * u;
    const sy = y + Math.sin(a + Math.PI / 2) * u;
    const ll = l * (0.6 + r() * 0.45);
    const aa = a + b * 0.6 + (r() - 0.5) * 0.25;
    const t = r();
    g.strokeStyle = rgba(t < 0.3 ? shade(fur, -0.55) : t < 0.8 ? fur : shade(fur, 0.45), 0.4 + r() * 0.5);
    g.lineWidth = 1 + r() * 1.5;
    g.beginPath();
    g.moveTo(sx, sy);
    g.quadraticCurveTo(sx + Math.cos(a) * ll * 0.5, sy + Math.sin(a) * ll * 0.5, sx + Math.cos(aa) * ll, sy + Math.sin(aa) * ll);
    g.stroke();
  }
  g.restore();
}

function lockPart(i: number): PartDef {
  const [x, y, a, l, w] = WALLY_LOCKS[i];
  const ex = x + Math.cos(a) * l;
  const ey = y + Math.sin(a) * l;
  const pad = w + 10;
  const bx = Math.min(x, ex) - pad;
  const by = Math.min(y, ey) - pad;
  return {
    box: { x: bx, y: by, w: Math.abs(ex - x) + pad * 2, h: Math.abs(ey - y) + pad * 2 },
    frames: 1,
    pivot: [x, y],
    draw: (g, art) => {
      const lk = WALLY_LOCKS[i];
      const s = new Sil(g, [lockPath(lk[0], lk[1], lk[2], lk[3], lk[4], lk[5])], { x: bx, y: by, w: 200, h: 200 });
      paintLock(s.g, rng(hashStr('wally-lock' + lk[0])), lk, art.primary ?? '#7a7a86');
      s.edge(rgba('#06060e', 0.35), 8, LX * 5, LY * 5);
      s.edge(rgba(LIGHT.rim, 0.5), 2.5, LX * 3, LY * 3);
      s.finish(inkOf(art.secondary ?? '#2b2b30'), { inner: 0.3 });
      // melt the root into the body under it
      g.save();
      g.globalCompositeOperation = 'destination-out';
      const fg = g.createRadialGradient(x, y, 0, x, y, l * 0.5);
      fg.addColorStop(0, 'rgba(0,0,0,1)');
      fg.addColorStop(0.55, 'rgba(0,0,0,.75)');
      fg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = fg;
      g.fillRect(x - l, y - l, l * 2, l * 2);
      g.restore();
    },
  };
}

registerStyle('wally', {
  contactY: 268,
  halfWidth: 108,
  rig: { from: 168, to: 190 },
  parts: Object.fromEntries(WALLY_LOCKS.map((_, i) => [`lock${i}`, lockPart(i)])),
  draw(ctx, art, p, o) {
    drawWally(ctx, art, p, o.live);
  },
});

// ════════════════════════════ BUNNY SLIPPER ════════════════════════════

const bunnyBody = (squash: number) => (c: Ctx) => {
  const b = 256 + squash * 2;
  c.beginPath();
  c.moveTo(CX - 66, -6);
  c.bezierCurveTo(CX - 70, 40, CX - 106, 80, CX - 108, 150);
  c.bezierCurveTo(CX - 110, b - 30, CX - 70, b, CX, b);
  c.bezierCurveTo(CX + 70, b, CX + 110, b - 30, CX + 108, 150);
  c.bezierCurveTo(CX + 106, 80, CX + 70, 40, CX + 66, -6);
  c.closePath();
};

/** The fluffy trim round the sole: a row of puffs. */
const fringe = (c: Ctx) => {
  c.beginPath();
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const a = Math.PI * (1 - t);
    const x = CX + Math.cos(a) * 104;
    const y = 214 + Math.sin(a) * 46;
    c.moveTo(x + 11, y);
    c.arc(x, y, 11 + (i % 2) * 2, 0, Math.PI * 2);
  }
};

/** Ears: root (x, y), angle out, length. Play hangs them on springs. */
export const EARS: { x: number; y: number; ang: number; len: number; w: number }[] = [
  { x: CX - 64, y: 66, ang: Math.PI * 1.06, len: 94, w: 46 },
  { x: CX + 64, y: 66, ang: -Math.PI * 0.06, len: 94, w: 46 },
];

const earPath = (e: (typeof EARS)[number]) => (c: Ctx) => {
  c.save();
  c.translate(e.x, e.y);
  c.rotate(e.ang);
  c.beginPath();
  c.moveTo(0, -e.w * 0.42);
  c.bezierCurveTo(e.len * 0.5, -e.w * 0.7, e.len * 1.02, -e.w * 0.38, e.len, 0);
  c.bezierCurveTo(e.len * 0.98, e.w * 0.4, e.len * 0.5, e.w * 0.62, 0, e.w * 0.42);
  c.closePath();
  c.restore();
};

function paintEar(g: Ctx, e: (typeof EARS)[number], plush: string, pink: string): void {
  const path = earPath(e);
  g.save();
  path(g);
  g.clip();
  g.fillStyle = plush;
  g.fillRect(e.x - 90, e.y - 90, 180, 180);
  texture(g, 'fleece', { x: e.x - 90, y: e.y - 90, w: 180, h: 180 }, 0.35, 1.3);
  // the pink inner ear
  g.save();
  g.translate(e.x, e.y);
  g.rotate(e.ang);
  const ig = g.createLinearGradient(0, 0, e.len, 0);
  ig.addColorStop(0, shade(pink, -0.15));
  ig.addColorStop(1, shade(pink, 0.15));
  g.fillStyle = ig;
  g.beginPath();
  g.moveTo(6, -e.w * 0.2);
  g.bezierCurveTo(e.len * 0.5, -e.w * 0.4, e.len * 0.9, -e.w * 0.18, e.len * 0.88, 0);
  g.bezierCurveTo(e.len * 0.86, e.w * 0.2, e.len * 0.5, e.w * 0.34, 6, e.w * 0.2);
  g.closePath();
  g.fill();
  g.restore();
  g.restore();
  lobe(g, path, { x: e.x - 90, y: e.y - 90, w: 180, h: 180 }, -200, -199, '#6a3a6a', 0.45, 8, 0.35);
}

/** Eyelid frames for the blink part (0 open … n-1 shut). */
const BLINK_FRAMES = 5;
export const BUNNY_EYES = { y: 132, dx: 30, rx: 13, ry: 16 };

/** The eyes at a blink (0 open … 1 shut) looking (lx, ly) units off centre. */
function bunnyEyes(g: Ctx, plush: string, blink: number, lx: number, ly: number): void {
  const { y, dx, rx, ry } = BUNNY_EYES;
  for (const s of [-1, 1]) {
    const x = CX + s * dx;
    beadEye(g, x, y, rx, ry, '#7a4a8a', lx, ly);
    if (blink > 0.02) {
      // the plush lid comes down over the bead
      g.save();
      g.beginPath();
      g.ellipse(x, y, rx + 1.5, ry + 1.5, 0, 0, Math.PI * 2);
      g.clip();
      const lidY = y - ry - 2 + (ry * 2 + 4) * blink;
      g.fillStyle = plush;
      g.fillRect(x - rx - 3, y - ry - 4, rx * 2 + 6, lidY - (y - ry - 4));
      texture(g, 'fleece', { x: x - rx - 3, y: y - ry - 4, w: rx * 2 + 6, h: ry * 2 + 8 }, 0.35, 1.3);
      g.strokeStyle = rgba('#3a2030', 0.8);
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x - rx, lidY - 1);
      g.quadraticCurveTo(x, lidY + 3, x + rx, lidY - 1);
      g.stroke();
      g.restore();
    }
  }
}

function drawBunny(ctx: Ctx, art: FootArt, p: Pose, live: boolean): void {
  const plush = art.primary ?? '#fff3f7';
  const pink = art.secondary ?? '#ffa3c4';
  const squash = Math.max(0, -p.curl);
  const body = bunnyBody(squash);
  const ears = live ? [] : EARS.map(earPath);
  const box = { x: CX - 150, y: -8, w: 300, h: 290 };
  const sil = new Sil(ctx, [...ears, body, fringe], box);
  const g = sil.g;
  // plush fleece lit softly; shadows go lilac
  sil.form({ base: plush, shadowTint: '#8a5aa0', ramp: 0.7, form: 0.5, formSize: 34, bevel: 0.15, rim: 0.4 });
  texture(g, 'fleece', box, 0.4, 1.3);
  if (!live) for (const e of EARS) paintEar(g, e, plush, pink);
  // the pink sole peeking under the fringe
  g.save();
  fringe(g);
  g.clip();
  const fg = g.createLinearGradient(0, 200, 0, 272);
  fg.addColorStop(0, '#ffffff');
  fg.addColorStop(0.6, shade(plush, -0.03));
  fg.addColorStop(1, mix(shade(plush, -0.22), '#8a5aa0', 0.2));
  g.fillStyle = fg;
  g.fillRect(box.x, 190, box.w, 90);
  texture(g, 'fleece', box, 0.5, 1.1);
  g.restore();
  // fluffy wisps all round the trim
  const r = rng(hashStr('bunny'));
  furStrands(g, r, { x: CX - 110, y: 200, w: 220, h: 66 }, Math.PI / 2, 220, 7, { dark: mix(plush, '#8a5aa0', 0.2), mid: '#ffffff', light: '#ffffff' }, 1.4);
  // the face: cheeks, eyes, nose, mouth, teeth and whiskers
  for (const s of [-1, 1]) softFill(g, (c) => {
    c.beginPath();
    c.ellipse(CX + s * 52, 166, 17, 11, 0, 0, Math.PI * 2);
  }, rgba(pink, 0.75), 5);
  if (!live) bunnyEyes(g, plush, 0, 0, 0);
  bunnyNose(g, pink, 0, !live);
  // the mouth and two buck teeth
  g.strokeStyle = rgba('#4a2a3a', 0.85);
  g.lineWidth = 2.4;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(CX, 168);
  g.lineTo(CX, 175);
  g.moveTo(CX - 12, 174);
  g.quadraticCurveTo(CX - 6, 180, CX, 175);
  g.quadraticCurveTo(CX + 6, 180, CX + 12, 174);
  g.stroke();
  for (const s of [-1, 1]) {
    contact(g, (c) => {
      c.beginPath();
      c.roundRect(CX + (s < 0 ? -7 : 0.5), 178, 6.5, 9, 2);
      c.fill();
    }, 0.35, 1.5, 2);
    g.fillStyle = '#fffdf6';
    g.beginPath();
    g.roundRect(CX + (s < 0 ? -7 : 0.5), 177, 6.5, 9, 2);
    g.fill();
    g.strokeStyle = rgba('#8a7a7a', 0.6);
    g.lineWidth = 0.8;
    g.stroke();
  }
  // whiskers: fine, catching the light
  g.lineWidth = 1.1;
  for (const s of [-1, 1]) for (const [dy, len, a] of [[-3, 44, -0.12], [3, 48, 0.02], [9, 42, 0.16]] as const) {
    g.strokeStyle = rgba('#5a4a5a', 0.55);
    g.beginPath();
    g.moveTo(CX + s * 22, 160 + dy);
    g.quadraticCurveTo(CX + s * (22 + len * 0.5), 158 + dy + a * 20, CX + s * (22 + len), 160 + dy + a * 50);
    g.stroke();
  }
  // a soft fold where the opening's cuff rolls over, and the rim of the opening
  ao(g, CX, 22, 70, 10, 0.3, 0, '#6a4a7a');
  spec(g, CX - 40, 60, 40, 22, 0.3, -0.5, LIGHT.key);
  sil.edge(rgba('#5a3a6a', 0.3), 22, LX * 12, LY * 12);
  sil.edge(rgba(LIGHT.rim, 0.5), 2.5, LX * 3, LY * 3);
  sil.finish(inkOf(mix(plush, '#8a5aa0', 0.5)), { openTop: -5, inner: 0.35 });
}

/** The pink nose, twitched by `tw` (0…1). */
function bunnyNose(g: Ctx, pink: string, tw: number, shadow = true): void {
  const y = 158 - tw * 2;
  const w = 9 + tw * 1.5;
  if (shadow) contact(g, (c) => {
    c.beginPath();
    c.ellipse(CX, y, w, 6.5, 0, 0, Math.PI * 2);
    c.fill();
  }, 0.3, 1.5, 2);
  const ng = g.createRadialGradient(CX - 3, y - 3, 0.5, CX, y, w);
  ng.addColorStop(0, shade(pink, 0.35));
  ng.addColorStop(0.6, pink);
  ng.addColorStop(1, shade(pink, -0.3));
  g.fillStyle = ng;
  g.beginPath();
  g.moveTo(CX - w, y - 4);
  g.quadraticCurveTo(CX, y - 8, CX + w, y - 4);
  g.quadraticCurveTo(CX + w * 0.4, y + 7, CX, y + 7);
  g.quadraticCurveTo(CX - w * 0.4, y + 7, CX - w, y - 4);
  g.fill();
  spec(g, CX - 3, y - 2.5, 3.5, 2, 0.9, -0.3);
}

registerStyle('bunny', {
  contactY: 266,
  halfWidth: 108,
  rig: { from: 196, to: 214 },
  parts: {
    earL: { box: { x: EARS[0].x - 106, y: EARS[0].y - 60, w: 118, h: 120 }, frames: 1, pivot: [EARS[0].x, EARS[0].y], draw: (g, art) => earPart(g, art, 0) },
    earR: { box: { x: EARS[1].x - 12, y: EARS[1].y - 60, w: 118, h: 120 }, frames: 1, pivot: [EARS[1].x, EARS[1].y], draw: (g, art) => earPart(g, art, 1) },
    eyes: {
      box: { x: CX - BUNNY_EYES.dx - BUNNY_EYES.rx - 4, y: BUNNY_EYES.y - BUNNY_EYES.ry - 5, w: (BUNNY_EYES.dx + BUNNY_EYES.rx + 4) * 2, h: BUNNY_EYES.ry * 2 + 10 },
      frames: BLINK_FRAMES,
      draw: (g, art, i) => bunnyEyes(g, art.primary ?? '#fff3f7', i / (BLINK_FRAMES - 1), 0, 0),
    },
    nose: { box: { x: CX - 13, y: 147, w: 26, h: 20 }, frames: 2, draw: (g, art, i) => bunnyNose(g, art.secondary ?? '#ffa3c4', i, false) },
  },
  draw(ctx, art, p, o) {
    drawBunny(ctx, art, p, o.live);
  },
});

function earPart(g: Ctx, art: FootArt, i: number): void {
  const e = EARS[i];
  const s = new Sil(g, [earPath(e)], { x: e.x - 90, y: e.y - 90, w: 180, h: 180 });
  paintEar(s.g, e, art.primary ?? '#fff3f7', art.secondary ?? '#ffa3c4');
  s.edge(rgba(LIGHT.rim, 0.5), 2.5, LX * 3, LY * 3);
  s.finish(inkOf(mix(art.primary ?? '#fff3f7', '#8a5aa0', 0.5)), { inner: 0.35 });
}
