// Props for the Stage 4–6 fights (src/game/bosses/act1b.ts): Short-Order Shoe's grabbing hand,
// T-Rex Toes' baby dinos, Ice Skate Ivy's snow, and The Colossus's cracks, shards, plates, glint and parry shield.
import { type Ctx, ellipse, makeCanvas, rgba, roundRect, shade } from '../../art/util';

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

/** Short-Order Shoe: an open, grabbing hand in a chef's cuff, reaching right (rotate it in game). */
function grabHand(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(250, 180);
  const skin = '#efc0a0';
  const fill = () => lin(ctx, 0, 30, 0, 160, [[0, shade(skin, 0.15)], [0.6, skin], [1, shade(skin, -0.25)]]);
  // fingers: four spread, curled at the tips like they're about to snatch
  const fingers: [number, number, number, number][] = [
    [150, 52, 222, 26],
    [158, 74, 238, 64],
    [158, 98, 236, 108],
    [150, 120, 214, 146],
  ];
  const widths = [16, 17, 17, 15];
  fingers.forEach(([x0, y0, x1, y1], i) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2 + 6, (y0 + y1) / 2 - 6, x1, y1);
    ctx.lineWidth = widths[i] * 2 + 10;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = widths[i] * 2;
    ctx.strokeStyle = skin;
    ctx.stroke();
    // knuckle crease and nail
    ellipse(ctx, x1 - 4, y1 - 2, 7, 5, 0.3);
    ctx.fillStyle = '#fbe3d3';
    ctx.fill();
  });
  // thumb hooked up and over
  ctx.beginPath();
  ctx.moveTo(110, 48);
  ctx.quadraticCurveTo(128, 6, 170, 14);
  ctx.lineWidth = 42;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 32;
  ctx.strokeStyle = skin;
  ctx.stroke();
  // palm
  ctx.beginPath();
  ctx.ellipse(120, 88, 50, 54, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill();
  ctx.fill();
  ink(ctx, 5.5);
  ctx.beginPath();
  ctx.moveTo(104, 70);
  ctx.quadraticCurveTo(122, 92, 108, 118);
  ink(ctx, 3, rgba(INK, 0.45));
  shine(ctx, 108, 64, 18, 9, 0.45);
  // chef's cuff: white with a red stripe
  roundRect(ctx, 22, 40, 64, 96, 14);
  ctx.fillStyle = lin(ctx, 0, 40, 0, 136, [[0, '#ffffff'], [1, '#d9d6cf']]);
  ctx.fill();
  ink(ctx, 5.5);
  ctx.fillStyle = '#d8343f';
  ctx.fillRect(48, 42, 12, 92);
  ctx.beginPath();
  ctx.moveTo(48, 42);
  ctx.lineTo(48, 134);
  ctx.moveTo(60, 42);
  ctx.lineTo(60, 134);
  ink(ctx, 2.5, rgba(INK, 0.6));
  // speed lines behind it
  for (const [y, w] of [[60, 18], [90, 24], [118, 16]] as const) {
    ctx.beginPath();
    ctx.moveTo(2, y);
    ctx.lineTo(w, y);
    ink(ctx, 4, rgba('#ffffff', 0.8));
  }
  return c;
}

/** T-Rex Toes: a baby dino mid-run, facing right. */
function babyDino(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(200, 160);
  const g = '#6cc24a';
  const body = () => lin(ctx, 0, 30, 0, 140, [[0, shade(g, 0.2)], [0.6, g], [1, shade(g, -0.35)]]);
  // tail
  ctx.beginPath();
  ctx.moveTo(70, 70);
  ctx.quadraticCurveTo(26, 62, 6, 40);
  ctx.quadraticCurveTo(24, 92, 78, 104);
  ctx.closePath();
  ctx.fillStyle = body();
  ctx.fill();
  ink(ctx);
  // back leg (mid-stride, behind)
  ctx.beginPath();
  ctx.moveTo(86, 108);
  ctx.lineTo(62, 140);
  ctx.lineTo(80, 146);
  ink(ctx, 20);
  ctx.strokeStyle = shade(g, -0.25);
  ctx.lineWidth = 12;
  ctx.stroke();
  // body
  ctx.beginPath();
  ctx.ellipse(98, 88, 42, 32, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = body();
  ctx.fill();
  ink(ctx);
  ctx.beginPath();
  ctx.ellipse(108, 100, 26, 16, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = '#f2e08a';
  ctx.fill();
  // front leg
  ctx.beginPath();
  ctx.moveTo(110, 110);
  ctx.lineTo(128, 140);
  ctx.lineTo(146, 142);
  ink(ctx, 20);
  ctx.strokeStyle = g;
  ctx.lineWidth = 12;
  ctx.stroke();
  // big head
  ctx.beginPath();
  ctx.ellipse(146, 50, 40, 32, 0.15, 0, Math.PI * 2);
  ctx.fillStyle = body();
  ctx.fill();
  ink(ctx);
  // snout and grin
  ctx.beginPath();
  ctx.moveTo(150, 66);
  ctx.quadraticCurveTo(170, 74, 184, 58);
  ink(ctx, 4);
  for (const x of [160, 170]) {
    ctx.beginPath();
    ctx.moveTo(x, 68);
    ctx.lineTo(x + 3, 76);
    ctx.lineTo(x + 6, 67);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ink(ctx, 2);
  }
  // hungry eye
  ellipse(ctx, 148, 38, 12, 13);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ink(ctx, 4);
  ellipse(ctx, 152, 40, 6, 7);
  ctx.fillStyle = INK;
  ctx.fill();
  ellipse(ctx, 154, 37, 2, 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  // brow
  ctx.beginPath();
  ctx.moveTo(134, 22);
  ctx.lineTo(160, 28);
  ink(ctx, 5);
  // tiny arm
  ctx.beginPath();
  ctx.moveTo(126, 86);
  ctx.lineTo(140, 94);
  ink(ctx, 12);
  ctx.strokeStyle = g;
  ctx.lineWidth = 6;
  ctx.stroke();
  // back spikes
  for (const [x, y] of [[70, 62], [86, 56], [104, 54], [120, 26]] as const) {
    ctx.beginPath();
    ctx.moveTo(x - 8, y + 6);
    ctx.lineTo(x, y - 10);
    ctx.lineTo(x + 8, y + 6);
    ctx.fillStyle = '#ffcc33';
    ctx.fill();
    ink(ctx, 3);
  }
  shine(ctx, 136, 30, 12, 6, 0.4);
  return c;
}

/** The Colossus: a jagged crack (transparent around it) laid over his armour. */
function crack(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(200, 200);
  const branches: [number, number][][] = [
    [[100, 100], [124, 82], [132, 56], [158, 40], [176, 14]],
    [[100, 100], [82, 118], [76, 146], [52, 160], [30, 188]],
    [[100, 100], [130, 112], [158, 108], [190, 124]],
    [[100, 100], [78, 84], [50, 80], [16, 64]],
    [[124, 82], [146, 92], [160, 84]],
    [[76, 146], [96, 168], [94, 190]],
  ];
  const path = (pts: [number, number][]) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  };
  // light chipped edge, then the dark split on top
  for (const pts of branches) {
    path(pts);
    ink(ctx, 13, rgba('#ffffff', 0.55));
  }
  for (const [i, pts] of branches.entries()) {
    path(pts);
    ink(ctx, i < 4 ? 8 : 5, '#140c08');
  }
  ellipse(ctx, 100, 100, 12, 10);
  ctx.fillStyle = '#140c08';
  ctx.fill();
  return c;
}

/** A broken-off piece of armour. */
function shard(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(90, 80);
  ctx.beginPath();
  ctx.moveTo(10, 30);
  ctx.lineTo(38, 6);
  ctx.lineTo(80, 18);
  ctx.lineTo(70, 56);
  ctx.lineTo(34, 72);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 10, 6, 80, 72, [[0, '#d6dbe2'], [0.45, '#8d95a0'], [1, '#4b525c']]);
  ctx.fill();
  ink(ctx, 4.5);
  ctx.beginPath();
  ctx.moveTo(38, 6);
  ctx.lineTo(44, 40);
  ctx.lineTo(70, 56);
  ink(ctx, 2.5, rgba(INK, 0.5));
  shine(ctx, 36, 24, 12, 5, 0.6);
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

export const props: Record<string, () => HTMLCanvasElement> = {
  p_order_hand: grabHand,
  p_babydino: babyDino,
  p_colossus_crack: crack,
  p_colossus_shard: shard,
  p_colossus_plate: plate,
  p_colossus_glint: glint,
  p_colossus_shield: parryShield,
  p_ivy_cloud: snowCloud,
  p_ivy_flake: flake,
};
