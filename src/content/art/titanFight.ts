// Art for Kronos the Titan King's fight (src/game/bosses/titanking.ts), in the style of his redrawn foot
// (src/content/style/acts-f-3.ts): the same weathered titan stone, the same magma gashes and the same forged iron.
// - His HEAD (DEVOUR): a colossal carved stone head that rises behind a pizza: a broken bronze crown, a heavy scowling
//   brow over sockets with molten eyes, a broad nose, a carved moustache over square teeth, magma split across the
//   brow and cheek. Its lower JAW is a separate texture (it chews): lower teeth, a square chin and a carved beard.
// - A ROCK that breaks off the walls of Tartarus (three textures: whole, cracked, splitting).
// - The WEAK LINK on each chain he pulls: an oversized forged link glowing from within, its cracks growing (four
//   stages).
// - The BLADE that ends each broken chain: a heavy iron spike on a link.
// - The FORCEFIELD he raises once his chains are broken: a shimmering shell of golden time-light with a lattice of
//   hours.
// - The chain links themselves (face-on and edge-on), baked from the foot's own link painter, for the chains the
//   fight draws.
// Drawn lazily the first time the fight needs them (they're big): titanFightArt() lists the painters.

import { type Box, type PathFn, LIGHT, ao, crease, inkOf, softFill, spec, texture } from '../../art/style/kit';
import { Sil } from '../../art/style/sil';
import { blotches, rivet } from '../../art/style/details';
import { MATS_F } from '../../art/style/materials-acts-f';
import { clip, glowDot, lightAll, lin, rad } from '../../art/style/kit-bosses';
import { type Ctx, hashStr, makeCanvas, mix, rgba, rng, shade } from '../../art/util';
import { LINK_LEN, SKY_LINK_K, ironLink, paintCut, paintCutGlow, titanCut } from '../style/acts-f-3';
import { type Pt, lifted, metal, partSil, smooth } from '../style/acts-f-kit';

const [LX, LY] = LIGHT.dir;
const STONE = '#8e8a84';
const DARK = '#5c5852';
const BRONZE = '#c9873a';
const INK = inkOf(STONE);

/** Textures are drawn this many px per design unit (shown at 1 / RES of that in play, see TF). */
const RES = 2.4;

/** Sizes the fight needs: design-unit frames and how big each shows in world px. */
export const TF = {
  /** The head: 300 × 280 design units, its upper teeth's bottom edge at y 262 (the jaw closes onto it). */
  head: { w: 300, h: 280, mouthY: 262, px: 1.75 },
  /** The jaw: 300 × 190, its lower teeth at the top (y 4…30), hinged at (150, 20). */
  jaw: { w: 300, h: 190, hingeY: 20, px: 1.75 },
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

/** Weathered titan stone on a silhouette's layer: the foot's own recipe (re-lit, pitted, grimy, mossy, chiselled). */
function stoneSkin(s: Sil, box: Box, seed: number, base = STONE): void {
  const g = s.g;
  s.form({ base, shadowTint: MATS_F.rock.shadowTint, ramp: 0.75, form: 0.6, formSize: 34, bevel: 0.4, rim: 0.45 });
  texture(g, 'stone', box, 0.4, 1.4);
  texture(g, 'cast', box, 0.2, 1, 'soft-light');
  blotches(g, box, shade(DARK, -0.2), 0.45, 26, 0.55, 0.15, seed);
  blotches(g, box, '#c8c0a0', 0.25, 5, 0.75, 0.05, seed + 1);
  const r = rng(hashStr(`tf-chisel-${seed}`));
  for (let i = 0; i < 22; i++) {
    const x = box.x + 10 + r() * (box.w - 20);
    const y = box.y + 10 + r() * (box.h - 20);
    crease(g, (c) => {
      c.moveTo(x, y);
      c.lineTo(x + 4 + r() * 4, y + 1 + r() * 2);
    }, 1, '#10121c', 0.25, 0.25);
  }
}

/** Hairline cracks running over stone, from a point (some still glowing near their roots). */
function hairline(g: Ctx, x0: number, y0: number, ang: number, len: number, seed: number, hot = true): void {
  const r = rng(hashStr(`tf-hair-${seed}`));
  const pts: Pt[] = [[x0, y0]];
  let x = x0;
  let y = y0;
  let a = ang;
  for (let d = 0; d < len; d += 4) {
    a += (r() - 0.5) * 0.9;
    x += Math.cos(a) * 4;
    y += Math.sin(a) * 4;
    pts.push([x, y]);
  }
  const run = (q: Ctx) => pts.forEach(([px, py], k) => (k ? q.lineTo(px, py) : q.moveTo(px, py)));
  crease(g, run, 1.2, '#050203', 0.65, 0.25);
  if (!hot) return;
  g.save();
  g.lineCap = 'round';
  g.beginPath();
  pts.slice(0, Math.ceil(pts.length / 2)).forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py)));
  g.strokeStyle = rgba('#ff8a2a', 0.7);
  g.lineWidth = 0.7;
  g.stroke();
  g.restore();
}

/** A molten eye in a deep socket: a dark hollow under the brow, an ember iris, a white-hot slit. */
function moltenEye(g: Ctx, x: number, y: number, s: number, slant: number): void {
  softFill(g, (c) => {
    c.beginPath();
    c.ellipse(x, y + 2, 36, 20, slant, 0, Math.PI * 2);
  }, rgba('#050204', 0.9), 5);
  g.save();
  g.translate(x, y);
  g.rotate(slant);
  g.beginPath();
  g.ellipse(0, 0, 21, 10, 0, 0, Math.PI * 2);
  g.fillStyle = rad(g, 0, 0, 1, 0, 0, 21, [
    [0, '#ffe8a0'],
    [0.35, '#ffa02a'],
    [0.75, '#c8300a'],
    [1, '#3a0804'],
  ]);
  g.fill();
  // the slit pupil burns hottest
  g.beginPath();
  g.ellipse(s * 2, 0.5, 3, 7.5, 0, 0, Math.PI * 2);
  g.fillStyle = '#fff8d8';
  g.fill();
  // the brow's shadow falls across the top of the eye
  g.beginPath();
  g.ellipse(0, -8, 26, 7, 0, 0, Math.PI * 2);
  g.fillStyle = rgba('#14060a', 0.75);
  g.fill();
  g.restore();
}

/** A row of square stone teeth (upper hang down from y0, lower stand up from y0), chipped and stained. */
function teeth(g: Ctx, xs: number[], y0: number, h: number, down: boolean, seed: number): void {
  const r = rng(hashStr(`tf-teeth-${seed}`));
  const parts: PathFn[] = xs.map((x, i) => {
    const w = 15 + r() * 4 - Math.abs(i - (xs.length - 1) / 2) * 0.8;
    const th = h * (0.85 + r() * 0.2);
    return (c: Ctx) => {
      c.beginPath();
      if (down) c.roundRect(x - w / 2, y0 - 6, w, th + 6, [2, 2, 5, 5]);
      else c.roundRect(x - w / 2, y0 - th, w, th + 6, [5, 5, 2, 2]);
    };
  });
  const top = down ? y0 - 6 : y0 - h * 1.1;
  const box = { x: xs[0] - 14, y: top, w: xs[xs.length - 1] - xs[0] + 28, h: h * 1.1 + 6 };
  partSil(g, parts, box, (pg, s) => {
    s.form({ base: '#bcac8c', shadowTint: '#3a2a20', ramp: 0.6, form: 0.4, formSize: 8, bevel: 0.35, rim: 0.3 });
    texture(pg, 'stone', box, 0.3, 1.6);
    blotches(pg, box, '#5a4a2a', 0.5, 6, 0.6, 0.1, 680 + seed);
    // gaps between them
    for (const x of xs.slice(1).map((x, i) => (x + xs[i]) / 2)) crease(pg, (c) => {
      c.moveTo(x, box.y);
      c.lineTo(x, box.y + box.h);
    }, 1.4, '#140a06', 0.7, 0.2);
  }, '#1a0e08', { w: 2.6 });
}

// ——— the head ———

const BROW: Pt[] = [[24, 108], [72, 94], [124, 116], [150, 134], [176, 116], [228, 94], [276, 108]];

function headPath(): PathFn {
  return smooth([
    [150, 12], [204, 18], [244, 42], [266, 82], [274, 124], [268, 168], [256, 208], [238, 240], [212, 258], [150, 264],
    [88, 258], [62, 240], [44, 208], [32, 168], [26, 124], [34, 82], [56, 42], [96, 18],
  ]);
}

/** The brow ridge: a heavy shelf of stone pressed down into a scowl (a V at the nose). */
function browPath(): PathFn {
  const top = BROW.map(([x, y]) => [x, y - 15 + Math.abs(x - 150) * 0.03] as Pt);
  const bot = BROW.slice().reverse().map(([x, y]) => [x, y + 20 - Math.abs(x - 150) * 0.05] as Pt);
  return smooth([...top, ...bot]);
}

const NOSE = smooth([[142, 136], [158, 136], [164, 172], [178, 196], [168, 210], [150, 206], [132, 210], [122, 196], [136, 172]]);
const moustache = (s: number): PathFn =>
  smooth([[150, 212], [150 + s * 36, 214], [150 + s * 70, 226], [150 + s * 92, 248], [150 + s * 88, 256], [150 + s * 62, 240], [150 + s * 30, 232], [150, 230]]);

/** The bronze crown: a band round the brow with five points (two snapped off). */
function crownParts(): PathFn[] {
  const band: PathFn = (c) => {
    c.beginPath();
    c.moveTo(46, 66);
    c.quadraticCurveTo(150, 30, 254, 66);
    c.lineTo(258, 88);
    c.quadraticCurveTo(150, 54, 42, 88);
    c.closePath();
  };
  const spikes: [number, number, boolean][] = [[78, 42, true], [114, 30, false], [150, 26, true], [186, 30, true], [222, 42, false]];
  const parts = [band];
  for (const [x, top, whole] of spikes) {
    const base = 61 - Math.abs(x - 150) * 0.14 - (Math.abs(x - 150) < 10 ? 18 : 15);
    const h = whole ? (x === 150 ? 44 : 34) : 14;
    parts.push((c) => {
      c.beginPath();
      c.moveTo(x - 11, base + 10);
      if (whole) c.lineTo(x, base - h);
      else {
        // snapped: a jagged stump
        c.lineTo(x - 7, base - h);
        c.lineTo(x - 2, base - h + 5);
        c.lineTo(x + 3, base - h - 2);
        c.lineTo(x + 8, base - h + 3);
      }
      c.lineTo(x + 11, base + 10);
      c.closePath();
    });
    void top;
  }
  return parts;
}

const HEAD_CUTS = [
  titanCut([[88, 70], [116, 80], [142, 78], [168, 90]], 6.5, 21),
  titanCut([[50, 162], [66, 178], [80, 200], [86, 224]], 6, 22),
  titanCut([[214, 150], [232, 158], [250, 156]], 5, 23),
];

function head(): HTMLCanvasElement {
  const T = TF.head;
  const [c, g0] = stage(T.w, T.h);
  const box = { x: 20, y: 8, w: 260, h: 262 };
  const s = new Sil(g0, [headPath()], box);
  const g = s.g;
  stoneSkin(s, box, 690);
  // moss in the hollows under the cheekbones and round the temples
  blotches(g, { x: box.x, y: 150, w: box.w, h: 100 }, '#5a7a3a', 0.5, 14, 0.66, 0.08, 693);
  // the temples sink in under the crown; the cheeks fall into shadow under the cheekbones
  for (const sx of [-1, 1]) {
    ao(g, 150 + sx * 104, 92, 22, 36, 0.4, sx * 0.2);
    ao(g, 150 + sx * 70, 214, 34, 18, 0.45, sx * -0.3);
    spec(g, 150 + sx * 82, 188, 26, 9, 0.22, sx * -0.2, LIGHT.key);
  }
  // the gashes, magma inside
  for (const cut of HEAD_CUTS) paintCut(g, cut);
  // the sockets and the molten eyes under the brow
  moltenEye(g, 100, 150, 1, 0.22);
  moltenEye(g, 200, 150, -1, -0.22);
  // the nose: a broad block of stone, its bridge lit, nostrils dark
  lifted(g, NOSE, lin(g, 126, 132, 176, 214, [
    [0, shade(STONE, 0.24)],
    [0.5, STONE],
    [1, shade(STONE, -0.4)],
  ]), 0.55, 4, 5);
  clip(g, NOSE, () => texture(g, 'stone', { x: 112, y: 128, w: 76, h: 90 }, 0.4, 1.4));
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.ellipse(150 + sx * 13, 205, 6, 3, sx * 0.35, 0, Math.PI * 2);
    g.fillStyle = rgba('#0a0406', 0.8);
    g.fill();
  }
  spec(g, 146, 156, 5, 18, 0.35, 0.05, LIGHT.key);
  // furrows from the nose to the mouth, and across the brow above the ridge
  for (const sx of [-1, 1]) {
    crease(g, (q) => {
      q.moveTo(150 + sx * 34, 196);
      q.quadraticCurveTo(150 + sx * 56, 214, 150 + sx * 70, 240);
    }, 2.6, '#06060c', 0.65, 0.35);
    crease(g, (q) => {
      q.moveTo(150 + sx * 18, 102);
      q.quadraticCurveTo(150 + sx * 40, 94, 150 + sx * 62, 98);
    }, 1.6, '#06060c', 0.5, 0.3);
  }
  // the brow: a heavy overhang casting its shadow down over the sockets
  const brow = browPath();
  softFill(g, (q) => {
    q.save();
    q.translate(0, 10);
    brow(q);
    q.restore();
  }, rgba('#0a0406', 0.75), 6);
  lifted(g, brow, lin(g, 0, 86, 0, 140, [
    [0, shade(STONE, 0.3)],
    [0.45, shade(STONE, 0.05)],
    [1, shade(STONE, -0.45)],
  ]), 0.6, 5, 6);
  clip(g, brow, () => {
    texture(g, 'stone', { x: 20, y: 80, w: 260, h: 70 }, 0.5, 1.3);
    blotches(g, { x: 20, y: 80, w: 260, h: 70 }, shade(DARK, -0.25), 0.4, 10, 0.55, 0.12, 694);
    // its underside falls away into the sockets' dark
    g.save();
    g.translate(0, 9);
    brow(g);
    g.restore();
    g.fillStyle = rgba('#0a0608', 0.55);
    g.fill();
  });
  // a hard lit edge along its top
  g.save();
  g.lineCap = 'round';
  g.beginPath();
  BROW.forEach(([x, y], i) => (i ? g.lineTo(x, y - 13 + Math.abs(x - 150) * 0.03) : g.moveTo(x, y - 13 + Math.abs(x - 150) * 0.03)));
  g.strokeStyle = rgba(LIGHT.key, 0.45);
  g.lineWidth = 2.2;
  g.stroke();
  g.restore();
  // the knotted scowl between the brows
  for (const sx of [-1, 1])
    crease(g, (q) => {
      q.moveTo(150 + sx * 4, 116);
      q.lineTo(150 + sx * 10, 132);
    }, 2.2, '#06060c', 0.7, 0.3);
  // the carved moustache over the teeth
  for (const sx of [-1, 1]) {
    const m = moustache(sx);
    lifted(g, m, lin(g, 150, 210, 150 + sx * 90, 256, [
      [0, shade(STONE, -0.05)],
      [1, shade(STONE, -0.45)],
    ]), 0.55, 3, 4);
    clip(g, m, () => {
      texture(g, 'stone', { x: 50, y: 200, w: 200, h: 62 }, 0.45, 1.6);
      for (let i = 0; i < 5; i++)
        crease(g, (q) => {
          q.moveTo(150 + sx * (8 + i * 6), 218 + i);
          q.quadraticCurveTo(150 + sx * (40 + i * 8), 226 + i * 2, 150 + sx * (68 + i * 4), 246);
        }, 1.2, '#06060c', 0.45, 0.25);
    });
  }
  // the dark of the mouth behind the teeth
  softFill(g, (q) => {
    q.beginPath();
    q.ellipse(150, 258, 74, 9, 0, 0, Math.PI * 2);
  }, rgba('#0a0406', 0.9), 3);
  // weathering: hairline cracks, some still glowing
  hairline(g, 120, 60, -2.4, 28, 1);
  hairline(g, 236, 196, 1.9, 26, 2);
  hairline(g, 70, 120, 2.6, 20, 3, false);
  hairline(g, 190, 236, 0.4, 18, 4, false);
  lightAll(s, 0.4, 24, 0.45);
  s.finish(INK, { w: 4.5 });
  // the upper teeth hang from the lip, under the moustache
  teeth(g0, [104, 121, 138, 154, 170, 187, 204].map((x) => x - 4), 252, 20, true, 1);
  // the crown, over it all
  const crown = crownParts();
  const cbox = { x: 40, y: -4, w: 220, h: 96 };
  partSil(g0, crown, cbox, (pg) => {
    metal(pg, (q) => {
      q.beginPath();
      q.rect(cbox.x, cbox.y, cbox.w, cbox.h);
    }, cbox, BRONZE, { vertical: true, shadow: 0 });
    texture(pg, 'cast', cbox, 0.35);
    blotches(pg, cbox, '#3a9a7a', 0.5, 8, 0.66, 0.08, 695);
    // a Greek key round the band
    pg.strokeStyle = rgba('#3a1a04', 0.75);
    pg.lineWidth = 2;
    pg.beginPath();
    for (let x = 54; x < 244; x += 14) {
      const y = 80 - Math.sin(((x - 46) / 208) * Math.PI) * 17;
      pg.moveTo(x, y);
      pg.lineTo(x, y - 9);
      pg.lineTo(x + 10, y - 9);
      pg.lineTo(x + 10, y - 4);
      pg.lineTo(x + 5, y - 4);
    }
    pg.stroke();
    for (const x of [86, 150, 214]) rivet(pg, x, 74 - Math.sin(((x - 46) / 208) * Math.PI) * 17, 3, '#e8c870');
  }, '#2a1404', { w: 3.4 });
  // the light the eyes and gashes throw
  g0.save();
  g0.globalCompositeOperation = 'lighter';
  for (const [x, y] of [[100, 150], [200, 150]]) glowDot(g0, x, y, 30, '#ff7a1a', 0.55);
  for (const cut of HEAD_CUTS) paintCutGlow(g0, cut, 0.55);
  g0.restore();
  return c;
}

// ——— the jaw ———

function jawPath(): PathFn {
  return smooth([
    [62, 22], [150, 30], [238, 22], [254, 44], [250, 80], [230, 108], [196, 126], [150, 132], [104, 126], [70, 108], [50, 80], [46, 44],
  ]);
}

function beardParts(): PathFn[] {
  const out: PathFn[] = [];
  // carved locks hanging off the chin, the middle ones longest, each ending in a curl
  for (let i = -3; i <= 3; i++) {
    const x = 150 + i * 22;
    const len = 74 - Math.abs(i) * 11;
    const y0 = 98 - Math.abs(i) * 5;
    out.push((c) => {
      c.beginPath();
      c.moveTo(x - 13, y0);
      c.quadraticCurveTo(x - 14, y0 + len * 0.7, x - 4, y0 + len);
      c.quadraticCurveTo(x + 6, y0 + len + 8, x + 10, y0 + len - 4);
      c.quadraticCurveTo(x + 15, y0 + len * 0.5, x + 13, y0);
      c.closePath();
    });
  }
  return out;
}

const JAW_CUT = titanCut([[96, 84], [124, 96], [156, 98], [190, 88]], 6, 24);

function jaw(): HTMLCanvasElement {
  const T = TF.jaw;
  const [c, g0] = stage(T.w, T.h);
  // the beard hangs behind the jaw
  const bbox = { x: 70, y: 76, w: 160, h: 110 };
  partSil(g0, beardParts(), bbox, (pg, s) => {
    stoneSkin(s, bbox, 700, shade(STONE, -0.1));
    for (let i = -3; i <= 3; i++)
      crease(pg, (q) => {
        q.moveTo(150 + i * 22 - 4, 126);
        q.quadraticCurveTo(150 + i * 22 - 6, 148, 150 + i * 22, 166 - Math.abs(i) * 11);
      }, 1.3, '#06060c', 0.5, 0.25);
  }, INK, { w: 3.6 });
  // the lower teeth stand up out of it
  teeth(g0, [104, 121, 138, 154, 170, 187, 204].map((x) => x - 4), 32, 24, false, 2);
  const box = { x: 40, y: 16, w: 220, h: 122 };
  const s = new Sil(g0, [jawPath()], box);
  const g = s.g;
  stoneSkin(s, box, 705);
  // the lip of the jaw in shadow where the teeth sit, the chin lit
  softFill(g, (q) => {
    q.beginPath();
    q.ellipse(150, 30, 104, 12, 0, 0, Math.PI * 2);
  }, rgba('#0a0406', 0.7), 5);
  spec(g, 132, 92, 34, 10, 0.25, -0.1, LIGHT.key);
  for (const sx of [-1, 1]) ao(g, 150 + sx * 92, 62, 18, 34, 0.45, sx * 0.3);
  paintCut(g, JAW_CUT);
  hairline(g, 214, 70, 1.2, 22, 5);
  hairline(g, 82, 58, 2.2, 18, 6, false);
  // the hinge knuckles at the corners
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.arc(150 + sx * 96, 38, 12, 0, Math.PI * 2);
    g.fillStyle = rgba(shade(STONE, -0.4), 0.6);
    g.fill();
    spec(g, 150 + sx * 96 - 4, 33, 6, 3, 0.35, -0.4, LIGHT.key);
  }
  lightAll(s, 0.4, 20, 0.45);
  s.finish(INK, { w: 4.5 });
  g0.save();
  g0.globalCompositeOperation = 'lighter';
  paintCutGlow(g0, JAW_CUT, 0.55);
  g0.restore();
  return c;
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
    tk_head: head,
    tk_jaw: jaw,
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
  };
}
