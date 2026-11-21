// Props for the Stage 7–9 fights (Dough Boy, Nonna, Kraken): dough ball, rolling pin (six roll frames),
// Nonna's knitted slipper, spoon bowl, big tentacle and the coil it wraps round a pizza, the flying ink
// blob and the ink splat on a pizza. Same style as src/art/eventArt.ts.
import { type Ctx, ellipse, makeCanvas, rgba, rng, roundRect, shade } from '../../art/util';

const INK = '#2a1810';

function stroke(ctx: Ctx, lw = 4, col = INK): void {
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

/** A lumpy, proofed dough ball: baked-golden with a dark outline so it reads against Dough Boy's own cream. */
function doughBall(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(220, 220);
  const lump = () => {
    ctx.beginPath();
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 84 + ((i * 37) % 5) * 3;
      const x = 110 + Math.cos(a) * r;
      const y = 114 + Math.sin(a) * r * 0.92;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.quadraticCurveTo(110 + Math.cos(a - 0.35) * r * 1.08, 114 + Math.sin(a - 0.35) * r, x, y);
    }
    ctx.closePath();
  };
  lump();
  ctx.fillStyle = rad(ctx, 110, 114, 100, [[0, '#ffe7b0'], [0.45, '#f2bf6c'], [0.85, '#d08a3c'], [1, '#a4622a']]);
  ctx.fill();
  ctx.save();
  lump();
  ctx.clip();
  // a toasty crust on the shadow side
  ellipse(ctx, 140, 160, 90, 60, -0.4);
  ctx.fillStyle = rgba('#8a4a1a', 0.22);
  ctx.fill();
  ctx.restore();
  lump();
  stroke(ctx, 8);
  // fold creases
  ctx.strokeStyle = rgba(INK, 0.5);
  ctx.lineWidth = 5;
  for (const [x0, y0, x1, y1, cx, cy] of [[64, 128, 118, 162, 86, 162], [128, 74, 162, 120, 162, 86]]) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
    ctx.stroke();
  }
  // flour dust
  ctx.fillStyle = rgba('#ffffff', 0.85);
  for (const [x, y, r] of [[74, 86, 6], [140, 162, 5], [164, 104, 4], [98, 144, 4], [122, 62, 5], [56, 112, 3], [150, 140, 3]]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  shine(ctx, 78, 70, 28, 13, 0.7);
  return c;
}

/** A huge wooden rolling pin that spans the whole table. `frame` (0–5) turns the barrel a sixth of a
 * grain repeat, so cycling the frames makes it roll. Grain and flour repeat every third of a turn. */
function rollingPin(frame: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(1560, 200);
  const cy = 100;
  const R = 82;
  // handles, with a dark collar where they meet the barrel
  for (const [x, dir] of [[14, 1], [1406, -1]] as const) {
    roundRect(ctx, x, 70, 140, 60, 28);
    ctx.fillStyle = lin(ctx, 0, 70, 0, 130, [[0, '#e0a868'], [0.5, '#b0743a'], [1, '#6e4018']]);
    ctx.fill();
    stroke(ctx, 7);
    roundRect(ctx, x + 22, 78, 96, 12, 6);
    ctx.fillStyle = rgba('#ffffff', 0.35);
    ctx.fill();
    roundRect(ctx, dir > 0 ? x + 118 : x - 6, 80, 28, 40, 8);
    ctx.fillStyle = '#7a4a20';
    ctx.fill();
    stroke(ctx, 5);
  }
  const barrel = () => roundRect(ctx, 150, cy - R, 1260, R * 2, 76);
  barrel();
  ctx.fillStyle = lin(ctx, 0, cy - R, 0, cy + R, [[0, '#f8d8a0'], [0.3, '#ecbc78'], [0.72, '#c88a4e'], [1, '#8a5428']]);
  ctx.fill();
  ctx.save();
  barrel();
  ctx.clip();
  const turn = (frame / 6) * ((Math.PI * 2) / 3);
  // grain bands round the barrel: they slide down the face and squash towards the edges as it turns
  for (let k = 0; k < 3; k++) {
    const phi = ((k * Math.PI * 2) / 3 + turn) % (Math.PI * 2);
    const ang = phi > Math.PI ? phi - Math.PI * 2 : phi; // -π…π, 0 = facing us
    const face = Math.cos(ang);
    if (face <= 0.05) continue;
    const y = cy + R * Math.sin(ang);
    ctx.strokeStyle = rgba('#7a4418', 0.55 * face);
    ctx.lineWidth = 2 + 4 * face;
    ctx.beginPath();
    ctx.moveTo(170, y);
    for (let x = 170; x < 1390; x += 110) ctx.quadraticCurveTo(x + 55, y + ((x / 110) % 2 ? 7 : -7) * face, x + 110, y);
    ctx.stroke();
  }
  // knots and flour, also three-fold so the loop is seamless
  const r = rng(77);
  const dots: [number, number, number, boolean][] = [];
  for (let i = 0; i < 26; i++) dots.push([180 + r() * 1200, r() * ((Math.PI * 2) / 3), 3 + r() * 4, i % 6 === 0]);
  for (const [x, a0, size, knot] of dots) {
    for (let k = 0; k < 3; k++) {
      const phi = (a0 + (k * Math.PI * 2) / 3 + turn) % (Math.PI * 2);
      const ang = phi > Math.PI ? phi - Math.PI * 2 : phi;
      const face = Math.cos(ang);
      if (face <= 0.1) continue;
      const y = cy + R * Math.sin(ang);
      if (knot) {
        ellipse(ctx, x, y, size * 3.2, size * 1.6 * face);
        ctx.fillStyle = rgba('#6a3a14', 0.5 * face);
      } else {
        ellipse(ctx, x, y, size, size * face);
        ctx.fillStyle = rgba('#ffffff', 0.75 * face);
      }
      ctx.fill();
    }
  }
  ctx.restore();
  barrel();
  stroke(ctx, 8);
  // fixed light: a soft sheen across the top and a rim light along the bottom
  roundRect(ctx, 210, cy - R + 16, 1140, 26, 13);
  ctx.fillStyle = rgba('#ffffff', 0.42);
  ctx.fill();
  roundRect(ctx, 240, cy + R - 20, 1080, 8, 4);
  ctx.fillStyle = rgba('#ffe2b0', 0.35);
  ctx.fill();
  return c;
}

/** Nonna's own slipper, top-down: pink knit with mustard stripes, a fuzzy edge, the foot opening and a pom-pom. */
function bigSlipper(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(440, 240);
  const pink = '#c2335a';
  const gold = '#f2c14e';
  const body = () => {
    ctx.beginPath();
    // toe on the left, heel on the right: a fat peanut shape
    ctx.moveTo(40, 120);
    ctx.bezierCurveTo(40, 40, 170, 30, 230, 52);
    ctx.bezierCurveTo(290, 70, 400, 40, 410, 120);
    ctx.bezierCurveTo(400, 200, 290, 172, 230, 190);
    ctx.bezierCurveTo(170, 210, 40, 200, 40, 120);
    ctx.closePath();
  };
  // fuzzy halo along the edge
  const r = rng(31);
  for (let i = 0; i < 150; i++) {
    const t = (i / 150) * Math.PI * 2;
    // walk out from the middle to the edge of the shape, so the fuzz hugs the peanut outline
    body();
    let d = 40;
    while (d < 220 && ctx.isPointInPath(225 + Math.cos(t) * d * 2.2, 120 + Math.sin(t) * d)) d += 2;
    const x = 225 + Math.cos(t) * (d - 3) * 2.2;
    const y = 120 + Math.sin(t) * (d - 3);
    const a = t + (r() - 0.5) * 0.9;
    const len = 9 + r() * 8;
    ctx.strokeStyle = i % 2 ? shade(pink, 0.25) : '#7a1838';
    ctx.lineWidth = i % 2 ? 4 : 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  body();
  ctx.fillStyle = pink;
  ctx.fill();
  ctx.save();
  body();
  ctx.clip();
  // knitted stripes across the slipper, then rows of V stitches
  const stripes: [number, number][] = [[110, 26], [196, 26], [300, 24]];
  for (const [x0, w] of stripes) {
    ctx.fillStyle = gold;
    ctx.fillRect(x0, 0, w, 240);
  }
  for (let x = 20; x < 430; x += 13) {
    const inStripe = stripes.some(([x0, w]) => x >= x0 - 6 && x < x0 + w - 6);
    const base = inStripe ? gold : pink;
    for (let y = 20; y < 230; y += 13) {
      ctx.strokeStyle = shade(base, 0.28);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 9, y + 6.5);
      ctx.lineTo(x, y + 13);
      ctx.stroke();
      ctx.strokeStyle = rgba(shade(base, -0.5), 0.4);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 1);
      ctx.lineTo(x + 12, y + 6.5);
      ctx.lineTo(x + 4, y + 12);
      ctx.stroke();
    }
  }
  // volume: lit from the top left, dark underneath
  const vol = ctx.createRadialGradient(170, 80, 20, 225, 120, 230);
  vol.addColorStop(0, rgba('#ffffff', 0.28));
  vol.addColorStop(0.55, rgba('#ffffff', 0));
  vol.addColorStop(1, rgba('#000000', 0.42));
  ctx.fillStyle = vol;
  ctx.fillRect(0, 0, 440, 240);
  ctx.restore();
  body();
  stroke(ctx, 7);
  // the foot opening at the heel end, with a rolled cuff
  ellipse(ctx, 300, 120, 78, 50);
  ctx.fillStyle = lin(ctx, 0, 70, 0, 170, [[0, '#3a0818'], [1, '#7a1a3a']]);
  ctx.fill();
  ctx.lineWidth = 18;
  ctx.strokeStyle = shade(pink, 0.18);
  ctx.stroke();
  ellipse(ctx, 300, 120, 87, 59);
  stroke(ctx, 5);
  ellipse(ctx, 300, 120, 69, 41);
  stroke(ctx, 4);
  ctx.beginPath();
  ctx.ellipse(300, 120, 78, 50, 0, Math.PI * 1.1, Math.PI * 1.6);
  ctx.strokeStyle = rgba('#ffffff', 0.45);
  ctx.lineWidth = 5;
  ctx.stroke();
  // a big fluffy pom-pom on the toe
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const len = 44 + r() * 12;
    ctx.strokeStyle = i % 3 ? '#ffffff' : '#e8d8e0';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(96, 118);
    ctx.lineTo(96 + Math.cos(a) * len, 118 + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(96, 118, 42, 0, Math.PI * 2);
  ctx.fillStyle = rad(ctx, 96, 118, 46, [[0, '#ffffff'], [0.7, '#f4eaf0'], [1, '#cdb8c4']]);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.6);
  ctx.lineWidth = 4;
  ctx.stroke();
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * 30;
    ctx.strokeStyle = rgba('#b8a0b0', 0.7);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(96 + Math.cos(a) * d, 118 + Math.sin(a) * d);
    ctx.lineTo(96 + Math.cos(a) * (d + 9), 118 + Math.sin(a) * (d + 9));
    ctx.stroke();
  }
  shine(ctx, 82, 100, 16, 9, 0.8);
  return c;
}

/** The bowl end of Nonna's wooden spoon, clamped down over the peel (the handle is drawn live). */
function spoonBowl(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(170, 200);
  // the neck where the handle joins
  roundRect(ctx, 70, 0, 30, 40, 12);
  ctx.fillStyle = lin(ctx, 70, 0, 100, 0, [[0, '#e8b070'], [1, '#9a5f2c']]);
  ctx.fill();
  stroke(ctx, 6);
  ellipse(ctx, 85, 112, 72, 82);
  ctx.fillStyle = rad(ctx, 85, 112, 92, [[0, '#f8d098'], [0.6, '#d49a58'], [1, '#8a5428']]);
  ctx.fill();
  stroke(ctx, 8);
  // the hollow of the bowl
  ellipse(ctx, 88, 120, 48, 58);
  ctx.fillStyle = lin(ctx, 0, 62, 0, 178, [[0, '#6e4018'], [0.6, '#a86c34'], [1, '#d8a060']]);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.55);
  ctx.lineWidth = 4;
  ctx.stroke();
  // grain
  ctx.strokeStyle = rgba('#6e4018', 0.4);
  ctx.lineWidth = 3;
  for (const dx of [-60, 56]) {
    ctx.beginPath();
    ctx.moveTo(85 + dx * 0.9, 70);
    ctx.quadraticCurveTo(85 + dx * 1.05, 120, 85 + dx * 0.8, 170);
    ctx.stroke();
  }
  shine(ctx, 56, 70, 18, 9, 0.65);
  shine(ctx, 104, 152, 14, 6, 0.3, 0.3);
  return c;
}

/** The spine of the big tentacle: base at the bottom centre, a big S that curls over at the tip. */
function tentacleSpine(): { x: number; y: number; w: number }[] {
  const bez = (p: number[][], t: number) => {
    const u = 1 - t;
    return [0, 1].map((k) => u * u * u * p[0][k] + 3 * u * u * t * p[1][k] + 3 * u * t * t * p[2][k] + t * t * t * p[3][k]);
  };
  const segs = [
    [[180, 790], [110, 620], [300, 470], [230, 300]],
    [[230, 300], [190, 190], [150, 90], [230, 56]],
    [[230, 56], [300, 30], [320, 120], [262, 132]],
  ];
  const pts: { x: number; y: number; w: number }[] = [];
  const total = segs.length * 30;
  segs.forEach((s, si) => {
    for (let i = si ? 1 : 0; i <= 30; i++) {
      const [x, y] = bez(s, i / 30);
      const t = (si * 30 + i) / total;
      pts.push({ x, y, w: 74 * (1 - t) ** 0.9 + 7 });
    }
  });
  return pts;
}

/** The big tentacle that rises from behind a pizza and curls over it (origin at its base). */
function bigTentacle(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(360, 800);
  const pts = tentacleSpine();
  const norm = pts.map((_p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { nx: -(b.y - a.y) / l, ny: (b.x - a.x) / l };
  });
  const outline = () => {
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = p.x + norm[i].nx * p.w;
      const y = p.y + norm[i].ny * p.w;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    const tip = pts[pts.length - 1];
    ctx.arc(tip.x, tip.y, tip.w, Math.atan2(norm[pts.length - 1].ny, norm[pts.length - 1].nx), Math.atan2(-norm[pts.length - 1].ny, -norm[pts.length - 1].nx));
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x - norm[i].nx * pts[i].w, pts[i].y - norm[i].ny * pts[i].w);
    ctx.closePath();
  };
  outline();
  ctx.fillStyle = lin(ctx, 40, 0, 330, 0, [[0, '#4a1f78'], [0.45, '#8a4ccc'], [1, '#c79cf0']]);
  ctx.fill();
  ctx.save();
  outline();
  ctx.clip();
  // a paler belly down one side, where the suckers are
  ctx.beginPath();
  pts.forEach((p, i) => {
    const x = p.x - norm[i].nx * p.w * 0.15;
    const y = p.y - norm[i].ny * p.w * 0.15;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
  for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x - norm[i].nx * pts[i].w * 1.2, pts[i].y - norm[i].ny * pts[i].w * 1.2);
  ctx.closePath();
  ctx.fillStyle = rgba('#f0c8f4', 0.45);
  ctx.fill();
  // speckles
  const r = rng(12);
  for (let i = 0; i < 40; i++) {
    const p = pts[Math.floor(r() * pts.length * 0.8)];
    ellipse(ctx, p.x + (r() - 0.5) * p.w, p.y + (r() - 0.5) * 20, 3 + r() * 4, 2 + r() * 3);
    ctx.fillStyle = rgba('#3a1260', 0.35);
    ctx.fill();
  }
  ctx.restore();
  outline();
  stroke(ctx, 8);
  // suckers down the belly side, shrinking towards the tip
  for (let i = 4; i < pts.length - 6; i += 5) {
    const p = pts[i];
    const n = norm[i];
    const x = p.x - n.nx * p.w * 0.62;
    const y = p.y - n.ny * p.w * 0.62;
    const s = p.w * 0.36;
    const rot = Math.atan2(n.ny, n.nx);
    ellipse(ctx, x, y, s, s * 0.78, rot);
    ctx.fillStyle = '#ffd8f2';
    ctx.fill();
    stroke(ctx, Math.max(2.5, s * 0.22));
    ellipse(ctx, x, y, s * 0.45, s * 0.34, rot);
    ctx.fillStyle = '#c45a9a';
    ctx.fill();
  }
  // sheen down the outer edge
  ctx.beginPath();
  pts.slice(0, Math.floor(pts.length * 0.75)).forEach((p, i) => {
    const x = p.x + norm[i].nx * p.w * 0.6;
    const y = p.y + norm[i].ny * p.w * 0.6;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
  ctx.strokeStyle = rgba('#ffffff', 0.35);
  ctx.lineWidth = 9;
  ctx.stroke();
  return c;
}

/** The coil of tentacle wrapped round the front of a grabbed pizza: a band along the lower half of an
 * ellipse centred at (230, 40) with rx 200, ry 110, thick on the right (where it comes up from behind)
 * and tapering to a curled tip on the left. */
function tentacleWrap(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(470, 200);
  const cx = 230;
  const cy = 40;
  const n = 60;
  const pts: { x: number; y: number; w: number; nx: number; ny: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = 0.05 + t * (Math.PI - 0.25);
    const x = cx + Math.cos(a) * 200;
    const y = cy + Math.sin(a) * 110;
    // outward normal of the ellipse
    const nx = Math.cos(a) / 200;
    const ny = Math.sin(a) / 110;
    const l = Math.hypot(nx, ny);
    pts.push({ x, y, w: 26 * (1 - t) + 8, nx: nx / l, ny: ny / l });
  }
  const band = () => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x + p.nx * p.w, p.y + p.ny * p.w) : ctx.moveTo(p.x + p.nx * p.w, p.y + p.ny * p.w)));
    const tip = pts[n];
    ctx.arc(tip.x, tip.y, tip.w, Math.atan2(tip.ny, tip.nx), Math.atan2(-tip.ny, -tip.nx));
    for (let i = n; i >= 0; i--) ctx.lineTo(pts[i].x - pts[i].nx * pts[i].w, pts[i].y - pts[i].ny * pts[i].w);
    ctx.closePath();
  };
  band();
  ctx.fillStyle = lin(ctx, 0, 40, 0, 180, [[0, '#c79cf0'], [0.5, '#8a4ccc'], [1, '#4a1f78']]);
  ctx.fill();
  stroke(ctx, 7);
  // suckers facing us along the band
  for (let i = 3; i < n - 4; i += 6) {
    const p = pts[i];
    const s = p.w * 0.42;
    ellipse(ctx, p.x - p.nx * p.w * 0.15, p.y - p.ny * p.w * 0.15, s, s * 0.8);
    ctx.fillStyle = '#ffd8f2';
    ctx.fill();
    stroke(ctx, 3);
    ellipse(ctx, p.x - p.nx * p.w * 0.15, p.y - p.ny * p.w * 0.15, s * 0.45, s * 0.36);
    ctx.fillStyle = '#c45a9a';
    ctx.fill();
  }
  // sheen along the top edge
  ctx.beginPath();
  pts.slice(0, n - 8).forEach((p, i) => (i ? ctx.lineTo(p.x - p.nx * p.w * 0.6, p.y - p.ny * p.w * 0.6) : ctx.moveTo(p.x - p.nx * p.w * 0.6, p.y - p.ny * p.w * 0.6)));
  ctx.strokeStyle = rgba('#ffffff', 0.4);
  ctx.lineWidth = 5;
  ctx.stroke();
  return c;
}

/** A glossy drop of squid ink in flight: point at the top, a lilac rim light so it reads on dark water. */
function inkBlob(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(180, 220);
  const drop = () => {
    ctx.beginPath();
    ctx.moveTo(90, 14);
    ctx.bezierCurveTo(110, 60, 160, 96, 160, 140);
    ctx.bezierCurveTo(160, 184, 128, 206, 90, 206);
    ctx.bezierCurveTo(52, 206, 20, 184, 20, 140);
    ctx.bezierCurveTo(20, 96, 70, 60, 90, 14);
    ctx.closePath();
  };
  drop();
  ctx.fillStyle = rad(ctx, 90, 140, 90, [[0, '#5a3a8a'], [0.7, '#24123e'], [1, '#120a24']]);
  ctx.fill();
  ctx.save();
  drop();
  ctx.clip();
  ellipse(ctx, 120, 190, 70, 36, -0.3);
  ctx.fillStyle = rgba('#b48cff', 0.35);
  ctx.fill();
  ctx.restore();
  drop();
  stroke(ctx, 7);
  ctx.beginPath();
  ctx.moveTo(140, 120);
  ctx.quadraticCurveTo(150, 160, 124, 186);
  ctx.strokeStyle = rgba('#d8c0ff', 0.6);
  ctx.lineWidth = 6;
  ctx.stroke();
  shine(ctx, 66, 120, 18, 26, 0.6, 0.35);
  shine(ctx, 74, 160, 6, 6, 0.5, 0);
  return c;
}

/** A glossy ink splash that sits on a pizza while its perk is frozen: a splat with spikes and drips,
 * kept inside the canvas (360 × 260, centre 180, 130). */
function inkSplat(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(360, 260);
  const r = rng(5);
  const cx = 180;
  const cy = 128;
  const splat = () => {
    ctx.beginPath();
    const n = 22;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      // every third point is a spike flung outwards
      const k = i % 3 === 0 ? 1.32 + r() * 0.12 : 0.92 + r() * 0.1;
      const x = cx + Math.cos(a) * 112 * k;
      const y = cy + Math.sin(a) * 78 * k;
      if (i === 0) ctx.moveTo(x, y);
      else {
        const am = a - Math.PI / n;
        ctx.quadraticCurveTo(cx + Math.cos(am) * 92, cy + Math.sin(am) * 64, x, y);
      }
    }
    ctx.closePath();
  };
  splat();
  ctx.fillStyle = rad(ctx, cx, cy, 150, [[0, '#4e3478'], [0.6, '#24143e'], [1, '#120a24']]);
  ctx.fill();
  stroke(ctx, 6);
  // flung droplets round it
  for (const [x, y, s] of [[26, 52, 11], [334, 70, 9], [320, 214, 12], [42, 206, 8], [180, 18, 7], [250, 244, 6], [96, 242, 7]]) {
    ellipse(ctx, x, y, s, s * 0.85);
    ctx.fillStyle = '#24143e';
    ctx.fill();
    stroke(ctx, 3.5);
    shine(ctx, x - s * 0.3, y - s * 0.35, s * 0.35, s * 0.22, 0.5);
  }
  // wet gloss
  shine(ctx, 136, 96, 40, 14, 0.4, -0.25);
  shine(ctx, 210, 150, 16, 6, 0.25, -0.25);
  ctx.beginPath();
  ctx.ellipse(cx, cy, 96, 64, 0, Math.PI * 0.1, Math.PI * 0.6);
  ctx.strokeStyle = rgba('#b48cff', 0.35);
  ctx.lineWidth = 6;
  ctx.stroke();
  return c;
}

export const props: Record<string, () => HTMLCanvasElement> = {
  p_doughball: doughBall,
  p_rollpin: () => rollingPin(0),
  p_rollpin1: () => rollingPin(1),
  p_rollpin2: () => rollingPin(2),
  p_rollpin3: () => rollingPin(3),
  p_rollpin4: () => rollingPin(4),
  p_rollpin5: () => rollingPin(5),
  p_bigslipper: bigSlipper,
  p_spoonbowl: spoonBowl,
  p_bigtentacle: bigTentacle,
  p_tentwrap: tentacleWrap,
  p_inkblob: inkBlob,
  p_inkpizza: inkSplat,
};
