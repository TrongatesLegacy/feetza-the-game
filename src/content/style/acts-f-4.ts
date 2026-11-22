// Batch F in the style kit, part 4: the Hot Gates' god-king and the Persian army (Act 9). The Immortal Sandals and the
// Immortal Brute are NOT here: they keep their own live art (src/content/art/immortals.ts, src/game/footLive.ts).
// - XERXES (boss): a bronzed bare foot that has never touched the ground, in gold: a jewelled cuff with a ruby, gold
//   chains draped across the instep from the cuff's rings, a sunburst medallion with straps raying out to the toes,
//   gold toe caps, gilded nails and rings through the edge of the foot.
// - ARCHER SLIPPERS: a soft saffron suede Persian slipper with a curled toe and a red bead, a teal woven band with gold
//   diamonds, a stitched vamp seam, and a tooled leather quiver of fletched arrows strapped to the side (its bow is a
//   prop in play).
// - CAVALRY HOOVES: a warhorse's leg in glossy bay hide, a feathered fetlock of pale hair falling over a dark horn
//   hoof shod in bronze, under a red saddle cloth with a gold border and swinging gold tassels.
// - CHARIOT WHEEL: the charioteer's leather boot under a bronze greave embossed with a winged sun, a red cloth band
//   and a curled toe. The scythed wheel is the game's spinning prop in play (WHEEL_AT); stills paint the same wheel.
// - SATRAP'S SLIPPER: crimson silk with gold paisley embroidery, a brocade band with a gold fringe, a strand of pearls,
//   a ruby in a gold setting and a pearl on the curled toe.

import type { FootArt } from '../../data/feet';
import { WHEEL_AT } from '../art/persianFeet';
import { paintWheel } from '../props/persians';
import { type StyleToe, onToe } from '../../art/style/anatomy';
import { bareFoot, bareOutline, paintBare } from '../../art/style/bare';
import { type PathFn, type Pose, crease, glint, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil } from '../../art/style/sil';
import { registerStyle } from '../../art/style/registry';
import { contact, rivet, stitches } from '../../art/style/details';
import { MATS_F } from '../../art/style/materials-acts-f';
import { clip, furCoat, glowDot, glowFinish, heatLayer, lightAll, lin, streak } from '../../art/style/kit-bosses';
import { type Ctx, mix, rgba, rng, shade } from '../../art/util';
import { BARE_RIG, toePath } from './base-kit';
import { CX, type Opts, type Pt, chain, gem, lifted, metal, partSil, pearl, sag, tube } from './acts-f-kit';

// ════════════════════════════ XERXES ════════════════════════════

const XERX_LOOK = { toe: 1.02, nails: '#f2c14e', pores: 0.2, detail: 0.7, shadowTint: '#6a1a10' } as const;
const XERX_MEDAL: Pt = [CX + 4, 126];
const XERX_RINGS: Pt[] = [
  [CX - 50, 40],
  [CX + 52, 42],
];

function xerxDrape(g: Ctx, gold: string): void {
  const [a, b] = XERX_RINGS;
  chain(g, sag(a[0], a[1], b[0], b[1], 52, 22), 4.4, gold);
  chain(g, sag(a[0], a[1], b[0], b[1], 86, 26), 4.4, gold);
  // a gold teardrop hanging from the lower chain
  const [dx, dy] = [CX + 1, 41 + 86];
  lifted(g, (c) => {
    c.beginPath();
    c.moveTo(dx, dy);
    c.quadraticCurveTo(dx + 7, dy + 10, dx, dy + 18);
    c.quadraticCurveTo(dx - 7, dy + 10, dx, dy);
    c.closePath();
  }, lin(g, dx - 7, dy, dx + 7, dy + 18, [
    [0, '#fff4c0'],
    [0.4, gold],
    [1, shade(gold, -0.5)],
  ]), 0.5);
  gem(g, dx, dy + 11, 3.2, '#c8102e');
}

function drawXerxes(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const skin = art.skin;
  const gold = art.primary ?? '#e8b23a';
  const ruby = (art.extra?.gem as string) ?? '#c8102e';
  const look = { ...XERX_LOOK, skin };
  const f = o.heat || o.emissive ? bareFoot(ctx, look, p) : paintBare(ctx, look, p);
  const g = f.sil.g;
  const box = f.box;
  const capY = (t: StyleToe) => t.cy + t.ry * 0.18;
  const caps = f.toes.map((t) => (c: Ctx) => {
    c.beginPath();
    c.ellipse(t.cx, capY(t), t.rx * 1.06, t.ry * 0.72, t.rot, 0, Math.PI);
    c.closePath();
  });
  if (o.heat) {
    heatLayer(f.sil, box, { seed: 691, y0: 262, y1: 20 });
    return;
  }
  if (o.emissive) {
    glowDot(g, XERX_MEDAL[0], XERX_MEDAL[1], 22, ruby, 0.9);
    glowDot(g, CX, 22, 12, ruby, 0.7);
    glowFinish(f.sil);
    return;
  }
  // oiled, bronzed skin: a warmer sheen
  spec(g, CX - 30, 80, 50, 70, 0.18, -0.4, '#fff0c8');
  // straps raying out from the medallion to the toes
  const [mx, my] = XERX_MEDAL;
  clip(g, f.sil.parts[0], () => {
    for (const t of f.toes) {
      const [tx, ty] = onToe(t, -Math.PI / 2);
      const pts: Pt[] = [
        [mx, my],
        [(mx + tx) / 2, (my + ty) / 2 + 4],
        [tx, ty + 10],
      ];
      metal(g, tube(pts, () => 3.6), { x: Math.min(mx, tx) - 4, y: my - 4, w: Math.abs(tx - mx) + 8, h: ty - my + 20 }, gold, { glints: false, shadow: 0.55 });
    }
  });
  // gold toe caps
  for (const [i, t] of f.toes.entries()) {
    clip(g, toePath(t), () => metal(g, caps[i], { x: t.cx - t.rx, y: capY(t) - 4, w: t.rx * 2, h: t.ry * 0.9 }, gold));
    const [nx, ny] = onToe(t, Math.PI / 2);
    glint(g, nx - t.rx * 0.25, ny - t.ry * 0.3, 2.6, 0.8);
  }
  // the sunburst medallion with a ruby
  const sun: PathFn = (c) => {
    c.beginPath();
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      const r = k % 2 ? 22 : 30;
      if (k) c.lineTo(mx + Math.cos(a) * r, my + Math.sin(a) * r * 0.9);
      else c.moveTo(mx + Math.cos(a) * r, my + Math.sin(a) * r * 0.9);
    }
    c.closePath();
  };
  metal(g, sun, { x: mx - 30, y: my - 28, w: 60, h: 56 }, gold);
  metal(g, (c) => {
    c.beginPath();
    c.arc(mx, my, 16, 0, Math.PI * 2);
  }, { x: mx - 16, y: my - 16, w: 32, h: 32 }, shade(gold, 0.1), { glints: false });
  gem(g, mx, my, 10, ruby);
  // the jewelled cuff
  const cuff: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 56, 8);
    c.quadraticCurveTo(CX, 16, CX + 56, 8);
    c.lineTo(CX + 58, 34);
    c.quadraticCurveTo(CX, 42, CX - 58, 34);
    c.closePath();
  };
  clip(g, f.sil.parts[0], () => {
    metal(g, cuff, { x: CX - 58, y: 8, w: 116, h: 34 }, gold, { vertical: true });
    clip(g, cuff, () => {
      g.strokeStyle = rgba('#5a3004', 0.6);
      g.lineWidth = 1.4;
      for (let k = -5; k <= 5; k++) {
        g.beginPath();
        g.moveTo(CX + k * 10, 14 + Math.abs(k) * -0.3);
        g.lineTo(CX + k * 10 + 4, 36);
        g.stroke();
      }
    });
  });
  gem(g, CX, 22, 6.5, ruby);
  for (const s of [-1, 1]) gem(g, CX + s * 26, 22, 3.6, '#2a6ab8');
  // rings through the edge of the foot
  for (const [x, y] of [[CX - 88, 130], [CX - 92, 150], [CX + 96, 120]] as const) {
    g.save();
    g.lineWidth = 2.6;
    g.strokeStyle = shade(gold, -0.5);
    g.beginPath();
    g.ellipse(x, y, 6, 8, 0, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 1.6;
    g.strokeStyle = gold;
    g.stroke();
    g.restore();
    glint(g, x - 3, y - 4, 2, 0.9);
  }
  for (const [x, y] of XERX_RINGS) {
    metal(g, (c) => {
      c.beginPath();
      c.arc(x, y, 6, 0, Math.PI * 2);
      c.arc(x, y, 3, 0, Math.PI * 2, true);
    }, { x: x - 6, y: y - 6, w: 12, h: 12 }, gold, { glints: false });
  }
  if (!o.live) xerxDrape(g, gold);
  lightAll(f.sil, 0.25, 20, 0.5);
  bareOutline(f);
}

registerStyle('xerxes', {
  contactY: 270,
  halfWidth: 110,
  rig: BARE_RIG,
  leg: { kind: 'skin', hw: 52, join: 'blend', fade: 22 },
  parts: {
    drape: {
      box: { x: CX - 64, y: 30, w: 130, h: 120 },
      frames: 1,
      pivot: [CX + 1, 41],
      draw: (g, art) => xerxDrape(g, art.primary ?? '#e8b23a'),
    },
  },
  draw(ctx, art, p, o) {
    drawXerxes(ctx, art, p, o);
  },
});

// ════════════════════════════ The Persian boot ════════════════════════════

/** The Persian army's soft boot: a slim ankle swelling to a broad foot that narrows to a pointed toe. */
const persianBoot = (flex: number): PathFn => (c) => {
  const b = 250 - flex * 8;
  c.beginPath();
  c.moveTo(50, -8);
  c.bezierCurveTo(48, 56, 16, 100, 16, 164);
  c.bezierCurveTo(16, 214, 70, b - 10, 112, b);
  c.bezierCurveTo(152, b - 12, 206, 214, 206, 164);
  c.bezierCurveTo(206, 100, 172, 56, 170, -8);
  c.closePath();
};

/** The curled toe: the tip runs on round into a little loop. */
function curlPts(flex: number): Pt[] {
  const b = 250 - flex * 8;
  const pts: Pt[] = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const a = Math.PI * 0.9 - t * Math.PI * 1.55;
    const r = 20 - t * 8;
    pts.push([130 + Math.cos(a) * r - (1 - t) * 2, b - 4 - Math.sin(a) * r * 0.9 + (1 - t) * 8]);
  }
  return pts;
}

const curlPath = (flex: number): PathFn => tube(curlPts(flex), (s) => 7.5 - s * 3);

/** The bead (or pearl) on the curl's tip, in the silhouette so the outline goes round it. */
const beadPath = (flex: number): PathFn => (c) => {
  const [x, y] = curlTip(flex);
  c.beginPath();
  c.arc(x, y, 8, 0, Math.PI * 2);
};

function curlTip(flex: number): Pt {
  const pts = curlPts(flex);
  return pts[pts.length - 1];
}

/** Paint the boot's base material (lit), the curled toe and its bead. */
function bootBase(sil: Sil, mat: keyof typeof MATS_F, col: string, flex: number): void {
  const m = MATS_F[mat];
  sil.form({ base: col, shadowTint: m.shadowTint, ramp: m.ramp, form: m.form, formSize: 26, bevel: m.bevel, rim: m.rim });
  if (m.tex) texture(sil.g, m.tex, sil.box, m.texA ?? 0.3, m.texScale ?? 1);
  const g = sil.g;
  // the toe narrows into its point: a crease along the curl, a highlight along its top
  softStroke(g, (c) => {
    c.moveTo(70, 210 - flex * 6);
    c.quadraticCurveTo(96, 236 - flex * 8, 112, 248 - flex * 8);
  }, rgba(shade(col, 0.5), 0.35), 6, 3);
  const pts = curlPts(flex);
  clip(g, curlPath(flex), () => {
    g.strokeStyle = rgba(mix(shade(col, 0.6), '#fff4e0', 0.2), 0.6);
    g.lineWidth = 2;
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x - 1.4, y - 2) : g.moveTo(x - 1.4, y - 2)));
    g.stroke();
  });
}

/** A woven band across the boot: cloth, gold edges, gold diamonds with blue eyes. */
function wovenBand(g: Ctx, y: number, h: number, cloth: string, gold: string, eye = '#2a6ab8'): void {
  const path: PathFn = (c) => {
    c.beginPath();
    c.moveTo(0, y);
    c.quadraticCurveTo(CX, y + 8, 230, y);
    c.lineTo(230, y + h);
    c.quadraticCurveTo(CX, y + h + 8, 0, y + h);
    c.closePath();
  };
  contact(g, (c) => {
    path(c);
    c.fill();
  }, 0.5, 2.4, 3);
  clip(g, path, () => {
    g.fillStyle = lin(g, 0, y, 0, y + h + 8, [
      [0, shade(cloth, 0.3)],
      [0.5, cloth],
      [1, shade(cloth, -0.45)],
    ]);
    g.fillRect(-10, y - 4, 250, h + 16);
    texture(g, 'canvas', { x: 0, y: y - 4, w: 230, h: h + 16 }, 0.4, 0.9);
    for (const [yy, hh] of [[y, 4], [y + h - 3.5, 4]] as const) {
      g.fillStyle = lin(g, 0, yy, 0, yy + hh + 8, [
        [0, mix(gold, '#fffbe0', 0.5)],
        [0.5, gold],
        [1, shade(gold, -0.5)],
      ]);
      g.beginPath();
      g.moveTo(0, yy);
      g.quadraticCurveTo(CX, yy + 8, 230, yy);
      g.lineTo(230, yy + hh);
      g.quadraticCurveTo(CX, yy + hh + 8, 0, yy + hh);
      g.fill();
    }
    for (let x = 14; x < 220; x += 22) {
      const m = y + h / 2 + 8 * (1 - ((x + 8 - CX) / 115) ** 2) * 0.9;
      g.beginPath();
      g.moveTo(x, m);
      g.lineTo(x + 8, m - h * 0.28);
      g.lineTo(x + 16, m);
      g.lineTo(x + 8, m + h * 0.28);
      g.closePath();
      g.fillStyle = lin(g, x, m - h * 0.3, x + 16, m + h * 0.3, [
        [0, mix(gold, '#fffbe0', 0.5)],
        [1, shade(gold, -0.4)],
      ]);
      g.fill();
      g.fillStyle = eye;
      g.beginPath();
      g.arc(x + 8, m, 2.4, 0, Math.PI * 2);
      g.fill();
    }
  });
}

/** The bead on a curled toe. */
function curlBead(g: Ctx, flex: number, col: string, kind: 'bead' | 'pearl' = 'bead'): void {
  const [x, y] = curlTip(flex);
  if (kind === 'pearl') pearl(g, x, y, 8);
  else gem(g, x, y, 8, col);
}

// ════════════════════════════ ARCHER SLIPPERS ════════════════════════════

const QUIVER_AT: Pt = [36, 96];

function paintQuiver(g: Ctx): void {
  g.save();
  g.translate(30, 70);
  g.rotate(-0.32);
  const tubeP: PathFn = (c) => {
    c.beginPath();
    c.roundRect(-18, -54, 36, 116, 12);
  };
  const arrows: PathFn[] = [-10, 0, 10].map((dx) => (c: Ctx) => {
    c.beginPath();
    c.moveTo(dx, -50);
    c.lineTo(dx - 7, -88);
    c.lineTo(dx, -82);
    c.lineTo(dx + 7, -88);
    c.closePath();
  });
  partSil(g, [tubeP, ...arrows], { x: -26, y: -96, w: 52, h: 166 }, (pg) => {
    for (const [i, dx] of [-10, 0, 10].entries()) {
      const fl = i === 1 ? '#f4efe8' : '#e8402f';
      pg.fillStyle = lin(pg, dx - 7, -90, dx + 7, -50, [
        [0, shade(fl, 0.3)],
        [1, shade(fl, -0.3)],
      ]);
      arrows[i](pg);
      pg.fill();
      pg.strokeStyle = rgba(shade(fl, -0.5), 0.7);
      pg.lineWidth = 1;
      for (let k = 0; k < 4; k++) {
        pg.beginPath();
        pg.moveTo(dx, -58 - k * 7);
        pg.lineTo(dx - 5, -64 - k * 7);
        pg.moveTo(dx, -58 - k * 7);
        pg.lineTo(dx + 5, -64 - k * 7);
        pg.stroke();
      }
      pg.fillStyle = '#5a3a1e';
      pg.fillRect(dx - 1.2, -60, 2.4, 14);
    }
    contact(pg, (c) => {
      tubeP(c);
      c.fill();
    }, 0.5, 2, 3);
    clip(pg, tubeP, () => {
      pg.fillStyle = lin(pg, -18, 0, 18, 0, [
        [0, '#5a3418'],
        [0.25, '#a8703a'],
        [0.55, '#7a4a24'],
        [1, '#3a2010'],
      ]);
      pg.fillRect(-20, -56, 40, 120);
      texture(pg, 'leather', { x: -20, y: -56, w: 40, h: 120 }, 0.4, 1.2);
      // tooled lozenges down the front
      for (let k = 0; k < 4; k++) crease(pg, (c) => {
        const y = -24 + k * 18;
        c.moveTo(0, y - 7);
        c.lineTo(7, y);
        c.lineTo(0, y + 7);
        c.lineTo(-7, y);
        c.closePath();
      }, 1.4, '#2a1408', 0.5, 0.3);
    });
    for (const y of [-48, 42]) metal(pg, (c) => {
      c.beginPath();
      c.rect(-18, y, 36, 6);
    }, { x: -18, y, w: 36, h: 6 }, '#e8b43a', { vertical: true, glints: false, shadow: 0.3 });
  }, '#2a1608', { w: 3.4 });
  g.restore();
}

function drawArcher(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const col = art.primary ?? '#e8a030';
  const teal = art.secondary ?? '#2a7a6a';
  const flex = Math.max(0, p.curl);
  if (!o.live && !o.emissive && !o.heat) paintQuiver(ctx);
  const boot = persianBoot(flex);
  const box = { x: 6, y: -10, w: 212, h: 280 };
  const sil = new Sil(ctx, [boot, curlPath(flex), beadPath(flex)], box);
  const g = sil.g;
  bootBase(sil, 'suede', col, flex);
  // the nap: soft brushed sheen and darker wear at the toe
  spec(g, 70, 120, 40, 70, 0.18, -0.3, '#fff4d8');
  softFill(g, (c) => {
    c.beginPath();
    c.ellipse(112, 230, 50, 22, 0, 0, Math.PI * 2);
  }, rgba(shade(col, -0.45), 0.3), 10);
  stitches(g, (c) => {
    c.moveTo(CX, 40);
    c.quadraticCurveTo(CX + 4, 150, CX + 2, 238 - flex * 8);
  }, rgba(shade(col, -0.55), 0.8), 1.6, 4, 3);
  crease(g, (c) => {
    c.moveTo(CX, 40);
    c.quadraticCurveTo(CX + 4, 150, CX + 2, 238 - flex * 8);
  }, 2.2, shade(col, -0.6), 0.35, 0.25);
  wovenBand(g, -8, 32, teal, '#e8c050');
  // the strap across the instep holding the quiver on, and its gold buckle
  const strapPts: Pt[] = [
    [16, 96],
    [CX, 114],
    [206, 92],
  ];
  metal(g, tube(strapPts, () => 5), { x: 16, y: 88, w: 190, h: 30 }, '#7a4a24', { glints: false, shadow: 0.55, tex: 0.05 });
  clip(g, tube(strapPts, () => 5), () => texture(g, 'leather', box, 0.5, 1.2));
  metal(g, (c) => {
    c.beginPath();
    c.arc(CX, 110, 9, 0, Math.PI * 2);
    c.arc(CX, 110, 4.5, 0, Math.PI * 2, true);
  }, { x: CX - 9, y: 101, w: 18, h: 18 }, '#e8b43a');
  curlBead(g, flex, '#e8402f');
  lightAll(sil, 0.3, 18, 0.5);
  sil.finish(inkOf(col), { openTop: -6 });
}

registerStyle('archer', {
  contactY: 254,
  halfWidth: 96,
  rig: { from: 176, to: 196 },
  leg: { kind: 'wool', hw: 52, join: 'into' },
  parts: {
    quiver: {
      box: { x: -40, y: -40, w: 110, h: 180 },
      frames: 1,
      pivot: QUIVER_AT,
      draw: (g) => paintQuiver(g),
    },
  },
  draw(ctx, art, p, o) {
    drawArcher(ctx, art, p, o);
  },
});

// ════════════════════════════ CAVALRY HOOVES ════════════════════════════

const cavLeg: PathFn = (c) => {
  c.beginPath();
  c.moveTo(60, -8);
  c.bezierCurveTo(58, 40, 52, 80, 40, 112);
  c.bezierCurveTo(26, 146, 34, 170, 46, 184);
  c.lineTo(174, 184);
  c.bezierCurveTo(186, 170, 194, 146, 180, 112);
  c.bezierCurveTo(168, 80, 162, 40, 160, -8);
  c.closePath();
};

const cavHoof = (flex: number): PathFn => (c) => {
  const b = 262 - flex * 5;
  c.beginPath();
  c.moveTo(44, 172);
  c.bezierCurveTo(30, 206, 18, 236, 20, b - 12);
  c.bezierCurveTo(40, b + 4, 180, b + 4, 200, b - 12);
  c.bezierCurveTo(202, 236, 190, 206, 176, 172);
  c.closePath();
};

/** The fetlock feathering: locks of long hair falling over the top of the hoof. */
function fetlockLocks(): { path: PathFn; x: number; y: number; len: number; ang: number }[] {
  const out: { path: PathFn; x: number; y: number; len: number; ang: number }[] = [];
  const r = rng(702);
  for (let i = 0; i < 15; i++) {
    const u = i / 14;
    const x = 34 + u * 152 + (r() - 0.5) * 6;
    const y = 138 + Math.abs(u - 0.5) * 18 + r() * 8;
    const len = 44 + r() * 22 - Math.abs(u - 0.5) * 20;
    const lean = (u - 0.5) * 16 + (r() - 0.5) * 8;
    const w = 9 + r() * 4;
    out.push({
      x,
      y,
      len,
      ang: Math.PI / 2 - lean * 0.01,
      path: (c) => {
        c.beginPath();
        c.moveTo(x - w, y);
        c.bezierCurveTo(x - w * 1.1, y + len * 0.45, x - w * 0.4 + lean * 0.6, y + len * 0.8, x + lean, y + len);
        c.bezierCurveTo(x + w * 0.3 + lean * 0.6, y + len * 0.75, x + w * 1.1, y + len * 0.4, x + w, y);
        c.closePath();
      },
    });
  }
  return out;
}

const CAV_TASSELS: Pt[] = [36, 62, 88, 114, 140, 166, 192].map((x) => [x, 46 + 6 * (1 - ((x - CX) / 90) ** 2)] as Pt);

function paintTassels(g: Ctx, gold: string, only?: number): void {
  for (const [i, [x, y]] of CAV_TASSELS.entries()) {
    if (only !== undefined && i !== only) continue;
    const t: PathFn = (c) => {
      c.beginPath();
      c.arc(x, y + 3, 4, 0, Math.PI * 2);
      c.moveTo(x - 3, y + 6);
      c.lineTo(x - 6, y + 24);
      c.quadraticCurveTo(x, y + 27, x + 6, y + 24);
      c.lineTo(x + 3, y + 6);
      c.closePath();
    };
    partSil(g, [t], { x: x - 8, y: y - 2, w: 16, h: 32 }, (pg) => {
      pg.fillStyle = lin(pg, x - 6, y, x + 6, y + 26, [
        [0, mix(gold, '#fffbe0', 0.5)],
        [0.5, gold],
        [1, shade(gold, -0.5)],
      ]);
      pg.fillRect(x - 8, y - 2, 16, 32);
      pg.strokeStyle = rgba(shade(gold, -0.6), 0.6);
      pg.lineWidth = 0.8;
      for (let k = -2; k <= 2; k++) {
        pg.beginPath();
        pg.moveTo(x + k * 1.6, y + 8);
        pg.lineTo(x + k * 2.4, y + 25);
        pg.stroke();
      }
    }, shade(gold, -0.7), { w: 2, form: 0.15 });
  }
}

const cavCloth: PathFn = (c) => {
  c.beginPath();
  c.moveTo(50, -8);
  c.lineTo(170, -8);
  c.bezierCurveTo(182, 12, 200, 30, 208, 52);
  c.quadraticCurveTo(184, 46, 164, 54);
  c.quadraticCurveTo(CX, 66, 56, 54);
  c.quadraticCurveTo(36, 46, 12, 52);
  c.bezierCurveTo(20, 30, 38, 12, 50, -8);
  c.closePath();
};

function drawCavalry(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const hide = art.skin;
  const horn = art.nails ?? '#2e2420';
  const red = art.primary ?? '#b8202a';
  const gold = art.secondary ?? '#e8b43a';
  const flex = Math.max(0, p.curl);
  const hoof = cavHoof(flex);
  const locks = fetlockLocks();
  const box = { x: 4, y: -10, w: 212, h: 280 };
  const sil = new Sil(ctx, [cavLeg, hoof, cavCloth], box);
  const g = sil.g;
  const r = rng(701);
  // glossy bay hide: short hair, a sheen down the cannon bone, the tendon groove
  sil.form({ base: hide, shadowTint: '#1a0806', ramp: 0.8, form: 0.55, formSize: 26, bevel: 0.4, rim: 0.55 });
  clip(g, cavLeg, () => {
    furCoat(g, r, { x: 20, y: -8, w: 180, h: 190 }, () => Math.PI / 2 + (r() - 0.5) * 0.2, hide, shade(hide, -0.5), { n: 0.6, len: 6, w: 0.7 });
    streak(g, (c) => {
      c.moveTo(70, 60);
      c.bezierCurveTo(64, 100, 56, 130, 54, 160);
    }, 4, 0.4, '#ffe8c8');
    crease(g, (c) => {
      c.moveTo(150, 50);
      c.bezierCurveTo(156, 90, 160, 120, 156, 160);
    }, 4, '#1a0806', 0.4, 0.2);
  });
  // the hoof: dark horn, growth rings, a waxy sheen
  clip(g, hoof, () => {
    g.fillStyle = lin(g, 20, 170, 200, 262, [
      [0, shade(horn, 0.35)],
      [0.4, horn],
      [1, shade(horn, -0.5)],
    ]);
    g.fillRect(10, 160, 200, 110);
    texture(g, 'wood', { x: 10, y: 160, w: 200, h: 110 }, 0.25, 1.6);
    for (let k = 0; k < 5; k++) crease(g, (c) => {
      const y = 200 + k * 11;
      c.moveTo(26 + k * 2, y);
      c.quadraticCurveTo(CX, y + 10, 194 - k * 2, y);
    }, 1.2, '#000000', 0.35, 0.2);
    streak(g, (c) => {
      c.moveTo(50, 200);
      c.quadraticCurveTo(44, 222, 42, 244);
    }, 3, 0.5);
    spec(g, 70, 214, 22, 10, 0.4, -0.4);
  });
  // the bronze shoe along the bottom, nailed on
  const shoe: PathFn = (c) => {
    const b = 262 - flex * 5;
    c.beginPath();
    c.moveTo(18, b - 16);
    c.bezierCurveTo(40, b - 2, 180, b - 2, 202, b - 16);
    c.bezierCurveTo(204, b - 6, 196, b + 2, 180, b + 3);
    c.lineTo(40, b + 3);
    c.bezierCurveTo(24, b + 2, 16, b - 6, 18, b - 16);
    c.closePath();
  };
  metal(g, shoe, { x: 16, y: 240, w: 188, h: 26 }, '#c9873a', { vertical: true });
  for (let k = 0; k < 7; k++) rivet(g, 40 + k * 23.5, 256 - flex * 5 - Math.sin((k / 6) * Math.PI) * 2, 2.2, '#f0d090');
  // the feathered fetlock: long pale hair falling over the top of the hoof, painted in (soft, no outline)
  g.save();
  cavLeg(g);
  g.clip();
  softFill(g, (c) => {
    c.beginPath();
    c.ellipse(CX, 176, 96, 30, 0, 0, Math.PI * 2);
  }, rgba('#d8c8a8', 0.55), 10);
  g.restore();
  for (const part of [cavLeg, hoof]) {
    g.save();
    part(g);
    g.clip();
    // the shadow the feathering casts on the hoof
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(CX, 214, 100, 18, 0, 0, Math.PI * 2);
    }, rgba('#000000', 0.45), 8);
    for (const l of locks) {
      softFill(g, l.path, lin(g, l.x - 12, l.y, l.x + 12, l.y + l.len, [
        [0, rgba(mix(hide, '#d8c4a0', 0.3), 0.85)],
        [0.5, rgba('#d8c8a8', 0.8)],
        [1, rgba('#8a7a5e', 0.15)],
      ]), 3.5);
      furCoat(g, r, { x: l.x - 10, y: l.y, w: 20, h: l.len * 0.8 }, () => l.ang + (r() - 0.5) * 0.12, '#e0d2b4', '#6a5a40', { n: 0.1, len: 24, w: 0.7 });
    }
    g.restore();
  }
  // the saddle cloth: red, a gold border, a fringe of tassels
  contact(g, (c) => {
    cavCloth(c);
    c.fill();
  }, 0.6, 3, 5);
  clip(g, cavCloth, () => {
    g.fillStyle = lin(g, 20, -8, 200, 60, [
      [0, shade(red, 0.3)],
      [0.45, red],
      [1, shade(red, -0.5)],
    ]);
    g.fillRect(0, -10, 220, 80);
    texture(g, 'canvas', { x: 0, y: -10, w: 220, h: 80 }, 0.4, 1);
    for (let k = 0; k < 3; k++) crease(g, (c) => {
      c.moveTo(60 + k * 46, -6);
      c.quadraticCurveTo(64 + k * 46, 20, 56 + k * 52, 48);
    }, 3, '#2a0408', 0.35, 0.2);
  });
  wovenBand(g, 26, 16, shade(red, -0.25), gold);
  lightAll(sil, 0.3, 18, 0.55);
  sil.finish(inkOf(hide), { openTop: -6 });
  // the tassels swing on their own in play; in a still they hang over the outline
  if (!o.live) paintTassels(ctx, gold);
}

registerStyle('cavalry', {
  contactY: 262,
  halfWidth: 92,
  rig: { from: 210, to: 230 },
  leg: { kind: 'skin', hw: 56, join: 'into' },
  // each tassel swings on its own
  parts: Object.fromEntries(
    CAV_TASSELS.map(([x, y], i) => [`t${i}`, { box: { x: x - 10, y: y - 4, w: 20, h: 36 }, frames: 1, pivot: [x, y] as Pt, draw: (g: Ctx, art: FootArt) => paintTassels(g, art.secondary ?? '#e8b43a', i) }]),
  ),
  draw(ctx, art, p, o) {
    drawCavalry(ctx, art, p, o);
  },
});

// ════════════════════════════ CHARIOT WHEEL ════════════════════════════

function drawChariot(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const leather = art.primary ?? '#8a4a24';
  const bronze = art.secondary ?? '#c9873a';
  const cloth = (art.extra?.cloth as string) ?? '#b8202a';
  const flex = Math.max(0, p.curl);
  const boot = persianBoot(flex);
  const box = { x: 6, y: -10, w: 212, h: 280 };
  const sil = new Sil(ctx, [boot, curlPath(flex), beadPath(flex)], box);
  const g = sil.g;
  bootBase(sil, 'suede', leather, flex);
  texture(g, 'leather', box, 0.3, 1.3);
  // the bronze greave over the shin, with an embossed winged sun
  const greave: PathFn = (c) => {
    c.beginPath();
    c.moveTo(40, -8);
    c.lineTo(180, -8);
    c.bezierCurveTo(186, 30, 196, 60, 198, 94);
    c.quadraticCurveTo(CX, 108, 22, 94);
    c.bezierCurveTo(24, 60, 34, 30, 40, -8);
    c.closePath();
  };
  metal(g, greave, { x: 22, y: -8, w: 176, h: 110 }, bronze);
  clip(g, greave, () => {
    texture(g, 'cast', { x: 22, y: -8, w: 176, h: 110 }, 0.25);
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(60, 40, 18, 46, 0.1, 0, Math.PI * 2);
    }, rgba('#fff4d0', 0.35), 8);
    // the shin ridge
    softStroke(g, (c) => {
      c.moveTo(CX - 2, -8);
      c.lineTo(CX - 2, 100);
    }, rgba('#fff8e0', 0.4), 3, 1.5);
    // the winged sun, raised
    const em = (dx: number, dy: number, col: string, a: number) => {
      g.save();
      g.translate(dx, dy);
      g.fillStyle = rgba(col, a);
      g.beginPath();
      g.arc(CX, 48, 8, 0, Math.PI * 2);
      for (const s of [-1, 1]) {
        g.moveTo(CX + s * 8, 46);
        g.quadraticCurveTo(CX + s * 26, 34, CX + s * 44, 38);
        g.quadraticCurveTo(CX + s * 32, 44, CX + s * 40, 50);
        g.quadraticCurveTo(CX + s * 26, 50, CX + s * 34, 58);
        g.quadraticCurveTo(CX + s * 18, 56, CX + s * 8, 52);
      }
      g.fill();
      g.restore();
    };
    em(1.4, 1.8, '#2a1404', 0.55);
    em(-0.8, -1, '#fff4c8', 0.6);
    em(0, 0, shade(bronze, 0.15), 1);
  });
  for (const x of [34, 186]) for (const y of [14, 60]) rivet(g, x + (y > 30 ? (x < CX ? -6 : 6) : 0), y, 3, '#f0d090');
  // the red cloth band
  wovenBand(g, 98, 20, cloth, '#e8c050');
  // toe wear and the seam
  stitches(g, (c) => {
    c.moveTo(CX, 122);
    c.quadraticCurveTo(CX + 4, 190, CX + 2, 238 - flex * 8);
  }, rgba('#f0c890', 0.6), 1.4, 4, 3);
  spec(g, 66, 160, 26, 40, 0.2, -0.3, '#fff0d8');
  curlBead(g, flex, bronze);
  lightAll(sil, 0.3, 18, 0.5);
  sil.finish(inkOf(leather), { openTop: -6 });
  // the scythed wheel: the game's spinning prop covers it in play
  if (!o.live) {
    ctx.save();
    ctx.translate(WHEEL_AT.x, WHEEL_AT.y);
    paintWheel(ctx);
    ctx.restore();
  }
}

registerStyle('chariot', {
  contactY: 254,
  halfWidth: 96,
  rig: { from: 176, to: 196 },
  leg: { kind: 'wool', hw: 54, join: 'into' },
  draw(ctx, art, p, o) {
    drawChariot(ctx, art, p, o);
  },
});

// ════════════════════════════ SATRAP'S SLIPPER ════════════════════════════

function paintFringe(g: Ctx, gold: string, pearlCol: string): void {
  for (let k = 0; k < 13; k++) {
    const x = 22 + k * 14.7;
    const y = 58 + 6 * (1 - ((x - CX) / 95) ** 2);
    const len = 14 + (k % 2) * 6;
    g.save();
    g.lineCap = 'round';
    g.strokeStyle = shade(gold, -0.6);
    g.lineWidth = 3.2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x, y + len);
    g.stroke();
    g.strokeStyle = lin(g, x - 2, 0, x + 2, 0, [
      [0, mix(gold, '#fffbe0', 0.5)],
      [1, shade(gold, -0.3)],
    ]);
    g.lineWidth = 1.8;
    g.stroke();
    g.restore();
    if (k % 2) pearl(g, x, y + len + 3, 3.2, pearlCol);
    else {
      g.fillStyle = gold;
      g.beginPath();
      g.arc(x, y + len + 2, 2.4, 0, Math.PI * 2);
      g.fill();
    }
  }
}

function drawSatrap(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const silk = art.primary ?? '#a8182e';
  const gold = art.secondary ?? '#f0c040';
  const pearlCol = (art.extra?.pearl as string) ?? '#fff4e8';
  const collar = art.legColor ?? '#5a1a4a';
  const flex = Math.max(0, p.curl);
  const boot = persianBoot(flex);
  const box = { x: 6, y: -10, w: 212, h: 280 };
  const sil = new Sil(ctx, [boot, curlPath(flex), beadPath(flex)], box);
  const g = sil.g;
  if (o.emissive) {
    glowDot(g, CX, 196, 20, '#ff3050', 0.8);
    glowFinish(sil);
    return;
  }
  bootBase(sil, 'silk', silk, flex);
  // the silk's long sheen and soft folds
  clip(g, boot, () => {
    streak(g, (c) => {
      c.moveTo(44, 90);
      c.bezierCurveTo(30, 140, 36, 190, 70, 226);
    }, 6, 0.3, '#ffd8e0');
    for (const [x, y] of [[150, 120], [70, 150], [160, 190]] as const) softStroke(g, (c) => {
      c.moveTo(x - 12, y - 30);
      c.quadraticCurveTo(x + 4, y, x - 4, y + 30);
    }, rgba('#2a0410', 0.25), 6, 3);
    // gold paisley embroidery
    const r = rng(711);
    for (let k = 0; k < 9; k++) {
      const x = 40 + r() * 140;
      const y = 96 + r() * 120;
      if (Math.abs(x - CX) < 22 && Math.abs(y - 196) < 30) continue;
      const s = 0.8 + r() * 0.4;
      const rot = r() * 6;
      const pz: PathFn = (c) => {
        c.save();
        c.translate(x, y);
        c.rotate(rot);
        c.scale(s, s);
        c.beginPath();
        c.moveTo(0, 8);
        c.bezierCurveTo(-10, 6, -10, -8, 0, -9);
        c.bezierCurveTo(9, -9, 10, 2, 4, 4);
        c.bezierCurveTo(1, 5, 0, 0, 3, -2);
        c.restore();
      };
      g.save();
      g.lineCap = 'round';
      pz(g);
      g.strokeStyle = rgba('#2a0408', 0.45);
      g.lineWidth = 3;
      g.stroke();
      pz(g);
      g.strokeStyle = gold;
      g.lineWidth = 1.6;
      g.stroke();
      g.restore();
    }
  });
  // the plum collar and the brocade band
  const top: PathFn = (c) => {
    c.beginPath();
    c.rect(0, -10, 230, 44);
  };
  clip(g, boot, () => {
    top(g);
    g.fillStyle = lin(g, 0, -8, 0, 36, [
      [0, shade(collar, 0.2)],
      [1, shade(collar, -0.35)],
    ]);
    g.fill();
    texture(g, 'canvas', { x: 0, y: -10, w: 230, h: 44 }, 0.2, 0.8);
  });
  wovenBand(g, 30, 26, shade(gold, -0.05), shade(gold, -0.3), '#c8102e');
  paintFringe(g, gold, pearlCol);
  // the strand of pearls
  for (let k = 0; k < 16; k++) {
    const x = 30 + k * 10.6;
    const y = 92 + 10 * (1 - ((x - CX) / 82) ** 2);
    pearl(g, x, y, 3.8, pearlCol);
  }
  // the ruby in its gold setting
  metal(g, (c) => {
    c.beginPath();
    c.moveTo(CX, 176);
    c.lineTo(CX + 16, 196);
    c.lineTo(CX, 216);
    c.lineTo(CX - 16, 196);
    c.closePath();
  }, { x: CX - 16, y: 176, w: 32, h: 40 }, gold);
  gem(g, CX, 196, 9, '#c8102e', 'diamond');
  curlBead(g, flex, gold, 'pearl');
  lightAll(sil, 0.3, 18, 0.55);
  sil.finish(inkOf(silk), { openTop: -6 });
}

registerStyle('satrap', {
  contactY: 254,
  halfWidth: 96,
  // the band sits below the ruby, so its glow isn't cut off the posed band
  rig: { from: 216, to: 236 },
  leg: { kind: 'wool', hw: 52, join: 'into' },
  draw(ctx, art, p, o) {
    drawSatrap(ctx, art, p, o);
  },
});
