// Dev-only style sheet for the feet redesign (the style kit in src/art/style, the live kit in src/game/liveKit.ts):
// the one light, the line, the palette, the shared anatomy and its rig band, every material, and each redrawn foot
// next to its old art, alive (the real Foot and live kit, puppeted through hover, wind-up, dive, stomp and lift).
// Open it with the floating "🦶 Style" button or ?dev&style.

import Phaser from 'phaser';
import { CX } from './art/feetCommon';
import { FOOT_FRAME, drawFoot, footRes } from './art/feetArt';
import { bareParts, cleft, restToes } from './art/style/anatomy';
import { LIGHT, STYLE, pose } from './art/style/kit';
import { MATERIALS, type MaterialId, paint } from './art/style/materials';
import { styleFor, styledIds } from './art/style/registry';
import { makeCanvas, rgba } from './art/util';
import { FOOT_BY_ID, type FootType } from './data/feet';
import { type FootMeta, footMeta, footPortraitURL } from './game/assets';
import { PEELS, peelThumbURL } from './game/peels';
import { Foot, type FootHooks } from './game/Foot';
import { liveOf, styleLive } from './game/liveKit';
import { buildSprites } from './art/sprites';
import './content/styleLive';

const CSS = `
.ss-wrap{position:fixed;inset:0;z-index:9999;background:#efe2c8;overflow:auto;font:15px Fredoka,system-ui,sans-serif;color:#2a1810}
.ss-head{position:sticky;top:0;z-index:3;background:#2a1810;color:#ffe9c7;display:flex;gap:12px;align-items:center;padding:10px 16px;flex-wrap:wrap}
.ss-head h2{margin:0;font-size:20px}.ss-head .sp{flex:1}
.ss-btn{background:#d9442b;color:#fff;border:0;border-radius:9px;padding:7px 12px;font:600 14px Fredoka,system-ui,sans-serif;cursor:pointer}
.ss-btn.alt{background:#5a3a28}.ss-btn.on{background:#ff8a1a}
.ss-body{padding:12px 16px 40px;max-width:1500px;margin:0 auto}
.ss-body h3{margin:22px 0 6px;font-size:19px}.ss-body p{margin:4px 0 10px;max-width:900px;line-height:1.4}
.ss-row{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start}
.ss-card{background:#fbf3e3;border-radius:12px;padding:10px;display:flex;flex-direction:column;align-items:center;gap:6px;box-shadow:0 1px 0 #2a181022}
.ss-card b{font-size:14px}.ss-card small{font-size:12px;opacity:.7;text-align:center;max-width:220px}
.ss-chip{display:inline-flex;align-items:center;gap:6px;margin:0 10px 6px 0;font-size:13px}
.ss-chip i{display:inline-block;width:26px;height:26px;border-radius:7px;border:2px solid #2a181033}
.ss-stage{width:100%;border-radius:12px;overflow:hidden;background:#1d1422}
.ss-stage canvas{display:block;width:100%;height:auto}
`;

/** A canvas painted in design units at `k` css px per unit, crisp on hi-DPI screens. */
function designCanvas(w: number, h: number, k: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const [c, ctx] = makeCanvas(w * k * dpr, h * k * dpr);
  c.style.width = `${w * k}px`;
  c.style.height = `${h * k}px`;
  ctx.scale(k * dpr, k * dpr);
  draw(ctx);
  return c;
}

function card(title: string, sub: string, el: HTMLElement): HTMLElement {
  const d = document.createElement('div');
  d.className = 'ss-card';
  d.append(el);
  const b = document.createElement('b');
  b.textContent = title;
  const s = document.createElement('small');
  s.textContent = sub;
  d.append(b, s);
  return d;
}

/** The light: a sphere lit by the kit, with the key direction and rim marked. */
function lightCard(): HTMLElement {
  const c = designCanvas(200, 200, 1, (ctx) => {
    ctx.fillStyle = '#7a5a8a';
    ctx.fillRect(0, 0, 200, 200);
    const ball = (x: CanvasRenderingContext2D) => {
      x.beginPath();
      x.arc(104, 108, 62, 0, Math.PI * 2);
    };
    paint(ctx, ball, { x: 42, y: 46, w: 124, h: 124 }, 'skin');
    ctx.strokeStyle = STYLE.ink;
    ctx.lineWidth = STYLE.outline;
    ball(ctx);
    ctx.stroke();
    // the key light's direction
    const [lx, ly] = LIGHT.dir;
    ctx.strokeStyle = '#fff2d8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(104 + lx * 140, 108 + ly * 140);
    ctx.lineTo(104 + lx * 76, 108 + ly * 76);
    ctx.stroke();
    ctx.fillStyle = '#fff2d8';
    ctx.beginPath();
    ctx.arc(104 + lx * 140, 108 + ly * 140, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = LIGHT.rim;
    ctx.font = '600 12px Fredoka, sans-serif';
    ctx.fillText('rim', 158, 182);
    ctx.fillStyle = '#fff2d8';
    ctx.fillText('key', 26, 18);
  });
  return card('One light', 'Key light from the top left, a cool rim on the far edge, warm subsurface in skin shadows', c);
}

function lineCard(): HTMLElement {
  const c = designCanvas(220, 120, 1, (ctx) => {
    ctx.fillStyle = '#e9dcc4';
    ctx.fillRect(0, 0, 220, 120);
    for (const [y, w, label] of [[30, STYLE.outline, `silhouette ${STYLE.outline}`], [62, 1.4, 'crease'], [92, 5.5, 'old outline 5.5']] as const) {
      ctx.strokeStyle = label.startsWith('old') ? '#2a181066' : STYLE.ink;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(14, y);
      ctx.lineTo(110, y);
      ctx.stroke();
      ctx.fillStyle = '#2a1810';
      ctx.font = '12px Fredoka, sans-serif';
      ctx.fillText(label, 120, y + 4);
    }
  });
  return card('One line', 'One outline round the whole silhouette, grown from its mask: never across the inside, never over the ankle', c);
}

/** The shared anatomy: the bare silhouette with its toes, clefts, contact line and the rig's toe band. */
function anatomyCard(): HTMLElement {
  const toes = restToes();
  const parts = bareParts(toes);
  const c = designCanvas(FOOT_FRAME.w, FOOT_FRAME.h, 1.1, (ctx) => {
    ctx.fillStyle = '#e9dcc4';
    ctx.fillRect(0, 0, FOOT_FRAME.w, FOOT_FRAME.h);
    ctx.translate(FOOT_FRAME.padX, FOOT_FRAME.padY);
    ctx.fillStyle = '#f2c8a8';
    for (const p of parts) {
      p(ctx);
      ctx.fill();
    }
    ctx.strokeStyle = '#2a181055';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    for (const p of parts) {
      p(ctx);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = '#d9442b';
    for (let i = 0; i < 4; i++) {
      const [x, y] = cleft(toes[i], toes[i + 1]);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    const st = styleFor('bob');
    const band = st?.rig ?? { from: 176, to: 198 };
    ctx.fillStyle = 'rgba(80,140,255,.16)';
    ctx.fillRect(-40, band.from, 300, band.to - band.from);
    ctx.font = '600 11px Fredoka, sans-serif';
    const lab = (t: string, y: number, col: string) => {
      ctx.strokeStyle = col;
      ctx.beginPath();
      ctx.moveTo(-40, y);
      ctx.lineTo(260, y);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.fillText(t, -36, y - 3);
    };
    lab('ankle (leg covers it)', -6, '#5a3a28');
    lab('toe band: pose frames fade in', band.from, '#2a5ad8');
    lab('contact', 260, '#d9442b');
    ctx.fillStyle = '#5a3a28';
    ctx.fillText('little toe', 6, 248);
    ctx.fillText('big toe', 170, 284);
    ctx.fillText(`centre x ${CX}`, CX - 30, 120);
  });
  return card('One anatomy', 'Ankle, bulb, ball and five toes (big toe on the right) as one union; clefts (red) are notches in the one outline', c);
}

function materialCards(): HTMLElement[] {
  return (Object.keys(MATERIALS) as MaterialId[]).map((id) => {
    const m = MATERIALS[id];
    const c = designCanvas(120, 120, 1, (ctx) => {
      ctx.fillStyle = '#d9cbb0';
      ctx.fillRect(0, 0, 120, 120);
      const blob = (x: CanvasRenderingContext2D) => {
        x.beginPath();
        x.moveTo(20, 62);
        x.bezierCurveTo(18, 22, 100, 14, 102, 56);
        x.bezierCurveTo(104, 96, 64, 108, 52, 104);
        x.bezierCurveTo(30, 100, 21, 86, 20, 62);
        x.closePath();
      };
      paint(ctx, blob, { x: 18, y: 16, w: 86, h: 92 }, id);
      ctx.strokeStyle = rgba(STYLE.ink, 0.9);
      ctx.lineWidth = STYLE.outline * 0.7;
      blob(ctx);
      ctx.stroke();
    });
    return card(m.name, `${m.base} · shadows → ${m.shadowTint}`, c);
  });
}

function paletteRow(): HTMLElement {
  const d = document.createElement('div');
  const chips: [string, string][] = [['ink', STYLE.ink], ['key light', LIGHT.key], ['rim light', LIGHT.rim], ['occlusion', LIGHT.ao], ...Object.values(MATERIALS).map((m) => [m.name, m.base] as [string, string])];
  d.innerHTML = chips.map(([n, c]) => `<span class="ss-chip"><i style="background:${c}"></i>${n} <small>${c}</small></span>`).join('');
  return d;
}

// ——— the live showcase: real Foot objects, puppeted ———

interface Pair {
  id: string;
  old: Foot;
  neu: Foot;
  t: number;
  layer: Phaser.GameObjects.Container;
}

const HOOKS: FootHooks = { onStomp: () => {}, pickTarget: () => null, onEscape: () => {} };

/** Register a foot's textures in another game (the showcase), under its own keys. */
function registerMeta(sc: Phaser.Scene, key: string, type: FootType, classic: boolean): void {
  const t = classic ? drawFoot(type, undefined, true) : footMeta[type.id]?.textures ?? drawFoot(type);
  const meta: FootMeta = { footKey: `foot_${key}`, legKey: `leg_${key}`, cuffKey: t.cuff ? `cuff_${key}` : undefined, originY: t.originY, footHeight: t.footHeight, halfWidth: t.footHalfWidth, legWidth: t.legWidth, textures: t };
  for (const [k, c] of [[meta.footKey, t.foot], [meta.legKey, t.leg], [meta.cuffKey, t.cuff]] as const) if (k && c && !sc.textures.exists(k)) sc.textures.addCanvas(k, c);
  footMeta[key] = meta;
}

class Showcase extends Phaser.Scene {
  pairs: Pair[] = [];
  heat = false;
  constructor() {
    super('StyleShowcase');
  }
  create(): void {
    const sprites = buildSprites();
    if (!this.textures.exists('shadow')) this.textures.addCanvas('shadow', sprites.shadow);
    const ids = styledIds();
    const cols = 4;
    const cw = 1600 / cols;
    ids.forEach((id, i) => {
      const type = FOOT_BY_ID[id];
      if (!type) return;
      registerMeta(this, `classic_${id}`, type, true);
      registerMeta(this, id, type, false);
      const col = i % cols;
      const row = Math.floor(i / cols);
      // each pair in its own layer, scaled so bosses fit beside regular feet
      const k = 0.62 / type.scale;
      const layer = this.add.container(col * cw + cw / 2, row * 380 + 200).setScale(k);
      // each pair stays in its own cell (legs are long)
      const m = this.make.graphics({}, false);
      m.fillStyle(0xffffff).fillRect(col * cw + 4, row * 380 + 4, cw - 8, 372);
      layer.setMask(m.createGeometryMask());
      const cell = this.add.graphics();
      cell.lineStyle(2, 0xffffff, 0.08).strokeRoundedRect(col * cw + 4, row * 380 + 4, cw - 8, 372, 10);
      const shadowL = this.add.container(0, 0);
      layer.add(shadowL);
      const old = new Foot(this, layer, shadowL, { ...type, id: `classic_${id}` }, -cw * 0.24 / k, { hpMult: 1, speedMult: 1, elite: false, hooks: HOOKS });
      const neu = new Foot(this, layer, shadowL, type, cw * 0.24 / k, { hpMult: 1, speedMult: 1, elite: false, hooks: HOOKS });
      for (const f of [old, neu]) {
        f.puppet = true;
        f.setState('hover');
      }
      this.add.text(col * cw + cw / 2, row * 380 + 344, `${type.name}  ·  old | new`, { fontFamily: 'Fredoka, system-ui, sans-serif', fontSize: '19px', color: '#ffe9c7' }).setOrigin(0.5, 0).setDepth(5);
      this.pairs.push({ id, old, neu, t: (i * 0.37) % 3.6, layer });
    });
  }
  update(_time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    for (const p of this.pairs) {
      p.t = (p.t + dt) % 3.6;
      for (const f of [p.old, p.neu]) {
        const x0 = f === p.old ? -400 * 0.24 / p.layer.scaleX : 400 * 0.24 / p.layer.scaleX;
        // the cycle: hover (swaying), wind up, dive, stomp, lift
        const t = p.t;
        const hy = 0;
        const sy = 120 / p.layer.scaleX;
        let y = hy;
        let st: Foot['state'] = 'hover';
        let vy = 0;
        f.hoverTime = 1.7;
        if (t < 1.7) {
          st = 'hover';
          y = hy + Math.sin(t * 3) * 6;
          f.x = x0 + Math.sin(t * 2.1) * 40;
        } else if (t < 2.05) {
          st = 'descend';
          const u = (t - 1.7) / 0.35;
          y = hy + (sy - hy) * u * u;
          vy = (2 * (sy - hy) * u) / 0.35;
        } else if (t < 2.55) {
          st = 'stomp';
          y = sy;
        } else {
          st = 'lift';
          const u = (t - 2.55) / 1.05;
          y = sy + (hy - sy) * (1 - (1 - u) * (1 - u));
          vy = -300;
        }
        if (f.state !== st) f.setState(st);
        else f.stateT = st === 'hover' ? t : f.stateT + dt;
        f.y = y;
        f.vy = vy;
        if (this.heat && f.isBossLike) f.phase = 3;
        else f.phase = 1;
        f.update(dt, 1);
        styleLive(f, dt);
      }
    }
  }
}

let game: Phaser.Game | null = null;

export function installStyleSheet(): void {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const close = () => {
    game?.destroy(true);
    game = null;
    document.querySelector('.ss-wrap')?.remove();
  };
  const open = async () => {
    close();
    await (window as unknown as { F?: { boot?: () => Promise<void> } }).F?.boot?.();
    const wrap = document.createElement('div');
    wrap.className = 'ss-wrap';
    wrap.innerHTML = `<div class="ss-head"><h2>🦶 Foot style sheet</h2><span>${styledIds().length} feet redrawn · textures at ${footRes(FOOT_BY_ID.bob)}× (old ${1.35}×)</span><span class="sp"></span><button class="ss-btn" data-heat>🔥 Overheat bosses</button><button class="ss-btn alt" data-x>✕ Close</button></div>
      <div class="ss-body">
        <h3>Alive: old and new, side by side</h3><p>The real feet and live kit, puppeted through a hover (swaying), the wind-up, the dive, the stomp and the lift. Particles stay in the world, so a moving foot trails them.</p>
        <div class="ss-stage" data-stage></div>
        <h3>Where the art shows outside play</h3><p>Peel thumbnails (the foot's own art, trimmed to fit the emblem), shiny peels, and the Pizzapedia portrait.</p>
        <div class="ss-row" data-thumbs></div>
        <h3>The rules</h3><p>One silhouette per foot (a union of parts with one outline); materials, not flat fills; one light for the whole game; detail painted inside the silhouette; constant subtle life.</p>
        <div class="ss-row" data-rules></div>
        <h3>Palette</h3><div data-palette></div>
        <h3>Materials</h3><p>Each sets a ramp, a shadow tint, a texture, a specular response and a rim (src/art/style/materials.ts).</p>
        <div class="ss-row" data-mats></div>
      </div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('[data-x]')!.addEventListener('click', close);
    const rules = wrap.querySelector('[data-rules]')!;
    rules.append(lightCard(), lineCard(), anatomyCard());
    wrap.querySelector('[data-palette]')!.append(paletteRow());
    wrap.querySelector('[data-mats]')!.append(...materialCards());
    const thumbs = wrap.querySelector('[data-thumbs]')!;
    for (const id of styledIds()) {
      const t = FOOT_BY_ID[id];
      if (!t) continue;
      const d = document.createElement('div');
      d.style.cssText = 'display:flex;gap:6px;align-items:flex-end';
      for (const pid of [`${t.boss || t.mini ? 'boss' : 'foot'}:${id}`, `shiny:${id}`]) {
        if (!PEELS.some((p) => p.id === pid)) continue;
        const img = new Image();
        img.src = peelThumbURL(pid, 160);
        img.style.height = '160px';
        d.append(img);
      }
      const por = new Image();
      por.src = footPortraitURL(id);
      por.style.cssText = 'height:120px;background:#3a2a20;border-radius:10px;padding:4px';
      d.append(por);
      thumbs.append(card(t.name, 'peel · shiny peel · Pizzapedia', d));
    }
    const rows = Math.ceil(styledIds().length / 4);
    const stage = wrap.querySelector<HTMLElement>('[data-stage]')!;
    game = new Phaser.Game({ type: Phaser.AUTO, parent: stage, width: 1600, height: rows * 380 + 20, backgroundColor: '#2a1d30', scene: [Showcase], audio: { noAudio: true }, banner: false });
    wrap.querySelector('[data-heat]')!.addEventListener('click', (e) => {
      const sc = game?.scene.getScene('StyleShowcase') as Showcase | undefined;
      if (!sc) return;
      sc.heat = !sc.heat;
      (e.target as HTMLElement).classList.toggle('on', sc.heat);
    });
  };
  const add = () => {
    const fab = document.querySelector('.bl-fab');
    if (!fab) return void setTimeout(add, 300);
    const b = document.createElement('button');
    b.textContent = '🦶 Style';
    b.title = 'The feet style sheet: rules, materials, old vs new, alive';
    b.addEventListener('click', () => void open());
    fab.appendChild(b);
  };
  add();
  if (new URLSearchParams(location.search).has('style')) setTimeout(() => void open(), 600);
}

export { liveOf, pose };
