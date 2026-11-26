// The ending, after the Sole Proprietor Unbound (played once, the first time through the journey):
//
// - the light from his cracked sole swells to white, holds (the First Pizzeria is built under it), and opens on the
//   First Pizzeria at sunrise, its own live layer running (the fire, the smoke, the birds, the mist), then THE FIRST
//   PIZZERIA / IS YOURS NOW lands, stamps and shines;
// - the sun rises over the whole sequence: the sky goes from pre-dawn violet through gold to a pale blue morning (the
//   stars going out as the sun clears the range), the sun climbs out from behind the far range with its rays turning
//   slowly, its light rakes across the table, and warm beams spill from the oven's mouth with motes in them;
// - every foot fought marches past along the table in the order they were met, act by act, each act led by its
//   pennant. Every foot hops on its own step: a crouch before take-off, a stretch in the air, a squash on landing
//   with its contact shadow squashing with it and dust puffing off the sandstone, and a waddle from side to side.
//   Each one waves as it passes the middle; mini-bosses leap, bow and say their piece on the move; bosses stop the
//   parade for their moment (a crouch, a leap, a landing that shakes the place, their own roar and quip, a bow);
// - the credits roll up the sky in their own band, set as credits: roles in small caps over names, the music and the
//   ambience per track (where it plays, its title, author and licence, from public/audio/credits.json), the sound
//   effects' sources and licences, the fonts; then AND STARRING YOU;
// - then the PIZZA LEGEND card (a gathering of light, the card, a shine, confetti) and Endless+. `done` opens the
//   victory screen. A skip button ends it at any time after the first beat.
//
// Light to run: the feet's art is warmed through the last stage (finaleCast), the First Pizzeria's live textures are
// kept from its stage (or baked under the white hold), feet and labels off screen are hidden, credits rows are made as
// they scroll into the band and dropped as they leave, and everything moves on one update (no canvas redraws).

import Phaser from 'phaser';
import { BACKDROPS, type BackdropId, type LocationId } from '../art/backdrops';
import { sun as paintSun } from '../art/scene/sky';
import { makeCanvas } from '../art/util';
import { FP } from '../content/art/scene-firstpizzeria';
import { FEET, FOOT_BY_ID, type FootType } from '../data/feet';
import { ACTS, actOf } from '../data/stages';
import { audio } from '../systems/audio';
import { crand } from '../systems/cosmeticRandom';
import { backdropsAnimated } from '../systems/graphics';
import { persist, save } from '../systems/save';
import { ui } from '../ui/ui';
import { addCanvas, ensureBackdrop, ensureFootArt } from './assets';
import { type LiveScene, startLive } from './liveBackdrop';
import { LOCATION_AMBIENCE, LOCATION_MUSIC } from './Run';
import { Parts } from './sceneAnim';
import type { KitLive } from './sceneLive';

const W = 1920;
const H = 1080;
const ADD = Phaser.BlendModes.ADD;
const DISPLAY = 'Lilita One, Fredoka, sans-serif';
const BODY = 'Fredoka, sans-serif';
type Img = Phaser.GameObjects.Image;
type Txt = Phaser.GameObjects.Text;
type Box = Phaser.GameObjects.Container;

const reduced = (): boolean => save.settings.reducedMotion;
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const smooth = (t: number): number => {
  const k = clamp01(t);
  return k * k * (3 - 2 * k);
};

// ——— the cast ———

/** The credits' band in the sky (top and bottom edges), clear of the parade on the table below. */
const CREDITS_TOP = 64;
const CREDITS_BOTTOM = 360;
/** Where the soles land: on the table, in front of the oven. */
const LANE = 880;
/** How many feet march (the most recently met). */
const PARADE_N = 48;
/** Where a boss stops the parade for its moment. */
const HOLD_X = W / 2;

/** Every foot fought so far: regular feet you've smacked, and every boss you've beaten, in the order they were met. */
function foughtFeet(): FootType[] {
  const ids = new Set<string>([...Object.keys(save.kills).filter((k) => (save.kills[k] ?? 0) > 0), ...save.bossesBeaten]);
  return journeyOrder([...ids].map((id) => FOOT_BY_ID[id]));
}

function journeyOrder(feet: (FootType | undefined)[]): FootType[] {
  return feet
    .filter((f): f is FootType => !!f && f.id !== 'soleunbound')
    .sort((a, b) => a.minWave - b.minWave || rank(a) - rank(b));
}

const rank = (f: FootType): number => (f.boss ? 2 : f.mini ? 1 : 0);

/** The feet the ending's parade shows (GameScene warms their art through the last stage: building the parade would
 * otherwise draw any of them that isn't drawn, all in one frame). */
export function finaleCast(): string[] {
  return foughtFeet()
    .slice(-PARADE_N)
    .map((f) => f.id);
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
const roman = (n: number): string => ROMAN[n - 1] ?? String(n);

// ——— textures (each made once per game) ———

function tex(sc: Phaser.Scene, key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): string {
  if (sc.textures.exists(key)) return key;
  const [c, ctx] = makeCanvas(Math.ceil(w), Math.ceil(h));
  draw(ctx);
  addCanvas(sc, key, c);
  return key;
}

/** A sky laid over the First Pizzeria's night one, from its top (nearly opaque: the moon goes in the light) down to
 * clear just above the far range, so the mountains and the dawn on them stay. */
function skyTex(sc: Phaser.Scene, key: string, stops: [number, string][]): string {
  const h = FP.HOR + 12;
  return tex(sc, key, 64, h, (c) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    for (const [o, col] of stops) g.addColorStop(o, col);
    c.fillStyle = g;
    c.fillRect(0, 0, 64, h);
  });
}
/** Dawn: violet going to gold, rose and peach low down. */
const goldSky = (sc: Phaser.Scene): string =>
  skyTex(sc, 'end_sky_gold', [[0, 'rgba(122,104,168,0.96)'], [0.3, 'rgba(196,140,160,0.92)'], [0.6, 'rgba(250,180,130,0.8)'], [0.86, 'rgba(255,206,140,0.42)'], [1, 'rgba(255,210,150,0)']]);
/** Morning: pale blue high up, warm and pale low down. */
const blueSky = (sc: Phaser.Scene): string =>
  skyTex(sc, 'end_sky_blue', [[0, 'rgba(118,166,222,0.97)'], [0.35, 'rgba(160,196,232,0.93)'], [0.65, 'rgba(236,222,206,0.78)'], [0.88, 'rgba(255,226,180,0.4)'], [1, 'rgba(255,230,190,0)']]);

/** The low sun's light raking across the table top: brightest along its back edge and under the sun, warmer towards
 * the oven, fading towards you. */
function tableLight(sc: Phaser.Scene): string {
  const h = H - 760;
  return tex(sc, 'end_tablelight', W / 4, h / 4, (c) => {
    c.scale(0.25, 0.25);
    const v = c.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, 'rgba(255,214,160,0.9)');
    v.addColorStop(0.25, 'rgba(255,196,140,0.45)');
    v.addColorStop(0.7, 'rgba(255,180,120,0.12)');
    v.addColorStop(1, 'rgba(255,180,120,0)');
    c.fillStyle = v;
    c.fillRect(0, 0, W, h);
    c.globalCompositeOperation = 'destination-in';
    const u = c.createLinearGradient(0, 0, W, 0);
    u.addColorStop(0, 'rgba(0,0,0,0.55)');
    u.addColorStop(FP.SUN.x / W, 'rgba(0,0,0,1)');
    u.addColorStop(0.62, 'rgba(0,0,0,0.5)');
    u.addColorStop(FP.MOUTH.x / W, 'rgba(0,0,0,0.85)');
    u.addColorStop(1, 'rgba(0,0,0,0.5)');
    c.fillStyle = u;
    c.fillRect(0, 0, W, h);
  });
}

/** A warm band of light low in the sky round the sun (screen), widest along the horizon. */
function horizonWarm(sc: Phaser.Scene): string {
  return tex(sc, 'end_horizon', 512, 256, (c) => {
    c.translate(256, 128);
    c.scale(1, 0.36);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 256);
    g.addColorStop(0, 'rgba(255,214,150,0.85)');
    g.addColorStop(0.3, 'rgba(255,170,120,0.42)');
    g.addColorStop(0.65, 'rgba(240,140,130,0.14)');
    g.addColorStop(1, 'rgba(240,140,130,0)');
    c.fillStyle = g;
    c.fillRect(-256, -256 / 0.36, 512, 512 / 0.36);
  });
}

/** The sun: a hot halo and a disc with a soft limb (the kit's sun, painted once). */
function sunTex(sc: Phaser.Scene): string {
  return tex(sc, 'end_sun', 320, 320, (c) => paintSun(c, 160, 160, 34, { disc: '#fff6e0', glow: '#ffc27a', a: 0.9, bloom: 4.2 }));
}

/** One soft beam: bright and narrow at its root, widening and fading along its length (rays from the sun and the
 * oven's mouth are made of it, turned and stretched). */
function beamTex(sc: Phaser.Scene): string {
  return tex(sc, 'end_beam', 512, 96, (c) => {
    const [m, mc] = makeCanvas(512, 96);
    // the wedge, soft on both sides
    for (let i = 0; i < 24; i++) {
      const k = i / 23;
      const half = 2 + k * 44;
      mc.fillStyle = `rgba(255,255,255,${0.9 * (1 - k) ** 1.4})`;
      mc.fillRect(k * 512, 48 - half, 512 / 23 + 1, half * 2);
    }
    c.filter = 'blur(10px)';
    c.drawImage(m, 0, 0);
    c.filter = 'none';
  });
}

/** The soft contact shadow under a marching foot. */
function shadowTex(sc: Phaser.Scene): string {
  return tex(sc, 'end_shadow', 160, 48, (c) => {
    c.translate(80, 24);
    c.scale(1, 0.3);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 78);
    g.addColorStop(0, 'rgba(16,8,4,0.85)');
    g.addColorStop(0.45, 'rgba(16,8,4,0.55)');
    g.addColorStop(1, 'rgba(20,10,6,0)');
    c.fillStyle = g;
    c.fillRect(-80, -80 / 0.3, 160, 160 / 0.3);
  });
}

/** A bright diagonal band, swept across a title through a mask of its letters (the shine). */
function glintTex(sc: Phaser.Scene): string {
  return tex(sc, 'end_glint', 220, 300, (c) => {
    const g = c.createLinearGradient(0, 0, 220, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.42, 'rgba(255,252,230,0.55)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.58, 'rgba(255,252,230,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 220, 300);
  });
}

/** The dark band the credits roll over: feathered on every edge, deepest in the middle, so it never reads as a box. */
function plateTex(sc: Phaser.Scene): string {
  const w = 1640;
  const h = CREDITS_BOTTOM - CREDITS_TOP + 120;
  return tex(sc, 'end_plate', w / 4, h / 4, (c) => {
    c.scale(0.25, 0.25);
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(14,8,20,0)');
    g.addColorStop(0.16, 'rgba(14,8,20,0.42)');
    g.addColorStop(0.5, 'rgba(14,8,20,0.56)');
    g.addColorStop(0.84, 'rgba(14,8,20,0.42)');
    g.addColorStop(1, 'rgba(14,8,20,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'destination-in';
    const v = c.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(0.2, 'rgba(0,0,0,0.85)');
    v.addColorStop(0.5, 'rgba(0,0,0,1)');
    v.addColorStop(0.8, 'rgba(0,0,0,0.85)');
    v.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = v;
    c.fillRect(0, 0, w, h);
  });
}

/** A thin gold rule that fades out at its far end (section heads have one each side). */
function ruleTex(sc: Phaser.Scene): string {
  return tex(sc, 'end_rule', 240, 8, (c) => {
    const g = c.createLinearGradient(0, 0, 240, 0);
    g.addColorStop(0, 'rgba(255,214,120,0)');
    g.addColorStop(1, 'rgba(255,214,120,0.9)');
    c.fillStyle = g;
    c.fillRect(0, 3, 240, 2);
    c.fillStyle = 'rgba(255,240,200,0.9)';
    c.beginPath();
    c.moveTo(232, 4);
    c.lineTo(236, 0);
    c.lineTo(240, 4);
    c.lineTo(236, 8);
    c.closePath();
    c.fill();
  });
}

/** An act's pennant: a swallowtailed cloth with a stitched gold border, the act in small caps over its name. */
const PENNANT_COLS = ['#a8322a', '#2f5fa8', '#3c8a4a', '#8a3c9a', '#c0702a', '#2a7f8a', '#b0306a', '#4a4ab0', '#7a8a2a', '#c0942a'];
const FLAG_W = 340;
const FLAG_H = 132;

function pennantTex(sc: Phaser.Scene, act: number): string {
  return tex(sc, `end_pennant_${act}`, FLAG_W, FLAG_H, (c) => {
    const col = PENNANT_COLS[(act - 1) % PENNANT_COLS.length];
    const notch = 46;
    const path = () => {
      c.beginPath();
      c.moveTo(0, 4);
      c.lineTo(FLAG_W - 2, 4);
      c.lineTo(FLAG_W - notch, FLAG_H / 2);
      c.lineTo(FLAG_W - 2, FLAG_H - 4);
      c.lineTo(0, FLAG_H - 4);
      c.closePath();
    };
    path();
    // the cloth: lit from the top left, a darker hem, soft folds running along it
    const g = c.createLinearGradient(0, 0, FLAG_W * 0.4, FLAG_H);
    g.addColorStop(0, mixHex(col, '#ffffff', 0.22));
    g.addColorStop(0.55, col);
    g.addColorStop(1, mixHex(col, '#000000', 0.38));
    c.fillStyle = g;
    c.fill();
    c.save();
    path();
    c.clip();
    for (let i = 0; i < 6; i++) {
      const x = 30 + i * 52;
      const f = c.createLinearGradient(x - 26, 0, x + 26, 0);
      f.addColorStop(0, 'rgba(0,0,0,0)');
      f.addColorStop(0.5, i % 2 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)');
      f.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = f;
      c.fillRect(x - 26, 0, 52, FLAG_H);
    }
    // the weave
    c.fillStyle = 'rgba(255,255,255,0.035)';
    for (let y = 6; y < FLAG_H; y += 4) c.fillRect(0, y, FLAG_W, 1);
    c.restore();
    // a stitched gold border just inside the edge, and the edge itself
    c.save();
    c.translate(0, 0);
    c.setLineDash([7, 5]);
    c.lineWidth = 2.5;
    c.strokeStyle = 'rgba(255,214,120,0.95)';
    c.beginPath();
    c.moveTo(10, 14);
    c.lineTo(FLAG_W - 24, 14);
    c.lineTo(FLAG_W - notch - 12, FLAG_H / 2);
    c.lineTo(FLAG_W - 24, FLAG_H - 14);
    c.lineTo(10, FLAG_H - 14);
    c.stroke();
    c.restore();
    path();
    c.lineWidth = 3;
    c.strokeStyle = mixHex(col, '#000000', 0.55);
    c.stroke();
    // the sleeve the pole runs through
    const s = c.createLinearGradient(0, 0, 18, 0);
    s.addColorStop(0, mixHex(col, '#000000', 0.45));
    s.addColorStop(0.6, mixHex(col, '#ffffff', 0.1));
    s.addColorStop(1, mixHex(col, '#000000', 0.3));
    c.fillStyle = s;
    c.fillRect(0, 4, 16, FLAG_H - 8);
    // the words
    const cx = 18 + (FLAG_W - notch - 18) / 2;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 21px ${BODY}`;
    spaced(c, `ACT ${roman(act)}`, cx, 40, 5, '#ffe2a0', 'rgba(40,14,6,0.8)');
    const name = (ACTS[act - 1]?.name ?? '').toUpperCase();
    let size = 40;
    c.font = `400 ${size}px ${DISPLAY}`;
    while (c.measureText(name).width > FLAG_W - notch - 50 && size > 22) c.font = `400 ${--size}px ${DISPLAY}`;
    c.lineJoin = 'round';
    c.lineWidth = 7;
    c.strokeStyle = 'rgba(36,12,6,0.9)';
    c.strokeText(name, cx, 84);
    c.fillStyle = '#fff4dc';
    c.fillText(name, cx, 84);
  });
}

/** The pennant's pole: turned wood lit from the left, a gilt finial on top. */
function poleTex(sc: Phaser.Scene): string {
  return tex(sc, 'end_pole', 30, 420, (c) => {
    const g = c.createLinearGradient(7, 0, 23, 0);
    g.addColorStop(0, '#5a3418');
    g.addColorStop(0.3, '#c08a52');
    g.addColorStop(0.6, '#8a5a2e');
    g.addColorStop(1, '#3a200e');
    c.fillStyle = g;
    c.fillRect(8, 26, 14, 394);
    c.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = 60; y < 420; y += 37) c.fillRect(8, y, 14, 2);
    const b = c.createRadialGradient(11, 12, 1, 15, 16, 14);
    b.addColorStop(0, '#fff6c0');
    b.addColorStop(0.4, '#e8b440');
    b.addColorStop(1, '#7a4a10');
    c.fillStyle = b;
    c.beginPath();
    c.arc(15, 16, 13, 0, Math.PI * 2);
    c.fill();
  });
}

/** Letter-spaced text on a canvas (small caps labels), centred on x. */
function spaced(c: CanvasRenderingContext2D, s: string, x: number, y: number, ls: number, fill: string, stroke?: string): void {
  const ws = [...s].map((ch) => c.measureText(ch).width);
  const total = ws.reduce((a, b) => a + b, 0) + ls * (s.length - 1);
  let px = x - total / 2;
  c.save();
  c.textAlign = 'left';
  c.lineJoin = 'round';
  [...s].forEach((ch, i) => {
    if (stroke) {
      c.lineWidth = 5;
      c.strokeStyle = stroke;
      c.strokeText(ch, px, y);
    }
    c.fillStyle = fill;
    c.fillText(ch, px, y);
    px += ws[i] + ls;
  });
  c.restore();
}

function mixHex(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
}

/** The Pizza Legend card: a gilt frame with a bevel lit from the top left, studs at the corners, a dark walnut panel. */
function cardTex(sc: Phaser.Scene): string {
  const w = 1120;
  const h = 450;
  return tex(sc, 'end_card', w + 60, h + 60, (c) => {
    c.translate(30, 26);
    const rr = (x: number, y: number, ww: number, hh: number, r: number) => {
      c.beginPath();
      c.roundRect(x, y, ww, hh, r);
    };
    // its shadow
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.55)';
    c.shadowBlur = 26;
    c.shadowOffsetY = 10;
    rr(0, 0, w, h, 46);
    c.fillStyle = '#6a4210';
    c.fill();
    c.restore();
    // the gilt frame
    const g = c.createLinearGradient(0, 0, w * 0.35, h * 1.2);
    g.addColorStop(0, '#fff4b8');
    g.addColorStop(0.25, '#f2c24a');
    g.addColorStop(0.6, '#c88a1e');
    g.addColorStop(1, '#7a4a0c');
    rr(0, 0, w, h, 46);
    c.fillStyle = g;
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = '#4a2a06';
    c.stroke();
    // its bevel: a light lip top left, a dark one bottom right
    rr(9, 9, w - 18, h - 18, 38);
    c.lineWidth = 4;
    const bv = c.createLinearGradient(0, 0, w, h);
    bv.addColorStop(0, 'rgba(255,255,230,0.9)');
    bv.addColorStop(0.5, 'rgba(255,230,160,0.2)');
    bv.addColorStop(1, 'rgba(60,30,0,0.6)');
    c.strokeStyle = bv;
    c.stroke();
    // the panel, set in
    rr(30, 30, w - 60, h - 60, 28);
    const p = c.createRadialGradient(w / 2, h * 0.42, 40, w / 2, h / 2, w * 0.62);
    p.addColorStop(0, '#4a2c18');
    p.addColorStop(0.6, '#2e1a0e');
    p.addColorStop(1, '#180c06');
    c.fillStyle = p;
    c.fill();
    c.save();
    c.clip();
    // walnut grain, faint
    c.strokeStyle = 'rgba(255,200,150,0.05)';
    c.lineWidth = 2;
    for (let i = 0; i < 26; i++) {
      const y = 40 + i * 15;
      c.beginPath();
      c.moveTo(30, y);
      for (let x = 30; x <= w - 30; x += 40) c.lineTo(x, y + Math.sin(x * 0.012 + i) * 4);
      c.stroke();
    }
    // the frame's shadow falling on it, top and left
    const sh = c.createLinearGradient(0, 30, 0, 80);
    sh.addColorStop(0, 'rgba(0,0,0,0.5)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sh;
    c.fillRect(30, 30, w - 60, 50);
    c.restore();
    rr(30, 30, w - 60, h - 60, 28);
    c.lineWidth = 3;
    c.strokeStyle = 'rgba(255,236,170,0.75)';
    c.stroke();
    // studs at the corners
    for (const [x, y] of [[54, 54], [w - 54, 54], [54, h - 54], [w - 54, h - 54]]) {
      const s = c.createRadialGradient(x - 3, y - 3, 1, x, y, 10);
      s.addColorStop(0, '#fffbe0');
      s.addColorStop(0.45, '#f0bc40');
      s.addColorStop(1, '#6a3c08');
      c.fillStyle = s;
      c.beginPath();
      c.arc(x, y, 9, 0, Math.PI * 2);
      c.fill();
    }
  });
}

// ——— the credits ———

interface Cred {
  file: string;
  title: string;
  author: string;
  license: string;
  notes?: string;
}

type Style = 'big' | 'head' | 'role' | 'name' | 'title' | 'sub' | 'lic' | 'you';

interface StyleDef {
  font: string;
  weight: number;
  size: number;
  color: string;
  stroke: number;
  ls: number;
  upper?: boolean;
  /** Line height (× size). */
  lh: number;
}

const BASE: Record<Style, StyleDef> = {
  big: { font: DISPLAY, weight: 400, size: 128, color: '#ffd76a', stroke: 13, ls: 4, lh: 1.05 },
  head: { font: DISPLAY, weight: 400, size: 54, color: '#ffe7a0', stroke: 10, ls: 6, upper: true, lh: 1.15 },
  role: { font: BODY, weight: 700, size: 22, color: '#ffc98e', stroke: 5, ls: 5, upper: true, lh: 1.45 },
  name: { font: DISPLAY, weight: 400, size: 40, color: '#fff4e0', stroke: 7, ls: 1, lh: 1.18 },
  title: { font: DISPLAY, weight: 400, size: 32, color: '#fff4e0', stroke: 6, ls: 1, lh: 1.15 },
  sub: { font: BODY, weight: 600, size: 23, color: '#f4e4cc', stroke: 5, ls: 0.5, lh: 1.3 },
  lic: { font: BODY, weight: 700, size: 20, color: '#e0c8a6', stroke: 4, ls: 3, upper: true, lh: 1.4 },
  you: { font: DISPLAY, weight: 400, size: 112, color: '#ffffff', stroke: 13, ls: 8, lh: 1.05 },
};

/** Credits type is set bigger when the game is shown small (a phone), in fewer columns: no line under about 11 px on
 * screen. */
let fontK = 1;
const MIN_PX = 11;
const STYLE = (s: Style): StyleDef => {
  const b = BASE[s];
  // (YOU is big enough as it is: scaled up with the rest, the coda wouldn't fit the band on a phone)
  return fontK === 1 || s === 'you' ? b : { ...b, size: Math.round(b.size * fontK), stroke: Math.round(b.stroke * fontK), ls: b.ls * fontK };
};

interface Line {
  text: string;
  s: Style;
  /** At most this many lines (the last one cut with an ellipsis). */
  max?: number;
}
/** A cell of a credits row: lines centred on x, wrapped to w. */
interface Cell {
  x: number;
  lines: Line[];
  h: number;
}
interface Row {
  y: number;
  h: number;
  cells: Cell[];
  /** Section head: gold rules either side. */
  rule?: number;
  objs?: Phaser.GameObjects.GameObject[];
}

let measureCtx: CanvasRenderingContext2D | null = null;
function measure(s: string, st: StyleDef): number {
  measureCtx ??= makeCanvas(8, 8)[1];
  measureCtx.font = `${st.weight} ${st.size}px ${st.font}`;
  return measureCtx.measureText(s).width + st.ls * Math.max(0, s.length - 1) + st.stroke;
}

/** Wrap a line to a width (greedy, on spaces; a word too long for the width is cut), at most line.max lines. */
function wrap(line: Line, w: number): Line[] {
  const st = STYLE(line.s);
  const text = st.upper ? line.text.toUpperCase() : line.text;
  if (measure(text, st) <= w) return [{ text, s: line.s }];
  const out: string[] = [];
  let cur = '';
  for (const word of text.split(' ')) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && measure(next, st) > w) {
      out.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) out.push(cur);
  const max = line.max ?? 99;
  if (out.length > max) {
    out.length = max;
    out[max - 1] += '…';
  }
  // (a single word wider than the column, or the line the ellipsis made too long: cut to fit)
  const fit = out.map((l) => {
    let t = l;
    while (t.length > 2 && measure(t, st) > w) t = `${t.replace(/…$/, '').slice(0, -2).trimEnd()}…`;
    return t;
  });
  return fit.map((t) => ({ text: t, s: line.s }));
}

function cellOf(x: number, w: number, lines: Line[]): Cell {
  const ls = lines.flatMap((l) => wrap(l, w));
  return { x, lines: ls, h: ls.reduce((a, l) => a + STYLE(l.s).size * STYLE(l.s).lh, 0) };
}

/** Where a track plays, from the game's own tables (nothing guessed: tracks it can't place get no label). */
function whereLabel(file: string): string {
  const key = file.replace(/\.mp3$/, '');
  const boss = key.match(/^music_boss_(\w+)$/);
  if (boss) return FOOT_BY_ID[boss[1]]?.name ?? '';
  const table = key.startsWith('ambience_') ? LOCATION_AMBIENCE : LOCATION_MUSIC;
  for (const [loc, keys] of Object.entries(table) as [LocationId, string[]][]) if (keys[0] === key) return BACKDROPS[loc as BackdropId]?.name ?? '';
  const special: Record<string, string> = {
    music_menu: 'The menu',
    music_boss: 'Boss fights',
    music_gameover: 'Game over',
    music_victory: 'Victory',
    music_act: 'Act complete',
    music_ending: 'The ending',
    music_heartbeat: 'The Last Slice',
  };
  return special[key] ?? '';
}

const licence = (l: string): string => l.replace(/^CC-BY/, 'CC BY');
/** A track's title as credited: quoted, unless it's a description rather than a name (a sound made for the game). */
const titled = (t: string): string => (/^Original synthesi[sz]ed \w+$/i.test(t) ? t : `“${t}”`);

async function loadCredits(): Promise<Cred[]> {
  try {
    return (await (await fetch('audio/credits.json')).json()) as Cred[];
  } catch {
    return [];
  }
}

/** The credits laid out as rows (y from the top of the roll), ready to be made as they scroll into the band. */
function layoutCredits(items: Cred[], stars: { feet: number; bosses: number }): { rows: Row[]; height: number; coda: number } {
  const rows: Row[] = [];
  let y = 0;
  const small = fontK > 1;
  const colW = small ? 720 : 470;
  const cols = small ? 2 : 3;
  const one = (lines: Line[], gap = 0, w = small ? 1560 : 1200) => {
    const c = cellOf(W / 2, w, lines);
    rows.push({ y, h: c.h, cells: [c] });
    y += c.h + gap;
  };
  const head = (text: string) => {
    y += 30;
    const c = cellOf(W / 2, 1500, [{ text, s: 'head' }]);
    rows.push({ y, h: c.h, cells: [c], rule: measure(text.toUpperCase(), STYLE('head')) });
    y += c.h + 22;
  };
  const grid = (blocks: Line[][], n = cols, w = colW, gap = 30) => {
    const cols = n;
    const span = (w + 40) * (cols - 1);
    for (let i = 0; i < blocks.length; i += cols) {
      const chunk = blocks.slice(i, i + cols);
      // a short last row stays centred
      const x0 = W / 2 - ((chunk.length - 1) * (w + 40)) / 2;
      const cells = chunk.map((b, j) => cellOf(chunk.length === cols ? W / 2 - span / 2 + j * (w + 40) : x0 + j * (w + 40), w, b));
      const h = Math.max(...cells.map((c) => c.h));
      rows.push({ y, h, cells });
      y += h + gap;
    }
  };

  /** A track's block: where it plays (a blank of the same height when the game can't say, so a row's titles line up),
   * its title on two lines at most, its author, its licence. */
  const track = (c: Cred): Line[] => [{ text: whereLabel(c.file) || ' ', s: 'role', max: 1 }, { text: titled(c.title), s: 'title', max: 2 }, { text: c.author, s: 'sub', max: 2 }, { text: licence(c.license), s: 'lic', max: 1 }];

  one([{ text: 'FEETZA', s: 'big' }], 70);
  one([{ text: 'Design, code and every piece of art', s: 'role' }, { text: 'Made for Feetza, by hand and by canvas', s: 'name' }], 80);
  const tally = [stars.feet ? `${stars.feet} ${stars.feet === 1 ? 'foot' : 'feet'}` : '', stars.bosses ? `${stars.bosses} ${stars.bosses === 1 ? 'boss' : 'bosses'} beaten` : ''].filter(Boolean).join(' · ');
  one([{ text: 'Starring', s: 'role' }, { text: 'Every foot you ever smacked', s: 'name' }, ...(tally ? [{ text: tally, s: 'sub' as Style }] : [])], 70);

  const music = items.filter((c) => c.file.startsWith('music_'));
  if (music.length) {
    head('Music');
    if (music.some((c) => /BY/.test(c.license))) one([{ text: 'Licensed under Creative Commons: By Attribution 4.0 License', s: 'sub' }, { text: 'creativecommons.org/licenses/by/4.0', s: 'lic' }], 46);
    grid(music.map(track), cols, colW, 30);
    y += 40;
  }
  const amb = items.filter((c) => c.file.startsWith('ambience_'));
  if (amb.length) {
    head('Ambience');
    grid(amb.map(track), cols, colW, 30);
    y += 40;
  }
  const sfx = items.filter((c) => c.file.startsWith('sfx_'));
  if (sfx.length) {
    head('Sound effects');
    // attribution for every sound used under CC BY (one block per source)
    const by = new Map<string, Cred>();
    for (const c of sfx) if (/BY/.test(c.license)) by.set(`${c.title}|${c.author}`, c);
    if (by.size) {
      one([{ text: 'Used under Creative Commons: By Attribution 4.0', s: 'role' }], 14);
      grid([...by.values()].map((c) => [{ text: titled(c.title), s: 'title', max: 2 }, { text: c.author, s: 'sub', max: 2 }, { text: licence(c.license), s: 'lic', max: 1 }]), cols, colW);
      y += 30;
    }
    const n = (re: RegExp) => sfx.filter((c) => re.test(c.author)).length;
    const kenney = n(/Kenney/);
    if (kenney) one([{ text: 'Public domain (CC0) sound packs', s: 'role' }, { text: 'Kenney (kenney.nl)', s: 'name' }], 50);
    // everyone on freesound.org whose CC0 recordings are in the game (named as authors, or in a file's notes as a
    // layered source)
    const names = new Set<string>();
    for (const c of [...sfx, ...amb]) {
      const m = c.author.match(/^(.+) \(freesound\.org\)$/);
      if (m && !/BY/.test(c.license)) names.add(m[1]);
      for (const k of (c.notes ?? '').matchAll(/ by ([A-Za-z0-9_.-]+), https:\/\/freesound\.org/g)) names.add(k[1]);
    }
    for (const c of by.values()) names.delete(c.author.replace(/ \(freesound\.org\)$/, ''));
    if (names.size) {
      one([{ text: 'Public domain (CC0) recordings by', s: 'role' }, { text: 'freesound.org contributors', s: 'name' }], 18);
      const list = [...names].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      grid(list.map((nm) => [{ text: nm, s: 'sub', max: 1 }]), small ? 3 : 4, small ? 500 : 340, 4);
      y += 40;
    }
    if (n(/Made for Feetza/)) one([{ text: 'Synthesised, layered and mixed', s: 'role' }, { text: 'Made for Feetza', s: 'name' }], 50);
  }
  head('Fonts');
  one([{ text: 'Lilita One & Fredoka', s: 'name' }, { text: 'SIL Open Font License', s: 'lic' }], 120);
  // the coda (AND STARRING / YOU / Thanks for playing) stops in the middle of the band
  const coda = y;
  one([{ text: 'And starring', s: 'role' }], 0);
  one([{ text: 'YOU', s: 'you' }], 16);
  one([{ text: 'Thanks for playing', s: 'name' }], 0);
  return { rows, height: y, coda };
}

/** A soft drop shadow under a text, with the text's canvas padded so the blur isn't cut off at its edges (a box). */
function softShadow<T extends Phaser.GameObjects.Text>(t: T, dy: number, col: string, blur: number): T {
  const pad = Math.ceil(blur * 1.6 + Math.abs(dy));
  t.setPadding(pad, pad, pad, pad);
  return t.setShadow(0, dy, col, blur, true, true);
}

function makeLine(sc: Phaser.Scene, l: Line, x: number, y: number): Txt {
  const st = STYLE(l.s);
  const t = sc.add
    .text(x, y, l.text, { fontFamily: st.font, fontStyle: st.weight >= 600 ? String(st.weight) : 'normal', fontSize: `${st.size}px`, color: st.color, stroke: '#1c0c06', strokeThickness: st.stroke, align: 'center' })
    .setLetterSpacing(st.ls);
  softShadow(t, Math.max(2, st.size / 14), 'rgba(10,4,2,0.6)', Math.max(4, st.size / 6));
  // (top-centred on its line, the padding left out)
  return t.setOrigin(0.5, (t.padding.top ?? 0) / t.height);
}

// ——— the parade ———

interface Marcher {
  kind: 'foot' | 'pennant';
  /** Position along the parade (its screen x = the parade's x + x0). */
  x0: number;
  c: Box;
  shadow?: Img;
  body?: Img;
  /** The foot's display scale (before squash). */
  s?: number;
  /** Its height on screen (px), and its width. */
  h: number;
  w: number;
  label?: Box;
  f?: FootType;
  big: 0 | 1 | 2;
  // the step
  ph: number;
  rate: number;
  hop: number;
  squash: number;
  side: number;
  steps: number;
  // a moment (a wave, a mini-boss's leap and bow, a boss's stop)
  act: 'none' | 'wave' | 'mini' | 'boss';
  actT: number;
  done: boolean;
  quipped: boolean;
  landed: boolean;
  // the pennant
  rope?: Phaser.GameObjects.Rope;
  flag?: Img;
  pole?: Img;
  act0?: number;
}

/** A segment of the parade's march: moving from p0 to p1 (easing in/out next to a boss's stop), or holding still. */
interface Seg {
  t0: number;
  t1: number;
  p0: number;
  p1: number;
  ein: number;
  eout: number;
  v: number;
  hold?: Marcher;
}

function moveSeg(t0: number, p0: number, p1: number, v: number, ein: boolean, eout: boolean, ramp: number): Seg {
  const d = p0 - p1;
  let tin = ein ? ramp : 0;
  let tout = eout ? ramp : 0;
  const dr = 0.5 * v * (tin + tout);
  if (dr > d && dr > 0) {
    tin *= d / dr;
    tout *= d / dr;
  }
  const dc = d - 0.5 * v * (tin + tout);
  return { t0, t1: t0 + tin + dc / v + tout, p0, p1, ein: tin, eout: tout, v };
}

function segPos(s: Seg, t: number): number {
  if (s.hold) return s.p0;
  const u = Math.max(0, Math.min(s.t1 - s.t0, t - s.t0));
  const v = s.v;
  const cruise = s.t1 - s.t0 - s.ein - s.eout;
  let d: number;
  if (u < s.ein) d = (0.5 * v * u * u) / s.ein;
  else if (u < s.ein + cruise) d = 0.5 * v * s.ein + v * (u - s.ein);
  else {
    const w = u - s.ein - cruise;
    d = 0.5 * v * s.ein + v * cruise + v * w - (0.5 * v * w * w) / Math.max(1e-6, s.eout);
  }
  return s.p0 - d;
}

/** A foot's voice for its moment: its own entrance, roar or laugh if it has one. */
function voiceOf(id: string): string | null {
  for (const m of ['enter', 'roar', 'howl', 'bellow', 'laugh', 'growl', 'warcry']) if (audio.has(`sfx_${id}_${m}`)) return `sfx_${id}_${m}`;
  return null;
}

/** A foot's line for its moment: its own shortest quip. */
function quipOf(f: FootType): string | null {
  const q = (f.quips ?? []).filter((s) => s.length <= 44);
  if (!q.length) return null;
  return q.reduce((a, b) => (b.length < a.length ? b : a));
}

/** A foot's pose in its moment: lifted by y, squashed by q (stretched below 0), turned by rot, scaled by k (nearer),
 * and turn (its width, for a pirouette: 1 facing out, −1 mirrored half way round). */
interface Pose {
  y: number;
  q: number;
  rot: number;
  k: number;
  turn: number;
  end: boolean;
}

// ——— the ending ———

export interface EndingOpts {
  /** Dev (F.ending): play it without saving the title or Endless+. */
  preview?: boolean;
  /** Dev: march every foot of the journey, as if all had been fought. */
  all?: boolean;
}

export function playEnding(sc: Phaser.Scene, done: () => void, o: EndingOpts = {}): void {
  const firstTime = !save.legend;
  if (!o.preview) {
    save.legend = true;
    save.endlessPlus = true;
    persist();
  }
  ui.showHud(false);
  const calm = reduced();
  const root = sc.add.container(0, 0).setDepth(9000);
  let finished = false;
  let live: LiveScene | null = null;
  let tick: (() => void) | null = null;
  const finish = () => {
    if (finished) return;
    finished = true;
    sc.tweens.add({
      targets: root,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        root.destroy(true);
        ui.showHud(true);
        done();
      },
    });
  };
  root.once('destroy', () => {
    if (tick) sc.events.off('update', tick);
    live?.destroy();
    live = null;
  });

  // ——— the light swells to white (the anticipation), holds while the place is built under it ———
  const white = sc.add.rectangle(W / 2, H / 2, W, H, 0xfffaf0, 1).setAlpha(0);
  const bloom = sc.add.image(W / 2, H / 2 - 60, 'glow').setTint(0xfff2c8).setBlendMode(ADD).setScale(1).setAlpha(0);
  root.add([bloom, white]);
  sc.tweens.add({ targets: bloom, alpha: 1, scale: 14, duration: 520, ease: 'Quad.In' });
  // (the credits are fetched meanwhile: under the white, the place, the parade and the credits are all laid out at once)
  let credits: Cred[] | null = null;
  const credits$ = loadCredits();
  void credits$.then((c) => (credits = c));
  sc.tweens.add({
    targets: white,
    alpha: 1,
    duration: 480,
    delay: 120,
    ease: 'Quad.In',
    onComplete: () => {
      // (waits for them a little longer if it must, up to a second, still under the white)
      let waited = 0;
      const go = () => (credits || waited >= 1000 ? build() : ((waited += 50), sc.time.delayedCall(50, go)));
      sc.time.delayedCall(40, go);
    },
  });
  audio.stop('music', 800);
  audio.sfx('sfx_finale_peelwall', { volume: 0.5, rate: 0.75 });

  function build(): void {
    if (finished || !root.active) return;
    // ——— the First Pizzeria at sunrise: its own live layer when stages are animated, its still when not ———
    const stage = sc.add.container(0, 0);
    root.addAt(stage, 0);
    // shown small (a phone): bigger labels and credits type
    // (CSS px per game px: the smallest credits line, 20 game px, must come out at MIN_PX or more)
    const k = Math.max(1, MIN_PX / ((sc.scale.displaySize.width / W) * 20));
    const small = k > 1.05;
    const liveLayer = sc.add.container(0, 0);
    let base: string | null = null;
    if (backdropsAnimated()) live = startLive('firstpizzeria', { sc, layer: liveLayer, wave: 3, setBase: (k) => (base = k) });
    const baseImg = sc.add.image(W / 2, H / 2, base ?? ensureBackdrop(sc, 'firstpizzeria')).setDisplaySize(W, H);
    // the morning over its night sky, the sun's warmth along the horizon, under the live layer (the smoke, the plume
    // and the birds stay over it)
    const gold = sc.add.image(W / 2, 0, goldSky(sc)).setOrigin(0.5, 0).setDisplaySize(W, FP.HOR + 12).setAlpha(0);
    const blue = sc.add.image(W / 2, 0, blueSky(sc)).setOrigin(0.5, 0).setDisplaySize(W, FP.HOR + 12).setAlpha(0);
    const warmBand = sc.add.image(FP.SUN.x, FP.HOR - 10, horizonWarm(sc)).setBlendMode(Phaser.BlendModes.SCREEN).setDisplaySize(2600, 700).setAlpha(0.35);
    // the sun, rising out of the far range (masked to the sky above its ridge) with its rays turning slowly
    const skyMask = sc.make.graphics({}, false);
    skyMask.fillStyle(0xffffff, 1).beginPath().moveTo(0, 0).lineTo(W, 0);
    const ridge = [...FP.FAR_RANGE].sort((a, b) => b[0] - a[0]);
    for (const [x, y] of ridge) skyMask.lineTo(Math.max(0, Math.min(W, x)), y + 3);
    skyMask.lineTo(0, ridge[ridge.length - 1]?.[1] ?? FP.HOR).closePath().fillPath();
    const sunC = sc.add.container(0, 0);
    sunC.setMask(skyMask.createGeometryMask());
    const sunRays: Img[] = [];
    const beam = beamTex(sc);
    for (let i = 0; i < 11; i++) sunRays.push(sc.add.image(FP.SUN.x, FP.HOR, beam).setOrigin(0, 0.5).setBlendMode(ADD).setTint(0xffd6a0).setAlpha(0));
    const sunHalo = sc.add.image(FP.SUN.x, FP.HOR + 40, 'glow').setTint(0xffb468).setBlendMode(ADD).setScale(5.5, 3.2).setAlpha(0.5);
    const sunDisc = sc.add.image(FP.SUN.x, FP.HOR + 40, sunTex(sc)).setBlendMode(ADD).setTint(0xffc890);
    sunC.add([...sunRays, sunDisc]);
    // the credits' dark band lies over the painted sky only: the sun, the birds and the smoke stay bright over it
    const plate = sc.add.image(W / 2, (CREDITS_TOP + CREDITS_BOTTOM) / 2, plateTex(sc)).setDisplaySize(1640, CREDITS_BOTTOM - CREDITS_TOP + 120).setAlpha(0);
    stage.add([baseImg, gold, blue, warmBand, plate, sunHalo, sunC, liveLayer]);
    // the live layer's stars and morning star, to fade as the sun clears the range (its own dawn only dims them)
    const stars: Img[] = [];
    const findStars = (o: Phaser.GameObjects.GameObject) => {
      const im = o as Img;
      if (im.texture?.key === 'fp_twinkle') stars.push(im);
      const list = (o as Box).list;
      if (list) list.forEach(findStars);
    };
    findStars(liveLayer);
    // (the morning star's glow sits beside its twinkle, in the same container)
    for (const st of [...stars]) for (const o of (st.parentContainer?.list ?? []) as Img[]) if (o.texture?.key === 'glow' && !stars.includes(o)) stars.push(o);
    // the low sun's light across the table, and the oven's glow spilling onto it
    const tableSun = sc.add.image(0, 760, tableLight(sc)).setOrigin(0, 0).setDisplaySize(W, H - 760).setBlendMode(ADD).setAlpha(0);
    const ovenSpill = sc.add.image(FP.MOUTH.x - 120, 800, 'glow').setTint(0xff8a3a).setBlendMode(ADD).setScale(7, 1.3).setAlpha(0);
    // beams from the oven's mouth into the dawn air, motes turning in them
    const mouth = { x: FP.MOUTH.x - 6, y: FP.PLAT - 40 };
    const ovenRays: { img: Img; a: number; ph: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const ang = Math.PI + 0.15 + i * 0.16 + (crand() - 0.5) * 0.05;
      const img = sc.add.image(mouth.x, mouth.y, beam).setOrigin(0, 0.5).setBlendMode(ADD).setTint(0xff9a48).setRotation(ang - Math.PI * 0.08 * (i % 2)).setScale(1.3 + crand() * 0.6, 0.9 + crand() * 0.6).setAlpha(0);
      ovenRays.push({ img, a: 0.2 + crand() * 0.12, ph: crand() * 10 });
    }
    stage.add([tableSun, ovenSpill, ...ovenRays.map((r) => r.img)]);
    const shim = { sc, root: stage } as unknown as KitLive;
    const motes = new Parts(shim, { frame: 'mote', add: true, max: 60 });
    // the whole place in the light: a cool pre-dawn wash lifting, and warmth coming up
    const cool = sc.add.rectangle(W / 2, H / 2, W, H, 0x6a6aa8, 1).setBlendMode(Phaser.BlendModes.MULTIPLY).setAlpha(0.28);
    const warm = sc.add.rectangle(W / 2, H / 2, W, H, 0xffb070, 1).setBlendMode(Phaser.BlendModes.SCREEN).setAlpha(0);
    // the parade's layers (over the place, under the light)
    const parade = sc.add.container(0, 0);
    const shadows = sc.add.container(0, 0);
    const marchers = sc.add.container(0, 0);
    const dustC = sc.add.container(0, 0);
    const talk = sc.add.container(0, 0);
    parade.add([shadows, marchers, dustC]);
    const dust = new Parts({ sc, root: dustC } as unknown as KitLive, { frame: 'puff', max: 120 });
    stage.add([parade, cool, warm, talk]);
    // the credits' band, the titles and the skip button over it all
    const band = sc.add.container(0, 0);
    const titles = sc.add.container(0, 0);
    root.add([band, titles]);
    root.bringToTop(bloom);
    root.bringToTop(white);

    // ——— the reveal: the white opens on the place, with a flare from the sun ———
    sc.tweens.add({ targets: white, alpha: 0, duration: 1250, delay: 420, ease: 'Quad.Out' });
    sc.tweens.add({ targets: bloom, alpha: 0, scale: 6, duration: 1300, delay: 420, ease: 'Sine.Out' });
    const flare = sc.add.image(FP.SUN.x, FP.HOR - 4, 'glow').setTint(0xffe0a8).setBlendMode(ADD).setScale(2, 1).setAlpha(0);
    stage.add(flare);
    sc.tweens.add({ targets: flare, alpha: { from: 0, to: 0.9 }, scaleX: 16, scaleY: 3, duration: 700, delay: 380, yoyo: true, hold: 300, ease: 'Sine.Out', onComplete: () => flare.destroy() });
    // (the light comes off the oven's fire first too: the place reads from its two lights outwards)
    const ovenFlare = sc.add.image(FP.MOUTH.x, FP.PLAT - 50, 'glow').setTint(0xffb060).setBlendMode(ADD).setScale(1.5).setAlpha(0);
    stage.add(ovenFlare);
    sc.tweens.add({ targets: ovenFlare, alpha: { from: 0, to: 0.8 }, scale: 5, duration: 600, delay: 400, yoyo: true, hold: 200, ease: 'Sine.Out', onComplete: () => ovenFlare.destroy() });
    sc.time.delayedCall(450, () => void audio.music(sc, ['music_ending', 'music_victory'], 1500));

    // ——— THE FIRST PIZZERIA / IS YOURS NOW ———
    const title = (txt: string, y: number, size: number, color: string): Txt =>
      softShadow(
        sc.add
          .text(W / 2, y, txt, { fontFamily: DISPLAY, fontSize: `${size}px`, color, stroke: '#2a1408', strokeThickness: Math.round(size / 6.5), align: 'center' })
          .setOrigin(0.5)
          .setLetterSpacing(Math.round(size / 26)),
        Math.round(size / 14),
        'rgba(20,8,2,0.55)',
        Math.round(size / 7),
      );
    const t1 = title('THE FIRST PIZZERIA', 392, 112, '#ffe08a').setAlpha(0).setScale(1.5);
    const t2 = title('IS YOURS NOW', 500, 66, '#ffffff').setAlpha(0).setScale(2.4);
    const halo = sc.add.image(W / 2, 430, 'glow').setTint(0xffc860).setBlendMode(ADD).setScale(2, 0.8).setAlpha(0);
    titles.add([halo, t1, t2]);
    // anticipation: a warm glow gathers where it will land
    sc.tweens.add({ targets: halo, alpha: 0.55, scaleX: 9, scaleY: 2.4, duration: 700, delay: 1000, ease: 'Sine.Out' });
    sc.tweens.add({ targets: t1, alpha: 1, scale: 1, duration: 520, delay: 1350, ease: 'Back.Out' });
    sc.time.delayedCall(1350, () => audio.sfx('sfx_whoosh', { volume: 0.35, rate: 0.8 }));
    // the stamp: IS YOURS NOW lands with a thump that shakes the place (the birds go up, the jars rattle)
    sc.tweens.add({
      targets: t2,
      alpha: 1,
      scale: 1,
      duration: 230,
      delay: 2050,
      ease: 'Quad.In',
      onComplete: () => {
        quake(240, 8);
        live?.impact?.(W / 2, 760, 0.7);
        audio.sfx('sfx_bigfoot_bigstep', { volume: 0.55 });
        sc.tweens.add({ targets: t2, scaleY: 0.86, scaleX: 1.08, duration: 70, yoyo: true, ease: 'Quad.Out' });
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          dust.spawn({ x: W / 2 + Math.cos(a) * 200, y: 520 + Math.sin(a) * 30, vx: Math.cos(a) * 260, vy: Math.sin(a) * 50 - 20, life: 0.8, r0: 10, r1: 30, a: 0.4, tint: 0xfff0d0, drag: 2.4, fade: 0.05 });
        }
      },
    });
    // the flourish: a shine across the gold letters
    sc.time.delayedCall(2600, () => shine(sc, root, t1, t1.x, t1.y, 900));
    // the hold, then up and away
    sc.time.delayedCall(4300, () => {
      sc.tweens.add({ targets: [t1, t2], alpha: 0, y: '-=40', duration: 600, ease: 'Sine.In' });
      sc.tweens.add({ targets: halo, alpha: 0, duration: 700 });
    });

    // ——— skip (any time after the first beat; top right, clear of the credits and the names) ———
    const skip = sc.add
      .text(W - 50, 38, 'SKIP  ▸', { fontFamily: BODY, fontStyle: '700', fontSize: '30px', color: '#fff6e2', stroke: '#1c0c06', strokeThickness: 6 })
      .setOrigin(1, 0.5)
      .setLetterSpacing(4)
      .setAlpha(0)
      .setInteractive({ useHandCursor: true });
    skip.on('pointerdown', () => finish());
    skip.on('pointerover', () => skip.setScale(1.06));
    skip.on('pointerout', () => skip.setScale(1));
    root.add(skip);
    sc.tweens.add({ targets: skip, alpha: 0.85, duration: 400, delay: 1800 });

    // ——— the parade ———
    const cast = o.all ? journeyOrder(FEET.filter((f) => f.minWave <= 100 && !f.summoned)).slice(-PARADE_N) : foughtFeet().slice(-PARADE_N);
    const shadowKey = shadowTex(sc);
    const items: Marcher[] = [];
    let x0 = 0;
    let lastAct = -1;
    // (wider apart on a phone, where the names are set bigger)
    const SPACING = [236, 330, 390].map((v) => Math.round(v * (small ? 1.22 : 1)));
    const labelK = small ? Math.max(1, MIN_PX / ((sc.scale.displaySize.width / W) * 19)) : 1;
    for (const f of cast) {
      const act = actOf(f.minWave);
      if (act !== lastAct) {
        lastAct = act;
        items.push(pennant(act, x0));
        x0 += 400;
      }
      const big = rank(f) as 0 | 1 | 2;
      const m = foot(f, big, x0);
      if (m) {
        items.push(m);
        x0 += SPACING[big];
      }
    }

    function pennant(act: number, at: number): Marcher {
      const c = sc.add.container(0, LANE);
      const pole = sc.add.image(0, 8, poleTex(sc)).setOrigin(0.5, 1).setScale(1, 1.06);
      const key = pennantTex(sc, act);
      const top = -pole.displayHeight + 40;
      const n = 14;
      const pts = Array.from({ length: n }, (_, i) => new Phaser.Math.Vector2((i / (n - 1)) * FLAG_W, 0));
      let rope: Phaser.GameObjects.Rope | undefined;
      let flag: Img | undefined;
      if (sc.renderer.type === Phaser.WEBGL) {
        rope = sc.add.rope(4, top + FLAG_H / 2, key, undefined, pts as unknown as Phaser.Types.Math.Vector2Like[]);
        c.add(rope);
      } else {
        flag = sc.add.image(4, top, key).setOrigin(0, 0);
        c.add(flag);
      }
      const shadow = sc.add.image(0, LANE + 4, shadowKey).setScale(0.5, 0.6).setAlpha(0.5);
      shadows.add(shadow);
      c.addAt(pole, 0);
      marchers.add(c);
      return { kind: 'pennant', x0: at, c, shadow, h: 360, w: FLAG_W, big: 0, ph: crand(), rate: 1.7, hop: 10, squash: 0, side: 1, steps: 0, act: 'none', actT: 0, done: false, quipped: false, landed: false, rope, flag, pole, act0: act };
    }

    function foot(f: FootType, big: 0 | 1 | 2, at: number): Marcher | null {
      // (drawn now if the idle-time warm-up hasn't got to it: src/game/assets.ts)
      const m = ensureFootArt(sc, f.id);
      if (!m) return null;
      const c = sc.add.container(0, LANE);
      const body = sc.add.image(0, 0, m.footKey).setOrigin(0.5, m.originY);
      const tall = body.height * m.originY;
      // as tall as a foot of its kind looks next to the others (bosses the biggest), never into the credits
      const want = big === 2 ? 350 : big === 1 ? 300 : Phaser.Math.Clamp(232 * Math.sqrt(f.scale), 190, 286);
      const s = Math.min(want / tall, (SPACING[big] * 1.18) / body.width);
      body.setScale(s);
      c.add(body);
      const shadow = sc.add.image(0, LANE + 2, shadowKey).setAlpha(0.6);
      shadows.add(shadow);
      // its name under it (bosses and mini-bosses get their billing in small caps over it)
      const label = sc.add.container(0, 24).setScale(labelK);
      // its name on one line, set smaller to fit if it must (two lines only for a name too long even then)
      const room = (SPACING[big] - 20) / labelK;
      const nameSt: StyleDef = { font: BODY, weight: 700, size: big ? 28 : 25, color: '', stroke: 6, ls: 0, lh: 1.15 };
      while (nameSt.size > 19 && measure(f.name, nameSt) > room) nameSt.size--;
      const nameT = sc.add
        .text(0, big ? 24 : 0, f.name, { fontFamily: BODY, fontStyle: '700', fontSize: `${nameSt.size}px`, color: big ? '#ffe08a' : '#fff6e2', stroke: '#1c0c06', strokeThickness: 6, align: 'center', wordWrap: { width: room } })
        .setOrigin(0.5, 0)
        .setShadow(0, 2, 'rgba(10,4,2,0.6)', 3, true, true);
      label.add(nameT);
      if (big) {
        const tag = sc.add.text(0, 0, big === 2 ? 'BOSS' : 'MINI-BOSS', { fontFamily: BODY, fontStyle: '700', fontSize: '19px', color: '#ffc98e', stroke: '#1c0c06', strokeThickness: 5 }).setOrigin(0.5, 0).setLetterSpacing(5);
        label.add(tag);
      }
      c.add(label);
      marchers.add(c);
      const rate = big === 2 ? 1.25 : big === 1 ? 1.45 : 1.6 + crand() * 0.25;
      return {
        kind: 'foot', x0: at, c, shadow, body, s, h: tall * s, w: body.width * s, label, f, big,
        ph: crand(), rate, hop: (big === 2 ? 20 : big === 1 ? 26 : 30) * (calm ? 0.4 : 1), squash: big === 2 ? 0.26 : 0.21, side: crand() < 0.5 ? 1 : -1, steps: 0,
        act: 'none', actT: 0, done: false, quipped: false, landed: false,
      };
    }

    audio.preload(sc, items.flatMap((it) => (it.big && it.f ? [voiceOf(it.f.id)].filter((v): v is string => !!v) : [])).concat(['sfx_bigfoot_bigstep', 'sfx_godreveal', 'sfx_upgrade']));

    // ——— the credits, laid out now (fetched during the white hold), so the march can be paced to end with them ———
    const CR_T = 3.9;
    const ROLL0 = CREDITS_BOTTOM + 30;
    const CODA_HOLD = 2.4;
    const ROLL_V = small ? 175 : 125;
    const layout = (list: Cred[]) => {
      const stars = o.all ? { feet: cast.length, bosses: cast.filter((f) => f.boss).length } : { feet: foughtFeet().length, bosses: save.bossesBeaten.length };
      fontK = small ? k : 1;
      const lay = layoutCredits(list, stars);
      return { lay, stop: (CREDITS_TOP + CREDITS_BOTTOM) / 2 - (lay.coda + lay.height) / 2 };
    };
    const laid = credits ? layout(credits) : null;

    // the march's schedule: in from the right, a stop at the middle for every boss, out on the left; its pace set so its
    // last foot leaves as the credits come to rest (within a brisk and a steady walk)
    const RAMP = 0.55;
    const HOLD = calm ? 2.1 : 2.45;
    const PARADE_T = 3.3;
    const marchD = W + 240 + 260 + (items.length ? items[items.length - 1].x0 : 0);
    const holdsT = items.filter((it) => it.big === 2).length * (HOLD + RAMP);
    const rollEnd = laid ? CR_T + (ROLL0 - laid.stop) / ROLL_V + 0.9 : 0;
    const V = laid ? Phaser.Math.Clamp(marchD / Math.max(1, rollEnd + 0.6 - PARADE_T - holdsT), 360, 560) : 460;
    const segs: Seg[] = [];
    let p = W + 240;
    let t = PARADE_T;
    let eased = false;
    for (const it of items) {
      if (it.big !== 2) continue;
      const at = HOLD_X - it.x0;
      if (at >= p) continue;
      const mv = moveSeg(t, p, at, V, eased, true, RAMP);
      segs.push(mv);
      segs.push({ t0: mv.t1, t1: mv.t1 + HOLD, p0: at, p1: at, ein: 0, eout: 0, v: 0, hold: it });
      t = mv.t1 + HOLD;
      p = at;
      eased = true;
    }
    const lastX = items.length ? items[items.length - 1].x0 : 0;
    const end = -260 - lastX;
    const last = moveSeg(t, p, end, V, eased, false, RAMP);
    segs.push(last);
    const paradeEnd = last.t1;
    const paradeX = (tt: number): number => {
      if (tt <= PARADE_T) return W + 240;
      for (const s of segs) if (tt < s.t1) return segPos(s, tt);
      return end;
    };
    const holdAt = (tt: number): Marcher | undefined => segs.find((s) => s.hold && tt >= s.t0 && tt < s.t1)?.hold;

    // ——— the credits roll ———
    let elapsed = 0;
    let roll: Box | null = null;
    let rows: Row[] = [];
    // the roll: steady, easing to a stop with the coda in the middle of the band (then a hold before the card)
    let rollSeg = moveSeg(CR_T, ROLL0, ROLL0 - 3000, 100, false, true, 1.8);
    let nextRow = 0;
    const live0: Row[] = [];
    const startRoll = (l: { lay: ReturnType<typeof layoutCredits>; stop: number }) => {
      rows = l.lay.rows;
      // a readable pace, slowed to end with the parade when the parade is still the longer
      const dist = ROLL0 - l.stop;
      const speed = Math.min(ROLL_V, dist / Math.max(10, paradeEnd - CR_T - 0.9 - CODA_HOLD));
      rollSeg = moveSeg(CR_T, ROLL0, l.stop, speed, false, true, 1.8);
      roll = sc.add.container(0, ROLL0);
      band.add(roll);
      sc.tweens.add({ targets: plate, alpha: 1, duration: 1000, delay: Math.max(0, (CR_T - 0.6 - elapsed) * 1000) });
    };
    if (laid) startRoll(laid);
    else
      void (credits$ ?? loadCredits()).then((list) => {
        if (!finished && root.active) startRoll(layout(list));
      });
    const rollY = (tt: number): number => segPos(rollSeg, tt);
    const FADE = 40;
    const fadeAt = (y: number): number => Math.min(1, Math.max(0, (y - CREDITS_TOP) / FADE), Math.max(0, (CREDITS_BOTTOM - y) / FADE));
    const showRow = (r: Row) => {
      if (!roll) return;
      const objs: Phaser.GameObjects.GameObject[] = [];
      for (const cell of r.cells) {
        let y = r.y;
        for (const l of cell.lines) {
          if (l.text.trim()) objs.push(makeLine(sc, l, cell.x, y));
          y += STYLE(l.s).size * STYLE(l.s).lh;
        }
      }
      if (r.rule) {
        const rk = ruleTex(sc);
        const cy = r.y + STYLE('head').size * 0.58;
        objs.push(sc.add.image(W / 2 - r.rule / 2 - 26, cy, rk).setOrigin(1, 0.5));
        objs.push(sc.add.image(W / 2 + r.rule / 2 + 26, cy, rk).setOrigin(1, 0.5).setFlipX(true).setOrigin(0, 0.5));
      }
      roll.add(objs);
      r.objs = objs;
      live0.push(r);
    };

    // ——— the place shakes (not the camera: that would uncover the fight still running under the ending) ———
    let quakeT = 0;
    let quakeDur = 1;
    let quakeAmp = 0;
    function quake(ms: number, px: number): void {
      if (calm) px *= 0.3;
      // (a stronger shake takes over; a weaker one doesn't cut a stronger one short)
      if (quakeT <= 0 || px >= quakeAmp * (quakeT / quakeDur)) {
        quakeAmp = px;
        quakeDur = ms / 1000;
        quakeT = quakeDur;
      }
    }
    const shakeStep = (dt: number) => {
      if (quakeT <= 0) return;
      quakeT = Math.max(0, quakeT - dt);
      const a = quakeAmp * (quakeT / quakeDur);
      // zoomed in just enough that the jitter never shows an edge
      const z = 1 + (a * 2.6) / H;
      stage.setScale(z).setPosition((W / 2) * (1 - z) + (crand() - 0.5) * 2 * a, (H / 2) * (1 - z) + (crand() - 0.5) * 2 * a);
      if (quakeT <= 0) stage.setScale(1).setPosition(0, 0);
    };

    // ——— everything moves on one update ———
    let legend = false;
    let dawned = false;
    let lastPx = W + 240;
    let pace = 0;
    const endT = (): number => Math.max(paradeEnd - 1.2, rollSeg.t1 + CODA_HOLD);
    tick = () => {
      if (finished || !root.active) return;
      const dt = Math.min(0.05, sc.game.loop.delta / 1000);
      elapsed += dt;
      const T = elapsed;
      live?.update(dt);
      shakeStep(dt);
      // the place in the light: night going to a gold dawn, then to a pale blue morning by the card
      const day = clamp01(0.12 + 0.88 * clamp01(T / Math.max(24, endT() * 0.85)) ** 0.75);
      if (T > 3 && !dawned) {
        dawned = true;
        live?.setWave?.(4);
      }
      gold.setAlpha(smooth(day / 0.4));
      blue.setAlpha(0.95 * smooth((day - 0.4) / 0.45));
      warmBand.setAlpha(0.35 + 0.45 * Math.sin(Math.min(1, day * 1.6) * Math.PI * 0.5) - 0.2 * smooth((day - 0.6) / 0.4));
      tableSun.setAlpha((0.2 + 0.28 * smooth((day - 0.1) / 0.5)) * smooth(T / 1.5));
      ovenSpill.setAlpha((0.16 + 0.04 * Math.sin(T * 5.3) + 0.03 * Math.sin(T * 8.9)) * smooth(T / 2));
      cool.setAlpha(0.28 * (1 - smooth(T / 14)));
      warm.setAlpha(0.07 * smooth((T - 4) / 20) * (1 - 0.3 * day));
      // the sun climbs out of the range, warm and low, whiter as it rises; its rays turn
      const rise = clamp01(T / Math.max(24, endT())) ** 0.55;
      const out = 1 - smooth((rise - 0.12) / 0.3);
      for (const st of stars) st.setAlpha(st.alpha * out);
      const sy = FP.HOR + 40 - 210 * rise;
      sunDisc.setY(sy).setTint(Phaser.Display.Color.GetColor(255, 200 + 50 * rise, 140 + 100 * rise));
      sunHalo.setY(sy).setAlpha(0.4 + 0.2 * rise).setScale(5.5 + 2 * rise, 3.2 + 1.4 * rise);
      sunRays.forEach((r, i) => {
        const a = -Math.PI * 0.04 - (i / (sunRays.length - 1)) * Math.PI * 0.92 + Math.sin(T * 0.05 + i) * 0.03;
        r.setPosition(FP.SUN.x, sy).setRotation(a).setScale(2.2 + 0.5 * Math.sin(i * 2.1), 1.1 + 0.4 * Math.sin(i * 1.3)).setAlpha((0.11 + 0.06 * Math.sin(T * 0.7 + i * 1.7)) * smooth((T - 1) / 6) * (0.6 + 0.5 * rise));
      });
      // the oven's beams breathe with its fire; motes turn in them
      for (const r of ovenRays) r.img.setAlpha(r.a * (0.75 + 0.25 * Math.sin(T * 1.3 + r.ph)) * smooth((T - 0.5) / 3) * (1 - 0.25 * day));
      if (!calm && crand() < dt * 9) {
        const a = Math.PI + 0.2 + crand() * 1.0;
        const d = 60 + crand() * 520;
        motes.spawn({ x: mouth.x + Math.cos(a) * d, y: mouth.y + Math.sin(a) * d * 0.8, vx: (crand() - 0.5) * 10, vy: -4 - crand() * 8, life: 3 + crand() * 3, r0: 1.4 + crand() * 1.6, a: 0.5 + crand() * 0.4, tint: crand() < 0.5 ? 0xffd090 : 0xfff0c0, fade: 0.3, spin: 0 });
      }
      motes.update(dt);
      // the parade
      const px = paradeX(T);
      // (steps quicken while the parade moves, and slow to marking time while a boss has the floor)
      pace += (clamp01((lastPx - px) / dt / V) - pace) * Math.min(1, dt * 4);
      lastPx = px;
      const hold = holdAt(T);
      for (const it of items) {
        const x = px + it.x0;
        const on = x > -260 && x < W + 260;
        if (it.c.visible !== on) {
          it.c.setVisible(on);
          it.shadow?.setVisible(on);
        }
        if (!on) continue;
        march(it, x, dt, T, hold);
      }
      dust.update(dt);
      // the credits: rows made as they scroll into the band, dropped once they've left it
      if (roll && T > CR_T - 0.5 && !legend) {
        const ry = rollY(Math.max(CR_T, T));
        roll.y = ry;
        while (nextRow < rows.length && ry + rows[nextRow].y < CREDITS_BOTTOM + 30) showRow(rows[nextRow++]);
        for (let i = live0.length - 1; i >= 0; i--) {
          const r = live0[i];
          if (ry + r.y + r.h < CREDITS_TOP - 20) {
            r.objs?.forEach((ob) => ob.destroy());
            r.objs = undefined;
            live0.splice(i, 1);
            continue;
          }
          for (const ob of r.objs ?? []) {
            const g = ob as Txt;
            const k = fadeAt(ry + g.getCenter().y);
            g.setAlpha(k).setVisible(k > 0.01);
          }
        }
      }
      if (!legend && T > endT()) {
        legend = true;
        sc.tweens.add({ targets: plate, alpha: 0, duration: 700 });
        if (roll) sc.tweens.add({ targets: roll, alpha: 0, y: '-=30', duration: 600, ease: 'Sine.In' });
        legendCard(sc, root, firstTime, finish, live, quake);
        // the card is the end: SKIP becomes CONTINUE, over the confetti
        skip.setText('CONTINUE  ▸');
        root.bringToTop(skip);
      }
    };
    sc.events.on('update', tick);
    // (dev: the shot scripts read the timeline)
    if (import.meta.env.DEV) (window as unknown as { __ending?: unknown }).__ending = { t: () => elapsed, end: endT, parade: paradeEnd };

    function march(it: Marcher, x: number, dt: number, T: number, hold: Marcher | undefined): void {
      it.c.x = x;
      if (it.kind === 'pennant') {
        // carried along at a walking bob; the cloth ripples back from the pole, more at its tail
        it.ph += dt * it.rate;
        const bob = -Math.abs(Math.sin(it.ph * Math.PI)) * it.hop;
        it.c.y = LANE + bob;
        it.c.rotation = Math.sin(it.ph * Math.PI) * 0.03;
        if (it.shadow) it.shadow.setPosition(x, LANE + 4);
        if (it.rope) {
          const pts = it.rope.points as unknown as Phaser.Math.Vector2[];
          const amp = calm ? 4 : 9;
          for (let i = 0; i < pts.length; i++) {
            const k = i / (pts.length - 1);
            pts[i].y = Math.sin(T * 5.2 - k * 5.5) * amp * k ** 1.2 + k * 4;
          }
          it.rope.setDirty();
        }
        // a chime as each act's pennant reaches the middle
        if (!it.done && x < W * 0.62) {
          it.done = true;
          audio.sfx('sfx_finale_peelwall', { volume: 0.35, rate: 1.1, throttle: 300 });
        }
        return;
      }
      const body = it.body!;
      const s = it.s!;
      // its moment, when it reaches the middle
      if (!it.done && it.act === 'none') {
        if (it.big === 2 && hold === it) begin(it, 'boss');
        else if (it.big === 1 && x < HOLD_X + 140) begin(it, 'mini');
        else if (it.big === 0 && x < HOLD_X + 30) begin(it, 'wave');
      }
      let y = 0;
      let q = 0;
      let rot = 0;
      let extra = 1;
      let turn = 1;
      if (it.act === 'boss' || it.act === 'mini') {
        it.actT += dt;
        const r = it.act === 'boss' ? bossMoment(it, it.actT, x) : miniMoment(it, it.actT, x);
        y = r.y;
        q = r.q;
        rot = r.rot;
        extra = r.k;
        turn = r.turn;
        if (r.end) {
          it.act = 'none';
          it.done = true;
          it.ph = 0;
        }
      } else {
        // the step: a crouch, a stretch into the air, a waddle to one side, a squash on landing
        const prev = it.ph;
        it.ph += dt * it.rate * (0.7 + 0.5 * pace);
        if (Math.floor(it.ph) !== Math.floor(prev)) land(it, x);
        const ph = it.ph % 1;
        const AIR0 = 0.32;
        if (ph < 0.14) q = it.squash * (1 - ph / 0.14) ** 1.5;
        else if (ph < AIR0) q = it.squash * 0.7 * Math.sin(((ph - 0.14) / (AIR0 - 0.14)) * Math.PI * 0.5);
        if (ph >= AIR0) {
          const a = (ph - AIR0) / (1 - AIR0);
          y = -Math.sin(a * Math.PI) * it.hop;
          q = a < 0.3 ? -0.11 * (1 - a / 0.3) - 0.02 : a > 0.7 ? -0.08 * ((a - 0.7) / 0.3) : -0.02;
          rot = it.side * 0.07 * Math.sin(a * Math.PI) * (calm ? 0.4 : 1);
        }
        if (it.act === 'wave') {
          // a wave as it passes the middle: rocking side to side with a happy bounce, its name popping
          it.actT += dt;
          const k = it.actT / 1.1;
          if (k >= 1) {
            it.act = 'none';
            it.done = true;
          } else {
            rot += Math.sin(it.actT * Math.PI * 2 * 2.6) * 0.16 * Math.sin(k * Math.PI) * (calm ? 0.4 : 1);
            y *= 1 + 0.6 * Math.sin(k * Math.PI);
          }
        }
      }
      body.setScale(s * (1 + q * 0.75) * extra * turn, s * (1 - q) * extra).setRotation(rot).setY(y);
      // the contact shadow tightens and fades as the foot lifts, spreads as it lands
      const air = Math.min(1, -y / 160);
      if (it.shadow) it.shadow.setPosition(x, LANE + 2).setScale((it.w / 104) * (1 + q * 0.9) * (1 - 0.4 * air), 0.8 * (1 + q * 0.6) * (1 - 0.25 * air)).setAlpha(0.95 * (1 - 0.55 * air));
    }

    function land(it: Marcher, x: number): void {
      it.side = -it.side;
      it.steps++;
      if (x < -60 || x > W + 60) return;
      const n = it.big ? 4 : 2;
      for (let i = 0; i < n; i++) {
        const dir = i % 2 ? 1 : -1;
        dust.spawn({ x: x + dir * it.w * (0.3 + crand() * 0.12), y: LANE - 4, vx: dir * (50 + crand() * 60), vy: -12 - crand() * 22, life: 0.55 + crand() * 0.3, r0: 7, r1: 18 + crand() * 10 + it.big * 6, a: 0.5, tint: 0xeadcc4, drag: 2.6, fade: 0.05, spin: (crand() - 0.5) * 2 });
      }
    }

    function begin(it: Marcher, act: Marcher['act']): void {
      it.act = act;
      it.actT = 0;
      if (act === 'wave') {
        it.label && sc.tweens.add({ targets: it.label, scale: it.label.scale * 1.18, duration: 160, yoyo: true, ease: 'Quad.Out' });
        return;
      }
    }

    /** A landing that shakes the place. */
    function bigLand(it: Marcher, x: number, p: number): void {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        dust.spawn({ x: x + Math.cos(a) * it.w * 0.4, y: LANE - 6 + Math.sin(a) * 10, vx: Math.cos(a) * (140 + crand() * 80) * p, vy: Math.sin(a) * 30 - 30 * p, life: 0.8 + crand() * 0.4, r0: 10, r1: 34 + crand() * 14, a: 0.55, tint: 0xeadcc4, drag: 2.2, fade: 0.05, spin: (crand() - 0.5) * 2 });
      }
      quake(220 + 120 * p, 5 + 8 * p);
      live?.impact?.(x, LANE, 0.4 + 0.5 * p);
      audio.sfx('sfx_bigfoot_bigstep', { volume: 0.3 + 0.35 * p, rate: 1.1 - 0.2 * p });
    }

    const talking: (() => void)[] = [];
    function say(it: Marcher, x: number, ms: number): void {
      if (it.quipped) return;
      it.quipped = true;
      const line = quipOf(it.f!);
      if (!line) return;
      const b = bubbleOf(sc, line, it.big === 2 ? 34 : 30);
      // over its shoulder, below the credits' band (its box's top under the band, its tail over the speaker)
      const boxH = b.height - 34;
      const bx = Phaser.Math.Clamp(x + it.w * 0.12 - 20 + b.width / 2, b.width / 2 + 20, W - b.width / 2 - 20);
      b.c.setPosition(bx, Math.max(CREDITS_BOTTOM + 16 + boxH / 2, LANE - it.h - 24 - b.height / 2));
      talk.add(b.c);
      const follow = () => {
        if (!b.c.active) return void sc.events.off('update', follow);
        b.c.x = Phaser.Math.Clamp(it.c.x + it.w * 0.12 - 20 + b.width / 2, b.width / 2 + 20, W - b.width / 2 - 20);
      };
      sc.events.on('update', follow);
      b.c.setScale(0.2).setAngle(-3 + crand() * 6);
      // (one line at a time: a new speaker cuts the last one short, and speaks once it has gone)
      const waiting = talking.length > 0;
      while (talking.length) talking[0]();
      b.c.setVisible(!waiting);
      sc.tweens.add({ targets: b.c, scale: 1, duration: 240, delay: waiting ? 170 : 0, ease: 'Back.Out', onStart: () => b.c.setVisible(true) });
      const gone = () => {
        const i = talking.indexOf(gone);
        if (i < 0) return;
        talking.splice(i, 1);
        sc.tweens.add({ targets: b.c, scale: 0.3, alpha: 0, duration: 150, onComplete: () => {
          sc.events.off('update', follow);
          b.c.destroy();
        } });
      };
      talking.push(gone);
      sc.time.delayedCall(ms, gone);
    }

    /** A boss's stop: it settles, crouches deep, leaps, lands with a quake and its roar and line, then bows. */
    function bossMoment(it: Marcher, u: number, x: number): Pose {
      const CROUCH = 0.42;
      const AIR = 0.62;
      const LAND = CROUCH + AIR;
      let y = 0;
      let q = 0;
      let k = 1;
      let rot = 0;
      const lift = calm ? 60 : 150;
      if (u < CROUCH) q = 0.3 * smooth(u / CROUCH);
      else if (u < LAND) {
        const a = (u - CROUCH) / AIR;
        y = -Math.sin(a * Math.PI) * lift;
        q = a < 0.35 ? -0.18 * (1 - a / 0.35) : a > 0.7 ? -0.12 * ((a - 0.7) / 0.3) : 0;
        k = 1 + 0.06 * Math.sin(a * Math.PI);
      } else {
        if (!it.landed) {
          it.landed = true;
          bigLand(it, x, 1);
          const v = voiceOf(it.f!.id);
          if (v) audio.sfx(v, { volume: 0.8 });
          say(it, x, 2100);
          if (it.label) sc.tweens.add({ targets: it.label, scale: it.label.scale * 1.22, duration: 200, yoyo: true, hold: 500, ease: 'Back.Out' });
        }
        const w = u - LAND;
        // the squash rings out
        q = 0.34 * Math.exp(-w * 7) * Math.cos(w * 22);
        // then the bow: dipping its top towards you, a little nearer
        const b = Math.sin(clamp01((w - 0.55) / 0.85) * Math.PI);
        q += 0.13 * b;
        k = 1 + 0.05 * b;
        y += 6 * b;
      }
      return { y, q, rot, k, turn: 1, end: u > HOLD - 0.05 };
    }

    /** A mini-boss's moment on the move: a crouch, a leap with a twirl, a landing, a bow and its line. */
    function miniMoment(it: Marcher, u: number, x: number): Pose {
      if (it.f?.id === 'jormungandr') return serpentMoment(it, u, x);
      const CROUCH = 0.28;
      const AIR = 0.55;
      const LAND = CROUCH + AIR;
      let y = 0;
      let q = 0;
      let rot = 0;
      let k = 1;
      let turn = 1;
      if (u < CROUCH) q = 0.24 * smooth(u / CROUCH);
      else if (u < LAND) {
        // a hop with a pirouette: it turns on the spot in the air (still facing out at the top of the turn), a lean
        // into it, and comes down where it went up (its sole never drops below the table)
        const a = (u - CROUCH) / AIR;
        y = -Math.sin(a * Math.PI) * (calm ? 50 : 110);
        q = a < 0.35 ? -0.14 * (1 - a / 0.35) : 0;
        if (!calm) {
          turn = Math.cos(smooth(a) * Math.PI * 2);
          rot = Math.sin(a * Math.PI) * 0.12 * it.side;
        }
      } else {
        if (!it.landed) {
          it.landed = true;
          bigLand(it, x, 0.45);
          const v = voiceOf(it.f!.id);
          if (v) audio.sfx(v, { volume: 0.6 });
          say(it, x, 1500);
        }
        const w = u - LAND;
        q = 0.26 * Math.exp(-w * 8) * Math.cos(w * 24);
        const b = Math.sin(clamp01((w - 0.3) / 0.7) * Math.PI);
        q += 0.11 * b;
        k = 1 + 0.04 * b;
      }
      return { y, q, rot, k, turn, end: u > LAND + 1.05 };
    }

    /** Jörmungandr's moment (its art is a serpent's head turned three-quarters): it rears up towards you, sways, and
     * strikes at the air with its hiss, then settles. */
    function serpentMoment(it: Marcher, u: number, x: number): Pose {
      const REAR = 0.45;
      let q = 0;
      let k = 1;
      let rot = 0;
      let y = 0;
      if (u < REAR) {
        q = -0.12 * smooth(u / REAR);
        k = 1 + 0.08 * smooth(u / REAR);
      } else {
        const w = u - REAR;
        if (!it.landed) {
          it.landed = true;
          bigLand(it, x, 0.3);
          const v = voiceOf(it.f!.id);
          if (v) audio.sfx(v, { volume: 0.6 });
          say(it, x, 1500);
        }
        // the strike: a snap nearer and back, then the sway, settling
        const strike = Math.exp(-w * 6) * Math.sin(Math.min(w * 14, Math.PI));
        k = 1.08 + 0.1 * strike - 0.08 * smooth((w - 0.6) / 0.6);
        q = -0.12 * (1 - smooth((w - 0.6) / 0.6));
        rot = (calm ? 0.3 : 1) * Math.sin(w * 7) * 0.1 * (1 - smooth((w - 0.4) / 0.9));
        y = -8 * strike;
      }
      return { y, q, rot, k, turn: 1, end: u > REAR + 1.4 };
    }
  }
}

/** A comic speech bubble (white, inked, its tail pointing down at the speaker), for a boss's line. */
function bubbleOf(sc: Phaser.Scene, text: string, size: number): { c: Box; width: number; height: number } {
  const t = sc.add.text(0, 0, text, { fontFamily: DISPLAY, fontSize: `${size}px`, color: '#2a1408', align: 'center', wordWrap: { width: 380 } }).setOrigin(0.5);
  const w = t.width + 48;
  const h = t.height + 30;
  const g = sc.add.graphics();
  g.fillStyle(0x000000, 0.28).fillRoundedRect(-w / 2 + 6, -h / 2 + 7, w, h, 24);
  g.fillStyle(0xfffdf6, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 24);
  g.lineStyle(6, 0x2a1408, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 24);
  g.fillStyle(0xfffdf6, 1).fillTriangle(-w / 2 + 30, h / 2 - 5, -w / 2 + 64, h / 2 - 5, -w / 2 + 14, h / 2 + 34);
  g.lineStyle(6, 0x2a1408, 1).lineBetween(-w / 2 + 30, h / 2, -w / 2 + 14, h / 2 + 34).lineBetween(-w / 2 + 14, h / 2 + 34, -w / 2 + 64, h / 2);
  return { c: sc.add.container(0, 0, [g, t]), width: w, height: h + 34 };
}

/** The shine: a bright band swept across a title's letters (masked to them). */
function shine(sc: Phaser.Scene, root: Box, t: Txt, x: number, y: number, ms: number): void {
  if (reduced() || sc.renderer.type !== Phaser.WEBGL || !t.active) return;
  // (x, y: the title's place on screen, whatever container it sits in)
  const src = sc.make.text({ x, y, text: t.text, style: t.style.toJSON() as Phaser.Types.GameObjects.Text.TextStyle }, false).setOrigin(t.originX, t.originY).setLetterSpacing(t.letterSpacing).setScale(t.scaleX, t.scaleY);
  const g = sc.add.image(x - t.displayWidth / 2 - 120, y, glintTex(sc)).setBlendMode(ADD).setAngle(14).setScale(1, (t.displayHeight * 1.6) / 300);
  g.setMask(src.createBitmapMask());
  root.add(g);
  sc.tweens.add({ targets: g, x: x + t.displayWidth / 2 + 120, duration: ms, ease: 'Sine.InOut', onComplete: () => {
    g.destroy();
    src.destroy();
  } });
}

/** The title card: light gathers, the PIZZA LEGEND card lands in its gilt frame, a shine across it, confetti, and
 * Endless+ stamps in underneath. */
function legendCard(sc: Phaser.Scene, root: Box, firstTime: boolean, finish: () => void, live: LiveScene | null, quake: (ms: number, px: number) => void): void {
  const calm = reduced();
  const CY = 470;
  // anticipation: the place dims a little round a gathering glow
  // (a soft darkness round the card, not a dim over everything: the sun stays bright)
  const dim = sc.add.image(W / 2, CY + 10, 'glow').setTint(0x000000).setScale(6.4, 2.6).setAlpha(0);
  const glow = sc.add.image(W / 2, CY, 'glow').setTint(0xffd23f).setBlendMode(ADD).setScale(1.5, 0.8).setAlpha(0);
  root.add([dim, glow]);
  sc.tweens.add({ targets: dim, alpha: 0.5, duration: 600, ease: 'Sine.Out' });
  sc.tweens.add({ targets: glow, alpha: 0.75, scaleX: 7, scaleY: 3.6, duration: 650, ease: 'Sine.In' });
  audio.sfx('sfx_godreveal', { volume: 0.5 });
  const card = sc.add.container(W / 2, CY).setScale(0.55).setAlpha(0);
  const board = sc.add.image(0, 4, cardTex(sc));
  const style = (size: number, color: string, font = DISPLAY) => ({ fontFamily: font, fontSize: `${size}px`, color, stroke: '#1c0c06', strokeThickness: Math.max(5, Math.round(size / 7)), align: 'center' as const });
  const kick = sc.add.text(0, -138, firstTime ? 'NEW TITLE' : 'STILL THE', { ...style(28, '#ffd9a0', BODY), fontStyle: '700' }).setOrigin(0.5).setLetterSpacing(9);
  const big = softShadow(sc.add.text(0, -40, 'PIZZA LEGEND', style(128, '#ffd23f')).setOrigin(0.5).setLetterSpacing(4), 7, 'rgba(0,0,0,0.55)', 12);
  // the gold of the letters: pale at the top, deep at the foot
  const grad = big.context.createLinearGradient(0, 0, 0, big.height);
  grad.addColorStop(0.15, '#fff6c0');
  grad.addColorStop(0.5, '#ffd23f');
  grad.addColorStop(0.9, '#e08a18');
  big.setFill(grad);
  const sub = sc.add.text(0, 72, 'ENDLESS+ UNLOCKED', style(50, '#7dff9a')).setOrigin(0.5).setLetterSpacing(3).setAlpha(0).setScale(1.7);
  const note = sc.add.text(0, 138, 'From wave 101 every place, boss and foot is shuffled', { ...style(28, '#fff1dc', BODY), fontStyle: '600' }).setOrigin(0.5).setAlpha(0);
  card.add([board, kick, big, sub, note]);
  root.add(card);
  sc.tweens.add({
    targets: card,
    scale: 1,
    alpha: 1,
    duration: 640,
    delay: 520,
    ease: 'Back.Out',
    onStart: () => audio.sting('music_act', 0.9),
    onComplete: () => {
      live?.impact?.(W / 2, 760, 0.5);
      shine(sc, root, big, W / 2 + big.x, CY + big.y, 1000);
      sc.tweens.add({ targets: sub, alpha: 1, scale: 1, duration: 260, delay: 520, ease: 'Quad.In', onComplete: () => {
        quake(180, 6);
        audio.sfx('sfx_upgrade', { volume: 0.6 });
      } });
      sc.tweens.add({ targets: note, alpha: 1, duration: 500, delay: 900 });
      // confetti from both sides, then a gentle fall
      for (const side of [-1, 1]) {
        const burst = sc.add.particles(side < 0 ? 40 : W - 40, H - 40, 'confetti', {
          lifespan: 2600, speed: { min: 700, max: 1150 }, angle: side < 0 ? { min: -80, max: -50 } : { min: -130, max: -100 }, gravityY: 900,
          rotate: { min: 0, max: 360 }, scaleX: { min: 0.6, max: 1.2 }, scaleY: { min: 0.4, max: 1 }, emitting: false,
          tint: [0xffd23f, 0xfff4b0, 0xff4d6d, 0x3ddc97, 0x4cc9f0], alpha: { start: 1, end: 0.6 },
        });
        root.addAt(burst, root.getIndex(card));
        burst.explode(calm ? 20 : 60);
      }
      const rain = sc.add.particles(0, 0, 'confetti', {
        x: { min: 0, max: W }, y: -20, lifespan: 5000, frequency: calm ? 120 : 40, quantity: 2,
        speedY: { min: 160, max: 300 }, speedX: { min: -60, max: 60 }, rotate: { min: 0, max: 360 },
        scaleX: { min: 0.6, max: 1.2 }, scaleY: { min: 0.4, max: 1 },
        tint: [0xffd23f, 0xfff4b0, 0xff4d6d, 0x3ddc97, 0x4cc9f0], alpha: 0.9,
      });
      root.addAt(rain, root.getIndex(card));
      sc.time.delayedCall(2600, () => rain.stop());
    },
  });
  sc.tweens.add({ targets: glow, alpha: 0.45, duration: 900, delay: 700 });
  sc.time.delayedCall(5400, finish);
}
