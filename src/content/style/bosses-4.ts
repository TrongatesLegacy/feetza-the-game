// Mini-bosses in the style kit (batch C), part 4.
// - THE PIGEON KING: a ruff of layered slate feathers with an iridescent collar, a scaly pink pigeon foot under it
//   with three splayed toes and black claws, and a gold crown ringing its shin. Feathers drift off it in play.
// - JELLYFISH FLIP-FLOP: a bare foot on a translucent jelly flip-flop that glows, a jelly strap with a violet gem and
//   glowing tentacles trailing under the sole (they sway and pulse in play; it drips and bubbles).
// - MILKSHAKE MAX: a fluted sundae glass of strawberry shake on a pedestal, beaded with condensation, a swirl of
//   whipped cream with sprinkles and a cherry on top (the cherry wobbles in play; drips run down the glass).
// - THE LUMBERJACK: a hobnailed leather work boot with red laces, a buffalo-check flannel cuff and an axe strapped
//   to it (the axe swings in play; wood chips fly as it winds up).
// - THE ZOMBIE LOAFER: a rotting penny loafer, its sole torn open into a toothy mouth, mould and stitches, a tarnished
//   penny, an eyeball hanging by a thread and flies (in play the eye swings, it drools and its tongue licks).

import type { FootArt } from '../../data/feet';
import { CX } from '../../art/feetCommon';
import { bareOutline, paintBare } from '../../art/style/bare';
import { LIGHT, type PathFn, type Pose, crease, glint, inkOf, softFill, softStroke, spec, texture, vnoise } from '../../art/style/kit';
import { Sil, lobe } from '../../art/style/sil';
import { type PartDef, registerStyle } from '../../art/style/registry';
import { beadEye, blotches, contact, eyelet, laceRun, paintClaw, clawPath, rivet, stitches } from '../../art/style/details';
import { LX, LY, clip, fill, glowDot, glowFinish, goldRamp, heatLayer, lightAll, lin, rad, streak } from '../../art/style/kit-bosses';
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

/** A tapered limb along points (toes, tentacles): left side out, right side back, a round tip. */
function limbPath(pts: [number, number][], w: (s: number) => number): PathFn {
  return (c) => {
    const L: [number, number][] = [];
    const Rr: [number, number][] = [];
    pts.forEach(([x, y], j) => {
      const [nx, ny] = pts[Math.min(j + 1, pts.length - 1)];
      const [qx, qy] = pts[Math.max(j - 1, 0)];
      const d = Math.hypot(nx - qx, ny - qy) || 1;
      const ww = w(j / (pts.length - 1));
      L.push([x + (-(ny - qy) / d) * ww, y + ((nx - qx) / d) * ww]);
      Rr.push([x - (-(ny - qy) / d) * ww, y - ((nx - qx) / d) * ww]);
    });
    c.beginPath();
    L.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y)));
    for (let j = Rr.length - 1; j >= 0; j--) c.lineTo(Rr[j][0], Rr[j][1]);
    c.closePath();
    const [ex, ey] = pts[pts.length - 1];
    const er = w(1);
    c.moveTo(ex + er, ey);
    c.arc(ex, ey, er, 0, Math.PI * 2);
  };
}

function curve(x0: number, y0: number, a0: number, len: number, bend: number, n = 14): [number, number][] {
  const pts: [number, number][] = [];
  let x = x0;
  let y = y0;
  for (let j = 0; j <= n; j++) {
    pts.push([x, y]);
    const a = a0 + bend * (j / n);
    x += Math.cos(a) * (len / n);
    y += Math.sin(a) * (len / n);
  }
  return pts;
}

// ════════════════════════════ THE PIGEON KING ════════════════════════════

const ruffPath: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 60, -6);
  c.bezierCurveTo(CX - 66, 30, CX - 96, 60, CX - 98, 110);
  // the scalloped hem of the lowest feathers
  for (let i = 0; i <= 8; i++) {
    const x = CX - 98 + i * 24.5;
    c.quadraticCurveTo(x - 12, 156 - Math.abs(i - 4) * 4, x, 132 - Math.abs(i - 4) * 3);
  }
  c.bezierCurveTo(CX + 98, 60, CX + 66, 30, CX + 60, -6);
  c.closePath();
};

const tarsus: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 22, 120);
  c.lineTo(CX - 26, 206);
  c.quadraticCurveTo(CX, 224, CX + 26, 206);
  c.lineTo(CX + 22, 120);
  c.closePath();
};

function pigeonToes(p: Pose): [number, number][][] {
  const c = Math.max(0, p.curl);
  const sp = Math.max(0, -p.curl);
  return [
    [Math.PI * 0.8, 0.22],
    [Math.PI * 0.5, 0.05],
    [Math.PI * 0.2, -0.22],
  ].map(([a, b], i) => {
    const w = p.wiggle[i + 1] ?? 0;
    const spread = (a - Math.PI / 2) * (1 + sp * 0.3 - c * 0.25);
    return curve(CX, 206, Math.PI / 2 + spread, (i === 1 ? 92 : 86) * (1 - c * 0.25), b * (1 + c * 2) + w * 0.15);
  });
}

function paintRuff(g: Ctx, slate: string, box: { x: number; y: number; w: number; h: number }): void {
  const r = rng(hashStr('pigeon-feathers'));
  clip(g, ruffPath, () => {
    g.fillStyle = shade(slate, -0.2);
    g.fillRect(box.x, box.y, box.w, 170);
    // rows of overlapping feathers, bottom row first so upper rows lie over them
    for (let row = 6; row >= 0; row--) {
      const y = 10 + row * 20;
      const n = 6 + row;
      const w = 30 + row * 3;
      for (let i = 0; i <= n; i++) {
        const x = CX - (n * w * 0.5) / 1.3 + (i * w) / 1.3 + (row % 2 ? w * 0.35 : 0) + (r() - 0.5) * 4;
        const fe: PathFn = (c) => {
          c.beginPath();
          c.moveTo(x - w * 0.5, y);
          c.quadraticCurveTo(x - w * 0.55, y + 22, x, y + 30);
          c.quadraticCurveTo(x + w * 0.55, y + 22, x + w * 0.5, y);
          c.closePath();
        };
        contact(g, (c) => {
          fe(c);
          c.fill();
        }, 0.4, 2, 2.5);
        const tone = shade(slate, (r() - 0.5) * 0.15 - row * 0.02);
        fill(g, fe, lin(g, x - w * 0.5, y, x + w * 0.5, y + 30, [
          [0, shade(tone, 0.3)],
          [0.5, tone],
          [1, shade(tone, -0.4)],
        ]));
        // the shaft and the dark bar near the tip (rock-dove bars on the lower rows)
        g.strokeStyle = rgba('#ffffff', 0.25);
        g.lineWidth = 0.9;
        g.beginPath();
        g.moveTo(x, y + 2);
        g.lineTo(x, y + 26);
        g.stroke();
        if (row >= 4) {
          g.save();
          fe(g);
          g.clip();
          g.fillStyle = rgba('#1a1a2a', 0.5);
          g.fillRect(x - w, y + 18, w * 2, 5);
          g.restore();
        }
      }
    }
    // the iridescent collar: green into violet, shot with light
    g.fillStyle = lin(g, CX - 90, 0, CX + 90, 60, [
      [0, rgba('#4ad89a', 0.55)],
      [0.4, rgba('#2a8a6a', 0.35)],
      [0.6, rgba('#9a4ad8', 0.45)],
      [1, rgba('#5a2a9a', 0.55)],
    ]);
    g.globalCompositeOperation = 'overlay';
    g.fillRect(box.x, -8, box.w, 60);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = lin(g, 0, 40, 0, 60, [
      [0, rgba('#000000', 0)],
      [1, rgba('#000000', 0)],
    ]);
    spec(g, CX - 36, 20, 30, 10, 0.4, -0.2, '#c8ffe8');
  });
}

function drawPigeon(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const pink = art.skin;
  const slate = art.primary ?? '#8f93ad';
  const gold = art.secondary ?? '#ffcf3a';
  const toes = pigeonToes(p);
  const c = Math.max(0, p.curl);
  const toeW = (s: number) => 20 - s * 8;
  const claws = toes.map((pts) => {
    const [x, y] = pts[pts.length - 1];
    const [px, py] = pts[pts.length - 2];
    return { x, y, ang: Math.atan2(y - py, x - px), len: 24 * (1 + c * 0.4), w: 13 };
  });
  const box = { x: CX - 120, y: -8, w: 240, h: 316 };
  const sil = new Sil(ctx, [ruffPath, tarsus, ...toes.map((t) => limbPath(t, toeW)), ...claws.map((k) => clawPath(k.x, k.y, k.ang, k.len, k.w, 0.3))], box);
  const g = sil.g;
  if (o.heat) {
    heatLayer(sil, box, { seed: 121, y0: 300, y1: 0 });
    return;
  }
  sil.form({ base: pink, shadowTint: '#5a1020', ramp: 0.7, form: 0.55, formSize: 16, bevel: 0.4, rim: 0.55 });
  // the scaly pink leg and toes: scutes across them
  const scutes = (pts: [number, number][], w: (s: number) => number) => {
    for (let j = 1; j < pts.length - 1; j += 2) {
      const [x, y] = pts[j];
      const [nx, ny] = pts[j + 1];
      const [qx, qy] = pts[j - 1];
      const d = Math.hypot(nx - qx, ny - qy) || 1;
      const ox = (-(ny - qy) / d) * w(j / (pts.length - 1));
      const oy = ((nx - qx) / d) * w(j / (pts.length - 1));
      crease(g, (cc) => {
        cc.moveTo(x + ox * 0.9, y + oy * 0.9);
        cc.quadraticCurveTo(x + ((nx - qx) / d) * 3, y + ((ny - qy) / d) * 3, x - ox * 0.9, y - oy * 0.9);
      }, 1.4, '#5a1020', 0.5, 0.35);
    }
  };
  for (const t of toes) {
    lobe(g, limbPath(t, toeW), box, 196, 214, '#3a0818', 0.55, 5, 0.35);
    scutes(t, toeW);
    // knuckle pads
    for (const j of [5, 10]) fill(g, ell(t[j][0], t[j][1], 6, 5), rgba(shade(pink, 0.2), 0.6));
  }
  scutes(curve(CX, 122, Math.PI / 2, 86, 0, 12), () => 20);
  for (const k of claws) paintClaw(g, k.x, k.y, k.ang, k.len, k.w, 0.3, '#5a5060', '#0a080e');
  // the feather ruff
  contact(g, (cc) => {
    ruffPath(cc);
    cc.fill();
  }, 0.6, 4, 6);
  paintRuff(g, slate, box);
  // the crown round the shin (a third bigger than drawn: it's what makes him the king, and read too small in play)
  g.save();
  g.translate(CX, 184);
  g.scale(1.38, 1.38);
  g.translate(-CX, -184);
  const crown: PathFn = (cc) => {
    cc.beginPath();
    cc.moveTo(CX - 30, 200);
    cc.lineTo(CX - 34, 164);
    cc.lineTo(CX - 17, 180);
    cc.lineTo(CX, 156);
    cc.lineTo(CX + 17, 180);
    cc.lineTo(CX + 34, 164);
    cc.lineTo(CX + 30, 200);
    cc.quadraticCurveTo(CX, 208, CX - 30, 200);
    cc.closePath();
  };
  raised(g, crown, goldRamp(g, CX - 34, 156, CX + 34, 206, gold), 0.55);
  for (const [x, y, col] of [[CX - 17, 194, '#e8402f'], [CX, 196, '#3a7aff'], [CX + 17, 194, '#39d86a']] as const)
    raised(g, ell(x, y, 3.6, 3.6), rad(g, x - 1, y - 1, 0.3, x, y, 4, [
      [0, '#ffffff'],
      [0.4, col],
      [1, shade(col, -0.5)],
    ]), 0.4);
  glint(g, CX - 22, 172, 5, 0.9);
  g.restore();
  lightAll(sil, 0.38, 16, 0.55);
  sil.finish(inkOf(slate), { openTop: -5 });
}

registerStyle('pigeonking', {
  portraitLeg: 20,
  contactY: 296,
  halfWidth: 90,
  rig: { from: 196, to: 214 },
  leg: { kind: 'fur', hw: 56, join: 'blend', fade: 26 },
  draw(ctx, art, p, o) {
    drawPigeon(ctx, art, p, o);
  },
});

// ════════════════════════════ JELLYFISH FLIP-FLOP ════════════════════════════

/** Tentacles under the sole: root x, length, phase (live parts: they sway). */
export const JELLY_TENTS: [number, number, number][] = [
  [CX - 84, 54, 0],
  [CX - 46, 66, 1],
  [CX - 6, 60, 2],
  [CX + 34, 68, 3],
  [CX + 74, 56, 4],
];
const JELLY_Y = 264;

const jellyTentPath = (i: number): PathFn => {
  const [x, len, ph] = JELLY_TENTS[i];
  const pts: [number, number][] = [];
  for (let j = 0; j <= 12; j++) {
    const t = j / 12;
    pts.push([x + Math.sin(t * 5 + ph) * 6 * t, JELLY_Y - 6 + t * len]);
  }
  return limbPath(pts, (s) => 4.5 - s * 3);
};

function paintJellyTent(g: Ctx, i: number, pink: string, violet: string, k = 1): void {
  const [x, len] = JELLY_TENTS[i];
  clip(g, jellyTentPath(i), () => {
    g.fillStyle = lin(g, 0, JELLY_Y, 0, JELLY_Y + len, [
      [0, rgba(pink, 0.85 * k)],
      [1, rgba(violet, 0.5 * k)],
    ]);
    g.fillRect(x - 14, JELLY_Y - 8, 28, len + 12);
  });
}

const jellySole: PathFn = (c) => {
  c.beginPath();
  c.ellipse(CX + 4, 210, 122, 66, 0, 0, Math.PI * 2);
};

function drawJelly(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const pink = art.primary ?? '#ff7ac8';
  const violet = art.secondary ?? '#c8a4ff';
  if (o.emissive || o.heat) {
    // glow-only: the sole's rim, the strap and the tentacles (emissive), or heat over sole and foot
    const s = new Sil(ctx, [jellySole, ...(o.live ? [] : JELLY_TENTS.map((_, i) => jellyTentPath(i)))], { x: CX - 130, y: 140, w: 270, h: 200 });
    if (o.heat) {
      heatLayer(s, { x: CX - 130, y: 140, w: 270, h: 140 }, { seed: 123, y0: 280, y1: 140 });
      const f = paintBare(ctx, { skin: art.skin, nails: null }, p);
      f.sil.g.clearRect(-3000, -3000, 6000, 6000);
      heatLayer(f.sil, f.box, { seed: 125, y0: 270, y1: 0, a: 0.8 });
      return;
    }
    s.edge(rgba(pink, 0.9), 10, 0, 0);
    if (!o.live) JELLY_TENTS.forEach((_, i) => paintJellyTent(s.g, i, pink, violet));
    glowFinish(s);
    const f = paintBare(ctx, { skin: art.skin, nails: null }, p);
    f.sil.g.clearRect(-3000, -3000, 6000, 6000);
    jellyStrap(f.sil.g, pink, violet, true);
    glowFinish(f.sil);
    return;
  }
  // the jelly sole first, under the foot: translucent, glowing at its rim
  const tents = o.live ? [] : JELLY_TENTS.map((_, i) => jellyTentPath(i));
  const js = new Sil(ctx, [jellySole, ...tents], { x: CX - 130, y: 140, w: 270, h: 200 });
  const jg = js.g;
  jg.fillStyle = rad(jg, CX - 30, 190, 10, CX, 210, 130, [
    [0, rgba(mix(pink, '#ffffff', 0.5), 0.55)],
    [0.7, rgba(pink, 0.5)],
    [1, rgba(violet, 0.7)],
  ]);
  jg.fillRect(CX - 140, 130, 290, 210);
  if (!o.live) JELLY_TENTS.forEach((_, i) => paintJellyTent(jg, i, pink, violet));
  js.edge(rgba('#ffffff', 0.7), 6, 0, 0, 'screen');
  js.edge(rgba(violet, 0.6), 2.5, LX * 3, LY * 3);
  // little bubbles caught in the jelly
  const r = rng(hashStr('jelly-bubbles'));
  for (let i = 0; i < 18; i++) {
    const a = r() * Math.PI * 2;
    const d = 0.75 + r() * 0.2;
    const x = CX + 4 + Math.cos(a) * 118 * d;
    const y = 210 + Math.sin(a) * 62 * d;
    jg.strokeStyle = rgba('#ffffff', 0.6);
    jg.lineWidth = 1;
    jg.beginPath();
    jg.arc(x, y, 1.5 + r() * 2.5, 0, Math.PI * 2);
    jg.stroke();
  }
  js.finish(rgba(shade(violet, -0.5), 0.9), { inner: 0.2 });
  // the foot on top, then the strap over it
  const f = paintBare(ctx, { skin: art.skin, nails: art.nails ?? mix(pink, '#ffffff', 0.2) }, p);
  // a jelly sheen reflected up onto the foot
  softFill(f.sil.g, ell(CX, 250, 110, 24), rgba(pink, 0.18), 10);
  jellyStrap(f.sil.g, pink, violet, false);
  bareOutline(f);
}

function jellyStrap(g: Ctx, pink: string, violet: string, glowOnly: boolean): void {
  const gem = { x: CX + 22, y: 164 };
  const arm = (x0: number, y0: number): PathFn => (c) => {
    c.beginPath();
    c.moveTo(gem.x - 6, gem.y);
    c.quadraticCurveTo((gem.x + x0) / 2, (gem.y + y0) / 2 - 22, x0, y0 - 8);
    c.lineTo(x0, y0 + 10);
    c.quadraticCurveTo((gem.x + x0) / 2, (gem.y + y0) / 2 + 2, gem.x + 6, gem.y + 8);
    c.closePath();
  };
  const post: PathFn = (c) => {
    c.beginPath();
    c.moveTo(gem.x - 5, gem.y);
    c.lineTo(CX + 64, 226);
    c.lineTo(CX + 74, 224);
    c.lineTo(gem.x + 6, gem.y);
    c.closePath();
  };
  for (const pth of [arm(CX - 106, 150), arm(CX + 112, 140), post]) {
    if (glowOnly) {
      fill(g, pth, rgba(pink, 0.6));
      continue;
    }
    contact(g, (c) => {
      pth(c);
      c.fill();
    }, 0.4, 2.5, 3);
    fill(g, pth, lin(g, CX - 100, 120, CX + 100, 200, [
      [0, rgba(mix(pink, '#ffffff', 0.4), 0.85)],
      [0.5, rgba(pink, 0.75)],
      [1, rgba(shade(pink, -0.3), 0.85)],
    ]));
    clip(g, pth, () => {
      streak(g, (c) => {
        c.moveTo(gem.x - 10, gem.y - 8);
        c.quadraticCurveTo(CX - 30, 130, CX - 100, 140);
      }, 1.5, 0.7);
    });
  }
  if (glowOnly) {
    glowDot(g, gem.x, gem.y, 20, violet, 0.9);
    return;
  }
  raised(g, ell(gem.x, gem.y, 12, 11), rad(g, gem.x - 4, gem.y - 4, 1, gem.x, gem.y, 13, [
    [0, '#ffffff'],
    [0.3, mix(violet, '#ffffff', 0.3)],
    [0.8, violet],
    [1, shade(violet, -0.5)],
  ]), 0.55);
  glint(g, gem.x - 4, gem.y - 4, 4.5, 1);
}

registerStyle('jellyfish', {
  contactY: 268,
  halfWidth: 122,
  rig: { from: 140, to: 162 },
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 24 },
  parts: Object.fromEntries(
    JELLY_TENTS.map(([x, len], i) => [
      `tent${i}`,
      {
        box: { x: x - 16, y: JELLY_Y - 10, w: 32, h: len + 16 },
        frames: 1,
        pivot: [x, JELLY_Y - 6],
        draw: (g: Ctx, art: FootArt) => {
          const pink = art.primary ?? '#ff7ac8';
          const s = new Sil(g, [jellyTentPath(i)], { x: x - 16, y: JELLY_Y - 10, w: 32, h: len + 16 });
          paintJellyTent(s.g, i, pink, art.secondary ?? '#c8a4ff');
          s.edge(rgba('#ffffff', 0.5), 2, 0, 0, 'screen');
          s.finish(rgba(shade(art.secondary ?? '#c8a4ff', -0.5), 0.8), { w: 2.5, inner: 0 });
        },
      } as PartDef,
    ]),
  ),
  draw(ctx, art, p, o) {
    drawJelly(ctx, art, p, o);
  },
});

// ════════════════════════════ MILKSHAKE MAX ════════════════════════════

export const CHERRY = { x: CX + 6, y: 18 };

const glassPath: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 108, 40);
  c.bezierCurveTo(CX - 110, 120, CX - 70, 210, CX - 30, 236);
  c.lineTo(CX - 12, 250);
  c.lineTo(CX - 12, 258);
  c.bezierCurveTo(CX - 60, 262, CX - 78, 270, CX - 76, 276);
  c.lineTo(CX + 76, 276);
  c.bezierCurveTo(CX + 78, 270, CX + 60, 262, CX + 12, 258);
  c.lineTo(CX + 12, 250);
  c.lineTo(CX + 30, 236);
  c.bezierCurveTo(CX + 70, 210, CX + 110, 120, CX + 108, 40);
  c.closePath();
};

const creamPath: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 114, 52);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const x0 = CX - 114 + (i * 228) / n;
    const x1 = CX - 114 + ((i + 1) * 228) / n;
    c.bezierCurveTo(x0, 10 + (i % 2) * 6, x1, 10 + ((i + 1) % 2) * 6, x1, 46 + (i % 3) * 4);
  }
  c.bezierCurveTo(CX + 100, 72, CX + 60, 64, CX + 40, 74);
  c.bezierCurveTo(CX + 30, 92, CX + 16, 92, CX + 12, 70);
  c.bezierCurveTo(CX - 20, 66, CX - 60, 74, CX - 76, 70);
  c.bezierCurveTo(CX - 84, 90, CX - 98, 88, CX - 100, 66);
  c.closePath();
};

const cherryPath: PathFn = (c) => {
  const { x, y } = CHERRY;
  c.beginPath();
  c.arc(x, y + 4, 15, 0, Math.PI * 2);
  c.moveTo(x + 2, y - 8);
  c.quadraticCurveTo(x + 10, y - 22, x + 22, y - 26);
  c.lineTo(x + 23, y - 23);
  c.quadraticCurveTo(x + 12, y - 19, x + 5, y - 8);
  c.closePath();
};

function paintCherry(g: Ctx, red: string): void {
  const { x, y } = CHERRY;
  fill(g, ell(x, y + 4, 15, 15), rad(g, x - 5, y - 2, 1, x, y + 4, 16, [
    [0, mix(red, '#ffffff', 0.4)],
    [0.4, red],
    [1, shade(red, -0.6)],
  ]));
  g.strokeStyle = '#4a7a2a';
  g.lineWidth = 2.6;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x + 3, y - 8);
  g.quadraticCurveTo(x + 10, y - 20, x + 22, y - 24);
  g.stroke();
  spec(g, x - 5, y - 2, 6, 4, 0.95, -0.5);
  glint(g, x - 5, y - 2, 3.5, 1);
}

function drawShake(ctx: Ctx, art: FootArt, _p: Pose, o: Opts): void {
  const shake = art.primary ?? '#ff9fc8';
  const red = art.secondary ?? '#e5242f';
  const box = { x: CX - 122, y: -8, w: 244, h: 290 };
  const sil = new Sil(ctx, [glassPath, creamPath, ...(o.live ? [] : [cherryPath])], box);
  const g = sil.g;
  if (o.heat) {
    heatLayer(sil, box, { seed: 127, y0: 280, y1: 0 });
    return;
  }
  // the glass: clear, so the shake shows through, with flutes and condensation
  clip(g, glassPath, () => {
    g.fillStyle = lin(g, CX - 108, 0, CX + 108, 0, [
      [0, shade(shake, -0.1)],
      [0.3, mix(shake, '#ffffff', 0.25)],
      [0.65, shake],
      [1, shade(shake, -0.35)],
    ]);
    g.fillRect(box.x, 30, box.w, 220);
    // tiny bubbles and a swirl of syrup in the shake
    const r = rng(hashStr('shake-bubbles'));
    for (let i = 0; i < 60; i++) fill(g, ell(CX - 90 + r() * 180, 60 + r() * 170, 1 + r() * 1.6, 1 + r() * 1.6), rgba('#ffffff', 0.35));
    softStroke(g, (c) => {
      c.moveTo(CX - 60, 80);
      c.bezierCurveTo(CX + 60, 110, CX - 70, 150, CX + 30, 200);
    }, rgba(red, 0.3), 6, 3);
    // the glass's flutes: vertical bands of refraction
    for (let i = -4; i <= 4; i++) {
      const x = CX + i * 24;
      softStroke(g, (c) => {
        c.moveTo(x, 40);
        c.quadraticCurveTo(x * 0.98 + CX * 0.02, 160, CX + i * 8, 236);
      }, rgba('#ffffff', 0.22), 4, 1.5);
      softStroke(g, (c) => {
        c.moveTo(x + 6, 40);
        c.quadraticCurveTo(x + 6, 160, CX + i * 8 + 3, 236);
      }, rgba('#6a1a40', 0.12), 3, 1.5);
    }
    // the stem and the foot: clear glass, catching the light
    g.fillStyle = lin(g, CX - 76, 0, CX + 76, 0, [
      [0, '#c8d8e8'],
      [0.35, '#ffffff'],
      [0.6, '#a8bccc'],
      [1, '#6a7a8a'],
    ]);
    g.fillRect(box.x, 236, box.w, 44);
    // condensation: beads of water on the glass
    for (let i = 0; i < 70; i++) {
      const x = CX - 100 + r() * 200;
      const y = 50 + r() * 180;
      const rr = 1 + r() * 2.4;
      fill(g, ell(x, y, rr, rr * 1.1), rgba('#ffffff', 0.35));
      fill(g, ell(x - rr * 0.3, y - rr * 0.3, rr * 0.4, rr * 0.4), rgba('#ffffff', 0.85));
    }
    streak(g, (c) => {
      c.moveTo(CX - 84, 60);
      c.bezierCurveTo(CX - 86, 120, CX - 60, 190, CX - 34, 226);
    }, 4, 0.55);
  });
  // the glass's rim, a bright line under the cream
  softStroke(g, (c) => {
    c.moveTo(CX - 108, 44);
    c.lineTo(CX + 108, 44);
  }, rgba('#ffffff', 0.7), 3, 1);
  // whipped cream: soft, lit swirls, sprinkles
  contact(g, (c) => {
    creamPath(c);
    c.fill();
  }, 0.4, 3, 5);
  clip(g, creamPath, () => {
    g.fillStyle = lin(g, CX - 110, 10, CX + 110, 80, [
      [0, '#ffffff'],
      [0.6, '#fbf4f0'],
      [1, '#d8c8d0'],
    ]);
    g.fillRect(box.x, -8, box.w, 100);
    for (let i = 0; i < 7; i++) {
      const x = CX - 98 + i * 32.5;
      lobe(g, ell(x, 36, 22, 18), box, -100, -99, '#8a6a80', 0.35, 6, 0.5);
      crease(g, (c) => {
        c.moveTo(x - 14, 30);
        c.quadraticCurveTo(x, 40, x + 14, 28);
      }, 1.4, '#b8a0b0', 0.4, 0.5);
    }
    const r = rng(hashStr('shake-sprinkles'));
    const cols = ['#ff3d7f', '#3aa0ff', '#ffd23f', '#39d86a', '#b46bff', '#ff8a3a'];
    for (let i = 0; i < 40; i++) {
      const x = CX - 100 + r() * 200;
      const y = 16 + r() * 48;
      const a = r() * Math.PI;
      g.strokeStyle = cols[i % cols.length];
      g.lineWidth = 2.6;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x - Math.cos(a) * 3.5, y - Math.sin(a) * 3.5);
      g.lineTo(x + Math.cos(a) * 3.5, y + Math.sin(a) * 3.5);
      g.stroke();
    }
  });
  if (!o.live) paintCherry(g, red);
  lightAll(sil, 0.3, 18, 0.65);
  sil.finish(inkOf(mix(shake, '#5a3a5a', 0.5)), { openTop: 14, inner: 0.35 });
}

registerStyle('milkshake', {
  contactY: 276,
  halfWidth: 112,
  leg: { kind: 'knit', hw: 60, join: 'into', end: 40 },
  parts: {
    cherry: {
      box: { x: CHERRY.x - 20, y: CHERRY.y - 30, w: 48, h: 56 },
      frames: 1,
      pivot: [CHERRY.x, CHERRY.y + 18],
      draw: (g, art) => {
        const s = new Sil(g, [cherryPath], { x: CHERRY.x - 20, y: CHERRY.y - 30, w: 48, h: 56 });
        paintCherry(s.g, art.secondary ?? '#e5242f');
        s.finish(inkOf(art.secondary ?? '#e5242f'), { inner: 0.3, w: 3.5 });
      },
    },
  },
  draw(ctx, art, p, o) {
    drawShake(ctx, art, p, o);
  },
});

// ════════════════════════════ THE LUMBERJACK ════════════════════════════

export const AXE = { x: CX + 80, y: 30 };

const lumberUpper = (flex: number): PathFn => (c) => {
  const b = 240 - flex * 6;
  c.beginPath();
  c.moveTo(CX - 66, 20);
  c.bezierCurveTo(CX - 70, 70, CX - 104, 110, CX - 104, 170);
  c.bezierCurveTo(CX - 104, b - 14, CX - 64, b, CX, b);
  c.bezierCurveTo(CX + 64, b, CX + 106, b - 14, CX + 106, 170);
  c.bezierCurveTo(CX + 106, 110, CX + 70, 70, CX + 66, 20);
  c.closePath();
};

const lumberSole = (flex: number): PathFn => (c) => {
  const b = 268 - flex * 5;
  c.beginPath();
  c.moveTo(CX - 110, 190);
  c.lineTo(CX - 112, b - 10);
  c.quadraticCurveTo(CX - 110, b, CX - 96, b);
  c.lineTo(CX + 96, b);
  c.quadraticCurveTo(CX + 112, b, CX + 112, b - 10);
  c.lineTo(CX + 110, 190);
  c.closePath();
};

const plaidCuff: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 74, -6);
  c.lineTo(CX + 74, -6);
  c.lineTo(CX + 76, 34);
  c.quadraticCurveTo(CX, 44, CX - 76, 34);
  c.closePath();
};

const axePaths = (): PathFn[] => {
  const { x, y } = AXE;
  return [
    (c) => {
      c.beginPath();
      c.moveTo(x - 4, y - 30);
      c.lineTo(x + 4, y - 30);
      c.lineTo(x + 14, y + 150);
      c.lineTo(x + 4, y + 150);
      c.closePath();
    },
    (c) => {
      c.beginPath();
      c.moveTo(x - 6, y - 26);
      c.lineTo(x + 12, y - 30);
      c.quadraticCurveTo(x + 40, y - 34, x + 46, y - 50);
      c.quadraticCurveTo(x + 56, y - 14, x + 44, y + 22);
      c.quadraticCurveTo(x + 36, y + 6, x + 14, y + 6);
      c.lineTo(x - 4, y + 4);
      c.closePath();
    },
  ];
};

function paintAxe(g: Ctx): void {
  const { x, y } = AXE;
  const [haft, head] = axePaths();
  clip(g, haft, () => {
    g.fillStyle = lin(g, x - 4, 0, x + 14, 0, [
      [0, '#e0b070'],
      [0.5, '#a87040'],
      [1, '#5a3418'],
    ]);
    g.fillRect(x - 10, y - 34, 30, 190);
    texture(g, 'wood', { x: x - 10, y: y - 34, w: 30, h: 190 }, 0.5, 1.2);
  });
  contact(g, (c) => {
    head(c);
    c.fill();
  }, 0.5);
  clip(g, head, () => {
    g.fillStyle = lin(g, x, y - 40, x + 50, y + 20, [
      [0, '#5a6068'],
      [0.6, '#3a3e46'],
      [1, '#1a1c22'],
    ]);
    g.fillRect(x - 10, y - 54, 70, 80);
    texture(g, 'cast', { x: x - 10, y: y - 54, w: 70, h: 80 }, 0.4);
    // the sharpened bit: a bright bevel along the edge
    softStroke(g, (c) => {
      c.moveTo(x + 46, y - 48);
      c.quadraticCurveTo(x + 55, y - 14, x + 44, y + 20);
    }, rgba('#f0f4f8', 0.95), 7, 1);
  });
  glint(g, x + 50, y - 20, 4.5, 1);
}

function drawLumber(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const leather = art.primary ?? '#9a5a2a';
  const red = art.secondary ?? '#c62828';
  const flex = Math.max(0, p.curl);
  const upper = lumberUpper(flex);
  const sole = lumberSole(flex);
  const box = { x: CX - 120, y: -8, w: 260, h: 280 };
  const sil = new Sil(ctx, [sole, upper, plaidCuff, ...(o.live ? [] : axePaths())], box);
  const g = sil.g;
  if (o.heat) {
    heatLayer(sil, box, { seed: 131, y0: 270, y1: 0 });
    return;
  }
  sil.form({ base: leather, shadowTint: '#2a0a08', ramp: 0.8, form: 0.6, formSize: 30, bevel: 0.35, rim: 0.45 });
  // the sole: thick, dark, hobnails round its edge
  clip(g, sole, () => {
    g.fillStyle = lin(g, 0, 190, 0, 270, [
      [0, '#3a2a20'],
      [1, '#100a08'],
    ]);
    g.fillRect(box.x, 180, box.w, 100);
    texture(g, 'leather', box, 0.3);
  });
  for (let i = 0; i <= 14; i++) rivet(g, CX - 98 + i * 14, 262 - flex * 5, 3, '#b8bec8');
  contact(g, (c) => {
    upper(c);
    c.fill();
  }, 0.55, 3, 4);
  clip(g, upper, () => {
    g.fillStyle = lin(g, CX - 100, 20, CX + 100, 230, [
      [0, shade(leather, 0.3)],
      [0.45, leather],
      [1, mix(shade(leather, -0.55), '#2a0a08', 0.3)],
    ]);
    g.fillRect(box.x, 10, box.w, 240);
    texture(g, 'leather', box, 0.28, 1.6);
    // oiled and scuffed: lighter scuffs on the toe, a darker oiled sheen at the edges
    blotches(g, { x: CX - 100, y: 170, w: 200, h: 70 }, shade(leather, 0.3), 0.3, 8, 0.64, 0.12, 133);
    spec(g, CX - 46, 200 - flex * 6, 30, 12, 0.35, -0.3);
    // the toe cap's stitched seam, the vamp's seam, flex creases
    stitches(g, (c) => c.ellipse(CX, 236 - flex * 6, 88, 52, 0, Math.PI + 0.2, -0.2), rgba('#f2c14e', 0.75), 1.7, 4, 3);
    stitches(g, (c) => {
      c.moveTo(CX - 100, 160);
      c.bezierCurveTo(CX - 60, 140, CX - 30, 140, CX - 28, 40);
      c.moveTo(CX + 100, 160);
      c.bezierCurveTo(CX + 60, 140, CX + 30, 140, CX + 28, 40);
    }, rgba('#f2c14e', 0.6), 1.5, 4, 3);
    for (const [y, w] of [[176, 54], [190, 66]] as const) crease(g, (c) => {
      c.moveTo(CX - w, y - flex * 6 + 4);
      c.quadraticCurveTo(CX, y - flex * 10 - 6, CX + w, y - flex * 6 + 4);
    }, 2.4 + flex * 1.5, '#1a0804', 0.35 + flex * 0.3, 0.15);
    // the tongue
    g.fillStyle = lin(g, CX - 26, 0, CX + 26, 0, [
      [0, shade(leather, 0.15)],
      [1, shade(leather, -0.35)],
    ]);
    g.beginPath();
    g.roundRect(CX - 24, 20, 48, 140, 10);
    g.fill();
  });
  const ys = [50, 76, 102, 128, 152];
  for (let i = ys.length - 1; i > 0; i--) for (const s of [-1, 1]) laceRun(g, CX - s * 30, ys[i], CX + s * 30, ys[i - 1], red, 5);
  for (const y of ys) for (const s of [-1, 1]) eyelet(g, CX + s * 31, y, 4.4, '#d8b070');
  // the flannel cuff: red and black buffalo check, soft and fuzzy
  contact(g, (c) => {
    plaidCuff(c);
    c.fill();
  }, 0.55, 3, 5);
  clip(g, plaidCuff, () => {
    g.fillStyle = red;
    g.fillRect(box.x, -8, box.w, 60);
    for (let i = -6; i <= 6; i++) {
      g.fillStyle = rgba('#140808', 0.5);
      g.fillRect(CX + i * 24 - 6, -8, 12, 60);
    }
    for (const y of [0, 24]) {
      g.fillStyle = rgba('#140808', 0.5);
      g.fillRect(box.x, y, box.w, 12);
    }
    g.fillStyle = rgba('#ffffff', 0.08);
    for (let i = -6; i <= 6; i++) g.fillRect(CX + i * 24 + 8, -8, 2, 60);
    texture(g, 'canvas', box, 0.3, 1.2);
    g.fillStyle = lin(g, 0, -6, 0, 44, [
      [0, rgba('#ffffff', 0.12)],
      [0.6, rgba('#000000', 0)],
      [1, rgba('#000000', 0.35)],
    ]);
    g.fillRect(box.x, -8, box.w, 60);
  });
  stitches(g, (c) => {
    c.moveTo(CX - 74, 30);
    c.quadraticCurveTo(CX, 40, CX + 74, 30);
  }, rgba('#f4e0c0', 0.7), 1.4, 3, 2.5);
  if (!o.live) paintAxe(g);
  lightAll(sil, 0.4, 20, 0.5);
  sil.finish(inkOf(leather), { openTop: -5 });
}

registerStyle('lumberjack', {
  contactY: 270,
  halfWidth: 110,
  rig: { from: 160, to: 180 },
  leg: { kind: 'denim', hw: 72, join: 'hem' },
  parts: {
    axe: {
      box: { x: AXE.x - 12, y: AXE.y - 56, w: 74, h: 212 },
      frames: 1,
      pivot: [AXE.x + 4, AXE.y - 10],
      draw: (g) => {
        const s = new Sil(g, axePaths(), { x: AXE.x - 12, y: AXE.y - 56, w: 74, h: 212 });
        paintAxe(s.g);
        s.edge(rgba(LIGHT.rim, 0.5), 2.5, LX * 3, LY * 3);
        s.finish('#1a0e08', { inner: 0.3 });
      },
    },
  },
  draw(ctx, art, p, o) {
    drawLumber(ctx, art, p, o);
  },
});

// ════════════════════════════ THE ZOMBIE LOAFER ════════════════════════════

export const EYEBALL = { x: CX + 96, y: 196 };
const MOUTH_Y = 214;

const loaferUpper = (flex: number): PathFn => (c) => {
  const b = MOUTH_Y + 8 - flex * 4;
  c.beginPath();
  c.moveTo(CX - 70, 6);
  c.bezierCurveTo(CX - 76, 60, CX - 106, 100, CX - 106, 160);
  c.bezierCurveTo(CX - 106, b - 10, CX - 60, b, CX, b - 2);
  c.bezierCurveTo(CX + 60, b, CX + 108, b - 10, CX + 108, 160);
  c.bezierCurveTo(CX + 108, 100, CX + 76, 60, CX + 70, 6);
  c.closePath();
};

/** The sole hanging open like a jaw. */
const loaferJaw = (flex: number): PathFn => (c) => {
  const o = 18 - flex * 10;
  c.beginPath();
  c.moveTo(CX - 104, 188);
  c.bezierCurveTo(CX - 110, MOUTH_Y + o + 30, CX - 60, MOUTH_Y + o + 44, CX, MOUTH_Y + o + 44);
  c.bezierCurveTo(CX + 60, MOUTH_Y + o + 44, CX + 112, MOUTH_Y + o + 30, CX + 106, 188);
  c.closePath();
};

const eyePaths = (): PathFn[] => [
  (c) => {
    c.beginPath();
    c.moveTo(EYEBALL.x - 1, EYEBALL.y - 30);
    c.lineTo(EYEBALL.x + 1, EYEBALL.y - 30);
    c.lineTo(EYEBALL.x + 1.5, EYEBALL.y);
    c.lineTo(EYEBALL.x - 1.5, EYEBALL.y);
    c.closePath();
  },
  ell(EYEBALL.x, EYEBALL.y + 12, 14, 15),
];

function paintEyeball(g: Ctx): void {
  const { x, y } = EYEBALL;
  g.strokeStyle = '#8a2a2a';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x, y - 30);
  g.quadraticCurveTo(x + 3, y - 14, x, y);
  g.stroke();
  fill(g, ell(x, y + 12, 14, 15), rad(g, x - 4, y + 7, 1, x, y + 12, 15, [
    [0, '#fffef0'],
    [0.7, '#e8dcc0'],
    [1, '#a89070'],
  ]));
  g.strokeStyle = rgba('#c82a2a', 0.6);
  g.lineWidth = 0.8;
  for (const a of [0.3, 1.4, 2.6, 4]) {
    g.beginPath();
    g.moveTo(x + Math.cos(a) * 10, y + 10 + Math.sin(a) * 10);
    g.quadraticCurveTo(x + Math.cos(a + 0.3) * 6, y + 10 + Math.sin(a + 0.3) * 6, x + Math.cos(a) * 5, y + 10 + Math.sin(a) * 5);
    g.stroke();
  }
  beadEye(g, x + 3, y + 16, 6.5, 7, '#8a9a2a');
}

/** The tongue: frame 0 in, frame 1 licking out. */
function paintTongue(g: Ctx, out: number): void {
  const t: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 26, MOUTH_Y + 10);
    c.quadraticCurveTo(CX - 30 + out * 40, MOUTH_Y + 22 + out * 20, CX - 8 + out * 50, MOUTH_Y + 30 + out * 18);
    c.quadraticCurveTo(CX + 4 + out * 40, MOUTH_Y + 18 + out * 10, CX + 18, MOUTH_Y + 10);
    c.closePath();
  };
  fill(g, t, lin(g, CX - 30, MOUTH_Y, CX + 40, MOUTH_Y + 40, [
    [0, '#c86a8a'],
    [1, '#6a2040'],
  ]));
  crease(g, (c) => {
    c.moveTo(CX - 4, MOUTH_Y + 12);
    c.quadraticCurveTo(CX + out * 18, MOUTH_Y + 20 + out * 10, CX + out * 36, MOUTH_Y + 28 + out * 12);
  }, 1.4, '#3a0818', 0.5, 0.2);
  spec(g, CX - 10 + out * 20, MOUTH_Y + 16 + out * 8, 6, 3, 0.6, -0.3);
}

function drawZombie(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const green = art.primary ?? '#6a7a52';
  const bone = art.secondary ?? '#9a9a8a';
  const flex = Math.max(0, p.curl);
  const upper = loaferUpper(flex);
  const jaw = loaferJaw(flex);
  const box = { x: CX - 120, y: -8, w: 240, h: 290 };
  const sil = new Sil(ctx, [jaw, upper, ...(o.live ? [] : eyePaths())], box);
  const g = sil.g;
  if (o.heat) {
    heatLayer(sil, box, { seed: 137, y0: 270, y1: 0, hot: '#e8ff8a', mid: '#a8d82a', deep: '#5a7a08' });
    return;
  }
  sil.form({ base: green, shadowTint: '#141a08', ramp: 0.8, form: 0.6, formSize: 30, bevel: 0.3, rim: 0.45 });
  // the jaw: the sole hanging open, a dark mouth, a row of broken teeth (old tacks and bone)
  clip(g, jaw, () => {
    g.fillStyle = lin(g, 0, 188, 0, 280, [
      [0, '#1a0a10'],
      [0.6, '#3a1420'],
      [1, '#2a2a20'],
    ]);
    g.fillRect(box.x, 180, box.w, 100);
    // the sole's tread at the very bottom
    const o2 = 18 - flex * 10;
    g.fillStyle = lin(g, 0, MOUTH_Y + o2 + 30, 0, MOUTH_Y + o2 + 46, [
      [0, '#4a4a3a'],
      [1, '#1a1a14'],
    ]);
    g.fillRect(box.x, MOUTH_Y + o2 + 32, box.w, 20);
    for (let i = 0; i < 9; i++) {
      const x = CX - 72 + i * 18;
      const y = MOUTH_Y + o2 + 30 - Math.abs(i - 4) * 1.5;
      const tooth: PathFn = (c) => {
        c.beginPath();
        c.moveTo(x - 6, y + 4);
        c.lineTo(x - 2 + (i % 3) - 1, y - 10 - (i % 2) * 4);
        c.lineTo(x + 6, y + 4);
        c.closePath();
      };
      fill(g, tooth, lin(g, x, y - 12, x, y + 4, [
        [0, '#f4eed8'],
        [1, mix(bone, '#5a4a2a', 0.4)],
      ]));
    }
  });
  if (!o.live) paintTongue(g, 0);
  contact(g, (c) => {
    upper(c);
    c.fill();
  }, 0.65, 4, 6);
  clip(g, upper, () => {
    g.fillStyle = lin(g, CX - 100, 10, CX + 100, 220, [
      [0, shade(green, 0.25)],
      [0.5, green],
      [1, mix(shade(green, -0.5), '#141a08', 0.4)],
    ]);
    g.fillRect(box.x, 0, box.w, 240);
    texture(g, 'leather', box, 0.3, 1.5);
    // rot: dark patches, a bloom of fuzzy mould, peeling holes showing grey flesh
    blotches(g, box, '#1a2008', 0.3, 20, 0.58, 0.2, 139);
    blotches(g, { x: CX - 90, y: 60, w: 80, h: 80 }, '#c8d8a0', 0.7, 5, 0.6, 0.08, 141);
    blotches(g, { x: CX + 20, y: 140, w: 70, h: 50 }, '#c8d8a0', 0.6, 4, 0.62, 0.08, 143);
    for (const [x, y, rx] of [[CX - 54, 170, 12], [CX + 66, 90, 9]] as const) {
      fill(g, ell(x, y, rx, rx * 0.7, 0.3), mix(bone, '#4a5a3a', 0.3));
      crease(g, (c) => c.ellipse(x, y, rx, rx * 0.7, 0.3, Math.PI, Math.PI * 2), 2, '#0a0a04', 0.6, 0.3);
    }
    // the moc-toe seam, crudely restitched
    stitches(g, (c) => c.ellipse(CX, 176 - flex * 4, 80, 40, 0, Math.PI + 0.15, -0.15), rgba(bone, 0.8), 1.6, 4, 3);
    for (let i = 0; i < 8; i++) {
      const x = CX - 60 + i * 17;
      g.strokeStyle = rgba('#1a1408', 0.85);
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x - 4, 120 + Math.sin(i) * 3);
      g.lineTo(x + 4, 134 + Math.sin(i) * 3);
      g.stroke();
    }
    crease(g, (c) => {
      c.moveTo(CX - 66, 128);
      c.quadraticCurveTo(CX, 122, CX + 66, 130);
    }, 2.4, '#0a0a04', 0.7, 0.2);
    // the collar
    g.fillStyle = lin(g, 0, 6, 0, 30, [
      [0, rgba('#000000', 0.55)],
      [1, rgba('#000000', 0)],
    ]);
    g.fillRect(box.x, 0, box.w, 30);
  });
  // the saddle strap with its penny slot, and a tarnished penny
  const strap: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 72, 64);
    c.quadraticCurveTo(CX, 80, CX + 72, 64);
    c.lineTo(CX + 74, 88);
    c.quadraticCurveTo(CX, 104, CX - 74, 88);
    c.closePath();
  };
  contact(g, (c) => {
    strap(c);
    c.fill();
  }, 0.55, 3, 4);
  fill(g, strap, lin(g, 0, 64, 0, 104, [
    [0, shade(green, 0.05)],
    [1, shade(green, -0.45)],
  ]));
  clip(g, strap, () => texture(g, 'leather', box, 0.5, 1.3));
  fill(g, ell(CX, 84, 20, 7), '#0a0a04');
  raised(g, ell(CX, 80, 13, 9), rad(g, CX - 4, 77, 1, CX, 80, 14, [
    [0, '#c8e0a0'],
    [0.5, '#5a9a6a'],
    [1, '#2a4a2a'],
  ]), 0.4);
  if (!o.live) paintEyeball(g);
  lightAll(sil, 0.42, 20, 0.45);
  sil.finish(inkOf(green), { openTop: -2 });
  void vnoise;
}

registerStyle('poltergeist', {
  contactY: 266,
  halfWidth: 108,
  rig: { from: 196, to: 210 },
  leg: { kind: 'skin', hw: 62, join: 'into' },
  parts: {
    eye: {
      box: { x: EYEBALL.x - 18, y: EYEBALL.y - 32, w: 36, h: 62 },
      frames: 1,
      pivot: [EYEBALL.x, EYEBALL.y - 30],
      draw: (g) => paintEyeball(g),
    },
    tongue: {
      box: { x: CX - 34, y: MOUTH_Y + 4, w: 96, h: 50 },
      frames: 2,
      draw: (g, _art, i) => paintTongue(g, i),
    },
  },
  draw(ctx, art, p, o) {
    drawZombie(ctx, art, p, o);
  },
});
