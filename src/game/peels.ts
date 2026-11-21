// Peel skins and the achievements that unlock them.
//
// - Feet: defeat N of a foot type (N scales with how common it is).
// - Bosses and mini-bosses: defeat it once.
// - Places: clear 10 waves in a location's stage.
// - Events: deal with N of a wave event.
// - Golden Crusts: bought in the locker (including the jewellery set).
// - Shiny feet: a rare shiny foot unlocks the shiny version of that foot's peel.
// - Event shinies: rare drops from wave events, with a few extremely rare jewels.
// - Acts: complete the act (beat its last boss), on any heat.

import type Phaser from 'phaser';
import { BACKDROPS, type LocationId } from '../art/backdrops';
import { drawPeelSkin, handleFrom, headFrom, PEEL_H, PEEL_W, type PeelLook, type PeelPattern, type PeelShape } from '../art/peelArt';
import { hashStr, makeCanvas, shade } from '../art/util';
import { FEET, FOOT_BY_ID, type FootType } from '../data/feet';
import { ACTS, STAGES, WAVES_PER_ACT } from '../data/stages';
import { persist, save } from '../systems/save';
import { addCanvas, eventCanvases, footMeta, pizzaTops } from './assets';
import { PIZZAS } from '../data/pizzas';
import type { EventId } from './events';
import { HERO_PEELS, type HeroSub } from '../content/heroPeels';
import { goalProgress, heatHow } from './heroGoals';
import { godPeelLook } from '../art/godHeads';
import { NEMESES, nemesisOf, nemesisWaves } from './nemesis';

export type PeelGroup = 'classic' | 'golden' | 'jewel' | 'foot' | 'boss' | 'place' | 'event' | 'pizza' | 'shinyFoot' | 'shinyEvent' | 'master' | 'act' | 'hero' | 'god';

export interface PeelDef {
  id: string;
  name: string;
  group: PeelGroup;
  /** How it's unlocked, for the locker. */
  how: string;
  /** Achievement progress, for peels that unlock themselves. */
  progress?: () => [number, number];
  /** Golden Crust price, for peels bought in the locker. */
  cost?: number;
  /** Event drop: which event and the chance per event dealt with. */
  drop?: { event: EventId; chance: number };
  /** Shiny foot peel: which foot. */
  foot?: string;
  shiny?: boolean;
  /** Extremely rare. */
  ultra?: boolean;
  /** Hero peels: their section in the HEROES tab. */
  sub?: HeroSub;
  /** God peels: their pantheon. */
  pantheon?: 'greek' | 'norse';
  look: () => PeelLook;
}

export const SHINY_FOOT_CHANCE = 1 / 300;
/** Cleared waves a pizza must sit on the table for its peel. */
export const PIZZA_WAVES = 20;
/** Wave to reach with a Crust peel equipped to master it. */
export const MASTER_WAVE = 60;

const EVENT_LABEL: Record<EventId, [string, string]> = {
  balloon: ['Tip Balloon', 'Pop'],
  drone: ['Delivery Drone', 'Catch'],
  moth: ['Pepper Moth', 'Swat'],
  seagull: ['Golden Seagull', 'Smack'],
  chest: ['Pizza Box Chest', 'Open'],
  mimic: ['Mimic', 'Beat'],
  sighting: ['Hero Sighting', 'Catch'],
  // Act 9 · Greek myths
  charybdis: ['Charybdis', 'Close'],
};
const EVENT_NEED: Record<EventId, number> = { balloon: 10, drone: 5, moth: 5, seagull: 2, chest: 5, mimic: 3, sighting: 3,
  // Act 9 · Greek myths
  charybdis: 3 };
const EVENT_KEY: Record<EventId, string> = { balloon: 'ev_balloon', drone: 'ev_drone', moth: 'ev_moth', seagull: 'ev_seagull', chest: 'ev_chest', mimic: 'ev_mimic', sighting: 'ev_sighting',
  // Act 9 · Greek myths
  charybdis: 'ev_charybdis' };

/** Kills needed for a regular foot's peel: common feet need more, rare ones fewer. */
export function killsNeeded(f: FootType): number {
  const w = f.weight;
  if (w <= 0) return 3; // golden, crusty, mimic: special appearances
  if (w >= 6) return 50;
  if (w >= 5) return 35;
  if (w >= 4) return 25;
  if (w >= 3) return 15;
  return 10;
}

const PLURAL_EXCEPTIONS: Record<string, string> = {};
function plural(name: string, n: number): string {
  if (n === 1) return name;
  return PLURAL_EXCEPTIONS[name] ?? (/s$/i.test(name) ? name : `${name}s`);
}

const SHAPES: PeelShape[] = ['round', 'oval', 'square', 'paddle'];
/** Feet that are really objects (or carry lettering): their peel heads stay upright. */
const UPRIGHT = new Set(['jukebox', 'riot', 'ketchup', 'chimney', 'rover', 'milkshake',
  // Act 9 · Greek myths (the hoplite's shield has a lambda on it)
  'hoplite']);
const FOOT_PATTERNS: PeelPattern[] = ['spots', 'stripes', 'waves', 'checker', 'stars', 'bubbles', 'bolts', 'grain'];
const BOSS_PATTERNS: PeelPattern[] = ['flames', 'bolts', 'scales', 'marble', 'stars'];

const trimCache = new Map<string, HTMLCanvasElement>();

/** The foot texture cropped to its visible pixels, so the emblem fills its disc. */
function footEmblem(id: string): CanvasImageSource | null {
  const src = footMeta[id]?.textures.foot;
  if (!src) return null;
  let out = trimCache.get(id);
  if (out) return out;
  const ctx = src.getContext('2d')!;
  const { width: w, height: h } = src;
  const data = ctx.getImageData(0, 0, w, h).data;
  let x0 = w;
  let y0 = h;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < h; y += 2)
    for (let x = 0; x < w; x += 2)
      if (data[(y * w + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 <= x0 || y1 <= y0) return src;
  const [c, cctx] = makeCanvas(x1 - x0 + 4, y1 - y0 + 4);
  cctx.drawImage(src, x0 - 2, y0 - 2, c.width, c.height, 0, 0, c.width, c.height);
  out = c;
  trimCache.set(id, out);
  return out;
}

/** Little words that stay lower-case inside a name ('Queen of the Rink'). */
const SMALL_WORDS = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to']);
/** Words that stay in capitals. */
const ACRONYMS = new Set(['UFO']);

/** 'THE HEAD WAITER' → 'Head Waiter', 'GHOST OF FEET PAST' → 'Ghost of Feet Past', 'UFO TOE' → 'UFO Toe'
 *  (boss names are stored in capitals). */
export function titleCase(name: string): string {
  if (name !== name.toUpperCase()) return name;
  return name
    .replace(/^THE /, '')
    .split(' ')
    .map((w, i) => {
      if (ACRONYMS.has(w)) return w;
      const lower = w.toLowerCase();
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.replace(/(^|-)([a-z\u00e0-\u00fe])/g, (_, a: string, b: string) => a + b.toUpperCase());
    })
    .join(' ');
}

/** 'Iron Heel' → 'Iron Heel Peel', but 'Mirror Peel' stays as it is. */
const peelName = (name: string) => (/\bPeel$/.test(name) ? name : `${name} Peel`);

function footLook(f: FootType, shiny: boolean): PeelLook {
  const a = f.art;
  const h = hashStr(f.id);
  const base = a.primary ?? a.skin;
  const accent = a.secondary ?? a.nails ?? a.legColor ?? shade(base, -0.45);
  let pattern: PeelPattern = FOOT_PATTERNS[h % FOOT_PATTERNS.length];
  if (a.leg === 'fur' || a.hair) pattern = 'fur';
  if (a.leg === 'scales') pattern = 'scales';
  if (a.ghost) pattern = 'bubbles';
  if (a.lava) pattern = 'flames';
  if (a.zombie) pattern = 'drips';
  const boss = !!(f.boss || f.mini);
  if (boss) pattern = BOSS_PATTERNS[h % BOSS_PATTERNS.length];
  return {
    shape: boss ? 'spade' : SHAPES[(h >>> 4) % SHAPES.length],
    head: headFrom(base),
    handle: handleFrom(a.legColor ?? '#8a5a2b'),
    pattern,
    patternColor: accent,
    footArt: footEmblem(f.id) as HTMLCanvasElement | null,
    footUpright: UPRIGHT.has(f.id),
    studs: f.boss ? '#ffd23f' : f.mini ? '#d7dde6' : undefined,
    metal: !!a.gold || a.leg === 'armor',
    shiny,
    trail: accent,
    seed: f.id,
  };
}

interface Plain {
  shape: PeelShape;
  base: string;
  pattern: PeelPattern;
  pc: string;
  handle?: string;
  metal?: boolean;
  studs?: string;
  gem?: string;
  trail?: string;
}

function plain(id: string, p: Plain, shiny = false, emblem: CanvasImageSource | null = null): () => PeelLook {
  return () => ({
    shape: p.shape,
    head: headFrom(p.base),
    handle: handleFrom(p.handle ?? '#8a5a2b'),
    pattern: p.pattern,
    patternColor: p.pc,
    emblem,
    studs: p.studs,
    metal: p.metal,
    gem: p.gem,
    shiny,
    trail: p.trail ?? p.pc,
    seed: id,
  });
}

const PLACE_LOOK: Record<LocationId, Plain> = {
  trattoria: { shape: 'round', base: '#c8553d', pattern: 'checker', pc: '#fff2e0' },
  rooftop: { shape: 'paddle', base: '#e9824a', pattern: 'spots', pc: '#ffe28a' },
  beach: { shape: 'oval', base: '#f2d38a', pattern: 'waves', pc: '#3fb6c9' },
  diner: { shape: 'square', base: '#ff4fa3', pattern: 'stripes', pc: '#3ae8ff', handle: '#c7ccd4' },
  lodge: { shape: 'round', base: '#7a4a2b', pattern: 'snow', pc: '#ffffff' },
  space: { shape: 'spade', base: '#2a2160', pattern: 'stars', pc: '#fff06a', handle: '#5a5a7a' },
  kitchen: { shape: 'square', base: '#e8e2d6', pattern: 'checker', pc: '#9fb7c9', handle: '#c7ccd4', metal: true },
  oldtown: { shape: 'spade', base: '#9a8f86', pattern: 'scales', pc: '#4b4856' },
  pier: { shape: 'paddle', base: '#5a7a8a', pattern: 'waves', pc: '#d8f3ff' },
  rink: { shape: 'oval', base: '#ff9ad5', pattern: 'stripes', pc: '#ffffff' },
  slopes: { shape: 'round', base: '#cfe9fb', pattern: 'snow', pc: '#5a9ad0' },
  cellar: { shape: 'spade', base: '#3b2a3a', pattern: 'drips', pc: '#a8304f' },
  // ——— Act 7 · Comics ———
  metropizza: { shape: 'square', base: '#f2c230', pattern: 'spots', pc: '#d8322e', handle: '#2a2d3a' },
  doomlab: { shape: 'spade', base: '#3a424c', pattern: 'circuit', pc: '#3dff7a', handle: '#5a626c', metal: true },
  // ——— Act 8 · Norse ———
  jotunheim: { shape: 'spade', base: '#9fc6e0', pattern: 'snow', pc: '#ffffff', handle: '#5a4632' },
  bifrost: { shape: 'paddle', base: '#2a2350', pattern: 'stripes', pc: '#ff9a3d', handle: '#c7a24a', metal: true },
  // ——— Act 9 · Greek myths ———
  labyrinth: { shape: 'square', base: '#d8cbb0', pattern: 'marble', pc: '#8a6a3a', handle: '#c9873a', studs: '#c9873a' },
  tartarus: { shape: 'spade', base: '#1e1a2a', pattern: 'flames', pc: '#4fb8ff', handle: '#3a2a20', metal: true },
  // ——— Act 10 · Finale ———
  oven: { shape: 'round', base: '#1a0a3a', pattern: 'stars', pc: '#ff9a3a', handle: '#8a4a2a', studs: '#ffd23f' },
  firstpizzeria: { shape: 'paddle', base: '#8a7a6a', pattern: 'marble', pc: '#ffb347', handle: '#5a3a22' },
  // ——— Nemesis stages (src/game/nemesis.ts) ———
  gotham: { shape: 'spade', base: '#2a2f45', pattern: 'drips', pc: '#ffd23f', handle: '#1a1c28', studs: '#c9cfd8' },
  hotgates: { shape: 'round', base: '#c9873a', pattern: 'marble', pc: '#8a0a14', handle: '#5a2a1a', studs: '#ffe0a0' },
};

const EVENT_LOOK: Record<EventId, Plain> = {
  balloon: { shape: 'oval', base: '#ff6b6b', pattern: 'spots', pc: '#ffd6d6' },
  drone: { shape: 'square', base: '#9aa7b8', pattern: 'circuit', pc: '#3ae8ff', metal: true },
  moth: { shape: 'round', base: '#d9c27a', pattern: 'fur', pc: '#7a5a2a' },
  seagull: { shape: 'paddle', base: '#ffd23f', pattern: 'waves', pc: '#ffffff', metal: true },
  chest: { shape: 'square', base: '#d9a066', pattern: 'grain', pc: '#7a4a22' },
  mimic: { shape: 'spade', base: '#a8703a', pattern: 'drips', pc: '#ff3d5a' },
  sighting: { shape: 'spade', base: '#1f3a8a', pattern: 'stars', pc: '#ffd23f', studs: '#ffd23f' },
  // Act 9 · Greek myths
  charybdis: { shape: 'round', base: '#1f5a7a', pattern: 'waves', pc: '#8fe8ff' },
};

/** Golden Crust peels (not shiny). */
const GOLDEN: [string, string, number, Plain][] = [
  ['marble', 'Marble Slab', 400, { shape: 'square', base: '#efe9e2', pattern: 'marble', pc: '#7a7a8a', handle: '#c7ccd4' }],
  ['copper', 'Copper Pan', 600, { shape: 'round', base: '#c8743a', pattern: 'plain', pc: '#ffd2a8', metal: true, handle: '#3a2a20' }],
  ['neon', 'Neon Night', 900, { shape: 'paddle', base: '#1a1030', pattern: 'circuit', pc: '#3ae8ff', handle: '#ff4fa3' }],
  ['obsidian', 'Obsidian', 1200, { shape: 'oval', base: '#1d1a24', pattern: 'marble', pc: '#8a7ad8', metal: true, handle: '#2a2430' }],
];

/** The jewellery set: shiny, bought with Golden Crusts. */
const JEWELS: [string, string, number, Plain][] = [
  ['silver', 'Sterling Silver', 800, { shape: 'round', base: '#c9cfd8', pattern: 'facets', pc: '#7a8494', metal: true, handle: '#e8edf2', studs: '#ffffff' }],
  ['gold', 'Solid Gold', 1500, { shape: 'spade', base: '#ffc93a', pattern: 'facets', pc: '#b07a10', metal: true, handle: '#ffd23f', studs: '#fff4b0' }],
  ['ruby', 'Ruby Crown', 2000, { shape: 'spade', base: '#c8102e', pattern: 'gems', pc: '#ffd23f', gem: '#ff4d6d', metal: true, handle: '#ffd23f', studs: '#ffd23f' }],
  ['sapphire', 'Sapphire Tide', 2000, { shape: 'oval', base: '#1f4fbf', pattern: 'gems', pc: '#e8edf2', gem: '#5fa8ff', metal: true, handle: '#c9cfd8', studs: '#e8edf2' }],
  ['emerald', 'Emerald Isle', 2000, { shape: 'square', base: '#128a4a', pattern: 'gems', pc: '#ffd23f', gem: '#5fe89a', metal: true, handle: '#ffd23f', studs: '#ffd23f' }],
  ['amethyst', 'Amethyst Dream', 2500, { shape: 'round', base: '#7a3ac8', pattern: 'facets', pc: '#e0c8ff', metal: true, handle: '#c9cfd8', studs: '#e0c8ff' }],
  ['pearl', 'Pearl Diver', 3000, { shape: 'oval', base: '#f4efe8', pattern: 'bubbles', pc: '#c8b8d8', metal: true, handle: '#e8e2d6', studs: '#ffffff' }],
  ['diamond', 'Chef’s Diamond', 5000, { shape: 'spade', base: '#d8f6ff', pattern: 'facets', pc: '#7ad0ff', metal: true, handle: '#e8edf2', studs: '#ffffff' }],
];

/** Event shinies: a common-ish shiny per event, plus extremely rare jewels. */
const EVENT_SHINY_CHANCE = 1 / 40;
const ULTRA: [string, string, EventId, number, Plain][] = [
  ['rosegold', 'Rose Gold', 'balloon', 1 / 300, { shape: 'oval', base: '#e8a090', pattern: 'facets', pc: '#a85a50', metal: true, handle: '#f2c0b0', studs: '#ffe0d8' }],
  ['platinum', 'Platinum Prop', 'drone', 1 / 300, { shape: 'square', base: '#e4e8ee', pattern: 'circuit', pc: '#9aa7b8', metal: true, handle: '#ffffff', studs: '#ffffff' }],
  ['opal', 'Fire Opal', 'moth', 1 / 300, { shape: 'round', base: '#ff9a5a', pattern: 'marble', pc: '#5fd8ff', metal: true, handle: '#ffd2a8', studs: '#fff4e0' }],
  ['goldfeather', 'Golden Feather', 'seagull', 1 / 150, { shape: 'paddle', base: '#ffd23f', pattern: 'fur', pc: '#b07a10', metal: true, handle: '#ffd23f', studs: '#fff4b0' }],
  ['prism', 'Prismatic', 'seagull', 1 / 250, { shape: 'spade', base: '#ffffff', pattern: 'facets', pc: '#a77dff', metal: true, handle: '#e8edf2', studs: '#ffffff' }],
  ['blackdiamond', 'Black Diamond', 'mimic', 1 / 200, { shape: 'spade', base: '#24202c', pattern: 'facets', pc: '#9a8ad8', metal: true, handle: '#3a3444', studs: '#d8d0ff' }],
  ['crownjewel', 'Crown Jewel', 'chest', 1 / 400, { shape: 'spade', base: '#5a1a8a', pattern: 'gems', pc: '#ffd23f', gem: '#ff3d6e', metal: true, handle: '#ffd23f', studs: '#ffd23f' }],
  ['cosmic', 'Cosmic Crust', 'chest', 1 / 400, { shape: 'oval', base: '#120a3a', pattern: 'stars', pc: '#ffffff', handle: '#3a2a6a', studs: '#a77dff' }],
];

/** Act peels: a look for each act (the trophy studs, and the act's number stamped on the head). */
const ACT_LOOK: Plain[] = [
  { shape: 'round', base: '#c8553d', pattern: 'checker', pc: '#fff2e0', studs: '#ffd23f' }, // Opening Night
  { shape: 'oval', base: '#ffb347', pattern: 'waves', pc: '#ff5fa0', studs: '#ffd23f' }, // Summer Rush
  { shape: 'spade', base: '#2a2160', pattern: 'stars', pc: '#7be0ff', handle: '#5a5a7a', studs: '#ffd23f' }, // Out of This World
  { shape: 'square', base: '#f2dfb0', pattern: 'checker', pc: '#c8553d', studs: '#ffd23f' }, // Home Cooking
  { shape: 'paddle', base: '#3f8fc9', pattern: 'waves', pc: '#ff9ad5', studs: '#ffd23f' }, // Sea and Skates
  { shape: 'spade', base: '#24304a', pattern: 'snow', pc: '#a8304f', studs: '#ffd23f' }, // Cold and Dark
  { shape: 'square', base: '#ffd23f', pattern: 'spots', pc: '#e83a3a', studs: '#2a6bd8' }, // Comics
  { shape: 'round', base: '#5a7fa0', pattern: 'bolts', pc: '#e8f6ff', handle: '#6a4a2b', metal: true, studs: '#ffd23f' }, // Norse
  { shape: 'oval', base: '#efe9e2', pattern: 'marble', pc: '#c9a23a', handle: '#c7ccd4', studs: '#ffd23f' }, // Greek Myths
  { shape: 'spade', base: '#120a3a', pattern: 'stars', pc: '#ffd23f', handle: '#3a2a6a', metal: true, studs: '#fff4b0' }, // Finale
];

const actEmblems = new Map<number, HTMLCanvasElement>();

/** The act's number in gold, for its peel's stamped disc. */
function actEmblem(act: number): HTMLCanvasElement {
  let c = actEmblems.get(act);
  if (c) return c;
  const [cv, ctx] = makeCanvas(120, 120);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.font = `${act >= 10 ? 84 : 104}px 'Lilita One', 'Fredoka', sans-serif`;
  const g = ctx.createLinearGradient(0, 18, 0, 104);
  g.addColorStop(0, '#fff4b0');
  g.addColorStop(0.5, '#ffd23f');
  g.addColorStop(1, '#d8901a');
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#2a1810';
  ctx.strokeText(String(act), 60, 66);
  ctx.fillStyle = g;
  ctx.fillText(String(act), 60, 66);
  // a highlight sheen across the top of the number
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(0, 24, 120, 22);
  c = cv;
  // fonts may still be loading on the first draw: only keep it once Lilita One is in
  if (typeof document === 'undefined' || document.fonts?.check("80px 'Lilita One'")) actEmblems.set(act, c);
  return c;
}

function buildDefs(): PeelDef[] {
  const defs: PeelDef[] = [];
  defs.push({
    id: 'classic',
    name: 'Classic Peel',
    group: 'classic',
    how: 'The one you started with.',
    look: plain('classic', { shape: 'round', base: '#d9a066', pattern: 'grain', pc: '#7a4a22', trail: '#f6cf94' }),
  });
  for (const [id, name, cost, p] of GOLDEN) defs.push({ id, name, group: 'golden', how: `Buy for ${cost.toLocaleString()} Golden Crusts.`, cost, look: plain(id, p) });
  for (const [id, name, cost, p] of JEWELS) defs.push({ id, name, group: 'jewel', how: `Buy for ${cost.toLocaleString()} Golden Crusts.`, cost, shiny: true, look: plain(id, p, true) });
  const feet = FEET.filter((f) => !f.boss && !f.mini);
  for (const f of feet) {
    const need = killsNeeded(f);
    defs.push({
      id: `foot:${f.id}`,
      name: peelName(f.name),
      group: 'foot',
      how: `Defeat ${need} ${plural(f.name, need)}.`,
      progress: () => [Math.min(need, save.kills[f.id] ?? 0), need],
      foot: f.id,
      look: () => footLook(f, false),
    });
  }
  for (const f of FEET.filter((x) => x.boss || x.mini)) {
    // a nemesis boss only turns up with its hero's peel equipped (src/game/nemesis.ts)
    const nm = nemesisOf(f.id);
    const nmAt = nm ? ` It only turns up at wave ${f.mini ? nemesisWaves(nm).mini : nemesisWaves(nm).boss} with ${nm.hero} equipped.` : '';
    defs.push({
      id: `boss:${f.id}`,
      name: peelName(titleCase(f.name)),
      group: 'boss',
      how: `Defeat ${f.mini ? 'the mini-boss' : 'the boss'} ${titleCase(f.name)}.${nmAt}`,
      progress: () => [save.bossesBeaten.includes(f.id) ? 1 : 0, 1],
      foot: f.id,
      look: () => footLook(f, false),
    });
  }
  STAGES.forEach((st, i) => {
    if (st.dev) return;
    const name = BACKDROPS[st.location].name;
    defs.push({
      id: `place:${st.location}`,
      name: `${name} Peel`,
      group: 'place',
      how: `Clear 10 waves at ${name} (stage ${i + 1}, boss wave included).`,
      progress: () => [Math.min(10, save.stageWaves[st.location] ?? 0), 10],
      look: plain(`place:${st.location}`, PLACE_LOOK[st.location]),
    });
  });
  // nemesis places: they take over a stage only while their hero's peel is equipped
  for (const nm of NEMESES) {
    if (!nm.location) continue;
    const loc = nm.location;
    const name = BACKDROPS[loc].name;
    const w = nemesisWaves(nm);
    defs.push({
      id: `place:${loc}`,
      name: `${name} Peel`,
      group: 'place',
      how: `Clear 10 waves at ${name} (boss wave included). It only appears with ${nm.hero} equipped, in place of stage ${nm.stage + 1} (waves ${w.first}–${w.boss}).`,
      progress: () => [Math.min(10, save.stageWaves[loc] ?? 0), 10],
      look: plain(`place:${loc}`, PLACE_LOOK[loc]),
    });
  }
  for (const ev of Object.keys(EVENT_LABEL) as EventId[]) {
    const [label, verb] = EVENT_LABEL[ev];
    const need = EVENT_NEED[ev];
    defs.push({
      id: `event:${ev}`,
      name: `${label} Peel`,
      group: 'event',
      how: `${verb} ${need} ${plural(label, need)}${ev === 'mimic' ? ' before they open' : ''}.`,
      progress: () => [Math.min(need, save.eventsDone[ev] ?? 0), need],
      look: () => plain(`event:${ev}`, EVENT_LOOK[ev], false, eventCanvases[EVENT_KEY[ev]] ?? null)(),
    });
  }
  // one for completing each act, on any heat (acts 7–10 are named ahead of their stages)
  ACTS.forEach((a, i) => {
    const n = i + 1;
    defs.push({
      id: `act:${n}`,
      name: `${a.name} Peel`,
      group: 'act',
      how: `Complete Act ${n}, ${a.name}: beat the boss of wave ${n * WAVES_PER_ACT}, on any heat.`,
      progress: () => [save.actsCleared.includes(n) ? 1 : 0, 1],
      look: () => plain(`act:${n}`, ACT_LOOK[i] ?? ACT_LOOK[0], false, actEmblem(n))(),
    });
  });
  // prestige: reach wave 60 with a Classic, Golden Crust or jewellery peel to master it
  for (const base of defs.filter((d) => d.group === 'classic' || d.group === 'golden' || d.group === 'jewel')) {
    const baseLook = base.look;
    defs.push({
      id: `master:${base.id}`,
      name: `Mastered ${base.name.replace(/ Peel$/, '')}`,
      group: 'master',
      how: `Reach wave ${MASTER_WAVE} with ${base.name} equipped.`,
      progress: () => [Math.min(MASTER_WAVE, save.peelBest[base.id] ?? 0), MASTER_WAVE],
      shiny: true,
      look: () => ({ ...baseLook(), shiny: true, studs: '#ffd23f', seed: `master:${base.id}` }),
    });
  }
  for (const pz of PIZZAS) {
    defs.push({
      id: `pizza:${pz.id}`,
      name: `${pz.name} Peel`,
      group: 'pizza',
      how: `Clear ${PIZZA_WAVES} waves with ${pz.name} on the table.`,
      progress: () => [Math.min(PIZZA_WAVES, save.pizzaWaves[pz.id] ?? 0), PIZZA_WAVES],
      look: () => ({ ...plain(`pizza:${pz.id}`, { shape: 'round', base: '#d9a066', pattern: 'plain', pc: '#7a4a22', handle: '#8a5a2b', trail: '#ffb347' })(), pizzaArt: pizzaTops[pz.id] ?? null, pizzaRound: pz.shape === 'round' || pz.shape === 'deep', pizzaFlip: pz.shape === 'calzone' }),
    });
  }
  for (const f of feet) {
    defs.push({
      id: `shiny:${f.id}`,
      name: `Shiny ${f.name} Peel`,
      group: 'shinyFoot',
      how: `Defeat a shiny ${f.name}. Any foot has a rare chance to turn up shiny.`,
      foot: f.id,
      shiny: true,
      look: () => footLook(f, true),
    });
  }
  for (const ev of Object.keys(EVENT_LABEL) as EventId[]) {
    const [label, verb] = EVENT_LABEL[ev];
    defs.push({
      id: `shinyev:${ev}`,
      name: `Shiny ${label} Peel`,
      group: 'shinyEvent',
      how: `A rare drop: ${verb.toLowerCase()} a ${label} (about 1 in 40).`,
      drop: { event: ev, chance: EVENT_SHINY_CHANCE },
      shiny: true,
      look: () => plain(`shinyev:${ev}`, EVENT_LOOK[ev], true, eventCanvases[EVENT_KEY[ev]] ?? null)(),
    });
  }
  for (const [id, name, ev, chance, p] of ULTRA) {
    const [label, verb] = EVENT_LABEL[ev];
    defs.push({
      id: `ultra:${id}`,
      name,
      group: 'shinyEvent',
      how: `Extremely rare: ${verb.toLowerCase()} a ${label} (about 1 in ${Math.round(1 / chance)}).`,
      drop: { event: ev, chance },
      shiny: true,
      ultra: true,
      look: plain(`ultra:${id}`, p, true),
    });
  }
  // heroes and gods (src/content/peels/): a goal each, or a crust price
  for (const hp of HERO_PEELS) {
    const g = hp.goal;
    defs.push({
      id: hp.id,
      name: hp.name,
      group: 'hero',
      sub: hp.sub,
      pantheon: hp.pantheon,
      how: heatHow(hp.how, g),
      cost: g.kind === 'crusts' ? g.cost : undefined,
      progress: g.kind === 'crusts' ? undefined : () => goalProgress(g),
      look: hp.look,
    });
  }
  // the God Peel: the final trophy, for owning every other peel (shinies and the ultra-rare jewels included).
  // No crust price, and Peel Roulette never deals it.
  defs.push({
    id: GOD_PEEL,
    name: 'Peel of the Pizza Gods',
    group: 'god',
    how: 'The final trophy: own every other peel, the shinies and the ultra-rare jewels included.',
    progress: () => {
      const others = PEELS.filter((d) => d.id !== GOD_PEEL);
      return [others.filter((d) => hasPeel(d.id)).length, others.length];
    },
    shiny: true,
    look: godPeelLook,
  });
  return defs;
}

/** The Peel of the Pizza Gods. */
export const GOD_PEEL = 'god:pizzagods';

export const PEELS: PeelDef[] = buildDefs();
export const PEEL_BY_ID: Record<string, PeelDef> = Object.fromEntries(PEELS.map((p) => [p.id, p]));

export function hasPeel(id: string): boolean {
  return id === 'classic' || save.peels.includes(id);
}

export function equippedPeel(): PeelDef {
  return PEEL_BY_ID[save.peel] && hasPeel(save.peel) ? PEEL_BY_ID[save.peel] : PEEL_BY_ID.classic;
}

function grant(id: string): PeelDef | null {
  if (hasPeel(id) || !PEEL_BY_ID[id]) return null;
  save.peels.push(id);
  if (!save.peelsNew.includes(id)) save.peelsNew.push(id);
  // the God Peel equips itself, and its reveal plays at the next calm moment (1: due, 2: seen)
  if (id === GOD_PEEL) {
    save.peel = id;
    save.skin = '';
    if (!save.goals.godReveal) save.goals.godReveal = 1;
  }
  return PEEL_BY_ID[id];
}

/** Unlock every achievement peel whose goal is met; returns the new ones. */
export function checkPeelAchievements(): PeelDef[] {
  const out: PeelDef[] = [];
  for (const d of PEELS) {
    if (!d.progress || hasPeel(d.id)) continue;
    const [have, need] = d.progress();
    if (have >= need) {
      const g = grant(d.id);
      if (g) out.push(g);
    }
  }
  if (out.length) persist();
  return out;
}

/** A shiny foot went down: unlock its shiny peel. */
export function grantShinyFoot(footId: string): PeelDef | null {
  const g = grant(`shiny:${footId}`);
  if (g) persist();
  return g;
}

/** An event was dealt with: roll its drops (one at most, rarest first). */
export function rollEventDrop(ev: EventId, roll: () => number = Math.random): PeelDef | null {
  const drops = PEELS.filter((d) => d.drop?.event === ev).sort((a, b) => a.drop!.chance - b.drop!.chance);
  for (const d of drops) {
    if (roll() < d.drop!.chance) {
      if (hasPeel(d.id)) continue;
      const g = grant(d.id);
      if (g) persist();
      return g;
    }
  }
  return null;
}

export function buyPeel(id: string): boolean {
  const d = PEEL_BY_ID[id];
  if (!d?.cost || hasPeel(id) || save.crusts < d.cost) return false;
  save.crusts -= d.cost;
  save.peels.push(id);
  save.peel = id;
  persist();
  return true;
}

export function equipPeel(id: string): void {
  if (!hasPeel(id)) return;
  save.peel = id;
  persist();
}

/** The peel worn as a look only, or null when the look matches the equipped peel. */
export function wornSkin(): PeelDef | null {
  return save.skin && PEEL_BY_ID[save.skin] && hasPeel(save.skin) ? PEEL_BY_ID[save.skin] : null;
}

/** Wear a peel's look over the equipped one (null goes back to the equipped peel's own look). */
export function wearSkin(id: string | null): void {
  if (id && !hasPeel(id)) return;
  save.skin = id ?? '';
  persist();
}

/** What the cursor peel looks like: the worn look, or the equipped peel's own. */
export function lookPeel(equipped: PeelDef = equippedPeel()): PeelDef {
  return wornSkin() ?? equipped;
}

// ——— images ———

const thumbCache = new Map<string, string>();

/** Full-size canvas for a peel (not cached: they're big). */
export function peelCanvas(id: string): HTMLCanvasElement {
  return drawPeelSkin((PEEL_BY_ID[id] ?? PEEL_BY_ID.classic).look());
}

/** A small data URL for menus, cached. */
export function peelThumbURL(id: string, h = 180): string {
  const k = `${id}@${h}`;
  let url = thumbCache.get(k);
  if (!url) {
    const big = peelCanvas(id);
    const w = Math.round((PEEL_W * h) / PEEL_H);
    const [c, ctx] = makeCanvas(w, h);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(big, 0, 0, w, h);
    url = c.toDataURL('image/png');
    thumbCache.set(k, url);
  }
  return url;
}

let appliedPeel = 'classic';

/** The equipped peel (or a resumed run's), for its ability. */
export function abilityPeel(id?: string): PeelDef {
  return id && PEEL_BY_ID[id] && hasPeel(id) ? PEEL_BY_ID[id] : equippedPeel();
}

/** Swap the 'peel' texture for the peel's look (cheap when nothing changed). */
export function applyPeelLook(scene: Phaser.Scene, d: PeelDef): PeelDef {
  if (d.id !== appliedPeel || !scene.textures.exists('peel')) {
    addCanvas(scene, 'peel', peelCanvas(d.id));
    appliedPeel = d.id;
  }
  return d;
}

export function peelTrail(d: PeelDef): number | null {
  if (d.id === 'classic') return null;
  return parseInt(d.look().trail.replace('#', ''), 16);
}

export function footOf(d: PeelDef): FootType | null {
  return d.foot ? FOOT_BY_ID[d.foot] : null;
}
