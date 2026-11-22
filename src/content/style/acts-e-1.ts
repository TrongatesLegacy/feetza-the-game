// Act 9 (Greek myths) feet and the Kratos Peel's two feet in the style kit (batch acts-e, part 1):
// - SATYR HOOVES: a shaggy goat fetlock spilling over a glossy cloven hoof, a laurel vine round it and a reed pan pipe
//   hanging off the vine (it swings in play; notes float off it and the hooves kick up dust).
// - CYCLOPS SANDALS: a giant's bare foot in a studded leather sandal, one huge eye set in a bronze-rimmed instep plate
//   (in play it blinks and follows your peel).
// - HARPY TALONS: a ruff of dusky violet feathers with gilded tips, a scaly gold leg and three hooked talons; wings
//   spread from its shoulders (they beat in play, faster as it dives, and shed feathers).
// - TITAN TOES: a colossal foot of weathered granite, cracked and mossy, a gold ring on its big toe (pebbles and dust
//   fall off it in play).
// - SKELETON HOPLITE: the bones of a foot in a bronze greave with a red horsehair crest, a round hoplon shield with its
//   red lambda held in front (in play its bones rattle, the crest sways and underworld wisps curl off it).
// - SIREN SLIPPERS: a pale foot in a teal mermaid-scale slipper, pearl strands, a scallop shell and fins at its sides
//   (in play the fins sway, notes of its song drift off it and water drips from it).
// - GORGON SNAKE: one of Medusa's hair snakes, slithering down in S-bends, its head at the bottom (its tongue flicks).
// - PERSIAN ELEPHANT FEET: a wrinkled grey column with ivory toenails under a red-and-gold Persian caparison with a
//   gold fringe and a studded bronze plate (its tassels swing; it stamps up dust).
// - SPARTAN SANDALS: a sun-browned foot laced into a Spartan sandal, an anatomical bronze greave and a red cloak (it
//   swings; bronze glints; it boils red once it rages).
// How they move in play: src/content/styleLive/acts-e-1.ts.

import type { FootArt } from '../../data/feet';
import { CX } from '../../art/feetCommon';
import { type BareFoot, paintBare } from '../../art/style/bare';
import { onToe } from '../../art/style/anatomy';
import { LIGHT, type Box, type PathFn, type Pose, ao, crease, glint, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil, lobe } from '../../art/style/sil';
import { type PartDef, registerStyle } from '../../art/style/registry';
import { paint } from '../../art/style/materials';
import { blotches, clawPath, contact, paintClaw, rivet, stitches, tuftPath } from '../../art/style/details';
import { furCoat, goldRamp, lin, rad } from '../../art/style/kit-bosses';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';
import { BARE_RIG, LX, LY, clipTo, extendSil, layerOn, strap } from './base-kit';
import { paintSoleUnder, sandalSole } from './base-cloth';
import { type Digit, digitPath, onDigit, poseDigits } from './base-critters';
import { ell, piece, prop } from './roster-kit';

type Opts = { live: boolean; emissive?: boolean; heat?: boolean };
type P2 = [number, number];

/** A tapered tube along points (snake bodies, talons): left side out, right side back, a round tip. */
export function tubePath(pts: P2[], w: (s: number) => number, cap = true): PathFn {
  return (c) => {
    const L: P2[] = [];
    const Rr: P2[] = [];
    pts.forEach(([x, y], j) => {
      const [nx, ny] = pts[Math.min(j + 1, pts.length - 1)];
      const [qx, qy] = pts[Math.max(j - 1, 0)];
      const d = Math.hypot(nx - qx, ny - qy) || 1;
      const ww = w(j / (pts.length - 1));
      L.push([x + (-(ny - qy) / d) * ww, y + ((nx - qx) / d) * ww]);
      Rr.push([x - (-(ny - qy) / d) * ww, y - ((nx - qx) / d) * ww]);
    });
    c.beginPath();
    L.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y)));
    for (let j = Rr.length - 1; j >= 0; j--) c.lineTo(Rr[j][0], Rr[j][1]);
    c.closePath();
    if (cap) {
      const [ex, ey] = pts[pts.length - 1];
      const er = w(1);
      c.moveTo(ex + er, ey);
      c.arc(ex, ey, er, 0, Math.PI * 2);
    }
  };
}

/** A point beside a polyline at index j, offset s half widths to its left. */
function beside(pts: P2[], j: number, off: number): P2 {
  const [x, y] = pts[j];
  const [nx, ny] = pts[Math.min(j + 1, pts.length - 1)];
  const [qx, qy] = pts[Math.max(j - 1, 0)];
  const d = Math.hypot(nx - qx, ny - qy) || 1;
  return [x + (-(ny - qy) / d) * off, y + ((nx - qx) / d) * off];
}

/** A curve from a start point and angle that bends as it goes. */
function curveFrom(x0: number, y0: number, a0: number, len: number, bend: number, n = 14): P2[] {
  const pts: P2[] = [];
  let x = x0;
  let y = y0;
  for (let j = 0; j <= n; j++) {
    pts.push([x, y]);
    const a = a0 + bend * (j / n);
    x += Math.cos(a) * (len / n);
    y += Math.sin(a) * (len / n);
  }
  return pts;
}

function quad(ax: number, ay: number, cx: number, cy: number, bx: number, by: number, n = 14): P2[] {
  const out: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    out.push([(1 - u) * (1 - u) * ax + 2 * u * (1 - u) * cx + u * u * bx, (1 - u) * (1 - u) * ay + 2 * u * (1 - u) * cy + u * u * by]);
  }
  return out;
}

/** A filled shape with its contact shadow. */
function raised(g: Ctx, path: PathFn, f: string | CanvasGradient, a = 0.45, d = 2.2): void {
  contact(g, (c) => {
    path(c);
    c.fill();
  }, a, d, d * 1.2);
  path(g);
  g.fillStyle = f;
  g.fill();
}

/** A pearl: a lustrous bead with a pink-blue sheen and a hot glint. */
function pearl(g: Ctx, x: number, y: number, r: number): void {
  contact(g, (c) => {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }, 0.4, r * 0.45, r * 0.6);
  g.fillStyle = rad(g, x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05, [
    [0, '#ffffff'],
    [0.35, '#f6f0ea'],
    [0.75, '#d8d0dc'],
    [1, '#9a90a8'],
  ]);
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = rgba('#ffc8e0', 0.25);
  g.beginPath();
  g.arc(x + r * 0.25, y + r * 0.3, r * 0.55, 0, Math.PI * 2);
  g.fill();
  spec(g, x - r * 0.35, y - r * 0.4, r * 0.4, r * 0.28, 0.95, -0.6);
}

/** A rich bronze ramp (greaves, rims, shields). */
function bronzeRamp(g: Ctx, x0: number, y0: number, x1: number, y1: number, col = '#c9873a'): CanvasGradient {
  return lin(g, x0, y0, x1, y1, [
    [0, mix(col, '#fff2c8', 0.55)],
    [0.22, shade(col, 0.18)],
    [0.5, col],
    [0.72, shade(col, -0.42)],
    [0.86, shade(col, -0.18)],
    [1, mix(shade(col, -0.55), '#203048', 0.25)],
  ]);
}

/** A bronze surface: the ramp, a cast patina in its pits, verdigris in the deepest, a lit edge. */
function bronze(g: Ctx, path: PathFn, box: Box, col: string, seed: number, verdigris = 0.25, cyl = true): void {
  clipTo(g, path, () => {
    if (cyl) {
      // a cylinder under the one light: a hot band on the lit side, the turn into shadow, a cool rim
      g.fillStyle = lin(g, box.x, 0, box.x + box.w, 0, [
        [0, shade(col, -0.35)],
        [0.12, shade(col, 0.05)],
        [0.26, mix(col, '#fff2c8', 0.6)],
        [0.36, shade(col, 0.15)],
        [0.6, col],
        [0.8, shade(col, -0.45)],
        [0.93, mix(shade(col, -0.6), '#101828', 0.3)],
        [1, mix(col, LIGHT.rim, 0.3)],
      ]);
    } else g.fillStyle = bronzeRamp(g, box.x, box.y, box.x + box.w, box.y + box.h, col);
    g.fillRect(box.x, box.y, box.w, box.h);
    texture(g, 'brushed', box, 0.22, 1.2);
    texture(g, 'cast', box, 0.22, 1.1, 'soft-light');
    if (verdigris > 0) blotches(g, box, '#3f9a80', verdigris, 7, 0.68, 0.06, seed);
    if (cyl) g.fillStyle = lin(g, 0, box.y, 0, box.y + box.h, [
      [0, rgba('#fff6d8', 0.12)],
      [0.5, rgba('#000000', 0)],
      [1, rgba('#1a0a04', 0.3)],
    ]);
    if (cyl) g.fillRect(box.x, box.y, box.w, box.h);
    else spec(g, box.x + box.w * 0.3, box.y + box.h * 0.25, box.w * 0.25, box.h * 0.12, 0.55, -0.7, '#fff6d8');
  });
}

// ════════════════════════════ SATYR HOOVES ════════════════════════════

/** The pan pipe's tie point on the vine (it hangs and swings from here). */
export const SATYR_PIPE = { x: CX + 38, y: 104 };

const satyrFur: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 62, -6);
  c.bezierCurveTo(CX - 66, 50, CX - 92, 92, CX - 94, 150);
  c.quadraticCurveTo(CX, 182, CX + 94, 150);
  c.bezierCurveTo(CX + 92, 92, CX + 66, 50, CX + 62, -6);
  c.closePath();
};

/** The shaggy fringe spilling over the hoof: locks along the fetlock's bottom edge. */
const SATYR_FRINGE: [number, number, number, number, number][] = (() => {
  const out: [number, number, number, number, number][] = [];
  const r = rng(hashStr('satyr-fringe'));
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = CX - 90 + t * 180;
    const y = 146 + Math.sin(t * Math.PI) * 18;
    out.push([x, y, Math.PI / 2 + (t - 0.5) * 0.9 + (r() - 0.5) * 0.3, 24 + r() * 12, 20 + r() * 6]);
  }
  return out;
})();

/** One half of the cloven hoof (side −1 outer/left, +1 inner/right) at a pose. */
function hoofHalf(side: number, p: Pose): PathFn {
  const c = Math.max(0, p.curl);
  const s = Math.max(0, -p.curl);
  const w = p.wiggle[side < 0 ? 1 : 3] ?? 0;
  const gap = 4 + s * 6 - c * 2;
  const bottom = 266 - c * 10 + w * 3 + s * 2;
  const half = 88 + s * 6 - c * 4;
  const top = 150;
  const cx = CX;
  return (k) => {
    k.save();
    // the halves tilt out as they splay, in as they curl
    k.translate(cx + side * gap, top);
    k.rotate(side * (s * 0.06 - c * 0.05));
    k.translate(-(cx + side * gap), -top);
    k.beginPath();
    k.moveTo(cx + side * gap, top - 4);
    k.bezierCurveTo(cx + side * half * 0.8, top - 8, cx + side * (half + 6), top + (bottom - top) * 0.42, cx + side * (half - 6), bottom - 14);
    k.quadraticCurveTo(cx + side * half * 0.62, bottom + 3, cx + side * (gap + 16), bottom - 2);
    k.quadraticCurveTo(cx + side * (gap + 2), bottom - 8, cx + side * gap, bottom - 22);
    k.closePath();
    k.restore();
  };
}

/** The pan pipe: five graded reed tubes bound with a bronze-wrapped cord, hanging from its tie point. */
function panPipe(g: Ctx, reed: string): void {
  const { x, y } = SATYR_PIPE;
  g.save();
  g.translate(x, y);
  g.scale(1.3, 1.3);
  g.translate(-x, -y);
  const tubes: PathFn[] = [];
  for (let i = 0; i < 5; i++) {
    const h = 66 - i * 9;
    const tx = x - 26 + i * 11.5;
    tubes.push((c) => {
      c.beginPath();
      c.roundRect(tx, y + 6, 11, h, 4);
    });
  }
  const tie: PathFn = (c) => {
    c.beginPath();
    c.roundRect(x - 30, y + 20, 64, 8, 3);
  };
  const cord: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 1.5, y - 2);
    c.lineTo(x + 1.5, y - 2);
    c.lineTo(x + 2, y + 21);
    c.lineTo(x - 2, y + 21);
    c.closePath();
  };
  prop(g, [...tubes, tie, cord], { x: x - 34, y: y - 4, w: 70, h: 80 }, (pg) => {
    fillPath(pg, cord, '#5a3a1a');
    tubes.forEach((t, i) => {
      const tx = x - 26 + i * 11.5;
      const h = 66 - i * 9;
      clipTo(pg, t, () => {
        pg.fillStyle = lin(pg, tx, 0, tx + 11, 0, [
          [0, shade(reed, -0.1)],
          [0.3, shade(reed, 0.28)],
          [0.6, reed],
          [1, mix(shade(reed, -0.45), '#3a2010', 0.3)],
        ]);
        pg.fillRect(tx, y, 11, h + 8);
        texture(pg, 'wood', { x: tx, y, w: 11, h: h + 8 }, 0.3, 0.8);
        // the reed's node rings
        for (const f of [0.45, 0.8]) crease(pg, (c) => {
          c.moveTo(tx, y + 6 + h * f);
          c.lineTo(tx + 11, y + 6 + h * f + 1);
        }, 1.2, '#4a3010', 0.45, 0.4);
        // the open mouth of the reed at the top
        pg.fillStyle = '#2a1608';
        pg.beginPath();
        pg.ellipse(tx + 5.5, y + 9, 3.4, 1.8, 0, 0, Math.PI * 2);
        pg.fill();
      });
      if (i) ao(pg, tx, y + 30, 2.5, 30, 0.35, 0);
    });
    contact(pg, (c) => {
      tie(c);
      c.fill();
    }, 0.45, 1.8, 2);
    fillPath(pg, tie, goldRamp(pg, 0, y + 20, 0, y + 28, '#c9873a'));
    stitches(pg, (c) => {
      c.moveTo(x - 28, y + 24);
      c.lineTo(x + 32, y + 24);
    }, rgba('#3a2010', 0.7), 1, 2, 3);
  }, inkOf(reed), { w: 3 });
  g.restore();
}

/** Paint `fn` clipped to the union of several paths (each begins its own path, so one clip can't hold them). */
function unionPaint(g: Ctx, paths: PathFn[], fn: (l: Ctx) => void): void {
  layerOn(g, 'source-over', (l) => {
    fn(l);
    const m = document.createElement('canvas');
    m.width = l.canvas.width;
    m.height = l.canvas.height;
    const mx = m.getContext('2d')!;
    mx.setTransform(l.getTransform());
    mx.fillStyle = '#fff';
    for (const p of paths) {
      p(mx);
      mx.fill();
    }
    l.save();
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.globalCompositeOperation = 'destination-in';
    l.drawImage(m, 0, 0);
    l.restore();
  });
}

function fillPath(g: Ctx, path: PathFn, f: string | CanvasGradient): void {
  path(g);
  g.fillStyle = f;
  g.fill();
}

/** A laurel vine round the fetlock with paired leaves. */
function laurel(g: Ctx, y: number, hw: number, sag: number): void {
  const pts = quad(CX - hw, y, CX, y + sag * 2, CX + hw, y);
  strap(g, pts, 5, '#4f6a24', { shadow: 0.55 });
  const r = rng(hashStr('laurel'));
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, yy] = pts[i];
    for (const s of [-1, 1]) {
      const a = (s < 0 ? -0.9 : 0.75) + (r() - 0.5) * 0.4 + (i - 7) * 0.04;
      const lx = x + Math.cos(a - Math.PI / 2) * 7;
      const ly = yy + Math.sin(a - Math.PI / 2) * 7 * s;
      const leaf: PathFn = (c) => {
        c.beginPath();
        c.ellipse(lx, ly, 10, 4.2, a * s, 0, Math.PI * 2);
      };
      const col = i % 2 ? '#7fae3a' : '#5f9a2e';
      raised(g, leaf, lin(g, lx - 8, ly - 4, lx + 8, ly + 4, [
        [0, shade(col, 0.35)],
        [0.5, col],
        [1, shade(col, -0.4)],
      ]), 0.5, 1.6);
      g.strokeStyle = rgba('#e8f0b0', 0.55);
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(lx - Math.cos(a * s) * 8, ly - Math.sin(a * s) * 8);
      g.lineTo(lx + Math.cos(a * s) * 8, ly + Math.sin(a * s) * 8);
      g.stroke();
    }
  }
}

registerStyle('satyr', {
  contactY: 266,
  halfWidth: 100,
  rig: { from: 176, to: 196 },
  leg: { kind: 'fur', hw: 62, join: 'blend', fade: 26 },
  parts: {
    pipe: { box: { x: SATYR_PIPE.x - 50, y: SATYR_PIPE.y - 12, w: 104, h: 116 }, frames: 1, pivot: [SATYR_PIPE.x, SATYR_PIPE.y], draw: (g, art) => panPipe(g, art.secondary ?? '#e8d9b0') },
  },
  draw(ctx, art, p, o) {
    if (o.emissive || o.heat) return;
    const fur = art.primary ?? '#6b4a2e';
    const hoofCol = '#5e4a3c';
    const box = { x: CX - 116, y: -8, w: 232, h: 280 };
    const fringe = SATYR_FRINGE.map(([x, y, a, l, w], i) => tuftPath(x, y, a, l, w, (i % 2 ? 0.2 : -0.2)));
    const halves = [hoofHalf(-1, p), hoofHalf(1, p)];
    const sil = new Sil(ctx, [satyrFur, ...fringe, ...halves], box);
    const g = sil.g;
    // the hoof: dark glossy keratin, growth rings, the split between the halves
    for (const [i, h] of halves.entries()) {
      const side = i ? 1 : -1;
      clipTo(g, h, () => {
        g.fillStyle = lin(g, CX + side * 10, 150, CX + side * 90, 270, [
          [0, mix(hoofCol, '#d8c0a0', 0.3)],
          [0.35, hoofCol],
          [0.75, shade(hoofCol, -0.45)],
          [1, mix(shade(hoofCol, -0.6), '#1a1030', 0.3)],
        ]);
        g.fillRect(CX - 120, 140, 240, 140);
        texture(g, 'grain', { x: CX - 120, y: 140, w: 240, h: 140 }, 0.25, 1);
        for (let k = 1; k < 6; k++) {
          const yy = 168 + k * 17;
          crease(g, (c) => {
            c.moveTo(CX - 110, yy - 6);
            c.quadraticCurveTo(CX, yy + 12, CX + 110, yy - 6);
          }, 1.4, '#1a0e08', 0.32, 0.18);
        }
        // a long glossy highlight down the lit side of each half
        const hx = CX + side * (side < 0 ? 52 : 34);
        spec(g, hx, 214, 9, 34, side < 0 ? 0.55 : 0.32, 0.12 * side);
        glint(g, hx - 2, 200, 5, side < 0 ? 0.8 : 0.5);
      });
    }
    softStroke(g, (c) => {
      c.moveTo(CX, 160);
      c.lineTo(CX, 262);
    }, rgba('#0a0604', 0.8), 7, 2.5);
    // the fetlock: fur flowing down and out
    unionPaint(g, [satyrFur, ...fringe], (l) => {
      const coat = shade(fur, 0.32);
      l.fillStyle = lin(l, CX - 90, 0, CX + 90, 160, [
        [0, shade(coat, 0.1)],
        [0.5, shade(coat, -0.1)],
        [1, shade(coat, -0.4)],
      ]);
      l.fillRect(box.x, box.y, box.w, 200);
      const r = rng(hashStr('satyr-fur'));
      furCoat(l, r, { x: CX - 100, y: -10, w: 200, h: 200 }, (x) => Math.PI / 2 + ((x - CX) / 100) * 0.35, coat, shade(fur, -0.3), { n: 0.9, len: 18 });
      // locks of the fringe: darker roots, lit tips
      for (const [x, y, a, len] of SATYR_FRINGE) {
        softStroke(l, (c) => {
          c.moveTo(x, y);
          c.lineTo(x + Math.cos(a) * len * 0.8, y + Math.sin(a) * len * 0.8);
        }, rgba(shade(fur, 0.35), 0.35), 4, 2);
      }
    });
    // the hoof sits in the fur's shadow
    unionPaint(g, halves, (l) => ao(l, CX, 160, 120, 26, 0.55, 0, '#0a0404'));
    // the vine anklet
    laurel(g, 92, 84, 9);
    sil.edge(rgba('#0a0610', 0.42), 20, LX * 11, LY * 11);
    sil.edge(rgba(LIGHT.rim, 0.5), 2.5, LX * 3, LY * 3);
    sil.finish(inkOf(fur), { openTop: -5 });
    if (!o.live) panPipe(ctx, art.secondary ?? '#e8d9b0');
  },
});

// ════════════════════════════ CYCLOPS SANDALS ════════════════════════════

/** The eye (design space): it sits where the game's eye-poke zone expects it (src/game/acts/act9.ts). */
export const CYC_EYE = { x: CX + 2, y: 102, rx: 64, ry: 37 };

const CYC_LOOK = { skin: '#b8a07a', nails: undefined as string | undefined, toe: 1.1, ball: 1.05, w: 8, ankle: 54, pores: 0.3, shadowTint: '#5a2a10' };

const cycPlate: PathFn = (c) => {
  c.beginPath();
  c.ellipse(CYC_EYE.x, CYC_EYE.y, 92, 60, 0, 0, Math.PI * 2);
};

const cycSole: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 42, 30);
  c.bezierCurveTo(CX - 60, 70, CX - 108, 100, CX - 116, 150);
  c.bezierCurveTo(CX - 124, 196, CX - 124, 220, CX - 118, 238);
  c.bezierCurveTo(CX - 108, 276, CX - 52, 284, CX + 8, 284);
  c.bezierCurveTo(CX + 80, 286, CX + 128, 276, CX + 130, 234);
  c.bezierCurveTo(CX + 134, 196, CX + 126, 160, CX + 120, 140);
  c.bezierCurveTo(CX + 104, 100, CX + 64, 70, CX + 48, 30);
  c.quadraticCurveTo(CX, 24, CX - 42, 30);
  c.closePath();
};

function cycIris(g: Ctx, iris: string): void {
  const { x, y } = CYC_EYE;
  g.fillStyle = rad(g, x - 4, y - 4, 1, x, y, 22, [
    [0, mix(iris, '#ffe0a0', 0.6)],
    [0.45, iris],
    [0.85, shade(iris, -0.5)],
    [1, '#2a0606'],
  ]);
  g.beginPath();
  g.arc(x, y, 22, 0, Math.PI * 2);
  g.fill();
  // the iris's fibres
  g.strokeStyle = rgba(shade(iris, -0.55), 0.45);
  g.lineWidth = 0.9;
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    g.beginPath();
    g.moveTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9);
    g.lineTo(x + Math.cos(a) * 19, y + Math.sin(a) * 19);
    g.stroke();
  }
  g.fillStyle = '#0a0404';
  g.beginPath();
  g.ellipse(x, y, 7.5, 9.5, 0, 0, Math.PI * 2);
  g.fill();
  spec(g, x - 8, y - 9, 7, 4.5, 0.95, -0.5);
  glint(g, x - 8, y - 9, 4.5, 1);
  spec(g, x + 9, y + 8, 3, 2, 0.5, -0.5);
}

/** The eye's lids, closing by k (0 open … 1 shut): heavy leather lids with lashes. */
function cycLids(g: Ctx, leather: string, k: number): void {
  const { x, y, rx, ry } = CYC_EYE;
  const shape = (c: Ctx) => {
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  };
  clipTo(g, shape, () => {
    const up = y - ry + ry * 1.05 * k;
    const lo = y + ry - ry * 0.95 * k;
    // upper lid
    g.fillStyle = lin(g, 0, y - ry, 0, up + 4, [
      [0, shade(leather, 0.15)],
      [1, shade(leather, -0.25)],
    ]);
    g.beginPath();
    g.moveTo(x - rx - 4, y - ry - 4);
    g.lineTo(x + rx + 4, y - ry - 4);
    g.lineTo(x + rx + 4, y - 2);
    g.quadraticCurveTo(x, up * 2 - (y - 2) + (k > 0.9 ? 2 : 0), x - rx - 4, y - 2);
    g.closePath();
    if (k > 0.02) g.fill();
    // lower lid
    g.fillStyle = lin(g, 0, lo - 4, 0, y + ry, [
      [0, shade(leather, 0.1)],
      [1, shade(leather, -0.35)],
    ]);
    g.beginPath();
    g.moveTo(x - rx - 4, y + ry + 4);
    g.lineTo(x + rx + 4, y + ry + 4);
    g.lineTo(x + rx + 4, y + 2);
    g.quadraticCurveTo(x, lo * 2 - (y + 2), x - rx - 4, y + 2);
    g.closePath();
    if (k > 0.02) g.fill();
    if (k > 0.02) {
      texture(g, 'leather', { x: x - rx, y: y - ry, w: rx * 2, h: ry * 2 }, 0.3, 1.2);
      // the lid edge, a dark lash line where they meet
      g.strokeStyle = rgba('#1a0a04', 0.85);
      g.lineWidth = 2.6;
      g.beginPath();
      g.moveTo(x - rx, y);
      g.quadraticCurveTo(x, up * 2 - y, x + rx, y);
      g.stroke();
      g.strokeStyle = rgba(LIGHT.key, 0.35);
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(x - rx, y - 3);
      g.quadraticCurveTo(x, up * 2 - y - 3, x + rx, y - 3);
      g.stroke();
    }
  });
}

/** The eye's sclera and its rim (the lids sit in the bronze plate): bloodshot, wet, deep in its socket. */
function cycSclera(g: Ctx): void {
  const { x, y, rx, ry } = CYC_EYE;
  const shape: PathFn = (c) => {
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  };
  clipTo(g, shape, () => {
    g.fillStyle = rad(g, x - 10, y - 10, 4, x, y, rx, [
      [0, '#fffdf6'],
      [0.6, '#f2e6d6'],
      [1, '#c8a890'],
    ]);
    g.fillRect(x - rx, y - ry, rx * 2, ry * 2);
    const r = rng(hashStr('cyclops-veins'));
    g.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2;
      let vx = x + Math.cos(a) * rx;
      let vy = y + Math.sin(a) * ry;
      g.strokeStyle = rgba('#c81e1e', 0.35 + r() * 0.25);
      g.lineWidth = 1.3;
      g.beginPath();
      g.moveTo(vx, vy);
      for (let k = 0; k < 4; k++) {
        vx += (x - vx) * 0.22 + (r() - 0.5) * 8;
        vy += (y - vy) * 0.22 + (r() - 0.5) * 6;
        g.lineTo(vx, vy);
      }
      g.stroke();
    }
    // the socket's shadow under the upper lid
    g.fillStyle = lin(g, 0, y - ry, 0, y, [
      [0, rgba('#3a1a08', 0.55)],
      [1, rgba('#3a1a08', 0)],
    ]);
    g.fillRect(x - rx, y - ry, rx * 2, ry);
  });
}

function drawCyclops(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  if (o.emissive || o.heat) return;
  const leather = art.primary ?? '#8a5a2e';
  const stud = art.secondary ?? '#d9a441';
  const iris = String(art.extra?.iris ?? '#e8402f');
  const f = paintBare(ctx, { ...CYC_LOOK, skin: art.skin }, p);
  const g = f.sil.g;
  extendSil(f.sil, [cycSole]);
  paintSoleUnder(g, f.sil.parts, cycSole, mix(leather, '#c8905a', 0.3), shade(leather, -0.4), inkOf(art.skin), { tex: 'leather', thick: 12, stitch: rgba('#f0d8a0', 0.6) });
  const sl = { stitch: rgba('#f0d8a0', 0.5), gloss: 0.25 };
  // the toe strap across the ball, the ankle strap, and two straps up the sides to the plate
  strap(g, quad(CX - 116, 186, CX, 150, CX + 126, 172), 16, leather, sl);
  strap(g, quad(CX - 58, 18, CX, 30, CX + 60, 16), 15, leather, sl);
  strap(g, quad(CX - 112, 150, CX - 86, 118, CX - 62, 100), 14, leather, sl);
  strap(g, quad(CX + 124, 140, CX + 96, 112, CX + 66, 100), 14, leather, sl);
  strap(g, quad(CX, 30, CX + 4, 40, CX + 2, 54), 12, leather, sl);
  // the instep plate: bronze rim, leather inside, studs round it
  contact(g, (c) => {
    cycPlate(c);
    c.fill();
  }, 0.6, 3.5, 5);
  bronze(g, cycPlate, { x: CYC_EYE.x - 94, y: CYC_EYE.y - 62, w: 188, h: 124 }, stud, 61, 0.1, false);
  const inner: PathFn = (c) => {
    c.beginPath();
    c.ellipse(CYC_EYE.x, CYC_EYE.y, 78, 48, 0, 0, Math.PI * 2);
  };
  piece(g, inner, { x: CYC_EYE.x - 78, y: CYC_EYE.y - 48, w: 156, h: 96 }, 'leather', leather, { shadow: 0.5, size: 10 });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    rivet(g, CYC_EYE.x + Math.cos(a) * 85, CYC_EYE.y + Math.sin(a) * 54, 3.8, stud);
  }
  // the eye: deep in the plate, wet, bloodshot
  ao(g, CYC_EYE.x + 3, CYC_EYE.y + 4, CYC_EYE.rx + 6, CYC_EYE.ry + 5, 0.55, 0, '#140804');
  cycSclera(g);
  if (!o.live) {
    cycIris(g, iris);
    cycLids(g, leather, 0);
  }
  // studs where the straps cross the foot
  for (const [x, y] of [[CX - 60, 168], [CX + 62, 166], [CX - 2, 162], [CX - 40, 22], [CX + 44, 22]] as const) rivet(g, x, y, 4.2, stud);
  // a wet lid line round the eye
  g.strokeStyle = rgba('#1a0a04', 0.7);
  g.lineWidth = 2.4;
  g.beginPath();
  g.ellipse(CYC_EYE.x, CYC_EYE.y, CYC_EYE.rx, CYC_EYE.ry, 0, 0, Math.PI * 2);
  g.stroke();
  // heavy lashes on the upper lid
  for (let i = 0; i < 9; i++) {
    const t = (i + 0.5) / 9;
    const a = Math.PI + t * Math.PI;
    const ex = CYC_EYE.x + Math.cos(a) * CYC_EYE.rx;
    const ey = CYC_EYE.y + Math.sin(a) * CYC_EYE.ry;
    g.strokeStyle = '#1a0a04';
    g.lineWidth = 2.2;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(ex, ey);
    g.quadraticCurveTo(ex + Math.cos(a) * 6, ey + Math.sin(a) * 8, ex + Math.cos(a) * 8 + (t - 0.5) * 6, ey + Math.sin(a) * 12 - 2);
    g.stroke();
  }
  f.sil.edge(rgba('#1a0a04', 0.35), 22, LX * 12, LY * 12);
  f.sil.edge(rgba(LIGHT.rim, 0.45), 2.5, LX * 3, LY * 3);
  f.sil.finish(inkOf(art.skin), { openTop: f.top + 1.5 });
}

const eyeBox = { x: CYC_EYE.x - CYC_EYE.rx - 4, y: CYC_EYE.y - CYC_EYE.ry - 4, w: CYC_EYE.rx * 2 + 8, h: CYC_EYE.ry * 2 + 8 };

registerStyle('cyclops', {
  contactY: 282,
  halfWidth: 106,
  rig: BARE_RIG,
  leg: { kind: 'skin', hw: 54, join: 'blend', fade: 26 },
  parts: {
    // the iris follows the peel; the lids over it blink
    iris: {
      box: eyeBox,
      frames: 1,
      draw: (g, art) => {
        clipTo(g, ell(CYC_EYE.x, CYC_EYE.y, CYC_EYE.rx - 1, CYC_EYE.ry - 1), () => cycIris(g, String(art.extra?.iris ?? '#e8402f')));
      },
    },
    lids: { box: eyeBox, frames: 4, draw: (g, art, i) => cycLids(g, art.primary ?? '#8a5a2e', [0, 0.45, 0.8, 1][i]) },
  },
  draw: drawCyclops,
});

// ════════════════════════════ HARPY TALONS ════════════════════════════

/** The wings' roots (design space): left and right shoulders of the ruff. */
export const HARPY_WINGS: P2[] = [
  [CX - 56, 52],
  [CX + 56, 52],
];

const harpyRuff: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 56, -6);
  c.bezierCurveTo(CX - 60, 30, CX - 82, 60, CX - 80, 100);
  for (let i = 0; i <= 7; i++) {
    const x = CX - 80 + i * 22.86;
    c.quadraticCurveTo(x - 11, 146 - Math.abs(i - 3.5) * 5, x, 124 - Math.abs(i - 3.5) * 3);
  }
  c.bezierCurveTo(CX + 82, 60, CX + 60, 30, CX + 56, -6);
  c.closePath();
};

const harpyTarsus: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 24, 110);
  c.lineTo(CX - 27, 186);
  c.quadraticCurveTo(CX, 206, CX + 27, 186);
  c.lineTo(CX + 24, 110);
  c.closePath();
};

function harpyToes(p: Pose): P2[][] {
  const c = Math.max(0, p.curl);
  const sp = Math.max(0, -p.curl);
  return [
    [Math.PI * 0.8, 0.3],
    [Math.PI * 0.5, 0.06],
    [Math.PI * 0.2, -0.3],
  ].map(([a, b], i) => {
    const w = p.wiggle[i + 1] ?? 0;
    const spread = (a - Math.PI / 2) * (1 + sp * 0.3 - c * 0.3);
    return curveFrom(CX, 186, Math.PI / 2 + spread, (i === 1 ? 98 : 102) * (1 - c * 0.22), b * (1 + c * 2.2) + w * 0.18);
  });
}

/** One wing (side −1 left, +1 right) drawn at its root, spread out and down; `beat` 0…1 folds it. */
export function harpyWing(g: Ctx, side: number, violet: string, gold: string): void {
  const r = rng(hashStr(`harpy-wing${side}`));
  g.save();
  g.scale(side, 1);
  // primaries: long feathers fanning out from the root, back ones first
  const feathers: { a: number; len: number; w: number }[] = [];
  for (let i = 0; i < 7; i++) feathers.push({ a: -0.5 + i * 0.2, len: 124 - i * 9 + r() * 6, w: 16 - i * 0.5 });
  const fPath = (f: { a: number; len: number; w: number }): PathFn => (c) => {
    c.save();
    c.rotate(f.a);
    c.beginPath();
    c.moveTo(0, -f.w * 0.6);
    c.bezierCurveTo(f.len * 0.4, -f.w, f.len * 0.85, -f.w * 0.7, f.len, 0);
    c.bezierCurveTo(f.len * 0.85, f.w * 0.55, f.len * 0.4, f.w * 0.9, 0, f.w * 0.6);
    c.closePath();
    c.restore();
  };
  const coverts: PathFn = (c) => {
    c.beginPath();
    c.moveTo(-6, -14);
    c.bezierCurveTo(30, -26, 56, -6, 58, 14);
    c.bezierCurveTo(40, 34, 14, 40, -6, 22);
    c.closePath();
  };
  const parts = [...feathers.map(fPath), coverts];
  const s = new Sil(g, parts, { x: -14, y: -60, w: 150, h: 170 });
  const sg = s.g;
  for (const f of [...feathers].reverse()) {
    const pth = fPath(f);
    contact(sg, (c) => {
      pth(c);
      c.fill();
    }, 0.45, 2, 2.5);
    sg.save();
    sg.rotate(f.a);
    const local: PathFn = (c) => {
      c.beginPath();
      c.moveTo(0, -f.w * 0.6);
      c.bezierCurveTo(f.len * 0.4, -f.w, f.len * 0.85, -f.w * 0.7, f.len, 0);
      c.bezierCurveTo(f.len * 0.85, f.w * 0.55, f.len * 0.4, f.w * 0.9, 0, f.w * 0.6);
      c.closePath();
    };
    clipTo(sg, local, () => {
      sg.fillStyle = lin(sg, 0, -f.w, 0, f.w, [
        [0, shade(violet, 0.4)],
        [0.45, violet],
        [1, mix(shade(violet, -0.45), '#100818', 0.25)],
      ]);
      sg.fillRect(-4, -f.w - 2, f.len + 8, f.w * 2 + 4);
      // the gilded tip, the shaft and barbs
      sg.fillStyle = lin(sg, f.len - 24, 0, f.len, 0, [
        [0, rgba(gold, 0)],
        [0.5, rgba(gold, 0.7)],
        [1, rgba(mix(gold, '#fff2c0', 0.4), 0.9)],
      ]);
      sg.fillRect(f.len - 24, -f.w, 26, f.w * 2);
      sg.strokeStyle = rgba(shade(violet, -0.5), 0.35);
      sg.lineWidth = 0.7;
      for (let k = 10; k < f.len - 8; k += 5) {
        sg.beginPath();
        sg.moveTo(k, 0);
        sg.lineTo(k + 6, -f.w);
        sg.moveTo(k, 0);
        sg.lineTo(k + 6, f.w);
        sg.stroke();
      }
      sg.strokeStyle = rgba('#fff0d0', 0.55);
      sg.lineWidth = 1.1;
      sg.beginPath();
      sg.moveTo(2, -0.5);
      sg.lineTo(f.len - 3, -0.5);
      sg.stroke();
    });
    sg.restore();
  }
  // the coverts: small scalloped feathers over the root
  contact(sg, (c) => {
    coverts(c);
    c.fill();
  }, 0.5, 2.5, 3);
  clipTo(sg, coverts, () => {
    sg.fillStyle = shade(violet, -0.15);
    sg.fillRect(-10, -30, 80, 80);
    for (let row = 0; row < 4; row++)
      for (let i = 0; i < 5 - row; i++) {
        const x = 4 + i * 12 + row * 6;
        const y = -10 + row * 11;
        const sc: PathFn = (c) => {
          c.beginPath();
          c.moveTo(x - 7, y);
          c.quadraticCurveTo(x - 7, y + 12, x, y + 14);
          c.quadraticCurveTo(x + 7, y + 12, x + 7, y);
          c.closePath();
        };
        contact(sg, (c) => {
          sc(c);
          c.fill();
        }, 0.35, 1.5, 2);
        fillPath(sg, sc, lin(sg, x - 7, y, x + 7, y + 14, [
          [0, shade(violet, 0.3)],
          [1, shade(violet, -0.3)],
        ]));
      }
  });
  // the wing is lit from the top left whichever side it's on
  s.edge(rgba('#0a0614', 0.4), 12, side * LX * 6, LY * 6);
  s.edge(rgba(LIGHT.rim, 0.5), 2, side * LX * 2.5, LY * 2.5);
  s.finish(inkOf(violet), { w: 4 });
  g.restore();
}

function drawHarpy(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  if (o.emissive || o.heat) return;
  const violet = art.primary ?? '#5a4a6a';
  const gold = art.secondary ?? '#c9a23a';
  const scaleCol = art.legColor ?? '#d9b85a';
  if (!o.live)
    for (const [i, [wx, wy]] of HARPY_WINGS.entries()) {
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate((i ? 1 : -1) * 0.12);
      harpyWing(ctx, i ? 1 : -1, mix(violet, '#a090c0', 0.3), gold);
      ctx.restore();
    }
  const toes = harpyToes(p);
  const c = Math.max(0, p.curl);
  const toeW = (s: number) => 17 - s * 6;
  const claws = toes.map((pts) => {
    const [x, y] = pts[pts.length - 1];
    const [px, py] = pts[pts.length - 2];
    return { x, y, ang: Math.atan2(y - py, x - px), len: 32 * (1 + c * 0.4), w: 14 };
  });
  const box = { x: CX - 110, y: -8, w: 220, h: 316 };
  const sil = new Sil(ctx, [harpyRuff, harpyTarsus, ...toes.map((t) => tubePath(t, toeW)), ...claws.map((k) => clawPath(k.x, k.y, k.ang, k.len, k.w, 0.35))], box);
  const g = sil.g;
  sil.form({ base: scaleCol, shadowTint: '#5a3008', ramp: 0.75, form: 0.55, formSize: 14, bevel: 0.4, rim: 0.55 });
  texture(g, 'scales', box, 0.45, 1.1);
  // scutes across the leg and toes
  const scutes = (pts: P2[], w: (s: number) => number) => {
    for (let j = 1; j < pts.length - 1; j += 2) {
      const [x, y] = pts[j];
      const [lx, ly] = beside(pts, j, w(j / (pts.length - 1)) * 0.92);
      const [rx, ry] = beside(pts, j, -w(j / (pts.length - 1)) * 0.92);
      const [nx, ny] = pts[j + 1];
      crease(g, (cc) => {
        cc.moveTo(lx, ly);
        cc.quadraticCurveTo(x + (nx - x) * 0.6, y + (ny - y) * 0.6, rx, ry);
      }, 1.4, '#5a3008', 0.5, 0.4);
    }
  };
  for (const t of toes) {
    lobe(g, tubePath(t, toeW), box, 178, 196, '#3a1a04', 0.55, 5, 0.35);
    scutes(t, toeW);
  }
  scutes(curveFrom(CX, 112, Math.PI / 2, 92, 0, 14), () => 22);
  spec(g, CX - 9, 160, 5, 32, 0.4, 0.02);
  for (const k of claws) paintClaw(g, k.x, k.y, k.ang, k.len, k.w, 0.35, '#4a4050', '#06040a');
  // the ruff: rows of violet feathers with gilded edges, a collar of long dark quills
  contact(g, (cc) => {
    harpyRuff(cc);
    cc.fill();
  }, 0.6, 4, 6);
  const r = rng(hashStr('harpy-ruff'));
  clipTo(g, harpyRuff, () => {
    g.fillStyle = shade(violet, -0.3);
    g.fillRect(box.x, box.y, box.w, 160);
    for (let row = 5; row >= 0; row--) {
      const y = 8 + row * 20;
      const n = 6 + row;
      const w = 28 + row * 2.6;
      for (let i = 0; i <= n; i++) {
        const x = CX - (n * w * 0.5) / 1.3 + (i * w) / 1.3 + (row % 2 ? w * 0.35 : 0) + (r() - 0.5) * 4;
        const fe: PathFn = (cc) => {
          cc.beginPath();
          cc.moveTo(x - w * 0.5, y);
          cc.quadraticCurveTo(x - w * 0.55, y + 22, x, y + 32);
          cc.quadraticCurveTo(x + w * 0.55, y + 22, x + w * 0.5, y);
          cc.closePath();
        };
        contact(g, (cc) => {
          fe(cc);
          cc.fill();
        }, 0.45, 2, 2.5);
        const tone = shade(violet, (r() - 0.5) * 0.16 - row * 0.03);
        fillPath(g, fe, lin(g, x - w * 0.5, y, x + w * 0.5, y + 32, [
          [0, shade(tone, 0.32)],
          [0.5, tone],
          [1, shade(tone, -0.45)],
        ]));
        clipTo(g, fe, () => {
          // a gilded edge to each feather
          g.strokeStyle = rgba(gold, 0.55);
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(x - w * 0.5, y + 4);
          g.quadraticCurveTo(x - w * 0.55, y + 22, x, y + 32);
          g.quadraticCurveTo(x + w * 0.55, y + 22, x + w * 0.5, y + 4);
          g.stroke();
        });
        g.strokeStyle = rgba('#ffffff', 0.22);
        g.lineWidth = 0.9;
        g.beginPath();
        g.moveTo(x, y + 2);
        g.lineTo(x, y + 28);
        g.stroke();
      }
    }
    // dark quills standing out of the collar
    for (let i = 0; i < 9; i++) {
      const x = CX - 48 + i * 12;
      const q: PathFn = (cc) => {
        cc.beginPath();
        cc.moveTo(x - 5, 4);
        cc.quadraticCurveTo(x - 4, 40, x, 58 - Math.abs(i - 4) * 4);
        cc.quadraticCurveTo(x + 4, 40, x + 5, 4);
        cc.closePath();
      };
      contact(g, (cc) => {
        q(cc);
        cc.fill();
      }, 0.5, 2, 2.5);
      fillPath(g, q, lin(g, x - 5, 0, x + 5, 0, [
        [0, '#6a5a7a'],
        [0.4, '#3a2e48'],
        [1, '#140e1c'],
      ]));
      spec(g, x - 1.5, 24, 1.5, 12, 0.4, 0);
    }
    spec(g, CX - 36, 24, 32, 12, 0.3, -0.2, '#e8d8ff');
  });
  ao(g, CX, 124, 30, 10, 0.6, 0, '#1a0a04');
  sil.edge(rgba('#0a0614', 0.38), 16, LX * 9, LY * 9);
  sil.edge(rgba(LIGHT.rim, 0.55), 2.5, LX * 3, LY * 3);
  sil.finish(inkOf(violet), { openTop: -5 });
}

registerStyle('harpy', {
  contactY: 296,
  halfWidth: 92,
  rig: { from: 178, to: 196 },
  leg: { kind: 'fur', hw: 56, join: 'blend', fade: 26 },
  draw: drawHarpy,
});

// ════════════════════════════ TITAN TOES ════════════════════════════

const TITAN_LOOK = { nails: '#b8ac98', toe: 1.16, ball: 1.05, w: 8, ankle: 56, pores: 0, detail: 0.5, shadowTint: '#1a1830' };

function titanStone(g: Ctx, f: BareFoot, stone: string, dark: string, gold: string): void {
  const b = f.box;
  const r = rng(hashStr('titan-stone'));
  texture(g, 'stone', b, 0.3, 2.4);
  texture(g, 'cast', b, 0.4, 1.2, 'soft-light');
  texture(g, 'grain', b, 0.25, 1, 'soft-light');
  // weathering: darker streaks run down from the ankle, paler worn patches on the lit dome
  blotches(g, b, shade(dark, -0.2), 0.35, 26, 0.56, 0.18, 71, 'multiply');
  blotches(g, b, mix(stone, '#fff4e0', 0.5), 0.22, 30, 0.6, 0.2, 73, 'soft-light');
  // chisel facets: flat planes catching the light
  for (let i = 0; i < 9; i++) {
    const x = b.x + 30 + r() * (b.w - 60);
    const y = 10 + r() * 170;
    const s = 10 + r() * 14;
    const a = r() * Math.PI;
    const facet: PathFn = (c) => {
      c.beginPath();
      for (let k = 0; k < 5; k++) {
        const aa = a + (k / 5) * Math.PI * 2;
        const rr = s * (0.6 + r() * 0.5);
        k ? c.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr * 0.7) : c.moveTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr * 0.7);
      }
      c.closePath();
    };
    const lit = (x - CX) * LX + (y - 120) * LY > 0;
    fillPath(g, facet, rgba(lit ? '#fff4e0' : '#14101c', lit ? 0.12 : 0.1));
  }
  // cracks: dark, jagged, a lit lip on one side
  for (const [x0, y0, n] of [[CX - 40, -4, 7], [CX + 52, 30, 6], [CX - 76, 110, 4], [CX + 10, 120, 3]] as const) {
    const pts: P2[] = [[x0, y0]];
    let x = x0;
    let y = y0;
    for (let k = 0; k < n; k++) {
      x += (r() - 0.5) * 22;
      y += 10 + r() * 14;
      pts.push([x, y]);
    }
    crease(g, (c) => pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))), 2.6, '#0e0a10', 0.75, 0.45);
    // a hairline branch
    const [bx, by] = pts[Math.floor(n / 2)];
    crease(g, (c) => {
      c.moveTo(bx, by);
      c.lineTo(bx + (r() < 0.5 ? -1 : 1) * (10 + r() * 10), by + 8 + r() * 10);
    }, 1.3, '#0e0a10', 0.6, 0.3);
  }
  // moss and lichen in the hollows: soft green, fine specks, a pale lichen crust
  for (const [x, y, rx, ry] of [[CX - 70, 40, 18, 12], [CX + 66, 120, 16, 22], [CX - 86, 160, 12, 16], [CX + 30, 6, 14, 8]] as const) {
    softFill(g, ell(x, y, rx, ry), rgba('#4f7a2a', 0.55), 4);
    for (let k = 0; k < 40; k++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r());
      g.fillStyle = rgba(r() < 0.5 ? '#8cc44a' : '#3a5a1a', 0.7);
      g.beginPath();
      g.arc(x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d, 0.8 + r() * 1.6, 0, Math.PI * 2);
      g.fill();
    }
  }
  for (const [x, y] of [[CX + 12, 70], [CX - 30, 150], [CX + 80, 60]] as const) {
    for (let k = 0; k < 6; k++) softFill(g, ell(x + (r() - 0.5) * 14, y + (r() - 0.5) * 10, 2 + r() * 3, 1.5 + r() * 2), rgba('#d8d4b8', 0.35), 0.6);
  }
  // the gold ring on the big toe: a band round the toe, its back hidden behind it
  const t = f.toes[4];
  const yy = t.cy - t.ry * 0.12;
  const toe: PathFn = (c) => {
    c.beginPath();
    c.ellipse(t.cx, t.cy, t.rx + 1, t.ry + 1, t.rot, 0, Math.PI * 2);
  };
  clipTo(g, toe, () => {
    g.save();
    g.translate(t.cx, yy);
    g.rotate(t.rot);
    const front = (c: Ctx) => {
      c.beginPath();
      c.ellipse(0, 0, t.rx * 1.02, 9, 0, 0.05, Math.PI - 0.05);
    };
    contact(g, (c) => {
      front(c);
      c.lineWidth = 9;
      c.stroke();
    }, 0.6, 2.5, 3);
    front(g);
    g.lineWidth = 9;
    g.strokeStyle = goldRamp(g, -t.rx, -4, t.rx, 12, gold);
    g.stroke();
    front(g);
    g.lineWidth = 1.6;
    g.strokeStyle = rgba('#fff6c8', 0.7);
    g.translate(0, -2.5);
    g.stroke();
    g.restore();
  });
  glint(g, t.cx - t.rx * 0.45, yy + 6, 5, 0.95);
}

registerStyle('titantoes', {
  contactY: 270,
  halfWidth: 108,
  rig: BARE_RIG,
  leg: { kind: 'skin', hw: 56, join: 'blend', fade: 28 },
  draw(ctx, art, p, o) {
    if (o.emissive || o.heat) return;
    const stone = art.skin;
    const f = paintBare(ctx, { ...TITAN_LOOK, skin: stone }, p);
    titanStone(f.sil.g, f, stone, art.primary ?? '#6a5a4e', art.secondary ?? '#d9a441');
    f.sil.edge(rgba('#0c0a14', 0.42), 24, LX * 13, LY * 13);
    f.sil.edge(rgba(LIGHT.rim, 0.4), 2.5, LX * 3, LY * 3);
    f.sil.finish(inkOf(stone), { openTop: f.top + 1.5 });
  },
});

// ════════════════════════════ SKELETON HOPLITE ════════════════════════════

export const HOPLITE_CREST = { x: CX + 46, y: 8 };
export const HOPLITE_SHIELD = { x: CX, y: 150, r: 80 };

const greavePath: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 54, -6);
  c.bezierCurveTo(CX - 58, 30, CX - 74, 60, CX - 72, 110);
  c.lineTo(CX + 72, 110);
  c.bezierCurveTo(CX + 74, 60, CX + 58, 30, CX + 54, -6);
  c.closePath();
};

const HOP_BONES: Digit[] = [
  { x: CX - 72, y: 188, a: Math.PI / 2 + 0.3, len: 64, wr: 7, wt: 6.5 },
  { x: CX - 38, y: 196, a: Math.PI / 2 + 0.14, len: 70, wr: 7.5, wt: 7 },
  { x: CX - 2, y: 200, a: Math.PI / 2 + 0.02, len: 72, wr: 8, wt: 7.5 },
  { x: CX + 36, y: 198, a: Math.PI / 2 - 0.1, len: 72, wr: 8.5, wt: 8 },
  { x: CX + 76, y: 190, a: Math.PI / 2 - 0.24, len: 70, wr: 10.5, wt: 10 },
];

function hopliteBones(p: Pose): Digit[] {
  return poseDigits(HOP_BONES, p, { spread: 0.18 });
}

/** A bone's path: a slender shaft with a knobbed joint at each end. */
function bonePaths(d: Digit): PathFn[] {
  const shaft = digitPath(d, -0.38);
  const [mx, my] = onDigit(d, 0.52);
  const [tx, ty] = onDigit(d, 1);
  return [shaft, ell(mx, my, d.wr * 1.35, d.wr * 1.05, d.a), ell(tx, ty, d.wt * 1.2, d.wt * 1.05, d.a)];
}

function paintBone(g: Ctx, d: Digit, bone: string, box: Box): void {
  for (const pth of bonePaths(d)) {
    clipTo(g, pth, () => {
      g.fillStyle = lin(g, ...onDigit(d, 0.5, 1.2), ...onDigit(d, 0.5, -1.2), [
        [0, shade(bone, 0.18)],
        [0.45, bone],
        [1, mix(shade(bone, -0.5), '#2a2a40', 0.3)],
      ]);
      g.fillRect(box.x, box.y, box.w, box.h);
      texture(g, 'pores', box, 0.3, 1, 'soft-light');
    });
  }
  // the joint's crack line and a lit ridge down the shaft
  const [ax, ay] = onDigit(d, 0.52, 1.1);
  const [bx, by] = onDigit(d, 0.52, -1.1);
  crease(g, (c) => {
    c.moveTo(ax, ay);
    c.lineTo(bx, by);
  }, 1.2, '#3a3020', 0.5, 0.3);
  softStroke(g, (c) => {
    c.moveTo(...onDigit(d, 0.08, 0.35));
    c.lineTo(...onDigit(d, 0.9, 0.35));
  }, rgba('#fffaf0', 0.45), 2.2, 1);
}

/** The hoplon: a bronze rim with studs, the lambda on red, a polished boss. */
function hoplon(g: Ctx, bronzeCol: string, red: string): void {
  const { x, y, r } = HOPLITE_SHIELD;
  const disc = ell(x, y, r, r);
  contact(g, (c) => {
    disc(c);
    c.fill();
  }, 0.65, 5, 7);
  bronze(g, disc, { x: x - r, y: y - r, w: r * 2, h: r * 2 }, bronzeCol, 81, 0.18, false);
  const face = ell(x, y, r * 0.78, r * 0.78);
  contact(g, (c) => {
    face(c);
    c.lineWidth = 3;
    c.stroke();
  }, 0.5, 1.5, 2);
  clipTo(g, face, () => {
    g.fillStyle = rad(g, x - 20, y - 24, 4, x, y, r * 0.8, [
      [0, shade(red, 0.3)],
      [0.55, red],
      [1, shade(red, -0.5)],
    ]);
    g.fillRect(x - r, y - r, r * 2, r * 2);
    texture(g, 'grain', { x: x - r, y: y - r, w: r * 2, h: r * 2 }, 0.2, 1);
    // worn, chipped paint showing bronze through
    blotches(g, { x: x - r, y: y - r, w: r * 2, h: r * 2 }, shade(bronzeCol, -0.2), 0.7, 9, 0.74, 0.03, 83);
  });
  // the lambda in black, painted on
  const lam: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 32, y + 38);
    c.lineTo(x - 5, y - 40);
    c.lineTo(x + 5, y - 40);
    c.lineTo(x + 34, y + 38);
    c.lineTo(x + 22, y + 38);
    c.lineTo(x, y - 20);
    c.lineTo(x - 20, y + 38);
    c.closePath();
  };
  clipTo(g, face, () => fillPath(g, lam, rgba('#1a0e0a', 0.88)));
  // the rim's studs
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    rivet(g, x + Math.cos(a) * r * 0.89, y + Math.sin(a) * r * 0.89, 3.2, mix(bronzeCol, '#ffe8b0', 0.2));
  }
  // a polished sweep across the bronze
  clipTo(g, disc, () => {
    g.strokeStyle = rgba('#fff4d0', 0.5);
    g.lineWidth = 4;
    g.beginPath();
    g.arc(x, y, r * 0.88, Math.PI * 1.05, Math.PI * 1.45);
    g.stroke();
  });
  glint(g, x - r * 0.62, y - r * 0.62, 7, 0.95);
}

/** The horsehair crest: a red fan of hair on a bronze stem, swaying from its root. */
function hopliteCrest(g: Ctx, red: string): void {
  const { x, y } = HOPLITE_CREST;
  g.save();
  g.translate(x + 3, y + 3);
  g.scale(1.35, 1.35);
  g.translate(-x - 3, -y - 3);
  const fan: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x, y);
    c.bezierCurveTo(x + 10, y - 24, x + 48, y - 30, x + 66, y - 6);
    c.bezierCurveTo(x + 72, y + 10, x + 66, y + 30, x + 54, y + 44);
    c.quadraticCurveTo(x + 36, y + 20, x + 6, y + 8);
    c.closePath();
  };
  prop(g, [fan], { x: x - 6, y: y - 34, w: 84, h: 84 }, (pg) => {
    pg.fillStyle = lin(pg, x, y - 30, x + 60, y + 40, [
      [0, shade(red, 0.35)],
      [0.5, red],
      [1, shade(red, -0.45)],
    ]);
    pg.fillRect(x - 6, y - 34, 84, 84);
    const r = rng(hashStr('hop-crest'));
    pg.lineCap = 'round';
    for (let i = 0; i < 160; i++) {
      const a = -0.9 + r() * 1.9;
      const l = 40 + r() * 30;
      pg.strokeStyle = rgba(r() < 0.5 ? shade(red, -0.45) : shade(red, 0.4), 0.35 + r() * 0.3);
      pg.lineWidth = 0.8 + r();
      pg.beginPath();
      pg.moveTo(x + 2, y + 2);
      pg.quadraticCurveTo(x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5 - 6, x + Math.cos(a) * l, y + Math.sin(a) * l);
      pg.stroke();
    }
    pg.fillStyle = goldRamp(pg, x - 4, y - 4, x + 8, y + 8, '#c9873a');
    pg.beginPath();
    pg.arc(x + 3, y + 3, 5, 0, Math.PI * 2);
    pg.fill();
  }, inkOf(red), { w: 3.5 });
  g.restore();
}

function drawHoplite(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  if (o.emissive || o.heat) return;
  const bone = art.skin;
  const bronzeCol = art.primary ?? '#c9873a';
  const red = art.secondary ?? '#c8102e';
  const ds = hopliteBones(p);
  const bones = ds.flatMap(bonePaths);
  const box = { x: CX - 120, y: -8, w: 240, h: 290 };
  const disc = ell(HOPLITE_SHIELD.x, HOPLITE_SHIELD.y, HOPLITE_SHIELD.r, HOPLITE_SHIELD.r);
  const sil = new Sil(ctx, [greavePath, ...bones, disc], box);
  const g = sil.g;
  // the bones first: the shield hides their roots
  g.fillStyle = '#1a1420';
  g.fillRect(box.x, box.y, box.w, box.h);
  for (const d of ds) {
    contact(g, (c) => {
      for (const pth of bonePaths(d)) {
        pth(c);
        c.fill();
      }
    }, 0.6, 3, 3);
    paintBone(g, d, bone, box);
  }
  // the greave: bronze shaped to a shin, its embossed rim
  bronze(g, greavePath, { x: CX - 76, y: -8, w: 152, h: 120 }, bronzeCol, 85, 0.15);
  clipTo(g, greavePath, () => {
    softStroke(g, (c) => {
      c.moveTo(CX - 20, -6);
      c.bezierCurveTo(CX - 30, 40, CX - 10, 80, CX - 24, 110);
    }, rgba('#fff4d0', 0.35), 8, 5);
    softStroke(g, (c) => {
      c.moveTo(CX + 28, -6);
      c.bezierCurveTo(CX + 36, 40, CX + 22, 80, CX + 34, 110);
    }, rgba('#2a1408', 0.35), 10, 6);
    for (const y of [4, 12]) crease(g, (c) => {
      c.moveTo(CX - 60, y);
      c.quadraticCurveTo(CX, y + 6, CX + 60, y);
    }, 1.6, '#3a1a08', 0.5, 0.4);
  });
  hoplon(g, bronzeCol, red);
  sil.edge(rgba('#0a0610', 0.38), 18, LX * 10, LY * 10);
  sil.edge(rgba(LIGHT.rim, 0.55), 2.5, LX * 3, LY * 3);
  sil.finish(inkOf(bronzeCol), { openTop: -5 });
  if (!o.live) hopliteCrest(ctx, red);
}

registerStyle('hoplite', {
  contactY: 270,
  halfWidth: 104,
  rig: { from: 226, to: 240 },
  leg: { kind: 'skin', hw: 40, join: 'into' },
  parts: {
    crest: { box: { x: HOPLITE_CREST.x - 12, y: HOPLITE_CREST.y - 52, w: 124, h: 124 }, frames: 1, pivot: [HOPLITE_CREST.x + 3, HOPLITE_CREST.y + 3], draw: (g, art) => hopliteCrest(g, art.secondary ?? '#c8102e') },
  },
  draw: drawHoplite,
});

// ════════════════════════════ SIREN SLIPPERS ════════════════════════════

export const SIREN_FINS: P2[] = [
  [CX - 82, 92],
  [CX + 90, 96],
];

const SIREN_LOOK = { nails: '#7ad8d0', pores: 0.12, shadowTint: '#8a3a5a', detail: 0.5 };

/** The slipper's scalloped hem above the toes. */
const sirenUpper: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 140, 34);
  c.quadraticCurveTo(CX, 46, CX + 140, 34);
  c.lineTo(CX + 140, 150);
  for (let i = 0; i <= 8; i++) {
    const x = CX + 120 - i * 30;
    c.quadraticCurveTo(x + 15, 186 - Math.abs(i - 4) * 4, x, 166 - Math.abs(i - 4) * 5);
  }
  c.lineTo(CX - 140, 150);
  c.closePath();
};

function sirenFin(g: Ctx, side: number, teal: string): void {
  const [x, y] = SIREN_FINS[side < 0 ? 0 : 1];
  const fin: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x, y - 18);
    c.bezierCurveTo(x + side * 20, y - 40, x + side * 50, y - 36, x + side * 56, y - 30);
    c.quadraticCurveTo(x + side * 46, y - 10, x + side * 54, y + 6);
    c.quadraticCurveTo(x + side * 40, y + 4, x + side * 44, y + 22);
    c.quadraticCurveTo(x + side * 22, y + 16, x, y + 18);
    c.closePath();
  };
  prop(g, [fin], { x: x - 64, y: y - 48, w: 128, h: 80 }, (pg) => {
    pg.fillStyle = lin(pg, x, y - 30, x + side * 56, y + 20, [
      [0, rgba(shade(teal, -0.1), 0.95)],
      [0.6, rgba(mix(teal, '#bff8f0', 0.35), 0.85)],
      [1, rgba(mix(teal, '#ffffff', 0.6), 0.75)],
    ]);
    pg.fillRect(x - 64, y - 48, 128, 80);
    // fin rays
    pg.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const a = -0.75 + i * 0.22;
      pg.strokeStyle = rgba(shade(teal, -0.4), 0.55);
      pg.lineWidth = 1.6;
      pg.beginPath();
      pg.moveTo(x, y);
      pg.quadraticCurveTo(x + side * 26, y + Math.sin(a) * 18, x + side * 56 * Math.cos(a * 0.4), y + Math.sin(a) * 34);
      pg.stroke();
      pg.strokeStyle = rgba('#e8fffa', 0.4);
      pg.lineWidth = 0.8;
      pg.stroke();
    }
    spec(pg, x + side * 22, y - 20, 14, 5, 0.55, -0.3 * side);
  }, inkOf(teal), { w: 3.5 });
}

/** A scallop shell (pink, ribbed) centred at x, y. */
function scallop(g: Ctx, x: number, y: number, s: number, col: string): void {
  const shell: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x, y + 18 * s);
    c.lineTo(x - 22 * s, y - 2 * s);
    c.quadraticCurveTo(x - 20 * s, y - 22 * s, x, y - 24 * s);
    c.quadraticCurveTo(x + 20 * s, y - 22 * s, x + 22 * s, y - 2 * s);
    c.closePath();
    c.moveTo(x - 8 * s, y + 14 * s);
    c.rect(x - 9 * s, y + 12 * s, 18 * s, 8 * s);
  };
  raised(g, shell, rad(g, x - 6 * s, y - 14 * s, 2, x, y, 26 * s, [
    [0, mix(col, '#ffffff', 0.6)],
    [0.6, col],
    [1, shade(col, -0.35)],
  ]), 0.55, 2.4);
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (1.08 + i * 0.14);
    crease(g, (c) => {
      c.moveTo(x, y + 16 * s);
      c.lineTo(x + Math.cos(a) * 24 * s, y + 16 * s + Math.sin(a) * 36 * s);
    }, 1.5 * s, shade(col, -0.5), 0.45, 0.45);
  }
  g.strokeStyle = rgba(shade(col, -0.5), 0.8);
  g.lineWidth = 1.6;
  shell(g);
  g.stroke();
  spec(g, x - 7 * s, y - 12 * s, 8 * s, 4 * s, 0.6, -0.5);
}

function drawSiren(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  if (o.emissive || o.heat) return;
  const teal = art.primary ?? '#3aa8a0';
  const pearlCol = art.secondary ?? '#f4efe8';
  if (!o.live) for (const s of [-1, 1]) sirenFin(ctx, s, teal);
  const f = paintBare(ctx, { ...SIREN_LOOK, skin: art.skin, nails: art.nails ?? '#7ad8d0' }, p);
  const g = f.sil.g;
  // the slipper: mermaid scales over the foot down to a scalloped hem
  contact(g, (c) => {
    sirenUpper(c);
    c.fill();
  }, 0.55, 3, 5);
  clipTo(g, sirenUpper, () => {
    paint(g, (c) => {
      c.beginPath();
      c.rect(f.box.x, f.box.y, f.box.w, f.box.h);
    }, f.box, 'scales', teal);
    const r = rng(hashStr('siren-scales'));
    // each scale lit on its upper rim, an iridescent sheen across them
    for (let row = 0; row < 9; row++)
      for (let i = 0; i < 12; i++) {
        const x = CX - 120 + i * 21 + (row % 2 ? 10.5 : 0);
        const y = 40 + row * 15;
        const sc: PathFn = (c) => {
          c.beginPath();
          c.moveTo(x - 10.5, y);
          c.quadraticCurveTo(x - 10.5, y + 14, x, y + 16);
          c.quadraticCurveTo(x + 10.5, y + 14, x + 10.5, y);
        };
        g.strokeStyle = rgba(shade(teal, -0.55), 0.45);
        g.lineWidth = 1.6;
        sc(g);
        g.stroke();
        g.strokeStyle = rgba('#d8fff8', 0.18 + r() * 0.2);
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x - 8, y + 3);
        g.quadraticCurveTo(x - 7, y + 11, x, y + 12);
        g.stroke();
      }
    g.globalCompositeOperation = 'overlay';
    g.fillStyle = lin(g, CX - 100, 40, CX + 100, 170, [
      [0, rgba('#9af8ff', 0.4)],
      [0.45, rgba('#3aa8a0', 0)],
      [0.7, rgba('#c890ff', 0.35)],
      [1, rgba('#3a60c8', 0.3)],
    ]);
    g.fillRect(f.box.x, 30, f.box.w, 160);
    g.globalCompositeOperation = 'source-over';
    // the hem shades the toes below it; its edge is lit
    g.strokeStyle = rgba('#e8fffa', 0.5);
    g.lineWidth = 2;
    g.translate(0, -1.5);
    sirenUpper(g);
    g.stroke();
    g.translate(0, 1.5);
  });
  // the slipper's opening at the ankle: a pearl-trimmed edge
  const top = quad(CX - 60, 38, CX, 50, CX + 64, 38, 12);
  for (const [x, y] of top) pearl(g, x, y, 4.4);
  // a looping strand of pearls across the instep, the scallop shell where it meets
  const loop = quad(CX - 92, 110, CX, 178, CX + 100, 112, 18);
  for (const [i, [x, y]] of loop.entries()) if (i % 1 === 0) pearl(g, x, y, 4.6);
  scallop(g, CX + 4, 116, 1.15, '#f2a8b8');
  pearl(g, CX + 4, 140, 6.5);
  // pearls on the big toe's nail
  const big = f.toes[4];
  const [bx, by] = onToe(big, Math.PI / 2);
  pearl(g, bx - 2, by - big.ry * 0.62, 4);
  void pearlCol;
  f.sil.edge(rgba('#1a0a20', 0.32), 20, LX * 11, LY * 11);
  f.sil.edge(rgba(LIGHT.rim, 0.5), 2.5, LX * 3, LY * 3);
  f.sil.finish(inkOf(mix(art.skin, teal, 0.5)), { openTop: f.top + 1.5 });
}

registerStyle('siren', {
  contactY: 260,
  halfWidth: 100,
  rig: BARE_RIG,
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 24 },
  parts: {
    finL: { box: { x: SIREN_FINS[0][0] - 66, y: SIREN_FINS[0][1] - 50, w: 76, h: 84 }, frames: 1, pivot: SIREN_FINS[0], draw: (g, art) => sirenFin(g, -1, art.primary ?? '#3aa8a0') },
    finR: { box: { x: SIREN_FINS[1][0] - 10, y: SIREN_FINS[1][1] - 50, w: 76, h: 84 }, frames: 1, pivot: SIREN_FINS[1], draw: (g, art) => sirenFin(g, 1, art.primary ?? '#3aa8a0') },
  },
  draw: drawSiren,
});

// ════════════════════════════ GORGON SNAKE ════════════════════════════

/** The snake's spine, from the leg down to its head. */
const SNAKE: P2[] = (() => {
  const pts: P2[] = [];
  const n = 44;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // it hangs off the leg and swings out in wide S-bends: three full turns, wide as the old coil
    const amp = 78 * Math.min(1, t * 3.2) * (1 - t * 0.15);
    pts.push([CX + Math.sin(t * Math.PI * 3) * amp, -6 + t * 222]);
  }
  return pts;
})();
const SNAKE_W = (s: number) => 50 - s * 14;
export const SNAKE_HEAD = { x: SNAKE[SNAKE.length - 1][0] - 4, y: 238 };

const snakeHead: PathFn = (c) => {
  const { x, y } = SNAKE_HEAD;
  c.beginPath();
  c.moveTo(x - 26, y - 22);
  c.bezierCurveTo(x - 36, y - 2, x - 26, y + 22, x - 2, y + 28);
  c.bezierCurveTo(x + 20, y + 30, x + 36, y + 14, x + 34, y - 6);
  c.bezierCurveTo(x + 30, y - 22, x + 10, y - 30, x - 26, y - 22);
  c.closePath();
};

function snakeTongue(g: Ctx, out: number): void {
  if (out <= 0) return;
  const { x, y } = SNAKE_HEAD;
  const L = 26 * out;
  g.save();
  g.lineCap = 'round';
  g.strokeStyle = '#4a0610';
  g.lineWidth = 4.4;
  const path = () => {
    g.beginPath();
    g.moveTo(x + 18, y + 20);
    g.quadraticCurveTo(x + 22 + L * 0.3, y + 24 + L * 0.5, x + 22 + L * 0.55, y + 22 + L * 0.85);
    g.moveTo(x + 22 + L * 0.55, y + 22 + L * 0.85);
    g.lineTo(x + 14 + L * 0.6, y + 26 + L * 1.05);
    g.moveTo(x + 22 + L * 0.55, y + 22 + L * 0.85);
    g.lineTo(x + 32 + L * 0.55, y + 22 + L * 1.02);
  };
  path();
  g.stroke();
  g.strokeStyle = '#e8243a';
  g.lineWidth = 2.4;
  path();
  g.stroke();
  g.restore();
}

function drawSnake(ctx: Ctx, art: FootArt, _p: Pose, o: Opts): void {
  if (o.emissive || o.heat) return;
  const green = art.skin;
  const belly = art.secondary ?? '#e8d36a';
  const body = tubePath(SNAKE, SNAKE_W, false);
  const box = { x: CX - 120, y: -8, w: 240, h: 290 };
  const sil = new Sil(ctx, [body, snakeHead], box);
  const g = sil.g;
  sil.form({ base: green, shadowTint: '#0a2838', ramp: 0.8, form: 0.45, formSize: 14, bevel: 0.35, rim: 0.5 });
  // the body as a lit cylinder along its length: shade across each segment
  for (let j = 0; j < SNAKE.length - 1; j++) {
    const w = SNAKE_W(j / (SNAKE.length - 1));
    const [ax, ay] = beside(SNAKE, j, w);
    const [bx, by] = beside(SNAKE, j, -w);
    const seg: PathFn = (c) => {
      const [cx2, cy2] = beside(SNAKE, j + 1, -w);
      const [dx, dy] = beside(SNAKE, j + 1, w);
      c.beginPath();
      c.moveTo(ax, ay);
      c.lineTo(bx, by);
      c.lineTo(cx2, cy2);
      c.lineTo(dx, dy);
      c.closePath();
    };
    seg(g);
    // which side faces the light
    const lit = (ax - bx) * LX + (ay - by) * LY < 0;
    g.fillStyle = lin(g, ax, ay, bx, by, lit ? [
      [0, rgba('#000000', 0.25)],
      [0.35, rgba('#fffbe0', 0.18)],
      [0.6, rgba('#000000', 0)],
      [1, rgba('#000000', 0.4)],
    ] : [
      [0, rgba('#000000', 0.4)],
      [0.4, rgba('#000000', 0)],
      [0.65, rgba('#fffbe0', 0.18)],
      [1, rgba('#000000', 0.25)],
    ]);
    g.fill();
  }
  texture(g, 'scales', box, 0.55, 0.9);
  // the belly: pale yellow scutes along one side of the body
  const bellyPts = SNAKE.map((_, j) => beside(SNAKE, j, -SNAKE_W(j / (SNAKE.length - 1)) * 0.62));
  softStroke(g, (c) => bellyPts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))), rgba(belly, 0.95), 15, 1.2);
  for (let j = 1; j < SNAKE.length - 1; j++) {
    const w = SNAKE_W(j / (SNAKE.length - 1));
    const [ax, ay] = beside(SNAKE, j, -w * 0.25);
    const [bx, by] = beside(SNAKE, j, -w);
    crease(g, (c) => {
      c.moveTo(ax, ay);
      c.lineTo(bx, by);
    }, 1.1, shade(belly, -0.55), 0.45, 0.2);
  }
  // dark diamonds down its back
  for (let j = 3; j < SNAKE.length - 2; j += 3) {
    const w = SNAKE_W(j / (SNAKE.length - 1));
    const [x, y] = beside(SNAKE, j, w * 0.25);
    const [nx, ny] = SNAKE[j + 1];
    const a = Math.atan2(ny - SNAKE[j][1], nx - SNAKE[j][0]);
    const dm: PathFn = (c) => {
      c.save();
      c.translate(x, y);
      c.rotate(a);
      c.beginPath();
      c.moveTo(-w * 0.55, 0);
      c.lineTo(0, -w * 0.26);
      c.lineTo(w * 0.55, 0);
      c.lineTo(0, w * 0.26);
      c.closePath();
      c.restore();
    };
    fillPath(g, dm, rgba(mix(shade(art.primary ?? '#4f8a3a', -0.45), '#0a1a10', 0.3), 0.85));
    g.save();
    g.strokeStyle = rgba(mix(belly, '#ffffff', 0.3), 0.5);
    g.lineWidth = 1.2;
    dm(g);
    g.stroke();
    g.restore();
  }
  // the head: a wedge, a heavy brow over a slit-pupil eye, nostrils, the mouth line
  const { x, y } = SNAKE_HEAD;
  contact(g, (c) => {
    snakeHead(c);
    c.fill();
  }, 0.6, 3, 4);
  clipTo(g, snakeHead, () => {
    g.fillStyle = rad(g, x - 10, y - 12, 3, x, y, 40, [
      [0, shade(green, 0.3)],
      [0.55, green],
      [1, shade(green, -0.5)],
    ]);
    g.fillRect(x - 40, y - 34, 80, 70);
    texture(g, 'scales', { x: x - 40, y: y - 34, w: 80, h: 70 }, 0.4, 0.7);
    fillPath(g, ell(x + 6, y + 20, 26, 8, 0.25), rgba(belly, 0.7));
  });
  crease(g, (c) => {
    c.moveTo(x - 20, y + 10);
    c.quadraticCurveTo(x + 6, y + 22, x + 28, y + 12);
  }, 1.8, '#0a1a08', 0.7, 0.3);
  for (const [nx, ny] of [[x + 22, y - 4], [x + 28, y]] as const) fillPath(g, ell(nx, ny, 1.8, 1.3), '#0a1408');
  const ex = x - 2;
  const ey = y - 8;
  raised(g, ell(ex, ey, 9, 7.5), rad(g, ex - 2, ey - 2, 1, ex, ey, 9, [
    [0, '#fff8a0'],
    [0.6, '#e8c020'],
    [1, '#7a5a08'],
  ]), 0.45, 1.5);
  fillPath(g, ell(ex, ey, 1.6, 6.2), '#0a0604');
  spec(g, ex - 3, ey - 3, 3, 2, 0.95, -0.5);
  crease(g, (c) => {
    c.moveTo(ex - 12, ey - 6);
    c.quadraticCurveTo(ex, ey - 14, ex + 12, ey - 8);
  }, 2.6, '#0a1a08', 0.6, 0.3);
  sil.edge(rgba('#06141a', 0.4), 14, LX * 8, LY * 8);
  sil.edge(rgba(LIGHT.rim, 0.55), 2.5, LX * 3, LY * 3);
  sil.finish(inkOf(green), { openTop: -5 });
  if (!o.live) snakeTongue(ctx, 1);
}

registerStyle('gorgonsnake', {
  contactY: 270,
  halfWidth: 96,
  leg: { kind: 'skin', hw: 48, join: 'blend', fade: 22 },
  parts: {
    tongue: { box: { x: SNAKE_HEAD.x + 8, y: SNAKE_HEAD.y + 10, w: 50, h: 50 }, frames: 2, draw: (g, _art, i) => snakeTongue(g, i) },
  },
  draw: drawSnake,
});

// ════════════════════════════ PERSIAN ELEPHANT FEET ════════════════════════════

export const ELEPHANT_TASSELS: P2[] = [
  [CX - 76, 60],
  [CX + 78, 60],
];

const elephantBody: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 74, -6);
  c.bezierCurveTo(CX - 78, 60, CX - 100, 130, CX - 102, 200);
  c.bezierCurveTo(CX - 104, 246, CX - 80, 262, CX, 264);
  c.bezierCurveTo(CX + 80, 262, CX + 104, 246, CX + 102, 200);
  c.bezierCurveTo(CX + 100, 130, CX + 78, 60, CX + 74, -6);
  c.closePath();
};

const caparison: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 82, -6);
  c.lineTo(CX + 82, -6);
  c.lineTo(CX + 86, 56);
  c.quadraticCurveTo(CX, 66, CX - 86, 56);
  c.closePath();
};

function elephantNails(p: Pose): PathFn[] {
  const c = Math.max(0, p.curl);
  const s = Math.max(0, -p.curl);
  return [-66, -24, 20, 62].map((dx, i) => {
    const w = p.wiggle[i] ?? 0;
    const x = CX + dx * (1 + s * 0.06);
    const y = 238 - c * 6 + w * 1.5;
    return (k: Ctx) => {
      k.beginPath();
      k.moveTo(x - 17, y + 20);
      k.bezierCurveTo(x - 19, y - 4, x - 10, y - 12, x, y - 12);
      k.bezierCurveTo(x + 10, y - 12, x + 19, y - 4, x + 17, y + 20);
      k.quadraticCurveTo(x, y + 26, x - 17, y + 20);
      k.closePath();
    };
  });
}

/** A gold tassel on a cord: a bead, a bound head and a skirt of threads. */
function tassel(g: Ctx, x: number, y: number, gold: string): void {
  const head: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 1.5, y);
    c.lineTo(x + 1.5, y);
    c.lineTo(x + 2, y + 10);
    c.bezierCurveTo(x + 8, y + 12, x + 9, y + 18, x + 8, y + 22);
    c.lineTo(x + 10, y + 42);
    c.quadraticCurveTo(x, y + 46, x - 10, y + 42);
    c.lineTo(x - 8, y + 22);
    c.bezierCurveTo(x - 9, y + 18, x - 8, y + 12, x - 2, y + 10);
    c.closePath();
  };
  prop(g, [head], { x: x - 14, y: y - 4, w: 28, h: 54 }, (pg) => {
    pg.fillStyle = goldRamp(pg, x - 10, y, x + 10, y + 46, gold);
    pg.fillRect(x - 14, y - 4, 28, 54);
    pg.strokeStyle = rgba(shade(gold, -0.55), 0.6);
    pg.lineWidth = 0.9;
    for (let i = -8; i <= 8; i += 2.2) {
      pg.beginPath();
      pg.moveTo(x + i * 0.8, y + 24);
      pg.lineTo(x + i, y + 44);
      pg.stroke();
    }
    pg.fillStyle = shade(gold, -0.4);
    pg.fillRect(x - 9, y + 20, 18, 3);
    glint(pg, x - 3, y + 15, 3, 0.9);
  }, inkOf(gold), { w: 2.6 });
}

function drawElephant(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  if (o.emissive || o.heat) return;
  const skin = art.skin;
  const red = art.primary ?? '#b8202a';
  const gold = art.secondary ?? '#e8b43a';
  const ivory = art.nails ?? '#efe6d0';
  const nails = elephantNails(p);
  const box = { x: CX - 116, y: -8, w: 232, h: 280 };
  // the gold fringe: small tassels along the caparison's hem (part of the silhouette)
  const fringe: PathFn[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = CX - 82 + t * 164;
    const y = 56 + Math.sin(t * Math.PI) * 9;
    fringe.push((c) => {
      c.beginPath();
      c.moveTo(x - 4, y - 2);
      c.lineTo(x + 4, y - 2);
      c.lineTo(x + 5, y + 14);
      c.quadraticCurveTo(x, y + 18, x - 5, y + 14);
      c.closePath();
    });
  }
  const sil = new Sil(ctx, [elephantBody, caparison, ...fringe, ...nails], box);
  const g = sil.g;
  const deep = mix(shade(skin, -0.55), '#141828', 0.35);
  sil.form({ base: skin, shadowTint: '#1a1830', ramp: 0.75, form: 0.5, formSize: 30, bevel: 0.3, rim: 0.5 });
  texture(g, 'cast', box, 0.35, 1.3, 'soft-light');
  texture(g, 'pores', box, 0.3, 1.6, 'soft-light');
  // wrinkles: deep folds ringing the column, a finer crazing between them
  const r = rng(hashStr('elephant-wrinkles'));
  for (let k = 0; k < 11; k++) {
    const y = 76 + k * 15 + (r() - 0.5) * 4;
    const hw = 86 + k * 1.4;
    const x0 = CX - hw + r() * 20;
    const x1 = CX + hw - r() * 20;
    crease(g, (c) => {
      c.moveTo(x0, y - 4);
      c.bezierCurveTo(CX - 40, y + 8 + r() * 4, CX + 30, y + 4 + r() * 6, x1, y - 6);
    }, 2.2, deep, 0.55, 0.35);
  }
  g.strokeStyle = rgba(deep, 0.18);
  g.lineWidth = 0.9;
  for (let i = 0; i < 70; i++) {
    const x = CX - 90 + r() * 180;
    const y = 70 + r() * 170;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (r() - 0.5) * 12, y + (r() - 0.5) * 8);
    g.stroke();
  }
  // dust caked round the base
  softFill(g, ell(CX, 250, 110, 26), rgba('#a89070', 0.25), 10);
  // the toenails: ivory, ridged, sitting in folds of skin
  for (const n of nails) {
    contact(g, (c) => {
      n(c);
      c.fill();
    }, 0.6, 3, 4);
    clipTo(g, n, () => {
      g.fillStyle = lin(g, CX - 100, 220, CX + 100, 268, [
        [0, mix(ivory, '#ffffff', 0.4)],
        [0.5, ivory],
        [1, shade(ivory, -0.35)],
      ]);
      g.fillRect(CX - 120, 200, 240, 80);
      texture(g, 'grain', { x: CX - 120, y: 200, w: 240, h: 80 }, 0.3);
      for (const dy of [8, 16]) crease(g, (c) => {
        c.moveTo(CX - 120, 228 + dy);
        c.lineTo(CX + 120, 228 + dy);
      }, 1, shade(ivory, -0.5), 0.3, 0.3);
    });
  }
  for (const [i, dx] of [-66, -24, 20, 62].entries()) spec(g, CX + dx - 6, 232 - Math.max(0, p.curl) * 6, 5, 8, 0.75 - i * 0.12, 0.2);
  // the caparison: red wool, a gold embroidered band of diamonds between gold stripes
  contact(g, (c) => {
    caparison(c);
    c.fill();
  }, 0.7, 4, 6);
  clipTo(g, caparison, () => {
    paint(g, (c) => {
      c.beginPath();
      c.rect(CX - 90, -8, 180, 80);
    }, { x: CX - 90, y: -8, w: 180, h: 80 }, 'canvas', red);
    texture(g, 'grain', { x: CX - 90, y: -8, w: 180, h: 80 }, 0.25);
    for (const y of [10, 40]) {
      g.fillStyle = goldRamp(g, 0, y - 2, 0, y + 3, gold);
      g.fillRect(CX - 90, y - 2, 180, 4.5);
    }
    for (let i = 0; i < 8; i++) {
      const x = CX - 70 + i * 20;
      const dm: PathFn = (c) => {
        c.beginPath();
        c.moveTo(x, 15);
        c.lineTo(x + 8, 25);
        c.lineTo(x, 35);
        c.lineTo(x - 8, 25);
        c.closePath();
      };
      fillPath(g, dm, goldRamp(g, x - 8, 15, x + 8, 35, gold));
      fillPath(g, ell(x, 25, 2.6, 2.6), i % 2 ? '#2a6ad8' : '#1a9a6a');
    }
    stitches(g, (c) => {
      c.moveTo(CX - 86, 52);
      c.quadraticCurveTo(CX, 62, CX + 86, 52);
    }, rgba(gold, 0.8), 1.2, 3, 2.5);
  });
  // the gold fringe
  for (const fr of fringe) {
    contact(g, (c) => {
      fr(c);
      c.fill();
    }, 0.5, 2, 2.5);
    fillPath(g, fr, goldRamp(g, CX - 90, 54, CX + 90, 74, gold));
  }
  // the bronze plate band with studs
  const plate: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 70, 84);
    c.quadraticCurveTo(CX, 96, CX + 70, 84);
    c.lineTo(CX + 72, 104);
    c.quadraticCurveTo(CX, 116, CX - 72, 104);
    c.closePath();
  };
  contact(g, (c) => {
    plate(c);
    c.fill();
  }, 0.6, 3, 4);
  bronze(g, plate, { x: CX - 74, y: 82, w: 148, h: 34 }, '#c9873a', 91, 0.1);
  for (let i = 0; i < 7; i++) {
    const t = (i + 0.5) / 7;
    rivet(g, CX - 64 + t * 128, 94 + Math.sin(t * Math.PI) * 6, 3.6, '#e8c070');
  }
  sil.edge(rgba('#06080e', 0.4), 22, LX * 12, LY * 12);
  sil.edge(rgba(LIGHT.rim, 0.5), 2.5, LX * 3, LY * 3);
  sil.finish(inkOf(skin), { openTop: -5 });
  if (!o.live) for (const [x, y] of ELEPHANT_TASSELS) tassel(ctx, x, y, gold);
}

registerStyle('elephant', {
  contactY: 264,
  halfWidth: 108,
  rig: { from: 212, to: 228 },
  leg: { kind: 'skin', hw: 68, join: 'into' },
  parts: Object.fromEntries(
    ELEPHANT_TASSELS.map(([x, y], i): [string, PartDef] => [`tassel${i}`, { box: { x: x - 16, y: y - 6, w: 32, h: 58 }, frames: 1, pivot: [x, y], draw: (g, art) => tassel(g, x, y, art.secondary ?? '#e8b43a') }]),
  ),
  draw: drawElephant,
});

// ════════════════════════════ SPARTAN SANDALS ════════════════════════════

export const SPARTAN_CLOAK = { x: CX - 58, y: 6 };

const spartanGreave: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 54, -6);
  c.bezierCurveTo(CX - 58, 24, CX - 64, 50, CX - 60, 76);
  c.quadraticCurveTo(CX, 96, CX + 62, 76);
  c.bezierCurveTo(CX + 66, 50, CX + 60, 24, CX + 56, -6);
  c.closePath();
};

function spartanCloak(g: Ctx, red: string): void {
  const { x, y } = SPARTAN_CLOAK;
  const cloth: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x + 4, y - 4);
    c.bezierCurveTo(x - 20, y + 4, x - 40, y + 30, x - 50, y + 74);
    c.lineTo(x - 36, y + 66);
    c.lineTo(x - 30, y + 84);
    c.lineTo(x - 18, y + 70);
    c.lineTo(x - 8, y + 86);
    c.bezierCurveTo(x - 10, y + 50, x - 2, y + 24, x + 10, y + 10);
    c.closePath();
  };
  prop(g, [cloth], { x: x - 56, y: y - 10, w: 72, h: 100 }, (pg) => {
    pg.fillStyle = lin(pg, x - 50, y, x + 10, y + 80, [
      [0, shade(red, 0.25)],
      [0.45, red],
      [1, shade(red, -0.5)],
    ]);
    pg.fillRect(x - 56, y - 10, 72, 100);
    texture(pg, 'canvas', { x: x - 56, y: y - 10, w: 72, h: 100 }, 0.35, 1);
    // folds
    for (const [a, b] of [[-14, -38], [-4, -22]] as const)
      softStroke(pg, (c) => {
        c.moveTo(x + a * 0.2, y + 6);
        c.quadraticCurveTo(x + a, y + 40, x + b, y + 78);
      }, rgba('#3a0608', 0.45), 4, 3);
    softStroke(pg, (c) => {
      c.moveTo(x - 6, y + 4);
      c.quadraticCurveTo(x - 26, y + 34, x - 40, y + 66);
    }, rgba('#ffb0a0', 0.3), 3, 2);
    pg.fillStyle = goldRamp(pg, x - 2, y - 6, x + 10, y + 6, '#c9873a');
    pg.beginPath();
    pg.arc(x + 4, y + 2, 6, 0, Math.PI * 2);
    pg.fill();
  }, inkOf(red), { w: 3.5 });
}

function drawSpartan(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  if (o.emissive || o.heat) return;
  const leather = art.primary ?? '#7a4a24';
  const red = art.secondary ?? '#c8102e';
  const bronzeCol = String(art.extra?.bronze ?? '#c9873a');
  const f = paintBare(ctx, { skin: art.skin, pores: 0.24, shadowTint: '#6a1a10' }, p);
  const g = f.sil.g;
  extendSil(f.sil, [sandalSole]);
  paintSoleUnder(g, f.sil.parts, sandalSole, mix(leather, '#c8905a', 0.35), shade(leather, -0.35), inkOf(art.skin), { tex: 'leather', thick: 11, stitch: rgba('#f0d8a0', 0.6) });
  // thongs laced criss-cross up the foot from the toe post
  const sl = { stitch: rgba('#f0d8a0', 0.45), gloss: 0.22 };
  const rows: [number, number][] = [[180, 112], [146, 104], [114, 94], [84, 84]];
  for (const [i, [y, hw]] of rows.entries()) {
    strap(g, quad(CX - hw - 6, y - 10 + i * 2, CX, y + 14, CX + hw + 6, y - 24 + i * 2), 9, leather, sl);
    strap(g, quad(CX - hw - 6, y - 26 + i * 2, CX, y + 12, CX + hw + 6, y - 8 + i * 2), 9, shade(leather, -0.08), sl);
  }
  // the toe post thong
  const big = f.toes[3];
  const [px, py] = onToe(big, -Math.PI / 2);
  strap(g, quad(px - 18, py + 4, CX + 10, 200, CX + 4, 176), 8, leather, sl);
  for (const [y] of rows) rivet(g, CX, y + 2, 4, bronzeCol);
  // the greave: anatomical bronze over the shin, embossed muscle, a rolled rim
  contact(g, (c) => {
    spartanGreave(c);
    c.fill();
  }, 0.6, 4, 6);
  bronze(g, spartanGreave, { x: CX - 66, y: -8, w: 132, h: 100 }, bronzeCol, 95, 0.12);
  clipTo(g, spartanGreave, () => {
    // the calf's swell beaten into the bronze
    softFill(g, ell(CX - 18, 30, 26, 36, 0.1), rgba('#fff4d0', 0.22), 8);
    softFill(g, ell(CX + 26, 40, 22, 34, -0.1), rgba('#2a1408', 0.3), 8);
    crease(g, (c) => {
      c.moveTo(CX + 4, -6);
      c.bezierCurveTo(CX - 2, 24, CX + 8, 50, CX + 2, 84);
    }, 2, '#3a1a08', 0.4, 0.45);
    crease(g, (c) => {
      c.moveTo(CX - 58, 72);
      c.quadraticCurveTo(CX, 90, CX + 60, 72);
    }, 2.2, '#3a1a08', 0.55, 0.5);
  });
  glint(g, CX - 34, 14, 6, 0.9);
  f.sil.edge(rgba('#1a0a04', 0.3), 20, LX * 11, LY * 11);
  f.sil.edge(rgba(LIGHT.rim, 0.45), 2.5, LX * 3, LY * 3);
  f.sil.finish(inkOf(art.skin), { openTop: f.top + 1.5 });
  if (!o.live) spartanCloak(ctx, red);
}

registerStyle('spartan', {
  contactY: 262,
  halfWidth: 104,
  rig: BARE_RIG,
  leg: { kind: 'skin', hw: 50, join: 'into' },
  parts: {
    cloak: { box: { x: SPARTAN_CLOAK.x - 60, y: SPARTAN_CLOAK.y - 14, w: 80, h: 108 }, frames: 1, pivot: [SPARTAN_CLOAK.x + 4, SPARTAN_CLOAK.y], draw: (g, art) => spartanCloak(g, art.secondary ?? '#c8102e') },
  },
  draw: drawSpartan,
});
