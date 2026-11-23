// Dev-only boss lab: a panel listing every boss and mini-boss in stage order, to launch any of them
// at any phase and heat, replay the current phase, and write playtest notes per phase.
// Open it with the floating "Bosses" button or the ` key. Notes save to the dev server (FEETZA_NOTES)
// and to localStorage as a backup.
import type Phaser from 'phaser';
import { HEATS, HEAT_BY_ID, type HeatId } from './data/difficulty';
import { FOOT_BY_ID } from './data/feet';
import { STAGES } from './data/stages';
import { bossPhaseInfo } from './game/bosses';
import { NEMESES } from './game/nemesis';
import { footPortraitURL } from './game/assets';
import { PEELS, checkPeelAchievements } from './game/peels';
import { peelsWithoutAbility } from './game/abilities';
import { persist, save as saveData } from './systems/save';

type AnyScene = Phaser.Scene & Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Notes = Record<string, { general?: string; phases?: Record<string, string> }>;
interface DevApi {
  startGame(o: Record<string, unknown>): void;
}

const LS_KEY = 'feetza.bossLab';
const ENRAGED = 'ENRAGED';

const ENTRIES = STAGES.flatMap((s, i) => [
  { id: s.mini, mini: true, stage: i + 1 },
  { id: s.boss as string, mini: false, stage: i + 1 },
  // nemesis bosses (src/game/nemesis.ts) sit with the stage they take over
  ...NEMESES.filter((n) => n.stage === i).flatMap((n) => [
    ...(n.mini ? [{ id: n.mini, mini: true, stage: i + 1 }] : []),
    ...(n.boss ? [{ id: n.boss as string, mini: false, stage: i + 1 }] : []),
  ]),
]);

function phaseCount(mini: boolean, heat: HeatId, id?: string): number {
  // fights with a fixed phase count (the Sole Proprietor: 1, then 5 when Unbound) ignore the heat
  const fixed = id ? bossPhaseInfo(id)?.fixed : undefined;
  if (fixed) return fixed;
  const n = HEAT_BY_ID[heat].bossPhases;
  return mini ? Math.max(1, n - 1) : n;
}

/** The mildest heat on which this boss reaches phase k. */
function heatFor(mini: boolean, k: number, id?: string): HeatId | null {
  return HEATS.find((h) => phaseCount(mini, h.id, id) >= k)?.id ?? null;
}

function phaseNames(id: string, mini: boolean): { name: string; info: string }[] {
  const b = bossPhaseInfo(id);
  const max = Math.max(...HEATS.map((h) => phaseCount(mini, h.id, id)));
  return Array.from({ length: max }, (_, i) => ({ name: b?.names[i] ?? ENRAGED, info: b?.info[i] ?? 'Everything it does comes faster' }));
}

function loadLocal(): { heat: HeatId; notes: Notes; kit?: boolean } {
  try {
    const v = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}');
    return { heat: v.heat ?? 'mild', notes: v.notes ?? {}, kit: !!v.kit };
  } catch {
    return { heat: 'mild', notes: {} };
  }
}

function toMarkdown(notes: Notes): string {
  const out = ['# Boss playtest notes', ''];
  for (const e of ENTRIES) {
    const n = notes[e.id];
    if (!n) continue;
    const phases = Object.entries(n.phases ?? {}).filter(([, t]) => t.trim());
    if (!n.general?.trim() && !phases.length) continue;
    const names = phaseNames(e.id, e.mini);
    out.push(`## Stage ${e.stage} ${e.mini ? 'mini-boss' : 'boss'}: ${FOOT_BY_ID[e.id]?.name ?? e.id}`, '');
    if (n.general?.trim()) out.push(`**Overall:** ${n.general.trim()}`, '');
    for (const [k, t] of phases.sort()) out.push(`**Phase ${k} (${names[Number(k) - 1]?.name ?? ENRAGED}):** ${t.trim()}`, '');
  }
  return out.join('\n');
}

const CSS = `
.bl-fab{position:fixed;left:10px;top:50%;transform:translateY(-50%);z-index:9998;display:flex;flex-direction:column;gap:6px;font:600 14px Fredoka,system-ui,sans-serif}
.bl-fab button{background:#2a1810ee;color:#ffe9c7;border:2px solid #f2b05a;border-radius:10px;padding:8px 10px;cursor:pointer;text-align:left;font:inherit}
.bl-fab button:hover{background:#4a2a18}
.bl-wrap{position:fixed;inset:0;z-index:9999;background:#0009;display:flex;align-items:center;justify-content:center;font:15px Fredoka,system-ui,sans-serif;color:#2a1810}
.bl-panel{width:min(1180px,96vw);height:min(820px,94vh);background:#fff6e6;border-radius:16px;border:3px solid #2a1810;display:grid;grid-template-columns:300px 1fr;overflow:hidden;box-shadow:0 20px 60px #000a}
.bl-list{background:#2a1810;color:#ffe9c7;overflow-y:auto;padding:12px}
.bl-list h3{margin:12px 4px 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#f2b05a}
.bl-item{display:flex;align-items:center;gap:8px;width:100%;padding:6px 8px;border-radius:8px;border:0;background:none;color:inherit;font:inherit;cursor:pointer;text-align:left}
.bl-item:hover{background:#ffffff14}.bl-item.on{background:#f2b05a;color:#2a1810}
.bl-item img{width:34px;height:34px;object-fit:contain}
.bl-item small{display:block;font-size:11px;opacity:.75}
.bl-dot{margin-left:auto;width:9px;height:9px;border-radius:50%;background:#7ed37e;flex:none}
.bl-main{display:flex;flex-direction:column;overflow:hidden}
.bl-head{display:flex;align-items:center;gap:14px;padding:14px 18px;border-bottom:2px solid #2a181022}
.bl-head img{width:72px;height:72px;object-fit:contain}
.bl-head h2{margin:0;font:400 28px 'Lilita One',Fredoka,sans-serif}
.bl-head .sp{flex:1}
.bl-kit{display:flex;gap:6px;align-items:center;font:600 14px Fredoka,sans-serif;cursor:pointer;white-space:nowrap}
.bl-body{overflow-y:auto;padding:14px 18px;display:flex;flex-direction:column;gap:12px}
.bl-phase{border:2px solid #2a181022;border-radius:12px;padding:10px 12px;background:#fff}
.bl-phase.off{background:#f3eadb}
.bl-phase .row{display:flex;align-items:center;gap:10px;margin-bottom:6px}
.bl-phase b{font-size:16px}.bl-phase .info{font-size:13px;color:#5a4030;flex:1}
.bl-phase .tag{font-size:12px;background:#2a1810;color:#ffe9c7;border-radius:6px;padding:2px 6px}
.bl-wrap textarea{width:100%;box-sizing:border-box;min-height:64px;resize:vertical;border:2px solid #2a181033;border-radius:8px;padding:8px;font:14px Fredoka,system-ui,sans-serif;color:#2a1810;background:#fffdf8}
.bl-btn{background:#d9442b;color:#fff;border:0;border-radius:9px;padding:7px 12px;font:600 14px Fredoka,system-ui,sans-serif;cursor:pointer;white-space:nowrap}
.bl-btn.alt{background:#2a1810}.bl-btn:hover{filter:brightness(1.1)}
.bl-wrap select{font:600 14px Fredoka,system-ui,sans-serif;padding:6px;border-radius:8px;border:2px solid #2a1810}
.bl-status{font-size:12px;color:#5a4030;min-width:60px}
`;

export function installBossLab(game: Phaser.Game): void {
  const local = loadLocal();
  let heat: HeatId = local.heat;
  let withKit = !!local.kit;
  let notes: Notes = local.notes;
  let selected = ENTRIES[0].id;
  let last: { id: string; phase: number; heat: HeatId } | null = null;
  let pausedByLab = false;
  let saveT = 0;
  let status = '';

  fetch('/__notes')
    .then((r) => (r.ok ? r.json() : null))
    .then((server: Notes | null) => {
      if (server) notes = { ...notes, ...server };
    })
    .catch(() => {});

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const api = () => (window as unknown as { F: DevApi }).F;
  const scene = () => game.scene.getScene('Game') as AnyScene | null;

  const persistLocal = () => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ heat, notes, kit: withKit }));
    } catch {
      /* private mode */
    }
  };
  const save = () => {
    persistLocal();
    clearTimeout(saveT);
    status = 'Saving…';
    setStatus();
    saveT = window.setTimeout(() => {
      fetch('/__notes', { method: 'POST', body: JSON.stringify({ notes, md: toMarkdown(notes) }) })
        .then((r) => (status = r.ok ? 'Saved' : 'Saved in browser only'))
        .catch(() => (status = 'Saved in browser only'))
        .finally(setStatus);
    }, 500);
  };
  const setStatus = () => {
    const el = document.querySelector('.bl-status');
    if (el) el.textContent = status;
  };

  async function launch(id: string, phase: number, h: HeatId = heat): Promise<void> {
    close();
    const splash = document.querySelector('.splash-hint');
    if (splash) {
      document.querySelector('.screen')?.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 800));
    }
    const mini = !!FOOT_BY_ID[id]?.mini;
    const n = phaseCount(mini, h, id);
    const hp = phase > 1 ? Math.max(0.02, 1 - (phase - 1) / n - 0.02) : undefined;
    last = { id, phase, heat: h };
    // with a build: the starter kit a run would have by this fight (5 pizzas, a topping per 3 waves of the right
    // rarities, tips), straight into the fight rather than the shop
    const wave = FOOT_BY_ID[id]?.minWave ?? 5;
    api().startGame({ heat: h, boss: { id, hp }, intros: false, ...(withKit ? { kit: true, wave } : {}) });
  }

  /** The phase the boss on the field is in now, or the one last launched. */
  function livePhase(): number {
    const g = scene();
    const f = g?.bossFoot?.alive ? g.bossFoot : g?.miniFoot?.alive ? g.miniFoot : null;
    if (f && last && f.type.id === last.id) return f.phase as number;
    return last?.phase ?? 1;
  }

  // ——— floating buttons ———
  const fab = document.createElement('div');
  fab.className = 'bl-fab';
  fab.innerHTML = `<button data-a="open" title="Boss lab (\`)">☰ Bosses</button><button data-a="phase" title="Replay the phase you're in">↻ Phase</button><button data-a="boss" title="Restart this boss from phase 1">↻ Boss</button><button data-a="peels"></button>`;
  // every peel unlocked for testing; the real unlocks are kept and come back with the second press
  const PEEL_BACKUP = 'feetza.dev.peelsBackup';
  const peelBtn = fab.querySelector<HTMLButtonElement>('[data-a="peels"]')!;
  const syncPeelBtn = () => {
    const on = localStorage.getItem(PEEL_BACKUP) !== null;
    peelBtn.textContent = on ? '🔒 Peels' : '🔓 Peels';
    peelBtn.title = on ? 'Put back the peels you had really unlocked' : 'Unlock every peel for testing (press again to undo)';
  };
  syncPeelBtn();
  const togglePeels = () => {
    const backup = localStorage.getItem(PEEL_BACKUP);
    if (backup === null) {
      localStorage.setItem(PEEL_BACKUP, JSON.stringify({ peels: saveData.peels, peel: saveData.peel, skin: saveData.skin }));
      saveData.peels = PEELS.map((p) => p.id).filter((id) => id !== 'classic');
    } else {
      const b = JSON.parse(backup) as { peels: string[]; peel: string; skin: string };
      saveData.peels = b.peels;
      saveData.peel = b.peel;
      saveData.skin = b.skin;
      localStorage.removeItem(PEEL_BACKUP);
      checkPeelAchievements();
    }
    persist();
    syncPeelBtn();
  };
  // every peel but the Classic needs its own ability: say so loudly if one is missing
  const noAbility = peelsWithoutAbility(PEELS.map((p) => p.id));
  if (noAbility.length) console.error(`[peels] ${noAbility.length} peel(s) have no ability and fall back to the Peel Slam: ${noAbility.join(', ')}. Add them to ABILITIES in src/game/abilities.ts.`);
  fab.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest('button')?.dataset.a;
    if (a === 'peels') togglePeels();
    else if (a === 'open') open();
    else if (a === 'phase' && last) void launch(last.id, livePhase(), last.heat);
    else if (a === 'boss' && last) void launch(last.id, 1, last.heat);
  });
  document.body.appendChild(fab);

  // ——— panel ———
  let wrap: HTMLElement | null = null;

  function open(): void {
    if (wrap) return;
    if (last) selected = last.id;
    const g = scene();
    if (g?.sys.isActive()) {
      g.scene.pause();
      pausedByLab = true;
    }
    wrap = document.createElement('div');
    wrap.className = 'bl-wrap';
    wrap.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') close();
    });
    wrap.addEventListener('keyup', (e) => e.stopPropagation());
    wrap.addEventListener('pointerdown', (e) => {
      if (e.target === wrap) close();
    });
    document.body.appendChild(wrap);
    render();
  }

  function close(): void {
    if (!wrap) return;
    wrap.remove();
    wrap = null;
    const g = scene();
    if (pausedByLab && g?.sys.isPaused() && !g.paused) g.scene.resume();
    pausedByLab = false;
  }

  function hasNotes(id: string): boolean {
    const n = notes[id];
    return !!(n?.general?.trim() || Object.values(n?.phases ?? {}).some((t) => t.trim()));
  }

  function render(): void {
    if (!wrap) return;
    const e = ENTRIES.find((x) => x.id === selected) ?? ENTRIES[0];
    const t = FOOT_BY_ID[e.id];
    const n = phaseCount(e.mini, heat, e.id);
    const phases = phaseNames(e.id, e.mini);
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
    const list = STAGES.map(
      (_s, i) =>
        `<h3>Stage ${i + 1}</h3>` +
        ENTRIES.filter((x) => x.stage === i + 1)
          .map(
            (x) =>
              `<button class="bl-item${x.id === selected ? ' on' : ''}" data-sel="${x.id}"><img src="${footPortraitURL(x.id)}" alt=""><span>${esc(FOOT_BY_ID[x.id]?.name ?? x.id)}<small>${x.mini ? 'Mini-boss' : 'Boss'}</small></span>${hasNotes(x.id) ? '<i class="bl-dot" title="Has notes"></i>' : ''}</button>`,
          )
          .join(''),
    ).join('');
    const cards = phases
      .map((p, i) => {
        const k = i + 1;
        const on = k <= n;
        const needs = on ? heat : heatFor(e.mini, k, e.id);
        const btn = needs ? `<button class="bl-btn" data-play="${k}" data-heat="${needs}">▶ Play phase ${k}${on ? '' : ` (${HEAT_BY_ID[needs].name})`}</button>` : '';
        return `<div class="bl-phase${on ? '' : ' off'}"><div class="row"><b>Phase ${k} · ${esc(p.name)}</b>${on ? '' : `<span class="tag">Not on ${HEAT_BY_ID[heat].name}</span>`}<span class="info">${esc(p.info)}</span>${btn}</div><textarea data-note="${k}" placeholder="Notes on phase ${k}…">${esc(notes[e.id]?.phases?.[k] ?? '')}</textarea></div>`;
      })
      .join('');
    wrap.innerHTML = `<div class="bl-panel"><div class="bl-list">${list}</div><div class="bl-main">
      <div class="bl-head"><img src="${footPortraitURL(e.id)}" alt=""><div><h2>${esc(t?.name ?? e.id)}</h2>Stage ${e.stage} ${e.mini ? 'mini-boss' : 'boss'} · ${n} phase${n > 1 ? 's' : ''} on ${HEAT_BY_ID[heat].name}</div><span class="sp"></span>
      <label class="bl-kit" title="Start the fight with the starter kit a run would have by then: 5 pizzas, toppings and tips sized for its wave"><input type="checkbox" data-kit${withKit ? ' checked' : ''}> With a build</label>
      <select data-heat-sel>${HEATS.map((h) => `<option value="${h.id}"${h.id === heat ? ' selected' : ''}>${h.name}</option>`).join('')}</select>
      <button class="bl-btn" data-play="1" data-heat="${heat}">▶ Play</button><button class="bl-btn alt" data-clear title="Clear every boss's notes (press twice)">🗑 Clear all notes</button><button class="bl-btn alt" data-close>✕</button></div>
      <div class="bl-body"><div class="bl-phase"><div class="row"><b>Overall</b><span class="info">Arrival, look, difficulty, anything not tied to one phase</span><span class="bl-status">${status}</span></div><textarea data-note="general" placeholder="Overall notes…">${esc(notes[e.id]?.general ?? '')}</textarea></div>${cards}</div></div></div>`;
    wrap.querySelectorAll<HTMLElement>('[data-sel]').forEach((b) =>
      b.addEventListener('click', () => {
        selected = b.dataset.sel as string;
        render();
      }),
    );
    wrap.querySelectorAll<HTMLElement>('[data-play]').forEach((b) => b.addEventListener('click', () => void launch(e.id, Number(b.dataset.play), b.dataset.heat as HeatId)));
    wrap.querySelector('[data-close]')?.addEventListener('click', close);
    // two presses to clear every boss's notes, here, in the browser and in the notes file
    wrap.querySelector<HTMLButtonElement>('[data-clear]')?.addEventListener('click', (ev) => {
      const b = ev.currentTarget as HTMLButtonElement;
      if (b.dataset.armed !== '1') {
        b.dataset.armed = '1';
        b.textContent = 'Really clear all?';
        setTimeout(() => {
          if (b.isConnected && b.dataset.armed === '1') {
            b.dataset.armed = '';
            b.textContent = '🗑 Clear all notes';
          }
        }, 3000);
        return;
      }
      for (const k of Object.keys(notes)) delete notes[k];
      save();
      render();
    });
    wrap.querySelector<HTMLInputElement>('[data-kit]')?.addEventListener('change', (ev) => {
      withKit = (ev.target as HTMLInputElement).checked;
      persistLocal();
    });
    wrap.querySelector<HTMLSelectElement>('[data-heat-sel]')?.addEventListener('change', (ev) => {
      heat = (ev.target as HTMLSelectElement).value as HeatId;
      persistLocal();
      render();
    });
    wrap.querySelectorAll<HTMLTextAreaElement>('[data-note]').forEach((ta) =>
      ta.addEventListener('input', () => {
        const key = ta.dataset.note as string;
        const n2 = (notes[e.id] ??= {});
        if (key === 'general') n2.general = ta.value;
        else (n2.phases ??= {})[key] = ta.value;
        const dot = wrap?.querySelector(`[data-sel="${e.id}"] .bl-dot`);
        if (!dot && hasNotes(e.id)) wrap?.querySelector(`[data-sel="${e.id}"]`)?.insertAdjacentHTML('beforeend', '<i class="bl-dot" title="Has notes"></i>');
        save();
      }),
    );
  }

  window.addEventListener('keydown', (e) => {
    if (e.key !== '`') return;
    if ((e.target as HTMLElement)?.closest?.('textarea,input')) return;
    e.preventDefault();
    if (wrap) close();
    else open();
  });
}
