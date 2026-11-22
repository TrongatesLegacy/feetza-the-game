// Act 9 (Greek myths) in the style kit, batch acts-e part 2a: the three Titans Hades frees, and the Minotaur.
// - KRONOS: a colossal foot of weathered grey stone (lichen, chisel marks, a crack mended in gold), a carved clock dial
//   sunk into the instep with gold Roman numerals, an hourglass strapped to the ankle and a harpe (the sickle he cut
//   the sky with) hanging at his side. In play the hands tick backwards, sand trickles and gold motes of time drift up.
// - ATLAS: a huge straining bronze-skinned foot, tendons and veins standing out, beaded with sweat, the night sky
//   inlaid on the instep as a gold armillary sphere, blue linen wrapped round the ankle and a gold band. In play he
//   breathes hard, sweat drips, the stars twinkle and star dust drifts off the sphere.
// - HYPERION: a foot of molten solar gold, granulated like the sun's surface, white-hot at the core, a sun sigil
//   engraved on it, wreathed in a corona of flame rays. In play the corona turns, embers rise, flares arc off it.
// - THE MINOTAUR: a bull's leg of shaggy dark fur ending in a great glossy cloven hoof, the bull's face on the front
//   (glaring red eyes under heavy brows, a wet muzzle, a bronze ring through the nose), horns sweeping out from the
//   ankle and a gold-studded collar. In play he blinks and glares at your peel, snorts steam, paws up dust.
// Every one of them overheats in its later phases (the heat layer, plus steam in play).

import type { FootArt } from '../../data/feet';
import { CX } from '../../art/feetCommon';
import { type BareLook, bareFoot, bareOutline, paintBare } from '../../art/style/bare';
import { LIGHT, type PathFn, type Pose, crease, glint, inkOf, innerEdge, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil, lobe } from '../../art/style/sil';
import { registerStyle } from '../../art/style/registry';
import { blotches, contact, rivet, tuftPath } from '../../art/style/details';
import { LX, LY, clip, fill, furCoat, glowDot, glowFinish, goldRamp, heatLayer, lightAll, lin, panel, rad, streak } from '../../art/style/kit-bosses';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';

type Opts = { live: boolean; emissive?: boolean; heat?: boolean };

const ell = (x: number, y: number, rx: number, ry: number, rot = 0): PathFn => (c) => {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
};

function raised(g: Ctx, path: PathFn, f: string | CanvasGradient, a = 0.45, d = 2.2): void {
  contact(g, (c) => {
    path(c);
    c.fill();
  }, a, d, 3);
  fill(g, path, f);
}

const line = (pts: [number, number][]) => (c: Ctx) => pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));

/** A band wrapped round the ankle: its edges bow down as they go round the leg (y0 top at the sides, h tall). */
function wrapPath(y0: number, h: number, hw: number, bow: number, tilt = 0): PathFn {
  return (c) => {
    c.beginPath();
    c.moveTo(CX - hw, y0 - tilt);
    c.quadraticCurveTo(CX, y0 + bow, CX + hw, y0 + tilt);
    c.lineTo(CX + hw, y0 + tilt + h);
    c.quadraticCurveTo(CX, y0 + bow + h, CX - hw, y0 - tilt + h);
    c.closePath();
  };
}

/** A clock hand (design units) from (x, y) along `ang` (0 = up, clockwise), drawn in gold with its own shadow. */
export function clockHand(g: Ctx, x: number, y: number, ang: number, len: number, w: number, gold: string, shadow = true): void {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  const hand: PathFn = (c) => {
    c.beginPath();
    c.moveTo(-w * 0.5, 8);
    c.lineTo(-w * 0.6, -len * 0.55);
    // a spade tip
    c.quadraticCurveTo(-w * 1.6, -len * 0.7, 0, -len);
    c.quadraticCurveTo(w * 1.6, -len * 0.7, w * 0.6, -len * 0.55);
    c.lineTo(w * 0.5, 8);
    c.closePath();
  };
  if (shadow)
    contact(g, (c) => {
      hand(c);
      c.fill();
    }, 0.55, 3, 2.5);
  fill(g, hand, lin(g, -w, 0, w, 0, [
    [0, mix(gold, '#fffbe0', 0.55)],
    [0.45, gold],
    [1, shade(gold, -0.5)],
  ]));
  g.strokeStyle = rgba(shade(gold, -0.65), 0.9);
  g.lineWidth = 1;
  hand(g);
  g.stroke();
  g.restore();
}

// ════════════════════════════ KRONOS ════════════════════════════

export const KRONOS_DIAL = { x: CX + 2, y: 122, r: 44 };
export const KRONOS_GLASS = { x: CX, y: 40, s: 0.8 };
/** Where the harpe hangs from the ankle strap (a live part: it swings). */
export const KRONOS_HARPE = { x: CX + 74, y: 34 };

const kronosLook = (art: FootArt): BareLook => ({ skin: art.skin, nails: null, toe: 1.05, ball: 1.03, w: 4, pores: 0.12, detail: 0.45, shadowTint: '#141834' });

const KRONOS_CRACKS: [number, number][][] = [
  [[CX - 42, 8], [CX - 52, 40], [CX - 40, 64], [CX - 62, 104]],
  [[CX + 78, 92], [CX + 64, 128], [CX + 80, 160], [CX + 70, 186]],
  [[CX - 84, 150], [CX - 64, 168], [CX - 74, 196]],
];
/** The crack time has mended in gold. */
const KRONOS_KINTSUGI: [number, number][] = [[CX - 30, 176], [CX - 18, 160], [CX - 26, 140], [CX - 8, 128]];

function harpePath(): PathFn {
  const { x, y } = KRONOS_HARPE;
  return (c) => {
    // the grip, hanging from the strap
    c.beginPath();
    c.moveTo(x - 4, y);
    c.lineTo(x + 5, y - 2);
    c.lineTo(x + 18, y + 62);
    c.lineTo(x + 8, y + 64);
    c.closePath();
    // the pommel
    c.moveTo(x + 7, y - 4);
    c.arc(x, y - 4, 7, 0, Math.PI * 2);
    // the guard
    c.moveTo(x + 2, y + 60);
    c.lineTo(x + 26, y + 56);
    c.lineTo(x + 27, y + 64);
    c.lineTo(x + 3, y + 68);
    c.closePath();
    // the crescent blade: a straight forte, then the sickle curving out and back in to the point
    c.moveTo(x + 9, y + 64);
    c.lineTo(x + 22, y + 62);
    c.bezierCurveTo(x + 62, y + 74, x + 78, y + 130, x + 58, y + 178);
    c.bezierCurveTo(x + 52, y + 186, x + 42, y + 190, x + 34, y + 186);
    c.bezierCurveTo(x + 54, y + 148, x + 48, y + 104, x + 14, y + 92);
    c.closePath();
  };
}

function paintHarpe(g: Ctx): void {
  const { x, y } = KRONOS_HARPE;
  const blade: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x + 9, y + 64);
    c.lineTo(x + 22, y + 62);
    c.bezierCurveTo(x + 62, y + 74, x + 78, y + 130, x + 58, y + 178);
    c.bezierCurveTo(x + 52, y + 186, x + 42, y + 190, x + 34, y + 186);
    c.bezierCurveTo(x + 54, y + 148, x + 48, y + 104, x + 14, y + 92);
    c.closePath();
  };
  // old bronze-age steel: cold, a hard mirror band along the spine and a honed edge on the inside of the curve
  clip(g, blade, () => {
    g.fillStyle = lin(g, x + 10, y + 60, x + 80, y + 190, [
      [0, '#e8ecf2'],
      [0.35, '#9aa3b0'],
      [0.6, '#5a6272'],
      [1, '#2a2e3a'],
    ]);
    g.fillRect(x, y + 50, 100, 150);
    texture(g, 'brushed', { x, y: y + 50, w: 100, h: 150 }, 0.25, 1.2);
    // the honed edge: a bright bevel along the inner curve
    streak(g, (c) => {
      c.moveTo(x + 18, y + 96);
      c.bezierCurveTo(x + 50, y + 108, x + 56, y + 150, x + 40, y + 182);
    }, 2.2, 0.85);
    // the spine catches the key light
    streak(g, (c) => {
      c.moveTo(x + 26, y + 66);
      c.bezierCurveTo(x + 60, y + 80, x + 76, y + 118, x + 70, y + 150);
    }, 3, 0.45);
    // age: a few pits and a bloom of dark patina near the point
    blotches(g, { x: x + 20, y: y + 120, w: 70, h: 70 }, '#2a2030', 0.45, 9, 0.55, 0.2, 811);
  });
  // the grip: leather wound round it
  const grip: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 4, y);
    c.lineTo(x + 5, y - 2);
    c.lineTo(x + 18, y + 62);
    c.lineTo(x + 8, y + 64);
    c.closePath();
  };
  clip(g, grip, () => {
    g.fillStyle = lin(g, x - 4, 0, x + 18, 0, [
      [0, '#8a5a34'],
      [0.5, '#5a3a22'],
      [1, '#2a180c'],
    ]);
    g.fillRect(x - 10, y - 4, 34, 72);
    for (let i = 0; i < 9; i++) {
      const yy = y + 2 + i * 7;
      crease(g, (c) => {
        c.moveTo(x - 6 + i * 1.5, yy);
        c.lineTo(x + 20 + i * 1.5, yy + 5);
      }, 1.6, '#140a04', 0.6, 0.25);
    }
  });
  raised(g, ell(x, y - 4, 7, 7), rad(g, x - 2, y - 7, 0.5, x, y - 4, 8, [
    [0, '#fff4c0'],
    [0.4, '#d9a441'],
    [1, '#6a4008'],
  ]), 0.4);
  const guard: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x + 2, y + 60);
    c.lineTo(x + 26, y + 56);
    c.lineTo(x + 27, y + 64);
    c.lineTo(x + 3, y + 68);
    c.closePath();
  };
  raised(g, guard, goldRamp(g, x + 2, y + 56, x + 27, y + 68, '#d9a441'), 0.5);
  glint(g, x + 46, y + 84, 6, 0.9);
}

/** The harpe as its own lit, outlined piece (drawn behind the foot; a live sway part in play). */
function drawHarpe(g: Ctx, box: { x: number; y: number; w: number; h: number }): void {
  const s = new Sil(g, [harpePath()], box);
  paintHarpe(s.g);
  s.edge(rgba('#06060e', 0.35), 8, LX * 5, LY * 5);
  s.edge(rgba(LIGHT.rim, 0.6), 2.2, LX * 2.5, LY * 2.5);
  s.finish(inkOf('#3a3e4a'));
}

const HARPE_BOX = { x: KRONOS_HARPE.x - 14, y: KRONOS_HARPE.y - 16, w: 100, h: 212 };

/** The hourglass at the ankle: gold caps and posts, the glass, the sand (the falling stream only when `stream`). */
export function hourglass(g: Ctx, cx: number, cy: number, s: number, stream: boolean, sand = '#ffcf6a', gold = '#d9c27a'): void {
  g.save();
  g.translate(cx, cy);
  g.scale(s, s);
  const bulb: PathFn = (c) => {
    c.beginPath();
    c.moveTo(-20, -29);
    c.bezierCurveTo(-22, -10, -6, -6, -3, 0);
    c.bezierCurveTo(-6, 6, -22, 10, -20, 29);
    c.lineTo(20, 29);
    c.bezierCurveTo(22, 10, 6, 6, 3, 0);
    c.bezierCurveTo(6, -6, 22, -10, 20, -29);
    c.closePath();
  };
  // the stone shows through the glass, darker and a little blue
  contact(g, (c) => {
    bulb(c);
    c.fill();
  }, 0.5, 3, 4);
  fill(g, bulb, rgba('#20283a', 0.55));
  clip(g, bulb, () => {
    // sand: what's left on top (a dished heap) and the cone growing below
    const top: PathFn = (c) => {
      c.beginPath();
      c.moveTo(-15, -15);
      c.quadraticCurveTo(0, -8, 15, -15);
      c.lineTo(3, -1);
      c.lineTo(-3, -1);
      c.closePath();
    };
    const pile: PathFn = (c) => {
      c.beginPath();
      c.moveTo(-21, 30);
      c.quadraticCurveTo(-6, 12, 0, 9);
      c.quadraticCurveTo(6, 12, 21, 30);
      c.closePath();
    };
    for (const p of [top, pile]) fill(g, p, lin(g, -14, -20, 14, 30, [
      [0, shade(sand, 0.35)],
      [0.5, sand],
      [1, shade(sand, -0.4)],
    ]));
    texture(g, 'speckle', { x: -24, y: -32, w: 48, h: 64 }, 0.35, 1);
    if (stream) {
      g.fillStyle = shade(sand, 0.15);
      g.fillRect(-0.9, -2, 1.8, 13);
    }
    // the glass: a cool sheen down the left, a rim of light round the bulbs
    g.fillStyle = lin(g, -22, 0, 22, 0, [
      [0, rgba('#dff6ff', 0.35)],
      [0.3, rgba('#dff6ff', 0.05)],
      [0.8, rgba('#dff6ff', 0)],
      [1, rgba('#dff6ff', 0.25)],
    ]);
    g.fillRect(-24, -32, 48, 64);
  });
  innerEdge(g, bulb, rgba('#e8f8ff', 0.6), 3, 1.5, 1.5);
  g.strokeStyle = rgba('#e8f8ff', 0.5);
  g.lineWidth = 1.2;
  bulb(g);
  g.stroke();
  streak(g, (c) => {
    c.moveTo(-15, -24);
    c.quadraticCurveTo(-17, -14, -9, -6);
  }, 1.8, 0.8);
  streak(g, (c) => {
    c.moveTo(-14, 24);
    c.quadraticCurveTo(-16, 16, -10, 9);
  }, 1.4, 0.55);
  // the frame: two turned gold caps and three posts
  for (const px of [-23, 23]) {
    const post: PathFn = (c) => {
      c.beginPath();
      c.rect(px - 2.2, -32, 4.4, 64);
    };
    raised(g, post, goldRamp(g, px - 2.2, 0, px + 2.2, 0, gold), 0.45, 1.6);
  }
  for (const yy of [-35, 35]) {
    const cap: PathFn = (c) => {
      c.beginPath();
      c.roundRect(-29, yy - 5.5, 58, 11, 4);
    };
    raised(g, cap, lin(g, 0, yy - 5.5, 0, yy + 5.5, [
      [0, mix(gold, '#fffbe0', 0.6)],
      [0.4, gold],
      [1, shade(gold, -0.5)],
    ]), 0.5, 2);
    crease(g, (c) => {
      c.moveTo(-26, yy + 1);
      c.lineTo(26, yy + 1);
    }, 1, shade(gold, -0.6), 0.5, 0.3);
  }
  glint(g, -18, -34, 4, 0.9);
  g.restore();
}

function kronosDialPath(): PathFn {
  const { x, y, r } = KRONOS_DIAL;
  return ell(x, y, r, r * 0.94);
}

function paintKronosDial(g: Ctx, stone: string, gold: string, hands: boolean): void {
  const { x, y, r } = KRONOS_DIAL;
  const dial = kronosDialPath();
  // sunk into the stone: the face is darker and smoother, shadowed under its top-left lip, lit on its bottom-right
  fill(g, dial, rad(g, x + 8, y + 10, 4, x, y, r, [
    [0, shade(stone, -0.08)],
    [1, shade(stone, -0.32)],
  ]));
  clip(g, dial, () => texture(g, 'stone', { x: x - r, y: y - r, w: r * 2, h: r * 2 }, 0.2, 2));
  innerEdge(g, dial, rgba('#05060e', 0.75), 7, -LX * 5, -LY * 5);
  innerEdge(g, dial, rgba(LIGHT.key, 0.35), 2, LX * 2, LY * 2);
  // the gold bezel inlaid round it
  g.save();
  g.lineWidth = 4.2;
  g.strokeStyle = goldRamp(g, x - r, y - r, x + r, y + r, gold);
  g.beginPath();
  g.ellipse(x, y, r + 1.5, r * 0.94 + 1.5, 0, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 1.2;
  g.strokeStyle = rgba(shade(gold, -0.5), 0.8);
  g.beginPath();
  g.ellipse(x, y, r - 9, r * 0.94 - 9, 0, 0, Math.PI * 2);
  g.stroke();
  g.restore();
  // the hours: Roman numerals at the quarters, gold studs between, minute ticks round the rim
  g.save();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    if (i % 5 === 0) continue;
    const cx = x + Math.sin(a) * (r - 4.5);
    const cy = y - Math.cos(a) * (r - 4.5) * 0.94;
    g.fillStyle = rgba(gold, 0.7);
    g.beginPath();
    g.arc(cx, cy, 0.9, 0, Math.PI * 2);
    g.fill();
  }
  g.font = 'bold 12px Georgia, "Times New Roman", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const roman = ['XII', 'III', 'VI', 'IX'];
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2;
    const rr = r - 16;
    const cx = x + Math.sin(a) * rr;
    const cy = y - Math.cos(a) * rr * 0.94;
    if (h % 3 === 0) {
      const t = roman[h / 3];
      // engraved: dark under-cut, then the gold
      g.fillStyle = rgba('#05060e', 0.7);
      g.fillText(t, cx + 1, cy + 1.2);
      g.fillStyle = goldRamp(g, cx - 8, cy - 6, cx + 8, cy + 6, gold);
      g.fillText(t, cx, cy);
    } else raised(g, ell(cx, cy, 2.6, 2.6), rad(g, cx - 0.8, cy - 0.8, 0.2, cx, cy, 3, [
      [0, '#fff8d8'],
      [0.5, gold],
      [1, shade(gold, -0.5)],
    ]), 0.5, 1.2);
  }
  g.restore();
  if (hands) {
    clockHand(g, x, y, -Math.PI / 3, r * 0.5, 4, gold);
    clockHand(g, x, y, Math.PI / 3, r * 0.76, 3, gold);
  }
  // the arbor
  raised(g, ell(x, y, 4, 4), rad(g, x - 1, y - 1, 0.3, x, y, 4.5, [
    [0, '#fff8d8'],
    [0.5, gold],
    [1, shade(gold, -0.6)],
  ]), 0.5, 1.2);
}

function drawKronos(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const stone = art.skin;
  const gold = art.secondary ?? '#d9c27a';
  const look = kronosLook(art);
  if (o.heat) {
    const f = bareFoot(ctx, look, p);
    const g = f.sil.g;
    for (const pts of KRONOS_CRACKS) softStroke(g, line(pts), rgba('#ffd27a', 0.95), 5, 2.5);
    g.strokeStyle = rgba('#ffb040', 0.7);
    g.lineWidth = 3;
    kronosDialPath()(g);
    g.stroke();
    heatLayer(f.sil, f.box, { seed: 901, y0: 268, y1: 0, patch: 0.65 });
    return;
  }
  if (o.emissive) {
    // the gold of the dial and the sand in the glass glow faintly, like a lamp behind the hour
    const f = bareFoot(ctx, look, p);
    const g = f.sil.g;
    const { x, y, r } = KRONOS_DIAL;
    g.save();
    g.lineWidth = 5;
    g.strokeStyle = rgba(gold, 0.55);
    g.beginPath();
    g.ellipse(x, y, r + 1.5, r * 0.94 + 1.5, 0, 0, Math.PI * 2);
    g.stroke();
    g.restore();
    for (let h = 0; h < 12; h++) {
      const a = (h / 12) * Math.PI * 2;
      glowDot(g, x + Math.sin(a) * (r - 16), y - Math.cos(a) * (r - 16) * 0.94, h % 3 ? 5 : 9, gold, 0.6);
    }
    glowDot(g, KRONOS_GLASS.x, KRONOS_GLASS.y + 16, 18, '#ffcf6a', 0.55);
    glowDot(g, KRONOS_GLASS.x, KRONOS_GLASS.y - 10, 12, '#ffcf6a', 0.4);
    softStroke(g, line(KRONOS_KINTSUGI), rgba(gold, 0.6), 4, 2);
    glowFinish(f.sil);
    return;
  }
  if (!o.live) drawHarpe(ctx, HARPE_BOX);
  const f = paintBare(ctx, look, p);
  const g = f.sil.g;
  const box = f.box;
  // stone, not skin: cast pitting and veined grain, grime in the hollows, pale lichen
  texture(g, 'cast', box, 0.42, 1.4);
  texture(g, 'stone', box, 0.22, 2.2);
  blotches(g, box, shade(stone, -0.45), 0.22, 26, 0.5, 0.25, 903);
  blotches(g, box, '#c4c8a0', 0.2, 6, 0.67, 0.05, 905);
  blotches(g, box, '#e8ecf4', 0.12, 14, 0.62, 0.2, 907);
  const r = rng(hashStr('kronos-stone'));
  // rain streaks down from the ankle, chisel marks
  for (let i = 0; i < 12; i++) {
    const x = CX - 80 + r() * 160;
    softStroke(g, (c) => {
      c.moveTo(x, 4 + r() * 40);
      c.lineTo(x + (r() - 0.5) * 6, 90 + r() * 80);
    }, rgba('#10121c', 0.1), 3 + r() * 4, 2);
  }
  for (let i = 0; i < 22; i++) {
    const x = CX - 90 + r() * 180;
    const y = 8 + r() * 200;
    crease(g, (c) => {
      c.moveTo(x, y);
      c.lineTo(x + 6, y + 2.5);
    }, 1.1, '#10121c', 0.22, 0.22);
  }
  // cracks, and one mended in gold
  for (const pts of KRONOS_CRACKS) crease(g, line(pts), 2.6, '#05060a', 0.85, 0.4);
  crease(g, line(KRONOS_KINTSUGI), 3.6, '#05060a', 0.6, 0.2);
  g.save();
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.strokeStyle = goldRamp(g, CX - 30, 128, CX - 8, 176, gold);
  g.lineWidth = 2.4;
  g.beginPath();
  line(KRONOS_KINTSUGI)(g);
  g.stroke();
  g.restore();
  // stone toes: a carved band across each knuckle, a chipped corner on the big toe
  for (const t of f.toes) {
    crease(g, (c) => {
      c.moveTo(t.cx - t.rx * 0.6, t.cy - t.ry * 0.1);
      c.quadraticCurveTo(t.cx, t.cy + t.ry * 0.08, t.cx + t.rx * 0.6, t.cy - t.ry * 0.1);
    }, 1.6, '#08090f', 0.45, 0.3);
    spec(g, t.cx - t.rx * 0.3, t.cy + t.ry * 0.25, t.rx * 0.4, t.ry * 0.25, 0.18, -0.8, LIGHT.key);
  }
  const big = f.toes[4];
  crease(g, line([[big.cx + big.rx * 0.2, big.cy + big.ry * 0.85], [big.cx + big.rx * 0.55, big.cy + big.ry * 0.5], [big.cx + big.rx * 0.9, big.cy + big.ry * 0.45]]), 1.8, '#05060a', 0.7, 0.4);
  // the dial, the strap and the hourglass
  paintKronosDial(g, stone, gold, !o.live);
  const strap = wrapPath(26, 13, 64, 8);
  panel(g, strap, { x: CX - 64, y: 24, w: 128, h: 26 }, 'leather', '#4a2e1a', { shadow: 0.55 });
  for (const sx of [-1, 1]) {
    const rx = CX + sx * 44;
    rivet(g, rx, 32.5 + 6 * (1 - (sx * 44) ** 2 / 64 ** 2), 2.6, '#c9a24a');
  }
  hourglass(g, KRONOS_GLASS.x, KRONOS_GLASS.y, KRONOS_GLASS.s, !o.live, '#ffcf6a', gold);
  lightAll(f.sil, 0.4, 22, 0.5);
  bareOutline(f, mix(inkOf(stone), '#0a0c1a', 0.4));
}

registerStyle('kronos', {
  contactY: 266,
  halfWidth: 106,
  rig: { from: 140, to: 162 },
  leg: { kind: 'skin', hw: 52, join: 'blend', fade: 24 },
  parts: {
    harpe: { box: HARPE_BOX, frames: 1, pivot: [KRONOS_HARPE.x, KRONOS_HARPE.y - 2], draw: (g) => drawHarpe(g, HARPE_BOX) },
  },
  draw(ctx, art, p, o) {
    drawKronos(ctx, art, p, o);
  },
});

// ════════════════════════════ ATLAS ════════════════════════════

export const ATLAS_SPHERE = { x: CX + 4, y: 132, r: 38 };
/** The loose end of the linen wrap (a live part: it swings). */
export const ATLAS_TAIL = { x: CX - 58, y: 54 };

const atlasLook = (art: FootArt): BareLook => ({ skin: art.skin, toe: 1.1, ball: 1.05, toeLen: 0.96, w: 8, ankle: 54, pores: 0.24, detail: 1.6 });

/** Stars of the sphere (design space), with their sizes. */
export const ATLAS_STARS: [number, number, number][] = (() => {
  const r = rng(hashStr('atlas-stars'));
  const out: [number, number, number][] = [];
  const { x, y, r: R } = ATLAS_SPHERE;
  while (out.length < 16) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * (R - 5);
    out.push([x + Math.cos(a) * d, y + Math.sin(a) * d, r() < 0.2 ? 2.4 : 1 + r() * 0.8]);
  }
  return out;
})();

function paintSphere(g: Ctx, gold: string): void {
  const { x, y, r } = ATLAS_SPHERE;
  const disc = ell(x, y, r, r);
  // the night sky inlaid in the skin: deep lapis, a nebula, a dome of light from the top left
  contact(g, (c) => {
    disc(c);
    c.fill();
  }, 0.4, 2, 3);
  fill(g, disc, rad(g, x - r * 0.35, y - r * 0.4, 2, x, y, r * 1.05, [
    [0, '#3a5aa8'],
    [0.55, '#1a2a62'],
    [1, '#0a1030'],
  ]));
  clip(g, disc, () => {
    softFill(g, ell(x + 10, y + 8, 22, 12, -0.5), rgba('#8a5ad8', 0.35), 6);
    softFill(g, ell(x - 12, y - 4, 16, 9, 0.6), rgba('#3ad8d0', 0.22), 5);
    texture(g, 'speckle', { x: x - r, y: y - r, w: r * 2, h: r * 2 }, 0.18, 1);
    for (const [sx, sy, s] of ATLAS_STARS) {
      glowDot(g, sx, sy, s * 3.2, '#fff2b0', 0.6);
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(sx, sy, s * 0.6, 0, Math.PI * 2);
      g.fill();
    }
    // a constellation joined in gold leaf (the Bull, for the act's sake)
    g.strokeStyle = rgba(gold, 0.6);
    g.lineWidth = 0.9;
    g.beginPath();
    line(ATLAS_STARS.slice(0, 5).map(([a, b]) => [a, b]))(g);
    g.stroke();
  });
  // the armillary rings: meridian, equator and the tilted ecliptic band with its ticks
  g.save();
  g.lineCap = 'round';
  const ring = (rx: number, ry: number, rot: number, w: number, a: number) => {
    g.lineWidth = w + 1.6;
    g.strokeStyle = rgba('#1a0c04', 0.45);
    g.beginPath();
    g.ellipse(x + 0.8, y + 1.2, rx, ry, rot, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = w;
    g.strokeStyle = goldRamp(g, x - r, y - r, x + r, y + r, gold);
    g.globalAlpha = a;
    g.beginPath();
    g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;
  };
  ring(r * 0.36, r, 0, 1.6, 0.9);
  ring(r, r * 0.3, 0, 1.6, 0.9);
  ring(r * 0.98, r * 0.42, -0.42, 3.4, 1);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const ex = Math.cos(a) * r * 0.98;
    const ey = Math.sin(a) * r * 0.42;
    const c = Math.cos(-0.42);
    const s = Math.sin(-0.42);
    g.fillStyle = rgba('#3a1c04', 0.7);
    g.beginPath();
    g.arc(x + ex * c - ey * s, y + ex * s + ey * c, 0.8, 0, Math.PI * 2);
    g.fill();
  }
  // the outer ring, thick, lit
  g.lineWidth = 4.2;
  g.strokeStyle = goldRamp(g, x - r, y - r, x + r, y + r, gold);
  g.beginPath();
  g.arc(x, y, r + 1, 0, Math.PI * 2);
  g.stroke();
  g.restore();
  spec(g, x - r * 0.4, y - r * 0.45, r * 0.38, r * 0.2, 0.35, -0.7);
  glint(g, x - r * 0.62, y - r * 0.62, 4, 0.9);
}

function tailPath(): PathFn {
  const { x, y } = ATLAS_TAIL;
  return (c) => {
    c.beginPath();
    c.moveTo(x + 4, y - 9);
    c.bezierCurveTo(x - 12, y + 4, x - 22, y + 28, x - 20, y + 58);
    // a frayed end
    c.lineTo(x - 15, y + 52);
    c.lineTo(x - 12, y + 60);
    c.lineTo(x - 8, y + 50);
    c.lineTo(x - 4, y + 56);
    c.bezierCurveTo(x - 6, y + 30, x + 2, y + 10, x + 10, y + 4);
    c.closePath();
  };
}

function paintLinen(g: Ctx, path: PathFn, box: { x: number; y: number; w: number; h: number }, cloth: string, seed: number): void {
  panel(g, path, box, 'canvas', cloth, { shadow: 0.6 });
  clip(g, path, () => {
    const r = rng(seed);
    // folds where the wrap is pulled tight
    for (let i = 0; i < 4; i++) {
      const x = box.x + 10 + r() * (box.w - 20);
      softStroke(g, (c) => {
        c.moveTo(x, box.y);
        c.quadraticCurveTo(x + 4, box.y + box.h / 2, x - 2, box.y + box.h);
      }, rgba('#000818', 0.22), 3, 2.2);
      softStroke(g, (c) => {
        c.moveTo(x - 3, box.y);
        c.quadraticCurveTo(x + 1, box.y + box.h / 2, x - 5, box.y + box.h);
      }, rgba(LIGHT.key, 0.18), 2, 1.5);
    }
    blotches(g, box, shade(cloth, -0.5), 0.25, 8, 0.6, 0.2, seed);
  });
}

const TAIL_BOX = { x: ATLAS_TAIL.x - 30, y: ATLAS_TAIL.y - 16, w: 48, h: 84 };

function drawTail(g: Ctx, cloth: string): void {
  const s = new Sil(g, [tailPath()], TAIL_BOX);
  paintLinen(s.g, tailPath(), TAIL_BOX, cloth, 1301);
  s.edge(rgba('#06060e', 0.3), 6, LX * 4, LY * 4);
  s.edge(rgba(LIGHT.rim, 0.5), 2, LX * 2, LY * 2);
  s.finish(inkOf(cloth));
}

const ATLAS_WRAPS: [number, number, number, number][] = [
  // top y, height, bow, tilt
  [6, 18, 10, 8],
  [30, 18, 10, -9],
  [54, 17, 9, 7],
];

function drawAtlas(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const skin = art.skin;
  const cloth = art.primary ?? '#3a6a8a';
  const gold = art.secondary ?? '#d9a441';
  const look = atlasLook(art);
  if (o.heat) {
    const f = bareFoot(ctx, look, p);
    heatLayer(f.sil, f.box, { seed: 931, y0: 268, y1: 10 });
    return;
  }
  if (o.emissive) {
    const f = bareFoot(ctx, look, p);
    const g = f.sil.g;
    for (const [sx, sy, s] of ATLAS_STARS) glowDot(g, sx, sy, s * 5, '#fff2b0', 0.85);
    glowDot(g, ATLAS_SPHERE.x, ATLAS_SPHERE.y, ATLAS_SPHERE.r * 0.9, '#4a6ad8', 0.3);
    glowFinish(f.sil);
    return;
  }
  const f = paintBare(ctx, look, p);
  const g = f.sil.g;
  const box = f.box;
  // a weathered, sun-dark Titan's skin: warmer in the hollows, a bronze sheen on the lit planes
  blotches(g, box, shade(skin, -0.3), 0.16, 22, 0.52, 0.3, 933);
  spec(g, CX - 40, 90, 50, 80, 0.18, -0.4, '#ffd8a0');
  // straining: the extensor tendons stand out like cables, veins bulge across the arch
  for (const [x0, x1] of [[CX - 34, CX - 62], [CX - 8, CX - 22], [CX + 18, CX + 22], [CX + 42, CX + 70]] as const) {
    const tendon = (c: Ctx) => {
      c.moveTo(x0, 12);
      c.quadraticCurveTo((x0 + x1) / 2 + 3, 110, x1, 190);
    };
    softStroke(g, tendon, rgba(LIGHT.key, 0.3), 6, 2.6);
    g.save();
    g.translate(5, 3);
    softStroke(g, tendon, rgba(mix(shade(skin, -0.5), '#6a1a0a', 0.3), 0.3), 5, 3);
    g.restore();
  }
  const vein = (pts: [number, number][], w: number) => {
    const d = (c: Ctx) => {
      c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i + 2 < pts.length + 1; i += 3) c.bezierCurveTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], pts[i + 2][0], pts[i + 2][1]);
    };
    softStroke(g, d, rgba(mix(skin, '#3a4a9a', 0.55), 0.4), w, 1.2);
    g.save();
    g.translate(-0.8, -1);
    softStroke(g, d, rgba(LIGHT.key, 0.28), w * 0.4, 0.6);
    g.restore();
  };
  vein([[CX + 56, 70], [CX + 40, 100], [CX + 66, 120], [CX + 48, 170]], 3.6);
  vein([[CX + 48, 104], [CX + 30, 112], [CX + 26, 96], [CX + 12, 96]], 2.6);
  vein([[CX - 50, 84], [CX - 66, 120], [CX - 44, 140], [CX - 70, 176]], 3);
  // the sky on his instep
  paintSphere(g, gold);
  // sweat beading on the hot skin
  const r = rng(hashStr('atlas-sweat'));
  for (let i = 0; i < 16; i++) {
    const x = CX - 80 + r() * 160;
    const y = 80 + r() * 120;
    if (Math.hypot(x - ATLAS_SPHERE.x, y - ATLAS_SPHERE.y) < ATLAS_SPHERE.r + 6) continue;
    const s = 1.6 + r() * 2.2;
    contact(g, (c) => {
      c.beginPath();
      c.ellipse(x, y, s, s * 1.25, 0, 0, Math.PI * 2);
      c.fill();
    }, 0.25, 1, 1.4);
    fill(g, ell(x, y, s, s * 1.25), rgba(mix(skin, '#ffffff', 0.3), 0.5));
    glint(g, x - s * 0.35, y - s * 0.4, s * 0.7, 0.95);
  }
  // blue linen bound round the ankle, crossing over, and a gold band under it with a Greek key
  ATLAS_WRAPS.forEach(([y0, h, bow, tilt], i) => {
    const path = wrapPath(y0, h, 70, bow, tilt);
    paintLinen(g, path, { x: CX - 70, y: y0 - 10, w: 140, h: h + 22 }, cloth, 1311 + i);
  });
  const band = wrapPath(80, 12, 74, 9);
  contact(g, (c) => {
    band(c);
    c.fill();
  }, 0.55, 2.4, 3);
  fill(g, band, lin(g, 0, 80, 0, 101, [
    [0, mix(gold, '#fffbe0', 0.55)],
    [0.35, gold],
    [0.7, shade(gold, -0.4)],
    [1, shade(gold, 0.05)],
  ]));
  clip(g, band, () => {
    texture(g, 'brushed', { x: CX - 74, y: 78, w: 148, h: 26 }, 0.15, 1);
    // the Greek key, stamped in
    g.save();
    g.lineWidth = 1.3;
    g.strokeStyle = rgba(shade(gold, -0.65), 0.8);
    for (let k = -6; k <= 5; k++) {
      const x = CX + k * 12;
      const y = 84 + 9 * (1 - (k * 12) ** 2 / 74 ** 2);
      g.beginPath();
      g.moveTo(x, y + 6);
      g.lineTo(x, y);
      g.lineTo(x + 8, y);
      g.lineTo(x + 8, y + 4);
      g.lineTo(x + 4, y + 4);
      g.lineTo(x + 4, y + 2);
      g.stroke();
    }
    g.restore();
  });
  glint(g, CX - 46, 86, 4.5, 0.9);
  if (!o.live) drawTail(g, cloth);
  lightAll(f.sil, 0.38, 20, 0.5);
  bareOutline(f);
}

registerStyle('atlas', {
  contactY: 268,
  halfWidth: 106,
  rig: { from: 150, to: 170 },
  leg: { kind: 'skin', hw: 54, join: 'blend', fade: 24 },
  parts: {
    tail: { box: TAIL_BOX, frames: 1, pivot: [ATLAS_TAIL.x + 4, ATLAS_TAIL.y - 4], draw: (g, art) => drawTail(g, art.primary ?? '#3a6a8a') },
  },
  draw(ctx, art, p, o) {
    drawAtlas(ctx, art, p, o);
  },
});

// ════════════════════════════ HYPERION ════════════════════════════

export const HYPERION_SUN = { x: CX, y: 116 };

const hyperionLook = (art: FootArt): BareLook => ({ skin: mix(art.skin, art.primary ?? '#e8742a', 0.25), nails: art.secondary ?? '#fff2a8', toe: 1.05, ball: 1.03, w: 4, pores: 0, detail: 0.3, shadowTint: '#c02a00' });

/** A ring of flame rays round (x, y): n rays from r0 out to about r1, alternating long and short, `rot` turned. */
export function corona(g: Ctx, x: number, y: number, r0: number, r1: number, n: number, rot: number, fire: string, white: string, a = 1): void {
  // a soft halo first
  g.fillStyle = rad(g, x, y, r0 * 0.6, x, y, r1 * 1.05, [
    [0, rgba(white, 0.55 * a)],
    [0.45, rgba('#ffb030', 0.3 * a)],
    [1, rgba(fire, 0)],
  ]);
  g.beginPath();
  g.arc(x, y, r1 * 1.05, 0, Math.PI * 2);
  g.fill();
  for (let i = 0; i < n; i++) {
    const ang = rot + (i / n) * Math.PI * 2;
    const L = r0 + (r1 - r0) * (i % 2 ? 0.7 : 1) * (0.9 + 0.1 * Math.sin(i * 2.3));
    const w = (i % 2 ? 0.11 : 0.15) * Math.PI;
    const wob = Math.sin(i * 1.7) * 0.18;
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    const ray: PathFn = (c) => {
      c.beginPath();
      c.moveTo(Math.cos(-w / 2) * r0, Math.sin(-w / 2) * r0);
      c.quadraticCurveTo(L * 0.75, Math.sin(-w / 4) * r0 * 0.6 + wob * L * 0.3, L, wob * L * 0.35);
      c.quadraticCurveTo(L * 0.75, Math.sin(w / 4) * r0 * 0.6 + wob * L * 0.3, Math.cos(w / 2) * r0, Math.sin(w / 2) * r0);
      c.closePath();
    };
    fill(g, ray, lin(g, r0, 0, L, 0, [
      [0, rgba(white, 0.95 * a)],
      [0.45, rgba('#ffc43a', 0.85 * a)],
      [1, rgba(fire, 0.1 * a)],
    ]));
    // a hot core line up each ray
    g.strokeStyle = rgba('#ffffff', 0.4 * a);
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(r0, 0);
    g.quadraticCurveTo(L * 0.6, wob * L * 0.15, L * 0.85, wob * L * 0.3);
    g.stroke();
    g.restore();
  }
}

function drawHyperion(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const fire = art.primary ?? '#e8742a';
  const white = art.secondary ?? '#fff2a8';
  const look = hyperionLook(art);
  const { x: sx, y: sy } = HYPERION_SUN;
  if (o.heat) {
    // he can't get hotter: the overheat turns him white, from the sole up
    const f = bareFoot(ctx, look, p);
    heatLayer(f.sil, f.box, { seed: 951, y0: 268, y1: 0, hot: '#ffffff', mid: '#fff2a8', deep: '#ff7a1a', patch: 0.5 });
    return;
  }
  if (o.emissive) {
    const f = bareFoot(ctx, look, p);
    const g = f.sil.g;
    g.fillStyle = rad(g, sx, sy, 6, sx, sy, 120, [
      [0, rgba('#ffffff', 0.9)],
      [0.35, rgba(white, 0.55)],
      [0.75, rgba('#ffb030', 0.2)],
      [1, rgba(fire, 0)],
    ]);
    g.fillRect(f.box.x, f.box.y, f.box.w, f.box.h);
    f.sil.edge(rgba('#ffd060', 0.9), 8, 0, 0);
    for (const t of f.toes) glowDot(g, t.cx, t.cy + t.ry * 0.3, t.rx * 0.8, white, 0.5);
    glowFinish(f.sil);
    return;
  }
  if (!o.live) corona(ctx, sx, sy + 6, 78, 150, 20, 0.1, fire, white);
  const f = paintBare(ctx, look, p);
  const g = f.sil.g;
  const box = f.box;
  // the sun's surface: boiling granules, darker lanes between them, a hot white core bleeding out to orange edges
  // deeper, redder towards the limb (the sun darkens at its edge), fine granules all over
  f.sil.edge(rgba('#ff5a0a', 0.9), 34, 0, 0);
  f.sil.edge(rgba('#d02000', 0.55), 9, LX * 3, LY * 3);
  blotches(g, box, '#fff6d0', 0.16, 4, 0.62, 0.12, 953);
  // plasma filaments streaming down over the instep
  const fr = rng(hashStr('hyperion-plasma'));
  for (let i = 0; i < 9; i++) {
    const x0 = CX - 70 + fr() * 140;
    const d = (c: Ctx) => {
      c.moveTo(x0, 10 + fr() * 30);
      c.bezierCurveTo(x0 + (fr() - 0.5) * 50, 80, x0 + (fr() - 0.5) * 60, 140, x0 + (x0 - CX) * 0.3, 190 + fr() * 20);
    };
    softStroke(g, d, rgba('#fff2c0', 0.35), 2.5 + fr() * 2, 1.5);
  }
  g.save();
  g.globalCompositeOperation = 'screen';
  g.fillStyle = rad(g, sx, sy, 4, sx, sy, 130, [
    [0, rgba('#ffffff', 0.95)],
    [0.3, rgba(white, 0.6)],
    [0.7, rgba('#ffb030', 0.15)],
    [1, rgba(fire, 0)],
  ]);
  g.fillRect(box.x, box.y, box.w, box.h);
  g.restore();
  // a sunspot, and the darker limb of the sun round the edges
  softFill(g, ell(CX + 60, 172, 9, 6, 0.3), rgba('#7a1a00', 0.55), 2.5);
  softFill(g, ell(CX + 60, 172, 4, 3, 0.3), rgba('#3a0800', 0.6), 1.2);
  // the sun sigil, engraved: a disc and eight rays, with a hot inlay
  g.save();
  g.lineCap = 'round';
  const sig = (c: Ctx) => {
    c.moveTo(sx + 24, sy);
    c.arc(sx, sy, 24, 0, Math.PI * 2);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      c.moveTo(sx + Math.cos(a) * 31, sy + Math.sin(a) * 31);
      c.lineTo(sx + Math.cos(a) * (i % 2 ? 40 : 46), sy + Math.sin(a) * (i % 2 ? 40 : 46));
    }
  };
  crease(g, sig, 3, shade(fire, -0.55), 0.7, 0.5);
  g.restore();
  glowDot(g, sx, sy, 12, '#ffffff', 0.8);
  // licks of flame climbing the ankle, painted into the light
  for (const [x, h, lean] of [[CX - 46, 46, -8], [CX - 16, 58, -3], [CX + 18, 60, 4], [CX + 48, 44, 9]] as const) {
    const fl: PathFn = (c) => {
      c.beginPath();
      c.moveTo(x - 12, 60);
      c.quadraticCurveTo(x - 10, 60 - h * 0.6, x + lean, 60 - h);
      c.quadraticCurveTo(x + 10, 60 - h * 0.45, x + 12, 60);
      c.closePath();
    };
    softFill(g, fl, lin(g, 0, 60, 0, 60 - h, [
      [0, rgba(fire, 0)],
      [0.4, rgba('#ff9a2a', 0.55)],
      [1, rgba(white, 0.85)],
    ]), 2);
  }
  // molten toes: each a hotter bead with a white tip
  for (const t of f.toes) spec(g, t.cx - t.rx * 0.2, t.cy + t.ry * 0.25, t.rx * 0.6, t.ry * 0.4, 0.5, -0.8, '#ffffff');
  lightAll(f.sil, 0.2, 18, 0.35);
  bareOutline(f, '#8a1e00');
}

registerStyle('hyperion', {
  contactY: 266,
  halfWidth: 106,
  rig: { from: 140, to: 162 },
  leg: { kind: 'basalt', hw: 52, join: 'blend', fade: 26 },
  draw(ctx, art, p, o) {
    drawHyperion(ctx, art, p, o);
  },
});

// ════════════════════════════ THE MINOTAUR ════════════════════════════

/** The bull's eyes (design space): the lids are a live part that blinks and looks. */
export const MINO_EYES = [
  { x: CX - 36, y: 108 },
  { x: CX + 36, y: 108 },
];
/** The nostrils, where he snorts. */
export const MINO_NOSTRILS: [number, number][] = [
  [CX - 22, 158],
  [CX + 22, 158],
];
/** The nose ring's pivot (through the septum): a live part, it swings. */
export const MINO_RING = { x: CX, y: 164 };

const minoBody: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 60, -6);
  c.bezierCurveTo(CX - 62, 50, CX - 100, 96, CX - 104, 150);
  c.bezierCurveTo(CX - 106, 180, CX - 98, 200, CX - 80, 208);
  c.quadraticCurveTo(CX, 218, CX + 80, 208);
  c.bezierCurveTo(CX + 98, 200, CX + 106, 180, CX + 104, 150);
  c.bezierCurveTo(CX + 100, 96, CX + 62, 50, CX + 60, -6);
  c.closePath();
};

interface Hoof {
  s: number;
  rot: number;
  dy: number;
}

function minoHooves(p: Pose): Hoof[] {
  const c = Math.max(0, p.curl);
  const sp = Math.max(0, -p.curl);
  return [-1, 1].map((s, i) => ({ s, rot: s * (0.07 * sp - 0.05 * c) + (p.wiggle[i * 2 + 1] ?? 0) * 0.03 * s, dy: -6 * c + (p.wiggle[i * 2 + 1] ?? 0) * 2.5 }));
}

function hoofPath(h: Hoof): PathFn {
  const { s, rot, dy } = h;
  return (c) => {
    c.save();
    c.translate(CX + s * 44, 200 + dy);
    c.rotate(rot);
    c.translate(-(CX + s * 44), -200);
    c.beginPath();
    c.moveTo(CX + s * 4, 196);
    c.bezierCurveTo(CX + s * 1, 230, CX + s * 3, 258, CX + s * 14, 276);
    c.bezierCurveTo(CX + s * 24, 285, CX + s * 66, 283, CX + s * 86, 266);
    c.bezierCurveTo(CX + s * 98, 246, CX + s * 92, 214, CX + s * 78, 196);
    c.closePath();
    c.restore();
  };
}

function paintHoof(g: Ctx, h: Hoof, horn: string): void {
  const { s, rot, dy } = h;
  const path = hoofPath(h);
  clip(g, path, () => {
    g.save();
    g.translate(CX + s * 44, 200 + dy);
    g.rotate(rot);
    g.translate(-(CX + s * 44), -200);
    const x0 = CX + s * 4;
    const x1 = CX + s * 100;
    // glossy black keratin, a horn-coloured streak down the outer wall, lit from the top left
    g.fillStyle = lin(g, Math.min(x0, x1), 180, Math.max(x0, x1), 280, [
      [0, '#9a8a7c'],
      [0.3, '#62524a'],
      [0.7, '#3a2e2a'],
      [1, '#1c1414'],
    ]);
    g.fillRect(CX - 110, 176, 220, 112);
    softFill(g, ell(CX + s * 80, 226, 10, 40, s * -0.1), rgba(mix(horn, '#6a5040', 0.5), 0.35), 5);
    // growth rings round the wall
    for (let i = 0; i < 6; i++) {
      const y = 196 + i * 13;
      crease(g, (c) => {
        c.moveTo(CX + s * 4, y + 6);
        c.quadraticCurveTo(CX + s * 52, y - 2 + i, CX + s * 104, y + 4 - i * 2);
      }, 1.2, '#000000', 0.5, 0.22);
    }
    texture(g, 'cast', { x: CX - 110, y: 176, w: 220, h: 112 }, 0.2, 1.2);
    // the glossy shine: a long streak on the lit wall, a hot spot near the toe
    streak(g, (c) => {
      c.moveTo(CX + s * (s < 0 ? 84 : 30), 196);
      c.quadraticCurveTo(CX + s * (s < 0 ? 92 : 24), 230, CX + s * (s < 0 ? 84 : 26), 262);
    }, 3.5, s < 0 ? 0.5 : 0.28);
    spec(g, CX + s * (s < 0 ? 70 : 36), 214, 16, 7, s < 0 ? 0.45 : 0.22, -1.2);
    // the worn sole edge: lighter, scuffed
    g.fillStyle = lin(g, 0, 262, 0, 282, [
      [0, rgba('#8a7a70', 0)],
      [1, rgba('#8a7a70', 0.45)],
    ]);
    g.fillRect(CX - 110, 262, 220, 22);
    g.restore();
  });
  lobe(g, path, { x: CX + (s < 0 ? -110 : 0), y: 176, w: 110, h: 112 }, 200, 214, '#000000', 0.7, 12, 0.25);
}

/** The fringe of shaggy fur spilling over the hooves (in the silhouette). */
function minoFringe(): { path: PathFn }[] {
  const r = rng(hashStr('mino-fringe'));
  const out: { path: PathFn }[] = [];
  for (let i = 0; i <= 17; i++) {
    const t = i / 17;
    const x = CX - 92 + t * 184;
    const y = 200 + Math.sin(t * Math.PI) * 10;
    const ang = Math.PI / 2 + (t - 0.5) * 0.7 + (r() - 0.5) * 0.3;
    out.push({ path: tuftPath(x, y - 6 + r() * 6, ang, 22 + r() * 20, 16 + r() * 8, (t - 0.5) * 0.6 + (r() - 0.5) * 0.5) });
  }
  return out;
}
const MINO_FRINGE = minoFringe();

function hornPath(s: number): PathFn {
  // a ribbon from the root on the side of the ankle, sweeping out and up to a point
  const pts: [number, number][] = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const u = 1 - t;
    // cubic bezier: root, out, up, tip
    const P = [
      [CX + s * 46, 70],
      [CX + s * 110, 78],
      [CX + s * 148, 48],
      [CX + s * 136, 2],
    ];
    const x = u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0];
    const y = u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1];
    pts.push([x, y]);
  }
  const w = (t: number) => 18 * (1 - t) ** 0.8 + 1.5;
  return (c) => {
    const L: [number, number][] = [];
    const R: [number, number][] = [];
    pts.forEach(([x, y], j) => {
      const [nx, ny] = pts[Math.min(j + 1, pts.length - 1)];
      const [qx, qy] = pts[Math.max(j - 1, 0)];
      const d = Math.hypot(nx - qx, ny - qy) || 1;
      const ww = w(j / (pts.length - 1));
      L.push([x + (-(ny - qy) / d) * ww, y + ((nx - qx) / d) * ww]);
      R.push([x - (-(ny - qy) / d) * ww, y - ((nx - qx) / d) * ww]);
    });
    c.beginPath();
    L.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y)));
    for (let j = R.length - 1; j >= 0; j--) c.lineTo(R[j][0], R[j][1]);
    c.closePath();
  };
}

function paintHorn(g: Ctx, s: number, horn: string): void {
  const path = hornPath(s);
  clip(g, path, () => {
    // dark and ridged at the root, pale polished ivory at the tip
    g.fillStyle = lin(g, CX + s * 46, 72, CX + s * 136, 0, [
      [0, '#2a1c12'],
      [0.3, shade(horn, -0.45)],
      [0.65, shade(horn, -0.08)],
      [1, mix(horn, '#ffffff', 0.4)],
    ]);
    g.fillRect(CX - 160, -10, 320, 100);
    texture(g, 'grain', { x: CX - 160, y: -10, w: 320, h: 100 }, 0.3, 1);
    // growth ridges round the horn
    for (let i = 0; i < 7; i++) {
      const t = 0.08 + i * 0.075;
      const x = CX + s * (46 + t * 120);
      const y = 72 - t * 40;
      crease(g, (c) => {
        c.moveTo(x - s * 8, y - 14);
        c.quadraticCurveTo(x + s * 2, y, x + s * 6, y + 14);
      }, 1.6, '#140a04', 0.5 - i * 0.05, 0.3);
    }
    // the lit upper edge, the shaded underside
    streak(g, (c) => {
      c.moveTo(CX + s * 70, 62);
      c.bezierCurveTo(CX + s * 110, 60, CX + s * 134, 40, CX + s * 132, 10);
    }, 2.2, s < 0 ? 0.6 : 0.35);
  });
  innerEdge(g, path, rgba('#0a0604', 0.5), 6, LX * 4, LY * 4);
}

function minoEyesBox() {
  return { x: CX - 58, y: 92, w: 116, h: 34 };
}

/** One frame of the eyes: frame 0 open, frame n-1 shut. */
function paintMinoEyes(g: Ctx, fur: string, frame: number, n: number): void {
  const k = frame / Math.max(1, n - 1);
  for (const [i, e] of MINO_EYES.entries()) {
    const s = i === 0 ? -1 : 1;
    const eye = ell(e.x, e.y, 11, 8, s * 0.15);
    // the socket
    softFill(g, ell(e.x, e.y + 1, 15, 11, s * 0.15), rgba('#0a0402', 0.55), 2.5);
    fill(g, eye, rad(g, e.x - 3, e.y - 3, 1, e.x, e.y, 12, [
      [0, '#fff0d0'],
      [0.7, '#e8b890'],
      [1, '#8a4a30'],
    ]));
    clip(g, eye, () => {
      // a hot red iris looking inwards and down, a black slot pupil
      fill(g, ell(e.x - s * 2, e.y + 0.5, 6, 6.5), rad(g, e.x - s * 2 - 1, e.y - 1, 0.5, e.x - s * 2, e.y, 6.5, [
        [0, '#ff8a5a'],
        [0.55, '#e0181e'],
        [1, '#5a0408'],
      ]));
      fill(g, ell(e.x - s * 2, e.y + 0.5, 3.6, 2, 0), '#0a0204');
      spec(g, e.x - 4, e.y - 3, 3, 2, 0.95, -0.5);
      glint(g, e.x - 3.5, e.y - 3, 2.2, 1);
      // the lid comes down from above
      if (k > 0) {
        const lidY = e.y - 9 + k * 18;
        g.fillStyle = lin(g, 0, e.y - 10, 0, lidY, [
          [0, shade(fur, -0.2)],
          [1, shade(fur, 0.1)],
        ]);
        g.fillRect(e.x - 14, e.y - 12, 28, lidY - (e.y - 12));
        g.strokeStyle = rgba('#0a0402', 0.8);
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(e.x - 12, lidY);
        g.lineTo(e.x + 12, lidY);
        g.stroke();
      }
    });
    g.strokeStyle = rgba('#0a0402', 0.9);
    g.lineWidth = 1.8;
    eye(g);
    g.stroke();
  }
}

function minoRingPath(): PathFn {
  const { x, y } = MINO_RING;
  return (c) => {
    c.beginPath();
    c.ellipse(x, y + 20, 21, 18, 0, 0, Math.PI * 2);
    c.moveTo(x + 15, y + 20);
    c.ellipse(x, y + 20, 15, 12, 0, 0, Math.PI * 2, true);
  };
}

const RING_BOX = { x: MINO_RING.x - 28, y: MINO_RING.y - 4, w: 56, h: 50 };

function drawMinoRing(g: Ctx, gold: string): void {
  const s = new Sil(g, [minoRingPath()], RING_BOX);
  const { x, y } = MINO_RING;
  s.fillParts(rad(s.g, x - 10, y + 8, 2, x, y + 20, 24, [
    [0, mix(gold, '#fffbe0', 0.6)],
    [0.35, gold],
    [0.7, shade(gold, -0.45)],
    [1, shade(gold, -0.2)],
  ]));
  texture(s.g, 'cast', RING_BOX, 0.25, 1);
  s.edge(rgba('#1a0a00', 0.55), 4, LX * 3, LY * 3);
  s.edge(rgba('#fff4c0', 0.5), 2, -LX * 1.5, -LY * 1.5);
  glint(s.g, x - 14, y + 10, 4, 0.95);
  s.finish(inkOf(gold));
}

function drawMinotaur(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const fur = art.skin;
  const dark = art.primary ?? '#4a2a1a';
  const gold = art.secondary ?? '#d9a441';
  const horn = (art.extra?.horn as string) ?? '#efe2c4';
  const hooves = minoHooves(p);
  const box = { x: CX - 160, y: -8, w: 320, h: 300 };
  const sil = new Sil(ctx, [hornPath(-1), hornPath(1), minoBody, ...hooves.map(hoofPath), ...MINO_FRINGE.map((t) => t.path)], box);
  const g = sil.g;
  if (o.heat) {
    heatLayer(sil, box, { seed: 971, y0: 284, y1: 10, patch: 0.6 });
    return;
  }
  if (o.emissive) {
    for (const e of MINO_EYES) glowDot(g, e.x, e.y, 22, '#ff2a1a', 0.75);
    glowFinish(sil);
    return;
  }
  sil.form({ base: fur, shadowTint: '#1a0806', ramp: 0.7, form: 0.55, formSize: 26, bevel: 0.2, rim: 0.5 });
  // the cloven hooves first: the coat and its fringe hang over them
  for (const h of hooves) paintHoof(g, h, horn);
  // the shaggy coat: dark at the top where it runs into the leg, coarse strands flowing down and out
  clip(g, minoBody, () => {
    g.fillStyle = lin(g, 0, -6, 0, 200, [
      [0, dark],
      [0.35, fur],
      [1, shade(fur, -0.15)],
    ]);
    g.fillRect(CX - 110, -8, 220, 210);
    furCoat(g, rng(hashStr('mino-coat')), { x: CX - 108, y: -8, w: 216, h: 206 }, (x) => Math.PI / 2 + (x - CX) * 0.004, fur, shade(dark, -0.4), { n: 1.1, len: 15 });
    // the bull's face: a tan, short-haired muzzle at the front, the brow bulging above the eyes
    softFill(g, ell(CX, 158, 58, 40), rgba(mix(fur, '#c89068', 0.55), 0.85), 10);
    furCoat(g, rng(hashStr('mino-muzzle')), { x: CX - 56, y: 122, w: 112, h: 74 }, (x) => Math.PI / 2 + (x - CX) * 0.01, mix(fur, '#b88058', 0.5), shade(fur, -0.3), { n: 0.25, len: 7 });
    spec(g, CX - 16, 140, 26, 12, 0.2, -0.3, LIGHT.key);
    // the wet nose: a leathery dark pad with flared nostrils
    const nose: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 42, 150);
      c.bezierCurveTo(CX - 40, 136, CX + 40, 136, CX + 42, 150);
      c.bezierCurveTo(CX + 44, 172, CX + 20, 180, CX, 176);
      c.bezierCurveTo(CX - 20, 180, CX - 44, 172, CX - 42, 150);
      c.closePath();
    };
    raised(g, nose, lin(g, CX - 40, 138, CX + 30, 178, [
      [0, '#6a4a44'],
      [0.5, '#3a2624'],
      [1, '#1a0e0e'],
    ]), 0.5, 2.5);
    clip(g, nose, () => texture(g, 'leather', { x: CX - 44, y: 134, w: 88, h: 46 }, 0.5, 0.9));
    for (const [nx, ny] of MINO_NOSTRILS) {
      const s = nx < CX ? -1 : 1;
      fill(g, ell(nx, ny, 9, 6, s * 0.5), rad(g, nx, ny + 1, 0.5, nx, ny, 9, [
        [0, '#000000'],
        [0.7, '#0a0404'],
        [1, '#2a1614'],
      ]));
      streak(g, (c) => {
        c.moveTo(nx - s * 2 - 7, ny - 8);
        c.quadraticCurveTo(nx - 2, ny - 10, nx + s * 6, ny - 6);
      }, 1.4, 0.55);
    }
    spec(g, CX - 18, 146, 12, 5, 0.7, -0.2);
    glint(g, CX - 22, 145, 3.5, 0.9);
    // the heavy brow, angry, a frown furrow between the eyes
    for (const [i, e] of MINO_EYES.entries()) {
      const s = i === 0 ? -1 : 1;
      const brow: PathFn = (c) => {
        c.beginPath();
        c.moveTo(e.x + s * 24, e.y - 20);
        c.quadraticCurveTo(e.x, e.y - 22, e.x - s * 20, e.y - 4);
        c.quadraticCurveTo(e.x - s * 4, e.y - 12, e.x + s * 22, e.y - 12);
        c.closePath();
      };
      raised(g, brow, lin(g, 0, e.y - 22, 0, e.y - 4, [
        [0, shade(fur, 0.15)],
        [1, shade(dark, -0.3)],
      ]), 0.6, 3);
      softFill(g, ell(e.x, e.y + 12, 16, 5), rgba('#0a0402', 0.3), 3);
    }
    crease(g, (c) => {
      c.moveTo(CX - 4, 98);
      c.quadraticCurveTo(CX, 110, CX + 4, 98);
    }, 2.2, '#0a0402', 0.6, 0.25);
    if (!o.live) paintMinoEyes(g, fur, 0, 4);
    // a few scars from the maze's walls
    crease(g, line([[CX + 62, 60], [CX + 74, 76], [CX + 70, 92]]), 1.8, '#1a0806', 0.6, 0.35);
  });
  // the cloven hooves under the fur, their own glossy keratin, and the dark cleft between them
  // the fringe throws a soft shadow onto the hooves under it
  for (const h of hooves)
    clip(g, hoofPath(h), () => {
      for (const t of MINO_FRINGE)
        contact(g, (c) => {
          t.path(c);
          c.fill();
        }, 0.4, 3, 5);
    });
  for (const t of MINO_FRINGE)
    clip(g, t.path, () => {
      // melts into the coat above: transparent where the tufts root in the body
      g.fillStyle = lin(g, 0, 200, 0, 240, [
        [0, rgba(shade(fur, -0.15), 0)],
        [0.3, rgba(shade(fur, -0.15), 1)],
        [1, shade(fur, -0.32)],
      ]);
      g.fillRect(CX - 120, 180, 240, 70);
      furCoat(g, rng(hashStr('mino-fringe-coat2')), { x: CX - 110, y: 208, w: 220, h: 40 }, () => Math.PI / 2, fur, shade(dark, -0.4), { n: 0.25, len: 14 });
    });
  // the horns
  for (const s of [-1, 1]) {
    contact(g, (c) => {
      hornPath(s)(c);
      c.fill();
    }, 0.5, 3, 4);
    paintHorn(g, s, horn);
  }
  // the collar: bronze, gold-studded, a labrys on the front
  const collar = wrapPath(16, 26, 66, 8);
  panel(g, collar, { x: CX - 66, y: 14, w: 132, h: 40 }, 'enamel', shade(gold, -0.35), { shadow: 0.6 });
  clip(g, collar, () => {
    g.fillStyle = lin(g, 0, 16, 0, 50, [
      [0, rgba('#fff4c0', 0.35)],
      [0.3, rgba('#fff4c0', 0)],
      [0.8, rgba('#000000', 0.2)],
      [1, rgba('#000000', 0.35)],
    ]);
    g.fillRect(CX - 70, 10, 140, 44);
    texture(g, 'cast', { x: CX - 70, y: 10, w: 140, h: 44 }, 0.3, 1.2);
  });
  for (let i = 0; i < 7; i++) {
    const dx = -54 + i * 18;
    if (i === 3) continue;
    rivet(g, CX + dx, 29 + 8 * (1 - (dx / 66) ** 2), 4, shade(gold, 0.15));
  }
  // the labrys: a double axe in gold
  const lab: PathFn = (c) => {
    c.beginPath();
    c.rect(CX - 1.6, 18, 3.2, 26);
    for (const s of [-1, 1]) {
      c.moveTo(CX + s * 2, 24);
      c.quadraticCurveTo(CX + s * 12, 18, CX + s * 14, 22);
      c.quadraticCurveTo(CX + s * 10, 31, CX + s * 14, 40);
      c.quadraticCurveTo(CX + s * 12, 44, CX + s * 2, 38);
      c.closePath();
    }
  };
  raised(g, lab, goldRamp(g, CX - 14, 18, CX + 14, 44, gold), 0.55, 1.6);
  glint(g, CX - 8, 24, 3.5, 0.95);
  if (!o.live) drawMinoRing(g, gold);
  lightAll(sil, 0.42, 22, 0.5);
  sil.finish(inkOf(dark), { openTop: -5, inner: 0.35 });
}

registerStyle('minotaur', {
  contactY: 278,
  halfWidth: 112,
  rig: { from: 196, to: 214 },
  leg: { kind: 'fur', hw: 58, join: 'blend', fade: 26 },
  parts: {
    eyes: {
      box: minoEyesBox(),
      frames: 4,
      draw: (g, art, i) => {
        paintMinoEyes(g, art.skin, i, 4);
      },
    },
    ring: { box: RING_BOX, frames: 1, pivot: [MINO_RING.x, MINO_RING.y + 2], draw: (g, art) => drawMinoRing(g, art.secondary ?? '#d9a441') },
  },
  draw(ctx, art, p, o) {
    drawMinotaur(ctx, art, p, o);
  },
});
