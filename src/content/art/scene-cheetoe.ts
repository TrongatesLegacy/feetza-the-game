// The Night Conservatory (the Cheetoe's arena: the comic-hero nemesis mini-boss met with Wonder Wedge equipped, in
// place of Lex Lugtoe at wave 63; src/game/nemesis.ts), redrawn with the location kit (src/art/scene) in Act 7's
// pulp-comic print (src/art/scene/print.ts), of a piece with Metropizza, the Doom Lab, the HYDRANT Bunker and the
// Symbiote Lab (scene-metropizza.ts, scene-doomlab.ts, scene-redsole.ts, scene-venomnom.ts): bold ink weighted on the
// shadow side, flat fields modelled in halftone dots, at the painterly fidelity of the recent arenas. Everything here
// is our own: the glasshouse, its plants and the sign of the man who owned them.
//
// Lex Lugtoe's private glasshouse on top of his tower, gone wild, at night. A Victorian dome of glass and dark
// wrought iron seen from inside: ribs on one spacing rising from the glass drum and curving over, rings and glazing
// bars on the same spacing, rivets at every crossing, an iron gallery running round at the springing (a cast frieze,
// scroll brackets under it at every rib, a railing of balusters on the glazing bars' spacing). Through the old glass,
// the moon and Metropizza by night: deco towers hazed into the city's warm glow, the Metropizza Tower and its pizza
// globe. Some panes are cracked, one is smashed out, a vent sash hangs open to the night; condensation fogs the
// bottoms of the panes; small claw marks rake a pane high on the right and the trunk of the big palm on the left.
// The jungle has taken the place: a palm whose crown fills the top left, a banana plant arching in from the right
// under the open sash, monstera and elephant ears either side behind the bench, vines hanging from the gallery, and
// across the middle a deep, quiet mass of leaves in moon-shadow (low in detail and value, so the fight's bushes, her
// amber eyes and the fireflies pop out of it: nothing warm or bright is painted in that band). In the clearing in the
// middle a stone fountain (a pineapple finial over two bowls) trickles into a koi pool choked with lilies; a big
// terracotta urn lies smashed on the encaustic tiles at the left, and at the right the collection's enamelled sign
// lies toppled. Moonlight falls in from the top left in shafts striped by the ribs' shadows. The table is an old
// teak potting bench, silvered and mossy, with iron straps on its front.
//
// Live, the heroes:
// - the jungle breathing: the big leaves (the palm's fronds, the banana's torn paddles, the monstera and the elephant
//   ears) are painted at 9 bends each (the midrib curling, the tip drooping, the blade twisting as it turns), and
//   ride damped springs driven by a draught from the open sash, so they really bend; leaves fall spinning;
// - the moonlight: the shafts and the rib shadows they carry slide slowly as the moon moves, dust turning in them, a
//   cloud now and then drifting over the moon;
// - the fountain: the water over the two bowls painted at 12 phases (strands and sheets falling, light running down
//   them, splashes), rings spreading on the pool, drops falling from the lips.
// Also: condensation running down the dome's panes, a few cool fireflies drifting high and low (never in the band
// where she hides), the open sash rattling on its stay.
// Stomps: the leaves shake and a few fall, the sash rattles, the pool rings.
// The fight (src/game/bosses/comics.ts, the cheetoe brain) drives it: 'cheetoe-pounce' (x: the leaves whip in her
// wake), 'cheetoe-frenzy' (the jungle shivers, the sash bangs), 'cheetoe-hunt' (a cloud slides over the moon, the
// shafts die, the jungle goes dark and dead still and the fireflies sink away, so her eyes are the brightest thing),
// 'cheetoe-found' (x, y: the leaves burst apart where she's flushed out and the moon comes back), 'cheetoe-ambush' (she
// drops from the canopy: the crowns thrash) and 'cheetoe-hunt-end' (the light returns however it ended). Listeners go
// on scene SHUTDOWN. On the stages page the arena runs a demo cycle.
// (The old art is kept in scenes-comics.ts for the before/after page.)

import Phaser from 'phaser';
import { type Box, type Ctx, type PathFn, type R, TY, W, calmLanes, castShadow, ellPath, glowAt, groundShadow, polyPath, rectPath, rrPath, vfill, vignetteAll, within } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { tableFalloff, tableSeam } from '../../art/scene/materials';
import { softly, surface } from '../../art/scene/paint';
import { benDay, dots, flat, ink, linTone, radTone, speedLines } from '../../art/scene/print';
import { makeCanvas, mix, rgba, rng } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { calm, registerKitScene, wander } from '../../game/sceneLive';
import { Parts, Rate, Spring, sheet } from '../../game/sceneAnim';
import { BLOCK, INK, P2, comicCloud, globe, smooth, starField } from './scene-metropizza';

// ——— layout ———

export const NV = {
  moon: { x: 610, y: 128, r: 44 },
  /** The table's front edge. */
  front: 1040,
  /** The fountain: its centre line, the pool (kerb ellipse), the two bowls' rims, the finial's top. */
  fountain: { x: 960, pool: { y: 712, rx: 262, ry: 32, kerb: 20 }, low: { y: 604, rx: 116, ry: 15 }, high: { y: 532, rx: 54, ry: 8 }, top: 470 },
  /** The fallen urn (its mouth) and the toppled sign (its plaque). */
  urn: { x: 452, y: 726 },
  sign: { x: 1396, y: 730 },
  /** The front palm (its trunk's foot and crown) and the banana plant (its pseudostem's top). */
  palm: { x: 118, crown: { x: 168, y: 118 } },
  banana: { x: 1832, top: 300 },
  /** Where the fight's bushes come up (src/game/bosses/comics.ts: x ±40, y SAFE_TOP + 140 or + 280): the band the
   * backdrop keeps dark and quiet. */
  hunt: { xs: [260, 700, 1220, 1660], ys: [400, 540], band: [320, 620] },
};

const FT = NV.fountain;
const D2R = Math.PI / 180;

// ——— the dome: one projection for every rib, ring, bar, rivet and pane ———
// World units: the drum's radius is 1, the floor y 0, the drum's top (the springing, where the gallery runs) DM.hd,
// the dome a hemisphere on it. The eye sits back from the centre and a little up, tilted up a touch.

const DM = { f: 1050, cx: 960, cy: 360, e: 0.22, hd: 0.56, cz: -0.55, tilt: 8 * D2R };
const COS_T = Math.cos(DM.tilt);
const SIN_T = Math.sin(DM.tilt);

/** World point → screen, and its depth (larger is further). */
function proj(x: number, y: number, z: number): [number, number, number] {
  const vy = y - DM.e;
  const vz = z - DM.cz;
  const vy2 = vy * COS_T - vz * SIN_T;
  const vz2 = vz * COS_T + vy * SIN_T;
  return [DM.cx + (DM.f * x) / vz2, DM.cy - (DM.f * vy2) / vz2, vz2];
}
/** A point on the drum (azimuth t, height h) at radius rad (1 the glass, less is nearer the middle). */
const drumPt = (t: number, h: number, rad = 1) => proj(Math.sin(t) * rad, h, Math.cos(t) * rad);
/** A point on the dome (azimuth t, elevation p above the springing). */
const domePt = (t: number, p: number) => proj(Math.sin(t) * Math.cos(p), DM.hd + Math.sin(p), Math.cos(t) * Math.cos(p));
/** A point anywhere on the glass: v < 0 is down the drum (v = h - hd), v ≥ 0 up the dome (v = elevation). */
const glassPt = (t: number, v: number) => (v < 0 ? drumPt(t, DM.hd + v) : domePt(t, v));
/** A point on the floor (x across, z away). */
const floorPt = (x: number, z: number) => proj(x, 0, z);

/** The spacing everything keeps to: ribs every 10°, glazing bars every third of that; the drum's transoms every
 * 0.07 (a main one every second), the dome's rings every 5° (a main one every second). */
const RIB = 10 * D2R;
const BAR = RIB / 3;
const T_MIN = -80 * D2R;
const T_MAX = 80 * D2R;
const DRUM_STEP = 0.07;
const DOME_STEP = 5 * D2R;
/** The rows of panes: v from the drum's foot to as far up the dome as the screen shows. */
const ROWS_V: number[] = (() => {
  const out: number[] = [];
  for (let h = 0; h < DM.hd - 1e-6; h += DRUM_STEP) out.push(h - DM.hd);
  for (let p = 0; p <= 40 * D2R + 1e-6; p += DOME_STEP) out.push(p);
  return out;
})();
const isMainRow = (v: number) => (v < 0 ? Math.round(-v / DRUM_STEP) % 2 === 0 : Math.round(v / DOME_STEP) % 2 === 0);
const COLS_T: number[] = (() => {
  const out: number[] = [];
  for (let t = T_MIN; t <= T_MAX + 1e-6; t += BAR) out.push(t);
  return out;
})();
const isRib = (t: number) => Math.abs(Math.round(t / RIB) * RIB - t) < 1e-4;

/** A line along a rib or bar (constant t) from v0 to v1, sampled. */
function meridian(t: number, v0: number, v1: number, n = 14): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const v = v0 + ((v1 - v0) * i) / n;
    const [x, y] = glassPt(t, v);
    out.push([x, y]);
  }
  return out;
}
/** A line along a ring or transom (constant v) from t0 to t1, sampled. */
function parallel(v: number, t0: number, t1: number, n = 40): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const [x, y] = glassPt(t0 + ((t1 - t0) * i) / n, v);
    out.push([x, y]);
  }
  return out;
}
/** A pane's outline (between columns t0…t1 and rows v0…v1), its edges sampled so the dome's curves stay curved. */
function panePts(t0: number, t1: number, v0: number, v1: number): [number, number][] {
  const n = 4;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) pts.push(glassPt(t0 + ((t1 - t0) * i) / n, v0).slice(0, 2) as [number, number]);
  for (let i = 1; i <= n; i++) pts.push(glassPt(t1, v0 + ((v1 - v0) * i) / n).slice(0, 2) as [number, number]);
  for (let i = n - 1; i >= 0; i--) pts.push(glassPt(t0 + ((t1 - t0) * i) / n, v1).slice(0, 2) as [number, number]);
  for (let i = n - 1; i >= 1; i--) pts.push(glassPt(t0, v0 + ((v1 - v0) * i) / n).slice(0, 2) as [number, number]);
  return pts;
}
const linePath = (pts: [number, number][]): PathFn => (c) => {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
};
/** Scale (px per world unit / f) at an azimuth on the glass: ribs nearer the eye (the sides) are drawn heavier. */
const nearK = (t: number, v = 0) => 1.55 / glassPt(t, v)[2];

// ——— palette: moonlit blue-green, dark iron, the city's warm glow low down ———

const NIGHT = '#081028';
const MOON = '#d8ecff';
const RIM = '#9cc8d8';
const IRON = '#16221f';
const IRON_LIT = '#4c6a66';
const GLASS = '#a8d8cc';
const LEAF_INK = '#06100e';
/** The jungle's band: shade, body, the moon's touch. */
const J_DARK = '#050d10';
const J_MID = '#0e2123';
const J_LIT = '#1a3634';
const J_RIM = '#3a6466';
const STONE = '#6c7674';
const MOSS = '#3e5a3a';
const TERRA = '#5e4a44';
const CITY_GLOW = '#c8846a';

/** A small seeded stream (frame painters: the same shape every bake). */
const mkRng = (seed: number): R => rng(seed);

// ——— the sky through the glass: night in Ben-Day dots, the moon, Metropizza's towers in the haze ———

const SKY_BOX: Box = { x: 0, y: 0, w: W, h: 700 };

interface Tower {
  x: number;
  w: number;
  top: number;
  kind: 'flat' | 'step' | 'spire' | 'crown' | 'mast';
  seed: number;
  far: number;
}

/** The skyline: two ranks of deco towers rising out of the haze (the same city as Metropizza's, from higher up). */
const TOWERS: Tower[] = (() => {
  const r = rng(6301);
  const out: Tower[] = [];
  for (const far of [1, 0]) {
    let x = -60 + far * 40;
    while (x < W + 60) {
      const w = (far ? 60 : 80) + r() * (far ? 70 : 110);
      const k = r();
      const kind: Tower['kind'] = k < 0.22 ? 'step' : k < 0.34 ? 'spire' : k < 0.46 ? 'crown' : k < 0.54 ? 'mast' : 'flat';
      const top = far ? 250 + r() * 90 : 210 + r() * 120;
      out.push({ x, w, top, kind, seed: Math.floor(r() * 1e6), far });
      x += w * (far ? 1.05 + r() * 0.5 : 1.3 + r() * 0.9);
    }
  }
  return out;
})();
/** The Metropizza Tower, seen from across the city: its setbacks, crown, mast and pizza globe. */
const MPT = { x: 792, top: 168, w: 88, globe: { x: 792, y: 84, r: 18 } };

function towerPath(b: Tower): PathFn {
  return (c) => {
    const { x, w, top } = b;
    const base = 700;
    c.beginPath();
    c.moveTo(x, base);
    if (b.kind === 'step') {
      c.lineTo(x, top + 40);
      c.lineTo(x + w * 0.15, top + 40);
      c.lineTo(x + w * 0.15, top + 18);
      c.lineTo(x + w * 0.32, top + 18);
      c.lineTo(x + w * 0.32, top);
      c.lineTo(x + w * 0.68, top);
      c.lineTo(x + w * 0.68, top + 18);
      c.lineTo(x + w * 0.85, top + 18);
      c.lineTo(x + w * 0.85, top + 40);
      c.lineTo(x + w, top + 40);
    } else if (b.kind === 'spire') {
      c.lineTo(x, top + 30);
      c.lineTo(x + w * 0.3, top + 30);
      c.lineTo(x + w * 0.42, top);
      c.lineTo(x + w * 0.5, top - 70);
      c.lineTo(x + w * 0.58, top);
      c.lineTo(x + w * 0.7, top + 30);
      c.lineTo(x + w, top + 30);
    } else if (b.kind === 'crown') {
      c.lineTo(x, top + 34);
      c.lineTo(x + w * 0.18, top + 34);
      c.quadraticCurveTo(x + w * 0.5, top - 26, x + w * 0.82, top + 34);
      c.lineTo(x + w, top + 34);
    } else if (b.kind === 'mast') {
      c.lineTo(x, top);
      c.lineTo(x + w * 0.46, top);
      c.lineTo(x + w * 0.48, top - 54);
      c.lineTo(x + w * 0.52, top - 54);
      c.lineTo(x + w * 0.54, top);
      c.lineTo(x + w, top);
    } else {
      c.lineTo(x, top);
      c.lineTo(x + w, top);
    }
    c.lineTo(x + w, base);
    c.closePath();
  };
}

function sky(ctx: Ctx, r: R): void {
  const B = SKY_BOX;
  vfill(ctx, 0, 0, W, B.h, [[0, '#050a1e'], [0.25, NIGHT], [0.5, '#122044'], [0.68, '#1e2a4c'], [0.82, '#3a3450'], [1, '#4a3a4c']]);
  // the night printed in fat Ben-Day dots, thinning to the city's glow
  benDay(ctx, { x: 0, y: 0, w: W, h: 520 }, '#02040e', 0.55, 14, 0.5, 0.04, 0.79);
  starField(ctx, r, 0, 0, W, 300, 70, 0.55);
  // the moon: a printed disc with its maria, a soft halo and the act's speed lines round it
  const m = NV.moon;
  glowAt(ctx, m.x, m.y, 300, '#9ab8e8', 0.16);
  glowAt(ctx, m.x, m.y, 120, '#c8dcff', 0.2);
  speedLines(ctx, r, m.x, m.y, m.r * 1.7, 340, 40, '#dce8ff', 0.05);
  flat(ctx, ellPath(m.x, m.y, m.r, m.r), '#eef4ff', 3.4, '#2a3458');
  within(ctx, ellPath(m.x, m.y, m.r, m.r), () => {
    for (const [dx, dy, cr] of [[-12, -8, 11], [10, 9, 8], [-3, 19, 6], [17, -14, 5], [-20, 12, 5], [4, -22, 4]] as const) {
      ctx.fillStyle = '#c8d4e8';
      ctx.beginPath();
      ctx.arc(m.x + dx, m.y + dy, cr, 0, P2);
      ctx.fill();
    }
    dots(ctx, { x: m.x - m.r, y: m.y - m.r, w: m.r * 2, h: m.r * 2 }, linTone(m.x - m.r * 0.1, m.y - m.r * 0.1, m.x + m.r, m.y + m.r, 0, 0.75), '#6a7aa8', { step: 5, angle: 0.79, a: 0.7 });
  });
  // slow night clouds, lit on their tops by the moon
  const pal = { body: '#1e2a52', lit: '#34467a', shade: '#121a3a', ink: '#0a0e26', dot: '#080c22' };
  for (const [cx, cy, cw, ch] of [[1060, 92, 360, 50], [1700, 54, 300, 42], [240, 300, 300, 44], [1340, 270, 380, 48]] as const) comicCloud(ctx, r, cx, cy, cw, ch, pal, 0.75);
  // the city's glow low in the sky (sodium and neon from the streets far below), faded at both edges
  vfill(ctx, 0, 170, W, 300, [[0, rgba(CITY_GLOW, 0)], [0.45, rgba(CITY_GLOW, 0.2)], [0.75, rgba('#b8707a', 0.26)], [1, rgba('#b8707a', 0)]]);
  // the far rank, then the near, then the Metropizza Tower
  for (const far of [1, 0]) for (const b of TOWERS) if (b.far === far) towerShape(ctx, b);
  metroTower(ctx);
  // the haze the towers stand in (on them only), warm low down
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  vfill(ctx, 0, 230, W, 470, [[0, rgba('#3a3a5a', 0)], [0.5, rgba('#6a5068', 0.42)], [1, rgba('#8a5a5a', 0.6)]]);
  ctx.restore();
}

/** A tower at night: an indigo cut-out, its left face catching the moon, its shade in dots, windows lit cool. */
function towerShape(ctx: Ctx, b: Tower): void {
  const p = towerPath(b);
  const air = b.far ? 0.42 : 0.22;
  const body = mix(b.far ? '#262c58' : '#1a1e44', '#3a3a62', air);
  flat(ctx, p, body, 0, INK);
  within(ctx, p, () => {
    ctx.fillStyle = rgba(MOON, b.far ? 0.1 : 0.16);
    ctx.fillRect(b.x, b.top - 80, Math.max(3, b.w * 0.1), 800);
    dots(ctx, { x: b.x, y: b.top - 80, w: b.w, h: 420 - b.top }, linTone(b.x + b.w * 0.3, 0, b.x + b.w, 0, 0.05, 0.6), '#0a0c24', { step: b.far ? 5 : 6, angle: 0.79, a: 0.7 });
    // windows: a grid, some lit (office white and pale cyan: the city's lights, never warm points)
    const rr = rng(b.seed);
    const cw = b.far ? 4 : 6;
    const ch = b.far ? 5 : 8;
    const y0 = b.top + (b.kind === 'step' ? 46 : b.kind === 'spire' || b.kind === 'crown' ? 40 : 10);
    for (let y = y0; y < 400; y += ch + (b.far ? 6 : 8))
      for (let x = b.x + 6; x < b.x + b.w - cw - 4; x += cw + (b.far ? 5 : 7)) {
        const v = rr();
        if (v < 0.62) continue;
        ctx.fillStyle = rgba(v > 0.93 ? '#f0f8ff' : v > 0.8 ? '#bcdcf4' : '#8ab4d8', (b.far ? 0.45 : 0.7) * (1 - smooth(300, 520, y) * 0.6));
        ctx.fillRect(x, y, cw, ch);
      }
  });
  ink(ctx, p, b.far ? 1.2 : 1.8, mix(INK, '#3a3a62', b.far ? 0.5 : 0.25), 0.4);
}

/** The Metropizza Tower: three setbacks, the sunburst crown, the mast and its pizza globe, at night and far off. */
function metroTower(ctx: Ctx): void {
  const { x, top, w } = MPT;
  const tiers: [number, number, number][] = [[w, top + 58, 700], [w * 0.76, top + 20, top + 58], [w * 0.54, top, top + 20]];
  for (const [tw, t0, t1] of tiers) {
    const p = rectPath(x - tw / 2, t0, tw, t1 - t0);
    flat(ctx, p, '#363a6c', 0, INK);
    within(ctx, p, () => {
      ctx.fillStyle = rgba(MOON, 0.3);
      ctx.fillRect(x - tw / 2, t0, tw * 0.12, t1 - t0);
      // the piers and the window columns between them, a few windows lit
      const n = Math.max(3, Math.round(tw / 14));
      for (let i = 0; i < n; i++) {
        const px = x - tw / 2 + (i + 0.3) * (tw / n);
        ctx.fillStyle = rgba('#14163a', 0.7);
        ctx.fillRect(px, t0 + 4, (tw / n) * 0.42, t1 - t0);
        for (let y = t0 + 8 + ((i * 13) % 20); y < Math.min(t1, 520); y += 22 + (i % 3) * 6) {
          ctx.fillStyle = rgba(i % 2 ? '#d8ecff' : '#a8ccec', 0.75);
          ctx.fillRect(px, y, (tw / n) * 0.42, 5);
        }
      }
      dots(ctx, { x: x - tw / 2, y: t0, w: tw, h: t1 - t0 }, linTone(x - tw * 0.1, 0, x + tw / 2, 0, 0, 0.65), '#0a0c24', { step: 5, angle: 0.79, a: 0.75 });
    });
    ink(ctx, p, 1.8, INK, 0.4);
  }
  // the crown: stacked arches, cool brass under the moon
  for (const [hw, lift] of [[26, 0], [18, 12], [11, 22]] as const) {
    const base = top - lift;
    const arch: PathFn = (c) => {
      c.beginPath();
      c.moveTo(x - hw, base);
      c.lineTo(x - hw, base - 7);
      c.quadraticCurveTo(x, base - 7 - hw * 1.1, x + hw, base - 7);
      c.lineTo(x + hw, base);
      c.closePath();
    };
    const g = ctx.createLinearGradient(x - hw, 0, x + hw, 0);
    g.addColorStop(0, '#a8a490');
    g.addColorStop(0.45, '#6a6458');
    g.addColorStop(1, '#2e2a34');
    flat(ctx, arch, g, 1.6, INK, 0.3);
  }
  const gl = MPT.globe;
  flat(ctx, rectPath(x - 2.5, gl.y + gl.r - 4, 5, top - 30 - (gl.y + gl.r - 4)), '#4a4a5a', 1.2, INK, 0);
  flat(ctx, polyPath([[x - 1.6, gl.y - gl.r + 2], [x, gl.y - gl.r - 34], [x + 1.6, gl.y - gl.r + 2]]), '#7a7a8a', 1, INK, 0);
  // the globe, moonlit: Metropizza's own, turned cool by the night
  const [gc, gx] = makeCanvas(90, 70);
  globe(gx, 45, 35, gl.r, 0.3);
  gx.globalCompositeOperation = 'source-atop';
  gx.fillStyle = rgba('#5a6070', 0.25);
  gx.fillRect(0, 0, 90, 70);
  gx.globalCompositeOperation = 'source-atop';
  gx.fillStyle = rgba('#1a2450', 0.3);
  gx.fillRect(0, 0, 90, 70);
  ctx.drawImage(gc, gl.x - 45, gl.y - 35);
  // its aviation light (cool white: nothing warm up here)
  flat(ctx, ellPath(x, gl.y - gl.r - 34, 2.4, 2.4), '#f0f6ff', 0.8, INK, 0);
}

// ——— the glass: old panes, each its own tint; the moon's glare; condensation fogging their feet ———

/** Panes that are cracked (column, row), the one smashed out, the vent sash hung open, the one raked by claws. */
const CRACKED: [number, number][] = [[11, 9], [33, 10], [27, 12], [20, 8], [38, 9]];
const SMASHED: [number, number] = [14, 10];
const SASH: [number, number] = [40, 9];
const CLAWED: [number, number] = [43, 5];
const paneRng = (i: number, j: number) => rng(7000 + i * 131 + j * 17);
/** Screen box of a pane. */
function paneBox(i: number, j: number): Box {
  const pts = panePts(COLS_T[i], COLS_T[i + 1], ROWS_V[j], ROWS_V[j + 1]);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

function glass(ctx: Ctx, r: R): void {
  const m = NV.moon;
  for (let i = 0; i < COLS_T.length - 1; i++)
    for (let j = 0; j < ROWS_V.length - 1; j++) {
      const b = paneBox(i, j);
      if (b.x > W || b.x + b.w < 0 || b.y > 430 || b.y + b.h < -4) continue;
      const pts = panePts(COLS_T[i], COLS_T[i + 1], ROWS_V[j], ROWS_V[j + 1]);
      const p = polyPath(pts);
      const pr = paneRng(i, j);
      if (i === SMASHED[0] && j === SMASHED[1]) {
        smashedPane(ctx, pts, b);
        continue;
      }
      if (i === SASH[0] && j === SASH[1]) {
        // the sash is open: clean night through the frame, the cold air's draught
        within(ctx, p, () => {
          ctx.fillStyle = rgba('#000010', 0.18);
          ctx.fillRect(b.x, b.y, b.w, b.h);
        });
        continue;
      }
      within(ctx, p, () => {
        // the pane's own tint (old crown glass: some greener, some bluer), thicker at its foot
        const tint = pr() < 0.3 ? '#9ad8b8' : pr() < 0.5 ? '#a8c8e8' : GLASS;
        const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
        g.addColorStop(0, rgba(tint, 0.04 + pr() * 0.04));
        g.addColorStop(1, rgba(tint, 0.1 + pr() * 0.06));
        ctx.fillStyle = g;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        // the moon's glare in the panes round it, a sheen streak across the rest now and then
        const dm = Math.hypot(b.x + b.w / 2 - m.x, b.y + b.h / 2 - m.y);
        if (dm < 260) {
          ctx.fillStyle = rgba(MOON, 0.07 * (1 - dm / 260));
          ctx.fillRect(b.x, b.y, b.w, b.h);
        }
        // the glass's thickness catching the moon: a glint along the edge of each pane that faces it, brighter
        // nearer the moon
        if (dm < 520) {
          const n = pts.length;
          ctx.strokeStyle = rgba('#e8f4ff', 0.32 * (1 - dm / 520) ** 1.5);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          // the edge on the far side from the moon (the light comes through and catches it)
          const far = b.x + b.w / 2 > m.x ? 1 : -1;
          const edge = far > 0 ? pts.slice(4, 9) : [...pts.slice(12, n), pts[0]];
          edge.forEach(([ex, ey], q) => (q ? ctx.lineTo(ex - far * 1.6, ey) : ctx.moveTo(ex - far * 1.6, ey)));
          ctx.stroke();
        }
        if (pr() < 0.35) {
          const sx = b.x + b.w * (0.1 + pr() * 0.5);
          ctx.fillStyle = rgba('#e8f4ff', 0.05 + pr() * 0.05);
          ctx.beginPath();
          ctx.moveTo(sx, b.y);
          ctx.lineTo(sx + b.w * 0.18, b.y);
          ctx.lineTo(sx - b.w * 0.1, b.y + b.h);
          ctx.lineTo(sx - b.w * 0.24, b.y + b.h);
          ctx.closePath();
          ctx.fill();
        }
        // condensation: a fogged band along the foot, beads in it, a run or two cleared through it
        const fog = ctx.createLinearGradient(0, b.y + b.h * 0.45, 0, b.y + b.h);
        fog.addColorStop(0, rgba('#c8dce8', 0));
        fog.addColorStop(1, rgba('#c8dce8', 0.12 + pr() * 0.06));
        ctx.fillStyle = fog;
        ctx.fillRect(b.x, b.y + b.h * 0.45, b.w, b.h * 0.55);
        for (let k = 0; k < 4; k++) {
          ctx.fillStyle = rgba('#e8f4ff', 0.18 + pr() * 0.2);
          ctx.beginPath();
          ctx.arc(b.x + pr() * b.w, b.y + b.h * (0.55 + pr() * 0.43), 0.7 + pr() * 1.1, 0, P2);
          ctx.fill();
        }
        if (pr() < 0.5) {
          const rx = b.x + b.w * (0.2 + pr() * 0.6);
          const ry = b.y + b.h * (0.1 + pr() * 0.4);
          ctx.strokeStyle = rgba('#000814', 0.16);
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx + (pr() - 0.5) * 3, b.y + b.h);
          ctx.stroke();
          ctx.fillStyle = rgba('#f0f8ff', 0.5);
          ctx.beginPath();
          ctx.arc(rx, ry, 1.3, 0, P2);
          ctx.fill();
        }
        if (CRACKED.some(([ci, cj]) => ci === i && cj === j)) crackStar(ctx, b.x + b.w * (0.3 + pr() * 0.4), b.y + b.h * (0.3 + pr() * 0.4), Math.max(b.w, b.h) * 0.7, 40 + i);
        if (i === CLAWED[0] && j === CLAWED[1]) clawMarks(ctx, b.x + b.w * 0.5, b.y + b.h * 0.12, b.h * 0.7, 0.18, 0.58);
      });
    }
  void r;
}

/** A star of cracks in a pane (thin pale lines with a dark lip, the hit's crushed spot at the middle). */
function crackStar(ctx: Ctx, x: number, y: number, rad: number, seed: number): void {
  const rr = mkRng(seed);
  ctx.save();
  ctx.lineCap = 'round';
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * P2 + rr() * 0.5;
    let px = x;
    let py = y;
    const len = rad * (0.5 + rr() * 0.6);
    const pts: [number, number][] = [[px, py]];
    for (let s = 1; s <= 4; s++) {
      px = x + Math.cos(a + (rr() - 0.5) * 0.3) * (len * s) / 4;
      py = y + Math.sin(a + (rr() - 0.5) * 0.3) * (len * s) / 4;
      pts.push([px, py]);
    }
    ctx.strokeStyle = rgba('#000a10', 0.3);
    ctx.lineWidth = 1.6;
    linePath(pts)(ctx);
    ctx.stroke();
    ctx.strokeStyle = rgba('#e8f6ff', 0.4);
    ctx.lineWidth = 0.8;
    ctx.save();
    ctx.translate(-0.6, -0.6);
    linePath(pts)(ctx);
    ctx.stroke();
    ctx.restore();
  }
  // a ring of cracks round the hit
  ctx.strokeStyle = rgba('#e8f6ff', 0.25);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(x, y, rad * 0.22, rad * 0.18, 0.3, 0, P2);
  ctx.stroke();
  ctx.fillStyle = rgba('#e8f6ff', 0.3);
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, P2);
  ctx.fill();
  ctx.restore();
}

/** Four claw marks raked down (pale gouges, each with its dark lip, tapering at both ends): kept small and dim. */
function clawMarks(ctx: Ctx, x: number, y: number, len: number, lean: number, a: number, lit = '#e8f4ff', dark = '#000a0c'): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (let k = 0; k < 4; k++) {
    const ox = x + (k - 1.5) * len * 0.13;
    const oy = y + Math.abs(k - 1.5) * len * 0.05;
    const l = len * (0.82 + (k % 2) * 0.14);
    const p: PathFn = (c) => {
      c.beginPath();
      c.moveTo(ox, oy);
      c.quadraticCurveTo(ox + lean * l * 0.6 + 1.6, oy + l * 0.5, ox + lean * l, oy + l);
      c.quadraticCurveTo(ox + lean * l * 0.6 - 0.4, oy + l * 0.5, ox, oy);
      c.closePath();
    };
    ctx.fillStyle = rgba(dark, a * 0.8);
    ctx.save();
    ctx.translate(1.4, 0.8);
    p(ctx);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = rgba(lit, a);
    p(ctx);
    ctx.fill();
  }
  ctx.restore();
}

/** The smashed pane: the night through it, teeth of glass still in the frame. */
function smashedPane(ctx: Ctx, pts: [number, number][], b: Box): void {
  const p = polyPath(pts);
  within(ctx, p, () => {
    ctx.fillStyle = rgba('#000010', 0.22);
    ctx.fillRect(b.x, b.y, b.w, b.h);
    const rr = mkRng(77);
    // teeth along the frame: triangles of glass pointing in, each with a lit edge
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    for (let k = 0; k < pts.length; k += 2) {
      const [x0, y0] = pts[k];
      const [x1, y1] = pts[(k + 2) % pts.length];
      const mx = (x0 + x1) / 2 + (cx - (x0 + x1) / 2) * (0.25 + rr() * 0.45);
      const my = (y0 + y1) / 2 + (cy - (y0 + y1) / 2) * (0.25 + rr() * 0.45);
      const tooth = polyPath([[x0, y0], [mx, my], [x1, y1]]);
      flat(ctx, tooth, rgba(GLASS, 0.16), 0, INK);
      ctx.strokeStyle = rgba('#e8f6ff', 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(mx, my);
      ctx.stroke();
      ctx.strokeStyle = rgba('#000a10', 0.4);
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  });
}

// ——— the iron: ribs, rings and bars on the one spacing, rivets at the crossings, the gallery at the springing ———

const V_TOP = ROWS_V[ROWS_V.length - 1];
const V_FOOT = ROWS_V[0];
const RR = 0.86;
const GAL = { rail: 0.075, fascia: 0.036, bracket: 0.1 };

/** Stroke a polyline as a lit iron section: ink, body, a moonlit edge on its left. */
function ironLine(ctx: Ctx, pts: [number, number][], w: number, lit = 0.5, body = IRON): void {
  const p = linePath(pts);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'butt';
  ctx.strokeStyle = INK;
  ctx.lineWidth = w + 2.2;
  p(ctx);
  ctx.stroke();
  ctx.strokeStyle = body;
  ctx.lineWidth = w;
  p(ctx);
  ctx.stroke();
  if (lit > 0 && w > 1.8) {
    ctx.translate(-w * 0.28, -w * 0.12);
    ctx.strokeStyle = rgba(IRON_LIT, lit);
    ctx.lineWidth = Math.max(0.8, w * 0.28);
    p(ctx);
    ctx.stroke();
  }
  ctx.restore();
}

function rivetAt(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x + s * 0.25, y + s * 0.3, s + 0.8, 0, P2);
  ctx.fill();
  ctx.fillStyle = '#2a3a36';
  ctx.beginPath();
  ctx.arc(x, y, s, 0, P2);
  ctx.fill();
  ctx.fillStyle = rgba(RIM, 0.55);
  ctx.beginPath();
  ctx.arc(x - s * 0.35, y - s * 0.35, s * 0.4, 0, P2);
  ctx.fill();
}

function iron(ctx: Ctx, r: R): void {
  // glazing bars (between the ribs) and the thin transoms, then the main rings, then the ribs over them
  for (const t of COLS_T) if (!isRib(t)) ironLine(ctx, meridian(t, V_FOOT, V_TOP, 18), 2.2 * nearK(t, 0.1), 0.3);
  for (const v of ROWS_V) if (!isMainRow(v) && v !== V_FOOT) ironLine(ctx, parallel(v, T_MIN, T_MAX, 60), 2 * nearK(0, v), 0.25);
  for (const v of ROWS_V) if (isMainRow(v) && v !== V_FOOT) ironLine(ctx, parallel(v, T_MIN, T_MAX, 60), 4 * nearK(0, v), 0.45);
  for (const t of COLS_T) if (isRib(t)) ironLine(ctx, meridian(t, V_FOOT, V_TOP, 18), 8.4 * nearK(t, 0.1), 0.7, '#22302c');
  // rivets at every crossing of a rib and a main ring
  for (const t of COLS_T) {
    if (!isRib(t)) continue;
    for (const v of ROWS_V) {
      if (!isMainRow(v) || v === V_FOOT) continue;
      const [x, y] = glassPt(t, v);
      if (x < -20 || x > W + 20 || y < -20 || y > 460) continue;
      const s = 2.2 * nearK(t, v);
      rivetAt(ctx, x - s * 1.6, y, s * 0.7);
      rivetAt(ctx, x + s * 1.6, y, s * 0.7);
    }
  }
  // a ring of cast rosettes where the dome springs from the drum (each rib's foot), half hidden behind the gallery
  gallery(ctx, r);
}

/** The gallery: a cast frieze on its fascia, scroll brackets under it at every rib, a railing on the bars' spacing. */
function gallery(ctx: Ctx, r: R): void {
  const hd = DM.hd;
  const t0 = T_MIN;
  const t1 = T_MAX;
  const n = 80;
  const along = (h: number, rad: number) => {
    const out: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
      const [x, y] = drumPt(t0 + ((t1 - t0) * i) / n, h, rad);
      out.push([x, y]);
    }
    return out;
  };
  // the brackets: from the rib down on the wall up to the fascia's foot, a scroll in the corner
  for (const t of COLS_T) {
    if (!isRib(t)) continue;
    const [wx, wy] = drumPt(t, hd - GAL.bracket, 1);
    const [wx2, wy2] = drumPt(t, hd - GAL.fascia, 1);
    const [fx, fy] = drumPt(t, hd - GAL.fascia, RR);
    const k = nearK(t);
    const br: PathFn = (c) => {
      c.beginPath();
      c.moveTo(wx2, wy2);
      c.lineTo(fx, fy);
      c.quadraticCurveTo(fx + (wx - fx) * 0.2, fy + (wy - fy) * 0.7, wx, wy);
      c.closePath();
    };
    flat(ctx, br, IRON, 1.6, INK, 0.3);
    // the scroll and the pierced work in it
    const sx = fx + (wx - fx) * 0.45;
    const sy = fy + (wy - fy) * 0.32;
    ctx.strokeStyle = rgba(IRON_LIT, 0.5);
    ctx.lineWidth = 1.2 * k;
    ctx.beginPath();
    for (let a = 0; a < P2 * 1.6; a += 0.2) {
      const rad = 7 * k * (1 - a / (P2 * 1.8));
      const x = sx + Math.cos(a) * rad;
      const y = sy + Math.sin(a) * rad;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = rgba('#000000', 0.5);
    ctx.beginPath();
    ctx.arc(fx + (wx - fx) * 0.25, fy + (wy - fy) * 0.62, 2.4 * k, 0, P2);
    ctx.fill();
  }
  // the fascia: a cast band with a frieze of quatrefoils on the bars' spacing, lit along its top
  const top = along(hd, RR);
  const bot = along(hd - GAL.fascia, RR);
  const fascia = polyPath([...top, ...bot.slice().reverse()]);
  flat(ctx, fascia, '#18241f', 0, INK);
  within(ctx, fascia, () => {
    for (const t of COLS_T) {
      const [x, y] = drumPt(t, hd - GAL.fascia / 2, RR);
      const k = nearK(t) * 0.92;
      ctx.fillStyle = rgba('#000000', 0.42);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        ctx.beginPath();
        ctx.arc(x + dx * 3.2 * k, y + dy * 3.2 * k, 3 * k, 0, P2);
        ctx.fill();
      }
      ctx.fillStyle = rgba(IRON_LIT, 0.35);
      ctx.beginPath();
      ctx.arc(x - 0.8, y - 0.8, 1.4 * k, 0, P2);
      ctx.fill();
    }
    dots(ctx, { x: 0, y: 140, w: W, h: 160 }, (x) => 0.2 + 0.25 * smooth(600, 1800, x), '#000000', { step: 4, angle: 0.79, a: 0.5 });
  });
  ink(ctx, fascia, 2, INK, 0.5);
  ironLine(ctx, top, 3 * nearK(0), 0.6, '#22302c');
  // the railing over it: balusters on the bars' spacing, a ring at mid height between them, the handrail on top
  const hr = along(hd + GAL.rail, RR);
  for (const t of COLS_T) {
    const [x0, y0] = drumPt(t, hd, RR);
    const [x1, y1] = drumPt(t, hd + GAL.rail, RR);
    const k = nearK(t);
    ironLine(ctx, [[x0, y0], [x1, y1]], 2.2 * k, 0.4);
    // between this baluster and the next: a cast ring with a dog-bar under it
    const tn = t + BAR;
    if (tn > T_MAX) continue;
    const [mx, my] = drumPt(t + BAR / 2, hd + GAL.rail * 0.55, RR);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.8 * k;
    ctx.beginPath();
    ctx.ellipse(mx, my, 5.6 * k, 6.6 * k, 0, 0, P2);
    ctx.stroke();
    ctx.strokeStyle = IRON;
    ctx.lineWidth = 1.6 * k;
    ctx.stroke();
    const [bx0, by0] = drumPt(t + BAR / 2, hd, RR);
    ironLine(ctx, [[bx0, by0], [mx, my + 6.6 * k]], 1.4 * k, 0);
  }
  ironLine(ctx, along(hd + GAL.rail * 0.18, RR), 1.8 * nearK(0), 0.3);
  ironLine(ctx, hr, 4.4 * nearK(0), 0.7, '#1e2c28');
  void r;
}

const MOONBOX: Box = { x: NV.moon.x - 160, y: 30, w: 320, h: 200 };

/** The iron again over the cloud that crosses the moon (a still layer laid over the cloud's sprite). */
function ironOverMoon(ctx: Ctx, r: R): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(MOONBOX.x, MOONBOX.y, MOONBOX.w, MOONBOX.h);
  ctx.clip();
  iron(ctx, r);
  ctx.restore();
}

// ——— leaves: one geometry for the still and every bend of the live frames ———

interface LeafPal {
  lit: string;
  mid: string;
  dark: string;
  vein: string;
  rim: string;
}

export interface Leaf {
  kind: 'banana' | 'monstera' | 'ear' | 'frond';
  /** Where the blade starts (the stalk's tip), the midrib's direction there, its length and greatest half-width. */
  x: number;
  y: number;
  a: number;
  len: number;
  wid: number;
  /** The midrib's turn over its length, and the extra turn towards the tip (radians: + is clockwise on screen). */
  curl: number;
  droop: number;
  /** The stalk's foot (drawn from there to the blade) and its width. */
  stalk?: [number, number, number];
  seed: number;
  /** How far the draught bends it (1: a lot). */
  amp: number;
  pal: LeafPal;
  /** Clip at the table's back edge (a plant behind the bench). */
  clipY?: number;
  /** A pointed tip (a lance blade) rather than a banana's blunt one. */
  point?: boolean;
}

const TO_LIGHT: [number, number] = [-0.6, -0.8];

interface RibPt {
  x: number;
  y: number;
  a: number;
}

/** The midrib at bend b (−1…1): it curls, its tip droops or lifts, the whole leaf flexes a little on its stalk. */
function ribOf(L: Leaf, b: number, n = 30): RibPt[] {
  const k = b * L.amp;
  const curl = L.curl + k * 0.3;
  const droop = L.droop + k * 0.24;
  const a0 = L.a + k * 0.06;
  // the stalk flexes: the blade's base swings a little across
  let x = L.x - Math.sin(L.a) * k * L.len * 0.025;
  let y = L.y + Math.cos(L.a) * k * L.len * 0.025;
  const out: RibPt[] = [{ x, y, a: a0 }];
  const step = L.len / n;
  for (let i = 1; i <= n; i++) {
    const s = (i - 0.5) / n;
    const ang = a0 + curl * s + droop * s * s;
    x += Math.cos(ang) * step;
    y += Math.sin(ang) * step;
    out.push({ x, y, a: a0 + curl * (i / n) + droop * (i / n) ** 2 });
  }
  return out;
}

/** The midrib at s (0…1; below 0 runs back past the base along its first direction). */
function ribAt(rib: RibPt[], s: number): RibPt {
  if (s <= 0) {
    const p = rib[0];
    return { x: p.x + Math.cos(p.a) * s * 1e-9, y: p.y, a: p.a };
  }
  const f = Math.min(1, s) * (rib.length - 1);
  const i = Math.min(rib.length - 2, Math.floor(f));
  const u = f - i;
  const p = rib[i];
  const q = rib[i + 1];
  return { x: p.x + (q.x - p.x) * u, y: p.y + (q.y - p.y) * u, a: p.a + (q.a - p.a) * u };
}

/** A point off the midrib: at s along it, w px out on side sd (+1 or −1). Below s 0 it runs back from the base. */
function off(rib: RibPt[], len: number, s: number, w: number, sd: number): [number, number] {
  const p = ribAt(rib, Math.max(0, s));
  const back = Math.min(0, s) * len;
  const bx = p.x + Math.cos(p.a) * back;
  const by = p.y + Math.sin(p.a) * back;
  return [bx - Math.sin(p.a) * w * sd, by + Math.cos(p.a) * w * sd];
}

/** Does side sd of a leaf face the moon? (its outward normal at mid-length against the light) */
function facesLight(rib: RibPt[], sd: number): number {
  const p = ribAt(rib, 0.5);
  const nx = -Math.sin(p.a) * sd;
  const ny = Math.cos(p.a) * sd;
  return nx * TO_LIGHT[0] + ny * TO_LIGHT[1];
}

/** A smooth closed-ish curve through points (Catmull-Rom, sampled). */
function spline(pts: [number, number][], per = 4): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Half-outlines (s, share of width) from the sinus round to the tip: the monstera's lobed heart, the elephant ear's
 * arrow. */
const HALF: Record<'monstera' | 'ear', [number, number][]> = {
  monstera: [[0.01, 0.03], [-0.05, 0.2], [-0.12, 0.42], [-0.14, 0.64], [-0.09, 0.84], [0.03, 0.96], [0.2, 1], [0.4, 0.96], [0.58, 0.83], [0.74, 0.62], [0.87, 0.38], [0.96, 0.15], [1, 0]],
  ear: [[0.01, 0.03], [-0.1, 0.22], [-0.2, 0.46], [-0.24, 0.66], [-0.17, 0.8], [-0.02, 0.86], [0.18, 0.84], [0.38, 0.74], [0.58, 0.56], [0.76, 0.35], [0.9, 0.15], [1, 0]],
};

/** One side's outline at bend b (points from the base round to the tip). */
function halfOutline(L: Leaf, rib: RibPt[], sd: number, b: number): [number, number][] {
  const k = b * L.amp;
  // the blade twists as it turns: the side the gust pushes narrows, the other opens
  const tw = 1 - 0.2 * k * sd;
  if (L.kind === 'banana') {
    const out: [number, number][] = [];
    const n = 26;
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const w = L.point ? L.wid * tw * Math.sin(Math.PI * s) ** 0.75 * (1 - 0.45 * s) : L.wid * tw * Math.sqrt(Math.max(0, 1 - Math.abs(2 * s - 1) ** 5)) * (1 - 0.12 * s);
      out.push(off(rib, L.len, s, w, sd));
    }
    return out;
  }
  const H = HALF[L.kind === 'monstera' ? 'monstera' : 'ear'];
  return spline(H.map(([s, w]) => off(rib, L.len, s, w * L.wid * tw, sd)), 4);
}

/** Lateral veins: from the midrib at s, running forward to the edge. */
function veinPts(L: Leaf, rib: RibPt[], s: number, sd: number, reach: number, fwd: number, b: number): [number, number][] {
  const k = b * L.amp;
  const tw = 1 - 0.2 * k * sd;
  const pts: [number, number][] = [];
  for (let u = 0; u <= 1.0001; u += 0.25) {
    const w = u * reach * L.wid * tw;
    pts.push(off(rib, L.len, s + fwd * u * u, w, sd));
  }
  return pts;
}

/** A leaf painted at bend b, comic print: each half its own tone (the one turned to the moon lit), lateral veins,
 * the shade in dots, a pale midrib, torn strips (banana) or slits and holes (monstera), a moon rim, the ink line.
 * Paints into its own canvas (it cuts the tears and slits out). */
function paintLeaf(c: Ctx, L: Leaf, b: number): void {
  if (L.kind === 'frond') return paintFrond(c, L, b);
  const rr = mkRng(L.seed);
  const rib = ribOf(L, b);
  const pal = L.pal;
  c.save();
  if (L.clipY !== undefined) {
    c.beginPath();
    c.rect(-4000, -4000, 8000, L.clipY + 4000);
    c.clip();
  }
  // the stalk, from its foot to the blade
  if (L.stalk) {
    const [sx, sy, sw] = L.stalk;
    const r0 = rib[0];
    const cx = (sx + r0.x) / 2 - Math.cos(L.a) * L.len * 0.05;
    const cy = (sy + r0.y) / 2 - Math.sin(L.a) * L.len * 0.08;
    const st: PathFn = (g) => {
      g.beginPath();
      g.moveTo(sx - sw / 2, sy);
      g.quadraticCurveTo(cx - sw * 0.35, cy, r0.x - sw * 0.25, r0.y);
      g.lineTo(r0.x + sw * 0.25, r0.y);
      g.quadraticCurveTo(cx + sw * 0.35, cy, sx + sw / 2, sy);
      g.closePath();
    };
    flat(c, st, pal.mid, 1.8, LEAF_INK, 0.4);
    c.strokeStyle = rgba(pal.lit, 0.6);
    c.lineWidth = Math.max(1, sw * 0.18);
    c.beginPath();
    c.moveTo(sx - sw * 0.25, sy);
    c.quadraticCurveTo(cx - sw * 0.2, cy, r0.x - sw * 0.1, r0.y);
    c.stroke();
  }
  // each half: the one in shade first
  const sides = [1, -1].sort((p, q) => facesLight(rib, p) - facesLight(rib, q));
  for (const sd of sides) {
    const lit = facesLight(rib, sd) > 0;
    // each side its own stream, so its patches stay put whichever side is painted first
    const rs = mkRng(L.seed * 7 + (sd > 0 ? 1 : 2));
    const edge = halfOutline(L, rib, sd, b);
    const ribPts: [number, number][] = rib.map((p) => [p.x, p.y]);
    const startS = L.kind === 'banana' ? 0 : 0.01;
    const inner: [number, number][] = ribPts.filter((_, i) => i / (rib.length - 1) >= startS);
    const half = polyPath([...edge, ...inner.slice().reverse()]);
    const xs = edge.map((p) => p[0]).concat(inner.map((p) => p[0]));
    const ys = edge.map((p) => p[1]).concat(inner.map((p) => p[1]));
    const box = { x: Math.min(...xs) - 4, y: Math.min(...ys) - 4, w: Math.max(...xs) - Math.min(...xs) + 8, h: Math.max(...ys) - Math.min(...ys) + 8 };
    const m = ribAt(rib, 0.45);
    const e = off(rib, L.len, 0.45, L.wid, sd);
    const g = c.createLinearGradient(m.x, m.y, e[0], e[1]);
    if (lit) {
      g.addColorStop(0, pal.mid);
      g.addColorStop(0.5, mix(pal.mid, pal.lit, 0.75));
      g.addColorStop(1, pal.lit);
    } else {
      g.addColorStop(0, mix(pal.dark, pal.mid, 0.55));
      g.addColorStop(1, pal.dark);
    }
    flat(c, half, g, 0, LEAF_INK);
    within(c, half, () => {
      // the blade's drift of colour: yellower in patches, bluer in others
      for (let k = 0; k < 3; k++) {
        const p = ribAt(rib, 0.2 + rs() * 0.6);
        const q = off(rib, L.len, 0.2 + rs() * 0.6, L.wid * (0.3 + rs() * 0.5), sd);
        const rg = c.createRadialGradient(q[0], q[1], 0, q[0], q[1], L.wid * 0.9);
        rg.addColorStop(0, rgba(rs() < 0.5 ? '#8aa86a' : '#4a7a8a', lit ? 0.14 : 0.08));
        rg.addColorStop(1, rgba('#4a7a8a', 0));
        c.fillStyle = rg;
        c.fillRect(box.x, box.y, box.w, box.h);
        void p;
      }
      // lateral veins
      const nv = L.kind === 'banana' ? 46 : L.kind === 'monstera' ? 9 : 7;
      const fwd = L.kind === 'banana' ? 0.035 : L.kind === 'monstera' ? 0.12 : 0.16;
      c.lineCap = 'round';
      for (let k = 0; k < nv; k++) {
        const s = (k + 0.6) / (nv + 0.4);
        const pts = veinPts(L, rib, s, sd, 1.1, fwd, b);
        c.strokeStyle = lit ? rgba(mix(pal.lit, '#ffffff', 0.25), L.kind === 'banana' ? 0.3 : 0.4) : rgba(LEAF_INK, L.kind === 'banana' ? 0.4 : 0.32);
        c.lineWidth = L.kind === 'banana' ? 1 : 2.2;
        linePath(pts)(c);
        c.stroke();
        if (L.kind !== 'banana') {
          c.strokeStyle = rgba(LEAF_INK, lit ? 0.2 : 0.3);
          c.lineWidth = 1;
          c.save();
          c.translate(1.2, 1.4);
          linePath(pts)(c);
          c.stroke();
          c.restore();
        }
      }
      // the shade in dots: deepening to the edge on the dark half, a whisper along the fold on the lit one
      dots(c, box, linTone(m.x, m.y, e[0], e[1], lit ? 0.18 : 0.3, lit ? 0 : 0.8), LEAF_INK, { step: 5, angle: 0.79, a: lit ? 0.4 : 0.6 });
      // a gloss: the moon caught on the lit half, broken by the veins into a sheen between them that slides with
      // the bend (a banana's is a faint long streak)
      if (lit && L.kind === 'banana') {
        const pts = [0.22, 0.4, 0.58].map((s) => off(rib, L.len, s + b * 0.03, L.wid * 0.42, sd));
        c.strokeStyle = rgba(MOON, 0.1);
        c.lineWidth = L.wid * 0.14;
        linePath(pts)(c);
        c.stroke();
      } else if (lit) {
        const nv2 = L.kind === 'monstera' ? 9 : 7;
        const fwd2 = L.kind === 'monstera' ? 0.12 : 0.16;
        for (let k = 1; k < nv2 - 1; k++) {
          const s = (k + 1.1) / (nv2 + 0.4) + b * 0.02;
          const v = veinPts(L, rib, s, sd, 0.9, fwd2, b);
          const u = 1 - Math.abs(k - nv2 * 0.45) / (nv2 * 0.5);
          c.strokeStyle = rgba(MOON, 0.13 * Math.max(0, u));
          c.lineWidth = L.wid * 0.06;
          linePath(v.slice(1, 4))(c);
          c.stroke();
        }
      }
      // dried, browned patches along a banana's edge
      if (L.kind === 'banana') {
        for (let k = 0; k < 3; k++) {
          const s = 0.2 + rs() * 0.7;
          // (pinned to the blade: a share of the way out to this bend's edge, so it stays put as the blade twists)
          const m2 = ribAt(rib, s);
          const ep = edge[Math.round(s * 26)];
          const q: [number, number] = [m2.x + (ep[0] - m2.x) * 0.9, m2.y + (ep[1] - m2.y) * 0.9];
          c.fillStyle = rgba('#3a3424', 0.4);
          c.beginPath();
          c.ellipse(q[0], q[1], L.wid * 0.36, L.wid * 0.08, ribAt(rib, s).a, 0, P2);
          c.fill();
        }
      }
      // the moon's rim along the lit edge
      if (lit) {
        c.strokeStyle = rgba(pal.rim, 0.5);
        c.lineWidth = 3;
        linePath(edge)(c);
        c.stroke();
      }
    });
    ink(c, half, 2, LEAF_INK, 0.5);
  }
  // the midrib: pale, tapering, its shaded flank
  const mr: [number, number][] = rib.map((p) => [p.x, p.y]);
  const tw = L.kind === 'banana' ? 6 : 4.5;
  const midrib = polyPath([
    ...mr.map((_, i) => off(rib, L.len, i / (rib.length - 1), tw * (1 - (i / (rib.length - 1)) * 0.85), 1)),
    ...mr.map((_, i) => off(rib, L.len, i / (rib.length - 1), tw * (1 - (i / (rib.length - 1)) * 0.85), -1)).reverse(),
  ]);
  flat(c, midrib, mix(pal.vein, pal.mid, 0.25), 1.2, LEAF_INK, 0.3);
  // cuts: the banana's tears along its veins, the monstera's slits and holes
  c.globalCompositeOperation = 'destination-out';
  const cuts: [number, number][][] = [];
  for (const sd of [1, -1]) {
    if (L.kind === 'banana') {
      const n = 4 + Math.floor(rr() * 4);
      for (let k = 0; k < n; k++) {
        const s = 0.16 + rr() * 0.78;
        const d = 0.45 + rr() * 0.55;
        const v = veinPts(L, rib, s, sd, 1.15, 0.035, b);
        const [ix, iy] = off(rib, L.len, s + 0.035 * (1 - d) ** 2, L.wid * (1 - d) * 0.9, sd);
        const [ex, ey] = v[v.length - 1];
        const nx = Math.cos(ribAt(rib, s).a) * (2 + d * 2.5);
        const ny = Math.sin(ribAt(rib, s).a) * (2 + d * 2.5);
        const wedge: [number, number][] = [[ix, iy], [ex - nx, ey - ny], [ex + nx * 1.6, ey + ny * 1.6]];
        cuts.push(wedge);
      }
      // little nicks along the edge
      for (let k = 0; k < 5; k++) {
        const s = 0.1 + rr() * 0.85;
        const [ex, ey] = off(rib, L.len, s, L.wid * 1.02, sd);
        const [ix, iy] = off(rib, L.len, s, L.wid * (0.88 - rr() * 0.1), sd);
        cuts.push([[ix, iy], [ex - 3, ey], [ex + 3, ey + 2]]);
      }
    } else if (L.kind === 'monstera') {
      for (let k = 0; k < 7; k++) {
        const s = 0.1 + k * 0.115 + (rr() - 0.5) * 0.02;
        const d = 0.42 + rr() * 0.3;
        // a slit along the vein from the edge in, wide at the edge and rounded at its inner end
        const a = veinPts(L, rib, s - 0.012, sd, 1.15, 0.12, b);
        const c2 = veinPts(L, rib, s + 0.028, sd, 1.15, 0.12, b);
        const inn = veinPts(L, rib, s + 0.008, sd, 1 - d, 0.12 * (1 - d) ** 2, b);
        cuts.push([inn[inn.length - 1], a[3], a[4], c2[4], c2[3]]);
        // and a hole nearer the midrib in the gap before it
        if (k > 0 && k < 6 && rr() < 0.7) {
          const h = off(rib, L.len, s - 0.05, L.wid * (0.22 + rr() * 0.08), sd);
          const ha = ribAt(rib, s).a;
          const ring: [number, number][] = [];
          for (let q = 0; q < 10; q++) {
            const th = (q / 10) * P2;
            const rx = L.wid * 0.06;
            const ry = L.wid * 0.025;
            ring.push([h[0] + Math.cos(th) * rx * Math.cos(ha + sd * 0.9) - Math.sin(th) * ry * Math.sin(ha + sd * 0.9), h[1] + Math.cos(th) * rx * Math.sin(ha + sd * 0.9) + Math.sin(th) * ry * Math.cos(ha + sd * 0.9)]);
          }
          cuts.push(ring);
        }
      }
    }
  }
  c.fillStyle = '#000';
  for (const w of cuts) {
    polyPath(w)(c);
    c.fill();
  }
  // ink round every cut, on the leaf only (the canvas holds this leaf alone), a moonlit lip on the edge facing up
  c.globalCompositeOperation = 'source-atop';
  for (const w of cuts) {
    ink(c, polyPath(w), 2, LEAF_INK, 0.3);
    c.save();
    c.translate(-1.2, -1.4);
    c.strokeStyle = rgba(pal.rim, 0.35);
    c.lineWidth = 1;
    polyPath(w)(c);
    c.stroke();
    c.restore();
  }
  c.globalCompositeOperation = 'source-over';
  c.restore();
}

/** A palm frond at bend b: a rachis curving out, leaflets swept forward along it on both sides and hanging under
 * their own weight, fluttering as it bends; the leaflets on the side turned to the moon lit, the others in shade. */
function paintFrond(c: Ctx, L: Leaf, b: number): void {
  const rr = mkRng(L.seed);
  const rib = ribOf(L, b);
  const rest = ribOf(L, 0);
  const pal = L.pal;
  const k = b * L.amp;
  const N = 24;
  type Lf = { pts: [number, number][]; lit: number; w: number };
  const lfs: Lf[] = [];
  for (const sd of [1, -1]) {
    const lf = facesLight(rib, sd);
    for (let i = 0; i < N; i++) {
      const s = 0.06 + (i / (N - 1)) * 0.9 + (rr() - 0.5) * 0.012;
      const p = ribAt(rib, s);
      const l = L.len * 0.36 * Math.sin(Math.PI * (0.1 + 0.86 * s)) ** 0.7 * (0.9 + rr() * 0.2);
      const flutter = Math.sin(i * 1.7 + L.seed + k * 3) * 0.12 * Math.abs(k) + k * 0.1;
      let ang = p.a + sd * (1.05 - 0.35 * s) + flutter;
      // which way it hangs is settled at rest (so a leaflet pointing up never flips sides between bends)
      const turn = Math.cos(ribAt(rest, s).a + sd * (1.05 - 0.35 * s)) >= 0 ? 1 : -1;
      const pts: [number, number][] = [[p.x, p.y]];
      let x = p.x;
      let y = p.y;
      for (let q = 1; q <= 6; q++) {
        // each leaflet hangs: its direction turns towards straight down as it goes
        const down = Math.PI / 2;
        let d = down - ang;
        while (d > Math.PI) d -= P2;
        while (d < -Math.PI) d += P2;
        if (turn > 0 && d < -2.2) d += P2;
        if (turn < 0 && d > 2.2) d -= P2;
        ang += d * (0.1 + 0.05 * s);
        x += Math.cos(ang) * (l / 6);
        y += Math.sin(ang) * (l / 6);
        pts.push([x, y]);
      }
      lfs.push({ pts, lit: lf + (rr() - 0.5) * 0.3, w: Math.max(3, l * 0.085) });
    }
  }
  lfs.sort((p, q) => p.lit - q.lit);
  const shadeHalf = lfs.slice(0, lfs.length / 2);
  const litHalf = lfs.slice(lfs.length / 2);
  const leaflet = (f: Lf, lit: boolean) => {
    const pts = f.pts;
    const left: [number, number][] = [];
    const right: [number, number][] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      const [ax, ay] = pts[Math.max(0, i - 1)];
      const [bx, by] = pts[Math.min(pts.length - 1, i + 1)];
      const dx = bx - ax;
      const dy = by - ay;
      const l = Math.hypot(dx, dy) || 1;
      const w = f.w * Math.sin(Math.PI * Math.min(1, (i + 0.4) / pts.length)) ** 0.6;
      left.push([x - (dy / l) * w, y + (dx / l) * w]);
      right.push([x + (dy / l) * w, y - (dx / l) * w]);
    }
    const p = polyPath([...left, ...right.reverse()]);
    const col = lit ? mix(pal.mid, pal.lit, 0.4 + Math.min(1, f.lit) * 0.6) : mix(pal.dark, pal.mid, 0.3 + rr() * 0.4);
    flat(c, p, col, 0, LEAF_INK);
    within(c, p, () => {
      c.strokeStyle = lit ? rgba(pal.rim, 0.45) : rgba(LEAF_INK, 0.4);
      c.lineWidth = Math.max(1, f.w * 0.35);
      linePath(lit ? left : right)(c);
      c.stroke();
      c.strokeStyle = rgba(lit ? pal.vein : LEAF_INK, lit ? 0.35 : 0.3);
      c.lineWidth = 0.9;
      linePath(pts)(c);
      c.stroke();
    });
    ink(c, p, 1.3, LEAF_INK, 0.3);
  };
  for (const f of shadeHalf) leaflet(f, false);
  // the rachis
  const mr: [number, number][] = rib.map((p) => [p.x, p.y]);
  const rach = polyPath([
    ...mr.map((_, i) => off(rib, L.len, i / (rib.length - 1), 4.5 * (1 - (i / (rib.length - 1)) * 0.8), 1)),
    ...mr.map((_, i) => off(rib, L.len, i / (rib.length - 1), 4.5 * (1 - (i / (rib.length - 1)) * 0.8), -1)).reverse(),
  ]);
  flat(c, rach, mix(pal.vein, pal.mid, 0.4), 1.4, LEAF_INK, 0.3);
  for (const f of litHalf) leaflet(f, true);
}

/** The frame box a leaf needs over its whole bend (its own canvas in the still, and its live frames). */
function leafBox(L: Leaf): Box {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const b of [-1, -0.5, 0, 0.5, 1]) {
    const rib = ribOf(L, b);
    const pts: [number, number][] = [];
    if (L.kind === 'frond') for (const p of rib) for (const sd of [1, -1]) pts.push(off(rib, L.len, 0, 0, sd), [p.x + Math.cos(p.a + sd * 1.1) * L.len * 0.36, p.y + Math.sin(p.a + sd * 1.1) * L.len * 0.36 + L.len * 0.12], [p.x, p.y + L.len * 0.3]);
    else for (const sd of [1, -1]) pts.push(...halfOutline(L, rib, sd, b));
    if (L.stalk) pts.push([L.stalk[0] - L.stalk[2], L.stalk[1]], [L.stalk[0] + L.stalk[2], L.stalk[1]]);
    for (const [x, y] of pts) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }
  if (L.clipY !== undefined) y1 = Math.min(y1, L.clipY);
  const pad = 10;
  return { x: Math.floor(x0 - pad), y: Math.floor(y0 - pad), w: Math.ceil(x1 - x0 + pad * 2), h: Math.ceil(y1 - y0 + pad * 2) };
}

/** A leaf painted on its own canvas (scale k), at bend b. */
function leafCanvas(L: Leaf, b: number, k = 1): HTMLCanvasElement {
  const bx = leafBox(L);
  const [cv, c] = makeCanvas(Math.ceil(bx.w * k), Math.ceil(bx.h * k));
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.scale(k, k);
  c.translate(-bx.x, -bx.y);
  paintLeaf(c, L, b);
  return cv;
}

// ——— the hero plants (live: each leaf bends on its spring) ———

const PAL_BANANA: LeafPal = { lit: '#5e8a60', mid: '#2c5440', dark: '#0f241c', vein: '#a8c49a', rim: '#a8d4cc' };
const PAL_PALM: LeafPal = { lit: '#4c765a', mid: '#244638', dark: '#0c1e18', vein: '#8aa888', rim: '#9cc8c0' };
const PAL_MONSTERA: LeafPal = { lit: '#467a5a', mid: '#1e4636', dark: '#091c16', vein: '#8ab49a', rim: '#9cd0c4' };
const PAL_EAR: LeafPal = { lit: '#3c6c58', mid: '#1a3e32', dark: '#081a16', vein: '#86b0a0', rim: '#94c8c0' };

const PC = NV.palm.crown;
const BN = NV.banana;

/** The hero leaves' painted sheets: each is a leaf painted at every bend. */
export const LEAVES: Record<string, Leaf> = {
  // the palm's crown, top left: a frond arching up and out, one out to the right and drooping
  frondA: { kind: 'frond', x: PC.x, y: PC.y, a: -0.62, len: 430, wid: 0, curl: 0.55, droop: 0.75, seed: 11, amp: 0.7, pal: PAL_PALM },
  frondB: { kind: 'frond', x: PC.x + 4, y: PC.y + 6, a: 0.06, len: 400, wid: 0, curl: 0.5, droop: 0.55, seed: 12, amp: 0.75, pal: PAL_PALM },
  // the banana plant, right, under the open sash: two great paddles arching out of its crown
  bananaA: { kind: 'banana', x: BN.x - 6, y: BN.top - 4, a: -2.0, len: 520, wid: 74, curl: -0.95, droop: -0.55, seed: 21, amp: 0.65, pal: PAL_BANANA, stalk: [BN.x + 4, BN.top + 40, 16] },
  bananaB: { kind: 'banana', x: BN.x - 10, y: BN.top + 8, a: -2.55, len: 430, wid: 66, curl: -0.6, droop: -0.75, seed: 22, amp: 0.7, pal: PAL_BANANA, stalk: [BN.x, BN.top + 46, 14] },
  // behind the bench: monstera on the left, elephant ears on the right (cut at the bench's back edge)
  monsteraA: { kind: 'monstera', x: 92, y: 700, a: -1.05, len: 190, wid: 108, curl: 0.25, droop: 0.55, seed: 31, amp: 0.4, pal: PAL_MONSTERA, stalk: [70, TY + 10, 9], clipY: TY },
  monsteraB: { kind: 'monstera', x: 300, y: 708, a: -0.5, len: 150, wid: 86, curl: 0.2, droop: 0.4, seed: 32, amp: 0.45, pal: PAL_MONSTERA, stalk: [262, TY + 10, 8], clipY: TY },
  earA: { kind: 'ear', x: 1800, y: 690, a: -2.15, len: 200, wid: 104, curl: -0.25, droop: -0.6, seed: 41, amp: 0.4, pal: PAL_EAR, stalk: [1846, TY + 10, 9], clipY: TY },
  earB: { kind: 'ear', x: 1640, y: 716, a: -2.6, len: 150, wid: 78, curl: -0.2, droop: -0.5, seed: 42, amp: 0.45, pal: PAL_EAR, stalk: [1690, TY + 10, 8], clipY: TY },
};

/** Where the leaves stand, far to near: a sheet at its own place, or turned and scaled to stand for another leaf of
 * the same plant (the palm's fronds). gust: how hard the draught from the sash reaches it. */
export const PLACES: { id: string; leaf: string; x: number; y: number; rot: number; scale: number; gust: number }[] = [
  { id: 'frondD', leaf: 'frondA', x: PC.x - 8, y: PC.y - 2, rot: -1.05, scale: 0.74, gust: 0.6 },
  { id: 'frondC', leaf: 'frondB', x: PC.x - 2, y: PC.y + 10, rot: 0.82, scale: 0.7, gust: 0.7 },
  { id: 'frondA', leaf: 'frondA', x: PC.x, y: PC.y, rot: 0, scale: 1, gust: 0.8 },
  { id: 'frondB', leaf: 'frondB', x: PC.x + 4, y: PC.y + 6, rot: 0, scale: 1, gust: 0.9 },
  { id: 'bananaB', leaf: 'bananaB', x: BN.x - 10, y: BN.top + 8, rot: 0, scale: 1, gust: 1.2 },
  { id: 'bananaA', leaf: 'bananaA', x: BN.x - 6, y: BN.top - 4, rot: 0, scale: 1, gust: 1.1 },
  { id: 'monsteraB', leaf: 'monsteraB', x: 300, y: 708, rot: 0, scale: 1, gust: 0.35 },
  { id: 'monsteraA', leaf: 'monsteraA', x: 92, y: 700, rot: 0, scale: 1, gust: 0.4 },
  { id: 'earB', leaf: 'earB', x: 1640, y: 716, rot: 0, scale: 1, gust: 0.35 },
  { id: 'earA', leaf: 'earA', x: 1800, y: 690, rot: 0, scale: 1, gust: 0.4 },
];

/** The palm's heart: the bases of its fronds, fibrous and dark, where they all spring from (over the fronds). */
const HEART = { w: 96, h: 84 };
function palmHeart(c: Ctx, x: number, y: number): void {
  const rr = mkRng(51);
  for (let k = 0; k < 9; k++) {
    const a = -Math.PI / 2 + (k / 8 - 0.5) * 2.6;
    const l = 26 + rr() * 14;
    const p: PathFn = (g) => {
      g.beginPath();
      g.moveTo(x - Math.sin(a) * 7, y + Math.cos(a) * 7 + 18);
      g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 - Math.sin(a) * 9, y + Math.sin(a) * l * 0.5 + 10, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + Math.sin(a) * 9, y + Math.sin(a) * l * 0.5 + 10, x + Math.sin(a) * 7, y - Math.cos(a) * 7 + 18);
      g.closePath();
    };
    flat(c, p, k % 2 ? '#2e2a22' : '#3a3428', 1.6, LEAF_INK, 0.3);
    within(c, p, () => {
      c.strokeStyle = rgba('#6a6250', 0.4);
      c.lineWidth = 0.8;
      for (let q = 0; q < 5; q++) {
        c.beginPath();
        c.moveTo(x + (rr() - 0.5) * 20, y + 20);
        c.lineTo(x + Math.cos(a) * l * (0.6 + rr() * 0.4) + (rr() - 0.5) * 6, y + Math.sin(a) * l * (0.6 + rr() * 0.4));
        c.stroke();
      }
    });
  }
  c.fillStyle = rgba(RIM, 0.25);
  c.beginPath();
  c.ellipse(x - 10, y + 4, 10, 4, -0.5, 0, P2);
  c.fill();
}

/** A placed leaf in the still: its sheet's leaf at rest, turned and scaled onto its place. */
function drawPlaced(ctx: Ctx, p: (typeof PLACES)[number], cv: HTMLCanvasElement, k: number): void {
  const L = LEAVES[p.leaf];
  const bx = leafBox(L);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.scale(p.scale, p.scale);
  ctx.drawImage(cv, bx.x - L.x, bx.y - L.y, cv.width / k, cv.height / k);
  ctx.restore();
}

function heroStill(ctx: Ctx): void {
  const cache = new Map<string, HTMLCanvasElement>();
  for (const p of PLACES) {
    let cv = cache.get(p.leaf);
    if (!cv) cache.set(p.leaf, (cv = leafCanvas(LEAVES[p.leaf], 0)));
    drawPlaced(ctx, p, cv, 1);
    if (p.id === 'frondB') palmHeart(ctx, PC.x, PC.y);
  }
}

// ——— the jungle across the middle: a deep, quiet mass in moon-shadow ———
// Where the fight's bushes come up (NV.hunt): low in value and detail, cool, nothing bright or warm in it, so her
// amber eyes and the green fireflies are the brightest things there. Its top edge breaks into single leaves against
// the glass, rimmed by the moon; lower down the leaves only just separate.

/** A leaf as a flat silhouette (the band's leaves): one tone, a faint midrib, the moon's rim on the edge turned to it,
 * a thin ink line. kind: 'lance' a narrow blade, 'heart' an elephant ear, 'paddle' a torn banana leaf. */
function silLeaf(ctx: Ctx, kind: 'lance' | 'heart' | 'paddle' | 'split', x: number, y: number, a: number, len: number, wid0: number, curl: number, col: string, rimA: number, seed: number): void {
  const wid = Math.min(wid0, len * 0.72);
  const L: Leaf = { kind: kind === 'heart' ? 'ear' : kind === 'split' ? 'monstera' : 'banana', x, y, a, len, wid, curl, droop: curl * 0.6, seed, amp: 0, pal: PAL_EAR, point: kind === 'lance' };
  const rib = ribOf(L, 0, 16);
  const e1 = halfOutline(L, rib, 1, 0);
  const e2 = halfOutline(L, rib, -1, 0);
  const p = polyPath([...e1, ...e2.reverse()]);
  flat(ctx, p, col, 0, LEAF_INK);
  const lit = facesLight(rib, 1) > 0 ? 1 : -1;
  within(ctx, p, () => {
    const m = ribAt(rib, 0.5);
    const e = off(rib, len, 0.5, wid, -lit);
    const g = ctx.createLinearGradient(m.x, m.y, e[0], e[1]);
    g.addColorStop(0, rgba(J_DARK, 0));
    g.addColorStop(1, rgba(J_DARK, 0.45));
    ctx.fillStyle = g;
    ctx.fillRect(x - len * 1.5, y - len * 1.5, len * 3, len * 3);
    ctx.strokeStyle = rgba(J_RIM, 0.14);
    ctx.lineWidth = 1.2;
    linePath(rib.map((q) => [q.x, q.y] as [number, number]))(ctx);
    ctx.stroke();
    // its veins, only just there on the half turned to the moon
    ctx.strokeStyle = rgba(J_RIM, 0.08);
    ctx.lineWidth = 1;
    for (let k = 1; k < 7; k++) {
      linePath(veinPts(L, rib, k / 7.4, lit, 1, L.kind === 'banana' ? 0.04 : 0.12, 0))(ctx);
      ctx.stroke();
    }
    if (rimA > 0) {
      ctx.strokeStyle = rgba(J_RIM, rimA);
      ctx.lineWidth = 2.4;
      linePath(lit > 0 ? e1 : e2.slice().reverse())(ctx);
      ctx.stroke();
    }
    if (kind === 'paddle' || kind === 'split') {
      // tears/slits as dark lines along the veins
      const rr = mkRng(seed);
      ctx.strokeStyle = rgba(LEAF_INK, 0.7);
      ctx.lineWidth = kind === 'split' ? 3 : 1.4;
      for (let k = 0; k < 5; k++) {
        const s = 0.15 + rr() * 0.75;
        const sd = rr() < 0.5 ? 1 : -1;
        linePath(veinPts(L, rib, s, sd, 1.1, kind === 'split' ? 0.1 : 0.03, 0).slice(2))(ctx);
        ctx.stroke();
      }
    }
  });
  ink(ctx, p, 1.2, LEAF_INK, 0.3);
}

/** A dark fern frond in the band (a frond painted in the band's tones). */
const PAL_BAND: LeafPal = { lit: J_LIT, mid: J_MID, dark: J_DARK, vein: '#2a4a48', rim: J_RIM };
/** The band's tones further darkened at the far sides, behind where the upper bushes come up. */
const PAL_BAND_D: LeafPal = { lit: mix(J_LIT, J_DARK, 0.45), mid: mix(J_MID, J_DARK, 0.35), dark: J_DARK, vein: '#1e3634', rim: mix(J_RIM, J_DARK, 0.4) };
const sideK = (x: number) => (x < 450 || x > 1450 ? 1 : 0);

const JUNGLE_BOX: Box = { x: 0, y: 236, w: W, h: TY - 236 };

/** The top edge of the mass: low over the fountain, rising at the sides. */
const massTop = (x: number) => 372 - 18 * Math.sin((x / W) * Math.PI * 3.1 + 0.6) - 24 * (Math.abs(x - 960) / 960) ** 1.5;

function jungle(ctx: Ctx, r: R): void {
  // the body of the mass, soft and dark, sitting on the floor
  softly(ctx, JUNGLE_BOX, (g) => {
    g.fillStyle = J_DARK;
    g.beginPath();
    g.moveTo(-20, TY);
    // its top a ragged run of leaf tips (never a line), tucked under the back rank's feet
    for (let x = -20; x <= W + 20; x += 16) {
      const tip = r() < 0.3 ? 26 + r() * 30 : 0;
      g.lineTo(x - 6, massTop(x) + 58 + (r() - 0.5) * 20);
      g.lineTo(x, massTop(x) + 52 - tip);
    }
    g.lineTo(W + 20, TY);
    g.closePath();
    g.fill();
  }, 0.25);
  // a back rank: fronds and tall blades standing up against the glass (the edge, rimmed by the moon)
  for (let x = -30; x < W + 30; x += 24 + r() * 26) {
    const y = massTop(x) + 50 + r() * 24;
    const k = r();
    const a = -Math.PI / 2 + (r() - 0.5) * 1.3;
    const col = mix(mix(J_DARK, J_MID, 0.3 + r() * 0.5), J_DARK, sideK(x) * 0.3);
    const rim = (0.26 + r() * 0.2) * (1 - sideK(x) * 0.45);
    if (k < 0.36) {
      paintFrond(ctx, { kind: 'frond', x, y: y + 10, a, len: 100 + r() * 60, wid: 0, curl: (r() - 0.5) * 0.8, droop: (x < 960 ? 1 : -1) * 0.5, seed: Math.floor(r() * 1e4), amp: 0, pal: sideK(x) ? PAL_BAND_D : PAL_BAND }, 0);
    } else if (k < 0.72) silLeaf(ctx, 'lance', x, y, a, 70 + r() * 50, 10 + r() * 8, (r() - 0.5) * 0.9, col, rim, Math.floor(r() * 1e4));
    else if (k < 0.88) silLeaf(ctx, 'paddle', x, y + 20, a, 90 + r() * 50, 20 + r() * 8, (r() - 0.5) * 1.2, col, rim, Math.floor(r() * 1e4));
    else silLeaf(ctx, 'heart', x, y + 20, a, 50 + r() * 30, 30 + r() * 14, (r() - 0.5) * 0.6, col, rim, Math.floor(r() * 1e4));
  }
  // the middle: big leaves overlapping, barely separating (a cool sheen only where they turn to the moon)
  for (let i = 0; i < 64; i++) {
    const x = r() * W;
    const y = 430 + r() * 190;
    const k = r();
    const a = -Math.PI / 2 + (r() - 0.5) * 2.4;
    const col = mix(J_DARK, J_MID, 0.2 + r() * 0.6);
    const rim = r() < 0.3 ? 0.12 : 0;
    // (none reaching above the back rank: the mass keeps its broken edge, no peak)
    const cap = (len: number) => Math.min(len, (y - massTop(x) - 20) / Math.max(0.35, -Math.sin(a)));
    if (k < 0.35) silLeaf(ctx, 'heart', x, y, a, cap(90 + r() * 70), 54 + r() * 30, (r() - 0.5) * 0.8, col, rim, i * 7);
    else if (k < 0.6) silLeaf(ctx, 'split', x, y, a, cap(90 + r() * 60), 56 + r() * 26, (r() - 0.5) * 0.8, col, rim, i * 7);
    else if (k < 0.82) silLeaf(ctx, 'paddle', x, y, a, cap(160 + r() * 90), 30 + r() * 10, (r() - 0.5) * 1.2, col, rim, i * 7);
    else silLeaf(ctx, 'lance', x, y, a, cap(100 + r() * 80), 16 + r() * 8, (r() - 0.5) * 1, col, rim, i * 7);
  }
  // the front rank, low and either side of the clearing: a little lighter, rimmed
  for (let i = 0; i < 46; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side < 0 ? r() * 640 : 1280 + r() * 640;
    const y = 600 + r() * 120;
    const a = -Math.PI / 2 + (r() - 0.5) * 2 + (side < 0 ? -0.2 : 0.2);
    const col = mix(J_MID, J_LIT, r() * 0.6);
    const k = r();
    if (k < 0.4) silLeaf(ctx, 'heart', x, y, a, 70 + r() * 60, 44 + r() * 24, (r() - 0.5) * 0.8, col, 0.3, 500 + i);
    else if (k < 0.7) silLeaf(ctx, 'split', x, y, a, 80 + r() * 50, 50 + r() * 20, (r() - 0.5) * 0.8, col, 0.3, 500 + i);
    else paintFrond(ctx, { kind: 'frond', x, y, a, len: 120 + r() * 60, wid: 0, curl: side * 0.4, droop: side * 0.5, seed: 500 + i, amp: 0, pal: PAL_BAND }, 0);
  }
  // behind the fountain, the clearing's back edge: ferns arching over the floor
  for (let i = 0; i < 9; i++) {
    const x = 660 + i * 76 + (r() - 0.5) * 30;
    const sd = x < 960 ? -1 : 1;
    paintFrond(ctx, { kind: 'frond', x, y: 676 + r() * 10, a: -Math.PI / 2 + sd * (0.5 + r() * 0.4), len: 110 + r() * 50, wid: 0, curl: sd * 0.7, droop: sd * 0.6, seed: 600 + i, amp: 0, pal: PAL_BAND }, 0);
  }
  // where the mass meets the floor: its contact shade
  const g = ctx.createLinearGradient(0, 640, 0, 720);
  g.addColorStop(0, rgba('#000000', 0));
  g.addColorStop(0.6, rgba('#000000', 0.22));
  g.addColorStop(1, rgba('#000000', 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 640, W, 80);
}

// ——— the palms and the banana's stem ———

/** A palm trunk from its foot (x0, y0) to its crown (x1, y1): ring scars, lit on the moon's side, the old frond bases
 * near the top. Its claw marks (claws: true) small and low. */
function palmTrunk(ctx: Ctx, r: R, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, claws = false, a = 1): void {
  const n = 24;
  const at = (u: number): [number, number, number] => {
    const x = x0 + (x1 - x0) * u + Math.sin(u * Math.PI) * (x1 - x0 + 30) * 0.18;
    return [x, y0 + (y1 - y0) * u, w0 + (w1 - w0) * u];
  };
  const L: [number, number][] = [];
  const R: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const [x, y, w] = at(i / n);
    L.push([x - w / 2, y]);
    R.push([x + w / 2, y]);
  }
  const p = polyPath([...L, ...R.reverse()]);
  const base = mix('#3a3a34', '#1a2020', 1 - a);
  flat(ctx, p, base, 0, INK);
  within(ctx, p, () => {
    // the moon down its left flank, the shade printed down its right
    for (let i = 0; i < n; i++) {
      const [x, y, w] = at(i / n);
      const [, y2] = at((i + 1) / n);
      ctx.fillStyle = rgba(RIM, 0.22 * a);
      ctx.fillRect(x - w / 2, y2, w * 0.2, y - y2 + 1);
      ctx.fillStyle = rgba('#000000', 0.35);
      ctx.fillRect(x + w * 0.15, y2, w * 0.4, y - y2 + 1);
    }
    dots(ctx, { x: Math.min(x0, x1) - w0, y: y1, w: Math.abs(x1 - x0) + w0 * 3, h: y0 - y1 }, (x, y) => {
      const u = (y0 - y) / (y0 - y1);
      const [cx] = at(u);
      return 0.15 + Math.max(0, (x - cx) / w0) * 1.2;
    }, '#000000', { step: 4.5, angle: 0.79, a: 0.6 });
    // the ring scars: curved bands across, each with a lit upper lip and a dark crease under it
    for (let y = y0 - 8; y > y1 + 10; y -= 13 + r() * 6) {
      const u = (y0 - y) / (y0 - y1);
      const [cx, , w] = at(u);
      ctx.strokeStyle = rgba('#0a0c0a', 0.55);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, y);
      ctx.quadraticCurveTo(cx, y + 5, cx + w / 2, y);
      ctx.stroke();
      ctx.strokeStyle = rgba(RIM, 0.2 * a);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, y - 2);
      ctx.quadraticCurveTo(cx - w * 0.2, y + 1.5, cx + w * 0.1, y + 1);
      ctx.stroke();
    }
    if (claws) {
      const [cx, , w] = at(0.7);
      clawMarks(ctx, cx - w * 0.2, y0 - (y0 - y1) * 0.72, 58, 0.12, 0.55, '#b8c8c0', '#000000');
    }
  });
  ink(ctx, p, 2.2, INK, 0.5);
}

const BACK_PALM = { x: 1296, foot: 470, crown: { x: 1310, y: 214 } };

function palmsBack(ctx: Ctx, r: R): void {
  // a palm further back, its trunk rising out of the mass, its crown dark against the glass
  palmTrunk(ctx, r, BACK_PALM.x, BACK_PALM.foot, BACK_PALM.crown.x, BACK_PALM.crown.y + 10, 26, 20, false, 0.5);
  const back: LeafPal = { lit: '#22403a', mid: '#132a26', dark: '#08140f', vein: '#3a5a50', rim: '#5a8888' };
  for (const [a, len, curl, droop] of [[-1.9, 200, -0.5, -0.4], [-1.3, 220, 0.4, 0.3], [-2.6, 210, -0.6, -0.6], [-0.6, 230, 0.5, 0.6], [-3.3, 180, -0.4, -0.5], [0.2, 170, 0.4, 0.4]] as const) {
    paintFrond(ctx, { kind: 'frond', x: BACK_PALM.crown.x, y: BACK_PALM.crown.y, a, len, wid: 0, curl, droop, seed: Math.floor(r() * 1e4), amp: 0, pal: back }, 0);
  }
}

function bananaStem(ctx: Ctx): void {
  // the banana's pseudostem on the right: sheathed, smooth, a dead leaf hanging down it
  const bx = BN.x;
  const stem: PathFn = (c) => {
    c.beginPath();
    c.moveTo(bx - 24, TY + 4);
    c.bezierCurveTo(bx - 22, 560, bx - 18, 400, bx - 14, BN.top + 30);
    c.lineTo(bx + 16, BN.top + 30);
    c.bezierCurveTo(bx + 20, 400, bx + 22, 560, bx + 26, TY + 4);
    c.closePath();
  };
  flat(ctx, stem, '#23362c', 0, INK);
  within(ctx, stem, () => {
    ctx.fillStyle = rgba(RIM, 0.22);
    ctx.fillRect(bx - 26, BN.top, 10, TY);
    for (let k = 0; k < 5; k++) {
      const sx = bx - 20 + k * 10;
      ctx.strokeStyle = rgba(k % 2 ? '#0a120e' : '#3e5a48', 0.5);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx, TY);
      ctx.quadraticCurveTo(sx + 2, 500, sx * 0.4 + bx * 0.6, BN.top + 30);
      ctx.stroke();
    }
    dots(ctx, { x: bx - 26, y: BN.top, w: 54, h: TY - BN.top }, linTone(bx - 6, 0, bx + 26, 0, 0.1, 0.8), '#000000', { step: 4, angle: 0.79, a: 0.6 });
    // the sheaths' torn edges spiralling up
    for (let y = TY - 30; y > BN.top + 60; y -= 70) {
      ctx.strokeStyle = rgba('#5a6a50', 0.35);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(bx - 22, y);
      ctx.quadraticCurveTo(bx, y - 20, bx + 22, y - 44);
      ctx.stroke();
    }
  });
  ink(ctx, stem, 2.2, INK, 0.5);
  // a dead leaf hanging down the stem, brown and shredded
  const dl: PathFn = (c) => {
    c.beginPath();
    c.moveTo(bx - 12, BN.top + 40);
    c.quadraticCurveTo(bx - 44, BN.top + 110, bx - 34, BN.top + 230);
    c.lineTo(bx - 22, BN.top + 250);
    c.quadraticCurveTo(bx - 16, BN.top + 140, bx + 4, BN.top + 46);
    c.closePath();
  };
  flat(ctx, dl, '#2e2a20', 1.6, INK, 0.4);
  within(ctx, dl, () => {
    ctx.strokeStyle = rgba('#0a0806', 0.6);
    ctx.lineWidth = 1;
    for (let k = 0; k < 6; k++) {
      ctx.beginPath();
      ctx.moveTo(bx - 30 + k * 4, BN.top + 60 + k * 10);
      ctx.lineTo(bx - 36 + k * 4, BN.top + 240);
      ctx.stroke();
    }
  });
}

// ——— vines and orchids hanging from the gallery ———

const VINE_TS = [-54, -50.6, -47.2, 37.2, 40.6, 44, -9, 9].map((d) => d * D2R);

function vines(ctx: Ctx, r: R, left: boolean): void {
  VINE_TS.forEach((t, i) => {
    if ((i < 3) !== left) return;
    const [x0, y0] = drumPt(t, DM.hd + GAL.rail, RR);
    const short = Math.abs(t) < 20 * D2R;
    const len = short ? 50 + r() * 20 : 120 + r() * 120;
    const sway = (r() - 0.5) * 30;
    const pts: [number, number][] = [];
    for (let k = 0; k <= 12; k++) {
      const u = k / 12;
      pts.push([x0 + sway * u * u + Math.sin(u * 5 + i) * 6, y0 + len * u]);
    }
    ctx.strokeStyle = LEAF_INK;
    ctx.lineWidth = 3.6;
    linePath(pts)(ctx);
    ctx.stroke();
    ctx.strokeStyle = '#1e3430';
    ctx.lineWidth = 2;
    linePath(pts)(ctx);
    ctx.stroke();
    // small heart leaves alternating down it
    for (let k = 1; k < pts.length; k += 1) {
      const [x, y] = pts[k];
      const sd = k % 2 ? 1 : -1;
      silLeaf(ctx, 'heart', x, y, Math.PI / 2 + sd * (0.9 + r() * 0.4), 16 + r() * 8, 10 + r() * 4, sd * 0.3, mix(J_MID, J_LIT, r()), 0.4, i * 40 + k);
    }
    // orchids on the left pair, high (pale sprays, well above where she hides)
    if (i === 1 || i === 4) {
      for (let k = 0; k < 6; k++) {
        const fx = x0 + 10 + k * 7 + (r() - 0.5) * 4;
        const fy = y0 + 26 + k * 6 + Math.sin(k) * 3;
        orchid(ctx, fx, fy, 4.6 - k * 0.35, r);
      }
    }
  });
}

/** An orchid bloom: five pale petals and a darker lip, moonlit (tiny). */
function orchid(ctx: Ctx, x: number, y: number, s: number, r: R): void {
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k / 5) * P2 + (r() - 0.5) * 0.2;
    ctx.fillStyle = k === 2 ? '#6a6a84' : '#8a8aa2';
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * s * 0.8, y + Math.sin(a) * s * 0.8, s * 0.8, s * 0.42, a, 0, P2);
    ctx.fill();
  }
  ctx.fillStyle = '#4a4660';
  ctx.beginPath();
  ctx.arc(x, y + s * 0.3, s * 0.4, 0, P2);
  ctx.fill();
}

// ——— the floor: encaustic tiles in the clearing, mossed, littered ———

const FLOOR_Y = 628;
const FLOOR_BOX: Box = { x: 0, y: FLOOR_Y, w: W, h: TY - FLOOR_Y };
const TILE = 0.07;

function floor(ctx: Ctx, r: R): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, FLOOR_Y, W, TY - FLOOR_Y);
  ctx.clip();
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, FLOOR_Y, W, TY - FLOOR_Y);
  const cols = ['#5a3a32', '#6e6656', '#5a3a32', '#2a2c2a'];
  for (let zi = 0; zi < 12; zi++) {
    const z0 = 0.38 + zi * TILE;
    const z1 = z0 + TILE;
    for (let xi = -26; xi < 26; xi++) {
      const x0 = xi * TILE;
      const x1 = x0 + TILE;
      const c0 = floorPt(x0, z0);
      const c1 = floorPt(x1, z0);
      const c2 = floorPt(x1, z1);
      const c3 = floorPt(x0, z1);
      if (Math.max(c0[0], c1[0]) < -40 || Math.min(c2[0], c3[0]) > W + 40) continue;
      const q = polyPath([[c0[0], c0[1]], [c1[0], c1[1]], [c2[0], c2[1]], [c3[0], c3[1]]]);
      // the pattern: chequer of terracotta and buff, a black square at every fourth crossing
      let col = cols[((xi + zi) % 2 + 2) % 2];
      if (((xi % 4) + 4) % 4 === 0 && zi % 4 === 0) col = cols[3];
      const dark = 0.4 + (1 - (z0 - 0.38) / 0.84) * 0 + (r() - 0.5) * 0.08;
      ctx.fillStyle = mix(col, '#0a1014', dark);
      q(ctx);
      ctx.fill();
      // a broken tile now and then
      if (r() < 0.04) {
        ctx.strokeStyle = rgba('#000000', 0.5);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(c0[0] + (c1[0] - c0[0]) * r(), c0[1]);
        ctx.lineTo(c3[0] + (c2[0] - c3[0]) * r(), c3[1]);
        ctx.stroke();
      }
    }
  }
  // grout: moss-dark lines on the tile grid (the same spacing), deeper towards the back
  ctx.strokeStyle = rgba('#0a120c', 0.7);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (let zi = 0; zi <= 12; zi++) {
    const z = 0.38 + zi * TILE;
    const a = floorPt(-1.9, z);
    const b = floorPt(1.9, z);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
  }
  for (let xi = -26; xi <= 26; xi++) {
    const a = floorPt(xi * TILE, 0.38);
    const b = floorPt(xi * TILE, 1.3);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
  }
  ctx.stroke();
  // moss creeping out of the grout from the jungle's edge, patchy
  for (let i = 0; i < 160; i++) {
    const x = r() * W;
    const y = FLOOR_Y + Math.pow(r(), 1.8) * (TY - FLOOR_Y);
    ctx.fillStyle = rgba(r() < 0.5 ? '#2a3a26' : '#1e2c1e', 0.35 + r() * 0.3);
    ctx.beginPath();
    ctx.ellipse(x, y, 4 + r() * 12, 1.5 + r() * 3, 0, 0, P2);
    ctx.fill();
  }
  // fallen leaves lying flat on the tiles
  for (let i = 0; i < 26; i++) {
    const x = 480 + r() * 960;
    const y = 690 + r() * 66;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.4);
    ctx.rotate(r() * P2);
    const l = 10 + r() * 10;
    ctx.fillStyle = r() < 0.5 ? '#26342a' : '#33302a';
    ctx.beginPath();
    ctx.moveTo(-l, 0);
    ctx.quadraticCurveTo(0, -l * 0.45, l, 0);
    ctx.quadraticCurveTo(0, l * 0.45, -l, 0);
    ctx.fill();
    ctx.restore();
  }
  // the floor's shade: dark back under the mass, the corners
  vfill(ctx, 0, FLOOR_Y, W, TY - FLOOR_Y, [[0, rgba('#000000', 0.55)], [0.5, rgba('#000000', 0.2)], [1, rgba('#000000', 0.1)]]);
  dots(ctx, FLOOR_BOX, (x) => 0.15 + 0.5 * (Math.abs(x - 960) / 960) ** 2, '#000000', { step: 6, angle: 0.79, a: 0.5 });
  ctx.restore();
}

// ——— the fountain: a pineapple finial over two stone bowls, a koi pool choked with lilies ———

const POOL = FT.pool;
const LOW = FT.low;
const HIGH = FT.high;
const FOUNTAIN_BOX: Box = { x: FT.x - POOL.rx - 30, y: FT.top - 20, w: POOL.rx * 2 + 70, h: TY - FT.top + 20 };

/** Stone, moonlit from the top left: a body tone, the lit side, the shade in dots, moss and water stains. */
function stoneFill(ctx: Ctx, p: PathFn, box: Box, cx: number, wet = 0.5, moss = 0.5, seed = 1): void {
  flat(ctx, p, STONE, 0, INK);
  within(ctx, p, () => {
    const g = ctx.createLinearGradient(box.x, 0, box.x + box.w, 0);
    g.addColorStop(0, rgba('#c8dce0', 0.2));
    g.addColorStop(0.35, rgba('#c8dce0', 0.05));
    g.addColorStop(0.6, rgba('#000000', 0.1));
    g.addColorStop(1, rgba('#000000', 0.4));
    ctx.fillStyle = g;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    const rr = mkRng(seed);
    // stains run down from the lips, moss gathers low and in the shade
    for (let k = 0; k < 10 * wet; k++) {
      const x = box.x + rr() * box.w;
      ctx.fillStyle = rgba('#1a2424', 0.18 + rr() * 0.12);
      ctx.fillRect(x, box.y, 2 + rr() * 5, box.h * (0.4 + rr() * 0.6));
    }
    for (let k = 0; k < 18 * moss; k++) {
      const x = box.x + rr() * box.w;
      const y = box.y + box.h * (0.5 + rr() * 0.5);
      ctx.fillStyle = rgba(rr() < 0.5 ? MOSS : '#2a4430', 0.3 + rr() * 0.3);
      ctx.beginPath();
      ctx.ellipse(x, y, 3 + rr() * 8, 2 + rr() * 4, 0, 0, P2);
      ctx.fill();
    }
    dots(ctx, box, linTone(cx - box.w * 0.05, 0, box.x + box.w, 0, 0.05, 0.75), '#0a1012', { step: 4.5, angle: 0.79, a: 0.6 });
  });
  ink(ctx, p, 2, INK, 0.5);
}

/** The lathe profile of the pedestal and the upper stem (half-widths at heights). */
const PED: [number, number][] = [[POOL.y - 4, 40], [POOL.y - 14, 34], [POOL.y - 22, 24], [POOL.y - 40, 19], [POOL.y - 58, 28], [POOL.y - 72, 22], [LOW.y + 30, 16], [LOW.y + 22, 30]];
const STEM: [number, number][] = [[LOW.y - 2, 13], [LOW.y - 14, 10], [LOW.y - 30, 14], [LOW.y - 40, 9], [HIGH.y + 18, 8], [HIGH.y + 12, 16]];

function lathe(prof: [number, number][], cx: number): PathFn {
  return polyPath([...prof.map(([y, w]) => [cx - w, y] as [number, number]), ...prof.slice().reverse().map(([y, w]) => [cx + w, y] as [number, number])]);
}

/** A bowl: its underside down from the rim to the stem, the rim's lip, the water in it. */
function bowl(ctx: Ctx, cx: number, y: number, rx: number, ry: number, depth: number, foot: number, seed: number): void {
  const under: PathFn = (c) => {
    c.beginPath();
    c.ellipse(cx, y, rx, ry, 0, 0, Math.PI);
    c.quadraticCurveTo(cx - rx * 0.7, y + depth, cx - foot, y + depth);
    c.lineTo(cx + foot, y + depth);
    c.quadraticCurveTo(cx + rx * 0.7, y + depth, cx + rx, y);
    c.closePath();
  };
  stoneFill(ctx, under, { x: cx - rx, y, w: rx * 2, h: depth + 4 }, cx, 1, 0.7, seed);
  // the rim: a lip (lit on its top), the water inside it
  const rim = ellPath(cx, y, rx, ry);
  flat(ctx, rim, mix(STONE, '#c8dce0', 0.25), 2, INK, 0.3);
  const water = ellPath(cx, y + 1, rx * 0.88, ry * 0.7);
  flat(ctx, water, '#0e1c22', 0, INK);
  within(ctx, water, () => {
    ctx.fillStyle = rgba('#5a7a8a', 0.35);
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.3, y - ry * 0.15, rx * 0.4, ry * 0.2, 0, 0, P2);
    ctx.fill();
    ctx.fillStyle = rgba(MOON, 0.5);
    ctx.fillRect(cx - rx * 0.5, y - 1, rx * 0.3, 1.4);
  });
  ink(ctx, water, 1.2, INK, 0);
}

/** The pineapple finial: an ovoid of diamond scales under a crown of stiff stone leaves. */
function pineapple(ctx: Ctx, cx: number, base: number, top: number): void {
  const h = base - top;
  const body = ellPath(cx, base - h * 0.36, h * 0.24, h * 0.34);
  stoneFill(ctx, body, { x: cx - h * 0.24, y: base - h * 0.7, w: h * 0.48, h: h * 0.7 }, cx, 0.4, 0.3, 7);
  within(ctx, body, () => {
    ctx.strokeStyle = rgba('#0a1012', 0.5);
    ctx.lineWidth = 1;
    for (let k = -6; k <= 6; k++) {
      ctx.beginPath();
      ctx.moveTo(cx + k * 6 - 20, base);
      ctx.lineTo(cx + k * 6 + 20, base - h * 0.75);
      ctx.moveTo(cx + k * 6 + 20, base);
      ctx.lineTo(cx + k * 6 - 20, base - h * 0.75);
      ctx.stroke();
    }
  });
  for (let k = -3; k <= 3; k++) {
    const a = -Math.PI / 2 + k * 0.32;
    const l = h * (0.36 - Math.abs(k) * 0.03);
    const bx = cx + k * 2;
    const by = base - h * 0.66;
    const leaf = polyPath([[bx - 3, by], [bx + Math.cos(a) * l, by + Math.sin(a) * l], [bx + 3, by]]);
    flat(ctx, leaf, k < 0 ? '#8a9896' : '#5a6664', 1.2, INK, 0.2);
  }
}

function pool(ctx: Ctx, r: R): void {
  const { x } = FT;
  const P = POOL;
  // the kerb's outer wall (only its front shows), then its top, then the water
  const wall: PathFn = (c) => {
    c.beginPath();
    c.ellipse(x, P.y, P.rx, P.ry, 0, 0, Math.PI);
    c.lineTo(x - P.rx, P.y + P.kerb);
    c.ellipse(x, P.y + P.kerb, P.rx, P.ry, 0, Math.PI, 0, true);
    c.closePath();
  };
  castShadow(ctx, ellPath(x, P.y + P.kerb * 0.5, P.rx, P.ry + 6), 8, 10, 0.5, '#000000');
  stoneFill(ctx, wall, { x: x - P.rx, y: P.y - P.ry, w: P.rx * 2, h: P.ry * 2 + P.kerb }, x - 120, 0.3, 1, 3);
  const top = ellPath(x, P.y, P.rx, P.ry);
  flat(ctx, top, mix(STONE, '#000000', 0.12), 2, INK, 0.3);
  within(ctx, top, () => {
    // the coping's joints on one spacing round it
    ctx.strokeStyle = rgba('#0a1012', 0.5);
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * P2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * (P.rx - 16), P.y + Math.sin(a) * (P.ry - 6));
      ctx.lineTo(x + Math.cos(a) * P.rx, P.y + Math.sin(a) * P.ry);
      ctx.stroke();
    }
    for (let k = 0; k < 30; k++) {
      const a = r() * P2;
      ctx.fillStyle = rgba(MOSS, 0.4);
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * (P.rx - 8), P.y + Math.sin(a) * (P.ry - 3), 5 + r() * 8, 2, 0, 0, P2);
      ctx.fill();
    }
  });
  const wat = ellPath(x, P.y + 1, P.rx - 15, P.ry - 6);
  flat(ctx, wat, '#08141a', 0, INK);
  within(ctx, wat, () => {
    // the sky in it at the back, the depth darkening towards us
    vfill(ctx, x - P.rx, P.y - P.ry, P.rx * 2, P.ry * 2, [[0, '#24344a'], [0.45, '#0e1c26'], [1, '#060c10']]);
    // the fountain's reflection, dark and broken
    ctx.fillStyle = rgba('#000000', 0.35);
    ctx.fillRect(x - 30, P.y - 8, 60, 30);
    // koi under the surface: pale, ink-patched, faint
    for (const [kx, ky, ka] of [[x - 150, P.y + 6, 0.2], [x + 120, P.y + 10, -2.9]] as const) {
      ctx.save();
      ctx.translate(kx, ky);
      ctx.rotate(ka);
      ctx.scale(1, 0.45);
      ctx.fillStyle = rgba('#c8d0d4', 0.4);
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.quadraticCurveTo(-4, -9, 14, -2);
      ctx.lineTo(24, -7);
      ctx.lineTo(22, 0);
      ctx.lineTo(24, 7);
      ctx.lineTo(14, 2);
      ctx.quadraticCurveTo(-4, 9, -22, 0);
      ctx.fill();
      ctx.fillStyle = rgba('#14181c', 0.4);
      ctx.beginPath();
      ctx.ellipse(-6, -1, 5, 3, 0, 0, P2);
      ctx.ellipse(6, 2, 4, 2.4, 0, 0, P2);
      ctx.fill();
      ctx.restore();
    }
    // the moon's glint: a broken streak across the back of the water
    for (let k = 0; k < 9; k++) {
      ctx.fillStyle = rgba(MOON, 0.25 + r() * 0.3);
      ctx.fillRect(x - 200 + k * 22 + r() * 8, P.y - 12 + r() * 4, 8 + r() * 10, 1.4);
    }
    // the lily pads: crowding the edges and the pedestal's foot, each with its notch and a lit rim
    for (let i = 0; i < 46; i++) {
      const a = r() * P2;
      const d = i < 30 ? 0.62 + r() * 0.36 : 0.18 + r() * 0.3;
      const px = x + Math.cos(a) * (P.rx - 15) * d;
      const py = P.y + 1 + Math.sin(a) * (P.ry - 6) * d;
      const s = 9 + r() * 12;
      lilyPad(ctx, px, py, s, r() * P2, r);
    }
    for (const [fx, fy] of [[x - 190, P.y + 4], [x + 170, P.y - 6], [x - 70, P.y + 14], [x + 214, P.y + 8]] as const) lily(ctx, fx, fy, 6);
  });
  ink(ctx, wat, 1.4, INK, 0);
}

function lilyPad(ctx: Ctx, x: number, y: number, s: number, notch: number, r: R): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.38);
  const p: PathFn = (c) => {
    c.beginPath();
    c.moveTo(0, 0);
    c.arc(0, 0, s, notch + 0.25, notch + P2 - 0.25);
    c.closePath();
  };
  flat(ctx, p, mix('#1e3a2c', '#2e4e36', r()), 1.6, INK, 0);
  within(ctx, p, () => {
    ctx.strokeStyle = rgba('#5a8a6a', 0.5);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, s - 1, Math.PI * 0.9, Math.PI * 1.6);
    ctx.stroke();
  });
  ctx.restore();
}

/** A water lily: pale pointed petals in two rings, a darker heart (cool white-lilac). */
function lily(ctx: Ctx, x: number, y: number, s: number): void {
  for (let ring = 0; ring < 2; ring++)
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + (k / 6) * Math.PI + ring * 0.25 - Math.PI * 0.0;
      const l = s * (ring ? 1 : 1.3);
      ctx.fillStyle = ring ? '#d8d0e4' : '#a898b4';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a - 0.3) * l * 0.6, y + Math.sin(a - 0.3) * l * 0.6, x + Math.cos(a) * l, y + Math.sin(a) * l * 0.8);
      ctx.quadraticCurveTo(x + Math.cos(a + 0.3) * l * 0.6, y + Math.sin(a + 0.3) * l * 0.6, x, y);
      ctx.fill();
    }
  ctx.fillStyle = '#7a8a6a';
  ctx.beginPath();
  ctx.arc(x, y - 1, s * 0.25, 0, P2);
  ctx.fill();
}

function fountain(ctx: Ctx, r: R): void {
  pool(ctx, r);
  const { x } = FT;
  // its moon shadow on the water and the kerb, falling down-right
  castShadow(ctx, lathe(PED, x), 18, 10, 0.4, '#000000');
  stoneFill(ctx, lathe(PED, x), { x: x - 40, y: LOW.y + 22, w: 80, h: POOL.y - LOW.y - 22 }, x, 0.8, 1, 5);
  // the plinth's ring where it stands in the water
  ctx.fillStyle = rgba('#a8c8d8', 0.3);
  ctx.fillRect(x - 40, POOL.y - 4, 80, 1.6);
  bowl(ctx, x, LOW.y, LOW.rx, LOW.ry, 34, 26, 9);
  stoneFill(ctx, lathe(STEM, x), { x: x - 16, y: HIGH.y + 12, w: 32, h: LOW.y - HIGH.y - 12 }, x, 0.6, 0.4, 6);
  bowl(ctx, x, HIGH.y, HIGH.rx, HIGH.ry, 18, 12, 8);
  pineapple(ctx, x, HIGH.y - 2, FT.top);
}

// ——— the fallen urn, left of the pool ———

const URN_BOX: Box = { x: NV.urn.x - 120, y: 640, w: 290, h: TY - 640 };

function urn(ctx: Ctx, r: R): void {
  const { x, y } = NV.urn;
  // the soil it spilled, fanned out from its mouth over the tiles
  const soil: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 2, y - 24);
    c.bezierCurveTo(x - 60, y - 20, x - 110, y + 2, x - 96, y + 20);
    c.bezierCurveTo(x - 60, y + 30, x - 10, y + 24, x + 10, y + 16);
    c.closePath();
  };
  flat(ctx, soil, '#32261c', 0, INK);
  within(ctx, soil, () => {
    for (let k = 0; k < 60; k++) {
      ctx.fillStyle = rgba(r() < 0.5 ? '#54402e' : '#140e0a', 0.75);
      ctx.fillRect(x - 100 + r() * 110, y - 20 + r() * 44, 2 + r() * 3, 1.5 + r() * 2);
    }
  });
  // a fern spilled out with its root ball, lying on the soil
  paintFrond(ctx, { kind: 'frond', x: x - 30, y: y + 4, a: Math.PI + 0.25, len: 90, wid: 0, curl: -0.3, droop: -0.4, seed: 71, amp: 0, pal: PAL_BAND }, 0);
  paintFrond(ctx, { kind: 'frond', x: x - 30, y: y + 4, a: Math.PI - 0.35, len: 70, wid: 0, curl: 0.4, droop: 0.3, seed: 72, amp: 0, pal: PAL_BAND }, 0);
  flat(ctx, ellPath(x - 26, y + 6, 18, 11), '#3a2c20', 1.6, INK, 0.3);
  ctx.strokeStyle = rgba('#8a7a62', 0.6);
  ctx.lineWidth = 1;
  for (let k = 0; k < 7; k++) {
    ctx.beginPath();
    ctx.moveTo(x - 26 + (k - 3) * 4, y + 12);
    ctx.quadraticCurveTo(x - 30 + (k - 3) * 6, y + 20, x - 34 + (k - 3) * 8, y + 22 + (k % 3) * 2);
    ctx.stroke();
  }
  // the urn on its side: belly, the garland band, its foot to the right, its mouth turned to us at the left
  const bx = x + 64;
  const by = y - 16;
  groundShadow(ctx, bx + 10, y + 16, 92, 12, 0.7, '#000000', 1.2);
  const belly: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x + 8, by - 30);
    c.bezierCurveTo(x + 40, by - 52, bx + 50, by - 50, bx + 70, by - 18);
    c.lineTo(bx + 84, by - 14);
    c.lineTo(bx + 84, by + 22);
    c.lineTo(bx + 70, by + 24);
    c.bezierCurveTo(bx + 50, by + 46, x + 40, by + 46, x + 8, by + 30);
    c.closePath();
  };
  flat(ctx, belly, TERRA, 0, INK);
  within(ctx, belly, () => {
    const g = ctx.createLinearGradient(0, by - 50, 0, by + 46);
    g.addColorStop(0, rgba('#b8c8d0', 0.2));
    g.addColorStop(0.35, rgba('#d8c0b8', 0.05));
    g.addColorStop(1, rgba('#000000', 0.5));
    ctx.fillStyle = g;
    ctx.fillRect(x, by - 52, 200, 100);
    // the garland band round its belly (raised swags), moss in its hollows
    ctx.strokeStyle = rgba('#3a2420', 0.7);
    ctx.lineWidth = 2;
    for (const dx of [40, 54]) {
      ctx.beginPath();
      ctx.moveTo(x + dx, by - 44);
      ctx.quadraticCurveTo(x + dx + 8, by, x + dx, by + 44);
      ctx.stroke();
    }
    for (let k = 0; k < 4; k++) {
      ctx.strokeStyle = rgba('#c09080', 0.4);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(x + 70 + k * 6, by - 30 + k * 20, 9, 0.3, Math.PI - 0.3);
      ctx.stroke();
    }
    dots(ctx, { x, y: by - 52, w: 200, h: 100 }, linTone(0, by - 10, 0, by + 46, 0, 0.8), '#1a0c08', { step: 4.5, angle: 0.79, a: 0.6 });
    // the hole knocked in its shoulder: dark inside, jagged, a lit broken edge
    const hole = polyPath([[bx - 10, by - 44], [bx + 6, by - 30], [bx + 2, by - 18], [bx + 22, by - 22], [bx + 30, by - 40], [bx + 14, by - 50]]);
    flat(ctx, hole, '#120a08', 0, INK);
    ctx.strokeStyle = rgba('#e0b8a8', 0.5);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(bx - 10, by - 44);
    ctx.lineTo(bx + 6, by - 30);
    ctx.lineTo(bx + 2, by - 18);
    ctx.stroke();
    ctx.strokeStyle = rgba('#000000', 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx + 22, by - 22);
    ctx.lineTo(bx + 40, by - 6);
    ctx.moveTo(bx + 6, by - 30);
    ctx.lineTo(bx - 6, by - 6);
    ctx.stroke();
  });
  ink(ctx, belly, 2.4, INK, 0.5);
  // its foot: a short stem and a ring, end on to the right
  const foot = ellPath(bx + 88, by + 4, 10, 30);
  flat(ctx, foot, mix(TERRA, '#000000', 0.25), 2, INK, 0.4);
  flat(ctx, ellPath(bx + 92, by + 4, 6, 22), mix(TERRA, '#000000', 0.5), 1.2, INK, 0);
  // the mouth: a rolled rim turned to us, the dark inside, soil at its lip
  const mouth = ellPath(x + 6, by, 20, 38);
  flat(ctx, mouth, mix(TERRA, '#e0c0b0', 0.18), 2.4, INK, 0.5);
  flat(ctx, ellPath(x + 9, by + 1, 13, 29), '#0e0806', 0, INK);
  within(ctx, ellPath(x + 9, by + 1, 13, 29), () => {
    ctx.fillStyle = '#2a1e18';
    ctx.beginPath();
    ctx.ellipse(x + 9, by + 22, 13, 14, 0, 0, P2);
    ctx.fill();
  });
  // a shard of it on the tiles
  const sh = polyPath([[bx + 40, y + 18], [bx + 62, y + 10], [bx + 70, y + 20], [bx + 50, y + 26]]);
  groundShadow(ctx, bx + 56, y + 24, 18, 3, 0.6, '#000000');
  flat(ctx, sh, TERRA, 1.6, INK, 0.3);
}

// ——— the collection's sign, toppled on the right ———

const SIGN_BOX: Box = { x: NV.sign.x - 140, y: 650, w: 300, h: TY - 650 };

function sign(ctx: Ctx, r: R): void {
  const { x, y } = NV.sign;
  // the post lying on the tiles, its cast foot torn up at the right, its finial by the plaque
  const post: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x + 40, y + 6);
    c.lineTo(x + 150, y + 18);
    c.lineTo(x + 150, y + 26);
    c.lineTo(x + 40, y + 16);
    c.closePath();
  };
  groundShadow(ctx, x + 96, y + 26, 70, 6, 0.6, '#000000');
  flat(ctx, post, IRON, 1.8, INK, 0.4);
  ctx.fillStyle = rgba(RIM, 0.4);
  ctx.fillRect(x + 42, y + 6.5, 106, 1.6);
  const base = polyPath([[x + 146, y + 8], [x + 168, y + 4], [x + 176, y + 34], [x + 150, y + 38]]);
  flat(ctx, base, IRON, 1.8, INK, 0.4);
  // torn bolts and a clod of soil and roots still on the foot
  ctx.strokeStyle = '#4a4a44';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 172, y + 10);
  ctx.lineTo(x + 184, y + 6);
  ctx.moveTo(x + 174, y + 26);
  ctx.lineTo(x + 186, y + 28);
  ctx.stroke();
  // the plaque, propped against the pool's kerb and leaning back: enamel, a cream border, our own lettering
  groundShadow(ctx, x - 10, y + 22, 96, 8, 0.6, '#000000');
  ctx.save();
  ctx.translate(x - 6, y - 8);
  ctx.transform(1, -0.05, 0.18, 0.62, 0, 0);
  const pw = 180;
  const ph = 84;
  const plate = rrPath(-pw / 2, -ph / 2, pw, ph, 6);
  flat(ctx, plate, '#1e3a32', 3, INK, 0.5);
  within(ctx, plate, () => {
    ctx.strokeStyle = rgba('#c8c0a0', 0.7);
    ctx.lineWidth = 2.6;
    ctx.strokeRect(-pw / 2 + 6, -ph / 2 + 6, pw - 12, ph - 12);
    ctx.font = `15px ${BLOCK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = rgba('#d8d0b0', 0.8);
    ctx.fillText('THE LUGTOE COLLECTION', 0, -18);
    ctx.font = `11px ${BLOCK}`;
    ctx.fillText('RARE & DANGEROUS SPECIMENS', 0, 2);
    ctx.fillStyle = rgba('#c8584a', 0.7);
    ctx.fillText('PRIVATE · NO ADMITTANCE', 0, 20);
    // chips knocked out of the enamel, iron showing
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = rgba('#2a2a28', 0.9);
      ctx.beginPath();
      ctx.ellipse((r() - 0.5) * pw * 0.9, (r() - 0.5) * ph * 0.9, 3 + r() * 5, 2 + r() * 3, r(), 0, P2);
      ctx.fill();
    }
    ctx.fillStyle = rgba(MOON, 0.12);
    ctx.fillRect(-pw / 2, -ph / 2, pw * 0.4, ph);
  });
  ctx.restore();
  // its finial, broken off beside it
  flat(ctx, ellPath(x + 70, y + 30, 7, 6), IRON, 1.4, INK, 0.3);
}

// ——— the cloud that crosses the moon (live only: the iron is laid back over it) ———

function moonCloud(ctx: Ctx): void {
  const r = mkRng(91);
  const m = NV.moon;
  const pal = { body: '#18203e', lit: '#26325a', shade: '#0e1430', ink: '#060a1c', dot: '#050818' };
  comicCloud(ctx, r, m.x - 14, m.y + 30, 170, 62, pal, 1);
  comicCloud(ctx, r, m.x + 30, m.y + 4, 120, 48, pal, 1);
  // its silver lining where the moon is behind it
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createRadialGradient(m.x, m.y - 30, 10, m.x, m.y - 30, 120);
  g.addColorStop(0, rgba('#c8d8ff', 0.4));
  g.addColorStop(1, rgba('#c8d8ff', 0));
  ctx.fillStyle = g;
  ctx.fillRect(MOONBOX.x, MOONBOX.y, MOONBOX.w, MOONBOX.h);
  ctx.restore();
}

// ——— the open vent sash (a sprite: it rattles on its stay) ———

const SASH_B = paneBox(SASH[0], SASH[1]);
/** The hinge: the middle of the sash's top edge. */
export const SASH_HINGE: [number, number] = (() => {
  const [x0, y0] = glassPt(COLS_T[SASH[0]], ROWS_V[SASH[1] + 1]);
  const [x1, y1] = glassPt(COLS_T[SASH[0] + 1], ROWS_V[SASH[1] + 1]);
  return [(x0 + x1) / 2, (y0 + y1) / 2];
})();
const SASH_BOX: Box = { x: Math.floor(SASH_B.x - 16), y: Math.floor(SASH_B.y - 16), w: Math.ceil(SASH_B.w + 32), h: Math.ceil(SASH_B.h + 24) };

function sash(ctx: Ctx): void {
  // top-hung, pushed out at its foot: seen from inside, its glass hangs beyond the frame, its foot drawn up and in
  const t0 = COLS_T[SASH[0]];
  const t1 = COLS_T[SASH[0] + 1];
  const vTop = ROWS_V[SASH[1] + 1];
  const vBot = ROWS_V[SASH[1]];
  const [ax, ay] = glassPt(t0, vTop);
  const [bx, by] = glassPt(t1, vTop);
  const [cx0, cy0] = glassPt(t1, vBot);
  const [dx0, dy0] = glassPt(t0, vBot);
  const k = 0.42;
  const cx = cx0 + (bx - cx0) * k - 3;
  const cy = cy0 + (by - cy0) * k;
  const dx = dx0 + (ax - dx0) * k + 3;
  const dy = dy0 + (ay - dy0) * k;
  const pane = polyPath([[ax, ay], [bx, by], [cx, cy], [dx, dy]]);
  flat(ctx, pane, rgba(GLASS, 0.2), 0, INK);
  within(ctx, pane, () => {
    ctx.fillStyle = rgba(MOON, 0.16);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + (bx - ax) * 0.4, ay);
    ctx.lineTo(dx + (cx - dx) * 0.2, dy);
    ctx.lineTo(dx, dy);
    ctx.closePath();
    ctx.fill();
  });
  // the sash's frame: iron, its foot edge lit by the moon
  ironLine(ctx, [[ax, ay], [dx, dy], [cx, cy], [bx, by]], 2.6 * nearK(t0, 0.1), 0.6);
  ctx.strokeStyle = rgba('#e8f4ff', 0.55);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(dx + 2, dy + 1.5);
  ctx.lineTo(cx - 2, cy + 1.5);
  ctx.stroke();
  // the stay: a notched bar from the frame's foot up to the sash
  const mx = (dx0 + cx0) / 2;
  const my = (dy0 + cy0) / 2;
  ironLine(ctx, [[mx, my], [(dx + cx) / 2, (dy + cy) / 2]], 1.8, 0.3);
  for (let i = 1; i < 4; i++) rivetAt(ctx, mx + (((dx + cx) / 2 - mx) * i) / 4, my + (((dy + cy) / 2 - my) * i) / 4, 1.1);
}

// ——— moonlight: shafts in from the top left, striped by the ribs' shadows, pooling on the floor ———

const BEAM_BOX: Box = { x: 0, y: 0, w: W, h: TY };
/** The shafts' direction (down and to the right, from the moon). */
const BEAM_A = 0.9;
/** Where each shaft enters (x at y 40) and its width; its stripes follow the glazing bars' spacing. */
const SHAFTS: [number, number, number][] = [[300, 150, 0.8], [520, 120, 1], [700, 170, 0.9], [930, 110, 0.7], [1090, 90, 0.5]];
const BEAM_END = 724;

function beams(ctx: Ctx, still: boolean): void {
  const dx = Math.cos(BEAM_A);
  const dy = Math.sin(BEAM_A);
  const len = (BEAM_END - 40) / dy;
  softly(ctx, BEAM_BOX, (g) => {
    for (const [sx, sw, a] of SHAFTS) {
      const ex = sx + dx * len;
      // stripes across the shaft: a pane's light, then a bar's shadow (wider at a rib)
      let u = 0;
      let i = 0;
      while (u < sw) {
        const w = Math.min(sw - u, 34);
        const x0 = sx + u;
        const grad = g.createLinearGradient(x0, 40, x0 + dx * len, BEAM_END);
        grad.addColorStop(0, rgba('#b8d4ff', 0));
        grad.addColorStop(0.18, rgba('#b8d4ff', 0.07 * a));
        grad.addColorStop(0.6, rgba('#b8d4ff', 0.04 * a));
        grad.addColorStop(0.92, rgba('#b8d4ff', 0.035 * a));
        grad.addColorStop(1, rgba('#b8d4ff', 0));
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(x0, 40);
        g.lineTo(x0 + w, 40);
        g.lineTo(x0 + w + dx * len, BEAM_END);
        g.lineTo(x0 + dx * len, BEAM_END);
        g.closePath();
        g.fill();
        u += w + (i % 3 === 2 ? 7 : 2.5);
        i++;
      }
      // where it lands: a striped pool on the tiles and the leaves, faded at its ends
      const px = ex + sw / 2;
      for (let k = 0; k < 5; k++) {
        const bx = px - sw * 0.6 + k * sw * 0.28;
        const pg = g.createRadialGradient(bx, BEAM_END - 14, 0, bx, BEAM_END - 14, sw * 0.24);
        pg.addColorStop(0, rgba('#c8dcff', 0.09 * a));
        pg.addColorStop(1, rgba('#c8dcff', 0));
        g.fillStyle = pg;
        g.save();
        g.translate(bx, BEAM_END - 14);
        g.scale(1, 0.3);
        g.translate(-bx, -(BEAM_END - 14));
        g.fillRect(bx - sw * 0.3, BEAM_END - 14 - sw * 0.3, sw * 0.6, sw * 0.6);
        g.restore();
      }
    }
    // the moon's light on the fountain's lit side
    const lg = g.createRadialGradient(FT.x - 40, 600, 0, FT.x - 40, 600, 130);
    lg.addColorStop(0, rgba('#c8dcff', 0.08));
    lg.addColorStop(1, rgba('#c8dcff', 0));
    g.fillStyle = lg;
    g.fillRect(FT.x - 180, 470, 280, 260);
  }, 0.2, still ? 'lighter' : 'source-over');
}

// ——— the table: an old teak potting bench, silvered and mossy, iron on its front ———

const TBOX: Box = { x: 0, y: TY, w: W, h: 1080 - TY };
const HY0 = 300;
const FOC0 = 1210;
const tY = (z: number) => HY0 + FOC0 / z;
const tX = (X: number, z: number) => 960 + (FOC0 * X) / z;
/** The bench's boards across, and the battens under them where the screws go (one spacing). */
const BOARDS = 7;
const BATTENS = [-1.05, -0.35, 0.35, 1.05];

function table(ctx: Ctx, r: R): void {
  const zf = NV.front;
  const zB = FOC0 / (TY - HY0);
  const zF = FOC0 / (zf - HY0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, zf - TY + 2);
  ctx.clip();
  vfill(ctx, 0, TY, W, zf - TY, [[0, '#30291f'], [0.4, '#4a3e30'], [1, '#5e5040']]);
  surface(ctx, r, { x: 0, y: TY, w: W, h: zf - TY }, '#52463a', { over: true, vary: 0.35, cells: 4, mottle: 0.3, strokes: 0, grain: 0.22, seed: 191, warm: '#7a6448', cool: '#3a4646' });
  for (let i = 0; i < BOARDS; i++) {
    const z0 = zB + ((zF - zB) * i) / BOARDS;
    const z1 = zB + ((zF - zB) * (i + 1)) / BOARDS;
    const y0 = tY(z0);
    const y1 = tY(z1);
    const h = y1 - y0;
    // the board: its own silvering, grain running along it, checks at its ends
    ctx.fillStyle = rgba(r() < 0.5 ? '#6a6458' : '#3a3630', 0.12 + r() * 0.1);
    ctx.fillRect(0, y0, W, h);
    ctx.lineCap = 'round';
    for (let k = 0; k < 26; k++) {
      const gy = y0 + 2 + r() * (h - 4);
      const x0 = r() * W;
      const l = 200 + r() * 700;
      ctx.strokeStyle = rgba(r() < 0.6 ? '#1e1c18' : '#8a8474', 0.12 + r() * 0.12);
      ctx.lineWidth = 0.8 + r() * 1.2 * (h / 40);
      ctx.beginPath();
      ctx.moveTo(x0, gy);
      ctx.bezierCurveTo(x0 + l * 0.3, gy + (r() - 0.5) * 3, x0 + l * 0.7, gy + (r() - 0.5) * 3, x0 + l, gy + (r() - 0.5) * 2);
      ctx.stroke();
    }
    // a knot or two, the grain swirling round it
    for (let k = 0; k < 2; k++) {
      if (r() < 0.4) continue;
      const kx = 200 + r() * 1520;
      const ky = y0 + h * (0.3 + r() * 0.4);
      for (let ring = 3; ring > 0; ring--) {
        ctx.strokeStyle = rgba('#1a1814', 0.18 + ring * 0.06);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(kx, ky, ring * 5 * (h / 40), ring * 1.6 * (h / 40), 0, 0, P2);
        ctx.stroke();
      }
    }
    // the gap to the next board: dark, moss in it, the next board's lit arris
    if (i < BOARDS - 1) {
      ctx.fillStyle = rgba('#0a0c08', 0.75);
      ctx.fillRect(0, y1 - 1.6, W, 3.2 * (h / 40));
      for (let k = 0; k < 40; k++) {
        ctx.fillStyle = rgba(r() < 0.5 ? '#2e4426' : '#3e5430', 0.5 + r() * 0.3);
        ctx.beginPath();
        ctx.ellipse(r() * W, y1, 6 + r() * 20, 1.4 + r() * 1.6 * (h / 40), 0, 0, P2);
        ctx.fill();
      }
      ctx.fillStyle = rgba('#a8b4b0', 0.16);
      ctx.fillRect(0, y1 + 1.4 * (h / 40), W, 1.2);
    }
    // the screws into the battens under it (two per batten per board)
    for (const X of BATTENS) {
      const zm = (z0 + z1) / 2;
      for (const dX of [-0.05, 0.05]) {
        const sx = tX(X + dX, zm);
        const sy = tY(zm);
        const s = 2.6 * (h / 40);
        ctx.fillStyle = rgba('#14120e', 0.7);
        ctx.beginPath();
        ctx.ellipse(sx, sy, s * 1.2, s * 0.6, 0, 0, P2);
        ctx.fill();
        ctx.fillStyle = rgba('#5a6060', 0.6);
        ctx.beginPath();
        ctx.ellipse(sx - 0.4, sy - 0.3, s * 0.8, s * 0.4, 0, 0, P2);
        ctx.fill();
        // a rust weep down the grain from it
        ctx.fillStyle = rgba('#3a2a1e', 0.18);
        ctx.fillRect(sx, sy, 18 + r() * 30, 1.4 * (h / 40));
      }
    }
  }
  // what it's been used for: rings where pots stood, a spill of soil, a few dead leaves
  for (const [sx, sy, rx] of [[420, 808, 30], [1380, 860, 38], [640, 940, 34], [1540, 800, 24]] as const) {
    ctx.strokeStyle = rgba('#a8a898', 0.12);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(sx, sy, rx, rx * 0.28, 0, 0, P2);
    ctx.stroke();
  }
  for (let k = 0; k < 140; k++) {
    const sx = 1120 + r() * 260;
    const sy = 820 + r() * 50;
    ctx.fillStyle = rgba('#1a1410', 0.25 + r() * 0.3);
    ctx.fillRect(sx, sy, 1.5 + r() * 2.5, 1 + r() * 1.5);
  }
  // the moon's cool sheen over its back left, the shade printed to the back and the ends
  ctx.save();
  ctx.translate(700, 830);
  ctx.scale(1, 0.14);
  const kg = ctx.createRadialGradient(0, 0, 0, 0, 0, 700);
  kg.addColorStop(0, rgba('#c8dcf0', 0.07));
  kg.addColorStop(1, rgba('#c8dcf0', 0));
  ctx.fillStyle = kg;
  ctx.fillRect(-720, -720, 1440, 1440);
  ctx.restore();
  dots(ctx, { x: 0, y: TY, w: W, h: zf - TY }, (x, y) => 0.38 * (1 - smooth(TY, TY + 110, y)) + 0.1 * smooth(zf - 80, zf, y) + 0.14 * (1 - smooth(0, 420, x)) + 0.14 * smooth(1500, W, x) + 0.04, '#0a0c0a', { step: 8, angle: 0.79, a: 0.5 });
  ctx.restore();
  ctx.fillStyle = rgba('#020404', 0.45);
  ctx.fillRect(0, TY, W, 8);
  tableFalloff(ctx, zf, 0.3, '#020406');
  tableSeam(ctx, 0.55, INK, false);
  // the front: the apron board's worn arris, the apron, an iron strap along it with its bolts on the battens' spacing
  ctx.fillStyle = rgba('#c8ccc0', 0.22);
  ctx.fillRect(0, zf - 5, W, 1.6);
  const kf = rectPath(0, zf, W, 1080 - zf);
  flat(ctx, kf, '#2a2620', 0, INK);
  within(ctx, kf, () => {
    for (let k = 0; k < 24; k++) {
      ctx.fillStyle = rgba(r() < 0.5 ? '#4a463c' : '#14120e', 0.3);
      ctx.fillRect(r() * W, zf + 4 + r() * 32, 60 + r() * 240, 1.2);
    }
    const g = ctx.createLinearGradient(0, zf, 0, 1080);
    g.addColorStop(0, rgba('#c8d4d8', 0.12));
    g.addColorStop(0.2, rgba('#c8d4d8', 0));
    g.addColorStop(1, rgba('#000000', 0.35));
    ctx.fillStyle = g;
    ctx.fillRect(0, zf, W, 1080 - zf);
    const sy = zf + 12;
    ctx.fillStyle = '#1a1e1c';
    ctx.fillRect(0, sy, W, 12);
    ctx.fillStyle = rgba(RIM, 0.25);
    ctx.fillRect(0, sy, W, 1.4);
    ctx.fillStyle = rgba('#3a2418', 0.35);
    for (let k = 0; k < 30; k++) ctx.fillRect(r() * W, sy + 10, 4 + r() * 10, 3 + r() * 10);
    for (const X of BATTENS) for (const dX of [-0.05, 0.05]) rivetAt(ctx, tX(X + dX, zF), sy + 6, 3);
  });
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, zf);
  ctx.lineTo(W, zf);
  ctx.stroke();
}

// ——— on the bench's front corners: pots and a trowel, twine and secateurs ———

const TPROPS_BOX: Box = { x: 0, y: 900, w: W, h: 140 };

/** A terracotta pot (tapered, a rolled rim, its earth and a seedling), moonlit. */
function pot(ctx: Ctx, r: R, x: number, y: number, s: number, seedling: boolean, shadow = true): void {
  if (shadow) groundShadow(ctx, x + 14 * s, y + 4, 46 * s, 9 * s, 0.7, '#020404', 1.2);
  const body: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 36 * s, y - 62 * s);
    c.lineTo(x + 36 * s, y - 62 * s);
    c.lineTo(x + 26 * s, y);
    c.quadraticCurveTo(x, y + 6 * s, x - 26 * s, y);
    c.closePath();
  };
  flat(ctx, body, TERRA, 0, INK);
  within(ctx, body, () => {
    const g = ctx.createLinearGradient(x - 36 * s, 0, x + 36 * s, 0);
    g.addColorStop(0, rgba('#b8c8d0', 0.2));
    g.addColorStop(0.4, rgba('#e0c8c0', 0.04));
    g.addColorStop(1, rgba('#000000', 0.45));
    ctx.fillStyle = g;
    ctx.fillRect(x - 40 * s, y - 70 * s, 80 * s, 80 * s);
    // white bloom of old salts, a band of moss at its foot
    ctx.fillStyle = rgba('#c8c8b8', 0.14);
    ctx.fillRect(x - 36 * s, y - 40 * s, 72 * s, 10 * s);
    ctx.fillStyle = rgba(MOSS, 0.5);
    ctx.fillRect(x - 30 * s, y - 8 * s, 60 * s, 8 * s);
    dots(ctx, { x: x - 40 * s, y: y - 70 * s, w: 80 * s, h: 80 * s }, linTone(x - 5 * s, 0, x + 36 * s, 0, 0, 0.8), '#1a0c08', { step: 4, angle: 0.79, a: 0.6 });
  });
  ink(ctx, body, 2.2, INK, 0.5);
  const rim = rrPath(x - 40 * s, y - 74 * s, 80 * s, 14 * s, 4 * s);
  flat(ctx, rim, mix(TERRA, '#d8b8a8', 0.15), 2, INK, 0.4);
  flat(ctx, ellPath(x, y - 74 * s, 34 * s, 6 * s), '#1a120e', 1.2, INK, 0);
  if (seedling) {
    for (const [a, l] of [[-2.2, 26], [-1.2, 30], [-1.7, 36]] as const) {
      ctx.strokeStyle = '#3a5a3a';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(x, y - 74 * s);
      ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 * s, y - 74 * s + Math.sin(a) * l * 0.7 * s, x + Math.cos(a) * l * s, y - 74 * s + Math.sin(a) * l * s);
      ctx.stroke();
      silLeaf(ctx, 'heart', x + Math.cos(a) * l * s, y - 74 * s + Math.sin(a) * l * s, a, 18 * s, 11 * s, 0.2, '#3e6a48', 0.5, Math.round(l));
    }
  }
  void r;
}

function tableProps(ctx: Ctx, r: R): void {
  // left: a pot with a seedling, another tipped on its side, a trowel
  pot(ctx, r, 104, 1004, 0.8, true);
  ctx.save();
  groundShadow(ctx, 192, 1020, 40, 7, 0.7, '#020404', 1.2);
  ctx.translate(200, 1012);
  ctx.rotate(-1.42);
  pot(ctx, r, 0, 0, 0.55, false, false);
  ctx.restore();
  groundShadow(ctx, 268, 1022, 60, 6, 0.6, '#020404');
  const blade: PathFn = (c) => {
    c.beginPath();
    c.moveTo(232, 1014);
    c.quadraticCurveTo(258, 1000, 286, 1008);
    c.quadraticCurveTo(260, 1024, 232, 1020);
    c.closePath();
  };
  flat(ctx, blade, '#6a7270', 1.8, INK, 0.3);
  ctx.fillStyle = rgba('#e0ecf0', 0.5);
  ctx.fillRect(240, 1008, 34, 1.4);
  flat(ctx, rrPath(286, 1004, 46, 10, 4), '#4a3424', 1.8, INK, 0.3);
  // right: a ball of twine, secateurs, wooden labels
  const tx = 1764;
  const ty = 1002;
  groundShadow(ctx, tx + 12, ty + 8, 40, 8, 0.7, '#020404');
  flat(ctx, ellPath(tx, ty - 22, 30, 28), '#8a7a5a', 2.2, INK, 0.5);
  within(ctx, ellPath(tx, ty - 22, 30, 28), () => {
    ctx.strokeStyle = rgba('#3a3020', 0.5);
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 9; k++) {
      ctx.beginPath();
      ctx.ellipse(tx, ty - 22, 30, 8 + k * 3, 0.5 + k * 0.32, 0, P2);
      ctx.stroke();
    }
    dots(ctx, { x: tx - 30, y: ty - 50, w: 60, h: 56 }, radTone(tx - 12, ty - 36, 50, 0, 0.8), '#1a1408', { step: 4, angle: 0.79, a: 0.6 });
  });
  ctx.strokeStyle = '#8a7a5a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(tx + 24, ty - 6);
  ctx.bezierCurveTo(tx + 60, ty + 10, tx + 90, ty - 4, tx + 120, ty + 8);
  ctx.stroke();
  // secateurs: two handles and the closed blades
  groundShadow(ctx, 1850, 1030, 44, 5, 0.6, '#020404');
  ctx.save();
  ctx.translate(36, 12);
  flat(ctx, polyPath([[1770, 1010], [1830, 1004], [1834, 1012], [1772, 1018]]), '#2e3a34', 1.6, INK, 0.3);
  flat(ctx, polyPath([[1776, 1020], [1832, 1014], [1834, 1022], [1778, 1026]]), '#26302c', 1.6, INK, 0.3);
  flat(ctx, polyPath([[1832, 1006], [1870, 1004], [1868, 1012], [1834, 1020]]), '#8a9494', 1.6, INK, 0.3);
  ctx.restore();
  // labels: pale wooden stakes, one written
  for (const [lx, ly, a] of [[1652, 1012, -0.1], [1684, 1024, 0.08]] as const) {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(a);
    flat(ctx, polyPath([[-34, -5], [26, -5], [36, 0], [26, 5], [-34, 5]]), '#a49a80', 1.4, INK, 0.2);
    ctx.fillStyle = rgba('#2a2a2a', 0.5);
    ctx.fillRect(-28, -1, 30, 1.4);
    ctx.restore();
  }
}

// ——— finishing ———

function shadeOver(ctx: Ctx): void {
  // the HUD's corners calm, the top calm, the lanes calm, a vignette
  for (const cx of [180, W - 180]) {
    const g = ctx.createRadialGradient(cx, 70, 40, cx, 70, 560);
    g.addColorStop(0, 'rgba(2,6,12,0.46)');
    g.addColorStop(1, 'rgba(2,6,12,0)');
    ctx.save();
    ctx.translate(cx, 70);
    ctx.scale(1, 0.42);
    ctx.translate(-cx, -70);
    ctx.fillStyle = g;
    ctx.fillRect(cx - 640, 0, 1280, 640);
    ctx.restore();
  }
  const cg = ctx.createLinearGradient(0, 0, 0, 120);
  cg.addColorStop(0, 'rgba(2,6,12,0.34)');
  cg.addColorStop(1, 'rgba(2,6,12,0)');
  ctx.fillStyle = cg;
  ctx.fillRect(0, 0, W, 120);
  calmLanes(ctx, 0.12, '#02060c', 140, 640);
  vignetteAll(ctx, 0.6, '#010408');
}

// ——— the stack ———

const TRUNK_BOX: Box = { x: 0, y: PC.y + 10, w: 260, h: TY - PC.y - 10 };
const BSTEM_BOX: Box = { x: BN.x - 70, y: BN.top + 20, w: 120, h: TY - BN.top - 20 };
const VINES_L: Box = { x: 270, y: 130, w: 170, h: 360 };
const VINES_R: Box = { x: 800, y: 130, w: 740, h: 360 };
const BACK_BOX: Box = { x: BACK_PALM.crown.x - 250, y: 0, w: 500, h: BACK_PALM.foot - 0 + 10 };

export const CHEETOE: SceneSpec = {
  id: 'cheetoe',
  info: {
    name: 'The Night Conservatory',
    subtitle: 'Mini-boss: THE CHEETOE',
    ambient: [],
    glows: [],
    light: '#c8d8f0',
    tableTint: '#eef2fa',
  },
  layers: [
    { id: 'sky', box: SKY_BOX, draw: sky },
    { id: 'glass', box: { x: 0, y: 0, w: W, h: 440 }, draw: glass },
    { id: 'iron', box: { x: 0, y: 0, w: W, h: 520 }, draw: (c, r) => {
      c.beginPath();
      c.rect(0, 0, W, 520);
      c.clip();
      iron(c, r);
    } },
    { id: 'moonCloud', box: MOONBOX, liveOnly: true, res: 0.5, draw: moonCloud },
    { id: 'ironMoon', box: MOONBOX, draw: ironOverMoon },
    { id: 'sash', box: SASH_BOX, motion: 'sprite', draw: sash },
    { id: 'floor', box: FLOOR_BOX, draw: floor },
    { id: 'backPalm', box: BACK_BOX, draw: (c, r) => palmsBack(c, r) },
    { id: 'jungle', box: JUNGLE_BOX, draw: jungle },
    { id: 'bananaStem', box: BSTEM_BOX, draw: (c) => bananaStem(c) },
    { id: 'palmTrunk', box: TRUNK_BOX, draw: (c, r) => palmTrunk(c, r, NV.palm.x, TY, PC.x, PC.y + 30, 48, 34, true, 1) },
    { id: 'vinesL', box: VINES_L, draw: (c, r) => vines(c, r, true) },
    { id: 'vinesR', box: VINES_R, draw: (c, r) => vines(c, r, false) },
    { id: 'fountain', box: FOUNTAIN_BOX, draw: fountain },
    { id: 'urn', box: URN_BOX, draw: urn },
    { id: 'sign', box: SIGN_BOX, draw: sign },
    { id: 'waterStill', box: FOUNTAIN_BOX, stillOnly: true, draw: (c) => waterAt(c, 0, 1) },
    { id: 'heroStill', stillOnly: true, draw: heroStill },
    { id: 'beamsStill', box: BEAM_BOX, stillOnly: true, draw: (c) => beams(c, true) },
    { id: 'beams', box: BEAM_BOX, liveOnly: true, res: 0.33, draw: (c) => beams(c, false) },
    { id: 'live', box: { x: 0, y: 0, w: W, h: TY }, motion: 'slot', draw: () => {} },
    { id: 'table', box: TBOX, draw: table },
    { id: 'tableProps', box: TPROPS_BOX, draw: tableProps },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  shade: shadeOver,
};

// ——— the fountain's water (12 painted phases: the still shows the first) ———

const WATER_BOX: Box = { x: FT.x - LOW.rx - 24, y: FT.top - 14, w: LOW.rx * 2 + 48, h: POOL.y + 14 - (FT.top - 14) };
const WATER_N = 12;
const WATER_K = 0.5;
const WATER = '#c8e0f0';

/** The water at phase ph (0…1 loops), in screen coordinates. A jet out of the finial's crown, arcing over in droplets
 * into the upper bowl; strands falling from the upper bowl's lip, each breaking into drops as it falls; from the lower
 * bowl separate ribbons, thick at the lip, thinning, breaking into drops before the pool; light sliding down
 * everything; foam churning and rings spreading where it lands. Every part moves on the phase, so no two frames
 * match. a: overall strength. */
function waterAt(c: Ctx, ph: number, a: number): void {
  const x = FT.x;
  c.save();
  c.lineCap = 'round';
  const bead = (bx: number, by: number, r: number, al: number) => {
    c.fillStyle = rgba(WATER, al * 0.7 * a);
    c.beginPath();
    c.ellipse(bx, by, r * 0.8, r, 0, 0, P2);
    c.fill();
    c.fillStyle = rgba('#ffffff', al * 0.8 * a);
    c.beginPath();
    c.arc(bx - r * 0.25, by - r * 0.3, r * 0.35, 0, P2);
    c.fill();
  };
  // the jet: a plume up out of the crown, falling over in arcs of droplets into the upper bowl
  const jy = FT.top - 2;
  const plume = 18 + Math.sin(ph * P2 * 2) * 3;
  c.strokeStyle = rgba(WATER, 0.6 * a);
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(x, jy + 6);
  c.lineTo(x + Math.sin(ph * P2 * 3) * 0.8, jy - plume);
  c.stroke();
  const arcs = 7;
  for (let j = 0; j < arcs; j++) {
    const th = Math.PI * (0.08 + (0.84 * j) / (arcs - 1));
    const ex = x + Math.cos(th) * HIGH.rx * 0.7;
    const ey = HIGH.y + Math.sin(th) * HIGH.ry * 0.6;
    const at = (u: number): [number, number] => [x + (ex - x) * u, jy - plume + (ey - jy + plume) * u * u - Math.sin(u * Math.PI) * 6];
    c.strokeStyle = rgba(WATER, 0.22 * a);
    c.lineWidth = 1.2;
    c.beginPath();
    for (let k = 0; k <= 8; k++) {
      const [px, py] = at(k / 8);
      if (k) c.lineTo(px, py);
      else c.moveTo(px, py);
    }
    c.stroke();
    for (let d = 0; d < 3; d++) {
      const u = (ph + d / 3 + j * 0.13) % 1;
      const [px, py] = at(u);
      bead(px, py, 1.3, 0.9 * Math.sin(Math.min(1, u * 1.2) * Math.PI));
    }
  }
  // the crown of spray where it tops out
  for (let k = 0; k < 6; k++) {
    const u = (ph * 2 + k / 6) % 1;
    const ang = -Math.PI / 2 + (k - 2.5) * 0.45;
    bead(x + Math.cos(ang) * u * 9, jy - plume + Math.sin(ang) * u * 7 + u * u * 10, 1, 0.8 * (1 - u));
  }
  // strands from the upper bowl's lip into the lower: whole near the lip, then breaking into falling drops
  const strands = 9;
  for (let i = 0; i < strands; i++) {
    const th = Math.PI * (0.1 + (0.8 * (i + 0.5)) / strands);
    const sx = x + Math.cos(th) * (HIGH.rx - 2);
    const sy = HIGH.y + Math.sin(th) * HIGH.ry + 2;
    const out = Math.cos(th) * 10;
    const ex = sx + out * 1.5;
    const ey = LOW.y + LOW.ry * 0.5 * Math.sqrt(Math.max(0, 1 - ((ex - x) / (LOW.rx * 0.88)) ** 2));
    const at = (u: number): [number, number] => [sx + out * Math.sqrt(u) * 1.5 + Math.sin(ph * P2 * 2 + i * 1.3 + u * 6) * 0.8 * u, sy + (ey - sy) * (u * u * 0.45 + u * 0.55)];
    // where it breaks up wanders a little with the phase
    const brk = 0.55 + 0.12 * Math.sin(ph * P2 + i * 2.1);
    c.strokeStyle = rgba(WATER, 0.5 * a);
    c.lineWidth = 2.2;
    c.beginPath();
    for (let k = 0; k <= 10; k++) {
      const [px, py] = at((k / 10) * brk);
      if (k) c.lineTo(px, py);
      else c.moveTo(px, py);
    }
    c.stroke();
    // light sliding down the whole part, drops falling off its end
    const hu = ((ph * 1.5 + i * 0.31) % 1) * brk;
    const [hx, hy] = at(hu);
    c.strokeStyle = rgba('#f4faff', 0.8 * a);
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(hx, hy - 4);
    c.lineTo(hx, hy + 2);
    c.stroke();
    for (let d = 0; d < 3; d++) {
      const u = brk + (1 - brk) * ((ph * 2 + d / 3 + i * 0.17) % 1);
      const [px, py] = at(u);
      bead(px, py, 1.4, 0.9);
    }
    // the splash crown where it lands, rising and falling
    const sp = (ph * 2 + i * 0.37) % 1;
    for (let k = -2; k <= 2; k++) {
      const h = Math.sin(sp * Math.PI) * (3 + Math.abs(k) * 0.6);
      bead(ex + k * (2.4 + sp * 2), ey - h, 0.8, 0.7 * (1 - sp * 0.6));
    }
  }
  // the lower bowl's overflow: separate ribbons, thick at the lip, each thinning and breaking into drops
  const ribbons = 11;
  for (let i = 0; i < ribbons; i++) {
    const rr = mkRng(500 + i);
    const th = Math.PI * (0.14 + (0.72 * (i + 0.2 + rr() * 0.6)) / ribbons);
    const sx = x + Math.cos(th) * (LOW.rx - 3);
    const sy = LOW.y + Math.sin(th) * LOW.ry + 2;
    const out = Math.cos(th) * 16;
    const ex = sx + out;
    const ey = POOL.y + 2 + Math.sin(th) * 7;
    const w0 = 5 + rr() * 4;
    const brk = 0.62 + 0.14 * Math.sin(ph * P2 + i * 1.7) + rr() * 0.08;
    const sway = (u: number) => Math.sin(ph * P2 + i * 1.1 + u * 5) * 1.2 * u;
    const at = (u: number): [number, number] => [sx + out * u ** 0.7 + sway(u), sy + (ey - sy) * (u * u * 0.35 + u * 0.65)];
    const left: [number, number][] = [];
    const right: [number, number][] = [];
    for (let k = 0; k <= 10; k++) {
      const u = (k / 10) * brk;
      const [px, py] = at(u);
      const w = w0 * (1 - u * 0.75) + Math.sin(ph * P2 * 2 + i + u * 9) * 0.6;
      left.push([px - w / 2, py]);
      right.push([px + w / 2, py]);
    }
    const rib = polyPath([...left, ...right.reverse()]);
    const g = c.createLinearGradient(sx - w0, 0, sx + w0, 0);
    g.addColorStop(0, rgba('#e8f4ff', 0.5 * a));
    g.addColorStop(0.35, rgba(WATER, 0.2 * a));
    g.addColorStop(1, rgba(WATER, 0.35 * a));
    c.fillStyle = g;
    rib(c);
    c.fill();
    // its lit edge, and the light sliding down it
    c.strokeStyle = rgba('#f0f8ff', 0.45 * a);
    c.lineWidth = 1;
    linePath(left.slice(0, 11))(c);
    c.stroke();
    const hu = ((ph + i * 0.23) % 1) * brk;
    const [hx, hy] = at(hu);
    c.strokeStyle = rgba('#ffffff', 0.7 * a * Math.sin((hu / brk) * Math.PI));
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(hx - 1, hy - 6);
    c.lineTo(hx - 1, hy + 3);
    c.stroke();
    // drops: pinched off the ribbon's end and falling, three in flight
    for (let d = 0; d < 3; d++) {
      const u = brk + (1 - brk) * ((ph * 1.5 + d / 3 + i * 0.29) % 1);
      const [px, py] = at(u);
      bead(px, py, 1.6 + (1 - u) * 1.2, 0.95);
    }
    // where it lands: foam churning, two rings spreading
    const f = Math.sin(ph * P2 * 2 + i * 1.9) * 0.5 + 0.5;
    c.fillStyle = rgba('#e8f4ff', (0.25 + f * 0.35) * a);
    c.beginPath();
    c.ellipse(ex, ey + 1, 5 + f * 3, 1.6 + f, 0, 0, P2);
    c.fill();
    for (let k = 0; k < 2; k++) {
      const u = (ph + k / 2 + i * 0.11) % 1;
      c.strokeStyle = rgba('#d8ecff', 0.4 * (1 - u) * a);
      c.lineWidth = 1;
      c.beginPath();
      c.ellipse(ex, ey + 2, 4 + u * 16, 1 + u * 3.5, 0, 0, P2);
      c.stroke();
    }
  }
  // the lip itself, wet and gleaming
  c.strokeStyle = rgba('#e8f4ff', 0.35 * a);
  c.lineWidth = 1.4;
  c.beginPath();
  c.ellipse(x, LOW.y + 2, LOW.rx - 2, LOW.ry, 0, Math.PI * 0.12, Math.PI * 0.88);
  c.stroke();
  c.restore();
}

// ——— live: frame painters ———

/** Bends per leaf sheet, and each sheet's bake scale. */
const BENDS = 9;
const LEAF_K: Record<string, number> = { frondA: 0.38, frondB: 0.38, bananaA: 0.42, bananaB: 0.42, monsteraA: 0.45, monsteraB: 0.45, earA: 0.45, earB: 0.45 };
const bendOf = (i: number) => -1 + (2 * i) / (BENDS - 1);

/** A falling leaf (6 painted: small blades, lit or turned away). */
const FALL_F = 28;
function fallLeafFrame(c: Ctx, i: number): void {
  // a pointed leaf with a midrib, one half lit and the other in shade; darker and greyer than the fight's bushes
  const pal = [PAL_BANANA, PAL_PALM, PAL_MONSTERA][i % 3];
  const dim = i < 3 ? 0.18 : 0.55;
  const L: Leaf = { kind: 'banana', x: 3, y: FALL_F / 2, a: 0, len: FALL_F - 6, wid: 5 + (i % 3) * 1.5, curl: (i - 2.5) * 0.14, droop: 0.12, seed: 900 + i, amp: 0, pal, point: true };
  const rib = ribOf(L, 0, 10);
  const mr = rib.map((q) => [q.x, q.y] as [number, number]);
  for (const sd of [1, -1]) {
    const e = halfOutline(L, rib, sd, 0);
    const half = polyPath([...e, ...mr.slice().reverse()]);
    const col = sd < 0 ? mix(pal.mid, pal.lit, 0.45) : mix(pal.dark, pal.mid, 0.5);
    flat(c, half, mix(col, '#2a3634', dim), 0, LEAF_INK);
  }
  const all = polyPath([...halfOutline(L, rib, 1, 0), ...halfOutline(L, rib, -1, 0).reverse()]);
  ink(c, all, 1, LEAF_INK, 0);
  c.strokeStyle = rgba(mix(pal.vein, '#2a3634', dim), 0.7);
  c.lineWidth = 0.9;
  linePath(mr)(c);
  c.stroke();
}

/** A ripple ring (drawn once, scaled out by the live code). */
function ringTex(c: Ctx, w: number, h: number): void {
  c.strokeStyle = rgba('#d8ecff', 0.7);
  c.lineWidth = 2;
  c.beginPath();
  c.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 2, 0, 0, P2);
  c.stroke();
  c.strokeStyle = rgba('#000000', 0.35);
  c.lineWidth = 1.4;
  c.beginPath();
  c.ellipse(w / 2, h / 2 + 2, w / 2 - 3, h / 2 - 3, 0, 0.2, Math.PI - 0.2);
  c.stroke();
}

/** A drop of condensation on the glass, and the wet trail it leaves. */
function dropTex(c: Ctx): void {
  c.fillStyle = rgba('#c8e0f0', 0.5);
  c.beginPath();
  c.ellipse(4, 5, 2.6, 3.2, 0, 0, P2);
  c.fill();
  c.fillStyle = rgba('#ffffff', 0.85);
  c.beginPath();
  c.arc(3.2, 3.8, 1, 0, P2);
  c.fill();
}
function trailTex(c: Ctx): void {
  const g = c.createLinearGradient(0, 0, 0, 32);
  g.addColorStop(0, rgba('#a8c8e0', 0));
  g.addColorStop(1, rgba('#a8c8e0', 0.28));
  c.fillStyle = g;
  c.fillRect(1, 0, 2, 32);
}

// ——— live ———

type Img = Phaser.GameObjects.Image;

registerKitScene(CHEETOE, (k) => {
  const live = k.slot('live');
  const fx = k.slot('fx');
  const B = Phaser.BlendModes;
  const ev = k.sc.events;

  // ——— the moonlight: the shafts and their rib shadows sliding, a cloud over the moon now and then
  const beamsImg = k.sprite('beams').setBlendMode(B.ADD).setAlpha(1);
  const bx0 = beamsImg.x;
  const by0 = beamsImg.y;
  const cloud = k.sprite('moonCloud').setAlpha(0);
  const cx0 = cloud.x;
  let cloudX = -1;
  let cloudA = 0;
  let cloudNext = 6 + crand() * 10;
  let cloudPass = 0;
  const moonGlow = k.glow(NV.moon.x, NV.moon.y, 150, 0xc8dcff, 0, { into: live });

  // ——— condensation running down the dome's panes (behind the leaves)
  const dropKey = k.tex('nc_drop', 8, 10, dropTex);
  const trailKey = k.tex('nc_trail', 4, 32, trailTex);
  const drips: { t: number; v0: number; v1: number; v: number; vel: number; hold: number; drop: Img; trail: Img; y0: number }[] = [];
  const newDrip = () => {
    // a pane on the dome between the palm and the banana, above the gallery
    const ci = 17 + Math.floor(crand() * 12);
    const ri = 9 + Math.floor(crand() * 3);
    const t = COLS_T[ci] + BAR * (0.2 + crand() * 0.6);
    const v1 = ROWS_V[ri + 1] - DOME_STEP * (0.1 + crand() * 0.2);
    const [x, y] = glassPt(t, v1);
    const trail = k.img(trailKey, x, y, { into: live, origin: [0.5, 1], alpha: 0.8 }).setScale(1, 0.01);
    const drop = k.img(dropKey, x, y, { into: live, alpha: 0 });
    return { t, v0: ROWS_V[ri] + DOME_STEP * 0.1, v1, v: v1, vel: 0, hold: crand() * 2, drop, trail, y0: y };
  };
  for (let i = 0; i < 7; i++) drips.push(newDrip());

  // ——— the leaves: each a painted sheet of bends, riding a spring the draught pushes
  const sheets: Record<string, { key: string; box: Box; kk: number }> = {};
  for (const [id, L] of Object.entries(LEAVES)) {
    const box = leafBox(L);
    const kk = LEAF_K[id] ?? 0.5;
    const key = sheet(k, `nc_leaf_${id}`, box.w * kk, box.h * kk, BENDS, (c, _p, i) => {
      c.scale(kk, kk);
      c.translate(-box.x, -box.y);
      paintLeaf(c, L, bendOf(i));
    });
    sheets[id] = { key, box, kk };
  }
  const heartKey = k.tex('nc_heart', HEART.w, HEART.h, (c) => palmHeart(c, HEART.w / 2, HEART.h / 2 - 6));
  const leaves = PLACES.map((p, i) => {
    const s = sheets[p.leaf];
    const L = LEAVES[p.leaf];
    const o: [number, number] = [(L.x - s.box.x) / s.box.w, (L.y - s.box.y) / s.box.h];
    const mk = () => k.sc.add.image(p.x, p.y, s.key, 0).setOrigin(...o).setRotation(p.rot).setScale(p.scale / s.kk);
    const a = mk();
    const b = mk();
    live.add([a, b]);
    if (p.id === 'frondB') k.img(heartKey, PC.x, PC.y + 6, { into: live });
    return { p, a, b, sp: new Spring(0, 7 + (i % 3) * 1.5, 1.6), seed: i * 2.7 + 1, kick: 0 };
  });
  const showLeaf = (l: (typeof leaves)[number], bend: number) => {
    const f = ((Phaser.Math.Clamp(bend, -1, 1) + 1) / 2) * (BENDS - 1);
    const i = Math.min(BENDS - 2, Math.floor(f));
    const u = f - i;
    l.a.setFrame(i).setAlpha(1);
    l.b.setFrame(i + 1).setAlpha(u);
  };

  // ——— leaves falling, spinning, fluttering down, landing and lying a while
  const fallKey = sheet(k, 'nc_fall', FALL_F, FALL_F, 6, (c, _p, i) => fallLeafFrame(c, i));
  const falling: { img: Img; x: number; y: number; vx: number; vy: number; rot: number; spin: number; ph: number; land: number; rest: number }[] = [];
  const dropLeaf = (x: number, y: number, vx = 0, vy = 0, land?: number, lit = false) => {
    if (falling.length > 40) return;
    const img = k.sc.add.image(x, y, fallKey, lit ? Math.floor(crand() * 3) : Math.floor(crand() * 6)).setScale(0.8 + crand() * 0.6);
    live.add(img);
    falling.push({ img, x, y, vx, vy, rot: crand() * P2, spin: (crand() - 0.5) * 6, ph: crand() * P2, land: land ?? (y < 560 ? 690 + crand() * 60 : TY + 40 + crand() * 200), rest: 0 });
  };
  /** Leaves shaken loose from the canopy over x (the palm's and the banana's crowns, the vines). */
  const shakeLoose = (x: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const from = x < 640 ? [PC.x + 60 + crand() * 300, PC.y + crand() * 160] : x > 1280 ? [1460 + crand() * 360, 120 + crand() * 200] : [x + (crand() - 0.5) * 500, 250 + crand() * 60];
      dropLeaf(from[0], from[1], (crand() - 0.5) * 60, 10 + crand() * 30);
    }
  };

  // ——— the open sash rattling on its stay
  const sashImg = k.pivot(k.sprite('sash'), SASH_HINGE[0], SASH_HINGE[1]);
  const rattle = new Spring(0, 220, 7);
  let tapT = 2;

  // ——— the fountain: its water (12 phases), rings spreading on the pool
  const waterKey = sheet(k, 'nc_water', WATER_BOX.w * WATER_K, WATER_BOX.h * WATER_K, WATER_N, (c, ph) => {
    c.scale(WATER_K, WATER_K);
    c.translate(-WATER_BOX.x, -WATER_BOX.y);
    waterAt(c, ph, 1);
  });
  const wA = k.sc.add.image(WATER_BOX.x, WATER_BOX.y, waterKey, 0).setOrigin(0, 0).setScale(1 / WATER_K);
  const wB = k.sc.add.image(WATER_BOX.x, WATER_BOX.y, waterKey, 1).setOrigin(0, 0).setScale(1 / WATER_K);
  live.add([wA, wB]);
  let wPh = crand() * WATER_N;
  const ringKey = k.tex('nc_ring', 120, 24, (c) => ringTex(c, 120, 24));
  const rings: { img: Img; age: number; life: number; s: number }[] = [];
  const ring = (x: number, y: number, s: number, life = 1.6) => {
    if (rings.length > 30) return;
    const img = k.img(ringKey, x, y, { into: live, alpha: 0 });
    rings.push({ img, age: 0, life, s });
  };
  let ringT = 0;

  // ——— dust turning in the shafts, fireflies drifting high and low
  const moteC = k.sc.add.container(0, 0);
  live.add(moteC);
  const motes = new Parts(k, { frame: 'mote', add: true, into: moteC, max: 60 });
  const moteRate = new Rate();
  const flies = Array.from({ length: 7 }, (_, i) => {
    const high = i < 4;
    const glow = k.glow(0, 0, 16, 0xbff5d8, 0, { into: fx });
    const core = k.img('glow', 0, 0, { into: fx, add: true, alpha: 0, sx: 0.035, sy: 0.035, tint: 0xeafff2 });
    return { high, glow, core, seed: i * 3.1 + 0.7, x: high ? 520 + crand() * 900 : 640 + crand() * 640, y: high ? 140 + crand() * 140 : 660 + crand() * 70, ph: crand() * P2, a: 1 };
  });

  // ——— the dark of the hunt: over the jungle and the leaves (not the bench)
  const dark = k.sc.add.rectangle(W / 2, TY / 2, W, TY, 0x2a3446, 1).setBlendMode(B.MULTIPLY).setAlpha(0);
  live.add(dark);

  // ——— the fight, heard (src/game/bosses/comics.ts, the cheetoe brain)
  let hunting = false;
  let still = 0;
  let darkA = 0;
  let shiver = 0;
  const whip = (x: number, power: number) => {
    for (const l of leaves) {
      const d = l.p.x - x;
      const near = Math.max(0.15, 1 - Math.abs(d) / 1100);
      l.sp.v += (d >= 0 ? 1 : -1) * 7 * power * near * (0.7 + crand() * 0.6);
    }
  };
  const onPounce = (x?: number) => {
    const px = x ?? W / 2;
    whip(px, 1);
    shakeLoose(px, 2);
    rattle.v += (crand() - 0.5) * 2;
  };
  const onFrenzy = () => {
    shiver = 0.9;
    rattle.v += 4 * (crand() < 0.5 ? -1 : 1);
    for (const l of leaves) l.sp.v += (crand() - 0.5) * 6;
  };
  const onHunt = () => {
    hunting = true;
    for (const l of leaves) l.sp.v *= 0.3;
  };
  const endHunt = () => {
    hunting = false;
  };
  const onFound = (x?: number, y?: number) => {
    endHunt();
    const fx2 = x ?? W / 2;
    const fy2 = y ?? 470;
    whip(fx2, 2.2);
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 + (crand() - 0.5) * 2.6;
      const sp = 160 + crand() * 260;
      dropLeaf(fx2 + (crand() - 0.5) * 60, fy2 + (crand() - 0.5) * 40, Math.cos(a) * sp, Math.sin(a) * sp, undefined, true);
    }
    rattle.v += 3;
  };
  const onAmbush = () => {
    endHunt();
    for (const l of leaves) if (l.p.leaf.startsWith('frond') || l.p.leaf.startsWith('banana')) l.sp.v += (crand() - 0.5) * 16;
    shakeLoose(PC.x + 200, 4);
    shakeLoose(1600, 4);
  };
  ev.on('cheetoe-pounce', onPounce);
  ev.on('cheetoe-frenzy', onFrenzy);
  ev.on('cheetoe-hunt', onHunt);
  ev.on('cheetoe-found', onFound);
  ev.on('cheetoe-ambush', onAmbush);
  ev.on('cheetoe-hunt-end', endHunt);
  const unlisten = () => {
    ev.off('cheetoe-pounce', onPounce);
    ev.off('cheetoe-frenzy', onFrenzy);
    ev.off('cheetoe-hunt', onHunt);
    ev.off('cheetoe-found', onFound);
    ev.off('cheetoe-ambush', onAmbush);
    ev.off('cheetoe-hunt-end', endHunt);
    ev.off(Phaser.Scenes.Events.SHUTDOWN, unlisten);
  };
  ev.once(Phaser.Scenes.Events.SHUTDOWN, unlisten);
  // in a fight the brain drives it; on the stages page the arena runs through the fight's moments by itself
  const inFight = 'miniFoot' in (k.sc as object);
  const DEMO: [number, () => void][] = [
    [3, () => onPounce(700)],
    [7, onFrenzy],
    [10, () => onPounce(1300)],
    [14, onHunt],
    [21, () => onFound(1220, 400)],
    [26, () => onPounce(500)],
    [30, onHunt],
    [36, onAmbush],
  ];
  const DEMO_T = 40;
  let demoT = 0;
  let demoI = 0;

  return {
    impact(x, y, p) {
      // the leaves shake and a few fall, the sash rattles, the pool rings
      for (const l of leaves) l.sp.v += (crand() - 0.5) * 6 * p + (l.p.x > x ? 1 : -1) * 2 * p;
      shakeLoose(x, Math.round(p * 2.4));
      rattle.v += (crand() - 0.5) * 6 * p;
      ring(FT.x + (crand() - 0.5) * 200, POOL.y + (crand() - 0.5) * 12, 0.8 + p * 0.6, 1.8);
      ring(FT.x, POOL.y + 2, 1.2 + p, 2.2);
      for (const d of drips) if (crand() < 0.5 * p) d.hold = 0;
      void y;
    },
    update(dt, t) {
      const cm = calm();
      if (!inFight) {
        demoT += dt;
        while (demoI < DEMO.length && demoT >= DEMO[demoI][0]) DEMO[demoI++][1]();
        if (demoT >= DEMO_T) {
          demoT = 0;
          demoI = 0;
          endHunt();
        }
      }
      // ——— the hunt: everything goes still and dark, the moon covered
      still += ((hunting ? 1 : 0) - still) * Math.min(1, dt * (hunting ? 2.5 : 1.2));
      darkA += ((hunting ? 0.5 : 0) - darkA) * Math.min(1, dt * (hunting ? 2 : 1.4));
      dark.setAlpha(darkA);
      // ——— the moon: a cloud drifting across now and then; in the hunt it slides over and stays
      cloudNext -= dt;
      if (cloudPass <= 0 && cloudNext <= 0 && !hunting) {
        cloudPass = 1;
        cloudX = -1;
        cloudNext = 30 + crand() * 30;
      }
      if (hunting) {
        cloudX += (0 - cloudX) * Math.min(1, dt * 2.2);
        cloudA += (1 - cloudA) * Math.min(1, dt * 3);
      } else if (cloudPass > 0) {
        cloudX += dt * 0.08 * cm;
        cloudA = Math.min(1, Math.max(0, Math.min(cloudX + 1, 1 - cloudX) * 2.5));
        if (cloudX >= 1) cloudPass = 0;
      } else {
        cloudX += dt * 0.6;
        cloudA = Math.max(0, cloudA - dt * 0.8);
      }
      cloud.setPosition(cx0 + Phaser.Math.Clamp(cloudX, -1, 1) * 60, cloud.y).setAlpha(cloudA);
      const cover = cloudA * Math.max(0, 1 - Math.abs(cloudX) * 1.2);
      const level = 1 - cover * 0.85;
      // ——— the shafts: breathing, their rib shadows sliding slowly as the moon moves
      beamsImg.setPosition(bx0 + wander(t * 0.05, 3) * 16 * cm, by0).setAlpha(level * (0.85 + 0.15 * wander(t * 0.3, 7)));
      moonGlow.setAlpha(0.1 * level);
      moteRate.tick(5 * level, dt, () => {
        const [sx, sw] = SHAFTS[Math.floor(crand() * SHAFTS.length)];
        const u = 0.15 + crand() * 0.7;
        const len = (BEAM_END - 40) / Math.sin(BEAM_A);
        motes.spawn({ x: sx + crand() * sw + Math.cos(BEAM_A) * len * u, y: 40 + Math.sin(BEAM_A) * len * u, vx: (crand() - 0.5) * 8, vy: (crand() - 0.6) * 6, life: 4 + crand() * 4, r0: 1 + crand() * 1.2, a: 0.5, tint: 0xd8e8ff, fade: 0.3 });
      });
      motes.update(dt);
      moteC.setAlpha(level);
      // ——— the draught from the sash: gusts that swell and fade; the leaves bend on their springs
      const gust = (0.45 + 0.55 * Math.max(0, wander(t * 0.18, 1.3))) * (1 - still) * cm;
      shiver = Math.max(0, shiver - dt);
      for (const l of leaves) {
        const target = gust * l.p.gust * (0.35 * wander(t * 0.4, l.seed) + 0.25 * Math.sin(t * 1.3 + l.seed)) + (shiver > 0 ? Math.sin(t * 38 + l.seed) * 0.25 * shiver : 0);
        const bend = l.sp.step(target, dt);
        if (still > 0.5) l.sp.v *= 1 - Math.min(1, dt * 3);
        showLeaf(l, bend);
      }
      // ——— falling leaves: flutter (a sideways swing with the leaf tilting into it), land, lie, fade
      for (let i = falling.length - 1; i >= 0; i--) {
        const f = falling[i];
        if (f.rest > 0) {
          f.rest += dt;
          f.img.setAlpha(Math.min(1, Math.max(0, 1 - (f.rest - 2) / 2)) * (hunting ? 0.15 : 1));
          if (f.rest > 4) {
            f.img.destroy();
            falling.splice(i, 1);
          }
          continue;
        }
        f.ph += dt * 2.6;
        f.vx *= 1 - Math.min(1, dt * 1.8);
        f.vy += (70 - f.vy) * Math.min(1, dt * 2.2);
        f.x += (f.vx + Math.sin(f.ph) * 46) * dt;
        f.y += f.vy * dt * (0.75 + 0.25 * Math.abs(Math.cos(f.ph)));
        f.rot += f.spin * dt;
        f.img.setPosition(f.x, f.y).setRotation(f.rot + Math.cos(f.ph) * 0.6).setScale(f.img.scaleX, Math.abs(f.img.scaleX * (0.55 + 0.45 * Math.abs(Math.cos(f.ph * 0.7))))).setAlpha(hunting ? 0.15 : 1);
        if (f.y >= f.land) {
          f.rest = 0.001;
          f.img.setRotation(f.rot).setScale(f.img.scaleX, f.img.scaleX * 0.55);
        }
      }
      // ——— the sash: tapping on its stay in the gusts, rattling when kicked
      tapT -= dt * gust;
      if (tapT <= 0) {
        tapT = 1.5 + crand() * 3;
        rattle.v += (crand() - 0.5) * 1.2;
      }
      sashImg.setRotation(Phaser.Math.Clamp(rattle.step(gust * 0.02, dt), -0.08, 0.08));
      // ——— condensation running down the panes: stuck, then slipping in a run
      for (const d of drips) {
        if (d.hold > 0) d.hold -= dt * (0.6 + gust);
        else {
          d.vel += (DOME_STEP * 0.5 - d.vel) * Math.min(1, dt * 3);
          d.v -= d.vel * dt * cm;
          if (crand() < dt * 1.2) d.hold = 0.3 + crand() * 1.5;
        }
        if (d.v <= d.v0) {
          d.drop.destroy();
          d.trail.destroy();
          Object.assign(d, newDrip());
          continue;
        }
        const [x, y] = glassPt(d.t, d.v);
        const life = (d.v1 - d.v) / (d.v1 - d.v0);
        d.drop.setPosition(x, y).setAlpha(Math.min(1, life * 8) * (1 - still * 0.6));
        d.trail.setPosition(x, y - 3).setScale(1, Math.max(0.01, (y - d.y0) / 32)).setAlpha(0.8 * (1 - life * 0.5));
      }
      // ——— the fountain
      wPh = (wPh + dt * 9 * cm) % WATER_N;
      const wi = Math.floor(wPh);
      wA.setFrame(wi);
      wB.setFrame((wi + 1) % WATER_N).setAlpha(wPh - wi);
      ringT -= dt;
      if (ringT <= 0) {
        ringT = 0.35 + crand() * 0.4;
        const th = Math.PI * (0.2 + crand() * 0.6);
        ring(FT.x + Math.cos(th) * (LOW.rx + 10), POOL.y + 2 + Math.sin(th) * 6, 0.35 + crand() * 0.2, 1.2);
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        const g = rings[i];
        g.age += dt;
        const u = g.age / g.life;
        if (u >= 1) {
          g.img.destroy();
          rings.splice(i, 1);
          continue;
        }
        const s = g.s * (0.25 + u * 1.1);
        g.img.setScale(s, s).setAlpha(0.6 * (1 - u) * Math.min(1, u * 6));
      }
      // ——— fireflies: high under the dome or low over the tiles, never where she hides; they sink away in the hunt
      for (const f of flies) {
        f.a += ((hunting ? 0.08 : 1) - f.a) * Math.min(1, dt * 1.5);
        const wx = f.x + wander(t * 0.12, f.seed) * 140;
        let wy = f.y + wander(t * 0.1, f.seed + 4) * (f.high ? 60 : 30) + (hunting ? (f.high ? -30 : 30) * still : 0);
        wy = f.high ? Phaser.Math.Clamp(wy, 110, 300) : Phaser.Math.Clamp(wy, 646, 748);
        const blink = Math.max(0, Math.sin(t * 1.3 + f.ph)) ** 3;
        f.glow.setPosition(wx, wy).setAlpha((0.1 + 0.25 * blink) * f.a);
        f.core.setPosition(wx, wy).setAlpha((0.25 + 0.6 * blink) * f.a);
      }
    },
    destroy() {
      unlisten();
      for (const f of falling) f.img.destroy();
      for (const g of rings) g.img.destroy();
    },
  };
});
