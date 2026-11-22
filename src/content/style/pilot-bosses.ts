// Style-kit pilot: a mini-boss and a boss from the rooftop stage, both built round the overheat state.
// - CHIMNEY SWEEP (mini-boss): a soot-caked leather work boot with a chimney brush strapped to it. In play the boot
//   is a chimney: smoke curls out of its collar, soot sifts off it and the brush bobs; overheated, its collar
//   glows like a hearth and throws embers.
// - THE IRON HEEL (boss): a foundry-forged armoured boot: cast iron, chipped red enamel, a furnace grate, steel toe
//   plates and two exhaust stacks. In play the furnace flickers and the stacks chuff steam; overheated, the iron
//   heats up from the sole (its heat layer), the stacks roar and sparks fly.

import type { FootArt } from '../../data/feet';
import { CX } from '../../art/feetCommon';
import { LIGHT, type Pose, ao, crease, glint, inkOf, softFill, softStroke, spec, texture, vnoise } from '../../art/style/kit';
import { Sil, lobe } from '../../art/style/sil';
import { registerStyle } from '../../art/style/registry';
import { blotches, contact, furStrands, rivet, stitches } from '../../art/style/details';
import { tones } from '../../art/style/materials';
import { type Ctx, hashStr, mix, rgba, rng, shade } from '../../art/util';

const [LX, LY] = LIGHT.dir;

// ════════════════════════════ CHIMNEY SWEEP ════════════════════════════

const sweepUpper = (flex: number) => (c: Ctx) => {
  const b = 236 - flex * 6;
  c.beginPath();
  c.moveTo(CX - 64, -6);
  c.bezierCurveTo(CX - 68, 50, CX - 100, 96, CX - 101, 160);
  c.bezierCurveTo(CX - 102, b - 18, CX - 60, b, CX, b);
  c.bezierCurveTo(CX + 60, b, CX + 103, b - 18, CX + 102, 160);
  c.bezierCurveTo(CX + 101, 96, CX + 68, 50, CX + 64, -6);
  c.closePath();
};

const sweepSole = (flex: number) => (c: Ctx) => {
  const b = 262 - flex * 5;
  c.beginPath();
  c.moveTo(CX - 106, 170);
  c.bezierCurveTo(CX - 112, 220, CX - 108, b - 10, CX - 70, b - 2);
  // lugs along the bottom edge
  for (let i = 0; i <= 8; i++) {
    const x = CX - 64 + i * 16;
    c.lineTo(x - 5, b - 2);
    c.lineTo(x - 4, b + 3);
    c.lineTo(x + 4, b + 3);
    c.lineTo(x + 5, b - 2);
  }
  c.lineTo(CX + 70, b - 2);
  c.bezierCurveTo(CX + 108, b - 10, CX + 112, 220, CX + 106, 170);
  c.closePath();
};

/** The chimney brush: a round head of wire bristles, strapped to the boot's left side. */
export const BRUSH = { x: CX - 98, y: 52, r: 40 };

const brushHead = (c: Ctx) => {
  c.beginPath();
  // a ragged star of bristle tips
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = BRUSH.r * (i % 2 ? 0.8 : 1) * (0.92 + vnoise(i * 1.7, 3) * 0.16);
    const x = BRUSH.x + Math.cos(a) * rr;
    const y = BRUSH.y + Math.sin(a) * rr;
    if (i) c.lineTo(x, y);
    else c.moveTo(x, y);
  }
  c.closePath();
};

const brushRod = (c: Ctx) => {
  c.beginPath();
  c.moveTo(BRUSH.x + 4, BRUSH.y - 6);
  c.lineTo(BRUSH.x + 34, -7);
  c.lineTo(BRUSH.x + 46, -7);
  c.lineTo(BRUSH.x + 10, BRUSH.y + 4);
  c.closePath();
};

/** Paint the brush (head and rod) on g: wire bristles radiating from an iron hub, sooty. */
export function paintBrush(g: Ctx, seed = 1): void {
  const r = rng(seed);
  // the rod: a turned wooden handle going up behind the strap
  g.save();
  brushRod(g);
  g.clip();
  const wg = g.createLinearGradient(BRUSH.x, BRUSH.y, BRUSH.x + 20, BRUSH.y + 10);
  wg.addColorStop(0, '#8a6038');
  wg.addColorStop(0.5, '#5a3a20');
  wg.addColorStop(1, '#2a1a10');
  g.fillStyle = wg;
  g.fillRect(BRUSH.x - 10, -10, 80, 70);
  texture(g, 'wood', { x: BRUSH.x - 10, y: -10, w: 80, h: 70 }, 0.4, 1.2);
  g.restore();
  // the bristles: dark wire, lighter tips on the lit side
  g.save();
  brushHead(g);
  g.clip();
  const bg = g.createRadialGradient(BRUSH.x + LX * 10, BRUSH.y + LY * 10, 2, BRUSH.x, BRUSH.y, BRUSH.r);
  bg.addColorStop(0, '#2a2628');
  bg.addColorStop(1, '#0e0c0e');
  g.fillStyle = bg;
  g.fillRect(BRUSH.x - BRUSH.r, BRUSH.y - BRUSH.r, BRUSH.r * 2, BRUSH.r * 2);
  g.lineCap = 'round';
  for (let i = 0; i < 170; i++) {
    const a = r() * Math.PI * 2;
    const r0 = 4 + r() * 6;
    const r1 = BRUSH.r * (0.75 + r() * 0.3);
    const lit = Math.cos(a - Math.atan2(LY, LX));
    g.strokeStyle = rgba(lit > 0.3 ? '#8a8690' : r() < 0.5 ? '#4a4648' : '#1a181a', 0.5 + r() * 0.4);
    g.lineWidth = 0.7 + r() * 0.9;
    g.beginPath();
    g.moveTo(BRUSH.x + Math.cos(a) * r0, BRUSH.y + Math.sin(a) * r0);
    g.lineTo(BRUSH.x + Math.cos(a + (r() - 0.5) * 0.2) * r1, BRUSH.y + Math.sin(a + (r() - 0.5) * 0.2) * r1);
    g.stroke();
  }
  g.restore();
  // the iron hub
  const hg = g.createRadialGradient(BRUSH.x - 2, BRUSH.y - 2, 0.5, BRUSH.x, BRUSH.y, 7);
  hg.addColorStop(0, '#9a9aa2');
  hg.addColorStop(1, '#2a2a30');
  g.fillStyle = hg;
  g.beginPath();
  g.arc(BRUSH.x, BRUSH.y, 6.5, 0, Math.PI * 2);
  g.fill();
  spec(g, BRUSH.x - 2, BRUSH.y - 2.5, 3, 2, 0.7);
}

function drawSweep(ctx: Ctx, art: FootArt, p: Pose, o: { live: boolean; emissive?: boolean; heat?: boolean }): void {
  const soot = art.primary ?? '#3a3638';
  const leather = art.secondary ?? '#8a6a4a';
  const flex = Math.max(0, p.curl);
  const upper = sweepUpper(flex);
  const sole = sweepSole(flex);
  const box = { x: CX - 128, y: -8, w: 244, h: 276 };
  const parts = o.live ? [sole, upper] : [sole, upper, brushRod, brushHead];
  const sil = new Sil(ctx, parts, box);
  const g = sil.g;
  if (o.emissive || o.heat) {
    // the hearth glow: the collar's rim and the welt seam, lit from inside
    const eg = g.createRadialGradient(CX, -10, 10, CX, -6, 80);
    eg.addColorStop(0, rgba('#ffd27a', 0.95));
    eg.addColorStop(0.35, rgba('#ff7a1a', 0.75));
    eg.addColorStop(1, rgba('#ff3a0a', 0));
    g.fillStyle = eg;
    g.fillRect(box.x, -10, box.w, 90);
    softStroke(g, (c) => {
      c.moveTo(CX - 104, 200);
      c.bezierCurveTo(CX - 96, 240, CX - 50, 246, CX, 246);
      c.bezierCurveTo(CX + 50, 246, CX + 96, 240, CX + 104, 200);
    }, rgba('#ff7a1a', 0.8), 4, 2);
    sil.finish('rgba(0,0,0,0)', { w: 0.01, inner: 0 });
    return;
  }
  const lt = tones('leather', leather);
  // the lug sole: black rubber with a chunky welt
  g.save();
  sole(g);
  g.clip();
  const sg = g.createLinearGradient(0, 170, 0, 266);
  sg.addColorStop(0, '#3a3436');
  sg.addColorStop(1, '#100c0e');
  g.fillStyle = sg;
  g.fillRect(box.x, 160, box.w, 110);
  texture(g, 'rubber', box, 0.4);
  spec(g, CX - 60, 236, 34, 6, 0.25, 0.1);
  g.restore();
  // the upper: brown leather under a cake of soot
  g.save();
  upper(g);
  g.clip();
  const ug = g.createLinearGradient(CX - 100, 30, CX + 100, 220);
  ug.addColorStop(0, lt.hi);
  ug.addColorStop(0.5, lt.mid);
  ug.addColorStop(1, lt.lo);
  g.fillStyle = ug;
  g.fillRect(box.x, -10, box.w, 260);
  texture(g, 'leather', box, 0.4, 1.4);
  // soot everywhere but the high points it has rubbed off (the toe cap, the lit side of the vamp)
  g.fillStyle = rgba(soot, 0.88);
  g.fillRect(box.x, box.y, box.w, box.h);
  blotches(g, box, '#121012', 0.6, 22, 0.48, 0.25, 9);
  // where it's rubbed through: the toe cap and the lit shoulder show the leather again, scuffed
  g.save();
  const rubZone = g.createRadialGradient(CX - 24, 204, 8, CX - 14, 206, 74);
  rubZone.addColorStop(0, 'rgba(0,0,0,1)');
  rubZone.addColorStop(1, 'rgba(0,0,0,0)');
  const [rc, rx] = (() => {
    const c = document.createElement('canvas');
    c.width = g.canvas.width;
    c.height = g.canvas.height;
    const x = c.getContext('2d')!;
    x.setTransform(g.getTransform());
    return [c, x] as const;
  })();
  rx.fillStyle = rgba(shade(leather, 0.12), 1);
  rx.fillRect(box.x, box.y, box.w, box.h);
  texture(rx, 'leather', box, 0.45, 1.4);
  blotches(rx, box, '#000000', 1, 9, 0.5, 0.08, 23, 'destination-out');
  rx.globalCompositeOperation = 'destination-in';
  rx.fillStyle = rubZone;
  rx.fillRect(box.x, box.y, box.w, box.h);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(rc, 0, 0);
  g.restore();
  texture(g, 'speckle', box, 0.25, 1, 'soft-light');
  // a sooty handprint on the vamp
  const hp = rng(hashStr('sweep-hand'));
  g.fillStyle = rgba('#0e0c0e', 0.42);
  g.beginPath();
  g.ellipse(CX + 36, 128, 13, 15, 0.3, 0, Math.PI * 2);
  g.fill();
  for (let f = 0; f < 4; f++) {
    g.beginPath();
    g.ellipse(CX + 26 + f * 8 + hp() * 1.5, 104 - Math.sin(f * 0.9) * 4, 3.4, 9, -0.1 + f * 0.08, 0, Math.PI * 2);
    g.fill();
  }
  g.beginPath();
  g.ellipse(CX + 50, 128, 3.6, 8, 0.9, 0, Math.PI * 2);
  g.fill();
  // the toe cap's stitched edge and the flex creases
  stitches(g, (c) => c.ellipse(CX, 236 - flex * 6, 86, 54 - flex * 4, 0, Math.PI + 0.15, -0.15), rgba('#9a8a7a', 0.7), 1.6, 4, 3.5);
  for (const [y, w] of [[168, 50], [184, 62]] as const) {
    crease(g, (c) => {
      c.moveTo(CX - w, y - flex * 6 + 4);
      c.quadraticCurveTo(CX, y - flex * 10 - 6, CX + w, y - flex * 6 + 4);
    }, 2.6 + flex * 1.5, '#080608', 0.3 + flex * 0.35, 0.12 + flex * 0.12);
  }
  // a stitched leather patch on the right side (the old sweep's)
  const patch = (c: Ctx) => {
    c.beginPath();
    c.moveTo(CX + 58, 70);
    c.lineTo(CX + 92, 78);
    c.lineTo(CX + 90, 112);
    c.lineTo(CX + 56, 106);
    c.closePath();
  };
  contact(g, (c) => {
    patch(c);
    c.fill();
  }, 0.5);
  g.fillStyle = shade(leather, 0.1);
  patch(g);
  g.fill();
  g.save();
  patch(g);
  g.clip();
  texture(g, 'leather', box, 0.45, 1.4);
  blotches(g, { x: CX + 50, y: 66, w: 50, h: 52 }, soot, 0.6, 10, 0.45, 0.2, 13);
  g.restore();
  stitches(g, (c) => {
    c.moveTo(CX + 60, 73);
    c.lineTo(CX + 89, 80);
    c.lineTo(CX + 87, 109);
    c.lineTo(CX + 58, 103);
    c.closePath();
  }, rgba('#d8c8a8', 0.85), 1.4, 3, 3);
  // the lacing: waxed black cord through brass speed hooks
  const hooks = [24, 48, 72, 96, 120];
  for (let i = hooks.length - 1; i > 0; i--) {
    for (const s of [-1, 1]) {
      const y0 = hooks[i];
      const y1 = hooks[i - 1];
      softStroke(g, (c) => {
        c.moveTo(CX - s * 26, y0 + 2);
        c.lineTo(CX + s * 26, y1 + 2);
      }, rgba('#000000', 0.5), 5, 1.5);
      g.strokeStyle = '#1a1618';
      g.lineWidth = 3.6;
      g.beginPath();
      g.moveTo(CX - s * 26, y0);
      g.lineTo(CX + s * 26, y1);
      g.stroke();
      g.strokeStyle = rgba('#8a8288', 0.6);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(CX - s * 26 - 0.8, y0 - 1);
      g.lineTo(CX + s * 26 - 0.8, y1 - 1);
      g.stroke();
    }
  }
  for (const y of hooks) for (const s of [-1, 1]) {
    contact(g, (c) => {
      c.beginPath();
      c.arc(CX + s * 27, y, 4.5, 0, Math.PI * 2);
      c.fill();
    }, 0.5);
    const bg2 = g.createLinearGradient(CX + s * 27 - 4, y - 4, CX + s * 27 + 4, y + 4);
    bg2.addColorStop(0, '#fff0b0');
    bg2.addColorStop(0.5, '#c89a3a');
    bg2.addColorStop(1, '#5a3a10');
    g.fillStyle = bg2;
    g.beginPath();
    g.arc(CX + s * 27, y, 4.2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1a1410';
    g.beginPath();
    g.arc(CX + s * 27, y + 0.6, 1.8, 0, Math.PI * 2);
    g.fill();
  }
  // the padded collar, rolled and sooty
  const collar = g.createLinearGradient(0, -6, 0, 18);
  collar.addColorStop(0, rgba('#000000', 0.55));
  collar.addColorStop(0.5, rgba(shade(leather, -0.2), 0.3));
  collar.addColorStop(1, rgba('#000000', 0));
  g.fillStyle = collar;
  g.fillRect(box.x, -8, box.w, 26);
  spec(g, CX - 30, 6, 24, 4, 0.25, 0);
  g.restore();
  // the welt: chunky stitches where the upper meets the sole
  stitches(g, (c) => {
    c.moveTo(CX - 101, 170);
    c.bezierCurveTo(CX - 102, 220, CX - 60, 238, CX, 238);
    c.bezierCurveTo(CX + 60, 238, CX + 102, 220, CX + 101, 170);
  }, rgba('#c8b898', 0.75), 2.2, 4, 3.5);
  lobe(g, upper, { x: box.x, y: -20, w: box.w, h: 300 }, -30, 0, '#000000', 0.55, 18, 0.18);
  // the strap round the ankle with a brass buckle, holding the brush
  const strap = (c: Ctx) => {
    c.beginPath();
    c.moveTo(CX - 66, 14);
    c.quadraticCurveTo(CX, 26, CX + 66, 14);
    c.lineTo(CX + 67, 28);
    c.quadraticCurveTo(CX, 40, CX - 68, 28);
    c.closePath();
  };
  contact(g, (c) => {
    strap(c);
    c.fill();
  }, 0.55, 2.5, 3);
  g.fillStyle = shade(leather, -0.25);
  strap(g);
  g.fill();
  g.save();
  strap(g);
  g.clip();
  texture(g, 'leather', box, 0.5, 1.4);
  blotches(g, { x: CX - 70, y: 10, w: 140, h: 34 }, soot, 0.5, 12, 0.45, 0.2, 17);
  spec(g, CX - 30, 20, 30, 4, 0.3, 0);
  g.restore();
  const bx = CX - 40;
  contact(g, (c) => {
    c.beginPath();
    c.roundRect(bx - 9, 15, 18, 18, 3);
    c.lineWidth = 4;
    c.stroke();
  }, 0.5);
  g.strokeStyle = '#c89a3a';
  g.lineWidth = 3.4;
  g.beginPath();
  g.roundRect(bx - 9, 15, 18, 18, 3);
  g.stroke();
  g.strokeStyle = rgba('#fff0b0', 0.8);
  g.lineWidth = 1.1;
  g.beginPath();
  g.moveTo(bx - 8, 17);
  g.lineTo(bx + 6, 16);
  g.stroke();
  if (!o.live) paintBrush(g, hashStr('sweep-brush'));
  // one light over the whole boot, and the ink
  sil.edge(rgba('#000000', 0.45), 20, LX * 11, LY * 11);
  sil.edge(rgba(LIGHT.rim, 0.55), 2.5, LX * 3, LY * 3);
  sil.finish(inkOf(soot), { openTop: -5 });
}

registerStyle('sweep', {
  contactY: 264,
  rig: { from: 140, to: 162 },
  parts: {
    brush: { box: { x: BRUSH.x - BRUSH.r - 6, y: -8, w: BRUSH.r * 2 + 64, h: BRUSH.y + BRUSH.r + 14 }, frames: 1, pivot: [BRUSH.x + 36, 0], draw: (g) => {
      const s = new Sil(g, [brushRod, brushHead], { x: BRUSH.x - 40, y: -10, w: 120, h: 100 });
      paintBrush(s.g, hashStr('sweep-brush'));
      s.edge(rgba('#000000', 0.4), 8, LX * 5, LY * 5);
      s.finish('#0a080a', { openTop: -6 });
    } },
  },
  draw(ctx, art, p, o) {
    drawSweep(ctx, art, p, o);
  },
});

// ════════════════════════════ THE IRON HEEL ════════════════════════════

const ironUpper = (flex: number) => (c: Ctx) => {
  const b = 232 - flex * 5;
  c.beginPath();
  c.moveTo(CX - 74, 16);
  c.bezierCurveTo(CX - 82, 60, CX - 104, 96, CX - 104, 150);
  c.bezierCurveTo(CX - 105, b - 10, CX - 70, b, CX, b);
  c.bezierCurveTo(CX + 70, b, CX + 105, b - 10, CX + 104, 150);
  c.bezierCurveTo(CX + 104, 96, CX + 82, 60, CX + 74, 16);
  c.closePath();
};

const ironCollar = (c: Ctx) => {
  c.beginPath();
  c.roundRect(CX - 78, -6, 156, 34, 10);
};

/** The exhaust stacks: pipes from the collar's sides angled out, each with a flared mouth. Mouth centres. */
export const STACKS: [number, number][] = [[CX - 100, 4], [CX + 100, 4]];

const stackPath = (s: number) => (c: Ctx) => {
  const [mx, my] = STACKS[s < 0 ? 0 : 1];
  const x0 = CX + s * 58;
  const y0 = 34;
  // the pipe's axis and its normal
  const dx = mx - x0;
  const dy = my - y0;
  const L = Math.hypot(dx, dy);
  const nx = -dy / L;
  const ny = dx / L;
  const pw = 10;
  const fw = 15;
  c.beginPath();
  c.moveTo(x0 + nx * pw, y0 + ny * pw);
  c.lineTo(mx - (dx / L) * 8 + nx * pw, my - (dy / L) * 8 + ny * pw);
  c.lineTo(mx + nx * fw, my + ny * fw);
  c.lineTo(mx - nx * fw, my - ny * fw);
  c.lineTo(mx - (dx / L) * 8 - nx * pw, my - (dy / L) * 8 - ny * pw);
  c.lineTo(x0 - nx * pw, y0 - ny * pw);
  c.closePath();
};

const ironSole = (flex: number) => (c: Ctx) => {
  const b = 262 - flex * 4;
  c.beginPath();
  c.moveTo(CX - 108, 190);
  c.lineTo(CX - 112, b - 18);
  c.quadraticCurveTo(CX - 110, b - 4, CX - 92, b - 4);
  for (let i = 0; i < 7; i++) {
    const x = CX - 84 + i * 28;
    c.lineTo(x, b - 4);
    c.lineTo(x + 2, b + 2);
    c.lineTo(x + 18, b + 2);
    c.lineTo(x + 20, b - 4);
  }
  c.lineTo(CX + 92, b - 4);
  c.quadraticCurveTo(CX + 110, b - 4, CX + 112, b - 18);
  c.lineTo(CX + 108, 190);
  c.closePath();
};

const toePlate = (i: number, flex: number) => (c: Ctx) => {
  const y = 188 + i * 17 - flex * (4 + i * 2);
  const rx = 100 - i * 7;
  c.beginPath();
  c.moveTo(CX - rx, y);
  c.bezierCurveTo(CX - rx + 4, y + 34, CX - 50, y + 44 - i * 2, CX, y + 44 - i * 2);
  c.bezierCurveTo(CX + 50, y + 44 - i * 2, CX + rx - 4, y + 34, CX + rx, y);
  c.bezierCurveTo(CX + rx * 0.6, y + 10, CX - rx * 0.6, y + 10, CX - rx, y);
  c.closePath();
};

const GRATE = { x: CX - 42, y: 82, w: 84, h: 46 };

/** The furnace's coals behind the grate (also the glow layer). k: brightness. */
function coals(g: Ctx, k: number, heat: number): void {
  const { x, y, w, h } = GRATE;
  const cg = g.createRadialGradient(x + w / 2, y + h * 0.7, 4, x + w / 2, y + h * 0.6, w * 0.6);
  cg.addColorStop(0, rgba(mix('#ffe08a', '#ffffff', heat * 0.6), k));
  cg.addColorStop(0.45, rgba('#ff8a1a', k * 0.95));
  cg.addColorStop(1, rgba('#8a1a06', k * 0.9));
  g.fillStyle = cg;
  g.beginPath();
  g.roundRect(x, y, w, h, 12);
  g.fill();
  const r = rng(hashStr('ironheel-coals'));
  for (let i = 0; i < 18; i++) {
    const cx = x + 6 + r() * (w - 12);
    const cy = y + h * 0.4 + r() * h * 0.55;
    const rr = 4 + r() * 6;
    const g2 = g.createRadialGradient(cx - 1, cy - 1, 0.5, cx, cy, rr);
    g2.addColorStop(0, rgba('#fff2b0', 0.7 * k));
    g2.addColorStop(1, rgba('#ff5a10', 0));
    g.fillStyle = g2;
    g.beginPath();
    g.arc(cx, cy, rr, 0, Math.PI * 2);
    g.fill();
  }
}

function drawIronHeel(ctx: Ctx, art: FootArt, p: Pose, o: { live: boolean; emissive?: boolean; heat?: boolean }): void {
  const iron = art.skin;
  const red = art.primary ?? '#b33a3a';
  const amber = art.secondary ?? '#ffb02e';
  const flex = Math.max(0, p.curl);
  const upper = ironUpper(flex);
  const sole = ironSole(flex);
  const plates = [0, 1, 2].map((i) => toePlate(i, flex));
  const box = { x: CX - 118, y: -8, w: 236, h: 276 };
  const sil = new Sil(ctx, [ironCollar, stackPath(-1), stackPath(1), sole, upper, ...plates], box);
  const g = sil.g;
  if (o.emissive) {
    coals(g, 1, 0);
    // a hot seam where the upper meets the sole, and glowing stack mouths
    softStroke(g, (c) => {
      c.moveTo(CX - 104, 200);
      c.bezierCurveTo(CX - 100, 228, CX - 60, 236, CX, 236);
      c.bezierCurveTo(CX + 60, 236, CX + 100, 228, CX + 104, 200);
    }, rgba(amber, 0.8), 3, 2);
    for (const [mx, my] of STACKS) {
      const sg = g.createRadialGradient(mx, my, 1, mx, my, 14);
      sg.addColorStop(0, rgba('#ffd07a', 0.9));
      sg.addColorStop(1, rgba('#ff5a10', 0));
      g.fillStyle = sg;
      g.fillRect(mx - 16, my - 16, 32, 32);
    }
    sil.finish('rgba(0,0,0,0)', { w: 0.01, inner: 0 });
    return;
  }
  if (o.heat) {
    // the iron heating up from the sole: dull red, orange, then a yellow-white edge, patchy like real heat
    const hg = g.createLinearGradient(0, 270, 0, 20);
    hg.addColorStop(0, rgba('#ffb040', 0.75));
    hg.addColorStop(0.15, rgba('#ff6a1a', 0.62));
    hg.addColorStop(0.42, rgba('#c8200a', 0.42));
    hg.addColorStop(0.8, rgba('#6a0804', 0.16));
    hg.addColorStop(1, rgba('#6a0804', 0));
    g.fillStyle = hg;
    g.fillRect(box.x, box.y, box.w, box.h);
    blotches(g, box, '#000000', 0.6, 26, 0.42, 0.3, 21, 'destination-out');
    // the seams and plate edges run hottest
    softStroke(g, (c) => {
      for (let i = 0; i < 3; i++) {
        const y = 188 + i * 17;
        const rx = 100 - i * 7;
        c.moveTo(CX - rx, y);
        c.bezierCurveTo(CX - rx * 0.6, y + 10, CX + rx * 0.6, y + 10, CX + rx, y);
      }
    }, rgba('#ffd27a', 0.7), 3, 2);
    sil.finish('rgba(0,0,0,0)', { w: 0.01, inner: 0 });
    return;
  }
  const it = tones('iron', iron);
  // cast iron everywhere first
  sil.fillParts(iron);
  const base = g.createLinearGradient(CX - 110, 0, CX + 110, 200);
  base.addColorStop(0, it.hi);
  base.addColorStop(0.5, it.mid);
  base.addColorStop(1, it.lo);
  sil.fillParts(base);
  texture(g, 'cast', box, 0.5, 1.2);
  // the sole: a dark tread block, its lugs catching a cold edge light
  g.save();
  sole(g);
  g.clip();
  const sg = g.createLinearGradient(0, 190, 0, 266);
  sg.addColorStop(0, shade(iron, -0.45));
  sg.addColorStop(1, shade(iron, -0.75));
  g.fillStyle = sg;
  g.fillRect(box.x, 180, box.w, 90);
  texture(g, 'cast', box, 0.6, 1.2);
  g.strokeStyle = rgba('#c8d0e0', 0.35);
  g.lineWidth = 1.4;
  for (let i = 0; i < 7; i++) {
    const x = CX - 84 + i * 28;
    g.beginPath();
    g.moveTo(x + 3, 259 - flex * 4);
    g.lineTo(x + 17, 259 - flex * 4);
    g.stroke();
  }
  g.restore();
  // the upper: red enamel plates over iron, chipped at the edges, with a riveted spine down the middle
  g.save();
  upper(g);
  g.clip();
  for (const s of [-1, 1]) {
    const panel = (c: Ctx) => {
      c.beginPath();
      c.moveTo(CX + s * 20, 30);
      c.lineTo(CX + s * 70, 30);
      c.bezierCurveTo(CX + s * 92, 80, CX + s * 100, 120, CX + s * 98, 186);
      c.lineTo(CX + s * 20, 186);
      c.closePath();
    };
    contact(g, (c) => {
      panel(c);
      c.fill();
    }, 0.45, 2, 3);
    g.save();
    panel(g);
    g.clip();
    const rt = tones('enamel', red);
    const pg = g.createLinearGradient(CX + s * 20, 30, CX + s * 100, 190);
    pg.addColorStop(0, s < 0 ? rt.hi : rt.mid);
    pg.addColorStop(1, s < 0 ? rt.mid : rt.lo);
    g.fillStyle = pg;
    g.fillRect(box.x, 20, box.w, 180);
    texture(g, 'grain', box, 0.15);
    // chips: the paint gone, iron showing, with a lit lip
    blotches(g, { x: CX + (s < 0 ? -100 : 20), y: 28, w: 80, h: 160 }, shade(iron, -0.1), 1, 7, 0.7, 0.015, 31 + s);
    spec(g, CX + s * 50 - 12, 70, 22, 50, s < 0 ? 0.55 : 0.25, -0.25);
    g.restore();
    // panel bolts
    for (const [px, py] of [[CX + s * 30, 40], [CX + s * 62, 40], [CX + s * 30, 176], [CX + s * 88, 176]] as const) rivet(g, px, py, 4.2, '#a8aeb8');
  }
  // the spine: a raised iron rib with rivets
  const spine = (c: Ctx) => {
    c.beginPath();
    c.roundRect(CX - 13, 26, 26, 170, 6);
  };
  contact(g, (c) => {
    spine(c);
    c.fill();
  }, 0.5, 2.5, 3);
  const spg = g.createLinearGradient(CX - 13, 0, CX + 13, 0);
  spg.addColorStop(0, shade(iron, 0.35));
  spg.addColorStop(0.4, iron);
  spg.addColorStop(1, shade(iron, -0.45));
  g.fillStyle = spg;
  spine(g);
  g.fill();
  for (let y = 40; y < 190; y += 26) if (y < GRATE.y - 6 || y > GRATE.y + GRATE.h + 6) rivet(g, CX, y, 4.6, '#b8bec8');
  // heat-blued temper colours along the bottom of the upper
  const tg = g.createLinearGradient(0, 160, 0, 236);
  tg.addColorStop(0, rgba('#c8a040', 0));
  tg.addColorStop(0.5, rgba('#c89a30', 0.16));
  tg.addColorStop(1, rgba('#4a5ac8', 0.24));
  g.fillStyle = tg;
  g.fillRect(box.x, 160, box.w, 80);
  g.restore();
  // the furnace grate: soot above it, a dark mouth, coals, iron bars
  softFill(g, (c) => {
    c.beginPath();
    c.ellipse(CX, GRATE.y - 4, 50, 22, 0, 0, Math.PI * 2);
  }, rgba('#0a0606', 0.5), 7);
  g.fillStyle = '#120806';
  g.beginPath();
  g.roundRect(GRATE.x - 6, GRATE.y - 6, GRATE.w + 12, GRATE.h + 12, 16);
  g.fill();
  coals(g, 0.85, 0);
  for (let i = 0; i < 6; i++) {
    const x = GRATE.x + 7 + i * ((GRATE.w - 14) / 5);
    const bar = g.createLinearGradient(x - 3, 0, x + 3, 0);
    bar.addColorStop(0, shade(iron, 0.3));
    bar.addColorStop(0.5, shade(iron, -0.2));
    bar.addColorStop(1, shade(iron, -0.65));
    g.fillStyle = bar;
    g.fillRect(x - 3, GRATE.y - 4, 6, GRATE.h + 8);
  }
  // the grate's frame: a heavy lipped ring
  g.save();
  g.lineWidth = 7;
  const fr = g.createLinearGradient(GRATE.x, GRATE.y, GRATE.x + GRATE.w, GRATE.y + GRATE.h);
  fr.addColorStop(0, shade(iron, 0.4));
  fr.addColorStop(0.5, iron);
  fr.addColorStop(1, shade(iron, -0.55));
  g.strokeStyle = fr;
  g.beginPath();
  g.roundRect(GRATE.x - 6, GRATE.y - 6, GRATE.w + 12, GRATE.h + 12, 16);
  g.stroke();
  g.restore();
  for (const [x, y] of [[GRATE.x - 6, GRATE.y + GRATE.h / 2], [GRATE.x + GRATE.w + 6, GRATE.y + GRATE.h / 2]] as const) rivet(g, x, y, 5, '#c0c6d0');
  // steel toe plates: overlapping sabaton bands, polished, each casting a shadow on the next
  plates.forEach((pl, i) => {
    contact(g, (c) => {
      pl(c);
      c.fill();
    }, 0.6, 3, 4);
    g.save();
    pl(g);
    g.clip();
    const y = 188 + i * 17;
    const st = g.createLinearGradient(CX - 100, y, CX + 100, y + 40);
    st.addColorStop(0, '#e8ecf2');
    st.addColorStop(0.18, '#a8b0bc');
    st.addColorStop(0.32, '#f6f8fb');
    st.addColorStop(0.5, '#6a7280');
    st.addColorStop(0.75, '#9aa2ae');
    st.addColorStop(1, '#3a404a');
    g.fillStyle = st;
    g.fillRect(box.x, y - 10, box.w, 60);
    texture(g, 'brushed', box, 0.2);
    // temper colours on the lowest, hottest plate
    if (i === 2) {
      const tc = g.createLinearGradient(0, y, 0, y + 44);
      tc.addColorStop(0, rgba('#d8a040', 0.25));
      tc.addColorStop(1, rgba('#3a4ad8', 0.3));
      g.fillStyle = tc;
      g.fillRect(box.x, y, box.w, 50);
    }
    g.restore();
    lobe(g, pl, { x: box.x, y: y - 12, w: box.w, h: 70 }, y - 20, y - 10, '#0a0c14', 0.55, 6, 0.5);
    rivet(g, CX - 90 + i * 7, y + 4, 3.6, '#d0d6e0');
    rivet(g, CX + 90 - i * 7, y + 4, 3.6, '#d0d6e0');
    spec(g, CX - 46, y + 18 - i * 2, 26, 4, 0.8, 0.12);
  });
  // the collar ring and the stacks
  g.save();
  ironCollar(g);
  g.clip();
  const cg = g.createLinearGradient(0, -6, 0, 28);
  cg.addColorStop(0, shade(iron, 0.3));
  cg.addColorStop(0.4, iron);
  cg.addColorStop(1, shade(iron, -0.6));
  g.fillStyle = cg;
  g.fillRect(box.x, -8, box.w, 40);
  texture(g, 'cast', box, 0.5, 1.2);
  g.restore();
  for (let i = 0; i < 6; i++) rivet(g, CX - 62 + i * 24.8, 12, 3.8, '#b0b6c0');
  for (const s of [-1, 1]) {
    const sp = stackPath(s);
    g.save();
    sp(g);
    g.clip();
    const pg = g.createLinearGradient(CX + s * 60, 0, CX + s * 112, 30);
    pg.addColorStop(0, '#5a606c');
    pg.addColorStop(0.35, '#d8dee8');
    pg.addColorStop(0.6, '#7a8290');
    pg.addColorStop(1, '#2a2e36');
    g.fillStyle = pg;
    g.fillRect(box.x, -10, box.w, 70);
    // heat-blued bands
    g.strokeStyle = rgba('#3a4ac8', 0.35);
    g.lineWidth = 3;
    for (const t of [0.35, 0.6]) {
      const [mx, my] = STACKS[s < 0 ? 0 : 1];
      const x = CX + s * 58 + (mx - (CX + s * 58)) * t;
      const y = 40 + (my - 40) * t;
      g.beginPath();
      g.moveTo(x - 10, y - 8 * s);
      g.lineTo(x + 10, y + 8 * s);
      g.stroke();
    }
    g.restore();
    const [mx, my] = STACKS[s < 0 ? 0 : 1];
    g.fillStyle = '#0a0606';
    g.beginPath();
    g.ellipse(mx, my, 11, 4.5, s * -0.75, 0, Math.PI * 2);
    g.fill();
  }
  // sparks of light on the polished bits
  glint(g, CX - 64, 196, 5, 0.85);
  glint(g, CX - 104 + 6, 8, 3.5, 0.7);
  ao(g, CX, 30, 70, 6, 0.4);
  sil.edge(rgba('#06080e', 0.5), 22, LX * 12, LY * 12);
  sil.edge(rgba(LIGHT.rim, 0.6), 3, LX * 3.5, LY * 3.5);
  sil.finish('#120c10', { openTop: -5 });
  void amber;
}

registerStyle('ironheel', {
  contactY: 262,
  halfWidth: 110,
  rig: { from: 166, to: 186 },
  draw(ctx, art, p, o) {
    drawIronHeel(ctx, art, p, o);
  },
});

export { furStrands };
