// Art kinds for Act 7 · Comics: Henchman Spats, Jetpack Jackboots, Goon Galoshes, the robot sneaker (Ultoe and
// his drones), Lex Lugtoe's power-armour brogue, Doomstomp's bone-spiked boot and Thanfoot in the Infinity Sock.
// These follow the feet-style pilot: each foot is one continuous silhouette, painted inside a clip (no stacked
// outlines), lit from the top left with a rim light on the right and soft occlusion at the sole, and outlined once.
// Design frame as kinds-bosses.ts: centre x = CX (110), the ankle opens at y = -6, the sole sits at contactY.

import type { FootArt } from '../../data/feet';
import { CX, INK, OUT, outlineOf } from '../../art/feetCommon';
import { registerKind } from '../../art/registry';
import { type Ctx, ellipse, mix, rgba, roundRect, shade } from '../../art/util';

// ——— Shared materials ———

function ink(ctx: Ctx, lw = OUT, col = INK): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** The key light: a diagonal ramp from the top left (lit) to the bottom right (shadow). */
function lit(ctx: Ctx, base: string, x0: number, y0: number, x1: number, y1: number, k = 0.26): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, shade(base, k));
  g.addColorStop(0.42, base);
  g.addColorStop(1, shade(base, -k * 1.5));
  return g;
}

/** Inside a clipped silhouette: a cool rim light down the right edge and occlusion along the sole. */
function rimAndShade(ctx: Ctx, x0: number, x1: number, y0: number, y1: number, rim = '#bfe6ff', ao = 0.32): void {
  const r = ctx.createLinearGradient(x1 - 34, 0, x1, 0);
  r.addColorStop(0, rgba(rim, 0));
  r.addColorStop(1, rgba(rim, 0.38));
  ctx.fillStyle = r;
  ctx.fillRect(x1 - 34, y0, 40, y1 - y0);
  const a = ctx.createLinearGradient(0, y1 - 46, 0, y1);
  a.addColorStop(0, 'rgba(0,0,0,0)');
  a.addColorStop(1, `rgba(0,0,0,${ao})`);
  ctx.fillStyle = a;
  ctx.fillRect(x0 - 10, y1 - 46, x1 - x0 + 20, 50);
}

/** A soft specular streak (gloss) on the lit side. */
function sheen(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.4, rot = -0.35): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  g.addColorStop(0, rgba('#ffffff', a));
  g.addColorStop(1, rgba('#ffffff', 0));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(1, ry / rx);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // leave no path behind: a later stroke would trace this ellipse
  ctx.beginPath();
}

/** Halftone dots inside the current clip, for the pulp-comic print look on shadowed areas. */
function halftone(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, col: string, a: number, step = 9, fromLeft = true): void {
  ctx.fillStyle = rgba(col, a);
  for (let y = y0; y < y1; y += step) {
    for (let x = x0 + ((y / step) % 2 ? step / 2 : 0); x < x1; x += step) {
      // dots grow towards the shadow side (bottom right)
      const t = fromLeft ? (x - x0) / (x1 - x0) * 0.6 + (y - y0) / (y1 - y0) * 0.4 : 0.5;
      const rr = step * 0.08 + step * 0.32 * t;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function rivet(ctx: Ctx, x: number, y: number, rr: number, base: string): void {
  ctx.beginPath();
  ctx.arc(x, y, rr, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(x - rr * 0.4, y - rr * 0.4, 0, x, y, rr);
  g.addColorStop(0, shade(base, 0.5));
  g.addColorStop(1, shade(base, -0.35));
  ctx.fillStyle = g;
  ctx.fill();
  ink(ctx, 2, rgba(INK, 0.7));
}

/** A closed shoe outline (front view, toes down): one path from the ankle round the toe and back. */
function shoeShape(ctx: Ctx, o: { top?: number; ankle?: number; width?: number; toe?: number; flare?: number }): void {
  const top = o.top ?? -6;
  const a = o.ankle ?? 56; // ankle opening half-width from CX
  const w = o.width ?? 100; // widest half-width
  const toe = o.toe ?? 262; // lowest point of the sole
  const fl = o.flare ?? 150; // y where the shoe is widest
  ctx.beginPath();
  ctx.moveTo(CX - a, top);
  ctx.bezierCurveTo(CX - a - 2, top + 70, CX - w + 4, fl - 50, CX - w, fl);
  // a broad, rounded toe box with a flat sole (not a vase)
  ctx.bezierCurveTo(CX - w - 3, fl + 50, CX - w - 2, toe - 34, CX - w + 16, toe - 8);
  ctx.bezierCurveTo(CX - w + 44, toe + 2, CX + w - 44, toe + 2, CX + w - 16, toe - 8);
  ctx.bezierCurveTo(CX + w + 2, toe - 34, CX + w + 3, fl + 50, CX + w, fl);
  ctx.bezierCurveTo(CX + w - 4, fl - 50, CX + a + 2, top + 70, CX + a, top);
  ctx.closePath();
}

// ——— HENCHMAN SPATS: a black oxford under white cloth spats with a side row of buttons ———

function drawSpats(ctx: Ctx, art: FootArt): void {
  const shoe = art.primary!;
  const spat = art.secondary!;
  const band = String(art.extra?.band ?? '#c8323a');
  const path = () => shoeShape(ctx, { ankle: 52, width: 92, flare: 160, toe: 258 });
  path();
  ctx.fillStyle = lit(ctx, shoe, 20, 120, 200, 260);
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  // the black oxford: toe cap seam and broguing on the lower half
  ctx.fillStyle = lit(ctx, shoe, 20, 150, 200, 262, 0.35);
  ctx.fillRect(0, 150, 220, 120);
  sheen(ctx, 62, 222, 34, 14, 0.55, -0.2);
  ctx.beginPath();
  ctx.moveTo(30, 214);
  ctx.quadraticCurveTo(CX, 190, 190, 214);
  ink(ctx, 3, rgba('#000000', 0.6));
  ctx.beginPath();
  ctx.moveTo(32, 218);
  ctx.quadraticCurveTo(CX, 195, 188, 218);
  ink(ctx, 1.5, rgba('#ffffff', 0.25));
  // the spat: cloth gaiter from the ankle to a curved hem over the shoe
  const hem = () => {
    ctx.beginPath();
    ctx.moveTo(-10, -10);
    ctx.lineTo(230, -10);
    ctx.lineTo(230, 166);
    ctx.bezierCurveTo(170, 186, 50, 186, -10, 166);
    ctx.closePath();
  };
  hem();
  ctx.fillStyle = lit(ctx, spat, 20, 0, 200, 190, 0.12);
  ctx.fill();
  ctx.save();
  hem();
  ctx.clip();
  // felt weave and a cool shadow down the far side
  ctx.strokeStyle = rgba('#8a8478', 0.16);
  ctx.lineWidth = 1.5;
  for (let y = 4; y < 190; y += 7) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(220, y + 4);
    ctx.stroke();
  }
  halftone(ctx, 120, 10, 214, 186, '#5a6a8a', 0.22, 10);
  ctx.restore();
  hem();
  ctx.beginPath();
  ctx.moveTo(-10, 166);
  ctx.bezierCurveTo(50, 186, 170, 186, 230, 166);
  ink(ctx, 3.5, rgba(INK, 0.75));
  // the strap under the arch (a black band across the shoe)
  ctx.beginPath();
  ctx.moveTo(6, 176);
  ctx.bezierCurveTo(60, 196, 160, 196, 214, 176);
  ctx.lineTo(214, 188);
  ctx.bezierCurveTo(160, 208, 60, 208, 6, 188);
  ctx.closePath();
  ctx.fillStyle = shade(shoe, -0.2);
  ctx.fill();
  // a red armband stripe round the top: the gang's colours
  ctx.fillStyle = lit(ctx, band, 40, 20, 180, 40, 0.2);
  ctx.fillRect(0, 22, 220, 18);
  ctx.fillStyle = rgba('#000000', 0.25);
  ctx.fillRect(0, 38, 220, 3);
  // buttons down the outer (left) side
  for (let i = 0; i < 5; i++) {
    const y = 58 + i * 24;
    const x = 34 - i * 3.2;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#1c1d22';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
  }
  rimAndShade(ctx, 14, 206, -6, 262, '#d8ecff', 0.4);
  ctx.restore();
  path();
  ink(ctx, OUT, outlineOf(shoe));
}

// ——— JETPACK JACKBOOTS: a tall hobnailed jackboot with twin rocket heels strapped to its sides ———

function thruster(ctx: Ctx, x: number, col: string, flame: string): void {
  // a stubby rocket on a strap, nozzle pointing down and out
  ctx.save();
  ctx.translate(x, 0);
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(-18, 70);
    ctx.quadraticCurveTo(-18, 46, 0, 38);
    ctx.quadraticCurveTo(18, 46, 18, 70);
    ctx.lineTo(18, 168);
    ctx.lineTo(-18, 168);
    ctx.closePath();
  };
  body();
  ctx.fillStyle = lit(ctx, '#c9ced6', -18, 40, 18, 168, 0.3);
  ctx.fill();
  ctx.save();
  body();
  ctx.clip();
  ctx.fillStyle = rgba(col, 0.95);
  ctx.fillRect(-20, 92, 40, 16);
  sheen(ctx, -8, 80, 6, 30, 0.6, 0);
  ctx.restore();
  body();
  ink(ctx, 4.5);
  // nozzle bell with a hot glow inside
  ctx.beginPath();
  ctx.moveTo(-14, 166);
  ctx.lineTo(-22, 196);
  ctx.lineTo(22, 196);
  ctx.lineTo(14, 166);
  ctx.closePath();
  ctx.fillStyle = lit(ctx, '#5a5e68', -22, 166, 22, 196, 0.3);
  ctx.fill();
  ink(ctx, 4);
  ellipse(ctx, 0, 196, 20, 6);
  ctx.fillStyle = flame;
  ctx.fill();
  ink(ctx, 3);
  ctx.restore();
}

function drawJetboot(ctx: Ctx, art: FootArt): void {
  const boot = art.primary!;
  const jet = art.secondary!;
  // the rockets sit behind the boot's sides
  thruster(ctx, -2, jet, '#ffd23f');
  thruster(ctx, 222, jet, '#ffd23f');
  const path = () => shoeShape(ctx, { ankle: 60, width: 96, flare: 150, toe: 262 });
  path();
  ctx.fillStyle = lit(ctx, boot, 18, 0, 210, 262, 0.3);
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  // polished shaft creases
  for (const y of [40, 74, 104]) {
    ctx.beginPath();
    ctx.moveTo(20, y + 6);
    ctx.quadraticCurveTo(CX, y - 10, 200, y + 6);
    ink(ctx, 3, rgba('#000000', 0.35));
    ctx.beginPath();
    ctx.moveTo(24, y + 10);
    ctx.quadraticCurveTo(CX, y - 4, 196, y + 10);
    ink(ctx, 2, rgba('#ffffff', 0.12));
  }
  sheen(ctx, 58, 70, 22, 60, 0.32, 0.05);
  // two buckled straps holding the rockets on
  for (const y of [86, 132]) {
    ctx.fillStyle = lit(ctx, '#6a4a2a', 0, y, 220, y + 18, 0.2);
    ctx.fillRect(0, y, 220, 18);
    ctx.fillStyle = rgba('#000000', 0.3);
    ctx.fillRect(0, y + 16, 220, 3);
    roundRect(ctx, CX - 16, y - 3, 32, 24, 4);
    ctx.fillStyle = lit(ctx, '#d8dde4', CX - 16, y, CX + 16, y + 24, 0.3);
    ctx.fill();
    ink(ctx, 3);
    ctx.fillStyle = '#2a2d33';
    ctx.fillRect(CX - 2, y + 2, 4, 14);
  }
  // toe cap with a shine
  ctx.beginPath();
  ctx.moveTo(14, 206);
  ctx.quadraticCurveTo(CX, 176, 206, 206);
  ink(ctx, 3, rgba('#000000', 0.45));
  sheen(ctx, 70, 226, 30, 12, 0.5, -0.15);
  // hobnailed sole: a dark welt with studs
  ctx.fillStyle = '#1a1b16';
  ctx.fillRect(0, 244, 220, 30);
  for (let x = 26; x < 200; x += 18) rivet(ctx, x, 252, 3.2, '#a8adb6');
  rimAndShade(ctx, 14, 206, -6, 262, '#ffd9a8', 0.25);
  ctx.restore();
  path();
  ink(ctx, OUT, outlineOf(boot));
}

// ——— GOON GALOSHES: a shiny rubber overshoe with clasps and a bomb harness at the toe ———

function drawGalosh(ctx: Ctx, art: FootArt): void {
  const rub = art.primary!;
  const clasp = art.secondary!;
  const path = () => shoeShape(ctx, { ankle: 62, width: 104, flare: 168, toe: 266 });
  path();
  ctx.fillStyle = lit(ctx, rub, 10, 20, 210, 266, 0.22);
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  // rolled rubber collar
  ctx.fillStyle = lit(ctx, shade(rub, -0.08), 0, -6, 0, 26, 0.3);
  ctx.fillRect(0, -6, 220, 30);
  ctx.fillStyle = rgba('#000000', 0.25);
  ctx.fillRect(0, 22, 220, 4);
  // the gusset folds on the front
  for (const x of [72, 148]) {
    ctx.beginPath();
    ctx.moveTo(x, 26);
    ctx.quadraticCurveTo(x + (x < CX ? -8 : 8), 90, x + (x < CX ? -4 : 4), 150);
    ink(ctx, 3, rgba(shade(rub, -0.5), 0.6));
  }
  // three snap clasps up the front
  for (let i = 0; i < 3; i++) {
    const y = 52 + i * 38;
    roundRect(ctx, 66, y, 88, 16, 8);
    ctx.fillStyle = lit(ctx, clasp, 66, y, 154, y + 16, 0.4);
    ctx.fill();
    ink(ctx, 3);
    rivet(ctx, 74, y + 8, 4.5, '#c8ccd4');
    rivet(ctx, 146, y + 8, 4.5, '#c8ccd4');
  }
  // big glossy rubber highlights (the material's signature)
  sheen(ctx, 44, 120, 14, 60, 0.6, 0.1);
  sheen(ctx, 72, 214, 40, 16, 0.55, -0.15);
  // treaded sole edge
  ctx.fillStyle = '#3a3226';
  ctx.fillRect(0, 248, 220, 30);
  ctx.strokeStyle = rgba('#000000', 0.5);
  ctx.lineWidth = 3;
  for (let x = 8; x < 220; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, 250);
    ctx.lineTo(x - 4, 268);
    ctx.stroke();
  }
  // the bomb clamp on the toe: a steel bracket with a hook (the bomb itself hangs from it in play)
  roundRect(ctx, CX - 30, 196, 60, 22, 6);
  ctx.fillStyle = lit(ctx, '#aeb4bd', CX - 30, 196, CX + 30, 218, 0.35);
  ctx.fill();
  ink(ctx, 3.5);
  rivet(ctx, CX - 20, 207, 3.5, '#d8dde4');
  rivet(ctx, CX + 20, 207, 3.5, '#d8dde4');
  ctx.beginPath();
  ctx.moveTo(CX, 218);
  ctx.lineTo(CX, 232);
  ctx.arc(CX + 7, 232, 7, Math.PI, Math.PI * 0.2, true);
  ink(ctx, 7, INK);
  ink(ctx, 3.5, '#c8ccd4');
  rimAndShade(ctx, 6, 214, -6, 266, '#fff3c0', 0.3);
  ctx.restore();
  path();
  ink(ctx, OUT, outlineOf(rub));
}

// ——— ROBOT SNEAKER: Ultoe (red glowing core) and his drones (grey, dark core) ———

function drawRoboSneaker(ctx: Ctx, art: FootArt): void {
  const shell = art.primary!;
  const acc = art.secondary!;
  const core = String(art.extra?.core ?? '#ff3a3a');
  const drone = !!art.extra?.drone;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(CX - 52, -6);
    ctx.bezierCurveTo(CX - 56, 50, CX - 98, 96, CX - 100, 150);
    ctx.bezierCurveTo(CX - 102, 206, CX - 92, 244, CX - 60, 258);
    ctx.bezierCurveTo(CX - 20, 268, CX + 20, 268, CX + 60, 258);
    ctx.bezierCurveTo(CX + 92, 244, CX + 102, 206, CX + 100, 150);
    ctx.bezierCurveTo(CX + 98, 96, CX + 56, 50, CX + 52, -6);
    ctx.closePath();
  };
  path();
  ctx.fillStyle = lit(ctx, shell, 10, 0, 210, 266, 0.3);
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  // brushed-metal banding (metal material: sharp light bands)
  for (let x = 14; x < 210; x += 6) {
    ctx.fillStyle = rgba('#ffffff', 0.04 + 0.04 * Math.sin(x * 0.21));
    ctx.fillRect(x, -6, 3, 272);
  }
  const band = ctx.createLinearGradient(0, 0, 220, 0);
  band.addColorStop(0.18, rgba('#ffffff', 0));
  band.addColorStop(0.26, rgba('#ffffff', 0.45));
  band.addColorStop(0.32, rgba('#ffffff', 0));
  ctx.fillStyle = band;
  ctx.fillRect(0, -6, 220, 272);
  // panel seams
  ctx.beginPath();
  ctx.moveTo(14, 120);
  ctx.bezierCurveTo(70, 104, 150, 104, 206, 120);
  ctx.moveTo(18, 196);
  ctx.bezierCurveTo(70, 212, 150, 212, 202, 196);
  ctx.moveTo(CX, 10);
  ctx.lineTo(CX, 70);
  ink(ctx, 2.5, rgba(INK, 0.55));
  // an angular accent stripe down each side (original, not a brand mark)
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + s * 92, 132);
    ctx.lineTo(CX + s * 60, 160);
    ctx.lineTo(CX + s * 78, 166);
    ctx.lineTo(CX + s * 40, 204);
    ctx.lineTo(CX + s * 98, 176);
    ctx.lineTo(CX + s * 80, 170);
    ctx.closePath();
    ctx.fillStyle = drone ? rgba(acc, 0.7) : acc;
    ctx.fill();
    ink(ctx, 2.5, rgba(INK, 0.6));
  }
  // the core housing on the tongue
  ellipse(ctx, CX, 82, 30, 30);
  ctx.fillStyle = '#2a2d33';
  ctx.fill();
  ink(ctx, 4);
  const cg = ctx.createRadialGradient(CX - 6, 76, 2, CX, 82, 24);
  if (drone) {
    cg.addColorStop(0, '#9aa3b0');
    cg.addColorStop(1, '#3a3f48');
  } else {
    cg.addColorStop(0, '#ffffff');
    cg.addColorStop(0.35, core);
    cg.addColorStop(1, shade(core, -0.5));
  }
  ellipse(ctx, CX, 82, 22, 22);
  ctx.fillStyle = cg;
  ctx.fill();
  ink(ctx, 2.5);
  if (!drone) {
    // a hot glow round the core lens
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(CX, 82, 10, CX, 82, 58);
    halo.addColorStop(0, rgba(core, 0.55));
    halo.addColorStop(1, rgba(core, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(CX - 60, 24, 120, 120);
    ctx.globalCompositeOperation = 'source-over';
  }
  // LED strip along the sole
  ctx.fillStyle = '#23262c';
  ctx.fillRect(0, 236, 220, 40);
  for (let x = 24; x < 200; x += 22) {
    roundRect(ctx, x, 244, 14, 8, 4);
    ctx.fillStyle = drone ? '#6a7380' : core;
    ctx.fill();
  }
  rimAndShade(ctx, 10, 210, -6, 266, '#cfefff', 0.25);
  ctx.restore();
  path();
  ink(ctx, OUT, outlineOf(shell));
}

// ——— LEX LUGTOE: a power-armour brogue with a cockpit dome (the bald billionaire peers out) ———

function drawLexBrogue(ctx: Ctx, art: FootArt): void {
  const plate = art.primary!;
  const trim = art.secondary!;
  const path = () => shoeShape(ctx, { ankle: 60, width: 104, flare: 150, toe: 266 });
  path();
  ctx.fillStyle = lit(ctx, plate, 10, -6, 210, 266, 0.3);
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  // armour plates: horizontal segments with bevels
  for (const y of [34, 70]) {
    ctx.fillStyle = rgba('#000000', 0.28);
    ctx.fillRect(0, y, 220, 4);
    ctx.fillStyle = rgba('#ffffff', 0.18);
    ctx.fillRect(0, y + 4, 220, 2);
  }
  // purple trim down the sides
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + s * 70, -6);
    ctx.bezierCurveTo(CX + s * 76, 80, CX + s * 104, 130, CX + s * 100, 190);
    ctx.lineTo(CX + s * 120, 190);
    ctx.lineTo(CX + s * 120, -6);
    ctx.closePath();
    ctx.fillStyle = lit(ctx, trim, 0, 0, 220, 220, 0.3);
    ctx.fill();
  }
  // the wingtip toe cap with brogue perforations
  const wing = () => {
    ctx.beginPath();
    ctx.moveTo(4, 176);
    ctx.bezierCurveTo(40, 160, 70, 200, CX, 176);
    ctx.bezierCurveTo(150, 200, 180, 160, 216, 176);
    ctx.lineTo(220, 280);
    ctx.lineTo(0, 280);
    ctx.closePath();
  };
  wing();
  ctx.fillStyle = lit(ctx, shade(plate, -0.08), 0, 170, 220, 270, 0.32);
  ctx.fill();
  wing();
  ink(ctx, 3, rgba(INK, 0.7));
  ctx.fillStyle = rgba(INK, 0.55);
  // perforations a little inside the wingtip's double curve (sampled off the same beziers)
  const bz = (p0: number, p1: number, p2: number, p3: number, t: number) => (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3;
  for (const [x0, y0, x1, y1, x2, y2, x3, y3] of [
    [4, 176, 40, 160, 70, 200, CX, 176],
    [CX, 176, 150, 200, 180, 160, 216, 176],
  ]) {
    for (let i = 1; i < 11; i++) {
      const t = i / 11;
      ctx.beginPath();
      ctx.arc(bz(x0, x1, x2, x3, t), bz(y0, y1, y2, y3, t) + 11, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // medallion rosette on the toe
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(CX + Math.cos(a) * 14, 226 + Math.sin(a) * 9, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  sheen(ctx, 60, 214, 30, 12, 0.5, -0.2);
  // the cockpit dome: a glass bubble on the vamp with the bald billionaire inside
  ellipse(ctx, CX, 112, 48, 44);
  ctx.fillStyle = '#1d2a3a';
  ctx.fill();
  ink(ctx, 4.5);
  ctx.save();
  ellipse(ctx, CX, 112, 46, 42);
  ctx.clip();
  // bald head, smug face
  ellipse(ctx, CX, 126, 30, 34);
  ctx.fillStyle = lit(ctx, art.skin, CX - 30, 92, CX + 30, 160, 0.25);
  ctx.fill();
  ink(ctx, 3);
  sheen(ctx, CX - 10, 106, 10, 7, 0.75, -0.4);
  // glasses and a smirk
  for (const s of [-1, 1]) {
    ellipse(ctx, CX + s * 12, 128, 9, 7);
    ctx.fillStyle = 'rgba(200,240,255,0.5)';
    ctx.fill();
    ink(ctx, 2.5);
  }
  ctx.beginPath();
  ctx.moveTo(CX - 3, 128);
  ctx.lineTo(CX + 3, 128);
  ink(ctx, 2.5);
  ctx.beginPath();
  ctx.moveTo(CX - 10, 146);
  ctx.quadraticCurveTo(CX + 4, 152, CX + 14, 142);
  ink(ctx, 2.5);
  // glass reflection
  ctx.beginPath();
  ctx.ellipse(CX - 22, 92, 10, 22, 0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill();
  ctx.restore();
  // rim of the dome with rivets
  ellipse(ctx, CX, 112, 48, 44);
  ink(ctx, 7, shade(trim, -0.3));
  ink(ctx, 3, shade(trim, 0.2));
  for (let k = 0; k < 6; k++) {
    const a = Math.PI * 0.15 + (k / 5) * Math.PI * 0.7;
    rivet(ctx, CX + Math.cos(a) * 48, 112 + Math.sin(a) * 44, 3.5, '#d4c27a');
  }
  // power-armour sole with glowing vents
  ctx.fillStyle = '#1e2420';
  ctx.fillRect(0, 248, 220, 30);
  for (let x = 30; x < 200; x += 34) {
    roundRect(ctx, x, 254, 20, 8, 4);
    ctx.fillStyle = '#7dff9a';
    ctx.fill();
  }
  halftone(ctx, 120, 0, 214, 170, '#0a2a14', 0.25, 10);
  rimAndShade(ctx, 6, 214, -6, 266, '#e0ffe8', 0.3);
  ctx.restore();
  path();
  ink(ctx, OUT, outlineOf(plate));
}

// ——— DOOMSTOMP: a hulking scaly boot with bone spikes, claws and a stitched scar ———

function drawDoomBoot(ctx: Ctx, art: FootArt, r: () => number): void {
  const hide = art.primary!;
  const bone = art.secondary!;
  // spikes are part of the silhouette: one outline round boot and spikes together
  const spikes: [number, number, number, number][] = [
    // base x, base y, tip dx, tip dy (left side, then right side, then the toe)
    [CX - 72, 40, -40, -18],
    [CX - 92, 104, -46, -6],
    [CX - 102, 170, -44, 8],
    [CX + 72, 40, 40, -18],
    [CX + 92, 104, 46, -6],
    [CX + 102, 170, 44, 8],
  ];
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(CX - 62, -6);
    ctx.bezierCurveTo(CX - 66, 20, CX - 70, 30, CX - 72, 34);
    ctx.lineTo(CX - 72 - 40, 40 - 18);
    ctx.lineTo(CX - 76, 50);
    ctx.bezierCurveTo(CX - 84, 70, CX - 90, 90, CX - 92, 98);
    ctx.lineTo(CX - 92 - 46, 104 - 6);
    ctx.lineTo(CX - 96, 116);
    ctx.bezierCurveTo(CX - 100, 140, CX - 102, 156, CX - 102, 164);
    ctx.lineTo(CX - 102 - 44, 170 + 8);
    ctx.lineTo(CX - 104, 184);
    ctx.bezierCurveTo(CX - 104, 230, CX - 90, 260, CX - 54, 268);
    ctx.bezierCurveTo(CX - 20, 276, CX + 20, 276, CX + 54, 268);
    ctx.bezierCurveTo(CX + 90, 260, CX + 104, 230, CX + 104, 184);
    ctx.lineTo(CX + 102 + 44, 170 + 8);
    ctx.lineTo(CX + 102, 164);
    ctx.bezierCurveTo(CX + 102, 156, CX + 100, 140, CX + 96, 116);
    ctx.lineTo(CX + 92 + 46, 104 - 6);
    ctx.lineTo(CX + 92, 98);
    ctx.bezierCurveTo(CX + 90, 90, CX + 84, 70, CX + 76, 50);
    ctx.lineTo(CX + 72 + 40, 40 - 18);
    ctx.lineTo(CX + 72, 34);
    ctx.bezierCurveTo(CX + 70, 30, CX + 66, 20, CX + 62, -6);
    ctx.closePath();
  };
  path();
  ctx.fillStyle = lit(ctx, hide, -30, -6, 250, 276, 0.28);
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  // bone spikes: paint each spike region bone-coloured with a lit edge
  for (const [bx, by, dx, dy] of spikes) {
    ctx.beginPath();
    const s = Math.sign(dx);
    ctx.moveTo(bx + s * 6, by - 12);
    ctx.lineTo(bx + dx, by + dy);
    ctx.lineTo(bx + s * 6, by + 14);
    ctx.closePath();
    const g = ctx.createLinearGradient(bx, by - 12, bx + dx, by + dy);
    g.addColorStop(0, shade(bone, -0.25));
    g.addColorStop(0.6, bone);
    g.addColorStop(1, shade(bone, 0.15));
    ctx.fillStyle = g;
    ctx.fill();
    // growth rings near the base
    ctx.beginPath();
    ctx.moveTo(bx + s * 14, by - 10);
    ctx.lineTo(bx + s * 14, by + 12);
    ink(ctx, 2, rgba(INK, 0.4));
  }
  // scales on the hide
  for (let i = 0; i < 90; i++) {
    const x = 20 + r() * 180;
    const y = 10 + r() * 230;
    ctx.beginPath();
    ctx.arc(x, y, 7 + r() * 5, Math.PI * 0.1, Math.PI * 0.9);
    ink(ctx, 2, rgba(shade(hide, -0.5), 0.45));
  }
  halftone(ctx, 110, 0, 214, 250, '#0e140a', 0.25, 11);
  // a stitched scar across the vamp
  ctx.beginPath();
  ctx.moveTo(34, 120);
  ctx.bezierCurveTo(80, 104, 130, 150, 186, 128);
  ink(ctx, 5, shade(hide, -0.45));
  for (let i = 0; i < 7; i++) {
    const x = 44 + i * 22;
    const y = 116 + Math.sin(i * 0.9) * 10 + i * 2;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 10);
    ctx.lineTo(x + 4, y + 10);
    ink(ctx, 3, '#d8cfb0');
  }
  // two angry glowing eyes on the shaft
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CX + s * 12, 58);
    ctx.lineTo(CX + s * 40, 52);
    ctx.lineTo(CX + s * 34, 68);
    ctx.closePath();
    ctx.fillStyle = '#ffdf3a';
    ctx.fill();
    ink(ctx, 3);
    ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(CX + s * 28, 60, 0, CX + s * 28, 60, 26);
    gl.addColorStop(0, 'rgba(255,90,40,0.6)');
    gl.addColorStop(1, 'rgba(255,90,40,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(CX + s * 28 - 26, 34, 52, 52);
    ctx.globalCompositeOperation = 'source-over';
  }
  // heavy cleated sole and clawed toes bursting out the front
  ctx.fillStyle = '#2a2420';
  ctx.fillRect(0, 238, 220, 50);
  for (let i = 0; i < 5; i++) {
    const x = 34 + i * 38;
    ctx.beginPath();
    ctx.moveTo(x - 12, 240);
    ctx.quadraticCurveTo(x, 290, x + 12, 240);
    ctx.closePath();
    const cg = ctx.createLinearGradient(x, 240, x, 280);
    cg.addColorStop(0, bone);
    cg.addColorStop(1, shade(bone, -0.4));
    ctx.fillStyle = cg;
    ctx.fill();
    ink(ctx, 3);
  }
  sheen(ctx, 52, 80, 20, 40, 0.25, 0.2);
  rimAndShade(ctx, -40, 250, -6, 276, '#ffb08a', 0.35);
  ctx.restore();
  path();
  ink(ctx, OUT + 0.5, outlineOf(hide));
}

// ——— THANFOOT: a purple titan's foot in the golden Infinity Sock with six empty sockets ———

/** The six sockets in design space, left to right (power, space, reality, soul, time, mind). Stones sit here in play. */
export const SOCKETS: [number, number][] = [
  [42, 120],
  [66, 96],
  [96, 84],
  [126, 84],
  [156, 96],
  [180, 120],
];

function drawThanfoot(ctx: Ctx, art: FootArt): void {
  const skin = art.skin;
  const gold = art.primary!;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(CX - 60, -6);
    ctx.bezierCurveTo(CX - 64, 50, CX - 104, 92, CX - 106, 150);
    ctx.bezierCurveTo(CX - 108, 200, CX - 100, 232, CX - 86, 250);
    // five big toes along the bottom, part of the same outline
    const toes = [
      [CX - 72, 262, 18],
      [CX - 38, 272, 20],
      [CX + 2, 276, 22],
      [CX + 44, 274, 23],
      [CX + 82, 262, 21],
    ];
    for (const [tx, ty, tr] of toes) ctx.arc(tx, ty - tr * 0.6, tr, Math.PI * 0.95, Math.PI * 0.05, true);
    ctx.bezierCurveTo(CX + 100, 232, CX + 108, 200, CX + 106, 150);
    ctx.bezierCurveTo(CX + 104, 92, CX + 64, 50, CX + 60, -6);
    ctx.closePath();
  };
  path();
  ctx.fillStyle = lit(ctx, skin, 0, 0, 220, 280, 0.25);
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  // the sock: gold knit from the ankle down to a ribbed hem above the toes
  const sock = () => {
    ctx.beginPath();
    ctx.moveTo(-20, -10);
    ctx.lineTo(240, -10);
    ctx.lineTo(240, 190);
    ctx.bezierCurveTo(170, 214, 50, 214, -20, 190);
    ctx.closePath();
  };
  sock();
  ctx.fillStyle = lit(ctx, gold, 0, 0, 220, 210, 0.32);
  ctx.fill();
  ctx.save();
  sock();
  ctx.clip();
  // knit: little V stitches in columns
  ctx.strokeStyle = rgba(shade(gold, -0.45), 0.4);
  ctx.lineWidth = 2;
  for (let x = 4; x < 220; x += 12) {
    for (let y = 4; y < 210; y += 10) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 6, y + 6);
      ctx.lineTo(x + 12, y);
      ctx.stroke();
    }
  }
  // a gold armour plate band carrying the sockets
  ctx.beginPath();
  ctx.moveTo(10, 138);
  ctx.bezierCurveTo(40, 70, 180, 70, 210, 138);
  ctx.lineTo(196, 150);
  ctx.bezierCurveTo(170, 96, 50, 96, 24, 150);
  ctx.closePath();
  ctx.fillStyle = lit(ctx, shade(gold, 0.1), 10, 70, 210, 150, 0.35);
  ctx.fill();
  ink(ctx, 3, rgba(INK, 0.7));
  sheen(ctx, 60, 40, 24, 50, 0.35, 0.1);
  halftone(ctx, 120, 0, 214, 200, '#5a3a08', 0.22, 10);
  ctx.restore();
  sock();
  ctx.beginPath();
  ctx.moveTo(-20, 190);
  ctx.bezierCurveTo(50, 214, 170, 214, 240, 190);
  ink(ctx, 8, shade(gold, -0.25));
  ink(ctx, 3, shade(gold, 0.25));
  // the sockets: dark empty settings with gold claws
  for (const [x, y] of SOCKETS) {
    ellipse(ctx, x, y, 15, 15);
    ctx.fillStyle = '#2a1830';
    ctx.fill();
    ink(ctx, 4, shade(gold, -0.5));
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * 13, y + Math.sin(a) * 13);
      ctx.lineTo(x + Math.cos(a) * 19, y + Math.sin(a) * 19);
      ink(ctx, 4, shade(gold, 0.15));
    }
  }
  // the bare purple toes: chin-like ridges on the big toe and nails
  const toes = [
    [CX - 72, 262, 18],
    [CX - 38, 272, 20],
    [CX + 2, 276, 22],
    [CX + 44, 274, 23],
    [CX + 82, 262, 21],
  ];
  for (const [tx, ty, tr] of toes) {
    ctx.beginPath();
    ctx.moveTo(tx - tr * 0.9, 222);
    ctx.lineTo(tx - tr * 0.9, ty - tr * 0.6);
    ink(ctx, 2.5, rgba(INK, 0.45));
    ellipse(ctx, tx, ty - tr * 0.5, tr * 0.5, tr * 0.38);
    ctx.fillStyle = mix(skin, '#ffffff', 0.35);
    ctx.fill();
    ink(ctx, 2, rgba(INK, 0.5));
  }
  // the creased ridges Thanfoot is known for, across the ankle above the sock
  rimAndShade(ctx, 0, 216, -6, 280, '#ffd0ff', 0.3);
  ctx.restore();
  path();
  ink(ctx, OUT + 0.5, outlineOf(skin));
}

registerKind('a7_spats', { draw: drawSpats, contactY: 260, halfWidth: 94 });
registerKind('a7_jetboot', { draw: drawJetboot, contactY: 266, halfWidth: 112 });
registerKind('a7_galosh', { draw: drawGalosh, contactY: 270, halfWidth: 106 });
registerKind('a7_robosneaker', { draw: drawRoboSneaker, contactY: 266, halfWidth: 102 });
registerKind('a7_lexbrogue', { draw: drawLexBrogue, contactY: 270, halfWidth: 106 });
registerKind('a7_doomboot', { draw: drawDoomBoot, contactY: 278, halfWidth: 120 });
registerKind('a7_thanfoot', { draw: drawThanfoot, contactY: 282, halfWidth: 108 });
