// The Symbiote Lab (Venomnom's arena: the comic-hero nemesis mini-boss met with Spider-Pan equipped, in place of Ultoe
// at wave 68; src/game/nemesis.ts), redrawn with the location kit (src/art/scene) in Act 7's pulp-comic print
// (src/art/scene/print.ts), of a piece with the Doom Lab and the HYDRANT Bunker (scene-doomlab.ts, scene-redsole.ts):
// bold ink weighted on the shadow side, flat fields modelled in halftone dots, hatching in the deepest shade, at the
// painterly fidelity of the recent arenas. Everything here is our own: the lab, its signs and the thing that got out.
//
// A biolab's containment chamber gone wrong, at night. Clinical wall panels on one grid under a steel lintel and a
// soffit of ducts and cable trays. In the middle the containment tank: a steel crown and a stepped plinth with a thick
// glass cylinder between them, SMASHED FROM THE INSIDE: jagged teeth of glass top and bottom, cracks running into what
// is left, shards across the floor. Black goo with a white-blue sheen heaves in the tank's remains, pours over the
// broken rim and down the plinth into a glossy pool, and has crept out in tendrils: along the floor, up the walls,
// across the ceiling, webbing between the pipes. Left: a sonic emitter's armoured wall mount (empty: the emitter is
// the fight's own prop), a sealed observation window with a goo foot pressed flat against it, and a bank of lab
// consoles, one smashed and sparking. Right: a warning screen reading CONTAINMENT BREACH, a sample cabinet of glowing
// vials (a shelf smashed), the second emitter mount, a safety shower and a biohazard drum oozing at the lid. The
// table is a lab bench of pale grey composite with a black epoxy edge.
//
// Lit cold blue-white by two strip lights and sickly purple from the tank; the goo's sheen is the hero material.
//
// Live, the heroes:
// - the goo: the pour over the broken rim painted at 12 phases (lumps of goo rolling down it, its sheen sliding, its
//   edges wobbling); the heart of goo still in the tank breathing at 12 phases, purple veins pulsing out through it;
//   tendrils (two painted shapes at 12 extensions each) creeping and retracting along the floor, up the walls and
//   over the ceiling; drips swelling on their necks under the webs and the cap, stretching, letting go, falling and
//   splashing;
// - the strip lights: stuttering, and lighting the room for real (live-only layers of their light laid on with ADD,
//   so when a tube dies the walls go dark);
// - the smashed console spitting sparks that bounce on its desk; the warning screen's ticker scrolling and its banner
//   blinking.
// Stomps: the goo jiggles (the tendrils wobble on springs, the pour and the heart squash), every hanging drip lets go,
// shards skitter across the floor, a light buzzes and dies for a moment.
// The fight (src/game/bosses/comics.ts, the venomnom brain) drives it: 'venomnom-lash' (the heart lurches and the
// tendrils twitch), 'venomnom-bind' (the goo surges and reaches: every tendril strains out, the heart flares),
// 'venomnom-split' (a bigger surge, and the lights stutter), 'venomnom-pulse' (an emitter fires: every strand of goo
// recoils and shrivels, the heart clenches, the lights blaze, the glass rattles and shards skitter; then it creeps
// slowly back) and 'venomnom-emitter' (an emitter mounted or spent: its mount's lamp goes green or red). Listeners go
// on scene SHUTDOWN. On the stages page the arena runs a demo cycle.
// The emitters themselves are the fight's props (p_cm_emitter, placed at VL.emitters): the backdrop paints their
// mounts only, so the smackable prop never reads as scenery.
// (The old art is kept in scenes-comics.ts for the before/after page.)

import Phaser from 'phaser';
import { type Box, type Ctx, type PathFn, type R, TY, W, calmLanes, castShadow, crevice, ellPath, glowAt, groundShadow, lightPool, polyPath, rectPath, rrPath, vfill, vignetteAll, within } from '../../art/scene/kit';
import type { SceneSpec } from '../../art/scene/layers';
import { aoHalo } from '../../art/scene/light';
import { tableFalloff, tableSeam } from '../../art/scene/materials';
import { grime, surface } from '../../art/scene/paint';
import { dots, flat, hatch, ink, linTone } from '../../art/scene/print';
import { mix, rgba, rng } from '../../art/util';
import { crand } from '../../systems/cosmeticRandom';
import { calm, registerKitScene, wander } from '../../game/sceneLive';
import { Parts, Spring, sheet } from '../../game/sceneAnim';
import { BLOCK, INK, P2, smooth } from './scene-metropizza';
import { VL } from './scenes-comics';

// ——— layout ———

export const VN = {
  /** The eye (floor lines run to it). */
  vp: { x: 960, y: 300 },
  /** The soffit's foot, the lintel under it, the wall's foot, the table's front edge. */
  soffit: 96,
  ceil: 122,
  floor: 644,
  front: 1040,
  /** The containment tank: its centre line and glass radius, the crown (cap), the glass, the plinth's two steps. */
  tank: { x: VL.tank.x, r: 150, capTop: 122, capBot: 196, glassBot: 566, step: 604, foot: 644 },
  /** The sonic emitters' wall mounts (the fight's props sit at exactly these points: VL.emitters). */
  mounts: VL.emitters,
  /** The two strip lights (centre, the tube's y). */
  strips: [
    { x: 330, y: 150 },
    { x: 1590, y: 150 },
  ],
  window: { x: 430, y: 196, w: 260, h: 210 },
  consoles: { x0: 36, x1: 700, riser: 462, top: 500, lip: 536, foot: 644 },
  screen: { x: 1232, y: 254, w: 262, h: 126 },
  cabinet: { x0: 1254, x1: 1498, top: 404, foot: 644 },
  shower: { x: 1858, head: 352 },
  drum: { x: 1650, y: 644, r: 54, h: 124 },
};

const T = VN.tank;
const FLOOR = VN.floor;
const VP = VN.vp;
/** The panel grid every seam, rivet and bracket keeps to. */
const PANEL = 160;
const RIV = 40;
const ROWS = [VN.ceil, 302, 482, 604];

// palette: cold composite and steel, the goo's violet-black, its white-blue sheen, the tank's purple, hazard ochre
const PAN = '#4a5466';
const SHADE = '#121426';
const STEEL = '#4c5462';
const GOO = '#0d0b16';
const GOO_LIT = '#2c2846';
const SHEEN = '#dfe8ff';
const SHEEN_B = '#8ea2ff';
const VIOLET = '#8a5cff';
const VIOLET_D = '#4a2a9a';
const COLD = '#cfe4ff';
const HAZ = '#d8a428';

// ——— small things ———

/** A rivet: a lit dome, inked. */
function rivet(ctx: Ctx, x: number, y: number, s: number, col = '#9aa4b4'): void {
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x + s * 0.25, y + s * 0.3, s + 0.9, 0, P2);
  ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(x, y, s, 0, P2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(x - s * 0.35, y - s * 0.35, s * 0.38, 0, P2);
  ctx.fill();
}

/** Hazard stripes (ochre and ink) over a path. */
function hazardIn(ctx: Ctx, path: PathFn, box: Box, w = 14, ang = -0.8, col = HAZ): void {
  within(ctx, path, () => {
    ctx.fillStyle = col;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    hatch(ctx, path, box, ang, w * 2, w, INK, 0.92);
  });
}

/** A lit cylinder across (a pipe): the body, a highlight along its top third, the shade printed underneath. */
function pipeH(ctx: Ctx, x0: number, x1: number, y: number, rad: number, col: string, inkW = 2.4): void {
  const p = rectPath(x0, y - rad, x1 - x0, rad * 2);
  flat(ctx, p, col, 0, INK);
  within(ctx, p, () => {
    const g = ctx.createLinearGradient(0, y - rad, 0, y + rad);
    g.addColorStop(0, rgba('#000000', 0.25));
    g.addColorStop(0.22, rgba('#ffffff', 0.26));
    g.addColorStop(0.36, rgba('#ffffff', 0.05));
    g.addColorStop(1, rgba('#000000', 0.38));
    ctx.fillStyle = g;
    ctx.fillRect(x0, y - rad, x1 - x0, rad * 2);
    dots(ctx, { x: x0, y: y - rad, w: x1 - x0, h: rad * 2 }, linTone(0, y, 0, y + rad, 0, 0.85), SHADE, { step: 4, angle: 0.79, a: 0.8 });
  });
  ink(ctx, p, inkW, INK, 0.6);
}

/** A lit cylinder upright (a riser): lit on its left, the shade printed on its right. */
function pipeV(ctx: Ctx, x: number, y0: number, y1: number, rad: number, col: string, inkW = 2.4): void {
  const p = rectPath(x - rad, y0, rad * 2, y1 - y0);
  flat(ctx, p, col, 0, INK);
  within(ctx, p, () => {
    const g = ctx.createLinearGradient(x - rad, 0, x + rad, 0);
    g.addColorStop(0, rgba('#000000', 0.2));
    g.addColorStop(0.22, rgba('#ffffff', 0.28));
    g.addColorStop(0.38, rgba('#ffffff', 0.05));
    g.addColorStop(1, rgba('#000000', 0.4));
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y0, rad * 2, y1 - y0);
    dots(ctx, { x: x - rad, y: y0, w: rad * 2, h: y1 - y0 }, linTone(x, 0, x + rad, 0, 0, 0.85), SHADE, { step: 4, angle: 0.79, a: 0.8 });
  });
  ink(ctx, p, inkW, INK, 0.6);
}

/** A bolted collar round a pipe, its bolts on one spacing. */
function collar(ctx: Ctx, x: number, y: number, rad: number, vertical: boolean, col = '#6a7282'): void {
  const t = 7;
  const p = vertical ? rrPath(x - rad - 5, y - t / 2, rad * 2 + 10, t, 2) : rrPath(x - t / 2, y - rad - 5, t, rad * 2 + 10, 2);
  flat(ctx, p, mix(col, '#ffffff', 0.12), 2, INK, 0.5);
  if (vertical) for (const dx of [-rad - 1, 0, rad + 1]) rivet(ctx, x + dx, y, 1.5, '#b8c0cc');
  else for (const dy of [-rad - 1, 0, rad + 1]) rivet(ctx, x, y + dy, 1.5, '#b8c0cc');
}

/** Stencilled lettering (worn: the paint broken by the wall's texture). */
function stencil(ctx: Ctx, text: string, x: number, y: number, size: number, col: string, a = 0.85, align: CanvasTextAlign = 'center'): void {
  ctx.save();
  ctx.font = `${size}px ${BLOCK}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = rgba(col, a);
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** A small seeded stream (frame painters: the same shape every bake). */
const mkRng = (seed: number): R => rng(seed);

// ——— the goo: the hero material ———

export interface GooOpts {
  /** How strongly its sheen catches (0…1.4). */
  sheen?: number;
  /** Ink weight (0 for none). */
  inkW?: number;
  /** The violet bounce on its lower-right edges (the tank's light). */
  bounceA?: number;
  /** Shift of the rim light (px). */
  rimD?: number;
  /** Print the shade in dots. */
  print?: boolean;
  /** Seed for the specular breaks. */
  seed?: number;
}

/**
 * Paint a mass of goo over a path: glossy volume, not a flat blob. A violet-black body lit from the top left (a lift
 * towards the light, a dark core where it's thickest), the cold rim the strip lights leave along its upper-left edges,
 * a hard white-blue specular broken along the bulges, the tank's violet bouncing into its lower-right edges, the shade
 * printed in dots, one ink line.
 */
export function goo(ctx: Ctx, path: PathFn, box: Box, o: GooOpts = {}): void {
  const sh = o.sheen ?? 1;
  const d = o.rimD ?? Math.max(3, Math.min(10, Math.min(box.w, box.h) * 0.12));
  const rr = mkRng(o.seed ?? 3);
  within(ctx, path, () => {
    // the body: lifted towards the key, the core dark
    const g = ctx.createLinearGradient(box.x, box.y, box.x + box.w * 0.7, box.y + box.h);
    g.addColorStop(0, GOO_LIT);
    g.addColorStop(0.45, '#15121f');
    g.addColorStop(1, GOO);
    ctx.fillStyle = g;
    ctx.fillRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4);
    // the dark core
    const cx = box.x + box.w * 0.58;
    const cy = box.y + box.h * 0.62;
    const cr = Math.max(box.w, box.h) * 0.5;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, Math.min(2.5, Math.max(0.4, box.h / Math.max(1, box.w))));
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, cr);
    cg.addColorStop(0, rgba('#020106', 0.75));
    cg.addColorStop(1, rgba('#020106', 0));
    ctx.fillStyle = cg;
    ctx.fillRect(-cr, -cr, cr * 2, cr * 2);
    ctx.restore();
    // a broad soft reflection of the room high on a big mass
    if (box.w > 50 && box.h > 30) {
      const rx = box.x + box.w * 0.34;
      const ry = box.y + box.h * 0.3;
      const rr0 = Math.min(box.w, box.h) * 0.42;
      const rg = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr0);
      rg.addColorStop(0, rgba('#8a96d8', 0.2 * sh));
      rg.addColorStop(1, rgba('#8a96d8', 0));
      ctx.fillStyle = rg;
      ctx.fillRect(rx - rr0, ry - rr0, rr0 * 2, rr0 * 2);
    }
    // the violet bounce: the outline shifted up-left, so the part inside runs along the lower-right edges
    ctx.save();
    ctx.translate(-d * 0.8, -d * 0.9);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(VIOLET_D, (o.bounceA ?? 0.5) * 0.9);
    ctx.lineWidth = d * 1.6;
    path(ctx);
    ctx.stroke();
    ctx.restore();
    // the cold rim: the outline shifted down-right, so the part inside runs along the upper-left edges
    ctx.save();
    ctx.translate(d * 0.7, d * 0.9);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba('#6a78b8', 0.42 * sh);
    ctx.lineWidth = d * 1.5;
    path(ctx);
    ctx.stroke();
    // the specular: a hard bright line in the rim, broken where the surface turns away
    ctx.translate(-d * 0.35, -d * 0.45);
    const dash: number[] = [];
    for (let i = 0; i < 10; i++) dash.push(6 + rr() * Math.max(10, box.w * 0.25), 4 + rr() * Math.max(8, box.w * 0.18));
    ctx.setLineDash(dash);
    ctx.lineDashOffset = rr() * 40;
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(SHEEN, 0.8 * sh);
    ctx.lineWidth = Math.max(1.6, d * 0.42);
    path(ctx);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    if (o.print !== false) dots(ctx, box, linTone(box.x, box.y, box.x + box.w, box.y + box.h, -0.3, 0.9), '#000000', { step: 4.5, angle: 0.79, a: 0.4, floor: 0.3 });
  });
  if ((o.inkW ?? 2.4) > 0) ink(ctx, path, o.inkW ?? 2.4, '#050308', 0.55);
}

/** A glint on a goo bulge: a hard white-blue ellipse in a soft halo. */
export function glint(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = -0.5, a = 0.9): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 2.2);
  g.addColorStop(0, rgba(SHEEN_B, 0.35 * a));
  g.addColorStop(1, rgba(SHEEN_B, 0));
  ctx.fillStyle = g;
  ctx.scale(1, ry / rx);
  ctx.beginPath();
  ctx.arc(0, 0, rx * 2.2, 0, P2);
  ctx.fill();
  ctx.fillStyle = rgba(SHEEN, a);
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, P2);
  ctx.fill();
  ctx.restore();
}

/** A tapered ribbon round a centreline (widths per point), closed with round ends: a strand, a tendril, a run. */
export function ribbon(pts: [number, number][], ws: number[]): PathFn {
  const L: [number, number][] = [];
  const Rt: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    const [ax, ay] = pts[Math.max(0, i - 1)];
    const [bx, by] = pts[Math.min(pts.length - 1, i + 1)];
    const dx = bx - ax;
    const dy = by - ay;
    const l = Math.hypot(dx, dy) || 1;
    const w = ws[i];
    L.push([x - (dy / l) * w, y + (dx / l) * w]);
    Rt.push([x + (dy / l) * w, y - (dx / l) * w]);
  }
  return (c) => {
    c.beginPath();
    c.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < L.length; i++) {
      const [px, py] = L[i - 1];
      const [qx, qy] = L[i];
      c.quadraticCurveTo(px, py, (px + qx) / 2, (py + qy) / 2);
    }
    // the round tip
    const n = pts.length - 1;
    const [tx, ty] = pts[n];
    const [sx, sy] = pts[n - 1];
    const ang = Math.atan2(ty - sy, tx - sx);
    c.lineTo(L[n][0], L[n][1]);
    c.arc(tx, ty, Math.max(0.5, ws[n]), ang + Math.PI / 2, ang - Math.PI / 2, true);
    for (let i = n - 1; i >= 0; i--) {
      const [px, py] = Rt[i + 1];
      const [qx, qy] = Rt[i];
      c.quadraticCurveTo(px, py, (px + qx) / 2, (py + qy) / 2);
    }
    c.lineTo(Rt[0][0], Rt[0][1]);
    const [ox, oy] = pts[0];
    const [nx, ny] = pts[1];
    const a0 = Math.atan2(ny - oy, nx - ox);
    c.arc(ox, oy, Math.max(0.5, ws[0]), a0 - Math.PI / 2, a0 + Math.PI / 2, true);
    c.closePath();
  };
}

/** A blob: a closed shape round (cx, cy), radii rx, ry, its edge lumpy (seeded), optionally flat along its bottom. */
export function blob(cx: number, cy: number, rx: number, ry: number, seed: number, lump = 0.18, n = 18, flatBottom = false): PathFn {
  const rr = mkRng(seed);
  const ks: number[] = [];
  for (let i = 0; i < n; i++) ks.push(1 + (rr() - 0.5) * 2 * lump);
  const pts: [number, number][] = ks.map((k, i) => {
    const a = (i / n) * P2;
    let y = cy + Math.sin(a) * ry * k;
    if (flatBottom) y = Math.min(y, cy + ry * 0.35);
    return [cx + Math.cos(a) * rx * k, y];
  });
  return (c) => {
    c.beginPath();
    for (let i = 0; i <= n; i++) {
      const [px, py] = pts[i % n];
      const [qx, qy] = pts[(i + 1) % n];
      if (i === 0) c.moveTo((px + qx) / 2, (py + qy) / 2);
      else c.quadraticCurveTo(px, py, (px + qx) / 2, (py + qy) / 2);
    }
    c.closePath();
  };
}

/** A goo drip hanging from (x, y): a neck from the edge swelling to a bead `len` below. */
export function dripPath(x: number, y: number, w: number, len: number): PathFn {
  return (c) => {
    const br = w * 0.9;
    c.beginPath();
    c.moveTo(x - w * 1.3, y);
    c.quadraticCurveTo(x - w * 0.3, y + len * 0.35, x - br * 0.75, y + len - br * 1.4);
    c.arc(x, y + len - br, br, Math.PI * 1.15, -Math.PI * 0.15, true);
    c.quadraticCurveTo(x + w * 0.3, y + len * 0.35, x + w * 1.3, y);
    c.closePath();
  };
}

// ——— the tendrils: two shapes, each painted at any extension ———

/** A tendril's frame (local coordinates: rooted at (8, h/2), reaching along +x). */
export const TEN = { w: 420, h: 180, len: 390 };
export const TEN_N = 12;

/** The centreline of shape v (0: a long sinuous reach; 1: a shorter one that forks), as samples s 0…1 → point. */
function tenLine(v: number, s: number, e: number, wob: number): [number, number] {
  const L = TEN.len * e;
  const x = 8 + s * L;
  const y = TEN.h / 2 + (v === 0
    ? Math.sin(s * 5.2 + 0.6 + wob) * 22 * s + Math.sin(s * 11 + wob * 2) * 5 * s
    : Math.sin(s * 3.4 + 2.1 + wob) * 30 * s - s * s * 18);
  return [x, y];
}

/** Paint shape v at extension e (0…1) in the tendril's frame; wob shifts its wiggle a little (breathing). */
export function tendril(c: Ctx, v: number, e: number, wob = 0, sheen = 1): void {
  const ee = 0.06 + e * 0.94;
  const n = 22;
  const pts: [number, number][] = [];
  const ws: number[] = [];
  const w0 = v === 0 ? 25 : 22;
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    pts.push(tenLine(v, s, ee, wob));
    // fat at the root, a node or two along it, a bulb at the leading tip
    const tip = smooth(0.78, 1, s);
    const node = Math.exp(-(((s - 0.42) / 0.07) ** 2)) * 0.22 + Math.exp(-(((s - 0.66) / 0.06) ** 2)) * 0.14;
    const lumpy = 1 + 0.14 * Math.sin(s * 17 + v * 2) + 0.08 * Math.sin(s * 37 + 1);
    ws.push(Math.max(1.5, w0 * ((1 - s * 0.72) + node + tip * 0.32 * (1 - s * 0.4)) * (0.55 + 0.45 * ee) * lumpy));
  }
  // side spurs grow in as it reaches
  const spurs: [number, number, number][] = v === 0 ? [[0.3, -1, 0.9], [0.55, 1, 0.7], [0.78, -1, 0.5]] : [[0.38, 1, 1.25], [0.6, -1, 0.8]];
  const paths: PathFn[] = [];
  const boxes: Box[] = [];
  for (const [s0, side, k] of spurs) {
    const grow = smooth(s0 + 0.05, 1, ee);
    if (grow <= 0.02) continue;
    const [bx, by] = tenLine(v, s0, ee, wob);
    const [ax, ay] = tenLine(v, s0 + 0.02, ee, wob);
    const base = Math.atan2(ay - by, ax - bx) + side * 0.9;
    const L = 70 * k * grow;
    const sp: [number, number][] = [];
    const sw: number[] = [];
    for (let j = 0; j <= 6; j++) {
      const u = j / 6;
      const a = base - side * u * 0.9 + Math.sin(wob + u * 3) * 0.1;
      sp.push([bx + Math.cos(a) * L * u, by + Math.sin(a) * L * u]);
      sw.push(Math.max(1.2, (w0 * 0.45 * (1 - u * 0.7) + (u > 0.8 ? 2 : 0)) * (0.6 + 0.4 * grow)));
    }
    paths.push(ribbon(sp, sw));
    boxes.push({ x: bx - L - 10, y: by - L - 10, w: L * 2 + 20, h: L * 2 + 20 });
  }
  const main = ribbon(pts, ws);
  // the patch it grows out of, spread over the surface
  const root = blob(14, TEN.h / 2, 16, 30, 50 + v, 0.22, 14);
  goo(c, root, { x: 0, y: TEN.h / 2 - 32, w: 32, h: 64 }, { sheen: sheen * 0.7, inkW: 2, rimD: 3, bounceA: 0.4, print: false, seed: 48 + v });
  const box: Box = { x: 0, y: TEN.h / 2 - 60, w: 16 + TEN.len * ee, h: 120 };
  for (let i = 0; i < paths.length; i++) goo(c, paths[i], boxes[i], { sheen: sheen * 0.7, inkW: 1.8, rimD: 2, bounceA: 0.35, print: false, seed: 40 + i });
  goo(c, main, box, { sheen: sheen * 0.85, inkW: 2.2, rimD: 3, bounceA: 0.4, seed: 31 + v });
  // a glint on the leading bulb and on the nodes
  const [tx, ty] = pts[n - 1];
  glint(c, tx - 4, ty - ws[n - 1] * 0.45, Math.max(1.5, ws[n - 1] * 0.28), Math.max(1, ws[n - 1] * 0.12), -0.3, 0.85 * sheen);
  const ni = Math.round(n * 0.42);
  glint(c, pts[ni][0] - 2, pts[ni][1] - ws[ni] * 0.5, Math.max(1.4, ws[ni] * 0.3), Math.max(1, ws[ni] * 0.12), -0.15, 0.6 * sheen);
}

/** Where the tendrils grow (root x, y; angle; scale; squash across; shape; flipped; rest extension). Each keeps clear
 * of the emitter mounts (it hates loud noises). */
export const TENDRILS: { x: number; y: number; a: number; s: number; sy: number; v: number; flip: boolean; rest: number }[] = [
  // over the ceiling from the tank's crown, left and right
  { x: 838, y: 132, a: -2.72, s: 0.92, sy: 0.85, v: 0, flip: false, rest: 0.78 },
  { x: 1086, y: 136, a: -0.32, s: 0.96, sy: 0.85, v: 1, flip: true, rest: 0.74 },
  // along the floor from the pool, left towards the consoles and right towards the cabinet
  { x: 738, y: 692, a: Math.PI + 0.06, s: 0.56, sy: 0.5, v: 0, flip: true, rest: 0.62 },
  { x: 1182, y: 690, a: 0.03, s: 0.5, sy: 0.5, v: 1, flip: false, rest: 0.6 },
  // up the wall from the smashed console, past the observation window
  { x: 644, y: 504, a: -1.24, s: 0.7, sy: 0.8, v: 1, flip: false, rest: 0.76 },
  // down from the soffit between the warning screen and the right mount
  { x: 1546, y: 112, a: 1.62, s: 0.58, sy: 0.8, v: 0, flip: true, rest: 0.7 },
];

/** Paint tendril i into screen space at extension e (the still; the live layer plays the same from its sheet). */
function tendrilAt(ctx: Ctx, i: number, e: number): void {
  const t = TENDRILS[i];
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.a);
  ctx.scale(t.s, t.s * t.sy * (t.flip ? -1 : 1));
  ctx.translate(-8, -TEN.h / 2);
  tendril(ctx, t.v, e);
  ctx.restore();
}

/** The dried trail a tendril leaves where it has been (always painted: it shows when the tendril shrinks back). */
function tendrilStain(ctx: Ctx, i: number): void {
  const t = TENDRILS[i];
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.a);
  ctx.scale(t.s, t.s * t.sy * (t.flip ? -1 : 1));
  ctx.translate(-8, -TEN.h / 2);
  const pts: [number, number][] = [];
  const ws: number[] = [];
  for (let k = 0; k <= 16; k++) {
    const s = k / 16;
    pts.push(tenLine(t.v, s, 1, 0));
    ws.push(Math.max(2, 13 * (1 - s * 0.7)));
  }
  const p = ribbon(pts, ws);
  ctx.fillStyle = rgba('#0a0812', 0.38);
  p(ctx);
  ctx.fill();
  ctx.strokeStyle = rgba('#6a70a0', 0.14);
  ctx.lineWidth = 1.4;
  ctx.translate(1, 1.5);
  p(ctx);
  ctx.stroke();
  ctx.restore();
}

// ——— the soffit: ducts, a cable tray, hangers, all sunk in the dark ———

const SOFFIT_BOX: Box = { x: 0, y: 0, w: W, h: VN.ceil + 4 };
/** Where goo webs between the duct and the tray (x, width); the live layer drips from under each. */
export const WEBS: [number, number][] = [
  [330, 120],
  [1196, 100],
  [1748, 90],
];
const DUCT = { y: 42, r: 22 };
const TRAY = { y: 80, h: 10 };
export const WEB_DRIP = (i: number): [number, number] => [WEBS[i][0] + WEBS[i][1] * 0.04, TRAY.y + TRAY.h + 4];

function soffit(ctx: Ctx, r: R): void {
  const S = VN.soffit;
  vfill(ctx, 0, 0, W, S, [[0, '#0a0b14'], [1, '#191b2a']]);
  surface(ctx, r, { x: 0, y: 0, w: W, h: S }, '#141624', { over: true, vary: 0.3, cells: 5, mottle: 0.25, strokes: 0, grain: 0.18, seed: 11 });
  // the soffit's coffers on the panel grid
  ctx.fillStyle = rgba('#05060c', 0.5);
  for (let x = 0; x <= W; x += PANEL) ctx.fillRect(x - 1.5, 0, 3, S);
  // hangers on every other panel line, then the duct and the tray they carry
  for (let x = PANEL; x < W; x += PANEL * 2) {
    ctx.fillStyle = '#2a2e3c';
    ctx.fillRect(x - 2, 0, 4, TRAY.y + TRAY.h);
    ctx.fillStyle = rgba('#8a94b0', 0.25);
    ctx.fillRect(x - 2, 0, 1.2, TRAY.y + TRAY.h);
  }
  pipeH(ctx, 0, W, DUCT.y, DUCT.r, '#3a4050', 2.2);
  for (let x = PANEL / 2; x < W; x += PANEL) collar(ctx, x, DUCT.y, DUCT.r, false, '#4a5262');
  // the cable tray: a lipped channel, cables sagging out of it between hangers
  const tray = rectPath(0, TRAY.y, W, TRAY.h);
  flat(ctx, tray, '#323646', 0, INK);
  within(ctx, tray, () => {
    ctx.fillStyle = rgba('#9aa4c0', 0.3);
    ctx.fillRect(0, TRAY.y, W, 1.4);
    for (let x = 6; x < W; x += 20) {
      ctx.fillStyle = rgba(INK, 0.55);
      ctx.fillRect(x, TRAY.y + 3, 8, TRAY.h - 5);
    }
  });
  ink(ctx, tray, 1.8, INK, 0.4);
  for (let x = PANEL; x < W - PANEL; x += PANEL * 2) {
    for (const [k, col] of [[0, '#20222c'], [1, '#3a2020'], [2, '#202a3a']] as const) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + 10 + k * 8, TRAY.y + TRAY.h);
      ctx.quadraticCurveTo(x + PANEL, TRAY.y + TRAY.h + 6 + k * 2 + r() * 3, x + PANEL * 2 - 10 - k * 8, TRAY.y + TRAY.h);
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }
  }
  // the goo webs: membranes stretched between duct and tray, torn through, drips beaded under them
  for (const [i, [wx, ww]] of WEBS.entries()) gooWeb(ctx, wx, ww, 70 + i * 7);
  // the soffit falling into the dark at the top
  const top = ctx.createLinearGradient(0, 0, 0, 40);
  top.addColorStop(0, rgba('#04040a', 0.6));
  top.addColorStop(1, rgba('#04040a', 0));
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, W, 40);
}

/** A goo web from the duct down over the tray: strands and a torn membrane between them, a drip bead under it. */
function gooWeb(ctx: Ctx, x: number, w: number, seed: number): void {
  const rr = mkRng(seed);
  const y0 = DUCT.y + DUCT.r - 6;
  const y1 = TRAY.y + TRAY.h + 6;
  // a sheet of goo slung from the duct down over the tray: its top wrapped on the duct, its foot sagging in lobes,
  // pulled thin in the middle and torn through
  const lobes = 4;
  const sheetP: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - w / 2, y0);
    c.quadraticCurveTo(x, y0 - 10, x + w / 2, y0);
    c.quadraticCurveTo(x + w * 0.42, (y0 + y1) / 2, x + w * 0.36, y1 - 4);
    for (let k = lobes; k > 0; k--) {
      const xa = x - w * 0.36 + (w * 0.72 * k) / lobes;
      const xb = x - w * 0.36 + (w * 0.72 * (k - 1)) / lobes;
      c.quadraticCurveTo((xa + xb) / 2, y1 + 8 + rr() * 10, xb, y1 - 4 - rr() * 4);
    }
    c.quadraticCurveTo(x - w * 0.42, (y0 + y1) / 2, x - w / 2, y0);
    c.closePath();
  };
  goo(ctx, sheetP, { x: x - w / 2, y: y0 - 10, w, h: y1 - y0 + 22 }, { sheen: 0.8, inkW: 1.8, rimD: 3, bounceA: 0.3, print: false, seed });
  // the tear: the duct seen through it, its lip lit
  const tx = x + (rr() - 0.5) * w * 0.2;
  const ty = (y0 + y1) / 2 + 2;
  flat(ctx, ellPath(tx, ty, w * 0.13, 6, 0.2), '#2a2e3c', 1.4, '#05040a', 0);
  ctx.strokeStyle = rgba(SHEEN_B, 0.4);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(tx, ty, w * 0.13 + 1.5, 7.5, 0.2, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();
  glint(ctx, x - w * 0.22, y0 - 3, 7, 1.6, -0.05, 0.75);
}

// ——— the lintel: a riveted steel beam the strip lights hang from ———

const LINTEL_BOX: Box = { x: 0, y: VN.soffit - 6, w: W, h: VN.ceil - VN.soffit + 30 };

function lintel(ctx: Ctx, r: R): void {
  const y0 = VN.soffit;
  const y1 = VN.ceil;
  const p = rectPath(0, y0, W, y1 - y0);
  flat(ctx, p, '#3a404e', 0, INK);
  within(ctx, p, () => {
    surface(ctx, r, { x: 0, y: y0, w: W, h: y1 - y0 }, '#3a404e', { over: true, vary: 0.3, cells: 6, mottle: 0.3, strokes: 0, grain: 0.22, seed: 21 });
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, rgba('#c8d4f0', 0.18));
    g.addColorStop(0.2, rgba('#c8d4f0', 0.02));
    g.addColorStop(1, rgba('#000000', 0.3));
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, W, y1 - y0);
    // its flange: a lit lip along the bottom
    ctx.fillStyle = rgba('#a8b4d0', 0.35);
    ctx.fillRect(0, y1 - 6, W, 1.6);
    ctx.fillStyle = rgba(INK, 0.7);
    ctx.fillRect(0, y1 - 4.4, W, 1.4);
    // butt joints on the panel grid
    for (let x = PANEL; x < W; x += PANEL * 3) {
      ctx.fillStyle = rgba(INK, 0.7);
      ctx.fillRect(x - 1, y0, 2, y1 - y0);
    }
    grime(ctx, { x: 0, y: y0, w: W, h: y1 - y0 }, { col: '#0a080e', a: 0.4, bottom: 10, patchy: 0.6, seed: 23 });
  });
  for (let x = RIV / 2; x < W; x += RIV) rivet(ctx, x, (y0 + y1) / 2 - 2, 2, '#8a94a6');
  ink(ctx, p, 2.6, INK, 0.5);
  // its shadow on the wall below
  crevice(ctx, 0, W, y1, 22, 0.55, '#05060c');
}

// ——— the wall: clinical composite panels on one grid ———

const WALL_BOX: Box = { x: 0, y: VN.ceil, w: W, h: FLOOR - VN.ceil };

function wall(ctx: Ctx, r: R): void {
  const y0 = VN.ceil;
  vfill(ctx, 0, y0, W, FLOOR - y0, [[0, '#222838'], [0.5, '#2e3546'], [1, '#262b38']]);
  surface(ctx, r, WALL_BOX, PAN, { over: true, vary: 0.4, cells: 5, mottle: 0.32, strokes: 0.12, strokeAng: Math.PI / 2, strokeLen: 90, grain: 0.2, seed: 31 });
  // panels: each one a slightly different cast, its seams grooved (top lip in shade, bottom lip lit)
  for (let row = 0; row < ROWS.length - 1; row++) {
    const ya = ROWS[row];
    const yb = ROWS[row + 1];
    for (let x = 0; x < W; x += PANEL) {
      ctx.fillStyle = rgba(r() < 0.5 ? '#c8d4f0' : '#0a0c18', 0.025 + r() * 0.035);
      ctx.fillRect(x + 2, ya + 2, PANEL - 4, yb - ya - 4);
    }
  }
  ctx.fillStyle = rgba('#06070e', 0.75);
  for (const y of ROWS.slice(1)) ctx.fillRect(0, y - 1.5, W, 3);
  for (let x = PANEL; x < W; x += PANEL) ctx.fillRect(x - 1.5, y0, 3, ROWS[3] - y0);
  ctx.fillStyle = rgba('#b8c8ec', 0.2);
  for (const y of ROWS.slice(1)) ctx.fillRect(0, y + 1.5, W, 1.2);
  for (let x = PANEL; x < W; x += PANEL) ctx.fillRect(x + 1.5, y0, 1.2, ROWS[3] - y0);
  // screws at the panels' corners
  for (const y of ROWS.slice(1, 3)) for (let x = PANEL; x < W; x += PANEL) for (const dx of [-12, 12]) for (const dy of [-12, 12]) rivet(ctx, x + dx, y + dy, 1.4, '#7a8498');
  // the stainless kick band along the foot
  const kick = rectPath(0, ROWS[3], W, FLOOR - ROWS[3]);
  flat(ctx, kick, '#3e4452', 0, INK);
  within(ctx, kick, () => {
    const g = ctx.createLinearGradient(0, ROWS[3], 0, FLOOR);
    g.addColorStop(0, rgba('#d8e4ff', 0.2));
    g.addColorStop(0.3, rgba('#d8e4ff', 0.04));
    g.addColorStop(1, rgba('#000000', 0.35));
    ctx.fillStyle = g;
    ctx.fillRect(0, ROWS[3], W, FLOOR - ROWS[3]);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = rgba(r() < 0.6 ? '#c8d4f0' : '#05060a', 0.06 + r() * 0.08);
      ctx.fillRect(r() * W, ROWS[3] + 4 + r() * 34, 20 + r() * 90, 1.1);
    }
  });
  ctx.fillStyle = rgba(INK, 0.9);
  ctx.fillRect(0, ROWS[3] - 1, W, 2.4);
  // the tank's violet light thrown on the wall round it
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowAt(ctx, T.x, 440, 680, VIOLET, 0.13, 0.8);
  glowAt(ctx, T.x, 520, 300, VIOLET, 0.11, 0.8);
  glowAt(ctx, (VN.cabinet.x0 + VN.cabinet.x1) / 2, (VN.cabinet.top + VN.cabinet.foot) / 2, 260, '#6ac8ff', 0.07, 1.2);
  glowAt(ctx, VN.screen.x + VN.screen.w / 2, VN.screen.y + VN.screen.h + 30, 200, '#ff2a3a', 0.07, 0.6);
  ctx.restore();
  // stains: goo flung across the panels when the tank went, run down in streaks; the tendrils' dried trails
  for (const [sx, sy, s] of [[748, 218, 0.85], [1176, 384, 0.7], [1206, 200, 0.5], [118, 250, 0.42]] as const) splat(ctx, sx, sy, s, Math.round(sx + sy));
  for (let i = 0; i < TENDRILS.length; i++) if (i !== 2 && i !== 3) tendrilStain(ctx, i);
  grime(ctx, WALL_BOX, { col: '#05060c', a: 0.5, bottom: 90, top: 60, patchy: 0.55, seed: 37 });
  // printed shade: deeper up under the lintel and out at the ends
  dots(ctx, WALL_BOX, (x, y) => 0.42 * (1 - smooth(VN.ceil, 330, y)) + 0.22 * (1 - smooth(0, 420, x)) + 0.22 * smooth(1500, W, x) + 0.12 * smooth(520, FLOOR, y), SHADE, { step: 7, angle: 0.79, a: 0.7, floor: 0.06 });
  // a riser down the left corner, its collars on the grid
  pipeV(ctx, 16, VN.ceil, FLOOR, 8, '#4a5262', 2);
  for (let cy = VN.ceil + 60; cy < FLOOR - 20; cy += RIV * 3) collar(ctx, 16, cy, 8, true, '#5a6272');
}

/** A splat of goo flung flat against the wall: a ragged blot facing us, spatter thrown out round it (more along the
 * throw from the tank), runs dribbling down under it, only a thin wet gleam on its upper edge. */
function splat(ctx: Ctx, x: number, y: number, s: number, seed: number): void {
  const rr = mkRng(seed);
  const ang = Math.atan2(y - 380, x - T.x);
  // the blot: a star of lobes, ragged
  const n = 11;
  const pts: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * P2;
    const along = Math.max(0, Math.cos(a - ang));
    const rad = (k % 2 ? 14 : 22 + rr() * 10) * s * (1 + along * 0.6);
    pts.push([x + Math.cos(a) * rad, y + Math.sin(a) * rad]);
  }
  const p: PathFn = (c) => {
    c.beginPath();
    for (let i = 0; i <= n; i++) {
      const [px, py] = pts[i % n];
      const [qx, qy] = pts[(i + 1) % n];
      if (i === 0) c.moveTo((px + qx) / 2, (py + qy) / 2);
      else c.quadraticCurveTo(px, py, (px + qx) / 2, (py + qy) / 2);
    }
    c.closePath();
  };
  ctx.fillStyle = rgba('#0a0812', 0.9);
  for (let k = 0; k < 16; k++) {
    const a = ang + (rr() - 0.5) * (k < 10 ? 1.4 : P2);
    const d = (30 + rr() * 50) * s;
    const sz = (1 + rr() * 3.4) * s;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, sz * 1.5, sz, a, 0, P2);
    ctx.fill();
  }
  for (let k = 0; k < 3; k++) {
    const rx = x + (rr() - 0.5) * 34 * s;
    const len = (14 + rr() * 56) * s * (k === 1 ? 1 : 0.5);
    const w = (2 + rr() * 2.5) * s;
    goo(ctx, ribbon([[rx, y], [rx + (rr() - 0.5) * 2, y + len * 0.5], [rx + (rr() - 0.5) * 3, y + len]], [w, w * 0.6, w * 1.25]), { x: rx - 10, y, w: 20, h: len + 10 }, { inkW: 0.9, rimD: 1.5, sheen: 0.5, bounceA: 0.2, print: false, seed: seed + k });
  }
  goo(ctx, p, { x: x - 44 * s, y: y - 40 * s, w: 88 * s, h: 80 * s }, { sheen: 0.4, inkW: 1.4, rimD: 2, bounceA: 0.25, print: false, seed });
}

// ——— the sonic emitters' mounts: an armoured backplate, a recess, clamp jaws, a socket, conduits; NOT the emitter ———

/** The recess the emitter (p_cm_emitter at scale 0.75: a 120×135 cabinet centred on the mount point) sits in. */
const BAY = { w: 168, h: 188 };
export const MOUNT_LAMP = (i: number): [number, number] => [VN.mounts[i].x + (i ? -92 : 92), VN.mounts[i].y - 104];
const MOUNT_BOX = (i: number): Box => ({ x: VN.mounts[i].x - 130, y: VN.ceil - 4, w: 260, h: VN.mounts[i].y + 220 - VN.ceil });

function mount(ctx: Ctx, r: R, i: number): void {
  const { x, y } = VN.mounts[i];
  const side = i ? -1 : 1;
  // conduits first (behind the plate): an armoured one up into the lintel, a power cable looping to a junction box
  const cx0 = x - side * 46;
  pipeV(ctx, cx0, VN.ceil, y - 120, 7, '#545c6c', 2);
  for (let cy = VN.ceil + 24; cy < y - 126; cy += RIV) collar(ctx, cx0, cy, 7, true, '#5a6272');
  // the backplate, bolted over the panel seams
  const plate = rrPath(x - 104, y - 126, 208, 254, 10);
  aoHalo(ctx, plate, 26, 0.55, '#04050a', 6);
  castShadow(ctx, plate, 8, 10, 0.5, '#04050a');
  flat(ctx, plate, '#3c4250', 0, INK);
  within(ctx, plate, () => {
    surface(ctx, r, { x: x - 104, y: y - 126, w: 208, h: 254 }, '#3c4250', { over: true, vary: 0.35, cells: 3, mottle: 0.4, strokes: 0.2, strokeAng: 0.2, grain: 0.28, seed: 51 + i });
    const g = ctx.createLinearGradient(x - 104, y - 126, x + 104, y + 128);
    g.addColorStop(0, rgba('#d8e4ff', 0.16));
    g.addColorStop(0.5, rgba('#d8e4ff', 0));
    g.addColorStop(1, rgba('#000000', 0.3));
    ctx.fillStyle = g;
    ctx.fillRect(x - 104, y - 126, 208, 254);
    // a chevron band along its foot, worn
    hazardIn(ctx, rectPath(x - 104, y + 102, 208, 18), { x: x - 104, y: y + 102, w: 208, h: 18 }, 10, -0.8);
    for (let k = 0; k < 10; k++) {
      ctx.fillStyle = rgba('#3c4250', 0.9);
      ctx.fillRect(x - 104 + r() * 200, y + 103 + r() * 14, 4 + r() * 14, 2 + r() * 3);
    }
    grime(ctx, { x: x - 104, y: y - 126, w: 208, h: 254 }, { col: '#06070c', a: 0.45, bottom: 40, patchy: 0.5, seed: 53 + i });
  });
  ink(ctx, plate, 2.8, INK, 0.6);
  for (let bx = x - 80; bx <= x + 80; bx += RIV) for (const by of [y - 114, y + 92]) rivet(ctx, bx, by, 2.2, '#9aa4b4');
  for (const by of [y - 74, y - 34, y + 6, y + 46]) for (const bx of [x - 94, x + 94]) rivet(ctx, bx, by, 2.2, '#9aa4b4');
  // the recess: its upper and left inner walls in shade, the lower-right lip lit
  const bay = rrPath(x - BAY.w / 2, y - BAY.h / 2, BAY.w, BAY.h, 12);
  flat(ctx, bay, '#14161f', 0, INK);
  within(ctx, bay, () => {
    const g = ctx.createLinearGradient(0, y - BAY.h / 2, 0, y + BAY.h / 2);
    g.addColorStop(0, '#07080e');
    g.addColorStop(0.3, '#161923');
    g.addColorStop(1, '#232733');
    ctx.fillStyle = g;
    ctx.fillRect(x - BAY.w / 2, y - BAY.h / 2, BAY.w, BAY.h);
    // two rails across the back, slotted
    for (const ry of [y - 46, y + 46]) {
      const rail = rectPath(x - BAY.w / 2, ry - 6, BAY.w, 12);
      flat(ctx, rail, '#3a404c', 1.6, INK, 0.4);
      ctx.fillStyle = rgba('#c8d4ec', 0.3);
      ctx.fillRect(x - BAY.w / 2, ry - 6, BAY.w, 1.4);
      for (let sx = x - 64; sx <= x + 64; sx += 32) {
        ctx.fillStyle = INK;
        ctx.fillRect(sx - 6, ry - 2, 12, 4);
      }
    }
    // the socket the emitter plugs into: a round multi-pin connector
    flat(ctx, ellPath(x, y, 30, 30), '#2a2e38', 2.2, INK, 0.5);
    flat(ctx, ellPath(x, y, 21, 21), '#0c0d14', 1.6, INK, 0);
    ctx.fillStyle = '#c8a050';
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * P2 - 0.3;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 12, y + Math.sin(a) * 12, 2.2, 0, P2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, P2);
    ctx.fill();
    ctx.strokeStyle = rgba('#d8e4ff', 0.3);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x, y, 29, Math.PI * 1.05, Math.PI * 1.7);
    ctx.stroke();
    // where the unit sits, its shadow on the back of the recess
    castShadow(ctx, rrPath(x - 60, y - 66, 120, 134, 10), 12, 14, 0.4, '#000000');
    // the inner walls: shade thrown in from the top-left lip, the bottom-right lip catching the light
    ctx.strokeStyle = rgba('#000000', 0.7);
    ctx.lineWidth = 22;
    ctx.save();
    ctx.translate(10, 12);
    bay(ctx);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = rgba('#a8b8e0', 0.24);
    ctx.lineWidth = 5;
    ctx.save();
    ctx.translate(-5, -6);
    bay(ctx);
    ctx.stroke();
    ctx.restore();
    dots(ctx, { x: x - BAY.w / 2, y: y - BAY.h / 2, w: BAY.w, h: BAY.h }, linTone(0, y - BAY.h / 2, 0, y, 0.7, 0.1), '#000000', { step: 4, angle: 0.79, a: 0.6 });
  });
  ink(ctx, bay, 3, INK, 0);
  // the clamp jaws at the recess's corners: they grip the emitter's cabinet at its edges
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const jx = x + sx * 66;
      const jy = y + sy * 56;
      const jaw = polyPath([
        [jx + sx * 18, jy - 16],
        [jx + sx * 18, jy + 16],
        [jx - sx * 4, jy + 16],
        [jx - sx * 4, jy + 8],
        [jx + sx * 8, jy + 8],
        [jx + sx * 8, jy - 16],
      ]);
      castShadow(ctx, jaw, 5, 5, 0.6, '#000000');
      flat(ctx, jaw, '#7a8496', 2, INK, 0.5);
      within(ctx, jaw, () => {
        ctx.fillStyle = rgba('#ffffff', 0.25);
        ctx.fillRect(jx - 20, jy - 16, 40, 3);
      });
      rivet(ctx, jx + sx * 13, jy, 2, '#c8d0dc');
    }
  }
  // the status lamp in its guard (the live layer lights it: green while an emitter is mounted, red while it's spent)
  const [lx, ly] = MOUNT_LAMP(i);
  flat(ctx, rrPath(lx - 11, ly - 14, 22, 28, 4), '#2a2e38', 2, INK, 0.5);
  flat(ctx, ellPath(lx, ly, 7, 7), '#4a1a1e', 1.6, INK, 0);
  ctx.fillStyle = rgba('#ffffff', 0.35);
  ctx.beginPath();
  ctx.arc(lx - 2, ly - 2.5, 2, 0, P2);
  ctx.fill();
  // the plate's legend (our own wording)
  const lg = rrPath(x - 78, y + 134, 156, 24, 3);
  castShadow(ctx, lg, 4, 4, 0.5, '#04050a');
  flat(ctx, lg, '#1c1e26', 1.8, INK, 0.4);
  stencil(ctx, 'SONIC DETERRENT', x, y + 147, 15, HAZ, 0.9);
  // the power cable looping down from the plate to a junction box
  const jbx = x + side * 100;
  const jby = VN.consoles.riser - 16;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(x + side * 44, y + 128);
  ctx.bezierCurveTo(x + side * 50, y + 156, jbx - side * 12, jby - 40, jbx, jby - 12);
  ctx.stroke();
  ctx.strokeStyle = '#2a2c34';
  ctx.lineWidth = 5.4;
  ctx.stroke();
  ctx.strokeStyle = rgba('#a8b4d0', 0.35);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  const jb = rrPath(jbx - 20, jby - 14, 40, 30, 3);
  castShadow(ctx, jb, 5, 6, 0.5, '#04050a');
  flat(ctx, jb, '#5a6272', 2, INK, 0.5);
  within(ctx, jb, () => {
    ctx.fillStyle = rgba('#ffffff', 0.2);
    ctx.fillRect(jbx - 20, jby - 14, 40, 3);
    hazardIn(ctx, rectPath(jbx - 12, jby - 2, 24, 8), { x: jbx - 12, y: jby - 2, w: 24, h: 8 }, 3, -0.8);
  });
}

// ——— the observation window: sealed, a goo foot pressed flat against it ———

const WIN = VN.window;
const WIN_BOX: Box = { x: WIN.x - 40, y: WIN.y - 46, w: WIN.w + 80, h: WIN.h + 90 };

function obsWindow(ctx: Ctx, r: R): void {
  const { x, y, w, h } = WIN;
  const frame = rrPath(x - 16, y - 16, w + 32, h + 32, 22);
  aoHalo(ctx, frame, 24, 0.5, '#04050a', 6);
  castShadow(ctx, frame, 8, 10, 0.5, '#04050a');
  flat(ctx, frame, '#4a5260', 0, INK);
  within(ctx, frame, () => {
    surface(ctx, r, { x: x - 16, y: y - 16, w: w + 32, h: h + 32 }, '#4a5260', { over: true, vary: 0.3, cells: 3, mottle: 0.3, strokes: 0, grain: 0.25, seed: 61 });
    const g = ctx.createLinearGradient(x - 16, y - 16, x + w + 16, y + h + 16);
    g.addColorStop(0, rgba('#e0ecff', 0.22));
    g.addColorStop(0.45, rgba('#e0ecff', 0));
    g.addColorStop(1, rgba('#000000', 0.35));
    ctx.fillStyle = g;
    ctx.fillRect(x - 16, y - 16, w + 32, h + 32);
  });
  ink(ctx, frame, 3, INK, 0.6);
  for (let bx = x + 10; bx < x + w; bx += RIV) for (const by of [y - 8, y + h + 8]) rivet(ctx, bx, by, 2, '#a8b0c0');
  for (let by = y + 25; by < y + h; by += RIV) for (const bx of [x - 8, x + w + 8]) rivet(ctx, bx, by, 2, '#a8b0c0');
  const pane = rrPath(x, y, w, h, 12);
  within(ctx, pane, () => {
    // the observation room beyond, lit only by its red emergency lamp: a far wall, an overturned chair
    vfill(ctx, x, y, w, h, [[0, '#24121c'], [0.6, '#2e1822'], [1, '#160c12']]);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glowAt(ctx, x + w - 46, y + 30, 150, '#ff2a3a', 0.3, 0.9);
    ctx.restore();
    flat(ctx, rrPath(x + w - 58, y + 22, 24, 12, 3), '#ff6a6a', 1.4, INK, 0);
    ctx.fillStyle = rgba('#0a0508', 0.9);
    ctx.beginPath();
    ctx.moveTo(x + 30, y + h);
    ctx.lineTo(x + 40, y + h - 46);
    ctx.lineTo(x + 92, y + h - 40);
    ctx.lineTo(x + 100, y + h - 70);
    ctx.lineTo(x + 108, y + h - 68);
    ctx.lineTo(x + 102, y + h - 30);
    ctx.lineTo(x + 70, y + h);
    ctx.closePath();
    ctx.fill();
    // the mass behind the glass, its bulk a silhouette rimmed red by the lamp behind it
    const fx = x + w * 0.46;
    const fy = y + h * 0.56;
    const mass = blob(fx, fy + 34, 118, 104, 63, 0.2, 16);
    ctx.save();
    ctx.translate(4, -4);
    ctx.fillStyle = rgba('#ff4a4a', 0.35);
    mass(ctx);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#07050b';
    mass(ctx);
    ctx.fill();
    // the sole pressed flat against the glass: a foot's print in goo, the heel down, five toes splayed at the top
    const sole: PathFn = (c) => {
      c.beginPath();
      c.moveTo(fx - 26, fy + 72);
      c.bezierCurveTo(fx - 50, fy + 60, fx - 46, fy + 10, fx - 40, fy - 22);
      c.bezierCurveTo(fx - 36, fy - 46, fx - 30, fy - 56, fx - 10, fy - 58);
      c.bezierCurveTo(fx + 20, fy - 60, fx + 46, fy - 52, fx + 50, fy - 34);
      c.bezierCurveTo(fx + 52, fy - 10, fx + 30, fy + 10, fx + 28, fy + 34);
      c.bezierCurveTo(fx + 28, fy + 62, fx + 12, fy + 80, fx - 6, fy + 80);
      c.bezierCurveTo(fx - 14, fy + 80, fx - 20, fy + 76, fx - 26, fy + 72);
      c.closePath();
    };
    const toes: [number, number, number, number][] = [
      [fx - 32, fy - 80, 15, 18],
      [fx - 8, fy - 88, 11, 13],
      [fx + 13, fy - 86, 10, 12],
      [fx + 31, fy - 78, 9, 11],
      [fx + 46, fy - 64, 8, 9],
    ];
    const pressed = (p: PathFn, bx: Box, seed: number) => {
      // where it touches the glass it's squashed flat: a slate-dark patch, the bright meniscus round its edge
      goo(ctx, p, bx, { sheen: 1.1, inkW: 0, rimD: 4, print: false, seed });
      within(ctx, p, () => {
        const g = ctx.createRadialGradient(bx.x + bx.w * 0.45, bx.y + bx.h * 0.45, 0, bx.x + bx.w * 0.45, bx.y + bx.h * 0.45, Math.max(bx.w, bx.h) * 0.6);
        g.addColorStop(0, rgba('#1c1a30', 0.55));
        g.addColorStop(0.75, rgba('#141224', 0.25));
        g.addColorStop(1, rgba('#1a182c', 0));
        ctx.fillStyle = g;
        ctx.fillRect(bx.x, bx.y, bx.w, bx.h);
      });
      ctx.save();
      ctx.strokeStyle = rgba('#05040a', 0.9);
      ctx.lineWidth = 3;
      p(ctx);
      ctx.stroke();
      ctx.strokeStyle = rgba('#c8d4ff', 0.38);
      ctx.lineWidth = 1.2;
      ctx.translate(-0.8, -1);
      p(ctx);
      ctx.stroke();
      ctx.restore();
    };
    pressed(sole, { x: fx - 52, y: fy - 62, w: 106, h: 146 }, 64);
    toes.forEach(([tx, ty, rx, ry], k) => pressed(ellPath(tx, ty, rx, ry, -0.2 + k * 0.12), { x: tx - rx, y: ty - ry, w: rx * 2, h: ry * 2 }, 65 + k));
    // the skin's creases squashed into the print
    ctx.strokeStyle = rgba('#8a96d8', 0.16);
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 4; k++) {
      const yy = fy - 30 + k * 22;
      ctx.beginPath();
      ctx.moveTo(fx - 34 + k * 2, yy);
      ctx.quadraticCurveTo(fx, yy + 6 + (r() - 0.5) * 4, fx + 30 - k * 3, yy - 2);
      ctx.stroke();
    }
    // where it slid: smears and runs down from the heel and the toes
    for (const [sx, sy, len, sw] of [[fx - 18, fy + 74, 60, 6], [fx + 4, fy + 78, 46, 4.5], [fx - 34, fy - 66, 40, 3.5], [fx + 30, fy - 66, 34, 3]] as const) {
      goo(ctx, ribbon([[sx, sy], [sx + 1, sy + len * 0.55], [sx - 1, sy + len]], [sw, sw * 0.7, sw * 1.15]), { x: sx - 10, y: sy, w: 20, h: len + 8 }, { inkW: 0, rimD: 2, sheen: 0.8, print: false, seed: Math.round(sx) });
    }
    // the glass over it all: the strip light reflected, the room's sheen, a crack where something pounded
    glassPaneLocal(ctx, pane, { x, y, w, h }, VN.strips[0].x - 60, y + 26);
    crackStar(ctx, x + 40, y + 34, 46, 7);
  });
  ink(ctx, pane, 2.4, INK, 0);
  // inner lip: the glass is thick
  ctx.save();
  ctx.strokeStyle = rgba('#a8d8e8', 0.3);
  ctx.lineWidth = 2;
  ctx.translate(2, 2);
  rrPath(x + 3, y + 3, w - 6, h - 6, 10)(ctx);
  ctx.stroke();
  ctx.restore();
  const plate = rrPath(x + w / 2 - 70, y - 40, 140, 18, 3);
  flat(ctx, plate, '#1c1e26', 1.6, INK, 0.4);
  stencil(ctx, 'OBSERVATION 2', x + w / 2, y - 31, 12, '#c8d0e0', 0.75);
}

/** Thick glass over what's behind it: sheen bands, a lamp's reflection as a soft bar, the edge darkened. */
function glassPaneLocal(ctx: Ctx, path: PathFn, box: Box, rx: number, ry: number): void {
  ctx.save();
  path(ctx);
  ctx.clip();
  for (const [u, bw, al] of [[0.1, 0.2, 0.12], [0.44, 0.06, 0.09], [0.58, 0.12, 0.06]] as const) {
    const x0 = box.x + box.w * u;
    const g = ctx.createLinearGradient(x0, 0, x0 + box.w * bw, 0);
    g.addColorStop(0, 'rgba(220,235,255,0)');
    g.addColorStop(0.5, rgba('#dcebff', al));
    g.addColorStop(1, 'rgba(220,235,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0, box.y + box.h);
    ctx.lineTo(x0 + box.w * bw, box.y + box.h);
    ctx.lineTo(x0 + box.w * bw + box.h * 0.45, box.y);
    ctx.lineTo(x0 + box.h * 0.45, box.y);
    ctx.closePath();
    ctx.fill();
  }
  // the strip light reflected: a soft bar
  ctx.save();
  ctx.translate(rx, ry);
  ctx.scale(1, 0.12);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 110);
  g.addColorStop(0, rgba('#eef6ff', 0.4));
  g.addColorStop(1, rgba('#eef6ff', 0));
  ctx.fillStyle = g;
  ctx.fillRect(-110, -110, 220, 220);
  ctx.restore();
  ctx.restore();
}

/** A fracture in thick glass: a chipped white impact, uneven cracks running off it (forking, of different lengths),
 * each a dark line with a lit lip. */
function crackStar(ctx: Ctx, x: number, y: number, rad: number, seed: number): void {
  const rr = mkRng(seed);
  const lines: [number, number][][] = [];
  const n = 6;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * P2 + (rr() - 0.5) * 0.9;
    const len = rad * (0.25 + rr() ** 1.5 * 0.9);
    const pts: [number, number][] = [[x, y]];
    let px = x;
    let py = y;
    let aa = a;
    for (let j = 0; j < 4; j++) {
      aa += (rr() - 0.5) * 0.7;
      px += Math.cos(aa) * (len / 4);
      py += Math.sin(aa) * (len / 4);
      pts.push([px, py]);
      if (j === 1 && rr() < 0.5) lines.push([[px, py], [px + Math.cos(aa + 0.8) * len * 0.3, py + Math.sin(aa + 0.8) * len * 0.3]]);
    }
    lines.push(pts);
  }
  for (const [col, wd, dx] of [[rgba('#000000', 0.6), 1.6, 0.8], [rgba('#e8f4ff', 0.65), 0.9, 0]] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = wd;
    ctx.beginPath();
    for (const pts of lines) {
      ctx.moveTo(pts[0][0] + dx, pts[0][1] + dx);
      for (const [px, py] of pts.slice(1)) ctx.lineTo(px + dx, py + dx);
    }
    ctx.stroke();
  }
  // the chip at the impact
  ctx.fillStyle = rgba('#e8f4ff', 0.55);
  ctx.beginPath();
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * P2;
    const r2 = 3 + rr() * 4;
    ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2);
  }
  ctx.closePath();
  ctx.fill();
}

// ——— the consoles: a bank of lab desks, the last one smashed and sparking under the goo ———

const CN = VN.consoles;
const CON_BOX: Box = { x: CN.x0 - 30, y: CN.riser - 40, w: CN.x1 - CN.x0 + 80, h: CN.foot + 26 - (CN.riser - 40) };
const CON_N = 4;
const CON_W = (CN.x1 - CN.x0) / CON_N;
/** The smashed console's torn wires (where the sparks come from). */
export const SPARK: [number, number] = [CN.x0 + CON_W * 3.42, CN.riser + 12];
/** The consoles' lamps (x, y, colour) along the desk's back edge. */
export const LAMPS: [number, number, string][] = [];
for (let lx = CN.x0 + 20; lx < CN.x0 + CON_W * 3 - 10; lx += 26) LAMPS.push([lx, CN.top + 7, lx % 78 < 26 ? '#ff3a4a' : lx % 78 < 52 ? '#ffc23a' : '#6affc8']);

function consoles(ctx: Ctx, r: R): void {
  const { x0, x1, riser, top, lip, foot } = CN;
  groundShadow(ctx, (x0 + x1) / 2 + 16, foot + 3, (x1 - x0) / 2 + 30, 13, 0.8, '#04050a', 1.2);
  aoHalo(ctx, rectPath(x0, riser, x1 - x0, foot - riser), 22, 0.5, '#04050a', 8);
  // the riser: a screen in each module
  const rs = rectPath(x0 + 6, riser, x1 - x0 - 12, top - riser);
  flat(ctx, rs, '#3a404c', 0, INK);
  within(ctx, rs, () => {
    surface(ctx, r, { x: x0, y: riser, w: x1 - x0, h: top - riser }, '#3a404c', { over: true, vary: 0.3, cells: 3, mottle: 0.3, strokes: 0, grain: 0.25, seed: 71 });
    ctx.fillStyle = rgba('#d8e4ff', 0.2);
    ctx.fillRect(x0, riser, x1 - x0, 2);
  });
  ink(ctx, rs, 2.4, INK, 0.5);
  for (let i = 0; i < CON_N; i++) {
    const mx = x0 + i * CON_W;
    const sc = rrPath(mx + 22, riser + 7, CON_W - 44, top - riser - 13, 3);
    if (i === 3) continue;
    flat(ctx, sc, '#06080c', 1.8, INK, 0.3);
    within(ctx, sc, () => {
      const col = ['#5ae8ff', '#b88aff', '#ff4a5a'][i];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glowAt(ctx, mx + CON_W / 2, riser + 18, 60, col, 0.18, 0.4);
      ctx.restore();
      ctx.strokeStyle = rgba(col, 0.85);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const sy = riser + 19;
      for (let k = 0; k <= 40; k++) {
        const xx = mx + 26 + k * ((CON_W - 52) / 40);
        const yy = i === 0 ? sy + Math.sin(k * 0.7) * 6 * Math.sin(k * 0.13) : i === 1 ? sy + (k % 10 === 4 ? -10 : k % 10 === 5 ? 7 : 0) : sy + (k % 6 < 3 ? -5 : 5);
        if (k === 0) ctx.moveTo(xx, yy);
        else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
      ctx.fillStyle = rgba('#000000', 0.3);
      for (let yy = riser + 7; yy < top - 6; yy += 3) ctx.fillRect(mx + 22, yy, CON_W - 44, 1);
    });
  }
  // the desks: sloping fronts of buttons, sliders, knobs
  const desk = polyPath([
    [x0 + 10, top],
    [x1 - 10, top],
    [x1 + 4, lip],
    [x0 - 4, lip],
  ]);
  flat(ctx, desk, '#4e5664', 0, INK);
  within(ctx, desk, () => {
    surface(ctx, r, { x: x0 - 4, y: top, w: x1 - x0 + 8, h: lip - top }, '#4e5664', { over: true, vary: 0.3, cells: 3, mottle: 0.3, strokes: 0, grain: 0.2, seed: 73 });
    const g = ctx.createLinearGradient(0, top, 0, lip);
    g.addColorStop(0, rgba('#e8f0ff', 0.22));
    g.addColorStop(1, rgba('#000000', 0.18));
    ctx.fillStyle = g;
    ctx.fillRect(x0 - 4, top, x1 - x0 + 8, lip - top);
    for (let i = 1; i < CON_N; i++) {
      ctx.fillStyle = INK;
      ctx.fillRect(x0 + i * CON_W - 1, top, 2.2, lip - top);
    }
  });
  ink(ctx, desk, 2.6, INK, 0.5);
  const dy = (top + lip) / 2 + 2;
  for (let i = 0; i < 3; i++) {
    const mx = x0 + i * CON_W;
    for (let k = 0; k < 5; k++) {
      const bx = mx + 22 + k * 14;
      flat(ctx, rrPath(bx - 5, dy - 5, 10, 8, 2), ['#c83a3a', '#d8a428', '#3a8ac8', '#5ac88a', '#c8c8d0'][(k + i) % 5], 1.3, INK, 0);
    }
    for (const sx of [mx + 104, mx + 120, mx + 136]) {
      ctx.fillStyle = INK;
      ctx.fillRect(sx - 1.5, dy - 10, 3, 18);
      flat(ctx, rrPath(sx - 5, dy - 6 + r() * 8, 10, 6, 1.5), '#a8b0c0', 1.2, INK, 0);
    }
  }
  for (const [lx, ly, col] of LAMPS) flat(ctx, ellPath(lx, ly, 3.5, 2.6), mix(col, '#100a10', 0.5), 1.1, INK, 0);
  // the cabinets below: doors and vents on one spacing, a kick plate scuffed
  const front = rectPath(x0, lip, x1 - x0, foot - lip);
  flat(ctx, front, '#3a404c', 0, INK);
  within(ctx, front, () => {
    surface(ctx, r, { x: x0, y: lip, w: x1 - x0, h: foot - lip }, '#3a404c', { over: true, vary: 0.35, cells: 3, mottle: 0.35, strokes: 0.1, grain: 0.25, seed: 75 });
    for (let i = 0; i < CON_N; i++) {
      const mx = x0 + i * CON_W;
      ctx.fillStyle = INK;
      ctx.fillRect(mx - 1, lip, 2.4, foot - lip);
      const pan = rectPath(mx + 12, lip + 12, CON_W - 24, 62);
      flat(ctx, pan, '#424856', 1.8, INK, 0.5);
      for (let ly = lip + 22; ly < lip + 68; ly += 9) {
        ctx.fillStyle = rgba(INK, 0.8);
        ctx.fillRect(mx + 24, ly, CON_W - 48, 3);
        ctx.fillStyle = rgba('#c8d4f0', 0.28);
        ctx.fillRect(mx + 24, ly + 3, CON_W - 48, 1.2);
      }
      for (const [rx, ry] of [[mx + 18, lip + 18], [mx + CON_W - 18, lip + 18], [mx + 18, lip + 68], [mx + CON_W - 18, lip + 68]]) rivet(ctx, rx, ry, 1.6, '#a8b0c0');
      stencil(ctx, ['SEQ 01', 'VITALS', 'CHAMBER 3', 'SEAL CTRL'][i], mx + CON_W / 2, lip + 88, 11, '#c8d0e0', 0.5);
    }
    const kick = rectPath(x0, foot - 16, x1 - x0, 16);
    flat(ctx, kick, '#20242c', 0, INK);
    grime(ctx, { x: x0, y: lip, w: x1 - x0, h: foot - lip }, { col: '#06070c', a: 0.5, bottom: 50, patchy: 0.5, seed: 77 });
    dots(ctx, { x: x0, y: lip, w: x1 - x0, h: foot - lip }, (x, y) => 0.25 + 0.2 * smooth(lip, foot, y) + 0.15 * (1 - smooth(x0, x0 + 200, x)), SHADE, { step: 5, angle: 0.79, a: 0.8 });
  });
  ink(ctx, front, 3, INK, 0.6);
  // the last module, smashed: its screen stove in, the desk buckled, wires torn out, goo poured over it
  const mx = x0 + CON_W * 3;
  const hole = polyPath([
    [mx + 24, CN.riser + 8],
    [mx + 70, CN.riser + 4],
    [mx + 92, CN.riser + 14],
    [mx + CON_W - 24, CN.riser + 6],
    [mx + CON_W - 30, top - 8],
    [mx + 80, top - 3],
    [mx + 50, top - 10],
    [mx + 26, top - 6],
  ]);
  flat(ctx, hole, '#020204', 1.8, INK, 0.3);
  within(ctx, hole, () => {
    // shards still in the bezel
    ctx.fillStyle = rgba('#a8c8e0', 0.35);
    for (const pts of [[[mx + 24, CN.riser + 8], [mx + 46, CN.riser + 8], [mx + 30, CN.riser + 22]], [[mx + CON_W - 24, CN.riser + 6], [mx + CON_W - 26, CN.riser + 26], [mx + CON_W - 46, CN.riser + 8]]] as [number, number][][]) {
      polyPath(pts)(ctx);
      ctx.fill();
    }
  });
  // the torn wires hanging out of it
  for (const [k, col] of [[0, '#c83a3a'], [1, '#d8c040'], [2, '#3a8ac8'], [3, '#202024']] as const) {
    const wx = SPARK[0] - 12 + k * 7;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(wx, SPARK[1] - 2);
    ctx.bezierCurveTo(wx - 6 + k * 4, SPARK[1] + 18, wx + 10 - k * 3, SPARK[1] + 26, wx + 4 - k * 6, SPARK[1] + 34 + k * 3);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.fillStyle = '#d8a060';
    ctx.beginPath();
    ctx.arc(wx + 4 - k * 6, SPARK[1] + 34 + k * 3, 1.8, 0, P2);
    ctx.fill();
  }
  // goo heaped over the desk, a lip of it hanging over the cabinet front, runs down to the floor
  const heap: PathFn = (c) => {
    c.beginPath();
    c.moveTo(mx - 20, top + 6);
    c.bezierCurveTo(mx + 10, top - 16, mx + 60, top - 22, mx + 96, top - 12);
    c.bezierCurveTo(mx + 130, top - 26, mx + CON_W + 4, top - 10, x1 + 8, top + 4);
    c.lineTo(x1 + 10, lip + 30);
    c.bezierCurveTo(x1 - 4, lip + 46, x1 - 14, lip + 20, x1 - 24, lip + 14);
    c.bezierCurveTo(mx + 110, lip + 30, mx + 100, lip + 6, mx + 80, lip + 8);
    c.bezierCurveTo(mx + 60, lip + 40, mx + 46, lip + 4, mx + 30, lip + 4);
    c.bezierCurveTo(mx + 8, lip + 10, mx - 10, lip - 4, mx - 20, top + 6);
    c.closePath();
  };
  castShadow(ctx, heap, 6, 8, 0.6, '#020204');
  goo(ctx, heap, { x: mx - 24, y: top - 28, w: CON_W + 40, h: lip - top + 78 }, { sheen: 1, inkW: 2.4, rimD: 6, seed: 79 });
  glint(ctx, mx + 60, top - 12, 12, 2.4, -0.1, 0.85);
  glint(ctx, mx + 130, top - 14, 8, 2, 0.05, 0.7);
  for (const [sx, len, sw] of [[mx + 34, 26, 5], [mx + 82, 58, 7], [x1 - 22, 18, 4.5]] as const) {
    goo(ctx, ribbon([[sx, lip], [sx + 1, lip + len * 0.5], [sx - 1, lip + len]], [sw, sw * 0.6, sw * 1.3]), { x: sx - 12, y: lip, w: 24, h: len + 10 }, { inkW: 1.6, rimD: 2.5, print: false, seed: Math.round(sx) });
  }
}

// ——— the strip lights: steel troughs on rods from the lintel, the tubes dark (the live layer lights them) ———

export const STRIP = { w: 300, h: 18, tube: 7 };
const STRIP_BOX = (i: number): Box => ({ x: VN.strips[i].x - STRIP.w / 2 - 20, y: VN.ceil - 4, w: STRIP.w + 60, h: 70 });

function stripFixture(ctx: Ctx, i: number): void {
  const { x, y } = VN.strips[i];
  const x0 = x - STRIP.w / 2;
  const ty = y - STRIP.h;
  // the rods from the lintel
  for (const rx of [x0 + 40, x0 + STRIP.w - 40]) {
    ctx.fillStyle = INK;
    ctx.fillRect(rx - 2.5, VN.ceil - 2, 5, ty - VN.ceil + 3);
    ctx.fillStyle = '#8a94a8';
    ctx.fillRect(rx - 1, VN.ceil - 2, 1.4, ty - VN.ceil + 3);
  }
  const trough = polyPath([
    [x0, ty],
    [x0 + STRIP.w, ty],
    [x0 + STRIP.w - 8, y],
    [x0 + 8, y],
  ]);
  castShadow(ctx, trough, 10, 12, 0.5, '#04050a');
  flat(ctx, trough, '#5a6272', 2.4, INK, 0.5);
  within(ctx, trough, () => {
    ctx.fillStyle = rgba('#e8f0ff', 0.35);
    ctx.fillRect(x0, ty, STRIP.w, 3);
    dots(ctx, { x: x0, y: ty, w: STRIP.w, h: STRIP.h }, linTone(0, ty, 0, y, 0, 0.8), SHADE, { step: 4, angle: 0.79, a: 0.7 });
  });
  // the tube under it, dark (a cold grey glass, its ends capped)
  const tube = rrPath(x0 + 14, y, STRIP.w - 28, STRIP.tube, 3.5);
  flat(ctx, tube, '#6a7488', 1.6, INK, 0.3);
  ctx.fillStyle = rgba('#d8e4f4', 0.35);
  ctx.fillRect(x0 + 18, y + 1.4, STRIP.w - 36, 1.4);
  for (const ex of [x0 + 10, x0 + STRIP.w - 18]) flat(ctx, rrPath(ex, y - 1, 8, STRIP.tube + 2, 1.5), '#8a92a2', 1.4, INK, 0);
  if (i === 1) {
    // a crack across the right one's tube (it stutters more)
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x + 52, y);
    ctx.lineTo(x + 56, y + 3);
    ctx.lineTo(x + 52, y + STRIP.tube);
    ctx.stroke();
  }
}

/** A tube lit (the still's, and the live layer's texture): white-hot glass, a blue-white bloom round it. */
function tubeLit(ctx: Ctx, x: number, y: number): void {
  const x0 = x - STRIP.w / 2 + 14;
  const w = STRIP.w - 28;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y + STRIP.tube / 2);
  ctx.scale(1, 0.16);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.62);
  g.addColorStop(0, rgba(COLD, 0.55));
  g.addColorStop(0.5, rgba(COLD, 0.2));
  g.addColorStop(1, rgba(COLD, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-w, -w, w * 2, w * 2);
  ctx.restore();
  flat(ctx, rrPath(x0, y, w, STRIP.tube, 3.5), '#f4faff', 0, INK);
  ctx.fillStyle = rgba('#ffffff', 0.9);
  ctx.fillRect(x0 + 4, y + 2, w - 8, 2);
}

// ——— the warning screen: CONTAINMENT BREACH ———

const SCR = VN.screen;
export const TICKER = { x: SCR.x + 14, y: SCR.y + SCR.h - 30, w: SCR.w - 28, h: 16 };
export const TICKER_TEXT = 'CONTAINMENT BREACH  ·  CHAMBER 3 SEAL FAILED  ·  SPECIMEN LOOSE  ·  DO NOT FEED THE SPECIMEN  ·  ';
const SCR_BOX: Box = { x: SCR.x - 30, y: VN.ceil - 2, w: SCR.w + 60, h: SCR.y + SCR.h + 30 - VN.ceil };
export const BANNER = { x: SCR.x + 14, y: SCR.y + 14, w: SCR.w - 28, h: 34 };

function warnScreen(ctx: Ctx, r: R): void {
  const { x, y, w, h } = SCR;
  // its bracket arm from the lintel
  pipeV(ctx, x + w / 2, VN.ceil, y + 4, 6, '#545c6c', 2);
  const bez = rrPath(x - 10, y - 10, w + 20, h + 20, 8);
  aoHalo(ctx, bez, 22, 0.5, '#04050a', 6);
  castShadow(ctx, bez, 10, 12, 0.55, '#04050a');
  flat(ctx, bez, '#262a34', 2.8, INK, 0.6);
  within(ctx, bez, () => {
    ctx.fillStyle = rgba('#d8e4ff', 0.22);
    ctx.fillRect(x - 10, y - 10, w + 20, 2.4);
    surface(ctx, r, { x: x - 10, y: y - 10, w: w + 20, h: h + 20 }, '#262a34', { over: true, vary: 0.2, cells: 2, mottle: 0.2, strokes: 0, grain: 0.2, seed: 81 });
  });
  const disp = rectPath(x, y, w, h);
  within(ctx, disp, () => {
    vfill(ctx, x, y, w, h, [[0, '#2a0a10'], [1, '#14060a']]);
    // the banner (the live layer blinks it)
    flat(ctx, rectPath(BANNER.x, BANNER.y, BANNER.w, BANNER.h), '#a8141e', 0, INK);
    ctx.save();
    ctx.font = `25px ${BLOCK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff0e8';
    ctx.fillText('CONTAINMENT BREACH', x + w / 2, BANNER.y + BANNER.h / 2 + 1);
    ctx.restore();
    // the chamber's schematic: the tank in outline, broken, an arrow out of it
    const sx = x + 52;
    const sy = y + 74;
    ctx.strokeStyle = rgba('#ff6a6a', 0.85);
    ctx.lineWidth = 2;
    ctx.strokeRect(sx - 22, sy - 26, 44, 52);
    ctx.beginPath();
    ctx.moveTo(sx - 22, sy - 26 + 16);
    ctx.lineTo(sx - 10, sy - 6);
    ctx.lineTo(sx, sy - 18);
    ctx.lineTo(sx + 10, sy - 2);
    ctx.lineTo(sx + 22, sy - 14);
    ctx.stroke();
    ctx.fillStyle = rgba('#ff3a4a', 0.9);
    ctx.beginPath();
    ctx.moveTo(sx + 30, sy - 10);
    ctx.lineTo(sx + 44, sy - 2);
    ctx.lineTo(sx + 30, sy + 6);
    ctx.closePath();
    ctx.fill();
    // readouts
    ctx.save();
    ctx.font = `12px ${BLOCK}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = rgba('#ffb0a8', 0.9);
    ctx.fillText('CHAMBER 3 .......... OPEN', x + 104, y + 56);
    ctx.fillText('SPECIMEN ........... LOOSE', x + 104, y + 72);
    ctx.fillText('SONIC UNITS ........ READY', x + 104, y + 88);
    ctx.restore();
    // the ticker's band (the live layer scrolls it)
    flat(ctx, rectPath(TICKER.x, TICKER.y, TICKER.w, TICKER.h), '#3a0a10', 0, INK);
    ctx.save();
    ctx.font = `12px ${BLOCK}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd8a0';
    ctx.fillText(TICKER_TEXT, TICKER.x + 2, TICKER.y + TICKER.h / 2 + 1);
    ctx.restore();
    // scanlines, the glass's sheen
    ctx.fillStyle = rgba('#000000', 0.22);
    for (let yy = y; yy < y + h; yy += 3) ctx.fillRect(x, yy, w, 1);
    const g = ctx.createLinearGradient(x, y, x + w * 0.6, y + h);
    g.addColorStop(0, rgba('#ffffff', 0.12));
    g.addColorStop(0.4, rgba('#ffffff', 0));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  });
  ink(ctx, disp, 2, INK, 0);
  // its red glow on the wall round it
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowAt(ctx, x + w / 2, y + h / 2, 220, '#ff2a3a', 0.08, 0.7);
  ctx.restore();
}

// ——— the sample cabinet: shelves of glowing vials behind glass, one shelf smashed ———

const CB = VN.cabinet;
const CAB_BOX: Box = { x: CB.x0 - 40, y: CB.top - 60, w: CB.x1 - CB.x0 + 90, h: CB.foot + 30 - (CB.top - 60) };
const SHELVES = [CB.top + 62, CB.top + 120, CB.top + 178];
const VIAL_COLS = ['#b88aff', '#7affc8', '#5ae8ff', '#ff8ad8'];

function cabinet(ctx: Ctx, r: R): void {
  const { x0, x1, top, foot } = CB;
  const body = rrPath(x0, top, x1 - x0, foot - top, 6);
  groundShadow(ctx, (x0 + x1) / 2 + 16, foot + 2, (x1 - x0) / 2 + 24, 12, 0.8, '#04050a', 1.2);
  aoHalo(ctx, body, 24, 0.55, '#04050a', 8);
  castShadow(ctx, body, 10, 12, 0.55, '#04050a');
  flat(ctx, body, '#525a68', 0, INK);
  within(ctx, body, () => {
    surface(ctx, r, { x: x0, y: top, w: x1 - x0, h: foot - top }, '#525a68', { over: true, vary: 0.3, cells: 3, mottle: 0.3, strokes: 0.15, strokeAng: Math.PI / 2, grain: 0.22, seed: 91 });
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, rgba('#e8f0ff', 0.2));
    g.addColorStop(0.3, rgba('#e8f0ff', 0));
    g.addColorStop(1, rgba('#000000', 0.3));
    ctx.fillStyle = g;
    ctx.fillRect(x0, top, x1 - x0, foot - top);
    dots(ctx, { x: x0, y: top, w: x1 - x0, h: foot - top }, (x) => 0.1 + 0.45 * smooth(x0 + 100, x1, x), SHADE, { step: 5, angle: 0.79, a: 0.55, floor: 0.12 });
  });
  ink(ctx, body, 3, INK, 0.6);
  // the glass door: the inside lit by the vials
  const dx0 = x0 + 16;
  const dx1 = x1 - 34;
  const dy0 = top + 24;
  const dy1 = foot - 40;
  const door = rrPath(dx0, dy0, dx1 - dx0, dy1 - dy0, 4);
  within(ctx, door, () => {
    vfill(ctx, dx0, dy0, dx1 - dx0, dy1 - dy0, [[0, '#121826'], [1, '#0a0e18']]);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glowAt(ctx, (dx0 + dx1) / 2, (dy0 + dy1) / 2, 160, '#8a6aff', 0.16, 1.4);
    ctx.restore();
    SHELVES.forEach((sy, si) => {
      // the shelf, a rack on it, the vials glowing
      ctx.fillStyle = '#6a7282';
      ctx.fillRect(dx0, sy, dx1 - dx0, 4);
      ctx.fillStyle = rgba('#d8e4ff', 0.4);
      ctx.fillRect(dx0, sy, dx1 - dx0, 1.2);
      if (si === 1) {
        // the smashed shelf: stumps of vials, glass on the shelf, goo welling out
        for (let vx = dx0 + 14; vx < dx1 - 10; vx += 17) {
          const hgt = 8 + r() * 12;
          ctx.fillStyle = rgba('#a8c8e0', 0.35);
          ctx.beginPath();
          ctx.moveTo(vx - 4, sy);
          ctx.lineTo(vx - 4, sy - hgt);
          ctx.lineTo(vx - 1, sy - hgt + 4);
          ctx.lineTo(vx + 2, sy - hgt - 3);
          ctx.lineTo(vx + 4, sy - hgt + 2);
          ctx.lineTo(vx + 4, sy);
          ctx.closePath();
          ctx.fill();
        }
        const ooze = blob((dx0 + dx1) / 2 + 10, sy - 8, 70, 14, 93, 0.3, 14, true);
        goo(ctx, ooze, { x: dx0, y: sy - 24, w: dx1 - dx0, h: 30 }, { inkW: 1.6, rimD: 3, seed: 93 });
        return;
      }
      for (let vx = dx0 + 14; vx < dx1 - 10; vx += 17) {
        const col = VIAL_COLS[(Math.floor(vx / 17) + si) % VIAL_COLS.length];
        const vh = 34;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glowAt(ctx, vx, sy - vh * 0.4, 14, col, 0.3, 1.6);
        ctx.restore();
        const vial = rrPath(vx - 4.5, sy - vh, 9, vh, 4);
        flat(ctx, vial, rgba('#c8d8e8', 0.25), 1.2, INK, 0);
        within(ctx, vial, () => {
          ctx.fillStyle = rgba(col, 0.85);
          ctx.fillRect(vx - 4.5, sy - vh * (0.45 + ((vx * 7 + si * 3) % 5) * 0.06), 9, vh);
          ctx.fillStyle = rgba('#ffffff', 0.6);
          ctx.fillRect(vx - 3, sy - vh + 3, 1.4, vh - 6);
        });
        flat(ctx, rectPath(vx - 5, sy - vh - 4, 10, 5), '#d8dce4', 1, INK, 0);
      }
      // the rack's front bar
      ctx.fillStyle = '#8a92a2';
      ctx.fillRect(dx0 + 4, sy - 10, dx1 - dx0 - 8, 3);
    });
    // the door's glass: a pane smashed out where the shelf burst, sheen over the rest
    const smashed = polyPath([
      [dx0 + 30, SHELVES[1] - 46],
      [dx0 + 70, SHELVES[1] - 40],
      [dx0 + 96, SHELVES[1] - 58],
      [dx0 + 120, SHELVES[1] - 34],
      [dx0 + 150, SHELVES[1] - 44],
      [dx0 + 160, SHELVES[1] + 26],
      [dx0 + 100, SHELVES[1] + 34],
      [dx0 + 60, SHELVES[1] + 18],
      [dx0 + 24, SHELVES[1] + 30],
    ]);
    ctx.save();
    ctx.beginPath();
    ctx.rect(dx0, dy0, dx1 - dx0, dy1 - dy0);
    smashed(ctx);
    ctx.clip('evenodd');
    glassPaneLocal(ctx, door, { x: dx0, y: dy0, w: dx1 - dx0, h: dy1 - dy0 }, dx0 + 60, dy0 + 20);
    ctx.fillStyle = rgba('#a8c8ff', 0.05);
    ctx.fillRect(dx0, dy0, dx1 - dx0, dy1 - dy0);
    ctx.restore();
    ctx.strokeStyle = rgba('#e8f4ff', 0.3);
    ctx.lineWidth = 1;
    smashed(ctx);
    ctx.stroke();
  });
  ink(ctx, door, 2.4, INK, 0.3);
  // the goo welling out through the smashed pane, over its lower edge and down the door to the cabinet's foot
  const lipG: PathFn = (c) => {
    const sy = SHELVES[1];
    c.beginPath();
    c.moveTo(dx0 + 40, sy + 26);
    c.bezierCurveTo(dx0 + 50, sy + 2, dx0 + 96, sy - 8, dx0 + 132, sy + 10);
    c.bezierCurveTo(dx0 + 150, sy + 18, dx0 + 150, sy + 34, dx0 + 132, sy + 38);
    c.bezierCurveTo(dx0 + 124, sy + 46, dx0 + 122, sy + 70, dx0 + 118, dy1 - 6);
    c.quadraticCurveTo(dx0 + 112, dy1 + 16, dx0 + 104, dy1 - 4);
    c.bezierCurveTo(dx0 + 104, sy + 70, dx0 + 100, sy + 44, dx0 + 84, sy + 40);
    c.bezierCurveTo(dx0 + 70, sy + 46, dx0 + 64, sy + 52, dx0 + 60, sy + 40);
    c.bezierCurveTo(dx0 + 50, sy + 40, dx0 + 38, sy + 36, dx0 + 40, sy + 26);
    c.closePath();
  };
  castShadow(ctx, lipG, 5, 6, 0.5, '#04050a');
  goo(ctx, lipG, { x: dx0 + 48, y: SHELVES[1] - 10, w: 96, h: dy1 - SHELVES[1] + 30 }, { inkW: 2, rimD: 4, seed: 95 });
  glint(ctx, dx0 + 84, SHELVES[1] + 4, 9, 2, -0.15, 0.85);
  glint(ctx, dx0 + 110, SHELVES[2] - 6, 1.6, 9, 0, 0.6);
  ctx.strokeStyle = rgba('#a8d8e8', 0.3);
  ctx.lineWidth = 1.6;
  rrPath(dx0 + 2, dy0 + 2, dx1 - dx0 - 4, dy1 - dy0 - 4, 3)(ctx);
  ctx.stroke();
  // the handle and keypad, its LED red
  flat(ctx, rrPath(x1 - 26, top + 92, 10, 60, 4), '#a8b0c0', 2, INK, 0.5);
  flat(ctx, rrPath(x1 - 28, top + 32, 16, 44, 3), '#1c1e26', 1.8, INK, 0.4);
  for (let k = 0; k < 9; k++) {
    ctx.fillStyle = '#6a7282';
    ctx.fillRect(x1 - 25 + (k % 3) * 4, top + 46 + Math.floor(k / 3) * 7, 3, 4);
  }
  flat(ctx, ellPath(x1 - 20, top + 38, 2.6, 2.6), '#ff3a4a', 1, INK, 0);
  // the vent along the foot, the specimen-hazard sign on top (our own: a drip in a warning triangle)
  for (let k = 0; k < 6; k++) {
    ctx.fillStyle = INK;
    ctx.fillRect(x0 + 20, foot - 32 + k * 4.4, x1 - x0 - 40, 2);
  }
  const lp = rrPath((x0 + x1) / 2 - 70, top + 4, 120, 16, 3);
  flat(ctx, lp, '#1c1e26', 1.6, INK, 0.3);
  stencil(ctx, 'SPECIMEN STORE', (x0 + x1) / 2 - 10, top + 12, 12, '#d8dce8', 0.85);
  hazardSign(ctx, x1 - 20, top + 178, 10);
  // the vials' glow through the glass, on the floor in front
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  lightPool(ctx, (x0 + x1) / 2, foot + 12, 150, 18, '#8a6aff', 0.18);
  ctx.restore();
}

/** Our own hazard sign: a drip of goo in a yellow warning triangle. */
function hazardSign(ctx: Ctx, x: number, y: number, s: number): void {
  const tri = polyPath([
    [x, y - s],
    [x + s * 1.1, y + s * 0.8],
    [x - s * 1.1, y + s * 0.8],
  ]);
  castShadow(ctx, tri, 4, 4, 0.5, '#04050a');
  flat(ctx, tri, '#e8c040', 2.4, INK, 0.5);
  ctx.save();
  ctx.translate(x, y + s * 0.05);
  ctx.scale(s / 30, s / 30);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.bezierCurveTo(6, -6, 12, 2, 12, 9);
  ctx.arc(0, 9, 12, 0, Math.PI);
  ctx.bezierCurveTo(-12, 2, -6, -6, 0, -18);
  ctx.fill();
  ctx.fillStyle = '#e8c040';
  ctx.beginPath();
  ctx.ellipse(-4, 8, 2.4, 4, -0.4, 0, P2);
  ctx.fill();
  ctx.restore();
}

// ——— the right bay: a safety shower, a biohazard drum oozing at its lid ———

const RIGHT_BOX: Box = { x: 1540, y: VN.ceil - 4, w: W - 1540, h: FLOOR + 30 - VN.ceil };

function rightBay(ctx: Ctx, r: R): void {
  // the safety shower: its pipe from the lintel, the head, the pull rod and handle, its sign
  const S = VN.shower;
  pipeV(ctx, S.x, VN.ceil, S.head - 8, 8, '#3a8a5a', 2.2);
  for (let cy = VN.ceil + 24; cy < S.head - 20; cy += RIV * 2) collar(ctx, S.x, cy, 8, true, '#4a5a52');
  const head = ellPath(S.x, S.head, 30, 9);
  castShadow(ctx, head, 6, 6, 0.5, '#04050a');
  flat(ctx, head, '#3a8a5a', 2.2, INK, 0.5);
  ctx.fillStyle = rgba('#e8fff0', 0.35);
  ctx.beginPath();
  ctx.ellipse(S.x - 6, S.head - 3, 14, 2.4, 0, 0, P2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(S.x + 22, S.head - 6);
  ctx.lineTo(S.x + 22, S.head + 110);
  ctx.stroke();
  ctx.strokeStyle = '#a8b0c0';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  const tri = polyPath([
    [S.x + 22, S.head + 108],
    [S.x + 36, S.head + 132],
    [S.x + 8, S.head + 132],
  ]);
  ctx.save();
  ctx.lineWidth = 8;
  ctx.strokeStyle = INK;
  tri(ctx);
  ctx.stroke();
  ctx.lineWidth = 4.4;
  ctx.strokeStyle = '#3a9a5a';
  ctx.stroke();
  ctx.restore();
  const sg = rrPath(S.x - 40, S.head + 156, 80, 34, 3);
  castShadow(ctx, sg, 4, 4, 0.5, '#04050a');
  flat(ctx, sg, '#2a7a4a', 2, INK, 0.4);
  stencil(ctx, 'SAFETY', S.x, S.head + 166, 12, '#e8fff0', 0.95);
  stencil(ctx, 'SHOWER', S.x, S.head + 180, 12, '#e8fff0', 0.95);
  // the drum: ochre, banded, its lid knocked askew and goo welling over the rim and down its side
  const D = VN.drum;
  const dt = D.y - D.h;
  groundShadow(ctx, D.x + 12, D.y + 2, D.r + 18, 10, 0.85, '#04050a', 1.2);
  const side = (c: Ctx) => {
    c.beginPath();
    c.moveTo(D.x - D.r, dt);
    c.lineTo(D.x - D.r, D.y);
    c.ellipse(D.x, D.y, D.r, 9, 0, Math.PI, 0, true);
    c.lineTo(D.x + D.r, dt);
    c.ellipse(D.x, dt, D.r, 9, 0, 0, Math.PI, false);
    c.closePath();
  };
  aoHalo(ctx, side, 20, 0.5, '#04050a', 8);
  flat(ctx, side, '#b88a28', 0, INK);
  within(ctx, side, () => {
    const g = ctx.createLinearGradient(D.x - D.r, 0, D.x + D.r, 0);
    g.addColorStop(0, rgba('#000000', 0.2));
    g.addColorStop(0.25, rgba('#fff0c0', 0.32));
    g.addColorStop(0.45, rgba('#fff0c0', 0.04));
    g.addColorStop(1, rgba('#000000', 0.45));
    ctx.fillStyle = g;
    ctx.fillRect(D.x - D.r, dt - 10, D.r * 2, D.h + 20);
    for (const by of [dt + 34, dt + 82]) {
      ctx.strokeStyle = rgba(INK, 0.85);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(D.x, by, D.r, 9, 0, 0, Math.PI);
      ctx.stroke();
      ctx.strokeStyle = rgba('#fff0c0', 0.35);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(D.x, by + 3, D.r, 9, 0, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
    hazardSign(ctx, D.x - 12, dt + 58, 13);
    stencil(ctx, 'SPECIMEN', D.x + 22, dt + 52, 10, INK, 0.75);
    stencil(ctx, 'WASTE', D.x + 22, dt + 64, 10, INK, 0.75);
    grime(ctx, { x: D.x - D.r, y: dt, w: D.r * 2, h: D.h }, { col: '#2a1a08', a: 0.5, bottom: 30, patchy: 0.6, seed: 97 });
    dots(ctx, { x: D.x - D.r, y: dt - 10, w: D.r * 2, h: D.h + 20 }, linTone(D.x + 10, 0, D.x + D.r, 0, 0, 0.9), '#2a1a08', { step: 4.5, angle: 0.79, a: 0.55 });
  });
  ink(ctx, side, 2.8, INK, 0.6);
  // its open top, the goo heaving in it, the lid knocked askew
  flat(ctx, ellPath(D.x, dt, D.r - 4, 7), '#0a0810', 2, INK, 0);
  const welling: PathFn = (c) => {
    c.beginPath();
    c.moveTo(D.x - D.r + 2, dt + 2);
    c.bezierCurveTo(D.x - 40, dt - 30, D.x + 10, dt - 34, D.x + 30, dt - 14);
    c.bezierCurveTo(D.x + 46, dt - 10, D.x + D.r + 4, dt - 6, D.x + D.r + 6, dt + 8);
    c.bezierCurveTo(D.x + D.r + 10, dt + 40, D.x + D.r - 2, dt + 70, D.x + D.r - 10, dt + 96);
    c.bezierCurveTo(D.x + D.r - 18, dt + 70, D.x + D.r - 20, dt + 30, D.x + 20, dt + 10);
    c.bezierCurveTo(D.x - 10, dt + 14, D.x - 30, dt + 6, D.x - D.r + 2, dt + 2);
    c.closePath();
  };
  goo(ctx, welling, { x: D.x - D.r, y: dt - 36, w: D.r * 2 + 12, h: 134 }, { inkW: 2.2, rimD: 5, seed: 99 });
  glint(ctx, D.x - 12, dt - 22, 10, 2.2, -0.15, 0.85);
  glint(ctx, D.x + D.r + 2, dt + 24, 2, 7, 0, 0.6);
  // the lid leaning against the drum's foot
  const lid = ellPath(D.x - D.r - 16, D.y - 34, 20, D.r * 0.66, 0.16);
  castShadow(ctx, lid, 6, 6, 0.55, '#04050a');
  flat(ctx, lid, '#9a7420', 2.4, INK, 0.5);
  ctx.strokeStyle = rgba('#fff0c0', 0.4);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(D.x - D.r - 16, D.y - 34, 14, D.r * 0.52, 0.16, 0, P2);
  ctx.stroke();
  void r;
}

// ——— the floor: dark epoxy, a hazard ring round the tank, a drain ———

const FLOOR_BOX: Box = { x: 0, y: FLOOR - 2, w: W, h: TY + 2 - (FLOOR - 2) };
const atFloor = (x: number, y: number) => VP.x + (x - VP.x) * ((y - VP.y) / (TY - VP.y));

function floorSlab(ctx: Ctx, r: R): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, FLOOR, W, TY - FLOOR);
  ctx.clip();
  vfill(ctx, 0, FLOOR, W, TY - FLOOR, [[0, '#181b26'], [0.5, '#222634'], [1, '#1c1f2a']]);
  surface(ctx, r, { x: 0, y: FLOOR, w: W, h: TY - FLOOR }, '#20242f', { over: true, vary: 0.35, cells: 6, mottle: 0.3, strokes: 0.2, strokeAng: 0, strokeLen: 120, grain: 0.22, seed: 101 });
  // seams to the eye and across, on the panel grid
  ctx.strokeStyle = rgba('#05060a', 0.6);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let X = -PANEL * 6; X <= W + PANEL * 6; X += PANEL * 2) {
    ctx.moveTo(atFloor(X, FLOOR), FLOOR);
    ctx.lineTo(X, TY);
  }
  for (const y of [668, 702]) {
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
  }
  ctx.stroke();
  // the safety line along the wall's foot, worn through in places
  ctx.fillStyle = rgba(HAZ, 0.55);
  for (let x = 0; x < W; x += 60) if (r() > 0.15) ctx.fillRect(x + r() * 6, FLOOR + 8, 46 + r() * 8, 3.4);
  // the hazard ring round the tank, in perspective
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(T.x, 662, 300, 48, 0, 0, P2);
  ctx.ellipse(T.x, 662, 276, 40, 0, 0, P2);
  ctx.clip('evenodd');
  ctx.fillStyle = rgba(HAZ, 0.6);
  ctx.fillRect(T.x - 300, 600, 600, 120);
  ctx.strokeStyle = rgba(INK, 0.85);
  ctx.lineWidth = 9;
  ctx.beginPath();
  for (let a = 0; a < P2; a += P2 / 48) {
    ctx.moveTo(T.x + Math.cos(a) * 270, 662 + Math.sin(a) * 38);
    ctx.lineTo(T.x + Math.cos(a + 0.05) * 310, 662 + Math.sin(a + 0.05) * 52);
  }
  ctx.stroke();
  ctx.restore();
  // the drain, a sample tray dropped and kicked aside
  const dr = ellPath(1300, 728, 34, 8);
  flat(ctx, dr, '#0c0d14', 2, INK, 0.3);
  within(ctx, dr, () => {
    ctx.strokeStyle = rgba('#6a7488', 0.6);
    ctx.lineWidth = 1.4;
    for (let x = 1272; x < 1330; x += 8) {
      ctx.beginPath();
      ctx.moveTo(x, 720);
      ctx.lineTo(x, 736);
      ctx.stroke();
    }
  });
  // scuffs and the wet sheen of the epoxy
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = rgba(r() < 0.5 ? '#c8d4f0' : '#020306', 0.05 + r() * 0.05);
    ctx.fillRect(r() * W, FLOOR + 10 + r() * (TY - FLOOR - 20), 30 + r() * 100, 1.2);
  }
  // the tank's violet, the vials' violet, the screens' red reflected in the floor
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  lightPool(ctx, T.x, 690, 460, 50, VIOLET, 0.16);
  lightPool(ctx, (VN.cabinet.x0 + VN.cabinet.x1) / 2, 668, 140, 20, VIOLET, 0.08);
  lightPool(ctx, VN.screen.x + VN.screen.w / 2, 660, 120, 16, '#ff2a3a', 0.05);
  ctx.restore();
  // printed shade: deeper at the wall and out at the ends, calm along the table's edge
  dots(ctx, { x: 0, y: FLOOR, w: W, h: TY - FLOOR }, (x, y) => 0.35 * (1 - smooth(FLOOR, FLOOR + 40, y)) + 0.25 * (1 - smooth(0, 500, x)) + 0.25 * smooth(1420, W, x) + 0.1, '#05060c', { step: 6, angle: 0.79, a: 0.7 });
  ctx.restore();
  crevice(ctx, 0, W, FLOOR, 16, 0.6, '#04050a');
}

// ——— the containment tank ———

/** The front arc of a horizontal ellipse (centre cx, cy, radii rx, ry), sampled left to right. */
function frontArc(cx: number, cy: number, rx: number, ry: number, n = 24, sign = 1): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const u = -1 + (2 * i) / n;
    out.push([cx + u * rx, cy + sign * ry * Math.sqrt(Math.max(0, 1 - u * u))]);
  }
  return out;
}

/** The glass's front face (between the crown's rim and the plinth's socket). */
function glassFront(): [number, number][] {
  const top = frontArc(T.x, T.capBot, T.r, 10);
  const bot = frontArc(T.x, T.glassBot, T.r, 22).reverse();
  return [...top, ...bot];
}

/** The hole the thing broke out through, its teeth top and bottom (clockwise from the top left). */
export const HOLE: [number, number][] = [
  [846, 232], [860, 290], [878, 246], [900, 330], [920, 258], [946, 272], [968, 230], [990, 286], [1010, 246], [1030, 262],
  [1048, 226], [1064, 284], [1072, 258],
  [1068, 300], [1080, 344], [1070, 392], [1084, 430], [1078, 486],
  [1064, 470], [1052, 500], [1040, 488], [1030, 524], [1000, 530], [970, 534], [944, 528], [928, 522], [916, 492],
  [900, 506], [884, 452], [868, 488], [852, 470], [844, 430],
  [840, 372], [852, 330], [842, 290],
];

const TANK_BACK_BOX: Box = { x: T.x - 180, y: T.capBot - 20, w: 360, h: T.glassBot + 40 - (T.capBot - 20) };

function tankBack(ctx: Ctx): void {
  const gf = polyPath(glassFront());
  // the plinth ring's top, and the tank's floor inside the glass
  flat(ctx, ellPath(T.x, T.glassBot, 170, 25), '#5a6270', 2.2, INK, 0.4);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowAt(ctx, T.x, T.glassBot, 190, VIOLET, 0.18, 0.2);
  ctx.restore();
  within(ctx, gf, () => {
    // the back of the cylinder seen from inside: dark, lit violet from the ring lamp in the floor
    vfill(ctx, T.x - T.r, T.capBot - 10, T.r * 2, T.glassBot - T.capBot + 40, [[0, '#0a0814'], [0.45, '#1e1640'], [1, '#4a2e8a']]);
    const sg = ctx.createLinearGradient(T.x - T.r, 0, T.x + T.r, 0);
    sg.addColorStop(0, rgba('#000000', 0.55));
    sg.addColorStop(0.25, rgba('#000000', 0));
    sg.addColorStop(0.75, rgba('#000000', 0));
    sg.addColorStop(1, rgba('#000000', 0.6));
    ctx.fillStyle = sg;
    ctx.fillRect(T.x - T.r, T.capBot - 10, T.r * 2, T.glassBot - T.capBot + 40);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glowAt(ctx, T.x, T.glassBot - 10, 240, VIOLET, 0.42, 0.8);
    glowAt(ctx, T.x, T.glassBot - 120, 150, '#a888ff', 0.2, 0.9);
    ctx.restore();
    // the back glass's inner face: vertical reflections, cracks, goo smeared up it in runs
    for (const [x, a, wd] of [[T.x - 92, 0.09, 10], [T.x + 70, 0.12, 6], [T.x + 104, 0.06, 14]] as const) {
      const g = ctx.createLinearGradient(x - wd, 0, x + wd, 0);
      g.addColorStop(0, rgba('#c8d8ff', 0));
      g.addColorStop(0.5, rgba('#c8d8ff', a));
      g.addColorStop(1, rgba('#c8d8ff', 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - wd, T.capBot, wd * 2, T.glassBot - T.capBot);
    }
    for (const [sx, sy, len, sw, k] of [[T.x - 76, T.capBot + 56, 120, 7, 0], [T.x + 54, T.capBot + 70, 150, 9, 1], [T.x + 100, T.capBot + 34, 70, 4, 2]] as const) {
      ctx.fillStyle = rgba('#05040a', 0.6);
      blob(sx, sy, sw * 3.2, sw * 2.2, 115 + k, 0.35, 12)(ctx);
      ctx.fill();
      for (const [dx, lk] of [[-sw * 1.6, 0.5], [0, 1], [sw * 1.8, 0.7]] as const) {
        const ww = sw * (lk === 1 ? 0.7 : 0.45);
        ribbon([[sx + dx, sy], [sx + dx + 2, sy + len * lk * 0.5], [sx + dx - 1, sy + len * lk]], [ww, ww * 0.6, ww * 1.15])(ctx);
        ctx.fill();
      }
      ctx.strokeStyle = rgba('#8a7ad8', 0.22);
      ctx.lineWidth = 1.2;
      blob(sx, sy, sw * 3.2, sw * 2.2, 115 + k, 0.35, 12)(ctx);
      ctx.stroke();
    }
    // the torn feed hoses hanging from the crown, their ends ragged and dripping
    for (const [hx, len, k] of [[T.x - 52, 96, 0], [T.x + 16, 70, 1], [T.x + 58, 120, 2]] as const) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(hx, T.capBot);
      ctx.quadraticCurveTo(hx + (k - 1) * 18, T.capBot + len * 0.6, hx + (k - 1) * 10, T.capBot + len);
      ctx.stroke();
      ctx.strokeStyle = ['#5a5266', '#4a5a6a', '#5a4a5a'][k];
      ctx.lineWidth = 5.6;
      ctx.stroke();
      ctx.strokeStyle = rgba('#d8c8ff', 0.3);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      goo(ctx, dripPath(hx + (k - 1) * 10, T.capBot + len, 4, 16 + k * 4), { x: hx + (k - 1) * 10 - 8, y: T.capBot + len - 2, w: 16, h: 26 }, { inkW: 1, rimD: 2, print: false });
    }
  });
  // the crown's underside: a dark ring with feed nozzles
  flat(ctx, ellPath(T.x, T.capBot, T.r, 10), '#14121e', 2, INK, 0);
  ctx.fillStyle = rgba('#8a90b8', 0.35);
  for (let k = -3; k <= 3; k++) {
    ctx.beginPath();
    ctx.ellipse(T.x + k * 38, T.capBot + 2, 6, 2, 0, 0, P2);
    ctx.fill();
  }
}

/** The breathing heart of goo still in the tank (frame painter: local coords, the tank floor at y CORE.base). */
export const CORE = { w: 300, h: 180, base: 164, x0: T.x - 150, y0: T.glassBot - 164 };
export const CORE_N = 12;

export function coreFrame(c: Ctx, ph: number, flare = 0): void {
  const cx = CORE.w / 2;
  const by = CORE.base + 6;
  const P = ph * P2;
  const breathe = 1 + 0.035 * Math.sin(P);
  const pts: [number, number][] = [];
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    const k = 1 + 0.06 * Math.sin(3 * a + P) + 0.035 * Math.sin(7 * a - 2 * P) + 0.025 * Math.sin(11 * a + 3 * P);
    const rx = 136 * (1 + 0.01 * Math.sin(P + 1));
    const ry = 120 * breathe;
    pts.push([cx + Math.cos(a) * rx * k, by + Math.sin(a) * ry * k * (0.82 + 0.18 * Math.abs(Math.cos(a * 0.5)))]);
  }
  const body: PathFn = (g) => {
    g.beginPath();
    g.moveTo(pts[0][0], by + 14);
    for (let i = 0; i < pts.length; i++) {
      const [px, py] = pts[i];
      const [qx, qy] = pts[Math.min(pts.length - 1, i + 1)];
      g.quadraticCurveTo(px, py, (px + qx) / 2, (py + qy) / 2);
    }
    g.lineTo(pts[pts.length - 1][0], by + 14);
    g.closePath();
  };
  const box: Box = { x: 4, y: by - 140, w: CORE.w - 8, h: 160 };
  goo(c, body, box, { sheen: 1.2, inkW: 2.6, rimD: 8, bounceA: 0.9, seed: 121 });
  // its heart: a violet glow deep inside it, beating, and a few dim veins carrying the beat outward
  c.save();
  body(c);
  c.clip();
  const rr = mkRng(123);
  c.globalCompositeOperation = 'lighter';
  const hx = cx + 10;
  const hy = by - 44;
  const beat = Math.max(0, Math.cos(ph * P2)) ** 3;
  for (const [ox, oy, rad, a0] of [[0, 0, 90, 0.22], [-30, 14, 50, 0.16], [36, 10, 44, 0.14]] as const) {
    const hg = c.createRadialGradient(hx + ox, hy + oy, 0, hx + ox, hy + oy, rad * (1 + beat * 0.12));
    hg.addColorStop(0, rgba('#9a6aff', a0 + beat * 0.16 + flare * 0.15));
    hg.addColorStop(0.6, rgba('#5a2ac8', (a0 + beat * 0.1) * 0.5));
    hg.addColorStop(1, rgba('#5a2ac8', 0));
    c.fillStyle = hg;
    c.fillRect(hx + ox - rad * 1.2, hy + oy - rad * 1.2, rad * 2.4, rad * 2.4);
  }
  c.lineCap = 'round';
  for (let k = 0; k < 5; k++) {
    let x = hx + (rr() - 0.5) * 30;
    let y = hy + (rr() - 0.5) * 20;
    let a = -Math.PI / 2 + (k - 2) * 0.75 + (rr() - 0.5) * 0.4;
    c.beginPath();
    c.moveTo(x, y);
    for (let j = 0; j < 6; j++) {
      a += (rr() - 0.5) * 0.9;
      const nx = x + Math.cos(a) * 14;
      const ny = y + Math.sin(a) * 14;
      c.quadraticCurveTo(x + Math.cos(a + 0.6) * 8, y + Math.sin(a + 0.6) * 8, nx, ny);
      x = nx;
      y = ny;
    }
    const d = (k / 5 + ph) % 1;
    c.strokeStyle = rgba('#b48aff', 0.12 + 0.3 * Math.max(0, Math.cos(d * P2)) ** 4 + flare * 0.1);
    c.lineWidth = 3.4;
    c.stroke();
  }
  c.restore();
  // a broad white-blue sheen high on its shoulder
  const sx0 = cx - 40;
  const sy0 = by - 96 * breathe;
  const sg = c.createRadialGradient(sx0, sy0, 0, sx0, sy0, 46);
  sg.addColorStop(0, rgba('#c8d4ff', 0.34));
  sg.addColorStop(0.5, rgba('#8ea2ff', 0.12));
  sg.addColorStop(1, rgba('#8ea2ff', 0));
  c.save();
  body(c);
  c.clip();
  c.fillStyle = sg;
  c.fillRect(sx0 - 50, sy0 - 50, 100, 100);
  c.restore();
  // its sheen: glints riding the bulges, shifting as it breathes
  const top = pts[Math.round(n * 0.42)];
  glint(c, top[0] - 4, top[1] + 10, 14, 3, -0.2, 0.9);
  const sh = pts[Math.round(n * 0.22)];
  glint(c, sh[0] + 8, sh[1] + 10, 7, 2, -0.9, 0.7);
  const sh2 = pts[Math.round(n * 0.66)];
  glint(c, sh2[0] - 6, sh2[1] + 12, 6, 1.6, 0.5, 0.55);
}

function coreStill(ctx: Ctx): void {
  ctx.save();
  ctx.translate(CORE.x0, CORE.y0);
  coreFrame(ctx, 0.15);
  ctx.restore();
}

const CROWN_BOX: Box = { x: T.x - 200, y: 0, w: 400, h: T.capBot + 24 };

function crown(ctx: Ctx, r: R): void {
  // the feed pipes up out of the crown into the soffit
  for (const px of [T.x - 62, T.x + 62]) {
    pipeV(ctx, px, 0, 144, 12, '#4a5262', 2.4);
    for (const cy of [60, 108]) collar(ctx, px, cy, 12, true, '#5a6272');
  }
  // the crown: a steel drum, its bolted ring at the foot, lit from the left
  const top = 140;
  const body: PathFn = (c) => {
    c.beginPath();
    c.moveTo(T.x - 172, top);
    c.lineTo(T.x + 172, top);
    c.lineTo(T.x + 172, T.capBot - 12);
    for (const [x, y] of frontArc(T.x, T.capBot - 12, 172, 14).reverse()) c.lineTo(x, y);
    c.closePath();
  };
  castShadow(ctx, body, 10, 12, 0.55, '#04050a');
  flat(ctx, body, STEEL, 0, INK);
  within(ctx, body, () => {
    surface(ctx, r, { x: T.x - 172, y: top, w: 344, h: 70 }, STEEL, { over: true, vary: 0.3, cells: 3, mottle: 0.3, strokes: 0.2, strokeAng: 0, grain: 0.22, seed: 131 });
    const g = ctx.createLinearGradient(T.x - 172, 0, T.x + 172, 0);
    g.addColorStop(0, rgba('#000000', 0.25));
    g.addColorStop(0.2, rgba('#e8f0ff', 0.32));
    g.addColorStop(0.4, rgba('#e8f0ff', 0.05));
    g.addColorStop(1, rgba('#000000', 0.5));
    ctx.fillStyle = g;
    ctx.fillRect(T.x - 172, top, 344, 80);
    // the bolted ring
    ctx.fillStyle = rgba(INK, 0.85);
    for (const [x, y] of frontArc(T.x, T.capBot - 26, 172, 13)) ctx.fillRect(x - 1, y - 1, 2.4, 2.4);
    for (let k = -8; k <= 8; k++) {
      const u = k / 9;
      rivet(ctx, T.x + u * 164, T.capBot - 18 + 13 * Math.sqrt(1 - u * u), 2.2 - Math.abs(u) * 0.6, '#a8b0c0');
    }
    dots(ctx, { x: T.x - 172, y: top, w: 344, h: 80 }, linTone(T.x, 0, T.x + 172, 0, 0, 0.9), SHADE, { step: 4.5, angle: 0.79, a: 0.75 });
  });
  ink(ctx, body, 3, INK, 0.6);
  // goo crawled up out of the tank over the crown's ends (the ceiling tendrils grow from here)
  for (const [gx, gy, rx, ry, s] of [[T.x - 132, 148, 52, 22, 133], [T.x + 132, 152, 48, 20, 134]] as const) {
    const g = blob(gx, gy, rx, ry, s, 0.3, 16);
    goo(ctx, g, { x: gx - rx - 6, y: gy - ry - 6, w: rx * 2 + 12, h: ry * 2 + 12 }, { inkW: 2, rimD: 4, seed: s });
    glint(ctx, gx - rx * 0.3, gy - ry * 0.55, 8, 2, -0.2, 0.8);
    for (const dx of [-rx * 0.5, rx * 0.3]) goo(ctx, dripPath(gx + dx, gy + ry * 0.7, 3.6, 22 + (s % 2) * 10), { x: gx + dx - 8, y: gy + ry * 0.6, w: 16, h: 40 }, { inkW: 1.2, rimD: 2, print: false });
  }
}

const PLINTH_BOX: Box = { x: T.x - 240, y: T.glassBot - 30, w: 480, h: 150 };

function plinth(ctx: Ctx, r: R): void {
  // the lower step: hazard-banded
  const step: PathFn = (c) => {
    c.beginPath();
    c.moveTo(T.x - 210, T.step);
    c.lineTo(T.x - 210, T.foot);
    for (const [x, y] of frontArc(T.x, T.foot, 210, 30)) c.lineTo(x, y);
    c.lineTo(T.x + 210, T.step);
    for (const [x, y] of frontArc(T.x, T.step, 210, 30).reverse()) c.lineTo(x, y);
    c.closePath();
  };
  groundShadow(ctx, T.x + 20, T.foot + 26, 240, 18, 0.85, '#04050a', 1.2);
  flat(ctx, ellPath(T.x, T.step, 210, 30), '#4a5260', 2.2, INK, 0.4);
  ctx.fillStyle = rgba('#e8f0ff', 0.14);
  ctx.beginPath();
  ctx.ellipse(T.x - 40, T.step - 6, 150, 18, 0, Math.PI, P2);
  ctx.fill();
  flat(ctx, step, '#3a404c', 0, INK);
  within(ctx, step, () => {
    surface(ctx, r, { x: T.x - 210, y: T.step, w: 420, h: 80 }, '#3a404c', { over: true, vary: 0.3, cells: 3, mottle: 0.3, strokes: 0, grain: 0.22, seed: 141 });
    ctx.save();
    ctx.beginPath();
    for (const [x, y] of frontArc(T.x, T.step + 14, 210, 30)) ctx.lineTo(x, y);
    for (const [x, y] of frontArc(T.x, T.step + 28, 210, 30).reverse()) ctx.lineTo(x, y);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = HAZ;
    ctx.fillRect(T.x - 210, T.step, 420, 80);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 10;
    ctx.beginPath();
    for (let x = T.x - 240; x < T.x + 240; x += 22) {
      ctx.moveTo(x, T.step + 70);
      ctx.lineTo(x + 50, T.step);
    }
    ctx.stroke();
    ctx.restore();
    const g = ctx.createLinearGradient(T.x - 210, 0, T.x + 210, 0);
    g.addColorStop(0, rgba('#000000', 0.2));
    g.addColorStop(0.22, rgba('#e8f0ff', 0.2));
    g.addColorStop(0.4, rgba('#e8f0ff', 0));
    g.addColorStop(1, rgba('#000000', 0.5));
    ctx.fillStyle = g;
    ctx.fillRect(T.x - 210, T.step, 420, 80);
    grime(ctx, { x: T.x - 210, y: T.step, w: 420, h: 80 }, { col: '#04050a', a: 0.5, bottom: 30, patchy: 0.5, seed: 143 });
    dots(ctx, { x: T.x - 210, y: T.step, w: 420, h: 80 }, linTone(T.x, 0, T.x + 210, 0, 0.05, 0.9), SHADE, { step: 4.5, angle: 0.79, a: 0.75 });
  });
  ink(ctx, step, 3, INK, 0.6);
  // the upper ring: the glass's socket, the ring lamp's violet in the gap
  const ring: PathFn = (c) => {
    c.beginPath();
    c.moveTo(T.x - 170, T.glassBot);
    c.lineTo(T.x - 170, T.step);
    for (const [x, y] of frontArc(T.x, T.step, 170, 25)) c.lineTo(x, y);
    c.lineTo(T.x + 170, T.glassBot);
    for (const [x, y] of frontArc(T.x, T.glassBot, 170, 25).reverse()) c.lineTo(x, y);
    c.closePath();
  };
  castShadow(ctx, ring, 6, 8, 0.6, '#04050a');
  flat(ctx, ring, STEEL, 0, INK);
  within(ctx, ring, () => {
    surface(ctx, r, { x: T.x - 170, y: T.glassBot, w: 340, h: 70 }, STEEL, { over: true, vary: 0.3, cells: 3, mottle: 0.3, strokes: 0.2, strokeAng: 0, grain: 0.22, seed: 145 });
    const g = ctx.createLinearGradient(T.x - 170, 0, T.x + 170, 0);
    g.addColorStop(0, rgba('#000000', 0.2));
    g.addColorStop(0.2, rgba('#e8f0ff', 0.34));
    g.addColorStop(0.38, rgba('#e8f0ff', 0.05));
    g.addColorStop(1, rgba('#000000', 0.5));
    ctx.fillStyle = g;
    ctx.fillRect(T.x - 170, T.glassBot, 340, 70);
    for (let k = -7; k <= 7; k++) {
      const u = k / 8;
      rivet(ctx, T.x + u * 160, T.step + 14 + 25 * Math.sqrt(1 - u * u) - 30, 2 - Math.abs(u) * 0.5, '#a8b0c0');
    }
    dots(ctx, { x: T.x - 170, y: T.glassBot, w: 340, h: 70 }, linTone(T.x, 0, T.x + 170, 0, 0.05, 0.9), SHADE, { step: 4.5, angle: 0.79, a: 0.75 });
  });
  ink(ctx, ring, 3, INK, 0.6);
  // the chamber's plate, on the ring's front to the left of the pour
  const cp = rrPath(T.x - 150, T.step + 2, 96, 18, 3);
  flat(ctx, cp, '#1c1e26', 1.6, INK, 0.3);
  stencil(ctx, 'CHAMBER 3', T.x - 102, T.step + 11, 12, HAZ, 0.9);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(VIOLET, 0.5);
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (const [x, y] of frontArc(T.x, T.glassBot + 1, 156, 23)) ctx.lineTo(x, y);
  ctx.stroke();
  ctx.restore();
}

// ——— the goo pool spreading from the plinth, shards in it ———

const POOL = { x: T.x, y: 698, rx: 250, ry: 30 };
const POOL_BOX: Box = { x: POOL.x - POOL.rx - 40, y: POOL.y - POOL.ry - 30, w: POOL.rx * 2 + 80, h: POOL.ry * 2 + 50 };

function pool(ctx: Ctx): void {
  const p = blob(POOL.x, POOL.y, POOL.rx, POOL.ry, 151, 0.16, 22);
  goo(ctx, p, { x: POOL.x - POOL.rx, y: POOL.y - POOL.ry, w: POOL.rx * 2, h: POOL.ry * 2 }, { sheen: 1, inkW: 2.2, rimD: 5, seed: 151 });
  within(ctx, p, () => {
    // the tank's violet and the crown reflected in it, broken by ripples
    const rg = ctx.createLinearGradient(T.x - 60, 0, T.x + 60, 0);
    rg.addColorStop(0, rgba(VIOLET, 0));
    rg.addColorStop(0.5, rgba('#a888ff', 0.3));
    rg.addColorStop(1, rgba(VIOLET, 0));
    ctx.fillStyle = rg;
    ctx.fillRect(T.x - 60, POOL.y - POOL.ry, 120, POOL.ry * 2);
    ctx.strokeStyle = rgba(SHEEN_B, 0.3);
    ctx.lineWidth = 1.4;
    for (const [rx, ry] of [[80, 10], [140, 16], [210, 22]]) {
      ctx.beginPath();
      ctx.ellipse(T.x, POOL.y - 12, rx, ry, 0, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    }
  });
  glint(ctx, POOL.x - 150, POOL.y - 16, 18, 2.2, -0.04, 0.8);
  glint(ctx, POOL.x + 130, POOL.y - 18, 12, 1.8, 0.05, 0.6);
  glint(ctx, POOL.x - 40, POOL.y + 6, 8, 1.4, 0, 0.45);
}

// ——— glass shards over the floor ———

const SHARDS_BOX: Box = { x: 560, y: FLOOR, w: 820, h: TY - FLOOR };

/** A shard of thick glass lying flat-ish: tinted, its broken edges lit, a glint. */
export function shard(ctx: Ctx, x: number, y: number, s: number, rot: number, seed: number, flatK = 0.45): void {
  const rr = mkRng(seed);
  const n = 3 + Math.floor(rr() * 3);
  const pts: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * P2 + rr() * 0.6;
    const rad = s * (0.4 + rr() * 0.8);
    const px = Math.cos(a + rot) * rad;
    const py = Math.sin(a + rot) * rad * flatK;
    pts.push([x + px, y + py]);
  }
  const p = polyPath(pts);
  groundShadow(ctx, x + 2, y + 2, s * 0.8, s * 0.2, 0.4, '#020306');
  ctx.save();
  p(ctx);
  ctx.fillStyle = rgba('#a8d0e8', 0.28);
  ctx.fill();
  ctx.strokeStyle = rgba('#5ab8b0', 0.6);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = rgba('#f0faff', 0.85);
  ctx.lineWidth = 1;
  ctx.translate(-0.6, -0.8);
  p(ctx);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = rgba('#ffffff', 0.9);
  ctx.beginPath();
  ctx.arc(pts[0][0], pts[0][1], Math.max(0.8, s * 0.06), 0, P2);
  ctx.fill();
}

function shards(ctx: Ctx, r: R): void {
  // big ones leaning on the plinth's step, the rest flung across the floor (thicker near the tank)
  for (const [sx, sy, s, rot] of [[T.x - 252, 676, 30, 1.6], [T.x + 222, 662, 14, -0.9], [T.x - 130, 728, 18, 0.3]] as const) {
    const pts: [number, number][] = [[sx - s * 0.5, sy], [sx - s * 0.1, sy - s * 1.6], [sx + s * 0.6, sy - s * 0.4], [sx + s * 0.4, sy]];
    const p = polyPath(pts.map(([px, py]) => [sx + (px - sx) * Math.cos(rot * 0.3) - (py - sy) * Math.sin(rot * 0.3), sy + (px - sx) * Math.sin(rot * 0.3) + (py - sy) * Math.cos(rot * 0.3)] as [number, number]));
    castShadow(ctx, p, 5, 5, 0.5, '#020306');
    ctx.save();
    p(ctx);
    ctx.fillStyle = rgba('#a8d0e8', 0.3);
    ctx.fill();
    ctx.strokeStyle = rgba('#5ab8b0', 0.7);
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.strokeStyle = rgba('#f4fbff', 0.9);
    ctx.lineWidth = 1.1;
    ctx.translate(-1, -1);
    p(ctx);
    ctx.stroke();
    ctx.restore();
  }
  // clusters round a few big pieces (more of them flung left), strays between
  for (const [cx, cy, n, big] of [[T.x - 300, 700, 14, 16], [T.x - 470, 690, 8, 12], [T.x + 290, 712, 9, 13], [T.x + 120, 730, 6, 10]] as const) {
    shard(ctx, cx, cy, big, r() * P2, Math.round(cx), 0.4);
    for (let i = 0; i < n; i++) {
      const d = 10 + r() ** 1.6 * 90;
      const a = r() * P2;
      shard(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.3, 2.5 + r() * 6 * (1 - d / 110), r() * P2, Math.round(cx) + i + 1);
    }
  }
  for (let i = 0; i < 12; i++) shard(ctx, 620 + r() * 700, 676 + r() * 64, 2 + r() * 4, r() * P2, 260 + i);
}

// ——— the glass that's left: teeth top and bottom, thick edges, cracks (a sprite: it rattles when an emitter fires) ———

export const GLASS_BOX: Box = { x: T.x - T.r - 12, y: T.capBot - 4, w: T.r * 2 + 24, h: T.glassBot + 30 - (T.capBot - 4) };

function glass(ctx: Ctx, r: R): void {
  const front = glassFront();
  const hole = polyPath(HOLE);
  const left: PathFn = (c) => {
    polyPath(front)(c);
    for (const [i, [x, y]] of HOLE.entries()) (i ? c.lineTo(x, y) : c.moveTo(x, y));
    c.closePath();
  };
  ctx.save();
  left(ctx);
  ctx.clip('evenodd');
  // tint, then the cylinder's Fresnel: its edges catch the room, a dark band of refraction inside each edge
  ctx.fillStyle = rgba('#8ab8d8', 0.12);
  ctx.fillRect(T.x - T.r, T.capBot, T.r * 2, T.glassBot - T.capBot + 30);
  const g = ctx.createLinearGradient(T.x - T.r, 0, T.x + T.r, 0);
  g.addColorStop(0, rgba('#d8ecff', 0.4));
  g.addColorStop(0.05, rgba('#d8ecff', 0.12));
  g.addColorStop(0.1, rgba('#02040a', 0.32));
  g.addColorStop(0.2, rgba('#02040a', 0));
  g.addColorStop(0.8, rgba('#02040a', 0));
  g.addColorStop(0.9, rgba('#02040a', 0.4));
  g.addColorStop(0.96, rgba('#a8c8ff', 0.18));
  g.addColorStop(1, rgba('#a8c8ff', 0.3));
  ctx.fillStyle = g;
  ctx.fillRect(T.x - T.r, T.capBot, T.r * 2, T.glassBot - T.capBot + 30);
  // the strip lights' reflections: a hard streak and a soft broad one
  for (const [x, wd, a] of [[T.x - T.r + 30, 5, 0.65], [T.x - T.r + 44, 16, 0.14], [T.x + T.r - 46, 22, 0.1]] as const) {
    const sg = ctx.createLinearGradient(x - wd, 0, x + wd, 0);
    sg.addColorStop(0, rgba('#ffffff', 0));
    sg.addColorStop(0.5, rgba('#ffffff', a));
    sg.addColorStop(1, rgba('#ffffff', 0));
    ctx.fillStyle = sg;
    ctx.fillRect(x - wd, T.capBot, wd * 2, T.glassBot - T.capBot + 30);
  }
  // cracks running out from the teeth into the glass that's left
  const rr = mkRng(161);
  for (let k = 0; k < HOLE.length; k += 2) {
    const [hx, hy] = HOLE[k];
    const a = Math.atan2(hy - 380, hx - T.x) + (rr() - 0.5) * 0.8;
    let x = hx;
    let y = hy;
    const len = 20 + rr() * 50;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let j = 0; j < 4; j++) {
      x += Math.cos(a + (rr() - 0.5) * 0.6) * (len / 4);
      y += Math.sin(a + (rr() - 0.5) * 0.6) * (len / 4);
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgba('#000000', 0.5);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.translate(-0.8, -0.8);
    ctx.strokeStyle = rgba('#eef8ff', 0.6);
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.translate(0.8, 0.8);
  }
  // goo smeared on the outside of what's left, low down
  for (const [sx, sy, w2, h2] of [[T.x - 120, 470, 22, 60], [T.x + 104, 490, 16, 50]] as const) {
    ctx.fillStyle = rgba('#07060c', 0.55);
    ribbon([[sx, sy], [sx + 2, sy + h2 * 0.5], [sx - 1, sy + h2]], [w2 * 0.5, w2 * 0.4, w2 * 0.55])(ctx);
    ctx.fill();
  }
  ctx.restore();
  // the broken edges: the glass's thickness (a sea-green line), a lit lip, ink outside
  ctx.save();
  ctx.lineJoin = 'miter';
  ctx.strokeStyle = rgba(INK, 0.8);
  ctx.lineWidth = 4.2;
  hole(ctx);
  ctx.stroke();
  ctx.strokeStyle = rgba('#3a8a84', 0.7);
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // the glass's far face along the break: a second, fainter line inside the first
  ctx.save();
  ctx.strokeStyle = rgba('#8ad8d0', 0.4);
  ctx.lineWidth = 1;
  ctx.translate(2.4, 2);
  hole(ctx);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = rgba('#e8f8ff', 0.75);
  ctx.lineWidth = 1;
  ctx.translate(-1.2, -1.4);
  hole(ctx);
  ctx.stroke();
  ctx.restore();
  // glints on the teeth's tips
  for (const k of [3, 6, 11, 17, 26, 28]) {
    const [x, y] = HOLE[k];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glowAt(ctx, x, y, 10, '#e8f4ff', 0.5);
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, P2);
    ctx.fill();
  }
  // petals of glass bent outward by what broke through, standing proud of the cylinder
  for (const [px, py, ang, len, wd] of [[848, 418, Math.PI + 0.5, 34, 16], [1080, 352, -0.35, 28, 13], [904, 300, -1.9, 24, 12], [1062, 470, 0.55, 22, 11]] as const) {
    const tip: [number, number] = [px + Math.cos(ang) * len, py + Math.sin(ang) * len];
    const nx = -Math.sin(ang) * wd * 0.5;
    const ny = Math.cos(ang) * wd * 0.5;
    const pet = polyPath([[px + nx, py + ny], [px + nx * 0.2 + Math.cos(ang) * len * 0.6, py + ny * 0.2 + Math.sin(ang) * len * 0.6 + 3], tip, [px - nx, py - ny]]);
    castShadow(ctx, pet, 4, 4, 0.35, '#000000');
    ctx.save();
    pet(ctx);
    ctx.fillStyle = rgba('#b8dcf0', 0.32);
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.8);
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.strokeStyle = rgba('#3a8a84', 0.75);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = rgba('#ffffff', 0.85);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + nx * 0.8, py + ny * 0.8);
    ctx.lineTo(tip[0], tip[1]);
    ctx.stroke();
  }
  // the cylinder's outline
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(T.x - T.r, T.capBot);
  ctx.lineTo(T.x - T.r, T.glassBot);
  ctx.moveTo(T.x + T.r, T.capBot);
  ctx.lineTo(T.x + T.r, T.glassBot);
  ctx.stroke();
  void r;
}

// ——— the pour: goo over the broken rim, down the plinth, into the pool (a frame loop; the still paints phase 0) ———

export const SPILL = { x0: T.x - 100, y0: 496, w: 240, h: 214 };
export const SPILL_N = 12;

/** The pour's half-width and centre at screen y (its two ledges where it spreads over the plinth's steps). */
function spillAt(y: number, ph: number): [number, number] {
  const cx = 978 + Math.sin(y * 0.03 + 1) * 3 + (y - 524) * 0.1 - smooth(640, 694, y) * 18;
  // the heavy lip over the notch, narrowing down the glass, spreading over each ledge, flaring into the pool
  let hw = 48 - smooth(530, 580, y) * 12;
  hw += smooth(584, 596, y) * 12 + smooth(626, 642, y) * 14 + smooth(656, 694, y) * 46;
  // bulging over each step's lip before it runs on down
  hw += Math.exp(-(((y - 592) / 6) ** 2)) * 8 + Math.exp(-(((y - 636) / 6) ** 2)) * 9;
  hw += Math.sin(y * 0.09 - ph * P2) * 2.2;
  for (let j = 0; j < 4; j++) {
    const u = (j / 4 + ph) % 1;
    const ly = 530 + u * 150;
    hw += Math.exp(-(((y - ly) / 9) ** 2)) * 5 * Math.sin(u * Math.PI);
  }
  return [cx, hw];
}

export function spillFrame(c: Ctx, ph: number, speed = 1): void {
  c.save();
  c.translate(-SPILL.x0, -SPILL.y0);
  const ys: number[] = [];
  for (let y = 524; y <= 694; y += 5) ys.push(y);
  const L = ys.map((y) => spillAt(y, ph));
  const body: PathFn = (g) => {
    g.beginPath();
    // the lip over the glass edge
    g.moveTo(L[0][0] - L[0][1], ys[0] + 4);
    g.bezierCurveTo(L[0][0] - L[0][1] - 6, ys[0] - 12, L[0][0] + L[0][1] + 6, ys[0] - 14, L[0][0] + L[0][1], ys[0] + 2);
    for (let i = 1; i < ys.length; i++) g.lineTo(L[i][0] + L[i][1], ys[i]);
    // its foot, flaring out into the pool
    const [bx, bw] = L[L.length - 1];
    g.bezierCurveTo(bx + bw + 20, ys[ys.length - 1] + 8, bx - bw - 20, ys[ys.length - 1] + 8, bx - bw, ys[ys.length - 1]);
    for (let i = ys.length - 2; i >= 0; i--) g.lineTo(L[i][0] - L[i][1], ys[i]);
    g.closePath();
  };
  // drapes over the teeth either side of the notch, hanging down the outside of the glass
  for (const [dx, dy, len, w] of [[918, 520, 30 + Math.sin(ph * P2) * 3, 6], [1042, 522, 22 + Math.sin(ph * P2 + 2) * 3, 5]] as const) {
    goo(c, dripPath(dx, dy - 4, w, len), { x: dx - 12, y: dy - 6, w: 24, h: len + 10 }, { inkW: 1.6, rimD: 2.5, print: false, seed: Math.round(dx) });
  }
  goo(c, body, { x: 880, y: 500, w: 200, h: 200 }, { sheen: 1.15, inkW: 2.4, rimD: 6, seed: 171 });
  // the sheen sliding down it: a hard specular line down its left third, broken where the lumps roll over
  c.save();
  body(c);
  c.clip();
  c.lineCap = 'round';
  for (let i = 0; i < ys.length - 1; i++) {
    const y = ys[i];
    const [cx, hw] = L[i];
    const [cx2, hw2] = L[i + 1];
    const flow = (y * 0.06 - ph * P2 * 2 * speed) % P2;
    const on = Math.sin(flow) > -0.3;
    if (!on) continue;
    c.strokeStyle = rgba(SHEEN, 0.75 * (0.6 + 0.4 * Math.sin(flow)));
    c.lineWidth = 2.6;
    c.beginPath();
    c.moveTo(cx - hw * 0.5, y);
    c.lineTo(cx2 - hw2 * 0.5, y + 6);
    c.stroke();
  }
  // a broad soft sheen in the middle
  const sg = c.createLinearGradient(940, 0, 1010, 0);
  sg.addColorStop(0, rgba(SHEEN_B, 0));
  sg.addColorStop(0.4, rgba(SHEEN_B, 0.14));
  sg.addColorStop(1, rgba(SHEEN_B, 0));
  c.fillStyle = sg;
  c.fillRect(940, 520, 70, 180);
  c.restore();
  // a broad white-blue sheen down its lit side, and on each bulge at the lips
  c.save();
  body(c);
  c.clip();
  for (const [gy, gr] of [[552, 40], [596, 26], [640, 28]] as const) {
    const [gcx, ghw] = spillAt(gy, ph);
    const bg = c.createRadialGradient(gcx - ghw * 0.35, gy - 4, 0, gcx - ghw * 0.35, gy - 4, gr);
    bg.addColorStop(0, rgba('#c8d4ff', 0.3));
    bg.addColorStop(1, rgba('#8ea2ff', 0));
    c.fillStyle = bg;
    c.fillRect(gcx - ghw - gr, gy - gr, ghw * 2 + gr * 2, gr * 2);
  }
  c.restore();
  // glints on the lumps
  for (let j = 0; j < 4; j++) {
    const u = (j / 4 + ph) % 1;
    const ly = 530 + u * 150;
    const [cx, hw] = spillAt(ly, ph);
    glint(c, cx - hw * 0.35, ly - 3, 5 + 3 * Math.sin(u * Math.PI), 2, -0.3, 0.9 * Math.sin(u * Math.PI));
  }
  glint(c, L[0][0] - 14, ys[0] - 6, 16, 2.6, -0.06, 0.95);
  glint(c, L[0][0] + 26, ys[0] - 4, 6, 1.6, 0.15, 0.6);
  c.restore();
}

function spillStill(ctx: Ctx): void {
  ctx.save();
  ctx.translate(SPILL.x0, SPILL.y0);
  spillFrame(ctx, 0.1);
  ctx.restore();
}

// ——— the drips (x, y where they hang, where they land, size): under the webs, the crown, a hose, the cabinet, a console ———

export const DRIPS: [number, number, number, number][] = [
  [...WEB_DRIP(0), VN.consoles.top + 4, 1],
  [...WEB_DRIP(1), 652, 1],
  [...WEB_DRIP(2), 654, 0.9],
  [T.x - 158, 166, T.step + 6, 1.1],
  [T.x + 78, T.capBot + 120, 466, 0.9],
  [VN.cabinet.x0 + 128, VN.cabinet.foot - 26, 652, 0.8],
  [VN.consoles.x0 + CON_W * 3 + 82, VN.consoles.lip + 96, 652, 0.9],
];

function gooStill(ctx: Ctx): void {
  for (let i = 0; i < TENDRILS.length; i++) tendrilAt(ctx, i, TENDRILS[i].rest);
  for (const [x, y, , s] of DRIPS) goo(ctx, dripPath(x, y - 2, 3.2 * s, 16 * s), { x: x - 8, y: y - 4, w: 16, h: 24 * s }, { inkW: 1.2, rimD: 2, print: false });
}

// ——— the strip lights' light (the still paints it; live, each is a layer laid on with ADD that flickers) ———

const STRIP_LIT_BOX = (i: number): Box => {
  const x0 = Math.max(0, VN.strips[i].x - 580);
  const x1 = Math.min(W, VN.strips[i].x + 580);
  return { x: x0, y: VN.ceil, w: x1 - x0, h: TY - VN.ceil };
};

function stripLight(ctx: Ctx, i: number): void {
  const { x, y } = VN.strips[i];
  const box = STRIP_LIT_BOX(i);
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  // the wall under it: a broad fan of cold light, brightest just below the tube, the fixture's shadow over it
  ctx.save();
  ctx.translate(x, y + 20);
  ctx.scale(1, 0.85);
  const g = ctx.createRadialGradient(0, 0, 20, 0, 60, 560);
  g.addColorStop(0, rgba(COLD, 0.42));
  g.addColorStop(0.22, rgba(COLD, 0.24));
  g.addColorStop(0.6, rgba('#a8c0f0', 0.07));
  g.addColorStop(1, rgba('#a8c0f0', 0));
  ctx.fillStyle = g;
  ctx.fillRect(-600, -40, 1200, 800);
  ctx.restore();
  // the hot band right under the tube
  ctx.save();
  ctx.translate(x, y + 12);
  ctx.scale(1, 0.1);
  const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, STRIP.w * 0.75);
  hg.addColorStop(0, rgba('#f0f8ff', 0.4));
  hg.addColorStop(1, rgba('#f0f8ff', 0));
  ctx.fillStyle = hg;
  ctx.fillRect(-STRIP.w, -STRIP.w, STRIP.w * 2, STRIP.w * 2);
  ctx.restore();
  // the floor's pool and the tube's reflection smeared in the wet epoxy
  lightPool(ctx, x, 690, 420, 46, COLD, 0.14);
  const rg = ctx.createLinearGradient(0, FLOOR, 0, TY);
  rg.addColorStop(0, rgba('#e8f4ff', 0));
  rg.addColorStop(0.3, rgba('#e8f4ff', 0.12));
  rg.addColorStop(1, rgba('#e8f4ff', 0));
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.moveTo(x - 110, FLOOR + 6);
  ctx.lineTo(x + 110, FLOOR + 6);
  ctx.lineTo(x + 150, TY - 6);
  ctx.lineTo(x - 150, TY - 6);
  ctx.closePath();
  ctx.fill();
  // the tops of things facing it catch it: the desks, the cabinet's head, the plates' and the crown's upper edges
  ctx.strokeStyle = rgba(COLD, 0.32);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  if (i === 0) {
    ctx.moveTo(VN.consoles.x0 + 10, VN.consoles.top + 1);
    ctx.lineTo(VN.consoles.x1 - 10, VN.consoles.top + 1);
    ctx.moveTo(VN.consoles.x0 + 6, VN.consoles.riser + 1);
    ctx.lineTo(VN.consoles.x1 - 6, VN.consoles.riser + 1);
    ctx.moveTo(WIN.x - 12, WIN.y - 15);
    ctx.lineTo(WIN.x + WIN.w + 12, WIN.y - 15);
  } else {
    ctx.moveTo(VN.cabinet.x0 + 6, VN.cabinet.top + 1);
    ctx.lineTo(VN.cabinet.x1 - 6, VN.cabinet.top + 1);
    ctx.moveTo(VN.screen.x - 8, VN.screen.y - 9);
    ctx.lineTo(VN.screen.x + VN.screen.w + 8, VN.screen.y - 9);
  }
  ctx.moveTo(i ? T.x : T.x - 170, 141);
  ctx.lineTo(i ? T.x + 170 : T.x, 141);
  ctx.stroke();
  ctx.restore();
}

function stripsStill(ctx: Ctx): void {
  for (let i = 0; i < 2; i++) {
    stripLight(ctx, i);
    tubeLit(ctx, VN.strips[i].x, VN.strips[i].y);
  }
}

// ——— the table: a lab bench of pale grey composite, a black epoxy edge ———

const TBOX: Box = { x: 0, y: TY, w: W, h: 1080 - TY };

function table(ctx: Ctx, r: R): void {
  const zf = VN.front;
  const at = (x: number, y: number) => VP.x + (x - VP.x) * ((y - VP.y) / (zf - VP.y));
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TY, W, zf - TY + 2);
  ctx.clip();
  vfill(ctx, 0, TY, W, zf - TY, [[0, '#4a505e'], [0.35, '#5e6574'], [1, '#6c7382']]);
  surface(ctx, r, { x: 0, y: TY, w: W, h: zf - TY }, '#5e6574', { over: true, vary: 0.3, cells: 4, mottle: 0.25, strokes: 0, grain: 0.2, seed: 181 });
  // the composite's speckle
  for (let i = 0; i < 900; i++) {
    const y = TY + r() * (zf - TY);
    ctx.fillStyle = rgba(r() < 0.5 ? '#e8eef8' : '#1a1e28', 0.08 + r() * 0.1);
    const s = 0.8 + ((y - TY) / (zf - TY)) * 1.2;
    ctx.fillRect(r() * W, y, s, s);
  }
  // the strip lights' sheen in the top, the tank's violet faint between them
  for (const s of VN.strips) {
    ctx.save();
    ctx.translate(s.x, 840);
    ctx.scale(1, 0.16);
    const kg = ctx.createRadialGradient(0, 0, 0, 0, 0, 520);
    kg.addColorStop(0, rgba('#e0ecff', 0.11));
    kg.addColorStop(1, rgba('#e0ecff', 0));
    ctx.fillStyle = kg;
    ctx.fillRect(-540, -540, 1080, 1080);
    ctx.restore();
  }
  lightPool(ctx, T.x, TY + 50, 260, 50, VIOLET, 0.08);
  // the slab's butt joints to the eye
  ctx.strokeStyle = rgba('#1a1e28', 0.45);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (const fx of [320, 1600]) {
    ctx.moveTo(at(fx, TY), TY);
    ctx.lineTo(fx, zf);
  }
  ctx.stroke();
  ctx.strokeStyle = rgba('#e0e8f8', 0.12);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const fx of [320, 1600]) {
    ctx.moveTo(at(fx, TY) + 1.5, TY);
    ctx.lineTo(fx + 2, zf);
  }
  ctx.stroke();
  // old stains: rings where flasks stood, a scorch, a faded wipe
  for (const [sx, sy, rx] of [[460, 860, 26], [1430, 900, 32], [1500, 820, 18]] as const) {
    ctx.strokeStyle = rgba('#3a3448', 0.18);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(sx, sy, rx, rx * 0.3, 0, 0, P2);
    ctx.stroke();
  }
  ctx.fillStyle = rgba('#2a2230', 0.1);
  ctx.beginPath();
  ctx.ellipse(780, 960, 70, 14, 0.05, 0, P2);
  ctx.fill();
  // printed shade: towards the back and the ends, the front edge
  dots(ctx, { x: 0, y: TY, w: W, h: zf - TY }, (x, y) => 0.4 * (1 - smooth(TY, TY + 120, y)) + 0.12 * smooth(zf - 90, zf, y) + 0.14 * (1 - smooth(0, 400, x)) + 0.14 * smooth(1520, W, x) + 0.04, '#141824', { step: 8, angle: 0.79, a: 0.5 });
  ctx.restore();
  // the back edge's shadow, the falloff, the seam
  ctx.fillStyle = rgba('#05060a', 0.4);
  ctx.fillRect(0, TY, W, 8);
  tableFalloff(ctx, zf, 0.28, '#05060a');
  tableSeam(ctx, 0.55, INK, false);
  // the front: a raised drip lip, then the black epoxy edge
  ctx.fillStyle = rgba('#e8f0ff', 0.28);
  ctx.fillRect(0, zf - 6, W, 1.6);
  ctx.fillStyle = rgba('#05060a', 0.4);
  ctx.fillRect(0, zf - 4, W, 3);
  const kf = rectPath(0, zf, W, 1080 - zf);
  flat(ctx, kf, '#16181e', 0, INK);
  within(ctx, kf, () => {
    const g = ctx.createLinearGradient(0, zf, 0, 1080);
    g.addColorStop(0, rgba('#c8d4f0', 0.3));
    g.addColorStop(0.12, rgba('#c8d4f0', 0.04));
    g.addColorStop(1, rgba('#000000', 0.3));
    ctx.fillStyle = g;
    ctx.fillRect(0, zf, W, 1080 - zf);
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = rgba('#c8d4f0', 0.05 + r() * 0.05);
      ctx.fillRect(r() * W, zf + 8 + r() * 28, 20 + r() * 80, 1);
    }
  });
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, zf);
  ctx.lineTo(W, zf);
  ctx.stroke();
}

// ——— on the bench's front corners: the specimen log on a clipboard, a tipped beaker and goggles ———

const TPROPS_BOX: Box = { x: 0, y: 930, w: W, h: 110 };

function tableProps(ctx: Ctx, r: R): void {
  // left: a clipboard, its log sheet, a pen
  const cx = 160;
  const cy = 996;
  groundShadow(ctx, cx + 18, cy + 8, 110, 14, 0.7, '#05060a', 1.3);
  const board: PathFn = (c) => {
    c.beginPath();
    c.moveTo(cx - 96, cy + 22);
    c.lineTo(cx + 92, cy + 18);
    c.lineTo(cx + 74, cy - 34);
    c.lineTo(cx - 80, cy - 30);
    c.closePath();
  };
  flat(ctx, board, '#7a5a3a', 2, INK, 0.5);
  const sheet2: PathFn = (c) => {
    c.beginPath();
    c.moveTo(cx - 84, cy + 16);
    c.lineTo(cx + 80, cy + 13);
    c.lineTo(cx + 66, cy - 30);
    c.lineTo(cx - 70, cy - 27);
    c.closePath();
  };
  flat(ctx, sheet2, '#e8e4d8', 1.4, INK, 0.3);
  ctx.save();
  ctx.translate(cx - 4, cy - 14);
  ctx.transform(1, -0.02, -0.28, 0.32, 0, 0);
  ctx.font = `20px ${BLOCK}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = rgba('#3a2a2a', 0.85);
  ctx.fillText('SPECIMEN LOG', 0, 0);
  ctx.strokeStyle = rgba('#3a3a4a', 0.5);
  ctx.lineWidth = 2;
  for (let k = 1; k <= 3; k++) {
    ctx.beginPath();
    ctx.moveTo(-90, k * 26);
    ctx.lineTo(60 + r() * 30, k * 26);
    ctx.stroke();
  }
  ctx.fillStyle = rgba('#c82a2a', 0.85);
  ctx.fillText('DO NOT FEED', 10, 112);
  ctx.restore();
  flat(ctx, rrPath(cx - 24, cy - 36, 48, 10, 2), '#a8b0c0', 1.6, INK, 0.3);
  ctx.lineCap = 'round';
  groundShadow(ctx, cx + 140, cy + 10, 36, 4, 0.5, '#05060a');
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(cx + 104, cy + 14);
  ctx.lineTo(cx + 170, cy - 6);
  ctx.stroke();
  ctx.strokeStyle = '#2a5ac8';
  ctx.lineWidth = 3.4;
  ctx.stroke();
  // right: a beaker tipped on its side (clean, rolled to the edge) and a pair of goggles
  const bx = 1752;
  const by = 1000;
  groundShadow(ctx, bx + 16, by + 12, 70, 10, 0.6, '#05060a', 1.2);
  const beaker: PathFn = (c) => {
    c.beginPath();
    c.moveTo(bx - 50, by - 22);
    c.lineTo(bx + 30, by - 22);
    c.quadraticCurveTo(bx + 42, by - 22, bx + 44, by - 28);
    c.lineTo(bx + 50, by - 26);
    c.lineTo(bx + 46, by + 12);
    c.lineTo(bx + 30, by + 12);
    c.lineTo(bx - 50, by + 12);
    c.quadraticCurveTo(bx - 60, by - 5, bx - 50, by - 22);
    c.closePath();
  };
  ctx.save();
  beaker(ctx);
  ctx.fillStyle = rgba('#a8d0e8', 0.25);
  ctx.fill();
  ctx.restore();
  ink(ctx, beaker, 2, INK, 0.3);
  ctx.fillStyle = rgba('#ffffff', 0.75);
  ctx.fillRect(bx - 40, by - 16, 64, 2.4);
  ctx.strokeStyle = rgba('#e8f4ff', 0.6);
  ctx.lineWidth = 1;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(bx - 30 + k * 16, by + 8);
    ctx.lineTo(bx - 30 + k * 16, by + 2);
    ctx.stroke();
  }
  const gx = 1640;
  const gy = 1010;
  groundShadow(ctx, gx + 10, gy + 8, 56, 8, 0.6, '#05060a', 1.2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(gx - 50, gy - 2);
  ctx.quadraticCurveTo(gx, gy - 30, gx + 50, gy - 2);
  ctx.stroke();
  ctx.strokeStyle = '#3a3a44';
  ctx.lineWidth = 3;
  ctx.stroke();
  for (const ox of [-22, 22]) {
    const lens = ellPath(gx + ox, gy, 20, 11);
    flat(ctx, lens, rgba('#b8e0f0', 0.4), 3, '#d8c040', 0);
    ink(ctx, lens, 1.4, INK, 0);
    ctx.fillStyle = rgba('#ffffff', 0.7);
    ctx.beginPath();
    ctx.ellipse(gx + ox - 6, gy - 4, 6, 2, -0.3, 0, P2);
    ctx.fill();
  }
}

// ——— finishing ———

function shadeOver(ctx: Ctx): void {
  // the HUD's corners calm, the soffit calmed, the lanes calm, a vignette
  for (const cx of [180, W - 180]) {
    const g = ctx.createRadialGradient(cx, 70, 40, cx, 70, 520);
    g.addColorStop(0, 'rgba(6,6,14,0.4)');
    g.addColorStop(1, 'rgba(6,6,14,0)');
    ctx.save();
    ctx.translate(cx, 70);
    ctx.scale(1, 0.4);
    ctx.translate(-cx, -70);
    ctx.fillStyle = g;
    ctx.fillRect(cx - 600, 0, 1200, 600);
    ctx.restore();
  }
  const cg = ctx.createLinearGradient(0, 0, 0, 150);
  cg.addColorStop(0, 'rgba(6,6,14,0.42)');
  cg.addColorStop(1, 'rgba(6,6,14,0)');
  ctx.fillStyle = cg;
  ctx.fillRect(0, 0, W, 150);
  calmLanes(ctx, 0.14, '#06060e', 150, 640);
  vignetteAll(ctx, 0.6, '#04040c');
}

// ——— the stack ———

export const VENOMNOM: SceneSpec = {
  id: 'venomnom',
  info: {
    name: 'The Symbiote Lab',
    subtitle: 'Mini-boss: VENOMNOM',
    ambient: [],
    glows: [],
    light: '#d0d8f4',
    tableTint: '#eef0f8',
  },
  layers: [
    { id: 'soffit', box: SOFFIT_BOX, draw: soffit },
    { id: 'lintel', box: LINTEL_BOX, draw: lintel },
    { id: 'wall', box: WALL_BOX, draw: wall },
    { id: 'mountL', box: MOUNT_BOX(0), draw: (c, r) => mount(c, r, 0) },
    { id: 'mountR', box: MOUNT_BOX(1), draw: (c, r) => mount(c, r, 1) },
    { id: 'strip0', box: STRIP_BOX(0), draw: (c) => stripFixture(c, 0) },
    { id: 'strip1', box: STRIP_BOX(1), draw: (c) => stripFixture(c, 1) },
    { id: 'window', box: WIN_BOX, draw: obsWindow },
    { id: 'consoles', box: CON_BOX, draw: consoles },
    { id: 'screen', box: SCR_BOX, draw: warnScreen },
    { id: 'cabinet', box: CAB_BOX, draw: cabinet },
    { id: 'rightBay', box: RIGHT_BOX, draw: rightBay },
    { id: 'floor', box: FLOOR_BOX, draw: floorSlab },
    { id: 'shards', box: SHARDS_BOX, draw: shards },
    { id: 'tankBack', box: TANK_BACK_BOX, draw: tankBack },
    { id: 'coreStill', box: { x: CORE.x0, y: CORE.y0, w: CORE.w, h: CORE.h }, stillOnly: true, draw: coreStill },
    { id: 'core', box: { x: CORE.x0, y: CORE.y0, w: CORE.w, h: CORE.h }, motion: 'slot', draw: () => {} },
    { id: 'crown', box: CROWN_BOX, draw: crown },
    { id: 'plinth', box: PLINTH_BOX, draw: plinth },
    { id: 'pool', box: POOL_BOX, draw: pool },
    { id: 'glass', box: GLASS_BOX, motion: 'sprite', draw: glass },
    { id: 'spillStill', box: { x: SPILL.x0, y: SPILL.y0, w: SPILL.w, h: SPILL.h }, stillOnly: true, draw: spillStill },
    { id: 'spill', box: { x: SPILL.x0, y: SPILL.y0, w: SPILL.w, h: SPILL.h }, motion: 'slot', draw: () => {} },
    { id: 'gooStill', stillOnly: true, draw: gooStill },
    { id: 'goo', box: { x: 0, y: 0, w: W, h: TY }, motion: 'slot', draw: () => {} },
    { id: 'stripsStill', stillOnly: true, draw: stripsStill },
    { id: 'stripLit0', box: STRIP_LIT_BOX(0), liveOnly: true, res: 0.5, draw: (c) => stripLight(c, 0) },
    { id: 'stripLit1', box: STRIP_LIT_BOX(1), liveOnly: true, res: 0.5, draw: (c) => stripLight(c, 1) },
    { id: 'table', box: TBOX, draw: table },
    { id: 'tableProps', box: TPROPS_BOX, draw: tableProps },
    { id: 'fx', motion: 'top', draw: () => {} },
  ],
  shade: shadeOver,
};

// ——— live: frame painters ———

const TEN_K = 0.5;
const SPILL_K = 0.6;
const CORE_K = 0.6;
/** The falling drop (3 frames: round beads of goo, lit), the hanging one (a neck swelling to a bead), a splat. */
const BEAD = 16;
const HANG = { w: 24, h: 40 };
const SPLAT = { w: 64, h: 24 };
const SHARD_F = 20;

function beadFrame(c: Ctx, i: number): void {
  const s = BEAD / 2;
  const p = blob(s, s, s * 0.78, s * 0.72, 300 + i, 0.08, 10);
  goo(c, p, { x: 1, y: 1, w: BEAD - 2, h: BEAD - 2 }, { inkW: 1.2, rimD: 1.6, print: false, sheen: 1.1, seed: 300 + i });
  glint(c, s - 2, s - 2.5, 1.8, 1, -0.5, 0.95);
}

function hangFrame(c: Ctx): void {
  goo(c, dripPath(HANG.w / 2, 0, 3.4, HANG.h - 3), { x: 2, y: 0, w: HANG.w - 4, h: HANG.h }, { inkW: 1.3, rimD: 2, print: false, sheen: 1.1, seed: 310 });
  glint(c, HANG.w / 2 - 2.5, HANG.h - 10, 1.6, 2.6, 0, 0.9);
}

function splatFrame(c: Ctx, i: number): void {
  const p = blob(SPLAT.w / 2, SPLAT.h / 2 + 2, SPLAT.w * 0.4, SPLAT.h * 0.3, 320 + i, 0.3, 14);
  goo(c, p, { x: 4, y: 4, w: SPLAT.w - 8, h: SPLAT.h - 6 }, { inkW: 1.2, rimD: 2, print: false, seed: 320 + i });
  glint(c, SPLAT.w / 2 - 6, SPLAT.h / 2 - 1, 5, 1.2, 0, 0.8);
}

function shardFrame(c: Ctx, i: number): void {
  shard(c, SHARD_F / 2, SHARD_F / 2, 7, i * 1.3, 330 + i, 0.8);
}

/** The ticker's strip: the band's red, the message, scanlines (two copies side by side scroll through the band). */
function tickerStrip(c: Ctx, w: number): void {
  c.fillStyle = '#3a0a10';
  c.fillRect(0, 0, w, TICKER.h);
  c.font = `12px ${BLOCK}`;
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.fillStyle = '#ffd8a0';
  c.fillText(TICKER_TEXT, 2, TICKER.h / 2 + 1);
  c.fillStyle = rgba('#000000', 0.22);
  for (let y = 0; y < TICKER.h; y += 3) c.fillRect(0, y, w, 1);
}

// ——— live ———

type Img = Phaser.GameObjects.Image;

registerKitScene(VENOMNOM, (k) => {
  const fx = k.slot('fx');
  const gooC = k.slot('goo');
  const B = Phaser.BlendModes;
  const ev = k.sc.events;
  const cm0 = () => calm();

  // ——— the tendrils: a frame per extension; the live code picks the frame and stretches it to the exact length
  const tenKey = sheet(k, 'vn_tendril', TEN.w * TEN_K, TEN.h * TEN_K, TEN_N * 2, (c, _p, i) => {
    c.scale(TEN_K, TEN_K);
    tendril(c, i >= TEN_N ? 1 : 0, (i % TEN_N) / (TEN_N - 1));
  });
  const tens = TENDRILS.map((t, i) => {
    const img = k.sc.add.image(t.x, t.y, tenKey, 0).setOrigin(8 / TEN.w, 0.5).setRotation(t.a);
    gooC.add(img);
    return { t, i, img, e: t.rest, target: t.rest, wob: new Spring(0, 26, 3.2), shrivel: 0, surge: 0 };
  });
  const showTen = (tn: (typeof tens)[number], t: number) => {
    const e = Phaser.Math.Clamp(tn.e, 0, 1);
    const fi = Math.max(1, Math.ceil(e * (TEN_N - 1) - 1e-6));
    const ef = fi / (TEN_N - 1);
    const stretch = (0.06 + e * 0.94) / (0.06 + ef * 0.94);
    const w = tn.wob.x;
    const thin = 1 - tn.shrivel * 0.42;
    const breathe = 1 + 0.05 * Math.sin(t * 1.4 + tn.i * 1.7);
    tn.img.setFrame(tn.t.v * TEN_N + fi);
    tn.img.setScale((tn.t.s / TEN_K) * stretch * (1 + w * 0.04), (tn.t.s * tn.t.sy / TEN_K) * (tn.t.flip ? -1 : 1) * thin * breathe * (1 - w * 0.06));
    tn.img.setRotation(tn.t.a + w * 0.05 + Math.sin(t * 0.7 + tn.i) * 0.012);
    tn.img.setTint(tn.shrivel > 0.05 ? Phaser.Display.Color.GetColor(255 - tn.shrivel * 70, 255 - tn.shrivel * 70, 255 - tn.shrivel * 40) : 0xffffff);
  };

  // ——— the pour and the heart
  const spillKey = sheet(k, 'vn_spill', SPILL.w * SPILL_K, SPILL.h * SPILL_K, SPILL_N, (c, ph) => {
    c.scale(SPILL_K, SPILL_K);
    spillFrame(c, ph);
  });
  const spillA = k.sc.add.image(SPILL.x0, SPILL.y0, spillKey, 0).setOrigin(0, 0).setScale(1 / SPILL_K);
  const spillB = k.sc.add.image(SPILL.x0, SPILL.y0, spillKey, 1).setOrigin(0, 0).setScale(1 / SPILL_K);
  k.slot('spill').add([spillA, spillB]);
  let spillPh = crand() * SPILL_N;
  const spillSq = new Spring(0, 30, 4);
  const coreKey = sheet(k, 'vn_core', CORE.w * CORE_K, CORE.h * CORE_K, CORE_N, (c, ph) => {
    c.scale(CORE_K, CORE_K);
    coreFrame(c, ph);
  });
  const coreO: [number, number] = [0.5, CORE.base / CORE.h];
  const coreA = k.sc.add.image(T.x, CORE.y0 + CORE.base, coreKey, 0).setOrigin(...coreO);
  const coreB = k.sc.add.image(T.x, CORE.y0 + CORE.base, coreKey, 1).setOrigin(...coreO);
  k.slot('core').add([coreA, coreB]);
  let corePh = 0;
  const coreSq = new Spring(0, 34, 4.5);
  const coreGlow = k.glow(T.x, T.glassBot - 60, 170, 0x8a5cff, 0, { into: fx, sy: 0.7 });
  const show2 = (a: Img, b: Img, ph: number, n: number, alpha = 1) => {
    const i = Math.floor(ph) % n;
    const f = ph - Math.floor(ph);
    a.setFrame(i).setAlpha(alpha);
    b.setFrame((i + 1) % n).setAlpha(alpha * f);
  };
  let flare = 0;
  let surge = 0;

  // ——— the glass that's left: it rattles
  const glassImg = k.sprite('glass');
  const gx0 = glassImg.x;
  const gy0 = glassImg.y;
  const rattle = new Spring(0, 260, 9);

  // ——— the drips: beads swelling on their necks, letting go, falling, splashing
  const hangKey = sheet(k, 'vn_hang', HANG.w, HANG.h, 1, (c) => hangFrame(c));
  const beadKey = sheet(k, 'vn_bead', BEAD, BEAD, 3, (c, _p, i) => beadFrame(c, i));
  const splatKey = sheet(k, 'vn_splat', SPLAT.w, SPLAT.h, 2, (c, _p, i) => splatFrame(c, i));
  const beads = new Parts(k, { frame: 'drop', sheet: { key: beadKey, n: 3, half: BEAD / 2 }, into: gooC, max: 70 });
  const splats: { img: Img; age: number; life: number; s: number }[] = [];
  const splash = (x: number, y: number, s: number) => {
    const img = k.sc.add.image(x, y, splatKey, crand() < 0.5 ? 0 : 1).setScale(0.2 * s, 0.2 * s);
    gooC.add(img);
    splats.push({ img, age: 0, life: 1.6 + crand() * 0.8, s });
    for (let j = 0; j < 3 + Math.round(s * 3); j++) beads.spawn({ x, y: y - 2, vx: (crand() - 0.5) * 160 * s, vy: -60 - crand() * 140 * s, life: 0.5 + crand() * 0.3, r0: 1.4 + crand() * 1.4, a: 1, tint: 0xffffff, grav: 1300, floor: y + 3, streak: 0.012, fade: 0.02 });
  };
  const drips = DRIPS.map(([x, y, land, s], i) => {
    const img = k.sc.add.image(x, y - 2, hangKey, 0).setOrigin(0.5, 0.02);
    gooC.add(img);
    return { x, y, land, s, i, img, m: 0.2 + crand() * 0.6, rate: 0.1 + crand() * 0.12, sp: new Spring(0, 60, 5) };
  });
  const letGo = (d: (typeof drips)[number]) => {
    const len = HANG.h * d.s * (0.45 + d.m * 0.75);
    beads.spawn({ x: d.x, y: d.y + len - 4, vx: 0, vy: 40, life: 3, r0: 3.2 * d.s, a: 1, tint: 0xffffff, grav: 1500, floor: d.land, streak: 0.016, fade: 0.01, onFloor: (fx2, fy) => splash(fx2, fy, d.s) });
    d.m = 0.05;
    d.sp.v -= 6;
  };

  // ——— glass shards skittering across the floor
  const shardKey = sheet(k, 'vn_shard', SHARD_F, SHARD_F, 3, (c, _p, i) => shardFrame(c, i));
  const shardsP = new Parts(k, { frame: 'mote', sheet: { key: shardKey, n: 3, half: SHARD_F / 2 }, into: gooC, max: 60 });
  const skitter = (n: number, p: number, x = T.x) => {
    for (let i = 0; i < n; i++) {
      const sx = Phaser.Math.Clamp(x + (crand() - 0.5) * 560, 660, 1260);
      const sy = 668 + crand() * 72;
      const dir = sx < T.x ? -1 : 1;
      shardsP.spawn({ x: sx, y: sy, vx: dir * (40 + crand() * 220 * p), vy: -60 - crand() * 160 * p, life: 0.7 + crand() * 0.6, r0: 4 + crand() * 4, a: 1, tint: 0xffffff, grav: 1300, drag: 1.4, floor: sy, bounce: 0.35, spin: (crand() - 0.5) * 20, fade: 0.02 });
    }
  };

  // ——— the strip lights: stuttering, lighting the room for real
  const tubeKey = k.tex('vn_tube', 380, 70, (c) => tubeLit(c, 190, 32));
  const lights = VN.strips.map((s, i) => {
    const lit = k.sprite(i ? 'stripLit1' : 'stripLit0').setBlendMode(B.ADD).setAlpha(1);
    const tube = k.img(tubeKey, s.x, s.y + 3, { into: fx });
    return { i, s, lit, tube, level: 1, stutter: 0, next: 1.5 + crand() * (i ? 3 : 6), dead: 0, blaze: 0, flip: 0, on: true };
  });
  const blazeW = k.wash(0xdfe8ff, 0, B.ADD, fx);
  let blazeA = 0;

  // ——— the smashed console: sparks off its torn wires
  const sparks = new Parts(k, { frame: 'spark', add: true, into: fx, max: 80 });
  const sparkGlow = k.glow(SPARK[0], SPARK[1] + 6, 60, 0xbfe0ff, 0, { into: fx });
  let sparkT = 1 + crand() * 2;
  const sparkBurst = (n: number) => {
    sparkGlow.setAlpha(0.55);
    for (let i = 0; i < n; i++) sparks.spawn({ x: SPARK[0] + (crand() - 0.5) * 16, y: SPARK[1] + 26 + crand() * 10, vx: (crand() - 0.5) * 300, vy: -80 - crand() * 220, life: 0.5 + crand() * 0.5, r0: 2.4, r1: 0.8, a: 1, tint: crand() < 0.5 ? 0xd8f0ff : 0xffe8a0, grav: 1000, drag: 0.4, floor: VN.consoles.top + 10 + crand() * 24, bounce: 0.4, streak: 0.02, fade: 0.02 });
  };

  // ——— the mounts' lamps, the warning screen
  const lamps = VN.mounts.map((_, i) => {
    const [lx, ly] = MOUNT_LAMP(i);
    return { dot: k.img('glow', lx, ly, { into: fx, add: true, sx: 0.09, sy: 0.09, tint: 0xff3a4a }), halo: k.glow(lx, ly, 30, 0xff3a4a, 0, { into: fx }), on: false, t: i * 0.4 };
  });
  const setLamp = (i: number, on: boolean) => {
    const l = lamps[i];
    if (!l) return;
    l.on = on;
    const c = on ? 0x6aff9a : 0xff3a4a;
    l.dot.setTint(c);
    l.halo.setTint(c);
  };
  const banner = k.sc.add.rectangle(BANNER.x + BANNER.w / 2, BANNER.y + BANNER.h / 2, BANNER.w, BANNER.h, 0xff4a5a, 1).setBlendMode(B.ADD).setAlpha(0);
  fx.add(banner);
  const scrGlow = k.glow(VN.screen.x + VN.screen.w / 2, VN.screen.y + VN.screen.h / 2, 200, 0xff2a3a, 0, { into: fx, sy: 0.7 });
  const tw = Math.ceil((() => {
    const c = document.createElement('canvas').getContext('2d')!;
    c.font = `12px ${BLOCK}`;
    return c.measureText(TICKER_TEXT).width + 4;
  })());
  const tickKey = k.tex('vn_ticker', tw, TICKER.h, (c) => tickerStrip(c, tw));
  const tickA = k.img(tickKey, TICKER.x, TICKER.y, { into: fx, origin: [0, 0] });
  const tickB = k.img(tickKey, TICKER.x, TICKER.y, { into: fx, origin: [0, 0] });
  let tickO = 0;

  // ——— the goo's moods
  const surgeAll = (amt: number, dur: number) => {
    surge = Math.max(surge, dur);
    for (const tn of tens) {
      tn.surge = Math.max(tn.surge, dur * (0.8 + crand() * 0.4));
      tn.wob.v += (crand() - 0.3) * 10 * amt;
    }
    flare = Math.max(flare, amt);
    coreSq.v += 3 * amt;
    spillSq.v -= 2 * amt;
  };
  const recoil = () => {
    for (const tn of tens) {
      tn.shrivel = 1;
      tn.surge = 0;
      tn.wob.v += 14;
    }
    surge = 0;
    flare = 0;
    coreSq.v -= 9;
    spillSq.v += 7;
  };

  // ——— the fight, heard (src/game/bosses/comics.ts, the venomnom brain)
  const onLash = () => {
    coreSq.v += 4;
    flare = Math.max(flare, 0.5);
    for (const tn of tens) tn.wob.v += (crand() - 0.5) * 8;
  };
  const onBind = () => surgeAll(1, 3.5);
  const onSplit = () => {
    surgeAll(1.4, 5);
    for (const l of lights) l.stutter = Math.max(l.stutter, 0.8 + crand() * 0.6);
  };
  const onPulse = (x?: number) => {
    recoil();
    rattle.v += 900 * (crand() < 0.5 ? -1 : 1);
    blazeA = 0.18;
    for (const l of lights) {
      l.blaze = 1;
      l.dead = 0;
      l.stutter = 0;
    }
    skitter(14, 1, x ?? T.x);
    for (const d of drips) if (d.m > 0.3) letGo(d);
    if (x !== undefined) setLamp(x < T.x ? 0 : 1, false);
  };
  const onEmitter = (i: number, on: boolean) => setLamp(i, on);
  ev.on('venomnom-lash', onLash);
  ev.on('venomnom-bind', onBind);
  ev.on('venomnom-split', onSplit);
  ev.on('venomnom-pulse', onPulse);
  ev.on('venomnom-emitter', onEmitter);
  const unlisten = () => {
    ev.off('venomnom-lash', onLash);
    ev.off('venomnom-bind', onBind);
    ev.off('venomnom-split', onSplit);
    ev.off('venomnom-pulse', onPulse);
    ev.off('venomnom-emitter', onEmitter);
    ev.off(Phaser.Scenes.Events.SHUTDOWN, unlisten);
  };
  ev.once(Phaser.Scenes.Events.SHUTDOWN, unlisten);
  // in a fight the brain drives it; on the stages page the arena runs through the fight's moments by itself
  const inFight = 'miniFoot' in (k.sc as object);
  if (!inFight) {
    setLamp(0, true);
    setLamp(1, true);
  }
  const DEMO: [number, () => void][] = [
    [2, onLash],
    [5, onBind],
    [9, onLash],
    [11, onSplit],
    [17, () => onPulse(VN.mounts[0].x)],
    [26, () => setLamp(0, true)],
    [27, onBind],
    [31, () => onPulse(VN.mounts[1].x)],
    [38, () => setLamp(1, true)],
  ];
  const DEMO_T = 40;
  let demoT = 0;
  let demoI = 0;

  return {
    impact(x, _y, p) {
      // the goo jiggles, every hanging drip lets go, shards skitter, a light buzzes and dies for a moment
      for (const tn of tens) tn.wob.v += (crand() - 0.5) * 16 * p + 4 * p;
      coreSq.v += (crand() - 0.5) * 6 * p - 3 * p;
      spillSq.v += 3 * p;
      for (const d of drips) if (d.m > 0.15 || p > 0.6) letGo(d);
      skitter(Math.round(3 + p * 8), p, x);
      rattle.v += (crand() - 0.5) * 300 * p;
      const l = lights[x < W / 2 ? 0 : 1];
      if (crand() < 0.5 + p * 0.5) l.dead = 0.25 + p * 0.45;
      if (crand() < 0.4 * p) sparkBurst(4 + Math.round(p * 6));
    },
    update(dt, t) {
      const cm = cm0();
      // ——— the demo cycle on the stages page
      if (!inFight) {
        demoT += dt;
        while (demoI < DEMO.length && demoT >= DEMO[demoI][0]) DEMO[demoI++][1]();
        if (demoT >= DEMO_T) {
          demoT = 0;
          demoI = 0;
        }
      }
      // ——— the tendrils: creeping about their rest, straining out on a surge, shrivelling back after a pulse
      surge = Math.max(0, surge - dt);
      flare = Math.max(0, flare - dt * 0.5);
      for (const tn of tens) {
        tn.surge = Math.max(0, tn.surge - dt);
        tn.shrivel = Math.max(0, tn.shrivel - dt * 0.22);
        const creep = tn.t.rest + 0.09 * wander(t * 0.22, tn.i * 2.3) * cm;
        tn.target = tn.shrivel > 0.05 ? 0.04 + (1 - tn.shrivel) * (creep - 0.04) * 0.9 : tn.surge > 0 ? Math.min(1, tn.t.rest + 0.26) : creep;
        const rate = tn.shrivel > 0.8 ? 5 : tn.surge > 0 ? 1.4 : 0.25;
        tn.e += Phaser.Math.Clamp(tn.target - tn.e, -rate * dt, rate * dt);
        tn.wob.step(0, dt);
        showTen(tn, t);
      }
      // ——— the pour: rolling down, faster in a surge, jerking up when it recoils
      const sq = spillSq.step(0, dt);
      spillPh = (spillPh + dt * 7 * cm * (1 + Math.min(1, surge) * 1.2)) % SPILL_N;
      show2(spillA, spillB, spillPh, SPILL_N);
      for (const im of [spillA, spillB]) im.setScale((1 / SPILL_K) * (1 - sq * 0.03), (1 / SPILL_K) * (1 - Phaser.Math.Clamp(sq, -0.3, 0.4) * 0.35));
      // ——— the heart: a slow beat, squashing on its base, flaring when it surges
      const csq = coreSq.step(0, dt);
      corePh = (corePh + dt * 5.5 * cm * (1 + flare * 0.8)) % CORE_N;
      show2(coreA, coreB, corePh, CORE_N);
      const cs = Phaser.Math.Clamp(csq, -0.4, 0.4);
      for (const im of [coreA, coreB]) im.setScale((1 / CORE_K) * (1 - cs * 0.12), (1 / CORE_K) * (1 + cs * 0.22));
      const beat = Math.max(0, Math.cos((corePh / CORE_N) * P2)) ** 4;
      const clench = Math.max(...tens.map((tn) => tn.shrivel));
      coreGlow.setAlpha((0.1 + 0.14 * beat + flare * 0.3) * (1 - clench * 0.7));
      // ——— the glass rattling
      const rx = rattle.step(0, dt);
      glassImg.setPosition(gx0 + Phaser.Math.Clamp(rx, -40, 40) * 0.08, gy0 + Math.abs(rx) * 0.01);
      // ——— the drips
      for (const d of drips) {
        d.m += dt * d.rate * cm * (1 + Math.min(1, surge) * 1.5);
        const wob = d.sp.step(0, dt);
        const len = 0.45 + d.m * 0.75;
        d.img.setScale(d.s * (0.75 + d.m * 0.35) * (1 - wob * 0.04), d.s * len * (1 + wob * 0.06));
        if (d.m >= 1) letGo(d);
      }
      beads.update(dt);
      for (let i = splats.length - 1; i >= 0; i--) {
        const s = splats[i];
        s.age += dt;
        const u = s.age / s.life;
        if (u >= 1) {
          s.img.destroy();
          splats.splice(i, 1);
          continue;
        }
        const spread = 0.35 + 0.65 * (1 - (1 - Math.min(1, u * 4)) ** 3);
        s.img.setScale(spread * s.s * 0.8, spread * s.s * 0.8).setAlpha(1 - u ** 2);
      }
      shardsP.update(dt);
      // ——— the strip lights
      blazeA = Math.max(0, blazeA - dt * 0.25);
      blazeW.setAlpha(blazeA * cm);
      for (const l of lights) {
        l.next -= dt;
        if (l.next <= 0) {
          l.stutter = 0.15 + crand() * (l.i ? 0.7 : 0.4);
          l.next = (l.i ? 1.5 : 3.5) + crand() * (l.i ? 4 : 7);
        }
        l.blaze = Math.max(0, l.blaze - dt * 0.6);
        let lv = 0.97 + 0.03 * Math.sin(t * 47 + l.i * 3);
        if (l.dead > 0) {
          l.dead -= dt;
          lv = 0.04;
          if (l.dead <= 0) l.stutter = 0.3;
        } else if (l.stutter > 0) {
          l.stutter -= dt;
          l.flip -= dt;
          if (l.flip <= 0) {
            l.on = !l.on;
            l.flip = 0.02 + crand() * 0.09;
          }
          lv = l.on ? 0.9 : 0.06;
          if (reducedFlicker()) lv = 0.6;
        }
        l.level = lv + l.blaze * 0.9;
        l.lit.setAlpha(Math.min(1.9, l.level));
        l.tube.setAlpha(Math.min(1, l.level));
      }
      // ——— the sparks
      sparkT -= dt;
      if (sparkT <= 0) {
        sparkT = 0.6 + crand() * 2.6;
        sparkBurst(3 + Math.floor(crand() * 6));
      }
      sparkGlow.setAlpha(Math.max(0, sparkGlow.alpha - dt * 4));
      sparks.update(dt);
      // ——— the lamps, the screen
      for (const l of lamps) {
        const on = l.on ? 0.75 + 0.25 * Math.sin(t * 3) : Math.sin(t * 6 + l.t) > 0 ? 1 : 0.15;
        l.dot.setAlpha(on);
        l.halo.setAlpha(on * 0.35);
      }
      const blink = Math.sin(t * 5.2) > 0 ? 1 : 0;
      banner.setAlpha(blink * 0.32);
      scrGlow.setAlpha(0.04 + blink * 0.06);
      tickO = (tickO + dt * 46 * cm) % tw;
      tickA.setPosition(TICKER.x - tickO, TICKER.y).setCrop(tickO, 0, Math.min(TICKER.w, tw - tickO), TICKER.h);
      const rest = TICKER.w - (tw - tickO);
      tickB.setPosition(TICKER.x - tickO + tw, TICKER.y).setVisible(rest > 0);
      if (rest > 0) tickB.setCrop(0, 0, rest, TICKER.h);
    },
    destroy() {
      unlisten();
      for (const s of splats) s.img.destroy();
    },
  };
});

/** Reduced motion: no hard strobing, the lights just dip. */
function reducedFlicker(): boolean {
  return calm() < 1;
}
