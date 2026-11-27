// Sprites for the pizza plan's Epic milestone pizzas (src/content/pizzas/p7.ts), from Act 8's Norse bosses: the
// Bifröst's band over a bridged lane, Jörmungandr's coils round a held foot and Fenrir's howl. Drawn once on canvases
// in the game's style (src/art/perkProps.ts): dark outline, soft gradient, a sheen.

import { ellipse, makeCanvas, rgba, rng, type Ctx } from './util';

const INK = '#2a1810';

function sheen(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.55): void {
  ctx.fillStyle = rgba('#ffffff', a);
  ellipse(ctx, x, y, rx, ry, -0.6);
  ctx.fill();
}

/** Rainbow Bridge: the Bifröst over a lane, a tall band of seven colours, soft at its sides and fading out as it rises
 *  (shown faint, behind the pizzas and the feet). */
export function drawBifrostBand(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(200, 512);
  const cols = ['#ff4d4d', '#ff9f1c', '#ffd23f', '#5fe06a', '#4cc9f0', '#6a7dff', '#b06bff'];
  const w = 200 / cols.length;
  cols.forEach((col, i) => {
    const g = ctx.createLinearGradient(0, 512, 0, 0);
    g.addColorStop(0, rgba(col, 0.95));
    g.addColorStop(0.55, rgba(col, 0.7));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(i * w, 0, w + 1, 512);
  });
  // soft at its sides
  ctx.globalCompositeOperation = 'destination-in';
  const side = ctx.createLinearGradient(0, 0, 200, 0);
  side.addColorStop(0, 'rgba(0,0,0,0)');
  side.addColorStop(0.18, 'rgba(0,0,0,1)');
  side.addColorStop(0.82, 'rgba(0,0,0,1)');
  side.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = side;
  ctx.fillRect(0, 0, 200, 512);
  ctx.globalCompositeOperation = 'source-over';
  // a crystal glitter down it
  const r = rng(71);
  for (let i = 0; i < 40; i++) {
    const x = 30 + r() * 140;
    const y = 80 + r() * 420;
    const s = 1.5 + r() * 2.5;
    ctx.fillStyle = rgba('#ffffff', 0.35 + r() * 0.4 * (y / 512));
    ctx.beginPath();
    ctx.moveTo(x, y - s * 2);
    ctx.lineTo(x + s * 0.6, y);
    ctx.lineTo(x, y + s * 2);
    ctx.lineTo(x - s * 0.6, y);
    ctx.closePath();
    ctx.fill();
  }
  return c;
}

/** Serpent's Coil: Jörmungandr's coils wrapped round a foot, seen from the front (the back of each loop is hidden by
 *  the foot), its head reared at one side with a gold eye and a flickering tongue. */
export function drawSerpentCoil(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(300, 220);
  ctx.translate(140, 100);
  ctx.lineCap = 'round';
  const loop = (y: number, rx: number, ry: number, w: number) => {
    // the front half of one loop: a thick scaled tube, darker underneath, gold belly showing at its lower edge
    const arc = (dw: number) => {
      ctx.beginPath();
      ctx.ellipse(0, y, rx, ry, 0, 0.05, Math.PI - 0.05);
      ctx.lineWidth = w + dw;
    };
    arc(5);
    ctx.strokeStyle = INK;
    ctx.stroke();
    arc(0);
    const g = ctx.createLinearGradient(0, y - w, 0, y + ry + w);
    g.addColorStop(0, '#6fbe96');
    g.addColorStop(0.5, '#3f8a6a');
    g.addColorStop(1, '#1e5a40');
    ctx.strokeStyle = g;
    ctx.stroke();
    // the gold belly along its underside
    ctx.beginPath();
    ctx.ellipse(0, y + w * 0.32, rx, ry, 0, 0.25, Math.PI - 0.25);
    ctx.lineWidth = w * 0.28;
    ctx.strokeStyle = rgba('#e8d36a', 0.9);
    ctx.stroke();
    // scales: little arcs along the top of the tube
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = rgba('#0e3a28', 0.55);
    for (let t = 0.15; t < Math.PI - 0.1; t += 0.13) {
      const x = Math.cos(t) * rx;
      const yy = y + Math.sin(t) * ry - w * 0.12;
      ctx.beginPath();
      ctx.arc(x, yy, w * 0.22, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
    // a sheen along the top
    ctx.beginPath();
    ctx.ellipse(0, y - w * 0.25, rx, ry, 0, 0.5, Math.PI - 0.5);
    ctx.lineWidth = w * 0.16;
    ctx.strokeStyle = rgba('#d8ffe8', 0.45);
    ctx.stroke();
  };
  loop(-28, 92, 26, 22);
  loop(14, 100, 28, 24);
  // its head, reared up at the right, jaws open in a hiss
  ctx.save();
  ctx.translate(100, -40);
  ctx.rotate(-0.5);
  ctx.beginPath();
  ctx.moveTo(-14, 26);
  ctx.quadraticCurveTo(-20, -4, 0, -18);
  ctx.quadraticCurveTo(26, -26, 40, -10);
  ctx.lineTo(28, -2);
  ctx.lineTo(42, 6);
  ctx.quadraticCurveTo(22, 18, 12, 26);
  ctx.closePath();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  const hg = ctx.createLinearGradient(0, -24, 0, 26);
  hg.addColorStop(0, '#6fbe96');
  hg.addColorStop(0.6, '#3f8a6a');
  hg.addColorStop(1, '#1e5a40');
  ctx.fillStyle = hg;
  ctx.fill();
  // the open mouth and a fang
  ctx.beginPath();
  ctx.moveTo(26, -4);
  ctx.lineTo(40, -9);
  ctx.lineTo(40, 5);
  ctx.closePath();
  ctx.fillStyle = '#7a1a1a';
  ctx.fill();
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath();
  ctx.moveTo(32, -6);
  ctx.lineTo(34, 1);
  ctx.lineTo(36, -7);
  ctx.closePath();
  ctx.fill();
  // the forked tongue
  ctx.strokeStyle = '#d8304a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(38, -2);
  ctx.lineTo(52, -1);
  ctx.lineTo(58, -6);
  ctx.moveTo(52, -1);
  ctx.lineTo(58, 3);
  ctx.stroke();
  // the eye and the crest
  ellipse(ctx, 12, -8, 5.5, 4);
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
  ellipse(ctx, 12.8, -8, 1.4, 3.4);
  ctx.fillStyle = '#1a1208';
  ctx.fill();
  ctx.fillStyle = '#e8d36a';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-8 + i * 7, -14 - i * 2);
    ctx.lineTo(-10 + i * 7, -26 - i * 2);
    ctx.lineTo(-2 + i * 7, -17 - i * 2);
    ctx.closePath();
    ctx.fill();
  }
  sheen(ctx, 4, -14, 10, 3, 0.4);
  ctx.restore();
  return c;
}

/** Fenrir's Howl: the wolf's head thrown back in a howl, in Fenrir's grey (his boss colours), a pale moon glow
 *  behind it and a broken link of Gleipnir at its throat. A clean side-on head: two tall ears, a long muzzle pointed at
 *  the moon, the jaws open; its foot is at the bottom middle (it rises from behind a pie). */
export function drawHowlingWolf(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(300, 340);
  ctx.translate(130, 190);
  // the moon it howls at
  const glow = ctx.createRadialGradient(110, -140, 0, 110, -140, 90);
  glow.addColorStop(0, rgba('#f4f6ff', 0.65));
  glow.addColorStop(0.5, rgba('#c8d0f0', 0.25));
  glow.addColorStop(1, rgba('#b8c0e0', 0));
  ctx.fillStyle = glow;
  ctx.fillRect(20, -230, 180, 180);
  // the silhouette, drawn as smooth curves: neck, nape, two ears, brow, muzzle, open jaws, throat
  const head = () => {
    ctx.beginPath();
    ctx.moveTo(-70, 150);
    ctx.bezierCurveTo(-78, 80, -66, 10, -46, -34); // the back of the neck
    ctx.lineTo(-66, -122); // the back ear, tall and pointed
    ctx.lineTo(-24, -70);
    ctx.lineTo(-30, -132); // the front ear
    ctx.lineTo(2, -80);
    ctx.quadraticCurveTo(18, -90, 30, -108); // the brow and the stop
    ctx.lineTo(76, -164); // the bridge of the muzzle up to the nose
    ctx.quadraticCurveTo(88, -164, 84, -150); // the nose
    ctx.lineTo(54, -122); // the upper jaw's underside
    ctx.lineTo(46, -116); // the corner of the mouth
    ctx.lineTo(74, -124); // the lower jaw
    ctx.quadraticCurveTo(76, -112, 64, -108);
    ctx.quadraticCurveTo(40, -96, 30, -76); // the chin
    ctx.bezierCurveTo(36, -30, 40, 40, 58, 150); // the throat and chest
    ctx.closePath();
  };
  head();
  ctx.lineWidth = 9;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.stroke();
  const g = ctx.createLinearGradient(-60, -140, 60, 150);
  g.addColorStop(0, '#b4aac6');
  g.addColorStop(0.35, '#7a7486');
  g.addColorStop(1, '#46424e');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  head();
  ctx.clip();
  // the pale lower jaw and throat (the muzzle's top stays grey, like the rest of the head)
  ctx.fillStyle = '#e4dccf';
  ctx.beginPath();
  ctx.moveTo(46, -116);
  ctx.lineTo(80, -126);
  ctx.lineTo(70, -104);
  ctx.quadraticCurveTo(40, -92, 32, -70);
  ctx.bezierCurveTo(38, -20, 44, 50, 62, 160);
  ctx.lineTo(28, 160);
  ctx.bezierCurveTo(16, 60, 14, -30, 22, -84);
  ctx.closePath();
  ctx.fill();
  // a lighter cheek under the eye
  ctx.fillStyle = rgba('#d0c8d8', 0.55);
  ellipse(ctx, 10, -80, 18, 11, -0.5);
  ctx.fill();
  // a rim of moonlight down the back of the neck and the nape
  ctx.strokeStyle = rgba('#eef0ff', 0.6);
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-72, 130);
  ctx.bezierCurveTo(-76, 70, -64, 6, -46, -34);
  ctx.stroke();
  // a few soft tufts of fur on the neck
  ctx.strokeStyle = rgba('#34303c', 0.45);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const y = 10 + i * 26;
    ctx.beginPath();
    ctx.moveTo(-60, y);
    ctx.quadraticCurveTo(-40, y + 10, -22, y + 2);
    ctx.stroke();
  }
  ctx.restore();
  // inside the ears
  ctx.fillStyle = '#9a7486';
  ctx.beginPath();
  ctx.moveTo(-50, -48);
  ctx.lineTo(-60, -108);
  ctx.lineTo(-32, -72);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-18, -80);
  ctx.lineTo(-26, -118);
  ctx.lineTo(-4, -86);
  ctx.closePath();
  ctx.fill();
  // the open mouth, a fang top and bottom
  ctx.fillStyle = '#5a1a2a';
  ctx.beginPath();
  ctx.moveTo(54, -122);
  ctx.lineTo(46, -116);
  ctx.lineTo(74, -124);
  ctx.lineTo(70, -128);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath();
  ctx.moveTo(58, -126);
  ctx.lineTo(57, -119);
  ctx.lineTo(62, -125);
  ctx.closePath();
  ctx.fill();
  // the nose
  ctx.fillStyle = '#16121a';
  ellipse(ctx, 82, -158, 7, 5, -0.8);
  ctx.fill();
  // the eye shut tight in the howl, a heavy brow over it
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(8, -100);
  ctx.quadraticCurveTo(18, -96, 26, -108);
  ctx.stroke();
  sheen(ctx, 48, -132, 16, 4, 0.45);
  // a broken link of Gleipnir hanging at its throat
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#4a5466';
  ctx.beginPath();
  ctx.ellipse(30, 70, 17, 10, 0.4, 0.6, Math.PI * 2 - 0.4);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#bfe6ff';
  ctx.stroke();
  // the neck fades out at its foot (it rises from behind the pie, never cut off flat)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'destination-out';
  const fade = ctx.createLinearGradient(0, 250, 0, 340);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 250, 300, 90);
  ctx.globalCompositeOperation = 'source-over';
  return c;
}

/** Skald's Saga: a rune stone off the Skald's saga, a grey standing stone with a rune cut and painted in his red (or
 *  blue, or gold), a glow of the song round it. */
export function drawRuneStone(which: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(120, 160);
  const col = ['#c8302a', '#3a6aaa', '#d8a83a'][which % 3];
  const glow = ctx.createRadialGradient(60, 82, 10, 60, 82, 64);
  glow.addColorStop(0, rgba('#ffe8a0', 0.5));
  glow.addColorStop(1, rgba('#ffe8a0', 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 120, 160);
  // the stone: a rounded slab, taller than wide
  ctx.beginPath();
  ctx.moveTo(30, 146);
  ctx.quadraticCurveTo(22, 70, 34, 30);
  ctx.quadraticCurveTo(60, 8, 86, 30);
  ctx.quadraticCurveTo(98, 80, 90, 146);
  ctx.closePath();
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  const g = ctx.createLinearGradient(30, 20, 90, 146);
  g.addColorStop(0, '#b8b2a6');
  g.addColorStop(0.6, '#8a847a');
  g.addColorStop(1, '#5e5a52');
  ctx.fillStyle = g;
  ctx.fill();
  // lichen and chips
  ctx.fillStyle = rgba('#9ab07a', 0.5);
  ellipse(ctx, 40, 120, 7, 4, 0.3);
  ctx.fill();
  ellipse(ctx, 80, 52, 5, 3, -0.4);
  ctx.fill();
  // the rune: cut dark, then painted
  const runes: [number, number, number, number][][] = [
    [[60, 40, 60, 126], [60, 40, 82, 60], [60, 66, 82, 86]], // ansuz: the god's word, the saga
    [[48, 40, 48, 126], [72, 40, 72, 126], [48, 74, 72, 92]], // hagalaz
    [[60, 40, 60, 126], [60, 46, 42, 68], [60, 46, 78, 68]], // tiwaz: victory
  ];
  const strokeRune = (s: string, w: number) => {
    ctx.strokeStyle = s;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const [x0, y0, x1, y1] of runes[which % 3]) {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
    }
    ctx.stroke();
  };
  strokeRune('#2a2420', 11);
  strokeRune(col, 7);
  sheen(ctx, 46, 40, 12, 4, 0.35);
  return c;
}
