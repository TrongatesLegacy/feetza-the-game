// Peel skins: every cosmetic peel is drawn from parts (head shape, material, pattern, emblem, studs, foil),
// so ~240 skins share one drawing routine. Canvas is 220x360 with the hotspot at (110, 100), same as the classic peel.

import type { LocationId } from './backdrops';
import { INK } from './feetCommon';
import { ellipse, makeCanvas, mix, rgba, rng, hashStr, roundRect, shade, type Ctx } from './util';

export type PeelShape = 'round' | 'oval' | 'square' | 'paddle' | 'spade';
export type PeelPattern =
  | 'grain'
  | 'plain'
  | 'stripes'
  | 'spots'
  | 'checker'
  | 'flames'
  | 'stars'
  | 'waves'
  | 'scales'
  | 'bolts'
  | 'drips'
  | 'marble'
  | 'circuit'
  | 'fur'
  | 'snow'
  | 'bubbles'
  | 'facets'
  | 'gems';

export interface PeelLook {
  shape: PeelShape;
  /** Head colours: light, mid, dark. */
  head: [string, string, string];
  handle: [string, string];
  pattern: PeelPattern;
  patternColor: string;
  /** A picture stamped in the middle of the head. */
  emblem?: CanvasImageSource | null;
  /** Foot and boss peels: the head IS the foot (toes up, handle at the heel), patterned and foiled. */
  footArt?: HTMLCanvasElement | null;
  /** The foot's emissive layer cut as footArt is, laid over it as a steady glow (alpha a): neon and magma feet. */
  footGlow?: { art: HTMLCanvasElement; a: number } | null;
  /** Objects more than feet (a jukebox, a riot shield): keep them upright instead of toes-up. */
  footUpright?: boolean;
  /** Pizza peels: the head IS the pizza (drawn as-is, not flipped). */
  pizzaArt?: HTMLCanvasElement | null;
  /** Round pizzas sit on a wooden board; square ones and calzones stand on their own. */
  pizzaRound?: boolean;
  /** Calzones: flipped so the flat edge sits on the hilt and the dome points up. */
  pizzaFlip?: boolean;
  /** Gold (or other) studs around the rim: bosses. */
  studs?: string;
  /** Outline colour (ink by default). */
  rim?: string;
  /** Glossy metal highlight. */
  metal?: boolean;
  /** Rainbow foil and sparkles. */
  shiny?: boolean;
  /** Trail colour in play. */
  trail: string;
  /** Colour of set stones for the 'gems' pattern and of facet lines. */
  gem?: string;
  /** Seed for the pattern's randomness. */
  seed: string;
  /** Hand-drawn heads (hero peels, src/art/heroHeads.ts): drawn over the handle instead of the parts above. */
  custom?: (ctx: Ctx) => void;
  /** Crafted peels (the Classic and the Golden Crust set, src/art/peelCraftArt.ts): the head is painted as this
   * material (and comes alive as it: src/art/peelCraft.ts). Its `custom` paints it. */
  craft?: CraftKind;
  /** Place peels (src/art/peelPlace.ts, craft 'place'): the location whose living miniature shows in the head's
   * window. */
  place?: LocationId;
  /** Pizza peels (src/art/peelPizza.ts, craft 'pizza'): the pizza whose pie sits on the head. */
  pizza?: string;
  /** Event peels (src/art/peelMedal.ts, craft 'event'): the wave event playing in the head's medallion. */
  event?: string;
  /** Act peels (src/art/peelMedal.ts, craft 'act'): the act whose places, boss and number the head's medallion
   *  carries. */
  act?: number;
  /** Gem peels (src/art/peelGem.ts, craft 'gem'): the stone or metal the head is made of (a jewel's own id). */
  jewel?: string;
}

/** The materials a crafted peel is made of ('place': a place peel's head with a window onto its location; 'pizza': a
 *  pizza peel's living pie on its board; 'event' and 'act': a medallion set into the head, its wave event or its
 *  act playing in it; 'gem': the jewellery box and the ultra-rares, cut stone, polished metal, pearl, opal). */
export type CraftKind = 'wood' | 'marble' | 'copper' | 'neon' | 'obsidian' | 'place' | 'pizza' | 'event' | 'act' | 'gem';

export const PEEL_W = 220;
export const PEEL_H = 360;
const HX = 110;
const HY = 100;
const R = 86;
/** The head's centre and radius on the 220×360 canvas (custom heads draw around it). */
export const PEEL_HEAD = { x: HX, y: HY, r: R };

export function headPath(ctx: Ctx, shape: PeelShape): void {
  ctx.beginPath();
  if (shape === 'round') {
    ctx.arc(HX, HY, R, Math.PI * 0.62, Math.PI * 2.38);
    ctx.lineTo(HX + 18, HY + R + 8);
    ctx.lineTo(HX - 18, HY + R + 8);
  } else if (shape === 'oval') {
    ctx.ellipse(HX, HY, R * 0.82, R * 1.04, 0, Math.PI * 0.6, Math.PI * 2.4);
    ctx.lineTo(HX + 16, HY + R * 1.04 + 8);
    ctx.lineTo(HX - 16, HY + R * 1.04 + 8);
  } else if (shape === 'square') {
    const t = HY - R + 4;
    const b = HY + R - 12;
    const r = 26;
    ctx.moveTo(HX - R + r, t);
    ctx.lineTo(HX + R - r, t);
    ctx.quadraticCurveTo(HX + R, t, HX + R, t + r);
    ctx.lineTo(HX + R, b - r);
    ctx.quadraticCurveTo(HX + R, b, HX + R - r, b);
    ctx.lineTo(HX + 22, b);
    ctx.lineTo(HX + 16, HY + R + 8);
    ctx.lineTo(HX - 16, HY + R + 8);
    ctx.lineTo(HX - 22, b);
    ctx.lineTo(HX - R + r, b);
    ctx.quadraticCurveTo(HX - R, b, HX - R, b - r);
    ctx.lineTo(HX - R, t + r);
    ctx.quadraticCurveTo(HX - R, t, HX - R + r, t);
  } else if (shape === 'paddle') {
    // wide flat top, sides tapering to the neck
    const t = HY - R + 6;
    ctx.moveTo(HX - R + 20, t);
    ctx.lineTo(HX + R - 20, t);
    ctx.quadraticCurveTo(HX + R + 4, t, HX + R, t + 30);
    ctx.bezierCurveTo(HX + R - 4, HY + 40, HX + 40, HY + R - 6, HX + 16, HY + R + 8);
    ctx.lineTo(HX - 16, HY + R + 8);
    ctx.bezierCurveTo(HX - 40, HY + R - 6, HX - R + 4, HY + 40, HX - R, t + 30);
    ctx.quadraticCurveTo(HX - R - 4, t, HX - R + 20, t);
  } else {
    // spade / shield: a pointed top and full shoulders
    ctx.moveTo(HX, HY - R - 4);
    ctx.bezierCurveTo(HX + 40, HY - R + 10, HX + R + 6, HY - 40, HX + R, HY + 6);
    ctx.bezierCurveTo(HX + R - 6, HY + 50, HX + 40, HY + R - 4, HX + 16, HY + R + 8);
    ctx.lineTo(HX - 16, HY + R + 8);
    ctx.bezierCurveTo(HX - 40, HY + R - 4, HX - R + 6, HY + 50, HX - R, HY + 6);
    ctx.bezierCurveTo(HX - R - 6, HY - 40, HX - 40, HY - R + 10, HX, HY - R - 4);
  }
  ctx.closePath();
}

function star(ctx: Ctx, x: number, y: number, r: number, points = 5, inner = 0.45, rot = -Math.PI / 2): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 ? r * inner : r;
    const a = rot + (i * Math.PI) / points;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function drawPattern(ctx: Ctx, look: PeelLook): void {
  const r = rng(hashStr(look.seed));
  const pc = look.patternColor;
  const x0 = HX - R - 10;
  const y0 = HY - R - 10;
  const w = R * 2 + 20;
  const h = R * 2 + 30;
  ctx.lineCap = 'round';
  switch (look.pattern) {
    case 'plain':
      break;
    case 'grain':
      ctx.strokeStyle = rgba(pc, 0.35);
      ctx.lineWidth = 2;
      for (let i = 0; i < 14; i++) {
        const x = x0 + 10 + i * 13 + r() * 6;
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.bezierCurveTo(x + 10, HY - 20, x - 10, HY + 20, x + 4, y0 + h);
        ctx.stroke();
      }
      break;
    case 'stripes':
      ctx.fillStyle = rgba(pc, 0.55);
      ctx.save();
      ctx.translate(HX, HY);
      ctx.rotate(-0.6);
      for (let i = -6; i <= 6; i += 2) ctx.fillRect(i * 16, -h, 16, h * 2);
      ctx.restore();
      break;
    case 'spots':
      ctx.fillStyle = rgba(pc, 0.6);
      for (let i = 0; i < 16; i++) {
        ellipse(ctx, x0 + r() * w, y0 + r() * h, 6 + r() * 12, 6 + r() * 10, r() * 3);
        ctx.fill();
      }
      break;
    case 'checker':
      ctx.fillStyle = rgba(pc, 0.5);
      for (let gx = 0; gx < 10; gx++) for (let gy = 0; gy < 11; gy++) if ((gx + gy) % 2) ctx.fillRect(x0 + gx * 20, y0 + gy * 20, 20, 20);
      break;
    case 'flames': {
      const base = HY + R + 10;
      for (let layer = 0; layer < 2; layer++) {
        ctx.fillStyle = layer ? rgba(shade(pc, 0.45), 0.8) : rgba(pc, 0.75);
        ctx.beginPath();
        ctx.moveTo(x0, base);
        const n = 7;
        for (let i = 0; i <= n; i++) {
          const x = x0 + (i / n) * w;
          const tip = base - (layer ? 60 : 100) - r() * (layer ? 30 : 50);
          ctx.quadraticCurveTo(x - 10, base - 30, x, tip);
          ctx.quadraticCurveTo(x + 6, base - 40, x + w / n / 2, base - 20);
        }
        ctx.lineTo(x0 + w, base);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'stars':
      ctx.fillStyle = rgba(pc, 0.75);
      for (let i = 0; i < 14; i++) {
        star(ctx, x0 + r() * w, y0 + r() * h, 5 + r() * 8, 5, 0.45, r() * 3);
        ctx.fill();
      }
      break;
    case 'waves':
      ctx.strokeStyle = rgba(pc, 0.6);
      ctx.lineWidth = 6;
      for (let row = 0; row < 8; row++) {
        const y = y0 + 12 + row * 24;
        ctx.beginPath();
        for (let x = x0; x <= x0 + w; x += 6) ctx.lineTo(x, y + Math.sin((x + row * 20) / 14) * 6);
        ctx.stroke();
      }
      break;
    case 'scales':
      ctx.strokeStyle = rgba(pc, 0.55);
      ctx.lineWidth = 3;
      for (let row = 0; row < 12; row++)
        for (let col = 0; col < 10; col++) {
          const x = x0 + col * 22 + (row % 2) * 11;
          const y = y0 + row * 16;
          ctx.beginPath();
          ctx.arc(x, y, 11, 0, Math.PI);
          ctx.stroke();
        }
      break;
    case 'bolts':
      ctx.strokeStyle = rgba(pc, 0.8);
      ctx.lineWidth = 6;
      for (let i = 0; i < 4; i++) {
        let x = x0 + 20 + i * 48 + r() * 10;
        let y = y0;
        ctx.beginPath();
        ctx.moveTo(x, y);
        while (y < y0 + h) {
          x += (r() - 0.5) * 30;
          y += 18 + r() * 10;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    case 'drips':
      ctx.fillStyle = rgba(pc, 0.8);
      ctx.fillRect(x0, y0, w, 26);
      for (let i = 0; i < 9; i++) {
        const x = x0 + 10 + i * 22 + r() * 8;
        const len = 20 + r() * 60;
        roundRect(ctx, x - 6, y0 + 10, 12, len, 6);
        ctx.fill();
        ellipse(ctx, x, y0 + 10 + len, 8, 9);
        ctx.fill();
      }
      break;
    case 'marble':
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 9; i++) {
        ctx.strokeStyle = rgba(pc, 0.25 + r() * 0.4);
        ctx.beginPath();
        let x = x0 + r() * w;
        let y = y0;
        ctx.moveTo(x, y);
        for (let k = 0; k < 8; k++) {
          const nx = x + (r() - 0.5) * 60;
          const ny = y + 26;
          ctx.quadraticCurveTo(x + (r() - 0.5) * 40, y + 13, nx, ny);
          x = nx;
          y = ny;
        }
        ctx.stroke();
      }
      break;
    case 'circuit':
      ctx.strokeStyle = rgba(pc, 0.75);
      ctx.fillStyle = rgba(pc, 0.9);
      ctx.lineWidth = 3;
      for (let i = 0; i < 12; i++) {
        let x = x0 + Math.round(r() * 9) * 20;
        let y = y0 + Math.round(r() * 10) * 20;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 3; k++) {
          if (r() < 0.5) x += (r() < 0.5 ? -1 : 1) * 30;
          else y += 30;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
        ellipse(ctx, x, y, 4.5, 4.5);
        ctx.fill();
      }
      break;
    case 'fur':
      ctx.strokeStyle = rgba(pc, 0.5);
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 160; i++) {
        const x = x0 + r() * w;
        const y = y0 + r() * h;
        const a = Math.PI / 2 + (r() - 0.5) * 0.9;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12);
        ctx.stroke();
      }
      break;
    case 'snow':
      ctx.fillStyle = rgba(pc, 0.8);
      for (let i = 0; i < 40; i++) {
        ellipse(ctx, x0 + r() * w, y0 + r() * h, 2 + r() * 4, 2 + r() * 4);
        ctx.fill();
      }
      ctx.strokeStyle = rgba(pc, 0.85);
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 6; i++) {
        const x = x0 + 20 + r() * (w - 40);
        const y = y0 + 20 + r() * (h - 40);
        for (let k = 0; k < 3; k++) {
          const a = (k * Math.PI) / 3;
          ctx.beginPath();
          ctx.moveTo(x - Math.cos(a) * 10, y - Math.sin(a) * 10);
          ctx.lineTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10);
          ctx.stroke();
        }
      }
      break;
    case 'facets': {
      // cut-gem facets: a fan of triangles from the centre, alternately lit and shaded
      const n = 14;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2;
        const a1 = ((i + 1) / n) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(HX, HY);
        ctx.lineTo(HX + Math.cos(a0) * R * 1.4, HY + Math.sin(a0) * R * 1.4);
        ctx.lineTo(HX + Math.cos(a1) * R * 1.4, HY + Math.sin(a1) * R * 1.4);
        ctx.closePath();
        ctx.fillStyle = i % 2 ? rgba('#ffffff', 0.28) : rgba(pc, 0.3);
        ctx.fill();
      }
      ctx.strokeStyle = rgba('#ffffff', 0.55);
      ctx.lineWidth = 1.5;
      ellipse(ctx, HX, HY, R * 0.45, R * 0.45);
      ctx.stroke();
      break;
    }
    case 'gems': {
      // a ring of set stones with gold claws
      const gc = look.gem ?? '#ff3d6e';
      const n = 9;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = HX + Math.cos(a) * R * 0.62;
        const y = HY + Math.sin(a) * R * 0.62;
        ctx.fillStyle = rgba(pc, 0.95);
        ellipse(ctx, x, y, 11, 11);
        ctx.fill();
        const gg = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, 9);
        gg.addColorStop(0, shade(gc, 0.7));
        gg.addColorStop(0.6, gc);
        gg.addColorStop(1, shade(gc, -0.4));
        ctx.fillStyle = gg;
        star(ctx, x, y, 9, 4, 0.75, Math.PI / 4);
        ctx.fill();
      }
      break;
    }
    case 'bubbles':
      ctx.strokeStyle = rgba(pc, 0.7);
      ctx.lineWidth = 3;
      for (let i = 0; i < 16; i++) {
        const rr = 5 + r() * 14;
        ellipse(ctx, x0 + r() * w, y0 + r() * h, rr, rr);
        ctx.stroke();
      }
      break;
  }
}

/** The handle: shaft, grip wraps, the band under the head (shiny and boss peels) and the end knob. */
export function drawPeelHandle(ctx: Ctx, look: PeelLook): void {
  const ink = look.rim ?? INK;
  roundRect(ctx, HX - 14, HY + R - 14, 28, 170, 12);
  const hg = ctx.createLinearGradient(HX - 14, 0, HX + 14, 0);
  hg.addColorStop(0, look.handle[1]);
  hg.addColorStop(0.45, look.handle[0]);
  hg.addColorStop(1, shade(look.handle[1], -0.15));
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5;
  ctx.stroke();
  // grip wraps
  ctx.strokeStyle = rgba(shade(look.handle[1], -0.35), 0.6);
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    const y = HY + R + 92 + i * 12;
    ctx.beginPath();
    ctx.moveTo(HX - 12, y);
    ctx.lineTo(HX + 12, y + 5);
    ctx.stroke();
  }
  if (look.shiny || look.studs) {
    roundRect(ctx, HX - 16, HY + R + 74, 32, 10, 4);
    ctx.fillStyle = look.studs ?? '#ffd23f';
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ellipse(ctx, HX, HY + R + 140, 9, 6);
  ctx.fillStyle = INK;
  ctx.fill();
}

/** Draw a peel skin onto a 220x360 canvas. */
export function drawPeelSkin(look: PeelLook): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(PEEL_W, PEEL_H);
  drawPeelHandle(ctx, look);

  if (look.custom) {
    look.custom(ctx);
    return c;
  }
  if (look.footArt) {
    drawFootHead(ctx, look);
    return c;
  }
  if (look.pizzaArt) {
    drawPizzaHead(ctx, look);
    return c;
  }
  plainHeadUnder(ctx, look, () => {
    if (look.emblem) stampEmblem(ctx, look);
  });
  plainHeadOver(ctx, look);
  return c;
}

/** A plain head's material (inside its outline, clipped): the fill, pattern, metal sheen, foil and the flour's gloss.
 *  `mid` paints between the metal sheen and the foil, still clipped (the stamped emblem, a place peel's window). */
export function plainHeadUnder(ctx: Ctx, look: PeelLook, mid?: () => void): void {
  headPath(ctx, look.shape);
  const g = ctx.createRadialGradient(HX - 30, HY - 36, 10, HX, HY, R * 1.15);
  g.addColorStop(0, look.head[0]);
  g.addColorStop(0.7, look.head[1]);
  g.addColorStop(1, look.head[2]);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  headPath(ctx, look.shape);
  ctx.clip();
  drawPattern(ctx, look);
  if (look.metal) {
    const mg = ctx.createLinearGradient(HX - R, HY - R, HX + R, HY + R);
    mg.addColorStop(0, 'rgba(255,255,255,0)');
    mg.addColorStop(0.42, 'rgba(255,255,255,0)');
    mg.addColorStop(0.5, 'rgba(255,255,255,0.55)');
    mg.addColorStop(0.58, 'rgba(255,255,255,0)');
    mg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(HX - R - 10, HY - R - 10, R * 2 + 20, R * 2 + 30);
  }
  mid?.();
  // shiny: rainbow foil, then sparkles
  if (look.shiny) {
    const fg = ctx.createLinearGradient(HX - R, HY - R, HX + R, HY + R);
    const hues = ['#ff5f6d', '#ffc371', '#fff06a', '#7dff9a', '#5fd8ff', '#a77dff', '#ff7ad9'];
    hues.forEach((hc, i) => fg.addColorStop(i / (hues.length - 1), hc));
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = fg;
    ctx.fillRect(HX - R - 10, HY - R - 10, R * 2 + 20, R * 2 + 30);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    const sr = rng(hashStr(look.seed + 'sparkle'));
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 7; i++) {
      star(ctx, HX - R + 14 + sr() * (R * 2 - 28), HY - R + 14 + sr() * (R * 2 - 28), 4 + sr() * 7, 4, 0.28, 0);
      ctx.fill();
    }
  }
  // flour dusting / gloss
  const fr = rng(5);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = rgba('#ffffff', 0.18 * fr());
    ellipse(ctx, HX + (fr() - 0.5) * R * 1.6, HY + (fr() - 0.5) * R * 1.6, 2 + fr() * 4, 2 + fr() * 3);
    ctx.fill();
  }
  ctx.restore();
}

/** Over a plain head: its studs, outline and (unless gloss is false) the gloss. */
export function plainHeadOver(ctx: Ctx, look: PeelLook, gloss = true): void {
  const ink = look.rim ?? INK;
  // studs
  if (look.studs) {
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * 0.75 + (i / (n - 1)) * Math.PI * 1.5;
      const sx = HX + Math.cos(a) * (R - 12);
      const sy = HY + Math.sin(a) * (R - 12);
      ellipse(ctx, sx, sy, 5.5, 5.5);
      ctx.fillStyle = look.studs;
      ctx.fill();
      ctx.strokeStyle = rgba(INK, 0.8);
      ctx.lineWidth = 2;
      ctx.stroke();
      ellipse(ctx, sx - 1.5, sy - 1.5, 1.8, 1.8);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fill();
    }
  }
  headPath(ctx, look.shape);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 6;
  ctx.stroke();
  if (!gloss) return;
  ellipse(ctx, HX - 30, HY - 40, 26, 12, -0.6);
  ctx.fillStyle = rgba('#ffffff', look.metal ? 0.45 : 0.3);
  ctx.fill();
}

/** The emblem: a stamped disc with the picture. */
function stampEmblem(ctx: Ctx, look: PeelLook): void {
  const ink = look.rim ?? INK;
  const er = R * 0.56;
  const ey = HY + 4;
  ellipse(ctx, HX, ey + 4, er, er);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fill();
  ellipse(ctx, HX, ey, er, er);
  const eg = ctx.createRadialGradient(HX - 12, ey - 14, 4, HX, ey, er);
  eg.addColorStop(0, shade(look.head[0], 0.75));
  eg.addColorStop(1, shade(look.head[0], 0.35));
  ctx.fillStyle = eg;
  ctx.fill();
  ctx.save();
  ellipse(ctx, HX, ey, er - 4, er - 4);
  ctx.clip();
  const img = look.emblem as HTMLCanvasElement;
  const iw = img.width;
  const ih = img.height;
  const k = Math.min(((er - 8) * 2) / iw, ((er - 8) * 2) / ih);
  ctx.drawImage(img, HX - (iw * k) / 2, ey - (ih * k) / 2, iw * k, ih * k);
  ctx.restore();
  ellipse(ctx, HX, ey, er, er);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.stroke();
}

/** Where a foot head sits on the peel: the trimmed art's scale (peel units per texel), its drawn size, the shift
 * that centres the ankle on the handle, the line the heel meets (the top of the hilt), whether it's flipped toes-up,
 * and the ankle's width for the hilt. */
export interface FootHeadPlace {
  k: number;
  w: number;
  h: number;
  dx: number;
  bottom: number;
  flip: boolean;
  ankle: number;
}

export function footHeadPlace(look: PeelLook): FootHeadPlace {
  const art = look.footArt!;
  // fit inside the head area, the heel meeting the top of the handle
  const boxW = R * 2 + 8;
  const boxH = R * 2 + 14;
  // centre on the ankle, not the picture: tails and accessories would push the handle off-centre
  const an = ankleOf(art);
  const halfSpan = Math.max(an.cx, art.width - an.cx);
  const k = Math.min(boxW / (halfSpan * 2), boxH / art.height);
  return {
    k,
    w: art.width * k,
    h: art.height * k,
    dx: (art.width / 2 - an.cx) * k,
    bottom: HY + R + 6,
    flip: !look.footUpright,
    ankle: (look.footUpright ? an.sole : an.w) * k,
  };
}

/** Draw a picture in the trimmed foot art's texel frame (the foot itself, or a layer cut the same way) onto a
 * peel-sized canvas, placed and flipped as the head is. */
export function drawInFootHead(ctx: Ctx, img: CanvasImageSource, p: FootHeadPlace, iw: number, ih: number): void {
  ctx.save();
  ctx.translate(HX, p.bottom - p.h / 2);
  if (p.flip) ctx.scale(1, -1); // toes up
  ctx.drawImage(img, -p.w / 2 + p.dx, -p.h / 2, iw * p.k, ih * p.k);
  ctx.restore();
}

const FOIL = ['#ff5f6d', '#ffc371', '#fff06a', '#7dff9a', '#5fd8ff', '#a77dff', '#ff7ad9'];

/** The shiny foil's sparkles on a foot head, in peel units: [x, y, radius] (the animated peels twinkle them). */
export function footSparkles(look: PeelLook): [number, number, number][] {
  const sr = rng(hashStr(look.seed + 'sparkle'));
  return Array.from({ length: 7 }, () => [HX - R + 14 + sr() * (R * 2 - 28), HY - R + 14 + sr() * (R * 2 - 28), 4 + sr() * 7]);
}

/** A four-point sparkle star (the shiny foil's). */
export function sparkleStar(ctx: Ctx, x: number, y: number, r: number): void {
  star(ctx, x, y, r, 4, 0.28, 0);
}

/**
 * The peel's pattern and (shiny peels) rainbow foil and sparkles over a foot head, only where it is drawn. `c` is the
 * canvas ctx draws on, its transform set to peel units (a layer of an animated peel can sit anywhere on it).
 */
export function finishFootLayer(c: HTMLCanvasElement, ctx: Ctx, look: PeelLook, sparkles = true): void {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = 0.28;
  drawPattern(ctx, look);
  ctx.globalAlpha = 1;
  if (look.shiny) {
    // keep a copy of the shape: 'overlay' isn't clipped, so the foil is trimmed back to it afterwards
    const [mask, mctx] = makeCanvas(c.width, c.height);
    mctx.drawImage(c, 0, 0);
    const fg = ctx.createLinearGradient(HX - R, HY - R, HX + R, HY + R);
    FOIL.forEach((hc, i) => fg.addColorStop(i / (FOIL.length - 1), hc));
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = fg;
    ctx.fillRect(-PEEL_W, -PEEL_H, PEEL_W * 3, PEEL_H * 3);
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(mask, 0, 0);
    ctx.restore();
    if (sparkles) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = '#ffffff';
      for (const [x, y, r] of footSparkles(look)) {
        sparkleStar(ctx, x, y, r);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

/** The soft drop shadow under a foot head (the head drawn on a peel-sized canvas `t`), without the head itself.
 * `px`: canvas pixels per peel unit (shadow sizes ignore the transform). */
export function footHeadShadow(ctx: Ctx, t: CanvasImageSource, px = 1): void {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 8 * px;
  ctx.shadowOffsetY = 4 * px;
  // drawn far off to the left with the shadow thrown back into place: only the shadow lands
  const far = 4000;
  ctx.shadowOffsetX = far;
  ctx.drawImage(t, -far / px, 0, PEEL_W, PEEL_H);
  ctx.restore();
}

/** A foot-shaped head: the foot's own art flipped toes-up over the handle, with the peel's pattern and foil on top. */
function drawFootHead(ctx: Ctx, look: PeelLook): void {
  const art = look.footArt!;
  const p = footHeadPlace(look);
  const [t, tctx] = makeCanvas(PEEL_W, PEEL_H);
  drawInFootHead(tctx, art, p, art.width, art.height);
  // pattern and foil only where the foot is
  finishFootLayer(t, tctx, look);
  // feet drawn dark under an emissive layer (neon, magma) keep it as a steady glow, as a still foot does in play
  if (look.footGlow) {
    tctx.save();
    tctx.globalCompositeOperation = 'lighter';
    tctx.globalAlpha = look.footGlow.a;
    drawInFootHead(tctx, look.footGlow.art, p, look.footGlow.art.width, look.footGlow.art.height);
    tctx.restore();
  }
  // a soft drop shadow, then the foot
  footHeadShadow(ctx, t);
  ctx.drawImage(t, 0, 0);
  drawFootHilt(ctx, look, p);
}

/** The hilt under a foot head: a crossguard as wide as the ankle (so foot and handle join cleanly), pommel caps,
 * a ferrule and (bosses) a jewel. */
export function drawFootHilt(ctx: Ctx, look: PeelLook, p: FootHeadPlace): void {
  const bottom = p.bottom;
  const gw = Math.max(56, Math.min(128, p.ankle + 22));
  const metal = look.studs ?? look.handle[0];
  const gg = ctx.createLinearGradient(0, bottom - 12, 0, bottom + 10);
  gg.addColorStop(0, shade(metal, 0.35));
  gg.addColorStop(0.5, metal);
  gg.addColorStop(1, shade(metal, -0.35));
  roundRect(ctx, HX - gw / 2, bottom - 12, gw, 20, 10);
  ctx.fillStyle = gg;
  ctx.fill();
  ctx.strokeStyle = look.rim ?? INK;
  ctx.lineWidth = 4;
  ctx.stroke();
  // pommel caps on each end of the guard
  for (const sx of [-1, 1]) {
    ellipse(ctx, HX + sx * (gw / 2 - 2), bottom - 2, 9, 9);
    ctx.fillStyle = shade(metal, -0.1);
    ctx.fill();
    ctx.strokeStyle = look.rim ?? INK;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ellipse(ctx, HX + sx * (gw / 2 - 2) - 2.5, bottom - 5, 3, 2.4);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
  }
  // shine along the guard
  roundRect(ctx, HX - gw / 2 + 12, bottom - 8, gw - 24, 4, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill();
  // a ferrule where the handle leaves the guard
  roundRect(ctx, HX - 17, bottom + 6, 34, 16, 5);
  const fg2 = ctx.createLinearGradient(HX - 17, 0, HX + 17, 0);
  fg2.addColorStop(0, shade(metal, -0.3));
  fg2.addColorStop(0.45, shade(metal, 0.3));
  fg2.addColorStop(1, shade(metal, -0.35));
  ctx.fillStyle = fg2;
  ctx.fill();
  ctx.strokeStyle = look.rim ?? INK;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  // boss jewels on the guard
  if (look.studs) {
    ellipse(ctx, HX, bottom - 2, 6, 6);
    ctx.fillStyle = '#ff3d6e';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ellipse(ctx, HX - 1.8, bottom - 4, 2, 1.6);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
  }
}

/** Where a pizza peel's pie sits on the head (peel units): the art (a 400 px top) drawn at scale k into the box x, y,
 *  w, h (mirrored top to bottom for a calzone, so its flat edge sits on the hilt), and where the hilt meets it. */
export interface PizzaPlace {
  k: number;
  x: number;
  y: number;
  w: number;
  h: number;
  flip: boolean;
  /** Round pies (and deep dish) sit on a wooden board. */
  round: boolean;
  bottom: number;
}

/** The board's radius (peel units). */
export const PIZZA_BOARD_R = R + 2;

export function pizzaPlacement(look: Pick<PeelLook, 'pizzaRound' | 'pizzaFlip'>, art: HTMLCanvasElement): PizzaPlace {
  const r = PIZZA_BOARD_R;
  if (look.pizzaRound !== false) {
    const k = ((r - 8) * 2) / Math.max(art.width, art.height);
    const w = art.width * k;
    const h = art.height * k;
    return { k, x: HX - w / 2, y: HY - h / 2, w, h, flip: false, round: true, bottom: HY + r - 2 };
  }
  const k = (r * 2) / Math.max(art.width, art.height);
  const w = art.width * k;
  const h = art.height * k;
  if (look.pizzaFlip) {
    // the dome up, the flat edge down; the art's empty top half becomes empty space above
    const top = visibleEdge(art, false) * k; // empty rows above the pie in the art
    const vis = visibleEdge(art, true) * k - top; // the pie's own height
    const y0 = HY + vis / 2 + 6; // where the flat edge lands
    return { k, x: HX - w / 2, y: y0 + top - h, w, h, flip: true, round: false, bottom: y0 - 2 };
  }
  // the hilt meets the pie's visible bottom edge
  return { k, x: HX - w / 2, y: HY - h / 2, w, h, flip: false, round: false, bottom: HY - h / 2 + visibleEdge(art, true) * k - 4 };
}

/** Draw a canvas in a pizza's box (mirrored for a calzone). */
export function drawInPlace(ctx: Ctx, img: CanvasImageSource, pl: Pick<PizzaPlace, 'x' | 'y' | 'w' | 'h' | 'flip'>): void {
  if (!pl.flip) {
    ctx.drawImage(img, pl.x, pl.y, pl.w, pl.h);
    return;
  }
  ctx.save();
  ctx.translate(pl.x, pl.y + pl.h);
  ctx.scale(1, -1);
  ctx.drawImage(img, 0, 0, pl.w, pl.h);
  ctx.restore();
}

/** The hilt a pizza peel's pie sits on, and a stem down to the handle when the pie ends high (calzones). */
export function drawPizzaHilt(ctx: Ctx, look: PeelLook, bottom: number): void {
  const handleTop = HY + R - 14;
  if (bottom + 6 < handleTop + 4) {
    roundRect(ctx, HX - 14, bottom, 28, handleTop - bottom + 8, 6);
    const sg = ctx.createLinearGradient(HX - 14, 0, HX + 14, 0);
    sg.addColorStop(0, look.handle[1]);
    sg.addColorStop(0.45, look.handle[0]);
    sg.addColorStop(1, shade(look.handle[1], -0.15));
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.strokeStyle = look.rim ?? INK;
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  // the hilt, lit along its top
  const metal = look.handle[0];
  roundRect(ctx, HX - 30, bottom - 8, 60, 16, 8);
  const hg = ctx.createLinearGradient(0, bottom - 8, 0, bottom + 8);
  hg.addColorStop(0, shade(metal, 0.22));
  hg.addColorStop(0.5, metal);
  hg.addColorStop(1, shade(metal, -0.3));
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.strokeStyle = look.rim ?? INK;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  roundRect(ctx, HX - 22, bottom - 5, 44, 3.5, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill();
}

/** A pizza-shaped head: the whole pie on a wooden disc, with a hilt (the plain still; the pizza peels are painted and
 *  come alive in src/art/peelPizza.ts). */
function drawPizzaHead(ctx: Ctx, look: PeelLook): void {
  const art = look.pizzaArt!;
  const pl = pizzaPlacement(look, art);
  if (pl.round) {
    // the wooden board under the pie
    const r = PIZZA_BOARD_R;
    ellipse(ctx, HX, HY + 4, r, r);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fill();
    ellipse(ctx, HX, HY, r, r);
    const g = ctx.createRadialGradient(HX - 30, HY - 36, 10, HX, HY, r * 1.1);
    g.addColorStop(0, '#f6cf94');
    g.addColorStop(1, '#a8703a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = look.rim ?? INK;
    ctx.lineWidth = 5;
    ctx.stroke();
    drawInPlace(ctx, art, pl);
  } else {
    // square pizzas and calzones: just the pie, with a soft shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    drawInPlace(ctx, art, pl);
    ctx.restore();
  }
  drawPizzaHilt(ctx, look, pl.bottom);
}

const edgeCache = new WeakMap<HTMLCanvasElement, [number, number]>();

/** First and last rows with visible pixels near the middle column: bottom=true gives the last. */
function visibleEdge(art: HTMLCanvasElement, bottom: boolean): number {
  let hit = edgeCache.get(art);
  if (!hit) {
    const ctx = art.getContext('2d')!;
    const x0 = Math.round(art.width * 0.4);
    const cw = Math.max(1, Math.round(art.width * 0.2));
    const data = ctx.getImageData(x0, 0, cw, art.height).data;
    const rowOn = (y: number) => {
      for (let x = 0; x < cw; x++) if (data[(y * cw + x) * 4 + 3] > 60) return true;
      return false;
    };
    let first = 0;
    while (first < art.height - 1 && !rowOn(first)) first++;
    let last = art.height - 1;
    while (last > 0 && !rowOn(last)) last--;
    hit = [first, last];
    edgeCache.set(art, hit);
  }
  return bottom ? hit[1] : hit[0];
}

const ankleCache = new WeakMap<HTMLCanvasElement, { w: number; cx: number; sole: number }>();

/** Longest run of opaque pixels in a row: [start, end] or null. */
function longestRun(data: Uint8ClampedArray, w: number, y: number): [number, number] | null {
  let best: [number, number] | null = null;
  let start = -1;
  for (let x = 0; x <= w; x++) {
    const on = x < w && data[(y * w + x) * 4 + 3] > 60;
    if (on && start < 0) start = x;
    if (!on && start >= 0) {
      if (!best || x - 1 - start > best[1] - best[0]) best = [start, x - 1];
      start = -1;
    }
  }
  return best;
}

const median = (xs: number[]) => {
  const v = [...xs].sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : 0;
};

/**
 * Where the handle should go: the centre of the foot's main body (the longest opaque run in each row,
 * so accessories like a spray can or a bowling ball beside it don't count), and the ankle's width.
 */
function ankleOf(art: HTMLCanvasElement): { w: number; cx: number; sole: number } {
  const hit = ankleCache.get(art);
  if (hit) return hit;
  const ctx = art.getContext('2d')!;
  const { width: w, height: h } = art;
  const data = ctx.getImageData(0, 0, w, h).data;
  const mids: number[] = [];
  const ankles: number[] = [];
  const soles: number[] = [];
  for (let y = Math.round(h * 0.04); y < Math.round(h * 0.95); y += 2) {
    const run = longestRun(data, w, y);
    if (!run) continue;
    mids.push((run[0] + run[1]) / 2);
    if (y < h * 0.16) ankles.push(run[1] - run[0]);
    if (y > h * 0.8) soles.push(run[1] - run[0]);
  }
  const out = mids.length
    ? { cx: median(mids), w: median(ankles.length ? ankles : [w * 0.5]), sole: median(soles.length ? soles : [w * 0.5]) }
    : { w: w * 0.5, cx: w / 2, sole: w * 0.5 };
  ankleCache.set(art, out);
  return out;
}

/** Head colours from one base colour. */
export function headFrom(base: string): [string, string, string] {
  return [shade(base, 0.35), base, shade(base, -0.3)];
}

/** Handle colours from one base colour. */
export function handleFrom(base: string): [string, string] {
  return [shade(base, 0.25), shade(base, -0.25)];
}

export { mix };
