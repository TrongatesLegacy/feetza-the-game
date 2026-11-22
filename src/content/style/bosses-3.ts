// Mini-bosses in the style kit (batch C), part 3.
// - THE HEAD WAITER: a mirror-polished black patent oxford under a crisp white buttoned spat, a satin bow tie, a
//   starched napkin over its arm and a silver cloche on a tray (in play the tray sways, polish glints).
// - SANDCASTLE SAM: a sandy bare foot with a real sandcastle built on it (keep, towers, gate, a red pennant, shells,
//   a starfish on the big toe). In play the pennant flutters and sand trickles off the castle.
// - SHORT-ORDER SHOE: a white kitchen clog spattered with sauce and grease on a chequered sole, the order ticket
//   clipped to it. In play the ticket flaps, the grease sizzles and smokes.
// - ICE SKATE IVY: a white figure skate with lilac laces, a marabou trim, ivy winding round it and a gleaming blade.
//   In play the blade glints, frost mist rolls off it and landings throw ice shavings.
// - UFO TOE: one huge green alien toe, spotted and glossy, antennae with glowing tips and its pet saucer orbiting.
// - DOUGH BOY: a soft, floury, proving-dough foot with a face; its eyes blink and follow your peel, flour puffs off it.

import type { FootArt } from '../../data/feet';
import { CX } from '../../art/feetCommon';
import { bareOutline, paintBare } from '../../art/style/bare';
import { bareParts, onToe, poseToes, restToes } from '../../art/style/anatomy';
import { LIGHT, type PathFn, type Pose, ao, crease, glint, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil, lobe } from '../../art/style/sil';
import { type PartDef, registerStyle } from '../../art/style/registry';
import { beadEye, blotches, contact, eyelet, laceRun, rivet, stitches } from '../../art/style/details';
import { LX, LY, clip, fill, glowDot, glowFinish, heatLayer, lightAll, lin, rad, streak } from '../../art/style/kit-bosses';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';

type Opts = { live: boolean; emissive?: boolean; heat?: boolean };

const ell = (x: number, y: number, rx: number, ry: number, rot = 0): PathFn => (c) => {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
};

function raised(g: Ctx, path: PathFn, f: string | CanvasGradient, a = 0.45): void {
  contact(g, (c) => {
    path(c);
    c.fill();
  }, a);
  fill(g, path, f);
}

/** A part drawn as its own small silhouette. */
function soloPart(box: { x: number; y: number; w: number; h: number }, pivot: [number, number], paths: PathFn[], paintIt: (g: Ctx, art: FootArt) => void, ink: (art: FootArt) => string, frames = 1): PartDef {
  return {
    box,
    frames,
    pivot,
    draw: (g, art) => {
      const s = new Sil(g, paths, box);
      paintIt(s.g, art);
      s.edge(rgba('#000000', 0.3), 8, LX * 5, LY * 5);
      s.edge(rgba(LIGHT.rim, 0.5), 2.5, LX * 3, LY * 3);
      s.finish(ink(art), { inner: 0.3 });
    },
  };
}

// ════════════════════════════ THE HEAD WAITER ════════════════════════════

export const TRAY = { x: CX + 92, y: 112 };

const waiterUpper = (flex: number): PathFn => (c) => {
  const b = 240 - flex * 5;
  c.beginPath();
  c.moveTo(CX - 64, -6);
  c.bezierCurveTo(CX - 66, 50, CX - 98, 100, CX - 98, 160);
  c.bezierCurveTo(CX - 98, b - 14, CX - 60, b, CX, b);
  c.bezierCurveTo(CX + 60, b, CX + 100, b - 14, CX + 100, 160);
  c.bezierCurveTo(CX + 100, 100, CX + 66, 50, CX + 64, -6);
  c.closePath();
};

const waiterSole = (flex: number): PathFn => (c) => {
  const b = 258 - flex * 5;
  c.beginPath();
  c.moveTo(CX - 100, 180);
  c.bezierCurveTo(CX - 104, b - 6, CX - 60, b, CX, b);
  c.bezierCurveTo(CX + 60, b, CX + 106, b - 6, CX + 102, 180);
  c.closePath();
};

/** The spat: white canvas over the instep, ending in a curved edge over the shoe. */
const spatPath: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 66, -8);
  c.lineTo(CX + 66, -8);
  c.bezierCurveTo(CX + 70, 50, CX + 98, 96, CX + 98, 140);
  c.bezierCurveTo(CX + 60, 162, CX + 20, 150, CX, 132);
  c.bezierCurveTo(CX - 20, 150, CX - 60, 162, CX - 98, 140);
  c.bezierCurveTo(CX - 98, 96, CX - 70, 50, CX - 66, -8);
  c.closePath();
};

const trayPaths = (): PathFn[] => {
  const { x, y } = TRAY;
  return [
    ell(x + 22, y, 44, 10),
    (c) => {
      c.beginPath();
      c.moveTo(x - 10, y - 4);
      c.bezierCurveTo(x - 10, y - 40, x + 54, y - 40, x + 54, y - 4);
      c.closePath();
    },
    ell(x + 22, y - 36, 5, 5),
  ];
};

function paintTray(g: Ctx): void {
  const { x, y } = TRAY;
  const [plate, dome, knob] = trayPaths();
  raised(g, plate, lin(g, x - 22, y - 10, x + 66, y + 10, [
    [0, '#ffffff'],
    [0.3, '#b8c0cc'],
    [0.55, '#f4f6fa'],
    [1, '#5a6270'],
  ]), 0.5);
  raised(g, dome, lin(g, x - 10, y - 40, x + 54, y, [
    [0, '#ffffff'],
    [0.25, '#e0e6ee'],
    [0.5, '#8a929e'],
    [0.75, '#d8dee8'],
    [1, '#4a5260'],
  ]), 0.4);
  clip(g, dome, () => {
    spec(g, x + 6, y - 24, 10, 6, 0.9, -0.6);
    g.fillStyle = rgba('#2a1d30', 0.25);
    g.fillRect(x - 12, y - 14, 70, 4);
  });
  fill(g, knob, rad(g, x + 20, y - 38, 0.5, x + 22, y - 36, 6, [
    [0, '#ffffff'],
    [1, '#6a7280'],
  ]));
  glint(g, x + 4, y - 26, 5, 0.95);
}

function drawWaiter(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const black = art.primary ?? '#1c1c24';
  const white = art.secondary ?? '#f4f2ee';
  const flex = Math.max(0, p.curl);
  const upper = waiterUpper(flex);
  const sole = waiterSole(flex);
  const napkin: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 66, 30);
    c.lineTo(CX - 100, 36);
    c.lineTo(CX - 116, 130);
    c.lineTo(CX - 96, 124);
    c.lineTo(CX - 84, 140);
    c.lineTo(CX - 74, 60);
    c.closePath();
  };
  const box = { x: CX - 130, y: -8, w: 260, h: 272 };
  const sil = new Sil(ctx, [sole, upper, napkin, ...(o.live ? [] : trayPaths())], box);
  const g = sil.g;
  if (o.heat) {
    heatLayer(sil, box, { seed: 91, y0: 262, y1: 10 });
    return;
  }
  // patent leather: near-black, mirror-glossy
  sil.form({ base: black, shadowTint: '#000008', ramp: 1, form: 0.5, formSize: 24, bevel: 0.55, rim: 0.7 });
  clip(g, sole, () => {
    g.fillStyle = lin(g, 0, 230, 0, 260, [
      [0, '#2a1e18'],
      [1, '#060404'],
    ]);
    g.fillRect(box.x, 170, box.w, 100);
    stitches(g, (c) => {
      c.moveTo(CX - 98, 228 - flex * 5);
      c.bezierCurveTo(CX - 60, 250 - flex * 5, CX + 60, 250 - flex * 5, CX + 100, 228 - flex * 5);
    }, rgba('#8a6a4a', 0.7), 1.4, 3, 3);
  });
  clip(g, upper, () => {
    g.fillStyle = lin(g, CX - 100, 120, CX + 100, 250, [
      [0, '#4a4a5a'],
      [0.3, black],
      [1, '#000004'],
    ]);
    g.fillRect(box.x, 100, box.w, 160);
    // reflections: a window, the room's light, a long hot streak down the toe
    streak(g, (c) => {
      c.moveTo(CX - 84, 150);
      c.bezierCurveTo(CX - 80, 200, CX - 40, 228, CX + 10, 230);
    }, 4, 0.6);
    softFill(g, (c) => {
      c.beginPath();
      c.roundRect(CX - 40, 186, 22, 14, 3);
      c.roundRect(CX - 14, 186, 22, 14, 3);
    }, rgba('#ffffff', 0.4), 1.5);
    spec(g, CX + 60, 200, 26, 8, 0.25, -0.6, '#c8d8ff');
    // broguing: a row of punched holes round the toe cap
    for (let i = 0; i <= 20; i++) {
      const a = Math.PI + 0.25 + (i / 20) * (Math.PI - 0.5);
      const x = CX + Math.cos(a) * 80;
      const y = 236 - flex * 5 + Math.sin(a) * 46;
      fill(g, ell(x, y, 1.8, 1.8), '#000000');
      fill(g, ell(x - 0.4, y - 0.6, 0.9, 0.9), rgba('#ffffff', 0.35));
    }
    crease(g, (c) => c.ellipse(CX, 236 - flex * 5, 86, 52, 0, Math.PI + 0.2, -0.2), 1.6, '#000000', 0.7, 0.2);
  });
  // laces showing below the spat
  laceRun(g, CX - 20, 150, CX + 20, 160, '#1a1a22', 4);
  laceRun(g, CX + 20, 150, CX - 20, 160, '#1a1a22', 4);
  // the spat: starched white canvas, side-buttoned
  contact(g, (c) => {
    spatPath(c);
    c.fill();
  }, 0.55, 3, 5);
  clip(g, spatPath, () => {
    g.fillStyle = lin(g, CX - 90, 0, CX + 98, 140, [
      [0, '#ffffff'],
      [0.5, white],
      [1, mix(shade(white, -0.3), '#5a5a80', 0.25)],
    ]);
    g.fillRect(box.x, -10, box.w, 170);
    texture(g, 'canvas', box, 0.25, 1.1);
    stitches(g, (c) => {
      c.moveTo(CX - 92, 132);
      c.bezierCurveTo(CX - 60, 150, CX - 20, 142, CX, 126);
      c.bezierCurveTo(CX + 20, 142, CX + 60, 150, CX + 92, 132);
    }, rgba('#9a98a8', 0.7), 1.3, 3, 2.5);
    // a crisp pressed crease
    softStroke(g, (c) => {
      c.moveTo(CX - 10, -8);
      c.lineTo(CX - 6, 110);
    }, rgba('#8a88a0', 0.25), 3, 2);
  });
  for (let i = 0; i < 4; i++) {
    const bx = CX + 58 + i * 7;
    const by = 30 + i * 26;
    fill(g, ell(bx + 1, by + 1.5, 5, 5), rgba('#000000', 0.25));
    fill(g, ell(bx, by, 4.6, 4.6), rad(g, bx - 1.5, by - 1.5, 0.3, bx, by, 5, [
      [0, '#ffffff'],
      [1, '#b8b0c8'],
    ]));
  }
  // the bow tie: black satin
  const bow: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX, 46);
    c.bezierCurveTo(CX - 20, 26, CX - 38, 28, CX - 38, 46);
    c.bezierCurveTo(CX - 38, 64, CX - 20, 66, CX, 46);
    c.bezierCurveTo(CX + 20, 26, CX + 38, 28, CX + 38, 46);
    c.bezierCurveTo(CX + 38, 64, CX + 20, 66, CX, 46);
    c.closePath();
  };
  raised(g, bow, lin(g, CX - 38, 30, CX + 38, 64, [
    [0, '#4a4a58'],
    [0.4, '#14141c'],
    [0.6, '#3a3a48'],
    [1, '#06060a'],
  ]), 0.55);
  raised(g, ell(CX, 46, 7, 9), lin(g, CX - 7, 38, CX + 7, 54, [
    [0, '#4a4a58'],
    [1, '#06060a'],
  ]), 0.5);
  spec(g, CX - 22, 40, 8, 3, 0.5, -0.3);
  // the napkin over the arm
  clip(g, napkin, () => {
    g.fillStyle = lin(g, CX - 116, 30, CX - 70, 140, [
      [0, '#ffffff'],
      [1, '#b8b8d0'],
    ]);
    g.fillRect(CX - 120, 26, 60, 120);
    texture(g, 'canvas', box, 0.2);
    for (const k of [0, 1, 2]) softStroke(g, (c) => {
      c.moveTo(CX - 74 - k * 10, 40);
      c.lineTo(CX - 94 - k * 6, 128);
    }, rgba('#6a6a90', 0.25), 2, 1.5);
  });
  if (!o.live) paintTray(g);
  glint(g, CX - 64, 196, 5, 0.95);
  lightAll(sil, 0.36, 18, 0.65);
  sil.finish(inkOf('#3a3a48'), { openTop: -5 });
}

registerStyle('headwaiter', {
  contactY: 258,
  halfWidth: 100,
  rig: { from: 176, to: 196 },
  leg: { kind: 'wool', hw: 66, join: 'hem' },
  parts: {
    tray: soloPart({ x: TRAY.x - 30, y: TRAY.y - 48, w: 104, h: 66 }, [TRAY.x - 6, TRAY.y], trayPaths(), (g) => paintTray(g), () => '#2a2e38'),
  },
  draw(ctx, art, p, o) {
    drawWaiter(ctx, art, p, o);
  },
});

// ════════════════════════════ SANDCASTLE SAM ════════════════════════════

export const PENNANT = { x: CX + 82, y: 46 };

const castleParts: PathFn[] = [
  // the keep
  (c) => {
    c.beginPath();
    c.moveTo(CX - 38, 132);
    c.lineTo(CX - 34, 40);
    for (let i = 0; i < 5; i++) {
      const x = CX - 34 + i * 17;
      c.lineTo(x, 26);
      c.lineTo(x + 9, 26);
      c.lineTo(x + 9, 40);
      c.lineTo(x + 17, 40);
    }
    c.lineTo(CX + 38, 132);
    c.closePath();
  },
  // side towers
  ...[-1, 1].map(
    (s): PathFn =>
      (c) => {
        const x = CX + s * 66;
        c.beginPath();
        c.moveTo(x - 20, 146);
        c.lineTo(x - 17, 72);
        for (let i = 0; i < 3; i++) {
          const xx = x - 17 + i * 12;
          c.lineTo(xx, 60);
          c.lineTo(xx + 6, 60);
          c.lineTo(xx + 6, 72);
          c.lineTo(xx + 12, 72);
        }
        c.lineTo(x + 20, 146);
        c.closePath();
      },
  ),
  // the wall between them
  (c) => {
    c.beginPath();
    c.roundRect(CX - 80, 104, 160, 46, 6);
  },
];

function sandPaint(g: Ctx, sand: string, box: { x: number; y: number; w: number; h: number }, seed: number): void {
  g.fillStyle = lin(g, box.x, box.y, box.x + box.w, box.y + box.h, [
    [0, shade(sand, 0.15)],
    [0.5, sand],
    [1, shade(sand, -0.35)],
  ]);
  g.fillRect(box.x, box.y, box.w, box.h);
  texture(g, 'speckle', box, 0.55, 1);
  blotches(g, box, shade(sand, -0.3), 0.35, 5, 0.6, 0.1, seed);
  blotches(g, box, '#ffffff', 0.25, 3, 0.72, 0.06, seed + 1);
}

function drawSandcastle(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const sand = art.primary ?? '#f0cf8e';
  const red = art.secondary ?? '#e5242f';
  if (o.heat) {
    const f = paintBare(ctx, { skin: art.skin, nails: null }, p);
    f.sil.g.clearRect(-3000, -3000, 6000, 6000);
    heatLayer(f.sil, f.box, { seed: 93, y0: 270, y1: 0 });
    return;
  }
  const f = paintBare(ctx, { skin: art.skin, shadowTint: '#7a3a10', pores: 0.3 }, p);
  const g = f.sil.g;
  // sand stuck all over the foot, thicker and wetter towards the toes
  blotches(g, { x: f.box.x, y: 140, w: f.box.w, h: 140 }, sand, 0.7, 4, 0.6, 0.1, 95);
  blotches(g, { x: f.box.x, y: 200, w: f.box.w, h: 80 }, shade(sand, -0.25), 0.6, 4, 0.6, 0.1, 97);
  texture(g, 'speckle', f.box, 0.25, 1, 'soft-light');
  // a starfish on the big toe
  const t = f.toes[4];
  const [sx, sy] = onToe(t, Math.PI / 2);
  const star: PathFn = (c) => {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2 + 0.2;
      const rr = i % 2 ? 5 : 14;
      const x = sx + Math.cos(a) * rr;
      const y = sy - 18 + Math.sin(a) * rr;
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
    c.closePath();
  };
  raised(g, star, rad(g, sx - 4, sy - 22, 1, sx, sy - 18, 15, [
    [0, '#ffb070'],
    [1, '#d8501a'],
  ]), 0.55);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2 + 0.2;
    for (const d of [4, 7, 10]) fill(g, ell(sx + Math.cos(a) * d, sy - 18 + Math.sin(a) * d, 0.9, 0.9), rgba('#fff0d0', 0.8));
  }
  bareOutline(f);
  // the castle: its own sculpted silhouette sitting on the instep, casting a shadow onto the foot
  softFill(ctx, ell(CX + 8, 174, 110, 16), rgba('#3a1a08', 0.35), 6);
  ctx.save();
  // build it big: the castle is the star of the foot
  ctx.translate(CX, 170);
  ctx.scale(1.22, 1.22);
  ctx.translate(-CX, -150);
  const box = { x: CX - 100, y: 20, w: 200, h: 134 };
  const cs = new Sil(ctx, castleParts, box);
  const cg = cs.g;
  sandPaint(cg, sand, box, 99);
  cs.form({ base: sand, shadowTint: '#5a3010', ramp: 0, form: 0.5, formSize: 14, bevel: 0.4, rim: 0.4 });
  sandPaint(cg, sand, { x: box.x, y: box.y, w: box.w, h: box.h }, 101);
  // each part lit as its own block: the towers stand in front of the wall
  for (const [i, pth] of castleParts.entries()) lobe(cg, pth, box, -1000, -999, '#3a1a06', i === 3 ? 0.3 : 0.55, 8, 0.35);
  // bucket ridges round the towers and keep, and the gate
  for (const [x0, x1, y0] of [[CX - 34, CX + 34, 60], [CX - 34, CX + 34, 90], [CX - 84, CX - 48, 96], [CX + 48, CX + 84, 96], [CX - 84, CX - 48, 124], [CX + 48, CX + 84, 124]] as const)
    crease(cg, (c) => {
      c.moveTo(x0, y0);
      c.quadraticCurveTo((x0 + x1) / 2, y0 + 4, x1, y0);
    }, 1.6, '#6a4010', 0.4, 0.4);
  const gate: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 13, 134);
    c.lineTo(CX - 13, 104);
    c.quadraticCurveTo(CX, 88, CX + 13, 104);
    c.lineTo(CX + 13, 134);
    c.closePath();
  };
  fill(cg, gate, lin(cg, 0, 90, 0, 134, [
    [0, '#2a1606'],
    [1, '#5a3410'],
  ]));
  for (const [wx, wy] of [[CX - 66, 90], [CX + 66, 90], [CX - 14, 56], [CX + 14, 56]] as const) fill(cg, (c) => {
    c.beginPath();
    c.roundRect(wx - 4, wy - 7, 8, 14, 4);
  }, '#3a2008');
  // a scallop shell pressed into the wall
  const shell: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX + 30, 132);
    c.arc(CX + 30, 132, 11, Math.PI * 1.05, Math.PI * 1.95);
    c.closePath();
  };
  raised(cg, shell, lin(cg, CX + 20, 120, CX + 40, 134, [
    [0, '#fff0f0'],
    [1, '#e88a8a'],
  ]), 0.5);
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * 1.1 + i * 0.18;
    cg.strokeStyle = rgba('#a04040', 0.6);
    cg.lineWidth = 0.9;
    cg.beginPath();
    cg.moveTo(CX + 30, 132);
    cg.lineTo(CX + 30 + Math.cos(a) * 10, 132 + Math.sin(a) * 10);
    cg.stroke();
  }
  cs.edge(rgba(LIGHT.rim, 0.45), 2.5, LX * 3, LY * 3);
  cs.finish(inkOf(sand), { inner: 0.4 });
  ctx.restore();
  if (!o.live) paintPennant(ctx, red);
}

function paintPennant(g: Ctx, red: string): void {
  const { x, y } = PENNANT;
  g.strokeStyle = '#6a4a2a';
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(x, y + 18);
  g.lineTo(x, y - 14);
  g.stroke();
  const flag: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x + 1, y - 14);
    c.quadraticCurveTo(x + 16, y - 14, x + 28, y - 8);
    c.quadraticCurveTo(x + 16, y - 4, x + 1, y - 2);
    c.closePath();
  };
  fill(g, flag, lin(g, x, y - 14, x + 28, y, [
    [0, shade(red, 0.3)],
    [1, shade(red, -0.3)],
  ]));
  g.strokeStyle = inkOf(red);
  g.lineWidth = 1.4;
  flag(g);
  g.stroke();
}

registerStyle('sandcastle', {
  contactY: 262,
  halfWidth: 106,
  rig: { from: 156, to: 176 },
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 14 },
  parts: {
    pennant: { box: { x: PENNANT.x - 4, y: PENNANT.y - 18, w: 36, h: 40 }, frames: 1, pivot: [PENNANT.x, PENNANT.y + 18], draw: (g, art) => paintPennant(g, art.secondary ?? '#e5242f') },
  },
  draw(ctx, art, p, o) {
    drawSandcastle(ctx, art, p, o);
  },
});

// ════════════════════════════ SHORT-ORDER SHOE ════════════════════════════

export const TICKET = { x: CX + 82, y: 70 };

const clogBody = (flex: number): PathFn => (c) => {
  const b = 250 - flex * 6;
  c.beginPath();
  c.moveTo(CX - 70, 10);
  c.bezierCurveTo(CX - 78, 60, CX - 108, 100, CX - 108, 170);
  c.bezierCurveTo(CX - 108, b - 20, CX - 66, b, CX, b);
  c.bezierCurveTo(CX + 66, b, CX + 108, b - 20, CX + 108, 170);
  c.bezierCurveTo(CX + 108, 100, CX + 78, 60, CX + 70, 10);
  c.closePath();
};

const clogSole = (flex: number): PathFn => (c) => {
  const b = 268 - flex * 6;
  c.beginPath();
  c.moveTo(CX - 104, 216 - flex * 6);
  c.lineTo(CX - 104, b - 10);
  c.quadraticCurveTo(CX - 104, b, CX - 90, b);
  c.lineTo(CX + 90, b);
  c.quadraticCurveTo(CX + 104, b, CX + 104, b - 10);
  c.lineTo(CX + 104, 216 - flex * 6);
  c.closePath();
};

const ticketPath: PathFn = (c) => {
  const { x, y } = TICKET;
  c.beginPath();
  c.moveTo(x - 6, y - 6);
  c.lineTo(x + 40, y + 4);
  c.lineTo(x + 30, y + 74);
  c.lineTo(x - 16, y + 64);
  c.closePath();
};

function paintTicket(g: Ctx): void {
  const { x, y } = TICKET;
  clip(g, ticketPath, () => {
    g.fillStyle = lin(g, x - 16, y, x + 40, y + 70, [
      [0, '#fffef6'],
      [1, '#e8e0c8'],
    ]);
    g.fillRect(x - 20, y - 10, 64, 90);
    g.fillStyle = '#e5242f';
    g.save();
    g.translate(x + 12, y + 6);
    g.rotate(0.21);
    g.fillRect(-24, -6, 48, 10);
    g.fillStyle = '#1b1b1b';
    g.font = 'bold 11px sans-serif';
    g.fillText('#86', -14, 18);
    g.fillStyle = rgba('#3a3a40', 0.6);
    for (let i = 0; i < 4; i++) g.fillRect(-16, 26 + i * 8, 26 - (i % 2) * 8, 2);
    g.restore();
    // a grease thumbprint
    softFill(g, ell(x + 18, y + 54, 8, 6), rgba('#c89a40', 0.35), 2);
  });
  // the clip
  g.fillStyle = lin(g, x - 4, y - 10, x + 10, y + 6, [
    [0, '#ffffff'],
    [1, '#6a7280'],
  ]);
  g.beginPath();
  g.roundRect(x - 2, y - 10, 14, 14, 3);
  g.fill();
}

function drawShortOrder(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const white = art.primary ?? '#f6f3ee';
  const black = art.secondary ?? '#1b1b1b';
  const flex = Math.max(0, p.curl);
  const body = clogBody(flex);
  const sole = clogSole(flex);
  const box = { x: CX - 124, y: -8, w: 248, h: 282 };
  const sil = new Sil(ctx, [sole, body, ...(o.live ? [] : [ticketPath])], box);
  const g = sil.g;
  if (o.heat) {
    heatLayer(sil, box, { seed: 103, y0: 270, y1: 10 });
    return;
  }
  sil.form({ base: white, shadowTint: '#3a3a5a', ramp: 0.6, form: 0.55, formSize: 30, bevel: 0.45, rim: 0.5 });
  // the chequered sole
  clip(g, sole, () => {
    const b = 268 - flex * 6;
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 16; i++) {
        g.fillStyle = (i + row) % 2 ? '#f4f2ee' : black;
        g.fillRect(CX - 112 + i * 14, b - 42 + row * 14, 14, 14);
      }
    g.fillStyle = lin(g, 0, b - 44, 0, b, [
      [0, rgba('#000000', 0.45)],
      [0.3, rgba('#000000', 0)],
      [1, rgba('#000000', 0.4)],
    ]);
    g.fillRect(box.x, b - 44, box.w, 46);
    texture(g, 'rubber', box, 0.3);
  });
  contact(g, (c) => {
    body(c);
    c.fill();
  }, 0.55, 3, 4);
  clip(g, body, () => {
    g.fillStyle = lin(g, CX - 100, 20, CX + 100, 240, [
      [0, '#ffffff'],
      [0.45, white],
      [1, mix(shade(white, -0.35), '#5a5a7a', 0.25)],
    ]);
    g.fillRect(box.x, -8, box.w, 270);
    texture(g, 'rubber', box, 0.2);
    spec(g, CX - 44, 130, 60, 36, 0.45, -0.5);
    // grease: soaked-in oil stains, each a translucent amber patch with a darker tide-mark round its edge
    blotches(g, box, '#c89a40', 0.12, 20, 0.6, 0.15, 105);
    const r = rng(hashStr('short-sauce'));
    for (const [x, y, rx, ry] of [[CX - 46, 104, 22, 15], [CX + 52, 150, 16, 12], [CX - 12, 214, 18, 9]] as const) {
      const stain: PathFn = (c) => {
        c.beginPath();
        for (let i = 0; i <= 18; i++) {
          const a = (i / 18) * Math.PI * 2;
          const k = 0.82 + Math.sin(a * 3 + x) * 0.1 + Math.sin(a * 5 + y) * 0.06;
          if (i) c.lineTo(x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k);
          else c.moveTo(x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k);
        }
        c.closePath();
      };
      softFill(g, stain, rgba('#d8a040', 0.28), 2.5, 'multiply');
      clip(g, stain, () => {
        g.strokeStyle = rgba('#8a5a10', 0.35);
        g.lineWidth = 2.2;
        stain(g);
        g.stroke();
      });
      spec(g, x - rx * 0.3, y - ry * 0.3, rx * 0.4, ry * 0.25, 0.25, -0.4, '#fff6d8');
    }
    // ketchup: glossy splashes, round-lobed with flung droplets, one with a fat drip running down
    // a splash: a round pool with a few rounded lobes run out of it (overlapping circles, one winding: a union)
    const splash = (x: number, y: number, s: number, seed: number): PathFn => (c) => {
      const rr = rng(seed);
      c.beginPath();
      c.ellipse(x, y, 11 * s, 9.5 * s, 0, 0, Math.PI * 2);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + rr() * 0.8;
        const d = (8 + rr() * 4) * s;
        const lr = (4.5 + rr() * 3) * s;
        const lx = x + Math.cos(a) * d;
        const ly = y + Math.sin(a) * d * 0.85;
        c.moveTo(lx + lr, ly);
        c.ellipse(lx, ly, lr, lr * 0.9, 0, 0, Math.PI * 2);
      }
    };
    const sauce = (path: PathFn, x: number, y: number, rr: number) => {
      contact(g, (c) => {
        path(c);
        c.fill();
      }, 0.3, 1.2, 1.5);
      fill(g, path, rad(g, x - rr * 0.35, y - rr * 0.35, 1, x, y, rr * 1.2, [
        [0, '#ff6a50'],
        [0.5, '#e8261c'],
        [1, '#a8120e'],
      ]));
    };
    for (const [x, y, s, drip] of [[CX + 26, 112, 1.45, 1], [CX - 50, 176, 1.15, 0], [CX + 60, 200, 0.85, 1]] as const) {
      const p = splash(x, y, s, Math.floor(x * 7 + y));
      sauce(p, x, y, 15 * s);
      if (drip) {
        const len = 30 * s;
        const d: PathFn = (c) => {
          c.beginPath();
          c.moveTo(x - 4 * s, y + 4 * s);
          c.bezierCurveTo(x - 3.5 * s, y + len * 0.5, x - 2 * s, y + len * 0.8, x - 4.5 * s, y + len);
          c.arc(x, y + len, 4.6 * s, Math.PI, 0, true);
          c.bezierCurveTo(x + 2 * s, y + len * 0.8, x + 3.5 * s, y + len * 0.5, x + 4 * s, y + 4 * s);
          c.closePath();
        };
        sauce(d, x, y + len * 0.6, 8 * s);
        spec(g, x - 1.6 * s, y + len - 1.5 * s, 1.8 * s, 1.2 * s, 0.85, -0.5);
      }
      // flung droplets round the splash
      for (let i = 0; i < 4; i++) {
        const a = r() * Math.PI * 2;
        const d = (19 + r() * 8) * s;
        const dr = (2 + r() * 2.4) * s;
        sauce(ell(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85, dr, dr * 0.85), x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85, dr);
      }
      // the wet shine: a hot highlight and a soft one on the lit side
      spec(g, x - 5 * s, y - 5 * s, 6 * s, 3.2 * s, 0.9, -0.5);
      glint(g, x - 6 * s, y - 6 * s, 2.2 * s, 0.85);
    }
    // a zigzag of mustard where the line cook squeezed past
    const mus = (c: Ctx) => {
      c.moveTo(CX - 40, 60);
      for (let i = 1; i <= 6; i++) c.quadraticCurveTo(CX - 40 + i * 9 - 4.5, 60 + (i % 2 ? -9 : 9), CX - 40 + i * 9, 60 + (i % 2 ? 5 : -2));
    };
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = rgba('#5a3a00', 0.3);
    g.lineWidth = 6;
    g.translate(1.2, 1.6);
    g.beginPath();
    mus(g);
    g.stroke();
    g.translate(-1.2, -1.6);
    g.strokeStyle = '#e8b81a';
    g.lineWidth = 4.6;
    g.beginPath();
    mus(g);
    g.stroke();
    g.strokeStyle = rgba('#fff4b0', 0.75);
    g.lineWidth = 1.3;
    g.translate(-0.8, -1);
    g.beginPath();
    mus(g);
    g.stroke();
    g.restore();
    // a char mark from the flat-top
    softFill(g, ell(CX - 60, 150, 16, 8, 0.4), rgba('#2a1a10', 0.35), 4);
    // the vents and the rolled collar
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) fill(g, ell(CX + s * (70 - i * 8), 80 + i * 22, 5, 4), rgba('#5a5a6a', 0.55));
    g.fillStyle = lin(g, 0, 6, 0, 34, [
      [0, rgba('#000000', 0.5)],
      [0.4, rgba('#ffffff', 0.3)],
      [1, rgba('#000000', 0)],
    ]);
    g.fillRect(box.x, 6, box.w, 30);
  });
  if (!o.live) paintTicket(g);
  lightAll(sil, 0.36, 20, 0.5);
  sil.finish(inkOf('#5a5a6a'), { openTop: 4 });
}

registerStyle('shortorder', {
  contactY: 268,
  halfWidth: 108,
  rig: { from: 196, to: 214 },
  leg: { kind: 'knit', hw: 66, join: 'into' },
  parts: {
    ticket: soloPart({ x: TICKET.x - 22, y: TICKET.y - 14, w: 66, h: 92 }, [TICKET.x + 5, TICKET.y - 4], [ticketPath], (g) => paintTicket(g), () => '#5a5040'),
  },
  draw(ctx, art, p, o) {
    drawShortOrder(ctx, art, p, o);
  },
});

// ════════════════════════════ ICE SKATE IVY ════════════════════════════

const skateBoot: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 62, 10);
  c.bezierCurveTo(CX - 66, 70, CX - 92, 120, CX - 92, 180);
  c.bezierCurveTo(CX - 92, 236, CX - 60, 252, CX, 252);
  c.bezierCurveTo(CX + 60, 252, CX + 92, 236, CX + 92, 180);
  c.bezierCurveTo(CX + 92, 120, CX + 66, 70, CX + 62, 10);
  c.closePath();
};

const skateTrim: PathFn = (c) => {
  c.beginPath();
  const r = rng(hashStr('ivy-trim'));
  c.moveTo(CX - 70, 30);
  for (let i = 0; i <= 10; i++) {
    const x = CX - 70 + i * 14;
    c.arc(x, 12 + r() * 4, 9 + r() * 4, Math.PI * 0.9, Math.PI * 2.1);
  }
  c.lineTo(CX + 72, 30);
  c.quadraticCurveTo(CX, 40, CX - 70, 30);
  c.closePath();
};

/** The blade and its mounts (the blade's edge also glows in play). */
const bladePath: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 70, 252);
  c.lineTo(CX - 60, 268);
  c.lineTo(CX + 60, 268);
  c.lineTo(CX + 70, 252);
  c.closePath();
  c.moveTo(CX - 96, 272);
  c.lineTo(CX + 84, 270);
  c.quadraticCurveTo(CX + 104, 272, CX + 102, 288);
  // the toe pick's teeth
  c.lineTo(CX + 98, 296);
  c.lineTo(CX + 94, 290);
  c.lineTo(CX + 90, 298);
  c.lineTo(CX + 86, 291);
  c.quadraticCurveTo(CX + 60, 302, CX - 80, 302);
  c.quadraticCurveTo(CX - 100, 300, CX - 96, 272);
  c.closePath();
};

const IVY: [number, number, number][] = [
  [CX - 60, 50, 0.4],
  [CX - 76, 96, -0.3],
  [CX - 82, 146, 0.5],
  [CX - 70, 196, -0.4],
  [CX - 30, 232, 0.2],
  [CX + 64, 64, -0.5],
  [CX + 80, 118, 0.3],
  [CX + 84, 170, -0.3],
  [CX + 50, 224, 0.4],
];

function drawSkate(ctx: Ctx, art: FootArt, _p: Pose, o: Opts): void {
  const white = art.primary ?? '#fbfbff';
  const lilac = art.secondary ?? '#b9a2ff';
  const box = { x: CX - 110, y: -8, w: 222, h: 316 };
  const sil = new Sil(ctx, [bladePath, skateBoot, skateTrim], box);
  const g = sil.g;
  if (o.emissive) {
    softStroke(g, (c) => {
      c.moveTo(CX - 92, 300);
      c.quadraticCurveTo(CX + 40, 302, CX + 96, 292);
    }, rgba('#e8f4ff', 0.95), 3, 1.5);
    glowDot(g, CX + 60, 292, 14, '#c8e8ff', 0.7);
    glowFinish(sil);
    return;
  }
  if (o.heat) {
    heatLayer(sil, box, { seed: 107, y0: 300, y1: 10 });
    return;
  }
  sil.form({ base: white, shadowTint: '#4a3a8a', ramp: 0.6, form: 0.55, formSize: 28, bevel: 0.45, rim: 0.6 });
  // the blade: polished steel with a mirror edge
  clip(g, bladePath, () => {
    g.fillStyle = lin(g, 0, 250, 0, 302, [
      [0, '#8a92a0'],
      [0.35, '#f4f8fc'],
      [0.55, '#9aa4b4'],
      [0.8, '#e8eef6'],
      [1, '#4a5260'],
    ]);
    g.fillRect(box.x, 250, box.w, 56);
    texture(g, 'brushed', box, 0.25);
  });
  rivet(g, CX - 50, 260, 3.2, '#e0e6ee');
  rivet(g, CX + 50, 260, 3.2, '#e0e6ee');
  glint(g, CX - 40, 286, 6, 1);
  // the boot: glove-soft white leather
  clip(g, skateBoot, () => {
    texture(g, 'leather', box, 0.18, 1.2);
    spec(g, CX - 40, 140, 50, 30, 0.3, -0.5);
    stitches(g, (c) => c.ellipse(CX, 222, 70, 34, 0, Math.PI + 0.2, -0.2), rgba(lilac, 0.6), 1.4, 3, 3);
    // the tongue and the lacing, hooks at the top
    g.fillStyle = lin(g, CX - 24, 0, CX + 24, 0, [
      [0, '#ffffff'],
      [1, mix(white, '#8a7ac8', 0.25)],
    ]);
    g.beginPath();
    g.roundRect(CX - 24, 20, 48, 170, 12);
    g.fill();
  });
  const ys = [56, 84, 112, 140, 168];
  for (let i = ys.length - 1; i > 0; i--) for (const s of [-1, 1]) laceRun(g, CX - s * 28, ys[i], CX + s * 28, ys[i - 1], lilac, 4.5);
  for (const y of ys) for (const s of [-1, 1]) eyelet(g, CX + s * 29, y, 4, '#e8e4f8');
  for (const y of [30, 44]) for (const s of [-1, 1]) {
    // speed hooks
    g.strokeStyle = '#d8dce8';
    g.lineWidth = 2.6;
    g.beginPath();
    g.arc(CX + s * 30, y, 4, Math.PI * (s < 0 ? 0.5 : -0.5), Math.PI * (s < 0 ? 1.5 : 0.5));
    g.stroke();
  }
  // ivy winding round the boot: a vine with lit leaves
  const vine = (c: Ctx) => {
    IVY.slice(0, 5).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    IVY.slice(5).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  };
  contact(g, (c) => {
    c.lineWidth = 3;
    c.beginPath();
    vine(c);
    c.stroke();
  }, 0.4, 1.5, 2);
  g.strokeStyle = '#3a6a2a';
  g.lineWidth = 2.4;
  g.lineJoin = 'round';
  g.beginPath();
  vine(g);
  g.stroke();
  for (const [x, y, rot] of IVY) {
    for (const s of [-1, 1]) {
      const lx = x + s * 9;
      const ly = y - 4;
      const leaf: PathFn = (c) => {
        c.save();
        c.translate(lx, ly);
        c.rotate(rot + s * 0.6);
        c.beginPath();
        c.moveTo(0, 7);
        c.quadraticCurveTo(-9, 0, -6, -6);
        c.quadraticCurveTo(0, -3, 0, -9);
        c.quadraticCurveTo(0, -3, 6, -6);
        c.quadraticCurveTo(9, 0, 0, 7);
        c.restore();
      };
      raised(g, leaf, lin(g, lx - 8, ly - 8, lx + 8, ly + 8, [
        [0, '#8ad860'],
        [0.5, '#3f9a3a'],
        [1, '#1a5a22'],
      ]), 0.45);
    }
  }
  // the marabou trim: lilac fluff
  clip(g, skateTrim, () => {
    g.fillStyle = lin(g, 0, -4, 0, 40, [
      [0, '#ffffff'],
      [0.5, lilac],
      [1, shade(lilac, -0.4)],
    ]);
    g.fillRect(box.x, -8, box.w, 50);
    const r = rng(hashStr('ivy-fluff'));
    g.lineCap = 'round';
    for (let i = 0; i < 300; i++) {
      const x = CX - 84 + r() * 168;
      const y = -4 + r() * 40;
      const a = r() * Math.PI * 2;
      g.strokeStyle = rgba(r() < 0.5 ? '#ffffff' : shade(lilac, -0.2), 0.5);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7);
      g.stroke();
    }
  });
  lightAll(sil, 0.36, 18, 0.6);
  sil.finish(inkOf(mix(lilac, '#3a3060', 0.5)), { openTop: 4 });
}

registerStyle('iceskate', {
  contactY: 302,
  halfWidth: 94,
  leg: { kind: 'knit', hw: 58, join: 'into' },
  draw(ctx, art, p, o) {
    drawSkate(ctx, art, p, o);
  },
});

// ════════════════════════════ UFO TOE ════════════════════════════

/** Antennae: root and tip. */
export const ANTENNAE: [number, number, number, number][] = [
  [CX - 40, 64, CX - 82, 30],
  [CX + 40, 64, CX + 82, 30],
];

const ufoBody = (flex: number, w: number): PathFn => (c) => {
  const b = 280 - flex * 10;
  c.beginPath();
  c.moveTo(CX - 56, -6);
  c.bezierCurveTo(CX - 60, 50, CX - 92 - w, 120, CX - 90 - w, 190);
  c.bezierCurveTo(CX - 88 - w, b - 20, CX - 50, b, CX, b);
  c.bezierCurveTo(CX + 50, b, CX + 88 + w, b - 20, CX + 90 + w, 190);
  c.bezierCurveTo(CX + 92 + w, 120, CX + 60, 50, CX + 56, -6);
  c.closePath();
};

const antennaPath = (i: number): PathFn => (c) => {
  const [x0, y0, x1, y1] = ANTENNAE[i];
  c.beginPath();
  c.moveTo(x0 - 3, y0);
  c.quadraticCurveTo((x0 + x1) / 2 - 6, (y0 + y1) / 2 + 8, x1 - 2, y1 + 2);
  c.lineTo(x1 + 2, y1 - 2);
  c.quadraticCurveTo((x0 + x1) / 2 + 6, (y0 + y1) / 2 + 2, x0 + 3, y0);
  c.closePath();
  c.moveTo(x1 + 7, y1);
  c.arc(x1, y1, 7, 0, Math.PI * 2);
};

function paintAntenna(g: Ctx, i: number, green: string, lime: string): void {
  const [x0, y0, x1, y1] = ANTENNAE[i];
  clip(g, antennaPath(i), () => {
    g.fillStyle = lin(g, x0, y0, x1, y1, [
      [0, shade(green, -0.2)],
      [1, shade(green, 0.2)],
    ]);
    g.fillRect(Math.min(x0, x1) - 10, y1 - 10, Math.abs(x1 - x0) + 20, y0 - y1 + 20);
  });
  fill(g, ell(x1, y1, 7, 7), rad(g, x1 - 2, y1 - 2, 0.5, x1, y1, 7, [
    [0, '#ffffff'],
    [0.4, lime],
    [1, shade(lime, -0.4)],
  ]));
}

/** The pet saucer, at the origin (wing tilt 0…1 for its frames). */
export function drawSaucer(g: Ctx, s: number, light: number): void {
  g.save();
  g.scale(s, s);
  const dome: PathFn = (c) => {
    c.beginPath();
    c.ellipse(0, -4, 9, 8, 0, Math.PI, 0);
    c.closePath();
  };
  fill(g, dome, lin(g, -9, -12, 9, -4, [
    [0, 'rgba(220,250,255,0.95)'],
    [1, 'rgba(90,160,200,0.8)'],
  ]));
  const hull: PathFn = (c) => {
    c.beginPath();
    c.ellipse(0, 0, 22, 7, 0, 0, Math.PI * 2);
  };
  fill(g, hull, lin(g, 0, -7, 0, 7, [
    [0, '#f0f4f8'],
    [0.5, '#9aa4b4'],
    [1, '#3a4250'],
  ]));
  g.strokeStyle = '#1a1e26';
  g.lineWidth = 1.4;
  hull(g);
  g.stroke();
  for (let i = 0; i < 5; i++) {
    const x = -16 + i * 8;
    const on = (i + Math.round(light * 4)) % 2 === 0;
    fill(g, ell(x, 1.5, 2, 2), on ? '#d4ff5a' : '#ff5aa8');
  }
  g.restore();
}

function drawUfo(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const green = art.skin;
  const lime = art.secondary ?? '#d4ff5a';
  const flex = Math.max(0, p.curl);
  const squash = Math.max(0, -p.curl);
  const body = ufoBody(flex, squash * 8);
  const box = { x: CX - 110, y: -8, w: 220, h: 300 };
  const ants = o.live ? [] : [antennaPath(0), antennaPath(1)];
  const sil = new Sil(ctx, [body, ...ants], box);
  const g = sil.g;
  const b = 280 - flex * 10;
  const nail = ell(CX, b - 44, 46, 34);
  if (o.emissive) {
    glowDot(g, CX, b - 44, 52, lime, 0.65);
    for (const [x, y, r] of UFO_SPOTS) glowDot(g, x, y, r * 1.4, lime, 0.35);
    if (!o.live) for (const [, , x1, y1] of ANTENNAE) glowDot(g, x1, y1, 14, lime, 0.9);
    glowFinish(sil);
    return;
  }
  if (o.heat) {
    heatLayer(sil, box, { seed: 109, y0: 285, y1: 0 });
    return;
  }
  sil.form({ base: green, shadowTint: '#0a3a30', ramp: 0.85, form: 0.6, formSize: 30, bevel: 0.4, rim: 0.7 });
  texture(g, 'pores', box, 0.3, 1.1, 'soft-light');
  // alien skin: darker mottling, raised spots with a faint glow, knuckle wrinkles
  blotches(g, box, shade(green, -0.3), 0.35, 12, 0.55, 0.12, 111);
  for (const [x, y, r] of UFO_SPOTS) {
    softFill(g, ell(x + 1, y + 2, r + 2, r + 1.5), rgba('#0a3a10', 0.35), 2);
    fill(g, ell(x, y, r, r * 0.85), rad(g, x - r * 0.3, y - r * 0.3, 0.5, x, y, r, [
      [0, mix(lime, '#ffffff', 0.4)],
      [0.6, shade(green, 0.1)],
      [1, shade(green, -0.25)],
    ]));
  }
  for (const y of [120, 134, 148]) crease(g, (c) => {
    c.moveTo(CX - 40, y);
    c.quadraticCurveTo(CX, y + 8, CX + 40, y);
  }, 2, '#0a3a10', 0.4, 0.3);
  // the toenail: a huge glossy shield, lit from inside
  contact(g, (c) => {
    nail(c);
    c.fill();
  }, 0.4);
  fill(g, nail, rad(g, CX - 14, b - 58, 2, CX, b - 44, 50, [
    [0, mix(lime, '#ffffff', 0.6)],
    [0.5, lime],
    [1, shade(lime, -0.45)],
  ]));
  clip(g, nail, () => {
    fill(g, ell(CX, b - 70, 34, 10), rgba('#ffffff', 0.35));
    spec(g, CX - 18, b - 58, 16, 8, 0.9, -0.5);
  });
  glint(g, CX - 20, b - 60, 6, 1);
  if (!o.live) for (let i = 0; i < 2; i++) paintAntenna(g, i, green, lime);
  lightAll(sil, 0.38, 20, 0.65);
  sil.finish(inkOf(green), { openTop: -5 });
  if (!o.live) {
    // still art: the pet saucer parked beside it
    ctx.save();
    ctx.translate(CX + 104, 170);
    ctx.rotate(-0.2);
    drawSaucer(ctx, 1.4, 0);
    ctx.restore();
  }
}

const UFO_SPOTS: [number, number, number][] = [
  [CX - 40, 60, 9],
  [CX + 30, 44, 7],
  [CX + 52, 100, 10],
  [CX - 60, 150, 8],
  [CX + 64, 180, 6],
  [CX - 20, 196, 5],
];

registerStyle('ufotoe', {
  contactY: 284,
  halfWidth: 90,
  rig: { from: 190, to: 208 },
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 26 },
  parts: Object.fromEntries(
    ANTENNAE.map(([x0, y0, x1, y1], i) => [
      `ant${i}`,
      {
        box: { x: Math.min(x0, x1) - 12, y: y1 - 10, w: Math.abs(x1 - x0) + 24, h: y0 - y1 + 16 },
        frames: 1,
        pivot: [x0, y0],
        draw: (g: Ctx, art: FootArt) => {
          const s = new Sil(g, [antennaPath(i)], { x: Math.min(x0, x1) - 12, y: y1 - 10, w: 60, h: 60 });
          paintAntenna(s.g, i, art.skin, art.secondary ?? '#d4ff5a');
          s.finish(inkOf(art.skin), { inner: 0.3, w: 3 });
          glowDot(g, x1, y1, 12, art.secondary ?? '#d4ff5a', 0.5);
        },
      } as PartDef,
    ]),
  ),
  draw(ctx, art, p, o) {
    drawUfo(ctx, art, p, o);
  },
});

// ════════════════════════════ DOUGH BOY ════════════════════════════

const DOUGH_EYES = { y: 100, dx: 38, rx: 15, ry: 18 };
const DOUGH_BLINK = 5;

function doughEyes(g: Ctx, dough: string, blink: number): void {
  const { y, dx, rx, ry } = DOUGH_EYES;
  for (const s of [-1, 1]) {
    const x = CX + s * dx;
    // a soft socket pressed into the dough
    softFill(g, ell(x + 1, y + 2, rx + 4, ry + 4), rgba('#6a4010', 0.25), 3);
    beadEye(g, x, y, rx, ry, '#4a2a10');
    if (blink > 0.02) {
      clip(g, ell(x, y, rx + 1.5, ry + 1.5), () => {
        const lid = y - ry - 2 + (ry * 2 + 4) * blink;
        g.fillStyle = lin(g, 0, y - ry, 0, lid, [
          [0, shade(dough, 0.1)],
          [1, shade(dough, -0.12)],
        ]);
        g.fillRect(x - rx - 3, y - ry - 4, rx * 2 + 6, lid - (y - ry - 4));
        g.strokeStyle = rgba('#6a4010', 0.7);
        g.lineWidth = 1.8;
        g.beginPath();
        g.moveTo(x - rx, lid - 1);
        g.quadraticCurveTo(x, lid + 3, x + rx, lid - 1);
        g.stroke();
      });
    }
  }
}

function drawDough(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const dough = art.skin;
  const look = { skin: dough, nails: null, shadowTint: '#a8601a', pores: 0.05, detail: 0, w: 14, toe: 1.12, ball: 1.06 } as const;
  if (o.heat) {
    const f = paintBare(ctx, look, p);
    f.sil.g.clearRect(-3000, -3000, 6000, 6000);
    // baking: a golden-brown crust glow
    heatLayer(f.sil, f.box, { seed: 113, y0: 270, y1: 0, hot: '#ffe08a', mid: '#e8901a', deep: '#a04a08' });
    return;
  }
  const f = paintBare(ctx, look, p);
  const g = f.sil.g;
  const box = f.box;
  // dough: soft, matte, a few air bubbles, floury
  texture(g, 'grain', box, 0.15, 1.4, 'soft-light');
  const r = rng(hashStr('dough-bubbles'));
  for (let i = 0; i < 16; i++) {
    const x = CX - 90 + r() * 180;
    const y = 20 + r() * 210;
    const rr = 2 + r() * 4;
    softFill(g, ell(x + 0.6, y + 0.8, rr, rr * 0.8), rgba('#8a5a1a', 0.25), 0.8);
    fill(g, ell(x, y, rr * 0.8, rr * 0.65), rgba('#fff6e0', 0.5));
  }
  blotches(g, box, '#ffffff', 0.4, 14, 0.58, 0.25, 115);
  blotches(g, box, '#ffffff', 0.3, 3, 0.76, 0.05, 117);
  // a poke mark from a finger, and rosy cheeks
  softFill(g, ell(CX + 58, 160, 9, 7), rgba('#8a5010', 0.3), 3);
  spec(g, CX + 56, 164, 6, 3, 0.4, 0);
  for (const s of [-1, 1]) softFill(g, ell(CX + s * 60, 142, 19, 11), rgba('#ff7a6a', 0.42), 6);
  // the smile: a big open grin pressed into the dough, a dark mouth with a soft tongue and a lit lower lip
  const mouth: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 34, 140);
    c.quadraticCurveTo(CX, 150, CX + 34, 140);
    c.quadraticCurveTo(CX + 26, 178, CX, 180);
    c.quadraticCurveTo(CX - 26, 178, CX - 34, 140);
    c.closePath();
  };
  softFill(g, mouth, rgba('#6a3a10', 0.35), 4);
  fill(g, mouth, rad(g, CX, 150, 2, CX, 162, 36, [
    [0, '#4a1a10'],
    [1, '#2a0a06'],
  ]));
  clip(g, mouth, () => {
    fill(g, ell(CX + 4, 182, 20, 12), rad(g, CX, 176, 1, CX + 4, 182, 20, [
      [0, '#ff8a8a'],
      [1, '#c8404a'],
    ]));
  });
  crease(g, (c) => {
    c.moveTo(CX - 36, 139);
    c.quadraticCurveTo(CX, 149, CX + 36, 139);
  }, 3, '#6a3a10', 0.8, 0.35);
  crease(g, (c) => {
    c.moveTo(CX - 28, 168);
    c.quadraticCurveTo(CX, 186, CX + 28, 168);
  }, 2.2, '#6a3a10', 0.4, 0.55);
  if (!o.live) doughEyes(g, dough, 0);
  bareOutline(f, inkOf(shade(dough, -0.2)));
  void bareParts;
  void poseToes;
  void restToes;
}

registerStyle('doughboy', {
  contactY: 262,
  halfWidth: 112,
  rig: { from: 156, to: 176 },
  leg: { kind: 'skin', hw: 56, join: 'blend', fade: 26 },
  parts: {
    eyes: {
      box: { x: CX - DOUGH_EYES.dx - DOUGH_EYES.rx - 6, y: DOUGH_EYES.y - DOUGH_EYES.ry - 7, w: (DOUGH_EYES.dx + DOUGH_EYES.rx + 6) * 2, h: DOUGH_EYES.ry * 2 + 14 },
      frames: DOUGH_BLINK,
      draw: (g, art, i) => doughEyes(g, art.skin, i / (DOUGH_BLINK - 1)),
    },
  },
  draw(ctx, art, p, o) {
    drawDough(ctx, art, p, o);
  },
});

export { ao };
