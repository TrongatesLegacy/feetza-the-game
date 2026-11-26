// Roster batch, part 1: the Trattoria and the Rooftop (Waiter Walt, Garlic Gary, Espresso Ed, Saucy Sal, Antenna
// Andy, Parkour Pablo), redrawn in the style kit. Their life in play is in src/content/styleLive/roster.ts.

import type { FootArt } from '../../data/feet';
import { bareParts, onToe } from '../../art/style/anatomy';
import { type BareFoot, paintBare } from '../../art/style/bare';
import { LIGHT, type PathFn, type Pose, ao, crease, glint, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil, lobe } from '../../art/style/sil';
import { registerStyle } from '../../art/style/registry';
import { contact, eyelet, laceRun, stitches } from '../../art/style/details';
import { tones } from '../../art/style/materials';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';
import { BARE_RIG, CX, RMAT, SHOE_RIG, bareWith, dripPath, ell, finishLight, piece, prop, solePath, upperPath, vgrad, within } from './roster-kit';
import { paintSalver, paintSalverBack, salverPath, salverShadow } from './salver';

// ════════════════════════ Waiter Walt ════════════════════════
// A black patent oxford polished to a mirror, a crisp linen napkin draped over the toe and a red bow tie on the
// tongue, and his round silver tray held up face-on in front of the shoe as a shield (a beaded rim, the room mirrored
// in it). In play the tray is its own piece (src/game/guardShield.ts: it dents, and it's knocked off whole); the
// napkin's corner swings and the patent toe throws glints.

const WAITER = { topW: 58, ballW: 98, toeY: 238 };
/** His tray: a round salver held up in front of the shoe, over the toe (the bow tie and laces show above it). */
const WALT_TRAY = { x: CX + 2, y: 160, r: 80 };
const waltTrayPath = salverPath(WALT_TRAY.x, WALT_TRAY.y, WALT_TRAY.r);
const WALT_TRAY_BOX = { x: WALT_TRAY.x - WALT_TRAY.r - 2, y: WALT_TRAY.y - WALT_TRAY.r - 2, w: WALT_TRAY.r * 2 + 4, h: WALT_TRAY.r * 2 + 4 };

/** Walt's tray alone: its own silhouette over whatever's behind it. */
function drawWaltTray(ctx: Ctx): void {
  const { x, y, r } = WALT_TRAY;
  const sil = new Sil(ctx, [waltTrayPath], WALT_TRAY_BOX);
  paintSalver(sil.g, x, y, r, { rim: 'beads', n: 36, well: 0.8 });
  finishLight(sil, '#9aa3b0', '#1a2030', 0.22);
  sil.finish(inkOf('#6a7280'));
}

/** The napkin's loose corner (a live part; the body draws it in still art). */
const NAPKIN_TAIL: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX + 84, 134);
  c.bezierCurveTo(CX + 108, 138, CX + 126, 150, CX + 132, 160);
  c.lineTo(CX + 120, 214);
  c.bezierCurveTo(CX + 112, 206, CX + 102, 200, CX + 90, 198);
  c.closePath();
};

function paintNapkinTail(g: Ctx, linen: string, stripe: string): void {
  const box = { x: CX + 80, y: 130, w: 56, h: 90 };
  piece(g, NAPKIN_TAIL, box, 'linen', linen, { shadow: 0.4 });
  within(g, NAPKIN_TAIL, () => {
    // a fold running down it and the hem's red stripe
    softStroke(g, (c) => {
      c.moveTo(CX + 100, 140);
      c.quadraticCurveTo(CX + 112, 170, CX + 108, 206);
    }, rgba('#5a5a8a', 0.25), 5, 3);
    g.strokeStyle = rgba(stripe, 0.85);
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(CX + 125, 162);
    g.lineTo(CX + 115, 208);
    g.stroke();
  });
}

const napkinPath = (flex: number): PathFn => (c) => {
  c.beginPath();
  c.moveTo(CX - 104, 116);
  c.bezierCurveTo(CX - 50, 104, CX + 40, 118, CX + 102, 132);
  c.lineTo(CX + 106, 156);
  c.bezierCurveTo(CX + 60, 176 - flex * 4, CX - 30, 172 - flex * 4, CX - 106, 176);
  c.closePath();
};

function drawWaiter(ctx: Ctx, art: FootArt, p: Pose, live: boolean): void {
  const black = art.primary ?? '#16161c';
  const linen = art.secondary ?? '#f7f5ef';
  const red = '#c8232c';
  const flex = Math.max(0, p.curl);
  const upper = upperPath(WAITER, flex);
  const sole = solePath(WAITER, flex, 24, 170, 4);
  const napkin = napkinPath(flex);
  const box = { x: CX - 112, y: -10, w: 250, h: 280 };
  const sil = new Sil(ctx, live ? [sole, upper, napkin] : [sole, upper, napkin, NAPKIN_TAIL], box);
  const g = sil.g;
  // the sole: a dark leather welt with a stitched edge and a polished rim
  g.fillStyle = '#1c1714';
  sole(g);
  g.fill();
  within(g, sole, () => {
    g.fillStyle = vgrad(g, 170, 266, [[0, '#3a302a'], [0.6, '#211a16'], [1, '#0a0807']]);
    g.fillRect(box.x, 160, box.w, 110);
    texture(g, 'leather', box, 0.25, 1.4);
    spec(g, CX - 50, 248 - flex * 5, 40, 5, 0.35, 0.05);
  });
  stitches(g, (c) => {
    c.moveTo(CX - 98, 222);
    c.bezierCurveTo(CX - 90, 248 - flex * 5, CX - 40, 250 - flex * 5, CX, 250 - flex * 5);
    c.bezierCurveTo(CX + 40, 250 - flex * 5, CX + 90, 248 - flex * 5, CX + 98, 222);
  }, rgba('#8a7a6a', 0.7), 1.2, 3, 3);
  // the patent upper: deep black with mirror reflections of the room's light
  piece(g, upper, box, 'patent', black, { shadow: 0.5 });
  within(g, upper, () => {
    // a window reflected on the toe: two soft panes, and the long horizon line along the vamp
    // the room's light mirrored on the toe: a curved streak and a hot spot
    softStroke(g, (c) => {
      c.moveTo(CX - 74, 214 - flex * 5);
      c.quadraticCurveTo(CX - 40, 196 - flex * 6, CX + 6, 200 - flex * 6);
    }, rgba('#e8f0ff', 0.6), 7, 2.5);
    spec(g, CX - 44, 202 - flex * 5, 18, 6, 0.9, -0.25);
    softStroke(g, (c) => {
      c.moveTo(CX - 86, 120);
      c.bezierCurveTo(CX - 90, 160, CX - 70, 196, CX - 40, 212);
    }, rgba('#cfe0ff', 0.35), 6, 2);
    spec(g, CX + 64, 196 - flex * 4, 18, 8, 0.4, 0.7, LIGHT.rim);
    // the cap seam with its brogue holes
    const capY = 186 - flex * 5;
    crease(g, (c) => {
      c.moveTo(CX - 94, capY + 18);
      c.quadraticCurveTo(CX, capY - 18, CX + 96, capY + 18);
    }, 2, '#000000', 0.8, 0.25);
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const x = CX - 86 + t * 172;
      const y = capY + 13 - Math.sin(t * Math.PI) * 26;
      g.fillStyle = rgba('#000000', 0.8);
      g.beginPath();
      g.arc(x, y, 1.6, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = rgba('#ffffff', 0.25);
      g.beginPath();
      g.arc(x - 0.5, y - 0.6, 0.7, 0, Math.PI * 2);
      g.fill();
    }
    // closed oxford lacing: the quarters meet over a narrow tongue
    g.fillStyle = rgba('#000000', 0.5);
    g.beginPath();
    g.moveTo(CX - 18, 18);
    g.lineTo(CX + 18, 18);
    g.lineTo(CX + 10, 96);
    g.lineTo(CX - 10, 96);
    g.closePath();
    g.fill();
    for (let i = 0; i < 4; i++) {
      const y = 30 + i * 18;
      const w = 16 - i * 1.6;
      eyelet(g, CX - w, y, 2.6, '#3a3a44');
      eyelet(g, CX + w, y, 2.6, '#3a3a44');
      laceRun(g, CX - w, y, CX + w, y, '#2a2a32', 3.2);
    }
    // the quarters' seams
    for (const s of [-1, 1]) crease(g, (c) => {
      c.moveTo(CX + s * 20, 16);
      c.bezierCurveTo(CX + s * 28, 60, CX + s * 16, 92, CX + s * 12, 100);
    }, 1.6, '#000000', 0.7, 0.18);
  });
  // the napkin: starched linen draped over the vamp, a red stripe at the hem
  piece(g, napkin, box, 'linen', linen, { shadow: 0.55 });
  within(g, napkin, () => {
    for (const [x0, a] of [[-60, 0.3], [-10, 0.22], [44, 0.26]] as const) {
      softStroke(g, (c) => {
        c.moveTo(CX + x0, 112);
        c.quadraticCurveTo(CX + x0 + 8, 140, CX + x0 + 2, 176);
      }, rgba('#6a6a9a', a), 7, 4);
      softStroke(g, (c) => {
        c.moveTo(CX + x0 - 7, 112);
        c.quadraticCurveTo(CX + x0 + 1, 140, CX + x0 - 5, 176);
      }, rgba('#ffffff', 0.5), 4, 2);
    }
    g.strokeStyle = rgba(red, 0.85);
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(CX - 106, 168);
    g.bezierCurveTo(CX - 30, 164 - flex * 4, CX + 60, 168 - flex * 4, CX + 106, 148);
    g.stroke();
    spec(g, CX - 50, 124, 40, 8, 0.45, -0.05);
  });
  if (!live) paintNapkinTail(g, linen, red);
  // the bow tie on the tongue: red satin
  const bow: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX, 16);
    c.bezierCurveTo(CX - 10, 4, CX - 24, 2, CX - 26, 8);
    c.bezierCurveTo(CX - 28, 16, CX - 26, 26, CX - 22, 28);
    c.bezierCurveTo(CX - 14, 30, CX - 6, 22, CX, 18);
    c.bezierCurveTo(CX + 6, 22, CX + 14, 30, CX + 22, 28);
    c.bezierCurveTo(CX + 26, 26, CX + 28, 16, CX + 26, 8);
    c.bezierCurveTo(CX + 24, 2, CX + 10, 4, CX, 16);
    c.closePath();
  };
  piece(g, bow, { x: CX - 28, y: 0, w: 56, h: 32 }, 'enamel', red, { shadow: 0.5 });
  within(g, bow, () => {
    for (const s of [-1, 1]) softStroke(g, (c) => {
      c.moveTo(CX + s * 6, 17);
      c.lineTo(CX + s * 22, 10);
      c.moveTo(CX + s * 6, 19);
      c.lineTo(CX + s * 21, 25);
    }, rgba('#5a0810', 0.5), 2, 1);
  });
  piece(g, ell(CX, 17, 6, 7), { x: CX - 6, y: 10, w: 12, h: 14 }, 'enamel', shade(red, -0.1), { shadow: 0.5 });
  glint(g, CX - 13, 10, 3.5, 0.8);
  finishLight(sil, black, '#101020', 0.3);
  sil.finish(inkOf(shade(black, 0.1)), { openTop: -5 });
}

registerStyle('waiter', {
  contactY: 264,
  rig: SHOE_RIG,
  leg: { kind: 'wool', hw: 68, join: 'hem' },
  // in play the tray is its own piece (src/game/guardShield.ts): dented by blocked smacks, knocked off whole
  shield: {
    box: { x: WALT_TRAY_BOX.x - 6, y: WALT_TRAY_BOX.y - 6, w: WALT_TRAY_BOX.w + 18, h: WALT_TRAY_BOX.h + 20 },
    pivot: [WALT_TRAY.x + 34, WALT_TRAY.y + 46],
    down: { dx: -150, dy: 84, rot: -0.5, sx: 0.58 },
    material: 'silver',
    badge: 'plate',
    accent: '#cfd8e4',
    words: { up: 'TRAY', off: 'KNOCKED', offSub: 'OFF!', rearm: 'NEW TRAY', icon: 'tray', offIcon: 'trayOff' },
    sounds: { crack: 'sfx_traydent', shatter: 'sfx_trayknock' },
    draw: (ctx) => drawWaltTray(ctx),
    back(ctx) {
      const { x, y, r } = WALT_TRAY;
      const sil = new Sil(ctx, [waltTrayPath], WALT_TRAY_BOX);
      paintSalverBack(sil.g, x, y, r);
      sil.finish(inkOf('#6a7280'));
    },
    shadow: (ctx) => salverShadow(ctx, WALT_TRAY.x, WALT_TRAY.y, WALT_TRAY.r),
    path: waltTrayPath,
  },
  parts: {
    napkin: {
      box: { x: CX + 78, y: 128, w: 60, h: 92 },
      frames: 1,
      pivot: [CX + 88, 136],
      draw: (g, art) => {
        const s = new Sil(g, [NAPKIN_TAIL], { x: CX + 78, y: 128, w: 60, h: 92 });
        paintNapkinTail(s.g, art.secondary ?? '#f7f5ef', '#c8232c');
        s.finish(inkOf('#8a8aa0'), { inner: 0.3 });
      },
    },
  },
  draw(ctx, art, p, o) {
    drawWaiter(ctx, art, p, o.live);
    // the still art keeps his tray held up in front (in play it's its own piece)
    if (!o.noShield) {
      salverShadow(ctx, WALT_TRAY.x, WALT_TRAY.y, WALT_TRAY.r);
      drawWaltTray(ctx);
    }
  },
});

// ════════════════════════ Garlic Gary ════════════════════════
// Pale, garlicky skin with green-tinged toes, and a braid of garlic tied round the ankle for luck. In play green
// garlic fumes curl off his toes and drift up round him.

/** A garlic bulb at (x, y), papery and streaked purple. */
function garlicBulb(ctx: Ctx, x: number, y: number, s: number, rot: number, purple: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  const bulb: PathFn = (c) => {
    c.beginPath();
    c.moveTo(0, -18);
    c.bezierCurveTo(4, -12, 16, -6, 16, 4);
    c.bezierCurveTo(16, 14, 8, 18, 0, 18);
    c.bezierCurveTo(-8, 18, -16, 14, -16, 4);
    c.bezierCurveTo(-16, -6, -4, -12, 0, -18);
    c.closePath();
  };
  prop(ctx, [bulb], { x: -18, y: -20, w: 36, h: 40 }, (g, sil) => {
    sil.form({ base: '#f6f0e2', shadowTint: '#6a5a8a', ramp: 0.7, form: 0.5, formSize: 9, bevel: 0.4, rim: 0.5 });
    texture(g, 'grain', { x: -18, y: -20, w: 36, h: 40 }, 0.25, 1);
    // cloves: curved seams from the neck, streaked purple at the base
    for (const k of [-0.6, -0.2, 0.2, 0.6]) {
      crease(g, (c) => {
        c.moveTo(0, -14);
        c.quadraticCurveTo(k * 26, 0, k * 10, 18);
      }, 1.1, '#8a7a6a', 0.45, 0.4);
      softStroke(g, (c) => {
        c.moveTo(k * 12, 16);
        c.lineTo(k * 15, 6);
      }, rgba(purple, 0.4), 2.5, 1.5);
    }
    spec(g, -6, -2, 6, 4, 0.7, -0.7);
    // the roots at the bottom
    g.strokeStyle = rgba('#b8a888', 0.8);
    g.lineWidth = 0.8;
    for (let i = -3; i <= 3; i++) {
      g.beginPath();
      g.moveTo(i * 1.5, 17);
      g.lineTo(i * 2.2, 20);
      g.stroke();
    }
  }, '#5a4a3a', { w: 3.2 });
  ctx.restore();
}

/** Where the garlic braid's bulbs hang (x, y, scale, tilt). */
const BULBS: [number, number, number, number][] = [
  [CX - 50, 78, 1.0, 0.4],
  [CX - 26, 88, 1.1, 0.18],
  [CX, 92, 1.18, 0],
  [CX + 27, 88, 1.1, -0.18],
  [CX + 52, 78, 1.0, -0.4],
];

function garlicBraid(ctx: Ctx, purple: string): void {
  // the braided stems: a twisted cord of dried stalks hugging the ankle
  const cord = (c: Ctx) => {
    c.moveTo(CX - 62, 52);
    c.quadraticCurveTo(CX, 78, CX + 62, 52);
  };
  softStroke(ctx, cord, rgba('#2a1a08', 0.45), 12, 3);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.beginPath();
  cord(ctx);
  ctx.strokeStyle = '#5a4020';
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.beginPath();
  cord(ctx);
  ctx.strokeStyle = '#c8a86a';
  ctx.lineWidth = 7;
  ctx.stroke();
  // the twist
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    const x = CX - 62 + t * 124;
    const y = 52 + 2 * t * (1 - t) * 26;
    ctx.strokeStyle = rgba('#6a4a20', 0.75);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 3);
    ctx.lineTo(x + 3, y + 3);
    ctx.stroke();
    ctx.strokeStyle = rgba('#f0dca8', 0.7);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - 3.5, y - 1.5);
    ctx.lineTo(x + 1, y + 3);
    ctx.stroke();
  }
  ctx.restore();
  for (const [x, y, s, r] of BULBS) {
    contact(ctx, (c) => {
      c.beginPath();
      c.ellipse(x, y + 4, 14 * s, 16 * s, 0, 0, Math.PI * 2);
      c.fill();
    }, 0.4, 3, 4);
    garlicBulb(ctx, x, y + 2, s, r, purple);
  }
}

registerStyle('garlicgary', {
  rig: BARE_RIG,
  leg: { kind: 'denim', hw: 70, join: 'hem' },
  draw(ctx, art, p) {
    const fume = art.secondary ?? '#9bb34a';
    bareWith(ctx, { skin: art.skin, nails: art.nails, shadowTint: '#7a5a30', pores: 0.28 }, p, (g, f) => {
      // green-tinged toes and a faint sickly sheen where the fumes come off
      for (const t of f.toes) {
        const [x, y] = onToe(t, Math.PI / 2);
        const gr = g.createRadialGradient(x, y, 1, x, y - t.ry * 0.4, t.ry * 1.2);
        gr.addColorStop(0, rgba(fume, 0.55));
        gr.addColorStop(1, rgba(fume, 0));
        g.fillStyle = gr;
        g.fillRect(x - t.rx * 1.4, y - t.ry * 1.6, t.rx * 2.8, t.ry * 2);
      }
      softFill(g, (c) => {
        c.beginPath();
        c.ellipse(CX + 4, 200, 90, 22, 0, 0, Math.PI * 2);
      }, rgba(fume, 0.14), 10);
    });
    garlicBraid(ctx, '#8a4a8a');
  },
});

// ════════════════════════ Espresso Ed ════════════════════════
// Standing ankle-deep in a porcelain cup of espresso on its saucer, a coffee bean on the cup. In play steam curls
// off the crema and his jitters spill coffee drops.

const CUP_TOP = 126;

const cupBody: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 90, CUP_TOP);
  c.bezierCurveTo(CX - 90, 190, CX - 78, 232, CX - 46, 244);
  c.lineTo(CX + 46, 244);
  c.bezierCurveTo(CX + 78, 232, CX + 90, 190, CX + 90, CUP_TOP);
  c.ellipse(CX, CUP_TOP, 90, 14, 0, 0, Math.PI, true);
  c.closePath();
};
const cupHandle: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX + 84, 150);
  c.bezierCurveTo(CX + 128, 136, CX + 136, 196, CX + 76, 210);
  c.lineTo(CX + 80, 194);
  c.bezierCurveTo(CX + 112, 186, CX + 112, 158, CX + 88, 166);
  c.closePath();
};
const saucer: PathFn = (c) => {
  c.beginPath();
  c.ellipse(CX, 252, 112, 16, 0, 0, Math.PI * 2);
};

registerStyle('espresso', {
  contactY: 266,
  halfWidth: 112,
  leg: { kind: 'denim', hw: 70, join: 'hem' },
  draw(ctx, art, p) {
    const china = art.primary ?? '#fbf8f2';
    const coffee = art.secondary ?? '#5a2e14';
    // the cup, handle and saucer: glazed porcelain
    const box = { x: CX - 116, y: CUP_TOP - 16, w: 254, h: 150 };
    prop(ctx, [saucer, cupBody, cupHandle], box, (g, sil) => {
      sil.form({ base: china, shadowTint: '#5a4a6a', ramp: 0.7, form: 0.45, formSize: 22, bevel: 0.35, rim: 0.6 });
      // saucer: its well and rim
      within(g, saucer, () => {
        g.fillStyle = vgrad(g, 236, 268, [[0, shade(china, 0.02)], [1, mix(shade(china, -0.25), '#5a4a6a', 0.3)]]);
        g.fillRect(box.x, 236, box.w, 32);
        ao(g, CX, 246, 80, 7, 0.4, 0, '#4a3a40');
        spec(g, CX - 70, 248, 26, 3, 0.8, 0.05);
      });
      // the cup: a broad sheen, the brown band and the coffee bean
      piece(g, cupBody, box, 'plastic', china, { shadow: 0.45, spec: false });
      within(g, cupBody, () => {
        g.fillStyle = vgrad(g, 200, 212, [[0, shade(coffee, 0.1)], [1, shade(coffee, -0.2)]]);
        g.fillRect(box.x, 202, box.w, 6);
        spec(g, CX - 54, 170, 14, 40, 0.75, 0.1);
        spec(g, CX + 66, 176, 6, 30, 0.35, 0.1, LIGHT.rim);
        // the bean
        const bean = ell(CX + 8, 172, 13, 17, 0.3);
        piece(g, bean, { x: CX - 6, y: 154, w: 28, h: 36 }, 'plastic', '#6a3818', { shadow: 0.4 });
        softStroke(g, (c) => {
          c.moveTo(CX + 4, 158);
          c.bezierCurveTo(CX + 14, 166, CX + 2, 176, CX + 12, 186);
        }, rgba('#2a1206', 0.9), 2.4, 0.6);
      });
      piece(g, cupHandle, box, 'plastic', china, { shadow: 0.45 });
      // the espresso's surface: crema swirling round the ankle
      const surf = ell(CX, CUP_TOP, 86, 11);
      within(g, surf, () => {
        g.fillStyle = vgrad(g, CUP_TOP - 11, CUP_TOP + 11, [[0, shade(coffee, -0.35)], [0.5, coffee], [1, '#c8884a']]);
        g.fillRect(box.x, CUP_TOP - 12, box.w, 24);
        texture(g, 'speckle', box, 0.3, 1, 'soft-light');
        for (const [x, w] of [[-58, 18], [-24, 26], [30, 22], [60, 14]] as const) {
          softStroke(g, (c) => {
            c.moveTo(CX + x, CUP_TOP + 2);
            c.quadraticCurveTo(CX + x + w / 2, CUP_TOP + 6, CX + x + w, CUP_TOP + 1);
          }, rgba('#e8b878', 0.7), 2, 1);
        }
      });
      // the rim's glaze line
      g.strokeStyle = rgba('#ffffff', 0.8);
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(CX, CUP_TOP, 89, 13, 0, Math.PI * 1.05, Math.PI * 1.6);
      g.stroke();
      // where the leg goes into the coffee: a ring of crema
      ao(g, CX, CUP_TOP + 2, 52, 7, 0.45, 0, '#1a0804');
    }, inkOf('#8a7a7a'));
    // the foot comes up out of the coffee: drawn over the cup, cut at the waterline round the ankle
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-60, -40);
    ctx.lineTo(280, -40);
    ctx.lineTo(280, CUP_TOP);
    ctx.lineTo(CX + 62, CUP_TOP);
    ctx.ellipse(CX, CUP_TOP, 62, 8, 0, 0, Math.PI, false);
    ctx.lineTo(-60, CUP_TOP);
    ctx.closePath();
    ctx.clip();
    // the foot (only its top shows above the coffee)
    bareWith(ctx, { skin: art.skin, nails: art.nails }, p, (g) => {
      // wet and coffee-stained where it goes into the cup
      g.fillStyle = vgrad(g, CUP_TOP - 30, CUP_TOP + 4, [[0, rgba(coffee, 0)], [1, rgba(coffee, 0.55)]]);
      g.fillRect(-20, CUP_TOP - 30, 260, 40);
    });
    ctx.restore();
    // a crema ring where the ankle meets the coffee
    softStroke(ctx, (c) => c.ellipse(CX, CUP_TOP + 1, 60, 7.5, 0, 0.1, Math.PI - 0.1), rgba('#e8b878', 0.8), 2.5, 1);
  },
});

// ════════════════════════ Saucy Sal ════════════════════════
// Dipped ankle-deep in marinara: glossy sauce over the toes, basil and oregano in it, drips hanging off the toes.
// In play the drips swell and fall, and splash when she lands.

/** Drips hanging off the toes at a pose: [toe, length, width]. */
const SAL_DRIPS: [number, number, number][] = [
  [0, 18, 4.5],
  [1, 30, 5],
  [2, 14, 4],
  [3, 36, 5.5],
  [4, 24, 6.5],
];

registerStyle('saucysal', {
  rig: BARE_RIG,
  contactY: 262,
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 24 },
  draw(ctx, art, p) {
    const sauce = art.primary ?? '#c8231b';
    const basil = art.secondary ?? '#3f9a3a';
    const f = paintBare(ctx, { skin: art.skin, nails: art.nails }, p);
    const g = f.sil.g;
    const r = rng(hashStr('saucysal'));
    // the dip line: a wavy edge across the foot, sauce below it (painted inside the foot's silhouette)
    const line = (c: Ctx) => {
      c.moveTo(-40, 142);
      for (let i = 0; i <= 10; i++) {
        const x = CX - 110 + i * 22;
        const y = 138 + Math.sin(i * 1.7) * 7 + (i % 3) * 3;
        c.quadraticCurveTo(x - 11, y + 8, x, y);
      }
      c.lineTo(280, 140);
    };
    const dipped: PathFn = (c) => {
      c.beginPath();
      line(c);
      c.lineTo(280, 300);
      c.lineTo(-40, 300);
      c.closePath();
    };
    within(g, dipped, () => {
      g.fillStyle = vgrad(g, 130, 270, [[0, shade(sauce, 0.12)], [0.5, sauce], [1, shade(sauce, -0.35)]]);
      g.fillRect(-40, 120, 320, 180);
      texture(g, 'speckle', f.box, 0.2, 1, 'soft-light');
      // the toes still show through as glossy lumps
      for (const t of f.toes) {
        const [x, y] = onToe(t, Math.PI / 2);
        spec(g, x - t.rx * 0.3, y - t.ry * 0.9, t.rx * 0.55, t.ry * 0.35, 0.7, t.rot - 0.4);
        ao(g, x + t.rx * 0.3, y - t.ry * 0.1, t.rx * 0.7, t.ry * 0.5, 0.25, 0, '#3a0408');
      }
      // herbs: oregano flecks and pepper
      for (let i = 0; i < 60; i++) {
        g.fillStyle = r() < 0.7 ? rgba('#2f5a1a', 0.8) : rgba('#1a0a06', 0.6);
        g.beginPath();
        g.ellipse(-10 + r() * 240, 150 + r() * 110, 0.8 + r() * 1.8, 0.6 + r(), r() * 3, 0, Math.PI * 2);
        g.fill();
      }
    });
    // the dip line: a wet lip of sauce
    softStroke(g, line, rgba('#3a0408', 0.5), 4, 2);
    g.save();
    g.lineCap = 'round';
    g.beginPath();
    line(g);
    g.strokeStyle = rgba(shade(sauce, 0.5), 0.8);
    g.lineWidth = 1.6;
    g.stroke();
    g.restore();
    // splashes above the line
    for (let i = 0; i < 9; i++) {
      const x = CX - 80 + r() * 160;
      const y = 70 + r() * 60;
      const s = 2 + r() * 3.5;
      piece(g, ell(x, y, s, s * 0.9), { x: x - s, y: y - s, w: s * 2, h: s * 2 }, 'sauce', sauce, { shadow: 0.3 });
      glint(g, x - s * 0.35, y - s * 0.35, s * 0.5, 0.8);
    }
    // a basil leaf stuck to the top of the foot
    const leaf: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX + 18, 182);
      c.bezierCurveTo(CX + 30, 160, CX + 58, 156, CX + 70, 166);
      c.bezierCurveTo(CX + 60, 184, CX + 36, 192, CX + 18, 182);
      c.closePath();
    };
    piece(g, leaf, { x: CX + 16, y: 154, w: 56, h: 40 }, 'plastic', basil, { shadow: 0.45 });
    crease(g, (c) => {
      c.moveTo(CX + 20, 181);
      c.quadraticCurveTo(CX + 44, 172, CX + 68, 166);
    }, 1.2, shade(basil, -0.5), 0.6, 0.3);
    // the drips: parts of the silhouette, glossy
    const drips = SAL_DRIPS.map(([i, len, w]) => {
      const t = f.toes[i];
      const [x, y] = onToe(t, Math.PI / 2 + 0.25);
      return { path: dripPath(x, y - 5, len, w), x, y, len, w };
    });
    for (const d of drips) {
      within(g, d.path, () => {
        g.fillStyle = vgrad(g, d.y - 5, d.y + d.len + d.w, [[0, sauce], [1, shade(sauce, -0.3)]]);
        g.fillRect(d.x - d.w * 2, d.y - 6, d.w * 4, d.len + d.w * 3);
      });
      glint(g, d.x - d.w * 0.35, d.y + d.len - d.w * 0.2, d.w * 0.45, 0.95);
      spec(g, d.x - d.w * 0.3, d.y + d.len * 0.5, d.w * 0.25, d.len * 0.3, 0.6, 0);
    }
    finishDrips(ctx, f, drips.map((d) => d.path), sauce);
  },
});

/** Put Sal on the target with her drips in the silhouette: the foot's paint layer, clipped to foot + drips. */
function finishDrips(ctx: Ctx, f: BareFoot, drips: PathFn[], sauce: string): void {
  const s = new Sil(ctx, [...bareParts(f.toes), ...drips], f.box);
  s.g.save();
  s.g.setTransform(1, 0, 0, 1, 0, 0);
  s.g.drawImage(f.sil.g.canvas, 0, 0);
  s.g.restore();
  s.finish(inkOf(mix(sauce, '#f6d3bf', 0.15)), { openTop: f.top + 1.5 });
}

// ════════════════════════ Antenna Andy ════════════════════════
// A grey canvas high-top with a yellow rubber toe and a receiver dome on it; two telescopic antennas with yellow
// tips stick out of the dome. In play the antennas wobble on their springs and signal rings pulse off the tips.

const ANT = { topW: 60, ballW: 96, toeY: 240 };
/** The antennas' roots (on the dome) and tips, design space. */
export const ANT_ROOT: [number, number] = [CX, 214];
export const ANT_TIPS: [number, number][] = [
  [CX - 112, 58],
  [CX + 112, 58],
];

function antennaRod(g: Ctx, side: -1 | 1, yellow: string): void {
  const [rx, ry] = ANT_ROOT;
  const [tx, ty] = ANT_TIPS[side < 0 ? 0 : 1];
  // telescopic sections: thicker at the root
  const seg = [
    [0, 0.45, 4.6],
    [0.45, 0.8, 3.6],
    [0.8, 1, 2.8],
  ] as const;
  g.save();
  g.lineCap = 'round';
  for (const [a, b, w] of seg) {
    const x0 = rx + (tx - rx) * a;
    const y0 = ry + (ty - ry) * a;
    const x1 = rx + (tx - rx) * b;
    const y1 = ry + (ty - ry) * b;
    g.strokeStyle = '#2a2e36';
    g.lineWidth = w + 2.6;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
    const gr = g.createLinearGradient(x0 - 3, y0, x0 + 3, y0 + 3);
    gr.addColorStop(0, '#f4f6fa');
    gr.addColorStop(0.5, '#a8b0bc');
    gr.addColorStop(1, '#5a626e');
    g.strokeStyle = gr;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
    g.strokeStyle = rgba('#ffffff', 0.7);
    g.lineWidth = w * 0.3;
    g.beginPath();
    g.moveTo(x0 - 0.8, y0 - 0.8);
    g.lineTo(x1 - 0.8, y1 - 0.8);
    g.stroke();
  }
  g.restore();
  // the ball tip
  prop(g, [ell(tx, ty, 9.5, 9.5)], { x: tx - 11, y: ty - 11, w: 22, h: 22 }, (pg, sil) => {
    sil.form({ base: yellow, shadowTint: '#6a3a08', ramp: 0.8, form: 0.5, formSize: 5, bevel: 0.5, rim: 0.6 });
    glint(pg, tx - 2.5, ty - 2.5, 3, 1);
  }, inkOf(yellow), { w: 3 });
}

function drawAntenna(ctx: Ctx, art: FootArt, p: Pose, live: boolean): void {
  const grey = art.primary ?? '#5d6a7a';
  const yellow = art.secondary ?? '#ffcf3a';
  const flex = Math.max(0, p.curl);
  const upper = upperPath(ANT, flex);
  const sole = solePath(ANT, flex, 22, 176, 4);
  const box = { x: CX - 104, y: -10, w: 208, h: 280 };
  const sil = new Sil(ctx, [sole, upper], box);
  const g = sil.g;
  const t = tones('canvas', grey);
  // white rubber sole with a yellow stripe
  within(g, sole, () => {
    g.fillStyle = vgrad(g, 176, 266, [[0, '#f8f6f0'], [0.7, '#e8e4da'], [1, '#9a98a8']]);
    g.fillRect(box.x, 170, box.w, 100);
    texture(g, 'rubber', box, 0.3);
    g.fillStyle = yellow;
    g.fillRect(box.x, 250 - flex * 5, box.w, 4);
    g.fillStyle = rgba('#3a3a4a', 0.45);
    g.fillRect(box.x, 258 - flex * 5, box.w, 8);
    spec(g, CX - 50, 240, 40, 6, 0.5, 0.05);
  });
  // canvas upper
  within(g, upper, () => {
    g.fillStyle = vgrad(g, 0, 240, [[0, t.hi], [0.5, t.mid], [1, t.lo]]);
    g.fillRect(box.x, -10, box.w, 260);
    texture(g, 'canvas', box, 0.42, 1.25);
  });
  lobe(g, upper, { x: box.x, y: -20, w: box.w, h: 300 }, -30, 0, t.lo, 0.6, 16, 0.25);
  // the yellow rubber toe cap and side panels
  const cap: PathFn = (c) => {
    c.beginPath();
    c.ellipse(CX, 240 - flex * 6, 94, 58 - flex * 4, 0, Math.PI, 0);
    c.lineTo(CX + 94, 262);
    c.lineTo(CX - 94, 262);
    c.closePath();
  };
  within(g, upper, () => {
    piece(g, cap, box, 'plastic', yellow, { shadow: 0.4 });
    for (const s of [-1, 1]) {
      const panel: PathFn = (c) => {
        c.beginPath();
        c.moveTo(CX + s * 100, 120);
        c.quadraticCurveTo(CX + s * 70, 150, CX + s * 74, 200);
        c.lineTo(CX + s * 110, 200);
        c.closePath();
      };
      piece(g, panel, box, 'plastic', yellow, { shadow: 0.35 });
    }
  });
  // lacing up the front
  const EY = [24, 46, 68, 90, 112];
  for (const y of EY) for (const s of [-1, 1]) eyelet(g, CX + s * 24, y, 3.6);
  for (let i = EY.length - 1; i > 0; i--) {
    laceRun(g, CX - 24, EY[i], CX + 24, EY[i - 1], '#e8eaf0', 4.6);
    laceRun(g, CX + 24, EY[i], CX - 24, EY[i - 1], '#e8eaf0', 4.6);
  }
  // the receiver dome on the toe, with a red record light
  const dome: PathFn = (c) => {
    c.beginPath();
    c.ellipse(CX, 216 - flex * 5, 24, 15, 0, Math.PI, 0);
    c.lineTo(CX + 24, 222 - flex * 5);
    c.lineTo(CX - 24, 222 - flex * 5);
    c.closePath();
  };
  piece(g, dome, box, 'chrome', '#3a3e48', { shadow: 0.5 });
  piece(g, ell(CX, 208 - flex * 5, 4, 4), box, 'plastic', '#ff3030', { shadow: 0.3 });
  glint(g, CX - 1.4, 206.6 - flex * 5, 2.4, 1);
  finishLight(sil, grey);
  sil.finish(inkOf(grey), { openTop: -5 });
  if (!live) for (const s of [-1, 1] as const) antennaRod(ctx, s, yellow);
}

registerStyle('antenna', {
  contactY: 262,
  rig: SHOE_RIG,
  leg: { kind: 'denim', hw: 70, join: 'hem' },
  parts: Object.fromEntries(([-1, 1] as const).map((s, i) => {
    const [tx, ty] = ANT_TIPS[i];
    const x0 = Math.min(tx, ANT_ROOT[0]) - 12;
    const x1 = Math.max(tx, ANT_ROOT[0]) + 12;
    return [
      i ? 'antR' : 'antL',
      {
        box: { x: x0, y: ty - 12, w: x1 - x0, h: ANT_ROOT[1] - ty + 18 },
        frames: 1,
        pivot: ANT_ROOT,
        draw: (g: Ctx, art: FootArt) => antennaRod(g, s, art.secondary ?? '#ffcf3a'),
      },
    ];
  })),
  draw(ctx, art, p, o) {
    drawAntenna(ctx, art, p, o.live);
  },
});

// ════════════════════════ Parkour Pablo ════════════════════════
// Five-toe running shoes: stretch mesh over the bare foot's shape, orange rubber toe pads, a hook-and-loop strap and
// a reflective flash. In play speed streaks trail off his sidesteps and grit kicks up when he lands.

registerStyle('parkour', {
  rig: BARE_RIG,
  contactY: 266,
  leg: { kind: 'knit', hw: 52, join: 'blend', fade: 18 },
  draw(ctx, art, p) {
    const black = art.primary ?? '#2b2e36';
    const orange = art.secondary ?? '#ff7a1a';
    const f = paintBare(ctx, { skin: black, nails: null, shadowTint: '#0a0a18', pores: 0, detail: 0.4, toe: 1.04 }, p);
    const g = f.sil.g;
    // the mesh: a fine knit over the whole shoe, cool sheen
    texture(g, 'knit', f.box, 0.35, 1.1);
    texture(g, 'speckle', f.box, 0.12, 1, 'soft-light');
    spec(g, CX - 30, 80, 50, 30, 0.18, -0.5, LIGHT.rim);
    // orange rubber pads wrapping each toe tip, and the sole edge under the ball
    for (const t of f.toes) {
      const pad: PathFn = (c) => {
        c.beginPath();
        c.ellipse(t.cx, t.cy + t.ry * 0.25, t.rx * 1.02, t.ry * 0.8, t.rot, 0.05 * Math.PI, 0.95 * Math.PI);
        c.closePath();
      };
      const toe = ell(t.cx, t.cy, t.rx, t.ry, t.rot);
      within(g, toe, () => {
        piece(g, pad, f.box, 'rubber', orange, { shadow: 0.4 });
        // grip siping on the pads
        g.strokeStyle = rgba(shade(orange, -0.45), 0.5);
        g.lineWidth = 1;
        for (let k = -2; k <= 2; k++) {
          const [x, y] = onToe(t, Math.PI / 2 + k * 0.22);
          g.beginPath();
          g.moveTo(x, y - 7);
          g.lineTo(x, y - 2);
          g.stroke();
        }
        const [x, y] = onToe(t, Math.PI / 2 - 0.5);
        spec(g, x, y - 4, t.rx * 0.4, t.ry * 0.15, 0.55, t.rot - 0.6);
      });
    }
    // the sole edge round the outside of the foot
    softStroke(g, (c) => {
      c.moveTo(CX - 96, 140);
      c.bezierCurveTo(CX - 100, 180, CX - 92, 204, CX - 80, 214);
      c.moveTo(CX + 104, 146);
      c.bezierCurveTo(CX + 108, 186, CX + 104, 206, CX + 96, 214);
    }, rgba(orange, 0.9), 6, 0.6);
    // the strap: orange webbing across the instep with a hook-and-loop tab
    const strap: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 92, 92);
      c.bezierCurveTo(CX - 30, 74, CX + 40, 84, CX + 98, 104);
      c.lineTo(CX + 100, 128);
      c.bezierCurveTo(CX + 40, 108, CX - 30, 98, CX - 92, 116);
      c.closePath();
    };
    piece(g, strap, f.box, 'canvas', orange, { shadow: 0.5 });
    stitches(g, (c) => {
      c.moveTo(CX - 88, 96);
      c.bezierCurveTo(CX - 30, 79, CX + 40, 89, CX + 96, 108);
    }, rgba('#ffd2a8', 0.8), 1.1, 3, 3);
    const tab = (c: Ctx) => {
      c.beginPath();
      c.roundRect(CX + 34, 84, 46, 28, 6);
    };
    piece(g, tab, f.box, 'rubber', '#1a1c22', { shadow: 0.45 });
    // the reflective flash on the outside
    const flash: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 92, 160);
      c.lineTo(CX - 54, 146);
      c.lineTo(CX - 62, 160);
      c.lineTo(CX - 30, 150);
      c.lineTo(CX - 88, 178);
      c.closePath();
    };
    within(g, flash, () => {
      g.fillStyle = hgradFlash(g);
      g.fillRect(CX - 100, 140, 80, 40);
    });
    // the speed-stripe sock top (the old Pablo's stripes) at the ankle
    for (const [y, col] of [[-2, orange], [12, '#1a1c22'], [24, orange]] as const) {
      g.fillStyle = rgba(col, 0.9);
      g.beginPath();
      g.moveTo(CX - 56, y);
      g.quadraticCurveTo(CX, y + 8, CX + 56, y);
      g.lineTo(CX + 56, y + 7);
      g.quadraticCurveTo(CX, y + 15, CX - 56, y + 7);
      g.fill();
    }
    texture(g, 'knit', { x: CX - 60, y: -6, w: 120, h: 40 }, 0.4, 1.4);
    f.sil.finish(inkOf(black), { openTop: f.top + 1.5 });
  },
});

function hgradFlash(g: Ctx): CanvasGradient {
  const gr = g.createLinearGradient(CX - 100, 150, CX - 30, 170);
  gr.addColorStop(0, '#e8f0f8');
  gr.addColorStop(0.5, '#a8b8c8');
  gr.addColorStop(1, '#f4f8ff');
  return gr;
}

export { RMAT };
