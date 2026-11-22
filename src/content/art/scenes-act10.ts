// Act 10 · Finale backdrops: The Oven Between Worlds (stage 19), the Sole Proprietor's office (its boss
// arena), The First Pizzeria (stage 20) and the dawn of time where the Sole Proprietor Unbound waits
// (its arena). The memory-lane flicker, the wall of peels and the dawn creeping up the sky are runtime
// layers in src/game/finale.ts, placed with the FIN layout below.

import type { GlowSpot } from '../../art/backdrops';
import { drawBackdrop } from '../../art/backdrops';
import { registerScene } from '../../art/registry';
import {
  type Ctx,
  type R,
  FOC,
  H,
  OL,
  TY,
  VX,
  W,
  ZB,
  blob,
  clipRect,
  contactShadow,
  darkSpot,
  ellipse,
  fillOl,
  flame,
  fogBand,
  frontFace,
  glow,
  grade,
  grainRect,
  laneCalm,
  lgrad,
  mottle,
  outline,
  range,
  rgba,
  roundRect,
  shade,
  stars,
  stoneFront,
  stoneTop,
  tableLight,
  vgrad,
  vignette,
  xAt,
  yAt,
  zFront,
} from '../../art/sceneKit';

const g = (x: number, y: number, r: number, color: string, flicker: number): GlowSpot => ({ x, y, r, color, flicker });

/** Layout shared with the runtime layers (src/game/finale.ts). */
export const FIN = {
  /** The oven mouth in the Oven Between Worlds: the portal the memories pour out of. */
  portal: { x: VX, y: 420, rx: 330, ry: 300 },
  /** The First Pizzeria's back wall, where the player's peels hang (pegs in rows). */
  wall: { x0: 230, x1: 1400, y0: 450, y1: 740 },
  /** The beehive oven at the First Pizzeria (its mouth glows), in front of the wall's right end. */
  hive: { x: 1665, y: 570, r: 210 },
  front: 1036,
};

// ---------------------------------------------------------------------------------------------
// Shared bits

/** A deep space wash with nebula clouds (the cosmos the finale happens in). */
function cosmos(ctx: Ctx, r: R, cols: [string, string, string], h = TY): void {
  vgrad(ctx, 0, 0, W, h, [
    [0, cols[0]],
    [0.55, cols[1]],
    [1, cols[2]],
  ]);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 26; i++) {
    const x = r() * W;
    const y = r() * h;
    const rad = 120 + r() * 340;
    const c = ['#ff4fd8', '#36e0ff', '#b06bff', '#ff9a4a'][i % 4];
    glow(ctx, x, y, rad, c, 0.06 + r() * 0.08, 0.6 + r() * 0.5);
  }
  ctx.restore();
  stars(ctx, r, 0, 0, W, h, 520, 0.9);
}

/** A swirl of light: spiral arms of a galaxy or a whirlpool of memories. */
function swirl(ctx: Ctx, x: number, y: number, rx: number, ry: number, cols: string[], arms: number, a: number, r: R): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < arms; k++) {
    const off = (k / arms) * Math.PI * 2;
    for (let i = 0; i < 70; i++) {
      const t = i / 70;
      const ang = off + t * Math.PI * 3.2;
      const rad = rx * (0.08 + t * 0.92);
      const px = Math.cos(ang) * rad;
      const py = Math.sin(ang) * rad;
      glow(ctx, px, py, 26 + t * 70, cols[(k + i) % cols.length], a * (1 - t * 0.6) * (0.6 + r() * 0.4));
    }
  }
  ctx.restore();
}

/** A floating kitchen thing, lit from the top left, with an outline. */
function floater(ctx: Ctx, kind: 'spoon' | 'pan' | 'pin' | 'peel' | 'tomato' | 'whisk', x: number, y: number, s: number, rot: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  const lw = 5 / s;
  switch (kind) {
    case 'spoon': {
      roundRect(ctx, -9, -10, 18, 150, 9);
      fillOl(ctx, lgrad(ctx, -9, 0, 9, 0, [[0, '#a8743c'], [0.5, '#d9a066'], [1, '#7a4a22']]), lw);
      ellipse(ctx, 0, -48, 34, 46);
      fillOl(ctx, lgrad(ctx, -34, -90, 34, 0, [[0, '#e0b07a'], [1, '#8a5a2b']]), lw);
      ellipse(ctx, -10, -60, 10, 18, -0.3);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fill();
      break;
    }
    case 'pan': {
      roundRect(ctx, 52, -10, 120, 20, 10);
      fillOl(ctx, '#2a2430', lw);
      ellipse(ctx, 0, 0, 62, 62);
      fillOl(ctx, lgrad(ctx, -62, -62, 62, 62, [[0, '#ffc48a'], [0.4, '#c8743a'], [1, '#6a3414']]), lw);
      ellipse(ctx, 0, 0, 48, 48);
      ctx.fillStyle = 'rgba(40,20,10,0.35)';
      ctx.fill();
      ellipse(ctx, -22, -24, 14, 8, -0.7);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fill();
      break;
    }
    case 'pin': {
      roundRect(ctx, -110, -26, 220, 52, 24);
      fillOl(ctx, lgrad(ctx, 0, -26, 0, 26, [[0, '#f2d0a0'], [0.4, '#d9a066'], [1, '#8a5a2b']]), lw);
      for (const sx of [-1, 1]) {
        roundRect(ctx, sx * 110 - (sx > 0 ? 0 : 50), -11, 50, 22, 10);
        fillOl(ctx, '#7a4a22', lw);
      }
      break;
    }
    case 'peel': {
      roundRect(ctx, -10, 40, 20, 160, 9);
      fillOl(ctx, '#8a5a2b', lw);
      ellipse(ctx, 0, 0, 70, 62);
      fillOl(ctx, lgrad(ctx, -70, -62, 70, 62, [[0, '#f2c88a'], [1, '#a8743c']]), lw);
      break;
    }
    case 'tomato': {
      ellipse(ctx, 0, 0, 52, 46);
      fillOl(ctx, lgrad(ctx, -52, -46, 52, 46, [[0, '#ff8a6a'], [0.5, '#e5242f'], [1, '#8a1018']]), lw);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.moveTo(0, -40);
        ctx.lineTo(Math.cos(a) * 22, -40 + Math.sin(a) * 9);
      }
      ctx.strokeStyle = '#3a8a2a';
      ctx.lineWidth = 7 / s;
      ctx.stroke();
      ellipse(ctx, -18, -16, 12, 8, -0.6);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fill();
      break;
    }
    case 'whisk': {
      roundRect(ctx, -8, 30, 16, 90, 8);
      fillOl(ctx, '#3a3444', lw);
      for (const k of [-1, -0.5, 0, 0.5, 1]) {
        ctx.beginPath();
        ctx.moveTo(-6, 34);
        ctx.bezierCurveTo(-40 * k - 20, -10, -40 * k - 10, -70, 0, -80);
        ctx.bezierCurveTo(40 * k + 10, -70, 40 * k + 20, -10, 6, 34);
        ctx.strokeStyle = OL;
        ctx.lineWidth = 7 / s;
        ctx.stroke();
        ctx.strokeStyle = '#d7dde6';
        ctx.lineWidth = 3 / s;
        ctx.stroke();
      }
      break;
    }
  }
  ctx.restore();
}

/** A countertop of black glass full of stars, with a gold edge (the cosmic kitchen's table). */
function starCounter(ctx: Ctx, r: R, f: number, base: string, gold: string): void {
  const zf = zFront(f);
  ctx.save();
  clipRect(ctx, 0, TY, W, f - TY + 4);
  vgrad(ctx, 0, TY, W, f - TY, [
    [0, shade(base, -0.4)],
    [0.5, base],
    [1, shade(base, 0.15)],
  ]);
  mottle(ctx, 0, TY, W, f - TY, 0.25, 1.2);
  // reflections of the nebula in the glass
  for (let i = 0; i < 10; i++) {
    const x = r() * W;
    const y = TY + r() * (f - TY);
    darkSpot(ctx, x, y, 200 + r() * 300, 40 + r() * 50, 0.14, ['#ff4fd8', '#36e0ff', '#b06bff'][i % 3]);
  }
  // star flecks sunk in the counter, smaller towards the back
  for (let i = 0; i < 260; i++) {
    const X = (r() - 0.5) * 5;
    const z = ZB - r() * (ZB - zf);
    const s = (FOC / z) / 700;
    ctx.fillStyle = rgba('#ffffff', 0.3 + r() * 0.6);
    ctx.fillRect(xAt(X, z), yAt(z), 2.2 * s, 2.2 * s);
  }
  // gold inlay lines running to the vanishing point
  for (const X of [-2, -1, 0, 1, 2]) {
    ctx.strokeStyle = rgba(gold, 0.35);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(xAt(X, ZB), TY);
    ctx.lineTo(xAt(X, zf), f);
    ctx.stroke();
  }
  grainRect(ctx, 0, TY, W, f - TY, 0.2);
  ctx.restore();
  frontFace(ctx, f, () => {
    ctx.fillStyle = lgrad(ctx, 0, f, 0, H, [
      [0, shade(gold, 0.25)],
      [0.18, gold],
      [0.3, shade(gold, -0.45)],
      [1, shade(base, -0.5)],
    ]);
    ctx.fillRect(0, f, W, H - f);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(0, f + 2, W, 3);
  }, 0.35);
}

// ---------------------------------------------------------------------------------------------
// 19. The Oven Between Worlds

function ovenMouth(ctx: Ctx, r: R, inner: () => void): void {
  const { x, y, rx, ry } = FIN.portal;
  // the brick arch of an impossibly big pizza oven, floating in space
  const outerR = rx + 110;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - outerR, TY);
  ctx.lineTo(x - outerR, y);
  ctx.ellipse(x, y, outerR, ry + 110, 0, Math.PI, 0);
  ctx.lineTo(x + outerR, TY);
  ctx.closePath();
  ctx.fillStyle = '#3a1c14';
  ctx.fill();
  ctx.clip();
  // bricks around the arch
  const rows = 4;
  for (let k = 0; k < rows; k++) {
    const r0 = rx + 12 + k * 26;
    const n = 26 + k * 2;
    for (let i = 0; i < n; i++) {
      const a0 = Math.PI + (i / n) * Math.PI;
      const a1 = Math.PI + ((i + 1) / n) * Math.PI;
      ctx.beginPath();
      ctx.ellipse(x, y, r0 + 24, (r0 + 24) * (ry / rx), 0, a0, a1);
      ctx.ellipse(x, y, r0, r0 * (ry / rx), 0, a1, a0, true);
      ctx.closePath();
      const hot = 1 - k / rows;
      fillOl(ctx, shade(['#a8452a', '#b8562e', '#8f3a24'][(i + k) % 3], (r() - 0.5) * 0.2 + hot * 0.1), 3);
    }
  }
  // brick jambs down to the table
  for (const sx of [x - outerR, x + rx + 6]) {
    for (let yy = y; yy < TY; yy += 40) {
      for (let c = 0; c < 4; c++) {
        ctx.beginPath();
        ctx.rect(sx + c * 26 + ((yy / 40) % 2 ? 13 : 0) - 13, yy, 26, 40);
        fillOl(ctx, shade('#9a4028', (r() - 0.5) * 0.25), 3);
      }
    }
  }
  ctx.restore();
  // the mouth itself: where the fire should be, the worlds swirl
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - rx, TY);
  ctx.lineTo(x - rx, y);
  ctx.ellipse(x, y, rx, ry, 0, Math.PI, 0);
  ctx.lineTo(x + rx, TY);
  ctx.closePath();
  ctx.fillStyle = '#0a0418';
  ctx.fill();
  ctx.clip();
  inner();
  ctx.restore();
  // ember glow round the rim
  ctx.beginPath();
  ctx.moveTo(x - rx, TY);
  ctx.lineTo(x - rx, y);
  ctx.ellipse(x, y, rx, ry, 0, Math.PI, 0);
  ctx.lineTo(x + rx, TY);
  ctx.strokeStyle = rgba('#ff9a3a', 0.7);
  ctx.lineWidth = 12;
  ctx.stroke();
  outline(ctx, 6);
  glow(ctx, x, y + 60, rx * 1.5, '#ff7a2a', 0.18, 0.9);
}

function memoryWhirl(ctx: Ctx, r: R): void {
  const { x, y, rx, ry } = FIN.portal;
  vgrad(ctx, x - rx, y - ry, rx * 2, TY - (y - ry), [
    [0, '#1a0a3a'],
    [1, '#2a0a2a'],
  ]);
  swirl(ctx, x, y + 40, rx * 1.1, ry * 0.9, ['#ff4fd8', '#36e0ff', '#ffd23f', '#7be04a', '#ff7a2a'], 5, 0.09, r);
  // shards of earlier places spinning in the whirl (a checker cloth, a neon sign, a snowflake…)
  const bits: [number, number, string][] = [
    [-180, -120, '#c8553d'], [150, -170, '#ff4fa3'], [210, 40, '#cfe9fb'], [-220, 80, '#3fb6c9'], [-40, -230, '#ffd23f'], [60, 150, '#7a4a2b'], [-120, 210, '#a8304f'], [250, -60, '#7be04a'],
  ];
  for (const [dx, dy, col] of bits) {
    ctx.save();
    ctx.translate(x + dx, y + 40 + dy * 0.9);
    ctx.rotate((r() - 0.5) * 1.4);
    const w = 50 + r() * 40;
    const h = 34 + r() * 30;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(w / 2, -h / 2 + 6);
    ctx.lineTo(w / 2 - 8, h / 2);
    ctx.lineTo(-w / 2 + 6, h / 2 - 4);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
  glow(ctx, x, y + 40, 130, '#ffffff', 0.5);
  glow(ctx, x, y + 40, 260, '#b06bff', 0.35);
}

function drawOven(ctx: Ctx, r: R): void {
  cosmos(ctx, r, ['#080418', '#1a0a3a', '#2a1030']);
  // far away, more ovens: a whole galaxy of kitchens
  for (let i = 0; i < 9; i++) {
    const x = 80 + r() * (W - 160);
    const y = 140 + r() * 360;
    if (Math.abs(x - VX) < 520) continue;
    const s = 0.12 + r() * 0.12;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(x, y, 300 * s, 260 * s, 0, Math.PI, 0);
    ctx.lineTo(x + 300 * s, y + 120 * s);
    ctx.lineTo(x - 300 * s, y + 120 * s);
    ctx.closePath();
    ctx.fillStyle = '#5a2a3a';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y + 20 * s, 180 * s, 150 * s, 0, Math.PI, 0);
    ctx.lineTo(x + 180 * s, y + 120 * s);
    ctx.lineTo(x - 180 * s, y + 120 * s);
    ctx.closePath();
    ctx.fillStyle = '#ff9a3a';
    ctx.fill();
    ctx.restore();
    glow(ctx, x, y, 90, '#ff7a2a', 0.2);
  }
  // a cheese moon and a tomato planet
  ellipse(ctx, 250, 220, 90, 90);
  fillOl(ctx, lgrad(ctx, 170, 140, 330, 300, [[0, '#fff2a0'], [0.6, '#f2c84a'], [1, '#a8741a']]), 6);
  for (let i = 0; i < 7; i++) {
    ellipse(ctx, 210 + r() * 90, 180 + r() * 90, 6 + r() * 10, 5 + r() * 8);
    ctx.fillStyle = 'rgba(160,110,30,0.55)';
    ctx.fill();
  }
  glow(ctx, 250, 220, 220, '#fff2a0', 0.15);
  floater(ctx, 'tomato', 1690, 190, 1.2, 0.3);
  // the floating cosmic kitchen: worktops of stone drifting either side
  for (const [x0, x1, y] of [[0, 430, 600], [1490, W, 600]] as [number, number, number][]) {
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y - 20);
    ctx.lineTo(x1 - 20, y + 60);
    ctx.lineTo(x0, y + 80);
    ctx.closePath();
    fillOl(ctx, lgrad(ctx, 0, y - 20, 0, y + 80, [[0, '#6a5a8a'], [1, '#2a2040']]), 6);
    // jars and crocks on it
    for (let i = 0; i < 4; i++) {
      const jx = x0 + 60 + i * ((x1 - x0 - 120) / 3);
      const jh = 70 + r() * 60;
      roundRect(ctx, jx - 28, y - jh, 56, jh, 14);
      fillOl(ctx, lgrad(ctx, jx - 28, 0, jx + 28, 0, [[0, '#3a6a8a'], [0.5, '#7ac8e8'], [1, '#2a4a6a']]), 5);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(jx - 18, y - jh + 10, 8, jh - 24);
      roundRect(ctx, jx - 32, y - jh - 14, 64, 18, 8);
      fillOl(ctx, '#8a5a2b', 4);
    }
  }
  // kitchen things orbiting the oven
  floater(ctx, 'spoon', 420, 330, 1.1, -0.7);
  floater(ctx, 'pan', 1520, 360, 1.0, 0.5);
  floater(ctx, 'pin', 600, 150, 0.9, 0.25);
  floater(ctx, 'peel', 1320, 140, 0.8, -0.4);
  floater(ctx, 'whisk', 160, 480, 0.9, 0.6);
  floater(ctx, 'spoon', 1790, 470, 0.8, 0.9);
  ovenMouth(ctx, r, () => memoryWhirl(ctx, r));
  // drifting flour dust and sparks
  fogBand(ctx, r, 700, 120, '#b06bff', 0.12, 24);
  laneCalm(ctx, 0.25, 60, 620, '#05020c');
  starCounter(ctx, r, FIN.front, '#1a1430', '#ffd23f');
  contactShadow(ctx, 0.6);
  tableLight(ctx, '#ffb070', 0.08, 0.5);
  vignette(ctx, 0.85, '#05020c', 0.6);
}

// ---------------------------------------------------------------------------------------------
// The Sole Proprietor's office (wave 95)

function frame(ctx: Ctx, x: number, y: number, w: number, h: number, pic: HTMLCanvasElement | null): void {
  roundRect(ctx, x - 16, y - 16, w + 32, h + 32, 6);
  fillOl(ctx, lgrad(ctx, x, y - 16, x + w, y + h + 16, [[0, '#fff4b0'], [0.4, '#ffd23f'], [1, '#8a5a10']]), 5);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (pic) ctx.drawImage(pic, 0, 0, pic.width, pic.height, x, y, w, h);
  else {
    ctx.fillStyle = '#3a2a50';
    ctx.fillRect(x, y, w, h);
  }
  // varnish and a SOLD tag across the corner
  ctx.fillStyle = 'rgba(40,20,0,0.25)';
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.strokeStyle = OL;
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, w, h);
  ctx.save();
  ctx.translate(x + w - 30, y + 26);
  ctx.rotate(0.5);
  roundRect(ctx, -46, -14, 92, 28, 6);
  fillOl(ctx, '#e5242f', 3);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px "Impact", "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SOLD', 0, 1);
  ctx.restore();
}

/** Small copies of earlier places for the portraits on his wall (drawn once, then cached). */
let portraitCache: HTMLCanvasElement[] | null = null;
function portraits(): HTMLCanvasElement[] {
  if (portraitCache) return portraitCache;
  portraitCache = (['trattoria', 'diner', 'space', 'cellar'] as const).map((id) => {
    const big = drawBackdrop(id);
    const c = document.createElement('canvas');
    c.width = 384;
    c.height = 216;
    c.getContext('2d')!.drawImage(big, 0, 0, 384, 216);
    return c;
  });
  return portraitCache;
}

function drawOffice(ctx: Ctx, r: R): void {
  // a hall at the heart of the oven: dark violet panelling, gold pilasters, a window onto the cosmos
  vgrad(ctx, 0, 0, W, TY, [
    [0, '#140a24'],
    [1, '#2a1440'],
  ]);
  // panelling
  for (let x = 0; x < W; x += 160) {
    roundRect(ctx, x + 14, 470, 132, 260, 8);
    fillOl(ctx, lgrad(ctx, x, 470, x, 730, [[0, '#3a2058'], [1, '#22103a']]), 4);
    roundRect(ctx, x + 30, 490, 100, 220, 6);
    ctx.strokeStyle = rgba('#ffd23f', 0.35);
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // the great round window: a galaxy shaped like a pizza, his biggest acquisition
  const wx = VX;
  const wy = 330;
  const wr = 250;
  ctx.save();
  ellipse(ctx, wx, wy, wr, wr);
  ctx.clip();
  cosmos(ctx, r, ['#05020c', '#140a30', '#2a0a3a'], H);
  swirl(ctx, wx, wy, wr * 0.9, wr * 0.9, ['#ffd23f', '#ff7a2a', '#e5242f', '#fff2a0'], 8, 0.07, r);
  glow(ctx, wx, wy, 90, '#fff2a0', 0.6);
  // the galaxy is cut into eight slices
  ctx.strokeStyle = 'rgba(255,240,200,0.35)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr);
    ctx.stroke();
  }
  ctx.restore();
  for (const [rr, lw, col] of [[wr + 30, 30, '#8a5a10'], [wr + 18, 18, '#ffd23f'], [wr + 6, 6, '#fff4b0']] as [number, number, string][]) {
    ellipse(ctx, wx, wy, rr, rr);
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  ellipse(ctx, wx, wy, wr + 46, wr + 46);
  outline(ctx, 6);
  // window spokes
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    ctx.beginPath();
    ctx.moveTo(wx + Math.cos(a) * 40, wy + Math.sin(a) * 40);
    ctx.lineTo(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr);
    ctx.strokeStyle = OL;
    ctx.lineWidth = 16;
    ctx.stroke();
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 8;
    ctx.stroke();
  }
  // gold pilasters
  for (const x of [180, 560, 1360, 1740]) {
    roundRect(ctx, x - 34, 60, 68, TY - 60, 10);
    fillOl(ctx, lgrad(ctx, x - 34, 0, x + 34, 0, [[0, '#6a4210'], [0.35, '#ffd23f'], [0.5, '#fff4b0'], [1, '#6a4210']]), 5);
    for (let y = 100; y < TY; y += 120) {
      ctx.fillStyle = 'rgba(80,40,0,0.35)';
      ctx.fillRect(x - 22, y, 44, 6);
    }
  }
  // the pizzerias he owns, framed and stamped SOLD
  const pics = portraits();
  frame(ctx, 260, 170, 220, 124, pics[0]);
  frame(ctx, 260, 360, 220, 124, pics[1]);
  frame(ctx, 1440, 170, 220, 124, pics[2]);
  frame(ctx, 1440, 360, 220, 124, pics[3]);
  // coin heaps against the panelling
  for (const [cx, n] of [[110, 26], [1810, 26]] as [number, number][]) {
    for (let i = 0; i < n; i++) {
      const k = i / n;
      const x = cx + (r() - 0.5) * 220 * (1 - k * 0.6);
      const y = TY - 6 - k * 90 - r() * 10;
      ellipse(ctx, x, y, 22, 8);
      fillOl(ctx, lgrad(ctx, x, y - 8, x, y + 8, [[0, '#fff4b0'], [1, '#b07a10']]), 3);
    }
    glow(ctx, cx, TY - 50, 160, '#ffd23f', 0.15);
  }
  // a velvet rope and a brass sign: PRIVATE · OWNER ONLY
  ctx.save();
  roundRect(ctx, VX - 240, 640, 480, 70, 12);
  fillOl(ctx, lgrad(ctx, 0, 640, 0, 710, [[0, '#fff4b0'], [1, '#b07a10']]), 5);
  ctx.fillStyle = '#3a1c0a';
  ctx.font = 'bold 34px "Rockwell", "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('OWNER · EVERY WORLD', VX, 676);
  ctx.restore();
  laneCalm(ctx, 0.3, 60, 620, '#05020c');
  starCounter(ctx, r, FIN.front, '#120a1c', '#ffd23f');
  contactShadow(ctx, 0.6);
  tableLight(ctx, '#ffd890', 0.1, 0.45);
  grade(ctx, 0.05, '#e8d0ff', 0.12);
  vignette(ctx, 0.85, '#05020c', 0.6);
}

// ---------------------------------------------------------------------------------------------
// 20. The First Pizzeria

/** The night sky at the dawn of time: a huge Milky Way. `torn` opens a rift for the final fight. */
function dawnSky(ctx: Ctx, r: R, torn: boolean): void {
  vgrad(ctx, 0, 0, W, TY, [
    [0, '#05061a'],
    [0.55, '#14183a'],
    [0.85, torn ? '#4a1a3a' : '#3a2a4a'],
    [1, torn ? '#ff8a4a' : '#d8805a'],
  ]);
  stars(ctx, r, 0, 0, W, 520, 700, 1);
  // the Milky Way: a band of dust and light across the sky
  ctx.save();
  ctx.translate(VX, 240);
  ctx.rotate(-0.28);
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 90; i++) {
    const x = (r() - 0.5) * 2400;
    const y = (r() - 0.5) * 120 * (1 - Math.abs(x) / 1400);
    glow(ctx, x, y, 60 + r() * 120, ['#b8c8ff', '#ffd8f0', '#fff2c8'][i % 3], 0.05 + r() * 0.06, 0.5);
  }
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 260; i++) {
    const x = (r() - 0.5) * 2400;
    const y = (r() - 0.5) * 100;
    ctx.fillStyle = rgba('#ffffff', 0.4 + r() * 0.6);
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  // dark dust lanes
  for (let i = 0; i < 12; i++) darkSpot(ctx, (r() - 0.5) * 2000, (r() - 0.5) * 30, 120 + r() * 160, 14 + r() * 12, 0.35, '#05061a');
  ctx.restore();
  if (torn) {
    // the sky splits open: the Sole Proprietor has come through
    ctx.save();
    ctx.beginPath();
    const pts: [number, number][] = [[VX - 40, 0], [VX + 30, 70], [VX - 30, 150], [VX + 50, 240], [VX - 10, 330], [VX + 20, 420]];
    ctx.moveTo(pts[0][0] - 60, 0);
    for (const [x, y] of pts) ctx.lineTo(x - 50 * (1 - y / 420), y);
    for (const [x, y] of [...pts].reverse()) ctx.lineTo(x + 50 * (1 - y / 420), y);
    ctx.closePath();
    ctx.fillStyle = lgrad(ctx, 0, 0, 0, 420, [[0, '#ffffff'], [0.4, '#ffe28a'], [1, '#ff4fd8']]);
    ctx.fill();
    ctx.restore();
    glow(ctx, VX, 200, 520, '#ff4fd8', 0.28, 1.2);
    glow(ctx, VX, 200, 260, '#ffe28a', 0.4, 1.4);
    swirl(ctx, VX, 160, 700, 220, ['#ff4fd8', '#b06bff', '#ffd23f'], 3, 0.05, r);
  } else {
    // a low crescent moon (there's only one, and it's new)
    ellipse(ctx, 1640, 170, 54, 54);
    ctx.fillStyle = '#fff6dc';
    ctx.fill();
    ellipse(ctx, 1664, 160, 50, 52);
    ctx.fillStyle = '#0a0b22';
    ctx.fill();
    glow(ctx, 1630, 175, 200, '#9fb8ff', 0.18);
  }
}

/** Rolling primeval hills, a smoking volcano and standing stones on the skyline. */
function primeval(ctx: Ctx, r: R, torn: boolean): void {
  // the volcano, far off, glowing
  range(ctx, 560, [[380, 560], [560, 400], [610, 360], [660, 366], [700, 404], [900, 560]], lgrad(ctx, 0, 360, 0, 560, [[0, '#3a2440'], [1, '#2a1a30']]));
  glow(ctx, 635, 370, 110, '#ff7a2a', torn ? 0.6 : 0.4);
  for (let i = 0; i < 9; i++) darkSpot(ctx, 630 + i * 22 + r() * 20, 330 - i * 30, 50 + i * 10, 26 + i * 6, 0.25, '#2a2030');
  range(ctx, 620, [[-20, 620], [120, 520], [340, 480], [520, 530], [760, 500], [1040, 470], [1260, 510], [1500, 470], [1760, 520], [1940, 500], [1940, 620]], '#1e1a34');
  range(ctx, 700, [[-20, 700], [200, 600], [460, 580], [760, 620], [1100, 590], [1400, 610], [1700, 580], [1940, 600], [1940, 700]], '#161428');
  // standing stones on the ridge
  for (const [x, h, w] of [[140, 120, 46], [230, 90, 40], [1780, 130, 50], [1860, 96, 40]] as [number, number, number][]) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2, 610);
    ctx.lineTo(x - w / 2 + 6, 610 - h);
    ctx.quadraticCurveTo(x, 610 - h - 14, x + w / 2 - 4, 610 - h + 4);
    ctx.lineTo(x + w / 2, 610);
    ctx.closePath();
    fillOl(ctx, lgrad(ctx, x - w / 2, 0, x + w / 2, 0, [[0, '#4a4660'], [1, '#22203a']]), 4);
  }
}

/** The dry-stone wall behind the table, where the player's peels hang. */
function peelWall(ctx: Ctx, r: R): void {
  const { x0, x1, y0, y1 } = FIN.wall;
  const left = x0 - 110;
  const right = x1 + 260;
  const top = y0 - 16;
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, right - left, y1 + 30 - top);
  ctx.fillStyle = '#1e1a28';
  ctx.fill();
  ctx.clip();
  // big flat dry stones in courses, each lit from the top left; thin dark joints, no heavy outlines
  for (let y = top + 22, row = 0; y < y1 + 30; y += 46, row++) {
    let x = left - (row % 2) * 50 - r() * 30;
    while (x < right) {
      const w = 90 + r() * 70;
      const h = 40 + r() * 6;
      roundRect(ctx, x + 2, y + 2, w - 4, h - 4, 10);
      const base = shade('#4a4258', (r() - 0.5) * 0.14 - ((y - y0) / (y1 - y0)) * 0.12);
      ctx.fillStyle = lgrad(ctx, x, y, x + w * 0.4, y + h, [[0, shade(base, 0.22)], [0.5, base], [1, shade(base, -0.3)]]);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(10,6,16,0.75)';
      ctx.stroke();
      x += w;
    }
  }
  grainRect(ctx, left, top, right - left, y1 + 30 - top, 0.25);
  ctx.restore();
  // capstones along the top
  for (let x = left; x < right; x += 120) {
    roundRect(ctx, x, top - 22, 124, 30, 12);
    fillOl(ctx, lgrad(ctx, 0, top - 22, 0, top + 8, [[0, '#7a7088'], [1, '#3e3850']]), 4);
  }
  // the pegs and the peels on them are a runtime layer (finale.ts): every player's wall is their own
  darkSpot(ctx, (x0 + x1) / 2, y1, (x1 - x0) * 0.6, 60, 0.4);
}

/** The first oven ever built: a beehive of stacked stones, fire in its mouth, smoke to the stars. */
function beehive(ctx: Ctx, r: R, blaze: number): void {
  const { x, y, r: rad } = FIN.hive;
  // smoke rising to the stars
  for (let i = 0; i < 14; i++) {
    darkSpot(ctx, x - 20 + i * 10 + Math.sin(i) * 30, y - rad - 40 - i * 34, 40 + i * 8, 22 + i * 5, 0.18, '#6a6080');
  }
  ctx.beginPath();
  ctx.moveTo(x - rad, y + 180);
  ctx.bezierCurveTo(x - rad, y - rad * 0.7, x - rad * 0.55, y - rad, x, y - rad);
  ctx.bezierCurveTo(x + rad * 0.55, y - rad, x + rad, y - rad * 0.7, x + rad, y + 180);
  ctx.closePath();
  ctx.save();
  ctx.fillStyle = '#4a3a3a';
  ctx.fill();
  ctx.clip();
  for (let yy = y - rad; yy < y + 190; yy += 30) {
    let xx = x - rad - r() * 30;
    while (xx < x + rad + 30) {
      const w = 40 + r() * 34;
      blob(ctx, xx + w / 2, yy + 14, w / 2, 0.2, r, 8);
      fillOl(ctx, lgrad(ctx, xx, yy, xx + w, yy + 30, [[0, shade('#8a6a5a', (r() - 0.5) * 0.15)], [1, shade('#4a3632', 0)]]), 3);
      xx += w + 2;
    }
  }
  // firelight on the dome from inside the mouth
  glow(ctx, x, y + 110, rad * 1.1, '#ff7a2a', 0.25 * blaze);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(x - rad, y + 180);
  ctx.bezierCurveTo(x - rad, y - rad * 0.7, x - rad * 0.55, y - rad, x, y - rad);
  ctx.bezierCurveTo(x + rad * 0.55, y - rad, x + rad, y - rad * 0.7, x + rad, y + 180);
  outline(ctx, 6);
  // the mouth and its fire
  const mw = rad * 0.55;
  const my = y + 60;
  ctx.beginPath();
  ctx.moveTo(x - mw, y + 180);
  ctx.lineTo(x - mw, my);
  ctx.arc(x, my, mw, Math.PI, 0);
  ctx.lineTo(x + mw, y + 180);
  ctx.closePath();
  ctx.fillStyle = '#1a0804';
  ctx.fill();
  outline(ctx, 6);
  ctx.save();
  ctx.clip();
  glow(ctx, x, y + 170, mw * 1.6, '#ff9a3a', 0.8 * blaze);
  flame(ctx, x - 40, y + 178, 70, 130 * blaze, r, ['#ff5a1f', '#ffb347', '#fff2a0']);
  flame(ctx, x + 30, y + 178, 60, 110 * blaze, r, ['#ff5a1f', '#ffb347', '#fff2a0']);
  flame(ctx, x, y + 178, 80, 160 * blaze, r, ['#ff5a1f', '#ffd23f', '#ffffff']);
  ctx.restore();
  glow(ctx, x, y + 150, 300, '#ff7a2a', 0.22 * blaze);
}

/** A rough slab table on stone legs. */
function slabTable(ctx: Ctx, r: R): void {
  stoneTop(ctx, r, FIN.front, '#8a7a6a', 0.7);
  // flour dusted across the slab, and a few hand-shaped loaves of dough
  ctx.save();
  clipRect(ctx, 0, TY, W, FIN.front - TY);
  for (let i = 0; i < 18; i++) {
    const X = (r() - 0.5) * 4;
    const z = ZB - r() * 1.4;
    darkSpot(ctx, xAt(X, z), yAt(z), 60 + r() * 80, 10 + r() * 10, 0.16, '#fff8e8');
  }
  ctx.restore();
  stoneFront(ctx, r, FIN.front, '#6a5a4a');
}

function drawFirstPizzeria(ctx: Ctx, r: R): void {
  dawnSky(ctx, r, false);
  primeval(ctx, r, false);
  peelWall(ctx, r);
  beehive(ctx, r, 1);
  // a wood pile by the oven
  for (let i = 0; i < 7; i++) {
    const x = 1410 + (i % 4) * 34;
    const y = 742 - Math.floor(i / 4) * 30;
    ellipse(ctx, x, y, 18, 14);
    fillOl(ctx, '#7a4a22', 4);
    ellipse(ctx, x, y, 9, 7);
    ctx.fillStyle = '#c8945a';
    ctx.fill();
  }
  // fireflies of the first night (static ones; more drift at runtime)
  for (let i = 0; i < 30; i++) glow(ctx, r() * W, 520 + r() * 220, 10 + r() * 10, '#fff2a0', 0.3 + r() * 0.4);
  laneCalm(ctx, 0.2, 60, 600, '#05061a');
  slabTable(ctx, r);
  contactShadow(ctx, 0.6);
  tableLight(ctx, '#ffb070', 0.14, 0.45);
  vignette(ctx, 0.8, '#05040c', 0.55);
}

function drawDawnOfTime(ctx: Ctx, r: R): void {
  dawnSky(ctx, r, true);
  primeval(ctx, r, true);
  peelWall(ctx, r);
  beehive(ctx, r, 1.35);
  // the standing stones glow with his power
  for (const x of [140, 230, 1780, 1860]) glow(ctx, x, 560, 90, '#ff4fd8', 0.25);
  // floating rocks pulled up off the ground
  for (let i = 0; i < 12; i++) {
    const x = r() * W;
    const y = 120 + r() * 400;
    if (Math.abs(x - VX) < 200) continue;
    blob(ctx, x, y, 12 + r() * 26, 0.35, r, 7);
    fillOl(ctx, lgrad(ctx, x - 20, y - 20, x + 20, y + 20, [[0, '#7a6a8a'], [1, '#2a2440']]), 4);
    glow(ctx, x, y + 20, 30, '#ff4fd8', 0.2);
  }
  laneCalm(ctx, 0.22, 60, 600, '#05061a');
  slabTable(ctx, r);
  contactShadow(ctx, 0.6);
  tableLight(ctx, '#ffc8f0', 0.12, 0.5);
  vignette(ctx, 0.85, '#08040c', 0.6);
}

// ---------------------------------------------------------------------------------------------

registerScene('oven', {
  info: {
    name: 'The Oven Between Worlds',
    subtitle: 'Waves 91–94',
    ambient: ['stars', 'sparks'],
    glows: [g(FIN.portal.x, FIN.portal.y + 60, 380, '#b06bff', 0.45), g(FIN.portal.x, FIN.portal.y + 60, 200, '#ffffff', 0.3), g(250, 220, 160, '#fff2a0', 0.15), g(FIN.portal.x, 700, 300, '#ff7a2a', 0.5)],
    light: '#e0c8ff',
    tableTint: '#f0e8ff',
  },
  draw: drawOven,
});

registerScene('soleprop', {
  info: {
    name: "The Proprietor's Office",
    subtitle: 'Wave 95',
    ambient: ['dust', 'stars'],
    glows: [g(VX, 330, 300, '#ffd23f', 0.25), g(110, 700, 160, '#ffd23f', 0.2), g(1810, 700, 160, '#ffd23f', 0.2)],
    light: '#f0d8ff',
    tableTint: '#f4ecff',
  },
  draw: drawOffice,
});

registerScene('firstpizzeria', {
  info: {
    name: 'The First Pizzeria',
    subtitle: 'Waves 96–99',
    ambient: ['fireflies', 'embers'],
    glows: [g(FIN.hive.x, FIN.hive.y + 170, 260, '#ff8a3a', 0.8), g(FIN.hive.x, FIN.hive.y + 120, 420, '#ff7a2a', 0.5), g(635, 370, 120, '#ff7a2a', 0.4)],
    light: '#ffd8b8',
    tableTint: '#fff0e0',
  },
  draw: drawFirstPizzeria,
});

registerScene('soleunbound', {
  info: {
    name: 'The Dawn of Time',
    subtitle: 'Wave 100',
    ambient: ['embers', 'stars'],
    glows: [g(VX, 200, 420, '#ff4fd8', 0.35), g(VX, 160, 200, '#ffe28a', 0.4), g(FIN.hive.x, FIN.hive.y + 170, 280, '#ff8a3a', 0.85)],
    light: '#ffd0f0',
    tableTint: '#fff0f8',
  },
  draw: drawDawnOfTime,
});
