// Procedural sprites for Feetza 2.0: trait badges, wave-event flyers and chests, and boss props.
// Same bold cartoon style as the rest of the game: thick ink outlines, gradients, highlights.

import { TRAIT_INFO, type FootTrait } from '../data/feet';
import { type Ctx, ellipse, makeCanvas, rgba, roundRect, shade } from './util';

const INK = '#2a1810';

function stroke(ctx: Ctx, lw = 4, col = INK): void {
  ctx.lineWidth = lw;
  ctx.strokeStyle = col;
  ctx.stroke();
}

function shine(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.55, rot = -0.5): void {
  ellipse(ctx, x, y, rx, ry, rot);
  ctx.fillStyle = rgba('#ffffff', a);
  ctx.fill();
}

function lin(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function rad(ctx: Ctx, x: number, y: number, r: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

/** A cream badge with the trait's glyph: shown on a foot's cuff so its ability is visible up front. */
function badge(glyph: string): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(48, 48);
  ctx.beginPath();
  ctx.arc(24, 25, 20, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(42,24,16,0.45)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(24, 23, 20, 0, Math.PI * 2);
  ctx.fillStyle = rad(ctx, 24, 23, 20, [[0, '#ffffff'], [1, '#fbe7c2']]);
  ctx.fill();
  stroke(ctx, 3.5);
  ctx.font = '24px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, 24, 25);
  return c;
}

function balloon(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(120, 200);
  ctx.beginPath();
  ctx.moveTo(60, 118);
  ctx.bezierCurveTo(50, 140, 70, 160, 58, 196);
  stroke(ctx, 2.5, '#6a4a3a');
  ctx.beginPath();
  ctx.ellipse(60, 62, 46, 56, 0, 0, Math.PI * 2);
  ctx.fillStyle = rad(ctx, 60, 62, 60, [[0, '#ff8a7a'], [0.6, '#e5402a'], [1, '#a8261a']]);
  ctx.fill();
  stroke(ctx, 5);
  ctx.beginPath();
  ctx.moveTo(52, 116);
  ctx.lineTo(68, 116);
  ctx.lineTo(60, 128);
  ctx.closePath();
  ctx.fillStyle = '#a8261a';
  ctx.fill();
  stroke(ctx, 3);
  shine(ctx, 42, 38, 12, 20, 0.6);
  // coin emblem
  ctx.beginPath();
  ctx.arc(60, 66, 18, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
  stroke(ctx, 3);
  ctx.font = 'bold 20px "Lilita One", sans-serif';
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', 60, 67);
  return c;
}

function drone(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(220, 150);
  // rotors
  for (const x of [34, 186]) {
    ctx.beginPath();
    ctx.ellipse(x, 22, 30, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(220,230,240,0.55)';
    ctx.fill();
    stroke(ctx, 2.5);
    ctx.beginPath();
    ctx.moveTo(x, 22);
    ctx.lineTo(x, 44);
    stroke(ctx, 5);
  }
  // arms + body
  ctx.beginPath();
  ctx.moveTo(34, 44);
  ctx.lineTo(186, 44);
  stroke(ctx, 9);
  ctx.beginPath();
  ctx.moveTo(34, 44);
  ctx.lineTo(186, 44);
  stroke(ctx, 4, '#8a909a');
  roundRect(ctx, 70, 30, 80, 34, 14);
  ctx.fillStyle = lin(ctx, 0, 30, 0, 64, [[0, '#d8dee6'], [1, '#6f7680']]);
  ctx.fill();
  stroke(ctx, 4.5);
  ctx.beginPath();
  ctx.arc(110, 47, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#4cf0e0';
  ctx.fill();
  stroke(ctx, 2.5);
  // cables + parcel
  ctx.beginPath();
  ctx.moveTo(90, 64);
  ctx.lineTo(80, 86);
  ctx.moveTo(130, 64);
  ctx.lineTo(140, 86);
  stroke(ctx, 3);
  roundRect(ctx, 66, 84, 88, 58, 8);
  ctx.fillStyle = lin(ctx, 0, 84, 0, 142, [[0, '#fffaf0'], [1, '#e8d4ae']]);
  ctx.fill();
  stroke(ctx, 4.5);
  ctx.beginPath();
  ctx.moveTo(110, 96);
  ctx.lineTo(110, 130);
  ctx.moveTo(93, 113);
  ctx.lineTo(127, 113);
  stroke(ctx, 9, '#3f9a2e');
  return c;
}

function moth(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(160, 120);
  for (const sx of [-1, 1]) {
    ctx.save();
    ctx.translate(80, 60);
    ctx.scale(sx, 1);
    ctx.beginPath();
    ctx.moveTo(4, -6);
    ctx.bezierCurveTo(40, -58, 78, -44, 72, -8);
    ctx.bezierCurveTo(70, 8, 40, 14, 6, 6);
    ctx.fillStyle = lin(ctx, 0, -50, 0, 10, [[0, '#ff6a3d'], [1, '#c92a1a']]);
    ctx.fill();
    stroke(ctx, 4);
    ctx.beginPath();
    ctx.moveTo(6, 8);
    ctx.bezierCurveTo(36, 18, 56, 40, 34, 50);
    ctx.bezierCurveTo(18, 54, 8, 32, 4, 14);
    ctx.fillStyle = '#ffb02e';
    ctx.fill();
    stroke(ctx, 4);
    ctx.beginPath();
    ctx.arc(44, -18, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe680';
    ctx.fill();
    stroke(ctx, 2.5);
    ctx.restore();
  }
  ellipse(ctx, 80, 62, 9, 26);
  ctx.fillStyle = '#4a2a1a';
  ctx.fill();
  stroke(ctx, 3.5);
  ctx.beginPath();
  ctx.moveTo(76, 38);
  ctx.quadraticCurveTo(66, 18, 58, 16);
  ctx.moveTo(84, 38);
  ctx.quadraticCurveTo(94, 18, 102, 16);
  stroke(ctx, 2.5);
  return c;
}

function seagull(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(220, 130);
  // wings
  ctx.beginPath();
  ctx.moveTo(110, 66);
  ctx.bezierCurveTo(80, 20, 40, 18, 6, 34);
  ctx.bezierCurveTo(40, 40, 70, 56, 96, 80);
  ctx.closePath();
  ctx.moveTo(110, 66);
  ctx.bezierCurveTo(140, 20, 180, 18, 214, 34);
  ctx.bezierCurveTo(180, 40, 150, 56, 124, 80);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 18, 0, 80, [[0, '#ffffff'], [1, '#c8d2dc']]);
  ctx.fill();
  stroke(ctx, 4);
  ctx.beginPath();
  ctx.moveTo(6, 34);
  ctx.bezierCurveTo(24, 30, 34, 30, 44, 34);
  ctx.moveTo(214, 34);
  ctx.bezierCurveTo(196, 30, 186, 30, 176, 34);
  stroke(ctx, 7, '#3a3e44');
  ellipse(ctx, 112, 78, 30, 20);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  stroke(ctx, 4);
  ctx.beginPath();
  ctx.arc(136, 70, 14, 0, Math.PI * 2);
  ctx.fill();
  stroke(ctx, 4);
  ctx.beginPath();
  ctx.moveTo(146, 72);
  ctx.lineTo(166, 76);
  ctx.lineTo(146, 80);
  ctx.fillStyle = '#ffb02e';
  ctx.fill();
  stroke(ctx, 3);
  ctx.beginPath();
  ctx.arc(140, 67, 3, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();
  // golden crust in its beak
  ctx.beginPath();
  ctx.moveTo(160, 78);
  ctx.lineTo(184, 70);
  ctx.lineTo(176, 96);
  ctx.closePath();
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
  stroke(ctx, 3);
  shine(ctx, 172, 78, 3, 6, 0.8, 0);
  return c;
}

function pizzaBox(open: number, teeth = false): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(220, 170);
  const top = 70;
  // lid
  ctx.save();
  ctx.translate(20, top);
  ctx.rotate(-open);
  roundRect(ctx, 0, -26, 180, 26, 6);
  ctx.fillStyle = lin(ctx, 0, -26, 0, 0, [[0, '#ff6a4d'], [1, '#c92a1a']]);
  ctx.fill();
  stroke(ctx, 5);
  ctx.font = 'bold 15px "Lilita One", sans-serif';
  ctx.fillStyle = '#fff6e2';
  ctx.textAlign = 'center';
  ctx.fillText('PIZZA', 90, -8);
  ctx.restore();
  // body
  roundRect(ctx, 20, top, 180, 80, 8);
  ctx.fillStyle = lin(ctx, 0, top, 0, top + 80, [[0, '#f8ecd2'], [1, '#d8bf92']]);
  ctx.fill();
  stroke(ctx, 5);
  for (let x = 40; x < 190; x += 22) {
    ctx.beginPath();
    ctx.moveTo(x, top + 8);
    ctx.lineTo(x - 6, top + 72);
    ctx.strokeStyle = rgba('#a07a48', 0.35);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(20, top + 40);
  ctx.lineTo(200, top + 40);
  ctx.strokeStyle = rgba('#e5402a', 0.85);
  ctx.lineWidth = 10;
  ctx.stroke();
  if (open > 0.05) {
    ctx.beginPath();
    ctx.ellipse(110, top + 2, 76, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = teeth ? '#3a0a0a' : '#ffd23f';
    ctx.fill();
    stroke(ctx, 3);
    if (teeth) {
      ctx.fillStyle = '#ffffff';
      for (let x = 44; x < 176; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, top - 4);
        ctx.lineTo(x + 8, top + 8);
        ctx.lineTo(x + 16, top - 4);
        ctx.fill();
      }
    } else {
      for (let i = 0; i < 9; i++) shine(ctx, 50 + i * 14, top - 2 + (i % 2) * 4, 5, 3, 0.9, 0);
    }
  }
  return c;
}

function slipper(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(150, 80);
  ctx.beginPath();
  ctx.ellipse(75, 44, 66, 28, 0, 0, Math.PI * 2);
  ctx.fillStyle = lin(ctx, 0, 16, 0, 72, [[0, '#ff9ad8'], [1, '#c2387e']]);
  ctx.fill();
  stroke(ctx, 5);
  ctx.beginPath();
  ctx.ellipse(52, 36, 34, 16, 0, Math.PI, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  stroke(ctx, 4);
  shine(ctx, 110, 34, 14, 6, 0.5, 0);
  return c;
}

function spoon(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(60, 260);
  roundRect(ctx, 24, 70, 12, 184, 6);
  ctx.fillStyle = lin(ctx, 24, 0, 36, 0, [[0, '#e0a868'], [1, '#9a6430']]);
  ctx.fill();
  stroke(ctx, 4);
  ctx.beginPath();
  ctx.ellipse(30, 42, 24, 38, 0, 0, Math.PI * 2);
  ctx.fillStyle = rad(ctx, 30, 42, 40, [[0, '#f0c088'], [1, '#a86a34']]);
  ctx.fill();
  stroke(ctx, 5);
  return c;
}

function tray(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(220, 70);
  ctx.beginPath();
  ctx.ellipse(110, 40, 100, 22, 0, 0, Math.PI * 2);
  ctx.fillStyle = lin(ctx, 0, 18, 0, 62, [[0, '#ffffff'], [0.5, '#c7ccd4'], [1, '#7f868f']]);
  ctx.fill();
  stroke(ctx, 5);
  ctx.beginPath();
  ctx.ellipse(110, 36, 80, 14, 0, 0, Math.PI * 2);
  ctx.strokeStyle = rgba('#ffffff', 0.7);
  ctx.lineWidth = 3;
  ctx.stroke();
  return c;
}

function pie(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(140, 90);
  ctx.beginPath();
  ctx.moveTo(10, 50);
  ctx.lineTo(130, 50);
  ctx.lineTo(118, 80);
  ctx.lineTo(22, 80);
  ctx.closePath();
  ctx.fillStyle = '#d9963f';
  ctx.fill();
  stroke(ctx, 4);
  ctx.beginPath();
  ctx.moveTo(8, 52);
  for (let x = 8; x <= 132; x += 18) ctx.quadraticCurveTo(x + 9, 6, x + 18, 52);
  ctx.closePath();
  ctx.fillStyle = '#fffaf0';
  ctx.fill();
  stroke(ctx, 4);
  ctx.beginPath();
  ctx.arc(70, 22, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#e5402a';
  ctx.fill();
  stroke(ctx, 3);
  return c;
}

function splatBlob(color: string, dark: string, size = 520): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(size, size);
  const cx = size / 2;
  ctx.beginPath();
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = size * (0.32 + ((i * 7919) % 13) / 13 * 0.12);
    const x = cx + Math.cos(a) * r;
    const y = cx + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.quadraticCurveTo(cx + Math.cos(a - 0.2) * r * 1.25, cx + Math.sin(a - 0.2) * r * 1.25, x, y);
  }
  ctx.fillStyle = rad(ctx, cx, cx, size * 0.45, [[0, color], [1, dark]]);
  ctx.fill();
  stroke(ctx, 8);
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * size * 0.44, cx + Math.sin(a) * size * 0.44, size * 0.035, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    stroke(ctx, 4);
  }
  shine(ctx, cx - size * 0.12, cx - size * 0.14, size * 0.09, size * 0.05, 0.55);
  return c;
}

function tentacle(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(120, 360);
  ctx.beginPath();
  ctx.moveTo(40, 360);
  ctx.bezierCurveTo(10, 250, 100, 180, 60, 90);
  ctx.bezierCurveTo(48, 50, 64, 18, 84, 10);
  ctx.bezierCurveTo(84, 40, 84, 70, 92, 100);
  ctx.bezierCurveTo(118, 200, 50, 260, 86, 360);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 0, 120, 0, [[0, '#7a3aa8'], [1, '#b46ad8']]);
  ctx.fill();
  stroke(ctx, 5);
  for (let i = 0; i < 7; i++) {
    const y = 120 + i * 32;
    ellipse(ctx, 70 - Math.sin(i) * 12, y, 9, 7);
    ctx.fillStyle = '#f0c8f0';
    ctx.fill();
    stroke(ctx, 2.5);
  }
  return c;
}

function snowball(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(80, 80);
  ctx.beginPath();
  ctx.arc(40, 40, 32, 0, Math.PI * 2);
  ctx.fillStyle = rad(ctx, 40, 40, 34, [[0, '#ffffff'], [1, '#a8c8e8']]);
  ctx.fill();
  stroke(ctx, 4.5);
  shine(ctx, 30, 28, 10, 6, 0.8);
  return c;
}

function reticle(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(180, 180);
  for (const [r, w] of [[70, 8], [40, 5]] as const) {
    ctx.beginPath();
    ctx.arc(90, 90, r, 0, Math.PI * 2);
    stroke(ctx, w + 4);
    ctx.beginPath();
    ctx.arc(90, 90, r, 0, Math.PI * 2);
    stroke(ctx, w, '#ff4a2a');
  }
  for (const [x0, y0, x1, y1] of [[90, 4, 90, 40], [90, 140, 90, 176], [4, 90, 40, 90], [140, 90, 176, 90]]) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    stroke(ctx, 12);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    stroke(ctx, 7, '#ff4a2a');
  }
  return c;
}

function blackHole(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(260, 260);
  const g = ctx.createRadialGradient(130, 130, 10, 130, 130, 128);
  g.addColorStop(0, '#000000');
  g.addColorStop(0.35, '#120428');
  g.addColorStop(0.6, 'rgba(120,60,220,0.8)');
  g.addColorStop(1, 'rgba(120,60,220,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 260, 260);
  ctx.strokeStyle = 'rgba(200,170,255,0.8)';
  ctx.lineWidth = 4;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    for (let t = 0; t < 1; t += 0.02) {
      const a = t * Math.PI * 2.4 + (i * Math.PI) / 2;
      const r = 20 + t * 100;
      const x = 130 + Math.cos(a) * r;
      const y = 130 + Math.sin(a) * r * 0.7;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return c;
}

function piston(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(90, 400);
  roundRect(ctx, 26, 0, 38, 400, 6);
  ctx.fillStyle = lin(ctx, 26, 0, 64, 0, [[0, '#6f7680'], [0.45, '#eef2f6'], [1, '#5f6670']]);
  ctx.fill();
  stroke(ctx, 5);
  for (let y = 40; y < 400; y += 60) {
    roundRect(ctx, 18, y, 54, 14, 4);
    ctx.fillStyle = '#4a4f58';
    ctx.fill();
    stroke(ctx, 3);
  }
  return c;
}

function valve(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(70, 70);
  ctx.beginPath();
  ctx.arc(35, 35, 28, 0, Math.PI * 2);
  ctx.fillStyle = rad(ctx, 35, 35, 30, [[0, '#ffe680'], [1, '#ff8a1a']]);
  ctx.fill();
  stroke(ctx, 4.5);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + 0.4;
    ctx.beginPath();
    ctx.moveTo(35, 35);
    ctx.lineTo(35 + Math.cos(a) * 26, 35 + Math.sin(a) * 26);
    stroke(ctx, 6);
  }
  ctx.beginPath();
  ctx.arc(35, 35, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#c92a1a';
  ctx.fill();
  stroke(ctx, 3);
  return c;
}

function wheels(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(240, 60);
  roundRect(ctx, 20, 4, 200, 16, 6);
  ctx.fillStyle = '#5f6670';
  ctx.fill();
  stroke(ctx, 4);
  for (const x of [52, 188]) {
    ctx.beginPath();
    ctx.arc(x, 36, 20, 0, Math.PI * 2);
    ctx.fillStyle = rad(ctx, x, 36, 22, [[0, '#8afff2'], [1, '#18a8b8']]);
    ctx.fill();
    stroke(ctx, 4.5);
    ctx.beginPath();
    ctx.arc(x, 36, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    stroke(ctx, 2.5);
  }
  return c;
}

function cloudPuff(col: string, dark: string): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(300, 200);
  const blobs: [number, number, number][] = [[90, 120, 60], [150, 90, 72], [214, 118, 58], [150, 140, 64]];
  for (const [x, y, r] of blobs) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = rad(ctx, x, y, r, [[0, col], [1, dark]]);
    ctx.fill();
  }
  return c;
}

function sandWall(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(200, 120);
  ctx.beginPath();
  ctx.moveTo(4, 120);
  ctx.lineTo(10, 40);
  for (let x = 10; x < 190; x += 30) {
    ctx.lineTo(x, 20);
    ctx.lineTo(x + 15, 20);
    ctx.lineTo(x + 15, 40);
    ctx.lineTo(x + 30, 40);
  }
  ctx.lineTo(196, 120);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 20, 0, 120, [[0, '#f8dca0'], [1, '#c8a060']]);
  ctx.fill();
  stroke(ctx, 5);
  return c;
}

function beam(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(200, 400);
  const g = ctx.createLinearGradient(0, 0, 0, 400);
  g.addColorStop(0, 'rgba(160,255,140,0.75)');
  g.addColorStop(1, 'rgba(160,255,140,0.15)');
  ctx.beginPath();
  ctx.moveTo(80, 0);
  ctx.lineTo(120, 0);
  ctx.lineTo(196, 400);
  ctx.lineTo(4, 400);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  return c;
}

function plateDisc(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(120, 60);
  ellipse(ctx, 60, 30, 54, 22);
  ctx.fillStyle = lin(ctx, 0, 8, 0, 52, [[0, '#ffffff'], [1, '#c8ccd8']]);
  ctx.fill();
  stroke(ctx, 4.5);
  ellipse(ctx, 60, 28, 34, 12);
  stroke(ctx, 2.5, rgba('#8090a0', 0.8));
  return c;
}

function ticket(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(90, 110);
  ctx.beginPath();
  ctx.moveTo(8, 8);
  ctx.lineTo(82, 8);
  ctx.lineTo(82, 96);
  for (let x = 82; x > 8; x -= 10) ctx.lineTo(x - 5, x % 20 ? 104 : 96);
  ctx.closePath();
  ctx.fillStyle = '#fffaf0';
  ctx.fill();
  stroke(ctx, 4);
  ctx.font = 'bold 14px "Lilita One", sans-serif';
  ctx.fillStyle = '#a8261a';
  ctx.textAlign = 'center';
  ctx.fillText('ORDER!', 45, 32);
  for (let y = 48; y < 90; y += 12) {
    ctx.beginPath();
    ctx.moveTo(18, y);
    ctx.lineTo(70, y);
    ctx.strokeStyle = rgba('#2a1810', 0.4);
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  return c;
}

function crustCoin(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(52, 52);
  ctx.beginPath();
  ctx.moveTo(6, 18);
  ctx.quadraticCurveTo(26, 2, 46, 18);
  ctx.lineTo(26, 48);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 4, 0, 48, [[0, '#fff0a0'], [1, '#e0a020']]);
  ctx.fill();
  stroke(ctx, 3.5);
  ctx.beginPath();
  ctx.moveTo(7, 18);
  ctx.quadraticCurveTo(26, 4, 45, 18);
  stroke(ctx, 5, '#d9963f');
  shine(ctx, 20, 20, 4, 3, 0.8, 0);
  return c;
}

export function buildEventSprites(): Record<string, HTMLCanvasElement> {
  const out: Record<string, HTMLCanvasElement> = {
    ev_balloon: balloon(),
    ev_drone: drone(),
    ev_moth: moth(),
    ev_seagull: seagull(),
    ev_chest: pizzaBox(0),
    ev_chest_open: pizzaBox(0.9),
    ev_mimic: pizzaBox(0.25, true),
    crust_coin: crustCoin(),
    p_slipper: slipper(),
    p_spoon: spoon(),
    p_tray: tray(),
    p_pie: pie(),
    p_cream: splatBlob('#fffaf0', '#e8dcc0'),
    p_ink: splatBlob('#3a2a5a', '#120a24'),
    p_tentacle: tentacle(),
    p_snowball: snowball(),
    p_reticle: reticle(),
    p_blackhole: blackHole(),
    p_piston: piston(),
    p_valve: valve(),
    p_wheels: wheels(),
    p_soot: cloudPuff('#4a4a50', 'rgba(30,30,34,0)'),
    p_steam: cloudPuff('#ffffff', 'rgba(255,255,255,0)'),
    p_dough: splatBlob('#f6e6c4', '#d8bf92', 140),
    p_sand: sandWall(),
    p_beam: beam(),
    p_plate: plateDisc(),
    p_ticket: ticket(),
    p_ketchup: splatBlob('#e5402a', '#8a1a10', 200),
  };
  for (const [t, label] of Object.entries(TRAIT_INFO) as [FootTrait, string][]) {
    const glyph = [...label][0] === ' ' ? '?' : label.split(' ')[0];
    out[`trait_${t}`] = badge(glyph);
  }
  return out;
}

export { shade };
