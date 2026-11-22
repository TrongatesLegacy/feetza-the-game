// Bosses in the style kit (batch C), part 1: the five classic bosses (src/data/feet.ts).
// - BIGFOOT: a shaggy brown paw of a foot, matted fur with burrs and a twig in it, leathery muddy toes and ivory
//   claws. In play its big side locks sway, loose hairs and dust drift off it, and every stomp throws dirt.
// - KING HONK: a colossal patent-leather clown shoe, neon-green laces, a polka-dot bow with a little gold crown.
//   In play it squashes and springs like rubber, the bow bobs and every landing pops confetti.
// - T-REX TOES: three great scaly toes with banded scutes, bony osteoderms down the back and hooked black claws
//   that flex before it strikes. In play the ground shakes up dust and grit.
// - THE COLOSSUS: a cathedral of a sabaton: polished steel lames with gold trim and a stained-glass lancet window
//   that glows from inside.
// - GHOST OF FEET PAST: a translucent, glowing spectral foot in a shackle with a broken chain, faces of feet past
//   drifting inside it. In play ectoplasm streams off it, cold mist pours off its toes and will-o'-wisps circle.
// Every boss overheats in its later phases (the heat layer: hot glow from the sole up, plus steam in play).

import type { FootArt } from '../../data/feet';
import { CX } from '../../art/feetCommon';
import { type StyleToe, onToe, poseToes, restToes } from '../../art/style/anatomy';
import { bareOutline, paintBare } from '../../art/style/bare';
import { LIGHT, type PathFn, type Pose, ao, crease, glint, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil, lobe } from '../../art/style/sil';
import { type PartDef, registerStyle } from '../../art/style/registry';
import { blotches, clawPath, contact, eyelet, laceRun, paintClaw, rivet, stitches } from '../../art/style/details';
import { LX, LY, clip, fill, furCoat, glowDot, glowFinish, goldRamp, heatLayer, lightAll, lin, rad, streak } from '../../art/style/kit-bosses';
import { lockPath } from './pilot-fur';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';

type Opts = { live: boolean; emissive?: boolean; heat?: boolean };

/** A lock of fur as a live sway part: root (x, y), angle, length, width, bend. */
export type Lock = [number, number, number, number, number, number];

/** Paint a lock of fur (strands running out along it). */
export function paintLock(g: Ctx, r: () => number, [x, y, a, l, w, b]: Lock, fur: string): void {
  const path = lockPath(x, y, a, l, w, b);
  clip(g, path, () => {
    g.fillStyle = lin(g, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, [
      [0, shade(fur, -0.35)],
      [1, shade(fur, 0.05)],
    ]);
    g.fillRect(x - l - w, y - l - w, (l + w) * 2, (l + w) * 2);
    g.lineCap = 'round';
    for (let i = 0; i < 80; i++) {
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
  });
}

/** A lock of fur as a live part, swinging from its root. */
export function lockPart(lk: Lock, fur: (art: FootArt) => string, ink: (art: FootArt) => string, seed: string): PartDef {
  const [x, y, a, l, w] = lk;
  const ex = x + Math.cos(a) * l;
  const ey = y + Math.sin(a) * l;
  const pad = w + 12;
  const bx = Math.min(x, ex) - pad;
  const by = Math.min(y, ey) - pad;
  const box = { x: bx, y: by, w: Math.abs(ex - x) + pad * 2, h: Math.abs(ey - y) + pad * 2 };
  return {
    box,
    frames: 1,
    pivot: [x, y],
    draw: (g, art) => {
      const s = new Sil(g, [lockPath(...lk)], box);
      paintLock(s.g, rng(hashStr(seed)), lk, fur(art));
      s.edge(rgba('#06060e', 0.35), 8, LX * 5, LY * 5);
      s.edge(rgba(LIGHT.rim, 0.5), 2.5, LX * 3, LY * 3);
      s.finish(ink(art), { inner: 0.3 });
      // melt the root into the body under it
      g.save();
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = rad(g, x, y, 0, x, y, w * 0.75, [
        [0, 'rgba(0,0,0,0.9)'],
        [1, 'rgba(0,0,0,0)'],
      ]);
      g.fillRect(x - w, y - w, w * 2, w * 2);
      g.restore();
    },
  };
}

const ellipsePath = (x: number, y: number, rx: number, ry: number, rot = 0): PathFn => (c) => {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
};
const toePath = (t: StyleToe): PathFn => ellipsePath(t.cx, t.cy, t.rx, t.ry, t.rot);

// ════════════════════════════ BIGFOOT ════════════════════════════

export const BIG_LOCKS: Lock[] = [
  [CX - 62, 34, Math.PI * 0.82, 52, 34, -0.45],
  [CX - 98, 128, Math.PI * 0.74, 56, 36, -0.4],
  [CX + 66, 38, Math.PI * 0.18, 52, 34, 0.45],
  [CX + 106, 134, Math.PI * 0.26, 56, 36, 0.4],
];

const bigToes = (p: Pose) => poseToes(restToes({ toe: 1.12, toeLen: 0.8, ball: 1.06 }), p);

const bigBody: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 58, -6);
  c.bezierCurveTo(CX - 62, 40, CX - 104, 80, CX - 106, 150);
  c.bezierCurveTo(CX - 107, 188, CX - 94, 204, CX - 72, 214);
  c.lineTo(CX + 74, 218);
  c.bezierCurveTo(CX + 98, 204, CX + 112, 188, CX + 110, 150);
  c.bezierCurveTo(CX + 108, 80, CX + 64, 40, CX + 60, -6);
  c.closePath();
};

function bigFringe(): { path: PathFn; x: number; y: number; ang: number; len: number }[] {
  const r = rng(hashStr('bigfoot-fringe'));
  const out: { path: PathFn; x: number; y: number; ang: number; len: number }[] = [];
  for (const s of [-1, 1]) {
    for (let i = 0; i < 15; i++) {
      const t = i / 14;
      const y = 4 + t * 200;
      const hw = 60 + Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.5) * 46 + (s > 0 ? 4 : 0);
      const ang = Math.PI / 2 - s * (0.95 - t * 0.4) + (r() - 0.5) * 0.3;
      const len = 18 + r() * 16;
      const x = CX + s * (hw - 6);
      out.push({ path: lockPath(x, y, ang, len, 16 + r() * 8, s * (0.25 + r() * 0.25), 2 + (r() < 0.4 ? 1 : 0)), x, y, ang, len });
    }
  }
  return out;
}

function bigClaws(toes: StyleToe[], p: Pose) {
  const c = Math.max(0, p.curl);
  return toes.map((t, i) => {
    const [x, y] = onToe(t, Math.PI / 2);
    const big = i === 4;
    return { x, y: y - t.ry * 0.32, ang: Math.PI / 2 - t.rot * 1.2 + (i - 2) * 0.06, len: (big ? 50 : 40 - (i === 0 ? 6 : 0)) * (1 + c * 0.25), w: big ? 25 : 19, hook: (i < 2 ? 0.28 : i > 2 ? -0.28 : 0.06) * (1 + c * 0.7) };
  });
}

function drawBigfoot(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const fur = art.primary ?? '#7a5233';
  const dark = art.secondary ?? '#2b1a10';
  const skin = art.skin;
  const toes = bigToes(p);
  const claws = bigClaws(toes, p);
  const fringe = bigFringe();
  const locks = o.live ? [] : BIG_LOCKS.map((lk) => lockPath(...lk));
  const box = { x: CX - 156, y: -8, w: 312, h: 320 };
  const sil = new Sil(ctx, [...locks, ...fringe.map((f) => f.path), bigBody, ...toes.map(toePath), ...claws.map((k) => clawPath(k.x, k.y, k.ang, k.len, k.w, k.hook))], box);
  const g = sil.g;
  if (o.heat) {
    heatLayer(sil, box, { seed: 41, y0: 290, y1: 0 });
    return;
  }
  const r = rng(hashStr('bigfoot-fur'));
  const deepF = mix(shade(fur, -0.62), '#140a10', 0.4);
  sil.form({ base: shade(fur, -0.1), shadowTint: '#1a0c10', ramp: 0.9, form: 0.65, formSize: 34, bevel: 0.12, rim: 0.55 });
  // the toes: bare, dark, leathery and callused, caked in dried mud
  toes.forEach((t, i) => {
    clip(g, toePath(t), () => {
      g.fillStyle = rad(g, t.cx - t.rx * 0.35, t.cy + t.ry * 0.1, 2, t.cx, t.cy + t.ry * 0.2, t.ry * 1.1, [
        [0, shade(skin, 0.45)],
        [0.5, skin],
        [1, shade(skin, -0.6)],
      ]);
      g.fillRect(t.cx - t.rx - 2, t.cy - t.ry - 2, t.rx * 2 + 4, t.ry * 2 + 4);
      texture(g, 'leather', box, 0.55, 1.3);
      for (const f of [0.12, 0.32, 0.5]) {
        crease(g, (c) => {
          c.moveTo(t.cx - t.rx * 0.55, t.cy + t.ry * f);
          c.quadraticCurveTo(t.cx, t.cy + t.ry * (f + 0.15), t.cx + t.rx * 0.55, t.cy + t.ry * f);
        }, 1.7, '#0a0604', 0.55, 0.22);
      }
      // a callus on the pad and mud caked low on the toe
      spec(g, t.cx - t.rx * 0.3, t.cy + t.ry * 0.28, t.rx * 0.5, t.ry * 0.22, 0.4, -0.4);
      blotches(g, { x: t.cx - t.rx, y: t.cy + t.ry * 0.15, w: t.rx * 2, h: t.ry }, '#3a2614', 0.85, 7, 0.45, 0.12, 60 + i);
      blotches(g, { x: t.cx - t.rx, y: t.cy + t.ry * 0.25, w: t.rx * 2, h: t.ry }, '#6a5034', 0.5, 4, 0.6, 0.08, 70 + i);
    });
    lobe(g, toePath(t), { x: t.cx - t.rx - 4, y: t.cy - t.ry - 4, w: t.rx * 2 + 8, h: t.ry * 2 + 8 }, t.cy - t.ry, t.cy - t.ry * 0.5, '#000000', 0.6, 7, 0.3);
  });
  // the coat: long, shaggy strands flowing down and out
  clip(g, bigBody, () => {
    // the coat thins out over the ball of the foot so the knuckles stay clear
    furCoat(g, r, { x: CX - 116, y: -6, w: 232, h: 200 }, (x) => Math.PI / 2 - ((x - CX) / 110) * 0.6, fur, deepF, { n: 1.1, len: 22, w: 1.1 });
  });
  // matted clumps: darker, heavier tangles
  for (let i = 0; i < 9; i++) {
    const x = CX - 80 + r() * 160;
    const y = 30 + r() * 130;
    softFill(g, ellipsePath(x, y, 12 + r() * 8, 18 + r() * 10, (r() - 0.5) * 0.6), rgba(deepF, 0.28), 5);
    furCoat(g, r, { x: x - 12, y: y - 14, w: 24, h: 24 }, () => Math.PI / 2 + (r() - 0.5) * 0.6, shade(fur, -0.2), deepF, { n: 0.06, len: 24, w: 1.2 });
  }
  for (const f of fringe) clip(g, f.path, () => furCoat(g, r, { x: f.x - f.len, y: f.y - f.len, w: f.len * 2, h: f.len * 2 }, () => f.ang, fur, deepF, { n: 0.05, len: f.len * 0.7 }));
  g.fillStyle = lin(g, CX - 100, 0, CX + 110, 230, [
    [0, rgba(LIGHT.key, 0.16)],
    [0.45, rgba(LIGHT.key, 0)],
    [1, rgba('#08040a', 0.42)],
  ]);
  g.fillRect(box.x, box.y, box.w, 250);
  // fur spilling over each knuckle
  toes.forEach((t) => {
    const [, ky] = onToe(t, -Math.PI / 2);
    const fy = ky + t.ry * 0.2;
    softStroke(g, (c) => {
      c.moveTo(t.cx - t.rx * 0.9, fy + 2);
      c.quadraticCurveTo(t.cx, fy + 10, t.cx + t.rx * 0.9, fy + 2);
    }, rgba('#000000', 0.5), 6, 3);
    g.save();
    g.lineCap = 'round';
    for (let j = 0; j < 26; j++) {
      const x = t.cx - t.rx * 0.95 + r() * t.rx * 1.9;
      const y0 = ky - 8 + r() * 6;
      const l = (fy - y0) * (0.7 + r() * 0.5);
      const a = Math.PI / 2 + (r() - 0.5) * 0.5;
      g.strokeStyle = rgba(r() < 0.3 ? deepF : r() < 0.8 ? shade(fur, -0.05) : shade(fur, 0.4), 0.85);
      g.lineWidth = 1.2 + r() * 1.8;
      g.beginPath();
      g.moveTo(x, y0);
      g.quadraticCurveTo(x + Math.cos(a + 0.4) * l * 0.5, y0 + l * 0.5, x + Math.cos(a) * l, y0 + Math.sin(a) * l);
      g.stroke();
    }
    g.restore();
  });
  // things caught in the fur: a pine twig with needles, a couple of burrs, a dry leaf
  const twig = (c: Ctx) => {
    c.moveTo(CX + 24, 58);
    c.quadraticCurveTo(CX + 46, 74, CX + 70, 80);
  };
  contact(g, (c) => {
    c.lineWidth = 4;
    c.beginPath();
    twig(c);
    c.stroke();
  }, 0.5, 2, 2);
  g.save();
  g.lineCap = 'round';
  g.strokeStyle = '#4a3020';
  g.lineWidth = 3.4;
  g.beginPath();
  twig(g);
  g.stroke();
  for (let i = 0; i < 14; i++) {
    const u = i / 13;
    const x = CX + 26 + u * 42;
    const y = 59 + u * 20 - u * u * 6;
    for (const s of [-1, 1]) {
      g.strokeStyle = rgba(i % 3 ? '#2f5a2a' : '#4a7a34', 0.95);
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 5 + s * 2, y + s * 9);
      g.stroke();
    }
  }
  g.restore();
  for (const [bx, by] of [[CX - 40, 118], [CX + 54, 152], [CX - 74, 64]] as const) {
    contact(g, (c) => {
      c.beginPath();
      c.arc(bx, by, 6, 0, Math.PI * 2);
      c.fill();
    }, 0.5);
    g.fillStyle = rad(g, bx - 2, by - 2, 0.5, bx, by, 6.5, [
      [0, '#b89a5a'],
      [1, '#4a3a1a'],
    ]);
    g.beginPath();
    g.arc(bx, by, 6, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = rgba('#d8c088', 0.8);
    g.lineWidth = 0.9;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      g.beginPath();
      g.moveTo(bx + Math.cos(a) * 4, by + Math.sin(a) * 4);
      g.lineTo(bx + Math.cos(a) * 8.5, by + Math.sin(a) * 8.5);
      g.stroke();
    }
  }
  const leaf = (c: Ctx) => {
    c.beginPath();
    c.moveTo(CX - 26, 170);
    c.quadraticCurveTo(CX - 10, 154, CX + 8, 166);
    c.quadraticCurveTo(CX - 8, 182, CX - 26, 170);
  };
  contact(g, (c) => {
    leaf(c);
    c.fill();
  }, 0.5);
  fill(g, leaf, lin(g, CX - 26, 160, CX + 8, 176, [
    [0, '#d8a040'],
    [1, '#8a4a18'],
  ]));
  g.strokeStyle = rgba('#5a2a08', 0.7);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(CX - 24, 170);
  g.quadraticCurveTo(CX - 8, 166, CX + 6, 166);
  g.stroke();
  for (const k of claws) paintClaw(g, k.x, k.y, k.ang, k.len, k.w, k.hook, '#f2e6c4', '#4a3218');
  if (!o.live) BIG_LOCKS.forEach((lk, i) => paintLock(g, rng(hashStr('bigfoot-lock' + i)), lk, fur));
  lightAll(sil, 0.42, 22, 0.55);
  sil.finish(inkOf(dark), { openTop: -5, inner: 0.3 });
}

registerStyle('bigfoot', {
  contactY: 268,
  halfWidth: 108,
  rig: { from: 140, to: 162 },
  leg: { kind: 'fur', hw: 58, join: 'blend', fade: 26 },
  parts: Object.fromEntries(BIG_LOCKS.map((lk, i) => [`lock${i}`, lockPart(lk, (a) => a.primary ?? '#7a5233', (a) => inkOf(a.secondary ?? '#2b1a10'), 'bigfoot-lock' + i)])),
  draw(ctx, art, p, o) {
    drawBigfoot(ctx, art, p, o);
  },
});

// ════════════════════════════ KING HONK ════════════════════════════

/** The bow at the throat of the shoe (a live part: it bobs). Knot centre. */
export const HONK_BOW = { x: CX - 4, y: 160 };

const honkShaft: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 62, -6);
  c.bezierCurveTo(CX - 64, 50, CX - 76, 110, CX - 86, 176);
  c.lineTo(CX + 82, 176);
  c.bezierCurveTo(CX + 74, 110, CX + 64, 50, CX + 62, -6);
  c.closePath();
};

const honkBulb = (flex: number, squash: number): PathFn => (c) => {
  const cy = 222 - flex * 8 + squash * 2;
  const rx = 142 + squash * 4;
  const ry = 52 - flex * 6 - squash * 2;
  c.beginPath();
  // a big round toe, swelling more on the big-toe side, flatter underneath
  c.moveTo(CX - rx + 6, cy + 4);
  c.bezierCurveTo(CX - rx - 4, cy - ry * 0.9, CX - 70, cy - ry * 1.35, CX + 4, cy - ry * 1.3);
  c.bezierCurveTo(CX + 90, cy - ry * 1.3, CX + rx + 6, cy - ry * 0.8, CX + rx, cy + 6);
  c.bezierCurveTo(CX + rx - 6, cy + ry * 0.9, CX + 60, cy + ry, CX, cy + ry);
  c.bezierCurveTo(CX - 70, cy + ry, CX - rx + 10, cy + ry * 0.85, CX - rx + 6, cy + 4);
  c.closePath();
};

const honkSole = (flex: number, squash: number): PathFn => (c) => {
  const b = 272 - flex * 7 + squash * 1;
  const rx = 130 + squash * 4;
  c.beginPath();
  c.moveTo(CX - rx, 236 - flex * 8);
  c.bezierCurveTo(CX - rx - 6, b - 8, CX - 90, b, CX, b);
  c.bezierCurveTo(CX + 90, b, CX + rx + 10, b - 8, CX + rx + 6, 236 - flex * 8);
  c.closePath();
};

/** A bow tie with polka dots, and a small gold crown on the knot. Drawn round (x, y). */
function honkBowPaths(x: number, y: number): PathFn[] {
  const wing = (s: number): PathFn => (c) => {
    c.beginPath();
    c.moveTo(x + s * 8, y - 6);
    c.bezierCurveTo(x + s * 30, y - 30, x + s * 58, y - 26, x + s * 56, y);
    c.bezierCurveTo(x + s * 58, y + 26, x + s * 30, y + 30, x + s * 8, y + 6);
    c.closePath();
  };
  return [wing(-1), wing(1), ellipsePath(x, y, 13, 15)];
}

function crownPath(x: number, y: number, w: number, h: number): PathFn {
  return (c) => {
    c.beginPath();
    c.moveTo(x - w / 2, y);
    c.lineTo(x - w / 2 - 2, y - h * 0.75);
    c.lineTo(x - w / 4, y - h * 0.4);
    c.lineTo(x, y - h);
    c.lineTo(x + w / 4, y - h * 0.4);
    c.lineTo(x + w / 2 + 2, y - h * 0.75);
    c.lineTo(x + w / 2, y);
    c.closePath();
  };
}

function paintCrown(g: Ctx, x: number, y: number, w: number, h: number): void {
  const p = crownPath(x, y, w, h);
  contact(g, (c) => {
    p(c);
    c.fill();
  }, 0.5);
  fill(g, p, goldRamp(g, x - w / 2, y - h, x + w / 2, y));
  clip(g, p, () => {
    g.fillStyle = rgba('#5a3a08', 0.5);
    g.fillRect(x - w, y - h * 0.22, w * 2, h * 0.22);
  });
  for (const [px, py] of [[x - w / 2 - 2, y - h * 0.75], [x, y - h], [x + w / 2 + 2, y - h * 0.75]] as const) {
    g.fillStyle = rad(g, px - 0.6, py - 0.6, 0.2, px, py, 2.6, [
      [0, '#fffbe0'],
      [1, '#c8901a'],
    ]);
    g.beginPath();
    g.arc(px, py, 2.4, 0, Math.PI * 2);
    g.fill();
  }
  for (const [gx, col] of [[x - w * 0.27, '#ff3d7f'], [x, '#39ff88'], [x + w * 0.27, '#3aa0ff']] as const) {
    g.fillStyle = rad(g, gx - 0.8, y - h * 0.3 - 0.8, 0.2, gx, y - h * 0.3, 2.8, [
      [0, mix(col, '#ffffff', 0.7)],
      [1, shade(col, -0.4)],
    ]);
    g.beginPath();
    g.arc(gx, y - h * 0.3, 2.6, 0, Math.PI * 2);
    g.fill();
  }
  glint(g, x - w * 0.3, y - h * 0.55, 3, 0.8);
}

function paintBow(g: Ctx, x: number, y: number, green: string): void {
  const [wl, wr, knot] = honkBowPaths(x, y);
  for (const [w, s] of [[wl, -1], [wr, 1]] as const) {
    contact(g, (c) => {
      w(c);
      c.fill();
    }, 0.5, 3, 4);
    fill(g, w, lin(g, x + s * 8, y - 28, x + s * 56, y + 28, s < 0 ? [[0, shade(green, 0.35)], [0.6, green], [1, shade(green, -0.4)]] : [[0, shade(green, 0.1)], [0.5, shade(green, -0.15)], [1, shade(green, -0.5)]]));
    clip(g, w, () => {
      // polka dots, and the fabric gathered into the knot
      g.fillStyle = rgba('#ffffff', 0.88);
      for (const [dx, dy] of [[22, -12], [40, 4], [26, 14], [48, -14]] as const) {
        g.beginPath();
        g.ellipse(x + s * dx, y + dy, 4.2, 4.6, 0, 0, Math.PI * 2);
        g.fill();
      }
      for (const f of [-14, -4, 6, 16]) softStroke(g, (c) => {
        c.moveTo(x + s * 10, y + f * 0.3);
        c.quadraticCurveTo(x + s * 30, y + f * 1.1, x + s * 52, y + f * 1.4);
      }, rgba('#062a14', 0.22), 2.5, 1.5);
      spec(g, x + s * 28, y - 14, 16, 6, s < 0 ? 0.55 : 0.25, -0.3);
    });
  }
  contact(g, (c) => {
    knot(c);
    c.fill();
  }, 0.5);
  fill(g, knot, rad(g, x - 4, y - 5, 1, x, y, 15, [
    [0, shade(green, 0.4)],
    [1, shade(green, -0.4)],
  ]));
  paintCrown(g, x, y - 9, 28, 24);
}

function drawHonk(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const purple = art.primary ?? '#8a2be2';
  const green = art.secondary ?? '#39ff88';
  const flex = Math.max(0, p.curl);
  const squash = Math.max(0, -p.curl);
  const bulb = honkBulb(flex, squash);
  const sole = honkSole(flex, squash);
  const bowParts = o.live ? [] : honkBowPaths(HONK_BOW.x, HONK_BOW.y);
  const box = { x: CX - 152, y: -8, w: 304, h: 284 };
  const sil = new Sil(ctx, [honkShaft, sole, bulb, ...bowParts], box);
  const g = sil.g;
  if (o.heat) {
    heatLayer(sil, box, { seed: 43, y0: 275, y1: 20, mid: '#ff4a3a' });
    return;
  }
  // patent leather: deep, glossy, the light swinging hard across it
  sil.form({ base: purple, shadowTint: '#12043a', ramp: 1, form: 0.6, formSize: 30, bevel: 0.45, rim: 0.6 });
  texture(g, 'grain', box, 0.08);
  // the white rubber sole under the toe
  clip(g, sole, () => {
    g.fillStyle = lin(g, 0, 230, 0, 274, [
      [0, '#ffffff'],
      [0.6, '#e8e4ee'],
      [1, '#a8a2b8'],
    ]);
    g.fillRect(box.x, 220, box.w, 60);
    texture(g, 'rubber', box, 0.3);
    blotches(g, { x: box.x, y: 240, w: box.w, h: 34 }, '#3a3040', 0.35, 6, 0.6, 0.1, 47);
    stitches(g, (c) => {
      c.moveTo(CX - 128, 246 - flex * 8);
      c.bezierCurveTo(CX - 100, 262 - flex * 7, CX + 100, 262 - flex * 7, CX + 132, 246 - flex * 8);
    }, rgba('#8a80a0', 0.8), 1.6, 4, 3);
  });
  // the toe bulb over the sole, casting its shadow on it
  contact(g, (c) => {
    bulb(c);
    c.fill();
  }, 0.55, 3, 5);
  clip(g, bulb, () => {
    const cy = 222 - flex * 8;
    g.fillStyle = rad(g, CX - 50, cy - 36, 10, CX + 10, cy, 160, [
      [0, shade(purple, 0.45)],
      [0.35, shade(purple, 0.08)],
      [0.75, shade(purple, -0.35)],
      [1, mix(shade(purple, -0.6), '#12043a', 0.4)],
    ]);
    g.fillRect(box.x, 150, box.w, 130);
    // a reflected window on the patent, then a long hot highlight along the top of the bulb
    softFill(g, (c) => {
      c.beginPath();
      c.roundRect(CX - 92, cy - 40, 30, 16, 4);
      c.roundRect(CX - 58, cy - 42, 24, 16, 4);
    }, rgba('#ffffff', 0.5), 2);
    streak(g, (c) => {
      c.moveTo(CX - 118, cy - 4);
      c.bezierCurveTo(CX - 100, cy - 44, CX - 20, cy - 58, CX + 60, cy - 50);
    }, 4, 0.55);
    spec(g, CX + 96, cy + 14, 30, 10, 0.25, -0.6, '#e8d8ff');
    // the toe cap seam
    stitches(g, (c) => c.ellipse(CX + 6, cy + 8, 96, 30, 0, Math.PI + 0.25, -0.2), rgba('#d8c0ff', 0.55), 1.6, 4, 3.5);
  });
  // the shaft: patent too, with the neon lacing up the front
  clip(g, honkShaft, () => {
    g.fillStyle = lin(g, CX - 70, 0, CX + 70, 0, [
      [0, shade(purple, -0.15)],
      [0.25, shade(purple, 0.3)],
      [0.5, purple],
      [0.85, shade(purple, -0.45)],
      [1, shade(purple, -0.2)],
    ]);
    g.fillRect(box.x, -8, box.w, 190);
    streak(g, (c) => {
      c.moveTo(CX - 44, 6);
      c.bezierCurveTo(CX - 48, 60, CX - 54, 110, CX - 62, 166);
    }, 3, 0.45);
    // the tongue under the laces
    softFill(g, (c) => {
      c.beginPath();
      c.roundRect(CX - 26, -10, 52, 160, 14);
    }, rgba('#000000', 0.35), 4);
    g.fillStyle = lin(g, CX - 24, 0, CX + 24, 0, [
      [0, shade(purple, -0.05)],
      [1, shade(purple, -0.45)],
    ]);
    g.beginPath();
    g.roundRect(CX - 22, -10, 44, 156, 12);
    g.fill();
    // collar: a padded, rolled rim
    g.fillStyle = lin(g, 0, -8, 0, 16, [
      [0, rgba('#000000', 0.5)],
      [0.5, rgba(shade(purple, 0.4), 0.35)],
      [1, rgba('#000000', 0)],
    ]);
    g.fillRect(box.x, -8, box.w, 24);
  });
  const ys = [18, 46, 74, 102, 130];
  for (let i = ys.length - 1; i > 0; i--) for (const s of [-1, 1]) laceRun(g, CX - s * 30, ys[i], CX + s * 30, ys[i - 1], green, 6);
  for (const y of ys) for (const s of [-1, 1]) eyelet(g, CX + s * 31, y, 5.2, '#e8e0ff');
  if (!o.live) paintBow(g, HONK_BOW.x, HONK_BOW.y, green);
  glint(g, CX - 84, 190 - flex * 8, 6, 0.9);
  glint(g, CX - 40, 30, 3.5, 0.7);
  lightAll(sil, 0.38, 20, 0.6);
  sil.finish(inkOf(purple), { openTop: -5 });
}

registerStyle('clownking', {
  contactY: 270,
  halfWidth: 146,
  rig: { from: 186, to: 204 },
  leg: { kind: 'knit', hw: 60, join: 'into' },
  parts: {
    bow: {
      box: { x: HONK_BOW.x - 64, y: HONK_BOW.y - 40, w: 128, h: 74 },
      frames: 1,
      pivot: [HONK_BOW.x, HONK_BOW.y],
      draw: (g, art) => {
        const s = new Sil(g, honkBowPaths(HONK_BOW.x, HONK_BOW.y).concat(crownPath(HONK_BOW.x, HONK_BOW.y - 9, 28, 24)), { x: HONK_BOW.x - 64, y: HONK_BOW.y - 36, w: 128, h: 70 });
        paintBow(s.g, HONK_BOW.x, HONK_BOW.y, art.secondary ?? '#39ff88');
        s.edge(rgba(LIGHT.rim, 0.5), 2.5, LX * 3, LY * 3);
        s.finish(inkOf(shade(art.secondary ?? '#39ff88', -0.3)), { inner: 0.3 });
      },
    },
  },
  draw(ctx, art, p, o) {
    drawHonk(ctx, art, p, o);
  },
});

// ════════════════════════════ T-REX TOES ════════════════════════════

/** The three great toes: little-toe side, middle, big-toe side. */
function rexToes(p: Pose): StyleToe[] {
  const c = Math.max(0, p.curl);
  const s = Math.max(0, -p.curl);
  const base: StyleToe[] = [
    { cx: CX - 62, cy: 222, rx: 31, ry: 46, rot: 0.3 },
    { cx: CX + 2, cy: 236, rx: 35, ry: 52, rot: 0 },
    { cx: CX + 66, cy: 222, rx: 31, ry: 46, rot: -0.3 },
  ];
  return base.map((t, i) => {
    const w = p.wiggle[i + 1] ?? 0;
    return { cx: t.cx + (t.cx - CX) * 0.1 * s, cy: t.cy - t.ry * 0.26 * c + 4 * w + 2 * s, rx: t.rx * (1 + 0.06 * c), ry: t.ry * (1 - 0.22 * c + 0.05 * w), rot: t.rot * (1 + 0.5 * s) - w * 0.06 };
  });
}

function rexClaws(toes: StyleToe[], p: Pose) {
  const c = Math.max(0, p.curl);
  return toes.map((t, i) => {
    const [x, y] = onToe(t, Math.PI / 2);
    return { x, y: y - t.ry * 0.28, ang: Math.PI / 2 - t.rot * 1.1, len: (i === 1 ? 60 : 52) * (1 + c * 0.3), w: i === 1 ? 30 : 26, hook: (i === 0 ? 0.32 : i === 2 ? -0.32 : 0.1) * (1 + c * 0.9) };
  });
}

const rexBody: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 56, -6);
  c.bezierCurveTo(CX - 58, 50, CX - 98, 110, CX - 98, 170);
  c.bezierCurveTo(CX - 98, 200, CX - 86, 214, CX - 70, 222);
  c.lineTo(CX + 72, 222);
  c.bezierCurveTo(CX + 88, 214, CX + 100, 200, CX + 100, 170);
  c.bezierCurveTo(CX + 100, 110, CX + 60, 50, CX + 58, -6);
  c.closePath();
};

function drawRex(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const green = art.skin;
  const gold = art.secondary ?? '#ffcc33';
  const toes = rexToes(p);
  const claws = rexClaws(toes, p);
  const box = { x: CX - 128, y: -8, w: 256, h: 318 };
  const sil = new Sil(ctx, [rexBody, ...toes.map(toePath), ...claws.map((k) => clawPath(k.x, k.y, k.ang, k.len, k.w, k.hook))], box);
  const g = sil.g;
  if (o.heat) {
    heatLayer(sil, box, { seed: 45, y0: 300, y1: 10 });
    return;
  }
  const deep = mix(shade(green, -0.6), '#0a1a20', 0.4);
  sil.form({ base: green, shadowTint: '#0a2030', ramp: 0.9, form: 0.6, formSize: 32, bevel: 0.3, rim: 0.55 });
  texture(g, 'scales', box, 0.32, 2.4);
  // tiger bands across the back, and a scatter of gold speckles
  for (let i = 0; i < 6; i++) {
    const y = 18 + i * 30;
    const w = 50 + i * 9;
    softFill(g, (c) => {
      c.beginPath();
      c.moveTo(CX - w, y);
      c.quadraticCurveTo(CX - w * 0.4, y + 10, CX - 6, y + 4 + (i % 2) * 4);
      c.quadraticCurveTo(CX - w * 0.4, y + 18, CX - w - 4, y + 14);
      c.closePath();
      c.moveTo(CX + w, y + 3);
      c.quadraticCurveTo(CX + w * 0.4, y + 12, CX + 8, y + 6);
      c.quadraticCurveTo(CX + w * 0.4, y + 20, CX + w + 4, y + 17);
      c.closePath();
    }, rgba(deep, 0.45), 2.5);
  }
  blotches(g, { x: box.x, y: 0, w: box.w, h: 170 }, mix(gold, green, 0.45), 0.35, 6, 0.7, 0.06, 51);
  // the hide's folds at the ankle
  for (const [y, w] of [[34, 40], [48, 46], [62, 52]] as const) {
    crease(g, (c) => {
      c.moveTo(CX - w, y);
      c.quadraticCurveTo(CX, y + 9, CX + w, y - 2);
    }, 2.4, deep, 0.5, 0.25);
  }
  // osteoderms: a ridge of bony plates down the middle of the foot
  for (let i = 0; i < 7; i++) {
    const y = 24 + i * 25;
    const rx = 8 + Math.sin((i / 6) * Math.PI) * 5;
    const op = ellipsePath(CX + Math.sin(i * 1.3) * 1.5, y, rx, rx * 1.25);
    contact(g, (c) => {
      op(c);
      c.fill();
    }, 0.55, 2.5, 3);
    fill(g, op, rad(g, CX - rx * 0.4, y - rx * 0.5, 1, CX, y, rx * 1.3, [
      [0, mix('#e8dcb0', green, 0.25)],
      [0.55, mix(shade(green, 0.1), '#a89a70', 0.4)],
      [1, shade(green, -0.5)],
    ]));
    // the keel
    g.strokeStyle = rgba('#fff6d8', 0.5);
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(CX - 1, y - rx);
    g.lineTo(CX - 1, y + rx);
    g.stroke();
    for (const s of [-1, 1]) {
      const sx = CX + s * (30 + i * 4);
      const sy = y + 10;
      const sp = ellipsePath(sx, sy, 5, 6);
      contact(g, (c) => {
        sp(c);
        c.fill();
      }, 0.45, 1.6, 2);
      fill(g, sp, rad(g, sx - 2, sy - 2, 0.5, sx, sy, 7, [
        [0, shade(green, 0.4)],
        [1, shade(green, -0.4)],
      ]));
    }
  }
  // the toes: banded scutes across their backs, pale undersides showing at the edges
  toes.forEach((t, i) => {
    clip(g, toePath(t), () => {
      g.fillStyle = lin(g, t.cx - t.rx, 0, t.cx + t.rx, 0, [
        [0, rgba(mix(gold, '#ffffff', 0.2), 0.28)],
        [0.2, rgba(gold, 0)],
        [0.8, rgba('#000000', 0)],
        [1, rgba('#000000', 0.3)],
      ]);
      g.fillRect(t.cx - t.rx, t.cy - t.ry, t.rx * 2, t.ry * 2);
      for (let k = 0; k < 6; k++) {
        const f = -0.55 + k * 0.24;
        const [ax, ay] = [t.cx + Math.sin(-t.rot) * t.ry * f, t.cy + Math.cos(t.rot) * t.ry * f];
        const scute = (c: Ctx) => {
          c.moveTo(ax - Math.cos(t.rot) * t.rx * 0.85, ay - Math.sin(t.rot) * t.rx * 0.85);
          c.quadraticCurveTo(ax + Math.sin(-t.rot) * 8, ay + 8, ax + Math.cos(t.rot) * t.rx * 0.85, ay + Math.sin(t.rot) * t.rx * 0.85);
        };
        // each scute a lit band with a dark groove under its edge
        g.save();
        g.translate(0, -4);
        softStroke(g, scute, rgba(mix(shade(green, 0.35), gold, 0.2), 0.35), 4, 1.5);
        g.restore();
        crease(g, scute, 2.6, deep, 0.75, 0.35);
      }
      spec(g, t.cx - t.rx * 0.35, t.cy - t.ry * 0.1, t.rx * 0.45, t.ry * 0.5, 0.25, -0.2);
    });
    lobe(g, toePath(t), { x: t.cx - t.rx - 4, y: t.cy - t.ry - 4, w: t.rx * 2 + 8, h: t.ry * 2 + 8 }, t.cy - t.ry * 0.9, t.cy - t.ry * 0.2, deep, 0.6, 9, 0.3);
    void i;
  });
  // where the toes part
  for (let i = 0; i < 2; i++) {
    const a = toes[i];
    const b = toes[i + 1];
    const kx = (a.cx + a.rx * 0.6 + b.cx - b.rx * 0.6) / 2;
    softStroke(g, (c) => {
      c.moveTo(kx, Math.max(a.cy, b.cy) - 10);
      c.lineTo(kx - 1, Math.min(a.cy, b.cy) - 46);
    }, rgba(deep, 0.5), 5, 3);
  }
  for (const k of claws) paintClaw(g, k.x, k.y, k.ang, k.len, k.w, k.hook, '#cfc0a0', '#141008');
  lightAll(sil, 0.4, 20, 0.55);
  sil.finish(inkOf(green), { openTop: -5 });
}

registerStyle('trex', {
  contactY: 292,
  halfWidth: 104,
  rig: { from: 148, to: 170 },
  leg: { kind: 'skin', hw: 57, join: 'blend', fade: 26 },
  draw(ctx, art, p, o) {
    drawRex(ctx, art, p, o);
  },
});

// ════════════════════════════ THE COLOSSUS ════════════════════════════

const colCollar: PathFn = (c) => {
  c.beginPath();
  c.roundRect(CX - 70, -6, 140, 30, 8);
};

const colInstep: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 66, 20);
  c.bezierCurveTo(CX - 72, 60, CX - 92, 96, CX - 98, 132);
  c.lineTo(CX + 98, 132);
  c.bezierCurveTo(CX + 92, 96, CX + 72, 60, CX + 66, 20);
  c.closePath();
};

/** A lame of the sabaton: i from 0 (top) down; flex closes them up. */
const colLame = (i: number, flex: number): PathFn => (c) => {
  const y = 120 + i * (24 - flex * 5);
  const hw = 104 - i * i * 2.4 - i * 2;
  const sag = 16 + i * 3;
  c.beginPath();
  c.moveTo(CX - hw, y);
  c.bezierCurveTo(CX - hw + 2, y + 26, CX - hw * 0.5, y + sag + 16, CX, y + sag + 16);
  c.bezierCurveTo(CX + hw * 0.5, y + sag + 16, CX + hw - 2, y + 26, CX + hw, y);
  c.bezierCurveTo(CX + hw * 0.5, y + sag * 0.6, CX - hw * 0.5, y + sag * 0.6, CX - hw, y);
  c.closePath();
};

/** The pointed toe cap. */
const colToe = (flex: number): PathFn => (c) => {
  const y = 120 + 5 * (24 - flex * 5);
  const tip = 268 - flex * 10;
  c.beginPath();
  c.moveTo(CX - 52, y + 6);
  c.bezierCurveTo(CX - 50, y + 40, CX - 20, tip - 10, CX, tip);
  c.bezierCurveTo(CX + 20, tip - 10, CX + 50, y + 40, CX + 52, y + 6);
  c.bezierCurveTo(CX + 20, y + 22, CX - 20, y + 22, CX - 52, y + 6);
  c.closePath();
};

/** The lancet window on the instep: a pointed arch. */
const WIN = { x: CX, top: 30, bottom: 116, hw: 26 };
const winPath: PathFn = (c) => {
  const { x, top, bottom, hw } = WIN;
  c.beginPath();
  c.moveTo(x - hw, bottom);
  c.lineTo(x - hw, top + 34);
  c.quadraticCurveTo(x - hw, top + 4, x, top);
  c.quadraticCurveTo(x + hw, top + 4, x + hw, top + 34);
  c.lineTo(x + hw, bottom);
  c.closePath();
};

/** The stained glass: a rose at the top, lancet panes below; k brightness (1 for the glow layer). */
function stainedGlass(g: Ctx, k: number): void {
  const { x, top, bottom, hw } = WIN;
  clip(g, winPath, () => {
    g.fillStyle = rgba('#0a0a1a', 1);
    g.fillRect(x - hw, top, hw * 2, bottom - top);
    const panes: [number, number, number, number, string][] = [];
    const cols = ['#3a6aff', '#e8402f', '#ffcf3a', '#3ac86a', '#9a4aff'];
    let n = 0;
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 3; col++) panes.push([x - hw + col * ((hw * 2) / 3), top + 40 + row * ((bottom - top - 40) / 4), (hw * 2) / 3, (bottom - top - 40) / 4, cols[(row * 2 + col + n++) % cols.length]]);
    for (const [px, py, pw, ph, col] of panes) {
      g.fillStyle = rad(g, px + pw * 0.4, py + ph * 0.4, 0.5, px + pw / 2, py + ph / 2, pw, [
        [0, rgba(mix(col, '#ffffff', 0.45), k)],
        [1, rgba(shade(col, -0.25), k * 0.95)],
      ]);
      g.fillRect(px + 1, py + 1, pw - 2, ph - 2);
    }
    // the rose window at the top
    const rx = x;
    const ry = top + 22;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.fillStyle = rgba(i % 2 ? '#e8402f' : '#3a6aff', k);
      g.beginPath();
      g.ellipse(rx + Math.cos(a) * 9, ry + Math.sin(a) * 9, 6.5, 4, a, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = rgba('#ffcf3a', k);
    g.beginPath();
    g.arc(rx, ry, 5, 0, Math.PI * 2);
    g.fill();
    // the lead cames
    g.strokeStyle = '#141018';
    g.lineWidth = 2.2;
    g.beginPath();
    for (let col = 1; col < 3; col++) {
      g.moveTo(x - hw + col * ((hw * 2) / 3), top + 40);
      g.lineTo(x - hw + col * ((hw * 2) / 3), bottom);
    }
    for (let row = 0; row <= 4; row++) {
      g.moveTo(x - hw, top + 40 + row * ((bottom - top - 40) / 4));
      g.lineTo(x + hw, top + 40 + row * ((bottom - top - 40) / 4));
    }
    g.moveTo(rx + 16, ry);
    g.arc(rx, ry, 16, 0, Math.PI * 2);
    g.stroke();
  });
}

function drawColossus(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const steel = art.primary ?? '#6d7480';
  const gold = art.secondary ?? '#ffcf3a';
  const flex = Math.max(0, p.curl);
  const lames = [0, 1, 2, 3, 4].map((i) => colLame(i, flex));
  const toe = colToe(flex);
  const box = { x: CX - 116, y: -8, w: 232, h: 284 };
  const sil = new Sil(ctx, [colCollar, colInstep, ...lames, toe], box);
  const g = sil.g;
  if (o.emissive) {
    stainedGlass(g, 1);
    glowFinish(sil);
    return;
  }
  if (o.heat) {
    // the lame edges run hottest
    softStroke(g, (c) => {
      for (let i = 0; i < 5; i++) {
        const y = 120 + i * 24;
        const hw = 104 - i * i * 2.4 - i * 2;
        c.moveTo(CX - hw, y);
        c.bezierCurveTo(CX - hw * 0.5, y + 10, CX + hw * 0.5, y + 10, CX + hw, y);
      }
    }, rgba('#ffd27a', 0.7), 3, 2);
    heatLayer(sil, box, { seed: 49, y0: 270, y1: 10 });
    return;
  }
  const chrome = (y0: number, y1: number) =>
    lin(g, CX - 100, y0, CX + 100, y1, [
      [0, '#e8ecf2'],
      [0.16, mix(steel, '#ffffff', 0.35)],
      [0.3, '#f6f8fb'],
      [0.48, shade(steel, -0.25)],
      [0.72, mix(steel, '#c8d0dc', 0.4)],
      [1, shade(steel, -0.6)],
    ]);
  sil.fillParts(steel);
  // the instep plate, with the window set in it
  clip(g, colInstep, () => {
    g.fillStyle = chrome(10, 140);
    g.fillRect(box.x, 10, box.w, 130);
    texture(g, 'brushed', box, 0.22);
    // engraved gothic tracery round the window
    for (const s of [-1, 1]) {
      crease(g, (c) => {
        c.moveTo(CX + s * 34, 120);
        c.lineTo(CX + s * 34, 60);
        c.quadraticCurveTo(CX + s * 34, 30, CX, 22);
      }, 1.6, '#14161e', 0.5, 0.4);
      for (let k = 0; k < 3; k++) {
        const y = 52 + k * 24;
        crease(g, (c) => {
          c.moveTo(CX + s * 44, y);
          c.quadraticCurveTo(CX + s * 58, y - 10, CX + s * 70, y + 2);
          c.moveTo(CX + s * 50, y + 4);
          c.quadraticCurveTo(CX + s * 56, y + 10, CX + s * 64, y + 8);
        }, 1.3, '#14161e', 0.4, 0.35);
      }
    }
  });
  // the window's frame and the glass
  contact(g, (c) => {
    winPath(c);
    c.lineWidth = 6;
    c.stroke();
  }, 0.5, 2, 3);
  stainedGlass(g, 0.92);
  g.save();
  winPath(g);
  g.strokeStyle = goldRamp(g, WIN.x - WIN.hw, WIN.top, WIN.x + WIN.hw, WIN.bottom, gold);
  g.lineWidth = 4.5;
  g.lineJoin = 'round';
  g.stroke();
  g.restore();
  spec(g, WIN.x - 12, WIN.top + 46, 10, 26, 0.35, -0.2);
  // the lames, top to bottom, each casting its shadow on the next, gold-edged
  const layers = [...lames, toe];
  layers.forEach((pl, i) => {
    contact(g, (c) => {
      pl(c);
      c.fill();
    }, 0.6, 3, 4);
    const y = 120 + i * (24 - flex * 5);
    clip(g, pl, () => {
      g.fillStyle = chrome(y - 10, y + 50);
      g.fillRect(box.x, y - 10, box.w, 160);
      texture(g, 'brushed', box, 0.2);
      // the central ridge catching the light
      g.fillStyle = lin(g, CX - 6, 0, CX + 6, 0, [
        [0, rgba('#ffffff', 0)],
        [0.4, rgba('#ffffff', 0.55)],
        [0.6, rgba('#000000', 0.25)],
        [1, rgba('#000000', 0)],
      ]);
      g.fillRect(CX - 6, y - 10, 12, 160);
      spec(g, CX - 44, y + 14, 26, 4, 0.75, 0.1);
    });
    lobe(g, pl, { x: box.x, y: y - 12, w: box.w, h: 90 }, y - 20, y - 10, '#0a0c14', 0.55, 6, 0.5);
    if (i < 5) {
      const hw = 104 - i * i * 2.4 - i * 2;
      const sag = 16 + i * 3;
      // gold trim along the bottom edge
      g.save();
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(CX - hw + 3, y + 8);
      g.bezierCurveTo(CX - hw + 4, y + 26, CX - hw * 0.5, y + sag + 13, CX, y + sag + 13);
      g.bezierCurveTo(CX + hw * 0.5, y + sag + 13, CX + hw - 4, y + 26, CX + hw - 3, y + 8);
      g.strokeStyle = goldRamp(g, CX - hw, y, CX + hw, y + 30, gold);
      g.lineWidth = 3.6;
      g.stroke();
      g.restore();
      rivet(g, CX - hw + 9, y + 9, 3.6, '#d8c070');
      rivet(g, CX + hw - 9, y + 9, 3.6, '#d8c070');
    }
  });
  // the collar: a gold-edged ring the greave drops into
  clip(g, colCollar, () => {
    g.fillStyle = lin(g, 0, -6, 0, 24, [
      [0, mix(steel, '#ffffff', 0.4)],
      [0.45, steel],
      [1, shade(steel, -0.6)],
    ]);
    g.fillRect(box.x, -8, box.w, 34);
    g.fillStyle = goldRamp(g, CX - 70, 16, CX + 70, 24, gold);
    g.fillRect(CX - 70, 17, 140, 6);
  });
  for (let i = 0; i < 6; i++) rivet(g, CX - 58 + i * 23.2, 8, 3.4, '#e0c878');
  glint(g, CX - 62, 132, 6, 0.9);
  glint(g, CX - 30, 212 - flex * 20, 4.5, 0.8);
  ao(g, CX, 28, 64, 6, 0.4);
  lightAll(sil, 0.45, 22, 0.6);
  sil.finish('#14121a');
}

registerStyle('colossus', {
  contactY: 266,
  halfWidth: 106,
  rig: { from: 150, to: 172 },
  leg: { kind: 'iron', hw: 62, join: 'into' },
  draw(ctx, art, p, o) {
    drawColossus(ctx, art, p, o);
  },
});

// ════════════════════════════ GHOST OF FEET PAST ════════════════════════════

/** The shackle's chain hangs from this link (a live part: it swings). */
export const GHOST_CHAIN = { x: CX - 54, y: 50 };
const CHAIN_LINKS = 6;

function paintChain(g: Ctx, metal: string, ink?: string): void {
  for (let i = 0; i < CHAIN_LINKS; i++) {
    const x = GHOST_CHAIN.x - 6 - i * 3;
    const y = GHOST_CHAIN.y + 8 + i * 15;
    const edge = i % 2 === 1;
    const rx = edge ? 3.5 : 8;
    g.save();
    if (ink) {
      g.lineWidth = (edge ? 4.5 : 3.6) + 2.6;
      g.strokeStyle = ink;
      g.beginPath();
      g.ellipse(x, y, rx - 1.5, 8.5, 0, 0, Math.PI * 2);
      g.stroke();
    }
    g.lineWidth = edge ? 4.5 : 3.6;
    g.strokeStyle = lin(g, x - rx, y - 10, x + rx, y + 10, [
      [0, mix(metal, '#ffffff', 0.5)],
      [0.5, metal],
      [1, shade(metal, -0.55)],
    ]);
    g.beginPath();
    g.ellipse(x, y, rx - 1.5, 8.5, 0, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }
  // the last link snapped open
  const lx = GHOST_CHAIN.x - 6 - (CHAIN_LINKS - 1) * 3;
  const ly = GHOST_CHAIN.y + 8 + (CHAIN_LINKS - 1) * 15;
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.fillRect(lx + 2, ly + 2, 10, 8);
  g.restore();
}

function drawGhost(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const skin = art.skin;
  const nails = art.nails ?? '#8fc7ff';
  const f = paintBare(ctx, { skin, nails, shadowTint: '#2a3aa8', pores: 0.08, detail: 0.5 }, p);
  const g = f.sil.g;
  const box = f.box;
  if (o.emissive || o.heat) {
    // the spectral glow from inside (emissive) or the cold flame (heat): both glow-only layers over the foot
    g.clearRect(-3000, -3000, 6000, 6000);
    if (o.heat) {
      heatLayer(f.sil, box, { seed: 53, y0: 280, y1: 0, hot: '#f2fdff', mid: '#7fd8ff', deep: '#3a4aff' });
      return;
    }
    f.sil.edge(rgba('#9fe0ff', 0.9), 16, 0, 0);
    for (const t of f.toes) {
      const [nx, ny] = onToe(t, Math.PI / 2);
      glowDot(g, nx, ny - t.ry * 0.35, t.rx * 0.7, nails, 0.7);
    }
    for (const [x, y, s] of GHOST_FACES) for (const dx of [-6, 6]) glowDot(g, x + dx * s, y - 4 * s, 4.5 * s, '#c8f0ff', 0.55);
    glowFinish(f.sil);
    return;
  }
  // translucency: the light passes through the edges and pools inside, cold and blue
  f.sil.edge(rgba('#e8f8ff', 0.55), 18, 0, 0, 'screen');
  g.fillStyle = rad(g, CX - 10, 120, 10, CX, 140, 150, [
    [0, rgba('#ffffff', 0.25)],
    [0.6, rgba('#a8d8ff', 0.1)],
    [1, rgba('#3a4aa8', 0.2)],
  ]);
  g.fillRect(box.x, box.y, box.w, box.h);
  // ectoplasm swirling inside, and faces of feet past drifting in it
  const r = rng(hashStr('ghost-swirl'));
  for (let i = 0; i < 7; i++) {
    const x0 = CX - 70 + r() * 140;
    const y0 = 20 + r() * 170;
    softStroke(g, (c) => {
      c.moveTo(x0, y0);
      c.bezierCurveTo(x0 + 30 * (r() - 0.5) * 2, y0 + 20, x0 + 40 * (r() - 0.5), y0 + 40, x0 + 20 * (r() - 0.5), y0 + 60);
    }, rgba(r() < 0.5 ? '#ffffff' : '#7fc8ff', 0.18), 6 + r() * 6, 4);
  }
  for (const [x, y, s] of GHOST_FACES) {
    softFill(g, ellipsePath(x, y, 22 * s, 26 * s), rgba('#ffffff', 0.12), 6);
    for (const dx of [-6, 6]) softFill(g, ellipsePath(x + dx * s, y - 4 * s, 3.4 * s, 4.6 * s), rgba('#1a2a6a', 0.4), 1.5);
    softFill(g, ellipsePath(x, y + 9 * s, 3.6 * s, 5.4 * s), rgba('#1a2a6a', 0.36), 1.5);
  }
  // the shackle: a band of ghostly iron round the ankle
  const cuff: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 58, 34);
    c.quadraticCurveTo(CX, 46, CX + 60, 34);
    c.lineTo(CX + 62, 56);
    c.quadraticCurveTo(CX, 68, CX - 60, 56);
    c.closePath();
  };
  contact(g, (c) => {
    cuff(c);
    c.fill();
  }, 0.5, 3, 4);
  const metal = '#7a90a8';
  fill(g, cuff, lin(g, CX - 60, 34, CX + 60, 66, [
    [0, mix(metal, '#ffffff', 0.45)],
    [0.35, metal],
    [1, shade(metal, -0.55)],
  ]));
  clip(g, cuff, () => {
    texture(g, 'cast', box, 0.5, 1.2);
    blotches(g, { x: CX - 62, y: 30, w: 124, h: 40 }, '#3a6a8a', 0.45, 6, 0.55, 0.1, 57);
    spec(g, CX - 30, 42, 26, 4, 0.5, 0.05);
  });
  for (const x of [CX - 40, CX + 40]) rivet(g, x, x < CX ? 48 : 48, 3.6, '#a8c0d8');
  // the ring the chain hangs from
  g.save();
  g.lineWidth = 4;
  g.strokeStyle = lin(g, GHOST_CHAIN.x - 8, GHOST_CHAIN.y - 8, GHOST_CHAIN.x + 8, GHOST_CHAIN.y + 8, [
    [0, '#d8e8f8'],
    [1, '#3a4a5a'],
  ]);
  g.beginPath();
  g.arc(GHOST_CHAIN.x, GHOST_CHAIN.y, 7, 0, Math.PI * 2);
  g.stroke();
  g.restore();
  if (!o.live) paintChain(g, metal, '#1a2638');
  bareOutline(f, mix(inkOf(skin), '#3a5aa8', 0.4));
  if (!o.live) {
    // still art: the cold mist pooling under the toes
    softFill(ctx, ellipsePath(CX, 262, 100, 16), rgba('#cfe9ff', 0.18), 8);
  }
}

/** Faces of feet past, drifting inside the ghost: x, y, size. */
const GHOST_FACES: [number, number, number][] = [
  [CX - 34, 108, 0.9],
  [CX + 40, 150, 0.75],
  [CX + 8, 196, 0.6],
];

registerStyle('phantomking', {
  rig: { from: 140, to: 162 },
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 26 },
  parts: {
    chain: {
      box: { x: GHOST_CHAIN.x - 40, y: GHOST_CHAIN.y - 6, w: 54, h: CHAIN_LINKS * 15 + 22 },
      frames: 1,
      pivot: [GHOST_CHAIN.x, GHOST_CHAIN.y],
      draw: (g) => paintChain(g, '#7a90a8', '#1a2638'),
    },
  },
  draw(ctx, art, p, o) {
    drawGhost(ctx, art, p, o);
  },
});
