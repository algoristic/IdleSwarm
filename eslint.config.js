// @ts-check
const eslint = require('@eslint/js');
const { defineConfig, globalIgnores } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const prettier = require('eslint-config-prettier/flat');

/**
 * Importmuster für eine Schicht unter `src/app/`, relativ (`../game/x`, `../../game`)
 * oder ab Wurzel (`src/app/game/x`, `app/game/x`).
 *
 * @param {string[]} layers
 */
const layerImportPattern = (layers) =>
  `^(?:(?:\\./)?(?:\\.\\./)+(?:[^/]+/)*|(?:src/)?app/)(?:${layers.join('|')})(?:/|$)`;

/**
 * Schichtenregel aus dem technischen Konzept §3.1: Abhängigkeiten zeigen nur nach unten.
 *
 * @param {string} message
 * @param {string[]} layers
 * @param {{ regex: string, message: string }[]} [extraPatterns]
 */
const restrictLayers = (message, layers, extraPatterns = []) => ({
  'no-restricted-imports': [
    'error',
    {
      patterns: [{ regex: layerImportPattern(layers), message }, ...extraPatterns],
    },
  ],
});

module.exports = defineConfig([
  globalIgnores(['dist/', 'coverage/', '.angular/', 'docs/', '.claude/']),
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['src/app/core/**/*.ts'],
    rules: restrictLayers(
      'core/ ist reines TypeScript und darf nicht von game/, ui/ oder model/ abhängen.',
      ['game', 'ui', 'model'],
      [
        {
          regex: '^@angular(?:/|$)',
          message: 'core/ darf Angular nicht importieren.',
        },
        {
          regex: '^rxjs(?:/|$)',
          message: 'core/ darf RxJS nicht importieren.',
        },
      ],
    ),
  },
  {
    files: ['src/app/game/**/*.ts'],
    rules: restrictLayers('game/ darf nicht von ui/ oder model/ abhängen.', ['ui', 'model']),
  },
  {
    files: ['src/app/ui/**/*.ts'],
    rules: restrictLayers('ui/ darf nicht von model/ abhängen.', ['model']),
  },
  {
    files: ['src/app/model/**/*.ts'],
    rules: restrictLayers('model/ darf nicht von ui/ abhängen.', ['ui']),
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
  prettier,
]);
