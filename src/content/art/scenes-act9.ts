// Act 9 · Greek myths: The Labyrinth and Tartarus, and the arenas of the Minotaur, Medusa, Cerberus
// and Hades. Marble, laurel and bronze above ground; basalt and soul-fire below it. Each scene has a
// live layer (flames, fog, the Styx, Charon's boat) whose lighting moves across the stage's 5 waves.

import Phaser from 'phaser';
import { crand } from '../../systems/cosmeticRandom';
import type { GlowSpot } from '../../art/backdrops';
import type { BackdropId } from '../../art/backdrops';
import { type SceneDef, registerLegacyScene, registerScene as registerPainted } from '../../art/registry';
import { type LiveFactory, registerLegacyLive, registerLive } from '../../game/liveBackdrop';

/** Moving parts of a backdrop that a painted canvas can't do (flickering flames, drifting fog, a boat on a
 * river), and lighting that changes over the stage's 5 waves. */
interface LiveLayer {
  /** Every frame: dt and the backdrop's running time t, both in seconds. */
  update(dt: number, t: number): void;
  /** The wave within the stage changed (1..5). */
  setWave?(wave: number): void;
  destroy(): void;
}

/** Register a painted scene and its live layer (run by src/game/liveBackdrop.ts). */
function registerScene(id: BackdropId, def: SceneDef & { live(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, wave: number): LiveLayer }, legacy = false): void {
  const factory: LiveFactory = (ctx) => {
    // everything the live layer adds goes when it does (a rebuilt backdrop used to leave a second ferry behind)
    const before = new Set(ctx.layer.list);
    const l = def.live(ctx.sc, ctx.layer, ctx.wave);
    const added = ctx.layer.list.filter((o) => !before.has(o));
    let t = 0;
    return {
      setWave: (w) => l.setWave?.(w),
      update: (dt) => l.update(dt, (t += dt)),
      destroy: () => {
        l.destroy();
        for (const o of added) o.destroy();
      },
    };
  };
  if (legacy) {
    // redrawn with the location kit (src/content/art/scene-*.ts): the old art stays for the before/after page
    registerLegacyScene(id, { info: def.info, draw: def.draw });
    registerLegacyLive(id, factory);
    return;
  }
  registerPainted(id, { info: def.info, draw: def.draw });
  registerLive(id, factory);
}
import {
  type Ctx,
  type R,
  darkSpot,
  H,
  OL,
  SLAB,
  TY,
  VX,
  W,
  ZB,
  blob,
  clipRect,
  contactShadow,
  cylH,
  cylV,
  ellipse,
  fillOl,
  frontFace,
  glow,
  grade,
  laneCalm,
  lgrad,
  mottle,
  outline,
  rgba,
  roundRect,
  shade,
  stars,
  stoneTop,
  tableLight,
  vgrad,
  vignette,
  xAt,
  yAt,
} from '../../art/sceneKit';

const g = (x: number, y: number, r: number, color: string, flicker: number): GlowSpot => ({ x, y, r, color, flicker });

// =============================================================================================
// Shared Greek kit

type Pt = [number, number];

/** A wall plane receding in perspective: u runs along it (0 = near edge, 1 = far edge, perspective-
 * correct), v runs down it (0 = top, 1 = bottom). */
function wallMap(xn: number, ytn: number, ybn: number, xf: number, ytf: number, ybf: number): (u: number, v: number) => Pt {
  const zf = (ybn - ytn) / (ybf - ytf);
  return (u, v) => {
    const t = u / zf / ((1 - u) + u / zf);
    const x = xn + (xf - xn) * t;
    const yt = ytn + (ytf - ytn) * t;
    const yb = ybn + (ybf - ybn) * t;
    return [x, yt + (yb - yt) * v];
  };
}

function polyU(ctx: Ctx, m: (u: number, v: number) => Pt, v: number, u0 = 0, u1 = 1, n = 24): void {
  for (let i = 0; i <= n; i++) {
    const [x, y] = m(u0 + ((u1 - u0) * i) / n, v);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
}

function quadUV(ctx: Ctx, m: (u: number, v: number) => Pt, u0: number, u1: number, v0: number, v1: number): void {
  ctx.beginPath();
  const a = m(u0, v0);
  const b = m(u1, v0);
  const c = m(u1, v1);
  const d = m(u0, v1);
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.lineTo(c[0], c[1]);
  ctx.lineTo(d[0], d[1]);
  ctx.closePath();
}

/** The Greek key (meander) as unit-square polylines, one per repeat: maps into any band. */
const KEY: Pt[] = [
  [0, 1], [0, 0], [0.8, 0], [0.8, 0.8], [0.2, 0.8], [0.2, 0.4], [0.55, 0.4], [0.55, 0.6],
];

/** A stone wall in perspective: courses, staggered joints, weathering, a Greek-key frieze and a cap. */
function perspWall(ctx: Ctx, r: R, m: (u: number, v: number) => Pt, base: string, opts: { courses?: number; frieze?: string; friezeBg?: string; cap?: string; dark?: number } = {}): void {
  const rows = opts.courses ?? 9;
  quadUV(ctx, m, 0, 1, 0, 1);
  ctx.save();
  ctx.clip();
  // the near end is lit, the far end sinks into shadow
  const [nx] = m(0, 0);
  const [fx] = m(1, 0);
  const grd = ctx.createLinearGradient(nx, 0, fx, 0);
  grd.addColorStop(0, shade(base, 0.05));
  grd.addColorStop(1, shade(base, -(opts.dark ?? 0.45)));
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
  mottle(ctx, Math.min(nx, fx) - 10, 0, Math.abs(fx - nx) + 20, TY + 40, 0.28, 1.2);
  // blocks: each course gets its own joints and a slight colour shift
  const top = opts.frieze ? 0.16 : 0.04;
  for (let k = 0; k < rows; k++) {
    const v0 = top + ((1 - top) * k) / rows;
    const v1 = top + ((1 - top) * (k + 1)) / rows;
    let u = -r() * 0.08;
    while (u < 1) {
      const du = 0.07 + r() * 0.09;
      quadUV(ctx, m, u + 0.004, Math.min(1, u + du) - 0.004, v0 + 0.006, v1 - 0.006);
      ctx.fillStyle = rgba(shade(base, (r() - 0.5) * 0.3), 0.35);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.38)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // a lit top edge on each block
      ctx.beginPath();
      polyU(ctx, m, v0 + 0.012, u + 0.008, Math.min(1, u + du) - 0.008, 4);
      ctx.strokeStyle = 'rgba(255,240,210,0.14)';
      ctx.lineWidth = 2;
      ctx.stroke();
      u += du;
    }
  }
  // frieze band with the Greek key
  if (opts.frieze) {
    quadUV(ctx, m, 0, 1, 0.02, 0.14);
    ctx.fillStyle = opts.friezeBg ?? shade(base, -0.25);
    ctx.fill();
    ctx.strokeStyle = opts.frieze;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'miter';
    const reps = 16;
    for (let i = 0; i < reps; i++) {
      ctx.beginPath();
      KEY.forEach(([a, b], j) => {
        const [x, y] = m((i + a) / reps, 0.035 + b * 0.09);
        if (j) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.stroke();
    }
    ctx.beginPath();
    polyU(ctx, m, 0.02);
    polyU(ctx, m, 0.14);
    ctx.strokeStyle = rgba(OL, 0.8);
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // grime at the foot of the wall
  ctx.restore();
  quadUV(ctx, m, 0, 1, 0, 1);
  outline(ctx, 5);
  if (opts.cap) {
    // coping stones along the top edge
    ctx.beginPath();
    polyU(ctx, m, -0.035);
    for (let i = 24; i >= 0; i--) {
      const [x, y] = m(i / 24, 0.01);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    fillOl(ctx, opts.cap, 4);
  }
}

/** A fluted marble column (optionally broken off), standing on a base at `base`. */
function column(ctx: Ctx, r: R, x: number, base: number, top: number, w: number, col = '#e8e0d2', broken = false): void {
  const cap = 0.16 * w;
  // base
  roundRect(ctx, x - w * 0.68, base - w * 0.26, w * 1.36, w * 0.26, 6);
  fillOl(ctx, cylH(ctx, x - w * 0.68, w * 1.36, shade(col, -0.05)), 4);
  roundRect(ctx, x - w * 0.6, base - w * 0.42, w * 1.2, w * 0.18, 6);
  fillOl(ctx, cylH(ctx, x - w * 0.6, w * 1.2, col), 4);
  const shaftTop = broken ? top : top + cap * 2.2;
  const sb = base - w * 0.42;
  ctx.beginPath();
  if (broken) {
    ctx.moveTo(x - w / 2, sb);
    ctx.lineTo(x - w / 2, shaftTop + w * 0.2);
    let px = x - w / 2;
    for (let k = 1; k <= 5; k++) {
      px = x - w / 2 + (w * k) / 5;
      ctx.lineTo(px, shaftTop + (r() * 0.5 - (k === 3 ? 0.4 : 0)) * w * 0.5);
    }
    ctx.lineTo(x + w / 2, sb);
  } else ctx.rect(x - w / 2, shaftTop, w, sb - shaftTop);
  ctx.closePath();
  ctx.fillStyle = cylH(ctx, x - w / 2, w, col);
  ctx.fill();
  ctx.save();
  ctx.clip();
  // flutes
  for (let k = 1; k < 7; k++) {
    const fx = x - w / 2 + (w * k) / 7;
    ctx.fillStyle = rgba(shade(col, -0.45), 0.32);
    ctx.fillRect(fx - w * 0.035, shaftTop, w * 0.07, sb - shaftTop);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(fx + w * 0.03, shaftTop, w * 0.02, sb - shaftTop);
  }
  mottle(ctx, x - w, shaftTop, w * 2, sb - shaftTop, 0.35, 0.6);
  // a hairline crack or two
  ctx.strokeStyle = 'rgba(40,30,20,0.4)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 2; i++) {
    let cx = x + (r() - 0.5) * w * 0.6;
    let cy = shaftTop + r() * (sb - shaftTop) * 0.7;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let k = 0; k < 5; k++) {
      cx += (r() - 0.5) * 16;
      cy += 12 + r() * 18;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  if (broken) {
    ctx.moveTo(x - w / 2, sb);
    ctx.lineTo(x - w / 2, shaftTop + w * 0.2);
  } else ctx.rect(x - w / 2, shaftTop, w, sb - shaftTop);
  outline(ctx, 5);
  if (broken) {
    ctx.beginPath();
    ctx.moveTo(x + w / 2, sb);
    ctx.lineTo(x + w / 2, shaftTop + w * 0.1);
    outline(ctx, 5);
    return;
  }
  // Doric capital: an echinus and an abacus
  ctx.beginPath();
  ctx.moveTo(x - w / 2, shaftTop);
  ctx.quadraticCurveTo(x - w * 0.62, shaftTop - cap, x - w * 0.72, shaftTop - cap * 1.1);
  ctx.lineTo(x + w * 0.72, shaftTop - cap * 1.1);
  ctx.quadraticCurveTo(x + w * 0.62, shaftTop - cap, x + w / 2, shaftTop);
  ctx.closePath();
  fillOl(ctx, cylH(ctx, x - w * 0.72, w * 1.44, col), 4);
  roundRect(ctx, x - w * 0.78, shaftTop - cap * 2.2, w * 1.56, cap * 1.1, 4);
  fillOl(ctx, cylH(ctx, x - w * 0.78, w * 1.56, shade(col, 0.05)), 4);
}

/** A sprig of laurel leaves along a curve from (x0,y0) to (x1,y1). */
function laurel(ctx: Ctx, r: R, x0: number, y0: number, x1: number, y1: number, sag: number, col = '#5f8a3a', n = 14): void {
  const at = (t: number): Pt => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag];
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const [x, y] = at(i / 20);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.strokeStyle = '#4a3a20';
  ctx.lineWidth = 4;
  ctx.stroke();
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const [x, y] = at(t);
    for (const s of [-1, 1]) {
      const a = Math.atan2(y1 - y0, x1 - x0) + s * (0.9 + r() * 0.3);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ellipse(ctx, 14, 0, 15, 6);
      ctx.fillStyle = lgrad(ctx, 0, -6, 0, 6, [
        [0, shade(col, 0.25)],
        [1, shade(col, -0.25)],
      ]);
      ctx.fill();
      ctx.strokeStyle = rgba(OL, 0.85);
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }
  }
}

/** Hanging ivy: clusters of heart leaves tumbling down from y. */
function ivy(ctx: Ctx, r: R, x: number, y: number, len: number, col = '#3f6a2a'): void {
  let cx = x;
  for (let cy = y; cy < y + len; cy += 12 + r() * 10) {
    cx += (r() - 0.5) * 18;
    const s = 7 + r() * 7;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((r() - 0.5) * 1.4);
    ctx.beginPath();
    ctx.moveTo(0, s);
    ctx.bezierCurveTo(-s * 1.4, 0, -s * 0.6, -s * 1.1, 0, -s * 0.4);
    ctx.bezierCurveTo(s * 0.6, -s * 1.1, s * 1.4, 0, 0, s);
    ctx.fillStyle = shade(col, (r() - 0.4) * 0.35);
    ctx.fill();
    ctx.strokeStyle = rgba(OL, 0.7);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

/** A bronze tripod brazier; the fire itself is drawn by the live layer (painted embers only). */
function brazier(ctx: Ctx, x: number, y: number, s: number, bronze = '#b8782e', coal = '#ff7a2a'): void {
  // legs
  ctx.lineCap = 'round';
  for (const dx of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * 18 * s, y - 64 * s);
    ctx.quadraticCurveTo(x + dx * 40 * s, y - 30 * s, x + dx * 44 * s, y);
    ctx.strokeStyle = OL;
    ctx.lineWidth = 14 * s;
    ctx.stroke();
    ctx.strokeStyle = shade(bronze, dx === 0 ? 0.1 : -0.15);
    ctx.lineWidth = 8 * s;
    ctx.stroke();
    ellipse(ctx, x + dx * 44 * s, y, 9 * s, 5 * s);
    fillOl(ctx, shade(bronze, -0.2), 3);
  }
  ctx.lineCap = 'butt';
  // bowl
  ctx.beginPath();
  ctx.moveTo(x - 62 * s, y - 92 * s);
  ctx.quadraticCurveTo(x - 58 * s, y - 52 * s, x, y - 50 * s);
  ctx.quadraticCurveTo(x + 58 * s, y - 52 * s, x + 62 * s, y - 92 * s);
  ctx.closePath();
  fillOl(ctx, cylH(ctx, x - 62 * s, 124 * s, bronze), 5);
  // a band of key pattern on the bowl
  ctx.strokeStyle = rgba('#fff0c0', 0.5);
  ctx.lineWidth = 2.5;
  for (let k = -4; k <= 3; k++) {
    const bx = x + k * 13 * s;
    ctx.beginPath();
    ctx.moveTo(bx, y - 70 * s);
    ctx.lineTo(bx, y - 80 * s);
    ctx.lineTo(bx + 9 * s, y - 80 * s);
    ctx.lineTo(bx + 9 * s, y - 74 * s);
    ctx.stroke();
  }
  ellipse(ctx, x, y - 92 * s, 62 * s, 13 * s);
  fillOl(ctx, shade(bronze, -0.35), 4);
  ellipse(ctx, x, y - 92 * s, 52 * s, 9 * s);
  ctx.fillStyle = coal;
  ctx.fill();
  glow(ctx, x, y - 94 * s, 70 * s, coal, 0.6);
}

/** An amphora with black-figure decoration (a little running foot, of course). */
function amphora(ctx: Ctx, x: number, y: number, s: number, clay = '#c8743a'): void {
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(x - 14 * s, y - 150 * s);
    ctx.lineTo(x - 16 * s, y - 128 * s);
    ctx.bezierCurveTo(x - 70 * s, y - 110 * s, x - 62 * s, y - 30 * s, x - 18 * s, y - 10 * s);
    ctx.lineTo(x - 22 * s, y);
    ctx.lineTo(x + 22 * s, y);
    ctx.lineTo(x + 18 * s, y - 10 * s);
    ctx.bezierCurveTo(x + 62 * s, y - 30 * s, x + 70 * s, y - 110 * s, x + 16 * s, y - 128 * s);
    ctx.lineTo(x + 14 * s, y - 150 * s);
    ctx.closePath();
  };
  // handles
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + d * 14 * s, y - 140 * s);
    ctx.bezierCurveTo(x + d * 60 * s, y - 150 * s, x + d * 58 * s, y - 110 * s, x + d * 40 * s, y - 108 * s);
    ctx.strokeStyle = OL;
    ctx.lineWidth = 12 * s;
    ctx.stroke();
    ctx.strokeStyle = shade(clay, -0.1);
    ctx.lineWidth = 6 * s;
    ctx.stroke();
  }
  body();
  ctx.fillStyle = cylH(ctx, x - 62 * s, 124 * s, clay);
  ctx.fill();
  ctx.save();
  body();
  ctx.clip();
  // black glaze bands and a black-figure panel
  ctx.fillStyle = '#1e140e';
  ctx.fillRect(x - 70 * s, y - 128 * s, 140 * s, 18 * s);
  ctx.fillRect(x - 70 * s, y - 34 * s, 140 * s, 34 * s);
  ctx.fillStyle = '#1e140e';
  ctx.beginPath();
  // a little black foot, seen from below: sole and five toes
  ctx.ellipse(x - 2 * s, y - 60 * s, 13 * s, 21 * s, 0.25, 0, Math.PI * 2);
  ctx.fill();
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    ctx.arc(x - 12 * s + k * 7 * s, y - 88 * s + Math.abs(k - 1) * 2.4 * s, (k === 0 ? 5.5 : 4.2 - k * 0.3) * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#1e140e';
  ctx.lineWidth = 3 * s;
  for (let k = -3; k <= 3; k++) {
    ctx.beginPath();
    ctx.moveTo(x + k * 12 * s, y - 22 * s);
    ctx.lineTo(x + k * 12 * s + 6 * s, y - 28 * s);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(x - 40 * s, y - 120 * s, 8 * s, 90 * s);
  ctx.restore();
  body();
  outline(ctx, 5);
  ellipse(ctx, x, y - 150 * s, 22 * s, 6 * s);
  fillOl(ctx, shade(clay, -0.2), 4);
}

/** A bronze chain hanging (or draped) through points, link by link. */
function chainPath(ctx: Ctx, pts: Pt[], link = 16, col = '#a8742e'): void {
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    const ang = Math.atan2(by - ay, bx - ax);
    for (let d = 0; d < len; d += link * 0.9) {
      const x = ax + Math.cos(ang) * d;
      const y = ay + Math.sin(ang) * d;
      const flat = acc++ % 2 === 0;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ellipse(ctx, 0, 0, link * 0.62, flat ? link * 0.36 : link * 0.14);
      ctx.strokeStyle = OL;
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = flat ? col : shade(col, -0.25);
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.restore();
    }
  }
}

/** A catenary between two points, sampled for chainPath. */
function sagPts(x0: number, y0: number, x1: number, y1: number, sag: number, n = 12): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag]);
  }
  return out;
}

/** A skull (cartoon), facing the viewer. */
function skull(ctx: Ctx, x: number, y: number, s: number, bone = '#e8dcc0'): void {
  ctx.beginPath();
  ctx.moveTo(x - 26 * s, y);
  ctx.bezierCurveTo(x - 34 * s, y - 44 * s, x + 34 * s, y - 44 * s, x + 26 * s, y);
  ctx.lineTo(x + 16 * s, y + 6 * s);
  ctx.lineTo(x + 14 * s, y + 18 * s);
  ctx.lineTo(x - 14 * s, y + 18 * s);
  ctx.lineTo(x - 16 * s, y + 6 * s);
  ctx.closePath();
  const gr = ctx.createRadialGradient(x - 10 * s, y - 20 * s, 2, x, y - 8 * s, 40 * s);
  gr.addColorStop(0, shade(bone, 0.15));
  gr.addColorStop(1, shade(bone, -0.3));
  fillOl(ctx, gr, 4);
  for (const d of [-1, 1]) {
    ellipse(ctx, x + d * 11 * s, y - 8 * s, 8 * s, 9 * s);
    ctx.fillStyle = '#1a1210';
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(x, y + 1 * s);
  ctx.lineTo(x - 4 * s, y + 8 * s);
  ctx.lineTo(x + 4 * s, y + 8 * s);
  ctx.closePath();
  ctx.fillStyle = '#1a1210';
  ctx.fill();
  ctx.strokeStyle = rgba(OL, 0.8);
  ctx.lineWidth = 2;
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath();
    ctx.moveTo(x + k * 5 * s, y + 12 * s);
    ctx.lineTo(x + k * 5 * s, y + 18 * s);
    ctx.stroke();
  }
}

/** A cartoon bone lying at an angle. */
function bone(ctx: Ctx, x: number, y: number, len: number, ang: number, col = '#e8dcc0'): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.rect(-len / 2, -5, len, 10);
  for (const d of [-1, 1]) {
    ctx.moveTo(d * len / 2 + 9, -7);
    ctx.arc(d * len / 2, -7, 9, 0, Math.PI * 2);
    ctx.moveTo(d * len / 2 + 9, 7);
    ctx.arc(d * len / 2, 7, 9, 0, Math.PI * 2);
  }
  fillOl(ctx, cylV(ctx, -12, 24, col), 3.5);
  ctx.restore();
}

/** Marble veins across the table top (in perspective) over a stoneTop. */
function marbleVeins(ctx: Ctx, r: R, front: number, col: string, a: number, n = 9): void {
  ctx.save();
  clipRect(ctx, 0, TY, W, front - TY);
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < n; i++) {
    let X = (r() - 0.5) * 4;
    let z = ZB - r() * 0.2;
    ctx.beginPath();
    ctx.moveTo(xAt(X, z), yAt(z));
    for (let k = 0; k < 14; k++) {
      X += (r() - 0.4) * 0.35;
      z -= 0.09 + r() * 0.08;
      if (z < 1.05) break;
      ctx.lineTo(xAt(X, z), yAt(z));
    }
    ctx.strokeStyle = rgba(col, a * (0.5 + r() * 0.5));
    ctx.lineWidth = 1.5 + r() * 2.5;
    ctx.stroke();
  }
  ctx.restore();
}

/** The table's front face: a stone or metal band with a Greek key running along it. */
function keyFront(ctx: Ctx, front: number, face: string, key: string, rim?: string): void {
  frontFace(ctx, front, () => {
    ctx.fillStyle = lgrad(ctx, 0, front, 0, H, [
      [0, shade(face, 0.05)],
      [1, shade(face, -0.4)],
    ]);
    ctx.fillRect(0, front, W, H - front);
    const y0 = front + 12;
    const hgt = 26;
    ctx.strokeStyle = key;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'miter';
    for (let x = -10; x < W; x += 40) {
      ctx.beginPath();
      KEY.forEach(([a, b], j) => (j ? ctx.lineTo(x + a * 40, y0 + b * hgt) : ctx.moveTo(x + a * 40, y0 + b * hgt)));
      ctx.stroke();
    }
    ctx.fillStyle = rgba(key, 0.6);
    ctx.fillRect(0, y0 - 6, W, 3);
    ctx.fillRect(0, y0 + hgt + 4, W, 3);
  }, 0.4);
  if (rim) {
    // a bronze rim along the table's edge
    ctx.fillStyle = cylV(ctx, front - 6, 12, rim);
    ctx.fillRect(0, front - 6, W, 12);
    ctx.fillStyle = rgba(OL, 0.9);
    ctx.fillRect(0, front + 6, W, 3);
  }
}

/** A stone plinth (top face in perspective-ish, front face). */
function plinth(ctx: Ctx, x: number, y: number, w: number, h: number, col: string): void {
  roundRect(ctx, x - w / 2, y - h, w, h, 6);
  fillOl(ctx, lgrad(ctx, 0, y - h, 0, y, [
    [0, shade(col, 0.12)],
    [1, shade(col, -0.3)],
  ]), 4);
  roundRect(ctx, x - w / 2 - 10, y - h - 14, w + 20, 16, 4);
  fillOl(ctx, shade(col, 0.15), 4);
  roundRect(ctx, x - w / 2 - 8, y - 10, w + 16, 12, 4);
  fillOl(ctx, shade(col, -0.1), 3);
}

// ——— live-layer helpers ———

/** A canvas texture made once per scene (live sprites: flames, fog puffs, the ferry). */
function tex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: Ctx) => void): string {
  if (scene.textures.exists(key)) return key;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  scene.textures.addCanvas(key, c);
  return key;
}

/** A soft teardrop flame sprite (white core, coloured edges) for live fires. */
function flameTex(scene: Phaser.Scene, key: string, outer: string, mid: string, core: string): string {
  return tex(scene, key, 128, 192, (c) => {
    const lobe = (k: number, col: string, a: number) => {
      c.beginPath();
      const w = 56 * k;
      const h = 176 * k;
      c.moveTo(64 - w, 186);
      c.bezierCurveTo(64 - w * 1.1, 186 - h * 0.45, 64 - w * 0.2, 186 - h * 0.7, 64, 186 - h);
      c.bezierCurveTo(64 + w * 0.2, 186 - h * 0.7, 64 + w * 1.1, 186 - h * 0.45, 64 + w, 186);
      c.quadraticCurveTo(64, 196, 64 - w, 186);
      c.closePath();
      const gr = c.createLinearGradient(0, 186, 0, 186 - h);
      gr.addColorStop(0, rgba(col, a));
      gr.addColorStop(1, rgba(col, a * 0.15));
      c.fillStyle = gr;
      c.fill();
    };
    lobe(1, outer, 0.8);
    lobe(0.7, mid, 0.9);
    lobe(0.4, core, 1);
  });
}

interface Fire {
  img: Phaser.GameObjects.Image;
  base: number;
  seed: number;
}

/** Flickering flames on fixed spots (ADD blend), scaled per wave by `level`. */
function fires(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, key: string, spots: { x: number; y: number; s: number }[]): { tick(t: number, level: number): void } {
  const list: Fire[] = spots.map((s, i) => {
    const img = scene.add.image(s.x, s.y, key).setOrigin(0.5, 0.97).setBlendMode(Phaser.BlendModes.ADD).setScale(s.s);
    layer.add(img);
    return { img, base: s.s, seed: i * 1.7 + crand() * 3 };
  });
  return {
    tick(t, level) {
      for (const f of list) {
        const n = Math.sin(t * 9.1 + f.seed) * 0.5 + Math.sin(t * 15.7 + f.seed * 2) * 0.3 + Math.sin(t * 3.3 + f.seed) * 0.2;
        f.img.setScale(f.base * (0.9 + n * 0.08) * (0.75 + 0.25 * level), f.base * (0.95 + n * 0.14) * (0.7 + 0.3 * level));
        f.img.setAlpha(0.65 + 0.35 * level + n * 0.08);
        f.img.rotation = Math.sin(t * 2.3 + f.seed) * 0.06;
      }
    },
  };
}

/** Glow sprites whose brightness follows a function of time. */
function pulse(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, spots: { x: number; y: number; r: number; color: number; sy?: number }[]): Phaser.GameObjects.Image[] {
  return spots.map((s) => {
    const img = scene.add.image(s.x, s.y, 'glow').setTint(s.color).setBlendMode(Phaser.BlendModes.ADD).setScale((s.r * 2) / 256, ((s.r * 2) / 256) * (s.sy ?? 1)).setAlpha(0);
    layer.add(img);
    return img;
  });
}

/** Soft fog puffs drifting sideways in a band, wrapping round. */
function fogDrift(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, y: number, h: number, n: number, color: number, alpha: number, speed: number): { tick(dt: number, a: number): void } {
  const key = tex(scene, 'live9_fog', 256, 128, (c) => {
    const gr = c.createRadialGradient(128, 64, 4, 128, 64, 124);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.35)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.save();
    c.scale(1, 0.5);
    c.fillStyle = gr;
    c.fillRect(0, 0, 256, 256);
    c.restore();
  });
  const puffs = Array.from({ length: n }, () => {
    const img = scene.add.image(crand() * (W + 600) - 300, y + (crand() - 0.5) * h, key).setTint(color).setScale(2.5 + crand() * 2.5, 1.2 + crand()).setAlpha(alpha);
    layer.add(img);
    return { img, v: speed * (0.6 + crand() * 0.8), a: 0.5 + crand() * 0.5 };
  });
  return {
    tick(dt, a) {
      for (const p of puffs) {
        p.img.x += p.v * dt;
        if (p.img.x > W + 400) p.img.x = -400;
        if (p.img.x < -400) p.img.x = W + 400;
        p.img.setAlpha(alpha * p.a * a);
      }
    },
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0 on a stage's first wave, 1 on its boss wave. */
const waveK = (w: number) => Phaser.Math.Clamp((w - 1) / 4, 0, 1);

// =============================================================================================
// The Labyrinth: inside the maze at dusk; night falls and the braziers take over across the stage.

const LB = {
  far: { x0: 700, x1: 1220, top: 300, bot: 520 },
  left: { xn: -40, ytn: 40, ybn: TY, xf: 700, ytf: 300, ybf: 520 },
  right: { xn: W + 40, ytn: 40, ybn: TY, xf: 1220, ytf: 300, ybf: 520 },
  braziers: [
    { x: 300, y: 690, s: 1.05 },
    { x: 1620, y: 690, s: 1.05 },
    { x: 610, y: 540, s: 0.55 },
    { x: 1310, y: 540, s: 0.55 },
  ],
  door: { x: 1080, w: 110 },
  front: 1040,
};

function drawLabyrinth(ctx: Ctx, r: R): void {
  const { far, left, right } = LB;
  // dusk sky over the maze, with more walls receding beyond the far wall
  vgrad(ctx, 0, 0, W, far.top + 40, [
    [0, '#34305e'],
    [0.3, '#7a4a72'],
    [0.62, '#e07a5e'],
    [1, '#ffc488'],
  ]);
  glow(ctx, 760, 300, 700, '#ffb070', 0.35, 0.35);
  stars(ctx, r, 0, 0, W, 140, 50, 0.5);
  glow(ctx, 1500, 60, 40, '#fff4d8', 0.6);
  ellipse(ctx, 1500, 60, 20, 20);
  ctx.fillStyle = '#fff2d0';
  ctx.fill();
  ellipse(ctx, 1509, 54, 17, 17);
  ctx.fillStyle = '#5a3a6a';
  ctx.fill();
  // distant maze walls: tiers of wall tops in atmospheric haze
  for (const [y, col, h] of [
    [196, '#9a6a78', 26],
    [228, '#80525e', 30],
    [262, '#683e4a', 36],
  ] as [number, string, number][]) {
    for (let x = -60; x < W + 60; ) {
      const w = 140 + r() * 280;
      if (r() < 0.85) {
        ctx.beginPath();
        ctx.rect(x, y, w, h + 80);
        fillOl(ctx, lgrad(ctx, 0, y, 0, y + h + 40, [
          [0, shade(col, 0.12)],
          [1, shade(col, -0.25)],
        ]), 3);
        // coping catching the last of the sun, and a joint or two
        ctx.fillStyle = rgba('#ffd8a8', 0.45);
        ctx.fillRect(x + 3, y + 2, w - 6, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        for (let jx = x + 30 + r() * 40; jx < x + w - 10; jx += 50 + r() * 40) ctx.fillRect(jx, y + 8, 2, h);
        if (r() < 0.45) ivy(ctx, r, x + r() * w, y + 4, 16 + r() * 24, '#4a5a3a');
      }
      x += w + 24 + r() * 90;
    }
    // haze between the tiers
    vgrad(ctx, 0, y - 10, W, h + 20, [
      [0, 'rgba(255,170,130,0)'],
      [1, 'rgba(255,170,130,0.12)'],
    ]);
  }
  // far wall of the corridor, with a turning to the right glowing with torchlight
  const fm = wallMap(far.x0, far.top, far.bot, far.x1, far.top, far.bot);
  perspWall(ctx, r, fm, '#b89a78', { courses: 5, frieze: '#e8d3a0', friezeBg: '#7a3a2a', cap: '#c8ad88', dark: 0.05 });
  const d = LB.door;
  ctx.beginPath();
  ctx.rect(d.x - d.w / 2, far.top + 60, d.w, far.bot - far.top - 60);
  ctx.fillStyle = lgrad(ctx, d.x - d.w / 2, 0, d.x + d.w / 2, 0, [
    [0, '#140c10'],
    [1, '#4a2a1a'],
  ]);
  ctx.fill();
  outline(ctx, 4);
  glow(ctx, d.x + 40, far.bot - 60, 120, '#ff9a3a', 0.5);
  // side walls receding to the far wall
  perspWall(ctx, r, wallMap(left.xn, left.ytn, left.ybn, left.xf, left.ytf, left.ybf), '#c4a682', { frieze: '#f0dca8', friezeBg: '#8a3a2a', cap: '#d8bc94' });
  perspWall(ctx, r, wallMap(right.xn, right.ytn, right.ybn, right.xf, right.ytf, right.ybf), '#bc9e7a', { frieze: '#f0dca8', friezeBg: '#8a3a2a', cap: '#d0b48c' });
  // ivy spilling over the wall tops and laurel garlands
  const lm = wallMap(left.xn, left.ytn, left.ybn, left.xf, left.ytf, left.ybf);
  const rm = wallMap(right.xn, right.ytn, right.ybn, right.xf, right.ytf, right.ybf);
  for (const [m, us] of [
    [lm, [0.08, 0.22, 0.47, 0.7, 0.86]],
    [rm, [0.12, 0.3, 0.55, 0.78]],
  ] as [(u: number, v: number) => Pt, number[]][]) {
    for (const u of us) {
      const [x, y] = m(u, 0.02);
      const [, yb] = m(u, 1);
      ivy(ctx, r, x, y, (yb - y) * (0.25 + r() * 0.35), '#4a7a32');
    }
  }
  const [lx0, ly0] = lm(0.33, 0.2);
  const [lx1, ly1] = lm(0.6, 0.22);
  laurel(ctx, r, lx0, ly0, lx1, ly1, 40, '#5f8a3a', 9);
  const [rx0, ry0] = rm(0.33, 0.2);
  const [rx1, ry1] = rm(0.6, 0.22);
  laurel(ctx, r, rx0, ry0, rx1, ry1, 40, '#5f8a3a', 9);
  // corridor floor: worn flagstones converging on the far wall
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(left.xf, left.ybf);
  ctx.lineTo(right.xf, right.ybf);
  ctx.lineTo(right.xn - 40, TY);
  ctx.lineTo(left.xn + 40, TY);
  ctx.closePath();
  ctx.fillStyle = lgrad(ctx, 0, 520, 0, TY, [
    [0, '#6a4a3a'],
    [1, '#a88a68'],
  ]);
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = 'rgba(40,24,16,0.4)';
  ctx.lineWidth = 2.5;
  for (let k = 1; k < 7; k++) {
    const t = Math.pow(k / 7, 1.6);
    const y = 520 + (TY - 520) * t;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let X = -6; X <= 6; X++) {
    ctx.beginPath();
    ctx.moveTo(VX + X * 46, 520);
    ctx.lineTo(VX + X * 46 * ((TY - 300) / (520 - 300)), TY);
    ctx.stroke();
  }
  mottle(ctx, 0, 520, W, TY - 520, 0.18, 1);
  // Ariadne's red thread snaking down the corridor
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const y = 520 + (TY - 520) * t * t;
    const x = 1040 - t * 200 + Math.sin(t * 9) * (20 + t * 80);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.strokeStyle = OL;
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.strokeStyle = '#e8302a';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,200,180,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  // a dark stripe where the walls meet the floor
  for (const m of [lm, rm]) {
    ctx.beginPath();
    polyU(ctx, m, 0.98);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 16;
    ctx.stroke();
  }
  // braziers along the walls; amphorae and fallen stones at their feet
  for (const b of LB.braziers) brazier(ctx, b.x, b.y, b.s);
  amphora(ctx, 150, 740, 0.9, '#c8743a');
  amphora(ctx, 1790, 745, 0.95, '#b8683a');
  amphora(ctx, 1700, 740, 0.62, '#d08040');
  // a fallen wall block and rubble
  for (const [x, y, w] of [[470, 742, 80], [1460, 744, 64]] as [number, number, number][]) {
    roundRect(ctx, x - w / 2, y - w * 0.55, w, w * 0.55, 6);
    fillOl(ctx, lgrad(ctx, 0, y - w * 0.55, 0, y, [
      [0, '#cdb08a'],
      [1, '#8a6e52'],
    ]), 4);
    ctx.fillStyle = 'rgba(255,240,210,0.3)';
    ctx.fillRect(x - w / 2 + 6, y - w * 0.55 + 5, w - 12, 4);
    for (let k = 0; k < 4; k++) {
      blob(ctx, x + w * 0.6 + k * 16, y - 6 + (k % 2) * 4, 7 + r() * 5, 0.3, r, 6);
      fillOl(ctx, '#a88a6a', 3);
    }
  }
  // marble columns framing the corridor in the foreground
  column(ctx, r, 40, TY + 6, 120, 92, '#e4dccc');
  column(ctx, r, W - 40, TY + 6, 120, 92, '#ddd4c2');
  laurel(ctx, r, -10, 150, 120, 230, 30, '#5f8a3a', 7);
  laurel(ctx, r, W + 10, 150, W - 120, 230, 30, '#5f8a3a', 7);
  laneCalm(ctx, 0.2, 60, 600, '#0a0610');
  // marble slab table
  stoneTop(ctx, r, LB.front, '#d8cfc0', 0.35);
  marbleVeins(ctx, r, LB.front, '#8a7a90', 0.45, 10);
  keyFront(ctx, LB.front, '#c8bcaa', '#7a3a2a');
  contactShadow(ctx, 0.55);
  tableLight(ctx, '#ffc890', 0.06, 0.5);
  grade(ctx, 0.08, '#ffd8b0', 0.12);
  vignette(ctx, 0.7, '#0a0610', 0.55);
}

function liveLabyrinth(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, wave: number): LiveLayer {
  // night falls over the maze: a deepening blue over everything, stars, and the braziers taking over
  const night = scene.add.rectangle(W / 2, H / 2, W, H, 0x1a1a48).setBlendMode(Phaser.BlendModes.MULTIPLY);
  layer.add(night);
  const starKey = tex(scene, 'live9_stars', 1920, 260, (c) => {
    // only where the sky shows: above the side walls' top edges and the distant maze
    const { left, right } = LB;
    const skyTop = (x: number) => Math.min(190, x < left.xf ? left.ytn + ((x - left.xn) * (left.ytf - left.ytn)) / (left.xf - left.xn) : x > right.xf ? right.ytn + ((x - right.xn) * (right.ytf - right.ytn)) / (right.xf - right.xn) : 190) - 14;
    for (let i = 0; i < 260; i++) {
      const x = crand() * 1920;
      const y = crand() * 220;
      if (y > skyTop(x)) continue;
      c.fillStyle = `rgba(255,250,230,${0.3 + crand() * 0.7})`;
      const s = crand() < 0.1 ? 3 : 1.6;
      c.fillRect(x, y, s, s);
    }
  });
  const sky = scene.add.image(W / 2, 130, starKey).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  layer.add(sky);
  const halos = pulse(scene, layer, LB.braziers.map((b) => ({ x: b.x, y: b.y - 110 * b.s, r: 260 * b.s, color: 0xff8a2a })));
  const fl = fires(scene, layer, flameTex(scene, 'live9_flame', '#ff5a1a', '#ffa83a', '#fff2b0'), LB.braziers.map((b) => ({ x: b.x, y: b.y - 92 * b.s, s: 0.95 * b.s })));
  const doorGlow = pulse(scene, layer, [{ x: LB.door.x + 30, y: 470, r: 140, color: 0xff9a3a }])[0];
  const mist = fogDrift(scene, layer, 690, 60, 9, 0xb8a8d8, 0.12, 14);
  let k = waveK(wave);
  let shown = k;
  return {
    setWave: (w) => (k = waveK(w)),
    update(dt, t) {
      shown += (k - shown) * Math.min(1, dt * 0.8);
      night.setAlpha(lerp(0.05, 0.52, shown));
      sky.setAlpha(lerp(0, 0.9, shown) * (0.9 + Math.sin(t * 1.3) * 0.1));
      const lvl = lerp(0.55, 1, shown);
      fl.tick(t, lvl);
      halos.forEach((h, i) => h.setAlpha((0.25 + 0.4 * shown) * (0.85 + Math.sin(t * 8 + i * 2) * 0.1 + Math.sin(t * 13 + i) * 0.05)));
      doorGlow.setAlpha((0.2 + 0.3 * shown) * (0.8 + Math.sin(t * 5) * 0.2));
      mist.tick(dt, 0.6 + shown * 0.6);
    },
    destroy() {},
  };
}

registerScene('labyrinth', {
  info: {
    name: 'The Labyrinth',
    subtitle: 'Waves 81–84',
    ambient: ['dust', 'embers'],
    glows: [g(LB.door.x + 30, 470, 140, '#ff9a3a', 0.3), g(960, 200, 500, '#ffb070', 0.05)],
    light: '#ffc8a0',
    tableTint: '#fff0e0',
  },
  draw: drawLabyrinth,
  live: liveLabyrinth,
});

// =============================================================================================
// Tartarus: a basalt cavern over the river Styx. The pit below glows redder with every wave. (The old art: Tartarus
// is redrawn with the location kit in scene-tartarus.ts; this stays for the before/after page, ?dev&stages.)

const TT = {
  river: { y0: 520, y1: 600 },
  pit: { x: 960, y: 380 },
  boat: { y: 548 },
  /** The top of the jetty's deck (the ferry passes behind it). */
  jetty: 586,
  braziers: [
    { x: 250, y: 700, s: 1 },
    { x: 1670, y: 700, s: 1 },
  ],
  pillars: [
    { x: 470, top: 230, w: 76 },
    { x: 1450, top: 260, w: 72 },
  ],
  front: 1040,
};

/** Jagged basalt rock mass with columnar joints and a cold rim light. */
function basalt(ctx: Ctx, r: R, pts: Pt[], base: string, rim = '#5a7aa8'): void {
  const path = () => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  path();
  ctx.fillStyle = lgrad(ctx, 0, y0, 0, y1, [
    [0, shade(base, 0.12)],
    [1, shade(base, -0.35)],
  ]);
  ctx.fill();
  ctx.save();
  ctx.clip();
  // columnar joints: irregular, broken into stacked lengths
  for (let x = x0 + r() * 40; x < x1; x += 46 + r() * 60) {
    let y = y0;
    while (y < y1) {
      const len = 60 + r() * 140;
      const dx = (r() - 0.5) * 8;
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(x + dx, y, 3, len);
      ctx.fillStyle = rgba(rim, 0.1);
      ctx.fillRect(x + dx + 3, y, 2, len);
      y += len + 6 + r() * 30;
    }
  }
  mottle(ctx, x0, y0, x1 - x0, y1 - y0, 0.35, 0.8);
  ctx.restore();
  path();
  outline(ctx, 5);
}

/** Pale asphodel flowers on a stalk. */
function asphodel(ctx: Ctx, r: R, x: number, y: number, h: number): void {
  ctx.strokeStyle = '#4a6a4a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + (r() - 0.5) * 16, y - h / 2, x + (r() - 0.5) * 10, y - h);
  ctx.stroke();
  for (let k = 0; k < 5; k++) {
    const fx = x + (r() - 0.5) * 18;
    const fy = y - h + k * 9 + (r() - 0.5) * 6;
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      ellipse(ctx, fx + Math.cos(a) * 4, fy + Math.sin(a) * 4, 4, 2.4, a);
      ctx.fillStyle = '#f0ecd8';
      ctx.fill();
    }
    ellipse(ctx, fx, fy, 2, 2);
    ctx.fillStyle = '#e8b84a';
    ctx.fill();
  }
  glow(ctx, x, y - h + 18, 26, '#e8f0ff', 0.12);
}

function drawTartarus(ctx: Ctx, r: R): void {
  // the cavern's far depths: a red pit glow behind layers of rock
  vgrad(ctx, 0, 0, W, TY, [
    [0, '#07060c'],
    [0.4, '#160c18'],
    [0.75, '#3a1018'],
    [1, '#1a0c10'],
  ]);
  glow(ctx, TT.pit.x, TT.pit.y + 120, 620, '#ff3a1a', 0.45, 0.6);
  glow(ctx, TT.pit.x, TT.pit.y + 150, 260, '#ffb050', 0.4, 0.5);
  // distant rock spires silhouetted against the pit's glow
  for (let i = 0; i < 9; i++) {
    const x = 560 + i * 100 + (r() - 0.5) * 50;
    const h = 60 + r() * 120;
    ctx.beginPath();
    ctx.moveTo(x - 50, 500);
    ctx.lineTo(x - 12, 500 - h);
    ctx.lineTo(x + 8, 500 - h - 14);
    ctx.lineTo(x + 46, 500);
    ctx.closePath();
    ctx.fillStyle = rgba('#3a1420', 0.9);
    ctx.fill();
  }
  // far cavern walls (bluish, hazy)
  basalt(ctx, r, [[-20, 0], [520, 0], [600, 120], [660, 300], [720, 470], [-20, 520]], '#1e1c2c', '#7a5aa8');
  basalt(ctx, r, [[W + 20, 0], [1380, 0], [1310, 140], [1250, 320], [1200, 470], [W + 20, 520]], '#1c1a2a', '#7a5aa8');
  // stalactites (kept short: the boss bar lives up here)
  for (let i = 0; i < 18; i++) {
    const x = 520 + r() * 880;
    const len = 30 + r() * 70;
    const w = 16 + r() * 26;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, -4);
    ctx.lineTo(x + (r() - 0.5) * 6, len);
    ctx.lineTo(x + w / 2, -4);
    ctx.closePath();
    fillOl(ctx, lgrad(ctx, 0, 0, 0, len, [
      [0, '#16121e'],
      [1, '#3a2632'],
    ]), 3);
  }
  // nearer rock shelves either side
  basalt(ctx, r, [[-20, 260], [180, 230], [300, 300], [380, 420], [420, 560], [-20, 600]], '#252030', '#6a7ab8');
  basalt(ctx, r, [[W + 20, 240], [1720, 220], [1600, 310], [1540, 430], [1500, 560], [W + 20, 600]], '#232030', '#6a7ab8');
  // the far bank: a ruined temple of the dead against the red glow
  ctx.beginPath();
  ctx.moveTo(-20, 540);
  for (let x = -20; x <= W + 20; x += 60) ctx.lineTo(x, 506 + Math.sin(x * 0.013) * 10 + r() * 10);
  ctx.lineTo(W + 20, 560);
  ctx.lineTo(-20, 560);
  ctx.closePath();
  ctx.fillStyle = '#120c14';
  ctx.fill();
  outline(ctx, 3, rgba('#ff6a3a', 0.35));
  const tx = 780;
  ctx.fillStyle = '#1a1018';
  ctx.strokeStyle = rgba('#ff7a4a', 0.4);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tx - 130, 430);
  ctx.lineTo(tx, 384);
  ctx.lineTo(tx + 110, 422);
  ctx.lineTo(tx + 80, 432);
  ctx.lineTo(tx - 130, 440);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(tx - 140, 440, 260, 14);
  ctx.strokeRect(tx - 140, 440, 260, 14);
  for (let k = 0; k < 6; k++) {
    const cx = tx - 120 + k * 46;
    const top = k === 4 ? 470 : 454;
    ctx.fillRect(cx, top, 18, 512 - top);
    ctx.strokeRect(cx, top, 18, 512 - top);
  }
  glow(ctx, tx, 470, 120, '#ff5a2a', 0.2);
  // the river Styx: a band of cold green-blue light across the cavern
  const { y0, y1 } = TT.river;
  ctx.beginPath();
  ctx.moveTo(-20, y0 + 10);
  ctx.bezierCurveTo(600, y0 - 20, 1300, y0 + 30, W + 20, y0);
  ctx.lineTo(W + 20, y1 + 20);
  ctx.bezierCurveTo(1300, y1 + 40, 600, y1 - 10, -20, y1 + 30);
  ctx.closePath();
  ctx.fillStyle = lgrad(ctx, 0, y0, 0, y1 + 30, [
    [0, '#1e6a6e'],
    [0.45, '#0e4250'],
    [1, '#06202c'],
  ]);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(160,255,240,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 40; i++) {
    const x = r() * W;
    const y = y0 + 10 + r() * (y1 - y0);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 20, y - 4, x + 40 + r() * 40, y);
    ctx.stroke();
  }
  // faces of lost souls under the surface
  for (let i = 0; i < 7; i++) {
    const x = 120 + r() * 1680;
    const y = y0 + 25 + r() * 40;
    ellipse(ctx, x, y, 12, 16);
    ctx.fillStyle = 'rgba(190,255,240,0.16)';
    ctx.fill();
    for (const d of [-1, 1]) {
      ellipse(ctx, x + d * 4, y - 3, 2.5, 3.5);
      ctx.fillStyle = 'rgba(0,30,30,0.5)';
      ctx.fill();
    }
  }
  ctx.restore();
  glow(ctx, VX, (y0 + y1) / 2, 900, '#3affd0', 0.12, 0.12);
  // the near bank: black rock and ash, with asphodel meadows
  ctx.beginPath();
  ctx.moveTo(-20, y1 + 30);
  ctx.bezierCurveTo(600, y1 - 10, 1300, y1 + 40, W + 20, y1 + 20);
  ctx.lineTo(W + 20, TY);
  ctx.lineTo(-20, TY);
  ctx.closePath();
  ctx.fillStyle = lgrad(ctx, 0, y1, 0, TY, [
    [0, '#1a1620'],
    [1, '#2e2632'],
  ]);
  ctx.fill();
  mottle(ctx, 0, y1, W, TY - y1, 0.45, 0.8);
  // a worn flagstone path from the jetty down to the table
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(VX - 120, 600);
  ctx.lineTo(VX + 120, 600);
  ctx.lineTo(VX + 300, TY);
  ctx.lineTo(VX - 300, TY);
  ctx.closePath();
  ctx.fillStyle = '#3a3240';
  ctx.fill();
  ctx.clip();
  for (let y = 600, k = 0; y < TY; k++) {
    const hgt = 22 + k * 8;
    for (let x = VX - 320 + (k % 2) * 40; x < VX + 320; x += 80) {
      roundRect(ctx, x + 3, y + 3, 74, hgt - 5, 6);
      ctx.fillStyle = shade('#4a4252', (r() - 0.5) * 0.25);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    y += hgt;
  }
  ctx.restore();
  // the jetty where the ferry lands
  ctx.beginPath();
  ctx.rect(VX - 110, 586, 220, 16);
  fillOl(ctx, cylV(ctx, 586, 16, '#4a3626'), 3);
  for (const dx of [-100, -30, 40, 100]) {
    ctx.beginPath();
    ctx.rect(VX + dx - 6, 570, 12, 40);
    fillOl(ctx, cylH(ctx, VX + dx - 6, 12, '#3a2a1e'), 3);
  }
  // black rock boulders on the bank
  for (const [x, y, rr] of [[120, 650, 70], [1800, 660, 80], [560, 640, 40], [1380, 650, 46]] as [number, number, number][]) {
    blob(ctx, x, y, rr, 0.3, r, 9);
    fillOl(ctx, lgrad(ctx, 0, y - rr, 0, y + rr, [
      [0, '#3e3848'],
      [1, '#16121c'],
    ]), 4);
    ctx.fillStyle = 'rgba(140,170,255,0.18)';
    ctx.fillRect(x - rr * 0.5, y - rr * 0.7, rr * 0.6, 3);
  }
  // broken columns bound in bronze chains
  for (const p of TT.pillars) {
    column(ctx, r, p.x, 700, p.top, p.w, '#5a5468', true);
    chainPath(ctx, sagPts(p.x - p.w / 2, p.top + 120, p.x + p.w / 2, p.top + 160, 14, 6), 15, '#b8843a');
    chainPath(ctx, sagPts(p.x - p.w / 2, p.top + 230, p.x + p.w / 2, p.top + 260, 12, 6), 15, '#b8843a');
    chainPath(ctx, sagPts(p.x + p.w / 2, p.top + 160, p.x + p.w + 70, 700, 20, 10), 15, '#a8742e');
  }
  for (let i = 0; i < 22; i++) {
    const x = r() * W;
    if (Math.abs(x - VX) < 260) continue;
    asphodel(ctx, r, x, 700 + r() * 50, 40 + r() * 40);
  }
  for (const b of TT.braziers) brazier(ctx, b.x, b.y, b.s, '#8a6a3a', '#4fb8ff');
  // skulls and bones in the ash
  skull(ctx, 640, 740, 0.9);
  bone(ctx, 700, 748, 60, 0.3);
  bone(ctx, 1260, 744, 50, -0.5);
  skull(ctx, 1320, 736, 0.7, '#d8ccb0');
  laneCalm(ctx, 0.25, 60, 560, '#05030a');
  // obsidian slab with a bronze rim
  stoneTop(ctx, r, TT.front, '#3a3444', 0.5);
  marbleVeins(ctx, r, TT.front, '#ff7a4a', 0.25, 7);
  marbleVeins(ctx, r, TT.front, '#8ab8ff', 0.18, 6);
  keyFront(ctx, TT.front, '#2a2430', '#c8903a', '#b8843a');
  contactShadow(ctx, 0.6);
  glow(ctx, TT.pit.x, 900, 800, '#ff5a2a', 0.06, 0.3);
  tableLight(ctx, '#9ab8ff', 0.05, 0.55);
  grade(ctx, 0.1, '#b8a8d8', 0.15);
  vignette(ctx, 0.85, '#040208', 0.65);
}

/** Charon's ferry: a low black boat, a hooded ferryman with a pole and a green lantern. */
function ferryTex(scene: Phaser.Scene): string {
  return tex(scene, 'live9_ferry', 300, 220, (c) => {
    c.lineJoin = 'round';
    c.strokeStyle = OL;
    c.lineWidth = 5;
    // pole
    c.beginPath();
    c.moveTo(118, 30);
    c.lineTo(196, 196);
    c.lineWidth = 7;
    c.stroke();
    c.strokeStyle = '#6a4a2a';
    c.lineWidth = 3.5;
    c.stroke();
    c.strokeStyle = OL;
    c.lineWidth = 5;
    // ferryman
    c.beginPath();
    c.moveTo(130, 160);
    c.lineTo(140, 80);
    c.quadraticCurveTo(152, 56, 166, 80);
    c.lineTo(178, 160);
    c.closePath();
    c.fillStyle = '#2a2236';
    c.fill();
    c.stroke();
    c.beginPath();
    c.ellipse(153, 86, 7, 9, 0, 0, Math.PI * 2);
    c.fillStyle = '#05040a';
    c.fill();
    c.fillStyle = '#7affd8';
    c.fillRect(148, 84, 3, 2);
    c.fillRect(155, 84, 3, 2);
    // hull
    c.beginPath();
    c.moveTo(20, 140);
    c.quadraticCurveTo(150, 200, 284, 130);
    c.lineTo(254, 168);
    c.quadraticCurveTo(150, 200, 42, 172);
    c.closePath();
    c.fillStyle = '#1c1624';
    c.fill();
    c.stroke();
    c.fillStyle = 'rgba(120,255,220,0.3)';
    c.fillRect(60, 162, 170, 3);
    // lantern on a hook at the prow
    c.beginPath();
    c.moveTo(266, 136);
    c.lineTo(266, 94);
    c.lineTo(244, 94);
    c.lineWidth = 4;
    c.stroke();
    const gr = c.createRadialGradient(244, 112, 2, 244, 112, 40);
    gr.addColorStop(0, 'rgba(160,255,220,0.9)');
    gr.addColorStop(1, 'rgba(160,255,220,0)');
    c.fillStyle = gr;
    c.fillRect(200, 70, 90, 90);
    c.fillStyle = '#d8fff0';
    c.fillRect(238, 104, 12, 16);
    c.lineWidth = 3;
    c.strokeRect(238, 104, 12, 16);
  });
}

function liveTartarus(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, wave: number): LiveLayer {
  // the pit flares redder each wave; the Styx breathes; Charon poles his ferry across
  const red = scene.add.rectangle(W / 2, H / 2, W, H, 0xff3a1a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  layer.add(red);
  const [pit, pitCore, styx] = pulse(scene, layer, [
    { x: TT.pit.x, y: TT.pit.y + 120, r: 700, color: 0xff3a1a, sy: 0.6 },
    { x: TT.pit.x, y: TT.pit.y + 150, r: 280, color: 0xffa040, sy: 0.5 },
    { x: VX, y: (TT.river.y0 + TT.river.y1) / 2, r: 1000, color: 0x3affd0, sy: 0.1 },
  ]);
  const boat = scene.add.image(-200, TT.boat.y, ferryTex(scene)).setScale(0.62).setAlpha(0.95);
  layer.add(boat);
  const lantern = pulse(scene, layer, [{ x: 0, y: 0, r: 70, color: 0x9affd8 }])[0];
  // the ferry is on the river, behind the foreground: hidden where the chained columns and the jetty stand in front
  const clip = scene.make.graphics({}, false);
  clip.fillStyle(0xffffff);
  const cols = TT.pillars.map((p) => [p.x - p.w / 2 - 6, p.x + p.w / 2 + 6] as const).sort((a, b) => a[0] - b[0]);
  let from = 0;
  for (const [a, b] of [...cols, [W, W] as const]) {
    if (a > from) clip.fillRect(from, 300, a - from, TT.jetty - 300);
    from = b;
  }
  // below the jetty's top only the open water either side of it
  from = 0;
  for (const [a, b] of [...cols, [VX - 112, VX + 112] as const, [W, W] as const].sort((p, q) => p[0] - q[0])) {
    if (a > from) clip.fillRect(from, TT.jetty, a - from, 700 - TT.jetty);
    from = Math.max(from, b);
  }
  const mask = clip.createGeometryMask();
  boat.setMask(mask);
  lantern.setMask(mask);
  const souls = fogDrift(scene, layer, (TT.river.y0 + TT.river.y1) / 2, 40, 8, 0x8affe0, 0.16, -18);
  const fl = fires(scene, layer, flameTex(scene, 'live9_soulfire', '#1a6aff', '#4fb8ff', '#e8fbff'), TT.braziers.map((b) => ({ x: b.x, y: b.y - 92 * b.s, s: 1.05 * b.s })));
  const halos = pulse(scene, layer, TT.braziers.map((b) => ({ x: b.x, y: b.y - 120, r: 240, color: 0x4fb8ff })));
  let k = waveK(wave);
  let shown = k;
  let bx = 200 + crand() * 800;
  return {
    setWave: (w) => (k = waveK(w)),
    update(dt, t) {
      shown += (k - shown) * Math.min(1, dt * 0.8);
      red.setAlpha(lerp(0, 0.1, shown) * (0.85 + Math.sin(t * 1.7) * 0.15));
      pit.setAlpha(lerp(0.25, 0.75, shown) * (0.85 + Math.sin(t * 2.1) * 0.1 + Math.sin(t * 5.3) * 0.05));
      pitCore.setAlpha(lerp(0.2, 0.6, shown) * (0.8 + Math.sin(t * 3.1) * 0.2));
      styx.setAlpha(0.35 + Math.sin(t * 0.9) * 0.15);
      // the ferry drifts along the river, bobbing, then comes round again
      bx += dt * 22;
      if (bx > W + 220) bx = -220;
      boat.setPosition(bx, TT.boat.y + Math.sin(t * 1.4) * 3).setRotation(Math.sin(t * 1.1) * 0.025);
      lantern.setPosition(bx + 0.62 * 94, TT.boat.y + 0.62 * 2).setAlpha(0.55 + Math.sin(t * 4) * 0.15);
      souls.tick(dt, 1);
      fl.tick(t, 1);
      halos.forEach((h, i) => h.setAlpha(0.35 + Math.sin(t * 7 + i * 3) * 0.08));
    },
    destroy() {
      boat.clearMask();
      lantern.clearMask();
      mask.destroy();
      clip.destroy();
    },
  };
}

registerScene('tartarus', {
  info: {
    name: 'Tartarus',
    subtitle: 'Waves 86–89',
    ambient: ['embers', 'wisps'],
    glows: [g(TT.pit.x, TT.pit.y + 140, 300, '#ff5a2a', 0.35)],
    light: '#c8a8e8',
    tableTint: '#ece4f4',
  },
  draw: drawTartarus,
  live: liveTartarus,
}, true);

// =============================================================================================
// Arena helpers

/** The wall of a round arena seen from inside: a curved band, highest at the edges. */
function ringWall(ctx: Ctx, r: R, topC: number, topE: number, botC: number, botE: number, base: string, frieze: string, friezeBg: string): { top: (x: number) => number; bot: (x: number) => number } {
  const curve = (c: number, e: number) => (x: number) => c + (e - c) * Math.pow((x - VX) / VX, 2);
  const top = curve(topC, topE);
  const bot = curve(botC, botE);
  const band = (t0: (x: number) => number, t1: (x: number) => number) => {
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 20) ctx.lineTo(x, t0(x));
    for (let x = W + 20; x >= -20; x -= 20) ctx.lineTo(x, t1(x));
    ctx.closePath();
  };
  band(top, bot);
  ctx.fillStyle = lgrad(ctx, 0, topC, 0, botE, [
    [0, shade(base, 0.08)],
    [1, shade(base, -0.3)],
  ]);
  ctx.fill();
  ctx.save();
  ctx.clip();
  mottle(ctx, 0, 0, W, botE, 0.28, 1.2);
  // courses of blocks following the curve
  const rows = 8;
  for (let k = 0; k <= rows; k++) {
    const f = 0.14 + (0.86 * k) / rows;
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 20) ctx.lineTo(x, top(x) + (bot(x) - top(x)) * f);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    if (k === rows) break;
    const g0 = 0.14 + (0.86 * k) / rows;
    const g1 = 0.14 + (0.86 * (k + 1)) / rows;
    for (let x = (k % 2) * 40 + r() * 30; x < W; x += 70 + r() * 50) {
      const w = 1 + Math.abs(x - VX) / VX;
      ctx.beginPath();
      ctx.moveTo(x, top(x) + (bot(x) - top(x)) * g0);
      ctx.lineTo(x, top(x) + (bot(x) - top(x)) * g1);
      ctx.lineWidth = 2.5 * w;
      ctx.stroke();
    }
  }
  // frieze with the Greek key along the top of the wall
  const fr = (f: number) => (x: number) => top(x) + (bot(x) - top(x)) * f;
  band(fr(0.02), fr(0.12));
  ctx.fillStyle = friezeBg;
  ctx.fill();
  ctx.strokeStyle = frieze;
  ctx.lineWidth = 4;
  for (let x = -10; x < W; x += 44) {
    const h0 = fr(0.035)(x);
    const hh = fr(0.105)(x) - h0;
    ctx.beginPath();
    KEY.forEach(([a, b], j) => (j ? ctx.lineTo(x + a * 44, h0 + b * hh) : ctx.moveTo(x + a * 44, h0 + b * hh)));
    ctx.stroke();
  }
  ctx.restore();
  band(top, bot);
  outline(ctx, 5);
  // coping
  band((x) => top(x) - 14, (x) => top(x) + 2);
  fillOl(ctx, shade(base, 0.15), 4);
  return { top, bot };
}

/** A dark opening in a ring wall leading off into the maze. */
function mazeGap(ctx: Ctx, x: number, w: number, top: number, bot: number, glowCol?: string): void {
  ctx.beginPath();
  ctx.rect(x - w / 2, top, w, bot - top);
  ctx.fillStyle = lgrad(ctx, 0, top, 0, bot, [
    [0, '#120a08'],
    [1, '#2a1a12'],
  ]);
  ctx.fill();
  // the corridor beyond: a far wall and its floor
  ctx.fillStyle = 'rgba(160,120,90,0.25)';
  ctx.fillRect(x - w * 0.3, top + (bot - top) * 0.35, w * 0.6, (bot - top) * 0.4);
  outline(ctx, 5);
  if (glowCol) glow(ctx, x, bot - (bot - top) * 0.3, w, glowCol, 0.35);
}

/** A pair of bull horns mounted on a bronze boss. */
function hornTrophy(ctx: Ctx, x: number, y: number, s: number): void {
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + d * 14 * s, y - 8 * s);
    ctx.bezierCurveTo(x + d * 70 * s, y - 10 * s, x + d * 96 * s, y - 40 * s, x + d * 92 * s, y - 86 * s);
    ctx.bezierCurveTo(x + d * 80 * s, y - 50 * s, x + d * 56 * s, y + 6 * s, x + d * 12 * s, y + 12 * s);
    ctx.closePath();
    fillOl(ctx, lgrad(ctx, x, y + 10 * s, x + d * 90 * s, y - 86 * s, [
      [0, '#c8b490'],
      [0.6, '#f0e6cc'],
      [1, '#5a4a3a'],
    ]), 4);
  }
  ellipse(ctx, x, y, 22 * s, 20 * s);
  fillOl(ctx, cylH(ctx, x - 22 * s, 44 * s, '#b8782e'), 4);
  ellipse(ctx, x - 6 * s, y - 6 * s, 6 * s, 5 * s);
  ctx.fillStyle = 'rgba(255,240,200,0.6)';
  ctx.fill();
}

/** A hanging cloth banner with a gold emblem drawn by `emblem` at its centre. */
function banner(ctx: Ctx, x: number, y: number, w: number, h: number, cloth: string, emblem: (cx: number, cy: number) => void): void {
  ctx.beginPath();
  ctx.rect(x - w / 2 - 10, y - 8, w + 20, 12);
  fillOl(ctx, cylV(ctx, y - 8, 12, '#8a5a2a'), 3);
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y + 4);
  ctx.lineTo(x + w / 2, y + 4);
  ctx.lineTo(x + w / 2, y + h);
  ctx.lineTo(x, y + h - w * 0.3);
  ctx.lineTo(x - w / 2, y + h);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, x - w / 2, 0, x + w / 2, 0, [
    [0, shade(cloth, -0.25)],
    [0.4, shade(cloth, 0.1)],
    [1, shade(cloth, -0.3)],
  ]), 4);
  ctx.strokeStyle = rgba('#ffd27a', 0.8);
  ctx.lineWidth = 3;
  ctx.strokeRect(x - w / 2 + 8, y + 14, w - 16, 0.01);
  emblem(x, y + h * 0.42);
}

/** The labrys, the Minoan double axe, in gold. */
function labrys(ctx: Ctx, x: number, y: number, s: number, col = '#ffd23f'): void {
  ctx.beginPath();
  ctx.rect(x - 3 * s, y - 40 * s, 6 * s, 80 * s);
  fillOl(ctx, col, 2.5);
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + d * 3 * s, y - 10 * s);
    ctx.quadraticCurveTo(x + d * 18 * s, y - 14 * s, x + d * 28 * s, y - 26 * s);
    ctx.quadraticCurveTo(x + d * 20 * s, y, x + d * 28 * s, y + 26 * s);
    ctx.quadraticCurveTo(x + d * 18 * s, y + 14 * s, x + d * 3 * s, y + 10 * s);
    ctx.closePath();
    fillOl(ctx, col, 2.5);
  }
}

/** A statue of a petrified foot on a plinth: grey stone, a startled pose, and cracks. */
function stoneFoot(ctx: Ctx, r: R, x: number, y: number, s: number, kind: 'sneaker' | 'bare'): void {
  plinth(ctx, x, y, 120 * s, 60 * s, '#9a968c');
  const by = y - 74 * s;
  const stone = '#b4b0a6';
  // leg
  ctx.beginPath();
  ctx.rect(x - 24 * s, by - 150 * s, 48 * s, 110 * s);
  fillOl(ctx, cylH(ctx, x - 24 * s, 48 * s, stone), 4);
  // foot
  ctx.beginPath();
  if (kind === 'sneaker') {
    ctx.moveTo(x - 34 * s, by - 50 * s);
    ctx.lineTo(x - 36 * s, by - 2 * s);
    ctx.lineTo(x + 66 * s, by - 2 * s);
    ctx.quadraticCurveTo(x + 76 * s, by - 26 * s, x + 30 * s, by - 34 * s);
    ctx.lineTo(x + 22 * s, by - 50 * s);
    ctx.closePath();
  } else {
    ctx.moveTo(x - 30 * s, by - 50 * s);
    ctx.quadraticCurveTo(x - 40 * s, by, x - 10 * s, by);
    ctx.lineTo(x + 50 * s, by);
    ctx.quadraticCurveTo(x + 70 * s, by - 20 * s, x + 26 * s, by - 40 * s);
    ctx.closePath();
  }
  fillOl(ctx, lgrad(ctx, 0, by - 60 * s, 0, by, [
    [0, shade(stone, 0.15)],
    [1, shade(stone, -0.25)],
  ]), 4);
  if (kind === 'sneaker') {
    ctx.fillStyle = shade(stone, -0.2);
    ctx.fillRect(x - 36 * s, by - 12 * s, 102 * s, 10 * s);
    ctx.strokeStyle = rgba(OL, 0.6);
    ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(x + (2 + k * 9) * s, by - 44 * s + k * 4 * s);
      ctx.lineTo(x + (12 + k * 9) * s, by - 38 * s + k * 4 * s);
      ctx.stroke();
    }
  } else {
    for (let k = 0; k < 5; k++) {
      ellipse(ctx, x + (54 - k * 9) * s, by - (8 + Math.abs(k - 1) * 2) * s, (k === 0 ? 8 : 6) * s, 6 * s);
      fillOl(ctx, shade(stone, 0.05), 2.5);
    }
  }
  // a frozen look of surprise on the ankle: O mouth and wide eyes
  ellipse(ctx, x - 8 * s, by - 120 * s, 6 * s, 7 * s);
  ellipse(ctx, x + 10 * s, by - 120 * s, 6 * s, 7 * s);
  ctx.fillStyle = shade(stone, -0.45);
  ctx.fill();
  ellipse(ctx, x + 1 * s, by - 98 * s, 6 * s, 8 * s);
  ctx.fill();
  // cracks and moss
  ctx.strokeStyle = 'rgba(40,36,30,0.55)';
  ctx.lineWidth = 2;
  let cx = x + (r() - 0.5) * 30 * s;
  let cy = by - 150 * s;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  for (let k = 0; k < 6; k++) {
    cx += (r() - 0.5) * 14 * s;
    cy += 18 * s;
    ctx.lineTo(cx, cy);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(90,130,60,0.6)';
  blob(ctx, x - 20 * s, by - 6 * s, 10 * s, 0.4, r, 6);
  ctx.fill();
}

/** A little green snake curled round something at (x, y). */
function snake(ctx: Ctx, x: number, y: number, s: number, flip = 1, col = '#5f9a3e'): void {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 40 * s * flip, y + 20 * s);
  ctx.bezierCurveTo(x - 10 * s * flip, y - 10 * s, x + 10 * s * flip, y + 30 * s, x + 34 * s * flip, y);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 13 * s;
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = 8 * s;
  ctx.stroke();
  ctx.strokeStyle = rgba('#e8e06a', 0.7);
  ctx.lineWidth = 2 * s;
  ctx.setLineDash([4 * s, 6 * s]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineCap = 'butt';
  ellipse(ctx, x + 38 * s * flip, y - 3 * s, 10 * s, 7 * s, -0.3 * flip);
  fillOl(ctx, col, 3);
  ellipse(ctx, x + 41 * s * flip, y - 6 * s, 2 * s, 2 * s);
  ctx.fillStyle = '#ffe14d';
  ctx.fill();
  ctx.strokeStyle = '#e8302a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 47 * s * flip, y - 2 * s);
  ctx.lineTo(x + 56 * s * flip, y);
  ctx.lineTo(x + 60 * s * flip, y - 3 * s);
  ctx.moveTo(x + 56 * s * flip, y);
  ctx.lineTo(x + 60 * s * flip, y + 3 * s);
  ctx.stroke();
}

/** Generic arena live layer: flickering fires, glows that breathe, and a drifting mist band. */
function liveArena(spots: { x: number; y: number; s: number; key: string; cols: [string, string, string]; halo: number }[], breath: { x: number; y: number; r: number; color: number; sy?: number; speed: number; lo: number; hi: number }[], mist?: { y: number; h: number; n: number; color: number; a: number; v: number }) {
  return (scene: Phaser.Scene, layer: Phaser.GameObjects.Container): LiveLayer => {
    const halos = pulse(scene, layer, spots.map((s) => ({ x: s.x, y: s.y - 40 * s.s, r: 220 * s.s, color: s.halo })));
    const fls = spots.map((s) => fires(scene, layer, flameTex(scene, s.key, ...s.cols), [{ x: s.x, y: s.y, s: s.s }]));
    const bs = pulse(scene, layer, breath);
    const fog = mist ? fogDrift(scene, layer, mist.y, mist.h, mist.n, mist.color, mist.a, mist.v) : null;
    return {
      update(dt, t) {
        for (const f of fls) f.tick(t, 1);
        halos.forEach((h, i) => h.setAlpha(0.32 + Math.sin(t * 7.7 + i * 2.1) * 0.06 + Math.sin(t * 12.3 + i) * 0.04));
        bs.forEach((b, i) => {
          const o = breath[i];
          b.setAlpha(o.lo + (o.hi - o.lo) * (0.5 + 0.5 * Math.sin(t * o.speed + i)));
        });
        fog?.tick(dt, 1);
      },
      destroy() {},
    };
  };
}

const FIRE: [string, string, string] = ['#ff5a1a', '#ffa83a', '#fff2b0'];

// =============================================================================================
// The Heart of the Maze (The Minotaur)

const MT = {
  braziers: [
    { x: 330, y: 700, s: 1.1 },
    { x: 1590, y: 700, s: 1.1 },
  ],
  bull: { x: 960, y: 590 },
  gaps: [280, 960, 1640],
  front: 1040,
};

function bronzeBull(ctx: Ctx, x: number, y: number, s: number): void {
  const bz = '#b8782e';
  plinth(ctx, x, y, 260 * s, 70 * s, '#a89a84');
  const by = y - 84 * s;
  // legs
  for (const lx of [-70, -40, 50, 80]) {
    ctx.beginPath();
    ctx.rect(x + lx * s - 10 * s, by - 50 * s, 20 * s, 50 * s);
    fillOl(ctx, cylH(ctx, x + lx * s - 10 * s, 20 * s, shade(bz, -0.15)), 4);
  }
  // body
  ellipse(ctx, x, by - 70 * s, 110 * s, 48 * s);
  fillOl(ctx, lgrad(ctx, 0, by - 120 * s, 0, by - 20 * s, [
    [0, shade(bz, 0.35)],
    [0.5, bz],
    [1, shade(bz, -0.4)],
  ]), 5);
  // hump and head, lowered to charge
  ellipse(ctx, x - 60 * s, by - 100 * s, 44 * s, 34 * s);
  fillOl(ctx, shade(bz, 0.1), 5);
  ellipse(ctx, x - 112 * s, by - 62 * s, 34 * s, 28 * s, 0.4);
  fillOl(ctx, lgrad(ctx, 0, by - 90 * s, 0, by - 34 * s, [
    [0, shade(bz, 0.3)],
    [1, shade(bz, -0.3)],
  ]), 5);
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x - 118 * s + d * 10 * s, by - 86 * s);
    ctx.quadraticCurveTo(x - 140 * s + d * 30 * s, by - 130 * s, x - 112 * s + d * 46 * s, by - 136 * s);
    ctx.quadraticCurveTo(x - 126 * s + d * 26 * s, by - 116 * s, x - 108 * s + d * 12 * s, by - 80 * s);
    ctx.closePath();
    fillOl(ctx, '#f0e6cc', 4);
  }
  ellipse(ctx, x - 132 * s, by - 46 * s, 9 * s, 9 * s);
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 4 * s;
  ctx.stroke();
  // tail and a verdigris patina
  ctx.beginPath();
  ctx.moveTo(x + 104 * s, by - 80 * s);
  ctx.quadraticCurveTo(x + 130 * s, by - 60 * s, x + 118 * s, by - 20 * s);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 6 * s;
  ctx.stroke();
  ctx.fillStyle = 'rgba(90,170,140,0.35)';
  ellipse(ctx, x + 30 * s, by - 50 * s, 30 * s, 10 * s);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,250,220,0.45)';
  ellipse(ctx, x - 20 * s, by - 100 * s, 50 * s, 8 * s, -0.1);
  ctx.fill();
}

function drawMinotaurArena(ctx: Ctx, r: R): void {
  // a hot, hazy late-afternoon sky over the open heart of the maze
  vgrad(ctx, 0, 0, W, 360, [
    [0, '#5a3a5a'],
    [0.5, '#c8644a'],
    [1, '#ffc070'],
  ]);
  glow(ctx, VX, 300, 600, '#ffd28a', 0.35, 0.4);
  // far maze tiers
  for (const [y, col] of [
    [170, '#a06a5a'],
    [210, '#8a5448'],
  ] as [number, string][]) {
    for (let x = -60; x < W + 60; ) {
      const w = 160 + r() * 260;
      ctx.beginPath();
      ctx.rect(x, y, w, 140);
      fillOl(ctx, lgrad(ctx, 0, y, 0, y + 80, [
        [0, shade(col, 0.15)],
        [1, shade(col, -0.25)],
      ]), 3);
      ctx.fillStyle = rgba('#ffe0b0', 0.5);
      ctx.fillRect(x + 3, y + 2, w - 6, 4);
      x += w + 30 + r() * 70;
    }
  }
  const wall = ringWall(ctx, r, 300, 150, 580, 720, '#c4a07a', '#f0dca8', '#8a3a2a');
  for (const gx of MT.gaps) mazeGap(ctx, gx, gx === 960 ? 170 : 150, wall.top(gx) + 50, wall.bot(gx), gx === 960 ? '#ff9a3a' : undefined);
  // trophies and labrys banners between the gaps
  for (const x of [620, 1300]) {
    hornTrophy(ctx, x, wall.top(x) + 120, 0.9);
    banner(ctx, x, wall.top(x) + 170, 110, 190, '#a8242a', (cx, cy) => labrys(ctx, cx, cy, 1.1));
  }
  for (const x of [120, 1800]) hornTrophy(ctx, x, wall.top(x) + 140, 1);
  // the sand floor of the arena, churned by hooves
  ctx.beginPath();
  for (let x = -20; x <= W + 20; x += 20) ctx.lineTo(x, wall.bot(x));
  ctx.lineTo(W + 20, TY);
  ctx.lineTo(-20, TY);
  ctx.closePath();
  ctx.fillStyle = lgrad(ctx, 0, 580, 0, TY, [
    [0, '#b88a5a'],
    [1, '#e0b882'],
  ]);
  ctx.fill();
  ctx.save();
  ctx.clip();
  mottle(ctx, 0, 560, W, TY - 560, 0.12, 0.8);
  // hoof prints (cloven), and scattered straw
  for (let i = 0; i < 26; i++) {
    const x = r() * W;
    const y = 600 + r() * 150;
    const k = 0.5 + ((y - 600) / 150) * 0.6;
    for (const d of [-1, 1]) {
      ellipse(ctx, x + d * 5 * k, y, 4.5 * k, 8 * k * 0.55, d * 0.2);
      ctx.fillStyle = 'rgba(90,56,30,0.4)';
      ctx.fill();
    }
  }
  ctx.strokeStyle = 'rgba(255,230,140,0.75)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 90; i++) {
    const x = r() * W;
    const y = 620 + r() * 140;
    const a = r() * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * 16, y + Math.sin(a) * 4);
    ctx.stroke();
  }
  ctx.restore();
  bronzeBull(ctx, MT.bull.x, MT.bull.y, 0.85);
  for (const b of MT.braziers) brazier(ctx, b.x, b.y, b.s);
  amphora(ctx, 150, 742, 0.85, '#c8743a');
  amphora(ctx, 1780, 742, 0.85, '#c8743a');
  laneCalm(ctx, 0.2, 60, 600, '#100604');
  // sandstone slab table
  stoneTop(ctx, r, MT.front, '#c8a878', 0.5);
  keyFront(ctx, MT.front, '#a8845a', '#5a1e14');
  contactShadow(ctx, 0.55);
  tableLight(ctx, '#ffc070', 0.07, 0.5);
  grade(ctx, 0.05, '#ffd8a8', 0.12);
  vignette(ctx, 0.7, '#100604', 0.55);
}

registerScene('minotaur', {
  info: {
    name: 'The Heart of the Maze',
    subtitle: 'Boss: THE MINOTAUR',
    ambient: ['dust'],
    glows: [g(960, 470, 160, '#ff9a3a', 0.3), g(VX, 300, 500, '#ffc070', 0.05)],
    light: '#ffc890',
    tableTint: '#fff0dc',
  },
  draw: drawMinotaurArena,
  live: liveArena(
    MT.braziers.map((b) => ({ x: b.x, y: b.y - 92 * b.s, s: b.s, key: 'live9_flame', cols: FIRE, halo: 0xff8a2a })),
    [],
    { y: 720, h: 50, n: 8, color: 0xf0c890, a: 0.14, v: 30 },
  ),
});

// =============================================================================================
// Medusa's Garden

const MD = {
  pool: { x: 960, y: 620 },
  shield: { x: 1630, y: 700 },
  front: 1040,
};

/** A tall dark cypress. */
function cypress(ctx: Ctx, x: number, base: number, h: number, w: number): void {
  ctx.beginPath();
  ctx.moveTo(x, base - h);
  ctx.bezierCurveTo(x + w * 0.7, base - h * 0.7, x + w * 0.6, base - h * 0.15, x + w * 0.3, base);
  ctx.lineTo(x - w * 0.3, base);
  ctx.bezierCurveTo(x - w * 0.6, base - h * 0.15, x - w * 0.7, base - h * 0.7, x, base - h);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, x - w / 2, 0, x + w / 2, 0, [
    [0, '#2a4a2a'],
    [0.4, '#3a6a3a'],
    [1, '#16301a'],
  ]), 4);
  ctx.strokeStyle = 'rgba(10,30,10,0.45)';
  ctx.lineWidth = 2;
  for (let k = 1; k < 7; k++) {
    const y = base - h + (h * k) / 7;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.25, y);
    ctx.quadraticCurveTo(x, y + 14, x + w * 0.25, y);
    ctx.stroke();
  }
}

function drawMedusaArena(ctx: Ctx, r: R): void {
  // an overcast, sickly green sky
  vgrad(ctx, 0, 0, W, 560, [
    [0, '#1a2622'],
    [0.5, '#34523f'],
    [1, '#86a47c'],
  ]);
  for (let i = 0; i < 7; i++) {
    const x = r() * W;
    const y = 120 + r() * 200;
    darkSpot(ctx, x, y, 260 + r() * 200, 40 + r() * 30, 0.25, '#c8e0c0');
  }
  glow(ctx, VX, 420, 700, '#9dff6a', 0.12, 0.5);
  // cypresses and hedges at the garden's edge
  for (const [x, h] of [[90, 420], [190, 340], [1730, 400], [1840, 450]] as Pt[]) cypress(ctx, x, 600, h, 90);
  for (let x = -40; x < W + 40; x += 70 + r() * 40) {
    blob(ctx, x, 586, 50 + r() * 20, 0.25, r, 9);
    fillOl(ctx, shade('#3a5a32', (r() - 0.5) * 0.2), 4);
  }
  // the garden floor: old paving with grass between the stones
  vgrad(ctx, 0, 580, W, TY - 580, [
    [0, '#6a6e5c'],
    [1, '#8a8e78'],
  ]);
  ctx.save();
  clipRect(ctx, 0, 580, W, TY - 580);
  // flagstones in perspective, with grass in the joints
  const rows = [584, 606, 634, 668, 710, TY];
  for (let k = 0; k < rows.length - 1; k++) {
    const y0 = rows[k];
    const y1 = rows[k + 1];
    const sc = (y: number) => (y - 300) / (584 - 300);
    const off = (k % 2) * 0.5;
    for (let X = -14 + off; X <= 14; X++) {
      const x0a = VX + X * 70 * sc(y0);
      const x1a = VX + (X + 1) * 70 * sc(y0);
      const x0b = VX + X * 70 * sc(y1);
      const x1b = VX + (X + 1) * 70 * sc(y1);
      ctx.beginPath();
      ctx.moveTo(x0a + 3, y0 + 2);
      ctx.lineTo(x1a - 3, y0 + 2);
      ctx.lineTo(x1b - 3, y1 - 2);
      ctx.lineTo(x0b + 3, y1 - 2);
      ctx.closePath();
      ctx.fillStyle = shade('#8a8c78', (r() - 0.5) * 0.22);
      ctx.fill();
      ctx.strokeStyle = 'rgba(50,80,36,0.75)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
  ctx.restore();
  // a ruined temple on a stepped platform
  const tx0 = 440;
  ctx.beginPath();
  ctx.rect(tx0 - 90, 600, 1130, 24);
  fillOl(ctx, cylV(ctx, 600, 24, '#8a8c7c'), 4);
  ctx.beginPath();
  ctx.rect(tx0 - 60, 580, 1070, 22);
  fillOl(ctx, cylV(ctx, 580, 22, '#9a9c8c'), 4);
  ctx.beginPath();
  ctx.moveTo(tx0 - 30, 250);
  ctx.lineTo(980, 140);
  ctx.lineTo(1180, 184);
  ctx.lineTo(1160, 214);
  ctx.lineTo(1240, 216);
  ctx.lineTo(1250, 250);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, 140, 0, 250, [
    [0, '#9a9a8a'],
    [1, '#6a6e60'],
  ]), 5);
  // a relief of a snake-haired face in the pediment
  ellipse(ctx, 900, 210, 30, 24);
  fillOl(ctx, '#8a8c7c', 3);
  for (let k = 0; k < 7; k++) {
    const a = Math.PI + (k / 6) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(900 + Math.cos(a) * 28, 210 + Math.sin(a) * 22);
    ctx.quadraticCurveTo(900 + Math.cos(a) * 44, 210 + Math.sin(a) * 30 - 8, 900 + Math.cos(a) * 50, 210 + Math.sin(a) * 36);
    ctx.strokeStyle = '#5a5e50';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.rect(tx0 - 40, 250, 870, 30);
  fillOl(ctx, cylV(ctx, 250, 30, '#8a8c7c'), 4);
  const cols: number[] = [];
  for (let k = 0; k < 8; k++) {
    const cx = tx0 + 20 + k * 145;
    cols.push(cx);
    const broken = k >= 6;
    column(ctx, r, cx, 582, broken ? 330 + r() * 70 : 280, 62, '#a8a898', broken);
  }
  for (const [x, y] of [[1430, 600], [1520, 612]] as Pt[]) {
    ellipse(ctx, x, y - 20, 40, 26);
    fillOl(ctx, cylV(ctx, y - 46, 52, '#9a9a8a'), 4);
  }
  // ivy on the columns, with snakes hiding in it
  for (const x of [cols[0], cols[2], cols[4], cols[6]]) ivy(ctx, r, x - 20, 300, 180 + r() * 80, '#3a6a2a');
  snake(ctx, cols[2] + 10, 400, 0.9, 1);
  snake(ctx, cols[6], 470, 0.8, -1, '#4f8a3a');
  // the green fire pool in the middle of the garden
  ellipse(ctx, MD.pool.x, MD.pool.y + 30, 170, 36);
  fillOl(ctx, '#6a6a5c', 5);
  ellipse(ctx, MD.pool.x, MD.pool.y + 26, 150, 28);
  ctx.fillStyle = lgrad(ctx, 0, MD.pool.y, 0, MD.pool.y + 50, [
    [0, '#c8ff8a'],
    [1, '#2a8a3a'],
  ]);
  ctx.fill();
  glow(ctx, MD.pool.x, MD.pool.y, 240, '#9dff6a', 0.45);
  // petrified heroes (feet, naturally) on plinths, frozen mid-step
  stoneFoot(ctx, r, 260, 740, 1.25, 'sneaker');
  stoneFoot(ctx, r, 620, 700, 0.85, 'bare');
  stoneFoot(ctx, r, 1320, 700, 0.85, 'sneaker');
  snake(ctx, 290, 650, 0.8, -1);
  // the polished bronze shield on a plinth: the only safe way to look at her
  plinth(ctx, MD.shield.x, MD.shield.y, 150, 90, '#8a8c7c');
  const sy = MD.shield.y - 104 - 80;
  ellipse(ctx, MD.shield.x, sy, 84, 84);
  fillOl(ctx, cylH(ctx, MD.shield.x - 84, 168, '#c9873a'), 6);
  ellipse(ctx, MD.shield.x, sy, 66, 66);
  const mg = ctx.createRadialGradient(MD.shield.x - 24, sy - 28, 4, MD.shield.x, sy, 70);
  mg.addColorStop(0, '#fff6d0');
  mg.addColorStop(0.5, '#e8b860');
  mg.addColorStop(1, '#8a5a20');
  ctx.fillStyle = mg;
  ctx.fill();
  outline(ctx, 3);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(MD.shield.x, sy, 52, -2.6, -1.8);
  ctx.stroke();
  laurel(ctx, r, MD.shield.x - 90, sy + 90, MD.shield.x + 90, sy + 90, 22, '#5f8a3a', 8);
  laneCalm(ctx, 0.22, 60, 600, '#041008');
  // green-veined marble table, cracked
  stoneTop(ctx, r, MD.front, '#d4d8c8', 0.7);
  marbleVeins(ctx, r, MD.front, '#3a7a4a', 0.45, 12);
  keyFront(ctx, MD.front, '#a8ac98', '#2a5a2a');
  contactShadow(ctx, 0.55);
  tableLight(ctx, '#b8ff9a', 0.06, 0.5);
  grade(ctx, 0.15, '#c8e8b8', 0.18);
  vignette(ctx, 0.8, '#041008', 0.6);
}

registerScene('medusa', {
  info: {
    name: "Medusa's Garden",
    subtitle: 'Boss: MEDUSA',
    ambient: ['fog', 'wisps'],
    glows: [g(MD.pool.x, MD.pool.y - 30, 260, '#9dff6a', 0.4), g(MD.shield.x, MD.shield.y - 184, 120, '#ffe0a0', 0.15)],
    light: '#c8f0b0',
    tableTint: '#eef8e6',
  },
  draw: drawMedusaArena,
  live: liveArena(
    [{ x: MD.pool.x, y: MD.pool.y - 8, s: 1.3, key: 'live9_greenfire', cols: ['#2aa83a', '#9dff6a', '#f0ffd0'], halo: 0x9dff6a }],
    [{ x: MD.shield.x - 20, y: MD.shield.y - 200, r: 70, color: 0xfff0c0, speed: 1.3, lo: 0.05, hi: 0.35 }],
    { y: 680, h: 80, n: 10, color: 0x9dff6a, a: 0.1, v: 16 },
  ),
});

// =============================================================================================
// The Gates of Hades (Cerberus)

const CB = {
  gate: { x0: 640, x1: 1280, top: 170, bot: 640 },
  braziers: [
    { x: 260, y: 700, s: 1, col: 'fire' as const },
    { x: 520, y: 680, s: 0.75, col: 'ice' as const },
    { x: 1660, y: 700, s: 1, col: 'poison' as const },
  ],
  bowl: { x: 1380, y: 730 },
  front: 1040,
};

const TEMPER = {
  fire: { cols: FIRE, coal: '#ff7a2a', halo: 0xff6a2a, key: 'live9_flame' },
  ice: { cols: ['#2a7aff', '#8ad8ff', '#f0fbff'] as [string, string, string], coal: '#8ad8ff', halo: 0x6ac8ff, key: 'live9_icefire' },
  poison: { cols: ['#3aa82a', '#9dff4a', '#f4ffd0'] as [string, string, string], coal: '#9dff4a', halo: 0x8aff4a, key: 'live9_poisonfire' },
};

function drawCerberusArena(ctx: Ctx, r: R): void {
  vgrad(ctx, 0, 0, W, TY, [
    [0, '#0a080c'],
    [0.6, '#1e1418'],
    [1, '#2a1a1c'],
  ]);
  // the cave mouth framing the gates
  basalt(ctx, r, [[-20, -20], [W + 20, -20], [W + 20, 640], [1500, 620], [1430, 300], [1300, 110], [960, 60], [620, 110], [490, 300], [420, 620], [-20, 640]], '#262028', '#a85a5a');
  const { x0, x1, top, bot } = CB.gate;
  const cx = (x0 + x1) / 2;
  // the arch over the gates, carved with the name of the house
  ctx.beginPath();
  ctx.moveTo(x0 - 70, bot);
  ctx.lineTo(x0 - 70, top + 60);
  ctx.quadraticCurveTo(cx, top - 150, x1 + 70, top + 60);
  ctx.lineTo(x1 + 70, bot);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, top - 100, 0, bot, [
    [0, '#5a5060'],
    [1, '#2a2430'],
  ]), 6);
  ctx.font = `bold 46px ${SLAB}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d8b070';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 8;
  ctx.strokeText('ΑΙΔΗΣ', cx, top - 22);
  ctx.fillText('ΑΙΔΗΣ', cx, top - 22);
  // two bronze gate leaves, studded, with skull knockers and claw marks
  for (const [lx, rx] of [[x0, cx - 4], [cx + 4, x1]] as Pt[]) {
    ctx.beginPath();
    ctx.rect(lx, top + 20, rx - lx, bot - top - 20);
    fillOl(ctx, lgrad(ctx, lx, 0, rx, 0, [
      [0, '#6a4420'],
      [0.35, '#b8782e'],
      [0.6, '#8a5a26'],
      [1, '#5a3a1a'],
    ]), 6);
    ctx.save();
    ctx.beginPath();
    ctx.rect(lx, top + 20, rx - lx, bot - top - 20);
    ctx.clip();
    mottle(ctx, lx, top, rx - lx, bot - top, 0.35, 0.6);
    // panels
    for (const py of [top + 60, top + 250]) {
      roundRect(ctx, lx + 30, py, rx - lx - 60, 160, 10);
      ctx.strokeStyle = rgba(OL, 0.7);
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,220,150,0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // studs
    for (let y = top + 44; y < bot; y += 56)
      for (const x of [lx + 16, rx - 16]) {
        ellipse(ctx, x, y, 7, 7);
        fillOl(ctx, '#e0b060', 2.5);
      }
    // three-claw gouges
    for (let k = 0; k < 2; k++) {
      const gx = lx + 60 + r() * (rx - lx - 160);
      const gy = top + 120 + r() * 260;
      for (let c = 0; c < 3; c++) {
        ctx.beginPath();
        ctx.moveTo(gx + c * 18, gy);
        ctx.quadraticCurveTo(gx + c * 18 + 20, gy + 50, gx + c * 18 + 14, gy + 100);
        ctx.strokeStyle = 'rgba(30,14,6,0.8)';
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,220,160,0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    ctx.restore();
    skull(ctx, (lx + rx) / 2 + (lx < cx ? 40 : -40), top + 236, 0.9, '#d8c8a0');
    ellipse(ctx, (lx + rx) / 2 + (lx < cx ? 40 : -40), top + 270, 30, 30);
    ctx.strokeStyle = OL;
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = '#e0b060';
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  // a chain slung across the gates
  chainPath(ctx, sagPts(x0 - 40, top + 120, x1 + 40, top + 110, 110, 18), 22, '#9a7a4a');
  // floor of trampled ash and bones
  vgrad(ctx, 0, 620, W, TY - 620, [
    [0, '#2a2026'],
    [1, '#3e3036'],
  ]);
  mottle(ctx, 0, 620, W, TY - 620, 0.4, 0.8);
  for (let i = 0; i < 9; i++) bone(ctx, 200 + r() * 1520, 680 + r() * 70, 40 + r() * 30, r() * 3);
  skull(ctx, 760, 730, 0.8);
  skull(ctx, 1150, 716, 0.6, '#cdbf9e');
  // the giant spiked dog bowl
  const { x: bx, y: by } = CB.bowl;
  ellipse(ctx, bx, by - 10, 150, 34);
  fillOl(ctx, '#3a2a2a', 5);
  ctx.beginPath();
  ctx.moveTo(bx - 150, by - 10);
  ctx.lineTo(bx - 128, by - 90);
  ctx.lineTo(bx + 128, by - 90);
  ctx.lineTo(bx + 150, by - 10);
  ctx.closePath();
  fillOl(ctx, cylH(ctx, bx - 150, 300, '#a8242a'), 5);
  for (let k = -3; k <= 3; k++) {
    ctx.beginPath();
    ctx.moveTo(bx + k * 36 - 10, by - 56);
    ctx.lineTo(bx + k * 36, by - 80);
    ctx.lineTo(bx + k * 36 + 10, by - 56);
    ctx.closePath();
    fillOl(ctx, '#d8d4cc', 2.5);
  }
  ellipse(ctx, bx, by - 90, 128, 24);
  fillOl(ctx, '#6a1a1e', 4);
  bone(ctx, bx - 30, by - 104, 90, 0.4);
  bone(ctx, bx + 40, by - 100, 70, -0.6, '#d8ccb0');
  for (const b of CB.braziers) brazier(ctx, b.x, b.y, b.s, '#8a6a3a', TEMPER[b.col].coal);
  laneCalm(ctx, 0.2, 60, 600, '#060204');
  // dark stone table scored by claws
  stoneTop(ctx, r, CB.front, '#4a3e44', 0.6);
  ctx.save();
  clipRect(ctx, 0, TY, W, CB.front - TY);
  for (let k = 0; k < 4; k++) {
    const X = (r() - 0.5) * 3;
    const z = ZB - 0.3 - r() * 0.8;
    for (let c = 0; c < 3; c++) {
      ctx.beginPath();
      ctx.moveTo(xAt(X + c * 0.06, z), yAt(z));
      ctx.lineTo(xAt(X + c * 0.06 + 0.15, z - 0.5), yAt(z - 0.5));
      ctx.strokeStyle = 'rgba(10,6,8,0.6)';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }
  ctx.restore();
  keyFront(ctx, CB.front, '#2e2428', '#b8843a', '#8a5a26');
  contactShadow(ctx, 0.6);
  tableLight(ctx, '#ffb0a0', 0.05, 0.55);
  grade(ctx, 0.1);
  vignette(ctx, 0.85, '#050203', 0.6);
}

registerScene('cerberus', {
  info: {
    name: 'The Gates of Hades',
    subtitle: 'Boss: CERBERUS',
    ambient: ['embers'],
    glows: CB.braziers.map((b) => g(b.x, b.y - 110 * b.s, 200 * b.s, TEMPER[b.col].coal, 0.6)),
    light: '#e8b0a0',
    tableTint: '#f4e6e2',
  },
  draw: drawCerberusArena,
  live: liveArena(
    CB.braziers.map((b) => ({ x: b.x, y: b.y - 92 * b.s, s: b.s, key: TEMPER[b.col].key, cols: TEMPER[b.col].cols, halo: TEMPER[b.col].halo })),
    [{ x: (CB.gate.x0 + CB.gate.x1) / 2, y: CB.gate.bot - 10, r: 360, color: 0xff4a2a, sy: 0.25, speed: 1.1, lo: 0.15, hi: 0.4 }],
  ),
});

// =============================================================================================
// Throne of the Underworld (Hades)

const HD = {
  chasm: { x: 960, y: 420 },
  throne: { x: 960, y: 620 },
  pillars: [180, 560, 1360, 1740],
  platter: { x: 1520, y: 720 },
  front: 1040,
};

function pomegranate(ctx: Ctx, x: number, y: number, s: number): void {
  ellipse(ctx, x, y, 26 * s, 24 * s);
  const gr = ctx.createRadialGradient(x - 8 * s, y - 8 * s, 2, x, y, 28 * s);
  gr.addColorStop(0, '#ff6a6a');
  gr.addColorStop(1, '#8a1020');
  ctx.fillStyle = gr;
  ctx.fill();
  outline(ctx, 4);
  ctx.beginPath();
  ctx.moveTo(x - 8 * s, y - 22 * s);
  for (let k = 0; k < 5; k++) ctx.lineTo(x - 8 * s + k * 4 * s, y - (k % 2 ? 26 : 34) * s);
  ctx.closePath();
  fillOl(ctx, '#6a1a1a', 3);
  ellipse(ctx, x - 9 * s, y - 9 * s, 6 * s, 4 * s, -0.5);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill();
}

function drawHadesArena(ctx: Ctx, r: R): void {
  vgrad(ctx, 0, 0, W, TY, [
    [0, '#06050a'],
    [0.6, '#120a16'],
    [1, '#1a0e14'],
  ]);
  // the chasm of Tartarus yawning behind the throne
  const { x: cx, y: cy } = HD.chasm;
  ctx.beginPath();
  ctx.moveTo(cx - 420, 600);
  ctx.quadraticCurveTo(cx - 300, cy - 160, cx, cy - 190);
  ctx.quadraticCurveTo(cx + 300, cy - 160, cx + 420, 600);
  ctx.closePath();
  ctx.fillStyle = ctx.createRadialGradient(cx, 600, 20, cx, 520, 460);
  (ctx.fillStyle as CanvasGradient).addColorStop(0, '#ffd070');
  (ctx.fillStyle as CanvasGradient).addColorStop(0.3, '#ff5a1a');
  (ctx.fillStyle as CanvasGradient).addColorStop(0.7, '#6a0a14');
  (ctx.fillStyle as CanvasGradient).addColorStop(1, '#1a0408');
  ctx.fill();
  ctx.save();
  ctx.clip();
  // falling rock ledges silhouetted in the glow
  for (let k = 0; k < 6; k++) {
    const y = cy - 120 + k * 50;
    const side = k % 2 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(cx + side * 440, y);
    ctx.lineTo(cx + side * (180 - k * 10) + (r() - 0.5) * 40, y + 20);
    ctx.lineTo(cx + side * 440, y + 46);
    ctx.closePath();
    ctx.fillStyle = rgba('#1a0608', 0.75 - k * 0.08);
    ctx.fill();
  }
  ctx.restore();
  glow(ctx, cx, 560, 520, '#ff4a1a', 0.35, 0.6);
  // the hall: black pillars and arches
  for (const px of HD.pillars) {
    column(ctx, r, px, 640, 70, 90, '#3a3440');
    // broken chains where the Titans were bound
    const side = px < VX ? 1 : -1;
    chainPath(ctx, sagPts(px + side * 46, 230, px + side * 160, 330, 30, 10), 24, '#b8843a');
    ctx.beginPath();
    ctx.ellipse(px + side * 170, 342, 26, 18, 0, 0, Math.PI * 2);
    ctx.strokeStyle = OL;
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.strokeStyle = '#c8903a';
    ctx.lineWidth = 6;
    ctx.stroke();
    // the shackle is snapped open
    ctx.fillStyle = '#120a16';
    ctx.fillRect(px + side * 170 - 8, 354, 16, 10);
  }
  // lintel across the pillars with the Greek key
  ctx.beginPath();
  ctx.rect(-20, 36, W + 40, 44);
  fillOl(ctx, cylV(ctx, 36, 44, '#2e2834'), 5);
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 4;
  for (let x = -10; x < W; x += 40) {
    ctx.beginPath();
    KEY.forEach(([a, b], j) => (j ? ctx.lineTo(x + a * 40, 46 + b * 24) : ctx.moveTo(x + a * 40, 46 + b * 24)));
    ctx.stroke();
  }
  // the floor of polished black stone reflecting the chasm
  vgrad(ctx, 0, 600, W, TY - 600, [
    [0, '#1e1620'],
    [1, '#2e2430'],
  ]);
  ctx.save();
  clipRect(ctx, 0, 600, W, TY - 600);
  ctx.strokeStyle = 'rgba(200,150,90,0.22)';
  ctx.lineWidth = 2;
  for (let k = 1; k < 5; k++) {
    const y = 600 + (TY - 600) * Math.pow(k / 5, 1.5);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let X = -10; X <= 10; X++) {
    ctx.beginPath();
    ctx.moveTo(VX + X * 90, 600);
    ctx.lineTo(VX + X * 90 * ((TY - 300) / (600 - 300)), TY);
    ctx.stroke();
  }
  // the chasm and the throne's flames reflected in the polish
  darkSpot(ctx, cx, 700, 420, 60, 0.35, '#ff5a2a');
  darkSpot(ctx, cx, 690, 160, 40, 0.25, '#4fb8ff');
  ctx.restore();
  glow(ctx, cx, 640, 500, '#ff5a2a', 0.15, 0.25);
  // the dais and the throne
  const { x: tx, y: ty } = HD.throne;
  for (let k = 0; k < 3; k++) {
    roundRect(ctx, tx - 260 + k * 40, ty + 40 - k * 28, 520 - k * 80, 30, 6);
    fillOl(ctx, cylV(ctx, ty + 40 - k * 28, 30, '#3e3646'), 4);
  }
  // high back with a bident and skulls
  ctx.beginPath();
  ctx.moveTo(tx - 120, ty - 20);
  ctx.lineTo(tx - 130, ty - 300);
  ctx.quadraticCurveTo(tx, ty - 380, tx + 130, ty - 300);
  ctx.lineTo(tx + 120, ty - 20);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, tx - 130, 0, tx + 130, 0, [
    [0, '#0e0c14'],
    [0.4, '#2e2a3a'],
    [1, '#0a0810'],
  ]), 6);
  ctx.strokeStyle = '#4fb8ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(tx - 110, ty - 40);
  ctx.lineTo(tx - 118, ty - 290);
  ctx.quadraticCurveTo(tx, ty - 360, tx + 118, ty - 290);
  ctx.lineTo(tx + 110, ty - 40);
  ctx.stroke();
  // bident emblem
  ctx.strokeStyle = '#c8903a';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(tx, ty - 80);
  ctx.lineTo(tx, ty - 228);
  ctx.moveTo(tx - 34, ty - 290);
  ctx.lineTo(tx - 34, ty - 240);
  ctx.quadraticCurveTo(tx, ty - 220, tx + 34, ty - 240);
  ctx.lineTo(tx + 34, ty - 290);
  ctx.stroke();
  // seat and arms
  roundRect(ctx, tx - 150, ty - 110, 300, 90, 14);
  fillOl(ctx, cylV(ctx, ty - 110, 90, '#26222e'), 5);
  for (const d of [-1, 1]) {
    roundRect(ctx, tx + d * 150 - 30, ty - 170, 60, 150, 12);
    fillOl(ctx, cylH(ctx, tx + d * 150 - 30, 60, '#2e2a38'), 5);
    skull(ctx, tx + d * 150, ty - 170, 0.8, '#d8d0b8');
  }
  // pomegranates on a bronze platter
  const { x: px, y: py } = HD.platter;
  ctx.beginPath();
  ctx.moveTo(px - 10, py);
  ctx.lineTo(px - 30, py - 90);
  ctx.lineTo(px + 30, py - 90);
  ctx.lineTo(px + 10, py);
  ctx.closePath();
  fillOl(ctx, cylH(ctx, px - 30, 60, '#8a5a26'), 4);
  ellipse(ctx, px, py - 92, 80, 18);
  fillOl(ctx, cylV(ctx, py - 110, 36, '#c8903a'), 4);
  pomegranate(ctx, px - 30, py - 118, 1);
  pomegranate(ctx, px + 28, py - 114, 0.9);
  pomegranate(ctx, px, py - 140, 0.95);
  laneCalm(ctx, 0.25, 60, 600, '#040208');
  // black marble with gold veins, bronze rim
  stoneTop(ctx, r, HD.front, '#2a2632', 0.4);
  marbleVeins(ctx, r, HD.front, '#ffd27a', 0.4, 9);
  keyFront(ctx, HD.front, '#1e1a24', '#c8903a', '#c8903a');
  contactShadow(ctx, 0.6);
  tableLight(ctx, '#ffb080', 0.05, 0.55);
  grade(ctx, 0.08);
  vignette(ctx, 0.85, '#040208', 0.65);
}

function liveHades(scene: Phaser.Scene, layer: Phaser.GameObjects.Container): LiveLayer {
  const base = liveArena(
    [-1, 1].map((d) => ({ x: HD.throne.x + d * 150, y: HD.throne.y - 196, s: 0.75, key: 'live9_soulfire', cols: ['#1a6aff', '#4fb8ff', '#e8fbff'] as [string, string, string], halo: 0x4fb8ff })),
    [
      { x: HD.chasm.x, y: 560, r: 520, color: 0xff4a1a, sy: 0.7, speed: 1.6, lo: 0.2, hi: 0.55 },
      { x: HD.chasm.x, y: 600, r: 200, color: 0xffc060, sy: 0.6, speed: 2.7, lo: 0.15, hi: 0.4 },
    ],
    { y: 360, h: 300, n: 10, color: 0x9ac8ff, a: 0.08, v: -12 },
  )(scene, layer);
  return base;
}

registerScene('hades', {
  info: {
    name: 'Throne of the Underworld',
    subtitle: 'Boss: HADES',
    ambient: ['embers', 'wisps'],
    glows: [g(HD.chasm.x, 520, 340, '#ff5a2a', 0.4), g(HD.throne.x, HD.throne.y - 240, 220, '#4fb8ff', 0.3)],
    light: '#d0a8d8',
    tableTint: '#f0e6f2',
  },
  draw: drawHadesArena,
  live: liveHades,
});
