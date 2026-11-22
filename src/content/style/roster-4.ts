// Roster batch, part 4: the Kitchen, Old Town and the Pier (Thief Theo, Dough Toes, Pigeon Toes, Chimney Charlie,
// Rainy Ray, Gym Bro Greg, Crabby Craig, Lifeguard Lou, Surf's Up Sully), redrawn in the style kit. Life in play:
// src/content/styleLive/roster.ts.

import { onToe } from '../../art/style/anatomy';
import { LIGHT, type PathFn, ao, crease, glint, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil, lobe } from '../../art/style/sil';
import { registerStyle } from '../../art/style/registry';
import { beadEye, blotches, contact, rivet, stitches } from '../../art/style/details';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';
import { BARE_RIG, CX, SHOE_RIG, bareWith, ell, finishLight, hgrad, piece, prop, rrect, solePath, upperPath, vgrad, within } from './roster-kit';

// ════════════════════════ Thief Theo ════════════════════════
// Soft black suede creepers on a quiet crepe sole, a row of brass buttons, and a burlap loot bag on a cord. In play he
// tiptoes (barely squashes), the bag swings on its cord and stolen coins glint as it jingles.

const THIEF = { topW: 54, ballW: 94, toeY: 246 };
export const BAG_PIVOT: [number, number] = [CX + 78, 60];

function lootBag(g: Ctx, gold: string): void {
  const [px, py] = BAG_PIVOT;
  g.save();
  g.translate(px, py);
  g.scale(1.3, 1.3);
  g.translate(-px, -py);
  const bag: PathFn = (c) => {
    c.beginPath();
    c.moveTo(px + 6, py + 34);
    c.bezierCurveTo(px - 26, py + 50, px - 24, py + 116, px + 14, py + 118);
    c.bezierCurveTo(px + 54, py + 116, px + 52, py + 50, px + 22, py + 34);
    c.quadraticCurveTo(px + 30, py + 26, px + 26, py + 22);
    c.lineTo(px + 2, py + 22);
    c.quadraticCurveTo(px - 2, py + 26, px + 6, py + 34);
    c.closePath();
  };
  // the cord from the ankle
  g.save();
  g.lineCap = 'round';
  g.strokeStyle = '#3a2a14';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(px, py);
  g.quadraticCurveTo(px + 4, py + 14, px + 14, py + 26);
  g.stroke();
  g.strokeStyle = '#a8844a';
  g.lineWidth = 2.2;
  g.stroke();
  g.restore();
  const box = { x: px - 30, y: py + 18, w: 86, h: 104 };
  prop(g, [bag], box, (bg, sil) => {
    sil.form({ base: '#b8945a', shadowTint: '#3a1a08', ramp: 0.8, form: 0.55, formSize: 14, bevel: 0.3, rim: 0.45 });
    texture(bg, 'canvas', box, 0.55, 0.8);
    // the gathered neck and lumps of coin inside
    crease(bg, (c) => {
      c.moveTo(px + 4, py + 36);
      c.lineTo(px + 24, py + 36);
    }, 3, '#3a2008', 0.7, 0.3);
    for (const [x, y] of [[px - 4, py + 92], [px + 22, py + 98], [px + 34, py + 76]] as const) {
      spec(bg, x - 3, y - 3, 9, 6, 0.3, -0.5, LIGHT.key);
      ao(bg, x + 3, y + 5, 10, 5, 0.3);
    }
    // a painted dollar sign
    bg.save();
    bg.font = '900 30px "Arial Black", Impact, sans-serif';
    bg.textAlign = 'center';
    bg.fillStyle = rgba(shade(gold, -0.2), 0.9);
    bg.fillText('$', px + 14, py + 92);
    bg.restore();
    // a coin peeking out of the neck
    piece(bg, ell(px + 16, py + 30, 7, 4), box, 'gold', gold, { shadow: 0.3 });
  }, inkOf('#8a6a3a'), { w: 3 });
  g.restore();
}

registerStyle('thief', {
  contactY: 262,
  rig: SHOE_RIG,
  leg: { kind: 'knit', hw: 50, join: 'into' },
  parts: { bag: { box: { x: BAG_PIVOT[0] - 44, y: BAG_PIVOT[1] - 6, w: 124, h: 170 }, frames: 1, pivot: BAG_PIVOT, draw: (g, art) => lootBag(g, art.secondary ?? '#c9a34a') } },
  draw(ctx, art, p, o) {
    const black = art.primary ?? '#1b1b22';
    const gold = art.secondary ?? '#c9a34a';
    const flex = Math.max(0, p.curl);
    const upper = upperPath(THIEF, flex);
    const sole = solePath(THIEF, flex, 14, 196, 2);
    const collar: PathFn = (c) => {
      c.beginPath();
      c.roundRect(CX - 58, -6, 116, 34, 10);
    };
    const box = { x: CX - 100, y: -10, w: 200, h: 280 };
    const sil = new Sil(ctx, [sole, upper, collar], box);
    const g = sil.g;
    within(g, sole, () => {
      g.fillStyle = vgrad(g, 196, 262, [[0, '#4a3a2a'], [1, '#1a120a']]);
      g.fillRect(box.x, 190, box.w, 80);
      texture(g, 'cast', box, 0.35, 0.8);
    });
    piece(g, upper, box, 'suede', black, { shadow: 0.4 });
    within(g, upper, () => {
      texture(g, 'grain', box, 0.35, 1.2);
      // brushed nap: lighter where the light catches it
      spec(g, CX - 40, 120, 40, 70, 0.14, 0.2, '#b8b8d0');
      // the apron seam round the toe, hand-stitched
      stitches(g, (c) => c.ellipse(CX, 212 - flex * 5, 70, 56, 0, Math.PI + 0.1, -0.1), rgba('#5a5a66', 0.9), 1.3, 3, 3);
      crease(g, (c) => c.ellipse(CX, 212 - flex * 5, 74, 60, 0, Math.PI + 0.1, -0.1), 1.6, '#000000', 0.5, 0.12);
      // brass buttons up the side
      for (let i = 0; i < 4; i++) {
        const y = 52 + i * 26;
        const x = CX + 46 + i * 4;
        piece(g, ell(x, y, 5, 5), box, 'gold', gold, { shadow: 0.5 });
        glint(g, x - 1.6, y - 1.6, 2.2, 1);
      }
    });
    // the sock collar: a ribbed black knit with a grey stripe
    piece(g, collar, box, 'knit', black, { shadow: 0.4 });
    within(g, collar, () => {
      g.fillStyle = rgba('#e8e8ee', 0.85);
      g.fillRect(box.x, 8, box.w, 5);
      texture(g, 'knit', box, 0.45, 1.4);
    });
    finishLight(sil, black, '#0a0a1a', 0.25);
    sil.finish(inkOf(shade(black, 0.3)), { openTop: -5 });
    if (!o.live) lootBag(ctx, gold);
  },
});

// ════════════════════════ Dough Toes ════════════════════════
// Raw pizza dough with toes: soft, floury and lumpy, poked with finger dents, a slice of pepperoni stuck on, and a
// strand of dough sagging off the side. In play flour sifts off it, its toes wiggle and it stretches before it splits.

registerStyle('doughtoes', {
  rig: BARE_RIG,
  contactY: 266,
  leg: { kind: 'skin', hw: 52, join: 'blend', fade: 26 },
  draw(ctx, art, p) {
    const dough = art.primary ?? '#f2e2c2';
    const crust = art.secondary ?? '#c98a4a';
    bareWith(ctx, { skin: dough, nails: null, shadowTint: '#9a6a3a', pores: 0.4, detail: 0, toe: 1.1, w: 6 }, p, (g, f) => {
      texture(g, 'pores', f.box, 0.4, 1.4);
      const r = rng(hashStr('dough'));
      // flour dusting on top, finger-poke dents, air bubbles
      softFill(g, ell(CX - 30, 60, 60, 40), rgba('#ffffff', 0.4), 12);
      for (let i = 0; i < 160; i++) {
        g.fillStyle = rgba('#ffffff', 0.4 + r() * 0.5);
        g.beginPath();
        g.arc(f.box.x + 20 + r() * (f.box.w - 40), r() * 160, 0.5 + r(), 0, Math.PI * 2);
        g.fill();
      }
      for (const [x, y] of [[CX + 40, 120], [CX - 30, 150], [CX + 10, 70]] as const) {
        ao(g, x + 2, y + 2, 9, 7, 0.35, 0, '#7a4a1a');
        spec(g, x + 5, y + 6, 6, 3, 0.4, -0.3, LIGHT.key);
      }
      for (let i = 0; i < 10; i++) {
        const x = CX - 80 + r() * 160;
        const y = 40 + r() * 180;
        const s = 2 + r() * 3.5;
        piece(g, ell(x, y, s, s * 0.85), f.box, 'dough', shade(dough, 0.05), { shadow: 0.25 });
        spec(g, x - s * 0.3, y - s * 0.3, s * 0.5, s * 0.3, 0.6);
      }
      // the toes browning a little at their tips, like a crust
      for (const t of f.toes) {
        const [x, y] = onToe(t, Math.PI / 2);
        softFill(g, ell(x, y - t.ry * 0.25, t.rx * 0.8, t.ry * 0.45, t.rot), rgba(crust, 0.4), 6);
      }
      // the pepperoni slice
      const pep = ell(CX - 50, 104, 17, 15, 0.2);
      piece(g, pep, f.box, 'sauce', '#b8282a', { shadow: 0.5 });
      within(g, pep, () => {
        for (let i = 0; i < 8; i++) {
          g.fillStyle = rgba('#f4c8a0', 0.7);
          g.beginPath();
          g.arc(CX - 60 + r() * 20, 94 + r() * 20, 1 + r() * 1.6, 0, Math.PI * 2);
          g.fill();
        }
        ao(g, CX - 46, 112, 12, 6, 0.3, 0, '#3a0408');
      });
      glint(g, CX - 56, 98, 3, 0.9);
    }, inkOf(mix(dough, '#8a5a2a', 0.5)));
    // the sagging strand of dough off the outer side
    const strand: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 92, 170);
      c.bezierCurveTo(CX - 110, 200, CX - 108, 240, CX - 112, 262);
      c.arc(CX - 106, 266, 8, Math.PI, 0, true);
      c.bezierCurveTo(CX - 98, 240, CX - 94, 210, CX - 80, 192);
      c.closePath();
    };
    prop(ctx, [strand], { x: CX - 122, y: 160, w: 50, h: 116 }, (g, sil) => {
      sil.form({ base: dough, shadowTint: '#9a6a3a', ramp: 0.7, form: 0.5, formSize: 6, bevel: 0.4, rim: 0.4 });
      texture(g, 'pores', { x: CX - 122, y: 160, w: 50, h: 116 }, 0.35, 1.2);
      spec(g, CX - 104, 220, 3, 14, 0.5, 0.1);
    }, inkOf(mix(dough, '#8a5a2a', 0.5)), { w: 3.6 });
  },
});

// ════════════════════════ Pigeon Toes ════════════════════════
// A grey feathered pigeon leg: an iridescent green and violet neck band, rows of soft scalloped feathers, and pink
// scaly toes with dark claws gripping down. In play loose feathers fall off the flock and the toes clench and splay.

/** The pigeon's three forward toes and the back one, splayed by `s` (−1 clenched … 1 splayed). */
function pigeonToes(s: number): { path: PathFn; tip: [number, number]; root: [number, number]; w: number }[] {
  const out: { path: PathFn; tip: [number, number]; root: [number, number]; w: number }[] = [];
  const rx = CX;
  const ry = 160;
  // splayed wide and thick, so the grip (the foot) reads as big as the old pigeon's, not a twig under the feathers
  const spread = 0.72 + s * 0.14;
  for (const [a, len, w] of [[-spread, 104, 21], [0, 114, 22], [spread, 104, 21]] as const) {
    const ang = Math.PI / 2 + a;
    const tx = rx + Math.cos(ang) * len;
    const ty = ry + Math.sin(ang) * len;
    const nx = Math.cos(ang + Math.PI / 2) * w * 0.5;
    const ny = Math.sin(ang + Math.PI / 2) * w * 0.5;
    out.push({
      root: [rx, ry],
      tip: [tx, ty],
      w,
      path: (c) => {
        c.beginPath();
        c.moveTo(rx + nx * 1.4, ry + ny * 1.4);
        c.quadraticCurveTo((rx + tx) / 2 + nx * 1.3, (ry + ty) / 2 + ny * 1.3, tx + nx * 0.7, ty + ny * 0.7);
        c.arc(tx, ty, w * 0.36, ang + Math.PI / 2, ang - Math.PI / 2, true);
        c.quadraticCurveTo((rx + tx) / 2 - nx * 1.3, (ry + ty) / 2 - ny * 1.3, rx - nx * 1.4, ry - ny * 1.4);
        c.closePath();
      },
    });
  }
  return out;
}

registerStyle('pigeon', {
  portraitLeg: 20,
  contactY: 276,
  halfWidth: 100,
  rig: { from: 150, to: 170 },
  leg: { kind: 'fur', hw: 50, join: 'blend', fade: 22 },
  draw(ctx, art, p) {
    const grey = art.primary ?? '#8d929c';
    const sheen = art.secondary ?? '#5fbf9a';
    const pink = art.skin;
    const toes = pigeonToes(-p.curl);
    const claws: PathFn[] = toes.map(({ tip, root }) => {
      const ang = Math.atan2(tip[1] - root[1], tip[0] - root[0]);
      return (c) => {
        c.save();
        c.translate(tip[0] + Math.cos(ang) * 3, tip[1] + Math.sin(ang) * 3);
        c.rotate(ang - Math.PI / 2);
        c.beginPath();
        c.moveTo(-5, 0);
        c.quadraticCurveTo(-4, 14, 2, 20);
        c.quadraticCurveTo(4, 10, 5, 0);
        c.closePath();
        c.restore();
      };
    });
    const skirt: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 50, -6);
      c.bezierCurveTo(CX - 52, 40, CX - 86, 80, CX - 88, 130);
      for (let i = 0; i <= 8; i++) {
        const x = CX - 88 + i * 22;
        c.quadraticCurveTo(x - 11, 168, x, 140 + (i % 2) * 4);
      }
      c.bezierCurveTo(CX + 86, 80, CX + 52, 40, CX + 50, -6);
      c.closePath();
    };
    const box = { x: CX - 104, y: -10, w: 208, h: 300 };
    const sil = new Sil(ctx, [...claws, ...toes.map((t) => t.path), skirt], box);
    const g = sil.g;
    // the toes: pink scaly skin, ringed with scutes
    for (const t of toes) {
      within(g, t.path, () => {
        g.fillStyle = vgrad(g, 150, 280, [[0, shade(pink, -0.2)], [0.5, pink], [1, shade(pink, -0.25)]]);
        g.fillRect(box.x, 150, box.w, 140);
        texture(g, 'scales', box, 0.35, 0.9);
        const [x0, y0] = t.root;
        const [x1, y1] = t.tip;
        for (let k = 1; k < 9; k++) {
          const u = k / 9;
          const x = x0 + (x1 - x0) * u;
          const y = y0 + (y1 - y0) * u;
          const ang = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2;
          crease(g, (c) => {
            c.moveTo(x + Math.cos(ang) * t.w * 0.6, y + Math.sin(ang) * t.w * 0.6);
            c.quadraticCurveTo(x + 2, y + 3, x - Math.cos(ang) * t.w * 0.6, y - Math.sin(ang) * t.w * 0.6);
          }, 1.2, shade(pink, -0.5), 0.45, 0.35);
        }
        spec(g, (x0 + x1) / 2 - 4, (y0 + y1) / 2, 4, 20, 0.35, Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2);
      });
    }
    for (const cl of claws) {
      within(g, cl, () => {
        g.fillStyle = vgrad(g, 240, 290, [[0, '#4a3a3a'], [1, '#120a0a']]);
        g.fillRect(box.x, 230, box.w, 70);
      });
    }
    // the feathers: grey, scalloped rows, an iridescent band at the top
    within(g, skirt, () => {
      g.fillStyle = vgrad(g, -6, 170, [[0, shade(grey, -0.05)], [1, shade(grey, -0.3)]]);
      g.fillRect(box.x, -10, box.w, 190);
      const band = g.createLinearGradient(CX - 60, 0, CX + 60, 40);
      band.addColorStop(0, rgba(sheen, 0.9));
      band.addColorStop(0.5, rgba('#9a6ad8', 0.85));
      band.addColorStop(1, rgba(sheen, 0.9));
      g.fillStyle = band;
      g.fillRect(box.x, 6, box.w, 40);
      g.fillStyle = vgrad(g, 30, 52, [[0, rgba(grey, 0)], [1, rgba(grey, 1)]]);
      g.fillRect(box.x, 30, box.w, 22);
      // scalloped feather rows, each feather lit on its top edge with a dark tip
      for (let row = 0; row < 6; row++) {
        const y = 40 + row * 20;
        const off = row % 2 ? 11 : 0;
        for (let x = CX - 110 + off; x < CX + 110; x += 22) {
          const fe = ell(x, y, 12, 13);
          contact(g, (c) => {
            fe(c);
            c.fill();
          }, 0.35, 2, 3);
          within(g, fe, () => {
            g.fillStyle = vgrad(g, y - 13, y + 13, [[0, shade(grey, 0.25 - row * 0.03)], [0.7, shade(grey, -row * 0.04)], [1, shade(grey, -0.4)]]);
            g.fillRect(x - 13, y - 13, 26, 26);
            g.strokeStyle = rgba('#ffffff', 0.3);
            g.lineWidth = 0.8;
            g.beginPath();
            g.moveTo(x, y - 12);
            g.lineTo(x, y + 12);
            g.stroke();
          });
        }
      }
      // a dark bar across the lower feathers, as real pigeons have
      g.fillStyle = rgba('#2a2e36', 0.35);
      g.fillRect(box.x, 128, box.w, 10);
      spec(g, CX - 40, 30, 30, 10, 0.4, -0.2);
    });
    finishLight(sil, grey, '#101828', 0.25);
    sil.finish(inkOf(grey), { openTop: -5 });
  },
});

// ════════════════════════ Chimney Charlie ════════════════════════
// Down one chimney and up another: his leg goes into a brick chimney stack (weathered red bricks, crumbling mortar, a
// stone cap, soot round the top). In play soot puffs curl out round his leg and soot motes sift down.

const stack: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 84, 40);
  c.lineTo(CX + 84, 40);
  c.lineTo(CX + 86, 264);
  c.lineTo(CX - 86, 264);
  c.closePath();
};
const capStone: PathFn = (c) => {
  c.beginPath();
  c.roundRect(CX - 100, 18, 200, 28, 4);
};

registerStyle('chimney', {
  contactY: 266,
  leg: { kind: 'wool', hw: 60, join: 'into', end: 32 },
  draw(ctx, art, _p) {
    const brick = art.primary ?? '#b8503a';
    const soot = art.secondary ?? '#3a3a3a';
    const box = { x: CX - 104, y: 10, w: 208, h: 260 };
    const sil = new Sil(ctx, [stack, capStone], box);
    const g = sil.g;
    const r = rng(hashStr('chimney'));
    // mortar behind the bricks
    within(g, stack, () => {
      g.fillStyle = '#cfc4b0';
      g.fillRect(box.x, 40, box.w, 230);
      texture(g, 'stone', box, 0.4, 1);
      // the bricks: each its own lit block, colours varied, chipped
      const bh = 18;
      for (let row = 0; row < 13; row++) {
        const y = 42 + row * bh;
        const off = row % 2 ? -22 : 0;
        for (let x = CX - 108 + off; x < CX + 100; x += 44) {
          const tone = mix(brick, r() < 0.5 ? '#7a2a1a' : '#d87a5a', r() * 0.35);
          const b = rrect(x + 2, y + 2, 40, bh - 4, 2);
          within(g, b, () => {
            g.fillStyle = vgrad(g, y + 2, y + bh - 2, [[0, shade(tone, 0.18)], [1, shade(tone, -0.25)]]);
            g.fillRect(x, y, 44, bh);
            texture(g, 'cast', box, 0.4, 0.9);
          });
          g.fillStyle = rgba('#ffffff', 0.18);
          g.fillRect(x + 3, y + 2.5, 38, 1.2);
          g.fillStyle = rgba('#000000', 0.25);
          g.fillRect(x + 3, y + bh - 3.5, 38, 1.4);
        }
      }
      // soot staining down from the top and grime at the bottom
      g.fillStyle = vgrad(g, 40, 120, [[0, rgba(soot, 0.75)], [1, rgba(soot, 0)]]);
      g.fillRect(box.x, 40, box.w, 80);
      blotches(g, { x: CX - 86, y: 40, w: 172, h: 120 }, '#141214', 0.45, 18, 0.5, 0.2, 13);
      g.fillStyle = vgrad(g, 220, 266, [[0, rgba('#2a1a10', 0)], [1, rgba('#2a1a10', 0.35)]]);
      g.fillRect(box.x, 220, box.w, 50);
      // the stack's roundness: lit left, shaded right
      g.fillStyle = hgrad(g, CX - 86, CX + 86, [[0, rgba('#000000', 0.1)], [0.2, rgba('#fff2d8', 0.12)], [0.5, rgba('#000000', 0)], [0.9, rgba('#1a0a20', 0.3)], [1, rgba('#cfe2ff', 0.25)]]);
      g.fillRect(box.x, 40, box.w, 230);
    });
    // the stone cap, sooty on top
    piece(g, capStone, box, 'stone', '#8a8580', { shadow: 0.55 });
    within(g, capStone, () => {
      g.fillStyle = rgba(soot, 0.6);
      g.fillRect(box.x, 18, box.w, 8);
    });
    // the dark flue round the leg
    ao(g, CX, 22, 66, 8, 0.7, 0, '#000000');
    finishLight(sil, brick, '#200818', 0.25);
    sil.finish(inkOf(brick), { openTop: 14 });
  },
});

// ════════════════════════ Rainy Ray ════════════════════════
// Brings his own drizzle: a blue and yellow umbrella over his ankle, rain beading on his foot. In play rain falls
// off the umbrella's rim onto the pizza below and the umbrella bobs as he floats.

const umbCanopy: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 118, 92);
  c.bezierCurveTo(CX - 110, 20, CX - 50, -12, CX, -14);
  c.bezierCurveTo(CX + 50, -12, CX + 110, 20, CX + 118, 92);
  for (let i = 6; i > 0; i--) {
    const x0 = CX - 118 + i * (236 / 6);
    const x1 = x0 - 236 / 6;
    c.quadraticCurveTo((x0 + x1) / 2, 76, x1, 92);
  }
  c.closePath();
};

registerStyle('rainy', {
  rig: BARE_RIG,
  leg: { kind: 'wool', hw: 56, join: 'into', end: 30 },
  draw(ctx, art, p) {
    const blue = art.primary ?? '#2f6ad0';
    const yellow = art.secondary ?? '#ffd23f';
    bareWith(ctx, { skin: art.skin, nails: art.nails }, p, (g, f) => {
      const r = rng(hashStr('rainy'));
      for (let i = 0; i < 34; i++) {
        const x = f.box.x + 24 + r() * (f.box.w - 48);
        const y = 100 + r() * 150;
        const s = 1.6 + r() * 2.6;
        piece(g, (c) => {
          c.beginPath();
          c.moveTo(x, y - s * 1.6);
          c.quadraticCurveTo(x + s, y, x, y + s);
          c.quadraticCurveTo(x - s, y, x, y - s * 1.6);
          c.closePath();
        }, f.box, 'glass', '#e8f4ff', { shadow: 0.25 });
        glint(g, x - s * 0.3, y - s * 0.2, s * 0.6, 0.95);
      }
      // the umbrella's shadow on the foot
      g.fillStyle = vgrad(g, 80, 140, [[0, rgba('#102040', 0.4)], [1, rgba('#102040', 0)]]);
      g.fillRect(f.box.x, 80, f.box.w, 60);
    });
    const box = { x: CX - 122, y: -20, w: 244, h: 116 };
    prop(ctx, [umbCanopy], box, (g, sil) => {
      sil.form({ base: blue, shadowTint: '#0a1030', ramp: 0.8, form: 0.5, formSize: 18, bevel: 0.4, rim: 0.5 });
      // alternating panels: yellow and blue gores meeting at the top
      for (let i = 0; i < 6; i++) {
        if (i % 2) continue;
        const x0 = CX - 118 + i * (236 / 6);
        const x1 = x0 + 236 / 6;
        within(g, umbCanopy, () => {
          g.fillStyle = yellow;
          g.beginPath();
          g.moveTo(CX, -14);
          g.quadraticCurveTo(x0 + (CX - x0) * 0.3, 20, x0, 92);
          g.quadraticCurveTo((x0 + x1) / 2, 76, x1, 92);
          g.quadraticCurveTo(x1 + (CX - x1) * 0.3, 20, CX, -14);
          g.fill();
        });
      }
      within(g, umbCanopy, () => {
        texture(g, 'canvas', box, 0.25, 0.9);
        g.fillStyle = hgrad(g, CX - 118, CX + 118, [[0, rgba('#000000', 0.2)], [0.3, rgba('#ffffff', 0.15)], [0.6, rgba('#000000', 0)], [1, rgba('#000020', 0.35)]]);
        g.fillRect(box.x, box.y, box.w, box.h);
        // ribs
        for (let i = 1; i < 6; i++) {
          const x = CX - 118 + i * (236 / 6);
          crease(g, (c) => {
            c.moveTo(CX, -14);
            c.quadraticCurveTo(x + (CX - x) * 0.3, 20, x, 92);
          }, 1.6, '#0a1030', 0.4, 0.3);
        }
        // wet: beads running down the canopy
        const r = rng(hashStr('umbrella'));
        for (let i = 0; i < 20; i++) {
          const x = CX - 100 + r() * 200;
          const y = 10 + r() * 70;
          glint(g, x, y, 2 + r() * 2, 0.8);
        }
        spec(g, CX - 50, 20, 30, 10, 0.5, -0.5);
      });
      // the tip
      piece(g, ell(CX, -16, 5, 6), box, 'gold', '#d8b84a', { shadow: 0.3 });
    }, inkOf(blue));
  },
});

// ════════════════════════ Gym Bro Greg ════════════════════════
// Never skips calf day: a bronzed, oiled, vein-roped calf bulging over a striped crew sock and a neon trainer with a
// pink flash. In play he glistens (sweat drips and glints) and the calf pumps as he bulks.

registerStyle('gymbro', {
  contactY: 266,
  rig: { from: 210, to: 226 },
  leg: { kind: 'skin', hw: 52, join: 'blend', fade: 20 },
  draw(ctx, art, p) {
    const green = art.primary ?? '#39ff88';
    const pink = art.secondary ?? '#ff3dc8';
    const skin = art.skin;
    const flex = Math.max(0, p.curl);
    const calf: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 52, -6);
      c.bezierCurveTo(CX - 120, 20, CX - 124, 120, CX - 66, 150);
      c.lineTo(CX + 66, 150);
      c.bezierCurveTo(CX + 124, 120, CX + 120, 20, CX + 52, -6);
      c.closePath();
    };
    const sock = rrect(CX - 66, 138, 132, 56, 10);
    const shoeUp: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 78, 186);
      c.bezierCurveTo(CX - 104, 196, CX - 108, 238 - flex * 4, CX - 92, 248 - flex * 4);
      c.lineTo(CX + 96, 248 - flex * 4);
      c.bezierCurveTo(CX + 110, 238 - flex * 4, CX + 106, 196, CX + 78, 186);
      c.closePath();
    };
    const sole = rrect(CX - 104, 240 - flex * 4, 208, 24, 10);
    const box = { x: CX - 126, y: -10, w: 252, h: 280 };
    const sil = new Sil(ctx, [calf, sock, sole, shoeUp], box);
    const g = sil.g;
    // the calf: bronzed and oiled, two heads of the muscle, veins
    piece(g, calf, box, 'skin', skin, { shadow: 0 });
    within(g, calf, () => {
      texture(g, 'pores', box, 0.25, 1, 'soft-light');
      for (const s of [-1, 1]) {
        const head = ell(CX + s * 42, 70, 50, 62, s * 0.2);
        softFill(g, head, rgba(shade(skin, 0.18), 0.6), 6);
        ao(g, CX + s * 50, 128, 46, 14, 0.3, 0, '#5a2008');
      }
      softStroke(g, (c) => {
        c.moveTo(CX, 10);
        c.quadraticCurveTo(CX + 4, 70, CX, 140);
      }, rgba('#5a2008', 0.4), 8, 4);
      // veins
      for (const [x, d] of [[CX - 60, -1], [CX + 34, 1]] as const)
        softStroke(g, (c) => {
          c.moveTo(x, 10);
          c.bezierCurveTo(x + d * 10, 40, x - d * 8, 70, x + d * 6, 110);
          c.moveTo(x - d * 4, 60);
          c.quadraticCurveTo(x + d * 14, 72, x + d * 16, 92);
        }, rgba(mix(skin, '#4a2a6a', 0.4), 0.55), 4, 1);
      // the oil: hard specular streaks
      spec(g, CX - 60, 50, 12, 36, 0.85, 0.3);
      spec(g, CX + 20, 40, 8, 22, 0.6, 0.2);
      spec(g, CX - 40, 100, 20, 6, 0.6, -0.2);
    });
    // the crew sock: white rib with green and pink stripes
    piece(g, sock, box, 'knit', '#f8f8f4', { shadow: 0.5 });
    within(g, sock, () => {
      for (const [y, col] of [[150, green], [160, pink], [170, green]] as const) {
        g.fillStyle = col;
        g.fillRect(box.x, y, box.w, 5);
      }
      texture(g, 'knit', box, 0.5, 1.4);
    });
    // the trainer: neon mesh, a pink flash, a chunky white sole
    piece(g, sole, box, 'rubber', '#f4f4f0', { shadow: 0.5 });
    piece(g, shoeUp, box, 'canvas', green, { shadow: 0.5 });
    within(g, shoeUp, () => {
      texture(g, 'knit', box, 0.3, 1);
      const flash: PathFn = (c) => {
        c.beginPath();
        c.moveTo(CX - 90, 230);
        c.lineTo(CX - 20, 204);
        c.lineTo(CX - 30, 222);
        c.lineTo(CX + 60, 200);
        c.lineTo(CX - 4, 236);
        c.lineTo(CX + 4, 220);
        c.closePath();
      };
      piece(g, flash, box, 'plastic', pink, { shadow: 0.4 });
      // the laces' X straps
      for (const s of [-1, 1]) {
        g.strokeStyle = rgba('#ffffff', 0.9);
        g.lineWidth = 3.4;
        g.beginPath();
        g.moveTo(CX + s * 14, 192);
        g.lineTo(CX - s * 14, 210);
        g.stroke();
      }
      spec(g, CX - 50, 200, 30, 6, 0.5, -0.1);
    });
    finishLight(sil, skin, '#4a1a08', 0.25);
    sil.finish(inkOf(skin), { openTop: -5 });
  },
});

// ════════════════════════ Crabby Craig ════════════════════════
// Beach sandals with a real crab riding them: red shell straps over the instep, two claws gripping the sides and eyes
// on stalks peeking over. In play the claws snap open and shut, the eyes blink and look about, and the claws sway.

export const CLAW_PIV: [number, number][] = [
  [CX - 62, 104],
  [CX + 64, 104],
];

function claw(g: Ctx, side: -1 | 1, red: string, open: number): void {
  const [px, py] = CLAW_PIV[side < 0 ? 0 : 1];
  g.save();
  g.translate(px, py);
  // big enough to read as a crab at game size (the old claws were the foot's whole story)
  g.scale(1.6, 1.6);
  g.translate(-px, -py);
  const x0 = px + side * 22;
  const arm: PathFn = (c) => {
    c.beginPath();
    c.moveTo(px, py - 8);
    c.quadraticCurveTo(px + side * 14, py - 12, x0, py - 6);
    c.lineTo(x0, py + 8);
    c.quadraticCurveTo(px + side * 14, py + 10, px, py + 8);
    c.closePath();
  };
  const pincer = (top: boolean): PathFn => (c) => {
    c.save();
    c.translate(x0 + side * 4, py);
    c.rotate(side * (top ? -1 : 1) * (0.1 + open * 0.45));
    c.scale(side, top ? 1 : -1);
    c.beginPath();
    c.moveTo(-4, 0);
    c.bezierCurveTo(4, -22, 30, -22, 40, -4);
    c.quadraticCurveTo(28, -6, 18, -2);
    c.lineTo(-4, 4);
    c.closePath();
    c.restore();
  };
  const box = { x: Math.min(px, x0 + side * 48) - 6, y: py - 34, w: 64, h: 68 };
  prop(g, [arm, pincer(true), pincer(false)], box, (pg, sil) => {
    sil.form({ base: red, shadowTint: '#3a0408', ramp: 0.85, form: 0.5, formSize: 9, bevel: 0.45, rim: 0.55 });
    texture(pg, 'speckle', box, 0.2, 1);
    for (const top of [true, false]) {
      within(pg, pincer(top), () => {
        pg.fillStyle = rgba('#ffd9b0', 0.6);
        pg.fillRect(box.x, top ? py - 2 : py, box.w, 4);
      });
    }
    spec(pg, x0 + side * 14, py - 10, 8, 3, 0.7, -0.2 * side);
  }, inkOf(red), { w: 2.6 });
  g.restore();
}

export const CRAB_EYES = { y: 22, dx: 26 };
function crabEyes(g: Ctx, blink: number, red: string): void {
  const { y, dx } = CRAB_EYES;
  for (const s of [-1, 1]) {
    const x = CX + s * dx;
    prop(g, [rrect(x - 4, y, 8, 36, 4), ell(x, y, 12, 13)], { x: x - 14, y: y - 15, w: 28, h: 54 }, (pg, sil) => {
      sil.form({ base: red, shadowTint: '#3a0408', ramp: 0.8, form: 0.5, formSize: 4, bevel: 0.4, rim: 0.5 });
      beadEye(pg, x, y, 9.5, 10.5, '#3a2a10');
      if (blink > 0) {
        pg.fillStyle = vgrad(pg, y - 14, y + 14, [[0, shade(red, 0.15)], [1, shade(red, -0.2)]]);
        pg.fillRect(x - 13, y - 14, 26, 28 * blink);
      }
    }, inkOf(red), { w: 3 });
  }
}

registerStyle('crabby', {
  rig: BARE_RIG,
  halfWidth: 112,
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 22 },
  parts: {
    clawL: { box: { x: CLAW_PIV[0][0] - 112, y: CLAW_PIV[0][1] - 56, w: 120, h: 112 }, frames: 2, pivot: CLAW_PIV[0], draw: (g, art, i) => claw(g, -1, art.primary ?? '#e5442a', i ? 1 : 0.3) },
    clawR: { box: { x: CLAW_PIV[1][0] - 8, y: CLAW_PIV[1][1] - 56, w: 120, h: 112 }, frames: 2, pivot: CLAW_PIV[1], draw: (g, art, i) => claw(g, 1, art.primary ?? '#e5442a', i ? 1 : 0.3) },
    eyes: { box: { x: CX - CRAB_EYES.dx - 18, y: CRAB_EYES.y - 18, w: CRAB_EYES.dx * 2 + 36, h: 62 }, frames: 4, draw: (g, art, i) => crabEyes(g, i / 3, art.primary ?? '#e5442a') },
  },
  draw(ctx, art, p, o) {
    const red = art.primary ?? '#e5442a';
    if (!o.live) for (const s of [-1, 1] as const) claw(ctx, s, red, 0.3);
    bareWith(ctx, { skin: art.skin, nails: art.nails }, p, (g, f) => {
      // the sandal: a red sole under the foot, two shell straps over the top
      for (const [y, w] of [[62, 16], [134, 20]] as const) {
        const strap: PathFn = (c) => {
          c.beginPath();
          c.moveTo(CX - 120, y);
          c.quadraticCurveTo(CX, y + 16, CX + 120, y);
          c.lineTo(CX + 120, y + w);
          c.quadraticCurveTo(CX, y + w + 16, CX - 120, y + w);
          c.closePath();
        };
        piece(g, strap, f.box, 'enamel', red, { shadow: 0.55 });
        within(g, strap, () => {
          // shell bumps
          for (let x = CX - 90; x <= CX + 90; x += 18) {
            spec(g, x, y + w * 0.45 + 8 * (1 - ((x - CX) / 120) ** 2), 4, 2.5, 0.5);
            ao(g, x + 3, y + w * 0.7 + 8 * (1 - ((x - CX) / 120) ** 2), 4, 2, 0.25);
          }
        });
      }
      g.fillStyle = vgrad(g, 240, 268, [[0, rgba(red, 0)], [1, rgba(shade(red, -0.3), 0.6)]]);
      g.fillRect(f.box.x, 240, f.box.w, 30);
    });
    if (!o.live) crabEyes(ctx, 0, red);
  },
});

// ════════════════════════ Lifeguard Lou ════════════════════════
// On duty: a red rescue sandal (a padded strap with a white cross and a red foam sole), a silver whistle on a cord and
// a stripe of sunscreen across the toes. In play the whistle swings on its cord and sun glints off it.

export const WHISTLE_PIV: [number, number] = [CX + 40, 36];
function whistle(g: Ctx): void {
  const [px, py] = WHISTLE_PIV;
  g.save();
  g.lineCap = 'round';
  g.strokeStyle = '#ffffff';
  g.lineWidth = 2.4;
  g.beginPath();
  g.moveTo(px, py);
  g.quadraticCurveTo(px + 10, py + 18, px + 14, py + 34);
  g.stroke();
  g.restore();
  const body: PathFn = (c) => {
    c.beginPath();
    c.ellipse(px + 18, py + 46, 12, 10, 0, 0, Math.PI * 2);
    c.rect(px + 18, py + 36, 24, 9);
  };
  prop(g, [body], { x: px + 2, y: py + 30, w: 44, h: 30 }, (pg, sil) => {
    sil.form({ base: '#c8ced8', shadowTint: '#1a2030', ramp: 1, form: 0.6, formSize: 6, bevel: 0.6, rim: 0.7 });
    pg.fillStyle = '#1a1e28';
    pg.beginPath();
    pg.ellipse(px + 18, py + 46, 4, 3.5, 0, 0, Math.PI * 2);
    pg.fill();
    glint(pg, px + 12, py + 41, 3, 1);
  }, inkOf('#8a929c'), { w: 3 });
}

registerStyle('lifeguard', {
  rig: BARE_RIG,
  contactY: 264,
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 22 },
  parts: { whistle: { box: { x: WHISTLE_PIV[0] - 4, y: WHISTLE_PIV[1] - 4, w: 52, h: 66 }, frames: 1, pivot: WHISTLE_PIV, draw: (g) => whistle(g) } },
  draw(ctx, art, p, o) {
    const red = art.primary ?? '#e5242f';
    const white = art.secondary ?? '#ffffff';
    // the foam sole under the toes
    prop(ctx, [rrect(CX - 100, 236, 200, 30, 12)], { x: CX - 104, y: 232, w: 208, h: 38 }, (g, sil) => {
      sil.form({ base: red, shadowTint: '#3a0408', ramp: 0.7, form: 0.5, formSize: 8, bevel: 0.3, rim: 0.4 });
      texture(g, 'rubber', { x: CX - 104, y: 232, w: 208, h: 38 }, 0.4);
      g.fillStyle = white;
      g.fillRect(CX - 100, 252, 200, 3);
    }, inkOf(red));
    bareWith(ctx, { skin: art.skin, nails: art.nails }, p, (g, f) => {
      // a cord anklet with red beads
      for (let i = 0; i < 9; i++) {
        const t = i / 8;
        const x = CX - 52 + t * 104;
        const y = 36 + Math.sin(t * Math.PI) * 10;
        piece(g, ell(x, y, 3.4, 3.4), f.box, 'plastic', i % 2 ? red : white, { shadow: 0.4 });
      }
      // sunscreen streaks across the toes
      for (const t of f.toes.slice(1, 4)) {
        const [x, y] = onToe(t, -Math.PI / 2);
        softFill(g, ell(x, y + t.ry * 0.8, t.rx * 0.7, 3), rgba('#ffffff', 0.85), 1.2);
      }
      // the padded strap with its white cross
      const strap: PathFn = (c) => {
        c.beginPath();
        c.moveTo(CX - 120, 124);
        c.quadraticCurveTo(CX, 136, CX + 120, 124);
        c.lineTo(CX + 120, 172);
        c.quadraticCurveTo(CX, 184, CX - 120, 172);
        c.closePath();
      };
      piece(g, strap, f.box, 'leather', red, { shadow: 0.6 });
      within(g, strap, () => {
        stitches(g, (c) => {
          c.moveTo(CX - 120, 130);
          c.quadraticCurveTo(CX, 142, CX + 120, 130);
          c.moveTo(CX - 120, 166);
          c.quadraticCurveTo(CX, 178, CX + 120, 166);
        }, rgba('#ffffff', 0.85), 1.3, 4, 3);
        const cross: PathFn = (c) => {
          c.beginPath();
          const pts = [[-9, 132], [9, 132], [9, 146], [24, 146], [24, 164], [9, 164], [9, 178], [-9, 178], [-9, 164], [-24, 164], [-24, 146], [-9, 146]];
          pts.forEach(([x, y], i) => (i ? c.lineTo(CX + x, y) : c.moveTo(CX + x, y)));
          c.closePath();
        };
        piece(g, cross, { x: CX - 24, y: 132, w: 48, h: 46 }, 'plastic', white, { shadow: 0.45 });
      });
    });
    if (!o.live) whistle(ctx);
  },
});

// ════════════════════════ Surf's Up Sully ════════════════════════
// Sun-bronzed with teal nail polish, a braided anklet with a chain, and his orange surfboard tucked behind. In play
// spray flicks off the board as he carves and drips fall from his toes.

registerStyle('surfsully', {
  rig: BARE_RIG,
  halfWidth: 108,
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 22 },
  draw(ctx, art, p) {
    const orange = art.primary ?? '#ff7a3c';
    const teal = art.secondary ?? '#36d6c3';
    // the board behind the foot, on the diagonal
    const board: PathFn = (c) => {
      c.save();
      c.translate(CX + 6, 150);
      c.rotate(-0.72);
      c.beginPath();
      c.moveTo(0, -190);
      c.bezierCurveTo(34, -150, 38, 100, 24, 186);
      c.quadraticCurveTo(0, 198, -24, 186);
      c.bezierCurveTo(-38, 100, -34, -150, 0, -190);
      c.closePath();
      c.restore();
    };
    prop(ctx, [board], { x: CX - 170, y: -10, w: 340, h: 320 }, (g, sil) => {
      sil.form({ base: orange, shadowTint: '#5a1008', ramp: 0.8, form: 0.45, formSize: 12, bevel: 0.5, rim: 0.6 });
      within(g, board, () => {
        g.save();
        g.translate(CX + 6, 150);
        g.rotate(-0.72);
        g.fillStyle = '#ffffff';
        g.fillRect(-1.5, -190, 3, 380);
        g.fillStyle = teal;
        g.fillRect(-40, 90, 80, 9);
        g.fillRect(-40, 106, 80, 5);
        g.restore();
        spec(g, CX - 60, 120, 60, 6, 0.6, -0.72);
      });
    }, inkOf(orange));
    bareWith(ctx, { skin: art.skin, nails: art.nails }, p, (g, f) => {
      // tan lines and a salty sheen
      spec(g, CX - 40, 120, 40, 20, 0.3, -0.4);
      const r = rng(hashStr('surf'));
      for (let i = 0; i < 60; i++) {
        g.fillStyle = rgba('#ffffff', 0.35 + r() * 0.4);
        g.beginPath();
        g.arc(f.box.x + 20 + r() * (f.box.w - 40), 60 + r() * 190, 0.5 + r() * 0.8, 0, Math.PI * 2);
        g.fill();
      }
      // the braided anklet and its chain of rings
      g.save();
      g.lineCap = 'round';
      for (let i = 0; i < 12; i++) {
        const t = i / 11;
        const x = CX - 54 + t * 108;
        const y = 30 + Math.sin(t * Math.PI) * 12;
        piece(g, ell(x, y, 5.5, 3.6, 0.6), f.box, 'canvas', teal, { shadow: 0.4 });
      }
      for (let i = 0; i < 7; i++) {
        const x = CX + 54 + i * 3;
        const y = 34 + i * 11;
        g.strokeStyle = '#2a2e36';
        g.lineWidth = 3.6;
        g.beginPath();
        g.ellipse(x, y, 3.4, 5.4, 0.3, 0, Math.PI * 2);
        g.stroke();
        g.strokeStyle = teal;
        g.lineWidth = 2;
        g.stroke();
      }
      g.restore();
    });
  },
});

export { finishLight, lobe, rivet };
