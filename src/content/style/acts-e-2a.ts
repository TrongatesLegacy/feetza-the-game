// Act 9 (Greek myths) in the style kit, batch acts-e part 2a: the three Titans Hades frees, and the Minotaur.
// - KRONOS: the Titan King freed (he shares his stone, toes, shackle and clock with src/content/style/acts-f-3.ts):
//   his shackle snapped open with a broken link dangling, his cracks glowing molten gold with sand running out of
//   them, a clock set in the shackle and his harpe at his side. In play the clock ticks, the link swings, the gold
//   pulses and sand trickles from the cracks.
// - ATLAS: a huge straining bronze-skinned foot, tendons and veins standing out, beaded with sweat, the night sky
//   inlaid on the instep as a gold armillary sphere, blue linen wrapped round the ankle and a gold band. In play he
//   breathes hard, sweat drips, the stars twinkle and star dust drifts off the sphere.
// - HYPERION: a foot of molten solar gold, granulated like the sun's surface, white-hot at the core, a sun sigil
//   engraved on it, wreathed in a corona of flame rays. In play the corona turns, embers rise, flares arc off it.
// - THE MINOTAUR: a bull's leg of shaggy dark fur ending in a great glossy cloven hoof, the bull's face on the front
//   (glaring red eyes under heavy brows, a wet muzzle, a bronze ring through the nose), horns sweeping out from the
//   ankle and a gold-studded collar. In play he blinks and glares at your peel, snorts steam, paws up dust.
// Every one of them overheats in its later phases (the heat layer, plus steam in play).

import type { FootArt } from '../../data/feet';
import { CX } from '../../art/feetCommon';
import { type BareLook, bareFoot, bareOutline, paintBare } from '../../art/style/bare';
import { LIGHT, type PathFn, type Pose, ao, crease, glint, inkOf, innerEdge, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil, lobe } from '../../art/style/sil';
import { registerStyle } from '../../art/style/registry';
import { extendSil } from './base-kit';
import {
  LINK_LEN, TITAN_LOOK, type TitanClock, clockFace, clockPath, ironLink, shackleBand, shackleClock, titanStone,
} from './acts-f-3';
import { metal } from './acts-f-kit';
import { blotches, contact, rivet, tuftPath } from '../../art/style/details';
import { LX, LY, clip, fill, furCoat, glowDot, glowFinish, goldRamp, heatLayer, lightAll, lin, panel, rad, streak } from '../../art/style/kit-bosses';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';

type Opts = { live: boolean; emissive?: boolean; heat?: boolean };

const ell = (x: number, y: number, rx: number, ry: number, rot = 0): PathFn => (c) => {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
};

function raised(g: Ctx, path: PathFn, f: string | CanvasGradient, a = 0.45, d = 2.2): void {
  contact(g, (c) => {
    path(c);
    c.fill();
  }, a, d, 3);
  fill(g, path, f);
}

const line = (pts: [number, number][]) => (c: Ctx) => pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));

/** A band wrapped round the ankle: its edges bow down as they go round the leg (y0 top at the sides, h tall). */
function wrapPath(y0: number, h: number, hw: number, bow: number, tilt = 0): PathFn {
  return (c) => {
    c.beginPath();
    c.moveTo(CX - hw, y0 - tilt);
    c.quadraticCurveTo(CX, y0 + bow, CX + hw, y0 + tilt);
    c.lineTo(CX + hw, y0 + tilt + h);
    c.quadraticCurveTo(CX, y0 + bow + h, CX - hw, y0 - tilt + h);
    c.closePath();
  };
}

// ════════════════════════════ KRONOS ════════════════════════════
// The same Titan as Kratos's Titan King (src/content/style/acts-f-3.ts), FREED: the same weathered titan stone, the
// same toes and stone nails, light and outline (titanStone), and the same shackle and clock, but the shackle has
// snapped open: its left half hangs open on its hinge with one broken link dangling from it (a live part: it swings).
// No fire: time runs in him instead, his cracks glowing molten gold with fine sand trickling out of them (sand in
// play). The clock set in his shackle ticks; his harpe (the sickle he cut the sky with) hangs at his side.

export const KRONOS_CLOCK: TitanClock = { x: CX + 18, y: 42, r: 16 };
/** Where the harpe hangs from the shackle (a live part: it swings). */
export const KRONOS_HARPE = { x: CX + 74, y: 34 };
/** The open half of the shackle: its hinge at the back of the ankle, and how far it has swung open (radians). */
const KRONOS_HINGE = { x: CX - 60, y: 40, open: Math.PI - 0.5, len: 40 };
/** A point of the open half's own frame (u from the hinge along it, v across it, down positive) in design space. */
function hingeAt(u: number, v: number): [number, number] {
  const { x, y, open } = KRONOS_HINGE;
  const c = Math.cos(open);
  const s = Math.sin(open);
  return [x + u * c - v * s, y + u * s + v * c];
}
/** The iron eye at the open half's snapped end, where the broken link hangs (a live part: it swings). */
export const KRONOS_LINK = (() => {
  const [x, y] = hingeAt(KRONOS_HINGE.len - 6, -8);
  return { x, y };
})();

const kronosLook = (art: FootArt): BareLook => ({ ...TITAN_LOOK, skin: art.skin });

/** His cracks, where time shows through: molten gold, sand running out of them (design space polylines). */
export const KRONOS_CRACKS: [number, number][][] = [
  [[CX - 40, 64], [CX - 52, 82], [CX - 40, 100], [CX - 62, 132]],
  [[CX + 78, 92], [CX + 62, 124], [CX + 80, 156], [CX + 68, 184]],
  [[CX - 84, 150], [CX - 64, 168], [CX - 74, 196]],
  [[CX - 6, 118], [CX - 24, 136], [CX - 14, 156], [CX - 30, 176]],
];

/** A crack's jagged course: its control points subdivided and jittered (fixed per crack), with the opening's half
 * width at each point (widest in its middle, closing to hairlines at the ends). */
export const KRONOS_CRACK_PATHS: { pts: [number, number][]; w: number[]; branch: [number, number][] }[] = KRONOS_CRACKS.map((ctrl, ci) => {
  const r = rng(hashStr(`kronos-crack-${ci}`));
  const pts: [number, number][] = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const [ax, ay] = ctrl[i];
    const [bx, by] = ctrl[i + 1];
    const n = 4;
    for (let j = 0; j < n; j++) {
      const t = j / n;
      const jit = j === 0 ? 0 : 5.5;
      pts.push([ax + (bx - ax) * t + (r() - 0.5) * jit, ay + (by - ay) * t + (r() - 0.5) * jit]);
    }
  }
  pts.push(ctrl[ctrl.length - 1]);
  // a short branch off its middle, splitting away to one side
  const bi = Math.floor(pts.length * (0.35 + r() * 0.3));
  const [bx, by] = pts[bi];
  const ang = Math.atan2(pts[bi + 1][1] - by, pts[bi + 1][0] - bx) + (r() < 0.5 ? -1 : 1) * (0.7 + r() * 0.4);
  const bl = 14 + r() * 12;
  const branch: [number, number][] = [[bx, by], [bx + Math.cos(ang) * bl * 0.5 + (r() - 0.5) * 4, by + Math.sin(ang) * bl * 0.5 + (r() - 0.5) * 4], [bx + Math.cos(ang) * bl, by + Math.sin(ang) * bl]];
  const w = pts.map((_, i) => {
    const u = i / (pts.length - 1);
    return 0.4 + 3.2 * Math.sin(u * Math.PI) ** 0.8 * (0.75 + r() * 0.5);
  });
  return { pts, w, branch };
});

/** A crack's opening as a closed shape, widened by `grow`. */
function crackShape(c: { pts: [number, number][]; w: number[] }, grow = 0): PathFn {
  return (q) => {
    const { pts, w } = c;
    const side = (s: number) =>
      pts.map(([x, y], i) => {
        const [px, py] = pts[Math.max(0, i - 1)];
        const [nx, ny] = pts[Math.min(pts.length - 1, i + 1)];
        const dx = nx - px;
        const dy = ny - py;
        const d = Math.hypot(dx, dy) || 1;
        return [x - (dy / d) * (w[i] + grow) * s, y + (dx / d) * (w[i] + grow) * s] as [number, number];
      });
    const a = side(1);
    const b = side(-1).reverse();
    q.beginPath();
    [...a, ...b].forEach(([x, y], i) => (i ? q.lineTo(x, y) : q.moveTo(x, y)));
    q.closePath();
  };
}

function harpePath(): PathFn {
  const { x, y } = KRONOS_HARPE;
  return (c) => {
    // the grip, hanging from the strap
    c.beginPath();
    c.moveTo(x - 4, y);
    c.lineTo(x + 5, y - 2);
    c.lineTo(x + 18, y + 62);
    c.lineTo(x + 8, y + 64);
    c.closePath();
    // the pommel
    c.moveTo(x + 7, y - 4);
    c.arc(x, y - 4, 7, 0, Math.PI * 2);
    // the guard
    c.moveTo(x + 2, y + 60);
    c.lineTo(x + 26, y + 56);
    c.lineTo(x + 27, y + 64);
    c.lineTo(x + 3, y + 68);
    c.closePath();
    // the crescent blade: a straight forte, then the sickle curving out and back in to the point
    c.moveTo(x + 9, y + 64);
    c.lineTo(x + 22, y + 62);
    c.bezierCurveTo(x + 62, y + 74, x + 78, y + 130, x + 58, y + 178);
    c.bezierCurveTo(x + 52, y + 186, x + 42, y + 190, x + 34, y + 186);
    c.bezierCurveTo(x + 54, y + 148, x + 48, y + 104, x + 14, y + 92);
    c.closePath();
  };
}

function paintHarpe(g: Ctx): void {
  const { x, y } = KRONOS_HARPE;
  const blade: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x + 9, y + 64);
    c.lineTo(x + 22, y + 62);
    c.bezierCurveTo(x + 62, y + 74, x + 78, y + 130, x + 58, y + 178);
    c.bezierCurveTo(x + 52, y + 186, x + 42, y + 190, x + 34, y + 186);
    c.bezierCurveTo(x + 54, y + 148, x + 48, y + 104, x + 14, y + 92);
    c.closePath();
  };
  // old bronze-age steel: cold, a hard mirror band along the spine and a honed edge on the inside of the curve
  clip(g, blade, () => {
    g.fillStyle = lin(g, x + 10, y + 60, x + 80, y + 190, [
      [0, '#e8ecf2'],
      [0.35, '#9aa3b0'],
      [0.6, '#5a6272'],
      [1, '#2a2e3a'],
    ]);
    g.fillRect(x, y + 50, 100, 150);
    texture(g, 'brushed', { x, y: y + 50, w: 100, h: 150 }, 0.25, 1.2);
    // the honed edge: a bright bevel along the inner curve
    streak(g, (c) => {
      c.moveTo(x + 18, y + 96);
      c.bezierCurveTo(x + 50, y + 108, x + 56, y + 150, x + 40, y + 182);
    }, 2.2, 0.85);
    // the spine catches the key light
    streak(g, (c) => {
      c.moveTo(x + 26, y + 66);
      c.bezierCurveTo(x + 60, y + 80, x + 76, y + 118, x + 70, y + 150);
    }, 3, 0.45);
    // age: a few pits and a bloom of dark patina near the point
    blotches(g, { x: x + 20, y: y + 120, w: 70, h: 70 }, '#2a2030', 0.45, 9, 0.55, 0.2, 811);
  });
  // the grip: leather wound round it
  const grip: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 4, y);
    c.lineTo(x + 5, y - 2);
    c.lineTo(x + 18, y + 62);
    c.lineTo(x + 8, y + 64);
    c.closePath();
  };
  clip(g, grip, () => {
    g.fillStyle = lin(g, x - 4, 0, x + 18, 0, [
      [0, '#8a5a34'],
      [0.5, '#5a3a22'],
      [1, '#2a180c'],
    ]);
    g.fillRect(x - 10, y - 4, 34, 72);
    for (let i = 0; i < 9; i++) {
      const yy = y + 2 + i * 7;
      crease(g, (c) => {
        c.moveTo(x - 6 + i * 1.5, yy);
        c.lineTo(x + 20 + i * 1.5, yy + 5);
      }, 1.6, '#140a04', 0.6, 0.25);
    }
  });
  raised(g, ell(x, y - 4, 7, 7), rad(g, x - 2, y - 7, 0.5, x, y - 4, 8, [
    [0, '#fff4c0'],
    [0.4, '#d9a441'],
    [1, '#6a4008'],
  ]), 0.4);
  const guard: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x + 2, y + 60);
    c.lineTo(x + 26, y + 56);
    c.lineTo(x + 27, y + 64);
    c.lineTo(x + 3, y + 68);
    c.closePath();
  };
  raised(g, guard, goldRamp(g, x + 2, y + 56, x + 27, y + 68, '#d9a441'), 0.5);
  glint(g, x + 46, y + 84, 6, 0.9);
}

/** The harpe as its own lit, outlined piece (drawn behind the foot; a live sway part in play). */
function drawHarpe(g: Ctx, box: { x: number; y: number; w: number; h: number }): void {
  const s = new Sil(g, [harpePath()], box);
  paintHarpe(s.g);
  s.edge(rgba('#06060e', 0.35), 8, LX * 5, LY * 5);
  s.edge(rgba(LIGHT.rim, 0.6), 2.2, LX * 2.5, LY * 2.5);
  s.finish(inkOf('#3a3e4a'));
}

const HARPE_BOX = { x: KRONOS_HARPE.x - 14, y: KRONOS_HARPE.y - 16, w: 100, h: 212 };

/** The shackle's closed half, still round his ankle: from its hinge at the back right round the front to where the
 * clasp snapped, a jagged break left of the middle. */
const kronosBand: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 24, 29.5);
  c.quadraticCurveTo(CX + 22, 29, CX + 64, 22);
  c.lineTo(CX + 68, 54);
  c.quadraticCurveTo(CX + 22, 63, CX - 26, 61);
  c.lineTo(CX - 21, 54);
  c.lineTo(CX - 28, 47);
  c.lineTo(CX - 22, 40);
  c.lineTo(CX - 27, 34);
  c.closePath();
};

/** The open half of the shackle, swung out on its hinge: the band's outer face, its inner face showing as a darker
 * strip (it's open, so we see its thickness), a jagged snapped end, the hinge pin and the iron eye at its end. */
function openShackle(g: Ctx, bronze: string): void {
  const L = KRONOS_HINGE.len;
  const H = 30;
  const outer: PathFn = (c) => {
    const pts: [number, number][] = [
      hingeAt(0, -H / 2), hingeAt(L * 0.5, -H / 2 - 2), hingeAt(L, -H / 2 + 1),
      hingeAt(L - 4, -H / 4), hingeAt(L + 2, 0), hingeAt(L - 5, H / 5), hingeAt(L + 1, H / 2 - 1),
      hingeAt(L * 0.5, H / 2 + 2), hingeAt(0, H / 2),
    ];
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
  };
  const inner: PathFn = (c) => {
    const pts: [number, number][] = [hingeAt(0, H / 2), hingeAt(L * 0.5, H / 2 + 2), hingeAt(L + 1, H / 2 - 1), hingeAt(L - 1, H / 2 + 5), hingeAt(L * 0.5, H / 2 + 7), hingeAt(2, H / 2 + 5)];
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
  };
  const [ax, ay] = hingeAt(0, 0);
  const box = { x: ax - L - 10, y: ay - L - 10, w: (L + 10) * 2, h: (L + 10) * 2 };
  contact(g, (c) => {
    outer(c);
    c.fill();
  }, 0.6, 3, 3.5);
  // the inside of the band: darker, worn smooth
  fill(g, inner, lin(g, ax, ay, ...hingeAt(L, H), [
    [0, shade(bronze, -0.55)],
    [1, shade(bronze, -0.75)],
  ]));
  metal(g, outer, box, bronze, { glints: false });
  clip(g, outer, () => {
    texture(g, 'cast', box, 0.3);
    blotches(g, box, '#3a9a7a', 0.45, 8, 0.66, 0.08, 913);
    // the Greek key runs on round it
    g.strokeStyle = rgba('#3a1a04', 0.75);
    g.lineWidth = 2;
    g.beginPath();
    for (let u = 4; u < L - 6; u += 14) {
      const p = (uu: number, vv: number) => hingeAt(uu, vv);
      g.moveTo(...p(u, 8));
      g.lineTo(...p(u, -6));
      g.lineTo(...p(u + 10, -6));
      g.lineTo(...p(u + 10, 2));
      g.lineTo(...p(u + 5, 2));
    }
    g.stroke();
  });
  g.save();
  g.lineJoin = 'round';
  for (const p of [inner, outer]) {
    p(g);
    g.strokeStyle = mix(inkOf(bronze), '#0a0c1a', 0.4);
    g.lineWidth = 2.2;
    g.stroke();
  }
  g.restore();
  // the snapped end: torn bright metal
  streak(g, (c) => {
    c.moveTo(...hingeAt(L - 3, -H / 2 + 3));
    c.lineTo(...hingeAt(L + 1, 0));
    c.lineTo(...hingeAt(L - 3, H / 2 - 4));
  }, 1.4, 0.7, '#fff0c0');
  // the hinge pin
  raised(g, ell(ax, ay, 5, 5), rad(g, ax - 1.5, ay - 1.5, 0.3, ax, ay, 5.5, [
    [0, '#fff4c8'],
    [0.5, bronze],
    [1, shade(bronze, -0.6)],
  ]), 0.5, 1.5);
  // the iron eye the broken link hangs from
  const { x, y } = KRONOS_LINK;
  g.save();
  const ring: PathFn = (c) => {
    c.beginPath();
    c.arc(x, y, 6.5, 0, Math.PI * 2);
    c.arc(x, y, 3, 0, Math.PI * 2, true);
  };
  contact(g, (c) => {
    ring(c);
    c.fill('evenodd');
  }, 0.6, 2.4, 2.5);
  ring(g);
  g.fillStyle = lin(g, x + LX * 6, y + LY * 6, x - LX * 6, y - LY * 6, [
    [0, '#c4c8d0'],
    [0.35, '#55575f'],
    [1, '#16171c'],
  ]);
  g.fill('evenodd');
  g.lineWidth = 1;
  g.strokeStyle = rgba('#0a0a0e', 0.9);
  g.stroke();
  g.restore();
  glint(g, x + LX * 4, y + LY * 4, 2.2, 0.8);
}

/** The broken link hanging from the eye: one whole face-on link, and through it the top half of the next, edge-on,
 * snapped off in a jagged break. Pivot at the eye. */
const LINK_K = 1.8;
const LINK_STEP = LINK_LEN * LINK_K * 0.78;
const LINK_BOX = { x: KRONOS_LINK.x - 22, y: KRONOS_LINK.y - 8, w: 44, h: LINK_STEP * 2 + 30 };
function drawBrokenLink(g: Ctx): void {
  const { x, y } = KRONOS_LINK;
  // the snapped one, under the whole one: drawn whole on a scratch layer, its lower half cut away
  const cv = document.createElement('canvas');
  cv.width = g.canvas.width;
  cv.height = g.canvas.height;
  const q = cv.getContext('2d')!;
  q.setTransform(g.getTransform());
  const ly = y + LINK_STEP * 1.45 + 5;
  q.save();
  q.translate(x, ly);
  q.scale(LINK_K, LINK_K);
  ironLink(q, 0, 0, Math.PI / 2 + 0.12, false, Math.PI / 2);
  q.restore();
  q.globalCompositeOperation = 'destination-out';
  q.beginPath();
  q.moveTo(x - 14, ly - 1);
  q.lineTo(x - 3, ly + 2);
  q.lineTo(x + 1, ly - 3);
  q.lineTo(x + 14, ly + 1);
  q.lineTo(x + 14, ly + 40);
  q.lineTo(x - 14, ly + 40);
  q.closePath();
  q.fill();
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(cv, 0, 0);
  g.restore();
  // the bright torn metal at the break
  streak(g, (c) => {
    c.moveTo(x - 2.5, ly + 1);
    c.lineTo(x + 2.6, ly - 1.5);
  }, 1.6, 0.85, '#e8ecf4');
  g.save();
  g.translate(x, y + LINK_STEP * 0.55 + 5);
  g.scale(LINK_K, LINK_K);
  ironLink(g, 0, 0, Math.PI / 2, true, Math.PI / 2);
  g.restore();
}

function drawKronos(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const stone = art.skin;
  const dark = art.primary ?? '#5a5a7a';
  const gold = art.secondary ?? '#d9c27a';
  const bronze = '#b8843a';
  const look = kronosLook(art);
  const glowCracks = (g: Ctx, a: number) => {
    for (const c of KRONOS_CRACK_PATHS) softFill(g, crackShape(c, 2.5), rgba('#ffd27a', a), 3);
  };
  if (o.heat) {
    const f = bareFoot(ctx, look, p);
    extendSil(f.sil, [kronosBand, clockPath(KRONOS_CLOCK)]);
    glowCracks(f.sil.g, 0.95);
    heatLayer(f.sil, f.box, { seed: 901, y0: 268, y1: 0, patch: 0.65 });
    return;
  }
  if (o.emissive) {
    // time shows through the cracks: molten gold that pulses in play; the clock's face glows faintly
    const f = bareFoot(ctx, look, p);
    extendSil(f.sil, [kronosBand, clockPath(KRONOS_CLOCK)]);
    const g = f.sil.g;
    glowCracks(g, 0.8);
    for (const pts of KRONOS_CRACKS) for (const [x, y] of pts) glowDot(g, x, y, 9, gold, 0.5);
    glowDot(g, KRONOS_CLOCK.x, KRONOS_CLOCK.y, KRONOS_CLOCK.r * 1.2, gold, 0.3);
    glowFinish(f.sil);
    return;
  }
  if (!o.live) drawHarpe(ctx, HARPE_BOX);
  const f = paintBare(ctx, look, p);
  extendSil(f.sil, [kronosBand, clockPath(KRONOS_CLOCK)]);
  const g = f.sil.g;
  titanStone(f, stone, dark, p);
  // the cracks: split deep into the stone, molten gold inside, sand spilling from them
  // the branches first, so the main cracks cover their roots: tapering hairlines of gold splitting off
  for (const c of KRONOS_CRACK_PATHS) {
    const br = { pts: c.branch, w: [1.3, 0.8, 0.15] };
    fill(g, crackShape(br, 1.6), rgba('#07060c', 0.8));
    fill(g, crackShape(br), '#ffcf5a');
  }
  for (const c of KRONOS_CRACK_PATHS) {
    const open = crackShape(c);
    // split into the stone: a dark, chipped lip round the opening, lit along its lower edge
    fill(g, crackShape(c, 2.4), rgba('#07060c', 0.85));
    g.save();
    g.translate(-LX * 1.2, -LY * 1.2);
    softFill(g, crackShape(c, 1.6), rgba(LIGHT.key, 0.28), 0.6);
    g.restore();
    fill(g, crackShape(c, 1.2), '#0c0a10');
    // molten gold inside: hot white at the heart, deep amber at the walls
    softFill(g, crackShape(c, 3), rgba('#ffb040', 0.4), 3);
    fill(g, open, lin(g, c.pts[0][0], c.pts[0][1], c.pts[c.pts.length - 1][0], c.pts[c.pts.length - 1][1], [
      [0, '#c07a18'],
      [0.5, '#ffd56a'],
      [1, '#c88a20'],
    ]));
    clip(g, open, () => {
      g.save();
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.strokeStyle = rgba('#fff8dc', 0.95);
      g.lineWidth = 1.1;
      g.beginPath();
      line(c.pts)(g);
      g.stroke();
      g.restore();
      innerEdge(g, open, rgba('#6a3a08', 0.7), 1.6, LX * 1.4, LY * 1.4);
    });
    // a little sand run down the stone from its lowest end
    const [ex, ey] = c.pts[c.pts.length - 1];
    const r = rng(hashStr(`kronos-sand-${ex}`));
    for (let i = 0; i < 16; i++) {
      g.fillStyle = rgba(i % 3 ? '#e8c060' : '#fff0b0', 0.95);
      g.beginPath();
      g.arc(ex + (r() - 0.5) * 3, ey + 2 + r() * 18, 0.6 + r() * 0.7, 0, Math.PI * 2);
      g.fill();
    }
  }
  // the shackle's closed half, and the clock set in it
  shackleBand(g, kronosBand, bronze);
  ao(g, CX + 20, 64, 52, 6, 0.35);
  if (o.live) clockFace(g, KRONOS_CLOCK, bronze);
  else shackleClock(g, KRONOS_CLOCK, bronze, gold, true);
  lightAll(f.sil, 0.35, 22, 0.45);
  bareOutline(f, mix(inkOf(stone), '#0a0c1a', 0.4));
  // the open half, swung out on its hinge (it stands off the silhouette), and the broken link
  openShackle(ctx, bronze);
  if (!o.live) drawBrokenLink(ctx);
}

registerStyle('kronos', {
  contactY: 270,
  halfWidth: 108,
  rig: { from: 140, to: 162 },
  leg: { kind: 'timestone', hw: 56, join: 'blend', fade: 18 },
  parts: {
    harpe: { box: HARPE_BOX, frames: 1, pivot: [KRONOS_HARPE.x, KRONOS_HARPE.y - 2], draw: (g) => drawHarpe(g, HARPE_BOX) },
    link: { box: LINK_BOX, frames: 1, pivot: [KRONOS_LINK.x, KRONOS_LINK.y], draw: (g) => drawBrokenLink(g) },
  },
  draw(ctx, art, p, o) {
    drawKronos(ctx, art, p, o);
  },
});

// ════════════════════════════ ATLAS ════════════════════════════

export const ATLAS_SPHERE = { x: CX + 4, y: 132, r: 38 };
/** The loose end of the linen wrap (a live part: it swings). */
export const ATLAS_TAIL = { x: CX - 58, y: 54 };

const atlasLook = (art: FootArt): BareLook => ({ skin: art.skin, toe: 1.1, ball: 1.05, toeLen: 0.96, w: 8, ankle: 54, pores: 0.24, detail: 1.6 });

/** Stars of the sphere (design space), with their sizes. */
export const ATLAS_STARS: [number, number, number][] = (() => {
  const r = rng(hashStr('atlas-stars'));
  const out: [number, number, number][] = [];
  const { x, y, r: R } = ATLAS_SPHERE;
  while (out.length < 16) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * (R - 5);
    out.push([x + Math.cos(a) * d, y + Math.sin(a) * d, r() < 0.2 ? 2.4 : 1 + r() * 0.8]);
  }
  return out;
})();

function paintSphere(g: Ctx, gold: string): void {
  const { x, y, r } = ATLAS_SPHERE;
  const disc = ell(x, y, r, r);
  // the night sky inlaid in the skin: deep lapis, a nebula, a dome of light from the top left
  contact(g, (c) => {
    disc(c);
    c.fill();
  }, 0.4, 2, 3);
  fill(g, disc, rad(g, x - r * 0.35, y - r * 0.4, 2, x, y, r * 1.05, [
    [0, '#3a5aa8'],
    [0.55, '#1a2a62'],
    [1, '#0a1030'],
  ]));
  clip(g, disc, () => {
    softFill(g, ell(x + 10, y + 8, 22, 12, -0.5), rgba('#8a5ad8', 0.35), 6);
    softFill(g, ell(x - 12, y - 4, 16, 9, 0.6), rgba('#3ad8d0', 0.22), 5);
    texture(g, 'speckle', { x: x - r, y: y - r, w: r * 2, h: r * 2 }, 0.18, 1);
    for (const [sx, sy, s] of ATLAS_STARS) {
      glowDot(g, sx, sy, s * 3.2, '#fff2b0', 0.6);
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(sx, sy, s * 0.6, 0, Math.PI * 2);
      g.fill();
    }
    // a constellation joined in gold leaf (the Bull, for the act's sake)
    g.strokeStyle = rgba(gold, 0.6);
    g.lineWidth = 0.9;
    g.beginPath();
    line(ATLAS_STARS.slice(0, 5).map(([a, b]) => [a, b]))(g);
    g.stroke();
  });
  // the armillary rings: meridian, equator and the tilted ecliptic band with its ticks
  g.save();
  g.lineCap = 'round';
  const ring = (rx: number, ry: number, rot: number, w: number, a: number) => {
    g.lineWidth = w + 1.6;
    g.strokeStyle = rgba('#1a0c04', 0.45);
    g.beginPath();
    g.ellipse(x + 0.8, y + 1.2, rx, ry, rot, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = w;
    g.strokeStyle = goldRamp(g, x - r, y - r, x + r, y + r, gold);
    g.globalAlpha = a;
    g.beginPath();
    g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;
  };
  ring(r * 0.36, r, 0, 1.6, 0.9);
  ring(r, r * 0.3, 0, 1.6, 0.9);
  ring(r * 0.98, r * 0.42, -0.42, 3.4, 1);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const ex = Math.cos(a) * r * 0.98;
    const ey = Math.sin(a) * r * 0.42;
    const c = Math.cos(-0.42);
    const s = Math.sin(-0.42);
    g.fillStyle = rgba('#3a1c04', 0.7);
    g.beginPath();
    g.arc(x + ex * c - ey * s, y + ex * s + ey * c, 0.8, 0, Math.PI * 2);
    g.fill();
  }
  // the outer ring, thick, lit
  g.lineWidth = 4.2;
  g.strokeStyle = goldRamp(g, x - r, y - r, x + r, y + r, gold);
  g.beginPath();
  g.arc(x, y, r + 1, 0, Math.PI * 2);
  g.stroke();
  g.restore();
  spec(g, x - r * 0.4, y - r * 0.45, r * 0.38, r * 0.2, 0.35, -0.7);
  glint(g, x - r * 0.62, y - r * 0.62, 4, 0.9);
}

function tailPath(): PathFn {
  const { x, y } = ATLAS_TAIL;
  return (c) => {
    c.beginPath();
    c.moveTo(x + 4, y - 9);
    c.bezierCurveTo(x - 12, y + 4, x - 22, y + 28, x - 20, y + 58);
    // a frayed end
    c.lineTo(x - 15, y + 52);
    c.lineTo(x - 12, y + 60);
    c.lineTo(x - 8, y + 50);
    c.lineTo(x - 4, y + 56);
    c.bezierCurveTo(x - 6, y + 30, x + 2, y + 10, x + 10, y + 4);
    c.closePath();
  };
}

function paintLinen(g: Ctx, path: PathFn, box: { x: number; y: number; w: number; h: number }, cloth: string, seed: number): void {
  panel(g, path, box, 'canvas', cloth, { shadow: 0.6 });
  clip(g, path, () => {
    const r = rng(seed);
    // folds where the wrap is pulled tight
    for (let i = 0; i < 4; i++) {
      const x = box.x + 10 + r() * (box.w - 20);
      softStroke(g, (c) => {
        c.moveTo(x, box.y);
        c.quadraticCurveTo(x + 4, box.y + box.h / 2, x - 2, box.y + box.h);
      }, rgba('#000818', 0.22), 3, 2.2);
      softStroke(g, (c) => {
        c.moveTo(x - 3, box.y);
        c.quadraticCurveTo(x + 1, box.y + box.h / 2, x - 5, box.y + box.h);
      }, rgba(LIGHT.key, 0.18), 2, 1.5);
    }
    blotches(g, box, shade(cloth, -0.5), 0.25, 8, 0.6, 0.2, seed);
  });
}

const TAIL_BOX = { x: ATLAS_TAIL.x - 30, y: ATLAS_TAIL.y - 16, w: 48, h: 84 };

function drawTail(g: Ctx, cloth: string): void {
  const s = new Sil(g, [tailPath()], TAIL_BOX);
  paintLinen(s.g, tailPath(), TAIL_BOX, cloth, 1301);
  s.edge(rgba('#06060e', 0.3), 6, LX * 4, LY * 4);
  s.edge(rgba(LIGHT.rim, 0.5), 2, LX * 2, LY * 2);
  s.finish(inkOf(cloth));
}

const ATLAS_WRAPS: [number, number, number, number][] = [
  // top y, height, bow, tilt
  [6, 18, 10, 8],
  [30, 18, 10, -9],
  [54, 17, 9, 7],
];

function drawAtlas(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const skin = art.skin;
  const cloth = art.primary ?? '#3a6a8a';
  const gold = art.secondary ?? '#d9a441';
  const look = atlasLook(art);
  if (o.heat) {
    const f = bareFoot(ctx, look, p);
    heatLayer(f.sil, f.box, { seed: 931, y0: 268, y1: 10 });
    return;
  }
  if (o.emissive) {
    const f = bareFoot(ctx, look, p);
    const g = f.sil.g;
    for (const [sx, sy, s] of ATLAS_STARS) glowDot(g, sx, sy, s * 5, '#fff2b0', 0.85);
    glowDot(g, ATLAS_SPHERE.x, ATLAS_SPHERE.y, ATLAS_SPHERE.r * 0.9, '#4a6ad8', 0.3);
    glowFinish(f.sil);
    return;
  }
  const f = paintBare(ctx, look, p);
  const g = f.sil.g;
  const box = f.box;
  // a weathered, sun-dark Titan's skin: warmer in the hollows, a bronze sheen on the lit planes
  blotches(g, box, shade(skin, -0.3), 0.16, 22, 0.52, 0.3, 933);
  spec(g, CX - 40, 90, 50, 80, 0.18, -0.4, '#ffd8a0');
  // straining: the extensor tendons stand out like cables, veins bulge across the arch
  for (const [x0, x1] of [[CX - 34, CX - 62], [CX - 8, CX - 22], [CX + 18, CX + 22], [CX + 42, CX + 70]] as const) {
    const tendon = (c: Ctx) => {
      c.moveTo(x0, 12);
      c.quadraticCurveTo((x0 + x1) / 2 + 3, 110, x1, 190);
    };
    softStroke(g, tendon, rgba(LIGHT.key, 0.3), 6, 2.6);
    g.save();
    g.translate(5, 3);
    softStroke(g, tendon, rgba(mix(shade(skin, -0.5), '#6a1a0a', 0.3), 0.3), 5, 3);
    g.restore();
  }
  const vein = (pts: [number, number][], w: number) => {
    const d = (c: Ctx) => {
      c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i + 2 < pts.length + 1; i += 3) c.bezierCurveTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], pts[i + 2][0], pts[i + 2][1]);
    };
    softStroke(g, d, rgba(mix(skin, '#3a4a9a', 0.55), 0.4), w, 1.2);
    g.save();
    g.translate(-0.8, -1);
    softStroke(g, d, rgba(LIGHT.key, 0.28), w * 0.4, 0.6);
    g.restore();
  };
  vein([[CX + 56, 70], [CX + 40, 100], [CX + 66, 120], [CX + 48, 170]], 3.6);
  vein([[CX + 48, 104], [CX + 30, 112], [CX + 26, 96], [CX + 12, 96]], 2.6);
  vein([[CX - 50, 84], [CX - 66, 120], [CX - 44, 140], [CX - 70, 176]], 3);
  // the sky on his instep
  paintSphere(g, gold);
  // sweat beading on the hot skin
  const r = rng(hashStr('atlas-sweat'));
  for (let i = 0; i < 16; i++) {
    const x = CX - 80 + r() * 160;
    const y = 80 + r() * 120;
    if (Math.hypot(x - ATLAS_SPHERE.x, y - ATLAS_SPHERE.y) < ATLAS_SPHERE.r + 6) continue;
    const s = 1.6 + r() * 2.2;
    contact(g, (c) => {
      c.beginPath();
      c.ellipse(x, y, s, s * 1.25, 0, 0, Math.PI * 2);
      c.fill();
    }, 0.25, 1, 1.4);
    fill(g, ell(x, y, s, s * 1.25), rgba(mix(skin, '#ffffff', 0.3), 0.5));
    glint(g, x - s * 0.35, y - s * 0.4, s * 0.7, 0.95);
  }
  // blue linen bound round the ankle, crossing over, and a gold band under it with a Greek key
  ATLAS_WRAPS.forEach(([y0, h, bow, tilt], i) => {
    const path = wrapPath(y0, h, 70, bow, tilt);
    paintLinen(g, path, { x: CX - 70, y: y0 - 10, w: 140, h: h + 22 }, cloth, 1311 + i);
  });
  const band = wrapPath(80, 12, 74, 9);
  contact(g, (c) => {
    band(c);
    c.fill();
  }, 0.55, 2.4, 3);
  fill(g, band, lin(g, 0, 80, 0, 101, [
    [0, mix(gold, '#fffbe0', 0.55)],
    [0.35, gold],
    [0.7, shade(gold, -0.4)],
    [1, shade(gold, 0.05)],
  ]));
  clip(g, band, () => {
    texture(g, 'brushed', { x: CX - 74, y: 78, w: 148, h: 26 }, 0.15, 1);
    // the Greek key, stamped in
    g.save();
    g.lineWidth = 1.3;
    g.strokeStyle = rgba(shade(gold, -0.65), 0.8);
    for (let k = -6; k <= 5; k++) {
      const x = CX + k * 12;
      const y = 84 + 9 * (1 - (k * 12) ** 2 / 74 ** 2);
      g.beginPath();
      g.moveTo(x, y + 6);
      g.lineTo(x, y);
      g.lineTo(x + 8, y);
      g.lineTo(x + 8, y + 4);
      g.lineTo(x + 4, y + 4);
      g.lineTo(x + 4, y + 2);
      g.stroke();
    }
    g.restore();
  });
  glint(g, CX - 46, 86, 4.5, 0.9);
  if (!o.live) drawTail(g, cloth);
  lightAll(f.sil, 0.38, 20, 0.5);
  bareOutline(f);
}

registerStyle('atlas', {
  contactY: 268,
  halfWidth: 106,
  rig: { from: 150, to: 170 },
  leg: { kind: 'skin', hw: 54, join: 'blend', fade: 24 },
  parts: {
    tail: { box: TAIL_BOX, frames: 1, pivot: [ATLAS_TAIL.x + 4, ATLAS_TAIL.y - 4], draw: (g, art) => drawTail(g, art.primary ?? '#3a6a8a') },
  },
  draw(ctx, art, p, o) {
    drawAtlas(ctx, art, p, o);
  },
});

// ════════════════════════════ HYPERION ════════════════════════════

export const HYPERION_SUN = { x: CX, y: 116 };

const hyperionLook = (art: FootArt): BareLook => ({ skin: mix(art.skin, art.primary ?? '#e8742a', 0.25), nails: art.secondary ?? '#fff2a8', toe: 1.05, ball: 1.03, w: 4, pores: 0, detail: 0.3, shadowTint: '#c02a00' });

/** A ring of flame rays round (x, y): n rays from r0 out to about r1, alternating long and short, `rot` turned. */
export function corona(g: Ctx, x: number, y: number, r0: number, r1: number, n: number, rot: number, fire: string, white: string, a = 1): void {
  // a soft halo first
  g.fillStyle = rad(g, x, y, r0 * 0.6, x, y, r1 * 1.05, [
    [0, rgba(white, 0.55 * a)],
    [0.45, rgba('#ffb030', 0.3 * a)],
    [1, rgba(fire, 0)],
  ]);
  g.beginPath();
  g.arc(x, y, r1 * 1.05, 0, Math.PI * 2);
  g.fill();
  for (let i = 0; i < n; i++) {
    const ang = rot + (i / n) * Math.PI * 2;
    const L = r0 + (r1 - r0) * (i % 2 ? 0.7 : 1) * (0.9 + 0.1 * Math.sin(i * 2.3));
    const w = (i % 2 ? 0.11 : 0.15) * Math.PI;
    const wob = Math.sin(i * 1.7) * 0.18;
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    const ray: PathFn = (c) => {
      c.beginPath();
      c.moveTo(Math.cos(-w / 2) * r0, Math.sin(-w / 2) * r0);
      c.quadraticCurveTo(L * 0.75, Math.sin(-w / 4) * r0 * 0.6 + wob * L * 0.3, L, wob * L * 0.35);
      c.quadraticCurveTo(L * 0.75, Math.sin(w / 4) * r0 * 0.6 + wob * L * 0.3, Math.cos(w / 2) * r0, Math.sin(w / 2) * r0);
      c.closePath();
    };
    fill(g, ray, lin(g, r0, 0, L, 0, [
      [0, rgba(white, 0.95 * a)],
      [0.45, rgba('#ffc43a', 0.85 * a)],
      [1, rgba(fire, 0.1 * a)],
    ]));
    // a hot core line up each ray
    g.strokeStyle = rgba('#ffffff', 0.4 * a);
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(r0, 0);
    g.quadraticCurveTo(L * 0.6, wob * L * 0.15, L * 0.85, wob * L * 0.3);
    g.stroke();
    g.restore();
  }
}

function drawHyperion(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const fire = art.primary ?? '#e8742a';
  const white = art.secondary ?? '#fff2a8';
  const look = hyperionLook(art);
  const { x: sx, y: sy } = HYPERION_SUN;
  if (o.heat) {
    // he can't get hotter: the overheat turns him white, from the sole up
    const f = bareFoot(ctx, look, p);
    heatLayer(f.sil, f.box, { seed: 951, y0: 268, y1: 0, hot: '#ffffff', mid: '#fff2a8', deep: '#ff7a1a', patch: 0.5 });
    return;
  }
  if (o.emissive) {
    const f = bareFoot(ctx, look, p);
    const g = f.sil.g;
    g.fillStyle = rad(g, sx, sy, 6, sx, sy, 120, [
      [0, rgba('#ffffff', 0.9)],
      [0.35, rgba(white, 0.55)],
      [0.75, rgba('#ffb030', 0.2)],
      [1, rgba(fire, 0)],
    ]);
    g.fillRect(f.box.x, f.box.y, f.box.w, f.box.h);
    f.sil.edge(rgba('#ffd060', 0.9), 8, 0, 0);
    for (const t of f.toes) glowDot(g, t.cx, t.cy + t.ry * 0.3, t.rx * 0.8, white, 0.5);
    glowFinish(f.sil);
    return;
  }
  if (!o.live) corona(ctx, sx, sy + 6, 78, 150, 20, 0.1, fire, white);
  const f = paintBare(ctx, look, p);
  const g = f.sil.g;
  const box = f.box;
  // the sun's surface: boiling granules, darker lanes between them, a hot white core bleeding out to orange edges
  // deeper, redder towards the limb (the sun darkens at its edge), fine granules all over
  f.sil.edge(rgba('#ff5a0a', 0.9), 34, 0, 0);
  f.sil.edge(rgba('#d02000', 0.55), 9, LX * 3, LY * 3);
  blotches(g, box, '#fff6d0', 0.16, 4, 0.62, 0.12, 953);
  // plasma filaments streaming down over the instep
  const fr = rng(hashStr('hyperion-plasma'));
  for (let i = 0; i < 9; i++) {
    const x0 = CX - 70 + fr() * 140;
    const d = (c: Ctx) => {
      c.moveTo(x0, 10 + fr() * 30);
      c.bezierCurveTo(x0 + (fr() - 0.5) * 50, 80, x0 + (fr() - 0.5) * 60, 140, x0 + (x0 - CX) * 0.3, 190 + fr() * 20);
    };
    softStroke(g, d, rgba('#fff2c0', 0.35), 2.5 + fr() * 2, 1.5);
  }
  g.save();
  g.globalCompositeOperation = 'screen';
  g.fillStyle = rad(g, sx, sy, 4, sx, sy, 130, [
    [0, rgba('#ffffff', 0.95)],
    [0.3, rgba(white, 0.6)],
    [0.7, rgba('#ffb030', 0.15)],
    [1, rgba(fire, 0)],
  ]);
  g.fillRect(box.x, box.y, box.w, box.h);
  g.restore();
  // a sunspot, and the darker limb of the sun round the edges
  softFill(g, ell(CX + 60, 172, 9, 6, 0.3), rgba('#7a1a00', 0.55), 2.5);
  softFill(g, ell(CX + 60, 172, 4, 3, 0.3), rgba('#3a0800', 0.6), 1.2);
  // the sun sigil, engraved: a disc and eight rays, with a hot inlay
  g.save();
  g.lineCap = 'round';
  const sig = (c: Ctx) => {
    c.moveTo(sx + 24, sy);
    c.arc(sx, sy, 24, 0, Math.PI * 2);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      c.moveTo(sx + Math.cos(a) * 31, sy + Math.sin(a) * 31);
      c.lineTo(sx + Math.cos(a) * (i % 2 ? 40 : 46), sy + Math.sin(a) * (i % 2 ? 40 : 46));
    }
  };
  crease(g, sig, 3, shade(fire, -0.55), 0.7, 0.5);
  g.restore();
  glowDot(g, sx, sy, 12, '#ffffff', 0.8);
  // licks of flame climbing the ankle, painted into the light
  for (const [x, h, lean] of [[CX - 46, 46, -8], [CX - 16, 58, -3], [CX + 18, 60, 4], [CX + 48, 44, 9]] as const) {
    const fl: PathFn = (c) => {
      c.beginPath();
      c.moveTo(x - 12, 60);
      c.quadraticCurveTo(x - 10, 60 - h * 0.6, x + lean, 60 - h);
      c.quadraticCurveTo(x + 10, 60 - h * 0.45, x + 12, 60);
      c.closePath();
    };
    softFill(g, fl, lin(g, 0, 60, 0, 60 - h, [
      [0, rgba(fire, 0)],
      [0.4, rgba('#ff9a2a', 0.55)],
      [1, rgba(white, 0.85)],
    ]), 2);
  }
  // molten toes: each a hotter bead with a white tip
  for (const t of f.toes) spec(g, t.cx - t.rx * 0.2, t.cy + t.ry * 0.25, t.rx * 0.6, t.ry * 0.4, 0.5, -0.8, '#ffffff');
  lightAll(f.sil, 0.2, 18, 0.35);
  bareOutline(f, '#8a1e00');
}

registerStyle('hyperion', {
  contactY: 266,
  halfWidth: 106,
  rig: { from: 140, to: 162 },
  leg: { kind: 'basalt', hw: 52, join: 'blend', fade: 26 },
  draw(ctx, art, p, o) {
    drawHyperion(ctx, art, p, o);
  },
});

// ════════════════════════════ THE MINOTAUR ════════════════════════════

/** The bull's eyes (design space): the lids are a live part that blinks and looks. */
export const MINO_EYES = [
  { x: CX - 36, y: 108 },
  { x: CX + 36, y: 108 },
];
/** The nostrils, where he snorts. */
export const MINO_NOSTRILS: [number, number][] = [
  [CX - 22, 158],
  [CX + 22, 158],
];
/** The nose ring's pivot (through the septum): a live part, it swings. */
export const MINO_RING = { x: CX, y: 164 };

const minoBody: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 60, -6);
  c.bezierCurveTo(CX - 62, 50, CX - 100, 96, CX - 104, 150);
  c.bezierCurveTo(CX - 106, 180, CX - 98, 200, CX - 80, 208);
  c.quadraticCurveTo(CX, 218, CX + 80, 208);
  c.bezierCurveTo(CX + 98, 200, CX + 106, 180, CX + 104, 150);
  c.bezierCurveTo(CX + 100, 96, CX + 62, 50, CX + 60, -6);
  c.closePath();
};

interface Hoof {
  s: number;
  rot: number;
  dy: number;
}

function minoHooves(p: Pose): Hoof[] {
  const c = Math.max(0, p.curl);
  const sp = Math.max(0, -p.curl);
  return [-1, 1].map((s, i) => ({ s, rot: s * (0.07 * sp - 0.05 * c) + (p.wiggle[i * 2 + 1] ?? 0) * 0.03 * s, dy: -6 * c + (p.wiggle[i * 2 + 1] ?? 0) * 2.5 }));
}

function hoofPath(h: Hoof): PathFn {
  const { s, rot, dy } = h;
  return (c) => {
    c.save();
    c.translate(CX + s * 44, 200 + dy);
    c.rotate(rot);
    c.translate(-(CX + s * 44), -200);
    c.beginPath();
    c.moveTo(CX + s * 4, 196);
    c.bezierCurveTo(CX + s * 1, 230, CX + s * 3, 258, CX + s * 14, 276);
    c.bezierCurveTo(CX + s * 24, 285, CX + s * 66, 283, CX + s * 86, 266);
    c.bezierCurveTo(CX + s * 98, 246, CX + s * 92, 214, CX + s * 78, 196);
    c.closePath();
    c.restore();
  };
}

function paintHoof(g: Ctx, h: Hoof, horn: string): void {
  const { s, rot, dy } = h;
  const path = hoofPath(h);
  clip(g, path, () => {
    g.save();
    g.translate(CX + s * 44, 200 + dy);
    g.rotate(rot);
    g.translate(-(CX + s * 44), -200);
    const x0 = CX + s * 4;
    const x1 = CX + s * 100;
    // glossy black keratin, a horn-coloured streak down the outer wall, lit from the top left
    g.fillStyle = lin(g, Math.min(x0, x1), 180, Math.max(x0, x1), 280, [
      [0, '#9a8a7c'],
      [0.3, '#62524a'],
      [0.7, '#3a2e2a'],
      [1, '#1c1414'],
    ]);
    g.fillRect(CX - 110, 176, 220, 112);
    softFill(g, ell(CX + s * 80, 226, 10, 40, s * -0.1), rgba(mix(horn, '#6a5040', 0.5), 0.35), 5);
    // growth rings round the wall
    for (let i = 0; i < 6; i++) {
      const y = 196 + i * 13;
      crease(g, (c) => {
        c.moveTo(CX + s * 4, y + 6);
        c.quadraticCurveTo(CX + s * 52, y - 2 + i, CX + s * 104, y + 4 - i * 2);
      }, 1.2, '#000000', 0.5, 0.22);
    }
    texture(g, 'cast', { x: CX - 110, y: 176, w: 220, h: 112 }, 0.2, 1.2);
    // the glossy shine: a long streak on the lit wall, a hot spot near the toe
    streak(g, (c) => {
      c.moveTo(CX + s * (s < 0 ? 84 : 30), 196);
      c.quadraticCurveTo(CX + s * (s < 0 ? 92 : 24), 230, CX + s * (s < 0 ? 84 : 26), 262);
    }, 3.5, s < 0 ? 0.5 : 0.28);
    spec(g, CX + s * (s < 0 ? 70 : 36), 214, 16, 7, s < 0 ? 0.45 : 0.22, -1.2);
    // the worn sole edge: lighter, scuffed
    g.fillStyle = lin(g, 0, 262, 0, 282, [
      [0, rgba('#8a7a70', 0)],
      [1, rgba('#8a7a70', 0.45)],
    ]);
    g.fillRect(CX - 110, 262, 220, 22);
    g.restore();
  });
  lobe(g, path, { x: CX + (s < 0 ? -110 : 0), y: 176, w: 110, h: 112 }, 200, 214, '#000000', 0.7, 12, 0.25);
}

/** The fringe of shaggy fur spilling over the hooves (in the silhouette). */
function minoFringe(): { path: PathFn }[] {
  const r = rng(hashStr('mino-fringe'));
  const out: { path: PathFn }[] = [];
  for (let i = 0; i <= 17; i++) {
    const t = i / 17;
    const x = CX - 92 + t * 184;
    const y = 200 + Math.sin(t * Math.PI) * 10;
    const ang = Math.PI / 2 + (t - 0.5) * 0.7 + (r() - 0.5) * 0.3;
    out.push({ path: tuftPath(x, y - 6 + r() * 6, ang, 22 + r() * 20, 16 + r() * 8, (t - 0.5) * 0.6 + (r() - 0.5) * 0.5) });
  }
  return out;
}
const MINO_FRINGE = minoFringe();

function hornPath(s: number): PathFn {
  // a ribbon from the root on the side of the ankle, sweeping out and up to a point
  const pts: [number, number][] = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const u = 1 - t;
    // cubic bezier: root, out, up, tip
    const P = [
      [CX + s * 46, 70],
      [CX + s * 110, 78],
      [CX + s * 148, 48],
      [CX + s * 136, 2],
    ];
    const x = u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0];
    const y = u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1];
    pts.push([x, y]);
  }
  const w = (t: number) => 18 * (1 - t) ** 0.8 + 1.5;
  return (c) => {
    const L: [number, number][] = [];
    const R: [number, number][] = [];
    pts.forEach(([x, y], j) => {
      const [nx, ny] = pts[Math.min(j + 1, pts.length - 1)];
      const [qx, qy] = pts[Math.max(j - 1, 0)];
      const d = Math.hypot(nx - qx, ny - qy) || 1;
      const ww = w(j / (pts.length - 1));
      L.push([x + (-(ny - qy) / d) * ww, y + ((nx - qx) / d) * ww]);
      R.push([x - (-(ny - qy) / d) * ww, y - ((nx - qx) / d) * ww]);
    });
    c.beginPath();
    L.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y)));
    for (let j = R.length - 1; j >= 0; j--) c.lineTo(R[j][0], R[j][1]);
    c.closePath();
  };
}

function paintHorn(g: Ctx, s: number, horn: string): void {
  const path = hornPath(s);
  clip(g, path, () => {
    // dark and ridged at the root, pale polished ivory at the tip
    g.fillStyle = lin(g, CX + s * 46, 72, CX + s * 136, 0, [
      [0, '#2a1c12'],
      [0.3, shade(horn, -0.45)],
      [0.65, shade(horn, -0.08)],
      [1, mix(horn, '#ffffff', 0.4)],
    ]);
    g.fillRect(CX - 160, -10, 320, 100);
    texture(g, 'grain', { x: CX - 160, y: -10, w: 320, h: 100 }, 0.3, 1);
    // growth ridges round the horn
    for (let i = 0; i < 7; i++) {
      const t = 0.08 + i * 0.075;
      const x = CX + s * (46 + t * 120);
      const y = 72 - t * 40;
      crease(g, (c) => {
        c.moveTo(x - s * 8, y - 14);
        c.quadraticCurveTo(x + s * 2, y, x + s * 6, y + 14);
      }, 1.6, '#140a04', 0.5 - i * 0.05, 0.3);
    }
    // the lit upper edge, the shaded underside
    streak(g, (c) => {
      c.moveTo(CX + s * 70, 62);
      c.bezierCurveTo(CX + s * 110, 60, CX + s * 134, 40, CX + s * 132, 10);
    }, 2.2, s < 0 ? 0.6 : 0.35);
  });
  innerEdge(g, path, rgba('#0a0604', 0.5), 6, LX * 4, LY * 4);
}

function minoEyesBox() {
  return { x: CX - 58, y: 92, w: 116, h: 34 };
}

/** One frame of the eyes: frame 0 open, frame n-1 shut. */
function paintMinoEyes(g: Ctx, fur: string, frame: number, n: number): void {
  const k = frame / Math.max(1, n - 1);
  for (const [i, e] of MINO_EYES.entries()) {
    const s = i === 0 ? -1 : 1;
    const eye = ell(e.x, e.y, 11, 8, s * 0.15);
    // the socket
    softFill(g, ell(e.x, e.y + 1, 15, 11, s * 0.15), rgba('#0a0402', 0.55), 2.5);
    fill(g, eye, rad(g, e.x - 3, e.y - 3, 1, e.x, e.y, 12, [
      [0, '#fff0d0'],
      [0.7, '#e8b890'],
      [1, '#8a4a30'],
    ]));
    clip(g, eye, () => {
      // a hot red iris looking inwards and down, a black slot pupil
      fill(g, ell(e.x - s * 2, e.y + 0.5, 6, 6.5), rad(g, e.x - s * 2 - 1, e.y - 1, 0.5, e.x - s * 2, e.y, 6.5, [
        [0, '#ff8a5a'],
        [0.55, '#e0181e'],
        [1, '#5a0408'],
      ]));
      fill(g, ell(e.x - s * 2, e.y + 0.5, 3.6, 2, 0), '#0a0204');
      spec(g, e.x - 4, e.y - 3, 3, 2, 0.95, -0.5);
      glint(g, e.x - 3.5, e.y - 3, 2.2, 1);
      // the lid comes down from above
      if (k > 0) {
        const lidY = e.y - 9 + k * 18;
        g.fillStyle = lin(g, 0, e.y - 10, 0, lidY, [
          [0, shade(fur, -0.2)],
          [1, shade(fur, 0.1)],
        ]);
        g.fillRect(e.x - 14, e.y - 12, 28, lidY - (e.y - 12));
        g.strokeStyle = rgba('#0a0402', 0.8);
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(e.x - 12, lidY);
        g.lineTo(e.x + 12, lidY);
        g.stroke();
      }
    });
    g.strokeStyle = rgba('#0a0402', 0.9);
    g.lineWidth = 1.8;
    eye(g);
    g.stroke();
  }
}

function minoRingPath(): PathFn {
  const { x, y } = MINO_RING;
  return (c) => {
    c.beginPath();
    c.ellipse(x, y + 20, 21, 18, 0, 0, Math.PI * 2);
    c.moveTo(x + 15, y + 20);
    c.ellipse(x, y + 20, 15, 12, 0, 0, Math.PI * 2, true);
  };
}

const RING_BOX = { x: MINO_RING.x - 28, y: MINO_RING.y - 4, w: 56, h: 50 };

function drawMinoRing(g: Ctx, gold: string): void {
  const s = new Sil(g, [minoRingPath()], RING_BOX);
  const { x, y } = MINO_RING;
  s.fillParts(rad(s.g, x - 10, y + 8, 2, x, y + 20, 24, [
    [0, mix(gold, '#fffbe0', 0.6)],
    [0.35, gold],
    [0.7, shade(gold, -0.45)],
    [1, shade(gold, -0.2)],
  ]));
  texture(s.g, 'cast', RING_BOX, 0.25, 1);
  s.edge(rgba('#1a0a00', 0.55), 4, LX * 3, LY * 3);
  s.edge(rgba('#fff4c0', 0.5), 2, -LX * 1.5, -LY * 1.5);
  glint(s.g, x - 14, y + 10, 4, 0.95);
  s.finish(inkOf(gold));
}

function drawMinotaur(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const fur = art.skin;
  const dark = art.primary ?? '#4a2a1a';
  const gold = art.secondary ?? '#d9a441';
  const horn = (art.extra?.horn as string) ?? '#efe2c4';
  const hooves = minoHooves(p);
  const box = { x: CX - 160, y: -8, w: 320, h: 300 };
  const sil = new Sil(ctx, [hornPath(-1), hornPath(1), minoBody, ...hooves.map(hoofPath), ...MINO_FRINGE.map((t) => t.path)], box);
  const g = sil.g;
  if (o.heat) {
    heatLayer(sil, box, { seed: 971, y0: 284, y1: 10, patch: 0.6 });
    return;
  }
  if (o.emissive) {
    for (const e of MINO_EYES) glowDot(g, e.x, e.y, 22, '#ff2a1a', 0.75);
    glowFinish(sil);
    return;
  }
  sil.form({ base: fur, shadowTint: '#1a0806', ramp: 0.7, form: 0.55, formSize: 26, bevel: 0.2, rim: 0.5 });
  // the cloven hooves first: the coat and its fringe hang over them
  for (const h of hooves) paintHoof(g, h, horn);
  // the shaggy coat: dark at the top where it runs into the leg, coarse strands flowing down and out
  clip(g, minoBody, () => {
    g.fillStyle = lin(g, 0, -6, 0, 200, [
      [0, dark],
      [0.35, fur],
      [1, shade(fur, -0.15)],
    ]);
    g.fillRect(CX - 110, -8, 220, 210);
    furCoat(g, rng(hashStr('mino-coat')), { x: CX - 108, y: -8, w: 216, h: 206 }, (x) => Math.PI / 2 + (x - CX) * 0.004, fur, shade(dark, -0.4), { n: 1.1, len: 15 });
    // the bull's face: a tan, short-haired muzzle at the front, the brow bulging above the eyes
    softFill(g, ell(CX, 158, 58, 40), rgba(mix(fur, '#c89068', 0.55), 0.85), 10);
    furCoat(g, rng(hashStr('mino-muzzle')), { x: CX - 56, y: 122, w: 112, h: 74 }, (x) => Math.PI / 2 + (x - CX) * 0.01, mix(fur, '#b88058', 0.5), shade(fur, -0.3), { n: 0.25, len: 7 });
    spec(g, CX - 16, 140, 26, 12, 0.2, -0.3, LIGHT.key);
    // the wet nose: a leathery dark pad with flared nostrils
    const nose: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 42, 150);
      c.bezierCurveTo(CX - 40, 136, CX + 40, 136, CX + 42, 150);
      c.bezierCurveTo(CX + 44, 172, CX + 20, 180, CX, 176);
      c.bezierCurveTo(CX - 20, 180, CX - 44, 172, CX - 42, 150);
      c.closePath();
    };
    raised(g, nose, lin(g, CX - 40, 138, CX + 30, 178, [
      [0, '#6a4a44'],
      [0.5, '#3a2624'],
      [1, '#1a0e0e'],
    ]), 0.5, 2.5);
    clip(g, nose, () => texture(g, 'leather', { x: CX - 44, y: 134, w: 88, h: 46 }, 0.5, 0.9));
    for (const [nx, ny] of MINO_NOSTRILS) {
      const s = nx < CX ? -1 : 1;
      fill(g, ell(nx, ny, 9, 6, s * 0.5), rad(g, nx, ny + 1, 0.5, nx, ny, 9, [
        [0, '#000000'],
        [0.7, '#0a0404'],
        [1, '#2a1614'],
      ]));
      streak(g, (c) => {
        c.moveTo(nx - s * 2 - 7, ny - 8);
        c.quadraticCurveTo(nx - 2, ny - 10, nx + s * 6, ny - 6);
      }, 1.4, 0.55);
    }
    spec(g, CX - 18, 146, 12, 5, 0.7, -0.2);
    glint(g, CX - 22, 145, 3.5, 0.9);
    // the heavy brow, angry, a frown furrow between the eyes
    for (const [i, e] of MINO_EYES.entries()) {
      const s = i === 0 ? -1 : 1;
      const brow: PathFn = (c) => {
        c.beginPath();
        c.moveTo(e.x + s * 24, e.y - 20);
        c.quadraticCurveTo(e.x, e.y - 22, e.x - s * 20, e.y - 4);
        c.quadraticCurveTo(e.x - s * 4, e.y - 12, e.x + s * 22, e.y - 12);
        c.closePath();
      };
      raised(g, brow, lin(g, 0, e.y - 22, 0, e.y - 4, [
        [0, shade(fur, 0.15)],
        [1, shade(dark, -0.3)],
      ]), 0.6, 3);
      softFill(g, ell(e.x, e.y + 12, 16, 5), rgba('#0a0402', 0.3), 3);
    }
    crease(g, (c) => {
      c.moveTo(CX - 4, 98);
      c.quadraticCurveTo(CX, 110, CX + 4, 98);
    }, 2.2, '#0a0402', 0.6, 0.25);
    if (!o.live) paintMinoEyes(g, fur, 0, 4);
    // a few scars from the maze's walls
    crease(g, line([[CX + 62, 60], [CX + 74, 76], [CX + 70, 92]]), 1.8, '#1a0806', 0.6, 0.35);
  });
  // the cloven hooves under the fur, their own glossy keratin, and the dark cleft between them
  // the fringe throws a soft shadow onto the hooves under it
  for (const h of hooves)
    clip(g, hoofPath(h), () => {
      for (const t of MINO_FRINGE)
        contact(g, (c) => {
          t.path(c);
          c.fill();
        }, 0.4, 3, 5);
    });
  for (const t of MINO_FRINGE)
    clip(g, t.path, () => {
      // melts into the coat above: transparent where the tufts root in the body
      g.fillStyle = lin(g, 0, 200, 0, 240, [
        [0, rgba(shade(fur, -0.15), 0)],
        [0.3, rgba(shade(fur, -0.15), 1)],
        [1, shade(fur, -0.32)],
      ]);
      g.fillRect(CX - 120, 180, 240, 70);
      furCoat(g, rng(hashStr('mino-fringe-coat2')), { x: CX - 110, y: 208, w: 220, h: 40 }, () => Math.PI / 2, fur, shade(dark, -0.4), { n: 0.25, len: 14 });
    });
  // the horns
  for (const s of [-1, 1]) {
    contact(g, (c) => {
      hornPath(s)(c);
      c.fill();
    }, 0.5, 3, 4);
    paintHorn(g, s, horn);
  }
  // the collar: bronze, gold-studded, a labrys on the front
  const collar = wrapPath(16, 26, 66, 8);
  panel(g, collar, { x: CX - 66, y: 14, w: 132, h: 40 }, 'enamel', shade(gold, -0.35), { shadow: 0.6 });
  clip(g, collar, () => {
    g.fillStyle = lin(g, 0, 16, 0, 50, [
      [0, rgba('#fff4c0', 0.35)],
      [0.3, rgba('#fff4c0', 0)],
      [0.8, rgba('#000000', 0.2)],
      [1, rgba('#000000', 0.35)],
    ]);
    g.fillRect(CX - 70, 10, 140, 44);
    texture(g, 'cast', { x: CX - 70, y: 10, w: 140, h: 44 }, 0.3, 1.2);
  });
  for (let i = 0; i < 7; i++) {
    const dx = -54 + i * 18;
    if (i === 3) continue;
    rivet(g, CX + dx, 29 + 8 * (1 - (dx / 66) ** 2), 4, shade(gold, 0.15));
  }
  // the labrys: a double axe in gold
  const lab: PathFn = (c) => {
    c.beginPath();
    c.rect(CX - 1.6, 18, 3.2, 26);
    for (const s of [-1, 1]) {
      c.moveTo(CX + s * 2, 24);
      c.quadraticCurveTo(CX + s * 12, 18, CX + s * 14, 22);
      c.quadraticCurveTo(CX + s * 10, 31, CX + s * 14, 40);
      c.quadraticCurveTo(CX + s * 12, 44, CX + s * 2, 38);
      c.closePath();
    }
  };
  raised(g, lab, goldRamp(g, CX - 14, 18, CX + 14, 44, gold), 0.55, 1.6);
  glint(g, CX - 8, 24, 3.5, 0.95);
  if (!o.live) drawMinoRing(g, gold);
  lightAll(sil, 0.42, 22, 0.5);
  sil.finish(inkOf(dark), { openTop: -5, inner: 0.35 });
}

registerStyle('minotaur', {
  contactY: 278,
  halfWidth: 112,
  rig: { from: 196, to: 214 },
  leg: { kind: 'fur', hw: 58, join: 'blend', fade: 26 },
  parts: {
    eyes: {
      box: minoEyesBox(),
      frames: 4,
      draw: (g, art, i) => {
        paintMinoEyes(g, art.skin, i, 4);
      },
    },
    ring: { box: RING_BOX, frames: 1, pivot: [MINO_RING.x, MINO_RING.y + 2], draw: (g, art) => drawMinoRing(g, art.secondary ?? '#d9a441') },
  },
  draw(ctx, art, p, o) {
    drawMinotaur(ctx, art, p, o);
  },
});
