// Batch F in the style kit, part 3: the hero feet (Act 7) and Kratos's nemeses (Tartarus).
// - BAT FEET: a furry dusk-purple foot with pointed ears at the ankle, leathery wings whose thin membrane glows rose
//   where the light comes through (they flap in play), and hooked ivory claws on every toe.
// - SPIDER SOCKS: a purple knitted toe-sock with acid-green toes and cuff stripes, a white web knitted over the
//   instep with a little spider sitting in it, and four jointed spider legs a side (they skitter in play).
// - KRONOS THE TITAN KING (mini-boss): an ancient foot of weathered titan stone, mossy and cracked with Tartarus fire
//   showing through, a bronze ankle band with a Greek key and an hourglass of gold sand, a carved face with burning
//   eyes and a stone beard, a jaw that creaks open (at TITAN_JAW) and bronze shackles with chains hanging.
// - ZEUS (boss): a towering foot of white marble with grey-gold veins, gold sandal straps laced up to a winged gold
//   anklet, a gold medallion of blue enamel with a crackling lightning bolt (at ZEUS_BOLT) and a gold band over the ball of the foot.
// Parodies and myths with looks of our own (old art: src/content/art/heroFeet.ts, src/content/art/kratos.ts).

import type { FootArt } from '../../data/feet';
import { TITAN_JAW, ZEUS_BOLT } from '../art/kratos';
import { type StyleToe, onToe } from '../../art/style/anatomy';
import { bareFoot, bareOutline, paintBare } from '../../art/style/bare';
import { type PathFn, type Pose, ao, crease, glint, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil, lobe } from '../../art/style/sil';
import { registerStyle } from '../../art/style/registry';
import { beadEye, blotches, clawPath, contact, paintClaw, rivet } from '../../art/style/details';
import { MATERIALS } from '../../art/style/materials';
import { MATS_F } from '../../art/style/materials-acts-f';
import { clip, furCoat, glowDot, glowFinish, heatLayer, lightAll, lin, rad } from '../../art/style/kit-bosses';
import { type Ctx, mix, rgba, rng, shade } from '../../art/util';
import { BARE_RIG, clefts, extendSil, layerOn, toePath } from './base-kit';
import { CX, LX, LY, type Opts, type Pt, chain, gem, glowLine, metal, partSil, sag, tube } from './acts-f-kit';

/** The body part of a bare foot's parts (the first), for clipping fur and paint off the toes. */
const bodyOf = (sil: Sil): PathFn => sil.parts[0];

/** A claw on a toe's tip, hooking in towards the foot's centre line. */
function toeClaw(t: StyleToe, len: number, w: number): { x: number; y: number; ang: number; len: number; w: number; hook: number } {
  const [x, y] = onToe(t, Math.PI / 2);
  const ang = Math.PI / 2 + t.rot * 0.6;
  return { x: x - Math.sin(t.rot) * 2, y: y - t.ry * 0.28, ang, len: len * (t.rx / 22), w: w * (t.rx / 22), hook: (CX - t.cx) / 260 };
}

// ════════════════════════════ BAT FEET ════════════════════════════

const BAT_LOOK = { toe: 0.92, toeLen: 0.9, nails: null, pores: 0.12, detail: 0.4, shadowTint: '#2a1040' } as const;
const BAT_WING_AT = (s: number): Pt => [CX + s * 58, 40];

function batWingPaths(s: number): { mem: PathFn; tips: Pt[]; ax: number; ay: number } {
  const [ax, ay] = BAT_WING_AT(s);
  const tips: Pt[] = [
    [CX + s * 150, -2],
    [CX + s * 150, 66],
    [CX + s * 124, 122],
  ];
  const mem: PathFn = (c) => {
    c.beginPath();
    c.moveTo(ax, ay - 16);
    c.quadraticCurveTo(CX + s * 104, -28, tips[0][0], tips[0][1]);
    let prev = tips[0];
    for (const t of tips.slice(1)) {
      c.quadraticCurveTo((prev[0] + t[0]) / 2 - s * 20, (prev[1] + t[1]) / 2 + 2, t[0], t[1]);
      prev = t;
    }
    c.quadraticCurveTo(CX + s * 96, 104, ax, ay + 66);
    c.closePath();
  };
  return { mem, tips, ax, ay };
}

function paintBatWing(g: Ctx, s: number, membrane: string, rose: string, bone: string): void {
  const { mem, tips, ax, ay } = batWingPaths(s);
  const box = { x: s < 0 ? CX - 160 : ax - 6, y: -36, w: s < 0 ? ax - (CX - 160) + 6 : 160 - (ax - CX) + 6, h: 180 };
  partSil(g, [mem], box, (pg) => {
    pg.fillStyle = lin(pg, ax, ay, tips[1][0], tips[1][1], [
      [0, shade(membrane, 0.12)],
      [1, shade(membrane, -0.4)],
    ]);
    pg.fillRect(box.x, box.y, box.w, box.h);
    // light through the thin skin: a rose glow between the bones, veins in it
    pg.fillStyle = rad(pg, CX + s * 108, 40, 4, CX + s * 108, 40, 70, [
      [0, rgba(rose, 0.55)],
      [1, rgba(rose, 0)],
    ]);
    pg.fillRect(box.x, box.y, box.w, box.h);
    texture(pg, 'pores', box, 0.25, 1, 'soft-light');
    const r = rng(661 + s);
    for (let i = 0; i < 7; i++) {
      const x0 = ax + s * (10 + r() * 30);
      const y0 = ay + r() * 50;
      softStroke(pg, (c) => {
        c.moveTo(x0, y0);
        c.quadraticCurveTo(x0 + s * 30, y0 + (r() - 0.5) * 30, x0 + s * (50 + r() * 30), y0 + (r() - 0.5) * 50);
      }, rgba(shade(rose, -0.3), 0.35), 1.1, 0.4);
    }
    // finger bones, lit along the top
    for (const t of tips) {
      const bone1: PathFn = tube([[ax, ay], [(ax + t[0]) / 2, (ay + t[1]) / 2 - 6], t], (u) => 4 - u * 2.2);
      contact(pg, (c) => {
        bone1(c);
        c.fill();
      }, 0.5, 2, 2.5);
      bone1(pg);
      pg.fillStyle = lin(pg, 0, -20, 0, 120, [
        [0, shade(membrane, 0.35)],
        [1, shade(membrane, -0.2)],
      ]);
      pg.fill();
    }
    // the scalloped trailing edge catches a hot rim
    pg.save();
    mem(pg);
    pg.clip();
    pg.strokeStyle = rgba(rose, 0.5);
    pg.lineWidth = 3;
    pg.translate(LX * 1.5, LY * 1.5);
    mem(pg);
    pg.stroke();
    pg.restore();
  }, inkOf(membrane), { form: 0.25, rim: 0.6 });
  // the thumb claw on the leading edge
  const [tx, ty] = tips[0];
  partSil(g, [clawPath(tx, ty, s < 0 ? Math.PI * 0.85 : Math.PI * 0.15, 16, 7, s * 0.3)], { x: tx - 20, y: ty - 20, w: 40, h: 40 }, (pg) => paintClaw(pg, tx, ty, s < 0 ? Math.PI * 0.85 : Math.PI * 0.15, 16, 7, s * 0.3, bone, '#5a4a30'), '#2a1a10', { w: 2.6 });
}

const batEar = (s: number): PathFn => (c) => {
  c.beginPath();
  c.moveTo(CX + s * 30, 34);
  c.quadraticCurveTo(CX + s * 46, 6, CX + s * 76, -4);
  c.quadraticCurveTo(CX + s * 76, 26, CX + s * 62, 46);
  c.closePath();
};

registerStyle('batfeet', {
  contactY: 262,
  halfWidth: 104,
  rig: BARE_RIG,
  leg: { kind: 'fur', hw: 50, join: 'blend', fade: 20 },
  parts: {
    wingL: { box: { x: CX - 182, y: -40, w: 136, h: 190 }, frames: 1, pivot: BAT_WING_AT(-1), draw: (g, art) => paintBatWing(g, -1, art.primary ?? '#3a2d4a', art.secondary ?? '#c84a6a', art.nails ?? '#efe3c0') },
    wingR: { box: { x: CX + 46, y: -40, w: 136, h: 190 }, frames: 1, pivot: BAT_WING_AT(1), draw: (g, art) => paintBatWing(g, 1, art.primary ?? '#3a2d4a', art.secondary ?? '#c84a6a', art.nails ?? '#efe3c0') },
  },
  draw(ctx, art, p, o) {
    const fur = art.skin;
    const bone = art.nails ?? '#efe3c0';
    if (!o.live && !o.emissive && !o.heat) for (const s of [-1, 1]) paintBatWing(ctx, s, art.primary ?? '#3a2d4a', art.secondary ?? '#c84a6a', bone);
    const f = paintBare(ctx, { ...BAT_LOOK, skin: fur }, p);
    const g = f.sil.g;
    const c = Math.max(0, p.curl);
    const claws = f.toes.map((t) => toeClaw(t, 26 - c * 8, 11));
    extendSil(f.sil, [...claws.map((k) => clawPath(k.x, k.y, k.ang, k.len, k.w, k.hook)), batEar(-1), batEar(1)]);
    const deep = mix(shade(fur, -0.6), '#1a0828', 0.4);
    const r = rng(662);
    // the coat: dense short fur over the instep, thinning onto the toes
    // fur over the instep, thinning out over the ball so the toes keep their shape (bare velvety skin there)
    const ballY = Math.min(...f.toes.map((t) => t.cy));
    layerOn(g, 'source-over', (l) => {
      clip(l, bodyOf(f.sil), () => furCoat(l, r, { x: CX - 104, y: -8, w: 208, h: ballY + 10 }, (x) => Math.PI / 2 + ((x - CX) / 110) * 0.5, fur, deep, { n: 1.1, len: 13, w: 1 }));
      l.globalCompositeOperation = 'destination-out';
      l.fillStyle = lin(l, 0, ballY - 46, 0, ballY - 6, [
        [0, 'rgba(0,0,0,0)'],
        [1, 'rgba(0,0,0,1)'],
      ]);
      l.fillRect(CX - 140, ballY - 46, 280, 200);
    });
    for (const t of f.toes) clip(g, toePath(t), () => furCoat(g, r, { x: t.cx - t.rx, y: t.cy - t.ry, w: t.rx * 2, h: t.ry * 0.7 }, () => Math.PI / 2 + t.rot, fur, deep, { n: 0.03, len: 6 }));
    // the ears: velvety, a rose inner
    for (const s of [-1, 1]) {
      const ear = batEar(s);
      clip(g, ear, () => {
        g.fillStyle = lin(g, CX + s * 26, 0, CX + s * 60, 0, [
          [0, shade(fur, -0.1)],
          [1, shade(fur, -0.4)],
        ]);
        g.fillRect(CX - 90, -30, 180, 90);
        softFill(g, (c2) => {
          c2.beginPath();
          c2.moveTo(CX + s * 40, 32);
          c2.quadraticCurveTo(CX + s * 52, 12, CX + s * 70, 4);
          c2.quadraticCurveTo(CX + s * 70, 24, CX + s * 60, 38);
          c2.closePath();
        }, rgba(art.secondary ?? '#c84a6a', 0.75), 2);
      });
    }
    for (const k of claws) paintClaw(g, k.x, k.y, k.ang, k.len, k.w, k.hook, bone, '#4a3a2a');
    if (o.heat || o.emissive) {
      f.sil.finish('rgba(0,0,0,0)', { w: 0.01, inner: 0 });
      return;
    }
    lightAll(f.sil, 0.25, 18, 0.55);
    bareOutline(f);
  },
});

// ════════════════════════════ SPIDER SOCKS ════════════════════════════

const SPIDER_LOOK = { toe: 1.04, nails: null, pores: 0, detail: 0, shadowTint: '#200a40' } as const;
const SPIDER_LEGS_AT = (s: number): Pt => [CX + s * 82, 118];

/** One spider leg: hip at the foot's side, knee up and out, then down to a fine tip. */
function spiderLegPts(s: number, i: number): Pt[] {
  const [hx, hy] = SPIDER_LEGS_AT(s);
  const y0 = hy - 42 + i * 26;
  const knee: Pt = [hx + s * (40 + i * 4), y0 - 30 + i * 4];
  const tip: Pt = [hx + s * (72 + (i === 1 || i === 2 ? 8 : 0)), y0 + 22 + i * 10];
  return [[hx - s * 6, y0], knee, tip];
}

function paintSpiderLegs(g: Ctx, s: number, purple: string): void {
  for (let i = 0; i < 4; i++) {
    const [h, k, t] = spiderLegPts(s, i);
    const seg1 = tube([h, k], (u) => 5 - u * 1.2);
    const seg2 = tube([k, t], (u) => 3.8 - u * 2.6);
    const box = { x: Math.min(h[0], t[0]) - 10, y: Math.min(h[1], k[1]) - 10, w: Math.abs(t[0] - h[0]) + 20, h: Math.abs(t[1] - k[1]) + 30 };
    partSil(g, [seg1, seg2, (c) => {
      c.beginPath();
      c.arc(k[0], k[1], 5.2, 0, Math.PI * 2);
    }], box, (pg) => {
      pg.fillStyle = lin(pg, box.x, box.y, box.x + box.w, box.y + box.h, [
        [0, mix('#3a3448', purple, 0.25)],
        [0.5, '#16121e'],
        [1, '#060408'],
      ]);
      pg.fillRect(box.x, box.y, box.w, box.h);
      // hairs and a glossy lit edge
      pg.strokeStyle = rgba('#d8c8ff', 0.5);
      pg.lineWidth = 1.2;
      pg.beginPath();
      pg.moveTo(h[0], h[1] - 3);
      pg.lineTo(k[0], k[1] - 3);
      pg.lineTo(t[0] - s, t[1] - 2);
      pg.stroke();
      glint(pg, k[0] - 1.5, k[1] - 2, 2.4, 0.8);
    }, '#05040a', { w: 2.6, rim: 0.7 });
  }
}

registerStyle('spidersocks', {
  contactY: 262,
  halfWidth: 104,
  rig: BARE_RIG,
  leg: { kind: 'knit', hw: 50, join: 'blend', fade: 20 },
  parts: {
    legsL: { box: { x: CX - 180, y: 40, w: 110, h: 150 }, frames: 1, pivot: SPIDER_LEGS_AT(-1), draw: (g, art) => paintSpiderLegs(g, -1, art.primary ?? '#5a2a8a') },
    legsR: { box: { x: CX + 70, y: 40, w: 110, h: 150 }, frames: 1, pivot: SPIDER_LEGS_AT(1), draw: (g, art) => paintSpiderLegs(g, 1, art.primary ?? '#5a2a8a') },
  },
  draw(ctx, art, p, o) {
    const purple = art.primary ?? '#5a2a8a';
    const green = art.secondary ?? '#7be04a';
    if (!o.live && !o.emissive && !o.heat) for (const s of [-1, 1]) paintSpiderLegs(ctx, s, purple);
    const f = paintBare(ctx, { ...SPIDER_LOOK, skin: purple }, p);
    const g = f.sil.g;
    const box = f.box;
    if (o.heat || o.emissive) {
      f.sil.finish('rgba(0,0,0,0)', { w: 0.01, inner: 0 });
      return;
    }
    // re-light it as knit: wool takes the light softly, no gloss
    f.sil.form({ base: purple, shadowTint: MATERIALS.knit.shadowTint, ramp: 0.6, form: 0.5, formSize: 30, bevel: 0.2, rim: 0.4 });
    // the green toes, each knitted on, with a ribbed seam where it joins
    const cl = clefts(f.toes);
    for (const [i, t] of f.toes.entries()) {
      clip(g, toePath(t), () => {
        g.fillStyle = lin(g, t.cx - t.rx, t.cy - t.ry, t.cx + t.rx, t.cy + t.ry, [
          [0, shade(green, 0.3)],
          [0.5, green],
          [1, mix(shade(green, -0.5), '#0a3010', 0.3)],
        ]);
        g.fillRect(t.cx - t.rx - 4, t.cy - t.ry * 0.62, t.rx * 2 + 8, t.ry * 2);
      });
      const xl = i > 0 ? cl[i - 1][0] : -1000;
      const xr = i < cl.length ? cl[i][0] : 1000;
      lobe(g, toePath(t), { x: xl, y: t.cy - t.ry - 4, w: xr - xl, h: t.ry * 2 + 8 }, t.cy - t.ry * 0.7, t.cy - t.ry * 0.1, '#0a2a10', 0.5, Math.max(6, t.rx * 0.42), 0.25);
      crease(g, (c) => {
        c.moveTo(t.cx - t.rx, t.cy - t.ry * 0.62);
        c.quadraticCurveTo(t.cx, t.cy - t.ry * 0.5, t.cx + t.rx, t.cy - t.ry * 0.62);
      }, 2, '#1a0a30', 0.5, 0.25);
    }
    texture(g, 'knit', box, 0.5, 1.4);
    // the striped cuff
    for (const y of [2, 22]) {
      const band: PathFn = (c) => {
        c.beginPath();
        c.rect(CX - 80, y, 160, 9);
      };
      clip(g, bodyOf(f.sil), () => {
        band(g);
        g.fillStyle = lin(g, CX - 60, 0, CX + 60, 0, [
          [0, shade(green, -0.2)],
          [0.3, shade(green, 0.2)],
          [1, shade(green, -0.4)],
        ]);
        g.fill();
        texture(g, 'knit', { x: CX - 80, y, w: 160, h: 9 }, 0.5, 1.4);
      });
    }
    // the web over the instep: radial threads and rings, knitted in white
    const wc: Pt = [CX + 4, 112];
    const spokes = 9;
    clip(g, bodyOf(f.sil), () => {
      g.save();
      g.lineCap = 'round';
      const thread = (draw: (c: Ctx) => void) => {
        g.beginPath();
        draw(g);
        g.strokeStyle = rgba('#140820', 0.4);
        g.lineWidth = 3.2;
        g.stroke();
        g.beginPath();
        draw(g);
        g.strokeStyle = rgba('#f4f0ff', 0.9);
        g.lineWidth = 1.7;
        g.stroke();
      };
      for (let k = 0; k < spokes; k++) {
        const a = (k / spokes) * Math.PI * 2 + 0.2;
        thread((c) => {
          c.moveTo(wc[0], wc[1]);
          c.lineTo(wc[0] + Math.cos(a) * 110, wc[1] + Math.sin(a) * 96);
        });
      }
      for (const rr of [16, 32, 50, 70]) {
        thread((c) => {
          for (let k = 0; k <= spokes; k++) {
            const a = (k / spokes) * Math.PI * 2 + 0.2;
            const a0 = ((k - 1) / spokes) * Math.PI * 2 + 0.2;
            const x = wc[0] + Math.cos(a) * rr;
            const y = wc[1] + Math.sin(a) * rr * 0.87;
            if (!k) c.moveTo(x, y);
            else {
              const am = (a + a0) / 2;
              c.quadraticCurveTo(wc[0] + Math.cos(am) * rr * 0.84, wc[1] + Math.sin(am) * rr * 0.84 * 0.87, x, y);
            }
          }
        });
      }
      g.restore();
    });
    // the little spider in the middle of it
    contact(g, (c) => {
      c.beginPath();
      c.ellipse(wc[0], wc[1] + 2, 9, 11, 0, 0, Math.PI * 2);
      c.fill();
    }, 0.6, 2.5, 3);
    g.strokeStyle = '#0a0610';
    g.lineWidth = 1.6;
    for (const s of [-1, 1])
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.moveTo(wc[0] + s * 4, wc[1] - 2 + i * 3);
        g.quadraticCurveTo(wc[0] + s * 12, wc[1] - 10 + i * 6, wc[0] + s * 16, wc[1] - 4 + i * 8);
        g.stroke();
      }
    beadEye(g, wc[0], wc[1] + 4, 8, 10, green);
    beadEye(g, wc[0], wc[1] - 8, 5, 4.6, '#c84ad0');
    lightAll(f.sil, 0.25, 18, 0.45);
    bareOutline(f);
  },
});

// ════════════════════════════ KRONOS THE TITAN KING ════════════════════════════

const TITAN_LOOK = { toe: 1.12, toeLen: 0.94, w: 6, ankle: 56, nails: null, pores: 0, detail: 0, shadowTint: '#1a1828' } as const;
const TITAN_RINGS = (s: number): Pt => [CX + s * 98, 72];
const TITAN_GLASS: Pt = [CX, 40];
const TITAN_CRACKS: Pt[][] = [
  [[CX - 92, 60], [CX - 80, 78], [CX - 84, 100], [CX - 70, 120]],
  [[CX + 88, 130], [CX + 76, 146], [CX + 82, 170], [CX + 70, 186]],
  [[CX - 60, 190], [CX - 48, 176], [CX - 52, 160]],
  [[CX + 40, 48], [CX + 54, 64], [CX + 48, 78]],
];

function titanJaw(g: Ctx, open: number, stone: string): void {
  const { x, y } = TITAN_JAW;
  const d = open * 14;
  // the dark of the mouth behind the jaw, with embers in the throat
  const mouth: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 38, y - 6);
    c.quadraticCurveTo(x, y - 12, x + 38, y - 6);
    c.lineTo(x + 34, y + 10 + d);
    c.quadraticCurveTo(x, y + 18 + d, x - 34, y + 10 + d);
    c.closePath();
  };
  mouth(g);
  g.fillStyle = rad(g, x, y + 6 + d * 0.5, 2, x, y + 4, 40, [
    [0, open > 0 ? '#ff8a20' : '#5a1a08'],
    [0.4, '#3a0a04'],
    [1, '#0a0202'],
  ]);
  g.fill();
  // upper teeth: square stone blocks
  for (let i = 0; i < 6; i++) {
    const tx = x - 30 + i * 10.4;
    g.fillStyle = lin(g, tx, y - 8, tx + 9, y + 4, [
      [0, '#e8e0c8'],
      [1, '#8a8270'],
    ]);
    g.beginPath();
    g.roundRect(tx, y - 7, 9, 10, 1.5);
    g.fill();
  }
  // the lower jaw: a slab of chin, dropped by `open`
  const jaw: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 40, y + 6 + d);
    c.quadraticCurveTo(x, y + 14 + d, x + 40, y + 6 + d);
    c.bezierCurveTo(x + 42, y + 28 + d, x + 20, y + 40 + d, x, y + 40 + d);
    c.bezierCurveTo(x - 20, y + 40 + d, x - 42, y + 28 + d, x - 40, y + 6 + d);
    c.closePath();
  };
  partSil(g, [jaw], { x: x - 46, y: y - 4, w: 92, h: 66 }, (pg) => {
    pg.fillStyle = lin(pg, x - 40, y, x + 40, y + 50, [
      [0, shade(stone, 0.2)],
      [0.5, stone],
      [1, shade(stone, -0.45)],
    ]);
    pg.fillRect(x - 46, y - 4, 92, 70);
    texture(pg, 'stone', { x: x - 46, y: y - 4, w: 92, h: 70 }, 0.55, 1.2);
    for (let i = 0; i < 5; i++) {
      const tx = x - 26 + i * 11;
      pg.fillStyle = lin(pg, tx, y + 6 + d, tx + 9, y + 16 + d, [
        [0, '#d8d0b8'],
        [1, '#7a7260'],
      ]);
      pg.beginPath();
      pg.roundRect(tx, y + 4 + d, 9, 8, 1.5);
      pg.fill();
    }
    // the beard carved down the chin
    for (let k = -3; k <= 3; k++) crease(pg, (c) => {
      c.moveTo(x + k * 10, y + 18 + d);
      c.quadraticCurveTo(x + k * 11 + 3, y + 30 + d, x + k * 9, y + 40 + d);
    }, 2, '#1a1820', 0.5, 0.25);
  }, inkOf(stone), { w: 3 });
}

function titanChain(g: Ctx, s: number, bronze: string, iron: string): void {
  const [rx, ry] = TITAN_RINGS(s);
  chain(g, sag(rx, ry + 12, rx + s * 18, ry + 150, -s * 10, 18), 7, iron);
  // the broken end link and a shackle pin
  rivet(g, rx + s * 18, ry + 156, 4, bronze);
}

function drawTitan(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const stone = art.skin;
  const dark = art.primary ?? '#5c5852';
  const bronze = art.secondary ?? '#c9873a';
  const sand = (art.extra?.sand as string) ?? '#f0c860';
  const look = { ...TITAN_LOOK, skin: stone };
  const fire = '#ff6a1a';
  const f = o.heat || o.emissive ? bareFoot(ctx, look, p) : paintBare(ctx, look, p);
  const g = f.sil.g;
  const box = f.box;
  const rings = [-1, 1].map((s) => {
    const [x, y] = TITAN_RINGS(s);
    return (c: Ctx) => {
      c.beginPath();
      c.arc(x, y, 15, 0, Math.PI * 2);
      c.arc(x, y, 8, 0, Math.PI * 2, true);
    };
  });
  const bandP: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 64, 22);
    c.quadraticCurveTo(CX, 30, CX + 64, 22);
    c.lineTo(CX + 68, 54);
    c.quadraticCurveTo(CX, 64, CX - 68, 54);
    c.closePath();
  };
  const glassP: PathFn = (c) => {
    const [x, y] = TITAN_GLASS;
    c.beginPath();
    c.roundRect(x - 15, y - 26, 30, 52, 4);
  };
  extendSil(f.sil, [...rings, bandP, glassP]);
  if (o.heat) {
    heatLayer(f.sil, box, { seed: 671, y0: 262, y1: 20 });
    return;
  }
  if (o.emissive) {
    for (const c of TITAN_CRACKS) glowLine(g, c, 2.2, fire, 0.9);
    for (const s of [-1, 1]) glowDot(g, CX + s * 28 + 2, 98, 16, '#ffb020', 1);
    glowDot(g, TITAN_GLASS[0], TITAN_GLASS[1] + 6, 20, sand, 0.6);
    glowFinish(f.sil);
    return;
  }
  // re-light as weathered titan stone
  f.sil.form({ base: stone, shadowTint: MATS_F.rock.shadowTint, ramp: 0.75, form: 0.6, formSize: 32, bevel: 0.4, rim: 0.45 });
  texture(g, 'stone', box, 0.38, 1.4);
  texture(g, 'cast', box, 0.2, 1, 'soft-light');
  blotches(g, box, shade(dark, -0.2), 0.45, 26, 0.55, 0.15, 672);
  // moss in the hollows, lichen speckle
  blotches(g, { x: box.x, y: 100, w: box.w, h: 170 }, '#5a7a3a', 0.5, 14, 0.66, 0.08, 673);
  blotches(g, box, '#c8c0a0', 0.25, 5, 0.75, 0.05, 674);
  // the toes as boulders: lit tops, deep cracks between
  const cl = clefts(f.toes);
  for (const [i, t] of f.toes.entries()) {
    const xl = i > 0 ? cl[i - 1][0] : -1000;
    const xr = i < cl.length ? cl[i][0] : 1000;
    lobe(g, toePath(t), { x: xl, y: t.cy - t.ry - 4, w: xr - xl, h: t.ry * 2 + 8 }, t.cy - t.ry * 0.8, t.cy, '#0a0a14', 0.55, Math.max(7, t.rx * 0.5), 0.3);
    crease(g, (c) => {
      c.moveTo(t.cx - t.rx * 0.4, t.cy + t.ry * 0.2);
      c.lineTo(t.cx - t.rx * 0.1, t.cy + t.ry * 0.45);
      c.lineTo(t.cx + t.rx * 0.25, t.cy + t.ry * 0.38);
    }, 1.4, '#0a0a10', 0.55, 0.3);
  }
  // cracks with Tartarus fire showing through
  for (const c of TITAN_CRACKS) {
    const run = (c2: Ctx) => c.forEach(([x, y], i) => (i ? c2.lineTo(x, y) : c2.moveTo(x, y)));
    softStroke(g, run, rgba(fire, 0.35), 8, 3);
    crease(g, run, 3, '#0a0404', 0.85, 0.35);
    softStroke(g, run, rgba('#ffb040', 0.85), 1.2, 0.3);
  }
  // the carved face: a heavy brow, sunken burning eyes, a broad nose
  softFill(g, (c) => {
    c.beginPath();
    c.ellipse(CX + 2, 80, 64, 14, 0, 0, Math.PI * 2);
  }, rgba('#ffffff', 0.12), 5);
  crease(g, (c) => {
    c.moveTo(CX - 60, 86);
    c.quadraticCurveTo(CX - 30, 74, CX - 4, 86);
    c.moveTo(CX + 8, 86);
    c.quadraticCurveTo(CX + 34, 74, CX + 64, 86);
  }, 4, '#0a0a10', 0.7, 0.45);
  for (const s of [-1, 1]) {
    const ex = CX + s * 28 + 2;
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(ex, 98, 16, 11, 0, 0, Math.PI * 2);
    }, rgba('#06060a', 0.85), 2.5);
    g.fillStyle = rad(g, ex, 98, 0.5, ex, 98, 9, [
      [0, '#fff8c0'],
      [0.4, '#ffb020'],
      [1, rgba('#ff6a10', 0)],
    ]);
    g.beginPath();
    g.ellipse(ex, 98, 9, 6, 0, 0, Math.PI * 2);
    g.fill();
  }
  crease(g, (c) => {
    c.moveTo(CX + 2, 96);
    c.quadraticCurveTo(CX - 8, 118, CX - 10, 128);
    c.quadraticCurveTo(CX + 4, 134, CX + 16, 128);
  }, 3, '#0a0a10', 0.6, 0.4);
  // the stone beard round the jaw, braided down to the toes
  for (let k = -5; k <= 5; k++) {
    const x0 = CX + 4 + k * 9;
    crease(g, (c) => {
      c.moveTo(x0 + k * 2, 132);
      c.bezierCurveTo(x0 + k * 3, 160, x0 + k * 2 - 4, 180, x0 + k * 1.5, 198 - Math.abs(k) * 3);
    }, 2.2, '#14141c', 0.45, 0.3);
  }
  if (!o.live) titanJaw(g, 0, stone);
  // the bronze ankle band with a Greek key
  metal(g, bandP, { x: CX - 68, y: 22, w: 136, h: 42 }, bronze, { vertical: true });
  clip(g, bandP, () => {
    texture(g, 'cast', { x: CX - 68, y: 22, w: 136, h: 42 }, 0.3);
    g.strokeStyle = rgba('#3a1a04', 0.75);
    g.lineWidth = 2;
    g.beginPath();
    for (let x = CX - 64; x < CX + 64; x += 14) {
      g.moveTo(x, 50);
      g.lineTo(x, 36);
      g.lineTo(x + 10, 36);
      g.lineTo(x + 10, 44);
      g.lineTo(x + 5, 44);
    }
    g.stroke();
    blotches(g, { x: CX - 68, y: 22, w: 136, h: 42 }, '#3a9a7a', 0.45, 8, 0.66, 0.08, 675);
  });
  // the hourglass of gold sand in a bronze frame
  const [hx, hy] = TITAN_GLASS;
  for (const dy of [-24, 22]) metal(g, (c) => {
    c.beginPath();
    c.roundRect(hx - 15, hy + dy - 2, 30, 6, 2);
  }, { x: hx - 15, y: hy + dy - 2, w: 30, h: 6 }, bronze, { vertical: true, glints: false });
  for (const s of [-1, 1]) metal(g, (c) => {
    c.beginPath();
    c.rect(hx + s * 12 - 1.5, hy - 22, 3, 44);
  }, { x: hx + s * 12 - 1.5, y: hy - 22, w: 3, h: 44 }, bronze, { glints: false, shadow: 0.3 });
  const glass: PathFn = (c) => {
    c.beginPath();
    c.moveTo(hx - 9, hy - 22);
    c.lineTo(hx + 9, hy - 22);
    c.quadraticCurveTo(hx + 9, hy - 6, hx + 1.5, hy);
    c.quadraticCurveTo(hx + 9, hy + 6, hx + 9, hy + 22);
    c.lineTo(hx - 9, hy + 22);
    c.quadraticCurveTo(hx - 9, hy + 6, hx - 1.5, hy);
    c.quadraticCurveTo(hx - 9, hy - 6, hx - 9, hy - 22);
    c.closePath();
  };
  glass(g);
  g.fillStyle = rgba('#e8f0f0', 0.25);
  g.fill();
  clip(g, glass, () => {
    g.fillStyle = lin(g, 0, hy - 22, 0, hy + 22, [
      [0, shade(sand, 0.2)],
      [1, shade(sand, -0.3)],
    ]);
    g.fillRect(hx - 10, hy - 12, 20, 10);
    g.beginPath();
    g.moveTo(hx - 10, hy + 22);
    g.lineTo(hx, hy + 8);
    g.lineTo(hx + 10, hy + 22);
    g.fill();
    g.fillRect(hx - 0.7, hy - 2, 1.4, 12);
    g.fillStyle = rgba('#ffffff', 0.6);
    g.fillRect(hx - 6, hy - 20, 2, 14);
  });
  // the bronze shackle rings
  for (const s of [-1, 1]) {
    const [x, y] = TITAN_RINGS(s);
    metal(g, rings[(s + 1) / 2], { x: x - 15, y: y - 15, w: 30, h: 30 }, bronze);
    ao(g, x + 4, y + 14, 14, 6, 0.3);
  }
  lightAll(f.sil, 0.35, 22, 0.45);
  bareOutline(f);
  if (!o.live) for (const s of [-1, 1]) titanChain(ctx, s, bronze, '#6a6e78');
}

registerStyle('titanking', {
  contactY: TITAN_JAW.contact,
  halfWidth: 112,
  rig: BARE_RIG,
  leg: { kind: 'basalt', hw: 56, join: 'blend', fade: 18 },
  parts: {
    jaw: {
      box: { x: TITAN_JAW.x - 48, y: TITAN_JAW.y - 16, w: 96, h: 76 },
      frames: 2,
      draw: (g, art, i) => titanJaw(g, i ? 1 : 0, art.skin),
    },
    chainL: { box: { x: CX - 140, y: 70, w: 60, h: 180 }, frames: 1, pivot: TITAN_RINGS(-1), draw: (g, art) => titanChain(g, -1, art.secondary ?? '#c9873a', '#6a6e78') },
    chainR: { box: { x: CX + 80, y: 70, w: 60, h: 180 }, frames: 1, pivot: TITAN_RINGS(1), draw: (g, art) => titanChain(g, 1, art.secondary ?? '#c9873a', '#6a6e78') },
  },
  draw(ctx, art, p, o) {
    drawTitan(ctx, art, p, o);
  },
});

// ════════════════════════════ ZEUS ════════════════════════════

const ZEUS_LOOK = { toe: 1.02, nails: undefined, pores: 0.05, detail: 0.35, shadowTint: '#5a6078' } as const;
const ZEUS_WING = (s: number): Pt => [CX + s * 62, 40];

function zeusWing(g: Ctx, s: number, gold: string): void {
  const [ax, ay] = ZEUS_WING(s);
  const feathers: PathFn[] = [];
  for (let i = 0; i < 4; i++) {
    const len = 46 - i * 8;
    const a = -0.45 + i * 0.32;
    const tip: Pt = [ax + s * Math.cos(a) * len, ay + Math.sin(a) * len - 4];
    feathers.push((c) => {
      c.beginPath();
      c.moveTo(ax, ay - 4 + i * 4);
      c.quadraticCurveTo((ax + tip[0]) / 2, tip[1] - 10, tip[0], tip[1]);
      c.quadraticCurveTo((ax + tip[0]) / 2 + s * 4, tip[1] + 8, ax, ay + 6 + i * 4);
      c.closePath();
    });
  }
  const box = { x: s < 0 ? ax - 52 : ax - 4, y: ay - 40, w: 56, h: 64 };
  partSil(g, feathers, box, (pg) => {
    pg.fillStyle = lin(pg, box.x, box.y, box.x + box.w, box.y + box.h, [
      [0, mix(gold, '#fffbe0', 0.6)],
      [0.4, gold],
      [1, shade(gold, -0.5)],
    ]);
    pg.fillRect(box.x, box.y, box.w, box.h);
    for (const f of feathers) {
      pg.save();
      f(pg);
      pg.strokeStyle = rgba('#6a3a04', 0.55);
      pg.lineWidth = 1.2;
      pg.stroke();
      pg.restore();
    }
    glint(pg, ax + s * 16, ay - 10, 3, 0.9);
  }, '#5a3404', { w: 2.6 });
}

function zeusBolt(g: Ctx, glowOnly: boolean): void {
  const { x, y } = ZEUS_BOLT;
  const bolt: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x + 6, y - 22);
    c.lineTo(x - 10, y + 3);
    c.lineTo(x - 1, y + 3);
    c.lineTo(x - 7, y + 23);
    c.lineTo(x + 11, y - 4);
    c.lineTo(x + 2, y - 4);
    c.closePath();
  };
  if (glowOnly) {
    glowDot(g, x, y, 34, '#9fd8ff', 0.9);
    bolt(g);
    g.fillStyle = '#ffffff';
    g.fill();
    return;
  }
  bolt(g);
  g.fillStyle = lin(g, x - 10, y - 22, x + 10, y + 22, [
    [0, '#ffffff'],
    [0.5, '#dff4ff'],
    [1, '#9fd8ff'],
  ]);
  g.fill();
  g.strokeStyle = rgba('#0a2a5a', 0.6);
  g.lineWidth = 1.2;
  g.stroke();
}

function drawZeus(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const marble = art.skin;
  const gold = art.secondary ?? '#e8b23a';
  if (!o.live && !o.emissive && !o.heat) for (const s of [-1, 1]) zeusWing(ctx, s, gold);
  const f = o.heat || o.emissive ? bareFoot(ctx, { ...ZEUS_LOOK, skin: marble }, p) : paintBare(ctx, { ...ZEUS_LOOK, skin: marble }, p);
  const g = f.sil.g;
  const box = f.box;
  const medal: PathFn = (c) => {
    c.beginPath();
    c.arc(ZEUS_BOLT.x, ZEUS_BOLT.y, 32, 0, Math.PI * 2);
  };
  if (o.heat) {
    heatLayer(f.sil, box, { seed: 681, y0: 262, y1: 20, hot: '#fff0c0', mid: '#ffb040', deep: '#c05010' });
    return;
  }
  if (o.emissive) {
    zeusBolt(g, true);
    glowFinish(f.sil);
    return;
  }
  // polished marble: cool shadows, faint grey-gold veining
  f.sil.form({ base: marble, shadowTint: MATS_F.marble.shadowTint, ramp: 0.7, form: 0.5, formSize: 32, bevel: 0.45, rim: 0.55 });
  texture(g, 'stone', box, 0.14, 1.6);
  const r = rng(682);
  for (let i = 0; i < 7; i++) {
    let x = CX - 90 + r() * 180;
    let y = r() * 200;
    const pts: Pt[] = [];
    for (let k = 0; k < 7; k++) {
      pts.push([x, y]);
      x += (r() - 0.5) * 26;
      y += 10 + r() * 14;
    }
    softStroke(g, (c) => pts.forEach(([px, py], j) => (j ? c.lineTo(px, py) : c.moveTo(px, py))), rgba(i % 3 ? '#8a8a9a' : '#c8a860', 0.35), 1.4, 0.6);
  }
  spec(g, CX - 40, 60, 40, 60, 0.3, -0.4);
  // gold straps laced up the instep: crossing bands from the toes to the anklet
  const straps: [Pt, Pt, Pt][] = [];
  for (let k = 0; k < 4; k++) {
    const y = 56 + k * 26;
    const hw = 56 + k * 9;
    straps.push([[CX - hw, y], [CX, y + 14], [CX + hw, y + 22]]);
    straps.push([[CX + hw, y], [CX, y + 14], [CX - hw, y + 22]]);
  }
  clip(g, bodyOf(f.sil), () => {
    for (const [a, m, b] of straps) {
      const band = tube([a, m, b], () => 4.2);
      metal(g, band, { x: Math.min(a[0], b[0]), y: a[1] - 5, w: Math.abs(b[0] - a[0]), h: 32 }, gold, { glints: false, shadow: 0.5 });
    }
  });
  // the gold band across the ball of the foot, and the big toe's ring
  const ballY = Math.min(...f.toes.map((t) => t.cy)) - 26;
  const ball: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 110, ballY - 6);
    c.quadraticCurveTo(CX, ballY + 8, CX + 116, ballY - 12);
    c.lineTo(CX + 116, ballY + 2);
    c.quadraticCurveTo(CX, ballY + 22, CX - 110, ballY + 8);
    c.closePath();
  };
  clip(g, bodyOf(f.sil), () => metal(g, ball, { x: CX - 110, y: ballY - 12, w: 226, h: 34 }, gold));
  // the medallion: a gold rim, blue enamel, the bolt
  metal(g, medal, { x: ZEUS_BOLT.x - 32, y: ZEUS_BOLT.y - 32, w: 64, h: 64 }, gold);
  const enamel: PathFn = (c) => {
    c.beginPath();
    c.arc(ZEUS_BOLT.x, ZEUS_BOLT.y, 24, 0, Math.PI * 2);
  };
  enamel(g);
  g.fillStyle = rad(g, ZEUS_BOLT.x - 8, ZEUS_BOLT.y - 8, 2, ZEUS_BOLT.x, ZEUS_BOLT.y, 26, [
    [0, '#5aa8e8'],
    [0.6, '#1e5aa8'],
    [1, '#0a2050'],
  ]);
  g.fill();
  clip(g, enamel, () => softStroke(g, (c) => c.arc(ZEUS_BOLT.x, ZEUS_BOLT.y, 24, 0, Math.PI * 2), rgba('#000020', 0.6), 5, 3));
  zeusBolt(g, false);
  spec(g, ZEUS_BOLT.x - 9, ZEUS_BOLT.y - 12, 8, 4, 0.8, -0.5);
  // the winged anklet
  const anklet: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 62, 30);
    c.quadraticCurveTo(CX, 38, CX + 62, 30);
    c.lineTo(CX + 64, 48);
    c.quadraticCurveTo(CX, 56, CX - 64, 48);
    c.closePath();
  };
  clip(g, bodyOf(f.sil), () => metal(g, anklet, { x: CX - 64, y: 30, w: 128, h: 26 }, gold, { vertical: true }));
  gem(g, CX, 43, 5, '#3a8ae8');
  lightAll(f.sil, 0.22, 20, 0.55);
  bareOutline(f);
}

registerStyle('zeus', {
  contactY: ZEUS_BOLT.contact,
  halfWidth: 110,
  rig: BARE_RIG,
  // the hem of his white robe over the ankle (the kit's wool leg in his robe's white)
  leg: { kind: 'wool', hw: 54, join: 'hem' },
  parts: {
    wingL: { box: { x: CX - 118, y: -4, w: 64, h: 66 }, frames: 1, pivot: ZEUS_WING(-1), draw: (g, art) => zeusWing(g, -1, art.secondary ?? '#e8b23a') },
    wingR: { box: { x: CX + 54, y: -4, w: 64, h: 66 }, frames: 1, pivot: ZEUS_WING(1), draw: (g, art) => zeusWing(g, 1, art.secondary ?? '#e8b23a') },
  },
  draw(ctx, art, p, o) {
    drawZeus(ctx, art, p, o);
  },
});
