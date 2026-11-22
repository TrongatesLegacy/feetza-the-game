// Base roster, shoes (style kit): Ballerina Bella, Stiletto Sasha, Steel-Toe Stomper, Cowboy Cal, Tappy Tom, Striker
// Sid, Clog Clyde, Wellie Wendy and Jingle Toes. Each is one silhouette (upper, sole, collar, trims) painted in its
// materials under the one light. How they move in play: src/content/styleLive/base.ts.

import { CX } from '../../art/feetCommon';
import { bareParts, restToes } from '../../art/style/anatomy';
import { paintBare } from '../../art/style/bare';
import { LIGHT, type PathFn, ao, crease, glint, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil } from '../../art/style/sil';
import { type PartDef, registerStyle } from '../../art/style/registry';
import { blotches, contact, rivet, stitches } from '../../art/style/details';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';
import { LX, LY, bead, clipTo, extendSil, layerOn, strap } from './base-kit';
import { type ShoeShape, bez, bow, finishShoe, lacing, paintSole, part, patent, raised, shapeBox, shoePath, soleOf, tubePath } from './base-shoe-kit';

// ════════════════════════════ BALLERINA BELLA ════════════════════════════
// En pointe: a pink satin pointe shoe with its long satin sheen, a drawstring binding round the opening, the platform's
// gathered pleats, and satin ribbons crossed over the ankle. In play the ribbon tails float and sway.

const BELLA: ShoeShape = { top: -8, topHW: 42, ballY: 140, ballHW: 54, toeY: 258, toeR: 24, box: 0.55 };
const BELLA_TAILS: [number, number][] = [
  [CX - 40, 30],
  [CX + 42, 34],
];

function ribbonTail(g: Ctx, col: string, side: number): void {
  const [x, y] = BELLA_TAILS[side < 0 ? 0 : 1];
  const pts = bez([x, y], [x + side * 20, y + 30], [x + side * 4, y + 60], [x + side * 22, y + 92], 16);
  const path = tubePath(pts, pts.map(() => 6));
  contact(g, (c) => {
    path(c);
    c.fill();
  }, 0.4, 2.5, 3);
  const lg = g.createLinearGradient(x - 10, y, x + 20, y + 90);
  lg.addColorStop(0, shade(col, 0.35));
  lg.addColorStop(0.5, col);
  lg.addColorStop(1, shade(col, -0.25));
  clipTo(g, path, () => {
    g.fillStyle = lg;
    g.fillRect(x - 40, y - 10, 80, 120);
    // satin: a sharp sheen running down the ribbon
    softStroke(g, (c) => pts.forEach(([px, py], i) => (i ? c.lineTo(px - 1.5, py) : c.moveTo(px - 1.5, py))), rgba('#ffffff', 0.6), 1.8, 0.6);
  });
  // the swallowtail cut at its end
  const [ex, ey] = pts[pts.length - 1];
  g.fillStyle = '#000';
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.beginPath();
  g.moveTo(ex - 7, ey + 7);
  g.lineTo(ex, ey - 1);
  g.lineTo(ex + 7, ey + 7);
  g.closePath();
  g.fill();
  g.restore();
  g.strokeStyle = inkOf(col);
  g.lineWidth = 2;
  path(g);
  g.stroke();
}

const bellaOpening: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 34, -8);
  c.lineTo(CX + 34, -8);
  c.bezierCurveTo(CX + 36, 40, CX + 22, 96, CX, 100);
  c.bezierCurveTo(CX - 22, 96, CX - 36, 40, CX - 34, -8);
  c.closePath();
};

registerStyle('bella', {
  contactY: 262,
  halfWidth: 60,
  leg: { kind: 'knit', hw: 36, join: 'into' },
  parts: {
    tailL: { box: { x: BELLA_TAILS[0][0] - 40, y: BELLA_TAILS[0][1] - 10, w: 70, h: 112 }, frames: 1, pivot: BELLA_TAILS[0], draw: (g, art) => ribbonTail(g, art.secondary ?? '#ff7aa2', -1) },
    tailR: { box: { x: BELLA_TAILS[1][0] - 30, y: BELLA_TAILS[1][1] - 10, w: 70, h: 112 }, frames: 1, pivot: BELLA_TAILS[1], draw: (g, art) => ribbonTail(g, art.secondary ?? '#ff7aa2', 1) },
  } satisfies Record<string, PartDef>,
  draw(ctx, art, _p, o) {
    const satin = art.primary ?? '#ffb3c7';
    const ribbon = art.secondary ?? '#ff7aa2';
    const shoe = shoePath(BELLA);
    const box = shapeBox(BELLA, 16);
    const sil = new Sil(ctx, [shoe], box);
    const g = sil.g;
    sil.form({ base: satin, shadowTint: '#6a1a4a', ramp: 0.7, form: 0.5, formSize: 22, bevel: 0.35, rim: 0.55 });
    // satin: long anisotropic sheen bands running down the shoe
    for (const [dx, a, w] of [[-24, 0.5, 6], [-12, 0.25, 3], [14, 0.18, 4], [30, 0.12, 3]] as const) {
      softStroke(g, (c) => {
        c.moveTo(CX + dx * 0.7, 0);
        c.bezierCurveTo(CX + dx * 1.4, 90, CX + dx * 1.2, 180, CX + dx * 0.4, 250);
      }, rgba('#ffffff', a), w, 2);
    }
    // the opening: the instep in pale tights, the binding round it with its drawstring
    clipTo(g, bellaOpening, () => {
      const tg = g.createLinearGradient(CX - 30, 0, CX + 30, 0);
      const tight = mix(art.skin, '#ffc8d0', 0.4);
      tg.addColorStop(0, shade(tight, 0.1));
      tg.addColorStop(0.4, shade(tight, 0.2));
      tg.addColorStop(1, shade(tight, -0.3));
      g.fillStyle = tg;
      g.fillRect(CX - 40, -10, 80, 120);
      texture(g, 'knit', box, 0.25, 1.4);
      ao(g, CX, 96, 26, 10, 0.4);
    });
    g.save();
    g.lineJoin = 'round';
    g.strokeStyle = shade(satin, -0.2);
    g.lineWidth = 5;
    bellaOpening(g);
    g.stroke();
    g.strokeStyle = rgba('#ffffff', 0.45);
    g.lineWidth = 1.4;
    bellaOpening(g);
    g.stroke();
    g.restore();
    // the drawstring's little bow at the front of the opening
    g.strokeStyle = shade(satin, -0.35);
    g.lineWidth = 1.4;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(CX + s * 5, 104, 5, 2.6, s * 0.4, 0, Math.PI * 2);
      g.stroke();
    }
    // the platform: satin gathered in pleats round the tip
    for (let i = -4; i <= 4; i++) {
      crease(g, (c) => {
        c.moveTo(CX + i * 6, 256);
        c.quadraticCurveTo(CX + i * 8, 236, CX + i * 11, 216);
      }, 1.2, shade(satin, -0.45), 0.35, 0.4);
    }
    spec(g, CX - 10, 238, 12, 5, 0.6, 0);
    // the ribbons crossed over the ankle
    for (const [a, b] of [[[CX - 40, 34], [CX + 34, -10]], [[CX + 42, 38], [CX - 34, -10]]] as const) {
      strap(g, [a as [number, number], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 4], b as [number, number]], 9, ribbon, { gloss: 0.7 });
    }
    finishShoe(sil, satin, { openTop: -7, deep: '#5a1a4a', form: 0.3 });
    if (!o.live) {
      ribbonTail(ctx, ribbon, -1);
      ribbonTail(ctx, ribbon, 1);
    }
  },
});

// ════════════════════════════ STILETTO SASHA ════════════════════════════
// Sharp heels, sharper toes: a pointed red patent pump with mirror gloss, a crystal at the throat, the instep in
// sheer dark stockings. In play the crystal and the patent glint, and her heel strikes sparks.

const SASHA_PUMP: ShoeShape = { top: 96, topHW: 90, ballY: 168, ballHW: 98, toeY: 276, toeR: 8, box: 0.62 };

const sashaVamp: PathFn = (c) => {
  // the pump's top line: low at the sides, dipping to a sweetheart notch at the front
  const s = SASHA_PUMP;
  c.beginPath();
  c.moveTo(CX - 92, 112);
  c.bezierCurveTo(CX - 60, 150, CX - 22, 170, CX, 182);
  c.bezierCurveTo(CX + 22, 170, CX + 60, 150, CX + 94, 108);
  c.bezierCurveTo(CX + s.ballHW + 4, 150, CX + s.ballHW + 2, 200, CX + s.ballHW - 10, 220);
  c.bezierCurveTo(CX + 60, 250, CX + 10, s.toeY, CX, s.toeY);
  c.bezierCurveTo(CX - 10, s.toeY, CX - 60, 250, CX - s.ballHW + 10, 220);
  c.bezierCurveTo(CX - s.ballHW - 2, 200, CX - s.ballHW - 4, 150, CX - 92, 112);
  c.closePath();
};

registerStyle('sasha', {
  contactY: 274,
  leg: { kind: 'knit', hw: 48, join: 'blend', fade: 26 },
  draw(ctx, art, p, o) {
    const red = art.primary ?? '#d0103a';
    const tights = art.legColor ?? '#3a2a2a';
    const toes = restToes({ toe: 0.92, toeLen: 0.9, ball: 0.92 });
    const body = bareParts(toes, { ankle: 48, ball: 0.92 })[0];
    const box = { x: CX - 116, y: -10, w: 232, h: 300 };
    const sil = new Sil(ctx, [body, sashaVamp], box);
    const g = sil.g;
    // the instep in sheer stockings: skin through dark nylon, a sheen down the bones
    const sheer = mix(art.skin, tights, 0.58);
    sil.form({ base: sheer, shadowTint: '#1a0a14', ramp: 0.9, form: 0.55, formSize: 30, bevel: 0.3, rim: 0.5 });
    texture(g, 'canvas', box, 0.12, 0.6, 'soft-light');
    softStroke(g, (c) => {
      c.moveTo(CX - 20, 10);
      c.bezierCurveTo(CX - 30, 60, CX - 24, 110, CX - 34, 150);
    }, rgba('#ffe8e0', 0.35), 9, 5);
    spec(g, CX - 30, 60, 22, 60, 0.18, -0.2, '#ffe8e0');
    // the pump: patent red with a mirror gloss
    raised(g, sashaVamp, box, 'enamel', red, 0.6);
    clipTo(g, sashaVamp, () => {
      // the world in it: a dark horizon band and window reflections
      const env = g.createLinearGradient(CX - 100, 120, CX + 100, 270);
      env.addColorStop(0, rgba('#ffffff', 0.15));
      env.addColorStop(0.35, rgba('#200010', 0.35));
      env.addColorStop(0.5, rgba('#200010', 0));
      env.addColorStop(1, rgba('#200010', 0.3));
      g.fillStyle = env;
      g.fillRect(box.x, 100, box.w, 190);
      patent(g, CX - 60, 168, 30, 7, 1.0, 0.85);
      patent(g, CX + 52, 186, 22, 5, -1.0, 0.6);
      patent(g, CX - 14, 236, 18, 5, 0.3, 0.75);
    });
    // the binding along the top line and the crystal at the throat
    g.save();
    g.strokeStyle = shade(red, -0.35);
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(CX - 92, 112);
    g.bezierCurveTo(CX - 60, 150, CX - 22, 170, CX, 182);
    g.bezierCurveTo(CX + 22, 170, CX + 60, 150, CX + 94, 108);
    g.stroke();
    g.restore();
    const [jx, jy] = [CX, 178];
    contact(g, (c) => {
      c.beginPath();
      c.moveTo(jx, jy - 11);
      c.lineTo(jx + 9, jy);
      c.lineTo(jx, jy + 11);
      c.lineTo(jx - 9, jy);
      c.closePath();
      c.fill();
    }, 0.5, 2, 2.5);
    const facets: [number, number, string][] = [[-9, 0, '#e8f4ff'], [0, -11, '#ffffff'], [9, 0, '#9ab8e8'], [0, 11, '#c8dcff']];
    for (let i = 0; i < 4; i++) {
      const [ax, ay, col] = facets[i];
      const [bx, by] = facets[(i + 1) % 4];
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(jx, jy);
      g.lineTo(jx + ax, jy + ay);
      g.lineTo(jx + bx, jy + by);
      g.closePath();
      g.fill();
    }
    glint(g, jx - 3, jy - 4, 7, 1);
    void p;
    finishShoe(sil, red, { openTop: -5, deep: '#2a0010', form: 0.3 });
    if (!o.live) glint(ctx, jx + 10, jy - 12, 9, 0.9);
  },
});

// ════════════════════════════ STEEL-TOE STOMPER ════════════════════════════
// A work boot: oiled brown leather, scuffed through to the steel cap at the toe, a padded collar, waxed laces through
// eyelets and speed hooks, a chunky lugged sole. In play it clanks: sparks and dust when it lands, a glint off the steel.

const BOOT: ShoeShape = { top: -8, topHW: 64, ballY: 160, ballHW: 100, toeY: 250, toeR: 66, box: 0.55 };

registerStyle('boot', {
  contactY: 266,
  halfWidth: 108,
  leg: { kind: 'denim', hw: 72, join: 'hem' },
  draw(ctx, art) {
    const leather = art.primary ?? '#8a5a2b';
    const steel = art.secondary ?? '#c7ccd4';
    const upper = shoePath(BOOT);
    const sole = shoePath(soleOf(BOOT, 8, 18));
    const box = { x: CX - 120, y: -12, w: 240, h: 290 };
    const sil = new Sil(ctx, [sole, upper], box);
    const g = sil.g;
    paintSole(g, sole, { x: CX - 110, y: 150, w: 220, h: 120 }, '#2e2a26', { tread: true });
    // lugs: chunky blocks along the front of the sole
    for (let x = CX - 92; x <= CX + 92; x += 16) {
      const y = 262 - Math.pow(Math.abs(x - CX) / 100, 2) * 30;
      g.fillStyle = rgba('#000000', 0.45);
      g.fillRect(x - 5, y, 10, 8);
      g.fillStyle = rgba('#8a8070', 0.35);
      g.fillRect(x - 5, y, 10, 1.5);
    }
    raised(g, upper, box, 'leather', leather, 0.6);
    // oiled leather: a waxy sheen and scuffs
    blotches(g, box, '#3a2210', 0.28, 26, 0.6, 0.14, 91, 'multiply');
    blotches(g, box, '#e8c8a0', 0.18, 12, 0.7, 0.08, 92, 'source-atop');
    // the steel cap showing through the scuffed toe
    const cap = (c: Ctx) => {
      c.beginPath();
      c.ellipse(CX, 238, 64, 36, 0, Math.PI * 1.05, Math.PI * 1.95);
      c.bezierCurveTo(CX + 60, 250, CX + 30, 260, CX, 258);
      c.bezierCurveTo(CX - 30, 260, CX - 60, 250, CX - 62, 228);
      c.closePath();
    };
    clipTo(g, upper, () => {
      contact(g, (c) => {
        cap(c);
        c.fill();
      }, 0.4, -1.5, 2);
      clipTo(g, cap, () => {
        const sg = g.createLinearGradient(CX - 60, 205, CX + 60, 262);
        sg.addColorStop(0, shade(steel, 0.5));
        sg.addColorStop(0.3, steel);
        sg.addColorStop(0.45, shade(steel, -0.45));
        sg.addColorStop(0.6, shade(steel, 0.1));
        sg.addColorStop(1, shade(steel, -0.4));
        g.fillStyle = sg;
        g.fillRect(CX - 70, 200, 140, 70);
        texture(g, 'brushed', box, 0.3, 1);
        // scratches in the steel
        const r = rng(hashStr('boot-steel'));
        g.strokeStyle = rgba('#ffffff', 0.45);
        g.lineWidth = 0.8;
        for (let i = 0; i < 14; i++) {
          const x = CX - 50 + r() * 100;
          const y = 214 + r() * 36;
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x + 6 + r() * 10, y + (r() - 0.5) * 4);
          g.stroke();
        }
        spec(g, CX - 26, 222, 26, 6, 0.9, -0.15);
      });
      // the torn leather edge round the cap
      g.strokeStyle = rgba(shade(leather, -0.55), 0.9);
      g.lineWidth = 2.2;
      cap(g);
      g.stroke();
      g.strokeStyle = rgba('#e8c8a0', 0.5);
      g.lineWidth = 1;
      g.save();
      g.translate(-0.8, -1.4);
      cap(g);
      g.stroke();
      g.restore();
    });
    // toe-cap and quarter stitching
    stitches(g, (c) => c.ellipse(CX, 236, 80, 52, 0, Math.PI * 1.08, Math.PI * 1.92), rgba('#f2d8a0', 0.75), 1.3, 3.5, 3);
    for (const s of [-1, 1]) {
      stitches(g, (c) => {
        c.moveTo(CX + s * 50, 0);
        c.bezierCurveTo(CX + s * 56, 60, CX + s * 92, 110, CX + s * 96, 168);
      }, rgba('#f2d8a0', 0.65), 1.2, 3.5, 3);
    }
    // the tongue and the lacing: eyelets low, speed hooks high
    const tongue = (c: Ctx) => {
      c.beginPath();
      c.moveTo(CX - 30, 160);
      c.lineTo(CX - 32, -4);
      c.bezierCurveTo(CX - 30, -14, CX + 30, -14, CX + 32, -4);
      c.lineTo(CX + 30, 160);
      c.closePath();
    };
    raised(g, tongue, box, 'leather', shade(leather, 0.06), 0.45);
    const rows = lacing(g, 6, 22, 30, 150, 34, '#d8b468', '#c8b080', 5);
    for (const [y, hw] of rows.slice(0, 2)) for (const s of [-1, 1]) rivet(g, CX + s * (hw + 4), y, 3.6, '#b8a070');
    // the padded collar
    const collar = (c: Ctx) => {
      c.beginPath();
      c.moveTo(CX - 66, -8);
      c.lineTo(CX + 66, -8);
      c.lineTo(CX + 68, 12);
      c.bezierCurveTo(CX + 30, 20, CX - 30, 20, CX - 68, 12);
      c.closePath();
    };
    raised(g, collar, box, 'leather', shade(leather, -0.25), 0.5);
    finishShoe(sil, leather, { openTop: -7 });
  },
});

// ════════════════════════════ COWBOY CAL ════════════════════════════
// Yee-haw: a pointed, tooled leather cowboy boot, gold scroll stitching on the vamp, a darker wingtip toe, a silver
// spur with a star rowel. In play the rowel spins and he kicks up trail dust as he weaves.

const COWBOY: ShoeShape = { top: -8, topHW: 58, ballY: 140, ballHW: 92, toeY: 270, toeR: 6, box: 0.7 };
export const SPUR = { x: CX + 128, y: 108 };

export function spurRowel(g: Ctx, x: number, y: number, r: number, rot: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  const star = (c: Ctx) => {
    c.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8;
      const rr = i % 2 ? r * 0.38 : r;
      if (i) c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else c.moveTo(rr, 0);
    }
    c.closePath();
  };
  const sg = g.createLinearGradient(-r, -r, r, r);
  sg.addColorStop(0, '#ffffff');
  sg.addColorStop(0.5, '#b8c0cc');
  sg.addColorStop(1, '#5a606a');
  g.fillStyle = sg;
  star(g);
  g.fill();
  g.strokeStyle = '#2a2a30';
  g.lineWidth = 1.6;
  star(g);
  g.stroke();
  g.fillStyle = '#5a606a';
  g.beginPath();
  g.arc(0, 0, r * 0.22, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function spurArm(g: Ctx): void {
  const arm = tubePath(bez([CX + 86, 96], [CX + 100, 100], [CX + 112, 104], [SPUR.x - 6, SPUR.y], 8), [5, 4.6, 4.2, 4, 3.8, 3.6, 3.4, 3.2, 3]);
  contact(g, (c) => {
    arm(c);
    c.fill();
  }, 0.45, 2, 2.5);
  const ag = g.createLinearGradient(0, 92, 0, 112);
  ag.addColorStop(0, '#f4f6fa');
  ag.addColorStop(0.5, '#a8b0bc');
  ag.addColorStop(1, '#4a505a');
  g.fillStyle = ag;
  arm(g);
  g.fill();
  g.strokeStyle = '#2a2a30';
  g.lineWidth = 1.6;
  arm(g);
  g.stroke();
}

function scroll(c: Ctx, s: number): void {
  // a tooled scroll on one side of the vamp (mirrored by s)
  c.moveTo(CX + s * 6, 20);
  c.bezierCurveTo(CX + s * 30, 40, CX + s * 8, 70, CX + s * 30, 90);
  c.bezierCurveTo(CX + s * 50, 108, CX + s * 56, 84, CX + s * 42, 78);
  c.bezierCurveTo(CX + s * 30, 74, CX + s * 30, 92, CX + s * 40, 92);
  c.moveTo(CX + s * 30, 90);
  c.bezierCurveTo(CX + s * 16, 110, CX + s * 34, 136, CX + s * 14, 160);
  c.moveTo(CX + s * 22, 50);
  c.bezierCurveTo(CX + s * 44, 44, CX + s * 56, 60, CX + s * 50, 70);
}

registerStyle('cowboy', {
  contactY: 272,
  leg: { kind: 'denim', hw: 68, join: 'hem' },
  draw(ctx, art, _p, o) {
    const leather = art.primary ?? '#a0552a';
    const gold = art.secondary ?? '#f2c14e';
    const upper = shoePath(COWBOY);
    const sole = shoePath(soleOf(COWBOY, 5, 8));
    const box = { x: CX - 110, y: -12, w: 220, h: 300 };
    const sil = new Sil(ctx, [sole, upper], box);
    const g = sil.g;
    paintSole(g, sole, { x: CX - 100, y: 120, w: 200, h: 160 }, '#5a3418', { tex: 'leather', welt: rgba('#f2c14e', 0.5) });
    raised(g, upper, box, 'leather', leather, 0.55, { texA: 0.12 });
    // a darker wingtip toe overlay
    const wing = (c: Ctx) => {
      c.beginPath();
      c.moveTo(CX - 90, 196);
      c.bezierCurveTo(CX - 60, 184, CX - 30, 214, CX, 206);
      c.bezierCurveTo(CX + 30, 214, CX + 60, 184, CX + 92, 196);
      c.bezierCurveTo(CX + 70, 236, CX + 14, 268, CX, 270);
      c.bezierCurveTo(CX - 14, 268, CX - 70, 236, CX - 90, 196);
      c.closePath();
    };
    clipTo(g, upper, () => raised(g, wing, box, 'leather', shade(leather, -0.3), 0.5, { texA: 0.12 }));
    stitches(g, (c) => {
      c.moveTo(CX - 86, 200);
      c.bezierCurveTo(CX - 60, 189, CX - 30, 219, CX, 211);
      c.bezierCurveTo(CX + 30, 219, CX + 60, 189, CX + 88, 200);
    }, rgba(gold, 0.85), 1.4, 3, 2.5);
    // tooled scrolls in gold thread
    for (const s of [-1, 1]) {
      g.save();
      g.lineCap = 'round';
      g.beginPath();
      scroll(g, s);
      g.strokeStyle = rgba(shade(leather, -0.5), 0.6);
      g.lineWidth = 3.4;
      g.stroke();
      g.restore();
      stitches(g, (c) => scroll(c, s), rgba(gold, 0.95), 1.5, 3, 1.8);
    }
    // the side seam and a polished sheen
    for (const s of [-1, 1]) {
      stitches(g, (c) => {
        c.moveTo(CX + s * 50, -6);
        c.bezierCurveTo(CX + s * 54, 50, CX + s * 86, 100, CX + s * 90, 160);
      }, rgba(gold, 0.6), 1.2, 3, 3);
    }
    spec(g, CX - 40, 120, 18, 60, 0.35, -0.25, '#ffe8c8');
    spec(g, CX - 22, 236, 14, 8, 0.6, -0.4);
    finishShoe(sil, leather, { openTop: -7 });
    // the spur: a separate piece of steel strapped on at the heel, sticking out past the boot
    spurArm(ctx);
    if (!o.live) spurRowel(ctx, SPUR.x, SPUR.y, 13, 0.2);
  },
});

// ════════════════════════════ TAPPY TOM ════════════════════════════
// Shuffle-ball-change: a black patent Oxford tap shoe, a stitched cap toe, black laces, and the bright metal tap plate
// screwed under its toe. In play every landing strikes sparks off the tap.

const TAP: ShoeShape = { top: -8, topHW: 58, ballY: 160, ballHW: 96, toeY: 258, toeR: 56, box: 0.58 };

registerStyle('tappy', {
  contactY: 272,
  leg: { kind: 'wool', hw: 70, join: 'hem' },
  draw(ctx, art) {
    const black = art.primary ?? '#141414';
    const metal = art.secondary ?? '#d9dde3';
    const upper = shoePath(TAP);
    const tap = shoePath(soleOf(TAP, 4, 14, 200));
    const box = { x: CX - 112, y: -12, w: 224, h: 290 };
    const sil = new Sil(ctx, [tap, upper], box);
    const g = sil.g;
    // the tap plate: polished metal with its screws
    clipTo(g, tap, () => {
      const tg = g.createLinearGradient(CX - 100, 0, CX + 100, 0);
      tg.addColorStop(0, shade(metal, -0.3));
      tg.addColorStop(0.25, '#ffffff');
      tg.addColorStop(0.45, shade(metal, -0.5));
      tg.addColorStop(0.7, metal);
      tg.addColorStop(1, shade(metal, -0.4));
      g.fillStyle = tg;
      g.fillRect(box.x, 190, box.w, 90);
      texture(g, 'brushed', box, 0.3, 1);
    });
    for (const x of [-56, 0, 56]) rivet(g, CX + x, 266 - Math.abs(x) * 0.25, 2.6, '#a0a6b0');
    raised(g, upper, box, 'enamel', mix(black, '#2a2a3a', 0.4), 0.6);
    // patent: the world in it
    clipTo(g, upper, () => {
      patent(g, CX - 62, 120, 40, 8, 1.25, 0.65);
      patent(g, CX - 30, 222, 30, 7, 0.25, 0.8);
      patent(g, CX + 64, 160, 26, 5, -1.25, 0.35);
    });
    // cap toe seam with broguing holes
    stitches(g, (c) => c.ellipse(CX, 236, 76, 40, 0, Math.PI * 1.08, Math.PI * 1.92), rgba('#5a5a6a', 0.9), 1.2, 3, 2.5);
    g.fillStyle = rgba('#000000', 0.6);
    for (let i = 0; i < 15; i++) {
      const a = Math.PI * 1.1 + (i / 14) * Math.PI * 0.8;
      g.beginPath();
      g.arc(CX + Math.cos(a) * 71, 236 + Math.sin(a) * 34, 1.3, 0, Math.PI * 2);
      g.fill();
    }
    // quarters, tongue and laces
    const tongue = (c: Ctx) => {
      c.beginPath();
      c.moveTo(CX - 24, 140);
      c.lineTo(CX - 26, -2);
      c.bezierCurveTo(CX - 24, -12, CX + 24, -12, CX + 26, -2);
      c.lineTo(CX + 24, 140);
      c.closePath();
    };
    raised(g, tongue, box, 'leather', mix(black, '#3a3a4a', 0.5), 0.5);
    for (const s of [-1, 1]) {
      const quarter = (c: Ctx) => {
        c.beginPath();
        c.moveTo(CX + s * 8, 12);
        c.bezierCurveTo(CX + s * 14, 60, CX + s * 18, 120, CX + s * 10, 146);
        c.lineTo(CX + s * 70, 140);
        c.lineTo(CX + s * 70, -4);
        c.closePath();
      };
      raised(g, quarter, box, 'enamel', mix(black, '#2a2a3a', 0.4), 0.45);
      clipTo(g, quarter, () => patent(g, CX + s * 34, 60, 30, 6, 1.4, s < 0 ? 0.5 : 0.25));
    }
    lacing(g, 4, 30, 18, 126, 16, '#2a2a30', '#8a8a90', 4);
    bow(g, CX, 22, '#2a2a30', 0.8);
    finishShoe(sil, black, { openTop: -7, deep: '#000000', form: 0.3 });
  },
});

// ════════════════════════════ STRIKER SID ════════════════════════════
// Studded and fast: a black football boot with a knitted sock collar, neon stripes sweeping down its side, white
// laces off-centre, and studs under the toe. In play every landing kicks up turf.

const STRIKER: ShoeShape = { top: 6, topHW: 58, ballY: 152, ballHW: 94, toeY: 256, toeR: 50, box: 0.6 };

registerStyle('striker', {
  contactY: 274,
  leg: { kind: 'knit', hw: 50, join: 'into' },
  draw(ctx, art) {
    const black = art.primary ?? '#1b1b1b';
    const neon = art.secondary ?? '#39ff88';
    const upper = shoePath(STRIKER);
    const plate = shoePath(soleOf(STRIKER, 4, 6, 180));
    const studs = [-70, -36, 0, 36, 70].map((x): PathFn => (c) => {
      const y = 262 - Math.abs(x) * 0.22;
      c.beginPath();
      c.moveTo(CX + x - 7, y - 6);
      c.lineTo(CX + x + 7, y - 6);
      c.lineTo(CX + x + 4, y + 12);
      c.quadraticCurveTo(CX + x, y + 15, CX + x - 4, y + 12);
      c.closePath();
    });
    const collar = (c: Ctx) => {
      c.beginPath();
      c.moveTo(CX - 56, -8);
      c.lineTo(CX + 56, -8);
      c.lineTo(CX + 60, 24);
      c.bezierCurveTo(CX + 30, 32, CX - 30, 32, CX - 60, 24);
      c.closePath();
    };
    const box = { x: CX - 110, y: -12, w: 220, h: 300 };
    const sil = new Sil(ctx, [...studs, plate, upper, collar], box);
    const g = sil.g;
    studs.forEach((s) => part(g, s, { x: CX - 90, y: 240, w: 180, h: 40 }, 'plastic', '#e8eaee'));
    paintSole(g, plate, { x: CX - 100, y: 170, w: 200, h: 100 }, '#d8dce4', { tex: 'rubber' });
    raised(g, upper, box, 'plastic', black, 0.6);
    texture(g, 'leather', box, 0.18, 0.8);
    // the neon stripes sweeping down the outer side, and a flash on the inner
    for (const [w, off] of [[9, 0], [5, 16]] as const) {
      strap(g, bez([CX - 60, 50 + off], [CX - 90, 110 + off], [CX - 40, 170 + off], [CX + 40, 196 + off * 0.5], 16), w, neon, { gloss: 0.5, shadow: 0.25 });
    }
    clipTo(g, upper, () => {
      softFill(g, (c) => {
        c.beginPath();
        c.ellipse(CX + 70, 150, 16, 40, -0.3, 0, Math.PI * 2);
      }, rgba(neon, 0.35), 6);
      // moulded grip ridges on the toe
      for (let i = 0; i < 6; i++) crease(g, (c) => c.ellipse(CX, 250, 70 - i * 8, 34 - i * 4, 0, Math.PI * 1.15, Math.PI * 1.85), 1.2, '#000000', 0.5, 0.18);
      spec(g, CX - 40, 140, 16, 50, 0.4, -0.3);
      spec(g, CX - 24, 220, 18, 8, 0.6, -0.3);
    });
    // the knitted sock collar
    raised(g, collar, box, 'knit', '#2a2a2e', 0.5);
    clipTo(g, collar, () => {
      for (let x = CX - 60; x < CX + 60; x += 6) {
        g.fillStyle = rgba('#ffffff', 0.06);
        g.fillRect(x, -8, 2, 40);
      }
      g.fillStyle = neon;
      g.fillRect(CX - 70, 18, 140, 2.5);
    });
    // off-centre lacing (a striking surface on the instep)
    g.save();
    g.translate(14, 0);
    lacing(g, 5, 46, 14, 134, 12, '#f4f4f4', '#d0d0d8', 4);
    g.restore();
    finishShoe(sil, black, { openTop: -7, deep: '#000000', form: 0.3 });
  },
});

// ════════════════════════════ CLOG CLYDE ════════════════════════════
// A chunky green rubber clog: rows of vent holes with the foot showing through, a yellow heel strap swung forward on
// its rivets, two charms plugged into the holes (a pizza slice and a smiley). In play it bounces; the charms jiggle.

const CLOG: ShoeShape = { top: 72, topHW: 92, ballY: 150, ballHW: 106, toeY: 262, toeR: 80, box: 0.5 };
const CLOG_HOLES: [number, number, number][] = [];
for (const [y, n, w] of [[118, 5, 70], [146, 6, 84], [176, 6, 88], [206, 5, 74], [232, 4, 54]] as const) for (let i = 0; i < n; i++) CLOG_HOLES.push([CX - w + (i * 2 * w) / (n - 1), y, 7.2]);
const CLOG_CHARMS: [number, number][] = [
  [CLOG_HOLES[1][0], CLOG_HOLES[1][1]],
  [CLOG_HOLES[9][0], CLOG_HOLES[9][1]],
];

function charm(g: Ctx, i: number): void {
  const [x, y] = CLOG_CHARMS[i];
  contact(g, (c) => {
    c.beginPath();
    c.arc(x, y, 12, 0, Math.PI * 2);
    c.fill();
  }, 0.5, 2.5, 3);
  if (i === 0) {
    // a pizza slice
    g.save();
    g.translate(x, y);
    const slice = (c: Ctx) => {
      c.beginPath();
      c.moveTo(-12, -9);
      c.quadraticCurveTo(0, -14, 12, -9);
      c.lineTo(0, 13);
      c.closePath();
    };
    g.fillStyle = '#f2c14e';
    slice(g);
    g.fill();
    g.fillStyle = '#e8902a';
    g.beginPath();
    g.moveTo(-12, -9);
    g.quadraticCurveTo(0, -14, 12, -9);
    g.lineTo(11, -6);
    g.quadraticCurveTo(0, -11, -11, -6);
    g.closePath();
    g.fill();
    g.fillStyle = '#d8343f';
    for (const [px, py] of [[-4, -3], [4, -1], [0, 5]] as const) {
      g.beginPath();
      g.arc(px, py, 2.6, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = '#5a2a10';
    g.lineWidth = 1.6;
    slice(g);
    g.stroke();
    spec(g, -4, -6, 4, 2, 0.6, -0.4);
    g.restore();
  } else {
    // a smiley
    const sg = g.createRadialGradient(x - 4, y - 4, 1, x, y, 12);
    sg.addColorStop(0, '#fff6a0');
    sg.addColorStop(0.6, '#ffd23f');
    sg.addColorStop(1, '#c89a10');
    g.fillStyle = sg;
    g.beginPath();
    g.arc(x, y, 11, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#5a4008';
    g.lineWidth = 1.6;
    g.stroke();
    g.fillStyle = '#3a2a08';
    g.beginPath();
    g.arc(x - 3.6, y - 2.5, 1.5, 0, Math.PI * 2);
    g.arc(x + 3.6, y - 2.5, 1.5, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(x, y + 1, 5.5, 0.3, Math.PI - 0.3);
    g.stroke();
    glint(g, x - 4, y - 5, 3, 0.9);
  }
}

registerStyle('clyde', {
  contactY: 266,
  halfWidth: 110,
  leg: { kind: 'denim', hw: 70, join: 'hem' },
  parts: {
    charm0: { box: { x: CLOG_CHARMS[0][0] - 18, y: CLOG_CHARMS[0][1] - 18, w: 36, h: 36 }, frames: 1, pivot: CLOG_CHARMS[0], draw: (g) => charm(g, 0) },
    charm1: { box: { x: CLOG_CHARMS[1][0] - 18, y: CLOG_CHARMS[1][1] - 18, w: 36, h: 36 }, frames: 1, pivot: CLOG_CHARMS[1], draw: (g) => charm(g, 1) },
  },
  draw(ctx, art, p, o) {
    const green = art.primary ?? '#7bd14a';
    const yellow = art.secondary ?? '#ffd23f';
    const clog = shoePath(CLOG);
    const sole = shoePath(soleOf(CLOG, 4, 10, 140));
    const f = paintBare(ctx, { skin: art.skin, pores: 0.2 }, p);
    const g = f.sil.g;
    extendSil(f.sil, [sole, clog]);
    const box = { x: CX - 120, y: 60, w: 240, h: 220 };
    layerOn(g, 'source-over', (l) => {
      paintSole(l, sole, { x: CX - 112, y: 140, w: 224, h: 136 }, shade(green, -0.25), { tex: 'rubber' });
      raised(l, clog, box, 'plastic', green, 0.6);
      texture(l, 'rubber', box, 0.3, 1);
      // the vent holes: a dark rim, the foot (or shadow) inside, a lit lower lip
      for (const [x, y, r] of CLOG_HOLES) {
        const hole = (c: Ctx) => {
          c.beginPath();
          c.ellipse(x, y, r, r * 0.9, 0, 0, Math.PI * 2);
        };
        clipTo(l, hole, () => {
          l.fillStyle = mix(art.skin, '#2a1a10', 0.55);
          l.fillRect(x - r, y - r, r * 2, r * 2);
          ao(l, x - 2, y - 3, r, r * 0.7, 0.7, 0, '#000000');
        });
        l.strokeStyle = rgba(shade(green, 0.4), 0.8);
        l.lineWidth = 1.4;
        l.beginPath();
        l.ellipse(x, y, r + 0.5, r * 0.9 + 0.5, 0, 0.2, Math.PI - 0.2);
        l.stroke();
      }
      spec(l, CX - 44, 150, 40, 20, 0.45, -0.7);
      spec(l, CX - 24, 230, 22, 8, 0.6, -0.3);
      // the heel strap, swung forward over the top of the clog, on its rivets
      for (const s of [-1, 1]) rivet(l, CX + s * 98, 120, 7, yellow);
      strap(l, bez([CX - 98, 120], [CX - 92, 90], [CX + 92, 90], [CX + 98, 120], 22), 12, yellow, { gloss: 0.5 });
      for (const s of [-1, 1]) {
        const rg = l.createRadialGradient(CX + s * 98 - 2, 118, 1, CX + s * 98, 120, 7);
        rg.addColorStop(0, shade(yellow, 0.6));
        rg.addColorStop(1, shade(yellow, -0.3));
        l.fillStyle = rg;
        l.beginPath();
        l.arc(CX + s * 98, 120, 6, 0, Math.PI * 2);
        l.fill();
      }
    });
    if (!o.live) {
      charm(g, 0);
      charm(g, 1);
    }
    f.sil.edge(rgba('#1a3008', 0.3), 18, LX * 10, LY * 10);
    f.sil.edge(rgba(LIGHT.rim, 0.5), 2.5, LX * 3, LY * 3);
    f.sil.finish(inkOf(green), { openTop: f.top + 1.5 });
  },
});

// ════════════════════════════ WELLIE WENDY ════════════════════════════
// Fresh from a puddle: a glossy yellow rubber wellie, a black ridged sole and collar, rain beaded all over it. In play
// it drips, and every stomp splashes.

const WELLIE: ShoeShape = { top: -8, topHW: 62, ballY: 160, ballHW: 100, toeY: 250, toeR: 72, box: 0.5 };

registerStyle('wendy', {
  contactY: 262,
  halfWidth: 108,
  leg: { kind: 'denim', hw: 54, join: 'into' },
  draw(ctx, art) {
    const yellow = art.primary ?? '#ffd000';
    const black = art.secondary ?? '#1b1b1b';
    const upper = shoePath(WELLIE);
    const sole = shoePath(soleOf(WELLIE, 6, 16, 150));
    const collar = (c: Ctx) => {
      c.beginPath();
      c.moveTo(CX - 64, -8);
      c.lineTo(CX + 64, -8);
      c.lineTo(CX + 66, 18);
      c.bezierCurveTo(CX + 30, 26, CX - 30, 26, CX - 66, 18);
      c.closePath();
    };
    const box = { x: CX - 116, y: -12, w: 232, h: 290 };
    const sil = new Sil(ctx, [sole, upper, collar], box);
    const g = sil.g;
    paintSole(g, sole, { x: CX - 108, y: 150, w: 216, h: 120 }, black, { tread: true });
    // the ridged rubber rand round the toe
    raised(g, upper, box, 'plastic', yellow, 0.6);
    clipTo(g, upper, () => {
      const rand = g.createLinearGradient(0, 214, 0, 252);
      rand.addColorStop(0, rgba(black, 0));
      rand.addColorStop(0.3, rgba(black, 0.85));
      rand.addColorStop(1, rgba(black, 0.95));
      g.fillStyle = rand;
      g.fillRect(box.x, 214, box.w, 50);
      g.strokeStyle = rgba('#ffffff', 0.12);
      g.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.ellipse(CX, 260, 110, 30 + i * 6, 0, Math.PI * 1.08, Math.PI * 1.92);
        g.stroke();
      }
      // glossy rubber: a long window streak and a soft broad sheen
      patent(g, CX - 54, 120, 50, 9, 1.35, 0.6);
      spec(g, CX - 30, 196, 26, 10, 0.5, -0.3);
    });
    // rain beaded on the rubber, and a muddy splash at the toe
    blotches(g, { x: CX - 110, y: 180, w: 220, h: 90 }, '#5a4020', 0.35, 14, 0.62, 0.1, 101, 'source-atop');
    const r = rng(hashStr('wendy-rain'));
    for (let i = 0; i < 26; i++) bead(g, CX - 80 + r() * 160, 30 + r() * 180, 1.6 + r() * 3, '#e8f4ff', 0.65);
    raised(g, collar, box, 'rubber', black, 0.5);
    clipTo(g, collar, () => {
      g.fillStyle = rgba('#ffffff', 0.08);
      for (let x = CX - 64; x < CX + 64; x += 8) g.fillRect(x, -8, 3, 30);
      // a little yellow pull tab
      g.fillStyle = yellow;
      g.fillRect(CX + 44, -8, 12, 14);
    });
    finishShoe(sil, mix(yellow, '#a08000', 0.3), { openTop: -7 });
  },
});

// ════════════════════════════ JINGLE TOES ════════════════════════════
// Curly-toed and festive: a green felt elf shoe with a red zig-zag cuff, its long toe curling up into a spiral with a
// gold bell on the tip. In play the bell swings and jingles out gold sparkles.

const JINGLE_BELL = { x: CX + 78, y: 196 };

/** The curled toe's centre line: down from the ball, then curling up and round to the right. */
function jingleCurl(): [number, number][] {
  return [
    ...bez([CX, 150], [CX + 6, 220], [CX + 20, 262], [CX + 60, 262], 14),
    ...bez([CX + 60, 262], [CX + 96, 262], [CX + 104, 222], [CX + 84, 206], 10).slice(1),
  ];
}

function jingleBell(g: Ctx): void {
  const { x, y } = JINGLE_BELL;
  const by = y + 12;
  contact(g, (c) => {
    c.beginPath();
    c.arc(x, by, 11, 0, Math.PI * 2);
    c.fill();
  }, 0.5, 2.5, 3);
  const bg = g.createRadialGradient(x - 4, by - 5, 1, x, by, 12);
  bg.addColorStop(0, '#fff6c0');
  bg.addColorStop(0.45, '#f2c14e');
  bg.addColorStop(1, '#8a5a10');
  g.fillStyle = bg;
  g.beginPath();
  g.arc(x, by, 11, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#5a3a08';
  g.lineWidth = 1.6;
  g.stroke();
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(x - 6, by + 3);
  g.lineTo(x + 6, by + 3);
  g.moveTo(x, by + 3);
  g.lineTo(x, by + 9);
  g.stroke();
  g.strokeStyle = '#8a5a10';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(x, by - 13, 3.5, 0, Math.PI * 2);
  g.stroke();
  glint(g, x - 4, by - 5, 4.5, 1);
}

registerStyle('jingle', {
  contactY: 280,
  leg: { kind: 'knit', hw: 46, join: 'into' },
  parts: {
    bell: { box: { x: JINGLE_BELL.x - 18, y: JINGLE_BELL.y - 10, w: 36, h: 40 }, frames: 1, pivot: [JINGLE_BELL.x, JINGLE_BELL.y - 2], draw: (g) => jingleBell(g) },
  },
  draw(ctx, art, _p, o) {
    const green = art.primary ?? '#1f9a4a';
    const red = art.secondary ?? '#d81f2a';
    const body = shoePath({ top: -8, topHW: 56, ballY: 120, ballHW: 82, toeY: 210, toeR: 40, box: 0.4 });
    const curlPts = jingleCurl();
    const curl = tubePath(curlPts, curlPts.map((_, i) => Math.max(6, 40 - i * 1.5)));
    const cuff = (c: Ctx) => {
      c.beginPath();
      c.moveTo(CX - 62, -8);
      c.lineTo(CX + 62, -8);
      c.lineTo(CX + 66, 16);
      // zig-zag points hanging down
      for (let i = 0; i <= 8; i++) {
        const x = CX + 66 - (i * 132) / 8;
        c.lineTo(x + 132 / 16, i % 2 ? 40 : 26);
        c.lineTo(x, 22);
      }
      c.lineTo(CX - 66, 16);
      c.closePath();
    };
    const box = { x: CX - 110, y: -12, w: 230, h: 300 };
    const sil = new Sil(ctx, [body, curl, cuff], box);
    const g = sil.g;
    sil.form({ base: green, shadowTint: '#0a2a1a', ramp: 0.7, form: 0.55, formSize: 26, bevel: 0.25, rim: 0.45 });
    texture(g, 'fleece', box, 0.25, 1);
    texture(g, 'canvas', box, 0.15, 0.8);
    // the curl's own volume, and a seam running down it
    softStroke(g, (c) => curlPts.forEach(([x, y], i) => (i ? c.lineTo(x - 8, y - 4) : c.moveTo(x - 8, y - 4))), rgba(LIGHT.key, 0.25), 8, 4);
    stitches(g, (c) => curlPts.forEach(([x, y], i) => (i ? c.lineTo(x + 2, y + 2) : c.moveTo(x + 2, y + 2))), rgba(shade(green, 0.45), 0.7), 1.2, 3, 3);
    softStroke(g, (c) => {
      c.moveTo(CX + 4, 160);
      c.quadraticCurveTo(CX + 16, 230, CX + 40, 252);
    }, rgba('#000000', 0.25), 10, 5);
    // a little gold star stitched on the vamp
    g.save();
    g.translate(CX - 26, 120);
    g.fillStyle = '#f2c14e';
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? 4.5 : 10;
      if (i) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
    g.restore();
    // the red cuff with white trim on the points
    raised(g, cuff, box, 'canvas', red, 0.55);
    clipTo(g, cuff, () => {
      texture(g, 'fleece', box, 0.3, 1);
      g.strokeStyle = rgba('#ffffff', 0.7);
      g.lineWidth = 2;
      g.beginPath();
      for (let i = 0; i <= 8; i++) {
        const x = CX + 66 - (i * 132) / 8;
        g.lineTo(x + 132 / 16, i % 2 ? 38 : 24);
        g.lineTo(x, 20);
      }
      g.stroke();
    });
    finishShoe(sil, green, { openTop: -7, deep: '#062014' });
    if (!o.live) jingleBell(ctx);
  },
});

