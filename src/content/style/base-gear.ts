// Base roster, gear (style kit): Ice Queen, Roller Rita, Scuba Sam, Honk-a-Toe, Robo-Stomp 3000, Moon Boot Mo, Sir
// Stompalot, Peg-Leg Pete and Disco Dee. Skates, fins, armour and platforms, each one silhouette painted in its
// materials under the one light. How they move in play: src/content/styleLive/base.ts.

import { CX } from '../../art/feetCommon';
import { paintBare } from '../../art/style/bare';
import { LIGHT, type PathFn, type Pose, crease, glint, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil } from '../../art/style/sil';
import { type PartDef, registerStyle } from '../../art/style/registry';
import { blotches, contact, rivet, stitches } from '../../art/style/details';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';
import { LX, LY, clipTo, extendSil, layerOn, strap } from './base-kit';
import { scrunchCuff } from './base-bare';
import { type ShoeShape, bez, bow, finishShoe, lacing, paintSole, part, patent, raised, shoePath, soleOf, tubePath } from './base-shoe-kit';

/** Chrome: a hard mirror ramp across a part (sky, horizon, ground), clipped to it. */
function chrome(g: Ctx, path: PathFn, x0: number, y0: number, x1: number, y1: number, base = '#c9d0da'): void {
  clipTo(g, path, () => {
    const cg = g.createLinearGradient(x0, y0, x1, y1);
    cg.addColorStop(0, '#ffffff');
    cg.addColorStop(0.3, shade(base, 0.2));
    cg.addColorStop(0.46, shade(base, -0.55));
    cg.addColorStop(0.54, shade(base, -0.3));
    cg.addColorStop(0.75, shade(base, 0.35));
    cg.addColorStop(1, shade(base, -0.4));
    g.fillStyle = cg;
    g.fillRect(Math.min(x0, x1) - 200, Math.min(y0, y1) - 200, Math.abs(x1 - x0) + 400, Math.abs(y1 - y0) + 400);
    texture(g, 'brushed', { x: -100, y: -100, w: 500, h: 500 }, 0.15, 1);
  });
}

// ════════════════════════════ ICE QUEEN ════════════════════════════
// Glides in on a razor blade: a white leather figure skate, ice-blue laces, a white fur cuff, crystals on its side, a
// chrome blade on two stanchions underneath. In play frost mist trails off the blade, it glitters, and a landing
// throws up ice shavings.

const SKATE: ShoeShape = { top: -8, topHW: 58, ballY: 150, ballHW: 92, toeY: 244, toeR: 58, box: 0.55 };

registerStyle('skate', {
  contactY: 292,
  leg: { kind: 'knit', hw: 50, join: 'into' },
  draw(ctx, art) {
    const white = art.primary ?? '#f7f9fc';
    const ice = art.secondary ?? '#9fd8ff';
    const upper = shoePath(SKATE);
    const plate = shoePath(soleOf(SKATE, 2, 8, 200));
    const posts: PathFn[] = [-44, 44].map((x) => (c) => {
      c.beginPath();
      c.moveTo(CX + x - 8, 236);
      c.lineTo(CX + x + 8, 236);
      c.lineTo(CX + x + 6, 282);
      c.lineTo(CX + x - 6, 282);
      c.closePath();
    });
    const blade: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 74, 280);
      c.lineTo(CX + 62, 280);
      // the toe pick's teeth at the front (right), the runner's curl
      c.lineTo(CX + 70, 284);
      c.lineTo(CX + 76, 282);
      c.lineTo(CX + 80, 288);
      c.quadraticCurveTo(CX + 78, 294, CX + 66, 294);
      c.lineTo(CX - 70, 294);
      c.quadraticCurveTo(CX - 80, 292, CX - 74, 280);
      c.closePath();
    };
    const cuff: PathFn = (c) => {
      c.beginPath();
      const r = rng(hashStr('skate-fur'));
      c.moveTo(CX - 62, -8);
      c.lineTo(CX + 62, -8);
      for (let i = 0; i <= 16; i++) {
        const x = CX + 66 - (i * 132) / 16;
        c.lineTo(x, 22 + r() * 8);
      }
      c.closePath();
    };
    const box = { x: CX - 110, y: -12, w: 220, h: 310 };
    const sil = new Sil(ctx, [blade, ...posts, plate, upper, cuff], box);
    const g = sil.g;
    chrome(g, blade, CX - 60, 278, CX - 40, 298);
    for (const pp of posts) chrome(g, pp, CX - 60, 236, CX + 60, 282);
    paintSole(g, plate, { x: CX - 100, y: 200, w: 200, h: 60 }, '#d8dce4', { tex: 'rubber' });
    raised(g, upper, box, 'leather', white, 0.5, { texA: 0.18 });
    // a soft blue cast in the shadows (it's cold), crystals and a stitched snowflake on the side
    clipTo(g, upper, () => {
      const cold = g.createLinearGradient(CX - 90, 0, CX + 92, 0);
      cold.addColorStop(0, rgba(ice, 0));
      cold.addColorStop(1, rgba(ice, 0.35));
      g.fillStyle = cold;
      g.fillRect(box.x, box.y, box.w, box.h);
      spec(g, CX - 40, 120, 18, 60, 0.4, -0.3);
    });
    g.save();
    g.translate(CX - 62, 150);
    g.strokeStyle = rgba(ice, 0.95);
    g.lineWidth = 1.6;
    for (let i = 0; i < 6; i++) {
      g.rotate(Math.PI / 3);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(0, 13);
      g.moveTo(0, 8);
      g.lineTo(4, 11);
      g.moveTo(0, 8);
      g.lineTo(-4, 11);
      g.stroke();
    }
    g.restore();
    for (const [x, y] of [[CX + 70, 110], [CX + 76, 140], [CX + 66, 170], [CX - 80, 190]] as const) glint(g, x, y, 4.5, 0.95);
    // the throat and laces
    const tongue = (c: Ctx) => {
      c.beginPath();
      c.moveTo(CX - 26, 160);
      c.lineTo(CX - 28, 10);
      c.lineTo(CX + 28, 10);
      c.lineTo(CX + 26, 160);
      c.closePath();
    };
    raised(g, tongue, box, 'leather', shade(white, -0.04), 0.4, { texA: 0.15 });
    lacing(g, 6, 36, 28, 148, 24, ice, '#d9dde3', 4.6);
    // the white fur cuff
    raised(g, cuff, box, 'plush', '#ffffff', 0.5);
    clipTo(g, cuff, () => {
      const r = rng(hashStr('skate-cuff'));
      for (let i = 0; i < 220; i++) {
        const x = CX - 66 + r() * 132;
        const y = -6 + r() * 34;
        g.strokeStyle = rgba(r() < 0.6 ? '#ffffff' : '#c8d8f0', 0.6);
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (r() - 0.5) * 4, y + 4 + r() * 4);
        g.stroke();
      }
    });
    finishShoe(sil, mix(white, ice, 0.45), { openTop: -7, deep: '#2a3a6a', form: 0.3 });
  },
});

// ════════════════════════════ ROLLER RITA ════════════════════════════
// Rolls in from the 80s: a white leather roller boot with hot pink laces and stripes, a teal leg warmer slouched over
// the top, pink urethane wheels and a toe stop. In play her wheels spin and she leaves a neon trail as she weaves.

const RITA: ShoeShape = { top: 4, topHW: 58, ballY: 150, ballHW: 90, toeY: 246, toeR: 60, box: 0.55 };
/** The two front wheels (design centres) and their radius; play spins them. */
export const RITA_WHEELS: [number, number][] = [
  [CX - 72, 272],
  [CX + 72, 272],
];
export const RITA_WHEEL_R = 22;

/** A front-on urethane wheel: a translucent pink tyre with its tread lines at a spin phase, a chrome hub. */
export function ritaWheel(g: Ctx, x: number, y: number, pink: string, phase: number): void {
  const w = 17;
  const h = RITA_WHEEL_R;
  const tyre = (c: Ctx) => {
    c.beginPath();
    c.roundRect(x - w, y - h, w * 2, h * 2, 9);
  };
  contact(g, (c) => {
    tyre(c);
    c.fill();
  }, 0.4, 2, 3);
  clipTo(g, tyre, () => {
    const tg = g.createLinearGradient(x - w, 0, x + w, 0);
    tg.addColorStop(0, shade(pink, -0.4));
    tg.addColorStop(0.3, shade(pink, 0.35));
    tg.addColorStop(0.55, pink);
    tg.addColorStop(1, shade(pink, -0.5));
    g.fillStyle = tg;
    g.fillRect(x - w, y - h, w * 2, h * 2);
    // the tread rolling past: lines across that move with the spin
    g.strokeStyle = rgba(shade(pink, -0.5), 0.35);
    g.lineWidth = 1.4;
    for (let k = 0; k < 6; k++) {
      const u = ((k / 6 + phase) % 1) * Math.PI;
      const yy = y - Math.cos(u) * h;
      g.beginPath();
      g.moveTo(x - w, yy);
      g.lineTo(x + w, yy);
      g.stroke();
    }
    // the cylinder's shading top and bottom
    const vg = g.createLinearGradient(0, y - h, 0, y + h);
    vg.addColorStop(0, rgba('#000000', 0.35));
    vg.addColorStop(0.3, rgba('#ffffff', 0.12));
    vg.addColorStop(0.7, rgba('#000000', 0));
    vg.addColorStop(1, rgba('#000000', 0.45));
    g.fillStyle = vg;
    g.fillRect(x - w, y - h, w * 2, h * 2);
    spec(g, x - w * 0.4, y - h * 0.3, w * 0.3, h * 0.6, 0.6, 0);
  });
  g.strokeStyle = inkOf(pink);
  g.lineWidth = 2.6;
  tyre(g);
  g.stroke();
}

const ritaLegwarmer: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 64, -8);
  c.lineTo(CX + 64, -8);
  c.bezierCurveTo(CX + 70, 10, CX + 66, 30, CX + 70, 44);
  c.bezierCurveTo(CX + 30, 54, CX - 30, 52, CX - 70, 44);
  c.bezierCurveTo(CX - 66, 30, CX - 70, 10, CX - 64, -8);
  c.closePath();
};

registerStyle('rita', {
  contactY: 296,
  leg: { kind: 'knit', hw: 56, join: 'into' },
  draw(ctx, art, _p, o) {
    const white = art.primary ?? '#ffffff';
    const pink = art.secondary ?? '#ff4fa3';
    const upper = shoePath(RITA);
    const plate = shoePath(soleOf(RITA, 4, 10, 196));
    const truck: PathFn = (c) => {
      c.beginPath();
      c.roundRect(CX - 64, 252, 128, 16, 6);
    };
    const stop: PathFn = (c) => {
      c.beginPath();
      c.ellipse(CX, 266, 20, 16, 0, 0, Math.PI * 2);
    };
    const box = { x: CX - 110, y: -12, w: 220, h: 310 };
    const sil = new Sil(ctx, [truck, stop, plate, upper, ritaLegwarmer], box);
    const g = sil.g;
    chrome(g, truck, CX - 60, 250, CX - 50, 270, '#b8c0cc');
    part(g, stop, { x: CX - 22, y: 248, w: 44, h: 36 }, 'rubber', shade(pink, -0.45));
    paintSole(g, plate, { x: CX - 100, y: 196, w: 200, h: 64 }, '#f0eef4', { tex: 'rubber' });
    raised(g, upper, box, 'leather', white, 0.5, { texA: 0.15 });
    // hot pink stripes swooshing down the sides and a pink heel-and-toe trim
    for (const s of [-1, 1]) {
      strap(g, bez([CX + s * 70, 40], [CX + s * 96, 100], [CX + s * 70, 170], [CX + s * 30, 220], 14), 8, pink, { gloss: 0.4, shadow: 0.25 });
    }
    clipTo(g, upper, () => spec(g, CX - 40, 130, 18, 56, 0.45, -0.3));
    const tongue = (c: Ctx) => {
      c.beginPath();
      c.moveTo(CX - 26, 168);
      c.lineTo(CX - 28, 40);
      c.lineTo(CX + 28, 40);
      c.lineTo(CX + 26, 168);
      c.closePath();
    };
    raised(g, tongue, box, 'leather', shade(white, -0.04), 0.4, { texA: 0.12 });
    lacing(g, 5, 60, 28, 156, 24, pink, '#d9dde3', 4.6);
    // the slouched leg warmer over the top of the boot
    contact(g, (c) => {
      ritaLegwarmer(c);
      c.fill();
    }, 0.55, 3, 4);
    scrunchCuff(g, ritaLegwarmer, art.legColor ?? '#36d6c3', -8, 52, 72);
    finishShoe(sil, mix(white, '#8a8aa0', 0.4), { openTop: -7, form: 0.3 });
    if (!o.live) for (const [x, y] of RITA_WHEELS) ritaWheel(ctx, x, y, pink, 0);
  },
});

// ════════════════════════════ SCUBA SAM ════════════════════════════
// Smells faintly of pool: a teal rubber dive fin, the foot in its dark pocket, the long blade ribbed and vented,
// flaring out wide. In play the blade flexes, bubbles stream up off it and water drips from its edge.

const FIN_POCKET: ShoeShape = { top: -8, topHW: 60, ballY: 130, ballHW: 98, toeY: 190, toeR: 90, box: 0.5 };

function finBlade(p: Pose): PathFn {
  const c0 = Math.max(0, p.curl);
  const sp = Math.max(0, -p.curl);
  const L = 312 - c0 * 30 + sp * 4;
  const W = 136 + sp * 8 - c0 * 10;
  return (c) => {
    c.beginPath();
    // the blade's sides keep their rest shape above the rig's band (y 196); only the part below flexes
    c.moveTo(CX - 98, 120);
    c.bezierCurveTo(CX - 104, 150, CX - 112, 176, CX - 120, 200);
    c.bezierCurveTo(CX - 128, 222, CX - W - 2, 250, CX - W, L - 6);
    // the trailing edge: a shallow notch in the middle
    c.quadraticCurveTo(CX - W * 0.5, L + 4, CX, L - 14 - c0 * 6);
    c.quadraticCurveTo(CX + W * 0.5, L + 4, CX + W, L - 6);
    c.bezierCurveTo(CX + W + 2, 250, CX + 128, 222, CX + 120, 200);
    c.bezierCurveTo(CX + 112, 176, CX + 104, 150, CX + 100, 120);
    c.closePath();
  };
}

registerStyle('flipper', {
  contactY: 312,
  halfWidth: 138,
  rig: { from: 196, to: 220 },
  leg: { kind: 'wool', hw: 52, join: 'into' },
  draw(ctx, art, p) {
    const teal = art.primary ?? '#1fc8a6';
    const dark = art.secondary ?? '#0b6f73';
    const pocket = shoePath(FIN_POCKET);
    const blade = finBlade(p);
    const box = { x: CX - 150, y: -12, w: 300, h: 340 };
    const sil = new Sil(ctx, [blade, pocket], box);
    const g = sil.g;
    // the blade: translucent rubber, darker towards its rails, ribbed
    clipTo(g, blade, () => {
      const bg = g.createLinearGradient(CX - 140, 0, CX + 140, 0);
      bg.addColorStop(0, shade(teal, -0.35));
      bg.addColorStop(0.15, shade(teal, 0.15));
      bg.addColorStop(0.5, teal);
      bg.addColorStop(0.85, shade(teal, -0.15));
      bg.addColorStop(1, shade(teal, -0.45));
      g.fillStyle = bg;
      g.fillRect(box.x, 100, box.w, 230);
      texture(g, 'rubber', box, 0.35, 1.2);
      // the ribs fanning down the blade
      for (let i = -3; i <= 3; i++) {
        crease(g, (c) => {
          c.moveTo(CX + i * 18, 190);
          c.quadraticCurveTo(CX + i * 28, 250, CX + i * 38, 300);
        }, 2.2, shade(dark, -0.3), 0.4, 0.5);
      }
      // the stiff side rails
      for (const s of [-1, 1]) {
        softStroke(g, (c) => {
          c.moveTo(CX + s * 100, 130);
          c.bezierCurveTo(CX + s * 112, 190, CX + s * 130, 240, CX + s * 132, 296);
        }, rgba(dark, 0.85), 14, 2);
        softStroke(g, (c) => {
          c.moveTo(CX + s * 98, 132);
          c.bezierCurveTo(CX + s * 108, 190, CX + s * 126, 240, CX + s * 128, 294);
        }, rgba('#ffffff', 0.3), 3, 1);
      }
      // long water channels near the rails
      for (const sx of [-1, 1]) {
        const vent = (c: Ctx) => {
          c.beginPath();
          c.ellipse(CX + sx * 84, 250, 5, 30, sx * -0.28, 0, Math.PI * 2);
        };
        clipTo(g, vent, () => {
          g.fillStyle = rgba('#03201e', 0.7);
          g.fillRect(CX - 120, 200, 240, 100);
        });
      }
      spec(g, CX - 60, 240, 20, 50, 0.4, -0.2);
    });
    // the foot pocket: dark rubber over the foot, a moulded strap edge
    raised(g, pocket, box, 'rubber', dark, 0.6);
    clipTo(g, pocket, () => {
      spec(g, CX - 40, 90, 20, 50, 0.4, -0.3);
      for (let i = 0; i < 4; i++) crease(g, (c) => c.ellipse(CX, 190, 92 - i * 10, 40 - i * 6, 0, Math.PI * 1.1, Math.PI * 1.9), 1.4, '#000000', 0.4, 0.2);
    });
    finishShoe(sil, dark, { openTop: -7, deep: '#02201e', form: 0.35 });
  },
});

// ════════════════════════════ HONK-A-TOE ════════════════════════════
// The enormous clown shoe: glossy red patent ballooning out into a huge round toe, fat yellow laces with a floppy
// bow, and a ruff of yellow and white pompoms round the ankle. In play the bow flops, the shoe squashes and bounces, and
// a landing throws confetti.

const CLOWN_BOW = { x: CX, y: 132 };

const clownShoe: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 58, -8);
  c.lineTo(CX + 58, -8);
  c.bezierCurveTo(CX + 62, 50, CX + 70, 110, CX + 104, 140);
  c.bezierCurveTo(CX + 150, 170, CX + 156, 250, CX + 110, 268);
  c.bezierCurveTo(CX + 60, 286, CX - 60, 286, CX - 110, 268);
  c.bezierCurveTo(CX - 156, 250, CX - 150, 170, CX - 104, 140);
  c.bezierCurveTo(CX - 70, 110, CX - 62, 50, CX - 58, -8);
  c.closePath();
};

function clownBow(g: Ctx, yellow: string): void {
  bow(g, CLOWN_BOW.x, CLOWN_BOW.y, yellow, 1.7);
  // the bow's floppy ends
  for (const s of [-1, 1]) {
    strap(g, bez([CX + s * 4, CLOWN_BOW.y + 6], [CX + s * 14, CLOWN_BOW.y + 20], [CX + s * 8, CLOWN_BOW.y + 32], [CX + s * 18, CLOWN_BOW.y + 44], 8), 7, yellow, { gloss: 0.4, shadow: 0.35 });
  }
}

registerStyle('clown', {
  contactY: 270,
  halfWidth: 148,
  leg: { kind: 'wool', hw: 74, join: 'hem' },
  parts: {
    bow: { box: { x: CLOWN_BOW.x - 44, y: CLOWN_BOW.y - 20, w: 88, h: 72 }, frames: 1, pivot: [CLOWN_BOW.x, CLOWN_BOW.y], draw: (g, art) => clownBow(g, art.secondary ?? '#ffd400') },
  } satisfies Record<string, PartDef>,
  draw(ctx, art, _p, o) {
    const red = art.primary ?? '#e5242f';
    const yellow = art.secondary ?? '#ffd400';
    const ruff: PathFn = (c) => {
      c.beginPath();
      for (let i = 0; i < 9; i++) c.ellipse(CX - 64 + i * 16, 22 + (i % 2) * 4, 11, 11, 0, 0, Math.PI * 2);
    };
    const box = { x: CX - 160, y: -12, w: 320, h: 300 };
    const sil = new Sil(ctx, [clownShoe, ruff], box);
    const g = sil.g;
    raised(g, clownShoe, box, 'enamel', red, 0.5);
    clipTo(g, clownShoe, () => {
      // patent: big window reflections on the balloon toe, a dark horizon band, a red bounce light under it
      const env = g.createLinearGradient(CX - 150, 140, CX + 150, 280);
      env.addColorStop(0, rgba('#ffffff', 0.2));
      env.addColorStop(0.4, rgba('#30000a', 0.3));
      env.addColorStop(0.55, rgba('#30000a', 0));
      env.addColorStop(1, rgba('#30000a', 0.35));
      g.fillStyle = env;
      g.fillRect(box.x, 120, box.w, 170);
      patent(g, CX - 80, 196, 34, 12, 0.9, 0.9);
      patent(g, CX - 30, 172, 20, 7, 0.1, 0.6);
      patent(g, CX + 96, 230, 18, 5, -0.9, 0.4);
      spec(g, CX - 30, 60, 12, 40, 0.5, -0.2);
      // the toe's seam
      stitches(g, (c) => c.ellipse(CX, 214, 130, 62, 0, Math.PI * 1.1, Math.PI * 1.9), rgba(shade(red, -0.45), 0.7), 1.6, 4, 3);
    });
    // the throat and its fat laces
    lacing(g, 5, 46, 24, 122, 30, yellow, '#ffe680', 7);
    // the pompom ruff
    for (let i = 0; i < 9; i++) {
      const x = CX - 64 + i * 16;
      const y = 22 + (i % 2) * 4;
      const col = i % 2 ? '#ffffff' : yellow;
      contact(g, (c) => {
        c.beginPath();
        c.arc(x, y, 11, 0, Math.PI * 2);
        c.fill();
      }, 0.4, 2, 2.5);
      const pg = g.createRadialGradient(x - 4, y - 4, 1, x, y, 12);
      pg.addColorStop(0, shade(col, 0.4));
      pg.addColorStop(0.6, col);
      pg.addColorStop(1, shade(col, -0.35));
      g.fillStyle = pg;
      g.beginPath();
      g.arc(x, y, 11, 0, Math.PI * 2);
      g.fill();
      texture(g, 'fleece', { x: x - 12, y: y - 12, w: 24, h: 24 }, 0.4, 1);
    }
    finishShoe(sil, red, { openTop: -7, deep: '#30000a', form: 0.32 });
    if (!o.live) clownBow(ctx, yellow);
  },
});

// ════════════════════════════ ROBO-STOMP 3000 ════════════════════════════
// Rocket-assisted: a plated steel robot foot, an ankle actuator, panel lines and rivets, a cyan light bar and three
// toe blocks with glowing lenses, thruster nozzles underneath. In play the lights pulse, its thrusters fire as it
// bursts down, and sparks fly when it lands.

const roboBody: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 62, -8);
  c.lineTo(CX + 62, -8);
  c.lineTo(CX + 66, 40);
  c.lineTo(CX + 98, 110);
  c.lineTo(CX + 104, 196);
  c.lineTo(CX - 104, 196);
  c.lineTo(CX - 98, 110);
  c.lineTo(CX - 66, 40);
  c.closePath();
};

const roboToes: PathFn[] = [-66, 0, 66].map((x) => (c) => {
  c.beginPath();
  c.roundRect(CX + x - 30, 188, 60, 62, 12);
});

const ROBO_LENSES: [number, number][] = [-66, 0, 66].map((x) => [CX + x, 226]);

function roboGlow(g: Ctx, cyan: string, k: number): void {
  for (const [x, y] of ROBO_LENSES) {
    const rg = g.createRadialGradient(x, y, 1, x, y, 20);
    rg.addColorStop(0, rgba('#ffffff', 0.95 * k));
    rg.addColorStop(0.35, rgba(cyan, 0.85 * k));
    rg.addColorStop(1, rgba(cyan, 0));
    g.fillStyle = rg;
    g.fillRect(x - 22, y - 22, 44, 44);
  }
  const bar = g.createLinearGradient(0, 140, 0, 156);
  bar.addColorStop(0, rgba(cyan, 0));
  bar.addColorStop(0.5, rgba('#ffffff', 0.9 * k));
  bar.addColorStop(1, rgba(cyan, 0));
  g.fillStyle = bar;
  g.fillRect(CX - 84, 140, 168, 16);
}

registerStyle('robo', {
  contactY: 258,
  leg: { kind: 'iron', hw: 50, join: 'into' },
  draw(ctx, art, _p, o) {
    const steel = art.primary ?? '#c3cdd8';
    const cyan = art.secondary ?? '#33e1ff';
    const box = { x: CX - 112, y: -12, w: 224, h: 276 };
    const sil = new Sil(ctx, [roboBody, ...roboToes], box);
    const g = sil.g;
    if (o.emissive) {
      roboGlow(g, cyan, 1);
      sil.finish('rgba(0,0,0,0)', { w: 0.01, inner: 0 });
      return;
    }
    // the toe blocks first (the body's plate overhangs them)
    roboToes.forEach((t, i) => {
      chrome(g, t, CX - 100, 190, CX - 80 + i * 10, 250, steel);
      clipTo(g, t, () => {
        texture(g, 'brushed', box, 0.25, 1);
        g.fillStyle = rgba('#000000', 0.3);
        g.fillRect(CX - 110, 238, 220, 12);
      });
      const [x, y] = ROBO_LENSES[i];
      contact(g, (c) => {
        c.beginPath();
        c.arc(x, y, 10, 0, Math.PI * 2);
        c.fill();
      }, 0.5, -1.5, 2);
      g.fillStyle = '#0a1a24';
      g.beginPath();
      g.arc(x, y, 10, 0, Math.PI * 2);
      g.fill();
      const lg = g.createRadialGradient(x - 2, y - 2, 1, x, y, 8);
      lg.addColorStop(0, '#ffffff');
      lg.addColorStop(0.4, cyan);
      lg.addColorStop(1, shade(cyan, -0.6));
      g.fillStyle = lg;
      g.beginPath();
      g.arc(x, y, 7.5, 0, Math.PI * 2);
      g.fill();
      glint(g, x - 3, y - 3, 3, 1);
    });
    raised(g, roboBody, box, 'chrome', steel, 0.6);
    chrome(g, roboBody, CX - 90, 0, CX + 40, 210, steel);
    clipTo(g, roboBody, () => {
      // panel lines, a hazard stripe at the ankle, rivets
      for (const [x0, y0, x1, y1] of [[CX - 66, 40, CX + 66, 40], [CX - 98, 110, CX + 98, 110], [CX, 40, CX, 110], [CX - 50, 110, CX - 50, 196], [CX + 50, 110, CX + 50, 196]] as const) {
        crease(g, (c) => {
          c.moveTo(x0, y0);
          c.lineTo(x1, y1);
        }, 1.8, '#1a2030', 0.7, 0.45);
      }
      for (let i = -6; i < 8; i++) {
        g.fillStyle = i % 2 ? rgba('#1a1a1a', 0.7) : rgba('#ffc21a', 0.8);
        g.beginPath();
        g.moveTo(CX + i * 12, 4);
        g.lineTo(CX + i * 12 + 12, 4);
        g.lineTo(CX + i * 12, 16);
        g.lineTo(CX + i * 12 - 12, 16);
        g.closePath();
        g.fill();
      }
      // the light bar's housing
      g.fillStyle = '#0a1a24';
      g.fillRect(CX - 86, 140, 172, 16);
      const lb = g.createLinearGradient(0, 142, 0, 154);
      lb.addColorStop(0, shade(cyan, -0.3));
      lb.addColorStop(0.5, shade(cyan, 0.4));
      lb.addColorStop(1, shade(cyan, -0.3));
      g.fillStyle = lb;
      g.fillRect(CX - 82, 143, 164, 10);
    });
    for (const [x, y] of [[CX - 56, 52], [CX + 56, 52], [CX - 88, 120], [CX + 88, 120], [CX - 88, 184], [CX + 88, 184], [CX - 20, 80], [CX + 20, 80]] as const) rivet(g, x, y, 3.6, '#b8c0cc');
    // the model number
    g.save();
    g.font = "10px 'Lilita One', Impact, sans-serif";
    g.textAlign = 'center';
    g.fillStyle = rgba('#1a2030', 0.7);
    g.fillText('RS-3000', CX, 176);
    g.restore();
    roboGlow(g, cyan, 0.5);
    finishShoe(sil, mix(steel, '#3a4250', 0.5), { openTop: -7, deep: '#0a0e1a', form: 0.3 });
  },
});

// ════════════════════════════ MOON BOOT MO ════════════════════════════
// Low gravity: a puffy white quilted moon boot, pillowy stitched cells, orange straps with buckles, a mission patch,
// a ribbed grey sole. In play moon dust floats up off it and drifts, and a landing raises a slow ring of dust.

const MOON: ShoeShape = { top: -8, topHW: 74, ballY: 150, ballHW: 110, toeY: 258, toeR: 86, box: 0.5 };

registerStyle('moe', {
  contactY: 274,
  halfWidth: 112,
  leg: { kind: 'wool', hw: 76, join: 'hem' },
  draw(ctx, art) {
    const white = art.primary ?? '#f2f5fa';
    const orange = art.secondary ?? '#ff5a36';
    const upper = shoePath(MOON);
    const sole = shoePath(soleOf(MOON, 6, 16, 160));
    const box = { x: CX - 124, y: -12, w: 248, h: 300 };
    const sil = new Sil(ctx, [sole, upper], box);
    const g = sil.g;
    paintSole(g, sole, { x: CX - 116, y: 160, w: 232, h: 120 }, '#9aa0aa', { tex: 'rubber' });
    clipTo(g, sole, () => {
      g.fillStyle = rgba('#000000', 0.2);
      for (let i = 0; i < 4; i++) g.fillRect(CX - 130, 248 + i * 6, 260, 2);
    });
    raised(g, upper, box, 'canvas', white, 0.5, { texA: 0.12 });
    // quilting: pillowy cells, each bulging between its stitched seams
    clipTo(g, upper, () => {
      for (let y = 10; y < 250; y += 34) {
        for (let x = CX - 120 + ((y / 34) % 2) * 20; x < CX + 120; x += 40) {
          softFill(g, (c) => {
            c.beginPath();
            c.ellipse(x - 4, y - 4, 16, 12, 0, 0, Math.PI * 2);
          }, rgba('#ffffff', 0.5), 4);
          softFill(g, (c) => {
            c.beginPath();
            c.ellipse(x + 6, y + 8, 16, 10, 0, 0, Math.PI * 2);
          }, rgba('#6a7aa0', 0.22), 5);
        }
      }
      for (let y = 26; y < 260; y += 34) stitches(g, (c) => {
        c.moveTo(CX - 120, y);
        c.quadraticCurveTo(CX, y + 10, CX + 120, y);
      }, rgba('#8a96b0', 0.6), 1.2, 3, 2.5);
      // nylon's soft sheen
      spec(g, CX - 46, 110, 40, 70, 0.35, -0.4);
    });
    // orange straps with buckles, and the mission patch
    for (const y of [70, 150]) {
      strap(g, bez([CX - 112, y + 6], [CX - 40, y - 12], [CX + 40, y - 12], [CX + 112, y + 6], 16), 16, orange, { gloss: 0.4, stitch: rgba('#ffffff', 0.5) });
      const bx = CX + 64;
      const by = y - 6;
      g.strokeStyle = '#d9dde3';
      g.lineWidth = 3;
      g.strokeRect(bx - 8, by - 9, 16, 18);
      glint(g, bx - 6, by - 7, 3, 0.9);
    }
    const [px, py] = [CX - 30, 214];
    contact(g, (c) => {
      c.beginPath();
      c.arc(px, py, 19, 0, Math.PI * 2);
      c.fill();
    }, 0.4, 2, 2.5);
    g.fillStyle = '#1a2a6a';
    g.beginPath();
    g.arc(px, py, 18, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = '#ffffff';
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? 3.4 : 8;
      if (i) g.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr);
      else g.moveTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
    g.strokeStyle = orange;
    g.lineWidth = 2.2;
    g.beginPath();
    g.ellipse(px, py + 2, 15, 5, -0.4, 0, Math.PI * 2);
    g.stroke();
    finishShoe(sil, mix(white, '#5a6a8a', 0.45), { openTop: -7, deep: '#2a3a5a', form: 0.3 });
  },
});

// ════════════════════════════ SIR STOMPALOT ════════════════════════════
// Clad in full plate: a sabaton of overlapping steel lames from the ankle down to a pointed toe cap, each lame lit
// along its edge and gold-trimmed, rivets at the sides. In play light glints along the steel and sparks fly when he
// lands.

registerStyle('stompalot', {
  contactY: 266,
  leg: { kind: 'iron', hw: 52, join: 'into' },
  draw(ctx, art) {
    const steel = art.primary ?? '#b9c2cc';
    const gold = art.secondary ?? '#c8a24a';
    const shape: ShoeShape = { top: -8, topHW: 64, ballY: 150, ballHW: 98, toeY: 262, toeR: 18, box: 0.62 };
    const foot = shoePath(shape);
    const box = { x: CX - 110, y: -12, w: 220, h: 290 };
    const sil = new Sil(ctx, [foot], box);
    const g = sil.g;
    chrome(g, foot, CX - 90, -10, CX + 60, 260, steel);
    // the lames, top to bottom; each overlaps the one below it, so its lower edge casts a shadow down
    clipTo(g, foot, () => {
      const ys = [16, 44, 72, 100, 128, 156, 184];
      for (let i = ys.length - 1; i >= 0; i--) {
        const y = ys[i];
        const lame = (c: Ctx) => {
          c.beginPath();
          c.moveTo(CX - 130, y - 30);
          c.lineTo(CX + 130, y - 30);
          c.lineTo(CX + 130, y);
          c.quadraticCurveTo(CX, y + 18, CX - 130, y);
          c.closePath();
        };
        contact(g, (c) => {
          lame(c);
          c.fill();
        }, 0.6, 4, 3);
        chrome(g, lame, CX - 80, y - 30, CX + 20, y + 20, steel);
        // its rolled lower edge: gold trim catching the light
        softStroke(g, (c) => {
          c.moveTo(CX - 130, y - 1);
          c.quadraticCurveTo(CX, y + 17, CX + 130, y - 1);
        }, gold, 3.2, 0.4);
        softStroke(g, (c) => {
          c.moveTo(CX - 130, y - 2.5);
          c.quadraticCurveTo(CX, y + 15.5, CX + 130, y - 2.5);
        }, rgba('#fff4c0', 0.8), 1, 0.3);
      }
      // the pointed toe cap with a ridge down its middle
      const capTop = 196;
      crease(g, (c) => {
        c.moveTo(CX, capTop + 6);
        c.lineTo(CX, 258);
      }, 2, '#1a2030', 0.6, 0.6);
      spec(g, CX - 20, 226, 10, 28, 0.85, -0.1);
      spec(g, CX - 40, 60, 14, 50, 0.4, -0.2);
    });
    for (const s of [-1, 1]) for (const y of [30, 86, 142]) rivet(g, CX + s * (62 + y * 0.22), y, 3.6, gold);
    finishShoe(sil, mix(steel, '#2a3040', 0.5), { openTop: -7, deep: '#0a0e1a', form: 0.3 });
  },
});

// ════════════════════════════ PEG-LEG PETE ════════════════════════════
// Arr: a turned oak peg out of his trouser leg, lathe rings, two brass bands, a lashing of tarred rope with a frayed
// end, a nail or two, tally notches and an iron ferrule on the tip. In play the rope end sways, and every jab splinters.

const PEG_ROPE = { x: CX + 34, y: 74 };

const pegPath: PathFn = tubePath(
  [[CX, -8], [CX, 40], [CX - 1, 90], [CX, 140], [CX + 1, 190], [CX, 236], [CX, 246]],
  [40, 36, 30, 26, 21, 17, 15],
);

function ropeEnd(g: Ctx): void {
  const { x, y } = PEG_ROPE;
  const pts = bez([x, y], [x + 10, y + 16], [x + 2, y + 30], [x + 10, y + 46], 10);
  const rope = tubePath(pts, pts.map((_, i) => 4.5 - i * 0.15));
  contact(g, (c) => {
    rope(c);
    c.fill();
  }, 0.45, 2.5, 3);
  clipTo(g, rope, () => {
    g.fillStyle = '#8a6a3a';
    g.fillRect(x - 20, y - 10, 50, 70);
    g.strokeStyle = rgba('#3a2a10', 0.6);
    g.lineWidth = 1.2;
    for (let k = 0; k < 10; k++) {
      g.beginPath();
      g.moveTo(x - 10, y + k * 5);
      g.lineTo(x + 20, y + k * 5 + 8);
      g.stroke();
    }
  });
  g.strokeStyle = '#2a1a08';
  g.lineWidth = 1.8;
  rope(g);
  g.stroke();
  // the frayed tuft
  const [ex, ey] = pts[pts.length - 1];
  g.strokeStyle = '#a8885a';
  g.lineWidth = 1;
  for (let k = -3; k <= 3; k++) {
    g.beginPath();
    g.moveTo(ex, ey);
    g.lineTo(ex + k * 2, ey + 8 + Math.abs(k));
    g.stroke();
  }
}

registerStyle('pete', {
  contactY: 258,
  halfWidth: 44,
  leg: { kind: 'wool', hw: 62, join: 'hem' },
  parts: {
    rope: { box: { x: PEG_ROPE.x - 12, y: PEG_ROPE.y - 6, w: 40, h: 64 }, frames: 1, pivot: [PEG_ROPE.x, PEG_ROPE.y], draw: (g) => ropeEnd(g) },
  } satisfies Record<string, PartDef>,
  draw(ctx, art, _p, o) {
    const wood = art.primary ?? '#8a5a32';
    const brass = art.secondary ?? '#c9a25a';
    const ferrule: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 17, 236);
      c.lineTo(CX + 17, 236);
      c.lineTo(CX + 14, 256);
      c.quadraticCurveTo(CX, 262, CX - 14, 256);
      c.closePath();
    };
    const box = { x: CX - 50, y: -12, w: 100, h: 280 };
    const sil = new Sil(ctx, [pegPath, ferrule], box);
    const g = sil.g;
    // turned oak: a cylinder lit from the left, grain running down it
    clipTo(g, pegPath, () => {
      const wg = g.createLinearGradient(CX - 40, 0, CX + 40, 0);
      wg.addColorStop(0, shade(wood, -0.2));
      wg.addColorStop(0.25, shade(wood, 0.3));
      wg.addColorStop(0.55, wood);
      wg.addColorStop(0.9, mix(shade(wood, -0.5), '#1a0a04', 0.3));
      wg.addColorStop(1, mix(wood, LIGHT.rim, 0.3));
      g.fillStyle = wg;
      g.fillRect(box.x, box.y, box.w, box.h);
      g.save();
      g.translate(CX, 0);
      g.rotate(Math.PI / 2);
      texture(g, 'wood', { x: -20, y: -60, w: 300, h: 120 }, 0.5, 1.4);
      g.restore();
      // lathe rings
      for (const y of [30, 34, 112, 116, 200]) crease(g, (c) => c.ellipse(CX, y, 40, 4, 0, 0.05, Math.PI - 0.05), 1.6, shade(wood, -0.6), 0.6, 0.3);
      // tally notches and a nail
      g.strokeStyle = rgba('#2a1206', 0.75);
      g.lineWidth = 1.6;
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.moveTo(CX - 14 + i * 5, 150);
        g.lineTo(CX - 16 + i * 5 + (i === 4 ? 22 : 0), 166 - (i === 4 ? 12 : 0));
        g.stroke();
      }
      rivet(g, CX + 12, 96, 2.6, '#7a7a80');
      blotches(g, box, '#2a1206', 0.25, 16, 0.6, 0.12, 111, 'multiply');
    });
    // brass bands
    for (const [y, hw] of [[52, 35], [186, 22]] as const) {
      const band = (c: Ctx) => {
        c.beginPath();
        c.roundRect(CX - hw - 2, y - 6, hw * 2 + 4, 12, 3);
      };
      contact(g, (c) => {
        band(c);
        c.fill();
      }, 0.45, 2, 2.5);
      clipTo(g, band, () => {
        const bg = g.createLinearGradient(CX - hw, 0, CX + hw, 0);
        bg.addColorStop(0, shade(brass, -0.3));
        bg.addColorStop(0.25, shade(brass, 0.6));
        bg.addColorStop(0.55, brass);
        bg.addColorStop(1, shade(brass, -0.5));
        g.fillStyle = bg;
        g.fillRect(CX - hw - 4, y - 8, hw * 2 + 8, 16);
      });
      for (const x of [-hw * 0.6, 0, hw * 0.6]) rivet(g, CX + x, y, 1.8, shade(brass, 0.2));
    }
    // the rope lashing
    for (let i = 0; i < 4; i++) strap(g, [[CX - 36, 66 + i * 6], [CX, 70 + i * 6], [CX + 36, 66 + i * 6]], 5, '#8a6a3a', { shadow: 0.35 });
    // the iron ferrule
    chrome(g, ferrule, CX - 20, 236, CX + 10, 262, '#6a7078');
    finishShoe(sil, wood, { openTop: -7, deep: '#1a0a04' });
    if (!o.live) ropeEnd(ctx);
  },
});

// ════════════════════════════ DISCO DEE ════════════════════════════
// Platform soles and glitter: her toes peek over a purple glitter strap, a strap round the ankle, and a towering gold
// glitter platform underneath. In play the glitter flashes in every colour and disco light flecks sweep over her.

const discoPlatform: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 40, 60);
  c.bezierCurveTo(CX - 64, 100, CX - 104, 130, CX - 112, 190);
  c.lineTo(CX - 112, 262);
  c.quadraticCurveTo(CX - 110, 282, CX - 80, 284);
  c.lineTo(CX + 82, 284);
  c.quadraticCurveTo(CX + 114, 282, CX + 116, 262);
  c.lineTo(CX + 116, 190);
  c.bezierCurveTo(CX + 108, 130, CX + 66, 100, CX + 44, 60);
  c.closePath();
};

function glitter(g: Ctx, box: { x: number; y: number; w: number; h: number }, base: string, n: number, seed: string): void {
  const r = rng(hashStr(seed));
  for (let i = 0; i < n; i++) {
    const x = box.x + r() * box.w;
    const y = box.y + r() * box.h;
    const t = r();
    g.fillStyle = t < 0.5 ? rgba(shade(base, 0.6), 0.7) : t < 0.8 ? rgba(shade(base, -0.4), 0.6) : rgba('#ffffff', 0.9);
    g.fillRect(x, y, 1.4 + r() * 1.4, 1.4 + r() * 1.4);
  }
}

registerStyle('disco', {
  contactY: 280,
  halfWidth: 110,
  rig: { from: 140, to: 162 },
  leg: { kind: 'denim', hw: 72, join: 'hem' },
  draw(ctx, art, p) {
    const purple = art.primary ?? '#c13cff';
    const gold = art.secondary ?? '#ffe14d';
    const f = paintBare(ctx, { skin: art.skin, nails: '#c13cff', pores: 0.18, shadowTint: '#3a0a10' }, p);
    const g = f.sil.g;
    extendSil(f.sil, [discoPlatform]);
    // the platform under the foot: gold glitter, its front face tall and banded
    layerOn(g, 'destination-over', (l) => {
      l.save();
      if ('filter' in l) l.filter = 'blur(2.5px)';
      l.translate(-LX * 4, -LY * 4);
      l.fillStyle = rgba('#000000', 0.5);
      for (const pth of f.sil.parts) {
        pth(l);
        l.fill();
      }
      l.restore();
      clipTo(l, discoPlatform, () => {
        const pg = l.createLinearGradient(CX - 112, 0, CX + 116, 0);
        pg.addColorStop(0, shade(gold, -0.3));
        pg.addColorStop(0.25, shade(gold, 0.35));
        pg.addColorStop(0.6, gold);
        pg.addColorStop(1, shade(gold, -0.45));
        l.fillStyle = pg;
        l.fillRect(CX - 120, 50, 240, 240);
        glitter(l, { x: CX - 116, y: 50, w: 232, h: 240 }, gold, 1600, 'disco-plat');
        // its banded front face below the toes
        l.fillStyle = rgba('#5a3a00', 0.3);
        l.fillRect(CX - 120, 254, 240, 3);
        l.fillRect(CX - 120, 270, 240, 2);
        const fg = l.createLinearGradient(0, 240, 0, 286);
        fg.addColorStop(0, rgba('#000000', 0));
        fg.addColorStop(1, rgba('#3a2000', 0.4));
        l.fillStyle = fg;
        l.fillRect(CX - 120, 240, 240, 46);
      });
    });
    // the glitter straps: one across the toes' roots, one round the ankle
    const toeStrap: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 104, 150);
      c.bezierCurveTo(CX - 40, 128, CX + 40, 128, CX + 112, 146);
      c.lineTo(CX + 114, 196);
      c.bezierCurveTo(CX + 40, 182, CX - 40, 184, CX - 108, 196);
      c.closePath();
    };
    const ankleStrap: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 56, 26);
      c.quadraticCurveTo(CX, 40, CX + 58, 26);
      c.lineTo(CX + 60, 44);
      c.quadraticCurveTo(CX, 58, CX - 58, 44);
      c.closePath();
    };
    extendSil(f.sil, [toeStrap]);
    for (const s of [toeStrap, ankleStrap]) {
      raised(g, s, { x: CX - 116, y: 20, w: 232, h: 180 }, 'enamel', purple, 0.6);
      clipTo(g, s, () => glitter(g, { x: CX - 116, y: 20, w: 232, h: 180 }, purple, 1400, 'disco-strap'));
    }
    // a gold buckle on the ankle strap
    g.strokeStyle = gold;
    g.lineWidth = 3;
    g.strokeRect(CX + 34, 30, 14, 18);
    glint(g, CX + 36, 32, 3, 1);
    f.sil.edge(rgba(LIGHT.rim, 0.45), 2.5, LX * 3, LY * 3);
    f.sil.finish(inkOf(art.skin), { openTop: f.top + 1.5 });
  },
});


