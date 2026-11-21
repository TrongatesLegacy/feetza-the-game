// Props for Batpeel's Gotham (src/game/bosses/gotham.ts and src/content/live/gotham.ts): Bunion's Venom vials and the
// crack of a breaking pizza; the Jokester's joke boxes (gift and bomb), laughing-gas cloud, music note, and his
// trick props (jack-in-the-box, cream pie, chattering teeth, a cartoon weight, the BANG! flag gun), his playing
// card; and the rooftop's pizza-slice signal and rain clouds. Same style as src/art/eventArt.ts: thick ink outlines,
// gradients and a sheen, lit from the top left. Every logo and emblem here is our own.
import { type Ctx, ellipse, makeCanvas, rgba, roundRect, shade } from '../../art/util';

const INK = '#2a1810';
const FONT = "'Lilita One', 'Fredoka', sans-serif";

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

/** A pizza slice pointing down, our own emblem (the signal, the card suit). */
function slicePath(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x - 30 * s, y - 24 * s);
  ctx.quadraticCurveTo(x, y - 40 * s, x + 30 * s, y - 24 * s);
  ctx.lineTo(x, y + 34 * s);
  ctx.closePath();
}

// ——— Bunion ———

/** A Venom vial: steel caps, thick glass, and a column of glowing green liquid (full, in play when it can be smacked). */
function vial(full: boolean): () => HTMLCanvasElement {
  return () => {
    const [c, ctx] = makeCanvas(90, 170);
    if (full) {
      const g = ctx.createRadialGradient(45, 85, 10, 45, 85, 80);
      g.addColorStop(0, 'rgba(140,255,110,0.55)');
      g.addColorStop(1, 'rgba(140,255,110,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 90, 170);
    }
    roundRect(ctx, 22, 28, 46, 114, 16);
    ctx.fillStyle = full ? lin(ctx, 22, 0, 68, 0, [[0, '#b8ff9a'], [0.45, '#5de83a'], [1, '#1f8a1a']]) : 'rgba(170,220,200,0.16)';
    ctx.fill();
    if (full) {
      // bubbles in the Venom
      for (const [bx, by, br] of [[36, 60, 5], [52, 92, 4], [40, 116, 6], [55, 50, 3]] as const) {
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(230,255,220,0.7)';
        ctx.fill();
      }
    }
    roundRect(ctx, 22, 28, 46, 114, 16);
    stroke(ctx, 5);
    // glass gleam
    roundRect(ctx, 29, 36, 9, 90, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fill();
    for (const y of [12, 136]) {
      roundRect(ctx, 16, y, 58, 22, 6);
      ctx.fillStyle = lin(ctx, 0, y, 0, y + 22, [[0, '#e8ecf2'], [0.5, '#9aa3ad'], [1, '#5a626c']]);
      ctx.fill();
      stroke(ctx, 4);
    }
    return c;
  };
}

/** A crack splitting a pizza (drawn over it while Bunion tries to break it). */
function crack(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(260, 160);
  ctx.beginPath();
  ctx.moveTo(130, 4);
  for (const [x, y] of [[118, 34], [140, 56], [112, 80], [138, 104], [120, 130], [132, 156]]) ctx.lineTo(x, y);
  stroke(ctx, 12, INK);
  stroke(ctx, 4, '#fff2c0');
  for (const [x0, y0, x1, y1] of [[140, 56, 186, 44], [112, 80, 70, 96], [138, 104, 180, 122]]) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    stroke(ctx, 7, INK);
    stroke(ctx, 2.5, '#fff2c0');
  }
  return c;
}

// ——— The Jokester ———

/** A joke box. A gift: gold bow and sparkles on a jolly wrap. A bomb: a crumpled red-and-black wrap, a lit fuse and a tag that says TICK. */
function box(bomb: boolean): () => HTMLCanvasElement {
  return () => {
    const [c, ctx] = makeCanvas(200, 200);
    const wrap = bomb ? '#c8202a' : '#7a3ab0';
    const band = bomb ? '#1a1418' : '#ffd23f';
    // body
    roundRect(ctx, 34, 80, 132, 100, 10);
    ctx.fillStyle = lin(ctx, 34, 80, 166, 180, [[0, shade(wrap, 0.3)], [0.5, wrap], [1, shade(wrap, -0.4)]]);
    ctx.fill();
    // wrap pattern: dots on a gift, black stripes on a bomb
    ctx.save();
    roundRect(ctx, 34, 80, 132, 100, 10);
    ctx.clip();
    if (bomb) {
      ctx.fillStyle = rgba('#1a1418', 0.75);
      for (let x = 10; x < 200; x += 34) {
        ctx.beginPath();
        ctx.moveTo(x, 80);
        ctx.lineTo(x + 16, 80);
        ctx.lineTo(x - 14, 180);
        ctx.lineTo(x - 30, 180);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      ctx.fillStyle = rgba('#9be23a', 0.85);
      for (let y = 92; y < 180; y += 22) for (let x = 44 + ((y / 22) % 2) * 11; x < 166; x += 22) {
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    roundRect(ctx, 34, 80, 132, 100, 10);
    stroke(ctx, 6);
    // lid
    roundRect(ctx, 26, 62, 148, 30, 8);
    ctx.fillStyle = lin(ctx, 26, 62, 174, 92, [[0, shade(wrap, 0.4)], [1, shade(wrap, -0.2)]]);
    ctx.fill();
    stroke(ctx, 6);
    // ribbon
    ctx.fillStyle = lin(ctx, 0, 62, 0, 180, [[0, shade(band, 0.3)], [1, shade(band, -0.3)]]);
    ctx.fillRect(90, 62, 20, 118);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.strokeRect(90, 62, 20, 118);
    if (bomb) {
      // the fuse sticking out of the lid, lit
      ctx.beginPath();
      ctx.moveTo(100, 62);
      ctx.bezierCurveTo(100, 40, 126, 44, 126, 22);
      stroke(ctx, 7);
      stroke(ctx, 3.5, '#c8a878');
      const s = ctx.createRadialGradient(126, 18, 0, 126, 18, 22);
      s.addColorStop(0, 'rgba(255,255,200,1)');
      s.addColorStop(0.4, 'rgba(255,170,40,0.9)');
      s.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = s;
      ctx.fillRect(100, 0, 52, 44);
      // the TICK tag on a string
      ctx.beginPath();
      ctx.moveTo(160, 90);
      ctx.lineTo(178, 116);
      stroke(ctx, 2.5);
      ctx.save();
      ctx.translate(176, 130);
      ctx.rotate(0.3);
      roundRect(ctx, -22, -14, 44, 28, 5);
      ctx.fillStyle = '#fbf2d8';
      ctx.fill();
      stroke(ctx, 3);
      ctx.font = `20px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#c8202a';
      ctx.fillText('TICK', 0, 1);
      ctx.restore();
    } else {
      // a big gold bow
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(100, 60);
        ctx.bezierCurveTo(100 + s * 20, 20, 100 + s * 64, 28, 100 + s * 50, 56);
        ctx.bezierCurveTo(100 + s * 40, 70, 100 + s * 16, 66, 100, 60);
        ctx.closePath();
        ctx.fillStyle = lin(ctx, 100, 20, 100 + s * 60, 70, [[0, '#fff0a0'], [1, '#d8901a']]);
        ctx.fill();
        stroke(ctx, 4.5);
      }
      ellipse(ctx, 100, 58, 12, 10);
      ctx.fillStyle = '#ffd23f';
      ctx.fill();
      stroke(ctx, 4);
      // sparkles
      for (const [sx, sy, sr] of [[34, 50, 10], [172, 64, 8], [160, 30, 6]] as const) {
        ctx.beginPath();
        ctx.moveTo(sx, sy - sr);
        ctx.lineTo(sx + sr * 0.3, sy - sr * 0.3);
        ctx.lineTo(sx + sr, sy);
        ctx.lineTo(sx + sr * 0.3, sy + sr * 0.3);
        ctx.lineTo(sx, sy + sr);
        ctx.lineTo(sx - sr * 0.3, sy + sr * 0.3);
        ctx.lineTo(sx - sr, sy);
        ctx.lineTo(sx - sr * 0.3, sy - sr * 0.3);
        ctx.closePath();
        ctx.fillStyle = '#fff6c0';
        ctx.fill();
        stroke(ctx, 2);
      }
    }
    shine(ctx, 62, 104, 18, 8, 0.35);
    return c;
  };
}

/** A laughing-gas cloud: purple and green puffs with a wide, grinning face. */
function gas(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(340, 240);
  const puffs: [number, number, number, string][] = [
    [90, 140, 70, '#a46ad8'],
    [170, 110, 86, '#b88ae8'],
    [250, 140, 70, '#a46ad8'],
    [130, 170, 60, '#8fd05a'],
    [220, 176, 58, '#8fd05a'],
  ];
  ctx.filter = 'blur(1px)';
  for (const [x, y, r, col] of puffs) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = rad(ctx, x, y, r, [[0, rgba(shade(col, 0.4), 0.95)], [0.8, rgba(col, 0.85)], [1, rgba(col, 0.3)]]);
    ctx.fill();
  }
  ctx.filter = 'none';
  // the grin
  ctx.beginPath();
  ctx.moveTo(118, 140);
  ctx.quadraticCurveTo(170, 196, 222, 140);
  ctx.quadraticCurveTo(170, 166, 118, 140);
  ctx.closePath();
  ctx.fillStyle = rgba('#3a0a4a', 0.75);
  ctx.fill();
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(170 + s * 34, 104, 10, Math.PI * 1.1, Math.PI * 1.9);
    stroke(ctx, 6, rgba('#3a0a4a', 0.75));
  }
  return c;
}

/** A bouncing music note, for feet dancing in the gas. */
function note(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(60, 80);
  ellipse(ctx, 22, 62, 14, 10, -0.4);
  ctx.fillStyle = '#9be23a';
  ctx.fill();
  stroke(ctx, 4);
  ctx.beginPath();
  ctx.moveTo(34, 58);
  ctx.lineTo(34, 10);
  ctx.quadraticCurveTo(48, 20, 52, 34);
  stroke(ctx, 6);
  stroke(ctx, 2.5, '#9be23a');
  return c;
}

/** A jack-in-the-box, closed, with its crank. */
function jackBox(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(180, 180);
  roundRect(ctx, 30, 50, 120, 110, 10);
  ctx.fillStyle = lin(ctx, 30, 50, 150, 160, [[0, '#ffd86a'], [1, '#d8901a']]);
  ctx.fill();
  stroke(ctx, 6);
  // a question mark of our own on the side
  ctx.font = `76px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = INK;
  ctx.strokeText('?', 90, 108);
  ctx.fillStyle = '#7a3ab0';
  ctx.fillText('?', 90, 108);
  roundRect(ctx, 24, 36, 132, 22, 6);
  ctx.fillStyle = '#c8202a';
  ctx.fill();
  stroke(ctx, 5);
  // the crank
  ctx.beginPath();
  ctx.moveTo(150, 104);
  ctx.lineTo(170, 104);
  ctx.lineTo(170, 80);
  stroke(ctx, 7);
  stroke(ctx, 3, '#c9cfd8');
  ellipse(ctx, 170, 76, 8, 8);
  ctx.fillStyle = '#c8202a';
  ctx.fill();
  stroke(ctx, 3);
  shine(ctx, 56, 70, 14, 6, 0.4);
  return c;
}

/** The jack sprung: a grinning clown head on a spring, bursting from the open box. */
function jackOut(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(200, 300);
  // the box below
  roundRect(ctx, 40, 190, 120, 100, 10);
  ctx.fillStyle = lin(ctx, 40, 190, 160, 290, [[0, '#ffd86a'], [1, '#d8901a']]);
  ctx.fill();
  stroke(ctx, 6);
  // the spring
  ctx.beginPath();
  for (let i = 0; i <= 8; i++) {
    const y = 196 - i * 11;
    ctx.lineTo(100 + (i % 2 ? 26 : -26), y);
  }
  stroke(ctx, 8);
  stroke(ctx, 3.5, '#c9cfd8');
  // the head
  ellipse(ctx, 100, 72, 50, 54);
  ctx.fillStyle = rad(ctx, 100, 72, 54, [[0, '#ffffff'], [1, '#e8dcc8']]);
  ctx.fill();
  stroke(ctx, 6);
  // green hair tufts
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(100 + s * 50, 50, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#9be23a';
    ctx.fill();
    stroke(ctx, 4);
  }
  for (const s of [-1, 1]) {
    ellipse(ctx, 100 + s * 18, 62, 7, 10);
    ctx.fillStyle = INK;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(100, 80, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#e0202a';
  ctx.fill();
  stroke(ctx, 3);
  ctx.beginPath();
  ctx.moveTo(66, 92);
  ctx.quadraticCurveTo(100, 132, 134, 92);
  ctx.quadraticCurveTo(100, 108, 66, 92);
  ctx.closePath();
  ctx.fillStyle = '#e0202a';
  ctx.fill();
  stroke(ctx, 4);
  shine(ctx, 80, 44, 12, 7, 0.6);
  return c;
}

/** A cream pie in a tin. */
function pie(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(160, 110);
  ellipse(ctx, 80, 70, 70, 30);
  ctx.fillStyle = lin(ctx, 0, 50, 0, 100, [[0, '#d8dde4'], [1, '#7a828c']]);
  ctx.fill();
  stroke(ctx, 5);
  // the cream: a cloud of blobs
  for (const [x, y, r] of [[44, 54, 22], [80, 44, 28], [116, 54, 22], [62, 60, 20], [100, 60, 20]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = rad(ctx, x, y, r, [[0, '#ffffff'], [1, '#f2e8d8']]);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(22, 64);
  ctx.bezierCurveTo(30, 18, 130, 18, 138, 64);
  stroke(ctx, 4, rgba(INK, 0.6));
  ctx.beginPath();
  ctx.arc(80, 26, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#e0202a';
  ctx.fill();
  stroke(ctx, 3);
  shine(ctx, 72, 22, 3, 2, 0.8);
  return c;
}

/** A cream splat over the screen. */
function cream(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(460, 380);
  ctx.beginPath();
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const r = i % 2 ? 140 : 190 + (i % 3) * 14;
    const x = 230 + Math.cos(a) * r;
    const y = 190 + Math.sin(a) * r * 0.82;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = rad(ctx, 230, 190, 200, [[0, '#ffffff'], [0.8, '#f6eee0'], [1, '#e8dcc8']]);
  ctx.fill();
  stroke(ctx, 6, rgba(INK, 0.5));
  ctx.beginPath();
  ctx.arc(230, 170, 20, 0, Math.PI * 2);
  ctx.fillStyle = '#e0202a';
  ctx.fill();
  stroke(ctx, 4);
  return c;
}

/** Wind-up chattering teeth on little orange feet. */
function teeth(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(150, 120);
  for (const x of [46, 104]) {
    ellipse(ctx, x, 104, 22, 10);
    ctx.fillStyle = '#ff9a2a';
    ctx.fill();
    stroke(ctx, 4);
  }
  // gums and teeth
  roundRect(ctx, 18, 30, 114, 66, 28);
  ctx.fillStyle = lin(ctx, 0, 30, 0, 96, [[0, '#ff7a9a'], [1, '#c83a5a']]);
  ctx.fill();
  stroke(ctx, 5);
  ctx.fillStyle = '#fffaf0';
  for (let i = 0; i < 6; i++) {
    roundRect(ctx, 28 + i * 16, 40, 13, 20, 4);
    ctx.fill();
    roundRect(ctx, 28 + i * 16, 66, 13, 20, 4);
    ctx.fill();
  }
  ctx.fillStyle = '#3a0a1a';
  ctx.fillRect(28, 60, 94, 6);
  // the wind-up key
  ctx.beginPath();
  ctx.moveTo(132, 60);
  ctx.lineTo(146, 60);
  stroke(ctx, 6);
  ellipse(ctx, 146, 48, 6, 12);
  ctx.fillStyle = '#c9cfd8';
  ctx.fill();
  stroke(ctx, 3);
  shine(ctx, 44, 40, 10, 4, 0.5);
  return c;
}

/** A cartoon weight: a black trapezoid stamped 10 TON. */
function weight(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(200, 180);
  ctx.beginPath();
  ctx.moveTo(56, 40);
  ctx.lineTo(144, 40);
  ctx.lineTo(186, 170);
  ctx.lineTo(14, 170);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 14, 40, 186, 170, [[0, '#6a6e78'], [0.5, '#3a3d46'], [1, '#1a1b20']]);
  ctx.fill();
  stroke(ctx, 6);
  ctx.beginPath();
  ctx.arc(100, 32, 22, Math.PI, 0);
  stroke(ctx, 12);
  stroke(ctx, 6, '#6a6e78');
  ctx.font = `44px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('10 TON', 100, 120);
  shine(ctx, 70, 64, 14, 6, 0.3);
  return c;
}

/** A toy pistol aimed left, with a flag rolled up in the barrel. */
function gun(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(200, 130);
  roundRect(ctx, 20, 30, 140, 34, 10);
  ctx.fillStyle = lin(ctx, 0, 30, 0, 64, [[0, '#b88ae8'], [1, '#5b2a86']]);
  ctx.fill();
  stroke(ctx, 5);
  ctx.beginPath();
  ctx.moveTo(120, 60);
  ctx.lineTo(160, 60);
  ctx.lineTo(176, 120);
  ctx.lineTo(136, 120);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 120, 60, 176, 120, [[0, '#9be23a'], [1, '#4a8a1a']]);
  ctx.fill();
  stroke(ctx, 5);
  ellipse(ctx, 20, 47, 8, 15);
  ctx.fillStyle = INK;
  ctx.fill();
  shine(ctx, 60, 38, 22, 4, 0.4, 0);
  return c;
}

/** The BANG! flag popped out of the gun. */
function bang(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(260, 130);
  ctx.beginPath();
  ctx.moveTo(250, 64);
  ctx.lineTo(210, 64);
  stroke(ctx, 6);
  ctx.beginPath();
  ctx.moveTo(14, 20);
  ctx.lineTo(210, 14);
  ctx.lineTo(214, 112);
  ctx.lineTo(18, 104);
  ctx.closePath();
  ctx.fillStyle = '#fbf6ea';
  ctx.fill();
  stroke(ctx, 6);
  ctx.font = `68px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = INK;
  ctx.strokeText('BANG!', 114, 64);
  ctx.fillStyle = '#e0202a';
  ctx.fillText('BANG!', 114, 64);
  return c;
}

/** A playing card with the slice suit (our own), for his death and his toss. */
function card(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(70, 96);
  roundRect(ctx, 5, 5, 60, 86, 8);
  ctx.fillStyle = '#fbf6ea';
  ctx.fill();
  stroke(ctx, 4);
  slicePath(ctx, 35, 46, 0.6);
  ctx.fillStyle = '#e0202a';
  ctx.fill();
  stroke(ctx, 2.5);
  ctx.font = `20px ${FONT}`;
  ctx.fillStyle = '#5b2a86';
  ctx.fillText('J', 11, 24);
  return c;
}

// ——— The rooftop ———

/** The signal on the clouds: a bright oval with a pizza-slice shape cut in it (an emblem of our own). */
function signal(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(360, 240);
  const g = ctx.createRadialGradient(180, 120, 20, 180, 120, 170);
  g.addColorStop(0, 'rgba(255,248,200,0.95)');
  g.addColorStop(0.7, 'rgba(255,236,150,0.8)');
  g.addColorStop(1, 'rgba(255,230,140,0)');
  ctx.fillStyle = g;
  ellipse(ctx, 180, 120, 172, 112);
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  slicePath(ctx, 180, 118, 2.3);
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fill();
  // pepperoni holes stay lit
  ctx.globalCompositeOperation = 'source-over';
  for (const [x, y] of [[164, 92], [198, 96], [180, 128]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,240,170,0.8)';
    ctx.fill();
  }
  return c;
}

/** A soft dark rain cloud (tinted in play). */
function cloud(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(520, 220);
  ctx.filter = 'blur(4px)';
  for (const [x, y, r] of [[110, 140, 70], [200, 110, 90], [300, 100, 100], [400, 130, 76], [250, 150, 80], [160, 160, 60], [360, 160, 64]] as const) {
    const g = ctx.createRadialGradient(x, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.7, 'rgba(225,230,245,0.92)');
    g.addColorStop(1, 'rgba(210,215,235,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

export const props: Record<string, () => HTMLCanvasElement> = {
  p_gt_vial: vial(true),
  p_gt_glass: vial(false),
  p_gt_crack: crack,
  p_gt_gift: box(false),
  p_gt_bomb: box(true),
  p_gt_gas: gas,
  p_gt_note: note,
  p_gt_jack: jackBox,
  p_gt_jackout: jackOut,
  p_gt_pie: pie,
  p_gt_cream: cream,
  p_gt_teeth: teeth,
  p_gt_weight: weight,
  p_gt_gun: gun,
  p_gt_bang: bang,
  p_gt_card: card,
  p_gt_signal: signal,
  p_gt_cloud: cloud,
};
