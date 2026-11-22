// Style-kit pilot: footwear.
// - Sneaker Steve: canvas upper, vulcanised rubber sole and toe cap, cotton laces through metal eyelets, a padded
//   tongue and a knit sock cuff, under the one light. In play his lace ends swing and his toe box flexes.

import type { FootArt } from '../../data/feet';
import { CX } from '../../art/feetCommon';
import { LIGHT, type Pose, ao, crease, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil, lobe } from '../../art/style/sil';
import { registerStyle } from '../../art/style/registry';
import { contact, eyelet, laceRun, stitches } from '../../art/style/details';
import { tones } from '../../art/style/materials';
import { type Ctx, mix, rgba, shade } from '../../art/util';

// ——— Sneaker Steve ———

/** The sneaker's upper: ankle opening at the top, toe rounding at the bottom. `flex` (the rig's curl) lifts the toe. */
function sneakerUpper(flex: number): (c: Ctx) => void {
  const b = 244 - flex * 6;
  return (c) => {
    c.beginPath();
    c.moveTo(CX - 60, 8);
    c.bezierCurveTo(CX - 66, 60, CX - 98, 100, CX - 99, 168);
    c.bezierCurveTo(CX - 100, b - 14, CX - 56, b, CX, b);
    c.bezierCurveTo(CX + 56, b, CX + 101, b - 14, CX + 100, 168);
    c.bezierCurveTo(CX + 99, 100, CX + 66, 60, CX + 60, 8);
    c.closePath();
  };
}

function sneakerSole(flex: number): (c: Ctx) => void {
  const b = 264 - flex * 5;
  return (c) => {
    c.beginPath();
    c.moveTo(CX - 102, 160);
    c.bezierCurveTo(CX - 108, 210, CX - 104, b - 6, CX - 60, b);
    c.lineTo(CX + 60, b);
    c.bezierCurveTo(CX + 104, b - 6, CX + 108, 210, CX + 102, 160);
    c.closePath();
  };
}

const tonguePath = (c: Ctx) => {
  c.beginPath();
  c.moveTo(CX - 30, 120);
  c.lineTo(CX - 31, 4);
  c.bezierCurveTo(CX - 31, -9, CX + 31, -9, CX + 31, 4);
  c.lineTo(CX + 30, 120);
  c.closePath();
};

const cuffPath = (c: Ctx) => {
  c.beginPath();
  c.moveTo(CX - 62, -7);
  c.lineTo(CX + 62, -7);
  c.lineTo(CX + 63, 14);
  c.bezierCurveTo(CX + 30, 20, CX - 30, 20, CX - 63, 14);
  c.closePath();
};

/** Lace eyelets (left, right) top to bottom. */
const EYELETS: [number, number][] = [32, 56, 80, 104, 128].map((y, i) => [y, 25 + i * 1.5]);

function drawSneaker(ctx: Ctx, art: FootArt, p: Pose, live: boolean): void {
  const red = art.primary ?? '#ff5a36';
  const white = art.secondary ?? '#ffffff';
  const flex = Math.max(0, p.curl);
  const squash = Math.max(0, -p.curl);
  const upper = sneakerUpper(flex);
  const sole = sneakerSole(flex);
  const box = { x: CX - 108, y: -22, w: 216, h: 290 };
  const sil = new Sil(ctx, [cuffPath, sole, upper, tonguePath], box);
  const g = sil.g;
  const rubber = mix(white, '#f3efe6', 0.6);
  const t = tones('canvas', red);
  // the sock cuff: white knit
  g.fillStyle = '#f4f1ea';
  cuffPath(g);
  g.fill();
  g.save();
  cuffPath(g);
  g.clip();
  texture(g, 'knit', box, 0.55, 1.6);
  const cg = g.createLinearGradient(0, -8, 0, 18);
  cg.addColorStop(0, rgba('#8a7aa0', 0.35));
  cg.addColorStop(1, rgba('#8a7aa0', 0));
  g.fillStyle = cg;
  g.fillRect(box.x, -8, box.w, 26);
  g.restore();
  // the sole: white rubber wrapping the toe
  g.save();
  sole(g);
  g.clip();
  const sg = g.createLinearGradient(0, 160, 0, 266);
  sg.addColorStop(0, shade(rubber, 0.1));
  sg.addColorStop(0.7, rubber);
  sg.addColorStop(1, mix(shade(rubber, -0.3), '#6a6a8a', 0.3));
  g.fillStyle = sg;
  g.fillRect(box.x, 150, box.w, 120);
  texture(g, 'rubber', box, 0.3);
  // foxing stripes round the sole (the pinstripe and the thick one)
  for (const [y, w, col] of [[250, 4.5, red], [256, 1.6, mix(red, '#202040', 0.5)]] as const) {
    g.beginPath();
    g.moveTo(CX - 108, y - 40 - flex * 4);
    g.bezierCurveTo(CX - 100, y - flex * 5, CX - 60, y + 2 - flex * 5, CX, y + 2 - flex * 5);
    g.bezierCurveTo(CX + 60, y + 2 - flex * 5, CX + 100, y - flex * 5, CX + 108, y - 40 - flex * 4);
    g.strokeStyle = col;
    g.lineWidth = w;
    g.stroke();
  }
  // the tread edge at the very bottom
  g.fillStyle = rgba('#5a5a6a', 0.45);
  g.fillRect(box.x, 260 - flex * 5, box.w, 8);
  for (let x = CX - 70; x <= CX + 70; x += 8) {
    g.fillStyle = rgba('#2a2a3a', 0.35);
    g.fillRect(x, 260 - flex * 5, 3, 6);
  }
  spec(g, CX - 54, 232, 40, 8, 0.5, 0.05);
  g.restore();
  // the canvas upper, with its own form
  g.save();
  upper(g);
  g.clip();
  const ug = g.createLinearGradient(CX - 100, 40, CX + 100, 200);
  ug.addColorStop(0, t.hi);
  ug.addColorStop(0.45, t.mid);
  ug.addColorStop(1, t.lo);
  g.fillStyle = ug;
  g.fillRect(box.x, -10, box.w, 270);
  texture(g, 'canvas', box, 0.42, 1.25);
  // white side panels (the old Steve's stripes, now stitched-on suede)
  for (const s of [-1, 1]) {
    const panel = (c: Ctx) => {
      c.beginPath();
      c.moveTo(CX + s * 101, 118);
      c.quadraticCurveTo(CX + s * 74, 160, CX + s * 101, 206);
      c.lineTo(CX + s * 110, 206);
      c.lineTo(CX + s * 110, 118);
      c.closePath();
    };
    contact(g, (c) => {
      panel(c);
      c.fill();
    }, 0.3);
    g.fillStyle = shade(white, -0.04);
    panel(g);
    g.fill();
    stitches(g, (c) => {
      c.moveTo(CX + s * 98, 122);
      c.quadraticCurveTo(CX + s * 78, 160, CX + s * 98, 202);
    }, rgba(shade(white, -0.3), 0.8), 1.2, 3, 3);
  }
  // the toe cap: white rubber, ribbed at the front
  const cap = (c: Ctx) => {
    c.beginPath();
    c.ellipse(CX, 244 - flex * 6, 90, 52 - flex * 4, 0, Math.PI, 0);
    c.lineTo(CX + 90, 260);
    c.lineTo(CX - 90, 260);
    c.closePath();
  };
  contact(g, (c) => {
    cap(c);
    c.fill();
  }, 0.35, 2.5, 3);
  g.save();
  cap(g);
  g.clip();
  const capg = g.createRadialGradient(CX - 30, 200, 4, CX, 230, 100);
  capg.addColorStop(0, shade(rubber, 0.12));
  capg.addColorStop(0.6, rubber);
  capg.addColorStop(1, mix(shade(rubber, -0.35), '#6a6a8a', 0.3));
  g.fillStyle = capg;
  g.fillRect(box.x, 180, box.w, 90);
  texture(g, 'rubber', box, 0.3);
  // toe-cap ribs (they bunch as it flexes)
  g.strokeStyle = rgba('#8a8aa0', 0.22);
  g.lineWidth = 1.1;
  for (let i = 0; i < 3; i++) {
    const y = 222 + i * (7 - flex * 1.5) - flex * 4;
    g.beginPath();
    g.ellipse(CX, y + 30, 70 - i * 6, 26, 0, Math.PI + 0.35, -0.35);
    g.stroke();
  }
  spec(g, CX - 34, 214 - flex * 4, 34, 12, 0.7, -0.2);
  g.restore();
  stitches(g, (c) => c.ellipse(CX, 244 - flex * 6, 84, 46 - flex * 4, 0, Math.PI + 0.12, -0.12), rgba(shade(red, -0.25), 0.9), 1.3, 3.5, 3);
  // toe-box flex creases (deeper as it bends)
  for (const [y, w] of [[176, 46], [190, 56]] as const) {
    crease(g, (c) => {
      c.moveTo(CX - w, y - flex * 6 + 4);
      c.quadraticCurveTo(CX, y - flex * 9 - 6, CX + w, y - flex * 6 + 4);
    }, 2.2 + flex * 1.5, t.lo, 0.15 + flex * 0.4, 0.15 + flex * 0.2);
  }
  // the eyestay: a darker panel round the lacing, stitched
  const stay = (c: Ctx) => {
    c.beginPath();
    c.moveTo(CX - 46, 6);
    c.bezierCurveTo(CX - 48, 60, CX - 44, 120, CX - 30, 146);
    c.quadraticCurveTo(CX, 156, CX + 30, 146);
    c.bezierCurveTo(CX + 44, 120, CX + 48, 60, CX + 46, 6);
    c.closePath();
  };
  g.fillStyle = rgba(shade(red, -0.12), 0.6);
  stay(g);
  g.fill();
  stitches(g, (c) => {
    c.moveTo(CX - 42, 8);
    c.bezierCurveTo(CX - 44, 60, CX - 40, 118, CX - 27, 142);
    c.quadraticCurveTo(CX, 151, CX + 27, 142);
    c.bezierCurveTo(CX + 40, 118, CX + 44, 60, CX + 42, 8);
  }, rgba(shade(red, 0.4), 0.85), 1.3, 3.5, 3);
  // the lit dome of the toe box and a flex sheen
  spec(g, CX - 40, 120, 46, 28, 0.18, -0.6, LIGHT.key);
  g.restore();
  lobe(g, upper, { x: box.x, y: -20, w: box.w, h: 300 }, -30, 0, t.lo, 0.6, 16, 0.25);
  // the tongue: padded canvas, puffed at the top, with a woven label
  g.save();
  tonguePath(g);
  g.clip();
  const tg = g.createLinearGradient(CX - 30, 0, CX + 30, 0);
  tg.addColorStop(0, shade(red, 0.05));
  tg.addColorStop(0.4, shade(red, 0.18));
  tg.addColorStop(1, shade(red, -0.28));
  g.fillStyle = tg;
  g.fillRect(CX - 34, -26, 68, 150);
  texture(g, 'canvas', box, 0.35, 1.25);
  g.restore();
  lobe(g, tonguePath, { x: CX - 34, y: -26, w: 68, h: 150 }, -40, -30, t.lo, 0.5, 8, 0.35);
  // woven label on the tongue: a tiny pizza slice
  g.fillStyle = '#fbf8f0';
  g.beginPath();
  g.roundRect(CX - 12, -3, 24, 13, 2.5);
  g.fill();
  g.fillStyle = '#f2b84a';
  g.beginPath();
  g.moveTo(CX - 6, -1);
  g.lineTo(CX + 6, -1);
  g.lineTo(CX, 8);
  g.closePath();
  g.fill();
  g.fillStyle = '#d8343f';
  g.beginPath();
  g.arc(CX - 1.5, 1.5, 1.4, 0, Math.PI * 2);
  g.arc(CX + 2, 3, 1.2, 0, Math.PI * 2);
  g.fill();
  // eyelets and the laces criss-crossing over the tongue
  for (const [y, hw] of EYELETS) for (const s of [-1, 1]) eyelet(g, CX + s * hw, y, 4.2);
  const lace = '#fbfaf6';
  for (let i = EYELETS.length - 1; i > 0; i--) {
    const [y0, w0] = EYELETS[i];
    const [y1, w1] = EYELETS[i - 1];
    laceRun(g, CX - w0, y0, CX + w1, y1, lace, 5.2);
    laceRun(g, CX + w0, y0, CX - w1, y1, lace, 5.2);
  }
  // the bow at the top (its loose ends swing in play: see the laces parts)
  if (!live) sneakerLaceEnds(g, 0);
  for (const s of [-1, 1]) {
    const loop = (c: Ctx) => {
      c.beginPath();
      c.ellipse(CX + s * 15, 20, 14, 7, s * -0.35, 0, Math.PI * 2);
    };
    contact(g, (c) => {
      loop(c);
      c.lineWidth = 5;
      c.stroke();
    }, 0.4);
    g.strokeStyle = mix(shade(lace, -0.4), '#3a3040', 0.3);
    g.lineWidth = 6.2;
    loop(g);
    g.stroke();
    g.strokeStyle = lace;
    g.lineWidth = 4.6;
    g.stroke();
  }
  g.fillStyle = lace;
  g.beginPath();
  g.ellipse(CX, 22, 5, 4.5, 0, 0, Math.PI * 2);
  g.fill();
  ao(g, CX + 2, 25, 5, 3, 0.35);
  // the base light over the whole shoe and the ink
  sil.edge(rgba(mix(shade(red, -0.7), '#2a1030', 0.4), 0.4), 18, LIGHT.dir[0] * 10, LIGHT.dir[1] * 10);
  sil.edge(rgba(LIGHT.rim, 0.5), 2.5, LIGHT.dir[0] * 3, LIGHT.dir[1] * 3);
  void squash;
  sil.finish(inkOf(red), { openTop: -7 });
}

/** The bow's two loose ends with plastic aglets, hanging from the knot; `swing` (radians) for the live part. */
export function sneakerLaceEnds(g: Ctx, swing: number): void {
  const lace = '#fbfaf6';
  for (const s of [-1, 1]) {
    g.save();
    g.translate(CX + s * 3, 24);
    g.rotate(swing * (s < 0 ? 1 : 0.8) + s * 0.12);
    const end = (c: Ctx) => {
      c.beginPath();
      c.moveTo(0, 0);
      c.bezierCurveTo(s * 4, 14, s * 1, 26, s * 5, 38);
    };
    g.lineCap = 'round';
    g.strokeStyle = mix(shade(lace, -0.4), '#3a3040', 0.3);
    g.lineWidth = 5.8;
    end(g);
    g.stroke();
    g.strokeStyle = lace;
    g.lineWidth = 4.4;
    end(g);
    g.stroke();
    // aglet
    g.strokeStyle = '#30323a';
    g.lineWidth = 4.6;
    g.beginPath();
    g.moveTo(s * 4.4, 36);
    g.lineTo(s * 5.6, 45);
    g.stroke();
    g.strokeStyle = rgba('#ffffff', 0.5);
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(s * 4, 37);
    g.lineTo(s * 4.8, 43);
    g.stroke();
    g.restore();
  }
}

registerStyle('sneaker', {
  contactY: 262,
  rig: { from: 150, to: 172 },
  parts: {
    laces: { box: { x: CX - 24, y: 18, w: 48, h: 60 }, frames: 1, pivot: [CX, 24], draw: (g) => sneakerLaceEnds(g, 0) },
  },
  draw(ctx, art, p, o) {
    drawSneaker(ctx, art, p, o.live);
  },
});

export { softFill, softStroke };
