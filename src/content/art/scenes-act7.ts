// Act 7 · Comics backdrops: Metropizza Rooftops and The Doom Lab (locations), Downtown Ruins (Doomstomp) and
// Titan's Throne (Thanfoot). Pulp-comic print: flat bold colour fields, ink outlines, halftone dot shading and
// Ben-Day skies. Moving parts (searchlights, the blimp, rain, alarms, vat bubbles, Tesla arcs, drifting rocks)
// are added on top by the act's effect layer in src/game/acts/act7.ts, which also changes the weather and
// lighting from wave to wave. Metropizza Rooftops and Downtown Ruins have been redrawn with the location kit
// (scene-metropizza.ts, scene-doomstomp.ts), which run their own moving parts; their old art below is kept for the
// before/after page.

import type { GlowSpot } from '../../art/backdrops';
import { registerLegacyScene, registerScene } from '../../art/registry';
import {
  type Ctx,
  type R,
  BLOCK,
  H,
  OL,
  TY,
  W,
  checkerTop,
  clipRect,
  cone,
  contactShadow,
  cylH,
  cylV,
  darkSpot,
  ellipse,
  fillOl,
  flame,
  fogBand,
  frontFace,
  glow,
  grainRect,
  hazard,
  laneCalm,
  lgrad,
  moon,
  neonText,
  outline,
  rgba,
  rivet,
  roundRect,
  shade,
  skyline,
  stars,
  starPath,
  stoneFront,
  stoneTop,
  tableLight,
  vgrad,
  vignette,
  zFront,
  bandsX,
} from '../../art/sceneKit';

const g = (x: number, y: number, r: number, color: string, flicker: number): GlowSpot => ({ x, y, r, color, flicker });

// ——— Comic print helpers ———

/** Ben-Day dots over a rectangle: dots grow from `a0` to `a1` of the step down the area (a printed gradient). */
function benDay(ctx: Ctx, x: number, y: number, w: number, h: number, col: string, alpha: number, step = 14, a0 = 0.05, a1 = 0.32): void {
  ctx.save();
  clipRect(ctx, x, y, w, h);
  ctx.fillStyle = rgba(col, alpha);
  for (let yy = y; yy < y + h + step; yy += step) {
    const k = (yy - y) / h;
    const rr = step * (a0 + (a1 - a0) * Math.min(1, Math.max(0, k)));
    const off = Math.round((yy - y) / step) % 2 ? step / 2 : 0;
    ctx.beginPath();
    for (let xx = x + off; xx < x + w + step; xx += step) {
      ctx.moveTo(xx + rr, yy);
      ctx.arc(xx, yy, rr, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  ctx.restore();
}

/** Comic speed lines radiating from a point (for drama behind a skyline or throne). */
function speedLines(ctx: Ctx, cx: number, cy: number, r0: number, r1: number, n: number, col: string, a: number, r: R): void {
  ctx.save();
  ctx.fillStyle = rgba(col, a);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + r() * 0.05;
    const w = 0.004 + r() * 0.01;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang - w) * r0, cy + Math.sin(ang - w) * r0);
    ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
    ctx.lineTo(cx + Math.cos(ang + w) * r0, cy + Math.sin(ang + w) * r0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** An inked building with lit windows, a cornice and a rooftop water tank or antenna. */
function tower(ctx: Ctx, r: R, x: number, w: number, top: number, base: number, wall: string, win: string, lit: number): void {
  ctx.beginPath();
  ctx.rect(x, top, w, base - top);
  fillOl(ctx, lgrad(ctx, x, 0, x + w, 0, [[0, shade(wall, 0.12)], [0.6, wall], [1, shade(wall, -0.35)]]), 4);
  // cornice
  ctx.beginPath();
  ctx.rect(x - 8, top - 10, w + 16, 14);
  fillOl(ctx, shade(wall, 0.2), 3);
  const cols = Math.max(2, Math.floor((w - 20) / 34));
  const cw = (w - 20) / cols;
  for (let wy = top + 24; wy < base - 30; wy += 46) {
    for (let i = 0; i < cols; i++) {
      const on = r() < lit;
      ctx.fillStyle = on ? rgba(win, 0.7 + r() * 0.3) : rgba('#0a0e1a', 0.55);
      ctx.fillRect(x + 12 + i * cw, wy, cw - 12, 26);
      if (on && r() < 0.3) {
        // a silhouette at the window
        ctx.fillStyle = rgba('#1a1020', 0.6);
        ctx.fillRect(x + 12 + i * cw + (cw - 12) * 0.35, wy + 8, (cw - 12) * 0.3, 18);
      }
    }
  }
}

function waterTank(ctx: Ctx, x: number, base: number, s: number): void {
  for (const lx of [-34, 34]) {
    ctx.beginPath();
    ctx.moveTo(x + lx * s, base);
    ctx.lineTo(x + lx * 0.7 * s, base - 70 * s);
    ctx.strokeStyle = OL;
    ctx.lineWidth = 6 * s;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.rect(x - 44 * s, base - 150 * s, 88 * s, 84 * s);
  fillOl(ctx, cylH(ctx, x - 44 * s, 88 * s, '#7a4a2e'), 4);
  ctx.fillStyle = rgba(OL, 0.5);
  for (const yy of [-130, -100, -80]) ctx.fillRect(x - 44 * s, base + yy * s, 88 * s, 3);
  ctx.beginPath();
  ctx.moveTo(x - 50 * s, base - 150 * s);
  ctx.lineTo(x, base - 192 * s);
  ctx.lineTo(x + 50 * s, base - 150 * s);
  ctx.closePath();
  fillOl(ctx, '#4a3424', 4);
}

// ---------------------------------------------------------------------------------------------
// Metropizza Rooftops

const MP = {
  tower: { x: 1240, top: 70 },
  globe: { x: 1310, y: 112 },
  sign: { x: 560, y: 470 },
  lamp: { x: 1690, y: 560 },
  front: 1040,
};

function drawMetropizza(ctx: Ctx, r: R): void {
  // dusk sky: teal overhead, warm at the horizon, printed with Ben-Day dots
  vgrad(ctx, 0, 0, W, 640, [
    [0, '#18264a'],
    [0.45, '#3a4a7a'],
    [0.8, '#d0705a'],
    [1, '#f4b26a'],
  ]);
  benDay(ctx, 0, 0, W, 420, '#0a1430', 0.5, 16, 0.3, 0.02);
  benDay(ctx, 0, 380, W, 260, '#ffd8a0', 0.35, 14, 0.02, 0.28);
  stars(ctx, r, 0, 0, W, 260, 70, 0.7);
  moon(ctx, 300, 150, 48, r, '#fff4d8');
  speedLines(ctx, 300, 150, 70, 380, 40, '#ffffff', 0.05, r);
  // far skyline: flat purple cut-outs with a few lit windows
  skyline(ctx, r, 600, 140, 300, 60, 140, '#4a3e78', 0.18, '#ffd88a', 0);
  skyline(ctx, r, 620, 90, 220, 70, 150, '#352c5e', 0.25, '#ffe2a0', 0);
  // the Metropizza tower: an art-deco spire with a turning pizza globe (original)
  const T = MP.tower;
  ctx.beginPath();
  ctx.moveTo(T.x - 120, 640);
  ctx.lineTo(T.x - 90, 260);
  ctx.lineTo(T.x - 60, 260);
  ctx.lineTo(T.x - 40, 170);
  ctx.lineTo(T.x + 40, 170);
  ctx.lineTo(T.x + 60, 260);
  ctx.lineTo(T.x + 90, 260);
  ctx.lineTo(T.x + 120, 640);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, T.x - 120, 0, T.x + 120, 0, [[0, '#8a90b8'], [0.5, '#5a5e8a'], [1, '#2e3058']]), 5);
  ctx.save();
  ctx.clip();
  for (let x = T.x - 110; x < T.x + 120; x += 22) {
    ctx.fillStyle = rgba('#ffe6a0', 0.25 + r() * 0.4);
    for (let y = 290; y < 640; y += 34) if (r() < 0.55) ctx.fillRect(x, y, 10, 18);
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(T.x, 170);
  ctx.lineTo(T.x, T.top);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.strokeStyle = '#c8ccd4';
  ctx.lineWidth = 3;
  ctx.stroke();
  // pizza globe: a slice-segmented sphere ringed by a gold band
  const G = MP.globe;
  glow(ctx, T.x, 130, 160, '#ffd06a', 0.4);
  ellipse(ctx, T.x, 128, 52, 52);
  fillOl(ctx, lgrad(ctx, T.x - 52, 80, T.x + 52, 180, [[0, '#ffe08a'], [0.5, '#f0a83a'], [1, '#b0601a']]), 5);
  ctx.save();
  ellipse(ctx, T.x, 128, 52, 52);
  ctx.clip();
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(T.x + Math.cos(a) * 60, 128 + Math.sin(a) * 60);
    ctx.lineTo(T.x - Math.cos(a) * 60, 128 - Math.sin(a) * 60);
    ctx.strokeStyle = rgba(OL, 0.6);
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  for (const [px, py] of [[-20, -18], [16, 10], [-8, 26], [24, -22]]) {
    ellipse(ctx, T.x + px, 128 + py, 9, 9);
    ctx.fillStyle = '#c0302a';
    ctx.fill();
  }
  ctx.restore();
  ellipse(ctx, T.x, 128, 76, 16, -0.25);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.strokeStyle = '#ffd86a';
  ctx.lineWidth = 4;
  ctx.stroke();
  void G;
  fogBand(ctx, r, 600, 60, '#f0a070', 0.18, 20);
  // mid rooftops: brick and stone towers with water tanks and lit windows
  tower(ctx, r, -20, 300, 360, 720, '#6a4a5e', '#ffd88a', 0.45);
  waterTank(ctx, 140, 360, 1);
  tower(ctx, r, 300, 240, 430, 720, '#5a5070', '#ffe2a0', 0.35);
  tower(ctx, r, 1500, 220, 400, 720, '#634a66', '#ffd88a', 0.4);
  tower(ctx, r, 1700, 260, 330, 720, '#55456a', '#ffe8b0', 0.35);
  waterTank(ctx, 1830, 330, 0.9);
  // rooftop billboard: METROPIZZA in red neon on a riveted frame
  const S = MP.sign;
  ctx.beginPath();
  ctx.rect(S.x - 240, S.y - 70, 480, 120);
  fillOl(ctx, lgrad(ctx, 0, S.y - 70, 0, S.y + 50, [[0, '#2a1a2e'], [1, '#160e1a']]), 5);
  for (let x = S.x - 220; x <= S.x + 220; x += 40) rivet(ctx, x, S.y - 58, 4, '#8a8090');
  for (const lx of [-180, 180]) {
    ctx.beginPath();
    ctx.rect(S.x + lx - 8, S.y + 50, 16, 120);
    fillOl(ctx, cylH(ctx, S.x + lx - 8, 16, '#5a5262'), 3);
  }
  neonText(ctx, 'METROPIZZA', S.x, S.y - 8, 74, BLOCK, '#ff4a4a');
  neonText(ctx, 'HOT SLICES · SINCE 1938', S.x, S.y + 34, 22, BLOCK, '#ffd86a');
  // the searchlight lamp on the right roof (its beam sweeps in play)
  const L = MP.lamp;
  ctx.beginPath();
  ctx.rect(L.x - 40, L.y, 80, 120);
  fillOl(ctx, cylH(ctx, L.x - 40, 80, '#5a5e6a'), 4);
  ellipse(ctx, L.x, L.y, 58, 26);
  fillOl(ctx, '#c8ccd4', 5);
  ellipse(ctx, L.x, L.y, 44, 18);
  ctx.fillStyle = '#fff8d8';
  ctx.fill();
  glow(ctx, L.x, L.y, 140, '#fff4c0', 0.5);
  laneCalm(ctx, 0.12, 60, 640, '#0a0820');
  // near parapet: a brick ledge across the back of the roof
  ctx.beginPath();
  ctx.rect(0, 640, W, TY - 640);
  fillOl(ctx, lgrad(ctx, 0, 640, 0, TY, [[0, '#9a4a3a'], [1, '#5a2a24']]), 4);
  ctx.save();
  clipRect(ctx, 0, 650, W, TY - 650);
  for (let y = 650, row = 0; y < TY; y += 22, row++) {
    ctx.fillStyle = rgba('#2a1010', 0.35);
    ctx.fillRect(0, y, W, 3);
    for (let x = (row % 2) * 36; x < W; x += 72) ctx.fillRect(x, y, 3, 22);
  }
  benDay(ctx, 0, 650, W, TY - 650, '#1a0a0a', 0.4, 12, 0.05, 0.3);
  ctx.restore();
  ctx.beginPath();
  ctx.rect(-10, 628, W + 20, 20);
  fillOl(ctx, lgrad(ctx, 0, 628, 0, 648, [[0, '#d8c8b0'], [1, '#9a8a70']]), 4);
  // rooftop clutter on the ledge: a vent hood and a pigeon-proof spike row
  for (const vx of [220, 1460]) {
    ctx.beginPath();
    ctx.rect(vx - 30, 560, 60, 70);
    fillOl(ctx, cylH(ctx, vx - 30, 60, '#8a909a'), 4);
    ellipse(ctx, vx, 560, 44, 14);
    fillOl(ctx, '#a8adb6', 4);
  }
  // red-and-yellow comic checker cloth on the table, with a printed dot shade
  checkerTop(ctx, 0.2, '#f2c230', '#d8322e', MP.front);
  ctx.save();
  clipRect(ctx, 0, TY, W, MP.front - TY);
  benDay(ctx, 0, TY, W, MP.front - TY, '#2a1810', 0.22, 12, 0.32, 0.04);
  ctx.restore();
  frontFace(ctx, MP.front, () => {
    vgrad(ctx, 0, MP.front, W, H - MP.front, [[0, '#d8322e'], [1, '#8a1a1a']]);
    benDay(ctx, 0, MP.front, W, H - MP.front, '#2a0808', 0.4, 10, 0.1, 0.35);
  });
  contactShadow(ctx, 0.5);
  glow(ctx, 1240, 860, 900, '#ffb070', 0.06, 0.3);
  tableLight(ctx, '#ffd8a0', 0.05, 0.4);
  vignette(ctx, 0.55, '#0a0820', 0.4);
}

// ---------------------------------------------------------------------------------------------
// The Doom Lab

const DL = {
  vault: { x: 960, y: 330, r: 210 },
  vats: [260, 1660],
  coils: [520, 1400],
  front: 1040,
};

function vat(ctx: Ctx, r: R, x: number, base: number, liquid: string): void {
  const top = base - 380;
  // steel base and cap
  ctx.beginPath();
  ctx.rect(x - 92, base - 40, 184, 40);
  fillOl(ctx, cylH(ctx, x - 92, 184, '#4a5058'), 4);
  ctx.beginPath();
  ctx.rect(x - 92, top - 30, 184, 34);
  fillOl(ctx, cylH(ctx, x - 92, 184, '#4a5058'), 4);
  // glass tube with glowing liquid
  ctx.beginPath();
  ctx.rect(x - 78, top, 156, base - 40 - top);
  ctx.fillStyle = lgrad(ctx, x - 78, 0, x + 78, 0, [[0, shade(liquid, -0.45)], [0.35, liquid], [0.55, shade(liquid, 0.35)], [1, shade(liquid, -0.5)]]);
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 26; i++) {
    const bx = x - 60 + r() * 120;
    const by = top + 20 + r() * (base - 80 - top);
    ellipse(ctx, bx, by, 3 + r() * 8, 3 + r() * 8);
    ctx.strokeStyle = rgba('#ffffff', 0.5);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // something floating inside: the silhouette of a spare boot (the lab's experiments)
  ctx.fillStyle = rgba('#0a1a10', 0.4);
  ctx.beginPath();
  ctx.ellipse(x, top + 170, 34, 60, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 14, top + 60, 28, 70);
  ctx.restore();
  ctx.beginPath();
  ctx.rect(x - 78, top, 156, base - 40 - top);
  outline(ctx, 5);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(x - 60, top + 10, 12, base - 70 - top);
  glow(ctx, x, (top + base) / 2, 260, liquid, 0.3);
}

function coil(ctx: Ctx, x: number, base: number): void {
  // a Tesla coil: stacked rings narrowing to a copper ball
  ctx.beginPath();
  ctx.rect(x - 50, base - 50, 100, 50);
  fillOl(ctx, cylH(ctx, x - 50, 100, '#3e4248'), 4);
  for (let i = 0; i < 9; i++) {
    const y = base - 60 - i * 24;
    const w = 34 - i * 1.6;
    ctx.beginPath();
    ctx.rect(x - w, y - 16, w * 2, 18);
    fillOl(ctx, cylH(ctx, x - w, w * 2, '#c87a3a'), 3);
  }
  ellipse(ctx, x, base - 300, 46, 46);
  fillOl(ctx, lgrad(ctx, x - 46, base - 346, x + 46, base - 254, [[0, '#e8f0ff'], [0.5, '#9aa3b0'], [1, '#4a5058']]), 5);
  glow(ctx, x, base - 300, 160, '#9ae8ff', 0.45);
}

function drawDoomLab(ctx: Ctx, r: R): void {
  // riveted steel bulkhead walls
  vgrad(ctx, 0, 0, W, TY, [
    [0, '#1a1e26'],
    [0.6, '#2a3038'],
    [1, '#20242c'],
  ]);
  for (let y = 0; y < TY; y += 120) {
    for (let x = (y / 120) % 2 ? -110 : 0; x < W; x += 220) {
      ctx.beginPath();
      ctx.rect(x + 4, y + 4, 212, 112);
      ctx.fillStyle = lgrad(ctx, x, y, x + 220, y + 120, [[0, '#3a424c'], [1, '#262c34']]);
      ctx.fill();
      ctx.strokeStyle = rgba(OL, 0.8);
      ctx.lineWidth = 3;
      ctx.stroke();
      for (const [rx, ry] of [[14, 14], [202, 14], [14, 106], [202, 106]]) rivet(ctx, x + rx, y + ry, 4, '#7a828c');
    }
  }
  benDay(ctx, 0, 0, W, TY, '#000000', 0.35, 14, 0.32, 0.05);
  // pipes along the ceiling
  for (const [y, col] of [[60, '#5a6a3a'], [96, '#7a3a2a']] as const) {
    ctx.beginPath();
    ctx.rect(-10, y, W + 20, 26);
    fillOl(ctx, cylV(ctx, y, 26, col), 4);
    for (let x = 140; x < W; x += 320) {
      ctx.beginPath();
      ctx.rect(x, y - 4, 18, 34);
      fillOl(ctx, '#8a909a', 3);
    }
  }
  // the vault door: a huge round hatch with a skull-boot emblem
  const V = DL.vault;
  glow(ctx, V.x, V.y, V.r * 1.8, '#3dff7a', 0.18);
  ellipse(ctx, V.x, V.y, V.r + 26, V.r + 26);
  fillOl(ctx, lgrad(ctx, V.x - V.r, V.y - V.r, V.x + V.r, V.y + V.r, [[0, '#6a727c'], [1, '#2a2e34']]), 6);
  ellipse(ctx, V.x, V.y, V.r, V.r);
  fillOl(ctx, lgrad(ctx, V.x - V.r, V.y - V.r, V.x + V.r, V.y + V.r, [[0, '#8a929c'], [0.5, '#5a626c'], [1, '#30343a']]), 5);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    rivet(ctx, V.x + Math.cos(a) * (V.r + 13), V.y + Math.sin(a) * (V.r + 13), 6, '#9aa3ac');
  }
  // hazard ring and the emblem: a stomping boot over a cracked pizza
  ctx.save();
  ellipse(ctx, V.x, V.y, V.r - 30, V.r - 30);
  ctx.clip();
  hazard(ctx, V.x - V.r, V.y - V.r, V.r * 2, V.r * 2, 30);
  ctx.restore();
  ellipse(ctx, V.x, V.y, V.r - 62, V.r - 62);
  fillOl(ctx, '#1e2228', 5);
  ctx.beginPath();
  ctx.moveTo(V.x - 50, V.y - 70);
  ctx.lineTo(V.x + 30, V.y - 70);
  ctx.lineTo(V.x + 34, V.y + 10);
  ctx.quadraticCurveTo(V.x + 70, V.y + 20, V.x + 70, V.y + 50);
  ctx.lineTo(V.x - 56, V.y + 50);
  ctx.closePath();
  fillOl(ctx, '#3dff7a', 4);
  ctx.beginPath();
  ctx.arc(V.x, V.y + 86, 60, Math.PI * 1.1, Math.PI * 1.9);
  ctx.strokeStyle = '#3dff7a';
  ctx.lineWidth = 8;
  ctx.stroke();
  // vats of glowing goo and the Tesla coils
  vat(ctx, r, DL.vats[0], 700, '#3dff7a');
  vat(ctx, r, DL.vats[1], 700, '#ff3dd0');
  for (const x of DL.coils) coil(ctx, x, 700);
  // a monitor bank over the vault's shoulders
  for (const [mx, my] of [[700, 150], [1220, 150]] as const) {
    roundRect(ctx, mx - 80, my - 50, 160, 100, 10);
    fillOl(ctx, '#14181e', 5);
    roundRect(ctx, mx - 68, my - 40, 136, 80, 6);
    ctx.fillStyle = '#0a2a14';
    ctx.fill();
    ctx.strokeStyle = '#3dff7a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= 136; x += 8) ctx.lineTo(mx - 68 + x, my + Math.sin(x * 0.15 + mx) * 18);
    ctx.stroke();
  }
  laneCalm(ctx, 0.2, 60, 640, '#000000');
  // lab bench back: a hazard-striped kick plate
  hazard(ctx, 0, 690, W, 26, 30);
  ctx.beginPath();
  ctx.rect(0, 716, W, TY - 716);
  fillOl(ctx, lgrad(ctx, 0, 716, 0, TY, [[0, '#4a525c'], [1, '#2a2e34']]), 4);
  // diamond-plate steel bench top
  const f = DL.front;
  ctx.save();
  clipRect(ctx, 0, TY, W, f - TY + 4);
  vgrad(ctx, 0, TY, W, f - TY, [[0, '#4a525c'], [0.5, '#7a828c'], [1, '#9aa2ac']]);
  bandsX(ctx, 0.14, 0.008, 0, 'rgba(255,255,255,0.12)', f);
  for (let i = 0; i < 520; i++) {
    const x = r() * W;
    const y = TY + 6 + r() * (f - TY - 10);
    const s = 0.4 + ((y - TY) / (f - TY)) * 0.8;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.6);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(-7 * s, -1.5 * s, 14 * s, 3 * s);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(-7 * s, 1.5 * s, 14 * s, 1.5 * s);
    ctx.restore();
  }
  void zFront;
  ctx.restore();
  frontFace(ctx, f, () => {
    vgrad(ctx, 0, f, W, H - f, [[0, '#5a626c'], [1, '#2a2e34']]);
    hazard(ctx, 0, f + 10, W, 18, 24);
  });
  contactShadow(ctx, 0.55);
  glow(ctx, DL.vats[0], 860, 520, '#3dff7a', 0.08, 0.3);
  glow(ctx, DL.vats[1], 860, 520, '#ff3dd0', 0.08, 0.3);
  tableLight(ctx, '#c8ffe0', 0.04, 0.45);
  vignette(ctx, 0.7, '#020604', 0.45);
}

// ---------------------------------------------------------------------------------------------
// Downtown Ruins (Doomstomp)

const DR = {
  front: 1040,
  fires: [
    { x: 300, y: 430 },
    { x: 1580, y: 380 },
    { x: 980, y: 560 },
  ],
};

function drawRuins(ctx: Ctx, r: R): void {
  // a red night sky under smoke, printed
  vgrad(ctx, 0, 0, W, 640, [
    [0, '#1a0a14'],
    [0.5, '#5a1a1e'],
    [1, '#c8482a'],
  ]);
  benDay(ctx, 0, 0, W, 640, '#ff8a4a', 0.22, 18, 0.02, 0.3);
  speedLines(ctx, 960, 700, 300, 1400, 70, '#ffb070', 0.06, r);
  // broken skyline: towers with bites taken out of them
  ctx.save();
  skyline(ctx, r, 620, 160, 380, 80, 170, '#2a1418', 0.08, '#ff9a4a', 0);
  ctx.restore();
  for (const [x, w, top] of [[120, 260, 300], [520, 200, 360], [1240, 240, 280], [1560, 280, 330]] as const) {
    tower(ctx, r, x, w, top, 700, '#3a2a30', '#ffb060', 0.12);
    // a ragged smashed corner
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5, top - 12);
    ctx.lineTo(x + w * 0.62, top + 40);
    ctx.lineTo(x + w * 0.78, top + 20);
    ctx.lineTo(x + w * 0.9, top + 90);
    ctx.lineTo(x + w + 12, top + 60);
    ctx.lineTo(x + w + 12, top - 12);
    ctx.closePath();
    ctx.fillStyle = '#5a1a1e';
    ctx.fill();
  }
  // fires in the buildings
  for (const fp of DR.fires) {
    glow(ctx, fp.x, fp.y, 260, '#ff6a1a', 0.5);
    flame(ctx, fp.x, fp.y + 40, 120, 170, r, ['#ff3a1a', '#ff9a2a', '#ffe68a']);
  }
  fogBand(ctx, r, 520, 160, '#1a0a0a', 0.35, 30);
  // street level: a toppled lamp post, a squashed taxi and a fire hydrant
  ctx.beginPath();
  ctx.rect(0, 600, W, TY - 600);
  fillOl(ctx, lgrad(ctx, 0, 600, 0, TY, [[0, '#3a3034'], [1, '#1a1418']]), 4);
  // giant cracks across the street
  ctx.strokeStyle = '#0a0608';
  ctx.lineWidth = 6;
  for (let i = 0; i < 6; i++) {
    let x = 200 + r() * 1500;
    let y = 610;
    ctx.beginPath();
    ctx.moveTo(x, y);
    while (y < TY) {
      x += (r() - 0.5) * 80;
      y += 20 + r() * 30;
      ctx.lineTo(x, Math.min(y, TY));
    }
    ctx.stroke();
  }
  // the taxi, crushed flat under a giant bootprint
  ctx.save();
  ctx.translate(1420, 690);
  ctx.rotate(-0.08);
  roundRect(ctx, -170, -40, 340, 70, 18);
  fillOl(ctx, lgrad(ctx, 0, -40, 0, 30, [[0, '#ffd23f'], [1, '#c89a1a']]), 5);
  ctx.fillStyle = '#2a1810';
  for (let x = -150; x < 160; x += 40) ctx.fillRect(x, -6, 20, 10);
  for (const wx of [-110, 110]) {
    ellipse(ctx, wx, 30, 34, 22);
    fillOl(ctx, '#1a1a1e', 4);
  }
  roundRect(ctx, -40, -62, 80, 24, 6);
  fillOl(ctx, '#f4f2ec', 4);
  ctx.restore();
  // the lamp post bent double
  ctx.beginPath();
  ctx.moveTo(400, 720);
  ctx.lineTo(420, 520);
  ctx.quadraticCurveTo(440, 470, 520, 500);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 16;
  ctx.stroke();
  ctx.strokeStyle = '#4a5262';
  ctx.lineWidth = 9;
  ctx.stroke();
  ellipse(ctx, 530, 512, 26, 14, 0.4);
  fillOl(ctx, '#ffe6a0', 4);
  glow(ctx, 530, 512, 100, '#ffe6a0', 0.35);
  laneCalm(ctx, 0.18, 60, 640, '#0a0204');
  // table: a cracked concrete slab that landed in the street
  stoneTop(ctx, r, DR.front, '#8a8488', 0.9);
  stoneFront(ctx, r, DR.front, '#6a6468');
  ctx.save();
  clipRect(ctx, 0, TY, W, DR.front - TY);
  benDay(ctx, 0, TY, W, DR.front - TY, '#2a0a0a', 0.25, 12, 0.3, 0.05);
  ctx.restore();
  contactShadow(ctx, 0.55);
  glow(ctx, 960, 880, 900, '#ff6a2a', 0.1, 0.3);
  tableLight(ctx, '#ffb080', 0.05, 0.45);
  vignette(ctx, 0.7, '#140404', 0.45);
}

// ---------------------------------------------------------------------------------------------
// Titan's Throne (Thanfoot)

const TT = {
  planet: { x: 1450, y: 210, r: 120 },
  throne: { x: 960, y: 420 },
  front: 1040,
};

function drawThrone(ctx: Ctx, r: R): void {
  // a violet-orange cosmic sky with a ringed planet
  vgrad(ctx, 0, 0, W, 700, [
    [0, '#120a2a'],
    [0.5, '#4a1a5a'],
    [0.85, '#c8502a'],
    [1, '#f0a050'],
  ]);
  benDay(ctx, 0, 0, W, 420, '#ff9ad8', 0.16, 18, 0.02, 0.25);
  stars(ctx, r, 0, 0, W, 420, 160, 0.9);
  const P = TT.planet;
  glow(ctx, P.x, P.y, P.r * 2.6, '#ff9a6a', 0.3);
  ellipse(ctx, P.x, P.y, P.r, P.r);
  fillOl(ctx, lgrad(ctx, P.x - P.r, P.y - P.r, P.x + P.r, P.y + P.r, [[0, '#ffcf8a'], [0.5, '#d86a3a'], [1, '#5a1a2a']]), 5);
  ctx.save();
  ellipse(ctx, P.x, P.y, P.r, P.r);
  ctx.clip();
  for (let k = -3; k <= 3; k++) {
    ctx.fillStyle = rgba(k % 2 ? '#ffe0b0' : '#7a2a2a', 0.25);
    ctx.fillRect(P.x - P.r, P.y + k * 30 - 8, P.r * 2, 14);
  }
  ctx.restore();
  ellipse(ctx, P.x, P.y + 6, P.r * 1.9, P.r * 0.34, -0.2);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 12;
  ctx.stroke();
  ctx.strokeStyle = '#ffd8a0';
  ctx.lineWidth = 6;
  ctx.stroke();
  // a second small moon
  ellipse(ctx, 380, 150, 40, 40);
  fillOl(ctx, lgrad(ctx, 340, 110, 420, 190, [[0, '#c8b8ff'], [1, '#4a3a8a']]), 4);
  speedLines(ctx, TT.throne.x, TT.throne.y, 220, 1300, 64, '#ffd8a0', 0.07, r);
  // jagged far mountains and floating rocks
  ctx.beginPath();
  ctx.moveTo(-20, 640);
  for (let x = -20; x <= W + 40; x += 80) ctx.lineTo(x, 520 + Math.sin(x * 0.013) * 60 - r() * 70);
  ctx.lineTo(W + 20, 700);
  ctx.lineTo(-20, 700);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, 440, 0, 700, [[0, '#5a2a5a'], [1, '#2a1030']]), 4);
  for (const [x, y, s] of [[200, 330, 1], [1700, 420, 0.8], [620, 250, 0.6], [1220, 330, 0.5]] as const) {
    ctx.beginPath();
    ctx.moveTo(x - 70 * s, y);
    ctx.lineTo(x + 70 * s, y - 6 * s);
    ctx.lineTo(x + 40 * s, y + 50 * s);
    ctx.lineTo(x + 6 * s, y + 90 * s);
    ctx.lineTo(x - 36 * s, y + 46 * s);
    ctx.closePath();
    fillOl(ctx, lgrad(ctx, x - 70 * s, y, x + 70 * s, y + 90 * s, [[0, '#9a7a9a'], [1, '#3a2040']]), 4);
    ctx.fillStyle = '#7ab04a';
    ctx.fillRect(x - 66 * s, y - 6 * s, 132 * s, 8 * s);
  }
  // the throne: a towering carved seat of gold and purple stone, flanked by braziers
  const T = TT.throne;
  glow(ctx, T.x, T.y, 420, '#ffcf6a', 0.25);
  ctx.beginPath();
  ctx.moveTo(T.x - 230, 700);
  ctx.lineTo(T.x - 200, T.y - 60);
  ctx.lineTo(T.x - 140, T.y - 200);
  ctx.lineTo(T.x - 60, T.y - 280);
  ctx.lineTo(T.x, T.y - 330);
  ctx.lineTo(T.x + 60, T.y - 280);
  ctx.lineTo(T.x + 140, T.y - 200);
  ctx.lineTo(T.x + 200, T.y - 60);
  ctx.lineTo(T.x + 230, 700);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, T.x - 230, 0, T.x + 230, 0, [[0, '#8a6aa8'], [0.5, '#5a3a7a'], [1, '#2a1840']]), 6);
  ctx.beginPath();
  ctx.moveTo(T.x - 120, 700);
  ctx.lineTo(T.x - 110, T.y - 120);
  ctx.quadraticCurveTo(T.x, T.y - 230, T.x + 110, T.y - 120);
  ctx.lineTo(T.x + 120, 700);
  ctx.closePath();
  fillOl(ctx, lgrad(ctx, 0, T.y - 230, 0, 700, [[0, '#ffe08a'], [0.5, '#d89a2a'], [1, '#7a4a10']]), 5);
  // six empty stone niches arching over the seat
  for (let k = 0; k < 6; k++) {
    const a = Math.PI * (1.12 + (k / 5) * 0.76);
    const nx = T.x + Math.cos(a) * 170;
    const ny = T.y - 40 + Math.sin(a) * 170;
    ellipse(ctx, nx, ny, 18, 18);
    fillOl(ctx, '#1a0a20', 4);
  }
  for (const bx of [T.x - 330, T.x + 330]) {
    ctx.beginPath();
    ctx.moveTo(bx - 40, 700);
    ctx.lineTo(bx - 26, 560);
    ctx.lineTo(bx + 26, 560);
    ctx.lineTo(bx + 40, 700);
    ctx.closePath();
    fillOl(ctx, '#4a3060', 4);
    ellipse(ctx, bx, 560, 52, 16);
    fillOl(ctx, '#d89a2a', 4);
    glow(ctx, bx, 520, 160, '#ff7a2a', 0.5);
    flame(ctx, bx, 560, 70, 110, r, ['#ff3a1a', '#ff9a2a', '#ffe68a']);
  }
  laneCalm(ctx, 0.15, 60, 640, '#0a0414');
  // a carved stone dais with gold inlay as the table
  ctx.beginPath();
  ctx.rect(0, 700, W, TY - 700);
  fillOl(ctx, lgrad(ctx, 0, 700, 0, TY, [[0, '#5a3a6a'], [1, '#2a1838']]), 4);
  for (let x = 0; x < W; x += 120) {
    ctx.save();
    starPath(ctx, x + 60, 730, 14, 6, 5);
    ctx.fillStyle = '#d89a2a';
    ctx.fill();
    ctx.restore();
  }
  stoneTop(ctx, r, TT.front, '#7a5a8a', 0.4);
  ctx.save();
  clipRect(ctx, 0, TY, W, TT.front - TY);
  // gold inlay bands receding to the throne
  bandsX(ctx, 0.6, 0.02, 0.3, 'rgba(255,210,110,0.4)', TT.front);
  benDay(ctx, 0, TY, W, TT.front - TY, '#1a0a20', 0.25, 12, 0.3, 0.05);
  ctx.restore();
  stoneFront(ctx, r, TT.front, '#5a3a6a');
  contactShadow(ctx, 0.5);
  glow(ctx, 960, 880, 900, '#ffcf6a', 0.08, 0.3);
  tableLight(ctx, '#ffd8b0', 0.05, 0.4);
  vignette(ctx, 0.6, '#0a0414', 0.4);
  void cone;
  void darkSpot;
  void grainRect;
}

// ---------------------------------------------------------------------------------------------

// (redrawn with the location kit in scene-metropizza.ts; this stays for the before/after page, ?dev&stages)
registerLegacyScene('metropizza', {
  info: {
    name: 'Metropizza Rooftops',
    subtitle: 'Waves 61–64',
    ambient: ['dust'],
    glows: [
      g(MP.sign.x, MP.sign.y - 8, 300, '#ff4a4a', 0.35),
      g(MP.tower.x, 128, 170, '#ffd06a', 0.1),
      g(MP.lamp.x, MP.lamp.y, 160, '#fff4c0', 0.15),
      g(300, 150, 200, '#fff4d8', 0.05),
    ],
    light: '#ffc8a8',
    tableTint: '#fff0e0',
  },
  draw: drawMetropizza,
});

registerScene('doomlab', {
  info: {
    name: 'The Doom Lab',
    subtitle: 'Waves 66–69',
    ambient: ['sparks'],
    glows: [
      g(DL.vats[0], 480, 240, '#3dff7a', 0.35),
      g(DL.vats[1], 480, 240, '#ff3dd0', 0.35),
      ...DL.coils.map((x) => g(x, 400, 150, '#9ae8ff', 0.7)),
      g(DL.vault.x, DL.vault.y, 260, '#3dff7a', 0.2),
    ],
    light: '#b8f0d0',
    tableTint: '#e8fff0',
  },
  draw: drawDoomLab,
});

// (redrawn with the location kit in scene-doomstomp.ts; this stays for the before/after page, ?dev&stages)
registerLegacyScene('doomstomp', {
  info: {
    name: 'Downtown Ruins',
    subtitle: 'Boss: DOOMSTOMP',
    ambient: ['embers', 'fog'],
    glows: DR.fires.map((f) => g(f.x, f.y, 300, '#ff6a1a', 0.6)),
    light: '#ffa080',
    tableTint: '#ffe4d8',
  },
  draw: drawRuins,
});

registerScene('thanfoot', {
  info: {
    name: "Titan's Throne",
    subtitle: 'Boss: THANFOOT',
    ambient: ['stars', 'embers'],
    glows: [
      g(TT.throne.x, TT.throne.y - 100, 360, '#ffcf6a', 0.15),
      g(TT.throne.x - 330, 520, 160, '#ff7a2a', 0.7),
      g(TT.throne.x + 330, 520, 160, '#ff7a2a', 0.7),
      g(TT.planet.x, TT.planet.y, 260, '#ff9a6a', 0.05),
    ],
    light: '#e0b8ff',
    tableTint: '#f4e8ff',
  },
  draw: drawThrone,
});
