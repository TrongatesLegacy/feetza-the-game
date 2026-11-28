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
);
