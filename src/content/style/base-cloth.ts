// Base roster, feet in cloth and wraps (style kit): Sweaty Sock, Toe-Sock Tina, Argyle Arthur, Socks & Sandals Dad,
// Mummy Toes, Broken Bill and Gladiator Gus. Socks are knitted over the kit's own foot (the toes show as soft lumps
// under the knit and wiggle with it); wraps, casts and straps are painted over it inside the one silhouette. How they
// move in play: src/content/styleLive/base.ts.

import { CX } from '../../art/feetCommon';
import { type BareOpts, type StyleToe, bareBox, bareParts, cleft, onToe, poseToes, restToes } from '../../art/style/anatomy';
import { paintBare } from '../../art/style/bare';
import { LIGHT, type Box, type PathFn, type Pose, ao, crease, glint, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil, lobe } from '../../art/style/sil';
import { type PartDef, registerStyle } from '../../art/style/registry';
import { MATERIALS } from '../../art/style/materials';
import { blotches, contact, rivet, stitches } from '../../art/style/details';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';
import { BARE_RIG, LX, LY, bead, clefts, clipTo, extendSil, label, layerOn, strap, toePath } from './base-kit';

// ════════════════════════════ knitted feet ════════════════════════════

export interface KnitFoot {
  sil: Sil;
  toes: StyleToe[];
  box: Box;
  g: Ctx;
}

/** A sock's shape: the kit's foot with its toes as rounder, shorter lumps that the knit stretches over. */
export const SOCK_SHAPE: BareOpts = { toe: 1.12, toeLen: 0.8, ankle: 54, w: 4 };

export function knitFoot(ctx: Ctx, p: Pose, o: BareOpts): KnitFoot {
  const toes = poseToes(restToes(o), p);
  const box = bareBox(o);
  const sil = new Sil(ctx, bareParts(toes, o), box);
  return { sil, toes, box, g: sil.g };
}

/** Light a knitted foot: the knit under the one light, each toe a soft lump, the knit pulled into the clefts. A
 * `pattern` (stripes, argyle, a toe patch) is knitted in under the light: painted in its true colours, then shaded. */
export function knitLight(f: KnitFoot, base: string, o: { lumps?: number; tex?: number; pattern?: (l: Ctx) => void } = {}): void {
  const { sil, g, toes, box } = f;
  const tint = MATERIALS.knit.shadowTint;
  const deep = mix(shade(base, -0.5), tint, 0.4);
  sil.form({ base, shadowTint: tint, ramp: 0.55, form: 0.5, formSize: 30, bevel: 0.25, rim: 0.45 });
  if (o.pattern) {
    layerOn(g, 'source-atop', o.pattern);
    // the light again, over the pattern: a ramp, the far edge in shadow, the near edge lit
    const [lx, ly] = [LX, LY];
    const ramp = g.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
    ramp.addColorStop(0, rgba('#ffffff', 0.14));
    ramp.addColorStop(0.45, rgba('#ffffff', 0));
    ramp.addColorStop(1, rgba(tint, 0.28));
    g.fillStyle = ramp;
    g.fillRect(box.x, box.y, box.w, box.h);
    sil.edge(rgba(deep, 0.45), 18, lx * 10, ly * 10);
    sil.edge(rgba(LIGHT.key, 0.25), 8, -lx * 4, -ly * 4);
  }
  texture(g, 'knit', box, o.tex ?? 0.32, 1.6, 'soft-light');
  const cl = clefts(toes);
  toes.forEach((t, i) => {
    const xl = i > 0 ? cl[i - 1][0] : -1000;
    const xr = i < cl.length ? cl[i][0] : 1000;
    lobe(g, toePath(t), { x: xl, y: t.cy - t.ry - 4, w: xr - xl, h: t.ry * 2 + 8 }, t.cy - t.ry * 0.8, t.cy - t.ry * 0.1, deep, 0.5 * (o.lumps ?? 1), Math.max(6, t.rx * 0.45), 0.3);
  });
  // the knit pulled taut into each cleft: a short soft fold
  for (const [kx, ky] of cl) {
    const gr = g.createLinearGradient(0, ky - 22, 0, ky + 2);
    gr.addColorStop(0, rgba(deep, 0));
    gr.addColorStop(1, rgba(deep, 0.5));
    softStroke(g, (c) => {
      c.moveTo(kx, ky + 2);
      c.quadraticCurveTo(kx - 1, ky - 10, kx - 3, ky - 22);
    }, gr, 3.5, 1.4);
  }
  // fuzzy wool catching the light along the near edge
  sil.edge(rgba('#ffffff', 0.2), 3, -LX * 1.5, -LY * 1.5);
  sil.edge(rgba(LIGHT.rim, 0.4), 2.5, LX * 3, LY * 3);
}

/** Horizontal knitted stripes (clipped by the silhouette at the end). */
function stripes(g: Ctx, box: Box, bands: [number, number, string][]): void {
  for (const [y, h, col] of bands) {
    // knitted stripes follow the foot's curve a little
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(box.x, y + 4);
    g.quadraticCurveTo(CX, y - 4, box.x + box.w, y + 4);
    g.lineTo(box.x + box.w, y + h + 4);
    g.quadraticCurveTo(CX, y + h - 4, box.x, y + h + 4);
    g.closePath();
    g.fill();
  }
}

/** Ribbing down a sock's cuff: soft vertical ridges, lit on their left. */
function ribbing(g: Ctx, y0: number, y1: number, hw: number, base: string): void {
  for (let x = CX - hw; x < CX + hw; x += 6) {
    g.fillStyle = rgba(shade(base, -0.35), 0.22);
    g.fillRect(x + 3, y0, 2, y1 - y0);
    g.fillStyle = rgba('#ffffff', 0.18);
    g.fillRect(x, y0, 1.4, y1 - y0);
  }
}

// ════════════════════════════ SWEATY SOCK ════════════════════════════
// Worn three days straight: a white tube sock gone grey and yellow, damp patches, red toe and stripes, and a hole worn
// through over the big toe. In play it drips sweat and every stomp splashes.

registerStyle('sock', {
  rig: BARE_RIG,
  leg: { kind: 'knit', hw: 54, join: 'blend', fade: 26 },
  draw(ctx, art, p) {
    const white = art.primary ?? '#f4f1ea';
    const red = art.secondary ?? '#d8343f';
    const f = knitFoot(ctx, p, SOCK_SHAPE);
    const { g, box, toes } = f;
    knitLight(f, white, {
      pattern: (l) => {
        // the red toe patch, its knitted edge following the toes, and the stripes round the ankle
        l.fillStyle = red;
        l.beginPath();
        l.moveTo(box.x, 214);
        for (const t of toes) l.lineTo(t.cx, t.cy - t.ry * 0.35);
        l.lineTo(box.x + box.w, 220);
        l.lineTo(box.x + box.w, 300);
        l.lineTo(box.x, 300);
        l.closePath();
        l.fill();
        stripes(l, box, [[18, 9, red], [32, 4, mix(red, '#2a3a8a', 0.6)], [41, 9, red]]);
      },
    });
    ribbing(g, -8, 56, 60, white);
    // three days of wear: yellowed patches, damp grey, sweat beads
    blotches(g, box, '#c8b060', 0.26, 34, 0.55, 0.18, 61, 'multiply');
    blotches(g, box, '#9a9aa8', 0.16, 24, 0.6, 0.14, 62, 'multiply');
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(CX + 10, 186, 92, 26, 0, 0, Math.PI * 2);
    }, rgba('#8a7a40', 0.28), 10, 'multiply');
    const r = rng(hashStr('sock-sweat'));
    for (let i = 0; i < 10; i++) bead(g, CX - 70 + r() * 150, 50 + r() * 140, 1.6 + r() * 2.2, '#f2f4e0', 0.55);
    // the hole over the big toe: frayed ring, skin showing through, a nail peeking
    const big = toes[4];
    const [hx, hy] = onToe(big, Math.PI / 2 - 0.05);
    const hole = (c: Ctx) => {
      c.beginPath();
      c.ellipse(hx - 1, hy - big.ry * 0.42, big.rx * 0.5, big.ry * 0.36, big.rot, 0, Math.PI * 2);
    };
    clipTo(g, hole, () => {
      const sg = g.createRadialGradient(hx - 6, hy - big.ry * 0.5, 2, hx, hy - big.ry * 0.4, big.rx * 0.6);
      sg.addColorStop(0, shade(art.skin, 0.2));
      sg.addColorStop(0.7, art.skin);
      sg.addColorStop(1, shade(art.skin, -0.45));
      g.fillStyle = sg;
      g.fillRect(hx - 30, hy - 40, 60, 60);
      texture(g, 'pores', box, 0.3, 1, 'soft-light');
      // the nail peeking through
      g.fillStyle = mix(art.skin, '#fff0e8', 0.5);
      g.beginPath();
      g.ellipse(hx - 1, hy - big.ry * 0.36, big.rx * 0.3, big.ry * 0.2, big.rot, 0, Math.PI * 2);
      g.fill();
      spec(g, hx - 5, hy - big.ry * 0.42, 4, 2, 0.8, -0.5);
      ao(g, hx + 3, hy - big.ry * 0.6, big.rx * 0.6, big.ry * 0.2, 0.5);
    });
    g.save();
    g.strokeStyle = mix(red, '#ffffff', 0.25);
    g.lineWidth = 1.2;
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const ex = hx - 1 + Math.cos(a) * big.rx * 0.5;
      const ey = hy - big.ry * 0.42 + Math.sin(a) * big.ry * 0.36;
      g.beginPath();
      g.moveTo(ex, ey);
      g.lineTo(ex - Math.cos(a) * (2 + r() * 3) + (r() - 0.5) * 3, ey - Math.sin(a) * (2 + r() * 3));
      g.stroke();
    }
    g.restore();
    f.sil.finish(inkOf(mix(white, '#8a8070', 0.5)), { openTop: -5 });
  },
});

// ════════════════════════════ TOE-SOCK TINA ════════════════════════════
// Five toes, five colours: a rainbow-striped toe sock, every toe knitted on its own. In play the toes wiggle and lint
// drifts off the wool.

export const TINA_COLS = ['#ff4d6d', '#ff9f1c', '#ffd23f', '#3ddc97', '#4cc9f0', '#7b5cff'];
const TINA_SHAPE: BareOpts = { toe: 1.02, toeLen: 1.02, ankle: 52, w: 2 };

registerStyle('tina', {
  rig: BARE_RIG,
  leg: { kind: 'knit', hw: 52, join: 'blend', fade: 26 },
  draw(ctx, art, p) {
    const f = knitFoot(ctx, p, TINA_SHAPE);
    const { g, box, toes } = f;
    knitLight(f, '#f4f0ff', {
      lumps: 1.2,
      pattern: (l) => {
        // the body: rainbow bands, and every toe its own colour (knitted separately: a seam where it joins)
        const bands: [number, number, string][] = [];
        for (let i = 0; i < 12; i++) bands.push([-8 + i * 17, 17, TINA_COLS[i % 6]]);
        stripes(l, box, bands);
        toes.forEach((t, i) => {
          l.save();
          l.beginPath();
          l.rect(box.x, onToe(t, -Math.PI / 2)[1] + t.ry * 0.47, box.w, 200);
          l.clip();
          l.fillStyle = TINA_COLS[(i + 1) % 6];
          toePath(t)(l);
          l.fill();
          l.restore();
        });
      },
    });
    toes.forEach((t, i) => {
      const col = TINA_COLS[(i + 1) % 6];
      const [, ky] = onToe(t, -Math.PI / 2);
      stitches(g, (c) => c.ellipse(t.cx, ky + t.ry * 0.47, t.rx * 0.86, 3, t.rot, 0.15, Math.PI - 0.15), rgba(shade(col, -0.35), 0.8), 1.2, 2, 2);
      spec(g, t.cx - t.rx * 0.35, t.cy + t.ry * 0.1, t.rx * 0.35, t.ry * 0.2, 0.25, -1);
    });
    ribbing(g, -8, 26, 56, '#ffffff');
    f.sil.finish(inkOf(art.primary ?? '#7b5cff'), { openTop: -5 });
  },
});

// ════════════════════════════ ARGYLE ARTHUR ════════════════════════════
// A gentleman's sock in thick navy wool: gold and cream argyle diamonds with a fine red overcheck, a darker toe. In
// play wool fluff drifts off it.

export function argyle(g: Ctx, box: Box, base: string, a: string, b: string, line: string, dw = 34, dh = 46, ox = 0): void {
  g.fillStyle = base;
  g.fillRect(box.x, box.y, box.w, box.h);
  let row = 0;
  for (let y = box.y - dh; y < box.y + box.h + dh; y += dh / 2) {
    for (let x = box.x - dw + ((row & 1) * dw) / 2 + ox; x < box.x + box.w + dw; x += dw) {
      g.fillStyle = row & 1 ? a : b;
      g.beginPath();
      g.moveTo(x, y - dh / 2);
      g.lineTo(x + dw / 2, y);
      g.lineTo(x, y + dh / 2);
      g.lineTo(x - dw / 2, y);
      g.closePath();
      g.fill();
    }
    row++;
  }
  // the overcheck: fine diagonal lines through the diamonds' points
  g.save();
  g.strokeStyle = line;
  g.lineWidth = 1.5;
  g.setLineDash([3, 2]);
  for (let x = box.x - box.h - 2 * dw; x < box.x + box.w + box.h; x += dw) {
    g.beginPath();
    g.moveTo(x + ox, box.y - dh / 2);
    g.lineTo(x + ox + (box.h + dh) * (dw / dh), box.y + box.h + dh / 2);
    g.moveTo(x + ox + dw, box.y - dh / 2);
    g.lineTo(x + ox + dw - (box.h + dh) * (dw / dh), box.y + box.h + dh / 2);
    g.stroke();
  }
  g.restore();
}

registerStyle('arthur', {
  rig: BARE_RIG,
  leg: { kind: 'knit', hw: 54, join: 'blend', fade: 26 },
  draw(ctx, art, p) {
    const navy = art.primary ?? '#2f4a7a';
    const gold = art.secondary ?? '#e9c46a';
    const f = knitFoot(ctx, p, SOCK_SHAPE);
    const { g, box, toes } = f;
    knitLight(f, navy, {
      pattern: (l) => {
        argyle(l, { x: box.x, y: -10, w: box.w, h: 216 }, navy, gold, shade(navy, 0.08), mix('#e8e4d8', gold, 0.2), 44, 56, 4);
        // the toe: plain navy, a shade darker
        l.fillStyle = shade(navy, -0.12);
        l.beginPath();
        l.moveTo(box.x, 206);
        for (const t of toes) l.lineTo(t.cx, t.cy - t.ry * 0.55);
        l.lineTo(box.x + box.w, 206);
        l.lineTo(box.x + box.w, 300);
        l.lineTo(box.x, 300);
        l.closePath();
        l.fill();
      },
    });
    ribbing(g, -8, 30, 60, navy);
    stitches(g, (c) => {
      c.moveTo(box.x, 206);
      for (const t of toes) c.lineTo(t.cx, t.cy - t.ry * 0.55);
      c.lineTo(box.x + box.w, 206);
    }, rgba(shade(gold, -0.2), 0.7), 1.1, 2, 2.5);
    f.sil.finish(inkOf(navy), { openTop: -5 });
  },
});

// ════════════════════════════ SOCKS & SANDALS DAD ════════════════════════════
// A crime against fashion: a white sports sock with blue stripes pulled up high, in a brown leather sandal (a cork sole,
// two buckled straps). In play little sparkles of comfort rise off him as he heals.

/** A sandal sole under a foot (cork with a dark rubber edge), peeking out round the toes and sides. */
export const sandalSole: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 40, 30);
  c.bezierCurveTo(CX - 56, 70, CX - 94, 100, CX - 108, 150);
  c.bezierCurveTo(CX - 116, 190, CX - 116, 212, CX - 112, 228);
  c.bezierCurveTo(CX - 104, 266, CX - 52, 278, CX + 8, 280);
  c.bezierCurveTo(CX + 74, 282, CX + 120, 270, CX + 123, 228);
  c.bezierCurveTo(CX + 126, 196, CX + 120, 160, CX + 114, 140);
  c.bezierCurveTo(CX + 100, 100, CX + 62, 70, CX + 46, 30);
  c.quadraticCurveTo(CX, 24, CX - 40, 30);
  c.closePath();
};

/** Paint a sole under a finished foot paint layer: the foot's contact shadow and ink line, the top face, the side. */
export function paintSoleUnder(g: Ctx, footParts: PathFn[], sole: PathFn, top: string, side: string, ink: string, o: { tex?: 'rubber' | 'leather' | 'wood' | 'grain'; thick?: number; stitch?: string } = {}): void {
  const thick = o.thick ?? 9;
  layerOn(g, 'destination-over', (l) => {
    l.save();
    if ('filter' in l) l.filter = 'blur(2.5px)';
    l.translate(-LX * 4, -LY * 4);
    l.fillStyle = rgba('#000000', 0.45);
    for (const pth of footParts) {
      pth(l);
      l.fill();
    }
    l.restore();
    l.save();
    l.strokeStyle = rgba(ink, 0.85);
    l.lineWidth = 3;
    for (const pth of footParts) {
      pth(l);
      l.stroke();
    }
    l.restore();
    clipTo(l, sole, () => {
      const tg = l.createLinearGradient(CX - 120, 40, CX + 120, 280);
      tg.addColorStop(0, shade(top, 0.2));
      tg.addColorStop(0.5, top);
      tg.addColorStop(1, shade(top, -0.3));
      l.fillStyle = tg;
      l.fillRect(CX - 130, 0, 260, 290);
      texture(l, o.tex ?? 'grain', { x: CX - 130, y: 0, w: 260, h: 290 }, 0.5, 1.2);
      if (o.stitch) {
        l.save();
        l.translate(0, -thick - 4);
        l.scale(1, 1);
        stitches(l, (c) => {
          c.moveTo(CX - 104, 200);
          c.bezierCurveTo(CX - 96, 262, CX - 40, 272, CX + 8, 273);
          c.bezierCurveTo(CX + 70, 274, CX + 112, 262, CX + 116, 200);
        }, o.stitch, 1.2, 3, 3);
        l.restore();
      }
      l.save();
      l.translate(0, -thick);
      l.globalCompositeOperation = 'destination-out';
      sole(l);
      l.fill();
      l.restore();
    });
  });
  layerOn(g, 'destination-over', (l) => {
    clipTo(l, sole, () => {
      const sg = l.createLinearGradient(0, 220, 0, 285);
      sg.addColorStop(0, shade(side, 0.1));
      sg.addColorStop(1, mix(shade(side, -0.5), '#1a1030', 0.3));
      l.fillStyle = sg;
      l.fillRect(CX - 130, 0, 260, 290);
      texture(l, 'rubber', { x: CX - 130, y: 0, w: 260, h: 290 }, 0.5, 1);
      spec(l, CX - 50, 266, 40, 3, 0.3, 0.05);
    });
  });
}

/** A buckled leather strap across the foot along a curve (left to right), its buckle on the outer (left) side. */
function buckledStrap(g: Ctx, pts: [number, number][], w: number, leather: string, brass: string): void {
  strap(g, pts, w, leather, { stitch: rgba(shade(leather, 0.45), 0.7), gloss: 0.25 });
  const [x, y] = pts[2];
  const bw = w * 0.75;
  const frame = (c: Ctx) => {
    c.beginPath();
    c.roundRect(x - bw, y - w * 0.7, bw * 2, w * 1.4, 3);
  };
  contact(g, (c) => {
    frame(c);
    c.lineWidth = 3.4;
    c.stroke();
  }, 0.5, 1.8, 2);
  g.save();
  const bg = g.createLinearGradient(x - bw, y - w, x + bw, y + w);
  bg.addColorStop(0, shade(brass, 0.5));
  bg.addColorStop(0.5, brass);
  bg.addColorStop(1, shade(brass, -0.5));
  g.strokeStyle = bg;
  g.lineWidth = 3.4;
  frame(g);
  g.stroke();
  g.lineWidth = 2.4;
  g.beginPath();
  g.moveTo(x, y - w * 0.7);
  g.lineTo(x + 2, y + w * 0.7);
  g.stroke();
  g.restore();
  glint(g, x - bw + 2, y - w * 0.5, 3, 0.9);
}

function curve(ax: number, ay: number, cx: number, cy: number, bx: number, by: number, n = 14): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    out.push([(1 - u) * (1 - u) * ax + 2 * u * (1 - u) * cx + u * u * bx, (1 - u) * (1 - u) * ay + 2 * u * (1 - u) * cy + u * u * by]);
  }
  return out;
}

registerStyle('dad', {
  contactY: 266,
  halfWidth: 110,
  rig: BARE_RIG,
  leg: { kind: 'knit', hw: 54, join: 'blend', fade: 26 },
  draw(ctx, art, p) {
    const white = art.secondary ?? '#f4f1ea';
    const leather = art.primary ?? '#5a3a22';
    const f = knitFoot(ctx, p, SOCK_SHAPE);
    const { g, box } = f;
    const acc = art.legAccent ?? '#8aa0c8';
    knitLight(f, white, { pattern: (l) => stripes(l, box, [[14, 6, acc], [26, 6, mix(acc, '#2a3a8a', 0.4)], [38, 6, acc]]) });
    ribbing(g, -8, 50, 58, white);
    // a slightly grubby sole line where the sandal rubs
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(CX, 200, 100, 20, 0, 0, Math.PI * 2);
    }, rgba('#a89870', 0.18), 10, 'multiply');
    extendSil(f.sil, [sandalSole]);
    paintSoleUnder(g, f.sil.parts, sandalSole, '#c8945a', '#5a3a22', inkOf(white), { tex: 'grain', thick: 10 });
    // two wide buckled straps
    const brass = '#d8b04a';
    buckledStrap(g, curve(CX - 108, 178, CX - 10, 148, CX + 116, 168), 15, leather, brass);
    buckledStrap(g, curve(CX - 90, 96, CX + 4, 64, CX + 100, 88), 15, leather, brass);
    f.sil.edge(rgba('#2a2040', 0.3), 18, LX * 10, LY * 10);
    f.sil.edge(rgba(LIGHT.rim, 0.4), 2.5, LX * 3, LY * 3);
    f.sil.finish(inkOf(mix(white, leather, 0.5)), { openTop: -5 });
  },
});

// ════════════════════════════ MUMMY TOES ════════════════════════════
// Wrapped for eternity: linen bandages wound round the foot and each toe, yellowed and stained, frayed at the edges, a
// loose end hanging off its side. In play the loose end sways and dust sifts off the wraps.

const MUMMY_END = { x: CX + 92, y: 96 };

function wraps(g: Ctx, box: Box, linen: string, toes: StyleToe[]): void {
  const r = rng(hashStr('mummy-wraps'));
  const dark = mix(shade(linen, -0.6), '#2a1a0a', 0.4);
  // bands wound diagonally round the foot, each overlapping the last: a shadow where it lies on the one below, a lit
  // fold along its top edge
  for (let i = 0; i < 12; i++) {
    const y = -16 + i * 19 + r() * 4;
    const tilt = (i % 2 ? 0.16 : -0.12) + (r() - 0.5) * 0.06;
    const h = 17 + r() * 4;
    g.save();
    g.translate(CX, y);
    g.rotate(tilt);
    const band = (c: Ctx) => {
      c.beginPath();
      c.moveTo(-140, 0);
      c.quadraticCurveTo(0, -6, 140, 0);
      c.lineTo(140, h);
      c.quadraticCurveTo(0, h - 6, -140, h);
      c.closePath();
    };
    contact(g, (c) => {
      band(c);
      c.fill();
    }, 0.4, 2.4, 3);
    const bg = g.createLinearGradient(0, -4, 0, h);
    bg.addColorStop(0, shade(linen, 0.12));
    bg.addColorStop(0.5, linen);
    bg.addColorStop(1, mix(shade(linen, -0.3), '#5a4020', 0.2));
    g.fillStyle = bg;
    band(g);
    g.fill();
    // the weave and the ragged lower edge
    g.strokeStyle = rgba(dark, 0.18);
    g.lineWidth = 0.7;
    for (let k = 0; k < 5; k++) {
      const yy = 3 + k * (h / 5);
      g.beginPath();
      g.moveTo(-140, yy);
      g.quadraticCurveTo(0, yy - 6, 140, yy);
      g.stroke();
    }
    g.strokeStyle = rgba('#fff8e0', 0.5);
    g.lineWidth = 1.1;
    g.beginPath();
    g.moveTo(-140, 1);
    g.quadraticCurveTo(0, -5, 140, 1);
    g.stroke();
    g.restore();
  }
  // each toe wound on its own
  for (const t of toes) {
    g.save();
    g.translate(t.cx, t.cy);
    g.rotate(t.rot);
    g.beginPath();
    g.ellipse(0, 0, t.rx, t.ry, 0, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = shade(linen, -0.05);
    g.fillRect(-t.rx, -t.ry, t.rx * 2, t.ry * 2);
    for (let k = -2; k <= 3; k++) {
      const yy = k * t.ry * 0.36;
      contact(g, (c) => {
        c.fillRect(-t.rx, yy, t.rx * 2, t.ry * 0.3);
      }, 0.35, 1.6, 2);
      const tg = g.createLinearGradient(0, yy, 0, yy + t.ry * 0.34);
      tg.addColorStop(0, shade(linen, 0.12));
      tg.addColorStop(1, mix(shade(linen, -0.25), '#5a4020', 0.2));
      g.fillStyle = tg;
      g.beginPath();
      g.moveTo(-t.rx, yy + (k % 2 ? 2 : -2));
      g.lineTo(t.rx, yy + (k % 2 ? -2 : 2));
      g.lineTo(t.rx, yy + t.ry * 0.34 + (k % 2 ? -2 : 2));
      g.lineTo(-t.rx, yy + t.ry * 0.34 + (k % 2 ? 2 : -2));
      g.closePath();
      g.fill();
    }
    g.restore();
  }
  // age: tea-brown stains and grime, and dark gaps where the wraps part
  blotches(g, box, '#8a6a30', 0.3, 30, 0.55, 0.16, 71, 'multiply');
  blotches(g, box, '#4a3a20', 0.18, 14, 0.66, 0.08, 72, 'multiply');
  for (const [x, y, rx, ry] of [[CX - 40, 120, 9, 4], [CX + 30, 52, 7, 3]] as const) {
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(x, y, rx, ry, -0.2, 0, Math.PI * 2);
    }, rgba('#120a04', 0.85), 1.5);
  }
}

function loosEnd(g: Ctx, linen: string, swing = 0): void {
  const { x, y } = MUMMY_END;
  g.save();
  g.translate(x, y);
  g.rotate(swing);
  const path = (c: Ctx) => {
    c.beginPath();
    c.moveTo(-8, 0);
    c.bezierCurveTo(-4, 30, 14, 50, 8, 84);
    c.lineTo(10, 90);
    c.lineTo(14, 84);
    c.lineTo(19, 90);
    c.lineTo(24, 82);
    c.bezierCurveTo(28, 50, 12, 26, 10, 0);
    c.closePath();
  };
  contact(g, (c) => {
    path(c);
    c.fill();
  }, 0.4, 2.5, 3);
  const lg = g.createLinearGradient(-8, 0, 24, 0);
  lg.addColorStop(0, shade(linen, 0.1));
  lg.addColorStop(0.6, linen);
  lg.addColorStop(1, mix(shade(linen, -0.4), '#5a4020', 0.3));
  g.fillStyle = lg;
  path(g);
  g.fill();
  g.strokeStyle = rgba('#4a3a20', 0.25);
  g.lineWidth = 0.7;
  for (let k = 1; k < 4; k++) {
    g.beginPath();
    g.moveTo(-6 + k * 4, 4);
    g.bezierCurveTo(-2 + k * 4, 30, 14 + k * 2, 50, 8 + k * 4, 82);
    g.stroke();
  }
  g.strokeStyle = inkOf(linen);
  g.lineWidth = 2.6;
  path(g);
  g.stroke();
  g.restore();
}

registerStyle('mummy', {
  rig: BARE_RIG,
  leg: { kind: 'wool', hw: 52, join: 'blend', fade: 26 },
  parts: {
    end: { box: { x: MUMMY_END.x - 20, y: MUMMY_END.y - 6, w: 60, h: 104 }, frames: 1, pivot: [MUMMY_END.x, MUMMY_END.y], draw: (g, art) => loosEnd(g, art.primary ?? '#e9dcb8') },
  } satisfies Record<string, PartDef>,
  draw(ctx, art, p, o) {
    const linen = art.primary ?? '#e9dcb8';
    const f = knitFoot(ctx, p, { toe: 1.06, toeLen: 0.94 });
    const { g, box, toes } = f;
    f.sil.form({ base: linen, shadowTint: '#3a2410', ramp: 0.7, form: 0.5, formSize: 30, bevel: 0.2, rim: 0.4 });
    wraps(g, box, linen, toes);
    texture(g, 'canvas', box, 0.25, 1.1);
    const cl = clefts(toes);
    for (const [kx, ky] of cl) {
      softStroke(g, (c) => {
        c.moveTo(kx, ky + 2);
        c.lineTo(kx - 2, ky - 18);
      }, rgba('#1a1006', 0.55), 3, 1.2);
    }
    f.sil.edge(rgba('#1a1006', 0.35), 18, LX * 10, LY * 10);
    f.sil.edge(rgba(LIGHT.rim, 0.35), 2.5, LX * 3, LY * 3);
    f.sil.finish(inkOf(mix(linen, '#5a4020', 0.4)), { openTop: -5 });
    if (!o.live) loosEnd(ctx, linen);
  },
});

// ════════════════════════════ BROKEN BILL ════════════════════════════
// A plaster cast from the ankle to the ball of the foot, chalky and lumpy, covered in signatures and doodles, with a
// rolled stockinette edge; his bare toes poke out of it. In play they wiggle, and plaster dust puffs off it as he lands.

const castPath: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 62, -8);
  c.lineTo(CX + 64, -8);
  c.bezierCurveTo(CX + 70, 40, CX + 102, 80, CX + 108, 140);
  c.bezierCurveTo(CX + 112, 168, CX + 108, 184, CX + 100, 192);
  c.bezierCurveTo(CX + 50, 204, CX - 40, 200, CX - 98, 186);
  c.bezierCurveTo(CX - 106, 174, CX - 104, 150, CX - 100, 130);
  c.bezierCurveTo(CX - 92, 80, CX - 66, 40, CX - 62, -8);
  c.closePath();
};

function signatures(g: Ctx, blue: string): void {
  const marker = (txt: string, x: number, y: number, px: number, col: string, rot: number) => label(g, txt, x, y, px, rgba(col, 0.85), rot, "'Comic Sans MS', 'Chalkboard SE', cursive", '700');
  marker('GET WELL!', CX - 14, 62, 15, blue, -0.18);
  marker('Bill <3', CX + 40, 132, 12, '#d8343f', 0.12);
  marker('~Mum', CX - 52, 150, 11, '#2a8a4a', -0.1);
  marker('LOL', CX + 56, 28, 10, '#7a3ac8', 0.3);
  // a doodled heart, a smiley and a star
  g.save();
  g.lineWidth = 2;
  g.strokeStyle = rgba('#d8343f', 0.85);
  g.beginPath();
  const hx = CX - 54;
  const hy = 102;
  g.moveTo(hx, hy + 8);
  g.bezierCurveTo(hx - 12, hy, hx - 8, hy - 9, hx, hy - 3);
  g.bezierCurveTo(hx + 8, hy - 9, hx + 12, hy, hx, hy + 8);
  g.stroke();
  g.strokeStyle = rgba(blue, 0.8);
  g.beginPath();
  g.arc(CX + 22, 92, 10, 0, Math.PI * 2);
  g.moveTo(CX + 16, 95);
  g.quadraticCurveTo(CX + 22, 101, CX + 28, 95);
  g.stroke();
  g.fillStyle = rgba(blue, 0.8);
  g.beginPath();
  g.arc(CX + 18, 89, 1.4, 0, Math.PI * 2);
  g.arc(CX + 26, 89, 1.4, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = rgba('#e8a020', 0.9);
  g.beginPath();
  for (let i = 0; i <= 5; i++) {
    const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
    const x = CX - 20 + Math.cos(a) * 8;
    const y = 166 + Math.sin(a) * 8;
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.stroke();
  g.restore();
}

registerStyle('bill', {
  contactY: 262,
  halfWidth: 108,
  rig: BARE_RIG,
  leg: { kind: 'wool', hw: 62, join: 'blend', fade: 26 },
  draw(ctx, art, p) {
    const plaster = art.primary ?? '#f5f2ea';
    const f = paintBare(ctx, { skin: art.skin, pores: 0.2, top: 20 }, p);
    const g = f.sil.g;
    extendSil(f.sil, [castPath]);
    // the cast, laid over the foot and painted as its own lit form
    layerOn(g, 'source-over', (l) => {
      contact(l, (c) => {
        castPath(c);
        c.fill();
      }, 0.55, 3, 4);
      clipTo(l, castPath, () => {
        const cg = l.createLinearGradient(CX - 110, -10, CX + 110, 200);
        cg.addColorStop(0, shade(plaster, 0.06));
        cg.addColorStop(0.5, plaster);
        cg.addColorStop(1, mix(shade(plaster, -0.3), '#5a6a8a', 0.2));
        l.fillStyle = cg;
        l.fillRect(CX - 120, -10, 240, 220);
        texture(l, 'stone', { x: CX - 120, y: -10, w: 240, h: 220 }, 0.22, 1.2);
        texture(l, 'canvas', { x: CX - 120, y: -10, w: 240, h: 220 }, 0.25, 1);
        // lumpy plaster: the bandage turns under the plaster, and grubby smudges
        for (let i = 0; i < 9; i++) {
          const y = 4 + i * 21;
          crease(l, (c) => {
            c.moveTo(CX - 110, y + 10);
            c.bezierCurveTo(CX - 40, y - 6, CX + 30, y + 14, CX + 110, y - 2);
          }, 1.6, shade(plaster, -0.5), 0.12, 0.3);
        }
        blotches(l, { x: CX - 120, y: -10, w: 240, h: 220 }, '#a89878', 0.22, 30, 0.58, 0.15, 81, 'multiply');
        signatures(l, art.secondary ?? '#3a6ad0');
        spec(l, CX - 50, 50, 40, 70, 0.3, -0.3, '#ffffff');
        // the cast's own form shadow on its far edge
        l.save();
        l.globalCompositeOperation = 'source-atop';
        const fs = l.createLinearGradient(CX + 40, 0, CX + 112, 0);
        fs.addColorStop(0, rgba('#3a3a5a', 0));
        fs.addColorStop(1, rgba('#3a3a5a', 0.35));
        l.fillStyle = fs;
        l.fillRect(CX - 120, -10, 240, 220);
        l.restore();
      });
      // the rolled stockinette edge over the toes
      const roll = (c: Ctx) => {
        c.beginPath();
        c.moveTo(CX - 100, 180);
        c.bezierCurveTo(CX - 40, 194, CX + 50, 198, CX + 102, 184);
        c.bezierCurveTo(CX + 106, 192, CX + 104, 198, CX + 98, 202);
        c.bezierCurveTo(CX + 50, 212, CX - 40, 208, CX - 98, 196);
        c.bezierCurveTo(CX - 104, 190, CX - 104, 184, CX - 100, 180);
        c.closePath();
      };
      contact(l, (c) => {
        roll(c);
        c.fill();
      }, 0.55, 2.5, 3);
      clipTo(l, roll, () => {
        const rg = l.createLinearGradient(0, 180, 0, 210);
        rg.addColorStop(0, '#ffffff');
        rg.addColorStop(0.5, '#ece6da');
        rg.addColorStop(1, '#a8a090');
        l.fillStyle = rg;
        l.fillRect(CX - 110, 176, 220, 40);
        texture(l, 'knit', { x: CX - 110, y: 176, w: 220, h: 40 }, 0.45, 1.3);
      });
    });
    // under the roll: a bruise peeking out over the toes
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(CX + 40, 212, 30, 8, 0, 0, Math.PI * 2);
    }, rgba('#6a3a8a', 0.25), 5, 'multiply');
    f.sil.edge(rgba(LIGHT.rim, 0.4), 2.5, LX * 3, LY * 3);
    f.sil.finish(inkOf(mix(plaster, art.skin, 0.3)), { openTop: -6 });
  },
});

// ════════════════════════════ GLADIATOR GUS ════════════════════════════
// Strapped in for battle: a gladiator sandal on a sun-browned foot, broad leather straps wound up to the ankle, a
// centre thong from the toe post, brass studs where they cross, and a bronze guard on the instep. In play the strap
// tails at his ankle sway, his brass glints and he stamps up dust.

const GUS_TAILS: [number, number][] = [
  [CX - 58, 4],
  [CX + 60, 6],
];

function gusTail(g: Ctx, leather: string, side: number): void {
  const [x, y] = GUS_TAILS[side < 0 ? 0 : 1];
  const path = (c: Ctx) => {
    c.beginPath();
    c.moveTo(x - 6, y);
    c.bezierCurveTo(x - 4 + side * 10, y + 20, x + side * 16, y + 40, x + side * 12, y + 60);
    c.lineTo(x + side * 12 + 9, y + 64);
    c.bezierCurveTo(x + side * 20 + 6, y + 40, x + 8 + side * 6, y + 20, x + 6, y);
    c.closePath();
  };
  contact(g, (c) => {
    path(c);
    c.fill();
  }, 0.45, 2.5, 3);
  const lg = g.createLinearGradient(x - 10, 0, x + 14, 0);
  lg.addColorStop(0, shade(leather, 0.25));
  lg.addColorStop(1, shade(leather, -0.35));
  g.fillStyle = lg;
  path(g);
  g.fill();
  clipTo(g, path, () => texture(g, 'leather', { x: x - 30, y, w: 60, h: 70 }, 0.4, 1.2));
  g.strokeStyle = inkOf(leather);
  g.lineWidth = 2.4;
  path(g);
  g.stroke();
  rivet(g, x + side * 12 + 4, y + 52, 3.2, '#d9a441');
}

registerStyle('gus', {
  contactY: 266,
  halfWidth: 108,
  rig: BARE_RIG,
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 24 },
  parts: {
    tailL: { box: { x: GUS_TAILS[0][0] - 40, y: GUS_TAILS[0][1] - 4, w: 70, h: 80 }, frames: 1, pivot: GUS_TAILS[0], draw: (g, art) => gusTail(g, art.primary ?? '#7a4a22', -1) },
    tailR: { box: { x: GUS_TAILS[1][0] - 30, y: GUS_TAILS[1][1] - 4, w: 70, h: 80 }, frames: 1, pivot: GUS_TAILS[1], draw: (g, art) => gusTail(g, art.primary ?? '#7a4a22', 1) },
  },
  draw(ctx, art, p, o) {
    const leather = art.primary ?? '#7a4a22';
    const brass = art.secondary ?? '#d9a441';
    const f = paintBare(ctx, { skin: art.skin, pores: 0.24, shadowTint: '#6a1a10' }, p);
    const g = f.sil.g;
    extendSil(f.sil, [sandalSole]);
    paintSoleUnder(g, f.sil.parts, sandalSole, mix(leather, '#c8905a', 0.35), shade(leather, -0.35), inkOf(art.skin), { tex: 'leather', thick: 11, stitch: rgba('#f0d8a0', 0.7) });
    // the straps: wound round the foot, each hugging its curve
    const bands: [number, number, number][] = [[6, 0, 13], [40, 8, 14], [76, 12, 15], [112, 14, 15], [150, 10, 15]];
    for (const [y, sag, w] of bands) {
      const hw = 60 + y * 0.32;
      strap(g, curve(CX - hw - 8, y + 6, CX, y + sag + 10, CX + hw + 8, y + 2), w, leather, { stitch: rgba('#f0d8a0', 0.55), gloss: 0.2 });
    }
    // the centre thong from the toe post up to the ankle
    const cl = cleft(f.toes[3], f.toes[4]);
    const thong = curve(cl[0] - 2, cl[1] - 6, CX + 24, 120, CX + 4, -6, 18);
    strap(g, thong, 12, shade(leather, -0.08), { stitch: rgba('#f0d8a0', 0.55), gloss: 0.3 });
    // brass studs where the thong crosses the bands
    for (const [y, sag] of bands) {
      const yy = y + sag + 8;
      let best = thong[0];
      for (const q of thong) if (Math.abs(q[1] - yy) < Math.abs(best[1] - yy)) best = q;
      rivet(g, best[0], best[1], 4.6, brass);
    }
    // a bronze guard on the instep: a small embossed disc
    const [gx, gy] = [CX + 10, 92];
    contact(g, (c) => {
      c.beginPath();
      c.arc(gx, gy, 16, 0, Math.PI * 2);
      c.fill();
    }, 0.5, 2.5, 3);
    const dg = g.createRadialGradient(gx - 6, gy - 6, 2, gx, gy, 17);
    dg.addColorStop(0, shade(brass, 0.55));
    dg.addColorStop(0.5, brass);
    dg.addColorStop(1, shade(brass, -0.55));
    g.fillStyle = dg;
    g.beginPath();
    g.arc(gx, gy, 16, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = rgba(shade(brass, -0.6), 0.6);
    g.lineWidth = 1.4;
    g.beginPath();
    g.arc(gx, gy, 11, 0, Math.PI * 2);
    g.stroke();
    label(g, 'G', gx, gy + 1, 13, rgba(shade(brass, -0.6), 0.75));
    spec(g, gx - 6, gy - 7, 6, 3, 0.85, -0.6);
    glint(g, gx - 7, gy - 7, 4, 0.9);
    f.sil.edge(rgba(LIGHT.rim, 0.45), 2.5, LX * 3, LY * 3);
    f.sil.finish(inkOf(art.skin), { openTop: f.top + 1.5 });
    if (!o.live) {
      gusTail(ctx, leather, -1);
      gusTail(ctx, leather, 1);
    }
  },
});

