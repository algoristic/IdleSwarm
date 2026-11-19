import { defineConfig } from 'vitest/config';

// Wird vom Angular-Builder `@angular/build:unit-test` eingelesen (angular.json: runnerConfig).
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcovonly'],
      thresholds: {
        // Untergrenze laut technischem Konzept §10 (Sicherheitsnetz, kein Ziel); gilt für die
        // Angular-freien Schichten domain und util.
        'src/app/*/{domain,util}/**/*.ts': {
          statements: 70,
          branches: 70,
          functions: 70,
          lines: 70,
        },
      },
    },
  },
});
