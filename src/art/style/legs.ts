// Legs for the style kit: one material helper per leg kind, lit like the feet (a cylinder under the one top-left
// light, a cool rim on the right), textured, and tiling seamlessly downwards (Foot.ts tiles the leg as a tall
// TileSprite). Plus the joins that make leg and foot read as one form:
// - 'blend' (skin, fur, rock): the leg is the foot's own material and width; the foot's top fades into it;
// - 'hem' (trousers): a lit, curved trouser hem sits over the ankle and casts a soft shadow onto the foot;
// - 'into' (armour, boots with collars): a narrower leg goes down behind the foot's own collar.

import { type Ctx, makeCanvas, mix, rgba, shade } from '../util';
import { LIGHT, STYLE, inkOf, texture } from './kit';
import { MATERIALS } from './materials';

export type LegStyleKind = 'denim' | 'wool' | 'skin' | 'basalt' | 'fur' | 'iron' | 'knit';

export interface LegSpec {
  kind: LegStyleKind;
  /** Half width of the leg (design units): for 'blend' the foot's half width at its top. */
  hw: number;
  join: 'blend' | 'hem' | 'into';
  /** 'blend': how far (design units) the foot's top fades into the leg. */
  fade?: number;
  /** Design y where the leg ends inside the foot (default: by join). */
  end?: number;
}

/** The leg tile's height in texture pixels: a multiple of the material textures' 128 px period, so it tiles. */
const TILE_PX = 512;
const PAD = 4;

function ramp(ctx: Ctx, x0: number, w: number, base: string, tint: string, sheen = 0.2): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
  g.addColorStop(0, shade(base, -0.12));
  g.addColorStop(0.22, shade(base, sheen));
  g.addColorStop(0.5, base);
  g.addColorStop(0.84, mix(shade(base, -0.42), tint, 0.3));
  g.addColorStop(0.95, shade(base, -0.3));
  g.addColorStop(1, mix(base, LIGHT.rim, 0.35));
  return g;
}

/** Draw `fn` three times, a tile apart, so anything crossing the tile's top or bottom wraps round. */
function wrap(ctx: Ctx, H: number, fn: () => void): void {
  for (const dy of [-H, 0, H]) {
    ctx.save();
    ctx.translate(0, dy);
    fn();
    ctx.restore();
  }
}

/** A seeded random (deterministic art). */
function seeded(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a * 16807) % 2147483647;
    return a / 2147483647;
  };
}

function legDetail(ctx: Ctx, kind: LegStyleKind, x0: number, w: number, H: number, base: string, accent: string | undefined): void {
  const r = seeded(kind.length * 977 + Math.round(w));
  const box = { x: x0, y: 0, w, h: H };
  switch (kind) {
    case 'denim': {
      texture(ctx, 'canvas', box, 0.35, 1);
      // the twill: fine diagonal lines, spaced to tile
      const n = Math.round(H / 3.2);
      const sp = H / n;
      ctx.strokeStyle = rgba('#ffffff', 0.07);
      ctx.lineWidth = 0.8;
      for (let i = -Math.ceil(w / sp); i < n + 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x0, i * sp);
        ctx.lineTo(x0 + w, i * sp - w);
        ctx.stroke();
      }
      // outseams with orange stitching, and soft folds
      for (const sx of [x0 + 7, x0 + w - 7]) {
        ctx.strokeStyle = rgba('#000000', 0.25);
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, H);
        ctx.stroke();
        ctx.save();
        const d = H / Math.round(H / 7);
        ctx.setLineDash([d * 0.6, d * 0.4]);
        ctx.strokeStyle = '#e7a94a';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(sx + 2.5, 0);
        ctx.lineTo(sx + 2.5, H);
        ctx.stroke();
        ctx.restore();
      }
      folds(ctx, x0, w, H, base, 3);
      break;
    }
    case 'wool': {
      texture(ctx, 'grain', box, 0.35, 1);
      // a pressed crease down the front
      const cx = x0 + w * 0.46;
      ctx.fillStyle = rgba(LIGHT.key, 0.16);
      ctx.fillRect(cx - 2, 0, 3, H);
      ctx.fillStyle = rgba('#000000', 0.16);
      ctx.fillRect(cx + 1, 0, 4, H);
      folds(ctx, x0, w, H, base, 2);
      break;
    }
    case 'knit': {
      texture(ctx, 'knit', box, 0.55, 1.6);
      break;
    }
    case 'skin': {
      texture(ctx, 'pores', box, 0.22, 1, 'soft-light');
      // gentle tone variation, wrapped so it tiles
      wrap(ctx, H, () => {
        for (let i = 0; i < 6; i++) {
          const x = x0 + r() * w;
          const y = r() * H;
          const g = ctx.createRadialGradient(x, y, 0, x, y, 14 + r() * 16);
          g.addColorStop(0, rgba(i % 2 ? '#ff7a6a' : '#000000', 0.06));
          g.addColorStop(1, rgba('#000000', 0));
          ctx.fillStyle = g;
          ctx.fillRect(x - 32, y - 32, 64, 64);
        }
      });
      break;
    }
    case 'basalt': {
      texture(ctx, 'stone', box, 0.5, 1.3);
      texture(ctx, 'cast', box, 0.3, 1, 'soft-light');
      // cracks that run the leg's length (start and end at the same x, so they tile), glowing
      for (let k = 0; k < 2; k++) {
        const xs = x0 + w * (0.3 + k * 0.38);
        const pts: [number, number][] = [];
        const n = 8;
        for (let i = 0; i <= n; i++) pts.push([xs + (i === 0 || i === n ? 0 : (r() - 0.5) * 16), (i / n) * H]);
        const path = () => {
          ctx.beginPath();
          pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        };
        ctx.save();
        ctx.lineJoin = 'round';
        path();
        ctx.strokeStyle = rgba('#120604', 0.8);
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.shadowColor = '#ff6a10';
        ctx.shadowBlur = 8;
        path();
        ctx.strokeStyle = '#ff8a1a';
        ctx.lineWidth = 2.4;
        ctx.stroke();
        ctx.shadowBlur = 0;
        path();
        ctx.strokeStyle = '#ffe27a';
        ctx.lineWidth = 0.9;
        ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case 'fur': {
      texture(ctx, 'grain', box, 0.3);
      // strands flowing down, wrapped so they tile; lit tips on the left
      wrap(ctx, H, () => {
        ctx.lineCap = 'round';
        for (let i = 0; i < (w * H) / 22; i++) {
          const x = x0 + r() * w;
          const y = r() * H;
          const l = 8 + r() * 10;
          const u = (x - x0) / w;
          const t = r();
          const col = t < 0.35 ? shade(base, -0.5) : t < 0.8 ? shade(base, -0.12) : shade(base, 0.4);
          ctx.strokeStyle = rgba(col, (0.35 + r() * 0.45) * (col === shade(base, 0.4) ? 1 - u * 0.8 : 1));
          ctx.lineWidth = 1 + r() * 1.4;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + 2, y + l * 0.5, x + (u - 0.5) * 6, y + l);
          ctx.stroke();
        }
      });
      break;
    }
    case 'iron': {
      texture(ctx, 'cast', box, 0.5, 1.2);
      // banded segments with rivets (four to a tile), and the amber service light down one side
      const n = 4;
      for (let i = 0; i < n; i++) {
        const y = (i / n) * H;
        ctx.fillStyle = rgba('#000000', 0.35);
        ctx.fillRect(x0, y, w, 3);
        ctx.fillStyle = rgba(LIGHT.key, 0.18);
        ctx.fillRect(x0, y + 3, w, 1.5);
        for (const fx of [0.2, 0.5, 0.8]) {
          const rx = x0 + w * fx;
          const g = ctx.createRadialGradient(rx - 1, y + 9, 0.3, rx, y + 10, 3.4);
          g.addColorStop(0, '#d8dee8');
          g.addColorStop(1, '#3a3e46');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(rx, y + 10, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (accent) {
        const ax = x0 + w * 0.72;
        ctx.save();
        ctx.shadowColor = accent;
        ctx.shadowBlur = 10;
        ctx.fillStyle = accent;
        ctx.fillRect(ax, 0, 4, H);
        ctx.restore();
        ctx.fillStyle = rgba('#fff4c0', 0.8);
        ctx.fillRect(ax + 1, 0, 1.4, H);
      }
      break;
    }
  }
}

/** Soft cloth folds across the leg (n to a tile). */
function folds(ctx: Ctx, x0: number, w: number, H: number, base: string, n: number): void {
  for (let i = 0; i < n; i++) {
    const y = ((i + 0.4) / n) * H;
    const g = ctx.createLinearGradient(0, y - 6, 0, y + 6);
    g.addColorStop(0, rgba(shade(base, 0.4), 0));
    g.addColorStop(0.45, rgba(shade(base, 0.35), 0.18));
    g.addColorStop(0.6, rgba('#000000', 0.16));
    g.addColorStop(1, rgba('#000000', 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0, y - 6);
    ctx.quadraticCurveTo(x0 + w / 2, y - 1, x0 + w, y - 8);
    ctx.lineTo(x0 + w, y + 6);
    ctx.quadraticCurveTo(x0 + w / 2, y + 11, x0, y + 6);
    ctx.fill();
  }
}

const TINT: Record<LegStyleKind, string> = {
  denim: '#101838',
  wool: '#1a1430',
  knit: MATERIALS.knit.shadowTint,
  skin: MATERIALS.skin.shadowTint,
  basalt: '#2a0a18',
  fur: '#141428',
  iron: MATERIALS.iron.shadowTint,
};

/** A styled leg tile at s texels per design unit: (2·hw + outline) wide, tiling downwards. */
export function styledLeg(spec: LegSpec, base: string, accent: string | undefined, s: number): HTMLCanvasElement {
  const H = TILE_PX / s;
  const W = spec.hw * 2 + PAD * 2;
  const [c, ctx] = makeCanvas(W * s, TILE_PX);
  ctx.scale(s, s);
  const x0 = PAD;
  const w = spec.hw * 2;
  ctx.fillStyle = ramp(ctx, x0, w, base, TINT[spec.kind], spec.kind === 'iron' ? 0.35 : 0.2);
  ctx.fillRect(x0, 0, w, H);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, 0, w, H);
  ctx.clip();
  legDetail(ctx, spec.kind, x0, w, H, base, accent);
  // the cylinder's shading over the detail: light on the left, rim on the right
  const sh = ctx.createLinearGradient(x0, 0, x0 + w, 0);
  sh.addColorStop(0, rgba('#000000', 0.12));
  sh.addColorStop(0.25, rgba(LIGHT.key, 0.1));
  sh.addColorStop(0.55, rgba('#000000', 0));
  sh.addColorStop(0.9, rgba('#000000', 0.22));
  sh.addColorStop(1, rgba(LIGHT.rim, 0.25));
  ctx.fillStyle = sh;
  ctx.fillRect(x0, 0, w, H);
  ctx.restore();
  // the outline: the same weight and ink as the foot's, just outside the leg
  const ink = inkOf(base);
  const ow = STYLE.outline * 0.62;
  ctx.fillStyle = ink;
  ctx.fillRect(x0 - ow, 0, ow, H);
  ctx.fillRect(x0 + w, 0, ow, H);
  return c;
}

/** A trouser hem over the ankle: the leg's cloth turned up, its bottom edge curving round the leg, a soft shadow
 * cast onto the foot below. Drawn centred, (2·hw + pad) × 44 design units, spanning design y −18…26. */
export function styledHem(spec: LegSpec, base: string, s: number): HTMLCanvasElement {
  const W = spec.hw * 2 + PAD * 2 + 8;
  const Hh = 44;
  const [c, ctx] = makeCanvas(W * s, Hh * s);
  ctx.scale(s, s);
  const x0 = PAD + 4;
  const w = spec.hw * 2;
  const bottom = (cx: Ctx, dy = 0) => {
    cx.moveTo(x0, 30 + dy);
    cx.quadraticCurveTo(x0 + w / 2, 40 + dy, x0 + w, 30 + dy);
  };
  // the shadow it casts onto the foot
  ctx.save();
  ctx.filter = `blur(${3 * s}px)`;
  ctx.fillStyle = rgba(LIGHT.ao, 0.45);
  ctx.beginPath();
  bottom(ctx, 3);
  ctx.lineTo(x0 + w - 4, 24);
  ctx.lineTo(x0 + 4, 24);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const hem = (cx: Ctx) => {
    cx.beginPath();
    cx.moveTo(x0, 0);
    cx.lineTo(x0 + w, 0);
    cx.lineTo(x0 + w, 30);
    cx.quadraticCurveTo(x0 + w / 2, 40, x0, 30);
    cx.closePath();
  };
  ctx.save();
  hem(ctx);
  ctx.clip();
  ctx.fillStyle = ramp(ctx, x0, w, base, TINT[spec.kind]);
  ctx.fillRect(x0, 0, w, Hh);
  legDetail(ctx, spec.kind === 'denim' ? 'denim' : 'wool', x0, w, Hh, base, undefined);
  // the turn-up: a fold line, lit on its lip, and the double stitch of the hem
  ctx.fillStyle = rgba('#000000', 0.25);
  ctx.beginPath();
  ctx.moveTo(x0, 16);
  ctx.quadraticCurveTo(x0 + w / 2, 25, x0 + w, 16);
  ctx.lineTo(x0 + w, 19);
  ctx.quadraticCurveTo(x0 + w / 2, 28, x0, 19);
  ctx.fill();
  ctx.strokeStyle = rgba(LIGHT.key, 0.3);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x0, 20);
  ctx.quadraticCurveTo(x0 + w / 2, 29, x0 + w, 20);
  ctx.stroke();
  if (spec.kind === 'denim') {
    ctx.setLineDash([3, 2.4]);
    ctx.strokeStyle = '#e7a94a';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x0, 25);
    ctx.quadraticCurveTo(x0 + w / 2, 34, x0 + w, 25);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // the bottom edge catches the light
  ctx.strokeStyle = rgba(LIGHT.key, 0.35);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  bottom(ctx, -1.5);
  ctx.stroke();
  ctx.restore();
  // its outline (sides and bottom; the top melts into the leg)
  ctx.strokeStyle = inkOf(base);
  ctx.lineWidth = STYLE.outline;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, 0);
  ctx.lineTo(x0, 30);
  ctx.quadraticCurveTo(x0 + w / 2, 40, x0 + w, 30);
  ctx.lineTo(x0 + w, 0);
  ctx.stroke();
  // fade the top into the leg tile behind it
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(0, 0, 0, 10 * s);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, 10 * s);
  return c;
}

/** Fade a styled foot texture's top into its leg ('blend' joins): erase from the top edge down `fade` units.
 * The canvas is in the foot texture's frame (design y −padY at its top). */
export function fadeFootTop(c: HTMLCanvasElement, s: number, padY: number, fade: number): void {
  const ctx = c.getContext('2d')!;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'destination-out';
  const y0 = (padY - 6) * s;
  const y1 = (padY - 6 + fade) * s;
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.35, 'rgba(0,0,0,.7)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, y1);
  ctx.restore();
}

/** Where the leg ends inside the foot (design y) for a join. */
export function legEnd(spec: LegSpec): number {
  return spec.end ?? (spec.join === 'blend' ? -6 + (spec.fade ?? 22) + 8 : spec.join === 'hem' ? 8 : 14);
}
