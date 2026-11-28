// ESLint (dev only): the effect declarations' rules (tools/eslint/effects.js, docs/effects-plan.md "Lint rules") and a
// few correctness rules that the codebase already passes. No style rules: nothing else gets reformatted.
// `npm run lint` checks src, scripts and tools; `npm run check` runs it with the typecheck and the golden check.

import tseslint from 'typescript-eslint';
import effects from './tools/eslint/effects.js';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'public/**', '.sim/**', '.prebuild/**', '.dev-logs/**'] },
  {
    files: ['src/**/*.ts', 'scripts/**/*.{js,mjs,ts}', 'tools/**/*.js'],
    languageOptions: { parser: tseslint.parser, ecmaVersion: 'latest', sourceType: 'module' },
    // the codebase's own eslint-disable comments name typescript-eslint's rules, so its plugin is loaded (no rules on)
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    plugins: { effects, '@typescript-eslint': tseslint.plugin },
    rules: {
      // correctness only (all from ESLint's recommended set, all passing as the codebase stands): code that can't
      // be what was meant. The rest of the recommended sets (prefer-const, no-unused-vars, no-unused-expressions,
      // no-this-alias, require-yield) would mean mass changes, so they're left out.
      'for-direction': 'error',
      'getter-return': 'error',
      'no-compare-neg-zero': 'error',
      'no-cond-assign': 'error',
      'no-constant-condition': 'error',
      'no-debugger': 'error',
      'no-dupe-else-if': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-empty-pattern': 'error',
      'no-fallthrough': 'error',
      'no-import-assign': 'error',
      'no-loss-of-precision': 'error',
      'no-self-assign': 'error',
      'no-setter-return': 'error',
      'no-sparse-arrays': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-unsafe-negation': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      // the effect declarations (tools/eslint/effects.js)
      'effects/one-effect-per-line': 'error',
      'effects/effect-args-per-line': 'error',
      'effects/no-effect-arithmetic': 'error',
      'effects/op-needs-unit': 'error',
      'effects/no-loose-strings': 'error',
      'effects/typed-item-names': 'error',
    },
  },
  // step 4's guards (docs/effects-plan.md, "Step 4"): game code never checks a pizza perk by name (the perks'
  // declarations, the pizzas' data and the dev tools name them on purpose; the STATS tab's hand-written perk tiles are
  // the one place left, listed in the plan doc)
  {
    files: ['src/**/*.ts'],
    ignores: ['src/game/perkEffects.ts', 'src/game/perkStats.ts', 'src/data/pizzas.ts', 'src/content/pizzas/**', 'src/dev*.ts', 'src/game/buildStats.ts'],
    rules: { 'effects/no-perk-names': 'error' },
  },
  // stage 1 of the core split (docs/core-split-plan.md): no gameplay waits on a Phaser tween or animation; it runs on
  // the game clock (src/core/clock.ts). Dev tools and the trailer are only looks.
  {
    files: ['src/**/*.ts'],
    ignores: ['src/dev*.ts', 'src/trailer.ts'],
    rules: { 'effects/no-gameplay-in-tweens': 'error' },
  },
  // …and the perks' one-offs never check stale, frozen or possessed themselves: the trigger bus's off-switch does
  {
    files: ['src/game/pizzaPerks.ts', 'src/game/pizzaLegends.ts', 'src/game/pizzaLegends3.ts'],
    rules: { 'effects/no-own-off-switch': 'error' },
  },
);
