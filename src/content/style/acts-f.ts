// Batch F in the style kit, part 1: Batpeel's Gotham.
// - BUNION (mini-boss): a hulking high-top wrestling boot in charcoal leather, laced tight under a studded strap, its
//   padded collar fed by three ribbed Venom hoses from chrome vial clamps (the vials are props in play, at VIALS),
//   swollen green veins glowing through the leather and a lugged slab sole with a venom-green welt.
// - THE JOKESTER (boss): a plum pinstriped winklepicker whose long toe curls up into a spiral with a red pompom, an
//   acid-green spat buttoned up the side with a playing card tucked in it, a lapel flower (his laughing gas comes out
//   of it in play, at FLOWER), a stacked heel and a painted white face with sly eyes and a huge red grin.
// Parodies with looks of our own. The old art (src/content/art/gotham.ts) keeps the anchors the fights use.

import type { FootArt } from '../../data/feet';
import { BUNION_CONTACT, FLOWER, VIALS } from '../art/gotham';
import { type PathFn, type Pose, crease, glint, inkOf, softStroke, spec, texture } from '../../art/style/kit';
import { Sil } from '../../art/style/sil';
import { registerStyle } from '../../art/style/registry';
import { blotches, contact, eyelet, laceRun, rivet, stitches } from '../../art/style/details';
import { clip, glowDot, glowFinish, heatLayer, lightAll, lin, rad, streak } from '../../art/style/kit-bosses';
import { type Ctx, mix, rgba, shade } from '../../art/util';
import { CX, type Opts, type Pt, glowLine, lifted, metal, partSil, tube, tubeShade } from './acts-f-kit';

// ════════════════════════════ BUNION ════════════════════════════

const bunionUpper = (flex: number): PathFn => (c) => {
  const b = 252 - flex * 6;
  c.beginPath();
  c.moveTo(CX - 64, -6);
  c.bezierCurveTo(CX - 78, 30, CX - 98, 70, CX - 100, 120);
  c.bezierCurveTo(CX - 102, 160, CX - 112, 196, CX - 108, 222);
  c.bezierCurveTo(CX - 104, b - 8, CX - 70, b, CX, b);
  c.bezierCurveTo(CX + 70, b, CX + 104, b - 8, CX + 108, 222);
  c.bezierCurveTo(CX + 112, 196, CX + 102, 160, CX + 100, 120);
  c.bezierCurveTo(CX + 98, 70, CX + 78, 30, CX + 64, -6);
  c.closePath();
};

const bunionSole = (flex: number): PathFn => (c) => {
  const b = BUNION_CONTACT - flex * 5;
  c.beginPath();
  c.moveTo(CX - 110, 214);
  c.bezierCurveTo(CX - 116, 236, CX - 116, b - 4, CX - 98, b);
  c.lineTo(CX + 98, b);
  c.bezierCurveTo(CX + 116, b - 4, CX + 116, 236, CX + 110, 214);
  c.quadraticCurveTo(CX, 232, CX - 110, 214);
  c.closePath();
};

const bunionCollar: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 66, -8);
  c.lineTo(CX + 66, -8);
  c.bezierCurveTo(CX + 74, 6, CX + 76, 18, CX + 72, 26);
  c.quadraticCurveTo(CX, 36, CX - 72, 26);
  c.bezierCurveTo(CX - 76, 18, CX - 74, 6, CX - 66, -8);
  c.closePath();
};

/** The chrome clamp a vial sits in (top and bottom brackets), at a VIALS point. */
const clampPaths = (vx: number, vy: number): PathFn[] => [
  (c) => {
    c.beginPath();
    c.roundRect(vx - 22, vy - 46, 44, 14, 5);
  },
  (c) => {
    c.beginPath();
    c.roundRect(vx - 22, vy + 32, 44, 14, 5);
  },
];

/** The three hoses (from each clamp up into the collar), as points. */
function bunionHoses(): Pt[][] {
  const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt): Pt[] =>
    Array.from({ length: 21 }, (_, i) => {
      const t = i / 20;
      const u = 1 - t;
      return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
    });
  const [l, t, r] = VIALS;
  return [
    bez([l[0] + 8, l[1] - 46], [l[0] + 22, l[1] - 90], [CX - 56, 70], [CX - 50, 22]),
    bez([r[0] - 8, r[1] - 46], [r[0] - 22, r[1] - 90], [CX + 56, 70], [CX + 50, 22]),
    bez([t[0] + 22, t[1] - 40], [t[0] + 58, t[1] - 90], [CX + 40, 80], [CX + 34, 24]),
  ];
}

function paintHose(g: Ctx, pts: Pt[], venom: string): void {
  const path = tube(pts, () => 6.5);
  contact(g, (c) => {
    path(c);
    c.fill();
  }, 0.6, 3, 4);
  path(g);
  g.fillStyle = '#1e2622';
  g.fill();
  clip(g, path, () => {
    // the translucent green core and its glow through the rubber
    g.save();
    g.lineCap = 'round';
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.strokeStyle = rgba(venom, 0.45);
    g.lineWidth = 5;
    g.stroke();
    g.restore();
    tubeShade(g, pts, 13, '#3a4a40', 0.7);
    // ribs
    for (let i = 1; i < pts.length - 1; i += 1) {
      const [x, y] = pts[i];
      const [nx, ny] = pts[i + 1];
      const a = Math.atan2(ny - y, nx - x) + Math.PI / 2;
      g.strokeStyle = rgba('#05080a', 0.55);
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7);
      g.lineTo(x - Math.cos(a) * 7, y - Math.sin(a) * 7);
      g.stroke();
    }
  });
  path(g);
  g.strokeStyle = '#0c1210';
  g.lineWidth = 1.6;
  g.stroke();
}

/** Swollen veins over the leather (the Venom showing through), as point lists. */
const BUNION_VEINS: Pt[][] = [
  [[CX - 92, 150], [CX - 80, 140], [CX - 74, 118], [CX - 62, 108], [CX - 56, 92]],
  [[CX - 74, 118], [CX - 86, 104], [CX - 84, 88]],
  [[CX + 92, 160], [CX + 82, 146], [CX + 80, 126], [CX + 66, 112], [CX + 62, 96]],
  [[CX + 80, 126], [CX + 92, 112]],
  [[CX - 60, 196], [CX - 44, 186], [CX - 36, 170], [CX - 40, 154]],
  [[CX + 54, 200], [CX + 42, 188], [CX + 46, 172]],
];

function drawBunion(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const hide = art.primary ?? '#2c2e36';
  const venom = art.secondary ?? '#7dff6a';
  const flex = Math.max(0, p.curl);
  const upper = bunionUpper(flex);
  const sole = bunionSole(flex);
  const clamps = VIALS.flatMap(([x, y]) => clampPaths(x, y));
  const box = { x: CX - 122, y: -10, w: 244, h: 288 };
  const sil = new Sil(ctx, [upper, sole, bunionCollar, ...clamps], box);
  const g = sil.g;
  const hoses = bunionHoses();
  if (o.heat) {
    heatLayer(sil, box, { seed: 601, y0: 272, y1: 10 });
    return;
  }
  if (o.emissive) {
    // the veins, the hose cores and the empty sockets glow
    for (const v of BUNION_VEINS) glowLine(g, v, 2.6, venom, 0.85);
    for (const h of hoses) glowLine(g, h, 2.2, venom, 0.55);
    for (const [vx, vy] of VIALS) glowDot(g, vx, vy, 26, venom, 0.45);
    glowFinish(sil);
    return;
  }
  sil.form({ base: hide, shadowTint: '#06080e', ramp: 0.8, form: 0.6, formSize: 30, bevel: 0.35, rim: 0.6 });
  texture(g, 'leather', box, 0.35, 1.5);
  // polished ring leather: a broad sheen down the lit side and a long highlight
  spec(g, CX - 66, 120, 34, 90, 0.22, 0.1, '#dfe8ff');
  streak(g, (c) => {
    c.moveTo(CX - 82, 44);
    c.bezierCurveTo(CX - 92, 100, CX - 96, 150, CX - 98, 196);
  }, 3, 0.35, '#e8eeff');
  // side panels: thick padded leather, quilted down the sides
  clip(g, upper, () => {
    g.fillStyle = lin(g, CX - 100, 0, CX + 110, 0, [
      [0, rgba('#ffffff', 0.05)],
      [0.25, rgba('#ffffff', 0.12)],
      [0.5, rgba('#000000', 0)],
      [0.85, rgba('#000000', 0.3)],
      [1, rgba('#9ab8ff', 0.12)],
    ]);
    g.fillRect(box.x, box.y, box.w, box.h);
    for (const s of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        const y = 40 + k * 38;
        crease(g, (c) => {
          c.moveTo(CX + s * 40, y);
          c.quadraticCurveTo(CX + s * 70, y + 8, CX + s * 104, y + 2);
        }, 2.4, '#000000', 0.45, 0.12);
      }
    }
    // the scuffed toe cap from the ring: lighter worn leather and a stitched seam round it
    const cap: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 108, 220);
      c.bezierCurveTo(CX - 86, 178, CX + 86, 178, CX + 108, 220);
      c.lineTo(CX + 108, 260);
      c.lineTo(CX - 108, 260);
      c.closePath();
    };
    clip(g, cap, () => {
      g.fillStyle = rgba(shade(hide, 0.25), 0.55);
      g.fillRect(box.x, 170, box.w, 100);
      blotches(g, { x: CX - 108, y: 180, w: 216, h: 80 }, shade(hide, 0.5), 0.18, 6, 0.64, 0.12, 607);
      spec(g, CX - 40, 212 - flex * 4, 40, 12, 0.32, -0.25);
    });
    stitches(g, (c) => {
      c.moveTo(CX - 106, 222);
      c.bezierCurveTo(CX - 84, 184, CX + 84, 184, CX + 106, 222);
    }, rgba('#c8ccd4', 0.6), 1.5, 4, 3);
    crease(g, (c) => {
      c.moveTo(CX - 108, 220);
      c.bezierCurveTo(CX - 86, 178, CX + 86, 178, CX + 108, 220);
    }, 3, '#000000', 0.5, 0.2);
    // the tongue under the laces
    const tongue: PathFn = (c) => {
      c.beginPath();
      c.roundRect(CX - 26, 18, 52, 160, 12);
    };
    lifted(g, tongue, lin(g, CX - 26, 0, CX + 26, 0, [
      [0, shade(hide, 0.28)],
      [0.5, shade(hide, 0.1)],
      [1, shade(hide, -0.3)],
    ]), 0.5);
    clip(g, tongue, () => texture(g, 'leather', box, 0.3, 1.2));
  });
  // veins under the leather: raised ridges with green showing through
  for (const [i, v] of BUNION_VEINS.entries()) {
    const w = i % 2 ? 3.4 : 5;
    const run = (dx: number, dy: number) => (c: Ctx) => v.forEach(([x, y], j) => (j ? c.lineTo(x + dx, y + dy) : c.moveTo(x + dx, y + dy)));
    softStroke(g, run(0, 0), rgba(venom, 0.28), w * 3.2, 5);
    softStroke(g, run(1.5, 2), rgba('#000000', 0.6), w + 2, 1.5);
    softStroke(g, run(0, 0), rgba(mix(venom, '#0a2a0a', 0.45), 1), w, 0.5);
    softStroke(g, run(-0.8, -1), rgba(mix(venom, '#ffffff', 0.35), 0.75), w * 0.4, 0.3);
  }
  // laces: white, criss-cross through steel eyelets
  const ys = [30, 58, 86, 114, 142, 168];
  for (let i = ys.length - 1; i > 0; i--) for (const s of [-1, 1]) laceRun(g, CX - s * 22, ys[i], CX + s * 22, ys[i - 1], '#ece8de', 4.6);
  for (const y of ys) for (const s of [-1, 1]) eyelet(g, CX + s * 23, y, 4, '#c8ccd4');
  // the studded strap across the calf, and its chrome buckle
  const strapP: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 98, 72);
    c.quadraticCurveTo(CX, 86, CX + 98, 72);
    c.lineTo(CX + 99, 96);
    c.quadraticCurveTo(CX, 110, CX - 99, 96);
    c.closePath();
  };
  contact(g, (c) => {
    strapP(c);
    c.fill();
  }, 0.6, 3, 4);
  clip(g, strapP, () => {
    g.fillStyle = lin(g, 0, 72, 0, 108, [
      [0, '#5a5e68'],
      [0.25, '#3a3d46'],
      [0.6, '#1a1b20'],
      [1, '#0a0a0e'],
    ]);
    g.fillRect(box.x, 60, box.w, 60);
    texture(g, 'leather', box, 0.35, 1.2);
  });
  stitches(g, (c) => {
    c.moveTo(CX - 96, 76);
    c.quadraticCurveTo(CX, 90, CX + 96, 76);
    c.moveTo(CX - 96, 93);
    c.quadraticCurveTo(CX, 107, CX + 96, 93);
  }, rgba('#a8acb4', 0.55), 1.2, 3, 2.5);
  for (const k of [-3, -2, 2, 3]) rivet(g, CX + k * 24, 85 + (1 - Math.abs(k * 24) / 100) * 7, 4.2, '#c8ccd4');
  const buckle: PathFn = (c) => {
    c.beginPath();
    c.roundRect(CX - 20, 74, 40, 34, 6);
    c.roundRect(CX - 11, 82, 22, 18, 3);
  };
  contact(g, (c) => {
    buckle(c);
    c.fill('evenodd');
  }, 0.6, 2.4, 3);
  g.save();
  buckle(g);
  g.fillStyle = lin(g, CX - 20, 74, CX + 20, 108, [
    [0, '#ffffff'],
    [0.3, '#c8ccd4'],
    [0.55, '#4a4e58'],
    [0.8, '#dfe4ea'],
    [1, '#5a5e68'],
  ]);
  g.fill('evenodd');
  g.restore();
  glint(g, CX - 12, 80, 5, 1);
  // the hoses, from each clamp up into the collar
  for (const h of hoses) paintHose(g, h, venom);
  // the vial clamps and their empty sockets (the vials themselves are props in play)
  for (const [vx, vy] of VIALS) {
    const sock: PathFn = (c) => {
      c.beginPath();
      c.roundRect(vx - 14, vy - 34, 28, 68, 10);
    };
    contact(g, (c) => {
      sock(c);
      c.fill();
    }, 0.6, 2, 3);
    sock(g);
    g.fillStyle = rad(g, vx, vy, 2, vx, vy, 36, [
      [0, rgba(mix(venom, '#0a120c', 0.55), 1)],
      [1, '#06090a'],
    ]);
    g.fill();
    spec(g, vx - 5, vy - 14, 4, 16, 0.4, -0.1);
    for (const cp of clampPaths(vx, vy)) metal(g, cp, { x: vx - 22, y: vy - 46, w: 44, h: 14 }, '#aab2bc', { vertical: true });
    for (const dy of [-39, 39]) for (const s of [-1, 1]) rivet(g, vx + s * 15, vy + dy, 2.2, '#e0e4ea');
  }
  // the padded collar, rolled over the top
  contact(g, (c) => {
    bunionCollar(c);
    c.fill();
  }, 0.6, 3, 5);
  clip(g, bunionCollar, () => {
    g.fillStyle = lin(g, 0, -8, 0, 32, [
      [0, shade(hide, 0.1)],
      [0.35, shade(hide, 0.4)],
      [0.75, shade(hide, 0.05)],
      [1, shade(hide, -0.45)],
    ]);
    g.fillRect(box.x, -10, box.w, 50);
    texture(g, 'leather', box, 0.3, 1.2);
    for (let k = -3; k <= 3; k++) crease(g, (c) => {
      c.moveTo(CX + k * 20, 0);
      c.lineTo(CX + k * 21, 28);
    }, 1.6, '#000000', 0.35, 0.1);
  });
  stitches(g, (c) => {
    c.moveTo(CX - 70, 22);
    c.quadraticCurveTo(CX, 31, CX + 70, 22);
  }, rgba('#a8acb4', 0.5), 1.2, 3, 2.5);
  // where the hoses plug into the collar: chrome couplings
  for (const h of hoses) {
    const [x, y] = h[h.length - 1];
    metal(g, (c) => {
      c.beginPath();
      c.roundRect(x - 9, y - 6, 18, 12, 3);
    }, { x: x - 9, y: y - 6, w: 18, h: 12 }, '#c8ccd4', { vertical: true });
  }
  // the slab sole: lugged black rubber with a venom-green welt
  clip(g, sole, () => {
    g.fillStyle = lin(g, 0, 214, 0, 274, [
      [0, '#2a2c30'],
      [0.4, '#16171a'],
      [1, '#08080a'],
    ]);
    g.fillRect(box.x, 200, box.w, 80);
    texture(g, 'rubber', box, 0.4);
    for (let i = 0; i < 12; i++) {
      const x = CX - 100 + i * 18.2;
      g.fillStyle = rgba('#000000', 0.55);
      g.fillRect(x, 258 - flex * 5, 10, 16);
      g.fillStyle = rgba('#ffffff', 0.06);
      g.fillRect(x, 258 - flex * 5, 2, 12);
    }
    streak(g, (c) => {
      c.moveTo(CX - 86, 248);
      c.quadraticCurveTo(CX - 40, 252, CX + 10, 250);
    }, 2, 0.2);
  });
  softStroke(g, (c) => {
    c.moveTo(CX - 110, 232);
    c.quadraticCurveTo(CX, 246 - flex * 4, CX + 110, 232);
  }, rgba(venom, 0.85), 2.6, 0.4);
  crease(g, (c) => {
    c.moveTo(CX - 110, 226);
    c.quadraticCurveTo(CX, 240 - flex * 4, CX + 110, 226);
  }, 3, '#000000', 0.6, 0.2);
  lightAll(sil, 0.35, 22, 0.65);
  sil.finish(inkOf(hide), { openTop: -6 });
}

registerStyle('bunion', {
  contactY: BUNION_CONTACT,
  halfWidth: 112,
  rig: { from: 214, to: 236 },
  leg: { kind: 'skin', hw: 58, join: 'into' },
  draw(ctx, art, p, o) {
    drawBunion(ctx, art, p, o);
  },
});

// ════════════════════════════ THE JOKESTER ════════════════════════════

const JOKE_POM = { x: CX + 134, y: 162 };

const jokesterBody: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 50, -6);
  c.bezierCurveTo(CX - 54, 50, CX - 86, 100, CX - 92, 150);
  c.bezierCurveTo(CX - 96, 200, CX - 96, 238, CX - 80, 254);
  c.bezierCurveTo(CX - 50, 264, CX + 10, 262, CX + 60, 257);
  c.bezierCurveTo(CX + 100, 252, CX + 130, 236, CX + 146, 206);
  c.bezierCurveTo(CX + 152, 192, CX + 150, 174, CX + 138, 166);
  c.bezierCurveTo(CX + 132, 176, CX + 128, 192, CX + 120, 200);
  c.bezierCurveTo(CX + 100, 220, CX + 80, 212, CX + 72, 190);
  c.bezierCurveTo(CX + 64, 150, CX + 66, 100, CX + 64, 60);
  c.bezierCurveTo(CX + 58, 30, CX + 52, 14, CX + 50, -6);
  c.closePath();
};

const jokesterHeel: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 94, 236);
  c.lineTo(CX - 50, 244);
  c.lineTo(CX - 54, 263);
  c.quadraticCurveTo(CX - 72, 265, CX - 90, 263);
  c.closePath();
};

const jokesterSpat: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 56, -8);
  c.bezierCurveTo(CX - 60, 30, CX - 70, 62, CX - 82, 88);
  c.quadraticCurveTo(CX, 110, CX + 80, 78);
  c.bezierCurveTo(CX + 66, 40, CX + 58, 20, CX + 54, -8);
  c.closePath();
};

const jokesterFace: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 4, 128);
  c.bezierCurveTo(CX + 40, 132, CX + 70, 160, CX + 72, 196);
  c.bezierCurveTo(CX + 50, 236, CX + 10, 246, CX - 22, 238);
  c.bezierCurveTo(CX - 62, 226, CX - 80, 200, CX - 72, 174);
  c.bezierCurveTo(CX - 62, 146, CX - 36, 130, CX - 4, 128);
  c.closePath();
};

const flowerPaths = (): PathFn[] => {
  const F = FLOWER;
  const out: PathFn[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    out.push((c) => {
      c.beginPath();
      c.ellipse(F.x + Math.cos(a) * 11, F.y + Math.sin(a) * 11, 10, 6.5, a, 0, Math.PI * 2);
    });
  }
  return out;
};

const JOKE_EYES: [number, number, number][] = [
  [CX - 30, 164, -0.25],
  [CX + 22, 162, 0.25],
];

/** The sly eyes (whites, green irises and lids): `shut` 0 open … 1 shut. Painted over the diamond paint. */
function jokeEyes(g: Ctx, skin: string, shut: number): void {
  for (const [ex, ey, rot] of JOKE_EYES) {
    g.save();
    g.translate(ex, ey);
    g.rotate(rot);
    const eye: PathFn = (c) => {
      c.beginPath();
      c.moveTo(-10, 1);
      c.quadraticCurveTo(0, -7, 10, 1);
      c.quadraticCurveTo(0, 7, -10, 1);
      c.closePath();
    };
    eye(g);
    g.fillStyle = lin(g, 0, -6, 0, 6, [
      [0, '#e8e0cc'],
      [1, '#fffaf0'],
    ]);
    g.fill();
    clip(g, eye, () => {
      g.fillStyle = rad(g, 2.5, 1, 0.5, 2.5, 1, 4.6, [
        [0, '#0a1a0a'],
        [0.3, '#1e7a22'],
        [0.8, '#4ad04a'],
        [1, '#1a4a1a'],
      ]);
      g.beginPath();
      g.arc(2.5, 1, 4.6, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(1.2, -0.8, 1.3, 0, Math.PI * 2);
      g.fill();
      // the upper lid's shadow, and the lid closing over it
      g.fillStyle = rgba('#3a1a5a', 0.35);
      g.fillRect(-12, -8, 24, 4);
      if (shut > 0) {
        g.fillStyle = lin(g, 0, -8, 0, 8, [
          [0, mix(skin, '#3a1a5a', 0.3)],
          [1, mix(skin, '#3a1a5a', 0.1)],
        ]);
        g.fillRect(-12, -8, 24, 15 * shut);
      }
    });
    eye(g);
    g.strokeStyle = '#1a0e22';
    g.lineWidth = 1.6;
    g.stroke();
    // a sly heavy upper lash line
    g.beginPath();
    g.moveTo(-11, 1);
    g.quadraticCurveTo(0, -7.5 + shut * 8, 11, 0);
    g.strokeStyle = '#1a0e22';
    g.lineWidth = 2.4;
    g.stroke();
    g.restore();
  }
}

function paintPom(g: Ctx, red: string): void {
  const { x, y } = JOKE_POM;
  partSil(g, [(c) => {
    c.beginPath();
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      const r = 13 + (k % 2 ? 1.6 : -0.6);
      if (k) c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      else c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    c.closePath();
  }], { x: x - 16, y: y - 16, w: 32, h: 32 }, (pg) => {
    pg.fillStyle = rad(pg, x - 4, y - 5, 1, x, y, 15, [
      [0, mix(red, '#ffffff', 0.45)],
      [0.45, red],
      [1, shade(red, -0.55)],
    ]);
    pg.fillRect(x - 16, y - 16, 32, 32);
    texture(pg, 'fleece', { x: x - 16, y: y - 16, w: 32, h: 32 }, 0.6, 0.9);
    glint(pg, x - 5, y - 6, 3, 0.8);
  }, inkOf(red));
}

function drawJokester(ctx: Ctx, art: FootArt, _p: Pose, o: Opts): void {
  const plum = art.primary ?? '#5b2a86';
  const lime = art.secondary ?? '#9be23a';
  const red = (art.extra?.grin as string) ?? '#e0202a';
  const skin = art.skin;
  const box = { x: CX - 104, y: -10, w: 262, h: 280 };
  const flower = flowerPaths();
  const sil = new Sil(ctx, [jokesterBody, jokesterHeel, ...flower], box);
  const g = sil.g;
  if (o.heat) {
    heatLayer(sil, box, { seed: 611, y0: 262, y1: 20 });
    return;
  }
  if (o.emissive) {
    // the grin and eye paint glow faintly (a clown's greasepaint under stage lights)
    glowDot(g, FLOWER.x, FLOWER.y, 18, lime, 0.5);
    glowFinish(sil);
    return;
  }
  sil.form({ base: plum, shadowTint: '#12041e', ramp: 0.8, form: 0.55, formSize: 28, bevel: 0.4, rim: 0.6 });
  // pinstripes following the curve of the shoe, then the patent sheen
  clip(g, jokesterBody, () => {
    g.save();
    g.lineWidth = 1.2;
    g.strokeStyle = rgba(mix(plum, '#e8c8ff', 0.6), 0.4);
    for (let k = -8; k <= 12; k++) {
      g.beginPath();
      const x0 = CX + k * 11;
      g.moveTo(x0, -10);
      g.bezierCurveTo(x0 - 4, 100, x0 - 10 + k * 2, 180, x0 + 20 + k * 6, 270);
      g.stroke();
    }
    g.restore();
    texture(g, 'leather', box, 0.18, 1.2);
    streak(g, (c) => {
      c.moveTo(CX - 74, 120);
      c.bezierCurveTo(CX - 82, 170, CX - 80, 210, CX - 66, 236);
    }, 3, 0.5);
    streak(g, (c) => {
      c.moveTo(CX + 84, 222);
      c.bezierCurveTo(CX + 108, 214, CX + 128, 200, CX + 138, 178);
    }, 2.4, 0.45);
    // the curl's spiral crease winding to the tip
    crease(g, (c) => {
      c.moveTo(CX + 74, 236);
      c.bezierCurveTo(CX + 104, 232, CX + 128, 220, CX + 138, 196);
      c.quadraticCurveTo(CX + 142, 182, CX + 134, 176);
    }, 2.6, '#12041e', 0.55, 0.25);
    // the sole: a thin lime welt from the heel round to the tip of the toe
    g.save();
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(CX - 92, 248);
    g.bezierCurveTo(CX - 40, 262, CX + 40, 262, CX + 80, 254);
    g.bezierCurveTo(CX + 110, 248, CX + 132, 234, CX + 146, 208);
    g.strokeStyle = '#140a1c';
    g.lineWidth = 8;
    g.stroke();
    g.strokeStyle = lime;
    g.lineWidth = 2.4;
    g.stroke();
    g.restore();
  });
  // the stacked heel
  clip(g, jokesterHeel, () => {
    g.fillStyle = lin(g, CX - 94, 236, CX - 50, 264, [
      [0, '#4a3460'],
      [0.5, '#24162e'],
      [1, '#0c0612'],
    ]);
    g.fillRect(CX - 100, 230, 60, 40);
    for (const y of [248, 256]) {
      g.fillStyle = rgba('#000000', 0.45);
      g.fillRect(CX - 100, y, 60, 1.5);
      g.fillStyle = rgba('#d8b8ff', 0.25);
      g.fillRect(CX - 100, y + 1.5, 60, 1);
    }
  });
  // the acid-green spat, buttoned up the side
  contact(g, (c) => {
    jokesterSpat(c);
    c.fill();
  }, 0.6, 3, 5);
  clip(g, jokesterSpat, () => {
    g.fillStyle = lin(g, CX - 70, -6, CX + 80, 110, [
      [0, shade(lime, 0.35)],
      [0.45, lime],
      [1, mix(shade(lime, -0.55), '#1a3a10', 0.3)],
    ]);
    g.fillRect(box.x, -10, box.w, 130);
    texture(g, 'canvas', box, 0.35, 1);
    spec(g, CX - 30, 30, 30, 50, 0.25, 0.3);
    g.fillStyle = lin(g, 0, 60, 0, 104, [
      [0, rgba('#000000', 0)],
      [1, rgba('#0a2004', 0.4)],
    ]);
    g.fillRect(box.x, 60, box.w, 50);
  });
  stitches(g, (c) => {
    c.moveTo(CX - 76, 82);
    c.quadraticCurveTo(CX, 102, CX + 74, 74);
  }, rgba('#f4ffe0', 0.6), 1.2, 3, 2.5);
  for (let k = 0; k < 3; k++) {
    const y = 16 + k * 24;
    const x = CX - 50 - k * 7;
    contact(g, (c) => {
      c.beginPath();
      c.arc(x, y, 6, 0, Math.PI * 2);
      c.fill();
    }, 0.5, 1.8, 2);
    g.fillStyle = rad(g, x - 2, y - 2, 0.5, x, y, 6.5, [
      [0, '#c89af0'],
      [0.6, '#7a3ab0'],
      [1, '#3a1460'],
    ]);
    g.beginPath();
    g.arc(x, y, 6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = rgba('#1a0a2a', 0.6);
    for (const [dx, dy] of [[-1.6, -1.6], [1.6, 1.6]]) {
      g.beginPath();
      g.arc(x + dx, y + dy, 0.9, 0, Math.PI * 2);
      g.fill();
    }
    glint(g, x - 2.5, y - 2.5, 2.2, 0.9);
  }
  // a playing card tucked in the spat: a slice suit of our own, not a real card
  g.save();
  g.translate(CX + 38, 48);
  g.rotate(0.32);
  const card: PathFn = (c) => {
    c.beginPath();
    c.roundRect(-19, -30, 38, 54, 5);
  };
  contact(g, (c) => {
    card(c);
    c.fill();
  }, 0.5, 2.5, 3);
  card(g);
  g.fillStyle = lin(g, -19, -30, 19, 24, [
    [0, '#fffdf4'],
    [1, '#e4dcc8'],
  ]);
  g.fill();
  g.strokeStyle = rgba('#2a1a10', 0.7);
  g.lineWidth = 1.4;
  g.stroke();
  // a pizza-slice pip
  g.beginPath();
  g.moveTo(-9, -6);
  g.quadraticCurveTo(0, -12, 9, -6);
  g.lineTo(0, 12);
  g.closePath();
  g.fillStyle = lin(g, 0, -12, 0, 12, [
    [0, '#f2c14e'],
    [0.3, red],
    [1, shade(red, -0.3)],
  ]);
  g.fill();
  g.fillStyle = '#f2c14e';
  g.fillRect(-9, -9, 18, 3);
  g.font = "16px 'Lilita One', Impact, sans-serif";
  g.fillStyle = '#2a1a10';
  g.fillText('J', -16, -14);
  // the bit tucked in under the spat's edge
  g.fillStyle = lin(g, 0, 14, 0, 24, [
    [0, rgba('#000000', 0)],
    [1, rgba('#0a2004', 0.45)],
  ]);
  g.fillRect(-19, 12, 38, 12);
  g.restore();
  // the painted face on the vamp: white greasepaint over the leather
  contact(g, (c) => {
    jokesterFace(c);
    c.fill();
  }, 0.3, 1.5, 3);
  clip(g, jokesterFace, () => {
    g.fillStyle = lin(g, CX - 70, 130, CX + 70, 240, [
      [0, '#ffffff'],
      [0.45, skin],
      [1, mix(skin, '#8a6ab0', 0.35)],
    ]);
    g.fillRect(CX - 90, 120, 180, 130);
    texture(g, 'pores', { x: CX - 90, y: 120, w: 180, h: 130 }, 0.25, 1, 'soft-light');
    spec(g, CX - 30, 150, 34, 16, 0.35, -0.3);
    // diamond eye paint
    for (const [ex, ey, rot] of JOKE_EYES) {
      g.save();
      g.translate(ex, ey);
      g.rotate(rot);
      g.beginPath();
      g.moveTo(0, -17);
      g.quadraticCurveTo(4, -4, 11, 0);
      g.quadraticCurveTo(4, 4, 0, 17);
      g.quadraticCurveTo(-4, 4, -11, 0);
      g.quadraticCurveTo(-4, -4, 0, -17);
      g.fillStyle = rgba('#3a1a5a', 0.85);
      g.fill();
      g.restore();
    }
    // the grin: corner to corner, a wet red with a row of teeth
    const grinP: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 54, 188);
      c.quadraticCurveTo(CX - 6, 240, CX + 54, 184);
      c.quadraticCurveTo(CX - 4, 212, CX - 54, 188);
      c.closePath();
    };
    softStroke(g, (c) => {
      c.moveTo(CX - 58, 186);
      c.quadraticCurveTo(CX - 6, 244, CX + 58, 182);
    }, rgba(red, 0.35), 8, 3);
    grinP(g);
    g.fillStyle = lin(g, 0, 190, 0, 222, [
      [0, shade(red, -0.45)],
      [0.5, red],
      [1, shade(red, -0.25)],
    ]);
    g.fill();
    clip(g, grinP, () => {
      g.fillStyle = lin(g, 0, 196, 0, 206, [
        [0, '#fffcf0'],
        [1, '#d8cfb8'],
      ]);
      g.beginPath();
      g.moveTo(CX - 50, 194);
      g.quadraticCurveTo(CX - 4, 214, CX + 50, 190);
      g.lineTo(CX + 50, 200);
      g.quadraticCurveTo(CX - 4, 224, CX - 50, 204);
      g.closePath();
      g.fill();
      g.strokeStyle = rgba('#5a3a2a', 0.55);
      g.lineWidth = 1.2;
      for (let x = CX - 40; x < CX + 46; x += 10) {
        g.beginPath();
        g.moveTo(x, 190);
        g.lineTo(x + 1, 218);
        g.stroke();
      }
      g.fillStyle = rgba('#3a0408', 0.55);
      g.fillRect(CX - 60, 208, 120, 20);
    });
    grinP(g);
    g.strokeStyle = rgba('#2a0408', 0.9);
    g.lineWidth = 1.8;
    g.stroke();
    spec(g, CX - 20, 212, 14, 3, 0.7, 0.2);
    // smile creases at the corners
    for (const s of [-1, 1]) crease(g, (c) => {
      c.arc(CX + s * 58, 184 + (s < 0 ? 4 : 0), 8, s < 0 ? -0.4 : Math.PI - 0.6, s < 0 ? 1.4 : Math.PI + 1.2);
    }, 2, '#3a1a3a', 0.6, 0.2);
  });
  if (!o.live) jokeEyes(g, skin, 0);
  // the lapel flower (his laughing gas comes out of it in play)
  const F = FLOWER;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    const petal = flower[k];
    contact(g, (c) => {
      petal(c);
      c.fill();
    }, 0.35, 1.5, 2);
    petal(g);
    g.fillStyle = rad(g, F.x + Math.cos(a) * 6 - 3, F.y + Math.sin(a) * 6 - 3, 1, F.x + Math.cos(a) * 11, F.y + Math.sin(a) * 11, 12, [
      [0, '#ffffff'],
      [0.6, '#f4ecdc'],
      [1, '#b8a8c8'],
    ]);
    g.fill();
    g.strokeStyle = rgba('#6a5a7a', 0.6);
    g.lineWidth = 1;
    g.stroke();
  }
  lifted(g, (c) => {
    c.beginPath();
    c.arc(F.x, F.y, 7.5, 0, Math.PI * 2);
  }, rad(g, F.x - 2, F.y - 2, 0.5, F.x, F.y, 8, [
    [0, shade(lime, 0.5)],
    [0.6, lime],
    [1, shade(lime, -0.5)],
  ]), 0.5);
  glint(g, F.x - 2.5, F.y - 2.5, 2.6, 0.9);
  lightAll(sil, 0.35, 20, 0.6);
  sil.finish(inkOf(plum), { openTop: -6 });
  // the pompom bobs on its own in play; in a still it sits on the tip, over the outline
  if (!o.live) paintPom(ctx, red);
}

registerStyle('jokester', {
  contactY: FLOWER.contact,
  halfWidth: 118,
  leg: { kind: 'wool', hw: 50, join: 'hem' },
  parts: {
    pom: {
      box: { x: JOKE_POM.x - 18, y: JOKE_POM.y - 18, w: 36, h: 36 },
      frames: 1,
      pivot: [JOKE_POM.x + 2, JOKE_POM.y + 12],
      draw: (g, art) => paintPom(g, (art.extra?.grin as string) ?? '#e0202a'),
    },
    eyes: {
      box: { x: CX - 46, y: 146, w: 86, h: 36 },
      frames: 4,
      draw: (g, art, i) => jokeEyes(g, art.skin, [0, 0.45, 0.8, 1][i]),
    },
  },
  draw(ctx, art, p, o) {
    drawJokester(ctx, art, p, o);
  },
});

