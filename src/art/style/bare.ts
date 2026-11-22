// The bare foot in the style kit: skin under the one light, tendons, ankle bones, toe knuckles, clefts with
// ambient occlusion and real toenails, all painted inside the one silhouette. Bare-skinned feet (Barefoot Bob, Fruit
// Fly Fiona, …) start from paintBare() and paint their own story on top before the outline goes on.

import { CX } from '../feetCommon';
import { type Ctx, mix, rgba, shade } from '../util';
import { type BareOpts, type StyleToe, bareBox, bareParts, cleft, onToe, poseToes, restToes } from './anatomy';
import { type Box, type Pose, LIGHT, ao, crease, inkOf, inside, softStroke, spec, texture } from './kit';
import { Sil, lobe } from './sil';
import { MATERIALS } from './materials';

export interface BareLook extends BareOpts {
  skin: string;
  /** Nail polish (undefined: natural nails). null: no nails (claws, pads). */
  nails?: string | null;
  /** Shadow hue for the skin (default: subsurface red). */
  shadowTint?: string;
  /** Pore texture strength. */
  pores?: number;
  /** Tendons and veins strength (0 hides them). */
  detail?: number;
}

export interface BareFoot {
  /** The silhouette: paint more on sil.g, then finish with bareOutline(). */
  sil: Sil;
  toes: StyleToe[];
  box: Box;
  ink: string;
  top: number;
}

/** Lay out a bare foot at a pose. */
export function bareFoot(ctx: Ctx, o: BareLook, p: Pose): BareFoot {
  const toes = poseToes(restToes(o), p);
  const box = bareBox(o);
  return { sil: new Sil(ctx, bareParts(toes, o), box), toes, box, ink: inkOf(o.skin), top: o.top ?? -6 };
}

/** A toenail on a toe: plate, cuticle, half-moon, a free edge and a gloss line. */
export function toenail(ctx: Ctx, t: StyleToe, col: string | undefined, skin: string, curl: number): void {
  const big = t.rx > 28;
  const nw = t.rx * (big ? 0.56 : 0.52);
  const nh = t.ry * (0.42 - curl * 0.1);
  const [x, y] = onToe(t, Math.PI / 2);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t.rot);
  ctx.translate(0, -t.ry * 0.2 - nh * 0.45);
  const plate = (c: Ctx) => {
    c.beginPath();
    c.moveTo(-nw, -nh * 0.35);
    c.bezierCurveTo(-nw, -nh * 0.95, nw, -nh * 0.95, nw, -nh * 0.35);
    c.bezierCurveTo(nw * 1.02, nh * 0.45, nw * 0.6, nh * 0.85, 0, nh * 0.9);
    c.bezierCurveTo(-nw * 0.6, nh * 0.85, -nw * 1.02, nh * 0.45, -nw, -nh * 0.35);
    c.closePath();
  };
  // the nail bed sits in the toe: a soft groove round it
  ctx.save();
  ctx.lineJoin = 'round';
  plate(ctx);
  ctx.strokeStyle = rgba(shade(skin, -0.5), 0.35);
  ctx.lineWidth = 2.6;
  ctx.stroke();
  ctx.restore();
  const natural = !col;
  const nc = col ?? mix(skin, '#ffe6e0', 0.45);
  const g = ctx.createLinearGradient(-nw * 0.7, -nh, nw * 0.7, nh);
  g.addColorStop(0, shade(nc, natural ? 0.25 : 0.3));
  g.addColorStop(0.55, nc);
  g.addColorStop(1, shade(nc, natural ? -0.12 : -0.3));
  plate(ctx);
  ctx.fillStyle = g;
  ctx.fill();
  inside(ctx, plate, () => {
    if (natural) {
      // half-moon at the base, pink bed, white free edge at the tip
      ctx.fillStyle = rgba('#ffffff', 0.35);
      ctx.beginPath();
      ctx.ellipse(0, -nh * 0.5, nw * 0.45, nh * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(mix(skin, '#ff8a80', 0.3), 0.25);
      ctx.fillRect(-nw, -nh * 0.2, nw * 2, nh * 0.6);
      ctx.fillStyle = rgba('#fff8ee', 0.6);
      ctx.fillRect(-nw, nh * 0.62, nw * 2, nh);
    }
    // cuticle shadow and gloss
    ctx.fillStyle = rgba(shade(skin, -0.45), 0.35);
    ctx.beginPath();
    ctx.ellipse(0, -nh * 0.95, nw * 1.1, nh * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    spec(ctx, -nw * 0.38, -nh * 0.15, nw * 0.55, nh * 0.22, natural ? 0.7 : 0.9, -0.5);
  });
  ctx.restore();
}

/** Paint a bare foot inside its silhouette (no outline). Returns the layout for further painting. */
export function paintBare(target: Ctx, o: BareLook, p: Pose): BareFoot {
  const f = bareFoot(target, o, p);
  const { sil, toes, box } = f;
  const ctx = sil.g;
  const skin = o.skin;
  const tint = o.shadowTint ?? MATERIALS.skin.shadowTint;
  const det = o.detail ?? 1;
  const c = Math.max(0, p.curl);
  sil.form({ base: skin, shadowTint: tint, ramp: 0.85, form: 0.55, formSize: 34, bevel: 0.3, rim: 0.5 });
  const deep = mix(shade(skin, -0.42), tint, 0.45);
  {
    texture(ctx, 'pores', box, o.pores ?? 0.22, 1, 'soft-light');
    // the dome of the instep catching the key light, and the turn into shadow down the inner side
    spec(ctx, CX - 22, 70, 82, 60, 0.24, -0.5, LIGHT.key);
    const core = ctx.createLinearGradient(box.x, 0, box.x + box.w, 0);
    core.addColorStop(0, rgba(deep, 0.08));
    core.addColorStop(0.35, rgba(deep, 0));
    core.addColorStop(0.62, rgba(deep, 0.04));
    core.addColorStop(0.86, rgba(deep, 0.22));
    core.addColorStop(1, rgba(deep, 0.1));
    ctx.fillStyle = core;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    // two or three broad tendon ridges from the ankle, fading towards the toes
    if (det > 0) {
      for (const i of [1, 2, 3]) {
        const t = toes[i];
        const [tx, ty] = onToe(t, -Math.PI / 2);
        const sx = CX + (t.cx - CX) * 0.22;
        const draw = (c2: Ctx) => {
          c2.moveTo(sx, 20);
          c2.quadraticCurveTo(sx + (tx - sx) * 0.4 + 2, 100, sx + (tx - sx) * 0.8, ty - 26);
        };
        const lg = ctx.createLinearGradient(0, 20, 0, ty - 20);
        lg.addColorStop(0, rgba(LIGHT.key, 0.26 * det));
        lg.addColorStop(1, rgba(LIGHT.key, 0));
        softStroke(ctx, draw, lg, 7, 3.2);
        ctx.save();
        ctx.translate(5, 3);
        const dg = ctx.createLinearGradient(0, 20, 0, ty - 20);
        dg.addColorStop(0, rgba(deep, 0.16 * det));
        dg.addColorStop(1, rgba(deep, 0));
        softStroke(ctx, draw, dg, 5, 3.5);
        ctx.restore();
      }
      // a faint vein over the arch
      softStroke(ctx, (c2) => {
        c2.moveTo(CX + 38, 12);
        c2.bezierCurveTo(CX + 24, 62, CX + 52, 92, CX + 34, 140);
      }, rgba(mix(skin, '#5a6fd0', 0.6), 0.16 * det), 3, 1.2);
    }
    // ankle bones: a lit bump and the hollow under it
    for (const [ax, ay] of [[CX - 44, 26], [CX + 46, 34]] as const) {
      ao(ctx, ax + 4, ay + 14, 15, 7, 0.12, 0, deep);
      spec(ctx, ax - 2, ay - 2, 11, 8, 0.16, -0.6, LIGHT.key);
    }
    // the toes: each its own rounded volume, split by creases up from the clefts
    const clefts = toes.slice(0, -1).map((t, i) => cleft(t, toes[i + 1]));
    toes.forEach((t, i) => {
      const xl = i > 0 ? clefts[i - 1][0] : -1000;
      const xr = i < clefts.length ? clefts[i][0] : 1000;
      // lit from the top left, falling into shade round the lower right, fading out up into the foot
      lobe(ctx, (c2) => {
        c2.beginPath();
        c2.ellipse(t.cx, t.cy, t.rx, t.ry, t.rot, 0, Math.PI * 2);
      }, { x: xl, y: t.cy - t.ry - 4, w: xr - xl, h: t.ry * 2 + 8 }, t.cy - t.ry * 0.75, t.cy - t.ry * 0.05, deep, 0.5, Math.max(6, t.rx * 0.42), 0.3);
      // rosy tip and knuckle
      const [px, py] = onToe(t, Math.PI / 2);
      spec(ctx, px + t.rx * 0.08, py - t.ry * 0.3, t.rx * 0.8, t.ry * 0.38, 0.18, t.rot, '#ff6450');
      const [kx, ky] = onToe(t, -Math.PI / 2);
      spec(ctx, kx, ky + t.ry * 0.55 + c * 3, t.rx * 0.55, t.ry * 0.28, 0.08 + c * 0.14, t.rot, '#ff7a60');
      if (c > 0.15) spec(ctx, kx - t.rx * 0.15, ky + t.ry * 0.45, t.rx * 0.45, t.ry * 0.2, 0.3 * c, -0.3, LIGHT.key);
      // knuckle creases (deeper as the toes curl)
      for (const f2 of [0.3, 0.48]) {
        const y = t.cy - t.ry * f2 + c * 4;
        crease(ctx, (c2) => {
          c2.moveTo(t.cx - t.rx * 0.36, y - 1);
          c2.quadraticCurveTo(t.cx, y + 2.5 + c * 2, t.cx + t.rx * 0.36, y - 1);
        }, 1.3, deep, 0.22 + c * 0.25, 0.2);
      }
    });
    // the clefts: a crease up from each notch, dark in the gap and lit on the next toe's edge
    for (const [kx, ky] of clefts) {
      const len = 24;
      const g = ctx.createLinearGradient(0, ky - len, 0, ky + 2);
      g.addColorStop(0, rgba(deep, 0));
      g.addColorStop(1, rgba(deep, 0.65));
      softStroke(ctx, (c2) => {
        c2.moveTo(kx, ky + 2);
        c2.quadraticCurveTo(kx - 1, ky - len * 0.5, kx - 2, ky - len);
      }, g, 3, 0.9);
      const l = ctx.createLinearGradient(0, ky - len, 0, ky);
      l.addColorStop(0, rgba(LIGHT.key, 0));
      l.addColorStop(1, rgba(LIGHT.key, 0.3));
      softStroke(ctx, (c2) => {
        c2.moveTo(kx + 3, ky - 1);
        c2.quadraticCurveTo(kx + 2, ky - len * 0.5, kx + 1, ky - len);
      }, l, 2, 0.8);
    }
    // nails
    if (o.nails !== null) for (const t of toes) toenail(ctx, t, o.nails, skin, c);
  }
  return f;
}

/** Outline the bare foot's silhouette and put it on the target (the top edge stays open under the leg). */
export function bareOutline(f: BareFoot, col = f.ink): void {
  f.sil.finish(col, { openTop: f.top + 1.5 });
}

export { crease };
