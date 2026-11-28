#!/usr/bin/env node
// The repeatability check (docs/effects-plan.md, "The balance sim repeats itself"): a small fixed set of seeded
// runs, each played twice by the balance sim (run.mjs --check: the second runs come after the first pass, in reverse
// order, usually on the other tab), every field of every run compared. Exit 1 on any difference.
//
//   npm run sim:repeat                         (about 2 minutes at 2 workers)
//   npm run sim:repeat -- --cache-dir <dir>    (anything after -- goes to every run.mjs: --workers, --chrome…)
//
// The set covers what has leaked real time into a seeded run before: the waiter's tray (wave 3), the projectiles'
// flights and the fire lane (act1's table), the zombie peel's outbreak and the delivery and doorbell toppings (top3).

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const RUN = join(import.meta.dirname, 'run.mjs');
const pass = process.argv.slice(2);
// (options given on the command line come first: run.mjs takes the first of each)
const common = ['--check', '--runs', '1', '--shop', 'auto', '--workers', '2', '--quiet'];
const SETS = [
  ['the default table to wave 6', ['--heat', 'mild,regular', '--waves', '6']],
  ['projectiles (act1, Mild seed 2) to wave 15', ['--heat', 'mild', '--seed', '2', '--waves', '15', '--lineup', 'dragonfruit,discodiner,meteorite,cometcalzone,snowballpie']],
  ['the zombie peel to wave 6', ['--heat', 'mild,regular', '--waves', '6', '--peel', 'zombie:sneaker']],
  ['toppings (top3, Regular seed 1) to wave 15', ['--heat', 'regular', '--waves', '15', '--toppings', 'pizzastone:2,midnightsnack:1,deliveryrush:2,tipinterest:1,tiedlaces:2,sixthsense:1,doorbell:1,coldfeet:1']],
];

const failed = [];
for (const [name, args] of SETS) {
  console.log(`\n— ${name}`);
  const r = spawnSync(process.execPath, [RUN, ...pass, ...common, ...args], { stdio: 'inherit' });
  if (r.status !== 0) failed.push(name);
}
console.log(failed.length ? `\nNot repeatable: ${failed.join('; ')}.` : `\nRepeatable: all ${SETS.length} sets gave identical runs, every field.`);
process.exit(failed.length ? 1 : 0);
