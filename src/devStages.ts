// (One backdrop at a time now: picked from a list, with wave buttons; everything on screen used to run at once.)
// Dev-only before/after page for the locations redrawn with the location kit (src/art/scene): every location and
// arena in the game, the redrawn ones old next to new. Each card is the real BackdropView (painted backdrop, glows,
// ambient particles and live layer) with a sample table of pizzas and a couple of feet over it, so a place is judged
// in play. Redrawn cards cycle through the stage's 5 waves (weather and light change across a stage); "Still" shows
// what Animated stages off looks like. Only on-screen cards run. Open it with the floating "🏞 Stages" button or
// ?dev&stages (&only=trattoria,beach picks cards; &wave=3 holds a wave; &still starts still).

import Phaser from 'phaser';
import { BACKDROPS, type BackdropId, isRedrawn } from './art/backdrops';
import { buildSprites } from './art/sprites';
import { HOVER_Y, PIZZA_Y } from './config';
import { FOOT_BY_ID } from './data/feet';
import { PIZZA_BY_ID } from './data/pizzas';
import { STAGES, WAVES_PER_STAGE } from './data/stages';
import { BackdropView } from './game/BackdropView';
import { Foot, type FootHooks } from './game/Foot';
import { Pizza } from './game/Pizza';
import { footMeta, pizzaTops } from './game/assets';
import { styleLive } from './game/liveKit';
import { overrideBackdropAnim } from './systems/graphics';
import './content/styleLive';

const W = 1920;
const q = new URLSearchParams(location.search);

const CSS = `
.sg-wrap{position:fixed;inset:0;z-index:9999;background:#1d1422;display:flex;flex-direction:column;font:15px Fredoka,system-ui,sans-serif;color:#ffe9c7}
.sg-head{background:#2a1810;display:flex;gap:10px;align-items:center;padding:10px 16px;flex-wrap:wrap;position:relative;z-index:3}
.sg-head h2{margin:0;font-size:20px}.sg-head .sp{flex:1}
.sg-btn{background:#d9442b;color:#fff;border:0;border-radius:9px;padding:7px 12px;font:600 14px Fredoka,system-ui,sans-serif;cursor:pointer}
.sg-btn.alt{background:#5a3a28}.sg-btn.on{background:#ff8a1a;color:#1d1422}
.sg-jump{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:8px 16px;background:#3a2418;position:relative;z-index:3}
.sg-jump button{background:#5a3a28;color:#ffe9c7;border:0;border-radius:8px;padding:5px 10px;font:600 13px Fredoka,system-ui,sans-serif;cursor:pointer}
.sg-scroll{flex:1;overflow:auto;position:relative}
.sg-canvas{position:absolute;left:0;pointer-events:none;z-index:2}
.sg-body{padding:10px 16px 60px;max-width:1560px;margin:0 auto}
.sg-body p{max-width:960px;line-height:1.45;margin:6px 0 12px;opacity:.9}
.sg-sec{margin:26px 0 8px;font-size:22px;border-bottom:3px solid #ffe9c722;padding-bottom:4px}
.sg-row{margin:0 0 22px}
.sg-row h4{margin:6px 0;font-size:16px;display:flex;gap:10px;align-items:baseline}
.sg-row h4 small{opacity:.65;font-weight:400}
.sg-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}.sg-pair.one{grid-template-columns:minmax(0,1100px)}
.sg-jump select{background:#5a3a28;color:#ffe9c7;border:0;border-radius:8px;padding:5px 8px;font:600 13px Fredoka,system-ui,sans-serif;max-width:340px}
.sg-jump .sp{flex:1}.sg-jump button.on{background:#ff8a1a;color:#1d1422}
.sg-body h4{margin:6px 0 10px;font-size:18px}.sg-body h4 small{opacity:.65;font-weight:400;font-size:13px}
.sg-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
@media (max-width:900px){.sg-pair,.sg-grid{grid-template-columns:1fr}}
.sg-card{position:relative;aspect-ratio:16/9;border-radius:10px;background:#000;overflow:hidden}
.sg-card .tg{position:absolute;left:8px;top:6px;z-index:3;font:600 12px Fredoka,system-ui,sans-serif;background:#1d1422cc;border-radius:6px;padding:2px 8px}
.sg-card .tg.new{background:#ff8a1acc;color:#1d1422}
.sg-card .wv{position:absolute;right:8px;top:6px;z-index:3;font:600 12px Fredoka,system-ui,sans-serif;background:#1d1422cc;border-radius:6px;padding:2px 8px}
.sg-cap{font-size:12px;opacity:.7;margin-top:4px}
`;

interface Card {
  id: BackdropId;
  variant?: 'legacy';
  /** Cycles the stage's waves. */
  cycle: boolean;
  el: HTMLElement;
  wv: HTMLElement;
  x: number;
  y: number;
  w: number;
  h: number;
  live?: Live;
}

interface Live {
  root: Phaser.GameObjects.Container;
  view: BackdropView;
  pizzas: Pizza[];
  feet: Foot[];
  mask: Phaser.GameObjects.Graphics;
  t: number;
  wave: number;
}

const HOOKS: FootHooks = { onStomp: () => {}, pickTarget: () => null, onEscape: () => {} };
const PIZZAS = ['margherita', 'pepperoni', 'funghi'];
/** A couple of feet per card: one from the place's own act where it has one. */
const FEET = ['bob', 'harold'];
const dpr = () => Math.min(2, window.devicePixelRatio || 1);
const WAVE_SECONDS = 5;

class Gallery extends Phaser.Scene {
  cards: Card[] = [];
  scroller!: HTMLElement;
  holdWave = Number(q.get('wave')) || 0;
  private built = 0;
  constructor() {
    super('StageGallery');
  }
  init(d: { cards: Card[]; scroller: HTMLElement }): void {
    this.cards = d.cards;
    this.scroller = d.scroller;
  }
  create(): void {
    for (const [k, c] of Object.entries(buildSprites())) if (!this.textures.exists(k)) this.textures.addCanvas(k, c);
    for (const id of FEET) {
      const m = footMeta[id];
      if (!m) continue;
      for (const [key, c] of [[m.footKey, m.textures.foot], [m.legKey, m.textures.leg], [m.cuffKey, m.textures.cuff]] as const) if (key && c && !this.textures.exists(key)) this.textures.addCanvas(key, c);
    }
    this.cameras.main.setZoom(dpr()).setOrigin(0, 0);
  }

  private build(c: Card): void {
    const k = c.w / W;
    const root = this.add.container(c.x, c.y).setScale(k);
    const bg = this.add.container(0, 0);
    const ambient = this.add.container(0, 0);
    const table = this.add.container(0, 0);
    const feetL = this.add.container(0, 0);
    const shadowL = this.add.container(0, 0);
    root.add([bg, ambient, table, shadowL, feetL]);
    const view = new BackdropView(this, bg, ambient, c.variant);
    const wave = this.holdWave || 1;
    view.setWave(wave);
    view.show(c.id);
    // the sample table: three pizzas where the game puts them, two feet hovering over them
    const pizzas = PIZZAS.filter((id) => PIZZA_BY_ID[id] && pizzaTops[id]).map((id, i) => new Pizza(this, table, PIZZA_BY_ID[id], W / 2 + (i - 1) * 520, PIZZA_Y, 0.8, 8));
    const feet = FEET.filter((id) => FOOT_BY_ID[id] && footMeta[id]).map((id, i) => {
      const f = new Foot(this, feetL, shadowL, FOOT_BY_ID[id], i ? 1460 : 470, { hpMult: 1, speedMult: 1, elite: false, hooks: HOOKS });
      f.puppet = true;
      f.setState('hover');
      return f;
    });
    const mask = this.make.graphics({}, false);
    mask.fillStyle(0xffffff).fillRect(c.x, c.y, c.w, c.h);
    root.setMask(mask.createGeometryMask());
    c.live = { root, view, pizzas, feet, mask, t: (c.y * 0.001) % WAVE_SECONDS, wave };
    c.wv.textContent = c.cycle ? `stage wave ${wave} of ${WAVES_PER_STAGE}` : '';
  }

  drop(c: Card): void {
    const l = c.live;
    if (!l) return;
    l.view.destroy();
    for (const p of l.pizzas) p.destroy?.();
    for (const f of l.feet) f.destroy();
    l.root.clearMask(true);
    l.root.destroy();
    l.mask.destroy();
    c.live = undefined;
    // the backdrop's textures go too (the next visit paints them again)
    for (const key of this.textures.getTextureKeys()) if (key === `bg_${c.id}` || key === `bg_legacy_${c.id}` || key.startsWith(`bgk_${c.id}_`)) this.textures.remove(key);
  }

  update(_t: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    const top = this.scroller.scrollTop;
    const vh = this.scroller.clientHeight;
    this.cameras.main.setScroll(0, top);
    this.game.canvas.style.top = `${top}px`;
    this.built = 0;
    const near = this.cards.filter((c) => c.y < top + vh + 200 && c.y + c.h > top - 200);
    near.sort((a, b) => Math.abs(a.y - top - vh / 2) - Math.abs(b.y - top - vh / 2));
    for (const c of near) {
      if (c.live || this.built > 0) continue;
      this.build(c);
      this.built++;
    }
    for (const c of this.cards) if (c.live && (c.y > top + vh + 900 || c.y + c.h < top - 900)) this.drop(c);
    for (const c of this.cards) {
      const l = c.live;
      if (!l || c.y > top + vh || c.y + c.h < top) continue;
      l.t += dt;
      if (c.cycle && !this.holdWave && l.t > WAVE_SECONDS) {
        l.t = 0;
        l.wave = (l.wave % WAVES_PER_STAGE) + 1;
        l.view.setWave(l.wave);
        c.wv.textContent = `stage wave ${l.wave} of ${WAVES_PER_STAGE}`;
      }
      l.view.update(dt);
      for (const p of l.pizzas) p.update(dt, null, 0);
      l.feet.forEach((f, i) => {
        f.y = HOVER_Y - 20 + Math.sin(l.t * 2 + i * 2) * 10 + i * 50;
        f.x = (i ? 1460 : 470) + Math.sin(l.t * 1.3 + i) * 30;
        f.update(dt, 1);
        styleLive(f, dt);
      });
    }
  }
}

/** Every backdrop in journey order: each stage's location, its boss's arena and its mini-boss's (if it has one),
 * then the rest (nemesis stages and arenas). */
function ordered(): BackdropId[] {
  const out: BackdropId[] = [];
  const add = (id: string | undefined) => {
    if (id && BACKDROPS[id as BackdropId] && !out.includes(id as BackdropId)) out.push(id as BackdropId);
  };
  for (const s of STAGES) {
    add(s.location);
    add(s.mini);
    add(s.boss);
  }
  for (const id of Object.keys(BACKDROPS)) add(id);
  return out;
}

function waveRange(id: BackdropId): string {
  const i = STAGES.findIndex((s) => s.location === id || s.boss === id);
  if (i < 0) return BACKDROPS[id].subtitle;
  const a = i * WAVES_PER_STAGE + 1;
  return STAGES[i].location === id ? `Waves ${a}–${a + 3} (stage waves 1–4; on this page 5 shows where the light ends up)` : `Wave ${a + 4} · ${BACKDROPS[id].subtitle}`;
}

let game: Phaser.Game | null = null;

const lsGet = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const lsSet = (k: string, v: string): void => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode */
  }
};

export function installStageSheet(): void {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  let onResize: (() => void) | null = null;
  const close = () => {
    overrideBackdropAnim(null);
    game?.destroy(true);
    game = null;
    if (onResize) removeEventListener('resize', onResize);
    document.querySelector('.sg-wrap')?.remove();
  };
  const open = async () => {
    close();
    await (window as unknown as { F?: { boot?: () => Promise<void> } }).F?.boot?.();
    const only = q.get('only')?.split(',');
    const all = ordered().filter((id) => !only || only.includes(id));
    const redrawn = all.filter((id) => isRedrawn(id));
    const rest = all.filter((id) => !isRedrawn(id));
    // one backdrop at a time (old next to new when it's been redrawn): picked from the list, remembered
    let cur: BackdropId = (q.get('only')?.split(',')[0] as BackdropId) || (lsGet('feetza.stageId') as BackdropId) || redrawn[0] || all[0];
    if (!all.includes(cur)) cur = redrawn[0] ?? all[0];
    const opt = (id: BackdropId) => `<option value="${id}">${BACKDROPS[id].name} (${id})</option>`;
    const wrap = document.createElement('div');
    wrap.className = 'sg-wrap';
    wrap.innerHTML = `<div class="sg-head"><h2>🏞 Stages</h2><span>${all.length} backdrops · ${redrawn.length} redrawn</span><span class="sp"></span><button class="sg-btn alt" data-still>🖼 Still</button><button class="sg-btn alt" data-x>✕ Close</button></div>
      <div class="sg-jump"><button data-prev>◀</button><select data-pick><optgroup label="Redrawn">${redrawn.map(opt).join('')}</optgroup><optgroup label="Not redrawn yet">${rest.map(opt).join('')}</optgroup></select><button data-next>▶</button>
        <span class="sp"></span><span data-waves>Wave: ${[1, 2, 3, 4, 5].map((w) => `<button data-w="${w}">${w}</button>`).join('')}<button data-w="0">↻ Cycle</button></span>
        <span>Show: <button data-v="both">Old + new</button><button data-v="new">New only</button></span></div>
      <div class="sg-scroll"><div class="sg-body"><h4 data-title></h4><div class="sg-pair" data-pair></div><canvas class="sg-canvas"></canvas></div></div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('[data-x]')!.addEventListener('click', close);
    const scroller = wrap.querySelector('.sg-scroll') as HTMLElement;
    const pick = wrap.querySelector('[data-pick]') as HTMLSelectElement;
    let view: 'both' | 'new' = lsGet('feetza.stageView') === 'new' ? 'new' : 'both';
    const cards: Card[] = [];
    const card = (id: BackdropId, variant: 'legacy' | undefined, label: string, cls: string, cycle: boolean): HTMLElement => {
      const el = document.createElement('div');
      el.className = 'sg-card';
      el.innerHTML = `<span class="tg ${cls}"></span><span class="wv"></span>`;
      el.querySelector('.tg')!.textContent = label;
      cards.push({ id, variant, cycle, el, wv: el.querySelector('.wv') as HTMLElement, x: 0, y: 0, w: 0, h: 0 });
      return el;
    };
    const canvas = wrap.querySelector('.sg-canvas') as HTMLCanvasElement;
    const layout = () => {
      const sr = scroller.getBoundingClientRect();
      for (const c of cards) {
        const r = c.el.getBoundingClientRect();
        c.x = r.left - sr.left;
        c.y = r.top - sr.top + scroller.scrollTop;
        c.w = r.width;
        c.h = r.height;
      }
    };
    const scene = () => game?.scene.getScene('StageGallery') as Gallery | undefined;
    /** Show the picked backdrop: drop the old cards (textures and all), make the new ones. */
    const show = () => {
      const sc = scene();
      if (sc) for (const c of cards) sc.drop(c);
      cards.length = 0;
      pick.value = cur;
      lsSet('feetza.stageId', cur);
      const re = isRedrawn(cur);
      wrap.querySelector('[data-title]')!.innerHTML = `${BACKDROPS[cur].name} <small>${waveRange(cur)}</small>`;
      const pair = wrap.querySelector('[data-pair]')!;
      pair.replaceChildren();
      const both = re && view === 'both';
      pair.classList.toggle('one', !both);
      if (both) pair.append(card(cur, 'legacy', 'old', '', true));
      pair.append(card(cur, undefined, re ? 'new · location kit' : 'not redrawn yet', re ? 'new' : '', true));
      for (const b of wrap.querySelectorAll<HTMLElement>('[data-v]')) b.classList.toggle('on', b.dataset.v === view);
      layout();
      if (sc) sc.cards = cards;
    };
    const syncWaves = () => {
      const w = scene()?.holdWave ?? 0;
      for (const b of wrap.querySelectorAll<HTMLElement>('[data-w]')) b.classList.toggle('on', Number(b.dataset.w) === w);
    };
    show();
    const vw = scroller.clientWidth;
    const vh = scroller.clientHeight;
    canvas.style.width = `${vw}px`;
    canvas.style.height = `${vh}px`;
    game = new Phaser.Game({ type: Phaser.WEBGL, canvas, width: vw * dpr(), height: vh * dpr(), transparent: true, scene: [], audio: { noAudio: true }, banner: false, scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr() } });
    game.scene.add('StageGallery', Gallery, true, { cards, scroller });
    syncWaves();
    onResize = () => {
      game?.scale.resize(scroller.clientWidth * dpr(), scroller.clientHeight * dpr());
      canvas.style.width = `${scroller.clientWidth}px`;
      canvas.style.height = `${scroller.clientHeight}px`;
      show();
    };
    addEventListener('resize', onResize);
    setTimeout(show, 600);
    const step = (d: number) => {
      const list = [...redrawn, ...rest];
      cur = list[(list.indexOf(cur) + d + list.length) % list.length];
      show();
    };
    pick.addEventListener('change', () => {
      cur = pick.value as BackdropId;
      show();
    });
    wrap.querySelector('[data-prev]')!.addEventListener('click', () => step(-1));
    wrap.querySelector('[data-next]')!.addEventListener('click', () => step(1));
    wrap.querySelector('[data-waves]')!.addEventListener('click', (ev) => {
      const b = (ev.target as HTMLElement).closest('button');
      const sc = scene();
      if (!b || !sc) return;
      sc.holdWave = Number(b.dataset.w);
      for (const c of cards)
        if (c.live && sc.holdWave) {
          c.live.wave = sc.holdWave;
          c.live.view.setWave(sc.holdWave);
          c.wv.textContent = `stage wave ${sc.holdWave} of ${WAVES_PER_STAGE}`;
        }
      syncWaves();
    });
    wrap.querySelectorAll<HTMLElement>('[data-v]').forEach((b) =>
      b.addEventListener('click', () => {
        view = b.dataset.v === 'new' ? 'new' : 'both';
        lsSet('feetza.stageView', view);
        show();
      }),
    );
    // still: what Animated stages off shows (no live layers; the painted still)
    wrap.querySelector('[data-still]')!.addEventListener('click', (e) => {
      const on = (e.target as HTMLElement).classList.toggle('on');
      overrideBackdropAnim(on ? false : null);
      show();
    });
    if (q.has('still')) (wrap.querySelector('[data-still]') as HTMLElement).click();
    Object.assign(window, { __stageGame: game });
  };
  const add = () => {
    const fab = document.querySelector('.bl-fab');
    if (!fab) return void setTimeout(add, 300);
    const b = document.createElement('button');
    b.textContent = '🏞 Stages';
    b.title = 'The stages before and after: every location and arena, the redrawn ones old vs new, alive';
    b.addEventListener('click', () => void open());
    fab.appendChild(b);
  };
  add();
  if (q.has('stages')) setTimeout(() => void open(), 600);
}

