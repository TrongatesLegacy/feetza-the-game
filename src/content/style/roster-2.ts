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
  // a heaped base that rounds under (a ruler-flat bottom read as a crop on her peel, flipped toes-up)
  c.bezierCurveTo(CX + 100, 278, CX + 40, 280, CX, 279);
  c.bezierCurveTo(CX - 44, 280, CX - 104, 278, CX - 118, 266);
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
    const box = { x: CX - 122, y: 150, w: 244, h: 132 };
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
        g.fillRect(box.x, 200, box.w, 82);
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
  [CX - 66, 44, 262, -1],
  [CX - 24, 32, 244, -0.4],
  [CX + 20, 36, 268, 0.4],
  [CX + 62, 46, 236, 1],
];

/** A ribbon's centre x, y and half width at t (0 root … 1 tip): a narrow stipe, widest two thirds down, its edges
 * ruffled all along like real kelp. */
function kelpAt(i: number, t: number): [number, number, number] {
  const [x, y, len, d] = KELP[i];
  const cx = x + Math.sin(t * 5.2 + i * 1.7) * 11 * Math.min(1, t * 2.5) + d * t * t * 20;
  const hw = (2.8 + Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.85) * 17) * (1 - t * 0.2) + Math.sin(t * 24 + i) * 3.2 * Math.min(1, t * 4);
  return [cx, y + t * len, Math.max(1.8, hw)];
}

function kelpPath(i: number): PathFn {
  return (c) => {
    const N = 48;
    c.beginPath();
    for (let j = 0; j <= N; j++) {
      const [cx, cy, hw] = kelpAt(i, j / N);
      if (j) c.lineTo(cx - hw, cy);
      else c.moveTo(cx - hw, cy);
    }
    const [ex, ey] = kelpAt(i, 1);
    c.quadraticCurveTo(ex, ey + 8, ex + 2, ey);
    for (let j = N; j >= 0; j--) {
      const [cx, cy, hw] = kelpAt(i, j / N);
      c.lineTo(cx + hw * (1 + Math.sin(j * 1.9 + i) * 0.1), cy);
    }
    c.closePath();
  };
}

function paintKelp(g: Ctx, i: number, dark: string, light: string): void {
  const [x, y, len] = KELP[i];
  const p = kelpPath(i);
  const box = { x: x - 40, y: y - 4, w: 80, h: len + 24 };
  const s = new Sil(g, [p], box);
  const sg = s.g;
  // deep green at the stipe, through the leaf, to a thin translucent golden tip
  const olive = mix(dark, '#7a6a1a', 0.3);
  sg.fillStyle = vgrad(sg, y, y + len, [[0, rgba(shade(olive, -0.3), 0.96)], [0.3, rgba(olive, 0.86)], [0.72, rgba(mix(olive, light, 0.5), 0.72)], [1, rgba(mix(light, '#f0d860', 0.55), 0.55)]]);
  sg.fillRect(box.x, box.y, box.w, box.h);
  // across the blade: lit on the left, shaded on the right, so it reads as a curled ribbon
  const N = 30;
  for (let j = 0; j < N; j++) {
    const [cx, cy, hw] = kelpAt(i, j / N);
    const [nx, ny, nw] = kelpAt(i, (j + 1) / N);
    const w = Math.max(hw, nw);
    sg.fillStyle = hgrad(sg, cx - w, cx + w, [[0, rgba('#eaffa0', 0.38)], [0.35, rgba('#ffffff', 0.05)], [0.55, rgba('#000000', 0)], [1, rgba('#06200a', 0.5)]]);
    sg.beginPath();
    sg.moveTo(cx - hw - 1, cy);
    sg.lineTo(nx - nw - 1, ny + 0.6);
    sg.lineTo(nx + nw + 1, ny + 0.6);
    sg.lineTo(cx + hw + 1, cy);
    sg.closePath();
    sg.fill();
  }
  // the ruffles: fine ridges from the midrib out to the wavy edge
  sg.lineCap = 'round';
  for (let j = 3; j < 46; j++) {
    const [cx, cy, hw] = kelpAt(i, j / 46);
    for (const side of [-1, 1]) {
      sg.strokeStyle = rgba(side < 0 ? '#d8f08a' : '#0a2a10', side < 0 ? 0.24 : 0.3);
      sg.lineWidth = 0.9;
      sg.beginPath();
      sg.moveTo(cx + side * 1.2, cy);
      sg.quadraticCurveTo(cx + side * hw * 0.6, cy + 1.5, cx + side * hw, cy + 3.5);
      sg.stroke();
    }
  }
  // the midrib: a dark groove with a lit lip
  for (const [col, w, dx, a] of [['#123a10', 1.8, 0.7, 0.6], [light, 0.9, -0.6, 0.55]] as const) {
    softStroke(sg, (c) => {
      for (let j = 0; j <= 30; j++) {
        const [cx, cy] = kelpAt(i, (j / 30) * 0.94);
        if (j) c.lineTo(cx + dx, cy);
        else c.moveTo(cx + dx, cy);
      }
    }, rgba(col, a), w, 0.4);
  }
  // a wet sheen down the lit edge
  softStroke(sg, (c) => {
    for (let j = 4; j <= 26; j++) {
      const [cx, cy, hw] = kelpAt(i, j / 32);
      if (j > 4) c.lineTo(cx - hw * 0.55, cy);
      else c.moveTo(cx - hw * 0.55, cy);
    }
  }, rgba('#ffffff', 0.35), 1.4, 0.8);
  s.finish(inkOf(dark), { w: 2.6, inner: 0.25 });
  // glossy air bladders where the blade meets the stipe, sitting proud of it
  for (const t of [0.07, 0.15]) {
    const [cx, cy] = kelpAt(i, t);
    const bx = cx;
    piece(g, ell(bx, cy, 4.6, 5.6), { x: bx - 6, y: cy - 7, w: 12, h: 14 }, 'slime', '#c8d84a', { shadow: 0.4 });
    glint(g, bx - 1.4, cy - 2, 1.6, 0.9);
  }
}

registerStyle('seaweed', {
  rig: BARE_RIG,
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 42 },
  parts: Object.fromEntries(KELP.map(([x, y, len], i) => [
    `kelp${i}`,
    { box: { x: x - 44, y: y - 8, w: 88, h: len + 30 }, frames: 1, pivot: [x, y] as [number, number], draw: (g: Ctx, art: FootArt) => paintKelp(g, i, art.primary ?? '#3f8a3a', art.secondary ?? '#7cc45a') },
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

const RIOT_BOX = { x: CX - 108, y: -10, w: 216, h: 280 };

/** The riot shield: tinted, scratched polycarbonate with a stencilled RIOT, a steel frame and bolts (design space). */
function paintRiotShield(g: Ctx, blue: string): void {
    within(g, shieldPath, () => {
      g.fillStyle = rgba(blue, 0.38);
      g.fillRect(RIOT_BOX.x, 20, RIOT_BOX.w, 200);
      g.fillStyle = hgrad(g, CX - 94, CX + 94, [[0, rgba('#ffffff', 0.25)], [0.3, rgba('#ffffff', 0.05)], [0.7, rgba('#000000', 0)], [1, rgba('#000020', 0.25)]]);
      g.fillRect(RIOT_BOX.x, 20, RIOT_BOX.w, 200);
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
}

registerStyle('riot', {
  contactY: 266,
  rig: { from: 216, to: 232 },
  leg: { kind: 'wool', hw: 68, join: 'hem' },
  // in play the shield is its own piece (src/game/guardShield.ts): it swings down and aside when it drops
  shield: {
    box: { x: CX - 100, y: 20, w: 200, h: 202 },
    pivot: [CX + 60, 150],
    down: { dx: -150, dy: 84, rot: -0.5, sx: 0.58 },
    material: 'glass',
    badge: 'plate',
    accent: '#8fc4f0',
    draw(ctx, art) {
      const sil = new Sil(ctx, [shieldPath], { x: CX - 100, y: 20, w: 200, h: 202 });
      paintRiotShield(sil.g, art.secondary ?? '#9fc4e8');
      finishLight(sil, '#2a3a50', '#101828', 0.22);
      sil.finish(inkOf(shade(art.primary ?? '#1d1f24', 0.15)));
    },
    path: shieldPath,
  },
  draw(ctx, art, p, o) {
    const black = art.primary ?? '#1d1f24';
    const blue = art.secondary ?? '#9fc4e8';
    const flex = Math.max(0, p.curl);
    const upper = upperPath(RIOT, flex);
    const sole = solePath(RIOT, flex, 24, 176, 6);
    const box = RIOT_BOX;
    const sil = new Sil(ctx, o.noShield ? [sole, upper] : [sole, upper, shieldPath], box);
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
    // the shield: polycarbonate over the boot, the boot seen through it tinted (in play it's its own piece)
    if (!o.noShield) paintRiotShield(g, blue);
    finishLight(sil, black, '#101828', 0.3);
    sil.finish(inkOf(shade(black, 0.15)), { openTop: -5 });
  },
});

// ════════════════════════ Waffle Wanda ════════════════════════
// Her foot baked into a crispy waffle: deep golden pockets, a pat of butter melting on top, maple syrup running
// over the edge. In play crumbs fall off her, and syrup drips; each crack throws a shower of crumbs.

const WAF_TOP = 108;
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
    const box = { x: CX - 104, y: WAF_TOP - 16, w: 208, h: 166 };
    const syrup: PathFn[] = [dripPath(CX + 46, WAF_TOP + 8, 92, 10), dripPath(CX + 76, WAF_TOP + 10, 60, 8), dripPath(CX + 16, WAF_TOP + 12, 40, 7), dripPath(CX - 70, WAF_TOP + 10, 34, 6.5)];
    prop(ctx, [waffle, ...syrup], { x: box.x, y: box.y, w: box.w, h: box.h + 20 }, (g, sil) => {
      sil.form({ base: gold, shadowTint: '#5a2008', ramp: 0.8, form: 0.55, formSize: 22, bevel: 0.4, rim: 0.45 });
      within(g, waffle, () => {
        texture(g, 'cast', box, 0.25, 1);
        // the grid: raised ridges, deep pockets
        // big square pockets, deep enough to hold syrup: the top wall in shadow, the bottom wall lit, a crisp ridge
        const step = 31;
        for (let y = WAF_TOP - 6; y < 276; y += step)
          for (let x = CX - 109; x < CX + 110; x += step) {
            const pk = rrect(x + 6, y + 6, step - 12, step - 12, 3);
            within(g, pk, () => {
              g.fillStyle = vgrad(g, y + 6, y + step - 6, [[0, shade(gold, -0.6)], [0.45, shade(gold, -0.3)], [1, shade(gold, 0.1)]]);
              g.fillRect(x, y, step, step);
              g.fillStyle = hgrad(g, x + 6, x + step - 6, [[0, rgba('#3a1004', 0.3)], [0.4, rgba('#3a1004', 0)], [1, rgba('#ffffff', 0.08)]]);
              g.fillRect(x, y, step, step);
            });
            spec(g, x + 3, y + 3, 6, 2.2, 0.4, -0.6);
          }
        // toasted edges
        g.fillStyle = vgrad(g, 220, 266, [[0, rgba('#5a2008', 0)], [1, rgba('#5a2008', 0.4)]]);
        g.fillRect(box.x, 220, box.w, 50);
      });
      // syrup: glossy amber over the waffle, pooling in the pockets
      const amber = '#a8540e';
      const pool: PathFn = (c) => {
        c.beginPath();
        c.moveTo(CX - 4, WAF_TOP + 8);
        c.bezierCurveTo(CX + 50, WAF_TOP - 8, CX + 102, WAF_TOP + 2, CX + 96, WAF_TOP + 38);
        c.bezierCurveTo(CX + 80, WAF_TOP + 58, CX + 30, WAF_TOP + 50, CX + 8, WAF_TOP + 34);
        c.bezierCurveTo(CX - 6, WAF_TOP + 26, CX - 12, WAF_TOP + 14, CX - 4, WAF_TOP + 8);
        c.closePath();
      };
      for (const d of [pool, ...syrup]) within(g, d, () => {
        g.fillStyle = vgrad(g, WAF_TOP - 8, WAF_TOP + 100, [[0, mix(amber, '#e8902a', 0.4)], [0.5, amber], [1, shade(amber, -0.35)]]);
        g.fillRect(box.x, WAF_TOP - 10, box.w, 120);
        // amber glass: light comes through it on the shadow side
        g.fillStyle = hgrad(g, CX - 100, CX + 100, [[0, rgba('#ffffff', 0.1)], [0.7, rgba('#ffb040', 0)], [1, rgba('#ffb040', 0.25)]]);
        g.fillRect(box.x, WAF_TOP - 10, box.w, 120);
      });
      contact(g, (c) => {
        pool(c);
        c.fill();
      }, 0.25, 2, 2);
      spec(g, CX + 46, WAF_TOP + 16, 26, 5, 0.85, -0.1);
      spec(g, CX + 30, WAF_TOP + 30, 10, 3, 0.6, -0.3);
      for (const [x, y] of [[CX + 46, WAF_TOP + 92], [CX + 76, WAF_TOP + 62], [CX + 16, WAF_TOP + 44], [CX - 70, WAF_TOP + 36]] as const) glint(g, x - 3, y, 4.2, 0.95);
      // the butter pat, softening at the corners
      // a thick pat of butter: a soft-cornered block (lit top, shaded front), melting into a glossy puddle
      softFill(g, ell(CX - 30, WAF_TOP + 50, 38, 9), rgba(butter, 0.7), 3);
      const front: PathFn = (c) => {
        c.beginPath();
        c.moveTo(CX - 62, WAF_TOP + 22);
        c.lineTo(CX + 2, WAF_TOP + 22);
        c.quadraticCurveTo(CX + 4, WAF_TOP + 42, CX - 2, WAF_TOP + 48);
        c.quadraticCurveTo(CX - 30, WAF_TOP + 54, CX - 58, WAF_TOP + 48);
        c.quadraticCurveTo(CX - 66, WAF_TOP + 40, CX - 62, WAF_TOP + 22);
        c.closePath();
      };
      const top: PathFn = (c) => {
        c.beginPath();
        c.moveTo(CX - 62, WAF_TOP + 24);
        c.quadraticCurveTo(CX - 60, WAF_TOP + 4, CX - 44, WAF_TOP + 2);
        c.lineTo(CX + 2, WAF_TOP + 4);
        c.quadraticCurveTo(CX + 12, WAF_TOP + 10, CX + 2, WAF_TOP + 24);
        c.closePath();
      };
      piece(g, front, box, 'plastic', shade(butter, -0.12), { shadow: 0.5 });
      piece(g, top, box, 'plastic', mix(butter, '#ffffff', 0.25), { shadow: 0.2 });
      crease(g, (c) => {
        c.moveTo(CX - 62, WAF_TOP + 23);
        c.lineTo(CX + 3, WAF_TOP + 23);
      }, 1.4, shade(butter, -0.4), 0.5, 0.4);
      spec(g, CX - 40, WAF_TOP + 10, 16, 4, 0.85, -0.1);
      glint(g, CX - 50, WAF_TOP + 9, 3.2, 1);
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
      // a big glossy tomato and a bold wordmark, sized to read at game size
      piece(g, ell(CX - 62, 136, 22, 19), box, 'plastic', '#e5242f', { shadow: 0.35 });
      spec(g, CX - 70, 128, 7, 4, 0.8, -0.5);
      const leaf = (c: Ctx) => {
        c.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
          const rr = i % 2 ? 4 : 12;
          c.lineTo(CX - 62 + Math.cos(a) * rr, 119 + Math.sin(a) * rr * 0.6);
        }
        c.closePath();
      };
      piece(g, leaf, box, 'plastic', '#3f9a3a', { shadow: 0.3 });
      g.save();
      g.font = '900 34px "Arial Black", Impact, sans-serif';
      g.textAlign = 'center';
      g.lineJoin = 'round';
      g.strokeStyle = rgba('#5a0404', 0.35);
      g.lineWidth = 3;
      g.strokeText('KETCHUP', CX + 22, 149, 128);
      g.fillStyle = shade(red, -0.05);
      g.fillText('KETCHUP', CX + 22, 148, 128);
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
const BASKET_BOT = 258;
/** The basket in 3D: its top rim an ellipse (we look down into it a little), tapering to a rounded bottom. */
const BK = { rxTop: 102, ryTop: 15, rxBot: 86, ryBot: 11 };
/** A point on the basket's wall: u round the rim (0 = left, π = right, front half), v down the wall (0 rim, 1 bottom). */
function bkAt(u: number, v: number): [number, number] {
  const rx = BK.rxTop + (BK.rxBot - BK.rxTop) * v;
  const ry = BK.ryTop + (BK.ryBot - BK.ryTop) * v;
  const y = BASKET_TOP + (BASKET_BOT - BASKET_TOP) * v;
  return [CX - Math.cos(u) * rx, y + Math.sin(u) * ry];
}
const basket: PathFn = (c) => {
  c.beginPath();
  c.ellipse(CX, BASKET_TOP, BK.rxTop, BK.ryTop, 0, Math.PI, Math.PI * 2);
  c.lineTo(CX + BK.rxBot, BASKET_BOT);
  c.ellipse(CX, BASKET_BOT, BK.rxBot, BK.ryBot, 0, 0, Math.PI);
  c.closePath();
};
const handle: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX + 92, BASKET_TOP + 4);
  c.lineTo(CX + 132, 62);
  c.lineTo(CX + 146, 68);
  c.lineTo(CX + 104, BASKET_TOP + 12);
  c.closePath();
};

/** A fry standing in the basket: a square stick with a lit face, a shaded side and a crisp brown tip. */
function paintFry(g: Ctx, x: number, top: number, bot: number, a: number, w: number, gold: string): void {
  g.save();
  g.translate(x, bot);
  g.rotate(a);
  const h = bot - top;
  // the shaded side face, then the lit front face
  g.fillStyle = shade(gold, -0.35);
  g.beginPath();
  g.roundRect(w * 0.2, -h, w * 0.6, h, 1.5);
  g.fill();
  g.fillStyle = hgrad(g, -w / 2, w * 0.3, [[0, shade(gold, 0.35)], [0.5, mix(gold, '#fff4c0', 0.25)], [1, gold]]);
  g.beginPath();
  g.roundRect(-w / 2, -h, w * 0.8, h, 1.5);
  g.fill();
  // crisp brown tip and a few fried flecks
  g.fillStyle = vgrad(g, -h, -h + 9, [[0, '#b8661a'], [1, rgba('#c8781a', 0)]]);
  g.fillRect(-w / 2, -h, w * 1.3, 9);
  g.fillStyle = rgba('#a85a10', 0.4);
  for (let k = 0; k < 3; k++) g.fillRect(-w / 2 + 1 + ((k * 5) % (w - 2)), -h + 12 + k * 9, 1.6, 1.2);
  // a grease highlight down the lit edge
  g.fillStyle = rgba('#ffffff', 0.45);
  g.fillRect(-w / 2 + 1.2, -h + 4, 1.3, h - 8);
  // the dark line where the two faces meet
  g.fillStyle = rgba('#6a3008', 0.35);
  g.fillRect(w * 0.27, -h + 2, 0.9, h - 4);
  g.restore();
}

registerStyle('frycook', {
  contactY: 266,
  leg: { kind: 'wool', hw: 68, join: 'hem' },
  draw(ctx, art, p) {
    const steel = art.primary ?? '#c7ccd4';
    const gold = art.secondary ?? '#ffcf3a';
    ctx.save();
    ctx.beginPath();
    ctx.rect(-60, -40, 340, BASKET_TOP + 40);
    ctx.clip();
    bareWith(ctx, { skin: art.skin, nails: art.nails }, p, (g) => {
      // greasy shine on the skin by the basket
      spec(g, CX - 30, 132, 50, 10, 0.25, -0.1);
    });
    ctx.restore();
    const r = rng(hashStr('frycook'));
    // fries heaped up out of the basket: back row shorter, front row taller, leaning every which way
    const fries: [number, number, number, number][] = [];
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 9 - row; i++) {
        const x = CX - 82 + row * 8 + i * (164 - row * 16) / (8 - row) + (r() - 0.5) * 8;
        const top = BASKET_TOP - 20 - r() * 34 + row * 10;
        const a = (r() - 0.5) * 0.45 + ((x - CX) / 100) * 0.2;
        fries.push([x, top, a, row]);
      }
    const fryParts: PathFn[] = fries.map(([x, top, a]) => (c) => {
      c.save();
      c.translate(x, BASKET_TOP + 20);
      c.rotate(a);
      c.beginPath();
      c.roundRect(-5.5, -(BASKET_TOP + 20 - top), 12, BASKET_TOP + 20 - top, 2);
      c.restore();
    });
    const box = { x: CX - 110, y: BASKET_TOP - 100, w: 266, h: 230 };
    prop(ctx, [...fryParts, basket, handle], box, (g) => {
      // inside: the far wall in shadow, its mesh dim behind everything
      within(g, basket, () => {
        g.fillStyle = vgrad(g, BASKET_TOP - 16, BASKET_BOT + 10, [[0, '#2a1a10'], [1, '#120a06']]);
        g.fillRect(box.x, BASKET_TOP - 20, box.w, 140);
      });
      // the back half of the rim, behind the fries
      g.save();
      g.lineCap = 'round';
      for (const [w, col] of [[6, '#2a2e36'], [3.4, shade(steel, -0.25)]] as const) {
        g.strokeStyle = col;
        g.lineWidth = w;
        g.beginPath();
        g.ellipse(CX, BASKET_TOP, BK.rxTop, BK.ryTop, 0, Math.PI, Math.PI * 2);
        g.stroke();
      }
      g.restore();
      // the fries, back row first; heaped ones lying across low in the basket
      for (let i = 0; i < 14; i++) {
        const x = CX - 80 + r() * 160;
        const y = BASKET_TOP + 30 + r() * 70;
        paintFry(g, x, y - 30, y, Math.PI / 2 + (r() - 0.5) * 0.8, 10, shade(gold, -0.1));
      }
      for (const [x, top, a] of fries) paintFry(g, x, top, BASKET_BOT + 6, a, 11, gold);
      // the basket: everything in it darkens with depth, the mesh catches the light
      within(g, basket, () => {
        g.fillStyle = vgrad(g, BASKET_TOP, BASKET_BOT + 10, [[0, rgba('#1a0a00', 0.1)], [1, rgba('#1a0a00', 0.55)]]);
        g.fillRect(box.x, BASKET_TOP, box.w, 130);
        ao(g, CX, BASKET_TOP + 8, 100, 12, 0.35, 0, '#2a1004');
        // the front mesh: wires round the basket (front arcs) and down it (bunching towards the sides, so it reads round)
        g.lineCap = 'round';
        const wire = (pts: [number, number][]): void => {
          for (const [w, col, dx, dy] of [[2.8, rgba('#14161c', 0.7), 0.8, 1.2], [1.6, shade(steel, 0.05), 0, 0], [0.7, rgba('#ffffff', 0.8), -0.4, -0.4]] as const) {
            g.strokeStyle = col;
            g.lineWidth = w;
            g.beginPath();
            pts.forEach(([x, y], k) => (k ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy)));
            g.stroke();
          }
        };
        for (let v = 1; v <= 6; v++) wire(Array.from({ length: 25 }, (_, k) => bkAt((k / 24) * Math.PI, v / 6.4)));
        for (let k = 1; k < 16; k++) {
          const u = (k / 16) * Math.PI;
          wire([bkAt(u, 0), bkAt(u, 0.5), bkAt(u, 1)]);
        }
        // a shine running round the near side, a shadow round the far
        g.fillStyle = hgrad(g, CX - 100, CX + 100, [[0, rgba('#ffffff', 0.12)], [0.3, rgba('#ffffff', 0)], [0.8, rgba('#000020', 0.15)], [1, rgba('#000020', 0.35)]]);
        g.fillRect(box.x, BASKET_TOP, box.w, 130);
      });
      // the front of the rim: a rolled steel band, lit along its top
      g.save();
      g.lineCap = 'round';
      for (const [w, col, dy] of [[8, '#2a2e36', 0.6], [5, steel, 0], [1.6, '#ffffff', -1.2]] as const) {
        g.strokeStyle = col;
        g.lineWidth = w;
        g.beginPath();
        g.ellipse(CX, BASKET_TOP + dy, BK.rxTop, BK.ryTop, 0, 0, Math.PI);
        g.stroke();
      }
      // the bottom rim
      g.strokeStyle = '#2a2e36';
      g.lineWidth = 4;
      g.beginPath();
      g.ellipse(CX, BASKET_BOT, BK.rxBot, BK.ryBot, 0, 0.1, Math.PI - 0.1);
      g.stroke();
      g.strokeStyle = shade(steel, -0.1);
      g.lineWidth = 2.2;
      g.stroke();
      g.restore();
      // the handle: a steel rod with a red rubber grip, riveted to the rim
      within(g, handle, () => {
        g.fillStyle = hgrad(g, CX + 94, CX + 146, [[0, '#f0f4f8'], [0.5, steel], [1, '#5a6068']]);
        g.fillRect(CX + 88, 58, 62, 110);
        const grip: PathFn = (c) => {
          c.beginPath();
          c.moveTo(CX + 112, 108);
          c.lineTo(CX + 132, 62);
          c.lineTo(CX + 146, 68);
          c.lineTo(CX + 125, 114);
          c.closePath();
        };
        piece(g, grip, box, 'plastic', '#d8343f', { shadow: 0.4 });
        spec(g, CX + 126, 80, 2.5, 14, 0.7, 0.42);
        for (let k = 0; k < 4; k++) crease(g, (c) => {
          const y = 76 + k * 9;
          const x = CX + 129 - (y - 62) * 0.43;
          c.moveTo(x, y);
          c.lineTo(x + 13, y + 6);
        }, 1, '#7a0a10', 0.3, 0.2);
      });
      rivet(g, CX + 98, BASKET_TOP + 6, 3.6);
    }, inkOf(shade(steel, -0.2)));
  },
});

export { stitches };
