// Art for Kronos the Titan King's fight (src/game/bosses/titanking.ts), in the style of his redrawn foot
// (src/content/style/acts-f-3.ts): the same weathered titan stone, the same magma gashes and the same forged iron.
// - (His Titan HEAD for DEVOUR is painted live, src/content/art/titanHead.ts; tk_bighead here is its phase-card still.)
// - A ROCK that breaks off the walls of Tartarus (three textures: whole, cracked, splitting).
// - The WEAK LINK on each chain he pulls: an oversized forged link glowing from within, its cracks growing (four
//   stages).
// - The BLADE that ends each broken chain: a heavy iron spike on a link.
// - The FORCEFIELD he raises once his chains are broken: a shimmering shell of golden time-light with a lattice of
//   hours.
// - The chain links themselves (face-on and edge-on), baked from the foot's own link painter, for the chains the
//   fight draws.
// Drawn lazily the first time the fight needs them (they're big): titanFightArt() lists the painters.

import { type PathFn, LIGHT, crease, texture } from '../../art/style/kit';
import { Sil } from '../../art/style/sil';
import { blotches, rivet } from '../../art/style/details';
import { glowDot, lightAll, lin, rad } from '../../art/style/kit-bosses';
import { type Ctx, hashStr, makeCanvas, mix, rgba, rng } from '../../art/util';
import { LINK_LEN, SKY_LINK_K, ironLink } from '../style/acts-f-3';
import { type Pt, metal, partSil, smooth } from '../style/acts-f-kit';
import { headCard } from './titanHead';

const [LX, LY] = LIGHT.dir;

/** Textures are drawn this many px per design unit (shown at 1 / RES of that in play, see TF). */
const RES = 2.4;

/** Sizes the fight needs: design-unit frames and how big each shows in world px. */
export const TF = {
  rock: { w: 120, h: 110, px: 1.25 },
  weak: { w: 70, h: 70, px: 2.4 },
  blade: { w: 80, h: 190, px: 1.25 },
  dome: { w: 300, h: 300, px: 2.2 },
  RES,
};

/** A canvas in design units at RES px per unit. */
function stage(w: number, h: number, res = RES): [HTMLCanvasElement, Ctx] {
  const [c, g] = makeCanvas(w * res, h * res);
  g.scale(res, res);
  return [c, g];
}

// ——— the rock ———

/** A slab of Tartarus basalt torn out of the wall, split by `stage` (0…2) cracks glowing with magma. */
function rock(stageN: number): () => HTMLCanvasElement {
  return () => {
    const T = TF.rock;
    const [c, g0] = stage(T.w, T.h);
    const r = rng(hashStr('tf-rock'));
    const pts: Pt[] = [];
    const n = 11;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = 40 + r() * 12;
      pts.push([60 + Math.cos(a) * rr * 1.08, 56 + Math.sin(a) * rr * 0.92]);
    }
    const body: PathFn = (q) => {
      q.beginPath();
      pts.forEach(([x, y], i) => (i ? q.lineTo(x, y) : q.moveTo(x, y)));
      q.closePath();
    };
    const box = { x: 4, y: 4, w: 112, h: 104 };
    const s = new Sil(g0, [body], box);
    const g = s.g;
    s.form({ base: '#5a5258', shadowTint: '#140c18', ramp: 0.85, form: 0.7, formSize: 26, bevel: 0.5, rim: 0.45 });
    texture(g, 'stone', box, 0.55, 1.1);
    blotches(g, box, '#2a2228', 0.5, 12, 0.55, 0.15, 710);
    // facets: the planes it split along
    for (const [x0, y0, x1, y1] of [[30, 30, 70, 56], [70, 56, 96, 40], [70, 56, 64, 96], [38, 74, 70, 56]] as const)
      crease(g, (q) => {
        q.moveTo(x0, y0);
        q.lineTo(x1, y1);
      }, 1.4, '#06060c', 0.45, 0.4);
    // the cracks that will split it
    const cracks: Pt[][] = [
      [[60, 14], [56, 34], [64, 52], [58, 72], [62, 98]],
      [[16, 50], [36, 56], [56, 54], [80, 62], [104, 58]],
    ];
    for (let k = 0; k < Math.min(stageN, cracks.length); k++) {
      const run = (q: Ctx) => cracks[k].forEach(([x, y], i) => (i ? q.lineTo(x, y) : q.moveTo(x, y)));
      g.save();
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.beginPath();
      run(g);
      g.strokeStyle = '#0a0406';
      g.lineWidth = 5;
      g.stroke();
      g.beginPath();
      run(g);
      g.strokeStyle = '#ff7a1a';
      g.lineWidth = 2.2;
      g.stroke();
      g.beginPath();
      run(g);
      g.strokeStyle = '#ffe08a';
      g.lineWidth = 0.8;
      g.stroke();
      g.restore();
    }
    lightAll(s, 0.45, 18, 0.5);
    s.finish('#120a10', { w: 4 });
    if (stageN > 0) {
      g0.save();
      g0.globalCompositeOperation = 'lighter';
      glowDot(g0, 60, 56, 26 + stageN * 8, '#ff6a1a', 0.25 * stageN);
      g0.restore();
    }
    return c;
  };
}

// ——— the weak link ———

/** The weak point on a chain he pulls: an oversized face-on link, glowing from within where it has been forged
 * thin, cracking as it's hit (stage 0…3). */
function weakLink(stageN: number): () => HTMLCanvasElement {
  return () => {
    const T = TF.weak;
    const [c, g] = stage(T.w, T.h);
    const k = 3.1;
    // heat bloom behind it
    g.save();
    g.globalCompositeOperation = 'lighter';
    glowDot(g, 35, 35, 30, '#ff5a14', 0.35 + stageN * 0.12);
    g.restore();
    g.save();
    g.translate(35, 35);
    g.scale(k, k);
    ironLink(g, 0, 0, -Math.PI / 2, true, Math.PI / 2);
    g.restore();
    // the forged-thin waist glowing red-hot, hotter as it cracks
    const L = (LINK_LEN / 2) * k;
    const H = L * 0.62;
    g.save();
    g.lineCap = 'round';
    g.globalCompositeOperation = 'lighter';
    for (const sy of [-1, 1]) {
      const y = 35;
      const x = 35 + sy * H * 0.9;
      g.strokeStyle = rgba('#ff4a10', 0.55 + stageN * 0.1);
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(x, y - 9);
      g.lineTo(x, y + 9);
      g.stroke();
      g.strokeStyle = rgba('#ffd27a', 0.5 + stageN * 0.12);
      g.lineWidth = 2.4;
      g.stroke();
    }
    g.restore();
    // the whole link glows from within, hotter as it cracks
    g.save();
    g.globalCompositeOperation = 'lighter';
    glowDot(g, 35, 35, 22, '#ff6a1a', 0.22 + stageN * 0.1);
    g.restore();
    // cracks, more each stage
    const r = rng(hashStr('tf-weak'));
    const paths: Pt[][] = [];
    for (let i = 0; i < 9; i++) {
      const side = i % 2 ? 1 : -1;
      const x0 = 35 + side * H * 0.9;
      const y0 = 35 + (r() - 0.5) * 22;
      const pts: Pt[] = [[x0, y0]];
      let x = x0;
      let y = y0;
      let a = (side > 0 ? 0 : Math.PI) + (r() - 0.5) * 2.4;
      for (let d = 0; d < 8 + r() * 10; d += 3) {
        a += (r() - 0.5) * 1;
        x += Math.cos(a) * 3;
        y += Math.sin(a) * 3;
        pts.push([x, y]);
      }
      paths.push(pts);
    }
    const shown = [0, 3, 6, 9][stageN];
    for (const pts of paths.slice(0, shown)) {
      const run = (q: Ctx) => pts.forEach(([x, y], i) => (i ? q.lineTo(x, y) : q.moveTo(x, y)));
      g.save();
      g.lineCap = 'round';
      g.beginPath();
      run(g);
      g.strokeStyle = '#08060a';
      g.lineWidth = 2.6;
      g.stroke();
      g.beginPath();
      run(g);
      g.strokeStyle = '#ffb040';
      g.lineWidth = 1;
      g.stroke();
      g.restore();
    }
    return c;
  };
}

// ——— the blade ———

/** The end of a broken chain: a heavy forged spike on a ring, edges ground bright, its point still hot. */
function blade(): HTMLCanvasElement {
  const T = TF.blade;
  const [c, g0] = stage(T.w, T.h);
  // the link it hangs from (at the top), lying along the chain
  g0.save();
  g0.translate(40, 14);
  g0.scale(SKY_LINK_K * 0.95, SKY_LINK_K * 0.95);
  ironLink(g0, 0, 0, Math.PI / 2, true, Math.PI / 2);
  g0.restore();
  const body: PathFn = smooth([[40, 26], [56, 40], [62, 70], [54, 118], [40, 186], [26, 118], [18, 70], [24, 40]], true, 0.35);
  const collar: PathFn = (q) => {
    q.beginPath();
    q.roundRect(20, 28, 40, 16, 5);
  };
  const box = { x: 14, y: 24, w: 52, h: 164 };
  partSil(g0, [body, collar], box, (pg) => {
    // forged iron, darker in the fuller, edges ground bright
    pg.fillStyle = lin(pg, 18, 0, 62, 0, [
      [0, '#a8acb6'],
      [0.2, '#6a6e78'],
      [0.5, '#2a2c32'],
      [0.8, '#4a4e58'],
      [1, '#1a1b20'],
    ]);
    pg.fillRect(box.x, box.y, box.w, box.h);
    texture(pg, 'brushed', box, 0.25);
    // the fuller down its spine
    pg.strokeStyle = rgba('#0a0a0e', 0.6);
    pg.lineWidth = 4;
    pg.beginPath();
    pg.moveTo(40, 50);
    pg.lineTo(40, 150);
    pg.stroke();
    pg.strokeStyle = rgba('#c8ccd6', 0.35);
    pg.lineWidth = 1.2;
    pg.beginPath();
    pg.moveTo(38.4, 52);
    pg.lineTo(38.4, 148);
    pg.stroke();
    // the hot point
    pg.fillStyle = lin(pg, 0, 120, 0, 188, [
      [0, rgba('#ff3a0a', 0)],
      [0.6, rgba('#ff6a1a', 0.75)],
      [1, rgba('#ffe08a', 1)],
    ]);
    pg.fillRect(box.x, 118, box.w, 72);
    metal(pg, collar, { x: 20, y: 28, w: 40, h: 16 }, '#8a8e98', { vertical: true, shadow: 0.4 });
    rivet(pg, 30, 36, 2.4, '#c8ccd6');
    rivet(pg, 50, 36, 2.4, '#c8ccd6');
  }, '#0a0a0e', { w: 3.4 });
  // the ground edges catch the light
  g0.save();
  g0.strokeStyle = rgba('#f0f4ff', 0.8);
  g0.lineWidth = 1.2;
  g0.beginPath();
  g0.moveTo(22, 70);
  g0.quadraticCurveTo(26, 120, 39, 182);
  g0.stroke();
  g0.globalCompositeOperation = 'lighter';
  glowDot(g0, 40, 178, 16, '#ff7a1a', 0.6);
  g0.restore();
  return c;
}

// ——— the forcefield ———

/** A shell of golden time-light: clear at the middle, bright at the rim, a lattice of hour-marks over it and a
 * sheen on its top left. Drawn to be shown additively. */
function dome(): HTMLCanvasElement {
  const T = TF.dome;
  const [c, g] = stage(T.w, T.h, 1.8);
  const R = 140;
  const cx = 150;
  const cy = 150;
  g.save();
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = rad(g, cx, cy, R * 0.2, cx, cy, R, [
    [0, rgba('#ffb040', 0.0)],
    [0.65, rgba('#ffb040', 0.05)],
    [0.9, rgba('#ffd27a', 0.38)],
    [1, rgba('#fff0c0', 0.8)],
  ]);
  g.fillRect(0, 0, T.w, T.h);
  // a lattice of hexagons, brighter towards the rim
  const hex = 16;
  for (let row = -1; row < 12; row++)
    for (let col = -1; col < 12; col++) {
      const x = 10 + col * hex * 1.5;
      const y = 10 + row * hex * 1.732 + (col % 2 ? hex * 0.866 : 0);
      const d = Math.hypot(x - cx, y - cy) / R;
      if (d > 1.05) continue;
      g.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const px = x + Math.cos(a) * hex * 0.92;
        const py = y + Math.sin(a) * hex * 0.92;
        if (k) g.lineTo(px, py);
        else g.moveTo(px, py);
      }
      g.closePath();
      g.strokeStyle = rgba('#ffe0a0', 0.06 + d * d * 0.5);
      g.lineWidth = 1.6;
      g.stroke();
    }
  // the twelve hours round the shell
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x = cx + Math.cos(a) * R * 0.86;
    const y = cy + Math.sin(a) * R * 0.86;
    g.save();
    g.translate(x, y);
    g.rotate(a + Math.PI / 2);
    g.fillStyle = rgba('#fff4d0', 0.55);
    g.beginPath();
    g.moveTo(-5, -7);
    g.lineTo(5, -7);
    g.lineTo(0, 0);
    g.lineTo(5, 7);
    g.lineTo(-5, 7);
    g.lineTo(0, 0);
    g.closePath();
    g.fill();
    g.restore();
  }
  // the sheen
  g.beginPath();
  g.ellipse(cx + LX * R * 0.5, cy + LY * R * 0.5, R * 0.42, R * 0.16, -0.7, 0, Math.PI * 2);
  g.fillStyle = rgba('#ffffff', 0.18);
  g.fill();
  g.restore();
  g.beginPath();
  g.arc(cx, cy, R - 1, 0, Math.PI * 2);
  g.strokeStyle = rgba('#fff6dc', 0.9);
  g.lineWidth = 2.4;
  g.stroke();
  return c;
}

// ——— chain links ———

/** One sky-chain link (face-on or edge-on) lying along +x, the same make as the live sky chains. */
function link(face: boolean): () => HTMLCanvasElement {
  return () => {
    const pad = (LINK_LEN * SKY_LINK_K) / 2 + 6;
    const [c, g] = stage(pad * 2, pad * 2, 2);
    g.translate(pad, pad);
    g.scale(SKY_LINK_K, SKY_LINK_K);
    ironLink(g, 0, 0, 0, face, Math.PI / 2);
    return c;
  };
}

/** A pale shard of the forcefield (it shatters when a blade goes through). */
function domeShard(): HTMLCanvasElement {
  const [c, g] = makeCanvas(40, 40);
  g.beginPath();
  g.moveTo(4, 30);
  g.lineTo(20, 4);
  g.lineTo(36, 22);
  g.lineTo(18, 36);
  g.closePath();
  g.fillStyle = rgba('#ffe8b0', 0.75);
  g.fill();
  g.strokeStyle = rgba(mix('#ffd27a', '#ffffff', 0.5), 1);
  g.lineWidth = 2;
  g.stroke();
  return c;
}

/** Link px per design unit at RES 2 (the fight scales links by the foot's own size: see LINK_RES). */
export const LINK_RES = 2;

/** The fight's textures and their painters (drawn when first needed). */
export function titanFightArt(): Record<string, () => HTMLCanvasElement> {
  return {
    tk_rock0: rock(0),
    tk_rock1: rock(1),
    tk_rock2: rock(2),
    tk_weak0: weakLink(0),
    tk_weak1: weakLink(1),
    tk_weak2: weakLink(2),
    tk_weak3: weakLink(3),
    tk_blade: blade,
    tk_dome: dome,
    tk_domeshard: domeShard,
    tk_linkF: link(true),
    tk_linkE: link(false),
    // (the Titan head itself is painted live each frame, src/content/art/titanHead.ts: this is its phase-card still)
    tk_bighead: headCard,
  };
}
