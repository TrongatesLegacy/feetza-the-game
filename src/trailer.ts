// Dev-only trailer director. Steps the real game frame-by-frame on a virtual clock, uploads every
// frame as a JPEG, and logs every sound effect with its frame time so the soundtrack can be mixed
// in post (ffmpeg). Nothing plays through the speakers. Never included in production builds.
/* eslint-disable @typescript-eslint/no-explicit-any */
import Phaser from 'phaser';
import { BACKDROPS, type BackdropId } from './art/backdrops';
import { FOOT_BY_ID } from './data/feet';
import { audio } from './systems/audio';
import { updateSettings } from './systems/save';

const W = 1920;
const H = 1080;
const FPS = 60;
const DURATION = 30.4;

function logoCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 1300;
  c.height = 420;
  const ctx = c.getContext('2d')!;
  const x = c.width / 2;
  const y = 300;
  ctx.font = '280px "Lilita One"';
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.save();
  ctx.translate(0, 24);
  ctx.lineWidth = 44;
  ctx.strokeStyle = '#2a1810';
  ctx.strokeText('FEETZA', x, y);
  ctx.fillStyle = '#2a1810';
  ctx.fillText('FEETZA', x, y);
  ctx.restore();
  ctx.lineWidth = 32;
  ctx.strokeStyle = '#2a1810';
  ctx.strokeText('FEETZA', x, y);
  const g = ctx.createLinearGradient(0, y - 220, 0, y);
  g.addColorStop(0, '#fff6b8');
  g.addColorStop(0.38, '#ffd23f');
  g.addColorStop(0.72, '#ff9f1c');
  g.addColorStop(1, '#e5402a');
  ctx.fillStyle = g;
  ctx.fillText('FEETZA', x, y);
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeText('FEETZA', x - 3, y - 6);
  return c;
}

// ——— 9:16 portrait cut ———
// The game renders 16:9 as usual; each frame is composited into 1080×1920: a blurred fill, the
// play area (all three pizzas) as a sticker panel, titles above it and a call to action below.
// Text sits inside the TikTok/Reels/Shorts safe zone (clear of the top tabs and bottom captions).
interface VCap {
  lines: string[];
  color: string;
  t: number;
  hold: number;
}
const VCAPS: Record<string, { lines: string[]; hold?: number }> = {
  'SMACK THE FEET!': { lines: ['SMACK', 'THE FEET!'] },
  'COMBOS. CRITS. TIPS.': { lines: ['COMBOS.', 'CRITS. TIPS.'] },
  '52 FEET. EACH WITH A TRICK.': { lines: ['52 FEET.', 'EACH WITH A TRICK.'] },
  '12 LOCATIONS': { lines: ['12 LOCATIONS'], hold: 5450 },
  'WILD UPGRADES': { lines: ['WILD', 'UPGRADES'] },
  'BOSS FIGHTS!': { lines: ['BOSS', 'FIGHTS!'] },
  '6 BOSSES. 6 ARENAS.': { lines: ['6 BOSSES.', '6 ARENAS.'] },
  'PEEL SLAM!': { lines: ['PEEL', 'SLAM!'] },
};
// Portrait edit: the table panel by default, with hard cuts on the beat to a full-screen close-up
// of one pizza (a fixed pizza index, or 'follow' to track the peel).
interface VShot {
  t: number;
  full?: number | 'follow';
  loom?: string; // foot that is already coming down on this pizza when the shot cuts in
}
const VSHOTS: VShot[] = [
  { t: 0 },
  { t: 5.6, full: 'follow' }, // COMBOS. CRITS. TIPS.
  { t: 7.4, full: 1, loom: 'robo' }, // 52 FEET: cut across the table to show off different feet
  { t: 8.35, full: 2, loom: 'dino' },
  { t: 9.3, full: 0, loom: 'disco' },
  { t: 10.25, full: 1, loom: 'lava' },
  { t: 11.3 }, // 12 LOCATIONS
  { t: 18.2, full: 0, loom: 'stompalot' }, // WILD UPGRADES: cutters, chains and explosions up close
  { t: 19.5 }, // BOSS FIGHTS: Bigfoot is too big for a 9:16 crop, so the boss plays on the table
];
interface VView {
  full: boolean;
  cx: number; // close-up centre (game x)
  since: number; // when this shot started
}
const SS = 2; // the portrait cut renders the game at 2× so close-ups stay sharp
const CROP_W = (H * 9) / 16; // 607.5 game px
const CLOSE_ZOOM = 1.15;
const VW = 1080;
const VH = 1920;
const SRC = { x: 240, y: 0, w: 1440, h: 1080 }; // 4:3 play area: three pizzas and the feet above them
const PANEL = { x: 24, y: 640, w: 1032, h: 774 };
const INK = '#2a1810';
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const backOut = (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
const backIn = (t: number) => 2.70158 * t ** 3 - 1.70158 * t ** 2;

function portraitCompositor(src: HTMLCanvasElement, logo: HTMLCanvasElement, credit: HTMLCanvasElement) {
  const c = document.createElement('canvas');
  c.width = VW;
  c.height = VH;
  const ctx = c.getContext('2d')!;
  const bg = document.createElement('canvas');
  bg.width = 180;
  bg.height = 320;
  const bctx = bg.getContext('2d')!;

  const text = (lines: string[], x: number, y: number, o: { size: number; color: string; font?: string; weight?: number; stroke: number; maxW?: number; shadow?: number }) => {
    const font = o.font ?? '"Lilita One"';
    const w8 = o.weight ? `${o.weight} ` : '';
    ctx.font = `${w8}${o.size}px ${font}`;
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width)) + o.stroke;
    const size = Math.min(o.size, (o.size * (o.maxW ?? 1000)) / widest);
    const stroke = (o.stroke * size) / o.size;
    ctx.font = `${w8}${size}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    const lh = size * 0.98;
    const y0 = y - ((lines.length - 1) * lh) / 2;
    const pass = (dy: number, fill: string, strokeIt: boolean) =>
      lines.forEach((l, i) => {
        if (strokeIt) {
          ctx.lineWidth = stroke;
          ctx.strokeStyle = INK;
          ctx.strokeText(l, x, y0 + i * lh + dy);
        }
        ctx.fillStyle = fill;
        ctx.fillText(l, x, y0 + i * lh + dy);
      });
    if (o.shadow) pass(o.shadow, INK, true);
    pass(0, o.color, true);
  };
  const withT = (x: number, y: number, scale: number, alpha: number, angle: number, fn: () => void) => {
    if (alpha <= 0.002) return;
    ctx.save();
    ctx.globalAlpha = clamp01(alpha);
    ctx.translate(x, y);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.scale(scale, scale);
    fn();
    ctx.restore();
  };
  // logo canvas: glyph centre sits at (650, 200) of 1300×420
  const drawLogo = (cx: number, cy: number, width: number) => {
    const s = width / logo.width;
    ctx.drawImage(logo, cx - 650 * s, cy - 200 * s, logo.width * s, logo.height * s);
  };
  const rrect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  };

  return (t: number, caps: VCap[], locs: { name: string; t: number }[], view: VView): HTMLCanvasElement => {
    if (view.full) {
      // full-screen close-up with a small punch-in on the cut
      // zoomed past the full-height crop and anchored to the bottom: foot and pizza fill the frame
      const z = CLOSE_ZOOM * (1 + 0.07 * (1 - clamp01((t - view.since) / 0.3)) ** 2);
      const w = CROP_W / z;
      const h = H / z;
      const sx = Math.max(0, Math.min(W - w, view.cx - w / 2));
      ctx.drawImage(src, sx * SS, (H - h - 8) * SS, w * SS, h * SS, 0, 0, VW, VH);
      const top = ctx.createLinearGradient(0, 0, 0, 760);
      top.addColorStop(0, 'rgba(18,10,6,0.55)');
      top.addColorStop(1, 'rgba(18,10,6,0)');
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, VW, 760);
    } else {
      drawTable(1 - clamp01((t - 26.0) / 0.5)); // the panel frame fades out under the end card
    }
    overlays(t, caps, locs, view);
    return c;
  };

  function drawTable(frame: number): void {
    // blurred, darkened fill from the middle of the frame
    bctx.filter = 'blur(5px) brightness(0.5) saturate(1.35)';
    bctx.drawImage(src, (960 - 304) * SS, 0, 608 * SS, 1080 * SS, -10, -10, bg.width + 20, bg.height + 20);
    bctx.filter = 'none';
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bg, 0, 0, VW, VH);
    const grad = ctx.createLinearGradient(0, 0, 0, VH);
    grad.addColorStop(0, 'rgba(18,10,6,0.55)');
    grad.addColorStop(0.3, 'rgba(18,10,6,0.1)');
    grad.addColorStop(0.7, 'rgba(18,10,6,0.1)');
    grad.addColorStop(1, 'rgba(18,10,6,0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VW, VH);

    // play-area sticker panel
    const P = PANEL;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#120a06';
    rrect(P.x, P.y + 16, P.w, P.h, 36);
    ctx.fill();
    ctx.restore();
    ctx.save();
    rrect(P.x, P.y, P.w, P.h, 36);
    ctx.clip();
    ctx.drawImage(src, SRC.x * SS, SRC.y * SS, SRC.w * SS, SRC.h * SS, P.x, P.y, P.w, P.h);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = frame;
    rrect(P.x, P.y, P.w, P.h, 36);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#fff6e6';
    ctx.stroke();
    rrect(P.x - 6, P.y - 6, P.w + 12, P.h + 12, 42);
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();
  }

  function overlays(t: number, caps: VCap[], locs: { name: string; t: number }[], view: VView): void {

    // intro: logo + tagline are up from frame 0 (the thumbnail), punch on the stomp, fly out at 2.75s
    if (t < 3.2) {
      const out = clamp01((t - 2.75) / 0.42);
      const dy = -420 * backIn(out);
      const a = 1 - backIn(out);
      const k = clamp01((t - 0.62) / 0.4);
      const punch = t >= 0.62 ? 1 + 0.14 * Math.sin(Math.PI * k) * (1 - k) : 1;
      withT(VW / 2, 372 + dy, punch, a, -2, () => drawLogo(0, 0, 980));
      withT(VW / 2, 562 + dy, 1, a, 0, () => text(['Stop the feet. Save the pizza.'], 0, 0, { size: 62, color: '#ffffff', font: '"Fredoka"', weight: 600, stroke: 16, maxW: 980 }));
    }

    // captions (same motion as the landscape cut)
    for (const cap of caps) {
      const e = t - cap.t;
      if (e < 0 || e > cap.hold / 1000 + 0.27) continue;
      const i = backOut(clamp01(e / 0.26));
      const o = clamp01((e - cap.hold / 1000) / 0.26) ** 2;
      const scale = (2.2 + (1 - 2.2) * i) * (1 - 0.1 * o);
      const cy = (cap.lines[0] === '12 LOCATIONS' ? 330 : 400) - 40 * o;
      withT(VW / 2, cy, scale, Math.min(1, i) * (1 - o), -4 + 2 * i, () =>
        text(cap.lines, 0, 0, { size: 150, color: cap.color, stroke: 24, maxW: 1000, shadow: 10 }),
      );
    }

    // location name pill under "12 LOCATIONS"
    const loc = [...locs].reverse().find((l) => l.t <= t);
    if (loc && t < 16.95) {
      const e = t - loc.t;
      const s = 1.35 + (1 - 1.35) * backOut(clamp01(e / 0.22));
      withT(VW / 2, 505, s, clamp01(e / 0.12) * (1 - clamp01((t - 16.75) / 0.2)), 2, () => {
        ctx.font = '72px "Lilita One"';
        const w = ctx.measureText(loc.name).width + 90;
        rrect(-w / 2, -58, w, 116, 58);
        ctx.fillStyle = '#e5402a';
        ctx.fill();
        ctx.lineWidth = 8;
        ctx.strokeStyle = INK;
        ctx.stroke();
        text([loc.name], 0, 4, { size: 72, color: '#ffffff', stroke: 12 });
      });
    }

    // persistent call to action under the panel
    const band = view.full ? 0 : clamp01((t - 3.1) / 0.3) * (1 - clamp01((t - 26.0) / 0.4));
    withT(VW / 2, 0, 1, band, 0, () => {
      drawLogo(0, 1518, 440);
      text(['PLAY FREE IN YOUR BROWSER'], 0, 1626, { size: 56, color: '#ffd23f', stroke: 13, maxW: 900 });
    });

    // end card
    if (t >= 26.0) {
      ctx.fillStyle = `rgba(18,10,6,${0.9 * clamp01((t - 26.0) / 0.6)})`;
      ctx.fillRect(0, 0, VW, VH);
      const l = clamp01((t - 26.25) / 0.42);
      withT(VW / 2, 600, 2.6 + (1 - 2.6) * backOut(l), Math.min(1, l * 1.5), -2, () => drawLogo(0, 0, 1000));
      const c1 = clamp01((t - 26.9) / 0.4);
      withT(VW / 2, 900 - 14 * c1, 1, c1, 0, () => text(['PLAY FREE', 'IN YOUR BROWSER'], 0, 0, { size: 112, color: '#ffd23f', stroke: 22, maxW: 960, shadow: 8 }));
      const c2 = clamp01((t - 27.15) / 0.4);
      withT(VW / 2, 1130 - 14 * c2, 1, c2, 0, () =>
        text(['trongateslegacy.github.io', '/feetza-the-game'], 0, 0, { size: 60, color: '#ffffff', font: '"Fredoka"', weight: 600, stroke: 13, maxW: 900 }),
      );
      const c3 = clamp01((t - 27.45) / 0.42);
      const cs = Math.min(1, 960 / credit.width);
      withT(VW / 2, 1362 - 12 * c3, cs * (0.9 + 0.1 * backOut(c3)), c3, 0, () => ctx.drawImage(credit, -credit.width / 2, -credit.height / 2));
    }
  }
}

/** End-card credit: "Made by TrongatesLegacy" over a Kick pill. Shared by both cuts. */
function creditCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const m = c.getContext('2d')!;
  const madeFont = '600 54px "Fredoka"';
  const urlFont = '58px "Lilita One"';
  const tagFont = '40px "Lilita One"';
  m.font = madeFont;
  const madeW = m.measureText('Made by TrongatesLegacy').width;
  m.font = urlFont;
  const urlW = m.measureText('kick.com/trongateslegacy').width;
  m.font = tagFont;
  const tagW = m.measureText('LIVE ON KICK').width;
  const pillH = 104;
  const pillW = 28 + tagW + 44 + 22 + urlW + 40;
  c.width = Math.ceil(Math.max(madeW + 40, pillW + 20));
  c.height = 250;
  const ctx = c.getContext('2d')!;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const cx = c.width / 2;
  // "Made by TrongatesLegacy"
  ctx.font = madeFont;
  ctx.textAlign = 'left';
  const x0 = cx - madeW / 2;
  const madeByW = ctx.measureText('Made by ').width;
  ctx.lineWidth = 13;
  ctx.strokeStyle = INK;
  ctx.strokeText('Made by TrongatesLegacy', x0, 46);
  ctx.fillStyle = '#fff6e2';
  ctx.fillText('Made by ', x0, 46);
  ctx.fillStyle = '#ffd23f';
  ctx.fillText('TrongatesLegacy', x0 + madeByW, 46);
  // Kick pill: dark "LIVE ON KICK" chip + the channel URL on Kick green
  const px = cx - pillW / 2;
  const py = 120;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.roundRect(px, py + 10, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = '#53fc18';
  ctx.beginPath();
  ctx.roundRect(px, py, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = INK;
  ctx.stroke();
  const chipW = tagW + 44 + 28;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.roundRect(px + 12, py + 12, chipW, pillH - 24, (pillH - 24) / 2);
  ctx.fill();
  ctx.fillStyle = '#53fc18';
  ctx.beginPath();
  ctx.arc(px + 12 + 30, py + pillH / 2, 9, 0, Math.PI * 2); // live dot
  ctx.fill();
  ctx.font = tagFont;
  ctx.fillText('LIVE ON KICK', px + 12 + 48, py + pillH / 2 + 2);
  ctx.font = urlFont;
  ctx.fillStyle = INK;
  ctx.fillText('kick.com/trongateslegacy', px + 12 + chipW + 22, py + pillH / 2 + 3);
  return c;
}

export interface TrailerResult {
  frames: number;
  sfx: number;
  ms: number;
}

export async function recordTrailer(game: Phaser.Game, opts: { prefix: string; vertical?: boolean }): Promise<TrailerResult> {
  const started = performance.now();
  if (opts.vertical) await Promise.all([document.fonts.load('110px "Lilita One"'), document.fonts.load('600 60px "Fredoka"')]);
  updateSettings({ screenShake: true, flashes: true, damageNumbers: true });
  // speakers off: nothing should play out loud while rendering
  const sm = game.sound as Phaser.Sound.WebAudioSoundManager;
  try {
    sm.masterVolumeNode.disconnect(sm.context.destination);
  } catch {
    /* already disconnected */
  }
  sm.stopAll();

  // virtual clock + sound log
  let vt = 0;
  const sfxLog: { key: string; t: number; vol: number; rate: number }[] = [];
  const music: { key: string; t: number }[] = [];
  const lastByKey = new Map<string, number>();
  (audio as any).sfx = (key: string, o: { volume?: number; rate?: number; throttle?: number; jitter?: number } = {}) => {
    const thr = (o.throttle ?? 35) / 1000;
    if (vt - (lastByKey.get(key) ?? -1) < thr) return;
    lastByKey.set(key, vt);
    const jitter = o.jitter ?? 0.06;
    sfxLog.push({ key, t: +vt.toFixed(4), vol: o.volume ?? 1, rate: +((o.rate ?? 1) * (1 + (Math.random() * 2 - 1) * jitter)).toFixed(3) });
  };

  // fresh game scene under director control
  document.querySelectorAll('.screen').forEach((e) => e.remove());
  game.scene.getScenes(true).forEach((s) => s.scene.stop());
  game.scene.start('Game', { lineup: ['pepperoni', 'margherita', 'diavola'] });
  const g = game.scene.getScene('Game') as any;
  for (let i = 0; i < 80 && !g.plan; i++) await new Promise((r) => setTimeout(r, 50));
  g.time.removeAllEvents();
  const { ui } = await import('./ui/ui');
  ui.showHud(false);
  ui.closeAll();
  ui.hud.tutorial(false);
  sm.stopAll();
  Object.assign(g.plan, { queue: [], golden: false, maxAlive: 99, eliteChance: 0, speedMult: 1.55 });
  Object.assign(g, { bossPending: true, waveActive: true, tutorial: false, slamHinted: true });
  Object.assign(g.run.stats, { critChance: 0.28, knockback: 170 });
  for (const f of g.feet) f.destroy();
  const cam: Phaser.Cameras.Scene2D.Camera = g.cameras.main;
  const show = (id: BackdropId, fade: number) => {
    g.backdrop.show(id, fade);
    g.tintGrade(BACKDROPS[id].light, fade);
    g.currentBackdrop = id;
  };
  show('trattoria', 0);

  if (g.textures.exists('trailerLogo')) g.textures.remove('trailerLogo');
  g.textures.addCanvas('trailerLogo', logoCanvas());
  if (g.textures.exists('trailerCredit')) g.textures.remove('trailerCredit');
  g.textures.addCanvas('trailerCredit', creditCanvas());
  // titles live in their own scene so camera zoom/shake in the game never clips them
  if (game.scene.getScene('TrailerOverlay')) game.scene.remove('TrailerOverlay');
  game.scene.add('TrailerOverlay', class extends Phaser.Scene {}, true);
  const o = game.scene.getScene('TrailerOverlay') as any;
  game.scene.bringToTop('TrailerOverlay');
  const supersample = (k: number) => {
    // renderer.resize only resets the GL viewport, so grow the canvas backing store first
    game.canvas.width = W * k;
    game.canvas.height = H * k;
    game.renderer.resize(W * k, H * k);
    for (const sc of [g, o]) sc.cameras.main.setViewport(0, 0, W * k, H * k).setZoom(k).centerOn(W / 2, H / 2);
  };
  if (opts.vertical) supersample(SS);
  const top = o.add.container(0, 0);
  const shade = o.add.rectangle(W / 2, H / 2, W, H, 0x120a06).setAlpha(0);
  top.add(shade);
  // 9:16 mode: the overlay still runs (same timeline) but the portrait compositor draws its own titles
  if (opts.vertical) {
    top.setVisible(false);
    g.pizzas.forEach((p: any) => p.hideLabel()); // perk captions are unreadable at portrait size
  }
  const vcaps: VCap[] = [];
  const vlocs: { name: string; t: number }[] = [];
  const vcap = (text: string, color: string, hold: number) => vcaps.push({ lines: VCAPS[text]?.lines ?? [text], color, t: vt, hold: VCAPS[text]?.hold ?? hold });
  const caption = (text: string, color = '#ffd23f', y = 190, hold = 1500, size = 120) => {
    const t = o.add
      .text(W / 2, y, text, { fontFamily: '"Lilita One"', fontSize: `${size}px`, color, stroke: '#2a1810', strokeThickness: 22, align: 'center' })
      .setOrigin(0.5)
      .setShadow(0, 10, '#2a1810', 0, true, true)
      .setScale(2.2)
      .setAlpha(0)
      .setAngle(-4);
    top.add(t);
    vcap(text, color, hold);
    o.tweens.add({ targets: t, scale: 1, alpha: 1, angle: -2, duration: 260, ease: 'Back.Out' });
    o.tweens.add({ targets: t, alpha: 0, y: y - 40, scale: 0.9, delay: hold, duration: 260, ease: 'Quad.In', onComplete: () => t.destroy() });
    audio.sfx('sfx_whoosh', { volume: 0.9, rate: 0.9 });
  };

  // auto-player: the peel glides to the lowest foot and smacks it
  const bot = { on: false, gap: 170, cd: 0, minY: 600 };
  const spawner = { on: false, every: 420, next: 0, pool: [] as string[], max: 6 };
  const healAll = () => g.pizzas.forEach((p: any) => p.heal(8));
  const tick = (dms: number) => {
    if (bot.on) {
      const tgt = g.feet.filter((f: any) => f.hittable && f.y > (f.type.boss ? 700 : bot.minY)).sort((a: any, b: any) => b.y - a.y)[0];
      if (tgt) {
        const k = Math.min(1, dms / 60);
        g.pointer.x += (tgt.cx - g.pointer.x) * k;
        g.pointer.y += (tgt.cy - g.pointer.y) * k;
        bot.cd -= dms;
        if (bot.cd <= 0 && Math.hypot(tgt.cx - g.pointer.x, tgt.cy - g.pointer.y) < 60) {
          g.smack(g.pointer.x, g.pointer.y);
          bot.cd = bot.gap;
        }
      }
    }
    if (spawner.on && vt * 1000 >= spawner.next) {
      spawner.next = vt * 1000 + spawner.every;
      if (g.feet.filter((f: any) => f.alive).length < spawner.max) {
        const t = g.pickTarget(null);
        if (t) g.spawnFoot(FOOT_BY_ID[Phaser.Utils.Array.GetRandom(spawner.pool)], t, false);
      }
    }
  };

  // ——— timeline (seconds) ———
  const timeline: [number, () => void][] = [];
  const at = (t: number, fn: () => void) => timeline.push([t, fn]);
  let logo: any;
  let tag: any;
  let boss: any;

  const loom = (id: string, pizza: number, y: number) => {
    const f = g.spawnFoot(FOOT_BY_ID[id], g.pizzas[pizza], false);
    f.x = g.pizzas[pizza].x;
    f.y = y;
    f.slot = 0;
    f.setState('descend');
    f.vy = 40;
  };
  if (opts.vertical) for (const sh of VSHOTS) if (sh.loom && typeof sh.full === 'number') at(sh.t, () => loom(sh.loom!, sh.full as number, 520));
  at(0, () => {
    // frame 0 is the thumbnail: open on feet already looming over two nervous pizzas
    loom('tina', 0, 700);
    loom('clown', 2, 650);
    music.push({ key: 'music_boss', t: 0 });
    Object.assign(spawner, { on: true, every: 380, pool: ['bob', 'patty', 'sock', 'flipflop', 'sneaker', 'tina', 'harold', 'clara'] });
  });
  at(0.35, () => {
    logo = o.add.image(W / 2, 330, 'trailerLogo').setScale(3).setAlpha(0);
    top.add(logo);
    o.tweens.add({ targets: logo, scale: 1, alpha: 1, duration: 380, ease: 'Back.Out' });
  });
  at(0.62, () => {
    audio.sfx('sfx_stomp');
    audio.sfx('sfx_crit');
    cam.shake(380, 0.012);
    g.fx.party(W / 2, 360, 60);
  });
  at(1.0, () => {
    tag = o.add
      .text(W / 2, 520, 'Stop the feet. Save the pizza.', { fontFamily: '"Fredoka"', fontStyle: '600', fontSize: '64px', color: '#ffffff', stroke: '#2a1810', strokeThickness: 16 })
      .setOrigin(0.5)
      .setAlpha(0);
    top.add(tag);
    o.tweens.add({ targets: tag, alpha: 1, y: 500, duration: 400, ease: 'Quad.Out' });
  });
  at(2.75, () => o.tweens.add({ targets: [logo, tag], y: '-=420', alpha: 0, duration: 420, ease: 'Back.In' }));
  at(3.1, () => {
    bot.on = true;
    caption('SMACK THE FEET!', '#ffffff', 190, 1500);
  });
  at(5.6, () => caption('COMBOS. CRITS. TIPS.', '#ffd23f', 190, 1200, 104));
  at(7.4, () => {
    healAll();
    spawner.pool = ['clown', 'bella', 'robo', 'bunny', 'dino', 'xeno', 'mummy', 'jingle', 'moe', 'stompalot', 'disco', 'quack', 'wally', 'skate', 'cowboy', 'sasha', 'wendy', 'pete', 'striker', 'lava'];
    spawner.every = 300;
    caption('52 FEET. EACH WITH A TRICK.', '#ffd23f', 190, 2600, 100);
  });
  at(11.3, () => caption('12 LOCATIONS', '#ffffff', 190, 1300));
  (['rooftop', 'beach', 'diner', 'lodge', 'space'] as BackdropId[]).forEach((id, i) =>
    at(11.45 + i * 1.1, () => {
      show(id, 220);
      healAll();
      vlocs.push({ name: BACKDROPS[id].name, t: vt });
    }),
  );
  at(17.0, () => {
    show('diner', 220);
    caption('WILD UPGRADES', '#7dff9a', 190, 1500);
    Object.assign(g.run.stats, { chainChance: 0.7, chainCount: 3, explodeDmg: 45, burnDps: 14, cutters: 2, doubleChance: 0.35 });
    g.syncCutters();
    bot.gap = 130;
    bot.minY = 520;
  });
  at(19.5, () => {
    spawner.on = false;
    bot.on = false;
    for (const f of g.feet.filter((x: any) => x.alive)) g.killFoot(f, 'slam');
    Object.assign(g.run.stats, { chainChance: 0, explodeDmg: 0, burnDps: 0, cutters: 0, doubleChance: 0 });
    g.syncCutters();
    healAll();
    show('bigfoot', 350);
    music.push({ key: 'music_boss_bigfoot', t: 19.5 });
    audio.sfx('sfx_warning');
    cam.flash(300, 255, 40, 20);
    cam.shake(700, 0.008);
    caption('BOSS FIGHTS!', '#ff5a3d', 200, 1700, 140);
  });
  at(20.4, () => {
    boss = g.spawnFoot(FOOT_BY_ID.bigfoot, g.pizzas[1], false);
    boss.maxHp = 260;
    boss.hp = 260;
    g.bossFoot = boss;
    audio.sfx('sfx_stomp');
    cam.shake(600, 0.01);
  });
  at(21.6, () => {
    bot.on = true;
    bot.gap = 120;
    Object.assign(spawner, { on: true, every: 650, pool: ['baby'], max: 4 });
  });
  at(23.7, () => {
    spawner.on = false;
    if (boss?.alive) boss.hp = Math.min(boss.hp, 40);
    g.run.super = 1;
    g.peelSlam();
  });
  at(26.0, () => {
    bot.on = false;
    o.tweens.add({ targets: shade, alpha: 0.72, duration: 600 });
    const endLogo = o.add.image(W / 2, 330, 'trailerLogo').setScale(2.6).setAlpha(0);
    top.add(endLogo);
    o.tweens.add({ targets: endLogo, scale: 1.05, alpha: 1, duration: 420, delay: 250, ease: 'Back.Out' });
  });
  at(26.7, () => {
    audio.sfx('sfx_stomp');
    cam.shake(300, 0.008);
    const cta = o.add
      .text(W / 2, 580, 'PLAY FREE IN YOUR BROWSER', { fontFamily: '"Lilita One"', fontSize: '76px', color: '#ffd23f', stroke: '#2a1810', strokeThickness: 16 })
      .setOrigin(0.5)
      .setAlpha(0);
    const url = o.add
      .text(W / 2, 670, 'trongateslegacy.github.io/feetza-the-game', { fontFamily: '"Fredoka"', fontStyle: '600', fontSize: '46px', color: '#ffffff', stroke: '#2a1810', strokeThickness: 10 })
      .setOrigin(0.5)
      .setAlpha(0);
    top.add([cta, url]);
    o.tweens.add({ targets: cta, alpha: 1, y: 570, duration: 400, delay: 200 });
    o.tweens.add({ targets: url, alpha: 1, y: 660, duration: 400, delay: 450 });
    const credit = o.add.image(W / 2, 880, 'trailerCredit').setAlpha(0).setScale(0.9);
    top.add(credit);
    o.tweens.add({ targets: credit, alpha: 1, scale: 1, y: 868, duration: 420, delay: 750, ease: 'Back.Out' });
  });
  at(27.2, () => audio.sfx('sfx_levelup', { volume: 0.8 }));
  if (opts.vertical) {
    // the portrait cut has room above the action, so the boss fight gets two extra beats
    at(21.6, () => {
      vcap('6 BOSSES. 6 ARENAS.', '#ff9f1c', 1800);
      audio.sfx('sfx_whoosh', { volume: 0.6, rate: 0.9 });
    });
    at(23.7, () => {
      vcap('PEEL SLAM!', '#ffd23f', 1800);
      audio.sfx('sfx_whoosh', { volume: 0.6, rate: 1 });
    });
  }
  timeline.sort((a, b) => a[0] - b[0]);

  // ——— render loop: step the game on the virtual clock and upload each frame ———
  game.loop.stop();
  const canvas = game.canvas;
  const comp = opts.vertical ? portraitCompositor(canvas, logoCanvas(), creditCanvas()) : null;
  const dtMs = 1000 / FPS;
  const total = Math.round(DURATION * FPS);
  const base = game.loop.time + 1000;
  const inflight = new Set<Promise<unknown>>();
  let ti = 0;
  let si = 0;
  const view: VView = { full: false, cx: W / 2, since: 0 };
  const nearestPizzaX = () => g.pizzas.map((p: any) => p.x).sort((a: number, b: number) => Math.abs(a - g.pointer.x) - Math.abs(b - g.pointer.x))[0] ?? W / 2;
  for (let frame = 0; frame < total; frame++) {
    vt = frame / FPS;
    while (ti < timeline.length && timeline[ti][0] <= vt + 1e-6) timeline[ti++][1]();
    tick(dtMs);
    game.step(base + frame * dtMs, dtMs);
    let out: HTMLCanvasElement = canvas;
    if (comp) {
      while (si + 1 < VSHOTS.length && VSHOTS[si + 1].t <= vt + 1e-6) {
        si++;
        const sh = VSHOTS[si];
        view.full = sh.full !== undefined;
        view.since = vt;
        if (sh.full === 'follow') view.cx = nearestPizzaX();
      }
      const sh = VSHOTS[si];
      // 'follow' frames whichever pizza the peel is defending, gliding between them
      if (sh.full === 'follow') view.cx += (nearestPizzaX() - view.cx) * (1 - Math.exp(-dtMs / 260));
      else if (sh.full !== undefined) view.cx = g.pizzas[sh.full]?.x ?? W / 2;
      out = comp(vt, vcaps, vlocs, view);
    }
    const blob = await new Promise<Blob | null>((r) => out.toBlob(r, 'image/jpeg', 0.92));
    if (blob) {
      const p = fetch(`/__file?name=${opts.prefix}${String(frame).padStart(5, '0')}.jpg`, { method: 'POST', body: blob });
      inflight.add(p);
      void p.finally(() => inflight.delete(p));
      if (inflight.size > 12) await Promise.race(inflight);
    }
  }
  await Promise.all(inflight);
  await fetch(`/__file?name=${opts.prefix}audio.json`, { method: 'POST', body: JSON.stringify({ fps: FPS, sfx: sfxLog, music }) });
  delete (audio as any).sfx; // back to the real (prototype) method
  if (opts.vertical) supersample(1);
  game.scene.remove('TrailerOverlay');
  game.loop.start(game.loop.callback);
  return { frames: total, sfx: sfxLog.length, ms: Math.round(performance.now() - started) };
}
