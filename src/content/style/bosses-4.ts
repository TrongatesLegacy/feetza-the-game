// Mini-bosses in the style kit (batch C), part 4.
// - THE PIGEON KING: a ruff of layered slate feathers with an iridescent collar, a scaly pink pigeon foot under it
//   with three splayed toes and black claws, and a gold crown ringing its shin. Feathers drift off it in play.
// - JELLYFISH FLIP-FLOP: a bare foot on a translucent jelly flip-flop that glows, a jelly strap with a violet gem and
//   glowing tentacles trailing under the sole (they sway and pulse in play; it drips and bubbles).
// - MILKSHAKE MAX: a fluted sundae glass of strawberry shake on a pedestal, beaded with condensation, a swirl of
//   whipped cream with sprinkles and a cherry on top (the cherry wobbles in play; drips run down the glass).
// - THE LUMBERJACK: a hobnailed leather work boot with red laces, a buffalo-check flannel cuff and an axe strapped
//   to it (the axe swings in play; wood chips fly as it winds up).
// - THE ZOMBIE LOAFER: a penny loafer rotted on a dead foot, its sole torn open into a toothy mouth: cracked, peeling
//   leather with flakes curling off, holes worn through to grey flesh and a toe bone, a sodden tide-line, mould blooms,
//   grime in the seams, torn stitches, weeping ooze and a crust of grave soil; a tarnished old penny in the strap's
//   slot, an eyeball hanging by a thread from its socket, and flies (in play the eye swings, a flap of leather flops,
//   ooze wells, it drools and its tongue licks).

import type { FootArt } from '../../data/feet';
import { CX } from '../../art/feetCommon';
import { bareOutline, paintBare } from '../../art/style/bare';
import { LIGHT, type PathFn, type Pose, crease, glint, inkOf, innerEdge, pxPerUnit, softFill, softStroke, spec, texture, trace, vnoise } from '../../art/style/kit';
import { Sil, lobe } from '../../art/style/sil';
import { type PartDef, registerStyle } from '../../art/style/registry';
import { ENAMEL, gnarledFang } from '../../art/style/teeth';
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
    [0, '#8a7a7a'],
    [0.5, '#5a4a52'],
    [1, '#2a1e22'],
  ]));
  crease(g, (c) => {
    c.moveTo(CX - 4, MOUTH_Y + 12);
    c.quadraticCurveTo(CX + out * 18, MOUTH_Y + 20 + out * 10, CX + out * 36, MOUTH_Y + 28 + out * 12);
  }, 1.4, '#120a0c', 0.6, 0.2);
  clip(g, t, () => blotches(g, { x: CX - 34, y: MOUTH_Y + 6, w: 96, h: 48 }, '#6a7a3a', 0.45, 3, 0.55, 0.12, 181 + Math.round(out)));
  spec(g, CX - 10 + out * 20, MOUTH_Y + 16 + out * 8, 6, 3, 0.6, -0.3);
}

// ——— the Loafer's rot: leather that has rotted on a dead foot ———

type Pt = [number, number];

/** Points round (x, y), each radius cut by up to `jag`: made once, so every pass (fill, clip, shadow) traces the
 * same shape. */
function ringPts(x: number, y: number, rx: number, ry: number, r: () => number, n: number, jag: number, rot = 0): Pt[] {
  const cr = Math.cos(rot);
  const sr = Math.sin(rot);
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (r() - 0.5) * (Math.PI / n);
    const k = 1 - jag * r();
    const px = Math.cos(a) * rx * k;
    const py = Math.sin(a) * ry * k;
    out.push([x + px * cr - py * sr, y + px * sr + py * cr]);
  }
  return out;
}

/** A soft-edged closed shape through points (curves between their midpoints). */
const smoothPath = (pts: Pt[]): PathFn => (c) => {
  const mid = (i: number): Pt => {
    const [ax, ay] = pts[i % pts.length];
    const [bx, by] = pts[(i + 1) % pts.length];
    return [(ax + bx) / 2, (ay + by) / 2];
  };
  const [sx, sy] = mid(pts.length - 1);
  c.beginPath();
  c.moveTo(sx, sy);
  pts.forEach(([x, y], i) => {
    const [ex, ey] = mid(i);
    c.quadraticCurveTo(x, y, ex, ey);
  });
  c.closePath();
};

/** A torn, ragged closed shape (straight runs between points). */
const tornPath = (pts: Pt[]): PathFn => (c) => {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
};

const polyline = (pts: Pt[]) => (c: Ctx) => pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));

/** A crack wandering from (x, y): a jittered walk, `n` steps of `step`. */
function crackWalk(r: () => number, x: number, y: number, ang: number, n: number, step: number, wander = 0.8): Pt[] {
  const pts: Pt[] = [[x, y]];
  for (let i = 0; i < n; i++) {
    ang += (r() - 0.5) * wander;
    x += Math.cos(ang) * step * (0.7 + r() * 0.6);
    y += Math.sin(ang) * step * (0.7 + r() * 0.6);
    pts.push([x, y]);
  }
  return pts;
}

/** The leather's rotten olive (the art's green gone brown and grey). */
const hideOf = (green: string) => mix(green, '#5a5236', 0.42);
/** The fibrous grey-tan under the top grain, where it has peeled. */
const fleshSideOf = (green: string) => mix(hideOf(green), '#2e281a', 0.55);
/** Grave soil. */
const SOIL = { dark: '#1e140a', mid: '#3e2c1a', light: '#6a5236', pebble: '#6a665c' };
/** Ooze: sickly yellow-green, translucent. */
const OOZE = { core: '#b8b44a', mid: '#807a24', edge: '#3c380c' };

/** A crack's open gap: a sliver along the points, `w` wide at the start tapering to nothing. */
function crackGap(pts: Pt[], w: number): PathFn {
  const L: Pt[] = [];
  const R: Pt[] = [];
  pts.forEach(([x, y], i) => {
    const [nx, ny] = pts[Math.min(i + 1, pts.length - 1)];
    const [qx, qy] = pts[Math.max(i - 1, 0)];
    const d = Math.hypot(nx - qx, ny - qy) || 1;
    const t = i / (pts.length - 1);
    const ww = (w / 2) * (1 - t) * (0.75 + (0.5 * ((i * 7) % 5)) / 5);
    L.push([x - ((ny - qy) / d) * ww, y + ((nx - qx) / d) * ww]);
    R.push([x + ((ny - qy) / d) * ww, y - ((nx - qx) / d) * ww]);
  });
  return tornPath([...L, ...R.reverse()]);
}

/** A crack split right through the grain: grime packed round it, a dark gap that tapers away with its far wall
 * lit, and thinner branches. */
function leatherCrack(g: Ctx, r: () => number, x: number, y: number, ang: number, n: number, w: number, branches: number): void {
  const pts = crackWalk(r, x, y, ang, n, 3.2, 0.9);
  const all: [Pt[], number][] = [[pts, w]];
  for (let b = 0; b < branches; b++) {
    const j = 1 + Math.floor(r() * (pts.length - 3));
    const [bx, by] = pts[j];
    all.push([crackWalk(r, bx, by, ang + (r() < 0.5 ? -1 : 1) * (0.6 + r() * 0.7), 2 + Math.floor(r() * 3), 2.8, 0.9), w * (1 - j / pts.length) * 0.7]);
  }
  for (const [p, ww] of all) softStroke(g, polyline(p), rgba('#1a1408', 0.3), ww * 2.6, ww * 0.9);
  for (const [p, ww] of all) {
    const gap = crackGap(p, ww);
    g.save();
    g.translate(-LX * 0.7, -LY * 0.7);
    fill(g, gap, rgba('#d8cfa8', 0.32));
    g.restore();
    fill(g, gap, '#070803');
  }
}

/** Where the top grain has rotted off: the fibrous flesh side shows, the torn edge of the grain round it, a shadow
 * under the top-left edge and a lit cut edge on the bottom right. */
function peeledPatch(g: Ctx, pts: Pt[], green: string): void {
  const path = tornPath(pts);
  fill(g, path, fleshSideOf(green));
  clip(g, path, () => {
    texture(g, 'fleece', { x: 0, y: 0, w: 220, h: 260 }, 0.25, 0.7);
    softFill(g, smoothPath(pts.map(([x, y]) => [x + 3, y + 3] as Pt)), rgba('#3a3420', 0.3), 4);
  });
  innerEdge(g, path, rgba('#0a0904', 0.75), 2.5, -LX * 2.2, -LY * 2.2);
  innerEdge(g, path, rgba('#d8d0b0', 0.5), 0.6, LX * 1.1, LY * 1.1);
  g.save();
  g.lineJoin = 'round';
  trace(g, path);
  g.strokeStyle = rgba('#0c0a04', 0.35);
  g.lineWidth = 0.9;
  g.stroke();
  g.restore();
}

/** A flake of top grain lifted off the surface and curling back on itself: hinged along (ax, ay)–(bx, by), it
 * reaches `len` towards `ang`, its tip rolled over to show the pale underside, with its own shadow beneath. */
function curlFlake(g: Ctx, green: string, ax: number, ay: number, bx: number, by: number, ang: number, len: number, seed: number, shadow = 0.6): void {
  const r = rng(seed);
  const ux = Math.cos(ang);
  const uy = Math.sin(ang);
  const at = (s: number, t: number, out: number): Pt => {
    // s across the hinge (0 a … 1 b), t out along the flake, `out` a sideways nudge
    const hx = ax + (bx - ax) * s;
    const hy = ay + (by - ay) * s;
    return [hx + ux * len * t + -uy * out, hy + uy * len * t + ux * out];
  };
  // a ragged tongue of leather, torn to a point
  const j = () => (r() - 0.5) * 2.4;
  const outline: [number, number][] = [[0, 0], [-0.06, 0.2], [0.06, 0.36], [0.02, 0.5], [0.16, 0.66], [0.24, 0.8], [0.38, 0.9], [0.46, 1.04], [0.58, 0.9], [0.7, 0.84], [0.76, 0.66], [0.86, 0.58], [0.9, 0.38], [1.04, 0.2], [1, 0]];
  const body: Pt[] = outline.map(([s, t], i) => at(s, t, i && i < outline.length - 1 ? j() : 0));
  // its tip rolled back over itself: a little tube of pale flesh side
  const curl: Pt[] = [at(0.12, 0.72, 0), at(0.4, 0.68, 0), at(0.68, 0.7, 0), at(0.86, 0.66, 0), at(0.8, 0.8, 0), at(0.62, 0.98, 0), at(0.4, 1.03, 0), at(0.2, 0.9, 0)];
  const bodyP = tornPath(body);
  contact(g, (c) => {
    trace(c, bodyP);
    c.fill();
  }, shadow, 4, 3);
  const hide = hideOf(green);
  const [l0x, l0y] = at(0.5, 0, 0);
  const [l1x, l1y] = at(0.5, 1, 0);
  // lifted off the surface towards the light, it is lit brighter the further it rises
  fill(g, bodyP, lin(g, l0x, l0y, l1x, l1y, [
    [0, shade(hide, -0.2)],
    [0.45, shade(hide, 0.18)],
    [1, shade(hide, 0.32)],
  ]));
  clip(g, bodyP, () => {
    texture(g, 'leather', { x: 0, y: 0, w: 220, h: 260 }, 0.15, 1.5);
    // the bend at the hinge, where it still holds on
    softStroke(g, polyline([at(-0.1, 0.06, 0), at(1.1, 0.06, 0)]), rgba('#0a0904', 0.55), 3, 1.5);
  });
  // the rolled-over tip: the pale flesh side, a dark fold where it turns
  const curlP = smoothPath(curl);
  contact(g, (c) => {
    trace(c, curlP);
    c.fill();
  }, 0.55, 1.4, 1.5);
  fill(g, curlP, lin(g, ...at(0.5, 0.68, 0), ...at(0.5, 1.02, 0), [
    [0, shade(fleshSideOf(green), -0.2)],
    [0.4, shade(fleshSideOf(green), 0.25)],
    [1, shade(fleshSideOf(green), -0.3)],
  ]));
  crease(g, polyline(curl.slice(0, 4)), 1.1, '#0a0904', 0.75, 0.3);
  // its torn edge (not the hinge, which grows out of the surface): inked, the leather's thickness lit along it
  g.save();
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.beginPath();
  polyline(body)(g);
  g.strokeStyle = rgba('#0c0a04', 0.75);
  g.lineWidth = 1;
  g.stroke();
  g.translate(LX * 0.7, LY * 0.7);
  g.beginPath();
  polyline(body.slice(1, -1))(g);
  g.strokeStyle = rgba('#d8cca0', 0.35);
  g.lineWidth = 0.6;
  g.stroke();
  g.restore();
}

/** A hole worn right through, ragged at the rim: grey-green dead flesh inside, maybe a bone, the cut edge of the
 * leather lit on its far side and the near rim's shadow falling into it. */
function rotHole(g: Ctx, pts: Pt[], x: number, y: number, r: number, bone: string | null): void {
  const path = tornPath(pts);
  // the leather rotted dark and soft round it
  softFill(g, ell(x + 1, y + 1, r * 1.9, r * 1.6), rgba('#120e06', 0.4), r * 0.5);
  fill(g, path, rad(g, x + r * 0.25, y + r * 0.3, 1, x, y, r * 1.2, [
    [0, '#56604c'],
    [0.5, '#3a4232'],
    [1, '#141810'],
  ]));
  clip(g, path, () => {
    // dead flesh: dark grey-green and wet, a purple bruise, sinews
    softFill(g, ell(x + r * 0.35, y + r * 0.25, r * 0.5, r * 0.32), rgba('#4a2a38', 0.55), r * 0.25);
    softFill(g, ell(x - r * 0.4, y + r * 0.4, r * 0.4, r * 0.25), rgba('#5e6a3c', 0.35), r * 0.2);
    g.strokeStyle = rgba('#2a3022', 0.5);
    g.lineWidth = 0.9;
    const fr = rng(Math.round(x * 7 + y));
    for (let i = 0; i < 4; i++) {
      const fx = x - r + fr() * r * 2;
      g.beginPath();
      g.moveTo(fx, y - r);
      g.quadraticCurveTo(fx + (fr() - 0.5) * r, y, fx + (fr() - 0.5) * r * 0.6, y + r);
      g.stroke();
    }
    spec(g, x + r * 0.3, y + r * 0.45, r * 0.35, r * 0.12, 0.35, -0.2);
    if (bone) {
      // toe bones: two phalanges meeting at a knuckle, each a shaft flaring to rounded ends, stained and dull
      const phalanx = (ax: number, ay: number, bx: number, by: number, w: number): PathFn => (c) => {
        const ang = Math.atan2(by - ay, bx - ax);
        const nx = -Math.sin(ang);
        const ny = Math.cos(ang);
        const ex = w * 1.25;
        c.beginPath();
        c.arc(ax, ay, ex, ang + Math.PI / 2, ang + Math.PI * 1.5);
        c.quadraticCurveTo((ax + bx) / 2 - nx * w * 0.7, (ay + by) / 2 - ny * w * 0.7, bx - nx * ex, by - ny * ex);
        c.arc(bx, by, ex, ang - Math.PI / 2, ang + Math.PI / 2);
        c.quadraticCurveTo((ax + bx) / 2 + nx * w * 0.7, (ay + by) / 2 + ny * w * 0.7, ax + nx * ex, ay + ny * ex);
        c.closePath();
      };
      const kx = x + r * 0.15;
      const ky = y - r * 0.1;
      const bones = [phalanx(x - r * 1.05, y - r * 0.02, kx, ky, r * 0.15), phalanx(kx + r * 0.08, ky + r * 0.04, x + r * 0.72, y + r * 0.3, r * 0.13)];
      for (const bp of bones) {
        contact(g, (c) => {
          trace(c, bp);
          c.fill();
        }, 0.75, 2, 2);
        fill(g, bp, lin(g, x, y - r * 0.4, x + r * 0.1, y + r * 0.35, [
          [0, mix(bone, '#c8c0a4', 0.35)],
          [0.5, mix(bone, '#8e846a', 0.35)],
          [1, mix(bone, '#3a3424', 0.5)],
        ]));
        clip(g, bp, () => softFill(g, ell(x - r * 0.1, y + r * 0.25, r * 1.2, r * 0.2), rgba('#4a3a1a', 0.45), 1.5));
        g.save();
        trace(g, bp);
        g.strokeStyle = rgba('#1a160a', 0.7);
        g.lineWidth = 0.7;
        g.stroke();
        g.restore();
      }
      spec(g, kx - r * 0.05, ky - r * 0.12, r * 0.18, r * 0.08, 0.4, -0.3);
    }
    // the near (top-left) rim throws its shadow in; the far rim shows the leather's cut thickness, lit
    innerEdge(g, path, rgba('#050604', 0.9), r * 0.28, -LX * r * 0.3, -LY * r * 0.3);
    // (a run at a time, its width uneven and here and there gone, so the rim is torn, not a ring)
    const rr = rng(Math.round(x * 5 + y * 11));
    g.save();
    g.translate(LX * 1.1, LY * 1.1);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.strokeStyle = rgba('#7a6e50', 0.7);
    for (let i = 0; i < pts.length; i++) {
      if (rr() < 0.25) continue;
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      g.lineWidth = 0.6 + rr() * (r > 12 ? 2.8 : 1.6);
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.stroke();
    }
    g.restore();
  });
  g.save();
  g.lineJoin = 'round';
  trace(g, path);
  g.strokeStyle = rgba('#060603', 0.45);
  g.lineWidth = 0.6;
  g.stroke();
  g.restore();
  // frayed fibres poking into it
  const fr = rng(Math.round(x * 13 + y * 3));
  g.strokeStyle = rgba('#6e6448', 0.55);
  g.lineWidth = 0.6;
  for (let i = 0; i < pts.length; i += r > 12 ? 1 : 2) {
    const [px, py] = pts[i];
    const dx = x - px;
    const dy = y - py;
    const d = Math.hypot(dx, dy) || 1;
    const l = 1.2 + fr() * (r > 12 ? 2.6 : 2);
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(px + (dx / d) * l + (fr() - 0.5) * 1.5, py + (dy / d) * l + (fr() - 0.5) * 1.5);
    g.stroke();
  }
}

/** A mould bloom: a soft halo, overlapping fuzzy colonies with hairy rims and spore-dark centres, satellites
 * round it. `tone` picks the mould: pale grey-white, sickly yellow-green or blue-green. */
function mouldBloom(g: Ctx, x: number, y: number, size: number, seed: number, tone: 'white' | 'yellow' | 'blue', stretch = 1): void {
  const r = rng(seed);
  const pal = {
    white: { halo: '#6e705c', body: '#84867a', rim: '#9a9c8c', core: '#4a4c3a' },
    yellow: { halo: '#6e7240', body: '#80844e', rim: '#989c6c', core: '#45481c' },
    blue: { halo: '#56706a', body: '#66807a', rim: '#82988e', core: '#283e3a' },
  }[tone];
  // a damp dark stain and a pale halo spreading under the colonies
  softFill(g, ell(x + 1, y + 1.5, size * 1.4 * stretch, size * 1.1), rgba('#141808', 0.38), size * 0.4);
  softFill(g, ell(x, y, size * 1.7 * stretch, size * 1.3), rgba(pal.halo, 0.2), size * 0.6);
  const cols: [number, number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = r() * Math.PI * 2;
    const d = i ? size * (0.4 + r() * 0.5) : 0;
    cols.push([x + Math.cos(a) * d * stretch, y + Math.sin(a) * d * 0.8, size * (i ? 0.32 + r() * 0.3 : 0.62)]);
  }
  for (let i = 0; i < 8; i++) {
    const a = r() * Math.PI * 2;
    const d = size * (1.15 + r() * 0.6);
    cols.push([x + Math.cos(a) * d * stretch, y + Math.sin(a) * d * 0.8, size * (0.08 + r() * 0.1)]);
  }
  for (const [cx, cy, cr] of cols) {
    // the colony: raised and soft, lit from the top left
    const body = smoothPath(ringPts(cx, cy, cr, cr * 0.9, r, 10, 0.22));
    softFill(g, body, rad(g, cx - cr * 0.35, cy - cr * 0.4, 0, cx, cy, cr * 1.1, [
      [0, rgba(pal.rim, 0.95)],
      [0.6, rgba(pal.body, 0.9)],
      [1, rgba(shade(pal.body, -0.3), 0.85)],
    ]), Math.max(0.6, cr * 0.35));
    // fuzz: a stipple of fine threads round the rim, fading out
    const n = Math.round(cr * cr * 1.4 + 6);
    for (let k = 0; k < n; k++) {
      const a = r() * Math.PI * 2;
      const rr = cr * (0.8 + r() * 0.45);
      const s = 0.3 + r() * 0.45;
      fill(g, ell(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.9, s, s), rgba(pal.rim, 0.08 + r() * 0.16));
    }
    // the older, spore-darkened middle of the bigger colonies
    if (cr > size * 0.3) softFill(g, ell(cx + 0.3, cy + 0.3, cr * 0.45, cr * 0.4), rgba(pal.core, 0.5), cr * 0.2);
  }
}

/** Where ooze weeps from the splits (the gash's ends, the torn moc-toe seam, a crack): x, y, run length, width,
 * lean. In play fresh drops well up at the ends of the runs. */
export const OOZE_RUNS: [number, number, number, number, number][] = [
  [CX + 40, 122, 22, 2.2, 1.6],
  [CX + 4, 137, 8, 1.7, -0.6],
];

/** Ooze weeping from a split: a swollen bead and a run down the leather ending in a drop, wet and lit. */
function oozeRun(g: Ctx, x: number, y: number, len: number, w: number, lean = 0): void {
  // the leather it has run down before stays soaked dark below it
  softStroke(g, (c) => {
    c.moveTo(x, y);
    c.quadraticCurveTo(x + lean * 0.5, y + len, x + lean * 1.4, y + len * 1.9);
  }, rgba('#0a0c02', 0.42), w * 2.6, w * 0.8);
  // one outline: the ooze welling out of the split, a run thinning down the leather, a drop gathering at its end
  const run: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - w * 1.5, y);
    c.bezierCurveTo(x - w * 1.3, y - w * 0.9, x + w * 1.3, y - w * 1, x + w * 1.4, y);
    c.bezierCurveTo(x + w * 1.1, y + w * 0.8, x + w * 0.4 + lean * 0.3, y + w, x + w * 0.4 + lean * 0.5, y + len * 0.5);
    c.bezierCurveTo(x + w * 0.35 + lean * 0.8, y + len * 0.8, x + w * 0.95 + lean, y + len * 0.88, x + w * 0.9 + lean, y + len + w * 0.3);
    c.bezierCurveTo(x + w * 0.85 + lean, y + len + w * 1.3, x - w * 0.85 + lean, y + len + w * 1.3, x - w * 0.8 + lean, y + len + w * 0.2);
    c.bezierCurveTo(x - w * 0.75 + lean, y + len * 0.85, x - w * 0.3 + lean * 0.8, y + len * 0.75, x - w * 0.35 + lean * 0.5, y + len * 0.5);
    c.bezierCurveTo(x - w * 0.4 + lean * 0.3, y + w, x - w * 1.4, y + w * 0.7, x - w * 1.5, y);
    c.closePath();
  };
  contact(g, (c) => {
    trace(c, run);
    c.fill();
  }, 0.45, 1.2, 1.2);
  fill(g, run, lin(g, x - w * 1.4, y, x + w, y + len, [
    [0, rgba(OOZE.core, 0.88)],
    [0.45, rgba(OOZE.mid, 0.86)],
    [1, rgba(OOZE.edge, 0.92)],
  ]));
  g.save();
  g.lineJoin = 'round';
  trace(g, run);
  g.strokeStyle = rgba('#1e1c04', 0.5);
  g.lineWidth = 0.6;
  g.stroke();
  g.restore();
  // wet, so it shines a little (a dull sheen, not a gloss)
  spec(g, x - w * 0.5, y - w * 0.35, w * 0.6, w * 0.3, 0.3, -0.5);
}

/** A clod of grave soil caked on: a lumpy dark mass lit from the top left, crumbs and grit and the odd pebble on
 * it, a fine root. */
function soilClod(g: Ctx, x: number, y: number, rx: number, ry: number, seed: number): void {
  const r = rng(seed);
  const path = smoothPath(ringPts(x, y, rx, ry, r, 11, 0.35));
  contact(g, (c) => {
    trace(c, path);
    c.fill();
  }, 0.55, 1.6, 2);
  fill(g, path, rad(g, x - rx * 0.45, y - ry * 0.5, 0, x, y, Math.max(rx, ry) * 1.2, [
    [0, SOIL.light],
    [0.45, SOIL.mid],
    [1, SOIL.dark],
  ]));
  clip(g, path, () => {
    for (let i = 0; i < Math.round(rx * ry * 0.35); i++) {
      const cx = x + (r() - 0.5) * rx * 2;
      const cy = y + (r() - 0.5) * ry * 2;
      const cr = 0.5 + r() * 1.1;
      fill(g, ell(cx + 0.4, cy + 0.5, cr, cr * 0.85), rgba(SOIL.dark, 0.6));
      fill(g, ell(cx, cy, cr, cr * 0.85), r() < 0.5 ? SOIL.light : mix(SOIL.mid, SOIL.light, 0.4));
    }
  });
  innerEdge(g, path, rgba('#0a0602', 0.55), 1.5, -LX * 1.5, -LY * 1.5);
  if (r() < 0.1) {
    const px = x + (r() - 0.5) * rx;
    const py = y + (r() - 0.6) * ry;
    const pr = 1.3 + r() * 1.2;
    contact(g, (c) => {
      c.beginPath();
      c.ellipse(px, py, pr, pr * 0.8, 0, 0, Math.PI * 2);
      c.fill();
    }, 0.6, 1, 1);
    fill(g, ell(px, py, pr, pr * 0.8, r()), rad(g, px - pr * 0.4, py - pr * 0.4, 0, px, py, pr * 1.2, [
      [0, '#a8a290'],
      [0.5, SOIL.pebble],
      [1, '#3a3630'],
    ]));
  }
  if (r() < 0.15) {
    const a = -Math.PI / 2 + (r() - 0.5) * 2;
    const pts = crackWalk(r, x, y - ry * 0.4, a, 4, 3, 1.2);
    softStroke(g, polyline(pts), rgba('#1a1008', 0.8), 0.9, 0.2);
  }
}

/** The vamp: rotted, cracked and peeling leather on a dead foot, holes worn through to flesh and bone, a sodden
 * tide-line, mould, grime in every crease, torn stitches, weeping ooze and a crust of grave soil. */
function paintRottenUpper(g: Ctx, upper: PathFn, green: string, bone: string, flex: number, box: { x: number; y: number; w: number; h: number }): void {
  const hide = hideOf(green);
  const lip = MOUTH_Y + 6 - flex * 4;
  const tide = (x: number) => 168 + Math.sin(x * 0.07) * 4 + Math.sin(x * 0.19 + 1) * 2.2 - Math.abs(x - CX) * 0.1;
  clip(g, upper, () => {
    // the rotten olive, lit from the top left
    g.fillStyle = lin(g, CX - 100, 10, CX + 100, 220, [
      [0, shade(hide, 0.22)],
      [0.5, hide],
      [1, mix(shade(hide, -0.5), '#141a08', 0.4)],
    ]);
    g.fillRect(box.x, 0, box.w, 240);
    texture(g, 'leather', box, 0.12, 1.5);
    // stains: rot gone dark, brown water marks, patches bleached pale
    const r = rng(311);
    for (let i = 0; i < 22; i++) {
      const x = CX - 100 + r() * 200;
      const y = 10 + r() * 200;
      const s = 8 + r() * 22;
      const col = ['#1e200a', '#5e4626', '#8e9272', '#16140a'][i % 4];
      softFill(g, smoothPath(ringPts(x, y, s, s * (0.6 + r() * 0.4), r, 9, 0.4, r() * 3)), rgba(col, 0.22 + r() * 0.2), s * 0.3);
    }
    // filth worked in over years in the grave: heavy along the sides and low down, the instep worn cleaner
    for (let i = 0; i < 12; i++) {
      const side = i % 2 ? 1 : -1;
      const x = CX + side * (60 + r() * 50);
      const y = 30 + r() * 180;
      const s = 18 + r() * 20;
      softFill(g, smoothPath(ringPts(x, y, s * 0.7, s, r, 9, 0.35, r())), rgba(i % 3 ? '#14120a' : '#2e2414', 0.22 + r() * 0.14), s * 0.4);
    }
    // the form under the one light: the near side of the vamp lit, the far side and the toe falling into shadow
    softFill(g, ell(CX - 38, 70, 54, 62), rgba(mix(hide, '#d8d2a8', 0.45), 0.22), 22);
    g.fillStyle = lin(g, CX + 20, 0, CX + 110, 0, [
      [0, rgba('#0a0c04', 0)],
      [1, rgba('#0a0c04', 0.4)],
    ]);
    g.fillRect(CX + 20, 0, 100, 240);
    // the leather's slack folds where the dead foot has sagged in it: a dark trough, a lit ridge just above
    for (const [y, a, w] of [[34, 0.5, 70], [100, 0.7, 92], [108, 0.45, 80], [148, 0.6, 96]] as const) {
      softStroke(g, (c) => {
        c.moveTo(CX - w, y + 6);
        c.quadraticCurveTo(CX - w * 0.3, y - 4, CX + 4, y + 1);
        c.quadraticCurveTo(CX + w * 0.4, y + 5, CX + w, y - 2);
      }, rgba('#0e1004', 0.35 * a), 5, 3);
      softStroke(g, (c) => {
        c.moveTo(CX - w * 0.9, y + 2);
        c.quadraticCurveTo(CX - w * 0.3, y - 8, CX + 4, y - 3);
      }, rgba(LIGHT.key, 0.12 * a), 3, 2.5);
    }
    // the older, fainter tide-line high up, then the sodden toe below today's
    const tidePath = (t: (x: number) => number): PathFn => (c) => {
      c.beginPath();
      c.moveTo(box.x, t(box.x));
      for (let x = box.x; x <= box.x + box.w; x += 6) c.lineTo(x, t(x));
      c.lineTo(box.x + box.w, 250);
      c.lineTo(box.x, 250);
      c.closePath();
    };
    const tideLine = (t: (x: number) => number) => (c: Ctx) => {
      for (let x = box.x; x <= box.x + box.w; x += 6) (x === box.x ? c.moveTo(x, t(x)) : c.lineTo(x, t(x)));
    };
    const old = (x: number) => tide(x) - 20 + Math.sin(x * 0.11) * 3;
    softStroke(g, tideLine(old), rgba('#d0cca0', 0.16), 2.2, 1);
    softStroke(g, tideLine((x) => old(x) + 1.6), rgba('#1a1a08', 0.22), 1.4, 0.8);
    softFill(g, tidePath(tide), rgba('#0a0e04', 0.42), 1.2);
    fill(g, tidePath((x) => tide(x) + 18), rgba('#0a0c04', 0.18));
    softStroke(g, tideLine((x) => tide(x) - 1.8), rgba('#d8d4a8', 0.3), 1.8, 0.7);
    softStroke(g, tideLine(tide), rgba('#080a02', 0.6), 1.8, 0.6);
    // the rot is worst where it stays wet: a dark band of it soaked along the tide-line
    softStroke(g, tideLine((x) => tide(x) + 3), rgba('#1a1408', 0.35), 12, 5);
    // fine crazing over the flexing vamp
    const cr = rng(331);
    for (let i = 0; i < 10; i++) {
      const x = CX - 80 + cr() * 160;
      const y = 60 + cr() * 110;
      crease(g, polyline(crackWalk(cr, x, y, (cr() - 0.5) * 0.6, 2 + Math.floor(cr() * 2), 3, 1)), 0.7, '#0a0a04', 0.22, 0.12);
    }
    // deep cracks along the flex folds, branching, and one by the collar
    const kr = rng(347);
    leatherCrack(g, kr, CX - 104, 102, 0.06, 11, 3.2, 2);
    leatherCrack(g, kr, CX + 104, 146, Math.PI + 0.05, 9, 3, 2);
    leatherCrack(g, kr, CX + 72, 12, 2.2, 6, 2.4, 1);
    // peeled patches where the grain has rotted away (the flap's patch is under it)
    const pr = rng(353);
    peeledPatch(g, ringPts(FLAP.x - 1, FLAP.y - 7, 12, 8, rng(359), 26, 0.2), green);
    // a small hole rotted through by the collar
    rotHole(g, ringPts(CX - 52, 44, 7, 5.5, pr, 18, 0.35, 0.3), CX - 52, 44, 6, null);
    // a gash across the vamp, crudely stitched shut with thick black thread, some stitches torn loose
    const gash: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 40, 120);
      c.quadraticCurveTo(CX, 109, CX + 42, 121);
      c.quadraticCurveTo(CX, 124, CX - 40, 120);
      c.closePath();
    };
    softStroke(g, (c) => {
      c.moveTo(CX - 42, 120);
      c.quadraticCurveTo(CX, 113, CX + 44, 121);
    }, rgba('#120e06', 0.5), 8, 3);
    fill(g, gash, '#0a0803');
    clip(g, gash, () => fill(g, ell(CX + 4, 119, 30, 3), rgba('#4a5a22', 0.6)));
    crease(g, (c) => {
      c.moveTo(CX - 40, 120);
      c.quadraticCurveTo(CX, 124, CX + 42, 121);
    }, 1.2, '#050402', 0.4, 0.2);
    const sj = rng(461);
    const gx = [CX - 32, CX - 21, CX - 8, CX + 4, CX + 17, CX + 28];
    gx.forEach((x, i) => {
      const yc = 117 + Math.abs(x - CX) * 0.06;
      const torn = i === 2 || i === 4;
      // crude, uneven stitches: each at its own slant and length
      const a: Pt = [x - 3 - sj() * 3, yc - 5 - sj() * 3];
      const b: Pt = [x + 2 + sj() * 3, yc + 5 + sj() * 3];
      // the holes the thread runs through
      for (const [hx, hy] of [a, b]) fill(g, ell(hx, hy, 1.2, 1), '#050402');
      if (torn) {
        // snapped: a stub at the top hole, the rest dangling from the bottom
        threadLine(g, [a, [a[0] + 2, a[1] + 3.5]], 1.6);
        threadLine(g, [b, [x + 7, yc + 11], [x + 2, yc + 15], [x + 5 + (i - 3), yc + 20]], 1.6);
      } else threadLine(g, [a, [x + (sj() - 0.5) * 2, yc - 1], b], 1.7);
    });
    // grime caked into the seams and the old flex creases
    const seam = (c: Ctx) => c.ellipse(CX, 176 - flex * 4, 80, 40, 0, Math.PI + 0.15, -0.15);
    softStroke(g, seam, rgba('#140e06', 0.5), 6, 2.5);
    for (const [y0, y1, a] of [[96, 92, 0.35], [140, 136, 0.3]] as const) {
      softStroke(g, (c) => {
        c.moveTo(CX - 90, y0);
        c.quadraticCurveTo(CX, y1 - 6, CX + 92, y0 + 2);
      }, rgba('#1a1408', a), 5, 2.5);
    }
    // the moc-toe seam: crude stitching, torn open across the front, threads hanging
    stitches(g, (c) => c.ellipse(CX, 176 - flex * 4, 80, 40, 0, Math.PI + 0.15, Math.PI + 1.15), rgba(mix(bone, '#5a5030', 0.35), 0.9), 1.6, 4, 3);
    stitches(g, (c) => c.ellipse(CX, 176 - flex * 4, 80, 40, 0, Math.PI + 2.05, -0.15), rgba(mix(bone, '#5a5030', 0.35), 0.9), 1.6, 4, 3);
    const onSeam = (a: number): Pt => [CX + Math.cos(a) * 80, 176 - flex * 4 + Math.sin(a) * 40];
    // the split where it tore: a dark gap
    softStroke(g, (c) => c.ellipse(CX, 176 - flex * 4, 80, 40, 0, Math.PI + 1.2, Math.PI + 2), rgba('#050402', 0.85), 2.6, 0.5);
    for (const [a, dx, len] of [[Math.PI + 1.17, -3, 10], [Math.PI + 1.22, 2, 12], [Math.PI + 2.03, 3, 18]] as const) {
      const [sx, sy] = onSeam(a);
      threadLine(g, [[sx, sy], [sx + dx * 2, sy + len * 0.35], [sx - dx, sy + len * 0.7], [sx + dx * 1.4, sy + len]], 2);
    }
    // the worst of it: the toe box rotted right through, a big ragged hole onto dark wet flesh and toe bones
    const hr = rng(367);
    rotHole(g, ringPts(CX - 34, 168, 36, 21, hr, 34, 0.26, 0.08), CX - 34, 168, 27, bone);
    // the socket the eye fell out of
    rotHole(g, ringPts(EYEBALL.x - 2, EYEBALL.y - 30, 7.5, 6, hr, 14, 0.3), EYEBALL.x - 2, EYEBALL.y - 30, 6.5, null);
    // mould growing where the damp sits: along the tide-line, in the moc seam and under the strap's edge
    mouldBloom(g, CX + 46, 172, 9, 401, 'blue', 1.7);
    mouldBloom(g, CX + 82, 162, 5, 409, 'white', 1.3);
    mouldBloom(g, CX - 84, 158, 7, 389, 'white', 1.4);
    mouldBloom(g, CX - 58, 104, 5, 397, 'yellow', 1.8);
    // the toe soaked: a dull wet sheen only below the tide-line, and where the ooze has run under the gash
    softStroke(g, (c) => {
      for (let x = box.x + 8; x <= CX + 10; x += 6) (x === box.x + 8 ? c.moveTo(x, tide(x) + 5) : c.lineTo(x, tide(x) + 5));
    }, rgba(LIGHT.key, 0.16), 3, 2);
    softStroke(g, (c) => {
      c.moveTo(CX - 96, 186);
      c.quadraticCurveTo(CX - 76, 200, CX - 50, 203);
    }, rgba(LIGHT.key, 0.16), 3, 2.5);
    softStroke(g, (c) => {
      c.moveTo(CX + 10, 196);
      c.quadraticCurveTo(CX + 40, 196, CX + 70, 186);
    }, rgba(LIGHT.key, 0.1), 2.5, 2);
    softStroke(g, (c) => {
      c.moveTo(CX - 30, 128);
      c.quadraticCurveTo(CX, 126, CX + 34, 130);
    }, rgba(LIGHT.key, 0.1), 3, 2);
    for (const [x, y, s] of [[CX - 80, 192, 2.6], [CX + 26, 194, 2]] as const) spec(g, x, y, s, s * 0.5, 0.35, -0.3);
    // ooze weeping from the splits
    for (const [x, y, len, w, lean] of OOZE_RUNS) oozeRun(g, x, y, len, w, lean);
    // grave soil: a dirty film rising from the bottom, a caked crust of mud along the lip and up the sides, clods
    // and flung grit on it
    g.fillStyle = lin(g, 0, lip - 50, 0, lip, [
      [0, rgba(SOIL.mid, 0)],
      [1, rgba(SOIL.mid, 0.55)],
    ]);
    g.fillRect(box.x, lip - 50, box.w, 60);
    const crustTop = (x: number) => {
      const e = Math.abs(x - CX) / 104;
      return lip - 7 - e * e * 34 - Math.sin(x * 0.23) * 2.5 - Math.sin(x * 0.61 + 2) * 1.5;
    };
    const crust: PathFn = (c) => {
      c.beginPath();
      c.moveTo(box.x, lip + 12);
      for (let x = box.x; x <= box.x + box.w; x += 3) c.lineTo(x, crustTop(x));
      c.lineTo(box.x + box.w, lip + 12);
      c.closePath();
    };
    contact(g, (c) => {
      trace(c, crust);
      c.fill();
    }, 0.5, 1.5, 2);
    fill(g, crust, lin(g, 0, lip - 40, 0, lip + 4, [
      [0, SOIL.light],
      [0.5, SOIL.mid],
      [1, SOIL.dark],
    ]));
    innerEdge(g, crust, rgba(mix(SOIL.light, '#d8c8a0', 0.3), 0.6), 0.8, LX * 1.2, LY * 1.2);
    const sr = rng(421);
    for (let i = 0; i < 34; i++) {
      const t = i / 33;
      const x = CX - 104 + t * 208 + (sr() - 0.5) * 6;
      const edge = Math.abs(x - CX) / 104;
      const big = 0.6 + edge * 0.7;
      const y = crustTop(x) + 1 + sr() * 6;
      soilClod(g, x, y, (3.5 + sr() * 4) * big, (2.5 + sr() * 3) * big, 431 + i);
    }
    for (let i = 0; i < 40; i++) {
      const x = CX - 100 + sr() * 200;
      const y = crustTop(x) + 4 - sr() ** 3 * 26;
      const s = 0.5 + sr() * 1;
      fill(g, ell(x + 0.4, y + 0.5, s, s * 0.8), rgba('#0a0602', 0.5));
      fill(g, ell(x, y, s, s * 0.8), sr() < 0.5 ? SOIL.light : SOIL.mid);
    }
    // the collar: dark inside, its binding filthy
    g.fillStyle = lin(g, 0, 6, 0, 32, [
      [0, rgba('#000000', 0.6)],
      [1, rgba('#000000', 0)],
    ]);
    g.fillRect(box.x, 0, box.w, 32);
    softStroke(g, (c) => {
      c.moveTo(CX - 74, 12);
      c.lineTo(CX + 74, 12);
    }, rgba('#140e06', 0.45), 6, 3);
    // the lip: a rotten rolled edge where the upper meets the mouth, grimy and wet
    softStroke(g, (c) => {
      c.moveTo(CX - 106, lip - 18);
      c.bezierCurveTo(CX - 100, lip - 4, CX - 60, lip, CX, lip - 1);
      c.bezierCurveTo(CX + 60, lip, CX + 102, lip - 4, CX + 108, lip - 18);
    }, rgba('#0c0a04', 0.55), 7, 2.5);
  });
}

/** A loose length of dirty thread: a dark core with a lighter twist along it. */
function threadLine(g: Ctx, pts: Pt[], w = 2.4): void {
  const path = (c: Ctx) => {
    c.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 4) c.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]);
    else if (pts.length === 3) c.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
    else c.lineTo(pts[1][0], pts[1][1]);
  };
  contact(g, (c) => {
    c.beginPath();
    path(c);
    c.lineWidth = w * 0.8;
    c.lineCap = 'round';
    c.stroke();
  }, 0.45, 1.4, 1);
  g.save();
  g.lineCap = 'round';
  g.beginPath();
  path(g);
  g.strokeStyle = '#0c0a06';
  g.lineWidth = w;
  g.stroke();
  g.translate(LX * 0.4, LY * 0.4);
  g.beginPath();
  path(g);
  g.strokeStyle = rgba('#6a624a', 0.8);
  g.lineWidth = w * 0.38;
  g.stroke();
  g.restore();
}

/** The flap of rotted leather hanging from the instep (a part: it flaps in play). */
export const FLAP = { x: CX + 40, y: 40 };
function paintFlap(g: Ctx, green: string): void {
  curlFlake(g, green, FLAP.x - 11, FLAP.y - 1, FLAP.x + 10, FLAP.y + 1, Math.PI / 2 - 0.3, 22, 437, 0.8);
}

/** The saddle strap, cracked and filthy, and in its slot a tarnished old penny: a flat copper disc gone brown, green
 * verdigris in its worn embossing, grime round the rim, tucked under the strap's lip. */
function paintStrap(g: Ctx, green: string, box: { x: number; y: number; w: number; h: number }): void {
  const hide = hideOf(green);
  const strap: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 72, 64);
    c.quadraticCurveTo(CX, 80, CX + 72, 64);
    c.lineTo(CX + 74, 88);
    c.quadraticCurveTo(CX, 104, CX - 74, 88);
    c.closePath();
  };
  const slot: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 23, 85);
    c.quadraticCurveTo(CX, 88, CX + 23, 85);
    c.quadraticCurveTo(CX, 93, CX - 23, 85);
    c.closePath();
  };
  contact(g, (c) => {
    strap(c);
    c.fill();
  }, 0.6, 3, 4);
  fill(g, strap, lin(g, 0, 64, 0, 104, [
    [0, shade(hide, 0.1)],
    [1, shade(hide, -0.45)],
  ]));
  clip(g, strap, () => {
    texture(g, 'leather', box, 0.15, 1.3);
    const r = rng(443);
    for (let i = 0; i < 7; i++) softFill(g, smoothPath(ringPts(CX - 70 + r() * 140, 70 + r() * 26, 8 + r() * 10, 5 + r() * 4, r, 8, 0.4)), rgba(['#24260e', '#5e4a2a', '#8a9070'][i % 3], 0.22), 3);
    leatherCrack(g, r, CX - 56, 70, 1.4, 4, 1.4, 1);
    leatherCrack(g, r, CX + 48, 98, -1.7, 4, 1.3, 1);
    // grime along its edges
    softStroke(g, (c) => {
      c.moveTo(CX - 74, 88);
      c.quadraticCurveTo(CX, 104, CX + 74, 88);
    }, rgba('#120c04', 0.55), 5, 2);
    softStroke(g, (c) => {
      c.moveTo(CX - 72, 64);
      c.quadraticCurveTo(CX, 80, CX + 72, 64);
    }, rgba(LIGHT.key, 0.16), 2, 1);
    stitches(g, (c) => {
      c.moveTo(CX - 66, 69);
      c.quadraticCurveTo(CX, 84, CX + 66, 69);
    }, rgba('#8a8268', 0.6), 1.1, 3, 3);
    // the slot: a slit cut across the strap's middle
    fill(g, slot, '#070602');
  });
  // the penny stands in the slot, its bottom tucked behind the strap's lower lip, its shadow on the strap
  const coin = ell(PENNY.x, PENNY.y, PENNY.r, PENNY.r * 0.94);
  const above: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 40, 30);
    c.lineTo(CX + 40, 30);
    c.lineTo(CX + 40, 85);
    c.lineTo(CX + 22, 85);
    c.quadraticCurveTo(CX, 93, CX - 22, 85);
    c.lineTo(CX - 40, 85);
    c.closePath();
  };
  clip(g, above, () => {
    contact(g, (c) => {
      trace(c, coin);
      c.fill();
    }, 0.7, 2.6, 2.5);
    penny(g, PENNY.x, PENNY.y, PENNY.r);
    // where it goes down into the slot it falls into the dark
    softStroke(g, (c) => {
      c.moveTo(CX - 22, 84);
      c.quadraticCurveTo(CX, 92, CX + 22, 84);
    }, rgba('#0a0602', 0.6), 5, 2.2);
  });
  // the lip in front of it: a cut leather edge, lit, grime in the slit's corners
  crease(g, (c) => {
    c.moveTo(CX - 23, 85.4);
    c.quadraticCurveTo(CX, 93.4, CX + 23, 85.4);
  }, 1.4, '#050402', 0.35, 0.3);
  softStroke(g, (c) => {
    c.moveTo(CX - 23, 85);
    c.lineTo(CX - 17, 87.5);
  }, rgba('#050402', 0.6), 2.5, 1);
  softStroke(g, (c) => {
    c.moveTo(CX + 23, 85);
    c.lineTo(CX + 17, 87.5);
  }, rgba('#050402', 0.6), 2.5, 1);
}

/** The penny in the strap's slot. */
const PENNY = { x: CX, y: 80, r: 16 };

/** An old penny face on, (x, y), radius r: drawn inside whatever clip it sits in. */
function penny(g: Ctx, x: number, y: number, r: number): void {
  const disc = ell(x, y, r, r * 0.94);
  // tarnished copper: dull brown, warmer where it's worn smooth at the top left
  fill(g, disc, rad(g, x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r, [
    [0, '#b07848'],
    [0.45, '#7e4e2a'],
    [0.85, '#54321a'],
    [1, '#34200e'],
  ]));
  clip(g, disc, () => {
    // the worn bust in profile: barely raised, its top-left edges lit, its far edges dark
    const bust = smoothPath(
      ([[-0.34, -0.42], [-0.06, -0.6], [0.18, -0.48], [0.26, -0.26], [0.36, -0.12], [0.26, -0.05], [0.3, 0.02], [0.26, 0.14], [0.2, 0.24], [0.06, 0.3], [0.18, 0.42], [0.42, 0.6], [0.4, 0.9], [-0.5, 0.9], [-0.52, 0.5], [-0.3, 0.32], [-0.44, 0.02], [-0.44, -0.24]] as Pt[]).map(([u, v]) => [x + u * r * 0.95, y + v * r * 0.95] as Pt),
    );
    fill(g, bust, rgba('#a8703e', 0.5));
    innerEdge(g, bust, rgba('#e0a878', 0.55), 0.6, -LX * 0.9, -LY * 0.9);
    g.save();
    g.translate(-LX * 0.8, -LY * 0.8);
    trace(g, bust);
    g.strokeStyle = rgba('#2a1608', 0.55);
    g.lineWidth = 0.8;
    g.stroke();
    g.restore();
    // the legend round the rim, worn to ticks, and the date
    for (let i = 0; i < 15; i++) {
      const a = Math.PI * 1.1 + (i / 14) * Math.PI * 0.8;
      const cx = x + Math.cos(a) * r * 0.76;
      const cy = y + Math.sin(a) * r * 0.72;
      g.save();
      g.translate(cx, cy);
      g.rotate(a + Math.PI / 2);
      g.fillStyle = rgba('#2a1608', 0.45);
      g.fillRect(-0.5, -1.1, 1, 2.2);
      g.fillStyle = rgba('#d89a68', 0.35);
      g.fillRect(-0.9, -1.3, 0.8, 2);
      g.restore();
    }
    for (let i = 0; i < 4; i++) {
      g.fillStyle = rgba('#2a1608', 0.5);
      g.fillRect(x + r * 0.42 + i * 2.1, y + r * 0.08, 1.3, 2.4);
    }
    // verdigris: a crust creeping in from the rim (thickest at the bottom, where the damp sits) and caught along
    // the bust's edge, grime packed in with it
    const r2 = rng(457);
    g.save();
    g.lineWidth = r * 0.22;
    g.strokeStyle = rgba('#4e7a62', 0.55);
    if ('filter' in g) g.filter = `blur(${(0.8 * pxPerUnit(g)).toFixed(1)}px)`;
    g.beginPath();
    g.ellipse(x, y, r * 0.86, r * 0.8, 0, Math.PI * -0.1, Math.PI * 1.15);
    g.stroke();
    g.restore();
    for (let i = 0; i < 12; i++) {
      const a = Math.PI * (-0.15 + r2() * 1.4);
      const d = r * (0.72 + r2() * 0.2);
      const cx = x + Math.cos(a) * d;
      const cy = y + Math.sin(a) * d;
      const s = r * (0.06 + r2() * 0.1);
      softFill(g, smoothPath(ringPts(cx, cy, s, s * 0.8, r2, 8, 0.45)), rgba(i % 3 ? '#5e8a70' : '#7ea88e', 0.75), 0.4);
    }
    g.save();
    g.translate(-LX * 0.6, -LY * 0.6);
    trace(g, bust);
    g.strokeStyle = rgba('#5e8a70', 0.45);
    g.lineWidth = 0.9;
    g.stroke();
    g.restore();
    softFill(g, ell(x + r * 0.25, y + r * 0.3, r * 0.6, r * 0.45), rgba('#1e1208', 0.4), r * 0.25);
    // the raised rim: lit on the top left, dark on the bottom right
    g.save();
    g.lineWidth = r * 0.13;
    g.strokeStyle = rgba('#1a0e04', 0.6);
    g.beginPath();
    g.ellipse(x - LX * 0.5, y - LY * 0.5, r * 0.9, r * 0.85, 0, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = rgba('#e0a474', 0.5);
    g.lineWidth = r * 0.07;
    g.beginPath();
    g.ellipse(x + LX * 0.4, y + LY * 0.4, r * 0.9, r * 0.85, 0, Math.PI * 0.95, Math.PI * 1.65);
    g.stroke();
    g.restore();
    // a dull sheen only, no shine
    spec(g, x - r * 0.42, y - r * 0.5, r * 0.32, r * 0.14, 0.32, -0.7, '#ffe0c0');
  });
  g.save();
  trace(g, disc);
  g.strokeStyle = rgba('#140a02', 0.8);
  g.lineWidth = 1;
  g.stroke();
  g.restore();
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
  // the jaw: the sole hanging open on a blackened, filthy mouth, a gnarled row of rotten teeth, black drool
  const o2 = 18 - flex * 10;
  const loBase = (x: number) => MOUTH_Y + o2 + 34 - Math.abs(x - CX) * 0.06;
  clip(g, jaw, () => {
    // the throat: black at the back, grimy olive-brown where the lining shows at the edges
    g.fillStyle = rad(g, CX, MOUTH_Y + 22, 4, CX, MOUTH_Y + 22, 120, [
      [0, '#010101'],
      [0.45, '#07060a'],
      [0.8, '#16120a'],
      [1, '#26220e'],
    ]);
    g.fillRect(box.x, 180, box.w, 100);
    // filth: crusted grime and mould in the lining
    blotches(g, { x: CX - 110, y: 186, w: 220, h: 80 }, '#2e2610', 0.55, 6, 0.55, 0.15, 151);
    blotches(g, { x: CX - 110, y: 186, w: 220, h: 80 }, '#4a5a1c', 0.3, 4, 0.66, 0.1, 153);
    // the sole's tread at the very bottom
    g.fillStyle = lin(g, 0, MOUTH_Y + o2 + 30, 0, MOUTH_Y + o2 + 46, [
      [0, '#3a382a'],
      [1, '#141410'],
    ]);
    g.fillRect(box.x, MOUTH_Y + o2 + 38, box.w, 20);
    // the gum: rotten, dark and wet along the jaw
    g.lineCap = 'round';
    g.strokeStyle = '#24100e';
    g.lineWidth = 9;
    g.beginPath();
    for (let x = CX - 96; x <= CX + 96; x += 8) (x === CX - 96 ? g.moveTo(x, loBase(x) + 1) : g.lineTo(x, loBase(x) + 1));
    g.stroke();
    g.strokeStyle = rgba('#6a3a2a', 0.35);
    g.lineWidth = 2;
    g.stroke();
    // the lower teeth: gnarled, uneven, stained, a few fangs among stumps and one gap gone black
    const tr = rng(161);
    for (let x = CX - 84 + tr() * 4; x < CX + 86; x += 14 + tr() * 7) {
      if (tr() < 0.1) {
        fill(g, ell(x, loBase(x) - 1, 3.5, 2.5), '#050403');
        continue;
      }
      const fang = tr() < 0.25;
      const edge = 1 - Math.abs(x - CX) / 110;
      gnarledFang(g, x, loBase(x), (14 + tr() * 10) * (0.6 + 0.4 * edge) * (fang ? 1.6 : 1), (fang ? 15 : 10 + tr() * 5) * (0.7 + 0.3 * edge), -1, (tr() - 0.5) * 0.5, tr() < 0.4, ENAMEL.rot);
    }
    // black rot at the roots
    blotches(g, { x: CX - 100, y: loBase(CX) - 14, w: 200, h: 14 }, '#0a0604', 0.6, 3, 0.6, 0.1, 163);
  });
  if (!o.live) paintTongue(g, 0);
  contact(g, (c) => {
    upper(c);
    c.fill();
  }, 0.65, 4, 6);
  paintRottenUpper(g, upper, green, bone, flex, box);
  // the upper jaw's teeth hang from the lip over the throat, and black drool strings between the jaws
  const upLip = (x: number) => MOUTH_Y + 6 - flex * 4 - ((x - CX) / 106) ** 2 * 8;
  {
    const tr = rng(171);
    for (let x = CX - 80 + tr() * 5; x < CX + 82; x += 15 + tr() * 8) {
      if (tr() < 0.12) continue;
      const fang = tr() < 0.22;
      const edge = 1 - Math.abs(x - CX) / 110;
      gnarledFang(g, x, upLip(x), (13 + tr() * 9) * (0.6 + 0.4 * edge) * (fang ? 1.7 : 1), (fang ? 14 : 9.5 + tr() * 5) * (0.7 + 0.3 * edge), 1, (tr() - 0.5) * 0.5, tr() < 0.4, ENAMEL.rot);
    }
    // the lip's rotten underside over their roots: black-brown and wet, the rolled edge above it catching the light
    const lipRun = (c: Ctx, dy: number) => {
      for (let x = CX - 94; x <= CX + 94; x += 8) (x === CX - 94 ? c.moveTo(x, upLip(x) + dy) : c.lineTo(x, upLip(x) + dy));
    };
    // its thickness swells and thins, and it has rotted right through in two places
    const lipW = (x: number) => 5 + Math.sin(x * 0.13) * 2 + Math.sin(x * 0.37 + 1) * 1.4;
    const broken = (x: number) => (x > CX - 34 && x < CX - 26) || (x > CX + 48 && x < CX + 54);
    for (let x = CX - 96; x < CX + 96; x += 2) {
      if (broken(x)) continue;
      const w = lipW(x);
      fill(g, (c) => {
        c.beginPath();
        c.moveTo(x, upLip(x) - 2 - w / 2);
        c.lineTo(x + 2.4, upLip(x + 2) - 2 - lipW(x + 2) / 2);
        c.lineTo(x + 2.4, upLip(x + 2) - 2 + lipW(x + 2) / 2);
        c.lineTo(x, upLip(x) - 2 + w / 2);
        c.closePath();
      }, '#120a06');
      // a wet glint along its rolled top, only here and there
      const glow = Math.max(0, Math.sin(x * 0.21) * Math.sin(x * 0.07 + 2));
      if (glow > 0.15) fill(g, ell(x + 1, upLip(x) - 2 - w / 2 + 0.7, 1.3, 0.45), rgba('#8a7a5a', 0.45 * glow));
    }
    // the broken ends ragged
    for (const bx of [CX - 34, CX - 26, CX + 48, CX + 54]) fill(g, ell(bx, upLip(bx) - 2, 1.6, lipW(bx) / 2 + 0.5, 0.4), '#120a06');
    void lipRun;
    // soil and rot spilling over its edge
    const lr = rng(491);
    for (let i = 0; i < 7; i++) {
      const x = CX - 80 + i * 26 + (lr() - 0.5) * 10;
      soilClod(g, x, upLip(x) - 5, 3 + lr() * 3.5, 2.2 + lr() * 2, 501 + i);
    }
    // strings of black drool between the jaws, sagging, a green-black sheen on them
    for (const [x, w] of [[CX - 54, 3.2], [CX + 12, 2.4], [CX + 62, 3.6]] as const) {
      const a = upLip(x) + 4;
      const b = loBase(x) - 4;
      const mid = (a + b) / 2 + (b - a) * 0.15;
      g.fillStyle = '#141a0c';
      g.beginPath();
      g.moveTo(x - w, a);
      g.quadraticCurveTo(x - w * 0.25, mid, x - w * 1.1, b);
      g.lineTo(x + w * 1.1, b);
      g.quadraticCurveTo(x + w * 0.25, mid, x + w, a);
      g.closePath();
      g.fill();
      g.strokeStyle = rgba('#c8e890', 0.6);
      g.lineWidth = 1.3;
      g.beginPath();
      g.moveTo(x - w * 0.55, a + 2);
      g.quadraticCurveTo(x - w * 0.1, mid, x - w * 0.6, b - 2);
      g.stroke();
    }
    // drool welling over the lower lip and dripping off it
    for (const [x, r] of [[CX - 30, 3.4], [CX + 40, 4], [CX + 78, 3]] as const) {
      const b = MOUTH_Y + o2 + 42 - Math.abs(x - CX) * 0.1;
      fill(g, ell(x, b, r * 1.2, r * 1.5), rad(g, x - r * 0.4, b - r * 0.5, 0, x, b, r * 1.5, [
        [0, '#2a3020'],
        [0.5, '#08090a'],
        [1, '#010101'],
      ]));
      spec(g, x - r * 0.35, b - r * 0.5, r * 0.3, r * 0.22, 0.8, -0.5);
    }
  }
  paintStrap(g, green, box);
  if (!o.live) paintFlap(g, green);
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
    flap: {
      box: { x: FLAP.x - 18, y: FLAP.y - 5, w: 46, h: 38 },
      frames: 1,
      pivot: [FLAP.x, FLAP.y],
      draw: (g, art) => paintFlap(g, art.primary ?? '#6a7a52'),
    },
  },
  draw(ctx, art, p, o) {
    drawZombie(ctx, art, p, o);
  },
});
