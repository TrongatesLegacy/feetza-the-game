// Props for Act 9 · Greek myths (src/game/bosses/act9.ts, src/game/act9.ts): the Minotaur's maze walls,
// Medusa's statue stone, cracks, mirror shield and hair snake, Cerberus's three tempers, the Titans'
// hourglass, hand and flare, Hades' shadow hand and floor rift, the Siren's notes and Charybdis.
// Same style as src/art/eventArt.ts: thick ink outlines, gradients and a sheen, light from the top left.
import { type Ctx, ellipse, makeCanvas, rgba, roundRect, shade } from '../../art/util';

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
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function shine(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.55, rot = -0.5): void {
  ellipse(ctx, x, y, rx, ry, rot);
  ctx.fillStyle = rgba('#ffffff', a);
  ctx.fill();
}

/** Seeded random so props look the same every load. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function meander(ctx: Ctx, x0: number, x1: number, y: number, h: number, col: string, lw = 3): void {
  const u = h / 3;
  ctx.beginPath();
  for (let x = x0; x + 4 * u <= x1 + 0.1; x += 4 * u) {
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x, y - h / 2);
    ctx.lineTo(x + 3 * u, y - h / 2);
    ctx.lineTo(x + 3 * u, y + u / 2);
    ctx.lineTo(x + u, y + u / 2);
    ctx.lineTo(x + u, y - u / 2);
    ctx.lineTo(x + 2 * u, y - u / 2);
    ctx.moveTo(x + 3 * u, y + h / 2);
    ctx.lineTo(x + 4 * u, y + h / 2);
  }
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.stroke();
}

// ——— Minotaur ———

/** A stone maze wall block with a Greek-key frieze. Anchor: bottom-centre at (130, 210). */
function wall(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(260, 220);
  const r = seeded(9001);
  // ground shadow
  ellipse(ctx, 130, 208, 124, 12);
  ctx.fillStyle = rgba('#000000', 0.35);
  ctx.fill();
  // top face (seen slightly from above)
  ctx.beginPath();
  ctx.moveTo(14, 46);
  ctx.lineTo(40, 18);
  ctx.lineTo(240, 18);
  ctx.lineTo(246, 46);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 18, 0, 46, [[0, '#efe6d6'], [1, '#cfc2ac']]);
  ctx.fill();
  stroke(ctx, 5);
  // front face
  roundRect(ctx, 10, 44, 240, 164, 8);
  ctx.fillStyle = lin(ctx, 10, 0, 250, 0, [[0, '#d8ccb6'], [0.35, '#e8dcc6'], [1, '#a89a84']]);
  ctx.fill();
  ctx.save();
  roundRect(ctx, 10, 44, 240, 164, 8);
  ctx.clip();
  // ashlar blocks
  ctx.strokeStyle = rgba('#5a4a3a', 0.6);
  ctx.lineWidth = 3;
  for (const [y, off] of [[100, 0], [150, 50], [208, 0]] as const) {
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(250, y);
    ctx.stroke();
    for (let x = 10 + off; x < 250; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, y - 50);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }
  // speckle and weathering
  for (let i = 0; i < 120; i++) {
    ellipse(ctx, 10 + r() * 240, 44 + r() * 164, 1 + r() * 2.5, 1 + r() * 2);
    ctx.fillStyle = r() > 0.5 ? rgba('#ffffff', 0.25) : rgba('#4a3a2a', 0.2);
    ctx.fill();
  }
  // frieze band with the meander
  ctx.fillStyle = '#b5482e';
  ctx.fillRect(10, 52, 240, 34);
  meander(ctx, 18, 246, 69, 22, '#1e140e', 4);
  ctx.fillStyle = rgba('#ffffff', 0.18);
  ctx.fillRect(10, 52, 240, 6);
  // ivy creeping up the left side
  for (let i = 0; i < 9; i++) {
    const x = 18 + r() * 40;
    const y = 120 + i * 10;
    ellipse(ctx, x, y, 11, 7, r() * 2);
    ctx.fillStyle = i % 2 ? '#4f8a3a' : '#6fa83a';
    ctx.fill();
    stroke(ctx, 2, '#1e3a14');
  }
  // shading down the right
  ctx.fillStyle = rgba('#000000', 0.14);
  ctx.fillRect(200, 44, 50, 164);
  ctx.restore();
  roundRect(ctx, 10, 44, 240, 164, 8);
  stroke(ctx, 6);
  return c;
}

/** A dust cloud (charges and crashes). */
function dust(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(220, 140);
  const puffs: [number, number, number][] = [[50, 90, 38], [100, 70, 48], [158, 86, 40], [76, 106, 30], [134, 108, 30], [190, 104, 22], [26, 110, 20]];
  for (const [x, y, rr] of puffs) {
    ellipse(ctx, x, y, rr, rr * 0.85);
    stroke(ctx, 6, rgba(INK, 0.5));
  }
  for (const [x, y, rr] of puffs) {
    ellipse(ctx, x, y, rr, rr * 0.85);
    ctx.fillStyle = rad(ctx, x, y, rr, [[0, '#fff4dc'], [0.6, '#e0c89a'], [1, '#b89a6a']]);
    ctx.fill();
  }
  return c;
}

// ——— Medusa ———

/** Grey marble that covers a pizza when it turns to stone (a tilted disc, soft edges). */
function stone(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(300, 200);
  const r = seeded(4242);
  ctx.save();
  ellipse(ctx, 150, 100, 140, 88);
  ctx.clip();
  ctx.fillStyle = rad(ctx, 150, 100, 150, [[0, '#e4e2dc'], [0.6, '#b8b6b0'], [1, '#7a7a78']]);
  ctx.fillRect(0, 0, 300, 200);
  // marble veins
  for (let i = 0; i < 7; i++) {
    let x = r() * 300;
    let y = r() * 200;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 6; k++) {
      x += 20 + r() * 30;
      y += (r() - 0.5) * 40;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgba(i % 2 ? '#6a6a70' : '#ffffff', 0.35);
    ctx.lineWidth = 1.5 + r() * 2;
    ctx.stroke();
  }
  for (let i = 0; i < 200; i++) {
    ellipse(ctx, r() * 300, r() * 200, 1 + r() * 1.6, 1 + r() * 1.6);
    ctx.fillStyle = r() > 0.5 ? rgba('#ffffff', 0.3) : rgba('#3a3a3a', 0.2);
    ctx.fill();
  }
  shine(ctx, 104, 62, 60, 18, 0.35, -0.2);
  ctx.restore();
  // soft translucent rim so the pizza's edge shows through a little
  ellipse(ctx, 150, 100, 140, 88);
  ctx.strokeStyle = rgba('#4a4a4e', 0.85);
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createRadialGradient(150, 100, 100, 150, 100, 150);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 300, 200);
  return c;
}

/** Cracks over a statue: level 1 hairline, 2 spreading, 3 about to crumble (chips missing). */
function crack(level: 1 | 2 | 3): () => HTMLCanvasElement {
  return () => {
    const [c, ctx] = makeCanvas(300, 200);
    const r = seeded(77 + level * 13);
    ctx.save();
    ellipse(ctx, 150, 100, 138, 86);
    ctx.clip();
    const bolts = [2, 4, 7][level - 1];
    ctx.lineJoin = 'round';
    for (let i = 0; i < bolts; i++) {
      const a = (i / bolts) * Math.PI * 2 + r() * 0.6;
      let x = 150 + Math.cos(a) * 10;
      let y = 100 + Math.sin(a) * 8;
      const pts: [number, number][] = [[x, y]];
      for (let k = 0; k < 5; k++) {
        x += Math.cos(a + (r() - 0.5) * 1.2) * (18 + r() * 14);
        y += Math.sin(a + (r() - 0.5) * 1.2) * (12 + r() * 10);
        pts.push([x, y]);
      }
      ctx.beginPath();
      pts.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      stroke(ctx, 3 + level * 1.5, rgba('#1a1614', 0.85));
      ctx.beginPath();
      pts.forEach(([px, py], k) => (k ? ctx.lineTo(px + 2, py + 2) : ctx.moveTo(px + 2, py + 2)));
      stroke(ctx, 1.5, rgba('#ffffff', 0.45));
      // side branches
      if (level >= 2)
        for (let k = 2; k < pts.length; k += 2) {
          ctx.beginPath();
          ctx.moveTo(pts[k][0], pts[k][1]);
          ctx.lineTo(pts[k][0] + (r() - 0.5) * 40, pts[k][1] + (r() - 0.5) * 30);
          stroke(ctx, 2.5, rgba('#1a1614', 0.75));
        }
    }
    // chips missing (dark holes) at level 3
    if (level === 3)
      for (let i = 0; i < 5; i++) {
        const x = 60 + r() * 180;
        const y = 40 + r() * 120;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          const rr = 8 + r() * 10;
          ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7);
        }
        ctx.closePath();
        ctx.fillStyle = rgba('#2a2420', 0.8);
        ctx.fill();
      }
    ctx.restore();
    return c;
  };
}

/** A polished bronze round shield: the mirror that shows Medusa's reflection. */
function mirror(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(280, 280);
  const cx = 140;
  const cy = 140;
  // rim
  ellipse(ctx, cx, cy, 130, 130);
  ctx.fillStyle = lin(ctx, 10, 10, 270, 270, [[0, '#ffe2a0'], [0.35, '#c9873a'], [0.6, '#8a5a22'], [1, '#5a3412']]);
  ctx.fill();
  stroke(ctx, 7);
  // polished face
  ellipse(ctx, cx, cy, 106, 106);
  ctx.fillStyle = rad(ctx, cx, cy, 120, [[0, '#fff6d8'], [0.4, '#e8c27a'], [0.85, '#b8843a'], [1, '#7a5222']]);
  ctx.fill();
  stroke(ctx, 4);
  // reflections: two bright streaks
  ctx.save();
  ellipse(ctx, cx, cy, 106, 106);
  ctx.clip();
  ctx.fillStyle = rgba('#ffffff', 0.45);
  ctx.beginPath();
  ctx.moveTo(40, 120);
  ctx.lineTo(120, 40);
  ctx.lineTo(146, 40);
  ctx.lineTo(54, 140);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba('#ffffff', 0.25);
  ctx.beginPath();
  ctx.moveTo(70, 176);
  ctx.lineTo(180, 64);
  ctx.lineTo(192, 74);
  ctx.lineTo(82, 188);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // rim rivets and a meander ring
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ellipse(ctx, cx + Math.cos(a) * 118, cy + Math.sin(a) * 118, 5, 5);
    ctx.fillStyle = rad(ctx, cx + Math.cos(a) * 118, cy + Math.sin(a) * 118, 5, [[0, '#fff4c0'], [1, '#8a5a22']]);
    ctx.fill();
    stroke(ctx, 2);
  }
  return c;
}

/** A striking hair snake, head first (it lunges along +x). */
function snakeHead(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(150, 150);
  const col = '#4f8a3a';
  // body coil
  ctx.beginPath();
  ctx.moveTo(10, 140);
  ctx.bezierCurveTo(10, 90, 70, 110, 70, 70);
  ctx.lineCap = 'round';
  stroke(ctx, 30, INK);
  stroke(ctx, 22, col);
  ctx.strokeStyle = rgba('#e8d36a', 0.8);
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(18, 140);
  ctx.bezierCurveTo(18, 96, 78, 116, 78, 74);
  ctx.stroke();
  // open jaws
  ctx.beginPath();
  ctx.moveTo(60, 60);
  ctx.lineTo(132, 40);
  ctx.lineTo(96, 76);
  ctx.lineTo(136, 96);
  ctx.lineTo(62, 92);
  ctx.closePath();
  ctx.fillStyle = '#c8304a';
  ctx.fill();
  stroke(ctx, 4);
  // fangs
  ctx.fillStyle = '#ffffff';
  for (const [x, y, d] of [[118, 46, 1], [120, 92, -1]] as const) {
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.lineTo(x, y + d * 16);
    ctx.lineTo(x + 6, y + d * 2);
    ctx.closePath();
    ctx.fill();
    stroke(ctx, 2);
  }
  // head plates
  ctx.beginPath();
  ctx.moveTo(44, 74);
  ctx.quadraticCurveTo(50, 34, 102, 36);
  ctx.lineTo(132, 40);
  ctx.lineTo(92, 64);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 44, 30, 120, 70, [[0, shade(col, 0.4)], [1, col]]);
  ctx.fill();
  stroke(ctx, 4);
  ctx.beginPath();
  ctx.moveTo(48, 84);
  ctx.quadraticCurveTo(70, 110, 136, 96);
  ctx.lineTo(96, 88);
  ctx.closePath();
  ctx.fillStyle = shade(col, -0.1);
  ctx.fill();
  stroke(ctx, 4);
  // eye
  ellipse(ctx, 76, 52, 9, 7);
  ctx.fillStyle = '#ffe96a';
  ctx.fill();
  stroke(ctx, 2);
  ellipse(ctx, 78, 52, 2.5, 6);
  ctx.fillStyle = INK;
  ctx.fill();
  // tongue
  ctx.beginPath();
  ctx.moveTo(110, 70);
  ctx.lineTo(140, 68);
  ctx.lineTo(148, 60);
  ctx.moveTo(140, 68);
  ctx.lineTo(148, 76);
  ctx.lineCap = 'round';
  stroke(ctx, 3, '#e8402f');
  return c;
}

// ——— Cerberus ———

function fireball(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(140, 140);
  // tail flames trailing up-left
  for (const [k, col] of [[1, '#c83a12'], [0.75, '#ff8a1c'], [0.5, '#ffd23f']] as const) {
    ctx.beginPath();
    ctx.moveTo(70 - 44 * k, 78);
    ctx.bezierCurveTo(30 - 20 * k, 40, 30, 10, 14, 4);
    ctx.bezierCurveTo(60, 20, 90, 30, 70 + 44 * k, 78);
    ctx.arc(70, 82, 44 * k, 0, Math.PI);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    if (k === 1) stroke(ctx, 4, rgba(INK, 0.85));
  }
  ellipse(ctx, 70, 86, 20, 18);
  ctx.fillStyle = '#fff6c8';
  ctx.fill();
  return c;
}

function iceShard(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(120, 160);
  ctx.beginPath();
  ctx.moveTo(60, 154);
  ctx.lineTo(18, 70);
  ctx.lineTo(36, 10);
  ctx.lineTo(60, 30);
  ctx.lineTo(86, 6);
  ctx.lineTo(102, 70);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 18, 0, 102, 160, [[0, '#ffffff'], [0.4, '#a8e8ff'], [1, '#3a8ad0']]);
  ctx.fill();
  stroke(ctx, 5, '#123a5a');
  ctx.beginPath();
  ctx.moveTo(60, 30);
  ctx.lineTo(60, 150);
  ctx.moveTo(36, 10);
  ctx.lineTo(48, 90);
  stroke(ctx, 2.5, rgba('#ffffff', 0.75));
  shine(ctx, 40, 60, 8, 20, 0.7, 0.2);
  return c;
}

function poison(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(220, 120);
  const r = seeded(31);
  ctx.beginPath();
  for (let k = 0; k <= 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const rr = 1 + (r() - 0.5) * 0.25;
    ctx.lineTo(110 + Math.cos(a) * 96 * rr, 66 + Math.sin(a) * 42 * rr);
  }
  ctx.closePath();
  ctx.fillStyle = rad(ctx, 110, 66, 100, [[0, '#d8ff7a'], [0.5, '#7ad03a'], [1, '#3a7a1a']]);
  ctx.fill();
  stroke(ctx, 5, '#1a3a0e');
  // bubbles and a skull glint
  for (let i = 0; i < 7; i++) {
    const x = 40 + r() * 140;
    const y = 46 + r() * 36;
    const rr = 5 + r() * 9;
    ellipse(ctx, x, y, rr, rr);
    ctx.fillStyle = rgba('#e8ffb0', 0.75);
    ctx.fill();
    stroke(ctx, 2, '#2a5a14');
    shine(ctx, x - rr * 0.3, y - rr * 0.35, rr * 0.3, rr * 0.2, 0.9);
  }
  shine(ctx, 76, 50, 30, 8, 0.4, -0.1);
  return c;
}

/** A round temper badge: fire, ice or poison. */
function temper(kind: 'fire' | 'ice' | 'poison'): () => HTMLCanvasElement {
  return () => {
    const [c, ctx] = makeCanvas(96, 96);
    const col = { fire: '#e8402f', ice: '#3a9ae8', poison: '#5aa82a' }[kind];
    ellipse(ctx, 48, 48, 42, 42);
    ctx.fillStyle = rad(ctx, 48, 48, 42, [[0, shade(col, 0.5)], [0.7, col], [1, shade(col, -0.45)]]);
    ctx.fill();
    stroke(ctx, 5);
    ellipse(ctx, 48, 48, 34, 34);
    stroke(ctx, 2, rgba('#ffffff', 0.5));
    ctx.save();
    ctx.translate(48, 50);
    if (kind === 'fire') {
      ctx.beginPath();
      ctx.moveTo(-14, 14);
      ctx.bezierCurveTo(-20, -4, -2, -10, -2, -26);
      ctx.bezierCurveTo(10, -14, 22, 0, 14, 14);
      ctx.quadraticCurveTo(0, 22, -14, 14);
      ctx.fillStyle = '#ffd23f';
      ctx.fill();
      stroke(ctx, 3);
      ellipse(ctx, 0, 8, 6, 8);
      ctx.fillStyle = '#fff6c8';
      ctx.fill();
    } else if (kind === 'ice') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -24);
        ctx.moveTo(0, -14);
        ctx.lineTo(-7, -20);
        ctx.moveTo(0, -14);
        ctx.lineTo(7, -20);
        ctx.lineWidth = 8;
        ctx.strokeStyle = INK;
        ctx.stroke();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }
    } else {
      // skull drip
      ellipse(ctx, 0, -4, 18, 16);
      ctx.fillStyle = '#efffd0';
      ctx.fill();
      stroke(ctx, 3);
      roundRect(ctx, -9, 8, 18, 10, 3);
      ctx.fill();
      stroke(ctx, 2.5);
      for (const sx of [-1, 1]) {
        ellipse(ctx, sx * 7, -5, 5, 6);
        ctx.fillStyle = '#1a3a0e';
        ctx.fill();
      }
    }
    ctx.restore();
    shine(ctx, 32, 28, 12, 6, 0.55);
    return c;
  };
}

// ——— Hades and the Titans ———

/** Kronos's hourglass (smash it to end the slow). */
function hourglass(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(170, 230);
  const cx = 85;
  // posts
  for (const x of [26, 144]) {
    roundRect(ctx, x - 7, 26, 14, 180, 6);
    ctx.fillStyle = lin(ctx, x - 7, 0, x + 7, 0, [[0, '#8a5a22'], [0.4, '#ffe2a0'], [1, '#6a4012']]);
    ctx.fill();
    stroke(ctx, 4);
  }
  // glass
  ctx.beginPath();
  ctx.moveTo(38, 30);
  ctx.quadraticCurveTo(38, 100, cx - 6, 115);
  ctx.quadraticCurveTo(38, 130, 38, 200);
  ctx.lineTo(132, 200);
  ctx.quadraticCurveTo(132, 130, cx + 6, 115);
  ctx.quadraticCurveTo(132, 100, 132, 30);
  ctx.closePath();
  ctx.fillStyle = rgba('#dff6ff', 0.55);
  ctx.fill();
  stroke(ctx, 5);
  // sand: top draining, bottom heap, falling stream
  ctx.beginPath();
  ctx.moveTo(56, 70);
  ctx.quadraticCurveTo(cx, 80, 114, 70);
  ctx.quadraticCurveTo(110, 100, cx + 3, 112);
  ctx.lineTo(cx - 3, 112);
  ctx.quadraticCurveTo(60, 100, 56, 70);
  ctx.closePath();
  ctx.moveTo(44, 198);
  ctx.quadraticCurveTo(cx, 140, 126, 198);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 70, 0, 200, [[0, '#ffe08a'], [1, '#d9a441']]);
  ctx.fill();
  ctx.fillRect(cx - 2, 112, 4, 50);
  shine(ctx, 54, 60, 6, 22, 0.7, 0.1);
  // caps
  for (const y of [22, 208]) {
    roundRect(ctx, 10, y - 12, 150, 24, 8);
    ctx.fillStyle = lin(ctx, 10, 0, 160, 0, [[0, '#6a4012'], [0.35, '#ffe2a0'], [0.6, '#c9873a'], [1, '#5a3412']]);
    ctx.fill();
    stroke(ctx, 5);
    meander(ctx, 24, 148, y, 10, rgba(INK, 0.65), 2.5);
  }
  return c;
}

/** Atlas's huge hand gripping the table edge from below (fingers up). */
function atlasHand(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(220, 200);
  const skin = '#a8785a';
  const ol = '#3a2214';
  // forearm coming up from below
  ctx.beginPath();
  ctx.moveTo(62, 200);
  ctx.lineTo(70, 120);
  ctx.lineTo(160, 120);
  ctx.lineTo(166, 200);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 60, 0, 170, 0, [[0, shade(skin, -0.35)], [0.35, shade(skin, 0.15)], [1, shade(skin, -0.4)]]);
  ctx.fill();
  stroke(ctx, 5, ol);
  // blue cloth wrap on the wrist
  roundRect(ctx, 60, 140, 110, 26, 8);
  ctx.fillStyle = lin(ctx, 0, 140, 0, 166, [[0, '#5a8ab0'], [1, '#2a5a7a']]);
  ctx.fill();
  stroke(ctx, 4, ol);
  // palm
  ellipse(ctx, 114, 104, 66, 40);
  ctx.fillStyle = rad(ctx, 114, 104, 70, [[0, shade(skin, 0.25)], [1, shade(skin, -0.2)]]);
  ctx.fill();
  stroke(ctx, 5, ol);
  // fingers curling up over the edge
  const fingers: [number, number, number, number][] = [[58, 92, 22, 54], [90, 70, 24, 66], [124, 66, 24, 70], [158, 78, 22, 58]];
  for (const [x, y, w, h] of fingers) {
    roundRect(ctx, x - w / 2, y - h + 10, w, h, w / 2);
    ctx.fillStyle = lin(ctx, x - w / 2, 0, x + w / 2, 0, [[0, shade(skin, -0.2)], [0.4, shade(skin, 0.25)], [1, shade(skin, -0.3)]]);
    ctx.fill();
    stroke(ctx, 5, ol);
    // knuckle and nail
    ellipse(ctx, x, y - h + 24, w * 0.32, w * 0.3);
    ctx.fillStyle = rgba('#fff0e0', 0.6);
    ctx.fill();
    stroke(ctx, 2, rgba(ol, 0.6));
    ctx.beginPath();
    ctx.moveTo(x - w * 0.35, y - 8);
    ctx.quadraticCurveTo(x, y - 2, x + w * 0.35, y - 8);
    stroke(ctx, 2, rgba(ol, 0.5));
  }
  // thumb wrapping round the front
  ctx.beginPath();
  ctx.ellipse(34, 116, 18, 30, -0.7, 0, Math.PI * 2);
  ctx.fillStyle = lin(ctx, 16, 0, 52, 0, [[0, shade(skin, -0.25)], [1, shade(skin, 0.2)]]);
  ctx.fill();
  stroke(ctx, 5, ol);
  return c;
}

/** A solar flare blazing on a pizza (Hyperion). */
function flare(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(200, 200);
  const g = ctx.createRadialGradient(100, 110, 6, 100, 110, 96);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,230,120,0.95)');
  g.addColorStop(0.65, 'rgba(255,140,40,0.6)');
  g.addColorStop(1, 'rgba(255,80,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 200, 200);
  // flame tongues
  for (let i = 0; i < 9; i++) {
    const x = 34 + i * 16.5;
    const h = 60 + ((i * 37) % 5) * 12;
    ctx.beginPath();
    ctx.moveTo(x - 12, 150);
    ctx.quadraticCurveTo(x - 10, 150 - h * 0.6, x + ((i % 2) * 2 - 1) * 6, 150 - h);
    ctx.quadraticCurveTo(x + 10, 150 - h * 0.6, x + 12, 150);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? '#ff8a1c' : '#ffcf3a';
    ctx.fill();
    stroke(ctx, 3, rgba(INK, 0.7));
  }
  ellipse(ctx, 100, 150, 76, 18);
  ctx.fillStyle = '#fff6c8';
  ctx.fill();
  stroke(ctx, 3, rgba(INK, 0.6));
  return c;
}

/** An inky shadow hand reaching up with clawed fingers (Hades' shadows). */
function shadowHand(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(200, 220);
  // smoky wisps trailing below
  for (let i = 0; i < 6; i++) {
    ellipse(ctx, 70 + i * 12, 190 + (i % 2) * 10, 26, 18);
    ctx.fillStyle = rgba('#1a1030', 0.5);
    ctx.fill();
  }
  const hand = () => {
    ctx.beginPath();
    ctx.moveTo(70, 214);
    ctx.bezierCurveTo(66, 160, 40, 140, 30, 96);
    ctx.quadraticCurveTo(26, 80, 38, 84);
    ctx.lineTo(60, 120);
    ctx.lineTo(50, 40);
    ctx.quadraticCurveTo(52, 26, 64, 34);
    ctx.lineTo(80, 104);
    ctx.lineTo(90, 16);
    ctx.quadraticCurveTo(98, 4, 106, 18);
    ctx.lineTo(108, 100);
    ctx.lineTo(128, 26);
    ctx.quadraticCurveTo(140, 18, 142, 34);
    ctx.lineTo(128, 112);
    ctx.lineTo(160, 70);
    ctx.quadraticCurveTo(174, 66, 168, 82);
    ctx.bezierCurveTo(144, 130, 140, 170, 134, 214);
    ctx.closePath();
  };
  hand();
  ctx.fillStyle = lin(ctx, 0, 0, 0, 220, [[0, '#4a2a7a'], [0.5, '#2a1648'], [1, '#120a24']]);
  ctx.fill();
  stroke(ctx, 6, '#0a0614');
  // violet rim light and glowing eyes in the palm
  ctx.save();
  hand();
  ctx.clip();
  ctx.strokeStyle = rgba('#b48aff', 0.55);
  ctx.lineWidth = 6;
  hand();
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.shadowColor = '#7ad8ff';
  ctx.shadowBlur = 14;
  for (const x of [88, 116]) {
    ellipse(ctx, x, 150, 8, 5);
    ctx.fillStyle = '#c8f4ff';
    ctx.fill();
  }
  ctx.restore();
  return c;
}

/** A pizza slice (stolen and carried off, or snatched by a harpy). */
function slice(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(110, 110);
  ctx.beginPath();
  ctx.moveTo(55, 100);
  ctx.lineTo(12, 22);
  ctx.quadraticCurveTo(55, 4, 98, 22);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 10, 0, 100, [[0, '#ffd77a'], [1, '#f2b04a']]);
  ctx.fill();
  stroke(ctx, 4);
  // crust
  ctx.beginPath();
  ctx.moveTo(12, 22);
  ctx.quadraticCurveTo(55, 4, 98, 22);
  ctx.quadraticCurveTo(55, 16, 12, 22);
  ctx.lineWidth = 14;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 9;
  ctx.strokeStyle = '#c87a2a';
  ctx.stroke();
  // pepperoni
  for (const [x, y] of [[40, 40], [66, 44], [54, 66]] as const) {
    ellipse(ctx, x, y, 9, 8);
    ctx.fillStyle = '#c8302a';
    ctx.fill();
    stroke(ctx, 2);
  }
  shine(ctx, 36, 30, 10, 4, 0.5, -0.2);
  return c;
}

/** A glowing crack in the floor (Titans rise from it, Hades' shadows creep out). */
function rift(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(420, 120);
  const r = seeded(666);
  const top: [number, number][] = [];
  const bot: [number, number][] = [];
  for (let i = 0; i <= 14; i++) {
    const x = 14 + (i / 14) * 392;
    const w = Math.sin((i / 14) * Math.PI) * 36 + 3;
    top.push([x, 60 - w * (0.6 + r() * 0.5)]);
    bot.push([x, 60 + w * (0.6 + r() * 0.5)]);
  }
  const path = () => {
    ctx.beginPath();
    top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
    ctx.closePath();
  };
  // glow spilling out
  ctx.save();
  ctx.shadowColor = '#ff5a1f';
  ctx.shadowBlur = 30;
  path();
  ctx.fillStyle = '#ff7a2a';
  ctx.fill();
  ctx.restore();
  path();
  ctx.fillStyle = lin(ctx, 0, 20, 0, 100, [[0, '#ff9a3a'], [0.5, '#fff0a0'], [1, '#c8301a']]);
  ctx.fill();
  stroke(ctx, 6, '#120a08');
  // a dark core
  ctx.save();
  path();
  ctx.clip();
  ellipse(ctx, 210, 64, 150, 10);
  ctx.fillStyle = rgba('#5a0a04', 0.5);
  ctx.fill();
  ctx.restore();
  return c;
}

/** A vertical bronze chain (Titans bound and broken free). */
function chain(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(60, 300);
  for (let i = 0; i < 9; i++) {
    const y = 18 + i * 33;
    const side = i % 2 === 0;
    ctx.beginPath();
    if (side) ctx.ellipse(30, y, 16, 22, 0, 0, Math.PI * 2);
    else ctx.ellipse(30, y, 6, 22, 0, 0, Math.PI * 2);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 13;
    ctx.stroke();
    ctx.strokeStyle = lin(ctx, 14, 0, 46, 0, [[0, '#6a4012'], [0.4, '#ffe2a0'], [1, '#8a5a22']]);
    ctx.lineWidth = 7;
    ctx.stroke();
  }
  return c;
}

/** A music note (the Siren's song). */
function note(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(70, 90);
  ctx.beginPath();
  ctx.ellipse(24, 70, 16, 12, -0.4, 0, Math.PI * 2);
  ctx.moveTo(36, 66);
  ctx.lineTo(38, 10);
  ctx.quadraticCurveTo(60, 20, 62, 44);
  ctx.quadraticCurveTo(52, 30, 40, 28);
  ctx.lineTo(40, 66);
  stroke(ctx, 10);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(24, 70, 16, 12, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(35, 10, 5, 58);
  ctx.beginPath();
  ctx.moveTo(38, 10);
  ctx.quadraticCurveTo(60, 20, 62, 44);
  ctx.quadraticCurveTo(52, 30, 40, 28);
  ctx.closePath();
  ctx.fill();
  shine(ctx, 18, 66, 5, 3, 0.9);
  return c;
}

// ——— Charybdis ———

/** A top-down whirlpool with a toothy maw in its eye. */
function charybdis(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(360, 360);
  const cx = 180;
  const cy = 180;
  ellipse(ctx, cx, cy, 172, 172);
  ctx.fillStyle = rad(ctx, cx, cy, 190, [[0, '#0a2a3a'], [0.45, '#1a6a8a'], [0.8, '#3aa8c8'], [1, '#8ae0f0']]);
  ctx.fill();
  stroke(ctx, 7, '#0a2030');
  // spiral foam arms
  ctx.save();
  ellipse(ctx, cx, cy, 170, 170);
  ctx.clip();
  ctx.lineCap = 'round';
  for (let arm = 0; arm < 5; arm++) {
    ctx.beginPath();
    for (let t = 0; t <= 1; t += 0.02) {
      const a = arm * ((Math.PI * 2) / 5) + t * Math.PI * 2.2;
      const rr = 40 + t * 140;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgba('#0a2030', 0.45);
    ctx.lineWidth = 16;
    ctx.stroke();
    ctx.strokeStyle = rgba('#e8fbff', 0.8);
    ctx.lineWidth = 7;
    ctx.stroke();
  }
  ctx.restore();
  // the maw: a dark throat ringed with teeth
  ellipse(ctx, cx, cy, 62, 62);
  ctx.fillStyle = rad(ctx, cx, cy, 62, [[0, '#000000'], [0.7, '#3a0a1a'], [1, '#8a1a2a']]);
  ctx.fill();
  stroke(ctx, 6);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const x0 = cx + Math.cos(a - 0.18) * 60;
    const y0 = cy + Math.sin(a - 0.18) * 60;
    const x1 = cx + Math.cos(a + 0.18) * 60;
    const y1 = cy + Math.sin(a + 0.18) * 60;
    const xt = cx + Math.cos(a) * 36;
    const yt = cy + Math.sin(a) * 36;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(xt, yt);
    ctx.lineTo(x1, y1);
    ctx.closePath();
    ctx.fillStyle = '#fff6e2';
    ctx.fill();
    stroke(ctx, 2.5);
  }
  shine(ctx, 110, 96, 40, 12, 0.35, -0.7);
  return c;
}

export const props: Record<string, () => HTMLCanvasElement> = {
  p9_wall: wall,
  p9_dust: dust,
  p9_stone: stone,
  p9_crack1: crack(1),
  p9_crack2: crack(2),
  p9_crack3: crack(3),
  p9_mirror: mirror,
  p9_snakehead: snakeHead,
  p9_fireball: fireball,
  p9_iceshard: iceShard,
  p9_poison: poison,
  p9_temper_fire: temper('fire'),
  p9_temper_ice: temper('ice'),
  p9_temper_poison: temper('poison'),
  p9_hourglass: hourglass,
  p9_atlashand: atlasHand,
  p9_flare: flare,
  p9_shadowhand: shadowHand,
  p9_slice: slice,
  p9_rift: rift,
  p9_chain: chain,
  p9_note: note,
  ev_charybdis: charybdis,
};
