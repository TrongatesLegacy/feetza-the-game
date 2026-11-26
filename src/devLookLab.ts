// Dev-only look lab: every peel with an animated look (fires, glows, trails) and every living foot peel, all playing
// at once (those scrolled out of view rest), grouped by family, with a notes box for each and one for overall
// thoughts. Open it with the floating "✨ Looks" button or ?dev&looks. Notes save to the dev
// server beside FEETZA_NOTES (…-looks.json and .md) and to localStorage.
import { PEELS, peelThumbURL, type PeelDef } from './game/peels';
import { LOOK_OX, LOOK_OY, animateLookImg, canvasPen, hasAnimatedLook, movingLook, stopLookOverlays } from './art/animatedLooks';
import type { MovingPainter } from './art/lookKit';
import { FIRE_PEELS } from './art/lookFire';
import { hasPeelLive } from './art/peelLive';
import { hasPeelCraft } from './art/peelCraft';

type Notes = Record<string, string>;
const LS_KEY = 'feetza.lookLab';
const URL_ = '/__notes?name=looks';

const PAGE = 12;

const CSS = `
.ll-pager{display:flex;gap:10px;align-items:center;margin:6px 0 10px}
.ll-pager button{background:#5a3a28;color:#ffe9c7;border:0;border-radius:8px;padding:5px 12px;font:600 14px Fredoka,system-ui,sans-serif;cursor:pointer}
.ll-tabs{flex-basis:100%;display:flex;flex-wrap:wrap;gap:6px}
.ll-tabs button{background:#5a3a28;color:#ffe9c7;border:0;border-radius:8px;padding:5px 11px;font:600 13px Fredoka,system-ui,sans-serif;cursor:pointer}
.ll-tabs button:hover{background:#7a4a30}.ll-tabs button.on{background:#ff8a1a;color:#2a1810}
.ll-tabs small{opacity:.7;font-weight:500}
.ll-wrap{position:fixed;inset:0;z-index:9999;background:#efe2c8;overflow:auto;font:15px Fredoka,system-ui,sans-serif;color:#2a1810}
.ll-head{position:sticky;top:0;z-index:2;background:#2a1810;color:#ffe9c7;display:flex;gap:12px;align-items:center;padding:10px 16px;flex-wrap:wrap}
.ll-head h2{margin:0;font-size:20px}.ll-head .sp{flex:1}.ll-status{font-size:13px;opacity:.85;min-width:60px}
.ll-btn{background:#d9442b;color:#fff;border:0;border-radius:9px;padding:7px 12px;font:600 14px Fredoka,system-ui,sans-serif;cursor:pointer}
.ll-btn.alt{background:#5a3a28}
.ll-body{padding:12px 16px 40px;max-width:1500px;margin:0 auto}
.ll-body h3{margin:18px 0 8px;font-size:18px}.ll-body h3 small{font-weight:400;opacity:.7;font-size:13px;margin-left:6px}
.ll-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}
.ll-card{background:#fbf3e3;border-radius:12px;padding:10px;display:flex;flex-direction:column;align-items:center;gap:6px;box-shadow:0 1px 0 #2a181022}
.ll-card.has{outline:3px solid #f2b05a}
.ll-art{position:relative;width:110px;height:180px;margin:10px 0 4px}
.ll-art img{position:relative;width:110px;height:180px;object-fit:contain}
.ll-stage{position:relative;width:100%;height:250px;margin:-4px 0 0;overflow:hidden;border-radius:9px}
.ll-stage canvas{position:absolute;inset:0;width:100%;height:100%}
.ll-card b{font-size:14px;text-align:center}.ll-card small{font-size:11px;opacity:.65;margin-top:-4px}
.ll-wrap textarea{width:100%;box-sizing:border-box;min-height:52px;resize:vertical;border:2px solid #2a181033;border-radius:8px;padding:6px 8px;font:13px Fredoka,system-ui,sans-serif;color:#2a1810;background:#fffdf8}
.ll-overall textarea{min-height:70px;font-size:14px}
`;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function families(): [string, string, PeelDef[]][] {
  const all = PEELS.filter((d) => hasAnimatedLook(d.id));
  const fire = (d: PeelDef) => d.id in FIRE_PEELS;
  const god = (d: PeelDef) => !!d.pantheon || d.group === 'god';
  return [
    ['The God Peel', 'the final trophy: halo, turning rays and a rainbow trail', all.filter((d) => d.group === 'god')],
    ['Always aflame', 'their own fire', all.filter(fire)],
    ['Gods', 'each god’s own glow', all.filter((d) => !fire(d) && god(d) && d.group !== 'god')],
    ['Crafted: the Classic, the Golden Crusts and the places', 'alive as their material (wood, marble, copper, neon, obsidian; mastered ones too), and the places with a living window', all.filter((d) => hasPeelCraft(d.id) && d.group !== 'pizza' && d.group !== 'event' && d.group !== 'shinyEvent' && d.group !== 'act')],
    ['Events and acts', 'a medallion: the wave event in miniature (its answer on a smack), or the act’s places and gold number (its boss stomps on a smack)', all.filter((d) => hasPeelCraft(d.id) && (d.group === 'event' || d.group === 'shinyEvent' || d.group === 'act'))],
    ['Pizzas', 'the pie alive on its board: glistening, bubbling, steaming, its family’s touch (heat, frost, syrup, gold, a Rare Find’s finish); a smack bounces it', all.filter((d) => d.group === 'pizza')],
    ['Jewellery box, masterworks and ultra-rares', 'glints, sheens and auras', all.filter((d) => !fire(d) && !god(d) && d.group !== 'hero' && !hasPeelLive(d.id) && !hasPeelCraft(d.id))],
    ['Heroes', 'a glow, rim glints and a starry ribbon', all.filter((d) => !fire(d) && !god(d) && d.group === 'hero')],
    ['Living feet', 'redrawn feet that move as their foot does: glow, blinks, sway, toes, heat and what they shed', all.filter((d) => !fire(d) && hasPeelLive(d.id) && !d.id.startsWith('boss:'))],
    ['Living bosses', 'the bosses and mini-bosses, alive the same way', all.filter((d) => !fire(d) && hasPeelLive(d.id) && d.id.startsWith('boss:'))],
  ];
}

function toMarkdown(notes: Notes): string {
  const out = ['# Peel look notes', ''];
  if (notes.__overall?.trim()) out.push('## Overall', '', notes.__overall.trim(), '');
  for (const [title, , list] of families()) {
    const rows = list.filter((d) => notes[d.id]?.trim());
    if (!rows.length) continue;
    out.push(`## ${title}`, '');
    for (const d of rows) out.push(`- **${d.name}** (\`${d.id}\`): ${notes[d.id].trim().replace(/\n+/g, ' ')}`);
    out.push('');
  }
  return out.join('\n');
}

export function installLookLab(): void {
  let notes: Notes = {};
  try {
    notes = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') as Notes;
  } catch {
    /* private mode */
  }
  fetch(URL_)
    .then((r) => (r.ok ? r.json() : null))
    .then((server: Notes | null) => {
      if (server) notes = { ...notes, ...server };
    })
    .catch(() => {});
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  let saveT = 0;
  const setStatus = (s: string) => {
    const el = document.querySelector('.ll-status');
    if (el) el.textContent = s;
  };
  const save = () => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(notes));
    } catch {
      /* private mode */
    }
    clearTimeout(saveT);
    setStatus('Saving…');
    saveT = window.setTimeout(() => {
      fetch(URL_, { method: 'POST', body: JSON.stringify({ notes, md: toMarkdown(notes) }) })
        .then((r) => setStatus(r.ok ? 'Saved' : 'Saved in browser only'))
        .catch(() => setStatus('Saved in browser only'));
    }, 500);
  };

  let moving = true;
  let page = 0;
  // one family at a time (the tabs); remembered between visits
  let tab = '';
  try {
    tab = localStorage.getItem(LS_KEY + '.tab') ?? '';
  } catch {
    /* private mode */
  }
  const close = () => {
    stopMoving();
    stopLookOverlays();
    document.querySelector('.ll-wrap')?.remove();
  };
  const open = async () => {
    close();
    await (window as unknown as { F?: { boot?: () => Promise<void> } }).F?.boot?.();
    const fams = families().filter((f) => f[2].length);
    const total = fams.reduce((n, f) => n + f[2].length, 0);
    const cur = fams.find((f) => f[0] === tab) ?? fams[0];
    tab = cur[0];
    // a page of cards at a time (a big family drew every thumbnail at once and froze the page for seconds)
    const pages = Math.max(1, Math.ceil(cur[2].length / PAGE));
    page = Math.min(Math.max(0, page), pages - 1);
    const shown = cur[2].slice(page * PAGE, page * PAGE + PAGE);
    const pager = pages > 1 ? `<div class="ll-pager"><button data-pg="-1">◀</button><span>Page ${page + 1} of ${pages}</span><button data-pg="1">▶</button></div>` : '';
    const art = (d: PeelDef) =>
      moving && hasMoving(d.id)
        ? `<div class="ll-stage" data-move="${esc(d.id)}"><canvas></canvas><canvas></canvas></div>`
        : `<div class="ll-art"><img alt="" data-peel="${esc(d.id)}" src="${peelThumbURL(d.id, 300)}"></div>`;
    const card = (d: PeelDef) =>
      `<div class="ll-card${notes[d.id]?.trim() ? ' has' : ''}" data-id="${esc(d.id)}">${art(d)}<b>${esc(d.name)}</b><small>${esc(d.id)}</small><textarea data-note="${esc(d.id)}" placeholder="Notes…">${esc(notes[d.id] ?? '')}</textarea></div>`;
    const wrap = document.createElement('div');
    wrap.className = 'll-wrap';
    wrap.innerHTML = `<div class="ll-head"><h2>✨ Peel looks</h2><span>${total} animated peels</span><span class="sp"></span><span class="ll-status"></span><button class="ll-btn" data-mode>${moving ? '⏸ Hold still' : '↔ Move them'}</button><button class="ll-btn alt" data-x>✕ Close</button>
      <div class="ll-tabs">${fams.map(([t, , list]) => `<button class="${t === tab ? 'on' : ''}" data-tab="${esc(t)}">${esc(t)} <small>${list.length}</small></button>`).join('')}</div></div>
      <div class="ll-body"><div class="ll-overall"><h3>Overall notes</h3><textarea data-note="__overall" placeholder="Anything across all the looks…">${esc(notes.__overall ?? '')}</textarea></div>
      <h3>${esc(cur[0])}<small>${cur[2].length} · ${esc(cur[1])}</small></h3>${pager}<div class="ll-grid">${shown.map(card).join('')}</div>${pager}</div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('[data-x]')!.addEventListener('click', close);
    wrap.querySelectorAll<HTMLElement>('[data-pg]').forEach((b) =>
      b.addEventListener('click', () => {
        page += Number(b.dataset.pg);
        void open().then(() => document.querySelector('.ll-wrap')?.scrollTo(0, 0));
      }),
    );
    wrap.querySelector('.ll-tabs')!.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest('button')?.dataset.tab;
      if (!t || t === tab) return;
      tab = t;
      page = 0;
      try {
        localStorage.setItem(LS_KEY + '.tab', t);
      } catch {
        /* private mode */
      }
      void open();
    });
    wrap.querySelector('[data-mode]')!.addEventListener('click', () => {
      moving = !moving;
      try {
        localStorage.setItem(LS_KEY + '.still', moving ? '' : '1');
      } catch {
        /* private mode */
      }
      const y = wrap.scrollTop;
      void open().then(() => document.querySelector('.ll-wrap')?.scrollTo(0, y));
    });
    startMoving(wrap);
    wrap.addEventListener('input', (e) => {
      const ta = e.target as HTMLTextAreaElement;
      const id = ta.dataset.note;
      if (!id) return;
      notes[id] = ta.value;
      if (!ta.value.trim()) delete notes[id];
      ta.closest('.ll-card')?.classList.toggle('has', !!ta.value.trim());
      save();
    });
    // start each look once its image has a size
    for (const img of wrap.querySelectorAll<HTMLImageElement>('img[data-peel]')) {
      const go = () => animateLookImg(img, img.dataset.peel!);
      if (img.complete) go();
      else img.addEventListener('load', go, { once: true });
    }
  };

  // a button under the boss lab's floating buttons
  const add = () => {
    const fab = document.querySelector('.bl-fab');
    if (!fab) return void setTimeout(add, 300);
    const b = document.createElement('button');
    b.textContent = '✨ Looks';
    b.title = 'Every animated peel look, with notes';
    b.addEventListener('click', () => void open());
    fab.appendChild(b);
  };
  add();
  if (new URLSearchParams(location.search).has('looks')) setTimeout(() => void open(), 600);
}

// ——— moving mode: each peel swoops round its card in a figure of eight and smacks every few seconds ———

const hasMoving = (id: string) => !!movingLook(id, () => ({ x: 0, y: 0, rot: 0 }));
const K = 0.32; // peel units → css px
const SMACK_EVERY = 3.2;

interface Stage {
  el: HTMLElement;
  back: HTMLCanvasElement;
  front: HTMLCanvasElement;
  bctx: CanvasRenderingContext2D;
  fctx: CanvasRenderingContext2D;
  paint: MovingPainter;
  img: HTMLImageElement;
  bpen: ReturnType<typeof canvasPen>;
  fpen: ReturnType<typeof canvasPen>;
  seen: boolean;
}
let stages: Stage[] = [];
let raf = 0;
let io: IntersectionObserver | null = null;

function path(phase: number) {
  let lastSmack = -1;
  return (t: number) => {
    const u = t * 3.4 + phase;
    // a figure of eight, leaning into the swing
    let x = Math.sin(u) * 140;
    let y = Math.sin(u * 2) * 60;
    let rot = -Math.cos(u) * 0.35;
    // every few seconds: wind up and smack down
    const c = (t + phase) % SMACK_EVERY;
    let smack = false;
    if (c > SMACK_EVERY - 0.45) {
      const k = (c - (SMACK_EVERY - 0.45)) / 0.45;
      const dip = k < 0.6 ? -Math.sin((k / 0.6) * Math.PI * 0.5) * 30 : -30 + ((k - 0.6) / 0.4) * 120;
      y += dip;
      rot *= 1 - k;
      x *= 1 - k * 0.5;
    }
    const n = Math.floor((t + phase) / SMACK_EVERY);
    if (n !== lastSmack && c < 0.05 && t > 0.5) {
      lastSmack = n;
      smack = true;
    }
    return { x, y, rot, smack };
  };
}

function startMoving(root: HTMLElement): void {
  stopMoving();
  io = new IntersectionObserver((es) => {
    for (const e of es) for (const st of stages) if (st.el === e.target) st.seen = e.isIntersecting;
  });
  root.querySelectorAll<HTMLElement>('[data-move]').forEach((el, i) => {
    const id = el.dataset.move!;
    const paint = movingLook(id, path(i * 0.7));
    if (!paint) return;
    const [back, front] = [...el.querySelectorAll('canvas')];
    const img = new Image();
    img.src = peelThumbURL(id, 360);
    const boost = { w: Math.min(2.2, Math.max(1, 0.5 / K)) };
    const bctx = back.getContext('2d')!;
    const fctx = front.getContext('2d')!;
    stages.push({ el, back, front, bctx, fctx, paint, img, bpen: canvasPen(bctx, boost), fpen: canvasPen(fctx, boost), seen: false });
    io!.observe(el);
  });
  let last = performance.now();
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    if (dt < 0.03) return;
    last = now;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const st of stages) {
      if (!st.seen || !st.el.isConnected) continue;
      const w = st.el.clientWidth;
      const h = st.el.clientHeight;
      for (const [cv, ctx] of [[st.back, st.bctx], [st.front, st.fctx]] as const) {
        if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
          cv.width = Math.round(w * dpr);
          cv.height = Math.round(h * dpr);
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.setTransform(K * dpr, 0, 0, K * dpr, (w / 2) * dpr, 96 * dpr);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
      }
      st.paint({ pen: st.bpen, ctx: st.bctx }, { pen: st.fpen, ctx: st.fctx }, dt, (ctx) => {
        if (st.img.complete && st.img.naturalWidth) ctx.drawImage(st.img, -LOOK_OX, -LOOK_OY, 220, 360);
      });
    }
  };
  raf = requestAnimationFrame(tick);
}

function stopMoving(): void {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  io?.disconnect();
  io = null;
  stages = [];
}
