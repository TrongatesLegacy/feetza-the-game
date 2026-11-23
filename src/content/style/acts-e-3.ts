// The Act 10 finale fights in the style kit (batch E, part 3).
// - THE MIRROR PEEL: an obsidian mirror cast as a pizza peel: a dark iron handle into a riveted ferrule, a bevelled
//   glass head that holds a dim reflection, spider cracks from a chip near its rim, a violet glow round its inside edge,
//   angry glowing eyes under heavy brows and a grim, glowing mouth. In play the eyes blink and follow your peel, a glint
//   sweeps across the glass, the cracks glint and shards fall.
// - THE SOLE PROPRIETOR: a deep-violet cosmic foot with a nebula and stars inside it and a pizza-slice constellation,
//   gold rings on every toe and a pizza signet on the big toe, a gemmed gold crown cuff at the ankle over a dark suit
//   trouser. In play the stars twinkle, the nebula breathes and gold coins orbit him.
// - GHOST OF FEET FUTURE: a pale holographic foot with scanlines, a clock on the instep whose numerals run backwards,
//   a chrome ankle band with a 'T-1s' readout and chrome caps on its toes with a cyan rim. In play the hands tick
//   backwards, a scan band sweeps down it, it flickers and leaves afterimages behind.
// - THE SOLE PROPRIETOR UNBOUND: the cosmic foot gone darker, cracked with gold light bursting through, the cuff burst
//   open and broken chains hanging from it. In play light pours from the cracks, the chains swing and flames of light
//   lick up round him.

import type { FootArt } from '../../data/feet';
import { CX } from '../../art/feetCommon';
import { type BareFoot, type BareLook, bareFoot, paintBare } from '../../art/style/bare';
import { type StyleToe, onToe, restToes, bareParts } from '../../art/style/anatomy';
import { type PathFn, type Pose, ao, crease, glint, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil } from '../../art/style/sil';
import { type PartDef, registerStyle } from '../../art/style/registry';
import { blotches, contact, rivet } from '../../art/style/details';
import { LX, LY, clip, fill, glowDot, glowFinish, goldRamp, heatLayer, lightAll, lin, rad } from '../../art/style/kit-bosses';
import { BARE_RIG, extendSil, layerOn } from './base-kit';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';

type Opts = { live: boolean; emissive?: boolean; heat?: boolean };

const ell = (x: number, y: number, rx: number, ry: number, rot = 0): PathFn => (c) => {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
};

const poly = (pts: [number, number][], close = true): PathFn => (c) => {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  if (close) c.closePath();
};

// ════════════════════════════ THE MIRROR PEEL ════════════════════════════

const MP_HANDLE: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 22, -8);
  c.lineTo(CX - 22, 96);
  c.lineTo(CX + 22, 96);
  c.lineTo(CX + 22, -8);
  c.closePath();
};

const MP_FERRULE: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 29, 62);
  c.quadraticCurveTo(CX, 58, CX + 29, 62);
  c.lineTo(CX + 31, 90);
  c.quadraticCurveTo(CX, 96, CX - 31, 90);
  c.closePath();
};

/** The peel's head, pointing down at the pizzas (as the old art). */
const MP_HEAD: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 26, 74);
  c.bezierCurveTo(CX - 40, 94, CX - 112, 110, CX - 108, 196);
  c.bezierCurveTo(CX - 104, 266, CX - 52, 302, CX, 302);
  c.bezierCurveTo(CX + 52, 302, CX + 104, 266, CX + 108, 196);
  c.bezierCurveTo(CX + 112, 110, CX + 40, 94, CX + 26, 74);
  c.closePath();
};

/** The glass inside the head's bevel (the head scaled in round its middle). */
const MP_GLASS: PathFn = (c) => {
  c.save();
  c.translate(CX, 196);
  c.scale(0.9, 0.91);
  c.translate(-CX, -196);
  MP_HEAD(c);
  c.restore();
};

export const MP_EYES = { y: 176, dx: 36 };
export const MP_CHIP = { x: CX + 58, y: 248 };

/** The cracks: lines from the chip, as polylines (seeded, so the art and the live glints agree). */
export const MP_CRACKS: [number, number][][] = (() => {
  const r = rng(hashStr('mirrorpeel-cracks'));
  const out: [number, number][][] = [];
  for (let i = 0; i < 7; i++) {
    let x = MP_CHIP.x;
    let y = MP_CHIP.y;
    const a0 = Math.PI * (0.72 + (i / 6) * 1.2) + (r() - 0.5) * 0.2;
    const pts: [number, number][] = [[x, y]];
    const n = 3 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const a = a0 + (r() - 0.5) * 0.7;
      x += Math.cos(a) * (12 + r() * 16);
      y += Math.sin(a) * (12 + r() * 16);
      pts.push([x, y]);
    }
    out.push(pts);
  }
  return out;
})();

function mpEyes(g: Ctx, glow: string, shut: number): void {
  for (const s of [-1, 1]) {
    const ex = CX + s * MP_EYES.dx;
    const ey = MP_EYES.y;
    glowDot(g, ex, ey, 34, glow, 0.9 * (1 - shut * 0.6));
    // the almond, lids closing over it
    const ry = 10 * (1 - shut) + 0.8;
    const eye = ell(ex, ey, 15, ry, -s * 0.22);
    fill(g, eye, rad(g, ex - s * 2, ey - 2, 1, ex, ey, 14, [
      [0, '#ffffff'],
      [0.45, mix(glow, '#ffffff', 0.55)],
      [1, glow],
    ]));
    g.strokeStyle = '#1a0f30';
    g.lineWidth = 2.6;
    eye(g);
    g.stroke();
    // a hot pupil slit
    if (shut < 0.6) fill(g, ell(ex - s * 2, ey, 2.4, ry * 0.8, -s * 0.22), rgba('#2a0a50', 0.8));
    // the heavy brow, slanting in
    g.save();
    g.lineCap = 'round';
    g.strokeStyle = '#06040a';
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(ex + s * 24, ey - 25);
    g.quadraticCurveTo(ex + s * 2, ey - 22, ex - s * 18, ey - 9);
    g.stroke();
    g.strokeStyle = rgba('#8a70c8', 0.55);
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(ex + s * 23, ey - 29);
    g.quadraticCurveTo(ex + s * 2, ey - 26, ex - s * 16, ey - 14);
    g.stroke();
    g.restore();
  }
}

function mpMouth(g: Ctx, glow: string, a = 1): void {
  g.save();
  g.lineCap = 'round';
  const m = (c: Ctx) => {
    c.beginPath();
    c.moveTo(CX - 28, 240);
    c.quadraticCurveTo(CX, 224, CX + 28, 240);
  };
  m(g);
  g.strokeStyle = rgba('#050308', 0.9 * a);
  g.lineWidth = 9;
  g.stroke();
  m(g);
  g.strokeStyle = rgba(glow, 0.95 * a);
  g.lineWidth = 4;
  g.stroke();
  m(g);
  g.strokeStyle = rgba('#ffffff', 0.7 * a);
  g.lineWidth = 1.2;
  g.stroke();
  g.restore();
}

function mpCracks(g: Ctx, glow: string, bright: boolean): void {
  g.save();
  g.lineJoin = 'round';
  g.lineCap = 'round';
  for (const pts of MP_CRACKS) {
    const draw = (c: Ctx) => {
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    };
    if (bright) {
      draw(g);
      g.strokeStyle = rgba(glow, 0.55);
      g.lineWidth = 4;
      g.stroke();
      continue;
    }
    // a dark fracture with a light lip on its lit side
    g.save();
    g.translate(-LX * 1.2, -LY * 1.2);
    draw(g);
    g.strokeStyle = rgba('#e8d8ff', 0.55);
    g.lineWidth = 1.2;
    g.stroke();
    g.restore();
    draw(g);
    g.strokeStyle = rgba('#000000', 0.7);
    g.lineWidth = 1.8;
    g.stroke();
  }
  // the web: short bridges between neighbouring cracks
  const r = rng(hashStr('mirrorpeel-web'));
  for (let i = 0; i < MP_CRACKS.length - 1; i++) {
    for (const j of [1, 2]) {
      const a = MP_CRACKS[i][Math.min(j, MP_CRACKS[i].length - 1)];
      const b = MP_CRACKS[i + 1][Math.min(j, MP_CRACKS[i + 1].length - 1)];
      if (r() < 0.25) continue;
      g.beginPath();
      g.moveTo(a[0], a[1]);
      g.quadraticCurveTo((a[0] + b[0]) / 2 + (r() - 0.5) * 6, (a[1] + b[1]) / 2 + (r() - 0.5) * 6, b[0], b[1]);
      g.strokeStyle = bright ? rgba(glow, 0.35) : rgba('#e8d8ff', 0.3);
      g.lineWidth = bright ? 2 : 1;
      g.stroke();
    }
  }
  // the chip itself: a pale crater
  if (!bright) {
    fill(g, ell(MP_CHIP.x, MP_CHIP.y, 6, 4.5, -0.4), rad(g, MP_CHIP.x - 1, MP_CHIP.y - 1, 0.5, MP_CHIP.x, MP_CHIP.y, 6, [
      [0, '#ffffff'],
      [0.5, '#c8b0ff'],
      [1, rgba('#3a2a60', 0)],
    ]));
  }
  g.restore();
}

function drawMirrorPeel(ctx: Ctx, art: FootArt, _p: Pose, o: Opts): void {
  const glow = art.secondary ?? '#b06bff';
  const handleCol = art.legColor ?? '#2a2440';
  const obs = art.primary ?? '#1d1a2c';
  const box = { x: CX - 122, y: -8, w: 244, h: 314 };
  const sil = new Sil(ctx, [MP_HANDLE, MP_FERRULE, MP_HEAD], box);
  const g = sil.g;
  if (o.heat) {
    g.fillStyle = rgba('#000000', 0);
    heatLayer(sil, box, { seed: 301, y0: 300, y1: 40, a: 1.3, patch: 0.4, hot: '#fff0ff', mid: '#d08aff', deep: '#7a2ad0' });
    return;
  }
  if (o.emissive) {
    // the violet light round the glass's inside edge, the cracks, the mouth and (still art) the eyes
    clip(g, MP_GLASS, () => {
      g.save();
      g.lineWidth = 16;
      g.strokeStyle = rgba(glow, 0.55);
      g.filter = 'blur(6px)';
      MP_GLASS(g);
      g.stroke();
      g.restore();
      mpCracks(g, glow, true);
    });
    mpMouth(g, glow, 0.9);
    for (const s of [-1, 1]) glowDot(g, CX + s * MP_EYES.dx, MP_EYES.y, 26, glow, 0.6);
    glowFinish(sil);
    return;
  }
  if (!o.live) {
    // still art: a violet halo behind the head
    softFill(ctx, ell(CX, 200, 128, 122), rgba(glow, 0.3), 18);
  }
  sil.form({ base: obs, shadowTint: '#06030c', ramp: 0.9, form: 0.6, formSize: 22, bevel: 0.5, rim: 0.7 });
  // ——— the handle: dark iron, lit as a cylinder, flowing into the iron leg ———
  clip(g, MP_HANDLE, () => {
    g.fillStyle = lin(g, CX - 22, 0, CX + 22, 0, [
      [0, shade(handleCol, -0.15)],
      [0.22, shade(handleCol, 0.35)],
      [0.5, handleCol],
      [0.84, mix(shade(handleCol, -0.5), '#0e1020', 0.3)],
      [1, mix(handleCol, '#cfe2ff', 0.3)],
    ]);
    g.fillRect(CX - 24, -10, 48, 108);
    texture(g, 'cast', { x: CX - 24, y: -10, w: 48, h: 108 }, 0.4, 1.2);
    spec(g, CX - 11, 30, 30, 3, 0.35, Math.PI / 2);
    // a leather grip wrap, wound down the handle
    for (let y = 4; y < 58; y += 9) {
      crease(g, (c) => {
        c.moveTo(CX - 22, y + 4);
        c.quadraticCurveTo(CX, y - 2, CX + 22, y + 3);
      }, 2, '#06040a', 0.6, 0.18);
    }
  });
  // ——— the ferrule: a riveted collar of blackened steel ———
  contact(g, (c) => {
    MP_FERRULE(c);
    c.fill();
  }, 0.6, 3, 4);
  clip(g, MP_FERRULE, () => {
    g.fillStyle = lin(g, CX - 31, 0, CX + 31, 0, [
      [0, '#2a2838'],
      [0.2, '#8a86a8'],
      [0.42, '#3a3650'],
      [0.6, '#5a5678'],
      [0.88, '#14121e'],
      [1, '#6a7aa0'],
    ]);
    g.fillRect(CX - 34, 56, 68, 42);
    texture(g, 'brushed', { x: CX - 34, y: 56, w: 68, h: 42 }, 0.3);
    crease(g, (c) => {
      c.moveTo(CX - 30, 68);
      c.quadraticCurveTo(CX, 64, CX + 30, 68);
    }, 1.6, '#000000', 0.5, 0.3);
  });
  for (const x of [CX - 19, CX, CX + 19]) rivet(g, x, 79, 3.2, '#8a86a8');
  // ——— the head: an obsidian mirror in a bevelled rim ———
  contact(g, (c) => {
    MP_FERRULE(c);
    c.fill();
  }, 0.5, 2.5, 6);
  clip(g, MP_HEAD, () => {
    // the rim: dark polished glass, lit round its edge
    g.fillStyle = lin(g, CX - 110, 90, CX + 110, 300, [
      [0, '#5a4a88'],
      [0.3, '#241c3e'],
      [0.7, '#120e1e'],
      [1, '#2a2048'],
    ]);
    g.fillRect(CX - 120, 70, 240, 240);
  });
  clip(g, MP_GLASS, () => {
    // the glass: deep, and holding a dim reflection of the room (a warm horizon, a window of light)
    g.fillStyle = lin(g, CX - 100, 90, CX + 100, 300, [
      [0, '#3a2c5c'],
      [0.35, '#17122a'],
      [0.62, '#221a3c'],
      [1, '#07060d'],
    ]);
    g.fillRect(CX - 120, 70, 240, 240);
    softFill(g, ell(CX + 6, 214, 120, 18, -0.08), rgba('#6a3a5a', 0.35), 10);
    softFill(g, ell(CX - 40, 140, 30, 40, 0.2), rgba('#8a7ac8', 0.18), 12);
    texture(g, 'grain', { x: CX - 120, y: 70, w: 240, h: 240 }, 0.1);
    // the sheen: two long diagonal streaks of the key light
    g.fillStyle = lin(g, CX - 110, 160, CX - 30, 90, [
      [0, rgba('#ffffff', 0)],
      [0.45, rgba('#ffffff', 0.26)],
      [0.55, rgba('#ffffff', 0.3)],
      [1, rgba('#ffffff', 0)],
    ]);
    poly([[CX - 130, 152], [CX - 44, 66], [CX - 12, 66], [CX - 116, 196]])(g);
    g.fill();
    g.fillStyle = lin(g, CX - 100, 230, CX + 40, 90, [
      [0, rgba('#ffffff', 0)],
      [0.5, rgba('#ffffff', 0.11)],
      [1, rgba('#ffffff', 0)],
    ]);
    poly([[CX - 104, 224], [CX + 22, 90], [CX + 40, 90], [CX - 88, 244]])(g);
    g.fill();
    // a violet glow just inside the bevel
    g.save();
    g.lineWidth = 14;
    g.strokeStyle = rgba(glow, 0.35);
    g.filter = 'blur(4px)';
    MP_GLASS(g);
    g.stroke();
    g.restore();
    // eye sockets: the glass goes dark where the eyes burn through
    for (const s of [-1, 1]) softFill(g, ell(CX + s * MP_EYES.dx, MP_EYES.y, 22, 15, s * 0.25), rgba('#000000', 0.55), 5);
    mpCracks(g, glow, false);
    mpMouth(g, glow);
    if (!o.live) mpEyes(g, glow, 0);
  });
  // the bevel between rim and glass: a lit lip on the top left, a dark one on the bottom right
  g.save();
  g.lineWidth = 2.2;
  g.strokeStyle = lin(g, CX - 100, 90, CX + 100, 300, [
    [0, rgba('#e8dcff', 0.75)],
    [0.5, rgba('#e8dcff', 0.12)],
    [1, rgba('#000000', 0.5)],
  ]);
  MP_GLASS(g);
  g.stroke();
  g.restore();
  glint(g, CX - 70, 132, 9, 0.9);
  glint(g, CX + 74, 168, 5, 0.6);
  lightAll(sil, 0.35, 18, 0.7);
  sil.finish('#08060c', { openTop: -5 });
}

registerStyle('mirrorpeel', {
  contactY: 300,
  halfWidth: 104,
  leg: { kind: 'iron', hw: 22, join: 'blend', fade: 22 },
  parts: {
    eyes: {
      box: { x: CX - 70, y: MP_EYES.y - 36, w: 140, h: 70 },
      frames: 3,
      draw(ctx, art, i) {
        mpEyes(ctx, art.secondary ?? '#b06bff', [0, 0.55, 1][i]);
      },
    },
  },
  draw: drawMirrorPeel,
});

/** The mirror's sheen sweeping across the glass (frame i of n), clipped to it: for the live layer. */
export function mirrorSheen(g: Ctx, i: number, n: number): void {
  const u = i / (n - 1);
  const x = CX - 190 + u * 380;
  g.save();
  MP_GLASS(g);
  g.clip();
  g.fillStyle = lin(g, x - 40, 196 + 40, x + 40, 196 - 40, [
    [0, rgba('#ffffff', 0)],
    [0.42, rgba('#e8dcff', 0.25)],
    [0.5, rgba('#ffffff', 0.55)],
    [0.58, rgba('#e8dcff', 0.25)],
    [1, rgba('#ffffff', 0)],
  ]);
  g.fillRect(CX - 130, 70, 260, 240);
  g.restore();
}
export const MP_SHEEN_BOX: [number, number, number, number] = [CX - 112, 70, 224, 236];

// ════════════════════════════ THE COSMIC FOOT (Sole Proprietor, Unbound) ════════════════════════════

const PROP_LOOK: BareLook = { skin: '#5d3fb0', nails: '#241446', shadowTint: '#12042e', pores: 0.08, detail: 0.35 };
const UNBOUND_LOOK: BareLook = { skin: '#3c2590', nails: '#1a0e34', shadowTint: '#0a0220', pores: 0.08, detail: 0.3 };

/** The gold crown cuff at the ankle: a band wider than the ankle, its bottom edge curving round the leg. */
const CUFF: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 58, -8);
  c.lineTo(CX + 60, -8);
  c.lineTo(CX + 62, 26);
  c.quadraticCurveTo(CX + 2, 38, CX - 60, 26);
  c.closePath();
};

const CUFF_GEMS: [number, string][] = [
  [CX - 40, '#ff3d6e'],
  [CX - 20, '#36e0ff'],
  [CX + 2, '#7be04a'],
  [CX + 24, '#b06bff'],
  [CX + 45, '#ff3d6e'],
];

/** The pizza-slice constellation (he owns the stars too): tip, then the crust's two ends. */
const SLICE_STARS: [number, number][] = [[CX - 6, 138], [CX - 38, 64], [CX + 30, 60]];

function gem(g: Ctx, x: number, y: number, r: number, col: string): void {
  contact(g, (c) => {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }, 0.5, 1.6, 2);
  // a gold bezel, then the stone
  fill(g, ell(x, y, r + 1.8, r + 1.6), goldRamp(g, x - r, y - r, x + r, y + r));
  fill(g, ell(x, y, r, r * 0.92), rad(g, x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r, [
    [0, mix(col, '#ffffff', 0.7)],
    [0.35, col],
    [1, shade(col, -0.6)],
  ]));
  spec(g, x - r * 0.35, y - r * 0.4, r * 0.4, r * 0.25, 0.95, -0.6);
}

/** The cuff (on the foot's paint layer, after the silhouette's been grown by it). */
function paintCuff(g: Ctx, broken: boolean): void {
  contact(g, (c) => {
    CUFF(c);
    c.fill();
  }, 0.6, 3, 6);
  clip(g, CUFF, () => {
    // polished gold, lit as a cylinder
    g.fillStyle = lin(g, CX - 60, 0, CX + 62, 0, [
      [0, '#8a5a10'],
      [0.18, '#fff4b0'],
      [0.32, '#ffd23f'],
      [0.6, '#c8901c'],
      [0.86, '#6a4208'],
      [1, '#e8d8a0'],
    ]);
    g.fillRect(CX - 64, -10, 130, 50);
    // the top and bottom rolled lips
    g.fillStyle = lin(g, 0, -8, 0, 0, [
      [0, rgba('#5a3a08', 0.6)],
      [1, rgba('#5a3a08', 0)],
    ]);
    g.fillRect(CX - 64, -8, 130, 8);
    crease(g, (c) => {
      c.moveTo(CX - 60, 20);
      c.quadraticCurveTo(CX + 2, 32, CX + 62, 20);
    }, 1.8, '#4a2a04', 0.6, 0.45);
    texture(g, 'brushed', { x: CX - 64, y: -10, w: 130, h: 50 }, 0.15);
    // crown points embossed round it, each lit on its top-left edge
    for (let i = 0; i < 5; i++) {
      const x = CX - 44 + i * 22.5;
      const pt = poly([[x - 9, 14], [x, -4], [x + 9, 14]], false);
      crease(g, pt, 1.6, '#5a3a08', 0.65, 0.55);
      fill(g, ell(x, -2, 2.4, 2.4), goldRamp(g, x - 3, -5, x + 3, 1));
    }
    spec(g, CX - 32, 6, 40, 5, 0.6, -0.05, '#fffbe0');
  });
  for (const [i, [x, col]] of CUFF_GEMS.entries()) {
    if (broken && (i === 2 || i === 3)) {
      // knocked out: an empty socket
      fill(g, ell(x, 14, 5.6, 5.2), rad(g, x, 14, 0.5, x, 14, 6, [
        [0, '#2a1a04'],
        [1, '#7a5010'],
      ]));
      continue;
    }
    gem(g, x, 14, 5.2, col);
  }
  if (broken) {
    // the cuff has burst: a jagged split with light pouring through, its edges bent out and lit
    const split = poly([[CX + 4, -8], [CX + 16, -8], [CX + 10, 6], [CX + 18, 16], [CX + 9, 36], [CX + 1, 36], [CX + 6, 18], [CX - 2, 6]]);
    contact(g, (c) => {
      split(c);
      c.fill();
    }, 0.6, -2, 3);
    fill(g, split, lin(g, CX, -8, CX + 14, 36, [
      [0, '#fffbe0'],
      [0.5, '#fff4b0'],
      [1, '#ffd23f'],
    ]));
    g.save();
    g.lineJoin = 'round';
    g.strokeStyle = rgba('#4a2a04', 0.8);
    g.lineWidth = 1.6;
    split(g);
    g.stroke();
    g.restore();
  }
}

function crackPaths(): [number, number][][] {
  const r = rng(hashStr('unbound-cracks'));
  const rough = (pts: [number, number][]): [number, number][] => {
    const out: [number, number][] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      for (const t of [0.33, 0.66]) out.push([ax + (bx - ax) * t + (r() - 0.5) * 7, ay + (by - ay) * t + (r() - 0.5) * 5]);
      out.push([bx, by]);
    }
    return out;
  };
  return ([
    [[CX - 50, 4], [CX - 36, 44], [CX - 48, 78], [CX - 24, 120], [CX - 34, 152]],
    [[CX + 40, 4], [CX + 30, 40], [CX + 48, 74], [CX + 26, 118], [CX + 40, 150], [CX + 30, 176]],
    [[CX - 10, 60], [CX + 2, 92], [CX - 8, 128]],
    [[CX - 36, 44], [CX - 64, 62], [CX - 78, 96]],
    [[CX + 48, 74], [CX + 74, 96], [CX + 82, 128]],
    [[CX - 24, 120], [CX - 4, 136], [CX + 8, 150]],
    [[CX + 30, 40], [CX + 10, 30]],
  ] as [number, number][][]).map(rough);
}

/** The light breaking out through the cracks (k: strength; core: draw the white-hot core). */
function lightCracks(g: Ctx, k: number, core = true): void {
  g.save();
  g.lineJoin = 'round';
  g.lineCap = 'round';
  for (const pts of crackPaths()) {
    const draw = (c: Ctx) => {
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    };
    softStroke(g, draw, rgba('#ff9a3a', 0.4 * k), 12, 6);
    softStroke(g, draw, rgba('#ffd23f', 0.75 * k), 4.5, 1.2);
    if (core) {
      draw(g);
      g.strokeStyle = rgba('#fffbe0', 0.9 * k);
      g.lineWidth = 1.6;
      g.stroke();
    }
  }
  g.restore();
}

/** The cosmos inside the foot: nebula clouds, dust lanes, stars and the slice constellation. */
function cosmos(g: Ctx, f: BareFoot, seed: number, k: number, onlyGlow = false): void {
  const box = f.box;
  if (!onlyGlow) {
    layerOn(g, 'screen', (l) => {
      for (const [x, y, r0, col, a] of [
        [CX - 50, 70, 90, '#ff4fd8', 0.42],
        [CX + 60, 150, 100, '#36e0ff', 0.36],
        [CX - 10, 200, 70, '#b06bff', 0.4],
        [CX + 30, 40, 60, '#6a8aff', 0.3],
      ] as [number, number, number, string, number][]) {
        l.fillStyle = rad(l, x, y, 4, x, y, r0, [
          [0, rgba(col, a * k)],
          [1, rgba(col, 0)],
        ]);
        l.fillRect(box.x, box.y, box.w, box.h);
      }
      // cloudy structure in the nebula
      blotches(l, box, '#ff7ae0', 0.28 * k, 46, 0.52, 0.22, seed, 'source-over');
      blotches(l, box, '#5ad8ff', 0.22 * k, 38, 0.55, 0.2, seed + 7, 'source-over');
    });
    // dark dust lanes across it
    blotches(g, box, '#080214', 0.35, 30, 0.58, 0.16, seed + 13, 'multiply');
  }
  // stars: fine dust everywhere on the upper foot, a few bright ones with crosses; toes get their own
  const r = rng(seed);
  const star = (x: number, y: number, s: number, a: number) => {
    if (s > 1.6) {
      glowDot(g, x, y, s * 4, '#cfe0ff', a * 0.6);
      glint(g, x, y, s * 2.6, a);
    } else {
      g.fillStyle = rgba('#ffffff', a);
      g.beginPath();
      g.arc(x, y, s, 0, Math.PI * 2);
      g.fill();
    }
  };
  for (let i = 0; i < 90; i++) {
    const x = box.x + 16 + r() * (box.w - 32);
    const y = -2 + r() * 150;
    const s = r() < 0.1 ? 2 + r() : 0.6 + r() * 0.9;
    star(x, y, s, (0.45 + r() * 0.5) * (onlyGlow ? 0.8 : 1));
  }
  for (const t of f.toes) {
    for (let i = 0; i < 3; i++) {
      const [x, y] = onToe({ ...t, rx: t.rx * r() * 0.7, ry: t.ry * r() * 0.6 }, r() * Math.PI * 2);
      star(x, y, i === 0 && r() < 0.5 ? 1.8 : 0.7 + r() * 0.5, 0.7);
    }
  }
  // the slice: two edges and a curved crust, stars at its corners
  g.save();
  g.lineCap = 'round';
  g.strokeStyle = rgba('#fff4b0', 0.65 * k);
  g.lineWidth = 1.6;
  g.setLineDash([5, 3]);
  const [a, b, c] = SLICE_STARS;
  g.beginPath();
  g.moveTo(b[0], b[1]);
  g.lineTo(a[0], a[1]);
  g.lineTo(c[0], c[1]);
  g.quadraticCurveTo((b[0] + c[0]) / 2, 44, b[0], b[1]);
  g.stroke();
  g.restore();
  for (const [x, y] of [...SLICE_STARS, [CX - 14, 86] as [number, number], [CX + 8, 94] as [number, number]]) {
    glowDot(g, x, y, 9, '#ffd23f', 0.8 * k);
    fill(g, ell(x, y, 2.2, 2.2), '#fffbe0');
  }
}

/** A gold ring round a toe, below its nail; the big toe's carries a pizza signet. */
function toeRing(g: Ctx, t: StyleToe, big: boolean, gold = '#ffd23f'): void {
  g.save();
  g.translate(t.cx, t.cy);
  g.rotate(t.rot);
  const y0 = -t.ry * 0.5;
  const w = big ? 9 : 6;
  const band = (c: Ctx) => {
    c.beginPath();
    c.moveTo(-t.rx - 2, y0);
    c.quadraticCurveTo(0, y0 + 6, t.rx + 2, y0);
    c.lineTo(t.rx + 2, y0 + w);
    c.quadraticCurveTo(0, y0 + w + 6, -t.rx - 2, y0 + w);
    c.closePath();
  };
  g.save();
  g.beginPath();
  g.ellipse(0, 0, t.rx + 0.5, t.ry + 0.5, 0, 0, Math.PI * 2);
  g.clip();
  contact(g, (c) => {
    band(c);
    c.fill();
  }, 0.55, 2, 2.5);
  fill(g, band, lin(g, -t.rx, 0, t.rx, 0, [
    [0, shade(gold, -0.5)],
    [0.22, mix(gold, '#fffbe0', 0.6)],
    [0.45, gold],
    [0.8, shade(gold, -0.45)],
    [1, shade(gold, -0.1)],
  ]));
  g.strokeStyle = rgba('#fffbe0', 0.7);
  g.lineWidth = 0.9;
  g.beginPath();
  g.moveTo(-t.rx * 0.8, y0 + 1.2);
  g.quadraticCurveTo(0, y0 + 6.5, t.rx * 0.8, y0 + 1.2);
  g.stroke();
  g.restore();
  if (big) {
    // the signet: an oval of gold with a slice in red enamel, pepperoni and a crust
    const sx = 0;
    const sy = y0 + w * 0.5 + 3;
    contact(g, (c) => {
      c.beginPath();
      c.ellipse(sx, sy, 15, 12, 0, 0, Math.PI * 2);
      c.fill();
    }, 0.6, 2.5, 3);
    fill(g, ell(sx, sy, 15, 12), goldRamp(g, sx - 15, sy - 12, sx + 15, sy + 12, gold));
    fill(g, ell(sx, sy, 11.5, 9), rad(g, sx - 3, sy - 3, 1, sx, sy, 12, [
      [0, '#3a1a08'],
      [1, '#1a0804'],
    ]));
    const sl = poly([[sx - 8, sy - 6], [sx + 8, sy - 6], [sx, sy + 7]]);
    fill(g, sl, lin(g, sx, sy - 6, sx, sy + 7, [
      [0, '#ff7a3a'],
      [1, '#c8301a'],
    ]));
    fill(g, (c) => {
      c.beginPath();
      c.moveTo(sx - 9, sy - 5);
      c.quadraticCurveTo(sx, sy - 10, sx + 9, sy - 5);
      c.lineTo(sx + 8, sy - 3.5);
      c.quadraticCurveTo(sx, sy - 7.5, sx - 8, sy - 3.5);
      c.closePath();
    }, '#f2c060');
    for (const [px, py] of [[sx - 3, sy - 2], [sx + 2.6, sy - 1], [sx, sy + 3]]) fill(g, ell(px, py, 1.5, 1.5), '#7a1008');
    spec(g, sx - 6, sy - 6, 7, 3, 0.8, -0.5);
  }
  g.restore();
}

function cosmicFoot(ctx: Ctx, art: FootArt, p: Pose, o: Opts, unbound: boolean): void {
  const look = unbound ? UNBOUND_LOOK : PROP_LOOK;
  const gold = art.secondary ?? '#ffd23f';
  if (o.heat) {
    const f = bareFoot(ctx, look, p);
    extendSil(f.sil, [CUFF]);
    heatLayer(f.sil, f.box, { seed: unbound ? 331 : 321, y0: 168, y1: -30, a: 1.7, patch: 0.35, hot: '#fffbe0', mid: '#ffd23f', deep: '#ff7a3a' });
    return;
  }
  if (o.emissive) {
    const f = bareFoot(ctx, look, p);
    extendSil(f.sil, [CUFF]);
    const g = f.sil.g;
    cosmos(g, f, unbound ? 331 : 321, 1, true);
    if (unbound) {
      lightCracks(g, 1);
      // the split in the cuff blazes
      softFill(g, ell(CX + 9, 14, 14, 26), rgba('#fff4b0', 0.9), 6);
    }
    for (const [x, col] of CUFF_GEMS) glowDot(g, x, 14, 9, col, 0.5);
    glowFinish(f.sil);
    return;
  }
  if (unbound && !o.live) {
    // still art: flames of light licking up round him, behind the foot
    const r = rng(hashStr('unbound-flames'));
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const x = CX - 96 + t * 196;
      const y = 140 + Math.sin(t * Math.PI) * 100;
      const h = 50 + r() * 50;
      const lean = (r() - 0.5) * 18;
      softFill(ctx, (c) => {
        c.beginPath();
        c.moveTo(x - 18, y);
        c.quadraticCurveTo(x - 12, y - h * 0.6, x + lean, y - h);
        c.quadraticCurveTo(x + 14, y - h * 0.5, x + 18, y);
        c.closePath();
      }, lin(ctx, x, y, x, y - h, [
        [0, rgba('#ffd23f', 0.8)],
        [0.6, rgba('#ff8ad8', 0.45)],
        [1, rgba('#ff4fd8', 0)],
      ]), 3);
    }
    softFill(ctx, ell(CX, 130, 130, 150), rgba('#ffd23f', 0.16), 18);
  }
  const f = paintBare(ctx, look, p);
  extendSil(f.sil, [CUFF]);
  const g = f.sil.g;
  cosmos(g, f, unbound ? 331 : 321, unbound ? 0.8 : 1);
  if (unbound) {
    // darker, and the power inside getting out
    g.fillStyle = rgba('#05010f', 0.2);
    g.fillRect(f.box.x, f.box.y, f.box.w, f.box.h);
    lightCracks(g, 1);
  }
  // the one light back over the cosmos, so the foot keeps its form
  lightAll(f.sil, 0.42, 22, 0.6);
  f.sil.edge(rgba(unbound ? '#ffb0f0' : '#c8b0ff', 0.45), 3, -LX * 2.5, -LY * 2.5);
  // gold on every toe
  f.toes.forEach((t, i) => toeRing(g, t, i === 4, gold));
  ao(g, CX, 32, 60, 8, 0.5, 0, '#05010f');
  paintCuff(g, unbound);
  if (!o.live && unbound) for (const s of [-1, 1]) brokenChain(ctx, s, 0, true);
  f.sil.finish(mix(inkOf(look.skin), unbound ? '#1a0f30' : '#22104a', 0.5), { openTop: -6.5 });
  if (!o.live && unbound) for (const s of [-1, 1]) brokenChain(ctx, s, 0, false);
}

registerStyle('soleprop', {
  rig: BARE_RIG,
  contactY: 260,
  halfWidth: 104,
  leg: { kind: 'wool', hw: 50, join: 'into' },
  draw(ctx, art, p, o) {
    cosmicFoot(ctx, art, p, o, false);
  },
});

// ——— the Unbound's broken chains ———

/** Where each broken chain hangs from the cuff (design space), left then right. */
export const CHAINS: [number, number][] = [
  [CX - 58, 16],
  [CX + 60, 16],
];

/** A broken chain hanging from its pivot, down (rest), swung by `swing` radians. Behind (back links) or in front. */
function brokenChain(g: Ctx, s: number, swing: number, back: boolean): void {
  const [px, py] = CHAINS[s < 0 ? 0 : 1];
  g.save();
  g.translate(px, py);
  g.rotate(swing);
  for (let i = 0; i < 5; i++) {
    const side = i % 2 === 1;
    if (side !== back) continue;
    const y = 8 + i * 15;
    const link = (c: Ctx) => {
      c.beginPath();
      if (side) c.ellipse(0, y, 3.2, 10, 0, 0, Math.PI * 2);
      else c.ellipse(0, y, 7.5, 10.5, 0, 0, Math.PI * 2);
    };
    const lw = side ? 4.5 : 4;
    // the last link is snapped open
    const open = i === 4;
    g.save();
    g.lineCap = 'round';
    if (open) {
      g.beginPath();
      g.ellipse(0, y, 7.5, 10.5, 0, -Math.PI * 0.35, Math.PI * 1.15);
    } else link(g);
    g.strokeStyle = '#14101e';
    g.lineWidth = lw + 2.6;
    g.stroke();
    if (open) {
      g.beginPath();
      g.ellipse(0, y, 7.5, 10.5, 0, -Math.PI * 0.35, Math.PI * 1.15);
    } else link(g);
    g.strokeStyle = lin(g, -8, 0, 8, 0, [
      [0, '#d8deff'],
      [0.45, '#8a90b8'],
      [1, '#3a3858'],
    ]);
    g.lineWidth = lw;
    g.stroke();
    g.restore();
    if (!side) spec(g, -3.5, y - 5, 3, 2, 0.8, -0.8);
    if (open) {
      // the glowing break
      glowDot(g, 5, y + 7, 6, '#ffd23f', 0.9);
      glowDot(g, -6, y - 7, 5, '#ffd23f', 0.7);
    }
  }
  g.restore();
}

const chainPart = (s: number): PartDef => {
  const [px, py] = CHAINS[s < 0 ? 0 : 1];
  return {
    box: { x: px - 22, y: py - 4, w: 44, h: 100 },
    frames: 1,
    pivot: [px, py],
    draw(ctx) {
      brokenChain(ctx, s, 0, true);
      brokenChain(ctx, s, 0, false);
    },
  };
};

registerStyle('soleunbound', {
  rig: BARE_RIG,
  contactY: 260,
  halfWidth: 104,
  leg: { kind: 'wool', hw: 50, join: 'into' },
  parts: { chainL: chainPart(-1), chainR: chainPart(1) },
  draw(ctx, art, p, o) {
    cosmicFoot(ctx, art, p, o, true);
  },
});

/** The Unbound's crack lines (live glints run along them). */
export const UNBOUND_CRACKS = crackPaths();

// ════════════════════════════ GHOST OF FEET FUTURE ════════════════════════════

const GHOST_LOOK: BareLook = { skin: '#e8f4ff', nails: null, shadowTint: '#2a5aa8', pores: 0.05, detail: 0.4 };

export const GF_CLOCK = { x: CX + 4, y: 102, r: 33 };

function scanlines(g: Ctx, box: { x: number; y: number; w: number; h: number }, holo: string, a: number): void {
  g.fillStyle = rgba(holo, a);
  for (let y = box.y; y < box.y + box.h; y += 6) g.fillRect(box.x, y, box.w, 1.8);
}

function clockFace(g: Ctx, holo: string, live: boolean): void {
  const { x, y, r } = GF_CLOCK;
  contact(g, (c) => {
    c.beginPath();
    c.arc(x, y, r + 4, 0, Math.PI * 2);
    c.fill();
  }, 0.4, 2.5, 4, '#1a3a6a');
  // a chrome bezel
  fill(g, ell(x, y, r + 4, r + 4), lin(g, x - r, y - r, x + r, y + r, [
    [0, '#ffffff'],
    [0.3, '#b8d4e8'],
    [0.55, '#5a7a98'],
    [0.75, '#dff0ff'],
    [1, '#4a6a88'],
  ]));
  // the glass face: cool and lit from inside
  fill(g, ell(x, y, r, r), rad(g, x - 8, y - 10, 2, x, y, r, [
    [0, rgba('#ffffff', 0.95)],
    [0.6, rgba(mix(holo, '#ffffff', 0.45), 0.92)],
    [1, rgba(mix(holo, '#4a7aa8', 0.5), 0.9)],
  ]));
  // the numerals run backwards: XII at the top, then XI where I would be
  const num = ['XII', 'XI', 'X', 'IX', 'VIII', 'VII', 'VI', 'V', 'IV', 'III', 'II', 'I'];
  g.save();
  g.fillStyle = '#1e4a6a';
  g.strokeStyle = '#1e4a6a';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    g.lineWidth = i % 3 ? 1.2 : 2.4;
    g.beginPath();
    g.moveTo(x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2));
    g.lineTo(x + Math.cos(a) * (r - (i % 3 ? 5 : 8)), y + Math.sin(a) * (r - (i % 3 ? 5 : 8)));
    g.stroke();
    if (i % 3 === 0) {
      g.font = "700 9px 'Courier New', monospace";
      g.fillText(num[i], x + Math.cos(a) * (r - 14), y + Math.sin(a) * (r - 14));
    }
  }
  g.restore();
  if (!live) ghostHands(g, -Math.PI * 0.25, Math.PI * 0.02);
  fill(g, ell(x, y, 2.6, 2.6), '#1e4a6a');
  // the glass catches the light
  spec(g, x - 12, y - 14, 14, 7, 0.75, -0.6);
}

/** The clock's hands (hour angle, minute angle; 0 = twelve). */
export function ghostHands(g: Ctx, hour: number, min: number): void {
  const { x, y, r } = GF_CLOCK;
  g.save();
  g.lineCap = 'round';
  for (const [a, len, w] of [[hour, r * 0.5, 3.4], [min, r * 0.78, 2.4]] as const) {
    const ex = x + Math.sin(a) * len;
    const ey = y - Math.cos(a) * len;
    g.strokeStyle = rgba('#0a2030', 0.3);
    g.lineWidth = w + 1.5;
    g.beginPath();
    g.moveTo(x + 1.2, y + 1.6);
    g.lineTo(ex + 1.2, ey + 1.6);
    g.stroke();
    g.strokeStyle = '#2a4a6a';
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(ex, ey);
    g.stroke();
  }
  g.restore();
}

/** One clock hand pointing up from the dial's centre (for live sprites that rotate). */
export function ghostHand(g: Ctx, len: number, w: number): void {
  const { x, y } = GF_CLOCK;
  g.save();
  g.lineCap = 'round';
  g.strokeStyle = rgba('#0a2030', 0.3);
  g.lineWidth = w + 1.5;
  g.beginPath();
  g.moveTo(x + 1, y + 1.4);
  g.lineTo(x + 1, y - len + 1.4);
  g.stroke();
  g.strokeStyle = '#2a4a6a';
  g.lineWidth = w;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x, y - len);
  g.stroke();
  fill(g, ell(x, y, 2.6, 2.6), '#1e4a6a');
  g.restore();
}

function chromeBand(g: Ctx, holo: string, f: BareFoot): void {
  const band: PathFn = (c) => {
    c.beginPath();
    c.moveTo(f.box.x, 6);
    c.quadraticCurveTo(CX, 2, f.box.x + f.box.w, 6);
    c.lineTo(f.box.x + f.box.w, 30);
    c.quadraticCurveTo(CX, 36, f.box.x, 30);
    c.closePath();
  };
  contact(g, (c) => {
    band(c);
    c.fill();
  }, 0.4, 2.5, 4, '#1a3a6a');
  fill(g, band, lin(g, 0, 4, 0, 34, [
    [0, '#ffffff'],
    [0.3, '#cfe4f4'],
    [0.55, '#7a9ab8'],
    [0.75, '#e8f4ff'],
    [1, '#5a7a98'],
  ]));
  clip(g, band, () => {
    texture(g, 'brushed', { x: f.box.x, y: 0, w: f.box.w, h: 40 }, 0.2);
    // cylinder shading across it
    g.fillStyle = lin(g, CX - 54, 0, CX + 54, 0, [
      [0, rgba('#1a3050', 0.35)],
      [0.25, rgba('#ffffff', 0.2)],
      [0.6, rgba('#000000', 0)],
      [0.9, rgba('#1a3050', 0.4)],
      [1, rgba(holo, 0.4)],
    ]);
    g.fillRect(CX - 70, 0, 140, 40);
  });
  // the readout from the future
  const panel: PathFn = (c) => {
    c.beginPath();
    c.roundRect(CX - 26, 10, 52, 17, 4);
  };
  contact(g, (c) => {
    panel(c);
    c.fill();
  }, 0.5, -1.2, 2);
  fill(g, panel, '#081822');
  readout(g, holo, 1);
  spec(g, CX - 14, 12, 12, 2, 0.35, 0);
}

function readout(g: Ctx, holo: string, a: number): void {
  g.save();
  g.font = "700 12px 'Courier New', monospace";
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = rgba(holo, a);
  g.shadowColor = rgba(holo, 0.8 * a);
  g.shadowBlur = 4;
  g.fillText('T-1s', CX, 19);
  g.restore();
}

/** A chrome cap over a toe's tip with a cyan rim (instead of a nail). */
function toeCap(g: Ctx, t: StyleToe, holo: string): void {
  g.save();
  g.translate(t.cx, t.cy);
  g.rotate(t.rot);
  g.beginPath();
  g.ellipse(0, 0, t.rx + 1, t.ry + 1, 0, 0, Math.PI * 2);
  g.clip();
  const y0 = -t.ry * 0.18;
  const cap = (c: Ctx) => {
    c.beginPath();
    c.moveTo(-t.rx - 2, y0);
    c.quadraticCurveTo(0, y0 - 7, t.rx + 2, y0);
    c.lineTo(t.rx + 2, t.ry + 2);
    c.lineTo(-t.rx - 2, t.ry + 2);
    c.closePath();
  };
  contact(g, (c) => {
    cap(c);
    c.fill();
  }, 0.45, -1.8, 2.5, '#1a3a6a');
  fill(g, cap, lin(g, -t.rx, y0, t.rx * 0.6, t.ry, [
    [0, '#ffffff'],
    [0.3, '#bcd6ea'],
    [0.5, '#5a7a98'],
    [0.7, '#e8f6ff'],
    [1, '#3a5a78'],
  ]));
  g.strokeStyle = rgba(holo, 0.95);
  g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(-t.rx - 2, y0 + 1);
  g.quadraticCurveTo(0, y0 - 6, t.rx + 2, y0 + 1);
  g.stroke();
  spec(g, -t.rx * 0.35, t.ry * 0.35, t.rx * 0.3, t.ry * 0.14, 0.9, -0.5);
  g.restore();
}

function drawGhostFuture(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const holo = art.secondary ?? '#7df9ff';
  const look = { ...GHOST_LOOK, skin: art.skin };
  if (o.heat) {
    const f = bareFoot(ctx, look, p);
    heatLayer(f.sil, f.box, { seed: 311, y0: 168, y1: -30, a: 1.7, patch: 0.35, hot: '#ffffff', mid: '#7df9ff', deep: '#5aa8ff' });
    return;
  }
  if (o.emissive) {
    const f = bareFoot(ctx, look, p);
    const g = f.sil.g;
    scanlines(g, f.box, holo, 0.18);
    glowDot(g, GF_CLOCK.x, GF_CLOCK.y, GF_CLOCK.r + 10, holo, 0.5);
    readout(g, holo, 1);
    f.sil.edge(rgba(holo, 0.7), 6, 0, 0);
    glowFinish(f.sil);
    return;
  }
  if (!o.live) softFill(ctx, ell(CX, 130, 130, 150), rgba(holo, 0.14), 18);
  const f = paintBare(ctx, look, p);
  const g = f.sil.g;
  // a cold light from inside, a holographic sheen and fine scanlines
  layerOn(g, 'screen', (l) => {
    l.fillStyle = rad(l, CX - 10, 110, 10, CX, 120, 150, [
      [0, rgba('#ffffff', 0.5)],
      [0.5, rgba(holo, 0.18)],
      [1, rgba('#3a6aff', 0.12)],
    ]);
    l.fillRect(f.box.x, f.box.y, f.box.w, f.box.h);
    l.fillStyle = lin(l, f.box.x, 0, f.box.x + f.box.w, 260, [
      [0, rgba('#ff8af0', 0)],
      [0.4, rgba('#ff8af0', 0.08)],
      [0.55, rgba(holo, 0.14)],
      [0.7, rgba('#8affc8', 0.06)],
      [1, rgba('#8affc8', 0)],
    ]);
    l.fillRect(f.box.x, f.box.y, f.box.w, f.box.h);
  });
  scanlines(g, f.box, holo, 0.1);
  scanlines(g, { x: f.box.x, y: f.box.y + 3, w: f.box.w, h: f.box.h }, '#1a3a6a', 0.035);
  chromeBand(g, holo, f);
  clockFace(g, holo, o.live);
  for (const t of f.toes) toeCap(g, t, holo);
  f.sil.edge(rgba(holo, 0.55), 4, 0, 0);
  f.sil.edge(rgba('#ffffff', 0.5), 5, -LX * 3, -LY * 3);
  f.sil.finish(mix(inkOf(art.skin), '#1a3a8a', 0.55), { openTop: f.top + 1.5, inner: 0.35 });
}

registerStyle('ghostfuture', {
  rig: BARE_RIG,
  contactY: 264,
  halfWidth: 104,
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 40 },
  draw: drawGhostFuture,
});

/** The ghost's silhouette at rest (live scan band frames clip to it). */
export function ghostSilPaths(): PathFn[] {
  return bareParts(restToes(GHOST_LOOK), GHOST_LOOK);
}
