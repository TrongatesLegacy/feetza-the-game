// Batch D, part 3: Act 8 (Norse): Frost Giant Toes, Draugr Boots, Troll Feet, Valkyrie-Cursed Clogs and the act's
// bosses (Thrym the Frost King, Surtr the Fire Giant, Fenrir's Paw, Jörmungandr), redrawn in the style kit. Life in
// play: src/content/styleLive/acts-d.ts.

import type { FootArt } from '../../data/feet';
import { CX } from '../../art/feetCommon';
import { type StyleToe, onToe } from '../../art/style/anatomy';
import { LIGHT, type PathFn, type Pose, ao, crease, glint, inkOf, pxPerUnit, softFill, softStroke, spec, texture, vnoise } from '../../art/style/kit';
import { Sil, lobe } from '../../art/style/sil';
import { type PartDef, registerStyle } from '../../art/style/registry';
import { beadEye, blotches, clawPath, contact, paintClaw, rivet, stitches } from '../../art/style/details';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';
import { lockPath as wolfLock } from './pilot-fur';
import { BARE_RIG, bareWith, ell, finishLight, hgrad, piece, prop, rrect, vgrad, within } from './roster-kit';
import { DMAT, LX, LY, carvedRune, furCoat, glowOnly, heatRise, hoarfrost, hotLine, iciclePath, oneLight, paintIcicle } from './acts-d-kit';

type Opts = { live: boolean; emissive?: boolean; heat?: boolean };

// ════════════════════════ Frost Giant Toes ════════════════════════
// A giant's bare foot in cold blue skin, toes like boulders, crusted with hoarfrost, frost on the nails and icicles
// hanging off the toe tips. In play freezing mist pours off it and sinks, snowflakes drift round it, frost glints
// and the toes flex.

const GIANT = { w: 16, ankle: 58, toe: 1.16, toeLen: 0.92, ball: 1.06, shadowTint: '#0a1a5a', pores: 0.32, detail: 0.85 };

function giantIcicles(toes: StyleToe[]): { x: number; y: number; len: number; w: number; lean: number }[] {
  const r = rng(hashStr('giant-ice'));
  const out: { x: number; y: number; len: number; w: number; lean: number }[] = [];
  toes.forEach((t, i) => {
    const n = i === 4 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const a = Math.PI / 2 + (k - (n - 1) / 2) * 0.55;
      const [x, y] = onToe(t, a);
      out.push({ x, y: y - 4, len: 12 + r() * 14 + (i === 4 ? 6 : 0), w: 6 + r() * 4, lean: (r() - 0.5) * 4 });
    }
  });
  return out;
}

registerStyle('frostgiant', {
  contactY: 262,
  halfWidth: 116,
  rig: BARE_RIG,
  leg: { kind: 'skin', hw: 58, join: 'blend', fade: 24 },
  draw(ctx, art, p, o) {
    if (o.emissive || o.heat) return;
    const skin = art.skin;
    const f = bareWith(ctx, { ...GIANT, skin, nails: mix(art.nails ?? '#e8f6ff', '#5aa8e0', 0.35) }, p, (g, ft) => {
      const r = rng(hashStr('giant-frost'));
      // boulder toes: a stony grain over the knuckles, deep cold in the clefts
      texture(g, 'cast', ft.box, 0.35, 1.4, 'soft-light');
      blotches(g, ft.box, '#1a3a7a', 0.3, 30, 0.5, 0.3, 91, 'multiply');
      // the deep cold in the shaded side and round the sole
      const cold = g.createLinearGradient(CX - 100, 0, CX + 120, 0);
      cold.addColorStop(0, rgba('#0a2a6a', 0.1));
      cold.addColorStop(0.5, rgba('#0a2a6a', 0));
      cold.addColorStop(1, rgba('#0a1a5a', 0.35));
      g.fillStyle = cold;
      g.fillRect(ft.box.x, ft.box.y, ft.box.w, ft.box.h);
      // cold blue veins
      for (const x of [-30, 10, 40]) {
        softStroke(g, (c) => {
          c.moveTo(CX + x, 30);
          c.bezierCurveTo(CX + x - 10, 80, CX + x + 14, 120, CX + x * 1.4, 170);
        }, rgba('#3a5ac8', 0.18), 3, 1.4);
      }
      // hoarfrost: a crust on the top of the foot and over the toes, thickest where the cold settles
      hoarfrost(g, { x: CX - 110, y: -30, w: 220, h: 120 }, r, 0.45, 93, 40, 0.2, 0.6);
      hoarfrost(g, { x: CX - 120, y: 180, w: 240, h: 50 }, r, 0.3, 95, 30, 0.5, 0.3);
      // each boulder toe: cold in the clefts, a snow cap on its knuckle, lit on its crown
      for (let i = 0; i < ft.toes.length - 1; i++) {
        const a = ft.toes[i];
        const b = ft.toes[i + 1];
        ao(g, (a.cx + a.rx * 0.85 + b.cx - b.rx * 0.85) / 2, Math.max(a.cy, b.cy) + 4, 9, 28, 0.75, 0, '#06123a');
      }
      for (const t of ft.toes) {
        const [kx, ky] = onToe(t, -Math.PI / 2);
        softFill(g, ell(kx - t.rx * 0.1, ky + t.ry * 0.42, t.rx * 0.55, t.ry * 0.16, t.rot), rgba('#ffffff', 0.6), 2.4);
        ao(g, t.cx + t.rx * 0.3, t.cy + t.ry * 0.45, t.rx * 0.7, t.ry * 0.4, 0.35, t.rot, '#06123a');
        spec(g, t.cx - t.rx * 0.3, t.cy, t.rx * 0.45, t.ry * 0.3, 0.35, -0.5, '#e8f8ff');
      }
      spec(g, CX - 40, 60, 40, 24, 0.3, -0.4, '#e8f8ff');
    }, inkOf(mix(skin, '#1a3a7a', 0.4)));
    // icicles off the toe tips, their own little silhouettes in front
    for (const ic of giantIcicles(f.toes)) {
      prop(ctx, [iciclePath(ic.x, ic.y, ic.len, ic.w, ic.lean)], { x: ic.x - ic.w, y: ic.y - 4, w: ic.w * 2, h: ic.len + 8 }, (g) => paintIcicle(g, ic.x, ic.y, ic.len, ic.w, ic.lean), '#3a6a9a', { w: 1.6, inner: 0.2 });
    }
  },
});

// ════════════════════════ Draugr Boots ════════════════════════
// A barrow-wight's iron-shod boot of rotted leather, bound in grave cloth with a cord, caked in barrow earth, with
// blue grave-fire burning in its eyelets and a loose end of cloth trailing. In play the grave-fire flickers and
// wisps up, earth crumbs fall, and the loose cloth swings.

const DRAUGR_EYELETS: [number, number][] = [[CX - 30, 40], [CX + 30, 40], [CX - 34, 80], [CX + 34, 80], [CX - 38, 120], [CX + 38, 120]];
export { DRAUGR_EYELETS };
export const DRAUGR_TAIL: [number, number] = [CX + 96, 140];

const draugrUpper = (flex: number): PathFn => (c) => {
  const b = 242 - flex * 6;
  c.beginPath();
  c.moveTo(CX - 60, -6);
  c.bezierCurveTo(CX - 64, 60, CX - 100, 110, CX - 100, 168);
  c.bezierCurveTo(CX - 100, b - 14, CX - 62, b, CX, b);
  c.bezierCurveTo(CX + 62, b, CX + 102, b - 14, CX + 102, 168);
  c.bezierCurveTo(CX + 100, 110, CX + 64, 60, CX + 60, -6);
  c.closePath();
};

const draugrSole = (flex: number): PathFn => (c) => {
  const b = 262 - flex * 5;
  c.beginPath();
  c.moveTo(CX - 104, 196);
  c.bezierCurveTo(CX - 108, 236, CX - 92, b, CX - 60, b);
  c.lineTo(CX + 60, b);
  c.bezierCurveTo(CX + 92, b, CX + 110, 236, CX + 106, 196);
  c.closePath();
};

function draugrTail(g: Ctx, cloth: string): void {
  const [x, y] = DRAUGR_TAIL;
  const tail: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 6, y - 6);
    c.bezierCurveTo(x + 14, y + 10, x + 2, y + 40, x + 18, y + 70);
    c.lineTo(x + 26, y + 84);
    c.lineTo(x + 30, y + 66);
    c.bezierCurveTo(x + 18, y + 40, x + 30, y + 14, x + 8, y - 8);
    c.closePath();
  };
  prop(g, [tail], { x: x - 10, y: y - 10, w: 44, h: 100 }, (tg, sil) => {
    sil.form({ base: cloth, shadowTint: '#3a3020', ramp: 0.7, form: 0.5, formSize: 8, bevel: 0.25, rim: 0.4 });
    texture(tg, 'canvas', { x: x - 10, y: y - 10, w: 44, h: 100 }, 0.45, 0.8);
    blotches(tg, { x: x - 10, y: y - 10, w: 44, h: 100 }, '#4a3a20', 0.45, 8, 0.5, 0.2, 97);
  }, inkOf(cloth), { w: 2.4 });
}

function drawDraugr(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const leather = art.primary ?? '#4a4f4c';
  const fire = art.secondary ?? '#7fe8ff';
  const cloth = art.legColor ?? '#b8ae94';
  const flex = Math.max(0, p.curl);
  const upper = draugrUpper(flex);
  const sole = draugrSole(flex);
  const box = { x: CX - 116, y: -10, w: 232, h: 280 };
  const parts = [sole, upper];
  if (o.emissive) {
    glowOnly(ctx, parts, box, (g) => {
      for (const [x, y] of DRAUGR_EYELETS) {
        const eg = g.createRadialGradient(x, y, 0.5, x, y, 14);
        eg.addColorStop(0, rgba('#ffffff', 1));
        eg.addColorStop(0.3, rgba(fire, 0.9));
        eg.addColorStop(1, rgba(fire, 0));
        g.fillStyle = eg;
        g.fillRect(x - 15, y - 15, 30, 30);
      }
    });
    return;
  }
  if (o.heat) return;
  if (!o.live) draugrTail(ctx, cloth);
  const sil = new Sil(ctx, parts, box);
  const g = sil.g;
  // the iron-shod sole: black iron, hob nails, rust
  within(g, sole, () => {
    g.fillStyle = vgrad(g, 196, 262, [[0, '#3a3a3e'], [1, '#101012']]);
    g.fillRect(box.x, 190, box.w, 80);
    texture(g, 'cast', box, 0.5, 1.2);
    blotches(g, { x: box.x, y: 196, w: box.w, h: 70 }, '#6a3a1a', 0.5, 9, 0.6, 0.15, 99);
    for (let i = 0; i < 10; i++) rivet(g, CX - 78 + i * 17.3, 254 - flex * 5, 2.6, '#8a8a92');
  });
  // the rotted leather
  piece(g, upper, box, 'leather', leather, { shadow: 0.4, size: 16, texA: 0.3 });
  within(g, upper, () => {
    blotches(g, box, '#1a2018', 0.4, 18, 0.55, 0.2, 101);
    blotches(g, box, '#6a7a6a', 0.25, 10, 0.65, 0.1, 103);
    // grave cloth: bandage strips wound across the boot, overlapping
    const r = rng(hashStr('draugr-wrap'));
    for (let i = 0; i < 6; i++) {
      const y = 10 + i * 30 + (r() - 0.5) * 6;
      const tilt = (i % 2 ? -1 : 1) * (10 + r() * 8);
      const strip: PathFn = (c) => {
        c.beginPath();
        c.moveTo(CX - 120, y + tilt);
        c.quadraticCurveTo(CX, y + 10, CX + 120, y - tilt);
        c.lineTo(CX + 120, y - tilt + 17);
        c.quadraticCurveTo(CX, y + 27, CX - 120, y + tilt + 17);
        c.closePath();
      };
      if (i === 3 || i === 5) continue;
      piece(g, strip, box, 'linen', mix(cloth, '#8a8070', r() * 0.4), { shadow: 0.55, size: 5, texA: 0.35 });
      within(g, strip, () => {
        blotches(g, { x: box.x, y: y - 20, w: box.w, h: 50 }, '#4a3a20', 0.5, 8, 0.52, 0.2, 105 + i);
        // frayed holes
        blotches(g, { x: box.x, y: y - 20, w: box.w, h: 50 }, shade(leather, -0.3), 0.8, 4, 0.75, 0.02, 111 + i);
      });
    }
    // the cord, criss-crossed through the eyelets
    g.save();
    g.lineCap = 'round';
    for (let i = 0; i < DRAUGR_EYELETS.length - 2; i += 2) {
      const [ax, ay] = DRAUGR_EYELETS[i];
      const [bx, by] = DRAUGR_EYELETS[i + 3];
      const [cx2, cy2] = DRAUGR_EYELETS[i + 1];
      const [dx, dy] = DRAUGR_EYELETS[i + 2];
      for (const [x0, y0, x1, y1] of [[ax, ay, bx, by], [cx2, cy2, dx, dy]]) {
        softStroke(g, (c) => {
          c.moveTo(x0 + 2, y0 + 3);
          c.lineTo(x1 + 2, y1 + 3);
        }, rgba('#000000', 0.5), 5, 1.5);
        g.strokeStyle = '#3a2e20';
        g.lineWidth = 3.4;
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        g.stroke();
        g.strokeStyle = rgba('#a89070', 0.5);
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x0 - 0.8, y0 - 0.8);
        g.lineTo(x1 - 0.8, y1 - 0.8);
        g.stroke();
      }
    }
    g.restore();
    // eyelets: iron rings round a blue grave-fire
    for (const [x, y] of DRAUGR_EYELETS) {
      contact(g, (c) => {
        c.beginPath();
        c.arc(x, y, 7, 0, Math.PI * 2);
        c.fill();
      }, 0.5);
      g.fillStyle = hgrad(g, x - 7, x + 7, [[0, '#8a8a92'], [1, '#1a1a1e']]);
      g.beginPath();
      g.arc(x, y, 7, 0, Math.PI * 2);
      g.fill();
      const fg = g.createRadialGradient(x, y, 0.5, x, y, 4.6);
      fg.addColorStop(0, '#ffffff');
      fg.addColorStop(0.4, fire);
      fg.addColorStop(1, shade(fire, -0.6));
      g.fillStyle = fg;
      g.beginPath();
      g.arc(x, y, 4.6, 0, Math.PI * 2);
      g.fill();
    }
    // the barrow earth caked over the toe: dark soil, pebbles, a root
    const earth: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 104, 196);
      c.bezierCurveTo(CX - 70, 180, CX - 40, 196, CX - 10, 186);
      c.bezierCurveTo(CX + 30, 176, CX + 60, 196, CX + 104, 186);
      c.lineTo(CX + 104, 250);
      c.lineTo(CX - 104, 250);
      c.closePath();
    };
    piece(g, earth, box, 'stone', '#5a3e28', { shadow: 0.5, size: 8, texA: 0.4 });
    within(g, earth, () => {
      blotches(g, { x: box.x, y: 176, w: box.w, h: 80 }, '#2a1a10', 0.6, 9, 0.5, 0.2, 117);
      for (let i = 0; i < 18; i++) {
        const x = CX - 96 + r() * 192;
        const y = 196 + r() * 44;
        const rr = 2 + r() * 3.5;
        piece(g, ell(x, y, rr, rr * 0.8), { x: x - rr, y: y - rr, w: rr * 2, h: rr * 2 }, 'stone', r() < 0.5 ? '#8a8070' : '#6a6458', { shadow: 0.5, size: 1.5 });
      }
      softStroke(g, (c) => {
        c.moveTo(CX + 30, 192);
        c.bezierCurveTo(CX + 40, 210, CX + 20, 220, CX + 34, 236);
      }, rgba('#2a1a0a', 0.8), 2.4, 0.4);
    });
  });
  oneLight(sil, '#06080a', 0.45, 18);
  sil.finish(inkOf(leather), { openTop: -5 });
}

registerStyle('draugr', {
  contactY: 262,
  halfWidth: 104,
  rig: { from: 200, to: 218 },
  leg: { kind: 'wool', hw: 58, join: 'into' },
  parts: { tail: { box: { x: DRAUGR_TAIL[0] - 14, y: DRAUGR_TAIL[1] - 14, w: 52, h: 108 }, frames: 1, pivot: DRAUGR_TAIL, draw: (g, art) => draugrTail(g, art.legColor ?? '#b8ae94') } },
  draw(ctx, art, p, o) {
    drawDraugr(ctx, art, p, o);
  },
});

// ════════════════════════ Troll Feet ════════════════════════
// A troll's warty green foot, moss growing over the top with a red toadstool in it, hairy knuckles and huge dark
// horny nails. In play flies circle it, the toadstool nods, spores drift off the moss and the toes flex.

const TROLL = { w: 12, ankle: 54, toe: 1.12, toeLen: 0.86, ball: 1.04, shadowTint: '#1a3010', pores: 0.5, detail: 0.5 };
export const SHROOM: [number, number] = [CX + 50, 34];

function toadstool(g: Ctx): void {
  const [x, y] = SHROOM;
  const stem: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 6, y + 4);
    c.quadraticCurveTo(x - 8, y - 14, x - 4, y - 24);
    c.lineTo(x + 4, y - 24);
    c.quadraticCurveTo(x + 8, y - 14, x + 6, y + 4);
    c.closePath();
  };
  const cap: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 22, y - 20);
    c.bezierCurveTo(x - 22, y - 44, x + 22, y - 44, x + 22, y - 20);
    c.quadraticCurveTo(x, y - 14, x - 22, y - 20);
    c.closePath();
  };
  const box = { x: x - 24, y: y - 46, w: 48, h: 54 };
  prop(g, [stem, cap], box, (sg) => {
    piece(sg, stem, box, 'linen', '#f4ecd8', { shadow: 0, size: 3 });
    piece(sg, cap, box, 'plastic', '#d8302a', { shadow: 0.5, size: 6 });
    for (const [dx, dy, rr] of [[-10, -32, 3.4], [4, -36, 2.6], [12, -26, 2.8], [-2, -26, 2]] as const) {
      sg.fillStyle = '#fff6e8';
      sg.beginPath();
      sg.ellipse(x + dx, y + dy, rr, rr * 0.75, 0, 0, Math.PI * 2);
      sg.fill();
    }
    ao(sg, x, y - 18, 16, 3, 0.5);
  }, '#3a1008', { w: 2.4 });
}

registerStyle('troll', {
  contactY: 266,
  halfWidth: 112,
  rig: BARE_RIG,
  leg: { kind: 'skin', hw: 54, join: 'blend', fade: 24 },
  parts: { shroom: { box: { x: SHROOM[0] - 28, y: SHROOM[1] - 50, w: 56, h: 60 }, frames: 1, pivot: SHROOM, draw: (g) => toadstool(g) } },
  draw(ctx, art, p, o) {
    if (o.emissive || o.heat) return;
    const skin = art.skin;
    const moss = art.primary ?? '#6b7a45';
    bareWith(ctx, { ...TROLL, skin, nails: mix(art.nails ?? '#3c3a30', art.secondary ?? '#c9b47a', 0.55) }, p, (g, f) => {
      const r = rng(hashStr('troll'));
      blotches(g, f.box, '#3a4a1a', 0.3, 22, 0.52, 0.25, 121, 'multiply');
      // warts: raised, lit bumps with a dark pore
      for (let i = 0; i < 30; i++) {
        const x = CX - 90 + r() * 190;
        const y = 20 + r() * 170;
        const rr = 3 + r() * 6;
        ao(g, x + rr * 0.4, y + rr * 0.6, rr * 1.4, rr, 0.55, 0, '#0a1a04');
        spec(g, x - rr * 0.3, y - rr * 0.35, rr, rr * 0.85, 0.45, -0.5, LIGHT.key);
        if (r() < 0.4) {
          g.fillStyle = rgba('#1a2008', 0.7);
          g.beginPath();
          g.arc(x + 0.5, y + 0.5, 0.9, 0, Math.PI * 2);
          g.fill();
        }
      }
      // moss over the top of the foot: a soft cushion of tiny fronds, darker in the hollows
      const mossArea: PathFn = (c) => {
        c.beginPath();
        for (let i = 0; i <= 24; i++) {
          const a = (i / 24) * Math.PI * 2;
          const rr = 1 + (Math.sin(a * 3 + 1) * 0.12 + Math.sin(a * 7) * 0.08);
          const x = CX - 8 + Math.cos(a) * 74 * rr;
          const y = 34 + Math.sin(a) * 32 * rr;
          if (i) c.lineTo(x, y);
          else c.moveTo(x, y);
        }
        c.closePath();
      };
      softFill(g, mossArea, rgba('#0a1a04', 0.35), 5);
      within(g, mossArea, () => {
        g.fillStyle = shade(moss, -0.35);
        g.fillRect(CX - 90, -6, 180, 90);
        furCoat(g, r, { x: CX - 86, y: -6, w: 170, h: 76 }, moss, 700, 6, () => -Math.PI / 2, '#0a1a04');
        const ml = g.createLinearGradient(CX - 80, 0, CX + 70, 70);
        ml.addColorStop(0, rgba('#e8ff9a', 0.25));
        ml.addColorStop(0.5, rgba('#e8ff9a', 0));
        ml.addColorStop(1, rgba('#0a1a04', 0.35));
        g.fillStyle = ml;
        g.fillRect(CX - 90, -6, 180, 90);
      });
      ao(g, CX - 8, 58, 70, 10, 0.3, 0, '#0a1a04');
      // hairy knuckles
      g.save();
      g.lineCap = 'round';
      for (const t of f.toes) {
        const [kx, ky] = onToe(t, -Math.PI / 2);
        for (let j = 0; j < 14; j++) {
          const x = kx + (r() - 0.5) * t.rx * 1.2;
          const y = ky + t.ry * 0.5 + r() * 8;
          g.strokeStyle = rgba(r() < 0.5 ? '#1a1a0a' : '#3a3018', 0.8);
          g.lineWidth = 1 + r();
          g.beginPath();
          g.moveTo(x, y);
          g.quadraticCurveTo(x + (r() - 0.5) * 6, y + 5, x + (r() - 0.5) * 8, y + 9 + r() * 5);
          g.stroke();
        }
      }
      g.restore();
    }, inkOf(mix(skin, '#1a2a08', 0.4)));
    if (!o.live) toadstool(ctx);
  },
});

// ════════════════════════ Valkyrie-Cursed Clogs ════════════════════════
// A carved wooden clog in honey wood, a gold band and a burnt-in rune, swan wings sprouting from its sides. In play
// the wings beat fast, a white feather drifts loose now and then and gold motes trail behind it.

const CLOG = (flex: number): PathFn => (c) => {
  const b = 262 - flex * 6;
  c.beginPath();
  c.moveTo(CX - 62, -6);
  c.bezierCurveTo(CX - 66, 40, CX - 96, 80, CX - 98, 150);
  c.bezierCurveTo(CX - 100, b - 30, CX - 70, b, CX, b);
  c.bezierCurveTo(CX + 70, b, CX + 100, b - 30, CX + 98, 150);
  c.bezierCurveTo(CX + 96, 80, CX + 66, 40, CX + 62, -6);
  c.closePath();
};

export const VWINGS = [
  { s: -1, root: [CX - 78, 80] as [number, number] },
  { s: 1, root: [CX + 78, 80] as [number, number] },
];

function swanWing(g: Ctx, s: number, rx: number, ry: number, white: string): void {
  // five primaries fanning out and up, overlapped by a row of coverts
  const feathers: PathFn[] = [];
  const feather = (ang: number, len: number, w: number): PathFn => (c) => {
    c.save();
    c.translate(rx, ry);
    c.rotate(ang);
    c.beginPath();
    c.moveTo(0, -w * 0.4);
    c.quadraticCurveTo(len * 0.6, -w * 0.7, len, 0);
    c.quadraticCurveTo(len * 0.6, w * 0.6, 0, w * 0.4);
    c.closePath();
    c.restore();
  };
  const base = s < 0 ? Math.PI : 0;
  for (let i = 0; i < 5; i++) {
    const a = base - s * (0.05 + i * 0.2);
    feathers.push(feather(a, 72 - i * 5, 22));
  }
  const coverts = feather(base - s * 0.42, 44, 38);
  const box = { x: rx - 80, y: ry - 80, w: 160, h: 120 };
  prop(g, [...feathers, coverts], box, (wg) => {
    feathers.forEach((fp, i) => {
      piece(wg, fp, box, 'linen', shade(white, -i * 0.03), { shadow: 0.45, size: 5, texA: 0.15 });
      const a = base - s * (0.05 + i * 0.2);
      wg.save();
      wg.translate(rx, ry);
      wg.rotate(a);
      wg.strokeStyle = rgba('#a8a090', 0.7);
      wg.lineWidth = 1.1;
      wg.beginPath();
      wg.moveTo(4, 0);
      wg.lineTo(66 - i * 5, 0);
      wg.stroke();
      wg.restore();
    });
    piece(wg, coverts, box, 'plush', white, { shadow: 0.5, size: 8, texA: 0.25 });
    ao(wg, rx, ry, 12, 10, 0.5);
  }, inkOf(mix(white, '#8a7a6a', 0.5)), { w: 2.4 });
}

function drawValkyrie(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const wood = art.primary ?? '#c98a3a';
  const white = art.secondary ?? '#f4f1e8';
  const gold = art.legAccent ?? '#f2c14e';
  const flex = Math.max(0, p.curl);
  if (o.emissive || o.heat) return;
  if (!o.live) for (const w of VWINGS) swanWing(ctx, w.s, w.root[0], w.root[1], white);
  const body = CLOG(flex);
  const box = { x: CX - 110, y: -10, w: 220, h: 270 };
  const sil = new Sil(ctx, [body], box);
  const g = sil.g;
  piece(g, body, box, 'wood', wood, { shadow: 0, size: 26, texA: 0.05 });
  within(g, body, () => {
    // the grain follows the clog's form
    g.save();
    g.strokeStyle = rgba(shade(wood, -0.45), 0.25);
    g.lineWidth = 1.2;
    for (let i = -6; i <= 6; i++) {
      g.beginPath();
      g.moveTo(CX + i * 14, -6);
      g.bezierCurveTo(CX + i * 18, 80, CX + i * 22, 180, CX + i * 12, 250);
      g.stroke();
    }
    g.restore();
    spec(g, CX - 46, 110, 18, 70, 0.4, 0.1);
    spec(g, CX - 30, 226 - flex * 5, 30, 10, 0.5, -0.1);
    // the carved toe line and a burnt-in rune with a painted swirl
    crease(g, (c) => c.ellipse(CX, 246 - flex * 6, 80, 50, 0, Math.PI + 0.25, -0.25), 2, '#3a1a08', 0.55, 0.3);
    carvedRune(g, 2, CX - 16, 168 - flex * 4, 32, 40, '#2a1004');
    // a painted border of knotwork under the band
    g.save();
    g.strokeStyle = rgba('#8a2a1a', 0.6);
    g.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const x = CX - 88 + i * 22;
      g.beginPath();
      g.moveTo(x, 44);
      g.quadraticCurveTo(x + 11, 58, x + 22, 44);
      g.moveTo(x, 54);
      g.quadraticCurveTo(x + 11, 40, x + 22, 54);
      g.stroke();
    }
    g.restore();
    // the gold band round the top
    const band = rrect(CX - 120, 16, 240, 20, 2);
    piece(g, band, box, 'gold', gold, { shadow: 0.5, size: 6 });
    for (let i = 0; i < 7; i++) rivet(g, CX - 54 + i * 18, 26, 2.4, shade(gold, 0.2));
    // scuffs and a dark worn toe
    blotches(g, { x: CX - 100, y: 200, w: 200, h: 66 }, '#3a1a08', 0.35, 10, 0.6, 0.15, 131);
  });
  ao(g, CX, 6, 60, 6, 0.4);
  finishLight(sil, wood, '#2a1008', 0.4);
  sil.finish(inkOf(wood), { openTop: -5 });
}

function vWingPart(i: number): PartDef {
  const w = VWINGS[i];
  const [rx, ry] = w.root;
  return { box: { x: rx - 84, y: ry - 84, w: 168, h: 128 }, frames: 1, pivot: w.root, draw: (g, art) => swanWing(g, w.s, rx, ry, art.secondary ?? '#f4f1e8') };
}

registerStyle('valkyrie', {
  contactY: 263,
  halfWidth: 100,
  rig: { from: 210, to: 228 },
  leg: { kind: 'iron', hw: 58, join: 'into' },
  parts: { wingL: vWingPart(0), wingR: vWingPart(1) },
  draw(ctx, art, p, o) {
    drawValkyrie(ctx, art, p, o);
  },
});

// ════════════════════════ THRYM THE FROST KING ════════════════════════
// A boot of blue glacier ice: a white fur cuff, a crown of ice spikes round it with a diamond, fractures glowing deep
// inside, a rune burning cold up the front and a fringe of icicles under the sole. In play freezing mist pours off
// it, snow swirls and the ice glints; overheated, it starts to melt: meltwater runs and drips, and steam rises.

const THRYM_ICICLES = [-84, -62, -40, -18, 4, 26, 48, 70, 88].map((dx, i) => ({ x: CX + dx, len: 18 + ((i * 7) % 5) * 5, w: 10 + (i % 3) * 2 }));

const thrymBody = (flex: number): PathFn => (c) => {
  const b = 252 - flex * 6;
  c.beginPath();
  c.moveTo(CX - 64, -6);
  c.bezierCurveTo(CX - 68, 60, CX - 108, 100, CX - 108, 166);
  c.bezierCurveTo(CX - 108, b - 18, CX - 70, b, CX, b);
  c.bezierCurveTo(CX + 70, b, CX + 108, b - 18, CX + 108, 166);
  c.bezierCurveTo(CX + 108, 100, CX + 68, 60, CX + 64, -6);
  c.closePath();
};

const thrymCuff: PathFn = (c) => {
  c.beginPath();
  // a fluffy edge: scallops along the bottom
  c.moveTo(CX - 76, -8);
  c.lineTo(CX + 76, -8);
  c.lineTo(CX + 80, 30);
  for (let i = 0; i <= 10; i++) {
    const x = CX + 80 - i * 16;
    c.quadraticCurveTo(x - 8, 44 + (i % 2) * 4, x - 16, 32);
  }
  c.closePath();
};

const thrymCrown = (): PathFn[] =>
  [-62, -37, -12, 12, 37, 62].map((dx, i) => (c: Ctx) => {
    const h = i === 2 || i === 3 ? 58 : i === 1 || i === 4 ? 48 : 38;
    c.beginPath();
    c.moveTo(CX + dx - 13, 66);
    c.lineTo(CX + dx - 2, 66 - h);
    c.lineTo(CX + dx + 2, 66 - h + 3);
    c.lineTo(CX + dx + 13, 66);
    c.closePath();
  });

function drawThrym(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const ice = art.primary ?? '#5fa8d8';
  const pale = art.skin;
  const white = art.secondary ?? '#eaf8ff';
  const flex = Math.max(0, p.curl);
  const body = thrymBody(flex);
  const b = 252 - flex * 6;
  const icicles = THRYM_ICICLES.map((ic) => ({ ...ic, y: b - 8 - Math.abs(ic.x - CX) * 0.08 }));
  const crown = thrymCrown();
  const box = { x: CX - 120, y: -10, w: 240, h: 300 };
  const parts = [body, thrymCuff, ...crown, ...icicles.map((ic) => iciclePath(ic.x, ic.y, ic.len, ic.w))];
  const cracks = (c: Ctx) => {
    const r = rng(hashStr('thrym-cracks'));
    for (let k = 0; k < 6; k++) {
      let x = CX - 80 + r() * 160;
      let y = 70 + r() * 60;
      c.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        x += (r() - 0.5) * 34;
        y += 10 + r() * 18;
        c.lineTo(x, y);
      }
    }
  };
  const rune = (c: Ctx) => {
    c.moveTo(CX, 200);
    c.lineTo(CX, 90);
    c.moveTo(CX, 112);
    c.lineTo(CX - 26, 84);
    c.moveTo(CX, 112);
    c.lineTo(CX + 26, 84);
  };
  if (o.emissive) {
    glowOnly(ctx, parts, box, (g) => {
      hotLine(g, cracks, '#7ae8ff', 1.4, 0.55);
      hotLine(g, rune, '#aef4ff', 3, 0.95);
      const dg = g.createRadialGradient(CX, 62, 1, CX, 62, 18);
      dg.addColorStop(0, rgba('#ffffff', 0.9));
      dg.addColorStop(1, rgba('#7ae8ff', 0));
      g.fillStyle = dg;
      g.fillRect(CX - 18, 44, 36, 36);
    });
    return;
  }
  if (o.heat) {
    glowOnly(ctx, parts, box, (g) => {
      heatRise(g, box, 60, 280, 141, '#ff8a4a', 0.75);
      hotLine(g, cracks, '#ffb07a', 1.6, 0.7);
    });
    return;
  }
  const sil = new Sil(ctx, parts, box);
  const g = sil.g;
  // glacier ice: deep blue core, pale lit edges, light passing through
  within(g, body, () => {
    const ig = g.createRadialGradient(CX + 20, 150, 10, CX, 130, 150);
    ig.addColorStop(0, shade(ice, -0.35));
    ig.addColorStop(0.55, ice);
    ig.addColorStop(1, mix(ice, pale, 0.6));
    g.fillStyle = ig;
    g.fillRect(box.x, box.y, box.w, box.h);
  });
  piece(g, body, box, DMAT.ice, ice, { shadow: 0, size: 26, spec: false });
  within(g, body, () => {
    g.globalAlpha = 0.55;
    g.fillStyle = vgrad(g, 40, 252, [[0, rgba(pale, 0.6)], [0.5, rgba(pale, 0)], [1, rgba('#0a2a5a', 0.5)]]);
    g.fillRect(box.x, box.y, box.w, box.h);
    g.globalAlpha = 1;
    // facets: flat planes catching the light at different angles
    const r = rng(hashStr('thrym-facets'));
    for (let i = 0; i < 14; i++) {
      const x = CX - 100 + r() * 200;
      const y = 50 + r() * 190;
      const s = 14 + r() * 22;
      g.fillStyle = rgba(r() < 0.5 ? '#ffffff' : '#0a2a6a', 0.06 + r() * 0.1);
      g.beginPath();
      g.moveTo(x, y - s);
      g.lineTo(x + s * (0.6 + r() * 0.5), y + s * (r() - 0.3));
      g.lineTo(x - s * (0.2 + r() * 0.6), y + s * (0.5 + r() * 0.4));
      g.closePath();
      g.fill();
    }
    // fractures deep in the ice, and trapped bubbles
    softStroke(g, cracks, rgba('#e8fbff', 0.6), 2.2, 0.8);
    g.save();
    g.beginPath();
    cracks(g);
    g.strokeStyle = rgba('#ffffff', 0.85);
    g.lineWidth = 0.8;
    g.stroke();
    g.restore();
    for (let i = 0; i < 26; i++) {
      const x = CX - 90 + r() * 180;
      const y = 70 + r() * 170;
      const rr = 1 + r() * 2.6;
      g.strokeStyle = rgba('#ffffff', 0.55);
      g.lineWidth = 0.8;
      g.beginPath();
      g.arc(x, y, rr, 0, Math.PI * 2);
      g.stroke();
      spec(g, x - rr * 0.3, y - rr * 0.3, rr * 0.5, rr * 0.4, 0.8, -0.5);
    }
    // the rune, carved cold up the front
    softStroke(g, rune, rgba('#e8fbff', 0.9), 6, 2);
    g.save();
    g.lineCap = 'round';
    g.beginPath();
    rune(g);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2.2;
    g.stroke();
    g.restore();
    // frost creeping up from the sole and down from the cuff
    hoarfrost(g, { x: CX - 110, y: 200, w: 220, h: 60 }, r, 0.7, 143, 40);
    // the big glassy highlights
    spec(g, CX - 60, 120, 14, 70, 0.75, 0.1);
    spec(g, CX + 70, 160, 6, 40, 0.4, 0.1, '#cfe2ff');
    glint(g, CX - 64, 92, 6, 1);
    glint(g, CX + 40, 214 - flex * 5, 4, 0.9);
  });
  // icicles along the sole
  for (const ic of icicles) paintIcicle(g, ic.x, ic.y, ic.len, ic.w, 0, mix(pale, '#ffffff', 0.3));
  // the white fur cuff
  piece(g, thrymCuff, box, 'plush', white, { shadow: 0.55, size: 10, texA: 0.4 });
  within(g, thrymCuff, () => {
    const r = rng(hashStr('thrym-fur'));
    furCoat(g, r, { x: CX - 80, y: -8, w: 160, h: 50 }, '#dfe9ef', 260, 9, () => Math.PI / 2, '#5a6a8a');
    ao(g, CX, 40, 80, 6, 0.3, 0, '#3a4a6a');
  });
  // the crown: ice spikes standing round the cuff, a diamond at the front
  const ring = rrect(CX - 78, 58, 156, 13, 4);
  piece(g, ring, box, DMAT.ice, mix(ice, '#ffffff', 0.4), { shadow: 0.5, size: 4 });
  crown.forEach((cp, i) => {
    const dx = [-62, -37, -12, 12, 37, 62][i];
    piece(g, cp, { x: CX + dx - 13, y: 8, w: 26, h: 58 }, DMAT.ice, mix(ice, '#ffffff', 0.25 + (i % 2) * 0.15), { shadow: 0.6, size: 6 });
    // a bright facet edge up each spike
    g.save();
    g.strokeStyle = rgba('#ffffff', 0.8);
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(CX + dx - 7, 62);
    g.lineTo(CX + dx - 2, 66 - (i === 2 || i === 3 ? 58 : i === 1 || i === 4 ? 48 : 38) + 6);
    g.stroke();
    g.restore();
  });
  const dia: PathFn = (c) => {
    c.beginPath();
    c.moveTo(CX, 48);
    c.lineTo(CX + 12, 62);
    c.lineTo(CX, 78);
    c.lineTo(CX - 12, 62);
    c.closePath();
  };
  piece(g, dia, { x: CX - 12, y: 48, w: 24, h: 30 }, 'glass', '#e8fbff', { shadow: 0.6, size: 3 });
  glint(g, CX - 3, 57, 5, 1);
  oneLight(sil, '#06142a', 0.4, 22);
  sil.finish(inkOf(shade(ice, -0.2)), { openTop: -5 });
}

registerStyle('thrym', {
  contactY: 274,
  halfWidth: 112,
  leg: { kind: 'iron', hw: 62, join: 'into' },
  draw(ctx, art, p, o) {
    drawThrym(ctx, art, p, o);
  },
});

// ════════════════════════ SURTR THE FIRE GIANT ════════════════════════
// A magma boot: plates of black basalt crust floating on molten rock that glows through every crack, a crown of
// flame round the top. In play flames lick up off the crown, embers stream up, heat shimmers above it and lava
// drips off the sole; overheated, the cracks go white-hot and it throws sparks.

/** Surtr's crust: basalt cracked into plates (a Voronoi of jittered seeds), the cracks a mask (0…1 per pixel) laid
 * over the boot's box at 2 design units a pixel. Wider cracks where the crust is thinnest (low down). */
const CRACK_BOX = { x: CX - 120, y: 40, w: 240, h: 240 };
let crackMask: HTMLCanvasElement | null = null;
function surtrCracks(): HTMLCanvasElement {
  if (crackMask) return crackMask;
  const r = rng(hashStr('surtr-cracks'));
  const seeds: [number, number][] = [];
  for (let j = 0; j < 7; j++)
    for (let i = 0; i < 5 + (j % 2); i++) seeds.push([CRACK_BOX.x + (i + 0.2 + r() * 0.6) * (CRACK_BOX.w / (5 + (j % 2))), CRACK_BOX.y + (j + 0.15 + r() * 0.7) * (CRACK_BOX.h / 7)]);
  const k = 1.5;
  const W = Math.round(CRACK_BOX.w / k);
  const H = Math.round(CRACK_BOX.h / k);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d')!;
  const img = x.createImageData(W, H);
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const px = CRACK_BOX.x + i * k;
      const py = CRACK_BOX.y + j * k;
      let d1 = 1e9;
      let d2 = 1e9;
      for (const [sx, sy] of seeds) {
        const d = Math.hypot(px - sx, (py - sy) * 1.25);
        if (d < d1) {
          d2 = d1;
          d1 = d;
        } else if (d < d2) d2 = d;
      }
      const width = 3 + ((py - CRACK_BOX.y) / CRACK_BOX.h) * 3.5 + (vnoise(px / 14, py / 14, 5) - 0.5) * 3;
      const v = Math.max(0, Math.min(1, 1 - (d2 - d1) / Math.max(0.6, width)));
      const o = (j * W + i) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
      img.data[o + 3] = Math.round(Math.pow(v, 1.5) * 255);
    }
  x.putImageData(img, 0, 0);
  crackMask = c;
  return c;
}

/** Lay the crack mask in a colour, optionally blurred (glow). */
function lavaCracks(g: Ctx, col: string, a: number, blur = 0): void {
  const m = surtrCracks();
  const c = document.createElement('canvas');
  c.width = m.width;
  c.height = m.height;
  const x = c.getContext('2d')!;
  x.drawImage(m, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = col;
  x.fillRect(0, 0, c.width, c.height);
  g.save();
  g.globalAlpha = a;
  if (blur && 'filter' in g) g.filter = `blur(${(blur * pxPerUnit(g)).toFixed(1)}px)`;
  g.imageSmoothingQuality = 'high';
  g.drawImage(c, CRACK_BOX.x, CRACK_BOX.y, CRACK_BOX.w, CRACK_BOX.h);
  g.restore();
}

const surtrBody = (flex: number): PathFn => (c) => {
  const b = 272 - flex * 6;
  c.beginPath();
  c.moveTo(CX - 64, -6);
  c.bezierCurveTo(CX - 68, 60, CX - 108, 100, CX - 108, 166);
  c.bezierCurveTo(CX - 108, b - 18, CX - 70, b, CX, b);
  c.bezierCurveTo(CX + 70, b, CX + 108, b - 18, CX + 108, 166);
  c.bezierCurveTo(CX + 108, 100, CX + 68, 60, CX + 64, -6);
  c.closePath();
};

/** The flame crown's tongues (rising from the rim at y 58). */
export const SURTR_FLAMES = [-66, -44, -22, 0, 22, 44, 66].map((dx, i) => ({ x: CX + dx, h: 34 + ((i * 5) % 3) * 9 + (i === 3 ? 10 : 0) }));

const flameTongue = (x: number, h: number, w = 20): PathFn => (c) => {
  c.beginPath();
  c.moveTo(x - w / 2, 58);
  c.bezierCurveTo(x - w * 0.6, 58 - h * 0.5, x - w * 0.05, 58 - h * 0.7, x + w * 0.12, 58 - h);
  c.bezierCurveTo(x + w * 0.2, 58 - h * 0.6, x + w * 0.6, 58 - h * 0.45, x + w / 2, 58);
  c.closePath();
};

function surtrFlames(g: Ctx, box: { x: number; y: number; w: number; h: number }): void {
  for (const f of SURTR_FLAMES) {
    const fp = flameTongue(f.x, f.h);
    within(g, fp, () => {
      g.fillStyle = vgrad(g, 58 - f.h, 58, [[0, '#fff2a0'], [0.35, '#ffb02a'], [0.75, '#ff5a0a'], [1, '#b8200a']]);
      g.fillRect(box.x, 58 - f.h - 2, box.w, f.h + 4);
      const inner = flameTongue(f.x + 1, f.h * 0.6, 9);
      g.fillStyle = rgba('#fffbe0', 0.85);
      inner(g);
      g.fill();
    });
  }
}

function drawSurtr(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const crust = art.primary ?? '#2a1a18';
  const lava = art.secondary ?? '#ff7a1a';
  const flex = Math.max(0, p.curl);
  const body = surtrBody(flex);
  const rim = rrect(CX - 84, 50, 168, 16, 6);
  const flames = SURTR_FLAMES.map((f) => flameTongue(f.x, f.h));
  const box = { x: CX - 120, y: -10, w: 240, h: 290 };
  const parts = [body, rim, ...flames];
  if (o.emissive) {
    glowOnly(ctx, parts, box, (g) => {
      within(g, body, () => {
        lavaCracks(g, lava, 0.9, 4);
        lavaCracks(g, '#ffd27a', 0.9);
      });
      surtrFlames(g, box);
    });
    return;
  }
  if (o.heat) {
    glowOnly(ctx, parts, box, (g) => {
      heatRise(g, box, 40, 280, 151, '#ff8a2a', 0.75);
      within(g, body, () => {
        lavaCracks(g, '#fff4c0', 0.9, 2);
        lavaCracks(g, '#ffffff', 0.8);
      });
    });
    return;
  }
  const sil = new Sil(ctx, parts, box);
  const g = sil.g;
  // the basalt crust: dark, pitted, its plates catching the light along their top-left edges
  piece(g, body, box, 'stone', crust, { shadow: 0, size: 26, texA: 0.5 });
  within(g, body, () => {
    texture(g, 'cast', box, 0.45, 1.2);
    blotches(g, box, '#000000', 0.35, 16, 0.55, 0.25, 155);
    // the plate edges lift: a lit lip just up-left of every crack, a shadow just down-right
    g.save();
    g.translate(-LX * 2.2, -LY * 2.2);
    lavaCracks(g, '#8a7a70', 0.35, 1.2);
    g.restore();
    // heat glowing up through the cracks, hotter low down
    lavaCracks(g, lava, 0.75, 5);
    lavaCracks(g, mix(lava, '#ff3a0a', 0.3), 1, 0.6);
    g.save();
    g.globalCompositeOperation = 'lighter';
    lavaCracks(g, '#ffd27a', 0.55);
    g.restore();
    // a dark crust cooling round the ankle; the light catches the top-left
    g.fillStyle = vgrad(g, -6, 80, [[0, rgba(crust, 0.95)], [1, rgba(crust, 0)]]);
    g.fillRect(box.x, -10, box.w, 90);
    spec(g, CX - 50, 120, 30, 50, 0.2, 0.1, LIGHT.key);
  });
  // the rim the crown rises from, and the flames
  piece(g, rim, box, 'iron', '#3a2420', { shadow: 0.5, size: 5 });
  within(g, rim, () => {
    g.fillStyle = vgrad(g, 50, 66, [[0, rgba('#ff9a3a', 0)], [1, rgba('#ff9a3a', 0.5)]]);
    g.fillRect(box.x, 50, box.w, 16);
  });
  surtrFlames(g, box);
  ao(g, CX, 46, 70, 6, 0.4);
  oneLight(sil, '#0a0404', 0.4, 20);
  sil.finish('#160806', { openTop: -5 });
}

registerStyle('surtr', {
  contactY: 274,
  halfWidth: 110,
  leg: { kind: 'basalt', hw: 62, join: 'blend', fade: 24 },
  draw(ctx, art, p, o) {
    drawSurtr(ctx, art, p, o);
  },
});

// ════════════════════════ FENRIR'S PAW ════════════════════════
// A colossal wolf's paw in dark shaggy fur, four great toe pads with hooked horn claws, bound at the ankle by the
// silken band of Gleipnir with its runes glowing and an iron ring for the chain. In play the fur locks stir, the
// runes pulse, frost breath curls off it; overheated, the runes burn red and it steams.

const FEN_TOES: [number, number, number, number, number][] = [
  [CX - 78, 238, 26, 32, 0.32],
  [CX - 28, 254, 28, 34, 0.08],
  [CX + 28, 254, 28, 34, -0.08],
  [CX + 78, 238, 26, 32, -0.32],
];
export const FEN_LOCKS: [number, number, number, number, number, number][] = [
  [CX - 84, 84, Math.PI * 0.66, 40, 30, -0.3],
  [CX - 106, 150, Math.PI * 0.6, 40, 30, -0.3],
  [CX + 86, 86, Math.PI * 0.34, 40, 30, 0.3],
  [CX + 108, 152, Math.PI * 0.4, 40, 30, 0.3],
];
export const FEN_RUNES = [CX - 48, CX - 24, CX, CX + 24, CX + 48];

function fenToes(p: Pose): StyleToe[] {
  const c = Math.max(0, p.curl);
  const sp = Math.max(0, -p.curl);
  return FEN_TOES.map(([x, y, rx, ry, rot], i) => {
    const w = p.wiggle[i + 1] ?? 0;
    return { cx: x + (x - CX) * 0.08 * sp, cy: y - ry * 0.3 * c + 4 * w, rx: rx * (1 + 0.05 * c), ry: ry * (1 - 0.22 * c), rot: rot * (1 + sp * 0.5) - w * 0.06 };
  });
}

const fenBody: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 62, -6);
  c.bezierCurveTo(CX - 66, 50, CX - 112, 100, CX - 112, 170);
  c.bezierCurveTo(CX - 112, 210, CX - 96, 230, CX - 80, 236);
  c.lineTo(CX + 80, 236);
  c.bezierCurveTo(CX + 96, 230, CX + 112, 210, CX + 112, 170);
  c.bezierCurveTo(CX + 112, 100, CX + 66, 50, CX + 62, -6);
  c.closePath();
};

const lockPath = (x: number, y: number, ang: number, len: number, w: number, bend: number): PathFn => wolfLock(x, y, ang, len, w, bend, 3);

function paintFenLock(g: Ctx, i: number, fur: string): void {
  const [x, y, a, l, w, b] = FEN_LOCKS[i];
  const path = lockPath(x, y, a, l, w, b);
  const r = rng(hashStr('fen-lock' + i));
  within(g, path, () => {
    const lg = g.createLinearGradient(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
    lg.addColorStop(0, shade(fur, -0.25));
    lg.addColorStop(1, shade(fur, 0.15));
    g.fillStyle = lg;
    g.fillRect(x - l - w, y - l - w, (l + w) * 2, (l + w) * 2);
    furCoat(g, r, { x: x - l, y: y - l, w: l * 2, h: l * 2 }, shade(fur, 0.1), 90, l * 0.7, () => a + b * 0.5);
  });
}

function fenLockPart(i: number): PartDef {
  const [x, y, a, l, w] = FEN_LOCKS[i];
  const ex = x + Math.cos(a) * l;
  const ey = y + Math.sin(a) * l;
  const pad = w + 10;
  const bx = Math.min(x, ex) - pad;
  const by = Math.min(y, ey) - pad;
  return {
    box: { x: bx, y: by, w: Math.abs(ex - x) + pad * 2, h: Math.abs(ey - y) + pad * 2 },
    frames: 1,
    pivot: [x, y],
    draw: (g, art) => {
      const [x0, y0, a0, l0, w0, b0] = FEN_LOCKS[i];
      const s = new Sil(g, [lockPath(x0, y0, a0, l0, w0, b0)], { x: bx, y: by, w: 200, h: 200 });
      paintFenLock(s.g, i, art.primary ?? '#3e3a46');
      s.edge(rgba('#06060e', 0.35), 8, LX * 5, LY * 5);
      s.edge(rgba(LIGHT.rim, 0.5), 2.5, LX * 3, LY * 3);
      s.finish(inkOf('#1a1820'), { inner: 0.3 });
      // the root melts into the paw under it
      g.save();
      g.globalCompositeOperation = 'destination-out';
      const fg = g.createRadialGradient(x0, y0, 0, x0, y0, l0 * 0.55);
      fg.addColorStop(0, 'rgba(0,0,0,1)');
      fg.addColorStop(0.55, 'rgba(0,0,0,.75)');
      fg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = fg;
      g.fillRect(x0 - l0, y0 - l0, l0 * 2, l0 * 2);
      g.restore();
    },
  };
}

const FEN_BAND = { y: 30, h: 26 };

function fenRunes(g: Ctx, col: string, glow: boolean): void {
  FEN_RUNES.forEach((x, i) => carvedRune(g, i * 3 + 1, x - 7, FEN_BAND.y + 4, 14, 18, '#1a2030', glow ? col : undefined));
}

function drawFenrir(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const fur = art.primary ?? '#3e3a46';
  const tips = art.secondary ?? '#9a8fae';
  const horn = art.nails ?? '#e9e2d0';
  const toes = fenToes(p);
  const c = Math.max(0, p.curl);
  const claws = toes.map((t, i) => {
    const [x, y] = onToe(t, Math.PI / 2);
    return { x, y: y - t.ry * 0.3, ang: Math.PI / 2 - t.rot * 1.2, len: 40 * (1 + c * 0.3), w: 18, hook: (i < 2 ? 0.32 : -0.32) * (1 + c * 0.7) };
  });
  const toeP = (t: StyleToe): PathFn => ell(t.cx, t.cy, t.rx, t.ry, t.rot);
  const locks = o.live ? [] : FEN_LOCKS.map(([x, y, a, l, w, b]) => lockPath(x, y, a, l, w, b));
  const band = rrect(CX - 76, FEN_BAND.y, 152, FEN_BAND.h, 6);
  const box = { x: CX - 150, y: -10, w: 300, h: 320 };
  const parts = [fenBody, ...locks, ...toes.map(toeP), ...claws.map((k) => clawPath(k.x, k.y, k.ang, k.len, k.w, k.hook))];
  if (o.emissive || o.heat) {
    glowOnly(ctx, parts, box, (g) => {
      if (o.emissive) fenRunes(g, '#8af0ff', true);
      else {
        heatRise(g, box, 60, 300, 161, '#ff5a2a', 0.7);
        fenRunes(g, '#ff4a2a', true);
      }
    });
    return;
  }
  const sil = new Sil(ctx, parts, box);
  const g = sil.g;
  const r = rng(hashStr('fenrir-fur'));
  sil.form({ base: shade(fur, -0.05), shadowTint: '#141428', ramp: 0.9, form: 0.65, formSize: 34, bevel: 0.12, rim: 0.6 });
  // the toes: furred knuckles, each its own volume, fur flowing down over them to the claws
  toes.forEach((t) => {
    within(g, toeP(t), () => {
      furCoat(g, r, { x: t.cx - t.rx, y: t.cy - t.ry, w: t.rx * 2, h: t.ry * 2 }, mix(fur, tips, 0.15), 160, 10, () => Math.PI / 2 - t.rot);
    });
    lobe(g, toeP(t), { x: t.cx - t.rx - 4, y: t.cy - t.ry - 4, w: t.rx * 2 + 8, h: t.ry * 2 + 8 }, t.cy - t.ry, t.cy - t.ry * 0.4, '#000000', 0.7, 8, 0.35);
  });
  for (let i = 0; i < toes.length - 1; i++) {
    const a = toes[i];
    const b = toes[i + 1];
    ao(g, (a.cx + a.rx * 0.85 + b.cx - b.rx * 0.85) / 2, Math.max(a.cy, b.cy) + 6, 8, 26, 0.7, 0, '#000000');
  }
  // the coat: strands flowing down and out, the tips frosted lighter
  within(g, fenBody, () => furCoat(g, r, { x: CX - 116, y: -6, w: 232, h: 236 }, fur, 1300, 18, (x) => Math.PI / 2 - ((x - CX) / 110) * 0.55));
  within(g, fenBody, () => furCoat(g, r, { x: CX - 116, y: 20, w: 232, h: 210 }, mix(fur, tips, 0.5), 240, 14, (x) => Math.PI / 2 - ((x - CX) / 110) * 0.6));
  // fur spilling over each toe's root
  for (const t of toes) {
    const [, ky] = onToe(t, -Math.PI / 2);
    softStroke(g, (cc) => {
      cc.moveTo(t.cx - t.rx * 0.9, ky + t.ry * 0.4);
      cc.quadraticCurveTo(t.cx, ky + t.ry * 0.55, t.cx + t.rx * 0.9, ky + t.ry * 0.4);
    }, rgba('#000000', 0.55), 6, 3);
    furCoat(g, r, { x: t.cx - t.rx, y: ky - 4, w: t.rx * 2, h: t.ry * 0.4 }, fur, 50, t.ry * 0.5, () => Math.PI / 2);
  }
  const fl = g.createLinearGradient(CX - 100, 0, CX + 110, 230);
  fl.addColorStop(0, rgba(LIGHT.key, 0.14));
  fl.addColorStop(0.45, rgba(LIGHT.key, 0));
  fl.addColorStop(1, rgba('#06061a', 0.4));
  g.fillStyle = fl;
  g.fillRect(box.x, box.y, box.w, 240);
  for (const k of claws) paintClaw(g, k.x, k.y, k.ang, k.len, k.w, k.hook, horn, '#3a2a14');
  if (!o.live) for (let i = 0; i < FEN_LOCKS.length; i++) paintFenLock(g, i, fur);
  // Gleipnir: a silken band, pale and faintly iridescent, runes stitched into it, an iron ring for the chain
  piece(g, band, box, 'linen', '#c8cfe0', { shadow: 0.6, size: 6, texA: 0.25 });
  within(g, band, () => {
    g.fillStyle = hgrad(g, CX - 76, CX + 76, [[0, rgba('#ff9ad8', 0.12)], [0.5, rgba('#9ae8ff', 0.16)], [1, rgba('#c8ff9a', 0.12)]]);
    g.fillRect(CX - 80, FEN_BAND.y, 160, FEN_BAND.h);
    spec(g, CX - 30, FEN_BAND.y + 6, 40, 4, 0.5, 0);
  });
  stitches(g, (cc) => {
    cc.moveTo(CX - 72, FEN_BAND.y + 3);
    cc.lineTo(CX + 72, FEN_BAND.y + 3);
    cc.moveTo(CX - 72, FEN_BAND.y + FEN_BAND.h - 3);
    cc.lineTo(CX + 72, FEN_BAND.y + FEN_BAND.h - 3);
  }, rgba('#8a90a8', 0.7), 1, 3, 3);
  fenRunes(g, '#8af0ff', false);
  // the iron ring
  const ringX = CX + 82;
  const ringY = FEN_BAND.y + 30;
  contact(g, (cc) => {
    cc.beginPath();
    cc.ellipse(ringX, ringY, 11, 15, 0.2, 0, Math.PI * 2);
    cc.lineWidth = 5;
    cc.stroke();
  }, 0.6, 2.5, 3);
  g.save();
  g.lineWidth = 5;
  g.strokeStyle = hgrad(g, ringX - 12, ringX + 12, [[0, '#a8aeb8'], [0.5, '#5a606a'], [1, '#1a1c22']]);
  g.beginPath();
  g.ellipse(ringX, ringY, 11, 15, 0.2, 0, Math.PI * 2);
  g.stroke();
  g.restore();
  rivet(g, ringX - 4, FEN_BAND.y + 10, 3.4, '#8a909a');
  sil.edge(rgba('#06060e', 0.4), 20, LX * 11, LY * 11);
  sil.edge(rgba(LIGHT.rim, 0.6), 2.5, LX * 3, LY * 3);
  sil.finish(inkOf('#1a1820'), { openTop: -5, inner: 0.3 });
}

registerStyle('fenrir', {
  contactY: 288,
  halfWidth: 116,
  rig: { from: 186, to: 204 },
  leg: { kind: 'fur', hw: 62, join: 'blend', fade: 26 },
  parts: Object.fromEntries(FEN_LOCKS.map((_, i) => [`lock${i}`, fenLockPart(i)])),
  draw(ctx, art, p, o) {
    drawFenrir(ctx, art, p, o);
  },
});

// ════════════════════════ JÖRMUNGANDR ════════════════════════
// The world serpent's head, pointing down: a long neck with cream belly scutes, a broad scaled head with a dark
// dorsal pattern, heavy brows over slit yellow eyes, fangs and a flicking forked tongue. In play (its Pizzapedia and
// peel art; the fight draws its own head over the gaps) the eyes blink and the tongue flicks.

const SERP = { eyeY: 214, eyeDx: 48 };
export const SERP_TONGUE: [number, number] = [CX, 292];

const serpHead: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 54, -6);
  c.bezierCurveTo(CX - 56, 80, CX - 70, 130, CX - 100, 180);
  c.bezierCurveTo(CX - 112, 206, CX - 104, 240, CX - 72, 262);
  c.bezierCurveTo(CX - 46, 282, CX - 20, 292, CX, 292);
  c.bezierCurveTo(CX + 20, 292, CX + 46, 282, CX + 72, 262);
  c.bezierCurveTo(CX + 104, 240, CX + 112, 206, CX + 100, 180);
  c.bezierCurveTo(CX + 70, 130, CX + 56, 80, CX + 54, -6);
  c.closePath();
};

function serpEyes(g: Ctx, skin: string, lid: number): void {
  for (const s of [-1, 1]) {
    const x = CX + s * SERP.eyeDx;
    const y = SERP.eyeY;
    g.save();
    g.translate(x, y);
    g.rotate(s * 0.35);
    const eye: PathFn = (c) => {
      c.beginPath();
      c.ellipse(0, 0, 16, 11, 0, 0, Math.PI * 2);
    };
    ao(g, 0, 2, 22, 16, 0.55, 0, '#06140c');
    within(g, eye, () => {
      const ig = g.createRadialGradient(-3, -3, 1, 0, 0, 16);
      ig.addColorStop(0, '#fff6a0');
      ig.addColorStop(0.55, '#e8c020');
      ig.addColorStop(1, '#7a5a08');
      g.fillStyle = ig;
      g.fillRect(-17, -12, 34, 24);
      g.fillStyle = '#0a0804';
      g.beginPath();
      g.ellipse(0, 0, 2.6, 10, 0, 0, Math.PI * 2);
      g.fill();
      if (lid > 0) {
        g.fillStyle = shade(skin, -0.15);
        g.fillRect(-17, -12, 34, 24 * lid);
        g.strokeStyle = rgba('#06140c', 0.8);
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-16, -12 + 24 * lid);
        g.lineTo(16, -12 + 24 * lid);
        g.stroke();
      }
    });
    g.strokeStyle = '#06140c';
    g.lineWidth = 2;
    eye(g);
    g.stroke();
    if (lid < 0.5) {
      spec(g, -5, -4, 4, 3, 0.95, -0.4);
      glint(g, -6, -5, 3, 0.9);
    }
    g.restore();
    // the heavy brow scale over each eye
    const brow: PathFn = (c) => {
      c.beginPath();
      c.moveTo(x - s * 24, y - 6);
      c.quadraticCurveTo(x, y - 28, x + s * 26, y - 6);
      c.quadraticCurveTo(x, y - 16, x - s * 24, y - 6);
      c.closePath();
    };
    piece(g, brow, { x: x - 26, y: y - 28, w: 52, h: 24 }, 'scales', shade(skin, 0.05), { shadow: 0.6, size: 5, texA: 0.2 });
  }
}

function serpTongue(g: Ctx, out: number): void {
  const [x, y] = SERP_TONGUE;
  const len = 10 + out * 30;
  const t: PathFn = (c) => {
    c.beginPath();
    c.moveTo(x - 3, y - 6);
    c.lineTo(x - 3, y + len * 0.7);
    c.lineTo(x - 10, y + len);
    c.lineTo(x - 5, y + len * 0.72);
    c.lineTo(x, y + len * 0.6);
    c.lineTo(x + 5, y + len * 0.72);
    c.lineTo(x + 10, y + len);
    c.lineTo(x + 3, y + len * 0.7);
    c.lineTo(x + 3, y - 6);
    c.closePath();
  };
  prop(g, [t], { x: x - 12, y: y - 8, w: 24, h: len + 10 }, (tg) => {
    tg.fillStyle = vgrad(tg, y, y + len, [[0, '#a8102a'], [1, '#e83a4a']]);
    tg.fillRect(x - 12, y - 8, 24, len + 10);
    spec(tg, x - 1, y + len * 0.3, 1.4, len * 0.2, 0.7, 0);
  }, '#3a0410', { w: 1.6 });
}

function drawSerpent(ctx: Ctx, art: FootArt, _p: Pose, o: Opts): void {
  const skin = art.primary ?? '#2f6e56';
  const light = art.skin;
  const belly = art.secondary ?? '#e8d36a';
  const box = { x: CX - 120, y: -10, w: 240, h: 310 };
  if (o.emissive) return;
  if (o.heat) {
    glowOnly(ctx, [serpHead], box, (g) => heatRise(g, box, 40, 296, 171, '#ff6a2a', 0.7));
    return;
  }
  if (!o.live) serpTongue(ctx, 0.7);
  const sil = new Sil(ctx, [serpHead], box);
  const g = sil.g;
  sil.form({ base: light, shadowTint: '#06201a', ramp: 0.85, form: 0.6, formSize: 30, bevel: 0.35, rim: 0.6 });
  texture(g, 'scales', box, 0.5, 1.6);
  // the dark dorsal pattern: diamonds down the sides and across the head
  const r = rng(hashStr('serpent'));
  for (let i = 0; i < 7; i++) {
    const y = 20 + i * 30;
    for (const s of [-1, 1]) {
      const x = CX + s * (40 + i * 6);
      softFill(g, (c) => {
        c.beginPath();
        c.moveTo(x, y - 12);
        c.lineTo(x + 12, y);
        c.lineTo(x, y + 12);
        c.lineTo(x - 12, y);
        c.closePath();
      }, rgba(shade(skin, -0.4), 0.7), 1.5);
    }
  }
  softFill(g, (c) => {
    c.beginPath();
    c.moveTo(CX, 170);
    c.lineTo(CX + 50, 200);
    c.lineTo(CX, 236);
    c.lineTo(CX - 50, 200);
    c.closePath();
  }, rgba(shade(skin, -0.25), 0.6), 4);
  // the belly scutes down the throat, overlapping plates
  for (let i = 0; i < 11; i++) {
    const y = -4 + i * 14;
    const w = 30 - i * 0.5;
    const sc: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - w, y + 2);
      c.quadraticCurveTo(CX, y - 3, CX + w, y + 2);
      c.quadraticCurveTo(CX + w * 0.9, y + 15, CX, y + 17);
      c.quadraticCurveTo(CX - w * 0.9, y + 15, CX - w, y + 2);
      c.closePath();
    };
    piece(g, sc, { x: CX - w, y: y - 3, w: w * 2, h: 20 }, DMAT.bone, mix(mix(belly, light, 0.3), '#ffffff', 0.1 - i * 0.008), { shadow: 0.6, size: 4, texA: 0.15, spec: false });
  }
  // scales catching the light on the crown, nostrils, the mouth line
  spec(g, CX - 40, 196, 30, 16, 0.35, -0.3);
  for (const s of [-1, 1]) {
    g.fillStyle = '#06140c';
    g.beginPath();
    g.ellipse(CX + s * 14, 270, 4, 2.6, s * 0.5, 0, Math.PI * 2);
    g.fill();
  }
  crease(g, (c) => {
    c.moveTo(CX - 92, 220);
    c.bezierCurveTo(CX - 80, 266, CX - 40, 282, CX, 284);
    c.bezierCurveTo(CX + 40, 282, CX + 80, 266, CX + 92, 220);
  }, 2.4, '#06140c', 0.7, 0.3);
  // fangs under the lip
  for (const s of [-1, 1]) {
    const fx = CX + s * 26;
    const fang: PathFn = (c) => {
      c.beginPath();
      c.moveTo(fx - 4, 276);
      c.quadraticCurveTo(fx - 3, 288, fx + s * 1, 296);
      c.quadraticCurveTo(fx + 3, 286, fx + 4, 276);
      c.closePath();
    };
    piece(g, fang, { x: fx - 5, y: 276, w: 10, h: 20 }, DMAT.bone, '#fffaf0', { shadow: 0.4, size: 2 });
  }
  if (!o.live) serpEyes(g, light, 0);
  void r;
  oneLight(sil, '#02100a', 0.45, 22);
  sil.finish(inkOf(skin), { openTop: -5 });
}

const SERP_BLINK = 4;
registerStyle('jormungandr', {
  contactY: 300,
  halfWidth: 108,
  leg: { kind: 'skin', hw: 54, join: 'blend', fade: 24 },
  parts: {
    eyes: { box: { x: CX - SERP.eyeDx - 30, y: SERP.eyeY - 30, w: SERP.eyeDx * 2 + 60, h: 52 }, frames: SERP_BLINK, draw: (g, art, i) => serpEyes(g, art.skin, i / (SERP_BLINK - 1)) },
    tongue: { box: { x: SERP_TONGUE[0] - 14, y: SERP_TONGUE[1] - 10, w: 28, h: 56 }, frames: 2, draw: (g, _a, i) => serpTongue(g, i ? 1 : 0) },
  },
  draw(ctx, art, p, o) {
    drawSerpent(ctx, art, p, o);
  },
});

export { beadEye };
