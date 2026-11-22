// Style-kit pilot: bare-skinned feet.
// - Barefoot Bob: the plain foot. Skin under the one light; in play his toes wiggle and curl before he drops.
// - Fruit Fly Fiona: an overripe foot (sugar spots, bruises, mould). In play real flies circle her and a green
//   stink fog drifts off her toes (src/content/style/pilot-live.ts).
// - Magma Toes: a basalt crust over molten rock. Its cracks glow on their own layer, which pulses in play while
//   embers rise and drips fall from its toes.

import type { FootArt } from '../../data/feet';
import { CX } from '../../art/feetCommon';
import { type BareFoot, bareOutline, paintBare } from '../../art/style/bare';
import { onToe } from '../../art/style/anatomy';
import { LIGHT, type Pose, ao, glint, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { registerStyle } from '../../art/style/registry';
import { contact } from '../../art/style/details';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';

const BARE_RIG = { from: 176, to: 198 };

registerStyle('bob', {
  rig: BARE_RIG,
  draw(ctx, art, p) {
    bareOutline(paintBare(ctx, { skin: art.skin, nails: art.nails }, p));
  },
});

// ——— Fruit Fly Fiona ———

/** A fruit fly: a dark metallic body, red compound eyes and veined wings at a flap phase (0…1). Drawn at the
 * origin facing up; callers translate and rotate. */
export function drawFly(g: Ctx, s: number, flap: number): void {
  g.save();
  g.scale(s, s);
  // wings: translucent, veined, a little iridescent; they sweep with the flap
  for (const side of [-1, 1]) {
    g.save();
    g.scale(side, 1);
    g.rotate(-0.25 - flap * 0.9);
    const wg = g.createLinearGradient(0, -2, 14, -10);
    wg.addColorStop(0, 'rgba(235,245,255,.75)');
    wg.addColorStop(0.6, 'rgba(200,230,255,.45)');
    wg.addColorStop(1, 'rgba(255,220,250,.3)');
    g.fillStyle = wg;
    g.beginPath();
    g.ellipse(8, -3, 9, 4.2, -0.35, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(40,40,60,.45)';
    g.lineWidth = 0.6;
    g.stroke();
    g.beginPath();
    g.moveTo(1, -1);
    g.lineTo(15, -7);
    g.moveTo(4, -1);
    g.lineTo(13, -2);
    g.stroke();
    g.restore();
  }
  // abdomen, thorax and head
  const bg = g.createRadialGradient(-1.5, -1, 0.5, 0, 1, 6);
  bg.addColorStop(0, '#8a7a3a');
  bg.addColorStop(0.5, '#3a3018');
  bg.addColorStop(1, '#120e06');
  g.fillStyle = bg;
  g.beginPath();
  g.ellipse(0, 3, 3.6, 5.2, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(20,14,6,.7)';
  g.lineWidth = 0.7;
  for (const y of [2.5, 4.5, 6.3]) {
    g.beginPath();
    g.moveTo(-3, y);
    g.quadraticCurveTo(0, y + 1, 3, y);
    g.stroke();
  }
  g.fillStyle = '#4a3c1c';
  g.beginPath();
  g.ellipse(0, -1.8, 3.2, 2.6, 0, 0, Math.PI * 2);
  g.fill();
  for (const sx of [-1, 1]) {
    const eg = g.createRadialGradient(sx * 2 - 0.5, -4.6, 0.2, sx * 2, -4.2, 2.2);
    eg.addColorStop(0, '#ff6a50');
    eg.addColorStop(0.6, '#c81e1e');
    eg.addColorStop(1, '#5a0808');
    g.fillStyle = eg;
    g.beginPath();
    g.arc(sx * 2, -4.2, 2.1, 0, Math.PI * 2);
    g.fill();
  }
  spec(g, -1.2, -1, 1.8, 1, 0.6, -0.6);
  g.restore();
}

/** Where the still art puts Fiona's flies (design space): x, y, angle, scale. Play flies them for real. */
export const FIONA_FLIES: [number, number, number, number][] = [
  [-6, 70, -0.5, 1.5],
  [228, 46, 0.6, 1.4],
  [232, 178, -0.3, 1.5],
  [10, 262, 0.9, 1.35],
];

function fionaSkin(g: Ctx, f: BareFoot, art: FootArt): void {
  const r = rng(hashStr('fruitfly'));
  const bruise = art.primary ?? '#6b4a1e';
  const mould = art.secondary ?? '#7a9a3a';
  const b = f.box;
  // bruises: soft subsurface blotches with darker hearts
  for (const [x, y, rx, ry] of [[70, 92, 22, 16], [150, 150, 26, 18], [52, 176, 18, 14], [124, 40, 15, 11], [178, 228, 14, 12]] as const) {
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(x, y, rx, ry, r() * 3, 0, Math.PI * 2);
    }, rgba(mix(bruise, '#5a2a4a', 0.25), 0.42), 5, 'multiply');
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(x + 2, y + 1, rx * 0.45, ry * 0.45, 0, 0, Math.PI * 2);
    }, rgba(shade(bruise, -0.3), 0.35), 3, 'multiply');
  }
  // sugar spots, like an overripe banana's
  for (let i = 0; i < 150; i++) {
    const x = b.x + 14 + r() * (b.w - 28);
    const y = 4 + r() * 250;
    const s = 0.7 + r() * r() * 3.2;
    g.fillStyle = rgba(shade(bruise, -0.2), 0.35 + r() * 0.4);
    g.beginPath();
    g.ellipse(x, y, s, s * (0.7 + r() * 0.4), r() * 3, 0, Math.PI * 2);
    g.fill();
  }
  // mould colonies: a pale halo, fuzzy dots and a few hairs standing up
  for (const [mx, my] of [[58, 132], [158, 72], [142, 214]] as const) {
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(mx, my, 17, 12, 0.3, 0, Math.PI * 2);
    }, rgba(mix(mould, '#eef6d8', 0.4), 0.45), 4);
    for (let k = 0; k < 26; k++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 13;
      const x = mx + Math.cos(a) * d;
      const y = my + Math.sin(a) * d * 0.75;
      g.fillStyle = rgba(k % 3 ? '#eef6d8' : mix(mould, '#ffffff', 0.2), 0.55 + r() * 0.35);
      g.beginPath();
      g.arc(x, y, 0.9 + r() * 1.8, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = rgba('#f4f8e8', 0.6);
    g.lineWidth = 0.7;
    for (let k = 0; k < 9; k++) {
      const x = mx + (r() - 0.5) * 22;
      const y = my + (r() - 0.5) * 14;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.6) * 4, y - 3 - r() * 4);
      g.stroke();
    }
  }
  // sticky, overripe gloss
  spec(g, CX - 40, 120, 18, 6, 0.4, -1.1);
  spec(g, CX + 20, 60, 12, 4, 0.35, -1.1);
  texture(g, 'speckle', b, 0.12, 1, 'soft-light');
}

registerStyle('fruitfly', {
  rig: BARE_RIG,
  draw(ctx, art, p, o) {
    const f = paintBare(ctx, { skin: art.skin, nails: art.nails, shadowTint: '#6a3a10', pores: 0.28 }, p);
    fionaSkin(f.sil.g, f, art);
    bareOutline(f);
    if (!o.live) {
      // still art: a faint green haze off the toes and a few of her flies (play flies them for real)
      softFill(ctx, (c) => {
        c.beginPath();
        c.ellipse(CX, 262, 92, 18, 0, 0, Math.PI * 2);
      }, rgba('#9ab83a', 0.08), 8);
      for (const [x, y, a, s] of FIONA_FLIES) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        drawFly(ctx, s, 0.3);
        ctx.restore();
      }
    }
  },
});

// ——— Magma Toes ———

type Pt = [number, number];

/** The crust's crack network for Magma Toes: trunks from the ankle to each toe, branches, and rings on the toes. */
function magmaCracks(f: BareFoot): Pt[][] {
  const r = rng(hashStr('lava-cracks'));
  const out: Pt[][] = [];
  const walk = (x: number, y: number, tx: number, ty: number, n: number, jit: number): Pt[] => {
    const pts: Pt[] = [[x, y]];
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      pts.push([x + (tx - x) * t + (i < n ? (r() - 0.5) * jit : 0), y + (ty - y) * t + (i < n ? (r() - 0.5) * jit * 0.5 : 0)]);
    }
    return pts;
  };
  const roots = f.toes.map((t) => onToe(t, -Math.PI / 2));
  // trunks from the ankle down to the toes' roots, and on into each toe
  const trunks: Pt[][] = [];
  [[CX - 26, -4], [CX + 6, -4], [CX + 34, -2]].forEach(([x, y], i) => {
    const targets = i === 0 ? [0, 1] : i === 1 ? [2] : [3, 4];
    for (const ti of targets) {
      const [tx, ty] = roots[ti];
      const trunk = walk(x, y, tx, ty + 10, 9, 16);
      trunks.push(trunk);
      out.push(trunk);
      const t = f.toes[ti];
      out.push(walk(tx, ty + 10, t.cx + (r() - 0.5) * t.rx * 0.6, t.cy + t.ry * 0.85, 3, 6));
    }
  });
  // branches off the sides
  for (let i = 0; i < 9; i++) {
    const tr = trunks[Math.floor(r() * trunks.length)];
    const [bx, by] = tr[1 + Math.floor(r() * (tr.length - 3))];
    const dir = bx < CX ? -1 : 1;
    out.push(walk(bx, by, bx + dir * (18 + r() * 40), by + 8 + r() * 30, 4, 8));
  }
  return out;
}

function strokePts(c: Ctx, pts: Pt[]): void {
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
}

/** The molten light in the cracks: a wide soft orange glow round a hot yellow-white core. `k` scales it. */
function magmaGlow(g: Ctx, cracks: Pt[][], k: number): void {
  const all = (c: Ctx) => {
    for (const pts of cracks) strokePts(c, pts);
  };
  softStroke(g, all, rgba('#ff4a10', 0.55 * k), 11, 6);
  softStroke(g, all, rgba('#ff8a1a', 0.8 * k), 5, 1.5);
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  all(g);
  g.strokeStyle = rgba('#ffe27a', 0.95 * k);
  g.lineWidth = 2;
  g.stroke();
  g.restore();
}

function paintMagma(ctx: Ctx, art: FootArt, p: Pose, emissive: boolean): BareFoot | null {
  const rock = art.skin;
  const f = paintBare(ctx, { skin: rock, nails: null, shadowTint: '#2a0a18', pores: 0, detail: 0, toe: 1.04 }, p);
  const g = f.sil.g;
  const cracks = magmaCracks(f);
  const r = rng(hashStr('lava-rock'));
  if (emissive) {
    // only the glowing parts, on their own (play lays them over the body and pulses them)
    g.clearRect(-100, -100, 500, 500);
    magmaGlow(g, cracks, 1);
    const heat = g.createLinearGradient(0, 150, 0, 270);
    heat.addColorStop(0, rgba('#ff5a14', 0));
    heat.addColorStop(1, rgba('#ff5a14', 0.5));
    g.fillStyle = heat;
    g.fillRect(-50, 150, 320, 130);
    f.sil.finish('rgba(0,0,0,0)', { w: 0.01, inner: 0 });
    return null;
  }
  // basalt: speckled, pitted stone
  texture(g, 'stone', f.box, 0.5, 1.3, 'overlay');
  texture(g, 'cast', f.box, 0.3, 1, 'soft-light');
  for (let i = 0; i < 40; i++) {
    const x = f.box.x + r() * f.box.w;
    const y = r() * 260;
    ao(g, x, y, 3 + r() * 6, 2 + r() * 4, 0.25, r() * 3, '#000000');
  }
  // the plates between the cracks catch the light along their lips and darken along the cracks
  const all = (c: Ctx) => {
    for (const pts of cracks) strokePts(c, pts);
  };
  softStroke(g, all, rgba('#120604', 0.75), 9, 2.5);
  g.save();
  g.translate(LIGHT.dir[0] * -4, LIGHT.dir[1] * -4);
  softStroke(g, all, rgba('#c8a090', 0.22), 3, 1.2);
  g.restore();
  // the dim heat in the cracks (play adds the pulsing glow layer on top of this)
  magmaGlow(g, cracks, 0.7);
  // hot underneath: the toes glow up from the sole
  for (const t of f.toes) {
    const [x, y] = onToe(t, Math.PI / 2);
    const hg = g.createRadialGradient(x, y + 4, 1, x, y, t.ry * 0.9);
    hg.addColorStop(0, rgba('#ff7a1a', 0.75));
    hg.addColorStop(1, rgba('#ff3a0a', 0));
    g.fillStyle = hg;
    g.fillRect(x - t.rx * 1.2, y - t.ry, t.rx * 2.4, t.ry * 1.6);
  }
  // obsidian nails: glassy black chips
  for (const t of f.toes) {
    const [x, y] = onToe(t, Math.PI / 2);
    const ny = y - t.ry * 0.42;
    contact(g, (c) => {
      c.beginPath();
      c.ellipse(x, ny, t.rx * 0.45, t.ry * 0.28, t.rot, 0, Math.PI * 2);
      c.fill();
    }, 0.5);
    const ng = g.createLinearGradient(x - t.rx * 0.4, ny - t.ry * 0.3, x + t.rx * 0.4, ny + t.ry * 0.3);
    ng.addColorStop(0, '#5a5068');
    ng.addColorStop(0.4, '#14101a');
    ng.addColorStop(1, '#2a1a20');
    g.fillStyle = ng;
    g.beginPath();
    g.ellipse(x, ny, t.rx * 0.45, t.ry * 0.28, t.rot, 0, Math.PI * 2);
    g.fill();
    glint(g, x - t.rx * 0.18, ny - t.ry * 0.1, t.rx * 0.16, 0.9);
  }
  bareOutline(f, '#1a0806');
  return f;
}

/** A drop of lava (also the live drips' look). */
export function drip(g: Ctx, x: number, y: number, s: number): void {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  const dg = g.createRadialGradient(0, 8, 1, 0, 6, 9);
  dg.addColorStop(0, '#fff2a0');
  dg.addColorStop(0.4, '#ffa21a');
  dg.addColorStop(1, '#d8300a');
  g.fillStyle = dg;
  g.beginPath();
  g.moveTo(-3, 0);
  g.quadraticCurveTo(-6, 9, 0, 14);
  g.quadraticCurveTo(6, 9, 3, 0);
  g.closePath();
  g.fill();
  spec(g, -1.5, 7, 2, 3, 0.8, 0);
  g.restore();
}

registerStyle('lava', {
  rig: BARE_RIG,
  draw(ctx, art, p, o) {
    const f = paintMagma(ctx, art, p, !!o.emissive);
    if (!f || o.live) return;
    // still art: a molten drip hanging from the big toe
    const t = f.toes[4];
    const [x, y] = onToe(t, Math.PI / 2 - 0.15);
    drip(ctx, x, y - 2, 1);
  },
});
