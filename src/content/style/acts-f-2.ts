// Batch F in the style kit, part 2: the comic heroes' nemeses (mini-bosses).
// - THE RED SOLE: a black patent military jackboot crumpled at the ankle, a crimson armband with a white HYDRANT
//   roundel (a little fire hydrant of our own), a brass-buckled instep strap and a crimson enamel skull for a toe
//   cap whose sockets smoulder red.
// - VENOMNOM: a sneaker swallowed by wet black goo: a jagged white star splat, huge angular white eyes, a maw of
//   needle teeth across the toe (its tongue licks out in play, at NOM_MOUTH), goo lobes dripping off the sole and
//   two tendrils whipping at its sides.
// - THE CHEETOE: a cursed cat-sneaker in cheese-dust orange fur with black rosettes, a white muzzle, green slit eyes
//   that follow your peel, whiskers, a lashing tail, a white rubber toe and hooked claws out.
// Parodies with looks of our own. The old art is in src/content/art/comics.ts (NOM_MOUTH stays where the fight
// expects it).

import type { FootArt } from '../../data/feet';
import { NOM_MOUTH } from '../art/comics';
import { type PathFn, type Pose, crease, glint, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil } from '../../art/style/sil';
import { registerStyle } from '../../art/style/registry';
import { contact, paintClaw, clawPath, rivet, stitches } from '../../art/style/details';
import { clip, furCoat, glowDot, glowFinish, heatLayer, lightAll, lin, rad, streak } from '../../art/style/kit-bosses';
import { type Ctx, mix, rgba, rng, shade } from '../../art/util';
import { CX, LX, LY, type Opts, type Pt, arcPts, lifted, partSil, smooth, tube } from './acts-f-kit';

// ════════════════════════════ THE RED SOLE ════════════════════════════

const redBoot = (flex: number): PathFn => (c) => {
  const b = 252 - flex * 6;
  c.beginPath();
  c.moveTo(CX - 62, -6);
  c.bezierCurveTo(CX - 64, 50, CX - 66, 100, CX - 70, 140);
  c.bezierCurveTo(CX - 76, 170, CX - 100, 190, CX - 102, 220);
  c.bezierCurveTo(CX - 102, b - 6, CX - 70, b, CX, b);
  c.bezierCurveTo(CX + 70, b, CX + 102, b - 6, CX + 102, 220);
  c.bezierCurveTo(CX + 100, 190, CX + 76, 170, CX + 70, 140);
  c.bezierCurveTo(CX + 66, 100, CX + 64, 50, CX + 62, -6);
  c.closePath();
};

const redSole = (flex: number): PathFn => (c) => {
  const b = 268 - flex * 5;
  c.beginPath();
  c.moveTo(CX - 104, 222);
  c.bezierCurveTo(CX - 110, 244, CX - 106, b, CX - 84, b);
  c.lineTo(CX + 84, b);
  c.bezierCurveTo(CX + 106, b, CX + 110, 244, CX + 104, 222);
  c.quadraticCurveTo(CX, 246, CX - 104, 222);
  c.closePath();
};

const redBand: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 66, 12);
  c.quadraticCurveTo(CX, 20, CX + 66, 12);
  c.lineTo(CX + 67, 44);
  c.quadraticCurveTo(CX, 52, CX - 67, 44);
  c.closePath();
};

/** The skull toe cap (cranium, cheekbones and jaw as one plate). */
const skullCap = (flex: number): PathFn => (c) => {
  const d = flex * 5;
  c.beginPath();
  c.moveTo(CX - 60, 214 - d);
  c.bezierCurveTo(CX - 60, 176 - d, CX - 30, 166 - d, CX, 166 - d);
  c.bezierCurveTo(CX + 30, 166 - d, CX + 60, 176 - d, CX + 60, 214 - d);
  c.bezierCurveTo(CX + 58, 228 - d, CX + 44, 232 - d, CX + 36, 236 - d);
  c.lineTo(CX + 34, 250 - d);
  c.quadraticCurveTo(CX, 256 - d, CX - 34, 250 - d);
  c.lineTo(CX - 36, 236 - d);
  c.bezierCurveTo(CX - 44, 232 - d, CX - 58, 228 - d, CX - 60, 214 - d);
  c.closePath();
};

const SKULL_EYES: Pt[] = [
  [CX - 24, 206],
  [CX + 24, 206],
];

function skullSockets(g: Ctx, d: number, glowOnly: boolean, red: string): void {
  for (const [x, y0] of SKULL_EYES) {
    const y = y0 - d;
    if (glowOnly) {
      glowDot(g, x, y, 18, red, 0.9);
      continue;
    }
    const sock: PathFn = (c) => {
      c.beginPath();
      c.ellipse(x, y, 13, 11, x < CX ? 0.25 : -0.25, 0, Math.PI * 2);
    };
    sock(g);
    g.fillStyle = rad(g, x, y + 2, 1, x, y, 14, [
      [0, mix(red, '#ff8060', 0.4)],
      [0.25, shade(red, -0.3)],
      [0.7, '#1a0406'],
      [1, '#080102'],
    ]);
    g.fill();
    // the brow casts down into the socket
    clip(g, sock, () => softFill(g, (c) => {
      c.beginPath();
      c.ellipse(x - 2, y - 10, 16, 8, 0, 0, Math.PI * 2);
    }, rgba('#000000', 0.6), 3));
  }
}

function drawRedSole(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const black = art.primary ?? '#1e1c20';
  const red = art.secondary ?? '#c8102e';
  const flex = Math.max(0, p.curl);
  const d = flex * 5;
  const boot = redBoot(flex);
  const sole = redSole(flex);
  const skull = skullCap(flex);
  const box = { x: CX - 116, y: -10, w: 232, h: 282 };
  const sil = new Sil(ctx, [boot, sole], box);
  const g = sil.g;
  if (o.heat) {
    heatLayer(sil, box, { seed: 621, y0: 268, y1: 30 });
    return;
  }
  if (o.emissive) {
    g.save();
    g.translate(CX, 236);
    g.scale(1.24, 1.12);
    g.translate(-CX, -236);
    skullSockets(g, d, true, '#ff3020');
    g.restore();
    glowFinish(sil);
    return;
  }
  sil.form({ base: black, shadowTint: '#06060e', ramp: 0.7, form: 0.55, formSize: 26, bevel: 0.45, rim: 0.75 });
  texture(g, 'leather', box, 0.14, 1.3);
  // mirror-polished patent: long vertical reflections down the shaft, a window of sky on the toe
  clip(g, boot, () => {
    g.fillStyle = lin(g, CX - 70, 0, CX + 70, 0, [
      [0, rgba('#000000', 0.2)],
      [0.12, rgba('#c8d4ff', 0.18)],
      [0.2, rgba('#ffffff', 0.32)],
      [0.27, rgba('#c8d4ff', 0.08)],
      [0.55, rgba('#000000', 0.15)],
      [0.84, rgba('#a8b4d8', 0.14)],
      [1, rgba('#000000', 0.2)],
    ]);
    g.fillRect(box.x, -10, box.w, 160);
    streak(g, (c) => {
      c.moveTo(CX - 44, 50);
      c.lineTo(CX - 46, 128);
    }, 2.5, 0.75);
    streak(g, (c) => {
      c.moveTo(CX + 46, 60);
      c.lineTo(CX + 48, 120);
    }, 1.6, 0.35, '#b8c8ff');
    // the jackboot crumples at the ankle: stacked horizontal folds
    for (const [y, w, a] of [[118, 66, 0.6], [134, 70, 0.7], [150, 78, 0.55]] as const) {
      const wav = (c: Ctx, dy: number) => {
        c.moveTo(CX - w, y + dy);
        c.bezierCurveTo(CX - w * 0.5, y - 8 + dy, CX - w * 0.1, y + 6 + dy, CX + w * 0.3, y - 4 + dy);
        c.quadraticCurveTo(CX + w * 0.7, y - 10 + dy, CX + w, y + dy);
      };
      softStroke(g, (c) => wav(c, 3), rgba('#000000', a), 6, 2.5);
      softStroke(g, (c) => wav(c, -1), rgba('#dfe6ff', a * 0.55), 2, 0.8);
    }
    // the vamp's mirror shine
    spec(g, CX - 50, 196 - d, 30, 14, 0.45, -0.35, '#e8eeff');
    streak(g, (c) => {
      c.moveTo(CX - 86, 210);
      c.quadraticCurveTo(CX - 84, 190, CX - 70, 178);
    }, 2.2, 0.6);
  });
  // the instep strap and its brass buckle
  const strapP: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 74, 160);
    c.quadraticCurveTo(CX, 150, CX + 76, 160);
    c.lineTo(CX + 82, 178);
    c.quadraticCurveTo(CX, 166, CX - 80, 178);
    c.closePath();
  };
  lifted(g, strapP, lin(g, 0, 152, 0, 178, [
    [0, '#4a4650'],
    [0.4, '#24222a'],
    [1, '#0c0b10'],
  ]), 0.6);
  stitches(g, (c) => {
    c.moveTo(CX - 74, 163);
    c.quadraticCurveTo(CX, 153, CX + 76, 163);
  }, rgba('#8a8690', 0.5), 1.1, 3, 2.5);
  const buckle: PathFn = (c) => {
    c.beginPath();
    c.roundRect(CX + 32, 150, 26, 26, 3);
    c.roundRect(CX + 37, 155, 16, 16, 2);
  };
  contact(g, (c) => {
    buckle(c);
    c.fill('evenodd');
  }, 0.6, 2, 3);
  g.save();
  buckle(g);
  g.fillStyle = lin(g, CX + 32, 150, CX + 58, 176, [
    [0, '#fff0b0'],
    [0.3, '#d8a840'],
    [0.6, '#6a4410'],
    [0.8, '#e8c060'],
    [1, '#5a3a0a'],
  ]);
  g.fill('evenodd');
  g.restore();
  glint(g, CX + 37, 155, 4, 1);
  // the crimson armband with the HYDRANT roundel
  contact(g, (c) => {
    redBand(c);
    c.fill();
  }, 0.6, 3, 4);
  clip(g, redBand, () => {
    g.fillStyle = lin(g, 0, 12, 0, 52, [
      [0, shade(red, 0.35)],
      [0.4, red],
      [1, shade(red, -0.5)],
    ]);
    g.fillRect(box.x, 8, box.w, 50);
    texture(g, 'canvas', box, 0.35, 1);
    g.fillStyle = lin(g, CX - 66, 0, CX + 66, 0, [
      [0, rgba('#000000', 0.3)],
      [0.25, rgba('#ffffff', 0.12)],
      [0.6, rgba('#000000', 0)],
      [1, rgba('#000000', 0.45)],
    ]);
    g.fillRect(box.x, 8, box.w, 50);
    for (const y of [16, 46]) {
      g.fillStyle = rgba('#000000', 0.5);
      g.fillRect(box.x, y, box.w, 2);
    }
  });
  // the roundel: a white disc, black ring, a little fire hydrant of our own
  const rx = CX;
  const ry = 31;
  lifted(g, (c) => {
    c.beginPath();
    c.arc(rx, ry, 15, 0, Math.PI * 2);
  }, rad(g, rx - 4, ry - 4, 1, rx, ry, 15, [
    [0, '#ffffff'],
    [0.8, '#e8e4dc'],
    [1, '#a8a4a0'],
  ]), 0.45, 1.5, 2);
  g.strokeStyle = '#141216';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(rx, ry, 13, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = '#141216';
  g.beginPath();
  g.moveTo(rx - 4, ry - 4);
  g.quadraticCurveTo(rx, ry - 11, rx + 4, ry - 4);
  g.lineTo(rx + 4, ry + 7);
  g.lineTo(rx + 6, ry + 9);
  g.lineTo(rx - 6, ry + 9);
  g.lineTo(rx - 4, ry + 7);
  g.closePath();
  g.fill();
  g.fillRect(rx - 8, ry - 1, 16, 4);
  g.fillRect(rx - 1, ry - 13, 2, 3);
  // the crimson skull toe cap (drawn a size up over the toe)
  g.save();
  g.translate(CX, 236);
  g.scale(1.24, 1.12);
  g.translate(-CX, -236);
  contact(g, (c) => {
    skull(c);
    c.fill();
  }, 0.65, 3, 4);
  clip(g, skull, () => {
    g.fillStyle = lin(g, CX - 60, 166 - d, CX + 50, 256 - d, [
      [0, shade(red, 0.4)],
      [0.35, red],
      [1, mix(shade(red, -0.6), '#1a0010', 0.3)],
    ]);
    g.fillRect(CX - 64, 160, 128, 100);
    texture(g, 'grain', { x: CX - 64, y: 160, w: 128, h: 100 }, 0.15);
    spec(g, CX - 26, 180 - d, 22, 10, 0.65, -0.3);
    // cheekbones and the hollow temples
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(CX - 54, 212 - d, 10, 18, 0.2, 0, Math.PI * 2);
      c.ellipse(CX + 54, 212 - d, 10, 18, -0.2, 0, Math.PI * 2);
    }, rgba('#1a0008', 0.45), 4);
    skullSockets(g, d, false, red);
    // the nose
    g.fillStyle = '#12020a';
    g.beginPath();
    g.moveTo(CX, 216 - d);
    g.lineTo(CX + 6, 228 - d);
    g.lineTo(CX - 6, 228 - d);
    g.closePath();
    g.fill();
    // the teeth
    const ty = 238 - d;
    g.fillStyle = '#12020a';
    g.fillRect(CX - 30, ty - 2, 60, 14);
    for (let i = 0; i < 6; i++) {
      const x = CX - 28 + i * 9.6;
      g.fillStyle = lin(g, x, ty, x + 8, ty + 10, [
        [0, '#fff4e8'],
        [1, '#c8b8a8'],
      ]);
      g.beginPath();
      g.roundRect(x, ty - 1, 8, 11, 2);
      g.fill();
    }
  });
  crease(g, (c) => skull(c), 1.6, '#12020a', 0.5, 0.35);
  g.restore();
  // the heel and sole: hobnailed black leather
  clip(g, sole, () => {
    g.fillStyle = lin(g, 0, 222, 0, 270, [
      [0, '#2a2628'],
      [1, '#060506'],
    ]);
    g.fillRect(box.x, 214, box.w, 60);
    texture(g, 'leather', box, 0.3);
    streak(g, (c) => {
      c.moveTo(CX - 90, 252 - d);
      c.lineTo(CX + 40, 256 - d);
    }, 1.5, 0.22);
  });
  for (let i = 0; i <= 12; i++) rivet(g, CX - 84 + i * 14, 262 - d, 2.3, '#a8aeb8');
  crease(g, (c) => {
    c.moveTo(CX - 104, 224);
    c.quadraticCurveTo(CX, 248 - d, CX + 104, 224);
  }, 2.6, '#000000', 0.6, 0.25);
  lightAll(sil, 0.3, 20, 0.75);
  sil.finish(inkOf('#3a3640'), { openTop: -6 });
}

registerStyle('redsole', {
  contactY: 268,
  halfWidth: 108,
  rig: { from: 196, to: 216 },
  leg: { kind: 'wool', hw: 58, join: 'into' },
  draw(ctx, art, p, o) {
    drawRedSole(ctx, art, p, o);
  },
});

// ════════════════════════════ VENOMNOM ════════════════════════════

const nomBody = (flex: number): PathFn => {
  const b = flex * 6;
  return smooth([
    [CX - 64, -8],
    [CX - 70, 40],
    [CX - 92, 100],
    [CX - 108, 160],
    [CX - 112, 210],
    [CX - 104, 244 - b],
    [CX - 84, 258 - b],
    [CX - 70, 252 - b],
    [CX - 54, 266 - b],
    [CX - 36, 256 - b],
    [CX - 10, 262 - b],
    [CX + 14, 256 - b],
    [CX + 36, 268 - b],
    [CX + 56, 256 - b],
    [CX + 80, 260 - b],
    [CX + 104, 242 - b],
    [CX + 114, 206],
    [CX + 110, 156],
    [CX + 94, 98],
    [CX + 72, 40],
    [CX + 66, -8],
  ]);
};

const NOM_TENDS: { at: Pt; side: number }[] = [
  { at: [CX - 104, 178], side: -1 },
  { at: [CX + 108, 168], side: 1 },
];

function tendrilPts(side: number, at: Pt): Pt[] {
  return arcPts(at[0], at[1], side < 0 ? Math.PI * 0.9 : Math.PI * 0.1, 92, side * 1.1, 18).map(([x, y], i) => [x + Math.sin(i * 0.7) * 3 * side, y + Math.sin(i * 0.55) * 4] as Pt);
}

function paintTendril(g: Ctx, side: number, at: Pt, skin: string): void {
  const pts = tendrilPts(side, at);
  const path = tube(pts, (s) => 7.5 * (1 - s) ** 1.3 + 1.6);
  partSil(g, [path], { x: at[0] - 80, y: at[1] - 80, w: 160, h: 160 }, (pg) => {
    path(pg);
    pg.fillStyle = skin;
    pg.fill();
    pg.save();
    pg.lineCap = 'round';
    pg.beginPath();
    pts.forEach(([x, y], i) => (i ? pg.lineTo(x - 2, y - 2) : pg.moveTo(x - 2, y - 2)));
    pg.strokeStyle = rgba('#a8b0ff', 0.5);
    pg.lineWidth = 2;
    pg.stroke();
    pg.restore();
    glint(pg, pts[5][0] - 2, pts[5][1] - 3, 3, 0.8);
  }, '#050408', { rim: 0.8 });
}

/** The angular white eyes: `shut` 0 open … 1 shut (goo lids closing from top and bottom). */
function nomEyes(g: Ctx, shut: number, skin: string): void {
  for (const s of [-1, 1]) {
    const x = CX + 3 + s * 44;
    const y = 128;
    const eye: PathFn = (c) => {
      c.beginPath();
      c.moveTo(x - s * 30, y + 14);
      c.bezierCurveTo(x - s * 36, y + 2, x - s * 32, y - 10, x - s * 20, y - 12);
      c.bezierCurveTo(x, y - 14, x + s * 24, y - 18, x + s * 42, y - 30);
      c.bezierCurveTo(x + s * 38, y - 4, x + s * 30, y + 18, x + s * 8, y + 24);
      c.quadraticCurveTo(x - s * 18, y + 26, x - s * 30, y + 14);
      c.closePath();
    };
    // the goo rim round each eye
    g.save();
    eye(g);
    g.lineJoin = 'round';
    g.strokeStyle = '#020204';
    g.lineWidth = 7;
    g.stroke();
    g.fillStyle = rad(g, x - s * 6, y - 6, 2, x, y, 40, [
      [0, '#ffffff'],
      [0.6, '#f0f2f8'],
      [1, '#a8aec8'],
    ]);
    g.fill();
    g.restore();
    clip(g, eye, () => {
      // a soft inner shadow so the white sits in the goo
      softStroke(g, (c) => eye(c), rgba('#202840', 0.5), 6, 4);
      spec(g, x - s * 10, y - 8, 16, 6, 0.7, -0.2);
      if (shut > 0) {
        g.fillStyle = skin;
        g.fillRect(x - 46, y - 32, 92, 34 * shut + 2);
        g.fillRect(x - 46, y + 26 - 24 * shut, 92, 30);
        streak(g, (c) => {
          c.moveTo(x - 30, y - 28 + 32 * shut);
          c.lineTo(x + 30, y - 28 + 32 * shut);
        }, 1.5, 0.35, '#a8b0ff');
      }
    });
  }
}

const nomMaw: PathFn = (c) => {
  const { x, y } = NOM_MOUTH;
  c.beginPath();
  c.moveTo(x - 86, y - 16);
  c.bezierCurveTo(x - 50, y - 6, x + 50, y - 8, x + 86, y - 20);
  c.bezierCurveTo(x + 70, y + 14, x + 40, y + 30, x, y + 30);
  c.bezierCurveTo(x - 40, y + 30, x - 72, y + 14, x - 86, y - 16);
  c.closePath();
};

function nomTongue(g: Ctx, out: number, pink: string): void {
  const { x, y } = NOM_MOUTH;
  const len = 14 + out * 52;
  const pts = arcPts(x + 10, y + 12, Math.PI / 2 + 0.3, len, -0.9 - out * 0.4, 12);
  const path = tube(pts, (s) => 13 - s * 4);
  contact(g, (c) => {
    path(c);
    c.fill();
  }, 0.5, 2.5, 3);
  path(g);
  g.fillStyle = lin(g, x - 10, y, x + 20, y + len, [
    [0, shade(pink, 0.25)],
    [0.5, pink],
    [1, shade(pink, -0.4)],
  ]);
  g.fill();
  clip(g, path, () => {
    g.strokeStyle = rgba(shade(pink, -0.5), 0.5);
    g.lineWidth = 1.6;
    g.beginPath();
    pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
    g.stroke();
    spec(g, pts[3][0] - 4, pts[3][1], 6, 3, 0.7, 0.4);
  });
  path(g);
  g.strokeStyle = shade(pink, -0.65);
  g.lineWidth = 1.4;
  g.stroke();
}

function drawVenomnom(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const skin = art.skin;
  const white = art.secondary ?? '#f4f4f8';
  const pink = (art.extra?.tongue as string) ?? '#e0507a';
  const flex = Math.max(0, p.curl);
  const body = nomBody(flex);
  const box = { x: CX - 124, y: -10, w: 248, h: 284 };
  const sil = new Sil(ctx, [body], box);
  const g = sil.g;
  if (o.heat) {
    heatLayer(sil, box, { seed: 631, y0: 266, y1: 20, hot: '#ff9adf', mid: '#d0306a', deep: '#5a0a3a' });
    return;
  }
  if (o.emissive) {
    // the inside of the maw glows a hungry red
    clip(g, nomMaw, () => glowDot(g, NOM_MOUTH.x, NOM_MOUTH.y + 10, 70, '#ff2a4a', 0.5));
    glowFinish(sil);
    return;
  }
  sil.form({ base: skin, shadowTint: '#0a0620', ramp: 0.6, form: 0.5, formSize: 30, bevel: 0.5, rim: 0.9 });
  // wet goo: violet-blue sheen pooling on the lit side, sharp wet highlights, ropes of goo
  clip(g, body, () => {
    g.fillStyle = rad(g, CX - 50, 80, 5, CX - 30, 120, 160, [
      [0, rgba('#5a5a90', 0.55)],
      [0.5, rgba('#2a2a50', 0.2)],
      [1, rgba('#000000', 0)],
    ]);
    g.fillRect(box.x, box.y, box.w, box.h);
    const r = rng(633);
    for (let i = 0; i < 9; i++) {
      const x = CX - 90 + r() * 180;
      const y = 30 + r() * 200;
      softStroke(g, (c) => {
        c.moveTo(x, y);
        c.bezierCurveTo(x + (r() - 0.5) * 30, y + 20, x + (r() - 0.5) * 30, y + 40, x + (r() - 0.5) * 20, y + 60);
      }, rgba('#000000', 0.45), 6, 2.5);
    }
    for (const [x, y, l, a] of [[CX - 72, 60, 70, 0.9], [CX - 92, 160, 40, 0.6], [CX + 60, 70, 30, 0.45], [CX - 30, 236, 26, 0.5]] as const) {
      streak(g, (c) => {
        c.moveTo(x, y);
        c.quadraticCurveTo(x - 6, y + l * 0.5, x - 2, y + l);
      }, 2.4, a, '#dfe4ff');
    }
    // the sneaker under the goo: a white sole showing through at the bottom
    softStroke(g, (c) => {
      c.moveTo(CX - 104, 232);
      c.quadraticCurveTo(CX, 250, CX + 104, 232);
    }, rgba('#8890b0', 0.25), 8, 4);
  });
  // the white star splat, its points running like paint
  const st: Pt[] = [];
  for (let k = 0; k < 12; k++) {
    const a = -Math.PI / 2 + (k / 12) * Math.PI * 2;
    const rr = (k % 2 ? 17 : [56, 40, 50, 42, 52, 44][k / 2]) * 1.05;
    st.push([CX + Math.cos(a) * rr, 54 + Math.sin(a) * rr * 0.9]);
  }
  const star: PathFn = (c) => {
    c.beginPath();
    st.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
  };
  softFill(g, star, rgba('#ffffff', 0.25), 4);
  star(g);
  g.fillStyle = lin(g, CX - 40, 0, CX + 40, 110, [
    [0, '#ffffff'],
    [0.6, white],
    [1, '#9aa0bc'],
  ]);
  g.fill();
  clip(g, star, () => {
    softStroke(g, star, rgba('#1a1a30', 0.35), 5, 3);
    texture(g, 'grain', { x: CX - 60, y: 0, w: 120, h: 110 }, 0.2);
  });
  // the eyes
  if (!o.live) nomEyes(g, 0, skin);
  else nomEyes(g, 1, skin);
  // the maw: a dark red throat, needle teeth top and bottom
  softFill(g, nomMaw, rgba('#000000', 0.7), 4);
  nomMaw(g);
  g.fillStyle = rad(g, NOM_MOUTH.x, NOM_MOUTH.y + 18, 4, NOM_MOUTH.x, NOM_MOUTH.y + 8, 80, [
    [0, '#8a1030'],
    [0.5, '#3a0412'],
    [1, '#0a0004'],
  ]);
  g.fill();
  clip(g, nomMaw, () => {
    const { x, y } = NOM_MOUTH;
    const tooth = (tx: number, ty: number, len: number, down: boolean, w: number) => {
      const t: PathFn = (c) => {
        c.beginPath();
        c.moveTo(tx - w, ty);
        c.quadraticCurveTo(tx - w * 0.2, ty + (down ? len * 0.6 : -len * 0.6), tx + w * 0.15, ty + (down ? len : -len));
        c.quadraticCurveTo(tx + w * 0.4, ty + (down ? len * 0.4 : -len * 0.4), tx + w, ty);
        c.closePath();
      };
      contact(g, (c) => {
        t(c);
        c.fill();
      }, 0.6, 1.5, 2);
      t(g);
      g.fillStyle = lin(g, tx - w, ty, tx + w, ty + (down ? len : -len), [
        [0, '#ffffff'],
        [0.6, '#e8e4dc'],
        [1, '#a8a090'],
      ]);
      g.fill();
    };
    for (let i = 0; i < 13; i++) {
      const u = i / 12;
      const tx = x - 78 + u * 158;
      const ty = y - 16 + Math.sin(u * Math.PI) * 6 - (u > 0.9 ? 4 : 0);
      tooth(tx, ty - 2, 13 + Math.sin(u * Math.PI) * 6, true, 5.2);
    }
    for (let i = 0; i < 10; i++) {
      const u = i / 9;
      const tx = x - 60 + u * 122;
      const ty = y + 28 - Math.sin(u * Math.PI) * 0 - (Math.abs(u - 0.5) * 22);
      tooth(tx, ty + 4, 10 + Math.sin(u * Math.PI) * 5, false, 4.6);
    }
    // ropes of saliva across the maw
    for (const [x0, x1] of [[x - 40, x - 10], [x + 30, x + 56]]) softStroke(g, (c) => {
      c.moveTo(x0, y - 4);
      c.quadraticCurveTo((x0 + x1) / 2, y + 20, x1, y);
    }, rgba('#e8d8f0', 0.55), 1.6, 0.4);
  });
  if (!o.live) nomTongue(g, 0.4, pink);
  // goo drips hanging off the lobes
  for (const [x, y, l] of [[CX - 54, 262, 10], [CX + 36, 264, 8], [CX - 84, 254, 6]] as const) {
    lifted(g, (c) => {
      c.beginPath();
      c.ellipse(x, y + l * 0.3, 5, l * 0.6, 0, 0, Math.PI * 2);
    }, skin, 0.2);
    glint(g, x - 2, y, 2, 0.7);
  }
  lightAll(sil, 0.3, 20, 0.85);
  sil.finish('#050408', { openTop: -6 });
  // the tendrils whip in play; in a still they hang off the sides, over the outline
  if (!o.live) NOM_TENDS.forEach((t) => paintTendril(ctx, t.side, t.at, skin));
}

registerStyle('venomnom', {
  contactY: NOM_MOUTH.contact,
  halfWidth: 114,
  rig: { from: 226, to: 244 },
  leg: { kind: 'skin', hw: 64, join: 'blend', fade: 26 },
  parts: {
    eyes: {
      box: { x: CX - 96, y: 90, w: 198, h: 70 },
      frames: 4,
      draw: (g, art, i) => nomEyes(g, [0, 0.45, 0.8, 1][i], art.skin),
    },
    tongue: {
      box: { x: NOM_MOUTH.x - 30, y: NOM_MOUTH.y - 6, w: 90, h: 90 },
      frames: 2,
      draw: (g, art, i) => nomTongue(g, i ? 1 : 0.4, (art.extra?.tongue as string) ?? '#e0507a'),
    },
    tendL: {
      box: { x: NOM_TENDS[0].at[0] - 84, y: NOM_TENDS[0].at[1] - 84, w: 168, h: 168 },
      frames: 1,
      pivot: NOM_TENDS[0].at,
      draw: (g, art) => paintTendril(g, -1, NOM_TENDS[0].at, art.skin),
    },
    tendR: {
      box: { x: NOM_TENDS[1].at[0] - 84, y: NOM_TENDS[1].at[1] - 84, w: 168, h: 168 },
      frames: 1,
      pivot: NOM_TENDS[1].at,
      draw: (g, art) => paintTendril(g, 1, NOM_TENDS[1].at, art.skin),
    },
  },
  draw(ctx, art, p, o) {
    drawVenomnom(ctx, art, p, o);
  },
});

// ════════════════════════════ THE CHEETOE ════════════════════════════

const cheeUpper = (flex: number): PathFn => (c) => {
  const b = 250 - flex * 6;
  c.beginPath();
  c.moveTo(CX - 50, -8);
  c.bezierCurveTo(CX - 52, 40, CX - 70, 90, CX - 92, 150);
  c.bezierCurveTo(CX - 104, 190, CX - 100, b - 10, CX - 70, b);
  c.lineTo(CX + 70, b);
  c.bezierCurveTo(CX + 100, b - 10, CX + 104, 190, CX + 92, 150);
  c.bezierCurveTo(CX + 70, 90, CX + 52, 40, CX + 50, -8);
  c.closePath();
};

const cheeSole = (flex: number): PathFn => (c) => {
  const b = 266 - flex * 5;
  c.beginPath();
  c.moveTo(CX - 100, 226);
  c.bezierCurveTo(CX - 106, 244, CX - 100, b, CX - 74, b);
  c.lineTo(CX + 74, b);
  c.bezierCurveTo(CX + 100, b, CX + 106, 244, CX + 100, 226);
  c.quadraticCurveTo(CX, 244, CX - 100, 226);
  c.closePath();
};

const CHEE_CLAWS: [number, number, number][] = [
  [CX - 48, 252, 0.25],
  [CX - 16, 256, 0.08],
  [CX + 16, 256, -0.08],
  [CX + 48, 252, -0.25],
];

const CHEE_TAIL: Pt = [CX - 86, 176];

function tailPts(): Pt[] {
  return arcPts(CHEE_TAIL[0], CHEE_TAIL[1], -Math.PI * 0.75, 170, 1.9, 22);
}

function paintTail(g: Ctx, fur: string, dark: string): void {
  const pts = tailPts();
  const path = tube(pts, (s) => 10 - s * 3);
  partSil(g, [path], { x: CHEE_TAIL[0] - 110, y: CHEE_TAIL[1] - 200, w: 180, h: 220 }, (pg) => {
    path(pg);
    pg.fillStyle = fur;
    pg.fill();
    const r = rng(641);
    clip(pg, path, () => {
      furCoat(pg, r, { x: CHEE_TAIL[0] - 110, y: CHEE_TAIL[1] - 200, w: 180, h: 220 }, () => -Math.PI / 2 + (r() - 0.5), fur, shade(fur, -0.5), { n: 0.6, len: 8 });
      // spots, then dark rings round the tip
      pts.forEach(([x, y], i) => {
        if (i > 16) {
          pg.fillStyle = rgba(dark, 0.9);
          if (i % 2 === 0) {
            pg.beginPath();
            pg.arc(x, y, 11, 0, Math.PI * 2);
            pg.fill();
          }
        } else if (i % 3 === 1) {
          pg.fillStyle = rgba(dark, 0.85);
          pg.beginPath();
          pg.ellipse(x + (i % 2 ? 3 : -3), y, 3.2, 2.4, 0, 0, Math.PI * 2);
          pg.fill();
        }
      });
      for (let i = 0; i < pts.length - 1; i++) {
        const [x, y] = pts[i];
        pg.fillStyle = rgba('#ffffff', 0.12);
        pg.beginPath();
        pg.arc(x + LX * 5, y + LY * 5, 3, 0, Math.PI * 2);
        pg.fill();
      }
    });
  }, inkOf(fur), { rim: 0.6, form: 0.4 });
}

/** Green cat eyes with slit pupils: `shut` 0 open … 1 shut. */
function cheeEyes(g: Ctx, fur: string, shut: number): void {
  for (const s of [-1, 1]) {
    const x = CX + s * 30;
    const y = 146;
    const eye: PathFn = (c) => {
      c.beginPath();
      c.moveTo(x - 15, y + s * 0);
      c.quadraticCurveTo(x, y - 13, x + 15, y - 2 * s);
      c.quadraticCurveTo(x, y + 12, x - 15, y);
      c.closePath();
    };
    contact(g, (c) => {
      eye(c);
      c.fill();
    }, 0.55, 1.5, 2.5);
    eye(g);
    g.fillStyle = rad(g, x, y, 1, x, y, 15, [
      [0, '#f6ff9a'],
      [0.45, '#8ae04a'],
      [1, '#2a7a1a'],
    ]);
    g.fill();
    clip(g, eye, () => {
      g.fillStyle = '#080604';
      g.beginPath();
      g.ellipse(x, y, 2.6, 10, 0, 0, Math.PI * 2);
      g.fill();
      spec(g, x - 5, y - 4, 4, 2.6, 0.95, -0.4);
      if (shut > 0) {
        g.fillStyle = lin(g, 0, y - 12, 0, y + 12, [
          [0, shade(fur, -0.1)],
          [1, shade(fur, -0.35)],
        ]);
        g.fillRect(x - 16, y - 13, 32, 25 * shut);
      }
    });
    eye(g);
    g.strokeStyle = '#1a0e06';
    g.lineWidth = 2.2;
    g.stroke();
    // the dark tear line down from the inner corner, cheetah-style
    if (shut < 1)
      softStroke(g, (c) => {
        c.moveTo(x - s * 13, y + 4);
        c.quadraticCurveTo(x - s * 16, y + 22, x - s * 12, y + 38);
      }, rgba('#1a0e06', 0.85), 2.6, 0.6);
  }
}

function cheeWhiskers(g: Ctx, twitch: number): void {
  g.save();
  g.lineCap = 'round';
  for (const s of [-1, 1])
    for (let k = 0; k < 3; k++) {
      const x0 = CX + s * 22;
      const y0 = 186 + k * 6;
      const a = (k - 1) * 0.16 + twitch * 0.1 * s;
      const x1 = x0 + s * 100 * Math.cos(a);
      const y1 = y0 + 100 * Math.sin(a) * 0.6 - 6 + twitch * -4;
      g.strokeStyle = rgba('#2a1a10', 0.5);
      g.lineWidth = 2.4;
      g.beginPath();
      g.moveTo(x0 + 1, y0 + 1.5);
      g.quadraticCurveTo((x0 + x1) / 2 + 1, y0 - 8 + 1.5, x1 + 1, y1 + 1.5);
      g.stroke();
      g.strokeStyle = rgba('#fffaf0', 0.95);
      g.lineWidth = 1.3;
      g.beginPath();
      g.moveTo(x0, y0);
      g.quadraticCurveTo((x0 + x1) / 2, y0 - 8, x1, y1);
      g.stroke();
    }
  g.restore();
}

function drawCheetoe(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const fur = art.primary ?? '#f09a2a';
  const dark = art.secondary ?? '#2a1810';
  const claw = (art.extra?.claw as string) ?? '#fff6e8';
  const flex = Math.max(0, p.curl);
  const upper = cheeUpper(flex);
  const sole = cheeSole(flex);
  const d = flex * 5;
  const claws = CHEE_CLAWS.map(([x, y, a]) => clawPath(x, y - d, Math.PI / 2 + a, 30 - flex * 8, 12, -a));
  const box = { x: CX - 116, y: -10, w: 232, h: 296 };
  const sil = new Sil(ctx, [upper, sole, ...claws], box);
  const g = sil.g;
  if (o.heat) {
    heatLayer(sil, box, { seed: 641, y0: 266, y1: 30 });
    return;
  }
  if (o.emissive) {
    for (const s of [-1, 1]) glowDot(g, CX + s * 30, 146, 18, '#b8ff5a', 0.55);
    glowFinish(sil);
    return;
  }
  sil.form({ base: fur, shadowTint: '#5a1a08', ramp: 0.7, form: 0.5, formSize: 30, bevel: 0.3, rim: 0.5 });
  const r = rng(642);
  clip(g, upper, () => {
    furCoat(g, r, { x: CX - 104, y: -10, w: 208, h: 262 }, (x, y) => Math.PI / 2 + ((x - CX) / 100) * 0.7 - (y > 170 ? (x - CX) / 300 : 0), fur, mix(shade(fur, -0.55), '#5a1a08', 0.3), { n: 1.2, len: 9, w: 0.9 });
    // cheese dust: bright orange specks
    for (let i = 0; i < 140; i++) {
      g.fillStyle = rgba(i % 3 ? '#ffc060' : '#ff7a10', 0.55);
      g.beginPath();
      g.arc(CX - 100 + r() * 200, r() * 250, 0.8 + r() * 1.4, 0, Math.PI * 2);
      g.fill();
    }
    // the white muzzle and chin
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(CX, 196, 44, 30, 0, 0, Math.PI * 2);
    }, rgba('#fff6e8', 0.95), 6);
    furCoat(g, r, { x: CX - 44, y: 170, w: 88, h: 50 }, (x) => Math.PI / 2 + ((x - CX) / 40) * 0.9, '#fff6e8', '#c8a890', { n: 0.08, len: 7, w: 0.8 });
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(CX, 120, 30, 46, 0, 0, Math.PI * 2);
    }, rgba(shade(fur, 0.25), 0.5), 10);
    // rosettes: broken dark rings round a deeper orange, kept off the face
    const ros: [number, number, number][] = [[CX - 26, 16, 13], [CX + 28, 36, 12], [CX - 52, 66, 14], [CX + 50, 92, 14], [CX - 2, 74, 11], [CX - 74, 120, 13], [CX + 76, 142, 14], [CX - 82, 196, 12], [CX + 84, 204, 12], [CX + 22, 0, 10], [CX - 40, 112, 9], [CX + 30, 120, 8]];
    for (const [x, y, rr] of ros) {
      g.fillStyle = rgba(shade(fur, -0.25), 0.6);
      g.beginPath();
      g.arc(x, y, rr * 0.8, 0, Math.PI * 2);
      g.fill();
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + r();
        g.fillStyle = rgba(dark, 0.9);
        g.beginPath();
        g.ellipse(x + Math.cos(a) * rr, y + Math.sin(a) * rr, rr * 0.42, rr * 0.28, a + Math.PI / 2, 0, Math.PI * 2);
        g.fill();
      }
    }
    // the nose and mouth
    const nose: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 9, 172);
      c.quadraticCurveTo(CX, 168, CX + 9, 172);
      c.quadraticCurveTo(CX + 2, 184, CX, 184);
      c.quadraticCurveTo(CX - 2, 184, CX - 9, 172);
      c.closePath();
    };
    lifted(g, nose, lin(g, 0, 168, 0, 184, [
      [0, '#ffa8b8'],
      [1, '#c85a70'],
    ]), 0.45, 1.5, 2);
    spec(g, CX - 3, 173, 3.5, 1.8, 0.8, 0);
    g.strokeStyle = '#2a1408';
    g.lineWidth = 2;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(CX, 184);
    g.lineTo(CX, 192);
    g.moveTo(CX - 14, 194);
    g.quadraticCurveTo(CX - 6, 200, CX, 192);
    g.quadraticCurveTo(CX + 6, 200, CX + 14, 194);
    g.stroke();
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
      g.fillStyle = rgba('#3a2010', 0.6);
      g.beginPath();
      g.arc(CX + s * (18 + k * 6), 186 + (k % 2) * 4, 1.2, 0, Math.PI * 2);
      g.fill();
    }
    // a fang peeking out
    g.fillStyle = '#fffaf0';
    g.beginPath();
    g.moveTo(CX + 6, 196);
    g.lineTo(CX + 9, 205);
    g.lineTo(CX + 11, 195);
    g.closePath();
    g.fill();
  });
  if (!o.live) cheeEyes(g, fur, 0);
  // the white rubber toe and sole
  clip(g, sole, () => {
    g.fillStyle = lin(g, 0, 214, 0, 268, [
      [0, '#ffffff'],
      [0.5, '#ece6dc'],
      [1, '#a8a098'],
    ]);
    g.fillRect(box.x, 208, box.w, 64);
    texture(g, 'rubber', box, 0.3);
    for (let i = 0; i < 9; i++) {
      g.fillStyle = rgba('#7a6a5a', 0.3);
      g.fillRect(CX - 80 + i * 20, 256 - d, 2, 10);
    }
  });
  crease(g, (c) => {
    c.moveTo(CX - 100, 228);
    c.quadraticCurveTo(CX, 246 - d, CX + 100, 228);
  }, 2.4, '#5a3a1a', 0.6, 0.3);
  stitches(g, (c) => {
    c.moveTo(CX - 98, 236);
    c.quadraticCurveTo(CX, 254 - d, CX + 98, 236);
  }, rgba('#d87a2a', 0.7), 1.3, 3, 2.5);
  CHEE_CLAWS.forEach(([x, y, a]) => paintClaw(g, x, y - d, Math.PI / 2 + a, 30 - flex * 8, 12, -a, claw, '#8a7a60'));
  lightAll(sil, 0.3, 20, 0.5);
  sil.finish(inkOf(fur), { openTop: -6 });
  if (!o.live) {
    cheeWhiskers(ctx, 0);
    paintTail(ctx, fur, dark);
  }
}

registerStyle('cheetoe', {
  contactY: 270,
  halfWidth: 106,
  rig: { from: 214, to: 234 },
  leg: { kind: 'fur', hw: 50, join: 'blend', fade: 24 },
  parts: {
    tail: {
      box: { x: CHEE_TAIL[0] - 112, y: CHEE_TAIL[1] - 202, w: 184, h: 224 },
      frames: 1,
      pivot: CHEE_TAIL,
      draw: (g, art) => paintTail(g, art.primary ?? '#f09a2a', art.secondary ?? '#2a1810'),
    },
    eyes: {
      box: { x: CX - 50, y: 128, w: 100, h: 60 },
      frames: 4,
      draw: (g, art, i) => cheeEyes(g, art.primary ?? '#f09a2a', [0, 0.45, 0.8, 1][i]),
    },
    whiskers: {
      box: { x: CX - 128, y: 160, w: 256, h: 60 },
      frames: 2,
      draw: (g, _art, i) => cheeWhiskers(g, i),
    },
  },
  draw(ctx, art, p, o) {
    drawCheetoe(ctx, art, p, o);
  },
});
