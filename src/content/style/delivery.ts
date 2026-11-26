// The Head Waiter's delivery waiter (Delivery Del), in the style kit, of a piece with Waiter Walt (roster-1.ts): the
// same black trouser leg and red satin bow tie, but on insulated kitchen boots: thick glossy black rubber pull-ons with
// a quilted aluminium heat-shield toe cap, a deep lugged sole over an amber insulating band, a yellow pull tab and a big
// cobalt enamel badge with a lightning bolt (nothing elemental gets through them). He carries the Head Waiter's new
// salver flat at his side, balanced on a folded napkin, a cloche over the dish and steam curling from under its lip: in
// play the tray is a picture of its own the fight moves (src/game/bosses/act1a.ts), so the still art alone paints it.
// His life in play is in styleLive/roster.ts.

import type { FootArt } from '../../data/feet';
import { type PathFn, type Pose, crease, glint, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil } from '../../art/style/sil';
import { registerStyle } from '../../art/style/registry';
import { stitches } from '../../art/style/details';
import { type Ctx, rgba, shade } from '../../art/util';
import { CX, SHOE_RIG, ell, finishLight, piece, solePath, upperPath, vgrad, within } from './roster-kit';
import { clocheTrayPaths, paintClocheTray, paintClocheSteam } from './salver';

const BOOT = { topY: 4, topW: 62, ballY: 170, ballW: 100, toeY: 236 };

/** Where his tray rides, at his outer side (the middle of its top face) and its size: the fight's picture of it is
 * drawn the same (DELIVERY_TRAY in the props). */
export const DEL_TRAY = { x: CX + 104, y: 90, rx: 82, ry: 29 };

/** The folded napkin his tray rides on, over the outer side of the boot. */
const napkinPad: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX + 50, 100);
  c.bezierCurveTo(CX + 78, 94, CX + 104, 96, CX + 118, 104);
  c.lineTo(CX + 112, 168);
  c.bezierCurveTo(CX + 104, 160, CX + 96, 158, CX + 88, 164);
  c.lineTo(CX + 82, 132);
  c.bezierCurveTo(CX + 70, 128, CX + 58, 120, CX + 50, 100);
  c.closePath();
};

/** The heat-shield toe cap: quilted aluminium wrapped round the front of the toe. */
const bumperPath = (flex: number): PathFn => (c) => {
  const b = BOOT.toeY - flex * 6;
  c.beginPath();
  c.moveTo(CX - 99, 184 - flex * 3);
  c.bezierCurveTo(CX - 60, 160 - flex * 4, CX + 60, 160 - flex * 4, CX + 100, 184 - flex * 3);
  c.bezierCurveTo(CX + 101, b - 12, CX + 56, b + 2, CX, b + 2);
  c.bezierCurveTo(CX - 56, b + 2, CX - 100, b - 12, CX - 99, 184 - flex * 3);
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
  const amber = art.secondary ?? '#c98a2e';
  const flex = Math.max(0, p.curl);
  const upper = upperPath(BOOT, flex);
  const sole = solePath(BOOT, flex, 40, 168, 9);
  const bumper = bumperPath(flex);
  const box = { x: CX - 118, y: -10, w: 236, h: 296 };
  const sil = new Sil(ctx, [sole, upper, bumper, napkinPad], box);
  const g = sil.g;
  // the sole: deep charcoal rubber with chunky lugs, an amber insulating band laminated over it
  g.fillStyle = '#121112';
  sole(g);
  g.fill();
  within(g, sole, () => {
    g.fillStyle = vgrad(g, 168, 284, [[0, shade(amber, 0.25)], [0.16, amber], [0.2, shade(amber, -0.35)], [0.22, '#3a3634'], [0.6, '#1e1c1c'], [1, '#060606']]);
    g.fillRect(box.x, 160, box.w, 130);
    texture(g, 'rubber', box, 0.35);
    // the lugs: deep blocks along the toe's edge, lit on their tops
    for (let x = CX - 96; x <= CX + 88; x += 16) {
      const y = 258 - flex * 5 - Math.abs(x - CX) * 0.06;
      g.fillStyle = '#050505';
      g.beginPath();
      g.roundRect(x, y, 11, 20, 2.5);
      g.fill();
      g.fillStyle = rgba('#8a8680', 0.4);
      g.fillRect(x + 1, y, 9, 1.6);
    }
    spec(g, CX - 54, 244 - flex * 5, 36, 5, 0.3, 0.02);
  });
  stitches(g, (c) => {
    c.moveTo(CX - 102, 214);
    c.bezierCurveTo(CX - 96, 236 - flex * 4, CX - 40, 242 - flex * 5, CX, 242 - flex * 5);
    c.bezierCurveTo(CX + 40, 242 - flex * 5, CX + 96, 236 - flex * 4, CX + 102, 214);
  }, rgba(shade(amber, 0.4), 0.7), 1.2, 3, 3);
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
    // ribbed flex lines up the shaft
    for (let i = 0; i < 3; i++) crease(g, (c) => {
      const y = 58 + i * 10;
      c.moveTo(CX - 52 + i * 3, y);
      c.quadraticCurveTo(CX, y - 8, CX + 52 - i * 3, y);
    }, 1.4, '#000000', 0.55, 0.22);
  });
  // the yellow pull tab at the collar
  const tab: PathFn = (c) => {
    c.beginPath();
    c.roundRect(CX - 66, 4, 16, 30, 4);
  };
  piece(g, tab, { x: CX - 66, y: 4, w: 16, h: 30 }, 'rubber', '#f2c23a', { shadow: 0.5 });
  // the heat-shield toe cap: quilted aluminium, lit on its upper left, riveted along its top edge
  within(g, bumper, () => {
    g.fillStyle = vgrad(g, 160 - flex * 4, 240, [[0, '#f4f6f8'], [0.35, '#c4cad2'], [0.7, '#8a929e'], [1, '#4a525e']]);
    g.fillRect(box.x, 150, box.w, 100);
    g.fillStyle = rgba('#ff9a4a', 0.18);
    g.fillRect(box.x, 200, 60, 50);
    texture(g, 'brushed', box, 0.35);
    // the quilting: a diamond grid of stitched seams, each pad catching the light on its upper left
    g.lineWidth = 1.4;
    for (let k = -8; k <= 8; k++) {
      for (const d of [1, -1]) {
        g.strokeStyle = rgba('#3a4250', 0.45);
        g.beginPath();
        g.moveTo(CX + k * 22, 150);
        g.lineTo(CX + k * 22 + d * 100, 250);
        g.stroke();
        g.strokeStyle = rgba('#ffffff', 0.45);
        g.beginPath();
        g.moveTo(CX + k * 22 + 1.4, 151);
        g.lineTo(CX + k * 22 + d * 100 + 1.4, 251);
        g.stroke();
      }
    }
    spec(g, CX - 44, 190 - flex * 4, 30, 8, 0.75, -0.15);
  });
  // its rivets, on one spacing along the cap's edge
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const x = CX - 88 + t * 176;
    const y = 186 - flex * 3 - Math.sin(t * Math.PI) * 18;
    g.fillStyle = rgba('#000000', 0.4);
    g.beginPath();
    g.arc(x + 0.8, y + 1, 3, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#e8ecf0';
    g.beginPath();
    g.arc(x, y, 2.6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(x - 0.8, y - 0.8, 1, 0, Math.PI * 2);
    g.fill();
  }
  // the badge on the vamp, big enough to read: a bolt in cobalt enamel
  badge(g, CX - 20, 128 - flex * 2, 25);
  // the folded napkin his tray rides on
  piece(g, napkinPad, { x: CX + 50, y: 94, w: 70, h: 76 }, 'linen', '#f7f5ef', { shadow: 0.6 });
  within(g, napkinPad, () => {
    softStroke(g, (c) => {
      c.moveTo(CX + 92, 104);
      c.quadraticCurveTo(CX + 100, 130, CX + 98, 160);
    }, rgba('#6a6a9a', 0.3), 5, 3);
    g.strokeStyle = rgba(red, 0.85);
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(CX + 116, 112);
    g.lineTo(CX + 110, 160);
    g.stroke();
  });
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
  // its shadow on the napkin and boot under it (away from the light)
  softFill(ctx, (c) => {
    c.beginPath();
    c.ellipse(x + rx * 0.06, y + ry * 0.75, rx * 0.92, ry * 0.7, 0, 0, Math.PI * 2);
  }, rgba('#0a0c14', 0.45), 5);
  const paths = clocheTrayPaths(x, y, rx, ry);
  const sil = new Sil(ctx, paths, { x: x - rx - 4, y: y - rx * 0.9, w: rx * 2 + 8, h: rx * 0.9 + ry + 12 });
  paintClocheTray(sil.g, x, y, rx, ry);
  sil.finish(inkOf('#5a6270'), { inner: 0.4 });
  paintClocheSteam(ctx, x, y, rx, ry);
}

registerStyle('deliverywaiter', {
  contactY: 278,
  rig: SHOE_RIG,
  leg: { kind: 'wool', hw: 70, join: 'hem' },
  draw(ctx, art, p, o) {
    drawDelivery(ctx, art, p, o);
  },
});
