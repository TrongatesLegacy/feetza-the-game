// Hero peel heads: each hero's peel head is its costume, drawn from parts (cape, ears, mask, eyes, hair, emblem
// and extras) in the game's style: thick dark-brown outlines, soft gradients lit from the top left, a sheen.
// Every emblem here is our own design (stars, slices, crescents, a lampshade…), never a real hero's logo.
// Gods can use the same parts, or pass `detail` to draw their own carvings on top.

import { INK } from './feetCommon';
import { PEEL_HEAD, headPath, handleFrom, headFrom, type PeelLook, type PeelShape } from './peelArt';
import { type Ctx, ellipse, hashStr, rgba, rng, roundRect, shade } from './util';

const { x: HX, y: HY, r: R } = PEEL_HEAD;

export type MaskKind = 'open' | 'domino' | 'cowl' | 'full' | 'helmet' | 'faceplate' | 'visorBand' | 'visorBug' | 'goggles' | 'hood' | 'raccoon' | 'beakHelm' | 'none';
export type EyeKind =
  | 'friendly' | 'white' | 'slits' | 'bigWhite' | 'glowSlits' | 'angry' | 'sly' | 'squint' | 'glow' | 'visor' | 'lenses' | 'none' | 'patches'
  | 'stern' | 'lashes' | 'martian' | 'ember' | 'cyber' | 'redOnBlack' | 'bugVisor' | 'bugGlossy' | 'goggleDark' | 'starVisor' | 'happy';
export type EarKind = 'bat' | 'cat' | 'horns' | 'boltWings' | 'smallWings' | 'fins' | 'fletching' | 'antennae' | 'leaves' | 'roots' | 'flames' | 'round' | 'squirrel' | 'wings' | 'waspWings';
export type HairKind = 'quiff' | 'long' | 'bob' | 'mane' | 'short' | 'messy' | 'sideburns' | 'swept' | 'mohawk' | 'temples';
export type PatternKind = 'web' | 'scales' | 'bark' | 'plates' | 'chrome' | 'fur' | 'stripes' | 'frost' | 'flames' | 'wraps' | 'fishnet' | 'cracks' | 'seams' | 'halfMetal' | 'vines' | 'embers' | 'bolts';
export type ExtraKind =
  | 'belt' | 'utilityBelt' | 'tiara' | 'bracers' | 'chin' | 'rivets' | 'grimace' | 'torn' | 'highCollar' | 'goatee' | 'crownSpikes' | 'katanas'
  | 'snout' | 'snoutNose' | 'headphones' | 'goggles' | 'whiskers' | 'brow' | 'collarGem' | 'stretchBands' | 'cap' | 'topHat' | 'bowtie' | 'moss'
  | 'chain' | 'lawCollar' | 'softServe' | 'coatCollar' | 'buckTeeth' | 'tail' | 'chefHat' | 'smile' | 'antennaeSmall';
export type EmblemKind =
  | 'star4' | 'nightSlice' | 'laurel' | 'chevrons' | 'wave' | 'lampshade' | 'sliceSpider' | 'core' | 'pizzaShield' | 'window' | 'target' | 'claws'
  | 'cloudBolt' | 'eye' | 'fangs' | 'amulet' | 'hex' | 'arrowsInOut' | 'doubleD' | 'cutter' | 'fin' | 'leaf' | 'rocket' | 'cassette' | 'sunburst'
  | 'sliceBolt' | 'circuit' | 'sliceBadge' | 'paw' | 'gem' | 'arrowUp' | 'spring' | 'feather' | 'scarab' | 'cheese' | 'plug' | 'wand' | 'mushroom'
  | 'sticks' | 'flame' | 'crescent' | 'gavel' | 'wasabiLeaf' | 'spade' | 'snowflake' | 'flameRing' | 'cheeseString' | 'acorn';

export interface HeroArt {
  shape?: PeelShape;
  /** Costume colour (the head), and a lower half in another colour. */
  suit: string;
  suit2?: string;
  skin?: string;
  mask?: MaskKind;
  maskColor?: string;
  eyes?: EyeKind;
  eyeColor?: string;
  ears?: EarKind;
  earColor?: string;
  cape?: string;
  capeTrim?: string;
  hair?: string;
  hairStyle?: HairKind;
  pattern?: PatternKind;
  patternColor?: string;
  emblem?: EmblemKind;
  emblemColor?: string;
  emblemBg?: string;
  extras?: ExtraKind[];
  metal?: boolean;
  /** A soft coloured glow round the head. */
  glow?: string;
  handle?: string;
  trail: string;
  /** Headline heroes: extra stitching, folds and rim light. */
  fine?: boolean;
  /** Hand-drawn detail on top of everything (gods' carvings). */
  detail?: (ctx: Ctx) => void;
}

/** A hero's PeelLook: the usual fields (trail, handle, foil) plus the hand-drawn head. */
export function heroLook(id: string, a: HeroArt): () => PeelLook {
  return () => ({
    shape: a.shape ?? 'round',
    head: headFrom(a.suit),
    handle: handleFrom(a.handle ?? '#8a5a2b'),
    pattern: 'plain',
    patternColor: a.patternColor ?? a.suit,
    metal: a.metal,
    trail: a.trail,
    seed: id,
    custom: (ctx) => drawHeroHead(ctx, a, id),
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

function fillInk(ctx: Ctx, fill: string | CanvasGradient, lw = 4): void {
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) ink(ctx, lw);
}

/** Radial gradient lit from the top left. */
function lit(ctx: Ctx, x: number, y: number, r: number, base: string, k = 0.35): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r * 1.05);
  g.addColorStop(0, shade(base, k));
  g.addColorStop(0.65, base);
  g.addColorStop(1, shade(base, -0.3));
  return g;
}

function vlin(ctx: Ctx, y0: number, y1: number, a: string, b: string): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  return g;
}

function shine(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.45, rot = -0.6): void {
  ellipse(ctx, x, y, rx, ry, rot);
  ctx.fillStyle = rgba('#ffffff', a);
  ctx.fill();
}

function circle(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function poly(ctx: Ctx, pts: [number, number][]): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

function starPath(ctx: Ctx, x: number, y: number, r: number, points = 5, inner = 0.45, rot = -Math.PI / 2): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 ? r * inner : r;
    const a = rot + (i * Math.PI) / points;
    if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function boltPath(ctx: Ctx, x: number, y: number, s: number): void {
  poly(ctx, [
    [x + 4 * s, y - 14 * s],
    [x - 7 * s, y + 2 * s],
    [x - 0.5 * s, y + 2 * s],
    [x - 4 * s, y + 14 * s],
    [x + 7 * s, y - 2 * s],
    [x + 0.5 * s, y - 2 * s],
  ]);
}

/** A pizza slice pointing down (tip at the bottom). */
function slicePath(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x - 11 * s, y - 9 * s);
  ctx.quadraticCurveTo(x, y - 14 * s, x + 11 * s, y - 9 * s);
  ctx.lineTo(x, y + 12 * s);
  ctx.closePath();
}

// face geometry
const FX = HX;
const FY = HY - 8;
const FRX = 58;
const FRY = 54;
const EYE_Y = FY - 4;
const EYE_DX = 24;
const EMB_Y = HY + 58;

// ——— the head ———
function drawHeroHead(ctx: Ctx, a: HeroArt, id: string): void {
  const r = rng(hashStr(id));
  const shape = a.shape ?? 'round';
  const ex = new Set(a.extras ?? []);
  const mask = a.mask ?? 'open';
  // behind the head: glow, cape, tail, swords, collar, ears
  if (a.glow) {
    ctx.save();
    ctx.shadowColor = a.glow;
    ctx.shadowBlur = 26;
    headPath(ctx, shape);
    ctx.fillStyle = rgba(a.glow, 0.9);
    ctx.fill();
    ctx.restore();
  }
  if (ex.has('tail')) tail(ctx, a.earColor ?? a.suit);
  if (a.cape) cape(ctx, a.cape, a.capeTrim, !!a.fine, a.extras?.includes('highCollar'));
  if (ex.has('katanas')) katanas(ctx);
  if (a.ears) ears(ctx, a.ears, a.earColor ?? a.suit, false);

  // the head itself
  headPath(ctx, shape);
  ctx.fillStyle = lit(ctx, HX, HY, R, a.suit);
  ctx.fill();
  ctx.save();
  headPath(ctx, shape);
  ctx.clip();
  if (a.suit2) {
    // the lower half: the chest of the costume
    ctx.beginPath();
    ctx.moveTo(HX - R - 10, HY + 26);
    ctx.quadraticCurveTo(HX, HY + 40, HX + R + 10, HY + 26);
    ctx.lineTo(HX + R + 10, HY + R + 20);
    ctx.lineTo(HX - R - 10, HY + R + 20);
    ctx.closePath();
    ctx.fillStyle = lit(ctx, HX, HY + 60, R, a.suit2, 0.2);
    ctx.fill();
    ink(ctx, 3, rgba(INK, 0.7));
  }
  if (a.pattern) pattern(ctx, a.pattern, a.patternColor ?? shade(a.suit, -0.4), r);
  if (a.metal) {
    const mg = ctx.createLinearGradient(HX - R, HY - R, HX + R, HY + R);
    mg.addColorStop(0.38, 'rgba(255,255,255,0)');
    mg.addColorStop(0.5, 'rgba(255,255,255,0.4)');
    mg.addColorStop(0.62, 'rgba(255,255,255,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(HX - R - 10, HY - R - 10, R * 2 + 20, R * 2 + 30);
  }
  if (ex.has('torn')) torn(ctx, a.suit2 ?? '#6a3a9a');
  // the face
  face(ctx, a, mask, ex);
  if (a.hair && a.hairStyle) hair(ctx, a.hairStyle, a.hair, mask);
  // the chest: belts, collars, then the emblem
  if (ex.has('belt')) belt(ctx, '#ffd23f', false);
  if (ex.has('utilityBelt')) belt(ctx, '#e8b23a', true);
  if (ex.has('lawCollar')) lawCollar(ctx);
  if (ex.has('coatCollar')) coatCollar(ctx);
  if (ex.has('bowtie')) bowtie(ctx);
  if (ex.has('collarGem')) collarGem(ctx);
  if (ex.has('chain')) chain(ctx);
  if (ex.has('moss')) moss(ctx, r);
  if (ex.has('rivets')) rivets(ctx);
  if (ex.has('stretchBands')) stretchBands(ctx);
  if (a.emblem) emblem(ctx, a.emblem, a.emblemColor ?? '#ffffff', a.emblemBg ?? shade(a.suit, -0.25), !!a.fine);
  // a soft rim light down the right side, then the sheen
  const rim = ctx.createLinearGradient(HX + R * 0.4, 0, HX + R, 0);
  rim.addColorStop(0, 'rgba(255,255,255,0)');
  rim.addColorStop(1, `rgba(255,255,255,${a.fine ? 0.22 : 0.12})`);
  ctx.fillStyle = rim;
  ctx.fillRect(HX, HY - R - 10, R + 10, R * 2 + 30);
  ctx.restore();
  // ears that sit in front of the outline
  if (a.ears === 'flames' || a.ears === 'leaves') ears(ctx, a.ears, a.earColor ?? a.suit, true);
  headPath(ctx, shape);
  ink(ctx, 6);
  shine(ctx, HX - 32, HY - 44, 24, 11, a.metal ? 0.5 : 0.32);
  // on top: hats, tiaras, headphones
  if (ex.has('tiara')) tiara(ctx);
  if (ex.has('crownSpikes')) crownSpikes(ctx, a.suit);
  if (ex.has('headphones')) headphones(ctx);
  if (ex.has('goggles')) foreheadGoggles(ctx);
  if (ex.has('cap')) cap(ctx);
  if (ex.has('topHat')) topHat(ctx);
  if (ex.has('chefHat')) chefHat(ctx);
  if (ex.has('softServe')) softServe(ctx);
  if (ex.has('antennaeSmall')) antennae(ctx, '#1a1418', 0.7);
  if (ex.has('bracers')) bracers(ctx);
  if (a.fine) fineDetail(ctx, id, a);
  a.detail?.(ctx);
}

// ——— behind the head ———
function cape(ctx: Ctx, col: string, trim: string | undefined, fine: boolean, collar = false): void {
  const top = HY - 10;
  const bot = HY + 132;
  ctx.beginPath();
  ctx.moveTo(HX - 62, top);
  ctx.bezierCurveTo(HX - 96, HY + 40, HX - 108, HY + 110, HX - 106, bot);
  // a wavy hem
  const n = 5;
  for (let i = 1; i <= n; i++) {
    const x = HX - 106 + (212 * i) / n;
    ctx.quadraticCurveTo(x - 212 / n / 2, bot + (i % 2 ? 14 : -4), x, bot + (i % 2 ? 2 : 8));
  }
  ctx.bezierCurveTo(HX + 108, HY + 110, HX + 96, HY + 40, HX + 62, top);
  ctx.closePath();
  const g = ctx.createLinearGradient(HX - 106, 0, HX + 106, 0);
  g.addColorStop(0, shade(col, -0.35));
  g.addColorStop(0.3, shade(col, 0.15));
  g.addColorStop(0.55, col);
  g.addColorStop(1, shade(col, -0.4));
  fillInk(ctx, g, 5);
  // folds
  ctx.save();
  ctx.clip();
  for (const [x, w] of [[-70, 10], [-40, 7], [44, 7], [74, 10]] as const) {
    ctx.beginPath();
    ctx.moveTo(HX + x * 0.6, HY + 40);
    ctx.quadraticCurveTo(HX + x, HY + 110, HX + x * 1.15, bot + 6);
    ctx.strokeStyle = rgba(shade(col, -0.5), fine ? 0.5 : 0.35);
    ctx.lineWidth = w;
    ctx.stroke();
    if (fine) {
      ctx.beginPath();
      ctx.moveTo(HX + x * 0.6 + 6, HY + 44);
      ctx.quadraticCurveTo(HX + x + 6, HY + 110, HX + x * 1.15 + 6, bot);
      ctx.strokeStyle = rgba('#ffffff', 0.16);
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
  if (trim) {
    ctx.beginPath();
    ctx.moveTo(HX - 120, bot - 2);
    ctx.lineTo(HX + 120, bot - 2);
    ctx.strokeStyle = trim;
    ctx.lineWidth = 9;
    ctx.stroke();
  }
  ctx.restore();
  if (collar) {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(HX + s * 40, HY + 34);
      ctx.quadraticCurveTo(HX + s * 100, HY - 10, HX + s * 104, HY - 56);
      ctx.quadraticCurveTo(HX + s * 84, HY - 20, HX + s * 62, HY - 4);
      ctx.closePath();
      fillInk(ctx, vlin(ctx, HY - 56, HY + 34, shade(col, 0.25), shade(col, -0.25)), 4);
    }
  }
}

function tail(ctx: Ctx, col: string): void {
  ctx.beginPath();
  ctx.moveTo(HX + 40, HY + 120);
  ctx.bezierCurveTo(HX + 130, HY + 110, HX + 126, HY - 10, HX + 92, HY - 70);
  ctx.bezierCurveTo(HX + 80, HY - 92, HX + 50, HY - 90, HX + 60, HY - 66);
  ctx.bezierCurveTo(HX + 96, HY - 20, HX + 90, HY + 60, HX + 30, HY + 92);
  ctx.closePath();
  fillInk(ctx, lit(ctx, HX + 90, HY, 90, col, 0.3), 5);
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = rgba(shade(col, 0.5), 0.5);
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.moveTo(HX + 70 + i * 3, HY + 90 - i * 18);
    ctx.lineTo(HX + 96 + i * 2, HY + 76 - i * 18);
    ctx.stroke();
  }
  ctx.restore();
}

function katanas(ctx: Ctx): void {
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(HX + s * 30, HY + 40);
    ctx.rotate(s * -0.55);
    roundRect(ctx, -5, -150, 10, 70, 3);
    fillInk(ctx, '#1a1418', 3.5);
    for (let y = -146; y < -84; y += 10) {
      ctx.beginPath();
      ctx.moveTo(-5, y);
      ctx.lineTo(5, y + 6);
      ink(ctx, 2, '#c8102e');
    }
    roundRect(ctx, -12, -84, 24, 7, 3);
    fillInk(ctx, '#9aa3ad', 3);
    ctx.restore();
  }
}

function ears(ctx: Ctx, kind: EarKind, col: string, front: boolean): void {
  const fill = lit(ctx, HX, HY - 60, 80, col, 0.3);
  const both = (draw: (s: number) => void) => [-1, 1].forEach(draw);
  switch (kind) {
    case 'bat':
      both((s) => {
        poly(ctx, [[HX + s * 30, HY - 72], [HX + s * 56, HY - 98], [HX + s * 62, HY - 58]]);
        fillInk(ctx, fill, 5);
        poly(ctx, [[HX + s * 40, HY - 74], [HX + s * 54, HY - 88], [HX + s * 56, HY - 66]]);
        ctx.fillStyle = rgba('#ffffff', 0.12);
        ctx.fill();
      });
      break;
    case 'cat':
      both((s) => {
        poly(ctx, [[HX + s * 24, HY - 78], [HX + s * 56, HY - 96], [HX + s * 64, HY - 56]]);
        fillInk(ctx, fill, 5);
        poly(ctx, [[HX + s * 36, HY - 78], [HX + s * 53, HY - 87], [HX + s * 56, HY - 66]]);
        ctx.fillStyle = rgba('#c9a8ff', 0.5);
        ctx.fill();
      });
      break;
    case 'horns':
      both((s) => {
        ctx.beginPath();
        ctx.moveTo(HX + s * 34, HY - 76);
        ctx.quadraticCurveTo(HX + s * 54, HY - 96, HX + s * 46, HY - 104);
        ctx.quadraticCurveTo(HX + s * 66, HY - 92, HX + s * 54, HY - 66);
        ctx.closePath();
        fillInk(ctx, fill, 4);
      });
      break;
    case 'boltWings':
      both((s) => {
        poly(ctx, [[HX + s * 76, HY - 30], [HX + s * 104, HY - 52], [HX + s * 96, HY - 36], [HX + s * 108, HY - 38], [HX + s * 86, HY - 14]]);
        fillInk(ctx, lit(ctx, HX + s * 92, HY - 36, 24, col), 4);
      });
      break;
    case 'smallWings':
    case 'wings': {
      const big = kind === 'wings';
      both((s) => {
        for (let i = 0; i < (big ? 4 : 3); i++) {
          ctx.beginPath();
          const y = HY - 40 + i * (big ? 14 : 11);
          ctx.moveTo(HX + s * 74, y + 10);
          ctx.quadraticCurveTo(HX + s * (100 + (big ? 16 : 4) - i * 4), y - 6, HX + s * (108 + (big ? 6 : 0) - i * 6), y + (big ? -20 : -10));
          ctx.quadraticCurveTo(HX + s * (96 - i * 4), y + 12, HX + s * 76, y + 20);
          ctx.closePath();
          fillInk(ctx, lit(ctx, HX + s * 92, y, 24, col, 0.4), 3.5);
        }
      });
      break;
    }
    case 'fins':
      both((s) => {
        ctx.beginPath();
        ctx.moveTo(HX + s * 50, HY - 50);
        ctx.quadraticCurveTo(HX + s * 92, HY - 86, HX + s * 106, HY - 92);
        ctx.quadraticCurveTo(HX + s * 96, HY - 50, HX + s * 76, HY - 18);
        ctx.closePath();
        fillInk(ctx, fill, 4.5);
      });
      break;
    case 'fletching':
      for (const [dx, rot] of [[48, 0.5], [62, 0.75]] as const) {
        ctx.save();
        ctx.translate(HX + dx, HY - 62);
        ctx.rotate(rot);
        roundRect(ctx, -2.5, -10, 5, 40, 2);
        fillInk(ctx, '#8a5a32', 2.5);
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(-9, -32);
        ctx.lineTo(0, -26);
        ctx.lineTo(9, -32);
        ctx.closePath();
        fillInk(ctx, col, 3);
        ctx.restore();
      }
      break;
    case 'antennae':
      antennae(ctx, col, 1);
      break;
    case 'leaves':
      if (!front) break;
      for (const [dx, rot, sz] of [[-14, -0.6, 1], [10, 0.3, 1.2], [30, 0.9, 0.8]] as const) {
        ctx.save();
        ctx.translate(HX + dx, HY - R + 6);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-12 * sz, -16 * sz, 0, -34 * sz);
        ctx.quadraticCurveTo(12 * sz, -16 * sz, 0, 0);
        fillInk(ctx, lit(ctx, 0, -16, 18, col, 0.35), 3);
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.lineTo(0, -28 * sz);
        ink(ctx, 1.5, rgba(INK, 0.6));
        ctx.restore();
      }
      break;
    case 'roots':
      both((s) => {
        ctx.beginPath();
        ctx.moveTo(HX + s * 40, HY - 74);
        ctx.bezierCurveTo(HX + s * 70, HY - 104, HX + s * 100, HY - 80, HX + s * 104, HY - 40);
        ink(ctx, 11, INK);
        ink(ctx, 6, col);
      });
      break;
    case 'flames':
      flameCrown(ctx, col, front);
      break;
    case 'round':
      both((s) => {
        circle(ctx, HX + s * 58, HY - 64, 22);
        fillInk(ctx, fill, 4.5);
        circle(ctx, HX + s * 58, HY - 64, 11);
        ctx.fillStyle = shade(col, -0.45);
        ctx.fill();
      });
      break;
    case 'squirrel':
      both((s) => {
        poly(ctx, [[HX + s * 34, HY - 72], [HX + s * 58, HY - 94], [HX + s * 66, HY - 58]]);
        fillInk(ctx, fill, 4.5);
        ctx.beginPath();
        ctx.moveTo(HX + s * 58, HY - 94);
        ctx.lineTo(HX + s * 62, HY - 99);
        ctx.moveTo(HX + s * 58, HY - 94);
        ctx.lineTo(HX + s * 53, HY - 98);
        ink(ctx, 4, shade(col, -0.2));
      });
      break;
    case 'waspWings':
      both((s) => {
        ellipse(ctx, HX + s * 86, HY - 34, 26, 14, s * -0.7);
        ctx.fillStyle = rgba(col, 0.75);
        ctx.fill();
        ink(ctx, 3.5);
        ellipse(ctx, HX + s * 84, HY - 14, 20, 10, s * -0.3);
        ctx.fillStyle = rgba(col, 0.65);
        ctx.fill();
        ink(ctx, 3);
      });
      break;
  }
}

function antennae(ctx: Ctx, col: string, k: number): void {
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(HX + s * 22, HY - R + 8);
    ctx.quadraticCurveTo(HX + s * 34, HY - R - 18 * k, HX + s * 50, HY - R - 6 * k);
    ink(ctx, 7 * k, INK);
    ink(ctx, 3.5 * k, col);
    circle(ctx, HX + s * 50, HY - R - 6 * k, 7 * k);
    fillInk(ctx, lit(ctx, HX + s * 50, HY - R - 6, 7, '#ff5a3c'), 3);
  }
}

function flameCrown(ctx: Ctx, col: string, front: boolean): void {
  const pts = front ? [-56, -24, 6, 38, 62] : [-74, -42, -10, 22, 52, 78];
  for (const dx of pts) {
    const h = front ? 34 : 52;
    const x = HX + dx;
    const y = HY - Math.sqrt(Math.max(0, R * R - dx * dx)) + 12;
    ctx.beginPath();
    ctx.moveTo(x - 16, y + 6);
    ctx.quadraticCurveTo(x - 14, y - h * 0.5, x + 2, y - h);
    ctx.quadraticCurveTo(x + 4, y - h * 0.45, x + 16, y + 6);
    ctx.closePath();
    const g = vlin(ctx, y - h, y + 6, '#fff6c0', front ? '#ff9a2a' : col);
    fillInk(ctx, g, front ? 0 : 3.5);
  }
}

// ——— patterns (clipped to the head) ———
function pattern(ctx: Ctx, kind: PatternKind, pc: string, r: () => number): void {
  ctx.save();
  ctx.lineCap = 'round';
  switch (kind) {
    case 'web': {
      ctx.strokeStyle = rgba(pc, 0.7);
      ctx.lineWidth = 2.2;
      const cx = HX;
      const cy = HY - 6;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * 130, cy + Math.sin(a) * 130);
        ctx.stroke();
      }
      for (let ring = 1; ring <= 6; ring++) {
        ctx.beginPath();
        for (let i = 0; i <= 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const a0 = ((i - 0.5) / 12) * Math.PI * 2;
          const rr = ring * 17;
          const x = cx + Math.cos(a) * rr;
          const y = cy + Math.sin(a) * rr;
          if (!i) ctx.moveTo(x, y);
          else ctx.quadraticCurveTo(cx + Math.cos(a0) * rr * 0.86, cy + Math.sin(a0) * rr * 0.86, x, y);
        }
        ctx.stroke();
      }
      break;
    }
    case 'scales':
      ctx.strokeStyle = rgba(pc, 0.5);
      ctx.lineWidth = 2;
      for (let y = HY + 30; y < HY + R + 20; y += 12)
        for (let x = HX - R + ((y / 12) % 2) * 9; x < HX + R + 10; x += 18) {
          ctx.beginPath();
          ctx.arc(x, y, 9, 0, Math.PI);
          ctx.stroke();
        }
      break;
    case 'bark':
      ctx.strokeStyle = rgba(pc, 0.6);
      ctx.lineWidth = 3;
      for (let i = 0; i < 12; i++) {
        const x = HX - R + i * 16 + r() * 6;
        ctx.beginPath();
        ctx.moveTo(x, HY - R - 10);
        ctx.bezierCurveTo(x + 10, HY - 20, x - 10, HY + 20, x + 4, HY + R + 10);
        ctx.stroke();
      }
      // knot holes
      for (const [x, y, s] of [[HX - 48, HY + 40, 1], [HX + 56, HY - 30, 0.7]] as const) {
        ellipse(ctx, x, y, 9 * s, 6 * s);
        ctx.fillStyle = rgba(pc, 0.8);
        ctx.fill();
      }
      break;
    case 'plates':
      ctx.strokeStyle = rgba(pc, 0.8);
      ctx.lineWidth = 2.5;
      for (const y of [HY - 46, HY + 20, HY + 60]) {
        ctx.beginPath();
        ctx.moveTo(HX - R, y);
        ctx.quadraticCurveTo(HX, y + 14, HX + R, y);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(HX, HY - R);
      ctx.lineTo(HX, HY - 54);
      ctx.stroke();
      break;
    case 'chrome': {
      const g = ctx.createLinearGradient(HX - R, HY - R, HX + R, HY + R);
      g.addColorStop(0, rgba('#ffffff', 0.5));
      g.addColorStop(0.3, rgba('#7a8494', 0.25));
      g.addColorStop(0.55, rgba('#ffffff', 0.45));
      g.addColorStop(0.8, rgba('#4a5260', 0.3));
      g.addColorStop(1, rgba('#ffffff', 0.2));
      ctx.fillStyle = g;
      ctx.fillRect(HX - R - 10, HY - R - 10, R * 2 + 20, R * 2 + 30);
      break;
    }
    case 'fur':
      ctx.strokeStyle = rgba(pc, 0.5);
      ctx.lineWidth = 2;
      for (let i = 0; i < 70; i++) {
        const x = HX - R + r() * R * 2;
        const y = HY - R + r() * R * 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 3, y + 7);
        ctx.stroke();
      }
      break;
    case 'stripes':
      ctx.fillStyle = rgba(pc, 0.85);
      for (let y = HY + 18; y < HY + R + 20; y += 24) {
        ctx.beginPath();
        ctx.moveTo(HX - R - 10, y);
        ctx.quadraticCurveTo(HX, y + 10, HX + R + 10, y);
        ctx.lineTo(HX + R + 10, y + 11);
        ctx.quadraticCurveTo(HX, y + 21, HX - R - 10, y + 11);
        ctx.fill();
      }
      break;
    case 'frost':
      ctx.strokeStyle = rgba(pc, 0.6);
      ctx.lineWidth = 2;
      for (let i = 0; i < 14; i++) {
        const x = HX - R + r() * R * 2;
        const y = HY - R + r() * R * 2;
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI;
          ctx.beginPath();
          ctx.moveTo(x - Math.cos(a) * 6, y - Math.sin(a) * 6);
          ctx.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6);
          ctx.stroke();
        }
      }
      break;
    case 'flames': {
      const base = HY + R + 10;
      for (let layer = 0; layer < 2; layer++) {
        ctx.fillStyle = layer ? rgba('#fff6c0', 0.55) : rgba(pc, 0.6);
        ctx.beginPath();
        ctx.moveTo(HX - R - 10, base);
        for (let i = 0; i <= 7; i++) {
          const x = HX - R - 10 + (i / 7) * (R * 2 + 20);
          const tip = base - (layer ? 70 : 120) - r() * 40;
          ctx.quadraticCurveTo(x - 10, base - 40, x, tip);
          ctx.quadraticCurveTo(x + 6, base - 50, x + 13, base - 26);
        }
        ctx.lineTo(HX + R + 10, base);
        ctx.fill();
      }
      break;
    }
    case 'wraps':
      ctx.strokeStyle = rgba(pc, 0.8);
      ctx.lineWidth = 2.5;
      for (let y = HY - R; y < HY + R + 20; y += 13) {
        ctx.beginPath();
        ctx.moveTo(HX - R - 10, y + r() * 4);
        ctx.lineTo(HX + R + 10, y + 8 + r() * 4);
        ctx.stroke();
      }
      break;
    case 'fishnet':
      ctx.strokeStyle = rgba(pc, 0.6);
      ctx.lineWidth = 1.5;
      for (let d = -260; d < 260; d += 12) {
        ctx.beginPath();
        ctx.moveTo(HX + d, HY + 30);
        ctx.lineTo(HX + d + 100, HY + R + 30);
        ctx.moveTo(HX + d, HY + 30);
        ctx.lineTo(HX + d - 100, HY + R + 30);
        ctx.stroke();
      }
      break;
    case 'cracks':
      ctx.strokeStyle = rgba(pc, 0.8);
      ctx.lineWidth = 2.5;
      for (const [x, y] of [[HX - 70, HY - 30], [HX + 72, HY + 10], [HX - 40, HY + 70]] as const) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 10, y + 8);
        ctx.lineTo(x + 6, y + 18);
        ctx.lineTo(x + 16, y + 26);
        ctx.stroke();
      }
      break;
    case 'seams':
      ctx.strokeStyle = rgba(pc, 0.8);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(HX, HY - R);
      ctx.lineTo(HX, HY - 30);
      ctx.moveTo(HX - R, HY + 30);
      ctx.quadraticCurveTo(HX, HY + 44, HX + R, HY + 30);
      ctx.stroke();
      break;
    case 'halfMetal': {
      // the left half is plated metal with rivets
      ctx.beginPath();
      ctx.moveTo(HX + 4, HY - R - 10);
      ctx.lineTo(HX - 8, HY - 10);
      ctx.lineTo(HX + 6, HY + R + 20);
      ctx.lineTo(HX - R - 20, HY + R + 20);
      ctx.lineTo(HX - R - 20, HY - R - 10);
      ctx.closePath();
      const g = ctx.createLinearGradient(HX - R, 0, HX, 0);
      g.addColorStop(0, '#5a636e');
      g.addColorStop(0.5, '#d8dde4');
      g.addColorStop(1, '#7a8494');
      ctx.fillStyle = g;
      ctx.fill();
      ink(ctx, 3);
      ctx.fillStyle = '#4a525c';
      for (const [x, y] of [[HX - 60, HY - 40], [HX - 70, HY + 20], [HX - 40, HY + 70], [HX - 20, HY - 66]] as const) {
        circle(ctx, x, y, 3.5);
        ctx.fill();
      }
      break;
    }
    case 'vines':
      ctx.strokeStyle = rgba(pc, 0.85);
      ctx.lineWidth = 4;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(HX - R + i * 50, HY + R + 10);
        ctx.bezierCurveTo(HX - R + i * 50 + 30, HY + 20, HX - R + i * 50 - 20, HY - 40, HX - R + i * 50 + 20, HY - R);
        ctx.stroke();
      }
      break;
    case 'embers':
      for (let i = 0; i < 18; i++) {
        ctx.beginPath();
        const x = HX - R + r() * R * 2;
        const y = HY - R + r() * R * 2;
        ctx.moveTo(x, y);
        ctx.lineTo(x + 8 - r() * 16, y + 10);
        ctx.lineTo(x + 6 - r() * 12, y + 20);
        ctx.strokeStyle = rgba(pc, 0.7);
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      break;
    case 'bolts':
      ctx.fillStyle = rgba(pc, 0.7);
      for (let i = 0; i < 6; i++) {
        boltPath(ctx, HX - R + 20 + r() * (R * 2 - 40), HY + 30 + r() * 50, 0.8);
        ctx.fill();
      }
      break;
  }
  ctx.restore();
}

function torn(ctx: Ctx, col: string): void {
  ctx.beginPath();
  ctx.moveTo(HX - R - 10, HY + 44);
  for (let i = 0; i <= 10; i++) ctx.lineTo(HX - R - 10 + i * 19, HY + 44 + (i % 2 ? 14 : 0));
  ctx.lineTo(HX + R + 10, HY + R + 20);
  ctx.lineTo(HX - R - 10, HY + R + 20);
  ctx.closePath();
  fillInk(ctx, lit(ctx, HX, HY + 80, 60, col, 0.2), 3.5);
}

// ——— the face ———
function faceEllipse(ctx: Ctx): void {
  ellipse(ctx, FX, FY, FRX, FRY);
}

function face(ctx: Ctx, a: HeroArt, mask: MaskKind, ex: Set<ExtraKind>): void {
  const skin = a.skin ?? '#efc0a0';
  const mc = a.maskColor ?? shade(a.suit, -0.2);
  const eyeC = a.eyeColor ?? '#ffffff';
  if (mask === 'open' || mask === 'domino' || mask === 'hood' || mask === 'raccoon' || mask === 'goggles' || mask === 'visorBand') {
    if (mask === 'hood') {
      // the hood frames the face and comes to a point
      ctx.beginPath();
      ctx.moveTo(HX, HY - R - 6);
      ctx.bezierCurveTo(HX + 80, HY - 60, HX + 84, HY + 40, HX + 56, HY + 60);
      ctx.lineTo(HX - 56, HY + 60);
      ctx.bezierCurveTo(HX - 84, HY + 40, HX - 80, HY - 60, HX, HY - R - 6);
      ctx.closePath();
      fillInk(ctx, lit(ctx, HX, HY - 20, 80, mc, 0.3), 4);
      ellipse(ctx, FX, FY + 10, FRX - 14, FRY - 10);
      fillInk(ctx, lit(ctx, FX, FY + 10, FRX, skin, 0.25), 3.5);
      // shadow under the hood
      ctx.save();
      ellipse(ctx, FX, FY + 10, FRX - 14, FRY - 10);
      ctx.clip();
      ctx.fillStyle = rgba('#000000', a.skin ? 0.25 : 0.55);
      ctx.fillRect(HX - 60, FY - 60, 120, 40);
      ctx.restore();
    } else if (a.skin) {
      faceEllipse(ctx);
      fillInk(ctx, lit(ctx, FX, FY, FRX, skin, 0.3), 3.5);
      // cheeks
      for (const s of [-1, 1]) {
        ellipse(ctx, FX + s * 36, FY + 18, 10, 6);
        ctx.fillStyle = rgba('#ff7a6a', 0.22);
        ctx.fill();
      }
    }
    if (mask === 'domino') dominoMask(ctx, mc);
    if (mask === 'raccoon') {
      ellipse(ctx, FX, EYE_Y + 2, 54, 18);
      fillInk(ctx, lit(ctx, FX, EYE_Y, 50, mc, 0.2), 3.5);
    }
    if (mask === 'goggles') goggleStrap(ctx, mc);
    if (mask === 'visorBand') {
      roundRect(ctx, HX - 72, EYE_Y - 15, 144, 28, 13);
      fillInk(ctx, vlin(ctx, EYE_Y - 15, EYE_Y + 13, shade(mc, 0.3), shade(mc, -0.2)), 4);
    }
  } else if (mask === 'cowl' || mask === 'full' || mask === 'helmet') {
    if (ex.has('chin') || mask === 'cowl' || mask === 'helmet') {
      // the jaw shows below the mask
      faceEllipse(ctx);
      fillInk(ctx, lit(ctx, FX, FY, FRX, skin, 0.3), 3.5);
      ctx.save();
      faceEllipse(ctx);
      ctx.clip();
      ctx.beginPath();
      ctx.moveTo(FX - FRX - 4, FY + 18);
      ctx.quadraticCurveTo(FX - 30, FY + 6, FX, FY + 14);
      ctx.quadraticCurveTo(FX + 30, FY + 6, FX + FRX + 4, FY + 18);
      ctx.lineTo(FX + FRX + 4, FY - FRY - 4);
      ctx.lineTo(FX - FRX - 4, FY - FRY - 4);
      ctx.closePath();
      ctx.fillStyle = lit(ctx, FX, FY - 20, FRX, mc, 0.3);
      ctx.fill();
      ink(ctx, 3.5);
      ctx.restore();
      faceEllipse(ctx);
      ink(ctx, 3.5);
      if (mask === 'helmet') {
        ctx.beginPath();
        ctx.moveTo(FX - FRX + 6, FY + 16);
        ctx.quadraticCurveTo(FX - FRX - 6, FY - 40, FX, FY - FRY - 2);
        ink(ctx, 2.5, rgba('#ffffff', 0.35));
      }
    } else {
      faceEllipse(ctx);
      fillInk(ctx, lit(ctx, FX, FY, FRX, mc, 0.3), 3.5);
      // a light trim, so a mask the colour of the suit still reads
      ellipse(ctx, FX, FY, FRX - 4, FRY - 4);
      ink(ctx, 2, rgba('#ffffff', 0.32));
    }
  } else if (mask === 'faceplate') {
    ctx.beginPath();
    ctx.moveTo(FX - 48, FY - 44);
    ctx.quadraticCurveTo(FX, FY - 60, FX + 48, FY - 44);
    ctx.lineTo(FX + 52, FY + 16);
    ctx.lineTo(FX + 30, FY + 50);
    ctx.lineTo(FX - 30, FY + 50);
    ctx.lineTo(FX - 52, FY + 16);
    ctx.closePath();
    fillInk(ctx, lit(ctx, FX, FY, 60, mc, 0.4), 4);
    // the plate's seams and mouth slit
    ctx.beginPath();
    ctx.moveTo(FX - 22, FY + 30);
    ctx.lineTo(FX + 22, FY + 30);
    ink(ctx, 3.5);
    ctx.beginPath();
    ctx.moveTo(FX - 48, FY + 6);
    ctx.lineTo(FX - 30, FY + 50);
    ctx.moveTo(FX + 48, FY + 6);
    ctx.lineTo(FX + 30, FY + 50);
    ink(ctx, 2, rgba(INK, 0.6));
  } else if (mask === 'visorBug') {
    faceEllipse(ctx);
    fillInk(ctx, lit(ctx, FX, FY, FRX, mc, 0.35), 3.5);
    ctx.beginPath();
    ctx.moveTo(FX - 10, FY + 20);
    ctx.lineTo(FX + 10, FY + 20);
    for (let i = -2; i <= 2; i++) {
      ctx.moveTo(FX + i * 6, FY + 24);
      ctx.lineTo(FX + i * 6, FY + 36);
    }
    ink(ctx, 2.5, rgba(INK, 0.8));
  } else if (mask === 'beakHelm') {
    faceEllipse(ctx);
    fillInk(ctx, lit(ctx, FX, FY, FRX, a.skin ?? '#e0a880', 0.3), 3.5);
    ctx.save();
    faceEllipse(ctx);
    ctx.clip();
    ctx.fillStyle = lit(ctx, FX, FY - 30, FRX, mc, 0.45);
    ctx.fillRect(FX - FRX, FY - FRY, FRX * 2, FRY * 0.8);
    ctx.restore();
    faceEllipse(ctx);
    ink(ctx, 3.5);
    // the beak over the brow
    ctx.beginPath();
    ctx.moveTo(FX - 16, FY - 18);
    ctx.quadraticCurveTo(FX, FY - 30, FX + 16, FY - 18);
    ctx.quadraticCurveTo(FX + 6, FY + 4, FX, FY + 16);
    ctx.quadraticCurveTo(FX - 6, FY + 4, FX - 16, FY - 18);
    fillInk(ctx, lit(ctx, FX, FY - 10, 20, '#f2c230', 0.4), 3.5);
  }
  if (ex.has('brow')) {
    ctx.beginPath();
    ctx.moveTo(FX - 54, EYE_Y - 12);
    ctx.quadraticCurveTo(FX, EYE_Y - 34, FX + 54, EYE_Y - 12);
    ctx.quadraticCurveTo(FX, EYE_Y - 20, FX - 54, EYE_Y - 12);
    fillInk(ctx, shade(a.suit, -0.25), 3);
  }
  eyes(ctx, a.eyes ?? 'friendly', eyeC, a);
  // mouths and jaw extras
  if (ex.has('grimace')) grimace(ctx);
  if (ex.has('smile')) smile(ctx, FY + 26);
  if (ex.has('buckTeeth')) buckTeeth(ctx);
  if (ex.has('goatee')) goatee(ctx, a.hair ?? '#3a2a1a');
  if (ex.has('snout')) snout(ctx, '#f2a8a0');
  if (ex.has('snoutNose')) {
    ellipse(ctx, FX, FY + 18, 9, 6);
    fillInk(ctx, '#1a1418', 3);
  }
  if (ex.has('whiskers')) {
    for (const s of [-1, 1])
      for (const dy of [-4, 4]) {
        ctx.beginPath();
        ctx.moveTo(FX + s * 16, FY + 22 + dy);
        ctx.lineTo(FX + s * 40, FY + 18 + dy * 2);
        ink(ctx, 2, rgba('#ffffff', 0.7));
      }
  }
  if (mask === 'open' || mask === 'domino' || mask === 'cowl' || mask === 'helmet' || ex.has('chin')) {
    if (!ex.has('grimace') && !ex.has('smile') && !ex.has('buckTeeth') && mask !== 'hood') smile(ctx, FY + 30, 0.6);
  }
}

function dominoMask(ctx: Ctx, col: string): void {
  ctx.beginPath();
  ctx.moveTo(FX - 56, EYE_Y - 2);
  ctx.quadraticCurveTo(FX - 40, EYE_Y - 20, FX - 8, EYE_Y - 10);
  ctx.quadraticCurveTo(FX, EYE_Y - 4, FX + 8, EYE_Y - 10);
  ctx.quadraticCurveTo(FX + 40, EYE_Y - 20, FX + 56, EYE_Y - 2);
  ctx.quadraticCurveTo(FX + 44, EYE_Y + 18, FX + 12, EYE_Y + 10);
  ctx.quadraticCurveTo(FX, EYE_Y + 4, FX - 12, EYE_Y + 10);
  ctx.quadraticCurveTo(FX - 44, EYE_Y + 18, FX - 56, EYE_Y - 2);
  fillInk(ctx, lit(ctx, FX, EYE_Y, 50, col, 0.3), 3.5);
}

function goggleStrap(ctx: Ctx, col: string): void {
  roundRect(ctx, HX - R - 4, EYE_Y - 7, R * 2 + 8, 14, 6);
  fillInk(ctx, shade(col, -0.3), 3);
  for (const s of [-1, 1]) {
    circle(ctx, FX + s * EYE_DX, EYE_Y, 19);
    fillInk(ctx, lit(ctx, FX + s * EYE_DX, EYE_Y, 19, col, 0.4), 4);
  }
}

function eyes(ctx: Ctx, kind: EyeKind, col: string, a: HeroArt): void {
  const both = (fn: (s: number, x: number) => void) => [-1, 1].forEach((s) => fn(s, FX + s * EYE_DX));
  const glowFill = (x: number, y: number, rx: number, ry: number, c: string, rot = 0) => {
    ctx.save();
    ctx.shadowColor = c;
    ctx.shadowBlur = 12;
    ellipse(ctx, x, y, rx, ry, rot);
    ctx.fillStyle = shade(c, 0.4);
    ctx.fill();
    ctx.restore();
    ellipse(ctx, x, y, rx, ry, rot);
    ink(ctx, 2.5);
  };
  const pupil = (x: number, y: number, r = 5.5) => {
    circle(ctx, x, y, r);
    ctx.fillStyle = INK;
    ctx.fill();
    circle(ctx, x - r * 0.35, y - r * 0.4, r * 0.38);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  };
  const brow = (s: number, x: number, tilt: number, y = EYE_Y - 15, c = a.hair ?? INK) => {
    ctx.beginPath();
    ctx.moveTo(x - 12, y - tilt * s * -1);
    ctx.lineTo(x + 12, y + tilt * s * -1);
    ink(ctx, 4.5, c);
  };
  switch (kind) {
    case 'friendly':
    case 'stern':
    case 'angry':
    case 'sly':
    case 'squint':
    case 'lashes':
      both((s, x) => {
        const ry = kind === 'squint' ? 5 : kind === 'sly' ? 6.5 : 9;
        ellipse(ctx, x, EYE_Y, 10, ry);
        fillInk(ctx, '#ffffff', 2.5);
        pupil(x + s * -1, EYE_Y + (kind === 'sly' ? 1 : 1), kind === 'squint' || kind === 'sly' ? 4 : 5.5);
        if (kind === 'sly') {
          ctx.beginPath();
          ctx.moveTo(x - 11, EYE_Y - 3);
          ctx.lineTo(x + 11, EYE_Y - 3);
          ink(ctx, 3.5);
        }
        if (kind === 'lashes')
          for (const k of [-1, 0, 1]) {
            ctx.beginPath();
            ctx.moveTo(x + s * 6 + k * 5, EYE_Y - 8);
            ctx.lineTo(x + s * 8 + k * 6, EYE_Y - 14);
            ink(ctx, 2.2);
          }
        if (kind === 'angry') brow(s, x, 6, EYE_Y - 14, INK);
        else if (kind === 'stern') brow(s, x, 3);
        else if (kind === 'friendly') brow(s, x, -2, EYE_Y - 16);
      });
      break;
    case 'white':
      both((s, x) => {
        ctx.beginPath();
        ctx.moveTo(x - s * 13, EYE_Y - 2);
        ctx.quadraticCurveTo(x, EYE_Y - 10, x + s * 13, EYE_Y - 6);
        ctx.quadraticCurveTo(x + s * 4, EYE_Y + 10, x - s * 13, EYE_Y - 2);
        fillInk(ctx, '#ffffff', 3);
      });
      break;
    case 'slits':
      both((s, x) => {
        ctx.beginPath();
        ctx.moveTo(x - s * 14, EYE_Y - 1);
        ctx.lineTo(x + s * 13, EYE_Y - 7);
        ctx.quadraticCurveTo(x + s * 6, EYE_Y + 6, x - s * 14, EYE_Y - 1);
        fillInk(ctx, '#f4f8ff', 3);
      });
      break;
    case 'bigWhite':
      both((s, x) => {
        ctx.beginPath();
        ctx.moveTo(x - s * 4, EYE_Y + 14);
        ctx.quadraticCurveTo(x - s * 18, EYE_Y + 2, x - s * 6, EYE_Y - 14);
        ctx.quadraticCurveTo(x + s * 14, EYE_Y - 10, x + s * 16, EYE_Y - 18);
        ctx.quadraticCurveTo(x + s * 16, EYE_Y + 8, x - s * 4, EYE_Y + 14);
        ctx.fillStyle = '#f4f8ff';
        ctx.fill();
        ink(ctx, 5.5);
      });
      break;
    case 'glowSlits':
      both((s, x) => glowFill(x, EYE_Y, 13, 4.5, col, s * -0.12));
      break;
    case 'glow':
    case 'ember':
      both((s, x) => glowFill(x, EYE_Y, 10, kind === 'ember' ? 6 : 8, col, s * -0.2));
      break;
    case 'visor': {
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = 14;
      roundRect(ctx, HX - 60, EYE_Y - 6, 120, 12, 6);
      ctx.fillStyle = shade(col, 0.35);
      ctx.fill();
      ctx.restore();
      roundRect(ctx, HX - 60, EYE_Y - 6, 120, 12, 6);
      ink(ctx, 2.5);
      ctx.fillStyle = rgba('#ffffff', 0.7);
      ctx.fillRect(HX - 50, EYE_Y - 3, 40, 2.5);
      break;
    }
    case 'lenses':
      both((_s, x) => {
        circle(ctx, x, EYE_Y, 16);
        fillInk(ctx, '#3a3d4c', 4);
        glowFill(x, EYE_Y, 11, 11, col);
        shine(ctx, x - 4, EYE_Y - 5, 5, 3, 0.6);
      });
      break;
    case 'patches':
      both((s, x) => {
        ctx.beginPath();
        ctx.moveTo(x - s * 16, EYE_Y - 14);
        ctx.quadraticCurveTo(x + s * 22, EYE_Y - 22, x + s * 20, EYE_Y + 2);
        ctx.quadraticCurveTo(x + s * 12, EYE_Y + 18, x - s * 16, EYE_Y + 10);
        ctx.closePath();
        fillInk(ctx, '#1a1418', 3);
        ellipse(ctx, x + s * 3, EYE_Y - 1, 6, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });
      break;
    case 'martian':
      both((s, x) => {
        ctx.beginPath();
        ctx.moveTo(x - s * 14, EYE_Y - 6);
        ctx.lineTo(x + s * 12, EYE_Y - 2);
        ctx.lineTo(x - s * 6, EYE_Y + 7);
        ctx.closePath();
        ctx.save();
        ctx.shadowColor = col;
        ctx.shadowBlur = 10;
        ctx.fillStyle = col;
        ctx.fill();
        ctx.restore();
        ink(ctx, 2.5);
      });
      break;
    case 'cyber': {
      // one red mechanical eye on the metal side, one ordinary eye
      circle(ctx, FX - EYE_DX, EYE_Y, 13);
      fillInk(ctx, '#3a3d4c', 3.5);
      glowFill(FX - EYE_DX, EYE_Y, 7, 7, col);
      ellipse(ctx, FX + EYE_DX, EYE_Y, 9, 8);
      fillInk(ctx, '#ffffff', 2.5);
      pupil(FX + EYE_DX - 1, EYE_Y + 1, 5);
      break;
    }
    case 'redOnBlack':
      both((s, x) => {
        ellipse(ctx, x, EYE_Y, 10, 8);
        fillInk(ctx, '#1a1418', 2.5);
        glowFill(x + s * -1, EYE_Y + 1, 4, 4, '#ff2a2a');
        brow(s, x, 3, EYE_Y - 14, INK);
      });
      break;
    case 'bugVisor':
      both((s, x) => {
        ellipse(ctx, x + s * 2, EYE_Y, 20, 15, s * 0.3);
        ctx.fillStyle = '#2a1418';
        ctx.fill();
        ink(ctx, 4);
        glowFill(x + s * 2, EYE_Y, 15, 10, col, s * 0.3);
      });
      break;
    case 'bugGlossy':
      both((s, x) => {
        ellipse(ctx, x + s * 2, EYE_Y, 20, 14, s * 0.35);
        const g = ctx.createRadialGradient(x - 6, EYE_Y - 6, 2, x, EYE_Y, 20);
        g.addColorStop(0, shade(col, 0.6));
        g.addColorStop(0.5, col);
        g.addColorStop(1, shade(col, -0.6));
        fillInk(ctx, g, 4);
        shine(ctx, x - 4, EYE_Y - 5, 6, 3, 0.75);
      });
      break;
    case 'goggleDark':
      both((_s, x) => {
        circle(ctx, x, EYE_Y, 13);
        fillInk(ctx, lit(ctx, x, EYE_Y, 13, '#2a2d3a', 0.4), 3);
        shine(ctx, x - 4, EYE_Y - 4, 5, 2.6, 0.7);
      });
      break;
    case 'starVisor':
      both((_s, x) => {
        starPath(ctx, x, EYE_Y, 15, 5, 0.5);
        fillInk(ctx, lit(ctx, x, EYE_Y, 15, col, 0.5), 3);
        shine(ctx, x - 4, EYE_Y - 4, 4, 2.4, 0.7);
      });
      break;
    case 'happy':
      both((_s, x) => {
        ctx.beginPath();
        ctx.arc(x, EYE_Y + 4, 8, Math.PI * 1.1, Math.PI * 1.9);
        ink(ctx, 4.5);
      });
      break;
    case 'none':
      break;
  }
}

function smile(ctx: Ctx, y: number, k = 1): void {
  ctx.beginPath();
  ctx.moveTo(FX - 14 * k - 4, y - 2);
  ctx.quadraticCurveTo(FX, y + 10 * k, FX + 14 * k + 4, y - 2);
  ink(ctx, 3.5);
}

function grimace(ctx: Ctx): void {
  roundRect(ctx, FX - 26, FY + 18, 52, 20, 8);
  fillInk(ctx, '#ffffff', 3.5);
  ctx.beginPath();
  for (let x = -16; x <= 16; x += 10.6) {
    ctx.moveTo(FX + x, FY + 18);
    ctx.lineTo(FX + x, FY + 38);
  }
  ctx.moveTo(FX - 26, FY + 28);
  ctx.lineTo(FX + 26, FY + 28);
  ink(ctx, 2);
}

function buckTeeth(ctx: Ctx): void {
  smile(ctx, FY + 22, 0.8);
  for (const s of [-1, 1]) {
    roundRect(ctx, FX + (s < 0 ? -9 : 0), FY + 24, 9, 12, 2);
    fillInk(ctx, '#ffffff', 2.5);
  }
  ellipse(ctx, FX, FY + 14, 6, 4);
  fillInk(ctx, '#3a1a14', 2);
}

function goatee(ctx: Ctx, col: string): void {
  ctx.beginPath();
  ctx.moveTo(FX - 16, FY + 34);
  ctx.quadraticCurveTo(FX, FY + 30, FX + 16, FY + 34);
  ctx.quadraticCurveTo(FX + 8, FY + 54, FX, FY + 56);
  ctx.quadraticCurveTo(FX - 8, FY + 54, FX - 16, FY + 34);
  fillInk(ctx, col, 3);
}

function snout(ctx: Ctx, col: string): void {
  ellipse(ctx, FX + 6, FY + 22, 20, 14);
  fillInk(ctx, lit(ctx, FX + 6, FY + 22, 20, col, 0.3), 3.5);
  for (const s of [-1, 1]) {
    ellipse(ctx, FX + 6 + s * 7, FY + 22, 3.5, 5);
    ctx.fillStyle = shade(col, -0.5);
    ctx.fill();
  }
}

// ——— hair ———
function hair(ctx: Ctx, kind: HairKind, col: string, mask: MaskKind): void {
  const fill = lit(ctx, FX, FY - 50, 70, col, 0.35);
  const top = FY - FRY;
  ctx.lineJoin = 'round';
  switch (kind) {
    case 'quiff':
      ctx.beginPath();
      ctx.moveTo(FX - FRX + 6, FY - 16);
      ctx.bezierCurveTo(FX - FRX, top - 14, FX + 10, top - 22, FX + FRX - 4, FY - 22);
      ctx.bezierCurveTo(FX + 30, top + 2, FX - 10, top + 6, FX - 30, FY - 26);
      ctx.quadraticCurveTo(FX - 44, FY - 22, FX - FRX + 6, FY - 16);
      fillInk(ctx, fill, 3.5);
      // the little forelock curl
      ctx.beginPath();
      ctx.moveTo(FX - 6, top + 10);
      ctx.bezierCurveTo(FX - 18, top + 20, FX - 4, top + 30, FX + 4, top + 22);
      ink(ctx, 3.5, col);
      break;
    case 'long':
    case 'mane':
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(FX + s * 20, top - 2);
        ctx.bezierCurveTo(FX + s * (FRX + 22), top + 4, FX + s * (FRX + 18), FY + 40, FX + s * (FRX + (kind === 'mane' ? 22 : 6)), FY + 70);
        ctx.lineTo(FX + s * (FRX - 10), FY + 50);
        ctx.bezierCurveTo(FX + s * (FRX - 4), FY + 10, FX + s * 40, top + 18, FX, top + 14);
        ctx.closePath();
        fillInk(ctx, fill, 3.5);
      }
      ctx.beginPath();
      ctx.moveTo(FX - 44, top + 22);
      ctx.quadraticCurveTo(FX, top - 12, FX + 44, top + 22);
      ctx.quadraticCurveTo(FX, top + 10, FX - 44, top + 22);
      fillInk(ctx, fill, 3.5);
      break;
    case 'bob':
      ctx.beginPath();
      ctx.moveTo(FX - FRX - 8, FY + 30);
      ctx.bezierCurveTo(FX - FRX - 16, top - 10, FX + FRX + 16, top - 10, FX + FRX + 8, FY + 30);
      ctx.quadraticCurveTo(FX + FRX - 10, FY + 20, FX + FRX - 12, FY - 6);
      ctx.quadraticCurveTo(FX + 10, top + 8, FX - 20, top + 24);
      ctx.quadraticCurveTo(FX - FRX + 6, FY - 4, FX - FRX + 8, FY + 20);
      ctx.closePath();
      fillInk(ctx, fill, 3.5);
      break;
    case 'short':
    case 'swept':
    case 'temples':
      ctx.beginPath();
      ctx.moveTo(FX - FRX + 4, FY - 14);
      ctx.bezierCurveTo(FX - FRX - 2, top - 10, FX + FRX + 2, top - 10, FX + FRX - 4, FY - 14);
      ctx.quadraticCurveTo(FX + 30, top + 14, kind === 'swept' ? FX - 10 : FX + 6, top + 8);
      ctx.quadraticCurveTo(FX - 30, top + 16, FX - FRX + 4, FY - 14);
      fillInk(ctx, fill, 3.5);
      if (kind === 'temples')
        for (const s of [-1, 1]) {
          ellipse(ctx, FX + s * (FRX - 8), FY - 20, 6, 12);
          ctx.fillStyle = '#d8dde4';
          ctx.fill();
        }
      break;
    case 'messy':
      ctx.beginPath();
      ctx.moveTo(FX - FRX + 2, FY - 12);
      for (let i = 0; i <= 8; i++) {
        const x = FX - FRX + 2 + i * ((FRX * 2 - 4) / 8);
        ctx.lineTo(x - 4, top - 8 - (i % 2 ? 12 : 0));
        ctx.lineTo(x + 4, top + 10);
      }
      ctx.lineTo(FX + FRX - 2, FY - 12);
      ctx.quadraticCurveTo(FX, top + 18, FX - FRX + 2, FY - 12);
      fillInk(ctx, fill, 3.5);
      break;
    case 'sideburns':
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(FX + s * (FRX - 2), FY - 2);
        ctx.lineTo(FX + s * (FRX + 6), FY + 18);
        ctx.lineTo(FX + s * (FRX - 10), FY + 30);
        ctx.lineTo(FX + s * (FRX - 14), FY + 10);
        ctx.closePath();
        fillInk(ctx, fill, 3);
      }
      break;
    case 'mohawk':
      ctx.beginPath();
      ctx.moveTo(FX - 16, top + 10);
      for (let i = 0; i <= 4; i++) ctx.lineTo(FX - 16 + i * 8, top - 16 - (i % 2 ? 6 : 0));
      ctx.lineTo(FX + 18, top + 10);
      ctx.closePath();
      fillInk(ctx, fill, 3.5);
      break;
  }
  void mask;
}

// ——— chest, collars, belts ———
function belt(ctx: Ctx, col: string, pouches: boolean): void {
  const y = HY + 74;
  ctx.beginPath();
  ctx.moveTo(HX - R - 10, y);
  ctx.quadraticCurveTo(HX, y + 10, HX + R + 10, y);
  ctx.lineTo(HX + R + 10, y + 13);
  ctx.quadraticCurveTo(HX, y + 23, HX - R - 10, y + 13);
  ctx.closePath();
  fillInk(ctx, vlin(ctx, y, y + 20, shade(col, 0.35), shade(col, -0.25)), 3.5);
  if (pouches)
    for (const x of [-56, -30, 30, 56]) {
      roundRect(ctx, HX + x - 8, y + 1, 16, 15, 4);
      fillInk(ctx, vlin(ctx, y, y + 16, shade(col, 0.2), shade(col, -0.35)), 2.5);
    }
  roundRect(ctx, HX - 11, y + 1, 22, 16, 4);
  fillInk(ctx, vlin(ctx, y, y + 17, '#fff6c0', shade(col, -0.2)), 3);
}

function lawCollar(ctx: Ctx): void {
  for (const s of [-1, 1]) {
    poly(ctx, [[HX + s * 2, HY + 44], [HX + s * 44, HY + 30], [HX + s * 30, HY + 66]]);
    fillInk(ctx, '#f4f1ea', 3);
  }
  poly(ctx, [[HX - 7, HY + 46], [HX + 7, HY + 46], [HX + 4, HY + 78], [HX - 4, HY + 78]]);
  fillInk(ctx, '#6a3a9a', 2.5);
}

function coatCollar(ctx: Ctx): void {
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(HX + s * 14, HY + 40);
    ctx.lineTo(HX + s * 80, HY + 10);
    ctx.lineTo(HX + s * 86, HY + 70);
    ctx.lineTo(HX + s * 34, HY + 90);
    ctx.closePath();
    fillInk(ctx, lit(ctx, HX + s * 50, HY + 50, 50, '#8a5a32', 0.25), 3.5);
  }
}

function bowtie(ctx: Ctx): void {
  const y = HY + 40;
  for (const s of [-1, 1]) {
    poly(ctx, [[HX, y], [HX + s * 18, y - 10], [HX + s * 18, y + 10]]);
    fillInk(ctx, '#c8102e', 3);
  }
  circle(ctx, HX, y, 4.5);
  fillInk(ctx, '#c8102e', 2.5);
}

function collarGem(ctx: Ctx): void {
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(HX + s * 10, HY + 34);
    ctx.lineTo(HX + s * 70, HY + 24);
    ink(ctx, 7, INK);
    ink(ctx, 3.5, '#1f3a8a');
  }
}

function chain(ctx: Ctx): void {
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const x = HX - 70 + t * 140;
    const y = HY + 70 + Math.sin(t * Math.PI) * 18;
    ellipse(ctx, x, y, 9, 5.5, i % 2 ? 0.6 : -0.6);
    ink(ctx, 6, INK);
    ink(ctx, 3, i % 2 ? '#c9cfd8' : '#9aa3ad');
  }
}

function moss(ctx: Ctx, r: () => number): void {
  for (let i = 0; i < 10; i++) {
    const x = HX - R + 10 + r() * (R * 2 - 20);
    const y = HY - R + 20 + r() * 40;
    ellipse(ctx, x, y, 8 + r() * 6, 5 + r() * 3);
    ctx.fillStyle = rgba('#8ad04a', 0.65);
    ctx.fill();
  }
}

function rivets(ctx: Ctx): void {
  for (const [x, y] of [[-70, -10], [70, -10], [-56, 60], [56, 60], [-40, -64], [40, -64]] as const) {
    circle(ctx, HX + x, HY + y, 4);
    fillInk(ctx, lit(ctx, HX + x, HY + y, 4, '#e8b23a', 0.6), 2);
  }
}

function stretchBands(ctx: Ctx): void {
  ctx.strokeStyle = rgba('#ffffff', 0.3);
  ctx.lineWidth = 3;
  for (const dy of [-60, 60]) {
    ctx.beginPath();
    ctx.moveTo(HX - R, HY + dy);
    ctx.bezierCurveTo(HX - 30, HY + dy - 12, HX + 30, HY + dy + 12, HX + R, HY + dy);
    ctx.stroke();
  }
}

// ——— on top of the head ———
function tiara(ctx: Ctx): void {
  const y = FY - FRY + 14;
  ctx.beginPath();
  ctx.moveTo(FX - 48, y + 10);
  ctx.quadraticCurveTo(FX, y - 8, FX + 48, y + 10);
  ctx.lineTo(FX + 44, y + 18);
  ctx.quadraticCurveTo(FX, y + 2, FX - 44, y + 18);
  ctx.closePath();
  fillInk(ctx, vlin(ctx, y - 8, y + 18, '#fff6b0', '#d89a10'), 3.5);
  poly(ctx, [[FX, y - 14], [FX + 10, y + 2], [FX, y + 10], [FX - 10, y + 2]]);
  fillInk(ctx, lit(ctx, FX, y, 10, '#3ad8c8', 0.5), 3);
}

function crownSpikes(ctx: Ctx, col: string): void {
  const y = FY - FRY + 4;
  ctx.beginPath();
  ctx.moveTo(FX - 44, y + 16);
  for (const [dx, h] of [[-30, 22], [-12, 30], [0, 44], [12, 30], [30, 22]] as const) {
    ctx.lineTo(FX + dx - 6, y + 6);
    ctx.lineTo(FX + dx, y - h);
    ctx.lineTo(FX + dx + 6, y + 6);
  }
  ctx.lineTo(FX + 44, y + 16);
  ctx.quadraticCurveTo(FX, y + 4, FX - 44, y + 16);
  fillInk(ctx, lit(ctx, FX, y - 10, 40, shade(col, 0.1), 0.45), 3.5);
}

function headphones(ctx: Ctx): void {
  ctx.beginPath();
  ctx.arc(HX, HY - 4, R + 4, Math.PI * 1.1, Math.PI * 1.9);
  ink(ctx, 12, INK);
  ink(ctx, 7, '#5a5f68');
  for (const s of [-1, 1]) {
    roundRect(ctx, HX + s * (R - 4) - 12, HY - 22, 24, 40, 10);
    fillInk(ctx, lit(ctx, HX + s * (R - 4), HY - 2, 20, '#ff8a1c', 0.3), 4);
  }
}

function foreheadGoggles(ctx: Ctx): void {
  const y = FY - FRY + 16;
  roundRect(ctx, HX - 64, y - 5, 128, 10, 5);
  fillInk(ctx, '#2a2830', 3);
  for (const s of [-1, 1]) {
    circle(ctx, HX + s * 22, y, 13);
    fillInk(ctx, lit(ctx, HX + s * 22, y, 13, '#5a5868', 0.4), 3.5);
    shine(ctx, HX + s * 22 - 4, y - 4, 4, 2.4, 0.7);
  }
}

function cap(ctx: Ctx): void {
  const y = FY - FRY + 8;
  ctx.beginPath();
  ctx.moveTo(FX - 56, y + 18);
  ctx.bezierCurveTo(FX - 58, y - 30, FX + 58, y - 30, FX + 56, y + 18);
  ctx.closePath();
  fillInk(ctx, lit(ctx, FX, y, 50, '#2a2d3a', 0.35), 4);
  // the peel of the cap, worn backwards: a little tab at the side
  roundRect(ctx, FX + 40, y + 8, 40, 12, 6);
  fillInk(ctx, '#2a2d3a', 3.5);
  boltPath(ctx, FX, y - 4, 0.8);
  fillInk(ctx, '#ffd23f', 2);
}

function topHat(ctx: Ctx): void {
  const y = HY - R + 34;
  ellipse(ctx, HX, y, 54, 10);
  fillInk(ctx, '#1a1820', 4.5);
  ctx.beginPath();
  ctx.moveTo(HX - 30, y);
  ctx.lineTo(HX - 27, y - 40);
  ctx.quadraticCurveTo(HX, y - 46, HX + 27, y - 40);
  ctx.lineTo(HX + 30, y);
  ctx.quadraticCurveTo(HX, y + 7, HX - 30, y);
  fillInk(ctx, vlin(ctx, y - 46, y, '#3a3844', '#121016'), 4.5);
  ctx.beginPath();
  ctx.moveTo(HX - 29, y - 8);
  ctx.quadraticCurveTo(HX, y - 3, HX + 29, y - 8);
  ctx.lineTo(HX + 28, y - 17);
  ctx.quadraticCurveTo(HX, y - 12, HX - 28, y - 17);
  fillInk(ctx, '#c8102e', 2.5);
  shine(ctx, HX - 14, y - 30, 4, 9, 0.25, 0);
}

function chefHat(ctx: Ctx): void {
  const y = HY - R + 34;
  for (const [dx, dy, rr] of [[-24, -16, 16], [0, -24, 19], [24, -16, 16]] as const) {
    circle(ctx, HX + dx, y + dy, rr);
    fillInk(ctx, lit(ctx, HX + dx, y + dy, rr, '#ffffff', 0.1), 4);
  }
  roundRect(ctx, HX - 36, y - 10, 72, 18, 6);
  fillInk(ctx, '#f4f1ea', 4);
}

function softServe(ctx: Ctx): void {
  const y = HY - R + 22;
  for (const [w, dy] of [[46, 0], [34, -12], [22, -23]] as const) {
    ellipse(ctx, HX, y + dy, w, 10);
    fillInk(ctx, lit(ctx, HX, y + dy, w, '#f4f8ff', 0.1), 4);
  }
  ctx.beginPath();
  ctx.moveTo(HX - 5, y - 30);
  ctx.quadraticCurveTo(HX + 4, y - 44, HX + 9, y - 36);
  fillInk(ctx, '#f4f8ff', 3.5);
}

function bracers(ctx: Ctx): void {
  for (const y of [HY + 128, HY + 150]) {
    roundRect(ctx, HX - 17, y, 34, 12, 4);
    fillInk(ctx, vlin(ctx, y, y + 12, '#fff6b0', '#c88a10'), 3);
  }
}

// ——— emblems: our own badges, never a real hero's logo ———
function emblem(ctx: Ctx, kind: EmblemKind, col: string, bg: string, fine: boolean): void {
  const x = HX;
  const y = EMB_Y;
  const rr = 22;
  // a stamped badge
  circle(ctx, x, y + 3, rr);
  ctx.fillStyle = rgba('#000000', 0.22);
  ctx.fill();
  circle(ctx, x, y, rr);
  fillInk(ctx, lit(ctx, x, y, rr, bg, 0.35), 4);
  if (fine) {
    circle(ctx, x, y, rr - 4);
    ink(ctx, 1.5, rgba('#ffffff', 0.45));
  }
  ctx.save();
  circle(ctx, x, y, rr - 2);
  ctx.clip();
  const c = col;
  const glyph = (lw = 2.5) => fillInk(ctx, lit(ctx, x, y, 16, c, 0.4), lw);
  switch (kind) {
    case 'star4':
      starPath(ctx, x, y, 17, 4, 0.36);
      glyph();
      break;
    case 'nightSlice':
      // a crescent moon cradling a little slice
      ctx.beginPath();
      ctx.arc(x - 2, y, 15, Math.PI * 0.25, Math.PI * 1.75);
      ctx.arc(x + 5, y - 2, 11, Math.PI * 1.6, Math.PI * 0.4, true);
      ctx.closePath();
      glyph();
      slicePath(ctx, x + 6, y + 1, 0.55);
      fillInk(ctx, '#ff9f1c', 2);
      break;
    case 'laurel':
      for (const s of [-1, 1])
        for (let i = 0; i < 4; i++) {
          ellipse(ctx, x + s * (9 + i * 1.5), y + 10 - i * 7, 4, 7, s * (0.6 + i * 0.15));
          glyph(2);
        }
      break;
    case 'chevrons':
      for (const dx of [-7, 5])
        poly(ctx, [[x + dx - 6, y - 12], [x + dx + 6, y], [x + dx - 6, y + 12], [x + dx - 1, y], [x + dx - 6, y - 12]]), glyph(2);
      break;
    case 'wave':
      ctx.beginPath();
      ctx.moveTo(x - 16, y + 8);
      ctx.bezierCurveTo(x - 12, y - 14, x + 8, y - 16, x + 10, y - 2);
      ctx.bezierCurveTo(x + 2, y - 8, x - 6, y - 2, x - 2, y + 4);
      ctx.lineTo(x + 16, y + 8);
      ctx.lineTo(x + 16, y + 16);
      ctx.lineTo(x - 16, y + 16);
      ctx.closePath();
      glyph();
      break;
    case 'lampshade':
      poly(ctx, [[x - 8, y - 12], [x + 8, y - 12], [x + 14, y + 6], [x - 14, y + 6]]);
      glyph();
      roundRect(ctx, x - 2, y + 6, 4, 8, 1);
      glyph(2);
      ctx.beginPath();
      ctx.moveTo(x - 10, y + 14);
      ctx.lineTo(x + 10, y + 14);
      ink(ctx, 3, c);
      break;
    case 'sliceSpider':
      for (const s of [-1, 1])
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(x, y - 2 + i * 3);
          ctx.quadraticCurveTo(x + s * 12, y - 12 + i * 6, x + s * 17, y - 4 + i * 7);
          ink(ctx, 2.5, c);
        }
      slicePath(ctx, x, y, 0.7);
      glyph(0);
      break;
    case 'core':
      ctx.save();
      ctx.shadowColor = c;
      ctx.shadowBlur = 12;
      poly(ctx, [[x, y - 14], [x + 13, y + 9], [x - 13, y + 9]]);
      ctx.fillStyle = shade(c, 0.4);
      ctx.fill();
      ctx.restore();
      ink(ctx, 2.5);
      break;
    case 'pizzaShield':
      circle(ctx, x, y, 16);
      fillInk(ctx, c, 2.5);
      circle(ctx, x, y, 10);
      fillInk(ctx, bg, 2);
      slicePath(ctx, x, y, 0.5);
      fillInk(ctx, '#ffd23f', 2);
      break;
    case 'window':
      roundRect(ctx, x - 13, y - 13, 26, 26, 3);
      glyph();
      ctx.beginPath();
      ctx.moveTo(x, y - 13);
      ctx.lineTo(x, y + 13);
      ctx.moveTo(x - 13, y);
      ctx.lineTo(x + 13, y);
      ink(ctx, 3, bg);
      break;
    case 'target':
      for (const [rr2, cc] of [[16, c], [11, bg], [6, c]] as const) {
        circle(ctx, x, y, rr2);
        fillInk(ctx, cc, 2);
      }
      break;
    case 'claws':
      for (const dx of [-9, 0, 9]) {
        ctx.beginPath();
        ctx.moveTo(x + dx - 3, y + 14);
        ctx.quadraticCurveTo(x + dx - 4, y - 4, x + dx + 2, y - 16);
        ctx.quadraticCurveTo(x + dx + 2, y - 2, x + dx + 3, y + 14);
        glyph(2);
      }
      break;
    case 'cloudBolt':
      for (const [dx, dy, r2] of [[-8, 0, 8], [3, -5, 10], [11, 2, 7]] as const) {
        circle(ctx, x + dx, y + dy - 2, r2);
        ctx.fillStyle = c;
        ctx.fill();
      }
      boltPath(ctx, x, y + 8, 0.6);
      fillInk(ctx, '#ffd23f', 2);
      break;
    case 'eye':
      ctx.beginPath();
      ctx.moveTo(x - 16, y);
      ctx.quadraticCurveTo(x, y - 14, x + 16, y);
      ctx.quadraticCurveTo(x, y + 14, x - 16, y);
      fillInk(ctx, '#ffffff', 2.5);
      circle(ctx, x, y, 6);
      fillInk(ctx, c, 2);
      break;
    case 'fangs':
      for (const dx of [-8, 8]) {
        poly(ctx, [[x + dx - 6, y - 10], [x + dx + 6, y - 10], [x + dx, y + 12]]);
        glyph(2);
      }
      break;
    case 'amulet':
      circle(ctx, x, y, 15);
      fillInk(ctx, '#e8b23a', 2.5);
      ellipse(ctx, x, y, 9, 7);
      fillInk(ctx, lit(ctx, x, y, 9, c, 0.5), 2);
      break;
    case 'hex':
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        ctx.moveTo(x, y);
        const a0 = (i / 3) * Math.PI * 2;
        ctx.bezierCurveTo(x + Math.cos(a0) * 16, y + Math.sin(a0) * 16, x + Math.cos(a0 + 1) * 16, y + Math.sin(a0 + 1) * 16, x + Math.cos(a0 + 1.6) * 6, y + Math.sin(a0 + 1.6) * 6);
      }
      ink(ctx, 4, c);
      break;
    case 'arrowsInOut':
      for (const s of [-1, 1]) {
        poly(ctx, [[x + s * 4, y], [x + s * 15, y - 8], [x + s * 15, y + 8]]);
        glyph(2);
      }
      circle(ctx, x, y, 3);
      ctx.fillStyle = c;
      ctx.fill();
      break;
    case 'doubleD':
      for (const dx of [-6, 6]) {
        ctx.beginPath();
        ctx.moveTo(x + dx - 6, y - 12);
        ctx.quadraticCurveTo(x + dx + 12, y - 12, x + dx + 6, y + 12);
        ctx.lineTo(x + dx - 6, y + 12);
        ctx.closePath();
        ink(ctx, 3.5, c);
      }
      break;
    case 'cutter':
      circle(ctx, x, y - 2, 12);
      glyph();
      circle(ctx, x, y - 2, 3);
      fillInk(ctx, bg, 1.5);
      roundRect(ctx, x - 3, y + 8, 6, 12, 2);
      glyph(2);
      break;
    case 'fin':
      ctx.beginPath();
      ctx.moveTo(x - 14, y + 12);
      ctx.quadraticCurveTo(x - 4, y - 16, x + 12, y - 14);
      ctx.quadraticCurveTo(x + 2, y, x + 14, y + 12);
      ctx.closePath();
      glyph();
      break;
    case 'leaf':
    case 'wasabiLeaf':
      ctx.beginPath();
      ctx.moveTo(x - 12, y + 12);
      ctx.quadraticCurveTo(x - 14, y - 12, x + 14, y - 14);
      ctx.quadraticCurveTo(x + 12, y + 12, x - 12, y + 12);
      glyph();
      ctx.beginPath();
      ctx.moveTo(x - 10, y + 10);
      ctx.lineTo(x + 10, y - 10);
      ink(ctx, 1.8, rgba(INK, 0.6));
      break;
    case 'rocket':
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.7);
      roundRect(ctx, -6, -14, 12, 24, 6);
      glyph();
      poly(ctx, [[-6, 6], [-11, 14], [-6, 10]]);
      glyph(2);
      poly(ctx, [[6, 6], [11, 14], [6, 10]]);
      glyph(2);
      ctx.restore();
      break;
    case 'cassette':
      roundRect(ctx, x - 16, y - 10, 32, 20, 3);
      glyph();
      for (const dx of [-7, 7]) {
        circle(ctx, x + dx, y - 1, 4);
        fillInk(ctx, bg, 2);
      }
      break;
    case 'sunburst':
      starPath(ctx, x, y, 17, 8, 0.5);
      glyph();
      break;
    case 'sliceBolt':
      slicePath(ctx, x, y, 1);
      fillInk(ctx, '#f4f1ea', 2.5);
      boltPath(ctx, x, y - 1, 0.7);
      fillInk(ctx, c, 2);
      break;
    case 'circuit':
      ctx.beginPath();
      ctx.moveTo(x - 14, y - 6);
      ctx.lineTo(x - 4, y - 6);
      ctx.lineTo(x + 2, y + 4);
      ctx.lineTo(x + 14, y + 4);
      ctx.moveTo(x - 10, y + 10);
      ctx.lineTo(x + 4, y + 10);
      ctx.moveTo(x - 2, y - 14);
      ctx.lineTo(x - 2, y - 6);
      ink(ctx, 3, c);
      for (const [px, py] of [[-14, -6], [14, 4], [-10, 10], [-2, -14]] as const) {
        circle(ctx, x + px, y + py, 2.6);
        ctx.fillStyle = c;
        ctx.fill();
      }
      break;
    case 'sliceBadge':
      slicePath(ctx, x, y + 1, 1.05);
      glyph();
      for (const [px, py] of [[-4, -3], [3, 1], [0, 7]] as const) {
        circle(ctx, x + px, y + py, 2.2);
        ctx.fillStyle = bg;
        ctx.fill();
      }
      break;
    case 'paw':
      ellipse(ctx, x, y + 5, 8, 7);
      glyph(2);
      for (const [px, py] of [[-9, -5], [-3, -10], [3, -10], [9, -5]] as const) {
        ellipse(ctx, x + px, y + py, 3.2, 4);
        glyph(1.5);
      }
      break;
    case 'gem':
      poly(ctx, [[x - 8, y - 12], [x + 8, y - 12], [x + 14, y - 2], [x, y + 14], [x - 14, y - 2]]);
      glyph();
      ctx.beginPath();
      ctx.moveTo(x - 14, y - 2);
      ctx.lineTo(x + 14, y - 2);
      ink(ctx, 1.5, rgba('#ffffff', 0.7));
      break;
    case 'arrowUp':
      poly(ctx, [[x, y - 16], [x + 10, y - 4], [x + 3, y - 4], [x + 3, y + 16], [x - 3, y + 16], [x - 3, y - 4], [x - 10, y - 4]]);
      glyph();
      break;
    case 'spring':
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) ctx.lineTo(x + (i % 2 ? 9 : -9), y - 14 + i * 4.7);
      ink(ctx, 3.5, c);
      break;
    case 'feather':
      ctx.beginPath();
      ctx.moveTo(x - 10, y + 14);
      ctx.quadraticCurveTo(x - 10, y - 8, x + 12, y - 14);
      ctx.quadraticCurveTo(x + 8, y + 6, x - 10, y + 14);
      glyph();
      break;
    case 'scarab':
      ellipse(ctx, x, y + 2, 10, 12);
      glyph();
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x, y + 14);
      ink(ctx, 2, bg);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + s * 8, y - 4);
        ctx.lineTo(x + s * 16, y - 12);
        ctx.moveTo(x + s * 9, y + 4);
        ctx.lineTo(x + s * 17, y + 4);
        ink(ctx, 2.5, c);
      }
      break;
    case 'cheese':
      poly(ctx, [[x - 15, y + 10], [x + 15, y + 10], [x + 15, y - 2], [x - 15, y - 12]]);
      glyph();
      for (const [px, py, pr] of [[-5, 2, 3], [6, 4, 2.5], [8, -3, 2]] as const) {
        circle(ctx, x + px, y + py, pr);
        ctx.fillStyle = shade(c, -0.3);
        ctx.fill();
      }
      break;
    case 'plug':
      roundRect(ctx, x - 9, y - 6, 18, 16, 4);
      glyph();
      for (const dx of [-4, 4]) {
        roundRect(ctx, x + dx - 1.5, y - 14, 3, 8, 1);
        glyph(1.5);
      }
      boltPath(ctx, x, y + 2, 0.4);
      ctx.fillStyle = bg;
      ctx.fill();
      break;
    case 'wand':
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.7);
      roundRect(ctx, -2.5, -4, 5, 22, 2);
      fillInk(ctx, '#1a1418', 2);
      roundRect(ctx, -2.5, -4, 5, 5, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
      starPath(ctx, x + 6, y - 8, 7, 4, 0.4);
      glyph(1.5);
      break;
    case 'mushroom':
      ctx.beginPath();
      ctx.arc(x, y, 14, Math.PI, 0);
      ctx.closePath();
      glyph();
      roundRect(ctx, x - 4, y, 8, 12, 3);
      fillInk(ctx, '#f4f1ea', 2);
      for (const [px, py] of [[-6, -5], [5, -8]] as const) {
        circle(ctx, x + px, y + py, 2.5);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
      break;
    case 'sticks':
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x - 13 * s, y - 13);
        ctx.lineTo(x + 13 * s, y + 13);
        ink(ctx, 7, INK);
        ink(ctx, 4, c);
      }
      break;
    case 'flame':
      ctx.beginPath();
      ctx.moveTo(x, y - 16);
      ctx.quadraticCurveTo(x + 16, y, x + 8, y + 12);
      ctx.quadraticCurveTo(x, y + 18, x - 8, y + 12);
      ctx.quadraticCurveTo(x - 16, y, x, y - 16);
      glyph();
      ctx.beginPath();
      ctx.moveTo(x, y - 4);
      ctx.quadraticCurveTo(x + 7, y + 4, x + 3, y + 10);
      ctx.quadraticCurveTo(x, y + 12, x - 3, y + 10);
      ctx.quadraticCurveTo(x - 7, y + 4, x, y - 4);
      ctx.fillStyle = '#fff6c0';
      ctx.fill();
      break;
    case 'crescent':
      ctx.beginPath();
      ctx.arc(x, y, 15, Math.PI * 0.3, Math.PI * 1.7);
      ctx.arc(x + 7, y, 11, Math.PI * 1.55, Math.PI * 0.45, true);
      ctx.closePath();
      glyph();
      break;
    case 'gavel':
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.6);
      roundRect(ctx, -12, -12, 24, 10, 3);
      glyph();
      roundRect(ctx, -2.5, -2, 5, 18, 2);
      glyph(2);
      ctx.restore();
      break;
    case 'spade':
      ctx.beginPath();
      ctx.moveTo(x, y - 14);
      ctx.bezierCurveTo(x + 18, y - 2, x + 12, y + 12, x, y + 4);
      ctx.bezierCurveTo(x - 12, y + 12, x - 18, y - 2, x, y - 14);
      glyph();
      poly(ctx, [[x, y + 2], [x + 5, y + 14], [x - 5, y + 14]]);
      glyph(2);
      break;
    case 'snowflake':
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(a) * 15, y - Math.sin(a) * 15);
        ctx.lineTo(x + Math.cos(a) * 15, y + Math.sin(a) * 15);
        ink(ctx, 3.5, c);
      }
      circle(ctx, x, y, 4);
      ctx.fillStyle = c;
      ctx.fill();
      break;
    case 'flameRing':
      circle(ctx, x, y, 14);
      ink(ctx, 4, c);
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.quadraticCurveTo(x + 9, y + 2, x, y + 9);
      ctx.quadraticCurveTo(x - 9, y + 2, x, y - 10);
      glyph(1.5);
      break;
    case 'cheeseString':
      poly(ctx, [[x - 15, y + 6], [x - 2, y + 6], [x - 2, y - 4], [x - 15, y - 10]]);
      glyph(2);
      poly(ctx, [[x + 2, y + 10], [x + 15, y + 10], [x + 15, y - 6]]);
      glyph(2);
      ctx.beginPath();
      ctx.moveTo(x - 2, y);
      ctx.quadraticCurveTo(x, y + 10, x + 4, y + 4);
      ink(ctx, 2.5, c);
      break;
    case 'acorn':
      ellipse(ctx, x, y + 4, 10, 12);
      fillInk(ctx, lit(ctx, x, y + 4, 12, '#c8803a', 0.4), 2.5);
      ctx.beginPath();
      ctx.arc(x, y - 2, 12, Math.PI, 0);
      ctx.closePath();
      glyph();
      roundRect(ctx, x - 1.5, y - 18, 3, 6, 1);
      glyph(1.5);
      break;
  }
  ctx.restore();
  // the badge's own little sheen
  shine(ctx, x - 7, y - 9, 7, 3.5, 0.45);
}

// ——— the headline heroes get extra care ———
function fineDetail(ctx: Ctx, id: string, a: HeroArt): void {
  if (id === 'hero:superpeel') {
    // a stitched seam round the badge, and a rim of light on the cape's edge
    ctx.save();
    ctx.setLineDash([3, 4]);
    circle(ctx, HX, EMB_Y, 27);
    ink(ctx, 1.6, rgba('#ffffff', 0.55));
    ctx.restore();
    // a bright glint in each eye: the heat vision waiting
    for (const s of [-1, 1]) {
      circle(ctx, FX + s * EYE_DX - 1, EYE_Y + 1, 2.2);
      ctx.fillStyle = rgba('#ff4a3a', 0.9);
      ctx.fill();
    }
    // a strong jaw line
    ctx.beginPath();
    ctx.moveTo(FX - 28, FY + 40);
    ctx.quadraticCurveTo(FX, FY + 54, FX + 28, FY + 40);
    ink(ctx, 2, rgba(INK, 0.35));
    // cape clasp on each shoulder
    for (const s of [-1, 1]) {
      circle(ctx, HX + s * 66, HY + 22, 7);
      fillInk(ctx, lit(ctx, HX + s * 66, HY + 22, 7, '#ffd23f', 0.6), 3);
    }
  }
  if (id === 'hero:batpeel') {
    // stitched seams down the cowl, a brow ridge and the frown
    ctx.save();
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(HX, HY - R + 4);
    ctx.lineTo(HX, EYE_Y - 12);
    ctx.moveTo(HX - 46, HY - 60);
    ctx.quadraticCurveTo(HX - 60, HY - 20, HX - 56, HY + 10);
    ctx.moveTo(HX + 46, HY - 60);
    ctx.quadraticCurveTo(HX + 60, HY - 20, HX + 56, HY + 10);
    ink(ctx, 1.6, rgba('#ffffff', 0.3));
    ctx.restore();
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(FX + s * 8, EYE_Y - 10);
      ctx.quadraticCurveTo(FX + s * 24, EYE_Y - 18, FX + s * 40, EYE_Y - 10);
      ink(ctx, 3.5, shade(a.maskColor ?? '#2b2d3a', -0.4));
      // ear highlights
      ctx.beginPath();
      ctx.moveTo(HX + s * 46, HY - 76);
      ctx.lineTo(HX + s * 54, HY - 92);
      ink(ctx, 2, rgba('#ffffff', 0.35));
    }
    // a scalloped cape hem
    for (let i = 0; i < 6; i++) {
      const x = HX - 100 + i * 40;
      ctx.beginPath();
      ctx.arc(x + 20, HY + 136, 20, 0, Math.PI);
      ctx.fillStyle = rgba('#000000', 0.18);
      ctx.fill();
    }
  }
}
