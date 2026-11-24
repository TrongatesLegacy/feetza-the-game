// JÖRMUNGANDR, the world serpent (Act 8's Bifröst mini-boss), painted for his fight (src/game/bosses/jormRig.ts), his
// phase cards and his style art (src/content/style/jormungandr.ts). He has lain in the world-sea so long that his hide
// has turned to stone: great weathered slate plates, lichen in crusts, barnacles, salt crust in every crevice, weed and
// kelp caught on him. Where the flesh shows it's alive: a wet, dark-pink mouth, gums and tongue, and a pale ribbed
// throat and belly. His eyes are embers sunk deep under ledges of rock.
//
// His own marks (his story): a crown of rock spurs over two brow ledges that jut out like horns; two great lower tusks
// that close up outside his lip; the star of cracks Thor's hammer left on his left brow; the old tear where the god's
// hook ripped out of the left corner of his mouth, healed in a pale seam.
//
// Everything is in head units (texture px at the fight's display scale 1): the skull is SK.w × SK.h with its centre
// line at SK.cx. Lit by the Edge of the World (src/content/art/scene-jormungandr.ts): the wan green sun high on the
// left, the storm's cool fill, the void's violet glow from behind as a rim. The hide itself is ./jormHide.ts.

import { makeCanvas, type Ctx } from '../../art/util';
import { type Plate, type Pt, STONE, bump, clamp01, hexRGB, layPlates, maskOf, paintHide, smooth } from './jormHide';

export type { Pt };

const P2 = Math.PI * 2;
const INK = '#07080f';
const rgbaOf = (hex: string, a: number): string => {
  const [r, g, b] = hexRGB(hex);
  return `rgba(${r},${g},${b},${a})`;
};
function rngOf(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ——— the head's layout ———

/** The skull texture: the crown, brows, eyes, snout, upper lip and upper teeth. */
export const SK = { w: 600, h: 500, cx: 300 };
/** The jaw frames: the lower jaw (and the mouth inside) from skull y JAW.y0, JAW.h tall. */
export const JAW = { y0: 300, h: 460 };
/** How far the chin drops at a wide-open bite (skull units). */
export const DROP = 200;
/** The jaw frames' openings. */
export const JAW_OPEN = [0, 0.2, 0.45, 0.72, 1];
/** The eyes (the left one; the right mirrors it): centre, half sizes, the slant, and the eye frames' size. */
export const EYE = { x: 154, y: 206, rx: 34, ry: 17, tilt: 0.36, fw: 120, fh: 96 };
/** The nostrils (left). */
export const NOSE = { x: 266, y: 342 };
/** The lower tusks (left): x, and their length above the lip when closed. */
export const TUSK = { x: 176, len: 74, fw: 60, fh: 140 };
/** Kelp hanging off him: where each strand is caught (skull units), which kind, flipped. */
export const KELP: { x: number; y: number; kind: 0 | 1 | 2; flip: boolean }[] = [
  { x: 78, y: 170, kind: 0, flip: false },
  { x: 470, y: 100, kind: 1, flip: true },
  { x: 548, y: 300, kind: 2, flip: true },
];
/** The kelp frames: per kind, the frame size and where it's caught inside the frame. */
export const KELP_F: { w: number; h: number; ax: number; ay: number }[] = [
  { w: 120, h: 330, ax: 70, ay: 16 },
  { w: 150, h: 300, ax: 44, ay: 16 },
  { w: 110, h: 220, ax: 60, ay: 12 },
];

/** Half the mouth's width: narrower than the cheeks, so the head tapers to its muzzle. */
export const MOUTH = 212;

/** The upper lip's edge (where the stone ends and the gum starts) at x. */
export function lipY(x: number): number {
  const d = Math.min(1, Math.abs(x - SK.cx) / MOUTH);
  return 350 + 66 * Math.pow(1 - d * d, 0.85);
}
/** The lower lip's edge, closed. */
export const lowLipY = (x: number): number => lipY(x) + 10;
/** How much of the drop a point of the jaw takes (1 at the chin, 0 at the hinges). */
export function jawW(x: number): number {
  const d = Math.min(1, Math.abs(x - SK.cx) / (MOUTH + 8));
  return Math.pow(Math.max(0, 1 - d * d), 0.8);
}

/** The skull's silhouette, seen from in front (left half, from the middle of the crown down the side of the head, over
 * the ledge above the eye and down the cheek to the corner of the mouth; the lip closes it). A heavy bell: the crown
 * narrow and rocky, the cheeks wide over the jaws' hinges. */
const SKULL_L: Pt[] = [
  [300, 50], [272, 52], [246, 60], [222, 58], [198, 74], [176, 88], [156, 108], [134, 128], [116, 146], [96, 158], [74, 166],
  [70, 180], [80, 192], [68, 218], [52, 248], [38, 280], [32, 312], [50, 336], [84, 350],
];
/** The right half differs a little (weathering is never symmetric). */
const SKULL_R: Pt[] = [
  [330, 54], [356, 58], [380, 66], [404, 76], [426, 92], [446, 110], [468, 130], [486, 146], [506, 156], [528, 162],
  [532, 178], [520, 192], [534, 218], [548, 248], [562, 280], [568, 312], [550, 336], [516, 350],
];
/** The top of the head and snout: a long band of great shields from the crown down to the nose, its edges the ridges
 * over the eyes (left half, mirrored). */
const TOP_L: Pt[] = [[300, 56], [254, 60], [220, 80], [208, 128], [214, 190], [226, 258], [238, 316], [268, 330], [300, 332]];
export const topPts = (): Pt[] => [...TOP_L, ...TOP_L.slice(0, -1).reverse().map(([x, y]) => [2 * SK.cx - x, y] as Pt)];
/** The snout's front, from the band's near edge down to the lip. */
export const snoutPts = (): Pt[] => {
  const top: Pt[] = [[238, 316], [268, 330], [300, 332], [332, 330], [362, 316]];
  return [...top, [370, 360], ...lipPts(370, 230, 12), [230, 360]];
};
/** The tips that stay sharp. */
const SHARP = new Set(['84,350', '516,350', '74,166', '528,162']);

function lipPts(x0: number, x1: number, n: number, f = lipY, dy = 0): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    out.push([x, f(x) + dy]);
  }
  return out;
}

/** A polygon with its corners rounded, except the sharp ones. */
function roundPath(c: Ctx, pts: Pt[], sharp: Set<string>, r = 0.5): void {
  const n = pts.length;
  const mid = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const a = pts[(i - 1 + n) % n];
    const b = pts[(i + 1) % n];
    if (sharp.has(`${p[0]},${p[1]}`)) {
      if (i === 0) c.moveTo(p[0], p[1]);
      else c.lineTo(p[0], p[1]);
      continue;
    }
    const p0 = mid(p, a, r * 0.5);
    const p1 = mid(p, b, r * 0.5);
    if (i === 0) c.moveTo(p0[0], p0[1]);
    else c.lineTo(p0[0], p0[1]);
    c.quadraticCurveTo(p[0], p[1], p1[0], p1[1]);
  }
  c.closePath();
}

export const skullPts = (): Pt[] => [...SKULL_L, ...lipPts(SK.cx - MOUTH, SK.cx + MOUTH, 30), ...SKULL_R.slice().reverse()];
export const skullPath = (c: Ctx): void => roundPath(c, skullPts(), SHARP, 0.6);

// ——— shared painting bits ———

/** A dome over a mask: 0 at its edge rising to 1 inside (box-blurred coverage, so edges turn away like a body). */
function domeOf(mask: Uint8ClampedArray, w: number, h: number, r: number): Float32Array {
  const a = new Float32Array(w * h);
  for (let i = 0; i < a.length; i++) a[i] = mask[i] / 255;
  const tmp = new Float32Array(w * h);
  const pass = (src: Float32Array, dst: Float32Array, horiz: boolean) => {
    const n = horiz ? w : h;
    const m = horiz ? h : w;
    for (let j = 0; j < m; j++) {
      let acc = 0;
      const at = (k: number) => (horiz ? j * w + k : k * w + j);
      for (let k = -r; k <= r; k++) acc += src[at(Math.min(n - 1, Math.max(0, k)))] ?? 0;
      for (let k = 0; k < n; k++) {
        dst[at(k)] = acc / (2 * r + 1);
        const add = Math.min(n - 1, k + r + 1);
        const sub = Math.max(0, k - r);
        acc += src[at(add)] - src[at(sub)];
      }
    }
  };
  pass(a, tmp, true);
  pass(tmp, a, false);
  pass(a, tmp, true);
  pass(tmp, a, false);
  for (let i = 0; i < a.length; i++) a[i] = Math.sqrt(Math.max(0, Math.min(1, a[i] * 1.6)));
  return a;
}

/** A cluster of barnacles round (x, y): volcano cones of pale plates, a dark slit in each, a shadow on the plates. */
export function barnacles(c: Ctx, x: number, y: number, n: number, spread: number, size: number, seed: number, wetA = 0.8): void {
  const r = rngOf(seed);
  const list: [number, number, number][] = [];
  for (let i = 0; i < n * 3 && list.length < n; i++) {
    const a = r() * P2;
    const d = Math.sqrt(r()) * spread;
    const bx = x + Math.cos(a) * d;
    const by = y + Math.sin(a) * d * 0.8;
    const s = size * (0.45 + r() * 0.75);
    if (list.some(([px, py, ps]) => Math.hypot(px - bx, py - by) < (ps + s) * 0.7)) continue;
    list.push([bx, by, s]);
  }
  list.sort((a, b) => a[1] - b[1]);
  for (const [bx, by, s] of list) {
    // its shadow on the plates (light from the upper left)
    const sh = c.createRadialGradient(bx + s * 0.35, by + s * 0.45, 0, bx + s * 0.35, by + s * 0.45, s * 1.35);
    sh.addColorStop(0, 'rgba(4,5,12,0.55)');
    sh.addColorStop(1, 'rgba(4,5,12,0)');
    c.fillStyle = sh;
    c.fillRect(bx - s * 1.2, by - s, s * 3, s * 3);
    // the cone: a ring of plates, lit on the upper left
    c.save();
    c.translate(bx, by);
    const plates = 6;
    for (let k = 0; k < plates; k++) {
      const a0 = (k / plates) * P2 + r() * 0.2;
      const a1 = a0 + P2 / plates + 0.08;
      const lit = 0.5 + 0.5 * Math.cos(a0 + P2 / plates / 2 + 2.3);
      const col = `rgb(${Math.round(96 + lit * 96)},${Math.round(100 + lit * 96)},${Math.round(104 + lit * 84)})`;
      c.beginPath();
      c.moveTo(Math.cos(a0) * s * 0.36, Math.sin(a0) * s * 0.3);
      c.lineTo(Math.cos(a0) * s, Math.sin(a0) * s * 0.86);
      c.quadraticCurveTo(Math.cos((a0 + a1) / 2) * s * 1.08, Math.sin((a0 + a1) / 2) * s * 0.94, Math.cos(a1) * s, Math.sin(a1) * s * 0.86);
      c.lineTo(Math.cos(a1) * s * 0.36, Math.sin(a1) * s * 0.3);
      c.closePath();
      c.fillStyle = col;
      c.fill();
      c.strokeStyle = 'rgba(20,22,34,0.55)';
      c.lineWidth = Math.max(0.6, s * 0.07);
      c.stroke();
    }
    // the opening and its slit
    c.beginPath();
    c.ellipse(0, -s * 0.04, s * 0.26, s * 0.2, 0, 0, P2);
    c.fillStyle = '#3a3a44';
    c.fill();
    c.beginPath();
    c.moveTo(-s * 0.15, -s * 0.04);
    c.lineTo(s * 0.15, -s * 0.04);
    c.strokeStyle = '#05060c';
    c.lineWidth = Math.max(0.8, s * 0.1);
    c.stroke();
    // wet glint
    c.beginPath();
    c.ellipse(-s * 0.42, -s * 0.42, s * 0.2, s * 0.1, -0.7, 0, P2);
    c.fillStyle = `rgba(240,248,230,${0.7 * wetA})`;
    c.fill();
    c.restore();
  }
}

/** A limpet: a low ribbed cone. */
function limpet(c: Ctx, x: number, y: number, s: number): void {
  const g = c.createRadialGradient(x - s * 0.3, y - s * 0.35, 0, x, y, s);
  g.addColorStop(0, '#d6d2c4');
  g.addColorStop(0.6, '#8e8a84');
  g.addColorStop(1, '#3e3c44');
  c.beginPath();
  c.ellipse(x, y, s, s * 0.78, 0, 0, P2);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = 'rgba(10,10,18,0.6)';
  c.lineWidth = 1;
  c.stroke();
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * P2;
    c.beginPath();
    c.moveTo(x - s * 0.1, y - s * 0.12);
    c.lineTo(x + Math.cos(a) * s * 0.95, y + Math.sin(a) * s * 0.74);
    c.strokeStyle = 'rgba(40,38,48,0.35)';
    c.lineWidth = 0.8;
    c.stroke();
  }
}

/** Water running down the stone: thin bright wet runs with a bead at the end. */
function wetRuns(c: Ctx, pts: [number, number, number][], seed: number, a = 0.5): void {
  const r = rngOf(seed);
  c.save();
  c.lineCap = 'round';
  for (const [x, y, len] of pts) {
    let px = x;
    let py = y;
    c.beginPath();
    c.moveTo(px, py);
    const n = 6;
    for (let i = 1; i <= n; i++) {
      px += (r() - 0.5) * 3;
      py += len / n;
      c.lineTo(px, py);
    }
    c.strokeStyle = `rgba(214,228,236,${a * 0.5})`;
    c.lineWidth = 2.2;
    c.stroke();
    c.strokeStyle = `rgba(250,255,250,${a})`;
    c.lineWidth = 0.9;
    c.stroke();
    c.beginPath();
    c.ellipse(px, py + 1.5, 1.8, 2.4, 0, 0, P2);
    c.fillStyle = `rgba(240,250,255,${a})`;
    c.fill();
  }
  c.restore();
}

/** A tooth: root at (x, y), pointing down (dir 1) or up (−1), its curve and wear. Ivory, dark at the root, chipped. */
export function tooth(c: Ctx, x: number, y: number, len: number, w: number, dir: 1 | -1, bend: number, seed: number, broken = false): void {
  const r = rngOf(seed);
  const L = broken ? len * 0.55 : len;
  const tipX = x + bend * len * 0.3;
  const tipY = y + dir * L;
  c.save();
  // the tooth: a curved cone
  const path = () => {
    c.beginPath();
    c.moveTo(x - w / 2, y);
    c.quadraticCurveTo(x - w * 0.5 + bend * len * 0.1, y + dir * L * 0.55, broken ? tipX - w * 0.22 : tipX, tipY);
    if (broken) {
      // a jagged broken end
      c.lineTo(tipX - w * 0.05, tipY - dir * w * 0.18);
      c.lineTo(tipX + w * 0.1, tipY + dir * w * 0.06);
      c.lineTo(tipX + w * 0.25, tipY - dir * w * 0.12);
    }
    c.quadraticCurveTo(x + w * 0.5 + bend * len * 0.16, y + dir * L * 0.5, x + w / 2, y);
    c.closePath();
  };
  path();
  const g = c.createLinearGradient(x, y, x, tipY);
  g.addColorStop(0, '#4a3c24');
  g.addColorStop(0.2, '#9a8658');
  g.addColorStop(0.55, '#d0c098');
  g.addColorStop(1, broken ? '#bcae8a' : '#eadcb8');
  c.fillStyle = g;
  c.fill();
  c.save();
  path();
  c.clip();
  // the shaded right side (light from the upper left), the lit left edge
  const s = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  s.addColorStop(0, 'rgba(255,255,240,0.35)');
  s.addColorStop(0.35, 'rgba(255,255,240,0)');
  s.addColorStop(0.7, 'rgba(30,24,40,0.15)');
  s.addColorStop(1, 'rgba(30,24,40,0.55)');
  c.fillStyle = s;
  c.fillRect(x - w, Math.min(y, tipY) - 2, w * 2 + len * 0.4, Math.abs(tipY - y) + 4);
  // growth lines and a crack or two
  c.strokeStyle = 'rgba(90,70,40,0.35)';
  c.lineWidth = 0.8;
  for (let k = 0; k < 3; k++) {
    const t = 0.25 + k * 0.18 + r() * 0.05;
    c.beginPath();
    c.moveTo(x - w * 0.5, y + dir * L * t);
    c.quadraticCurveTo(x, y + dir * L * (t + 0.03), x + w * 0.5, y + dir * L * t);
    c.stroke();
  }
  if (r() < 0.6) {
    c.strokeStyle = 'rgba(60,44,30,0.6)';
    c.beginPath();
    c.moveTo(x + (r() - 0.5) * w * 0.4, y + dir * L * 0.3);
    c.lineTo(x + (r() - 0.5) * w * 0.3, y + dir * L * (0.55 + r() * 0.2));
    c.stroke();
  }
  c.restore();
  path();
  c.strokeStyle = 'rgba(16,10,12,0.85)';
  c.lineWidth = Math.max(1.1, w * 0.08);
  c.stroke();
  // a wet highlight down its lit side
  c.beginPath();
  c.moveTo(x - w * 0.22, y + dir * L * 0.2);
  c.quadraticCurveTo(x - w * 0.2 + bend * len * 0.05, y + dir * L * 0.55, tipX - w * 0.05, tipY - dir * L * 0.12);
  c.strokeStyle = 'rgba(255,255,248,0.75)';
  c.lineWidth = Math.max(1, w * 0.1);
  c.stroke();
  c.restore();
}

/** Wet flesh: a dark-pink gum band along a curve (top edge pts, its thickness), lumpy at the tooth roots. */
function gum(c: Ctx, top: Pt[], thick: number, dir: 1 | -1, roots: number[]): void {
  // a thick roll of wet flesh: swollen round each tooth's root, sagging between them, uneven along its length
  const edge: Pt[] = top.map(([x, y]) => {
    let bulge = 0;
    for (const rx of roots) bulge = Math.max(bulge, Math.max(0, 1 - Math.abs(x - rx) / 13));
    const wob = Math.sin(x * 0.09) * 2.2 + Math.sin(x * 0.23 + 1.3) * 1.4;
    return [x, y + dir * (thick + bulge * 7 + wob)];
  });
  const path = () => {
    c.beginPath();
    top.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    for (let i = edge.length - 1; i >= 0; i--) c.lineTo(edge[i][0], edge[i][1]);
    c.closePath();
  };
  path();
  c.fillStyle = '#6a1e2e';
  c.fill();
  c.save();
  path();
  c.clip();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const line = (f: number, col: string, w: number) => {
    c.beginPath();
    top.forEach(([x, y], i) => {
      const yy = y + (edge[i][1] - y) * f;
      if (i) c.lineTo(x, yy);
      else c.moveTo(x, yy);
    });
    c.strokeStyle = col;
    c.lineWidth = w;
    c.stroke();
  };
  // in the lip's shadow where it meets the stone, swelling pinker towards the teeth, a wet highlight along its roll
  line(0, 'rgba(14,2,6,0.85)', 9);
  line(0.62, 'rgba(178,74,88,0.7)', thick * 0.55);
  line(0.55, 'rgba(255,214,222,0.55)', 1.8);
  c.restore();
  path();
  c.strokeStyle = 'rgba(20,4,10,0.75)';
  c.lineWidth = 1.4;
  c.stroke();
  // beads of wet light
  c.save();
  for (let i = 3; i < top.length - 3; i += 4) {
    const [x, y] = top[i];
    const yy = y + (edge[i][1] - y) * 0.5;
    c.beginPath();
    c.ellipse(x + 2, yy, 2.4, 1.3, -0.2, 0, P2);
    c.fillStyle = 'rgba(255,240,244,0.75)';
    c.fill();
  }
  c.restore();
}

// ——— the skull ———

/** The upper teeth: x offset from the centre line, length, width, bend, broken. */
const UPPER_TEETH: [number, number, number, number, boolean][] = [
  [-224, 20, 12, 0.3, false], [-200, 34, 16, 0.3, false], [-170, 54, 21, 0.22, false], [-142, 24, 14, 0.15, false],
  [-102, 78, 29, 0.12, false], [-70, 30, 16, 0.08, false], [-48, 44, 19, 0.02, false], [-22, 22, 13, -0.05, false],
  [10, 36, 17, 0.05, false], [36, 24, 14, 0, false], [62, 40, 18, -0.08, false], [100, 82, 30, -0.14, false],
  [134, 34, 17, -0.1, true], [164, 50, 20, -0.2, false], [198, 28, 15, -0.25, false], [222, 20, 12, -0.3, false],
];
/** The lower teeth (rising from the lower gum): x offset, length, width, bend. (The tusks stand at ±TUSK.) */
const LOWER_TEETH: [number, number, number, number][] = [
  [-214, 18, 12, 0.2], [-192, 28, 15, 0.2], [-152, 16, 11, 0.1], [-92, 40, 18, 0.08], [-60, 20, 13, 0.02], [-34, 30, 15, -0.04],
  [-8, 16, 11, 0], [22, 26, 14, 0.06], [50, 34, 16, -0.02], [80, 18, 12, 0], [104, 42, 18, -0.08], [148, 20, 13, -0.12], [186, 30, 15, -0.18],
  [214, 16, 11, -0.22],
];

/** Point in polygon. */
function inPoly(x: number, y: number, pts: Pt[]): boolean {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function skullForm(dome: Float32Array, band: Float32Array, snout: Float32Array, w: number): (x: number, y: number) => number {
  const cx = SK.cx;
  return (x, y) => {
    const m = Math.abs(x - cx);
    const xm = cx - m; // mirrored to the left half
    const i = y * w + x;
    // the flanks curve away to the silhouette
    let H = dome[i] * 62;
    // the band of shields down the top: raised, its edges rounded ridges, rising a little towards the snout
    H += band[i] * (24 + (y - 56) * 0.04);
    // the snout's front: proud, facing us
    H += snout[i] * 26;
    // the eye sockets sink under the ledges
    H += bump(xm, y, EYE.x, EYE.y + 2, 52, 38, -36);
    // cheeks, swelling over the jaw hinge
    H += bump(xm, y, 84, 292, 76, 64, 20);
    // the nostrils
    H += bump(xm, y, NOSE.x, NOSE.y, 15, 12, -24);
    // the upper lip rolls over the gum
    H += bump(0, y, 0, lipY(x) - 10, 1, 14, 6) * (m < 240 ? 1 : 0);
    return H;
  };
}

function skullPlates(): Plate[] {
  const cx = SK.cx;
  // a serpent's head shields, laid out by hand and mirrored (down the top: the parietals, the frontal, prefrontals and
  // internasals; the snout's rostral and nasals; a ledge plate over each eye), a row of labial scales along the lip
  // and a row over it
  const fixed: [number, number, number][] = [
    [cx, 94, 44], [cx, 172, 62], [cx, 384, 58],
    [258, 108, 50], [234, 156, 42], [258, 236, 54], [270, 296, 44], [248, 352, 32], [146, 160, 44], [192, 112, 38],
  ];
  for (let x = 104; x < 232; x += 32) fixed.push([x, lipY(x) - 20, 30]);
  for (let x = 90; x < 214; x += 40) fixed.push([x, lipY(x) - 54, 38]);
  const top = topPts();
  const size = (u: number, v: number): number => {
    const m = Math.abs(u - cx);
    const xm = cx - m;
    let s = inPoly(u, v, top) ? 58 : xm < 130 && v > 230 ? 54 : 44;
    if (m > 150 && v < 160) s = 34;
    const de = Math.hypot(xm - EYE.x, (v - EYE.y) * 1.3);
    if (de < 90) s = Math.min(s, 14 + Math.max(0, de - 42) * 0.5);
    const dn = Math.hypot(xm - NOSE.x, v - NOSE.y);
    if (dn < 34) s = Math.min(s, 16 + dn * 0.4);
    return s;
  };
  return layPlates(91, 0, 0, SK.w, SK.h, size, { tries: 7000, lichen: 0.28, fixed, mirror: cx });
}

/** A polygon path. */
function polyPath(c: Ctx, pts: Pt[]): void {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
}

/** Paint something soft: drawn at half size with a blur, then laid over g with op. */
function soft(g: Ctx, w: number, h: number, draw: (c: Ctx) => void, op: GlobalCompositeOperation, blur = 10): void {
  const [c, x] = makeCanvas(w / 2, h / 2);
  x.scale(0.5, 0.5);
  x.filter = `blur(${blur / 2}px)`;
  draw(x);
  g.save();
  g.globalCompositeOperation = op;
  g.drawImage(c, 0, 0, w, h);
  g.restore();
}

/** The big shapes of light over the hide, as a painter lays them: the band of shields down the top in the sun, the
 * snout's face a step darker, the left flank lit and rolling under to the lip, the right in shade, each eye in a dark
 * hollow under its ledge, the ridges' lit and rim-lit edges. */
function formPass(g: Ctx): void {
  const cx = SK.cx;
  const snout = snoutPts();
  // shade: multiply
  soft(g, SK.w, SK.h, (x) => {
    const fl = x.createLinearGradient(40, 0, SK.w - 30, 0);
    fl.addColorStop(0, '#d8d8e8');
    fl.addColorStop(0.4, '#c4c2dc');
    fl.addColorStop(0.6, '#9a94c4');
    fl.addColorStop(1, '#7a72ac');
    x.fillStyle = fl;
    x.fillRect(0, 0, SK.w, SK.h);
    const un = x.createLinearGradient(0, 230, 0, 420);
    un.addColorStop(0, 'rgba(120,110,170,0)');
    un.addColorStop(1, 'rgba(110,100,166,0.75)');
    x.fillStyle = un;
    x.fillRect(0, 230, SK.w, 220);
    // the top of the head and snout facing up into the light: a soft lighter mass down the middle
    const tg = x.createRadialGradient(cx - 20, 210, 20, cx - 20, 210, 150);
    tg.addColorStop(0, 'rgba(255,255,255,0.85)');
    tg.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = tg;
    x.beginPath();
    x.ellipse(cx - 20, 200, 110, 170, 0, 0, P2);
    x.fill();
    // the snout's face: a step darker, its right side darker still
    polyPath(x, snout);
    const sg = x.createLinearGradient(cx - 70, 0, cx + 70, 0);
    sg.addColorStop(0, 'rgba(200,196,226,0.4)');
    sg.addColorStop(0.5, 'rgba(180,174,214,0.5)');
    sg.addColorStop(1, 'rgba(140,130,190,0.7)');
    x.fillStyle = sg;
    x.fill();
    // the hollow each eye sits in, under its ledge, between the band and the cheek
    for (const s of [-1, 1]) {
      x.save();
      x.translate(cx + s * (cx - EYE.x), EYE.y - 4);
      x.rotate(s * -EYE.tilt);
      x.fillStyle = 'rgba(54,44,100,0.8)';
      x.beginPath();
      x.ellipse(0, 0, 66, 34, 0, 0, P2);
      x.fill();
      x.restore();
    }
    // the cheeks' lower halves turn under
    x.fillStyle = 'rgba(110,100,160,0.45)';
    x.beginPath();
    x.ellipse(70, 340, 70, 40, 0.3, 0, P2);
    x.ellipse(SK.w - 70, 340, 70, 40, -0.3, 0, P2);
    x.fill();
  }, 'multiply', 30);
  // light: screen
  soft(g, SK.w, SK.h, (x) => {
    // the sun down the top, strongest on its left
    const lg = x.createRadialGradient(cx - 50, 180, 10, cx - 50, 180, 150);
    lg.addColorStop(0, 'rgba(96,106,72,0.7)');
    lg.addColorStop(1, 'rgba(96,106,72,0)');
    x.fillStyle = lg;
    x.fillRect(0, 0, SK.w, SK.h);
    // the left ledge and the left cheek catching it
    const ld = x.createRadialGradient(120, 160, 4, 120, 160, 60);
    ld.addColorStop(0, 'rgba(80,90,60,0.6)');
    ld.addColorStop(1, 'rgba(80,90,60,0)');
    x.fillStyle = ld;
    x.fillRect(40, 90, 160, 140);
    const fl = x.createRadialGradient(90, 270, 10, 90, 270, 100);
    fl.addColorStop(0, 'rgba(70,78,56,0.55)');
    fl.addColorStop(1, 'rgba(70,78,56,0)');
    x.fillStyle = fl;
    x.fillRect(0, 100, 260, 260);
  }, 'screen', 18);
  // the snout's near edge catching the sun
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const edge = (pts: Pt[], col: string, w: number, dx = 0, dy = 0) => {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy)));
    g.strokeStyle = col;
    g.lineWidth = w;
    g.stroke();
  };
  edge(TOP_L.slice(6).concat(TOP_L.slice(6, -1).reverse().map(([x, y]) => [2 * cx - x, y] as Pt)), 'rgba(236,244,214,0.4)', 2);
  g.restore();
}

let skullCache: HTMLCanvasElement | null = null;

/** The skull (cached): its hide, sockets, nostrils, scars, barnacles, gum and upper teeth, outline and rim. */
export function paintSkull(): HTMLCanvasElement {
  if (skullCache) return skullCache;
  const { w, h, cx } = SK;
  const [c, g] = makeCanvas(w, h);
  const mask = maskOf(w, h, (m) => {
    skullPath(m);
    m.fill();
  });
  const dome = domeOf(mask, w, h, 34);
  const band = domeOf(maskOf(w, h, (m) => {
    polyPath(m, topPts());
    m.fill();
  }), w, h, 26);
  const snoutD = domeOf(maskOf(w, h, (m) => {
    polyPath(m, snoutPts());
    m.fill();
  }), w, h, 16);
  paintHide(g, {
    w,
    h,
    mask,
    form: skullForm(dome, band, snoutD, w),
    plates: skullPlates(),
    box: { x: 0, y: 0, w, h },
    cell: 32,
    crevice: 1.4,
    bevel: 7,
    relief: 7,
    shingle: 0.3,
    formK: 0.9,
    exposure: 1.35,
    seed: 41,
    gloss: 0.35,
  });
  g.save();
  skullPath(g);
  g.clip();
  formPass(g);
  // eye sockets: deep shadow under the ledges round the eye (the eye itself is a frame of its own, under the skull)
  for (const s of [-1, 1]) {
    const ex = cx + s * (cx - EYE.x);
    const sg = g.createRadialGradient(ex, EYE.y - 4, EYE.rx * 0.5, ex, EYE.y, EYE.rx * 1.7);
    sg.addColorStop(0, 'rgba(4,4,12,0.9)');
    sg.addColorStop(0.55, 'rgba(4,4,12,0.55)');
    sg.addColorStop(1, 'rgba(4,4,12,0)');
    g.fillStyle = sg;
    g.beginPath();
    g.ellipse(ex, EYE.y, EYE.rx * 1.8, EYE.ry * 2.4, 0, 0, P2);
    g.fill();
    // the brow ledge's cast shadow across the top of the socket
    const bs = g.createLinearGradient(0, EYE.y - 50, 0, EYE.y + 4);
    bs.addColorStop(0, 'rgba(4,4,12,0)');
    bs.addColorStop(0.6, 'rgba(4,4,12,0.45)');
    bs.addColorStop(1, 'rgba(4,4,12,0)');
    g.fillStyle = bs;
    g.beginPath();
    g.ellipse(ex - s * 6, EYE.y - 20, EYE.rx * 1.5, 26, s * 0.2, 0, P2);
    g.fill();
  }
  // nostrils: dark comma-shaped slits curling out under a raised ridge of plate, where the steam comes from
  for (const s of [-1, 1]) {
    const nx = cx + s * (cx - NOSE.x);
    g.save();
    g.translate(nx, NOSE.y);
    g.scale(s, 1);
    const slit = (c: Ctx) => {
      c.beginPath();
      c.moveTo(6, -6);
      c.bezierCurveTo(-4, -10, -14, -4, -12, 6);
      c.bezierCurveTo(-11, 12, -4, 12, -2, 6);
      c.bezierCurveTo(0, 0, 4, -2, 6, -6);
      c.closePath();
    };
    // the ridge over it, catching the light
    g.beginPath();
    g.moveTo(10, -10);
    g.bezierCurveTo(-2, -18, -18, -10, -18, 4);
    g.strokeStyle = 'rgba(4,4,12,0.5)';
    g.lineWidth = 5;
    g.stroke();
    g.strokeStyle = 'rgba(226,236,214,0.5)';
    g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(10, -12);
    g.bezierCurveTo(-2, -20, -18, -12, -19, 2);
    g.stroke();
    slit(g);
    const ng = g.createLinearGradient(0, -8, 0, 12);
    ng.addColorStop(0, '#020104');
    ng.addColorStop(1, '#1e0c14');
    g.fillStyle = ng;
    g.fill();
    // its wet lower lip
    g.beginPath();
    g.moveTo(-11, 8);
    g.bezierCurveTo(-8, 13, -3, 12, -1, 7);
    g.strokeStyle = 'rgba(200,170,180,0.5)';
    g.lineWidth = 1.2;
    g.stroke();
    g.restore();
  }
  thorsMark(g);
  hookScar(g);
  // barnacles and limpets where the sea has settled on him
  barnacles(g, 70, 286, 11, 34, 11, 3);
  barnacles(g, 536, 148, 7, 24, 9, 5);
  barnacles(g, 530, 318, 8, 26, 10, 7);
  barnacles(g, 420, 98, 5, 12, 6, 11);
  barnacles(g, 232, 384, 3, 8, 5, 13);
  barnacles(g, 128, 108, 4, 10, 6, 17);
  limpet(g, 96, 214, 6);
  limpet(g, 498, 226, 5);
  limpet(g, 356, 150, 5);
  // salt dried in dribbles under the ledges, and water running off the snout
  saltDribbles(g);
  wetRuns(g, [[278, 258, 40], [318, 270, 36], [300, 300, 30], [240, 236, 28], [364, 240, 34], [190, 270, 30], [420, 276, 26]], 23, 0.5);
  g.restore();
  // the gum and the upper teeth hanging below the lip
  const top = lipPts(SK.cx - MOUTH + 6, SK.cx + MOUTH - 6, 46, lipY, -1);
  gum(g, top, 17, 1, UPPER_TEETH.map(([dx]) => cx + dx));
  for (const [dx, len, tw, bend, broken] of UPPER_TEETH.filter(([d]) => Math.abs(d) <= MOUTH - 12)) {
    const x = cx + dx;
    const k = 0.7 + 0.3 * jawW(x);
    tooth(g, x, lipY(x) + 10, len * k, tw * k, 1, bend, 300 + dx, broken);
  }
  // the eyes' openings, cut through (the eyes are under the skull, so the lids of stone overhang them)
  for (const sd of [-1, 1]) {
    const ex = cx + sd * (cx - EYE.x);
    g.save();
    g.translate(ex, EYE.y);
    if (sd > 0) g.scale(-1, 1);
    g.rotate(EYE.tilt);
    eyeShape(g, EYE.rx, EYE.ry);
    g.globalCompositeOperation = 'destination-out';
    g.fill();
    g.globalCompositeOperation = 'source-over';
    // the lids' rims: the upper heavy and dark, the lower catching a wet line of light
    eyeShape(g, EYE.rx, EYE.ry);
    g.strokeStyle = INK;
    g.lineWidth = 3.5;
    g.stroke();
    g.beginPath();
    g.moveTo(-EYE.rx * 0.8, EYE.ry * 0.7);
    g.quadraticCurveTo(0, EYE.ry * 1.35, EYE.rx * 0.85, EYE.ry * 0.45);
    g.strokeStyle = 'rgba(220,200,190,0.5)';
    g.lineWidth = 1.6;
    g.stroke();
    g.beginPath();
    g.moveTo(-EYE.rx - 2, 0);
    g.bezierCurveTo(-EYE.rx * 0.6, -EYE.ry * 1.6, EYE.rx * 0.55, -EYE.ry * 1.65, EYE.rx + 3, -4);
    g.strokeStyle = 'rgba(4,4,10,0.75)';
    g.lineWidth = 6;
    g.stroke();
    g.restore();
  }
  // the outline, then the void's violet rim on the right and under the ledges, the sun on the left
  g.save();
  skullPath(g);
  g.strokeStyle = INK;
  g.lineWidth = 4;
  g.stroke();
  g.clip();
  // the void's violet light round its far side, a broad soft wash and a crisp rim (round the silhouette, not along
  // the lip)
  g.beginPath();
  [[0, 0], [SK.w, 0], [SK.w, 360], ...lipPts(SK.cx + MOUTH, SK.cx - MOUTH, 30, lipY, -18), [0, 360]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.clip();
  g.translate(-5, -2);
  skullPath(g);
  g.lineWidth = 18;
  g.strokeStyle = rgbaOf('#9a88f0', 0.16);
  g.stroke();
  g.translate(2, 0.5);
  skullPath(g);
  g.lineWidth = 5;
  g.strokeStyle = rgbaOf('#c4b6ff', 0.6);
  g.stroke();
  g.restore();
  skullCache = c;
  return c;
}

/** The star of cracks Thor's hammer left on the left brow: a crushed pale heart, fractures running out, chips gone. */
function thorsMark(g: Ctx): void {
  // where the hammer struck: no hole, just the plate split three ways, each split forking as it runs, its edges
  // broken (a lit lip on the far side, the near side in shadow) and flakes knocked out along it
  const r = rngOf(77);
  const x0 = 236;
  const y0 = 146;
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const crackLine = (pts: Pt[], w: number) => {
    const draw = (dx: number, dy: number, col: string, lw: number) => {
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy)));
      g.strokeStyle = col;
      g.lineWidth = lw;
      g.stroke();
    };
    draw(1.8, 1.6, 'rgba(220,230,214,0.45)', w * 0.8);
    draw(-1, -0.8, 'rgba(4,4,12,0.45)', w * 1.6);
    draw(0, 0, 'rgba(2,2,8,0.95)', w);
  };
  const run = (x: number, y: number, a: number, len: number, w: number, depth: number) => {
    const pts: Pt[] = [[x, y]];
    let px = x;
    let py = y;
    const n = 6;
    for (let i = 0; i < n; i++) {
      a += (r() - 0.5) * 0.7;
      px += (Math.cos(a) * len) / n;
      py += (Math.sin(a) * len) / n;
      pts.push([px, py]);
      // a flake knocked out beside it
      if (r() < 0.3) {
        const fx = px + (r() - 0.5) * 6;
        const fy = py + (r() - 0.5) * 6;
        g.beginPath();
        g.moveTo(fx, fy);
        for (let k = 0; k < 4; k++) g.lineTo(fx + (r() - 0.5) * 9, fy + (r() - 0.5) * 7);
        g.closePath();
        g.fillStyle = 'rgba(30,32,44,0.75)';
        g.fill();
        g.strokeStyle = 'rgba(214,222,210,0.4)';
        g.lineWidth = 1;
        g.stroke();
      }
      if (depth < 1 && i === 2 && r() < 0.8) run(px, py, a + (r() < 0.5 ? -1 : 1) * (0.6 + r() * 0.4), len * 0.5, w * 0.6, depth + 1);
    }
    crackLine(pts, w);
  };
  run(x0, y0, -2.6, 70, 3.4, 0);
  run(x0, y0, 0.2, 58, 3, 0);
  run(x0, y0, 1.9, 46, 2.6, 0);
  g.restore();
}

/** The old tear where Thor's hook ripped free of the left corner of the mouth: a pale, puckered seam through the plates. */
function hookScar(g: Ctx): void {
  const pts: Pt[] = [[84, 352], [92, 334], [104, 322], [112, 304], [126, 292], [134, 276]];
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const line = (w: number, col: string, dx = 0, dy = 0) => {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy)));
    g.strokeStyle = col;
    g.lineWidth = w;
    g.stroke();
  };
  line(9, 'rgba(10,6,14,0.4)', 1.5, 2);
  line(7, '#5e5458');
  line(4, '#8a7c80');
  line(2, 'rgba(255,230,232,0.6)', -1.5, -1);
  // its puckered stitches of scar tissue
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const a = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2;
    g.beginPath();
    g.moveTo(mx - Math.cos(a) * 8, my - Math.sin(a) * 8);
    g.lineTo(mx + Math.cos(a) * 8, my + Math.sin(a) * 8);
    g.strokeStyle = 'rgba(70,30,40,0.6)';
    g.lineWidth = 1.4;
    g.stroke();
  }
  g.restore();
}

function saltDribbles(g: Ctx): void {
  const r = rngOf(55);
  g.save();
  g.lineCap = 'round';
  const at: [number, number][] = [[62, 166], [90, 172], [520, 170], [548, 166], [150, 118], [450, 118], [40, 300], [560, 300]];
  for (const [x, y] of at)
    for (let k = 0; k < 3; k++) {
      const x0 = x + (r() - 0.5) * 20;
      const len = 10 + r() * 22;
      g.beginPath();
      g.moveTo(x0, y);
      g.quadraticCurveTo(x0 + (r() - 0.5) * 6, y + len * 0.6, x0 + (r() - 0.5) * 4, y + len);
      g.strokeStyle = `rgba(236,240,240,${0.25 + r() * 0.25})`;
      g.lineWidth = 1.4 + r() * 1.6;
      g.stroke();
    }
  g.restore();
}

// ——— the lower jaw and the mouth ———

const JAW_L: Pt[] = [[84, 350], [80, 382], [100, 422], [142, 458], [200, 488], [252, 501], [300, 504]];
/** The lower jaw's outline (closed), in skull units. */
export function jawPath(c: Ctx): void {
  const top = lipPts(SK.cx - MOUTH, SK.cx + MOUTH, 30, lowLipY);
  const right = JAW_L.map(([x, y]) => [2 * SK.cx - x, y] as Pt);
  const pts: Pt[] = [...top, ...right, ...JAW_L.slice().reverse()];
  roundPath(c, pts, new Set(['84,350', '516,350']), 0.6);
}

let jawCache: HTMLCanvasElement | null = null;

/** The lower jaw, closed and unwarped (cached; skull coordinates from y JAW.y0): its hide, the pale ribbed underjaw,
 * the lower gum and teeth. */
function paintJawPiece(): HTMLCanvasElement {
  if (jawCache) return jawCache;
  const w = SK.w;
  const h = 300;
  const y0 = JAW.y0;
  const cx = SK.cx;
  const [c, g] = makeCanvas(w, h);
  const mask = maskOf(w, h, (m) => {
    m.translate(0, -y0);
    jawPath(m);
    m.fill();
  });
  const dome = domeOf(mask, w, h, 18);
  const flesh = (x: number, y: number): number => {
    const yy = y + y0;
    const m = Math.abs(x - cx);
    // the underjaw between the jaw's two branches: a wedge of pale ribbed throat widening to the chin's underside
    const edge = 16 + (yy - 450) * 0.7;
    return smooth(edge + 8, edge - 8, m) * smooth(440, 470, yy);
  };
  const ribs = (_x: number, y: number): number => {
    const f = ((y + y0) / 13) % 1;
    return 3 * smooth(0, 0.8, f) - 1;
  };
  paintHide(g, {
    w,
    h,
    mask,
    form: (x, y) => dome[y * w + x] * 46 + bump(x, y + y0, cx, 490, 120, 50, 10) + bump(x, y + y0, cx, lowLipY(x) + 14, 400, 12, 6),
    uv: (x, y, o) => {
      o[0] = x;
      o[1] = y + y0;
    },
    plates: layPlates(93, 0, y0, w, h, (u, v) => {
      const dl = v - lowLipY(u);
      return dl < 34 ? 18 + Math.max(0, dl) * 0.5 : 38;
    }, { tries: 6000, lichen: 0.25 }),
    box: { x: 0, y: y0, w, h },
    cell: 24,
    flesh,
    ribs,
    crevice: 1.4,
    relief: 6,
    shingle: 0.26,
    exposure: 1.18,
    seed: 43,
    wetDark: (_x, y) => smooth(470, 540, y + y0) * 0.4,
    gloss: 0.35,
    bevel: 6,
  });
  g.translate(0, -y0);
  barnacles(g, 120, 444, 7, 18, 8, 31);
  barnacles(g, 482, 436, 6, 16, 7, 33);
  barnacles(g, 262, 500, 4, 12, 5, 35);
  // outline
  g.save();
  jawPath(g);
  g.strokeStyle = INK;
  g.lineWidth = 4;
  g.stroke();
  g.clip();
  g.beginPath();
  [[0, 700], [SK.w, 700], [SK.w, 330], ...lipPts(SK.cx + MOUTH, SK.cx - MOUTH, 30, lowLipY, 18), [0, 330]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.clip();
  g.translate(-5, -3);
  jawPath(g);
  g.lineWidth = 16;
  g.strokeStyle = rgbaOf('#9a88f0', 0.14);
  g.stroke();
  g.translate(2, 1);
  jawPath(g);
  g.lineWidth = 4.5;
  g.strokeStyle = rgbaOf('#c4b6ff', 0.55);
  g.stroke();
  g.restore();
  // the lower gum along the lip, and the lower teeth standing up out of it
  const top = lipPts(SK.cx - MOUTH + 8, SK.cx + MOUTH - 8, 46, lowLipY, 1);
  gum(g, top, 13, -1, LOWER_TEETH.map(([dx]) => cx + dx));
  for (const [dx, len, tw, bend] of LOWER_TEETH.filter(([d]) => Math.abs(d) <= MOUTH - 14)) {
    const x = cx + dx;
    const k = 0.7 + 0.3 * jawW(x);
    tooth(g, x, lowLipY(x) - 8, len * k, tw * k, -1, bend, 500 + dx);
  }
  jawCache = c;
  return c;
}

/** The mouth inside, open by o (0…1), between the upper gum and the dropped lower gum. */
function paintMouth(g: Ctx, o: number): void {
  if (o <= 0.01) return;
  const cx = SK.cx;
  const drop = (x: number) => DROP * o * jawW(x);
  const top = (x: number) => lipY(x) + 6;
  const bot = (x: number) => lowLipY(x) - 6 + drop(x);
  const xs: number[] = [];
  for (let x = SK.cx - MOUTH + 2; x <= SK.cx + MOUTH - 2; x += 6) xs.push(x);
  const path = (c: Ctx) => {
    c.beginPath();
    xs.forEach((x, i) => (i ? c.lineTo(x, top(x)) : c.moveTo(x, top(x))));
    for (let i = xs.length - 1; i >= 0; i--) c.lineTo(xs[i], bot(xs[i]));
    c.closePath();
  };
  const mid = (top(cx) + bot(cx)) / 2;
  const hgt = bot(cx) - top(cx);
  g.save();
  path(g);
  const bg = g.createRadialGradient(cx, mid - hgt * 0.1, 4, cx, mid, 280);
  bg.addColorStop(0, '#0a0206');
  bg.addColorStop(0.25, '#2a0812');
  bg.addColorStop(0.6, '#561424');
  bg.addColorStop(1, '#7a2636');
  g.fillStyle = bg;
  g.fill();
  g.clip();
  // the palate: ridges curving with the upper jaw, lit along their crests
  for (let k = 1; k <= 4; k++) {
    const off = k * 13 * (0.6 + o * 0.6);
    if (off > hgt * 0.5) break;
    g.beginPath();
    xs.forEach((x, i) => {
      const y = top(x) + off * (0.4 + 0.6 * jawW(x));
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    });
    g.strokeStyle = 'rgba(40,6,16,0.55)';
    g.lineWidth = 5;
    g.stroke();
    g.strokeStyle = `rgba(226,128,140,${0.45 - k * 0.07})`;
    g.lineWidth = 1.6;
    g.stroke();
  }
  // the throat: a deep, dark hole into him
  const ty = top(cx) + hgt * 0.42;
  const tg = g.createRadialGradient(cx, ty, 2, cx, ty, 90 * o + 20);
  tg.addColorStop(0, 'rgba(2,0,4,0.98)');
  tg.addColorStop(0.5, 'rgba(14,2,8,0.85)');
  tg.addColorStop(1, 'rgba(30,4,12,0)');
  g.fillStyle = tg;
  g.beginPath();
  g.ellipse(cx, ty, 100 * o + 24, 64 * o + 14, 0, 0, P2);
  g.fill();
  // the tongue: long and muscular, lying back into the throat, its forked tips forward between the teeth
  const tb = bot(cx) - 6;
  const tt = ty + 4;
  const tw = 74;
  const tongue = (c: Ctx) => {
    c.beginPath();
    c.moveTo(cx - tw * 0.3, tt);
    c.bezierCurveTo(cx - tw * 0.7, tt + (tb - tt) * 0.4, cx - tw * 0.62, tb - 8, cx - tw * 0.36, tb);
    c.lineTo(cx - 4, tb - 14);
    c.lineTo(cx, tb - 26 * o);
    c.lineTo(cx + 4, tb - 14);
    c.lineTo(cx + tw * 0.36, tb);
    c.bezierCurveTo(cx + tw * 0.62, tb - 8, cx + tw * 0.7, tt + (tb - tt) * 0.4, cx + tw * 0.3, tt);
    c.closePath();
  };
  tongue(g);
  const tg2 = g.createLinearGradient(0, tt, 0, tb);
  tg2.addColorStop(0, '#24060e');
  tg2.addColorStop(0.35, '#5a1626');
  tg2.addColorStop(1, '#8a2e3e');
  g.fillStyle = tg2;
  g.fill();
  g.strokeStyle = 'rgba(16,2,6,0.8)';
  g.lineWidth = 2;
  g.stroke();
  // its groove, and a wet sheen along each side
  g.beginPath();
  g.moveTo(cx, tt + 10);
  g.quadraticCurveTo(cx + 2, (tt + tb) / 2, cx, tb - 16);
  g.strokeStyle = 'rgba(20,2,8,0.6)';
  g.lineWidth = 3;
  g.stroke();
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(cx + s * tw * 0.18, tt + (tb - tt) * 0.35);
    g.quadraticCurveTo(cx + s * tw * 0.3, tt + (tb - tt) * 0.6, cx + s * tw * 0.28, tb - 10);
    g.strokeStyle = 'rgba(255,200,210,0.35)';
    g.lineWidth = 3;
    g.stroke();
    g.strokeStyle = 'rgba(255,245,248,0.6)';
    g.lineWidth = 1;
    g.stroke();
  }
  // the deep corners of the gape, back in the dark
  for (const s of [-1, 1]) {
    const kx = cx + s * 200;
    const kg = g.createRadialGradient(kx, top(kx) + 12, 2, kx, top(kx) + 12, 90);
    kg.addColorStop(0, 'rgba(8,0,4,0.8)');
    kg.addColorStop(1, 'rgba(8,0,4,0)');
    g.fillStyle = kg;
    g.fillRect(kx - 100, top(kx) - 60, 200, 200);
  }
  // the lower jaw's inner flesh behind the teeth
  g.beginPath();
  xs.forEach((x, i) => (i ? g.lineTo(x, bot(x) - 14) : g.moveTo(x, bot(x) - 14)));
  for (let i = xs.length - 1; i >= 0; i--) g.lineTo(xs[i], bot(xs[i]) + 6);
  g.closePath();
  g.fillStyle = 'rgba(120,36,52,0.55)';
  g.fill();
  // strings of spit between the jaws, mid-gape
  if (o > 0.15 && o < 0.85) {
    const r = rngOf(Math.round(o * 100));
    const a = 1 - Math.abs(o - 0.45) / 0.4;
    for (let k = 0; k < 4; k++) {
      const x = cx + (r() - 0.5) * 300;
      const y0 = top(x) + 10;
      const y1 = bot(x) - 8;
      g.beginPath();
      g.moveTo(x, y0);
      g.quadraticCurveTo(x + (r() - 0.5) * 14, (y0 + y1) / 2 + 10, x + (r() - 0.5) * 10, y1);
      g.strokeStyle = `rgba(236,214,226,${0.55 * a})`;
      g.lineWidth = 1.4 + r() * 1.4;
      g.stroke();
      g.strokeStyle = `rgba(255,255,255,${0.7 * a})`;
      g.lineWidth = 0.7;
      g.stroke();
    }
  }
  g.restore();
}

/** A jaw frame (skull coordinates from JAW.y0; JAW.h tall): the mouth open by o, then the lower jaw dropped and bent
 * round its hinges (each column falls by its share of the drop, foreshortening a little as it swings forward). */
export function paintJaw(g: Ctx, o: number): void {
  const piece = paintJawPiece();
  g.save();
  g.translate(0, -JAW.y0);
  paintMouth(g, o);
  g.restore();
  const step = 2;
  for (let x = 0; x < SK.w; x += step) {
    const d = DROP * o * jawW(x + step / 2);
    const sq = 1 - 0.12 * o * jawW(x + step / 2);
    g.drawImage(piece, x, 0, step, piece.height, x, d, step + 0.6, piece.height * sq);
  }
}

// ——— the tusk, the eyes, the lids ———

/** A lower tusk (the left one; the right is flipped), its root at (TUSK.fw/2, TUSK.fh − 14) in its frame. */
export function paintTusk(g: Ctx): void {
  const x = TUSK.fw / 2;
  const y = TUSK.fh - 14;
  // a heavy, curving, yellowed tusk, worn and chipped, a barnacle at its root
  tooth(g, x, y, TUSK.len + 40, 30, -1, 0.35, 911);
  g.save();
  g.beginPath();
  g.ellipse(x, y + 2, 16, 6, 0, 0, P2);
  const gg = g.createLinearGradient(0, y - 6, 0, y + 12);
  gg.addColorStop(0, '#7a2a38');
  gg.addColorStop(1, '#3a0c18');
  g.fillStyle = gg;
  g.fill();
  g.restore();
}

/** The eye's opening (centred, unslanted). */
function eyeShape(c: Ctx, rx: number, ry: number): void {
  c.beginPath();
  c.moveTo(-rx, 2);
  c.bezierCurveTo(-rx * 0.6, -ry * 1.25, rx * 0.55, -ry * 1.3, rx, -2);
  c.bezierCurveTo(rx * 0.6, ry * 1.1, -rx * 0.55, ry * 1.15, -rx, 2);
  c.closePath();
}

/**
 * An eye frame (the left eye, EYE.fw × EYE.fh, the eye at its centre): 0 open and glaring, 1 drawing breath (the
 * pupil a hair, the ember flaring), 2 and 3 rolled up and away, dazed (the pupil wide, the glow sunk).
 */
export function paintEye(g: Ctx, kind: number): void {
  const { rx, ry, fw, fh, tilt } = EYE;
  g.save();
  g.translate(fw / 2, fh / 2);
  g.rotate(tilt);
  // the socket's wet rim
  eyeShape(g, rx + 4, ry + 4);
  g.fillStyle = '#1a0a10';
  g.fill();
  g.save();
  eyeShape(g, rx, ry);
  g.clip();
  // the globe: an ember behind amber glass
  const dazed = kind >= 2;
  const ix = dazed ? (kind === 2 ? -10 : 8) : 3;
  const iy = dazed ? -16 : 2;
  const glow = kind === 1 ? 1.25 : dazed ? 0.55 : 1;
  const sg = g.createRadialGradient(ix, iy + 6, 2, ix, iy, rx * 1.2);
  sg.addColorStop(0, `rgb(${Math.round(255)},${Math.round(196 * Math.min(1, glow))},${Math.round(90 * glow)})`);
  sg.addColorStop(0.35, `rgb(${Math.round(236 * Math.min(1, glow))},${Math.round(124 * glow)},${Math.round(24 * glow)})`);
  sg.addColorStop(0.75, '#7a2a08');
  sg.addColorStop(1, '#2a0804');
  g.fillStyle = sg;
  g.fillRect(-rx - 4, -ry - 6, rx * 2 + 8, ry * 2 + 12);
  // fibres in the iris, radiating
  g.save();
  g.translate(ix, iy);
  for (let k = 0; k < 40; k++) {
    const a = (k / 40) * P2;
    g.beginPath();
    g.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
    g.lineTo(Math.cos(a) * (rx * 0.95), Math.sin(a) * (rx * 0.95));
    g.strokeStyle = k % 2 ? 'rgba(255,220,140,0.18)' : 'rgba(90,24,4,0.25)';
    g.lineWidth = 1.1;
    g.stroke();
  }
  // the limbal ring
  g.beginPath();
  g.arc(0, 0, rx * 0.92, 0, P2);
  g.strokeStyle = 'rgba(40,8,2,0.7)';
  g.lineWidth = 4;
  g.stroke();
  // the pupil: a slit (a hair while he draws breath, wide when dazed)
  const pw = kind === 1 ? 2.2 : dazed ? 9 : 4.5;
  const ph = dazed ? ry * 1.1 : ry * 1.5;
  g.beginPath();
  g.ellipse(0, 0, pw, ph, 0, 0, P2);
  g.fillStyle = '#050102';
  g.fill();
  g.beginPath();
  g.ellipse(0, 0, pw + 2.5, ph + 1, 0, 0, P2);
  g.strokeStyle = 'rgba(255,170,60,0.35)';
  g.lineWidth = 2;
  g.stroke();
  g.restore();
  // the ledge's shadow over the top of the eye, depth at the corners
  const top = g.createLinearGradient(0, -ry - 4, 0, ry * 0.4);
  top.addColorStop(0, 'rgba(6,2,4,0.85)');
  top.addColorStop(0.5, 'rgba(6,2,4,0.3)');
  top.addColorStop(1, 'rgba(6,2,4,0)');
  g.fillStyle = top;
  g.fillRect(-rx - 4, -ry - 6, rx * 2 + 8, ry * 2 + 12);
  for (const s of [-1, 1]) {
    const cg = g.createRadialGradient(s * rx, 0, 0, s * rx, 0, rx * 0.55);
    cg.addColorStop(0, 'rgba(10,2,4,0.7)');
    cg.addColorStop(1, 'rgba(10,2,4,0)');
    g.fillStyle = cg;
    g.fillRect(-rx - 4, -ry - 6, rx * 2 + 8, ry * 2 + 12);
  }
  g.restore();
  // the wet glass: a bright window highlight and a pinpoint, a rim of light along the lower lid
  g.beginPath();
  g.ellipse(-rx * 0.38, -ry * 0.25, rx * 0.16, ry * 0.2, -0.5, 0, P2);
  g.fillStyle = 'rgba(255,250,236,0.85)';
  g.fill();
  g.beginPath();
  g.arc(rx * 0.12, ry * 0.32, 1.8, 0, P2);
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.fill();
  g.beginPath();
  g.moveTo(-rx * 0.7, ry * 0.55);
  g.quadraticCurveTo(0, ry * 1.05, rx * 0.75, ry * 0.4);
  g.strokeStyle = 'rgba(255,210,170,0.45)';
  g.lineWidth = 1.4;
  g.stroke();
  eyeShape(g, rx + 4, ry + 4);
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.stroke();
  g.restore();
}

/** An eyelid frame (k 0 open … 3 shut): a lid of stone hide sliding down over the eye, its wet edge. */
export function paintLid(g: Ctx, k: number): void {
  const { rx, ry, fw, fh, tilt } = EYE;
  if (k <= 0) return;
  const t = k / 3;
  g.save();
  g.translate(fw / 2, fh / 2);
  g.rotate(tilt);
  eyeShape(g, rx + 4, ry + 4);
  g.clip();
  const edge = -ry - 6 + (ry * 2 + 12) * t;
  g.beginPath();
  g.moveTo(-rx - 8, -ry - 10);
  g.lineTo(rx + 8, -ry - 10);
  g.lineTo(rx + 8, edge - 4);
  g.quadraticCurveTo(0, edge + 8 * (1 - t * 0.6), -rx - 8, edge - 2);
  g.closePath();
  const lg = g.createLinearGradient(0, -ry - 8, 0, edge + 6);
  lg.addColorStop(0, '#2a3044');
  lg.addColorStop(0.7, '#4e566c');
  lg.addColorStop(1, '#6a7286');
  g.fillStyle = lg;
  g.fill();
  // scales on the lid
  for (let i = -3; i <= 3; i++) {
    g.beginPath();
    g.arc(i * 12, edge - 10, 7, 0, Math.PI);
    g.strokeStyle = 'rgba(10,12,22,0.5)';
    g.lineWidth = 1.2;
    g.stroke();
  }
  g.beginPath();
  g.moveTo(-rx - 8, edge - 2);
  g.quadraticCurveTo(0, edge + 8 * (1 - t * 0.6), rx + 8, edge - 4);
  g.strokeStyle = '#4a1420';
  g.lineWidth = 3.5;
  g.stroke();
  g.strokeStyle = 'rgba(255,200,200,0.4)';
  g.lineWidth = 1;
  g.stroke();
  g.restore();
}

/** The ember glow over an eye (additive). */
export function paintGlow(g: Ctx, s: number): void {
  const rg = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  rg.addColorStop(0, 'rgba(255,170,70,0.75)');
  rg.addColorStop(0.3, 'rgba(255,120,30,0.35)');
  rg.addColorStop(1, 'rgba(255,80,10,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, s, s);
}

// ——— the neck ———

/** The neck's tile: NECK.w wide, repeating every NECK.h down (a column of stone-plated hide, the pale ribbed throat
 * down its front). */
export const NECK = { w: 320, h: 200, r: 154 };

let neckCache: HTMLCanvasElement | null = null;

/** The neck's tile (cached). Its plates are laid on the unrolled cylinder, so they narrow as it turns away. */
export function paintNeck(): HTMLCanvasElement {
  if (neckCache) return neckCache;
  const { w, h, r } = NECK;
  const cx = w / 2;
  const [c, g] = makeCanvas(w, h);
  const mask = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const e = r + 0.5 - Math.abs(x + 0.5 - cx);
      mask[y * w + x] = Math.round(255 * clamp01(e));
    }
  const unroll = (x: number) => cx + r * Math.asin(Math.max(-1, Math.min(1, (x + 0.5 - cx) / r)));
  // ribs (the throat's scutes): 8 to a tile of uneven widths, each overlapping the one below
  const sr = rngOf(83);
  const sizes = Array.from({ length: 8 }, () => 0.7 + sr() * 0.6);
  const tot = sizes.reduce((a, b) => a + b, 0);
  const bounds: number[] = [0];
  for (const z of sizes) bounds.push(bounds[bounds.length - 1] + (z / tot) * h);
  const scuteAt = (y: number): number => {
    const yy = ((y % h) + h) % h;
    for (let i = 0; i < 8; i++) if (yy < bounds[i + 1]) return (yy - bounds[i]) / (bounds[i + 1] - bounds[i]);
    return 0;
  };
  paintHide(g, {
    w,
    h,
    mask,
    form: (x) => 74 * Math.sqrt(Math.max(0, 1 - ((x + 0.5 - cx) / r) ** 2)),
    uv: (x, y, o) => {
      o[0] = unroll(x);
      o[1] = y;
    },
    plates: layPlates(97, 0, 0, Math.round(cx + r * Math.PI / 2) + 10, h, (u) => (Math.abs(u - cx) > 150 ? 32 : 40), { wrapH: h, tries: 3000, lichen: 0.3 }),
    box: { x: 0, y: 0, w: Math.round(cx + r * Math.PI / 2) + 10, h },
    cell: 32,
    wrapH: h,
    flesh: (_x, _y, u) => smooth(96, 80, Math.abs(u - cx)),
    // (each scute curving round the throat: its seam sags in the middle)
    ribs: (x, y) => {
      const f = scuteAt(y - 7 * (1 - ((x + 0.5 - cx) / 80) ** 2));
      return 2 * smooth(0, 0.85, f) - 1 * smooth(0.85, 1, f);
    },
    crevice: 1.4,
    bevel: 6,
    relief: 6,
    shingle: 0.3,
    exposure: 1.3,
    formK: 1,
    gloss: 0.35,
    seed: 47,
  });
  // the scutes' seams across the throat, lit on their lower lips
  g.save();
  for (let k = 0; k <= 8; k++) {
    const y = bounds[k];
    g.beginPath();
    g.moveTo(cx - 80, y - 1);
    g.quadraticCurveTo(cx, y + 13, cx + 80, y - 1);
    g.strokeStyle = 'rgba(50,30,60,0.35)';
    g.lineWidth = 2;
    g.stroke();
    g.beginPath();
    g.moveTo(cx - 72, y - 3.5);
    g.quadraticCurveTo(cx, y + 10, cx + 72, y - 3.5);
    g.strokeStyle = 'rgba(255,240,236,0.18)';
    g.lineWidth = 1.2;
    g.stroke();
  }
  // the big shapes of light: the left side in the sun, the right in shade with the void's rim on its edge
  const sh = g.createLinearGradient(cx - r, 0, cx + r, 0);
  sh.addColorStop(0, 'rgba(255,255,255,0)');
  sh.addColorStop(0.5, 'rgba(255,255,255,0)');
  sh.addColorStop(0.85, 'rgba(90,80,150,0.4)');
  sh.addColorStop(1, 'rgba(60,50,120,0.55)');
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = sh;
  g.fillRect(0, 0, w, h);
  // the throat a step down, so it reads as pale flesh in the stone's light, not a white ladder
  const th = g.createLinearGradient(cx - 90, 0, cx + 90, 0);
  th.addColorStop(0, 'rgba(255,255,255,1)');
  th.addColorStop(0.2, 'rgba(176,156,186,1)');
  th.addColorStop(0.8, 'rgba(150,130,170,1)');
  th.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = th;
  g.fillRect(cx - 90, 0, 180, h);
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = INK;
  g.fillRect(cx - r - 3, 0, 4, h);
  g.fillRect(cx + r - 1, 0, 4, h);
  g.fillStyle = rgbaOf('#b8a8ff', 0.55);
  g.fillRect(cx + r - 5, 0, 3, h);
  g.restore();
  neckCache = c;
  return c;
}

/** Water streaming down the neck (a tile NECK.w × 256, repeating down; scrolled to run). */
export function paintNeckWater(g: Ctx): void {
  const { w, r } = NECK;
  const h = 256;
  const cx = w / 2;
  const rr = rngOf(61);
  g.save();
  g.lineCap = 'round';
  for (let k = 0; k < 26; k++) {
    const x = cx + (rr() * 2 - 1) * r * 0.92;
    const y0 = rr() * h;
    const len = 40 + rr() * 120;
    const a = 0.18 + rr() * 0.3;
    for (const off of [-h, 0, h]) {
      const y = y0 + off;
      const gr = g.createLinearGradient(0, y, 0, y + len);
      gr.addColorStop(0, `rgba(220,232,240,0)`);
      gr.addColorStop(0.4, `rgba(220,232,240,${a})`);
      gr.addColorStop(1, `rgba(240,248,255,${a * 1.4})`);
      g.strokeStyle = gr;
      g.lineWidth = 1.2 + rr() * 2.4;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + (rr() - 0.5) * 6, y + len * 0.5, x + (rr() - 0.5) * 4, y + len);
      g.stroke();
      g.fillStyle = `rgba(250,252,255,${a * 1.6})`;
      g.beginPath();
      g.ellipse(x, y + len + 2, 1.6, 2.6, 0, 0, P2);
      g.fill();
    }
  }
  g.restore();
}

// ——— kelp ———

/**
 * A kelp frame (kind 0: a long strap of oarweed with ruffled edges; 1: a draped tangle of bladderwrack, its air
 * bladders in pairs; 2: a hank of thin wrack and torn weed), swaying at phase ph (0…1 loops), caught at its anchor
 * (KELP_F[kind].ax, ay) and hanging down. A bead of water swells at the tip.
 */
export function paintKelp(g: Ctx, kind: number, ph: number): void {
  const F = KELP_F[kind];
  const r = rngOf(400 + kind * 31);
  const strands: { len: number; w: number; dx: number; lag: number; amp: number; blade: boolean }[] =
    kind === 0
      ? [{ len: F.h - 40, w: 42, dx: 0, lag: 0, amp: 22, blade: true }, { len: F.h * 0.6, w: 18, dx: 10, lag: 0.2, amp: 18, blade: true }]
      : kind === 1
        ? [{ len: F.h - 30, w: 13, dx: 0, lag: 0, amp: 14, blade: false }, { len: F.h * 0.75, w: 11, dx: 20, lag: 0.15, amp: 16, blade: false }, { len: F.h * 0.5, w: 10, dx: -12, lag: 0.3, amp: 12, blade: false }]
        : [{ len: F.h - 26, w: 8, dx: 0, lag: 0, amp: 12, blade: true }, { len: F.h * 0.8, w: 6, dx: 10, lag: 0.25, amp: 14, blade: true }, { len: F.h * 0.6, w: 7, dx: -8, lag: 0.4, amp: 10, blade: true }, { len: F.h * 0.45, w: 5, dx: 18, lag: 0.1, amp: 10, blade: true }];
  const T = ph * P2;
  for (const st of strands) {
    const n = 26;
    const spine: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const sway = st.amp * Math.sin(T - s * 2.4 - st.lag * P2) * Math.pow(s, 1.4) + st.dx * s;
      const droop = (st.lag < 0.2 ? 16 : -12) * Math.sin(s * Math.PI * 0.85) + (st.lag - 0.2) * 40 * s * s;
      spine.push([F.ax + sway + st.dx * 0.3 + droop, F.ay + s * st.len * (1 - 0.06 * Math.sin(s * Math.PI))]);
    }
    const left: Pt[] = [];
    const right: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const [x0, y0] = spine[Math.max(0, i - 1)];
      const [x1, y1] = spine[Math.min(n, i + 1)];
      const l = Math.hypot(x1 - x0, y1 - y0) || 1;
      const nx = (y1 - y0) / l;
      const ny = -(x1 - x0) / l;
      // a strap: narrow at the stipe, broadest past the middle, a ragged torn end; ruffled edges
      const prof = st.blade ? Math.sin(Math.min(1, s * 1.25) * Math.PI * 0.92) * (0.35 + s * 0.65) : 0.55 + 0.45 * Math.sin(s * Math.PI);
      const ruf = st.blade ? Math.sin(s * 48 + T * 2 + st.lag * 9) * 1.6 : 0;
      const hw = (st.w / 2) * Math.max(0.12, prof) + ruf;
      const [x, y] = spine[i];
      left.push([x + nx * hw, y + ny * hw]);
      right.push([x - nx * hw, y - ny * hw]);
    }
    g.beginPath();
    left.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
    g.closePath();
    const gr = g.createLinearGradient(F.ax - st.w, 0, F.ax + st.w, 0);
    gr.addColorStop(0, '#7a6e34');
    gr.addColorStop(0.45, '#4e4620');
    gr.addColorStop(1, '#262210');
    g.fillStyle = gr;
    g.globalAlpha = 0.88;
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(12,10,4,0.85)';
    g.lineWidth = 1.6;
    g.stroke();
    // translucent where it's thin, lit along its left edge, a midrib
    g.save();
    g.beginPath();
    left.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.strokeStyle = 'rgba(214,200,110,0.55)';
    g.lineWidth = 1.4;
    g.stroke();
    if (st.blade && st.w > 10) {
      g.beginPath();
      spine.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.strokeStyle = 'rgba(30,26,10,0.45)';
      g.lineWidth = 1.4;
      g.stroke();
    }
    // wet glints
    for (let k = 3; k < n; k += 5) {
      const [x, y] = left[k];
      g.beginPath();
      g.ellipse(x - 1 + (spine[k][0] - x) * 0.3, y, 1.4, 3.2, 0.2, 0, P2);
      g.fillStyle = 'rgba(240,236,200,0.55)';
      g.fill();
    }
    g.restore();
    // bladderwrack's air bladders in pairs
    if (!st.blade)
      for (let k = 6; k < n - 2; k += 9) {
        const [x, y] = spine[k];
        for (const sd of [-1, 1]) {
          const bx = x + sd * st.w * 0.45;
          const bg = g.createRadialGradient(bx - 1.5, y - 2, 0.5, bx, y, 6);
          bg.addColorStop(0, '#c8b45a');
          bg.addColorStop(0.5, '#7a6a2c');
          bg.addColorStop(1, '#2e280e');
          g.fillStyle = bg;
          g.beginPath();
          g.ellipse(bx, y, 3.2, 4.2, 0, 0, P2);
          g.fill();
          g.strokeStyle = 'rgba(12,10,4,0.8)';
          g.lineWidth = 1;
          g.stroke();
        }
      }
    // a bead of water at the tip, swelling as it sways
    const [tx, ty] = spine[n];
    const bead = 2 + 2.2 * ((ph * 2 + st.lag) % 1);
    g.beginPath();
    g.ellipse(tx, ty + bead * 0.6, bead * 0.8, bead, 0, 0, P2);
    g.fillStyle = 'rgba(220,234,244,0.8)';
    g.fill();
  }
  // where it's caught: a knot of it over the anchor
  g.beginPath();
  g.ellipse(F.ax, F.ay + 2, 9, 6, 0.3, 0, P2);
  g.fillStyle = '#3a341a';
  g.fill();
  g.strokeStyle = 'rgba(12,10,4,0.8)';
  g.lineWidth = 1.4;
  g.stroke();
  void r;
}

// ——— the coils ———

/** A coil's frame: its size, the waterline, the arch's centre, the centreline's half width and height, the body's
 * thickness. */
export const COIL = { w: 420, h: 290, base: 262, cx: 196, A: 118, B: 176, T: 104, n: 10, lean: 0.12 };
const COIL_R = (COIL.A + COIL.B) / 2;

/** Where a point of a coil's frame lies on its body: angle along the arch (0 the right foot … π the left), and the
 * offset across it (− towards the hollow under the arch, + its back). */
function coilUV(x: number, y: number, B: number): [number, number] {
  // (the arch leans: its crown is pushed over to the right)
  const ex = (x - COIL.lean * (COIL.base - y) - COIL.cx) / COIL.A;
  const ey = (COIL.base - y) / B;
  const th = Math.atan2(ey, ex);
  const rr = Math.hypot(ex, ey);
  const rl = Math.hypot(COIL.A * Math.cos(th), B * Math.sin(th));
  return [th, (rr - 1) * rl];
}

/** Is a point of a coil's frame on its body (above the water)? */
export function coilHit(x: number, y: number): boolean {
  if (y > COIL.base + 2) return false;
  const [th, rho] = coilUV(x, y, COIL.B);
  return th >= -0.05 && th <= Math.PI + 0.05 && Math.abs(rho) <= COIL.T / 2 + 3;
}

let coilPlates: Plate[] | null = null;

/**
 * A coil frame at phase ph (0…1 loops): a hump of the world serpent's body arching out of the sea. Its back is stone
 * plates with barnacles and weed, its underside along the hollow the pale ribbed belly; it heaves (plates rolling
 * forward and back along it, bunching and spreading), breathes, sheds water down its flanks and drips from its belly,
 * and the sea churns white where it breaks the surface.
 */
export function paintCoil(g: Ctx, ph: number): void {
  const { w, h, base, cx, A, T } = COIL;
  const TT = ph * P2;
  const B = COIL.B * (1 + 0.022 * Math.sin(TT));
  const roll = (u: number) => 7 * Math.sin(TT + u * 0.012);
  coilPlates ??= layPlates(131, -30, -T / 2 - 12, Math.PI * COIL_R + 60, T + 24, (_u, v) => (v < -T * 0.12 ? 0 : (Math.sin(_u * 0.03) > 0.2 ? 54 : v > T * 0.3 ? 44 : 32)), { tries: 5000, lichen: 0.32 });
  const lean = (c: Ctx) => c.transform(1, 0, -COIL.lean, 1, COIL.lean * base, 0);
  const mask = maskOf(w, h, (m) => {
    lean(m);
    m.beginPath();
    m.ellipse(cx, base, A + T / 2, B + T / 2, 0, Math.PI, 0);
    m.lineTo(cx + A - T / 2, base);
    m.ellipse(cx, base, A - T / 2, B - T / 2, 0, 0, Math.PI, true);
    m.closePath();
    m.fill();
  });
  const uv = (x: number, y: number, o: Pt) => {
    const [th, rho] = coilUV(x, y, B);
    const u = (Math.PI - th) * COIL_R;
    o[0] = u + roll(u);
    o[1] = rho;
  };
  const tmp: Pt = [0, 0];
  paintHide(g, {
    w,
    h,
    mask,
    form: (x, y) => {
      uv(x, y, tmp);
      const k = Math.max(0, 1 - (tmp[1] / (T / 2)) ** 2);
      return 58 * Math.sqrt(k);
    },
    uv,
    plates: coilPlates,
    box: { x: -30, y: -T / 2 - 12, w: Math.PI * COIL_R + 60, h: T + 24 },
    cell: 32,
    flesh: (_x, _y, _u, v) => smooth(-T * 0.2, -T * 0.32, v),
    ribs: (_x, _y, u) => {
      const f = (((u / 15) % 1) + 1) % 1;
      return 2.5 * smooth(0, 0.85, f) - 1.2 * smooth(0.85, 1, f);
    },
    crevice: 1.4,
    bevel: 6,
    relief: 6,
    shingle: 0.22,
    exposure: 1.3,
    gloss: 0.4,
    seed: 53,
    wetDark: (_x, y) => smooth(base - 60, base, y) * 0.9,
  });
  // the body's sun side and shade side, and the dark of the water it carries up
  g.save();
  g.globalCompositeOperation = 'source-atop';
  const sh = g.createLinearGradient(cx - A - T / 2, 0, cx + A + T / 2, 0);
  sh.addColorStop(0, 'rgba(255,255,255,0)');
  sh.addColorStop(0.55, 'rgba(40,30,90,0.1)');
  sh.addColorStop(1, 'rgba(30,20,80,0.4)');
  g.fillStyle = sh;
  g.fillRect(0, 0, w, h);
  g.restore();
  const at = (u: number, rho: number): Pt => {
    const th = Math.PI - (u - roll(u)) / COIL_R;
    const rl = Math.hypot(A * Math.cos(th), B * Math.sin(th));
    const k = 1 + rho / rl;
    const yy = base - B * Math.sin(th) * k;
    return [cx + A * Math.cos(th) * k + COIL.lean * (base - yy), yy];
  };
  // the body is a shade darker and colder than the head (it lies low in the sea), so the head stands out
  g.save();
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(40,30,90,0.24)';
  g.fillRect(0, 0, w, h);
  g.restore();
  // a ridge of blunt stone spines along its back, riding with it
  for (let u = 70; u < Math.PI * COIL_R - 60; u += 30) {
    const [x0, y0] = at(u, T / 2 - 3);
    const [x1, y1] = at(u + 1, T / 2 - 3);
    const l = Math.hypot(x1 - x0, y1 - y0) || 1;
    const nx = (y1 - y0) / l;
    const ny = -(x1 - x0) / l;
    const out = nx * (cx - x0) + ny * (base - y0) > 0 ? -1 : 1;
    const len = 13 + 5 * Math.sin(u * 0.37);
    const tx = x0 + nx * out * len;
    const ty = y0 + ny * out * len;
    const bx = (x1 - x0) / l;
    const by = (y1 - y0) / l;
    g.beginPath();
    g.moveTo(x0 - bx * 9, y0 - by * 9);
    g.quadraticCurveTo(tx - bx * 4, ty - by * 4, tx, ty);
    g.quadraticCurveTo(tx + bx * 2, ty + by * 2, x0 + bx * 8, y0 + by * 8);
    g.closePath();
    const sg = g.createLinearGradient(x0, y0, tx, ty);
    sg.addColorStop(0, '#3a4052');
    sg.addColorStop(1, '#7a8282');
    g.fillStyle = sg;
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.stroke();
  }
  // barnacles on its back, riding with the plates
  const br = rngOf(141);
  for (let i = 0; i < 5; i++) {
    const u = 110 + br() * 260;
    const [bx, by] = at(u, T * (0.18 + br() * 0.24));
    barnacles(g, bx, by, 3 + Math.floor(br() * 3), 10, 4.5, 150 + i);
  }
  // weed draped over its crown, hanging down its sides
  for (let i = 0; i < 4; i++) {
    const u = 150 + i * 60 + (i % 2) * 14;
    const [x0, y0] = at(u, T / 2 - 4);
    const len = 40 + ((i * 37) % 30);
    const side = u < (Math.PI * COIL_R) / 2 ? -1 : 1;
    g.beginPath();
    g.moveTo(x0, y0);
    const sw = Math.sin(TT + i) * 4;
    g.bezierCurveTo(x0 + side * 10, y0 + len * 0.3, x0 + side * 6 + sw, y0 + len * 0.7, x0 + side * 12 + sw, y0 + len);
    g.strokeStyle = '#2e2810';
    g.lineWidth = 7;
    g.stroke();
    g.strokeStyle = '#4e4620';
    g.lineWidth = 4;
    g.stroke();
    g.strokeStyle = 'rgba(210,196,110,0.5)';
    g.lineWidth = 1.2;
    g.stroke();
  }
  // water streaming down its flanks
  const wr = rngOf(171);
  g.save();
  g.lineCap = 'round';
  for (let i = 0; i < 22; i++) {
    const u0 = 60 + wr() * (Math.PI * COIL_R - 120);
    const side = u0 < (Math.PI * COIL_R) / 2 ? -1 : 1;
    const rho = (wr() - 0.3) * T * 0.8;
    const q = (ph * 1.5 + wr()) % 1;
    const len = 30 + wr() * 50;
    const u1 = u0 + side * len * q;
    const [x0, y0] = at(u0 + side * len * Math.max(0, q - 0.4), rho);
    const [x1, y1] = at(u1, rho);
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.strokeStyle = `rgba(220,232,244,${0.4 * Math.sin(q * Math.PI)})`;
    g.lineWidth = 1.6;
    g.stroke();
  }
  // drips falling from its belly into the hollow
  for (let i = 0; i < 5; i++) {
    const u = 120 + i * 40;
    const [x, y] = at(u, -T / 2 + 2);
    const q = (ph * 2 + i * 0.37) % 1;
    const dy = q * q * Math.max(10, base - y);
    g.beginPath();
    g.ellipse(x, y + dy, 1.6, 2.8, 0, 0, P2);
    g.fillStyle = `rgba(226,236,250,${0.85 * (1 - q * 0.6)})`;
    g.fill();
  }
  g.restore();
  // the outline
  g.save();
  lean(g);
  g.beginPath();
  g.ellipse(cx, base, A + T / 2, B + T / 2, 0, Math.PI, 0);
  g.moveTo(cx + A - T / 2, base);
  g.ellipse(cx, base, A - T / 2, B - T / 2, 0, 0, Math.PI, true);
  g.strokeStyle = INK;
  g.lineWidth = 3.6;
  g.stroke();
  // the void's violet light along its back
  g.beginPath();
  g.ellipse(cx, base, A + T / 2 - 3, B + T / 2 - 3, 0, Math.PI * 1.08, Math.PI * 1.92);
  g.strokeStyle = rgbaOf('#c0b4ff', 0.45);
  g.lineWidth = 2.4;
  g.stroke();
  g.restore();
  // the sea where it breaks the surface: a dark reflection under the arch, churning foam at both feet
  const rf = g.createLinearGradient(0, base, 0, base + 22);
  rf.addColorStop(0, 'rgba(6,8,20,0.5)');
  rf.addColorStop(1, 'rgba(6,8,20,0)');
  g.fillStyle = rf;
  g.fillRect(cx - A - T / 2 - 10, base, (A + T / 2) * 2 + 20, 22);
  for (const fx of [cx - A, cx + A]) foam(g, fx, base, T * 0.75, ph, fx < cx ? 1 : 2);
}

/** White water churning round something breaking the surface at (x, y), width wd, at phase ph. */
export function foam(g: Ctx, x: number, y: number, wd: number, ph: number, seed: number): void {
  const r = rngOf(900 + seed);
  g.save();
  // a ring of ripple round it
  g.beginPath();
  g.ellipse(x, y + 3, wd * 0.8, 8, 0, 0, P2);
  g.strokeStyle = 'rgba(200,204,240,0.22)';
  g.lineWidth = 2;
  g.stroke();
  for (let k = 0; k < 14; k++) {
    const q = (ph + k / 14) % 1;
    const a = r() * Math.PI;
    const bx = x + Math.cos(a) * wd * (0.45 + q * 0.4) * (r() < 0.5 ? -1 : 1);
    const by = y + 2 - Math.sin(q * Math.PI) * 6 + r() * 3;
    const rad = 3 + r() * 6 + q * 4;
    const fg = g.createRadialGradient(bx - rad * 0.3, by - rad * 0.3, 0, bx, by, rad);
    fg.addColorStop(0, `rgba(250,250,255,${0.75 * (1 - q)})`);
    fg.addColorStop(0.6, `rgba(220,220,246,${0.45 * (1 - q)})`);
    fg.addColorStop(1, 'rgba(200,200,240,0)');
    g.fillStyle = fg;
    g.beginPath();
    g.ellipse(bx, by, rad, rad * 0.62, 0, 0, P2);
    g.fill();
  }
  // a lace of foam on the water
  g.strokeStyle = 'rgba(236,236,255,0.45)';
  g.lineWidth = 1.2;
  for (let k = 0; k < 5; k++) {
    const q = (ph * 0.7 + k / 5) % 1;
    g.beginPath();
    g.ellipse(x + (r() - 0.5) * wd * 0.5, y + 5 + q * 4, wd * (0.3 + q * 0.4), 3 + q * 3, 0, 0, Math.PI);
    g.stroke();
  }
  g.restore();
}

// ——— the collar of foam, the splash, the cascade ———

/** The foam collar round the neck where it leaves the water (COLLAR.w × COLLAR.h, the neck's middle at cx, the
 * waterline at y), at phase ph. Drawn in front of the neck. */
export const COLLAR = { w: 400, h: 90, y: 44, n: 8 };
export function paintCollar(g: Ctx, ph: number): void {
  const cx = COLLAR.w / 2;
  const y = COLLAR.y;
  const rx = NECK.r + 26;
  const r = rngOf(77);
  // the front half of the ring: churning foam
  for (let k = 0; k < 34; k++) {
    const a = (k / 34) * Math.PI;
    const q = (ph + r()) % 1;
    const bx = cx + Math.cos(a) * rx * (0.96 + 0.08 * Math.sin(q * P2));
    const by = y + Math.sin(a) * 14 - Math.sin(q * Math.PI) * 8;
    const rad = 6 + r() * 9 + Math.sin(q * Math.PI) * 4;
    const fg = g.createRadialGradient(bx - rad * 0.3, by - rad * 0.4, 0, bx, by, rad);
    fg.addColorStop(0, `rgba(252,252,255,${0.85 - q * 0.4})`);
    fg.addColorStop(0.55, `rgba(214,214,244,${0.55 - q * 0.3})`);
    fg.addColorStop(1, 'rgba(190,190,236,0)');
    g.fillStyle = fg;
    g.beginPath();
    g.ellipse(bx, by, rad * 1.2, rad * 0.7, 0, 0, P2);
    g.fill();
  }
  // spray flung up and falling back
  for (let k = 0; k < 18; k++) {
    const q = (ph * 1.5 + r()) % 1;
    const a = r() * Math.PI;
    const bx = cx + Math.cos(a) * rx * (1 + q * 0.2);
    const by = y + Math.sin(a) * 10 - Math.sin(q * Math.PI) * 30;
    g.beginPath();
    g.arc(bx, by, 1.2 + r() * 1.6, 0, P2);
    g.fillStyle = `rgba(240,244,255,${0.8 * (1 - q)})`;
    g.fill();
  }
  // ripples running out
  for (let k = 0; k < 3; k++) {
    const q = (ph + k / 3) % 1;
    g.beginPath();
    g.ellipse(cx, y + 6, rx + 10 + q * 40, 16 + q * 10, 0, 0.05, Math.PI - 0.05);
    g.strokeStyle = `rgba(200,204,244,${0.35 * (1 - q)})`;
    g.lineWidth = 1.6;
    g.stroke();
  }
}

/** A splash frame (SPLASH.w × SPLASH.h, the water's surface at its foot), at u 0…1 of its life: a burst of water
 * thrown up in a crown of sheets and drops that climb, hang and fall back, a ring of foam spreading at its foot. */
export const SPLASH = { w: 300, h: 260, y: 236, n: 8 };
export function paintSplash(g: Ctx, u: number): void {
  const cx = SPLASH.w / 2;
  const y = SPLASH.y;
  const r = rngOf(313);
  const life = Math.sin(Math.min(1, u * 1.4) * Math.PI);
  const fade = 1 - Math.max(0, u - 0.55) / 0.45;
  // the crown of water: rounded columns thrown up and out, each breaking into a blob and beads at its head
  for (let k = 0; k < 9; k++) {
    const t = k / 8 - 0.5;
    const hgt = (100 + r() * 100) * (1 - Math.abs(t) * 0.7) * life;
    const spread = t * (70 + u * 150);
    const tipX = cx + spread * 1.3;
    const tipY = y - hgt;
    const wd = 12 + r() * 12;
    const fx = cx + spread * 0.45;
    g.beginPath();
    g.moveTo(fx - wd, y);
    g.bezierCurveTo(fx - wd * 0.9, y - hgt * 0.4, tipX - wd * 0.7, tipY + hgt * 0.25, tipX - wd * 0.45, tipY + wd * 0.3);
    g.arc(tipX, tipY + wd * 0.3, wd * 0.45, Math.PI, 0);
    g.bezierCurveTo(tipX + wd * 0.7, tipY + hgt * 0.25, fx + wd * 0.9, y - hgt * 0.4, fx + wd, y);
    g.closePath();
    const sg = g.createLinearGradient(fx - wd, 0, fx + wd, 0);
    sg.addColorStop(0, `rgba(250,252,255,${0.75 * fade})`);
    sg.addColorStop(0.5, `rgba(200,208,240,${0.35 * fade})`);
    sg.addColorStop(1, `rgba(170,176,226,${0.55 * fade})`);
    g.fillStyle = sg;
    g.fill();
    g.strokeStyle = `rgba(255,255,255,${0.6 * fade})`;
    g.lineWidth = 1.4;
    g.stroke();
    // the head breaking up into beads
    for (let b = 0; b < 4; b++) {
      const bx = tipX + (r() - 0.5) * wd * 2;
      const by = tipY - r() * 20 * life;
      g.beginPath();
      g.arc(bx, by, 2 + r() * 3, 0, P2);
      g.fillStyle = `rgba(244,248,255,${0.85 * fade})`;
      g.fill();
    }
  }
  // drops flung out on arcs
  for (let k = 0; k < 40; k++) {
    const vx = (r() - 0.5) * 260;
    const vy = -(160 + r() * 200);
    const t = u * 1.2;
    const dx = vx * t;
    const dy = vy * t + 380 * t * t;
    if (dy > 4) continue;
    const s = 1.4 + r() * 2.6;
    g.beginPath();
    g.ellipse(cx + dx, y + dy, s, s * 1.4, Math.atan2(vy + 760 * t, vx) + Math.PI / 2, 0, P2);
    g.fillStyle = `rgba(240,246,255,${0.9 * fade})`;
    g.fill();
  }
  // foam spreading at its foot
  foam(g, cx, y, 60 + u * 80, u, 5);
  const fr = g.createRadialGradient(cx, y, 4, cx, y, 70 + u * 70);
  fr.addColorStop(0, `rgba(240,242,255,${0.6 * fade})`);
  fr.addColorStop(1, 'rgba(220,224,250,0)');
  g.save();
  g.translate(cx, y);
  g.scale(1, 0.22);
  g.translate(-cx, -y);
  g.fillStyle = fr;
  g.beginPath();
  g.arc(cx, y, 70 + u * 70, 0, P2);
  g.fill();
  g.restore();
}

/** Water pouring off the head as it surfaces (a frame in skull units at half scale: SK.w/2 × SK.h/2 + JAW drop room),
 * u 0…1 from just breaking the surface to drained: sheets over the ledges, the snout and the cheeks, thinning to
 * streams, then to drips off the lip. */
export const CASCADE = { k: 0.5, n: 6 };
export function paintCascade(g: Ctx, u: number): void {
  const k = CASCADE.k;
  g.save();
  g.scale(k, k);
  const r = rngOf(211);
  const thick = Math.pow(1 - u, 0.9);
  // streams off the crown and the ledges, running down round the eyes and the snout, over the cheeks to the lip; each
  // bends round the face (outwards on the cheeks), widening where it spills over an edge
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    const sx = 96 + t * 408 + (r() - 0.5) * 14;
    const m = (sx - SK.cx) / 220;
    const y0 = 64 + Math.abs(m) * 90 + r() * 10;
    const ex = sx + m * 64;
    const ey = Math.min(lipY(Math.max(64, Math.min(536, ex))) + 4, 430);
    const midX = sx + m * (Math.abs(m) > 0.5 ? 56 : 24);
    const wd = (3 + r() * 8) * (0.4 + thick * 0.9);
    const a = (0.1 + 0.42 * thick) * (0.6 + r() * 0.4);
    // its front runs on down as it drains (the top thinning first)
    const top = y0 + (ey - y0) * Math.min(0.9, u * 0.9 * (0.6 + r() * 0.8));
    const pts: Pt[] = [];
    for (let s = 0; s <= 10; s++) {
      const q = s / 10;
      const yy = top + (ey - top) * q;
      const qq = (yy - y0) / (ey - y0);
      pts.push([sx + (midX - sx) * Math.sin(qq * Math.PI * 0.5) + (ex - midX) * qq * qq, yy]);
    }
    g.beginPath();
    pts.forEach(([x, y], s) => (s ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.strokeStyle = `rgba(214,226,246,${a})`;
    g.lineWidth = wd;
    g.lineCap = 'round';
    g.stroke();
    g.strokeStyle = `rgba(255,255,255,${Math.min(1, a * 1.6)})`;
    g.lineWidth = Math.max(1, wd * 0.25);
    g.stroke();
  }
  // sheets spilling over the ledges above the eyes and off the cheeks
  for (const sd of [-1, 1]) {
    for (const [lx, ly, lw] of [[120, 162, 60], [60, 250, 30]] as const) {
      const x = SK.cx + sd * (SK.cx - lx);
      const hgt = 70 * thick + 10;
      const sg = g.createLinearGradient(0, ly, 0, ly + hgt);
      sg.addColorStop(0, `rgba(240,246,255,${0.55 * thick})`);
      sg.addColorStop(1, 'rgba(220,230,250,0)');
      g.fillStyle = sg;
      g.beginPath();
      g.moveTo(x - lw / 2, ly);
      g.quadraticCurveTo(x, ly - 6, x + lw / 2, ly);
      g.lineTo(x + lw * 0.4 + sd * 6, ly + hgt);
      g.lineTo(x - lw * 0.4 + sd * 6, ly + hgt);
      g.closePath();
      g.fill();
    }
  }
  // drops off the lip
  for (let i = 0; i < 16; i++) {
    const x = 90 + (i / 15) * 420 + (r() - 0.5) * 10;
    const q = (u * 3 + r()) % 1;
    const y = lipY(x) + 60 + q * 90;
    g.beginPath();
    g.ellipse(x, y, 2.6, 4.2, 0, 0, P2);
    g.fillStyle = `rgba(236,244,255,${0.8 * (1 - q) * (0.4 + thick * 0.6)})`;
    g.fill();
  }
  g.restore();
}

// ——— the constrict wrap, a chip of hide ———

/** The constrict wrap: the front of a loop of the body bowing round a pizza (WRAP.w × WRAP.h; the pizza's middle at
 * cx, its rim along the band's top). */
export const WRAP = { w: 460, h: 210, cx: 230, cy: 48, A: 196, B: 108, T: 86 };

/** Is a point of the wrap's frame on the band? */
export function wrapHit(x: number, y: number): boolean {
  const ex = (x - WRAP.cx) / WRAP.A;
  const ey = (y - WRAP.cy) / WRAP.B;
  const rr = Math.hypot(ex, ey);
  const th = Math.atan2(ey, ex);
  if (th < 0.05 || th > Math.PI - 0.05) return false;
  const rl = Math.hypot(WRAP.A * Math.cos(th), WRAP.B * Math.sin(th));
  return Math.abs((rr - 1) * rl) <= WRAP.T / 2 + 3;
}

let wrapCache: HTMLCanvasElement | null = null;
export function paintWrap(): HTMLCanvasElement {
  if (wrapCache) return wrapCache;
  const { w, h, cx, cy, A, B, T } = WRAP;
  const [c, g] = makeCanvas(w, h);
  const R = (A + B) / 2;
  const mask = maskOf(w, h, (m) => {
    m.beginPath();
    m.ellipse(cx, cy, A + T / 2, B + T / 2, 0, 0, Math.PI);
    m.lineTo(cx - A + T / 2, cy);
    m.ellipse(cx, cy, A - T / 2, B - T / 2, 0, Math.PI, 0, true);
    m.closePath();
    m.fill();
  });
  // the ends taper off round the back of the pizza
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const e = Math.min(x, w - x);
      if (e < 60) mask[y * w + x] = Math.round(mask[y * w + x] * smooth(0, 60, e));
    }
  const uv = (x: number, y: number, o: Pt) => {
    const ex = (x - cx) / A;
    const ey = (y - cy) / B;
    const th = Math.atan2(ey, ex);
    const rl = Math.hypot(A * Math.cos(th), B * Math.sin(th));
    o[0] = th * R;
    o[1] = (Math.hypot(ex, ey) - 1) * rl;
  };
  const tmp: Pt = [0, 0];
  paintHide(g, {
    w,
    h,
    mask,
    form: (x, y) => {
      uv(x, y, tmp);
      return 40 * Math.sqrt(Math.max(0, 1 - (tmp[1] / (T / 2)) ** 2));
    },
    uv,
    plates: layPlates(191, -20, -T / 2 - 10, Math.PI * R + 40, T + 20, (_u, v) => (v < -T * 0.15 ? 0 : 28), { tries: 3000, lichen: 0.3 }),
    box: { x: -20, y: -T / 2 - 10, w: Math.PI * R + 40, h: T + 20 },
    cell: 28,
    // the belly is the inside of the loop, against the pizza: its pale edge shows along the band's top
    flesh: (_x, _y, _u, v) => smooth(-T * 0.26, -T * 0.38, v),
    ribs: (_x, _y, u) => {
      const f = (((u / 12) % 1) + 1) % 1;
      return 2 * smooth(0, 0.85, f) - 1 * smooth(0.85, 1, f);
    },
    crevice: 1.3,
    bevel: 5,
    relief: 5,
    shingle: 0.2,
    exposure: 1.3,
    gloss: 0.4,
    seed: 59,
  });
  // squeezed: the plates bunched in creases across the band
  g.save();
  g.globalCompositeOperation = 'source-atop';
  for (let i = 1; i < 10; i++) {
    const th = (i / 10) * Math.PI;
    const x0 = cx + Math.cos(th) * (A - T / 2);
    const y0 = cy + Math.sin(th) * (B - T / 2);
    const x1 = cx + Math.cos(th) * (A + T / 2);
    const y1 = cy + Math.sin(th) * (B + T / 2);
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.strokeStyle = 'rgba(8,8,20,0.35)';
    g.lineWidth = 5;
    g.stroke();
  }
  const sh = g.createLinearGradient(0, cy, 0, cy + B + T / 2);
  sh.addColorStop(0, 'rgba(255,255,255,0)');
  sh.addColorStop(1, 'rgba(30,20,80,0.35)');
  g.fillStyle = sh;
  g.fillRect(0, 0, w, h);
  g.restore();
  barnacles(g, cx - 70, cy + B + 6, 5, 12, 6, 201);
  barnacles(g, cx + 96, cy + B - 10, 4, 10, 5, 203);
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, A + T / 2, B + T / 2, 0, 0.62, Math.PI - 0.62);
  g.strokeStyle = INK;
  g.lineWidth = 3.4;
  g.stroke();
  g.restore();
  wetRuns(g, [[cx - 40, cy + B - 20, 30], [cx + 30, cy + B - 16, 34], [cx + 120, cy + B - 40, 26], [cx - 130, cy + B - 44, 24]], 207, 0.6);
  wrapCache = c;
  return c;
}

/** A chip of stone hide (for the death's debris). */
export function paintChip(g: Ctx, w: number, h: number, seed: number): void {
  const r = rngOf(seed);
  const pts: Pt[] = [];
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * P2 + r() * 0.4;
    pts.push([w / 2 + Math.cos(a) * w * (0.34 + r() * 0.14), h / 2 + Math.sin(a) * h * (0.34 + r() * 0.14)]);
  }
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  const gr = g.createLinearGradient(0, 0, w, h);
  gr.addColorStop(0, '#a8b0a4');
  gr.addColorStop(0.5, '#6e766e');
  gr.addColorStop(1, '#2e3240');
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.stroke();
  barnacles(g, w * 0.6, h * 0.45, 2, 4, 3, seed + 1);
}

export { clamp01, smooth, STONE };
// ——— the whole head, and where it is ———

/** Is a point of the head (skull units) on it, with the jaw open by `open`? (The skull, or the lower jaw dropped.) */
export function headHit(lx: number, ly: number, open: number): boolean {
  if (lx < 20 || lx > SK.w - 20) return false;
  if (ly < lipY(lx) + 4) return inPoly(lx, ly, skullPts());
  const d = Math.abs(lx - SK.cx) / (MOUTH + 4);
  if (d >= 1) return false;
  const chin = 346 + 160 * Math.sqrt(1 - d * d) + DROP * open * jawW(lx);
  return ly <= chin;
}

/** What the still head shows. */
export interface StillOpts {
  /** Jaw opening, eye frame, lid frame, kelp phase. */
  open?: number;
  eye?: number;
  lid?: number;
  ph?: number;
  /** Leave out the eyes (and their glow) or the kelp. */
  eyes?: boolean;
  kelp?: boolean;
  glow?: boolean;
}

/** The head as one picture (skull units, SK.w × JAW.y0 + JAW.h): the jaw, the eyes under the skull, the tusks, the
 * kelp and the embers' glow. For the phase cards and the style art. */
export function paintHeadStill(g: Ctx, o: StillOpts = {}): void {
  const open = o.open ?? 0;
  const [jc, jg] = makeCanvas(SK.w, JAW.h);
  paintJaw(jg, open);
  g.drawImage(jc, 0, JAW.y0);
  if (o.eyes !== false) paintEyesAt(g, o.eye ?? 0, o.lid ?? 0);
  g.drawImage(paintSkull(), 0, 0);
  const [tc, tg] = makeCanvas(TUSK.fw, TUSK.fh);
  paintTusk(tg);
  for (const s of [-1, 1]) {
    const tx = SK.cx + s * (SK.cx - TUSK.x);
    g.save();
    g.translate(tx, lowLipY(tx) + 6 + DROP * open * jawW(tx));
    if (s > 0) g.scale(-1, 1);
    g.drawImage(tc, -TUSK.fw / 2, -(TUSK.fh - 14));
    g.restore();
  }
  if (o.kelp !== false) for (let i = 0; i < KELP.length; i++) paintKelpAt(g, i, o.ph ?? 0.2);
  if (o.glow !== false && o.eyes !== false) paintEyeGlows(g, 0.4);
}

/** Both eyes (frame eye, lids lid) in their places (skull units). */
export function paintEyesAt(g: Ctx, eye: number, lid: number): void {
  for (const s of [-1, 1]) {
    const [ec, eg] = makeCanvas(EYE.fw, EYE.fh);
    paintEye(eg, eye);
    paintLid(eg, lid);
    const ex = SK.cx + s * (SK.cx - EYE.x);
    g.save();
    g.translate(ex, EYE.y);
    if (s > 0) g.scale(-1, 1);
    g.drawImage(ec, -EYE.fw / 2, -EYE.fh / 2);
    g.restore();
  }
}

/** Kelp strand i of KELP hung at its anchor (skull units). */
export function paintKelpAt(g: Ctx, i: number, ph: number): void {
  const k = KELP[i];
  const F = KELP_F[k.kind];
  const [kc, kg] = makeCanvas(F.w, F.h);
  paintKelp(kg, k.kind, ph);
  g.save();
  g.translate(k.x, k.y);
  if (k.flip) g.scale(-1, 1);
  g.drawImage(kc, -F.ax, -F.ay);
  g.restore();
}

/** The embers in the eyes, as light (skull units). */
export function paintEyeGlows(g: Ctx, a: number): void {
  const [gc, gg] = makeCanvas(128, 128);
  paintGlow(gg, 128);
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = a;
  for (const s of [-1, 1]) g.drawImage(gc, SK.cx + s * (SK.cx - EYE.x) - 64, EYE.y - 64);
  g.restore();
}
