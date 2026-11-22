// Art for Bat Feet and Spider Socks (data in src/content/feet/heroes.ts). Same design frame as the built-in kinds:
// centre x = CX (110), the ankle opens at y = -6, toes at the bottom, the sole touching at contactY.

import type { FootArt } from '../../data/feet';
import { CX, INK, OUT, drawBareBody, drawSock, drawToe, outlineOf, toesFor } from '../../art/feetCommon';
import { registerKind } from '../../art/registry';
import { type Ctx, ellipse, rgba, shade } from '../../art/util';

function ink(ctx: Ctx, lw = OUT, col = INK): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

// ——— BAT FEET: a furry dusk-purple foot with leathery wings at the ankle and hooked claws ———
function batWing(ctx: Ctx, s: number, membrane: string, inner: string): void {
  // s = -1 left, 1 right; the wing grows out of the ankle and fans out with three finger bones
  const ax = CX + s * 46;
  const ay = 26;
  const tips: [number, number][] = [
    [CX + s * 168, -24],
    [CX + s * 176, 54],
    [CX + s * 148, 118],
  ];
  ctx.beginPath();
  ctx.moveTo(ax, ay - 14);
  ctx.quadraticCurveTo(CX + s * 110, -40, tips[0][0], tips[0][1]);
  // scalloped trailing edge between the finger tips
  let prev = tips[0];
  for (const t of tips.slice(1)) {
    ctx.quadraticCurveTo((prev[0] + t[0]) / 2 - s * 26, (prev[1] + t[1]) / 2, t[0], t[1]);
    prev = t;
  }
  ctx.quadraticCurveTo(CX + s * 98, 96, ax, ay + 70);
  ctx.closePath();
  const g = ctx.createLinearGradient(ax, 0, tips[1][0], 0);
  g.addColorStop(0, shade(membrane, 0.1));
  g.addColorStop(1, shade(membrane, -0.35));
  ctx.fillStyle = g;
  ctx.fill();
  // a warm glow through the thin membrane
  ctx.save();
  ctx.clip();
  const ig = ctx.createRadialGradient(CX + s * 110, 40, 6, CX + s * 110, 40, 80);
  ig.addColorStop(0, rgba(inner, 0.45));
  ig.addColorStop(1, rgba(inner, 0));
  ctx.fillStyle = ig;
  ctx.fillRect(CX + (s > 0 ? 30 : -200), -60, 170, 200);
  ctx.restore();
  ink(ctx, 4.5);
  // finger bones
  for (const t of tips) {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo((ax + t[0]) / 2, (ay + t[1]) / 2 - 10, t[0], t[1]);
    ink(ctx, 3.5, shade(membrane, -0.55));
  }
  // the thumb claw at the wing's leading edge
  ctx.beginPath();
  ctx.moveTo(tips[0][0], tips[0][1]);
  ctx.lineTo(tips[0][0] + s * 10, tips[0][1] - 12);
  ctx.lineTo(tips[0][0] - s * 2, tips[0][1] - 4);
  ctx.closePath();
  ctx.fillStyle = '#efe3c0';
  ctx.fill();
  ink(ctx, 2.5);
}

function drawBat(ctx: Ctx, art: FootArt, r: () => number): void {
  const membrane = art.primary ?? '#3a2d4a';
  const inner = art.secondary ?? '#c84a6a';
  batWing(ctx, -1, membrane, inner);
  batWing(ctx, 1, membrane, inner);
  // furry body, then hooked claws
  drawBareBody(ctx, { ...art, hair: true }, r);
  // a pale belly-fur blaze down the top of the foot
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(CX + 4, 120, 42, 70, 0, 0, Math.PI * 2);
  ctx.clip();
  const bg = ctx.createRadialGradient(CX, 110, 4, CX, 120, 70);
  bg.addColorStop(0, rgba('#b8a8c8', 0.55));
  bg.addColorStop(1, rgba('#b8a8c8', 0));
  ctx.fillStyle = bg;
  ctx.fillRect(CX - 50, 40, 110, 160);
  ctx.restore();
  for (const t of toesFor(art)) drawToe(ctx, { ...t, ry: t.ry * 0.92 }, art.skin, { claw: true, hair: true, r, ol: outlineOf(art.skin) });
  // two pointed ears peeking up at the ankle, like the bat it's named for
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + s * 20, 8);
    ctx.lineTo(CX + s * 34, -30);
    ctx.lineTo(CX + s * 46, 10);
    ctx.closePath();
    ctx.fillStyle = shade(art.skin, -0.1);
    ctx.fill();
    ink(ctx, 4, outlineOf(art.skin));
    ctx.beginPath();
    ctx.moveTo(CX + s * 27, 4);
    ctx.lineTo(CX + s * 34, -16);
    ctx.lineTo(CX + s * 40, 6);
    ctx.closePath();
    ctx.fillStyle = rgba(inner, 0.7);
    ctx.fill();
  }
}

registerKind('h_bat', { draw: drawBat, contactY: 262, halfWidth: 104 });

// ——— SPIDER SOCKS: a striped sock with eight jointed legs and a web knitted into it ———
function spiderLeg(ctx: Ctx, s: number, y: number, k: number, tip: string): void {
  const x0 = CX + s * 88;
  const kx = CX + s * (138 + k * 8);
  const ky = y - 34 - k * 6;
  const fx = CX + s * (162 + k * 6);
  const fy = y + 30 + k * 10;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(kx, ky);
  ctx.lineTo(fx, fy);
  ink(ctx, 11, INK);
  ink(ctx, 6, '#2a2232');
  // a bright sock-coloured tip on each foot of the leg
  ctx.beginPath();
  ctx.arc(fx, fy, 6, 0, Math.PI * 2);
  ctx.fillStyle = tip;
  ctx.fill();
  ink(ctx, 3);
  // a glint on the knee
  ctx.beginPath();
  ctx.arc(kx, ky, 3, 0, Math.PI * 2);
  ctx.fillStyle = rgba('#ffffff', 0.6);
  ctx.fill();
}

function drawSpider(ctx: Ctx, art: FootArt, r: () => number): void {
  const tip = art.secondary ?? '#7be04a';
  // legs behind the sock: four a side
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) spiderLeg(ctx, s, 40 + i * 40, i, tip);
  drawSock(ctx, art, r, false);
  // a web knitted across the top of the sock
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(CX + 2, 110, 74, 84, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = rgba('#f4f8ff', 0.55);
  ctx.lineWidth = 2;
  const cx = CX + 2;
  const cy = 104;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * 100, cy + Math.sin(a) * 100);
    ctx.stroke();
  }
  for (let ring = 1; ring <= 4; ring++) {
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const a0 = ((i - 0.5) / 8) * Math.PI * 2;
      const rr = ring * 20;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (!i) ctx.moveTo(x, y);
      else ctx.quadraticCurveTo(cx + Math.cos(a0) * rr * 0.85, cy + Math.sin(a0) * rr * 0.85, x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
  // a little spider sitting in the middle of its web (eight dots of eyes would be too small: two will do)
  ellipse(ctx, cx, cy + 4, 13, 15);
  ctx.fillStyle = '#2a2232';
  ctx.fill();
  ink(ctx, 3);
  ellipse(ctx, cx, cy - 12, 9, 8);
  ctx.fillStyle = '#2a2232';
  ctx.fill();
  ink(ctx, 3);
  for (const dx of [-3.5, 3.5]) {
    ellipse(ctx, cx + dx, cy - 13, 2.4, 2.4);
    ctx.fillStyle = tip;
    ctx.fill();
  }
  ellipse(ctx, cx - 4, cy - 2, 4, 6, -0.4);
  ctx.fillStyle = rgba('#ffffff', 0.35);
  ctx.fill();
}

registerKind('h_spider', { draw: drawSpider, contactY: 262, halfWidth: 104 });
