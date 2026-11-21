// Props for Stages 1–3 (Head Waiter, Bigfoot, Chimney Sweep, Iron Heel, Sandcastle Sam, King Honk).
// Same style as src/art/eventArt.ts: thick dark-brown outlines, gradients and a highlight sheen.
import { type Ctx, ellipse, makeCanvas, rgba, rng, roundRect } from '../../art/util';

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

/** Bigfoot's quick-time target: a thick cream ring with tick marks (the closing ring is drawn live). */
function qteTarget(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(240, 240);
  ctx.beginPath();
  ctx.arc(120, 120, 96, 0, Math.PI * 2);
  ctx.fillStyle = rgba('#2a1810', 0.28);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(120, 120, 96, 0, Math.PI * 2);
  stroke(ctx, 18);
  ctx.beginPath();
  ctx.arc(120, 120, 96, 0, Math.PI * 2);
  stroke(ctx, 10, '#fff6e2');
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(120 + Math.cos(a) * 70, 120 + Math.sin(a) * 70);
    ctx.lineTo(120 + Math.cos(a) * 84, 120 + Math.sin(a) * 84);
    stroke(ctx, 6, '#fff6e2');
  }
  // a big paw-print in the middle: click when the ring is green
  ctx.beginPath();
  ctx.ellipse(120, 132, 24, 20, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#fff6e2';
  ctx.fill();
  stroke(ctx, 4);
  for (const [x, y] of [[92, 100], [108, 88], [132, 88], [148, 100]]) {
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#fff6e2';
    ctx.fill();
    stroke(ctx, 3.5);
  }
  return c;
}

/** The bear trap, from a heap of parts (0) to built and open (3), and snapped shut (4). */
function bearTrap(stage: number): () => HTMLCanvasElement {
  return () => {
    const [c, ctx] = makeCanvas(300, 170);
    const steel = (x0: number, y0: number, x1: number, y1: number) => lin(ctx, x0, y0, x1, y1, [[0, '#e6eaf0'], [0.5, '#9aa2ae'], [1, '#5a626e']]);
    const base = () => {
      ellipse(ctx, 150, 140, 120, 24);
      ctx.fillStyle = steel(0, 116, 0, 164);
      ctx.fill();
      stroke(ctx, 5);
      ellipse(ctx, 150, 136, 34, 10);
      ctx.fillStyle = '#c84a2a';
      ctx.fill();
      stroke(ctx, 3.5);
    };
    const jaw = (side: number, open: number) => {
      // a half-ring of teeth hinged at the base; open = 1 stands up, 0 lies flat (shut on the foot)
      ctx.save();
      ctx.translate(150, 136);
      ctx.scale(side, 1);
      ctx.beginPath();
      const h = 20 + 90 * open;
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(110, -6, 118, -h * 0.25);
      ctx.quadraticCurveTo(112, -h, 8, -h);
      ctx.lineTo(0, -h + 10);
      ctx.closePath();
      ctx.fillStyle = steel(0, -h, 0, 0);
      ctx.fill();
      stroke(ctx, 5);
      // teeth along the top edge
      for (let i = 0; i < 5; i++) {
        const x = 16 + i * 20;
        const y = -h + (i / 5) * h * 0.55;
        ctx.beginPath();
        ctx.moveTo(x - 8, y + 4);
        ctx.lineTo(x, y - 18);
        ctx.lineTo(x + 8, y + 4);
        ctx.closePath();
        ctx.fillStyle = '#f4f6fa';
        ctx.fill();
        stroke(ctx, 3);
      }
      ctx.restore();
    };
    if (stage === 0) {
      // a heap of parts: base plate, a loose jaw, a spring and bolts
      base();
      ctx.save();
      ctx.translate(70, 96);
      ctx.rotate(-0.5);
      roundRect(ctx, -40, -10, 80, 20, 8);
      ctx.fillStyle = steel(0, -10, 0, 10);
      ctx.fill();
      stroke(ctx, 4);
      ctx.restore();
      ctx.beginPath();
      for (let i = 0; i < 6; i++) ctx.ellipse(220, 96 - i * 8, 22, 6, 0, 0, Math.PI * 2);
      stroke(ctx, 4, '#7a828e');
      for (const [x, y] of [[120, 108], [178, 112], [250, 128]]) {
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#b8c0ca';
        ctx.fill();
        stroke(ctx, 3);
      }
    } else if (stage === 4) {
      base();
      // shut: the two jaws meet in an arch with their teeth locked together down the middle
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(150, 136);
        ctx.lineTo(150 + sd * 112, 136);
        ctx.quadraticCurveTo(150 + sd * 110, 30, 150, 26);
        ctx.closePath();
        ctx.fillStyle = steel(0, 26, 0, 136);
        ctx.fill();
        stroke(ctx, 5);
      }
      ctx.beginPath();
      ctx.moveTo(150, 32);
      for (let y = 32, k = 0; y < 132; y += 14, k++) ctx.lineTo(150 + (k % 2 ? -12 : 12), y + 7);
      ctx.lineTo(150, 134);
      stroke(ctx, 7);
      ctx.beginPath();
      ctx.moveTo(150, 32);
      for (let y = 32, k = 0; y < 132; y += 14, k++) ctx.lineTo(150 + (k % 2 ? -12 : 12), y + 7);
      ctx.lineTo(150, 134);
      stroke(ctx, 3.5, '#f4f6fa');
    } else {
      base();
      jaw(-1, stage === 1 ? 0.25 : stage === 2 ? 0.6 : 1);
      if (stage >= 2) jaw(1, stage === 2 ? 0.35 : 1);
      if (stage === 1) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) ctx.ellipse(230, 110 - i * 8, 20, 6, 0, 0, Math.PI * 2);
        stroke(ctx, 4, '#7a828e');
      }
    }
    shine(ctx, 110, 132, 30, 6, 0.45, 0);
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
  const [c, ctx] = makeCanvas(200, 170);
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
  // the castle heap at the bottom
  ctx.beginPath();
  ctx.moveTo(20, 812);
  ctx.quadraticCurveTo(40, 720, 80, 700);
  ctx.lineTo(80, 640);
  for (let x = 80; x < 260; x += 30) {
    ctx.lineTo(x, 610);
    ctx.lineTo(x + 15, 610);
    ctx.lineTo(x + 15, 640);
    ctx.lineTo(x + 30, 640);
  }
  ctx.lineTo(260, 700);
  ctx.quadraticCurveTo(300, 720, 320, 812);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 610, 0, 812, [[0, '#f8dca0'], [1, '#c8a060']]);
  ctx.fill();
  stroke(ctx, 6);
  // a door and a flag
  ctx.beginPath();
  ctx.moveTo(150, 760);
  ctx.lineTo(150, 720);
  ctx.quadraticCurveTo(170, 696, 190, 720);
  ctx.lineTo(190, 760);
  ctx.closePath();
  ctx.fillStyle = '#9a7438';
  ctx.fill();
  stroke(ctx, 4);
  ctx.beginPath();
  ctx.moveTo(170, 610);
  ctx.lineTo(170, 560);
  stroke(ctx, 4);
  ctx.beginPath();
  ctx.moveTo(170, 560);
  ctx.lineTo(204, 572);
  ctx.lineTo(170, 584);
  ctx.closePath();
  ctx.fillStyle = '#e5402a';
  ctx.fill();
  stroke(ctx, 3);
  return c;
}

/** King Honk's cream pie, bigger and fancier: a fluted crust rim, a cream swirl and a cherry. */
function pie2(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(260, 190);
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

export const props: Record<string, () => HTMLCanvasElement> = {
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
