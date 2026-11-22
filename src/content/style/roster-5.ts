// Roster batch, part 5: the Rink, the Slopes, the Cellar and the rare feet (Pogo Paul, Graffiti Gina, Bowling Shoe
// Barry, Jukebox Jo, Skateboard Skye, Snowshoe Sven, Hiking Boot Hank, Skier Skip, Mime Mike, Neon Nina, Crusty Foot,
// Mimic Foot), redrawn in the style kit. Life in play: src/content/styleLive/roster.ts.

import { bareParts, onToe, poseToes, restToes } from '../../art/style/anatomy';
import { type BareFoot, paintBare } from '../../art/style/bare';
import { LIGHT, type PathFn, type Pose, ao, crease, glint, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil, lobe } from '../../art/style/sil';
import { registerStyle } from '../../art/style/registry';
import { beadEye, blotches, contact, eyelet, laceRun, rivet, stitches } from '../../art/style/details';
import { tones } from '../../art/style/materials';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';
import { BARE_RIG, CX, SHOE_RIG, ell, finishLight, glowDot, glowLayer, hgrad, piece, prop, rrect, solePath, upperPath, vgrad, within } from './roster-kit';
import { starPath } from './roster-2';

/** Paint a canvas-and-rubber high-top: the upper in `col`, rubber sole and toe cap, laces up the front. Returns the
 * silhouette's paint layer so the foot can add its story, and the parts it used. */
function highTop(ctx: Ctx, o: { col: string; rubber: string; lace: string; stripe?: string; flex: number; toeY?: number; extra?: PathFn[]; box?: { x: number; y: number; w: number; h: number } }): { sil: Sil; g: Ctx; upper: PathFn; sole: PathFn; cap: PathFn } {
  const shape = { topW: 58, ballW: 96, toeY: o.toeY ?? 236 };
  const flex = o.flex;
  const upper = upperPath(shape, flex);
  const sole = solePath(shape, flex, 22, 170, 4);
  const b = shape.toeY;
  const cap: PathFn = (c) => {
    c.beginPath();
    c.ellipse(CX, b - flex * 6, 88, 48 - flex * 4, 0, Math.PI, 0);
    c.lineTo(CX + 88, b + 20);
    c.lineTo(CX - 88, b + 20);
    c.closePath();
  };
  const box = o.box ?? { x: CX - 108, y: -10, w: 216, h: 290 };
  const sil = new Sil(ctx, [sole, upper, ...(o.extra ?? [])], box);
  const g = sil.g;
  const t = tones('canvas', o.col);
  within(g, sole, () => {
    g.fillStyle = vgrad(g, 170, b + 26, [[0, shade(o.rubber, 0.08)], [0.7, o.rubber], [1, mix(shade(o.rubber, -0.3), '#5a5a7a', 0.3)]]);
    g.fillRect(box.x, 160, box.w, 130);
    texture(g, 'rubber', box, 0.3);
    if (o.stripe) {
      g.fillStyle = o.stripe;
      g.fillRect(box.x, b + 10 - flex * 5, box.w, 4);
    }
    g.fillStyle = rgba('#3a3a4a', 0.4);
    g.fillRect(box.x, b + 16 - flex * 5, box.w, 8);
    spec(g, CX - 54, b, 40, 6, 0.5, 0.05);
  });
  within(g, upper, () => {
    g.fillStyle = vgrad(g, 0, b, [[0, t.hi], [0.5, t.mid], [1, t.lo]]);
    g.fillRect(box.x, -10, box.w, b + 20);
    texture(g, 'canvas', box, 0.42, 1.25);
  });
  lobe(g, upper, { x: box.x, y: -20, w: box.w, h: 300 }, -30, 0, t.lo, 0.6, 16, 0.25);
  within(g, upper, () => {
    piece(g, cap, { x: CX - 88, y: b - 48, w: 176, h: 68 }, 'rubber', o.rubber, { shadow: 0.4 });
    for (let i = 0; i < 3; i++) {
      g.strokeStyle = rgba('#8a8aa0', 0.22);
      g.lineWidth = 1.1;
      g.beginPath();
      g.ellipse(CX, b + 12 - i * 7 - flex * 4, 70 - i * 6, 26, 0, Math.PI + 0.35, -0.35);
      g.stroke();
    }
  });
  stitches(g, (c) => c.ellipse(CX, b - flex * 6, 82, 42 - flex * 4, 0, Math.PI + 0.12, -0.12), rgba(shade(o.col, -0.3), 0.9), 1.3, 3.5, 3);
  // lacing up the front
  const EY = [22, 44, 66, 88, 110];
  for (const y of EY) for (const s of [-1, 1]) eyelet(g, CX + s * 24, y, 3.6);
  for (let i = EY.length - 1; i > 0; i--) {
    laceRun(g, CX - 24, EY[i], CX + 24, EY[i - 1], o.lace, 4.8);
    laceRun(g, CX + 24, EY[i], CX - 24, EY[i - 1], o.lace, 4.8);
  }
  return { sil, g, upper, sole, cap };
}

// ════════════════════════ Pogo Paul ════════════════════════
// A yellow high-top bolted to a pogo stick: a blue footplate, a chrome coil spring and a rubber tip. In play the
// spring squashes hard on landing and bounces back (the rig), with a puff of dust; it compresses before he hops.

function springPath(y0: number, y1: number): PathFn {
  return (c) => {
    c.beginPath();
    c.roundRect(CX - 28, y0, 56, y1 - y0, 10);
  };
}

registerStyle('pogo', {
  contactY: 314,
  rig: { from: 230, to: 246 },
  leg: { kind: 'knit', hw: 50, join: 'into' },
  draw(ctx, art, p) {
    const yellow = art.primary ?? '#ffcf1a';
    const blue = art.secondary ?? '#2f6ad0';
    const flex = Math.max(0, p.curl);
    const squash = Math.max(0, -p.curl);
    // the spring and tip below the shoe: shorter as the foot curls (compress) and longer as it splays (bounce)
    const sy0 = 248;
    const sy1 = 300 - flex * 14 + squash * 4;
    const plate = rrect(CX - 76, 236, 152, 14, 6);
    const spring = springPath(sy0, sy1);
    const tip = rrect(CX - 16, sy1 - 2, 32, 16, 6);
    const { sil, g } = highTop(ctx, { col: yellow, rubber: '#f8f6f0', lace: '#fbfaf6', stripe: blue, flex: 0, toeY: 214, extra: [plate, spring, tip] });
    // the blue side flash (the old Paul's)
    within(g, upperPath({ topW: 58, ballW: 96, toeY: 214 }, 0), () => {
      for (const s of [-1, 1]) {
        const fl: PathFn = (c) => {
          c.beginPath();
          c.moveTo(CX + s * 98, 120);
          c.quadraticCurveTo(CX + s * 64, 150, CX + s * 74, 196);
          c.lineTo(CX + s * 104, 196);
          c.closePath();
        };
        piece(g, fl, { x: CX + (s < 0 ? -104 : 64), y: 120, w: 40, h: 76 }, 'canvas', blue, { shadow: 0.35 });
      }
    });
    piece(g, plate, { x: CX - 76, y: 236, w: 152, h: 14 }, 'enamel', blue, { shadow: 0.5 });
    // the coil: chrome rings, lit on the left, shading round the right
    within(g, spring, () => {
      g.fillStyle = '#1a1e28';
      g.fillRect(CX - 30, sy0, 60, sy1 - sy0);
      const n = 7;
      for (let i = 0; i < n; i++) {
        const y = sy0 + 3 + ((sy1 - sy0 - 6) * (i + 0.5)) / n;
        const h = (sy1 - sy0) / n;
        g.fillStyle = hgrad(g, CX - 28, CX + 28, [[0, '#5a6270'], [0.25, '#f4f8fc'], [0.55, '#a8b0bc'], [1, '#3a404a']]);
        g.beginPath();
        g.ellipse(CX, y, 28, Math.max(2.2, h * 0.36), -0.08, 0, Math.PI * 2);
        g.fill();
      }
    });
    piece(g, tip, { x: CX - 16, y: sy1 - 2, w: 32, h: 16 }, 'rubber', '#2a2a30', { shadow: 0.4 });
    void squash;
    finishLight(sil, yellow, '#4a3008', 0.3);
    sil.finish(inkOf(yellow), { openTop: -5 });
  },
});

// ════════════════════════ Graffiti Gina ════════════════════════
// A white high-top tagged all over: drips and splats, a lightning badge, purple laces, and a spray can tucked into
// the collar. In play paint mist hisses out of the can and drips run off her.

const CAN: [number, number] = [CX + 84, 22];
function sprayCan(g: Ctx, purple: string): void {
  const [x, y] = CAN;
  g.save();
  g.translate(x, y);
  g.rotate(0.35);
  const body = rrect(-11, 0, 22, 58, 5);
  const cap = rrect(-8, -12, 16, 14, 3);
  prop(g, [body, cap], { x: -14, y: -14, w: 28, h: 76 }, (pg, sil) => {
    sil.form({ base: '#d8dce4', shadowTint: '#1a2030', ramp: 1, form: 0.5, formSize: 6, bevel: 0.5, rim: 0.6 });
    piece(pg, rrect(-11, 12, 22, 30, 0), { x: -11, y: 12, w: 22, h: 30 }, 'enamel', '#ff4fa3', { shadow: 0.2 });
    piece(pg, cap, { x: -8, y: -12, w: 16, h: 14 }, 'plastic', purple, { shadow: 0.3 });
    spec(pg, -5, 30, 3, 20, 0.8, 0);
  }, '#2a2030', { w: 3 });
  g.restore();
}

registerStyle('graffiti', {
  contactY: 262,
  rig: SHOE_RIG,
  leg: { kind: 'denim', hw: 70, join: 'hem' },
  draw(ctx, art, p) {
    const white = art.primary ?? '#f4f1ea';
    const purple = art.secondary ?? '#7b5cff';
    const flex = Math.max(0, p.curl);
    const { sil, g, upper } = highTop(ctx, { col: white, rubber: '#f8f6f0', lace: purple, stripe: purple, flex });
    const r = rng(hashStr('graffiti'));
    within(g, upper, () => {
      // splats and drips in four paints
      const paints = ['#ff4fa3', '#36d6c3', '#ffcf1a', purple];
      for (let i = 0; i < 9; i++) {
        const x = CX - 90 + r() * 180;
        const y = 30 + r() * 170;
        if (Math.abs(x - CX) < 34 && y < 120) continue;
        const col = paints[i % 4];
        const s = 6 + r() * 9;
        softFill(g, ell(x, y, s, s * 0.8, r() * 3), rgba(col, 0.9), 0.8);
        for (let k = 0; k < 5; k++) {
          const a = r() * Math.PI * 2;
          g.fillStyle = rgba(col, 0.85);
          g.beginPath();
          g.arc(x + Math.cos(a) * s * 1.5, y + Math.sin(a) * s * 1.2, 1 + r() * 2, 0, Math.PI * 2);
          g.fill();
        }
        if (r() < 0.6) {
          const len = 10 + r() * 24;
          g.fillStyle = rgba(col, 0.9);
          g.beginPath();
          g.roundRect(x - 1.6, y, 3.2, len, 1.6);
          g.fill();
          g.beginPath();
          g.arc(x, y + len, 2.6, 0, Math.PI * 2);
          g.fill();
        }
      }
      // a quick tag
      softStroke(g, (c) => {
        c.moveTo(CX - 86, 150);
        c.bezierCurveTo(CX - 70, 120, CX - 50, 180, CX - 36, 140);
        c.bezierCurveTo(CX - 26, 116, CX - 10, 170, CX + 10, 150);
      }, rgba('#1a1420', 0.85), 3.6, 0.5);
    });
    // the lightning badge
    const badge = ell(CX - 64, 60, 17, 17);
    piece(g, badge, { x: CX - 81, y: 43, w: 34, h: 34 }, 'enamel', '#ffffff', { shadow: 0.5 });
    const bolt: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 60, 46);
      c.lineTo(CX - 72, 62);
      c.lineTo(CX - 64, 62);
      c.lineTo(CX - 68, 76);
      c.lineTo(CX - 55, 58);
      c.lineTo(CX - 63, 58);
      c.closePath();
    };
    piece(g, bolt, { x: CX - 72, y: 46, w: 17, h: 30 }, 'plastic', '#2a2050', { shadow: 0 });
    finishLight(sil, white, '#3a3060', 0.3);
    sil.finish(inkOf(shade(white, -0.35)), { openTop: -5 });
    sprayCan(ctx, purple);
  },
});

// ════════════════════════ Bowling Shoe Barry ════════════════════════
// Rental bowling shoes, size ten: a cream centre panel with laces, red leather sides and heel, a stitched "10" disc,
// and a marbled blue ball beside him. In play the ball gleams and he leans into his roll.

registerStyle('bowling', {
  contactY: 262,
  halfWidth: 108,
  rig: SHOE_RIG,
  leg: { kind: 'wool', hw: 66, join: 'hem' },
  draw(ctx, art, p) {
    const red = art.primary ?? '#c8262e';
    const cream = art.secondary ?? '#f2ead6';
    const flex = Math.max(0, p.curl);
    const shape = { topW: 58, ballW: 96, toeY: 238 };
    const upper = upperPath(shape, flex);
    const sole = solePath(shape, flex, 22, 180, 3);
    const box = { x: CX - 108, y: -10, w: 216, h: 280 };
    const sil = new Sil(ctx, [sole, upper], box);
    const g = sil.g;
    within(g, sole, () => {
      g.fillStyle = vgrad(g, 180, 264, [[0, '#d8c8a8'], [1, '#8a7a5a']]);
      g.fillRect(box.x, 170, box.w, 100);
      texture(g, 'leather', box, 0.3, 1.2);
    });
    piece(g, upper, box, 'leather', red, { shadow: 0, size: 20 });
    // the cream saddle down the middle, stitched, with the laces
    const saddle: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 48, -6);
      c.bezierCurveTo(CX - 56, 80, CX - 80, 150, CX - 74, 210 - flex * 5);
      c.quadraticCurveTo(CX, 244 - flex * 6, CX + 74, 210 - flex * 5);
      c.bezierCurveTo(CX + 80, 150, CX + 56, 80, CX + 48, -6);
      c.closePath();
    };
    within(g, upper, () => {
      piece(g, saddle, { x: CX - 80, y: -6, w: 160, h: 240 }, 'leather', cream, { shadow: 0.5, size: 14 });
      stitches(g, (c) => {
        c.moveTo(CX - 44, 0);
        c.bezierCurveTo(CX - 51, 80, CX - 74, 150, CX - 68, 206 - flex * 5);
        c.quadraticCurveTo(CX, 238 - flex * 6, CX + 68, 206 - flex * 5);
        c.bezierCurveTo(CX + 74, 150, CX + 51, 80, CX + 44, 0);
      }, rgba(shade(cream, -0.45), 0.9), 1.3, 3.5, 3);
      const EY = [24, 46, 68, 90, 112, 134];
      for (const y of EY) for (const s of [-1, 1]) eyelet(g, CX + s * 22, y, 3.4);
      for (let i = EY.length - 1; i > 0; i--) {
        laceRun(g, CX - 22, EY[i], CX + 22, EY[i - 1], '#fbfaf6', 4.6);
        laceRun(g, CX + 22, EY[i], CX - 22, EY[i - 1], '#fbfaf6', 4.6);
      }
      // the size disc on the side
      const disc = ell(CX + 70, 100, 18, 18);
      piece(g, disc, { x: CX + 52, y: 82, w: 36, h: 36 }, 'enamel', '#ffffff', { shadow: 0.45 });
      g.save();
      g.font = '900 17px "Arial Black", Impact, sans-serif';
      g.textAlign = 'center';
      g.fillStyle = red;
      g.fillText('10', CX + 70, 106);
      g.restore();
    });
    finishLight(sil, red, '#2a0818', 0.3);
    sil.finish(inkOf(red), { openTop: -5 });
    // the ball beside him: marbled blue resin, three finger holes
    const ball = ell(CX - 90, 232, 30, 30);
    prop(ctx, [ball], { x: CX - 122, y: 200, w: 64, h: 64 }, (bg, bsil) => {
      bsil.form({ base: '#2f4ad0', shadowTint: '#0a0a3a', ramp: 0.9, form: 0.55, formSize: 10, bevel: 0.5, rim: 0.7 });
      const r = rng(hashStr('bowling'));
      for (let i = 0; i < 8; i++) {
        softStroke(bg, (c) => {
          const x = CX - 110 + r() * 40;
          const y = 210 + r() * 44;
          c.moveTo(x, y);
          c.bezierCurveTo(x + 10, y - 6, x + 14, y + 8, x + 26, y + 2);
        }, rgba(r() < 0.5 ? '#8ab0ff' : '#1a1a6a', 0.5), 3, 2);
      }
      for (const [x, y] of [[CX - 100, 222], [CX - 88, 220], [CX - 94, 234]] as const) {
        bg.fillStyle = '#0a0a1a';
        bg.beginPath();
        bg.ellipse(x, y, 3.6, 4, 0, 0, Math.PI * 2);
        bg.fill();
        bg.strokeStyle = rgba('#8ab0ff', 0.5);
        bg.lineWidth = 1;
        bg.stroke();
      }
      spec(bg, CX - 102, 216, 10, 6, 0.9, -0.6);
      glint(bg, CX - 104, 214, 4, 1);
    }, inkOf('#2f4ad0'));
  },
});

// ════════════════════════ Jukebox Jo ════════════════════════
// A jukebox for a boot: a walnut arch with rainbow neon tubes, a spinning record behind glass, a selector row and a
// chrome speaker grille. In play the neon pulses to the beat (its glow layer), and music notes float off it.

const JUKE = (c: Ctx) => {
  c.beginPath();
  c.moveTo(CX - 86, 260);
  c.lineTo(CX - 86, 110);
  c.bezierCurveTo(CX - 86, 10, CX + 86, 10, CX + 86, 110);
  c.lineTo(CX + 86, 260);
  c.closePath();
};
const ARCHES = ['#ff3a3a', '#ff9a1a', '#ffe14d', '#3ad86a', '#3aa8ff', '#9a5aff'];

function neonArches(g: Ctx, k: number, core: boolean): void {
  ARCHES.forEach((col, i) => {
    const w = 76 - i * 6;
    const top = 30 + i * 6;
    const path = (c: Ctx) => {
      c.moveTo(CX - w, 210);
      c.lineTo(CX - w, 110);
      c.bezierCurveTo(CX - w, top - 8, CX + w, top - 8, CX + w, 110);
      c.lineTo(CX + w, 210);
    };
    softStroke(g, path, rgba(col, 0.6 * k), 9, 4);
    g.save();
    g.lineCap = 'round';
    g.beginPath();
    path(g);
    g.strokeStyle = rgba(col, k);
    g.lineWidth = 4.2;
    g.stroke();
    if (core) {
      g.beginPath();
      path(g);
      g.strokeStyle = rgba('#ffffff', 0.7 * k);
      g.lineWidth = 1.4;
      g.stroke();
    }
    g.restore();
  });
}

registerStyle('jukebox', {
  contactY: 266,
  halfWidth: 106,
  leg: { kind: 'denim', hw: 66, join: 'hem' },
  draw(ctx, art, _p, o) {
    const wood = art.primary ?? '#8a1f3a';
    const gold = art.secondary ?? '#ffcf3a';
    const box = { x: CX - 92, y: 0, w: 184, h: 270 };
    if (o.emissive) {
      glowLayer(ctx, [JUKE], box, (g) => {
        neonArches(g, 1, true);
        for (let i = 0; i < 6; i++) glowDot(g, CX - 40 + i * 16, 218, 7, gold, 0.9);
      });
      return;
    }
    const sil = new Sil(ctx, [JUKE], box);
    const g = sil.g;
    piece(g, JUKE, box, 'wood', wood, { shadow: 0, size: 16 });
    texture(g, 'wood', box, 0.3, 1.2);
    // the window: dark glass with the record behind it
    const win: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 38, 196);
      c.lineTo(CX - 38, 116);
      c.bezierCurveTo(CX - 38, 66, CX + 38, 66, CX + 38, 116);
      c.lineTo(CX + 38, 196);
      c.closePath();
    };
    within(g, win, () => {
      g.fillStyle = vgrad(g, 70, 196, [[0, '#1a1020'], [1, '#2a1a30']]);
      g.fillRect(CX - 40, 60, 80, 140);
      // the record
      g.fillStyle = '#0a0a0e';
      g.beginPath();
      g.arc(CX, 142, 30, 0, Math.PI * 2);
      g.fill();
      for (let r = 10; r < 30; r += 3) {
        g.strokeStyle = rgba('#3a3a4a', 0.6);
        g.lineWidth = 0.8;
        g.beginPath();
        g.arc(CX, 142, r, 0, Math.PI * 2);
        g.stroke();
      }
      spec(g, CX - 12, 130, 14, 4, 0.4, -0.8);
      g.fillStyle = '#ff3a3a';
      g.beginPath();
      g.arc(CX, 142, 8, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(CX, 142, 1.6, 0, Math.PI * 2);
      g.fill();
      // reflections on the glass
      g.fillStyle = rgba('#ffffff', 0.12);
      g.beginPath();
      g.moveTo(CX - 38, 100);
      g.lineTo(CX - 20, 80);
      g.lineTo(CX + 10, 196);
      g.lineTo(CX - 10, 196);
      g.closePath();
      g.fill();
    });
    // the neon tubes in their channels
    neonArches(g, 0.85, true);
    // the selector buttons and the chrome grille
    for (let i = 0; i < 6; i++) {
      piece(g, rrect(CX - 46 + i * 16, 212, 12, 12, 3), { x: CX - 46 + i * 16, y: 212, w: 12, h: 12 }, 'plastic', i % 2 ? '#fbf6ea' : gold, { shadow: 0.4 });
    }
    const grille = rrect(CX - 70, 230, 140, 26, 6);
    within(g, grille, () => {
      g.fillStyle = hgrad(g, CX - 70, CX + 70, [[0, '#5a6270'], [0.3, '#f4f8fc'], [0.6, '#a8b0bc'], [1, '#3a404a']]);
      g.fillRect(CX - 70, 230, 140, 26);
      for (let y = 234; y < 256; y += 5) {
        g.fillStyle = rgba('#1a1e28', 0.6);
        g.fillRect(CX - 70, y, 140, 2);
      }
    });
    contact(g, (c) => {
      grille(c);
      c.fill();
    }, 0);
    finishLight(sil, wood, '#200818', 0.3);
    sil.finish(inkOf(wood), { openTop: -5 });
  },
});

/** A music note (the critters off Jukebox Jo), at the origin. */
export function musicNote(g: Ctx, col: string, double: boolean): void {
  const p: PathFn = (c) => {
    c.beginPath();
    c.ellipse(-6, 10, 7, 5.4, -0.4, 0, Math.PI * 2);
    c.rect(-1, -14, 3.2, 24);
    if (double) {
      c.ellipse(14, 6, 7, 5.4, -0.4, 0, Math.PI * 2);
      c.rect(19, -18, 3.2, 24);
      c.moveTo(-1, -14);
      c.lineTo(22, -18);
      c.lineTo(22, -12);
      c.lineTo(-1, -8);
    } else {
      c.moveTo(2, -14);
      c.quadraticCurveTo(14, -8, 10, 4);
      c.quadraticCurveTo(10, -4, 2, -6);
    }
    c.closePath();
  };
  g.fillStyle = '#2a1830';
  g.save();
  g.translate(1.5, 1.5);
  p(g);
  g.fill();
  g.restore();
  g.fillStyle = col;
  p(g);
  g.fill();
}

// ════════════════════════ Skateboard Skye ════════════════════════
// A black suede skate shoe with pink trim, standing on a pink deck with grip tape, trucks and urethane wheels. In play
// the board tilts towards where she'll switch, sparks grind off the trucks and grit kicks up when she lands.

registerStyle('skateboard', {
  contactY: 278,
  halfWidth: 122,
  rig: { from: 150, to: 170 },
  leg: { kind: 'knit', hw: 50, join: 'into' },
  draw(ctx, art, p) {
    const black = art.primary ?? '#2b2b33';
    const pink = art.secondary ?? '#ff4fa3';
    const flex = Math.max(0, p.curl);
    const shape = { topW: 56, ballW: 92, toeY: 226 };
    const upper = upperPath(shape, flex);
    const sole = solePath(shape, flex, 14, 180, 3);
    const deck: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 120, 236);
      c.quadraticCurveTo(CX - 132, 236, CX - 136, 226);
      c.lineTo(CX - 130, 222);
      c.quadraticCurveTo(CX - 124, 228, CX - 116, 228);
      c.lineTo(CX + 116, 228);
      c.quadraticCurveTo(CX + 124, 228, CX + 130, 222);
      c.lineTo(CX + 136, 226);
      c.quadraticCurveTo(CX + 132, 236, CX + 120, 236);
      c.lineTo(CX + 116, 246);
      c.lineTo(CX - 116, 246);
      c.closePath();
    };
    const trucks = [rrect(CX - 90, 244, 34, 12, 3), rrect(CX + 56, 244, 34, 12, 3)];
    const wheels = [CX - 98, CX - 48, CX + 48, CX + 98].map((x) => rrect(x - 10, 252, 20, 26, 7));
    const box = { x: CX - 140, y: -10, w: 280, h: 292 };
    const sil = new Sil(ctx, [...wheels, ...trucks, deck, sole, upper], box);
    const g = sil.g;
    for (const w of wheels) {
      piece(g, w, box, 'rubber', '#fbf6ea', { shadow: 0, size: 6 });
    }
    for (const t of trucks) piece(g, t, box, 'chrome', '#a8b0bc', { shadow: 0, size: 4 });
    // the deck: pink, maple edge, black grip on top
    within(g, deck, () => {
      g.fillStyle = vgrad(g, 222, 246, [[0, '#1a1a20'], [0.3, '#2a2a30'], [0.32, '#e8c890'], [0.45, shade(pink, 0.1)], [1, shade(pink, -0.3)]]);
      g.fillRect(box.x, 220, box.w, 28);
      texture(g, 'speckle', { x: box.x, y: 220, w: box.w, h: 8 }, 0.5, 1);
      spec(g, CX - 60, 240, 60, 2.5, 0.6, 0);
    });
    within(g, sole, () => {
      g.fillStyle = vgrad(g, 180, 242, [[0, '#fbf6ea'], [1, '#c8c0b0']]);
      g.fillRect(box.x, 170, box.w, 80);
      g.fillStyle = pink;
      g.fillRect(box.x, 228 - flex * 5, box.w, 3);
    });
    piece(g, upper, box, 'suede', black, { shadow: 0.3, size: 16 });
    within(g, upper, () => {
      // pink trim swoosh and collar padding, and laces
      for (const s of [-1, 1]) {
        softStroke(g, (c) => {
          c.moveTo(CX + s * 94, 120);
          c.bezierCurveTo(CX + s * 60, 160, CX + s * 70, 190, CX + s * 96, 200);
        }, rgba(pink, 0.95), 7, 0.6);
      }
      stitches(g, (c) => c.ellipse(CX, 220 - flex * 6, 76, 40, 0, Math.PI + 0.12, -0.12), rgba('#8a8a96', 0.9), 1.3, 3.5, 3);
      const EY = [24, 46, 68, 90, 112];
      for (const y of EY) for (const s of [-1, 1]) eyelet(g, CX + s * 22, y, 3.4);
      for (let i = EY.length - 1; i > 0; i--) {
        laceRun(g, CX - 22, EY[i], CX + 22, EY[i - 1], '#fbfaf6', 4.6);
        laceRun(g, CX + 22, EY[i], CX - 22, EY[i - 1], '#fbfaf6', 4.6);
      }
      spec(g, CX - 44, 100, 30, 50, 0.12, 0.2, '#d8d8f0');
    });
    finishLight(sil, black, '#100818', 0.25);
    sil.finish(inkOf(shade(black, 0.3)), { openTop: -5 });
  },
});

// ════════════════════════ Snowshoe Sven ════════════════════════
// A quilted blue snow boot strapped into a wide ash-frame snowshoe laced with rawhide, crusted with snow. In play snow
// sprays off the frame when he lands and flakes drift off him.

registerStyle('snowshoe', {
  contactY: 298,
  halfWidth: 140,
  leg: { kind: 'wool', hw: 66, join: 'hem' },
  draw(ctx, art, p) {
    const wood = art.primary ?? '#7a4a22';
    const blue = art.secondary ?? '#2f6ad0';
    void p;
    const frame = ell(CX, 248, 142, 50);
    const box = { x: CX - 146, y: 190, w: 292, h: 112 };
    // the snowshoe: an oval frame of steamed ash, rawhide lacing, a crust of snow
    prop(ctx, [frame], box, (g, sil) => {
      sil.form({ base: wood, shadowTint: '#2a0a04', ramp: 0.8, form: 0.5, formSize: 10, bevel: 0.4, rim: 0.4 });
      texture(g, 'wood', box, 0.45, 1.2);
      const inner = ell(CX, 248, 128, 40);
      within(g, inner, () => {
        g.fillStyle = '#e8eef8';
        g.fillRect(box.x, box.y, box.w, box.h);
        // the lacing: a diamond weave of rawhide
        g.strokeStyle = '#c8a46a';
        g.lineWidth = 2.4;
        for (let k = -16; k <= 16; k++) {
          g.beginPath();
          g.moveTo(CX + k * 16 - 60, 200);
          g.lineTo(CX + k * 16 + 60, 300);
          g.moveTo(CX + k * 16 + 60, 200);
          g.lineTo(CX + k * 16 - 60, 300);
          g.stroke();
        }
        g.strokeStyle = rgba('#5a3a14', 0.4);
        g.lineWidth = 0.8;
        for (let k = -16; k <= 16; k++) {
          g.beginPath();
          g.moveTo(CX + k * 16 - 60 + 1.5, 200);
          g.lineTo(CX + k * 16 + 60 + 1.5, 300);
          g.stroke();
        }
        ao(g, CX, 236, 110, 24, 0.35, 0, '#203050');
      });
      // snow crusted on the frame
      const r = rng(hashStr('snowshoe'));
      for (let i = 0; i < 16; i++) {
        const a = r() * Math.PI * 2;
        const x = CX + Math.cos(a) * 135;
        const y = 248 + Math.sin(a) * 45;
        piece(g, ell(x, y - 3, 7 + r() * 8, 4 + r() * 3), { x: x - 15, y: y - 10, w: 30, h: 14 }, 'plush', '#ffffff', { shadow: 0.3 });
      }
    }, inkOf(wood));
    // the boot: quilted nylon over a rubber shell, a binding strap over the toe
    const shape = { topW: 60, ballW: 90, toeY: 236 };
    const upper = upperPath(shape, 0);
    const shell: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 92, 168);
      c.bezierCurveTo(CX - 98, 240, CX - 60, 254, CX, 254);
      c.bezierCurveTo(CX + 60, 254, CX + 98, 240, CX + 92, 168);
      c.closePath();
    };
    const strap = rrect(CX - 100, 196, 200, 20, 4);
    const bbox = { x: CX - 104, y: -10, w: 208, h: 270 };
    const sil = new Sil(ctx, [upper, shell, strap], bbox);
    const g = sil.g;
    piece(g, upper, bbox, 'canvas', blue, { shadow: 0, size: 18 });
    within(g, upper, () => {
      for (let y = 18; y < 180; y += 20) {
        crease(g, (c) => {
          c.moveTo(CX - 100, y);
          c.quadraticCurveTo(CX, y + 10, CX + 100, y);
        }, 2.2, '#0a1a4a', 0.5, 0.35);
        spec(g, CX - 30, y + 10, 40, 4, 0.3, 0.05);
      }
      // white trim stripes
      g.fillStyle = rgba('#ffffff', 0.85);
      g.fillRect(bbox.x, 60, bbox.w, 3);
    });
    piece(g, shell, bbox, 'rubber', '#2a2e3a', { shadow: 0.5, size: 10 });
    piece(g, strap, { x: CX - 100, y: 196, w: 200, h: 20 }, 'leather', '#1a1a1e', { shadow: 0.5 });
    for (const s of [-1, 1]) {
      piece(g, rrect(CX + s * 66 - 8, 194, 16, 24, 3), { x: CX + s * 66 - 8, y: 194, w: 16, h: 24 }, 'chrome', '#c8ccd4', { shadow: 0.4 });
    }
    finishLight(sil, blue, '#0a1030', 0.3);
    sil.finish(inkOf(blue), { openTop: -5 });
  },
});

// ════════════════════════ Hiking Boot Hank ════════════════════════
// Summit-tested: scuffed suede, a leather mudguard, red laces through speed hooks, a padded collar, a chunky lug
// sole and a coil of orange climbing rope. In play chips fly with every crack and grit kicks up when he lands.

registerStyle('hiking', {
  contactY: 268,
  rig: SHOE_RIG,
  leg: { kind: 'knit', hw: 50, join: 'into' },
  draw(ctx, art, p) {
    const suede = art.primary ?? '#a0743e';
    const red = art.secondary ?? '#d8343f';
    const flex = Math.max(0, p.curl);
    const shape = { topW: 60, ballW: 98, toeY: 236 };
    const upper = upperPath(shape, flex);
    const sole = solePath(shape, flex, 30, 170, 6);
    const collar = rrect(CX - 64, -6, 128, 30, 12);
    const box = { x: CX - 110, y: -10, w: 220, h: 290 };
    const sil = new Sil(ctx, [sole, upper, collar], box);
    const g = sil.g;
    // the lug sole: black rubber, deep lugs, a tan midsole stripe
    within(g, sole, () => {
      g.fillStyle = vgrad(g, 170, 270, [[0, '#3a3430'], [1, '#0c0a08']]);
      g.fillRect(box.x, 160, box.w, 110);
      texture(g, 'rubber', box, 0.35);
      g.fillStyle = '#c8a46a';
      g.fillRect(box.x, 236 - flex * 5, box.w, 6);
      for (let x = CX - 96; x <= CX + 90; x += 14) {
        g.fillStyle = '#060504';
        g.beginPath();
        g.moveTo(x, 268 - flex * 5);
        g.lineTo(x + 6, 252 - flex * 5);
        g.lineTo(x + 12, 268 - flex * 5);
        g.closePath();
        g.fill();
      }
    });
    piece(g, upper, box, 'suede', suede, { shadow: 0.4, size: 18 });
    within(g, upper, () => {
      blotches(g, box, shade(suede, -0.25), 0.28, 18, 0.58, 0.25, 41);
      blotches(g, box, shade(suede, 0.2), 0.2, 12, 0.62, 0.2, 43);
      // the leather mudguard round the toe
      const guard: PathFn = (c) => {
        c.beginPath();
        c.moveTo(CX - 100, 170);
        c.bezierCurveTo(CX - 60, 160, CX + 60, 160, CX + 100, 170);
        c.lineTo(CX + 110, 260);
        c.lineTo(CX - 110, 260);
        c.closePath();
      };
      piece(g, guard, { x: CX - 100, y: 160, w: 200, h: 90 }, 'leather', shade(suede, -0.45), { shadow: 0.5 });
      stitches(g, (c) => {
        c.moveTo(CX - 98, 176);
        c.bezierCurveTo(CX - 60, 166, CX + 60, 166, CX + 98, 176);
      }, rgba('#e8c88a', 0.85), 1.3, 3, 3);
      // laces through eyelets and speed hooks
      const EY = [30, 54, 78, 102, 126, 150];
      for (const [i, y] of EY.entries())
        for (const s of [-1, 1]) {
          if (i < 3) {
            g.strokeStyle = '#2a2e36';
            g.lineWidth = 4;
            g.beginPath();
            g.arc(CX + s * 26, y, 4, Math.PI * (s < 0 ? 0.5 : -0.5), Math.PI * (s < 0 ? 1.5 : 0.5));
            g.stroke();
            rivet(g, CX + s * 28, y, 2.4, '#c8ccd4');
          } else eyelet(g, CX + s * 26, y, 3.6, '#b8a070');
        }
      for (let i = EY.length - 1; i > 0; i--) {
        laceRun(g, CX - 26, EY[i], CX + 26, EY[i - 1], red, 4.4);
        laceRun(g, CX + 26, EY[i], CX - 26, EY[i - 1], red, 4.4);
      }
    });
    piece(g, collar, { x: CX - 64, y: -6, w: 128, h: 30 }, 'leather', shade(suede, -0.3), { shadow: 0.5 });
    finishLight(sil, suede, '#2a1008', 0.3);
    sil.finish(inkOf(suede), { openTop: -5 });
    // the coil of rope hanging off the side
    const coil = ell(CX + 106, 110, 22, 44);
    prop(ctx, [coil], { x: CX + 80, y: 62, w: 52, h: 96 }, (rg) => {
      rg.fillStyle = '#ff8a1a';
      rg.fillRect(CX + 80, 62, 52, 96);
      for (let k = 0; k < 7; k++) {
        rg.strokeStyle = rgba('#7a3a08', 0.75);
        rg.lineWidth = 2;
        rg.beginPath();
        rg.ellipse(CX + 106, 110, 22 - k * 0.5, 44 - k * 1.6, 0, 0, Math.PI * 2);
        rg.stroke();
        rg.strokeStyle = rgba('#ffd08a', 0.6);
        rg.lineWidth = 1;
        rg.beginPath();
        rg.ellipse(CX + 105, 109, 20 - k * 0.5, 42 - k * 1.6, 0, Math.PI * 0.9, Math.PI * 1.5);
        rg.stroke();
      }
      rg.fillStyle = '#5a2a10';
      rg.beginPath();
      rg.ellipse(CX + 106, 110, 10, 30, 0, 0, Math.PI * 2);
      rg.fill();
      spec(rg, CX + 96, 80, 6, 16, 0.5, 0);
    }, inkOf('#ff8a1a'), { w: 3.6 });
  },
});

// ════════════════════════ Skier Skip ════════════════════════
// A glossy blue race boot with four yellow buckles and a power strap, clicked into a white race ski with a racing
// stripe. In play snow sprays off the ski tip as he drops in, and a powder trail follows him.

registerStyle('skier', {
  contactY: 310,
  leg: { kind: 'wool', hw: 66, join: 'hem' },
  draw(ctx, art, p) {
    const blue = art.primary ?? '#2fa3ff';
    const yellow = art.secondary ?? '#ffcf1a';
    void p;
    const shell: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 62, -6);
      c.lineTo(CX - 66, 120);
      c.bezierCurveTo(CX - 98, 150, CX - 100, 230, CX - 80, 250);
      c.lineTo(CX + 80, 250);
      c.bezierCurveTo(CX + 100, 230, CX + 98, 150, CX + 66, 120);
      c.lineTo(CX + 62, -6);
      c.closePath();
    };
    const ski: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 50, 244);
      c.lineTo(CX + 50, 244);
      c.lineTo(CX + 58, 296);
      c.quadraticCurveTo(CX, 324, CX - 58, 296);
      c.closePath();
    };
    const binding = rrect(CX - 72, 240, 144, 16, 4);
    const box = { x: CX - 104, y: -10, w: 208, h: 330 };
    const sil = new Sil(ctx, [ski, binding, shell], box);
    const g = sil.g;
    within(g, ski, () => {
      g.fillStyle = vgrad(g, 244, 320, [[0, '#f8fafc'], [1, '#b8c0cc']]);
      g.fillRect(box.x, 240, box.w, 90);
      g.fillStyle = '#d8343f';
      g.beginPath();
      g.moveTo(CX - 54, 270);
      g.lineTo(CX + 54, 262);
      g.lineTo(CX + 56, 270);
      g.lineTo(CX - 56, 280);
      g.fill();
      g.fillStyle = blue;
      g.beginPath();
      g.moveTo(CX - 56, 284);
      g.lineTo(CX + 56, 274);
      g.lineTo(CX + 56, 279);
      g.lineTo(CX - 56, 289);
      g.fill();
      spec(g, CX - 30, 254, 30, 4, 0.7, 0);
    });
    piece(g, binding, { x: CX - 72, y: 240, w: 144, h: 16 }, 'chrome', '#6a7080', { shadow: 0.5 });
    // the shell: glossy plastic, a hinge, four buckles
    piece(g, shell, box, 'plastic', blue, { shadow: 0.5, size: 20, spec: false });
    within(g, shell, () => {
      spec(g, CX - 54, 60, 8, 50, 0.85, 0.02);
      spec(g, CX - 64, 190, 10, 30, 0.7, 0.3);
      spec(g, CX + 76, 180, 4, 30, 0.35, -0.3, LIGHT.rim);
      // the cuff/shell split and a hinge rivet
      crease(g, (c) => {
        c.moveTo(CX - 66, 120);
        c.quadraticCurveTo(CX, 134, CX + 66, 120);
      }, 2.4, '#0a2040', 0.7, 0.3);
      for (const s of [-1, 1]) rivet(g, CX + s * 62, 118, 4, '#c8ccd4');
      // the power strap at the top
      piece(g, rrect(CX - 66, 4, 132, 18, 3), { x: CX - 66, y: 4, w: 132, h: 18 }, 'canvas', '#1a1e28', { shadow: 0.5 });
      // buckles
      for (const [i, y] of [36, 72, 150, 196].entries()) {
        const w = i < 2 ? 64 : 86;
        piece(g, rrect(CX - w, y - 3, w * 1.4, 6, 2), { x: CX - w, y: y - 3, w: w * 1.4, h: 6 }, 'chrome', '#3a3e48', { shadow: 0.4 });
        const bk = rrect(CX + w * 0.42, y - 8, 30, 16, 4);
        piece(g, bk, { x: CX + w * 0.42, y: y - 8, w: 30, h: 16 }, 'enamel', yellow, { shadow: 0.5 });
        glint(g, CX + w * 0.42 + 7, y - 4, 2.4, 0.9);
      }
    });
    finishLight(sil, blue, '#0a1a40', 0.3);
    sil.finish(inkOf(blue), { openTop: -5 });
  },
});

// ════════════════════════ Mime Mike ════════════════════════
// A black shoe painted with a mime's white face (beret, black brows, red lips, a painted tear) above a Breton-striped
// sock. In play the painted eyes blink and follow your peel; he's invisible until he stomps (only his shadow shows).

export const MIME_EYES = { y: 196, dx: 18 };
function mimeEyes(g: Ctx, blink: number): void {
  const { y, dx } = MIME_EYES;
  for (const s of [-1, 1]) {
    const x = CX + s * dx;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(x, y, 9, 11, 0, 0, Math.PI * 2);
    g.fill();
    if (blink < 0.9) beadEye(g, x, y + 1, 5, 6.5 * (1 - blink), '#3a3a4a');
    g.fillStyle = '#ffffff';
    g.fillRect(x - 10, y - 12, 20, 23 * blink);
    g.strokeStyle = '#141418';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x - 9, y - 12 + 23 * blink);
    g.quadraticCurveTo(x, y - 8 + 23 * blink, x + 9, y - 12 + 23 * blink);
    g.stroke();
    // the painted brow and diamonds
    g.lineWidth = 2.6;
    g.beginPath();
    g.moveTo(x - 10, y - 15);
    g.quadraticCurveTo(x, y - 22 - s, x + 10, y - 16);
    g.stroke();
  }
}

registerStyle('mime', {
  contactY: 262,
  rig: { from: 230, to: 246 },
  leg: { kind: 'knit', hw: 52, join: 'into' },
  parts: { eyes: { box: { x: CX - MIME_EYES.dx - 14, y: MIME_EYES.y - 24, w: MIME_EYES.dx * 2 + 28, h: 40 }, frames: 5, draw: (g, _a, i) => mimeEyes(g, i / 4) } },
  draw(ctx, art, p, o) {
    const black = art.primary ?? '#141418';
    const white = art.secondary ?? '#f4f4f4';
    const flex = Math.max(0, p.curl);
    // the striped sock: a shaped knit collar above the shoe
    const sock: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 56, -6);
      c.bezierCurveTo(CX - 58, 40, CX - 70, 80, CX - 78, 120);
      c.lineTo(CX + 78, 120);
      c.bezierCurveTo(CX + 70, 80, CX + 58, 40, CX + 56, -6);
      c.closePath();
    };
    const shoe: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 84, 112);
      c.bezierCurveTo(CX - 110, 150, CX - 104, 262 - flex * 4, CX, 264 - flex * 5);
      c.bezierCurveTo(CX + 104, 262 - flex * 4, CX + 110, 150, CX + 84, 112);
      c.quadraticCurveTo(CX, 104, CX - 84, 112);
      c.closePath();
    };
    const box = { x: CX - 106, y: -10, w: 212, h: 280 };
    const sil = new Sil(ctx, [sock, shoe], box);
    const g = sil.g;
    piece(g, sock, box, 'knit', white, { shadow: 0, size: 16 });
    within(g, sock, () => {
      for (let y = 4; y < 120; y += 22) {
        g.fillStyle = black;
        g.fillRect(box.x, y, box.w, 11);
      }
      texture(g, 'knit', box, 0.5, 1.4);
      g.fillStyle = hgrad(g, CX - 78, CX + 78, [[0, rgba('#000000', 0.15)], [0.25, rgba('#ffffff', 0.1)], [0.6, rgba('#000000', 0)], [1, rgba('#0a0a30', 0.4)]]);
      g.fillRect(box.x, -10, box.w, 140);
    });
    piece(g, shoe, box, 'patent', black, { shadow: 0.55, size: 16, spec: false });
    within(g, shoe, () => {
      spec(g, CX - 70, 170, 8, 30, 0.6, 0.3);
      spec(g, CX + 82, 190, 4, 26, 0.35, -0.3, LIGHT.rim);
      // the painted face: white greasepaint oval, red lips, a tear, the beret
      const face = ell(CX, 210 - flex * 3, 52, 44);
      within(g, face, () => {
        g.fillStyle = vgrad(g, 166, 254, [[0, '#ffffff'], [1, '#d8d8e0']]);
        g.fillRect(CX - 60, 160, 120, 100);
        texture(g, 'grain', box, 0.15, 1);
      });
      contact(g, (c) => {
        face(c);
        c.fill();
      }, 0);
      if (!o.live) mimeEyes(g, 0);
      const lips: PathFn = (c) => {
        c.beginPath();
        c.moveTo(CX - 14, 232 - flex * 3);
        c.quadraticCurveTo(CX - 6, 224 - flex * 3, CX, 228 - flex * 3);
        c.quadraticCurveTo(CX + 6, 224 - flex * 3, CX + 14, 232 - flex * 3);
        c.quadraticCurveTo(CX, 242 - flex * 3, CX - 14, 232 - flex * 3);
        c.closePath();
      };
      piece(g, lips, { x: CX - 14, y: 224, w: 28, h: 18 }, 'sauce', '#d8203a', { shadow: 0.2 });
      const tear: PathFn = (c) => {
        c.beginPath();
        c.moveTo(CX + 22, 210);
        c.quadraticCurveTo(CX + 28, 220, CX + 22, 224);
        c.quadraticCurveTo(CX + 16, 220, CX + 22, 210);
        c.closePath();
      };
      piece(g, tear, { x: CX + 16, y: 210, w: 12, h: 14 }, 'plastic', '#3a3a4a', { shadow: 0 });
      // the beret on top of the face
      const beret: PathFn = (c) => {
        c.beginPath();
        c.ellipse(CX - 6, 168, 44, 13, -0.12, 0, Math.PI * 2);
      };
      piece(g, beret, { x: CX - 50, y: 155, w: 88, h: 26 }, 'knit', '#1a1a20', { shadow: 0.5, size: 6 });
      piece(g, rrect(CX - 9, 148, 6, 10, 2), { x: CX - 9, y: 148, w: 6, h: 10 }, 'knit', '#1a1a20', { shadow: 0.2 });
    });
    finishLight(sil, black, '#0a0a20', 0.25);
    sil.finish(inkOf(shade(black, 0.35)), { openTop: -5 });
  },
});

// ════════════════════════ Neon Nina ════════════════════════
// A dark velvet sock traced in bent neon: a pink outline round the foot, a cyan star, five cyan rings for toes, the
// tubes held on by little brackets. In play the tubes buzz and flicker (her glow layer); they flicker out before she
// phases.

function neonTubes(g: Ctx, pink: string, cyan: string, k: number, toes: ReturnType<typeof poseToes>): void {
  const tube = (path: (c: Ctx) => void, col: string) => {
    softStroke(g, path, rgba(col, 0.6 * k), 12, 6);
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    path(g);
    g.strokeStyle = rgba(col, k);
    g.lineWidth = 5;
    g.stroke();
    g.beginPath();
    path(g);
    g.strokeStyle = rgba('#ffffff', 0.75 * k);
    g.lineWidth = 1.6;
    g.stroke();
    g.restore();
  };
  tube((c) => {
    c.moveTo(CX - 40, 10);
    c.bezierCurveTo(CX - 44, 50, CX - 80, 90, CX - 82, 150);
    c.moveTo(CX + 40, 10);
    c.bezierCurveTo(CX + 44, 50, CX + 84, 90, CX + 88, 150);
  }, pink);
  tube((c) => {
    const s = starPath(CX + 4, 100, 22, 9, -Math.PI / 2, 5, 0);
    s(c);
  }, cyan);
  for (const t of toes) {
    const [x, y] = onToe(t, Math.PI / 2);
    tube((c) => c.ellipse(x, y - t.ry * 0.45, t.rx * 0.55, t.ry * 0.4, t.rot, 0, Math.PI * 2), cyan);
  }
}

registerStyle('neon', {
  rig: BARE_RIG,
  leg: { kind: 'knit', hw: 52, join: 'blend', fade: 22 },
  draw(ctx, art, p, o) {
    const pink = art.primary ?? '#ff3dc8';
    const cyan = art.secondary ?? '#3df2ff';
    const toes = poseToes(restToes(), p);
    if (o.emissive) {
      glowLayer(ctx, [...bareParts(toes), rrect(CX - 120, -10, 240, 290, 0)], { x: CX - 120, y: -10, w: 240, h: 290 }, (g) => neonTubes(g, pink, cyan, 1, toes));
      return;
    }
    const f: BareFoot = paintBare(ctx, { skin: art.skin, nails: null, shadowTint: '#05030a', pores: 0, detail: 0.2 }, p);
    const g = f.sil.g;
    texture(g, 'fleece', f.box, 0.25, 1.1);
    // the bar's light on the velvet: pink and cyan spill
    softFill(g, ell(CX - 60, 120, 60, 90), rgba(pink, 0.18), 20);
    softFill(g, ell(CX + 10, 110, 50, 40), rgba(cyan, 0.15), 16);
    softFill(g, ell(CX, 230, 110, 30), rgba(cyan, 0.15), 14);
    neonTubes(g, pink, cyan, 0.8, f.toes);
    // brackets holding the tubes
    for (const [x, y] of [[CX - 44, 40], [CX - 78, 120], [CX + 46, 40], [CX + 82, 120]] as const) {
      piece(g, rrect(x - 4, y - 2, 8, 5, 1), { x: x - 4, y: y - 2, w: 8, h: 5 }, 'chrome', '#8a92a0', { shadow: 0.4 });
    }
    f.sil.finish(inkOf(mix(art.skin, pink, 0.3)), { openTop: f.top + 1.5 });
  },
});

// ════════════════════════ Crusty Foot ════════════════════════
// A Golden Foot baked into golden crust: polished gold skin wrapped in a plaited crust border, sesame and a dusting
// of flour. In play gold glints chase over it, crumbs scatter as it flees and Golden Crusts sparkle off it.

function goldFoot(ctx: Ctx, p: Pose, gold: string, story?: (g: Ctx, f: BareFoot) => void): BareFoot {
  const f = paintBare(ctx, { skin: gold, nails: shade(gold, 0.2), shadowTint: '#7a3008', pores: 0.05, detail: 0.6 }, p);
  const g = f.sil.g;
  // metal, not skin: brushed texture, warm reflections, hard highlights
  texture(g, 'brushed', f.box, 0.18, 1);
  g.fillStyle = hgrad(g, f.box.x, f.box.x + f.box.w, [[0, rgba('#fff4c0', 0.25)], [0.3, rgba('#fff8e0', 0.35)], [0.55, rgba('#a85a08', 0)], [0.85, rgba('#7a3a08', 0.3)], [1, rgba('#ffe8a0', 0.3)]]);
  g.fillRect(f.box.x, f.box.y, f.box.w, f.box.h);
  spec(g, CX - 40, 70, 20, 60, 0.7, 0.3);
  spec(g, CX - 46, 60, 6, 22, 1, 0.3);
  for (const t of f.toes) {
    const [x, y] = onToe(t, Math.PI / 2 - 0.6);
    glint(g, x - 2, y - t.ry * 0.5, t.rx * 0.22, 0.9);
  }
  story?.(g, f);
  f.sil.finish(inkOf(mix(gold, '#7a3a08', 0.4)), { openTop: f.top + 1.5 });
  return f;
}

registerStyle('crusty', {
  rig: BARE_RIG,
  contactY: 266,
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 22 },
  draw(ctx, art, p) {
    const gold = art.skin;
    const crust = art.primary ?? '#d9913a';
    goldFoot(ctx, p, gold, (g) => {
      // a dusting of flour where the crust meets the gold
      softFill(g, ell(CX - 10, 30, 50, 16), rgba('#ffffff', 0.25), 8);
    });
    // the plaited crust: a braid of baked knots hugging the foot's sides and ankle, one outline round it all
    const r = rng(hashStr('crusty'));
    const knots: [number, number, number][] = [];
    for (let i = 0; i <= 9; i++) {
      const t = i / 9;
      knots.push([CX - 50 - Math.sin(t * Math.PI * 0.6) * 46 - t * 6, -2 + t * 200, i % 2 ? 0.5 : -0.5]);
      knots.push([CX + 52 + Math.sin(t * Math.PI * 0.6) * 50 + t * 6, -2 + t * 200, i % 2 ? -0.5 : 0.5]);
    }
    for (let i = 1; i <= 4; i++) knots.push([CX - 50 + i * 20, 0 + Math.sin((i / 5) * Math.PI) * 6, 0]);
    const parts = knots.map(([x, y, rot]) => ell(x, y, 15, 11, rot));
    prop(ctx, parts, { x: CX - 120, y: -16, w: 240, h: 230 }, (g) => {
      for (const [i, [x, y, rot]] of knots.entries()) {
        piece(g, parts[i], { x: x - 15, y: y - 11, w: 30, h: 22 }, 'crust', crust, { shadow: 0.55, size: 6 });
        // the plait's twist and blistered, egg-washed shine
        crease(g, (c) => {
          c.moveTo(x - 10 * Math.cos(rot), y - 8);
          c.quadraticCurveTo(x, y + 2, x + 10 * Math.cos(rot), y + 8);
        }, 1.6, '#5a2008', 0.5, 0.3);
        spec(g, x - 5, y - 4, 6, 3, 0.6, rot);
        g.fillStyle = '#fff4d8';
        for (let k = 0; k < 2; k++) {
          g.beginPath();
          g.ellipse(x - 6 + r() * 12, y - 4 + r() * 8, 1.7, 0.9, r() * 3, 0, Math.PI * 2);
          g.fill();
        }
      }
    }, inkOf(shade(crust, -0.2)), { w: 3.6 });
  },
});

// ════════════════════════ Mimic Foot ════════════════════════
// Looks just like a Golden Foot until you look closer: a sly grin crease across the top, a fang of a toenail on the
// big toe, and eyes that open in the gold. In play its glints mimic a Golden Foot's, and the eyes blink.

export const MIMIC_EYES = { y: 74, dx: 30 };
function mimicEyes(g: Ctx, blink: number): void {
  for (const s of [-1, 1]) {
    const x = CX + s * MIMIC_EYES.dx;
    const y = MIMIC_EYES.y;
    const open = 1 - blink;
    g.fillStyle = '#3a1404';
    g.beginPath();
    g.ellipse(x, y, 11, 1.4 + 6 * open, s * -0.25, 0, Math.PI * 2);
    g.fill();
    if (open > 0.2) {
      g.fillStyle = '#ff3a1a';
      g.beginPath();
      g.ellipse(x + s * 1.5, y, 3.2, 4.4 * open, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#100404';
      g.beginPath();
      g.ellipse(x + s * 1.5, y, 1.1, 3.6 * open, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
}

registerStyle('mimic', {
  rig: BARE_RIG,
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 22 },
  parts: { eyes: { box: { x: CX - MIMIC_EYES.dx - 16, y: MIMIC_EYES.y - 12, w: MIMIC_EYES.dx * 2 + 32, h: 24 }, frames: 5, draw: (g, _a, i) => mimicEyes(g, 0.35 + (i / 4) * 0.65) } },
  draw(ctx, art, p, o) {
    goldFoot(ctx, p, art.skin, (g, f) => {
      // the grin: a deep crease with a lit lip and two little fangs
      const grin = (c: Ctx) => {
        c.moveTo(CX - 46, 112);
        c.quadraticCurveTo(CX, 146, CX + 50, 108);
      };
      crease(g, grin, 4.5, '#3a1404', 0.85, 0.5);
      for (const x of [CX - 20, CX + 22]) {
        const fang: PathFn = (c) => {
          c.beginPath();
          c.moveTo(x - 4, 124 + (x > CX ? 0 : 0));
          c.lineTo(x + 4, 124);
          c.lineTo(x, 136);
          c.closePath();
        };
        piece(g, fang, { x: x - 4, y: 124, w: 8, h: 12 }, 'plastic', '#fffbe8', { shadow: 0.35 });
      }
      if (!o.live) mimicEyes(g, 0.35);
      // the big toe's nail grown into a pointed fang
      const t = f.toes[4];
      const [x, y] = onToe(t, Math.PI / 2);
      const fangNail: PathFn = (c) => {
        c.beginPath();
        c.moveTo(x - t.rx * 0.5, y - t.ry * 0.55);
        c.lineTo(x + t.rx * 0.5, y - t.ry * 0.55);
        c.lineTo(x + 2, y + 16);
        c.closePath();
      };
      piece(g, fangNail, { x: x - t.rx * 0.5, y: y - t.ry * 0.55, w: t.rx, h: t.ry * 0.55 + 16 }, 'plastic', '#fff4d0', { shadow: 0.4 });
    });
    // the fang pokes out past the toe's outline
    const f2 = poseToes(restToes(), p)[4];
    const [x, y] = onToe(f2, Math.PI / 2);
    prop(ctx, [(c) => {
      c.beginPath();
      c.moveTo(x - 9, y - 4);
      c.lineTo(x + 9, y - 4);
      c.lineTo(x + 2, y + 16);
      c.closePath();
    }], { x: x - 10, y: y - 6, w: 20, h: 24 }, (_g, sil) => {
      sil.form({ base: '#fff4d0', shadowTint: '#7a5a20', ramp: 0.8, form: 0.4, formSize: 3, bevel: 0.5, rim: 0.6 });
    }, inkOf('#c8a040'), { w: 3 });
  },
});

export { blotches, glowDot, rivet, musicNote as note, stitches };
