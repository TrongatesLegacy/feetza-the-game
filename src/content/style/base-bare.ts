// Base roster, bare-skinned feet (style kit). Each starts from the kit's bare foot (paintBare) and paints its own story
// inside the one silhouette; extra parts (a flip-flop sole, icicles, tufts, wisps) join the silhouette so the one
// outline goes round them. How they move in play: src/content/styleLive/base.ts.

import { CX } from '../../art/feetCommon';
import { type BareFoot, type BareLook, bareOutline, paintBare } from '../../art/style/bare';
import { type StyleToe, cleft, onToe, restToes } from '../../art/style/anatomy';
import { LIGHT, type PathFn, ao, crease, glint, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { registerStyle } from '../../art/style/registry';
import { blotches, contact, tuftPath } from '../../art/style/details';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';
import { BARE_RIG, LX, LY, bareEmissive, bead, clefts, clipTo, extendSil, label, layerOn, nailTop, strap, wetGlint } from './base-kit';

/** Rest toe tips (design space) for a bare look, for live effects placed on the toes. */
export function toeTips(o: Parameters<typeof restToes>[0] = {}): [number, number][] {
  return restToes(o).map((t) => onToe(t, Math.PI / 2));
}

/** Nail tops at rest, for live glints. */
export function nailTops(o: Parameters<typeof restToes>[0] = {}): [number, number][] {
  return restToes(o).map((t) => nailTop(t));
}

// ════════════════════════════ PEDICURE PATTY ════════════════════════════
// Fresh, wet polish: every nail is a glossy pink mirror with a hot glint; moisturised skin with a soft sheen and a
// fine gold anklet. In play the polish twinkles.

export const PATTY: BareLook = { skin: '#d99a6c', nails: '#ff3d7f', pores: 0.14, ball: 0.97, toe: 0.98 };

function anklet(g: Ctx, y: number, hw: number, gold = '#f2c14e'): void {
  // a fine chain hanging in a shallow curve round the ankle, with a little heart charm
  const pts: [number, number][] = [];
  for (let i = 0; i <= 26; i++) {
    const u = i / 26;
    pts.push([CX - hw + u * hw * 2, y + Math.sin(u * Math.PI) * 9]);
  }
  contact(g, (c) => {
    c.lineWidth = 2.4;
    c.beginPath();
    pts.forEach(([x, yy], i) => (i ? c.lineTo(x, yy) : c.moveTo(x, yy)));
    c.stroke();
  }, 0.35, 1.6, 1.8);
  for (let i = 0; i < pts.length; i++) {
    const [x, yy] = pts[i];
    const lg = g.createLinearGradient(x - 2, yy - 2, x + 2, yy + 2);
    lg.addColorStop(0, shade(gold, 0.6));
    lg.addColorStop(0.5, gold);
    lg.addColorStop(1, shade(gold, -0.45));
    g.strokeStyle = lg;
    g.lineWidth = 1.3;
    g.beginPath();
    g.ellipse(x, yy, 2.6, 1.6, i % 2 ? 0.6 : -0.6, 0, Math.PI * 2);
    g.stroke();
  }
  const [hx, hy] = [CX + 4, y + 9 + 8];
  g.save();
  g.translate(hx, hy);
  const heart = (c: Ctx) => {
    c.beginPath();
    c.moveTo(0, 4.5);
    c.bezierCurveTo(-6, 0, -5, -5, 0, -2.4);
    c.bezierCurveTo(5, -5, 6, 0, 0, 4.5);
    c.closePath();
  };
  contact(g, (c) => {
    heart(c);
    c.fill();
  }, 0.4, 1.6, 1.6);
  const hg = g.createLinearGradient(-5, -5, 5, 5);
  hg.addColorStop(0, shade(gold, 0.6));
  hg.addColorStop(0.5, gold);
  hg.addColorStop(1, shade(gold, -0.5));
  g.fillStyle = hg;
  heart(g);
  g.fill();
  glint(g, -2, -1.5, 2.6, 0.95);
  g.restore();
}

function polishGloss(g: Ctx, toes: StyleToe[], col: string): void {
  for (const t of toes) {
    const [x, y] = nailTop(t);
    const s = t.rx * 0.42;
    // a wet, thick coat: a deeper rim where it pools at the free edge, and a hot window reflection
    spec(g, x - s * 0.25, y - s * 0.15, s * 0.9, s * 0.32, 0.85, -0.45);
    glint(g, x - s * 0.45, y - s * 0.35, s * 0.42, 0.95);
    g.fillStyle = rgba(shade(col, -0.45), 0.25);
    g.beginPath();
    g.ellipse(x + s * 0.1, y + t.ry * 0.2, s * 0.95, s * 0.22, t.rot, 0, Math.PI);
    g.fill();
  }
}

registerStyle('patty', {
  rig: BARE_RIG,
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 24 },
  draw(ctx, art, p) {
    const look = { ...PATTY, skin: art.skin, nails: art.nails };
    const f = paintBare(ctx, look, p);
    const g = f.sil.g;
    // moisturised: a broad soft sheen down the instep and on the toes
    spec(g, CX - 30, 96, 46, 18, 0.22, -1.1, '#fff4e8');
    for (const t of f.toes) spec(g, t.cx - t.rx * 0.3, t.cy - t.ry * 0.1, t.rx * 0.5, t.ry * 0.25, 0.18, -1.2);
    polishGloss(g, f.toes, art.nails ?? '#ff3d7f');
    anklet(g, 16, 50);
    bareOutline(f);
  },
});

// ════════════════════════════ BABY TOES ════════════════════════════
// Chubby, soft and rosy: big round toes, rolls at the ankle, dimpled knuckles, no tendons. In play the toes never
// stop wriggling.

export const BABY: BareLook = { skin: '#ffd2c2', w: 10, ankle: 58, toe: 1.14, toeLen: 0.8, ball: 0.98, detail: 0, pores: 0.08, shadowTint: '#c8486a' };

registerStyle('baby', {
  contactY: 262,
  rig: BARE_RIG,
  leg: { kind: 'skin', hw: 58, join: 'blend', fade: 26 },
  draw(ctx, art, p) {
    const f = paintBare(ctx, { ...BABY, skin: art.skin }, p);
    const g = f.sil.g;
    const deep = mix(shade(art.skin, -0.4), '#c8486a', 0.45);
    // ankle rolls: two soft creases with a lit bulge between
    for (const [y, w] of [[16, 60], [40, 66]] as const) {
      softStroke(g, (c) => {
        c.moveTo(CX - w, y + 2);
        c.quadraticCurveTo(CX, y + 12, CX + w, y);
      }, rgba(deep, 0.32), 4, 2.5);
      softStroke(g, (c) => {
        c.moveTo(CX - w + 6, y + 7);
        c.quadraticCurveTo(CX, y + 17, CX + w - 6, y + 5);
      }, rgba(LIGHT.key, 0.28), 4, 3);
    }
    // a rosy flush over the ball and the toes, a dimple at each knuckle
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(CX + 4, 190, 96, 30, 0, 0, Math.PI * 2);
    }, rgba('#ff7a8a', 0.16), 12);
    for (const t of f.toes) {
      const [kx, ky] = onToe(t, -Math.PI / 2);
      ao(g, kx + 1, ky + t.ry * 0.45, t.rx * 0.18, t.ry * 0.07, 0.35, 0, deep);
      spec(g, t.cx - t.rx * 0.3, t.cy, t.rx * 0.5, t.ry * 0.35, 0.3, -1, '#fff6f0');
    }
    bareOutline(f);
  },
});

// ════════════════════════════ HAIRY HAROLD ════════════════════════════
// More carpet than foot: dark hair over the instep and in tufts on every knuckle, tufts standing off his sides. In play
// stray hairs drift off him.

export const HAROLD: BareLook = { skin: '#d99a6c', w: 4, toe: 1.05, pores: 0.25, shadowTint: '#8a2a14' };

/** Where stray hairs poke out of Harold's sides: x, y, outward angle. */
const HAROLD_TUFTS: [number, number, number][] = [
  [CX - 55, 16, Math.PI * 0.9],
  [CX - 62, 56, Math.PI * 0.9],
  [CX - 82, 100, Math.PI * 0.88],
  [CX - 94, 146, Math.PI * 0.9],
  [CX + 56, 20, Math.PI * 0.1],
  [CX + 66, 62, Math.PI * 0.1],
  [CX + 90, 108, Math.PI * 0.12],
  [CX + 104, 150, Math.PI * 0.1],
];

function hairStrands(g: Ctx, r: () => number, x0: number, y0: number, w: number, h: number, n: number, len: number, hair: string, spread = 0.5): void {
  g.save();
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * w;
    const y = y0 + r() * h;
    // hair lies flat, flowing down and outwards from the middle of the foot
    const a = Math.PI / 2 - ((x - CX) / 110) * spread + (r() - 0.5) * 0.7;
    const l = len * (0.5 + r() * 0.8);
    const curl = (r() - 0.5) * 0.9;
    const col = r() < 0.7 ? hair : shade(hair, 0.35);
    g.strokeStyle = rgba(col, 0.45 + r() * 0.45);
    g.lineWidth = 0.7 + r() * 0.9;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + curl) * l * 0.6, y + Math.sin(a + curl) * l * 0.6, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  g.restore();
}

registerStyle('harold', {
  contactY: 262,
  halfWidth: 108,
  rig: BARE_RIG,
  leg: { kind: 'fur', hw: 52, join: 'blend', fade: 26 },
  draw(ctx, art, p) {
    const f = paintBare(ctx, { ...HAROLD, skin: art.skin }, p);
    const g = f.sil.g;
    const hair = mix(shade(art.skin, -0.66), '#2a1408', 0.35);
    const r = rng(hashStr('harold-hair'));
    // a carpet over the instep, thinning to the edges and towards the ball
    hairStrands(g, r, CX - 70, 0, 150, 70, 480, 13, hair);
    hairStrands(g, r, CX - 85, 60, 180, 70, 320, 12, hair);
    hairStrands(g, r, CX - 90, 125, 190, 55, 140, 10, hair, 0.8);
    // knuckle tufts on every toe
    for (const t of f.toes) {
      const [kx, ky] = onToe(t, -Math.PI / 2);
      hairStrands(g, r, kx - t.rx * 0.5, ky + t.ry * 0.3, t.rx, t.ry * 0.4, Math.round(t.rx * 2), 9, hair, 0.2);
    }
    // the hair's own soft sheen on the lit side
    spec(g, CX - 40, 60, 50, 22, 0.12, -0.8, LIGHT.key);
    bareOutline(f);
    // stray hairs poking out past his outline, curling away from the foot
    const r2 = rng(hashStr('harold-stray'));
    ctx.save();
    ctx.lineCap = 'round';
    for (const [x, y, a] of HAROLD_TUFTS) {
      for (let i = 0; i < 7; i++) {
        const sx = x + (r2() - 0.5) * 10 + Math.cos(a) * 2;
        const sy = y + (r2() - 0.5) * 22;
        const aa = a + (r2() - 0.5) * 0.9;
        const l = 6 + r2() * 9;
        const cu = (r2() - 0.5) * 1.6;
        ctx.strokeStyle = rgba(hair, 0.55 + r2() * 0.35);
        ctx.lineWidth = 0.8 + r2() * 0.6;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx + Math.cos(aa) * l * 0.6, sy + Math.sin(aa) * l * 0.6, sx + Math.cos(aa + cu) * l, sy + Math.sin(aa + cu) * l);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
});

// ════════════════════════════ STINKY STAN ════════════════════════════
// Yellowed, grimy and damp: thick fungal nails, grime in the creases, athlete's foot between the toes, beads of sweat.
// In play stink fumes rise off him and a couple of flies won't leave.

export const STAN: BareLook = { skin: '#d6c38f', nails: '#7a8a3a', pores: 0.32, shadowTint: '#5a4a10' };

registerStyle('stan', {
  rig: BARE_RIG,
  leg: { kind: 'wool', hw: 70, join: 'hem' },
  draw(ctx, art, p, o) {
    const f = paintBare(ctx, { ...STAN, skin: art.skin, nails: art.nails }, p);
    const g = f.sil.g;
    const box = f.box;
    const grime = mix(shade(art.skin, -0.55), '#3a3010', 0.5);
    blotches(g, box, grime, 0.32, 38, 0.5, 0.2, 31, 'multiply');
    blotches(g, box, '#7a8a2a', 0.16, 22, 0.58, 0.12, 32, 'multiply');
    // grime in the creases between the toes and round the nails
    for (const [kx, ky] of clefts(f.toes)) {
      softFill(g, (c) => {
        c.beginPath();
        c.ellipse(kx, ky - 6, 7, 14, 0, 0, Math.PI * 2);
      }, rgba(grime, 0.55), 3, 'multiply');
      // athlete's foot: pale, flaky skin in the cleft
      const r = rng(hashStr('stan' + kx));
      for (let i = 0; i < 9; i++) {
        g.fillStyle = rgba('#f4f0d8', 0.55 + r() * 0.3);
        g.beginPath();
        g.ellipse(kx + (r() - 0.5) * 12, ky - 4 - r() * 16, 1 + r() * 2.2, 0.8 + r() * 1.4, r() * 3, 0, Math.PI * 2);
        g.fill();
      }
    }
    // thick, ridged fungal nails
    for (const t of f.toes) {
      const [x, y] = nailTop(t);
      g.save();
      g.translate(x, y);
      g.rotate(t.rot);
      g.strokeStyle = rgba('#3a3a10', 0.4);
      g.lineWidth = 0.9;
      for (let k = -2; k <= 2; k++) {
        g.beginPath();
        g.moveTo(k * t.rx * 0.12, -t.ry * 0.16);
        g.lineTo(k * t.rx * 0.14, t.ry * 0.14);
        g.stroke();
      }
      g.fillStyle = rgba('#e8e0a0', 0.4);
      g.fillRect(-t.rx * 0.5, t.ry * 0.12, t.rx, t.ry * 0.06);
      g.restore();
    }
    // sweat: beads on the instep and a damp sheen
    const r = rng(hashStr('stan-sweat'));
    for (let i = 0; i < 14; i++) bead(g, CX - 70 + r() * 150, 20 + r() * 150, 1.8 + r() * 2.6, '#f2f0d0', 0.6);
    spec(g, CX - 34, 110, 40, 10, 0.3, -1.2, '#fffbe0');
    bareOutline(f);
    if (!o.live) {
      // still art: stink lines curling off him
      for (const [x, y, s] of [[CX - 92, 40, -1], [CX + 100, 30, 1], [CX + 8, -2, 1]] as const) {
        softStroke(ctx, (c) => {
          c.moveTo(x, y + 30);
          c.bezierCurveTo(x + s * 14, y + 14, x - s * 14, y + 6, x, y - 12);
          c.bezierCurveTo(x + s * 12, y - 22, x - s * 6, y - 30, x + s * 4, y - 40);
        }, rgba('#9ab83a', 0.7), 4, 1.5);
      }
    }
  },
});

// ════════════════════════════ PHANTOM FOOT ════════════════════════════
// Ectoplasm: a cold, luminous foot with a glowing core and wisps streaming off its sides. In play its core pulses and
// it trails mist.

export const GHOST: BareLook = { skin: '#cfe9ff', nails: '#8fc7ff', pores: 0.06, detail: 0.45, shadowTint: '#3a4aa8' };

const GHOST_WISPS: [number, number, number, number, number, number][] = [
  [CX - 56, 20, Math.PI * 0.92, 40, 20, -0.9],
  [CX - 84, 92, Math.PI * 0.95, 46, 22, -0.8],
  [CX - 98, 168, Math.PI * 0.9, 34, 18, -0.7],
  [CX + 58, 26, Math.PI * 0.08, 40, 20, 0.9],
  [CX + 90, 100, Math.PI * 0.05, 46, 22, 0.8],
  [CX + 104, 176, Math.PI * 0.1, 32, 18, 0.7],
];

function ghostGlow(g: Ctx, k: number): void {
  const rg = g.createRadialGradient(CX - 6, 96, 4, CX, 110, 120);
  rg.addColorStop(0, rgba('#ffffff', 0.85 * k));
  rg.addColorStop(0.35, rgba('#bfe4ff', 0.5 * k));
  rg.addColorStop(1, rgba('#6aa8ff', 0));
  g.fillStyle = rg;
  g.fillRect(CX - 140, -20, 280, 260);
}

registerStyle('ghost', {
  rig: BARE_RIG,
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 40 },
  draw(ctx, art, p, o) {
    const look = { ...GHOST, skin: art.skin, nails: art.nails };
    if (o.emissive) {
      bareEmissive(ctx, look, p, (g) => ghostGlow(g, 0.9));
      return;
    }
    const f = paintBare(ctx, look, p);
    const g = f.sil.g;
    // cold inner light, a faint skeleton of veins, and the body thinning to mist down its sides
    layerOn(g, 'lighter', (l2) => ghostGlow(l2, 0.35));
    softStroke(g, (c) => {
      c.moveTo(CX - 20, 10);
      c.bezierCurveTo(CX - 28, 70, CX - 10, 110, CX - 34, 170);
      c.moveTo(CX + 24, 14);
      c.bezierCurveTo(CX + 30, 80, CX + 14, 130, CX + 40, 176);
    }, rgba('#7ab0ff', 0.22), 3, 2);
    const mist = g.createLinearGradient(f.box.x, 0, f.box.x + f.box.w, 0);
    mist.addColorStop(0, rgba('#e8f6ff', 0.45));
    mist.addColorStop(0.18, rgba('#e8f6ff', 0));
    mist.addColorStop(0.82, rgba('#8ab0ff', 0));
    mist.addColorStop(1, rgba('#8ab0ff', 0.35));
    g.fillStyle = mist;
    g.fillRect(f.box.x - 40, -10, f.box.w + 80, 260);
    f.sil.edge(rgba('#ffffff', 0.5), 6, -LX * 3, -LY * 3);
    if (!o.live) {
      // still art: a cold halo and ectoplasm streaming off its sides, behind it (play streams real mist)
      softFill(ctx, (c) => {
        c.beginPath();
        c.ellipse(CX, 120, 140, 150, 0, 0, Math.PI * 2);
      }, rgba('#9fd0ff', 0.14), 20);
      GHOST_WISPS.forEach(([x, y, a, l, w, b]) => {
        const wg = ctx.createLinearGradient(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
        wg.addColorStop(0, rgba('#e8f6ff', 0.75));
        wg.addColorStop(1, rgba('#8ab0ff', 0));
        softFill(ctx, tuftPath(x, y, a, l * 2.2, w * 0.7, b * 1.3), wg, 5);
      });
    }
    f.sil.finish(mix(inkOf(art.skin), '#2a3a8a', 0.5), { openTop: f.top + 1.5, inner: 0.35 });
  },
});

// ════════════════════════════ ZOMBIE TOES ════════════════════════════
// Grey-green and coming apart: bruises, a stitched gash across the instep, a peeled patch of raw flesh, a toe worn to the
// bone. In play flies circle it and it drips.

export const ZOMBIE: BareLook = { skin: '#9fb98a', nails: '#3b3b2f', pores: 0.3, shadowTint: '#3a2050', detail: 0.8 };

registerStyle('zombie', {
  rig: BARE_RIG,
  leg: { kind: 'denim', hw: 70, join: 'hem' },
  draw(ctx, art, p) {
    const f = paintBare(ctx, { ...ZOMBIE, skin: art.skin, nails: art.nails }, p);
    const g = f.sil.g;
    const box = f.box;
    // mottled decay: violet bruising and yellowed patches
    blotches(g, box, '#5a3a6a', 0.38, 34, 0.55, 0.18, 41, 'multiply');
    blotches(g, box, '#c8c060', 0.2, 26, 0.6, 0.15, 42, 'multiply');
    // a peeled patch of raw flesh with a ragged rim of loose skin
    const patch = (c: Ctx) => {
      c.beginPath();
      const r = rng(hashStr('zombie-patch'));
      for (let i = 0; i <= 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const rr = 1 + (r() - 0.5) * 0.35;
        const x = CX - 44 + Math.cos(a) * 20 * rr;
        const y = 132 + Math.sin(a) * 14 * rr;
        if (i) c.lineTo(x, y);
        else c.moveTo(x, y);
      }
      c.closePath();
    };
    contact(g, (c) => {
      patch(c);
      c.fill();
    }, 0.4, -1.5, 2);
    clipTo(g, patch, () => {
      const pg = g.createRadialGradient(CX - 48, 128, 2, CX - 44, 132, 24);
      pg.addColorStop(0, '#d8506a');
      pg.addColorStop(0.6, '#8a1a2a');
      pg.addColorStop(1, '#3a0a14');
      g.fillStyle = pg;
      g.fillRect(CX - 70, 110, 52, 44);
      texture(g, 'pores', box, 0.5, 1.3);
      spec(g, CX - 50, 126, 8, 3, 0.7, -0.6);
    });
    g.strokeStyle = rgba('#e8f0d0', 0.7);
    g.lineWidth = 1.4;
    patch(g);
    g.stroke();
    // the stitched gash across the instep
    const gash = (c: Ctx) => {
      c.moveTo(CX - 30, 64);
      c.bezierCurveTo(CX - 4, 54, CX + 26, 76, CX + 58, 60);
    };
    crease(g, gash, 3.4, '#2a0a14', 0.85, 0.3);
    softStroke(g, gash, rgba('#7a1a2a', 0.5), 7, 2);
    for (let i = 0; i < 7; i++) {
      const u = i / 6;
      const x = CX - 26 + u * 80;
      const y = 62 + Math.sin(u * Math.PI * 1.1) * -4 + (u > 0.5 ? 4 : 0);
      g.strokeStyle = '#1a1410';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x - 5, y - 7);
      g.lineTo(x + 5, y + 7);
      g.moveTo(x + 5, y - 7);
      g.lineTo(x - 5, y + 7);
      g.stroke();
      g.strokeStyle = rgba('#c8b890', 0.5);
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(x - 5, y - 8);
      g.lineTo(x + 4, y + 5);
      g.stroke();
    }
    // the little toe worn to the bone at its tip
    const t0 = f.toes[0];
    const [bx, by] = onToe(t0, Math.PI / 2 - 0.1);
    contact(g, (c) => {
      c.beginPath();
      c.ellipse(bx, by - 8, 8, 9, t0.rot, 0, Math.PI * 2);
      c.fill();
    }, 0.5);
    const bg = g.createRadialGradient(bx - 3, by - 11, 1, bx, by - 8, 10);
    bg.addColorStop(0, '#fffbe8');
    bg.addColorStop(0.7, '#e0d4b0');
    bg.addColorStop(1, '#9a8a60');
    g.fillStyle = bg;
    g.beginPath();
    g.ellipse(bx, by - 8, 7, 8, t0.rot, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = rgba('#7a1a2a', 0.8);
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(bx, by - 8, 8, 9, t0.rot, Math.PI * 1.1, Math.PI * 1.9);
    g.stroke();
    // cracked, blackened nails
    for (const t of f.toes.slice(1)) {
      const [x, y] = nailTop(t);
      g.strokeStyle = rgba('#e0e0c0', 0.55);
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(x - t.rx * 0.2, y - t.ry * 0.12);
      g.lineTo(x + t.rx * 0.05, y + t.ry * 0.02);
      g.lineTo(x - t.rx * 0.08, y + t.ry * 0.14);
      g.stroke();
    }
    // a wet ooze sheen
    spec(g, CX + 30, 110, 26, 7, 0.25, -1.1, '#e8ffd0');
    bareOutline(f, mix(inkOf(art.skin), '#1a0a20', 0.3));
  },
});

// ════════════════════════════ DOUBLE TROUBLE ════════════════════════════
// A foot mid-mitosis: glossy and jelly-soft, pinched down the middle by a cleavage furrow, two nuclei glowing inside,
// vesicles drifting in it. In play the nuclei pulse and bubbles rise off it.

export const MITOSIS: BareLook = { skin: '#ffb8d9', nails: '#8a3cff', w: 8, ankle: 56, toe: 1.1, toeLen: 0.84, detail: 0.2, pores: 0.06, shadowTint: '#8a2a8a' };

/** The two nuclei, one in each half (x, y, radius): not a pair of eyes, so one sits higher and they differ. */
const NUCLEI: [number, number, number][] = [
  [CX - 46, 72, 24],
  [CX + 44, 128, 20],
];

function nuclei(g: Ctx, k: number): void {
  for (const [x, y, rr] of NUCLEI) {
    const rg = g.createRadialGradient(x - 4, y - 4, 2, x, y, rr * 1.5);
    rg.addColorStop(0, rgba('#fff4ff', 0.8 * k));
    rg.addColorStop(0.35, rgba('#d08aff', 0.6 * k));
    rg.addColorStop(1, rgba('#8a3cff', 0));
    g.fillStyle = rg;
    g.beginPath();
    g.arc(x, y, rr * 1.5, 0, Math.PI * 2);
    g.fill();
  }
}

registerStyle('mitosis', {
  contactY: 262,
  rig: BARE_RIG,
  leg: { kind: 'skin', hw: 56, join: 'blend', fade: 26 },
  draw(ctx, art, p, o) {
    const look = { ...MITOSIS, skin: art.skin, nails: art.nails };
    if (o.emissive) {
      bareEmissive(ctx, look, p, (g) => nuclei(g, 1));
      return;
    }
    const f = paintBare(ctx, look, p);
    const g = f.sil.g;
    const deep = mix(shade(art.skin, -0.5), '#6a1a8a', 0.4);
    // the cleavage furrow: a deep soft groove pinching the foot down the middle, lit on its right lip
    const furrow = (c: Ctx) => {
      c.moveTo(CX + 2, -6);
      c.bezierCurveTo(CX - 6, 50, CX + 6, 120, CX + 2, 200);
    };
    softStroke(g, furrow, rgba(deep, 0.5), 10, 5);
    crease(g, furrow, 2.2, deep, 0.6, 0.45);
    // nuclei (dim here; the glow layer brings them up in play) with their membranes
    nuclei(g, 0.45);
    const rn = rng(hashStr('mitosis-nuc'));
    for (const [x, y, rr] of NUCLEI) {
      // a wobbly membrane and threads of chromatin, pulling apart
      g.strokeStyle = rgba('#7a2aa8', 0.35);
      g.lineWidth = 1.4;
      g.beginPath();
      for (let i = 0; i <= 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        const w = rr * (1 + Math.sin(a * 3 + x) * 0.08);
        const px = x + Math.cos(a) * w;
        const py = y + Math.sin(a) * w * 0.8;
        if (i) g.lineTo(px, py);
        else g.moveTo(px, py);
      }
      g.stroke();
      g.strokeStyle = rgba('#6a1a9a', 0.45);
      g.lineWidth = 1.3;
      for (let i = 0; i < 5; i++) {
        const a = rn() * Math.PI * 2;
        const d = rn() * rr * 0.5;
        const sx = x + Math.cos(a) * d;
        const sy = y + Math.sin(a) * d * 0.8;
        g.beginPath();
        g.moveTo(sx, sy);
        g.bezierCurveTo(sx + (rn() - 0.5) * 12, sy + (rn() - 0.5) * 10, sx + (rn() - 0.5) * 12, sy + (rn() - 0.5) * 10, sx + (rn() - 0.5) * 14, sy + (rn() - 0.5) * 12);
        g.stroke();
      }
    }
    // vesicles floating in the jelly
    const r = rng(hashStr('mitosis-ves'));
    for (let i = 0; i < 16; i++) {
      const x = CX - 80 + r() * 160;
      const y = 20 + r() * 170;
      const rr = 2 + r() * 5;
      g.strokeStyle = rgba('#ffffff', 0.45);
      g.lineWidth = 1;
      g.beginPath();
      g.arc(x, y, rr, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = rgba('#ff9ad0', 0.2);
      g.fill();
      spec(g, x - rr * 0.35, y - rr * 0.4, rr * 0.45, rr * 0.3, 0.8, -0.6);
    }
    // glossy jelly: strong wet highlights on each half
    for (const [x, y] of [[CX - 60, 50], [CX + 24, 44]] as const) wetGlint(g, x, y, 16, 0.6);
    for (const t of f.toes) spec(g, t.cx - t.rx * 0.35, t.cy - t.ry * 0.05, t.rx * 0.4, t.ry * 0.25, 0.55, -1.1);
    f.sil.edge(rgba('#ffffff', 0.35), 5, -LX * 2.5, -LY * 2.5);
    bareOutline(f, mix(inkOf(art.skin), '#4a0a6a', 0.35));
  },
});

// ════════════════════════════ TATTOO TONY ════════════════════════════
// Inked ankle to toe in aged flash: a heart with a MOM banner on the instep, nautical stars, swallows, dots on the toes,
// a gold toe ring. In play the ring glints; when he's furious he fumes.

export const TONY: BareLook = { skin: '#efc0a0', pores: 0.22 };

/** Lay an ink drawing into the skin: slightly soft, multiplied, with a faint aged bleed. */
function ink(g: Ctx, draw: (c: Ctx) => void): void {
  layerOn(g, 'multiply', (l) => {
    l.save();
    if ('filter' in l) l.filter = 'blur(0.6px)';
    draw(l);
    l.restore();
  });
}

function star(c: Ctx, x: number, y: number, r: number, rot = 0): void {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i) c.lineTo(px, py);
    else c.moveTo(px, py);
  }
  c.closePath();
}

function swallow(c: Ctx, x: number, y: number, s: number, flip: number): void {
  c.save();
  c.translate(x, y);
  c.scale(s * flip, s);
  c.beginPath();
  c.moveTo(-10, 0);
  c.quadraticCurveTo(-4, -6, 2, -2);
  c.quadraticCurveTo(8, -12, 16, -10);
  c.quadraticCurveTo(10, -4, 6, 0);
  c.quadraticCurveTo(12, 2, 14, 8);
  c.quadraticCurveTo(6, 4, 2, 3);
  c.quadraticCurveTo(-4, 6, -10, 0);
  c.closePath();
  c.restore();
}

function tonyInk(g: Ctx, toes: StyleToe[]): void {
  const navy = '#1c2440';
  const red = '#c8283a';
  const green = '#2a7a4a';
  const yellow = '#e8b830';
  ink(g, (c) => {
    // the heart
    const hx = CX + 6;
    const hy = 92;
    const heart = () => {
      c.beginPath();
      c.moveTo(hx, hy + 30);
      c.bezierCurveTo(hx - 40, hy + 4, hx - 32, hy - 30, hx, hy - 12);
      c.bezierCurveTo(hx + 32, hy - 30, hx + 40, hy + 4, hx, hy + 30);
      c.closePath();
    };
    heart();
    const hg = c.createLinearGradient(hx - 30, hy - 26, hx + 30, hy + 30);
    hg.addColorStop(0, '#f05a64');
    hg.addColorStop(1, '#9a1424');
    c.fillStyle = hg;
    c.fill();
    c.strokeStyle = navy;
    c.lineWidth = 2.6;
    heart();
    c.stroke();
    c.fillStyle = rgba('#ffffff', 0.5);
    c.beginPath();
    c.ellipse(hx - 14, hy - 10, 6, 3, -0.7, 0, Math.PI * 2);
    c.fill();
    // the banner across it
    const bw = 44;
    c.beginPath();
    c.moveTo(hx - bw, hy - 2);
    c.quadraticCurveTo(hx, hy - 10, hx + bw, hy - 2);
    c.lineTo(hx + bw + 8, hy + 10);
    c.lineTo(hx + bw, hy + 14);
    c.quadraticCurveTo(hx, hy + 6, hx - bw, hy + 14);
    c.lineTo(hx - bw - 8, hy + 10);
    c.closePath();
    c.fillStyle = '#f4ead0';
    c.fill();
    c.strokeStyle = navy;
    c.lineWidth = 2;
    c.stroke();
    label(c, 'MOM', hx, hy + 4, 15, navy, 0, "'Lilita One', Impact, sans-serif");
    // nautical stars, red and navy halves
    for (const [x, y, r, rot] of [[CX - 56, 40, 13, 0.2], [CX + 62, 150, 10, -0.3], [CX - 66, 170, 8, 0.1]] as const) {
      star(c, x, y, r, rot);
      c.fillStyle = red;
      c.fill();
      c.save();
      star(c, x, y, r, rot);
      c.clip();
      c.fillStyle = navy;
      c.fillRect(x, y - r, r, r * 2);
      c.restore();
      c.strokeStyle = navy;
      c.lineWidth = 1.8;
      star(c, x, y, r, rot);
      c.stroke();
    }
    // a pair of swallows flying up the ankle
    for (const [x, y, s, fl] of [[CX + 44, 20, 1.1, 1], [CX - 30, 6, 0.8, -1]] as const) {
      swallow(c, x, y, s, fl);
      c.fillStyle = navy;
      c.fill();
      c.fillStyle = red;
      c.beginPath();
      c.arc(x + 1 * fl, y + 1, 2.4 * s, 0, Math.PI * 2);
      c.fill();
    }
    // a vine of leaves round the ball of the foot
    c.strokeStyle = green;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(CX - 94, 140);
    c.bezierCurveTo(CX - 60, 160, CX - 30, 128, CX + 10, 150);
    c.stroke();
    for (let i = 0; i < 5; i++) {
      const x = CX - 84 + i * 20;
      const y = 146 - Math.sin(i * 1.3) * 6;
      c.fillStyle = green;
      c.beginPath();
      c.ellipse(x, y - 5, 5, 2.4, -0.6 + (i % 2) * 1.2, 0, Math.PI * 2);
      c.fill();
    }
    // dots and a little star on the toes; the big one says MOM too
    toes.forEach((t, i) => {
      const [kx, ky] = onToe(t, -Math.PI / 2);
      const y = ky + t.ry * 0.85;
      if (i === 4) {
        label(c, 'MOM', t.cx, y + 2, 10, navy, t.rot);
      } else if (i === 0) {
        star(c, kx, y, 5, 0);
        c.fillStyle = yellow;
        c.fill();
        c.strokeStyle = navy;
        c.lineWidth = 1.2;
        c.stroke();
      } else {
        c.fillStyle = navy;
        for (let k = -1; k <= 1; k++) {
          c.beginPath();
          c.arc(kx + k * 4, y, 1.4, 0, Math.PI * 2);
          c.fill();
        }
      }
    });
  });
}

/** The toe ring on Tony's second toe. */
function toeRing(g: Ctx, t: StyleToe): void {
  const [, ky] = onToe(t, -Math.PI / 2);
  const y = ky + t.ry * 0.55;
  const w = t.rx * 1.02;
  const ring = (c: Ctx) => {
    c.beginPath();
    c.ellipse(t.cx, y, w, 4.5, t.rot, 0.1, Math.PI - 0.1);
  };
  contact(g, (c) => {
    c.lineWidth = 4;
    ring(c);
    c.stroke();
  }, 0.45, 1.8, 2);
  g.save();
  g.lineCap = 'round';
  const rg = g.createLinearGradient(t.cx - w, y, t.cx + w, y);
  rg.addColorStop(0, '#8a5a10');
  rg.addColorStop(0.3, '#ffe9a0');
  rg.addColorStop(0.6, '#e0a830');
  rg.addColorStop(1, '#6a4008');
  g.strokeStyle = rg;
  g.lineWidth = 3.6;
  ring(g);
  g.stroke();
  g.restore();
  glint(g, t.cx - w * 0.4, y + 2.6, 3.4, 1);
}

registerStyle('tony', {
  rig: BARE_RIG,
  leg: { kind: 'denim', hw: 70, join: 'hem' },
  draw(ctx, art, p) {
    const f = paintBare(ctx, { ...TONY, skin: art.skin, nails: art.nails }, p);
    const g = f.sil.g;
    tonyInk(g, f.toes);
    // the skin's own light over the ink
    spec(g, CX - 22, 70, 70, 40, 0.14, -0.5, LIGHT.key);
    toeRing(g, f.toes[3]);
    bareOutline(f);
  },
});

// ════════════════════════════ CLUMSY CLARA ════════════════════════════
// Stubbed every toe on every table: a swollen red big toe, band-aids crossed on her toes and her instep, a bruise
// coming up yellow-purple, a scrunched yellow sock at the ankle. In play the stubbed toe throbs.

export const CLARA: BareLook = { skin: '#f6d3bf', nails: '#5fd3ff', pores: 0.16, top: 10 };

function bandaid(g: Ctx, x: number, y: number, w: number, h: number, rot: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  const shape = (c: Ctx) => {
    c.beginPath();
    c.roundRect(-w / 2, -h / 2, w, h, h / 2);
  };
  contact(g, (c) => {
    shape(c);
    c.fill();
  }, 0.35, 1.4, 1.6);
  const bg = g.createLinearGradient(0, -h / 2, 0, h / 2);
  bg.addColorStop(0, '#f8d8b8');
  bg.addColorStop(1, '#d8a880');
  g.fillStyle = bg;
  shape(g);
  g.fill();
  // the breathing holes, the pad and its lift at the ends
  g.fillStyle = rgba('#a87050', 0.5);
  for (const sx of [-1, 1])
    for (let i = 0; i < 3; i++)
      for (let j = -1; j <= 1; j++) {
        g.beginPath();
        g.arc(sx * (w * 0.32 + i * 3.4), j * h * 0.22, 0.7, 0, Math.PI * 2);
        g.fill();
      }
  g.fillStyle = '#fff4ec';
  g.beginPath();
  g.roundRect(-w * 0.16, -h * 0.34, w * 0.32, h * 0.68, 2);
  g.fill();
  g.fillStyle = rgba('#e85a5a', 0.25);
  g.beginPath();
  g.ellipse(0, 0, w * 0.08, h * 0.15, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = rgba('#8a5a3a', 0.45);
  g.lineWidth = 0.8;
  shape(g);
  g.stroke();
  spec(g, -w * 0.2, -h * 0.2, w * 0.25, h * 0.15, 0.5, 0);
  g.restore();
}

/** Clara's scrunched ankle sock (the 'into' collar her tights go behind). */
const claraCuff: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 62, -8);
  c.lineTo(CX + 62, -8);
  c.bezierCurveTo(CX + 66, 4, CX + 62, 14, CX + 64, 22);
  c.bezierCurveTo(CX + 30, 30, CX - 30, 30, CX - 64, 22);
  c.bezierCurveTo(CX - 62, 14, CX - 66, 4, CX - 62, -8);
  c.closePath();
};

function scrunchCuff(g: Ctx, path: PathFn, col: string, y0: number, y1: number, hw: number): void {
  clipTo(g, path, () => {
    const cg = g.createLinearGradient(CX - hw, 0, CX + hw, 0);
    cg.addColorStop(0, shade(col, -0.15));
    cg.addColorStop(0.25, shade(col, 0.25));
    cg.addColorStop(0.7, col);
    cg.addColorStop(1, mix(shade(col, -0.45), '#3a2a5a', 0.3));
    g.fillStyle = cg;
    g.fillRect(CX - hw - 8, y0 - 4, hw * 2 + 16, y1 - y0 + 8);
    texture(g, 'knit', { x: CX - hw - 8, y: y0 - 4, w: hw * 2 + 16, h: y1 - y0 + 8 }, 0.5, 1.4);
    // the rib running down, and scrunched folds across
    for (let x = CX - hw; x < CX + hw; x += 5) {
      g.fillStyle = rgba('#000000', 0.08);
      g.fillRect(x, y0, 1.6, y1 - y0);
    }
    for (const [y, a] of [[y0 + (y1 - y0) * 0.35, 0.22], [y0 + (y1 - y0) * 0.7, 0.18]] as const) {
      softStroke(g, (c) => {
        c.moveTo(CX - hw, y + 3);
        c.bezierCurveTo(CX - hw * 0.4, y - 4, CX + hw * 0.2, y + 6, CX + hw, y - 1);
      }, rgba('#000000', a), 3, 1.6);
      softStroke(g, (c) => {
        c.moveTo(CX - hw, y + 7);
        c.bezierCurveTo(CX - hw * 0.4, y, CX + hw * 0.2, y + 10, CX + hw, y + 3);
      }, rgba(LIGHT.key, a * 1.2), 3, 1.6);
    }
  });
}

registerStyle('clara', {
  rig: BARE_RIG,
  leg: { kind: 'knit', hw: 54, join: 'into' },
  draw(ctx, art, p) {
    const f = paintBare(ctx, { ...CLARA, skin: art.skin, nails: art.nails }, p);
    const g = f.sil.g;
    extendSil(f.sil, [claraCuff]);
    // a bruise coming up on the outer side: violet heart, yellow-green rim
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(CX - 70, 110, 22, 16, 0.4, 0, Math.PI * 2);
    }, rgba('#b8b040', 0.3), 6, 'multiply');
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(CX - 68, 110, 13, 9, 0.4, 0, Math.PI * 2);
    }, rgba('#6a3a8a', 0.42), 4, 'multiply');
    // the stubbed big toe: swollen red and shiny
    const big = f.toes[4];
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(big.cx, big.cy + 4, big.rx * 0.9, big.ry * 0.8, big.rot, 0, Math.PI * 2);
    }, rgba('#ff3a3a', 0.35), 6, 'multiply');
    spec(g, big.cx - big.rx * 0.3, big.cy - big.ry * 0.1, big.rx * 0.4, big.ry * 0.2, 0.55, -1);
    // band-aids: crossed on the second toe, one on the little toe, one on the instep
    const t3 = f.toes[3];
    bandaid(g, t3.cx, t3.cy - t3.ry * 0.15, 30, 11, 0.7 + t3.rot);
    bandaid(g, t3.cx, t3.cy - t3.ry * 0.15, 30, 11, -0.7 + t3.rot);
    const t0 = f.toes[0];
    bandaid(g, t0.cx, t0.cy - t0.ry * 0.2, 24, 9, 0.2 + t0.rot);
    bandaid(g, CX + 34, 76, 46, 15, -0.5);
    // a little scrape on the outer side
    for (let i = 0; i < 6; i++) {
      g.strokeStyle = rgba('#d04040', 0.5);
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(CX - 86 + i * 2.5, 60 + i * 3);
      g.lineTo(CX - 76 + i * 2.5, 54 + i * 3);
      g.stroke();
    }
    scrunchCuff(g, claraCuff, art.legColor ?? '#ffe14d', -8, 30, 66);
    ao(g, CX, 32, 60, 7, 0.35);
    f.sil.finish(f.ink, { openTop: -6 });
  },
});

// ════════════════════════════ FLIP-FLOPS (Phil, Sue) ════════════════════════════

/** The flip-flop's foam sole, wider than the foot and peeking out round the toes. */
export const flipSole: PathFn = (c) => {
  c.beginPath();
  // it starts tucked under the foot's sides and swells out round the ball and the toes
  c.moveTo(CX - 52, 10);
  c.bezierCurveTo(CX - 66, 60, CX - 96, 96, CX - 106, 150);
  c.bezierCurveTo(CX - 114, 190, CX - 114, 212, CX - 110, 226);
  c.bezierCurveTo(CX - 102, 262, CX - 52, 276, CX + 8, 278);
  c.bezierCurveTo(CX + 72, 280, CX + 118, 268, CX + 121, 228);
  c.bezierCurveTo(CX + 124, 196, CX + 118, 160, CX + 112, 140);
  c.bezierCurveTo(CX + 104, 96, CX + 70, 60, CX + 58, 10);
  c.quadraticCurveTo(CX, 4, CX - 52, 10);
  c.closePath();
};

/** Paint the flip-flop under the foot: the foam (top face and its thick side), the foot's contact shadow on it. */
function paintFlipSole(g: Ctx, f: BareFoot, col: string, skin: string, sand: boolean): void {
  const body = f.sil.parts;
  layerOn(g, 'destination-over', (l) => {
    // the foot's contact line and soft shadow on the foam
    l.save();
    if ('filter' in l) l.filter = 'blur(2.5px)';
    l.translate(-LX * 4, -LY * 4);
    l.fillStyle = rgba('#000000', 0.45);
    for (const pth of body) {
      pth(l);
      l.fill();
    }
    l.restore();
    l.save();
    l.lineJoin = 'round';
    l.strokeStyle = rgba(inkOf(skin), 0.8);
    l.lineWidth = 3;
    for (const pth of body) {
      pth(l);
      l.stroke();
    }
    l.restore();
    // the top face of the foam
    clipTo(l, flipSole, () => {
      const top = l.createLinearGradient(CX - 120, 40, CX + 120, 280);
      top.addColorStop(0, shade(col, 0.25));
      top.addColorStop(0.5, col);
      top.addColorStop(1, shade(col, -0.3));
      l.fillStyle = top;
      l.fillRect(CX - 130, 30, 260, 260);
      texture(l, 'rubber', { x: CX - 130, y: 30, w: 260, h: 260 }, 0.5, 1.2);
      // the side of the foam (its thickness) along the front
      l.save();
      l.translate(0, -9);
      l.globalCompositeOperation = 'destination-out';
      flipSole(l);
      l.fill();
      l.restore();
    });
  });
  layerOn(g, 'destination-over', (l) => {
    clipTo(l, flipSole, () => {
      const side = l.createLinearGradient(0, 230, 0, 280);
      side.addColorStop(0, shade(col, -0.25));
      side.addColorStop(1, mix(shade(col, -0.55), '#1a1030', 0.3));
      l.fillStyle = side;
      l.fillRect(CX - 130, 30, 260, 260);
      texture(l, 'rubber', { x: CX - 130, y: 30, w: 260, h: 260 }, 0.6, 1);
      // tread lines on the side
      l.strokeStyle = rgba('#000000', 0.18);
      l.lineWidth = 1;
      for (let x = CX - 120; x < CX + 124; x += 6) {
        l.beginPath();
        l.moveTo(x, 200);
        l.lineTo(x + 2, 282);
        l.stroke();
      }
      spec(l, CX - 50, 262, 40, 3, 0.35, 0.05);
    });
  });
  if (sand) {
    // sand stuck to the foam and the toes
    const r = rng(hashStr('phil-sand'));
    for (let i = 0; i < 110; i++) {
      const x = CX - 110 + r() * 230;
      const y = 140 + r() * 136;
      g.fillStyle = rgba(r() < 0.5 ? '#f2d89a' : '#c8a868', 0.8);
      g.beginPath();
      g.arc(x, y, 0.6 + r() * 1.2, 0, Math.PI * 2);
      g.fill();
    }
  }
}

/** The flip-flop's Y strap from the toe post (between the big toe and the next) to both sides. */
function flipStraps(f: BareFoot, cleftPt: [number, number]): [number, number][][] {
  const [px, py] = cleftPt;
  const q = (ax: number, ay: number, cx: number, cy: number, bx: number, by: number): [number, number][] => {
    const out: [number, number][] = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16;
      out.push([(1 - u) * (1 - u) * ax + 2 * u * (1 - u) * cx + u * u * bx, (1 - u) * (1 - u) * ay + 2 * u * (1 - u) * cy + u * u * by]);
    }
    return out;
  };
  void f;
  const knot: [number, number] = [px - 4, py - 34];
  return [q(knot[0], knot[1], CX - 30, 124, CX - 104, 160), q(knot[0], knot[1], px + 18, 116, CX + 110, 150), [[px, py - 4], knot]];
}

function paintFlipStraps(g: Ctx, f: BareFoot, col: string, tanLine: string | null): [number, number] {
  const cl = cleft(f.toes[3], f.toes[4]);
  const runs = flipStraps(f, cl);
  if (tanLine) {
    // the pale skin the strap kept out of the sun
    for (const run of runs.slice(0, 2)) {
      softStroke(g, (c) => run.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))), rgba(tanLine, 0.85), 22, 3);
    }
  }
  for (const run of runs) strap(g, run, 11, col, { tex: 'rubber', gloss: 0.4 });
  // the toe post's plug where the straps meet
  const [kx, ky] = runs[0][0];
  contact(g, (c) => {
    c.beginPath();
    c.arc(kx, ky, 8, 0, Math.PI * 2);
    c.fill();
  }, 0.5);
  const kg = g.createRadialGradient(kx - 3, ky - 3, 1, kx, ky, 9);
  kg.addColorStop(0, shade(col, 0.4));
  kg.addColorStop(0.6, col);
  kg.addColorStop(1, shade(col, -0.45));
  g.fillStyle = kg;
  g.beginPath();
  g.arc(kx, ky, 8, 0, Math.PI * 2);
  g.fill();
  spec(g, kx - 2.5, ky - 3, 3.5, 2, 0.8, -0.6);
  return cl;
}

// ——— Flip-Flop Phil ———
// Beach-brown, sandy, in a teal foam flip-flop with a yellow strap. In play sand trickles off his sole and a landing
// kicks up a spray of it.

export const PHIL: BareLook = { skin: '#a86b45', pores: 0.24, shadowTint: '#6a1a10' };

registerStyle('flipflop', {
  contactY: 266,
  halfWidth: 108,
  rig: BARE_RIG,
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 24 },
  draw(ctx, art, p) {
    const f = paintBare(ctx, { ...PHIL, skin: art.skin, nails: art.nails }, p);
    const g = f.sil.g;
    extendSil(f.sil, [flipSole]);
    paintFlipSole(g, f, art.primary ?? '#18b5c9', art.skin, true);
    // sun-weathered: a warm sheen on the top and a bleached patch of hair on the toes
    spec(g, CX - 30, 60, 50, 26, 0.18, -0.7, '#ffe8c8');
    const r = rng(hashStr('phil-hair'));
    for (const t of f.toes.slice(2)) {
      const [kx, ky] = onToe(t, -Math.PI / 2);
      g.strokeStyle = rgba(shade(art.skin, -0.55), 0.55);
      g.lineWidth = 0.8;
      for (let i = 0; i < 6; i++) {
        const x = kx + (r() - 0.5) * t.rx;
        const y = ky + t.ry * 0.35 + r() * 6;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + 2, y + 5);
        g.stroke();
      }
    }
    paintFlipStraps(g, f, art.secondary ?? '#ffcc33', null);
    silLightBare(f);
    f.sil.finish(inkOf(art.primary ?? '#18b5c9'), { openTop: f.top + 1.5 });
  },
});

function silLightBare(f: BareFoot): void {
  f.sil.edge(rgba(LIGHT.rim, 0.45), 2.5, LX * 3, LY * 3);
}

// ——— Sunburnt Sue ———
// Asleep on the beach too long: angry red skin, the pale ghost of the strap, peeling flakes, a shiny blister, in a hot
// pink flip-flop. In play the heat shimmers off her and flakes of skin drift down.

export const SUE: BareLook = { skin: '#f0846a', pores: 0.2, shadowTint: '#a01a2a', toe: 0.98 };

registerStyle('sue', {
  contactY: 266,
  halfWidth: 108,
  rig: BARE_RIG,
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 24 },
  draw(ctx, art, p) {
    const f = paintBare(ctx, { ...SUE, skin: art.skin, nails: art.nails ?? '#ff3d7f' }, p);
    const g = f.sil.g;
    extendSil(f.sil, [flipSole]);
    paintFlipSole(g, f, art.primary ?? '#ff3d7f', art.skin, false);
    // the burn: hottest on the top of the foot and the toes' tops, a glossy tight sheen
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(CX, 100, 80, 90, 0, 0, Math.PI * 2);
    }, rgba('#ff2a2a', 0.22), 18, 'multiply');
    for (const t of f.toes) {
      const [kx, ky] = onToe(t, -Math.PI / 2);
      softFill(g, (c) => {
        c.beginPath();
        c.ellipse(kx, ky + t.ry * 0.6, t.rx * 0.7, t.ry * 0.35, t.rot, 0, Math.PI * 2);
      }, rgba('#ff2020', 0.3), 3, 'multiply');
    }
    spec(g, CX - 30, 70, 46, 16, 0.3, -1.1, '#ffe0d0');
    // peeling: ragged pale patches with lifted, lit edges
    const r = rng(hashStr('sue-peel'));
    for (const [x, y, s] of [[CX - 54, 50, 14], [CX + 40, 30, 10], [CX - 20, 150, 12], [CX + 62, 140, 9]] as const) {
      const peel = (c: Ctx) => {
        c.beginPath();
        for (let i = 0; i <= 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const rr = s * (0.7 + r() * 0.5);
          const px = x + Math.cos(a) * rr;
          const py = y + Math.sin(a) * rr * 0.7;
          if (i) c.lineTo(px, py);
          else c.moveTo(px, py);
        }
        c.closePath();
      };
      g.fillStyle = rgba('#ffd8c8', 0.75);
      peel(g);
      g.fill();
      g.strokeStyle = rgba('#fff4ee', 0.9);
      g.lineWidth = 1.2;
      peel(g);
      g.stroke();
      contact(g, (c) => {
        peel(c);
        c.lineWidth = 1.2;
        c.stroke();
      }, 0.3, 1, 1);
    }
    // a blister on the big toe's knuckle
    const big = f.toes[4];
    const [bx, by] = onToe(big, -Math.PI / 2);
    bead(g, bx - 4, by + big.ry * 0.6, 6, '#fff0e0', 0.8);
    paintFlipStraps(g, f, art.secondary ?? '#ffffff', mix(art.skin, '#ffe2cc', 0.7));
    silLightBare(f);
    f.sil.finish(inkOf(art.skin), { openTop: f.top + 1.5 });
  },
});

// ════════════════════════════ FROSTY FRED ════════════════════════════
// Walked here through a blizzard: blue-white skin feathered with frost, snow caked on the toes, icicles hanging off
// them. In play cold mist rolls off him, snow flurries round him and the icicles drip.

export const FRED: BareLook = { skin: '#b9dcff', nails: '#e8f6ff', pores: 0.1, shadowTint: '#2a3a9a', detail: 0.6 };

/** Icicles under the toes (pose-following): root x, y and length. */
function icicles(toes: StyleToe[]): { x: number; y: number; len: number; w: number }[] {
  const out: { x: number; y: number; len: number; w: number }[] = [];
  const r = rng(hashStr('fred-ice'));
  toes.forEach((t, i) => {
    const n = i === 4 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const a = Math.PI / 2 + (n === 1 ? (r() - 0.5) * 0.4 : (k - 0.5) * 0.6);
      const [x, y] = onToe(t, a);
      out.push({ x, y: y - 3, len: 10 + r() * 12 + (i === 4 ? 6 : 0), w: 3.2 + r() * 2 });
    }
  });
  return out;
}

const iciclePath = (ic: { x: number; y: number; len: number; w: number }): PathFn => (c) => {
  c.beginPath();
  c.moveTo(ic.x - ic.w, ic.y);
  c.quadraticCurveTo(ic.x - ic.w * 0.3, ic.y + ic.len * 0.6, ic.x + ic.w * 0.1, ic.y + ic.len);
  c.quadraticCurveTo(ic.x + ic.w * 0.4, ic.y + ic.len * 0.5, ic.x + ic.w, ic.y);
  c.closePath();
};

function frostFern(g: Ctx, r: () => number, x: number, y: number, ang: number, len: number, depth: number): void {
  const ex = x + Math.cos(ang) * len;
  const ey = y + Math.sin(ang) * len;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(ex, ey);
  g.stroke();
  if (depth <= 0) return;
  for (let i = 1; i <= 3; i++) {
    const u = i / 4;
    const bx = x + (ex - x) * u;
    const by = y + (ey - y) * u;
    for (const s of [-1, 1]) frostFern(g, r, bx, by, ang + s * (0.7 + r() * 0.3), len * 0.42, depth - 1);
  }
}

registerStyle('fred', {
  contactY: 262,
  rig: BARE_RIG,
  leg: { kind: 'wool', hw: 72, join: 'hem' },
  draw(ctx, art, p) {
    const f = paintBare(ctx, { ...FRED, skin: art.skin, nails: mix(art.nails ?? '#e8f6ff', '#5aa8ff', 0.45) }, p);
    const g = f.sil.g;
    const ice = icicles(f.toes);
    const icePaths = ice.map(iciclePath);
    // icicles go behind the toes they hang from
    extendSil(f.sil, icePaths);
    layerOn(g, 'destination-over', (l) => {
      ice.forEach((ic, i) => {
        clipTo(l, icePaths[i], () => {
          const ig = l.createLinearGradient(ic.x - ic.w, 0, ic.x + ic.w, 0);
          ig.addColorStop(0, rgba('#f4fbff', 0.9));
          ig.addColorStop(0.45, rgba('#9fd4ff', 0.7));
          ig.addColorStop(1, rgba('#3a7ad0', 0.85));
          l.fillStyle = ig;
          l.fillRect(ic.x - ic.w - 2, ic.y - 2, ic.w * 2 + 4, ic.len + 4);
          l.fillStyle = rgba('#ffffff', 0.85);
          l.fillRect(ic.x - ic.w * 0.5, ic.y, 1.4, ic.len * 0.7);
        });
      });
    });
    // frost ferns feathering over the skin
    const r = rng(hashStr('fred-frost'));
    g.save();
    g.strokeStyle = rgba('#ffffff', 0.55);
    g.lineWidth = 0.9;
    for (const [x, y, a, l] of [[CX - 90, 40, 0.5, 40], [CX - 80, 150, -0.4, 36], [CX + 96, 60, Math.PI - 0.5, 42], [CX + 90, 170, Math.PI + 0.3, 34], [CX - 20, 10, 1.4, 30], [CX + 30, 120, 2.2, 28]] as const) frostFern(g, r, x, y, a, l, 2);
    g.restore();
    // frost bloom at the edges, and a crust of snow on each toe's knuckle
    f.sil.edge(rgba('#ffffff', 0.55), 10, -LX * 2, -LY * 2);
    for (const t of f.toes) {
      const [kx, ky] = onToe(t, -Math.PI / 2);
      const sy = ky + t.ry * 0.62;
      const cap = (c: Ctx) => {
        c.beginPath();
        c.ellipse(kx, sy, t.rx * 0.62, t.ry * 0.14, t.rot, Math.PI, 0);
        c.quadraticCurveTo(kx + t.rx * 0.3, sy + t.ry * 0.1, kx, sy + t.ry * 0.07);
        c.quadraticCurveTo(kx - t.rx * 0.3, sy + t.ry * 0.11, kx - t.rx * 0.62, sy);
        c.closePath();
      };
      contact(g, (c) => {
        cap(c);
        c.fill();
      }, 0.3, 1.5, 2);
      const cg = g.createLinearGradient(0, sy - t.ry * 0.2, 0, sy + t.ry * 0.15);
      cg.addColorStop(0, rgba('#ffffff', 0.85));
      cg.addColorStop(1, rgba('#c8dcf4', 0.5));
      g.fillStyle = cg;
      cap(g);
      g.fill();
      // sparkling crystals in the snow
      for (let i = 0; i < 3; i++) glint(g, kx + (i - 1) * t.rx * 0.35, sy - t.ry * 0.05, 1.6, 0.9);
      texture(g, 'speckle', f.box, 0.08, 1);
    }
    // snow caked on the instep
    const snow = (c: Ctx) => {
      c.beginPath();
      c.moveTo(CX - 46, 8);
      c.bezierCurveTo(CX - 30, -2, CX + 20, 4, CX + 46, 10);
      c.bezierCurveTo(CX + 40, 24, CX + 20, 20, CX + 4, 30);
      c.bezierCurveTo(CX - 14, 22, CX - 34, 28, CX - 46, 8);
      c.closePath();
    };
    contact(g, (c) => {
      snow(c);
      c.fill();
    }, 0.3, 2, 3);
    const sg = g.createLinearGradient(0, 0, 0, 30);
    sg.addColorStop(0, '#ffffff');
    sg.addColorStop(1, '#bcd4f0');
    g.fillStyle = sg;
    snow(g);
    g.fill();
    for (const t of f.toes) spec(g, t.cx - t.rx * 0.3, t.cy, t.rx * 0.3, t.ry * 0.2, 0.6, -1);
    bareOutline(f, mix(inkOf(art.skin), '#14205a', 0.4));
  },
});

// ════════════════════════════ GOLDEN FOOT ════════════════════════════
// A treasure: solid polished gold, the world reflected in it (a bright sky band, a dark horizon), hard glints and
// engraved nails. In play it glitters and sheds sparkles.

export const GOLDEN: BareLook = { skin: '#f7c948', nails: null, pores: 0, detail: 0.6, shadowTint: '#6a3000' };

function goldSparkles(g: Ctx, k: number): void {
  for (const [x, y, s] of [[CX - 40, 50, 11], [CX + 50, 96, 8], [CX - 64, 140, 7], [CX + 16, 20, 6], [CX + 70, 30, 5]] as const) {
    const rg = g.createRadialGradient(x, y, 0, x, y, s * 2.2);
    rg.addColorStop(0, rgba('#fff8d0', 0.9 * k));
    rg.addColorStop(1, rgba('#ffc830', 0));
    g.fillStyle = rg;
    g.fillRect(x - s * 3, y - s * 3, s * 6, s * 6);
    glint(g, x, y, s, k);
  }
}

registerStyle('golden', {
  rig: BARE_RIG,
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 24 },
  draw(ctx, art, p, o) {
    const look = { ...GOLDEN, skin: art.skin };
    if (o.emissive) {
      bareEmissive(ctx, look, p, (g) => goldSparkles(g, 1));
      return;
    }
    const f = paintBare(ctx, look, p);
    const g = f.sil.g;
    const box = f.box;
    // metal, not skin: the environment reflected in hard bands (sky above, a dark horizon, warm ground below)
    layerOn(g, 'source-atop', (l) => {
      const env = l.createLinearGradient(CX - 60, -10, CX + 40, 250);
      env.addColorStop(0, rgba('#fffbe0', 0.55));
      env.addColorStop(0.18, rgba('#ffe27a', 0.2));
      env.addColorStop(0.3, rgba('#5a2a00', 0.42));
      env.addColorStop(0.36, rgba('#8a4a00', 0.2));
      env.addColorStop(0.55, rgba('#ffd860', 0.1));
      env.addColorStop(0.75, rgba('#fff2b0', 0.4));
      env.addColorStop(1, rgba('#a05a00', 0.3));
      l.fillStyle = env;
      l.fillRect(box.x, box.y, box.w, box.h);
    });
    texture(g, 'brushed', box, 0.08, 1, 'soft-light');
    // every toe a polished dome with its own window reflection
    for (const t of f.toes) {
      spec(g, t.cx - t.rx * 0.32, t.cy - t.ry * 0.1, t.rx * 0.45, t.ry * 0.32, 0.9, -1.1, '#fffbe8');
      glint(g, t.cx - t.rx * 0.38, t.cy - t.ry * 0.18, t.rx * 0.28, 0.95);
      // an engraved nail outline
      const [x, y] = nailTop(t);
      g.strokeStyle = rgba('#7a4400', 0.5);
      g.lineWidth = 1.1;
      g.beginPath();
      g.ellipse(x, y, t.rx * 0.45, t.ry * 0.3, t.rot, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = rgba('#fff4c0', 0.6);
      g.beginPath();
      g.ellipse(x + 0.8, y + 1, t.rx * 0.45, t.ry * 0.3, t.rot, 0.2, 1.6);
      g.stroke();
    }
    spec(g, CX - 30, 60, 30, 70, 0.55, -0.35, '#fffbe8');
    goldSparkles(g, 0.7);
    f.sil.edge(rgba('#fff4b0', 0.6), 3, -LX * 2, -LY * 2);
    f.sil.edge(rgba('#4a2000', 0.35), 14, LX * 8, LY * 8);
    bareOutline(f, '#5a3204');
  },
});
