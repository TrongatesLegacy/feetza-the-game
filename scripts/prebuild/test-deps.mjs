#!/usr/bin/env node
// Checks the art packs' per-unit versions against the packs on disk (public/packs/build.json, from npm run prebuild):
// that a change to one scene file makes only that scene's units stale (and the thumbnails drawn from it), a shared
// kit file every unit that uses it, a foot style file only feet and thumbnails, and a file the art doesn't use
// nothing at all. Each check edits the file's contents in memory and recomputes every unit's version, exactly as
// vite.config.ts and the prebuild do (scripts/prebuild/deps.mjs).
//
//   npm run prebuild:test

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './harness.mjs';
import { baseHash, fileReader, unitVersion } from './deps.mjs';

const b = JSON.parse(readFileSync(join(ROOT, 'public/packs/build.json'), 'utf8'));
const base = baseHash(ROOT);
const read = fileReader(ROOT);
const units = Object.entries(b.units);
let failed = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!cond) failed++;
};

/** The units whose version changes when `file` changes. */
function staleAfter(file) {
  const edited = (f) => (f === file ? Buffer.concat([read(f) ?? Buffer.alloc(0), Buffer.from('\n// edited\n')]) : read(f));
  return units.filter(([, u]) => unitVersion(base, u.deps, edited) !== unitVersion(base, u.deps, read)).map(([id]) => id);
}
const kinds = (ids) => [...new Set(ids.map((id) => id.split(':')[0]))].sort().join(',');

// every unit's recorded version is the one its files give now (the packs are current)
ok(units.every(([, u]) => u.v === unitVersion(base, u.deps, read)), 'every unit is current (run npm run prebuild if not)');

// a scene file: its own backdrop's units (and any backdrop that borrows from it), and thumbnails; nothing else
const scenes = units.filter(([id]) => id.startsWith('bg:')).map(([id, u]) => [id.slice(3), u.regs[`scenes/${id.slice(3)}`] ?? []]);
let n = 0;
for (const [id, regs] of scenes) {
  const file = regs.find((f) => f.startsWith('src/content/art/scene-') || f.startsWith('src/content/art/scenes-'));
  if (!file || n++ >= 12) continue;
  const st = staleAfter(file);
  ok(st.includes(`bg:${id}`) && st.every((u) => u.startsWith('bg:') || u.startsWith('thumbs:') || (u === 'sprites' && id === 'trattoria')), `${file}: ${st.filter((u) => u.startsWith('bg:')).join(' ')} + ${st.filter((u) => u.startsWith('thumbs:')).length} thumbnail chunks`);
}

// a shared scene kit file: every backdrop painted with the kit
const kitScenes = scenes.filter(([, regs]) => regs.includes('src/game/sceneLive.ts')).map(([id]) => `bg:${id}`);
for (const file of ['src/art/scene/kit.ts', 'src/art/scene/layers.ts', 'src/game/sceneLive.ts']) {
  const st = staleAfter(file);
  ok(kitScenes.every((u) => st.includes(u)), `${file}: all ${kitScenes.length} kit backdrops stale (${st.length} units in all)`);
}

// the style kit: every styled foot's unit
const styled = units.filter(([id, u]) => id.startsWith('feet:') && Object.keys(u.regs).some((k) => k.startsWith('styles/') && u.regs[k].length)).map(([id]) => id);
{
  const st = staleAfter('src/art/style/kit.ts');
  ok(styled.length > 0 && styled.every((u) => st.includes(u)), `src/art/style/kit.ts: all ${styled.length} styled feet units stale (${kinds(st)})`);
}

// a foot style file: the feet registered there, and thumbnails; no backdrop, pizza or sprite
for (const file of ['src/content/style/roster-2.ts', 'src/content/style/acts-d-4.ts', 'src/content/style/bosses.ts']) {
  const owners = units.filter(([id, u]) => id.startsWith('feet:') && Object.entries(u.regs).some(([k, v]) => k.startsWith('styles/') && v.includes(file))).map(([id]) => id);
  const st = staleAfter(file);
  ok(owners.length > 0 && owners.every((u) => st.includes(u)) && st.every((u) => u.startsWith('feet:') || u.startsWith('thumbs:')), `${file}: ${st.filter((u) => u.startsWith('feet:')).join(' ')} + ${st.filter((u) => u.startsWith('thumbs:')).length} thumbnail chunks`);
}

// a pizza topping file: pizzas (and what shows pizzas), no backdrop or foot
{
  const st = staleAfter('src/content/art/toppings-new.ts');
  ok(st.some((u) => u.startsWith('pizzas:')) && !st.some((u) => u.startsWith('bg:') || u.startsWith('feet:')), `src/content/art/toppings-new.ts: ${kinds(st)} (${st.length} units)`);
}

// files the packed art doesn't use: nothing
for (const file of ['src/game/heatRules.ts', 'src/scenes/GameScene.ts', 'src/ui/ui.ts', 'src/style.css', 'src/devSim.ts', 'src/game/Run.ts']) {
  const st = staleAfter(file);
  ok(st.length === 0, `${file}: ${st.length ? st.join(' ') : 'no unit'} stale`);
}

console.log(failed ? `[prebuild:test] ${failed} failed` : '[prebuild:test] all passed');
process.exit(failed ? 1 : 0);
