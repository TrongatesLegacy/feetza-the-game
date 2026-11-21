// Dev-only look lab: every peel with an animated look (fires, glows, trails), all playing at once, grouped by
// family, with a notes box for each and one for overall thoughts. Open it with the floating "✨ Looks" button or
// ?dev&looks. Notes save to the dev server beside FEETZA_NOTES (…-looks.json and .md) and to localStorage.
import { PEELS, peelThumbURL, type PeelDef } from './game/peels';
import { animateLookImg, hasAnimatedLook, stopLookOverlays } from './art/animatedLooks';
import { FIRE_PEELS } from './art/lookFire';

type Notes = Record<string, string>;
const LS_KEY = 'feetza.lookLab';
const URL_ = '/__notes?name=looks';

const CSS = `
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
    ['Always aflame', 'their own fire', all.filter(fire)],
    ['Gods and the God Peel', 'each god’s own glow', all.filter((d) => !fire(d) && god(d))],
    ['Jewellery box, masterworks and ultra-rares', 'glints, sheens and auras', all.filter((d) => !fire(d) && !god(d) && d.group !== 'hero')],
    ['Heroes', 'a quiet glow and trail', all.filter((d) => !fire(d) && !god(d) && d.group === 'hero')],
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

  const close = () => {
    stopLookOverlays();
    document.querySelector('.ll-wrap')?.remove();
  };
  const open = async () => {
    close();
    await (window as unknown as { F?: { boot?: () => Promise<void> } }).F?.boot?.();
    const fams = families();
    const total = fams.reduce((n, f) => n + f[2].length, 0);
    const card = (d: PeelDef) =>
      `<div class="ll-card${notes[d.id]?.trim() ? ' has' : ''}" data-id="${esc(d.id)}"><div class="ll-art"><img alt="" data-peel="${esc(d.id)}" src="${peelThumbURL(d.id, 300)}"></div><b>${esc(d.name)}</b><small>${esc(d.id)}</small><textarea data-note="${esc(d.id)}" placeholder="Notes…">${esc(notes[d.id] ?? '')}</textarea></div>`;
    const wrap = document.createElement('div');
    wrap.className = 'll-wrap';
    wrap.innerHTML = `<div class="ll-head"><h2>✨ Peel looks</h2><span>${total} animated peels</span><span class="sp"></span><span class="ll-status"></span><button class="ll-btn alt" data-x>✕ Close</button></div>
      <div class="ll-body"><div class="ll-overall"><h3>Overall notes</h3><textarea data-note="__overall" placeholder="Anything across all the looks…">${esc(notes.__overall ?? '')}</textarea></div>
      ${fams.map(([t, sub, list]) => `<h3>${esc(t)}<small>${list.length} · ${esc(sub)}</small></h3><div class="ll-grid">${list.map(card).join('')}</div>`).join('')}</div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('[data-x]')!.addEventListener('click', close);
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
