// Props for Stages 1–3 (Head Waiter, Bigfoot, Chimney Sweep, Iron Heel, Sandcastle Sam, King Honk).
// Same style as src/art/eventArt.ts: thick dark-brown outlines, gradients and a highlight sheen.
import { type Ctx, ellipse, makeCanvas, rgba, rng, roundRect } from '../../art/util';
import { inkOf } from '../../art/style/kit';
import { Sil } from '../../art/style/sil';
import { HW_SALVER, HW_TRAY } from '../style/bosses-3';
import { DEL_TRAY, drawDeliveryTray } from '../style/delivery';
import { paintSalver, paintSalverBack, salverPath } from '../style/salver';

const INK = '#2a1810';

function stroke(ctx: Ctx, lw = 4, col = INK): void {
  ctx.lineWidth = lw;
  ctx.strokeStyle = col;
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

/** Bigfoot's quick-time button: a big paw medallion in the middle of the ring (the rings are drawn live). */
function qteTarget(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(200, 200);
  ctx.beginPath();
  ctx.arc(100, 100, 84, 0, Math.PI * 2);
  ctx.fillStyle = rad(ctx, 100, 100, 90, [[0, '#fffaf0'], [0.75, '#f4e4c4'], [1, '#d8bf92']]);
  ctx.fill();
  stroke(ctx, 8);
  ctx.beginPath();
  ctx.arc(100, 100, 70, 0, Math.PI * 2);
  stroke(ctx, 3, rgba(INK, 0.3));
  // a brown paw print
  const paw = '#6a4026';
  ctx.beginPath();
  ctx.ellipse(100, 116, 30, 25, 0, 0, Math.PI * 2);
  ctx.fillStyle = paw;
  ctx.fill();
  stroke(ctx, 4);
  for (const [x, y, r] of [[64, 82, 12], [84, 64, 13], [116, 64, 13], [136, 82, 12]]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = paw;
    ctx.fill();
    stroke(ctx, 4);
  }
  shine(ctx, 72, 62, 22, 10, 0.5);
  return c;
}

/** The bear trap. 0-2: a dashed blueprint of the open trap with the parts still missing (0 is just the
 * base and a heap of parts); 3: built, bright and open; 4: snapped shut. */
function bearTrap(stage: number): () => HTMLCanvasElement {
  return () => {
    const [c, ctx] = makeCanvas(400, 240);
    const cx = 200;
    const by = 196;
    const steel = (y0: number, y1: number, bright = true) =>
      lin(ctx, 0, y0, 0, y1, bright ? [[0, '#ffffff'], [0.35, '#d4dae2'], [0.75, '#8a929e'], [1, '#5a626e']] : [[0, '#b8c0ca'], [1, '#5a626e']]);
    const ghost = () => {
      // blueprint lines: where the missing parts go
      ctx.setLineDash([16, 11]);
      stroke(ctx, 10, rgba(INK, 0.55));
      stroke(ctx, 5, '#bfe8ff');
      ctx.setLineDash([]);
    };
    const jawPath = (side: number, open: number) => {
      // a half-ring of jaw hinged at the base; open = 1 stands right up
      const h = 24 + 118 * open;
      ctx.beginPath();
      ctx.moveTo(cx, by);
      ctx.quadraticCurveTo(cx + side * 150, by - 8, cx + side * 160, by - h * 0.25);
      ctx.quadraticCurveTo(cx + side * 152, by - h, cx + side * 10, by - h);
      ctx.lineTo(cx, by - h + 12);
      ctx.closePath();
      return h;
    };
    const jaw = (side: number, open: number, built: boolean) => {
      const h = jawPath(side, open);
      if (!built) return ghost();
      ctx.fillStyle = steel(by - h, by);
      ctx.fill();
      stroke(ctx, 6);
      // a hollow in the middle of the jaw
      ctx.beginPath();
      ctx.moveTo(cx + side * 22, by - 14);
      ctx.quadraticCurveTo(cx + side * 120, by - 16, cx + side * 128, by - h * 0.3);
      ctx.quadraticCurveTo(cx + side * 120, by - h + 30, cx + side * 26, by - h + 30);
      ctx.closePath();
      ctx.fillStyle = rgba('#3a404a', 0.55);
      ctx.fill();
      stroke(ctx, 3.5);
      // teeth along the top edge
      for (let i = 0; i < 6; i++) {
        const x = cx + side * (20 + i * 22);
        const y = by - h + (i / 6) * h * 0.5;
        ctx.beginPath();
        ctx.moveTo(x - 9, y + 5);
        ctx.lineTo(x, y - 22);
        ctx.lineTo(x + 9, y + 5);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        stroke(ctx, 3.5);
      }
      shine(ctx, cx + side * 80, by - h + 18, 26, 6, 0.6, side * -0.15);
    };
    const base = (bright: boolean) => {
      ellipse(ctx, cx, by + 8, 168, 30);
      ctx.fillStyle = steel(by - 22, by + 38, bright);
      ctx.fill();
      stroke(ctx, 6);
      // the red trigger plate
      ellipse(ctx, cx, by + 2, 46, 13);
      ctx.fillStyle = bright ? lin(ctx, 0, by - 11, 0, by + 15, [[0, '#ff7a5a'], [1, '#b8301a']]) : '#8a5a4a';
      ctx.fill();
      stroke(ctx, 4);
      if (bright) shine(ctx, cx - 14, by - 3, 14, 4, 0.7, 0);
    };
    const spring = (x: number, y: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) ctx.ellipse(x, y - i * 9, 24, 7, 0, 0, Math.PI * 2);
      stroke(ctx, 8);
      stroke(ctx, 4, '#b8c0ca');
    };
    const bolt = (x: number, y: number) => {
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fillStyle = rad(ctx, x, y, 10, [[0, '#ffffff'], [1, '#7a828e']]);
      ctx.fill();
      stroke(ctx, 3.5);
    };
    if (stage <= 2) {
      // unbuilt: dull base, blueprint jaws, parts lying about
      base(false);
      jaw(-1, 1, stage >= 1);
      jaw(1, 1, stage >= 2);
      if (stage === 0) {
        ctx.save();
        ctx.translate(108, 178);
        ctx.rotate(-0.35);
        roundRect(ctx, -54, -12, 108, 24, 10);
        ctx.fillStyle = steel(-12, 12, false);
        ctx.fill();
        stroke(ctx, 5);
        ctx.restore();
      }
      if (stage <= 1) spring(312, 196);
      for (const [x, y] of stage === 0 ? [[166, 214], [240, 220], [64, 214]] : [[260, 220]]) bolt(x, y);
    } else if (stage === 3) {
      base(true);
      jaw(-1, 1, true);
      jaw(1, 1, true);
    } else {
      base(true);
      // shut: the two jaws meet in an arch with their teeth locked together down the middle
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx, by);
        ctx.lineTo(cx + sd * 150, by);
        ctx.quadraticCurveTo(cx + sd * 146, by - 130, cx, by - 140);
        ctx.closePath();
        ctx.fillStyle = steel(by - 140, by);
        ctx.fill();
        stroke(ctx, 6);
      }
      const zig = () => {
        ctx.beginPath();
        ctx.moveTo(cx, by - 132);
        for (let y = by - 132, k = 0; y < by - 6; y += 16, k++) ctx.lineTo(cx + (k % 2 ? -14 : 14), y + 8);
        ctx.lineTo(cx, by - 4);
      };
      zig();
      stroke(ctx, 9);
      zig();
      stroke(ctx, 4.5, '#ffffff');
      shine(ctx, cx - 70, by - 96, 30, 8, 0.6, -0.5);
    }
    return c;
  };
}

/** A tall soot column that hides a lane. */
function sootColumn(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(340, 820);
  const r = rng(77);
  ctx.fillStyle = lin(ctx, 0, 0, 0, 820, [[0, 'rgba(40,38,44,0.55)'], [0.5, 'rgba(48,46,52,0.82)'], [1, 'rgba(30,28,34,0.9)']]);
  roundRect(ctx, 40, 30, 260, 770, 90);
  ctx.fill();
  // billowing edges
  for (let i = 0; i < 70; i++) {
    const side = i % 2 ? 1 : -1;
    const y = 40 + r() * 760;
    const x = 170 + side * (110 + r() * 40);
    const rr = 34 + r() * 30;
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.fillStyle = rgba(r() < 0.5 ? '#3a3a40' : '#55555c', 0.55);
    ctx.fill();
  }
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    ctx.arc(70 + r() * 200, 40 + r() * 760, 20 + r() * 34, 0, Math.PI * 2);
    ctx.fillStyle = rgba('#6a6a72', 0.22);
    ctx.fill();
  }
  // a few embers so it reads as chimney soot, not shadow
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    ctx.arc(60 + r() * 220, 60 + r() * 720, 3 + r() * 3, 0, Math.PI * 2);
    ctx.fillStyle = rgba('#ff9a4a', 0.75);
    ctx.fill();
  }
  return c;
}

/** A brick chimney stack that rises under a pizza. */
function chimney(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(220, 420);
  roundRect(ctx, 14, 0, 192, 420, 6);
  ctx.fillStyle = lin(ctx, 14, 0, 206, 0, [[0, '#8a3a24'], [0.5, '#b8583a'], [1, '#7a321e']]);
  ctx.fill();
  stroke(ctx, 6);
  for (let row = 0; row < 14; row++) {
    const y = 4 + row * 30;
    ctx.beginPath();
    ctx.moveTo(16, y);
    ctx.lineTo(204, y);
    stroke(ctx, 3, rgba('#f0d8c0', 0.55));
    for (let x = row % 2 ? 44 : 74; x < 200; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 30);
      stroke(ctx, 3, rgba('#f0d8c0', 0.55));
    }
  }
  // a soot-stained cap at the top
  roundRect(ctx, 0, 0, 220, 30, 6);
  ctx.fillStyle = lin(ctx, 0, 0, 0, 30, [[0, '#5a5a60'], [1, '#2a2a30']]);
  ctx.fill();
  stroke(ctx, 5);
  return c;
}

/** Iron Heel's rocket launcher on a little rail cart. */
function launcher(): HTMLCanvasElement {
  // drawn at 1.4x so it stays crisp at its bigger on-screen size
  const [c, ctx] = makeCanvas(280, 238);
  ctx.scale(1.4, 1.4);
  // wheels
  for (const x of [56, 144]) {
    ctx.beginPath();
    ctx.arc(x, 146, 18, 0, Math.PI * 2);
    ctx.fillStyle = rad(ctx, x, 146, 18, [[0, '#9aa2ae'], [1, '#3a404a']]);
    ctx.fill();
    stroke(ctx, 4);
  }
  roundRect(ctx, 24, 104, 152, 40, 12);
  ctx.fillStyle = lin(ctx, 0, 104, 0, 144, [[0, '#f0c040'], [1, '#b8801a']]);
  ctx.fill();
  stroke(ctx, 5);
  // hazard stripes
  ctx.save();
  roundRect(ctx, 24, 104, 152, 40, 12);
  ctx.clip();
  for (let x = 10; x < 200; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, 144);
    ctx.lineTo(x + 14, 104);
    ctx.lineTo(x + 26, 104);
    ctx.lineTo(x + 12, 144);
    ctx.closePath();
    ctx.fillStyle = rgba('#2a1810', 0.75);
    ctx.fill();
  }
  ctx.restore();
  roundRect(ctx, 24, 104, 152, 40, 12);
  stroke(ctx, 5);
  // three tubes pointing up
  for (const x of [62, 100, 138]) {
    roundRect(ctx, x - 17, 16, 34, 92, 10);
    ctx.fillStyle = lin(ctx, x - 17, 0, x + 17, 0, [[0, '#5a6270'], [0.45, '#c8d0da'], [1, '#4a525e']]);
    ctx.fill();
    stroke(ctx, 4.5);
    ctx.beginPath();
    ctx.ellipse(x, 18, 15, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a20';
    ctx.fill();
    stroke(ctx, 3);
    // a red rocket tip peeking out
    ctx.beginPath();
    ctx.moveTo(x - 9, 18);
    ctx.lineTo(x, 2);
    ctx.lineTo(x + 9, 18);
    ctx.closePath();
    ctx.fillStyle = '#e5402a';
    ctx.fill();
    stroke(ctx, 3);
  }
  shine(ctx, 54, 50, 6, 22, 0.5, 0);
  return c;
}

function rocket(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(60, 150);
  // flame
  ctx.beginPath();
  ctx.moveTo(18, 112);
  ctx.quadraticCurveTo(30, 160, 42, 112);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 110, 0, 150, [[0, '#fff0a0'], [1, 'rgba(255,120,40,0)']]);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(30, 4);
  ctx.quadraticCurveTo(48, 30, 46, 112);
  ctx.lineTo(14, 112);
  ctx.quadraticCurveTo(12, 30, 30, 4);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 14, 0, 46, 0, [[0, '#c8d0da'], [0.5, '#ffffff'], [1, '#8a929e']]);
  ctx.fill();
  stroke(ctx, 4);
  ctx.beginPath();
  ctx.moveTo(30, 4);
  ctx.quadraticCurveTo(40, 18, 42, 34);
  ctx.lineTo(18, 34);
  ctx.quadraticCurveTo(20, 18, 30, 4);
  ctx.closePath();
  ctx.fillStyle = '#e5402a';
  ctx.fill();
  stroke(ctx, 3.5);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(30 + s * 15, 86);
    ctx.lineTo(30 + s * 28, 116);
    ctx.lineTo(30 + s * 15, 112);
    ctx.closePath();
    ctx.fillStyle = '#e5402a';
    ctx.fill();
    stroke(ctx, 3);
  }
  return c;
}

/** The glowing ball of a charging power blast (drawn additive-friendly: bright core, soft edge). */
function blastOrb(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(256, 256);
  const g = ctx.createRadialGradient(128, 128, 4, 128, 128, 126);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.22, 'rgba(200,250,255,0.95)');
  g.addColorStop(0.5, 'rgba(80,200,255,0.55)');
  g.addColorStop(1, 'rgba(40,120,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(128, 128, 126, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

/** The beam the blast fires: a bright core with a blue glow, tall and narrow (stretched to fit). */
function blastBeam(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(200, 64);
  const g = ctx.createLinearGradient(0, 0, 200, 0);
  g.addColorStop(0, 'rgba(40,120,255,0)');
  g.addColorStop(0.25, 'rgba(80,200,255,0.7)');
  g.addColorStop(0.42, 'rgba(220,250,255,1)');
  g.addColorStop(0.58, 'rgba(220,250,255,1)');
  g.addColorStop(0.75, 'rgba(80,200,255,0.7)');
  g.addColorStop(1, 'rgba(40,120,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 200, 64);
  return c;
}

/** A warning circle for a steam vent about to burst. */
function ventWarn(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(360, 360);
  ctx.beginPath();
  ctx.arc(180, 180, 168, 0, Math.PI * 2);
  ctx.fillStyle = rgba('#ffffff', 0.14);
  ctx.fill();
  ctx.setLineDash([26, 18]);
  ctx.beginPath();
  ctx.arc(180, 180, 164, 0, Math.PI * 2);
  stroke(ctx, 14);
  ctx.beginPath();
  ctx.arc(180, 180, 164, 0, Math.PI * 2);
  stroke(ctx, 8, '#ffe8c0');
  ctx.setLineDash([]);
  // a grate in the middle
  roundRect(ctx, 130, 150, 100, 60, 12);
  ctx.fillStyle = lin(ctx, 0, 150, 0, 210, [[0, '#9aa2ae'], [1, '#4a525e']]);
  ctx.fill();
  stroke(ctx, 5);
  for (let x = 146; x < 230; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, 160);
    ctx.lineTo(x, 200);
    stroke(ctx, 5, '#1a1a20');
  }
  return c;
}

/** A curtain of falling sand over a lane, with a little sandcastle heaped where it lands. */
function sandColumn(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(340, 820);
  const r = rng(31);
  ctx.fillStyle = lin(ctx, 0, 0, 0, 820, [[0, 'rgba(240,208,140,0.35)'], [0.6, 'rgba(226,186,110,0.7)'], [1, 'rgba(210,168,96,0.85)']]);
  roundRect(ctx, 50, 20, 240, 700, 70);
  ctx.fill();
  // streaks of falling grains
  for (let i = 0; i < 26; i++) {
    const x = 70 + r() * 200;
    const y0 = 20 + r() * 300;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x + (r() - 0.5) * 10, y0 + 200 + r() * 300);
    ctx.strokeStyle = rgba('#fff0c8', 0.35);
    ctx.lineWidth = 3 + r() * 3;
    ctx.stroke();
  }
  for (let i = 0; i < 260; i++) {
    ctx.beginPath();
    ctx.arc(60 + r() * 220, 20 + r() * 720, 1.5 + r() * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = rgba(r() < 0.5 ? '#c89a50' : '#fff0c8', 0.8);
    ctx.fill();
  }
  // a low sandcastle heaped where it lands (short, so it only covers the far rim of the pizza)
  ctx.beginPath();
  ctx.moveTo(18, 816);
  ctx.quadraticCurveTo(40, 760, 92, 752);
  ctx.lineTo(92, 716);
  for (let x = 92; x < 248; x += 26) {
    ctx.lineTo(x, 700);
    ctx.lineTo(x + 13, 700);
    ctx.lineTo(x + 13, 716);
    ctx.lineTo(x + 26, 716);
  }
  ctx.lineTo(248, 752);
  ctx.quadraticCurveTo(300, 760, 322, 816);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 700, 0, 816, [[0, '#ffe6b0'], [0.6, '#e8c47c'], [1, '#c8a060']]);
  ctx.fill();
  stroke(ctx, 6);
  // sand texture and a highlight
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    ctx.arc(60 + r() * 220, 730 + r() * 70, 1.5 + r() * 2, 0, Math.PI * 2);
    ctx.fillStyle = rgba('#a87e40', 0.6);
    ctx.fill();
  }
  shine(ctx, 130, 728, 26, 6, 0.5, 0);
  // a door and a flag
  ctx.beginPath();
  ctx.moveTo(156, 790);
  ctx.lineTo(156, 766);
  ctx.quadraticCurveTo(170, 748, 184, 766);
  ctx.lineTo(184, 790);
  ctx.closePath();
  ctx.fillStyle = '#9a7438';
  ctx.fill();
  stroke(ctx, 4);
  ctx.beginPath();
  ctx.moveTo(170, 700);
  ctx.lineTo(170, 656);
  stroke(ctx, 4);
  ctx.beginPath();
  ctx.moveTo(170, 656);
  ctx.lineTo(204, 668);
  ctx.lineTo(170, 680);
  ctx.closePath();
  ctx.fillStyle = '#e5402a';
  ctx.fill();
  stroke(ctx, 3);
  return c;
}

/** King Honk's cream pie, bigger and fancier: a fluted crust rim, a cream swirl and a cherry. */
function pie2(): HTMLCanvasElement {
  // drawn at 1.5x: it's shown big as it flies at the screen
  const [c, ctx] = makeCanvas(390, 300);
  ctx.scale(1.5, 1.5);
  ctx.translate(0, 8);
  // tin
  ctx.beginPath();
  ctx.moveTo(18, 104);
  ctx.lineTo(242, 104);
  ctx.lineTo(222, 168);
  ctx.lineTo(38, 168);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 104, 0, 168, [[0, '#e8ecf2'], [1, '#8a929e']]);
  ctx.fill();
  stroke(ctx, 5);
  for (let x = 50; x < 220; x += 22) {
    ctx.beginPath();
    ctx.moveTo(x, 110);
    ctx.lineTo(x + (x - 130) * 0.08, 162);
    stroke(ctx, 2.5, rgba('#5a626e', 0.6));
  }
  // fluted crust rim
  ellipse(ctx, 130, 104, 118, 30);
  ctx.fillStyle = lin(ctx, 0, 74, 0, 134, [[0, '#f0b860'], [1, '#b8742a']]);
  ctx.fill();
  stroke(ctx, 5);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(130 + Math.cos(a) * 108, 104 + Math.sin(a) * 25, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#e8a850';
    ctx.fill();
    stroke(ctx, 2.5);
  }
  // cream dome with a swirl
  ctx.beginPath();
  ctx.moveTo(32, 100);
  for (let x = 32; x <= 216; x += 23) ctx.quadraticCurveTo(x + 11.5, 64, x + 23, 100);
  ctx.quadraticCurveTo(200, 30, 130, 22);
  ctx.quadraticCurveTo(60, 30, 32, 100);
  ctx.closePath();
  ctx.fillStyle = rad(ctx, 130, 70, 110, [[0, '#ffffff'], [0.7, '#fff6e2'], [1, '#e8dcc0']]);
  ctx.fill();
  stroke(ctx, 5);
  ctx.beginPath();
  ctx.moveTo(70, 84);
  ctx.bezierCurveTo(90, 40, 170, 40, 186, 80);
  ctx.moveTo(96, 80);
  ctx.bezierCurveTo(110, 54, 156, 54, 164, 78);
  stroke(ctx, 3.5, rgba('#c8b890', 0.9));
  // a swirl dollop on top
  ctx.beginPath();
  ctx.moveTo(100, 40);
  ctx.quadraticCurveTo(130, 4, 160, 40);
  ctx.quadraticCurveTo(130, 52, 100, 40);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  stroke(ctx, 4);
  // cherry and stem
  ctx.beginPath();
  ctx.moveTo(132, 14);
  ctx.quadraticCurveTo(140, -2, 152, 2);
  stroke(ctx, 3.5, '#3a6a2a');
  ctx.beginPath();
  ctx.arc(130, 22, 15, 0, Math.PI * 2);
  ctx.fillStyle = rad(ctx, 130, 22, 16, [[0, '#ff6a5a'], [1, '#a8161a']]);
  ctx.fill();
  stroke(ctx, 4);
  shine(ctx, 124, 16, 5, 3, 0.8);
  shine(ctx, 80, 64, 16, 6, 0.6);
  return c;
}

/** The Head Waiter's silver tray, face on (it tumbles, so the brain squashes it to show the tilt). */
/** The Head Waiter's grand salver (face, or underside), as his shield is drawn (src/content/style/bosses-3.ts): the
 * phase cards' picture of it. */
function silverTray(under: boolean): () => HTMLCanvasElement {
  return () => {
    const [c, ctx] = makeCanvas(440, 440);
    const r = 200;
    // drawn in the salver's own units (radius 98 → 200 px), so its outline and ornaments match the shield's
    const k = r / HW_TRAY.r;
    ctx.translate(220, 220);
    ctx.scale(k, k);
    ctx.translate(-HW_TRAY.x, -HW_TRAY.y);
    const path = salverPath(HW_TRAY.x, HW_TRAY.y, HW_TRAY.r);
    const sil = new Sil(ctx, [path], { x: HW_TRAY.x - HW_TRAY.r, y: HW_TRAY.y - HW_TRAY.r, w: HW_TRAY.r * 2, h: HW_TRAY.r * 2 });
    if (under) paintSalverBack(sil.g, HW_TRAY.x, HW_TRAY.y, HW_TRAY.r);
    else paintSalver(sil.g, HW_TRAY.x, HW_TRAY.y, HW_TRAY.r, HW_SALVER);
    sil.finish(inkOf('#6a7280'));
    return c;
  };
}

/** The tray a delivery waiter brings the Head Waiter (a cloche over the dish), as his still art paints it: the picture
 * the fight moves with him (DEL_TRAY_ORIGIN is where the tray's middle sits in it). */
export const DEL_TRAY_K = 3;
export const DEL_TRAY_BOX = { w: 172, h: 164 };
export const DEL_TRAY_ORIGIN = { x: 86, y: 130 };
function deliveryTray(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(DEL_TRAY_BOX.w * DEL_TRAY_K, DEL_TRAY_BOX.h * DEL_TRAY_K);
  ctx.scale(DEL_TRAY_K, DEL_TRAY_K);
  drawDeliveryTray(ctx, { ...DEL_TRAY, x: DEL_TRAY_ORIGIN.x, y: DEL_TRAY_ORIGIN.y });
  return c;
}

/** The dish a dropped delivery splats on the table: tomato sauce and a tangle of spaghetti, a meatball or two. */
function dishSplat(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(360, 240);
  const r = rng(707);
  const cx = 180;
  const cy = 130;
  // the sauce: a lumpy blob with splashes thrown out round it
  ctx.beginPath();
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const rr = (i % 2 ? 0.78 : 1) * (0.85 + r() * 0.25);
    const x = cx + Math.cos(a) * 140 * rr;
    const y = cy + Math.sin(a) * 82 * rr;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = rad(ctx, cx, cy, 150, [[0, '#ef4a2a'], [0.7, '#c42416'], [1, '#8a120a']]);
  ctx.fill();
  stroke(ctx, 6);
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2;
    const d = 1.05 + r() * 0.25;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * 140 * d, cy + Math.sin(a) * 82 * d, 6 + r() * 9, 0, Math.PI * 2);
    ctx.fillStyle = '#c42416';
    ctx.fill();
    stroke(ctx, 3.5);
  }
  // the spaghetti: pale golden strands looping through it
  ctx.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    const x0 = cx + (r() - 0.5) * 200;
    const y0 = cy + (r() - 0.5) * 100;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(x0 + (r() - 0.5) * 140, y0 + (r() - 0.5) * 90, x0 + (r() - 0.5) * 140, y0 + (r() - 0.5) * 90, x0 + (r() - 0.5) * 120, y0 + (r() - 0.5) * 70);
    ctx.lineWidth = 9;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 5.5;
    ctx.strokeStyle = '#f2d27a';
    ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = rgba('#fff4c8', 0.8);
    ctx.stroke();
  }
  // two meatballs and a sprig of basil
  for (const [x, y, s] of [[cx - 40, cy - 6, 24], [cx + 52, cy + 14, 20]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fillStyle = rad(ctx, x, y, s, [[0, '#a8643a'], [1, '#5a2a12']]);
    ctx.fill();
    stroke(ctx, 4);
    shine(ctx, x - s * 0.35, y - s * 0.4, s * 0.35, s * 0.18, 0.6);
  }
  ctx.beginPath();
  ctx.ellipse(cx + 8, cy - 30, 22, 10, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = '#3f9a3a';
  ctx.fill();
  stroke(ctx, 3);
  shine(ctx, cx - 40, cy - 40, 50, 12, 0.45, -0.2);
  return c;
}

/** A big splat of cream pie: a lumpy white blob with drips, crumbs of crust and the cherry. */
function creamSplat(): HTMLCanvasElement {
  const S = 720;
  const [c, ctx] = makeCanvas(S, S);
  const cx = S / 2;
  const cy = S * 0.44;
  const r = rng(404);
  const blob = () => {
    ctx.beginPath();
    const n = 22;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = S * (0.27 + (((i * 7919) % 11) / 11) * 0.1);
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr * 0.92;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.quadraticCurveTo(cx + Math.cos(a - 0.14) * rr * 1.22, cy + Math.sin(a - 0.14) * rr * 1.12, x, y);
    }
    ctx.closePath();
  };
  // drips running down from the bottom edge
  // [x offset, length, width]: short, uneven runs that pinch in and end in a fat drop
  const drips: [number, number, number][] = [[-140, 70, 24], [-50, 120, 30], [45, 85, 22], [125, 135, 26]];
  const drip = () => {
    for (const [dx, len, w] of drips) {
      const x = cx + dx;
      const y0 = cy + 130;
      ctx.moveTo(x - w * 1.5, y0);
      ctx.quadraticCurveTo(x - w * 0.5, y0 + len * 0.5, x - w * 0.55, y0 + len);
      ctx.arc(x, y0 + len, w * 0.75, Math.PI * 0.95, Math.PI * 0.05, true);
      ctx.quadraticCurveTo(x + w * 0.5, y0 + len * 0.5, x + w * 1.5, y0);
    }
  };
  blob();
  drip();
  ctx.lineWidth = 16;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  drip();
  ctx.fillStyle = '#fff6e4';
  ctx.fill();
  blob();
  ctx.fillStyle = rad(ctx, cx, cy, S * 0.42, [[0, '#ffffff'], [0.6, '#fff8ea'], [1, '#f2e6cc']]);
  ctx.fill();
  for (const [dx, len, w] of drips) shine(ctx, cx + dx - w * 0.2, cy + 130 + len, w * 0.22, w * 0.14, 0.8, 0);
  // flung droplets
  for (let i = 0; i < 9; i++) {
    const a = i * 0.71 + 0.3;
    const d = S * (0.4 + r() * 0.06);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.9, 10 + r() * 12, 0, Math.PI * 2);
    ctx.fillStyle = '#fffaf0';
    ctx.fill();
    stroke(ctx, 5);
  }
  // soft cream folds
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * 90, cy + Math.sin(a) * 70, 46 + r() * 20, a + 0.4, a + 2.2);
    stroke(ctx, 6, rgba('#d8c8a0', 0.75));
  }
  // crumbs of crust
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + r() * 0.6;
    const d = 90 + r() * 90;
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d * 0.8;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(r() * 3);
    roundRect(ctx, -20 - r() * 6, -12, 40 + r() * 12, 24, 9);
    ctx.fillStyle = lin(ctx, 0, -8, 0, 8, [[0, '#f0b860'], [1, '#b8742a']]);
    ctx.fill();
    stroke(ctx, 3.5);
    ctx.restore();
  }
  // the cherry, squashed into the middle
  ctx.beginPath();
  ctx.ellipse(cx + 30, cy - 20, 30, 24, 0.2, 0, Math.PI * 2);
  ctx.fillStyle = rad(ctx, cx + 30, cy - 20, 30, [[0, '#ff6a5a'], [1, '#a8161a']]);
  ctx.fill();
  stroke(ctx, 5);
  ctx.beginPath();
  ctx.moveTo(cx + 34, cy - 42);
  ctx.quadraticCurveTo(cx + 50, cy - 80, cx + 76, cy - 74);
  stroke(ctx, 6, '#3a6a2a');
  shine(ctx, cx + 20, cy - 30, 9, 5, 0.85);
  shine(ctx, cx - 120, cy - 120, 60, 18, 0.7);
  shine(ctx, cx + 120, cy + 60, 26, 8, 0.45);
  return c;
}

export const props: Record<string, () => HTMLCanvasElement> = {
  p_silvertray: silverTray(false),
  p_silvertray_b: silverTray(true),
  p_dw_tray: deliveryTray,
  p_dw_splat: dishSplat,
  p_creamsplat: creamSplat,
  p_qte_target: qteTarget,
  p_trap0: bearTrap(0),
  p_trap1: bearTrap(1),
  p_trap2: bearTrap(2),
  p_trap3: bearTrap(3),
  p_trap_shut: bearTrap(4),
  p_sootcol: sootColumn,
  p_chimney: chimney,
  p_launcher: launcher,
  p_rocket: rocket,
  p_blastorb: blastOrb,
  p_blastbeam: blastBeam,
  p_ventwarn: ventWarn,
  p_sandcol: sandColumn,
  p_pie2: pie2,
};
