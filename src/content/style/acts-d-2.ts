// Batch D, part 2: Act 7's bosses and their drones (Ultoe and the Ultoe Drones, Lex Lugtoe, Doomstomp, Thanfoot),
// redrawn in the style kit. Each boss has an emissive layer and an overheat layer for its later phases. Life in
// play: src/content/styleLive/acts-d.ts.
//
// Gameplay anchors kept exactly: Ultoe's core sits at (110, 82) on a sole at y 266 (CORE in the fight), and
// Thanfoot's six sockets sit at SOCKETS on a sole at y 282 (the fight places the stones there).

import type { FootArt } from '../../data/feet';
import { CX } from '../../art/feetCommon';
import { type BareFoot, bareOutline, paintBare } from '../../art/style/bare';
import { bareBox, bareParts, poseToes, restToes } from '../../art/style/anatomy';
import { LIGHT, type PathFn, type Pose, ao, crease, glint, inkOf, softFill, softStroke, spec, texture } from '../../art/style/kit';
import { Sil, lobe } from '../../art/style/sil';
import { registerStyle } from '../../art/style/registry';
import { blotches, contact, rivet } from '../../art/style/details';
import { tones } from '../../art/style/materials';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';
import { SOCKETS } from '../art/act7';
import { ell, finishLight, hgrad, piece, rrect, solePath, upperPath, vgrad, within } from './roster-kit';
import { DMAT, glowOnly, heatRise, hotEye, hotLine, oneLight } from './acts-d-kit';

type Opts = { live: boolean; emissive?: boolean; heat?: boolean };

// ════════════════════════ Ultoe and the Ultoe Drones ════════════════════════
// A robot sneaker: a white enamel-and-chrome shell in panels, maroon lightning decals, a vented collar, an LED strip
// along the sole and a round core port on the vamp. Ultoe's core burns red in his portrait and peel; in play he wears
// a drone's dead grey lens, because his fight's own core sprite must be the only tell. In play the LEDs chase, the
// cores flicker and static crackles off them.

/** The core's centre (the fight's CORE, design space). */
export const ROBO_CORE: [number, number] = [CX, 82];
const ROBO = { topW: 58, ballW: 100, toeY: 240 };

const roboCollar = rrect(CX - 62, -6, 124, 30, 10);

function roboLeds(g: Ctx, col: string, on: number, flex: number): void {
  for (let i = 0; i < 9; i++) {
    const x = CX - 72 + i * 18;
    const y = 252 - flex * 5;
    g.fillStyle = '#0c0e14';
    g.beginPath();
    g.roundRect(x - 6, y - 3.5, 12, 7, 3.5);
    g.fill();
    if (on > 0) {
      const lg = g.createRadialGradient(x, y, 0.5, x, y, 7);
      lg.addColorStop(0, rgba(mix(col, '#ffffff', 0.6), on));
      lg.addColorStop(0.5, rgba(col, on * 0.85));
      lg.addColorStop(1, rgba(col, 0));
      g.fillStyle = lg;
      g.fillRect(x - 8, y - 6, 16, 12);
    }
  }
}

function roboCore(g: Ctx, coreCol: string, live: boolean, drone: boolean): void {
  const [x, y] = ROBO_CORE;
  // the port: a recessed steel ring
  if (!drone && !live) {
    // Ultoe's core lights the shell round it
    const bl = g.createRadialGradient(x, y, 10, x, y, 60);
    bl.addColorStop(0, rgba(coreCol, 0.45));
    bl.addColorStop(1, rgba(coreCol, 0));
    g.fillStyle = bl;
    g.fillRect(x - 60, y - 60, 120, 120);
  }
  contact(g, (c) => {
    c.beginPath();
    c.arc(x, y, 30, 0, Math.PI * 2);
    c.fill();
  }, 0.55, 3, 4);
  const ring = g.createLinearGradient(x - 30, y - 30, x + 30, y + 30);
  ring.addColorStop(0, '#f4f8fc');
  ring.addColorStop(0.5, '#8a929e');
  ring.addColorStop(1, '#2a2e36');
  g.fillStyle = ring;
  g.beginPath();
  g.arc(x, y, 30, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#0a0c12';
  g.beginPath();
  g.arc(x, y, 22, 0, Math.PI * 2);
  g.fill();
  // the lens
  const lg = g.createRadialGradient(x - 5, y - 5, 1, x, y, 20);
  if (drone || live) {
    lg.addColorStop(0, drone ? '#a8b0bc' : shade(coreCol, -0.2));
    lg.addColorStop(0.6, drone ? coreCol : shade(coreCol, -0.55));
    lg.addColorStop(1, '#14161c');
  } else {
    lg.addColorStop(0, '#ffffff');
    lg.addColorStop(0.3, mix(coreCol, '#ffffff', 0.4));
    lg.addColorStop(0.7, coreCol);
    lg.addColorStop(1, shade(coreCol, -0.6));
  }
  g.fillStyle = lg;
  g.beginPath();
  g.arc(x, y, 19, 0, Math.PI * 2);
  g.fill();
  // aperture blades
  g.strokeStyle = rgba('#000000', 0.35);
  g.lineWidth = 1;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    g.beginPath();
    g.moveTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7);
    g.lineTo(x + Math.cos(a + 0.9) * 19, y + Math.sin(a + 0.9) * 19);
    g.stroke();
  }
  spec(g, x - 7, y - 8, 7, 4.5, 0.9, -0.6);
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    rivet(g, x + Math.cos(a) * 26, y + Math.sin(a) * 26, 2, '#d8dee8');
  }
}

function drawRobo(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const shell = art.primary ?? '#c9d0da';
  const bolt = art.secondary ?? '#7a2230';
  const coreCol = (art.extra?.core as string | undefined) ?? '#ff3a3a';
  // in play Ultoe looks exactly like a drone: the fight's own core sprite is the only tell (his portrait and peel
  // keep the burning core)
  const drone = !!art.extra?.drone || o.live;
  const flex = Math.max(0, p.curl);
  const upper = upperPath(ROBO, flex);
  const sole = solePath(ROBO, flex, 22, 190, 4);
  const box = { x: CX - 114, y: -10, w: 228, h: 280 };
  const parts = [sole, upper, roboCollar];
  const ledCol = drone ? '#8ab8d8' : coreCol;
  if (o.emissive) {
    glowOnly(ctx, parts, box, (g) => {
      roboLeds(g, ledCol, drone ? 0.45 : 1, flex);
      const [x, y] = ROBO_CORE;
      const cg = g.createRadialGradient(x, y, 1, x, y, drone ? 22 : 40);
      cg.addColorStop(0, rgba(drone ? '#c8d8ec' : mix(coreCol, '#ffffff', 0.6), drone ? 0.55 : 1));
      cg.addColorStop(0.5, rgba(drone ? '#7d8694' : coreCol, drone ? 0.3 : 0.75));
      cg.addColorStop(1, rgba(coreCol, 0));
      g.fillStyle = cg;
      g.fillRect(x - 42, y - 42, 84, 84);
      // the vents in the collar breathe light
      for (let i = 0; i < 5; i++) {
        g.fillStyle = rgba(ledCol, drone ? 0.25 : 0.6);
        g.fillRect(CX - 36 + i * 16, 6, 8, 3);
      }
    });
    return;
  }
  if (o.heat) {
    glowOnly(ctx, parts, box, (g) => {
      heatRise(g, box, 40, 266, 71, '#ff4a2a');
      // seams run hottest
      for (const y of [150, 196]) hotLine(g, (c) => {
        c.moveTo(CX - 98, y);
        c.quadraticCurveTo(CX, y + 14, CX + 98, y);
      }, '#ff8a4a', 2.2, 0.8);
    });
    return;
  }
  const sil = new Sil(ctx, parts, box);
  const g = sil.g;
  // the sole: dark polymer with the LED strip
  within(g, sole, () => {
    g.fillStyle = vgrad(g, 190, 266, [[0, '#3a3e48'], [1, '#0c0e14']]);
    g.fillRect(box.x, 180, box.w, 90);
    texture(g, 'rubber', box, 0.3);
    roboLeds(g, ledCol, o.live ? 0 : drone ? 0.35 : 0.9, flex);
    spec(g, CX - 50, 236, 30, 4, 0.3, 0.05);
  });
  // the shell: white enamel panels over chrome
  piece(g, upper, box, 'enamel', mix(shell, '#ffffff', 0.35), { shadow: 0.4, size: 18 });
  within(g, upper, () => {
    texture(g, 'brushed', box, 0.15);
    // panel seams with a lit lip
    for (const y of [40, 150, 196]) {
      crease(g, (c) => {
        c.moveTo(CX - 104, y - flex * (y > 140 ? 4 : 0));
        c.quadraticCurveTo(CX, y + 14 - flex * (y > 140 ? 8 : 0), CX + 104, y - flex * (y > 140 ? 4 : 0));
      }, 2, '#1a1e28', 0.6, 0.5);
    }
    crease(g, (c) => {
      c.moveTo(CX, 40);
      c.lineTo(CX, 56);
      c.moveTo(CX, 108);
      c.lineTo(CX, 156);
    }, 2, '#1a1e28', 0.5, 0.45);
    // the chrome toe cap
    const cap: PathFn = (c) => {
      c.beginPath();
      c.ellipse(CX, 242 - flex * 6, 92, 50, 0, Math.PI, 0);
      c.closePath();
    };
    within(g, cap, () => {
      g.fillStyle = hgrad(g, CX - 92, CX + 92, [[0, '#9aa2ae'], [0.18, '#ffffff'], [0.32, '#b8c0cc'], [0.55, '#4a525e'], [0.8, '#8a929e'], [1, '#2a2e36']]);
      g.fillRect(box.x, 180, box.w, 70);
      texture(g, 'brushed', box, 0.25);
    });
    // maroon lightning decals down both sides
    for (const s of [-1, 1]) {
      const boltP: PathFn = (c) => {
        c.beginPath();
        c.moveTo(CX + s * 56, 100);
        c.lineTo(CX + s * 96, 128);
        c.lineTo(CX + s * 74, 134);
        c.lineTo(CX + s * 104, 180);
        c.lineTo(CX + s * 50, 142);
        c.lineTo(CX + s * 74, 136);
        c.closePath();
      };
      piece(g, boltP, box, 'enamel', bolt, { shadow: 0.25, size: 4 });
    }
    // side vents
    for (const s of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const y = 64 + i * 10;
        g.fillStyle = '#14161c';
        g.beginPath();
        g.roundRect(CX + s * 70 - 12, y, 24, 4, 2);
        g.fill();
        g.fillStyle = rgba('#ffffff', 0.5);
        g.fillRect(CX + s * 70 - 11, y + 4, 22, 1);
      }
    spec(g, CX - 46, 100, 24, 60, 0.4, 0.15);
    spec(g, CX - 40, 212 - flex * 5, 30, 8, 0.9, -0.1);
    glint(g, CX - 58, 208 - flex * 5, 4.5, 0.9);
  });
  roboCore(g, drone ? '#7d8694' : coreCol, o.live, drone);
  // the collar: a steel ring with vents
  within(g, roboCollar, () => {
    g.fillStyle = vgrad(g, -6, 24, [[0, '#f4f8fc'], [0.4, '#a8b0bc'], [1, '#3a3e48']]);
    g.fillRect(box.x, -8, box.w, 34);
    texture(g, 'brushed', box, 0.2);
    for (let i = 0; i < 5; i++) {
      g.fillStyle = '#14161c';
      g.fillRect(CX - 36 + i * 16, 5, 8, 5);
    }
  });
  rivet(g, CX - 52, 9, 2.6, '#d8dee8');
  rivet(g, CX + 52, 9, 2.6, '#d8dee8');
  ao(g, CX, 26, 64, 5, 0.4);
  finishLight(sil, shell, '#141828', 0.38);
  sil.finish(inkOf(shade(shell, -0.35)), { openTop: -5 });
}

for (const id of ['ultoe', 'ultodrone'])
  registerStyle(id, {
    contactY: 266,
    halfWidth: 102,
    leg: { kind: 'iron', hw: 56, join: 'into' },
    draw(ctx, art, p, o) {
      drawRobo(ctx, art, p, o);
    },
  });

// ════════════════════════ LEX LUGTOE ════════════════════════
// A power-armour brogue in green enamel plate with purple trim, a perforated wingtip toe cap and a glass cockpit
// dome on the vamp where the bald billionaire sits, smug in his glasses. In play he blinks behind the glass, the
// dome glints, the green vents under the sole glow and an overheated suit vents steam.

const LEX = { topW: 62, ballW: 104, toeY: 240 };
export const LEX_DOME = { x: CX, y: 108, r: 40 };

/** Lex in his cockpit (frame i: 0 eyes open … 1 shut). */
function lexFace(g: Ctx, skin: string, blink: number): void {
  const { x, y, r } = LEX_DOME;
  g.save();
  g.beginPath();
  g.arc(x, y, r - 4, 0, Math.PI * 2);
  g.clip();
  // the cockpit's dark interior
  const bg = g.createRadialGradient(x, y - 10, 4, x, y, r);
  bg.addColorStop(0, '#3a2a4a');
  bg.addColorStop(1, '#120a18');
  g.fillStyle = bg;
  g.fillRect(x - r, y - r, r * 2, r * 2);
  // the bald head: a lit dome, ears, a heavy brow
  const head: PathFn = (c) => {
    c.beginPath();
    c.ellipse(x, y + 8, 24, 30, 0, 0, Math.PI * 2);
  };
  for (const s of [-1, 1]) piece(g, ell(x + s * 24, y + 10, 5, 8), { x: x - 30, y: y - 20, w: 60, h: 60 }, 'skin', shade(skin, -0.08), { shadow: 0.3, spec: false, size: 3 });
  piece(g, head, { x: x - 24, y: y - 22, w: 48, h: 60 }, 'skin', skin, { shadow: 0.5, size: 9 });
  spec(g, x - 9, y - 12, 11, 7, 0.75, -0.5);
  glint(g, x - 10, y - 14, 3.2, 0.8);
  // a smug face: narrowed eyes behind round glasses, a smirk
  for (const s of [-1, 1]) {
    const ex = x + s * 9;
    const ey = y + 6;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(ex, ey, 4.4, 3, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#2a1a10';
    g.beginPath();
    g.arc(ex + 0.8, ey + 0.4, 2, 0, Math.PI * 2);
    g.fill();
    // the lids: half-shut (smug), fully shut on a blink
    g.fillStyle = shade(skin, -0.12);
    g.fillRect(ex - 5, ey - 4, 10, 2.6 + blink * 5);
    g.strokeStyle = rgba('#4a2a18', 0.8);
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(ex - 5, ey - 1.6 + blink * 4.6);
    g.lineTo(ex + 5, ey - 1.2 + blink * 4.6);
    g.stroke();
    // the brow
    g.strokeStyle = rgba(shade(skin, -0.45), 0.8);
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(ex - 6, ey - 6 - s * 0.6);
    g.lineTo(ex + 6, ey - 6 + s * 0.6);
    g.stroke();
    // round wire glasses
    g.strokeStyle = '#1a1a20';
    g.lineWidth = 1.4;
    g.beginPath();
    g.arc(ex, ey, 6.5, 0, Math.PI * 2);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(x - 2.5, y + 6);
  g.lineTo(x + 2.5, y + 6);
  g.stroke();
  // the nose and the smirk
  g.strokeStyle = rgba(shade(skin, -0.4), 0.7);
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(x, y + 10);
  g.quadraticCurveTo(x - 2, y + 16, x + 2, y + 18);
  g.stroke();
  g.strokeStyle = '#5a2a20';
  g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(x - 7, y + 25);
  g.quadraticCurveTo(x + 2, y + 27, x + 9, y + 21);
  g.stroke();
  // his purple suit collar
  g.fillStyle = '#4a1a6a';
  g.beginPath();
  g.ellipse(x, y + 44, 26, 12, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** The dome's glass over him: a cool tint and window reflections. */
function lexGlass(g: Ctx): void {
  const { x, y, r } = LEX_DOME;
  g.save();
  g.beginPath();
  g.arc(x, y, r - 4, 0, Math.PI * 2);
  g.clip();
  const gl = g.createRadialGradient(x - 12, y - 14, 4, x, y, r);
  gl.addColorStop(0, rgba('#e8f8ff', 0.25));
  gl.addColorStop(0.7, rgba('#8ad0e0', 0.08));
  gl.addColorStop(1, rgba('#203048', 0.45));
  g.fillStyle = gl;
  g.fillRect(x - r, y - r, r * 2, r * 2);
  g.strokeStyle = rgba('#ffffff', 0.7);
  g.lineWidth = 4;
  g.beginPath();
  g.arc(x, y, r - 11, Math.PI * 1.1, Math.PI * 1.45);
  g.stroke();
  g.lineWidth = 2;
  g.beginPath();
  g.arc(x, y, r - 11, Math.PI * 1.52, Math.PI * 1.6);
  g.stroke();
  g.restore();
}

function lexDomeRim(g: Ctx, purple: string): void {
  const { x, y, r } = LEX_DOME;
  contact(g, (c) => {
    c.beginPath();
    c.arc(x, y, r + 2, 0, Math.PI * 2);
    c.fill();
  }, 0.5, 3, 4);
  g.save();
  g.beginPath();
  g.arc(x, y, r + 2, 0, Math.PI * 2);
  g.arc(x, y, r - 4, 0, Math.PI * 2, true);
  g.clip();
  const rg = g.createLinearGradient(x - r, y - r, x + r, y + r);
  rg.addColorStop(0, shade(purple, 0.45));
  rg.addColorStop(0.5, purple);
  rg.addColorStop(1, shade(purple, -0.55));
  g.fillStyle = rg;
  g.fillRect(x - r - 4, y - r - 4, r * 2 + 8, r * 2 + 8);
  g.restore();
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2;
    rivet(g, x + Math.cos(a) * (r - 1), y + Math.sin(a) * (r - 1), 2.4, '#e8c860');
  }
}

function drawLex(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const green = art.primary ?? '#2f8a4a';
  const purple = art.secondary ?? '#7a3fb0';
  const flex = Math.max(0, p.curl);
  const upper = upperPath(LEX, flex);
  const sole = solePath(LEX, flex, 26, 186, 6);
  const collar = rrect(CX - 66, -6, 132, 30, 10);
  const box = { x: CX - 118, y: -10, w: 236, h: 284 };
  const parts = [sole, upper, collar];
  const vents = (g: Ctx, a: number) => {
    for (let i = 0; i < 5; i++) {
      const x = CX - 60 + i * 30;
      const y = 256 - flex * 5;
      const vg = g.createRadialGradient(x, y, 1, x, y, 14);
      vg.addColorStop(0, rgba('#d8ffd0', a));
      vg.addColorStop(0.4, rgba('#4aff7a', a * 0.8));
      vg.addColorStop(1, rgba('#1a8a3a', 0));
      g.fillStyle = vg;
      g.fillRect(x - 16, y - 8, 32, 16);
    }
  };
  if (o.emissive) {
    glowOnly(ctx, parts, box, (g) => {
      vents(g, 1);
      // the trim's power lines
      for (const s of [-1, 1]) hotLine(g, (c) => {
        c.moveTo(CX + s * 64, 30);
        c.bezierCurveTo(CX + s * 82, 80, CX + s * 98, 120, CX + s * 98, 180);
      }, '#4aff7a', 1.6, 0.6);
    });
    return;
  }
  if (o.heat) {
    glowOnly(ctx, parts, box, (g) => {
      heatRise(g, box, 30, 272, 73, '#ff6a1a');
      hotLine(g, (c) => c.ellipse(CX, 236 - flex * 6, 86, 56, 0, Math.PI + 0.15, -0.15), '#ffb04a', 2.4, 0.8);
    });
    return;
  }
  const sil = new Sil(ctx, parts, box);
  const g = sil.g;
  within(g, sole, () => {
    g.fillStyle = vgrad(g, 186, 272, [[0, '#2a3a30'], [1, '#0a100c']]);
    g.fillRect(box.x, 180, box.w, 96);
    texture(g, 'cast', box, 0.35);
    for (let i = 0; i < 5; i++) {
      const x = CX - 60 + i * 30;
      g.fillStyle = '#060a08';
      g.beginPath();
      g.roundRect(x - 10, 252 - flex * 5, 20, 8, 3);
      g.fill();
    }
    if (!o.live) vents(g, 0.8);
  });
  // the armour: green enamel plates, bevelled bands across
  piece(g, upper, box, 'enamel', green, { shadow: 0.4, size: 18 });
  within(g, upper, () => {
    texture(g, 'grain', box, 0.12);
    for (const y of [44, 76, 166]) {
      crease(g, (c) => {
        c.moveTo(CX - 104, y);
        c.quadraticCurveTo(CX, y + 12, CX + 104, y);
      }, 2.2, '#06180c', 0.55, 0.45);
    }
    spec(g, CX - 54, 120, 18, 60, 0.5, 0.12);
    // purple trim down the sides with a power line in it
    for (const s of [-1, 1]) {
      const trim: PathFn = (c) => {
        c.beginPath();
        c.moveTo(CX + s * 56, 20);
        c.bezierCurveTo(CX + s * 78, 80, CX + s * 92, 120, CX + s * 92, 186);
        c.lineTo(CX + s * 110, 186);
        c.lineTo(CX + s * 110, 20);
        c.closePath();
      };
      piece(g, trim, box, 'enamel', purple, { shadow: 0.45, size: 8 });
      g.save();
      g.lineCap = 'round';
      g.strokeStyle = rgba('#3aff6a', 0.75);
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(CX + s * 64, 30);
      g.bezierCurveTo(CX + s * 82, 80, CX + s * 98, 120, CX + s * 98, 180);
      g.stroke();
      g.restore();
    }
    // the wingtip toe cap: a double-curved W with brogue perforations
    const wing = (c: Ctx, dy: number) => {
      c.moveTo(CX - 102, 176 + dy - flex * 4);
      c.bezierCurveTo(CX - 70, 168 + dy, CX - 30, 186 + dy, CX, 206 + dy - flex * 4);
      c.bezierCurveTo(CX + 30, 186 + dy, CX + 70, 168 + dy, CX + 102, 176 + dy - flex * 4);
    };
    crease(g, (c) => wing(c, 0), 2.4, '#041008', 0.7, 0.4);
    for (const dy of [7]) {
      g.save();
      g.setLineDash([0.1, 6]);
      g.lineCap = 'round';
      g.beginPath();
      wing(g, dy);
      g.strokeStyle = '#041008';
      g.lineWidth = 3.4;
      g.stroke();
      g.translate(0.8, 0.8);
      g.beginPath();
      wing(g, dy);
      g.strokeStyle = rgba(LIGHT.key, 0.4);
      g.lineWidth = 1.2;
      g.stroke();
      g.restore();
    }
    // the medallion rosette on the toe
    const rr = rng(hashStr('lex-rosette'));
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      const x = CX + Math.cos(a) * 11 + (rr() - 0.5);
      const y = 226 - flex * 5 + Math.sin(a) * 7;
      ao(g, x + 0.6, y + 0.8, 2.4, 2, 0.6, 0, '#000000');
    }
    spec(g, CX - 40, 214 - flex * 5, 30, 8, 0.75, -0.12);
    glint(g, CX - 52, 210 - flex * 5, 4.5, 0.95);
  });
  // the collar: purple, with gold rivets
  piece(g, collar, box, 'enamel', shade(purple, -0.15), { shadow: 0.4, size: 7 });
  for (let i = 0; i < 6; i++) rivet(g, CX - 50 + i * 20, 9, 2.6, '#e8c860');
  // the cockpit dome
  lexDomeRim(g, purple);
  if (!o.live) lexFace(g, art.skin, 0);
  lexGlass(g);
  lobe(g, upper, { x: box.x, y: -20, w: box.w, h: 300 }, -30, 0, '#000000', 0.45, 16, 0.2);
  finishLight(sil, green, '#041810', 0.42);
  sil.finish(inkOf(green), { openTop: -5 });
}

const LEX_BLINK = 4;
registerStyle('lexlugtoe', {
  contactY: 270,
  halfWidth: 106,
  leg: { kind: 'iron', hw: 60, join: 'into' },
  parts: {
    face: {
      box: { x: LEX_DOME.x - LEX_DOME.r, y: LEX_DOME.y - LEX_DOME.r, w: LEX_DOME.r * 2, h: LEX_DOME.r * 2 },
      frames: LEX_BLINK,
      draw: (g, art, i) => {
        lexFace(g, art.skin, i / (LEX_BLINK - 1));
        lexGlass(g);
      },
    },
  },
  draw(ctx, art, p, o) {
    drawLex(ctx, art, p, o);
  },
});

// ════════════════════════ DOOMSTOMP ════════════════════════
// A hulking monster boot of pebbled hide, bone spikes bursting out of its sides, a row of bone teeth round the sole,
// a stitched scar and two burning eyes. In play the eyes blink and glare, the spikes pulse red as it builds to a
// rampage, it snorts steam, and in its later lives the hide cracks and glows like a furnace.

const DOOM_SPIKES: [number, number, number, number][] = [
  // root x, root y, angle, length (left side; mirrored)
  [CX - 84, 56, Math.PI * 1.18, 52],
  [CX - 104, 116, Math.PI * 1.04, 44],
  [CX - 104, 182, Math.PI * 0.9, 46],
];
export const DOOM_EYES = { y: 96, dx: 34 };

const doomBody = (flex: number): PathFn => (c) => {
  const b = 250 - flex * 6;
  c.beginPath();
  c.moveTo(CX - 70, -6);
  c.bezierCurveTo(CX - 76, 50, CX - 112, 100, CX - 110, 170);
  c.bezierCurveTo(CX - 110, b - 16, CX - 70, b, CX, b);
  c.bezierCurveTo(CX + 70, b, CX + 112, b - 16, CX + 112, 170);
  c.bezierCurveTo(CX + 112, 100, CX + 76, 50, CX + 70, -6);
  c.closePath();
};

const spikePath = (x: number, y: number, ang: number, len: number, w: number): PathFn => (c) => {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.beginPath();
  c.moveTo(0, -w / 2);
  c.quadraticCurveTo(len * 0.55, -w * 0.4, len, w * 0.08);
  c.quadraticCurveTo(len * 0.55, w * 0.5, 0, w / 2);
  c.closePath();
  c.restore();
};

function doomSpikes(): { x: number; y: number; ang: number; len: number; w: number }[] {
  const out: { x: number; y: number; ang: number; len: number; w: number }[] = [];
  for (const [x, y, a, l] of DOOM_SPIKES) {
    out.push({ x, y, ang: a, len: l, w: 26 });
    out.push({ x: 2 * CX - x, y, ang: Math.PI - a, len: l, w: 26 });
  }
  return out;
}

function doomTeeth(flex: number): { x: number; y: number; len: number }[] {
  const b = 250 - flex * 6;
  return [-78, -47, -16, 16, 47, 78].map((dx) => ({ x: CX + dx, y: b - 8 - Math.abs(dx) * 0.14, len: 32 - Math.abs(dx) * 0.08 }));
}

const toothPath = (x: number, y: number, len: number): PathFn => (c) => {
  c.beginPath();
  c.moveTo(x - 12, y);
  c.quadraticCurveTo(x - 9, y + len * 0.6, x + 1, y + len);
  c.quadraticCurveTo(x + 9, y + len * 0.5, x + 12, y);
  c.closePath();
};

function doomEyes(g: Ctx, hide: string, lid: number): void {
  const { y, dx } = DOOM_EYES;
  for (const s of [-1, 1]) {
    // a heavy brow ridge over each eye
    const brow: PathFn = (c) => {
      c.beginPath();
      c.moveTo(CX + s * (dx - 26), y + 2);
      c.quadraticCurveTo(CX + s * dx, y - 26, CX + s * (dx + 26), y - 22);
      c.quadraticCurveTo(CX + s * dx, y - 12, CX + s * (dx - 26), y + 2);
      c.closePath();
    };
    hotEye(g, CX + s * dx, y, 19, 9, -s * 0.38, '#ffb21a', lid, shade(hide, -0.2));
    piece(g, brow, { x: CX + s * dx - 26, y: y - 26, w: 52, h: 24 }, DMAT.hide, shade(hide, 0.1), { shadow: 0.6, size: 5 });
  }
}

function drawDoom(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const hide = art.primary ?? '#5d6b4a';
  const bone = art.secondary ?? '#efe6cf';
  const legSkin = art.skin;
  const flex = Math.max(0, p.curl);
  const body = doomBody(flex);
  const spikes = doomSpikes();
  const teeth = doomTeeth(flex);
  const box = { x: CX - 160, y: -10, w: 320, h: 300 };
  const parts = [body, ...spikes.map((k) => spikePath(k.x, k.y, k.ang, k.len, k.w)), ...teeth.map((t) => toothPath(t.x, t.y, t.len))];
  if (o.emissive) {
    glowOnly(ctx, parts, box, (g) => {
      // the eyes and the spike tips smoulder
      for (const s of [-1, 1]) {
        const ex = CX + s * DOOM_EYES.dx;
        const eg = g.createRadialGradient(ex, DOOM_EYES.y, 1, ex, DOOM_EYES.y, 22);
        eg.addColorStop(0, rgba('#fff0a0', 1));
        eg.addColorStop(0.4, rgba('#ff9a1a', 0.7));
        eg.addColorStop(1, rgba('#ff5a0a', 0));
        g.fillStyle = eg;
        g.fillRect(ex - 24, DOOM_EYES.y - 24, 48, 48);
      }
      for (const k of spikes) {
        const tx = k.x + Math.cos(k.ang) * k.len * 0.7;
        const ty = k.y + Math.sin(k.ang) * k.len * 0.7;
        const sg = g.createRadialGradient(tx, ty, 1, tx, ty, k.len * 0.6);
        sg.addColorStop(0, rgba('#ff6a4a', 0.8));
        sg.addColorStop(1, rgba('#c8100a', 0));
        g.fillStyle = sg;
        g.fillRect(tx - k.len, ty - k.len, k.len * 2, k.len * 2);
      }
    });
    return;
  }
  if (o.heat) {
    glowOnly(ctx, parts, box, (g) => {
      heatRise(g, box, 20, 196, 79, '#ff5a1a', 0.85);
      // the hide splits along cracks that glow from inside
      const r = rng(hashStr('doom-heat'));
      for (let i = 0; i < 9; i++) {
        let x = CX - 90 + r() * 180;
        let y = 40 + r() * 170;
        hotLine(g, (c) => {
          c.moveTo(x, y);
          for (let k = 0; k < 4; k++) {
            x += (r() - 0.5) * 30;
            y += 6 + r() * 14;
            c.lineTo(x, y);
          }
        }, '#ff8a2a', 1.8, 0.85);
      }
      for (const k of spikes) {
        g.save();
        spikePath(k.x, k.y, k.ang, k.len, k.w)(g);
        g.fillStyle = rgba('#ff3a1a', 0.55);
        g.fill();
        g.restore();
      }
    });
    return;
  }
  const sil = new Sil(ctx, parts, box);
  const g = sil.g;
  // the hide: pebbled scales, darker below, fading to the leg's tone up at the ankle so the two flow together
  within(g, body, () => {
    g.fillStyle = vgrad(g, -6, 250, [[0, legSkin], [0.18, mix(legSkin, hide, 0.7)], [0.4, hide], [1, shade(hide, -0.25)]]);
    g.fillRect(box.x, -10, box.w, 270);
  });
  piece(g, body, box, DMAT.hide, hide, { shadow: 0, size: 26, texA: 0.4 });
  within(g, body, () => {
    g.globalAlpha = 0.55;
    g.fillStyle = vgrad(g, -6, 60, [[0, legSkin], [1, rgba(legSkin, 0)]]);
    g.fillRect(box.x, -10, box.w, 70);
    g.globalAlpha = 1;
    blotches(g, box, '#1a2410', 0.35, 20, 0.55, 0.25, 81);
    blotches(g, box, shade(hide, 0.35), 0.25, 12, 0.62, 0.15, 83);
    // warty knuckles of hide
    const r = rng(hashStr('doom-warts'));
    for (let i = 0; i < 26; i++) {
      const x = CX - 96 + r() * 192;
      const y = 30 + r() * 200;
      const rr = 2.5 + r() * 5;
      ao(g, x + rr * 0.4, y + rr * 0.6, rr * 1.3, rr, 0.45, 0, '#0a1006');
      spec(g, x - rr * 0.3, y - rr * 0.35, rr, rr * 0.8, 0.22, -0.5, LIGHT.key);
    }
    // the stitched scar across the vamp
    const scar = (c: Ctx) => {
      c.moveTo(CX - 64, 150);
      c.bezierCurveTo(CX - 30, 166, CX + 10, 138, CX + 70, 156);
    };
    crease(g, scar, 4, '#2a0a08', 0.75, 0.25);
    softStroke(g, scar, rgba('#a83a2a', 0.4), 6, 2);
    g.save();
    g.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      const x = CX - 60 + t * 126;
      const y = 150 + Math.sin(t * Math.PI * 1.6) * -6 + t * 4;
      g.strokeStyle = '#1a120a';
      g.lineWidth = 2.6;
      g.beginPath();
      g.moveTo(x - 3, y - 9);
      g.lineTo(x + 3, y + 9);
      g.stroke();
      g.strokeStyle = rgba('#d8c8a0', 0.8);
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(x - 3.6, y - 9.6);
      g.lineTo(x + 2.4, y + 8.4);
      g.stroke();
    }
    g.restore();
    // folds over the toe as it flexes
    for (const [y, w] of [[196, 70], [212, 84]] as const) {
      crease(g, (c) => {
        c.moveTo(CX - w, y - flex * 4);
        c.quadraticCurveTo(CX, y - 10 - flex * 8, CX + w, y - flex * 4);
      }, 3 + flex * 1.5, '#0a1006', 0.35 + flex * 0.3, 0.2);
    }
    spec(g, CX - 50, 120, 26, 60, 0.25, 0.1, LIGHT.key);
  });
  // eyes (the live layer blinks them)
  if (!o.live) doomEyes(g, hide, 0);
  // bone spikes, rooted in a ring of torn hide
  for (const k of spikes) {
    const sp = spikePath(k.x, k.y, k.ang, k.len, k.w);
    ao(g, k.x, k.y, k.w * 0.8, k.w * 0.6, 0.6, k.ang, '#0a1006');
    piece(g, sp, { x: k.x - k.len, y: k.y - k.len, w: k.len * 2, h: k.len * 2 }, DMAT.bone, bone, { shadow: 0.5, size: k.w * 0.35 });
    within(g, sp, () => {
      // growth rings and a dark root
      g.save();
      g.translate(k.x, k.y);
      g.rotate(k.ang);
      const rg = g.createLinearGradient(0, 0, k.len, 0);
      rg.addColorStop(0, rgba('#3a2a10', 0.6));
      rg.addColorStop(0.3, rgba('#3a2a10', 0));
      g.fillStyle = rg;
      g.fillRect(0, -k.w, k.len, k.w * 2);
      g.strokeStyle = rgba('#6a5030', 0.35);
      g.lineWidth = 1.2;
      for (const f of [0.3, 0.5, 0.68]) {
        g.beginPath();
        g.moveTo(k.len * f, -k.w * 0.45 * (1 - f));
        g.lineTo(k.len * f, k.w * 0.45 * (1 - f));
        g.stroke();
      }
      g.restore();
    });
  }
  // the teeth along the sole
  for (const t of teeth) {
    const tp = toothPath(t.x, t.y, t.len);
    piece(g, tp, { x: t.x - 12, y: t.y, w: 24, h: t.len }, DMAT.bone, shade(bone, -0.05), { shadow: 0.5, size: 4 });
    spec(g, t.x - 3, t.y + t.len * 0.3, 2.4, t.len * 0.25, 0.6, 0.1);
  }
  ao(g, CX, 244 - flex * 6, 100, 10, 0.45, 0, '#0a1006');
  oneLight(sil, '#0a1006', 0.5, 22);
  sil.finish(inkOf(hide), { openTop: -5 });
}

const DOOM_BLINK = 4;
registerStyle('doomstomp', {
  contactY: 276,
  halfWidth: 118,
  rig: { from: 176, to: 196 },
  leg: { kind: 'skin', hw: 70, join: 'blend', fade: 26 },
  parts: {
    eyes: {
      box: { x: CX - DOOM_EYES.dx - 30, y: DOOM_EYES.y - 30, w: DOOM_EYES.dx * 2 + 60, h: 52 },
      frames: DOOM_BLINK,
      draw: (g, art, i) => doomEyes(g, art.primary ?? '#5d6b4a', i / (DOOM_BLINK - 1)),
    },
  },
  draw(ctx, art, p, o) {
    drawDoom(ctx, art, p, o);
  },
});

// ════════════════════════ THANFOOT ════════════════════════
// A purple titan's bare foot, scaled up, in the golden Infinity Sock: a fine gold knit to a ribbed hem above the
// toes and an armour band carrying six empty settings (the fight sets the stones in them). His toes carry Thanfoot's
// ridged chin creases. In play cosmic motes drift round him, the settings breathe a violet glow, and in his later
// phases the gold heats from the sole and steams.

/** Thanfoot's bare foot is a person's, stretched to a titan's and down to his sole at y 282. */
const TF = { sx: 1.08, sy: 1.1, top: -6 };
const TF_LOOK = { skin: '#8a5fb0', w: 8, ankle: 58, toe: 1.12, toeLen: 1.05, ball: 1.02, pores: 0.3, detail: 0.7 };
/** The sock's hem (design y at the centre) and how it dips at the sides. */
const HEM = 204;

const hemCurve = (c: Ctx, dy = 0) => {
  c.moveTo(CX - 140, HEM - 20 + dy);
  c.bezierCurveTo(CX - 60, HEM + 6 + dy, CX + 60, HEM + 6 + dy, CX + 140, HEM - 20 + dy);
};

const sockArea: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 140, -20);
  c.lineTo(CX + 140, -20);
  c.lineTo(CX + 140, HEM - 20);
  c.bezierCurveTo(CX + 60, HEM + 6, CX - 60, HEM + 6, CX - 140, HEM - 20);
  c.closePath();
};

const bandPath: PathFn = (c) => {
  c.beginPath();
  c.moveTo(CX - 100, 138);
  c.bezierCurveTo(CX - 70, 56, CX + 70, 56, CX + 100, 138);
  c.lineTo(CX + 86, 152);
  c.bezierCurveTo(CX + 60, 92, CX - 60, 92, CX - 86, 152);
  c.closePath();
};

function tfBare(ctx: Ctx, art: FootArt, p: Pose, story: (g: Ctx, f: BareFoot, outer: DOMMatrix) => void): void {
  const outer = ctx.getTransform();
  ctx.save();
  ctx.translate(CX, TF.top);
  ctx.scale(TF.sx, TF.sy);
  ctx.translate(-CX, -TF.top);
  const f = paintBare(ctx, { ...TF_LOOK, skin: art.skin, nails: mix(art.skin, '#ffffff', 0.38) }, p);
  story(f.sil.g, f, outer);
  bareOutline(f);
  ctx.restore();
}

function sockSettings(g: Ctx, gold: string, live: boolean): void {
  for (const [x, y] of SOCKETS) {
    contact(g, (c) => {
      c.beginPath();
      c.arc(x, y, 17, 0, Math.PI * 2);
      c.fill();
    }, 0.6, 3, 4);
    // the bezel: polished gold
    const bz = g.createLinearGradient(x - 17, y - 17, x + 17, y + 17);
    bz.addColorStop(0, shade(gold, 0.55));
    bz.addColorStop(0.45, gold);
    bz.addColorStop(1, shade(gold, -0.55));
    g.fillStyle = bz;
    g.beginPath();
    g.arc(x, y, 17, 0, Math.PI * 2);
    g.fill();
    // the empty seat, deep violet
    const sg = g.createRadialGradient(x + 3, y + 3, 1, x, y, 13);
    sg.addColorStop(0, live ? '#3a1a4a' : '#4a2a5a');
    sg.addColorStop(1, '#12081a');
    g.fillStyle = sg;
    g.beginPath();
    g.arc(x, y, 12.5, 0, Math.PI * 2);
    g.fill();
    ao(g, x - 3, y - 3, 10, 8, 0.5, 0, '#000000');
    // four claws
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      const cx = x + Math.cos(a) * 15;
      const cy = y + Math.sin(a) * 15;
      piece(g, ell(cx, cy, 3.6, 5, a + Math.PI / 2), { x: cx - 4, y: cy - 5, w: 8, h: 10 }, 'gold', shade(gold, 0.1), { shadow: 0.5, size: 2 });
    }
    spec(g, x - 8, y - 9, 6, 3, 0.8, -0.6);
  }
}

function drawThan(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  const gold = art.primary ?? '#e3b23c';
  const violet = art.secondary ?? '#4a2a6a';
  const box = { x: CX - 140, y: -10, w: 280, h: 300 };
  if (o.emissive || o.heat) {
    // the glow layers follow the scaled silhouette: draw the bare foot's shape as the clip
    ctx.save();
    ctx.translate(CX, TF.top);
    ctx.scale(TF.sx, TF.sy);
    ctx.translate(-CX, -TF.top);
    const look = { ...TF_LOOK, skin: art.skin };
    const sil = new Sil(ctx, bareParts(poseToes(restToes(look), p), look), bareBox(look));
    ctx.restore();
    const g = sil.g;
    g.save();
    g.setTransform(ctx.getTransform());
    if (o.emissive) {
      for (const [x, y] of SOCKETS) {
        const eg = g.createRadialGradient(x, y, 1, x, y, 20);
        eg.addColorStop(0, rgba('#d08aff', 0.7));
        eg.addColorStop(1, rgba('#7a2aff', 0));
        g.fillStyle = eg;
        g.fillRect(x - 22, y - 22, 44, 44);
      }
    } else {
      g.save();
      sockArea(g);
      g.clip();
      // (the toe band below the rig's top carries no heat: it ends there)
      heatRise(g, box, 0, 160, 87, '#ff7a1a', 0.9);
      g.restore();
      hotLine(g, (c) => bandPath(c), '#ffc04a', 2, 0.7);
    }
    g.restore();
    sil.finish('rgba(0,0,0,0)', { w: 0.01, inner: 0 });
    return;
  }
  tfBare(ctx, art, p, (g, f, outer) => {
    // Thanfoot's ridged chin creases on the big toe
    const big = f.toes[4];
    for (const k of [-0.25, 0, 0.25]) {
      crease(g, (c) => {
        c.moveTo(big.cx - big.rx * 0.55, big.cy + big.ry * (0.15 + k));
        c.quadraticCurveTo(big.cx, big.cy + big.ry * (0.28 + k), big.cx + big.rx * 0.5, big.cy + big.ry * (0.1 + k));
      }, 2, mix(art.skin, '#1a0a2a', 0.6), 0.45, 0.25);
    }
    // the sock, painted in the outer frame (where the sockets are)
    g.save();
    g.setTransform(outer);
    g.save();
    sockArea(g);
    g.clip();
    const gt = tones(DMAT.gold, gold);
    g.fillStyle = hgrad(g, CX - 110, CX + 110, [[0, gt.hi], [0.4, gold], [1, gt.lo]]);
    g.fillRect(box.x, box.y, box.w, box.h);
    texture(g, 'knit', box, 0.55, 1.4);
    // knit columns, a gentle wale
    g.strokeStyle = rgba(shade(gold, -0.45), 0.18);
    g.lineWidth = 1.2;
    for (let x = CX - 120; x < CX + 120; x += 9) {
      g.beginPath();
      g.moveTo(x, -10);
      g.lineTo(x + (x - CX) * 0.08, HEM);
      g.stroke();
    }
    // the light and the turn of the form round the titan's foot
    const fl = g.createLinearGradient(CX - 110, 0, CX + 120, 0);
    fl.addColorStop(0, rgba('#3a1a04', 0.35));
    fl.addColorStop(0.18, rgba(LIGHT.key, 0.18));
    fl.addColorStop(0.45, rgba(LIGHT.key, 0));
    fl.addColorStop(0.82, rgba('#3a1a04', 0.35));
    fl.addColorStop(1, rgba('#3a1a04', 0.6));
    g.fillStyle = fl;
    g.fillRect(box.x, box.y, box.w, box.h);
    spec(g, CX - 40, 40, 30, 70, 0.3, 0.05, LIGHT.key);
    // the armour band carrying the settings
    piece(g, bandPath, { x: CX - 100, y: 56, w: 200, h: 96 }, 'gold', shade(gold, 0.08), { shadow: 0.55, size: 8 });
    within(g, bandPath, () => {
      g.strokeStyle = rgba(shade(gold, -0.5), 0.5);
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(CX - 92, 140);
      g.bezierCurveTo(CX - 64, 66, CX + 64, 66, CX + 92, 140);
      g.stroke();
      softFill(g, (c) => {
        c.beginPath();
        c.ellipse(CX - 40, 84, 40, 6, -0.3, 0, Math.PI * 2);
      }, rgba('#fff8d8', 0.5), 3);
    });
    sockSettings(g, gold, o.live);
    // the ribbed hem over the toes
    g.restore();
    softStroke(g, (c) => hemCurve(c, 6), rgba('#1a0a20', 0.6), 12, 6);
    g.save();
    g.lineCap = 'round';
    g.beginPath();
    hemCurve(g, -6);
    g.strokeStyle = shade(gold, -0.15);
    g.lineWidth = 14;
    g.stroke();
    g.beginPath();
    hemCurve(g, -9);
    g.strokeStyle = rgba(shade(gold, 0.45), 0.8);
    g.lineWidth = 3;
    g.stroke();
    g.setLineDash([1.5, 5]);
    g.beginPath();
    hemCurve(g, -5);
    g.strokeStyle = rgba(shade(gold, -0.55), 0.7);
    g.lineWidth = 9;
    g.stroke();
    g.restore();
    // a violet cuff stripe at the top of the sock
    for (const [y, h] of [[28, 8], [42, 4]] as const) {
      g.fillStyle = violet;
      g.fillRect(box.x, y, box.w, h);
      g.fillStyle = rgba('#ffffff', 0.2);
      g.fillRect(box.x, y, box.w, 1.5);
    }
    g.restore();
    // the one light over the whole titan, sock and toes
    oneLight(f.sil, '#14061e', 0.45, 24);
  });
}

registerStyle('thanfoot', {
  contactY: 282,
  halfWidth: 108,
  // the toes (scaled by TF.sy below the top)
  rig: { from: 150, to: 172 },
  leg: { kind: 'knit', hw: 62, join: 'blend', fade: 22 },
  draw(ctx, art, p, o) {
    drawThan(ctx, art, p, o);
  },
});

