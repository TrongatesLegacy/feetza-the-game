// Legs for the style kit: one material helper per leg kind, lit like the feet (a cylinder under the one top-left
// light, a cool rim on the right), textured, and tiling seamlessly downwards (Foot.ts tiles the leg as a tall
// TileSprite). Plus the joins that make leg and foot read as one form:
// - 'blend' (skin, fur, rock): the leg is the foot's own material and width; the foot's top fades into it;
// - 'hem' (trousers): a lit, curved trouser hem sits over the ankle and casts a soft shadow onto the foot;
// - 'into' (armour, boots with collars): a narrower leg goes down behind the foot's own collar.

import { type Ctx, makeCanvas, mix, rgba, shade } from '../util';
import { LIGHT, STYLE, inkOf, texture } from './kit';
import { MATERIALS } from './materials';

/** The built-in leg materials, plus any registered with registerLegKind. 'tights' is smooth nylon with a sheen,
 * 'plate' polished armour, 'scales' a scaly hide. */
export type LegStyleKind = 'denim' | 'wool' | 'skin' | 'basalt' | 'fur' | 'iron' | 'knit' | 'tights' | 'plate' | 'scales' | (string & {});

/** A pattern laid over a leg's material, tiling seamlessly: sport-sock stripes, wide hoops (stripy tights), argyle,
 * polka dots, rainbow toe-sock stripes, criss-cross ballet ribbons, quilted puffer panels, bandage wraps. */
export type LegPattern = 'none' | 'stripes' | 'hoops' | 'argyle' | 'dots' | 'rainbow' | 'ribbon' | 'quilt' | 'bandage';

export interface LegSpec {
  kind: LegStyleKind;
  /** Half width of the leg (design units): for 'blend' the foot's half width at its top. */
  hw: number;
  join: 'blend' | 'hem' | 'into';
  /** 'blend': how far (design units) the foot's top fades into the leg. */
  fade?: number;
  /** 'blend': the half width the fade covers (default hw; it reaches 16 units further with a soft edge, and art
   * beyond keeps its top). */
  fadeSpan?: number;
  /** Design y where the leg ends inside the foot (default: by join). */
  end?: number;
  /** The leg's colour (default: from the foot's art, as its old leg had it). */
  color?: string;
  /** Its accent: the pattern's colour, an iron leg's service light (default: from the foot's art). */
  accent?: string;
  /** A pattern over the material (default: the old leg's pattern, if it had one). */
  pattern?: LegPattern;
  /** Iron legs: light the accent as a glowing strip (default true). */
  glow?: boolean;
}

/** A leg material of your own: paint its detail over the base ramp in the tile (x0…x0+w, 0…H; anything that
 * crosses the tile's top or bottom must wrap, see wrapTile). */
export interface LegKindDef {
  /** The colour its shadows go to. */
  tint: string;
  /** How bright the lit side gets (0…1, default 0.2). */
  sheen?: number;
  draw(ctx: Ctx, x0: number, w: number, H: number, base: string, accent: string | undefined): void;
  /** A leg that isn't a clean cylinder (a twisted rope of dough): how far its left and right edges sit in from the
   * leg's full width at design y (0…H), in design units. It must repeat every H so the tile wraps; the outline
   * follows it. */
  edge?(y: number, H: number): [number, number];
  /** The kind lights the leg itself (its own ramp, light and rim): skip the shared ramp and cylinder shading. */
  ownShading?: boolean;
  /** Tile this many times the usual height (an irregular pattern that should repeat less often; default 1). */
  tile?: number;
}

const customKinds: Record<string, LegKindDef> = {};

/** Add a leg material (use it as a LegSpec kind). */
export function registerLegKind(name: string, def: LegKindDef): void {
  customKinds[name] = def;
}

const legOverrides: Record<string, Partial<LegSpec>> = {};

/** Change one foot's styled leg (kind, colour, accent, pattern…) without touching its style: merged over its
 * style's leg spec. */
export function registerLeg(footId: string, o: Partial<LegSpec>): void {
  legOverrides[footId] = { ...legOverrides[footId], ...o };
}

/** A foot's leg spec with its overrides (registerLeg) merged in. */
export function legOverride(footId: string): Partial<LegSpec> | undefined {
  return legOverrides[footId];
}

/** Draw `fn` three times, a tile apart, so anything crossing the tile's top or bottom wraps round (for leg kinds). */
export function wrapTile(ctx: Ctx, H: number, fn: () => void): void {
  wrap(ctx, H, fn);
}

/** Hue (0…360), saturation and lightness (0…1) of a #rrggbb colour. */
function hsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  const d = mx - mn;
  if (d < 1e-6) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

/** Is this a human skin tone (warm orange-brown hues)? Its shadows may go subsurface red; any other colour's go
 * to a deeper shade of itself. */
export function humanSkin(hex: string): boolean {
  const [h, s] = hsl(hex);
  return h >= 8 && h <= 42 && s > 0.18 && s < 0.85;
}

/** The colour a skin-like material's shadows go to: red for human skin, otherwise its own deep shade. */
export function skinTint(base: string): string {
  return humanSkin(base) ? MATERIALS.skin.shadowTint : mix(shade(base, -0.55), '#1a1830', 0.25);
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

function legDetail(ctx: Ctx, kind: LegStyleKind, x0: number, w: number, H: number, base: string, accent: string | undefined, glowStrip: boolean): void {
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
      // gentle tone variation, wrapped so it tiles: a warm flush on human skin, the foot's own darker and lighter
      // tones on anything else (stone, scales, green, blue or ghostly skins)
      const human = humanSkin(base);
      const warm = human ? '#ff7a6a' : shade(base, 0.25);
      const deep = human ? '#000000' : shade(base, -0.45);
      wrap(ctx, H, () => {
        for (let i = 0; i < 6; i++) {
          const x = x0 + r() * w;
          const y = r() * H;
          const g = ctx.createRadialGradient(x, y, 0, x, y, 14 + r() * 16);
          g.addColorStop(0, rgba(i % 2 ? warm : deep, human ? 0.06 : 0.09));
          g.addColorStop(1, rgba(deep, 0));
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
      texture(ctx, 'grain', box, 0.2);
      // a coat of soft locks lying down the leg like shingles, staggered row by row: each lock dark at its root,
      // lighter to its tip, a few strands combed into it, lit on the left of the leg. Laid out once, then drawn a
      // tile above and below as well, so the tile wraps seamlessly.
      const locks: [number, number, number, number, number, number][] = [];
      const rowH = 13;
      const rows = Math.max(1, Math.round(H / rowH));
      const dy = H / rows;
      const n = Math.max(3, Math.round(w / 12));
      for (let j = 0; j < rows; j++)
        for (let i = 0; i <= n; i++) {
          const x = x0 + ((i + (j % 2) * 0.5 + (r() - 0.5) * 0.6) / n) * w;
          const u = Math.min(1, Math.max(0, (x - x0) / w));
          locks.push([x, j * dy + (r() - 0.5) * 8, u, 18 + r() * 12, 5 + r() * 3.5, (u - 0.5) * 6 + (r() - 0.5) * 5]);
        }
      wrap(ctx, H, () => {
        ctx.lineCap = 'round';
        for (const [x, y, u, l, lw, bend] of locks) {
          const lg = ctx.createLinearGradient(0, y, 0, y + l);
          lg.addColorStop(0, rgba(shade(base, -0.45), 0.9));
          lg.addColorStop(0.6, rgba(shade(base, -0.05 + (0.5 - u) * 0.25), 0.95));
          lg.addColorStop(1, rgba(shade(base, 0.08 + (0.5 - u) * 0.35), 0.9));
          ctx.fillStyle = lg;
          ctx.beginPath();
          ctx.moveTo(x - lw, y);
          ctx.quadraticCurveTo(x - lw * 0.8 + bend * 0.4, y + l * 0.6, x + bend, y + l);
          ctx.quadraticCurveTo(x + lw * 0.8 + bend * 0.4, y + l * 0.6, x + lw, y);
          ctx.closePath();
          ctx.fill();
          // strands combed into the lock, the lit ones on the light side
          for (let k = -1; k <= 1; k++) {
            const lit = k < 0 && u < 0.6;
            ctx.strokeStyle = rgba(lit ? shade(base, 0.45) : shade(base, -0.4), lit ? 0.35 * (1 - u) : 0.3);
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(x + k * lw * 0.45, y + 1);
            ctx.quadraticCurveTo(x + k * lw * 0.4 + bend * 0.4, y + l * 0.55, x + bend + k * 0.8, y + l - 1);
            ctx.stroke();
          }
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
      if (accent && glowStrip) {
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
    case 'tights': {
      // smooth nylon: a faint fine grain and a long soft sheen down the lit side
      texture(ctx, 'grain', box, 0.12, 1, 'soft-light');
      const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
      g.addColorStop(0, rgba('#ffffff', 0));
      g.addColorStop(0.2, rgba('#ffffff', 0.05));
      g.addColorStop(0.3, rgba('#ffffff', 0.26));
      g.addColorStop(0.38, rgba('#ffffff', 0.06));
      g.addColorStop(0.5, rgba('#ffffff', 0));
      g.addColorStop(1, rgba('#ffffff', 0));
      ctx.fillStyle = g;
      ctx.fillRect(x0, 0, w, H);
      break;
    }
    case 'plate': {
      // a polished greave: banded reflections down its length, plate joints with a trim (four to a tile)
      texture(ctx, 'brushed', box, 0.16, 1);
      const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
      g.addColorStop(0, rgba('#000000', 0.2));
      g.addColorStop(0.16, rgba('#ffffff', 0.08));
      g.addColorStop(0.27, rgba('#ffffff', 0.5));
      g.addColorStop(0.33, rgba('#ffffff', 0.12));
      g.addColorStop(0.55, rgba('#000000', 0.12));
      g.addColorStop(0.7, rgba('#ffffff', 0.14));
      g.addColorStop(0.86, rgba('#000000', 0.3));
      g.addColorStop(1, rgba('#000000', 0.1));
      ctx.fillStyle = g;
      ctx.fillRect(x0, 0, w, H);
      const n = Math.max(1, Math.round(H / 64));
      for (let i = 0; i < n; i++) {
        const y = ((i + 0.5) / n) * H;
        // the joint: the plate above overlaps the one below and casts onto it
        const sh = ctx.createLinearGradient(0, y, 0, y + 7);
        sh.addColorStop(0, rgba('#000000', 0.4));
        sh.addColorStop(1, rgba('#000000', 0));
        ctx.fillStyle = sh;
        ctx.fillRect(x0, y, w, 7);
        if (accent) {
          ctx.fillStyle = ramp(ctx, x0, w, accent, '#2a1408', 0.4);
          ctx.fillRect(x0, y - 5, w, 4.5);
          ctx.fillStyle = rgba('#fff6d8', 0.55);
          ctx.fillRect(x0, y - 5, w, 1);
        }
        ctx.fillStyle = rgba(LIGHT.key, 0.45);
        ctx.fillRect(x0, y - 0.6, w, 1.1);
      }
      break;
    }
    case 'scales': {
      texture(ctx, 'scales', box, 0.45, 1.5);
      // rows of lit scale edges, offset row by row, spaced to tile
      const rows = Math.max(2, Math.round(H / 11));
      const sp = H / rows;
      const sw = 14;
      ctx.lineCap = 'round';
      for (let j = 0; j <= rows; j++) {
        const y = j * sp;
        const off = j % 2 ? sw / 2 : 0;
        for (let x = x0 - sw + off; x < x0 + w + sw; x += sw) {
          ctx.strokeStyle = rgba(shade(base, -0.5), 0.5);
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(x, y, sw / 2, 0.15, Math.PI - 0.15);
          ctx.stroke();
          ctx.strokeStyle = rgba(shade(base, 0.45), 0.3);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x - 0.6, y + 1.6, sw / 2 - 2, Math.PI * 0.75, Math.PI * 0.95);
          ctx.stroke();
        }
      }
      break;
    }
    default:
      customKinds[kind]?.draw(ctx, x0, w, H, base, accent);
  }
}

/** Lay a leg's pattern in the tile, lit like the cylinder (the material's texture and shading go over it). */
function legPattern(ctx: Ctx, pat: LegPattern, x0: number, w: number, H: number, base: string, accent: string): void {
  // a pattern's period must divide the tile so it wraps: the nearest that does to the one wanted
  const per = (want: number) => H / Math.max(1, Math.round(H / want));
  const lit = (col: string) => ramp(ctx, x0, w, col, mix(shade(col, -0.5), '#1a1830', 0.3), 0.22);
  // a band round the leg: it bows down a little in the middle, as round as the leg is
  const band = (y: number, h: number, col: string | CanvasGradient) => {
    const sag = 2.2;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x0 - 1, y);
    ctx.quadraticCurveTo(x0 + w / 2, y + sag * 2, x0 + w + 1, y);
    ctx.lineTo(x0 + w + 1, y + h);
    ctx.quadraticCurveTo(x0 + w / 2, y + h + sag * 2, x0 - 1, y + h);
    ctx.closePath();
    ctx.fill();
  };
  ctx.save();
  switch (pat) {
    case 'stripes': {
      // sport-sock stripes: a broad one and a thin one to each repeat (the old legs': 16 and 6 units in 64)
      const p = per(64);
      const k = p / 64;
      wrap(ctx, H, () => {
        for (let y = 0; y < H - 0.5; y += p) {
          band(y + 8 * k, 16 * k, lit(accent));
          band(y + 36 * k, 6 * k, lit(accent));
        }
      });
      break;
    }
    case 'hoops': {
      const p = per(32);
      wrap(ctx, H, () => {
        for (let y = 0; y < H - 0.5; y += p) band(y, p / 2, lit(accent));
      });
      break;
    }
    case 'rainbow': {
      const cols = ['#ff4d6d', '#ff9f1c', '#ffd23f', '#3ddc97', '#4cc9f0', '#7b5cff'];
      const n = Math.max(6, Math.round(H / 16 / 6) * 6);
      const p = H / n;
      wrap(ctx, H, () => {
        for (let i = 0; i < n; i++) band(i * p, p * 0.55, lit(cols[i % cols.length]));
      });
      break;
    }
    case 'argyle': {
      // diamonds two across, in the accent and a deeper shade of the base, with a light overcheck
      const dw = w / 2;
      const dh = per(dw * 1.5);
      const deepC = mix(shade(base, -0.35), accent, 0.15);
      const rows = Math.round(H / dh);
      const diamond = (cx: number, cy: number, col: string | CanvasGradient) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(cx, cy - dh / 2);
        ctx.lineTo(cx + dw / 2, cy);
        ctx.lineTo(cx, cy + dh / 2);
        ctx.lineTo(cx - dw / 2, cy);
        ctx.closePath();
        ctx.fill();
      };
      wrap(ctx, H, () => {
        for (let j = 0; j < rows; j++)
          for (let i = -1; i <= 2; i++) {
            const off = j % 2 ? dw / 2 : 0;
            diamond(x0 + dw / 2 + i * dw + off, j * dh + dh / 2, (i + j) % 2 ? lit(accent) : lit(deepC));
          }
        ctx.strokeStyle = rgba(mix(accent, '#ffffff', 0.55), 0.75);
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 2.5]);
        for (let j = 0; j < rows; j++)
          for (let i = -2; i <= 3; i++) {
            const x = x0 + i * dw;
            ctx.beginPath();
            ctx.moveTo(x, j * dh);
            ctx.lineTo(x + dw, (j + 1) * dh);
            ctx.moveTo(x + dw, j * dh);
            ctx.lineTo(x, (j + 1) * dh);
            ctx.stroke();
          }
        ctx.setLineDash([]);
      });
      break;
    }
    case 'dots': {
      const p = per(Math.max(18, w * 0.42));
      const rows = Math.round(H / p);
      const rr = Math.min(p * 0.26, 9);
      wrap(ctx, H, () => {
        for (let j = 0; j < rows; j++) {
          const off = j % 2 ? p / 2 : 0;
          for (let x = x0 - p + off; x < x0 + w + p; x += p) {
            const y = j * p + p / 2;
            // a dot on a round leg narrows towards its sides
            const u = (x - x0) / w;
            const squeeze = Math.max(0.35, Math.sin(Math.max(0.05, Math.min(0.95, u)) * Math.PI));
            const g = ctx.createRadialGradient(x - rr * 0.3, y - rr * 0.35, rr * 0.1, x, y, rr);
            g.addColorStop(0, mix(accent, '#ffffff', 0.35));
            g.addColorStop(0.7, accent);
            g.addColorStop(1, shade(accent, -0.25));
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(x, y, rr * squeeze, rr, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
      break;
    }
    case 'ribbon': {
      // ballet ribbons criss-crossing up the leg, lit along their edges
      const p = per(w * 1.1);
      const rw = 7;
      wrap(ctx, H, () => {
        ctx.lineCap = 'butt';
        for (let y = 0; y < H - 0.5; y += p)
          for (const [a, b] of [[0, 1], [1, 0]] as const) {
            ctx.strokeStyle = rgba('#000000', 0.22);
            ctx.lineWidth = rw + 2.5;
            ctx.beginPath();
            ctx.moveTo(x0 + a * w, y + 1.5);
            ctx.lineTo(x0 + b * w, y + p + 1.5);
            ctx.stroke();
            ctx.strokeStyle = accent;
            ctx.lineWidth = rw;
            ctx.beginPath();
            ctx.moveTo(x0 + a * w, y);
            ctx.lineTo(x0 + b * w, y + p);
            ctx.stroke();
            ctx.strokeStyle = rgba(mix(accent, '#ffffff', 0.6), 0.7);
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(x0 + a * w, y - rw * 0.32);
            ctx.lineTo(x0 + b * w, y + p - rw * 0.32);
            ctx.stroke();
          }
      });
      break;
    }
    case 'quilt': {
      // puffer panels: stitched seams round the leg, each panel puffed (lit at the top, shaded at its seam)
      const p = per(30);
      wrap(ctx, H, () => {
        for (let y = 0; y < H - 0.5; y += p) {
          const g = ctx.createLinearGradient(0, y, 0, y + p);
          g.addColorStop(0, rgba('#000000', 0.22));
          g.addColorStop(0.18, rgba('#ffffff', 0.16));
          g.addColorStop(0.45, rgba('#ffffff', 0.06));
          g.addColorStop(0.85, rgba('#000000', 0.1));
          g.addColorStop(1, rgba('#000000', 0.3));
          band(y, p, g);
          ctx.strokeStyle = rgba(shade(base, -0.5), 0.6);
          ctx.lineWidth = 1.2;
          ctx.setLineDash([2.6, 2.2]);
          ctx.beginPath();
          ctx.moveTo(x0, y + 1);
          ctx.quadraticCurveTo(x0 + w / 2, y + 5.4, x0 + w, y + 1);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
      if (accent && accent !== base) {
        // the side stripe down the leg
        const ax = x0 + w * 0.68;
        ctx.fillStyle = lin(ctx, ax, 0, ax + 10, 0, accent);
        ctx.fillRect(ax, 0, 10, H);
      }
      break;
    }
    case 'bandage': {
      // linen wraps spiralling up, overlapping, each a little lighter or darker, with frayed edges
      const p = per(15);
      const n = Math.round(H / p);
      wrap(ctx, H, () => {
        for (let i = 0; i < n; i++) {
          const y = i * p;
          ctx.save();
          ctx.translate(x0 + w / 2, y);
          ctx.rotate(-0.22);
          ctx.fillStyle = mix(base, i % 3 === 1 ? '#ffffff' : '#000000', i % 3 === 1 ? 0.12 : (i % 3) * 0.06);
          ctx.fillRect(-w, -p * 0.55, w * 2, p * 1.1);
          // the wrap's lower edge casts a shadow on the one below, its top edge catches the light
          ctx.fillStyle = rgba('#3a2c18', 0.38);
          ctx.fillRect(-w, p * 0.5, w * 2, 2);
          ctx.fillStyle = rgba('#fffbea', 0.3);
          ctx.fillRect(-w, -p * 0.55, w * 2, 1.2);
          ctx.restore();
        }
      });
      break;
    }
  }
  ctx.restore();
}

/** A side-lit vertical strip gradient. */
function lin(ctx: Ctx, x0: number, _y0: number, x1: number, _y1: number, col: string): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, shade(col, -0.2));
  g.addColorStop(0.35, shade(col, 0.25));
  g.addColorStop(1, shade(col, -0.3));
  return g;
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

const TINT: Record<string, string> = {
  denim: '#101838',
  wool: '#1a1430',
  knit: MATERIALS.knit.shadowTint,
  basalt: '#2a0a18',
  fur: '#141428',
  iron: MATERIALS.iron.shadowTint,
  tights: '#1a1430',
  plate: '#10121c',
  scales: '#102838',
};

/** Where a leg's shadows go: a skin leg's follow its own colour (skinTint), the rest their material's. */
function tintOf(kind: LegStyleKind, base: string): string {
  if (kind === 'skin') return skinTint(base);
  return TINT[kind] ?? customKinds[kind]?.tint ?? '#1a1430';
}

const SHEEN: Record<string, number> = { iron: 0.35, plate: 0.45, tights: 0.3, scales: 0.25 };

/** A styled leg tile at s texels per design unit: (2·hw + outline) wide, tiling downwards. */
export function styledLeg(spec: LegSpec, base: string, accent: string | undefined, s: number): HTMLCanvasElement {
  const kind = customKinds[spec.kind];
  const tilePx = Math.round(TILE_PX * (kind?.tile ?? 1));
  const H = tilePx / s;
  const W = spec.hw * 2 + PAD * 2;
  const [c, ctx] = makeCanvas(W * s, tilePx);
  ctx.scale(s, s);
  const x0 = PAD;
  const w = spec.hw * 2;
  const ink = inkOf(base);
  const ow = STYLE.outline * 0.62;
  // the leg's shape: a straight strip, or one whose edges wobble (a custom kind's edge()), sampled down the tile
  const shape = (grow: number) => {
    ctx.beginPath();
    if (!kind?.edge) {
      ctx.rect(x0 - grow, 0, w + grow * 2, H);
      return;
    }
    const n = Math.max(8, Math.round(H));
    for (let i = 0; i <= n; i++) {
      const y = (i / n) * H;
      ctx.lineTo(x0 + kind.edge(y, H)[0] - grow, y);
    }
    for (let i = n; i >= 0; i--) {
      const y = (i / n) * H;
      ctx.lineTo(x0 + w - kind.edge(y, H)[1] + grow, y);
    }
    ctx.closePath();
  };
  if (kind?.edge) {
    // the outline: the same weight and ink as the foot's, just outside the wobbly edge
    shape(ow);
    ctx.fillStyle = ink;
    ctx.fill();
  }
  ctx.save();
  shape(0);
  ctx.clip();
  if (!kind?.ownShading) {
    ctx.fillStyle = ramp(ctx, x0, w, base, tintOf(spec.kind, base), SHEEN[spec.kind] ?? kind?.sheen ?? 0.2);
    ctx.fillRect(x0, 0, w, H);
  }
  const acc = spec.accent ?? accent;
  // a pattern sits in the cloth: under its texture (knit stitches, denim twill) and the cylinder's shading
  const pat = spec.pattern ?? 'none';
  if (pat !== 'none' && acc) legPattern(ctx, pat, x0, w, H, base, acc);
  legDetail(ctx, spec.kind, x0, w, H, base, acc, spec.glow ?? true);
  if (!kind?.ownShading) {
    // the cylinder's shading over the detail: light on the left, rim on the right
    const sh = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    sh.addColorStop(0, rgba('#000000', 0.12));
    sh.addColorStop(0.25, rgba(LIGHT.key, 0.1));
    sh.addColorStop(0.55, rgba('#000000', 0));
    sh.addColorStop(0.9, rgba('#000000', 0.22));
    sh.addColorStop(1, rgba(LIGHT.rim, 0.25));
    ctx.fillStyle = sh;
    ctx.fillRect(x0, 0, w, H);
  }
  ctx.restore();
  if (!kind?.edge) {
    // the outline: the same weight and ink as the foot's, just outside the leg
    ctx.fillStyle = ink;
    ctx.fillRect(x0 - ow, 0, ow, H);
    ctx.fillRect(x0 + w, 0, ow, H);
  }
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
  ctx.fillStyle = ramp(ctx, x0, w, base, tintOf(spec.kind, base));
  ctx.fillRect(x0, 0, w, Hh);
  const pat = spec.pattern ?? 'none';
  if (pat !== 'none' && spec.accent) legPattern(ctx, pat, x0, w, Hh, base, spec.accent);
  legDetail(ctx, spec.kind === 'denim' ? 'denim' : 'wool', x0, w, Hh, base, undefined, false);
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

/** Fade a styled foot texture's top into its leg ('blend' joins): erase from the top edge down `fade` units, over
 * the leg's width (centre `cx`, half width `hw`, in texture design units from its left edge) and a margin, so art
 * well beside the leg (wings, ears, horns, tufts) keeps its top. Without hw, the whole width.
 * The canvas is in the foot texture's frame (design y −padY at its top). */
export function fadeFootTop(c: HTMLCanvasElement, s: number, padY: number, fade: number, cx?: number, hw?: number): void {
  const ctx = c.getContext('2d')!;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const y0 = (padY - 6) * s;
  const y1 = (padY - 6 + fade) * s;
  const [m, mx] = makeCanvas(c.width, Math.max(1, y1));
  const g = mx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.35, 'rgba(0,0,0,.7)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  mx.fillStyle = g;
  mx.fillRect(0, 0, m.width, m.height);
  if (cx !== undefined && hw !== undefined) {
    // over the leg and 16 units either side (the foot's flanks as they narrow into it), then a 12-unit soft edge
    const soft = 12;
    const l = (cx - hw - 16 - soft) * s;
    const r = (cx + hw + 16 + soft) * s;
    const h = mx.createLinearGradient(l, 0, r, 0);
    const e = Math.min(0.49, (soft * s) / Math.max(1, r - l));
    h.addColorStop(0, 'rgba(0,0,0,0)');
    h.addColorStop(e, 'rgba(0,0,0,1)');
    h.addColorStop(1 - e, 'rgba(0,0,0,1)');
    h.addColorStop(1, 'rgba(0,0,0,0)');
    mx.globalCompositeOperation = 'destination-in';
    mx.fillStyle = h;
    mx.fillRect(0, 0, m.width, m.height);
  }
  ctx.globalCompositeOperation = 'destination-out';
  ctx.drawImage(m, 0, 0);
  ctx.restore();
}

/** Where the leg ends inside the foot (design y) for a join. */
export function legEnd(spec: LegSpec): number {
  return spec.end ?? (spec.join === 'blend' ? -6 + (spec.fade ?? 22) + 8 : spec.join === 'hem' ? 8 : 14);
}
