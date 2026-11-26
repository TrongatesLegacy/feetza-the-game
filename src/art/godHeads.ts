// God peel heads, in the game's style (thick dark-brown outlines, soft gradients lit from the top left, a sheen):
// - Greek gods: veined marble in a gold rim, the god's symbol carved in gold relief in the middle.
// - Norse gods: carved oak in an iron band with rivets, the god's symbol cut into the wood, and runes round
//   the rim glowing in the god's colour.
// - The Kratos Peel: a bronze crested helm with a red horsehair crest, and chain wrapped round the handle.
// - The God Peel: radiant gold and marble, a halo, a crown of tiny peels and a prismatic sheen.
// Every look is drawn from the myths (or made up), never from a film or game.

import { INK } from './feetCommon';
import { PEEL_HEAD, handleFrom, headFrom, headPath, type PeelLook, type PeelShape } from './peelArt';
import { type Ctx, ellipse, hashStr, rgba, rng, roundRect, shade } from './util';
import { RUNES, drawShaped, runeAt } from './godShapes';
import { noteRune, want } from './godParts';

const { x: HX, y: HY, r: R } = PEEL_HEAD;

export type GreekSymbol =
  | 'bolt' | 'peacock' | 'trident' | 'wheat' | 'owl' | 'lyre' | 'bow' | 'helmet' | 'shell' | 'anvil' | 'caduceus'
  | 'grapes' | 'hearth' | 'bident' | 'pomegranate' | 'wings' | 'veil';
export type NorseSymbol =
  | 'eye' | 'hammer' | 'serpent' | 'spindle' | 'falcon' | 'boar' | 'sword' | 'horn' | 'sun' | 'halfskull' | 'ship'
  | 'snowflake' | 'apple' | 'harp';

export interface GodArt {
  pantheon: 'greek' | 'norse';
  symbol: GreekSymbol | NorseSymbol;
  /** The god's colour: gems (Greek) or the runes' glow (Norse), and the trail. */
  color: string;
  shape?: PeelShape;
  /** Marble or wood tint. */
  base?: string;
  /** Rim metal: gold (Greek), iron (Norse). */
  rim?: string;
  handle?: string;
}

/** A god's PeelLook: the usual fields (trail, handle) plus the hand-drawn head. */
export function godLook(id: string, a: GodArt): () => PeelLook {
  const greek = a.pantheon === 'greek';
  return () => ({
    shape: a.shape ?? 'round',
    head: headFrom(a.base ?? (greek ? '#efe9dc' : '#9a6a3e')),
    handle: handleFrom(a.handle ?? (greek ? '#d9a93a' : '#5a3a22')),
    pattern: 'plain',
    patternColor: a.color,
    metal: greek,
    trail: a.color,
    seed: id,
    // the head is the god's symbol; a few keep a round head with the symbol carved in it (see godShapes.ts)
    custom: (ctx) => {
      if (drawShaped(ctx, a, id)) return;
      if (greek) drawGreek(ctx, a, id);
      else drawNorse(ctx, a, id);
    },
  });
}

// ——— little helpers ———
function ink(ctx: Ctx, lw = 4, col = INK): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function lit(ctx: Ctx, x: number, y: number, r: number, base: string, k = 0.35): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r * 1.05);
  g.addColorStop(0, shade(base, k));
  g.addColorStop(0.65, base);
  g.addColorStop(1, shade(base, -0.3));
  return g;
}

/** Polished gold, light from the top left. */
function gold(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, base = '#e8b43a'): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, shade(base, 0.55));
  g.addColorStop(0.35, shade(base, 0.15));
  g.addColorStop(0.55, base);
  g.addColorStop(0.75, shade(base, -0.25));
  g.addColorStop(1, shade(base, 0.1));
  return g;
}

function circle(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function poly(ctx: Ctx, pts: [number, number][], close = true): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (close) ctx.closePath();
}

function shine(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.45, rot = -0.6): void {
  ellipse(ctx, x, y, rx, ry, rot);
  ctx.fillStyle = rgba('#ffffff', a);
  ctx.fill();
}

/** Fill the current path as raised relief: base fill, a dark drop below-right, a light edge top-left. */
function relief(ctx: Ctx, path: () => void, fill: string | CanvasGradient, lw = 3.2, outline = INK): void {
  ctx.save();
  ctx.translate(2.5, 3);
  path();
  ctx.fillStyle = rgba('#000000', 0.28);
  ctx.fill();
  ctx.restore();
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  ctx.translate(-2, -2);
  path();
  ctx.strokeStyle = rgba('#ffffff', 0.55);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  path();
  ink(ctx, lw, outline);
}

/** Cut into the surface: a dark recess with a lit lower-right lip (wood carving). */
function carve(ctx: Ctx, path: () => void, wood: string, stroke = false, lw = 7): void {
  if (stroke) {
    path();
    ctx.strokeStyle = shade(wood, -0.6);
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.save();
    ctx.translate(1.6, 2);
    path();
    ctx.strokeStyle = rgba(shade(wood, 0.5), 0.5);
    ctx.lineWidth = lw * 0.35;
    ctx.stroke();
    ctx.restore();
    return;
  }
  path();
  ctx.fillStyle = shade(wood, -0.55);
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  ctx.translate(-3, -3);
  path();
  ctx.fillStyle = shade(wood, -0.25);
  ctx.fill();
  ctx.restore();
  path();
  ink(ctx, 2.5, shade(wood, -0.7));
}

// ——— GREEK: marble in a gold rim ———
function drawGreek(ctx: Ctx, a: GodArt, id: string): void {
  const r = rng(hashStr(id));
  const shape = a.shape ?? 'round';
  const marble = a.base ?? '#efe9dc';
  // a soft divine glow behind
  ctx.save();
  ctx.shadowColor = rgba(a.color, 0.9);
  ctx.shadowBlur = 22;
  headPath(ctx, shape);
  ctx.fillStyle = rgba('#fff4d0', 0.9);
  ctx.fill();
  ctx.restore();
  headPath(ctx, shape);
  ctx.fillStyle = lit(ctx, HX, HY, R, marble, 0.18);
  ctx.fill();
  ctx.save();
  headPath(ctx, shape);
  ctx.clip();
  // marble veins: soft grey threads with a finer darker core
  for (let i = 0; i < 6; i++) {
    let x = HX - R + r() * R * 2;
    let y = HY - R;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 8; k++) {
      x += (r() - 0.45) * 46;
      y += 26 + r() * 10;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgba('#8a8478', 0.22);
    ctx.lineWidth = 5 + r() * 4;
    ctx.stroke();
    ctx.strokeStyle = rgba('#5a564e', 0.35);
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  // a fluted column band behind the symbol (classical carving)
  ctx.strokeStyle = rgba('#8a8478', 0.16);
  ctx.lineWidth = 3;
  for (let x = HX - R; x < HX + R; x += 14) {
    ctx.beginPath();
    ctx.moveTo(x, HY - R);
    ctx.lineTo(x, HY + R);
    ctx.stroke();
  }
  // lower shade, then a carved meander (Greek key) band near the bottom
  ctx.fillStyle = rgba('#000000', 0.07);
  ctx.fillRect(HX - R, HY + 30, R * 2, R);
  greekKey(ctx, HY + 58);
  ctx.restore();
  // the gold rim
  headPath(ctx, shape);
  ctx.strokeStyle = gold(ctx, HX - R, HY - R, HX + R, HY + R);
  ctx.lineWidth = 13;
  ctx.stroke();
  headPath(ctx, shape);
  ink(ctx, 4.5);
  // inner rim line
  ctx.save();
  ctx.translate(HX, HY);
  ctx.scale(0.86, 0.86);
  ctx.translate(-HX, -HY);
  headPath(ctx, shape);
  ctx.strokeStyle = rgba('#b8862a', 0.7);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  // laurel sprigs round the lower rim
  laurel(ctx, -1);
  laurel(ctx, 1);
  // the symbol, in gold relief
  greekSymbol(ctx, a.symbol as GreekSymbol, a.color);
  // marble sheen
  ctx.save();
  headPath(ctx, shape);
  ctx.clip();
  shine(ctx, HX - 40, HY - 46, 34, 16, 0.4);
  const mg = ctx.createLinearGradient(HX - R, HY - R, HX + R, HY + R);
  mg.addColorStop(0.4, 'rgba(255,255,255,0)');
  mg.addColorStop(0.5, 'rgba(255,255,255,0.28)');
  mg.addColorStop(0.6, 'rgba(255,255,255,0)');
  ctx.fillStyle = mg;
  ctx.fillRect(HX - R, HY - R, R * 2, R * 2 + 20);
  ctx.restore();
  // a gold collar where the head meets the handle
  roundRect(ctx, HX - 22, HY + R - 4, 44, 16, 6);
  ctx.fillStyle = gold(ctx, HX - 22, HY + R - 4, HX + 22, HY + R + 12);
  ctx.fill();
  ink(ctx, 3.5);
}

function greekKey(ctx: Ctx, y: number): void {
  ctx.strokeStyle = rgba('#8a7a52', 0.55);
  ctx.lineWidth = 2.6;
  ctx.lineJoin = 'miter';
  const s = 9;
  ctx.beginPath();
  for (let x = HX - R; x < HX + R; x += s * 2) {
    ctx.moveTo(x, y + s);
    ctx.lineTo(x, y);
    ctx.lineTo(x + s * 1.5, y);
    ctx.lineTo(x + s * 1.5, y + s * 0.6);
    ctx.lineTo(x + s * 0.6, y + s * 0.6);
    ctx.lineTo(x + s * 0.6, y + s);
    ctx.lineTo(x + s * 2, y + s);
  }
  ctx.stroke();
}

function laurel(ctx: Ctx, s: number): void {
  // a short sprig of gold leaves following the rim, from the bottom up one side
  for (let i = 0; i < 5; i++) {
    const t = 0.62 + i * 0.13;
    const ang = Math.PI / 2 + s * t;
    const x = HX + Math.cos(ang) * (R - 16);
    const y = HY + Math.sin(ang) * (R - 16);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang + (s > 0 ? Math.PI / 2 : -Math.PI / 2) + s * 0.5);
    ellipse(ctx, 0, 0, 9, 4.2);
    ctx.fillStyle = gold(ctx, -9, -4, 9, 4);
    ctx.fill();
    ink(ctx, 2);
    ctx.restore();
  }
}

function gem(ctx: Ctx, x: number, y: number, r: number, col: string): void {
  circle(ctx, x, y, r);
  ctx.fillStyle = lit(ctx, x, y, r, col, 0.5);
  ctx.fill();
  ink(ctx, 2.4);
  shine(ctx, x - r * 0.35, y - r * 0.35, r * 0.35, r * 0.2, 0.75);
}

function greekSymbol(ctx: Ctx, s: GreekSymbol, col: string): void {
  const G = gold(ctx, HX - 50, HY - 50, HX + 50, HY + 50);
  const cx = HX;
  const cy = HY - 6;
  switch (s) {
    case 'bolt':
      relief(ctx, () => poly(ctx, [[cx + 14, cy - 56], [cx - 26, cy + 4], [cx - 2, cy + 4], [cx - 18, cy + 56], [cx + 28, cy - 12], [cx + 4, cy - 12], [cx + 22, cy - 56]]), G, 3.6);
      gem(ctx, cx - 2, cy + 4, 6, col);
      break;
    case 'peacock': {
      // a peacock feather's eye under a little crown
      relief(ctx, () => {
        ctx.beginPath();
        ctx.ellipse(cx, cy + 6, 26, 40, 0, 0, Math.PI * 2);
      }, G);
      ellipse(ctx, cx, cy + 10, 15, 22);
      ctx.fillStyle = lit(ctx, cx, cy + 10, 22, '#2a8a7a', 0.4);
      ctx.fill();
      ink(ctx, 2.4);
      gem(ctx, cx, cy + 14, 9, col);
      relief(ctx, () => poly(ctx, [[cx - 22, cy - 34], [cx - 22, cy - 52], [cx - 11, cy - 42], [cx, cy - 58], [cx + 11, cy - 42], [cx + 22, cy - 52], [cx + 22, cy - 34]]), G, 3);
      break;
    }
    case 'trident':
      relief(ctx, () => {
        ctx.beginPath();
        roundRect(ctx, cx - 5, cy - 20, 10, 80, 4);
        ctx.moveTo(cx - 34, cy - 50);
        ctx.lineTo(cx - 28, cy - 58);
        ctx.lineTo(cx - 24, cy - 26);
        ctx.quadraticCurveTo(cx, cy - 8, cx + 24, cy - 26);
        ctx.lineTo(cx + 28, cy - 58);
        ctx.lineTo(cx + 34, cy - 50);
        ctx.lineTo(cx + 30, cy - 18);
        ctx.quadraticCurveTo(cx, cy + 6, cx - 30, cy - 18);
        ctx.closePath();
        ctx.moveTo(cx - 6, cy - 22);
        ctx.lineTo(cx, cy - 62);
        ctx.lineTo(cx + 6, cy - 22);
        ctx.closePath();
      }, G, 3.2);
      gem(ctx, cx, cy - 10, 6, col);
      break;
    case 'wheat':
      for (const dx of [-16, 0, 16]) {
        relief(ctx, () => roundRect(ctx, cx + dx - 2.5, cy - 8, 5, 64, 2), G, 2.4);
        for (let i = 0; i < 4; i++)
          for (const sd of [-1, 1])
            relief(ctx, () => {
              ctx.beginPath();
              ctx.ellipse(cx + dx + sd * 6, cy - 46 + i * 12, 5, 9, sd * 0.5, 0, Math.PI * 2);
            }, G, 2.2);
      }
      gem(ctx, cx, cy + 38, 6, col);
      break;
    case 'owl':
      relief(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(cx - 30, cy - 40);
        ctx.lineTo(cx - 16, cy - 30);
        ctx.quadraticCurveTo(cx, cy - 36, cx + 16, cy - 30);
        ctx.lineTo(cx + 30, cy - 40);
        ctx.quadraticCurveTo(cx + 40, cy + 10, cx + 22, cy + 42);
        ctx.quadraticCurveTo(cx, cy + 56, cx - 22, cy + 42);
        ctx.quadraticCurveTo(cx - 40, cy + 10, cx - 30, cy - 40);
        ctx.closePath();
      }, G);
      for (const sx of [-1, 1]) {
        circle(ctx, cx + sx * 13, cy - 14, 11);
        ctx.fillStyle = '#fff6e0';
        ctx.fill();
        ink(ctx, 2.4);
        gem(ctx, cx + sx * 13, cy - 13, 6, col);
      }
      poly(ctx, [[cx - 5, cy - 2], [cx + 5, cy - 2], [cx, cy + 8]]);
      ctx.fillStyle = shade('#e8b43a', -0.3);
      ctx.fill();
      ink(ctx, 2);
      // breast feathers
      ctx.strokeStyle = rgba(INK, 0.5);
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(cx - 8 + i * 8, cy + 22, 5, 0, Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx - 4 + i * 8, cy + 32, 5, 0, Math.PI);
        ctx.stroke();
      }
      break;
    case 'lyre':
      relief(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(cx - 24, cy + 40);
        ctx.bezierCurveTo(cx - 54, cy + 10, cx - 40, cy - 40, cx - 20, cy - 52);
        ctx.lineTo(cx - 12, cy - 46);
        ctx.bezierCurveTo(cx - 28, cy - 30, cx - 36, cy + 4, cx - 12, cy + 30);
        ctx.lineTo(cx + 12, cy + 30);
        ctx.bezierCurveTo(cx + 36, cy + 4, cx + 28, cy - 30, cx + 12, cy - 46);
        ctx.lineTo(cx + 20, cy - 52);
        ctx.bezierCurveTo(cx + 40, cy - 40, cx + 54, cy + 10, cx + 24, cy + 40);
        ctx.closePath();
      }, G);
      relief(ctx, () => roundRect(ctx, cx - 30, cy - 42, 60, 8, 3), G, 2.4);
      ctx.strokeStyle = '#fff6d8';
      ctx.lineWidth = 2;
      for (const dx of [-12, -4, 4, 12]) {
        ctx.beginPath();
        ctx.moveTo(cx + dx, cy - 34);
        ctx.lineTo(cx + dx, cy + 30);
        ctx.stroke();
      }
      // the sun behind it
      gem(ctx, cx, cy + 40, 7, col);
      break;
    case 'bow':
      relief(ctx, () => {
        ctx.beginPath();
        ctx.arc(cx + 30, cy, 56, Math.PI * 0.62, Math.PI * 1.38);
        ctx.arc(cx + 30, cy, 46, Math.PI * 1.36, Math.PI * 0.64, true);
        ctx.closePath();
      }, G);
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 44);
      ctx.lineTo(cx - 4, cy + 44);
      ctx.strokeStyle = '#fff6d8';
      ctx.lineWidth = 2.4;
      ctx.stroke();
      // the arrow and a silver crescent
      relief(ctx, () => {
        ctx.beginPath();
        roundRect(ctx, cx - 30, cy - 2.5, 56, 5, 2);
        poly(ctx, [[cx + 26, cy - 9], [cx + 42, cy], [cx + 26, cy + 9]]);
      }, G, 2.4);
      relief(ctx, () => {
        ctx.beginPath();
        ctx.arc(cx - 26, cy - 34, 15, 0, Math.PI * 2);
        ctx.arc(cx - 20, cy - 38, 12, 0, Math.PI * 2, true);
      }, '#e8eef4', 2.4);
      gem(ctx, cx - 30, cy, 5, col);
      break;
    case 'helmet':
      relief(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(cx - 34, cy + 40);
        ctx.lineTo(cx - 36, cy - 6);
        ctx.quadraticCurveTo(cx - 34, cy - 44, cx, cy - 46);
        ctx.quadraticCurveTo(cx + 34, cy - 44, cx + 36, cy - 6);
        ctx.lineTo(cx + 34, cy + 40);
        ctx.lineTo(cx + 12, cy + 40);
        ctx.lineTo(cx + 12, cy + 4);
        ctx.lineTo(cx + 4, cy - 4);
        ctx.lineTo(cx + 4, cy + 30);
        ctx.lineTo(cx - 4, cy + 30);
        ctx.lineTo(cx - 4, cy - 4);
        ctx.lineTo(cx - 12, cy + 4);
        ctx.lineTo(cx - 12, cy + 40);
        ctx.closePath();
      }, G);
      // a crest of the god's colour
      ctx.beginPath();
      ctx.moveTo(cx - 30, cy - 40);
      ctx.quadraticCurveTo(cx, cy - 86, cx + 34, cy - 40);
      ctx.quadraticCurveTo(cx, cy - 62, cx - 30, cy - 40);
      ctx.fillStyle = lit(ctx, cx, cy - 56, 30, col, 0.4);
      ctx.fill();
      ink(ctx, 3);
      break;
    case 'shell':
      relief(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(cx, cy + 40);
        for (let i = 0; i <= 8; i++) {
          const ang = Math.PI * (1.08 + (i / 8) * 0.84);
          ctx.lineTo(cx + Math.cos(ang) * 50, cy + 30 + Math.sin(ang) * 66);
        }
        ctx.closePath();
      }, G);
      ctx.strokeStyle = rgba(INK, 0.55);
      ctx.lineWidth = 2.4;
      for (let i = 1; i < 8; i++) {
        const ang = Math.PI * (1.08 + (i / 8) * 0.84);
        ctx.beginPath();
        ctx.moveTo(cx, cy + 38);
        ctx.lineTo(cx + Math.cos(ang) * 46, cy + 30 + Math.sin(ang) * 60);
        ctx.stroke();
      }
      // a heart-shaped pearl
      relief(ctx, () => heart(ctx, cx, cy + 30, 13), lit(ctx, cx, cy + 26, 14, col, 0.5), 2.4);
      break;
    case 'anvil':
      relief(ctx, () => poly(ctx, [[cx - 44, cy + 2], [cx + 40, cy + 2], [cx + 48, cy - 10], [cx + 20, cy - 10], [cx + 20, cy - 18], [cx - 30, cy - 18], [cx - 50, cy - 8], [cx - 30, cy - 4], [cx - 26, cy + 2]]), '#9aa3ad');
      relief(ctx, () => poly(ctx, [[cx - 16, cy + 2], [cx + 16, cy + 2], [cx + 12, cy + 26], [cx + 30, cy + 40], [cx - 30, cy + 40], [cx - 12, cy + 26]]), '#7a838d');
      // the hammer above, raised
      relief(ctx, () => {
        ctx.beginPath();
        ctx.save();
        ctx.translate(cx + 6, cy - 40);
        ctx.rotate(-0.5);
        roundRect(ctx, -3.5, -6, 7, 36, 3);
        roundRect(ctx, -16, -16, 32, 13, 3);
        ctx.restore();
      }, G, 2.6);
      gem(ctx, cx - 30, cy - 8, 5, col);
      // sparks
      for (const [sx, sy] of [[cx + 30, cy - 26], [cx + 40, cy - 36], [cx + 22, cy - 34]] as [number, number][]) {
        circle(ctx, sx, sy, 3);
        ctx.fillStyle = col;
        ctx.fill();
      }
      break;
    case 'caduceus':
      relief(ctx, () => roundRect(ctx, cx - 4, cy - 44, 8, 96, 3), G, 2.6);
      // wings at the top
      for (const sx of [-1, 1])
        relief(ctx, () => {
          ctx.beginPath();
          ctx.moveTo(cx, cy - 38);
          ctx.quadraticCurveTo(cx + sx * 30, cy - 66, cx + sx * 48, cy - 52);
          ctx.quadraticCurveTo(cx + sx * 36, cy - 46, cx + sx * 40, cy - 38);
          ctx.quadraticCurveTo(cx + sx * 26, cy - 36, cx + sx * 28, cy - 28);
          ctx.quadraticCurveTo(cx + sx * 14, cy - 30, cx, cy - 26);
          ctx.closePath();
        }, G, 2.6);
      circle(ctx, cx, cy - 46, 7);
      ctx.fillStyle = G;
      ctx.fill();
      ink(ctx, 2.4);
      // two snakes twining
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        for (let t = 0; t <= 1; t += 0.05) {
          const y = cy - 22 + t * 70;
          const x = cx + sx * Math.sin(t * Math.PI * 3) * 16;
          if (t === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = INK;
        ctx.lineWidth = 8;
        ctx.stroke();
        ctx.strokeStyle = col;
        ctx.lineWidth = 4.5;
        ctx.stroke();
      }
      break;
    case 'grapes':
      relief(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(cx, cy - 40);
        ctx.quadraticCurveTo(cx + 30, cy - 66, cx + 46, cy - 40);
        ctx.quadraticCurveTo(cx + 26, cy - 44, cx + 4, cy - 30);
        ctx.closePath();
      }, '#7ab04a', 2.6);
      for (const [gx, gy] of [[-18, -22], [0, -24], [18, -22], [-10, -6], [10, -6], [-20, 8], [0, 8], [20, 8], [-10, 24], [10, 24], [0, 40]] as [number, number][])
        relief(ctx, () => circle(ctx, cx + gx, cy + gy, 10), lit(ctx, cx + gx, cy + gy, 10, col, 0.5), 2.4);
      break;
    case 'hearth':
      // a round hearth bowl with a living flame
      relief(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(cx - 40, cy + 12);
        ctx.lineTo(cx + 40, cy + 12);
        ctx.quadraticCurveTo(cx + 34, cy + 42, cx, cy + 44);
        ctx.quadraticCurveTo(cx - 34, cy + 42, cx - 40, cy + 12);
        ctx.closePath();
      }, G);
      relief(ctx, () => roundRect(ctx, cx - 10, cy + 42, 20, 12, 3), G, 2.4);
      flame(ctx, cx, cy + 12, 30, 58, col);
      break;
    case 'bident':
      relief(ctx, () => {
        ctx.beginPath();
        roundRect(ctx, cx - 5, cy - 20, 10, 80, 4);
        ctx.moveTo(cx - 28, cy - 58);
        ctx.lineTo(cx - 20, cy - 58);
        ctx.lineTo(cx - 18, cy - 28);
        ctx.quadraticCurveTo(cx, cy - 12, cx + 18, cy - 28);
        ctx.lineTo(cx + 20, cy - 58);
        ctx.lineTo(cx + 28, cy - 58);
        ctx.lineTo(cx + 26, cy - 20);
        ctx.quadraticCurveTo(cx, cy + 4, cx - 26, cy - 20);
        ctx.closePath();
      }, '#6a6a7a');
      // a little skull on the shaft, eyes glowing
      relief(ctx, () => {
        ctx.beginPath();
        ctx.arc(cx, cy + 22, 15, Math.PI, 0);
        ctx.lineTo(cx + 10, cy + 38);
        ctx.lineTo(cx - 10, cy + 38);
        ctx.closePath();
      }, '#efe6d0', 2.6);
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = 8;
      for (const sx of [-1, 1]) {
        circle(ctx, cx + sx * 6, cy + 24, 4);
        ctx.fillStyle = col;
        ctx.fill();
      }
      ctx.restore();
      break;
    case 'pomegranate':
      relief(ctx, () => {
        ctx.beginPath();
        ctx.arc(cx, cy + 10, 38, 0, Math.PI * 2);
      }, lit(ctx, cx, cy + 10, 38, col, 0.4));
      relief(ctx, () => poly(ctx, [[cx - 12, cy - 26], [cx - 16, cy - 40], [cx - 6, cy - 32], [cx, cy - 44], [cx + 6, cy - 32], [cx + 16, cy - 40], [cx + 12, cy - 26]]), G, 2.4);
      // a cut window with seeds
      ellipse(ctx, cx + 8, cy + 14, 18, 14, -0.3);
      ctx.fillStyle = '#ffe8d0';
      ctx.fill();
      ink(ctx, 2.2);
      for (let i = 0; i < 7; i++) {
        circle(ctx, cx + 8 + Math.cos(i) * 10, cy + 14 + Math.sin(i * 1.7) * 7, 3.2);
        ctx.fillStyle = shade(col, -0.2);
        ctx.fill();
      }
      // a spring sprig
      ctx.beginPath();
      ctx.moveTo(cx - 34, cy + 40);
      ctx.quadraticCurveTo(cx - 50, cy + 10, cx - 40, cy - 20);
      ctx.strokeStyle = '#4a8a3a';
      ctx.lineWidth = 3;
      ctx.stroke();
      for (const [lx, ly] of [[-46, 20], [-44, 0], [-40, -14]] as [number, number][]) {
        ellipse(ctx, cx + lx + 6, cy + ly, 7, 3.5, -0.6);
        ctx.fillStyle = '#7ad05a';
        ctx.fill();
        ink(ctx, 1.6);
      }
      break;
    case 'wings':
      for (const sx of [-1, 1])
        relief(ctx, () => {
          ctx.beginPath();
          ctx.moveTo(cx + sx * 4, cy + 20);
          ctx.bezierCurveTo(cx + sx * 20, cy - 40, cx + sx * 50, cy - 50, cx + sx * 56, cy - 56);
          ctx.lineTo(cx + sx * 52, cy - 34);
          ctx.lineTo(cx + sx * 58, cy - 30);
          ctx.lineTo(cx + sx * 48, cy - 12);
          ctx.lineTo(cx + sx * 52, cy - 6);
          ctx.lineTo(cx + sx * 38, cy + 8);
          ctx.lineTo(cx + sx * 40, cy + 16);
          ctx.lineTo(cx + sx * 20, cy + 26);
          ctx.closePath();
        }, G, 3);
      // a laurel wreath disc in the middle
      relief(ctx, () => circle(ctx, cx, cy + 26, 16), lit(ctx, cx, cy + 26, 16, col, 0.4), 2.6);
      break;
    case 'veil':
      // a starry night veil: a crescent and stars on a dark field
      relief(ctx, () => circle(ctx, cx, cy, 46), lit(ctx, cx, cy, 46, '#1e1a3a', 0.3));
      ctx.save();
      circle(ctx, cx, cy, 44);
      ctx.clip();
      for (const [sx, sy, sr] of [[-22, -20, 4], [18, -28, 3], [26, 14, 4], [-8, 26, 3], [-30, 6, 2.5], [6, -6, 2]] as [number, number, number][]) {
        ctx.save();
        ctx.shadowColor = col;
        ctx.shadowBlur = 8;
        star(ctx, cx + sx, cy + sy, sr * 2, 4);
        ctx.fillStyle = '#fff8e0';
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      relief(ctx, () => {
        ctx.beginPath();
        ctx.arc(cx + 2, cy + 2, 26, 0, Math.PI * 2);
        ctx.arc(cx + 14, cy - 6, 22, 0, Math.PI * 2, true);
      }, G, 2.6);
      break;
  }
}

function heart(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y + s);
  ctx.bezierCurveTo(x - s * 1.6, y - s * 0.1, x - s * 0.7, y - s * 1.3, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.7, y - s * 1.3, x + s * 1.6, y - s * 0.1, x, y + s);
  ctx.closePath();
}

function star(ctx: Ctx, x: number, y: number, r: number, points = 5, inner = 0.42): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 ? r * inner : r;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** A three-layer cartoon flame: orange body, yellow core, white-hot heart. */
function flame(ctx: Ctx, x: number, y: number, w: number, h: number, col = '#ff8a1c'): void {
  const tongue = (k: number) => {
    ctx.beginPath();
    ctx.moveTo(x - w * k, y);
    ctx.bezierCurveTo(x - w * k * 1.1, y - h * k * 0.5, x - w * k * 0.2, y - h * k * 0.6, x, y - h * k);
    ctx.bezierCurveTo(x + w * k * 0.3, y - h * k * 0.55, x + w * k * 1.1, y - h * k * 0.45, x + w * k, y);
    ctx.closePath();
  };
  tongue(1);
  ctx.fillStyle = col;
  ctx.fill();
  ink(ctx, 3);
  tongue(0.66);
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
  tongue(0.32);
  ctx.fillStyle = '#fff6d0';
  ctx.fill();
}

// ——— NORSE: carved oak in an iron band, runes glowing ———


function drawNorse(ctx: Ctx, a: GodArt, id: string): void {
  const r = rng(hashStr(id));
  const shape = a.shape ?? 'round';
  const wood = a.base ?? '#9a6a3e';
  const iron = a.rim ?? '#5c6068';
  headPath(ctx, shape);
  ctx.fillStyle = lit(ctx, HX, HY, R, wood, 0.25);
  ctx.fill();
  ctx.save();
  headPath(ctx, shape);
  ctx.clip();
  // oak grain: long wavy lines and a couple of knots
  for (let i = 0; i < 16; i++) {
    const y0 = HY - R + i * 12 + r() * 6;
    ctx.beginPath();
    ctx.moveTo(HX - R - 10, y0);
    for (let x = HX - R; x <= HX + R + 10; x += 16) ctx.lineTo(x, y0 + Math.sin(x * 0.05 + i) * 4 + (r() - 0.5) * 2);
    ctx.strokeStyle = rgba(shade(wood, -0.5), 0.3 + r() * 0.2);
    ctx.lineWidth = 1.5 + r() * 2;
    ctx.stroke();
  }
  for (let k = 0; k < 2; k++) {
    const kx = HX - 50 + r() * 100;
    const ky = HY - 50 + r() * 100;
    ellipse(ctx, kx, ky, 8, 5);
    ctx.fillStyle = rgba(shade(wood, -0.6), 0.6);
    ctx.fill();
    ellipse(ctx, kx, ky, 13, 8);
    ctx.strokeStyle = rgba(shade(wood, -0.5), 0.4);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // a carved knotwork ring inside the rim
  ctx.save();
  ctx.translate(HX, HY);
  ctx.scale(0.74, 0.74);
  ctx.translate(-HX, -HY);
  headPath(ctx, shape);
  ctx.restore();
  ctx.strokeStyle = shade(wood, -0.55);
  ctx.lineWidth = 3;
  ctx.stroke();
  // lower shade (top-left light)
  ctx.fillStyle = rgba('#000000', 0.12);
  ctx.beginPath();
  ctx.arc(HX + 30, HY + 40, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // runes round the rim, glowing
  const n = 10;
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
    if (Math.abs(ang - Math.PI / 2) < 0.4) continue; // the handle joint
    const rx = HX + Math.cos(ang) * (R - 22);
    const ry = HY + Math.sin(ang) * (R - 22);
    const idx = Math.floor(r() * RUNES.length);
    noteRune({ idx, x: rx, y: ry, ang: ang + Math.PI / 2, s: 0.95, col: a.color });
    // the cut
    runeAt(ctx, idx, rx, ry, ang + Math.PI / 2, 0.95);
    ctx.strokeStyle = shade(wood, -0.65);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    // the glow inside it
    ctx.save();
    ctx.shadowColor = a.color;
    ctx.shadowBlur = 10;
    runeAt(ctx, idx, rx, ry, ang + Math.PI / 2, 0.95);
    ctx.strokeStyle = shade(a.color, 0.35);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
  // the god's symbol, carved
  norseSymbol(ctx, a.symbol as NorseSymbol, wood, a.color, iron);
  // the iron band and its rivets
  headPath(ctx, shape);
  const ig = ctx.createLinearGradient(HX - R, HY - R, HX + R, HY + R);
  ig.addColorStop(0, shade(iron, 0.45));
  ig.addColorStop(0.4, iron);
  ig.addColorStop(1, shade(iron, -0.4));
  ctx.strokeStyle = ig;
  ctx.lineWidth = 12;
  ctx.stroke();
  headPath(ctx, shape);
  ink(ctx, 4.5);
  for (let i = 0; i < 12; i++) {
    const ang = -Math.PI / 2 + (i / 12) * Math.PI * 2;
    if (Math.abs(ang - Math.PI / 2) < 0.3) continue;
    const rx = HX + Math.cos(ang) * (R - 1);
    const ry = HY + Math.sin(ang) * (R - 1);
    circle(ctx, rx, ry, 3.6);
    ctx.fillStyle = lit(ctx, rx, ry, 4, shade(iron, 0.3), 0.6);
    ctx.fill();
    ink(ctx, 1.6);
  }
  // a dull sheen on the wood
  ctx.save();
  headPath(ctx, shape);
  ctx.clip();
  shine(ctx, HX - 42, HY - 46, 30, 12, 0.22);
  ctx.restore();
  // an iron collar at the handle
  roundRect(ctx, HX - 22, HY + R - 4, 44, 16, 5);
  ctx.fillStyle = ig;
  ctx.fill();
  ink(ctx, 3.5);
}

function norseSymbol(ctx: Ctx, s: NorseSymbol, wood: string, col: string, iron: string): void {
  const cx = HX;
  const cy = HY - 4;
  const glowLine = (path: () => void, w = 3) => {
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 12;
    path();
    ctx.strokeStyle = shade(col, 0.3);
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  };
  const ironFill = (path: () => void) => relief(ctx, path, lit(ctx, cx, cy, 50, iron, 0.5), 3);
  switch (s) {
    case 'eye': {
      // a single great eye, two ravens' wings either side
      for (const sx of [-1, 1])
        carve(ctx, () => {
          ctx.beginPath();
          ctx.moveTo(cx + sx * 26, cy);
          ctx.quadraticCurveTo(cx + sx * 50, cy - 40, cx + sx * 58, cy - 20);
          ctx.lineTo(cx + sx * 48, cy - 14);
          ctx.lineTo(cx + sx * 56, cy - 4);
          ctx.lineTo(cx + sx * 44, cy + 2);
          ctx.lineTo(cx + sx * 50, cy + 14);
          ctx.quadraticCurveTo(cx + sx * 34, cy + 16, cx + sx * 26, cy);
          ctx.closePath();
        }, wood);
      carve(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(cx - 30, cy);
        ctx.quadraticCurveTo(cx, cy - 30, cx + 30, cy);
        ctx.quadraticCurveTo(cx, cy + 30, cx - 30, cy);
        ctx.closePath();
      }, wood);
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = 16;
      circle(ctx, cx, cy, 11);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.restore();
      circle(ctx, cx, cy, 4.5);
      ctx.fillStyle = '#141018';
      ctx.fill();
      shine(ctx, cx - 4, cy - 4, 3, 2, 0.9);
      break;
    }
    case 'hammer':
      ironFill(() => {
        ctx.beginPath();
        ctx.moveTo(cx - 40, cy - 40);
        ctx.lineTo(cx + 40, cy - 40);
        ctx.lineTo(cx + 46, cy - 4);
        ctx.lineTo(cx - 46, cy - 4);
        ctx.closePath();
      });
      carve(ctx, () => roundRect(ctx, cx - 6, cy - 4, 12, 52, 4), wood);
      relief(ctx, () => roundRect(ctx, cx - 9, cy + 44, 18, 10, 3), lit(ctx, cx, cy + 48, 10, iron, 0.5), 2.4);
      glowLine(() => runeAt(ctx, 6, cx, cy - 22, 0, 1.4), 3.2);
      break;
    case 'serpent':
      // a serpent coiled into a knot, its eye a flame
      carve(ctx, () => {
        ctx.beginPath();
        for (let t = 0; t <= 1.001; t += 0.02) {
          const ang = t * Math.PI * 3.4;
          const rr = 44 - t * 26;
          const x = cx + Math.cos(ang) * rr;
          const y = cy + Math.sin(ang) * rr;
          if (t === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }, wood, true, 11);
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = 12;
      circle(ctx, cx + 44, cy, 6);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.restore();
      glowLine(() => {
        ctx.beginPath();
        ctx.moveTo(cx + 50, cy + 2);
        ctx.lineTo(cx + 60, cy - 6);
        ctx.moveTo(cx + 50, cy + 2);
        ctx.lineTo(cx + 60, cy + 8);
      }, 2.4);
      break;
    case 'spindle':
      carve(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(cx, cy - 50);
        ctx.lineTo(cx, cy + 50);
      }, wood, true, 7);
      carve(ctx, () => {
        ctx.beginPath();
        ctx.ellipse(cx, cy + 4, 20, 30, 0, 0, Math.PI * 2);
      }, wood);
      // the thread, glowing, wound round it and drifting off
      glowLine(() => {
        ctx.beginPath();
        for (let i = 0; i < 7; i++) {
          ctx.moveTo(cx - 18, cy - 16 + i * 6);
          ctx.lineTo(cx + 18, cy - 12 + i * 6);
        }
        ctx.moveTo(cx + 18, cy + 22);
        ctx.bezierCurveTo(cx + 40, cy + 30, cx + 30, cy - 30, cx + 52, cy - 36);
      }, 2.2);
      relief(ctx, () => circle(ctx, cx, cy + 46, 9), lit(ctx, cx, cy + 46, 9, iron, 0.5), 2.4);
      break;
    case 'falcon':
      carve(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(cx, cy - 30);
        ctx.quadraticCurveTo(cx + 10, cy - 34, cx + 14, cy - 24);
        ctx.lineTo(cx + 22, cy - 22);
        ctx.lineTo(cx + 12, cy - 16);
        ctx.quadraticCurveTo(cx + 50, cy - 40, cx + 60, cy - 24);
        ctx.quadraticCurveTo(cx + 34, cy - 6, cx + 14, cy + 6);
        ctx.lineTo(cx + 10, cy + 44);
        ctx.lineTo(cx, cy + 34);
        ctx.lineTo(cx - 10, cy + 44);
        ctx.lineTo(cx - 14, cy + 6);
        ctx.quadraticCurveTo(cx - 34, cy - 6, cx - 60, cy - 24);
        ctx.quadraticCurveTo(cx - 50, cy - 40, cx - 12, cy - 16);
        ctx.quadraticCurveTo(cx - 10, cy - 30, cx, cy - 30);
        ctx.closePath();
      }, wood);
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = 10;
      circle(ctx, cx + 6, cy - 24, 3.5);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.restore();
      // a gold necklace under it (Brísingamen)
      glowLine(() => {
        ctx.beginPath();
        ctx.arc(cx, cy + 22, 30, 0.2, Math.PI - 0.2);
      }, 3);
      break;
    case 'boar':
      relief(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(cx - 46, cy + 10);
        ctx.quadraticCurveTo(cx - 40, cy - 26, cx - 6, cy - 30);
        ctx.lineTo(cx + 4, cy - 40);
        ctx.lineTo(cx + 12, cy - 28);
        ctx.quadraticCurveTo(cx + 36, cy - 22, cx + 50, cy - 2);
        ctx.lineTo(cx + 54, cy + 10);
        ctx.lineTo(cx + 40, cy + 14);
        ctx.lineTo(cx + 34, cy + 34);
        ctx.lineTo(cx + 24, cy + 34);
        ctx.lineTo(cx + 22, cy + 20);
        ctx.lineTo(cx - 22, cy + 22);
        ctx.lineTo(cx - 24, cy + 36);
        ctx.lineTo(cx - 34, cy + 36);
        ctx.lineTo(cx - 36, cy + 20);
        ctx.closePath();
      }, lit(ctx, cx, cy, 50, '#e8b43a', 0.5));
      // bristles and a tusk
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - 30 + i * 9, cy - 22 + Math.abs(i - 3) * 2);
        ctx.lineTo(cx - 34 + i * 9, cy - 32 + Math.abs(i - 3) * 2);
        ctx.stroke();
      }
      poly(ctx, [[cx + 42, cy + 8], [cx + 50, cy - 8], [cx + 46, cy + 10]]);
      ctx.fillStyle = '#fff6e0';
      ctx.fill();
      ink(ctx, 2);
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = 10;
      circle(ctx, cx + 30, cy - 10, 3.5);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.restore();
      break;
    case 'sword':
      ironFill(() => {
        ctx.beginPath();
        ctx.moveTo(cx, cy - 56);
        ctx.lineTo(cx + 8, cy - 44);
        ctx.lineTo(cx + 8, cy + 18);
        ctx.lineTo(cx - 8, cy + 18);
        ctx.lineTo(cx - 8, cy - 44);
        ctx.closePath();
      });
      carve(ctx, () => roundRect(ctx, cx - 26, cy + 16, 52, 8, 3), wood);
      carve(ctx, () => roundRect(ctx, cx - 5, cy + 24, 10, 24, 3), wood);
      glowLine(() => runeAt(ctx, 8, cx, cy - 16, 0, 1.3), 2.8);
      break;
    case 'horn':
      relief(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(cx - 50, cy - 30);
        ctx.bezierCurveTo(cx - 30, cy + 30, cx + 20, cy + 40, cx + 50, cy - 10);
        ctx.lineTo(cx + 40, cy - 30);
        ctx.bezierCurveTo(cx + 16, cy + 10, cx - 24, cy + 10, cx - 40, cy - 34);
        ctx.closePath();
      }, lit(ctx, cx, cy, 50, '#efe2c0', 0.3));
      for (const t of [0.3, 0.55, 0.8]) {
        ctx.beginPath();
        const x = cx - 50 + t * 100;
        ctx.moveTo(x - 4, cy - 16 + Math.sin(t * Math.PI) * 30);
        ctx.lineTo(x + 6, cy - 8 + Math.sin(t * Math.PI) * 30);
        ctx.strokeStyle = shade(iron, -0.1);
        ctx.lineWidth = 6;
        ctx.stroke();
      }
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = 14;
      ellipse(ctx, cx + 46, cy - 22, 8, 12, 0.6);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.restore();
      break;
    case 'sun':
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = 16;
      star(ctx, cx, cy, 46, 12, 0.72);
      ctx.fillStyle = shade(col, 0.2);
      ctx.fill();
      ctx.restore();
      star(ctx, cx, cy, 46, 12, 0.72);
      ink(ctx, 3);
      carve(ctx, () => circle(ctx, cx, cy, 26), wood);
      glowLine(() => {
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      }, 3);
      break;
    case 'halfskull':
      // a face that's half living, half bone
      carve(ctx, () => {
        ctx.beginPath();
        ctx.arc(cx, cy - 6, 38, Math.PI * 0.85, Math.PI * 2.15);
        ctx.lineTo(cx + 20, cy + 44);
        ctx.lineTo(cx - 20, cy + 44);
        ctx.closePath();
      }, wood);
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx, cy - 60, 60, 120);
      ctx.clip();
      ctx.beginPath();
      ctx.arc(cx, cy - 6, 34, Math.PI * 0.85, Math.PI * 2.15);
      ctx.lineTo(cx + 18, cy + 40);
      ctx.lineTo(cx - 18, cy + 40);
      ctx.closePath();
      ctx.fillStyle = '#e8e0cc';
      ctx.fill();
      ink(ctx, 2.4);
      ctx.restore();
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = 12;
      circle(ctx, cx + 14, cy - 4, 7);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.restore();
      circle(ctx, cx - 14, cy - 4, 6);
      ctx.fillStyle = '#e8e0cc';
      ctx.fill();
      ink(ctx, 2);
      circle(ctx, cx - 14, cy - 4, 2.6);
      ctx.fillStyle = '#2a1810';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx, cy - 46);
      ctx.lineTo(cx, cy + 44);
      ctx.strokeStyle = shade(wood, -0.7);
      ctx.lineWidth = 2.4;
      ctx.stroke();
      break;
    case 'ship':
      carve(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(cx - 52, cy + 10);
        ctx.lineTo(cx + 52, cy + 10);
        ctx.quadraticCurveTo(cx + 40, cy + 34, cx, cy + 34);
        ctx.quadraticCurveTo(cx - 40, cy + 34, cx - 52, cy + 10);
        ctx.closePath();
        ctx.moveTo(cx - 52, cy + 10);
        ctx.quadraticCurveTo(cx - 60, cy - 10, cx - 50, cy - 18);
        ctx.lineTo(cx - 46, cy + 10);
      }, wood);
      carve(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(cx, cy + 10);
        ctx.lineTo(cx, cy - 52);
      }, wood, true, 6);
      relief(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(cx - 30, cy - 46);
        ctx.quadraticCurveTo(cx, cy - 52, cx + 30, cy - 46);
        ctx.quadraticCurveTo(cx + 36, cy - 20, cx + 30, cy + 2);
        ctx.quadraticCurveTo(cx, cy - 2, cx - 30, cy + 2);
        ctx.quadraticCurveTo(cx - 36, cy - 20, cx - 30, cy - 46);
        ctx.closePath();
      }, lit(ctx, cx, cy - 22, 30, '#efe2c0', 0.3), 2.6);
      glowLine(() => {
        ctx.beginPath();
        for (let x = -50; x <= 50; x += 4) ctx.lineTo(cx + x, cy + 46 + Math.sin(x * 0.2) * 4);
      }, 3);
      break;
    case 'snowflake':
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = 12;
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * 46, cy + Math.sin(ang) * 46);
        for (const k of [0.45, 0.72]) {
          const bx = cx + Math.cos(ang) * 46 * k;
          const by = cy + Math.sin(ang) * 46 * k;
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(ang + 0.7) * 12, by + Math.sin(ang + 0.7) * 12);
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(ang - 0.7) * 12, by + Math.sin(ang - 0.7) * 12);
        }
        ctx.strokeStyle = shade(wood, -0.6);
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.strokeStyle = shade(col, 0.3);
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.restore();
      break;
    case 'apple':
      relief(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(cx, cy - 22);
        ctx.bezierCurveTo(cx + 24, cy - 40, cx + 50, cy - 16, cx + 40, cy + 16);
        ctx.bezierCurveTo(cx + 32, cy + 44, cx + 10, cy + 46, cx, cy + 38);
        ctx.bezierCurveTo(cx - 10, cy + 46, cx - 32, cy + 44, cx - 40, cy + 16);
        ctx.bezierCurveTo(cx - 50, cy - 16, cx - 24, cy - 40, cx, cy - 22);
        ctx.closePath();
      }, lit(ctx, cx - 6, cy, 46, '#f2c230', 0.55));
      carve(ctx, () => roundRect(ctx, cx - 3, cy - 40, 6, 20, 2), wood);
      relief(ctx, () => {
        ctx.beginPath();
        ctx.ellipse(cx + 16, cy - 34, 14, 6, -0.5, 0, Math.PI * 2);
      }, '#6ab04a', 2.2);
      shine(ctx, cx - 18, cy - 6, 10, 6, 0.6);
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = 18;
      circle(ctx, cx + 20, cy + 12, 3);
      ctx.fillStyle = '#fff6d0';
      ctx.fill();
      ctx.restore();
      break;
    case 'harp':
      carve(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(cx - 34, cy + 46);
        ctx.lineTo(cx - 34, cy - 40);
        ctx.quadraticCurveTo(cx + 10, cy - 56, cx + 38, cy - 20);
        ctx.quadraticCurveTo(cx + 10, cy + 10, cx - 34, cy + 46);
      }, wood, true, 9);
      glowLine(() => {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const x = cx - 26 + i * 10;
          ctx.moveTo(x, cy - 40 + i * 2 + (i > 2 ? i * 3 : 0));
          ctx.lineTo(x, cy + 38 - i * 9);
        }
      }, 1.8);
      // a carved dragon-head finial
      relief(ctx, () => circle(ctx, cx + 40, cy - 22, 8), lit(ctx, cx + 40, cy - 22, 8, iron, 0.5), 2.2);
      break;
  }
}

// ——— THE KRATOS PEEL: a bronze crested helm, red crest, chain round the handle ———
export function kratosLook(): PeelLook {
  return {
    shape: 'round',
    head: headFrom('#c9873a'),
    handle: handleFrom('#5a2a1a'),
    pattern: 'plain',
    patternColor: '#c8102e',
    metal: true,
    trail: '#ff6a1a',
    seed: 'hero:kratos',
    custom: drawKratos,
  };
}

function bronzeGrad(ctx: Ctx, x0: number, x1: number, col = '#c9873a'): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, shade(col, -0.5));
  g.addColorStop(0.25, shade(col, 0.1));
  g.addColorStop(0.38, shade(col, 0.6));
  g.addColorStop(0.52, col);
  g.addColorStop(1, shade(col, -0.55));
  return g;
}

function drawKratos(ctx: Ctx): void {
  const bz = '#c9873a';
  const red = '#c8102e';
  // chain wrapped round the handle: oval iron links, alternating side-on and face-on
  for (let i = 0; i < 9 && want(); i++) {
    const y = HY + R + 8 + i * 15;
    ctx.save();
    ctx.translate(HX, y);
    ctx.rotate(i % 2 ? 0.5 : -0.5);
    if (i % 2) {
      roundRect(ctx, -18, -4, 36, 8, 4);
      ctx.fillStyle = '#5c6068';
      ctx.fill();
      ink(ctx, 2.6);
    } else {
      ellipse(ctx, 0, 0, 19, 8);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 7;
      ctx.stroke();
      ellipse(ctx, 0, 0, 19, 8);
      ctx.strokeStyle = '#8a9098';
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
    ctx.restore();
  }
  // the red horsehair crest, arching front to back over the helm (it streams on a living peel: src/art/peelGod.ts)
  if (want('crest')) kratosCrest(ctx, red);
  if (!want()) return;
  kratosHelm(ctx, bz, red);
}

function kratosCrest(ctx: Ctx, red: string): void {
  const crest = () => {
    ctx.beginPath();
    ctx.moveTo(HX - 70, HY - 30);
    ctx.bezierCurveTo(HX - 80, HY - 120, HX + 60, HY - 140, HX + 100, HY - 40);
    ctx.bezierCurveTo(HX + 104, HY - 16, HX + 96, HY + 6, HX + 84, HY + 20);
    ctx.bezierCurveTo(HX + 80, HY - 30, HX + 40, HY - 74, HX - 20, HY - 72);
    ctx.bezierCurveTo(HX - 46, HY - 70, HX - 60, HY - 52, HX - 70, HY - 30);
    ctx.closePath();
  };
  crest();
  const cg = ctx.createLinearGradient(HX - 70, HY - 130, HX + 80, HY + 10);
  cg.addColorStop(0, shade(red, 0.4));
  cg.addColorStop(0.5, red);
  cg.addColorStop(1, shade(red, -0.45));
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.save();
  crest();
  ctx.clip();
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    ctx.beginPath();
    ctx.moveTo(HX - 70 + t * 30, HY - 30 - t * 40);
    ctx.bezierCurveTo(HX - 60 + t * 40, HY - 120 + t * 10, HX + 40 + t * 10, HY - 130 + t * 40, HX + 100 - t * 10, HY - 40 + t * 50);
    ctx.strokeStyle = rgba(i % 2 ? '#ffffff' : '#3a0408', i % 2 ? 0.18 : 0.35);
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
  ctx.restore();
  crest();
  ink(ctx, 5);
}

function kratosHelm(ctx: Ctx, bz: string, red: string): void {
  // the helm: a bronze dome with cheek guards and a T-shaped face opening
  const helm = () => {
    ctx.beginPath();
    ctx.moveTo(HX - 74, HY + 70);
    ctx.bezierCurveTo(HX - 92, HY + 10, HX - 84, HY - 70, HX, HY - 78);
    ctx.bezierCurveTo(HX + 84, HY - 70, HX + 92, HY + 10, HX + 74, HY + 70);
    ctx.quadraticCurveTo(HX + 50, HY + 88, HX + 30, HY + 80);
    ctx.lineTo(HX + 22, HY + 20);
    ctx.lineTo(HX + 8, HY + 8);
    ctx.lineTo(HX + 8, HY + 80);
    ctx.lineTo(HX - 8, HY + 80);
    ctx.lineTo(HX - 8, HY + 8);
    ctx.lineTo(HX - 22, HY + 20);
    ctx.lineTo(HX - 30, HY + 80);
    ctx.quadraticCurveTo(HX - 50, HY + 88, HX - 74, HY + 70);
    ctx.closePath();
  };
  // the dark inside of the helm first (seen through the face opening)
  ellipse(ctx, HX, HY + 30, 50, 58);
  ctx.fillStyle = '#1a0e0a';
  ctx.fill();
  // eyes glowing ember-orange in the dark
  ctx.save();
  ctx.shadowColor = '#ff6a1a';
  ctx.shadowBlur = 14;
  for (const sx of [-1, 1]) {
    ellipse(ctx, HX + sx * 18, HY + 2, 9, 4, sx * 0.25);
    ctx.fillStyle = '#ffb040';
    ctx.fill();
  }
  ctx.restore();
  helm();
  ctx.fillStyle = bronzeGrad(ctx, HX - 90, HX + 90, bz);
  ctx.fill();
  ctx.save();
  helm();
  ctx.clip();
  // the brow ridge, embossed eyebrows and a band of rivets
  ctx.beginPath();
  ctx.moveTo(HX - 80, HY - 8);
  ctx.quadraticCurveTo(HX, HY - 34, HX + 80, HY - 8);
  ctx.strokeStyle = rgba(INK, 0.45);
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(HX - 78, HY - 14);
  ctx.quadraticCurveTo(HX, HY - 40, HX + 78, HY - 14);
  ctx.strokeStyle = rgba('#fff0c0', 0.45);
  ctx.lineWidth = 3;
  ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const x = HX - 70 + t * 140;
    const y = HY - 22 - Math.sin(t * Math.PI) * 18;
    ellipse(ctx, x, y, 3.6, 3.6);
    ctx.fillStyle = shade(bz, 0.45);
    ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.6);
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  // a lambda-free spiral motif of our own on each cheek guard
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    for (let t = 0; t < 1; t += 0.04) {
      const a = t * Math.PI * 3;
      const rr = 3 + t * 12;
      const x = HX + sx * 50 + Math.cos(a) * rr * sx;
      const y = HY + 44 + Math.sin(a) * rr;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgba(INK, 0.45);
    ctx.lineWidth = 2.6;
    ctx.stroke();
  }
  // battle scratches and a red war-paint stripe
  ctx.strokeStyle = rgba('#fff0c0', 0.5);
  ctx.lineWidth = 1.6;
  for (const [x0, y0, x1, y1] of [[HX + 30, HY - 60, HX + 48, HY - 40], [HX - 60, HY + 30, HX - 44, HY + 50], [HX + 56, HY + 10, HX + 70, HY + 22]]) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(HX - 6, HY - 76);
  ctx.lineTo(HX - 6, HY - 30);
  ctx.lineTo(HX + 6, HY - 30);
  ctx.lineTo(HX + 6, HY - 76);
  ctx.fillStyle = rgba(red, 0.85);
  ctx.fill();
  ctx.fillStyle = rgba('#ffffff', 0.32);
  ctx.beginPath();
  ctx.ellipse(HX - 38, HY - 46, 26, 12, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  helm();
  ink(ctx, 5);
  // the crest's bronze holder
  roundRect(ctx, HX - 14, HY - 90, 28, 16, 5);
  ctx.fillStyle = bronzeGrad(ctx, HX - 14, HX + 14, bz);
  ctx.fill();
  ink(ctx, 3);
}

// ——— THE GOD PEEL: radiant gold and marble, a halo, a crown of tiny peels and a prismatic sheen ———
export function godPeelLook(): PeelLook {
  return {
    shape: 'round',
    head: headFrom('#ffe27a'),
    handle: handleFrom('#e8b43a'),
    pattern: 'plain',
    patternColor: '#ffd23f',
    metal: true,
    shiny: true,
    studs: '#ffd23f',
    trail: '#ffd23f',
    seed: 'god:pizzagods',
    custom: drawGodPeel,
  };
}

function drawGodPeel(ctx: Ctx): void {
  // on a living peel the sunburst turns, the halo floats, the gold rays turn and the crown's tiny peels hop
  // (src/art/peelGod.ts)
  if (want('burst')) godPeelBurst(ctx);
  if (want('halo')) godPeelHalo(ctx);
  if (want()) godPeelFace(ctx);
  if (want('rays')) godPeelRays(ctx);
  if (want('slice')) godPeelSlice(ctx);
  // the crown of tiny peels: one from each group, fanned round the top of the rim
  GOD_CROWN.forEach((_c, k) => want(`p${k}`) && godPeelTiny(ctx, k));
  if (want('finish')) godPeelFinish(ctx);
}

/** A sunburst of light behind everything. */
function godPeelBurst(ctx: Ctx): void {
  ctx.save();
  const sb = ctx.createRadialGradient(HX, HY, 20, HX, HY, R + 34);
  sb.addColorStop(0, 'rgba(255,248,200,0.95)');
  sb.addColorStop(0.7, 'rgba(255,214,80,0.5)');
  sb.addColorStop(1, 'rgba(255,214,80,0)');
  ctx.fillStyle = sb;
  ctx.beginPath();
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const rr = i % 2 ? R + 10 : R + 34;
    if (i) ctx.lineTo(HX + Math.cos(a) * rr, HY + Math.sin(a) * rr);
    else ctx.moveTo(HX + Math.cos(a) * rr, HY + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The halo, drawn tilted above the head. */
export function godPeelHalo(ctx: Ctx): void {
  ctx.save();
  ctx.shadowColor = '#fff2a0';
  ctx.shadowBlur = 18;
  ellipse(ctx, HX, HY - R + 2, 64, 15);
  ctx.strokeStyle = '#ffe27a';
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.restore();
  ellipse(ctx, HX, HY - R + 2, 64, 15);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.stroke();
}

/** The God Peel's crown of tiny peels, one from each group: [head, handle]. */
export const GOD_CROWN: [string, string][] = [
  ['#d9a066', '#8a5a2b'], // classic
  ['#ffd23f', '#c89a2a'], // golden crust
  ['#5fd8ff', '#2a7ad8'], // a jewel
  ['#f0c8a0', '#8a5a3a'], // a foot
  ['#ff5a3c', '#8a1a1a'], // a boss
  ['#7be04a', '#2f8a3a'], // a place
  ['#ff7ad9', '#8a2a6a'], // an event
  ['#e8b43a', '#c8102e'], // a pizza
  ['#a77dff', '#4a2a8a'], // a hero
];
/** Where the crown's tiny peel i sits: its centre and its turn. */
export function godCrownAt(i: number): [number, number, number] {
  const a = Math.PI * (1.18 + (i / (GOD_CROWN.length - 1)) * 0.64);
  return [HX + Math.cos(a) * (R + 4), HY + Math.sin(a) * (R + 4), a + Math.PI / 2];
}

function godPeelTiny(ctx: Ctx, i: number): void {
  const [c, h] = GOD_CROWN[i];
  const [x, y, rot] = godCrownAt(i);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  roundRect(ctx, -2.5, 2, 5, 16, 2);
  ctx.fillStyle = h;
  ctx.fill();
  ink(ctx, 1.6);
  circle(ctx, 0, -6, 9);
  ctx.fillStyle = lit(ctx, 0, -6, 9, c, 0.5);
  ctx.fill();
  ink(ctx, 2);
  shine(ctx, -3, -9, 3, 1.8, 0.7);
  ctx.restore();
}

function godPeelFace(ctx: Ctx): void {
  // the head: marble in a heavy gold rim
  headPath(ctx, 'round');
  ctx.fillStyle = lit(ctx, HX, HY, R, '#f6f0e2', 0.12);
  ctx.fill();
  ctx.save();
  headPath(ctx, 'round');
  ctx.clip();
  const r = rng(hashStr('god:pizzagods'));
  for (let i = 0; i < 5; i++) {
    let x = HX - R + r() * R * 2;
    let y = HY - R;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 8; k++) {
      x += (r() - 0.45) * 40;
      y += 28;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgba('#c9a040', 0.55);
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
  // the prismatic sheen (like the jewel peels)
  const pr = ctx.createLinearGradient(HX - R, HY + R, HX + R, HY - R);
  ['#ff7ad9', '#ffd23f', '#7dff9a', '#5fd8ff', '#a77dff', '#ff7ad9'].forEach((c, i, arr) => pr.addColorStop(i / (arr.length - 1), rgba(c, 0.28)));
  ctx.fillStyle = pr;
  ctx.fillRect(HX - R, HY - R, R * 2, R * 2 + 20);
  ctx.restore();
  headPath(ctx, 'round');
  ctx.strokeStyle = gold(ctx, HX - R, HY - R, HX + R, HY + R, '#f2c230');
  ctx.lineWidth = 15;
  ctx.stroke();
  headPath(ctx, 'round');
  ink(ctx, 5);
}

function godPeelRays(ctx: Ctx): void {
  // gold rays fanned from a pizza-slice sun in the middle
  ctx.save();
  ctx.translate(HX, HY + 4);
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    poly(ctx, [[-4, -24], [0, -56], [4, -24]]);
    ctx.fillStyle = gold(ctx, -4, -56, 4, -24, '#f2c230');
    ctx.fill();
    ink(ctx, 1.8);
  }
  ctx.restore();
}

function godPeelSlice(ctx: Ctx): void {
  // the slice: crust, cheese and pepperoni, in gold leaf
  relief(ctx, () => poly(ctx, [[HX - 24, HY - 14], [HX + 24, HY - 14], [HX, HY + 34]]), gold(ctx, HX - 24, HY - 14, HX + 24, HY + 34, '#ffd23f'), 3.4);
  relief(ctx, () => roundRect(ctx, HX - 27, HY - 22, 54, 11, 5), gold(ctx, HX - 27, HY - 22, HX + 27, HY - 11, '#d9902a'), 3);
  for (const [px, py] of [[-8, -2], [8, 2], [0, 16]] as [number, number][]) {
    circle(ctx, HX + px, HY + py, 5);
    ctx.fillStyle = '#e0402a';
    ctx.fill();
    ink(ctx, 1.8);
  }
}

function godPeelFinish(ctx: Ctx): void {
  // a sheen and some sparkles
  ctx.save();
  headPath(ctx, 'round');
  ctx.clip();
  shine(ctx, HX - 40, HY - 44, 32, 14, 0.5);
  ctx.restore();
  for (const [sx, sy, sr] of [[HX + 58, HY - 50, 9], [HX - 64, HY + 30, 7], [HX + 64, HY + 46, 6]] as [number, number, number][]) {
    star(ctx, sx, sy, sr, 4, 0.3);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  roundRect(ctx, HX - 24, HY + R - 4, 48, 18, 6);
  ctx.fillStyle = gold(ctx, HX - 24, HY + R - 4, HX + 24, HY + R + 14, '#f2c230');
  ctx.fill();
  ink(ctx, 3.5);
}

/** The locked God Peel slot: a sealed gold silhouette. */
export function godSilhouette(ctx: Ctx): void {
  headPath(ctx, 'round');
  ctx.fillStyle = lit(ctx, HX, HY, R, '#8a6a2a', 0.3);
  ctx.fill();
  headPath(ctx, 'round');
  ink(ctx, 5);
}
