// Arenas for the comic heroes' nemesis bosses (src/game/nemesis.ts; the fights are in src/game/bosses/comics.ts),
// printed like the rest of Act 7 with Ben-Day dots:
// - The HYDRANT Bunker (the Red Sole, wave 68 with Captain Pizzeria): a concrete bunker under the Doom Lab, crimson
//   banners with HYDRANT's tentacled hydrant, a war map, and the empty cradle the Cosmic Crouton was stolen from.
//   Alarm beacons turn and the cradle's glow pulses (src/content/live/comics.ts). Redrawn with the location kit in
//   scene-redsole.ts: this stays for the before/after page.
// - The Symbiote Lab (Venomnom, wave 68 with Spider-Pan): a wrecked lab, its containment tank smashed and black goo
//   oozing across the floor, two sonic emitters on the back wall. The lights flicker and the goo drips.
// - The Night Conservatory (the Cheetoe, wave 63 with Wonder Wedge): a glass dome on a Metropizza rooftop, overgrown
//   with jungle, the moon and the city through the panes. Fireflies drift and moonbeams shift.
// Every emblem is our own.

import type { GlowSpot } from '../../art/backdrops';
import { registerLegacyScene, registerScene } from '../../art/registry';
import {
  type Ctx,
  type R,
  H,

  TY,
  VX,
  W,
  clipRect,
  contactShadow,
  cylH,
  cylV,
  ellipse,
  fillOl,
  frontFace,
  glow,
  grade,
  laneCalm,
  lgrad,
  moon,
  mottle,
  outline,
  rgba,
  rivet,
  roundRect,
  shade,
  stars,
  stoneTop,
  tableLight,
  vgrad,
  vignette,
} from '../../art/sceneKit';

const g = (x: number, y: number, r: number, color: string, flicker: number): GlowSpot => ({ x, y, r, color, flicker });

/** Ben-Day dots over a rectangle (the act's comic print), growing from a0 to a1 of the step down the area. */
function benDay(ctx: Ctx, x: number, y: number, w: number, h: number, col: string, alpha: number, step = 14, a0 = 0.05, a1 = 0.32): void {
  ctx.save();
  ctx.fillStyle = rgba(col, alpha);
  for (let j = 0, yy = y; yy < y + h; j++, yy += step) {
    const k = (yy - y) / h;
    const r = step * (a0 + (a1 - a0) * k);
    for (let xx = x + (j % 2) * (step / 2); xx < x + w; xx += step) {
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** A steel table front with a hazard stripe. */
function steelFront(ctx: Ctx, front: number, face: string, stripe: string): void {
  frontFace(ctx, front, () => {
    ctx.fillStyle = lgrad(ctx, 0, front, 0, H, [
      [0, shade(face, 0.05)],
      [1, shade(face, -0.45)],
    ]);
    ctx.fillRect(0, front, W, H - front);
    ctx.save();
    clipRect(ctx, 0, front + 10, W, 22);
    for (let x = -40; x < W + 40; x += 44) {
      ctx.beginPath();
      ctx.moveTo(x, front + 32);
      ctx.lineTo(x + 22, front + 10);
      ctx.lineTo(x + 44, front + 10);
      ctx.lineTo(x + 22, front + 32);
      ctx.closePath();
      ctx.fillStyle = stripe;
      ctx.fill();
    }
    ctx.restore();
    for (let x = 30; x < W; x += 120) rivet(ctx, x, front + 46, 5);
  }, 0.35);
}

// =============================================================================================
// The HYDRANT Bunker (the Red Sole)

export const RB = {
  cradle: { x: 960, y: 560 },
  beacons: [{ x: 330, y: 150 }, { x: 1590, y: 150 }],
  front: 1040,
};

function hydrantMark(ctx: Ctx, x: number, y: number, s: number, col: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = col;
  ctx.strokeStyle = col;
  ctx.lineCap = 'round';
  for (let k = 0; k < 6; k++) {
    const a = Math.PI * (0.12 + (k / 5) * 0.76);
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.bezierCurveTo(Math.cos(a) * 30, 20 + Math.sin(a) * 10, Math.cos(a) * 56, 30 + Math.sin(a) * 30, Math.cos(a) * 46, 54 + Math.sin(a) * 20);
    ctx.lineWidth = 9;
    ctx.stroke();
  }
  roundRect(ctx, -20, -40, 40, 64, 8);
  ctx.fill();
  roundRect(ctx, -28, -48, 56, 14, 5);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -50, 14, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-36, -20, 72, 14);
  ctx.restore();
}

function drawBunker(ctx: Ctx, r: R): void {
  vgrad(ctx, 0, 0, W, TY, [
    [0, '#2a2628'],
    [1, '#3e3434'],
  ]);
  // poured concrete in panels, with shuttering seams and stains
  ctx.save();
  clipRect(ctx, 0, 0, W, TY);
  mottle(ctx, 0, 0, W, TY, 0.3, 1.2);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 3;
  for (let x = 0; x <= W; x += 240) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, TY);
    ctx.stroke();
  }
  for (let y = 120; y < TY; y += 160) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let x = 40; x < W; x += 120) for (let y = 60; y < TY; y += 160) rivet(ctx, x, y, 4);
  ctx.restore();
  // the ceiling: a run of pipes and a steel beam
  ctx.beginPath();
  ctx.rect(-10, 40, W + 20, 40);
  fillOl(ctx, cylV(ctx, 40, 40, '#5a5e64'), 5);
  for (const y of [96, 118]) {
    ctx.beginPath();
    ctx.rect(-10, y, W + 20, 16);
    fillOl(ctx, cylV(ctx, y, 16, y < 110 ? '#8a3a2a' : '#4a6a5a'), 3);
  }
  // crimson banners with HYDRANT's emblem
  for (const x of [520, 1400]) {
    ctx.beginPath();
    ctx.moveTo(x - 110, 140);
    ctx.lineTo(x + 110, 140);
    ctx.lineTo(x + 110, 560);
    ctx.lineTo(x, 520);
    ctx.lineTo(x - 110, 560);
    ctx.closePath();
    fillOl(ctx, lgrad(ctx, x - 110, 0, x + 110, 0, [
      [0, '#6a0a14'],
      [0.4, '#c8102e'],
      [1, '#5a0810'],
    ]), 5);
    ctx.save();
    ctx.clip();
    benDay(ctx, x - 110, 140, 220, 420, '#000000', 0.25, 12);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x, 300, 80, 0, Math.PI * 2);
    fillOl(ctx, '#f4efe6', 5);
    hydrantMark(ctx, x, 304, 1, '#1e1c20');
    roundRect(ctx, x - 120, 128, 240, 18, 6);
    fillOl(ctx, cylV(ctx, 128, 18, '#c9a23a'), 3);
  }
  // the war map between them: the city with red arrows closing on a pizzeria
  roundRect(ctx, 780, 170, 360, 230, 8);
  fillOl(ctx, lgrad(ctx, 0, 170, 0, 400, [
    [0, '#e8dcbc'],
    [1, '#b8a888'],
  ]), 5);
  ctx.strokeStyle = 'rgba(90,70,50,0.5)';
  ctx.lineWidth = 2;
  for (let k = 0; k < 7; k++) {
    ctx.beginPath();
    ctx.moveTo(790, 190 + k * 30);
    ctx.lineTo(1130, 200 + k * 28 + (r() - 0.5) * 20);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(960, 290, 22, 0, Math.PI * 2);
  fillOl(ctx, '#ffd23f', 3);
  for (const [x0, y0] of [[810, 200], [1110, 220], [840, 380], [1100, 370]]) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + 960) / 2, (y0 + 290) / 2 - 30, 960 + (x0 < 960 ? -30 : 30), 290);
    ctx.strokeStyle = '#c8102e';
    ctx.lineWidth = 7;
    ctx.stroke();
  }
  // the cradle the Cosmic Crouton was stolen from: a bronze cradle on a steel plinth, still glowing blue
  const C = RB.cradle;
  glow(ctx, C.x, C.y - 80, 260, '#5fb8ff', 0.45);
  roundRect(ctx, C.x - 90, C.y - 20, 180, 140, 10);
  fillOl(ctx, cylH(ctx, C.x - 90, 180, '#5a5e64'), 5);
  ctx.beginPath();
  ctx.moveTo(C.x - 80, C.y - 30);
  ctx.quadraticCurveTo(C.x, C.y + 30, C.x + 80, C.y - 30);
  ctx.lineTo(C.x + 70, C.y - 40);
  ctx.quadraticCurveTo(C.x, C.y + 10, C.x - 70, C.y - 40);
  ctx.closePath();
  fillOl(ctx, cylV(ctx, C.y - 40, 50, '#c9873a'), 4);
  ctx.font = '700 26px "Lilita One", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  ctx.fillText('PROPERTY OF HYDRANT', C.x, C.y + 60);
  // the beacons' housings (their light turns in the live layer)
  for (const b of RB.beacons) {
    roundRect(ctx, b.x - 30, b.y - 10, 60, 40, 8);
    fillOl(ctx, cylH(ctx, b.x - 30, 60, '#4a4e54'), 4);
    ctx.beginPath();
    ctx.arc(b.x, b.y - 14, 24, Math.PI, 0);
    fillOl(ctx, '#c8202a', 4);
  }
  // the floor: dark steel plate catching red light
  vgrad(ctx, 0, 640, W, TY - 640, [
    [0, '#3a3234'],
    [1, '#22201e'],
  ]);
  laneCalm(ctx, 0.25, 60, 620, '#0a0606');
  stoneTop(ctx, r, RB.front, '#5a5a5e', 0.2);
  steelFront(ctx, RB.front, '#4a4e54', '#ffd23f');
  contactShadow(ctx, 0.6);
  tableLight(ctx, '#ff8a7a', 0.06, 0.5);
  grade(ctx, 0.06);
  vignette(ctx, 0.75, '#0a0606', 0.55);
}

// =============================================================================================
// The Symbiote Lab (Venomnom)

export const VL = {
  emitters: [{ x: 250, y: 300 }, { x: 1670, y: 300 }],
  tank: { x: 960, y: 420 },
  front: 1040,
};

function drawSymbioteLab(ctx: Ctx, r: R): void {
  vgrad(ctx, 0, 0, W, TY, [
    [0, '#14161c'],
    [1, '#22262e'],
  ]);
  // tiled lab walls, half the tiles cracked
  ctx.save();
  clipRect(ctx, 0, 0, W, TY);
  for (let y = 0; y < TY; y += 60)
    for (let x = (y / 60) % 2 ? -30 : 0; x < W; x += 60) {
      roundRect(ctx, x + 3, y + 3, 54, 54, 4);
      ctx.fillStyle = rgba(r() < 0.5 ? '#3a4450' : '#323a44', 0.9);
      ctx.fill();
    }
  benDay(ctx, 0, 0, W, TY, '#000000', 0.25, 16);
  ctx.restore();
  // fluorescent tubes on the ceiling (they flicker live)
  for (const x of [480, 960, 1440]) {
    roundRect(ctx, x - 140, 40, 280, 24, 10);
    fillOl(ctx, '#e8f4ff', 4);
    glow(ctx, x, 60, 220, '#c8e8ff', 0.25);
  }
  // the sonic emitters on their brackets
  for (const e of VL.emitters) {
    ctx.beginPath();
    ctx.rect(e.x - 12, 80, 24, e.y - 160);
    fillOl(ctx, cylH(ctx, e.x - 12, 24, '#5a6068'), 4);
    roundRect(ctx, e.x - 80, e.y - 90, 160, 180, 16);
    fillOl(ctx, cylV(ctx, e.y - 90, 180, '#4a525c'), 5);
    for (const [rr, col] of [[60, '#1a1e24'], [46, '#3a424c'], [24, '#1a1e24']] as const) {
      ctx.beginPath();
      ctx.arc(e.x, e.y, rr, 0, Math.PI * 2);
      fillOl(ctx, col, 3);
    }
    ctx.font = '700 22px "Lilita One", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23f';
    ctx.fillText('SONIC', e.x, e.y + 116);
  }
  // the smashed containment tank: a steel base and cap, the glass in jagged teeth, goo spilling out
  const T = VL.tank;
  glow(ctx, T.x, T.y, 260, '#6a5aff', 0.3);
  roundRect(ctx, T.x - 140, T.y - 300, 280, 40, 10);
  fillOl(ctx, cylV(ctx, T.y - 300, 40, '#6a7480'), 5);
  roundRect(ctx, T.x - 150, T.y + 120, 300, 70, 12);
  fillOl(ctx, cylV(ctx, T.y + 120, 70, '#5a6068'), 5);
  ctx.beginPath();
  ctx.moveTo(T.x - 120, T.y + 120);
  ctx.lineTo(T.x - 120, T.y - 40);
  ctx.lineTo(T.x - 80, T.y - 90);
  ctx.lineTo(T.x - 60, T.y - 20);
  ctx.lineTo(T.x - 20, T.y - 70);
  ctx.lineTo(T.x + 10, T.y);
  ctx.lineTo(T.x + 50, T.y - 110);
  ctx.lineTo(T.x + 80, T.y - 30);
  ctx.lineTo(T.x + 120, T.y - 60);
  ctx.lineTo(T.x + 120, T.y + 120);
  ctx.closePath();
  ctx.fillStyle = rgba('#a8d8ff', 0.25);
  ctx.fill();
  outline(ctx, 4, rgba('#d8f0ff', 0.8));
  // the goo: a black flood pouring out of the tank and across the floor, glossy on top
  ctx.beginPath();
  ctx.moveTo(T.x - 110, T.y + 60);
  ctx.bezierCurveTo(T.x - 90, T.y - 20, T.x + 90, T.y - 30, T.x + 110, T.y + 60);
  ctx.bezierCurveTo(T.x + 200, T.y + 200, T.x + 420, T.y + 230, T.x + 520, T.y + 300);
  ctx.lineTo(T.x - 560, T.y + 300);
  ctx.bezierCurveTo(T.x - 420, T.y + 220, T.x - 200, T.y + 200, T.x - 110, T.y + 60);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, T.y - 20, 0, T.y + 300, [
    [0, '#2a2a3a'],
    [1, '#0a0a10'],
  ]), 5);
  for (const [x, y, w] of [[T.x - 40, T.y + 30, 50], [T.x + 180, T.y + 200, 70], [T.x - 300, T.y + 240, 60]]) {
    ellipse(ctx, x, y, w, 8, -0.2);
    ctx.fillStyle = rgba('#8a8aff', 0.35);
    ctx.fill();
  }
  // goo splats up the walls
  for (const [x, y, s] of [[640, 220, 1], [1300, 160, 0.8], [1180, 330, 0.6]]) {
    ctx.beginPath();
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const rr = (k % 2 ? 22 : 44) * s;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    fillOl(ctx, '#14141c', 3);
    ctx.beginPath();
    ctx.moveTo(x - 6 * s, y + 30 * s);
    ctx.quadraticCurveTo(x, y + 90 * s, x + 6 * s, y + 30 * s);
    ctx.fillStyle = '#14141c';
    ctx.fill();
  }
  // the floor
  vgrad(ctx, 0, 680, W, TY - 680, [
    [0, '#2a2e36'],
    [1, '#1a1c22'],
  ]);
  laneCalm(ctx, 0.25, 60, 620, '#06060a');
  stoneTop(ctx, r, VL.front, '#8a929c', 0.15);
  // black goo splashed across the table top
  for (const [x, y, w] of [[300, 900, 70], [1500, 860, 90], [980, 980, 60]]) {
    ellipse(ctx, x, y, w, w * 0.32, 0.1);
    fillOl(ctx, '#14141c', 3);
  }
  steelFront(ctx, VL.front, '#5a6068', '#ffd23f');
  contactShadow(ctx, 0.6);
  tableLight(ctx, '#c8d8ff', 0.06, 0.5);
  grade(ctx, 0.08);
  vignette(ctx, 0.85, '#06060a', 0.6);
}

// =============================================================================================
// The Night Conservatory (the Cheetoe)

export const NC = {
  moon: { x: 1380, y: 170 },
  front: 1040,
};

/** A big jungle leaf from (x, y) along angle `a`. */
function leaf(ctx: Ctx, x: number, y: number, len: number, a: number, col: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.32, len, 0);
  ctx.quadraticCurveTo(len * 0.5, len * 0.32, 0, 0);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, -len * 0.3, 0, len * 0.3, [
    [0, shade(col, 0.25)],
    [1, shade(col, -0.35)],
  ]), 4);
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.lineTo(len * 0.92, 0);
  ctx.strokeStyle = rgba(shade(col, 0.45), 0.7);
  ctx.lineWidth = 3;
  ctx.stroke();
  for (let k = 1; k < 6; k++) {
    const t = k / 6;
    ctx.beginPath();
    ctx.moveTo(len * t, 0);
    ctx.lineTo(len * t + len * 0.12, -len * 0.18 * Math.sin(t * Math.PI));
    ctx.moveTo(len * t, 0);
    ctx.lineTo(len * t + len * 0.12, len * 0.18 * Math.sin(t * Math.PI));
    ctx.stroke();
  }
  ctx.restore();
}

function drawConservatory(ctx: Ctx, r: R): void {
  // the night sky and the city through the glass
  vgrad(ctx, 0, 0, W, TY, [
    [0, '#0c1430'],
    [0.6, '#1c2a50'],
    [1, '#2a2a48'],
  ]);
  stars(ctx, r, 0, 0, W, 400, 120, 0.8);
  moon(ctx, NC.moon.x, NC.moon.y, 90, r);
  glow(ctx, NC.moon.x, NC.moon.y, 300, '#d8e8ff', 0.25);
  for (let x = -20; x < W; x += 70 + r() * 60) {
    const h = 120 + r() * 220;
    ctx.beginPath();
    ctx.rect(x, 600 - h, 60 + r() * 40, h);
    ctx.fillStyle = '#141a30';
    ctx.fill();
    for (let wy = 600 - h + 14; wy < 590; wy += 22)
      for (let wx = x + 8; wx < x + 50; wx += 16) {
        if (r() < 0.4) continue;
        ctx.fillStyle = rgba('#ffd890', 0.6 + r() * 0.3);
        ctx.fillRect(wx, wy, 8, 10);
      }
  }
  // the glass dome: a curved lattice of white iron with faint reflections in the panes
  ctx.save();
  ctx.strokeStyle = rgba('#e8f0ff', 0.75);
  ctx.lineWidth = 8;
  for (let k = -6; k <= 6; k++) {
    ctx.beginPath();
    ctx.moveTo(VX + k * 40, -20);
    ctx.quadraticCurveTo(VX + k * 160, 200, VX + k * 170, 640);
    ctx.stroke();
  }
  for (const y of [120, 260, 420]) {
    ctx.beginPath();
    ctx.ellipse(VX, y - 260, 1100, 380 + y * 0.4, 0, 0.12, Math.PI - 0.12);
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.12;
  for (let k = 0; k < 6; k++) {
    ctx.beginPath();
    ctx.moveTo(200 + k * 300, 0);
    ctx.lineTo(260 + k * 300, 0);
    ctx.lineTo(120 + k * 300, 640);
    ctx.lineTo(60 + k * 300, 640);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  ctx.restore();
  benDay(ctx, 0, 0, W, 640, '#000000', 0.2, 16);
  // the jungle: palms and huge leaves framing both sides, vines hanging from the lattice
  for (const [x, s] of [[120, 1], [1800, -1]] as const) {
    ctx.beginPath();
    ctx.moveTo(x - 20, 660);
    ctx.quadraticCurveTo(x + s * 30, 400, x + s * 10, 180);
    ctx.lineTo(x + s * 34, 180);
    ctx.quadraticCurveTo(x + s * 56, 400, x + 22, 660);
    ctx.closePath();
    fillOl(ctx, cylH(ctx, x - 20, 50, '#7a5a3a'), 4);
    for (let k = 0; k < 7; k++) leaf(ctx, x + s * 22, 190, 260, (s > 0 ? 0 : Math.PI) + s * (-1.2 + k * 0.42), k % 2 ? '#2e7a3a' : '#3a8a44');
  }
  for (const [x, y, len, a] of [[60, 560, 320, -0.4], [1860, 560, 320, Math.PI + 0.4], [300, 640, 260, -0.9], [1620, 640, 260, Math.PI + 0.9], [480, 680, 220, -0.2], [1440, 680, 220, Math.PI + 0.2]] as const) {
    leaf(ctx, x, y, len, a, '#2a6a34');
  }
  ctx.strokeStyle = '#2e6a34';
  ctx.lineWidth = 6;
  for (const x of [520, 760, 1180, 1420]) {
    ctx.beginPath();
    ctx.moveTo(x, -10);
    ctx.bezierCurveTo(x + 30, 120, x - 30, 200, x + 10, 300 + (x % 3) * 30);
    ctx.stroke();
    for (let y = 40; y < 300; y += 50) leaf(ctx, x + 6, y, 40, 0.8, '#3a8a44');
  }
  // the floor: dark tiles and a low planter wall in front of the jungle
  vgrad(ctx, 0, 640, W, TY - 640, [
    [0, '#2a3a2e'],
    [1, '#1a2420'],
  ]);
  roundRect(ctx, -20, 640, W + 40, 40, 6);
  fillOl(ctx, cylV(ctx, 640, 40, '#8a7a6a'), 4);
  laneCalm(ctx, 0.25, 60, 620, '#060a14');
  stoneTop(ctx, r, NC.front, '#7a6a5a', 0.2);
  frontFace(ctx, NC.front, () => {
    ctx.fillStyle = lgrad(ctx, 0, NC.front, 0, H, [
      [0, '#6a4a2a'],
      [1, '#2a1a0e'],
    ]);
    ctx.fillRect(0, NC.front, W, H - NC.front);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 3;
    for (let x = 0; x < W; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x, NC.front);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
  }, 0.4);
  contactShadow(ctx, 0.55);
  tableLight(ctx, '#c8e0ff', 0.08, 0.5);
  grade(ctx, 0.05);
  vignette(ctx, 0.8, '#060a14', 0.55);
}

// (redrawn with the location kit in scene-redsole.ts; this stays for the before/after page, ?dev&stages)
registerLegacyScene('redsole', {
  info: {
    name: 'The HYDRANT Bunker',
    subtitle: 'Mini-boss: THE RED SOLE',
    ambient: ['dust'],
    glows: [g(RB.cradle.x, RB.cradle.y - 80, 240, '#5fb8ff', 0.4), ...RB.beacons.map((b) => g(b.x, b.y, 160, '#ff3a2a', 0.6))],
    light: '#f0c8c0',
    tableTint: '#f8ecea',
  },
  draw: drawBunker,
});

registerScene('venomnom', {
  info: {
    name: 'The Symbiote Lab',
    subtitle: 'Mini-boss: VENOMNOM',
    ambient: ['dust'],
    glows: [g(VL.tank.x, VL.tank.y, 260, '#6a5aff', 0.35), ...VL.emitters.map((e) => g(e.x, e.y, 140, '#7dff9a', 0.2))],
    light: '#c8d0f0',
    tableTint: '#eceef8',
  },
  draw: drawSymbioteLab,
});

registerScene('cheetoe', {
  info: {
    name: 'The Night Conservatory',
    subtitle: 'Mini-boss: THE CHEETOE',
    ambient: ['fireflies'],
    glows: [g(NC.moon.x, NC.moon.y, 300, '#d8e8ff', 0.05)],
    light: '#c8d8f0',
    tableTint: '#eef2fa',
  },
  draw: drawConservatory,
});
