// Props for the Stage 4–6 fights (src/game/bosses/act1b.ts): Short-Order Shoe's grabbing hand,
// T-Rex Toes' baby dinos, Ice Skate Ivy's snow and frost, The Colossus's cracks, shards, plates, glint and parry shield,
// UFO Toe's tractor beam and Cosmic Croc's meteor.
import { type Ctx, ellipse, makeCanvas, rgba, rng, roundRect, shade } from '../../art/util';

const INK = '#2a1810';

function ink(ctx: Ctx, lw = 5, col = INK): void {
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

/** Short-Order Shoe: a big grabbing hand in a chef's cuff, reaching right with its fingers hooked to snatch
 * (flip it in game). Drawn larger than it's shown. */
function grabHand(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(400, 300);
  const skin = '#f0c09c';
  const dark = shade(skin, -0.2);
  /** A finger: base → knuckle → hooked tip, as a thick inked stroke. */
  const finger = (pts: [number, number][], w: number) => {
    const draw = () => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      ctx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
      ctx.quadraticCurveTo(pts[3][0], pts[3][1], pts[4][0], pts[4][1]);
    };
    draw();
    ctx.lineWidth = w + 11;
    ctx.strokeStyle = INK;
    ctx.stroke();
    draw();
    ctx.lineWidth = w;
    ctx.strokeStyle = skin;
    ctx.stroke();
    // underside shadow
    ctx.save();
    ctx.translate(0, w * 0.22);
    draw();
    ctx.lineWidth = w * 0.42;
    ctx.strokeStyle = rgba(dark, 0.5);
    ctx.stroke();
    ctx.restore();
    // nail at the tip
    const [tx, ty] = pts[4];
    const [px, py] = pts[3];
    const ang = Math.atan2(ty - py, tx - px);
    ellipse(ctx, tx - Math.cos(ang) * 5, ty - Math.sin(ang) * 5, 9, 6.5, ang);
    ctx.fillStyle = '#fde8da';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = rgba(INK, 0.55);
    ctx.stroke();
    // knuckle crease
    const [kx, ky] = pts[2];
    ctx.beginPath();
    ctx.arc(kx, ky, w * 0.32, ang - 2.2, ang - 1.0);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = rgba(INK, 0.45);
    ctx.stroke();
  };
  // fingers first (index at the top, little at the bottom), spread wide and hooked down like a claw
  finger([[205, 106], [238, 80], [270, 74], [306, 70], [316, 104]], 37);
  finger([[218, 134], [254, 120], [290, 118], [328, 118], [332, 156]], 39);
  finger([[218, 164], [252, 166], [286, 172], [320, 178], [316, 212]], 37);
  finger([[206, 190], [234, 202], [260, 212], [284, 224], [276, 250]], 31);
  // palm
  ctx.beginPath();
  ctx.ellipse(178, 150, 66, 70, 0.1, 0, Math.PI * 2);
  ctx.fillStyle = lin(ctx, 0, 80, 0, 222, [[0, shade(skin, 0.16)], [0.55, skin], [1, dark]]);
  ctx.fill();
  ink(ctx, 6);
  ctx.beginPath();
  ctx.moveTo(158, 122);
  ctx.quadraticCurveTo(190, 150, 168, 188);
  ink(ctx, 3.5, rgba(INK, 0.4));
  // thumb: hooked up and over the top, ready to pinch
  const thumb = () => {
    ctx.beginPath();
    ctx.moveTo(160, 104);
    ctx.quadraticCurveTo(178, 40, 232, 34);
    ctx.quadraticCurveTo(262, 32, 268, 58);
  };
  thumb();
  ctx.lineWidth = 46;
  ctx.strokeStyle = INK;
  ctx.stroke();
  thumb();
  ctx.lineWidth = 35;
  ctx.strokeStyle = skin;
  ctx.stroke();
  ellipse(ctx, 263, 56, 10, 7, 1.2);
  ctx.fillStyle = '#fde8da';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = rgba(INK, 0.55);
  ctx.stroke();
  shine(ctx, 160, 112, 22, 10, 0.5, -0.4);
  shine(ctx, 214, 44, 16, 6, 0.45, -0.2);
  // chef's cuff: crisp white with red piping, flaring a little at the wrist
  ctx.beginPath();
  ctx.moveTo(26, 78);
  ctx.lineTo(118, 64);
  ctx.quadraticCurveTo(134, 150, 118, 236);
  ctx.lineTo(26, 222);
  ctx.quadraticCurveTo(16, 150, 26, 78);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 64, 0, 236, [[0, '#ffffff'], [0.6, '#f1eee8'], [1, '#c9c4bb']]);
  ctx.fill();
  ink(ctx, 6);
  for (const x of [52, 98]) {
    ctx.beginPath();
    ctx.moveTo(x, 74 - (x - 52) * 0.25);
    ctx.quadraticCurveTo(x + 8, 150, x, 228 + (x - 52) * 0.1);
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#d8343f';
    ctx.stroke();
  }
  shine(ctx, 72, 98, 26, 9, 0.7, -0.15);
  return c;
}

/** Short-Order Shoe: a length of chef's-jacket sleeve, running left to right. It's stretched along its
 * length to reach from off screen to the wrist, so everything in it runs lengthwise. */
function orderSleeve(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(256, 120);
  ctx.fillStyle = INK;
  ctx.fillRect(0, 8, 256, 104);
  ctx.fillStyle = lin(ctx, 0, 15, 0, 105, [[0, '#ffffff'], [0.45, '#f3f0ea'], [0.8, '#d6d1c8'], [1, '#b9b3a8']]);
  ctx.fillRect(0, 15, 256, 90);
  // red piping along the seam
  ctx.fillStyle = INK;
  ctx.fillRect(0, 34, 256, 16);
  ctx.fillStyle = '#d8343f';
  ctx.fillRect(0, 37, 256, 10);
  // soft crease and sheen
  ctx.fillStyle = rgba('#8a8070', 0.22);
  ctx.fillRect(0, 78, 256, 8);
  ctx.fillStyle = rgba('#ffffff', 0.75);
  ctx.fillRect(0, 22, 256, 6);
  return c;
}

/** T-Rex Toes: a baby dino mid-run, facing right. Two frames (the legs swap) so it scampers.
 * Drawn at 2× in a padded canvas so it stays crisp and its outline never clips. */
function babyDino(frame: 0 | 1): () => HTMLCanvasElement {
  return () => {
    const [c, ctx] = makeCanvas(420, 340);
    ctx.scale(2, 2);
    ctx.translate(8, 8);
    const g = '#72cf4e';
    const body = () => lin(ctx, 0, 20, 0, 140, [[0, shade(g, 0.25)], [0.55, g], [1, shade(g, -0.35)]]);
    const leg = (hipX: number, hipY: number, kneeX: number, footX: number, col: string) => {
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(hipX, hipY);
        ctx.lineTo(kneeX, 136);
        ctx.lineTo(footX, 144);
      };
      path();
      ink(ctx, 22);
      path();
      ctx.strokeStyle = col;
      ctx.lineWidth = 13;
      ctx.stroke();
    };
    // tail, swishing with the stride
    const tip = frame ? 34 : 48;
    ctx.beginPath();
    ctx.moveTo(72, 66);
    ctx.quadraticCurveTo(28, 58, 4, tip);
    ctx.quadraticCurveTo(26, 96, 80, 104);
    ctx.closePath();
    ctx.fillStyle = body();
    ctx.fill();
    ink(ctx, 5.5);
    // far leg (behind the body)
    if (frame) leg(90, 106, 110, 130, shade(g, -0.3));
    else leg(88, 106, 68, 84, shade(g, -0.3));
    // body and belly
    ctx.beginPath();
    ctx.ellipse(100, 86, 44, 33, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = body();
    ctx.fill();
    ink(ctx, 5.5);
    ctx.beginPath();
    ctx.ellipse(110, 98, 27, 17, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = lin(ctx, 0, 82, 0, 116, [[0, '#fff3b0'], [1, '#e8cf6a']]);
    ctx.fill();
    // near leg
    if (frame) leg(110, 108, 92, 72, g);
    else leg(112, 108, 132, 152, g);
    // big head
    ctx.beginPath();
    ctx.ellipse(148, 48, 42, 33, 0.15, 0, Math.PI * 2);
    ctx.fillStyle = body();
    ctx.fill();
    ink(ctx, 5.5);
    // open, hungry jaw and teeth
    ctx.beginPath();
    ctx.moveTo(150, 64);
    ctx.quadraticCurveTo(172, 78, 188, 56);
    ctx.quadraticCurveTo(176, 90, 150, 72);
    ctx.closePath();
    ctx.fillStyle = '#8a2a2a';
    ctx.fill();
    ink(ctx, 4);
    for (const x of [162, 172, 181]) {
      ctx.beginPath();
      ctx.moveTo(x - 4, 69 - (x - 162) * 0.45);
      ctx.lineTo(x, 77 - (x - 162) * 0.5);
      ctx.lineTo(x + 4, 68 - (x - 162) * 0.55);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ink(ctx, 2);
    }
    ellipse(ctx, 180, 40, 3, 2.2, 0.4);
    ctx.fillStyle = INK;
    ctx.fill();
    // hungry eye
    ellipse(ctx, 148, 36, 13, 14);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ink(ctx, 4);
    ellipse(ctx, 153, 38, 6.5, 8);
    ctx.fillStyle = INK;
    ctx.fill();
    ellipse(ctx, 155, 34, 2.4, 2.4);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(132, 18);
    ctx.lineTo(162, 24);
    ink(ctx, 5.5);
    // tiny grabby arm
    const arm = () => {
      ctx.beginPath();
      ctx.moveTo(126, 84);
      ctx.lineTo(142, frame ? 90 : 96);
    };
    arm();
    ink(ctx, 13);
    arm();
    ctx.strokeStyle = g;
    ctx.lineWidth = 7;
    ctx.stroke();
    // back spikes
    for (const [x, y] of [[66, 60], [84, 53], [104, 51], [122, 22]] as const) {
      ctx.beginPath();
      ctx.moveTo(x - 9, y + 7);
      ctx.lineTo(x, y - 11);
      ctx.lineTo(x + 9, y + 7);
      ctx.fillStyle = lin(ctx, 0, y - 11, 0, y + 7, [[0, '#ffe066'], [1, '#f0a020']]);
      ctx.fill();
      ink(ctx, 3.5);
    }
    shine(ctx, 136, 28, 13, 6, 0.5);
    shine(ctx, 88, 68, 14, 6, 0.4);
    return c;
  };
}

/** A soft ground shadow (dinos, blacksmith) so small runners sit on the table on any backdrop. */
function groundShadow(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(200, 60);
  const g = ctx.createRadialGradient(100, 30, 4, 100, 30, 98);
  g.addColorStop(0, 'rgba(20,10,5,0.55)');
  g.addColorStop(1, 'rgba(20,10,5,0)');
  ctx.save();
  ctx.scale(1, 0.3);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(100, 100, 98, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return c;
}

/** A dashed run path with an arrowhead, for the dinos' "this is where I'm going" tell. Stretched along x. */
function runArrow(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(256, 64);
  ctx.fillStyle = INK;
  for (let x = 4; x < 196; x += 36) {
    roundRect(ctx, x - 3, 22, 30, 20, 10);
    ctx.fill();
  }
  ctx.fillStyle = '#ffd23f';
  for (let x = 4; x < 196; x += 36) {
    roundRect(ctx, x, 25, 24, 14, 7);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(206, 6);
  ctx.lineTo(250, 32);
  ctx.lineTo(206, 58);
  ctx.closePath();
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
  ink(ctx, 5);
  return c;
}

/** The Colossus: a jagged crack (transparent around it) laid over his armour. Bright chipped edges
 * so it reads on dark steel. */
function crack(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(300, 300);
  ctx.scale(1.5, 1.5);
  const branches: [number, number][][] = [
    [[100, 100], [124, 82], [132, 56], [158, 40], [176, 14]],
    [[100, 100], [82, 118], [76, 146], [52, 160], [30, 188]],
    [[100, 100], [130, 112], [158, 108], [190, 124]],
    [[100, 100], [78, 84], [50, 80], [16, 64]],
    [[124, 82], [146, 92], [160, 84]],
    [[76, 146], [96, 168], [94, 190]],
    [[78, 84], [72, 58], [84, 34]],
  ];
  const path = (pts: [number, number][]) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  };
  // glinting chipped edge, then the dark split on top
  for (const [i, pts] of branches.entries()) {
    path(pts);
    ink(ctx, i < 4 ? 15 : 11, rgba('#f4f7fb', 0.9));
  }
  for (const [i, pts] of branches.entries()) {
    path(pts);
    ink(ctx, i < 4 ? 8 : 5, '#140c08');
  }
  ellipse(ctx, 100, 100, 15, 12);
  ctx.fillStyle = rgba('#f4f7fb', 0.9);
  ctx.fill();
  ellipse(ctx, 100, 100, 11, 8.5);
  ctx.fillStyle = '#140c08';
  ctx.fill();
  return c;
}

/** A broken-off piece of his armour: dark steel with a strip of the gold trim. */
function shard(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(150, 130);
  const outline = () => {
    ctx.beginPath();
    ctx.moveTo(14, 50);
    ctx.lineTo(62, 10);
    ctx.lineTo(132, 28);
    ctx.lineTo(118, 92);
    ctx.lineTo(58, 118);
    ctx.lineTo(24, 96);
    ctx.closePath();
  };
  outline();
  ctx.fillStyle = lin(ctx, 14, 10, 132, 118, [[0, '#c9ced6'], [0.4, '#7d848e'], [1, '#3b4048']]);
  ctx.fill();
  ctx.save();
  outline();
  ctx.clip();
  ctx.fillStyle = INK;
  ctx.fillRect(0, 70, 150, 16);
  ctx.fillStyle = lin(ctx, 0, 72, 0, 84, [[0, '#ffe07a'], [1, '#c8902a']]);
  ctx.fillRect(0, 73, 150, 10);
  ctx.restore();
  outline();
  ink(ctx, 6);
  ctx.beginPath();
  ctx.moveTo(62, 10);
  ctx.lineTo(70, 56);
  ctx.lineTo(118, 92);
  ink(ctx, 3, rgba(INK, 0.45));
  shine(ctx, 58, 34, 20, 7, 0.65);
  return c;
}

/** A big curved slab of his armour plating that breaks away when a crack goes all the way through. */
function chunk(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(260, 170);
  const outline = () => {
    ctx.beginPath();
    ctx.moveTo(16, 40);
    ctx.quadraticCurveTo(130, 6, 244, 40);
    ctx.lineTo(226, 92);
    ctx.lineTo(240, 128);
    ctx.quadraticCurveTo(150, 160, 70, 150);
    ctx.lineTo(44, 118);
    ctx.lineTo(24, 124);
    ctx.closePath();
  };
  outline();
  ctx.fillStyle = lin(ctx, 0, 10, 0, 160, [[0, '#a7aeb8'], [0.35, '#6b727c'], [1, '#30353c']]);
  ctx.fill();
  ctx.save();
  outline();
  ctx.clip();
  // the gold trim band that runs round his armour
  ctx.beginPath();
  ctx.moveTo(0, 104);
  ctx.quadraticCurveTo(130, 76, 260, 104);
  ctx.lineWidth = 22;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 13;
  ctx.strokeStyle = '#e6b23c';
  ctx.stroke();
  ctx.restore();
  outline();
  ink(ctx, 6.5);
  // jagged break line and rivets
  ctx.beginPath();
  ctx.moveTo(226, 92);
  ctx.lineTo(206, 100);
  ctx.lineTo(214, 116);
  ink(ctx, 3, rgba(INK, 0.6));
  for (const [x, y] of [[60, 48], [196, 48]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = rad(ctx, x, y, 7, [[0, '#ffffff'], [1, '#6d7480']]);
    ctx.fill();
    ink(ctx, 2.5);
  }
  shine(ctx, 104, 34, 46, 8, 0.6, -0.05);
  return c;
}


/** A freshly forged armour plate (Colossus phase 3): brighter steel with rivets and a hot rim. */
function plate(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(130, 110);
  roundRect(ctx, 10, 10, 110, 90, 22);
  ctx.fillStyle = lin(ctx, 10, 10, 120, 100, [[0, '#eef2f6'], [0.4, '#a9b2bd'], [1, '#5b636e']]);
  ctx.fill();
  ink(ctx, 6);
  roundRect(ctx, 20, 20, 90, 70, 14);
  ink(ctx, 4, '#ff9a3d');
  for (const [x, y] of [[26, 26], [104, 26], [26, 84], [104, 84]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = rad(ctx, x, y, 6, [[0, '#ffffff'], [1, '#6d7480']]);
    ctx.fill();
    ink(ctx, 2.5);
  }
  shine(ctx, 46, 36, 22, 8, 0.55);
  return c;
}

/** A big four-point glint: Colossus is about to parry. */
function glint(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(240, 240);
  const g = ctx.createRadialGradient(120, 120, 4, 120, 120, 110);
  g.addColorStop(0, 'rgba(255,250,200,0.95)');
  g.addColorStop(0.3, 'rgba(255,220,90,0.45)');
  g.addColorStop(1, 'rgba(255,220,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 240, 240);
  const star = (s: number, w: number) => {
    ctx.beginPath();
    ctx.moveTo(120, 120 - s);
    ctx.quadraticCurveTo(120 + w, 120 - w, 120 + s, 120);
    ctx.quadraticCurveTo(120 + w, 120 + w, 120, 120 + s);
    ctx.quadraticCurveTo(120 - w, 120 + w, 120 - s, 120);
    ctx.quadraticCurveTo(120 - w, 120 - w, 120, 120 - s);
    ctx.closePath();
  };
  star(112, 12);
  ctx.fillStyle = '#ffe14d';
  ctx.fill();
  ink(ctx, 4);
  star(84, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  return c;
}

/** The parry: a gold-trimmed kite shield that snaps up in front of him. */
function parryShield(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(240, 290);
  const path = (inset: number) => {
    ctx.beginPath();
    ctx.moveTo(120, 14 + inset);
    ctx.quadraticCurveTo(200, 28 + inset, 224 - inset, 30 + inset);
    ctx.quadraticCurveTo(222 - inset, 190, 120, 276 - inset);
    ctx.quadraticCurveTo(18 + inset, 190, 16 + inset, 30 + inset);
    ctx.quadraticCurveTo(40, 28 + inset, 120, 14 + inset);
    ctx.closePath();
  };
  path(0);
  ctx.fillStyle = lin(ctx, 0, 14, 0, 276, [[0, '#ffe680'], [1, '#c8902a']]);
  ctx.fill();
  ink(ctx, 7);
  path(18);
  ctx.fillStyle = lin(ctx, 20, 30, 220, 260, [[0, '#dfe4ea'], [0.5, '#8d95a0'], [1, '#4b525c']]);
  ctx.fill();
  ink(ctx, 4);
  // cross emblem
  ctx.fillStyle = '#c8302a';
  ctx.fillRect(108, 46, 24, 196);
  ctx.fillRect(52, 104, 136, 24);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(108, 46, 24, 196);
  ctx.strokeRect(52, 104, 136, 24);
  shine(ctx, 76, 70, 26, 12, 0.55);
  return c;
}

/** Ice Skate Ivy: a heavy snow cloud that hangs over one lane. */
function snowCloud(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(320, 160);
  const puffs: [number, number, number][] = [
    [70, 96, 50],
    [130, 70, 62],
    [200, 64, 58],
    [258, 96, 46],
    [160, 108, 52],
  ];
  const outline = () => {
    ctx.beginPath();
    for (const [x, y, r] of puffs) {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
  };
  outline();
  ink(ctx, 12);
  outline();
  ctx.fillStyle = lin(ctx, 0, 10, 0, 156, [[0, '#ffffff'], [0.6, '#d6e6f6'], [1, '#9db8d6']]);
  ctx.fill();
  shine(ctx, 120, 44, 30, 12, 0.7, -0.2);
  shine(ctx, 196, 38, 22, 9, 0.6, -0.2);
  return c;
}

/** A single snowflake. */
function flake(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(48, 48);
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(24 - Math.cos(a) * 19, 24 - Math.sin(a) * 19);
    ctx.lineTo(24 + Math.cos(a) * 19, 24 + Math.sin(a) * 19);
    ink(ctx, 7, rgba('#3a5a8a', 0.6));
    ctx.beginPath();
    ctx.moveTo(24 - Math.cos(a) * 19, 24 - Math.sin(a) * 19);
    ctx.lineTo(24 + Math.cos(a) * 19, 24 + Math.sin(a) * 19);
    ink(ctx, 3.5, '#ffffff');
  }
  return c;
}

/** Ice Skate Ivy: a frozen lane, a tall pane of frost with icicles along the top and a snow drift at the
 * bottom. It's stretched to the lane's size, so the detail sits near the edges. */
function frostColumn(): HTMLCanvasElement {
  const W = 320;
  const H = 900;
  const [c, ctx] = makeCanvas(W, H);
  const r = rng(77);
  // frosted glass: milky at the top and bottom, clearer in the middle so the feet still read
  roundRect(ctx, 10, 10, W - 20, H - 20, 40);
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, 'rgba(225,244,255,0.62)'], [0.18, 'rgba(190,228,255,0.3)'], [0.75, 'rgba(190,228,255,0.24)'], [1, 'rgba(235,248,255,0.7)']]);
  ctx.fill();
  // frost creeping in from the sides
  const side = lin(ctx, 10, 0, W - 10, 0, [[0, 'rgba(255,255,255,0.55)'], [0.16, 'rgba(255,255,255,0)'], [0.84, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0.55)']]);
  roundRect(ctx, 10, 10, W - 20, H - 20, 40);
  ctx.fillStyle = side;
  ctx.fill();
  // little frost crystals along both edges
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 46; i++) {
    const left = i % 2 === 0;
    const x = left ? 26 + r() * 40 : W - 26 - r() * 40;
    const y = 60 + r() * (H - 160);
    const s = 6 + r() * 9;
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(a) * s, y - Math.sin(a) * s);
      ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
      ctx.stroke();
    }
  }
  // icy rim
  roundRect(ctx, 10, 10, W - 20, H - 20, 40);
  ctx.lineWidth = 12;
  ctx.strokeStyle = 'rgba(42,24,16,0.55)';
  ctx.stroke();
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#d8f0ff';
  ctx.stroke();
  // icicles hanging off the top
  for (let x = 24; x < W - 24; x += 26 + r() * 10) {
    const len = 34 + r() * 50;
    ctx.beginPath();
    ctx.moveTo(x - 11, 14);
    ctx.lineTo(x + 1, 14 + len);
    ctx.lineTo(x + 12, 14);
    ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, 14, 0, 14 + len, [[0, '#ffffff'], [1, '#9fd3ff']]);
    ctx.fill();
    ink(ctx, 3.5, rgba(INK, 0.6));
  }
  // snow drift along the bottom
  ctx.beginPath();
  ctx.moveTo(12, H - 12);
  for (let x = 12; x <= W - 12; x += 38) ctx.quadraticCurveTo(x + 19, H - 64 - r() * 26, x + 38, H - 30 - r() * 10);
  ctx.lineTo(W - 12, H - 12);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, H - 90, 0, H, [[0, '#ffffff'], [1, '#c6def2']]);
  ctx.fill();
  ink(ctx, 4.5, rgba(INK, 0.6));
  shine(ctx, 64, 140, 18, 70, 0.35, 0);
  return c;
}

/** Ice Skate Ivy: "don't smack here", a peel in a frosty no-entry sign. */
function noPeel(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(170, 170);
  ctx.beginPath();
  ctx.arc(85, 85, 72, 0, Math.PI * 2);
  ctx.fillStyle = rad(ctx, 85, 85, 72, [[0, '#ffffff'], [1, '#cfe9ff']]);
  ctx.fill();
  ink(ctx, 8);
  // the peel: paddle and handle
  ctx.save();
  ctx.translate(85, 85);
  ctx.rotate(-0.6);
  roundRect(ctx, -7, 6, 14, 52, 6);
  ctx.fillStyle = '#b07a40';
  ctx.fill();
  ink(ctx, 4);
  ctx.beginPath();
  ctx.ellipse(0, -16, 30, 34, 0, 0, Math.PI * 2);
  ctx.fillStyle = lin(ctx, 0, -50, 0, 18, [[0, '#f2c27a'], [1, '#c98a3c']]);
  ctx.fill();
  ink(ctx, 4.5);
  ctx.restore();
  // red ring and slash
  ctx.beginPath();
  ctx.arc(85, 85, 64, 0, Math.PI * 2);
  ctx.lineWidth = 15;
  ctx.strokeStyle = '#e8353a';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(40, 40);
  ctx.lineTo(130, 130);
  ctx.lineWidth = 15;
  ctx.strokeStyle = '#e8353a';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(85, 85, 72, 0, Math.PI * 2);
  ink(ctx, 6);
  shine(ctx, 58, 46, 18, 8, 0.6);
  return c;
}

/** UFO Toe: the tractor beam, a glowing cone with bright rims and bands. Stretched to the lane's height. */
function ufoBeam(): HTMLCanvasElement {
  const W = 320;
  const H = 600;
  const [c, ctx] = makeCanvas(W, H);
  const cone = (inset: number) => {
    ctx.beginPath();
    ctx.moveTo(W / 2 - 48 + inset, 0);
    ctx.lineTo(W / 2 + 48 - inset, 0);
    ctx.lineTo(W - 8 - inset * 2, H);
    ctx.lineTo(8 + inset * 2, H);
    ctx.closePath();
  };
  // soft outer glow
  cone(-6);
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, 'rgba(150,255,130,0.4)'], [1, 'rgba(150,255,130,0.12)']]);
  ctx.fill();
  // body: brighter at the rims than the middle, like light through smoke
  cone(4);
  ctx.fillStyle = lin(ctx, 0, 0, W, 0, [[0, 'rgba(210,255,190,0.85)'], [0.2, 'rgba(150,255,130,0.35)'], [0.5, 'rgba(190,255,170,0.5)'], [0.8, 'rgba(150,255,130,0.35)'], [1, 'rgba(210,255,190,0.85)']]);
  ctx.fill();
  // bright core
  ctx.beginPath();
  ctx.moveTo(W / 2 - 14, 0);
  ctx.lineTo(W / 2 + 14, 0);
  ctx.lineTo(W / 2 + 60, H);
  ctx.lineTo(W / 2 - 60, H);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, 'rgba(255,255,255,0.75)'], [1, 'rgba(230,255,220,0.2)']]);
  ctx.fill();
  // rim lines
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(W / 2 + sgn * 44, 0);
    ctx.lineTo(W / 2 + sgn * (W / 2 - 14), H);
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(240,255,230,0.9)';
    ctx.stroke();
  }
  return c;
}

/** UFO Toe: one ring of the beam, slid down it in game. */
function ufoRing(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(260, 70);
  ellipse(ctx, 130, 35, 120, 24);
  ctx.lineWidth = 9;
  ctx.strokeStyle = 'rgba(80,190,70,0.6)';
  ctx.stroke();
  ellipse(ctx, 130, 35, 120, 24);
  ctx.lineWidth = 4.5;
  ctx.strokeStyle = 'rgba(235,255,225,0.95)';
  ctx.stroke();
  return c;
}

/** UFO Toe: the glow the beam throws on the pizza it's lifting. */
function ufoGlow(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(360, 140);
  ctx.save();
  ctx.scale(1, 140 / 360);
  const g = ctx.createRadialGradient(180, 180, 10, 180, 180, 178);
  g.addColorStop(0, 'rgba(220,255,200,0.85)');
  g.addColorStop(0.55, 'rgba(150,255,130,0.4)');
  g.addColorStop(1, 'rgba(150,255,130,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(180, 180, 178, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return c;
}

/** Cosmic Croc: a flaming meteor, a cratered rock in a ring of fire (it tumbles as it falls). */
function meteor(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(220, 220);
  const r = rng(31);
  // flame corona
  const glow = ctx.createRadialGradient(110, 110, 30, 110, 110, 108);
  glow.addColorStop(0, 'rgba(255,220,90,0.95)');
  glow.addColorStop(0.5, 'rgba(255,130,40,0.6)');
  glow.addColorStop(1, 'rgba(255,80,20,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 220, 220);
  ctx.beginPath();
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rr = i % 2 === 0 ? 92 + r() * 12 : 64;
    const x = 110 + Math.cos(a) * rr;
    const y = 110 + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.quadraticCurveTo(110 + Math.cos(a - 0.2) * (rr + 10), 110 + Math.sin(a - 0.2) * (rr + 10), x, y);
  }
  ctx.closePath();
  ctx.fillStyle = rad(ctx, 110, 110, 100, [[0, '#fff2a0'], [0.5, '#ffb03a'], [1, '#ff5a1f']]);
  ctx.fill();
  ink(ctx, 5);
  // the rock
  ctx.beginPath();
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const rr = 50 + r() * 8;
    const x = 110 + Math.cos(a) * rr;
    const y = 110 + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = rad(ctx, 110, 110, 58, [[0, '#a08876'], [0.6, '#6e5646'], [1, '#3e2e26']]);
  ctx.fill();
  ink(ctx, 6);
  for (const [x, y, s] of [[92, 96, 13], [128, 122, 10], [120, 88, 7], [96, 130, 7]] as const) {
    ellipse(ctx, x, y, s, s * 0.8);
    ctx.fillStyle = rgba('#2a1810', 0.45);
    ctx.fill();
    ellipse(ctx, x + 1.5, y + 1.5, s * 0.7, s * 0.55);
    ctx.fillStyle = rgba('#ffb060', 0.5);
    ctx.fill();
  }
  shine(ctx, 94, 80, 16, 7, 0.45);
  return c;
}

export const props: Record<string, () => HTMLCanvasElement> = {
  p_order_hand: grabHand,
  p_order_sleeve: orderSleeve,
  p_babydino: babyDino(0),
  p_babydino2: babyDino(1),
  p_ground_shadow: groundShadow,
  p_run_arrow: runArrow,
  p_colossus_chunk: chunk,
  p_ivy_frost: frostColumn,
  p_ivy_nopeel: noPeel,
  p_ufo_beam: ufoBeam,
  p_ufo_ring: ufoRing,
  p_ufo_glow: ufoGlow,
  p_meteor: meteor,
  p_colossus_crack: crack,
  p_colossus_shard: shard,
  p_colossus_plate: plate,
  p_colossus_glint: glint,
  p_colossus_shield: parryShield,
  p_ivy_cloud: snowCloud,
  p_ivy_flake: flake,
};
