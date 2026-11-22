// Procedural cartoon feet. Each foot is drawn front-on, toes pointing down at the pizza,
// in a 300x340 design space (foot centre x = 150 canvas / 110 design) and scaled up for crispness.

import { kindDrawer } from './registry';
import { type DrawOpts, styleFor } from './style/registry';
import { type Pose, REST, STYLE } from './style/kit';
import { type LegPattern, type LegSpec, fadeFootTop, legEnd, legOverride, styledHem, styledLeg } from './style/legs';
import type { FootArt, FootType, LegKind } from '../data/feet';
import { type Ctx, ellipse, hashStr, makeCanvas, mix, rgba, rng, roundRect, shade } from './util';
import { CX, INK, OUT, argyle, barePath, drawBare, drawBareBody, drawHair, drawSock, drawToe, glossy, laces, leatherFill, outlineOf, shoePath, skinBodyFill, toesFor } from './feetCommon';
import { drawAccessories, drawExtraKind } from './feetKinds2';

export const ART_RES = 1.35; // textures are drawn this much larger than displayed
const PAD_X = 40;
const PAD_Y = 8;
const DESIGN_W = 300;
const DESIGN_H = 345;

/** A canvas in the same frame as a foot's texture (drawFoot), for a variant of its art drawn by `draw` in design
 * space: the in-play body of a foot whose live parts are drawn separately (src/game/footLive.ts). */
export function footCanvas(type: FootType, draw: (ctx: Ctx) => void): HTMLCanvasElement {
  const s = type.scale * ART_RES;
  const [c, ctx] = makeCanvas(DESIGN_W * s, DESIGN_H * s);
  ctx.scale(s, s);
  ctx.translate(PAD_X, PAD_Y);
  draw(ctx);
  return c;
}

export interface FootTextures {
  /** Texels per design unit at scale 1 (ART_RES, or the style kit's for redrawn feet). */
  res: number;
  /** Design y where the leg ends inside the foot (styled legs); otherwise Foot tucks it in itself. */
  legEnd?: number;
  /** Design y of the cuff's top edge (styled hems), for portraits. */
  cuffTop?: number;
  foot: HTMLCanvasElement;
  leg: HTMLCanvasElement;
  cuff?: HTMLCanvasElement;
  /** origin of the contact point (toe tips) as a fraction of foot canvas */
  originY: number;
  /** Design-space metrics, multiply by scale for world units */
  footHeight: number; // contact y from top of foot
  footHalfWidth: number;
  legWidth: number;
}

export function drawSneaker(ctx: Ctx, art: FootArt): void {
  const p = art.primary!;
  const s = art.secondary!;
  // sole
  roundRect(ctx, CX - 104, 222, 208, 40, 22);
  const sg = ctx.createLinearGradient(0, 222, 0, 262);
  sg.addColorStop(0, '#ffffff');
  sg.addColorStop(1, '#c9ced6');
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = OUT;
  ctx.stroke();
  ctx.strokeStyle = rgba(p, 0.85);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(CX - 92, 246);
  ctx.lineTo(CX + 92, 246);
  ctx.stroke();
  // upper
  shoePath(ctx, { bottom: 238, width: 96 });
  ctx.fillStyle = leatherFill(ctx, p);
  ctx.fill();
  ctx.save();
  shoePath(ctx, { bottom: 238, width: 96 });
  ctx.clip();
  // toe cap
  ellipse(ctx, CX, 236, 90, 48);
  ctx.fillStyle = s;
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.6);
  ctx.lineWidth = 3;
  ctx.stroke();
  // perforations
  ctx.fillStyle = rgba('#000', 0.2);
  for (let i = 0; i < 9; i++) {
    ellipse(ctx, CX - 40 + i * 10, 210 + Math.abs(i - 4) * 1.5, 1.8, 1.8);
    ctx.fill();
  }
  // side stripes
  ctx.strokeStyle = s;
  ctx.lineWidth = 9;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + sx * 92, 120);
    ctx.quadraticCurveTo(CX + sx * 70, 160, CX + sx * 92, 200);
    ctx.stroke();
  }
  glossy(ctx, CX - 30, 110, 40, 70, 0.28);
  ctx.restore();
  shoePath(ctx, { bottom: 238, width: 96, open: true });
  ctx.strokeStyle = INK;
  ctx.lineWidth = OUT;
  ctx.stroke();
  // tongue
  roundRect(ctx, CX - 30, -6, 60, 130, 18);
  ctx.fillStyle = shade(p, 0.15);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.8);
  ctx.lineWidth = 3.5;
  ctx.stroke();
  laces(ctx, 8, 140, '#ffffff', 5);
  // sock cuff
  ellipse(ctx, CX, 0, 62, 12);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.stroke();
}

function drawBoot(ctx: Ctx, art: FootArt): void {
  const p = art.primary!;
  // chunky lug sole
  roundRect(ctx, CX - 108, 218, 216, 48, 18);
  ctx.fillStyle = '#2b241f';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = OUT;
  ctx.stroke();
  ctx.fillStyle = '#4a3f37';
  for (let i = 0; i < 8; i++) {
    roundRect(ctx, CX - 98 + i * 25, 250, 16, 12, 3);
    ctx.fill();
  }
  shoePath(ctx, { bottom: 238, width: 100 });
  ctx.fillStyle = leatherFill(ctx, p);
  ctx.fill();
  ctx.save();
  shoePath(ctx, { bottom: 238, width: 100 });
  ctx.clip();
  // scuffs
  const r = rng(77);
  for (let i = 0; i < 18; i++) {
    ctx.strokeStyle = rgba('#ffffff', 0.08 + r() * 0.08);
    ctx.lineWidth = 1.5;
    const x = 20 + r() * 180;
    const y = 30 + r() * 180;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 6 + r() * 10, y + (r() - 0.5) * 4);
    ctx.stroke();
  }
  // steel toe cap
  ellipse(ctx, CX, 238, 94, 56);
  const mg = ctx.createLinearGradient(CX - 90, 190, CX + 90, 270);
  mg.addColorStop(0, '#f4f6f9');
  mg.addColorStop(0.35, art.secondary ?? '#c7ccd4');
  mg.addColorStop(0.6, '#7d8592');
  mg.addColorStop(1, '#dfe3e8');
  ctx.fillStyle = art.steelToe ? mg : shade(p, -0.15);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();
  if (art.steelToe) {
    ctx.fillStyle = '#5b626c';
    for (let i = 0; i < 5; i++) {
      ellipse(ctx, CX - 60 + i * 30, 196 + Math.abs(i - 2) * 4, 3.5, 3.5);
      ctx.fill();
    }
    glossy(ctx, CX - 30, 214, 40, 14, 0.7);
  }
  // stitching
  ctx.strokeStyle = '#f2c86b';
  ctx.setLineDash([6, 5]);
  ctx.lineWidth = 2.5;
  shoePath(ctx, { bottom: 228, width: 90, open: true });
  ctx.stroke();
  ctx.setLineDash([]);
  glossy(ctx, CX - 40, 100, 30, 60, 0.2);
  ctx.restore();
  shoePath(ctx, { bottom: 238, width: 100, open: true });
  ctx.strokeStyle = INK;
  ctx.lineWidth = OUT;
  ctx.stroke();
  roundRect(ctx, CX - 32, -6, 64, 120, 12);
  ctx.fillStyle = shade(p, -0.1);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.8);
  ctx.lineWidth = 3.5;
  ctx.stroke();
  laces(ctx, 4, 150, '#e0a84f', 5, 28);
}

function drawCowboy(ctx: Ctx, art: FootArt): void {
  const p = art.primary!;
  const s = art.secondary!;
  shoePath(ctx, { bottom: 272, width: 92, pointed: true });
  ctx.fillStyle = leatherFill(ctx, p);
  ctx.fill();
  ctx.save();
  shoePath(ctx, { bottom: 272, width: 92, pointed: true });
  ctx.clip();
  // decorative stitching swirls
  ctx.strokeStyle = s;
  ctx.lineWidth = 3;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + sx * 10, 40);
    ctx.bezierCurveTo(CX + sx * 70, 70, CX + sx * 10, 130, CX + sx * 50, 170);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(CX + sx * 40, 100, 14, 0, Math.PI * 1.5);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(CX - 60, 190);
  ctx.quadraticCurveTo(CX, 230, CX + 60, 190);
  ctx.stroke();
  // darker toe tip
  ellipse(ctx, CX + 6, 268, 50, 34);
  ctx.fillStyle = shade(p, -0.35);
  ctx.fill();
  glossy(ctx, CX - 30, 120, 34, 80, 0.3);
  ctx.restore();
  shoePath(ctx, { bottom: 272, width: 92, pointed: true, open: true });
  ctx.strokeStyle = INK;
  ctx.lineWidth = OUT;
  ctx.stroke();
  // spur
  ctx.strokeStyle = '#9aa3ad';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(196, 120);
  ctx.lineTo(232, 128);
  ctx.stroke();
  ctx.save();
  ctx.translate(240, 130);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const rad = i % 2 === 0 ? 16 : 7;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = '#e8edf2';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawClown(ctx: Ctx, art: FootArt): void {
  const p = art.primary!;
  const s = art.secondary!;
  // shoe body
  shoePath(ctx, { bottom: 200, width: 82 });
  ctx.fillStyle = leatherFill(ctx, p);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = OUT;
  ctx.stroke();
  // giant bulb toe
  ellipse(ctx, CX, 214, 142, 58);
  const g = ctx.createRadialGradient(CX - 40, 186, 6, CX, 214, 150);
  g.addColorStop(0, shade(p, 0.45));
  g.addColorStop(0.45, p);
  g.addColorStop(1, shade(p, -0.45));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = OUT;
  ctx.stroke();
  glossy(ctx, CX - 50, 190, 50, 18, 0.75);
  // big laces + bow
  laces(ctx, 10, 150, s, 4, 26);
  ctx.save();
  ctx.translate(CX, 162);
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(sx * 40, -36, sx * 64, 0, sx * 44, 22);
    ctx.bezierCurveTo(sx * 30, 30, sx * 10, 12, 0, 0);
    ctx.fillStyle = s;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ellipse(ctx, 0, 0, 11, 11);
  ctx.fillStyle = shade(s, -0.2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBallet(ctx: Ctx, art: FootArt): void {
  const p = art.primary!;
  const path = (open = false) => {
    ctx.beginPath();
    ctx.moveTo(58, -6);
    ctx.bezierCurveTo(56, 80, 70, 190, 88, 256);
    ctx.quadraticCurveTo(110, 266, 132, 256);
    ctx.bezierCurveTo(150, 190, 164, 80, 162, -6);
    if (!open) ctx.closePath();
  };
  path();
  const g = ctx.createLinearGradient(56, 0, 164, 0);
  g.addColorStop(0, shade(p, -0.3));
  g.addColorStop(0.3, shade(p, 0.25));
  g.addColorStop(0.45, shade(p, 0.55));
  g.addColorStop(0.6, p);
  g.addColorStop(1, shade(p, -0.3));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  // satin pleats at toe
  ctx.strokeStyle = rgba(shade(p, -0.4), 0.4);
  ctx.lineWidth = 2;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(CX + i * 6, 200);
    ctx.lineTo(CX + i * 4, 258);
    ctx.stroke();
  }
  // ribbons
  ctx.strokeStyle = art.secondary!;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(40, 20);
  ctx.lineTo(180, 100);
  ctx.moveTo(180, 20);
  ctx.lineTo(40, 100);
  ctx.stroke();
  ctx.restore();
  path(true);
  ctx.strokeStyle = INK;
  ctx.lineWidth = OUT;
  ctx.stroke();
  // shank opening + bow
  ellipse(ctx, CX, 86, 34, 16);
  ctx.fillStyle = shade(p, -0.25);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.6);
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawSkate(ctx: Ctx, art: FootArt): void {
  // blade + stanchions (contact at y ~ 296)
  ctx.fillStyle = '#9aa3ad';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  for (const x of [CX - 50, CX + 50]) {
    roundRect(ctx, x - 9, 226, 18, 50, 4);
    ctx.fill();
    ctx.stroke();
  }
  roundRect(ctx, CX - 92, 270, 184, 22, 11);
  const bg = ctx.createLinearGradient(0, 270, 0, 292);
  bg.addColorStop(0, '#ffffff');
  bg.addColorStop(0.5, '#b8c2cc');
  bg.addColorStop(1, '#6d7780');
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.stroke();
  // boot
  shoePath(ctx, { bottom: 240, width: 88 });
  ctx.fillStyle = leatherFill(ctx, art.primary!);
  ctx.fill();
  ctx.save();
  shoePath(ctx, { bottom: 240, width: 88 });
  ctx.clip();
  ctx.fillStyle = art.secondary!;
  ctx.fillRect(0, 214, 230, 30);
  glossy(ctx, CX - 30, 90, 30, 70, 0.35);
  ctx.restore();
  shoePath(ctx, { bottom: 240, width: 88, open: true });
  ctx.strokeStyle = INK;
  ctx.lineWidth = OUT;
  ctx.stroke();
  roundRect(ctx, CX - 28, -6, 56, 160, 14);
  ctx.fillStyle = '#eef3f8';
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.7);
  ctx.lineWidth = 3;
  ctx.stroke();
  laces(ctx, 6, 170, '#9fd8ff', 6, 24);
}

function drawFlipper(ctx: Ctx, art: FootArt, r: () => number): void {
  const p = art.primary!;
  const s = art.secondary!;
  // the fin
  const fin = (open = false) => {
    ctx.beginPath();
    ctx.moveTo(24, 130);
    ctx.bezierCurveTo(4, 200, -22, 280, -28, 318);
    ctx.quadraticCurveTo(CX, 300, 248, 318);
    ctx.bezierCurveTo(242, 280, 216, 200, 196, 130);
    if (!open) ctx.closePath();
  };
  fin();
  const g = ctx.createLinearGradient(0, 130, 0, 320);
  g.addColorStop(0, shade(p, -0.1));
  g.addColorStop(1, shade(p, 0.25));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  fin();
  ctx.clip();
  ctx.strokeStyle = rgba(s, 0.6);
  ctx.lineWidth = 6;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(CX + i * 18, 170);
    ctx.lineTo(CX + i * 44, 320);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#ffffff';
  ellipse(ctx, CX - 40, 250, 26, 50, 0.3);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
  fin();
  ctx.strokeStyle = INK;
  ctx.lineWidth = OUT;
  ctx.stroke();
  // side rails
  ctx.strokeStyle = s;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(26, 140);
  ctx.bezierCurveTo(8, 210, -14, 280, -20, 312);
  ctx.moveTo(194, 140);
  ctx.bezierCurveTo(212, 210, 234, 280, 240, 312);
  ctx.stroke();
  // bare foot in pocket
  drawBareBody(ctx, art, r);
  // foot pocket
  ctx.beginPath();
  ctx.moveTo(14, 120);
  ctx.quadraticCurveTo(CX, 90, 206, 120);
  ctx.lineTo(214, 236);
  ctx.quadraticCurveTo(CX, 262, 10, 236);
  ctx.closePath();
  const pg = ctx.createLinearGradient(10, 0, 214, 0);
  pg.addColorStop(0, shade(s, -0.3));
  pg.addColorStop(0.45, shade(s, 0.25));
  pg.addColorStop(1, shade(s, -0.3));
  ctx.fillStyle = pg;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = OUT;
  ctx.stroke();
  glossy(ctx, CX - 30, 150, 40, 20, 0.45);
}

function drawRobot(ctx: Ctx, art: FootArt): void {
  const p = art.primary!;
  const glow = art.secondary!;
  const body = (open = false) => {
    ctx.beginPath();
    ctx.moveTo(54, -6);
    ctx.lineTo(46, 60);
    ctx.lineTo(18, 140);
    ctx.lineTo(16, 206);
    ctx.lineTo(204, 206);
    ctx.lineTo(204, 140);
    ctx.lineTo(176, 60);
    ctx.lineTo(166, -6);
    if (!open) ctx.closePath();
  };
  body();
  const g = ctx.createLinearGradient(14, 0, 206, 0);
  g.addColorStop(0, shade(p, -0.45));
  g.addColorStop(0.3, shade(p, 0.1));
  g.addColorStop(0.45, shade(p, 0.45));
  g.addColorStop(0.6, p);
  g.addColorStop(1, shade(p, -0.5));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  body();
  ctx.clip();
  // panel lines
  ctx.strokeStyle = rgba('#000000', 0.35);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(30, 120);
  ctx.lineTo(190, 120);
  ctx.moveTo(CX, -6);
  ctx.lineTo(CX, 120);
  ctx.moveTo(40, 60);
  ctx.lineTo(180, 60);
  ctx.stroke();
  // glow strip
  ctx.shadowColor = glow;
  ctx.shadowBlur = 16;
  ctx.fillStyle = glow;
  roundRect(ctx, 40, 140, 140, 10, 5);
  ctx.fill();
  ctx.shadowBlur = 0;
  // rivets
  ctx.fillStyle = shade(p, -0.4);
  for (const [x, y] of [[54, 72], [166, 72], [40, 132], [180, 132], [96, 20], [124, 20]]) {
    ellipse(ctx, x, y, 4, 4);
    ctx.fill();
  }
  ctx.restore();
  body(true);
  ctx.strokeStyle = INK;
  ctx.lineWidth = OUT;
  ctx.stroke();
  // three chunky toe segments
  const segs = [
    { x: 18, w: 54 },
    { x: 78, w: 60 },
    { x: 144, w: 64 },
  ];
  for (const sgm of segs) {
    roundRect(ctx, sgm.x, 196, sgm.w, 62, 14);
    const tg = ctx.createLinearGradient(0, 196, 0, 258);
    tg.addColorStop(0, shade(p, 0.25));
    tg.addColorStop(1, shade(p, -0.35));
    ctx.fillStyle = tg;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = OUT;
    ctx.stroke();
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 12;
    ctx.fillStyle = glow;
    ellipse(ctx, sgm.x + sgm.w / 2, 236, 6, 6);
    ctx.fill();
    ctx.restore();
  }
}

function drawFlipflop(ctx: Ctx, art: FootArt, r: () => number): void {
  // sole slab peeking out under the toes
  roundRect(ctx, 6, 232, 216, 28, 14);
  const g = ctx.createLinearGradient(0, 232, 0, 260);
  g.addColorStop(0, shade(art.primary!, 0.2));
  g.addColorStop(1, shade(art.primary!, -0.3));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = OUT;
  ctx.stroke();
  drawBareBody(ctx, art, r);
  // strap
  for (const [x0, y0] of [[30, 120], [204, 116]]) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + 160) / 2, 150, 160, 206);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 20;
    ctx.stroke();
    ctx.strokeStyle = art.secondary!;
    ctx.lineWidth = 13;
    ctx.stroke();
  }
  ellipse(ctx, 160, 206, 12, 10);
  ctx.fillStyle = shade(art.secondary!, -0.2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  for (const t of toesFor(art)) drawToe(ctx, t, art.skin, { nail: art.nails, r });
}

function drawBigfoot(ctx: Ctx, art: FootArt, r: () => number): void {
  const fur = art.primary!;
  // furry silhouette: fur tufts around the outline
  barePath(ctx, art);
  ctx.fillStyle = skinBodyFill(ctx, fur);
  ctx.fill();
  ctx.save();
  barePath(ctx, art);
  ctx.clip();
  drawHair(ctx, r, 10, -6, 210, 220, shade(fur, -0.45), 420);
  drawHair(ctx, r, 10, -6, 210, 220, shade(fur, 0.3), 160);
  ctx.restore();
  barePath(ctx, art, true);
  ctx.strokeStyle = outlineOf(fur);
  ctx.lineWidth = OUT;
  ctx.stroke();
  // shaggy fringe over the outline
  ctx.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const t = r();
    const y = t * 190;
    const x = side < 0 ? 56 - Math.sin(t * 1.4) * 40 - 2 : 164 + Math.sin(t * 1.4) * 46 + 2;
    ctx.strokeStyle = r() > 0.5 ? shade(fur, -0.4) : fur;
    ctx.lineWidth = 3 + r() * 3;
    ctx.beginPath();
    ctx.moveTo(x - side * 6, y);
    ctx.quadraticCurveTo(x + side * 6, y + 6, x + side * (10 + r() * 8), y + 14 + r() * 8);
    ctx.stroke();
  }
  for (const t of toesFor(art)) drawToe(ctx, t, art.skin, { claw: true, hair: true, r });
}

function drawLavaOverlay(ctx: Ctx, art: FootArt, r: () => number): void {
  // glowing cracks over the dark rock foot
  ctx.save();
  barePath(ctx, art);
  ctx.clip();
  ctx.shadowColor = '#ff7a00';
  ctx.shadowBlur = 14;
  for (let i = 0; i < 9; i++) {
    let x = 30 + r() * 160;
    let y = r() * 60;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 6; k++) {
      x += (r() - 0.5) * 40;
      y += 18 + r() * 22;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = i % 3 === 0 ? '#ffd23f' : '#ff6a00';
    ctx.lineWidth = 2 + r() * 3;
    ctx.stroke();
  }
  ctx.restore();
}

function drawGoldOverlay(ctx: Ctx, r: () => number): void {
  for (let i = 0; i < 9; i++) {
    const x = 30 + r() * 170;
    const y = 20 + r() * 220;
    const s = 5 + r() * 9;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#fffbe6';
    ctx.shadowColor = '#fff3a0';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(0, 0, s, 0);
    ctx.quadraticCurveTo(0, 0, 0, s);
    ctx.quadraticCurveTo(0, 0, -s, 0);
    ctx.quadraticCurveTo(0, 0, 0, -s);
    ctx.fill();
    ctx.restore();
  }
}

function contactY(art: FootArt): number {
  switch (art.kind) {
    case 'skate':
      return 292;
    case 'flipper':
      return 312;
    case 'cowboy':
      return 272;
    case 'clown':
      return 270;
    case 'boot':
      return 266;
    case 'sneaker':
      return 262;
    case 'flipflop':
      return 262;
    case 'ballet':
      return 262;
    case 'robot':
      return 258;
    case 'bigfoot':
      return 266;
    case 'heel':
      return 274;
    case 'slipper':
      return 262;
    case 'roller':
      return 296;
    case 'sandal':
      return 262;
    case 'clog':
      return 266;
    case 'wellie':
      return 262;
    case 'moonboot':
      return 274;
    case 'knight':
      return 266;
    case 'elf':
      return 280;
    case 'peg':
      return 258;
    case 'dino':
      return 292;
    case 'alien':
      return 288;
    case 'mummy':
      return 262;
    case 'cast':
      return 266;
    case 'dadsandal':
      return 262;
    case 'tap':
      return 272;
    case 'platform':
      return 280;
    case 'cleat':
      return 274;
    case 'webbed':
      return 274;
    default:
      return kindDrawer(art.kind)?.contactY ?? (art.chubby ? 264 : 260);
  }
}

function halfWidth(art: FootArt): number {
  switch (art.kind) {
    case 'clown':
      return 148;
    case 'flipper':
      return 138;
    case 'ballet':
      return 60;
    case 'peg':
      return 44;
    case 'slipper':
    case 'moonboot':
      return 112;
    case 'clog':
    case 'platform':
      return 110;
    default:
      return kindDrawer(art.kind)?.halfWidth ?? 104;
  }
}

const LEG_W: Record<LegKind, number> = {
  skin: 112,
  tights: 112,
  ribbon: 112,
  sock: 112,
  jeans: 140,
  suit: 136,
  clown: 156,
  robot: 104,
  fur: 132,
  boot: 120,
  armor: 126,
  bandage: 112,
  cast: 124,
  scales: 116,
  wood: 112,
  puffy: 142,
  chrome: 106,
  iron: 112,
};

function drawLeg(type: FootType, s: number): HTMLCanvasElement {
  const art = type.art;
  const lw = LEG_W[art.leg];
  const W = (lw + OUT * 2 + 2) * s;
  const H = 64 * s;
  const [c, ctx] = makeCanvas(W, H);
  ctx.scale(s, s);
  const w = lw;
  const x0 = OUT + 1;
  const r = rng(hashStr(type.id + 'leg'));
  const sideGrad = (col: string, sheen = 0.14, edge = -0.32) => {
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, shade(col, edge));
    g.addColorStop(0.3, shade(col, 0));
    g.addColorStop(0.5, shade(col, sheen));
    g.addColorStop(0.72, col);
    g.addColorStop(1, shade(col, edge - 0.02));
    return g;
  };
  let base = art.legColor ?? art.skin;
  switch (art.leg) {
    case 'skin':
    case 'tights':
    case 'ribbon': {
      base = art.leg === 'skin' ? art.skin : art.legColor ?? art.skin;
      ctx.fillStyle = sideGrad(base, art.leg === 'tights' ? 0.35 : 0.14);
      ctx.fillRect(x0, 0, w, 64);
      if (art.hair) drawHairTile(ctx, r, x0, w, shade(base, -0.6), 26);
      if (art.lava) {
        ctx.shadowColor = '#ff7a00';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = '#ff6a00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x0 + w * 0.3, 0);
        ctx.lineTo(x0 + w * 0.42, 22);
        ctx.lineTo(x0 + w * 0.35, 44);
        ctx.lineTo(x0 + w * 0.3, 64);
        ctx.moveTo(x0 + w * 0.72, 0);
        ctx.lineTo(x0 + w * 0.64, 30);
        ctx.lineTo(x0 + w * 0.72, 64);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      if (art.zombie) {
        ctx.fillStyle = rgba('#4d5e3a', 0.4);
        ellipse(ctx, x0 + w * 0.3, 30, 12, 9);
        ctx.fill();
      }
      if (art.leg === 'tights' && art.legAccent) {
        ctx.fillStyle = sideGrad(art.legAccent, 0.2, -0.3);
        ctx.fillRect(x0, 0, w, 16);
        ctx.fillRect(x0, 32, w, 16);
      }
      if (art.frost) {
        ctx.fillStyle = rgba('#ffffff', 0.5);
        ellipse(ctx, x0 + w * 0.3, 20, 10, 6);
        ctx.fill();
      }
      if (art.leg === 'ribbon') {
        ctx.strokeStyle = outlineOf(art.secondary!);
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(x0, 0);
        ctx.lineTo(x0 + w, 32);
        ctx.moveTo(x0, 32);
        ctx.lineTo(x0 + w, 64);
        ctx.moveTo(x0 + w, 0);
        ctx.lineTo(x0, 32);
        ctx.moveTo(x0 + w, 32);
        ctx.lineTo(x0, 64);
        ctx.stroke();
        ctx.strokeStyle = art.secondary!;
        ctx.lineWidth = 10;
        ctx.stroke();
      }
      break;
    }
    case 'sock': {
      const p = art.legColor ?? art.primary!;
      ctx.fillStyle = sideGrad(p);
      ctx.fillRect(x0, 0, w, 64);
      if (art.kind === 'toesock') {
        const cols = ['#ff4d6d', '#ff9f1c', '#ffd23f', '#3ddc97', '#4cc9f0', '#7b5cff'];
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = rgba(cols[(i * 2) % cols.length], 0.85);
          ctx.fillRect(x0, i * 16, w, 8);
        }
      } else if (art.argyle) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x0, 0, w, 64);
        ctx.clip();
        argyle(ctx, art.secondary!, x0, 0, w, 64);
        ctx.restore();
      } else {
        ctx.fillStyle = art.legAccent ?? art.secondary!;
        ctx.fillRect(x0, 8, w, 16);
        ctx.fillRect(x0, 36, w, 6);
      }
      ctx.strokeStyle = rgba('#000', 0.07);
      ctx.lineWidth = 2;
      for (let x = x0 + 4; x < x0 + w; x += 7) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 64);
        ctx.stroke();
      }
      break;
    }
    case 'jeans':
    case 'suit': {
      ctx.fillStyle = sideGrad(base, 0.12, -0.4);
      ctx.fillRect(x0, 0, w, 64);
      ctx.strokeStyle = rgba('#ffffff', art.leg === 'jeans' ? 0.06 : 0.03);
      ctx.lineWidth = 1.5;
      for (let i = -64; i < w + 64; i += 5) {
        ctx.beginPath();
        ctx.moveTo(x0 + i, 0);
        ctx.lineTo(x0 + i + 16, 64);
        ctx.stroke();
      }
      if (art.leg === 'jeans') {
        ctx.strokeStyle = '#e7a94a';
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x0 + w - 16, 0);
        ctx.lineTo(x0 + w - 16, 64);
        ctx.moveTo(x0 + w - 22, 0);
        ctx.lineTo(x0 + w - 22, 64);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = rgba('#000', 0.25);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0 + w * 0.5, 0);
        ctx.lineTo(x0 + w * 0.5, 64);
        ctx.stroke();
      }
      break;
    }
    case 'clown': {
      ctx.fillStyle = sideGrad(base, 0.2);
      ctx.fillRect(x0, 0, w, 64);
      ctx.fillStyle = art.legAccent!;
      for (const [dx, dy] of [[0.22, 14], [0.7, 46], [0.55, 6], [0.15, 52], [0.85, 22]]) {
        ellipse(ctx, x0 + w * dx, dy, 9, 9);
        ctx.fill();
        if (dy < 12) {
          ellipse(ctx, x0 + w * dx, dy + 64, 9, 9);
          ctx.fill();
        }
        if (dy > 52) {
          ellipse(ctx, x0 + w * dx, dy - 64, 9, 9);
          ctx.fill();
        }
      }
      break;
    }
    case 'robot': {
      ctx.fillStyle = sideGrad(art.primary ?? '#aab4c0', 0.5, -0.5);
      ctx.fillRect(x0, 0, w, 64);
      ctx.fillStyle = rgba('#000', 0.35);
      ctx.fillRect(x0, 28, w, 8);
      ctx.fillStyle = sideGrad('#59626d', 0.4, -0.5);
      ctx.fillRect(x0, 30, w, 4);
      ctx.save();
      ctx.shadowColor = art.secondary!;
      ctx.shadowBlur = 10;
      ctx.fillStyle = art.secondary!;
      ctx.fillRect(x0 + w * 0.68, 0, 6, 64);
      ctx.restore();
      break;
    }
    case 'fur': {
      ctx.fillStyle = sideGrad(art.primary!);
      ctx.fillRect(x0, 0, w, 64);
      drawHairTile(ctx, r, x0, w, shade(art.primary!, -0.45), 90);
      drawHairTile(ctx, r, x0, w, shade(art.primary!, 0.3), 30);
      break;
    }
    case 'boot': {
      if (art.kind === 'wellie') {
        ctx.fillStyle = sideGrad(art.primary!, 0.35, -0.4);
        ctx.fillRect(x0, 0, w, 64);
        ctx.fillStyle = rgba('#ffffff', 0.55);
        ctx.fillRect(x0 + w * 0.22, 0, 12, 64);
        ctx.fillRect(x0 + w * 0.36, 0, 5, 64);
        break;
      }
      ctx.fillStyle = sideGrad(art.primary!, 0.22, -0.42);
      ctx.fillRect(x0, 0, w, 64);
      ctx.strokeStyle = art.secondary!;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x0 + w * 0.5, 0);
      ctx.bezierCurveTo(x0 + w * 0.2, 16, x0 + w * 0.8, 48, x0 + w * 0.5, 64);
      ctx.stroke();
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x0 + 12, 0);
      ctx.lineTo(x0 + 12, 64);
      ctx.moveTo(x0 + w - 12, 0);
      ctx.lineTo(x0 + w - 12, 64);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case 'armor': {
      ctx.fillStyle = sideGrad(art.primary!, 0.6, -0.55);
      ctx.fillRect(x0, 0, w, 64);
      ctx.fillStyle = rgba('#ffffff', 0.45);
      ctx.fillRect(x0 + w * 0.47, 0, 4, 64);
      ctx.fillStyle = art.secondary!;
      ctx.fillRect(x0, 54, w, 5);
      ctx.fillStyle = rgba('#000', 0.35);
      ctx.fillRect(x0, 59, w, 3);
      break;
    }
    case 'chrome': {
      // the Immortal's mask metal: a polished cylinder with the mask's banded reflections
      const light = art.legColor ?? '#c9d0da';
      const dark = art.legAccent ?? '#3a3f47';
      const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
      const stops: [number, string][] = [
        [0, dark], [0.1, shade(light, -0.2)], [0.2, '#ffffff'], [0.3, shade(light, -0.3)], [0.46, dark],
        [0.58, shade(light, -0.1)], [0.7, '#f6f8fb'], [0.82, shade(light, -0.35)], [1, dark],
      ];
      for (const [k, col] of stops) g.addColorStop(k, col);
      ctx.fillStyle = g;
      ctx.fillRect(x0, 0, w, 66);
      // (to 66: the canvas rounds up past 64 units, and a clear last row shows as a seam on the polished metal)
      break;
    }
    case 'iron': {
      const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
      g.addColorStop(0, '#050407');
      g.addColorStop(0.5, art.legColor ?? '#6c7480');
      g.addColorStop(1, '#050407');
      ctx.fillStyle = g;
      ctx.fillRect(x0, 0, w, 66);
      break;
    }
    case 'bandage': {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, 0, w, 64);
      ctx.clip();
      for (let i = -2; i < 7; i++) {
        ctx.save();
        ctx.translate(x0 + w / 2, i * 16 - 8);
        ctx.rotate(-0.25);
        ctx.fillStyle = mix(art.primary!, '#ffffff', (((i % 3) + 3) % 3) * 0.12);
        ctx.fillRect(-w, 0, w * 2, 17);
        ctx.strokeStyle = rgba('#5a4e34', 0.45);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-w, 16);
        ctx.lineTo(w, 16);
        ctx.stroke();
        ctx.restore();
      }
      const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
      g.addColorStop(0, rgba('#000', 0.3));
      g.addColorStop(0.5, rgba('#000', 0));
      g.addColorStop(1, rgba('#000', 0.32));
      ctx.fillStyle = g;
      ctx.fillRect(x0, 0, w, 64);
      ctx.restore();
      break;
    }
    case 'cast': {
      ctx.fillStyle = sideGrad(art.primary!, 0.1, -0.25);
      ctx.fillRect(x0, 0, w, 64);
      ctx.strokeStyle = rgba(art.secondary!, 0.8);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x0 + 20, 20);
      ctx.bezierCurveTo(x0 + 40, 4, x0 + 60, 36, x0 + 84, 16);
      ctx.stroke();
      ctx.strokeStyle = rgba('#e5242f', 0.8);
      ctx.beginPath();
      ctx.moveTo(x0 + 30, 50);
      ctx.lineTo(x0 + 70, 46);
      ctx.stroke();
      break;
    }
    case 'scales': {
      const col = art.legColor ?? art.primary!;
      ctx.fillStyle = sideGrad(col, 0.25, -0.4);
      ctx.fillRect(x0, 0, w, 64);
      ctx.strokeStyle = rgba(shade(col, -0.45), 0.45);
      ctx.lineWidth = 2;
      for (let yy = 0; yy <= 64; yy += 12) {
        const off = (yy / 12) % 2 ? 7 : 0;
        for (let xx = x0 + off; xx < x0 + w; xx += 14) {
          ctx.beginPath();
          ctx.arc(xx, yy, 7, 0.1, Math.PI - 0.1);
          ctx.stroke();
        }
      }
      break;
    }
    case 'wood': {
      ctx.fillStyle = sideGrad(art.primary!, 0.2, -0.4);
      ctx.fillRect(x0, 0, w, 64);
      break;
    }
    case 'puffy': {
      const col = art.legColor!;
      ctx.fillStyle = sideGrad(col, 0.3, -0.45);
      ctx.fillRect(x0, 0, w, 64);
      for (const y of [0, 32, 64]) {
        ctx.fillStyle = rgba('#000', 0.18);
        ctx.fillRect(x0, y - 3, w, 6);
        ctx.fillStyle = rgba('#ffffff', 0.25);
        ctx.fillRect(x0, y + 4, w, 4);
      }
      if (art.legAccent) {
        ctx.fillStyle = art.legAccent;
        ctx.fillRect(x0 + w * 0.7, 0, 10, 64);
      }
      break;
    }
  }
  // outlines down both sides
  const olBase = ['robot', 'fur', 'boot', 'armor', 'bandage', 'cast'].includes(art.leg)
    ? art.primary ?? base
    : ['scales', 'puffy', 'sock'].includes(art.leg)
      ? art.legColor ?? art.primary ?? base
      : base;
  const ol = art.leg === 'chrome' || art.leg === 'iron' ? '#1d120c' : outlineOf(olBase);
  const metalLeg = art.leg === 'chrome' || art.leg === 'iron';
  ctx.fillStyle = ol;
  ctx.fillRect(x0 - OUT / 2, 0, OUT, metalLeg ? 66 : 64);
  ctx.fillRect(x0 + w - OUT / 2, 0, OUT, metalLeg ? 66 : 64);
  return c;
}

function drawHairTile(ctx: Ctx, r: () => number, x0: number, w: number, col: string, n: number): void {
  ctx.strokeStyle = col;
  for (let i = 0; i < n; i++) {
    const hx = x0 + 4 + r() * (w - 8);
    const hy = r() * 64;
    const len = 6 + r() * 9;
    const bend = (r() - 0.5) * 6;
    ctx.lineWidth = 1.4 + r() * 1.4;
    ctx.globalAlpha = 0.45 + r() * 0.5;
    for (const off of [-64, 0, 64]) {
      ctx.beginPath();
      ctx.moveTo(hx, hy + off);
      ctx.quadraticCurveTo(hx + bend, hy + off + len / 2, hx + bend * 0.4, hy + off + len);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

/** Moon Boot Mo's puffy leg is wider than the boot's opening, so the boot gets a padded, quilted collar that is wider
 * than the leg, cinched with an orange drawstring: the leg goes into the collar instead of showing past the boot. */
function moonbootCollar(art: FootType['art'], s: number): HTMLCanvasElement {
  const lw = LEG_W.puffy + 22;
  const [c, ctx] = makeCanvas((lw + 16) * s, 108 * s);
  ctx.scale(s, s);
  // drawn in the lower half of a tall canvas, so (being centred on the ankle) it sits down over the boot's neck
  ctx.translate(0, 46);
  const x0 = 8;
  const col = art.primary ?? '#f2f5fa';
  const acc = art.secondary ?? '#ff5a36';
  roundRect(ctx, x0, 0, lw, 54, 20);
  const g = ctx.createLinearGradient(x0, 0, x0 + lw, 0);
  g.addColorStop(0, shade(col, -0.32));
  g.addColorStop(0.45, '#ffffff');
  g.addColorStop(1, shade(col, -0.36));
  ctx.fillStyle = g;
  ctx.fill();
  // quilted pillows: soft shading in each panel
  ctx.save();
  roundRect(ctx, x0, 0, lw, 54, 20);
  ctx.clip();
  for (let i = 1; i < 5; i++) {
    const x = x0 + (lw * i) / 5;
    ctx.strokeStyle = rgba('#5a6070', 0.35);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.quadraticCurveTo(x - 3, 27, x, 54);
    ctx.stroke();
  }
  const sh = ctx.createLinearGradient(0, 0, 0, 54);
  sh.addColorStop(0, rgba('#ffffff', 0.5));
  sh.addColorStop(0.4, rgba('#ffffff', 0));
  sh.addColorStop(1, rgba('#3a4050', 0.3));
  ctx.fillStyle = sh;
  ctx.fillRect(x0, 0, lw, 54);
  ctx.restore();
  // drawstring across the collar with a toggle and two tails
  ctx.strokeStyle = acc;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0 + 6, 27);
  ctx.quadraticCurveTo(x0 + lw / 2, 32, x0 + lw - 6, 27);
  ctx.stroke();
  const tx = x0 + lw * 0.68;
  ctx.beginPath();
  ctx.moveTo(tx, 30);
  ctx.quadraticCurveTo(tx + 4, 40, tx - 2, 50);
  ctx.moveTo(tx + 6, 30);
  ctx.quadraticCurveTo(tx + 12, 39, tx + 9, 49);
  ctx.stroke();
  roundRect(ctx, tx - 5, 24, 14, 10, 3);
  ctx.fillStyle = '#2a2f3a';
  ctx.fill();
  roundRect(ctx, x0, 0, lw, 54, 20);
  ctx.strokeStyle = INK;
  ctx.lineWidth = OUT;
  ctx.stroke();
  return c;
}

function drawCuff(type: FootType, s: number): HTMLCanvasElement | undefined {
  const art = type.art;
  if (art.kind === 'moonboot') return moonbootCollar(art, s);
  if (!['jeans', 'suit', 'clown'].includes(art.leg)) return undefined;
  const lw = LEG_W[art.leg] + 14;
  const [c, ctx] = makeCanvas((lw + 16) * s, 40 * s);
  ctx.scale(s, s);
  const x0 = 8;
  const col = art.legColor!;
  if (art.leg === 'clown') {
    // ruffle
    for (let i = 0; i < 9; i++) {
      ellipse(ctx, x0 + 8 + i * (lw - 16) / 8, 22, 13, 15);
      ctx.fillStyle = i % 2 ? '#ffffff' : art.legAccent!;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
    return c;
  }
  roundRect(ctx, x0, 6, lw, 26, 10);
  const g = ctx.createLinearGradient(x0, 0, x0 + lw, 0);
  g.addColorStop(0, shade(col, -0.35));
  g.addColorStop(0.5, shade(col, 0.15));
  g.addColorStop(1, shade(col, -0.4));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = outlineOf(col);
  ctx.lineWidth = OUT;
  ctx.stroke();
  if (art.leg === 'jeans') {
    ctx.strokeStyle = '#e7a94a';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(x0 + 8, 24);
    ctx.lineTo(x0 + lw - 8, 24);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  return c;
}

/** Texels per design unit (at scale 1) for a foot's textures: feet redrawn in the style kit are drawn bigger
 * (STYLE.res), but never past STYLE.maxTexel texels per unit in all, so bosses stay affordable. */
export function footRes(type: FootType): number {
  return styleFor(type.id) ? Math.min(STYLE.res, Math.max(ART_RES, STYLE.maxTexel / type.scale)) : ART_RES;
}

/** The design frame's geometry, for code that places parts of a foot's art (src/game/footRig.ts). */
export const FOOT_FRAME = { padX: PAD_X, padY: PAD_Y, w: DESIGN_W, h: DESIGN_H };

/**
 * A styled foot (src/art/style) drawn at a pose, or one of its layers, in its texture's frame. With `band`, only
 * the design rows y0…y1 are drawn (rig frames): the canvas then starts at design y0. `widen` (design units) adds room
 * either side, for art that reaches past the frame (a peel shows the whole foot): the canvas then starts at −padX − widen.
 */
export function styledCanvas(type: FootType, p: Pose, o: DrawOpts, band?: { y0: number; y1: number }, scale?: number, widen = 0): HTMLCanvasElement {
  const st = styleFor(type.id)!;
  // (texels per design unit: the foot's own, or another for art drawn at another size, like an animated peel's)
  const s = scale ?? type.scale * footRes(type);
  const y0 = band ? band.y0 : -PAD_Y;
  const h = band ? band.y1 - band.y0 : DESIGN_H;
  const [c, ctx] = makeCanvas((DESIGN_W + widen * 2) * s, h * s);
  ctx.scale(s, s);
  ctx.translate(PAD_X + widen, -y0);
  st.draw(ctx, type.art, p, o);
  // hand the canvas back in plain texture pixels (callers cut and fade it)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // (the leg as drawn, with any registerLeg override, so play fades the same as the still art)
  const leg = st.leg ? resolvedLeg(type, st.leg).spec : undefined;
  if (!band && leg?.join === 'blend') fadeFootTop(c, s, PAD_Y, leg.fade ?? 22, CX + PAD_X + widen, leg.fadeSpan ?? leg.hw);
  return c;
}

/** The pattern a foot's old leg had (sport-sock stripes, argyle, a toe sock's rainbow, stripy tights, clown dots,
 * ballet ribbons, puffer quilting, bandage wraps) and its colour, so the styled leg keeps it. */
function legacyPattern(art: FootArt): [LegPattern, string | undefined] {
  switch (art.leg) {
    case 'sock':
      if (art.kind === 'toesock') return ['rainbow', '#ffffff'];
      if (art.argyle) return ['argyle', art.secondary];
      return ['stripes', art.legAccent ?? art.secondary];
    case 'tights':
      return art.legAccent ? ['hoops', art.legAccent] : ['none', undefined];
    case 'clown':
      return ['dots', art.legAccent];
    case 'ribbon':
      return ['ribbon', art.secondary];
    case 'puffy':
      return ['quilt', art.legAccent];
    case 'bandage':
      return ['bandage', art.primary];
    default:
      return ['none', undefined];
  }
}

/** A styled foot's leg as drawn: its style's spec with any registerLeg override merged in, the old leg's pattern on
 * cloth legs, nylon for old tights and polished plate for old armour, and its colours from the foot's art. */
export function resolvedLeg(type: FootType, styleLeg: LegSpec): { spec: LegSpec; color: string; accent: string | undefined } {
  const art = type.art;
  const spec: LegSpec = { ...styleLeg, ...legOverride(type.id) };
  const cloth = ['knit', 'wool', 'tights', 'denim'].includes(spec.kind);
  if (spec.pattern === undefined) {
    const [pat, col] = legacyPattern(art);
    if (pat !== 'none' && col && (cloth || pat === 'bandage') && !(pat === 'bandage' && spec.kind === 'skin')) {
      spec.pattern = pat;
      spec.accent ??= col;
    }
  }
  if (!legOverride(type.id)?.kind) {
    if ((art.leg === 'tights' || art.leg === 'ribbon') && spec.kind === 'knit') spec.kind = 'tights';
    if (art.leg === 'armor' && spec.kind === 'iron') spec.kind = 'plate';
  }
  let color: string;
  if (spec.color) color = spec.color;
  else if (spec.kind === 'fur') color = art.primary ?? art.skin;
  else if (spec.kind === 'skin' || spec.kind === 'basalt') color = art.skin;
  else if (spec.kind === 'plate') color = art.primary ?? art.legColor ?? art.skin;
  else color = art.legColor ?? art.skin;
  // a plate leg's trim is the armour's accent; an iron leg's service light the foot's secondary colour
  const accent = spec.accent ?? (spec.kind === 'plate' || spec.kind === 'iron' ? art.secondary : undefined);
  return { spec: { ...spec, color, accent }, color, accent };
}

/** A foot's textures. `classic` draws a redrawn foot's old art instead (the style sheet's before/after). */
export function drawFoot(type: FootType, resOverride?: number, classic = false): FootTextures {
  const res = resOverride ?? (classic ? ART_RES : footRes(type));
  const s = type.scale * res;
  const art = type.art;
  const [c, ctx] = makeCanvas(DESIGN_W * s, DESIGN_H * s);
  ctx.scale(s, s);
  ctx.translate(PAD_X, PAD_Y);
  const r = rng(hashStr(type.id));
  const style = classic ? undefined : styleFor(type.id);
  if (style) {
    style.draw(ctx, art, REST, { live: false });
    const cy = style.contactY ?? 260;
    const leg = style.leg ? resolvedLeg(type, style.leg) : undefined;
    const spec = leg?.spec;
    if (spec?.join === 'blend') fadeFootTop(c, s, PAD_Y, spec.fade ?? 22, CX + PAD_X, spec.fadeSpan ?? spec.hw);
    return {
      res,
      foot: c,
      leg: leg && spec ? styledLeg(spec, leg.color, leg.accent, s) : drawLeg(type, s),
      cuff: leg && spec ? (spec.join === 'hem' ? styledHem(spec, leg.color, s) : undefined) : drawCuff(type, s),
      legEnd: spec ? legEnd(spec) : undefined,
      cuffTop: spec?.join === 'hem' ? -18 : undefined,
      originY: (cy + PAD_Y) / DESIGN_H,
      footHeight: cy,
      footHalfWidth: style.halfWidth ?? 104,
      legWidth: spec ? spec.hw * 2 + OUT * 2 : LEG_W[art.leg] + OUT * 2,
    };
  }
  switch (art.kind) {
    case 'bare':
      drawBare(ctx, art, r);
      break;
    case 'sock':
      drawSock(ctx, art, r, false);
      break;
    case 'toesock':
      drawSock(ctx, art, r, true);
      break;
    case 'sneaker':
      drawSneaker(ctx, art);
      break;
    case 'boot':
      drawBoot(ctx, art);
      break;
    case 'cowboy':
      drawCowboy(ctx, art);
      break;
    case 'clown':
      drawClown(ctx, art);
      break;
    case 'ballet':
      drawBallet(ctx, art);
      break;
    case 'skate':
      drawSkate(ctx, art);
      break;
    case 'flipper':
      drawFlipper(ctx, art, r);
      break;
    case 'robot':
      drawRobot(ctx, art);
      break;
    case 'flipflop':
      drawFlipflop(ctx, art, r);
      break;
    case 'bigfoot':
      drawBigfoot(ctx, art, r);
      break;
    default:
      if (!drawExtraKind(ctx, art, r)) kindDrawer(art.kind)?.draw(ctx, art, r);
  }
  drawAccessories(ctx, art, r);
  if (art.lava) drawLavaOverlay(ctx, art, r);
  if (art.gold) drawGoldOverlay(ctx, r);
  const cy = contactY(art);
  return {
    res,
    foot: c,
    leg: drawLeg(type, s),
    cuff: drawCuff(type, s),
    originY: (cy + PAD_Y) / DESIGN_H,
    footHeight: cy,
    footHalfWidth: halfWidth(art),
    legWidth: LEG_W[art.leg] + OUT * 2,
  };
}

/** Composite portrait (leg + foot) used by DOM menus such as the Pizzapedia. */
export function footPortrait(type: FootType, tex: FootTextures, size = 220): string {
  const s = type.scale * tex.res;
  const legH = (styleFor(type.id)?.portraitLeg ?? 120) * s;
  const fw = tex.foot.width;
  const fh = tex.foot.height;
  const [c, ctx] = makeCanvas(fw, fh + legH);
  const pat = ctx.createPattern(tex.leg, 'repeat')!;
  ctx.save();
  ctx.translate((fw - tex.leg.width) / 2, 0);
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, tex.leg.width, legH + 30 * s);
  ctx.restore();
  ctx.drawImage(tex.foot, 0, legH);
  if (tex.cuff) ctx.drawImage(tex.cuff, (fw - tex.cuff.width) / 2, tex.cuffTop !== undefined ? legH + (PAD_Y + tex.cuffTop) * s : legH - 6 * s);
  // fade the top of the leg out
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(0, 0, 0, legH * 0.8);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, fw, legH);
  // downscale for DOM
  const k = size / Math.max(c.width, c.height);
  const [o, octx] = makeCanvas(c.width * k, c.height * k);
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(c, 0, 0, o.width, o.height);
  return o.toDataURL('image/png');
}
