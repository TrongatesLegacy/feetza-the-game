// JÖRMUNGANDR, the world serpent (Act 8's Bifröst mini-boss), in the style kit: his portrait, boss card and peel.
// Front-on like every foot and boss in the game: his head coming at us, his neck rising behind it into the leg.
// It's the fight's own head (src/content/art/jormungandr.ts) scaled into the foot frame: a skull of weathered stone
// plates (lichen, barnacles, salt in the crevices, the star of cracks Thor's hammer left), its jaw a little open on
// wet dark-pink gums and uneven teeth, two lower tusks closing outside the lip, ember eyes sunk under ledges of rock,
// kelp caught on him. The neck is the 'serpentneck' leg kind: stone-plated hide with the pale ribbed throat down
// its front.
//
// In play (src/content/styleLive/jormungandr.ts) the stone lids blink, the embers breathe (the glow layer), the kelp
// sways on springs, steam curls from the nostrils and water drips off the kelp and the jaw. (In his fight the foot is
// hidden: the arena draws his body, src/game/bosses/jormRig.ts.)

import { CX } from '../../art/feetCommon';
import { registerLegKind, wrapTile } from '../../art/style/legs';
import { type PartDef, registerStyle } from '../../art/style/registry';
import { makeCanvas, type Ctx } from '../../art/util';
import { EYE, JAW, KELP, KELP_F, NECK, NOSE, SK, paintEyeGlows, paintEyesAt, paintHeadStill, paintKelpAt, paintNeck, paintSkull, skullPath } from '../art/jormungandr';

/** Design units per skull unit, and where the skull's origin lands (its chin on the contact line). */
const K = 0.46;
const CONTACT = 306;
const OX = CX - SK.cx * K;
const OY = CONTACT - 504 * K;
/** Skull units → design units. */
export const jormAt = (x: number, y: number): [number, number] => [OX + x * K, OY + y * K];
const into = (g: Ctx) => {
  g.translate(OX, OY);
  g.scale(K, K);
};

/** Where the live layer emits: the nostrils, the kelp tips, the chin (design units). */
export const JORM_NOSTRILS: [number, number][] = [-1, 1].map((s) => jormAt(SK.cx + s * (SK.cx - NOSE.x), NOSE.y));
export const JORM_DRIPS: [number, number][] = [
  ...KELP.map((k) => {
    const F = KELP_F[k.kind];
    return jormAt(k.x + (k.flip ? -1 : 1) * (F.ax - F.w / 2) * 0.2, k.y + F.h - F.ay - 16);
  }),
  jormAt(SK.cx - 60, 500),
  jormAt(SK.cx + 40, 504),
];

const stills: Record<string, HTMLCanvasElement> = {};
/** The head as a picture at skull scale (cached): with the eyes, kelp and glow (still art), or without (in play). */
function still(live: boolean): HTMLCanvasElement {
  const key = live ? 'live' : 'still';
  if (stills[key]) return stills[key];
  const [c, g] = makeCanvas(SK.w, JAW.y0 + JAW.h);
  paintHeadStill(g, live ? { open: 0.18, eyes: false, kelp: false, glow: false } : { open: 0.18, ph: 0.3 });
  stills[key] = c;
  return c;
}

function drawJorm(ctx: Ctx, o: { live: boolean; emissive?: boolean; heat?: boolean }): void {
  ctx.save();
  into(ctx);
  if (o.emissive) {
    // the embers in his eyes
    paintEyeGlows(ctx, 1);
    ctx.restore();
    return;
  }
  if (o.heat) {
    // overheated: the stone glows from the throat up through the crevices
    skullPath(ctx);
    ctx.clip();
    const hg = ctx.createLinearGradient(0, 520, 0, 120);
    hg.addColorStop(0, 'rgba(255,150,60,0.75)');
    hg.addColorStop(0.5, 'rgba(255,90,20,0.35)');
    hg.addColorStop(1, 'rgba(255,60,10,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, SK.w, SK.h);
    ctx.restore();
    return;
  }
  // the neck rising behind the head into the leg
  const neck = paintNeck();
  for (let y = 300; y > -OY / K - NECK.h; y -= NECK.h) ctx.drawImage(neck, SK.cx - NECK.w / 2, y);
  ctx.drawImage(still(o.live), 0, 0);
  ctx.restore();
}

/** The eyes as their own part: each frame the eyes under their lids (k 0 open … 3 shut), the skull over them. */
const eyeBox = (() => {
  const [x0, y0] = jormAt(EYE.x - EYE.fw / 2, EYE.y - EYE.fh / 2);
  const [x1, y1] = jormAt(SK.w - EYE.x + EYE.fw / 2, EYE.y + EYE.fh / 2);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
})();

/** A kelp strand as a part swinging from where it's caught. */
function kelpPart(i: number): PartDef {
  const k = KELP[i];
  const F = KELP_F[k.kind];
  const lx0 = k.flip ? k.x - (F.w - F.ax) : k.x - F.ax;
  const [x0, y0] = jormAt(lx0, k.y - F.ay);
  return {
    box: { x: x0, y: y0, w: F.w * K, h: F.h * K },
    frames: 1,
    pivot: jormAt(k.x, k.y),
    draw: (g) => {
      g.save();
      into(g);
      paintKelpAt(g, i, 0.3);
      g.restore();
    },
  };
}

registerStyle('jormungandr', {
  contactY: CONTACT,
  halfWidth: 108,
  portraitLeg: 30,
  // the neck runs down behind the crown
  leg: { kind: 'serpentneck', hw: Math.round((NECK.w / 2) * K), join: 'into', end: Math.round(OY + 200 * K) },
  parts: {
    eyes: {
      box: eyeBox,
      frames: 4,
      draw: (g, _a, i) => {
        g.save();
        into(g);
        paintEyesAt(g, 0, i);
        g.drawImage(paintSkull(), 0, 0);
        g.restore();
      },
    },
    ...Object.fromEntries(KELP.map((_, i) => [`kelp${i}`, kelpPart(i)])),
  },
  draw(ctx, _art, _p, o) {
    drawJorm(ctx, o);
  },
});

// ——— the leg: the serpent's neck ———

registerLegKind('serpentneck', {
  tint: '#0a0c18',
  ownShading: true,
  tile: 2,
  draw(ctx, x0, w, H) {
    // the fight's own neck, scaled to the leg and stacked so it repeats down the tile
    const tile = paintNeck();
    const k = w / (NECK.r * 2);
    const th = NECK.h * k;
    const n = Math.max(1, Math.round(H / th));
    const hh = H / n;
    wrapTile(ctx, H, () => {
      for (let i = 0; i < n; i++) ctx.drawImage(tile, NECK.w / 2 - NECK.r, 0, NECK.r * 2, NECK.h, x0, i * hh, w, hh);
    });
  },
});
