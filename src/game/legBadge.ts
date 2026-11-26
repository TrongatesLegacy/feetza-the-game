// A leg badge: a small tag worn on a foot's leg, just above the foot, that says what the foot is doing in one word.
// It is made to show any trait (the guard shield is the first): an icon on top inside a ring, one word (and an
// optional short line under it), and an optional bar (stepped, or a smooth fraction). The ring is a timer when it
// has a fraction. Its look is built from the leg's own colours (a riveted plate on gear, a carved tag on bone, a
// stitched patch on cloth or skin), and its state tints it: warn (a blue glow), go (green), bad (warm red), used
// (dimmed) or hot (an orange glow). bump() gives it a quick pop.
//
// It's drawn with the 2D canvas at twice its size into its own texture and shown at half scale, so it stays crisp;
// it's only redrawn when what it shows changes (a ring timer is rounded to 1/48 turns).

import Phaser from 'phaser';
import { mix, rgba, shade } from '../art/util';

export type LegBadgeKind = 'plate' | 'tag' | 'patch';
export type LegBadgeState = 'warn' | 'go' | 'bad' | 'used' | 'hot' | null;

/** How a badge looks: its kind and colours (from the leg it's on). */
export interface LegBadgeLook {
  kind: LegBadgeKind;
  /** The leg's colour: the badge's face is made from it. */
  base: string;
  /** The bar's and the icon's fill. */
  accent: string;
}

/** What a badge shows. */
export interface LegBadgeShow {
  word: string;
  /** A short line under the word (a time left: "6s"). */
  sub?: string;
  /** An icon from ICONS. */
  icon: string;
  /** A stepped bar (steps, how many lit) or a smooth one (frac 0…1). */
  bar?: { steps: number; lit: number; chip?: number; flash?: boolean } | { frac: number };
  /** The ring round the icon: a timer (0…1) in a colour. */
  ring?: { frac: number; color: string };
  state?: LegBadgeState;
}

/** Icons drawn in a circle of radius r round (0, 0), in `col`, with an outline in `ink`. */
export const ICONS: Record<string, (g: CanvasRenderingContext2D, r: number, col: string, ink: string) => void> = {
  shield: (g, r, col, ink) => heater(g, r, col, ink, false),
  shieldBroken: (g, r, col, ink) => heater(g, r, col, ink, true),
  rage: (g, r, _col, ink) => {
    // a cartoon anger mark: four bent strokes round a centre
    g.save();
    g.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      g.rotate(Math.PI / 2);
      g.beginPath();
      g.moveTo(r * 0.25, -r * 0.95);
      g.quadraticCurveTo(r * 0.2, -r * 0.2, r * 0.95, -r * 0.25);
      g.lineWidth = r * 0.5;
      g.strokeStyle = ink;
      g.stroke();
      g.lineWidth = r * 0.28;
      g.strokeStyle = '#e8262a';
      g.stroke();
    }
    g.restore();
  },
};

/** A heart (the friendly zombies' mark: src/game/zombiePeel.ts), centred, r across. */
function heart(g: CanvasRenderingContext2D, r: number, col: string, ink: string, dy = 0): void {
  g.beginPath();
  g.moveTo(0, r * 0.95 + dy);
  g.bezierCurveTo(-r * 1.25, r * 0.05 + dy, -r * 0.95, -r * 1.05 + dy, 0, -r * 0.42 + dy);
  g.bezierCurveTo(r * 0.95, -r * 1.05 + dy, r * 1.25, r * 0.05 + dy, 0, r * 0.95 + dy);
  g.closePath();
  const gr = g.createLinearGradient(0, -r + dy, 0, r + dy);
  gr.addColorStop(0, mix(col, '#ffffff', 0.45));
  gr.addColorStop(1, shade(col, -0.25));
  g.fillStyle = gr;
  g.fill();
  g.lineWidth = r * 0.22;
  g.strokeStyle = ink;
  g.stroke();
  g.fillStyle = rgba('#ffffff', 0.7);
  g.beginPath();
  g.ellipse(-r * 0.42, -r * 0.35 + dy, r * 0.2, r * 0.13, -0.6, 0, Math.PI * 2);
  g.fill();
}

// the friendly zombies (src/game/zombiePeel.ts): a heart while it hunts, a heart with fangs as it bites, a bomb with
// a heart on it and a lit fuse before it bursts
ICONS.allyHeart = (g, r, col, ink) => heart(g, r, col, ink);
// hunting: an eye peering out, with a small heart (still yours) on its lid corner
ICONS.allyHunt = (g, r, col, ink) => {
  g.beginPath();
  g.moveTo(-r * 1.05, 0);
  g.quadraticCurveTo(0, -r * 1.05, r * 1.05, 0);
  g.quadraticCurveTo(0, r * 1.05, -r * 1.05, 0);
  g.closePath();
  g.fillStyle = '#f4f8e8';
  g.fill();
  g.lineWidth = r * 0.2;
  g.strokeStyle = ink;
  g.stroke();
  // the iris looks off to the side, hunting
  g.beginPath();
  g.arc(r * 0.22, 0, r * 0.46, 0, Math.PI * 2);
  g.fillStyle = col;
  g.fill();
  g.beginPath();
  g.arc(r * 0.26, 0, r * 0.2, 0, Math.PI * 2);
  g.fillStyle = '#0c1408';
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(r * 0.12, -r * 0.14, r * 0.09, 0, Math.PI * 2);
  g.fill();
};
ICONS.allyBite =(g, r, col, ink) => {
  heart(g, r * 0.95, col, ink, -r * 0.08);
  // two fangs off its bottom edge
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(s * r * 0.5, r * 0.05);
    g.lineTo(s * r * 0.2, r * 0.05);
    g.lineTo(s * r * 0.36, r * 0.75);
    g.closePath();
    g.fillStyle = '#ffffff';
    g.fill();
    g.lineWidth = r * 0.12;
    g.strokeStyle = ink;
    g.stroke();
  }
};
ICONS.allyBomb = (g, r, col, ink) => {
  const R = r * 0.78;
  const cy = r * 0.18;
  // the fuse and its spark
  g.beginPath();
  g.moveTo(R * 0.45, cy - R * 0.8);
  g.quadraticCurveTo(R * 0.9, cy - R * 1.45, R * 1.15, cy - R * 1.2);
  g.lineWidth = r * 0.16;
  g.strokeStyle = '#7a5a30';
  g.stroke();
  g.fillStyle = '#ffd23f';
  g.beginPath();
  g.arc(R * 1.15, cy - R * 1.2, r * 0.2, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(0, cy, R, 0, Math.PI * 2);
  const gr = g.createRadialGradient(-R * 0.35, cy - R * 0.35, R * 0.1, 0, cy, R);
  gr.addColorStop(0, '#6a7a5a');
  gr.addColorStop(1, '#232a1c');
  g.fillStyle = gr;
  g.fill();
  g.lineWidth = r * 0.16;
  g.strokeStyle = ink;
  g.stroke();
  // a big bright heart on it (still yours), outlined in white so it reads on the dark bomb
  heart(g, R * 0.72, mix(col, '#ffffff', 0.25), '#ffffff', cy + R * 0.06);
};

function heater(g: CanvasRenderingContext2D, r: number, col: string, ink: string, broken: boolean): void {
  const s = r / 15;
  const path = () => {
    g.beginPath();
    g.moveTo(-10 * s, -10 * s);
    g.quadraticCurveTo(0, -13 * s, 10 * s, -10 * s);
    g.lineTo(10 * s, 1 * s);
    g.quadraticCurveTo(8 * s, 9 * s, 0, 13 * s);
    g.quadraticCurveTo(-8 * s, 9 * s, -10 * s, 1 * s);
    g.closePath();
  };
  g.save();
  if (broken) {
    // the two halves knocked apart
    for (const side of [-1, 1]) {
      g.save();
      g.translate(side * 2.2 * s, side * 1 * s);
      g.rotate(side * 0.16);
      g.beginPath();
      g.rect(side < 0 ? -20 * s : 0.5 * s, -20 * s, 19.5 * s, 40 * s);
      g.clip();
      path();
      g.fillStyle = col;
      g.fill();
      g.lineWidth = 2 * s;
      g.strokeStyle = ink;
      g.stroke();
      g.restore();
    }
  } else {
    path();
    const gr = g.createLinearGradient(-10 * s, -12 * s, 10 * s, 12 * s);
    gr.addColorStop(0, mix(col, '#ffffff', 0.45));
    gr.addColorStop(0.55, col);
    gr.addColorStop(1, shade(col, -0.35));
    g.fillStyle = gr;
    g.fill();
    g.lineWidth = 2 * s;
    g.strokeStyle = ink;
    g.stroke();
    // a boss and a shine
    g.fillStyle = rgba('#ffffff', 0.55);
    g.beginPath();
    g.ellipse(-4 * s, -5 * s, 2.6 * s, 1.6 * s, -0.5, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** A round silver tray seen face-on, or (off) knocked flying: tilted edge-on with speed lines behind it. */
function salverIcon(g: CanvasRenderingContext2D, r: number, ink: string, off: boolean): void {
  g.save();
  if (off) {
    // speed lines trailing off to the lower left
    g.lineCap = 'round';
    g.strokeStyle = ink;
    g.lineWidth = r * 0.16;
    for (const [dx, dy, l] of [[-0.95, 0.2, 0.5], [-0.8, 0.55, 0.4]] as const) {
      g.beginPath();
      g.moveTo(r * dx, r * dy);
      g.lineTo(r * (dx - l), r * (dy + l * 0.45));
      g.stroke();
    }
    g.translate(r * 0.15, -r * 0.1);
    g.rotate(-0.55);
    g.scale(1, 0.45);
  }
  const R = r * 0.98;
  const gr = g.createLinearGradient(-R, -R, R, R);
  gr.addColorStop(0, '#ffffff');
  gr.addColorStop(0.45, '#c8d0da');
  gr.addColorStop(0.6, '#eef2f6');
  gr.addColorStop(1, '#6a7482');
  g.beginPath();
  g.arc(0, 0, R, 0, Math.PI * 2);
  g.fillStyle = gr;
  g.fill();
  g.lineWidth = r * 0.2;
  g.strokeStyle = ink;
  g.stroke();
  // the well inside the rim, and a sheen across it
  g.beginPath();
  g.arc(0, 0, R * 0.66, 0, Math.PI * 2);
  g.lineWidth = r * 0.1;
  g.strokeStyle = 'rgba(40,48,62,0.55)';
  g.stroke();
  g.beginPath();
  g.ellipse(-R * 0.32, -R * 0.34, R * 0.42, R * 0.14, -0.75, 0, Math.PI * 2);
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.fill();
  g.restore();
}
ICONS.tray = (g, r, _col, ink) => salverIcon(g, r, ink, false);
ICONS.trayOff = (g, r, _col, ink) => salverIcon(g, r, ink, true);

/** Perceived lightness of a hex colour, 0…1. */
function light(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

let nextId = 0;
/** Width and height in world px (the face; the icon sits half above it and glows reach past it). */
const W = 70;
const FACE_H = 46;
const ICON_R = 15;
const PAD = 10;
const RES = 2;

export class LegBadge {
  readonly img: Phaser.GameObjects.Image;
  private readonly tex: Phaser.Textures.CanvasTexture;
  private readonly key: string;
  private sig = '';
  private bumpT = 9;
  private show: LegBadgeShow = { word: '', icon: 'shield' };

  constructor(readonly scene: Phaser.Scene, parent: Phaser.GameObjects.Container, x: number, y: number, readonly look: LegBadgeLook) {
    this.key = `legbadge_${nextId++}`;
    const cw = (W + PAD * 2) * RES;
    const ch = (FACE_H + ICON_R + PAD * 2) * RES;
    this.tex = scene.textures.createCanvas(this.key, cw, ch)!;
    // its origin is the face's centre
    this.img = scene.add.image(x, y, this.key).setScale(1 / RES).setOrigin(0.5, (PAD + ICON_R + FACE_H / 2) / (FACE_H + ICON_R + PAD * 2));
    parent.add(this.img);
  }

  /** Show something (redrawn only if it changed). */
  set(s: LegBadgeShow): void {
    this.show = s;
    const ring = s.ring ? `${Math.round(s.ring.frac * 32)}${s.ring.color}` : '';
    const bar = s.bar ? ('steps' in s.bar ? `${s.bar.lit}/${s.bar.steps}/${Math.round((s.bar.chip ?? 0) * 10)}${s.bar.flash ? '!' : ''}` : `${Math.round(s.bar.frac * 60)}`) : '';
    const sig = `${s.word}|${s.sub ?? ''}|${s.icon}|${bar}|${ring}|${s.state ?? ''}`;
    if (sig === this.sig) return;
    this.sig = sig;
    this.draw();
  }

  /** A quick pop (a smack on what it shows). */
  bump(): void {
    this.bumpT = 0;
  }

  update(dt: number, rotation = 0): void {
    this.bumpT += dt;
    const u = this.bumpT / 0.2;
    const k = u < 1 ? 1 + Math.sin(u * Math.PI) * 0.2 : 1;
    // on a small screen (a phone shows the game at under 60% of its size) it grows, so its word stays readable
    const sc = this.scene.scale;
    const shown = sc.displaySize.width / Math.max(1, sc.gameSize.width);
    const boost = shown > 0 && shown < 0.65 ? Math.min(1.6, 0.75 / shown) : 1;
    this.img.setScale((k * boost) / RES).setRotation(rotation);
  }

  setVisible(v: boolean): void {
    this.img.setVisible(v);
  }

  private draw(): void {
    const s = this.show;
    const g = this.tex.context;
    const L = this.look;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.tex.width, this.tex.height);
    g.setTransform(RES, 0, 0, RES, 0, 0);
    // the face's colours from the leg, then the state's tint
    let base = L.base;
    let accent = L.accent;
    let dark = light(base) < 0.45;
    if (s.state === 'bad') {
      base = mix(base, '#e8844e', 0.7);
      dark = false;
    } else if (s.state === 'go') {
      base = mix(base, '#5fd36a', 0.78);
      accent = '#1f8a2e';
      dark = false;
    } else if (s.state === 'used') base = mix(base, '#8a8a8a', 0.5);
    const top = dark ? mix(base, '#ffffff', 0.22) : mix(base, '#ffffff', 0.45);
    const bot = dark ? shade(base, -0.15) : shade(base, -0.12);
    const edge = dark ? mix(base, '#000000', 0.55) : shade(base, -0.55);
    const ink = s.state === 'bad' ? '#5a1e08' : s.state === 'go' ? '#123d18' : dark ? '#f4efe6' : shade(base, -0.72);
    const x0 = PAD;
    const y0 = PAD + ICON_R;
    const r = L.kind === 'patch' ? 9 : L.kind === 'tag' ? 7 : 5;
    const face = () => {
      g.beginPath();
      g.roundRect(x0, y0, W, FACE_H, r);
    };
    // the state's glow round it
    const glow = s.state === 'warn' ? 'rgba(80,170,255,0.95)' : s.state === 'go' ? 'rgba(70,220,90,0.85)' : s.state === 'hot' ? 'rgba(255,140,40,0.9)' : null;
    if (glow) {
      g.save();
      g.shadowColor = glow;
      g.shadowBlur = 10;
      face();
      g.lineWidth = 5;
      g.strokeStyle = glow;
      g.stroke();
      g.restore();
    }
    // a drop shadow, the face, its edge
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.45)';
    g.shadowOffsetY = 2;
    g.shadowBlur = 2;
    face();
    const gr = g.createLinearGradient(0, y0, 0, y0 + FACE_H);
    gr.addColorStop(0, top);
    gr.addColorStop(1, bot);
    g.fillStyle = gr;
    g.fill();
    g.restore();
    face();
    g.lineWidth = 2;
    g.strokeStyle = edge;
    g.stroke();
    // its kind: a carved groove (tag), rivets (plate) or stitches (patch)
    g.save();
    if (L.kind === 'tag') {
      g.beginPath();
      g.roundRect(x0 + 3.5, y0 + 3.5, W - 7, FACE_H - 7, r - 3);
      g.lineWidth = 1.2;
      g.strokeStyle = rgba(edge, 0.45);
      g.stroke();
      g.beginPath();
      g.moveTo(x0 + r, y0 + 1.5);
      g.lineTo(x0 + W - r, y0 + 1.5);
      g.strokeStyle = rgba('#ffffff', 0.6);
      g.stroke();
    } else if (L.kind === 'plate') {
      for (const [rx, ry] of [[x0 + 5, y0 + 5], [x0 + W - 5, y0 + 5], [x0 + 5, y0 + FACE_H - 5], [x0 + W - 5, y0 + FACE_H - 5]]) {
        const rg = g.createRadialGradient(rx - 0.8, ry - 0.8, 0.2, rx, ry, 2.4);
        rg.addColorStop(0, '#f4f6fa');
        rg.addColorStop(1, '#5a606a');
        g.fillStyle = rg;
        g.beginPath();
        g.arc(rx, ry, 2.2, 0, Math.PI * 2);
        g.fill();
      }
      g.beginPath();
      g.moveTo(x0 + 3, y0 + 1.5);
      g.lineTo(x0 + W - 3, y0 + 1.5);
      g.lineWidth = 1;
      g.strokeStyle = rgba('#ffffff', 0.35);
      g.stroke();
    } else {
      g.setLineDash([3, 2.4]);
      g.beginPath();
      g.roundRect(x0 + 3, y0 + 3, W - 6, FACE_H - 6, r - 2.5);
      g.lineWidth = 1.2;
      g.strokeStyle = rgba(dark ? '#ffffff' : edge, 0.6);
      g.stroke();
    }
    g.restore();
    // the icon in its ring, sitting on top
    const cx = x0 + W / 2;
    const cy = y0 + 1;
    g.beginPath();
    g.arc(cx, cy, ICON_R, 0, Math.PI * 2);
    const ig = g.createLinearGradient(0, cy - ICON_R, 0, cy + ICON_R);
    ig.addColorStop(0, top);
    ig.addColorStop(1, bot);
    g.fillStyle = ig;
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = edge;
    g.stroke();
    if (s.ring) {
      g.lineCap = 'round';
      g.beginPath();
      g.arc(cx, cy, ICON_R - 2.5, 0, Math.PI * 2);
      g.lineWidth = 3.4;
      g.strokeStyle = 'rgba(0,0,0,0.22)';
      g.stroke();
      if (s.ring.frac > 0) {
        g.beginPath();
        g.arc(cx, cy, ICON_R - 2.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, s.ring.frac));
        g.strokeStyle = s.ring.color;
        g.stroke();
      }
    }
    g.save();
    g.translate(cx, cy);
    (ICONS[s.icon] ?? ICONS.shield)(g, ICON_R - 5, s.state === 'bad' ? '#b8a8a0' : accent, edge);
    g.restore();
    // the word, and the line under it
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    const hasBar = !!s.bar;
    const wy = y0 + (s.sub ? 25 : hasBar ? 28 : 31);
    g.font = '700 11.5px Fredoka, "Arial Rounded MT Bold", system-ui, sans-serif';
    g.fillStyle = ink;
    g.fillText(s.word, cx, wy, W - 8);
    if (s.sub) {
      g.font = '700 10.5px Fredoka, system-ui, sans-serif';
      g.globalAlpha = 0.9;
      g.fillText(s.sub, cx, wy + 11, W - 8);
      g.globalAlpha = 1;
    }
    // the bar: stepped or smooth
    if (s.bar) {
      const by = y0 + FACE_H - 11;
      const bx = x0 + 7;
      const bw = W - 14;
      g.fillStyle = 'rgba(0,0,0,0.22)';
      g.beginPath();
      g.roundRect(bx - 1.5, by - 1.5, bw + 3, 8, 3);
      g.fill();
      if ('steps' in s.bar) {
        const n = Math.max(1, s.bar.steps);
        const gap = n > 6 ? 1.5 : 2;
        const sw = (bw - gap * (n - 1)) / n;
        for (let i = 0; i < n; i++) {
          g.beginPath();
          g.roundRect(bx + i * (sw + gap), by, sw, 5, 1.6);
          g.fillStyle = i < s.bar.lit ? accent : 'rgba(0,0,0,0.25)';
          g.fill();
          if (i < s.bar.lit) {
            g.fillStyle = 'rgba(255,255,255,0.45)';
            g.fillRect(bx + i * (sw + gap) + 1, by + 0.6, sw - 2, 1.2);
          }
        }
        // the step being worn away (chip: how much of it is gone), flashing as it's worn
        const last = s.bar.lit - 1;
        if (last >= 0 && (s.bar.chip || s.bar.flash)) {
          const x = bx + last * (sw + gap);
          const gone = sw * Math.min(1, s.bar.chip ?? 0);
          g.fillStyle = s.bar.flash ? '#ffffff' : 'rgba(0,0,0,0.4)';
          g.beginPath();
          g.roundRect(s.bar.flash ? x : x + sw - gone, by, s.bar.flash ? sw : gone, 5, 1.6);
          g.fill();
        }
      } else {
        g.beginPath();
        g.roundRect(bx, by, bw * Math.max(0, Math.min(1, s.bar.frac)), 5, 1.6);
        g.fillStyle = accent;
        g.fill();
      }
    }
    this.tex.refresh();
  }

  destroy(): void {
    this.img.destroy();
    if (this.scene.textures.exists(this.key)) this.scene.textures.remove(this.key);
  }
}
