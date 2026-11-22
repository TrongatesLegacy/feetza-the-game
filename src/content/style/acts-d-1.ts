// Batch D, part 1: the boss-fight helpers of Acts 1b and 2a (Blacksmith Boot, Little Gargoyle) and Act 7's villain
// feet (Henchman Spats, Jetpack Jackboots, Goon Galoshes), redrawn in the style kit. Life in play:
// src/content/styleLive/acts-d.ts.

import type { FootArt } from '../../data/feet';
import { type StyleToe, onToe } from '../../art/style/anatomy';
import { LIGHT, type PathFn, type Pose, ao, crease, glint, inkOf, spec, texture } from '../../art/style/kit';
import { Sil, lobe } from '../../art/style/sil';
import { type PartDef, registerStyle } from '../../art/style/registry';
import { blotches, clawPath, contact, paintClaw, rivet, stitches } from '../../art/style/details';
import { type Ctx, hashStr, rgba, rng, shade } from '../../art/util';
import { SHOE_RIG, ell, finishLight, hgrad, piece, prop, rrect, solePath, upperPath, vgrad, within } from './roster-kit';
import { CX, DMAT, glowOnly, oneLight } from './acts-d-kit';

// ════════════════════════ Blacksmith Boot ════════════════════════
// A scorched, oiled leather work boot with a steel toe, a leather apron strapped over the front (tongs in its
// pocket) and a forging hammer gripped across it. In play the hammer bobs on its grip, embers drift off the apron
// and every landing rings sparks off the steel toe.

const SMITH = { topW: 62, ballW: 104, toeY: 238 };
/** The hammer: the grip it swings round, the handle's two ends and the head's centre. */
export const HAMMER = { pivot: [CX - 36, 168] as [number, number], butt: [CX - 74, 204] as [number, number], neck: [CX + 66, 60] as [number, number], head: [CX + 74, 52] as [number, number] };

function hammer(g: Ctx): void {
  const [bx, by] = HAMMER.butt;
  const [nx, ny] = HAMMER.neck;
  const [hx, hy] = HAMMER.head;
  const ang = Math.atan2(ny - by, nx - bx);
  const handle: PathFn = (c) => {
    c.save();
    c.translate(bx, by);
    c.rotate(ang);
    const L = Math.hypot(nx - bx, ny - by);
    c.beginPath();
    c.roundRect(-4, -6.5, L + 10, 13, 6);
    c.restore();
  };
  const head: PathFn = (c) => {
    c.save();
    c.translate(hx, hy);
    c.rotate(ang);
    c.beginPath();
    // a blocky sledge head across the handle, chamfered faces at both ends
    c.moveTo(-18, -40);
    c.lineTo(18, -40);
    c.lineTo(22, -34);
    c.lineTo(22, 34);
    c.lineTo(18, 40);
    c.lineTo(-18, 40);
    c.lineTo(-22, 34);
    c.lineTo(-22, -34);
    c.closePath();
    c.restore();
  };
  const box = { x: bx - 20, y: hy - 60, w: hx - bx + 80, h: by - hy + 80 };
  prop(g, [handle, head], box, (pg) => {
    // the handle: ash wood, darkened where it's gripped
    within(pg, handle, () => {
      pg.fillStyle = hgrad(pg, bx - 10, bx + 10, [[0, '#c8955a'], [1, '#7a4a22']]);
      pg.fillRect(box.x, box.y, box.w, box.h);
      piece(pg, handle, box, 'wood', '#b07a42', { shadow: 0, spec: false, size: 5 });
      ao(pg, HAMMER.pivot[0], HAMMER.pivot[1], 18, 10, 0.5, ang, '#2a1206');
      // a leather grip wrap
      pg.save();
      pg.translate(HAMMER.pivot[0], HAMMER.pivot[1]);
      pg.rotate(ang);
      for (let i = -3; i <= 3; i++) {
        pg.fillStyle = i % 2 ? '#3a2214' : '#4a2c18';
        pg.fillRect(i * 6 - 3, -7, 5, 14);
        pg.fillStyle = rgba('#ffffff', 0.12);
        pg.fillRect(i * 6 - 3, -6, 5, 2);
      }
      pg.restore();
    });
    // the head: forged steel, blued and scaled near the eye, a bright worn face
    within(pg, head, () => {
      pg.save();
      pg.translate(hx, hy);
      pg.rotate(ang);
      pg.fillStyle = hgrad(pg, -22, 22, [[0, '#e8ecf2'], [0.28, '#a8b0bc'], [0.6, '#5a626e'], [1, '#262a32']]);
      pg.fillRect(-24, -50, 48, 100);
      texture(pg, 'brushed', { x: -22, y: -50, w: 44, h: 100 }, 0.25);
      // forge scale and temper blue round the eye
      pg.fillStyle = vgrad(pg, -16, 18, [[0, rgba('#3a4a8a', 0)], [0.5, rgba('#3a4ac8', 0.3)], [1, rgba('#c8a040', 0)]]);
      pg.fillRect(-22, -16, 44, 34);
      blotches(pg, { x: -22, y: -50, w: 44, h: 100 }, '#1a1c22', 0.3, 4, 0.66, 0.06, 44);
      // the striking face, polished bright, and a chamfer line
      pg.fillStyle = vgrad(pg, -40, -32, [[0, '#ffffff'], [1, '#b8c0cc']]);
      pg.fillRect(-22, -40, 44, 7);
      pg.fillStyle = vgrad(pg, 32, 40, [[0, '#7a828e'], [1, '#2a2e36']]);
      pg.fillRect(-22, 33, 44, 7);
      pg.fillStyle = rgba('#000000', 0.3);
      for (const y of [-33, 32]) pg.fillRect(-22, y, 44, 1.5);
      pg.restore();
    });
    spec(pg, hx - 14, hy - 14, 7, 26, 0.7, ang + Math.PI / 2);
    glint(pg, hx - 18, hy - 28, 5, 0.9);
  }, '#1a120c', { w: 3.4 });
}

function drawSmith(ctx: Ctx, art: FootArt, p: Pose, live: boolean): void {
  const leather = art.primary ?? '#5a3d2b';
  const apronC = art.secondary ?? '#9a5a2a';
  const flex = Math.max(0, p.curl);
  const upper = upperPath(SMITH, flex);
  const sole = solePath(SMITH, flex, 24, 186, 5);
  const collar = rrect(CX - 66, -6, 132, 30, 12);
  const box = { x: CX - 118, y: -10, w: 236, h: 280 };
  const sil = new Sil(ctx, [sole, upper, collar], box);
  const g = sil.g;
  // the sole: a stacked leather welt over a black rubber tread
  within(g, sole, () => {
    g.fillStyle = vgrad(g, 186, 264, [[0, '#4a2c18'], [0.55, '#2a1a10'], [0.62, '#141010'], [1, '#0a0808']]);
    g.fillRect(box.x, 180, box.w, 90);
    texture(g, 'rubber', box, 0.35);
    // tread lugs
    g.fillStyle = rgba('#000000', 0.45);
    for (let i = 0; i < 9; i++) g.fillRect(CX - 88 + i * 21, 255 - flex * 5, 12, 6);
    spec(g, CX - 60, 246, 36, 4, 0.2, 0.05);
  });
  // the upper: oiled leather, scorched and spark-pocked
  piece(g, upper, box, 'leather', leather, { shadow: 0.4, size: 16 });
  within(g, upper, () => {
    blotches(g, box, '#140a06', 0.3, 22, 0.58, 0.22, 41);
    // little burn holes from flying sparks
    const r = rng(hashStr('smith-burns'));
    for (let i = 0; i < 16; i++) {
      const x = CX - 90 + r() * 180;
      const y = 60 + r() * 140;
      ao(g, x + 1, y + 1, 4, 3, 0.4, 0, '#000000');
      g.fillStyle = '#120806';
      g.beginPath();
      g.arc(x, y, 1 + r() * 1.4, 0, Math.PI * 2);
      g.fill();
    }
    // the steel toe cap, worn through the leather and polished by use
    const cap: PathFn = (c) => c.ellipse(CX, 240 - flex * 6, 84, 50, 0, Math.PI, 0);
    const capP: PathFn = (c) => {
      c.beginPath();
      cap(c);
      c.closePath();
    };
    contact(g, (c) => {
      capP(c);
      c.fill();
    }, 0.5, 2.5, 4);
    within(g, capP, () => {
      const dg = g.createRadialGradient(CX - 30, 196 - flex * 5, 4, CX, 232, 96);
      dg.addColorStop(0, '#ffffff');
      dg.addColorStop(0.25, '#c8d0da');
      dg.addColorStop(0.6, '#6a727e');
      dg.addColorStop(1, '#1e2228');
      g.fillStyle = dg;
      g.fillRect(box.x, 170, box.w, 80);
      texture(g, 'brushed', box, 0.3);
      blotches(g, { x: CX - 92, y: 178, w: 184, h: 64 }, '#4a3a2a', 0.3, 9, 0.64, 0.1, 43);
      spec(g, CX - 40, 200 - flex * 5, 30, 8, 0.8, -0.1);
    });
    crease(g, (c) => cap(c), 2, '#000000', 0.55, 0.2);
    rivet(g, CX - 84, 228 - flex * 5, 3.6, '#c0c6d0');
    rivet(g, CX + 84, 228 - flex * 5, 3.6, '#c0c6d0');
    glint(g, CX - 46, 196 - flex * 5, 4.5, 0.9);
  });
  // the apron: heavy leather on a strap round the ankle, stitched edges, a pocket with tongs
  const apron: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 44, 18);
    c.lineTo(CX + 44, 18);
    c.bezierCurveTo(CX + 56, 80, CX + 62, 140, CX + 58, 178);
    c.quadraticCurveTo(CX, 194, CX - 58, 178);
    c.bezierCurveTo(CX - 62, 140, CX - 56, 80, CX - 44, 18);
    c.closePath();
  };
  piece(g, apron, box, 'suede', shade(apronC, 0.08), { shadow: 0.6, size: 14, texA: 0.25 });
  within(g, apron, () => {
    spec(g, CX - 22, 70, 26, 60, 0.18, 0.1, LIGHT.key);
    blotches(g, { x: CX - 60, y: 18, w: 120, h: 180 }, '#2a140a', 0.3, 18, 0.58, 0.25, 47);
    // scorch marks from the forge, low on the apron
    blotches(g, { x: CX - 60, y: 120, w: 120, h: 80 }, '#0a0604', 0.45, 7, 0.68, 0.08, 49);
    // the edge folded over and stitched
    stitches(g, (c) => {
      c.moveTo(CX - 40, 24);
      c.bezierCurveTo(CX - 51, 80, CX - 56, 140, CX - 52, 172);
      c.quadraticCurveTo(CX, 186, CX + 52, 172);
      c.bezierCurveTo(CX + 56, 140, CX + 51, 80, CX + 40, 24);
    }, rgba('#e8d0a0', 0.8), 1.5, 4, 3.5);
    // the pocket, with tongs in it
    const pocket = rrect(CX - 32, 92, 64, 50, 6);
    for (const [ox, rot] of [[-8, -0.16], [8, 0.14]] as const) {
      g.save();
      g.translate(CX + ox, 96);
      g.rotate(rot);
      g.fillStyle = hgrad(g, -3, 3, [[0, '#8a929e'], [0.5, '#3a3e46'], [1, '#14161a']]);
      g.fillRect(-3, -46, 6, 50);
      g.restore();
    }
    piece(g, pocket, box, 'leather', shade(apronC, -0.1), { shadow: 0.6, size: 8 });
    stitches(g, (c) => c.roundRect(CX - 28, 96, 56, 42, 4), rgba('#e8d0a0', 0.75), 1.3, 3, 3);
    crease(g, (c) => {
      c.moveTo(CX - 30, 98);
      c.lineTo(CX + 30, 98);
    }, 2, '#000000', 0.5, 0.2);
  });
  // the ankle strap that holds the apron, with an iron buckle
  const strap: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 68, 10);
    c.quadraticCurveTo(CX, 22, CX + 68, 10);
    c.lineTo(CX + 68, 26);
    c.quadraticCurveTo(CX, 38, CX - 68, 26);
    c.closePath();
  };
  piece(g, strap, box, 'leather', shade(leather, -0.25), { shadow: 0.5, size: 6 });
  g.strokeStyle = '#2a2a30';
  g.lineWidth = 3.4;
  g.strokeRect(CX + 22, 14, 18, 18);
  g.strokeStyle = rgba('#c8ccd4', 0.6);
  g.lineWidth = 1;
  g.strokeRect(CX + 21, 13, 18, 18);
  // the collar: a padded roll
  within(g, collar, () => {
    g.fillStyle = vgrad(g, -6, 24, [[0, rgba('#000000', 0.55)], [0.5, rgba(shade(leather, 0.2), 0.2)], [1, rgba('#000000', 0.1)]]);
    g.fillRect(box.x, -8, box.w, 34);
  });
  lobe(g, upper, { x: box.x, y: -20, w: box.w, h: 300 }, -30, 0, '#000000', 0.5, 16, 0.18);
  finishLight(sil, leather);
  sil.finish(inkOf(leather), { openTop: -5 });
  if (!live) hammer(ctx);
}

registerStyle('blacksmith', {
  contactY: 262,
  halfWidth: 110,
  rig: SHOE_RIG,
  leg: { kind: 'denim', hw: 66, join: 'hem' },
  parts: { hammer: { box: { x: HAMMER.butt[0] - 24, y: HAMMER.head[1] - 66, w: HAMMER.head[0] - HAMMER.butt[0] + 90, h: HAMMER.butt[1] - HAMMER.head[1] + 92 }, frames: 1, pivot: HAMMER.pivot, draw: (g) => hammer(g) } },
  draw(ctx, art, p, o) {
    if (o.emissive || o.heat) return;
    drawSmith(ctx, art, p, o.live);
  },
});

// ════════════════════════ Little Gargoyle ════════════════════════
// A pocket gargoyle's foot in warm sandstone: a knuckled four-toed talon with black claws, weathered cracks, bright
// moss in the hollows and terracotta bat wings at the ankle. In play the wings beat, grit sifts off it and moss
// crumbs fall when it lands.

/** The wings: root (pivot), the tip, and its span downwards. */
export const GWINGS = [
  { s: -1, root: [CX - 50, 44] as [number, number] },
  { s: 1, root: [CX + 50, 44] as [number, number] },
];

function gWingPath(s: number, rx: number, ry: number): PathFn {
  return (c) => {
    c.beginPath();
    c.moveTo(rx, ry - 6);
    // the leading edge, out and up to the wrist, then the finger tips scalloping down and back
    c.quadraticCurveTo(rx + s * 46, ry - 34, rx + s * 92, ry - 22);
    c.lineTo(rx + s * 96, ry - 12);
    c.quadraticCurveTo(rx + s * 78, ry - 4, rx + s * 84, ry + 14);
    c.quadraticCurveTo(rx + s * 64, ry + 6, rx + s * 64, ry + 28);
    c.quadraticCurveTo(rx + s * 44, ry + 16, rx + s * 38, ry + 38);
    c.quadraticCurveTo(rx + s * 22, ry + 22, rx, ry + 26);
    c.closePath();
  };
}

const GW = 1;

function gWing(g: Ctx, s: number, rx: number, ry: number, stone: string, membrane: string): void {
  g.save();
  g.translate(rx, ry);
  g.scale(GW, GW);
  g.translate(-rx, -ry);
  gWingAt(g, s, rx, ry, stone, membrane);
  g.restore();
}

function gWingAt(g: Ctx, s: number, rx: number, ry: number, stone: string, membrane: string): void {
  const path = gWingPath(s, rx, ry);
  const box = { x: Math.min(rx, rx + s * 100) - 4, y: ry - 40, w: 108, h: 84 };
  prop(g, [path], box, (wg, sil) => {
    sil.form({ base: membrane, shadowTint: '#3a0a08', ramp: 0.8, form: 0.5, formSize: 12, bevel: 0.3, rim: 0.5 });
    texture(wg, 'speckle', box, 0.35, 1);
    // the finger bones radiating from the wrist, stone
    const [wx, wy] = [rx + s * 90, ry - 20];
    for (const [tx, ty] of [[rx + s * 84, ry + 12], [rx + s * 64, ry + 26], [rx + s * 38, ry + 36]] as const) {
      crease(wg, (c) => {
        c.moveTo(wx, wy);
        c.quadraticCurveTo((wx + tx) / 2 + s * 4, (wy + ty) / 2 - 4, tx, ty);
      }, 3.4, '#2a0a04', 0.5, 0.3);
    }
    wg.save();
    wg.lineCap = 'round';
    wg.strokeStyle = stone;
    wg.lineWidth = 5;
    wg.beginPath();
    wg.moveTo(rx, ry - 4);
    wg.quadraticCurveTo(rx + s * 46, ry - 30, wx, wy);
    wg.stroke();
    wg.strokeStyle = rgba('#fff4dc', 0.5);
    wg.lineWidth = 1.4;
    wg.stroke();
    wg.restore();
    blotches(wg, box, '#5a2a10', 0.35, 8, 0.6, 0.15, 51 + s);
  }, inkOf(membrane), { w: 2.4 });
}

function gargToes(p: Pose): StyleToe[] {
  const c = Math.max(0, p.curl);
  const sp = Math.max(0, -p.curl);
  const base: [number, number, number, number, number][] = [
    [CX - 70, 236, 22, 30, 0.3],
    [CX - 24, 248, 24, 33, 0.08],
    [CX + 24, 248, 24, 33, -0.08],
    [CX + 70, 236, 22, 30, -0.3],
  ];
  return base.map(([x, y, rx, ry, rot], i) => {
    const w = p.wiggle[i + 1] ?? 0;
    return { cx: x + (x - CX) * 0.08 * sp, cy: y - ry * 0.3 * c + 4 * w, rx: rx * (1 + 0.06 * c), ry: ry * (1 - 0.25 * c), rot: rot * (1 + sp * 0.5) - w * 0.08 };
  });
}

const gargBody: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 48, -6);
  c.bezierCurveTo(CX - 50, 50, CX - 100, 110, CX - 96, 190);
  c.lineTo(CX - 80, 238);
  c.lineTo(CX + 80, 238);
  c.lineTo(CX + 96, 190);
  c.bezierCurveTo(CX + 100, 110, CX + 50, 50, CX + 48, -6);
  c.closePath();
};

function drawGarg(ctx: Ctx, art: FootArt, p: Pose, live: boolean): void {
  const stone = art.skin;
  const membrane = art.primary ?? '#b4603a';
  const moss = art.secondary ?? '#7fb04a';
  const toes = gargToes(p);
  const c = Math.max(0, p.curl);
  const claws = toes.map((t, i) => {
    const [x, y] = onToe(t, Math.PI / 2);
    return { x, y: y - t.ry * 0.3, ang: Math.PI / 2 - t.rot * 1.3, len: 34 * (1 + c * 0.3), w: 15, hook: (i < 2 ? 0.35 : -0.35) * (1 + c * 0.6) };
  });
  if (!live) for (const w of GWINGS) gWing(ctx, w.s, w.root[0], w.root[1], stone, membrane);
  const toeP = (t: StyleToe): PathFn => ell(t.cx, t.cy, t.rx, t.ry, t.rot);
  const box = { x: CX - 120, y: -8, w: 240, h: 320 };
  const sil = new Sil(ctx, [gargBody, ...toes.map(toeP), ...claws.map((k) => clawPath(k.x, k.y, k.ang, k.len, k.w, k.hook))], box);
  const g = sil.g;
  const st = DMAT.sandstone;
  sil.form({ base: stone, shadowTint: st.shadowTint, ramp: 0.85, form: 0.6, formSize: 30, bevel: 0.4, rim: 0.45 });
  texture(g, 'speckle', box, 0.35, 1.2);
  texture(g, 'grain', box, 0.3, 1.4);
  texture(g, 'stone', box, 0.15, 2.2);
  // the knuckles: each toe a carved block, its own volume, with a groove across the joint
  toes.forEach((t) => {
    lobe(g, toeP(t), { x: t.cx - t.rx - 4, y: t.cy - t.ry - 4, w: t.rx * 2 + 8, h: t.ry * 2 + 8 }, t.cy - t.ry * 0.9, t.cy - t.ry * 0.2, '#3a1a08', 0.6, 7, 0.4);
    for (const f of [-0.1, 0.25]) {
      crease(g, (cc) => {
        cc.moveTo(t.cx - t.rx * 0.6, t.cy + t.ry * f);
        cc.quadraticCurveTo(t.cx, t.cy + t.ry * (f + 0.16), t.cx + t.rx * 0.6, t.cy + t.ry * f);
      }, 2, '#3a1a08', 0.55, 0.35);
    }
  });
  // the clefts between the knuckles, deep in shadow; a lit top on each knuckle
  for (let i = 0; i < toes.length - 1; i++) {
    const a = toes[i];
    const b = toes[i + 1];
    const kx = (a.cx + a.rx * 0.8 + b.cx - b.rx * 0.8) / 2;
    ao(g, kx, Math.max(a.cy, b.cy) + 6, 9, 22, 0.55, 0, '#2a1004');
  }
  toes.forEach((t) => spec(g, t.cx - t.rx * 0.3, t.cy - t.ry * 0.1, t.rx * 0.5, t.ry * 0.3, 0.35, -0.5, LIGHT.key));
  // weathering: dark streaks running down from the ankle, cracks, chips
  blotches(g, box, '#5a3a20', 0.3, 30, 0.55, 0.25, 53);
  const r = rng(hashStr('garg-cracks'));
  for (let i = 0; i < 7; i++) {
    let x = CX - 70 + r() * 140;
    let y = 20 + r() * 150;
    crease(g, (cc) => {
      cc.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        x += (r() - 0.5) * 22;
        y += 8 + r() * 14;
        cc.lineTo(x, y);
      }
    }, 1.4, '#2a1206', 0.7, 0.4);
  }
  // moss in the hollows: on the clefts between toes and along the top
  // moss in the hollows: clumps in the clefts between the knuckles and on the ankle's ledge
  const clump = (x: number, y: number, rad: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * rad;
      const px = x + Math.cos(a) * d;
      const py = y + Math.sin(a) * d * 0.7;
      const pr = 1.2 + r() * 2.6 * (1 - d / rad * 0.5);
      ao(g, px + 1.2, py + 1.6, pr * 1.4, pr, 0.25, 0, '#1a2a04');
      g.fillStyle = r() < 0.45 ? shade(moss, -0.3) : r() < 0.8 ? moss : shade(moss, 0.35);
      g.beginPath();
      g.arc(px, py, pr, 0, Math.PI * 2);
      g.fill();
    }
  };
  for (let i = 0; i < toes.length - 1; i++) {
    const a = toes[i];
    const b = toes[i + 1];
    clump((a.cx + b.cx) / 2, Math.min(a.cy, b.cy) - a.ry * 0.55, 11, 40);
  }
  clump(CX - 30, 18, 14, 40);
  clump(CX + 62, 120, 9, 22);
  clump(CX - 84, 170, 8, 18);
  // claws: black stone, glossy
  for (const k of claws) paintClaw(g, k.x, k.y, k.ang, k.len, k.w, k.hook, '#5a5a62', '#0a0a0e');
  oneLight(sil, '#2a1206', 0.4, 18);
  sil.finish(inkOf(shade(stone, -0.2)), { openTop: -5 });
}

function gWingPart(i: number): PartDef {
  const w = GWINGS[i];
  const [rx, ry] = w.root;
  const x = w.s < 0 ? rx - 106 * GW : rx - 6 * GW;
  return { box: { x, y: ry - 48 * GW, w: 112 * GW, h: 96 * GW }, frames: 1, pivot: w.root, draw: (g, art) => gWing(g, w.s, rx, ry, art.skin, art.primary ?? '#b4603a') };
}

registerStyle('gargoylet', {
  contactY: 290,
  halfWidth: 106,
  rig: { from: 196, to: 214 },
  leg: { kind: 'skin', hw: 48, join: 'blend', fade: 24 },
  parts: { wingL: gWingPart(0), wingR: gWingPart(1) },
  draw(ctx, art, p, o) {
    if (o.emissive || o.heat) return;
    drawGarg(ctx, art, p, o.live);
  },
});

// ════════════════════════ Henchman Spats ════════════════════════
// Cheap patent oxfords under white canvas spats, buttoned up the outside, a red band at the top. In play they strut:
// a jaunty swing, a glint off the patent toe.

const SPATS = { topW: 50, ballW: 92, toeY: 244 };

function drawSpats(ctx: Ctx, art: FootArt, p: Pose): void {
  const black = art.primary ?? '#2b2d36';
  const spat = art.secondary ?? '#f1ede2';
  const band = (art.extra?.band as string | undefined) ?? '#c8323a';
  const flex = Math.max(0, p.curl);
  const upper = upperPath(SPATS, flex);
  const sole = solePath(SPATS, flex, 14, 196, 2);
  const spatP: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 54, -6);
    c.bezierCurveTo(CX - 58, 50, CX - 92, 110, CX - 94, 166);
    c.bezierCurveTo(CX - 50, 188, CX + 50, 188, CX + 95, 166);
    c.bezierCurveTo(CX + 94, 110, CX + 58, 50, CX + 54, -6);
    c.closePath();
  };
  const box = { x: CX - 104, y: -10, w: 208, h: 280 };
  const sil = new Sil(ctx, [sole, upper, spatP], box);
  const g = sil.g;
  within(g, sole, () => {
    g.fillStyle = vgrad(g, 196, 262, [[0, '#3a2a20'], [1, '#100a08']]);
    g.fillRect(box.x, 190, box.w, 80);
    texture(g, 'grain', box, 0.3);
  });
  // the shoe: patent leather, a mirror toe
  piece(g, upper, box, 'patent', black, { shadow: 0.4 });
  within(g, upper, () => {
    spec(g, CX - 40, 214 - flex * 5, 38, 12, 0.85, -0.15);
    spec(g, CX + 50, 222 - flex * 5, 20, 6, 0.35, 0.2, '#cfe2ff');
    glint(g, CX - 54, 210 - flex * 5, 5, 0.95);
    // the toe cap seam (a cheap brogue line)
    crease(g, (c) => c.ellipse(CX, 236 - flex * 6, 76, 40, 0, Math.PI + 0.25, -0.25), 1.6, '#000000', 0.7, 0.18);
  });
  // the spat: white canvas, cut to the shoe, a strap under the instep
  piece(g, spatP, box, 'linen', spat, { shadow: 0.55, size: 14 });
  within(g, spatP, () => {
    texture(g, 'canvas', box, 0.25, 0.9);
    // a stain or two (it's a cheap suit)
    blotches(g, box, '#c8bfa0', 0.3, 14, 0.68, 0.15, 61);
    // the red band at the top
    g.fillStyle = band;
    g.fillRect(box.x, 16, box.w, 13);
    g.fillStyle = rgba('#ffffff', 0.25);
    g.fillRect(box.x, 17, box.w, 2.5);
    g.fillStyle = rgba('#000000', 0.25);
    g.fillRect(box.x, 27, box.w, 2);
    // the buttoned flap down the outside
    crease(g, (c) => {
      c.moveTo(CX - 30, 22);
      c.bezierCurveTo(CX - 40, 80, CX - 62, 130, CX - 70, 170);
    }, 2.2, '#5a5a6a', 0.45, 0.4);
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const x = CX - 36 - t * 32 - Math.sin(t * 2) * 4;
      const y = 44 + t * 116;
      piece(g, ell(x, y, 4.6, 4.6), box, 'patent', '#1a1a20', { shadow: 0.5, size: 2 });
      glint(g, x - 1.6, y - 1.6, 1.8, 0.95);
    }
    // folds where it bends over the instep
    for (const [y, w] of [[120, 50], [146, 60]] as const) {
      crease(g, (c) => {
        c.moveTo(CX - w + 20, y);
        c.quadraticCurveTo(CX + 10, y + 8, CX + w, y - 4);
      }, 3, '#6a6a8a', 0.22, 0.3);
    }
    stitches(g, (c) => {
      c.moveTo(CX - 90, 162);
      c.bezierCurveTo(CX - 48, 182, CX + 48, 182, CX + 91, 162);
    }, rgba('#8a8a9a', 0.8), 1.2, 3, 3);
  });
  // the spat casts a shadow onto the shoe below it
  ao(g, CX, 184, 90, 10, 0.3);
  finishLight(sil, black, '#101020', 0.35);
  sil.finish(inkOf(black), { openTop: -5 });
}

registerStyle('henchman', {
  contactY: 260,
  halfWidth: 94,
  rig: { from: 196, to: 214 },
  leg: { kind: 'wool', hw: 54, join: 'hem' },
  draw(ctx, art, p, o) {
    if (o.emissive || o.heat) return;
    drawSpats(ctx, art, p);
  },
});

// ════════════════════════ Jetpack Jackboots ════════════════════════
// A tall olive jackboot on a hobnailed sole, two buckled straps, and a rocket strapped to each side. In play the
// rockets burn (flames and heat haze trail behind it in the world), sputter before it dives and roar on the way in.

/** The rockets' nozzle mouths (design space): flames come out here. */
export const JET_NOZZLES: [number, number][] = [[CX - 104, 222], [CX + 104, 222]];

const jetBoot = (flex: number): PathFn => (c) => {
  const b = 242 - flex * 6;
  c.beginPath();
  c.moveTo(CX - 60, -6);
  c.bezierCurveTo(CX - 62, 60, CX - 80, 120, CX - 86, 170);
  c.bezierCurveTo(CX - 90, b - 18, CX - 52, b, CX, b);
  c.bezierCurveTo(CX + 52, b, CX + 90, b - 18, CX + 86, 170);
  c.bezierCurveTo(CX + 80, 120, CX + 62, 60, CX + 60, -6);
  c.closePath();
};

const jetSole = (flex: number): PathFn => (c) => {
  const b = 264 - flex * 5;
  c.beginPath();
  c.moveTo(CX - 90, 196);
  c.bezierCurveTo(CX - 96, 240, CX - 80, b, CX - 50, b);
  c.lineTo(CX + 50, b);
  c.bezierCurveTo(CX + 80, b, CX + 96, 240, CX + 90, 196);
  c.closePath();
};

const rocket = (s: number): PathFn => (c) => {
  const x = CX + s * 104;
  c.beginPath();
  // a nose cone up top, the body, a flared nozzle
  c.moveTo(x - 14, 70);
  c.quadraticCurveTo(x - 14, 34, x, 24);
  c.quadraticCurveTo(x + 14, 34, x + 14, 70);
  c.lineTo(x + 14, 190);
  c.lineTo(x + 19, 222);
  c.lineTo(x - 19, 222);
  c.lineTo(x - 14, 190);
  c.closePath();
};

function drawJet(ctx: Ctx, art: FootArt, p: Pose, o: { emissive?: boolean; heat?: boolean }): void {
  const olive = art.primary ?? '#3b3f2e';
  const orange = art.secondary ?? '#ff8a1c';
  const flex = Math.max(0, p.curl);
  const boot = jetBoot(flex);
  const sole = jetSole(flex);
  const box = { x: CX - 130, y: -10, w: 260, h: 280 };
  const parts = [sole, boot, rocket(-1), rocket(1)];
  if (o.emissive) {
    glowOnly(ctx, parts, box, (g) => {
      for (const [x, y] of JET_NOZZLES) {
        const gr = g.createRadialGradient(x, y + 4, 1, x, y, 26);
        gr.addColorStop(0, rgba('#fff4c0', 1));
        gr.addColorStop(0.4, rgba(orange, 0.8));
        gr.addColorStop(1, rgba(orange, 0));
        g.fillStyle = gr;
        g.fillRect(x - 26, y - 30, 52, 40);
      }
    });
    return;
  }
  if (o.heat) return;
  const sil = new Sil(ctx, parts, box);
  const g = sil.g;
  within(g, sole, () => {
    g.fillStyle = vgrad(g, 196, 266, [[0, '#2a2418'], [1, '#0c0a08']]);
    g.fillRect(box.x, 190, box.w, 80);
    texture(g, 'cast', box, 0.35);
    // hobnails round the edge
    for (let i = 0; i < 11; i++) {
      const x = CX - 76 + i * 15.2;
      rivet(g, x, 256 - flex * 5, 2.6, '#c8ccd4');
    }
  });
  piece(g, boot, box, 'leather', olive, { shadow: 0.4, size: 16, texA: 0.16 });
  within(g, boot, () => {
    // polished toe and shin, creases at the ankle
    spec(g, CX - 44, 220 - flex * 5, 16, 4, 0.75, -0.12);
    spec(g, CX - 30, 40, 8, 40, 0.35, 0.05);
    for (const [y, w] of [[150, 60], [166, 70], [182, 76]] as const) {
      crease(g, (c) => {
        c.moveTo(CX - w, y - flex * 4);
        c.quadraticCurveTo(CX, y - 12 - flex * 8, CX + w, y - flex * 4);
      }, 2.2 + flex, '#0a0c06', 0.35 + flex * 0.3, 0.16);
    }
    blotches(g, box, '#1a1c10', 0.16, 26, 0.6, 0.3, 63);
    // the two straps with buckles
    for (const y of [70, 112]) {
      const strap: PathFn = (c) => {
        c.beginPath();
        c.moveTo(CX - 100, y);
        c.quadraticCurveTo(CX, y + 12, CX + 100, y);
        c.lineTo(CX + 100, y + 16);
        c.quadraticCurveTo(CX, y + 28, CX - 100, y + 16);
        c.closePath();
      };
      piece(g, strap, box, 'leather', '#6a4a2a', { shadow: 0.55, size: 5 });
      stitches(g, (c) => {
        c.moveTo(CX - 100, y + 3);
        c.quadraticCurveTo(CX, y + 15, CX + 100, y + 3);
      }, rgba('#d8c090', 0.6), 1.1, 3, 3);
      const bx = CX;
      const by = y + 8;
      contact(g, (c) => {
        c.beginPath();
        c.roundRect(bx - 10, by - 10, 20, 20, 3);
        c.fill();
      }, 0.5);
      g.fillStyle = hgrad(g, bx - 10, bx + 10, [[0, '#e8ecf2'], [0.5, '#8a929e'], [1, '#3a3e46']]);
      g.beginPath();
      g.roundRect(bx - 10, by - 10, 20, 20, 3);
      g.fill();
      g.fillStyle = '#4a3420';
      g.fillRect(bx - 5, by - 6, 10, 12);
      g.fillStyle = '#c8ccd4';
      g.fillRect(bx - 1.2, by - 7, 2.4, 14);
      glint(g, bx - 6, by - 6, 2.6, 0.9);
    }
  });
  // the rockets: polished aluminium with an orange band, a soot-blackened nozzle
  for (const s of [-1, 1]) {
    const rk = rocket(s);
    const x = CX + s * 104;
    within(g, rk, () => {
      g.fillStyle = hgrad(g, x - 19, x + 19, [[0, '#7a828e'], [0.2, '#f4f8fc'], [0.42, '#b8c0cc'], [0.75, '#5a626e'], [1, '#2a2e36']]);
      g.fillRect(x - 20, 20, 40, 210);
      texture(g, 'brushed', box, 0.2);
      // the orange band and the nozzle
      g.fillStyle = hgrad(g, x - 14, x + 14, [[0, shade(orange, 0.2)], [0.3, shade(orange, 0.35)], [1, shade(orange, -0.4)]]);
      g.fillRect(x - 20, 92, 40, 16);
      g.fillStyle = hgrad(g, x - 19, x + 19, [[0, '#3a3a40'], [0.3, '#6a6a74'], [1, '#0a0a0e']]);
      g.fillRect(x - 20, 190, 40, 34);
      g.fillStyle = vgrad(g, 196, 222, [[0, rgba('#000000', 0)], [1, rgba('#000000', 0.6)]]);
      g.fillRect(x - 20, 196, 40, 28);
      for (const y of [70, 190]) {
        g.fillStyle = rgba('#000000', 0.3);
        g.fillRect(x - 20, y, 40, 2);
      }
      for (const y of [80, 178]) rivet(g, x - 6 * s, y, 2.4, '#d8dee8');
      spec(g, x - 6, 50, 4, 26, 0.6, 0);
    });
    // the nozzle's dark mouth
    g.fillStyle = '#0a0808';
    g.beginPath();
    g.ellipse(x, 221, 16, 4, 0, 0, Math.PI * 2);
    g.fill();
    // the mounting bracket, bolted to the boot
    const br = rrect(x - s * 30 - 12, 150, 24, 20, 4);
    piece(g, br, box, 'iron', '#5a606a', { shadow: 0.6, size: 4 });
    rivet(g, x - s * 30, 160, 3, '#c0c6d0');
  }
  ao(g, CX, 6, 60, 6, 0.35);
  finishLight(sil, olive, '#0a1008');
  sil.finish(inkOf(olive), { openTop: -5 });
}

registerStyle('jetpack', {
  contactY: 264,
  halfWidth: 112,
  rig: { from: 224, to: 240 },
  leg: { kind: 'wool', hw: 60, join: 'into' },
  draw(ctx, art, p, o) {
    drawJet(ctx, art, p, o);
  },
});

// ════════════════════════ Goon Galoshes ════════════════════════
// Big, glossy, yellow rubber overshoes on a heavy: three black clasp buckles, a ribbed black sole, wet with
// rain. In play rainwater drips off them and splashes when they land.

const goonBody = (flex: number): PathFn => (c) => {
  const b = 252 - flex * 6;
  c.beginPath();
  c.moveTo(CX - 64, 0);
  c.bezierCurveTo(CX - 70, 60, CX - 104, 110, CX - 104, 170);
  c.bezierCurveTo(CX - 104, b - 14, CX - 66, b, CX, b);
  c.bezierCurveTo(CX + 66, b, CX + 106, b - 14, CX + 106, 170);
  c.bezierCurveTo(CX + 104, 110, CX + 70, 60, CX + 64, 0);
  c.closePath();
};

const goonSole = (flex: number): PathFn => (c) => {
  const b = 270 - flex * 5;
  c.beginPath();
  c.moveTo(CX - 108, 196);
  c.bezierCurveTo(CX - 112, 236, CX - 94, b, CX - 60, b);
  c.lineTo(CX + 60, b);
  c.bezierCurveTo(CX + 94, b, CX + 114, 236, CX + 110, 196);
  c.closePath();
};

function drawGoon(ctx: Ctx, art: FootArt, p: Pose): void {
  const yellow = art.primary ?? '#f2c230';
  const black = art.secondary ?? '#2a2a32';
  const flex = Math.max(0, p.curl);
  const body = goonBody(flex);
  const sole = goonSole(flex);
  const rim: PathFn = (c) => {
    c.beginPath();
    c.ellipse(CX, 4, 68, 14, 0, 0, Math.PI * 2);
  };
  const box = { x: CX - 120, y: -14, w: 240, h: 290 };
  const sil = new Sil(ctx, [sole, body, rim], box);
  const g = sil.g;
  within(g, sole, () => {
    g.fillStyle = vgrad(g, 196, 272, [[0, shade(black, 0.15)], [1, shade(black, -0.6)]]);
    g.fillRect(box.x, 190, box.w, 90);
    texture(g, 'rubber', box, 0.35);
    // the ribbed foxing round the sole
    g.strokeStyle = rgba('#000000', 0.45);
    g.lineWidth = 1.6;
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.moveTo(box.x, 236 + i * 5 - flex * 5);
      g.lineTo(box.x + box.w, 236 + i * 5 - flex * 5);
      g.stroke();
    }
    spec(g, CX - 60, 226, 30, 5, 0.35, 0.05);
  });
  piece(g, body, box, DMAT.gloss, yellow, { shadow: 0.45, size: 18 });
  within(g, body, () => {
    // wet gloss: long window highlights and beads of water
    spec(g, CX - 54, 120, 16, 60, 0.6, 0.15);
    spec(g, CX - 40, 200 - flex * 5, 40, 14, 0.55, -0.2);
    spec(g, CX + 76, 150, 6, 40, 0.3, 0.1, '#cfe2ff');
    const r = rng(hashStr('goon-beads'));
    for (let i = 0; i < 22; i++) {
      const x = CX - 90 + r() * 180;
      const y = 30 + r() * 200;
      const rr = 1.6 + r() * 3;
      ao(g, x + 1.5, y + 2, rr * 1.3, rr, 0.25, 0, '#5a3a08');
      g.fillStyle = rgba(shade(yellow, 0.3), 0.8);
      g.beginPath();
      g.arc(x, y, rr, 0, Math.PI * 2);
      g.fill();
      spec(g, x - rr * 0.35, y - rr * 0.35, rr * 0.5, rr * 0.35, 1, -0.5);
    }
    // the moulded toe and the flex crease
    crease(g, (c) => c.ellipse(CX, 244 - flex * 6, 84, 46, 0, Math.PI + 0.2, -0.2), 2, '#6a3a08', 0.4, 0.4);
    for (const [y, w] of [[176, 70], [190, 80]] as const) {
      crease(g, (c) => {
        c.moveTo(CX - w, y - flex * 4);
        c.quadraticCurveTo(CX, y - 10 - flex * 8, CX + w, y - flex * 4);
      }, 2.6 + flex, '#6a3a08', 0.25 + flex * 0.3, 0.35);
    }
    // the three clasp buckles: black rubber tabs, steel catches
    for (let i = 0; i < 3; i++) {
      const y = 70 + i * 38;
      const w = 40 + i * 4;
      const tab = rrect(CX - w, y - 7, w * 2, 14, 7);
      piece(g, tab, box, 'rubber', black, { shadow: 0.6, size: 5 });
      // steel catch and its loop
      const cx2 = CX + w - 14;
      piece(g, rrect(cx2 - 9, y - 8, 22, 16, 4), box, 'chrome', '#c9d0da', { shadow: 0.5, size: 4 });
      g.fillStyle = '#1a1a20';
      g.fillRect(cx2 - 4, y - 2, 12, 4);
      rivet(g, CX - w + 8, y, 3, '#c0c6d0');
      glint(g, cx2 - 5, y - 4, 2.4, 0.9);
    }
  });
  // the rim: a rolled edge, the dark trouser hem inside it
  within(g, rim, () => {
    g.fillStyle = vgrad(g, -10, 18, [[0, shade(yellow, -0.5)], [0.5, shade(yellow, 0.25)], [1, shade(yellow, -0.15)]]);
    g.fillRect(box.x, -12, box.w, 30);
    g.fillStyle = '#1a1c24';
    g.beginPath();
    g.ellipse(CX, 2, 60, 9, 0, 0, Math.PI * 2);
    g.fill();
    spec(g, CX - 30, 10, 26, 3, 0.7, 0);
  });
  ao(g, CX, 22, 66, 6, 0.3, 0, '#5a3a08');
  finishLight(sil, yellow, '#3a2008', 0.38);
  sil.finish(inkOf(shade(yellow, -0.3)), { openTop: -5 });
}

registerStyle('goon', {
  contactY: 270,
  halfWidth: 106,
  rig: { from: 190, to: 210 },
  leg: { kind: 'denim', hw: 62, join: 'into' },
  draw(ctx, art, p, o) {
    if (o.emissive || o.heat) return;
    drawGoon(ctx, art, p);
  },
});

