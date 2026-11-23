// The Act 10 echoes in the style kit (batch E): each echo is two earlier feet at once (src/content/feet/act10.ts,
// extra.a and extra.b). Foot A is drawn whole with its own style, at full resolution in design space (not a
// low-res copy of its texture), foot B shows through it in torn horizontal bands, a red and a cyan copy of A's
// silhouette sit off to each side, and the tears, scanlines and dead pixels are painted in the echo's glitch colour
// inside the mash-up. The tears and dead pixels are the echo's emissive layer, so they flicker in play
// (src/content/styleLive/acts-e-echo.ts); the runtime slice jitter and RGB split stay the finale's GLSL pass on the
// foot's art (src/game/finale.ts). A foot not yet redrawn in the style kit (the Jetpack Villain) shows through in its
// old art, drawn at the canvas's own resolution.
//
// The echo takes A's sole, width and leg, so it stands and hits exactly like the foot it echoes.

import { type FootArt, type FootType, FOOT_BY_ID } from '../../data/feet';
import { FOOT_FRAME, drawFoot } from '../../art/feetArt';
import { type Pose, pxPerUnit } from '../../art/style/kit';
import { type StyleDef, registerStyle, styleDef } from '../../art/style/registry';
import { type Ctx, hashStr, makeCanvas, rgba, rng } from '../../art/util';

type Opts = { live: boolean; emissive?: boolean; heat?: boolean };

/** A blank layer the size of the target, in the same design transform. */
function layerLike(ctx: Ctx): [HTMLCanvasElement, Ctx] {
  const [c, x] = makeCanvas(ctx.canvas.width, ctx.canvas.height);
  x.setTransform(ctx.getTransform());
  return [c, x];
}

/** Draw a layer back onto its target, pixel for pixel. */
function put(ctx: Ctx, c: HTMLCanvasElement, op: GlobalCompositeOperation = 'source-over', a = 1): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = op;
  ctx.globalAlpha = a;
  ctx.drawImage(c, 0, 0);
  ctx.restore();
}

/** Legacy art for a source foot that has no style yet, at `k` texels per design unit (cached per size). */
const legacyCache = new Map<string, HTMLCanvasElement>();
function legacyFoot(t: FootType, k: number): HTMLCanvasElement {
  const key = `${t.id}@${k.toFixed(2)}`;
  let c = legacyCache.get(key);
  if (!c) {
    c = drawFoot({ ...t, scale: 1 } as FootType, k).foot;
    legacyCache.set(key, c);
  }
  return c;
}

/** One source foot drawn whole in design space (its style if it has one, else its old art). */
function drawSource(g: Ctx, id: string, p: Pose): boolean {
  const t = FOOT_BY_ID[id];
  if (!t || t.art.kind.startsWith('echo')) return false;
  const st = styleDef(id);
  if (st) {
    g.save();
    st.draw(g, t.art, p, { live: false });
    g.restore();
    return true;
  }
  const k = pxPerUnit(g);
  g.drawImage(legacyFoot(t, k), -FOOT_FRAME.padX, -FOOT_FRAME.padY, FOOT_FRAME.w, FOOT_FRAME.h);
  return true;
}

/** A layer filled flat with one colour where `src` has paint. */
function flat(src: HTMLCanvasElement, col: string): HTMLCanvasElement {
  const [c, x] = makeCanvas(src.width, src.height);
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = col;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

interface Tear {
  y0: number;
  y1: number;
  dx: number;
}

/** Where B tears through A (design rows) and the dead pixel blocks, fixed per echo. */
function layout(art: FootArt): { tears: Tear[]; blocks: [number, number, number, number, boolean][] } {
  const ex = art.extra ?? {};
  const r = rng(hashStr(`echo:${ex.a}:${ex.b}`));
  const tears: Tear[] = [
    { y0: 30 + r() * 20, y1: 78 + r() * 14, dx: 8 },
    { y0: 128 + r() * 10, y1: 168 + r() * 10, dx: -10 },
    { y0: 206 + r() * 8, y1: 236 + r() * 10, dx: 6 },
  ];
  const blocks: [number, number, number, number, boolean][] = [];
  for (let i = 0; i < 10; i++) blocks.push([10 + r() * 190, 10 + r() * 240, 8 + r() * 30, 3 + r() * 7, i % 3 === 0]);
  return { tears, blocks };
}

function drawEcho(ctx: Ctx, art: FootArt, p: Pose, o: Opts): void {
  if (o.heat) return;
  const ex = art.extra ?? {};
  const a = String(ex.a);
  const b = String(ex.b);
  const glitch = String(ex.glitch ?? '#ff3df0');
  const { tears, blocks } = layout(art);
  // A whole
  const [ca, la] = layerLike(ctx);
  if (!drawSource(la, a, p)) return;
  // B, then only its torn bands, each shifted sideways
  const [cb, lb] = layerLike(ctx);
  drawSource(lb, b, p);
  const [cbands, lbands] = layerLike(ctx);
  const k = pxPerUnit(ctx);
  for (const t of tears) {
    lbands.save();
    lbands.beginPath();
    lbands.rect(-60, t.y0, 340, t.y1 - t.y0);
    lbands.clip();
    // the clip stays in design space; the shift is in texture pixels
    lbands.setTransform(1, 0, 0, 1, 0, 0);
    lbands.drawImage(cb, t.dx * k, 0);
    lbands.restore();
  }
  // the mash-up: A with B's bands over it
  const [cm, lm] = layerLike(ctx);
  put(lm, ca);
  put(lm, cbands);
  // the glitch: tears in the glitch colour where the bands meet A, dead pixel blocks, scanlines (inside the mash-up)
  const glitchMarks = (g: Ctx, bright: boolean) => {
    for (const t of tears)
      for (const y of [t.y0, t.y1]) {
        g.fillStyle = rgba(glitch, bright ? 1 : 0.85);
        g.fillRect(-60, y - 1.6, 340, 3.2);
        g.fillStyle = rgba('#ffffff', bright ? 0.9 : 0.6);
        g.fillRect(-60, y - 0.5, 340, 1);
      }
    for (const [x, y, w, h, white] of blocks) {
      g.fillStyle = rgba(white ? '#ffffff' : glitch, bright ? 0.85 : 0.45);
      g.fillRect(x, y, w, h);
    }
  };
  if (o.emissive) {
    // glow only: the tears and dead pixels, kept on the mash-up
    const [ce, le] = layerLike(ctx);
    glitchMarks(le, true);
    put(le, cm, 'destination-in');
    put(ctx, ce);
    return;
  }
  lm.save();
  lm.globalCompositeOperation = 'source-atop';
  // a soft line of B's colour under each tear's lip, so the bands read as torn, not pasted
  for (const t of tears) {
    const gr = lm.createLinearGradient(0, t.y1, 0, t.y1 + 7);
    gr.addColorStop(0, rgba('#000000', 0.32));
    gr.addColorStop(1, rgba('#000000', 0));
    lm.fillStyle = gr;
    lm.fillRect(-60, t.y1, 340, 7);
  }
  // scanlines
  lm.fillStyle = rgba('#000000', 0.1);
  for (let y = -8; y < 337; y += 6) lm.fillRect(-60, y, 340, 2);
  lm.fillStyle = rgba(glitch, 0.05);
  for (let y = -5; y < 337; y += 6) lm.fillRect(-60, y, 340, 1);
  glitchMarks(lm, false);
  // one light over the whole mash-up, so the two halves sit together
  const hl = lm.createLinearGradient(10, 0, 210, 260);
  hl.addColorStop(0, rgba('#ffffff', 0.12));
  hl.addColorStop(0.5, rgba('#ffffff', 0));
  hl.addColorStop(1, rgba('#000000', 0.14));
  lm.fillStyle = hl;
  lm.fillRect(-60, -8, 340, 345);
  lm.restore();
  // the echo never quite lines up with itself: a red and a cyan copy of the mash-up off to each side, behind it
  const red = flat(cm, '#ff2d6f');
  const cyan = flat(cm, '#2de1ff');
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 0.5;
  ctx.drawImage(red, -6 * k, 1 * k);
  ctx.drawImage(cyan, 6 * k, -1 * k);
  ctx.restore();
  put(ctx, cm);
}

/** Register an echo: A's sole, width and leg (read when asked, so the order the style files load in doesn't
 * matter), and no toe rig: the finale's GLSL glitch rides the foot's one art image. */
function echo(id: string, a: string): void {
  const def: StyleDef = {
    get contactY() {
      return styleDef(a)?.contactY;
    },
    get halfWidth() {
      return styleDef(a)?.halfWidth;
    },
    get leg() {
      return styleDef(a)?.leg;
    },
    draw(ctx, art, p, o) {
      drawEcho(ctx, art, p, o);
    },
  };
  registerStyle(id, def);
}

echo('echobot', 'robo');
echo('echoghost', 'ghost');
echo('echocowboy', 'cowboy');
echo('echoclown', 'clown');
echo('echodino', 'dino');
