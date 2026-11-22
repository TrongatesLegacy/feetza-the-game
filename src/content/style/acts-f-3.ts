// Batch F in the style kit, part 3: the hero feet (Act 7) and Kratos's nemeses (Tartarus).
// - BAT FEET: a furry dusk-purple foot with pointed ears at the ankle, leathery wings whose thin membrane glows rose
//   where the light comes through (they flap in play), and hooked ivory claws on every toe.
// - SPIDER SOCKS: a purple knitted toe-sock with acid-green toes and cuff stripes, a white web knitted over the
//   instep with a little spider sitting in it, and four jointed spider legs a side (they skitter in play).
// - KRONOS THE TITAN KING (mini-boss): no face: an ancient foot of weathered titan stone, mossy and chisel-marked,
//   split by three great gashes with magma flowing in them, a bronze shackle at the ankle with a Greek key and a
//   clock set in it, heavy iron chains from the shackle down to iron rings round the little and big toes, and
//   two great rings on the shackle for the chains that hold him to the sky (play draws those, src/game/skyChains.ts).
// - ZEUS (boss): a towering foot of white marble with grey-gold veins, gold sandal straps laced up to a winged gold
//   anklet, a gold medallion of blue enamel with a crackling lightning bolt (at ZEUS_BOLT) and a gold band over the ball of the foot.
// Parodies and myths with looks of our own (old art: src/content/art/heroFeet.ts, src/content/art/kratos.ts).

import type { FootArt } from '../../data/feet';
import { TITAN_JAW, ZEUS_BOLT } from '../art/kratos';
import { type StyleToe, cleft, onToe, poseToes, restToes } from '../../art/style/anatomy';
import { type BareFoot, bareFoot, bareOutline, paintBare } from '../../art/style/bare';
import { type Box, type PathFn, type Pose, LIGHT, ao, pose, pxPerUnit, crease, glint, inkOf, innerEdge, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil, lobe } from '../../art/style/sil';
import { registerStyle } from '../../art/style/registry';
import { beadEye, blotches, clawPath, contact, paintClaw, rivet } from '../../art/style/details';
import { MATERIALS } from '../../art/style/materials';
import { MATS_F } from '../../art/style/materials-acts-f';
import { clip, fill, furCoat, glowDot, glowFinish, heatLayer, lightAll, lin, rad, streak } from '../../art/style/kit-bosses';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';
import { BARE_RIG, clefts, extendSil, layerOn, toePath } from './base-kit';
import { CX, LX, LY, type Opts, type Pt, gem, metal, partSil, tube } from './acts-f-kit';

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
    legsL: { box: { x: CX - 180, y: 36, w: 110, h: 180 }, frames: 1, pivot: SPIDER_LEGS_AT(-1), draw: (g, art) => paintSpiderLegs(g, -1, art.primary ?? '#5a2a8a') },
    legsR: { box: { x: CX + 70, y: 36, w: 110, h: 180 }, frames: 1, pivot: SPIDER_LEGS_AT(1), draw: (g, art) => paintSpiderLegs(g, 1, art.primary ?? '#5a2a8a') },
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
// No face: a colossal foot of weathered titan stone split by three great gashes with the magma of Tartarus flowing
// inside them (charred, cracked lips, a hot orange-to-yellow core with crust floating on it), the bronze shackle at
// the ankle with its clock, and heavy iron chains from two eyes on the shackle down to iron cuffs on the little
// and big toes. In play the chains are simulated (src/content/styleLive/acts-f.ts) and the magma flows and spits:
// the cuts' geometry, the magma painter, the link painter and the chain solver live here so play and the still art
// (peel, portrait) match exactly.

export const TITAN_LOOK = { toe: 1.12, toeLen: 0.94, w: 6, ankle: 56, nails: null, pores: 0, detail: 0, shadowTint: '#1a1828' } as const;
/** The iron eyes on the shackle the chains hang from (s −1 left, 1 right). */
const TITAN_EYE = (s: number): Pt => [CX + s * 46, 66];
const TITAN_IRON = '#55575f';

// ——— the toe shackles ———
//
// Each cuffed toe wears a forged iron ring round it. Seen from above, a ring round a toe is an ellipse: its near half
// crosses over the top of the toe, bowing towards the tip, and its far half runs under the toe, showing only where
// it stands off the toe's sides. So the ring is painted in two halves: the far half (dark, its inside facing us)
// outside the toe's round, then the near half over the toe as a thick round-stocked band whose top rim catches the
// light as a pale sliver, turning away into shadow at both ends. It casts a shadow down the toe, the flesh swells a
// little either side of it, and it carries two rivets and the iron eye the chain hooks into. Tucked behind the
// neighbouring toe.

/** The ring on a toe (toe-local, in units of the toe's half length): its centre along the toe, its depth as seen
 * from above (the ellipse's half axis along the toe) and the width of its band. */
const RING_V = -0.1;
const RING_DEPTH = 0.36;
const RING_W = 0.3;
/** How far the ring stands off the toe's sides (in units of its half width). */
const RING_OUT = 1.17;

/** Toe-local point → design space. */
function toeAt(t: StyleToe, u: number, v: number): Pt {
  const c = Math.cos(t.rot);
  const s = Math.sin(t.rot);
  return [t.cx + u * c - v * s, t.cy + u * s + v * c];
}

/** The two cuffed toes (little, big) at a pose. */
function titanCuffToes(p: Pose): [StyleToe, StyleToe] {
  const toes = poseToes(restToes(TITAN_LOOK), p);
  return [toes[0], toes[4]];
}

/** The ring's ellipse at angle th (0 its right end, π/2 the near middle over the toe, −π/2 the far middle under it):
 * toe-local (u, v) of its band's top edge. */
function ringAt(t: StyleToe, th: number): [number, number] {
  return [Math.cos(th) * t.rx * RING_OUT, t.ry * RING_V + Math.sin(th) * t.ry * RING_DEPTH];
}

/** The eye on top of a toe's ring (its near middle) that the chain's last link hooks into. */
function cuffEye(t: StyleToe): Pt {
  const [u, v] = ringAt(t, Math.PI / 2);
  return toeAt(t, u, v - 3.4);
}

/** One half of the ring's band (near: th 0…π over the toe; far: π…2π under it), grown by `grow`. */
function ringHalf(t: StyleToe, near: boolean, grow = 0): PathFn {
  return (c) => {
    const n = 20;
    const w = t.ry * RING_W;
    const top: Pt[] = [];
    const bot: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const th = (near ? 0 : Math.PI) + (Math.PI * i) / n;
      const [u, v] = ringAt(t, th);
      const ug = u + Math.cos(th) * grow;
      top.push(toeAt(t, ug, v - grow));
      bot.push(toeAt(t, ug, v + w + grow));
    }
    c.beginPath();
    top.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    for (let i = n; i >= 0; i--) c.lineTo(bot[i][0], bot[i][1]);
    c.closePath();
  };
}

/** An iron eye: a thick ring standing off the surface. */
function ironEye(g: Ctx, x: number, y: number, r: number): void {
  const ring: PathFn = (c) => {
    c.beginPath();
    c.arc(x, y, r + 2.2, 0, Math.PI * 2);
    c.arc(x, y, r - 1.6, 0, Math.PI * 2, true);
  };
  contact(g, (c) => {
    ring(c);
    c.fill('evenodd');
  }, 0.6, 2.4, 2.5);
  g.save();
  ring(g);
  g.fillStyle = lin(g, x + LX * r, y + LY * r, x - LX * r, y - LY * r, [
    [0, '#c4c8d0'],
    [0.35, TITAN_IRON],
    [1, '#16171c'],
  ]);
  g.fill('evenodd');
  g.lineWidth = 1;
  g.strokeStyle = rgba('#0a0a0e', 0.9);
  g.stroke();
  g.restore();
  glint(g, x + LX * r * 0.9, y + LY * r * 0.9, 2.2, 0.8);
}

/** The flesh under and round a ring (on the silhouette's paint layer, before the outline): its cast shadow down the
 * toe and the soft swell of the toe squeezed either side of it. */
function paintCuffBed(g: Ctx, t: StyleToe): void {
  clip(g, (c) => {
    c.beginPath();
    c.ellipse(t.cx, t.cy, t.rx, t.ry, t.rot, 0, Math.PI * 2);
  }, () => {
    const [, vMid] = ringAt(t, Math.PI / 2);
    for (const [dv, a] of [[-t.ry * 0.12, 0.24], [t.ry * (RING_W + 0.12), 0.18]] as const) {
      const [x, y] = toeAt(t, -t.rx * 0.18, vMid + dv);
      spec(g, x, y, t.rx * 0.78, t.ry * 0.09, a, t.rot, LIGHT.key);
    }
    g.save();
    g.translate(-LX * 3.6, -LY * 3.6);
    softFill(g, ringHalf(t, true), rgba('#08070c', 0.75), 2.8);
    g.restore();
  });
}

/** The ring itself, over the outline (it stands off the toe's sides). `nb` is the neighbouring toe: towards it the
 * ring runs down into the cleft between them and out of sight. */
function paintCuff(g: Ctx, t: StyleToe, nb: StyleToe): void {
  const W = t.ry * RING_W;
  const [lx, ly] = toeAt(t, -t.rx * RING_OUT, 0);
  const [rx, ry] = toeAt(t, t.rx * RING_OUT, 0);
  const area = { x: t.cx - t.rx * 1.7, y: t.cy - t.ry * 1.3, w: t.rx * 3.4, h: t.ry * 2.6 };
  // the cleft towards the neighbour: the ring is cut off there (it goes down between the toes)
  const side = nb.cx > t.cx ? 1 : -1;
  const [kx] = side > 0 ? cleft(t, nb) : cleft(nb, t);
  const cut = kx - side * 1.5;
  g.save();
  g.beginPath();
  if (side > 0) g.rect(cut - 400, t.cy - t.ry * 4, 400, t.ry * 8);
  else g.rect(cut, t.cy - t.ry * 4, 400, t.ry * 8);
  g.clip();
  // the far half, under the toe: seen only past its sides, its inner face dark
  g.save();
  g.beginPath();
  g.rect(area.x - 20, area.y - 20, area.w + 40, area.h + 40);
  g.ellipse(t.cx, t.cy, t.rx + 1.5, t.ry + 1.5, t.rot, 0, Math.PI * 2);
  g.clip('evenodd');
  const far = ringHalf(t, false);
  g.fillStyle = lin(g, lx, ly, rx, ry, [
    [0, '#2a2c33'],
    [0.5, '#121317'],
    [1, '#24262c'],
  ]);
  far(g);
  g.fill();
  g.strokeStyle = rgba('#08080c', 0.95);
  g.lineWidth = 1.5;
  g.stroke();
  g.restore();
  // the near half over the toe
  const near = ringHalf(t, true);
  contact(g, (c) => {
    near(c);
    c.fill();
  }, 0.7, 2.2, 2.6);
  const [ax, ay] = toeAt(t, 0, ringAt(t, Math.PI / 2)[1]);
  const [bx, by] = toeAt(t, 0, ringAt(t, Math.PI / 2)[1] + W);
  clip(g, near, () => {
    // a round stock: a dark top edge, a hot crown just above the middle, falling to a dark underside
    g.fillStyle = lin(g, ax, ay, bx, by, [
      [0, '#1a1b20'],
      [0.12, '#6e727c'],
      [0.27, '#c2c6ce'],
      [0.4, '#6c707a'],
      [0.7, '#3a3c44'],
      [1, '#0e0f12'],
    ]);
    g.fillRect(area.x, area.y, area.w, area.h);
    // round the toe: lit on the side towards the light, turning away into shadow at both ends
    g.fillStyle = lin(g, lx, ly, rx, ry, [
      [0, rgba('#000000', 0.75)],
      [0.12, rgba('#000000', 0.25)],
      [0.3, rgba('#ffffff', 0.1)],
      [0.6, rgba('#000000', 0)],
      [0.86, rgba('#000000', 0.35)],
      [1, rgba('#000000', 0.8)],
    ]);
    g.fillRect(area.x, area.y, area.w, area.h);
    texture(g, 'cast', area, 0.5, 0.7);
    blotches(g, area, '#8a4a1e', 0.26, 4, 0.66, 0.1, 681 + Math.round(t.cx));
    // dropping into the cleft
    g.fillStyle = lin(g, cut, 0, cut - side * 8, 0, [
      [0, rgba('#000000', 0.85)],
      [1, rgba('#000000', 0)],
    ]);
    g.fillRect(area.x, area.y, area.w, area.h);
  });
  // the top rim: the band's thickness seen from above, a pale sliver along its top edge
  const rim: Pt[] = [];
  for (let i = 0; i <= 20; i++) {
    const th = 0.12 + ((Math.PI - 0.24) * i) / 20;
    const [u, v] = ringAt(t, th);
    rim.push(toeAt(t, u, v + 1.1));
  }
  g.save();
  g.lineCap = 'round';
  g.beginPath();
  rim.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.strokeStyle = lin(g, lx, ly, rx, ry, [
    [0, rgba('#e8ecf4', 0.15)],
    [0.3, rgba('#f2f5fb', 0.9)],
    [0.7, rgba('#e8ecf4', 0.5)],
    [1, rgba('#e8ecf4', 0.1)],
  ]);
  g.lineWidth = 2;
  g.stroke();
  g.restore();
  // ink round the near half, heavier along its lower edge where it lifts off the toe
  g.save();
  g.lineJoin = 'round';
  near(g);
  g.strokeStyle = rgba('#08080c', 0.95);
  g.lineWidth = 1.7;
  g.stroke();
  g.beginPath();
  for (let i = 0; i <= 20; i++) {
    const [u, v] = ringAt(t, (Math.PI * i) / 20);
    const [x, y] = toeAt(t, u, v + W);
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.lineWidth = 2.6;
  g.stroke();
  g.restore();
  // a hard glint on the crown, on the lit side
  {
    const [u, v] = ringAt(t, Math.PI * 0.68);
    const [gx, gy] = toeAt(t, u, v + W * 0.3);
    glint(g, gx, gy, 2.8, 0.9);
  }
  g.restore();
  // rivets either side of the eye
  for (const th of [Math.PI * 0.3, Math.PI * 0.7]) {
    const [u, v] = ringAt(t, th);
    const [x, y] = toeAt(t, u, v + W * 0.55);
    rivet(g, x, y, Math.max(1.8, t.rx * 0.08), '#8a8e98');
  }
  const [ex, ey] = cuffEye(t);
  ironEye(g, ex, ey, 4.2);
}

/** A titan's toenail: a thick plate of weathered dark stone set in the toe's tip, lit on its top-left edge, with a
 * cuticle groove, a crack, and a chip out of its free edge. */
function titanNail(g: Ctx, t: StyleToe, stone: string, curl: number, i: number): void {
  const nw = t.rx * 0.54;
  const nh = t.ry * (0.4 - curl * 0.1);
  const [x, y] = onToe(t, Math.PI / 2);
  const col = mix(shade(stone, -0.28), '#4a4438', 0.35);
  g.save();
  g.translate(x, y);
  g.rotate(t.rot);
  g.translate(0, -t.ry * 0.22 - nh * 0.45);
  const plate: PathFn = (c) => {
    c.beginPath();
    c.moveTo(-nw, -nh * 0.35);
    c.bezierCurveTo(-nw, -nh * 0.95, nw, -nh * 0.95, nw, -nh * 0.35);
    c.bezierCurveTo(nw * 1.02, nh * 0.45, nw * 0.6, nh * 0.85, 0, nh * 0.9);
    c.bezierCurveTo(-nw * 0.6, nh * 0.85, -nw * 1.02, nh * 0.45, -nw, -nh * 0.35);
    c.closePath();
  };
  // the groove it's set in
  plate(g);
  g.strokeStyle = rgba('#0a0a12', 0.5);
  g.lineWidth = 2.6;
  g.stroke();
  plate(g);
  g.fillStyle = lin(g, -nw * 0.8, -nh, nw * 0.8, nh, [
    [0, shade(col, 0.34)],
    [0.5, col],
    [1, shade(col, -0.4)],
  ]);
  g.fill();
  clip(g, plate, () => {
    texture(g, 'stone', { x: -nw, y: -nh, w: nw * 2, h: nh * 2 }, 0.16, 0.6);
    // the cuticle's shadow and a lighter free edge
    g.fillStyle = rgba('#0a0a12', 0.4);
    g.beginPath();
    g.ellipse(0, -nh * 0.95, nw * 1.1, nh * 0.24, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = rgba(shade(col, 0.45), 0.5);
    g.fillRect(-nw, nh * 0.6, nw * 2, nh);
    streak(g, (q) => {
      q.moveTo(-nw * 0.6, nh * 0.66);
      q.quadraticCurveTo(0, nh * 0.8, nw * 0.6, nh * 0.66);
    }, 1.1, 0.55);
    // a crack down from the cuticle
    crease(g, (c) => {
      const cx = (i % 2 ? 0.25 : -0.2) * nw;
      c.moveTo(cx, -nh * 0.7);
      c.lineTo(cx + nw * 0.12, -nh * 0.1);
      c.lineTo(cx - nw * 0.06, nh * 0.5);
    }, 1.1, '#08080e', 0.75, 0.35);
    spec(g, -nw * 0.4, -nh * 0.2, nw * 0.45, nh * 0.2, 0.4, -0.5);
  });
  // a chip out of the free edge
  g.fillStyle = rgba('#0a0a12', 0.85);
  g.beginPath();
  const cx = (i % 2 ? -0.35 : 0.3) * nw;
  g.moveTo(cx - nw * 0.14, nh * 0.86);
  g.lineTo(cx, nh * 0.66);
  g.lineTo(cx + nw * 0.13, nh * 0.84);
  g.closePath();
  g.fill();
  g.restore();
}

// ——— the cuts ———

interface Cut {
  pts: Pt[];
  /** Widest half-width (design units). */
  w: number;
  seed: number;
}

/** Three great gashes across the foot (all clear of the toes, which move with the rig's poses). */
const TITAN_CUTS: Cut[] = [
  { pts: [[CX - 84, 110], [CX - 30, 98], [CX + 26, 90], [CX + 76, 86]], w: 12.5, seed: 1 },
  { pts: [[CX - 52, 160], [CX + 4, 145], [CX + 54, 134], [CX + 94, 132]], w: 13.5, seed: 2 },
  { pts: [[CX - 88, 184], [CX - 54, 176], [CX - 16, 170]], w: 9, seed: 3 },
];

interface CutGeo {
  /** The centre line, sampled every ~3 units, its normals (pointing up), half widths and arc length (0…1). */
  mid: Pt[];
  nrm: Pt[];
  half: number[];
  u: number[];
  len: number;
  /** The gash (charred walls included) and the melt inside it. */
  outer: Pt[];
  inner: Pt[];
  /** Bounds of the melt and of the glow round the gash. */
  box: Box;
  glowBox: Box;
  w: number;
  seed: number;
}

function catmull(pts: Pt[], step: number): Pt[] {
  const out: Pt[] = [];
  const at = (i: number) => pts[Math.max(0, Math.min(pts.length - 1, i))];
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const bounds = (pts: Pt[], pad: number): Box => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.floor(Math.min(...xs) - pad);
  const y = Math.floor(Math.min(...ys) - pad);
  return { x, y, w: Math.ceil(Math.max(...xs) + pad) - x, h: Math.ceil(Math.max(...ys) + pad) - y };
};

function cutGeo(c: Cut): CutGeo {
  const r = rng(hashStr(`titan-cut-${c.seed}`));
  const mid = catmull(c.pts, 3);
  const n = mid.length;
  const nrm: Pt[] = mid.map((_, i) => {
    const [ax, ay] = mid[Math.max(0, i - 1)];
    const [bx, by] = mid[Math.min(n - 1, i + 1)];
    const d = Math.hypot(bx - ax, by - ay) || 1;
    let nx = (by - ay) / d;
    let ny = -(bx - ax) / d;
    if (ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    return [nx, ny];
  });
  const acc = [0];
  for (let i = 1; i < n; i++) acc.push(acc[i - 1] + Math.hypot(mid[i][0] - mid[i - 1][0], mid[i][1] - mid[i - 1][1]));
  const len = acc[n - 1];
  const u = acc.map((a) => a / len);
  // a lens that pinches shut at both ends, swelling and narrowing along the way (a slow wobble, not noise)
  const ph = r() * 6;
  const half = u.map((t) => c.w * Math.pow(Math.sin(Math.PI * t), 0.55) * (0.88 + 0.12 * Math.sin(t * 7 + ph)));
  // the lips: jagged, every sample kinked in or out on its own
  const top: Pt[] = [];
  const bot: Pt[] = [];
  const inTop: Pt[] = [];
  const inBot: Pt[] = [];
  const knots = (): number[] => Array.from({ length: Math.ceil(n / 4) + 2 }, () => r() - 0.5);
  const kt = knots();
  const kb = knots();
  const facet = (k: number[], i: number) => {
    const j = Math.floor(i / 4);
    const f = (i % 4) / 4;
    return k[j] * (1 - f) + k[j + 1] * f;
  };
  for (let i = 0; i < n; i++) {
    const [x, y] = mid[i];
    const [nx, ny] = nrm[i];
    const h = half[i];
    const jt = 1 + facet(kt, i) * 0.75 + (r() - 0.5) * 0.1 + (r() < 0.05 ? 0.35 : 0);
    const jb = 1 + facet(kb, i) * 0.75 + (r() - 0.5) * 0.1 + (r() < 0.05 ? 0.3 : 0);
    top.push([x + nx * h * jt, y + ny * h * jt]);
    bot.push([x - nx * h * jb, y - ny * h * jb]);
    // the melt sits deep in the gash: more of the upper (shadowed) wall shows than the lower
    const it = 0.3 + (r() - 0.5) * 0.08;
    const ib = 0.52 + (r() - 0.5) * 0.08;
    inTop.push([x + nx * h * it, y + ny * h * it]);
    inBot.push([x - nx * h * ib, y - ny * h * ib]);
  }
  const outer = [...top, ...bot.reverse()];
  const inner = [...inTop, ...inBot.reverse()];
  return { mid, nrm, half, u, len, outer, inner, box: bounds(inner, 2), glowBox: bounds(outer, 22), w: c.w, seed: c.seed };
}

export const TITAN_CUT_GEO: CutGeo[] = TITAN_CUTS.map(cutGeo);

/** A magma gash of the same make anywhere (Kronos's stone head in his fight, src/content/art/titanFight.ts): through
 * `pts` (design units), `w` its widest half-width, `seed` its own jaggedness (use one the foot's cuts don't). */
export const titanCut = (pts: Pt[], w: number, seed: number): CutGeo => cutGeo({ pts, w, seed });
export type TitanCut = CutGeo;

const polyPath = (pts: Pt[]): PathFn => (c) => {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
};

/** A point on a cut's centre line at arc length t (0…1), with its normal and half width. */
function cutAt(c: CutGeo, t: number): { x: number; y: number; nx: number; ny: number; h: number } {
  let i = 1;
  while (i < c.u.length - 1 && c.u[i] < t) i++;
  const k = (t - c.u[i - 1]) / Math.max(1e-6, c.u[i] - c.u[i - 1]);
  const m = (a: number, b: number) => a + (b - a) * k;
  return { x: m(c.mid[i - 1][0], c.mid[i][0]), y: m(c.mid[i - 1][1], c.mid[i][1]), nx: m(c.nrm[i - 1][0], c.nrm[i][0]), ny: m(c.nrm[i - 1][1], c.nrm[i][1]), h: m(c.half[i - 1], c.half[i]) };
}

/**
 * Stroke along a cut's centre line, each segment as wide as `w(half)` there. A flat colour is drawn opaque on its
 * own layer and laid down at alpha `a` (so the overlapping segments never bead); a colour per place (t 0…1 along
 * the cut) is stroked segment by segment with square ends.
 */
function alongCut(g: Ctx, c: CutGeo, col: string | ((t: number) => string), w: (h: number) => number, a = 1): void {
  if (typeof col === 'string') {
    // the layer covers only the cut and its glow (in device pixels), on one scratch canvas reused for every cut
    const m = g.getTransform();
    const pad = 34;
    const b = c.glowBox;
    const x0 = Math.floor(m.a * (b.x - pad) + m.e);
    const y0 = Math.floor(m.d * (b.y - pad) + m.f);
    const wpx = Math.ceil(m.a * (b.w + pad * 2)) + 2;
    const hpx = Math.ceil(m.d * (b.h + pad * 2)) + 2;
    const l = scratch(wpx, hpx);
    l.setTransform(m.a, m.b, m.c, m.d, m.e - x0, m.f - y0);
    strokeCut(l, c, () => col, w, 'round');
    g.save();
    g.globalAlpha *= a;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(l.canvas, 0, 0, wpx, hpx, x0, y0, wpx, hpx);
    g.restore();
    return;
  }
  strokeCut(g, c, col, w, 'butt');
}

let scratchCtx: CanvasRenderingContext2D | null = null;
/** The shared scratch canvas, cleared, at least w × h pixels. */
function scratch(w: number, h: number): CanvasRenderingContext2D {
  if (!scratchCtx) scratchCtx = document.createElement('canvas').getContext('2d')!;
  const cv = scratchCtx.canvas;
  if (cv.width < w || cv.height < h) {
    cv.width = Math.max(cv.width, w);
    cv.height = Math.max(cv.height, h);
  }
  scratchCtx.setTransform(1, 0, 0, 1, 0, 0);
  scratchCtx.clearRect(0, 0, w, h);
  return scratchCtx;
}

/** Blur what's drawn next by `units` design units (0 clears it), where the canvas supports filters. */
function blurBy(g: Ctx, units: number): void {
  if ('filter' in g) g.filter = units > 0 ? `blur(${(units * pxPerUnit(g)).toFixed(1)}px)` : 'none';
}

function strokeCut(g: Ctx, c: CutGeo, col: (t: number) => string, w: (h: number) => number, cap: CanvasLineCap): void {
  g.save();
  g.lineCap = cap;
  for (let i = 1; i < c.mid.length; i++) {
    const h = (c.half[i - 1] + c.half[i]) / 2;
    if (h < 0.3) continue;
    g.strokeStyle = col((c.u[i - 1] + c.u[i]) / 2);
    g.lineWidth = Math.max(0.3, w(h));
    g.beginPath();
    g.moveTo(c.mid[i - 1][0], c.mid[i - 1][1]);
    g.lineTo(c.mid[i][0], c.mid[i][1]);
    g.stroke();
  }
  g.restore();
}

/**
 * The melt inside a cut at flow phase 0…1 (one loop: everything has moved on by one spacing, so frames loop
 * seamlessly): deep red at the walls through orange to a yellow-white core, brighter pulses running along it, and
 * floes of dark crust riding the current with hot rims.
 */
export function paintMagma(g: Ctx, c: CutGeo, phase: number): void {
  clip(g, polyPath(c.inner), () => {
    const b = c.box;
    g.fillStyle = '#8a1206';
    g.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
    alongCut(g, c, '#d8300a', (h) => h * 1.25);
    alongCut(g, c, '#ff6a12', (h) => h * 0.9);
    alongCut(g, c, '#ffa82a', (h) => h * 0.55);
    // the white-hot core, and hot swells running down it
    alongCut(g, c, '#ffe27a', (h) => h * 0.28, 0.8);
    const P = Math.max(4, Math.round(c.len / 16));
    for (let j = 0; j < P; j++) {
      const t = (j + phase) / P;
      if (t < 0.04 || t > 0.96) continue;
      const p = cutAt(c, t);
      const k = 0.6 + 0.4 * Math.sin(t * 19 + c.seed);
      glowDot(g, p.x, p.y, p.h * 1.1 * k, '#ffd860', 0.75);
    }
    // floes of crust (shape and offset follow their place on the cut, so the loop never jumps)
    const M = Math.max(3, Math.round(c.len / 22));
    for (let j = 0; j < M; j++) {
      const t = (j + phase) / M;
      if (t < 0.05 || t > 0.95) continue;
      const p = cutAt(c, t);
      const lat = Math.sin(t * 17 + c.seed * 2.3) * 0.35 * p.h;
      const x = p.x + p.nx * lat;
      const y = p.y + p.ny * lat;
      const s = p.h * (0.45 + 0.18 * Math.sin(t * 11 + c.seed));
      const floe: PathFn = (q) => {
        q.beginPath();
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2;
          const rr = s * (0.75 + 0.3 * Math.sin(a * 3 + t * 23 + c.seed));
          const px = x + Math.cos(a) * rr * 1.5;
          const py = y + Math.sin(a) * rr * 0.75;
          if (k) q.lineTo(px, py);
          else q.moveTo(px, py);
        }
        q.closePath();
      };
      g.save();
      floe(g);
      g.fillStyle = rgba('#2a0a06', 0.88);
      g.fill();
      g.lineWidth = 0.9;
      g.strokeStyle = rgba('#ffb040', 0.9);
      g.stroke();
      g.restore();
      // a lit lip on the crust's top-left
      g.fillStyle = rgba('#7a3a20', 0.6);
      g.beginPath();
      g.ellipse(x + LX * s * 0.4, y + LY * s * 0.25, s * 0.5, s * 0.18, 0, 0, Math.PI * 2);
      g.fill();
    }
    // bright bubbles between them
    for (let j = 0; j < M; j++) {
      const t = (j + 0.5 + phase) / M;
      if (t < 0.08 || t > 0.92) continue;
      const p = cutAt(c, t);
      const lat = Math.sin(t * 13 + c.seed) * 0.3 * p.h;
      glowDot(g, p.x + p.nx * lat, p.y + p.ny * lat, p.h * 0.45, '#ffe27a', 0.9);
    }
    // the overhanging upper lip shades the melt beneath it
    innerTop(g, c);
  });
}

/** Shade along the melt's upper edge (the overhang of the upper wall). */
function innerTop(g: Ctx, c: CutGeo): void {
  const n = c.mid.length;
  softStroke(g, (q) => {
    for (let i = 0; i < n; i++) {
      const [x, y] = c.inner[i];
      if (i) q.lineTo(x, y);
      else q.moveTo(x, y);
    }
  }, rgba('#4a0802', 0.7), 2.6, 1.4);
}

/** The light a cut throws (additive in play): a wide red bloom and a hot core. */
export function paintCutGlow(g: Ctx, c: CutGeo, k = 1): void {
  g.save();
  blurBy(g, 6);
  alongCut(g, c, '#ff3a0a', (h) => h * 2.4 + 6, 0.32 * k);
  blurBy(g, 2);
  alongCut(g, c, '#ff8a1a', (h) => h * 0.9, 0.5 * k);
  blurBy(g, 0);
  alongCut(g, c, '#ffe8a0', (h) => h * 0.3, 0.4 * k);
  g.restore();
}

/** A gash in the stone: scorched round its lips, hairline cracks running off them, charred walls going down into
 * the melt (lit orange from below on the lower wall), the melt itself at `phase`. */
export function paintCut(g: Ctx, c: CutGeo): void {
  const r = rng(hashStr(`titan-cut-lips-${c.seed}`));
  const outer = polyPath(c.outer);
  // the stone round it is scorched black and glows a dull red near the lips
  g.save();
  blurBy(g, 6);
  alongCut(g, c, '#0c0604', (h) => h * 2 + 16, 0.4);
  blurBy(g, 3);
  alongCut(g, c, '#0a0402', (h) => h * 2 + 6, 0.5);
  alongCut(g, c, '#ff4a14', (h) => h * 2 + 5, 0.28);
  g.restore();
  // soot carried up off it by the heat
  for (let i = 0; i < 4; i++) {
    const p = cutAt(c, 0.2 + i * 0.2);
    softFill(g, (q) => {
      q.beginPath();
      q.ellipse(p.x, p.y - p.h - 9, 8 + p.h * 0.6, 12, 0, 0, Math.PI * 2);
    }, rgba('#0a0606', 0.22), 5);
  }
  // hairline cracks off the lips, the nearest still glowing
  for (let i = 2; i < c.mid.length - 2; i += 3) {
    if (r() < 0.62) continue;
    const up = r() < 0.5;
    const [x0, y0] = c.outer[up ? i : c.outer.length - 1 - i];
    const [nx, ny] = c.nrm[i];
    const sgn = up ? 1 : -1;
    let x = x0;
    let y = y0;
    const pts: Pt[] = [[x, y]];
    const L = 4 + r() * 9;
    let a = Math.atan2(ny * sgn, nx * sgn) + (r() - 0.5) * 1.2;
    for (let d = 0; d < L; d += 3.5) {
      a += (r() - 0.5) * 1.1;
      x += Math.cos(a) * 3.5;
      y += Math.sin(a) * 3.5;
      pts.push([x, y]);
    }
    const run = (q: Ctx) => pts.forEach(([px, py], k) => (k ? q.lineTo(px, py) : q.moveTo(px, py)));
    crease(g, run, 1.1, '#050203', 0.6, 0.25);
    if (r() < 0.6) {
      g.save();
      g.lineCap = 'round';
      g.beginPath();
      pts.slice(0, 3).forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py)));
      g.strokeStyle = rgba('#ff8a2a', 0.75);
      g.lineWidth = 0.7;
      g.stroke();
      g.restore();
    }
  }
  // the gash: charred walls, the upper one in shadow, the lower one lit by the melt
  contact(g, (q) => {
    outer(q);
    q.fill();
  }, 0.45, -1.5, 2);
  g.save();
  outer(g);
  g.fillStyle = '#140604';
  g.fill();
  g.restore();
  clip(g, outer, () => {
    texture(g, 'stone', c.glowBox, 0.5, 0.7);
    // the lower wall, lit from the melt
    g.save();
    g.translate(0, c.w * 0.3);
    alongCut(g, c, '#c8400e', (h) => h * 1.1, 0.85);
    g.restore();
    alongCut(g, c, '#ff7a1a', (h) => h * 1.5, 0.35);
  });
  paintMagma(g, c, 0);
  // the lips: a hard dark edge, the top-left one catching the light
  g.save();
  g.lineJoin = 'miter';
  outer(g);
  g.strokeStyle = rgba('#050203', 0.95);
  g.lineWidth = 1.4;
  g.stroke();
  g.restore();
  g.save();
  g.lineJoin = 'round';
  g.beginPath();
  const n = c.mid.length;
  for (let i = 0; i < n; i++) {
    const [x, y] = c.outer[i];
    if (i) g.lineTo(x + LX * 1.4, y + LY * 1.4);
    else g.moveTo(x + LX * 1.4, y + LY * 1.4);
  }
  g.strokeStyle = rgba('#d8d0c0', 0.38);
  g.lineWidth = 1.2;
  g.stroke();
  g.restore();
}

// ——— the chains ———

export const CHAIN_LINKS = 12;
/** A link's length and its stock's thickness (design units). */
export const LINK_LEN = 17;
const LINK_T = 4.4;

/** The chain ends at a toe curl, cached (play only ever shows the rig's few curl poses). */
const endsCache = new Map<string, [Pt, Pt]>();
export function titanChainEnds(s: number, curl: number): [Pt, Pt] {
  const key = `${s}:${curl}`;
  let e = endsCache.get(key);
  if (!e) {
    const [little, big] = titanCuffToes(pose({ curl }));
    e = [TITAN_EYE(s), cuffEye(s < 0 ? little : big)];
    endsCache.set(key, e);
  }
  return e;
}

/** A chain's length on side s (its rest span plus slack). */
function chainLength(s: number): number {
  const [[ax, ay], [bx, by]] = titanChainEnds(s, 0);
  return Math.hypot(bx - ax, by - ay) * 1.2;
}

interface ChainSim {
  s: number;
  /** Points now and one step ago (verlet), mutated in place. */
  p: Pt[];
  q: Pt[];
  len: number;
  /** Time not yet stepped (the solver runs fixed steps). */
  acc: number;
}

/** The forces on a chain at rest: gravity, and a pull out round the side of the foot (it drapes over the curve of
 * the foot, so it hangs out past the outline instead of straight down the front). */
const CHAIN_G = 1300;
const CHAIN_OUT = 1050;
/** The solver's fixed step: verlet's velocity is the last step's movement, so every step must be the same length. */
const CHAIN_H = 1 / 120;

/**
 * Advance a chain by dt (verlet, design units, fixed steps; the remainder carries over): ends pinned at a and b,
 * every link kept to its length, `ax`, `ay` added to gravity and the outward pull (the foot's own acceleration,
 * reversed, in play), `jitter` (if given) shaking each step (a rattle). At most 6 steps a call (a long stall).
 */
export function stepChain(c: ChainSim, a: Pt, b: Pt, ax: number, ay: number, dt: number, damp = 0.985, tension = 1, jitter?: () => number): void {
  const n = c.p.length - 1;
  const seg = (c.len * tension) / n;
  const h2 = CHAIN_H * CHAIN_H;
  const fx = (c.s * CHAIN_OUT + ax) * h2;
  const fy = (CHAIN_G + ay) * h2;
  c.acc = Math.min(c.acc + dt, CHAIN_H * 6);
  for (; c.acc >= CHAIN_H; c.acc -= CHAIN_H) {
    for (let i = 1; i < n; i++) {
      const p = c.p[i];
      const q = c.q[i];
      const x = p[0];
      const y = p[1];
      p[0] = x + (x - q[0]) * damp + fx + (jitter ? jitter() : 0);
      p[1] = y + (y - q[1]) * damp + fy + (jitter ? jitter() : 0);
      q[0] = x;
      q[1] = y;
    }
    c.p[0][0] = a[0];
    c.p[0][1] = a[1];
    c.p[n][0] = b[0];
    c.p[n][1] = b[1];
    for (let it = 0; it < 12; it++) {
      for (let i = 0; i < n; i++) {
        const p0 = c.p[i];
        const p1 = c.p[i + 1];
        const dx = p1[0] - p0[0];
        const dy = p1[1] - p0[1];
        const d = Math.hypot(dx, dy) || 1e-6;
        const k = (d - seg) / d;
        // a link only resists stretching (a chain bunches freely)
        if (k <= 0) continue;
        const w0 = i === 0 ? 0 : 0.5;
        const w1 = i + 1 === n ? 0 : 0.5;
        const ws = w0 + w1 || 1;
        p0[0] += (dx * k * w0) / ws;
        p0[1] += (dy * k * w0) / ws;
        p1[0] -= (dx * k * w1) / ws;
        p1[1] -= (dy * k * w1) / ws;
      }
    }
  }
}

/** Give every free point of a chain a velocity (design units per solver step): a landing's slam. */
export function kickChain(c: ChainSim, vx: (t: number) => number, vy: (t: number) => number): void {
  const n = c.p.length - 1;
  for (let i = 1; i < n; i++) {
    c.q[i][0] -= vx(i / n);
    c.q[i][1] -= vy(i / n);
  }
}

/** A chain on side s settled at rest at a toe curl (deterministic: the still art and play's first frame). */
export function restChain(s: number, curl = 0): ChainSim {
  const [a, b] = titanChainEnds(s, curl);
  const p: Pt[] = [];
  for (let i = 0; i <= CHAIN_LINKS; i++) {
    const t = i / CHAIN_LINKS;
    p.push([a[0] + (b[0] - a[0]) * t + s * Math.sin(Math.PI * t) * 20, a[1] + (b[1] - a[1]) * t]);
  }
  const c: ChainSim = { s, p, q: p.map((v) => [v[0], v[1]] as Pt), len: chainLength(s), acc: 0 };
  for (let i = 0; i < 80; i++) stepChain(c, a, b, 0, 0, 1 / 20, 0.9);
  return c;
}

/**
 * One forged iron link, centred on (x, y), its length along `ang`. Face-on links are open rings, edge-on ones bars.
 * Lit as if it lay at `lightAng` (play bakes links once and turns them, so it passes the angle chains mostly hang at).
 */
export function ironLink(g: Ctx, x: number, y: number, ang: number, face: boolean, lightAng = ang): void {
  const L = LINK_LEN / 2;
  const T = LINK_T;
  // the light's direction in the link's own frame
  const c = Math.cos(-lightAng);
  const s = Math.sin(-lightAng);
  const lx = LX * c - LY * s;
  const ly = LX * s + LY * c;
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  const H = face ? L * 0.62 : T * 0.62;
  const stadium = (hw: number, hh: number) => (q: Ctx) => {
    q.beginPath();
    q.roundRect(-hw, -hh, hw * 2, hh * 2, Math.min(hw, hh));
  };
  if (face) {
    const mid = stadium(L - T / 2, H - T / 2);
    g.lineJoin = 'round';
    g.strokeStyle = '#0a0a0e';
    g.lineWidth = T + 1.4;
    mid(g);
    g.stroke();
    g.strokeStyle = lin(g, lx * L, ly * H, -lx * L, -ly * H, [
      [0, '#8a8e98'],
      [0.45, TITAN_IRON],
      [1, '#1c1d22'],
    ]);
    g.lineWidth = T;
    mid(g);
    g.stroke();
    // the round of the stock catches the light on the side towards it
    g.save();
    g.translate(lx * T * 0.28, ly * T * 0.28);
    g.strokeStyle = rgba('#d8dce4', 0.55);
    g.lineWidth = T * 0.3;
    mid(g);
    g.stroke();
    g.restore();
  } else {
    const bar = stadium(L, H);
    bar(g);
    g.fillStyle = '#0a0a0e';
    g.fill();
    const inner = stadium(L - 0.7, H - 0.7);
    inner(g);
    g.fillStyle = lin(g, 0, ly * H, 0, -ly * H, [
      [0, '#9a9ea8'],
      [0.4, TITAN_IRON],
      [1, '#18191e'],
    ]);
    g.fill();
    g.fillStyle = rgba('#e0e4ec', 0.5);
    g.fillRect(-L + 2.5, ly * H * 0.4 - 0.4, L * 2 - 5, 0.8);
  }
  // rust pits
  g.fillStyle = rgba('#7a3a14', 0.55);
  for (const [px, py] of face ? [[-L * 0.6, -H + 1], [L * 0.4, H - 1.2]] : [[-L * 0.3, 0]]) {
    g.beginPath();
    g.arc(px, py, 0.9, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** A link's soft shadow on the stone (centred like the link). */
export function linkShadow(g: Ctx, x: number, y: number, ang: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  blurBy(g, 1.8);
  g.fillStyle = rgba('#05040a', 0.55);
  g.beginPath();
  g.roundRect(-LINK_LEN / 2, -LINK_T * 1.4, LINK_LEN, LINK_T * 2.8, LINK_T);
  g.fill();
  g.restore();
}

/** Is a design point over the foot (roughly: its outline between the shackle and the toes)? 0 off it … 1 well on. */
export function onTitan(x: number, y: number): number {
  const hw = y < 60 ? 58 : Math.min(102, 58 + (y - 60) * 0.55);
  return Math.max(0, Math.min(1, (hw - Math.abs(x - CX - 4)) / 8));
}

/** Draw a chain's links (and their shadows where they lie on the foot) along its points. */
function drawChain(g: Ctx, pts: Pt[]): void {
  const links = pts.slice(1).map((p, i) => {
    const [x0, y0] = pts[i];
    return { x: (x0 + p[0]) / 2, y: (y0 + p[1]) / 2, a: Math.atan2(p[1] - y0, p[0] - x0), face: i % 2 === 0 };
  });
  for (const l of links) {
    const on = onTitan(l.x, l.y);
    if (on <= 0) continue;
    g.save();
    g.globalAlpha = on;
    linkShadow(g, l.x - LX * 4, l.y - LY * 4, l.a);
    g.restore();
  }
  for (const face of [true, false]) for (const l of links) if (l.face === face) ironLink(g, l.x, l.y, l.a, face);
}

// ——— the shackle clock ———
//
// Both Kronoses wear time on the ankle: a round bronze clock set into the shackle, a bezel of worn bronze, an aged
// enamel face with Greek numerals at the quarters (ΙΒ, Γ, ΣΤ, Θ) and studs between, gold hands, and a glass dome over
// it with a hard highlight. The still art shows it at ten past ten; in play its hands are live (src/content/styleLive/
// titanClock.ts): the second hand ticks in steps with an overshoot, the minute hand creeps, the glass glints on
// every tick. Painted in pieces so play can stack them: face (no hands), hands, glass.

/** A clock on a shackle: its centre and the face's radius (design space). */
export interface TitanClock {
  x: number;
  y: number;
  r: number;
}

/** The Titan King's clock, in the middle of his shackle. */
export const TITAN_CLOCK: TitanClock = { x: CX, y: 42, r: 18 };

/** The still art's time: ten past ten, thirty-eight seconds (angles from twelve, clockwise). */
export const CLOCK_STILL = { hour: ((10 + 10 / 60) / 12) * Math.PI * 2, min: (10 / 60) * Math.PI * 2, sec: (38 / 60) * Math.PI * 2 };

/** The clock's whole outline (bezel included), for extending a silhouette. */
export const clockPath = (c: TitanClock): PathFn => (q) => {
  q.beginPath();
  q.arc(c.x, c.y, c.r + 4.2, 0, Math.PI * 2);
};

/** The bezel and the face (no hands, no glass): sunk into the shackle, its shadow on the metal round it. */
export function clockFace(g: Ctx, c: TitanClock, bronze: string): void {
  const { x, y, r } = c;
  const bez: PathFn = (q) => {
    q.beginPath();
    q.arc(x, y, r + 4.2, 0, Math.PI * 2);
  };
  contact(g, (q) => {
    bez(q);
    q.fill();
  }, 0.65, 2.4, 3);
  // the bezel: a turned bronze ring, bright on its top-left shoulder, knurled round its edge
  fill(g, bez, lin(g, x + LX * r, y + LY * r, x - LX * r, y - LY * r, [
    [0, mix(bronze, '#fff2c8', 0.55)],
    [0.35, bronze],
    [1, shade(bronze, -0.6)],
  ]));
  g.save();
  g.strokeStyle = rgba(shade(bronze, -0.65), 0.6);
  g.lineWidth = 0.7;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    g.beginPath();
    g.moveTo(x + Math.cos(a) * (r + 2.6), y + Math.sin(a) * (r + 2.6));
    g.lineTo(x + Math.cos(a) * (r + 4), y + Math.sin(a) * (r + 4));
    g.stroke();
  }
  g.restore();
  // the face: aged enamel, cupped (shadowed under the bezel's top-left lip)
  const face: PathFn = (q) => {
    q.beginPath();
    q.arc(x, y, r, 0, Math.PI * 2);
  };
  fill(g, face, rad(g, x + 3, y + 4, 1, x, y, r, [
    [0, '#efe6cc'],
    [0.75, '#d8caa2'],
    [1, '#a8976c'],
  ]));
  clip(g, face, () => {
    texture(g, 'speckle', { x: x - r, y: y - r, w: r * 2, h: r * 2 }, 0.25, 0.6);
    // a hairline craze in the old enamel
    crease(g, (q) => {
      q.moveTo(x - r * 0.7, y + r * 0.3);
      q.lineTo(x - r * 0.35, y + r * 0.42);
      q.lineTo(x - r * 0.2, y + r * 0.7);
    }, 0.5, '#5a4a2a', 0.4, 0.2);
  });
  innerEdge(g, face, rgba('#20140a', 0.6), 3.4, -LX * 2.4, -LY * 2.4);
  g.save();
  g.lineWidth = 0.9;
  g.strokeStyle = rgba(shade(bronze, -0.5), 0.9);
  face(g);
  g.stroke();
  // the minutes round the rim, studs at the hours, Greek numerals at the quarters
  for (let i = 0; i < 60; i++) {
    if (i % 15 === 0) continue;
    const a = (i / 60) * Math.PI * 2;
    const big = i % 5 === 0;
    const r0 = r - (big ? 4.2 : 2.4);
    g.strokeStyle = rgba('#2a1c0c', big ? 0.9 : 0.55);
    g.lineWidth = big ? 1.4 : 0.55;
    g.beginPath();
    g.moveTo(x + Math.sin(a) * r0, y - Math.cos(a) * r0);
    g.lineTo(x + Math.sin(a) * (r - 1.2), y - Math.cos(a) * (r - 1.2));
    g.stroke();
  }
  g.font = `bold ${Math.round(r * 0.36 * 10) / 10}px Georgia, "Times New Roman", serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const greek = ['ΙΒ', 'Γ', 'ΣΤ', 'Θ'];
  for (let q = 0; q < 4; q++) {
    const a = (q / 4) * Math.PI * 2;
    const rr = r - 6.2;
    const cx = x + Math.sin(a) * rr;
    const cy = y - Math.cos(a) * rr + 0.4;
    g.fillStyle = '#2a1608';
    g.fillText(greek[q], cx, cy);
  }
  g.restore();
}

/** A clock hand from the centre along `ang` (0 up, clockwise): a tapered blade with a short counterweight tail. */
export function clockHandShape(g: Ctx, c: TitanClock, ang: number, len: number, w: number, col: string): void {
  g.save();
  g.translate(c.x, c.y);
  g.rotate(ang);
  const hand: PathFn = (q) => {
    q.beginPath();
    q.moveTo(-w * 0.55, len * 0.22);
    q.lineTo(-w * 0.5, -len * 0.62);
    q.lineTo(0, -len);
    q.lineTo(w * 0.5, -len * 0.62);
    q.lineTo(w * 0.55, len * 0.22);
    q.closePath();
  };
  // its shadow on the face, down and to the right
  g.save();
  g.translate(-LX * 1.4, -LY * 1.4);
  softFill(g, hand, rgba('#1a1006', 0.4), 0.8);
  g.restore();
  fill(g, hand, lin(g, -w, 0, w, 0, [
    [0, mix(col, '#fff6d8', 0.5)],
    [0.5, col],
    [1, shade(col, -0.5)],
  ]));
  g.strokeStyle = rgba(shade(col, -0.7), 0.9);
  g.lineWidth = 0.6;
  hand(g);
  g.stroke();
  g.restore();
}

/** The three hands at angles (hour, minute, second), the arbor over them. */
export function clockHands(g: Ctx, c: TitanClock, gold: string, which: 'hour' | 'min' | 'sec' | 'all', ang = CLOCK_STILL): void {
  if (which === 'hour' || which === 'all') clockHandShape(g, c, ang.hour, c.r * 0.52, 2.6, gold);
  if (which === 'min' || which === 'all') clockHandShape(g, c, ang.min, c.r * 0.8, 1.9, gold);
  if (which === 'sec' || which === 'all') {
    clockHandShape(g, c, ang.sec, c.r * 0.88, 0.9, '#a8321c');
    fill(g, (q) => {
      q.beginPath();
      q.arc(c.x, c.y, 1.7, 0, Math.PI * 2);
    }, rad(g, c.x - 0.5, c.y - 0.5, 0.1, c.x, c.y, 1.9, [
      [0, '#fff6d8'],
      [0.5, gold],
      [1, shade(gold, -0.6)],
    ]));
  }
}

/** The glass dome over the face: a faint cool tint, a hard crescent of light on its top left and a soft one opposite. */
export function clockGlass(g: Ctx, c: TitanClock): void {
  const { x, y, r } = c;
  const face: PathFn = (q) => {
    q.beginPath();
    q.arc(x, y, r, 0, Math.PI * 2);
  };
  clip(g, face, () => {
    g.fillStyle = rad(g, x + LX * r * 0.5, y + LY * r * 0.5, 0, x, y, r, [
      [0, rgba('#e8f6ff', 0.22)],
      [0.6, rgba('#e8f6ff', 0.04)],
      [1, rgba('#e8f6ff', 0.16)],
    ]);
    g.fillRect(x - r, y - r, r * 2, r * 2);
    // the dome's hard highlight: a crescent on the top-left
    g.fillStyle = rgba('#ffffff', 0.62);
    g.beginPath();
    g.arc(x, y, r * 0.86, Math.PI * 1.05, Math.PI * 1.55);
    g.arc(x + r * 0.12, y + r * 0.14, r * 0.74, Math.PI * 1.55, Math.PI * 1.05, true);
    g.closePath();
    g.fill();
    // and a soft bounce on the bottom-right
    spec(g, x + r * 0.45, y + r * 0.5, r * 0.3, r * 0.12, 0.3, -0.8);
  });
  g.save();
  g.strokeStyle = rgba('#ffffff', 0.35);
  g.lineWidth = 0.8;
  g.beginPath();
  g.arc(x, y, r - 0.6, Math.PI * 0.95, Math.PI * 1.7);
  g.stroke();
  g.restore();
}

/** The whole clock as the still art shows it (face, hands at ten past ten, glass). */
export function shackleClock(g: Ctx, c: TitanClock, bronze: string, gold: string, hands: boolean): void {
  clockFace(g, c, bronze);
  if (hands) clockHands(g, c, gold, 'all');
  clockGlass(g, c);
}

// ——— the chains to the sky ———

/** The great rings at the shackle's ends that the sky chains hang from (s −1 left, 1 right), design space. */
export const TITAN_SKY_RING = (s: number): Pt => [CX + s * 72, 36];
/** Where the third sky chain holds him: an eye on the back of the shackle, hidden behind the leg. */
export const TITAN_SKY_BACK: Pt = [CX + 26, 30];
/** The sky chains' links are this much bigger than the toe chains'. */
export const SKY_LINK_K = 1.7;

/** A great iron ring standing off the end of the shackle, seen edge-on to the side: a thick torus, lit on its top. */
function skyRing(g: Ctx, x: number, y: number): void {
  const r = 9;
  const ring: PathFn = (c) => {
    c.beginPath();
    c.ellipse(x, y, r * 0.62 + 3, r + 3, 0, 0, Math.PI * 2);
    c.ellipse(x, y, r * 0.62 - 2.4, r - 2.4, 0, 0, Math.PI * 2, true);
  };
  contact(g, (c) => {
    ring(c);
    c.fill('evenodd');
  }, 0.65, 2.6, 3);
  g.save();
  ring(g);
  g.fillStyle = lin(g, x + LX * r, y + LY * r, x - LX * r, y - LY * r, [
    [0, '#d0d4dc'],
    [0.35, '#6a6e78'],
    [1, '#121318'],
  ]);
  g.fill('evenodd');
  g.lineWidth = 1.4;
  g.strokeStyle = rgba('#08080c', 0.95);
  g.stroke();
  g.restore();
  glint(g, x + LX * r * 0.6, y + LY * r * 0.8, 2.6, 0.85);
}

/** The still art's hint of the sky chains: the last few links rising from a ring towards the top of the frame,
 * fading out (in play the whole chain runs off the top of the screen). */
function skyStub(g: Ctx, s: number): void {
  const [x, y] = TITAN_SKY_RING(s);
  const ang = -Math.PI / 2 + s * 0.42;
  const step = LINK_LEN * SKY_LINK_K * 0.78;
  for (let i = 0; i < 4; i++) {
    const d = step * (i + 0.55);
    g.save();
    g.globalAlpha = 1 - i * 0.24;
    g.translate(x + Math.cos(ang) * d, y + Math.sin(ang) * d);
    g.scale(SKY_LINK_K, SKY_LINK_K);
    ironLink(g, 0, 0, ang, i % 2 === 0, Math.PI / 2);
    g.restore();
  }
}

// ——— the foot ———

/** A bronze shackle band round a titan's ankle (its path within CX ± 68, y 22…64): cast bronze with a Greek key
 * cut round it and verdigris in the pits. */
export function shackleBand(g: Ctx, path: PathFn, bronze: string): void {
  const box = { x: CX - 68, y: 22, w: 136, h: 42 };
  metal(g, path, box, bronze, { vertical: true });
  clip(g, path, () => {
    texture(g, 'cast', box, 0.3);
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
    blotches(g, box, '#3a9a7a', 0.45, 8, 0.66, 0.08, 675);
  });
}

/**
 * A titan's foot of weathered stone (both Kronoses): the bare foot re-lit as stone, pitted and grained, grimy, mossy
 * in the hollows, chisel-marked, and its toes as heavy rounded blocks with lit knuckles creased across, deep clefts
 * and thick stone nails. Paints on the silhouette's layer; the caller adds its own story and the outline.
 */
export function titanStone(f: BareFoot, stone: string, dark: string, p: Pose): void {
  const g = f.sil.g;
  const box = f.box;
  // re-light as weathered titan stone
  f.sil.form({ base: stone, shadowTint: MATS_F.rock.shadowTint, ramp: 0.75, form: 0.6, formSize: 32, bevel: 0.4, rim: 0.45 });
  texture(g, 'stone', box, 0.38, 1.4);
  texture(g, 'cast', box, 0.2, 1, 'soft-light');
  blotches(g, box, shade(dark, -0.2), 0.45, 26, 0.55, 0.15, 672);
  // moss in the hollows, lichen speckle
  blotches(g, { x: box.x, y: 100, w: box.w, h: 170 }, '#5a7a3a', 0.5, 14, 0.66, 0.08, 673);
  blotches(g, box, '#c8c0a0', 0.25, 5, 0.75, 0.05, 674);
  // chisel marks: an ancient carved foot
  const r = rng(hashStr('titan-chisel'));
  for (let i = 0; i < 18; i++) {
    const x = CX - 84 + r() * 170;
    const y = 70 + r() * 130;
    crease(g, (c) => {
      c.moveTo(x, y);
      c.lineTo(x + 5, y + 2);
    }, 1, '#10121c', 0.25, 0.25);
  }
  // the toes: each a heavy rounded block of the same stone, lit on top and falling into a core shadow on its far
  // side, with a lit knuckle creased across, deep clefts between, and a thick stone nail at the tip
  const cl = clefts(f.toes);
  const c = Math.max(0, p.curl);
  for (const [i, t] of f.toes.entries()) {
    const xl = i > 0 ? cl[i - 1][0] : -1000;
    const xr = i < cl.length ? cl[i][0] : 1000;
    lobe(g, toePath(t), { x: xl, y: t.cy - t.ry - 4, w: xr - xl, h: t.ry * 2 + 8 }, t.cy - t.ry * 0.8, t.cy, '#0a0a14', 0.55, Math.max(7, t.rx * 0.5), 0.3);
    // the knuckle: a lit dome, two creases across it (deeper as the toes curl)
    const [kx, ky] = onToe(t, -Math.PI / 2);
    spec(g, kx - t.rx * 0.18, ky + t.ry * 0.5, t.rx * 0.62, t.ry * 0.24, 0.2 + c * 0.15, t.rot, LIGHT.key);
    for (const [f2, w] of [[0.36, 1.8], [0.52, 1.5]] as const) {
      const y = t.cy - t.ry * f2 + c * 4;
      crease(g, (q) => {
        q.moveTo(t.cx - t.rx * 0.46, y - 1.5);
        q.quadraticCurveTo(t.cx - t.rx * 0.05, y + 3 + c * 2, t.cx + t.rx * 0.42, y - 1.2);
      }, w, '#06060c', 0.6 + c * 0.2, 0.35);
    }
    // weathering: a chisel-cut chip on the lit shoulder
    crease(g, (q) => {
      q.moveTo(t.cx - t.rx * 0.6, t.cy - t.ry * 0.05);
      q.lineTo(t.cx - t.rx * 0.42, t.cy + t.ry * 0.12);
    }, 1.2, '#06060c', 0.5, 0.3);
    titanNail(g, t, stone, c, i);
  }
}


function drawTitan(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const stone = art.skin;
  const dark = art.primary ?? '#5c5852';
  const bronze = art.secondary ?? '#c9873a';
  const sand = (art.extra?.sand as string) ?? '#f0c860';
  const look = { ...TITAN_LOOK, skin: stone };
  const f = o.heat || o.emissive ? bareFoot(ctx, look, p) : paintBare(ctx, look, p);
  const g = f.sil.g;
  const box = f.box;
  const bandP: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX - 64, 22);
    c.quadraticCurveTo(CX, 30, CX + 64, 22);
    c.lineTo(CX + 68, 54);
    c.quadraticCurveTo(CX, 64, CX - 68, 54);
    c.closePath();
  };
  extendSil(f.sil, [bandP, clockPath(TITAN_CLOCK)]);
  if (o.heat) {
    heatLayer(f.sil, box, { seed: 671, y0: 262, y1: 20 });
    return;
  }
  if (o.emissive) {
    for (const c of TITAN_CUT_GEO) paintCutGlow(g, c, 0.45);
    glowDot(g, TITAN_CLOCK.x, TITAN_CLOCK.y, TITAN_CLOCK.r * 1.1, sand, 0.35);
    glowFinish(f.sil);
    return;
  }
  titanStone(f, stone, dark, p);
  // under the rings on the little and big toes: their cast shadows, the flesh squeezed either side
  paintCuffBed(g, f.toes[0]);
  paintCuffBed(g, f.toes[4]);
  // the gashes, the magma of Tartarus inside
  for (const c of TITAN_CUT_GEO) paintCut(g, c);
  // the bronze shackle with a Greek key
  shackleBand(g, bandP, bronze);
  ao(g, CX, 64, 64, 6, 0.35);
  // the clock set into the shackle (in play its hands and glass are live, over the face)
  if (o.live) clockFace(g, TITAN_CLOCK, bronze);
  else shackleClock(g, TITAN_CLOCK, bronze, '#e8c870', true);
  // the shackle's iron eyes: a riveted strap down over the band's lower edge, a ring through it
  for (const s of [-1, 1]) {
    const [ex, ey] = TITAN_EYE(s);
    const strap: PathFn = (c) => {
      c.beginPath();
      c.roundRect(ex - 6, 40, 12, ey - 40 - 2, 2.5);
    };
    metal(g, strap, { x: ex - 6, y: 40, w: 12, h: ey - 42 }, TITAN_IRON, { vertical: true, glints: false, shadow: 0.55 });
    rivet(g, ex, 46, 2.4, '#8a8e98');
    ironEye(g, ex, ey, 5);
  }
  lightAll(f.sil, 0.35, 22, 0.45);
  bareOutline(f);
  // the iron rings on the little and big toes (they stand off the silhouette, so over the outline)
  paintCuff(ctx, f.toes[0], f.toes[1]);
  paintCuff(ctx, f.toes[4], f.toes[3]);
  // the great rings either side of the shackle that his chains to the sky hang from (play draws the chains; the
  // still art shows the last links rising out of frame)
  for (const s of [-1, 1]) {
    const [rx, ry] = TITAN_SKY_RING(s);
    if (!o.live) skyStub(ctx, s);
    skyRing(ctx, rx, ry);
  }
  // the chains to the toes (in play they're simulated and drawn live)
  if (!o.live) for (const s of [-1, 1]) drawChain(ctx, restChain(s, p.curl).p);
}

registerStyle('titanking', {
  contactY: TITAN_JAW.contact,
  halfWidth: 112,
  rig: BARE_RIG,
  leg: { kind: 'basalt', hw: 56, join: 'blend', fade: 18 },
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
