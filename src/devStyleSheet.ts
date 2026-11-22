// Dev-only style sheet for the feet redesign (the style kit in src/art/style, the live kit in src/game/liveKit.ts):
// the one light, the line, the palette, the shared anatomy and its rig band, every material, and each redrawn foot
// next to its old art, alive (the real Foot and live kit, puppeted through hover, wind-up, dive, stomp and lift).
// Open it with the floating "🦶 Style" button or ?dev&style.

import Phaser from 'phaser';
import { CX } from './art/feetCommon';
import { FOOT_FRAME, drawFoot, footRes, resolvedLeg } from './art/feetArt';
import { bareParts, cleft, restToes } from './art/style/anatomy';
import { LIGHT, STYLE, pose } from './art/style/kit';
import { MATERIALS, type MaterialId, paint } from './art/style/materials';
import { styleDef as styleFor } from './art/style/registry';
import { actLabel, actOf } from './data/stages';
import { makeCanvas, rgba } from './art/util';
import { FOOT_BY_ID, type FootType } from './data/feet';
import { type FootMeta, footMeta, footPortraitURL } from './game/assets';
import { PEELS, peelThumbURL } from './game/peels';
import { Foot, type FootHooks } from './game/Foot';
import { liveOf, prewarmLive, styleLive, warmLive } from './game/liveKit';
import { bruteLive, immortalLive } from './game/footLive';
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
//
// One Phaser game draws over the whole scrolling page (a transparent canvas the size of the view, its camera
// following the scroll). Every foot has a card (a DOM placeholder): a pair of real Feet, old and new, is made when its
// card comes near the view and dropped (textures and all) when it's far away, so only on-screen cards run.

interface Entry {
  id: string;
  type: FootType;
  styled: boolean;
  bossy: boolean;
  card: HTMLElement;
  /** Card box in the scroller's content (css px). */
  x: number;
  y: number;
  w: number;
  h: number;
  pair?: Pair;
}

interface Pair {
  old?: Foot;
  neu: Foot;
  t: number;
  layer: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  keys: string[];
}

const HOOKS: FootHooks = { onStomp: () => {}, pickTarget: () => null, onEscape: () => {} };

/** The card's design width: pairs are laid out for a 400 px card and scaled to the real one. */
const CARD_W = 400;
const CARD_H = 380;

/** Register a foot's textures in the showcase game under its own keys; returns the keys (to drop them later). */
function registerMeta(sc: Phaser.Scene, key: string, type: FootType, classic: boolean): string[] {
  const t = classic ? drawFoot(type, undefined, true) : footMeta[type.id]?.textures ?? drawFoot(type);
  const meta: FootMeta = { footKey: `foot_${key}`, legKey: `leg_${key}`, cuffKey: t.cuff ? `cuff_${key}` : undefined, originY: t.originY, footHeight: t.footHeight, halfWidth: t.footHalfWidth, legWidth: t.legWidth, textures: t };
  const keys: string[] = [];
  for (const [k, c] of [[meta.footKey, t.foot], [meta.legKey, t.leg], [meta.cuffKey, t.cuff]] as const)
    if (k && c) {
      if (!sc.textures.exists(k)) sc.textures.addCanvas(k, c);
      keys.push(k);
    }
  // (the sheet's own keys: the game's footMeta for real ids is left as it is)
  if (classic) footMeta[key] = meta;
  return keys;
}

const IMMORTAL_LIVE: Record<string, (f: Foot, dt: number) => void> = { immortal: immortalLive, immortalbrute: bruteLive };

class Showcase extends Phaser.Scene {
  heat = false;
  entries: Entry[] = [];
  scroller!: HTMLElement;
  /** Pairs made this frame (one at a time, so scrolling stays smooth). */
  private built = 0;
  constructor() {
    super('StyleShowcase');
  }
  init(d: { entries: Entry[]; scroller: HTMLElement; heat: boolean }): void {
    this.entries = d.entries;
    this.scroller = d.scroller;
    this.heat = d.heat;
  }
  create(): void {
    const sprites = buildSprites();
    if (!this.textures.exists('shadow')) this.textures.addCanvas('shadow', sprites.shadow);
    this.cameras.main.setZoom(dpr()).setOrigin(0, 0);
  }

  private makePair(e: Entry): void {
    const type = e.type;
    const keys: string[] = [];
    const k = (0.46 / type.scale) * (e.w / CARD_W);
    const layer = this.add.container(e.x + e.w / 2, e.y + 236 * (e.h / CARD_H)).setScale(k);
    // a card higher up the page draws over the legs of the cards below it (legs run up off their cards)
    layer.setDepth(-e.y);
    const shadowL = this.add.container(0, 0);
    layer.add(shadowL);
    const off = (e.w * 0.23) / k;
    let old: Foot | undefined;
    if (e.styled) {
      keys.push(...registerMeta(this, `classic_${e.id}`, type, true));
      old = new Foot(this, layer, shadowL, { ...type, id: `classic_${e.id}` }, -off, { hpMult: 1, speedMult: 1, elite: false, hooks: HOOKS });
    }
    keys.push(...registerMeta(this, e.id, type, false));
    const neu = new Foot(this, layer, shadowL, type, e.styled ? off : 0, { hpMult: 1, speedMult: 1, elite: false, hooks: HOOKS });
    for (const f of [old, neu]) {
      if (!f) continue;
      f.puppet = true;
      f.setState('hover');
      f.cropLeg(((e.y + 4 - layer.y) / k - f.root.y) / f.root.scaleY);
    }
    const label = this.add.text(e.x + e.w / 2, e.y + e.h - 30, e.styled ? 'old  ·  new' : 'unchanged', { fontFamily: 'Fredoka, system-ui, sans-serif', fontSize: '15px', color: '#ffe9c7' }).setOrigin(0.5, 0).setAlpha(0.55).setDepth(-e.y + 0.5);
    e.pair = { old, neu, t: (e.y * 0.0013 + e.x * 0.002) % 3.6, layer, label, keys };
  }

  dropPair(e: Entry): void {
    const p = e.pair;
    if (!p) return;
    p.old?.destroy();
    p.neu.destroy();
    p.layer.destroy();
    p.label.destroy();
    for (const key of p.keys) if (this.textures.exists(key)) this.textures.remove(key);
    // the live layers' textures too (the next visit builds them again)
    for (const key of this.textures.getTextureKeys()) if (/^(body|band|glow|heat|p_.+)$/.test(key.slice(`lk_${e.id}_`.length)) && key.startsWith(`lk_${e.id}_`)) this.textures.remove(key);
    delete footMeta[`classic_${e.id}`];
    e.pair = undefined;
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    const top = this.scroller.scrollTop;
    const vh = this.scroller.clientHeight;
    this.cameras.main.setScroll(0, top);
    this.built = 0;
    // near the view: make its pair (closest first, one a frame); far from it: drop it
    const near = this.entries.filter((e) => e.card.offsetParent && e.y < top + vh + 260 && e.y + e.h > top - 260);
    near.sort((a, b) => Math.abs(a.y - top - vh / 2) - Math.abs(b.y - top - vh / 2));
    for (const e of near) {
      if (e.pair || this.built > 0) continue;
      this.makePair(e);
      this.built++;
    }
    // (?dev&style&keep keeps every pair once made: for recording a smooth scroll after a first pass)
    const far = KEEP ? Infinity : 1400;
    for (const e of this.entries) if (e.pair && (!e.card.offsetParent || e.y > top + vh + far || e.y + e.h < top - far)) this.dropPair(e);
    // the cards coming next: build their live art in idle time
    const soon = this.entries.filter((e) => !e.pair && e.styled && e.card.offsetParent && e.y < top + vh + 900 && e.y + e.h > top - 300).map((e) => e.id);
    if (soon.length) warmLive(this, soon, FOOT_BY_ID);
    for (const e of this.entries) {
      const p = e.pair;
      if (!p) continue;
      // off screen (but kept): don't animate, just keep the legs on their cards
      if (e.y > top + vh + 40 || e.y + e.h < top - 40) {
        for (const f of [p.old, p.neu]) f?.cropLeg(((e.y + 4 - p.layer.y) / p.layer.scaleX - f.root.y) / f.root.scaleY);
        continue;
      }
      p.t = (p.t + dt) % 3.6;
      const k = p.layer.scaleX;
      for (const f of [p.old, p.neu]) {
        if (!f) continue;
        const x0 = !p.old ? 0 : ((f === p.old ? -1 : 1) * e.w * 0.23) / k;
        // the cycle: hover (swaying), wind up, dive, stomp, lift
        const t = p.t;
        const sy = 92 / k;
        let y = 0;
        let st: Foot['state'] = 'hover';
        let vy = 0;
        f.hoverTime = 1.7;
        if (t < 1.7) {
          y = Math.sin(t * 3) * 6;
          f.x = x0 + (Math.sin(t * 2.1) * 14 * e.w) / CARD_W / k;
        } else if (t < 2.05) {
          st = 'descend';
          const u = (t - 1.7) / 0.35;
          y = sy * u * u;
          vy = (2 * sy * u) / 0.35;
        } else if (t < 2.55) {
          st = 'stomp';
          y = sy;
        } else {
          st = 'lift';
          const u = (t - 2.55) / 1.05;
          y = sy * (1 - (1 - (1 - u) * (1 - u)));
          vy = -300;
        }
        if (f.state !== st) f.setState(st);
        else f.stateT = st === 'hover' ? t : f.stateT + dt;
        f.y = y;
        f.vy = vy;
        f.phase = this.heat && f.isBossLike ? 3 : 1;
        f.update(dt, 1);
        if (IMMORTAL_LIVE[f.type.id]) IMMORTAL_LIVE[f.type.id](f, dt);
        else styleLive(f, dt);
        // the leg stops at the card's top (cards above draw over anything that pokes past)
        f.cropLeg(((e.y + 4 - p.layer.y) / k - f.root.y) / f.root.scaleY);
      }
    }
  }
}

const dpr = () => Math.min(2, window.devicePixelRatio || 1);
const KEEP = new URLSearchParams(location.search).has('keep');

/** Every foot in the game, grouped for the sheet: by act, then feet, then bosses and mini-bosses. */
function groups(): { act: number; bossy: boolean; title: string; ids: string[] }[] {
  // ?dev&style&only=bob,harold shows just those feet
  const only = new URLSearchParams(location.search).get('only')?.split(',');
  const all = Object.values(FOOT_BY_ID).filter((t) => !t.id.startsWith('classic_') && (!only || only.includes(t.id)));
  all.sort((a, b) => a.minWave - b.minWave || a.name.localeCompare(b.name));
  const out = new Map<string, { act: number; bossy: boolean; title: string; ids: string[] }>();
  for (const t of all) {
    const act = actOf(Math.max(1, t.minWave));
    const bossy = !!(t.boss || t.mini);
    const key = `${act}:${bossy}`;
    if (!out.has(key)) out.set(key, { act, bossy, title: bossy ? 'Bosses and mini-bosses' : 'Feet', ids: [] });
    out.get(key)!.ids.push(t.id);
  }
  return [...out.values()].sort((a, b) => a.act - b.act || Number(a.bossy) - Number(b.bossy));
}

const SHEET_CSS = `
.ss-wrap{display:flex;flex-direction:column;overflow:hidden}
.ss-scroll{flex:1;overflow:auto;position:relative}
.ss-canvas{position:absolute;left:0;pointer-events:none;z-index:2}
.ss-jump{display:flex;gap:6px;flex-wrap:wrap;padding:8px 16px;background:#3a2418;position:relative;z-index:3}
.ss-jump button{background:#5a3a28;color:#ffe9c7;border:0;border-radius:8px;padding:5px 10px;font:600 13px Fredoka,system-ui,sans-serif;cursor:pointer}
.ss-jump button:hover{background:#7a4a30}
.ss-act{margin:26px 0 4px;font-size:24px;border-bottom:3px solid #2a181033;padding-bottom:4px}
.ss-grp{margin:12px 0 8px;font-size:16px;opacity:.8}
.ss-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
@media (max-width:900px){.ss-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
.ss-fc{position:relative;aspect-ratio:400/380;border-radius:12px;background:radial-gradient(ellipse at 50% 35%,#3a2a44,#1d1422 75%);overflow:hidden}
.ss-fc.boss{background:radial-gradient(ellipse at 50% 35%,#4a2630,#1d1016 75%);box-shadow:inset 0 0 0 2px #ff8a1a55}
.ss-fc .nm{position:absolute;left:8px;top:6px;max-width:calc(100% - 16px);z-index:3;color:#ffe9c7;font:600 14px Fredoka,system-ui,sans-serif;background:#1d1422cc;border-radius:7px;padding:2px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ss-fc .tg{position:absolute;right:8px;bottom:8px;z-index:3;font:600 11px Fredoka,system-ui,sans-serif;color:#1d1422;background:#ffcf6a;border-radius:6px;padding:1px 6px}
.ss-fc .tg.un{background:#9fd8ff}
.ss-wrap.bossonly .ss-feet{display:none}
`;

let io: IntersectionObserver | null = null;
let game: Phaser.Game | null = null;

export function installStyleSheet(): void {
  const style = document.createElement('style');
  style.textContent = CSS + SHEET_CSS;
  document.head.appendChild(style);
  let onResize: (() => void) | null = null;
  const close = () => {
    io?.disconnect();
    game?.destroy(true);
    game = null;
    if (onResize) removeEventListener('resize', onResize);
    document.querySelector('.ss-wrap')?.remove();
  };
  const open = async () => {
    close();
    await (window as unknown as { F?: { boot?: () => Promise<void> } }).F?.boot?.();
    const gs = groups();
    const all = gs.flatMap((g) => g.ids);
    const nBoss = all.filter((id) => FOOT_BY_ID[id].boss).length;
    const nMini = all.filter((id) => FOOT_BY_ID[id].mini).length;
    const nStyled = all.filter((id) => styleFor(id)).length;
    const acts = [...new Set(gs.map((g) => g.act))];
    const wrap = document.createElement('div');
    wrap.className = 'ss-wrap';
    wrap.innerHTML = `<div class="ss-head"><h2>🦶 Feet: before and after</h2><span>${all.length} feet · ${all.length - nBoss - nMini} regular · ${nBoss} bosses · ${nMini} mini-bosses · ${nStyled} redrawn · ${all.length - nStyled} unchanged · textures ${footRes(FOOT_BY_ID.bob)}× (old 1.35×)</span><span class="sp"></span><button class="ss-btn alt" data-bosses>👑 Bosses only</button><button class="ss-btn" data-heat>🔥 Overheat bosses</button><button class="ss-btn alt" data-x>✕ Close</button></div>
      <div class="ss-jump">${acts.map((a) => `<button data-act="${a}">Act ${a}</button>`).join('')}<button data-act="rules">Rules &amp; materials</button><button data-act="thumbs">Peels &amp; portraits</button></div>
      <div class="ss-scroll"><div class="ss-body">
        <p>Every foot, boss and mini-boss in the game: its old art on the left, the redrawn one on the right, both the real Foot and live kit, puppeted through a hover (swaying), the wind-up, the dive, the stomp and the lift. Particles stay in the world, so a moving foot trails them. Only the cards on screen run.</p>
        <div data-groups></div>
        <h3 data-sec="thumbs">Where the art shows outside play</h3><p>Peel thumbnails (the foot's own art, trimmed to fit the emblem), shiny peels, and the Pizzapedia portrait.</p>
        <div class="ss-row" data-thumbs></div>
        <h3 data-sec="rules">The rules</h3><p>One silhouette per foot (a union of parts with one outline); materials, not flat fills; one light for the whole game; detail painted inside the silhouette; constant subtle life.</p>
        <div class="ss-row" data-rules></div>
        <h3>Palette</h3><div data-palette></div>
        <h3>Materials</h3><p>Each sets a ramp, a shadow tint, a texture, a specular response and a rim (src/art/style/materials.ts).</p>
        <div class="ss-row" data-mats></div>
      </div></div><canvas class="ss-canvas"></canvas>`;
    document.body.appendChild(wrap);
    wrap.querySelector('[data-x]')!.addEventListener('click', close);
    const scroller = wrap.querySelector('.ss-scroll') as HTMLElement;
    wrap.querySelector('[data-rules]')!.append(lightCard(), lineCard(), anatomyCard());
    wrap.querySelector('[data-palette]')!.append(paletteRow());
    wrap.querySelector('[data-mats]')!.append(...materialCards());
    // the cards
    const host = wrap.querySelector('[data-groups]')!;
    const entries: Entry[] = [];
    for (const a of acts) {
      const h = document.createElement('h3');
      h.className = 'ss-act';
      h.dataset.sec = String(a);
      h.textContent = actLabel(a);
      host.append(h);
      for (const g of gs.filter((x) => x.act === a)) {
        const sec = document.createElement('div');
        sec.className = g.bossy ? 'ss-bosses' : 'ss-feet';
        const gh = document.createElement('div');
        gh.className = 'ss-grp';
        gh.textContent = `${g.title} (${g.ids.length})`;
        const grid = document.createElement('div');
        grid.className = 'ss-grid';
        for (const id of g.ids) {
          const t = FOOT_BY_ID[id];
          const styled = !!styleFor(id);
          const card = document.createElement('div');
          card.className = `ss-fc${g.bossy ? ' boss' : ''}`;
          card.innerHTML = `<div class="nm"></div>${styled ? '' : '<span class="tg un">unchanged</span>'}${t.boss ? '<span class="tg">boss</span>' : t.mini ? '<span class="tg">mini-boss</span>' : ''}`;
          card.querySelector('.nm')!.textContent = t.name;
          grid.append(card);
          entries.push({ id, type: t, styled, bossy: g.bossy, card, x: 0, y: 0, w: 0, h: 0 });
        }
        sec.append(gh, grid);
        host.append(sec);
      }
    }
    // thumbnails, made as they scroll into view
    const thumbs = wrap.querySelector('[data-thumbs]')!;
    io = new IntersectionObserver((es) => {
      for (const e of es) {
        if (!e.isIntersecting) continue;
        const d = e.target as HTMLElement;
        io?.unobserve(d);
        const id = d.dataset.id!;
        const t = FOOT_BY_ID[id];
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
      }
    }, { root: scroller, rootMargin: '300px' });
    for (const id of all) {
      const d = document.createElement('div');
      d.style.cssText = 'display:flex;gap:6px;align-items:flex-end;min-height:160px;min-width:200px';
      d.dataset.id = id;
      thumbs.append(card(FOOT_BY_ID[id].name, 'peel · shiny peel · Pizzapedia', d));
      io.observe(d);
    }
    // the showcase game over the page
    const canvas = wrap.querySelector('.ss-canvas') as HTMLCanvasElement;
    const layout = () => {
      const sr = scroller.getBoundingClientRect();
      for (const e of entries) {
        const r = e.card.getBoundingClientRect();
        e.x = r.left - sr.left;
        e.y = r.top - sr.top + scroller.scrollTop;
        e.w = r.width;
        e.h = r.height;
      }
      canvas.style.top = `${scroller.offsetTop}px`;
    };
    layout();
    const vw = scroller.clientWidth;
    const vh = scroller.clientHeight;
    canvas.style.width = `${vw}px`;
    canvas.style.height = `${vh}px`;
    game = new Phaser.Game({ type: Phaser.WEBGL, canvas, width: vw * dpr(), height: vh * dpr(), transparent: true, scene: [], audio: { noAudio: true }, banner: false, scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr() } });
    game.scene.add('StyleShowcase', Showcase, true, { entries, scroller, heat: false });
    // dev hooks for profiling and checks from the console
    Object.assign(window, { __styleGame: game, __sheetKit: { prewarmLive, drawFoot, FOOT_BY_ID, styleFor, resolvedLeg, peelThumbURL, footPortraitURL } });
    const relayout = () => {
      layout();
      // pairs were laid out for the old boxes: make them again
      const sc = game?.scene.getScene('StyleShowcase') as Showcase | undefined;
      if (sc) for (const e of entries) if (e.pair) sc.dropPair(e);
    };
    onResize = () => {
      game?.scale.resize(scroller.clientWidth * dpr(), scroller.clientHeight * dpr());
      canvas.style.width = `${scroller.clientWidth}px`;
      canvas.style.height = `${scroller.clientHeight}px`;
      relayout();
    };
    addEventListener('resize', onResize);
    // fonts and thumbnails can shift the layout after the first pass
    setTimeout(relayout, 1200);
    wrap.querySelector('.ss-jump')!.addEventListener('click', (ev) => {
      const a = (ev.target as HTMLElement).dataset.act;
      if (!a) return;
      const el = wrap.querySelector(`[data-sec="${a}"]`) as HTMLElement | null;
      if (el) scroller.scrollTo({ top: el.offsetTop - 8, behavior: 'smooth' });
    });
    wrap.querySelector('[data-heat]')!.addEventListener('click', (e) => {
      const sc = game?.scene.getScene('StyleShowcase') as Showcase | undefined;
      if (!sc) return;
      sc.heat = !sc.heat;
      (e.target as HTMLElement).classList.toggle('on', sc.heat);
    });
    wrap.querySelector('[data-bosses]')!.addEventListener('click', (e) => {
      const on = wrap.classList.toggle('bossonly');
      (e.target as HTMLElement).classList.toggle('on', on);
      relayout();
    });
  };
  const add = () => {
    const fab = document.querySelector('.bl-fab');
    if (!fab) return void setTimeout(add, 300);
    const b = document.createElement('button');
    b.textContent = '🦶 Style';
    b.title = 'The feet style sheet: every foot old vs new, alive; rules and materials';
    b.addEventListener('click', () => void open());
    fab.appendChild(b);
  };
  add();
  if (new URLSearchParams(location.search).has('style')) setTimeout(() => void open(), 600);
}

export { liveOf, pose };
