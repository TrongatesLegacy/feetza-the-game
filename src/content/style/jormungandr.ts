// JÖRMUNGANDR, the world serpent (Act 8's Bifröst mini-boss), in the style kit: his portrait, boss card and peel.
// It's the fight's own head (src/content/art/jormungandr.ts): a long wedge of a serpent's skull in three-quarter view,
// turned a little towards us (the top of the skull and both brows show) and aimed down, carried on its neck the way a
// snake's is: the neck comes down from the leg, swings out in a curve and runs straight on into the back of the skull,
// so head and neck are one line (feet are drawn strictly front-on; a serpent's head needs the turn for its length to
// read). Weathered stone plates with lichen, barnacles and salt in the
// cracks, a ridge of slabs down the top, an ember eye deep under a heavy brow, the jaw a little open on wet dark-pink
// gums and uneven teeth, a great lower tusk, kelp caught on him. The neck rising behind into the leg is the
// 'serpentneck' leg kind: stone-plated hide, the pale ribbed throat on its near side, the ridge down its back.
//
// In play (src/content/styleLive/jormungandr.ts) the stone lids blink, the ember breathes (the glow layer), the kelp
// sways on springs, steam curls from the nostrils and water drips off the kelp and the jaw. (In his fight the foot is
// hidden: the arena draws his body, src/game/bosses/jormRig.ts.)

import { CX } from '../../art/feetCommon';
import { registerLegKind, wrapTile } from '../../art/style/legs';
import { type PartDef, registerStyle } from '../../art/style/registry';
import { makeCanvas, type Ctx } from '../../art/util';
import { EYE, KELP, KELP_F, NECK, NECK_AT_HEAD, NOSES, SK, SOCKET, drawNeckAlong, jawTurn, paintEyeGlows, paintEyesAt, paintHeadStill, paintKelpAt, paintNeck, paintSkull, skullPath } from '../art/jormungandr';

/** Design units per skull unit, the head's turn (snout down towards us), and where its neck socket sits. */
const K = 0.31;
const ROT = -0.5;
const CONTACT = 306;
const SOCK: [number, number] = [CX + 78, 176];
/** Skull units → design units. */
export function jormAt(x: number, y: number): [number, number] {
  const dx = (x - SOCKET.x) * K;
  const dy = (y - SOCKET.y) * K;
  return [SOCK[0] + dx * Math.cos(ROT) - dy * Math.sin(ROT), SOCK[1] + dx * Math.sin(ROT) + dy * Math.cos(ROT)];
}
const into = (g: Ctx) => {
  g.translate(SOCK[0], SOCK[1]);
  g.rotate(ROT);
  g.scale(K, K);
  g.translate(-SOCKET.x, -SOCKET.y);
};

/** Where the live layer emits: the nostrils, the kelp tips, the chin (design units). */
export const JORM_NOSTRILS: [number, number][] = NOSES.map(([x, y]) => jormAt(x, y));
export const JORM_DRIPS: [number, number][] = [...KELP.map((k) => kelpAt(k.x, k.y)).map(([x, y], i) => [x, y + (KELP_F[KELP[i].kind].h - 40) * K] as [number, number]), jormAt(...jawTurn(140, 400, 0.15)), jormAt(...jawTurn(300, 420, 0.15))];

/** A kelp anchor in design units (the kelp itself hangs straight down, not turned with the head). */
function kelpAt(x: number, y: number): [number, number] {
  return jormAt(x, y);
}

const stills: Record<string, HTMLCanvasElement> = {};
/** The head as a picture at skull scale (cached): with the eye and glow (still art), or without (in play). */
function still(live: boolean): HTMLCanvasElement {
  const key = live ? 'live' : 'still';
  if (stills[key]) return stills[key];
  const [c, g] = makeCanvas(SK.w, SK.h);
  paintHeadStill(g, live ? { open: 0.15, eyes: false, kelp: false, glow: false } : { open: 0.15, kelp: false });
  stills[key] = c;
  return c;
}

function drawJorm(ctx: Ctx, o: { live: boolean; emissive?: boolean; heat?: boolean }): void {
  if (o.emissive) {
    // the embers in his eyes
    ctx.save();
    into(ctx);
    paintEyeGlows(ctx, 1);
    ctx.restore();
    return;
  }
  if (o.heat) {
    // overheated: the stone glows from the throat up through the crevices
    ctx.save();
    into(ctx);
    skullPath(ctx);
    ctx.clip();
    const hg = ctx.createLinearGradient(0, 440, 0, 100);
    hg.addColorStop(0, 'rgba(255,150,60,0.75)');
    hg.addColorStop(0.5, 'rgba(255,90,20,0.35)');
    hg.addColorStop(1, 'rgba(255,60,10,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, SK.w, SK.h);
    ctx.restore();
    return;
  }
  // the neck curving down from the leg into the back of the skull
  drawNeck(ctx);
  ctx.save();
  into(ctx);
  ctx.drawImage(still(o.live), 0, 0);
  ctx.restore();
  // the kelp hangs straight down from where it's caught
  if (!o.live) for (let i = 0; i < KELP.length; i++) drawKelp(ctx, i);
}

/** How thick the neck is where it comes down from the leg (against the head's own scale). */
const NECK_TOP = 1.05;

/** The neck: from the top of the frame (where the leg goes on) it swings out to the right in a curve and comes down
 * into the socket along the head's own axis, so it carries straight on into the back of the skull. */
function drawNeck(g: Ctx): void {
  // the head's axis back towards the neck, as turned in the frame
  const bx = Math.cos(ROT);
  const by = Math.sin(ROT);
  const reach = 210 * K;
  drawNeckAlong(g, [SOCK[0], SOCK[1], SOCK[0] + bx * reach, SOCK[1] + by * reach, CX, 70, CX, -24], K, K * NECK_AT_HEAD, K * NECK_TOP);
}

function drawKelp(g: Ctx, i: number): void {
  const k = KELP[i];
  const [x, y] = kelpAt(k.x, k.y);
  g.save();
  g.translate(x, y);
  g.scale(K, K);
  g.translate(-k.x, -k.y);
  paintKelpAt(g, i, 0.3);
  g.restore();
}

/** The eye as its own part: each frame the eye under its lid (k 0 open … 3 shut), the skull over it. */
const eyeBox = (() => {
  const [x, y] = jormAt(EYE.x, EYE.y);
  const r = EYE.fw * K * 0.6;
  return { x: x - r, y: y - r, w: r * 2, h: r * 2 };
})();

/** A kelp strand as a part swinging from where it's caught. */
function kelpPart(i: number): PartDef {
  const k = KELP[i];
  const F = KELP_F[k.kind];
  const [ax, ay] = kelpAt(k.x, k.y);
  const lx0 = k.flip ? -(F.w - F.ax) : -F.ax;
  return {
    box: { x: ax + lx0 * K, y: ay - F.ay * K, w: F.w * K, h: F.h * K },
    frames: 1,
    pivot: [ax, ay],
    draw: (g) => drawKelp(g, i),
  };
}

registerStyle('jormungandr', {
  contactY: CONTACT,
  halfWidth: 108,
  portraitLeg: 30,
  // the neck runs down behind the back of the skull
  leg: { kind: 'serpentneck', hw: Math.round(NECK.r * K * NECK_TOP), join: 'into', end: 6 },
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
      for (let i = 0; i < n; i++) ctx.drawImage(tile, NECK.cx - NECK.r, 0, NECK.r * 2, NECK.h, x0, i * hh, w, hh);
    });
  },
});
