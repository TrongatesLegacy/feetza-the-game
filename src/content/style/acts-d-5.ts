// Batch D, part 5: Act 8's new Bifröst feet, the last four (Raven Talons, Skald Slippers, Dwarf-Forged Boots, Muspel
// Fire-Feet), drawn front-on in the style kit like every foot: one silhouette each, one light from the top left,
// materials. Their life in play: src/content/styleLive/act8b.ts.

import type { FootArt } from '../../data/feet';
import { CX } from '../../art/feetCommon';
import { type StyleToe, onToe } from '../../art/style/anatomy';
import { bareOutline, paintBare } from '../../art/style/bare';
import { LIGHT, type PathFn, type Pose, ao, crease, glint, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil } from '../../art/style/sil';
import { type PartDef, type ShieldDef, registerStyle } from '../../art/style/registry';
import { blotches, clawPath, contact, paintClaw, rivet, stitches } from '../../art/style/details';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';
import { lockPath } from './pilot-fur';
import { ell, glowDot, hgrad, piece, prop, rrect, vgrad, within } from './roster-kit';
import { DMAT, LX, LY, carvedRune, furCoat, glowOnly, oneLight } from './acts-d-kit';

type Opts = { live: boolean; emissive?: boolean; heat?: boolean; noShield?: boolean };
type Box = { x: number; y: number; w: number; h: number };
type P2 = [number, number];

/** A closed polygon as a path. */
const poly = (pts: P2[]): PathFn => (c) => {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
};

/** A pointed feather from its root at (x, y) along `ang` (π/2 = down), len long and w wide. */
const featherPath = (x: number, y: number, ang: number, len: number, w: number): PathFn => (c) => {
  c.save();
  c.translate(x, y);
  c.rotate(ang - Math.PI / 2);
  c.beginPath();
  c.moveTo(-w * 0.34, 0);
  c.bezierCurveTo(-w * 0.62, len * 0.32, -w * 0.46, len * 0.8, 0, len);
  c.bezierCurveTo(w * 0.46, len * 0.8, w * 0.62, len * 0.32, w * 0.34, 0);
  c.closePath();
  c.restore();
};

/** Paint a raven's feather (inside a silhouette): near-black, a blue-violet sheen where the light catches it, the
 * shaft and a few barbs, lit along its top-left edge and dark along its far one. */
function paintFeather(g: Ctx, x: number, y: number, ang: number, len: number, w: number, base: string, sheen = 1): void {
  const p = featherPath(x, y, ang, len, w);
  // the shadow it casts on what's under it
  softFill(g, featherPath(x + 1.5, y + 2.5, ang, len, w), rgba('#000000', 0.45), 2.5);
  within(g, p, () => {
    g.save();
    g.translate(x, y);
    g.rotate(ang - Math.PI / 2);
    g.fillStyle = vgrad(g, 0, len, [[0, shade(base, -0.3)], [0.5, base], [1, shade(base, 0.12)]]);
    g.fillRect(-w, -2, w * 2, len + 4);
    // the sheen: a blue-violet band, a touch of teal at its edge, strongest on the lit side
    const sg = g.createLinearGradient(-w * 0.5, len * 0.2, w * 0.5, len * 0.8);
    sg.addColorStop(0, rgba('#6a78d0', 0.42 * sheen));
    sg.addColorStop(0.35, rgba('#4a7aa8', 0.22 * sheen));
    sg.addColorStop(0.6, rgba('#7a4aa8', 0.12 * sheen));
    sg.addColorStop(1, rgba('#000000', 0));
    g.fillStyle = sg;
    g.fillRect(-w, 0, w * 2, len);
    // far edge dark, near edge lit
    g.fillStyle = hgrad(g, -w * 0.5, w * 0.5, [[0, rgba('#cfe2ff', 0.18 * sheen)], [0.4, rgba('#000000', 0)], [1, rgba('#000000', 0.45)]]);
    g.fillRect(-w, 0, w * 2, len);
    // barbs, then the shaft
    g.strokeStyle = rgba('#000000', 0.22);
    g.lineWidth = 0.8;
    for (let i = 1; i < 6; i++) {
      const t = (i / 6) * len;
      g.beginPath();
      g.moveTo(0, t - 3);
      g.lineTo(-w * 0.45, t + 3);
      g.moveTo(0, t - 3);
      g.lineTo(w * 0.45, t + 3);
      g.stroke();
    }
    g.strokeStyle = rgba('#8a90b8', 0.28 * sheen);
    g.lineWidth = Math.max(0.8, w * 0.06);
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(-w * 0.04, len * 0.5, 0, len * 0.92);
    g.stroke();
    g.restore();
  });
}

// ════════════════════════ Raven Talons ════════════════════════
// One of the All-Father's ravens: its feathered "trousers" over the top, black with a blue-violet sheen, falling in a
// hem of long pointed feathers over a scaly black shank with a gold rune ring on it; three scaly toes splayed
// forward with knobbly pads and great hooked black talons, a stolen pepperoni skewered on one. Its wings spread out
// either side. In play the wings beat, a feather drifts off now and then and the gold ring glints.

/** The wings' roots (sway parts). */
export const RAVEN_WINGS: { s: number; root: P2 }[] = [
  { s: -1, root: [CX - 58, 44] },
  { s: 1, root: [CX + 58, 44] },
];
/** The gold ring round the shank: its centre line. */
export const RAVEN_RING = { y: 134, hw: 34 };

interface RToe { x0: number; y0: number; x1: number; y1: number; w0: number; w1: number }
const RAVEN_TOES: RToe[] = [
  { x0: CX - 24, y0: 154, x1: CX - 78, y1: 226, w0: 31, w1: 20 },
  { x0: CX, y0: 156, x1: CX, y1: 240, w0: 33, w1: 22 },
  { x0: CX + 24, y0: 154, x1: CX + 78, y1: 226, w0: 31, w1: 20 },
];

function ravenToes(p: Pose): RToe[] {
  const c = Math.max(0, p.curl);
  const s = Math.max(0, -p.curl);
  return RAVEN_TOES.map((t, i) => {
    const w = p.wiggle[i + 1] ?? 0;
    // curled, the toes draw in towards the shank; splayed, they spread out
    const k = 1 - 0.24 * c + 0.04 * s + 0.05 * w;
    return { ...t, x1: t.x0 + (t.x1 - t.x0) * k + (t.x1 - CX) * 0.14 * s, y1: t.y0 + (t.y1 - t.y0) * k };
  });
}

/** A point along a toe (u 0 root … 1 tip) and its half width there (the pads bulge at the joints). */
function toeAt(t: RToe, u: number): { x: number; y: number; hw: number; nx: number; ny: number } {
  const dx = t.x1 - t.x0;
  const dy = t.y1 - t.y0;
  const l = Math.hypot(dx, dy) || 1;
  const bump = Math.pow(Math.sin(u * Math.PI * 2.5 + 0.4), 2) * 0.1;
  return { x: t.x0 + dx * u, y: t.y0 + dy * u, hw: ((t.w0 + (t.w1 - t.w0) * u) / 2) * (1 + bump), nx: -dy / l, ny: dx / l };
}

const ravenToePath = (t: RToe): PathFn => (c) => {
  const n = 16;
  const left: P2[] = [];
  const right: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = toeAt(t, i / n);
    left.push([a.x + a.nx * a.hw, a.y + a.ny * a.hw]);
    right.push([a.x - a.nx * a.hw, a.y - a.ny * a.hw]);
  }
  const tip = toeAt(t, 1);
  const ang = Math.atan2(t.y1 - t.y0, t.x1 - t.x0);
  c.beginPath();
  // (its root runs up under the shank)
  c.moveTo(t.x0 + (left[0][0] - t.x0), t.y0 - 14);
  left.forEach(([x, y]) => c.lineTo(x, y));
  c.arc(tip.x, tip.y, tip.hw, ang + Math.PI / 2, ang - Math.PI / 2, true);
  for (let i = n; i >= 0; i--) c.lineTo(right[i][0], right[i][1]);
  c.lineTo(t.x0 + (right[0][0] - t.x0), t.y0 - 14);
  c.closePath();
};

/** The talon at a toe's tip. */
function ravenTalon(t: RToe, i: number, curl: number): { x: number; y: number; ang: number; len: number; w: number; hook: number } {
  const tip = toeAt(t, 0.96);
  const ang = Math.atan2(t.y1 - t.y0, t.x1 - t.x0) + (i === 1 ? 0 : (i === 0 ? 0.18 : -0.18));
  return { x: tip.x, y: tip.y, ang, len: 44 * (1 - curl * 0.12), w: 19, hook: (i === 0 ? 0.45 : i === 2 ? -0.45 : 0.12) * (1 + curl * 0.8) };
}

/** The shank: a scaly column from under the feathers down to where the toes spread. */
const ravenShank: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 36, 60);
  c.bezierCurveTo(CX - 34, 100, CX - 30, 136, CX - 42, 160);
  c.quadraticCurveTo(CX, 178, CX + 42, 160);
  c.bezierCurveTo(CX + 30, 136, CX + 34, 100, CX + 36, 60);
  c.closePath();
};

/** The feathered top: from the leg out over the shank's top. */
const ravenTrousers: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 52, -6);
  c.bezierCurveTo(CX - 56, 24, CX - 90, 40, CX - 94, 78);
  c.quadraticCurveTo(CX, 100, CX + 94, 78);
  c.bezierCurveTo(CX + 90, 40, CX + 56, 24, CX + 52, -6);
  c.closePath();
};

/** The hem: long pointed feathers hanging over the shank (root x, y, angle, length, width). */
const RAVEN_HEM: [number, number, number, number, number][] = (() => {
  const r = rng(hashStr('raven-hem'));
  const out: [number, number, number, number, number][] = [];
  for (let i = 0; i < 9; i++) {
    const u = i / 8;
    const side = (u - 0.5) * 2;
    const x = CX - 82 + u * 164;
    const y = 68 + (1 - side * side) * 10 + (r() - 0.5) * 4;
    out.push([x, y, Math.PI / 2 - side * 0.42, 26 + Math.abs(side) * 10 + r() * 5, 24 + r() * 4]);
  }
  return out;
})();

/** The contour feathers over the trousers, in rows from the hem up (each upper row overlaps the one below). */
const RAVEN_ROWS: [number, number, number, number, number][][] = (() => {
  const r = rng(hashStr('raven-rows'));
  const rows: [number, number, number, number, number][][] = [];
  for (let j = 0; j < 5; j++) {
    const y = 58 - j * 15;
    const hw = 84 - j * 7;
    const n = 7 - Math.floor(j / 2);
    const row: [number, number, number, number, number][] = [];
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0.5 : (i + (j % 2) * 0.5) / (n - 0.5);
      const x = CX - hw + u * hw * 2;
      const side = (x - CX) / 90;
      row.push([x + (r() - 0.5) * 4, y + side * side * 6, Math.PI / 2 - side * 0.5, 24 + r() * 6, 22 + r() * 5]);
    }
    rows.push(row);
  }
  return rows;
})();

/** A raven's wing: coverts at the root and six fingered primaries fanning out and down. */
function ravenWingFeathers(s: number, root: P2): [number, number, number, number, number][] {
  const out: [number, number, number, number, number][] = [];
  const base = s < 0 ? Math.PI : 0;
  for (let i = 0; i < 6; i++) {
    const a = base + s * (-0.42 + i * 0.22);
    out.push([root[0], root[1], a, 86 - i * 5 - (i > 3 ? 6 : 0), 17 - i * 0.5]);
  }
  return out;
}

function ravenWing(ctx: Ctx, s: number, root: P2, black: string): void {
  const feathers = ravenWingFeathers(s, root);
  const base = s < 0 ? Math.PI : 0;
  const coverts: [number, number, number, number, number][] = [
    [root[0], root[1] - 2, base + s * -0.05, 52, 30],
    [root[0], root[1] + 4, base + s * 0.4, 46, 30],
    [root[0] + s * 4, root[1], base + s * 0.15, 34, 34],
  ];
  const paths = [...feathers, ...coverts].map(([x, y, a, l, w]) => featherPath(x, y, a, l, w));
  const box = { x: root[0] - 100, y: root[1] - 60, w: 200, h: 160 };
  prop(ctx, paths, box, (g, sil) => {
    // the primaries, the lowest first, each fingered tip separate
    for (let i = feathers.length - 1; i >= 0; i--) {
      const [x, y, a, l, w] = feathers[i];
      paintFeather(g, x, y, a, l, w, shade(black, -i * 0.02), 1 - i * 0.08);
    }
    for (const [x, y, a, l, w] of coverts) paintFeather(g, x, y, a, l, w, shade(black, 0.04), 1.1);
    ao(g, root[0], root[1], 14, 12, 0.6, 0, '#000000');
    sil.edge(rgba('#000006', 0.35), 10, LX * 5, LY * 5);
    sil.edge(rgba(LIGHT.rim, 0.55), 2.2, LX * 2.6, LY * 2.6);
  }, inkOf('#22222c'), { w: 3 });
}

function ravenWingPart(i: number): PartDef {
  const { s, root } = RAVEN_WINGS[i];
  return { box: { x: root[0] - 104, y: root[1] - 64, w: 208, h: 168 }, frames: 1, pivot: root, draw: (g, art) => ravenWing(g, s, root, art.primary ?? '#17161f') };
}

/** Scutes on a scaly part: transverse plates across it, each lit along its upper lip and shaded along its lower. */
function scuteBand(g: Ctx, cx: number, cy: number, hw: number, ang: number, bow: number, skin: string): void {
  g.save();
  g.translate(cx, cy);
  g.rotate(ang - Math.PI / 2);
  const arc = (c: Ctx, dy: number) => {
    c.moveTo(-hw, dy);
    c.quadraticCurveTo(0, dy + bow, hw, dy);
  };
  softStroke(g, (c) => arc(c, 2.5), rgba('#000000', 0.6), 3.2, 1.4);
  softStroke(g, (c) => arc(c, -0.5), rgba(shade(skin, 0.55), 0.5), 1.6, 0.6);
  g.restore();
}

function paintRavenToe(g: Ctx, t: RToe, skin: string, r: () => number): void {
  const path = ravenToePath(t);
  const ang = Math.atan2(t.y1 - t.y0, t.x1 - t.x0);
  const box = { x: Math.min(t.x0, t.x1) - 30, y: t.y0 - 20, w: Math.abs(t.x1 - t.x0) + 60, h: t.y1 - t.y0 + 50 };
  piece(g, path, box, { ...DMAT.hide, rim: 0.2, bevel: 0.2 }, skin, { shadow: 0.55, size: 10, texA: 0.2 });
  within(g, path, () => {
    // its rounded volume: lit on the near side, falling away on the far
    const a0 = toeAt(t, 0.5);
    const gr = g.createLinearGradient(a0.x + a0.nx * a0.hw, a0.y + a0.ny * a0.hw, a0.x - a0.nx * a0.hw, a0.y - a0.ny * a0.hw);
    const lit = t.x1 <= CX + 1;
    gr.addColorStop(0, rgba(lit ? '#cfd6ff' : '#000000', lit ? 0.14 : 0.35));
    gr.addColorStop(0.5, rgba('#000000', 0));
    gr.addColorStop(1, rgba(lit ? '#000000' : '#cfd6ff', lit ? 0.4 : 0.1));
    g.fillStyle = gr;
    g.fillRect(box.x, box.y, box.w, box.h);
    // the scutes in rings down the toe, bowed towards its tip
    for (let k = 0; k < 6; k++) {
      const u = 0.1 + k * 0.14;
      const at = toeAt(t, u);
      scuteBand(g, at.x, at.y, at.hw * 1.05, ang, 7, skin);
    }
    // pebbled scales on the pads along its sides
    for (let k = 0; k < 18; k++) {
      const u = 0.1 + r() * 0.8;
      const at = toeAt(t, u);
      const side = r() < 0.5 ? -1 : 1;
      const px = at.x + at.nx * at.hw * 0.8 * side;
      const py = at.y + at.ny * at.hw * 0.8 * side;
      ao(g, px + 0.8, py + 1, 2.6, 2, 0.4, 0, '#000000');
      g.fillStyle = rgba(shade(skin, 0.3), 0.35);
      g.beginPath();
      g.arc(px - 0.4, py - 0.5, 1.4, 0, Math.PI * 2);
      g.fill();
    }
    spec(g, a0.x - 4, a0.y - 2, 5, 14, 0.3, ang - Math.PI / 2, '#d8e0ff');
  });
}

/** A stolen pepperoni skewered on a talon. */
function paintPepperoni(g: Ctx, x: number, y: number, r: number, rot: number): void {
  const pp = ell(x, y, r, r * 0.52, rot);
  piece(g, pp, { x: x - r, y: y - r, w: r * 2, h: r * 2 }, 'sauce', '#c8402a', { shadow: 0.6, size: 5, texA: 0.2 });
  within(g, pp, () => {
    const rr = rng(hashStr('pep'));
    for (let i = 0; i < 9; i++) {
      const a = rr() * Math.PI * 2;
      const d = rr() * r * 0.7;
      g.fillStyle = rgba(rr() < 0.5 ? '#5a0a06' : '#f0a070', 0.5);
      g.beginPath();
      g.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.6 + rr() * 1.4, 1.2 + rr(), a, 0, Math.PI * 2);
      g.fill();
    }
    // the rim curls up a little and catches the light
    softStroke(g, (c) => c.ellipse(x, y, r - 1.5, r * 0.52 - 1.5, rot, Math.PI * 0.9, Math.PI * 1.7), rgba('#ff9a7a', 0.6), 1.6, 0.8);
    spec(g, x - r * 0.35, y - r * 0.35, r * 0.3, r * 0.18, 0.85, -0.6);
  });
}

function drawRaven(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  if (o.emissive || o.heat) return;
  const black = art.primary ?? '#17161f';
  const skin = art.skin ?? '#2e2c34';
  const gold = art.secondary ?? '#d8a83a';
  const curl = Math.max(0, p.curl);
  if (!o.live) for (const w of RAVEN_WINGS) ravenWing(ctx, w.s, w.root, black);
  const toes = ravenToes(p);
  const talons = toes.map((t, i) => ravenTalon(t, i, curl));
  const pep = talons[2];
  const pepAt: P2 = [pep.x + Math.cos(pep.ang) * pep.len * 0.34, pep.y + Math.sin(pep.ang) * pep.len * 0.34];
  const hem = RAVEN_HEM.map(([x, y, a, l, w]) => featherPath(x, y, a, l, w));
  const box = { x: CX - 140, y: -10, w: 280, h: 290 };
  const parts = [ravenShank, ...toes.map(ravenToePath), ...talons.map((k) => clawPath(k.x, k.y, k.ang, k.len, k.w, k.hook)), ell(pepAt[0], pepAt[1], 23, 12, 0.5), ravenTrousers, ...hem];
  const sil = new Sil(ctx, parts, box);
  const g = sil.g;
  const r = rng(hashStr('raven'));
  // the toes, the middle one last (it's nearest), each talon after its toe
  for (const i of [0, 2, 1]) {
    paintRavenToe(g, toes[i], skin, r);
    const k = talons[i];
    contact(g, (c) => {
      clawPath(k.x, k.y, k.ang, k.len, k.w, k.hook)(c);
      c.fill();
    }, 0.6, 2.4, 3);
    paintClaw(g, k.x, k.y, k.ang, k.len, k.w, k.hook, '#3a3640', '#030305');
    spec(g, k.x + Math.cos(k.ang) * k.len * 0.3 - 2, k.y + Math.sin(k.ang) * k.len * 0.3, 2.2, 6, 0.6, k.ang - Math.PI / 2);
    if (i === 2) {
      // skewered: the slice over the talon, the talon's point coming out through it
      paintPepperoni(g, pepAt[0], pepAt[1], 23, 0.5);
      g.save();
      g.beginPath();
      g.rect(box.x, box.y, box.w, box.h);
      g.ellipse(pepAt[0], pepAt[1], 23, 12, 0.5, 0, Math.PI * 2);
      g.clip('evenodd');
      g.beginPath();
      g.arc(pepAt[0], pepAt[1], 60, k.ang - 1.2, k.ang + 1.2);
      g.lineTo(pepAt[0], pepAt[1]);
      g.closePath();
      g.clip();
      paintClaw(g, k.x, k.y, k.ang, k.len, k.w, k.hook, '#3a3640', '#030305');
      g.restore();
      softStroke(g, (c) => c.ellipse(pepAt[0] + Math.cos(k.ang) * 3, pepAt[1] + Math.sin(k.ang) * 3, 4, 2.5, k.ang, 0, Math.PI * 2), rgba('#3a0604', 0.7), 2, 1);
    }
  }
  // where the toes meet: dark clefts (under the shank's ball)
  for (const [a, b] of [[0, 1], [1, 2]]) {
    const ta = toeAt(toes[a], 0.12);
    const tb = toeAt(toes[b], 0.12);
    ao(g, (ta.x + tb.x) / 2, (ta.y + tb.y) / 2 + 6, 8, 12, 0.7, 0, '#000000');
  }
  // the shank over the toes' roots: black scaly skin, big scutes down its front, small ones round its sides
  ao(g, CX, 170, 50, 10, 0.75, 0, '#000000');
  piece(g, ravenShank, box, DMAT.hide, skin, { shadow: 0, size: 14, texA: 0.25 });
  within(g, ravenShank, () => {
    g.fillStyle = hgrad(g, CX - 40, CX + 40, [[0, rgba('#cfd6ff', 0.1)], [0.3, rgba('#cfd6ff', 0.04)], [0.7, rgba('#000000', 0.2)], [1, rgba('#000000', 0.5)]]);
    g.fillRect(CX - 44, 56, 88, 124);
    for (let y = 70; y < 168; y += 11) scuteBand(g, CX, y, 24, Math.PI / 2, 6, skin);
    for (let i = 0; i < 40; i++) {
      const side = r() < 0.5 ? -1 : 1;
      const x = CX + side * (26 + r() * 10);
      const y = 64 + r() * 96;
      ao(g, x + 0.6, y + 1, 2.4, 1.8, 0.4, 0, '#000000');
    }
  });
  // the gold ring round the shank: rune-cut, the light running round it
  const ry = RAVEN_RING.y;
  const ring: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 35, ry - 8);
    c.quadraticCurveTo(CX, ry - 1, CX + 35, ry - 8);
    c.lineTo(CX + 34, ry + 8);
    c.quadraticCurveTo(CX, ry + 15, CX - 34, ry + 8);
    c.closePath();
  };
  ao(g, CX, ry + 12, 36, 5, 0.6, 0, '#000000');
  piece(g, ring, { x: CX - 36, y: ry - 10, w: 72, h: 26 }, 'gold', gold, { shadow: 0.5, size: 5, texA: 0.12 });
  within(g, ring, () => {
    g.fillStyle = hgrad(g, CX - 36, CX + 36, [[0, rgba('#fff4c0', 0.35)], [0.28, rgba('#fff4c0', 0.55)], [0.42, rgba('#fff4c0', 0)], [1, rgba('#3a1a04', 0.55)]]);
    g.fillRect(CX - 40, ry - 12, 80, 30);
    for (let k = 0; k < 4; k++) carvedRune(g, k * 2 + 1, CX - 24 + k * 13, ry - 4, 8, 11, '#5a3208');
  });
  glint(g, CX - 18, ry - 3, 3.5, 0.95);
  // the feathers: the hem first, then the rows of contour feathers from the bottom up, all lying down and out
  ao(g, CX, 92, 70, 12, 0.6, 0, '#000000');
  for (const [x, y, a, l, w] of RAVEN_HEM) paintFeather(g, x, y, a, l, w, black, 0.9);
  within(g, ravenTrousers, () => {
    g.fillStyle = vgrad(g, -6, 90, [[0, shade(black, -0.2)], [1, black]]);
    g.fillRect(box.x, -10, box.w, 104);
  });
  for (const row of RAVEN_ROWS) for (const [x, y, a, l, w] of row) paintFeather(g, x, y, a, l, w, black, 1);
  // the one light over it all
  const fl = g.createLinearGradient(CX - 100, 0, CX + 110, 240);
  fl.addColorStop(0, rgba(LIGHT.key, 0.12));
  fl.addColorStop(0.45, rgba(LIGHT.key, 0));
  fl.addColorStop(1, rgba('#04040e', 0.35));
  g.fillStyle = fl;
  g.fillRect(box.x, box.y, box.w, box.h);
  sil.edge(rgba('#000006', 0.4), 16, LX * 9, LY * 9);
  sil.edge(rgba(LIGHT.rim, 0.5), 2.4, LX * 3, LY * 3);
  sil.finish(inkOf('#1a1a24'), { openTop: -5, inner: 0.3 });
}

registerStyle('raven', {
  contactY: 262,
  halfWidth: 100,
  rig: { from: 172, to: 190 },
  leg: { kind: 'fur', hw: 52, join: 'blend', fade: 24 },
  parts: { wingL: ravenWingPart(0), wingR: ravenWingPart(1) },
  draw(ctx, art, p, o) {
    drawRaven(ctx, art, p, o);
  },
});

// ════════════════════════ Skald Slippers ════════════════════════
// A saga-singer's soft slipper of felted wool, dyed woad blue: a turned-down cuff of fox fur at the top, a tablet-woven
// band in madder red and gold round its throat, a knot of gold-thread embroidery on the vamp, a whip-stitched seam
// down the toe. His lyre hangs at his side on a braided cord: a round-shouldered
// Germanic lyre of maple, six gut strings, gilt bird-head mounts. In play the lyre swings, and gold runes drift off
// its strings as he sings.

/** The lyre: its centre, half size, and where its cord hangs from. */
export const LYRE = { x: CX + 104, y: 168, hw: 28, hh: 62, pivot: [CX + 90, 58] as P2, tilt: 0.14 };
/** The lyre's strings in its own frame (x offsets): for the live layer's shimmer. */
export const LYRE_STRINGS = [-11, -6.6, -2.2, 2.2, 6.6, 11];

const skaldBody = (flex: number): PathFn => (c) => {
  const b = 252 - flex * 6;
  c.beginPath();
  c.moveTo(CX - 58, -6);
  c.bezierCurveTo(CX - 60, 50, CX - 98, 104, CX - 99, 170);
  c.bezierCurveTo(CX - 99, b - 14, CX - 60, b + 1, CX, b);
  c.bezierCurveTo(CX + 60, b + 1, CX + 101, b - 14, CX + 100, 170);
  c.bezierCurveTo(CX + 100, 104, CX + 62, 50, CX + 60, -6);
  c.closePath();
};

/** The fox-fur cuff: rolled over the top, a shaggy hem of locks. */
const skaldCuff: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 64, -6);
  c.bezierCurveTo(CX - 68, 12, CX - 80, 28, CX - 82, 44);
  c.quadraticCurveTo(CX, 62, CX + 84, 44);
  c.bezierCurveTo(CX + 82, 28, CX + 70, 12, CX + 66, -6);
  c.closePath();
};
const SKALD_LOCKS: [number, number, number, number, number, number][] = (() => {
  const r = rng(hashStr('skald-cuff'));
  const out: [number, number, number, number, number, number][] = [];
  for (let i = 0; i < 9; i++) {
    const u = i / 8;
    const side = (u - 0.5) * 2;
    out.push([CX - 76 + u * 152, 40 + (1 - side * side) * 10, Math.PI / 2 - side * 0.3, 14 + r() * 8, 22 + r() * 6, -side * 0.25 + (r() - 0.5) * 0.3]);
  }
  return out;
})();
/** The tablet-woven band's centre line at x (bowed down over the instep). */
const bandY = (x: number): number => 70 + Math.cos(((x - CX) / 100) * Math.PI * 0.5) * 10 - Math.pow((x - CX) / 100, 2) * 2;

const lyreFrame = (x: number, y: number, hw: number, hh: number): PathFn => (c) => {
  c.beginPath();
  c.roundRect(x - hw, y - hh, hw * 2, hh * 2, [hw * 0.8, hw * 0.8, hw * 0.5, hw * 0.5]);
  // the opening between its arms, wound the other way so it's cut out whatever the fill rule
  const ox = x - hw * 0.58;
  const oy = y - hh * 0.8;
  const ow = hw * 1.16;
  const oh = hh * 0.56;
  const rt = hw * 0.4;
  const rb = hw * 0.25;
  c.moveTo(ox + rt, oy);
  c.arcTo(ox, oy, ox, oy + rt, rt);
  c.lineTo(ox, oy + oh - rb);
  c.arcTo(ox, oy + oh, ox + rb, oy + oh, rb);
  c.lineTo(ox + ow - rb, oy + oh);
  c.arcTo(ox + ow, oy + oh, ox + ow, oy + oh - rb, rb);
  c.lineTo(ox + ow, oy + rt);
  c.arcTo(ox + ow, oy, ox + ow - rt, oy, rt);
  c.closePath();
};

/** The lyre on its own (it has its own outline and swings as a part in play), turned by its tilt about its cord. */
function paintLyre(ctx: Ctx): void {
  const { x, y, hw, hh, pivot, tilt } = LYRE;
  ctx.save();
  ctx.translate(pivot[0], pivot[1]);
  ctx.rotate(tilt);
  ctx.translate(-pivot[0], -pivot[1]);
  const frame = lyreFrame(x, y, hw, hh);
  const box = { x: x - hw - 6, y: y - hh - 6, w: hw * 2 + 12, h: hh * 2 + 12 };
  const s = new Sil(ctx, [(c) => { frame(c); }], box);
  const g = s.g;
  // (the frame path has a hole: fill with even-odd)
  const fillFrame = (col: string | CanvasGradient) => {
    g.fillStyle = col;
    frame(g);
    g.fill('evenodd');
  };
  fillFrame(vgrad(g, y - hh, y + hh, [[0, '#c88a44'], [0.5, '#b07432'], [1, '#7a4a20']]));
  g.save();
  frame(g);
  g.clip('evenodd');
  texture(g, 'wood', box, 0.5, 1.1);
  // the arms' rounded edges catch the light
  g.fillStyle = hgrad(g, x - hw, x + hw, [[0, rgba(LIGHT.key, 0.35)], [0.2, rgba(LIGHT.key, 0)], [0.75, rgba('#000000', 0)], [1, rgba('#2a1004', 0.5)]]);
  g.fillRect(box.x, box.y, box.w, box.h);
  // the soundboard: a thin lighter board on the body, carved knotwork round it, its edge inlaid
  const board = rrect(x - hw * 0.72, y - hh * 0.18, hw * 1.44, hh * 1.06, hw * 0.35);
  piece(g, board, box, 'wood', '#d8a060', { shadow: 0.5, size: 5, texA: 0.3 });
  within(g, board, () => {
    g.strokeStyle = rgba('#5a3010', 0.5);
    g.lineWidth = 1.2;
    for (let k = 0; k < 5; k++) {
      const yy = y - hh * 0.05 + k * 11;
      g.beginPath();
      g.moveTo(x - hw * 0.6, yy);
      g.bezierCurveTo(x - hw * 0.2, yy - 6, x + hw * 0.2, yy + 6, x + hw * 0.6, yy);
      g.stroke();
    }
    g.fillStyle = vgrad(g, y - hh * 0.2, y + hh * 0.9, [[0, rgba(LIGHT.key, 0.25)], [1, rgba('#2a1004', 0.35)]]);
    g.fillRect(box.x, box.y, box.w, box.h);
  });
  g.restore();
  // the yoke's gilt bird-head mounts, a garnet eye in each
  for (const sx of [-1, 1]) {
    const mx = x + sx * hw * 0.62;
    const my = y - hh * 0.86;
    const mount = ell(mx, my, 6, 5);
    piece(g, mount, { x: mx - 6, y: my - 5, w: 12, h: 10 }, 'gold', '#d8a83a', { shadow: 0.4, size: 3 });
    g.fillStyle = '#9a1020';
    g.beginPath();
    g.arc(mx + sx * 1.5, my - 0.5, 1.6, 0, Math.PI * 2);
    g.fill();
    glint(g, mx - 2, my - 2, 1.8, 0.9);
  }
  // the tailpiece and bridge, then the strings over them
  const tail = rrect(x - hw * 0.5, y + hh * 0.74, hw, 6, 2);
  piece(g, tail, box, 'iron', '#3a3a40', { shadow: 0.5, size: 3 });
  const bridgeY = y + hh * 0.42;
  piece(g, rrect(x - hw * 0.55, bridgeY - 2.5, hw * 1.1, 5, 2), box, DMAT.bone, '#efe6cf', { shadow: 0.6, size: 3 });
  s.edge(rgba('#1a0a04', 0.35), 10, LX * 5, LY * 5);
  s.edge(rgba(LIGHT.rim, 0.5), 2.2, LX * 2.6, LY * 2.6);
  s.finish(inkOf('#7a4a20'), { w: 3.2 });
  // the strings and pegs over the frame (they cross its opening)
  for (const dx of LYRE_STRINGS) {
    ctx.strokeStyle = rgba('#000000', 0.4);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x + dx * 0.9 + 1, y - hh * 0.78 + 1);
    ctx.lineTo(x + dx + 1, y + hh * 0.76 + 1);
    ctx.stroke();
    ctx.strokeStyle = rgba('#f4e6c0', 0.9);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(x + dx * 0.9, y - hh * 0.78);
    ctx.lineTo(x + dx, y + hh * 0.76);
    ctx.stroke();
  }
  // tuning pegs along the yoke
  for (const dx of LYRE_STRINGS) rivet(ctx, x + dx * 0.9, y - hh * 0.9, 1.8, '#c89a5a');
  ctx.restore();
}

/** A knot of gold-thread embroidery on the vamp: an interlaced loop knot, couched in gold, a red thread beside it. */
function embroidery(g: Ctx, cx: number, cy: number, s: number, gold: string, red: string): void {
  const knot = (c: Ctx, k: number) => {
    // three interlocking loops (a triquetra) inside a ring
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const x0 = cx + Math.cos(a) * 14 * s * k;
      const y0 = cy + Math.sin(a) * 14 * s * k;
      c.moveTo(x0 + 13 * s * k, y0);
      c.ellipse(x0, y0, 13 * s * k, 13 * s * k, 0, 0, Math.PI * 2);
    }
    c.moveTo(cx + 30 * s * k, cy);
    c.ellipse(cx, cy, 30 * s * k, 30 * s * k, 0, 0, Math.PI * 2);
  };
  g.save();
  g.lineCap = 'round';
  // its shadow in the felt, then the gold, then the lit twist of the thread
  g.translate(1.2, 1.6);
  g.beginPath();
  knot(g, 1);
  g.strokeStyle = rgba('#06081a', 0.55);
  g.lineWidth = 3.6 * s;
  g.stroke();
  g.restore();
  g.save();
  g.beginPath();
  knot(g, 1);
  g.strokeStyle = gold;
  g.lineWidth = 3 * s;
  g.stroke();
  g.setLineDash([1.6, 2]);
  g.beginPath();
  knot(g, 1);
  g.strokeStyle = rgba('#fff2c0', 0.85);
  g.lineWidth = 1.1 * s;
  g.stroke();
  g.setLineDash([]);
  g.beginPath();
  g.ellipse(cx, cy, 36 * s, 36 * s, 0, 0, Math.PI * 2);
  g.strokeStyle = rgba(red, 0.85);
  g.lineWidth = 1.6 * s;
  g.setLineDash([3, 2.5]);
  g.stroke();
  g.restore();
}

function drawSkald(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  if (o.emissive || o.heat) return;
  const felt = art.primary ?? '#2a4a7a';
  const red = art.secondary ?? '#c8302a';
  const gold = '#d8a83a';
  const fox = '#c4682a';
  const flex = Math.max(0, p.curl);
  const body = skaldBody(flex);
  const locks = SKALD_LOCKS.map(([x, y, a, l, w, b]) => lockPath(x, y, a, l, w, b, 2));
  const box = { x: CX - 130, y: -10, w: 260, h: 280 };
  // a thin leather sole showing as a welt round the toe
  const sole: PathFn = (c) => {
    c.save();
    c.translate(CX, 0);
    c.scale(0.97, 1);
    c.translate(-CX, 7);
    body(c);
    c.restore();
  };
  const sil = new Sil(ctx, [sole, body, skaldCuff, ...locks], box);
  const g = sil.g;
  const r = rng(hashStr('skald'));
  within(g, sole, () => {
    g.fillStyle = vgrad(g, 200, 262, [[0, '#5a3a24'], [1, '#1a0e08']]);
    g.fillRect(box.x, 190, box.w, 80);
    texture(g, 'leather', box, 0.4, 1.3);
  });
  // the felt: soft, matte, a faint nap, gently wrinkled over the instep
  piece(g, body, box, { ...DMAT.plush, name: 'Felt', shadowTint: '#0a1028', rim: 0.35 }, felt, { shadow: 0, size: 24, texA: 0.22 });
  within(g, body, () => {
    texture(g, 'fleece', box, 0.1, 2.2, 'soft-light');
    blotches(g, box, '#0a1430', 0.3, 14, 0.55, 0.25, 501);
    blotches(g, box, '#8ab0e0', 0.12, 8, 0.66, 0.15, 503);
    // soft folds in the felt over the instep: broad shadows, no hard lines
    for (const [y, w, a] of [[100, 66, 0.3], [198, 80, 0.24]] as const) {
      softStroke(g, (c) => {
        c.moveTo(CX - w, y + 8);
        c.quadraticCurveTo(CX - w * 0.35, y - 2, CX - 14, y + 4);
        c.moveTo(CX + 16, y + 5);
        c.quadraticCurveTo(CX + w * 0.4, y, CX + w, y + 9);
      }, rgba('#06102a', a), 7, 4);
      softStroke(g, (c) => {
        c.moveTo(CX - w, y + 2);
        c.quadraticCurveTo(CX - w * 0.35, y - 8, CX - 14, y - 2);
      }, rgba('#a8c4ec', a * 0.35), 5, 4);
    }
    // the seam down the toe, whip-stitched with red wool
    crease(g, (c) => {
      c.moveTo(CX + 2, 182);
      c.bezierCurveTo(CX + 3, 190, CX + 2, 222, CX, 248 - flex * 6);
    }, 2.6, '#0a1430', 0.6, 0.3);
    g.save();
    g.lineCap = 'round';
    for (let y = 186; y < 244 - flex * 6; y += 7) {
      g.strokeStyle = rgba('#3a0806', 0.5);
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(CX - 4, y + 1);
      g.lineTo(CX + 7, y + 4);
      g.stroke();
      g.strokeStyle = rgba(mix(red, '#ff9a7a', 0.2), 0.9);
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(CX - 4.5, y);
      g.lineTo(CX + 6.5, y + 3);
      g.stroke();
    }
    g.restore();
    // the gold knot on the vamp
    embroidery(g, CX - 2, 146, 0.82, gold, red);
    // the felt's light: soft, broad
    spec(g, CX - 54, 160, 22, 50, 0.16, 0.1, '#e8f0ff');
    spec(g, CX - 34, 228 - flex * 5, 26, 9, 0.18, -0.1, '#e8f0ff');
  });
  // the tablet-woven band round the throat: a red ground, gold diamonds and edges, its twisted weave
  const bandPath: PathFn = (c) => {
    c.beginPath();
    for (let x = CX - 100; x <= CX + 100; x += 5) (x === CX - 100 ? c.moveTo(x, bandY(x) - 8) : c.lineTo(x, bandY(x) - 8));
    for (let x = CX + 100; x >= CX - 100; x -= 5) c.lineTo(x, bandY(x) + 8);
    c.closePath();
  };
  within(g, body, () => {
    softFill(g, (c) => { c.save(); c.translate(1.5, 3); bandPath(c); c.restore(); }, rgba('#06081a', 0.5), 3);
    piece(g, bandPath, { x: CX - 100, y: 54, w: 200, h: 36 }, 'canvas', red, { shadow: 0, size: 5, texA: 0.3 });
    within(g, bandPath, () => {
      g.save();
      g.lineWidth = 1.6;
      for (let x = CX - 100; x < CX + 100; x += 12) {
        const y0 = bandY(x + 6);
        // a gold diamond
        g.fillStyle = gold;
        g.beginPath();
        g.moveTo(x + 6, y0 - 5);
        g.lineTo(x + 11, y0);
        g.lineTo(x + 6, y0 + 5);
        g.lineTo(x + 1, y0);
        g.closePath();
        g.fill();
        g.fillStyle = rgba('#fff2c0', 0.6);
        g.beginPath();
        g.moveTo(x + 6, y0 - 5);
        g.lineTo(x + 8, y0 - 2);
        g.lineTo(x + 4, y0 - 2);
        g.closePath();
        g.fill();
      }
      // the twist of the tablet weave: little slanted ticks along both edges
      for (let x = CX - 100; x < CX + 100; x += 3) {
        for (const d of [-6.5, 6.5]) {
          g.strokeStyle = rgba(d < 0 ? '#fff2c0' : '#3a0806', 0.5);
          g.beginPath();
          g.moveTo(x, bandY(x) + d - 1.2);
          g.lineTo(x + 2, bandY(x) + d + 1.2);
          g.stroke();
        }
      }
      g.restore();
      g.fillStyle = vgrad(g, 56, 90, [[0, rgba(LIGHT.key, 0.2)], [0.5, rgba('#000000', 0)], [1, rgba('#1a0404', 0.35)]]);
      g.fillRect(CX - 104, 52, 208, 40);
    });
  });
  // the fox-fur cuff: rust-orange, darker at its roots, cream at the tips of its hem
  piece(g, skaldCuff, box, 'fur', fox, { shadow: 0.7, size: 16 });
  within(g, skaldCuff, () => furCoat(g, r, { x: CX - 90, y: -10, w: 180, h: 70 }, fox, 520, 13, (x) => Math.PI / 2 - ((x - CX) / 100) * 0.6, '#3a1004'));
  SKALD_LOCKS.forEach(([x, y, a, l], i) => {
    within(g, locks[i], () => {
      g.fillStyle = vgrad(g, y, y + l, [[0, fox], [0.6, mix(fox, '#f0dcc0', 0.3)], [1, '#f4e6d0']]);
      g.fillRect(x - 20, y - 4, 40, l + 8);
      furCoat(g, r, { x: x - 14, y: y - 4, w: 28, h: l + 4 }, mix(fox, '#f0dcc0', 0.35), 40, l * 0.7, () => a, '#3a1004');
    });
  });
  softStroke(g, (c) => { c.moveTo(CX - 80, 54); c.quadraticCurveTo(CX, 74, CX + 82, 54); }, rgba('#06081a', 0.4), 8, 4);
  // the lyre's braided cord, from under the cuff down to its yoke
  const [px, py] = LYRE.pivot;
  softStroke(g, (c) => { c.moveTo(px - 6, 40); c.quadraticCurveTo(px - 2, (40 + py) / 2, px, py); }, rgba('#06081a', 0.5), 4.5, 1.5);
  g.save();
  g.strokeStyle = '#8a2a1a';
  g.lineWidth = 3;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(px - 7, 38);
  g.quadraticCurveTo(px - 3, (38 + py) / 2, px - 1, py - 1);
  g.stroke();
  g.setLineDash([2, 2]);
  g.strokeStyle = rgba('#e8a060', 0.7);
  g.lineWidth = 1.2;
  g.stroke();
  g.restore();
  const fl = g.createLinearGradient(CX - 100, 0, CX + 110, 240);
  fl.addColorStop(0, rgba(LIGHT.key, 0.1));
  fl.addColorStop(0.45, rgba(LIGHT.key, 0));
  fl.addColorStop(1, rgba('#04081a', 0.35));
  g.fillStyle = fl;
  g.fillRect(box.x, box.y, box.w, box.h);
  oneLight(sil, '#04081a', 0.42, 18);
  sil.finish(inkOf(shade(felt, -0.2)), { openTop: -5, inner: 0.35 });
  if (!o.live) paintLyre(ctx);
}

registerStyle('skald', {
  contactY: 256,
  halfWidth: 104,
  rig: { from: 186, to: 204 },
  leg: { kind: 'legwrap', hw: 58, join: 'into', pattern: 'none' },
  parts: {
    lyre: { box: { x: LYRE.x - LYRE.hw - 30, y: LYRE.pivot[1] - 10, w: LYRE.hw * 2 + 60, h: LYRE.y + LYRE.hh - LYRE.pivot[1] + 30 }, frames: 1, pivot: LYRE.pivot, draw: (g) => paintLyre(g) },
  },
  draw(ctx, art, p, o) {
    drawSkald(ctx, art, p, o);
  },
});

// ════════════════════════ Dwarf-Forged Boots ════════════════════════
// A dwarf smith's boot from the forges under the mountain: short and broad, dark rune-iron hammered over thick
// leather. A rolled leather cuff with a gilt band of carved runes, three overlapping iron lames over the instep, each
// edged in gilt bronze, a great domed toe cap with a raised ridge and a row of runes that glow forge-gold, a thick
// hobnailed sole. In front, his shield: rune-iron, square-shouldered, a gilt-bronze rim, crossed iron straps and a boss
// cut with the protection rune. In play the shield is its own piece (src/game/guardShield.ts) and the runes pulse.

/** The shield's outline (design space) and its strap. */
export const DSHIELD = { top: 50, bottom: 210, hw: 92, pivot: [CX, 58] as P2 };
/** The toe cap's glowing runes: centres (the live layer throws embers off them). */
export const DWARF_RUNES: P2[] = [
  [CX - 46, 224],
  [CX, 232],
  [CX + 46, 224],
];
const RUNE_GOLD = '#ffb04a';

const dshieldPath: PathFn = (c) => {
  const { top, bottom, hw } = DSHIELD;
  c.beginPath();
  c.moveTo(CX - hw + 14, top);
  c.lineTo(CX + hw - 14, top);
  c.lineTo(CX + hw, top + 14);
  c.lineTo(CX + hw - 3, top + 96);
  c.quadraticCurveTo(CX + hw - 8, bottom - 18, CX, bottom);
  c.quadraticCurveTo(CX - hw + 8, bottom - 18, CX - hw + 3, top + 96);
  c.lineTo(CX - hw, top + 14);
  c.closePath();
};

const dwarfBody = (flex: number): PathFn => (c) => {
  const b = 256 - flex * 6;
  c.beginPath();
  c.moveTo(CX - 64, -6);
  c.bezierCurveTo(CX - 66, 40, CX - 104, 90, CX - 105, 160);
  c.bezierCurveTo(CX - 106, b - 8, CX - 70, b + 2, CX, b);
  c.bezierCurveTo(CX + 70, b + 2, CX + 108, b - 8, CX + 107, 160);
  c.bezierCurveTo(CX + 106, 90, CX + 68, 40, CX + 66, -6);
  c.closePath();
};
/** The boot's half width at design y (near enough, for the lames' ends). */
const dwHW = (y: number): number => (y < 30 ? 65 : y < 160 ? 65 + Math.sin(Math.min(1, (y - 30) / 130) * Math.PI * 0.5) * 41 : 106 - Math.pow(Math.max(0, y - 160) / 96, 3) * 36);

/** Hammered iron: many shallow dents, each lit on its far side and shaded on its near (planished). */
function planish(g: Ctx, box: Box, r: () => number, n: number, size: number): void {
  for (let i = 0; i < n; i++) {
    const x = box.x + r() * box.w;
    const y = box.y + r() * box.h;
    const s = size * (0.6 + r() * 0.7);
    ao(g, x + LX * s * 0.3, y + LY * s * 0.3, s, s * 0.8, 0.22, 0, '#000008');
    g.fillStyle = rgba('#e8eef8', 0.08);
    g.beginPath();
    g.ellipse(x - LX * s * 0.35, y - LY * s * 0.35, s * 0.6, s * 0.45, 0, 0, Math.PI * 2);
    g.fill();
  }
}

/** Gilt-bronze edging: a bright rail with a knotwork cut along it. */
function giltRail(g: Ctx, draw: (c: Ctx) => void, gold: string, w: number): void {
  softStroke(g, draw, rgba('#000000', 0.55), w + 2.5, 1.5);
  g.save();
  g.lineCap = 'round';
  g.beginPath();
  draw(g);
  g.strokeStyle = shade(gold, -0.25);
  g.lineWidth = w;
  g.stroke();
  g.beginPath();
  draw(g);
  g.strokeStyle = rgba('#fff0b8', 0.6);
  g.lineWidth = w * 0.3;
  g.translate(-0.6, -0.8);
  g.stroke();
  g.setLineDash([2.5, 3]);
  g.beginPath();
  draw(g);
  g.strokeStyle = rgba('#3a1a04', 0.55);
  g.lineWidth = w * 0.3;
  g.translate(0.6, 1.6);
  g.stroke();
  g.restore();
}

/** The rune-iron shield alone (design space). */
function paintDwarfShield(ctx: Ctx, art: FootArt): void {
  const iron = shade(art.primary ?? '#3e4450', 0.08);
  const gold = art.secondary ?? '#c8913a';
  const { top, bottom, hw } = DSHIELD;
  const box = { x: CX - hw - 6, y: top - 6, w: hw * 2 + 12, h: bottom - top + 12 };
  prop(ctx, [dshieldPath], box, (g, s) => {
    const r = rng(hashStr('dwarf-shield'));
    piece(g, dshieldPath, box, 'iron', iron, { shadow: 0, size: 22, texA: 0.4 });
    within(g, dshieldPath, () => {
      planish(g, box, r, 70, 7);
      // its face is gently domed: lit top left, falling away bottom right
      const lg = g.createLinearGradient(CX - hw, top, CX + hw, bottom);
      lg.addColorStop(0, rgba(LIGHT.key, 0.22));
      lg.addColorStop(0.45, rgba(LIGHT.key, 0));
      lg.addColorStop(1, rgba('#02040e', 0.5));
      g.fillStyle = lg;
      g.fillRect(box.x, box.y, box.w, box.h);
      // forge soot and a scorch low down
      blotches(g, box, '#0a0806', 0.35, 10, 0.6, 0.2, 521, 'multiply');
      // the crossed iron straps, riveted
      const strapV = rrect(CX - 11, top, 22, bottom - top, 2);
      const strapH = rrect(CX - hw, top + 64, hw * 2, 22, 2);
      for (const st of [strapH, strapV]) {
        piece(g, st, box, 'iron', shade(iron, -0.12), { shadow: 0.6, size: 6, texA: 0.5 });
      }
      for (let k = 0; k < 4; k++) {
        rivet(g, CX - hw + 14 + k * 18, top + 75, 3, '#8a929e');
        rivet(g, CX + hw - 14 - k * 18, top + 75, 3, '#8a929e');
      }
      for (const yy of [top + 14, top + 36, top + 112, top + 134]) rivet(g, CX, yy, 3, '#8a929e');
      // a knotwork band cut across its top, gilt in the groove
      for (let k = 0; k < 7; k++) {
        const x = CX - 72 + k * 24;
        crease(g, (c) => { c.moveTo(x, top + 18); c.quadraticCurveTo(x + 12, top + 32, x + 24, top + 18); c.moveTo(x, top + 30); c.quadraticCurveTo(x + 12, top + 16, x + 24, top + 30); }, 1.6, '#0a0c14', 0.6, 0.4);
      }
      // the boss: a domed iron disc, the protection rune cut deep and gilded
      const bx = CX;
      const by = top + 75;
      contact(g, (c) => { c.beginPath(); c.arc(bx, by, 27, 0, Math.PI * 2); c.fill(); }, 0.7, 3, 4);
      piece(g, ell(bx, by, 27, 27), box, 'iron', shade(iron, 0.1), { shadow: 0, size: 6 });
      const boss = ell(bx, by, 21, 21);
      piece(g, boss, box, 'iron', shade(iron, 0.22), { shadow: 0.5, size: 10 });
      for (let k = 0; k < 8; k++) rivet(g, bx + Math.cos((k / 8) * Math.PI * 2) * 24, by + Math.sin((k / 8) * Math.PI * 2) * 24, 2, '#c8ced8');
      glowDot(g, bx, by, 20, RUNE_GOLD, 0.35);
      carvedRune(g, 2, bx - 10, by - 13, 20, 26, '#1a0e04', RUNE_GOLD);
      spec(g, bx - 8, by - 9, 7, 5, 0.7, -0.6);
      // dents and gouges from use
      for (let k = 0; k < 5; k++) {
        const x = CX - hw + 20 + r() * (hw * 2 - 40);
        const y = top + 20 + r() * (bottom - top - 50);
        const t = r() * Math.PI;
        crease(g, (c) => { c.moveTo(x - Math.cos(t) * 9, y - Math.sin(t) * 9); c.lineTo(x + Math.cos(t) * 9, y + Math.sin(t) * 9); }, 2, '#04060c', 0.65, 0.5);
      }
    });
    // the gilt-bronze rim
    g.save();
    g.lineJoin = 'round';
    dshieldPath(g);
    g.strokeStyle = shade(gold, -0.35);
    g.lineWidth = 9;
    g.stroke();
    dshieldPath(g);
    g.strokeStyle = hgrad(g, CX - hw, CX + hw, [[0, '#f4d890'], [0.35, gold], [1, shade(gold, -0.45)]]);
    g.lineWidth = 5.5;
    g.stroke();
    g.restore();
    for (let k = 0; k < 6; k++) {
      rivet(g, CX - hw + 22 + k * ((hw * 2 - 44) / 5), top + 4.5, 2.6, '#f0d080');
    }
    for (const sx of [-1, 1]) for (const yy of [top + 30, top + 60, top + 100]) rivet(g, CX + sx * (hw - 4.5), yy, 2.6, '#f0d080');
    s.edge(rgba('#02040e', 0.4), 14, LX * 7, LY * 7);
    s.edge(rgba(LIGHT.rim, 0.6), 2.4, LX * 2.8, LY * 2.8);
  }, inkOf('#2a2014'), { w: 4.2 });
}

/** The toe cap's runes (glowing, or as cut grooves). */
function dwarfRunes(g: Ctx, flex: number, glow: boolean): void {
  DWARF_RUNES.forEach(([x, y], i) => {
    const yy = y - flex * 5;
    if (glow) {
      glowDot(g, x, yy, 18, RUNE_GOLD, 0.6);
      carvedRune(g, [3, 7, 1][i], x - 8, yy - 11, 16, 22, '#000000', RUNE_GOLD);
    } else carvedRune(g, [3, 7, 1][i], x - 8, yy - 11, 16, 22, '#0a0604');
  });
}

function drawDwarf(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const iron = art.primary ?? '#3e4450';
  const gold = art.secondary ?? '#c8913a';
  const leather = '#4a3020';
  const flex = Math.max(0, p.curl);
  const body = dwarfBody(flex);
  const box = { x: CX - 130, y: -10, w: 260, h: 290 };
  const sole: PathFn = (c) => {
    c.save();
    c.translate(CX, 0);
    c.scale(0.98, 1);
    c.translate(-CX, 10);
    body(c);
    c.restore();
  };
  const withShield = !o.noShield && !o.live;
  const parts = withShield ? [sole, body, dshieldPath] : [sole, body];
  if (o.heat) return;
  if (o.emissive) {
    glowOnly(ctx, [sole, body], box, (g) => dwarfRunes(g, flex, true));
    return;
  }
  const sil = new Sil(ctx, parts, box);
  const g = sil.g;
  const r = rng(hashStr('dwarf'));
  // the thick sole, hobnailed, its welt shod with iron
  within(g, sole, () => {
    g.fillStyle = vgrad(g, 200, 270, [[0, '#2a1c14'], [1, '#0a0604']]);
    g.fillRect(box.x, 190, box.w, 84);
    texture(g, 'leather', box, 0.4, 1.4);
    for (let i = 0; i < 13; i++) {
      const u = i / 12;
      const x = CX + (u - 0.5) * 160;
      rivet(g, x, 262.5 - Math.pow((x - CX) / 100, 2) * 12 - flex * 6, 2.5, '#9aa0a8');
    }
  });
  // the iron, hammered over the leather
  piece(g, body, box, 'iron', iron, { shadow: 0.45, size: 22, texA: 0.4 });
  within(g, body, () => {
    planish(g, box, r, 110, 6);
    blotches(g, box, '#0a0806', 0.3, 14, 0.58, 0.22, 531, 'multiply');
  });
  // the lames over the instep, each tucked under the one above
  const LAMES: [number, number][] = [[54, 32], [84, 32], [114, 32]];
  for (let i = LAMES.length - 1; i >= 0; i--) {
    const [y, h] = LAMES[i];
    const lame: PathFn = (c) => {
      const w0 = dwHW(y) + 3;
      const w1 = dwHW(y + h) + 3;
      c.beginPath();
      c.moveTo(CX - w0, y);
      c.quadraticCurveTo(CX, y + 22, CX + w0, y);
      c.lineTo(CX + w1, y + h);
      c.quadraticCurveTo(CX, y + h + 22, CX - w1, y + h);
      c.closePath();
    };
    within(g, body, () => {
      softStroke(g, (c) => { const w1 = dwHW(y + h) + 3; c.moveTo(CX - w1, y + h + 4); c.quadraticCurveTo(CX, y + h + 26, CX + w1, y + h + 4); }, rgba('#02040e', 0.55), 7, 3);
      piece(g, lame, { x: CX - 110, y, w: 220, h: h + 24 }, 'iron', shade(iron, 0.06 - i * 0.03), { shadow: 0.55, size: 10, texA: 0.45 });
      within(g, lame, () => {
        planish(g, { x: CX - 104, y, w: 208, h: h + 22 }, r, 26, 5);
        g.fillStyle = vgrad(g, y, y + h + 22, [[0, rgba('#ffffff', 0.12)], [0.5, rgba('#000000', 0)], [1, rgba('#02040e', 0.4)]]);
        g.fillRect(CX - 112, y, 224, h + 24);
      });
      giltRail(g, (c) => { const w1 = dwHW(y + h) + 3; c.moveTo(CX - w1, y + h - 1); c.quadraticCurveTo(CX, y + h + 21, CX + w1, y + h - 1); }, gold, 4.2);
      const wm = dwHW(y + h * 0.5);
      rivet(g, CX - wm + 13, y + h * 0.5 + 5, 3.4, '#9aa0a8');
      rivet(g, CX + wm - 13, y + h * 0.5 + 5, 3.4, '#9aa0a8');
    });
  }
  // the great toe cap: domed, a raised ridge down its middle like an anvil's horn, the runes across it
  const capTop = 146;
  const cap: PathFn = (c) => {
    const w0 = dwHW(capTop) + 4;
    c.beginPath();
    c.moveTo(CX - w0, capTop);
    c.quadraticCurveTo(CX, capTop + 22, CX + w0, capTop);
    c.lineTo(CX + 130, 290);
    c.lineTo(CX - 130, 290);
    c.closePath();
  };
  within(g, body, () => {
    piece(g, cap, box, 'iron', shade(iron, 0.1), { shadow: 0.65, size: 22, texA: 0.4 });
    within(g, cap, () => {
      planish(g, { x: CX - 100, y: capTop, w: 200, h: 110 }, r, 50, 6);
      const cg = g.createRadialGradient(CX - 40, 190, 10, CX, 210, 120);
      cg.addColorStop(0, rgba(LIGHT.key, 0.22));
      cg.addColorStop(0.5, rgba(LIGHT.key, 0));
      cg.addColorStop(1, rgba('#02040e', 0.45));
      g.fillStyle = cg;
      g.fillRect(box.x, capTop, box.w, 130);
      softStroke(g, (c) => { c.moveTo(CX - 3, capTop + 18); c.quadraticCurveTo(CX - 4, 210, CX - 3, 250 - flex * 6); }, rgba('#ffffff', 0.45), 4, 1.5);
      softStroke(g, (c) => { c.moveTo(CX + 5, capTop + 18); c.quadraticCurveTo(CX + 5, 210, CX + 4, 250 - flex * 6); }, rgba('#02040e', 0.5), 4, 2);
      // the runes: cut deep, the forge-light glowing up out of them (play pulses a glow layer on top)
      dwarfRunes(g, flex, false);
      g.save();
      g.globalAlpha = 0.85;
      dwarfRunes(g, flex, true);
      g.restore();
      spec(g, CX - 54, 192 - flex * 4, 22, 9, 0.5, -0.3);
      glint(g, CX - 60, 186 - flex * 4, 4, 0.8);
    });
    giltRail(g, (c) => { const w0 = dwHW(capTop) + 4; c.moveTo(CX - w0, capTop + 1); c.quadraticCurveTo(CX, capTop + 23, CX + w0, capTop + 1); }, gold, 4.6);
  });
  // the rolled leather cuff, with its gilt band of carved runes
  const cuff: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 66, -6);
    c.lineTo(CX + 68, -6);
    c.lineTo(CX + 70, 40);
    c.quadraticCurveTo(CX, 56, CX - 68, 40);
    c.closePath();
  };
  within(g, body, () => {
    softStroke(g, (c) => { c.moveTo(CX - 68, 44); c.quadraticCurveTo(CX, 62, CX + 70, 44); }, rgba('#02040e', 0.6), 8, 4);
    piece(g, cuff, box, 'leather', leather, { shadow: 0, size: 14, texA: 0.45 });
    within(g, cuff, () => {
      for (const y of [6, 30]) crease(g, (c) => { c.moveTo(CX - 66, y); c.quadraticCurveTo(CX, y + 10, CX + 68, y); }, 2.4, '#140a04', 0.55, 0.3);
      stitches(g, (c) => { c.moveTo(CX - 64, 36); c.quadraticCurveTo(CX, 50, CX + 66, 36); }, rgba('#c8a878', 0.6), 1.2, 3, 3);
    });
    const band: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 67, 10);
      c.quadraticCurveTo(CX, 20, CX + 69, 10);
      c.lineTo(CX + 69, 26);
      c.quadraticCurveTo(CX, 36, CX - 67, 26);
      c.closePath();
    };
    piece(g, band, box, 'gold', gold, { shadow: 0.6, size: 5, texA: 0.12 });
    within(g, band, () => {
      g.fillStyle = hgrad(g, CX - 68, CX + 70, [[0, rgba('#fff4c0', 0.3)], [0.3, rgba('#fff4c0', 0.45)], [0.45, rgba('#fff4c0', 0)], [1, rgba('#3a1a04', 0.55)]]);
      g.fillRect(CX - 70, 6, 142, 34);
      for (let k = 0; k < 9; k++) carvedRune(g, k, CX - 60 + k * 14, 13 + Math.cos(((k - 4) / 5) * Math.PI * 0.5) * 6, 9, 12, '#4a2a06');
    });
    rivet(g, CX - 62, 18, 3, '#f0d080');
    rivet(g, CX + 64, 18, 3, '#f0d080');
  });
  oneLight(sil, '#02040e', 0.4, 18);
  if (withShield) paintDwarfShield(g, art);
  sil.finish(inkOf(shade(iron, -0.25)), { openTop: -5, inner: 0.35 });
}

const DWARF_SHIELD: ShieldDef = {
  box: { x: CX - DSHIELD.hw - 6, y: DSHIELD.top - 6, w: DSHIELD.hw * 2 + 12, h: DSHIELD.bottom - DSHIELD.top + 12 },
  pivot: DSHIELD.pivot,
  down: { dx: -158, dy: 84, rot: 0.34, sx: 0.8 },
  material: 'bronze',
  swing: true,
  badge: 'plate',
  accent: RUNE_GOLD,
  sounds: { crack: 'sfx_dwarfblock', shatter: 'sfx_dwarfbreak' },
  draw: (g, art) => paintDwarfShield(g, art),
  path: dshieldPath,
};

registerStyle('dwarfboot', {
  contactY: 266,
  halfWidth: 108,
  rig: { from: 200, to: 218 },
  leg: { kind: 'plate', hw: 62, join: 'into', pattern: 'none' },
  shield: DWARF_SHIELD,
  draw(ctx, art, p, o) {
    drawDwarf(ctx, art, p, o);
  },
});

// ════════════════════════ Muspel Fire-Feet ════════════════════════
// A fire giant's bare foot from Muspelheim, broad and knuckled: its skin a crust of cinder plates drifting on fire,
// the flame glowing up through every seam between them (hottest at the sole), plates of crust over each toe and
// knuckle, nails of black obsidian rimmed with fire, grey ash settled on its top. A black-iron ring round the ankle
// carries Surtr's runes, burning. In play its seams pulse, flames lick up off it and embers stream away; as it drops
// the seams flare white-hot (its heat layer).

export const MUSPEL_LOOK = { nails: null, shadowTint: '#2a0a08', pores: 0, detail: 0, toe: 1.1, w: 4, ankle: 56 } as const;
/** The iron ring round the ankle: its centre line. */
export const MUSPEL_BAND = { y: 34, hw: 60 };

/** The cinder plates over the body: a jittered hex lattice (neighbours share their corners), each plate shrunk
 * from its seam by a gap that widens towards the sole (it's hotter there). */
const MUSPEL_PLATES: P2[][] = (() => {
  const R = 21;
  const w = R * Math.sqrt(3);
  const h = R * 1.5;
  const jit = new Map<string, P2>();
  const r = rng(hashStr('muspel-plates'));
  const corner = (x: number, y: number): P2 => {
    const k = `${Math.round(x * 10)},${Math.round(y * 10)}`;
    if (!jit.has(k)) jit.set(k, [x + (r() - 0.5) * R * 0.85, y + (r() - 0.5) * R * 0.85]);
    return jit.get(k)!;
  };
  const out: P2[][] = [];
  for (let j = 0; j * h < 230; j++) {
    for (let i = -1; i * w < 240; i++) {
      const cx = CX - 120 + i * w + (j % 2) * w * 0.5;
      const cy = 4 + j * h;
      const pts: P2[] = [];
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 6 + (k * Math.PI) / 3;
        pts.push(corner(cx + Math.cos(a) * R, cy + Math.sin(a) * R));
      }
      const mx = pts.reduce((s, p) => s + p[0], 0) / 6;
      const my = pts.reduce((s, p) => s + p[1], 0) / 6;
      const gap = 1.3 + Math.max(0, (my - 50) / 170) * 2.4 + r() * 0.8;
      out.push(pts.map(([x, y]) => {
        const d = Math.hypot(x - mx, y - my) || 1;
        const k = Math.max(0.3, (d - gap) / d);
        return [mx + (x - mx) * k, my + (y - my) * k] as P2;
      }));
    }
  }
  return out;
})();

/** A toe's plates in its own frame (u across −1…1, v from root −1 to tip 1): a knuckle plate and a tip plate, split
 * by a ragged seam, mapped onto the toe. */
function toePlates(t: StyleToe, seed: number): P2[][] {
  const r = rng(seed);
  const at = (u: number, v: number): P2 => {
    const x = u * t.rx;
    const y = v * t.ry;
    const c = Math.cos(t.rot);
    const s = Math.sin(t.rot);
    return [t.cx + x * c - y * s, t.cy + x * s + y * c];
  };
  const split = -0.05 + (r() - 0.5) * 0.2;
  const seam = [-1, -0.5, 0, 0.5, 1].map((u) => split + (r() - 0.5) * 0.18 + u * (r() - 0.5) * 0.1);
  const g = 0.09;
  const knuckle: P2[] = [];
  const tip: P2[] = [];
  // round the ellipse's upper half, then back along the seam
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI + (i / 10) * Math.PI;
    const u = Math.cos(a) * 0.97;
    const v = Math.sin(a) * 0.98;
    knuckle.push(at(u, Math.min(v, split - g)));
  }
  for (let i = 4; i >= 0; i--) knuckle.push(at(-0.97 + i * 0.485, seam[i] - g));
  for (let i = 0; i <= 4; i++) tip.push(at(-0.95 + i * 0.475, seam[i] + g));
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI;
    tip.push(at(Math.cos(a) * 0.95, Math.max(Math.sin(a) * 0.97, split + g)));
  }
  return [knuckle, tip];
}

/** The molten light under the crust: red at the ankle to orange-gold at the sole. */
function magmaUnder(g: Ctx, box: Box, k = 1): void {
  g.fillStyle = vgrad(g, box.y, box.y + box.h, [[0, rgba('#4a0804', k)], [0.4, rgba('#a01c06', k)], [0.78, rgba('#f0500e', k)], [1, rgba('#ffb040', k)]]);
  g.fillRect(box.x, box.y, box.w, box.h);
}

/** Paint a cinder plate: dark crust, lit along its top-left lip, cooler and greyer where the ash has settled. */
function cinderPlate(g: Ctx, pts: P2[], crust: string, r: () => number, ash: number): void {
  const path = poly(pts);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  within(g, path, () => {
    const c = shade(crust, (r() - 0.5) * 0.25);
    g.fillStyle = vgrad(g, box.y, box.y + box.h, [[0, shade(c, 0.12)], [1, shade(c, -0.2)]]);
    g.fillRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4);
    texture(g, 'stone', box, 0.5, 1.1);
    if (ash > 0) blotches(g, box, '#8a8480', ash * (0.5 + r() * 0.5), 5, 0.6, 0.25, Math.floor(r() * 1e6));
    // a hairline of heat crazing across some plates
    if (r() < 0.45) {
      const a = r() * Math.PI;
      const cx = box.x + box.w * (0.3 + r() * 0.4);
      const cy = box.y + box.h * (0.3 + r() * 0.4);
      const l = Math.max(box.w, box.h) * 0.6;
      const pts = (cc: Ctx) => { cc.moveTo(cx - Math.cos(a) * l, cy - Math.sin(a) * l); cc.lineTo(cx + (r() - 0.5) * 4, cy + (r() - 0.5) * 4); cc.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l); };
      softStroke(g, pts, rgba('#000000', 0.6), 1.8, 0.6);
      softStroke(g, pts, rgba('#ff6a1a', 0.45), 0.8, 0.8);
    }
    // the heat shows red along its lower edge, from the fire under it
    softStroke(g, (cc) => { cc.moveTo(box.x, box.y + box.h); cc.lineTo(box.x + box.w, box.y + box.h); }, rgba('#ff4a10', 0.35), 6, 4);
    // its lip: lit top left, shadowed bottom right
    g.save();
    g.translate(-LX * 1.6, -LY * 1.6);
    softStroke(g, (cc) => path(cc), rgba('#000000', 0.6), 3, 1.6);
    g.restore();
    g.save();
    g.translate(LX * 1.4, LY * 1.4);
    softStroke(g, (cc) => path(cc), rgba('#d8b8a0', 0.3), 2, 1);
    g.restore();
  });
}

/** The fire between the plates, on its own: the whole area lit, the plates cut out of it. */
function seamGlow(g: Ctx, box: Box, plates: P2[][], hot: boolean): void {
  if (hot) {
    g.fillStyle = vgrad(g, box.y, box.y + box.h, [[0, rgba('#ff8a3a', 0.4)], [0.6, rgba('#ffd27a', 0.65)], [1, rgba('#fff0c0', 0.85)]]);
  } else {
    g.fillStyle = vgrad(g, box.y, box.y + box.h, [[0, rgba('#c02008', 0.35)], [0.5, rgba('#ff5a14', 0.7)], [1, rgba('#ffd27a', 0.95)]]);
  }
  g.fillRect(box.x, box.y, box.w, box.h);
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000';
  for (const pts of plates) {
    poly(pts)(g);
    g.fill();
  }
  g.restore();
}

/** A tongue of flame licking up from (x, y): h tall, w wide (for the still art). */
const flamePath = (x: number, y: number, h: number, w: number, lean: number): PathFn => (c) => {
  c.beginPath();
  c.moveTo(x - w / 2, y);
  c.bezierCurveTo(x - w * 0.7, y - h * 0.45, x + lean * 0.4 - w * 0.1, y - h * 0.7, x + lean, y - h);
  c.bezierCurveTo(x + lean * 0.5 + w * 0.25, y - h * 0.6, x + w * 0.7, y - h * 0.4, x + w / 2, y);
  c.closePath();
};
/** Where the still art's flames lick up (the live layer emits its own from the same spots). */
export const MUSPEL_FLAMES: [number, number, number, number, number][] = [
  [CX - 90, 168, 50, 20, -12],
  [CX - 80, 112, 38, 16, -10],
  [CX + 98, 156, 46, 20, 12],
  [CX + 86, 100, 34, 15, 9],
];

function paintFlame(g: Ctx, x: number, y: number, h: number, w: number, lean: number): void {
  const p = flamePath(x, y, h, w, lean);
  g.save();
  g.globalCompositeOperation = 'lighter';
  softFill(g, p, rgba('#ff5a14', 0.5), 4);
  within(g, p, () => {
    g.fillStyle = vgrad(g, y - h, y, [[0, rgba('#ff3a0a', 0)], [0.3, rgba('#ff6a1a', 0.7)], [0.75, rgba('#ffb040', 0.9)], [1, rgba('#fff0b0', 0.95)]]);
    g.fillRect(x - w - Math.abs(lean), y - h - 2, w * 2 + Math.abs(lean) * 2, h + 4);
  });
  softFill(g, flamePath(x + lean * 0.1, y, h * 0.5, w * 0.45, lean * 0.4), rgba('#fff6d0', 0.7), 1.5);
  g.restore();
}

function drawMuspel(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const crust = art.primary ?? '#2a1c1a';
  const look = { skin: art.skin ?? '#3a2622', ...MUSPEL_LOOK };
  const f = paintBare(ctx, look, p);
  const g = f.sil.g;
  const plates = MUSPEL_PLATES;
  const tPlates = f.toes.map((t, i) => toePlates(t, hashStr('muspel-toe' + i)));
  const bodyBox = { x: f.box.x, y: -8, w: f.box.w, h: 230 };
  const band = (c: Ctx) => {
    const { y, hw } = MUSPEL_BAND;
    c.beginPath();
    c.moveTo(CX - hw, y - 10);
    c.quadraticCurveTo(CX, y - 2, CX + hw + 4, y - 10);
    c.lineTo(CX + hw + 5, y + 10);
    c.quadraticCurveTo(CX, y + 19, CX - hw - 1, y + 10);
    c.closePath();
  };
  const toePath = (t: StyleToe): PathFn => ell(t.cx, t.cy, t.rx, t.ry, t.rot);
  if (o.emissive || o.heat) {
    const hot = !!o.heat;
    // only the fire: seams, the toes' seams, the band's runes (play lays this over the body and pulses it)
    g.clearRect(-200, -200, 700, 700);
    g.save();
    // (the body's seams, but not under the toes)
    f.sil.parts.slice(0, 1).forEach((bp) => {
      within(g, bp, () => seamGlow(g, bodyBox, plates, hot));
    });
    g.restore();
    f.toes.forEach((t, i) => within(g, toePath(t), () => seamGlow(g, { x: t.cx - t.rx - 4, y: t.cy - t.ry - 4, w: t.rx * 2 + 8, h: t.ry * 2 + 8 }, tPlates[i], hot)));
    // keep the iron band dark, then its runes
    g.save();
    g.globalCompositeOperation = 'destination-out';
    band(g);
    g.fill();
    g.restore();
    for (let k = 0; k < 5; k++) {
      const x = CX - 44 + k * 22;
      carvedRune(g, [4, 1, 5, 0, 6][k], x - 5.5, MUSPEL_BAND.y - 7 + Math.cos(((k - 2) / 3) * Math.PI * 0.5) * 4, 11, 13, '#000', hot ? '#fff2c0' : '#ff8a2a');
    }
    f.sil.finish('rgba(0,0,0,0)', { w: 0.01, inner: 0 });
    return;
  }
  const r = rng(hashStr('muspel'));
  // the fire under the crust, then the plates floating on it
  magmaUnder(g, bodyBox);
  // (the ash is thickest on top, where it settles, and gone low down where the heat is)
  for (const pts of plates) {
    const my = pts.reduce((s, q) => s + q[1], 0) / pts.length;
    cinderPlate(g, pts, crust, r, Math.max(0, 1 - my / 120) * 0.45);
  }
  // the toes: the fire under each, a knuckle plate and a tip plate on it
  f.toes.forEach((t, i) => {
    const tp = toePath(t);
    const tb = { x: t.cx - t.rx - 4, y: t.cy - t.ry - 4, w: t.rx * 2 + 8, h: t.ry * 2 + 8 };
    within(g, tp, () => {
      magmaUnder(g, { x: tb.x, y: tb.y - 60, w: tb.w, h: tb.h + 60 });
      for (const pts of tPlates[i]) cinderPlate(g, pts, shade(crust, 0.05), r, 0);
      // the toe's own volume
      const tg = g.createRadialGradient(t.cx - t.rx * 0.4, t.cy - t.ry * 0.3, 2, t.cx, t.cy, t.ry * 1.2);
      tg.addColorStop(0, rgba(LIGHT.key, 0.12));
      tg.addColorStop(0.6, rgba('#000000', 0));
      tg.addColorStop(1, rgba('#000000', 0.35));
      g.fillStyle = tg;
      g.fillRect(tb.x, tb.y, tb.w, tb.h);
    });
    // the obsidian nail: a glassy black chip, the fire glowing round its rim
    const [x, y] = onToe(t, Math.PI / 2);
    const ny = y - t.ry * 0.42;
    const nail = ell(x, ny, t.rx * 0.5, t.ry * 0.22, t.rot);
    softFill(g, ell(x, ny, t.rx * 0.58, t.ry * 0.28, t.rot), rgba('#ff7a1a', 0.75), 2.5);
    within(g, nail, () => {
      g.fillStyle = vgrad(g, ny - t.ry * 0.22, ny + t.ry * 0.22, [[0, '#5a4a5a'], [0.4, '#16121a'], [1, '#3a1a10']]);
      g.fillRect(x - t.rx, ny - t.ry * 0.4, t.rx * 2, t.ry * 0.8);
    });
    spec(g, x - t.rx * 0.2, ny - t.ry * 0.1, t.rx * 0.2, t.ry * 0.08, 0.9, t.rot - 0.3);
  });
  // the clefts between the toes burn brightest
  for (let i = 0; i < f.toes.length - 1; i++) {
    const a = f.toes[i];
    const b = f.toes[i + 1];
    const mx = (a.cx + a.rx * 0.8 + b.cx - b.rx * 0.8) / 2;
    const my = Math.max(a.cy, b.cy) - 6;
    glowDot(g, mx, my, 12, '#ffb040', 0.7);
  }
  // the iron ring round the ankle, its runes burning
  const { y: by, hw: bhw } = MUSPEL_BAND;
  ao(g, CX + 2, by + 16, bhw + 4, 6, 0.6, 0, '#000000');
  piece(g, band, { x: CX - bhw - 2, y: by - 12, w: bhw * 2 + 8, h: 32 }, 'iron', '#2a2224', { shadow: 0.5, size: 6, texA: 0.5 });
  within(g, band, () => {
    g.fillStyle = vgrad(g, by - 10, by + 18, [[0, rgba('#000000', 0)], [1, rgba('#ff4a10', 0.4)]]);
    g.fillRect(CX - bhw - 4, by - 12, bhw * 2 + 12, 34);
    for (let k = 0; k < 5; k++) {
      const x = CX - 44 + k * 22;
      carvedRune(g, [4, 1, 5, 0, 6][k], x - 5.5, by - 7 + Math.cos(((k - 2) / 3) * Math.PI * 0.5) * 4, 11, 13, '#000', '#ff8a2a');
    }
    for (const sx of [-1, 1]) rivet(g, CX + sx * (bhw - 6), by + 2, 3, '#5a4a48');
  });
  // the one light, and the heat's glow rising off the sole
  const fl = g.createLinearGradient(CX - 100, 0, CX + 110, 240);
  fl.addColorStop(0, rgba(LIGHT.key, 0.08));
  fl.addColorStop(0.45, rgba(LIGHT.key, 0));
  fl.addColorStop(1, rgba('#0a0204', 0.3));
  g.fillStyle = fl;
  g.fillRect(f.box.x, f.box.y, f.box.w, f.box.h);
  f.sil.edge(rgba('#ff5a14', 0.35), 10, 0, 6);
  f.sil.edge(rgba('#0a0204', 0.4), 16, LX * 9, LY * 9);
  bareOutline(f, '#140604');
  if (!o.live) for (const [x, y, h, w, lean] of MUSPEL_FLAMES) paintFlame(ctx, x, y, h, w, lean);
}

registerStyle('muspel', {
  contactY: 262,
  halfWidth: 110,
  rig: { from: 140, to: 162 },
  leg: { kind: 'basalt', hw: 56, join: 'blend', fade: 24 },
  draw(ctx, art, p, o) {
    drawMuspel(ctx, art, p, o);
  },
});
