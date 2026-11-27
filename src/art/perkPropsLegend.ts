// Sprites for the pizza plan's first Legendaries (src/content/pizzas/p8.ts), Act 1's: Nonna's wooden ladle (her swat
// on the first stomp of a wave), the Head Waiter's silver tray (skimming the table, batting the divers back up), and
// The First Bake's oven mouth (its breath across the table). Drawn once on canvases in the game's style
// (src/art/perkProps.ts): a dark outline, soft gradients, one light from the top left, a sheen.

import { ellipse, makeCanvas, rgba, rng } from './util';

const INK = '#2a1810';

/** Nonna's ladle: olive wood, long and worn, its bowl deep and full of her ragù, a drip hanging off its lip and a
 *  leather loop through its handle. Drawn upright, the bowl at the top; its pivot (the grip) is at the bottom. */
export function drawLadle(): HTMLCanvasElement {
  const W = 150;
  const H = 420;
  const [c, ctx] = makeCanvas(W, H);
  const cx = W / 2;
  const r = rng(1301);
  // the handle: a long tapering stick, thicker at the grip, its grain running down it
  const hTop = 118;
  const hBot = H - 14;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - 9, hTop);
  ctx.bezierCurveTo(cx - 10, hTop + 120, cx - 13, hBot - 90, cx - 15, hBot - 18);
  ctx.quadraticCurveTo(cx, hBot + 8, cx + 15, hBot - 18);
  ctx.bezierCurveTo(cx + 13, hBot - 90, cx + 10, hTop + 120, cx + 9, hTop);
  ctx.closePath();
  const wood = ctx.createLinearGradient(cx - 15, 0, cx + 15, 0);
  wood.addColorStop(0, '#6a3c18');
  wood.addColorStop(0.3, '#b47a3e');
  wood.addColorStop(0.55, '#d8a362');
  wood.addColorStop(0.8, '#a06a32');
  wood.addColorStop(1, '#5a3214');
  ctx.fillStyle = wood;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.clip();
  // the grain: long wavy lines, a knot near the grip
  for (let i = 0; i < 9; i++) {
    const x0 = cx - 11 + i * 2.6 + (r() - 0.5) * 1.5;
    ctx.beginPath();
    ctx.moveTo(x0, hTop);
    for (let y = hTop; y < hBot; y += 24) ctx.lineTo(x0 + Math.sin(y * 0.03 + i) * 1.4 + (y - hTop) * (i < 4 ? -0.012 : 0.012), y);
    ctx.strokeStyle = rgba(i % 3 ? '#7a4a20' : '#f0c890', i % 3 ? 0.35 : 0.3);
    ctx.lineWidth = i % 3 ? 1.1 : 0.8;
    ctx.stroke();
  }
  ellipse(ctx, cx + 3, hBot - 92, 4, 7, 0.2);
  ctx.fillStyle = rgba('#5a3012', 0.7);
  ctx.fill();
  ctx.strokeStyle = rgba('#f0c890', 0.5);
  ctx.lineWidth = 1;
  ctx.stroke();
  // worn smooth and dark where her hand holds it
  const grip = ctx.createLinearGradient(0, hBot - 80, 0, hBot);
  grip.addColorStop(0, 'rgba(60,30,10,0)');
  grip.addColorStop(1, 'rgba(60,30,10,0.35)');
  ctx.fillStyle = grip;
  ctx.fillRect(0, hBot - 80, W, 90);
  // the light down its left side
  ctx.fillStyle = rgba('#fff2d0', 0.35);
  ctx.fillRect(cx - 7, hTop, 3, hBot - hTop - 20);
  ctx.restore();
  // the hanging hole and its leather loop
  ellipse(ctx, cx, hBot - 34, 4.5, 6, 0);
  ctx.fillStyle = '#3a1e0c';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, hBot - 34);
  ctx.bezierCurveTo(cx + 26, hBot - 20, cx + 22, hBot + 6, cx + 4, hBot + 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = '#8a4a24';
  ctx.lineWidth = 2.6;
  ctx.stroke();
  // the neck where the handle meets the bowl, curving forward
  ctx.beginPath();
  ctx.moveTo(cx - 9, hTop + 6);
  ctx.quadraticCurveTo(cx - 10, hTop - 22, cx - 22, hTop - 40);
  ctx.lineTo(cx + 22, hTop - 40);
  ctx.quadraticCurveTo(cx + 10, hTop - 22, cx + 9, hTop + 6);
  ctx.closePath();
  ctx.fillStyle = '#b47a3e';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // the bowl: a deep round cup seen from the side, tipped so we see the ragù in it
  const by = 68;
  const br = 54;
  ctx.beginPath();
  ctx.moveTo(cx - br, by - 6);
  ctx.bezierCurveTo(cx - br, by + 46, cx - 22, by + 62, cx, by + 62);
  ctx.bezierCurveTo(cx + 22, by + 62, cx + br, by + 46, cx + br, by - 6);
  ctx.closePath();
  const bowl = ctx.createRadialGradient(cx - 18, by + 10, 4, cx, by + 20, br * 1.2);
  bowl.addColorStop(0, '#e2ac6a');
  bowl.addColorStop(0.5, '#b47a3e');
  bowl.addColorStop(1, '#6a3c18');
  ctx.fillStyle = bowl;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // its grain round the cup
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.ellipse(cx + 6, by + 64, br * (0.4 + i * 0.16), 52 - i * 4, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.strokeStyle = rgba('#6a3c18', 0.28);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  // a gleam on the cup's side
  ellipse(ctx, cx - 30, by + 22, 7, 18, 0.3);
  ctx.fillStyle = rgba('#fff4dc', 0.4);
  ctx.fill();
  ctx.restore();
  // the rim, and the ragù filling it, glossy and heaped
  ellipse(ctx, cx, by - 6, br, 17, 0);
  ctx.fillStyle = '#8a5428';
  ctx.fill();
  ctx.lineWidth = 4.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, by - 8, br - 7, 12, 0, 0, Math.PI * 2);
  const ragu = ctx.createRadialGradient(cx - 14, by - 14, 2, cx, by - 6, br);
  ragu.addColorStop(0, '#e2502e');
  ragu.addColorStop(0.45, '#b02a16');
  ragu.addColorStop(1, '#6a1408');
  ctx.fillStyle = ragu;
  ctx.fill();
  // the meat in it, and the oil shining
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * (br - 14);
    const x = cx + Math.cos(a) * d;
    const y = by - 8 + Math.sin(a) * d * 0.22;
    ellipse(ctx, x, y, 2.6 + r() * 2.2, 1.6 + r() * 1.2, r() * 3);
    ctx.fillStyle = r() < 0.5 ? '#5a1a0a' : '#8a3418';
    ctx.fill();
  }
  ellipse(ctx, cx - 16, by - 13, 9, 2.6, -0.1);
  ctx.fillStyle = rgba('#ffd8a8', 0.75);
  ctx.fill();
  ellipse(ctx, cx + 14, by - 6, 4, 1.4, 0);
  ctx.fillStyle = rgba('#ffe0b0', 0.6);
  ctx.fill();
  // a drip of ragù running over the lip and hanging
  ctx.beginPath();
  ctx.moveTo(cx + 30, by - 2);
  ctx.bezierCurveTo(cx + 36, by + 4, cx + 34, by + 18, cx + 36, by + 28);
  ctx.arc(cx + 34, by + 30, 5.5, 0.2, Math.PI + 0.4);
  ctx.bezierCurveTo(cx + 28, by + 16, cx + 26, by + 6, cx + 22, by);
  ctx.closePath();
  ctx.fillStyle = '#a82414';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ellipse(ctx, cx + 32, by + 27, 1.6, 2.4, 0);
  ctx.fillStyle = rgba('#ffd0b0', 0.8);
  ctx.fill();
  return c;
}

/** The Head Waiter's silver tray seen at the table's tilt: a round, polished tray with a raised, beaded rim, a fine
 *  engraved band, the room's light streaking across it and its underside's dark edge. */
export function drawSilverTray(): HTMLCanvasElement {
  const W = 300;
  const H = 150;
  const [c, ctx] = makeCanvas(W, H);
  const cx = W / 2;
  const cy = H / 2 - 4;
  const rx = 138;
  const ry = 58;
  // its thickness: the underside's edge below the rim
  ellipse(ctx, cx, cy + 9, rx, ry);
  ctx.fillStyle = '#4a5462';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // the rim, bright polished silver
  ellipse(ctx, cx, cy, rx, ry);
  const rim = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
  rim.addColorStop(0, '#ffffff');
  rim.addColorStop(0.25, '#c8d4e2');
  rim.addColorStop(0.5, '#8a98aa');
  rim.addColorStop(0.75, '#dfe8f2');
  rim.addColorStop(1, '#7a8698');
  ctx.fillStyle = rim;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // the beads round the rim
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * Math.PI * 2;
    const x = cx + Math.cos(a) * (rx - 6);
    const y = cy + Math.sin(a) * (ry - 3);
    ellipse(ctx, x, y, 2.4, 1.5, a);
    ctx.fillStyle = Math.sin(a + 2.2) > 0 ? '#ffffff' : '#7a8698';
    ctx.fill();
  }
  // the dish inside the rim: a soft dark reflection of the room, lit from the top left
  ellipse(ctx, cx, cy + 1, rx - 15, ry - 9);
  const well = ctx.createRadialGradient(cx - 40, cy - 22, 6, cx, cy, rx);
  well.addColorStop(0, '#f6f9fc');
  well.addColorStop(0.35, '#b4c2d2');
  well.addColorStop(0.75, '#6e7c8e');
  well.addColorStop(1, '#4a5666');
  ctx.fillStyle = well;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = rgba(INK, 0.6);
  ctx.stroke();
  // the engraved band, a fine scroll
  ctx.beginPath();
  ctx.ellipse(cx, cy + 1, rx - 26, ry - 15, 0, 0, Math.PI * 2);
  ctx.strokeStyle = rgba('#ffffff', 0.5);
  ctx.lineWidth = 1.2;
  ctx.setLineDash([5, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, rx - 30, ry - 18, 0, 0, Math.PI * 2);
  ctx.strokeStyle = rgba('#3a4452', 0.45);
  ctx.lineWidth = 1;
  ctx.stroke();
  // the light streaking across it, and a star of light on the rim
  ctx.save();
  ellipse(ctx, cx, cy + 1, rx - 15, ry - 9);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(-0.35);
  const streak = ctx.createLinearGradient(0, -30, 0, 30);
  streak.addColorStop(0, 'rgba(255,255,255,0)');
  streak.addColorStop(0.5, 'rgba(255,255,255,0.75)');
  streak.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = streak;
  ctx.fillRect(-rx, -16, rx * 2, 22);
  ctx.fillStyle = rgba('#ffffff', 0.3);
  ctx.fillRect(-rx, 14, rx * 2, 6);
  ctx.restore();
  const sx = cx - rx * 0.62;
  const sy = cy - ry * 0.72;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(sx, sy - 12);
  ctx.lineTo(sx + 2.6, sy - 2.6);
  ctx.lineTo(sx + 12, sy);
  ctx.lineTo(sx + 2.6, sy + 2.6);
  ctx.lineTo(sx, sy + 12);
  ctx.lineTo(sx - 2.6, sy + 2.6);
  ctx.lineTo(sx - 12, sy);
  ctx.lineTo(sx - 2.6, sy - 2.6);
  ctx.closePath();
  ctx.fill();
  return c;
}

/** The First Bake: the wood oven's mouth, a brick arch glowing with the fire inside, its flames licking at the dome
 *  (it rises behind the pie as the oven breathes across the table). */
export function drawOvenMouth(): HTMLCanvasElement {
  const W = 320;
  const H = 240;
  const [c, ctx] = makeCanvas(W, H);
  const cx = W / 2;
  const base = H - 12;
  const r = rng(907);
  // the dome's bricks, a half round
  ctx.beginPath();
  ctx.moveTo(cx - 150, base);
  ctx.arc(cx, base, 150, Math.PI, 0);
  ctx.closePath();
  const dome = ctx.createRadialGradient(cx - 40, base - 120, 10, cx, base, 160);
  dome.addColorStop(0, '#d8885a');
  dome.addColorStop(0.6, '#a8502e');
  dome.addColorStop(1, '#6a2a16');
  ctx.fillStyle = dome;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.save();
  ctx.clip();
  for (let row = 0; row < 7; row++) {
    const rr = 150 - row * 20;
    const n = 8 + row;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + (i / n) * Math.PI + (row % 2 ? 0.5 / n : 0) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * rr, base + Math.sin(a) * rr);
      ctx.lineTo(cx + Math.cos(a) * (rr - 20), base + Math.sin(a) * (rr - 20));
      ctx.strokeStyle = rgba('#3a160a', 0.45);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, base, rr - 20, Math.PI, 0);
    ctx.strokeStyle = rgba('#3a160a', 0.4);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // soot over the mouth
  const soot = ctx.createRadialGradient(cx, base - 40, 10, cx, base - 40, 110);
  soot.addColorStop(0, 'rgba(30,14,8,0.7)');
  soot.addColorStop(1, 'rgba(30,14,8,0)');
  ctx.fillStyle = soot;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // the mouth, an arch full of fire
  ctx.beginPath();
  ctx.moveTo(cx - 74, base);
  ctx.lineTo(cx - 74, base - 54);
  ctx.arc(cx, base - 54, 74, Math.PI, 0);
  ctx.lineTo(cx + 74, base);
  ctx.closePath();
  const fire = ctx.createRadialGradient(cx, base - 10, 6, cx, base - 40, 120);
  fire.addColorStop(0, '#fff6c8');
  fire.addColorStop(0.25, '#ffd23f');
  fire.addColorStop(0.55, '#ff7a1a');
  fire.addColorStop(1, '#5a1606');
  ctx.fillStyle = fire;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // flames licking up inside it
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 7; i++) {
    const x = cx - 60 + i * 20 + (r() - 0.5) * 8;
    const h = 50 + r() * 60;
    ctx.beginPath();
    ctx.moveTo(x - 12, base);
    ctx.quadraticCurveTo(x - 14, base - h * 0.5, x + (r() - 0.5) * 10, base - h);
    ctx.quadraticCurveTo(x + 14, base - h * 0.5, x + 12, base);
    ctx.closePath();
    ctx.fillStyle = rgba(i % 2 ? '#ffe08a' : '#ff9a2a', 0.8);
    ctx.fill();
  }
  ctx.restore();
  // the arch's keystone bricks
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 74, base - 54 + Math.sin(a) * 74);
    ctx.lineTo(cx + Math.cos(a) * 92, base - 54 + Math.sin(a) * 92);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, base - 54, 92, Math.PI, 0);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  return c;
}

/** A small soft flour mote (Nonna's aura and her swat). */
export function drawFlour(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(24, 24);
  const g = ctx.createRadialGradient(12, 12, 0, 12, 12, 11);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.45, 'rgba(255,250,240,0.6)');
  g.addColorStop(1, 'rgba(255,250,240,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 24, 24);
  return c;
}

/** A fleck of ragù (Nonna's swat). */
export function drawRaguFleck(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(28, 28);
  ctx.beginPath();
  ctx.moveTo(14, 3);
  ctx.bezierCurveTo(22, 6, 25, 16, 19, 23);
  ctx.bezierCurveTo(13, 27, 5, 22, 5, 15);
  ctx.bezierCurveTo(5, 9, 9, 4, 14, 3);
  ctx.fillStyle = '#b02a16';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ellipse(ctx, 11, 10, 3, 2, -0.5);
  ctx.fillStyle = rgba('#ffd0b0', 0.8);
  ctx.fill();
  return c;
}
