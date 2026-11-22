// Props for Act 7 · Comics (src/game/bosses/act7.ts and src/game/acts/act7.ts): Lex Lugtoe's glass case, lock,
// price tag and SOLD stamp; the Goon's bomb; Doomstomp's bone spike; the six Infinity Sock stones; and the act's
// comic print kit (impact starburst, halftone tile, searchlight beam, rain streak, the blimp). Same style as
// src/art/eventArt.ts: thick ink outlines, gradients and a sheen, lit from the top left.
import { type Ctx, ellipse, makeCanvas, rgba, roundRect, shade } from '../../art/util';

const INK = '#2a1810';

function stroke(ctx: Ctx, lw = 4, col = INK): void {
  ctx.lineWidth = lw;
  ctx.strokeStyle = col;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
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

function shine(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.55, rot = -0.5): void {
  ellipse(ctx, x, y, rx, ry, rot);
  ctx.fillStyle = rgba('#ffffff', a);
  ctx.fill();
}

/** A spiky comic starburst path. */
function burstPath(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, n: number, inner: number, jag: number[]): void {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const k = i % 2 ? inner : 1 * (jag[(i >> 1) % jag.length] ?? 1);
    const x = cx + Math.cos(a) * rx * k;
    const y = cy + Math.sin(a) * ry * k;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
}

// ——— Lex Lugtoe ———

/** A glass display case that drops over an acquired pizza: gold plinth, bevelled glass, reflections. */
function glassCase(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(380, 330);
  // glass box (front face plus a lid) — translucent so the pizza shows through
  roundRect(ctx, 30, 30, 320, 250, 14);
  ctx.fillStyle = lin(ctx, 0, 30, 0, 280, [[0, 'rgba(200,240,255,0.32)'], [1, 'rgba(160,210,240,0.18)']]);
  ctx.fill();
  stroke(ctx, 6, rgba('#d8f2ff', 0.95));
  stroke(ctx, 2, rgba(INK, 0.6));
  // lid
  ctx.beginPath();
  ctx.moveTo(30, 44);
  ctx.lineTo(70, 14);
  ctx.lineTo(310, 14);
  ctx.lineTo(350, 44);
  ctx.closePath();
  ctx.fillStyle = 'rgba(220,248,255,0.45)';
  ctx.fill();
  stroke(ctx, 4, rgba('#ffffff', 0.9));
  // diagonal glass glints
  ctx.save();
  roundRect(ctx, 30, 30, 320, 250, 14);
  ctx.clip();
  for (const [x, w] of [[60, 40], [120, 14], [250, 26]] as const) {
    ctx.beginPath();
    ctx.moveTo(x, 30);
    ctx.lineTo(x + w, 30);
    ctx.lineTo(x + w - 120, 280);
    ctx.lineTo(x - 120, 280);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fill();
  }
  ctx.restore();
  // gold plinth
  roundRect(ctx, 10, 270, 360, 50, 10);
  ctx.fillStyle = lin(ctx, 0, 270, 0, 320, [[0, '#ffe28a'], [0.4, '#e0a83a'], [1, '#8a5a14']]);
  ctx.fill();
  stroke(ctx, 5);
  ctx.fillStyle = rgba('#ffffff', 0.45);
  ctx.fillRect(22, 276, 336, 5);
  // engraved plaque
  roundRect(ctx, 140, 282, 100, 28, 5);
  ctx.fillStyle = '#5a3a0a';
  ctx.fill();
  ctx.fillStyle = '#ffe28a';
  ctx.font = 'bold 18px Lilita One, Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ACQUIRED', 190, 297);
  return c;
}

/** The case's padlock: a chunky gold lock with a keyhole. */
function padlock(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(140, 170);
  // shackle
  ctx.beginPath();
  ctx.moveTo(36, 80);
  ctx.lineTo(36, 52);
  ctx.arc(70, 52, 34, Math.PI, 0);
  ctx.lineTo(104, 80);
  stroke(ctx, 22, INK);
  stroke(ctx, 14, '#c8ccd4');
  stroke(ctx, 4, '#f4f6fa');
  // body
  roundRect(ctx, 14, 74, 112, 86, 16);
  ctx.fillStyle = lin(ctx, 14, 74, 126, 160, [[0, '#ffe28a'], [0.45, '#f0b43a'], [1, '#9a6414']]);
  ctx.fill();
  stroke(ctx, 6);
  shine(ctx, 40, 96, 16, 8, 0.6, -0.3);
  // keyhole
  ctx.beginPath();
  ctx.arc(70, 108, 11, 0, Math.PI * 2);
  ctx.moveTo(64, 112);
  ctx.lineTo(60, 140);
  ctx.lineTo(80, 140);
  ctx.lineTo(76, 112);
  ctx.fillStyle = '#2a1810';
  ctx.fill();
  return c;
}

/** A paper price tag on a string. The price is written on it in play. */
function priceTag(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(150, 90);
  // string
  ctx.beginPath();
  ctx.moveTo(4, 10);
  ctx.quadraticCurveTo(14, 40, 30, 44);
  stroke(ctx, 3, '#8a6a4a');
  ctx.beginPath();
  ctx.moveTo(26, 45);
  ctx.lineTo(48, 14);
  ctx.lineTo(144, 14);
  ctx.lineTo(144, 76);
  ctx.lineTo(48, 76);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 26, 14, 144, 76, [[0, '#fffaf0'], [1, '#e8dcc0']]);
  ctx.fill();
  stroke(ctx, 4);
  ctx.beginPath();
  ctx.arc(44, 45, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#8a6a4a';
  ctx.fill();
  stroke(ctx, 2);
  return c;
}

/** A red rubber-stamp SOLD! that slams onto an acquired pizza. */
function soldStamp(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(260, 120);
  ctx.translate(130, 60);
  ctx.rotate(-0.12);
  roundRect(ctx, -118, -46, 236, 92, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();
  stroke(ctx, 10, '#d0202a');
  roundRect(ctx, -104, -34, 208, 68, 8);
  stroke(ctx, 4, '#d0202a');
  ctx.fillStyle = '#d0202a';
  ctx.font = '64px Lilita One, Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SOLD!', 0, 4);
  return c;
}

// ——— Goon Galoshes ———

/** A round cartoon bomb with a lit fuse. */
function bomb(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(130, 150);
  // fuse
  ctx.beginPath();
  ctx.moveTo(80, 44);
  ctx.bezierCurveTo(90, 24, 104, 30, 108, 14);
  stroke(ctx, 8, INK);
  stroke(ctx, 4, '#c8a070');
  // spark
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(108, 12);
    ctx.lineTo(108 + Math.cos(a) * 14, 12 + Math.sin(a) * 14);
    stroke(ctx, 3, k % 2 ? '#ffd23f' : '#ff7a1c');
  }
  // cap
  roundRect(ctx, 56, 36, 34, 20, 4);
  ctx.fillStyle = lin(ctx, 56, 36, 90, 56, [[0, '#8a909a'], [1, '#3a3e46']]);
  ctx.fill();
  stroke(ctx, 4);
  // ball
  ctx.beginPath();
  ctx.arc(64, 96, 48, 0, Math.PI * 2);
  ctx.fillStyle = rad(ctx, 64, 96, 48, [[0, '#5a5e6a'], [0.5, '#2a2c34'], [1, '#121318']]);
  ctx.fill();
  stroke(ctx, 6);
  shine(ctx, 46, 76, 14, 9, 0.55, -0.6);
  // a skull stencil, pulp-villain style
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.arc(70, 100, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(63, 108, 14, 9);
  ctx.fillStyle = '#121318';
  ctx.beginPath();
  ctx.arc(65, 99, 3.5, 0, Math.PI * 2);
  ctx.arc(75, 99, 3.5, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

// ——— Doomstomp ———

/** A bone spike bursting up through the table, with chips of tabletop around its base. */
function boneSpike(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(150, 240);
  ctx.beginPath();
  ctx.moveTo(30, 220);
  ctx.bezierCurveTo(36, 140, 58, 70, 78, 12);
  ctx.bezierCurveTo(92, 70, 112, 140, 120, 220);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 30, 0, 120, 0, [[0, '#fff8e6'], [0.45, '#efe6cf'], [1, '#a8987a']]);
  ctx.fill();
  stroke(ctx, 6);
  for (const y of [170, 130, 96]) {
    ctx.beginPath();
    const w = (220 - y) * 0.22;
    ctx.moveTo(75 - w, y);
    ctx.quadraticCurveTo(75, y + 6, 75 + w, y);
    stroke(ctx, 3, rgba(INK, 0.5));
  }
  shine(ctx, 62, 120, 6, 30, 0.5, 0.15);
  // splintered tabletop chunks at the base
  for (const [x, w, rot] of [[18, 30, -0.4], [112, 34, 0.35], [70, 26, 0]] as const) {
    ctx.save();
    ctx.translate(x + w / 2, 222);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w / 4, -14);
    ctx.lineTo(w / 2, -6);
    ctx.lineTo(w / 3, 10);
    ctx.closePath();
    ctx.fillStyle = '#8a5a32';
    ctx.fill();
    stroke(ctx, 3);
    ctx.restore();
  }
  return c;
}

// ——— Thanfoot ———

export const STONES = [
  { id: 'power', name: 'POWER', color: '#b04dff' },
  { id: 'space', name: 'SPACE', color: '#3a8dff' },
  { id: 'reality', name: 'REALITY', color: '#ff3a4a' },
  { id: 'soul', name: 'SOUL', color: '#ff9a1c' },
  { id: 'time', name: 'TIME', color: '#3ddc6a' },
  { id: 'mind', name: 'MIND', color: '#ffd23f' },
] as const;

/** A faceted gem with an inner glow. */
function stone(col: string): () => HTMLCanvasElement {
  return () => {
    const [c, ctx] = makeCanvas(110, 110);
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(55, 55, 10, 55, 55, 55);
    halo.addColorStop(0, rgba(col, 0.7));
    halo.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, 110, 110);
    ctx.globalCompositeOperation = 'source-over';
    const pts: [number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
      pts.push([55 + Math.cos(a) * 30, 55 + Math.sin(a) * 30]);
    }
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = rad(ctx, 55, 55, 34, [[0, shade(col, 0.6)], [0.5, col], [1, shade(col, -0.45)]]);
    ctx.fill();
    stroke(ctx, 5);
    // facets
    ctx.beginPath();
    for (const [x, y] of pts) {
      ctx.moveTo(55 + (x - 55) * 0.5, 55 + (y - 55) * 0.5);
      ctx.lineTo(x, y);
    }
    ctx.moveTo(55 + (pts[0][0] - 55) * 0.5, 55 + (pts[0][1] - 55) * 0.5);
    for (const [x, y] of pts) ctx.lineTo(55 + (x - 55) * 0.5, 55 + (y - 55) * 0.5);
    ctx.closePath();
    stroke(ctx, 2, rgba(shade(col, -0.6), 0.7));
    shine(ctx, 44, 42, 9, 5, 0.85, -0.6);
    return c;
  };
}

// ——— Comic print kit ———

/** A white comic starburst with a heavy outline; tinted per word in play. */
function starburst(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(420, 300);
  const jag = [1, 0.86, 1.06, 0.9, 1, 0.82, 1.08, 0.94, 0.88, 1.02, 0.92, 1];
  burstPath(ctx, 214, 156, 196, 136, 12, 0.66, jag);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
  burstPath(ctx, 206, 148, 196, 136, 12, 0.66, jag);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  stroke(ctx, 10);
  return c;
}

/** A tileable halftone dot field (white dots) for the act's print overlay. */
function halftoneTile(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#ffffff';
  const step = 16;
  for (let y = 0; y < 256; y += step) {
    for (let x = 0; x < 256; x += step) {
      const ox = (y / step) % 2 ? step / 2 : 0;
      ctx.beginPath();
      ctx.arc(x + ox, y + step / 2, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return c;
}

/** A soft searchlight beam: bright at the lamp (bottom), fading up into the sky. */
function searchlight(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(260, 900);
  ctx.beginPath();
  ctx.moveTo(110, 900);
  ctx.lineTo(150, 900);
  ctx.lineTo(260, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 900, 0, 0, [[0, 'rgba(255,250,220,0.75)'], [0.6, 'rgba(255,250,220,0.22)'], [1, 'rgba(255,250,220,0)']]);
  ctx.fill();
  return c;
}

function rainStreak(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(10, 70);
  ctx.fillStyle = lin(ctx, 0, 0, 0, 70, [[0, 'rgba(200,220,255,0)'], [1, 'rgba(220,235,255,0.9)']]);
  roundRect(ctx, 3, 0, 4, 70, 2);
  ctx.fill();
  return c;
}

/** The DAILY CRUST blimp that drifts over Metropizza with a scrolling-news gondola. */
function blimp(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(360, 150);
  // fins
  for (const dy of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(300, 66 + dy * 8);
    ctx.lineTo(352, 66 + dy * 46);
    ctx.lineTo(332, 66);
    ctx.closePath();
    ctx.fillStyle = '#c8323a';
    ctx.fill();
    stroke(ctx, 4);
  }
  ellipse(ctx, 170, 66, 150, 52);
  ctx.fillStyle = lin(ctx, 0, 14, 0, 118, [[0, '#f4f2ec'], [0.5, '#c8ccd4'], [1, '#7a808c']]);
  ctx.fill();
  stroke(ctx, 5);
  ctx.save();
  ellipse(ctx, 170, 66, 150, 52);
  ctx.clip();
  ctx.fillStyle = '#c8323a';
  ctx.fillRect(0, 54, 360, 26);
  ctx.fillStyle = '#ffffff';
  ctx.font = '22px Lilita One, Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('THE DAILY CRUST', 170, 68);
  ctx.restore();
  shine(ctx, 110, 36, 60, 10, 0.5, -0.05);
  // gondola
  roundRect(ctx, 136, 114, 70, 22, 6);
  ctx.fillStyle = '#4a4f5e';
  ctx.fill();
  stroke(ctx, 4);
  for (let x = 146; x < 200; x += 14) {
    ctx.fillStyle = '#ffd86a';
    ctx.fillRect(x, 120, 8, 8);
  }
  return c;
}

export const props: Record<string, () => HTMLCanvasElement> = {
  p_a7_case: glassCase,
  p_a7_lock: padlock,
  p_a7_tag: priceTag,
  p_a7_sold: soldStamp,
  p_a7_bomb: bomb,
  p_a7_spike: boneSpike,
  p_a7_burst: starburst,
  p_a7_halftone: halftoneTile,
  p_a7_searchlight: searchlight,
  p_a7_rain: rainStreak,
  p_a7_blimp: blimp,
  ...Object.fromEntries(STONES.map((s) => [`p_a7_stone_${s.id}`, stone(s.color)])),
};
