// Polished silver salvers: the waiters' trays (Waiter Walt's shield, the Head Waiter's grand gadrooned one, the tray a
// delivery waiter brings him with a cloche on it). Drawn in the style kit's one light (top left): the face mirrors the
// room (a warm dim ceiling, a bright window across the middle, the pale tablecloth below), the raised rim is lit along
// its upper left and falls dark on its lower right, with a cool rim light on its far edge. Ornaments round a rim (beads,
// gadroons) sit on one shared spacing. Cosmetic randomness only from seeded generators.

import type { PathFn } from '../../art/style/kit';
import { LIGHT, softFill, softStroke, spec } from '../../art/style/kit';
import { type Ctx, rgba, rng } from '../../art/util';

export interface SalverLook {
  /** The rim's ornament: a row of beads (Walt's) or gadroons (the Head Waiter's). */
  rim: 'beads' | 'gadroon';
  /** How many ornaments round the rim. */
  n: number;
  /** The engraved monogram in the middle (the Head Waiter's). */
  monogram?: boolean;
  /** Where the rim steps down into the well (fraction of the radius). */
  well?: number;
}

/** The Head Waiter's grand salver: gadrooned rim, his monogram engraved in the well. */
export const GRAND_SALVER: SalverLook = { rim: 'gadroon', n: 40, monogram: true, well: 0.8 };

export const salverPath = (cx: number, cy: number, r: number): PathFn => (c) => {
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
};

const [LX, LY] = LIGHT.dir;

/** The room mirrored in the silver, along a slightly tilted vertical: dim warm ceiling, a bright window band, the pale
 * cloth, a dark foot. `shift` moves the horizon (the well sits lower than the rim, so its reflection is offset). */
function mirror(g: Ctx, cx: number, cy: number, r: number, shift = 0): CanvasGradient {
  const a = -0.18;
  const dx = Math.sin(a) * r;
  const dy = Math.cos(a) * r;
  const gr = g.createLinearGradient(cx + dx, cy - dy + shift, cx - dx, cy + dy + shift);
  // the trattoria mirrored: its dark beams, the neon sign's pink, the warm wall, the window, the pale cloth, the floor
  gr.addColorStop(0, '#2e2220');
  gr.addColorStop(0.14, '#5a3a32');
  gr.addColorStop(0.24, '#a4707c');
  gr.addColorStop(0.3, '#7a5650');
  gr.addColorStop(0.39, '#d6c6b6');
  gr.addColorStop(0.44, '#fffaf0');
  gr.addColorStop(0.5, '#ffffff');
  gr.addColorStop(0.55, '#b8b6ba');
  gr.addColorStop(0.72, '#efe8e0');
  gr.addColorStop(0.86, '#a89c98');
  gr.addColorStop(1, '#3e3434');
  return gr;
}

/** The room's warm lights over the mirror: the oven's orange glow low on the left, the neon's pink high on the right. */
function roomGlow(g: Ctx, cx: number, cy: number, r: number): void {
  const ov = g.createRadialGradient(cx - r * 0.62, cy + r * 0.18, 0, cx - r * 0.62, cy + r * 0.18, r * 0.62);
  ov.addColorStop(0, 'rgba(255,150,60,0.55)');
  ov.addColorStop(0.5, 'rgba(255,120,40,0.22)');
  ov.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = ov;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);
  const ne = g.createRadialGradient(cx + r * 0.5, cy - r * 0.5, 0, cx + r * 0.5, cy - r * 0.5, r * 0.5);
  ne.addColorStop(0, 'rgba(255,110,190,0.3)');
  ne.addColorStop(1, 'rgba(255,110,190,0)');
  g.fillStyle = ne;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);
}

/** A bright four-point star (the sun caught on the metal). */
function star(g: Ctx, x: number, y: number, s: number, a = 1): void {
  g.save();
  g.fillStyle = rgba('#ffffff', a);
  g.beginPath();
  g.moveTo(x, y - s);
  g.quadraticCurveTo(x + s * 0.12, y - s * 0.12, x + s, y);
  g.quadraticCurveTo(x + s * 0.12, y + s * 0.12, x, y + s);
  g.quadraticCurveTo(x - s * 0.12, y + s * 0.12, x - s, y);
  g.quadraticCurveTo(x - s * 0.12, y - s * 0.12, x, y - s);
  g.fill();
  g.restore();
}

/** The face of a salver, face-on, centred on (cx, cy) with radius r (draw it on a Sil's layer clipped to salverPath). */
export function paintSalver(g: Ctx, cx: number, cy: number, r: number, look: SalverLook): void {
  const well = (look.well ?? 0.8) * r;
  const u = r / 80;
  // the whole face mirrors the room
  g.fillStyle = mirror(g, cx, cy, r);
  g.fillRect(cx - r - 2, cy - r - 2, r * 2 + 4, r * 2 + 4);
  roomGlow(g, cx, cy, r);
  // the raised rim: lit along its upper left, falling dark on its lower right
  g.save();
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.arc(cx, cy, well, 0, Math.PI * 2, true);
  g.clip();
  const rimG = g.createLinearGradient(cx + LX * r, cy + LY * r, cx - LX * r, cy - LY * r);
  rimG.addColorStop(0, 'rgba(255,255,255,0.75)');
  rimG.addColorStop(0.35, 'rgba(230,236,244,0.2)');
  rimG.addColorStop(0.6, 'rgba(40,48,62,0.15)');
  rimG.addColorStop(1, 'rgba(24,30,42,0.6)');
  g.fillStyle = rimG;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);
  // the rim's own round section: a bright crest running round it, darker towards both its edges
  const crest = g.createRadialGradient(cx, cy, well, cx, cy, r);
  crest.addColorStop(0, 'rgba(20,26,38,0.35)');
  crest.addColorStop(0.45, 'rgba(255,255,255,0.32)');
  crest.addColorStop(0.75, 'rgba(255,255,255,0)');
  crest.addColorStop(1, 'rgba(20,26,38,0.4)');
  g.fillStyle = crest;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);
  // its ornaments, on one spacing all the way round
  const mid = (r + well) / 2;
  const n = look.n;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = cx + Math.cos(a) * mid;
    const y = cy + Math.sin(a) * mid;
    // how much this one faces the light (the rim's upper left is lit)
    const lit = 0.5 - 0.5 * (Math.cos(a) * -LX + Math.sin(a) * -LY);
    if (look.rim === 'beads') {
      const br = (r - well) * 0.3;
      g.fillStyle = rgba('#1a2030', 0.35);
      g.beginPath();
      g.arc(x - LX * br * 0.35, y - LY * br * 0.35, br * 1.05, 0, Math.PI * 2);
      g.fill();
      const bg = g.createRadialGradient(x + LX * br * 0.45, y + LY * br * 0.45, br * 0.1, x, y, br);
      bg.addColorStop(0, '#ffffff');
      bg.addColorStop(0.5, lit > 0.5 ? '#c8d0da' : '#dde3ea');
      bg.addColorStop(1, '#4a5260');
      g.fillStyle = bg;
      g.beginPath();
      g.arc(x, y, br, 0, Math.PI * 2);
      g.fill();
    } else {
      // a gadroon: a long convex lobe across the rim, lit on its light side, a dark flute after it
      const len = (r - well) * 0.42;
      const wid = ((Math.PI * 2 * mid) / n) * 0.36;
      g.save();
      g.translate(x, y);
      g.rotate(a + 0.32);
      g.fillStyle = rgba('#141a26', 0.42);
      g.beginPath();
      g.ellipse(wid * 0.45, 0, len * 1.02, wid * 1.05, 0, 0, Math.PI * 2);
      g.fill();
      const lg = g.createLinearGradient(0, -wid, 0, wid);
      lg.addColorStop(0, '#ffffff');
      lg.addColorStop(0.45, '#d4dae2');
      lg.addColorStop(1, '#565e6c');
      g.fillStyle = lg;
      g.beginPath();
      g.ellipse(0, 0, len, wid, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = rgba('#ffffff', 0.5 + 0.4 * (1 - lit));
      g.beginPath();
      g.ellipse(-len * 0.15, -wid * 0.45, len * 0.55, wid * 0.22, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }
  g.restore();
  // the step down into the well: shadowed on its upper left (it faces away from the light), lit on its lower right
  g.lineCap = 'round';
  g.strokeStyle = rgba('#141a26', 0.55);
  g.lineWidth = 2.6 * u;
  g.beginPath();
  g.arc(cx, cy, well, Math.PI * 0.75, Math.PI * 1.85);
  g.stroke();
  g.strokeStyle = rgba('#ffffff', 0.85);
  g.lineWidth = 1.8 * u;
  g.beginPath();
  g.arc(cx, cy, well - 1.2 * u, -0.25, Math.PI * 0.7);
  g.stroke();
  // the well: the room again, a touch lower (it sits below the rim), spun-polish rings in it
  g.save();
  g.beginPath();
  g.arc(cx, cy, well - 2 * u, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = mirror(g, cx, cy, well, 6 * u);
  g.fillRect(cx - well, cy - well, well * 2, well * 2);
  roomGlow(g, cx, cy, well);
  const ao = g.createRadialGradient(cx, cy, well * 0.7, cx, cy, well);
  ao.addColorStop(0, 'rgba(20,26,38,0)');
  ao.addColorStop(1, 'rgba(20,26,38,0.28)');
  g.fillStyle = ao;
  g.fillRect(cx - well, cy - well, well * 2, well * 2);
  const rr = rng(Math.round(cx * 7 + cy * 13 + r));
  for (let k = 0; k < 26; k++) {
    g.strokeStyle = rgba(rr() < 0.5 ? '#ffffff' : '#1a2030', 0.05 + rr() * 0.05);
    g.lineWidth = 0.6 * u;
    g.beginPath();
    g.arc(cx, cy, well * (0.08 + 0.9 * rr()), 0, Math.PI * 2);
    g.stroke();
  }
  // the window mirrored in the well: two panes and a mullion, soft
  const panes = (c: Ctx) => {
    c.beginPath();
    c.roundRect(cx - well * 0.64, cy - well * 0.6, well * 0.3, well * 0.34, 3 * u);
    c.roundRect(cx - well * 0.3, cy - well * 0.62, well * 0.3, well * 0.34, 3 * u);
  };
  softFill(g, panes, rgba('#ffffff', 0.35), 5 * u);
  softFill(g, panes, rgba('#ffffff', 0.55), 1.2 * u);
  if (look.monogram) monogram(g, cx, cy, well * 0.62, u);
  g.restore();
  // a broad sheen across the upper left and the sun caught on the rim
  softStroke(g, (c) => {
    c.moveTo(cx - r * 0.78, cy + r * 0.05);
    c.quadraticCurveTo(cx - r * 0.55, cy - r * 0.6, cx + r * 0.05, cy - r * 0.8);
  }, rgba('#ffffff', 0.55), 6 * u, 4 * u);
  spec(g, cx - r * 0.42, cy - r * 0.5, 16 * u, 5 * u, 0.7, -0.75);
  // the outer edge: a crisp highlight along its lit upper left, a dark bevel turning away on its lower right
  g.lineCap = 'round';
  g.strokeStyle = rgba('#0c1018', 0.55);
  g.lineWidth = 4 * u;
  g.beginPath();
  g.arc(cx, cy, r - 2.4 * u, -0.35, Math.PI * 0.85);
  g.stroke();
  g.strokeStyle = rgba('#ffffff', 0.95);
  g.lineWidth = 1.8 * u;
  g.beginPath();
  g.arc(cx, cy, r - 1.6 * u, Math.PI * 1.02, Math.PI * 1.62);
  g.stroke();
  star(g, cx - r * 0.62, cy - r * 0.58, 9 * u, 0.95);
  star(g, cx + r * 0.58, cy + r * 0.62, 4.5 * u, 0.6);
}

/** The Head Waiter's monogram, engraved: an interlaced script H and W in an oval cartouche of laurel, the grooves dark
 * with a lit far wall (the light comes from the top left). */
function monogram(g: Ctx, cx: number, cy: number, s: number, u: number): void {
  const groove = (draw: (c: Ctx) => void, w: number) => {
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    draw(g);
    g.strokeStyle = rgba('#202838', 0.55);
    g.lineWidth = w;
    g.stroke();
    g.translate(-LX * w * 0.45, -LY * w * 0.45);
    g.beginPath();
    draw(g);
    g.strokeStyle = rgba('#ffffff', 0.7);
    g.lineWidth = w * 0.4;
    g.stroke();
    g.restore();
  };
  const k = s / 50;
  const X = (x: number) => cx + x * k;
  const Y = (y: number) => cy + y * k;
  // the cartouche: an engraved oval and a ring of laurel leaves round it
  groove((c) => c.ellipse(cx, cy, 44 * k, 38 * k, 0, 0, Math.PI * 2), 1.4 * u);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const a = Math.PI / 2 + side * (0.35 + i * 0.36);
      const x = cx + Math.cos(a) * 49 * k;
      const y = cy + Math.sin(a) * 43 * k;
      groove((c) => c.ellipse(x, y, 5.5 * k, 2.4 * k, a + side * 1.25, 0, Math.PI * 2), 1 * u);
    }
  }
  // the H: two tall strokes with a swash bar
  groove((c) => {
    c.moveTo(X(-24), Y(-22));
    c.bezierCurveTo(X(-20), Y(-8), X(-26), Y(10), X(-22), Y(24));
    c.moveTo(X(-4), Y(-26));
    c.bezierCurveTo(X(-2), Y(-10), X(-8), Y(8), X(-6), Y(22));
    c.moveTo(X(-30), Y(2));
    c.bezierCurveTo(X(-20), Y(-4), X(-10), Y(4), X(2), Y(-2));
  }, 2.6 * u);
  // the W, laced through it: a looped lead-in, two valleys and a curled tail
  groove((c) => {
    c.moveTo(X(-14), Y(-18));
    c.bezierCurveTo(X(-18), Y(-26), X(-6), Y(-28), X(-6), Y(-18));
    c.bezierCurveTo(X(-4), Y(-4), X(0), Y(14), X(4), Y(22));
    c.bezierCurveTo(X(8), Y(10), X(10), Y(0), X(13), Y(-8));
    c.bezierCurveTo(X(16), Y(2), X(18), Y(14), X(22), Y(22));
    c.bezierCurveTo(X(26), Y(8), X(30), Y(-8), X(32), Y(-18));
    c.bezierCurveTo(X(34), Y(-26), X(26), Y(-28), X(26), Y(-20));
  }, 2.6 * u);
}

/** A salver's underside (a tumbling tray shows it): duller and darker, the raised foot ring and a hallmark. */
export function paintSalverBack(g: Ctx, cx: number, cy: number, r: number): void {
  const u = r / 80;
  // satin-finished underneath: duller than the face, the room's warmth faint in it
  const gr = g.createLinearGradient(cx + LX * r, cy + LY * r, cx - LX * r, cy - LY * r);
  gr.addColorStop(0, '#e2e4e8');
  gr.addColorStop(0.45, '#9ea4ae');
  gr.addColorStop(1, '#3c4250');
  g.fillStyle = gr;
  g.fillRect(cx - r - 2, cy - r - 2, r * 2 + 4, r * 2 + 4);
  roomGlow(g, cx, cy, r * 0.9);
  // radial brushing from the centre out, as it was spun and polished
  const rr = rng(Math.round(cx * 3 + r));
  g.lineCap = 'round';
  for (let k = 0; k < 90; k++) {
    const a = rr() * Math.PI * 2;
    const r0 = r * (0.1 + rr() * 0.4);
    const r1 = r0 + r * (0.2 + rr() * 0.4);
    g.strokeStyle = rgba(rr() < 0.5 ? '#ffffff' : '#1a2030', 0.06 + rr() * 0.08);
    g.lineWidth = (0.5 + rr() * 0.6) * u;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    g.stroke();
  }
  // the rim's thickness: a rolled band round the edge, lit on its upper left, its lip dark on the lower right
  const band = g.createLinearGradient(cx + LX * r, cy + LY * r, cx - LX * r, cy - LY * r);
  band.addColorStop(0, '#ffffff');
  band.addColorStop(0.5, '#7c8490');
  band.addColorStop(1, '#262c38');
  g.strokeStyle = band;
  g.lineWidth = 11 * u;
  g.beginPath();
  g.arc(cx, cy, r - 5.5 * u, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = rgba('#10141c', 0.6);
  g.lineWidth = 1.6 * u;
  g.beginPath();
  g.arc(cx, cy, r - 11 * u, 0, Math.PI * 2);
  g.stroke();
  // the foot ring: a raised band with its shadow thrown off it (away from the light) and its lit upper edge
  g.strokeStyle = rgba('#10141c', 0.45);
  g.lineWidth = 6 * u;
  g.beginPath();
  g.arc(cx - LX * 3 * u, cy - LY * 3 * u, r * 0.56, 0, Math.PI * 2);
  g.stroke();
  const fr = g.createLinearGradient(cx + LX * r * 0.6, cy + LY * r * 0.6, cx - LX * r * 0.6, cy - LY * r * 0.6);
  fr.addColorStop(0, '#ffffff');
  fr.addColorStop(0.5, '#a8aeb8');
  fr.addColorStop(1, '#4a5260');
  g.strokeStyle = fr;
  g.lineWidth = 5 * u;
  g.beginPath();
  g.arc(cx, cy, r * 0.56, 0, Math.PI * 2);
  g.stroke();
  // a hallmark: three small struck marks in a row
  for (let i = 0; i < 3; i++) {
    const x = cx - 11 * u + i * 11 * u;
    g.fillStyle = rgba('#20283a', 0.6);
    g.beginPath();
    g.roundRect(x - 4 * u, cy - 3.5 * u, 8 * u, 7 * u, 1.4 * u);
    g.fill();
    g.fillStyle = rgba('#ffffff', 0.5);
    g.fillRect(x - 3.4 * u, cy + 2.6 * u, 6.8 * u, 0.9 * u);
  }
  spec(g, cx - r * 0.4, cy - r * 0.45, 20 * u, 5 * u, 0.4, -0.75);
}

/** The soft shadow a held tray casts on the foot behind it (offset away from the light), drawn outside its disc. */
export function salverShadow(g: Ctx, cx: number, cy: number, r: number): void {
  softFill(g, (c) => {
    c.beginPath();
    c.ellipse(cx - LX * r * 0.1, cy - LY * r * 0.12, r * 1.0, r * 0.98, 0, 0, Math.PI * 2);
  }, rgba('#0a0c14', 0.55), r * 0.08);
}


// ——— the tray a delivery waiter carries: held flat, seen from a little above, a cloche over the dish ———

/** The cloche's size on a tray of half-width rx. */
const dome = (x: number, y: number, rx: number, ry: number) => ({ dw: rx * 0.58, dh: rx * 0.84, by: y - ry * 0.1, x });

/** The carried tray's outline parts: its face (with its edge under it) and the cloche (x, y: the face's middle). */
export function clocheTrayPaths(x: number, y: number, rx: number, ry: number): PathFn[] {
  const u = rx / 80;
  const { dw, dh, by } = dome(x, y, rx, ry);
  return [
    (c) => {
      c.beginPath();
      c.ellipse(x, y + 3 * u, rx, ry + 3 * u, 0, 0, Math.PI * 2);
    },
    (c) => {
      c.beginPath();
      c.moveTo(x - dw, by);
      c.bezierCurveTo(x - dw, by - dh * 1.3, x + dw, by - dh * 1.3, x + dw, by);
      c.ellipse(x, by, dw, ry * 0.36, 0, 0, Math.PI);
      c.closePath();
    },
    (c) => {
      c.beginPath();
      c.ellipse(x, by - dh * 1.02, 7 * u, 5.5 * u, 0, 0, Math.PI * 2);
    },
  ];
}

/** Paint the carried tray and its cloche (on a Sil's layer clipped to clocheTrayPaths). */
export function paintClocheTray(g: Ctx, x: number, y: number, rx: number, ry: number): void {
  const u = rx / 80;
  // the tray's edge (its thickness) under the face, lit along its near rim
  const edge = g.createLinearGradient(x - rx, 0, x + rx, 0);
  edge.addColorStop(0, '#c8ccd4');
  edge.addColorStop(0.5, '#6a7280');
  edge.addColorStop(1, '#2c323e');
  g.fillStyle = edge;
  g.beginPath();
  g.ellipse(x, y + 6 * u, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
  // the face: the Head Waiter's own salver (gadroons, monogram), seen from a little above
  g.save();
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.clip();
  g.translate(x, y);
  g.scale(1, ry / rx);
  paintSalver(g, 0, 0, rx, GRAND_SALVER);
  g.restore();
  // the cloche: a tall polished dome on a rolled band
  const { dw, dh, by } = dome(x, y, rx, ry);
  g.fillStyle = rgba('#0a0c14', 0.3);
  g.beginPath();
  g.ellipse(x + 4 * u, by + 3 * u, dw * 1.04, ry * 0.42, 0, 0, Math.PI * 2);
  g.fill();
  const dg = g.createLinearGradient(x - dw, by - dh, x + dw, by);
  dg.addColorStop(0, '#ffffff');
  dg.addColorStop(0.2, '#e6eaf0');
  dg.addColorStop(0.4, '#7c8490');
  dg.addColorStop(0.56, '#f0f3f7');
  dg.addColorStop(0.8, '#a4acb8');
  dg.addColorStop(1, '#465060');
  g.fillStyle = dg;
  g.beginPath();
  g.moveTo(x - dw, by);
  g.bezierCurveTo(x - dw, by - dh * 1.3, x + dw, by - dh * 1.3, x + dw, by);
  g.ellipse(x, by, dw, ry * 0.36, 0, 0, Math.PI);
  g.closePath();
  g.fill();
  // the room mirrored round the dome: a dark band low on it, the window high on its shoulder
  g.save();
  g.beginPath();
  g.moveTo(x - dw, by);
  g.bezierCurveTo(x - dw, by - dh * 1.3, x + dw, by - dh * 1.3, x + dw, by);
  g.closePath();
  g.clip();
  g.fillStyle = rgba('#2a2c34', 0.35);
  g.beginPath();
  g.ellipse(x, by + dh * 0.05, dw * 1.1, dh * 0.3, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
  // the rolled band round its foot
  g.strokeStyle = rgba('#ffffff', 0.85);
  g.lineWidth = 2 * u;
  g.beginPath();
  g.ellipse(x, by - 2 * u, dw * 0.98, ry * 0.33, 0, 0.1, Math.PI - 0.1);
  g.stroke();
  g.strokeStyle = rgba('#2a3240', 0.6);
  g.lineWidth = 1.5 * u;
  g.beginPath();
  g.ellipse(x, by + 1.5 * u, dw, ry * 0.36, 0, 0.05, Math.PI - 0.05);
  g.stroke();
  softStroke(g, (c) => {
    c.moveTo(x - dw * 0.62, by - dh * 0.14);
    c.quadraticCurveTo(x - dw * 0.55, by - dh * 0.56, x - dw * 0.12, by - dh * 0.72);
  }, rgba('#ffffff', 0.9), 5 * u, 2 * u);
  star(g, x - dw * 0.4, by - dh * 0.58, 8 * u, 0.95);
  // the knob on its little stem
  g.fillStyle = '#5a6270';
  g.fillRect(x - 2 * u, by - dh * 0.99, 4 * u, 6 * u);
  const kg = g.createRadialGradient(x - 2 * u, by - dh * 1.04, 0.5 * u, x, by - dh * 1.02, 7 * u);
  kg.addColorStop(0, '#ffffff');
  kg.addColorStop(1, '#5a6270');
  g.fillStyle = kg;
  g.beginPath();
  g.ellipse(x, by - dh * 1.02, 7 * u, 5.5 * u, 0, 0, Math.PI * 2);
  g.fill();
}

/** Steam curling from under the cloche's lip (something hot is in there), drawn outside its outline. */
export function paintClocheSteam(g: Ctx, x: number, y: number, rx: number, ry: number): void {
  const u = rx / 80;
  const { dw, by } = dome(x, y, rx, ry);
  for (const [sx, h, a] of [[-0.85, 1, 0.6], [0.8, 0.8, 0.5]] as const) {
    softStroke(g, (c) => {
      const x0 = x + dw * sx;
      c.moveTo(x0, by - 2 * u);
      c.bezierCurveTo(x0 - 10 * u, by - 20 * u * h, x0 + 10 * u, by - 32 * u * h, x0 - 2 * u, by - 50 * u * h);
    }, rgba('#ffffff', a), 4.5 * u, 3 * u);
  }
}
