// Act 9 bosses in the style kit (batch acts-e, part 2b): Medusa, Cerberus and Hades.
// - MEDUSA: a bare foot of pale green snake skin (rows of lit scales) on a gilded sandal sole with a meander on its
//   lip, a gold instep strap with a gorgon roundel, a serpent anklet in gold, a dark mask across the instep and two
//   glowing slit-pupil eyes (they blink and follow the peel in play). Her hair snakes rise from the ankle: in play
//   they're live sprites that writhe and flick their tongues (src/content/styleLive/acts-e-2b.ts).
// - CERBERUS: a hellhound's paw in long charcoal fur, four heavy toes with hooked claws, a spiked red leather collar
//   with steel studs and a bone skull tag on a bronze ring (it swings in play), lit from below by a faint hellfire.
// - HADES: death-pale toes in a black iron sandal, a polished iron greave with riveted plates, a bident inlaid in
//   blue fire, a skull clasp with burning sockets, a glowing meander on the sole; his dark suit trouser over it.
//   Blue fire pours off him in play.
// Each overheats in its later phases (the heat layer; Hades burns blue-white).

import type { FootArt } from '../../data/feet';
import { CX } from '../../art/feetCommon';
import { restToes, poseToes, onToe, type StyleToe } from '../../art/style/anatomy';
import { bareOutline, paintBare, toenail } from '../../art/style/bare';
import { LIGHT, type PathFn, type Pose, crease, glint, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil, lobe } from '../../art/style/sil';
import { paint } from '../../art/style/materials';
import { type PartDef, registerStyle } from '../../art/style/registry';
import { blotches, clawPath, contact, paintClaw, rivet, stitches } from '../../art/style/details';
import { LX, LY, clip, fill, furCoat, glowDot, glowFinish, goldRamp, heatLayer, lightAll, lin, panel, rad } from '../../art/style/kit-bosses';
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

/** A tapered limb along points: left side out, right side back, a round tip. */
function limbPath(pts: [number, number][], w: (s: number) => number): PathFn {
  return (c) => {
    const L: [number, number][] = [];
    const Rr: [number, number][] = [];
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
    const [ex, ey] = pts[pts.length - 1];
    const er = w(1);
    c.moveTo(ex + er, ey);
    c.arc(ex, ey, er, 0, Math.PI * 2);
  };
}

/** A Greek meander along a band: centre line y(x), from x0 to x1, h tall, engraved (or inlaid in `inlay`). */
function meander(g: Ctx, x0: number, x1: number, y: (x: number) => number, h: number, dark: string, inlay?: string, lw = 2.4): void {
  const u = h;
  const draw = (c: Ctx) => {
    for (let x = x0; x + u <= x1; x += u) {
      const b = y(x + u / 2);
      const t = b - h / 2;
      const s = u / 4;
      c.moveTo(x, b);
      c.lineTo(x, t);
      c.lineTo(x + 3 * s, t);
      c.lineTo(x + 3 * s, t + 2 * s);
      c.lineTo(x + s, t + 2 * s);
      c.lineTo(x + s, b - s * 0.0);
      c.lineTo(x + u, b);
    }
  };
  if (inlay) {
    g.save();
    g.lineJoin = 'miter';
    g.lineCap = 'butt';
    g.beginPath();
    draw(g);
    g.strokeStyle = rgba(dark, 0.8);
    g.lineWidth = lw + 1.6;
    g.stroke();
    g.beginPath();
    draw(g);
    g.strokeStyle = inlay;
    g.lineWidth = lw;
    g.stroke();
    g.restore();
  } else crease(g, draw, lw, dark, 0.7, 0.4);
}

// ════════════════════════════ MEDUSA ════════════════════════════

/** Her eyes (design space): the boss brain lays its stare glows over x ±0.29·halfWidth, 0.55·contactY up. */
export const MED_EYES = [
  { x: CX - 32, y: 128 },
  { x: CX + 32, y: 128 },
];
const MED_BLINK = 5;
const MED_LOOK = { skin: '#9ac48a', shadowTint: '#0c3a3a', pores: 0.08, detail: 0.5, w: 6, toe: 1.04, ankle: 50 } as const;

/** The hair snakes: root (design), base angle (0 = straight up, + leans right), size, side (+1 curls right). */
export const MED_SNAKES: { x: number; y: number; ang: number; k: number; side: 1 | -1; ph: number }[] = [
  { x: CX - 46, y: 50, ang: -1.42, k: 0.84, side: 1, ph: 0.4 },
  { x: CX + 46, y: 50, ang: 1.42, k: 0.84, side: -1, ph: 2.2 },
  { x: CX - 56, y: 86, ang: -1.85, k: 0.78, side: 1, ph: 1.3 },
  { x: CX + 56, y: 86, ang: 1.85, k: 0.78, side: -1, ph: 3.6 },
  { x: CX - 64, y: 118, ang: -2.25, k: 0.66, side: 1, ph: 5.0 },
  { x: CX + 64, y: 118, ang: 2.25, k: 0.66, side: -1, ph: 0.9 },
];

export type HairSnake = (typeof MED_SNAKES)[number];
export const SNAKE_FRAMES = 8;

/** The snake's spine at a writhe phase, in design space: from its root out along its angle, the head rearing up. */
function snakeSpine(sn: HairSnake, phase: number): [number, number][] {
  const pts: [number, number][] = [];
  const L = 90;
  const n = 18;
  const ca = Math.cos(sn.ang);
  const sa = Math.sin(sn.ang);
  for (let j = 0; j <= n; j++) {
    const t = j / n;
    const wav = Math.sin(t * Math.PI * 1.8 - phase) * 12 * Math.min(1, t * 2.4);
    const lx = sn.side * (wav + t * t * 34);
    const ly = -t * L + Math.max(0, t - 0.8) * 10;
    pts.push([sn.x + (lx * ca - ly * sa) * sn.k, sn.y + (lx * sa + ly * ca) * sn.k]);
  }
  return pts;
}

/** The design box a hair snake's sprite needs (every writhe phase, its head and tongue). */
export function snakeBox(sn: HairSnake): { x: number; y: number; w: number; h: number } {
  let x0 = 1e9;
  let y0 = 1e9;
  let x1 = -1e9;
  let y1 = -1e9;
  for (let i = 0; i < 16; i++)
    for (const [x, y] of snakeSpine(sn, (i / 16) * Math.PI * 2)) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  const m = 46 * sn.k;
  return { x: Math.floor(x0 - m), y: Math.floor(y0 - m), w: Math.ceil(x1 - x0 + 2 * m), h: Math.ceil(y1 - y0 + 2 * m) };
}

/** One hair snake in design space. `tongue` 0…1 flicks the forked tongue out. */
export function drawHairSnake(g: Ctx, art: FootArt, sn: HairSnake, phase: number, tongue: number): void {
  const green = shade(art.secondary ?? '#4f8a3a', (sn.ph % 1) * 0.12 - 0.04);
  const belly = '#e8d36a';
  const K = sn.k;
  const side = sn.side;
  const pts = snakeSpine(sn, phase);
  const w = (s: number) => (12.5 - s * 5.5) * K;
  const [ex, ey] = pts[pts.length - 1];
  const [px, py] = pts[pts.length - 3];
  const a = Math.atan2(ey - py, ex - px);
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const hx = ex + dx * 9 * K;
  const hy = ey + dy * 9 * K;
  const body = limbPath(pts, w);
  const head: PathFn = (c) => {
    c.beginPath();
    c.ellipse(hx, hy, 16 * K, 12 * K, a, 0, Math.PI * 2);
  };
  // the tongue goes behind the head
  if (tongue > 0.05) {
    const tl = (8 + 12 * tongue) * K;
    const tx = hx + dx * 13 * K;
    const ty = hy + dy * 13 * K;
    const fx = tx + dx * tl;
    const fy = ty + dy * tl;
    const prong = (sg: number) => [fx + Math.cos(a + sg * 0.55) * 6 * K, fy + Math.sin(a + sg * 0.55) * 6 * K] as const;
    const draw = (c: Ctx) => {
      c.moveTo(tx, ty);
      c.lineTo(fx, fy);
      c.lineTo(...prong(1));
      c.moveTo(fx, fy);
      c.lineTo(...prong(-1));
    };
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    draw(g);
    g.strokeStyle = '#2a0610';
    g.lineWidth = 3.6 * K;
    g.stroke();
    g.beginPath();
    draw(g);
    g.strokeStyle = '#e8304a';
    g.lineWidth = 1.8 * K;
    g.stroke();
    g.restore();
  }
  const box = snakeBox(sn);
  const sil = new Sil(g, [body, head], box);
  const sg = sil.g;
  sil.form({ base: shade(green, 0.08), shadowTint: '#06222a', ramp: 0.75, form: 0.5, formSize: 6 * K, bevel: 0.45, rim: 0.6 });
  const normal = (j: number): [number, number] => {
    const [nx, ny] = pts[Math.min(j + 1, pts.length - 1)];
    const [qx, qy] = pts[Math.max(j - 1, 0)];
    const d = Math.hypot(nx - qx, ny - qy) || 1;
    return [(-(ny - qy) / d) * side, ((nx - qx) / d) * side];
  };
  // the belly: a pale band down the inner flank
  sg.save();
  sg.lineCap = 'round';
  sg.beginPath();
  pts.forEach(([x, y], j) => {
    const [nx, ny] = normal(j);
    const o = w(j / (pts.length - 1)) * 0.55;
    if (j) sg.lineTo(x - nx * o, y - ny * o);
    else sg.moveTo(x - nx * o, y - ny * o);
  });
  sg.strokeStyle = rgba(belly, 0.7);
  sg.lineWidth = 7 * K;
  sg.stroke();
  sg.restore();
  // scales: fine overlapping rows along the body
  sg.save();
  body(sg);
  sg.clip();
  for (let j = 0; j < pts.length - 1; j++) {
    const [x, y] = pts[j];
    const [nx, ny] = pts[j + 1];
    const ang = Math.atan2(ny - y, nx - x);
    const ww = w(j / (pts.length - 1));
    for (const o of [-0.55, 0, 0.55]) {
      const sx = x + Math.cos(ang + Math.PI / 2) * ww * o;
      const sy = y + Math.sin(ang + Math.PI / 2) * ww * o;
      sg.strokeStyle = rgba('#06180c', 0.3);
      sg.lineWidth = 0.9 * K;
      sg.beginPath();
      sg.arc(sx, sy, ww * 0.42, ang - 1.2, ang + 1.2);
      sg.stroke();
    }
  }
  sg.restore();
  // the back: a chain of dark diamonds with pale edges
  for (let j = 1; j < pts.length - 2; j += 2) {
    const [x, y] = pts[j];
    const [nx, ny] = pts[j + 1];
    const r = w(j / (pts.length - 1)) * 0.62;
    const ang = Math.atan2(ny - y, nx - x);
    const nrm = normal(j);
    const cx = x + nrm[0] * r * 0.25;
    const cy = y + nrm[1] * r * 0.25;
    const dia: PathFn = (c) => {
      c.beginPath();
      c.moveTo(cx + Math.cos(ang) * r * 1.3, cy + Math.sin(ang) * r * 1.3);
      c.lineTo(cx + Math.cos(ang + Math.PI / 2) * r * 0.7, cy + Math.sin(ang + Math.PI / 2) * r * 0.7);
      c.lineTo(cx - Math.cos(ang) * r * 1.3, cy - Math.sin(ang) * r * 1.3);
      c.lineTo(cx - Math.cos(ang + Math.PI / 2) * r * 0.7, cy - Math.sin(ang + Math.PI / 2) * r * 0.7);
      c.closePath();
    };
    fill(sg, dia, rgba('#0e2a14', 0.6));
    sg.strokeStyle = rgba('#d8f0a0', 0.3);
    sg.lineWidth = 0.8 * K;
    dia(sg);
    sg.stroke();
  }
  // the head: a darker crown, a brow ridge and a yellow slit eye
  softFill(sg, (c) => {
    c.beginPath();
    c.ellipse(hx - dx * 2 * K + dy * side * 2.5 * K, hy - dy * 2 * K - dx * side * 2.5 * K, 9 * K, 5 * K, a, 0, Math.PI * 2);
  }, rgba('#0a2410', 0.45), 2 * K);
  const exx = hx + dx * 3 * K + dy * side * 5.8 * K;
  const eyy = hy + dy * 3 * K - dx * side * 5.8 * K;
  fill(sg, ell(exx, eyy, 4.6 * K, 3.6 * K, a), rad(sg, exx - K, eyy - K, 0.3, exx, eyy, 4.6 * K, [
    [0, '#fff8a0'],
    [0.6, '#e8c020'],
    [1, '#6a4a08'],
  ]));
  fill(sg, ell(exx, eyy, 1.1 * K, 3.3 * K, a + Math.PI / 2), '#100804');
  glint(sg, exx - K, eyy - 1.2 * K, 1.5 * K, 0.9);
  crease(sg, (c) => {
    c.moveTo(hx - dx * 4 * K - dy * side * 1.5 * K, hy - dy * 4 * K + dx * side * 1.5 * K);
    c.lineTo(hx + dx * 11 * K, hy + dy * 11 * K);
  }, 1.1 * K, '#0a2410', 0.55, 0.2);
  spec(sg, hx - 3 * K, hy - 3 * K, 6 * K, 3 * K, 0.45, a);
  lightAll(sil, 0.3, 6 * K, 0.6);
  sil.finish(inkOf(green), { w: 3.6, inner: 0.4 });
}

/** The snake at a frame: the writhe goes once round the cycle; the tongue flicks out on three of the frames. */
export function hairSnakeFrame(g: Ctx, art: FootArt, sn: HairSnake, i: number): void {
  const tongue = i === 3 ? 0.6 : i === 4 ? 1 : i === 5 ? 0.45 : 0;
  drawHairSnake(g, art, sn, (i / SNAKE_FRAMES) * Math.PI * 2 + sn.ph, tongue);
}

function medusaEyes(g: Ctx, art: FootArt, blink: number): void {
  const glowC = String(art.extra?.eye ?? '#9dff6a');
  const skin = art.skin;
  for (const e of MED_EYES) {
    const s = e.x < CX ? -1 : 1;
    const rx = 19;
    const ry = 11.5;
    const tilt = s * 0.16;
    const almond: PathFn = (c) => {
      c.save();
      c.translate(e.x, e.y);
      c.rotate(tilt);
      c.beginPath();
      c.moveTo(-rx, 0);
      c.quadraticCurveTo(-rx * 0.1, -ry * 1.7, rx, -ry * 0.15);
      c.quadraticCurveTo(rx * 0.1, ry * 1.45, -rx, 0);
      c.closePath();
      c.restore();
    };
    // the socket, then the lit eye
    softFill(g, ell(e.x, e.y + 1, rx + 6, ry + 6, tilt), rgba('#061a10', 0.55), 3.5);
    fill(g, almond, rad(g, e.x - 4, e.y - 3, 1, e.x, e.y, rx * 1.05, [
      [0, '#f4ffd0'],
      [0.35, mix(glowC, '#ffffff', 0.35)],
      [0.75, glowC],
      [1, shade(glowC, -0.6)],
    ]));
    clip(g, almond, () => {
      // the slit pupil, a darker iris ring and a wet glint
      g.strokeStyle = rgba(shade(glowC, -0.55), 0.6);
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(e.x, e.y, 10, 10, 0, 0, Math.PI * 2);
      g.stroke();
      fill(g, ell(e.x, e.y, 2.6, 11, 0), '#071004');
      softFill(g, ell(e.x, e.y - ry * 0.9, rx, ry * 0.5, tilt), rgba('#0a2a10', 0.45), 3);
      glint(g, e.x - 6, e.y - 4, 3.4, 0.95);
      // the lid closing
      if (blink > 0.02) {
        const lid = e.y - ry * 1.3 + ry * 2.6 * blink;
        g.fillStyle = lin(g, 0, e.y - ry * 1.4, 0, lid, [
          [0, shade(skin, -0.1)],
          [1, shade(skin, -0.3)],
        ]);
        g.fillRect(e.x - rx - 4, e.y - ry * 1.6, rx * 2 + 8, lid - (e.y - ry * 1.6));
        g.strokeStyle = rgba('#0a2410', 0.8);
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(e.x - rx, lid);
        g.quadraticCurveTo(e.x, lid + 3, e.x + rx, lid);
        g.stroke();
      }
    });
    g.strokeStyle = rgba('#061408', 0.9);
    g.lineWidth = 2.2;
    almond(g);
    g.stroke();
  }
}

const medSole: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 102, 196);
  c.bezierCurveTo(CX - 108, 272, CX - 52, 286, CX, 286);
  c.bezierCurveTo(CX + 54, 286, CX + 110, 272, CX + 106, 190);
  c.closePath();
};

/** The scale pattern: overlapping rows of lit scales over the whole foot. */
function scaleRows(g: Ctx, skin: string, box: { x: number; y: number; w: number; h: number }, seed: number): void {
  const r = rng(seed);
  const sw = 16;
  const sh = 10.5;
  for (let row = 0; row * sh < box.h + sh; row++) {
    const y = box.y + row * sh;
    const off = row % 2 ? sw / 2 : 0;
    for (let x = box.x - sw + off; x < box.x + box.w + sw; x += sw) {
      // lit towards the top left, darker towards the bottom right of the foot
      const u = (x - box.x) / box.w + (y - box.y) / box.h - 1;
      const tone = shade(skin, -0.08 - u * 0.14 + (r() - 0.5) * 0.12);
      const sc: PathFn = (c) => {
        c.beginPath();
        c.moveTo(x - sw / 2, y);
        c.quadraticCurveTo(x - sw / 2, y + sh * 1.35, x, y + sh * 1.5);
        c.quadraticCurveTo(x + sw / 2, y + sh * 1.35, x + sw / 2, y);
        c.closePath();
      };
      g.fillStyle = rad(g, x - 2.5, y + 3, 0.5, x, y + sh * 0.6, sw * 0.75, [
        [0, rgba(shade(tone, 0.32), 0.55)],
        [0.6, rgba(tone, 0.3)],
        [1, rgba(shade(tone, -0.45), 0.5)],
      ]);
      sc(g);
      g.fill();
      g.strokeStyle = rgba('#0a2a1a', 0.13);
      g.lineWidth = 1;
      sc(g);
      g.stroke();
    }
  }
}

function drawMedusa(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const skin = art.skin;
  const gold = art.primary ?? '#c9a23a';
  const glowC = String(art.extra?.eye ?? '#9dff6a');
  const soleBox = { x: CX - 112, y: 186, w: 226, h: 104 };
  if (o.heat) {
    const s = new Sil(ctx, [medSole], soleBox);
    heatLayer(s, soleBox, { seed: 211, y0: 290, y1: 186 });
    const f = paintBare(ctx, MED_LOOK, p);
    f.sil.g.clearRect(-3000, -3000, 6000, 6000);
    heatLayer(f.sil, f.box, { seed: 213, y0: 270, y1: 0, a: 0.85 });
    return;
  }
  if (o.emissive) {
    // only the stare: the eyes glow (the snakes and the rest stay unlit)
    for (const e of MED_EYES) {
      glowDot(ctx, e.x, e.y, 30, glowC, 0.55);
      glowDot(ctx, e.x, e.y, 13, '#f4ffd0', 0.7);
    }
    return;
  }
  // the hair snakes, behind everything (in play they're live sprites)
  if (!o.live)
    for (const sn of MED_SNAKES) {
      drawHairSnake(ctx, art, sn, sn.ph, 0);
    }
  // the gilded sole, under the foot
  const ss = new Sil(ctx, [medSole], soleBox);
  const sg = ss.g;
  sg.fillStyle = goldRamp(sg, CX - 110, 190, CX + 60, 300, gold);
  sg.fillRect(soleBox.x, soleBox.y, soleBox.w, soleBox.h);
  texture(sg, 'brushed', soleBox, 0.12, 1);
  const lipY = (x: number) => 276 - 26 * ((x - CX) / 106) ** 4;
  meander(sg, CX - 92, CX + 96, lipY, 12, shade(gold, -0.6));
  // the lip's top edge: a lit bevel
  sg.strokeStyle = rgba('#fff4c0', 0.55);
  sg.lineWidth = 1.6;
  sg.beginPath();
  for (let x = CX - 100; x <= CX + 104; x += 4) (x === CX - 100 ? sg.moveTo(x, lipY(x) - 9) : sg.lineTo(x, lipY(x) - 9));
  sg.stroke();
  spec(sg, CX - 70, 262, 22, 6, 0.7, -0.15, '#fffbe0');
  lightAll(ss, 0.35, 10, 0.5);
  ss.finish(inkOf(gold), { openTop: 0 });
  // the foot: snake-skinned
  const f = paintBare(ctx, { ...MED_LOOK, skin, nails: gold }, p);
  const g = f.sil.g;
  const box = f.box;
  scaleRows(g, skin, { x: box.x, y: -8, w: box.w, h: 190 }, hashStr('medusa-scales'));
  // the scales fade out over the toes (finer skin there), keeping the toes' own shading
  texture(g, 'scales', box, 0.12, 1.2);
  // a sheen of green-gold iridescence over the instep
  g.save();
  g.globalCompositeOperation = 'overlay';
  g.fillStyle = lin(g, CX - 100, 20, CX + 100, 180, [
    [0, rgba('#d8ff8a', 0.4)],
    [0.5, rgba('#40a080', 0.2)],
    [1, rgba('#1a5a6a', 0.4)],
  ]);
  g.fillRect(box.x, box.y, box.w, 200);
  g.restore();
  spec(g, CX - 40, 64, 46, 26, 0.22, -0.5, '#f0ffd8');
  // the mask: a dark band across the instep so the eyes burn out of it
  softFill(g, (c) => {
    c.beginPath();
    c.moveTo(CX - 96, 132);
    c.quadraticCurveTo(CX, 82, CX + 100, 132);
    c.quadraticCurveTo(CX, 176, CX - 96, 132);
    c.closePath();
  }, rgba('#0e2a1a', 0.5), 7);
  // brows: heavy ridges slanting in
  for (const e of MED_EYES) {
    const s = e.x < CX ? -1 : 1;
    softStroke(g, (c) => {
      c.moveTo(e.x + s * 26, e.y - 20);
      c.quadraticCurveTo(e.x + s * 2, e.y - 26, e.x - s * 18, e.y - 13);
    }, rgba('#08200e', 0.75), 6, 1.5);
    softStroke(g, (c) => {
      c.moveTo(e.x + s * 24, e.y - 25);
      c.quadraticCurveTo(e.x + s * 2, e.y - 31, e.x - s * 18, e.y - 19);
    }, rgba('#e8ffc0', 0.35), 3, 1.2);
  }
  if (!o.live) medusaEyes(g, art, 0);
  // the instep strap: gold, a meander inlaid, a gorgon roundel in the middle
  const strapY = (x: number) => 164 + 10 * (1 - ((x - CX) / 104) ** 2);
  const strap: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 110, strapY(CX - 110) - 9);
    for (let x = CX - 110; x <= CX + 112; x += 6) c.lineTo(x, strapY(x) - 9);
    for (let x = CX + 112; x >= CX - 110; x -= 6) c.lineTo(x, strapY(x) + 8);
    c.closePath();
  };
  panel(g, strap, { x: CX - 112, y: 150, w: 226, h: 40 }, 'chrome', gold, { shadow: 0.55, texA: 0.1 });
  clip(g, strap, () => {
    g.fillStyle = lin(g, 0, 150, 0, 190, [
      [0, rgba('#fff4c0', 0.4)],
      [0.4, rgba(gold, 0.35)],
      [1, rgba('#5a3a08', 0.5)],
    ]);
    g.fillRect(CX - 112, 150, 226, 40);
    meander(g, CX - 100, CX + 100, strapY, 9, '#4a2e06', undefined, 1.6);
  });
  const ro = { x: CX, y: strapY(CX) };
  raised(g, ell(ro.x, ro.y, 15, 15), goldRamp(g, ro.x - 15, ro.y - 15, ro.x + 15, ro.y + 15, gold), 0.55);
  fill(g, ell(ro.x, ro.y, 9.5, 9.5), rad(g, ro.x - 3, ro.y - 3, 0.5, ro.x, ro.y, 10, [
    [0, '#a8f0a0'],
    [0.5, '#2a8a4a'],
    [1, '#0a3a1a'],
  ]));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    rivet(g, ro.x + Math.cos(a) * 12.4, ro.y + Math.sin(a) * 12.4, 1.4, mix(gold, '#ffffff', 0.3));
  }
  glint(g, ro.x - 4, ro.y - 4, 4, 0.9);
  // the serpent anklet: a gold snake once round the ankle, its head biting its tail at the front
  const ankY = (x: number) => 38 + 7 * (1 - ((x - CX) / 56) ** 2);
  const ank: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 60, ankY(CX - 60) - 6);
    for (let x = CX - 60; x <= CX + 40; x += 5) c.lineTo(x, ankY(x) - 6);
    c.lineTo(CX + 40, ankY(CX + 40) + 6);
    for (let x = CX + 40; x >= CX - 60; x -= 5) c.lineTo(x, ankY(x) + 6);
    c.closePath();
  };
  panel(g, ank, { x: CX - 62, y: 26, w: 104, h: 30 }, 'chrome', gold, { shadow: 0.55, texA: 0.08 });
  clip(g, ank, () => {
    for (let x = CX - 58; x < CX + 40; x += 5) {
      g.strokeStyle = rgba('#5a3a08', 0.55);
      g.lineWidth = 1;
      g.beginPath();
      g.arc(x, ankY(x) - 2, 3.4, 0.3, Math.PI - 0.3);
      g.stroke();
    }
    g.fillStyle = lin(g, 0, 30, 0, 52, [
      [0, rgba('#fffbe0', 0.45)],
      [0.5, rgba('#000000', 0)],
      [1, rgba('#3a2004', 0.45)],
    ]);
    g.fillRect(CX - 62, 26, 104, 30);
  });
  const sh: PathFn = (c) => {
    c.beginPath();
    c.ellipse(CX + 48, ankY(CX + 48) - 1, 12, 8.5, -0.15, 0, Math.PI * 2);
  };
  raised(g, sh, goldRamp(g, CX + 36, 30, CX + 60, 52, gold), 0.5);
  fill(g, ell(CX + 51, ankY(CX + 48) - 3.5, 2.6, 2.2), rad(g, CX + 50, ankY(CX + 48) - 4.5, 0.2, CX + 51, ankY(CX + 48) - 3.5, 3, [
    [0, '#ffd0d0'],
    [0.5, '#e01a2a'],
    [1, '#5a0408'],
  ]));
  glint(g, CX + 41, ankY(CX + 48) - 5, 3.2, 0.85);
  lightAll(f.sil, 0.32, 16, 0.5);
  bareOutline(f, inkOf(shade(skin, -0.25)));
}

registerStyle('medusa', {
  contactY: 286,
  halfWidth: 110,
  rig: { from: 176, to: 196 },
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 24 },
  parts: {
    eyes: {
      box: { x: MED_EYES[0].x - 30, y: MED_EYES[0].y - 22, w: MED_EYES[1].x - MED_EYES[0].x + 60, h: 44 },
      frames: MED_BLINK,
      draw: (g, art, i) => medusaEyes(g, art, i / (MED_BLINK - 1)),
    },
  },
  draw(ctx, art, p, o) {
    drawMedusa(ctx, art, p, o);
  },
});

// ════════════════════════════ CERBERUS ════════════════════════════

export const CERB_TOES: [number, number, number, number, number][] = [
  [CX - 76, 220, 28, 32, 0.28],
  [CX - 27, 238, 30, 35, 0.08],
  [CX + 27, 238, 30, 35, -0.08],
  [CX + 76, 220, 28, 32, -0.28],
];

function cerbToes(p: Pose): StyleToe[] {
  const c = Math.max(0, p.curl);
  const s = Math.max(0, -p.curl);
  return CERB_TOES.map(([x, y, rx, ry, rot], i) => {
    const w = p.wiggle[i + 1] ?? 0;
    return { cx: x + (x - CX) * 0.12 * s, cy: y - ry * 0.28 * c + 4 * w + 2 * s, rx: rx * (1 + 0.06 * c), ry: ry * (1 - 0.14 * c), rot: rot * (1 + s * 0.6) - w * 0.06 };
  });
}

const cerbBody: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 54, 22);
  c.bezierCurveTo(CX - 58, 72, CX - 102, 112, CX - 102, 186);
  c.lineTo(CX - 88, 216);
  c.lineTo(CX + 88, 216);
  c.lineTo(CX + 102, 186);
  c.bezierCurveTo(CX + 102, 112, CX + 58, 72, CX + 54, 22);
  c.closePath();
};

const collarTop = (x: number) => 14 + 12 * (1 - ((x - CX) / 66) ** 2);
const cerbCollar: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 66, 14);
  c.quadraticCurveTo(CX, 38, CX + 66, 14);
  c.lineTo(CX + 66, 46);
  c.quadraticCurveTo(CX, 72, CX - 66, 46);
  c.closePath();
};
const SPIKES = [-52, -26, 0, 26, 52].map((dx) => CX + dx);
const spikePath = (x: number): PathFn => (c) => {
  const b = collarTop(x) + 2;
  const lean = (x - CX) / 66;
  c.beginPath();
  c.moveTo(x - 8.5, b);
  c.quadraticCurveTo(x - 3 + lean * 3, b - 10, x + lean * 8, b - 22);
  c.quadraticCurveTo(x + 3 + lean * 3, b - 10, x + 8.5, b);
  c.closePath();
};

/** The skull tag on its ring (a live sway part in play). */
export const CERB_TAG = { x: CX, y: 64 };

function cerbTag(g: Ctx): void {
  const { x, y } = CERB_TAG;
  // the bronze ring
  g.save();
  g.lineWidth = 6.5;
  g.strokeStyle = '#2a1608';
  g.beginPath();
  g.arc(x, y + 4, 6.5, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 3.6;
  g.strokeStyle = lin(g, x - 7, y - 3, x + 7, y + 11, [
    [0, '#ffe0a0'],
    [0.4, '#d9a441'],
    [1, '#5a3a10'],
  ]);
  g.stroke();
  g.restore();
  // the skull
  const sy = y + 26;
  const skull: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 15, sy - 2);
    c.bezierCurveTo(x - 17, sy - 22, x + 17, sy - 22, x + 15, sy - 2);
    c.quadraticCurveTo(x + 14, sy + 6, x + 8, sy + 9);
    c.lineTo(x + 7, sy + 17);
    c.quadraticCurveTo(x, sy + 20, x - 7, sy + 17);
    c.lineTo(x - 8, sy + 9);
    c.quadraticCurveTo(x - 14, sy + 6, x - 15, sy - 2);
    c.closePath();
  };
  const s = new Sil(g, [skull], { x: x - 20, y: sy - 22, w: 40, h: 44 });
  s.form({ base: '#efe6d0', shadowTint: '#5a3a2a', ramp: 0.7, form: 0.5, formSize: 6, bevel: 0.45, rim: 0.5 });
  texture(s.g, 'cast', { x: x - 20, y: sy - 22, w: 40, h: 44 }, 0.25, 1);
  for (const sx of [-1, 1]) {
    fill(s.g, ell(x + sx * 6, sy, 4.6, 5), '#160608');
    fill(s.g, ell(x + sx * 6, sy + 0.5, 2.2, 2.2), rad(s.g, x + sx * 6, sy + 0.5, 0, x + sx * 6, sy + 0.5, 2.6, [
      [0, '#fff0c0'],
      [0.4, '#ff4a1a'],
      [1, 'rgba(160,20,0,0)'],
    ]));
  }
  fill(s.g, (c) => {
    c.beginPath();
    c.moveTo(x, sy + 5);
    c.lineTo(x - 2.2, sy + 9);
    c.lineTo(x + 2.2, sy + 9);
    c.closePath();
  }, '#2a1410');
  for (const tx of [-4, 0, 4]) crease(s.g, (c) => {
    c.moveTo(x + tx, sy + 12);
    c.lineTo(x + tx, sy + 17);
  }, 1.1, '#3a2418', 0.7, 0.2);
  spec(s.g, x - 6, sy - 11, 6, 3.5, 0.6, -0.5);
  s.finish(inkOf('#8a7a60'), { w: 3.2, inner: 0.4 });
}

function drawCerberus(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const fur = art.skin;
  const red = art.secondary ?? '#c8102e';
  const deep = '#0c060a';
  const toes = cerbToes(p);
  const c = Math.max(0, p.curl);
  const claws = toes.map((t) => {
    const [x, y] = onToe(t, Math.PI / 2);
    return { x: x - Math.sin(t.rot) * 2, y: y - 9, ang: Math.PI / 2 - t.rot * 1.4, len: 30 * (1 + c * 0.3), w: 13 };
  });
  const toeP = toes.map((t) => ell(t.cx, t.cy, t.rx, t.ry, t.rot));
  const box = { x: CX - 120, y: -12, w: 240, h: 316 };
  const parts = [cerbBody, ...toeP, ...claws.map((k) => clawPath(k.x, k.y, k.ang, k.len, k.w, 0.22)), cerbCollar, ...SPIKES.map(spikePath)];
  const sil = new Sil(ctx, parts, box);
  const g = sil.g;
  if (o.heat) {
    heatLayer(sil, box, { seed: 221, y0: 300, y1: 20 });
    return;
  }
  if (o.emissive) {
    glowFinish(sil);
    return;
  }
  const r = rng(hashStr('cerberus-fur'));
  sil.form({ base: fur, shadowTint: '#1a0a20', ramp: 0.6, form: 0.6, formSize: 24, bevel: 0.2, rim: 0.75 });
  const furParts = (cc: Ctx) => {
    cerbBody(cc);
    for (const t of toes) {
      cc.moveTo(t.cx + t.rx, t.cy);
      cc.ellipse(t.cx, t.cy, t.rx, t.ry, t.rot, 0, Math.PI * 2);
    }
  };
  // the coat: long strands flowing down and fanning out over the toes
  clip(g, furParts, () => {
    furCoat(g, r, { x: CX - 112, y: 10, w: 224, h: 220 }, (x) => Math.PI / 2 - ((x - CX) / 110) * 0.55, fur, deep, { n: 1.15, len: 20, w: 1.05 });
  });
  // each toe its own fat lobe, with its own short fur following it
  for (const [i, t] of toes.entries()) {
    const tp = toeP[i];
    lobe(g, tp, { x: t.cx - t.rx - 4, y: t.cy - t.ry - 6, w: t.rx * 2 + 8, h: t.ry * 2 + 10 }, t.cy - t.ry * 0.95, t.cy - t.ry * 0.25, deep, 0.9, 12, 0.45);
    spec(g, t.cx - t.rx * 0.3, t.cy - t.ry * 0.05, t.rx * 0.6, t.ry * 0.35, 0.16, t.rot - 0.4, '#c8b8d8');
    clip(g, tp, () => {
      furCoat(g, r, { x: t.cx - t.rx, y: t.cy - t.ry * 0.4, w: t.rx * 2, h: t.ry * 1.4 }, () => Math.PI / 2 - t.rot, shade(fur, 0.06), deep, { n: 0.09, len: 11, w: 0.9 });
    });
  }
  // the clefts between the toes: deep, dark, the fur parting
  for (let i = 0; i < toes.length - 1; i++) {
    const a = toes[i];
    const b = toes[i + 1];
    const x = (a.cx + a.rx * 0.8 + b.cx - b.rx * 0.8) / 2;
    const y = Math.max(a.cy, b.cy) + 10;
    softStroke(g, (cc) => {
      cc.moveTo(x, y);
      cc.quadraticCurveTo(x - (x - CX) * 0.05, y - 30, x - (x - CX) * 0.15, y - 56);
    }, lin(g, 0, y - 60, 0, y, [
      [0, rgba(deep, 0)],
      [1, rgba(deep, 0.95)],
    ]), 9, 2.5);
  }
  // the light: key from the top left, a hellfire bounce from below
  g.fillStyle = lin(g, CX - 100, 0, CX + 110, 240, [
    [0, rgba(LIGHT.key, 0.12)],
    [0.5, rgba(LIGHT.key, 0)],
    [1, rgba('#000000', 0.35)],
  ]);
  g.fillRect(box.x, box.y, box.w, box.h);
  sil.edge(rgba('#ff4a1a', 0.32), 9, -LX * 4, -LY * 5, 'lighter');
  for (const k of claws) paintClaw(g, k.x, k.y, k.ang, k.len, k.w, 0.22, '#d8d0c0', '#1a1418');
  // the collar: red leather, stitched, studded, spiked
  const cb = { x: CX - 68, y: 12, w: 136, h: 56 };
  contact(g, (cc) => {
    cerbCollar(cc);
    cc.fill();
  }, 0.7, 4, 6);
  paint(g, cerbCollar, cb, 'leather', red);
  clip(g, cerbCollar, () => {
    g.fillStyle = lin(g, 0, 16, 0, 64, [
      [0, rgba('#ffd0c0', 0.25)],
      [0.35, rgba('#000000', 0)],
      [1, rgba('#1a0004', 0.5)],
    ]);
    g.fillRect(cb.x, cb.y, cb.w, cb.h);
    // the cylinder: dark round the sides
    g.fillStyle = lin(g, CX - 66, 0, CX + 66, 0, [
      [0, rgba('#000000', 0.45)],
      [0.2, rgba('#000000', 0)],
      [0.8, rgba('#000000', 0)],
      [1, rgba('#000000', 0.55)],
    ]);
    g.fillRect(cb.x, cb.y, cb.w, cb.h);
    stitches(g, (cc) => {
      cc.moveTo(CX - 64, 20);
      cc.quadraticCurveTo(CX, 43, CX + 64, 20);
    }, '#e8c8a0', 1.3, 3.5, 3);
    stitches(g, (cc) => {
      cc.moveTo(CX - 64, 41);
      cc.quadraticCurveTo(CX, 66, CX + 64, 41);
    }, '#e8c8a0', 1.3, 3.5, 3);
  });
  for (let i = 0; i < 7; i++) {
    const x = CX - 54 + i * 18;
    const u = (x - CX) / 66;
    rivet(g, x, 30 + 12.5 * (1 - u * u), 3.6, '#c3cdd8');
  }
  for (const x of SPIKES) {
    const sp = spikePath(x);
    contact(g, (cc) => {
      sp(cc);
      cc.fill();
    }, 0.5, 2, 2.5);
    fill(g, sp, lin(g, x - 8, 0, x + 8, 0, [
      [0, '#5a6068'],
      [0.3, '#ffffff'],
      [0.55, '#b8c0c8'],
      [1, '#2a2e36'],
    ]));
    glint(g, x - 2, collarTop(x) - 8, 3.2, 0.8);
  }
  if (!o.live) cerbTag(g);
  lightAll(sil, 0.3, 18, 0.6);
  sil.finish(inkOf(fur), { openTop: -14 });
}

registerStyle('cerberus', {
  contactY: 290,
  halfWidth: 112,
  rig: { from: 170, to: 190 },
  leg: { kind: 'fur', hw: 52, join: 'into', end: 36 },
  parts: {
    tag: { box: { x: CX - 22, y: 54, w: 44, h: 58 }, frames: 1, pivot: [CX, 60], draw: (g) => cerbTag(g) },
  },
  draw(ctx, art, p, o) {
    drawCerberus(ctx, art, p, o);
  },
});

// ════════════════════════════ HADES ════════════════════════════

const hadesSole: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 102, 200);
  c.bezierCurveTo(CX - 106, 274, CX - 52, 288, CX, 288);
  c.bezierCurveTo(CX + 54, 288, CX + 110, 274, CX + 106, 196);
  c.closePath();
};

const greave: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 68, -6);
  c.bezierCurveTo(CX - 66, 30, CX - 58, 62, CX - 64, 96);
  c.bezierCurveTo(CX - 80, 128, CX - 100, 150, CX - 97, 184);
  c.quadraticCurveTo(CX - 46, 194, CX, 216);
  c.quadraticCurveTo(CX + 46, 194, CX + 99, 182);
  c.bezierCurveTo(CX + 102, 150, CX + 82, 128, CX + 66, 96);
  c.bezierCurveTo(CX + 60, 62, CX + 68, 30, CX + 68, -6);
  c.closePath();
};

function hadesToes(p: Pose): StyleToe[] {
  return poseToes(restToes({ toe: 1.04 }).map((t) => ({ ...t, cy: t.cy + 8 })), p);
}

/** Where the blue fire licks off him (design), for the live layer. */
export const HADES_FIRE: [number, number][] = [
  [CX - 78, 40],
  [CX - 92, 110],
  [CX - 92, 168],
  [CX + 78, 40],
  [CX + 94, 110],
  [CX + 94, 168],
  [CX - 40, 10],
  [CX + 40, 10],
];

const SKULL = { x: CX, y: 82 };

function hadesSkull(g: Ctx, blue: string, emissive: boolean): void {
  const { x, y } = SKULL;
  const sk: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 22, y + 2);
    c.bezierCurveTo(x - 25, y - 30, x + 25, y - 30, x + 22, y + 2);
    c.quadraticCurveTo(x + 21, y + 11, x + 13, y + 14);
    c.lineTo(x + 11, y + 26);
    c.quadraticCurveTo(x, y + 30, x - 11, y + 26);
    c.lineTo(x - 13, y + 14);
    c.quadraticCurveTo(x - 21, y + 11, x - 22, y + 2);
    c.closePath();
  };
  if (emissive) {
    for (const s of [-1, 1]) {
      glowDot(g, x + s * 9, y, 22, blue, 0.9);
      glowDot(g, x + s * 9, y, 7, '#e8fbff', 1);
    }
    return;
  }
  raised(g, sk, lin(g, x - 20, y - 26, x + 20, y + 28, [
    [0, '#fffaf0'],
    [0.45, '#e0d8c0'],
    [1, '#8a8068'],
  ]), 0.7, 3);
  clip(g, sk, () => {
    texture(g, 'cast', { x: x - 26, y: y - 30, w: 52, h: 60 }, 0.3, 1);
    // temples and cheekbones
    for (const s of [-1, 1]) softFill(g, ell(x + s * 18, y - 4, 5, 10), rgba('#5a4a30', 0.35), 3);
    for (const s of [-1, 1]) {
      fill(g, ell(x + s * 9, y + 1, 7, 7.6, s * 0.2), '#0a0a14');
      fill(g, ell(x + s * 9, y + 1.5, 3.4, 3.6), rad(g, x + s * 9, y + 1.5, 0, x + s * 9, y + 1.5, 4.5, [
        [0, '#e8fbff'],
        [0.45, blue],
        [1, rgba(blue, 0)],
      ]));
    }
    fill(g, (c) => {
      c.beginPath();
      c.moveTo(x, y + 9);
      c.lineTo(x - 3, y + 15);
      c.lineTo(x + 3, y + 15);
      c.closePath();
    }, '#1a1418');
    for (const tx of [-6, -2, 2, 6]) crease(g, (c) => {
      c.moveTo(x + tx, y + 19);
      c.lineTo(x + tx, y + 26);
    }, 1.2, '#3a2e20', 0.75, 0.2);
    spec(g, x - 8, y - 16, 9, 5, 0.6, -0.4);
  });
}

function drawHades(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const skin = mix(art.skin, '#ece4f4', 0.42);
  const iron = art.primary ?? '#24222e';
  const blue = String(art.extra?.flame ?? art.secondary ?? '#4fb8ff');
  const toes = hadesToes(p);
  const c = Math.max(0, p.curl);
  const toeP = toes.map((t) => ell(t.cx, t.cy, t.rx, t.ry, t.rot));
  const box = { x: CX - 116, y: -10, w: 234, h: 304 };
  if (!o.live && !o.emissive && !o.heat) {
    // blue fire licking up behind him (in play it's live)
    const r = rng(hashStr('hades-flames'));
    for (const [x, h, lean, y0] of [[CX - 88, 104, -30, 184], [CX - 74, 120, -22, 124], [CX - 64, 66, -12, 60], [CX + 64, 66, 14, 60], [CX + 76, 124, 24, 124], [CX + 90, 108, 32, 184]] as const) {
      const w = 22;
      const wob = (r() - 0.5) * 10;
      const tongue = (k: number): PathFn => (cc) => {
        const ww = w * k;
        const hh = h * k;
        cc.beginPath();
        cc.moveTo(x - ww, y0);
        cc.bezierCurveTo(x - ww * 1.1, y0 - hh * 0.45, x + lean * 0.3 - ww * 0.2 + wob, y0 - hh * 0.55, x + lean * 0.55 - ww * 0.5, y0 - hh * 0.75);
        cc.quadraticCurveTo(x + lean * 0.8, y0 - hh * 0.8, x + lean, y0 - hh);
        cc.bezierCurveTo(x + lean * 0.7 + ww * 0.3, y0 - hh * 0.7, x + lean * 0.4 + ww * 0.9, y0 - hh * 0.5, x + ww * 0.6 + wob * 0.5, y0 - hh * 0.35);
        cc.quadraticCurveTo(x + ww * 1.05, y0 - hh * 0.2, x + ww, y0);
        cc.closePath();
      };
      softFill(ctx, tongue(1), lin(ctx, 0, y0, 0, y0 - h, [
        [0, rgba('#bfefff', 0.9)],
        [0.25, rgba(blue, 0.85)],
        [0.7, rgba('#1d5aa8', 0.55)],
        [1, rgba('#1d3a88', 0)],
      ]), 2);
      softFill(ctx, tongue(0.55), lin(ctx, 0, y0, 0, y0 - h * 0.55, [
        [0, rgba('#ffffff', 0.95)],
        [0.5, rgba('#bff4ff', 0.6)],
        [1, rgba('#7fd8ff', 0)],
      ]), 1.5);
    }
  }
  const sil = new Sil(ctx, [hadesSole, ...toeP, greave], box);
  const g = sil.g;
  if (o.heat) {
    heatLayer(sil, box, { seed: 231, y0: 292, y1: 10, hot: '#e8fbff', mid: '#5fc8ff', deep: '#1d3aa8' });
    return;
  }
  const strapY = (x: number) => 208 + 4 * (1 - ((x - CX) / 104) ** 2);
  const lipY = (x: number) => 279 - 24 * ((x - CX) / 106) ** 4;
  if (o.emissive) {
    // the bident, the meander inlay, the skull's sockets and a blue rim from his own fire
    g.save();
    g.lineCap = 'round';
    g.shadowColor = blue;
    g.shadowBlur = 10 * sil.k;
    g.strokeStyle = mix(blue, '#ffffff', 0.3);
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(CX, 190);
    g.lineTo(CX, 132);
    g.moveTo(CX - 24, 112);
    g.quadraticCurveTo(CX - 24, 134, CX, 134);
    g.quadraticCurveTo(CX + 24, 134, CX + 24, 112);
    g.stroke();
    g.restore();
    meander(g, CX - 92, CX + 96, lipY, 11, '#000000', mix(blue, '#ffffff', 0.2), 2.2);
    hadesSkull(g, blue, true);
    sil.edge(rgba(blue, 0.7), 6, LX * 3, LY * 3);
    glowFinish(sil);
    return;
  }
  // the sole: black iron, a blue meander inlaid round its lip
  const soleBox = { x: CX - 110, y: 190, w: 222, h: 100 };
  panel(g, hadesSole, soleBox, 'iron', '#3a3848', { shadow: 0 });
  clip(g, hadesSole, () => {
    meander(g, CX - 92, CX + 96, lipY, 11, '#06060c', mix(blue, '#a8e8ff', 0.3), 2.2);
    g.strokeStyle = rgba('#c8d0ff', 0.3);
    g.lineWidth = 1.5;
    g.beginPath();
    for (let x = CX - 100; x <= CX + 104; x += 4) (x === CX - 100 ? g.moveTo(x, lipY(x) - 9) : g.lineTo(x, lipY(x) - 9));
    g.stroke();
  });
  // the toes: death-pale, cold, dark-nailed
  const deep = mix(shade(skin, -0.5), '#1a1040', 0.4);
  for (const [i, t] of toes.entries()) {
    const tp = toeP[i];
    contact(g, (cc) => {
      tp(cc);
      cc.fill();
    }, 0.6, 3, 4);
    paint(g, tp, { x: t.cx - t.rx, y: t.cy - t.ry, w: t.rx * 2, h: t.ry * 2 }, 'skin', skin);
    lobe(g, tp, { x: t.cx - t.rx - 2, y: t.cy - t.ry, w: t.rx * 2 + 4, h: t.ry * 2 + 4 }, t.cy - t.ry, t.cy - t.ry * 0.2, deep, 0.5, 6, 0.3);
    clip(g, tp, () => {
      // cold blue under the skin, knuckle creases
      softFill(g, ell(t.cx + t.rx * 0.3, t.cy + t.ry * 0.3, t.rx * 0.7, t.ry * 0.5), rgba('#3a5ad0', 0.18), 4);
      for (const f2 of [0.3, 0.5]) crease(g, (cc) => {
        const y = t.cy - t.ry * f2 + c * 4;
        cc.moveTo(t.cx - t.rx * 0.35, y);
        cc.quadraticCurveTo(t.cx, y + 2.5, t.cx + t.rx * 0.35, y);
      }, 1.2, deep, 0.35, 0.2);
    });
    toenail(g, t, '#8a92b8', skin, c);
  }
  // the iron strap over the toes, riveted
  const strap: PathFn = (cc) => {
    cc.beginPath();
    cc.moveTo(CX - 104, strapY(CX - 104) - 5);
    for (let x = CX - 104; x <= CX + 108; x += 6) cc.lineTo(x, strapY(x) - 5);
    for (let x = CX + 108; x >= CX - 104; x -= 6) cc.lineTo(x, strapY(x) + 5);
    cc.closePath();
  };
  panel(g, strap, { x: CX - 106, y: 198, w: 216, h: 22 }, 'iron', '#3e3c4c', { shadow: 0.6 });
  for (let i = 0; i < 7; i++) {
    const x = CX - 90 + i * 30;
    rivet(g, x, strapY(x), 2.4, '#8a8aa0');
  }
  // the greave: polished black iron with a long highlight down its lit side
  const gb = { x: CX - 98, y: -8, w: 196, h: 222 };
  contact(g, (cc) => {
    greave(cc);
    cc.fill();
  }, 0.8, 5, 8);
  paint(g, greave, gb, 'iron', shade(iron, 0.12));
  clip(g, greave, () => {
    g.fillStyle = lin(g, CX - 96, 0, CX + 96, 0, [
      [0, rgba('#000000', 0.5)],
      [0.14, rgba('#8a90b0', 0.2)],
      [0.26, rgba('#e0e6ff', 0.55)],
      [0.33, rgba('#8a90b0', 0.15)],
      [0.55, rgba('#000000', 0)],
      [0.84, rgba('#000000', 0.4)],
      [0.95, rgba('#4fb8ff', 0.2)],
      [1, rgba('#000000', 0.4)],
    ]);
    g.fillRect(gb.x, gb.y, gb.w, gb.h);
    blotches(g, gb, '#5a4a6a', 0.18, 18, 0.6, 0.2, 233);
    // plate seams, lapped, each with a row of rivets
    for (const y of [56, 118]) {
      const seam = (cc: Ctx) => {
        cc.moveTo(CX - 110, y);
        cc.quadraticCurveTo(CX, y + 22, CX + 110, y);
      };
      softStroke(g, (cc) => {
        cc.moveTo(CX - 110, y + 4);
        cc.quadraticCurveTo(CX, y + 26, CX + 110, y + 4);
      }, rgba('#000000', 0.55), 6, 3);
      crease(g, seam, 2.6, '#000000', 0.75, 0.3);
      for (let i = 0; i < 7; i++) {
        const x = CX - 84 + i * 28;
        const u = (x - CX) / 110;
        rivet(g, x, y + 7 + 11 * (1 - u * u), 3.2, '#9a9ab4');
      }
    }
    // the bident: an engraved channel with blue fire in it
    g.save();
    g.lineCap = 'round';
    const bid = (cc: Ctx) => {
      cc.moveTo(CX, 190);
      cc.lineTo(CX, 132);
      cc.moveTo(CX - 24, 112);
      cc.quadraticCurveTo(CX - 24, 134, CX, 134);
      cc.quadraticCurveTo(CX + 24, 134, CX + 24, 112);
    };
    g.beginPath();
    bid(g);
    g.strokeStyle = '#06060c';
    g.lineWidth = 7;
    g.stroke();
    g.beginPath();
    bid(g);
    g.strokeStyle = blue;
    g.lineWidth = 3.6;
    g.stroke();
    g.beginPath();
    bid(g);
    g.strokeStyle = '#e8fbff';
    g.lineWidth = 1.2;
    g.stroke();
    g.restore();
    for (const tx of [CX - 24, CX + 24]) {
      fill(g, (cc) => {
        cc.beginPath();
        cc.moveTo(tx - 5, 114);
        cc.lineTo(tx, 102);
        cc.lineTo(tx + 5, 114);
        cc.closePath();
      }, blue);
    }
    // a raised ridge down the front of the greave, lit on its left
    softStroke(g, (cc) => {
      cc.moveTo(CX - 2, -6);
      cc.quadraticCurveTo(CX - 3, 50, CX - 2, 100);
    }, rgba('#dfe6ff', 0.4), 3, 1.5);
    softStroke(g, (cc) => {
      cc.moveTo(CX + 4, -6);
      cc.quadraticCurveTo(CX + 3, 50, CX + 4, 100);
    }, rgba('#000000', 0.5), 4, 2);
    // blue firelight on the iron round the bident
    softFill(g, ell(CX, 150, 34, 50), rgba(blue, 0.16), 14, 'lighter');
  });
  hadesSkull(g, blue, false);
  lightAll(sil, 0.38, 18, 0.25);
  // his own fire lights his edges blue
  sil.edge(rgba(blue, 0.55), 3.5, LX * 3, LY * 3, 'lighter');
  sil.finish(inkOf(iron), { openTop: -5 });
}

registerStyle('hades', {
  contactY: 288,
  halfWidth: 108,
  rig: { from: 184, to: 204 },
  leg: { kind: 'wool', hw: 66, join: 'hem' },
  draw(ctx, art, p, o) {
    drawHades(ctx, art, p, o);
  },
});

export type { PartDef };
