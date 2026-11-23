// @ts-check
const eslint = require('@eslint/js');
const { defineConfig, globalIgnores } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const importX = require('eslint-plugin-import-x');
const prettier = require('eslint-config-prettier/flat');

/**
 * Muster für Importe aus Schichten, die eine Schicht nicht verwenden darf (CLAUDE.md §1). Greift für
 * den Alias (`@app/hud/feature/…`) und relative Pfade (`../../feature/…`).
 *
 * @param {string} layer
 * @param {string[]} layers
 */
const forbiddenLayers = (layer, layers) => ({
  regex: `(^|/)(${layers.join('|')})(/|$)`,
  message: `Die Schicht ${layer} darf nicht von ${layers.join(', ')} abhängen (CLAUDE.md §1).`,
});

const FRAMEWORK_IMPORTS = {
  regex: '^(@angular|rxjs)(/|$)',
  message: 'domain und util bleiben Angular- und RxJS-frei (CLAUDE.md §1).',
};

/** Fremde Domänen und die App-Wurzel nur über den Alias (CLAUDE.md §9). */
const CROSS_DOMAIN = {
  regex: '^(\\.\\./)+(app\\.|[^./][^/]*/(feature|ui|data-access|domain|util)/)',
  message: 'Andere Domänen über den Alias @app/… importieren (CLAUDE.md §9).',
};

module.exports = defineConfig([
  globalIgnores(['dist/', 'coverage/', '.angular/', '.claude/']),
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    plugins: { 'import-x': importX },
    settings: {
      // `@app/*` ist der Pfad-Alias für `src/app` (tsconfig.json), kein Paket.
      'import-x/internal-regex': '^@app/',
    },
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@angular-eslint/component-class-suffix': ['error', { suffixes: ['Page', 'Component'] }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'import-x/no-duplicates': 'error',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'always',
        },
      ],
      'no-restricted-imports': ['error', { patterns: [CROSS_DOMAIN] }],
    },
  },
  // Schichtregeln (CLAUDE.md §1); Specs dürfen quer importieren.
  {
    files: ['src/app/*/ui/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [CROSS_DOMAIN, forbiddenLayers('ui', ['feature', 'data-access'])] },
      ],
    },
  },
  {
    files: ['src/app/*/data-access/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [CROSS_DOMAIN, forbiddenLayers('data-access', ['feature', 'ui'])] },
      ],
    },
  },
  {
    files: ['src/app/*/domain/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            CROSS_DOMAIN,
            forbiddenLayers('domain', ['feature', 'ui', 'data-access']),
            FRAMEWORK_IMPORTS,
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/*/util/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            CROSS_DOMAIN,
            forbiddenLayers('util', ['feature', 'ui', 'data-access', 'domain']),
            FRAMEWORK_IMPORTS,
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
  prettier,
]);
