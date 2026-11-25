// JÖRMUNGANDR, the world serpent (Act 8's Bifröst mini-boss), painted for his fight (src/game/bosses/jormRig.ts), his
// phase cards and his style art (src/content/style/jormungandr.ts). He has lain in the world-sea so long that his hide
// has turned to stone: great weathered slate plates, lichen in crusts, barnacles, salt crust in every crevice, weed and
// kelp caught on him. Where the flesh shows it's alive: a wet, dark-pink mouth, gums and tongue, and a pale ribbed
// throat and belly. His eyes are embers sunk deep under ledges of rock.
//
// His head is a long, heavy wedge of a serpent's skull seen in three-quarter view, turned a little towards us so we look
// down on the top of the skull and both brows (the far eye's ember just showing): great crown plates down its top and a
// ridge of slabs running back onto the neck, heavy brows over deep-set eyes on the sides of the skull, nostrils at the
// tip of the snout, big lip scales along the jaws, the jaw line running back to its hinge behind the eye, the lower jaw
// narrower than the skull. Its axis runs straight back into the neck (SOCKET): the neck carries on out of the back of
// the skull, a little narrower than the jowls. Shut, the mouth is one lip line, the upper teeth hanging over the lower
// lip and the lower ones standing in front of the upper; open, we see into it: the ridged roof, the far rows of teeth
// and gum in shadow, the tongue lying in the floor of the mouth, the dark throat, the corner of the mouth stretched. His own marks: a great
// lower tusk that closes up outside his lip; the cracks Thor's hammer split across his brow; the old tear where the
// god's hook ripped out of the corner of his mouth, healed in a pale seam.
//
// Everything is in head units (texture px at the fight's display scale 1). Lit by the Edge of the World (src/content/art/scene-jormungandr.ts): the wan green sun high on the
// left, the storm's cool fill, the void's violet glow from behind as a rim. The hide itself is ./jormHide.ts.

import { makeCanvas, type Ctx } from '../../art/util';
import { type Plate, type Pt, STONE, bump, clamp01, fbm, hexRGB, layPlates, maskOf, paintHide, smooth } from './jormHide';

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
//
// The head is seen in three-quarter view, turned to our left and angled down towards the table: a long wedge of a
// skull, its snout projecting towards us at the left, the near eye deep under a heavy brow on the side of the skull,
// the jaw line running back to the hinge behind the eye, the neck leaving the back of the skull at the right. (The
// fight flips it to face right.) Skull units are texture px at the fight's display scale 1.

/** The skull texture's size. */
export const SK = { w: 780, h: 540 };
/** The rig's origin on the skull (the head's middle). */
export const HEAD_O = { x: 390, y: 260 };
/** The lower jaw's hinge (it swings round it) and how far it swings at its widest (radians). */
export const HINGE = { x: 604, y: 368 };
export const JAW_MAX = 0.62;
/** The maw's frames (the mouth's inside, one per opening). */
export const MAW_N = 9;
/** The near eye (its centre, half sizes, the slant along the head, the frame size) and the far eye's ember. */
export const EYE = { x: 394, y: 236, rx: 34, ry: 16, tilt: -0.24, fw: 120, fh: 96 };
export const FAR_EYE = { x: 274, y: 206 };
/** The nostrils at the snout's tip (near, far). */
export const NOSES: Pt[] = [[98, 300], [74, 286]];
/** Where the neck's middle line meets the back of the skull. The head's axis runs along +x here (back towards the neck),
 * so a neck that arrives along +x carries straight on into the skull with no kink. */
export const SOCKET = { x: 700, y: 272 };
/** How wide the neck is where it meets the skull, against its tile (a snake's neck is a little narrower than its jowls). */
export const NECK_AT_HEAD = 0.78;
/** The far side of the mouth in the three-quarter view: how far its rows show forward of and above the near ones at the
 * back of the jaw (they meet the near ones at the chin, as the two halves of the lower jaw do). */
const FAR_OFF: Pt = [-22, -58];
/** The lower tusk (on the lower jaw near the chin): its root, and its frame. */
export const TUSK = { x: 150, len: 70, fw: 60, fh: 130 };
/** Kelp hanging off him: where each strand is caught (skull units), which kind, flipped. */
export const KELP: { x: number; y: number; kind: 0 | 1 | 2; flip: boolean }[] = [
  { x: 478, y: 150, kind: 0, flip: false },
  { x: 620, y: 130, kind: 1, flip: true },
  { x: 676, y: 352, kind: 2, flip: true },
];
/** The kelp frames: per kind, the frame size and where it's caught inside the frame. */
export const KELP_F: { w: number; h: number; ax: number; ay: number }[] = [
  { w: 120, h: 300, ax: 70, ay: 16 },
  { w: 150, h: 280, ax: 44, ay: 16 },
  { w: 110, h: 200, ax: 60, ay: 12 },
];

/** The top of the head from the tip of the snout back over the brows and the crown to the neck. */
const DORSAL: Pt[] = [
  [64, 300], [78, 268], [124, 248], [192, 230], [228, 212], [252, 192], [282, 184], [314, 190], [346, 178], [392, 154], [430, 150],
  [462, 156], [520, 132], [590, 118], [660, 124], [730, 146], [766, 176],
];
/** The upper lip's edge (where the stone of the upper jaw ends and the gum starts), from the tip back to the corner of
 * the mouth: it sweeps back along the jaw, a little lower at the front. */
export function gapeY(x: number): number {
  const t = Math.max(0, Math.min(1, (x - 84) / (560 - 84)));
  return 338 + 14 * t + 10 * Math.sin(t * Math.PI) - 18 * Math.pow(1 - t, 6);
}
/** The lower lip's edge (closed): tucked just under the upper lip, so the closed mouth is one lip line, no gum showing. */
export const lowLipY = (x: number): number => gapeY(x) - 3;
/** The corner of the mouth. */
export const MOUTH_C: Pt = [560, gapeY(560)];
/** Where it bites: between the jaws near the front of the mouth. */
export const MOUTH_PT: Pt = [220, 380];

function linePts(x0: number, x1: number, n: number, f: (x: number) => number, dy = 0): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    out.push([x, f(x) + dy]);
  }
  return out;
}

/** The skull's silhouette: the top line, round the back of the skull and the jowl behind the corner of the mouth,
 * then forward along the upper lip to the tip. */
export const skullPts = (): Pt[] => [
  ...DORSAL,
  [778, 224], [764, 282], [736, 330], [690, 362], [636, 382], [592, 372], MOUTH_C,
  ...linePts(540, 84, 24, gapeY),
  [70, 326],
];
/** The lower jaw's outline (closed): the lower lip from the chin back to the hinge, then under the jaw forward. */
export const jawPts = (): Pt[] => [
  [92, 346], ...linePts(110, 560, 22, lowLipY), [592, 366], [616, 384], [600, 404], [540, 420], [440, 426], [330, 420],
  [230, 410], [160, 396], [112, 378], [92, 362],
];

const SHARP = new Set(['64,300', '766,176']);

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

export const skullPath = (c: Ctx): void => roundPath(c, skullPts(), SHARP, 0.6);
export const jawPath = (c: Ctx): void => roundPath(c, jawPts(), new Set(), 0.6);

/** A point turned round the hinge as the jaw opens by o (0…1). */
export function jawTurn(x: number, y: number, o: number): Pt {
  const a = -JAW_MAX * o;
  const dx = x - HINGE.x;
  const dy = y - HINGE.y;
  return [HINGE.x + dx * Math.cos(a) - dy * Math.sin(a), HINGE.y + dx * Math.sin(a) + dy * Math.cos(a)];
}

/** Plate space: the head's own axis (u back along the skull, v across it, stretched so plates run along the head). */
const PH = 0.261;
const toUV = (x: number, y: number, o: Pt): void => {
  o[0] = x * Math.cos(PH) - y * Math.sin(PH);
  o[1] = (x * Math.sin(PH) + y * Math.cos(PH)) * 1.3;
};
const fromUV = (u: number, v: number): Pt => {
  const vv = v / 1.3;
  return [u * Math.cos(PH) + vv * Math.sin(PH), -u * Math.sin(PH) + vv * Math.cos(PH)];
};

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

/** The upper teeth along the lip, front to back: x, length, width, bend, broken (smaller as they go back). */
const UPPER_TEETH: [number, number, number, number, boolean][] = [
  [104, 30, 15, 0.2, false], [136, 70, 26, 0.18, false], [168, 32, 16, 0.1, false], [196, 46, 20, 0.08, false],
  [226, 28, 15, 0.05, false], [254, 52, 21, 0.05, true], [284, 30, 15, 0, false], [312, 42, 18, 0, false],
  [342, 26, 14, 0, false], [370, 38, 17, -0.04, false], [400, 24, 13, -0.05, false], [428, 32, 15, -0.08, false],
  [458, 22, 12, -0.1, false], [486, 26, 13, -0.1, false], [514, 18, 11, -0.12, false],
];
/** The lower teeth rising from the lower gum (the tusk stands at TUSK.x). */
const LOWER_TEETH: [number, number, number, number][] = [
  [120, 22, 13, 0.15], [182, 30, 15, 0.08], [214, 20, 12, 0.05], [244, 34, 16, 0], [276, 22, 12, 0], [306, 28, 14, 0],
  [338, 20, 12, 0], [366, 26, 13, -0.04], [396, 18, 11, -0.05], [424, 24, 12, -0.06], [452, 16, 10, -0.08], [480, 20, 11, -0.1],
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

/** The skull's form: rounded to its silhouette, a ridge down its top, the heavy brows, the sockets, the jowl. */
function skullForm(dome: Float32Array, ridge: Float32Array, w: number): (x: number, y: number) => number {
  return (x, y) => {
    const i = y * w + x;
    let H = dome[i] * 64 + ridge[i] * 34;
    // the brow ridges: a heavy ledge over the near eye, a lesser one over the far
    H += bump(x, y, EYE.x + 4, EYE.y - 40, 82, 26, 30) + bump(x, y, FAR_EYE.x + 6, FAR_EYE.y - 16, 46, 22, 26);
    // the near eye sinks deep under its ledge
    H += bump(x, y, EYE.x, EYE.y + 4, 60, 34, -40);
    // the jowl over the hinge, and the cheek under the eye
    H += bump(x, y, 640, 318, 90, 64, 26) + bump(x, y, 470, 300, 100, 46, 12);
    // the snout's tip, swelling round the nostrils, the pits of the nostrils
    H += bump(x, y, 100, 290, 60, 46, 16) + bump(x, y, NOSES[0][0], NOSES[0][1], 14, 10, -22) + bump(x, y, NOSES[1][0], NOSES[1][1], 10, 8, -14);
    // the upper lip rolls over the gum
    const gy = gapeY(x);
    if (x > 80 && x < 580) H += bump(0, y, 0, gy - 10, 1, 14, 6);
    return H;
  };
}

function skullPlates(): Plate[] {
  // big crown plates down the top of the skull, big lip scales along the jaw, small scales round the eye and the nostrils;
  // the rest in rows along the head (plate space runs along its axis)
  const fixed: [number, number, number][] = [];
  const uv: Pt = [0, 0];
  const at = (x: number, y: number, s: number) => {
    toUV(x, y, uv);
    fixed.push([uv[0], uv[1], s]);
  };
  for (let i = 1; i < DORSAL.length - 1; i++) {
    const [x, y] = DORSAL[i];
    if (x < 150) continue;
    at(x + 4, y + 30, x > 300 ? 74 : 62);
  }
  for (let x = 118; x < 540; x += 40) at(x, gapeY(x) - 22, 38);
  for (let x = 140; x < 520; x += 52) at(x + 20, gapeY(x) - 66, 50);
  const size = (u: number, v: number): number => {
    const [x, y] = fromUV(u, v);
    // varied: some great slabs, some small, in patches
    let s = (40 + Math.max(0, x - 300) * 0.04) * (0.65 + 0.8 * fbm(u * 0.006, v * 0.006, 5, 2));
    const de = Math.hypot(x - EYE.x, (y - EYE.y) * 1.4);
    if (de < 100) s = Math.min(s, 13 + Math.max(0, de - 40) * 0.5);
    const dn = Math.hypot(x - NOSES[0][0], y - NOSES[0][1]);
    if (dn < 70) s = Math.min(s, 14 + dn * 0.35);
    return s;
  };
  const [u0, v0] = [-200, 0];
  return layPlates(91, u0, v0, 1100, 900, size, { tries: 9000, lichen: 0.32, fixed });
}

/** The big shapes of light over the hide: the top of the head and the snout's bridge in the sun, the near side a step
 * down and darker towards the jaw, the back of the skull and the jowl turning away into shade, the near eye in the dark
 * under its brow. */
function formPass(g: Ctx): void {
  soft(g, SK.w, SK.h, (x) => {
    const v = x.createLinearGradient(0, 120, 0, 380);
    v.addColorStop(0, '#ffffff');
    v.addColorStop(0.45, '#dcdaea');
    v.addColorStop(1, '#8e86b8');
    x.fillStyle = v;
    x.fillRect(0, 0, SK.w, SK.h);
    const hgr = x.createLinearGradient(380, 0, SK.w, 0);
    hgr.addColorStop(0, 'rgba(255,255,255,0)');
    hgr.addColorStop(1, 'rgba(110,100,170,0.75)');
    x.fillStyle = hgr;
    x.fillRect(0, 0, SK.w, SK.h);
    // the near eye's hollow under its brow
    x.save();
    x.translate(EYE.x, EYE.y - 6);
    x.rotate(EYE.tilt);
    x.fillStyle = 'rgba(48,40,96,0.85)';
    x.beginPath();
    x.ellipse(0, 0, 76, 34, 0, 0, P2);
    x.fill();
    x.restore();
  }, 'multiply', 24);
  soft(g, SK.w, SK.h, (x) => {
    // the sun along the bridge of the snout and over the brows
    x.lineCap = 'round';
    x.lineJoin = 'round';
    x.beginPath();
    DORSAL.slice(1, -2).forEach(([px, py], i) => (i ? x.lineTo(px + 6, py + 22) : x.moveTo(px + 6, py + 22)));
    x.strokeStyle = 'rgba(100,112,76,0.75)';
    x.lineWidth = 46;
    x.stroke();
    const t = x.createRadialGradient(130, 270, 6, 130, 270, 90);
    t.addColorStop(0, 'rgba(96,106,72,0.6)');
    t.addColorStop(1, 'rgba(96,106,72,0)');
    x.fillStyle = t;
    x.fillRect(0, 160, 300, 220);
  }, 'screen', 20);
}

/** The raised ridge of plates down the top of the skull, standing up from it as blunt slabs that lean back. */
function dorsalRidge(g: Ctx): void {
  const r = rngOf(171);
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const k = Math.floor(8 + t * (DORSAL.length - 9));
    const [x0, y0] = DORSAL[k];
    const [x1, y1] = DORSAL[Math.min(DORSAL.length - 1, k + 1)];
    const f = r() * 0.6 + 0.2;
    const bx = x0 + (x1 - x0) * f;
    const by = y0 + (y1 - y0) * f + 6;
    const hgt = 16 + 12 * Math.sin(t * Math.PI) + r() * 6;
    const wd = 40 + r() * 14;
    ridgeSlab(g, bx, by, wd, hgt, 0.45 + r() * 0.2, 300 + i);
  }
}

/** One slab of a dorsal ridge: rooted at (x, y), leaning back by lean, lit on its front. */
export function ridgeSlab(g: Ctx, x: number, y: number, wd: number, hgt: number, lean: number, seed: number, dark = false): void {
  const r = rngOf(seed);
  const tx = x + hgt * lean;
  const ty = y - hgt;
  const path = () => {
    g.beginPath();
    g.moveTo(x - wd / 2, y + 4);
    g.lineTo(x - wd * 0.42 + hgt * lean * 0.6, y - hgt * 0.72);
    g.quadraticCurveTo(tx - wd * 0.2, ty - 2 - r() * 3, tx + wd * 0.12, ty + 2);
    g.quadraticCurveTo(x + wd * 0.5 + hgt * lean * 0.5, y - hgt * 0.55, x + wd / 2 + hgt * lean * 0.3, y - hgt * 0.3);
    g.lineTo(x + wd / 2, y + 4);
    g.closePath();
  };
  path();
  const sg = g.createLinearGradient(x - wd / 2, ty, x + wd / 2, y);
  sg.addColorStop(0, dark ? '#6a706c' : '#a4aa9c');
  sg.addColorStop(0.5, dark ? '#464c50' : '#6e7470');
  sg.addColorStop(1, dark ? '#22262f' : '#343848');
  g.fillStyle = sg;
  g.fill();
  g.save();
  path();
  g.clip();
  // weathered: a crack, a lichen spot, the void's rim on its back edge
  g.strokeStyle = 'rgba(4,4,12,0.6)';
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(x + (r() - 0.5) * wd * 0.4, y);
  g.lineTo(x + (r() - 0.5) * wd * 0.3 + hgt * lean * 0.5, y - hgt * 0.6);
  g.stroke();
  g.fillStyle = 'rgba(150,150,104,0.5)';
  g.beginPath();
  g.ellipse(x - wd * 0.15, y - hgt * 0.3, wd * 0.18, hgt * 0.12, 0, 0, P2);
  g.fill();
  g.restore();
  path();
  g.strokeStyle = INK;
  g.lineWidth = 2.6;
  g.stroke();
  g.beginPath();
  g.moveTo(tx + 5, ty + 4);
  g.lineTo(x + wd / 2 + hgt * lean * 0.3, y - hgt * 0.35);
  g.strokeStyle = rgbaOf('#c4b6ff', 0.6);
  g.lineWidth = 2;
  g.stroke();
}

let skullCache: HTMLCanvasElement | null = null;

/** The skull (cached): its hide, the eye's socket (the eye is its own frame, under the skull), the nostrils, the
 * hammer's cracks, barnacles, the ridge, the gum and upper teeth, outline and rim. */
export function paintSkull(): HTMLCanvasElement {
  if (skullCache) return skullCache;
  const { w, h } = SK;
  const [c, g] = makeCanvas(w, h);
  const mask = maskOf(w, h, (m) => {
    skullPath(m);
    m.fill();
  });
  const dome = domeOf(mask, w, h, 30);
  const ridge = domeOf(maskOf(w, h, (m) => {
    m.beginPath();
    DORSAL.forEach(([x, y], i) => (i ? m.lineTo(x + 4, y + 26) : m.moveTo(x + 4, y + 26)));
    m.lineWidth = 34;
    m.lineCap = 'round';
    m.lineJoin = 'round';
    m.strokeStyle = '#fff';
    m.stroke();
  }), w, h, 22);
  paintHide(g, {
    w,
    h,
    mask,
    form: skullForm(dome, ridge, w),
    uv: toUV,
    uvScale: 1.15,
    plates: skullPlates(),
    box: { x: -200, y: 0, w: 1100, h: 900 },
    cell: 40,
    crevice: 1.9,
    bevel: 6,
    relief: 7,
    shingle: 0.18,
    formK: 1,
    exposure: 1.35,
    seed: 41,
    gloss: 0.35,
    warp: 10,
  });
  g.save();
  skullPath(g);
  g.clip();
  formPass(g);
  // the nostrils: dark comma slits at the tip of the snout, under a ridge
  NOSES.forEach(([nx, ny], i) => {
    const k = i ? 0.7 : 1;
    g.save();
    g.translate(nx, ny);
    g.scale(k, k);
    g.rotate(-0.5);
    g.beginPath();
    g.moveTo(10, -8);
    g.bezierCurveTo(-2, -18, -18, -10, -18, 4);
    g.strokeStyle = 'rgba(226,236,214,0.5)';
    g.lineWidth = 2;
    g.stroke();
    g.beginPath();
    g.moveTo(6, -5);
    g.bezierCurveTo(-4, -10, -14, -4, -12, 6);
    g.bezierCurveTo(-11, 12, -4, 12, -2, 6);
    g.bezierCurveTo(0, 0, 4, -2, 6, -5);
    g.closePath();
    g.fillStyle = '#05020a';
    g.fill();
    g.restore();
  });
  browLedge(g);
  thorsMark(g);
  hookScar(g);
  barnacles(g, 560, 300, 9, 30, 11, 3);
  barnacles(g, 690, 200, 7, 26, 10, 5);
  barnacles(g, 238, 296, 4, 12, 7, 13);
  barnacles(g, 420, 120, 4, 12, 7, 17);
  limpet(g, 330, 300, 6);
  limpet(g, 640, 250, 7);
  saltDribbles(g);
  wetRuns(g, [[150, 262, 40], [200, 250, 46], [260, 236, 40], [470, 200, 50], [520, 180, 56], [600, 170, 60], [330, 230, 40]], 23, 0.5);
  g.restore();
  // the eye's opening, cut through (the eye is under the skull, so the brow and lids of stone overhang it)
  g.save();
  g.translate(EYE.x, EYE.y);
  g.rotate(EYE.tilt);
  eyeShape(g, EYE.rx, EYE.ry);
  g.globalCompositeOperation = 'destination-out';
  g.fill();
  g.globalCompositeOperation = 'source-over';
  eyeShape(g, EYE.rx, EYE.ry);
  g.strokeStyle = INK;
  g.lineWidth = 3.5;
  g.stroke();
  g.beginPath();
  g.moveTo(-EYE.rx - 4, 0);
  g.bezierCurveTo(-EYE.rx * 0.6, -EYE.ry * 1.8, EYE.rx * 0.6, -EYE.ry * 1.9, EYE.rx + 6, -6);
  g.strokeStyle = 'rgba(4,4,10,0.8)';
  g.lineWidth = 7;
  g.stroke();
  g.beginPath();
  g.moveTo(-EYE.rx * 0.8, EYE.ry * 0.7);
  g.quadraticCurveTo(0, EYE.ry * 1.35, EYE.rx * 0.85, EYE.ry * 0.45);
  g.strokeStyle = 'rgba(220,200,190,0.5)';
  g.lineWidth = 1.6;
  g.stroke();
  g.restore();
  // the far eye: an ember just showing under its brow beyond the bridge of the snout (the head is turned a little
  // towards us, so we look down on the top of the skull and both brows)
  g.save();
  g.translate(FAR_EYE.x, FAR_EYE.y);
  g.rotate(-0.36);
  g.beginPath();
  g.ellipse(0, 0, 15, 7, 0, 0, P2);
  g.fillStyle = '#1a0806';
  g.fill();
  g.beginPath();
  g.ellipse(-1, 1.5, 11.5, 4.6, 0, 0, P2);
  const fe = g.createRadialGradient(-2, 1, 0, -1, 1.5, 11);
  fe.addColorStop(0, '#ffe090');
  fe.addColorStop(0.5, '#f08020');
  fe.addColorStop(1, '#5a1a04');
  g.fillStyle = fe;
  g.fill();
  g.beginPath();
  g.ellipse(0, 1.5, 1.6, 4, 0, 0, P2);
  g.fillStyle = '#100204';
  g.fill();
  g.restore();
  farBrow(g);
  // the upper lip's row of big scales meets the lower lip in one line; the upper teeth hang from just inside it, over
  // the lower lip (the gums are inside the mouth: they show only as the jaw drops, ./paintMaw)
  for (const [x, len, tw, bend, broken] of UPPER_TEETH) {
    const k = (1 - ((x - 100) / 440) * 0.4) * 1.05;
    tooth(g, x, gapeY(x) - 1, len * k, tw * k, 1, bend, 300 + x, broken);
  }
  g.save();
  g.lineCap = 'round';
  g.beginPath();
  linePts(86, MOUTH_C[0], 40, gapeY, -5).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.strokeStyle = 'rgba(232,240,220,0.22)';
  g.lineWidth = 2;
  g.stroke();
  g.restore();
  // the ridge of plates down the top
  dorsalRidge(g);
  // where the neck runs in under it, the back of the skull's last plates thin out over it (no seam)
  g.save();
  g.globalCompositeOperation = 'destination-out';
  const fade = g.createRadialGradient(SOCKET.x + 96, SOCKET.y, 10, SOCKET.x + 96, SOCKET.y, 130);
  fade.addColorStop(0, 'rgba(0,0,0,0.85)');
  fade.addColorStop(0.55, 'rgba(0,0,0,0.35)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = fade;
  g.fillRect(SOCKET.x - 80, 150, SK.w, SK.h);
  g.restore();
  // the outline, then the void's violet rim round its back and under the jaw, a broad wash and a crisp line (not round
  // the back of the skull, where the neck carries on)
  g.save();
  g.beginPath();
  g.rect(0, 0, SK.w, SK.h);
  g.moveTo(SOCKET.x - 40, 175);
  g.lineTo(SK.w, 175);
  g.lineTo(SK.w, SK.h);
  g.lineTo(SOCKET.x - 40, SK.h);
  g.closePath();
  g.clip('evenodd');
  skullPath(g);
  g.strokeStyle = INK;
  g.lineWidth = 4;
  g.stroke();
  g.clip();
  g.beginPath();
  [[0, 0], [SK.w, 0], [SK.w, SK.h], [560, SK.h], ...linePts(560, 84, 20, gapeY, -18), [0, 330]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.clip();
  g.translate(-5, 2);
  skullPath(g);
  g.lineWidth = 18;
  g.strokeStyle = rgbaOf('#9a88f0', 0.18);
  g.stroke();
  g.translate(2, -1);
  skullPath(g);
  g.lineWidth = 5;
  g.strokeStyle = rgbaOf('#c4b6ff', 0.6);
  g.stroke();
  g.restore();
  skullCache = c;
  return c;
}

/** The heavy brow over the near eye: a ledge of stone overhanging it, lit along its top, its shadow thrown down over
 * the socket. */
function browLedge(g: Ctx): void {
  const pts: Pt[] = [[318, 214], [350, 196], [392, 186], [434, 186], [474, 196], [494, 210]];
  const under: Pt[] = [[486, 214], [452, 206], [404, 204], [362, 210], [326, 222]];
  const path = () => {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    under.forEach(([x, y]) => g.lineTo(x, y));
    g.closePath();
  };
  // its shadow on the eye and the socket
  soft(g, SK.w, SK.h, (x) => {
    x.beginPath();
    under.forEach(([px, py], i) => (i ? x.lineTo(px, py + 10) : x.moveTo(px, py + 10)));
    x.lineTo(330, 250);
    x.lineTo(470, 236);
    x.closePath();
    x.fillStyle = 'rgba(30,24,70,0.85)';
    x.fill();
  }, 'multiply', 14);
  path();
  const lg = g.createLinearGradient(0, 186, 0, 216);
  lg.addColorStop(0, '#aab0a0');
  lg.addColorStop(0.5, '#6c7272');
  lg.addColorStop(1, '#2c3040');
  g.fillStyle = lg;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 2.6;
  g.stroke();
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y + 2) : g.moveTo(x, y + 2)));
  g.strokeStyle = 'rgba(236,244,214,0.55)';
  g.lineWidth = 2;
  g.stroke();
  // its weathered face: a few cracks and lichen
  g.strokeStyle = 'rgba(4,4,12,0.6)';
  g.lineWidth = 1.4;
  for (const [x0, x1] of [[372, 380], [418, 412], [456, 462]]) {
    g.beginPath();
    g.moveTo(x0, 190);
    g.lineTo(x1, 206);
    g.stroke();
  }
  g.fillStyle = 'rgba(150,150,104,0.45)';
  g.beginPath();
  g.ellipse(436, 192, 12, 4, 0, 0, P2);
  g.fill();
}

/** The far brow: a lesser ledge of stone along the top of the skull over the far eye, lit along its crest, its shadow on
 * the eye (it's what tells us we're looking down on the head, turned a little towards us). */
function farBrow(g: Ctx): void {
  const pts: Pt[] = [[234, 208], [252, 194], [282, 187], [312, 192], [332, 202]];
  const under: Pt[] = [[322, 206], [296, 202], [268, 204], [246, 212]];
  soft(g, SK.w, SK.h, (x) => {
    x.beginPath();
    under.forEach(([px, py], i) => (i ? x.lineTo(px, py + 6) : x.moveTo(px, py + 6)));
    x.lineTo(250, 226);
    x.lineTo(310, 218);
    x.closePath();
    x.fillStyle = 'rgba(30,24,70,0.8)';
    x.fill();
  }, 'multiply', 10);
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  under.forEach(([x, y]) => g.lineTo(x, y));
  g.closePath();
  const lg = g.createLinearGradient(0, 186, 0, 210);
  lg.addColorStop(0, '#b4baa8');
  lg.addColorStop(0.55, '#6c7272');
  lg.addColorStop(1, '#2c3040');
  g.fillStyle = lg;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 2.4;
  g.stroke();
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y + 2) : g.moveTo(x, y + 2)));
  g.strokeStyle = 'rgba(236,244,214,0.6)';
  g.lineWidth = 1.8;
  g.stroke();
}

/** The cracks Thor's hammer split across the near brow: three runs from where it struck, forking, flakes knocked out. */
function thorsMark(g: Ctx): void {
  const r = rngOf(77);
  const x0 = 300;
  const y0 = 218;
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
    for (let i = 0; i < 6; i++) {
      a += (r() - 0.5) * 0.7;
      px += (Math.cos(a) * len) / 6;
      py += (Math.sin(a) * len) / 6;
      pts.push([px, py]);
      if (r() < 0.3) {
        const fx = px + (r() - 0.5) * 6;
        const fy = py + (r() - 0.5) * 6;
        g.beginPath();
        g.moveTo(fx, fy);
        for (let k = 0; k < 4; k++) g.lineTo(fx + (r() - 0.5) * 9, fy + (r() - 0.5) * 7);
        g.closePath();
        g.fillStyle = 'rgba(30,32,44,0.75)';
        g.fill();
      }
      if (depth < 1 && i === 2 && r() < 0.8) run(px, py, a + (r() < 0.5 ? -1 : 1) * (0.6 + r() * 0.4), len * 0.5, w * 0.6, depth + 1);
    }
    crackLine(pts, w);
  };
  run(x0, y0, -2.9, 64, 3.2, 0);
  run(x0, y0, -0.4, 60, 3, 0);
  run(x0, y0, 2.2, 34, 2.4, 0);
  g.restore();
}

/** The old tear where Thor's hook ripped out of the corner of the mouth: a pale puckered seam up the jowl. */
function hookScar(g: Ctx): void {
  const pts: Pt[] = [[566, 350], [580, 330], [590, 312], [606, 296], [616, 276], [630, 262]];
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
  line(1.6, 'rgba(255,230,232,0.5)', -1.5, -1);
  g.restore();
}

function saltDribbles(g: Ctx): void {
  const r = rngOf(55);
  g.save();
  g.lineCap = 'round';
  const at: [number, number][] = [[350, 196], [420, 184], [460, 186], [300, 222], [620, 180], [700, 220], [200, 260]];
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

let jawCache: HTMLCanvasElement | null = null;

/** The lower jaw, closed (cached, skull coordinates; the rig swings it round HINGE): its hide with a row of big lip
 * scales, the tongue lying in it, the lower gum and teeth. */
export function paintLowerJaw(): HTMLCanvasElement {
  if (jawCache) return jawCache;
  const { w, h } = SK;
  const [c, g] = makeCanvas(w, h);
  const mask = maskOf(w, h, (m) => {
    jawPath(m);
    m.fill();
  });
  const dome = domeOf(mask, w, h, 16);
  const fixed: [number, number, number][] = [];
  const uv: Pt = [0, 0];
  for (let x = 126; x < 560; x += 40) {
    toUV(x, lowLipY(x) + 22, uv);
    fixed.push([uv[0], uv[1], 38]);
  }
  paintHide(g, {
    w,
    h,
    mask,
    form: (x, y) => dome[y * w + x] * 44 + bump(x, y, 120, 372, 50, 30, 10),
    uv: toUV,
    uvScale: 1.15,
    plates: layPlates(93, -200, 0, 1100, 900, () => 40, { tries: 5000, lichen: 0.25, fixed }),
    box: { x: -200, y: 0, w: 1100, h: 900 },
    cell: 40,
    // the underside of the jaw: pale ribbed throat skin between the plates
    flesh: (x, y) => smooth(396, 412, y + (x - 300) * -0.02) * smooth(140, 200, x),
    ribs: (x) => {
      const f = ((x / 16) % 1 + 1) % 1;
      return 2 * smooth(0, 0.85, f) - smooth(0.85, 1, f);
    },
    crevice: 1.8,
    bevel: 6,
    relief: 6,
    shingle: 0.18,
    exposure: 1.2,
    seed: 43,
    gloss: 0.35,
    wetDark: (_x, y) => smooth(380, 430, y) * 0.35,
  });
  // the jaw a shade darker than the skull above it, deeper still underneath
  g.save();
  g.globalCompositeOperation = 'source-atop';
  const sh = g.createLinearGradient(0, 340, 0, 430);
  sh.addColorStop(0, 'rgba(60,50,110,0.12)');
  sh.addColorStop(1, 'rgba(40,30,90,0.45)');
  g.fillStyle = sh;
  g.fillRect(0, 0, w, h);
  g.restore();
  barnacles(g, 260, 400, 6, 16, 8, 31);
  barnacles(g, 470, 404, 5, 14, 7, 33);
  g.save();
  jawPath(g);
  g.strokeStyle = INK;
  g.lineWidth = 4;
  g.stroke();
  g.clip();
  g.beginPath();
  g.moveTo(0, SK.h);
  g.lineTo(SK.w, SK.h);
  g.lineTo(SK.w, 380);
  linePts(560, 92, 20, lowLipY, 18).forEach(([x, y]) => g.lineTo(x, y));
  g.lineTo(0, 380);
  g.closePath();
  g.clip();
  g.translate(-4, -3);
  jawPath(g);
  g.lineWidth = 14;
  g.strokeStyle = rgbaOf('#9a88f0', 0.16);
  g.stroke();
  g.translate(2, 1);
  jawPath(g);
  g.lineWidth = 4.5;
  g.strokeStyle = rgbaOf('#c4b6ff', 0.55);
  g.stroke();
  g.restore();
  // inside the lip (under the upper lip while the mouth is shut, showing as the jaw drops): the floor of the mouth back
  // to the far half of the jaw, its gum and teeth, the tongue lying in it, the near gum (the near teeth: paintLowerTeeth)
  mouthFloor(g);
  jawCache = c;
  return c;
}

/** The far half of the lower jaw's lip, seen across the open mouth (closed-jaw coordinates): it meets the near lip at
 * the chin and runs back a little forward of and above it, as the two halves of a snake's jaw do. */
function farLip(x: number): Pt {
  const k = 0.2 + 0.8 * clamp01((x - 96) / 464);
  return [x + FAR_OFF[0] * k, lowLipY(x) + FAR_OFF[1] * k];
}

/** Paint something in shadow across the mouth: drawn on its own, then laid down darkened. */
function dimmed(g: Ctx, k: number, draw: (c: Ctx) => void): void {
  const [c, x] = makeCanvas(g.canvas.width, g.canvas.height);
  x.setTransform(g.getTransform());
  draw(x);
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.filter = `brightness(${k}) saturate(0.85)`;
  g.drawImage(c, 0, 0);
  g.restore();
}

function mouthFloor(g: Ctx): void {
  const near = linePts(100, 566, 40, lowLipY, 2);
  const far = near.map(([x]) => farLip(x));
  // the floor: wet flesh between the two halves of the jaw, darkening back towards the throat, folded along its length
  g.save();
  g.beginPath();
  near.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  for (let i = far.length - 1; i >= 0; i--) g.lineTo(far[i][0], far[i][1] + 6);
  g.closePath();
  const fg = g.createLinearGradient(100, 0, 580, 0);
  fg.addColorStop(0, '#5a1a2a');
  fg.addColorStop(0.5, '#2e0812');
  fg.addColorStop(1, '#0a0105');
  g.fillStyle = fg;
  g.fill();
  g.clip();
  for (let k = 1; k < 4; k++) {
    g.beginPath();
    near.forEach(([x, y], i) => {
      const [fx, fy] = far[i];
      const xx = x + ((fx - x) * k) / 4;
      const yy = y + ((fy - y) * k) / 4;
      if (i) g.lineTo(xx, yy);
      else g.moveTo(xx, yy);
    });
    g.strokeStyle = 'rgba(16,2,6,0.35)';
    g.lineWidth = 3;
    g.stroke();
  }
  g.restore();
  // the far gum and its teeth, smaller and in shadow across the mouth
  dimmed(g, 0.78, (x) => {
    gum(x, far, 9, 1, LOWER_TEETH.map(([tx]) => farLip(tx)[0]));
    for (const [tx, len, tw, bend] of LOWER_TEETH) {
      const [fx, fy] = farLip(tx);
      const k = (1 - ((tx - 100) / 440) * 0.4) * 0.85;
      tooth(x, fx, fy + 3, len * k, tw * k, -1, bend, 700 + tx);
    }
  });
  // the tongue lying along the floor, its fork forward between the jaws
  const mid = (x: number): Pt => {
    const [fx, fy] = farLip(x);
    // (it lifts a little towards its tip, as if about to flick)
    const lift = 20 * smooth(360, 150, x);
    return [(x + fx) / 2, (lowLipY(x) + fy) / 2 - 2 - lift];
  };
  const spine: Pt[] = [];
  for (let i = 0; i <= 20; i++) spine.push(mid(548 - i * 19));
  const left: Pt[] = [];
  const right: Pt[] = [];
  spine.forEach(([x, y], i) => {
    const [ax, ay] = spine[Math.max(0, i - 1)];
    const [bx, by] = spine[Math.min(spine.length - 1, i + 1)];
    const l = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / l;
    const ny = (bx - ax) / l;
    const hw = 19 - i * 0.55;
    left.push([x + nx * hw, y + ny * hw]);
    right.push([x - nx * hw, y - ny * hw]);
  });
  const [ex, ey] = spine[spine.length - 1];
  g.beginPath();
  left.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  // the fork: two prongs, tapering to points
  g.quadraticCurveTo(ex - 22, ey + 7, ex - 46, ey + 12);
  g.quadraticCurveTo(ex - 22, ey + 3, ex - 10, ey);
  g.quadraticCurveTo(ex - 22, ey - 4, ex - 42, ey - 11);
  g.quadraticCurveTo(ex - 20, ey - 8, right[right.length - 1][0], right[right.length - 1][1]);
  for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
  g.closePath();
  const tg = g.createLinearGradient(560, 0, 140, 0);
  tg.addColorStop(0, '#3a0a18');
  tg.addColorStop(0.4, '#b03c58');
  tg.addColorStop(1, '#e27890');
  g.fillStyle = tg;
  g.fill();
  g.strokeStyle = 'rgba(20,2,8,0.85)';
  g.lineWidth = 2;
  g.stroke();
  g.save();
  g.lineCap = 'round';
  g.beginPath();
  spine.slice(2).forEach(([x, y], i) => (i ? g.lineTo(x, y + 1) : g.moveTo(x, y + 1)));
  g.strokeStyle = 'rgba(40,4,14,0.6)';
  g.lineWidth = 2.4;
  g.stroke();
  g.beginPath();
  for (let i = 4; i < 19; i++) {
    const [sx, sy] = spine[i];
    const [lx, ly] = left[i];
    const px = sx + (lx - sx) * 0.5;
    const py = sy + (ly - sy) * 0.5;
    if (i > 4) g.lineTo(px, py);
    else g.moveTo(px, py);
  }
  g.strokeStyle = 'rgba(255,214,226,0.6)';
  g.lineWidth = 2;
  g.stroke();
  g.restore();
  // the near gum, a roll of wet flesh just inside the lip, swollen round the teeth's roots
  gum(g, linePts(100, 562, 46, lowLipY, 2), 10, -1, LOWER_TEETH.map(([x]) => x));
}

let lteethCache: HTMLCanvasElement | null = null;

/** The near lower teeth (cached, skull coordinates, swung with the jaw): they stand up from just inside the lower lip,
 * so with the mouth shut they rise in front of the upper lip, between the upper teeth hanging over the lower lip. */
export function paintLowerTeeth(): HTMLCanvasElement {
  if (lteethCache) return lteethCache;
  const [c, g] = makeCanvas(SK.w, SK.h);
  for (const [x, len, tw, bend] of LOWER_TEETH) {
    const k = (1 - ((x - 100) / 440) * 0.4) * 1.05;
    g.beginPath();
    g.ellipse(x, lowLipY(x) + 7, tw * k * 0.62, 4, 0, 0, P2);
    g.fillStyle = 'rgba(40,6,14,0.85)';
    g.fill();
    tooth(g, x, lowLipY(x) + 6, len * k, tw * k, -1, bend, 500 + x);
  }
  lteethCache = c;
  return c;
}

/** A frame of the maw (skull coordinates): the inside of the mouth as the jaw drops by o, filling the gape between
 * the upper lip and the dropped lower lip. Seen a little from the front, as the head aims at us: the roof of the mouth
 * running from the near upper lip across to the far one, ridged, a row of small palate teeth down it; the far upper
 * gum and teeth hanging from its far edge, in shadow; the dark throat at the back; the near upper gum along the lip;
 * the skin at the corner of the mouth stretched back to the hinge; strings of spit. (The floor of the mouth, the
 * tongue and the far lower teeth ride on the lower jaw: paintLowerJaw.) */
export function paintMaw(g: Ctx, o: number): void {
  if (o <= 0.01) return;
  const xc = MOUTH_C[0];
  const upper = linePts(84, xc, 32, gapeY, -3);
  const lowT = (x: number): Pt => jawTurn(x, lowLipY(x), o);
  const lower = linePts(xc, 92, 32, lowLipY, 0).map(([x, y]) => jawTurn(x, y, o));
  const hinge: Pt = [HINGE.x - 4, HINGE.y - 8];
  // the roof's far edge (the far upper lip, seen across the mouth): nearer the near lip at the snout, where the jaws
  // narrow, further across towards the back
  const palF = (x: number) => 0.3 + 0.16 * clamp01((x - 84) / (xc - 84));
  const mid = (x: number, f: number): Pt => {
    const [lx, ly] = lowT(x);
    const y0 = gapeY(x);
    return [x + (lx - x) * f, y0 + (ly - y0) * f];
  };
  const farUp = (x: number): Pt => {
    const [px, py] = mid(x, palF(x));
    return [px + FAR_OFF[0] * 0.5, py];
  };
  // the front of the mouth: the far lips curving round from the snout to the chin, bowed back into the mouth (there's
  // only air between the tips of the jaws in front of it)
  const [cx0, cy0] = lower[lower.length - 1];
  const [ux0, uy0] = upper[0];
  const bowF: Pt = [(cx0 + ux0) / 2 + 30 + 50 * o, (cy0 + uy0) / 2];
  g.save();
  g.beginPath();
  upper.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.lineTo(hinge[0], hinge[1]);
  lower.forEach(([x, y]) => g.lineTo(x, y));
  g.quadraticCurveTo(bowF[0], bowF[1], ux0, uy0);
  g.closePath();
  // the cavity: wet and dark, darkest at the back
  const bg = g.createLinearGradient(110, 0, HINGE.x, 0);
  bg.addColorStop(0, '#2e0a14');
  bg.addColorStop(0.35, '#12030a');
  bg.addColorStop(1, '#000000');
  g.fillStyle = bg;
  g.fill();
  g.clip();
  // the throat: the way in, a dark tunnel at the back of the mouth between the rows, opening as the jaw drops
  const [tx, ty] = mid(470, 0.5);
  const tr = 40 + 170 * o;
  const thg = g.createRadialGradient(tx + 24, ty, 2, tx + 24, ty, tr);
  thg.addColorStop(0, 'rgba(0,0,0,1)');
  thg.addColorStop(0.45, 'rgba(6,0,3,0.85)');
  thg.addColorStop(1, 'rgba(20,4,10,0)');
  g.fillStyle = thg;
  g.fillRect(0, 0, SK.w, SK.h + 260);
  g.beginPath();
  g.ellipse(tx + 30, ty + 4, tr * 0.42, tr * 0.22, -0.5, 0, P2);
  g.strokeStyle = `rgba(150,50,70,${0.3 * o})`;
  g.lineWidth = 2;
  g.stroke();
  // the roof of the mouth: from the near lip across to the far one, ridged, lit at the front
  const roofFar = linePts(84, xc, 30, gapeY).map(([x]) => farUp(x));
  g.save();
  g.beginPath();
  upper.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.lineTo(hinge[0] - 20, hinge[1] + 6);
  for (let i = roofFar.length - 1; i >= 0; i--) g.lineTo(roofFar[i][0], roofFar[i][1]);
  g.closePath();
  const rg = g.createLinearGradient(100, 0, xc + 20, 0);
  rg.addColorStop(0, '#c4687c');
  rg.addColorStop(0.5, '#8a3448');
  rg.addColorStop(1, '#2a0812');
  g.fillStyle = rg;
  g.fill();
  g.clip();
  // the ridges across it, chevrons pointing to the snout, fading into the dark at the back
  for (let i = 0; i < 11; i++) {
    const x = 104 + i * 42;
    const a = Math.max(0, 1 - i / 11);
    const [x1, y1] = farUp(x + 6);
    const y0 = gapeY(x) + 2;
    const cx = (x + x1) / 2 - 16;
    const cy = (y0 + y1) / 2;
    g.beginPath();
    g.moveTo(x, y0);
    g.quadraticCurveTo(cx, cy, x1, y1);
    g.strokeStyle = `rgba(36,4,12,${0.6 * a + 0.2})`;
    g.lineWidth = 5;
    g.stroke();
    g.beginPath();
    g.moveTo(x + 4, y0);
    g.quadraticCurveTo(cx + 4, cy, x1 + 4, y1);
    g.strokeStyle = `rgba(255,190,204,${0.55 * a})`;
    g.lineWidth = 1.6;
    g.stroke();
  }
  // the palate's teeth: a row of small hooked teeth down the middle of the roof
  for (let i = 0; i < 9; i++) {
    const x = 150 + i * 40;
    const [px, py] = mid(x, palF(x) * 0.5);
    tooth(g, px, py - 2, 14 - i * 0.7, 7 - i * 0.3, 1, -0.5, 820 + i);
  }
  // its wet sheen at the front
  g.beginPath();
  linePts(110, 330, 12, gapeY).forEach(([x], i) => {
    const [px, py] = mid(x, palF(x) * 0.3);
    if (i) g.lineTo(px, py);
    else g.moveTo(px, py);
  });
  g.strokeStyle = 'rgba(255,226,234,0.45)';
  g.lineWidth = 3;
  g.lineCap = 'round';
  g.stroke();
  g.restore();
  // the far upper gum along the roof's far edge, its teeth hanging into the mouth, in shadow
  dimmed(g, 0.72, (x) => {
    gum(x, roofFar, 8, 1, UPPER_TEETH.map(([ux]) => farUp(ux)[0]));
    for (const [ux, len, tw, bend, broken] of UPPER_TEETH) {
      const [fx, fy] = farUp(ux);
      const k = (1 - ((ux - 100) / 440) * 0.4) * 0.7;
      tooth(x, fx, fy + 4, len * k, tw * k, 1, bend, 760 + ux, broken);
    }
  });
  // the far lips round the front: a roll of wet gum along the front of the mouth, lit on its crest
  {
    const front = (c: Ctx) => {
      c.beginPath();
      c.moveTo(cx0, cy0);
      c.quadraticCurveTo(bowF[0], bowF[1], ux0, uy0);
    };
    g.save();
    g.lineCap = 'round';
    front(g);
    g.strokeStyle = '#5a1828';
    g.lineWidth = 22;
    g.stroke();
    front(g);
    g.strokeStyle = 'rgba(200,96,116,0.8)';
    g.lineWidth = 9;
    g.stroke();
    front(g);
    g.strokeStyle = 'rgba(255,220,228,0.5)';
    g.lineWidth = 2;
    g.stroke();
    g.restore();
  }
  // the near upper gum: a roll of wet flesh just inside the lip, where the near teeth hang from (they're on the skull)
  gum(g, linePts(88, xc - 4, 44, gapeY, -3), 11, 1, UPPER_TEETH.map(([x]) => x));
  // the corner of the mouth: skin stretched back from the lips to the hinge, creased with the stretch
  const A: Pt = [xc - 6, gapeY(xc) - 1];
  const B = lowT(xc - 6);
  const C: Pt = [hinge[0] + 6, hinge[1] + 8];
  const bow: Pt = [(A[0] + B[0]) / 2 + 26 + 40 * o, (A[1] + B[1]) / 2];
  g.beginPath();
  g.moveTo(A[0], A[1]);
  g.quadraticCurveTo(bow[0], bow[1], B[0], B[1]);
  g.lineTo(C[0] + 30, C[1] + 30);
  g.lineTo(C[0] + 30, A[1] - 10);
  g.closePath();
  const sg = g.createLinearGradient(bow[0] - 20, 0, C[0], 0);
  sg.addColorStop(0, '#7a5c68');
  sg.addColorStop(1, '#3a2836');
  g.fillStyle = sg;
  g.fill();
  g.save();
  g.lineCap = 'round';
  for (let k = 1; k < 6; k++) {
    const t = k / 6;
    const u = 1 - t;
    const ex = u * u * A[0] + 2 * u * t * bow[0] + t * t * B[0];
    const ey = u * u * A[1] + 2 * u * t * bow[1] + t * t * B[1];
    g.beginPath();
    g.moveTo(ex + 3, ey);
    g.lineTo(C[0], C[1] - 4 + (t - 0.5) * 12);
    g.strokeStyle = 'rgba(20,10,20,0.45)';
    g.lineWidth = 1.4;
    g.stroke();
  }
  g.beginPath();
  g.moveTo(A[0], A[1]);
  g.quadraticCurveTo(bow[0], bow[1], B[0], B[1]);
  g.strokeStyle = 'rgba(10,2,8,0.9)';
  g.lineWidth = 2.4;
  g.stroke();
  g.beginPath();
  g.moveTo(A[0] + 3, A[1] + 4);
  g.quadraticCurveTo(bow[0] + 3, bow[1], B[0] + 3, B[1] - 4);
  g.strokeStyle = 'rgba(255,210,220,0.4)';
  g.lineWidth = 1.4;
  g.stroke();
  g.restore();
  // strings of spit from the upper gum down to the floor of the mouth, stretching as it opens
  if (o > 0.12) {
    const r = rngOf(77);
    const a = Math.min(1, (o - 0.12) * 3) * (o > 0.9 ? 0.7 : 1);
    for (let k = 0; k < 6; k++) {
      const x = 150 + r() * 330;
      const x0 = x + (r() - 0.5) * 10;
      const y0 = gapeY(x0) + 12;
      const [lx, ly] = jawTurn(x + 10 + r() * 20, lowLipY(x) - 22, o);
      const cx = (x0 + lx) / 2 + 10;
      const cy = (y0 + ly) / 2 + 10 + r() * 16;
      g.beginPath();
      g.moveTo(x0, y0);
      g.quadraticCurveTo(cx, cy, lx, ly);
      g.strokeStyle = `rgba(226,206,222,${0.55 * a})`;
      g.lineWidth = 2 + r() * 1.6;
      g.stroke();
      g.strokeStyle = `rgba(255,255,255,${0.75 * a})`;
      g.lineWidth = 0.8;
      g.stroke();
      // a bead sliding down it
      const q = 0.35 + r() * 0.3;
      const bx = (1 - q) * (1 - q) * x0 + 2 * (1 - q) * q * cx + q * q * lx;
      const by = (1 - q) * (1 - q) * y0 + 2 * (1 - q) * q * cy + q * q * ly;
      g.beginPath();
      g.ellipse(bx, by, 2.6, 3.4, 0, 0, P2);
      g.fillStyle = `rgba(240,236,248,${0.8 * a})`;
      g.fill();
    }
  }
  g.restore();
}

// ——— the tusk, the eyes, the lids ———

/** The lower tusk, its root at (TUSK.fw/2, TUSK.fh − 14) in its frame, rising in front of the upper lip. */
export function paintTusk(g: Ctx): void {
  const x = TUSK.fw / 2;
  const y = TUSK.fh - 14;
  tooth(g, x, y, TUSK.len + 30, 28, -1, -0.3, 911);
  g.beginPath();
  g.ellipse(x, y + 2, 15, 6, 0, 0, P2);
  const gg = g.createLinearGradient(0, y - 6, 0, y + 12);
  gg.addColorStop(0, '#7a2a38');
  gg.addColorStop(1, '#3a0c18');
  g.fillStyle = gg;
  g.fill();
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
  lg.addColorStop(0, '#2e323c');
  lg.addColorStop(0.6, '#5a605e');
  lg.addColorStop(1, '#767c74');
  g.fillStyle = lg;
  g.fill();
  // one weathered plate: a crack, a fleck of lichen
  g.beginPath();
  g.moveTo(-rx * 0.2, -ry - 8);
  g.lineTo(-rx * 0.05, edge - 8);
  g.strokeStyle = 'rgba(8,8,14,0.55)';
  g.lineWidth = 1.4;
  g.stroke();
  g.fillStyle = 'rgba(150,150,104,0.45)';
  g.beginPath();
  g.ellipse(rx * 0.35, edge - 10, 6, 2.5, 0, 0, P2);
  g.fill();
  // its thick lower edge, and the ember glowing in the seam under it
  g.beginPath();
  g.moveTo(-rx - 8, edge - 2);
  g.quadraticCurveTo(0, edge + 8 * (1 - t * 0.6), rx + 8, edge - 4);
  g.strokeStyle = 'rgba(255,150,50,0.75)';
  g.lineWidth = 4;
  g.stroke();
  g.strokeStyle = '#1a1016';
  g.lineWidth = 2.4;
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

/** The neck's tile: NECK.w wide (the body NECK.r either side of NECK.cx, its dorsal ridge sticking out beyond the
 * right edge), repeating every NECK.h down. Seen turned like the head: the pale ribbed throat on its near side (left
 * of the middle), the stone-plated back on the right. The fight lays slices of it along a curve. */
export const NECK = { w: 340, h: 200, r: 130, cx: 150 };
/** The throat's middle, in unrolled units from the neck's middle. */
const THROAT_U = -82;

let neckCache: HTMLCanvasElement | null = null;

/** The neck's tile (cached). Its plates are laid on the unrolled cylinder, so they narrow as it turns away. */
export function paintNeck(): HTMLCanvasElement {
  if (neckCache) return neckCache;
  const { w, h, r, cx } = NECK;
  const [c, g] = makeCanvas(w, h);
  const mask = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) mask[y * w + x] = Math.round(255 * clamp01(r + 0.5 - Math.abs(x + 0.5 - cx)));
  const unroll = (x: number) => r * Math.asin(Math.max(-1, Math.min(1, (x + 0.5 - cx) / r)));
  // the throat's scutes: 8 to a tile of uneven widths, each overlapping the one below
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
  const span = Math.round(r * Math.PI) + 20;
  paintHide(g, {
    w,
    h,
    mask,
    form: (x) => 74 * Math.sqrt(Math.max(0, 1 - ((x + 0.5 - cx) / r) ** 2)),
    uv: (x, y, o) => {
      o[0] = unroll(x) + span / 2;
      o[1] = y;
    },
    plates: layPlates(97, 0, 0, span, h, (u) => (u - span / 2 > 40 ? 46 : 36), { wrapH: h, tries: 3000, lichen: 0.3 }),
    box: { x: 0, y: 0, w: span, h },
    cell: 32,
    wrapH: h,
    flesh: (_x, _y, u) => smooth(54, 40, Math.abs(u - span / 2 - THROAT_U)),
    ribs: (x, y) => {
      const f = scuteAt(y - 8 * (1 - ((unroll(x) - THROAT_U) / 54) ** 2));
      return 2 * smooth(0, 0.85, f) - smooth(0.85, 1, f);
    },
    crevice: 1.8,
    bevel: 6,
    relief: 6,
    shingle: 0.18,
    exposure: 1.3,
    formK: 1,
    gloss: 0.35,
    seed: 47,
  });
  // the scutes' seams curving round the throat, lit on their lower lips
  const tx = cx + r * Math.sin(THROAT_U / r);
  g.save();
  for (let k = 0; k <= 8; k++) {
    for (const off of [-h, 0, h]) {
      const y = bounds[k] + off;
      g.beginPath();
      g.moveTo(tx - 46, y - 1);
      g.quadraticCurveTo(tx, y + 12, tx + 46, y - 1);
      g.strokeStyle = 'rgba(50,30,60,0.4)';
      g.lineWidth = 2;
      g.stroke();
      g.beginPath();
      g.moveTo(tx - 42, y - 3.5);
      g.quadraticCurveTo(tx, y + 8, tx + 40, y - 3.5);
      g.strokeStyle = 'rgba(255,240,236,0.2)';
      g.lineWidth = 1.2;
      g.stroke();
    }
  }
  // the light: the near (left) side lit, the back in shade with the void's rim on its edge; the throat a step down so
  // it reads as pale flesh, not white (multiply over the body only: on empty canvas it would paint)
  g.save();
  g.beginPath();
  g.rect(cx - r, 0, r * 2, h);
  g.clip();
  g.globalCompositeOperation = 'multiply';
  const sh = g.createLinearGradient(cx - r, 0, cx + r, 0);
  sh.addColorStop(0, 'rgba(255,255,255,1)');
  sh.addColorStop(0.5, 'rgba(236,234,246,1)');
  sh.addColorStop(0.85, 'rgba(150,140,196,1)');
  sh.addColorStop(1, 'rgba(110,100,170,1)');
  g.fillStyle = sh;
  g.fillRect(0, 0, w, h);
  const th = g.createLinearGradient(tx - 56, 0, tx + 56, 0);
  th.addColorStop(0, 'rgba(255,255,255,1)');
  th.addColorStop(0.2, 'rgba(184,166,194,1)');
  th.addColorStop(0.8, 'rgba(160,142,180,1)');
  th.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = th;
  g.fillRect(tx - 56, 0, 112, h);
  g.restore();
  wetRuns(g, [[tx - 30, 20, 60], [tx + 10, 110, 50], [cx + 50, 40, 70], [cx + 80, 140, 50], [cx - 100, 80, 60]], 61, 0.45);
  // it's round: the body turns away into shadow at both edges, a soft wet sheen runs along it a third of the way
  // from its back, the belly turns away under it
  g.save();
  g.beginPath();
  g.rect(cx - r, 0, r * 2, h);
  g.clip();
  const turn = g.createLinearGradient(cx - r, 0, cx + r, 0);
  turn.addColorStop(0, 'rgba(14,10,30,0.7)');
  turn.addColorStop(0.16, 'rgba(14,10,30,0.22)');
  turn.addColorStop(0.32, 'rgba(14,10,30,0)');
  turn.addColorStop(0.7, 'rgba(14,10,30,0)');
  turn.addColorStop(0.88, 'rgba(14,10,30,0.3)');
  turn.addColorStop(1, 'rgba(14,10,30,0.72)');
  g.fillStyle = turn;
  g.fillRect(cx - r, 0, r * 2, h);
  const sheen = g.createLinearGradient(cx + r * 0.1, 0, cx + r * 0.62, 0);
  sheen.addColorStop(0, 'rgba(220,230,236,0)');
  sheen.addColorStop(0.5, 'rgba(220,230,236,0.14)');
  sheen.addColorStop(1, 'rgba(220,230,236,0)');
  g.fillStyle = sheen;
  g.fillRect(cx - r, 0, r * 2, h);
  g.restore();
  g.fillStyle = INK;
  g.fillRect(cx - r - 3, 0, 4, h);
  g.fillRect(cx + r - 1, 0, 4, h);
  g.fillStyle = rgbaOf('#c4b6ff', 0.6);
  g.fillRect(cx + r - 6, 0, 4, h);
  // the dorsal ridge running down its back: slabs standing out from it, leaning back (up the neck)
  for (const y0 of [24, 74, 124, 174]) {
    for (const off of [-h, 0, h]) {
      g.save();
      g.translate(cx + r - 2, y0 + off);
      g.rotate(Math.PI / 2);
      ridgeSlab(g, 0, 0, 24 + (y0 % 4) * 4, 22 + ((y0 * 7) % 13), -0.45, 400 + y0, true);
      g.restore();
    }
  }
  g.restore();
  neckCache = c;
  return c;
}

/** The body's hide as one long strip for the fight's tube (./jormRig.ts lays it along the serpent's spine): the neck's
 * tile turned to run along x, repeated BODY.len long; its back (the ridge) along the top, its belly along the bottom,
 * the middle of the body BODY.yc down from the top. */
export const BODY = { len: 2000, h: NECK.w, yc: NECK.w - NECK.cx };

let bodyCache: HTMLCanvasElement | null = null;
export function paintBodyStrip(): HTMLCanvasElement {
  if (bodyCache) return bodyCache;
  const tile = paintNeck();
  const [c, g] = makeCanvas(BODY.len, BODY.h);
  for (let x0 = 0; x0 < BODY.len; x0 += NECK.h) {
    // tile (x across, y along) → strip (along x, its back at the top)
    g.setTransform(0, -1, 1, 0, x0, NECK.w);
    g.drawImage(tile, 0, 0);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  bodyCache = c;
  return c;
}

/** The shadow the back of the skull throws on the neck where it overlaps it (skull units, SK.w × SK.h): drawn under
 * the skull, over the neck, so the neck reads as running in under the skull's last plates, not butted onto it. */
export function paintNape(g: Ctx): void {
  soft(g, SK.w, SK.h, (x) => {
    x.beginPath();
    x.moveTo(720, 150);
    x.bezierCurveTo(790, 170, 800, 300, 730, 360);
    x.lineTo(700, 380);
    x.strokeStyle = 'rgba(6,4,16,0.85)';
    x.lineWidth = 46;
    x.lineCap = 'round';
    x.stroke();
  }, 'source-over', 22);
}

/**
 * The neck painted along a cubic curve (for the still art: the fight lays the body strip along its spine as a tube,
 * ./jormRig.ts): P is the
 * curve's four points as x, y pairs, from the socket at the back of the skull (P[0], P[1]), arriving along the head's
 * axis, out to its far end (P[6], P[7]). k is canvas px per neck unit along it; across, it thickens from kHead at the
 * head to kFar. Slices of the tile overlap more where it bends, so the plates run on unbroken round the curve.
 */
export function drawNeckAlong(g: Ctx, P: number[], k: number, kHead: number, kFar: number): void {
  const pat = g.createPattern(paintNeck(), 'repeat');
  if (!pat) return;
  const at = (t: number): Pt => {
    const u = 1 - t;
    const a = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    return [a[0] * P[0] + a[1] * P[2] + a[2] * P[4] + a[3] * P[6], a[0] * P[1] + a[1] * P[3] + a[2] * P[5] + a[3] * P[7]];
  };
  const S = 60;
  const pts: Pt[] = [at(0)];
  const arc = [0];
  for (let i = 1; i <= S; i++) {
    pts.push(at(i / S));
    arc.push(arc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const L = arc[S];
  const along = (d: number): [number, number, number] => {
    // (before the socket it carries straight on into the skull, under its faded back)
    if (d < 0) {
      const [x0, y0] = pts[0];
      const [x1, y1] = pts[1];
      const l = Math.hypot(x1 - x0, y1 - y0) || 1;
      return [x0 + ((x1 - x0) / l) * d, y0 + ((y1 - y0) / l) * d, Math.atan2(-(x1 - x0), y1 - y0)];
    }
    const dd = Math.max(0, Math.min(L - 0.01, d));
    let j = 0;
    while (j < S - 1 && arc[j + 1] < dd) j++;
    const f = (dd - arc[j]) / Math.max(1e-3, arc[j + 1] - arc[j]);
    const [x0, y0] = pts[j];
    const [x1, y1] = pts[j + 1];
    return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, Math.atan2(-(x1 - x0), y1 - y0)];
  };
  const N = 30;
  const seg = L / N;
  for (let i = 0; i < N; i++) {
    const d0 = i * seg;
    const [, , r0] = along(d0);
    const [, , r1] = along(d0 + seg);
    let dr = Math.abs(r1 - r0);
    if (dr > Math.PI) dr = Math.PI * 2 - dr;
    const kx = kHead + (kFar - kHead) * Math.min(1, d0 / L / 0.6);
    const extra = dr * NECK.r * kx + 2;
    const start = i === 0 ? -90 * k : d0 - extra / 2;
    const [x, y, r] = along(start);
    const len = d0 + seg + extra / 2 - start;
    g.save();
    g.translate(x, y);
    g.rotate(r);
    g.scale(kx, k);
    g.translate(-NECK.cx, -start / k);
    g.fillStyle = pat;
    g.fillRect(0, start / k, NECK.w, len / k);
    g.restore();
  }
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
  // streams off the ridge running down the near side of the head, round the brow and over the cheek to the lip,
  // bending back along the head as they go; thinning as it drains (their tops first)
  for (let i = 0; i < 30; i++) {
    const t = i / 29;
    const k0 = Math.min(DORSAL.length - 2, Math.floor(1 + t * (DORSAL.length - 3)));
    const f = r();
    const sx = DORSAL[k0][0] + (DORSAL[k0 + 1][0] - DORSAL[k0][0]) * f;
    const sy = DORSAL[k0][1] + (DORSAL[k0 + 1][1] - DORSAL[k0][1]) * f + 18;
    const ex = sx - 24 - r() * 20;
    const ey = sx > 600 ? sy + 150 + r() * 40 : Math.min(gapeY(Math.max(90, ex)) + 6, 420);
    const wd = (3 + r() * 8) * (0.4 + thick * 0.9);
    const a = (0.1 + 0.4 * thick) * (0.6 + r() * 0.4);
    const top = sy + (ey - sy) * Math.min(0.9, u * 0.9 * (0.6 + r() * 0.8));
    g.beginPath();
    for (let s = 0; s <= 10; s++) {
      const q = s / 10;
      const yy = top + (ey - top) * q;
      const qq = (yy - sy) / Math.max(1, ey - sy);
      const xx = sx + (ex - sx) * qq * qq + Math.sin(qq * 3 + i) * 3;
      if (s) g.lineTo(xx, yy);
      else g.moveTo(xx, yy);
    }
    g.strokeStyle = `rgba(214,226,246,${a})`;
    g.lineWidth = wd;
    g.lineCap = 'round';
    g.stroke();
    g.strokeStyle = `rgba(255,255,255,${Math.min(1, a * 1.6)})`;
    g.lineWidth = Math.max(1, wd * 0.25);
    g.stroke();
  }
  // a sheet spilling off the brow ledge over the eye
  const hgt = 60 * thick + 10;
  const sg = g.createLinearGradient(0, 178, 0, 178 + hgt);
  sg.addColorStop(0, `rgba(240,246,255,${0.5 * thick})`);
  sg.addColorStop(1, 'rgba(220,230,250,0)');
  g.fillStyle = sg;
  g.beginPath();
  g.moveTo(340, 196);
  g.quadraticCurveTo(400, 180, 456, 186);
  g.lineTo(450, 186 + hgt);
  g.lineTo(346, 196 + hgt);
  g.closePath();
  g.fill();
  // drops off the lip
  for (let i = 0; i < 16; i++) {
    const x = 100 + (i / 15) * 440 + (r() - 0.5) * 10;
    const q = (u * 3 + r()) % 1;
    const y = gapeY(x) + 70 + q * 90;
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

/** The maw's frames cover this box of the skull (the widest gape fits in it). */
export const MAW = { x: 70, y: 290, w: 560, h: 400 };

/** Is a point of the head (skull units) on it, with the jaw open by `open`? (The skull, or the lower jaw swung down.) */
export function headHit(lx: number, ly: number, open: number): boolean {
  if (inPoly(lx, ly, skullPts())) return true;
  // the jaw: turn the point back by the jaw's swing and test it against the closed jaw (and the gape between)
  const [jx, jy] = jawTurn(lx, ly, -open);
  if (inPoly(jx, jy, jawPts())) return true;
  // the open mouth between them counts as the head
  if (open > 0.05 && lx > 90 && lx < HINGE.x && ly > gapeY(lx)) {
    const [, ly2] = jawTurn(lx, lowLipY(lx), open);
    return ly < ly2;
  }
  return false;
}

/** What the still head shows. */
export interface StillOpts {
  /** Jaw opening, eye frame, lid frame, kelp phase. */
  open?: number;
  eye?: number;
  lid?: number;
  ph?: number;
  /** Leave out the eye (and the glow) or the kelp. */
  eyes?: boolean;
  kelp?: boolean;
  glow?: boolean;
}

/** The head as one picture (skull units, SK.w × SK.h): the maw, the lower jaw swung by `open`, the eye under the
 * skull, the skull, the tusk, the kelp and the embers' glow. For the phase cards and the style art. */
export function paintHeadStill(g: Ctx, o: StillOpts = {}): void {
  const open = o.open ?? 0;
  if (open > 0.01) {
    const [mc, mg] = makeCanvas(MAW.w, MAW.h);
    mg.translate(-MAW.x, -MAW.y);
    paintMaw(mg, open);
    g.drawImage(mc, MAW.x, MAW.y);
  }
  g.save();
  g.translate(HINGE.x, HINGE.y);
  g.rotate(-JAW_MAX * open);
  g.translate(-HINGE.x, -HINGE.y);
  g.drawImage(paintLowerJaw(), 0, 0);
  g.restore();
  if (o.eyes !== false) paintEyesAt(g, o.eye ?? 0, o.lid ?? 0);
  g.drawImage(paintSkull(), 0, 0);
  g.save();
  g.translate(HINGE.x, HINGE.y);
  g.rotate(-JAW_MAX * open);
  g.translate(-HINGE.x, -HINGE.y);
  g.drawImage(paintLowerTeeth(), 0, 0);
  g.restore();
  const [tc, tg] = makeCanvas(TUSK.fw, TUSK.fh);
  paintTusk(tg);
  const [tx, ty] = jawTurn(TUSK.x, lowLipY(TUSK.x) + 6, open);
  g.save();
  g.translate(tx, ty);
  g.rotate(-JAW_MAX * open);
  g.drawImage(tc, -TUSK.fw / 2, -(TUSK.fh - 14));
  g.restore();
  if (o.kelp !== false) for (let i = 0; i < KELP.length; i++) paintKelpAt(g, i, o.ph ?? 0.2);
  if (o.glow !== false && o.eyes !== false) paintEyeGlows(g, 0.4);
}

/** The near eye (frame eye, lids lid) in its place (skull units). */
export function paintEyesAt(g: Ctx, eye: number, lid: number): void {
  const [ec, eg] = makeCanvas(EYE.fw, EYE.fh);
  paintEye(eg, eye);
  paintLid(eg, lid);
  g.drawImage(ec, EYE.x - EYE.fw / 2, EYE.y - EYE.fh / 2);
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

/** The embers in the eyes, as light (skull units): the near eye, and a smaller glow from the far one. */
export function paintEyeGlows(g: Ctx, a: number): void {
  const [gc, gg] = makeCanvas(128, 128);
  paintGlow(gg, 128);
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = a;
  g.drawImage(gc, EYE.x - 64, EYE.y - 64);
  g.globalAlpha = a * 0.7;
  g.drawImage(gc, FAR_EYE.x - 32, FAR_EYE.y - 32, 64, 64);
  g.restore();
}
