// Bosses in the style kit (batch C), part 2: the later bosses (src/content/feet/bosses.ts).
// - COSMIC CROC: a foam clog printed with a galaxy, its holes glowing cyan, jibbitz (planet, star, moon), a neon
//   foam sole and two heel boosters strapped to its sides. In play the boosters burn, flaring before it dives.
// - NONNA'S SLIPPER: a hand-knitted slipper in crimson and gold chevrons, a ribbed cuff, a fluffy pompom and a
//   fringe, with the dreaded wooden spoon tucked in its cuff (in play the spoon wags).
// - THE GARGOYLE: carved, weathered stone with moss in its cracks, four stone toes with black claws and folded stone
//   wings (in play the wings flex, grit and pebbles crumble off it, and overheated its cracks glow).
// - KRAKEN TOES: a purple cephalopod foot that splits into five curling tentacles lined with suckers, barnacles on
//   it and kelp trailing from it. In play the tentacles writhe, water drips and bubbles rise.
// - QUEEN OF THE RINK: a pink glitter high-top roller skate with a gold crown round its cuff, lightning-bolt
//   decals and neon wheels that glow; in play it sparkles and the wheels pulse.
// - THE YETI SKI BOOT: a red ski-boot shell with chrome buckles on a huge white-furred foot, snow caked on it and a
//   ski under it. In play snow sifts off it, the fur tufts sway and landings throw powder.

import type { FootArt } from '../../data/feet';
import { CX } from '../../art/feetCommon';
import { LIGHT, type PathFn, type Pose, ao, crease, glint, inkOf, softFill, softStroke, spec, texture, vnoise } from '../../art/style/kit';
import { Sil, lobe } from '../../art/style/sil';
import { type PartDef, registerStyle } from '../../art/style/registry';
import { blotches, clawPath, contact, eyelet, laceRun, paintClaw, rivet, stitches } from '../../art/style/details';
import { LX, LY, clip, fill, furCoat, glowDot, glowFinish, goldRamp, heatLayer, lightAll, lin, rad, streak } from '../../art/style/kit-bosses';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';

type Opts = { live: boolean; emissive?: boolean; heat?: boolean };

const ell = (x: number, y: number, rx: number, ry: number, rot = 0): PathFn => (c) => {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
};

/** Shadow under a detail, then fill it. */
function raised(g: Ctx, path: PathFn, f: string | CanvasGradient, a = 0.45): void {
  contact(g, (c) => {
    path(c);
    c.fill();
  }, a);
  fill(g, path, f);
}

// ════════════════════════════ COSMIC CROC ════════════════════════════

const crocBody = (flex: number): PathFn => (c) => {
  const b = 264 - flex * 6;
  c.beginPath();
  c.moveTo(CX - 74, 4);
  c.bezierCurveTo(CX - 80, 40, CX - 116, 66, CX - 116, 140);
  c.bezierCurveTo(CX - 116, 222, CX - 80, b, CX, b);
  c.bezierCurveTo(CX + 80, b, CX + 118, 222, CX + 118, 140);
  c.bezierCurveTo(CX + 118, 66, CX + 82, 40, CX + 76, 4);
  c.closePath();
};

/** The foam sole: shows as a thick band under the dome. */
const crocSole = (flex: number): PathFn => (c) => {
  const b = 284 - flex * 6;
  c.beginPath();
  c.moveTo(CX - 118, 170);
  c.bezierCurveTo(CX - 122, 240, CX - 84, b, CX, b);
  c.bezierCurveTo(CX + 84, b, CX + 124, 240, CX + 120, 170);
  c.closePath();
};

/** The boosters strapped to each side: nozzle mouths (flames come out of these, pointing up). */
export const CROC_NOZZLES: [number, number][] = [
  [CX - 112, 40],
  [CX + 112, 40],
];

const booster = (s: number): PathFn => (c) => {
  const x = CX + s * 112;
  c.beginPath();
  c.moveTo(x - 13, 50);
  c.lineTo(x - 15, 38);
  c.lineTo(x + 15, 38);
  c.lineTo(x + 13, 50);
  c.lineTo(x + 15, 132);
  c.quadraticCurveTo(x, 158, x - 15, 132);
  c.closePath();
  // fins
  c.moveTo(x - 14, 106);
  c.lineTo(x - 26, 140);
  c.lineTo(x - 12, 132);
  c.closePath();
  c.moveTo(x + 14, 106);
  c.lineTo(x + 26, 140);
  c.lineTo(x + 12, 132);
  c.closePath();
};

const CROC_HOLES: [number, number][] = [];
/** The holes (for sparkles in play). */
export const CROC_HOLES_LIVE = CROC_HOLES;
for (let row = 0; row < 3; row++) for (let i = 0; i < 6 - (row === 2 ? 1 : 0); i++) CROC_HOLES.push([CX - 75 + i * 30 + (row === 2 ? 15 : 0), 150 + row * 30 + (Math.abs(i - 2.5) < 1 ? 4 : 0)]);

function drawCroc(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const navy = art.primary ?? '#2b3d8f';
  const cyan = art.secondary ?? '#7df9ff';
  const flex = Math.max(0, p.curl);
  const body = crocBody(flex);
  const sole = crocSole(flex);
  const box = { x: CX - 140, y: -8, w: 280, h: 296 };
  const sil = new Sil(ctx, [booster(-1), booster(1), sole, body], box);
  const g = sil.g;
  const holes = CROC_HOLES.map(([x, y]) => [x, y + (y > 180 ? -flex * 5 : 0)] as const);
  if (o.emissive) {
    for (const [x, y] of holes) glowDot(g, x, y, 13, cyan, 0.9);
    softStroke(g, (c) => {
      c.moveTo(CX - 112, 236 - flex * 6);
      c.bezierCurveTo(CX - 84, 278 - flex * 6, CX + 84, 278 - flex * 6, CX + 114, 236 - flex * 6);
    }, rgba(cyan, 0.95), 5, 2);
    for (const [x, y] of CROC_NOZZLES) glowDot(g, x, y + 4, 16, '#ffb040', 0.9);
    glowFinish(sil);
    return;
  }
  if (o.heat) {
    heatLayer(sil, box, { seed: 61, y0: 285, y1: 10 });
    return;
  }
  // galaxy foam: deep navy, nebula clouds, stars
  sil.form({ base: navy, shadowTint: '#06082a', ramp: 0.8, form: 0.6, formSize: 30, bevel: 0.3, rim: 0.6 });
  // the foam sole: a lighter band with the neon strip
  clip(g, sole, () => {
    g.fillStyle = lin(g, 0, 240, 0, 284, [
      [0, '#e9eef8'],
      [0.55, '#b8c4dc'],
      [1, '#5a6480'],
    ]);
    g.fillRect(box.x, 200, box.w, 90);
    texture(g, 'rubber', box, 0.35);
    softStroke(g, (c) => {
      c.moveTo(CX - 112, 236 - flex * 6);
      c.bezierCurveTo(CX - 84, 278 - flex * 6, CX + 84, 278 - flex * 6, CX + 114, 236 - flex * 6);
    }, rgba(cyan, 0.9), 4, 1);
  });
  contact(g, (c) => {
    body(c);
    c.fill();
  }, 0.6, 3, 5);
  clip(g, body, () => {
    g.fillStyle = navy;
    g.fillRect(box.x, box.y, box.w, box.h);
  });
  lobe(g, body, box, -40, -20, '#02031a', 0.7, 26, 0.3);
  clip(g, body, () => {
    const r = rng(hashStr('croc-stars'));
    for (const [x, y, rr, col] of [[CX - 40, 60, 60, '#b04aff'], [CX + 50, 120, 70, '#ff4aa8'], [CX - 20, 200, 60, '#2ac8ff'], [CX + 70, 40, 40, '#4a6aff']] as const)
      softFill(g, ell(x, y, rr, rr * 0.6, 0.4), rgba(col, 0.32), 18);
    blotches(g, box, '#0a0a2a', 0.45, 18, 0.5, 0.25, 63);
    for (let i = 0; i < 130; i++) {
      const x = CX - 115 + r() * 230;
      const y = r() * 260;
      const s = r() < 0.08 ? 1.8 : 0.6 + r() * 0.6;
      g.fillStyle = rgba(r() < 0.2 ? '#bfe8ff' : '#ffffff', 0.5 + r() * 0.5);
      g.beginPath();
      g.arc(x, y, s, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 6; i++) glint(g, CX - 100 + r() * 200, 20 + r() * 220, 3 + r() * 2, 0.8);
    texture(g, 'rubber', box, 0.25);
    // a broad soft sheen on the foam dome
    spec(g, CX - 40, 150, 70, 34, 0.18, -0.4);
    // the rim of the opening, rolled foam
    g.fillStyle = lin(g, 0, 0, 0, 30, [
      [0, rgba('#000000', 0.55)],
      [0.4, rgba(shade(navy, 0.5), 0.3)],
      [1, rgba('#000000', 0)],
    ]);
    g.fillRect(box.x, 0, box.w, 30);
  });
  // the holes: dark wells with a glow at the bottom
  for (const [x, y] of holes) {
    softFill(g, ell(x + 1, y + 2, 10, 8), rgba(shade(navy, 0.5), 0.5), 1.5);
    fill(g, ell(x, y, 8.5, 6.5), rad(g, x, y + 2, 0.5, x, y, 9, [
      [0, mix(cyan, '#ffffff', 0.5)],
      [0.4, cyan],
      [1, '#0a1a3a'],
    ]));
    g.strokeStyle = rgba('#000010', 0.6);
    g.lineWidth = 1.6;
    g.beginPath();
    g.ellipse(x, y - 0.5, 8.5, 6.5, 0, Math.PI, Math.PI * 2);
    g.stroke();
  }
  // the heel strap and its hinge rivets
  const strap: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 96, 92);
    c.quadraticCurveTo(CX, 40, CX + 96, 92);
    c.lineTo(CX + 92, 108);
    c.quadraticCurveTo(CX, 58, CX - 92, 108);
    c.closePath();
  };
  raised(g, strap, lin(g, CX - 90, 50, CX + 90, 110, [
    [0, mix(navy, '#ffffff', 0.35)],
    [0.5, shade(navy, 0.1)],
    [1, shade(navy, -0.5)],
  ]), 0.55);
  stitches(g, (c) => {
    c.moveTo(CX - 90, 96);
    c.quadraticCurveTo(CX, 50, CX + 90, 96);
  }, rgba(cyan, 0.7), 1.4, 4, 3);
  rivet(g, CX - 94, 100, 6, '#d8e0ec');
  rivet(g, CX + 94, 100, 6, '#d8e0ec');
  // jibbitz: a ringed planet, a star, a moon
  const jib = (x: number, y: number) => {
    raised(g, ell(x, y, 15, 15), rad(g, x - 5, y - 5, 1, x, y, 16, [
      [0, '#ffffff'],
      [1, '#a8b0c8'],
    ]), 0.55);
  };
  jib(CX - 46, 34);
  fill(g, ell(CX - 46, 34, 7.5, 7.5), rad(g, CX - 49, 31, 0.5, CX - 46, 34, 8, [
    [0, '#ffb0e0'],
    [1, '#b03a8a'],
  ]));
  g.strokeStyle = '#ffcf3a';
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(CX - 46, 34, 12, 3.5, -0.4, 0, Math.PI * 2);
  g.stroke();
  jib(CX, 26);
  fill(g, (c) => {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      const rr = i % 2 ? 4 : 10;
      if (i) c.lineTo(CX + Math.cos(a) * rr, 26 + Math.sin(a) * rr);
      else c.moveTo(CX + Math.cos(a) * rr, 26 + Math.sin(a) * rr);
    }
    c.closePath();
  }, goldRamp(g, CX - 10, 16, CX + 10, 36, '#ffcf3a'));
  jib(CX + 46, 34);
  fill(g, (c) => {
    c.beginPath();
    c.arc(CX + 46, 34, 9, 0, Math.PI * 2);
    c.arc(CX + 50, 31, 7.5, 0, Math.PI * 2, true);
  }, '#f2d86a');
  for (const x of [CX - 46, CX, CX + 46]) glint(g, x - 6, x === CX ? 20 : 28, 3, 0.9);
  // the boosters: white enamel, red fins, a chrome nozzle
  for (const s of [-1, 1]) {
    const bp = booster(s);
    const x = CX + s * 112;
    contact(g, (c) => {
      bp(c);
      c.fill();
    }, 0.55, 3, 4);
    clip(g, bp, () => {
      g.fillStyle = lin(g, x - 15, 0, x + 15, 0, [
        [0, '#c8d0dc'],
        [0.3, '#ffffff'],
        [0.7, '#b8c0cc'],
        [1, '#6a7280'],
      ]);
      g.fillRect(x - 30, 36, 60, 130);
      g.fillStyle = lin(g, x - 26, 0, x + 26, 0, [
        [0, '#ff6a5a'],
        [0.5, '#e8402f'],
        [1, '#8a1a10'],
      ]);
      g.fillRect(x - 30, 104, 60, 60);
      g.fillStyle = lin(g, x - 15, 0, x + 15, 0, [
        [0, '#6a707c'],
        [0.35, '#f0f4f8'],
        [1, '#2a2e36'],
      ]);
      g.fillRect(x - 16, 36, 32, 15);
      g.fillStyle = rgba(cyan, 0.9);
      g.beginPath();
      g.arc(x, 76, 5.5, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#2a2e36';
      g.lineWidth = 2;
      g.stroke();
      spec(g, x - 6, 86, 4, 20, 0.6, 0);
    });
    g.fillStyle = '#100808';
    g.beginPath();
    g.ellipse(x, 40, 12, 3.5, 0, 0, Math.PI * 2);
    g.fill();
  }
  lightAll(sil, 0.42, 20, 0.6);
  sil.finish(inkOf(navy), { openTop: -2 });
  if (!o.live)
    for (const [x, y] of CROC_NOZZLES) {
      // still art: the boosters burning
      const fl: PathFn = (c) => {
        c.beginPath();
        c.moveTo(x - 11, y);
        c.quadraticCurveTo(x - 12, y - 18, x, y - 40);
        c.quadraticCurveTo(x + 12, y - 18, x + 11, y);
        c.closePath();
      };
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      fill(ctx, fl, lin(ctx, 0, y, 0, y - 40, [
        [0, rgba('#fff6c0', 0.95)],
        [0.4, rgba('#ffb040', 0.85)],
        [1, rgba('#ff4a10', 0)],
      ]));
      ctx.restore();
    }
}

registerStyle('cosmiccroc', {
  contactY: 280,
  halfWidth: 116,
  rig: { from: 186, to: 206 },
  leg: { kind: 'wool', hw: 70, join: 'hem' },
  draw(ctx, art, p, o) {
    drawCroc(ctx, art, p, o);
  },
});

// ════════════════════════════ NONNA'S SLIPPER ════════════════════════════

export const SPOON = { x: CX - 70, y: 18 };

const nonnaBody = (flex: number): PathFn => (c) => {
  const b = 264 - flex * 6;
  c.beginPath();
  c.moveTo(CX - 72, 10);
  c.bezierCurveTo(CX - 80, 60, CX - 114, 100, CX - 114, 170);
  c.bezierCurveTo(CX - 114, b - 26, CX - 66, b, CX, b);
  c.bezierCurveTo(CX + 66, b, CX + 114, b - 26, CX + 114, 170);
  c.bezierCurveTo(CX + 114, 100, CX + 80, 60, CX + 72, 10);
  c.closePath();
};

/** The yarn fringe round the slipper's edge: short tassels standing out of the outline. */
function nonnaFringe(flex: number): PathFn {
  return (c) => {
    c.beginPath();
    const r = rng(hashStr('nonna-fringe'));
    const b = 264 - flex * 6;
    for (let i = 0; i <= 46; i++) {
      const t = i / 46;
      const a = Math.PI * (1.05 - t * 1.1);
      const x = CX + Math.cos(a) * 116;
      const y = 170 + Math.sin(a) * (b - 170) + 2;
      const nx = Math.cos(a);
      const ny = Math.sin(a);
      const len = 8 + r() * 6;
      c.moveTo(x - ny * 2.4, y + nx * 2.4);
      c.lineTo(x + nx * len - ny * 1.2, y + ny * len + nx * 1.2);
      c.lineTo(x + nx * len + ny * 1.2, y + ny * len - nx * 1.2);
      c.lineTo(x + ny * 2.4, y - nx * 2.4);
      c.closePath();
    }
  };
}

const nonnaCuff: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 80, -6);
  c.lineTo(CX + 80, -6);
  c.quadraticCurveTo(CX + 86, 14, CX + 80, 32);
  c.quadraticCurveTo(CX, 42, CX - 80, 32);
  c.quadraticCurveTo(CX - 86, 14, CX - 80, -6);
  c.closePath();
};

const POM = { x: CX + 8, y: 186, r: 30 };
const pomPath: PathFn = (c) => {
  c.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const rr = POM.r * (i % 2 ? 0.88 : 1.02) * (0.94 + vnoise(i * 0.9, 5) * 0.12);
    const x = POM.x + Math.cos(a) * rr;
    const y = POM.y + Math.sin(a) * rr;
    if (i) c.lineTo(x, y);
    else c.moveTo(x, y);
  }
  c.closePath();
};

const spoonPath: PathFn = (c) => {
  // handle up behind the cuff, bowl out to the lower left
  const { x, y } = SPOON;
  c.beginPath();
  c.moveTo(x + 40, y - 22);
  c.lineTo(x + 46, y - 16);
  c.lineTo(x - 8, y + 50);
  c.lineTo(x - 14, y + 45);
  c.closePath();
  c.ellipse(x - 26, y + 66, 17, 26, 0.7, 0, Math.PI * 2);
};

function paintSpoon(g: Ctx): void {
  const { x, y } = SPOON;
  clip(g, spoonPath, () => {
    g.fillStyle = lin(g, x - 40, y + 40, x + 40, y + 10, [
      [0, '#e0a868'],
      [0.4, '#b87a40'],
      [1, '#6a4020'],
    ]);
    g.fillRect(x - 60, y - 30, 120, 130);
    texture(g, 'wood', { x: x - 60, y: y - 30, w: 120, h: 130 }, 0.5, 1.3);
    // the bowl's hollow, worn dark from years of use
    softFill(g, ell(x - 24, y + 70, 10, 17, 0.7), rgba('#3a1a08', 0.45), 4);
    spec(g, x - 32, y + 56, 8, 14, 0.45, 0.7);
    spec(g, x + 18, y + 6, 18, 3, 0.4, -0.85);
  });
}

function drawNonna(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const red = art.primary ?? '#c2335a';
  const gold = art.secondary ?? '#f2c14e';
  const flex = Math.max(0, p.curl);
  const body = nonnaBody(flex);
  const fringe = nonnaFringe(flex);
  const box = { x: CX - 140, y: -8, w: 280, h: 290 };
  const sil = new Sil(ctx, [fringe, body, nonnaCuff, pomPath, ...(o.live ? [] : [spoonPath])], box);
  const g = sil.g;
  if (o.heat) {
    heatLayer(sil, box, { seed: 65, y0: 280, y1: 0 });
    return;
  }
  sil.form({ base: red, shadowTint: '#3a0820', ramp: 0.7, form: 0.55, formSize: 34, bevel: 0.2, rim: 0.45 });
  // chevron stripes knitted in: gold and a pink, like the old one
  clip(g, body, () => {
    const bands: [number, string][] = [
      [70, gold],
      [100, '#f4d8e0'],
      [150, gold],
      [210, gold],
    ];
    for (const [y, col] of bands) {
      g.beginPath();
      for (let i = 0; i <= 16; i++) {
        const x = CX - 120 + i * 15;
        g.lineTo(x, y + (i % 2 ? 9 : -9));
      }
      for (let i = 16; i >= 0; i--) {
        const x = CX - 120 + i * 15;
        g.lineTo(x, y + 10 + (i % 2 ? 9 : -9));
      }
      g.closePath();
      g.fillStyle = col;
      g.fill();
    }
    // the knit: v-stitches over everything, then the light and shade of the form again
    texture(g, 'knit', box, 0.6, 1.5);
    g.fillStyle = lin(g, CX - 110, 20, CX + 110, 260, [
      [0, rgba('#fff0e0', 0.16)],
      [0.5, rgba('#000000', 0)],
      [1, rgba('#2a0418', 0.35)],
    ]);
    g.fillRect(box.x, box.y, box.w, box.h);
    // stray fibres: a fuzzy halo
    const r = rng(hashStr('nonna-fuzz'));
    g.lineCap = 'round';
    for (let i = 0; i < 260; i++) {
      const x = CX - 110 + r() * 220;
      const y = 20 + r() * 240;
      const a = r() * Math.PI * 2;
      g.strokeStyle = rgba(r() < 0.5 ? '#ffffff' : gold, 0.18);
      g.lineWidth = 0.7;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a) * 3, y + Math.sin(a + 1) * 3, x + Math.cos(a) * 6, y + Math.sin(a) * 6);
      g.stroke();
    }
  });
  // the fringe: yarn tassels, gold
  clip(g, fringe, () => {
    g.fillStyle = lin(g, 0, 160, 0, 280, [
      [0, shade(gold, 0.2)],
      [1, shade(gold, -0.4)],
    ]);
    g.fillRect(box.x, 120, box.w, 170);
    texture(g, 'grain', box, 0.4);
  });
  softStroke(g, (c) => {
    c.moveTo(CX - 114, 176);
    c.bezierCurveTo(CX - 112, 250, CX - 60, 262 - flex * 6, CX, 262 - flex * 6);
    c.bezierCurveTo(CX + 60, 262 - flex * 6, CX + 112, 250, CX + 114, 176);
  }, rgba('#2a0410', 0.4), 4, 2);
  // the ribbed cuff, rolled over
  contact(g, (c) => {
    nonnaCuff(c);
    c.fill();
  }, 0.55, 3, 5);
  clip(g, nonnaCuff, () => {
    g.fillStyle = lin(g, 0, -6, 0, 40, [
      [0, shade(gold, 0.3)],
      [0.5, gold],
      [1, shade(gold, -0.45)],
    ]);
    g.fillRect(box.x, -8, box.w, 50);
    for (let x = CX - 84; x < CX + 84; x += 7) {
      g.fillStyle = rgba('#5a3a08', 0.28);
      g.fillRect(x, -8, 2.5, 50);
      g.fillStyle = rgba('#fff8d0', 0.22);
      g.fillRect(x + 2.5, -8, 1.5, 50);
    }
    texture(g, 'knit', box, 0.35, 1.2);
    spec(g, CX - 30, 8, 40, 7, 0.3, 0);
  });
  // the pompom: a ball of fluffy white yarn
  contact(g, (c) => {
    pomPath(c);
    c.fill();
  }, 0.55, 4, 6);
  clip(g, pomPath, () => {
    g.fillStyle = rad(g, POM.x - 10, POM.y - 12, 2, POM.x, POM.y, POM.r * 1.1, [
      [0, '#ffffff'],
      [0.6, '#eceaf0'],
      [1, '#a8a0b8'],
    ]);
    g.fillRect(POM.x - POM.r - 4, POM.y - POM.r - 4, POM.r * 2 + 8, POM.r * 2 + 8);
    const r = rng(hashStr('nonna-pom'));
    g.lineCap = 'round';
    for (let i = 0; i < 240; i++) {
      const a = r() * Math.PI * 2;
      const r0 = r() * POM.r * 0.6;
      const r1 = r0 + 6 + r() * 12;
      const lit = Math.cos(a - Math.atan2(LY, LX));
      g.strokeStyle = rgba(lit > 0.2 ? '#ffffff' : r() < 0.5 ? '#c8c0d4' : '#8a8098', 0.55);
      g.lineWidth = 1 + r() * 1.2;
      g.beginPath();
      g.moveTo(POM.x + Math.cos(a) * r0, POM.y + Math.sin(a) * r0);
      g.lineTo(POM.x + Math.cos(a) * r1, POM.y + Math.sin(a) * r1);
      g.stroke();
    }
  });
  if (!o.live) paintSpoon(g);
  lightAll(sil, 0.38, 20, 0.5);
  sil.finish(inkOf(red), { openTop: -5, inner: 0.35 });
}

registerStyle('nonna', {
  contactY: 274,
  halfWidth: 116,
  rig: { from: 214, to: 232 },
  leg: { kind: 'knit', hw: 70, join: 'into' },
  parts: {
    spoon: {
      box: { x: SPOON.x - 52, y: SPOON.y - 30, w: 106, h: 130 },
      frames: 1,
      pivot: [SPOON.x + 40, SPOON.y - 18],
      draw: (g) => {
        const s = new Sil(g, [spoonPath], { x: SPOON.x - 52, y: SPOON.y - 30, w: 106, h: 130 });
        paintSpoon(s.g);
        s.edge(rgba('#000000', 0.35), 8, LX * 5, LY * 5);
        s.edge(rgba(LIGHT.rim, 0.5), 2.5, LX * 3, LY * 3);
        s.finish(inkOf('#8a5a2a'));
      },
    },
  },
  draw(ctx, art, p, o) {
    drawNonna(ctx, art, p, o);
  },
});

// ════════════════════════════ THE GARGOYLE ════════════════════════════

/** The wings: root (where they hinge on the ankle) of each side. */
export const GARG_WINGS = [
  { x: CX - 58, y: 34, s: -1 },
  { x: CX + 58, y: 34, s: 1 },
];

const wingPath = (s: number): PathFn => (c) => {
  const { x, y } = GARG_WINGS[s < 0 ? 0 : 1];
  c.beginPath();
  c.moveTo(x, y - 6);
  c.lineTo(x + s * 50, y - 30);
  c.lineTo(x + s * 96, y - 30);
  c.lineTo(x + s * 112, y - 18);
  // the scalloped trailing edge between the finger bones
  c.quadraticCurveTo(x + s * 96, y - 4, x + s * 100, y + 18);
  c.quadraticCurveTo(x + s * 80, y + 4, x + s * 72, y + 30);
  c.quadraticCurveTo(x + s * 56, y + 14, x + s * 42, y + 38);
  c.quadraticCurveTo(x + s * 28, y + 22, x + s * 4, y + 30);
  c.closePath();
};

function paintWing(g: Ctx, s: number, stone: string, dark: string): void {
  const { x, y } = GARG_WINGS[s < 0 ? 0 : 1];
  const wp = wingPath(s);
  clip(g, wp, () => {
    g.fillStyle = lin(g, x, y - 30, x + s * 110, y + 40, [
      [0, shade(mix(stone, dark, 0.5), 0.1)],
      [0.6, mix(stone, dark, 0.7)],
      [1, shade(dark, -0.35)],
    ]);
    g.fillRect(x - 130, y - 40, 260, 90);
    texture(g, 'cast', { x: x - 130, y: y - 40, w: 260, h: 90 }, 0.45, 1.4);
    // the finger bones, carved ridges fanning from the wrist
    for (const [ex, ey] of [[100, 18], [72, 30], [42, 38]] as const) {
      const bone = (c: Ctx) => {
        c.moveTo(x + s * 50, y - 26);
        c.lineTo(x + s * ex, y + ey);
      };
      softStroke(g, bone, rgba(shade(stone, 0.25), 0.95), 6, 1);
      g.save();
      g.translate(2, 2);
      softStroke(g, bone, rgba('#0a0a12', 0.5), 3, 1.5);
      g.restore();
    }
    g.fillStyle = lin(g, x, y - 30, x + s * 100, y - 18, [
      [0, shade(stone, 0.2)],
      [1, shade(stone, -0.1)],
    ]);
    g.fillRect(Math.min(x, x + s * 112), y - 32, 112, 8);
  });
}

function gargToes(p: Pose) {
  const c = Math.max(0, p.curl);
  const sp = Math.max(0, -p.curl);
  return [
    { cx: CX - 74, cy: 232, rx: 27, ry: 35, rot: 0.25 },
    { cx: CX - 26, cy: 244, rx: 29, ry: 39, rot: 0.08 },
    { cx: CX + 26, cy: 244, rx: 29, ry: 39, rot: -0.08 },
    { cx: CX + 76, cy: 232, rx: 28, ry: 36, rot: -0.25 },
  ].map((t, i) => {
    const w = p.wiggle[i + 1] ?? 0;
    return { ...t, cx: t.cx + (t.cx - CX) * 0.1 * sp, cy: t.cy - t.ry * 0.3 * c + 4 * w, ry: t.ry * (1 - 0.25 * c) };
  });
}

const gargBody: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 58, -6);
  c.bezierCurveTo(CX - 62, 50, CX - 104, 100, CX - 102, 170);
  c.bezierCurveTo(CX - 100, 206, CX - 86, 220, CX - 70, 226);
  c.lineTo(CX + 72, 226);
  c.bezierCurveTo(CX + 88, 220, CX + 102, 206, CX + 104, 170);
  c.bezierCurveTo(CX + 106, 100, CX + 62, 50, CX + 60, -6);
  c.closePath();
};

const GARG_CRACKS: [number, number][][] = [
  [[CX - 30, 20], [CX - 40, 52], [CX - 28, 80], [CX - 48, 118]],
  [[CX + 52, 70], [CX + 38, 100], [CX + 56, 132], [CX + 44, 170], [CX + 60, 200]],
  [[CX - 80, 140], [CX - 60, 160], [CX - 70, 190]],
  [[CX + 10, 150], [CX - 4, 176], [CX + 8, 204]],
];

function crackPath(pts: [number, number][]) {
  return (c: Ctx) => pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
}

function drawGargoyle(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const stone = art.skin;
  const dark = art.primary ?? '#5b5866';
  const moss = art.secondary ?? '#5f8a3a';
  const toes = gargToes(p);
  const c = Math.max(0, p.curl);
  const claws = toes.map((t, i) => {
    const x = t.cx - Math.sin(t.rot) * t.ry * 0.7;
    const y = t.cy + Math.cos(t.rot) * t.ry * 0.7;
    return { x, y, ang: Math.PI / 2 - t.rot * 1.2, len: 34 * (1 + c * 0.35), w: 17, hook: (i < 2 ? 0.25 : -0.25) * (1 + c) };
  });
  const box = { x: CX - 176, y: -8, w: 352, h: 310 };
  const wings = o.live ? [] : [wingPath(-1), wingPath(1)];
  const sil = new Sil(ctx, [...wings, gargBody, ...toes.map((t) => ell(t.cx, t.cy, t.rx, t.ry, t.rot)), ...claws.map((k) => clawPath(k.x, k.y, k.ang, k.len, k.w, k.hook))], box);
  const g = sil.g;
  if (o.heat) {
    // the cracks run molten
    for (const pts of GARG_CRACKS) softStroke(g, crackPath(pts), rgba('#ffd27a', 0.95), 5, 2.5);
    heatLayer(sil, box, { seed: 67, y0: 290, y1: 10, patch: 0.7 });
    return;
  }
  sil.form({ base: stone, shadowTint: '#141428', ramp: 0.75, form: 0.6, formSize: 32, bevel: 0.4, rim: 0.5 });
  texture(g, 'cast', box, 0.45, 1.4);
  texture(g, 'stone', box, 0.16, 2.2);
  // weathering: rain streaks, lichen, darker grime in the hollows
  blotches(g, box, shade(stone, -0.4), 0.2, 24, 0.52, 0.25, 69);
  blotches(g, box, '#c8c070', 0.18, 6, 0.66, 0.05, 71);
  const r = rng(hashStr('garg-streaks'));
  for (let i = 0; i < 14; i++) {
    const x = CX - 90 + r() * 180;
    softStroke(g, (cc) => {
      cc.moveTo(x, 10 + r() * 60);
      cc.lineTo(x + (r() - 0.5) * 6, 120 + r() * 90);
    }, rgba('#1a1a24', 0.12), 3 + r() * 4, 2);
  }
  // chisel marks: short parallel tool strokes
  for (let i = 0; i < 18; i++) {
    const x = CX - 90 + r() * 180;
    const y = 10 + r() * 170;
    crease(g, (cc) => {
      cc.moveTo(x, y);
      cc.lineTo(x + 6, y + 3);
    }, 1.2, '#14141c', 0.25, 0.25);
  }
  // carved knuckle ridges where the toes begin
  for (const t of toes) {
    clip(g, ell(t.cx, t.cy, t.rx, t.ry, t.rot), () => {
      g.fillStyle = lin(g, t.cx - t.rx, 0, t.cx + t.rx, 0, [
        [0, rgba('#ffffff', 0.18)],
        [0.5, rgba('#ffffff', 0)],
        [1, rgba('#000000', 0.3)],
      ]);
      g.fillRect(t.cx - t.rx, t.cy - t.ry, t.rx * 2, t.ry * 2);
      for (const f of [-0.2, 0.15]) crease(g, (cc) => {
        cc.moveTo(t.cx - t.rx * 0.6, t.cy + t.ry * f);
        cc.quadraticCurveTo(t.cx, t.cy + t.ry * (f + 0.15), t.cx + t.rx * 0.6, t.cy + t.ry * f);
      }, 1.8, '#101018', 0.5, 0.3);
    });
    lobe(g, ell(t.cx, t.cy, t.rx, t.ry, t.rot), { x: t.cx - t.rx - 4, y: t.cy - t.ry - 4, w: t.rx * 2 + 8, h: t.ry * 2 + 8 }, t.cy - t.ry, t.cy - t.ry * 0.5, '#06060e', 0.8, 10, 0.4);
  }
  // deep carved clefts between the toes
  for (let i = 0; i < toes.length - 1; i++) {
    const a = toes[i];
    const b2 = toes[i + 1];
    const kx = (a.cx + b2.cx) / 2;
    softStroke(g, (cc) => {
      cc.moveTo(kx, Math.max(a.cy, b2.cy) + 6);
      cc.lineTo(kx, Math.min(a.cy, b2.cy) - 40);
    }, rgba('#06060e', 0.7), 5, 2.5);
  }
  // cracks: a dark split with a lit lip, moss growing out of them
  for (const pts of GARG_CRACKS) {
    crease(g, crackPath(pts), 2.6, '#06060a', 0.85, 0.4);
    const [mx, my] = pts[Math.floor(pts.length / 2)];
    blotches(g, { x: mx - 16, y: my - 14, w: 32, h: 28 }, moss, 0.85, 5, 0.52, 0.12, mx);
    blotches(g, { x: mx - 14, y: my - 12, w: 28, h: 24 }, shade(moss, 0.4), 0.6, 3, 0.62, 0.08, my);
  }
  blotches(g, { x: CX - 100, y: 170, w: 200, h: 40 }, moss, 0.6, 7, 0.62, 0.1, 73);
  // carved scales up the ankle, like a beast's hide
  for (let row = 0; row < 3; row++)
    for (let i = -2; i <= 2; i++) {
      const x = CX + i * 20 + (row % 2) * 10;
      const y = 14 + row * 16;
      crease(g, (cc) => {
        cc.moveTo(x - 10, y);
        cc.quadraticCurveTo(x, y + 12, x + 10, y);
      }, 1.6, '#14141c', 0.4, 0.3);
    }
  for (const k of claws) paintClaw(g, k.x, k.y, k.ang, k.len, k.w, k.hook, '#5a5a66', '#06060a');
  if (!o.live) for (const s of [-1, 1]) paintWing(g, s, stone, dark);
  lightAll(sil, 0.45, 22, 0.5);
  sil.finish(inkOf(dark), { openTop: -5 });
}

function wingPart(s: number): PartDef {
  const { x, y } = GARG_WINGS[s < 0 ? 0 : 1];
  const box = { x: s < 0 ? x - 118 : x - 6, y: y - 40, w: 124, h: 84 };
  return {
    box,
    frames: 1,
    pivot: [x, y],
    draw: (g, art) => {
      const sil = new Sil(g, [wingPath(s)], box);
      paintWing(sil.g, s, art.skin, art.primary ?? '#5b5866');
      sil.edge(rgba('#06060e', 0.4), 10, LX * 6, LY * 6);
      sil.edge(rgba(LIGHT.rim, 0.5), 2.5, LX * 3, LY * 3);
      sil.finish(inkOf(art.primary ?? '#5b5866'));
    },
  };
}

registerStyle('gargoyle', {
  contactY: 290,
  halfWidth: 110,
  rig: { from: 150, to: 172 },
  leg: { kind: 'skin', hw: 58, join: 'blend', fade: 26 },
  parts: { wingL: wingPart(-1), wingR: wingPart(1) },
  draw(ctx, art, p, o) {
    drawGargoyle(ctx, art, p, o);
  },
});

// ════════════════════════════ KRAKEN TOES ════════════════════════════

interface Tent {
  pts: [number, number][];
  w: number[];
  /** Which side the suckers are on (the inside of the curl): +1 right, −1 left. */
  side: number;
}

/** The five tentacles at a pose: each a tapered curve from the bulb, curling at its tip. */
function krakenTents(p: Pose): Tent[] {
  const c = Math.max(0, p.curl);
  const sp = Math.max(0, -p.curl);
  const base: [number, number, number, number, number][] = [
    // root x, root y, start angle (π/2 = down), length, curl (+ turns right)
    [CX - 84, 172, Math.PI * 0.8, 118, 2.8],
    [CX - 44, 192, Math.PI * 0.64, 116, 2.4],
    [CX + 2, 202, Math.PI * 0.5, 108, 2.2],
    [CX + 46, 192, Math.PI * 0.36, 116, -2.4],
    [CX + 86, 172, Math.PI * 0.2, 118, -2.8],
  ];
  return base.map(([x, y, a0, L0, k], i) => {
    const w = p.wiggle[i] ?? 0;
    const L = L0 * (1 - 0.2 * c + 0.06 * sp);
    const curl = k * (1 + c * 0.7 - sp * 0.4) + w * 0.5;
    const a0b = a0 + ((x - CX) / 100) * 0.25 * sp;
    const n = 26;
    const pts: [number, number][] = [];
    const ws: number[] = [];
    let px = x;
    let py = y;
    for (let j = 0; j <= n; j++) {
      const s = j / n;
      pts.push([px, py]);
      ws.push(25 * (1 - s * 0.8) + (i === 2 ? 2 : 0));
      const a = a0b + curl * s * s * s;
      px += Math.cos(a) * (L / n);
      py += Math.sin(a) * (L / n);
    }
    return { pts, w: ws, side: k > 0 ? 1 : -1 };
  });
}

function tentPath(t: Tent): PathFn {
  return (c) => {
    const L: [number, number][] = [];
    const Rr: [number, number][] = [];
    t.pts.forEach(([x, y], j) => {
      const [nx, ny] = t.pts[Math.min(j + 1, t.pts.length - 1)];
      const [qx, qy] = t.pts[Math.max(j - 1, 0)];
      const dx = nx - qx;
      const dy = ny - qy;
      const d = Math.hypot(dx, dy) || 1;
      const ox = (-dy / d) * t.w[j];
      const oy = (dx / d) * t.w[j];
      L.push([x + ox, y + oy]);
      Rr.push([x - ox, y - oy]);
    });
    c.beginPath();
    L.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y)));
    for (let j = Rr.length - 1; j >= 0; j--) c.lineTo(Rr[j][0], Rr[j][1]);
    c.closePath();
    const [ex, ey] = t.pts[t.pts.length - 1];
    const er = t.w[t.w.length - 1];
    c.moveTo(ex + er, ey);
    c.arc(ex, ey, er, 0, Math.PI * 2);
  };
}

const krakenBody: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 58, -6);
  c.bezierCurveTo(CX - 62, 50, CX - 110, 100, CX - 108, 160);
  c.bezierCurveTo(CX - 106, 196, CX - 60, 214, CX, 214);
  c.bezierCurveTo(CX + 60, 214, CX + 108, 196, CX + 110, 160);
  c.bezierCurveTo(CX + 112, 100, CX + 62, 50, CX + 60, -6);
  c.closePath();
};

/** Kelp strands hanging off the kraken's sides (live parts: they sway). Root x, y, side. */
export const KELP: [number, number, number][] = [
  [CX - 52, 26, -1],
  [CX + 54, 30, 1],
];

/** The kelp blade's centre x, y and half width at t (0 root … 1 tip). */
const kelpAt = (i: number, t: number): [number, number, number] => {
  const [x, y, s] = KELP[i];
  const cx = x + s * (4 + Math.sin(t * 7.5) * 7 + t * 12);
  // a blade: a narrow stipe at the root, widest two thirds down, ruffled all along its edges
  const hw = (2.2 + Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.85) * 9) * (1 - t * 0.25) + Math.sin(t * 46) * 1.6 * Math.min(1, t * 4);
  return [cx, y + t * 124, Math.max(1.6, hw)];
};

const kelpPath = (i: number): PathFn => (c) => {
  const N = 40;
  c.beginPath();
  for (let j = 0; j <= N; j++) {
    const [cx, cy, hw] = kelpAt(i, j / N);
    if (j) c.lineTo(cx - hw, cy);
    else c.moveTo(cx - hw, cy);
  }
  for (let j = N; j >= 0; j--) {
    const [cx, cy, hw] = kelpAt(i, j / N);
    c.lineTo(cx + hw * (1 + Math.sin(j * 1.9) * 0.08), cy);
  }
  c.closePath();
};

function paintKelp(g: Ctx, i: number): void {
  const [x, y] = KELP[i];
  clip(g, kelpPath(i), () => {
    // olive at the stipe, through deep green, to a translucent golden tip
    g.fillStyle = lin(g, 0, y, 0, y + 124, [
      [0, '#4a5a22'],
      [0.25, '#2f7a2a'],
      [0.7, '#4f9a32'],
      [1, '#b8c04a'],
    ]);
    g.fillRect(x - 40, y - 4, 80, 132);
    // across the blade: lit on the left, shaded on the right, so it reads as a curled ribbon
    const N = 24;
    for (let j = 0; j < N; j++) {
      const [cx, cy, hw] = kelpAt(i, j / N);
      const [nx, ny, nw] = kelpAt(i, (j + 1) / N);
      const w = Math.max(hw, nw);
      g.fillStyle = lin(g, cx - w, 0, cx + w, 0, [
        [0, rgba('#e8ff9a', 0.35)],
        [0.35, rgba('#ffffff', 0.05)],
        [0.55, rgba('#000000', 0)],
        [1, rgba('#06200a', 0.55)],
      ]);
      g.beginPath();
      g.moveTo(cx - hw - 1, cy);
      g.lineTo(nx - nw - 1, ny + 0.6);
      g.lineTo(nx + nw + 1, ny + 0.6);
      g.lineTo(cx + hw + 1, cy);
      g.closePath();
      g.fill();
    }
    // the ruffles: fine ridges running from the midrib out to the wavy edge
    g.lineCap = 'round';
    for (let j = 2; j < 60; j++) {
      const [cx, cy, hw] = kelpAt(i, j / 60);
      for (const side of [-1, 1]) {
        g.strokeStyle = rgba(side < 0 ? '#d8f08a' : '#0a2a10', side < 0 ? 0.22 : 0.3);
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(cx + side * 1.2, cy);
        g.quadraticCurveTo(cx + side * hw * 0.6, cy + 1.5, cx + side * hw, cy + 3);
        g.stroke();
      }
    }
    // the midrib: a dark groove with a lit lip down the blade
    for (const [col, w, dx] of [['#1a3a10', 1.6, 0.6], ['#e8ffb0', 0.8, -0.6]] as const) {
      g.strokeStyle = rgba(col, col === '#1a3a10' ? 0.6 : 0.45);
      g.lineWidth = w;
      g.beginPath();
      for (let j = 0; j <= 30; j++) {
        const [cx, cy] = kelpAt(i, j / 30);
        if (j) g.lineTo(cx + dx, cy);
        else g.moveTo(cx + dx, cy);
      }
      g.stroke();
    }
    // a wet sheen down the lit edge
    streak(g, (cc) => {
      for (let j = 6; j <= 30; j++) {
        const [cx, cy, hw] = kelpAt(i, j / 34);
        if (j > 6) cc.lineTo(cx - hw * 0.55, cy);
        else cc.moveTo(cx - hw * 0.55, cy);
      }
    }, 1.2, 0.3);
  });
  // little air bladders where the blade meets the stipe, glossy, sitting proud of it
  for (const t of [0.1, 0.19]) {
    const [cx, cy] = kelpAt(i, t);
    fill(g, ell(cx, cy, 4, 4.8), rad(g, cx - 1.2, cy - 1.5, 0.3, cx, cy, 5, [
      [0, '#f0f8b0'],
      [0.5, '#8aa83a'],
      [1, '#3a5a1a'],
    ]));
    spec(g, cx - 1.3, cy - 1.7, 1.6, 1.1, 0.8, -0.6);
  }
}

function drawKraken(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const purple = art.skin;
  const pink = art.secondary ?? '#ffb3d1';
  const tents = krakenTents(p);
  const box = { x: CX - 160, y: -8, w: 320, h: 330 };
  const kelp = o.live ? [] : KELP.map((_, i) => kelpPath(i));
  const sil = new Sil(ctx, [krakenBody, ...tents.map(tentPath), ...kelp], box);
  const g = sil.g;
  if (o.heat) {
    heatLayer(sil, box, { seed: 75, y0: 310, y1: 0 });
    return;
  }
  const deep = mix(shade(purple, -0.6), '#0a0a30', 0.4);
  sil.form({ base: purple, shadowTint: '#140a3a', ramp: 0.85, form: 0.6, formSize: 30, bevel: 0.4, rim: 0.65 });
  texture(g, 'pores', box, 0.3, 1.2, 'soft-light');
  // mottled chromatophores and a wet sheen
  blotches(g, box, shade(purple, -0.35), 0.4, 9, 0.55, 0.12, 77);
  blotches(g, box, mix(purple, pink, 0.5), 0.3, 6, 0.62, 0.1, 79);
  spec(g, CX - 40, 70, 46, 26, 0.35, -0.5);
  // each tentacle: its own volume, pale on the underside, a row of suckers along the inside of its curl
  tents.forEach((t, i) => {
    const tp = tentPath(t);
    lobe(g, tp, box, t.pts[0][1] - 10, t.pts[0][1] + 12, deep, 0.55, 8, 0.35);
    clip(g, tp, () => {
      // the pale underside along the sucker edge
      g.save();
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.beginPath();
      t.pts.forEach(([x, y], j) => {
        const [nx, ny] = t.pts[Math.min(j + 1, t.pts.length - 1)];
        const [qx, qy] = t.pts[Math.max(j - 1, 0)];
        const d = Math.hypot(nx - qx, ny - qy) || 1;
        const ox = ((-(ny - qy)) / d) * t.w[j] * 0.85 * -t.side;
        const oy = ((nx - qx) / d) * t.w[j] * 0.85 * -t.side;
        if (j) g.lineTo(x + ox, y + oy);
        else g.moveTo(x + ox, y + oy);
      });
      g.strokeStyle = rgba(mix(pink, '#ffffff', 0.2), 0.75);
      g.lineWidth = 9;
      g.stroke();
      g.restore();
    });
    for (let j = 3; j < t.pts.length - 2; j += 2) {
      const [x, y] = t.pts[j];
      const [nx, ny] = t.pts[j + 1];
      const [qx, qy] = t.pts[j - 1];
      const d = Math.hypot(nx - qx, ny - qy) || 1;
      const off = t.w[j] * 0.62 * -t.side;
      const sx = x + ((-(ny - qy)) / d) * off;
      const sy = y + ((nx - qx) / d) * off;
      const sr = Math.max(2, t.w[j] * 0.28);
      fill(g, ell(sx, sy, sr, sr), rad(g, sx - sr * 0.3, sy - sr * 0.3, 0.3, sx, sy, sr, [
        [0, mix(pink, '#ffffff', 0.5)],
        [0.6, pink],
        [1, shade(pink, -0.4)],
      ]));
      fill(g, ell(sx + 0.4, sy + 0.4, sr * 0.45, sr * 0.45), shade(pink, -0.55));
    }
    // a wet highlight along each tentacle's lit side
    streak(g, (cc) => {
      t.pts.slice(1, -4).forEach(([x, y], j) => (j ? cc.lineTo(x - t.w[j + 1] * 0.45, y - 2) : cc.moveTo(x - t.w[j + 1] * 0.45, y - 2)));
    }, 1.6, 0.35);
    void i;
  });
  // barnacles stuck to the foot
  for (const [x, y, s] of [[CX + 40, 100, 1], [CX + 56, 118, 0.7], [CX - 60, 150, 0.85]] as const) {
    // a barnacle: a ridged volcano of shell plates with a slit at the top
    raised(g, ell(x, y, 10 * s, 8 * s), rad(g, x - 3, y - 3, 0.5, x, y, 11 * s, [
      [0, '#e8e0cc'],
      [0.7, '#a89c88'],
      [1, '#5a5244'],
    ]), 0.55);
    g.strokeStyle = rgba('#4a4234', 0.6);
    g.lineWidth = 1;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      g.beginPath();
      g.moveTo(x + Math.cos(a) * 4 * s, y + Math.sin(a) * 3 * s);
      g.lineTo(x + Math.cos(a) * 9.5 * s, y + Math.sin(a) * 7.5 * s);
      g.stroke();
    }
    fill(g, ell(x, y, 4 * s, 1.4 * s, 0.3), '#2a2420');
  }
  if (!o.live) KELP.forEach((_, i) => paintKelp(g, i));
  lightAll(sil, 0.4, 20, 0.6);
  sil.finish(inkOf(purple), { openTop: -5 });
}

registerStyle('kraken', {
  contactY: 300,
  halfWidth: 128,
  rig: { from: 156, to: 176 },
  leg: { kind: 'skin', hw: 58, join: 'blend', fade: 26 },
  parts: Object.fromEntries(
    KELP.map(([x, y, s], i) => {
      const box = { x: x - 34, y: y - 4, w: 68, h: 136 };
      return [
        `kelp${i}`,
        {
          box,
          frames: 1,
          pivot: [x, y + 2],
          draw: (g: Ctx) => {
            const sil = new Sil(g, [kelpPath(i)], box);
            paintKelp(sil.g, i);
            sil.finish('#0a2a10', { inner: 0.3, w: 3 });
            void s;
          },
        } as PartDef,
      ];
    }),
  ),
  draw(ctx, art, p, o) {
    drawKraken(ctx, art, p, o);
  },
});

// ════════════════════════════ QUEEN OF THE RINK ════════════════════════════

const rinkBoot: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 66, 14);
  c.bezierCurveTo(CX - 70, 70, CX - 104, 120, CX - 104, 190);
  c.bezierCurveTo(CX - 104, 236, CX - 70, 252, CX, 252);
  c.bezierCurveTo(CX + 70, 252, CX + 106, 236, CX + 106, 190);
  c.bezierCurveTo(CX + 106, 120, CX + 70, 70, CX + 66, 14);
  c.closePath();
};

const rinkPlate: PathFn = (c) => {
  c.beginPath();
  c.roundRect(CX - 96, 244, 192, 16, 6);
};

/** Wheels (x, y, colour key) and the toe stop. */
export const RINK_WHEELS: [number, number, 0 | 1][] = [
  [CX - 70, 282, 0],
  [CX + 70, 282, 1],
];
const wheelPath = ([x, y]: [number, number, number]): PathFn => (c) => {
  c.beginPath();
  c.roundRect(x - 22, y - 24, 44, 48, 16);
};
const toeStop: PathFn = (c) => {
  c.beginPath();
  c.ellipse(CX, 266, 26, 18, 0, 0, Math.PI * 2);
};

const rinkCrown: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 74, 56);
  c.lineTo(CX - 78, 12);
  c.lineTo(CX - 56, 32);
  c.lineTo(CX - 38, 4);
  c.lineTo(CX - 20, 30);
  c.lineTo(CX, -4);
  c.lineTo(CX + 20, 30);
  c.lineTo(CX + 38, 4);
  c.lineTo(CX + 56, 32);
  c.lineTo(CX + 78, 12);
  c.lineTo(CX + 74, 56);
  c.closePath();
};

function paintWheel(g: Ctx, x: number, y: number, col: string, k: number): void {
  const wp = wheelPath([x, y, 0]);
  clip(g, wp, () => {
    g.fillStyle = lin(g, x - 22, 0, x + 22, 0, [
      [0, rgba(mix(col, '#ffffff', 0.55), k)],
      [0.35, rgba(col, k)],
      [1, rgba(shade(col, -0.5), k)],
    ]);
    g.fillRect(x - 24, y - 26, 48, 52);
    // translucent urethane: the hub showing through, a hot core
    glowDot(g, x, y, 18, col, 0.6 * k);
    g.fillStyle = rgba('#e8ecf4', k);
    g.beginPath();
    g.arc(x, y, 8, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = rgba('#3a3e48', k);
    g.beginPath();
    g.arc(x, y, 3.5, 0, Math.PI * 2);
    g.fill();
    spec(g, x - 10, y - 10, 6, 12, 0.7 * k, 0);
  });
}

function drawRink(ctx: Ctx, art: FootArt, _p: Pose, o: Opts): void {
  const pink = art.primary ?? '#ff3fa4';
  const gold = art.secondary ?? '#ffd23f';
  const wheelCols = [art.legAccent ?? '#39f3ff', '#a8ff3a'];
  const box = { x: CX - 120, y: -8, w: 240, h: 318 };
  const sil = new Sil(ctx, [rinkBoot, rinkPlate, toeStop, ...RINK_WHEELS.map(wheelPath), rinkCrown], box);
  const g = sil.g;
  if (o.emissive) {
    for (const [x, y, k] of RINK_WHEELS) glowDot(g, x, y, 24, wheelCols[k], 0.55);
    for (const [x, y] of RINK_GEMS) glowDot(g, x, y, 8, '#ffffff', 0.7);
    glowFinish(sil);
    return;
  }
  if (o.heat) {
    heatLayer(sil, box, { seed: 81, y0: 300, y1: 0 });
    return;
  }
  sil.form({ base: pink, shadowTint: '#3a0430', ramp: 0.85, form: 0.55, formSize: 30, bevel: 0.45, rim: 0.6 });
  // glitter vinyl: a dense sparkle over the patent pink
  clip(g, rinkBoot, () => {
    texture(g, 'speckle', box, 0.35, 1, 'soft-light');
    const r = rng(hashStr('rink-glitter'));
    for (let i = 0; i < 420; i++) {
      const x = CX - 104 + r() * 208;
      const y = 10 + r() * 244;
      const lit = 1 - Math.max(0, Math.min(1, ((x - CX) / 200 + (y - 100) / 300) + 0.4));
      g.fillStyle = rgba(r() < 0.3 ? '#ffffff' : r() < 0.6 ? gold : '#ff9ad8', (0.2 + r() * 0.6) * (0.4 + lit * 0.6));
      g.fillRect(x, y, 1.4, 1.4);
    }
    for (let i = 0; i < 10; i++) glint(g, CX - 90 + r() * 140, 30 + r() * 200, 2 + r() * 3, 0.85);
    streak(g, (cc) => {
      cc.moveTo(CX - 60, 40);
      cc.bezierCurveTo(CX - 74, 110, CX - 90, 160, CX - 88, 220);
    }, 3, 0.45);
    // lightning-bolt decals down each side
    for (const s of [-1, 1]) {
      const bolt: PathFn = (cc) => {
        cc.beginPath();
        cc.moveTo(CX + s * 70, 90);
        cc.lineTo(CX + s * 92, 90);
        cc.lineTo(CX + s * 80, 140);
        cc.lineTo(CX + s * 98, 140);
        cc.lineTo(CX + s * 66, 210);
        cc.lineTo(CX + s * 76, 156);
        cc.lineTo(CX + s * 60, 156);
        cc.closePath();
      };
      raised(g, bolt, goldRamp(g, CX + s * 60, 90, CX + s * 98, 210, gold), 0.5);
    }
    // the tongue and the lacing
    g.fillStyle = lin(g, CX - 26, 0, CX + 26, 0, [
      [0, shade(pink, 0.25)],
      [1, shade(pink, -0.35)],
    ]);
    g.beginPath();
    g.roundRect(CX - 26, 20, 52, 170, 14);
    g.fill();
    texture(g, 'leather', { x: CX - 26, y: 20, w: 52, h: 170 }, 0.3, 1.2);
  });
  const ys = [44, 74, 104, 134, 164];
  for (let i = ys.length - 1; i > 0; i--) for (const s of [-1, 1]) laceRun(g, CX - s * 32, ys[i], CX + s * 32, ys[i - 1], '#ffffff', 5);
  for (const y of ys) for (const s of [-1, 1]) eyelet(g, CX + s * 33, y, 4.6, '#ffe890');
  // the toe cap
  stitches(g, (cc) => cc.ellipse(CX, 236, 80, 40, 0, Math.PI + 0.2, -0.2), rgba('#ffffff', 0.7), 1.5, 4, 3);
  // plate, wheels and toe stop
  clip(g, rinkPlate, () => {
    g.fillStyle = lin(g, 0, 244, 0, 260, [
      [0, '#f0f4f8'],
      [0.4, '#9aa2ae'],
      [1, '#3a404a'],
    ]);
    g.fillRect(box.x, 240, box.w, 24);
  });
  for (const x of [CX - 76, CX - 26, CX + 26, CX + 76]) rivet(g, x, 252, 3, '#d8dee8');
  for (const [x, y, k] of RINK_WHEELS) {
    contact(g, (cc) => {
      wheelPath([x, y, 0])(cc);
      cc.fill();
    }, 0.6, 3, 4);
    paintWheel(g, x, y, wheelCols[k], 1);
  }
  raised(g, toeStop, rad(g, CX - 8, 258, 2, CX, 266, 28, [
    [0, mix(pink, '#ffffff', 0.4)],
    [0.6, shade(pink, -0.1)],
    [1, shade(pink, -0.55)],
  ]), 0.55);
  texture(g, 'rubber', { x: CX - 30, y: 248, w: 60, h: 40 }, 0.3);
  // the crown round the cuff: gold, gem-set
  contact(g, (cc) => {
    rinkCrown(cc);
    cc.fill();
  }, 0.55, 3, 4);
  clip(g, rinkCrown, () => {
    g.fillStyle = goldRamp(g, CX - 78, -4, CX + 78, 56, gold);
    g.fillRect(box.x, -8, box.w, 70);
    texture(g, 'brushed', box, 0.15);
    g.fillStyle = rgba('#5a3a08', 0.4);
    g.fillRect(box.x, 48, box.w, 10);
    g.fillStyle = rgba('#fffbe0', 0.5);
    g.fillRect(box.x, 44, box.w, 2);
  });
  RINK_GEMS.forEach(([x, y], i) => {
    const col = ['#39f3ff', '#ff3fa4', '#a8ff3a', '#ff3fa4', '#39f3ff'][i];
    raised(g, ell(x, y, 5.5, 5.5), rad(g, x - 2, y - 2, 0.5, x, y, 6, [
      [0, '#ffffff'],
      [0.4, col],
      [1, shade(col, -0.5)],
    ]), 0.5);
  });
  glint(g, CX - 40, 16, 4, 0.9);
  lightAll(sil, 0.4, 20, 0.6);
  sil.finish(inkOf(pink));
}

const RINK_GEMS: [number, number][] = [
  [CX - 56, 40],
  [CX - 28, 38],
  [CX, 36],
  [CX + 28, 38],
  [CX + 56, 40],
];

registerStyle('rinkqueen', {
  contactY: 306,
  halfWidth: 108,
  leg: { kind: 'knit', hw: 62, join: 'into' },
  draw(ctx, art, p, o) {
    drawRink(ctx, art, p, o);
  },
});

// ════════════════════════════ THE YETI SKI BOOT ════════════════════════════

/** Tufts of fur spilling over the boot's cuff (live parts: they sway). Root x, y, angle. */
export const YETI_TUFTS: [number, number, number][] = [
  [CX - 70, 10, Math.PI * 0.9],
  [CX + 72, 10, Math.PI * 0.1],
];

const yetiShell = (flex: number): PathFn => (c) => {
  const b = 262 - flex * 5;
  c.beginPath();
  c.moveTo(CX - 82, 18);
  c.lineTo(CX - 92, 120);
  c.bezierCurveTo(CX - 108, 140, CX - 112, 190, CX - 110, 220);
  c.bezierCurveTo(CX - 108, b - 4, CX - 80, b, CX - 40, b);
  c.lineTo(CX + 50, b);
  c.bezierCurveTo(CX + 90, b, CX + 112, b - 8, CX + 112, 220);
  c.bezierCurveTo(CX + 112, 180, CX + 108, 140, CX + 94, 120);
  c.lineTo(CX + 84, 18);
  c.closePath();
};

const yetiSole: PathFn = (c) => {
  c.beginPath();
  c.roundRect(CX - 112, 254, 226, 22, 8);
};

const yetiSki: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 120, 282);
  c.quadraticCurveTo(CX - 132, 282, CX - 134, 290);
  c.quadraticCurveTo(CX - 132, 298, CX - 120, 298);
  c.lineTo(CX + 124, 298);
  c.quadraticCurveTo(CX + 136, 298, CX + 136, 290);
  c.quadraticCurveTo(CX + 136, 282, CX + 124, 282);
  c.closePath();
};

/** The fur ruff spilling out of the cuff: shaggy locks hanging over the boot's top, tips pointing down. */
const yetiRuff: PathFn = (c) => {
  c.beginPath();
  const r = rng(hashStr('yeti-ruff'));
  // the top: a soft mound of fur round the leg
  c.moveTo(CX - 104, 30);
  c.bezierCurveTo(CX - 108, 6, CX - 80, -6, CX, -6);
  c.bezierCurveTo(CX + 80, -6, CX + 110, 6, CX + 106, 30);
  // the bottom: locks of fur, each a tapering point with a little hook, longest in the middle
  const n = 13;
  for (let i = n; i >= 0; i--) {
    const x = CX - 104 + (i / n) * 210;
    const mid = 1 - Math.abs(i / n - 0.5) * 1.2;
    const len = 10 + mid * 12 + r() * 7;
    const hook = (r() - 0.5) * 8;
    // a soft, rounded clump of hair (pointed tips read as icicles)
    c.bezierCurveTo(x + 13, 36 + len * 0.3, x + 11 + hook, 34 + len, x + 4 + hook, 34 + len);
    c.bezierCurveTo(x - 2 + hook, 34 + len, x - 3, 38 + len * 0.45, x - 4, 36);
  }
  c.closePath();
};

const tuftPathY = (i: number): PathFn => {
  const [x, y, a] = YETI_TUFTS[i];
  return (c) => {
    c.save();
    c.translate(x, y);
    c.rotate(a);
    c.beginPath();
    c.moveTo(0, -12);
    c.quadraticCurveTo(24, -18, 44, -4);
    c.quadraticCurveTo(30, -2, 42, 8);
    c.quadraticCurveTo(26, 6, 34, 18);
    c.quadraticCurveTo(16, 14, 0, 12);
    c.closePath();
    c.restore();
  };
};

function paintFluff(g: Ctx, r: () => number, area: { x: number; y: number; w: number; h: number }, white: string): void {
  // shaggy yeti fur: ivory with warm grey-brown depths (not frost), clumped into locks that hang down
  const ivory = mix(white, '#f4e8d0', 0.55);
  const deep = '#7a6a58';
  g.fillStyle = lin(g, area.x, area.y, area.x + area.w * 0.6, area.y + area.h, [
    [0, '#fffaf0'],
    [0.5, ivory],
    [1, '#a49a8e'],
  ]);
  g.fillRect(area.x, area.y, area.w, area.h);
  // the dark gaps between locks first, then strands combed down along each lock
  furCoat(g, r, area, (x) => Math.PI / 2 + Math.sin(x * 0.29) * 0.35, ivory, deep, { n: (area.w * area.h) / 16000, len: 20, w: 1.15 });
  furCoat(g, r, area, (x) => Math.PI / 2 + Math.sin(x * 0.29) * 0.25, mix(ivory, '#ffffff', 0.4), shade(ivory, -0.3), { n: (area.w * area.h) / 40000, len: 16 });
  // light from the top left on the mound, shadow under the locks
  g.fillStyle = lin(g, 0, area.y, 0, area.y + area.h, [
    [0, rgba('#ffffff', 0.25)],
    [0.45, rgba('#ffffff', 0)],
    [1, rgba('#4a4038', 0.45)],
  ]);
  g.fillRect(area.x, area.y, area.w, area.h);
}

function drawYeti(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const white = art.primary ?? '#f2f5f8';
  const red = art.secondary ?? '#e8402f';
  const flex = Math.max(0, p.curl);
  const shell = yetiShell(flex);
  const tufts = o.live ? [] : YETI_TUFTS.map((_, i) => tuftPathY(i));
  const box = { x: CX - 150, y: -8, w: 302, h: 310 };
  const sil = new Sil(ctx, [yetiSki, yetiSole, shell, yetiRuff, ...tufts], box);
  const g = sil.g;
  if (o.heat) {
    heatLayer(sil, box, { seed: 83, y0: 290, y1: 0 });
    return;
  }
  sil.fillParts(red);
  // the ski: blue and yellow racing stripes, a steel edge
  clip(g, yetiSki, () => {
    g.fillStyle = lin(g, 0, 282, 0, 298, [
      [0, '#4a7ae8'],
      [0.5, '#1a3a9a'],
      [1, '#0a1a4a'],
    ]);
    g.fillRect(box.x, 280, box.w, 20);
    g.fillStyle = '#ffcf3a';
    g.fillRect(box.x, 287, box.w, 3);
    g.fillStyle = '#d8dee8';
    g.fillRect(box.x, 296, box.w, 2);
    spec(g, CX - 80, 285, 60, 2, 0.6, 0);
  });
  // the binding toe piece and the sole
  clip(g, yetiSole, () => {
    g.fillStyle = lin(g, 0, 254, 0, 276, [
      [0, '#4a4e58'],
      [1, '#14161c'],
    ]);
    g.fillRect(box.x, 250, box.w, 30);
    texture(g, 'rubber', box, 0.4);
  });
  // the shell: glossy red plastic
  contact(g, (c) => {
    shell(c);
    c.fill();
  }, 0.5, 3, 4);
  clip(g, shell, () => {
    g.fillStyle = lin(g, CX - 110, 40, CX + 110, 240, [
      [0, mix(red, '#ffffff', 0.35)],
      [0.35, red],
      [0.8, shade(red, -0.45)],
      [1, mix(shade(red, -0.6), '#200818', 0.4)],
    ]);
    g.fillRect(box.x, 0, box.w, 270);
    streak(g, (c) => {
      c.moveTo(CX - 74, 40);
      c.lineTo(CX - 84, 120);
      c.bezierCurveTo(CX - 98, 150, CX - 100, 190, CX - 94, 222);
    }, 3.5, 0.55);
    // the cuff and the lower shell overlap: a moulded seam
    crease(g, (c) => {
      c.moveTo(CX - 98, 130);
      c.bezierCurveTo(CX - 40, 150, CX + 40, 150, CX + 100, 130);
    }, 3, '#2a0408', 0.6, 0.4);
    // snowflake logo and scuffs
    const sx = CX - 30;
    const sy = 196;
    g.strokeStyle = rgba('#ffffff', 0.92);
    g.lineWidth = 3;
    g.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(sx + Math.cos(a) * 15, sy + Math.sin(a) * 15);
      g.moveTo(sx + Math.cos(a) * 9, sy + Math.sin(a) * 9);
      g.lineTo(sx + Math.cos(a + 0.5) * 13, sy + Math.sin(a + 0.5) * 13);
      g.stroke();
    }
    blotches(g, box, '#ffffff', 0.35, 4, 0.72, 0.06, 85);
    // snow caked on the toe
    blotches(g, { x: CX - 110, y: 220, w: 220, h: 44 }, '#ffffff', 0.9, 8, 0.52, 0.1, 87);
  });
  // the DIN plate on the toe
  const din: PathFn = (c) => {
    c.beginPath();
    c.roundRect(CX + 20, 226, 56, 22, 5);
  };
  raised(g, din, lin(g, 0, 226, 0, 248, [
    [0, '#f0f4f8'],
    [1, '#8a92a0'],
  ]));
  g.fillStyle = '#c8202a';
  g.font = 'bold 13px sans-serif';
  g.textAlign = 'center';
  g.fillText('DIN 12', CX + 48, 242);
  // buckles: chrome levers on bails, down the front
  for (const [i, y] of [26, 62, 98, 170].entries()) {
    const bx = CX + 56 + (i === 3 ? 18 : 0);
    const bail: PathFn = (c) => {
      c.beginPath();
      c.roundRect(bx - 48, y + 4, 52, 5, 2);
    };
    raised(g, bail, '#c8d0dc', 0.5);
    const lever: PathFn = (c) => {
      c.beginPath();
      c.roundRect(bx - 2, y - 2, 34, 16, 5);
    };
    raised(g, lever, lin(g, bx, y - 2, bx + 34, y + 14, [
      [0, '#ffffff'],
      [0.4, '#b8c0cc'],
      [1, '#4a5260'],
    ]), 0.6);
    rivet(g, bx + 3, y + 6, 3.2, '#e0e6ee');
    glint(g, bx + 10, y + 1, 3, 0.8);
  }
  // the fur ruff
  contact(g, (c) => {
    yetiRuff(c);
    c.fill();
  }, 0.55, 3, 6);
  const r = rng(hashStr('yeti-fluff'));
  clip(g, yetiRuff, () => paintFluff(g, r, { x: CX - 112, y: -8, w: 226, h: 84 }, white));
  if (!o.live) YETI_TUFTS.forEach((_, i) => clip(g, tuftPathY(i), () => paintFluff(g, r, { x: CX - 130, y: -20, w: 262, h: 60 }, white)));
  lightAll(sil, 0.4, 20, 0.6);
  sil.finish(inkOf(red), { openTop: -2 });
}

registerStyle('yeti', {
  contactY: 298,
  halfWidth: 118,
  leg: { kind: 'fur', hw: 70, join: 'into' },
  parts: Object.fromEntries(
    YETI_TUFTS.map(([x, y], i) => {
      const box = { x: x - 52, y: y - 52, w: 104, h: 104 };
      return [
        `tuft${i}`,
        {
          box,
          frames: 1,
          pivot: [x, y],
          draw: (g: Ctx, art: FootArt) => {
            const sil = new Sil(g, [tuftPathY(i)], box);
            paintFluff(sil.g, rng(hashStr('yeti-tuft' + i)), box, art.primary ?? '#f2f5f8');
            sil.edge(rgba(LIGHT.rim, 0.5), 2.5, LX * 3, LY * 3);
            sil.finish('#5a6a88', { inner: 0.3 });
          },
        } as PartDef,
      ];
    }),
  ),
  draw(ctx, art, p, o) {
    drawYeti(ctx, art, p, o);
  },
});

export { ao };
