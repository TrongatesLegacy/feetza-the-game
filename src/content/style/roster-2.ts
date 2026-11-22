// Roster batch, part 2: the Beach and the Diner (Sandy Sandra, Seaweed Steph, Coconut Kev, Tidepool Tess, Riot Ryan,
// Waffle Wanda, Ketchup Kenny, Fry Cook Fran), redrawn in the style kit. Life in play: src/content/styleLive/roster.ts.

import type { FootArt } from '../../data/feet';
import { onToe } from '../../art/style/anatomy';
import { LIGHT, type PathFn, ao, crease, glint, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil } from '../../art/style/sil';
import { registerStyle } from '../../art/style/registry';
import { blotches, contact, rivet, stitches } from '../../art/style/details';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';
import { BARE_RIG, CX, bareWith, dripPath, ell, finishLight, glowLayer, hgrad, piece, prop, rrect, solePath, upperPath, vgrad, within } from './roster-kit';

/** A five-point star path (starfish, sparkles). */
export function starPath(x: number, y: number, ro: number, ri: number, rot = -Math.PI / 2, n = 5, round = 0.35): PathFn {
  return (c) => {
    c.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i / (n * 2)) * Math.PI * 2;
      const r = i % 2 ? ri : ro;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) c.moveTo(px, py);
      else {
        const am = rot + ((i - 0.5) / (n * 2)) * Math.PI * 2;
        const rm = (i % 2 ? ro : ri) * (1 - round * 0.2);
        c.quadraticCurveTo(x + Math.cos(am) * rm * 0.9, y + Math.sin(am) * rm * 0.9, px, py);
      }
    }
    c.closePath();
  };
}

/** A starfish: knobbly orange arms. */
export function starfish(g: Ctx, x: number, y: number, r: number, rot: number, col: string): void {
  const p = starPath(x, y, r, r * 0.45, rot);
  piece(g, p, { x: x - r, y: y - r, w: r * 2, h: r * 2 }, 'plastic', col, { shadow: 0.45, spec: false });
  within(g, p, () => {
    texture(g, 'speckle', { x: x - r, y: y - r, w: r * 2, h: r * 2 }, 0.5, 1);
    for (let i = 0; i < 5; i++) {
      const a = rot + (i / 5) * Math.PI * 2;
      for (let k = 1; k <= 3; k++) {
        const d = (k / 4) * r * 0.9;
        g.fillStyle = rgba(shade(col, 0.5), 0.85);
        g.beginPath();
        g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.07, 0, Math.PI * 2);
        g.fill();
      }
    }
    spec(g, x - r * 0.25, y - r * 0.3, r * 0.4, r * 0.2, 0.5);
  });
}

/** A scallop shell. */
function shell(g: Ctx, x: number, y: number, s: number, rot: number, col: string): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(s, s);
  const p: PathFn = (c) => {
    c.beginPath();
    c.moveTo(0, 8);
    c.lineTo(-12, -4);
    c.quadraticCurveTo(0, -16, 12, -4);
    c.closePath();
  };
  piece(g, p, { x: -12, y: -16, w: 24, h: 24 }, 'plastic', col, { shadow: 0.45 });
  within(g, p, () => {
    g.strokeStyle = rgba(shade(col, -0.35), 0.6);
    g.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      g.beginPath();
      g.moveTo(0, 8);
      g.lineTo(i * 4, -14);
      g.stroke();
    }
  });
  g.restore();
}

// ════════════════════════ Sandy Sandra ════════════════════════
// Napping under a mound of wet sand: only her ankle and one curled toe show. A spade stands in the sand with a
// shell and a starfish. In play sand trickles off the mound, and it trembles as she's about to surface.

const mound: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 118, 266);
  c.bezierCurveTo(CX - 116, 214, CX - 80, 168, CX - 20, 162);
  c.bezierCurveTo(CX + 30, 156, CX + 92, 176, CX + 112, 214);
  c.bezierCurveTo(CX + 120, 232, CX + 120, 256, CX + 116, 266);
  c.closePath();
};

registerStyle('sandy', {
  contactY: 268,
  halfWidth: 112,
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 24 },
  draw(ctx, art, p) {
    const sand = art.primary ?? '#f0cf8a';
    const coral = art.secondary ?? '#e8745a';
    bareWith(ctx, { skin: art.skin, nails: art.nails }, p, (g) => {
      // sandy grains stuck to the skin near the mound
      const r = rng(hashStr('sandy-skin'));
      for (let i = 0; i < 90; i++) {
        g.fillStyle = rgba(r() < 0.5 ? shade(sand, -0.2) : shade(sand, 0.2), 0.6);
        g.beginPath();
        g.arc(CX - 70 + r() * 140, 110 + r() * 60, 0.6 + r() * 1.2, 0, Math.PI * 2);
        g.fill();
      }
    });
    // the spade's handle behind the mound
    prop(ctx, [rrect(CX - 98, 112, 9, 90, 4), ell(CX - 93.5, 110, 9, 7)], { x: CX - 104, y: 100, w: 22, h: 110 }, (g, sil) => {
      sil.form({ base: '#c87a4a', shadowTint: '#3a1008', ramp: 0.8, form: 0.5, formSize: 5, bevel: 0.4, rim: 0.5 });
      texture(g, 'wood', { x: CX - 104, y: 100, w: 22, h: 110 }, 0.5, 1.2);
      g.fillStyle = coral;
      g.fillRect(CX - 104, 104, 22, 10);
    }, inkOf('#c87a4a'), { w: 3.5 });
    // the mound: damp, packed sand, darker and wetter at the bottom
    const box = { x: CX - 122, y: 150, w: 244, h: 122 };
    const toe = ell(CX + 46, 166, 20, 15, -0.3);
    prop(ctx, [mound, toe], box, (g, sil) => {
      sil.form({ base: sand, shadowTint: '#7a4a1a', ramp: 0.75, form: 0.55, formSize: 24, bevel: 0.35, rim: 0.4 });
      // the big toe poking out of the sand, nail and all
      within(g, toe, () => {
        g.fillStyle = vgrad(g, 150, 182, [[0, shade(art.skin, 0.15)], [1, shade(art.skin, -0.25)]]);
        g.fillRect(CX + 20, 148, 54, 36);
        const nail = ell(CX + 50, 160, 9, 7, -0.3);
        piece(g, nail, box, 'plastic', art.nails ?? '#ff8a5c', { shadow: 0.3 });
        glint(g, CX + 47, 157, 2.5, 0.9);
      });
      within(g, mound, () => {
        texture(g, 'speckle', box, 0.55, 1);
        texture(g, 'grain', box, 0.4, 1, 'soft-light');
        g.fillStyle = vgrad(g, 200, 270, [[0, rgba('#6a4010', 0)], [1, rgba('#6a4010', 0.35)]]);
        g.fillRect(box.x, 200, box.w, 70);
        // where the ankle and toe go into the sand: soft hollows
        ao(g, CX - 8, 166, 56, 8, 0.35, 0, '#5a3008');
        ao(g, CX + 46, 178, 22, 6, 0.35, 0, '#5a3008');
        // ripples and footprints of sand grains
        const r = rng(hashStr('sandy'));
        for (let i = 0; i < 6; i++) {
          const y = 190 + i * 12;
          crease(g, (c) => {
            c.moveTo(CX - 100 + r() * 30, y);
            c.quadraticCurveTo(CX, y + 6 + r() * 4, CX + 90 - r() * 30, y - 2);
          }, 1.6, '#7a5020', 0.2, 0.3);
        }
        for (let i = 0; i < 260; i++) {
          g.fillStyle = rgba(r() < 0.5 ? '#ffffff' : '#6a4010', 0.25 + r() * 0.35);
          g.beginPath();
          g.arc(box.x + r() * box.w, 160 + r() * 110, 0.5 + r() * 1.1, 0, Math.PI * 2);
          g.fill();
        }
      });
      starfish(g, CX - 26, 222, 16, 0.3, '#ff7a4a');
      shell(g, CX + 62, 236, 1.15, 0.4, '#ffd2c4');
      shell(g, CX - 78, 246, 0.8, -0.5, '#f4e6d0');
    }, inkOf(sand));
  },
});

// ════════════════════════ Seaweed Steph ════════════════════════
// Green-tinged skin fresh from the shallows, kelp ribbons draped over the foot and hanging below the toes with
// little air bladders. In play the kelp sways on springs and seawater drips off it.

/** The kelp ribbons: root (on the ankle), length, sway direction. */
export const KELP: [number, number, number, number][] = [
  [CX - 48, 34, 236, -1],
  [CX - 14, 30, 214, -0.4],
  [CX + 24, 36, 228, 0.5],
  [CX + 56, 40, 206, 1],
];

function kelpPath(i: number): PathFn {
  const [x, y, len, d] = KELP[i];
  return (c) => {
    c.beginPath();
    const n = 8;
    const left: [number, number][] = [];
    const right: [number, number][] = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const cx = x + Math.sin(t * 5 + i) * 7 + d * t * t * 12;
      const cy = y + t * len;
      const w = 5 + Math.sin(t * Math.PI) * 6 - t * 2;
      left.push([cx - w, cy]);
      right.push([cx + w, cy]);
    }
    c.moveTo(left[0][0], left[0][1]);
    for (const [px, py] of left) c.lineTo(px, py);
    const [ex, ey] = left[n];
    c.quadraticCurveTo(ex + 4, ey + 10, right[n][0], right[n][1]);
    for (let k = n; k >= 0; k--) c.lineTo(right[k][0], right[k][1]);
    c.closePath();
  };
}

function paintKelp(g: Ctx, i: number, dark: string, light: string): void {
  const [x, y, len] = KELP[i];
  const p = kelpPath(i);
  const box = { x: x - 24, y: y - 4, w: 48, h: len + 20 };
  const s = new Sil(g, [p], box);
  const sg = s.g;
  sg.fillStyle = hgrad(sg, x - 14, x + 14, [[0, shade(dark, 0.3)], [0.4, dark], [1, shade(dark, -0.4)]]);
  sg.fillRect(box.x, box.y, box.w, box.h);
  texture(sg, 'grain', box, 0.3, 1);
  // the midrib and a wet sheen
  softStroke(sg, (c) => {
    for (let k = 0; k <= 10; k++) {
      const t = k / 10;
      const cx = x + Math.sin(t * 5 + i) * 7 + KELP[i][3] * t * t * 12;
      if (k) c.lineTo(cx, y + t * len);
      else c.moveTo(cx, y);
    }
  }, rgba(light, 0.55), 2, 0.8);
  spec(sg, x - 4, y + len * 0.3, 3, len * 0.2, 0.5, 0.1);
  // air bladders
  for (const t of [0.35, 0.62, 0.86]) {
    const cx = x + Math.sin(t * 5 + i) * 7 + KELP[i][3] * t * t * 12 + 7;
    const cy = y + t * len;
    piece(sg, ell(cx, cy, 4.5, 5.5), box, 'slime', '#c8d84a', { shadow: 0.4 });
  }
  s.finish(inkOf(dark), { w: 3.6, inner: 0.4 });
}

registerStyle('seaweed', {
  rig: BARE_RIG,
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 24 },
  parts: Object.fromEntries(KELP.map(([x, y, len], i) => [
    `kelp${i}`,
    { box: { x: x - 28, y: y - 6, w: 56, h: len + 26 }, frames: 1, pivot: [x, y] as [number, number], draw: (g: Ctx, art: FootArt) => paintKelp(g, i, art.primary ?? '#3f8a3a', art.secondary ?? '#7cc45a') },
  ])),
  draw(ctx, art, p, o) {
    const dark = art.primary ?? '#3f8a3a';
    const light = art.secondary ?? '#7cc45a';
    bareWith(ctx, { skin: art.skin, nails: art.nails, shadowTint: '#1a4a3a', pores: 0.3 }, p, (g, f) => {
      // wet: beads of water and a cold sheen
      const r = rng(hashStr('seaweed'));
      for (let i = 0; i < 26; i++) {
        const x = f.box.x + 20 + r() * (f.box.w - 40);
        const y = 20 + r() * 220;
        const s = 1.6 + r() * 2.6;
        piece(g, ell(x, y, s, s * 1.2), f.box, 'glass', '#dff4ff', { shadow: 0.25 });
        glint(g, x - s * 0.3, y - s * 0.4, s * 0.6, 0.9);
      }
      spec(g, CX - 40, 90, 40, 18, 0.25, -0.6, LIGHT.rim);
      // bits of algae on the toes
      for (const t of f.toes) {
        const [x, y] = onToe(t, -Math.PI / 2);
        softFill(g, ell(x, y + t.ry * 0.6, t.rx * 0.6, 5), rgba(dark, 0.45), 2);
      }
    }, inkOf(mix(art.skin, '#1a4a3a', 0.4)));
    if (!o.live) for (let i = 0; i < KELP.length; i++) paintKelp(ctx, i, dark, light);
  },
});

// ════════════════════════ Coconut Kev ════════════════════════
// Toes tucked into a polished coconut half: fibrous husk, three dark eyes, a rim of white meat and a pink cocktail
// umbrella. In play the shell gleams (until the first smack scuffs it) and the umbrella spins in the breeze.

const COCO_TOP = 168;
const cocoShell: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 104, COCO_TOP);
  c.bezierCurveTo(CX - 106, 232, CX - 60, 270, CX, 270);
  c.bezierCurveTo(CX + 60, 270, CX + 106, 232, CX + 104, COCO_TOP);
  c.ellipse(CX, COCO_TOP, 104, 14, 0, 0, Math.PI, true);
  c.closePath();
};

/** The cocktail umbrella (pivot at its stick's foot in the shell). */
export const UMB_PIVOT: [number, number] = [CX + 70, 172];
function umbrella(g: Ctx, pink: string): void {
  const [px, py] = UMB_PIVOT;
  g.save();
  g.lineCap = 'round';
  g.strokeStyle = '#6a4a2a';
  g.lineWidth = 4.2;
  g.beginPath();
  g.moveTo(px, py);
  g.lineTo(px + 26, py - 82);
  g.stroke();
  g.strokeStyle = '#e8d8b8';
  g.lineWidth = 2.4;
  g.stroke();
  g.restore();
  const cx = px + 28;
  const cy = py - 84;
  const canopy: PathFn = (c) => {
    c.beginPath();
    c.moveTo(cx - 32, cy + 10);
    c.quadraticCurveTo(cx - 20, cy - 22, cx + 4, cy - 22);
    c.quadraticCurveTo(cx + 30, cy - 18, cx + 36, cy + 8);
    c.quadraticCurveTo(cx + 24, cy + 2, cx + 14, cy + 8);
    c.quadraticCurveTo(cx + 2, cy + 2, cx - 8, cy + 9);
    c.quadraticCurveTo(cx - 20, cy + 3, cx - 32, cy + 10);
    c.closePath();
  };
  prop(g, [canopy], { x: cx - 36, y: cy - 26, w: 76, h: 40 }, (pg, sil) => {
    sil.form({ base: pink, shadowTint: '#6a1040', ramp: 0.7, form: 0.4, formSize: 8, bevel: 0.3, rim: 0.4 });
    texture(pg, 'canvas', { x: cx - 36, y: cy - 26, w: 76, h: 40 }, 0.3, 0.8);
    pg.strokeStyle = rgba('#ffffff', 0.85);
    pg.lineWidth = 3;
    for (const k of [-1, 0, 1]) {
      pg.beginPath();
      pg.moveTo(cx + 2, cy - 20);
      pg.quadraticCurveTo(cx + k * 14, cy - 8, cx + k * 20 + 2, cy + 8);
      pg.stroke();
    }
  }, inkOf(pink), { w: 3.4 });
}

registerStyle('coconut', {
  contactY: 270,
  halfWidth: 110,
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 24 },
  parts: {
    umbrella: { box: { x: UMB_PIVOT[0] - 14, y: UMB_PIVOT[1] - 112, w: 90, h: 120 }, frames: 1, pivot: UMB_PIVOT, draw: (g, art) => umbrella(g, art.secondary ?? '#ff5a8a') },
  },
  draw(ctx, art, p, o) {
    const husk = art.primary ?? '#6b3e1e';
    const box = { x: CX - 110, y: COCO_TOP - 16, w: 220, h: 124 };
    prop(ctx, [cocoShell], box, (g, sil) => {
      sil.form({ base: husk, shadowTint: '#1a0804', ramp: 0.85, form: 0.6, formSize: 22, bevel: 0.4, rim: 0.6 });
      texture(g, 'wood', box, 0.35, 1.1);
      // the husk's fibres, combed down the shell
      const r = rng(hashStr('coconut'));
      g.lineCap = 'round';
      for (let i = 0; i < 260; i++) {
        const x = box.x + r() * box.w;
        const y = COCO_TOP + 6 + r() * 96;
        const l = 6 + r() * 12;
        g.strokeStyle = rgba(r() < 0.6 ? shade(husk, -0.45) : shade(husk, 0.35), 0.35 + r() * 0.4);
        g.lineWidth = 0.7 + r();
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + (x - CX) * 0.04, y + l * 0.5, x + (x - CX) * 0.08, y + l);
        g.stroke();
      }
      // polished: a hard gloss across the lit side (scuffed off by the first smack)
      spec(g, CX - 52, COCO_TOP + 40, 34, 14, 0.8, -0.4);
      spec(g, CX - 60, COCO_TOP + 36, 10, 4, 1, -0.4);
      // three eyes: a face
      for (const [x, y, rr] of [[CX - 22, COCO_TOP + 58, 8], [CX + 22, COCO_TOP + 58, 8], [CX, COCO_TOP + 80, 7]] as const) {
        contact(g, (c) => {
          c.beginPath();
          c.ellipse(x, y, rr, rr * 0.85, 0, 0, Math.PI * 2);
          c.fill();
        }, 0.5, -1.5, 2, '#ffffff');
        g.fillStyle = vgrad(g, y - rr, y + rr, [[0, '#0a0402'], [1, shade(husk, -0.4)]]);
        g.beginPath();
        g.ellipse(x, y, rr, rr * 0.85, 0, 0, Math.PI * 2);
        g.fill();
      }
      // the rim of white meat round the opening, and the dark inside behind the ankle
      within(g, ell(CX, COCO_TOP, 104, 14), () => {
        g.fillStyle = vgrad(g, COCO_TOP - 14, COCO_TOP + 14, [[0, '#2a1006'], [1, '#5a3010']]);
        g.fillRect(box.x, COCO_TOP - 16, box.w, 32);
      });
      g.strokeStyle = '#fbf6ea';
      g.lineWidth = 6;
      g.beginPath();
      g.ellipse(CX, COCO_TOP, 101, 11.5, 0, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = rgba('#c8b898', 0.8);
      g.lineWidth = 1.4;
      g.beginPath();
      g.ellipse(CX, COCO_TOP + 2, 101, 11.5, 0, 0.1, Math.PI - 0.1);
      g.stroke();
    }, inkOf(husk));
    // the ankle comes up out of the shell: redraw the foot above the near rim
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-60, -40);
    ctx.lineTo(280, -40);
    ctx.lineTo(280, COCO_TOP);
    ctx.ellipse(CX, COCO_TOP, 96, 10, 0, 0, Math.PI, false);
    ctx.lineTo(-60, COCO_TOP);
    ctx.closePath();
    ctx.clip();
    bareWith(ctx, { skin: art.skin, nails: art.nails }, p);
    ctx.restore();
    ao(ctx, CX, COCO_TOP + 4, 70, 6, 0.4, 0, '#1a0804');
    if (!o.live) umbrella(ctx, art.secondary ?? '#ff5a8a');
  },
});

// ════════════════════════ Tidepool Tess ════════════════════════
// A whole rock pool on her foot: sea-glass skin, barnacles down the side, mussels, a glowing pink anemone and a
// starfish on the big toe. In play the anemone pulses (brighter as she heals) and bubbles rise off her.

const ANEMONE: [number, number] = [CX + 4, 96];

function anemone(g: Ctx, pink: string, glowOnly: boolean): void {
  const [x, y] = ANEMONE;
  const r = rng(hashStr('anemone'));
  if (!glowOnly) {
    piece(g, ell(x, y + 10, 22, 10), { x: x - 22, y: y, w: 44, h: 20 }, 'slime', shade(pink, -0.25), { shadow: 0.5 });
  }
  g.save();
  g.lineCap = 'round';
  for (let i = 0; i < 22; i++) {
    const a = -Math.PI + (i / 21) * Math.PI;
    const len = 16 + r() * 12;
    const bx = x + Math.cos(a) * 16;
    const by = y + 8 + Math.sin(a) * 5;
    const tx = bx + Math.cos(a) * len * 0.6;
    const ty = by + Math.sin(a) * len - 4;
    if (glowOnly) {
      g.strokeStyle = rgba(mix(pink, '#ffffff', 0.4), 0.8);
      g.lineWidth = 3.4;
    } else {
      g.strokeStyle = shade(pink, -0.35);
      g.lineWidth = 4.4;
      g.beginPath();
      g.moveTo(bx, by);
      g.quadraticCurveTo(bx + Math.cos(a) * 4, by - 10, tx, ty);
      g.stroke();
      g.strokeStyle = pink;
      g.lineWidth = 2.8;
    }
    g.beginPath();
    g.moveTo(bx, by);
    g.quadraticCurveTo(bx + Math.cos(a) * 4, by - 10, tx, ty);
    g.stroke();
    g.fillStyle = glowOnly ? rgba('#ffffff', 0.9) : mix(pink, '#ffffff', 0.6);
    g.beginPath();
    g.arc(tx, ty, glowOnly ? 2.4 : 2, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

function barnacle(g: Ctx, x: number, y: number, s: number): void {
  const p = ell(x, y, s, s * 0.85);
  piece(g, p, { x: x - s, y: y - s, w: s * 2, h: s * 2 }, 'stone', '#d8d4c8', { shadow: 0.45 });
  g.fillStyle = '#3a3a40';
  g.beginPath();
  g.ellipse(x + 0.5, y + 0.5, s * 0.38, s * 0.3, 0.3, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = rgba('#8a8478', 0.7);
  g.lineWidth = 0.8;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    g.beginPath();
    g.moveTo(x + Math.cos(a) * s * 0.45, y + Math.sin(a) * s * 0.38);
    g.lineTo(x + Math.cos(a) * s * 0.92, y + Math.sin(a) * s * 0.8);
    g.stroke();
  }
}

registerStyle('tidepool', {
  rig: BARE_RIG,
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 24 },
  draw(ctx, art, p, o) {
    const pink = art.secondary ?? '#e8508a';
    const orange = art.primary ?? '#ff8a3c';
    if (o.emissive) {
      glowLayer(ctx, [ell(ANEMONE[0], ANEMONE[1] - 6, 60, 40)], { x: CX - 70, y: 40, w: 150, h: 90 }, (g) => anemone(g, pink, true));
      return;
    }
    bareWith(ctx, { skin: art.skin, nails: art.nails, shadowTint: '#1a4a5a', pores: 0.25 }, p, (g, f) => {
      // sea glass: cool caustic light rippling across the skin
      const r = rng(hashStr('tidepool'));
      for (let i = 0; i < 14; i++) {
        const x = f.box.x + r() * f.box.w;
        const y = 10 + r() * 200;
        softStroke(g, (c) => {
          c.moveTo(x, y);
          c.quadraticCurveTo(x + 12, y - 6, x + 24, y + 2);
        }, rgba('#e8ffff', 0.25), 3, 1.5);
      }
      // barnacles down the outer side, mussels by the arch
      for (const [x, y, s] of [[CX - 80, 110, 7], [CX - 86, 132, 9], [CX - 72, 150, 6], [CX - 90, 160, 7.5], [CX - 66, 128, 5], [CX - 58, 52, 6], [CX - 64, 72, 7]] as const) barnacle(g, x, y, s);
      for (const [x, y, rot] of [[CX + 74, 120, 0.6], [CX + 84, 140, 0.9]] as const) {
        const m = ell(x, y, 6, 13, rot);
        piece(g, m, { x: x - 8, y: y - 14, w: 16, h: 28 }, 'enamel', '#2a2a5a', { shadow: 0.45 });
      }
      anemone(g, pink, false);
      // the starfish on the big toe
      const t = f.toes[4];
      const [sx, sy] = onToe(t, Math.PI / 2 - 0.2);
      starfish(g, sx + 4, sy - t.ry * 0.7, 20, -0.4, orange);
    }, inkOf(mix(art.skin, '#1a3a4a', 0.5)));
  },
});

// ════════════════════════ Riot Ryan ════════════════════════
// A black tactical boot behind a clear riot shield (scratched polycarbonate, a stencilled RIOT and a steel frame).
// In play a blue glint sweeps the shield before it drops, and the boot's lugs kick grit when it lands.

const RIOT = { topW: 60, ballW: 98, toeY: 240 };
const shieldPath: PathFn = (c) => {
  c.beginPath();
  c.roundRect(CX - 94, 26, 188, 190, 14);
};

registerStyle('riot', {
  contactY: 266,
  rig: { from: 216, to: 232 },
  leg: { kind: 'wool', hw: 68, join: 'hem' },
  draw(ctx, art, p) {
    const black = art.primary ?? '#1d1f24';
    const blue = art.secondary ?? '#9fc4e8';
    const flex = Math.max(0, p.curl);
    const upper = upperPath(RIOT, flex);
    const sole = solePath(RIOT, flex, 24, 176, 6);
    const box = { x: CX - 108, y: -10, w: 216, h: 280 };
    const sil = new Sil(ctx, [sole, upper, shieldPath], box);
    const g = sil.g;
    // the lug sole
    within(g, sole, () => {
      g.fillStyle = vgrad(g, 176, 268, [[0, '#3a3c42'], [1, '#0c0c10']]);
      g.fillRect(box.x, 170, box.w, 100);
      texture(g, 'rubber', box, 0.35);
      for (let x = CX - 92; x <= CX + 84; x += 16) {
        g.fillStyle = '#08080a';
        g.beginPath();
        g.roundRect(x, 252 - flex * 5, 10, 14, 2);
        g.fill();
        g.fillStyle = rgba('#8a8e98', 0.35);
        g.fillRect(x + 1, 252 - flex * 5, 8, 1.5);
      }
    });
    // the boot: matte black leather with ballistic nylon panels
    piece(g, upper, box, 'leather', black, { shadow: 0.4 });
    within(g, upper, () => {
      texture(g, 'canvas', { x: CX - 100, y: 0, w: 200, h: 120 }, 0.35, 1.2);
      for (let i = 0; i < 6; i++) rivet(g, CX - 22 + (i % 2) * 44, 20 + Math.floor(i / 2) * 26, 3.2, '#5a5e68');
    });
    // the shield: polycarbonate over the boot, the boot seen through it tinted
    within(g, shieldPath, () => {
      g.fillStyle = rgba(blue, 0.38);
      g.fillRect(box.x, 20, box.w, 200);
      g.fillStyle = hgrad(g, CX - 94, CX + 94, [[0, rgba('#ffffff', 0.25)], [0.3, rgba('#ffffff', 0.05)], [0.7, rgba('#000000', 0)], [1, rgba('#000020', 0.25)]]);
      g.fillRect(box.x, 20, box.w, 200);
      // scratches
      const r = rng(hashStr('riot'));
      g.strokeStyle = rgba('#ffffff', 0.25);
      g.lineWidth = 0.7;
      for (let i = 0; i < 26; i++) {
        const x = CX - 90 + r() * 180;
        const y = 30 + r() * 180;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 10);
        g.stroke();
      }
      // two long diagonal reflections
      for (const [x0, w, a] of [[-70, 26, 0.32], [-30, 10, 0.24]] as const) {
        g.fillStyle = rgba('#ffffff', a);
        g.beginPath();
        g.moveTo(CX + x0, 26);
        g.lineTo(CX + x0 + w, 26);
        g.lineTo(CX + x0 + w + 90, 216);
        g.lineTo(CX + x0 + 90, 216);
        g.closePath();
        g.fill();
      }
      // the stencil: RIOT, white, a little worn
      g.save();
      g.font = '900 34px "Arial Black", Impact, sans-serif';
      g.textAlign = 'center';
      g.fillStyle = rgba('#000000', 0.35);
      g.fillText('RIOT', CX + 1.5, 77.5);
      g.fillStyle = rgba('#ffffff', 0.92);
      g.fillText('RIOT', CX, 76);
      g.restore();
      blotches(g, { x: CX - 50, y: 44, w: 100, h: 40 }, '#000000', 0.5, 5, 0.62, 0.05, 31, 'destination-out');
      // a view slit band
      g.fillStyle = rgba('#000000', 0.25);
      g.fillRect(CX - 94, 150, 188, 6);
      g.fillStyle = rgba('#ffffff', 0.3);
      g.fillRect(CX - 94, 156, 188, 1.5);
    });
    // the frame: a steel edge round the shield with bolts
    g.save();
    g.lineJoin = 'round';
    shieldPath(g);
    g.strokeStyle = '#2a2e36';
    g.lineWidth = 7;
    g.stroke();
    shieldPath(g);
    g.strokeStyle = hgrad(g, CX - 94, CX + 94, [[0, '#d8e0ea'], [0.5, '#8a929c'], [1, '#4a5058']]);
    g.lineWidth = 4;
    g.stroke();
    g.restore();
    for (const [x, y] of [[CX - 86, 34], [CX + 86, 34], [CX - 86, 208], [CX + 86, 208]] as const) rivet(g, x, y, 3, '#c8ced8');
    finishLight(sil, black, '#101828', 0.3);
    sil.finish(inkOf(shade(black, 0.15)), { openTop: -5 });
  },
});

// ════════════════════════ Waffle Wanda ════════════════════════
// Her foot baked into a crispy waffle: deep golden pockets, a pat of butter melting on top, maple syrup running
// over the edge. In play crumbs fall off her, and syrup drips; each crack throws a shower of crumbs.

const WAF_TOP = 120;
const waffle: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 98, WAF_TOP + 10);
  c.quadraticCurveTo(CX, WAF_TOP - 14, CX + 98, WAF_TOP + 10);
  c.bezierCurveTo(CX + 104, 190, CX + 96, 262, CX, 264);
  c.bezierCurveTo(CX - 96, 262, CX - 104, 190, CX - 98, WAF_TOP + 10);
  c.closePath();
};

registerStyle('waffle', {
  contactY: 266,
  leg: { kind: 'denim', hw: 70, join: 'hem' },
  draw(ctx, art, p) {
    const gold = art.primary ?? '#e0a046';
    const butter = art.secondary ?? '#ffe07a';
    // only the ankle shows: the rest is baked in
    ctx.save();
    ctx.beginPath();
    ctx.rect(-60, -40, 340, WAF_TOP + 70);
    ctx.clip();
    bareWith(ctx, { skin: art.skin, nails: art.nails }, p);
    ctx.restore();
    const box = { x: CX - 104, y: WAF_TOP - 16, w: 208, h: 152 };
    const syrup: PathFn[] = [dripPath(CX + 50, WAF_TOP + 4, 70, 7), dripPath(CX + 74, WAF_TOP + 6, 44, 5.5), dripPath(CX - 64, WAF_TOP + 8, 28, 5)];
    prop(ctx, [waffle, ...syrup], { x: box.x, y: box.y, w: box.w, h: box.h + 20 }, (g, sil) => {
      sil.form({ base: gold, shadowTint: '#5a2008', ramp: 0.8, form: 0.55, formSize: 22, bevel: 0.4, rim: 0.45 });
      within(g, waffle, () => {
        texture(g, 'cast', box, 0.25, 1);
        // the grid: raised ridges, deep pockets
        const step = 22;
        for (let y = WAF_TOP - 8; y < 270; y += step)
          for (let x = CX - 110; x < CX + 110; x += step) {
            const pk = rrect(x + 4, y + 4, step - 8, step - 8, 3);
            within(g, pk, () => {
              g.fillStyle = vgrad(g, y + 4, y + step - 4, [[0, shade(gold, -0.45)], [0.5, shade(gold, -0.15)], [1, shade(gold, 0.2)]]);
              g.fillRect(x, y, step, step);
            });
            spec(g, x + 2, y + 2, 4, 2, 0.35, -0.6);
          }
        // toasted edges
        g.fillStyle = vgrad(g, 220, 266, [[0, rgba('#5a2008', 0)], [1, rgba('#5a2008', 0.4)]]);
        g.fillRect(box.x, 220, box.w, 50);
      });
      // syrup: glossy amber over the waffle, pooling in the pockets
      const amber = '#a8540e';
      softFill(g, (c) => {
        c.beginPath();
        c.moveTo(CX + 10, WAF_TOP + 6);
        c.bezierCurveTo(CX + 60, WAF_TOP - 4, CX + 96, WAF_TOP + 6, CX + 92, WAF_TOP + 30);
        c.bezierCurveTo(CX + 70, WAF_TOP + 44, CX + 30, WAF_TOP + 36, CX + 10, WAF_TOP + 6);
      }, rgba(amber, 0.85), 1.2);
      for (const d of syrup) within(g, d, () => {
        g.fillStyle = vgrad(g, WAF_TOP, WAF_TOP + 90, [[0, amber], [1, shade(amber, -0.3)]]);
        g.fillRect(box.x, WAF_TOP - 10, box.w, 110);
      });
      spec(g, CX + 46, WAF_TOP + 14, 18, 4, 0.8, -0.1);
      for (const [x, y] of [[CX + 50, WAF_TOP + 70], [CX + 74, WAF_TOP + 46], [CX - 64, WAF_TOP + 32]] as const) glint(g, x - 2, y + 1, 3.4, 0.9);
      // the butter pat, softening at the corners
      const pat: PathFn = (c) => {
        c.beginPath();
        c.moveTo(CX - 40, WAF_TOP + 14);
        c.quadraticCurveTo(CX - 10, WAF_TOP + 4, CX + 6, WAF_TOP + 14);
        c.quadraticCurveTo(CX + 12, WAF_TOP + 34, CX - 2, WAF_TOP + 42);
        c.quadraticCurveTo(CX - 26, WAF_TOP + 48, CX - 44, WAF_TOP + 38);
        c.quadraticCurveTo(CX - 48, WAF_TOP + 24, CX - 40, WAF_TOP + 14);
        c.closePath();
      };
      piece(g, pat, box, 'plastic', butter, { shadow: 0.5 });
      softFill(g, ell(CX - 20, WAF_TOP + 48, 26, 6), rgba(butter, 0.6), 3);
      spec(g, CX - 26, WAF_TOP + 18, 12, 4, 0.8, -0.2);
    }, inkOf(gold));
  },
});

// ════════════════════════ Ketchup Kenny ════════════════════════
// A red squeeze bottle with a foot inside: glossy plastic, a label with a tomato, a ribbed white cap and nozzle,
// and a blob of ketchup swelling on the tip. In play the blob drips off and splats when he lands.

const bottle: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 54, -6);
  c.bezierCurveTo(CX - 56, 40, CX - 94, 60, CX - 96, 110);
  c.lineTo(CX - 96, 196);
  c.bezierCurveTo(CX - 96, 222, CX - 64, 230, CX - 36, 232);
  c.lineTo(CX + 36, 232);
  c.bezierCurveTo(CX + 64, 230, CX + 96, 222, CX + 96, 196);
  c.lineTo(CX + 96, 110);
  c.bezierCurveTo(CX + 94, 60, CX + 56, 40, CX + 54, -6);
  c.closePath();
};
const capPath: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 54, 222);
  c.lineTo(CX + 54, 222);
  c.lineTo(CX + 38, 262);
  c.quadraticCurveTo(CX, 268, CX - 38, 262);
  c.closePath();
};
const nozzle: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 12, 260);
  c.lineTo(CX - 6, 280);
  c.lineTo(CX + 6, 280);
  c.lineTo(CX + 12, 260);
  c.closePath();
};

registerStyle('ketchup', {
  contactY: 284,
  halfWidth: 100,
  leg: { kind: 'denim', hw: 62, join: 'hem' },
  draw(ctx, art, _p, o) {
    const red = art.primary ?? '#d81f1f';
    const white = art.secondary ?? '#f7f5ef';
    const blob = ell(CX, 288, 11, 10);
    const box = { x: CX - 100, y: -10, w: 200, h: 310 };
    const sil = new Sil(ctx, o.live ? [bottle, capPath, nozzle] : [bottle, capPath, nozzle, blob], box);
    const g = sil.g;
    // the bottle: glossy red plastic, ketchup inside darker at the bottom
    piece(g, bottle, box, 'plastic', red, { shadow: 0, spec: false });
    within(g, bottle, () => {
      g.fillStyle = vgrad(g, 120, 232, [[0, rgba('#5a0404', 0)], [1, rgba('#5a0404', 0.35)]]);
      g.fillRect(box.x, 120, box.w, 120);
      // the label
      const lab = rrect(CX - 110, 96, 220, 74, 0);
      g.fillStyle = vgrad(g, 96, 170, [[0, '#ffffff'], [1, shade(white, -0.1)]]);
      lab(g);
      g.fill();
      texture(g, 'grain', { x: CX - 100, y: 96, w: 200, h: 74 }, 0.2, 1);
      g.fillStyle = hgrad(g, CX - 96, CX + 96, [[0, rgba('#000000', 0.18)], [0.3, rgba('#000000', 0)], [0.8, rgba('#000000', 0.08)], [1, rgba('#000020', 0.3)]]);
      g.fillRect(CX - 100, 96, 200, 74);
      for (const y of [96, 170]) {
        g.fillStyle = rgba('#7a0808', 0.6);
        g.fillRect(CX - 100, y - 1.5, 200, 3);
      }
      // the tomato on the label
      piece(g, ell(CX - 58, 134, 17, 15), box, 'plastic', '#e5242f', { shadow: 0.35 });
      const leaf = (c: Ctx) => {
        c.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
          const rr = i % 2 ? 3 : 9;
          c.lineTo(CX - 58 + Math.cos(a) * rr, 121 + Math.sin(a) * rr * 0.6);
        }
        c.closePath();
      };
      piece(g, leaf, box, 'plastic', '#3f9a3a', { shadow: 0.3 });
      g.save();
      g.font = '900 20px "Arial Black", Impact, sans-serif';
      g.textAlign = 'center';
      g.fillStyle = shade(red, -0.1);
      g.fillText('KETCHUP', CX + 16, 142, 116);
      g.restore();
      // the plastic's gloss: long vertical highlights, bright on the lit side
      spec(g, CX - 66, 60, 8, 50, 0.85, 0.05);
      spec(g, CX - 66, 200, 7, 22, 0.7, 0.05);
      spec(g, CX - 50, 30, 4, 30, 0.5, 0.2);
      spec(g, CX + 78, 150, 4, 50, 0.35, 0, LIGHT.rim);
    });
    // the cap: ribbed white plastic
    piece(g, capPath, box, 'plastic', white, { shadow: 0.45 });
    within(g, capPath, () => {
      g.strokeStyle = rgba('#000000', 0.14);
      g.lineWidth = 2;
      for (let i = -3; i <= 3; i++) {
        g.beginPath();
        g.moveTo(CX + i * 13, 226);
        g.lineTo(CX + i * 10, 260);
        g.stroke();
      }
    });
    piece(g, nozzle, box, 'plastic', white, { shadow: 0.4 });
    if (!o.live) {
      piece(g, blob, box, 'sauce', red, { shadow: 0.3 });
      glint(g, CX - 4, 284, 3.4, 1);
    }
    finishLight(sil, red, '#3a0410', 0.25);
    sil.finish(inkOf(red), { openTop: -5 });
  },
});

// ════════════════════════ Fry Cook Fran ════════════════════════
// Clocked in: her foot sits in a wire fry basket heaped with golden fries, a red-handled basket hanging off the
// side. In play the basket sizzles and spits grease, and a heat shimmer rises.

const BASKET_TOP = 150;
const basket: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 100, BASKET_TOP);
  c.lineTo(CX + 100, BASKET_TOP);
  c.lineTo(CX + 92, 252);
  c.quadraticCurveTo(CX + 90, 262, CX + 78, 262);
  c.lineTo(CX - 78, 262);
  c.quadraticCurveTo(CX - 90, 262, CX - 92, 252);
  c.closePath();
};
const handle: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX + 94, BASKET_TOP + 8);
  c.lineTo(CX + 126, 74);
  c.lineTo(CX + 138, 80);
  c.lineTo(CX + 104, BASKET_TOP + 16);
  c.closePath();
};

registerStyle('frycook', {
  contactY: 266,
  leg: { kind: 'wool', hw: 68, join: 'hem' },
  draw(ctx, art, p) {
    const steel = art.primary ?? '#c7ccd4';
    const gold = art.secondary ?? '#ffcf3a';
    ctx.save();
    ctx.beginPath();
    ctx.rect(-60, -40, 340, BASKET_TOP + 80);
    ctx.clip();
    bareWith(ctx, { skin: art.skin, nails: art.nails }, p, (g) => {
      // greasy shine on the skin by the basket
      spec(g, CX - 30, 132, 50, 10, 0.25, -0.1);
    });
    ctx.restore();
    const r = rng(hashStr('frycook'));
    // fries sticking up out of the basket (behind its front wires)
    const fries: PathFn[] = [];
    const fryData: [number, number, number, number][] = [];
    for (let i = 0; i < 15; i++) {
      const x = CX - 88 + i * 12.5 + (r() - 0.5) * 6;
      const h = 22 + r() * 34;
      const a = (r() - 0.5) * 0.5;
      fryData.push([x, h, a, 0]);
      fries.push((c) => {
        c.save();
        c.translate(x, BASKET_TOP + 10);
        c.rotate(a);
        c.beginPath();
        c.roundRect(-5, -h, 10, h + 20, 2);
        c.restore();
      });
    }
    const box = { x: CX - 104, y: BASKET_TOP - 70, w: 250, h: 190 };
    prop(ctx, [...fries, basket, handle], box, (g) => {
      // the fries: golden, crisp at the ends
      fries.forEach((f, i) => {
        const [x, h] = fryData[i];
        within(g, f, () => {
          g.fillStyle = hgrad(g, x - 8, x + 8, [[0, shade(gold, 0.3)], [0.5, gold], [1, shade(gold, -0.35)]]);
          g.fillRect(x - 20, BASKET_TOP - h - 20, 40, h + 40);
          g.fillStyle = rgba('#a8580a', 0.45);
          g.fillRect(x - 20, BASKET_TOP + 10 - h - 4, 40, 6);
          texture(g, 'pores', box, 0.3, 1);
        });
        contact(g, (c) => {
          f(c);
          c.fill();
        }, 0.3, 2, 2);
      });
      // inside the basket: more fries in a heap, behind the mesh
      within(g, basket, () => {
        g.fillStyle = vgrad(g, BASKET_TOP, 262, [[0, shade(gold, -0.1)], [1, shade(gold, -0.5)]]);
        g.fillRect(box.x, BASKET_TOP, box.w, 120);
        for (let i = 0; i < 40; i++) {
          const x = CX - 90 + r() * 180;
          const y = BASKET_TOP + 6 + r() * 100;
          g.save();
          g.translate(x, y);
          g.rotate(r() * Math.PI);
          g.fillStyle = hgrad(g, -14, 14, [[0, shade(gold, 0.2)], [1, shade(gold, -0.3)]]);
          g.beginPath();
          g.roundRect(-16, -4, 32, 8, 2);
          g.fill();
          g.restore();
        }
        ao(g, CX, BASKET_TOP + 6, 100, 10, 0.4, 0, '#3a1a04');
        // the wire mesh: lit steel strands in a square weave
        g.lineWidth = 2;
        for (let k = -12; k <= 12; k++) {
          for (const dir of [-1, 1]) {
            g.strokeStyle = rgba('#2a2e36', 0.8);
            g.lineWidth = 3;
            g.beginPath();
            g.moveTo(CX + k * 16, BASKET_TOP);
            g.lineTo(CX + k * 16 + dir * 112, 262);
            g.stroke();
            g.strokeStyle = rgba(shade(steel, 0.3), 0.95);
            g.lineWidth = 1.4;
            g.stroke();
          }
        }
        g.fillStyle = hgrad(g, CX - 100, CX + 100, [[0, rgba('#ffffff', 0.15)], [0.4, rgba('#ffffff', 0)], [1, rgba('#000020', 0.3)]]);
        g.fillRect(box.x, BASKET_TOP, box.w, 120);
      });
      // the rim and frame: a rolled steel band
      g.save();
      g.lineCap = 'round';
      for (const [w, col] of [[8, '#2a2e36'], [5, steel], [1.6, '#ffffff']] as const) {
        g.strokeStyle = col;
        g.lineWidth = w;
        g.beginPath();
        g.moveTo(CX - 100, BASKET_TOP + (w === 1.6 ? -1 : 0));
        g.lineTo(CX + 100, BASKET_TOP + (w === 1.6 ? -1 : 0));
        g.stroke();
      }
      g.restore();
      // the handle: steel rod into a red grip
      within(g, handle, () => {
        g.fillStyle = hgrad(g, CX + 94, CX + 138, [[0, '#f0f4f8'], [0.5, steel], [1, '#5a6068']]);
        g.fillRect(CX + 90, 70, 52, 100);
        const grip: PathFn = (c) => {
          c.beginPath();
          c.moveTo(CX + 110, 112);
          c.lineTo(CX + 126, 74);
          c.lineTo(CX + 138, 80);
          c.lineTo(CX + 121, 118);
          c.closePath();
        };
        piece(g, grip, box, 'plastic', '#d8343f', { shadow: 0.4 });
      });
    }, inkOf(shade(steel, -0.2)));
  },
});

export { stitches };
