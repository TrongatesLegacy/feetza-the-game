// Batch D, part 4: Act 8's new Jotunheim feet, first three (Wolf-Pup Paws, Berserker Boots, Shieldmaiden Sabatons),
// drawn front-on in the style kit like every foot: one silhouette each, one light from the top left, materials.
// Their life in play: src/content/styleLive/act8a.ts. Their legs: the 'legwrap' and 'mail' leg kinds below.

import type { FootArt } from '../../data/feet';
import { CX } from '../../art/feetCommon';
import { type StyleToe, onToe } from '../../art/style/anatomy';
import { LIGHT, type PathFn, type Pose, ao, crease, glint, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil, lobe } from '../../art/style/sil';
import { type PartDef, registerStyle } from '../../art/style/registry';
import { registerLegKind, wrapTile } from '../../art/style/legs';
import { blotches, clawPath, contact, paintClaw, rivet, stitches } from '../../art/style/details';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';
import { lockPath } from './pilot-fur';
import { ell, hgrad, piece, prop, rrect, vgrad, within } from './roster-kit';
import { DMAT, LX, LY, carvedRune, glowOnly, heatRise, hoarfrost, hotLine, oneLight } from './acts-d-kit';

type Opts = { live: boolean; emissive?: boolean; heat?: boolean };
type Box = { x: number; y: number; w: number; h: number };

/** Fur strands over an area, flowing along flow(x, y), each strand's colour from col(x, y) (so a coat can change
 * colour across the foot: a dark saddle, white socks), in three passes from the undercoat to lit tips, lit from the
 * top left and falling into shadow at the bottom right. Paint it clipped to the furry part. */
function strands(g: Ctx, r: () => number, area: Box, n: number, len: number, flow: (x: number, y: number) => number, col: (x: number, y: number) => string, lw = 1): void {
  const passes: [number, number, number, number, number][] = [
    // count, length, dark, mid, light (shade amounts)
    [n, len, -0.6, -0.36, -0.16],
    [n * 0.8, len * 0.9, -0.3, 0, 0.2],
    [n * 0.4, len * 0.75, 0, 0.22, 0.48],
  ];
  g.save();
  g.lineCap = 'round';
  for (const [m, l0, d, md, lt] of passes) {
    for (let i = 0; i < m; i++) {
      const x = area.x + r() * area.w;
      const y = area.y + r() * area.h;
      const a = flow(x, y) + (r() - 0.5) * 0.42;
      const l = l0 * (0.6 + r() * 0.7);
      const k = r();
      const base = col(x, y);
      const light = k >= 0.8;
      const c = shade(base, k < 0.33 ? d : light ? lt : md);
      const sk = Math.max(0, Math.min(1, ((x - CX) / 110 + (y - 110) / 170) * 0.5 + 0.5));
      g.strokeStyle = rgba(c, (0.35 + r() * 0.45) * (light ? 1 - sk * 0.8 : 1));
      g.lineWidth = (1 + r() * 1.6) * lw;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a + 0.3) * l * 0.5, y + Math.sin(a + 0.3) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
  }
  g.restore();
}

/** A lit lump of packed snow caught in fur (inside a silhouette). */
function snowClump(g: Ctx, x: number, y: number, rr: number): void {
  ao(g, x + 1.5, y + rr * 0.7, rr * 1.2, rr * 0.5, 0.45, 0, '#0a1430');
  const sg = g.createRadialGradient(x - rr * 0.35, y - rr * 0.4, 0.5, x, y, rr);
  sg.addColorStop(0, '#ffffff');
  sg.addColorStop(0.55, '#e4f0fb');
  sg.addColorStop(1, '#93b4d6');
  g.fillStyle = sg;
  g.beginPath();
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const k = 1 + Math.sin(a * 3 + x) * 0.12;
    const px = x + Math.cos(a) * rr * k;
    const py = y + Math.sin(a) * rr * k * 0.9;
    if (i) g.lineTo(px, py);
    else g.moveTo(px, py);
  }
  g.fill();
  glint(g, x - rr * 0.4, y - rr * 0.35, Math.max(1.6, rr * 0.45), 0.9);
}

// ════════════════════════ Wolf-Pup Paws ════════════════════════
// One of Fenrir's litter: a plump, fluffy pup's paw in grey wolf fur, a darker saddle over the top, white socks over
// four round chubby toes with little pale claws, snow balled up in the fur, and a braided red cord round the ankle
// with a bronze rune tag (the giants' mark on their wolves). Fluff stands out all round its edge. In play the two
// big tufts and the tag bounce, snow and fluff fly off it when it lands, and its breath puffs.

const PUP_TOES: [number, number, number, number, number][] = [
  [CX - 71, 210, 27, 30, 0.34],
  [CX - 25, 224, 29, 32, 0.08],
  [CX + 25, 224, 29, 32, -0.08],
  [CX + 71, 210, 27, 30, -0.34],
];
/** The two big tufts at the top of the paw (sway parts): root x, y, angle, length, width, bend. */
export const PUP_TUFTS: [number, number, number, number, number, number][] = [
  [CX - 50, 34, Math.PI * 0.9, 42, 36, -0.5],
  [CX + 52, 40, Math.PI * 0.1, 38, 32, 0.5],
];
/** The rune tag's ring on the cord (its pivot). */
export const PUP_TAG: [number, number] = [CX + 20, 36];
const PUP_CORD = { y: 24, h: 13 };
/** Snow balled up in the fur: x, y, radius. */
const PUP_SNOW: [number, number, number][] = [
  [CX - 88, 168, 8],
  [CX - 40, 176, 6],
  [CX + 42, 190, 6.5],
  [CX + 86, 150, 6],
  [CX - 6, 252, 5],
  [CX + 60, 238, 4.5],
];

function pupToes(p: Pose): StyleToe[] {
  const c = Math.max(0, p.curl);
  const sp = Math.max(0, -p.curl);
  return PUP_TOES.map(([x, y, rx, ry, rot], i) => {
    const w = p.wiggle[i + 1] ?? 0;
    return { cx: x + (x - CX) * 0.08 * sp, cy: y - ry * 0.3 * c + 4 * w, rx: rx * (1 + 0.05 * c), ry: ry * (1 - 0.22 * c), rot: rot * (1 + sp * 0.5) - w * 0.06 };
  });
}

const pupBody: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 48, -6);
  c.bezierCurveTo(CX - 50, 40, CX - 94, 78, CX - 96, 140);
  c.bezierCurveTo(CX - 97, 180, CX - 88, 200, CX - 72, 206);
  c.lineTo(CX + 72, 206);
  c.bezierCurveTo(CX + 90, 200, CX + 99, 180, CX + 98, 140);
  c.bezierCurveTo(CX + 96, 78, CX + 52, 40, CX + 50, -6);
  c.closePath();
};

/** The fluff standing out along the paw's sides: many small two-pointed locks. */
function pupFringe(): { path: PathFn; x: number; y: number; ang: number; len: number }[] {
  const r = rng(hashStr('pup-fringe'));
  const out: { path: PathFn; x: number; y: number; ang: number; len: number }[] = [];
  for (const s of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const t = (i + r() * 0.4) / 6.4;
      const y = 64 + t * 130;
      const hw = 66 + Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.5) * 30;
      const ang = Math.PI / 2 - s * (1.05 - t * 0.5) + (r() - 0.5) * 0.3;
      const len = 9 + r() * 5;
      const x = CX + s * (hw - 9);
      out.push({ path: lockPath(x, y, ang, len, 22 + r() * 6, s * (0.5 + r() * 0.25), 3), x, y, ang, len });
    }
  }
  return out;
}

const pupToe = (t: StyleToe): PathFn => ell(t.cx, t.cy, t.rx, t.ry, t.rot);
const pupTuft = (i: number): PathFn => {
  const [x, y, a, l, w, b] = PUP_TUFTS[i];
  return lockPath(x, y, a, l, w, b, 3);
};
const pupTag: PathFn = (c) => {
  const [x, y] = PUP_TAG;
  c.beginPath();
  c.moveTo(x - 9, y + 8);
  c.lineTo(x + 9, y + 8);
  c.lineTo(x + 8, y + 26);
  c.lineTo(x, y + 31);
  c.lineTo(x - 8, y + 26);
  c.closePath();
};

/** The pup's coat colour at (x, y): grey, a darker saddle over the top, white socks over the toes. */
function pupCoat(fur: string, cream: string): (x: number, y: number) => string {
  const saddle = mix(shade(fur, -0.32), '#2a2838', 0.2);
  return (x, y) => {
    // the sock's ragged edge
    const edge = 150 + Math.sin(x * 0.11) * 8 + Math.sin(x * 0.037 + 1) * 10;
    const sock = Math.max(0, Math.min(1, (y - edge) / 26));
    const top = Math.max(0, Math.min(1, (90 - y) / 70)) * (1 - Math.min(1, Math.abs(x - CX) / 120) * 0.4);
    return mix(mix(fur, saddle, top), cream, sock);
  };
}

function paintPupTuft(g: Ctx, i: number, fur: string, cream: string): void {
  const [x, y, a, l] = PUP_TUFTS[i];
  const r = rng(hashStr('pup-tuft' + i));
  within(g, pupTuft(i), () => {
    const lg = g.createLinearGradient(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
    lg.addColorStop(0, shade(fur, -0.25));
    lg.addColorStop(1, mix(fur, cream, 0.35));
    g.fillStyle = lg;
    g.fillRect(x - l - 30, y - l - 30, (l + 30) * 2, (l + 30) * 2);
    strands(g, r, { x: x - l, y: y - l, w: l * 2, h: l * 2 }, 120, l * 0.75, () => a, (_x, _y) => mix(fur, cream, 0.2));
  });
}

function pupTuftPart(i: number): PartDef {
  const [x, y, a, l, w] = PUP_TUFTS[i];
  const ex = x + Math.cos(a) * l;
  const ey = y + Math.sin(a) * l;
  const pad = w + 10;
  const bx = Math.min(x, ex) - pad;
  const by = Math.min(y, ey) - pad;
  return {
    box: { x: bx, y: by, w: Math.abs(ex - x) + pad * 2, h: Math.abs(ey - y) + pad * 2 },
    frames: 1,
    pivot: [x, y],
    draw: (g, art) => {
      const s = new Sil(g, [pupTuft(i)], { x: bx, y: by, w: 120, h: 120 });
      paintPupTuft(s.g, i, art.primary ?? '#8a909c', art.secondary ?? '#efe6d4');
      s.edge(rgba('#06060e', 0.3), 8, LX * 5, LY * 5);
      s.edge(rgba(LIGHT.rim, 0.5), 2.5, LX * 3, LY * 3);
      s.finish(inkOf('#22222c'), { inner: 0.3 });
      // its root melts into the paw under it
      g.save();
      g.globalCompositeOperation = 'destination-out';
      const fg = g.createRadialGradient(x, y, 0, x, y, l * 0.55);
      fg.addColorStop(0, 'rgba(0,0,0,1)');
      fg.addColorStop(0.55, 'rgba(0,0,0,.75)');
      fg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = fg;
      g.fillRect(x - l, y - l, l * 2, l * 2);
      g.restore();
    },
  };
}

/** The bronze rune tag hanging off the cord (its own outline: it swings in play). */
function paintPupTag(ctx: Ctx): void {
  const [x, y] = PUP_TAG;
  // its ring
  ctx.save();
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = hgrad(ctx, x - 6, x + 6, [[0, '#e8c070'], [1, '#5a3a10']]);
  ctx.beginPath();
  ctx.ellipse(x, y + 3, 4.5, 5.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  prop(ctx, [pupTag], { x: x - 12, y: y + 4, w: 24, h: 30 }, (g) => {
    piece(g, pupTag, { x: x - 10, y: y + 6, w: 20, h: 26 }, DMAT.brass, '#c89040', { shadow: 0, size: 5 });
    carvedRune(g, 4, x - 4.5, y + 12, 9, 13, '#3a2008');
    spec(g, x - 4, y + 12, 4, 7, 0.55, -0.3);
  }, inkOf('#7a5018'), { w: 2.6 });
}

function drawPup(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  if (o.emissive || o.heat) return;
  const fur = art.primary ?? '#8a909c';
  const cream = art.secondary ?? '#efe6d4';
  const horn = art.nails ?? '#efe8d8';
  const toes = pupToes(p);
  const c = Math.max(0, p.curl);
  const claws = toes.map((t, i) => {
    const [x, y] = onToe(t, Math.PI / 2);
    return { x, y: y - t.ry * 0.3, ang: Math.PI / 2 - t.rot * 1.2, len: 19 * (1 + c * 0.4), w: 11, hook: (i < 2 ? 0.3 : -0.3) * (1 + c * 0.6) };
  });
  const fringe = pupFringe();
  const cord = rrect(CX - 58, PUP_CORD.y, 116, PUP_CORD.h, 6);
  const tufts = o.live ? [] : [pupTuft(0), pupTuft(1)];
  const edgeSnow = ell(PUP_SNOW[0][0] - 3, PUP_SNOW[0][1], PUP_SNOW[0][2], PUP_SNOW[0][2] * 0.9);
  const box = { x: CX - 150, y: -10, w: 300, h: 300 };
  const parts = [pupBody, ...tufts, ...fringe.map((f) => f.path), cord, edgeSnow, ...toes.map(pupToe), ...claws.map((k) => clawPath(k.x, k.y, k.ang, k.len, k.w, k.hook))];
  const sil = new Sil(ctx, parts, box);
  const g = sil.g;
  const r = rng(hashStr('pup-fur'));
  const coat = pupCoat(fur, cream);
  sil.form({ base: shade(fur, -0.05), shadowTint: '#141428', ramp: 0.9, form: 0.6, formSize: 30, bevel: 0.14, rim: 0.6 });
  // the white socks under the strands, so the fur over them reads light all through
  within(g, pupBody, () => {
    g.fillStyle = vgrad(g, 140, 196, [[0, rgba(cream, 0)], [1, rgba(shade(cream, -0.12), 0.9)]]);
    g.fillRect(box.x, 120, box.w, 100);
  });
  // the chubby toes: furred, each its own round volume, white
  toes.forEach((t) => {
    within(g, pupToe(t), () => {
      const tg = g.createRadialGradient(t.cx - t.rx * 0.35, t.cy - t.ry * 0.2, 2, t.cx, t.cy, t.ry * 1.15);
      tg.addColorStop(0, shade(cream, 0.08));
      tg.addColorStop(0.6, shade(cream, -0.12));
      tg.addColorStop(1, mix(shade(cream, -0.45), '#3a3a5a', 0.3));
      g.fillStyle = tg;
      g.fillRect(t.cx - t.rx - 2, t.cy - t.ry - 2, t.rx * 2 + 4, t.ry * 2 + 4);
      strands(g, r, { x: t.cx - t.rx, y: t.cy - t.ry, w: t.rx * 2, h: t.ry * 2 }, 150, 9, () => Math.PI / 2 - t.rot, () => cream);
    });
    lobe(g, pupToe(t), { x: t.cx - t.rx - 4, y: t.cy - t.ry - 4, w: t.rx * 2 + 8, h: t.ry * 2 + 8 }, t.cy - t.ry, t.cy - t.ry * 0.4, '#1a1a30', 0.6, 8, 0.4);
  });
  for (let i = 0; i < toes.length - 1; i++) {
    const a = toes[i];
    const b = toes[i + 1];
    const mx = (a.cx + a.rx * 0.85 + b.cx - b.rx * 0.85) / 2;
    const my = Math.max(a.cy, b.cy);
    ao(g, mx, my + 6, 9, 30, 0.85, 0, '#0a0a1a');
    softStroke(g, (cc) => { cc.moveTo(mx, my - 18); cc.quadraticCurveTo(mx + 1, my + 10, mx, my + 30); }, rgba('#0a0a1a', 0.55), 2.4, 1);
  }
  // the coat: strands flowing down and out over the body, saddle to sock
  const flow = (x: number) => Math.PI / 2 - ((x - CX) / 110) * 0.6;
  within(g, pupBody, () => strands(g, r, { x: CX - 104, y: -8, w: 208, h: 220 }, 1300, 15, flow, coat));
  // the fluff on the edges: strands running out along each lock
  for (const f of fringe) {
    within(g, f.path, () => strands(g, r, { x: f.x - f.len, y: f.y - f.len, w: f.len * 2, h: f.len * 2 }, 26, f.len * 0.75, () => f.ang, () => coat(f.x, f.y)));
  }
  // fur spilling over each toe's root
  for (const t of toes) {
    const [, ky] = onToe(t, -Math.PI / 2);
    softStroke(g, (cc) => {
      cc.moveTo(t.cx - t.rx * 0.9, ky + t.ry * 0.42);
      cc.quadraticCurveTo(t.cx, ky + t.ry * 0.58, t.cx + t.rx * 0.9, ky + t.ry * 0.42);
    }, rgba('#1a1a30', 0.45), 5, 3);
    strands(g, r, { x: t.cx - t.rx, y: ky - 4, w: t.rx * 2, h: t.ry * 0.42 }, 40, t.ry * 0.45, () => Math.PI / 2, () => cream);
  }
  // the one light over the coat: the top left catches it, the bottom right falls away
  const fl = g.createLinearGradient(CX - 100, 0, CX + 110, 240);
  fl.addColorStop(0, rgba(LIGHT.key, 0.16));
  fl.addColorStop(0.45, rgba(LIGHT.key, 0));
  fl.addColorStop(1, rgba('#08081e', 0.38));
  g.fillStyle = fl;
  g.fillRect(box.x, box.y, box.w, 280);
  for (const k of claws) paintClaw(g, k.x, k.y, k.ang, k.len, k.w, k.hook, horn, '#2a2220');
  // snow balled up in the fur
  for (const [x, y, rr] of PUP_SNOW) snowClump(g, x, y, rr);
  hoarfrost(g, { x: CX - 100, y: 150, w: 200, h: 110 }, r, 0.16, 403, 30, 0.4, 0.2);
  // the braided red cord: twisted strands, lit on top
  piece(g, cord, box, 'linen', '#a8322a', { shadow: 0.6, size: 4, texA: 0.25 });
  within(g, cord, () => {
    g.save();
    g.lineCap = 'round';
    for (let x = CX - 62; x < CX + 62; x += 6) {
      g.strokeStyle = rgba('#3a0806', 0.6);
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x, PUP_CORD.y + 1);
      g.lineTo(x + 5, PUP_CORD.y + PUP_CORD.h - 1);
      g.stroke();
      g.strokeStyle = rgba('#ff9a7a', 0.45);
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(x + 1.5, PUP_CORD.y + 1);
      g.lineTo(x + 4, PUP_CORD.y + PUP_CORD.h * 0.55);
      g.stroke();
    }
    g.restore();
  });
  // fur fluffing up over the cord's top edge
  strands(g, r, { x: CX - 58, y: PUP_CORD.y - 8, w: 116, h: 8 }, 60, 9, () => Math.PI / 2, coat);
  if (!o.live) for (let i = 0; i < PUP_TUFTS.length; i++) paintPupTuft(g, i, fur, cream);
  sil.edge(rgba('#06060e', 0.4), 18, LX * 10, LY * 10);
  sil.edge(rgba(LIGHT.rim, 0.8), 2.5, LX * 3, LY * 3);
  sil.finish(inkOf('#22222c'), { openTop: -5, inner: 0.3 });
  if (!o.live) paintPupTag(ctx);
}

registerStyle('wolfpup', {
  contactY: 258,
  halfWidth: 104,
  rig: { from: 180, to: 198 },
  leg: { kind: 'fur', hw: 50, join: 'blend', fade: 24 },
  parts: {
    tuftL: pupTuftPart(0),
    tuftR: pupTuftPart(1),
    tag: { box: { x: PUP_TAG[0] - 14, y: PUP_TAG[1] - 6, w: 28, h: 42 }, frames: 1, pivot: PUP_TAG, draw: (g) => paintPupTag(g) },
  },
  draw(ctx, art, p, o) {
    drawPup(ctx, art, p, o);
  },
});

// ════════════════════════ Berserker Boots ════════════════════════
// A berserker's soft Norse boot of dark oiled leather (a turnshoe: one seam down the vamp, hobnails round the sole),
// under a bear pelt: the pelt's shaggy brown fur wraps the top of the boot, and one
// of the bear's paws hangs down its front, claws and all. Three claw-marks of red war paint are smeared across the
// toe. His leg is wound in wool wraps, cross-gartered. Hurt it and it rages: the paint and the leather glow red hot
// (its heat layer), and it steams.

/** The bear paw hanging off the pelt (a sway part): its root. */
export const BERSERK_PAW: [number, number] = [CX - 28, 90];
/** The war paint's three claw-marks across the toe: from (x0, y0) to (x1, y1). */
export const BERSERK_PAINT: [number, number, number, number][] = [
  [CX + 64, 150, CX + 10, 236],
  [CX + 84, 166, CX + 34, 240],
  [CX + 96, 186, CX + 58, 238],
];
/** The pelt's shaggy hem: locks hanging over the boot (root x, y, angle, length, width, bend). */
const PELT_LOCKS: [number, number, number, number, number, number][] = (() => {
  const r = rng(hashStr('pelt-hem'));
  const out: [number, number, number, number, number, number][] = [];
  for (let i = 0; i < 11; i++) {
    const u = i / 10;
    const side = (u - 0.5) * 2;
    const x = CX - 84 + u * 168;
    const y = 96 + Math.pow(Math.abs(side), 1.6) * 40 + (r() - 0.5) * 6;
    // short over the front (where the paw hangs), long and ragged down the sides
    out.push([x, y, Math.PI / 2 - side * 0.08, 18 + Math.abs(side) * 14 + r() * 12, 24 + r() * 8, -side * 0.2 + (r() - 0.5) * 0.25]);
  }
  return out;
})();

const berserkBoot = (flex: number): PathFn => (c) => {
  const b = 250 - flex * 6;
  c.beginPath();
  c.moveTo(CX - 58, -6);
  c.bezierCurveTo(CX - 60, 50, CX - 94, 110, CX - 96, 168);
  c.bezierCurveTo(CX - 97, b - 10, CX - 56, b + 2, CX, b);
  c.bezierCurveTo(CX + 56, b + 2, CX + 99, b - 10, CX + 98, 168);
  c.bezierCurveTo(CX + 96, 110, CX + 62, 50, CX + 60, -6);
  c.closePath();
};

/** The bear pelt round the top: wider than the boot, shaggy at the sides. */
const pelt: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 60, -6);
  c.bezierCurveTo(CX - 64, 26, CX - 104, 50, CX - 104, 100);
  // down the boot's sides, the hem sweeping up to the front
  c.bezierCurveTo(CX - 104, 122, CX - 98, 140, CX - 90, 152);
  c.bezierCurveTo(CX - 70, 112, CX - 30, 100, CX, 98);
  c.bezierCurveTo(CX + 30, 100, CX + 72, 112, CX + 92, 152);
  c.bezierCurveTo(CX + 100, 140, CX + 106, 122, CX + 106, 100);
  c.bezierCurveTo(CX + 106, 50, CX + 66, 26, CX + 62, -6);
  c.closePath();
};
const peltLock = (i: number): PathFn => {
  const [x, y, a, l, w, b] = PELT_LOCKS[i];
  return lockPath(x, y, a, l, w, b, 2);
};

/** The bear's paw: a furry lobe hanging from its root, its four dark claws pointing down. */
function bearPaw(): { body: PathFn; pad: PathFn; claws: { x: number; y: number; ang: number; len: number; w: number; hook: number }[] } {
  const [x, y] = BERSERK_PAW;
  const body: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 18, y - 4);
    c.bezierCurveTo(x - 24, y + 34, x - 36, y + 62, x - 32, y + 82);
    c.bezierCurveTo(x - 24, y + 98, x + 24, y + 98, x + 32, y + 82);
    c.bezierCurveTo(x + 36, y + 62, x + 24, y + 34, x + 18, y - 4);
    c.closePath();
  };
  const pad: PathFn = ell(x, y + 78, 22, 13);
  const claws = [-22, -8, 8, 22].map((dx, i) => ({ x: x + dx, y: y + 90 - Math.abs(dx) * 0.3, ang: Math.PI / 2 + dx * 0.014, len: 30 - Math.abs(dx) * 0.2, w: 9.5, hook: i < 2 ? 0.28 : -0.28 }));
  return { body, pad, claws };
}

/** The paw's fur: a shade warmer and lighter than the pelt, so it reads against it. */
const pawFur = (bear: string): string => mix(bear, '#9a6a40', 0.4);

function paintBearPaw(g: Ctx, fur: string, horn: string): void {
  const [x, y] = BERSERK_PAW;
  const pw = bearPaw();
  const r = rng(hashStr('bear-paw'));
  piece(g, pw.body, { x: x - 36, y: y - 4, w: 72, h: 100 }, 'fur', fur, { shadow: 0.7, size: 12 });
  within(g, pw.body, () => {
    strands(g, r, { x: x - 36, y: y - 6, w: 72, h: 102 }, 340, 12, () => Math.PI / 2, (_x, yy) => mix(fur, '#c89a6a', Math.max(0, (yy - y) / 220)));
    ao(g, x, y + 2, 26, 9, 0.55, 0, '#0a0604');
    // a dark rim round its edge, so it stands off the pelt behind it
    softStroke(g, (c) => pw.body(c), rgba('#120a04', 0.6), 6, 3);
  });
  // the four knuckles at its end, then the claws
  for (const [dx, rr] of [[-21, 9], [-7, 10], [7, 10], [21, 9]] as const) {
    const kp = ell(x + dx, y + 84 - Math.abs(dx) * 0.3, rr, rr * 0.85);
    piece(g, kp, { x: x + dx - rr, y: y + 74 - rr, w: rr * 2, h: rr * 2 }, 'fur', shade(fur, 0.05), { shadow: 0.5, size: 4 });
    within(g, kp, () => strands(g, r, { x: x + dx - rr, y: y + 72, w: rr * 2, h: rr * 2 }, 30, 6, () => Math.PI / 2, () => fur));
  }
  for (const k of pw.claws) paintClaw(g, k.x, k.y, k.ang, k.len, k.w, k.hook, horn, '#1a120a');
}

function paintPeltLocks(g: Ctx, r: () => number, fur: string, tips: string): void {
  PELT_LOCKS.forEach(([x, y, a, l], i) => {
    within(g, peltLock(i), () => {
      const lg = g.createLinearGradient(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
      lg.addColorStop(0, shade(fur, -0.2));
      lg.addColorStop(1, mix(fur, tips, 0.4));
      g.fillStyle = lg;
      g.fillRect(x - l - 20, y - 20, (l + 20) * 2, l + 40);
      strands(g, r, { x: x - l, y: y - 6, w: l * 2, h: l + 8 }, 50, l * 0.8, () => a, () => mix(fur, tips, 0.3));
    });
  });
}

function drawBerserker(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const leather = art.primary ?? '#4e3424';
  const bear = art.secondary ?? '#5a3e2a';
  const paint = '#b0261a';
  const horn = art.nails ?? '#d8c8a8';
  const flex = Math.max(0, p.curl);
  const boot = berserkBoot(flex);
  // the sole: the boot's own outline dropped a little, so it shows as a thin dark welt round the toe
  const sole: PathFn = (c) => {
    c.save();
    c.translate(CX, 0);
    c.scale(0.97, 1);
    c.translate(-CX, 9);
    boot(c);
    c.restore();
  };
  const box = { x: CX - 140, y: -10, w: 280, h: 290 };
  const locks = PELT_LOCKS.map((_, i) => peltLock(i));
  const pw = bearPaw();
  const pawParts = o.live ? [] : [pw.body, ...pw.claws.map((k) => clawPath(k.x, k.y, k.ang, k.len, k.w, k.hook))];
  const parts = [sole, boot, pelt, ...locks, ...pawParts];
  if (o.emissive) return;
  if (o.heat) {
    // rage: the war paint burns, heat climbs the leather from the sole, the pelt's edge smoulders
    glowOnly(ctx, parts, box, (g, s) => {
      heatRise(g, box, 110, 268, 421, '#ff2a12', 0.6);
      for (const [x0, y0, x1, y1] of BERSERK_PAINT) hotLine(g, (c) => { c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2 + 6, (y0 + y1) / 2, x1, y1); }, '#ff3a1a', 5);
      s.edge(rgba('#ff4a1a', 0.7), 7, 0, 0);
    });
    return;
  }
  const sil = new Sil(ctx, parts, box);
  const g = sil.g;
  const r = rng(hashStr('berserk'));
  // the sole: dark hard leather, hobnailed
  within(g, sole, () => {
    g.fillStyle = vgrad(g, 196, 266, [[0, '#2a1c14'], [1, '#0e0806']]);
    g.fillRect(box.x, 186, box.w, 84);
    texture(g, 'leather', box, 0.4, 1.4);
    for (let i = 0; i < 11; i++) {
      const u = i / 10;
      const x = CX + (u - 0.5) * 132;
      rivet(g, x, 256.5 - Math.pow((x - CX) / 96, 2) * 16 - flex * 6, 2.2, '#8a8a90');
    }
  });
  // the oiled leather, its seam down the vamp, wrinkles where it bends
  piece(g, boot, box, 'leather', leather, { shadow: 0.4, size: 20, texA: 0.4 });
  within(g, boot, () => {
    blotches(g, box, '#140a06', 0.35, 16, 0.55, 0.2, 431);
    blotches(g, box, '#8a6a4a', 0.18, 8, 0.66, 0.1, 433);
    const seam = (c: Ctx) => {
      c.moveTo(CX + 2, 110);
      c.bezierCurveTo(CX + 4, 160, CX + 2, 210, CX, 246 - flex * 6);
    };
    crease(g, seam, 3, '#120804', 0.7, 0.35);
    stitches(g, (c) => {
      c.moveTo(CX - 4, 114);
      c.bezierCurveTo(CX - 2, 160, CX - 4, 210, CX - 6, 242 - flex * 6);
    }, rgba('#c8a878', 0.7), 1.2, 3, 3);
    stitches(g, (c) => {
      c.moveTo(CX + 8, 114);
      c.bezierCurveTo(CX + 10, 160, CX + 8, 210, CX + 6, 242 - flex * 6);
    }, rgba('#c8a878', 0.55), 1.2, 3, 3);
    // the instep's wrinkles, and the toe's
    for (const [y, w, a] of [[128, 70, 0.5], [146, 82, 0.45], [214, 60, 0.3]] as const) {
      crease(g, (c) => {
        c.moveTo(CX - w, y + 6);
        c.quadraticCurveTo(CX - w * 0.3, y - 4, CX - 10, y + 2);
        c.moveTo(CX + 12, y + 3);
        c.quadraticCurveTo(CX + w * 0.4, y - 3, CX + w, y + 7);
      }, 2.4, '#120804', a, 0.3);
    }
    spec(g, CX - 54, 170, 22, 46, 0.32, 0.1);
    spec(g, CX - 32, 228 - flex * 5, 28, 9, 0.4, -0.1);
    // the war paint: three claw-marks smeared on with the fingers, dry and cracked where the leather bends
    for (const [x0, y0, x1, y1] of BERSERK_PAINT) {
      const stroke = (c: Ctx) => {
        c.moveTo(x0, y0);
        c.quadraticCurveTo((x0 + x1) / 2 + 6, (y0 + y1) / 2, x1, y1);
      };
      softStroke(g, stroke, rgba('#3a0604', 0.35), 11, 3);
      g.save();
      g.lineCap = 'round';
      g.strokeStyle = vgrad(g, y0, y1, [[0, rgba(paint, 0.95)], [0.75, rgba(paint, 0.85)], [1, rgba(paint, 0.3)]]);
      g.lineWidth = 8;
      g.beginPath();
      stroke(g);
      g.stroke();
      g.strokeStyle = rgba('#ff7a5a', 0.35);
      g.lineWidth = 2;
      g.translate(-1.5, -1);
      g.beginPath();
      stroke(g);
      g.stroke();
      g.restore();
    }
    blotches(g, { x: CX, y: 140, w: 110, h: 110 }, shade(leather, -0.1), 0.6, 3, 0.66, 0.08, 437);
  });
  // the bear pelt: dark brown fur with lighter tips, strands flowing down and out from the top
  piece(g, pelt, box, 'fur', bear, { shadow: 0.7, size: 22 });
  const tips = mix(bear, '#d8b07a', 0.45);
  within(g, pelt, () => strands(g, r, { x: CX - 112, y: -10, w: 224, h: 165 }, 1100, 17, (x) => Math.PI / 2 - ((x - CX) / 110) * 0.7, (_x, y) => mix(bear, tips, Math.max(0, (y - 40) / 140))));
  paintPeltLocks(g, r, bear, tips);
  softStroke(g, (c) => { c.moveTo(CX - 98, 160); c.bezierCurveTo(CX - 70, 122, CX - 30, 110, CX, 108); c.bezierCurveTo(CX + 30, 110, CX + 72, 122, CX + 100, 160); }, rgba('#0a0604', 0.45), 10, 5);
  const fl = g.createLinearGradient(CX - 100, 0, CX + 110, 240);
  fl.addColorStop(0, rgba(LIGHT.key, 0.14));
  fl.addColorStop(0.45, rgba(LIGHT.key, 0));
  fl.addColorStop(1, rgba('#0a0408', 0.4));
  g.fillStyle = fl;
  g.fillRect(box.x, box.y, box.w, 290);
  // the paw's shadow on the leather (it hangs a little off the boot)
  ao(g, BERSERK_PAW[0] + 4, BERSERK_PAW[1] + 100, 30, 8, 0.45, 0, '#0a0604');
  if (!o.live) {
    paintBearPaw(g, pawFur(bear), horn);
    // its root grows out of the pelt: the pelt's fur falls over it
    const [px, py] = BERSERK_PAW;
    strands(g, rng(hashStr('paw-root')), { x: px - 30, y: py - 14, w: 60, h: 16 }, 90, 14, () => Math.PI / 2, () => mix(bear, tips, 0.3));
  }
  oneLight(sil, '#0a0406', 0.4, 18);
  sil.finish(inkOf(leather), { openTop: -5 });
}

function bearPawPart(): PartDef {
  const [x, y] = BERSERK_PAW;
  const box = { x: x - 42, y: y - 8, w: 84, h: 140 };
  return {
    box,
    frames: 1,
    pivot: [x, y],
    draw: (g, art) => {
      const pw = bearPaw();
      const s = new Sil(g, [pw.body, ...pw.claws.map((k) => clawPath(k.x, k.y, k.ang, k.len, k.w, k.hook))], box);
      paintBearPaw(s.g, pawFur(art.secondary ?? '#5a3e2a'), art.nails ?? '#d8c8a8');
      s.edge(rgba('#0a0406', 0.35), 8, LX * 5, LY * 5);
      s.edge(rgba(LIGHT.rim, 0.45), 2.5, LX * 3, LY * 3);
      s.finish(inkOf('#2a1a10'), { inner: 0.3 });
      // its root melts into the pelt
      g.save();
      g.globalCompositeOperation = 'destination-out';
      const fg = g.createLinearGradient(0, y - 8, 0, y + 10);
      fg.addColorStop(0, 'rgba(0,0,0,1)');
      fg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = fg;
      g.fillRect(box.x, y - 8, box.w, 18);
      g.restore();
    },
  };
}

registerStyle('berserker', {
  contactY: 263,
  halfWidth: 106,
  rig: { from: 186, to: 204 },
  leg: { kind: 'legwrap', hw: 58, join: 'into', pattern: 'none' },
  parts: { paw: bearPawPart() },
  draw(ctx, art, p, o) {
    drawBerserker(ctx, art, p, o);
  },
});

// ════════════════════════ Shieldmaiden Sabatons ════════════════════════
// A shieldmaiden's armoured shoe: a mail skirt over the ankle, then steel lames overlapping down the foot, each with
// a lit rolled edge and a brass rivet at its ends, down to a domed toe cap with a knotwork band and a central ridge.
// At her left (lit) side a round linden shield, painted in a whirl of deep blue and bone white, an iron boss and a
// raw-hide rim, scarred from use. In play the shield swings on its strap and snaps out to turn a smack aside.

/** The shield: its centre, radii and the strap it hangs and turns on. */
export const SHIELD = { x: CX - 90, y: 162, rx: 54, ry: 62, pivot: [CX - 62, 122] as [number, number] };

const sabaton = (flex: number): PathFn => (c) => {
  const b = 256 - flex * 6;
  c.beginPath();
  c.moveTo(CX - 58, -6);
  c.bezierCurveTo(CX - 60, 50, CX - 96, 104, CX - 98, 166);
  c.bezierCurveTo(CX - 101, b - 10, CX - 72, b + 1, CX, b);
  c.bezierCurveTo(CX + 72, b + 1, CX + 103, b - 10, CX + 100, 166);
  c.bezierCurveTo(CX + 98, 104, CX + 62, 50, CX + 60, -6);
  c.closePath();
};
/** The sabaton's half width at design y (near enough, for the lames' ends). */
const sabHW = (y: number): number => (y < 40 ? 60 : y < 166 ? 60 + Math.sin(Math.min(1, (y - 40) / 126) * Math.PI * 0.5) * 39 : 99 - Math.pow(Math.max(0, y - 166) / 90, 3) * 40);

/** The mail skirt over the ankle: a scalloped hem. */
const mailSkirt: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 62, -6);
  c.bezierCurveTo(CX - 66, 20, CX - 82, 40, CX - 86, 58);
  // the hem: a scallop per ring-row, bowed down over the instep like the lames under it
  for (let i = 0; i < 11; i++) {
    const x0 = CX - 86 + (i * 174) / 11;
    const x1 = CX - 86 + ((i + 1) * 174) / 11;
    const bow = (u: number) => 58 + Math.sin(u * Math.PI) * 12;
    c.quadraticCurveTo((x0 + x1) / 2, bow((i + 0.5) / 11) + 9, x1, bow((i + 1) / 11));
  }
  c.bezierCurveTo(CX + 84, 40, CX + 68, 20, CX + 64, -6);
  c.closePath();
};

/** Mail: rows of little riveted rings, lit from the top left (paint inside a clip). */
function mail(g: Ctx, box: Box, steel: string): void {
  g.fillStyle = shade(steel, -0.62);
  g.fillRect(box.x, box.y, box.w, box.h);
  g.save();
  g.lineWidth = 1.6;
  const sx = 7;
  const sy = 4.6;
  for (let j = 0; j * sy < box.h + sy; j++) {
    const y = box.y + j * sy;
    for (let i = -1; i * sx < box.w + sx; i++) {
      const x = box.x + i * sx + (j % 2) * sx * 0.5;
      g.strokeStyle = rgba(shade(steel, -0.15), 0.95);
      g.beginPath();
      g.ellipse(x, y, 3.6, 2.7, 0, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = rgba('#ffffff', 0.5);
      g.beginPath();
      g.ellipse(x, y, 3.6, 2.7, 0, Math.PI * 1.05, Math.PI * 1.55);
      g.stroke();
    }
  }
  g.restore();
}

/** One steel lame across the foot from y to y + h: bowed down in the middle, lit along its rolled top edge. */
const lamePath = (y: number, h: number): PathFn => (c) => {
  const w0 = sabHW(y) + 3;
  const w1 = sabHW(y + h) + 3;
  c.beginPath();
  c.moveTo(CX - w0, y);
  c.quadraticCurveTo(CX, y + 30, CX + w0, y);
  c.lineTo(CX + w1, y + h);
  c.quadraticCurveTo(CX, y + h + 30, CX - w1, y + h);
  c.closePath();
};
const LAMES: [number, number][] = [
  [52, 30],
  [78, 30],
  [104, 30],
  [130, 30],
  [156, 30],
];

/** The shield's outline (an ellipse: it's turned a little towards us). */
const shieldPath: PathFn = ell(SHIELD.x, SHIELD.y, SHIELD.rx, SHIELD.ry, -0.08);

/** Paint the shield on its own (it has its own outline and swings as a part in play). */
function paintShield(ctx: Ctx, art: FootArt): void {
  const { x, y, rx, ry } = SHIELD;
  const blue = art.legAccent ?? '#2a4f86';
  const bone = '#e9dfc6';
  const box = { x: x - rx - 8, y: y - ry - 8, w: rx * 2 + 16, h: ry * 2 + 16 };
  prop(ctx, [shieldPath], box, (g, s) => {
    const r = rng(hashStr('shield'));
    // the painted face: a whirl of four curved blades, blue and bone, over linden planks
    within(g, shieldPath, () => {
      g.fillStyle = bone;
      g.fillRect(box.x, box.y, box.w, box.h);
      g.save();
      g.translate(x, y);
      g.scale(rx / 58, ry / 58);
      for (let i = 0; i < 4; i++) {
        g.save();
        g.rotate((i * Math.PI) / 2 + 0.3);
        g.beginPath();
        g.moveTo(0, 0);
        g.bezierCurveTo(30, -6, 52, 14, 62, 40);
        g.lineTo(80, 0);
        g.lineTo(62, -40);
        g.bezierCurveTo(44, -22, 20, -20, 0, 0);
        g.closePath();
        g.fillStyle = i % 2 ? blue : mix(blue, '#1a2a4a', 0.35);
        g.fill();
        g.restore();
      }
      g.restore();
      // planks under the paint, the paint worn through along them
      g.save();
      g.strokeStyle = rgba('#3a2410', 0.35);
      g.lineWidth = 1.2;
      for (let k = -3; k <= 3; k++) {
        g.beginPath();
        g.moveTo(x + k * 15, y - ry);
        g.lineTo(x + k * 15 + 3, y + ry);
        g.stroke();
      }
      g.restore();
      texture(g, 'wood', box, 0.35, 1.2, 'soft-light');
      blotches(g, box, '#b08858', 0.45, 6, 0.66, 0.08, 451);
      blotches(g, box, '#1a1008', 0.25, 12, 0.6, 0.2, 453, 'multiply');
      // its dome of light: lit top left, falling off bottom right
      const lg = g.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
      lg.addColorStop(0, rgba(LIGHT.key, 0.28));
      lg.addColorStop(0.5, rgba(LIGHT.key, 0));
      lg.addColorStop(1, rgba('#06081a', 0.45));
      g.fillStyle = lg;
      g.fillRect(box.x, box.y, box.w, box.h);
      // sword cuts in the face
      for (let k = 0; k < 4; k++) {
        const a = r() * Math.PI * 2;
        const d = 18 + r() * 22;
        const cx = x + Math.cos(a) * d;
        const cy = y + Math.sin(a) * d;
        const t = r() * Math.PI;
        crease(g, (c) => { c.moveTo(cx - Math.cos(t) * 8, cy - Math.sin(t) * 8); c.lineTo(cx + Math.cos(t) * 8, cy + Math.sin(t) * 8); }, 1.8, '#2a1808', 0.7, 0.4);
      }
    });
    // the raw-hide rim, stitched on
    g.save();
    g.lineWidth = 7;
    g.strokeStyle = '#8a6a42';
    shieldPath(g);
    g.stroke();
    g.lineWidth = 2;
    g.strokeStyle = rgba('#e0c090', 0.6);
    g.beginPath();
    g.ellipse(x - 1, y - 1, rx - 2, ry - 2, -0.08, Math.PI * 0.85, Math.PI * 1.6);
    g.stroke();
    g.restore();
    stitches(g, (c) => c.ellipse(x, y, rx - 5.5, ry - 5.5, -0.08, 0, Math.PI * 2), rgba('#3a2410', 0.7), 1.2, 3, 4);
    // nicks in the rim
    for (const a of [0.6, 2.3, 4.1]) {
      const px = x + Math.cos(a) * rx;
      const py = y + Math.sin(a) * ry;
      softFill(g, ell(px, py, 4, 3, a), rgba('#2a1808', 0.8), 0.6);
    }
    // the iron boss: a dome with a flange of four rivets
    const boss = ell(x + 2, y, 16, 17);
    contact(g, (c) => { c.beginPath(); c.ellipse(x + 2, y, 20, 21, 0, 0, Math.PI * 2); c.fill(); }, 0.6, 3, 4);
    piece(g, ell(x + 2, y, 21, 22), { x: x - 19, y: y - 22, w: 42, h: 44 }, 'iron', '#5a6270', { shadow: 0, size: 5 });
    for (const a of [0.8, 2.4, 3.9, 5.5]) rivet(g, x + 2 + Math.cos(a) * 18, y + Math.sin(a) * 19, 2.2, '#a8b0bc');
    piece(g, boss, { x: x - 14, y: y - 17, w: 32, h: 34 }, 'iron', '#7a8494', { shadow: 0.5, size: 8 });
    spec(g, x - 4, y - 7, 7, 5, 0.85, -0.6);
    glint(g, x - 5, y - 8, 4, 0.9);
    // rime along its top
    hoarfrost(g, { x: x - rx, y: y - ry, w: rx * 2, h: ry * 0.6 }, r, 0.3, 457, 16, 0.1, 0.5);
    s.edge(rgba('#06081a', 0.35), 12, LX * 6, LY * 6);
    s.edge(rgba(LIGHT.rim, 0.55), 2.2, LX * 2.6, LY * 2.6);
  }, inkOf('#3a2a1a'), { w: 4 });
}

function drawShieldmaiden(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  if (o.emissive || o.heat) return;
  const steel = art.primary ?? '#a9b4c2';
  const brass = art.secondary ?? '#c89a3a';
  const flex = Math.max(0, p.curl);
  const body = sabaton(flex);
  const box = { x: CX - 130, y: -10, w: 260, h: 280 };
  const sil = new Sil(ctx, [body, mailSkirt], box);
  const g = sil.g;
  // the toe cap: polished steel, a cold sky in it, a lit ridge down its middle
  const cap = (c: Ctx) => {
    const y0 = 180;
    const w0 = sabHW(y0) + 4;
    c.beginPath();
    c.moveTo(CX - w0, y0);
    c.quadraticCurveTo(CX, y0 + 30, CX + w0, y0);
    c.lineTo(CX + 120, 280);
    c.lineTo(CX - 120, 280);
    c.closePath();
  };
  piece(g, body, box, 'chrome', steel, { shadow: 0, size: 26, texA: 0.12 });
  within(g, body, () => {
    // the sky (cold blue) on its upper planes, the snowfield (pale) on the lower, a dark horizon between
    g.fillStyle = vgrad(g, 40, 260, [[0, rgba('#bcd8f4', 0.35)], [0.55, rgba('#1a2a40', 0.25)], [0.62, rgba('#e8f0f8', 0.28)], [1, rgba('#8aa0b8', 0.1)]]);
    g.fillRect(box.x, 40, box.w, 230);
  });
  // the lames, top down (each lower one tucked under the one above: its top edge is in the upper's shadow)
  for (let i = LAMES.length - 1; i >= 0; i--) {
    const [y, h] = LAMES[i];
    const lp = lamePath(y, h);
    // the shadow it casts on the lame below it
    within(g, body, () => softStroke(g, (c) => { const w1 = sabHW(y + h) + 3; c.moveTo(CX - w1, y + h + 4); c.quadraticCurveTo(CX, y + h + 34, CX + w1, y + h + 4); }, rgba('#06081a', 0.5), 6, 3));
    within(g, body, () => {
      piece(g, lp, { x: CX - 104, y, w: 208, h: h + 14 }, 'chrome', shade(steel, -i * 0.03), { shadow: 0.55, size: 10, texA: 0.14 });
      within(g, lp, () => {
        // its rolled edge: a bright lip along the top and the dark turn just under it
        softStroke(g, (c) => { const w0 = sabHW(y) + 3; c.moveTo(CX - w0, y + 2.5); c.quadraticCurveTo(CX, y + 32.5, CX + w0, y + 2.5); }, rgba('#ffffff', 0.7), 2.6, 0.8);
        softStroke(g, (c) => { const w0 = sabHW(y) + 3; c.moveTo(CX - w0, y + 6); c.quadraticCurveTo(CX, y + 36, CX + w0, y + 6); }, rgba('#0a1020', 0.35), 2, 1);
        // the sky's streak across it
        spec(g, CX - 44, y + h * 0.55 + 8, 30, 4, 0.5, 0.22, '#e8f4ff');
        // each lame turns away at its lower edge
        g.fillStyle = vgrad(g, y + 4, y + h + 16, [[0, rgba('#ffffff', 0.12)], [0.55, rgba('#000000', 0)], [1, rgba('#0a1020', 0.38)]]);
        g.fillRect(CX - 110, y, 220, h + 20);
        // brass edging along the bottom
        softStroke(g, (c) => { const w1 = sabHW(y + h) + 3; c.moveTo(CX - w1, y + h - 1.5); c.quadraticCurveTo(CX, y + h + 28.5, CX + w1, y + h - 1.5); }, rgba(brass, 0.95), 3.2, 0.3);
        blotches(g, { x: CX - 104, y, w: 208, h: h + 14 }, '#6a3a1a', 0.3, 5, 0.66, 0.1, 461 + i, 'multiply');
      });
      // a brass rivet at each end, where it turns on the next
      const w0 = sabHW(y + h * 0.5);
      rivet(g, CX - w0 + 12, y + h * 0.5 + 4, 3.2, brass);
      rivet(g, CX + w0 - 12, y + h * 0.5 + 4, 3.2, brass);
    });
  }
  // the toe cap
  within(g, body, () => {
    piece(g, cap, box, 'chrome', shade(steel, 0.04), { shadow: 0.6, size: 18, texA: 0.12 });
    within(g, cap, () => {
      g.fillStyle = vgrad(g, 176, 260, [[0, rgba('#bcd8f4', 0.3)], [0.5, rgba('#1a2a40', 0.2)], [0.6, rgba('#e8f0f8', 0.3)], [1, rgba('#1a2a40', 0.25)]]);
      g.fillRect(box.x, 176, box.w, 90);
      // the ridge down its middle
      softStroke(g, (c) => { c.moveTo(CX - 2, 192); c.quadraticCurveTo(CX - 3, 230, CX - 2, 254 - flex * 6); }, rgba('#ffffff', 0.75), 3, 1.2);
      softStroke(g, (c) => { c.moveTo(CX + 4, 192); c.quadraticCurveTo(CX + 4, 230, CX + 3, 254 - flex * 6); }, rgba('#0a1020', 0.4), 3, 1.5);
      // a knotwork band engraved round it, gilt in the grooves
      // an etched band round it: two engraved lines, a row of punched dots between
      const bandY = (x: number, d: number) => 206 + d - Math.pow((x - CX) / 90, 2) * 16 + Math.cos(((x - CX) / 100) * Math.PI * 0.5) * 12;
      for (const d of [0, 10]) crease(g, (c) => { for (let x = CX - 92; x <= CX + 92; x += 4) (x === CX - 92 ? c.moveTo(x, bandY(x, d)) : c.lineTo(x, bandY(x, d))); }, 1.6, '#141824', 0.7, 0.5);
      for (let x = CX - 84; x <= CX + 84; x += 8) {
        g.fillStyle = rgba('#141824', 0.6);
        g.beginPath();
        g.arc(x, bandY(x, 5), 1.4, 0, Math.PI * 2);
        g.fill();
      }
      spec(g, CX - 46, 222 - flex * 5, 24, 10, 0.75, -0.25, '#ffffff');
      glint(g, CX - 54, 216 - flex * 5, 5, 0.85);
    });
  });
  // the mail skirt over the ankle, the lames' top tucked under it
  ao(g, CX, 70, 86, 10, 0.6, 0, '#06081a');
  within(g, mailSkirt, () => {
    mail(g, { x: CX - 90, y: -10, w: 180, h: 90 }, steel);
    const mg = g.createLinearGradient(CX - 80, 0, CX + 80, 70);
    mg.addColorStop(0, rgba(LIGHT.key, 0.22));
    mg.addColorStop(0.5, rgba(LIGHT.key, 0));
    mg.addColorStop(1, rgba('#06081a', 0.5));
    g.fillStyle = mg;
    g.fillRect(CX - 92, -10, 184, 90);
    // the skirt's folds: soft dark runs down the rings
    for (const x of [CX - 50, CX - 14, CX + 26, CX + 60]) softStroke(g, (c) => { c.moveTo(x, 0); c.quadraticCurveTo(x + (x - CX) * 0.2, 40, x + (x - CX) * 0.3, 74); }, rgba('#06081a', 0.35), 8, 5);
  });
  // scratches and frost on the steel
  within(g, body, () => {
    const r = rng(hashStr('sab-scratch'));
    g.save();
    g.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const x = CX - 90 + r() * 180;
      const y = 60 + r() * 190;
      const a = (r() - 0.5) * 1.2;
      const l = 4 + r() * 9;
      g.strokeStyle = rgba(r() < 0.5 ? '#ffffff' : '#1a2030', 0.35);
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    g.restore();
    hoarfrost(g, { x: CX - 100, y: 200, w: 200, h: 66 }, r, 0.22, 467, 26, 0.5, 0.15);
  });
  // the shield's strap: a leather guige from under the mail skirt down to the grip it hangs from
  const [sx, sy] = SHIELD.pivot;
  const strap: PathFn = (c) => {
    c.beginPath();
    c.moveTo(sx - 9, 64);
    c.quadraticCurveTo(sx - 12, (64 + sy) / 2, sx - 6, sy + 4);
    c.lineTo(sx + 6, sy + 4);
    c.quadraticCurveTo(sx, (64 + sy) / 2, sx + 3, 64);
    c.closePath();
  };
  piece(g, strap, { x: sx - 14, y: 60, w: 22, h: sy - 56 }, 'leather', '#6a4424', { shadow: 0.7, size: 4, texA: 0.4 });
  stitches(g, (c) => { c.moveTo(sx - 7, 68); c.quadraticCurveTo(sx - 9, (64 + sy) / 2, sx - 3, sy); }, rgba('#d8b888', 0.6), 1, 2.5, 2.5);
  rivet(g, sx - 2, sy - 2, 3, brass);
  oneLight(sil, '#06081a', 0.42, 18);
  sil.finish(inkOf(shade(steel, -0.3)), { openTop: -5, inner: 0.35 });
  if (!o.live) paintShield(ctx, art);
}

registerStyle('shieldmaiden', {
  contactY: 258,
  halfWidth: 104,
  rig: { from: 182, to: 200 },
  leg: { kind: 'mail', hw: 58, join: 'into', pattern: 'none' },
  parts: {
    shield: { box: { x: SHIELD.x - SHIELD.rx - 12, y: SHIELD.y - SHIELD.ry - 12, w: SHIELD.rx * 2 + 24, h: SHIELD.ry * 2 + 24 }, frames: 1, pivot: SHIELD.pivot, draw: (g, art) => paintShield(g, art) },
  },
  draw(ctx, art, p, o) {
    drawShieldmaiden(ctx, art, p, o);
  },
});

// ——— their legs ———

/** Each tile's period must divide its height so it wraps: the nearest period that does to the one wanted. */
const per = (H: number, want: number) => H / Math.max(1, Math.round(H / want));

// A berserker's leg wraps (winingas): a band of coarse wool wound round and round the shin, each turn overlapping the
// last on a slant, with a leather thong cross-gartered over them.
registerLegKind('legwrap', {
  tint: '#1a0e08',
  sheen: 0.16,
  draw(ctx, x0, w, H, base, accent) {
    const thong = accent ?? '#3a2618';
    texture(ctx, 'canvas', { x: x0, y: 0, w, h: H }, 0.35, 1.1);
    const p = per(H, 22);
    const n = Math.round(H / p);
    wrapTile(ctx, H, () => {
      ctx.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const y = i * p;
        // a turn of the wrap: its lower edge on a slant, shadow under it, lit just above
        ctx.fillStyle = rgba('#000000', 0.3);
        ctx.beginPath();
        ctx.moveTo(x0, y + p * 0.15);
        ctx.lineTo(x0 + w, y + p * 0.55);
        ctx.lineTo(x0 + w, y + p * 0.55 + 4);
        ctx.lineTo(x0, y + p * 0.15 + 4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = rgba(shade(base, 0.35), 0.5);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x0, y + p * 0.15 - 1);
        ctx.lineTo(x0 + w, y + p * 0.55 - 1);
        ctx.stroke();
      }
      // the thong, crossing over the front every few turns
      const q = per(H, 66);
      const m = Math.round(H / q);
      for (let i = 0; i < m; i++) {
        const y = i * q;
        for (const [a, b] of [[0, 1], [1, 0]] as const) {
          ctx.strokeStyle = rgba('#000000', 0.4);
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(x0 + w * (0.1 + a * 0.8), y + 2);
          ctx.lineTo(x0 + w * (0.1 + b * 0.8), y + q + 2);
          ctx.stroke();
          ctx.strokeStyle = thong;
          ctx.lineWidth = 3.6;
          ctx.beginPath();
          ctx.moveTo(x0 + w * (0.1 + a * 0.8), y);
          ctx.lineTo(x0 + w * (0.1 + b * 0.8), y + q);
          ctx.stroke();
          ctx.strokeStyle = rgba('#c8a070', 0.4);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x0 + w * (0.1 + a * 0.8) - 1, y - 1);
          ctx.lineTo(x0 + w * (0.1 + b * 0.8) - 1, y + q - 1);
          ctx.stroke();
        }
      }
    });
  },
});

// Mail: riveted rings in rows down the leg, a cold sheen on the lit side.
registerLegKind('mail', {
  tint: '#06081a',
  sheen: 0.3,
  draw(ctx, x0, w, H, base) {
    // an even number of rows, so the offset rows wrap
    const rows = Math.max(2, Math.round(H / 7.2) * 2);
    const sy = H / rows;
    ctx.fillStyle = rgba(shade(base, -0.6), 0.85);
    ctx.fillRect(x0, 0, w, H);
    ctx.lineWidth = 1.3;
    const sx = 5.4;
    wrapTile(ctx, H, () => {
      for (let j = 0; j < rows; j++) {
        const y = j * sy;
        for (let i = -1; i * sx < w + sx; i++) {
          const x = x0 + i * sx + (j % 2) * sx * 0.5;
          ctx.strokeStyle = rgba(shade(base, -0.1), 0.95);
          ctx.beginPath();
          ctx.ellipse(x, y, 2.8, 2.1, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = rgba('#ffffff', 0.45);
          ctx.beginPath();
          ctx.ellipse(x, y, 2.8, 2.1, 0, Math.PI * 1.05, Math.PI * 1.55);
          ctx.stroke();
        }
      }
    });
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0.15, rgba('#ffffff', 0));
    g.addColorStop(0.26, rgba('#e8f4ff', 0.22));
    g.addColorStop(0.36, rgba('#ffffff', 0));
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, H);
  },
});
