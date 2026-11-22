// Roster batch, part 3: the Lodge and Space (Moose Hoof, Hot Tub Hal, Fireside Fay, Magnet Mag, Gravity Gwen, Alien Al,
// Robo-Sock 9, Comet Cora, Mars Rover Rory, Starlight Stella), redrawn in the style kit. Life in play:
// src/content/styleLive/roster.ts.

import type { FootArt } from '../../data/feet';
import { bareParts, onToe, poseToes, restToes } from '../../art/style/anatomy';
import { paintBare } from '../../art/style/bare';
import { LIGHT, type PathFn, ao, crease, glint, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil } from '../../art/style/sil';
import { registerStyle } from '../../art/style/registry';
import { blotches, contact, furStrands, rivet, stitches } from '../../art/style/details';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';
import { BARE_RIG, CX, bareWith, ell, finishLight, glowDot, glowLayer, hgrad, piece, prop, rrect, upperPath, vgrad, within } from './roster-kit';
import { starPath } from './roster-2';

const [LX, LY] = LIGHT.dir;

// ════════════════════════ Moose Hoof ════════════════════════
// A cloven hoof the size of a dinner plate: two glossy keratin halves with growth rings, shaggy fur spilling over
// them. In play the halves spread as it lands (heavy dust), and it snorts steam once it's hurt.

function hoofHalf(side: -1 | 1, spread: number): PathFn {
  const o = side * (4 + spread * 6);
  return (c) => {
    c.beginPath();
    const x0 = CX + o;
    const xo = CX + side * (100 + spread * 4);
    c.moveTo(x0, 150);
    c.bezierCurveTo(xo, 140, xo + side * 6, 230, CX + side * (70 + spread * 4), 270);
    c.bezierCurveTo(CX + side * 40, 280, x0 + side * 4, 268, x0, 250);
    c.closePath();
  };
}

const mooseLeg: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 54, -6);
  c.bezierCurveTo(CX - 58, 60, CX - 92, 110, CX - 104, 176);
  c.lineTo(CX + 104, 176);
  c.bezierCurveTo(CX + 92, 110, CX + 58, 60, CX + 54, -6);
  c.closePath();
};

registerStyle('moose', {
  contactY: 272,
  halfWidth: 108,
  rig: { from: 176, to: 196 },
  leg: { kind: 'fur', hw: 54, join: 'blend', fade: 26 },
  draw(ctx, art, p) {
    const fur = art.primary ?? '#6b4a2e';
    const horn = art.skin;
    const spread = Math.max(0, -p.curl) - Math.max(0, p.curl) * 0.5;
    const halves = [hoofHalf(-1, spread), hoofHalf(1, spread)];
    const fringe: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX - 108, 160);
      for (let i = 0; i <= 12; i++) {
        const x = CX - 108 + i * 18;
        c.quadraticCurveTo(x - 9, 200 + (i % 2) * 10, x, 176 + (i % 3) * 4);
      }
      c.lineTo(CX + 108, 150);
      c.closePath();
    };
    const box = { x: CX - 116, y: -10, w: 232, h: 292 };
    const sil = new Sil(ctx, [...halves, mooseLeg, fringe], box);
    const g = sil.g;
    // the hoof: dark horn, lit along its ridges, growth rings round it
    for (const [i, h] of halves.entries()) {
      const side = i ? 1 : -1;
      within(g, h, () => {
        g.fillStyle = hgrad(g, CX + side * 10, CX + side * 104, [[0, shade(horn, -0.3)], [0.35, shade(horn, 0.45)], [0.7, horn], [1, shade(horn, -0.5)]]);
        g.fillRect(box.x, 140, box.w, 150);
        texture(g, 'cast', box, 0.3, 1);
        for (let k = 0; k < 7; k++) {
          const y = 196 + k * 11;
          crease(g, (c) => {
            c.moveTo(CX + side * 8, y + 4);
            c.quadraticCurveTo(CX + side * 60, y - 6, CX + side * 104, y - 18);
          }, 1.4, '#000000', 0.35, 0.18);
        }
        spec(g, CX + side * 40 - 10, 214, 14, 34, 0.55, 0.3 * side);
        ao(g, CX + side * 10, 210, 10, 60, 0.6, 0, '#000000');
      });
      contact(g, (c) => {
        h(c);
        c.fill();
      }, 0.0);
    }
    // the fur: a dense shag combed down, lighter at the lit side
    within(g, mooseLeg, () => {
      g.fillStyle = vgrad(g, 0, 180, [[0, shade(fur, 0.1)], [1, shade(fur, -0.35)]]);
      g.fillRect(box.x, -10, box.w, 200);
    });
    within(g, fringe, () => {
      g.fillStyle = shade(fur, -0.2);
      g.fillRect(box.x, 140, box.w, 80);
    });
    const r = rng(hashStr('moose'));
    const tones = { dark: shade(fur, -0.55), mid: shade(fur, -0.1), light: shade(fur, 0.45) };
    within(g, mooseLeg, () => furStrands(g, r, { x: CX - 110, y: -10, w: 220, h: 196 }, Math.PI / 2, 1400, 16, tones, 0.5));
    within(g, fringe, () => furStrands(g, r, { x: CX - 110, y: 150, w: 220, h: 50 }, Math.PI / 2, 400, 20, tones, 0.7));
    // the fringe casts its shadow on the hoof
    softFill(g, (c) => {
      c.beginPath();
      c.ellipse(CX, 200, 104, 12, 0, 0, Math.PI * 2);
    }, rgba('#120804', 0.45), 6, 'source-atop');
    finishLight(sil, fur, '#140a10', 0.35);
    sil.finish(inkOf(shade(fur, -0.2)), { openTop: -5 });
  },
});

// ════════════════════════ Hot Tub Hal ════════════════════════
// Pink and pruney from the tub: wrinkled toes, beads of water, a terry towel round the ankle and a rubber duck on his
// big toe. In play steam puffs rise off him (thicker as he heals) and his toes wiggle.

function rubberDuck(g: Ctx, x: number, y: number, s: number, yellow: string): void {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  const body: PathFn = (c) => {
    c.beginPath();
    c.ellipse(0, 6, 16, 10, 0, 0, Math.PI * 2);
  };
  const head = ell(-6, -8, 9, 9);
  const beak: PathFn = (c) => {
    c.beginPath();
    c.moveTo(-14, -7);
    c.quadraticCurveTo(-24, -6, -22, -2);
    c.quadraticCurveTo(-18, -2, -13, -4);
    c.closePath();
  };
  prop(g, [body, head, beak], { x: -26, y: -20, w: 44, h: 38 }, (pg, sil) => {
    sil.form({ base: yellow, shadowTint: '#8a4a08', ramp: 0.8, form: 0.5, formSize: 6, bevel: 0.5, rim: 0.5 });
    piece(pg, beak, { x: -26, y: -10, w: 14, h: 10 }, 'plastic', '#ff8a1a', { shadow: 0.3 });
    pg.fillStyle = '#1a1010';
    pg.beginPath();
    pg.arc(-8, -10, 1.8, 0, Math.PI * 2);
    pg.fill();
    glint(pg, -8.6, -10.6, 1, 1);
    // the wing
    crease(pg, (c) => {
      c.moveTo(-2, 4);
      c.quadraticCurveTo(6, 2, 12, 8);
    }, 1.4, '#a86a08', 0.5, 0.3);
    spec(pg, -8, -13, 4, 2.5, 0.8);
    spec(pg, -4, 2, 8, 3, 0.6);
  }, inkOf(yellow), { w: 3.2 });
  g.restore();
}

registerStyle('hottub', {
  rig: BARE_RIG,
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 22 },
  draw(ctx, art, p) {
    const towel = art.primary ?? '#f7f5ef';
    const duck = art.secondary ?? '#ffd23f';
    const f = bareWith(ctx, { skin: art.skin, nails: art.nails, shadowTint: '#a82040', pores: 0.3 }, p, (g, f) => {
      // flushed and pruney: rosy blush, wrinkled toe pads, beads of water
      softFill(g, ell(CX, 170, 90, 50), rgba('#ff6a6a', 0.18), 14);
      for (const t of f.toes) {
        for (let k = 0; k < 4; k++) {
          const y = t.cy + t.ry * (0.05 + k * 0.18);
          crease(g, (c) => {
            c.moveTo(t.cx - t.rx * 0.55, y);
            c.quadraticCurveTo(t.cx, y + 3, t.cx + t.rx * 0.5, y - 1);
          }, 1, shade(art.skin, -0.4), 0.35, 0.3);
        }
      }
      const r = rng(hashStr('hottub'));
      for (let i = 0; i < 30; i++) {
        const x = f.box.x + 26 + r() * (f.box.w - 52);
        const y = 60 + r() * 180;
        const s = 1.4 + r() * 2.6;
        piece(g, ell(x, y, s, s * 1.25), f.box, 'glass', '#f0f8ff', { shadow: 0.25 });
        glint(g, x - s * 0.3, y - s * 0.4, s * 0.6, 0.95);
      }
      // the towel round the ankle: terry loops, a blue stripe, its tucked end
      const tw: PathFn = (c) => {
        c.beginPath();
        c.moveTo(CX - 64, 30);
        c.quadraticCurveTo(CX, 44, CX + 64, 30);
        c.lineTo(CX + 70, 72);
        c.quadraticCurveTo(CX, 88, CX - 70, 72);
        c.closePath();
      };
      piece(g, tw, f.box, 'plush', towel, { shadow: 0.5 });
      within(g, tw, () => {
        texture(g, 'fleece', f.box, 0.45, 0.9);
        g.strokeStyle = rgba('#5ab4e8', 0.85);
        g.lineWidth = 3;
        for (const dy of [0, 6]) {
          g.beginPath();
          g.moveTo(CX - 70, 50 + dy);
          g.quadraticCurveTo(CX, 66 + dy, CX + 70, 50 + dy);
          g.stroke();
        }
      });
    });
    // the duck sits on the big toe
    const t = f.toes[4];
    const [x, y] = onToe(t, -Math.PI / 2);
    rubberDuck(ctx, x + 4, y + 12, 1.25, duck);
  },
});

// ════════════════════════ Fireside Fay ════════════════════════
// A red Fair Isle bed sock toasting over the fire: knit snowflakes and dotted bands, the sole singed, and flames
// licking up under it. In play the flames flicker (their own glow layer), embers rise, and they flare on a stomp.

const FIRE_TONGUES: [number, number, number][] = [
  [CX - 84, 62, 22],
  [CX - 50, 84, 26],
  [CX - 12, 70, 24],
  [CX + 26, 90, 28],
  [CX + 64, 74, 26],
  [CX + 96, 58, 20],
];

function flamePath(x: number, h: number, w: number): PathFn {
  return (c) => {
    c.beginPath();
    c.moveTo(x - w, 272);
    c.bezierCurveTo(x - w * 1.1, 272 - h * 0.5, x - w * 0.2, 272 - h * 0.7, x + w * 0.1, 272 - h);
    c.bezierCurveTo(x + w * 0.4, 272 - h * 0.6, x + w * 1.1, 272 - h * 0.45, x + w, 272);
    c.closePath();
  };
}

function flames(g: Ctx, k: number): void {
  for (const [x, h, w] of FIRE_TONGUES) {
    const p = flamePath(x, h, w);
    within(g, p, () => {
      g.fillStyle = vgrad(g, 272 - h, 272, [[0, rgba('#ff4a10', 0.9 * k)], [0.45, rgba('#ff9a1a', k)], [1, rgba('#fff2a0', k)]]);
      g.fillRect(x - w * 1.4, 272 - h, w * 2.8, h + 4);
    });
    const inner = flamePath(x, h * 0.55, w * 0.5);
    g.fillStyle = rgba('#fffbe0', 0.9 * k);
    inner(g);
    g.fill();
  }
}

registerStyle('fireside', {
  rig: BARE_RIG,
  contactY: 262,
  leg: { kind: 'knit', hw: 52, join: 'blend', fade: 20 },
  draw(ctx, art, p, o) {
    const red = art.primary ?? '#b8262e';
    const cream = art.secondary ?? '#f7f0e0';
    if (o.emissive) {
      glowLayer(ctx, FIRE_TONGUES.map(([x, h, w]) => flamePath(x, h + 10, w * 1.2)), { x: CX - 120, y: 160, w: 240, h: 120 }, (g) => flames(g, 1));
      return;
    }
    const f = paintBare(ctx, { skin: red, nails: null, shadowTint: '#3a0418', pores: 0, detail: 0, toe: 1.06, toeLen: 0.9 }, p);
    const g = f.sil.g;
    texture(g, 'knit', f.box, 0.55, 1.4);
    // the Fair Isle pattern: bands of dots and a row of snowflakes, in cream
    const dots = (y: number, dx: number) => {
      for (let x = CX - 110; x < CX + 116; x += dx) {
        g.fillStyle = rgba(cream, 0.92);
        g.beginPath();
        g.ellipse(x, y, 2.6, 2, 0, 0, Math.PI * 2);
        g.fill();
      }
    };
    dots(48, 13);
    dots(128, 11);
    for (const x of [CX - 66, CX - 22, CX + 22, CX + 66]) {
      g.save();
      g.translate(x, 90);
      g.strokeStyle = rgba(cream, 0.95);
      g.lineWidth = 3.2;
      g.lineCap = 'round';
      for (let k = 0; k < 4; k++) {
        g.rotate(Math.PI / 4);
        g.beginPath();
        g.moveTo(-13, 0);
        g.lineTo(13, 0);
        g.stroke();
      }
      g.restore();
    }
    // knit stitches over the cream too, and the cuff's ribbing at the top
    texture(g, 'knit', { x: CX - 110, y: 30, w: 220, h: 110 }, 0.35, 1.4);
    g.strokeStyle = rgba(shade(red, -0.5), 0.4);
    g.lineWidth = 1.6;
    for (let x = CX - 60; x <= CX + 60; x += 7) {
      g.beginPath();
      g.moveTo(x, -6);
      g.lineTo(x, 22);
      g.stroke();
    }
    // the sole singed dark from the fire, with a hot glow underneath
    g.fillStyle = vgrad(g, 190, 270, [[0, rgba('#1a0404', 0)], [1, rgba('#1a0404', 0.55)]]);
    g.fillRect(f.box.x, 190, f.box.w, 80);
    for (const t of f.toes) {
      const [x, y] = onToe(t, Math.PI / 2);
      glowDot(g, x, y + 2, t.rx * 1.1, '#ff7a1a', 0.55);
    }
    f.sil.finish(inkOf(red), { openTop: f.top + 1.5 });
    if (!o.live) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      flames(ctx, 1);
      ctx.restore();
    }
  },
});

// ════════════════════════ Magnet Mag ════════════════════════
// A steel robot boot with a horseshoe magnet for a sole: red enamel, ground steel pole tips, rivets and status
// lights. In play blue field lines arc between the poles (its glow layer pulses) and stray nuts and bolts orbit it.

const MAG = { topW: 62, ballW: 96, toeY: 196 };
function magnetU(): PathFn {
  return (c) => {
    c.beginPath();
    c.moveTo(CX - 96, 170);
    c.lineTo(CX + 96, 170);
    c.lineTo(CX + 96, 300);
    c.lineTo(CX + 50, 300);
    c.lineTo(CX + 50, 222);
    c.bezierCurveTo(CX + 50, 205, CX - 50, 205, CX - 50, 222);
    c.lineTo(CX - 50, 300);
    c.lineTo(CX - 96, 300);
    c.closePath();
  };
}

export function fieldLines(g: Ctx, a: number): void {
  for (const [dy, w] of [[0, 2.6], [10, 2], [20, 1.4]] as const) {
    softStroke(g, (c) => {
      c.moveTo(CX - 73, 300);
      c.bezierCurveTo(CX - 70, 330 + dy, CX + 70, 330 + dy, CX + 73, 300);
    }, rgba('#5ad8ff', a), w * 2.5, 2);
    g.strokeStyle = rgba('#e0f8ff', a);
    g.lineWidth = w * 0.6;
    g.setLineDash([6, 5]);
    g.beginPath();
    g.moveTo(CX - 73, 300);
    g.bezierCurveTo(CX - 70, 330 + dy, CX + 70, 330 + dy, CX + 73, 300);
    g.stroke();
    g.setLineDash([]);
  }
}

registerStyle('magnet', {
  contactY: 304,
  leg: { kind: 'iron', hw: 56, join: 'into' },
  draw(ctx, art, p, o) {
    const steel = art.primary ?? '#4a5568';
    const red = art.secondary ?? '#e5242f';
    const upper = upperPath(MAG, 0);
    const u = magnetU();
    const box = { x: CX - 104, y: -10, w: 208, h: 320 };
    if (o.emissive) {
      glowLayer(ctx, [rrect(CX - 110, 160, 220, 190, 0)], { x: CX - 110, y: 160, w: 220, h: 190 }, (g) => {
        fieldLines(g, 0.9);
        for (const s of [-1, 1]) for (const y of [92, 126]) glowDot(g, CX + s * 70, y, 10, '#ff4a4a', 0.9);
      });
      return;
    }
    void p;
    const sil = new Sil(ctx, [upper, u], box);
    const g = sil.g;
    piece(g, upper, box, 'iron', steel, { shadow: 0 });
    within(g, upper, () => {
      texture(g, 'brushed', box, 0.25, 1);
      // armour bands with red status lights
      for (const y of [92, 126]) {
        const band = rrect(CX - 90, y - 10, 180, 20, 6);
        piece(g, band, box, 'iron', shade(steel, -0.35), { shadow: 0.5 });
        for (const s of [-1, 1]) {
          piece(g, rrect(CX + s * 70 - 7, y - 6, 14, 12, 3), box, 'plastic', red, { shadow: 0.3 });
          glint(g, CX + s * 70 - 2, y - 2, 2.4, 0.9);
        }
      }
      // a cyan seam glowing round the ankle plate
      g.fillStyle = rgba('#5ad8ff', 0.75);
      g.beginPath();
      g.roundRect(CX - 60, 152, 120, 5, 2.5);
      g.fill();
      for (const [x, y] of [[CX - 46, 24], [CX + 46, 24], [CX - 80, 166], [CX + 80, 166]] as const) rivet(g, x, y, 3.5, '#b8c0cc');
      spec(g, CX - 40, 50, 30, 50, 0.3, 0.1);
    });
    // the magnet: red enamel with ground steel poles
    piece(g, u, box, 'enamel', red, { shadow: 0.55, spec: false });
    within(g, u, () => {
      spec(g, CX - 80, 230, 8, 40, 0.7, 0);
      spec(g, CX + 62, 236, 5, 36, 0.5, 0, LIGHT.rim);
      for (const s of [-1, 1]) {
        const pole = rrect(CX + s * 73 - 24, 262, 48, 40, 0);
        within(g, pole, () => {
          g.fillStyle = hgrad(g, CX + s * 73 - 24, CX + s * 73 + 24, [[0, '#f4f8fc'], [0.4, '#b8c2cc'], [1, '#4a5260']]);
          g.fillRect(CX + s * 73 - 24, 262, 48, 40);
          texture(g, 'brushed', box, 0.4, 1);
        });
        g.fillStyle = rgba('#000000', 0.4);
        g.fillRect(CX + s * 73 - 24, 261, 48, 2);
      }
    });
    finishLight(sil, steel, '#0a1020', 0.3);
    sil.finish(inkOf(steel), { openTop: -5 });
    if (!o.live) fieldLines(ctx, 0.8);
  },
});

/** A hex nut (the critters orbiting Magnet Mag), at the origin. */
export function hexNut(g: Ctx, s: number, tilt: number): void {
  g.save();
  g.scale(s, s * (0.55 + 0.45 * Math.abs(Math.cos(tilt))));
  const hex: PathFn = (c) => {
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      c.lineTo(Math.cos(a) * 10, Math.sin(a) * 10);
    }
    c.closePath();
    c.moveTo(4.5, 0);
    c.arc(0, 0, 4.5, 0, Math.PI * 2, true);
  };
  g.fillStyle = '#2a2e36';
  g.save();
  g.scale(1.15, 1.15);
  hex(g);
  g.fill('evenodd');
  g.restore();
  const gr = g.createLinearGradient(-10, -10, 10, 10);
  gr.addColorStop(0, '#f4f8fc');
  gr.addColorStop(0.5, '#9aa4b0');
  gr.addColorStop(1, '#4a5260');
  g.fillStyle = gr;
  hex(g);
  g.fill('evenodd');
  g.restore();
}

// ════════════════════════ Gravity Gwen ════════════════════════
// A quilted white astronaut boot with an orange sole band, a mission patch, and two thruster bells underneath. In
// play the thrusters burn blue (their own glow layer), flaring as she lifts, and sparkles drift off her.

const GRAV = { topW: 62, ballW: 92, toeY: 226 };
const nozzle = (s: -1 | 1): PathFn => (c) => {
  c.beginPath();
  c.moveTo(CX + s * 56 - 12, 234);
  c.lineTo(CX + s * 56 + 12, 234);
  c.lineTo(CX + s * 56 + 18, 262);
  c.lineTo(CX + s * 56 - 18, 262);
  c.closePath();
};

export function thrustFlame(g: Ctx, k: number): void {
  for (const s of [-1, 1]) {
    const x = CX + s * 56;
    const fl: PathFn = (c) => {
      c.beginPath();
      c.moveTo(x - 16, 262);
      c.quadraticCurveTo(x - 12, 290, x, 316);
      c.quadraticCurveTo(x + 12, 290, x + 16, 262);
      c.closePath();
    };
    within(g, fl, () => {
      g.fillStyle = vgrad(g, 262, 316, [[0, rgba('#ffffff', k)], [0.3, rgba('#8ad8ff', k)], [1, rgba('#2f6aff', 0)]]);
      g.fillRect(x - 20, 260, 40, 60);
    });
  }
}

registerStyle('gravity', {
  contactY: 278,
  halfWidth: 108,
  leg: { kind: 'wool', hw: 66, join: 'hem' },
  draw(ctx, art, p, o) {
    const white = art.primary ?? '#eef1f6';
    const orange = art.secondary ?? '#ff8a1a';
    if (o.emissive) {
      glowLayer(ctx, [rrect(CX - 90, 240, 180, 90, 0)], { x: CX - 90, y: 240, w: 180, h: 90 }, (g) => thrustFlame(g, 1));
      return;
    }
    void p;
    const upper = upperPath(GRAV, 0);
    const soleBand: PathFn = (c) => {
      c.beginPath();
      c.roundRect(CX - 104, 206, 208, 32, 12);
    };
    const box = { x: CX - 108, y: -10, w: 216, h: 280 };
    const sil = new Sil(ctx, [upper, soleBand, nozzle(-1), nozzle(1)], box);
    const g = sil.g;
    piece(g, upper, box, 'rubber', white, { shadow: 0 });
    within(g, upper, () => {
      texture(g, 'canvas', box, 0.25, 1);
      // quilting: puffy horizontal pads
      for (let y = 22; y < 210; y += 22) {
        crease(g, (c) => {
          c.moveTo(CX - 100, y);
          c.quadraticCurveTo(CX, y + 10, CX + 100, y);
        }, 2, '#7a84a0', 0.45, 0.4);
        spec(g, CX - 30, y + 10, 40, 4, 0.35, 0.05);
      }
      // the mission patch
      const patch = ell(CX + 36, 120, 20, 20);
      piece(g, patch, box, 'canvas', '#1c2a6a', { shadow: 0.4 });
      within(g, patch, () => {
        g.strokeStyle = '#ff5a3a';
        g.lineWidth = 3;
        g.beginPath();
        g.ellipse(CX + 36, 122, 16, 6, -0.4, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = '#ffffff';
        for (const [x, y] of [[CX + 30, 112], [CX + 44, 128], [CX + 28, 128]] as const) {
          g.beginPath();
          g.arc(x, y, 1.6, 0, Math.PI * 2);
          g.fill();
        }
        piece(g, ell(CX + 38, 120, 5, 5), box, 'plastic', '#f4f6fa', { shadow: 0.2 });
      });
      stitches(g, (c) => c.ellipse(CX + 36, 120, 20, 20, 0, 0, Math.PI * 2), rgba('#c8ccd8', 0.9), 1.2, 3, 2);
    });
    piece(g, soleBand, box, 'rubber', orange, { shadow: 0.5 });
    within(g, soleBand, () => {
      g.fillStyle = rgba('#000000', 0.25);
      for (let x = CX - 96; x < CX + 100; x += 12) g.fillRect(x, 226, 6, 12);
    });
    for (const s of [-1, 1] as const) {
      piece(g, nozzle(s), box, 'chrome', '#9aa4b0', { shadow: 0.5 });
      within(g, nozzle(s), () => {
        g.fillStyle = rgba('#3a2a20', 0.5);
        g.fillRect(CX + s * 56 - 20, 256, 40, 6);
      });
    }
    finishLight(sil, white, '#3a4070', 0.3);
    sil.finish(inkOf(shade(white, -0.3)), { openTop: -5 });
    if (!o.live) thrustFlame(ctx, 0.9);
  },
});

// ════════════════════════ Alien Al ════════════════════════
// A green, slimy bulb with one big eye and four tentacle toes lined with suckers. In play the eye blinks and follows
// your peel, the tentacles curl and sway on springs, and it drips slime; the eye bulges before it splits.

export const AL_EYE = { x: CX, y: 116, r: 28 };
const alBody: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 52, -6);
  c.bezierCurveTo(CX - 54, 40, CX - 100, 70, CX - 100, 140);
  c.bezierCurveTo(CX - 100, 196, CX - 60, 214, CX, 214);
  c.bezierCurveTo(CX + 60, 214, CX + 100, 196, CX + 100, 140);
  c.bezierCurveTo(CX + 100, 70, CX + 54, 40, CX + 52, -6);
  c.closePath();
};

/** The tentacles: root, tip, curl direction. */
export const TENTACLES: [number, number, number, number, number][] = [
  [CX - 70, 186, CX - 104, 268, -1],
  [CX - 26, 200, CX - 34, 278, -1],
  [CX + 26, 200, CX + 34, 278, 1],
  [CX + 70, 186, CX + 104, 268, 1],
];

function tentPath(i: number): PathFn {
  const [x0, y0, x1, y1, d] = TENTACLES[i];
  return (c) => {
    c.beginPath();
    const mx = (x0 + x1) / 2 - d * 12;
    const my = (y0 + y1) / 2;
    c.moveTo(x0 - 15, y0 - 10);
    c.quadraticCurveTo(mx - 12, my, x1 - 5, y1 - 4);
    c.arc(x1 + d * 6, y1 - 6, 9, Math.PI, 0, true);
    c.arc(x1 + d * 6, y1 - 14, 4, 0, Math.PI, d > 0);
    c.quadraticCurveTo(mx + 12, my - 6, x0 + 15, y0 - 10);
    c.closePath();
  };
}

function paintTentacle(g: Ctx, i: number, green: string, sucker: string): void {
  const [x0, y0, x1, y1] = TENTACLES[i];
  const p = tentPath(i);
  const box = { x: Math.min(x0, x1) - 30, y: y0 - 16, w: Math.abs(x1 - x0) + 60, h: y1 - y0 + 30 };
  const s = new Sil(g, [p], box);
  s.form({ base: green, shadowTint: '#0a3a20', ramp: 0.8, form: 0.5, formSize: 9, bevel: 0.45, rim: 0.6 });
  // suckers down the underside
  for (let k = 1; k <= 4; k++) {
    const t = k / 5.2;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t + 3;
    piece(s.g, ell(x + 6, y, 4 - k * 0.4, 3.2 - k * 0.3), box, 'slime', sucker, { shadow: 0.3 });
  }
  spec(s.g, x0 - 4, y0 + 16, 4, 14, 0.6, 0.2);
  s.finish(inkOf(green), { w: 4, inner: 0.4 });
}

function alEye(g: Ctx, blink: number, yellow: string, green: string): void {
  const { x, y, r } = AL_EYE;
  const eye = ell(x, y, r, r * 0.86);
  contact(g, (c) => {
    eye(c);
    c.fill();
  }, 0.5, 3, 4);
  within(g, eye, () => {
    g.fillStyle = vgrad(g, y - r, y + r, [[0, '#ffffff'], [1, '#c8d8c0']]);
    g.fillRect(x - r, y - r, r * 2, r * 2);
    const ir = g.createRadialGradient(x - 3, y - 3, 1, x, y, r * 0.62);
    ir.addColorStop(0, shade(yellow, 0.4));
    ir.addColorStop(0.7, yellow);
    ir.addColorStop(1, shade(yellow, -0.4));
    g.fillStyle = ir;
    g.beginPath();
    g.arc(x, y, r * 0.6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#0a0a06';
    g.beginPath();
    g.ellipse(x, y, r * 0.14, r * 0.46, 0, 0, Math.PI * 2);
    g.fill();
    spec(g, x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.2, 0.95);
    glint(g, x - r * 0.3, y - r * 0.38, r * 0.2, 1);
    ao(g, x, y + r * 0.8, r, r * 0.3, 0.3, 0, '#204020');
    // the lids: green skin closing from top and bottom
    if (blink > 0) {
      const top = y - r + (r * 1.1) * blink;
      const bot = y + r * 0.86 - r * 0.7 * blink;
      g.fillStyle = vgrad(g, y - r, top, [[0, shade(green, 0.1)], [1, shade(green, -0.15)]]);
      g.fillRect(x - r - 2, y - r - 2, r * 2 + 4, top - (y - r - 2));
      g.fillStyle = shade(green, -0.1);
      g.fillRect(x - r - 2, bot, r * 2 + 4, y + r - bot + 2);
      g.strokeStyle = rgba('#0a3a10', 0.9);
      g.lineWidth = 2.4;
      g.beginPath();
      g.moveTo(x - r, top);
      g.quadraticCurveTo(x, top + 4, x + r, top);
      g.stroke();
    }
  });
  g.strokeStyle = inkOf(green);
  g.lineWidth = 3;
  eye(g);
  g.stroke();
  // lashes
  g.lineCap = 'round';
  for (let k = -2; k <= 2; k++) {
    const a = -Math.PI / 2 + k * 0.4;
    g.beginPath();
    g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.86);
    g.lineTo(x + Math.cos(a) * (r + 7), y + Math.sin(a) * (r * 0.86 + 7));
    g.stroke();
  }
}

registerStyle('alienal', {
  contactY: 280,
  halfWidth: 110,
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 24 },
  parts: {
    ...Object.fromEntries(TENTACLES.map(([x0, y0, x1, y1], i) => [`tent${i}`, {
      box: { x: Math.min(x0, x1) - 32, y: y0 - 18, w: Math.abs(x1 - x0) + 64, h: y1 - y0 + 34 },
      frames: 1,
      pivot: [x0, y0 - 8] as [number, number],
      draw: (g: Ctx, art: FootArt) => paintTentacle(g, i, art.primary ?? '#6fd64a', '#c8f0a0'),
    }])),
    eye: { box: { x: AL_EYE.x - AL_EYE.r - 10, y: AL_EYE.y - AL_EYE.r - 12, w: AL_EYE.r * 2 + 20, h: AL_EYE.r * 2 + 24 }, frames: 5, draw: (g, art, i) => alEye(g, i / 4, art.secondary ?? '#ffe14d', art.primary ?? '#6fd64a') },
  },
  draw(ctx, art, _p, o) {
    const green = art.primary ?? '#6fd64a';
    const yellow = art.secondary ?? '#ffe14d';
    if (!o.live) for (let i = 0; i < 4; i++) paintTentacle(ctx, i, green, '#c8f0a0');
    const box = { x: CX - 104, y: -10, w: 208, h: 230 };
    const sil = new Sil(ctx, [alBody], box);
    const g = sil.g;
    sil.form({ base: green, shadowTint: '#0a3a30', ramp: 0.85, form: 0.5, formSize: 28, bevel: 0.45, rim: 0.7 });
    texture(g, 'pores', box, 0.3, 1);
    // spots and slime sheen
    const r = rng(hashStr('alienal'));
    for (let i = 0; i < 16; i++) {
      const x = CX - 80 + r() * 160;
      const y = 40 + r() * 160;
      if (Math.hypot(x - AL_EYE.x, y - AL_EYE.y) < AL_EYE.r + 10) continue;
      const s = 3 + r() * 7;
      softFill(g, ell(x, y, s, s * 0.8), rgba(shade(green, -0.3), 0.6), 1);
      spec(g, x - s * 0.3, y - s * 0.3, s * 0.4, s * 0.25, 0.4);
    }
    spec(g, CX - 50, 80, 14, 40, 0.5, 0.3);
    spec(g, CX - 56, 70, 4, 14, 0.9, 0.3);
    // a brow ridge over the eye
    softStroke(g, (c) => c.ellipse(AL_EYE.x, AL_EYE.y, AL_EYE.r + 8, AL_EYE.r * 0.86 + 8, 0, Math.PI * 1.1, Math.PI * 1.9), rgba('#0a3a10', 0.4), 6, 3);
    if (!o.live) alEye(g, 0, yellow, green);
    finishLight(sil, green, '#0a3a20', 0.25);
    sil.finish(inkOf(green), { openTop: -5 });
  },
});

// ════════════════════════ Robo-Sock 9 ════════════════════════
// A chrome sock in ribbed bands with a pink digital 9, tapering into a spiral drill bit. In play the drill's flutes
// glow and spin sparks fly off it as it dives (it pierces defences).

const roboSock: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 56, -6);
  c.bezierCurveTo(CX - 60, 50, CX - 96, 90, CX - 96, 150);
  c.bezierCurveTo(CX - 96, 196, CX - 70, 214, CX - 50, 220);
  c.lineTo(CX + 50, 220);
  c.bezierCurveTo(CX + 70, 214, CX + 96, 196, CX + 96, 150);
  c.bezierCurveTo(CX + 96, 90, CX + 60, 50, CX + 56, -6);
  c.closePath();
};
const drillBit: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 52, 214);
  c.lineTo(CX + 52, 214);
  c.lineTo(CX + 3, 306);
  c.lineTo(CX - 3, 306);
  c.closePath();
};

function drillFlutes(g: Ctx, col: string, w: number): void {
  for (let k = 0; k < 6; k++) {
    const y = 220 + k * 14;
    const hw = 52 * (1 - (y - 214) / 92);
    g.strokeStyle = col;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(CX - hw, y);
    g.quadraticCurveTo(CX, y + 14, CX + hw * 0.9, y + 6);
    g.stroke();
  }
}

registerStyle('robosock', {
  contactY: 306,
  halfWidth: 100,
  leg: { kind: 'iron', hw: 54, join: 'into' },
  draw(ctx, art, _p, o) {
    const chrome = art.primary ?? '#b8c2cc';
    const pink = art.secondary ?? '#ff3d7f';
    const box = { x: CX - 100, y: -10, w: 200, h: 320 };
    if (o.emissive) {
      glowLayer(ctx, [roboSock, drillBit], box, (g) => {
        // the display and the drill's flutes
        g.fillStyle = rgba(pink, 0.9);
        g.font = '900 34px "Arial Black", Impact, sans-serif';
        g.textAlign = 'center';
        g.fillText('9', CX, 112);
        drillFlutes(g, rgba(pink, 0.7), 2.2);
        for (const x of [CX - 30, CX, CX + 30]) glowDot(g, x, 200, 8, pink, 0.9);
      });
      return;
    }
    const sil = new Sil(ctx, [roboSock, drillBit], box);
    const g = sil.g;
    piece(g, roboSock, box, 'chrome', chrome, { shadow: 0 });
    within(g, roboSock, () => {
      // ribbed bands of chrome: each a lit cylinder
      for (let y = 4; y < 214; y += 9) {
        g.fillStyle = rgba('#0a1020', 0.28);
        g.fillRect(box.x, y, box.w, 2.2);
        g.fillStyle = rgba('#ffffff', 0.22);
        g.fillRect(box.x, y + 2.2, box.w, 1.2);
      }
      // the chrome's environment reflection: sky band, horizon, dark ground
      g.fillStyle = hgrad(g, CX - 96, CX + 96, [[0, rgba('#1a2030', 0.4)], [0.18, rgba('#ffffff', 0.45)], [0.3, rgba('#ffffff', 0)], [0.62, rgba('#2a3040', 0.3)], [0.85, rgba('#000000', 0.2)], [1, rgba('#cfe2ff', 0.4)]]);
      g.fillRect(box.x, -10, box.w, 230);
      // the display
      const disp = rrect(CX - 22, 80, 44, 42, 8);
      piece(g, disp, box, 'plastic', '#16121c', { shadow: 0.5 });
      g.save();
      g.font = '900 34px "Arial Black", Impact, sans-serif';
      g.textAlign = 'center';
      g.fillStyle = pink;
      g.fillText('9', CX, 112);
      g.restore();
      spec(g, CX - 10, 88, 10, 3, 0.4);
      // the collar: a pink seam ring at the base and three status lights
      g.fillStyle = shade(pink, -0.2);
      g.fillRect(box.x, 194, box.w, 4);
      for (const x of [CX - 30, CX, CX + 30]) {
        piece(g, ell(x, 204, 4, 4), box, 'plastic', pink, { shadow: 0.3 });
        glint(g, x - 1.2, 202.8, 2, 1);
      }
    });
    // the drill bit: ground steel with spiral flutes
    within(g, drillBit, () => {
      g.fillStyle = hgrad(g, CX - 52, CX + 52, [[0, '#4a5260'], [0.25, '#f4f8fc'], [0.5, '#9aa4b0'], [1, '#2a3040']]);
      g.fillRect(box.x, 210, box.w, 100);
      texture(g, 'brushed', box, 0.3, 1);
      drillFlutes(g, rgba('#1a2030', 0.7), 4);
      g.save();
      g.translate(-1, -1.5);
      drillFlutes(g, rgba('#ffffff', 0.55), 1.4);
      g.restore();
    });
    finishLight(sil, chrome, '#101828', 0.3);
    sil.finish(inkOf(shade(chrome, -0.3)), { openTop: -5 });
  },
});

// ════════════════════════ Comet Cora ════════════════════════
// An icy rock foot (pitted blue stone, frost and ice crystals) wrapped in a blazing cyan tail that streams up its
// sides. In play the tail streams for real behind every burst, sparkles shed off it, and it flares before a burst.

function cometTail(g: Ctx, k: number, cyan: string): void {
  for (const s of [-1, 1]) {
    const tail: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX + s * 70, 250);
      c.bezierCurveTo(CX + s * 118, 220, CX + s * 128, 120, CX + s * 118, 10);
      c.bezierCurveTo(CX + s * 104, 90, CX + s * 96, 170, CX + s * 62, 220);
      c.closePath();
    };
    within(g, tail, () => {
      g.fillStyle = vgrad(g, 0, 250, [[0, rgba(cyan, 0)], [0.6, rgba(cyan, 0.7 * k)], [1, rgba('#ffffff', 0.9 * k)]]);
      g.fillRect(CX + (s < 0 ? -140 : 50), 0, 90, 260);
    });
  }
  softStroke(g, (c) => c.ellipse(CX, 252, 92, 18, 0, 0.1, Math.PI - 0.1), rgba('#ffffff', 0.8 * k), 4, 2);
}

registerStyle('comet', {
  rig: BARE_RIG,
  contactY: 262,
  leg: { kind: 'skin', hw: 50, join: 'blend', fade: 26 },
  draw(ctx, art, p, o) {
    const cyan = art.primary ?? '#5ad8ff';
    if (o.emissive) {
      const toes = poseToes(restToes({ toe: 1.04 }), p);
      glowLayer(ctx, [...bareParts(toes, { toe: 1.04 }), rrect(CX - 140, 0, 280, 270, 0)], { x: CX - 140, y: 0, w: 280, h: 280 }, (g) => cometTail(g, 1, cyan));
      return;
    }
    if (!o.live) cometTail(ctx, 0.8, cyan);
    bareWith(ctx, { skin: art.skin, nails: null, shadowTint: '#102048', pores: 0, detail: 0.3, toe: 1.04 }, p, (g, f) => {
      texture(g, 'stone', f.box, 0.5, 1.3);
      // craters
      const r = rng(hashStr('comet'));
      for (let i = 0; i < 9; i++) {
        const x = CX - 80 + r() * 160;
        const y = 30 + r() * 170;
        const s = 6 + r() * 10;
        ao(g, x + 2, y + 2, s, s * 0.7, 0.45, 0, '#0a1430');
        spec(g, x + s * 0.4, y + s * 0.4, s * 0.5, s * 0.25, 0.35, -0.6, '#e8f4ff');
      }
      // frost on the lit side, ice crystals
      softFill(g, ell(CX - 50, 80, 50, 70), rgba('#ffffff', 0.25), 12);
      for (let i = 0; i < 12; i++) {
        const x = CX - 80 + r() * 160;
        const y = 20 + r() * 210;
        const s = 3 + r() * 4;
        const d: PathFn = (c) => {
          c.beginPath();
          c.moveTo(x, y - s * 1.4);
          c.lineTo(x + s * 0.7, y);
          c.lineTo(x, y + s * 1.4);
          c.lineTo(x - s * 0.7, y);
          c.closePath();
        };
        piece(g, d, f.box, 'glass', '#e8f8ff', { shadow: 0.3 });
      }
      // hot underneath: the leading edge glows white where it burns through the air
      g.fillStyle = vgrad(g, 210, 272, [[0, rgba('#ffffff', 0)], [1, rgba('#e8f8ff', 0.7)]]);
      g.fillRect(f.box.x, 210, f.box.w, 62);
    }, inkOf(mix(art.skin, '#102048', 0.4)));
  },
});

// ════════════════════════ Mars Rover Rory ════════════════════════
// A Mars rover with a foot inside: dusty white body panels with a RORY plate, two camera eyes, wide solar wings and
// six rocker-bogie wheels. In play the camera mast swivels on a spring, the solar cells glint, and it throws red
// dust when it lands.

export const MAST: [number, number] = [CX + 50, 36];
function mastPart(g: Ctx): void {
  const [x, y] = MAST;
  const parts = [rrect(x - 4, y - 50, 8, 52, 2), rrect(x - 22, y - 74, 44, 26, 6)];
  prop(g, parts, { x: x - 26, y: y - 78, w: 52, h: 84 }, (pg, sil) => {
    sil.form({ base: '#d8d4c8', shadowTint: '#3a2a20', ramp: 0.8, form: 0.5, formSize: 8, bevel: 0.4, rim: 0.5 });
    for (const s of [-1, 1]) {
      piece(pg, ell(x + s * 10, y - 61, 7, 7), { x: x - 22, y: y - 74, w: 44, h: 26 }, 'plastic', '#1a1e28', { shadow: 0.4 });
      glint(pg, x + s * 10 - 2, y - 63, 2.4, 1);
    }
  }, inkOf('#8a8478'), { w: 3.6 });
}

registerStyle('rover', {
  contactY: 274,
  halfWidth: 140,
  leg: { kind: 'iron', hw: 54, join: 'into' },
  parts: { mast: { box: { x: MAST[0] - 30, y: MAST[1] - 82, w: 60, h: 92 }, frames: 1, pivot: MAST, draw: (g) => mastPart(g) } },
  draw(ctx, art, _p, o) {
    const white = art.primary ?? '#e8e2d6';
    const rust = art.secondary ?? '#c8642a';
    const body = rrect(CX - 76, 30, 152, 166, 16);
    const neck = rrect(CX - 40, -6, 80, 40, 6);
    const wings = [rrect(CX - 140, 64, 70, 76, 4), rrect(CX + 70, 64, 70, 76, 4)];
    const wheels: PathFn[] = [];
    for (const x of [CX - 108, CX - 64, CX + 64, CX + 108]) wheels.push(rrect(x - 19, 214, 38, 58, 10));
    const box = { x: CX - 144, y: -10, w: 288, h: 290 };
    if (!o.live) mastPart(ctx);
    const seg = (x0: number, y0: number, x1: number, y1: number, w: number): PathFn => (c) => {
      const a = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2;
      const dx = (Math.cos(a) * w) / 2;
      const dy = (Math.sin(a) * w) / 2;
      c.beginPath();
      c.moveTo(x0 + dx, y0 + dy);
      c.lineTo(x1 + dx, y1 + dy);
      c.lineTo(x1 - dx, y1 - dy);
      c.lineTo(x0 - dx, y0 - dy);
      c.closePath();
    };
    const struts: PathFn[] = [];
    for (const s of [-1, 1]) struts.push(seg(CX + s * 60, 176, CX + s * 86, 206, 9), seg(CX + s * 86, 206, CX + s * 64, 232, 8), seg(CX + s * 86, 206, CX + s * 108, 232, 8));
    const sil = new Sil(ctx, [neck, ...wings, ...struts, ...wheels, body], box);
    const g = sil.g;
    // the wheels: black grippy tyres, grousers, hubs
    for (const [i, w] of wheels.entries()) {
      const x = [CX - 108, CX - 64, CX + 64, CX + 108][i];
      piece(g, w, box, 'rubber', '#2a2a30', { shadow: 0 });
      within(g, w, () => {
        for (let y = 218; y < 272; y += 8) {
          g.fillStyle = rgba('#000000', 0.5);
          g.fillRect(x - 19, y, 38, 3);
          g.fillStyle = rgba('#8a8a96', 0.3);
          g.fillRect(x - 19, y + 3, 38, 1);
        }
      });
      piece(g, ell(x, 243, 9, 12), box, 'chrome', '#b8c0cc', { shadow: 0.4 });
    }
    // the rocker-bogie: struts from the body to the wheels
    for (const st of struts) piece(g, st, box, 'chrome', '#9aa4b0', { shadow: 0.3 });
    for (const s of [-1, 1]) rivet(g, CX + s * 86, 206, 5, '#c8ccd4');
    // solar wings: blue cells in a silver frame
    for (const [i, w] of wings.entries()) {
      const x0 = i ? CX + 70 : CX - 140;
      piece(g, w, box, 'chrome', '#9aa4b0', { shadow: 0.4 });
      for (let cx = 0; cx < 3; cx++)
        for (let cy = 0; cy < 3; cy++) {
          const cell = rrect(x0 + 5 + cx * 21, 69 + cy * 23, 19, 21, 1.5);
          within(g, cell, () => {
            g.fillStyle = vgrad(g, 69 + cy * 23, 90 + cy * 23, [[0, '#3a6ad8'], [1, '#14246a']]);
            g.fillRect(x0, 64, 70, 80);
            g.strokeStyle = rgba('#8ab8ff', 0.4);
            g.lineWidth = 0.6;
            for (let k = 1; k < 4; k++) {
              g.beginPath();
              g.moveTo(x0 + 5 + cx * 21 + k * 5, 69 + cy * 23);
              g.lineTo(x0 + 5 + cx * 21 + k * 5, 90 + cy * 23);
              g.stroke();
            }
          });
        }
      spec(g, x0 + 18, 80, 16, 6, 0.55, -0.5);
    }
    // the neck where the leg goes in
    piece(g, neck, box, 'iron', '#6a7078', { shadow: 0 });
    // the body: dusty white panels, rust-red Martian dust round the bottom
    piece(g, body, box, 'rubber', white, { shadow: 0.5 });
    within(g, body, () => {
      texture(g, 'canvas', box, 0.15, 1);
      crease(g, (c) => {
        c.moveTo(CX, 34);
        c.lineTo(CX, 194);
        c.moveTo(CX - 74, 110);
        c.lineTo(CX + 74, 110);
      }, 1.6, '#6a6458', 0.5, 0.3);
      for (const [x, y] of [[CX - 66, 40], [CX + 66, 40], [CX - 66, 186], [CX + 66, 186]] as const) rivet(g, x, y, 2.6, '#c8ccd4');
      g.fillStyle = vgrad(g, 120, 196, [[0, rgba(rust, 0)], [1, rgba(rust, 0.55)]]);
      g.fillRect(box.x, 120, box.w, 80);
      blotches(g, { x: CX - 76, y: 100, w: 152, h: 96 }, rust, 0.45, 14, 0.55, 0.2, 7);
      // the name plate
      const plate = rrect(CX - 56, 48, 70, 30, 4);
      piece(g, plate, box, 'enamel', '#f4ece0', { shadow: 0.4 });
      g.save();
      g.font = '900 17px "Arial Black", Impact, sans-serif';
      g.textAlign = 'center';
      g.fillStyle = shade(rust, -0.25);
      g.fillText('RORY', CX - 21, 70);
      g.restore();
      // two camera eyes
      for (const s of [-1, 1]) {
        const x = CX + s * 26;
        piece(g, ell(x, 146, 12, 12), box, 'chrome', '#3a3e48', { shadow: 0.5 });
        piece(g, ell(x, 146, 7, 7), box, 'plastic', '#0a0c12', { shadow: 0 });
        glint(g, x - 3, 143, 3, 1);
      }
    });
    finishLight(sil, white, '#2a2030', 0.3);
    sil.finish(inkOf(shade(white, -0.3)), { openTop: -5 });
  },
});

// ════════════════════════ Starlight Stella ════════════════════════
// A velvet slipper stitched from the night sky: deep blue nap with a milky band, a constellation in gold thread, a
// crescent moon and a gold star on the toe. In play the stars twinkle (their own glow layer) and sparkles gather.

const STELLA = { topW: 56, ballW: 92, toeY: 250 };
const starToe = starPath(CX, 266, 22, 10, -Math.PI / 2, 5, 0.6);
const STARS: [number, number][] = [[CX - 30, 70], [CX + 6, 50], [CX + 34, 84], [CX + 20, 130], [CX - 14, 156], [CX + 52, 168]];

function stellaGlow(g: Ctx, gold: string): void {
  for (const [x, y] of STARS) glowDot(g, x, y, 9, gold, 0.95);
  glowDot(g, CX - 48, 186, 22, gold, 0.6);
  glowDot(g, CX, 262, 28, gold, 0.85);
}

registerStyle('starlight', {
  contactY: 288,
  halfWidth: 100,
  rig: { from: 200, to: 220 },
  leg: { kind: 'wool', hw: 62, join: 'hem' },
  draw(ctx, art, p, o) {
    const navy = art.primary ?? '#1c2466';
    const gold = art.secondary ?? '#ffe14d';
    const flex = Math.max(0, p.curl);
    const upper = upperPath(STELLA, flex);
    const box = { x: CX - 100, y: -10, w: 200, h: 300 };
    if (o.emissive) {
      glowLayer(ctx, [upper, starToe], box, (g) => stellaGlow(g, gold));
      return;
    }
    const sil = new Sil(ctx, [upper, starToe], box);
    const g = sil.g;
    piece(g, upper, box, 'plush', navy, { shadow: 0, texA: 0.25 });
    within(g, upper, () => {
      // the milky way: a soft diagonal band of light dust
      softFill(g, (c) => {
        c.beginPath();
        c.moveTo(CX - 100, 40);
        c.lineTo(CX - 60, 20);
        c.lineTo(CX + 100, 190);
        c.lineTo(CX + 70, 220);
        c.closePath();
      }, rgba('#8a7ad8', 0.3), 14);
      const r = rng(hashStr('starlight'));
      for (let i = 0; i < 120; i++) {
        g.fillStyle = rgba(r() < 0.8 ? '#ffffff' : gold, 0.3 + r() * 0.6);
        g.beginPath();
        g.arc(CX - 96 + r() * 192, r() * 250, 0.4 + r() * r() * 1.6, 0, Math.PI * 2);
        g.fill();
      }
      // the constellation in gold thread
      stitches(g, (c) => {
        STARS.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      }, rgba(gold, 0.85), 1.2, 3, 2.5);
      for (const [x, y] of STARS) {
        piece(g, starPath(x, y, 6, 2.6), box, 'gold', gold, { shadow: 0.4 });
      }
      // the crescent moon
      const moon: PathFn = (c) => {
        c.beginPath();
        c.arc(CX - 48, 186, 20, 0, Math.PI * 2);
        c.arc(CX - 38, 178, 17, 0, Math.PI * 2, true);
      };
      piece(g, moon, box, 'gold', gold, { shadow: 0.45 });
      // the slipper's soft opening and a sheen across the nap
      ao(g, CX, 6, 60, 10, 0.4, 0, '#000010');
      spec(g, CX - 40, 90, 30, 60, 0.15, 0.3, '#c8c0ff');
    });
    // the gold star on the toe
    within(g, starToe, () => {
      g.fillStyle = vgrad(g, 244, 288, [[0, shade(gold, 0.35)], [1, shade(gold, -0.3)]]);
      g.fillRect(CX - 24, 240, 48, 50);
    });
    contact(g, (c) => {
      starToe(c);
      c.fill();
    }, 0);
    spec(g, CX - 6, 258, 8, 4, 0.8);
    glint(g, CX - 6, 256, 4, 1);
    finishLight(sil, navy, '#000020', 0.25);
    sil.finish(inkOf(shade(navy, 0.25)), { openTop: -5 });
    void LX;
    void LY;
  },
});

export { hgrad };
