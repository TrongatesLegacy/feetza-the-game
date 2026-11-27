// Art for the peel abilities' visuals (src/game/abilityFx.ts): curtains, waves, walls of fire and snow, gems,
// marbles, notes, the rainbow bridge and the like. Each is drawn on first use (when a peel that needs it is equipped,
// never mid-move) from a seeded generator, so it looks the same every time. Ink outlines and one light from the top
// left, as the rest of the game's art.

import { makeCanvas, rng, ellipse, shade, rgba, type Ctx } from './util';

const INK = '#2a1810';

type Draw = () => HTMLCanvasElement;

/** Velvet stage curtain: one half, its folds hanging straight, a gold fringe along the hem. */
function curtain(): HTMLCanvasElement {
  const w = 560;
  const h = 1120;
  const [c, ctx] = makeCanvas(w, h);
  const r = rng(77);
  // the cloth: vertical folds, each a band lit from the left
  const folds = 7;
  const fw = w / folds;
  for (let i = 0; i < folds; i++) {
    const x0 = i * fw;
    const g = ctx.createLinearGradient(x0, 0, x0 + fw, 0);
    g.addColorStop(0, '#5a0a14');
    g.addColorStop(0.25, '#c21f32');
    g.addColorStop(0.45, '#e8394a');
    g.addColorStop(0.7, '#9a1424');
    g.addColorStop(1, '#4a0610');
    ctx.fillStyle = g;
    // a slight sway at the hem: each fold's bottom scallops
    ctx.beginPath();
    ctx.moveTo(x0 - 1, 0);
    ctx.lineTo(x0 + fw + 1, 0);
    ctx.lineTo(x0 + fw + 1, h - 70);
    ctx.quadraticCurveTo(x0 + fw / 2, h - 40 + r() * 12, x0 - 1, h - 70);
    ctx.closePath();
    ctx.fill();
  }
  // velvet sheen: soft vertical highlights
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < folds; i++) {
    const x = i * fw + fw * 0.4;
    const g = ctx.createLinearGradient(x - 8, 0, x + 8, 0);
    g.addColorStop(0, 'rgba(255,140,150,0)');
    g.addColorStop(0.5, 'rgba(255,140,150,0.18)');
    g.addColorStop(1, 'rgba(255,140,150,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 8, 0, 16, h - 80);
  }
  ctx.globalCompositeOperation = 'source-over';
  // shade towards the top (the pelmet's shadow)
  const top = ctx.createLinearGradient(0, 0, 0, 160);
  top.addColorStop(0, 'rgba(20,0,4,0.65)');
  top.addColorStop(1, 'rgba(20,0,4,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, 160);
  // gold fringe and braid
  ctx.fillStyle = '#c9932a';
  for (let i = 0; i < folds; i++) {
    const x0 = i * fw;
    for (let k = 0; k < 9; k++) {
      const x = x0 + (k / 8) * fw;
      const y = h - 70 + Math.sin((k / 8) * Math.PI) * 26;
      ctx.fillStyle = k % 2 ? '#ffd86a' : '#c9932a';
      ctx.fillRect(x - 3, y, 6, 34);
    }
  }
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#ffd23f';
  ctx.beginPath();
  for (let i = 0; i < folds; i++) {
    const x0 = i * fw;
    ctx.moveTo(x0, h - 70);
    ctx.quadraticCurveTo(x0 + fw / 2, h - 28, x0 + fw, h - 70);
  }
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#8a5a10';
  ctx.stroke();
  return c;
}

/** The pelmet over the stage: a swagged valance with a gold trim (stretched across the screen). */
function valance(): HTMLCanvasElement {
  const w = 1024;
  const h = 190;
  const [c, ctx] = makeCanvas(w, h);
  const swags = 6;
  const sw = w / swags;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#3a0610');
  g.addColorStop(0.5, '#b01c2e');
  g.addColorStop(1, '#6a0a18');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  for (let i = swags - 1; i >= 0; i--) {
    const x0 = i * sw;
    ctx.lineTo(x0 + sw, 110);
    ctx.quadraticCurveTo(x0 + sw / 2, 190, x0, 110);
  }
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // gold trim along each swag
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#ffd23f';
  ctx.beginPath();
  for (let i = 0; i < swags; i++) {
    const x0 = i * sw;
    ctx.moveTo(x0, 104);
    ctx.quadraticCurveTo(x0 + sw / 2, 178, x0 + sw, 104);
  }
  ctx.stroke();
  // tassels where the swags meet
  for (let i = 0; i <= swags; i++) {
    const x = i * sw;
    ctx.fillStyle = '#ffd23f';
    ellipse(ctx, x, 112, 12, 12);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 10, 118);
    ctx.lineTo(x + 10, 118);
    ctx.lineTo(x + 6, 160);
    ctx.lineTo(x - 6, 160);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#8a5a10';
    ctx.stroke();
  }
  return c;
}

/** A spotlight's cone from the top of the screen: narrow at the lamp, wide where it falls. */
function spot(): HTMLCanvasElement {
  const w = 512;
  const h = 1024;
  const [c, ctx] = makeCanvas(w, h);
  ctx.beginPath();
  ctx.moveTo(w / 2 - 40, 0);
  ctx.lineTo(w / 2 + 40, 0);
  ctx.lineTo(w - 10, h - 60);
  ctx.lineTo(10, h - 60);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,250,220,0.85)');
  g.addColorStop(1, 'rgba(255,240,190,0.25)');
  ctx.fillStyle = g;
  ctx.fill();
  // the pool of light where it lands
  const p = ctx.createRadialGradient(w / 2, h - 60, 10, w / 2, h - 60, w / 2);
  p.addColorStop(0, 'rgba(255,250,220,0.8)');
  p.addColorStop(1, 'rgba(255,250,220,0)');
  ctx.fillStyle = p;
  ctx.save();
  ctx.translate(w / 2, h - 60);
  ctx.scale(1, 0.25);
  ctx.beginPath();
  ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // soften the cone's edges
  ctx.globalCompositeOperation = 'destination-out';
  const e = ctx.createLinearGradient(0, 0, w, 0);
  e.addColorStop(0, 'rgba(0,0,0,1)');
  e.addColorStop(0.18, 'rgba(0,0,0,0)');
  e.addColorStop(0.82, 'rgba(0,0,0,0)');
  e.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = e;
  ctx.fillRect(0, 0, w, h);
  return c;
}

/** A breaking wave seen side on: deep water, a curling lip and foam, the face lit from the left. */
function wave(): HTMLCanvasElement {
  const w = 1024;
  const h = 520;
  const [c, ctx] = makeCanvas(w, h);
  const r = rng(5);
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, 300);
  ctx.bezierCurveTo(260, 260, 520, 120, 760, 70);
  ctx.bezierCurveTo(900, 40, 1000, 90, 990, 170);
  ctx.bezierCurveTo(980, 230, 900, 240, 880, 200);
  ctx.bezierCurveTo(940, 330, 1000, 420, w, 460);
  ctx.lineTo(w, h);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 60, 0, h);
  g.addColorStop(0, '#6fe0ff');
  g.addColorStop(0.35, '#2a9fe0');
  g.addColorStop(1, '#0a3f86');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#082a5a';
  ctx.stroke();
  // light streaks on the face
  ctx.strokeStyle = 'rgba(220,250,255,0.45)';
  ctx.lineWidth = 6;
  for (let i = 0; i < 7; i++) {
    const y = 200 + i * 42;
    ctx.beginPath();
    ctx.moveTo(60 + i * 40, y + 60);
    ctx.quadraticCurveTo(400 + i * 50, y - 20, 760 + i * 20, y - 40 + i * 6);
    ctx.stroke();
  }
  // foam along the lip
  for (let i = 0; i < 46; i++) {
    const t = i / 45;
    const x = 380 + t * 620;
    const y = t < 0.62 ? 210 - t * 220 + r() * 18 : 80 + (t - 0.62) * 300 + r() * 18;
    ctx.fillStyle = i % 3 ? '#ffffff' : '#d6f6ff';
    ellipse(ctx, x, y, 22 + r() * 22, 14 + r() * 12);
    ctx.fill();
  }
  // spray off the top
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = rgba('#ffffff', 0.5 + r() * 0.5);
    ellipse(ctx, 700 + r() * 320, 20 + r() * 120, 4 + r() * 8, 4 + r() * 8);
    ctx.fill();
  }
  return c;
}

/** A wall of something rolling in, side on: snow (an avalanche), fire, ink or sauce. Lumpy top, solid below. */
function wall(kind: 'snow' | 'fire' | 'ink' | 'sauce' | 'cheese' | 'gold'): HTMLCanvasElement {
  const w = 1024;
  const h = 600;
  const [c, ctx] = makeCanvas(w, h);
  const r = rng(kind.length * 31 + 3);
  const cols: Record<typeof kind, [string, string, string]> = {
    snow: ['#ffffff', '#d8ecff', '#8fb0d8'],
    fire: ['#fff3a0', '#ff9f1c', '#c22a10'],
    ink: ['#7a5ab0', '#3a2a6a', '#120a24'],
    sauce: ['#ff7a5a', '#d8341e', '#7a1208'],
    cheese: ['#fff6c0', '#ffd23f', '#d89a20'],
    gold: ['#fff6c0', '#ffd23f', '#b07a10'],
  };
  const [hi, mid, lo] = cols[kind];
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, hi);
  g.addColorStop(0.4, mid);
  g.addColorStop(1, lo);
  if (kind === 'fire') {
    // tongues of flame
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 30; i++) {
      const x = r() * w;
      const fh = 220 + r() * 340;
      const fw = 70 + r() * 90;
      const fg = ctx.createLinearGradient(0, h - fh, 0, h);
      fg.addColorStop(0, 'rgba(255,240,160,0)');
      fg.addColorStop(0.3, 'rgba(255,190,60,0.7)');
      fg.addColorStop(1, 'rgba(230,60,20,0.9)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(x - fw / 2, h);
      ctx.quadraticCurveTo(x - fw * 0.6, h - fh * 0.5, x + (r() - 0.5) * 40, h - fh);
      ctx.quadraticCurveTo(x + fw * 0.6, h - fh * 0.5, x + fw / 2, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    return c;
  }
  // lumpy top edge
  ctx.beginPath();
  ctx.moveTo(0, h);
  let x = 0;
  while (x < w) {
    const bw = 60 + r() * 90;
    const top = 60 + r() * 120;
    ctx.lineTo(x, top + 40);
    ctx.quadraticCurveTo(x + bw / 2, top - 50, x + bw, top + 40);
    x += bw;
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = kind === 'snow' ? '#6a88b0' : shade(lo, -0.3);
  ctx.stroke();
  // clumps and highlights inside
  for (let i = 0; i < 40; i++) {
    const cx = r() * w;
    const cy = 160 + r() * (h - 180);
    ctx.fillStyle = rgba(i % 2 ? hi : mid, 0.35 + r() * 0.3);
    ellipse(ctx, cx, cy, 30 + r() * 50, 20 + r() * 30);
    ctx.fill();
  }
  if (kind === 'ink' || kind === 'sauce' || kind === 'cheese') {
    // drips running down
    for (let i = 0; i < 14; i++) {
      const dx = r() * w;
      ctx.fillStyle = rgba(hi, 0.5);
      ellipse(ctx, dx, 200 + r() * 200, 10, 30 + r() * 30);
      ctx.fill();
    }
  }
  return c;
}

/** Frost along one side of the screen (the left: flipped for the right): chunky ink-outlined ice shards growing out of
 * the edge over a frosted band, clear by its inner edge. Stretched to the screen's height, 12% of its width. */
function frostEdge(): HTMLCanvasElement {
  const w = 240;
  const h = 1080;
  const [c, ctx] = makeCanvas(w, h);
  const r = rng(41);
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(225,245,255,0.85)');
  g.addColorStop(0.45, 'rgba(200,235,255,0.35)');
  g.addColorStop(1, 'rgba(200,235,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // shards: long wedges pointing inwards, shaded and outlined
  for (let i = 0; i < 26; i++) {
    const y = r() * h;
    const len = 60 + r() * 150;
    const half = 10 + r() * 16;
    const tilt = (r() - 0.5) * 0.7;
    const tx = len * Math.cos(tilt);
    const ty = len * Math.sin(tilt);
    ctx.beginPath();
    ctx.moveTo(0, y - half);
    ctx.lineTo(tx, y + ty);
    ctx.lineTo(0, y + half);
    ctx.closePath();
    const sg = ctx.createLinearGradient(0, y - half, 0, y + half);
    sg.addColorStop(0, '#ffffff');
    sg.addColorStop(0.5, '#bfe8ff');
    sg.addColorStop(1, '#7cc4ec');
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#2a4a6a';
    ctx.stroke();
    // a glint along the upper face
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(4, y - half * 0.5);
    ctx.lineTo(tx * 0.7, y + ty * 0.7 - 2);
    ctx.stroke();
  }
  return c;
}

/** A cut gem, front on: a crown of facets over a pointed pavilion, in its colour, with a white glint. */
export function gem(color: string): HTMLCanvasElement {
  const s = 256;
  const [c, ctx] = makeCanvas(s, s);
  const cx = s / 2;
  const top = 50;
  const girdle = 110;
  const bottom = 236;
  const half = 108;
  const table = 52;
  const outline = () => {
    ctx.beginPath();
    ctx.moveTo(cx - table, top);
    ctx.lineTo(cx + table, top);
    ctx.lineTo(cx + half, girdle);
    ctx.lineTo(cx, bottom);
    ctx.lineTo(cx - half, girdle);
    ctx.closePath();
  };
  outline();
  ctx.fillStyle = color;
  ctx.fill();
  // facets: each a little lighter or darker, lit from the top left
  const facet = (pts: [number, number][], amt: number) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
    ctx.closePath();
    ctx.fillStyle = shade(color, amt);
    ctx.fill();
  };
  facet([[cx - table, top], [cx + table, top], [cx + table * 0.55, girdle - 20], [cx - table * 0.55, girdle - 20]], 0.35);
  facet([[cx - table, top], [cx - table * 0.55, girdle - 20], [cx - half, girdle]], 0.2);
  facet([[cx + table, top], [cx + half, girdle], [cx + table * 0.55, girdle - 20]], -0.15);
  facet([[cx - half, girdle], [cx - table * 0.55, girdle - 20], [cx + table * 0.55, girdle - 20], [cx + half, girdle]], 0.05);
  facet([[cx - half, girdle], [cx - 30, girdle], [cx, bottom]], 0.15);
  facet([[cx - 30, girdle], [cx + 30, girdle], [cx, bottom]], -0.05);
  facet([[cx + 30, girdle], [cx + half, girdle], [cx, bottom]], -0.3);
  ctx.strokeStyle = rgba('#ffffff', 0.5);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - half, girdle);
  ctx.lineTo(cx + half, girdle);
  ctx.stroke();
  outline();
  ctx.lineWidth = 7;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // glint
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx - 40, top + 14);
  ctx.lineTo(cx - 14, top + 14);
  ctx.lineTo(cx - 34, top + 40);
  ctx.closePath();
  ctx.fill();
  return c;
}

/** A glass marble with a swirl inside. */
function marble(): HTMLCanvasElement {
  const s = 128;
  const [c, ctx] = makeCanvas(s, s);
  const g = ctx.createRadialGradient(46, 40, 6, 64, 64, 60);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.5, '#e8eef8');
  g.addColorStop(1, '#9aa6c0');
  ctx.fillStyle = g;
  ellipse(ctx, 64, 64, 56, 56);
  ctx.fill();
  // the swirl
  ctx.lineWidth = 10;
  ctx.strokeStyle = 'rgba(255,90,140,0.8)';
  ctx.beginPath();
  ctx.moveTo(24, 70);
  ctx.bezierCurveTo(50, 20, 80, 110, 104, 52);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(80,160,255,0.75)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(30, 90);
  ctx.bezierCurveTo(60, 50, 76, 120, 100, 80);
  ctx.stroke();
  ellipse(ctx, 64, 64, 56, 56);
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ellipse(ctx, 44, 38, 14, 9, -0.6);
  ctx.fill();
  return c;
}

/** A music note (two beamed quavers). */
function note(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(96, 96);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(34, 70);
  ctx.lineTo(34, 18);
  ctx.lineTo(78, 10);
  ctx.lineTo(78, 62);
  ctx.stroke();
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(34, 20);
  ctx.lineTo(78, 12);
  ctx.stroke();
  for (const [x, y] of [[24, 72], [68, 64]]) {
    ellipse(ctx, x, y, 14, 10, -0.4);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  return c;
}

/** A raindrop. */
function drop(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(32, 64);
  ctx.beginPath();
  ctx.moveTo(16, 2);
  ctx.quadraticCurveTo(30, 40, 16, 60);
  ctx.quadraticCurveTo(2, 40, 16, 2);
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, 'rgba(200,235,255,0.2)');
  g.addColorStop(1, 'rgba(140,200,255,0.95)');
  ctx.fillStyle = g;
  ctx.fill();
  return c;
}

/** A six-armed snowflake. */
function flake(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(64, 64);
  ctx.translate(32, 32);
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -26);
    ctx.moveTo(0, -14);
    ctx.lineTo(-7, -21);
    ctx.moveTo(0, -14);
    ctx.lineTo(7, -21);
    ctx.stroke();
  }
  return c;
}

/** A soap bubble: a clear sphere with a rainbow rim and a glint. */
function bubble(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(96, 96);
  const g = ctx.createRadialGradient(48, 48, 20, 48, 48, 44);
  g.addColorStop(0, 'rgba(200,240,255,0.05)');
  g.addColorStop(0.8, 'rgba(160,220,255,0.35)');
  g.addColorStop(1, 'rgba(255,200,255,0.8)');
  ctx.fillStyle = g;
  ellipse(ctx, 48, 48, 44, 44);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ellipse(ctx, 32, 30, 10, 6, -0.6);
  ctx.fill();
  return c;
}

/** Cracks in the table where something huge landed. */
function crack(): HTMLCanvasElement {
  const w = 640;
  const h = 200;
  const [c, ctx] = makeCanvas(w, h);
  const r = rng(19);
  ctx.strokeStyle = 'rgba(30,14,6,0.9)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    let x = w / 2;
    let y = h / 2;
    let a = (i / 9) * Math.PI * 2 + r() * 0.4;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 6; k++) {
      a += (r() - 0.5) * 0.8;
      const len = 30 + r() * 30;
      x += Math.cos(a) * len;
      y += Math.sin(a) * len * 0.32;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // a pale lip along the cracks
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ellipse(ctx, w / 2, h / 2, w * 0.2, h * 0.16);
  ctx.fill();
  return c;
}

/** A speed streak: a soft line, bright in the middle. */
function streak(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(256, 20);
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ellipse(ctx, 128, 10, 126, 6);
  ctx.fill();
  return c;
}

/** A hex circle: two rings, runes between them and a six-pointed star inside (white: tinted in play). */
function hex(): HTMLCanvasElement {
  const s = 512;
  const [c, ctx] = makeCanvas(s, s);
  ctx.translate(s / 2, s / 2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, 0, 240, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 196, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 6;
  for (const off of [0, Math.PI / 3]) {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = off + (i / 3) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * 190;
      const y = Math.sin(a) * 190;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  // runes: little strokes round the band
  ctx.lineWidth = 4;
  const r = rng(23);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    ctx.translate(0, -218);
    ctx.beginPath();
    ctx.moveTo(-8, -10);
    ctx.lineTo(r() * 10 - 5, 10);
    ctx.lineTo(8, -10 + r() * 10);
    ctx.stroke();
    ctx.restore();
  }
  return c;
}

/** A rainbow arc (half a ring of bands). */
function rainbow(): HTMLCanvasElement {
  const w = 1024;
  const h = 540;
  const [c, ctx] = makeCanvas(w, h);
  const bands = ['#ff4d4d', '#ff9f1c', '#ffd23f', '#5fe06a', '#4cc9f0', '#6a7dff', '#b06bff'];
  bands.forEach((col, i) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = 34;
    ctx.beginPath();
    ctx.arc(w / 2, h, 480 - i * 32, Math.PI, 0);
    ctx.stroke();
  });
  // a soft white edge on the outside
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(w / 2, h, 500, Math.PI, 0);
  ctx.stroke();
  return c;
}

/** A whirlpool's spiral, top down (white: tinted in play). */
function spiral(): HTMLCanvasElement {
  const s = 512;
  const [c, ctx] = makeCanvas(s, s);
  ctx.translate(s / 2, s / 2);
  for (let arm = 0; arm < 4; arm++) {
    ctx.beginPath();
    for (let t = 0; t <= 1; t += 0.01) {
      const a = arm * (Math.PI / 2) + t * Math.PI * 3.2;
      const rr = 18 + t * 230;
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineWidth = 22;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.stroke();
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 80);
  g.addColorStop(0, 'rgba(0,0,30,0.9)');
  g.addColorStop(1, 'rgba(0,0,30,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 80, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

/** A vinyl record with a pink label. */
function record(): HTMLCanvasElement {
  const s = 256;
  const [c, ctx] = makeCanvas(s, s);
  ctx.translate(s / 2, s / 2);
  ctx.fillStyle = '#16121c';
  ctx.beginPath();
  ctx.arc(0, 0, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  for (let rr = 50; rr < 116; rr += 7) {
    ctx.beginPath();
    ctx.arc(0, 0, rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(0, 0, 90, -2.4, -1.6);
  ctx.stroke();
  ctx.fillStyle = '#ff5fa0';
  ctx.beginPath();
  ctx.arc(0, 0, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

/** A mirrored disco ball on its chain. */
function discoBall(): HTMLCanvasElement {
  const s = 256;
  const [c, ctx] = makeCanvas(s, s + 80);
  ctx.strokeStyle = '#8a8a9a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(s / 2, 0);
  ctx.lineTo(s / 2, 90);
  ctx.stroke();
  ctx.save();
  ctx.translate(s / 2, 80 + s / 2 - 10);
  ctx.beginPath();
  ctx.arc(0, 0, 110, 0, Math.PI * 2);
  ctx.clip();
  const r = rng(9);
  for (let y = -110; y < 110; y += 16) {
    for (let x = -110; x < 110; x += 16) {
      const d = Math.hypot(x + 30, y + 30) / 160;
      const v = Math.max(0, 1 - d) * 0.7 + r() * 0.35;
      ctx.fillStyle = `rgb(${Math.round(120 + v * 135)},${Math.round(130 + v * 125)},${Math.round(150 + v * 105)})`;
      ctx.fillRect(x + 1, y + 1, 14, 14);
    }
  }
  ctx.restore();
  ctx.lineWidth = 7;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(s / 2, 80 + s / 2 - 10, 110, 0, Math.PI * 2);
  ctx.stroke();
  return c;
}

/** A felled pine: trunk and branches, lying along x (the stump end at the left). */
function tree(): HTMLCanvasElement {
  const w = 1100;
  const h = 360;
  const [c, ctx] = makeCanvas(w, h);
  const cy = h / 2;
  // branches: layered green tiers, widest at the base
  for (let i = 0; i < 9; i++) {
    const x = 220 + i * 95;
    const spread = 150 - i * 13;
    ctx.beginPath();
    ctx.moveTo(x - 40, cy);
    ctx.lineTo(x + 70, cy - spread);
    ctx.lineTo(x + 120, cy);
    ctx.lineTo(x + 70, cy + spread);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, cy - spread, 0, cy + spread);
    g.addColorStop(0, '#5fb050');
    g.addColorStop(0.5, '#2f7a36');
    g.addColorStop(1, '#1a4a22');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#0f2a14';
    ctx.stroke();
  }
  // trunk
  ctx.beginPath();
  ctx.moveTo(0, cy - 34);
  ctx.lineTo(w - 40, cy - 6);
  ctx.lineTo(w - 40, cy + 6);
  ctx.lineTo(0, cy + 34);
  ctx.closePath();
  const tg = ctx.createLinearGradient(0, cy - 34, 0, cy + 34);
  tg.addColorStop(0, '#b07a46');
  tg.addColorStop(1, '#5a3418');
  ctx.fillStyle = tg;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // the cut end, rings showing
  ctx.fillStyle = '#e8c08a';
  ellipse(ctx, 6, cy, 16, 34);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 2;
  for (const rr of [8, 16, 24]) {
    ctx.beginPath();
    ctx.ellipse(6, cy, rr * 0.45, rr, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  return c;
}

/** A comic panel's starburst with "KRAK!" lettered across it (the act 7 peel). */
function krak(): HTMLCanvasElement {
  const w = 900;
  const h = 560;
  const [c, ctx] = makeCanvas(w, h);
  const r = rng(7);
  ctx.translate(w / 2, h / 2);
  const spikes = 18;
  const star = (ro: number, ri: number) => {
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2;
      const rr = i % 2 ? ri : ro * (0.85 + r() * 0.15);
      ctx.lineTo(Math.cos(a) * rr * 1.5, Math.sin(a) * rr);
    }
    ctx.closePath();
  };
  star(260, 170);
  ctx.fillStyle = '#e83a3a';
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.strokeStyle = INK;
  ctx.stroke();
  star(210, 150);
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
  // halftone dots
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(232,120,20,0.45)';
  for (let y = -240; y < 240; y += 18) for (let x = -400; x < 400; x += 18) {
    const d = Math.hypot(x, y * 1.4) / 320;
    ctx.beginPath();
    ctx.arc(x + ((y / 18) % 2) * 9, y, Math.max(0, d * 7), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // the lettering, tilted, outlined twice
  ctx.rotate(-0.12);
  ctx.font = '190px "Lilita One", "Fredoka", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 34;
  ctx.strokeStyle = INK;
  ctx.strokeText('KRAK!', 0, 10);
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText('KRAK!', 0, 10);
  const tg = ctx.createLinearGradient(0, -80, 0, 90);
  tg.addColorStop(0, '#5fd8ff');
  tg.addColorStop(1, '#2a6bd8');
  ctx.fillStyle = tg;
  ctx.fillText('KRAK!', 0, 10);
  return c;
}

/** A heart (heals). */
function heart(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(64, 64);
  ctx.beginPath();
  ctx.moveTo(32, 56);
  ctx.bezierCurveTo(4, 36, 6, 8, 22, 10);
  ctx.bezierCurveTo(28, 10, 32, 16, 32, 20);
  ctx.bezierCurveTo(32, 16, 36, 10, 42, 10);
  ctx.bezierCurveTo(58, 8, 60, 36, 32, 56);
  ctx.fillStyle = '#ff5a7a';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ellipse(ctx, 20, 20, 5, 3, -0.6);
  ctx.fill();
  return c;
}

/** A rose (the curtain call's thrown bouquet). */
function rose(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(64, 120);
  ctx.strokeStyle = '#2f7a36';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(32, 40);
  ctx.quadraticCurveTo(26, 80, 34, 116);
  ctx.stroke();
  ctx.fillStyle = '#4aa050';
  ellipse(ctx, 22, 78, 12, 6, -0.6);
  ctx.fill();
  const g = ctx.createRadialGradient(28, 22, 2, 32, 28, 26);
  g.addColorStop(0, '#ff8a9a');
  g.addColorStop(1, '#b0142a');
  ctx.fillStyle = g;
  ellipse(ctx, 32, 28, 22, 20);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(90,0,20,0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(32, 28, 10, 0.5, 4.5);
  ctx.stroke();
  return c;
}

const DRAW: Record<string, Draw> = {
  afx_curtain: curtain,
  afx_valance: valance,
  afx_spot: spot,
  afx_wave: wave,
  afx_snow: () => wall('snow'),
  afx_fire: () => wall('fire'),
  afx_ink: () => wall('ink'),
  afx_sauce: () => wall('sauce'),
  afx_cheese: () => wall('cheese'),
  afx_goldwall: () => wall('gold'),
  afx_frost: frostEdge,
  afx_marble: marble,
  afx_note: note,
  afx_drop: drop,
  afx_flake: flake,
  afx_bubble: bubble,
  afx_crack: crack,
  afx_streak: streak,
  afx_hex: hex,
  afx_rainbow: rainbow,
  afx_spiral: spiral,
  afx_record: record,
  afx_disco: discoBall,
  afx_tree: tree,
  afx_krak: krak,
  afx_heart: heart,
  afx_rose: rose,
};

/** Is this one of ours (drawn here on demand)? Gems are afx_gem_<hex>. */
export function isAfxKey(key: string): boolean {
  return key in DRAW || key.startsWith('afx_gem_');
}

/** Draw one of the textures above (or a gem: afx_gem_rrggbb). */
export function drawAfx(key: string): HTMLCanvasElement | null {
  if (key.startsWith('afx_gem_')) return gem('#' + key.slice(8));
  return DRAW[key]?.() ?? null;
}

export type { Ctx };
