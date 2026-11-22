// Dev-only style sheet for the feet redesign (the style kit in src/art/style, the live kit in src/game/liveKit.ts):
// the one light, the line, the palette, the shared anatomy and its rig band, every material, and each redrawn foot
// next to its still art, alive (the real Foot and live kit, puppeted through hover, wind-up, dive, stomp and lift).
// Open it with the floating "🦶 Style" button or ?dev&style.

import Phaser from 'phaser';
import { overrideFeetAnim } from './systems/graphics';
import { CX } from './art/feetCommon';
import { FOOT_FRAME, drawFoot, resolvedLeg } from './art/feetArt';
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
  /** What the card's buttons asked for (kept when the pair is dropped and made again). */
  ctl: Ctl;
  /** Card box in the scroller's content (css px). */
  x: number;
  y: number;
  w: number;
  h: number;
  pair?: Pair;
}

/** A card's controls: the move it plays (the whole cycle, or one move and then a rest) and its effects. */
interface Ctl {
  /** 'loop' runs the cycle; otherwise play [from, to) of it once, then rest: on the ground after a dive or stomp,
   * hovering otherwise. */
  move: 'loop' | 'once';
  from: number;
  to: number;
  rest: 'hover' | 'ground';
  fx: Set<string>;
  /** Set by a button: something to do to the feet on the next frame. */
  poke?: 'hit' | 'die' | 'escape' | 'gdrop' | 'gcrack' | 'gbreak' | 'grearm';
}

const newCtl = (): Ctl => ({ move: 'loop', from: 0, to: 3.6, rest: 'hover', fx: new Set() });

/** The cycle's moves (seconds into it). */
const MOVES: Record<string, { from: number; to: number; rest: 'hover' | 'ground'; label: string }> = {
  hover: { from: 0, to: 0, rest: 'hover', label: 'Hover' },
  windup: { from: 1.15, to: 1.7, rest: 'hover', label: 'Wind-up' },
  dive: { from: 1.15, to: 2.05, rest: 'ground', label: 'Dive' },
  stomp: { from: 1.7, to: 2.55, rest: 'ground', label: 'Stomp' },
  lift: { from: 2.55, to: 3.6, rest: 'hover', label: 'Lift' },
};
const EFFECTS: Record<string, string> = { stun: 'Stunned', frozen: 'Frozen', slow: 'Slowed', burn: 'Burning', elite: 'Elite', shiny: 'Shiny', heat: 'Overheat', aura: 'Aura' };

interface Pair {
  old?: Foot;
  neu: Foot;
  t: number;
  /** Resting (after a single move): seconds into the rest. */
  restT?: number;
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
    // the stun stars
    if (!this.textures.exists('star5')) this.textures.addCanvas('star5', sprites.star5);
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
    keys.push(...registerMeta(this, e.id, type, false));
    // left: the foot as the game shows it with Animated feet off (its still art); right: alive
    if (e.styled || IMMORTAL_LIVE[e.id]) {
      old = new Foot(this, layer, shadowL, type, -off, { hpMult: 1, speedMult: 1, elite: ELITE || e.ctl.fx.has('elite'), hooks: HOOKS });
      old.forceStill = true;
    }
    const neu = new Foot(this, layer, shadowL, type, old ? off : 0, { hpMult: 1, speedMult: 1, elite: ELITE || e.ctl.fx.has('elite'), hooks: HOOKS });
    for (const f of [old, neu]) {
      if (!f) continue;
      f.puppet = true;
      f.setState('hover');
      if (e.ctl.fx.has('shiny')) f.makeShiny();
      if (e.ctl.fx.has('aura')) f.setPhaseAura(0xff2a2a);
      f.cropLeg(((e.y + 4 - layer.y) / k - f.root.y) / f.root.scaleY);
    }
    const label = this.add.text(e.x + e.w / 2, e.y + e.h - 30, old ? 'still  ·  animated' : 'not redrawn', { fontFamily: 'Fredoka, system-ui, sans-serif', fontSize: '15px', color: '#ffe9c7' }).setOrigin(0.5, 0).setAlpha(0.55).setDepth(-e.y + 0.5);
    e.pair = { old, neu, t: e.ctl.move === 'loop' ? (e.y * 0.0013 + e.x * 0.002) % 3.6 : e.ctl.to, restT: e.ctl.move === 'loop' ? undefined : 0, layer, label, keys };
  }

  /** Keep the feet's statuses as the card's effect buttons say (long timers, refreshed every frame). */
  private applyFx(f: Foot, fx: Set<string>): void {
    const stun = fx.has('stun') || fx.has('frozen');
    if (stun) {
      if (f.stunT < 1) f.stun(60, fx.has('frozen'));
    } else if (f.stunT > 0) f.stunT = 0.0001;
    const slow = fx.has('slow') ? 60 : 0;
    const burn = fx.has('burn') ? 60 : 0;
    if ((slow > 0) !== (f.slowT > 0) || (burn > 0) !== (f.burnT > 0)) {
      f.slowT = slow;
      f.burnT = burn;
      f.burnDps = 0;
      f.clearTint();
    }
  }

  /** A one-off from a button: a hit (flash and a flinch), a death or an escape (the pair is made again after). */
  private pokeFeet(e: Entry, what: NonNullable<Ctl['poke']>): void {
    e.ctl.poke = undefined;
    const p = e.pair;
    if (!p) return;
    for (const f of [p.old, p.neu]) {
      if (!f || !f.alive) continue;
      // the guard shield (src/game/guardShield.ts): drop it now (a shield on a beat), a blocked smack, break it, skip to
      // the end of the wait for a new one
      if (what === 'gdrop') {
        if (f.guardUp) f.guardT = Math.max(f.guardT, f.guardNext - f.guardWarnTime);
        continue;
      }
      if (what === 'gcrack' || what === 'gbreak') {
        if (f.guardBroken) continue;
        f.guardOpen = 0;
        do f.flash(0x9ad8ff, 80);
        while (!f.guardBlock() && what === 'gbreak');
        f.knock(80);
        continue;
      }
      if (what === 'grearm') {
        // skip to just before it reaches back for its new shield
        if (f.guardBroken) f.guardIdle = Math.max(f.guardIdle, f.guardRearmAfter - 1.6);
        continue;
      }
      if (what === 'hit') {
        f.flash(0xffffff, 90);
        const sx = f.root.scaleX;
        this.tweens.add({ targets: f.root, scaleY: { from: sx * 0.86, to: sx }, scaleX: { from: sx * 1.06, to: sx }, duration: 240, ease: 'Back.Out' });
      } else if (what === 'die') f.die(f.isBossLike);
      else f.escape();
    }
    if (what !== 'hit') this.time.delayedCall(e.type.boss ? 2400 : 1500, () => this.dropPair(e));
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
    e.pair = undefined;
  }

  update(_time: number, delta: number): void {
    // ?slow=0.25 plays everything at a quarter speed (frame sheets of quick moves)
    this.tweens.timeScale = SLOW;
    this.time.timeScale = SLOW;
    const dt = Math.min(0.05, delta / 1000) * SLOW;
    const top = this.scroller.scrollTop;
    const vh = this.scroller.clientHeight;
    this.cameras.main.setScroll(0, top);
    // the canvas lives in the scrolled content, placed where this frame's view is: between frames the browser
    // scrolls it with the cards (on the compositor), so the feet never lag behind their cards while scrolling
    this.game.canvas.style.top = `${top}px`;
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
        for (const f of [p.old, p.neu]) if (f?.alive) f.cropLeg(((e.y + 4 - p.layer.y) / p.layer.scaleX - f.root.y) / f.root.scaleY);
        continue;
      }
      const c = e.ctl;
      if (c.move === 'loop') p.t = (p.t + dt) % 3.6;
      else if (p.restT === undefined) {
        p.t += dt;
        if (p.t >= c.to) p.restT = 0;
      } else p.restT += dt;
      const resting = c.move === 'once' && p.restT !== undefined;
      const k = p.layer.scaleX;
      if (c.poke) this.pokeFeet(e, c.poke);
      if (!e.pair) continue;
      for (const f of [p.old, p.neu]) {
        if (!f || !f.alive) continue;
        this.applyFx(f, c.fx);
        const x0 = !p.old ? 0 : ((f === p.old ? -1 : 1) * e.w * 0.23) / k;
        // the cycle: hover (swaying), wind up, dive, stomp, lift
        // resting: a slow hover sway (never long enough to wind up), or standing on the ground
        const t = resting ? (c.rest === 'ground' ? 2.3 : (p.restT! % 1.1)) : p.t;
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
        if (resting && c.rest === 'hover') f.x = x0 + (Math.sin(p.restT! * 2.1) * 14 * e.w) / CARD_W / k;
        f.y = y;
        f.vy = vy;
        const hot = this.heat || c.fx.has('heat');
        f.phase = hot && f.isBossLike ? 3 : 1;
        f.enraged = hot && !f.isBossLike;
        f.update(dt, 1);
        if (IMMORTAL_LIVE[f.type.id]) IMMORTAL_LIVE[f.type.id](f, dt);
        else styleLive(f, dt);
        // the leg stops at the card's top (cards above draw over anything that pokes past)
        f.cropLeg(((e.y + 4 - p.layer.y) / k - f.root.y) / f.root.scaleY);
      }
    }
  }
}

/** A card's buttons: its moves (play one, or loop them all) and effects (toggles). */
function controls(e: Entry, scene: () => Showcase | undefined): HTMLElement {
  const box = document.createElement('div');
  box.className = 'ss-ctl';
  const chip = (label: string, data: string, on = false) => `<button class="${on ? 'on' : ''}" data-${data}>${label}</button>`;
  box.innerHTML =
    `<div>${chip('↻ Loop', 'loop', true)}${Object.entries(MOVES).map(([k, m]) => chip(m.label, `mv="${k}"`)).join('')}${chip('Hit', 'poke="hit"')}${chip('Die', 'poke="die"')}${chip('Escape', 'poke="escape"')}</div>` +
    (e.type.traits.includes('guard') ? `<div>${chip('🛡 Drop', 'poke="gdrop"')}${chip('🛡 Crack', 'poke="gcrack"')}${chip('🛡 Break', 'poke="gbreak"')}${chip('🛡 Re-arm', 'poke="grearm"')}</div>` : '') +
    `<div>${Object.entries(EFFECTS).map(([k, l]) => chip(l, `fx="${k}"`)).join('')}</div>`;
  const moveBtns = () => box.querySelectorAll<HTMLElement>('[data-loop],[data-mv]');
  box.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest('button');
    if (!b) return;
    const c = e.ctl;
    const p = e.pair;
    if (b.dataset.loop !== undefined) {
      c.move = 'loop';
      if (p) p.restT = undefined;
      moveBtns().forEach((x) => x.classList.toggle('on', x === b));
    } else if (b.dataset.mv) {
      const m = MOVES[b.dataset.mv];
      Object.assign(c, { move: 'once', from: m.from, to: m.to, rest: m.rest });
      if (p) {
        p.t = m.from;
        p.restT = m.to <= m.from ? 0 : undefined;
      }
      moveBtns().forEach((x) => x.classList.toggle('on', x === b));
    } else if (b.dataset.poke) c.poke = b.dataset.poke as Ctl['poke'];
    else if (b.dataset.fx) {
      const k = b.dataset.fx;
      const on = !c.fx.has(k);
      if (on) c.fx.add(k);
      else c.fx.delete(k);
      b.classList.toggle('on', on);
      // elite, shiny and the aura are set when a foot is made (shiny can't be taken off): make the pair again
      if (['elite', 'shiny', 'aura'].includes(k)) scene()?.dropPair(e);
    }
  });
  return box;
}

const dpr = () => Math.min(2, window.devicePixelRatio || 1);
const KEEP = new URLSearchParams(location.search).has('keep');
const SLOW = Number(new URLSearchParams(location.search).get('slow') ?? 1) || 1;
// ?elite: draw the new feet as elites (their pink glow)
const ELITE = new URLSearchParams(location.search).has('elite');

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
.ss-jump button:hover{background:#7a4a30}.ss-jump button.on{background:#ff8a1a;color:#2a1810}
.ss-act{margin:26px 0 4px;font-size:24px;border-bottom:3px solid #2a181033;padding-bottom:4px}
.ss-grp{margin:12px 0 8px;font-size:16px;opacity:.8}
.ss-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
@media (max-width:900px){.ss-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
.ss-fc{position:relative;aspect-ratio:400/380;border-radius:12px;background:radial-gradient(ellipse at 50% 35%,#3a2a44,#1d1422 75%);overflow:hidden}
.ss-fc.boss{background:radial-gradient(ellipse at 50% 35%,#4a2630,#1d1016 75%);box-shadow:inset 0 0 0 2px #ff8a1a55}
.ss-fc .nm{position:absolute;left:8px;top:6px;max-width:calc(100% - 16px);z-index:3;color:#ffe9c7;font:600 14px Fredoka,system-ui,sans-serif;background:#1d1422cc;border-radius:7px;padding:2px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ss-fc .tg{position:absolute;right:8px;bottom:8px;z-index:3;font:600 11px Fredoka,system-ui,sans-serif;color:#1d1422;background:#ffcf6a;border-radius:6px;padding:1px 6px}
.ss-fc .tg.un{background:#9fd8ff}
.ss-ctl{display:flex;flex-direction:column;gap:3px;margin-top:5px}
.ss-ctl div{display:flex;flex-wrap:wrap;gap:3px}
.ss-ctl button{background:#5a3a28;color:#ffe9c7;border:0;border-radius:6px;padding:2px 7px;font:600 11px Fredoka,system-ui,sans-serif;cursor:pointer}
.ss-ctl button:hover{background:#7a4a30}.ss-ctl button.on{background:#ff8a1a;color:#1d1422}
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
    overrideFeetAnim(null);
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
    const acts = [...new Set(gs.map((g) => g.act))];
    const wrap = document.createElement('div');
    wrap.className = 'ss-wrap';
    wrap.innerHTML = `<div class="ss-head"><h2>🦶 Feet: still and animated</h2><span>${all.length} feet · ${all.length - nBoss - nMini} regular · ${nBoss} bosses · ${nMini} mini-bosses</span><span class="sp"></span><button class="ss-btn alt" data-bosses>👑 Bosses only</button><button class="ss-btn" data-heat>🔥 Overheat bosses</button><button class="ss-btn alt" data-x>✕ Close</button></div>
      <div class="ss-jump">${acts.map((a) => `<button data-act="${a}">Act ${a}</button>`).join('')}<button data-act="rules">Rules &amp; materials</button><button data-act="thumbs">Peels &amp; portraits</button></div>
      <div class="ss-scroll"><div class="ss-body">
        <p>Every foot, boss and mini-boss in the game: its still art on the left (what the game shows with Animated feet off), alive on the right, both the real Foot and live kit, puppeted through a hover (swaying), the wind-up, the dive, the stomp and the lift. Particles stay in the world, so a moving foot trails them. Only the cards on screen run. The buttons under each card play one move at a time (or loop them), a hit, a death or an escape, and toggle its effects: stunned, frozen, slowed, burning, elite, shiny, overheat and a phase aura.</p>
        <div data-groups></div>
        <div class="ss-sec" data-tab="thumbs"><h3 data-sec="thumbs">Where the art shows outside play</h3><p>Peel thumbnails (the foot's own art, trimmed to fit the emblem), shiny peels, and the Pizzapedia portrait.</p>
        <div class="ss-row" data-thumbs></div></div>
        <div class="ss-sec" data-tab="rules"><h3 data-sec="rules">The rules</h3><p>One silhouette per foot (a union of parts with one outline); materials, not flat fills; one light for the whole game; detail painted inside the silhouette; constant subtle life.</p>
        <div class="ss-row" data-rules></div>
        <h3>Palette</h3><div data-palette></div>
        <h3>Materials</h3><p>Each sets a ramp, a shadow tint, a texture, a specular response and a rim (src/art/style/materials.ts).</p>
        <div class="ss-row" data-mats></div></div>
      <canvas class="ss-canvas"></canvas></div></div>`;
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
      const actSec = document.createElement('div');
      actSec.className = 'ss-sec';
      actSec.dataset.tab = String(a);
      host.append(actSec);
      const h = document.createElement('h3');
      h.className = 'ss-act';
      h.dataset.sec = String(a);
      h.textContent = actLabel(a);
      actSec.append(h);
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
          card.innerHTML = `<div class="nm"></div>${styled ? '' : IMMORTAL_LIVE[id] ? '<span class="tg un" style="right:auto;left:8px">own live art</span>' : '<span class="tg un">unchanged</span>'}${t.boss ? '<span class="tg">boss</span>' : t.mini ? '<span class="tg">mini-boss</span>' : ''}`;
          card.querySelector('.nm')!.textContent = t.name;
          const cell = document.createElement('div');
          const ent: Entry = { id, type: t, styled, bossy: g.bossy, card, ctl: newCtl(), x: 0, y: 0, w: 0, h: 0 };
          cell.append(card, controls(ent, () => game?.scene.getScene('StyleShowcase') as Showcase | undefined));
          grid.append(cell);
          entries.push(ent);
        }
        sec.append(gh, grid);
        actSec.append(sec);
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
    // tabs: one act (or the rules, or the peels) at a time; only its cards are made
    const showTab = (t: string) => {
      for (const el of wrap.querySelectorAll<HTMLElement>('.ss-sec')) el.hidden = el.dataset.tab !== t;
      for (const b of wrap.querySelectorAll<HTMLElement>('.ss-jump button')) b.classList.toggle('on', b.dataset.act === t);
      scroller.scrollTop = 0;
      try {
        localStorage.setItem('feetza.styleTab', t);
      } catch {
        /* private mode */
      }
      relayout();
    };
    wrap.querySelector('.ss-jump')!.addEventListener('click', (ev) => {
      const a = (ev.target as HTMLElement).closest('button')?.dataset.act;
      if (a) showTab(a);
    });
    let firstTab = String(acts[0]);
    try {
      const t = localStorage.getItem('feetza.styleTab');
      if (t && wrap.querySelector(`.ss-sec[data-tab="${t}"]`)) firstTab = t;
    } catch {
      /* private mode */
    }
    showTab(firstTab);
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
