// The Head Waiter's delivery waiter (Delivery Del), in the style kit, of a piece with Waiter Walt (roster-1.ts): the
// same black trouser leg and red satin bow tie, but on insulated kitchen boots, glossy black rubber pull-ons with a
// white rubber toe bumper, a thick honey gum sole over a cream insulating band and a cobalt enamel badge with a
// lightning bolt on the vamp (nothing elemental gets through them). He carries the Head Waiter's new tray at his side,
// a cloche over the dish and steam curling from under its lip: in play the tray is a picture of its own the fight
// moves (src/game/bosses/act1a.ts), so the still art alone paints it. His life in play is in styleLive/roster.ts.

import type { FootArt } from '../../data/feet';
import { type PathFn, type Pose, crease, glint, inkOf, softStroke, spec, texture } from '../../art/style/kit';
import { Sil } from '../../art/style/sil';
import { registerStyle } from '../../art/style/registry';
import { stitches } from '../../art/style/details';
import { type Ctx, rgba, shade } from '../../art/util';
import { CX, SHOE_RIG, ell, finishLight, piece, solePath, upperPath, vgrad, within } from './roster-kit';
import { clocheTrayPaths, paintClocheTray, paintClocheSteam } from './salver';

const BOOT = { topY: 4, topW: 62, ballY: 170, ballW: 100, toeY: 236 };

/** Where his tray rides, at his outer side (the middle of its top face) and its size: the fight's picture of it is
 * drawn the same (DELIVERY_TRAY in the props). */
export const DEL_TRAY = { x: CX + 98, y: 104, rx: 72, ry: 27 };

/** The toe bumper: white rubber wrapped round the front of the toe. */
const bumperPath = (flex: number): PathFn => (c) => {
  const b = BOOT.toeY - flex * 6;
  c.beginPath();
  c.moveTo(CX - 98, 196 - flex * 3);
  c.bezierCurveTo(CX - 60, 182 - flex * 4, CX + 60, 182 - flex * 4, CX + 99, 196 - flex * 3);
  c.bezierCurveTo(CX + 100, b - 12, CX + 56, b + 2, CX, b + 2);
  c.bezierCurveTo(CX - 56, b + 2, CX - 99, b - 12, CX - 98, 196 - flex * 3);
  c.closePath();
};

/** The cobalt enamel badge with its lightning bolt (on the vamp). */
function badge(g: Ctx, x: number, y: number, r: number): void {
  const p = ell(x, y, r, r);
  piece(g, p, { x: x - r, y: y - r, w: r * 2, h: r * 2 }, 'enamel', '#2a5bd8', { shadow: 0.55 });
  // its polished chrome bezel
  g.strokeStyle = '#e8eef6';
  g.lineWidth = 2.6;
  g.beginPath();
  g.arc(x, y, r - 1, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = rgba('#3a4250', 0.7);
  g.lineWidth = 1;
  g.beginPath();
  g.arc(x, y, r - 1, 0.2, Math.PI * 0.9);
  g.stroke();
  // the bolt
  g.save();
  g.translate(x, y);
  g.beginPath();
  g.moveTo(r * 0.12, -r * 0.72);
  g.lineTo(-r * 0.42, r * 0.08);
  g.lineTo(-r * 0.02, r * 0.08);
  g.lineTo(-r * 0.16, r * 0.72);
  g.lineTo(r * 0.44, -r * 0.12);
  g.lineTo(r * 0.04, -r * 0.12);
  g.closePath();
  g.fillStyle = '#ffd23f';
  g.fill();
  g.lineWidth = 1.2;
  g.strokeStyle = '#7a4a08';
  g.stroke();
  g.restore();
  glint(g, x - r * 0.4, y - r * 0.45, 2.6, 0.9);
}

function drawDelivery(ctx: Ctx, art: FootArt, p: Pose, o: { live: boolean; noShield?: boolean }): void {
  const black = art.primary ?? '#14141a';
  const red = '#c8232c';
  const gum = art.secondary ?? '#c98a2e';
  const flex = Math.max(0, p.curl);
  const upper = upperPath(BOOT, flex);
  const sole = solePath(BOOT, flex, 30, 176, 6);
  const bumper = bumperPath(flex);
  const box = { x: CX - 116, y: -10, w: 232, h: 284 };
  const sil = new Sil(ctx, [sole, upper, bumper], box);
  const g = sil.g;
  // the gum sole: thick honey rubber, deep tread blocks along its edge, and a cream insulating band over it
  g.fillStyle = shade(gum, -0.2);
  sole(g);
  g.fill();
  within(g, sole, () => {
    g.fillStyle = vgrad(g, 176, 272, [[0, '#f3e6c4'], [0.2, '#efe0bc'], [0.24, shade(gum, 0.15)], [0.6, gum], [1, shade(gum, -0.45)]]);
    g.fillRect(box.x, 170, box.w, 110);
    texture(g, 'rubber', box, 0.3);
    // the tread: chunky blocks showing at the toe
    for (let x = CX - 92; x <= CX + 84; x += 15) {
      const y = 256 - flex * 5 - Math.abs(x - CX) * 0.06;
      g.fillStyle = rgba('#3a1e04', 0.55);
      g.beginPath();
      g.roundRect(x, y, 9, 14, 2);
      g.fill();
      g.fillStyle = rgba('#ffe2a8', 0.35);
      g.fillRect(x + 1, y, 7, 1.4);
    }
    spec(g, CX - 54, 248 - flex * 5, 36, 5, 0.35, 0.02);
  });
  stitches(g, (c) => {
    c.moveTo(CX - 102, 214);
    c.bezierCurveTo(CX - 96, 236 - flex * 4, CX - 40, 242 - flex * 5, CX, 242 - flex * 5);
    c.bezierCurveTo(CX + 40, 242 - flex * 5, CX + 96, 236 - flex * 4, CX + 102, 214);
  }, rgba('#8a6a3a', 0.6), 1.2, 3, 3);
  // the boot: glossy black rubber, the kitchen's lights mirrored down it
  piece(g, upper, box, 'patent', black, { shadow: 0.5 });
  within(g, upper, () => {
    texture(g, 'rubber', box, 0.12);
    softStroke(g, (c) => {
      c.moveTo(CX - 80, 30);
      c.bezierCurveTo(CX - 88, 90, CX - 84, 150, CX - 60, 196);
    }, rgba('#d8e6ff', 0.45), 7, 2.5);
    softStroke(g, (c) => {
      c.moveTo(CX + 70, 40);
      c.bezierCurveTo(CX + 80, 100, CX + 84, 150, CX + 74, 186);
    }, rgba('#9ab8ff', 0.25), 5, 3);
    spec(g, CX - 40, 120, 22, 8, 0.6, -0.4);
    // the pull-on collar: a turned rubber band with a white piping, and a chrome pull ring at the side
    g.fillStyle = vgrad(g, 0, 34, [[0, '#3a3a44'], [1, '#0a0a10']]);
    g.fillRect(box.x, -10, box.w, 44);
    g.fillStyle = rgba('#f4f2ec', 0.9);
    g.fillRect(box.x, 32, box.w, 3);
    crease(g, (c) => {
      c.moveTo(CX - 66, 36);
      c.lineTo(CX + 66, 36);
    }, 1.6, '#000000', 0.6, 0.3);
    // ribbed flex lines over the instep
    for (let i = 0; i < 4; i++) crease(g, (c) => {
      const y = 112 + i * 12;
      c.moveTo(CX - 52 + i * 3, y);
      c.quadraticCurveTo(CX, y - 8, CX + 52 - i * 3, y);
    }, 1.4, '#000000', 0.55, 0.22);
  });
  // the chrome pull ring
  g.strokeStyle = '#2a2e36';
  g.lineWidth = 5;
  g.beginPath();
  g.ellipse(CX - 58, 22, 9, 11, -0.2, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = '#e8eef6';
  g.lineWidth = 2.6;
  g.stroke();
  // the white rubber toe bumper
  piece(g, bumper, { x: CX - 100, y: 180, w: 200, h: 62 }, 'rubber', '#f4f2ec', { shadow: 0.55 });
  within(g, bumper, () => {
    for (let i = 0; i < 9; i++) {
      const x = CX - 72 + i * 18;
      g.fillStyle = rgba('#9a9aae', 0.35);
      g.fillRect(x, 200 - flex * 3, 2, 30);
    }
    spec(g, CX - 40, 204 - flex * 4, 26, 6, 0.6, -0.15);
  });
  // the badge on the vamp
  badge(g, CX, 158 - flex * 2, 19);
  // the bow tie on the collar: red satin, as Walt's
  const bow: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX, 46);
    c.bezierCurveTo(CX - 10, 34, CX - 24, 32, CX - 26, 38);
    c.bezierCurveTo(CX - 28, 46, CX - 26, 56, CX - 22, 58);
    c.bezierCurveTo(CX - 14, 60, CX - 6, 52, CX, 48);
    c.bezierCurveTo(CX + 6, 52, CX + 14, 60, CX + 22, 58);
    c.bezierCurveTo(CX + 26, 56, CX + 28, 46, CX + 26, 38);
    c.bezierCurveTo(CX + 24, 32, CX + 10, 34, CX, 46);
    c.closePath();
  };
  piece(g, bow, { x: CX - 28, y: 30, w: 56, h: 32 }, 'enamel', red, { shadow: 0.5 });
  piece(g, ell(CX, 47, 6, 7), { x: CX - 6, y: 40, w: 12, h: 14 }, 'enamel', shade(red, -0.1), { shadow: 0.5 });
  glint(g, CX - 13, 40, 3.5, 0.8);
  finishLight(sil, black, '#101020', 0.3);
  sil.finish(inkOf(shade(black, 0.1)), { openTop: -5 });
  // the tray he's bringing (in play it's the fight's own picture)
  if (!o.live && !o.noShield) drawDeliveryTray(ctx);
}

/** His tray with the cloche on it, as its own silhouette, and the steam over it. */
export function drawDeliveryTray(ctx: Ctx, at = DEL_TRAY): void {
  const { x, y, rx, ry } = at;
  const paths = clocheTrayPaths(x, y, rx, ry);
  const sil = new Sil(ctx, paths, { x: x - rx - 4, y: y - rx * 0.9, w: rx * 2 + 8, h: rx * 0.9 + ry + 12 });
  paintClocheTray(sil.g, x, y, rx, ry);
  sil.finish(inkOf('#5a6270'), { inner: 0.4 });
  paintClocheSteam(ctx, x, y, rx, ry);
}

registerStyle('deliverywaiter', {
  contactY: 270,
  rig: SHOE_RIG,
  leg: { kind: 'wool', hw: 70, join: 'hem' },
  draw(ctx, art, p, o) {
    drawDelivery(ctx, art, p, o);
  },
});
